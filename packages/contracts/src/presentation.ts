import { z } from 'zod';

// Data-only presentation contracts for reusable Demo Twin primitives.
const IdSchema = z.string().min(1).max(100);
const ToneSchema = z.enum(['neutral', 'success', 'attention']);
export const NavigationTargetSchema = z.object({
  screenId: IdSchema, recordId: IdSchema.nullable(),
}).strict();
const LinkSchema = z.object({ label: z.string(), target: NavigationTargetSchema }).strict();
const FieldSchema = z.object({ label: z.string(), value: z.string() }).strict();
const SectionSchema = z.object({ title: z.string(), fields: z.array(FieldSchema) }).strict();
const TableSchema = z.object({
  caption: z.string(), columns: z.array(z.object({ key: IdSchema, label: z.string() }).strict()),
  rows: z.array(z.object({
    id: IdSchema, cells: z.record(z.string()), tone: ToneSchema,
    link: LinkSchema.optional(),
  }).strict()),
}).strict();
export const ScreenSchema = z.object({
  id: IdSchema,
  kind: z.enum(['work-queue', 'record-list', 'record-detail', 'execution', 'results', 'workflow', 'review', 'audit']),
  recordId: IdSchema.nullable(), title: z.string(), subtitle: z.string(),
  badge: z.object({ label: z.string(), tone: ToneSchema }).strict(),
  sections: z.array(SectionSchema), table: TableSchema.optional(),
  notice: z.object({ title: z.string(), body: z.string(), tone: ToneSchema }).strict().optional(),
  steps: z.array(z.object({ label: z.string(), detail: z.string(), state: z.enum(['complete', 'current', 'pending']) }).strict()),
  links: z.array(LinkSchema),
}).strict();
export const DemoPresentationSchema = z.object({
  packId: IdSchema, homeScreenId: IdSchema, fixtureLabel: z.string(), fixtureDescription: z.string(),
  navigation: z.array(LinkSchema), walkthrough: z.array(LinkSchema), screens: z.array(ScreenSchema),
}).strict().superRefine((pack, ctx) => {
  const byId = new Map(pack.screens.map(screen => [screen.id, screen]));
  if (byId.size !== pack.screens.length) ctx.addIssue({ code: 'custom', message: 'Duplicate screen ID.' });
  if (byId.get(pack.homeScreenId)?.recordId !== null) ctx.addIssue({ code: 'custom', message: 'Home screen must exist without a selection.' });
  const links = [...pack.navigation, ...pack.walkthrough, ...pack.screens.flatMap(s => [...s.links, ...(s.table?.rows.flatMap(r => r.link ? [r.link] : []) ?? [])])];
  for (const link of links) {
    const screen = byId.get(link.target.screenId);
    if (!screen || screen.recordId !== link.target.recordId) ctx.addIssue({ code: 'custom', message: `Invalid presentation link: ${link.label}` });
  }
  for (const screen of pack.screens) {
    if (screen.table) {
      const { rows, columns } = screen.table;
      if (new Set(rows.map(r => r.id)).size !== rows.length || new Set(columns.map(c => c.key)).size !== columns.length) {
        ctx.addIssue({ code: 'custom', message: `Duplicate table IDs: ${screen.id}` });
      }
      if (rows.some(row => columns.some(column => row.cells[column.key] === undefined))) {
        ctx.addIssue({ code: 'custom', message: `Missing table cells: ${screen.id}` });
      }
    }
  }
});
export type NavigationTarget = z.infer<typeof NavigationTargetSchema>;
export type DemoPresentation = z.infer<typeof DemoPresentationSchema>;
export type Screen = z.infer<typeof ScreenSchema>;
