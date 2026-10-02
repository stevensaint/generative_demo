# GDE repository handoff

Updated: 2026-10-02. Resume here without needing the originating chat.

## Location and transfer

Local repository: `/Users/stevenst.germain/Documents/Codex/2026-10-02/new-chat/gde`.
Remote: <https://github.com/stevensaint/generative_demo>.
Current branch: **p4-text-agent**. P4 is local and uncommitted/unpushed; preserve
all working-tree changes. A GitHub clone alone does not yet include P4.

P3 implementation is committed and pushed at `7ff7ef6` on
`p3-deterministic-demo-engine`; documentation checkpoint is `356db83`.
P0 main checkpoint: `a66512b`. P1: `2029f29` on p1-demo-twin. P2: `df24449`,
included in P3 ancestry. P0–P3 PASS records are historical recovered criteria.

To transfer current P4, copy the whole local `gde` directory including source,
`docs`, lockfile and Git metadata, preserving uncommitted changes. Omit generated
node_modules/dist/.test-dist if desired. Keep personal `.env` credentials private;
configure a new ignored `.env` on the destination. Evidence is saved under docs.

## Read in this order

1. [README](README.md): running the app, manual workflow and validation.
2. [Frozen P4 scope](docs/architecture/P4-frozen.md): user-supplied authority.
3. [P4 validation](docs/P4-validation.md): all 13 gates and live blocker.
4. [P4 engine](docs/P4-engine.md): context, provider, orchestration and safety.
5. [P3 engine](docs/P3-engine.md), [P3 validation](docs/P3-validation.md) and
   [P2 Pack authoring](docs/P2-product-pack.md): deterministic baseline.
6. [Documentation index](docs/README.md): phase evidence.

## Current status

P4 implementation and automated validation are complete: **53/53 tests**,
**11/11 real TCP API tests**, strict TypeScript, production builds, Pack validation
and alternate configuration/invalid startup checks pass. Browser verification
covers safe provider failure, substantive-question capture, refresh, Pause, End
and manual navigation. Tests use fixture inference where indicated.

**P4 PASS recorded.** Real Claude HTTP acceptance passed: 31 turns, 28 real
Claude calls, complete guarded pH workflow, harmless premature approval rejection,
provenance-preserving correction, safe question capture, Pause and End. Live browser
acceptance also passed against the ordinary-Terminal backend: natural navigation,
start-test state coherence, safe question capture, refresh restoration, Pause,
End and disabled ended controls. No browser console warnings/errors were recorded.
Evidence is saved in docs/P4-live-evidence.json and docs/P4-live-browser-evidence.txt,
with visually inspected screenshot docs/P4-live-browser-ended.jpg. All 13 frozen
gates are satisfied; see the validation matrix. P4 is staged, uncommitted/unpushed.

The execution sandbox’s provider restriction persists, but the user’s ordinary
Terminal successfully ran the live checks and currently hosts the app. The
initial overly strict filter test was corrected to assert matching record IDs;
its report is retained as P4-live-attempt-01.json. No P5 work was performed.

The full original numbered Architecture V0.1 document is absent. P1–P3 criteria
were recovered and their records qualify that limitation. P4 scope is now supplied
and saved; it is no longer missing. Do not invent missing frozen requirements.
P5 and later have not started and are outside current authorization.

## Boundaries and implementation map

The AI requests. The Controller validates. The State Engine makes it true.
GDE owns memory; the model receives bounded current-turn context.

- packages/contracts: generic strict state, commands/events, Product Pack,
  presentation, CustomerModel and DemoTurnProposal schemas (`src/turns.ts`).
- packages/agent: ModelProvider, server-side ClaudeProvider, ContextBuilder,
  PromptBuilder and single GDEAgent; no tools or state/UI authority.
- packages/engine/src/demo-turns.ts: per-session orchestration, cancellations,
  grounded memory, bounded narration, question capture and inspectable turns.
- packages/engine/src/controller.ts and state-engine.ts: deterministic semantic
  validation, detached candidate transactions, guards and atomic commits.
- packages/engine/src/sessions.ts: process-local canonical sessions/events/turns.
- packages/product-packs/acme: fictional objects, workflow rules, role/site/lanes,
  bounded parameters, state-derived presentation and predefined P4 narration.
- apps/server: token authorization and dependency composition. No arbitrary state
  uploads; provider credentials remain server-only.
- apps/web: generic acknowledged-state renderer and customer chat; no Pack imports,
  domain rules, pixel/DOM execution or canonical mutation authority.
- scripts/test-agent-live.mjs: real Claude HTTP rehearsal and saved evidence.

Keep Acme semantics in the Pack. No Veeva IP, proprietary materials, voice,
ElevenLabs, separate planner, database or unnecessary infrastructure. Claude API
integration is authorized only for P4 conversational demo control. Product Q&A
must not come from model memory: use predefined bounded narration or safe capture.
Do not record hidden model chain-of-thought. Preserve provenance/confidence and
customer corrections over prior inference. Malformed/unsupported actions must
leave canonical state intact.

## Verify P4 on another computer

Requires Node 22.12+; from the repository root:

```sh
npm ci
npm run check
npm run test:http
npm run validate:pack
node scripts/test-pack-runtime.mjs
npm run validate:agent:live
npm start
```

Run the live command in the user's ordinary Mac Terminal with `.env` configured;
it records credential-free turn evidence. Inspect results, fix actual failures,
and rehearse natural-language text in a browser backed by that Terminal process
at <http://127.0.0.1:3001>. Resolve any port conflict with the earlier local server.
P4 PASS is recorded for this checkpoint. Rerun checks after transfer to verify
the new environment; stop before P5 unless the user supplies and authorizes it.

Sessions/tokens are in memory: restart invalidates them. Snapshots are current
state, not persistence or an arbitrary restoration bypass. Demo roles/sites are
synthetic context. The workflow executes pH only; conductivity remains inactive,
and root cause is never inferred. CustomerModel and ConversationState now hold
conversation-derived data; refresh restores the tab's authorized session view.

Suggested instruction for a future Claude coding session:

> Read CLAUDE.md, HANDOFF.md and the frozen P4 scope/validation. Preserve local
> P4 changes and the deterministic baseline. Verify the recorded P4 PASS and
> preserve its evidence. Stop before P5 until its scope is supplied and authorized.
> Do not infer live model behavior from fixture-provider tests alone.

## Provider reuse and operator preference

See [ElevenLabs build/buy review](docs/ElevenLabs-build-buy-review.md). Preserve
the single GDE Agent and deterministic authority; prefer provider voice/timing
capabilities and avoid duplicate reasoning loops or generic infrastructure. The
user prefers no further manual Terminal work; use available tools and the running
backend, explaining any concrete environment blocker before requesting action.

The user confirmed ElevenLabs should own all voice timing/interruptions/silence
and continuation. Keep GDE nimble with one model reasoning path and thin adapters;
retain deterministic semantic actions, session lifecycle and stale-result guards.
Do not implement audio timing/scheduling inside GDE. See the user-confirmed section
of the build/buy review. P4 behavior and frozen boundaries remain intact.
