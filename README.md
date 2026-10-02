# GDE — P1 Demo Twin

A runnable TypeScript application with a React frontend and Node backend. The
fictional **Acme Quality Cloud** demo now supports a manually navigable,
read-only synthetic story: **Sample → Test → Result → Exception → QA Review**.
Work queue, sample list/detail, specification, and illustrative audit history
provide context. All records, names, measurements, and assessments are fixed
fixtures authored for this demo.

## Run

Requires Node **22.12+** and npm:

```sh
npm ci
npm run dev
```

Open <http://127.0.0.1:5173>, click **Explore demo**, then **Begin sample
walkthrough**. Follow each screen’s primary link into QA review. Sidebar and
numbered walkthrough buttons allow direct navigation. Samples also supports
local text filtering and inspecting the second fictional record.

To run the built application:

```sh
npm run build
npm start
```

Open <http://127.0.0.1:3001>. Optional: copy `.env.example` to `.env` to change
`PORT` or `WEB_PORT`. No credentials or external services are needed. Frontend
edits reload through Vite; restart dev after backend edits. Ctrl+C stops the
processes. Listeners bind to loopback.

## Validate

```sh
npm run check
npm run test:http
```

`check` runs strict TypeScript, 17 tests, boundary checks, and both builds.
`test:http` runs seven API tests over real loopback TCP, including navigation,
invalid payloads, ended sessions, access tokens, and session isolation.
See [P1 validation](docs/P1-validation.md) for the browser rehearsal and PASS
matrix. [P0 validation](docs/P0-validation.md) is the historical foundation record.

## Structure and frozen boundaries

| Location | Responsibility |
| --- | --- |
| `packages/contracts` | Validated session/event/API and generic presentation shapes |
| `packages/engine` | Generic session lifecycle, canonical navigation state, isolated events |
| `packages/product-packs/acme` | Fictional labels, fixed fixtures, presentation links and assessments |
| `apps/server` | Composition root, authentication, Pack target validation, HTTP/static adapter |
| `apps/web/src/twin` | Reusable navigation, lists, details, queue, execution, grid, workflow, review, history |
| `apps/web` | Generic renderer and session controls; renders server snapshots |

**DemoState is authoritative** for current screen and selected record, plus
lane/role/site. The latter remain unset in P1: the fixture’s lab/site labels
are presentation context. React does not maintain a second screen/selection
store. Navigation updates only the requesting session after token and target
validation. A new session begins at the Pack’s work queue with no selection.
The engine contains no product object semantics.

P1 contains presentation snapshots, not the full Product Pack/domain model.
Viewing a test does not execute it; results and range assessments are prefilled;
QA remains pending. Fixed audit entries are visibly distinguished from live
session events. No domain edits, approval, release, transition engine, invariant
framework, planner, Fast Router, AI, speech, scenario generation, database, or
proprietary/vendor materials are introduced. P2 has not started.

## API

| Method | Path | Result |
| --- | --- | --- |
| GET | `/api/health` | Backend health and P1 marker |
| GET | `/api/product-pack` | Fictional product metadata |
| GET | `/api/demo-presentation` | Validated fixed presentation blueprint |
| POST | `/api/sessions` | New session, initial event, access token |
| GET | `/api/sessions/:id` | Authorized session snapshot and events |
| POST | `/api/sessions/:id/navigation` | Authorized canonical screen/selection update |
| POST | `/api/sessions/:id/end` | Ended session and lifecycle events |

Creation and end requests take no body. Navigation requires
`Content-Type: application/json` with exactly `{ "screenId": "sample-1001",
"recordId": "SMP-1001" }` (maximum 4096 bytes); targets must match the Pack.
Session reads/navigation/end require `Authorization: Bearer <accessToken>`.
Ended sessions reject navigation with 409. There is no session-list endpoint.
Tokens stay in React memory and never enter event logs. Ending is idempotent.
Responses are detached snapshots. Navigation adds no new event vocabulary:
`SESSION_STARTED`, `SESSION_ENDED`, and `ERROR_OCCURRED` remain the live events.

Errors use sanitized codes/messages and event IDs. Authorized failures enter
the session log; other failures enter a private process-local system log.
Request bodies, credentials, and stack traces are not recorded.

State is in memory for the Node process lifetime. Reload loses the tab’s token;
its prior session remains until restart. There is no persistence, reconnection,
expiry/cleanup, identity, or browser-close auto-ending. Use **End session**.

P0 PASS/FROZEN is pushed to `main` at
`a66512bf3492dc97d6c5f560d23f5337655f85f3`. P1 PASS is recorded on the local
`p1-demo-twin` branch and left commit-ready for review.
