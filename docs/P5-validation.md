# P5 validation — PASS

Date: 2026-10-03. Branch: p5-governed-knowledge. Frozen authority: [P5](architecture/P5-frozen.md). P4 baseline committed and pushed on p4-text-agent at **9314fae**. P5 is committed and pushed at **0f44c11**, ready for transfer.

**P5 PASS recorded.** The user ran the checked-in live acceptance script locally. The saved [real-provider report](P5-live-evidence.json) is PASS: all 51 turns completed with 20 approved answers, one evidence synthesis, 22 safe escalations and eight clarifications. Twenty-one substantive questions used the real Claude path; denied/unclear questions used deterministic local policy. Independent inspection verified factual responses against approved phrase selections, references and qualifications. No unsupported claims occurred in this bank. See [live inspection](P5-live-evidence.txt).

The earlier execution-sandbox network failures remain historical in [blocked attempt](P5-live-blocked-attempt.json). They are resolved for acceptance by the user's successful local run, not by bypassing restrictions. Real-provider HTTP acceptance plus built browser fixture acceptance cover provider inference and the UI separately; no P5 live-provider browser rehearsal is claimed.

The final bounded phrasing approach is reviewed for this P5 checkpoint: each fact has distinct full, concise and conversational variants, and Claude chooses style/order inside the authored semantic envelope. This satisfies bounded answer/naturalization demonstrations without claiming unrestricted paraphrase safety. The known expressiveness limit remains documented in [engine](P5-engine.md).

## Completed checks

- Strict TypeScript, production frontend/backend builds and **68/68 automated tests**: [check evidence](P5-check-evidence.txt).
- **12/12 API tests over actual loopback TCP**: [HTTP evidence](P5-http-evidence.txt).
- **14/14 knowledge test groups**, including all **50 Q&A cases** (20 normal, 10 ambiguous, 10 boundary, 10 Make GDE Lie): [evaluation evidence](P5-evaluations-evidence.txt).
- Pack validation and alternate configuration/invalid-startup checks: [Pack](P5-pack-evidence.txt), [runtime](P5-runtime-evidence.txt).
- Built UI with explicitly injected fixture provider: approved qualified Q&A, bounded synthesis, safe integration escalation, ambiguity clarification, first-class records, refresh and lifecycle. See [browser evidence](P5-browser-evidence.txt). This proves frontend/orchestration behavior, not live Claude inference.

## Frozen PASS criteria

| # | Criterion | Evidence/status |
| --- | --- | --- |
| 1 | Structured, versioned Product Truth | Pack schema/source validation PASS |
| 2 | 30–50 atomic facts | 40 authored facts PASS |
| 3 | 20–30 approved families | 24 families PASS |
| 4 | Appropriate classifications | Seven categories, 50 bank cases PASS; live HTTP verified |
| 5 | Bounded family answers | Guard/API/browser fixture PASS; Claude live PASS; bounded phrase choice |
| 6 | Synthesis only with sufficient evidence | Two explicit bundles; missing references/conflicts reject PASS; live HTTP verified |
| 7 | Insufficient and restricted questions escalate | Evaluation/API/browser fixture PASS |
| 8 | No Claude memory answers | Unrestricted prose never reaches factual response structurally PASS; real Claude P5 rehearsal PASS |
| 9 | Internal knowledge references | Answer, Question, DemoTurn and event tests PASS |
| 10 | Grounded demo narration | Approved screen mappings and no-evidence fail-closed tests PASS |
| 11 | Claim Guard fails closed | Invalid fields, modes, versions, facts, status, qualification and conflicts PASS |
| 12 | First-class Questions | Session read/snapshot/refresh and failure preservation PASS; process-local storage |
| 13 | Three knowledge events | Existing backbone integration/API assertions PASS |
| 14 | Truth separate from Product Model | Separate authored corpus and deterministic runtime PASS |
| 15 | No customer/demo promotion | Authority isolation tests PASS |
| 16 | Make GDE Lie passes | Ten adversarial fixtures PASS; live HTTP verified |
| 17 | Four evaluation groups pass | All 50 deterministic cases PASS; live HTTP verified |
| 18 | Qualifications preserved | Guard assembly and evaluation assertions PASS |
| 19 | No invented unsupported specifics | Bank/Guard/API fixture PASS; live HTTP verified |
| 20 | P0–P4 behavior remains | Existing regression tests plus TCP/configuration checks PASS |

The hard gate has **zero unsupported claims in the deterministic and real-provider P5 bank**. That result is bounded to the authored corpus, conservative retrieval and selected approved phrasing. It does not establish performance on arbitrary natural language or unrestricted paraphrases. No P6 work was performed. Source scope is preserved verbatim, including its intentional Markdown two-space line break; whitespace validation excludes that frozen source. All implementation files pass whitespace checks.

## Checkpoint limits and next phase

All 20 P5 criteria are demonstrated using the saved source, automated tests, real TCP API checks, real-provider acceptance and explicitly separate fixture UI evidence. Keep the bank small and use observed failures as regressions; it is a safety proof, not an exhaustive ontology of customer questions. Later approved datasets can enrich Product Truth and phrasing without changing authority boundaries.

Sessions and Questions remain process-local; approved phrasing is finite; local retrieval is conservative. No general factual answers, arbitrary paraphrase validation or arbitrary-corpus coverage are claimed. Real-provider screen rehearsal may be useful later but is not needed to duplicate these completed P5 checks. No P6 work was performed. P5 is committed and pushed at 0f44c11 on p5-governed-knowledge.
