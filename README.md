# GDE — P3 Deterministic Demo Engine

For transfer or a new coding-assistant session, begin with
[HANDOFF.md](HANDOFF.md). [CLAUDE.md](CLAUDE.md) provides Claude's entry
instructions; [documentation index](docs/README.md) maps all phase records.

A runnable TypeScript/React and Node application for fictional **Acme Quality
Cloud**. Execute an isolated synthetic workflow:
**Sample → Test → failing Result → Exception → QA Review → Approval**.
The Product Pack owns every Acme action, rule and screen projection. The generic
controller owns validation, atomic commands and canonical session state.

## Run

Requires Node **22.12+** and npm:

```sh
npm ci
npm run dev
```

Open <http://127.0.0.1:5173>. For the built application:

```sh
npm run build
npm start
```

Open <http://127.0.0.1:3001>. Optional `.env` settings are listed in
`.env.example`. Listeners bind to loopback. No external service credentials are
required. Restart dev after backend edits; Ctrl+C stops the processes.

## Execute the golden workflow

1. Click **Explore demo**, then **Begin sample workflow** and **Start test**.
2. Open **View test execution**, enter **6.4 pH**, and **Submit test**.
3. Open **View results** and **Assess measurement against specification**.
   The inclusive 6.8–7.2 range produces a below-range result and linked exception.
4. **Submit sample for QA review**, switch **Demo role** to **QA**, and open QA
   review. Approval with an unresolved exception is rejected.
5. **Inspect exception evidence**, document a synthetic disposition, return to QA,
   enter a decision rationale, and **Approve synthetic review**.

Both the review and sample become approved atomically. An in-range measurement
creates no exception. This P3 slice executes pH only; conductivity fields remain
inactive Pack definitions. Root cause is never inferred. All records, people,
roles and decisions are fictional, with no real laboratory or release operation.

**Explore demo paths** selects role-compatible lanes. **Synthetic run settings**
applies bounded Pack parameters and starts the workflow again within the same
session. Add an external partner before selecting external/mixed sources.
`result_profile` supplies deterministic suggested measurements; explicit input
and specification bounds determine the actual outcome. **Reset demo** restores
default records/context while retaining session events.

## Validate

```sh
npm run check
npm run test:http
npm run validate:pack
node scripts/test-pack-runtime.mjs
```

`check` runs strict TypeScript, 38 tests (including architectural boundaries),
and frontend/backend builds. `test:http` runs nine API tests over actual loopback
TCP. [P3 validation](docs/P3-validation.md) records the recovered PASS criteria,
HTTP evidence and browser rehearsal. P0/P1/P2 records remain historical; the P2
browser handoff was verified before the P3 checkpoint.

## Frozen boundaries

| Location | Responsibility |
| --- | --- |
| `packages/contracts` | Generic validated state, commands, events, snapshots, Pack/runtime and presentation shapes |
| `packages/engine` | Controller, isolated canonical store, generic schema/reference/transition/guard validation |
| `packages/product-packs/acme` | Fictional JSON configuration, deterministic handlers, cross-object rules and state projections |
| `packages/product-packs/runtimes.ts` | Explicit trusted runtime registry, composed by the backend entry point |
| `apps/server` | Token authorization, HTTP/static adapter and dependency composition |
| `apps/web` | Generic server-driven renderer, commands and tab refresh pointer |

**ProductState** owns synthetic records and workflow state. **DemoState** owns
screen, selection, lane, role, site, navigation history, filters, highlights and
bounded parameters. React renders the server's acknowledged workspace and does
not mutate domain state. Commands run on a detached candidate; guards, model
validation and projection validation pass before a revision-checked commit.
Failures retain the prior canonical state and revision.

The engine/contracts/frontend contain no Acme semantics or Pack imports.
CustomerModel and ConversationState are reserved empty/sequence-zero snapshot
fields in this phase. No planner, Fast Router, AI, voice, provider SDK, database,
proprietary/vendor materials or P4 behavior is introduced.

## API

| Method | Path | Result |
| --- | --- | --- |
| GET | `/api/health` | Health and P3 marker |
| GET | `/api/product-pack` | Fictional metadata |
| GET | `/api/product-pack/manifest` | Validated versioned Pack |
| GET | `/api/demo-presentation` | Authored initial blueprint; live views use workspace projection |
| POST | `/api/sessions` | New isolated session, workspace, event and access token |
| GET | `/api/sessions/:id` | Canonical session, events and projected workspace |
| POST | `/api/sessions/:id/commands` | Atomic validated revision-checked command |
| GET | `/api/sessions/:id/snapshot` | Detached current state and last event sequence, without event history |
| POST | `/api/sessions/:id/navigation` | Compatibility navigation through the same controller |
| POST | `/api/sessions/:id/end` | Idempotent lifecycle end |

Session endpoints require `Authorization: Bearer <accessToken>`. Creation/end
have no body. Commands require `Content-Type: application/json`, maximum 4096
bytes, for example:

```json
{"type":"START_TEST","expectedRevision":1,"args":{"recordId":"TST-1001"}}
```

There is no state-upload or arbitrary action endpoint. Context/navigation aliases
and domain command mappings are documented in [P3 engine](docs/P3-engine.md).
Stale revisions, illegal actions and ended sessions return sanitized errors.
Valid parsed commands emit `COMMAND_REQUESTED` then `COMMAND_APPROVED` and
`STATE_CHANGED`, or `COMMAND_REJECTED`. HTTP failures also emit `ERROR_OCCURRED`;
lifecycle events remain. Logs never contain input values, tokens or stack traces.

The tab stores only its validated session ID/token pointer in `sessionStorage`;
refresh fetches canonical state from the server. A new independent tab starts
its own session. State and tokens remain process-local: server restart invalidates
old sessions; the frontend discards an unavailable pointer. Snapshots do not
provide disk persistence or a caller-controlled restoration bypass. There is no
identity provider, expiry/cleanup or browser-close auto-ending. Use **End session**.

## Pack configuration and checkpoints

The default Pack is `packages/product-packs/acme/pack.json`, version **0.3.0**;
builds copy it into `dist`. `GDE_PRODUCT_PACK_PATH` selects a trusted absolute
JSON path at startup. Invalid Pack/model data prevents listening. Only explicitly
registered runtimes execute; JSON cannot load executable code. Alternate
metadata and configured queue titles still work without generic core edits.
See [P2 authoring guide](docs/P2-product-pack.md) for the original schema and
[P3 engine](docs/P3-engine.md) for execution semantics.

P0 is pushed to `main` at `a66512b`. P1 is pushed on `p1-demo-twin` at `2029f29`.
P2 was checkpointed locally at `df24449` before P3. P3 is on
`p3-deterministic-demo-engine`, commit-ready. **P3 PASS; P4 not started.**
