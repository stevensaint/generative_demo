# GDE repository handoff

Updated: 2026-10-03. Resume here without the originating chat.

## Checkpoint and transfer

Local repo: `/Users/stevenst.germain/Documents/Codex/2026-10-02/new-chat/gde`.
Remote: <https://github.com/stevensaint/generative_demo>.
Current branch: **p5-governed-knowledge**. P5 is committed and pushed at **0f44c11** on p5-governed-knowledge. GitHub includes the validated P5 implementation and evidence.

P4 is committed and pushed at **9314fae** on p4-text-agent, with all 13 gates recorded PASS, real Claude HTTP evidence (31 turns/28 calls) and live browser rehearsal. P3 implementation is pushed at 7ff7ef6 with docs 356db83. P2 df24449 is in ancestry; P1 2029f29; P0 main a66512b.

Copy the whole local gde folder including source, docs, lockfile and Git metadata to transfer P5. Generated node_modules/dist/.test-dist may be omitted. Keep credentials private; configure an ignored .env on the destination. Never commit API keys. Session data is process-local; transfer does not migrate active sessions.

## Read first

1. [README](README.md) for execution and manual workflow.
2. [Frozen P5](docs/architecture/P5-frozen.md) and [P5 validation](docs/P5-validation.md).
3. [P5 engine](docs/P5-engine.md) for authority, retrieval, Guard and limitations.
4. [P4 engine](docs/P4-engine.md), [P4 validation](docs/P4-validation.md), [P3 engine](docs/P3-engine.md) and [P2 Pack authoring](docs/P2-product-pack.md) for the baseline.
5. [Documentation index](docs/README.md) for all evidence.

## Actual P5 status

68 automated tests, 12 real TCP API tests, 50 knowledge evaluation cases across four groups, strict TypeScript, builds, Pack validation and configuration/startup checks PASS. Built browser fixture acceptance covers qualified Q&A, synthesis, safe escalation, ambiguity, question status, refresh and End. No console warnings/errors were captured.

**P5 PASS recorded.** The user’s local real-provider acceptance passed all 51 turns: 20 approved answers, one synthesis, 22 escalations and eight clarifications. Twenty-one substantive questions used real Claude; local policy handled denials/unclear input. Independent inspection confirmed approved phrase/reference/qualification matches and no unsupported claims in the bank. docs/P5-live-evidence.json is the successful report; earlier blocked attempts remain historical. Built fixture browser checks separately prove the UI; no P5 live-provider browser rehearsal is claimed.

All 40 facts have distinct full/brief/conversational variants. Finite approved phrase selection/order is the reviewed minimal P5 approach; unrestricted model-written paraphrases remain outside its guarantees. Keep the question bank focused on observed failures and safety boundaries, rather than an exhaustive semantic catalog. Later approved datasets can enrich the corpus.

The supplied P5 source is saved verbatim. Original full numbered Architecture V0.1 remains absent; P0–P3 records qualify recovered criteria. P4/P5 scopes are available. Do not invent missing requirements. Stop before P6.

## Boundaries and map

The AI requests. The Controller validates. The State Engine makes it true. GDE owns memory; the model receives bounded context. Product Model controls what can be shown; Product Truth controls what can be said.

- packages/contracts/src/knowledge.ts: facts, families, answer plans, Questions and traces.
- packages/knowledge: KnowledgeProvider seam, conservative LocalKnowledgeProvider and fail-closed ClaimGuard.
- packages/agent: one ModelProvider/ClaudeProvider/GDEAgent; ContextBuilder passes narrow evidence; PromptBuilder and proposal-format define structured claims. No UI/state tools or separate planner.
- packages/engine: atomic semantic Controller and State Engine; DemoTurnExecutor integrates Guard/questions/events. SessionView Questions remain separate operational records so invalid proposals preserve questions without changing product reality.
- packages/product-packs/acme: Pack 0.5.0, knowledge/Policy 1.0.0; 40 authored facts, 24 families, two bounded synthesis bundles and screen narration mappings. No production vendor claims.
- apps/server: existing authenticated HTTP adapters and dependency composition; keys server-only.
- apps/web: generic acknowledged-state renderer, text chat and developer traces; no Pack semantics or mutation authority.
- tests/fixtures/p5-qa-bank.json: 20 normal, 10 ambiguous, 10 boundary, 10 named Make GDE Lie cases. Observed failure → permanent fixture.
- scripts/test-knowledge-live.mjs: real Claude rehearsal and credential-free evidence; tests/knowledge-browser.mjs is explicitly fixture-only.

Keep customer provenance/corrections intact. No model/customer/demo/UI statement becomes Product Truth. Do not store chain-of-thought. Unsupported specifics, conflicts or insufficient evidence escalate. Runtime semantic actions still pass through Controller → State Engine → events.

## Verify after transfer

Requires Node 22.12+:

```sh
npm ci
npm run check
npm run test:http
npm run validate:knowledge
npm run validate:pack
node scripts/test-pack-runtime.mjs
npm run validate:knowledge:live
npm start
```

The live check needs authorized outbound Anthropic access and a private configured key. Inspect results, fix actual failures and preserve regression evidence. P5 PASS is already recorded; browser live-provider rehearsal is optional additional experience testing. A previously running P4 backend must restart normally to load P5; new dist files alone do not update loaded server modules. Do not bypass denied outbound access through another runtime/browser or automate Terminal if denied.

The user prefers no further manual Terminal work. Use available authorized tools first and explain concrete blockers. ElevenLabs owns all future voice/timing/interruptions/silence/continuation; keep GDE nimble with thin adapters and one reasoning path. See [user-confirmed build/buy review](docs/ElevenLabs-build-buy-review.md). No P6, voice implementation, database, vector service, ingestion, admin console, real integrations or proprietary materials are authorized by P5.

Suggested future coding instruction:

> Read CLAUDE.md, HANDOFF.md and frozen P5/validation. Preserve the pushed P4 baseline and local P5 changes. Preserve P5 PASS evidence and its bounded phrasing limitations. Do not treat fixture inference as Claude proof. Maintain documentation and stop before P6.

## Final phrasing refinement and live retry

All 40 facts now have distinct reviewed full, brief and conversational variants. Claude can choose concise wording and fact order within the same approved semantic envelope; required qualifications are still appended by the Guard. This improves naturalization without permitting unrestricted prose or adding a second model. The structural limit remains explicit. The final corpus passed 68 tests, 12 real TCP tests, builds, Pack validation and startup checks.

The sandbox retry remained blocked; the user’s local run then passed all 51 turns. P5 PASS is recorded. No provider restrictions were bypassed and no P6 work was started.

## P6 source retrieval

The user authorized retrieving and pinging the “Noodle – Generative Demo” conversation for frozen P6 and later phases. Thread-list connector calls failed twice, so no verified thread ID or content was obtained and no message was sent. Native ChatGPT/Codex app control was denied. Frozen P6 remains unavailable locally; do not infer its full scope from its title. Request the exact source or retry the authorized connector when it works. No P6 implementation began.
