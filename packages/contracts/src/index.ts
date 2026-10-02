import { z } from 'zod';
import { ContextSchema, ProductStateSchema, CommandTypeSchema } from './state.js';
import { DemoPresentationSchema } from './presentation.js';

// P0 operational contracts. These do not define product objects or behavior.
export const EventTypeSchema = z.enum(['SESSION_STARTED', 'SESSION_ENDED', 'ERROR_OCCURRED', 'COMMAND_REQUESTED', 'COMMAND_APPROVED', 'COMMAND_REJECTED', 'STATE_CHANGED']);
export const ErrorCodeSchema = z.enum([
  'ACTION_REJECTED', 'REVISION_CONFLICT', 'INVALID_REQUEST', 'SESSION_NOT_FOUND', 'SESSION_ENDED', 'UNAUTHORIZED', 'NOT_FOUND', 'INTERNAL_ERROR',
]);
export const EventSchema = z.object({
  eventId: z.string().uuid(), sessionId: z.string().uuid().nullable(),
  type: EventTypeSchema, sequence: z.number().int().positive(), timestamp: z.string().datetime(),
  errorCode: ErrorCodeSchema.optional(),
  commandId: z.string().uuid().optional(), commandType: z.string().max(100).optional(),
  actionId: z.string().max(100).optional(), recordId: z.string().max(100).nullable().optional(), revision: z.number().int().nonnegative().optional(),
}).strict();
export const DemoStateSchema = ContextSchema;
export const SessionSchema = z.object({
  sessionId: z.string().uuid(), status: z.enum(['active', 'ended']),
  startedAt: z.string().datetime(), endedAt: z.string().datetime().nullable(),
  productPackId: z.string(), productPackVersion: z.string(), revision: z.number().int().nonnegative(),
  productState: ProductStateSchema, demoState: DemoStateSchema,
  customerModel: z.record(z.union([z.string(), z.number(), z.boolean(), z.null()])),
  conversationState: z.object({ sequence: z.number().int().nonnegative() }).strict(),
}).strict();
export const ControlSchema = z.object({ id: z.string(), label: z.string(), commandType: CommandTypeSchema,
  args: z.record(z.union([z.string(), z.number(), z.boolean(), z.null()])),
  inputs: z.array(z.object({ id: z.string(), label: z.string(), type: z.enum(['string', 'number']), default: z.union([z.string(), z.number()]).optional() }).strict()),
  enabled: z.boolean(), reason: z.string().optional(),
}).strict();
export const SessionViewSchema = z.object({ session: SessionSchema, events: z.array(EventSchema),
  workspace: z.object({ presentation: DemoPresentationSchema, controls: z.array(ControlSchema), siteIds: z.array(z.string()).optional() }).strict().optional(),
}).strict();
export const SnapshotSchema = z.object({ formatVersion: z.literal('1.0'), session: SessionSchema, lastEventSequence: z.number().int().nonnegative(), capturedAt: z.string().datetime() }).strict();
export const CreatedSessionSchema = SessionViewSchema.extend({ accessToken: z.string().uuid() });
export const ProductPresentationSchema = z.object({
  packId: z.string(), name: z.string(), description: z.string(), fictional: z.literal(true),
}).strict();
export const HealthSchema = z.object({ status: z.literal('ok'), phase: z.enum(['P0', 'P1', 'P2', 'P3']) }).strict();
export const ApiErrorSchema = z.object({
  error: z.object({ code: ErrorCodeSchema, message: z.string(), eventId: z.string().uuid() }).strict(),
}).strict();
export type Event = z.infer<typeof EventSchema>;
export type ErrorCode = z.infer<typeof ErrorCodeSchema>;
export type Session = z.infer<typeof SessionSchema>;
export type SessionView = z.infer<typeof SessionViewSchema>;
export type ProductPresentation = z.infer<typeof ProductPresentationSchema>;

export type Control = z.infer<typeof ControlSchema>;
