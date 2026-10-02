import { DemoTurnProposalSchema, type DemoTurnProposal } from '../../contracts/src/turns.js';
import type { ProductPack } from '../../contracts/src/product-pack.js';
import type { SessionView } from '../../contracts/src/index.js';
import type { ModelProvider } from './model-provider.js';
import { ContextBuilder } from './context-builder.js';
import { PromptBuilder } from './prompt-builder.js';
import { proposalFormat } from './proposal-format.js';
export class GDEAgent {
  constructor(readonly provider: ModelProvider, private readonly context = new ContextBuilder(), private readonly prompt = new PromptBuilder()) {}
  localControl(input: string): 'stop' | 'end' | null {
    const text = input.toLowerCase().replace(/[.!]/g, '').trim();
    if (['stop', 'pause', 'stop the demo', 'pause the demo'].includes(text)) return 'stop';
    return ['end', 'end the demo', 'end demo', 'end the session'].includes(text) ? 'end' : null;
  }
  isFactualQuestion(input: string) {
    if (/\b(integrat\w*|compliance|licens\w*|roadmap|security|capabilit\w*|implement\w*|pricing|price|cost|HIPAA|GxP|CFR|SOC\s*2)\b/i.test(input)) return true;
    if (/^(what happens next|what(?:'s| is) next|can you (switch roles|go back|show|navigate|open)|show|go|skip)/i.test(input.trim())) return false;
    return /\?|^(does|is|are|can|how|what|which|do you)\b/i.test(input.trim());
  }
  async propose(pack: ProductPack, view: SessionView, input: string, narrative: string, signal: AbortSignal): Promise<DemoTurnProposal> {
    const local = this.localControl(input);
    if (local) return DemoTurnProposalSchema.parse({ understanding: { intent: local, summary: `Customer requested ${local}.`, confidence: 1 }, customerModelUpdates: [], requestedActions: [], narrationIntent: 'none', questionHandling: 'none', nextStep: local === 'stop' ? 'pause' : 'end' });
    if (this.isFactualQuestion(input)) return DemoTurnProposalSchema.parse({ understanding: { intent: 'question', summary: 'Capture an out-of-scope factual question for follow-up.', confidence: 1 }, customerModelUpdates: [], requestedActions: [], narrationIntent: 'none', questionHandling: 'capture', nextStep: 'listen' });
    const raw = await this.provider.propose({ system: this.prompt.build(), context: this.context.build(pack, view, input, narrative), schema: proposalFormat }, signal);
    return DemoTurnProposalSchema.parse(raw);
  }
}
