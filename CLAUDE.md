# Claude repository instructions

Read [HANDOFF.md](HANDOFF.md), [README](README.md), [frozen P5](docs/architecture/P5-frozen.md) and [P5 validation](docs/P5-validation.md) before editing. Inspect branch and working changes. P4 is pushed at 9314fae on p4-text-agent; P5 is committed and pushed at 0f44c11 on p5-governed-knowledge. Preserve its validated baseline. Main remains P0.

P4 and **P5 PASS** are recorded. P5 has 68 automated tests, 12 TCP tests, 50 deterministic Q&A cases plus a successful 51-turn real-provider rehearsal, and separate fixture browser evidence. The Guard supports model-selected approved phrase variants/order, not unrestricted paraphrases. Preserve that explicit limitation and do not start P6 without user authorization. Do not mistake local-policy turns or fixture inference for real provider calls.

Generic core/frontend must contain no Acme semantics or Pack imports. Product Pack owns domain rules, presentation and authored Product Truth. The AI requests; the Controller validates; the State Engine makes it true. GDE owns memory; models receive narrow context. Product Model controls what can be shown; Product Truth controls what can be said.

Claude is authorized for P4/P5 structured control and governed answer plans, never model-memory product claims. Claim Guard fails closed; qualifications remain. Customer facts and demo assumptions never become Product Truth. Questions and evidence remain inspectable; no hidden chain-of-thought or credentials.

No P6, voice implementation, proprietary materials or unnecessary infrastructure. ElevenLabs owns future voice and turn timing. User prefers no manual Terminal work; use authorized tools and explain real blockers. Full original architecture is absent, while frozen P4/P5 sources are saved. Do not invent prior criteria. Run documented checks and update handoff/phase evidence with actual results.
