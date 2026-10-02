# GDE repository handoff

Updated: 2026-10-02. This file is the starting point for a new developer or
Claude session. The repository, tests and phase records carry the implementation
context; resuming should not require the prior chat.

## Local location and transfer

Current local repository:
`/Users/stevenst.germain/Documents/Codex/2026-10-02/new-chat/gde`

GitHub remote: <https://github.com/stevensaint/generative_demo>.
Current branch: `p3-deterministic-demo-engine`.

**P3 is committed and pushed.** Validated implementation checkpoint:
`7ff7ef67c895add821f5b15542b73e3d409f0f56`, on
`origin/p3-deterministic-demo-engine`. A fresh remote branch check matched this
SHA on 2026-10-02. A documentation-only follow-up updates this handoff; check
`git log` for the latest tip.

To transfer, clone the P3 branch (main still holds P0):

```sh
git clone --branch p3-deterministic-demo-engine https://github.com/stevensaint/generative_demo.git
```

Alternatively copy the whole local `gde` directory, including source files,
`docs`, lockfile and Git metadata. Preserve any later working-tree changes.
Generated `node_modules`, `dist` and `.test-dist` directories can be omitted
and regenerated. No external-service credentials are required. Do not include
personal environment files in a shared source bundle.

All documentation and validation evidence are regular local files within this
repository and are included in the staged changes or prior commits. There are
no necessary chat-only screenshots or temporary-log dependencies: relevant
evidence was copied into `docs`.

## Read in this order

1. [README](README.md): setup, golden workflow, API, current limitations.
2. [P3 validation](docs/P3-validation.md): PASS matrix and actual checks.
3. [P3 engine](docs/P3-engine.md): commands, state, atomicity and snapshots.
4. [P2 Pack authoring](docs/P2-product-pack.md): original schema/guard design;
   read as historical P2 context and use current contracts/Pack for P3 behavior.
5. [Documentation index](docs/README.md): prior phases and evidence.

## Phase checkpoints

| Phase | State at handoff | Checkpoint |
| --- | --- | --- |
| P0 foundation | PASS, committed; previously pushed to main | `a66512b` |
| P1 manually navigable synthetic twin | PASS, committed; previously pushed to p1-demo-twin | `2029f29` |
| P2 fictional Acme Product Pack | PASS, local commit | `df24449` |
| P3 deterministic engine | PASS against recovered criteria; committed and pushed | `7ff7ef6` on p3-deterministic-demo-engine |
| P4 | User authorized execution after P3 push; frozen scope/PASS criteria unavailable | Awaiting specification; no implementation |
| P5 and later | Not started or authorized | No implementation |

P3 remote SHA was freshly verified. P0/P1 push history above is from prior
work. P2 is included in P3 ancestry; its separate branch was not pushed.

## Architecture constraints to preserve

The project follows recovered requirements from **GDE Architecture V0.1 FROZEN**.
The complete original numbered 00–20 architecture document is **not present**
in this repository. The records explicitly qualify PASS against recovered
criteria. Do not reconstruct missing requirements as if they were an approved
specification. Obtain that source or the next phase's approved scope before
implementing a phase that depends on it.

| Boundary | Required separation |
| --- | --- |
| Generic engine/contracts | No Acme or Sample/Test/Result/Exception semantics; generic state, transitions, guards, action framework, sessions/events |
| Product Pack | Owns fictional objects, actions/handlers, transitions, invariants, roles/sites, bounded parameters, truth/Q&A and presentation |
| Generic React Demo Twin | Reusable primitives render the server workspace; no Pack imports, domain rules or duplicate canonical state |
| HTTP composition | Authorizes tokens and composes trusted Pack/runtime dependencies; accepts commands, never arbitrary uploaded canonical state |
| Canonical state | ProductState contains entities/workflow; DemoState contains navigation/context/history/filters/highlights/parameters |
| Phase exclusions | No AI, Claude API integration, speech/ElevenLabs, planner/Fast Router, database or unnecessary infrastructure |
| Product integrity | Fictional Acme only; no Veeva IP, proprietary materials or claims of real-product fidelity/enterprise readiness |

“Claude” in this handoff means a future coding assistant reading the repository,
not a runtime dependency of the application. Use Demo Twin or Synthetic Product
Twin terminology. Fictional V0 proves the mechanism, not a vendor product.

## Implementation map

- `packages/contracts/src/state.ts`, `runtime.ts`, `index.ts`: strict generic
  state, command, runtime, API/event and snapshot contracts.
- `packages/contracts/src/product-pack.ts`, `presentation.ts`: validated Pack
  model and presentation shapes.
- `packages/engine/src/controller.ts`: command orchestration, candidate state,
  revision validation, atomic commit and command events.
- `packages/engine/src/state-engine.ts`: generic field/reference/transition,
  input/role and current/proposed guard enforcement.
- `packages/engine/src/sessions.ts`: detached process-local sessions/events.
- `packages/product-packs/acme/pack.json`: fictional Pack version 0.3.0.
- `packages/product-packs/acme/runtime.ts`, `presentation.ts`: deterministic
  pH workflow, linked evidence rules and state-derived screens/controls.
- `packages/product-packs/loader.ts`, `runtimes.ts`: JSON loading and explicit
  trusted runtime registry; JSON cannot load executable handlers.
- `apps/server/src`: HTTP authorization/static adapter and composition entry.
- `apps/web/src`: generic React renderer, command forms, refresh pointer.
- `tests`: controller/rollback/boundary, HTTP, session, Pack and rendering tests.

## Verify on the destination computer

From the copied repository root, using Node 22.12+:

```sh
git status --short
git branch --show-current
git log -4 --oneline
npm ci
npm run check
npm run test:http
npm run validate:pack
node scripts/test-pack-runtime.mjs
npm start
```

Open <http://127.0.0.1:3001>. `npm run dev` uses
<http://127.0.0.1:5173> instead. The backend binds to loopback. A copied running
session is not portable: sessions/tokens are in memory, so start a new demo.

Recorded P3 results: **38/38 tests**, **9/9 real TCP API tests**, strict
TypeScript, production builds, Pack validation, alternate-config runtime and
invalid startup rejection all pass. The browser rehearsal completed the golden
path, rejected premature approval, verified refresh restoration and independent
session behavior. These are historical evidence; rerun the commands after
transfer to establish the new environment's result.

Golden path: received sample → start test → enter 6.4 pH → submit test → assess
against inclusive 6.8–7.2 → linked exception → submit QA review → switch QA →
reject unresolved approval → document disposition → approve review/sample.
Follow the README's exact button sequence for the browser rehearsal.

## Current limits and next action

P3 executes pH only; conductivity is an inactive definition. Root cause is not
inferred. Roles/sites are demo context, not enterprise authentication.
CustomerModel is empty and ConversationState sequence remains zero. Refresh
restores the tab via a validated sessionStorage pointer and authorized server
read; server restart invalidates it. Snapshots contain current state and a tail
sequence, not event history, persistence or an upload/restore bypass.

The user authorized P4 after pushing P3 on 2026-10-02. Implementation is pending
its frozen scope and acceptance criteria, which could not be recovered from
local files or saved-context searches. See [P4 scope status](docs/P4-scope-status.md).
Obtain that missing specification before dependent implementation. Preserve P3 tests
and update the README, phase validation and this handoff after any later work.

Suggested first instruction for Claude:

> Read CLAUDE.md and HANDOFF.md, then README.md and docs/P3-validation.md.
> Inspect the current branch and working tree without discarding changes.
> Confirm the P3 baseline and preserve the generic engine/Product Pack boundary.
> Do not start the next phase until I provide its scope.
