# GDE — P0 Foundation

Minimal TypeScript application with a React Demo Twin shell and a Node backend.
The fictional **Acme Quality Cloud** Product Pack contains presentation only.
P0 implements isolated sessions and `SESSION_STARTED`, `SESSION_ENDED`, and
`ERROR_OCCURRED` events. It stops before P1.

## Run

Requires Node **22.12+** and npm. From this repository:

```sh
npm ci
npm run dev
```

Open <http://127.0.0.1:5173>. The backend runs at
<http://127.0.0.1:3001/api/health>. Click **Start session**, then **End session**.
The activity panel shows the lifecycle events. A new session gets a new ID,
access token, empty DemoState, and event log. A second browser tab is independent.

Optional: copy `.env.example` to `.env` to change `PORT` or `WEB_PORT`.
No credentials are required. All `.env` variants are ignored except
`.env.example`. Environment variables are loaded by Node and inherited by Vite;
the frontend receives no environment secrets.

Frontend edits reload through Vite. Restart `npm run dev` after backend edits.
Ctrl+C stops both processes. The listener binds to loopback only.

## Validate

```sh
npm run check
npm run test:http
```

`check` runs strict TypeScript checks, the session and in-process HTTP tests,
boundary checks, and the frontend/backend build. `test:http` runs the same HTTP
assertions over real loopback TCP and requires permission to open local ports.
In-process tests exercise Node's HTTP request/response objects; they are not a
substitute for the real listener and browser acceptance checks.

To run the built application:

```sh
npm run build
npm start
```

Open <http://127.0.0.1:3001>. The backend serves the built React assets and API.

## Structure and boundaries

| Location | Responsibility in P0 |
| --- | --- |
| `packages/contracts` | Validated operational session/event/API shapes |
| `packages/engine` | Generic session lifecycle and isolated in-memory event recording |
| `packages/product-packs/acme` | Fictional name, description, and presentation metadata |
| `apps/server` | Composition root, token checks, HTTP adapter, static serving |
| `apps/web` | Generic React shell and session controls; renders backend responses |
| `tests` | Lifecycle, isolation, errors, transport, and boundary verification |

DemoState owns current lane, role, site, and screen. P0 leaves lane/role/site
unset and screen at `shell`; no navigation or domain mutation endpoints exist.
The generic engine knows no Sample, Test, Result, Exception, or Acme semantics.
Product objects, transitions, invariants, action handlers, and product-specific
presentation belong to a future Product Pack implementation.

No agent, planner, Fast Router, knowledge layer, speech integration, product
behavior, workflow, scenario generation, database, deployment, or external
service is implemented. No real vendor assets or proprietary materials are
included. The original concept document is not copied into this repository.

## Session and event API

| Method | Path | Result |
| --- | --- | --- |
| GET | `/api/health` | Backend health and P0 marker |
| GET | `/api/product-pack` | Fictional shell presentation |
| POST | `/api/sessions` | New session, initial event, and access token |
| GET | `/api/sessions/:id` | Session snapshot and its events |
| POST | `/api/sessions/:id/end` | Ended session and lifecycle events |

POST requests take **no body**. Session reads and endings require
`Authorization: Bearer <accessToken>`. There is no session-list endpoint.
Tokens are returned only on creation, stay in React memory, and never enter
the event log. A session ID alone does not grant access. Ending twice produces
only one `SESSION_ENDED` event. Responses are snapshots, not mutable store refs.

Errors return a fixed code/message and corresponding event ID. Errors on an
authorized session enter that session's log; unauthenticated, unknown-session,
and server-level errors enter a process-local system log with `sessionId: null`.
The system log has no public endpoint. Event envelopes carry UUID event/session
IDs, an ISO UTC timestamp, per-log sequence, type, and an error code where relevant.
Request bodies, credentials, and stack traces are not logged.

## P0 limitations and status

State and events exist only for the life of the Node process. Reloading the
page discards its access token; its former session remains in process memory
until restart. P0 does not implement reconnection, persistence, cleanup/expiry,
identity, enterprise access controls, or browser-close auto-ending. Use the
explicit End session button. This is a local development foundation.

See [P0 validation record](docs/P0-validation.md) for the acceptance matrix and
runtime/browser evidence. **P0 PASS / FROZEN** is recorded. All 13 foundation
tests and all five real HTTP tests pass; dev and built browser rehearsals passed.
The local repo is staged and commit-ready; source has not been pushed to GitHub.
