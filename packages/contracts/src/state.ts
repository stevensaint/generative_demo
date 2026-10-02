import { z } from 'zod';
import { NavigationTargetSchema } from './presentation.js';
export const ScalarSchema = z.union([z.string().max(2000), z.number().finite(), z.boolean(), z.null()]);
export const EntitySchema = z.object({ id: z.string().min(1), entityType: z.string().min(1), state: z.string().min(1), values: z.record(ScalarSchema) }).strict();
export const ProductStateSchema = z.object({ records: z.array(EntitySchema) }).strict();
export const CommandTypeSchema = z.enum([
  'NAVIGATE', 'OPEN_RECORD', 'RETURN', 'SHOW', 'HIGHLIGHT', 'FILTER', 'SET_PARAMETER',
  'SWITCH_ROLE', 'SWITCH_SITE', 'SET_LANE', 'START_TEST', 'ENTER_RESULT', 'SUBMIT_TEST',
  'TRIGGER_EXCEPTION', 'OPEN_EXCEPTION', 'SUBMIT_FOR_REVIEW', 'RESOLVE_EXCEPTION',
  'APPROVE', 'SHOW_AUDIT_HISTORY', 'RESET',
]);
export const CommandSchema = z.object({ type: CommandTypeSchema, expectedRevision: z.number().int().nonnegative(), args: z.record(ScalarSchema) }).strict();
export const ContextSchema = z.object({
  currentLane: z.string().nullable(), currentRole: z.string().nullable(), currentSite: z.string().nullable(),
  currentScreen: z.string().min(1), selectedRecordId: z.string().nullable(),
  history: z.array(NavigationTargetSchema).max(32), filters: z.record(z.string().max(100)),
  highlights: z.array(z.string().max(100)).max(20), parameters: z.record(z.union([z.string(), z.number().finite()])),
}).strict();
export type Entity = z.infer<typeof EntitySchema>;
export type ProductState = z.infer<typeof ProductStateSchema>;
export type Command = z.infer<typeof CommandSchema>;
