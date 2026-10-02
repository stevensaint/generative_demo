import { z } from 'zod';
import type { ProductPack } from '../../contracts/src/product-pack.js';
import type { Entity, ProductState, Command } from '../../contracts/src/state.js';
import type { Session } from '../../contracts/src/index.js';
import { RuleViolation, type PackRuntime } from '../../contracts/src/runtime.js';
import { presentAcme, acmeControls } from './presentation.js';

const reject = () => { throw new RuleViolation('Fictional action guard failed.'); };
const relatedId = (prefix: string, id: string) => `${prefix}-${id.split('-')[1]}`;
function sampleFor(session: Session, record: Entity): Entity {
  const sampleId = record.entityType === 'Sample' ? record.id : record.values.sampleId;
  const sample = session.productState.records.find(item => item.id === sampleId);
  if (!sample || sample.values.site !== session.demoState.currentSite) return reject();
  return sample;
}
function subject(args: Command['args'], session: Session, entityType: string, extra: Record<string, z.ZodTypeAny> = {}) {
  const parsed: Record<string, unknown> = z.object({ recordId: z.string(), ...extra }).strict().parse(args);
  const record = session.productState.records.find(item => item.id === parsed.recordId && item.entityType === entityType);
  if (!record) return reject();
  sampleFor(session, record);
  return { record, parsed };
}
const simple = (actionId: string, entityType: string) => (args: Command['args'], session: Session) => {
  const { record } = subject(args, session, entityType); return [{ actionId, recordId: record.id, inputs: {} }];
};
const sampleTests = (records: Entity[], id: string) => records.filter(record => record.entityType === 'Test' && record.values.sampleId === id);
function eligible(records: Entity[], sampleId: string) {
  const tests = sampleTests(records, sampleId);
  const results = records.filter(record => record.entityType === 'Result' && record.values.sampleId === sampleId);
  const exceptions = records.filter(record => record.entityType === 'Exception' && record.values.sampleId === sampleId);
  return tests.length > 0 && tests.every(test => test.state === 'completed' && results.some(result => result.values.testId === test.id && result.state === 'assessed'))
    && exceptions.every(exception => exception.state === 'resolved' && String(exception.values.disposition ?? '').trim());
}
function assessment(result: Entity, test: Entity, specification: Entity) {
  if (test.values.measurement !== 'pH' || result.values.unit !== 'pH') return reject();
  const value = Number(result.values.value);
  return value < Number(specification.values.phMinimum) ? 'below-range' : value > Number(specification.values.phMaximum) ? 'above-range' : 'within-range';
}

export const acmeRuntime: PackRuntime = {
  initialize(pack: ProductPack, parameters): ProductState {
    const count = Number(parameters.sample_count), siteCount = Number(parameters.site_count), partners = Number(parameters.external_partner_count);
    if (siteCount > pack.sites.length || (parameters.sample_source !== 'internal' && partners < 1)) return reject();
    const sampleTemplate = pack.productModel.records.find(record => record.entityType === 'Sample')!;
    const testTemplate = pack.productModel.records.find(record => record.entityType === 'Test')!;
    const specification = pack.productModel.records.find(record => record.entityType === 'Specification')!;
    if (!sampleTemplate || !testTemplate || !specification) return reject();
    const records: Entity[] = [structuredClone(specification)];
    for (let i = 0; i < count; i++) {
      const external = parameters.sample_source === 'external' || (parameters.sample_source === 'mixed' && i % 2 === 1);
      const sampleId = `SMP-${1001 + i}`;
      records.push({ ...structuredClone(sampleTemplate), id: sampleId, state: 'received', values: {
        ...sampleTemplate.values, batch: `CB-260928-${String.fromCharCode(65 + i)}`,
        site: pack.sites[i % siteCount]!.id, source: external ? 'external' : 'internal',
        partner: external ? `Synthetic partner ${(i % partners) + 1}` : null,
      } });
      records.push({ ...structuredClone(testTemplate), id: `TST-${1001 + i}`, state: 'ready', values: { ...testTemplate.values, sampleId } });
    }
    return { records };
  },
  initialContext: (pack) => ({ currentRole: 'analyst', currentSite: pack.sites[0]!.id, currentLane: 'sample-management' }),
  sites: (pack, session) => pack.sites.slice(0, Number(session.demoState.parameters.site_count)).map(site => site.id),
  operations: {
    START_TEST: (args, session) => {
      const { record } = subject(args, session, 'Test'); const sample = sampleFor(session, record);
      return [...(sample.state === 'received' ? [{ actionId: 'begin-testing', recordId: sample.id, inputs: {} }] : []), { actionId: 'start-test', recordId: record.id, inputs: {} }];
    },
    ENTER_RESULT: (args, session) => { const { record, parsed } = subject(args, session, 'Test', { value: z.number().finite(), unit: z.string() }); return [{ actionId: 'enter-result', recordId: record.id, inputs: { value: parsed.value, unit: parsed.unit } }]; },
    SUBMIT_TEST: simple('submit-test', 'Test'),
    TRIGGER_EXCEPTION: simple('assess-result', 'Result'),
    SUBMIT_FOR_REVIEW: simple('submit-review', 'Sample'),
    RESOLVE_EXCEPTION: (args, session) => {
      const { record, parsed } = subject(args, session, 'Exception', { disposition: z.string().trim().min(1).max(1000) });
      return [...(record.state === 'open' ? [{ actionId: 'review-exception', recordId: record.id, inputs: {} }] : []), { actionId: 'resolve-exception', recordId: record.id, inputs: { disposition: parsed.disposition } }];
    },
    APPROVE: (args, session) => {
      const { record, parsed } = subject(args, session, 'Review', { rationale: z.string().trim().min(1).max(1000) });
      return [{ actionId: 'approve-review', recordId: record.id, inputs: { rationale: parsed.rationale } }, { actionId: 'approve-sample', recordId: String(record.values.sampleId), inputs: {} }];
    },
  },
  handlers: {
    'begin-testing': context => context.transition(context.subject.id, 'in-testing'),
    'start-test': context => context.transition(context.subject.id, 'in-progress'),
    'enter-result': context => {
      const value = Number(context.inputs.value), unit = String(context.inputs.unit);
      if (value < 0 || value > 14 || unit !== 'pH') return reject();
      const id = relatedId('RES', context.subject.id);
      const existing = context.records('Result').find(record => record.id === id);
      if (existing) {
        if (existing.state !== 'recorded') return reject();
        context.set(id, 'value', value); context.set(id, 'unit', unit);
      } else context.create({ id, entityType: 'Result', state: 'recorded', values: { testId: context.subject.id, sampleId: context.subject.values.sampleId!, value, unit, assessment: 'unassessed' } });
    },
    'submit-test': context => context.transition(context.subject.id, 'completed'),
    'assess-result': context => {
      const test = context.find(String(context.subject.values.testId));
      const specification = context.find(String(test.values.specificationId));
      const outcome = assessment(context.subject, test, specification);
      context.set(context.subject.id, 'assessment', outcome); context.transition(context.subject.id, 'assessed');
      if (outcome !== 'within-range') context.create({ id: relatedId('EXC', context.subject.id), entityType: 'Exception', state: 'open', values: {
        sampleId: context.subject.values.sampleId!, resultId: context.subject.id, owner: 'Jordan Lee', rootCause: null, disposition: null,
      } });
    },
    'submit-review': context => {
      context.create({ id: relatedId('REV', context.subject.id), entityType: 'Review', state: 'pending', values: { sampleId: context.subject.id, reviewer: 'Jordan Lee', rationale: null } });
      context.transition(context.subject.id, 'awaiting-qa');
    },
    'review-exception': context => context.transition(context.subject.id, 'in-review'),
    'resolve-exception': context => { context.set(context.subject.id, 'disposition', String(context.inputs.disposition)); context.transition(context.subject.id, 'resolved'); },
    'approve-review': context => { context.set(context.subject.id, 'rationale', String(context.inputs.rationale)); context.transition(context.subject.id, 'approved'); },
    'return-review': context => { context.set(context.subject.id, 'rationale', String(context.inputs.rationale)); context.transition(context.subject.id, 'returned'); },
    'approve-sample': context => context.transition(context.subject.id, 'approved'),
  },
  validate(pack, state) {
    const find = (id: unknown) => { const record = state.records.find(item => item.id === id); if (!record) return reject(); return record; };
    for (const record of state.records) {
      if (record.entityType === 'Specification') {
        const low = record.values.phMinimum, high = record.values.phMaximum;
        if (typeof low !== 'number' || typeof high !== 'number' || !Number.isFinite(low) || !Number.isFinite(high) || low < 0 || high > 14 || low > high) return reject();
      }
      if (record.entityType === 'Sample' && !pack.sites.some(site => site.id === record.values.site)) return reject();
      if (record.entityType === 'Test' && record.state === 'completed' && !state.records.some(item => item.entityType === 'Result' && item.values.testId === record.id)) return reject();
      if (record.entityType === 'Result') {
        const test = find(record.values.testId);
        if (test.values.sampleId !== record.values.sampleId || typeof record.values.value !== 'number' || record.values.value < 0 || record.values.value > 14 || record.values.unit !== 'pH') return reject();
        if (state.records.filter(item => item.entityType === 'Result' && item.values.testId === test.id).length !== 1) return reject();
        if (record.state === 'assessed' && (test.state !== 'completed' || record.values.assessment !== assessment(record, test, find(test.values.specificationId)))) return reject();
        const exceptions = state.records.filter(item => item.entityType === 'Exception' && item.values.resultId === record.id);
        if (record.state === 'assessed' && exceptions.length !== (record.values.assessment === 'within-range' ? 0 : 1)) return reject();
      }
      if (record.entityType === 'Exception') {
        const result = find(record.values.resultId);
        if (result.values.sampleId !== record.values.sampleId || result.state !== 'assessed' || !['below-range', 'above-range'].includes(String(result.values.assessment))) return reject();
        if (record.state === 'resolved' && !String(record.values.disposition ?? '').trim()) return reject();
      }
      if (record.entityType === 'Review' && record.state === 'approved' && (!eligible(state.records, String(record.values.sampleId)) || !String(record.values.rationale ?? '').trim())) return reject();
      if (record.entityType === 'Sample' && record.state === 'approved') {
        const reviews = state.records.filter(item => item.entityType === 'Review' && item.values.sampleId === record.id);
        if (!eligible(state.records, record.id) || !reviews.length || reviews.some(review => review.state !== 'approved')) return reject();
      }
    }
  },
  present: presentAcme, controls: acmeControls,
  narrative: (_pack, session) => {
    const sample = session.productState.records.find(record => record.id === session.demoState.selectedRecordId);
    const kind = session.demoState.currentScreen.split('-')[0];
    if (session.demoState.currentScreen === 'sample-list') return 'Here are the fictional samples in this session. You can filter the list or open a sample to follow its workflow.';
    if (kind === 'sample') return 'Here is the fictional sample and its current testing evidence. We can follow it into testing or look at the specification.';
    if (kind === 'execution') return 'This is the fictional test workspace. You can enter an observed pH, complete the test, then compare its result with the specification.';
    if (kind === 'results') return 'These are the measurements recorded in this demo session. Assessment compares the entered pH with the fictional specification.';
    if (kind === 'exception') return 'Here is the exception evidence for this sample. A failing assessment needs an explicit synthetic disposition before QA approval.';
    if (kind === 'review') return sample?.state === 'approved' ? 'The fictional review and sample are approved. The completed evidence and disposition are visible here.' : 'Here is QA review. Approval depends on completed testing, assessed results and resolved exception evidence.';
    if (kind === 'audit') return 'Here is the live history of actions requested and validated during this demo session.';
    if (kind === 'specification') return 'This is the fictional specification used to assess the recorded pH. The bounds are inclusive.';
    return 'Here are the fictional samples in this session. Which part of the workflow would you like to explore?';
  },
};
