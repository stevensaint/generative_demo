import type { ProductPack } from './product-pack.js';
import type { ProductState, Command, Entity } from './state.js';
import type { Session, Event, Control } from './index.js';
import type { DemoPresentation } from './presentation.js';
export type Invocation = { actionId: string; recordId: string; inputs: Record<string, unknown> };
export interface ActionContext {
  subject: Entity; inputs: Record<string, unknown>; role: string | null;
  find(id: string): Entity;
  records(type: string): Entity[];
  create(record: Entity): void;
  set(id: string, field: string, value: string | number | boolean | null): void;
  transition(id: string, state: string): void;
}
export interface PackRuntime {
  initialize(pack: ProductPack, parameters: Record<string, string | number>): ProductState;
  initialContext(pack: ProductPack, parameters: Record<string, string | number>): Pick<Session['demoState'], 'currentRole' | 'currentSite' | 'currentLane'>;
  sites(pack: ProductPack, session: Session): string[];
  operations: Partial<Record<Command['type'], (args: Command['args'], session: Session) => Invocation[]>>;
  handlers: Record<string, (context: ActionContext) => void>;
  validate(pack: ProductPack, state: ProductState): void;
  present(pack: ProductPack, session: Session, events: Event[]): DemoPresentation;
  controls(pack: ProductPack, session: Session): Control[];
  narrative?(pack: ProductPack, session: Session): string;
}

export class RuleViolation extends Error {}
