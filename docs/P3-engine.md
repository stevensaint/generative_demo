# P3 deterministic execution

The HTTP adapter authorizes a session and passes a strict command to
DemoController. The controller checks active status and expected revision, clones
canonical state, applies context changes or trusted Pack operations, validates
all records/guards and the resulting projection, then commits exactly once.
A rejected compound operation commits no intermediate effects.

StateEngine is generic: it enforces declared entity types, fields, references,
allowed action transitions, action roles, typed inputs and current/proposed guard
bindings. Handlers read copies and write through create/set/transition methods.
The Acme runtime supplies pH assessment, linked record creation, site scope and
cross-object approval rules. It requires one result per test and exactly one
exception per failing assessed result. Approval requires completed tests,
assessed results, resolved exceptions with disposition, and a decision rationale.

| Command | Arguments / behavior |
| --- | --- |
| NAVIGATE, OPEN_RECORD, SHOW, OPEN_EXCEPTION, SHOW_AUDIT_HISTORY | screenId + recordId (nullable), validated against current projection |
| RETURN | Empty; restore previous canonical navigation target |
| FILTER | query; canonical filter on the current record list |
| HIGHLIGHT | field; highlight an existing displayed field label |
| SWITCH_ROLE / SWITCH_SITE | roleId / siteId, allowed Pack context |
| SET_LANE | laneId; compatible role and Pack entry target |
| SET_PARAMETER | parameterId + value; bounded reinitialization |
| RESET | Empty; default reinitialization, retain event history |
| START_TEST | Test recordId; atomically begin sample testing and start ready test |
| ENTER_RESULT | Test recordId + finite value + unit pH; create/update draft measurement |
| SUBMIT_TEST | Test recordId; measurement required |
| TRIGGER_EXCEPTION | Result recordId; assess completed test and conditionally create exception |
| SUBMIT_FOR_REVIEW | Sample recordId; assessed results required; create pending review |
| RESOLVE_EXCEPTION | Exception recordId + disposition; QA review/resolve compound operation |
| APPROVE | Review recordId + rationale; QA review/sample approval compound operation |

Every command includes expectedRevision. Actual application operations are
synchronous, with a final store revision check. No locks, jobs or infrastructure
are needed for this process-local implementation. Roles/sites are synthetic demo
context, not enterprise identity or permissions.

Session snapshots contain current ProductState, DemoState, reserved CustomerModel,
ConversationState, lifecycle metadata, Pack/version and revision. The snapshot
includes the last event sequence separately, never the full event log. The
session read response supplies events and a projected workspace. Refresh uses
that authorized read, not client-authored state. No snapshot upload exists.

Defaults and parameter bounds come from the Pack. Applying a parameter resets
the synthetic run, with each sample assigned deterministically across selected
sites. External/mixed sources require at least one fictional partner. The
result profile chooses suggested form values; it does not override submitted
measurements. Only pH is executable in this golden slice.

Reset retains identity, lifecycle, empty CustomerModel and ConversationState,
and prior events while replacing ProductState/DemoState. A process restart loses
all sessions. P4 planning, routing, conversation or AI execution remains absent.
