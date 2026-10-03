// Portable strict JSON shape for Claude structured outputs. Runtime Zod validation
// additionally enforces lengths, counts, confidence ranges and duplicate keys.
const str = { type: 'string' }, num = { type: 'number' };
const en = (...values: string[]) => ({ type: 'string', enum: values });
const arr = (items: unknown) => ({ type: 'array', items });
const obj = (properties: Record<string, unknown>) => ({ type: 'object', properties, required: Object.keys(properties), additionalProperties: false });
export const proposalFormat = obj({
  understanding: obj({ intent: en('navigate', 'execute', 'configure', 'customer_update', 'clarify', 'question', 'stop', 'end', 'continue'), summary: str, confidence: num }),
  customerModelUpdates: arr(obj({ field: en('responsibility', 'problem', 'goal', 'interest', 'terminology', 'fact'), key: str, value: str, status: en('explicit', 'inferred', 'correction'), confidence: num, evidenceQuote: str })),
  requestedActions: arr(obj({ type: str, args: arr(obj({ name: str, value: { anyOf: [str, num, { type: 'boolean' }, { type: 'null' }] } })) })),
  narrationIntent: en('current_view', 'after_action', 'acknowledge_interest', 'clarify_role', 'clarify_site', 'clarify_record', 'clarify_action', 'clarify_setting', 'none'),
  answerPlan: { anyOf: [{ type: 'null' }, obj({ mode: en('APPROVED_QA','EVIDENCE_SYNTHESIS','ESCALATION'), familyId: { anyOf: [str, {type:'null'}] }, knowledgeVersion: str, claims: arr(obj({factId:str,style:en('full','brief','conversational')})) })] },
  questionHandling: en('none', 'capture'), nextStep: en('listen', 'clarify', 'pause', 'end'),
});
