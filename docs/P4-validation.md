# P4 validation — PASS

Date: 2026-10-02. Branch: p4-text-agent. P3 baseline pushed at 7ff7ef6,
with documentation checkpoint 356db83. P4 is authorized by the user-supplied
[frozen section](architecture/P4-frozen.md). P5 has not started.

## Acceptance matrix

| Frozen gate | Current evidence | Status |
| --- | --- | --- |
| 1. Natural-language customer control | Real Claude navigation/role/clarification/correction/filter HTTP requests plus live browser navigation and start-test control | PASS |
| 2. ~10 natural commands/redirections | 31 live HTTP turns passed, including representative redirections, local Stop/End and full guarded workflow | PASS |
| 3. Claude runtime-validated proposals | 28 real Claude structured proposals accepted by strict runtime validation | PASS (live HTTP) |
| 4. Valid actions through Controller/StateEngine | Real Claude rehearsal completes guarded pH workflow through Controller/StateEngine; batch/rollback tests pass | PASS |
| 5. Invalid AI actions harmless | Unknown type, invalid compound actions, malformed output and bad provenance retain canonical state/revision and record rejection/failure | PASS |
| 6. Natural redirection | Live Claude navigation, skip/back, role clarification and customer correction; Stop/End verified locally and in browser | PASS |
| 7. Demo/Product coherence | Candidate transaction, role/state/site rules, revision conflicts, canonical projection, late-call rejection and P3 golden path regression | PASS |
| 8. Customer Model provenance | Live interest correction retains quote, confidence, supersedesId and inactive prior entry; inference safeguards tested | PASS |
| 9. Inspectable turn events | Customer text, validated proposal, memory changes, action decisions, narration intent, revisions/context/effects; new events linked by turn ID | PASS |
| 10. No direct model UI/state authority | Provider receives only strings/schema; no store/controller/tools; engine/front-end boundary tests; all requested mutations validated | PASS |
| 11. No substantive answers from model memory | No free-form model response field; only bounded narration; Pack truth/Q&A omitted from inference context | PASS |
| 12. Safe question capture | Integration/compliance/licensing/roadmap/adversarial cases tested; actual browser captured SAP question and restored it after reload | PASS |
| 13. P0–P3 remains intact | Original lifecycle/navigation/golden workflow/isolation/Pack/HTTP/boundary regressions pass; no dependency additions | PASS |

**Overall P4 PASS.** All 13 frozen gates are demonstrated by automated boundary
checks, real Claude HTTP acceptance and live browser rehearsal. Fixture evidence
alone was not used to establish natural-language acceptance.

## Completed checks

- Real Claude HTTP: **31 turns PASS**, including 28 Claude calls. Live browser:
  navigation, start-test, safe capture, refresh, Pause/End and disabled ended controls PASS.
- npm run check: strict TypeScript, **53/53 tests**, production web/server builds.
- npm run test:http: **11/11** tests over real loopback TCP.
- npm run validate:pack: validated fictional Pack/defaults.
- node scripts/test-pack-runtime.mjs: alternate configuration from unrelated
  working directory, production assets and invalid startup rejection.
- Browser on built port 3001: P4 chat renders; provider failure retains revision 0
  and received records; SAP integration question returns the exact safe capture
  response and is inspectable; reload restores chat; Pause works; manual navigation
  still works; text End ends the session and disables actions. Console query had
  no warning/error entries. Screenshot visually inspected for readability.

Evidence also includes original first live attempt P4-live-attempt-01.json.
Evidence: P4-check-evidence.txt, P4-http-evidence.txt, P4-pack-evidence.txt,
P4-runtime-evidence.txt, P4-browser-evidence.txt, P4-browser-capture.jpg,
P4-live-evidence.json, P4-live-evidence.txt. Browser evidence predates only a
provider-origin label/diagnostic metadata refinement; no UI behavior changed.

## Historical live blocker and completion plan (resolved below)

The local ignored API key is configured. No key value was printed or committed.
Direct provider connectivity diagnostics returned ENOTFOUND for api.anthropic.com.
The API was never reached, so this does not validate or invalidate the key/billing.
The environment's approval policy rejected a request to run the connectivity
check outside the sandbox because sandbox escalation is disabled. No alternate
proxy/browser/provider route was used to bypass that restriction.

npm run validate:agent:live was executed here and recorded BLOCKED with
PROVIDER_UNAVAILABLE on the first request; state stayed at revision 0. The real
structured-output/natural-language gates remain pending. The user was given the
local Terminal command while documentation was completed.

To finish: run npm run validate:agent:live in the user's local Terminal, inspect
all turn evidence (including corrections and invalid-action recovery), address
any actual model/API failures, and rehearse live text redirections in the browser
with a backend started from that Terminal. Record those results here, then claim
P4 PASS only when all 13 gates are demonstrated. Stop before P5.

## Historical recheck — 2026-10-02 22:08 UTC

At the user’s request, reran npm run validate:agent:live directly. It again
recorded BLOCKED / PROVIDER_UNAVAILABLE on the first turn, with no HTTP status
and canonical revision still 0. An unauthenticated connectivity diagnostic
confirmed ENOTFOUND for api.anthropic.com. The current result is saved in
P4-live-evidence.json. Attempted read-only inspection of the user’s Terminal
result was denied by computer-use policy: “Computer Use is not allowed to use
the app com.apple.Terminal for safety reasons.” No Terminal command was executed
through computer use, and no alternate route was used to bypass the restriction.
Live acceptance remains pending.

## First real Claude run — 2026-10-02 22:11 UTC

The user ran the rehearsal in ordinary Mac Terminal. The API/key/model worked:
13 turns completed with real, runtime-validated Claude proposals, approved actions,
role changes, clarification and a provenance-preserving interest correction.
The test stopped at its filter assertion, not a provider or Controller failure:
Claude requested query SMP-1002 while the assertion required exactly 1002.
Both select only the intended sample. Original evidence is preserved in
P4-live-attempt-01.json. The rehearsal now checks the matched record IDs rather
than a single spelling of the query, and prints safe assertion details on failure.
The Pack’s bounded sample-list narration was also corrected to describe the list
rather than an individual sample. Complete the remaining rehearsal and browser
acceptance before recording overall PASS.

## Real Claude HTTP acceptance PASS — 2026-10-02 22:20 UTC

The user's ordinary Terminal completed the corrected rehearsal: **31 turns,
28 real Claude proposals**, plus local safe factual capture, Stop and End.
The saved report is PASS. All runtime schemas and assertions passed. Inspection
of the evidence confirms a grounded explicit external-lab interest superseded by
an internal-lab correction with linked provenance; filter behavior; the complete
pH workflow; rejected premature approval retaining revision 23 with no product
effects; exception resolution; atomic review/sample approval; safe SAP capture;
Pause and End. No unrestricted model answer or hidden chain-of-thought is saved.

Overall final acceptance awaits the remaining live browser rehearsal. The app
server was not listening at port 3001 when checked after this result. Start
npm start in the ordinary Terminal and leave it running, then verify live customer
text, canonical rendering and refresh in the browser. No P5 work has started.

## Final live browser acceptance — PASS

2026-10-02. The user started the built application in ordinary Mac Terminal.
A new isolated browser session completed real Claude text requests: open the
first sample, show QA, go back, and start the sample’s test. The UI acknowledged
revisions 1–4, with sample in-testing and test in-progress coherently projected.
SAP integration question returned only the predefined capture response and was
preserved in Conversation details. Reload restored revision 5, conversation and
product state. Stop paused immediately; End ended at revision 7 and disabled
chat, workflow and navigation controls. Seven completed turns are inspectable.
Console warning/error query returned no entries. The full-page screenshot was
visually inspected. Evidence: P4-live-browser-evidence.txt and
P4-live-browser-ended.jpg. The complete workflow and broader redirections are
covered by the independent 31-turn real Claude HTTP rehearsal.

**P4 PASS recorded.** No code changed after the passing 53-test production check;
11 real TCP tests, Pack validation and startup/configuration checks also pass.
P4 changes and evidence are staged locally, not committed or pushed. Stop before
P5. The historical sandbox/provider failures above are resolved for acceptance
by the ordinary-Terminal provider run; they are retained as diagnostic history.
