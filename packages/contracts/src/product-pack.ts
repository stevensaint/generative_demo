import { z } from 'zod';
import { ProductFactSchema, GovernedKnowledgeSchema } from './knowledge.js';
import { DemoPresentationSchema, NavigationTargetSchema } from './presentation.js';
import { ProductPresentationSchema } from './index.js';

// Provider-neutral, data-only Pack contract. Execution/interpreters belong to P3.
const Id = z.string().min(1).max(100);
const Text = z.string().min(1);
const Scalar = z.union([z.string(), z.number().finite(), z.boolean(), z.null()]);
const Field = z.object({
  id: Id, label: Text, type: z.enum(['string', 'number', 'boolean', 'reference']),
  required: z.boolean(), referenceType: Id.optional(),
}).strict();
const Predicate = z.object({
  entityType: Id, field: Id, operator: z.enum(['present', 'equals', 'one-of', 'all-related-equal', 'related-exists']),
  value: Scalar.optional(), values: z.array(Scalar).min(1).optional(), relatedType: Id.optional(), relatedField: Id.optional(), relatedValueField: Id.optional(),
}).strict();
const Invariant = z.object({ id: Id, description: Text, predicate: Predicate }).strict();
const Parameter = z.discriminatedUnion('kind', [
  z.object({ id: Id, label: Text, kind: z.literal('integer'), min: z.number().int().nonnegative(), max: z.number().int().nonnegative(), default: z.number().int() }).strict(),
  z.object({ id: Id, label: Text, kind: z.literal('choice'), values: z.array(Text).min(1), default: Text }).strict(),
]);
export const ProductPackSchema = z.object({
  schemaVersion: z.literal('1.0'), version: z.string().regex(/^\d+\.\d+\.\d+$/),
  metadata: ProductPresentationSchema, presentation: DemoPresentationSchema,
  knowledgeVersion: z.string().regex(/^\d+\.\d+\.\d+$/).optional(), knowledge: GovernedKnowledgeSchema.optional(),
  roles: z.array(z.object({ id: Id, label: Text, description: Text }).strict()).min(1),
  sites: z.array(z.object({ id: Id, label: Text }).strict()).min(1),
  parameters: z.array(Parameter),
  productModel: z.object({
    entityTypes: z.array(z.object({ id: Id, label: Text, states: z.array(Id).min(1), fields: z.array(Field) }).strict()).min(1),
    records: z.array(z.object({ id: Id, entityType: Id, state: Id, values: z.record(Scalar) }).strict()),
    invariants: z.array(Invariant),
    actions: z.array(z.object({
      id: Id, label: Text, entityType: Id, roles: z.array(Id).min(1),
      inputs: z.array(Field), guardIds: z.array(Id),
      guardBindings: z.array(z.object({ guardId: Id, phase: z.enum(['current', 'proposed']), subjectField: Id.optional() }).strict()),
      handler: z.object({ kind: z.literal('declarative'), description: Text, effects: z.array(z.object({
        operation: z.enum(['set-field', 'create-related', 'request-transition']),
        whenGuardId: Id.optional(),
        entityType: Id, field: Id.optional(), input: Id.optional(), value: Scalar.optional(), targetState: Id.optional(),
      }).strict()).min(1) }).strict(),
    }).strict()),
    transitions: z.array(z.object({ id: Id, entityType: Id, from: Id, to: Id, actionId: Id, guardIds: z.array(Id) }).strict()),
  }).strict(),
  lanes: z.array(z.object({
    id: Id, label: Text, description: Text, roles: z.array(Id).min(1), parameterIds: z.array(Id),
    entryNodeId: Id,
    nodes: z.array(z.object({ id: Id, narrative: Text, target: NavigationTargetSchema, actionIds: z.array(Id) }).strict()).min(1),
    edges: z.array(z.object({ from: Id, to: Id, label: Text }).strict()),
  }).strict()).min(1),
  policy: z.object({
    version: z.string().regex(/^\d+\.\d+\.\d+$/).default('1.0.0'), mode: z.literal('fictional-demo-only'), execution: z.enum(['definitions-only', 'deterministic']),
    unsupportedQuestion: z.literal('escalate'), blockedCapabilities: z.array(Text).min(1),
  }).strict(),
  truth: z.object({
    version: z.string().regex(/^\d+\.\d+\.\d+$/), scope: z.literal('fictional-demo-only'),
    evidence: z.array(z.object({ id: Id, source: Text, description: Text }).strict()).min(1),
    facts: z.array(z.union([ProductFactSchema, z.object({ id: Id, statement: Text, status: z.enum(['available', 'defined-only']), evidenceIds: z.array(Id).min(1) }).strict()])).min(1),
    approvedQA: z.array(z.object({ id: Id, question: Text, answer: Text, factIds: z.array(Id).min(1) }).strict()),
    escalation: z.object({ message: Text, triggers: z.array(Text).min(1) }).strict(),
  }).strict(),
}).strict().superRefine((pack, ctx) => {
  const fail = (message: string) => ctx.addIssue({ code: 'custom', message });
  const unique = (items: { id: string }[], label: string) => {
    if (new Set(items.map(item => item.id)).size !== items.length) fail(`Duplicate ${label} IDs.`);
  };
  const refs = (ids: string[], known: Set<string>, label: string) => { for (const id of ids) if (!known.has(id)) fail(`Unknown ${label}: ${id}`); };
  const ids = (items: { id: string }[]) => new Set(items.map(item => item.id));
  const types = new Map(pack.productModel.entityTypes.map(type => [type.id, type]));
  const records = new Map(pack.productModel.records.map(record => [record.id, record]));
  const roles = ids(pack.roles), params = ids(pack.parameters), actions = ids(pack.productModel.actions), guards = ids(pack.productModel.invariants);
  for (const [items, label] of [
    [pack.roles, 'role'], [pack.sites, 'site'], [pack.parameters, 'parameter'], [pack.lanes, 'lane'],
    [pack.productModel.entityTypes, 'entity type'], [pack.productModel.records, 'record'],
    [pack.productModel.actions, 'action'], [pack.productModel.transitions, 'transition'], [pack.productModel.invariants, 'invariant'],
    [pack.truth.evidence, 'evidence'], [pack.truth.facts, 'fact'], [pack.truth.approvedQA, 'Q&A'],
  ] as const) unique(items, label);
  if (pack.metadata.packId !== pack.presentation.packId) fail('Pack identity mismatch.');
  for (const parameter of pack.parameters) {
    if (parameter.kind === 'integer' && (parameter.min > parameter.max || parameter.default < parameter.min || parameter.default > parameter.max)) fail(`Invalid parameter bounds: ${parameter.id}`);
    if (parameter.kind === 'choice' && (!parameter.values.includes(parameter.default) || new Set(parameter.values).size !== parameter.values.length)) fail(`Invalid parameter choices: ${parameter.id}`);
  }
  const checkField = (entityType: string, field: string) => {
    if (!types.has(entityType) || (field !== 'state' && !types.get(entityType)?.fields.some(item => item.id === field))) fail(`Unknown field: ${entityType}.${field}`);
  };
  for (const type of types.values()) {
    unique(type.fields, 'field');
    if (new Set(type.states).size !== type.states.length) fail(`Duplicate states: ${type.id}`);
    for (const field of type.fields) {
      if (field.type === 'reference') {
        if (!field.referenceType || !types.has(field.referenceType)) fail(`Invalid reference field: ${type.id}.${field.id}`);
      } else if (field.referenceType) fail(`Unexpected reference type: ${type.id}.${field.id}`);
    }
  }
  for (const record of records.values()) {
    const type = types.get(record.entityType);
    if (!type) { fail(`Unknown record type: ${record.entityType}`); continue; }
    if (!type.states.includes(record.state)) fail(`Invalid record state: ${record.id}`);
    refs(Object.keys(record.values), ids(type.fields), 'record field');
    for (const field of type.fields) {
      const value = record.values[field.id];
      if (value === undefined || value === null) { if (field.required) fail(`Missing required value: ${record.id}.${field.id}`); continue; }
      if (typeof value !== (field.type === 'reference' ? 'string' : field.type)) fail(`Invalid value type: ${record.id}.${field.id}`);
      if (field.type === 'reference' && records.get(String(value))?.entityType !== field.referenceType) fail(`Broken record reference: ${record.id}.${field.id}`);
    }
  }
  for (const screen of pack.presentation.screens) {
    if (screen.recordId && !records.has(screen.recordId)) fail(`Unknown presentation record: ${screen.recordId}`);
  }
  for (const guard of pack.productModel.invariants) {
    const predicate = guard.predicate;
    checkField(predicate.entityType, predicate.field);
    if (predicate.operator === 'one-of' && !predicate.values?.length) fail(`Missing predicate choices: ${guard.id}`);
    if (predicate.operator === 'equals' && predicate.value === undefined) fail(`Missing predicate value: ${guard.id}`);
    if (predicate.operator === 'related-exists' || predicate.operator === 'all-related-equal') {
      if (!predicate.relatedType || !predicate.relatedField) fail(`Missing predicate relation: ${guard.id}`);
      else {
        checkField(predicate.relatedType, predicate.relatedField);
        const relatedField = types.get(predicate.relatedType)?.fields.find(field => field.id === predicate.relatedField);
        if (relatedField?.referenceType !== predicate.entityType) fail(`Invalid predicate relation: ${guard.id}`);
      }
      if (predicate.operator === 'all-related-equal') {
        if (predicate.value === undefined || !predicate.relatedValueField) fail(`Missing related comparison: ${guard.id}`);
        else if (predicate.relatedType) checkField(predicate.relatedType, predicate.relatedValueField);
      }
    }
  }
  for (const action of pack.productModel.actions) {
    if (!types.has(action.entityType)) fail(`Unknown action type: ${action.id}`);
    refs(action.roles, roles, 'action role'); refs(action.guardIds, guards, 'action guard'); unique(action.inputs, 'input');
    if (action.guardBindings.length !== action.guardIds.length || new Set(action.guardBindings.map(binding => binding.guardId)).size !== action.guardBindings.length) fail(`Incomplete guard bindings: ${action.id}`);
    for (const binding of action.guardBindings) {
      if (!action.guardIds.includes(binding.guardId)) fail(`Undeclared bound guard: ${action.id}`);
      const guard = pack.productModel.invariants.find(item => item.id === binding.guardId);
      const bindingType = binding.subjectField
        ? types.get(action.entityType)?.fields.find(field => field.id === binding.subjectField)?.referenceType
        : action.entityType;
      if (!guard || guard.predicate.entityType !== bindingType) fail(`Invalid guard binding: ${action.id}`);
    }
    for (const input of action.inputs) {
      if (input.type === 'reference' && (!input.referenceType || !types.has(input.referenceType))) fail(`Invalid input reference: ${action.id}`);
    }
    for (const effect of action.handler.effects) {
      if (effect.whenGuardId) refs([effect.whenGuardId], guards, 'effect condition');
      if (!types.has(effect.entityType)) fail(`Unknown effect type: ${action.id}`);
      if (effect.input && !action.inputs.some(input => input.id === effect.input)) fail(`Unknown effect input: ${action.id}`);
      if (effect.operation === 'set-field') {
        if (!effect.field || (effect.input === undefined && effect.value === undefined)) fail(`Incomplete field effect: ${action.id}`);
        else checkField(effect.entityType, effect.field);
      }
      if (effect.operation === 'request-transition' && (!effect.targetState || !types.get(effect.entityType)?.states.includes(effect.targetState))) fail(`Invalid transition effect: ${action.id}`);
    }
  }
  for (const transition of pack.productModel.transitions) {
    const type = types.get(transition.entityType);
    if (!type || !type.states.includes(transition.from) || !type.states.includes(transition.to)) fail(`Invalid transition states: ${transition.id}`);
    const action = pack.productModel.actions.find(item => item.id === transition.actionId);
    if (!action || action.entityType !== transition.entityType) fail(`Invalid transition action: ${transition.id}`);
    refs(transition.guardIds, guards, 'transition guard');
    if (action && (transition.guardIds.length !== action.guardIds.length || transition.guardIds.some(id => !action.guardIds.includes(id)))) fail(`Transition guard mismatch: ${transition.id}`);
  }
  for (const lane of pack.lanes) {
    refs(lane.roles, roles, 'lane role'); refs(lane.parameterIds, params, 'lane parameter'); unique(lane.nodes, 'lane node');
    const nodes = ids(lane.nodes);
    refs([lane.entryNodeId], nodes, 'entry node');
    for (const node of lane.nodes) {
      const screen = pack.presentation.screens.find(item => item.id === node.target.screenId);
      if (!screen || screen.recordId !== node.target.recordId) fail(`Invalid lane target: ${lane.id}.${node.id}`);
      refs(node.actionIds, actions, 'lane action');
    }
    for (const edge of lane.edges) refs([edge.from, edge.to], nodes, 'lane edge');
    const reachable = new Set([lane.entryNodeId]);
    let size = -1;
    while (size !== reachable.size) { size = reachable.size; for (const edge of lane.edges) if (reachable.has(edge.from)) reachable.add(edge.to); }
    if (lane.nodes.some(node => !reachable.has(node.id))) fail(`Unreachable lane node: ${lane.id}`);
  }
  if (!!pack.knowledge !== !!pack.knowledgeVersion) fail('Knowledge and version must be configured together.');
  if (pack.knowledge) {
    if (pack.knowledgeVersion !== pack.truth.version) fail('Knowledge version mismatch.');
    unique(pack.knowledge.families, 'question family'); unique(pack.knowledge.synthesis, 'synthesis');
    for (const fact of pack.truth.facts) {
      if (!ProductFactSchema.safeParse(fact).success) fail(`Ungoverned fact: ${fact.id}`);
      if ('supersededBy' in fact && fact.supersededBy) refs([fact.supersededBy], ids(pack.truth.facts), 'supersession');
      if ('conflictsWith' in fact) refs(fact.conflictsWith, ids(pack.truth.facts), 'conflict');
    }
    for (const entry of [...pack.knowledge.families, ...pack.knowledge.synthesis, ...pack.knowledge.narratives]) refs(entry.factRefs, ids(pack.truth.facts), 'knowledge fact');
  }
  for (const fact of pack.truth.facts) refs(fact.evidenceIds, ids(pack.truth.evidence), 'fact evidence');
  for (const qa of pack.truth.approvedQA) refs(qa.factIds, ids(pack.truth.facts), 'Q&A fact');
});
export type ProductPack = z.infer<typeof ProductPackSchema>;

// Bounded configuration validation only; this does not generate a scenario.
export function parsePackParameters(pack: ProductPack, input: unknown): Record<string, string | number> {
  const fields: Record<string, z.ZodTypeAny> = {};
  for (const param of pack.parameters) {
    fields[param.id] = param.kind === 'integer'
      ? z.number().int().min(param.min).max(param.max).default(param.default)
      : z.string().refine(value => param.values.includes(value), 'Unsupported parameter choice').default(param.default);
  }
  return z.object(fields).strict().parse(input) as Record<string, string | number>;
}
