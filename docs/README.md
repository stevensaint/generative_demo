# Documentation index

Start at [repository handoff](../HANDOFF.md) and [application README](../README.md).
Current implementation: P4 text agent on local `p4-text-agent`, uncommitted and
unpushed. **P4 PASS**: automated checks, real Claude HTTP acceptance and live browser checks.
[P4 scope status](P4-scope-status.md): user-supplied frozen scope is available.
P3 baseline is pushed at `7ff7ef6` (documentation checkpoint `356db83`).

| Phase | Primary record | Supporting documentation/evidence |
| --- | --- | --- |
| P0 | [Validation](P0-validation.md) | clean-checkout-evidence.txt, http-runtime-evidence.json, browser-dev-ended.jpg, browser-built-ended.jpg |
| P1 | [Validation](P1-validation.md) | P1-check-evidence.txt, P1-http-evidence.txt, P1-browser-review.jpg |
| P2 | [Validation](P2-validation.md), [Pack authoring](P2-product-pack.md) | P2-check-evidence.txt, P2-http-evidence.txt, P2-pack-evidence.txt, P2-runtime-evidence.txt, P2-browser-handoff.jpg |
| P3 | [Validation](P3-validation.md), [Engine](P3-engine.md) | P3-check-evidence.txt, P3-http-evidence.txt, P3-pack-evidence.txt, P3-runtime-evidence.txt, P3-browser-evidence.txt, P3-browser-rejected.jpg, P3-browser-approved.jpg |

| P4 | [Frozen scope](architecture/P4-frozen.md), [Validation](P4-validation.md), [Engine](P4-engine.md) | P4-check-evidence.txt, P4-http-evidence.txt, P4-pack-evidence.txt, P4-runtime-evidence.txt, P4-browser-evidence.txt, P4-browser-capture.jpg, P4-live-evidence.json, P4-live-attempt-01.json, P4-live-evidence.txt, P4-live-browser-evidence.txt, P4-live-browser-ended.jpg |

Phase records describe the implementation at that phase, so statements such as
“P3 not started” in historical P2 records do not describe the current code.
The P2 browser handoff supplement is explained in the P3 validation record.
Logs/screenshots are saved locally here and travel with the repository.

The complete original architecture source is not included; prior-phase records
qualify recovered criteria. The user-supplied P4 source is saved here. See the
handoff before extending the roadmap. P5 has not started.

[ElevenLabs build/buy review](ElevenLabs-build-buy-review.md) records provider
overlap, reuse recommendations and the preference to avoid manual Terminal work.
