# GDE — P2 Fictional Product Pack

A runnable TypeScript application with a React frontend and Node backend. The
fictional **Acme Quality Cloud** demo supports a manually navigable,
read-only synthetic story: **Sample → Test → Result → Exception → QA Review**.
Work queue, sample list/detail, specification, and illustrative audit history
provide context. All records, names, measurements, and assessments are fixed
fixtures authored for this demo.

The versioned Acme JSON Product Pack now defines four demo lanes, three roles,
bounded parameters, six product object types, action/transition/guard declarations,
and evidence-linked fictional Product Truth. P2 loads configuration dynamically;
execution remains reserved for P3.

## Run

Requires Node **22.12+** and npm:

```sh
npm ci
npm run dev
```

Open <http://127.0.0.1:5173>, click **Explore demo**, then **Begin sample
walkthrough**. Follow each screen’s primary link into QA review. Sidebar and
numbered walkthrough buttons allow direct navigation. Samples also supports
local text filtering and inspecting the second fictional record. Open **Explore
demo paths** to inspect the four authored paths and supported scope.

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
npm run validate:pack
```

`check` runs strict TypeScript, 26 tests, boundary checks, and both builds.
`test:http` runs eight API tests over real loopback TCP, including navigation,
invalid payloads, ended sessions, access tokens, and session isolation.
See [P2 validation](docs/P2-validation.md) for the configuration/model PASS
matrix and runtime evidence; its fresh browser check is marked NOT RUN.
[P1 validation](docs/P1-validation.md) and [P0 validation](docs/P0-validation.md)
are historical phase records.

## Structure and frozen boundaries

| Location | Responsibility |
| --- | --- |
| `packages/contracts` | Validated session/event/API, generic presentation and Product Pack shapes |
| `packages/engine` | Generic session lifecycle, canonical navigation state, isolated events |
| `packages/product-packs/acme` | Versioned fictional JSON: presentation, model, rules, lanes, roles, bounds and truth |
| `packages/product-packs/loader.ts` | Generic trusted JSON loader with schema validation |
| `apps/server` | Composition root, authentication, Pack target validation, HTTP/static adapter |
| `apps/web/src/twin` | Reusable navigation, lists, details, queue, execution, grid, workflow, review, history |
| `apps/web` | Generic renderer and session controls; renders server snapshots |

**DemoState is authoritative** for current screen and selected record, plus
lane/role/site. The latter remain unset in P2: the fixture’s lab/site labels
are presentation context. React does not maintain a second screen/selection
store. Navigation updates only the requesting session after token and target
validation. A new session begins at the Pack’s configured home screen with no selection.
The engine contains no product object semantics.

P2 contains a declared Product Pack model alongside the fixed presentation
snapshots. It does not implement a mutable domain state engine.
Viewing a test does not execute it; results and range assessments are prefilled;
QA remains pending. Fixed audit entries are visibly distinguished from live
session events. No domain edits, approval, release, transition engine, invariant
framework, planner, Fast Router, AI, speech, scenario generation, database, or
proprietary/vendor materials are introduced. P3 has not started.

## API

| Method | Path | Result |
| --- | --- | --- |
| GET | `/api/health` | Backend health and P2 marker |
| GET | `/api/product-pack` | Fictional product metadata |
| GET | `/api/product-pack/manifest` | Validated versioned fictional Pack |
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
`a66512bf3492dc97d6c5f560d23f5337655f85f3`. P1 PASS is committed and pushed as
`2029f29` on `p1-demo-twin`. P2 PASS for the
recovered criteria is recorded on local branch `p2-acme-product-pack`,
commit-ready. No P3 work has started.

## Pack configuration

The default Pack is `packages/product-packs/acme/pack.json`. Builds copy it into
`dist`. Set `GDE_PRODUCT_PACK_PATH` to a trusted absolute JSON path and restart
to select an alternate Pack. Invalid configuration prevents startup. HTTP
callers cannot supply a Pack path. The generic engine has no Acme imports.

See [Product Pack authoring guide](docs/P2-product-pack.md) for the schema,
lanes, bounds, model and current/proposed guard semantics. The parameter validator
does not generate scenarios; action handler declarations do not execute.
