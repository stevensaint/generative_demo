import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import type { ProductPack } from '../../contracts/src/product-pack.js';
import { parsePackParameters } from '../../contracts/src/product-pack.js';
import { CommandSchema, type Command } from '../../contracts/src/state.js';
import { NavigationTargetSchema } from '../../contracts/src/presentation.js';
import { SessionViewSchema, type SessionView, type Session } from '../../contracts/src/index.js';
import { RuleViolation, type PackRuntime } from '../../contracts/src/runtime.js';
import { SessionStore, SessionError } from './sessions.js';
import { StateEngine } from './state-engine.js';
import { CustomerModelSchema, ConversationStateSchema, type RequestedAction, type CustomerModel, type ConversationState } from '../../contracts/src/turns.js';

export class DemoController {
  constructor(readonly pack: ProductPack, readonly store: SessionStore, private readonly runtime?: PackRuntime) { this.initial(parsePackParameters(this.pack, {})); }
  private initial(parameters: Record<string, string | number>): Pick<Session, 'productState' | 'demoState' | 'productPackVersion'> {
    const context = this.runtime?.initialContext(this.pack, parameters) ?? { currentRole: null, currentSite: null, currentLane: null };
    const productState = this.runtime?.initialize(this.pack, parameters) ?? { records: structuredClone(this.pack.productModel.records) };
    if (this.runtime) new StateEngine(this.pack, productState, this.runtime).validate();
    return { productState, productPackVersion: this.pack.version, demoState: {
      ...context, currentScreen: this.pack.presentation.homeScreenId, selectedRecordId: null,
      history: [], filters: {}, highlights: [], parameters,
    } };
  }
  create(): SessionView {
    const created = this.store.create(this.pack.metadata.packId, this.initial(parsePackParameters(this.pack, {})));
    return this.view(created.session.sessionId);
  }
  view(id: string): SessionView {
    const view = this.store.get(id);
    const presentation = this.runtime?.present(this.pack, view.session, view.events) ?? this.pack.presentation;
    return SessionViewSchema.parse({ ...view, workspace: { presentation, controls: this.runtime?.controls(this.pack, view.session) ?? [], siteIds: this.runtime?.sites(this.pack, view.session) ?? this.pack.sites.map(site => site.id) } });
  }
  narrative(id: string, session = this.store.get(id).session) {
    if (this.runtime?.narrative) return this.runtime.narrative(this.pack, session);
    const presentation = this.runtime?.present(this.pack, session, []) ?? this.pack.presentation;
    const screen = presentation.screens.find(item => item.id === session.demoState.currentScreen)!;
    return `Here is ${screen.title}. What would you like to explore?`;
  }
  executeTurn(id: string, expectedRevision: number, requests: RequestedAction[], memory: { customerModel: CustomerModel; conversationState: ConversationState; narrate?: boolean }, turnId: string, ended = false): SessionView {
    const current = this.store.get(id).session;
    const metadata = requests.map(request => ({ commandId: randomUUID(), commandType: request.type, turnId,
      revision: current.revision, recordId: null }));
    for (const item of metadata) this.store.commandEvent(id, 'COMMAND_REQUESTED', item);
    try {
      if (current.status !== 'active') throw new SessionError('SESSION_ENDED');
      if (current.revision !== expectedRevision) throw new SessionError('REVISION_CONFLICT');
      const candidate = structuredClone(current);
      for (const request of requests) {
        const command = CommandSchema.safeParse({ type: request.type, args: Object.fromEntries(request.args.map(arg => [arg.name, arg.value])), expectedRevision });
        if (!command.success) throw new SessionError('CAPABILITY_NOT_AVAILABLE');
        this.apply(candidate, command.data);
      }
      candidate.customerModel = CustomerModelSchema.parse(memory.customerModel);
      candidate.conversationState = ConversationStateSchema.parse(memory.conversationState);
      if (memory.narrate) candidate.conversationState.recent.at(-1)!.response = this.narrative(id, candidate);
      candidate.revision = current.revision + 1;
      SessionViewSchema.parse({ session: candidate, events: [], workspace: {
        presentation: this.runtime?.present(this.pack, candidate, this.store.get(id).events) ?? this.pack.presentation,
        controls: this.runtime?.controls(this.pack, candidate) ?? [],
      } });
      this.store.commitTurn(id, expectedRevision, candidate, ended);
      for (const item of metadata) this.store.commandEvent(id, 'COMMAND_APPROVED', { ...item, revision: current.revision + 1 });
      this.store.turnEvent(id, 'STATE_CHANGED', turnId);
      return this.view(id);
    } catch (error) {
      const code = error instanceof SessionError ? error.code : error instanceof z.ZodError ? 'INVALID_REQUEST' : error instanceof RuleViolation ? 'ACTION_REJECTED' : 'INTERNAL_ERROR';
      for (const item of metadata) this.store.commandEvent(id, 'COMMAND_REJECTED', item, code);
      throw new SessionError(code);
    }
  }
  execute(id: string, raw: unknown): SessionView {
    const command = CommandSchema.parse(raw);
    const current = this.store.get(id).session;
    const commandId = randomUUID();
    const metadata = { commandId, commandType: command.type, recordId: current.productState.records.some(record => record.id === command.args.recordId) ? String(command.args.recordId) : null, revision: current.revision };
    this.store.commandEvent(id, 'COMMAND_REQUESTED', metadata);
    try {
      if (current.status !== 'active') throw new SessionError('SESSION_ENDED');
      if (current.revision !== command.expectedRevision) throw new SessionError('REVISION_CONFLICT');
      const candidate = structuredClone(current);
      this.apply(candidate, command);
      candidate.revision = current.revision + 1;
      // Validate rendering BEFORE commit: malformed projections cannot half-commit state.
      SessionViewSchema.parse({ session: candidate, events: [], workspace: {
        presentation: this.runtime?.present(this.pack, candidate, this.store.get(id).events) ?? this.pack.presentation,
        controls: this.runtime?.controls(this.pack, candidate) ?? [],
      } });
      this.store.commit(id, command.expectedRevision, candidate);
      const committedMetadata = { ...metadata, revision: current.revision + 1 };
      this.store.commandEvent(id, 'COMMAND_APPROVED', committedMetadata);
      this.store.commandEvent(id, 'STATE_CHANGED', committedMetadata);
      return this.view(id);
    } catch (error) {
      const code = error instanceof SessionError ? error.code : error instanceof z.ZodError ? 'INVALID_REQUEST' : error instanceof RuleViolation ? 'ACTION_REJECTED' : 'INTERNAL_ERROR';
      this.store.commandEvent(id, 'COMMAND_REJECTED', metadata, code);
      throw new SessionError(code);
    }
  }
  private apply(session: Session, command: Command) {
    const state = session.demoState;
    const presentation = this.runtime?.present(this.pack, session, this.store.get(session.sessionId).events) ?? this.pack.presentation;
    const navigate = (target: { screenId: string; recordId: string | null }, remember = true) => {
      if (!presentation.screens.some(screen => screen.id === target.screenId && screen.recordId === target.recordId)) throw new SessionError('INVALID_REQUEST');
      if (remember) state.history = [...state.history, { screenId: state.currentScreen, recordId: state.selectedRecordId }].slice(-32);
      state.currentScreen = target.screenId; state.selectedRecordId = target.recordId; state.highlights = [];
    };
    if (['NAVIGATE', 'OPEN_RECORD', 'SHOW', 'OPEN_EXCEPTION', 'SHOW_AUDIT_HISTORY'].includes(command.type)) { navigate(NavigationTargetSchema.parse(command.args)); return; }
    if (command.type === 'RETURN') {
      z.object({}).strict().parse(command.args);
      const previous = state.history.pop(); if (!previous) throw new SessionError('ACTION_REJECTED');
      navigate(previous, false); return;
    }
    if (command.type === 'FILTER') {
      const { query } = z.object({ query: z.string().max(100) }).strict().parse(command.args);
      const screen = presentation.screens.find(item => item.id === state.currentScreen);
      if (screen?.kind !== 'record-list') throw new SessionError('ACTION_REJECTED');
      state.filters[state.currentScreen] = query; return;
    }
    if (command.type === 'HIGHLIGHT') {
      const { field } = z.object({ field: z.string().max(100) }).strict().parse(command.args);
      const screen = presentation.screens.find(item => item.id === state.currentScreen)!;
      if (!screen.sections.some(section => section.fields.some(item => item.label === field))) throw new SessionError('INVALID_REQUEST');
      state.highlights = [field]; return;
    }
    if (command.type === 'SWITCH_ROLE') {
      const { roleId } = z.object({ roleId: z.string() }).strict().parse(command.args);
      if (!this.pack.roles.some(role => role.id === roleId)) throw new SessionError('INVALID_REQUEST');
      state.currentRole = roleId;
      if (!this.pack.lanes.find(lane => lane.id === state.currentLane)?.roles.includes(roleId)) state.currentLane = null;
      return;
    }
    if (command.type === 'SWITCH_SITE') {
      const { siteId } = z.object({ siteId: z.string() }).strict().parse(command.args);
      const sites = this.runtime?.sites(this.pack, session) ?? this.pack.sites.map(site => site.id);
      if (!sites.includes(siteId)) throw new SessionError('INVALID_REQUEST');
      state.currentSite = siteId; navigate({ screenId: this.pack.presentation.homeScreenId, recordId: null }); return;
    }
    if (command.type === 'SET_LANE') {
      const { laneId } = z.object({ laneId: z.string() }).strict().parse(command.args);
      const lane = this.pack.lanes.find(item => item.id === laneId);
      if (!lane || !state.currentRole || !lane.roles.includes(state.currentRole)) throw new SessionError('ACTION_REJECTED');
      state.currentLane = laneId; navigate(lane.nodes.find(node => node.id === lane.entryNodeId)!.target); return;
    }
    if (command.type === 'SET_PARAMETER' || command.type === 'RESET') {
      let parameters = parsePackParameters(this.pack, {});
      if (command.type === 'SET_PARAMETER') {
        const { parameterId, value } = z.object({ parameterId: z.string(), value: z.union([z.string(), z.number().finite()]) }).strict().parse(command.args);
        parameters = parsePackParameters(this.pack, { ...state.parameters, [parameterId]: value });
      } else z.object({}).strict().parse(command.args);
      const initial = this.initial(parameters);
      session.productState = initial.productState; session.demoState = initial.demoState; return;
    }
    const operation = this.runtime?.operations[command.type];
    if (!operation || !this.runtime || this.pack.policy.execution !== 'deterministic') throw new SessionError('ACTION_REJECTED');
    const engine = new StateEngine(this.pack, session.productState, this.runtime);
    for (const invocation of operation(command.args, session)) engine.run(invocation, state.currentRole);
    engine.validate();
  }
}
