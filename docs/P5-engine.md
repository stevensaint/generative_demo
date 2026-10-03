# P5 governed knowledge implementation

The frozen authority is [P5 scope](architecture/P5-frozen.md). P5 extends the existing single GDE Agent and deterministic Controller; no new reasoning service, database, ingestion system or voice implementation is introduced.

## Authority and retrieval

The fictional Acme Pack is version 0.5.0. Its authored Product Truth contains 40 atomic facts and 24 approved question families; knowledge and Demo Policy versions are both 1.0.0. Facts carry stable IDs, category, approval availability status, version/effective date, source references, qualifications, prohibited extensions and authored phrase variants. `available` means approved for this fictional demonstration, not commercially available software.

`KnowledgeProvider` and `LocalKnowledgeProvider` live in packages/knowledge. Local retrieval uses conservative family/example mappings and two bounded synthesis bundles. It supplies at most six relevant facts, one matching family, qualifications and evidence metadata to the existing ContextBuilder. Navigation context remains bounded; neither the corpus nor full transcript is dumped into a model request. Lane and screen are supplied as context; screen mappings govern narration. This is deliberately conservative deterministic retrieval, not general semantic search.

Only the repository-authored Product Truth is authority. UI projections, executable Product Model behavior, customer statements, demo parameters, model memory and external documentation cannot add facts. Unmatched, ambiguous, conflicting, superseded, unavailable, future-effective or version-mismatched evidence fails closed. Conflict detection includes opposing authoritative facts outside the selected subset.

## Claim Guard and phrasing limit

There are exactly three product-answer modes: APPROVED_QA, EVIDENCE_SYNTHESIS and ESCALATION. Seven question classifications distinguish navigation, approved product questions, customer-specific implementation, commercial, roadmap, unsupported and unclear questions.

Claude returns a runtime-validated `answerPlan` inside DemoTurnProposal: mode, family ID, pinned knowledge version and ordered fact/style selections. ClaimGuard verifies the complete allowed fact set, references, mode, version, qualification and availability. It then joins authored full/brief/conversational phrases and appends required qualifications. Unknown prose fields, invented references, omitted facts/qualification, authority mismatch and excessive answer length escalate. There is no second AI judge.

**Explicit limitation:** this first implementation permits selection and ordering of approved phrases, rather than unrestricted model-authored paraphrasing. The claim envelope is structurally enforced, but flexibility in shortening, simplifying and tailoring emphasis is limited. The final corpus offers distinct concise and conversational variants for all 40 facts; live evidence demonstrates model-selected phrasing within those envelopes. Unrestricted naturalization is not claimed. Widening this requires a reviewable claim-validation approach; do not claim arbitrary paraphrases are safe or silently remove this constraint.

Screen narration uses approved fact references with bounded depth through the same Guard. The Controller generates narration from the acknowledged post-action state; the Twin itself never authorizes a claim. Missing evidence yields a nonfactual invitation to continue. Authored display text remains fictional Pack presentation, not evidence for provider claims.

## Orchestration and records

Customer text → narrow retrieval/classification → single Agent proposal → runtime validation → Controller/State Engine → guarded response. Navigation still uses semantic actions and existing atomic transactions. Product questions cannot smuggle demo actions through their answer proposal. Unsupported policy categories can escalate locally without a provider call; ambiguous questions receive a concise clarification.

Session pins include Pack, knowledge and Policy versions. The Controller freezes a cloned Pack, and LocalKnowledgeProvider snapshots its corpus. Active sessions cannot silently acquire changed source definitions. No migration or hot reload is implemented.

`SessionView.questions` holds first-class structured records with question/session/turn IDs, participant, text, classification, ANSWERED/ESCALATED/UNRESOLVED status, answer mode, knowledge references, family, knowledge version, final answer, reason and timestamp. These operational records are separate from canonical Product/Demo/Customer/Conversation state so provider failures and malformed output preserve the question without mutating product reality. Snapshots include questions; authorized refresh retrieves them. Storage remains process-local and does not survive server restart.

DemoTurn records carry knowledge traces. KNOWLEDGE_RETRIEVED, APPROVED_ANSWER_USED and QUESTION_ESCALATED use the existing session event backbone; earlier events remain intact. Ordinary chat displays no internal fact IDs. Developer conversation details expose structured traces intentionally. No hidden chain-of-thought, credentials or raw provider errors are recorded.

## Evaluation and operation

The authored bank in tests/fixtures/p5-qa-bank.json has 20 normal, 10 ambiguous, 10 boundary and 10 adversarial cases. The named Make GDE Lie group rejects authority spoofing, unsupported integrations, compliance, roadmap and implementation promises. Assertions evaluate classification, sufficiency, mode, references, qualifications and permitted claim content, rather than requiring model-selected exact prose. A discovered audit identity gap became a permanent boundary fixture: this synthetic audit panel cannot prove authenticated human actors.

`npm run check`, `npm run test:http`, `npm run validate:knowledge`, `npm run validate:pack` and `node scripts/test-pack-runtime.mjs` are deterministic checks. `npm run validate:knowledge:live` independently starts a real-provider HTTP rehearsal and saves credential-free results. The test-only browser preview uses an injected fixture provider; it is neither production fallback nor evidence of Claude behavior. See [validation](P5-validation.md) for the completed PASS evidence and limits.

Stop before P6. ElevenLabs owns future voice, interruption and turn timing; no voice infrastructure belongs in this phase.

## Final phrasing refinement and live retry

All 40 facts now have distinct reviewed full, brief and conversational variants. Claude can choose concise wording and fact order within the same approved semantic envelope; required qualifications are still appended by the Guard. This improves naturalization without permitting unrestricted prose or adding a second model. The structural limit remains explicit. The final corpus passed 68 tests, 12 real TCP tests, builds, Pack validation and startup checks.

The sandbox retry remained blocked, then the user ran the same script locally: all 51 turns passed. P5 PASS is recorded with finite phrase-choice limits explicit. No provider restrictions were bypassed and no P6 work was started.
