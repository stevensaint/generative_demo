import type { ProductPack } from '../../contracts/src/product-pack.js';
import type { SessionView } from '../../contracts/src/index.js';
import { CommandTypeSchema } from '../../contracts/src/state.js';
export class ContextBuilder {
  build(pack: ProductPack, view: SessionView, input: string, boundedNarration: string, governedKnowledge?: unknown) {
    const session = view.session, demo = view.workspace!.presentation;
    const screen = demo.screens.find(item => item.id === session.demoState.currentScreen && item.recordId === session.demoState.selectedRecordId)!;
    const selected = session.productState.records.find(item => item.id === session.demoState.selectedRecordId);
    const relevant = session.productState.records.filter(item => !selected ? false : item.id === selected.id || Object.values(item.values).includes(selected.id) || Object.values(selected.values).includes(item.id)).slice(0, 12);
    const links = [...demo.navigation, ...demo.walkthrough, ...screen.links, ...(screen.table?.rows.flatMap(row => row.link ? [row.link] : []) ?? [])];
    const unique = [...new Map(links.map(link => [JSON.stringify(link.target), link])).values()].slice(0, 24);
    const context = {
      governedKnowledge, customerInput: input, customerModel: session.customerModel.entries.filter(entry => entry.active).slice(-12),
      demoState: { ...session.demoState, history: session.demoState.history.slice(-3) },
      productSummary: relevant.map(record => ({ id: record.id, entityType: record.entityType, state: record.state,
        values: Object.fromEntries(Object.entries(record.values).slice(0, 8).map(([key, value]) => [key, typeof value === 'string' ? value.slice(0, 300) : value])) })),
      currentView: { title: screen.title, badge: screen.badge.label, boundedNarration },
      lane: pack.lanes.filter(lane => lane.id === session.demoState.currentLane).map(lane => ({ id: lane.id, label: lane.label, description: lane.description.slice(0, 300) })),
      demoPolicy: { mode: pack.policy.mode, execution: pack.policy.execution, blockedCapabilities: pack.policy.blockedCapabilities.slice(0, 12), questionPolicy: pack.knowledge ? 'Approved facts/claim plans only; escalate insufficient evidence' : 'P4 capture only; no open-ended product answers' },
      availableActions: { commandTypes: CommandTypeSchema.options, navigationTargets: unique,
        workflowControls: view.workspace!.controls, roles: pack.roles.map(role => ({ id: role.id, label: role.label })),
        sites: pack.sites.filter(site => view.workspace!.siteIds?.includes(site.id)),
        lanes: pack.lanes.map(lane => ({ id: lane.id, label: lane.label, roles: lane.roles })), parameters: pack.parameters },
      recentConversation: session.conversationState.recent.slice(-4), outstandingQuestions: (view.questions.length ? view.questions.filter(question => question.status !== 'ANSWERED').map(({text, classification, status}) => ({text, classification, status})) : session.conversationState.outstandingQuestions).slice(-5), paused: session.conversationState.paused,
    };
    const serialized = JSON.stringify(context);
    if (Buffer.byteLength(serialized) > 24000) throw new Error('CONTEXT_LIMIT');
    return serialized;
  }
}
