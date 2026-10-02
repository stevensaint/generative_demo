# P4 Text GDE Agent implementation

Authoritative scope: [user-supplied frozen P4](architecture/P4-frozen.md).
P4 is text demo control only. P5 governed product knowledge/claims and voice
remain absent. No separate Demo Planner or Fast Router service exists.

## Authority and flow

Customer text → GDEAgent → runtime-validated DemoTurnProposal → DemoTurnExecutor
→ DemoController → StateEngine → canonical workspace → bounded text response.
ModelProvider abstracts inference. ClaudeProvider uses the Messages API with
JSON structured output, a fixed Anthropic endpoint, server-only credentials,
4096 output tokens, 45-second timeout and a 256 KiB response cap. It requests
no tools, computer access, hidden thinking, or provider-side conversation memory.
Every response is validated locally; refusal, truncation, invalid JSON or schema
violation commits no canonical state. No raw provider exception/body is logged.

The proposal has six required fields: understanding, customerModelUpdates,
requestedActions, narrationIntent, questionHandling and nextStep. Strict schemas
bound lengths/counts, reject extra fields and duplicate argument names, and
validate status/confidence. Actions contain a semantic type and name/value
arguments; unknown types reach the Controller and return CAPABILITY_NOT_AVAILABLE.
The provider's JSON shape deliberately omits API-unsupported length/range
constraints; the runtime Zod schema enforces them after inference.

The Agent owns intent and planning within one component. Its prompt states the
frozen priority ordering and available semantic contracts. It proposes up to
six actions. The Controller applies the whole batch to a detached candidate,
using the existing Pack handlers and StateEngine for each domain operation.
Projection, Customer Model and conversation validation precede a single
revision-checked commit. Invalid later actions roll back earlier actions and
all memory changes. Manual actions while inference runs make its stale proposal
reject instead of overwriting the new state.

## Memory and provenance

GDE's process-local store owns CustomerModel, ConversationState and turn records.
Customer updates carry field/key/value, explicit/inferred/correction status,
confidence and an exact evidence quote from the current customer input. The
server stamps the source turn ID and sequence. Explicit/correction values must
appear in the quote; inference confidence is capped at 0.7. Updates cannot use
unquoted demo assumptions or overwrite explicit entries with inference.
Corrections deactivate the prior same-field/key entry, retain it, and record
supersession; inferred statements remain visibly inferred rather than facts.

ContextBuilder includes the current text, up to 12 active Customer Model entries,
current DemoState with three navigation-history targets, up to 12 related
record summaries with limited values, current lane/policy, relevant targets,
controls, role/site/parameter choices, four recent exchanges and five outstanding
questions. Serialized context is capped at 24,000 UTF-8 bytes. It excludes Pack
truth/approved Q&A, full ProductState, full transcripts/events, tokens and session
identity. Oversized context fails safely rather than dumping more state.

Canonical ConversationState keeps six recent completed exchanges, pause state,
turn sequence and at most 50 captured questions. Turns are stored separately;
reads expose the latest 50, including rejected/failed turns. Snapshot responses
carry current state, not full event or turn history. All memory remains
process-local; restart loses it. There is no persistence or external memory service.

## P4 product-question boundary and narration

P4 never releases a free-form model answer. NarrationIntent selects predefined
clarification, acknowledgment, lifecycle or state-derived Pack narration.
The Acme runtime supplies concise fictional workflow explanations. Only committed
state determines the final narration. Model understanding summaries and action
requests are inspectable operational data, not customer-facing product answers.

A conservative factual-question rule inside GDEAgent captures questions about
integrations, compliance, licensing, roadmap, security, pricing, capabilities,
implementation and other factual questions. It may over-capture rather than
assert unsupported facts. It returns the predefined safe response and preserves
the exact question. These locally governed turns are labeled local-policy, not
Claude output. If Claude also flags a non-preclassified question, the same
bounded capture policy applies; it cannot supply an answer from model memory.
Existing P2 Pack truth definitions remain authored data; P4 adds no retrieval,
Claim Guard, governed Q&A execution or substantive product knowledge system.

Exact Stop/Pause and End phrases are interpreted locally within GDEAgent for
immediate lifecycle control, labeled local-control. They cancel a pending turn;
a late reply cannot commit. The Controller still commits pause/end memory and
lifecycle state. Other turns are one-shot: no autonomous continuation loop.
A model cannot end or pause the session without the matching explicit request.
Manual controls remain available when inference is unavailable.

## Inspectability and API

POST `/api/sessions/:id/turns` requires the session token and strict JSON:

```json
{"text":"Show me QA.","expectedRevision":0}
```

Text length is at most 2000 characters; the existing 4096-byte HTTP body limit
also applies. Responses include canonical session/workspace/events and chat
metadata/turn records. Ordinary concurrent text turns return TURN_BUSY; stale
or ended requests reject before inference. Pause/End can interrupt a pending
turn. Auth validation occurs before reading input or calling the provider.

CUSTOMER_SPOKE, INTENT_DETECTED, CUSTOMER_MODEL_UPDATED and DEMO_TURN_CREATED
reference turn IDs. Requested/approved/rejected action events also reference the
turn. Existing lifecycle/command/error behavior remains intact. Events do not
copy raw text, input values or credentials. Turn records intentionally contain
customer text, validated interpretation/updates, action decisions, narration
intent, response, revisions, resulting context and changed synthetic records.
They contain no hidden chain-of-thought or raw malformed model response.
Customer text and operational turn records are escaped by React.

The chat panel offers text input, Pause/End, refresh-restored conversation,
captured questions, active Customer Model provenance and structured turn effects.
No AI is allowed to manipulate DOM/pixels/state directly.

## Claude setup and live rehearsal

In ignored `.env`, set ANTHROPIC_API_KEY and optionally GDE_CLAUDE_MODEL
(default claude-sonnet-4-6). Restart the backend after changing the key.
No secret goes in a VITE_ variable. P0–P3 manual demo remains runnable without
credentials. There is no production fake/deterministic chat provider; injected
fixtures exist only in tests.

From an ordinary local Terminal with outbound Claude API access:

```sh
npm run validate:agent:live
```

The script builds the backend, starts an independent ephemeral loopback HTTP
server, uses real Claude, exercises representative redirections and the pH
workflow (including rejected unresolved approval), verifies read restoration,
question capture and Stop/End, then writes P4-live-evidence.json. It does not
change the running port-3001 demo or print credentials. A failure stops the
rehearsal and leaves the exact prior turn evidence for debugging. Do not mark
P4 PASS until this evidence and an interactive live browser rehearsal pass.

Vendor API shape checked 2026-10-02 against primary documentation:
<https://platform.claude.com/docs/en/build-with-claude/structured-outputs>.
The runtime schema and tests remain the local authority for allowed proposals.
