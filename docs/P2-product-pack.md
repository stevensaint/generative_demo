# Fictional Acme Product Pack — authoring guide

The data-only Pack is `packages/product-packs/acme/pack.json`, schema version
`1.0`, Pack version `0.2.0`. It is loaded and validated at startup. Its JSON
cannot import modules or execute handlers. P2 declares the domain rules;
P3 will implement deterministic execution and Pack-owned executable handlers.

## Authored demo paths

| Lane | Roles | Path and branches |
| --- | --- | --- |
| Sample Management | Analyst, Lab Manager | Sample register → primary record; branch to newly received second record |
| Lab Execution | Analyst, Lab Manager | Execution → results → specification; return to results |
| Exception/OOS | QA, Lab Manager | Results → exception → review; return for investigation |
| QA Review | QA | Review → illustrative history; branch to exception evidence |

Each lane owns narrative, entry node, screen/record targets, action references,
parameter references, and graph edges. Graph targets/references must exist;
all nodes must be reachable from the entry. In P2, **Explore** opens the fixed
entry screen only. It does not set currentLane, role, or site, run a lane graph,
or execute any declared domain action. These are future controller concerns.

## Bounded parameters

| Parameter | Allowed values | Default |
| --- | --- | --- |
| `site_count` | Integer 1–3 | 1 |
| `external_partner_count` | Integer 0–3 | 0 |
| `sample_count` | Integer 1–12 | 2 |
| `sample_source` | internal / external / mixed | internal |
| `result_profile` | in-range / out-of-range / mixed | mixed |

The names are recovered frozen P2 requirements. Exact numeric bounds, enum
values, fictional sites (Harbor/Ridge/Delta), entity fields and authored lane
nodes are implementation choices for this synthetic Pack, not architectural
amendments or real-product claims. `parsePackParameters` checks bounds/defaults,
rejects unknown fields, and performs no string-to-number coercion. It does not
generate or change fixture data. There are no parameter-editing HTTP endpoints.
Future scenario generation must validate combinations and materialize matching
data before changing the demo. P2 validates parameters individually only.

## Product model and rule declarations

| Object type | Declared states |
| --- | --- |
| Sample | received → in-testing → awaiting-qa → approved |
| Test | ready → in-progress → completed |
| Result | recorded → assessed |
| Specification | published |
| Exception | open → in-review → resolved |
| Review | pending → approved / returned |

The nine typed seed records match the fixed P1 example. Fields, states, record
references, required values, numeric types and presentation selections are
validated. They are static configuration; they are not a mutable ProductState.
P3 must render current product values from authoritative state rather than
mutating these presentation snapshots independently.

Ten actions and ten transitions describe the synthetic lifecycle. Role lists
scope permissions; QA owns exception resolution and review/sample approval.
Handler declarations contain ordered effect intents and descriptions. They
have no interpreter in P2. Field-setting intents reference typed action inputs;
transition intents reference declared states; exception creation is conditional
on a failed assessment. Result assessment uses fictional specification ranges
as described by the Pack-owned handler declaration. These descriptions are
requirements for the future handler code, not executable implementations.

Guard bindings explicitly identify current vs proposed state and, where needed,
the subject’s reference field (`testId` or `sampleId`). Proposed rationale or
disposition must be nonempty before a decision commits. Testing must exist and
be complete before review; sample approval additionally requires all linked
exceptions resolved and a linked approved review. Related-existence guards
prevent approval by an empty set of tests/reviews. Conditions and invariant
predicates are declarations; enforcing them atomically is reserved for P3.

The generic contracts describe fields, references, predicates, effects and
graphs using opaque IDs. They contain no Acme or product object names. Product
semantics, synthetic records, labels, rules and narrative live in the Pack.

## Fictional Product Truth

Five versioned facts link to Pack-local evidence. Three approved Q&A answers
link to those facts. Facts distinguish **available navigation/presentation**
from **defined-only future execution**. Questions without approved evidence,
or questions about real vendors, integrations, validation, compliance or
production deployment, have an explicit human-escalation policy. P2 does not
implement a retrieval engine, answer router, agent, or external provider call.

## Load and validate

```sh
npm run validate:pack
npm run validate:pack -- /absolute/path/to/alternate.json
npm run validate:pack -- /absolute/path/to/alternate.json '{"sample_count":12}'
```

To start the built application with an alternate Pack:

```sh
GDE_PRODUCT_PACK_PATH=/absolute/path/to/alternate.json npm start
```

The path is trusted operator configuration, never supplied by an HTTP caller.
Restart after changing a Pack. Invalid JSON, schema versions, identity, bounds,
references or graph reachability fail startup before listening. Builds copy the
default Pack into `dist`; production startup does not require source files or
a particular working directory. It uses the copied Pack unless overridden.

`GET /api/product-pack` returns metadata; `GET /api/demo-presentation` returns
presentation; `GET /api/product-pack/manifest` returns the validated fictional
Pack. Existing session authentication and navigation validation apply. There
is no action-execution, role-switching, site-switching or scenario-generation
endpoint in P2. No new dependencies or services were added.
