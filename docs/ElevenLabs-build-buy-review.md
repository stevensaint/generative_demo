# ElevenLabs build/buy gut-check

Reviewed 2026-10-02 after P4 PASS. Assessment/recommendation only; no frozen
boundary changes, ElevenLabs integration or later-phase implementation.

ElevenAgents supplies speech recognition/synthesis, turn-taking and interruptions,
model orchestration, text-only chat, API tools, knowledge-base retrieval, workflows,
and conversation evaluation. It is more than a speech API. There is overlap with
P4's provider and conversational layer; avoid expanding these into another general
conversation platform.

| Concern | Build/buy direction |
| --- | --- |
| Speech, audio transport, conversation timing | Prefer ElevenLabs capabilities; no bespoke stack unless a demonstrated requirement forces it |
| General model/conversation orchestration | Choose one reasoning path; avoid ElevenLabs planning followed by a second independent GDE planner |
| Demo Twin, Product Pack, Controller and State Engine | Keep GDE canonical authority, workflow guards, isolation and atomic action validation |
| Customer Model and memory | Keep GDE's required provenance/corrections and bounded context authority |
| Retrieval vs approved claims | Provider retrieval can be reused; approved claims/provenance and response authorization remain explicit GDE requirements |

Recommendation for the authorized voice phase: first test a minimal adapter to
ElevenLabs' supported custom-LLM interface with the existing single GDE Agent.
ElevenLabs can own voice timing/transport while GDE produces authorized output.
The current /turns API is not itself an OpenAI-compatible custom-LLM endpoint;
an adapter would be required and has not been implemented. Check current-turn
context, structured proposals, pause/cancellation, post-commit narration and
latency before selecting the integration. An ElevenLabs-managed model/tool path
is an alternative, but must demonstrate the same GDE boundaries before replacing
P4 reasoning. Do not implement both paths in V0.

P4 was explicitly authorized and proves the provider-independent deterministic
boundary through text. It contains no speech/voice infrastructure. Keep its
reasoning/provider layer small and replaceable. Do not add a separate planner,
generic workflow editor, transcript store, vector database or bespoke speech
pipeline without approved phase requirements. This review does not start P5.

User preference: avoid further manual Terminal work. Use existing tools and the
running ordinary-Terminal backend for routine validation. If an environment
restriction forces user action, explain the concrete blocker and minimize steps;
do not promise unattended external-provider validation while sandbox DNS is blocked.

Primary documentation verified:
- https://elevenlabs.io/docs/eleven-agents/overview
- https://elevenlabs.io/docs/eleven-agents/guides/chat-mode
- https://elevenlabs.io/docs/eleven-agents/customization/tools/webhook-tools
- https://elevenlabs.io/docs/eleven-agents/customization/llm/custom-llm

These are capability evidence, not proof that a particular integration already
satisfies the frozen GDE contract. The recommendations above are architectural
inferences to be validated in the authorized voice phase.

## User-confirmed direction — 2026-10-02

The user confirmed that ElevenLabs should own all voice handling, including speech
start/stop, continuation, silence/gaps, interruption detection and turn timing.
Keep a nimble GDE codebase containing the required system components, responding
naturally to the underlying model through bounded context and validated proposals.
Do not build a custom voice scheduler, silence detector, audio pause/resume layer
or second conversational planner. Prefer a thin provider adapter when the voice
phase is authorized; verify which ElevenLabs interfaces satisfy those needs.

Interpret audio stop/continue as provider voice-turn behavior. Explicit demo/session
requests (for example ending the demo), action cancellation and stale-result
protection remain deterministic GDE responsibilities required by the supplied P4
scope. They do not introduce an audio timing engine. Preserve P4 PASS behavior;
no code removal or later-phase implementation is authorized by this clarification.

Maintain one reasoning path, small replaceable provider adapters and clear core
components. Avoid adding generic services, abstractions or infrastructure merely
for possible future needs. Natural model interpretation requests semantic actions;
the Controller validates them and State Engine retains authority.
