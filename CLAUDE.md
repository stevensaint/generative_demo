# Claude repository instructions

Start with [HANDOFF.md](HANDOFF.md), [README.md](README.md), and
[docs/P3-validation.md](docs/P3-validation.md). Inspect the branch and working
tree before editing. The validated P3 baseline is pushed at `7ff7ef6`; check
HANDOFF.md and docs/P4-scope-status.md for the next phase status.
Preserve existing changes and do not assume GitHub main is the latest phase.

Follow the frozen boundaries documented in HANDOFF.md. Generic engine,
contracts and frontend must not contain Acme/product object semantics. Put
domain rules, deterministic handlers and presentation in the Product Pack.
Do not add provider APIs, voice, proprietary materials or infrastructure outside
the authorized phase. Reading this file does not authorize P4 or any later work.

The full original architecture source is absent; do not invent missing frozen
criteria. Use the recovered phase records and obtain approved scope when needed.

Validate changes with the commands in README.md, record actual results and
limitations, and keep HANDOFF.md and phase documentation current. The repository
should be understandable and runnable without the originating chat.
