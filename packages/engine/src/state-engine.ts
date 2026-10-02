import { z } from 'zod';
import type { ProductPack } from '../../contracts/src/product-pack.js';
import { ProductStateSchema, type ProductState, type Entity } from '../../contracts/src/state.js';
import type { PackRuntime, Invocation, ActionContext } from '../../contracts/src/runtime.js';
import { SessionError } from './sessions.js';

// Generic storage/transition/guard framework. Pack handlers own object semantics.
export class StateEngine {
  constructor(private readonly pack: ProductPack, readonly state: ProductState, private readonly runtime: PackRuntime) {}
  find(id: string): Entity {
    const record = this.state.records.find(item => item.id === id);
    if (!record) throw new SessionError('ACTION_REJECTED');
    return record;
  }
  validate() {
    ProductStateSchema.parse(this.state);
    const ids = new Set(this.state.records.map(record => record.id));
    if (ids.size !== this.state.records.length) throw new SessionError('ACTION_REJECTED');
    for (const record of this.state.records) {
      const type = this.pack.productModel.entityTypes.find(item => item.id === record.entityType);
      if (!type || !type.states.includes(record.state)) throw new SessionError('ACTION_REJECTED');
      if (Object.keys(record.values).some(key => !type.fields.some(field => field.id === key))) throw new SessionError('ACTION_REJECTED');
      for (const field of type.fields) {
        const value = record.values[field.id];
        if (value === undefined || value === null) { if (field.required) throw new SessionError('ACTION_REJECTED'); continue; }
        if (typeof value !== (field.type === 'reference' ? 'string' : field.type)) throw new SessionError('ACTION_REJECTED');
        if (field.type === 'reference' && this.find(String(value)).entityType !== field.referenceType) throw new SessionError('ACTION_REJECTED');
      }
    }
    this.runtime.validate(this.pack, this.state);
  }
  private predicate(id: string, subject: Entity, state: ProductState): boolean {
    const guard = this.pack.productModel.invariants.find(item => item.id === id);
    if (!guard || subject.entityType !== guard.predicate.entityType) return false;
    const p = guard.predicate;
    const value = p.field === 'state' ? subject.state : subject.values[p.field];
    if (p.operator === 'present') return value !== undefined && value !== null && (typeof value !== 'string' || value.trim().length > 0);
    if (p.operator === 'equals') return value === p.value;
    if (p.operator === 'one-of') return p.values?.includes(value ?? null) ?? false;
    const related = state.records.filter(record => record.entityType === p.relatedType && record.values[p.relatedField!] === subject.id);
    if (p.operator === 'related-exists') return related.length > 0;
    return related.every(record => (p.relatedValueField === 'state' ? record.state : record.values[p.relatedValueField!]) === p.value);
  }
  run(invocation: Invocation, role: string | null) {
    const action = this.pack.productModel.actions.find(item => item.id === invocation.actionId);
    const handler = this.runtime.handlers[invocation.actionId];
    const subject = this.find(invocation.recordId);
    if (!action || !handler || subject.entityType !== action.entityType || !role || !action.roles.includes(role)) throw new SessionError('ACTION_REJECTED');
    const fields: Record<string, z.ZodTypeAny> = {};
    for (const input of action.inputs) {
      const schema = input.type === 'number' ? z.number().finite() : input.type === 'boolean' ? z.boolean() : z.string().trim().min(1).max(1000);
      fields[input.id] = input.required ? schema : schema.optional();
    }
    const inputs = z.object(fields).strict().parse(invocation.inputs);
    const before = structuredClone(this.state);
    const checkGuards = (phase: 'current' | 'proposed') => {
      const state = phase === 'current' ? before : this.state;
      const target = state.records.find(record => record.id === subject.id)!;
      for (const binding of action.guardBindings.filter(item => item.phase === phase)) {
        const bound = binding.subjectField ? state.records.find(record => record.id === target.values[binding.subjectField!]) : target;
        if (!bound || !this.predicate(binding.guardId, bound, state)) throw new SessionError('ACTION_REJECTED');
      }
    };
    checkGuards('current');
    const context: ActionContext = {
      subject: structuredClone(subject), inputs, role, find: id => structuredClone(this.find(id)), records: type => structuredClone(this.state.records.filter(record => record.entityType === type)),
      create: record => { if (this.state.records.some(item => item.id === record.id)) throw new SessionError('ACTION_REJECTED'); this.state.records.push(structuredClone(record)); },
      set: (id, field, value) => { this.find(id).values[field] = value; },
      transition: (id, state) => {
        const record = this.find(id);
        const allowed = this.pack.productModel.transitions.some(item => item.entityType === record.entityType && item.from === record.state && item.to === state && item.actionId === action.id);
        if (!allowed) throw new SessionError('ACTION_REJECTED');
        record.state = state;
      },
    };
    handler(context);
    checkGuards('proposed');
    this.validate();
  }
}
