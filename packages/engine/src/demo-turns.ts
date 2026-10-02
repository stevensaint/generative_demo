import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { GDEAgent } from '../../agent/src/gde-agent.js';
import { ProviderFailure } from '../../agent/src/model-provider.js';
import { DemoTurnProposalSchema, TextTurnRequestSchema, type DemoTurnProposal, type TurnRecord, type CustomerModel } from '../../contracts/src/turns.js';
import { SessionViewSchema, type SessionView, type ErrorCode } from '../../contracts/src/index.js';
import { SessionError } from './sessions.js';
import { DemoController } from './controller.js';
export const CAPTURE_RESPONSE = 'That’s a good question. I don’t want to overstate what this demonstration supports yet, so I’ll capture that for follow-up.';
const norm = (text: string) => text.toLowerCase().trim();
export class DemoTurnExecutor {
  private readonly pending = new Map<string, { abort: AbortController; turnId: string }>();
  private readonly sequences = new Map<string, number>();
  constructor(readonly controller: DemoController, private readonly agent?: GDEAgent) {}
  view(id: string): SessionView {
    return SessionViewSchema.parse({ ...this.controller.view(id), chat: {
      available: !!this.agent, provider: this.agent?.provider.name ?? 'claude', model: this.agent?.provider.model ?? 'unconfigured', turns: this.controller.store.getTurns(id),
    } });
  }
  cancel(id: string) { const pending = this.pending.get(id); if (pending) { pending.abort.abort(); this.pending.delete(id); } }
  private customerModel(current: CustomerModel, proposal: DemoTurnProposal, input: string, turnId: string, sequence: number) {
    const candidate = structuredClone(current);
    for (const update of proposal.customerModelUpdates) {
      if (!input.includes(update.evidenceQuote)) throw new SessionError('MODEL_OUTPUT_INVALID');
      if (update.status !== 'inferred' && !norm(update.evidenceQuote).includes(norm(update.value))) throw new SessionError('MODEL_OUTPUT_INVALID');
      if (update.status === 'inferred' && update.confidence > 0.7) throw new SessionError('MODEL_OUTPUT_INVALID');
      const prior = candidate.entries.find(entry => entry.active && entry.field === update.field && entry.key === update.key);
      if (update.status === 'correction' && !prior) throw new SessionError('MODEL_OUTPUT_INVALID');
      if (prior?.status === 'explicit' && update.status === 'inferred') throw new SessionError('MODEL_OUTPUT_INVALID');
      if (prior) prior.active = false;
      candidate.entries.push({ id: randomUUID(), field: update.field, key: update.key, value: update.value,
        status: update.status === 'inferred' ? 'inferred' : 'explicit', confidence: update.confidence, active: true, supersedesId: prior?.id ?? null,
        provenance: { turnId, sequence, source: 'customer-text', quote: update.evidenceQuote, kind: update.status === 'correction' ? 'correction' : update.status === 'inferred' ? 'inference' : 'statement' } });
    }
    return candidate;
  }
  async execute(id: string, raw: unknown): Promise<SessionView> {
    const request = TextTurnRequestSchema.parse(raw), store = this.controller.store;
    const before = store.get(id).session;
    if (before.status !== 'active') throw new SessionError('SESSION_ENDED');
    if (before.revision !== request.expectedRevision) throw new SessionError('REVISION_CONFLICT');
    const agent = this.agent ?? new GDEAgent({ name: 'unconfigured', model: 'unconfigured', propose: async () => { throw new ProviderFailure('PROVIDER_UNAVAILABLE'); } });
    const local = agent.localControl(request.text), localPolicy = !local && agent.isFactualQuestion(request.text);
    if (this.pending.has(id) && !local) throw new SessionError('TURN_BUSY');
    if (local) this.cancel(id);
    const turnId = randomUUID(), abort = new AbortController();
    const sequence = Math.max(this.sequences.get(id) ?? 0, store.nextTurnSequence(id) - 1) + 1;
    this.sequences.set(id, sequence);
    this.pending.set(id, { abort, turnId });
    store.turnEvent(id, 'CUSTOMER_SPOKE', turnId);
    let proposal: DemoTurnProposal | null = null;
    let response = 'I couldn’t complete that turn. Please try again or use the demo controls.';
    let status: TurnRecord['status'] = 'failed', code: ErrorCode | null = null;
    let providerHttpStatus: number | null = null;
    let actions: TurnRecord['actions'] = [], changes: TurnRecord['customerChanges'] = [], questionIds: string[] = [];
    try {
      proposal = DemoTurnProposalSchema.parse(await agent.propose(this.controller.pack, this.controller.view(id), request.text, this.controller.narrative(id), abort.signal));
      if (abort.signal.aborted) throw new SessionError('TURN_CANCELLED');
      if (store.get(id).session.revision !== before.revision || store.get(id).session.status !== 'active') throw new SessionError('REVISION_CONFLICT');
      // Lifecycle requests require explicit customer direction, never AI inference.
      if ((proposal.nextStep === 'end' || proposal.understanding.intent === 'end') && local !== 'end') throw new SessionError('CAPABILITY_NOT_AVAILABLE');
      if ((proposal.nextStep === 'pause' || proposal.understanding.intent === 'stop') && local !== 'stop') throw new SessionError('CAPABILITY_NOT_AVAILABLE');
      store.turnEvent(id, 'INTENT_DETECTED', turnId);
      const capture = !local && (agent.isFactualQuestion(request.text) || proposal.questionHandling === 'capture' || proposal.understanding.intent === 'question');
      if (capture && proposal.requestedActions.length) throw new SessionError('CAPABILITY_NOT_AVAILABLE');
      const customerModel = this.customerModel(before.customerModel, proposal, request.text, turnId, sequence);
      const conversationState = structuredClone(before.conversationState);
      conversationState.sequence = sequence; conversationState.paused = local === 'stop';
      if (capture) {
        const question = { id: randomUUID(), turnId, text: request.text, status: 'captured' as const };
        conversationState.outstandingQuestions.push(question); questionIds = [question.id];
      }
      // Only predefined text is customer-facing. Free model summaries are audit data.
      const clarification = { clarify_role: `Which demo role would you like: ${this.controller.pack.roles.map(role => role.label).join(', ')}?`, clarify_site: 'Which available demo site would you like to explore?', clarify_record: 'Which displayed record would you like to open?', clarify_action: 'What would you like to see instead?', clarify_setting: 'Which run setting should change? Applying a setting restarts the synthetic workflow.' };
      // Controller owns action execution; response is finalized only after success.
      const provisional = local === 'stop' ? 'Paused. Tell me where you’d like to go when you’re ready.' : local === 'end' ? 'The demo has ended. Thanks for exploring.' : capture ? CAPTURE_RESPONSE : proposal.narrationIntent in clarification ? clarification[proposal.narrationIntent as keyof typeof clarification] : proposal.narrationIntent === 'acknowledge_interest' ? 'I’ve noted your interest. What would you like to explore next?' : 'What would you like to explore next?';
      conversationState.recent = [...conversationState.recent, { turnId, customer: request.text, response: provisional }].slice(-6);
      const narrate = !local && !capture && !(proposal.narrationIntent in clarification) && proposal.narrationIntent !== 'acknowledge_interest';
      const view = this.controller.executeTurn(id, before.revision, proposal.requestedActions, { customerModel, conversationState, narrate }, turnId, local === 'end');
      response = view.session.conversationState.recent.at(-1)!.response;
      actions = proposal.requestedActions.map(action => ({ type: action.type, status: 'approved', code: null }));
      changes = proposal.customerModelUpdates;
      if (changes.length) store.turnEvent(id, 'CUSTOMER_MODEL_UPDATED', turnId);
      status = 'completed';
    } catch (error) {
      providerHttpStatus = error instanceof ProviderFailure ? error.httpStatus ?? null : null;
      code = abort.signal.aborted ? 'TURN_CANCELLED' : error instanceof SessionError ? error.code : error instanceof z.ZodError ? 'MODEL_OUTPUT_INVALID' : error instanceof ProviderFailure ? error.code : 'INTERNAL_ERROR';
      status = code === 'TURN_CANCELLED' ? 'cancelled' : proposal ? 'rejected' : 'failed';
      actions = proposal?.requestedActions.map(action => ({ type: action.type, status: 'rejected', code })) ?? [];
      changes = []; questionIds = [];
      response = code === 'TURN_CANCELLED' ? 'That turn was stopped.' : code === 'PROVIDER_UNAVAILABLE' ? 'Text chat is unavailable right now. You can still use the demo controls.' : code === 'REVISION_CONFLICT' ? 'The demo changed while I was listening. Please try again from the current view.' : proposal ? 'I couldn’t make that change. We can use an available demo action or choose another direction.' : 'I couldn’t interpret that safely. Please rephrase or use the demo controls.';
      store.recordError(id, code);
    } finally { if (this.pending.get(id)?.turnId === turnId) this.pending.delete(id); }
    const after = store.get(id).session;
    const productChanges = status === 'completed' ? [...new Set([...before.productState.records, ...after.productState.records].map(record => record.id))].flatMap(recordId => {
      const old = before.productState.records.find(record => record.id === recordId), fresh = after.productState.records.find(record => record.id === recordId);
      return JSON.stringify(old) === JSON.stringify(fresh) ? [] : [{ recordId, beforeState: old?.state ?? null, after: fresh ?? null }];
    }) : [];
    store.recordTurn(id, { turnId, sequence, timestamp: new Date().toISOString(), customerText: request.text,
      provider: local ? 'local-control' : localPolicy ? 'local-policy' : this.agent?.provider.name ?? 'claude', model: local || localPolicy ? 'none' : this.agent?.provider.model ?? 'unconfigured',
      status, proposal, response, actions, customerChanges: changes, questionIds, productChanges, beforeRevision: before.revision, afterRevision: after.revision,
      resultingContext: { screen: after.demoState.currentScreen, recordId: after.demoState.selectedRecordId, role: after.demoState.currentRole, site: after.demoState.currentSite, lifecycle: after.status }, errorCode: code, providerHttpStatus });
    store.turnEvent(id, 'DEMO_TURN_CREATED', turnId, code ?? undefined);
    return this.view(id);
  }
}
