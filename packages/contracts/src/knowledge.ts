import { z } from 'zod';
const Id = z.string().min(1).max(100), Text = z.string().trim().min(1).max(1000);
export const AnswerModeSchema = z.enum(['APPROVED_QA', 'EVIDENCE_SYNTHESIS', 'ESCALATION']);
export const QuestionClassificationSchema = z.enum(['DEMO_NAVIGATION', 'APPROVED_PRODUCT_QUESTION', 'CUSTOMER_SPECIFIC_IMPLEMENTATION', 'LICENSING_COMMERCIAL', 'ROADMAP_FUTURE', 'UNSUPPORTED_PRODUCT_QUESTION', 'UNCLEAR']);
export const PhraseStyleSchema = z.enum(['full', 'brief', 'conversational']);
export const ProductFactSchema = z.object({
  id: Id, statement: Text, category: z.enum(['Capability', 'Behavior', 'Supported workflow', 'Role behavior', 'Relationship', 'Integration concept', 'Limitation', 'Terminology', 'Current availability']),
  status: z.enum(['available', 'defined-only', 'withdrawn', 'superseded']), version: Id,
  effectiveDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(), supersededBy: Id.optional(), conflictsWith: z.array(Id).default([]),
  claimKey: Id, claimValue: Text, evidenceIds: z.array(Id).min(1),
  phrases: z.object({ full: Text, brief: Text, conversational: Text }).strict(),
  requiredQualification: Text, doNotClaim: z.array(Text).min(1),
}).strict();
const Match = z.array(z.array(z.string().trim().min(1).max(100)).min(1)).min(1).max(8);
export const QuestionFamilySchema = z.object({ id: Id, intent: Text, examples: z.array(Text).min(2), match: Match,
  factRefs: z.array(Id).min(1).max(6), answerGuidance: Text, requiredQualification: Text, doNotClaim: z.array(Text).min(1),
}).strict();
export const GovernedKnowledgeSchema = z.object({
  families: z.array(QuestionFamilySchema).max(30),
  synthesis: z.array(z.object({ id: Id, match: Match, factRefs: z.array(Id).min(2).max(6), requiredQualification: Text, doNotClaim: z.array(Text).min(1) }).strict()).max(12),
  narratives: z.array(z.object({ screenPrefix: Id, factRefs: z.array(Id).min(1).max(3), maxFacts: z.number().int().min(1).max(3) }).strict()).max(16),
}).strict();
export const AnswerPlanSchema = z.object({ mode: AnswerModeSchema,
  familyId: Id.nullable(), knowledgeVersion: Id, claims: z.array(z.object({ factId: Id, style: PhraseStyleSchema }).strict()).max(6),
}).strict();
export const QuestionSchema = z.object({ id: z.string().uuid(), sessionId: z.string().uuid(), participantId: z.literal('customer'), turnId: z.string().uuid(),
  text: z.string().trim().min(1).max(2000), classification: QuestionClassificationSchema, status: z.enum(['ANSWERED', 'ESCALATED', 'UNRESOLVED']),
  answerMode: AnswerModeSchema.nullable(), knowledgeRefs: z.array(Id).max(6), familyId: Id.nullable(), knowledgeVersion: Id,
  answer: Text.nullable(), escalationReason: Id.nullable(), timestamp: z.string().datetime(),
}).strict();
export const KnowledgeTraceSchema = z.object({ knowledgeVersion: Id, questionId: z.string().uuid().nullable(), classification: QuestionClassificationSchema,
  answerMode: AnswerModeSchema.nullable(), knowledgeRefs: z.array(Id).max(6), familyId: Id.nullable(), escalationReason: Id.nullable(),
}).strict();
export type ProductFact = z.infer<typeof ProductFactSchema>;
export type QuestionFamily = z.infer<typeof QuestionFamilySchema>;
export type AnswerPlan = z.infer<typeof AnswerPlanSchema>;
export type Question = z.infer<typeof QuestionSchema>;
export type KnowledgeTrace = z.infer<typeof KnowledgeTraceSchema>;
export type QuestionClassification = z.infer<typeof QuestionClassificationSchema>;
