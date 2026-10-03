import type { ProductPack } from '../../contracts/src/product-pack.js';
import { ProductFactSchema, type ProductFact, type QuestionFamily, type AnswerPlan, type QuestionClassification } from '../../contracts/src/knowledge.js';
export type KnowledgeRequest = { question: string; currentLane: string | null; currentScreen: string; productPackVersion: string; knowledgeVersion: string; policyVersion: string };
export type KnowledgeSelection = { classification: QuestionClassification; mode: AnswerPlan['mode'] | null; version: string; facts: ProductFact[]; family: QuestionFamily | null; qualification: string; reason: string | null; evidenceId: string | null };
export interface KnowledgeProvider { retrieve(request: KnowledgeRequest): KnowledgeSelection }
const normalized = (s: string) => s.toLowerCase().replace(/[’']/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
const matches = (input: string, groups: string[][]) => groups.every(group => group.some(term => new RegExp('\\b' + normalized(term).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).test(input)));
export function classifyQuestion(input: string): QuestionClassification {
  const t = normalized(input);
  if (/\b(pretend|just (say|confirm)|skip (the )?(disclaimer|qualification)|my rep|surely|ignore|guarantee|promise|always|never fails|every change|all regulatory)\b/.test(t)) return 'UNSUPPORTED_PRODUCT_QUESTION';
  if (/\b(roadmap|next feature|releasing|release next|future product|will you add|coming soon)\b/.test(t)) return 'ROADMAP_FUTURE';
  if (/\b(licens\w*|commercial|pricing|price|cost|discount|contract|subscription)\b/.test(t)) return 'LICENSING_COMMERCIAL';
  if (/\b(our (process|system|lims|environment|workflow)|my (company|system)|customer specific|implementation|implement|deploy|three months|3 months|configure for)\b/.test(t)) return 'CUSTOMER_SPECIFIC_IMPLEMENTATION';
  if (/\b(sap|s 4hana|oracle|veeva|salesforce|lims|connector|compliant|compliance|part 11|cfr|fda|hipaa|gxp|soc 2|iso|validated|regulat\w*|production|retry|retrie\w*|automatic\w*|automate\w*|encrypt\w*|sso|security|authenticated|actors?|identity|who changed|who modified|who entered)\b/.test(t)) return 'UNSUPPORTED_PRODUCT_QUESTION';
  if (/^(what happens next|what is next|whats next|can you (switch roles|go back|show|navigate|open)|show|go|skip|switch|start|enter|submit|assess|resolve|approve|reset|stop|pause|end|filter|highlight)\b/.test(t)) return 'DEMO_NAVIGATION';
  if (/^(what about (that|this|it)|can it do (that|it)|what do you mean|how does (that|it) work)$/.test(t)) return 'UNCLEAR';
  return /\?|^(does|is|are|can|how|what|which|who|why|do|tell me|explain|describe)\b/i.test(input.trim()) ? 'APPROVED_PRODUCT_QUESTION' : 'DEMO_NAVIGATION';
}
export class LocalKnowledgeProvider implements KnowledgeProvider {
  private readonly pack: ProductPack;
  constructor(pack: ProductPack) { this.pack = structuredClone(pack); }
  retrieve(request: KnowledgeRequest): KnowledgeSelection {
    const classification = classifyQuestion(request.question), version = this.pack.knowledgeVersion ?? '0.0.0';
    const result: KnowledgeSelection = { classification, mode: classification === 'DEMO_NAVIGATION' || classification === 'UNCLEAR' ? null : 'ESCALATION', version, facts: [], family: null, qualification: '', reason: null, evidenceId: null };
    if (classification === 'DEMO_NAVIGATION' || classification === 'UNCLEAR') return result;
    if (classification !== 'APPROVED_PRODUCT_QUESTION') return { ...result, reason: classification };
    if (request.productPackVersion !== this.pack.version || request.knowledgeVersion !== version || request.policyVersion !== this.pack.policy.version || !this.pack.knowledge) return { ...result, reason: 'VERSION_MISMATCH' };
    const input = normalized(request.question), knowledge = this.pack.knowledge;
    const synth = knowledge.synthesis.filter(item => matches(input, item.match));
    const families = knowledge.families.filter(item => matches(input, item.match));
    const exact = families.filter(item => item.examples.some(example => normalized(example) === input));
    const entries = synth.length ? synth : exact.length ? exact : families;
    if (entries.length !== 1) return { ...result, classification: entries.length ? classification : 'UNSUPPORTED_PRODUCT_QUESTION', reason: entries.length ? 'AMBIGUOUS_EVIDENCE' : 'INSUFFICIENT_EVIDENCE' };
    const entry = entries[0]!;
    const found = entry.factRefs.map(ref => ProductFactSchema.safeParse(this.pack.truth.facts.find(fact => fact.id === ref)));
    if (found.some(fact => !fact.success)) return { ...result, reason: 'INSUFFICIENT_EVIDENCE' };
    const facts = found.map(fact => fact.data!);
    const issue = this.validateFacts(facts);
    if (issue) return { ...result, reason: issue };
    return { ...result, mode: synth.length ? 'EVIDENCE_SYNTHESIS' : 'APPROVED_QA', facts, family: synth.length ? null : entry as QuestionFamily,
      qualification: entry.requiredQualification, reason: null, evidenceId: entry.id };
  }
  validateFacts(facts: ProductFact[]): string | null {
    const today = new Date().toISOString().slice(0, 10);
    for (const fact of facts) {
      if (fact.status !== 'available' || fact.supersededBy || (fact.effectiveDate && fact.effectiveDate > today)) return 'UNAVAILABLE_EVIDENCE';
      const conflicts = this.pack.truth.facts.filter(other => other.id !== fact.id && 'claimKey' in other && other.status === 'available' && !other.supersededBy && (!other.effectiveDate || other.effectiveDate <= today) && (fact.conflictsWith.includes(other.id) || other.conflictsWith.includes(fact.id) || (other.claimKey === fact.claimKey && other.claimValue !== fact.claimValue)));
      if (conflicts.length) return 'CONFLICTING_EVIDENCE';
    }
    return null;
  }
  narration(screen: string, versions: Omit<KnowledgeRequest, 'question' | 'currentLane' | 'currentScreen'>): KnowledgeSelection {
    const base = this.retrieve({ ...versions, question: 'Does fictional unknown behavior exist?', currentScreen: screen, currentLane: null });
    if (versions.productPackVersion !== this.pack.version || versions.knowledgeVersion !== this.pack.knowledgeVersion || versions.policyVersion !== this.pack.policy.version) return { ...base, reason: 'VERSION_MISMATCH' };
    const route = [...(this.pack.knowledge?.narratives ?? [])].sort((a,b) => b.screenPrefix.length-a.screenPrefix.length).find(item => screen.startsWith(item.screenPrefix));
    if (!route) return base;
    const facts = route.factRefs.slice(0,route.maxFacts).map(ref => ProductFactSchema.safeParse(this.pack.truth.facts.find(fact => fact.id === ref)));
    if (facts.some(fact => !fact.success)) return base;
    const approved = facts.map(fact => fact.data!); const reason = this.validateFacts(approved);
    return { ...base, classification: 'DEMO_NAVIGATION', mode: reason ? 'ESCALATION' : 'EVIDENCE_SYNTHESIS', facts: reason ? [] : approved, reason, evidenceId: null };
  }
}
