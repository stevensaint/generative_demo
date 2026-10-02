import { DemoPresentationSchema, type Screen, type NavigationTarget } from '../../contracts/src/presentation.js';

// P1 presentation snapshots only. No object definitions, actions, transitions,
// invariants, knowledge, or generated data: those belong to later phases.
const primary = 'SMP-1001';
const target = (screenId: string, recordId: string | null = primary): NavigationTarget => ({ screenId, recordId });
const link = (label: string, screenId: string, recordId: string | null = primary) => ({ label, target: target(screenId, recordId) });
const section = (title: string, values: Record<string, string>) => ({ title, fields: Object.entries(values).map(([label, value]) => ({ label, value })) });
const view = (screen: Pick<Screen, 'id' | 'kind' | 'title' | 'subtitle'> & Partial<Omit<Screen, 'id' | 'kind' | 'title' | 'subtitle'>>): Screen => ({
  recordId: primary, badge: { label: 'Fixed fixture', tone: 'neutral' }, sections: [], steps: [], links: [], ...screen,
});
const path = [
  link('Sample', 'sample-1001'), link('Test', 'execution-1001'), link('Result', 'results-1001'),
  link('Exception', 'exception-1001'), link('QA review', 'review-1001'),
];

export const acmeDemoPresentation = DemoPresentationSchema.parse({
  packId: 'acme-quality-cloud', homeScreenId: 'work-queue',
  fixtureLabel: 'Quality lab · Harbor site',
  fixtureDescription: 'Follow one fictional sample from lab receipt to QA review. All records, people, values, and history are fixed synthetic fixtures.',
  navigation: [
    link('Work queue', 'work-queue', null), link('Samples', 'sample-list', null),
    link('QA review', 'review-1001'), link('Audit history', 'audit-1001'),
  ],
  walkthrough: path,
  screens: [
    view({
      id: 'work-queue', kind: 'work-queue', recordId: null, title: 'Your work queue',
      subtitle: 'A clear view of the lab’s next steps.', badge: { label: '3 fixture items', tone: 'neutral' },
      sections: [section('At a glance', { 'Lab': 'Harbor Quality Lab', 'Focus': 'One sample, one exception, one review', 'Demo path': 'SMP-1001 · Clearwater Buffer' })],
      table: {
        caption: 'Assigned work — synthetic fixture',
        columns: [{ key: 'work', label: 'Work item' }, { key: 'record', label: 'Sample' }, { key: 'owner', label: 'Assigned to' }, { key: 'status', label: 'Status' }],
        rows: [
          { id: 'queue-1', cells: { work: 'Inspect sample and completed testing', record: primary, owner: 'Maya Chen · Analyst', status: 'Awaiting QA' }, tone: 'neutral', link: link('Open sample SMP-1001', 'sample-1001') },
          { id: 'queue-2', cells: { work: 'Assess pH exception', record: primary, owner: 'Jordan Lee · QA reviewer', status: 'Needs review' }, tone: 'attention', link: link('Open exception EXC-1001', 'exception-1001') },
          { id: 'queue-3', cells: { work: 'Inspect newly received sample', record: 'SMP-1002', owner: 'Maya Chen · Analyst', status: 'Received' }, tone: 'neutral', link: link('Open sample SMP-1002', 'sample-1002', 'SMP-1002') },
        ],
      },
      links: [link('Begin sample walkthrough', 'sample-1001'), link('Browse samples', 'sample-list', null)],
    }),
    view({
      id: 'sample-list', kind: 'record-list', recordId: null, title: 'Samples',
      subtitle: 'Two fictional lab records. Open either to inspect its details.',
      table: {
        caption: 'Sample register — synthetic fixture',
        columns: [{ key: 'id', label: 'Sample ID' }, { key: 'product', label: 'Material' }, { key: 'batch', label: 'Batch' }, { key: 'site', label: 'Site' }, { key: 'status', label: 'Status' }],
        rows: [
          { id: primary, cells: { id: primary, product: 'Clearwater Buffer', batch: 'CB-260928-A', site: 'Harbor', status: 'Awaiting QA' }, tone: 'attention', link: link('Open sample SMP-1001', 'sample-1001') },
          { id: 'SMP-1002', cells: { id: 'SMP-1002', product: 'Clearwater Buffer', batch: 'CB-260928-B', site: 'Harbor', status: 'Received' }, tone: 'neutral', link: link('Open sample SMP-1002', 'sample-1002', 'SMP-1002') },
        ],
      }, links: [link('Return to work queue', 'work-queue', null)],
    }),
    view({
      id: 'sample-1001', kind: 'record-detail', title: 'SMP-1001', subtitle: 'Clearwater Buffer · CB-260928-A',
      badge: { label: 'Awaiting QA', tone: 'attention' },
      sections: [
        section('Sample information', { 'Material': 'Clearwater Buffer', 'Batch': 'CB-260928-A', 'Site': 'Harbor', 'Lab': 'Harbor Quality Lab', 'Received': '28 Sep 2026, 08:40 UTC', 'Received by': 'Maya Chen' }),
        section('Testing summary', { 'Test': 'TST-1001 · pH measurement', 'Specification': 'SPEC-CB-01 · v1.0', 'Observed pH': '6.4', 'Exception': 'EXC-1001 · Below the fixture range', 'Review': 'REV-1001 · Pending QA assessment' }),
      ],
      notice: { title: 'An exception needs review', body: 'The prefilled pH result falls below the fictional specification. Follow the linked views to see the evidence and review context.', tone: 'attention' },
      links: [link('View test execution', 'execution-1001'), link('View specification', 'specification-1001'), link('View fixture history', 'audit-1001'), link('Back to samples', 'sample-list', null)],
    }),
    view({
      id: 'sample-1002', kind: 'record-detail', recordId: 'SMP-1002', title: 'SMP-1002', subtitle: 'Clearwater Buffer · CB-260928-B',
      badge: { label: 'Received', tone: 'neutral' },
      sections: [section('Sample information', { 'Material': 'Clearwater Buffer', 'Batch': 'CB-260928-B', 'Site': 'Harbor', 'Lab': 'Harbor Quality Lab', 'Received': '28 Sep 2026, 10:15 UTC', 'Received by': 'Maya Chen', 'Testing': 'Not started in this fixture' })],
      notice: { title: 'A second record for comparison', body: 'This fixed record illustrates the received state. The full walkthrough is available on SMP-1001.', tone: 'neutral' },
      links: [link('Back to samples', 'sample-list', null), link('Explore SMP-1001 walkthrough', 'sample-1001')],
    }),
    view({
      id: 'execution-1001', kind: 'execution', title: 'Test execution', subtitle: 'TST-1001 · pH measurement · SMP-1001',
      badge: { label: 'Prefilled execution', tone: 'success' },
      sections: [section('Execution context', { 'Method': 'ACME-PH-01 · v1.0', 'Analyst': 'Maya Chen', 'Instrument': 'BENCH-PH-03', 'Sample': primary, 'Completed': '28 Sep 2026, 09:20 UTC' }), section('Recorded measurement', { 'Observed pH': '6.4', 'Fixture range': '6.8–7.2', 'Assessment': 'Below range — prefilled fixture' })],
      steps: [
        { label: 'Prepare measurement', detail: 'Sample and bench instrument identified.', state: 'complete' },
        { label: 'Record measurement', detail: 'Observed pH 6.4 is already populated.', state: 'complete' },
        { label: 'Inspect result', detail: 'View the fixed assessment and linked exception.', state: 'current' },
      ],
      notice: { title: 'Read-only execution snapshot', body: 'The measurement is prefilled. Viewing this screen does not run a test or enter a result.', tone: 'neutral' },
      links: [link('Continue to results', 'results-1001'), link('Back to sample', 'sample-1001')],
    }),
    view({
      id: 'results-1001', kind: 'results', title: 'Results', subtitle: 'SMP-1001 · Completed synthetic measurements',
      badge: { label: '1 exception', tone: 'attention' },
      table: {
        caption: 'Results against SPEC-CB-01 · v1.0 — prefilled assessments',
        columns: [{ key: 'test', label: 'Measurement' }, { key: 'value', label: 'Result' }, { key: 'unit', label: 'Unit' }, { key: 'range', label: 'Fixture range' }, { key: 'assessment', label: 'Assessment' }],
        rows: [
          { id: 'RES-1001', cells: { test: 'pH · TST-1001', value: '6.4', unit: 'pH', range: '6.8–7.2', assessment: 'Below range' }, tone: 'attention', link: link('View pH exception', 'exception-1001') },
          { id: 'RES-1002', cells: { test: 'Conductivity · TST-1002', value: '14.2', unit: 'mS/cm', range: '12.0–18.0', assessment: 'Within range' }, tone: 'success' },
        ],
      },
      notice: { title: 'One result requires attention', body: 'The pH row links to EXC-1001. These assessments are fixed fixtures; no specification engine has run.', tone: 'attention' },
      links: [link('Continue to exception', 'exception-1001'), link('View specification', 'specification-1001'), link('Back to test', 'execution-1001')],
    }),
    view({
      id: 'specification-1001', kind: 'record-detail', title: 'Specification', subtitle: 'SPEC-CB-01 · Clearwater Buffer · v1.0',
      sections: [section('Specification context', { 'Version': '1.0 · Synthetic example', 'Material': 'Clearwater Buffer', 'Scope': 'Fictional teaching fixture only' })],
      table: {
        caption: 'Fixed specification values — not product or regulatory claims',
        columns: [{ key: 'measure', label: 'Measurement' }, { key: 'range', label: 'Fixture range' }, { key: 'method', label: 'Method' }],
        rows: [
          { id: 'spec-ph', cells: { measure: 'pH', range: '6.8–7.2', method: 'ACME-PH-01' }, tone: 'neutral' },
          { id: 'spec-conductivity', cells: { measure: 'Conductivity', range: '12.0–18.0 mS/cm', method: 'ACME-COND-01' }, tone: 'neutral' },
        ],
      }, links: [link('View results', 'results-1001'), link('Back to sample', 'sample-1001')],
    }),
    view({
      id: 'exception-1001', kind: 'workflow', title: 'Exception', subtitle: 'EXC-1001 · pH below fixture range · SMP-1001',
      badge: { label: 'Needs QA review', tone: 'attention' },
      sections: [section('Exception evidence', { 'Source result': 'RES-1001 · pH 6.4', 'Specification': 'SPEC-CB-01 · v1.0 · 6.8–7.2', 'Related test': 'TST-1001', 'Owner': 'Jordan Lee · QA reviewer', 'Root cause': 'Not determined in this fixture', 'Disposition': 'Pending QA assessment' })],
      steps: [
        { label: 'Result identified', detail: 'The fixture contains a below-range measurement.', state: 'complete' },
        { label: 'Exception linked', detail: 'EXC-1001 references the sample, test, and result.', state: 'complete' },
        { label: 'QA assessment', detail: 'Review is pending in the synthetic snapshot.', state: 'current' },
        { label: 'Disposition', detail: 'No approval or release decision has been made.', state: 'pending' },
      ],
      links: [link('Continue to QA review', 'review-1001'), link('Back to results', 'results-1001'), link('View fixture history', 'audit-1001')],
    }),
    view({
      id: 'review-1001', kind: 'review', title: 'QA review', subtitle: 'REV-1001 · SMP-1001 · Clearwater Buffer',
      badge: { label: 'Pending assessment', tone: 'attention' },
      sections: [
        section('Review summary', { 'Reviewer': 'Jordan Lee', 'Sample': primary, 'Batch': 'CB-260928-A', 'Exception': 'EXC-1001', 'Disposition': 'Pending · no approval recorded' }),
        section('Evidence checklist', { 'Sample identity': 'SMP-1001 and batch CB-260928-A', 'Test context': 'TST-1001 · ACME-PH-01 · BENCH-PH-03', 'Result': 'RES-1001 · pH 6.4', 'Specification': 'SPEC-CB-01 · v1.0 · 6.8–7.2', 'Investigation': 'Root cause is not determined' }),
      ],
      notice: { title: 'Walkthrough complete', body: 'You have followed the sample, test, result, and exception into QA review. This view illustrates review context; approval and release are not performed.', tone: 'success' },
      links: [link('Inspect exception evidence', 'exception-1001'), link('View fixture history', 'audit-1001'), link('Return to work queue', 'work-queue', null)],
    }),
    view({
      id: 'audit-1001', kind: 'audit', title: 'Audit history', subtitle: 'SMP-1001 · Illustrative fixture history',
      notice: { title: 'Synthetic record history', body: 'These dated entries are fixed presentation fixtures. They are separate from this session’s actual lifecycle event log.', tone: 'neutral' },
      table: {
        caption: 'Fixed synthetic history · 28 Sep 2026 · UTC',
        columns: [{ key: 'time', label: 'Time (UTC)' }, { key: 'actor', label: 'Actor' }, { key: 'entry', label: 'Fixture entry' }, { key: 'ref', label: 'Reference' }],
        rows: [
          { id: 'history-1', cells: { time: '08:40', actor: 'Maya Chen', entry: 'Sample received', ref: primary }, tone: 'neutral' },
          { id: 'history-2', cells: { time: '09:20', actor: 'Maya Chen', entry: 'Measurement recorded · pH 6.4', ref: 'RES-1001' }, tone: 'neutral' },
          { id: 'history-3', cells: { time: '09:21', actor: 'Synthetic fixture', entry: 'Below-range exception linked', ref: 'EXC-1001' }, tone: 'attention' },
          { id: 'history-4', cells: { time: '09:25', actor: 'Jordan Lee', entry: 'QA review assigned · still pending', ref: 'REV-1001' }, tone: 'neutral' },
        ],
      }, links: [link('Back to QA review', 'review-1001'), link('Back to sample', 'sample-1001')],
    }),
  ],
});
