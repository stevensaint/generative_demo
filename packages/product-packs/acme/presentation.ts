import type { ProductPack } from '../../contracts/src/product-pack.js';
import { DemoPresentationSchema, type Screen, type NavigationTarget } from '../../contracts/src/presentation.js';
import type { Entity } from '../../contracts/src/state.js';
import type { Session, Event, Control } from '../../contracts/src/index.js';

const target = (screenId: string, recordId: string | null): NavigationTarget => ({ screenId, recordId });
const link = (label: string, screenId: string, recordId: string | null) => ({ label, target: target(screenId, recordId) });
const section = (title: string, fields: Record<string, unknown>) => ({ title, fields: Object.entries(fields).map(([label, value]) => ({ label, value: String(value ?? 'Not recorded') })) });
const screen = (value: Pick<Screen, 'id' | 'kind' | 'recordId' | 'title' | 'subtitle'> & Partial<Screen>): Screen => ({ badge: { label: 'Live synthetic state', tone: 'neutral' }, sections: [], steps: [], links: [], ...value });
const related = (session: Session, sample: Entity, type: string) => session.productState.records.find(record => record.entityType === type && record.values.sampleId === sample.id);
const textState = (state: string) => state.replaceAll('-', ' ');
export function presentAcme(pack: ProductPack, session: Session, events: Event[]) {
  const samples = session.productState.records.filter(record => record.entityType === 'Sample');
  const siteLabel = pack.sites.find(site => site.id === session.demoState.currentSite)?.label ?? 'All sites';
  const visible = samples.filter(sample => sample.values.site === session.demoState.currentSite);
  const primary = samples[0]!;
  const pathLink = (label: string, kind: string) => link(label, `${kind}-${primary.id.split('-')[1]}`, primary.id);
  const screens: Screen[] = [
    screen({ id: 'work-queue', kind: 'work-queue', recordId: null, title: pack.presentation.screens.find(item => item.id === 'work-queue')?.title ?? 'Quality work queue', subtitle: `${siteLabel} · ${visible.length} synthetic samples`, sections: [section('Current run', { 'Site': siteLabel, 'Samples at this site': visible.length, 'Result profile': session.demoState.parameters.result_profile })],
      table: { caption: 'Current synthetic work', columns: [{ key: 'id', label: 'Sample' }, { key: 'batch', label: 'Batch' }, { key: 'status', label: 'Status' }], rows: visible.map(sample => ({ id: sample.id, cells: { id: sample.id, batch: String(sample.values.batch), status: textState(sample.state) }, tone: sample.state === 'approved' ? 'success' : 'neutral', link: link(`Open ${sample.id}`, `sample-${sample.id.split('-')[1]}`, sample.id) })) },
      links: [pathLink('Begin sample workflow', 'sample'), link('Browse samples', 'sample-list', null)],
    }),
    screen({ id: 'sample-list', kind: 'record-list', recordId: null, title: pack.presentation.screens.find(item => item.id === 'sample-list')?.title ?? 'Samples', subtitle: `Canonical records at ${siteLabel}`, table: {
      caption: 'Synthetic sample register', columns: [{ key: 'id', label: 'Sample' }, { key: 'batch', label: 'Batch' }, { key: 'source', label: 'Source' }, { key: 'status', label: 'Status' }], rows: visible.map(sample => ({ id: sample.id, cells: { id: sample.id, batch: String(sample.values.batch), source: String(sample.values.source), status: textState(sample.state) }, tone: 'neutral', link: link(`Open ${sample.id}`, `sample-${sample.id.split('-')[1]}`, sample.id) })),
    }, links: [link('Return to work queue', 'work-queue', null)] }),
  ];
  for (const sample of samples) {
    const suffix = sample.id.split('-')[1]!;
    const local = (label: string, kind: string) => link(label, `${kind}-${suffix}`, sample.id);
    const test = related(session, sample, 'Test')!;
    const result = related(session, sample, 'Result');
    const exception = related(session, sample, 'Exception');
    const review = related(session, sample, 'Review');
    const spec = session.productState.records.find(record => record.id === test.values.specificationId)!;
    const range = `${spec.values.phMinimum}–${spec.values.phMaximum}`;
    screens.push(
      screen({ id: `sample-${suffix}`, kind: 'record-detail', recordId: sample.id, title: sample.id, subtitle: `${sample.values.material} · ${sample.values.batch}`, badge: { label: textState(sample.state), tone: sample.state === 'approved' ? 'success' : 'neutral' }, sections: [section('Sample information', { 'Material': sample.values.material, 'Batch': sample.values.batch, 'Site': pack.sites.find(site => site.id === sample.values.site)?.label, 'Source': sample.values.source, 'Partner': sample.values.partner ?? 'Internal lab', 'Received by': sample.values.receivedBy }), section('Testing summary', { 'Test': test.id, 'Test status': textState(test.state), 'Observed pH': result?.values.value, 'Exception': exception ? `${exception.id} · ${exception.state}` : 'None', 'Review': review ? `${review.id} · ${review.state}` : 'Not submitted' })], links: [local('View test execution', 'execution'), local('View specification', 'specification'), local('View live audit history', 'audit'), link('Back to samples', 'sample-list', null)] }),
      screen({ id: `execution-${suffix}`, kind: 'execution', recordId: sample.id, title: 'Test execution', subtitle: `${test.id} · pH measurement · ${sample.id}`, badge: { label: textState(test.state), tone: test.state === 'completed' ? 'success' : 'neutral' }, sections: [section('Execution context', { 'Method': test.values.method, 'Instrument': test.values.instrument, 'Analyst': test.values.analyst, 'Sample': sample.id }), section('Measurement', { 'Observed pH': result?.values.value, 'Fixture range': range, 'Result status': result?.state ?? 'Not entered' })], notice: { title: 'Synthetic test execution', body: 'Enter a measurement, submit the test, then assess the result. These operations affect only this session’s fictional records.', tone: 'neutral' }, links: [local('View results', 'results'), local('Back to sample', 'sample')] }),
      screen({ id: `results-${suffix}`, kind: 'results', recordId: sample.id, title: 'Results', subtitle: `${sample.id} · Current measurement evidence`, badge: { label: result ? String(result.values.assessment) : 'Awaiting measurement', tone: exception ? 'attention' : 'neutral' }, table: { caption: `Current results against ${spec.id} · v${spec.values.version}`, columns: [{ key: 'id', label: 'Result' }, { key: 'value', label: 'Value' }, { key: 'unit', label: 'Unit' }, { key: 'range', label: 'Range' }, { key: 'assessment', label: 'Assessment' }], rows: result ? [{ id: result.id, cells: { id: result.id, value: String(result.values.value), unit: String(result.values.unit), range, assessment: String(result.values.assessment) }, tone: exception ? 'attention' : result.state === 'assessed' ? 'success' : 'neutral' }] : [] }, links: [local('View exception', 'exception'), local('View specification', 'specification'), local('Back to test', 'execution')] }),
      screen({ id: `specification-${suffix}`, kind: 'record-detail', recordId: sample.id, title: 'Specification', subtitle: `${spec.id} · Fictional range`, sections: [section('Specification context', { 'Version': spec.values.version, 'Material': spec.values.material, 'pH range': range, 'Scope': 'Synthetic teaching example only' })], links: [local('View results', 'results'), local('Back to sample', 'sample')] }),
      screen({ id: `exception-${suffix}`, kind: 'workflow', recordId: sample.id, title: 'Exception', subtitle: exception ? `${exception.id} · ${sample.id}` : `${sample.id} · No exception`, badge: { label: exception?.state ?? 'None', tone: exception?.state === 'resolved' ? 'success' : exception ? 'attention' : 'neutral' }, sections: [section('Exception evidence', { 'Source result': exception?.values.resultId ?? 'None', 'Observed pH': result?.values.value, 'Specification range': range, 'Owner': exception?.values.owner, 'Root cause': exception?.values.rootCause ?? 'Not determined', 'Disposition': exception?.values.disposition ?? 'Not recorded' })], notice: { title: exception?.state === 'resolved' ? 'Synthetic disposition documented' : exception ? 'Synthetic disposition required' : 'No failing assessment', body: exception ? 'QA must document a disposition before approval. The demo does not infer a root cause or make a laboratory release decision.' : 'Enter and assess an out-of-range result to create a linked exception.', tone: exception ? 'attention' : 'neutral' }, links: [local('Continue to QA review', 'review'), local('Back to results', 'results'), local('View live audit history', 'audit')] }),
      screen({ id: `review-${suffix}`, kind: 'review', recordId: sample.id, title: 'QA review', subtitle: review ? `${review.id} · ${sample.id}` : `${sample.id} · Not submitted`, badge: { label: review?.state ?? 'Not submitted', tone: review?.state === 'approved' ? 'success' : 'neutral' }, sections: [section('Review summary', { 'Reviewer': review?.values.reviewer, 'Sample status': textState(sample.state), 'Test status': test.state, 'Result assessment': result?.values.assessment ?? 'Not assessed', 'Exception status': exception?.state ?? 'None', 'Decision rationale': review?.values.rationale ?? 'Not recorded' })], notice: { title: sample.state === 'approved' ? 'Synthetic workflow complete' : 'Evidence controls approval', body: sample.state === 'approved' ? 'The review and sample are approved in this fictional session. No real product, laboratory, or regulatory action occurred.' : 'Complete testing and assessment, resolve any exception, then switch to QA and record a decision rationale.', tone: sample.state === 'approved' ? 'success' : 'neutral' }, links: [local('Inspect exception evidence', 'exception'), local('View live audit history', 'audit'), link('Return to work queue', 'work-queue', null)] }),
      screen({ id: `audit-${suffix}`, kind: 'audit', recordId: sample.id, title: 'Audit history', subtitle: `${sample.id} · Live session commands`, notice: { title: 'Live synthetic command history', body: 'These are actual events from this session. Input values and credentials are not recorded in this event table.', tone: 'neutral' }, table: { caption: 'Actual session command sequence', columns: [{ key: 'sequence', label: 'Sequence' }, { key: 'type', label: 'Event' }, { key: 'command', label: 'Command' }, { key: 'revision', label: 'Revision' }], rows: events.filter(event => event.commandId).map(event => ({ id: event.eventId, cells: { sequence: String(event.sequence), type: event.type, command: event.commandType ?? '', revision: String(event.revision ?? '') }, tone: event.type === 'COMMAND_REJECTED' ? 'attention' : 'neutral' })) }, links: [local('Back to QA review', 'review'), local('Back to sample', 'sample')] }),
    );
  }
  return DemoPresentationSchema.parse({ packId: pack.metadata.packId, homeScreenId: pack.presentation.homeScreenId, fixtureLabel: `Quality lab · ${siteLabel} site`, fixtureDescription: 'Run a deterministic fictional sample workflow. Records, roles, context and outcomes belong to this isolated session.', navigation: [link('Work queue', 'work-queue', null), link('Samples', 'sample-list', null), pathLink('QA review', 'review'), pathLink('Audit history', 'audit')], walkthrough: [pathLink('Sample', 'sample'), pathLink('Test', 'execution'), pathLink('Result', 'results'), pathLink('Exception', 'exception'), pathLink('QA review', 'review')], screens });
}
export function acmeControls(pack: ProductPack, session: Session): Control[] {
  const sample = session.productState.records.find(record => record.id === session.demoState.selectedRecordId && record.entityType === 'Sample');
  if (!sample) return [];
  const test = related(session, sample, 'Test')!, result = related(session, sample, 'Result'), exception = related(session, sample, 'Exception'), review = related(session, sample, 'Review');
  const kind = session.demoState.currentScreen.split('-')[0];
  const controls: Control[] = [];
  const add = (id: string, actionId: string, commandType: Control['commandType'], recordId: string, inputs: Control['inputs'] = [], stage = true) => {
    const action = pack.productModel.actions.find(action => action.id === actionId)!;
    const enabled = stage && session.status === 'active' && !!session.demoState.currentRole && action.roles.includes(session.demoState.currentRole) && sample.values.site === session.demoState.currentSite;
    controls.push({ id, label: action.label, commandType, args: { recordId }, inputs, enabled, ...(!enabled ? { reason: `Requires ${action.roles.map(role => pack.roles.find(item => item.id === role)!.label).join(' or ')} and the appropriate workflow state/site.` } : {}) });
  };
  if (['sample', 'execution'].includes(kind!)) {
    if (test.state === 'ready') add('start', 'start-test', 'START_TEST', test.id);
    if (test.state === 'in-progress') {
      const profile = session.demoState.parameters.result_profile;
      const defaultValue = profile === 'in-range' || (profile === 'mixed' && Number(sample.id.split('-')[1]) % 2 === 0) ? 7.0 : 6.4;
      add('enter', 'enter-result', 'ENTER_RESULT', test.id, [{ id: 'value', label: 'Observed pH', type: 'number', default: result ? Number(result.values.value) : defaultValue }, { id: 'unit', label: 'Unit', type: 'string', default: 'pH' }]);
      add('submit', 'submit-test', 'SUBMIT_TEST', test.id, [], !!result);
    }
  }
  if (kind === 'results' && result?.state === 'recorded') add('assess', 'assess-result', 'TRIGGER_EXCEPTION', result.id, [], test.state === 'completed');
  if (['sample', 'results', 'exception', 'review'].includes(kind!) && sample.state === 'in-testing') add('review', 'submit-review', 'SUBMIT_FOR_REVIEW', sample.id, [], result?.state === 'assessed');
  if (kind === 'exception' && exception && exception.state !== 'resolved') add('resolve', 'resolve-exception', 'RESOLVE_EXCEPTION', exception.id, [{ id: 'disposition', label: 'Synthetic disposition', type: 'string' }]);
  if (kind === 'review' && review?.state === 'pending') add('approve', 'approve-review', 'APPROVE', review.id, [{ id: 'rationale', label: 'Decision rationale', type: 'string' }]);
  return controls;
}
