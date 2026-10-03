import { AnswerPlanSchema, type AnswerPlan, type KnowledgeTrace } from '../../contracts/src/knowledge.js';
import type { KnowledgeSelection } from './local-knowledge-provider.js';
export const SAFE_ESCALATION = 'That’s a good question. I don’t want to overstate what this demonstration supports, so I’ll capture that for follow-up.';
export type GuardedAnswer = { text: string; refs: string[]; mode: NonNullable<KnowledgeTrace['answerMode']>; familyId: string | null; reason: string | null };
export class ClaimGuard {
  // Models select fact order and approved phrasing. No model-written prose is
  // accepted: deterministic validation cannot prove unrestricted paraphrases safe.
  answer(selection: KnowledgeSelection, raw: unknown): GuardedAnswer {
    const fail = (reason: string): GuardedAnswer => ({ text: SAFE_ESCALATION, refs: [], mode: 'ESCALATION', familyId: null, reason });
    if (!selection.mode || selection.mode === 'ESCALATION') return fail(selection.reason ?? 'INSUFFICIENT_EVIDENCE');
    const parsed = AnswerPlanSchema.safeParse(raw);
    if (!parsed.success) return fail('INVALID_CLAIM_PLAN');
    const plan = parsed.data;
    if (plan.mode !== selection.mode || plan.familyId !== (selection.family?.id ?? null) || plan.knowledgeVersion !== selection.version) return fail('CLAIM_AUTHORITY_MISMATCH');
    const ids = plan.claims.map(claim => claim.factId);
    if (new Set(ids).size !== ids.length || ids.length !== selection.facts.length || selection.facts.some(fact => !ids.includes(fact.id))) return fail('INSUFFICIENT_CLAIM_REFERENCES');
    const qualifications = [...new Set([selection.qualification, ...selection.facts.map(fact => fact.requiredQualification)].filter(Boolean))];
    if (!qualifications.length || selection.facts.some(fact => fact.status !== 'available' || fact.supersededBy)) return fail('UNAPPROVED_CLAIM');
    const phrases = plan.claims.map(claim => selection.facts.find(fact => fact.id === claim.factId)!.phrases[claim.style]);
    const text = [...phrases, ...qualifications].join(' ');
    if (text.length > 1000) return fail('ANSWER_TOO_LONG');
    return { text, refs: ids, mode: selection.mode, familyId: plan.familyId, reason: null };
  }
  defaultPlan(selection: KnowledgeSelection): AnswerPlan { return { mode: selection.mode ?? 'ESCALATION', familyId: selection.family?.id ?? null, knowledgeVersion: selection.version, claims: selection.facts.map(fact => ({ factId: fact.id, style: 'brief' as const })) }; }
}
