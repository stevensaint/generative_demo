import { z } from 'zod';

// P0 operational contracts. These do not define product objects or behavior.
export const EventTypeSchema = z.enum(['SESSION_STARTED', 'SESSION_ENDED', 'ERROR_OCCURRED']);
export const ErrorCodeSchema = z.enum([
  'INVALID_REQUEST', 'SESSION_NOT_FOUND', 'UNAUTHORIZED', 'NOT_FOUND', 'INTERNAL_ERROR',
]);
export const EventSchema = z.object({
  eventId: z.string().uuid(), sessionId: z.string().uuid().nullable(),
  type: EventTypeSchema, sequence: z.number().int().positive(), timestamp: z.string().datetime(),
  errorCode: ErrorCodeSchema.optional(),
}).strict();
export const DemoStateSchema = z.object({
  currentLane: z.string().nullable(), currentRole: z.string().nullable(),
  currentSite: z.string().nullable(), currentScreen: z.literal('shell'),
}).strict();
export const SessionSchema = z.object({
  sessionId: z.string().uuid(), status: z.enum(['active', 'ended']),
  startedAt: z.string().datetime(), endedAt: z.string().datetime().nullable(),
  productPackId: z.string(), demoState: DemoStateSchema,
}).strict();
export const SessionViewSchema = z.object({ session: SessionSchema, events: z.array(EventSchema) }).strict();
export const CreatedSessionSchema = SessionViewSchema.extend({ accessToken: z.string().uuid() });
export const ProductPresentationSchema = z.object({
  packId: z.string(), name: z.string(), description: z.string(), fictional: z.literal(true),
}).strict();
export const HealthSchema = z.object({ status: z.literal('ok'), phase: z.literal('P0') }).strict();
export const ApiErrorSchema = z.object({
  error: z.object({ code: ErrorCodeSchema, message: z.string(), eventId: z.string().uuid() }).strict(),
}).strict();
export type Event = z.infer<typeof EventSchema>;
export type ErrorCode = z.infer<typeof ErrorCodeSchema>;
export type Session = z.infer<typeof SessionSchema>;
export type SessionView = z.infer<typeof SessionViewSchema>;
export type ProductPresentation = z.infer<typeof ProductPresentationSchema>;
