# P3 validation — PASS

Date: 2026-10-02. Scope: deterministic Demo Engine only. Branch:
`p3-deterministic-demo-engine`. P2 was checkpointed locally at `df24449` before
implementation. No P4 work was started. P3 changes are left commit-ready.

## Acceptance source

Recovered GDE Architecture V0.1 P3 gates: deterministic golden workflow
Sample → Test → failing Result → Exception → QA Review → Approval; valid
ProductState transitions; controller rejection of invalid actions; command/state
events; session snapshots; UI/state agreement; refresh restoration; zero AI.
Product Pack owns domain rules and presentation, generic engine/contracts own
validation and session state, DemoState is authoritative for context/navigation.

The complete original numbered 00–20 architecture source is unavailable in this
repo. This is a PASS against the recovered requirements, not a line-by-line
certification of an unavailable document. No architectural amendments are made.
Synthetic bounds and the selected pH workflow remain implementation choices.

## P3 PASS matrix

| Recovered criterion | Evidence | Result |
| --- | --- | --- |
| Deterministic golden workflow | Fresh received sample/ready test, entered 6.4 pH, completed test, below-range assessment, linked open exception, pending review, explicit QA disposition and atomic review/sample approval; unit + real TCP + final-build browser | PASS |
| Valid ProductState transitions | Generic declared transition/role/input/current/proposed guard enforcement; Pack validates references, result uniqueness, assessment/exception linkage and approval prerequisites; inclusive bounds checked | PASS |
| Controller rejects invalid actions | Wrong state/role/site, extra/wrong inputs, unknown commands, stale revision, missing measurement, unresolved exception, invalid settings, duplicate assessment and ended sessions reject; candidate rollback preserves canonical revision/state | PASS |
| Isolated sessions | Detached copies and unique tokens; unit/HTTP read/mutation/end isolation; independent browser session begins received, keeps its own filter and ends separately | PASS |
| Events | Requested → approved → state-changed on success; requested → rejected on guarded failure; HTTP error event; sequential IDs/sequences; no raw inputs/token leakage | PASS |
| Snapshots | Authorized strict detached state snapshot contains current Product/Demo/Customer/Conversation state, lifecycle/Pack/revision, tail sequence; full event history excluded; no state-upload bypass | PASS |
| UI matches state | Generic React renders server Pack projection; actual results/exception/review, form availability and live command audit; no prefilled decisions or fabricated audit records | PASS |
| Refresh restores state | Final built browser approved view identical before/after reload, including QA/Harbor, revision 14, current review, approved sample/review, completed test, below-range result and resolved exception; independent canonical filter also restored | PASS |
| Frozen boundaries / zero AI | Source import/semantic checks and dependency allowlist; trusted runtime registration only; no AI, voice, planner, router, providers, proprietary materials or infrastructure additions | PASS |
| Runnable regression | Strict TypeScript, all unit/API/rendering/boundary tests, production builds, loopback HTTP, alternate trusted JSON runtime and invalid startup rejection | PASS |

## Executed checks

- `npm run check`: **38/38 tests**, typecheck and production frontend/backend builds PASS.
- `npm run test:http`: **9/9 API tests** over real loopback TCP PASS.
- `npm run validate:pack`: version 0.3.0, deterministic policy, four lanes and bounded defaults PASS.
- `node scripts/test-pack-runtime.mjs`: built server from unrelated working directory, alternate metadata/queue JSON configuration, assets, session creation and invalid-Pack startup rejection PASS.
- `git diff --check`: PASS. No new dependencies.

Evidence logs: `P3-check-evidence.txt`, `P3-http-evidence.txt`,
`P3-pack-evidence.txt`, `P3-runtime-evidence.txt`, `P3-browser-evidence.txt`.

## Browser rehearsal

The browser connection recovered before P3. The P2 guide was inspected and
captured in `P2-browser-handoff.jpg`, closing the earlier optional visual handoff
without changing its historical validation record.

On the built P3 server at http://127.0.0.1:3001:

1. Confirmed no initial measurement, exception or review; started test and entered 6.4 pH.
2. Submitted and assessed the measurement; displayed the actual below-range result.
3. Submitted review and switched to QA. Premature approval rejected at revision 10;
   sample remained awaiting QA, exception open, rationale unrecorded.
4. Explicit disposition resolved the exception. Approval committed both review and sample.
5. Reload restored the exact approved view at revision 14 with 46 session events.
6. Independent tab began with received records at revision 0. Applied filter 1002,
   reloaded, confirmed only SMP-1002 remained displayed, and ended that session;
   the first session remained active.
7. Restarted the final built server after validation hardening. The old pointer
   was correctly discarded with a new-session message. Repeated the golden
   rejection/disposition/approval path and exact refresh comparison on this final build.

Screenshots: `P3-browser-rejected.jpg`, `P3-browser-approved.jpg`. Approved image
visually inspected: fields, status, role/site, actions and context are readable.
The browser warning/error log query returned no entries during the first rehearsal.
Expected HTTP rejection behavior is checked separately, not inferred from console logs.

## Closure

**P3 PASS for recovered criteria. Stop before P4.**

State remains process-local; refresh recovery works during the server lifetime,
not across restarts. CustomerModel and ConversationState remain reserved empty
placeholders. Demo roles are fictional context. This workflow executes pH only,
with no inferred root cause, real release operation, identity provider, database,
external service or AI behavior. No P3 commit/push was requested in this turn.
