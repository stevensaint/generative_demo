import { z } from 'zod';
import { ScalarSchema, EntitySchema } from './state.js';
const Text = z.string().trim().min(1);
const Field = z.enum(['responsibility', 'problem', 'goal', 'interest', 'terminology', 'fact']);
export const CustomerUpdateSchema = z.object({ field: Field, key: Text.max(80), value: Text.max(300),
  status: z.enum(['explicit', 'inferred', 'correction']), confidence: z.number().min(0).max(1), evidenceQuote: Text.max(500),
}).strict();
export const CustomerModelSchema = z.object({ entries: z.array(z.object({
  id: z.string().uuid(), field: Field, key: Text.max(80), value: Text.max(300), status: z.enum(['explicit', 'inferred']), confidence: z.number().min(0).max(1), active: z.boolean(), supersedesId: z.string().uuid().nullable(),
  provenance: z.object({ turnId: z.string().uuid(), sequence: z.number().int().positive(), source: z.literal('customer-text'), kind: z.enum(['statement', 'inference', 'correction']), quote: Text.max(500) }).strict(),
}).strict()).max(100) }).strict();
export const ConversationStateSchema = z.object({ sequence: z.number().int().nonnegative(), paused: z.boolean(),
  recent: z.array(z.object({ turnId: z.string().uuid(), customer: Text.max(2000), response: Text.max(1000) }).strict()).max(6),
  outstandingQuestions: z.array(z.object({ id: z.string().uuid(), turnId: z.string().uuid(), text: Text.max(2000), status: z.literal('captured') }).strict()).max(50),
}).strict();
export const RequestedActionSchema = z.object({ type: Text.max(100), args: z.array(z.object({ name: Text.max(100), value: ScalarSchema }).strict()).max(12) }).strict().superRefine((action, ctx) => {
  if (new Set(action.args.map(arg => arg.name)).size !== action.args.length) ctx.addIssue({ code: 'custom', message: 'Duplicate arguments.' });
});
export const DemoTurnProposalSchema = z.object({
  understanding: z.object({ intent: z.enum(['navigate', 'execute', 'configure', 'customer_update', 'clarify', 'question', 'stop', 'end', 'continue']), summary: Text.max(300), confidence: z.number().min(0).max(1) }).strict(),
  customerModelUpdates: z.array(CustomerUpdateSchema).max(6), requestedActions: z.array(RequestedActionSchema).max(6),
  narrationIntent: z.enum(['current_view', 'after_action', 'acknowledge_interest', 'clarify_role', 'clarify_site', 'clarify_record', 'clarify_action', 'clarify_setting', 'none']),
  questionHandling: z.enum(['none', 'capture']), nextStep: z.enum(['listen', 'clarify', 'pause', 'end']),
}).strict();
export const TextTurnRequestSchema = z.object({ text: Text.max(2000), expectedRevision: z.number().int().nonnegative() }).strict();
export const TurnRecordSchema = z.object({
  turnId: z.string().uuid(), sequence: z.number().int().positive(), timestamp: z.string().datetime(), customerText: Text.max(2000),
  provider: z.string(), model: z.string(), status: z.enum(['completed', 'rejected', 'failed', 'cancelled']),
  proposal: DemoTurnProposalSchema.nullable(), response: Text.max(1000),
  actions: z.array(z.object({ type: z.string(), status: z.enum(['approved', 'rejected']), code: z.string().nullable() }).strict()),
  customerChanges: z.array(CustomerUpdateSchema), questionIds: z.array(z.string().uuid()),
  beforeRevision: z.number().int().nonnegative(), afterRevision: z.number().int().nonnegative(),
  resultingContext: z.object({ screen: z.string(), recordId: z.string().nullable(), role: z.string().nullable(), site: z.string().nullable(), lifecycle: z.enum(['active', 'ended']) }).strict(),
  errorCode: z.string().nullable(),
  providerHttpStatus: z.number().int().nullable().optional(),
  productChanges: z.array(z.object({ recordId: z.string(), beforeState: z.string().nullable(), after: EntitySchema.nullable() }).strict()),
}).strict();
export type DemoTurnProposal = z.infer<typeof DemoTurnProposalSchema>;
export type RequestedAction = z.infer<typeof RequestedActionSchema>;
export type CustomerModel = z.infer<typeof CustomerModelSchema>;
export type ConversationState = z.infer<typeof ConversationStateSchema>;
export type TurnRecord = z.infer<typeof TurnRecordSchema>;
