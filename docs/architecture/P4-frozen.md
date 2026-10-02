# P4 — Text GDE Agent

Source: user-supplied frozen P4 section, 2026-10-02. This is the authoritative P4
phase scope. The complete frozen P1–P3 sections have not been supplied; their
historical validation records qualify evidence against recovered criteria.

## Goal

Add conversational control before voice.

Build:

- ModelProvider
- Claude provider
- GDEAgent
- ContextBuilder
- PromptBuilder
- DemoTurnProposal schema
- Demo Turn executor/orchestration
- Customer text chat input

Runtime flow:

**Customer text → GDE Agent → structured DemoTurnProposal → Demo Controller → State Engine → Demo Twin → text response**

The GDE Agent owns:

- interpreting customer input
- understanding intent
- Customer Model reasoning
- demo planning
- deciding what should happen next
- narration intent
- requesting semantic demo actions

The GDE Agent does not own:

- product state
- Demo State authority
- workflow transitions
- permission enforcement
- product truth
- UI manipulation
- arbitrary application execution

Canonical rule:

> The AI requests. The Controller validates. The State Engine makes it true.

## DemoTurnProposal

Claude must return structured output conforming to a runtime-validated schema.
Conceptually:

```
DemoTurnProposal {
  understanding
  customerModelUpdates
  requestedActions
  narrationIntent
  questionHandling
  nextStep
}
```

Exact schema may evolve during implementation, but it must preserve the
architectural separation between interpretation and authority.
Malformed model output must never mutate state.

## Model context

Each model call should receive only the structured context needed for the
current turn, such as:

- current customer input
- Customer Model
- current Demo State
- relevant Product State summary
- current Demo Lane
- relevant Demo Policy
- currently available semantic actions
- recent conversational context
- outstanding questions

Do not dump the entire application state, full historical transcript, or
unrelated Product Pack content into the model.

> GDE owns memory. The model receives context.

## Demo planning

Demo planning is a responsibility inside the single GDE Agent. Do not create a
separate Demo Planner service for V0.

The Agent may decide what is relevant, what lane or branch to pursue, what to
demonstrate next, how deeply to explain, whether to ask a clarification, and
whether to follow a customer redirection. The Demo Controller still decides
whether the requested action is allowed.

## Customer redirection

The text agent should naturally handle commands and redirections such as:

- “Go back.”
- “Show me QA.”
- “Skip this.”
- “What happens next?”
- “We don’t work that way.”
- “Show me the exception.”
- “Can you switch roles?”
- “I care more about external labs.”
- “Stop.”
- “End the demo.”

Customer redirection priority remains:

1. Product truth / system rules
2. Explicit customer request
3. Demo Policy
4. Agent planning
5. Default demo path

## P4 product-Q&A boundary

P4 is conversational demo control only. It does not yet contain the governed
Product Truth / Approved Q&A / Claim Guard system that arrives in P5. Therefore
Claude must not answer open-ended substantive product questions from model
memory. If the customer asks a factual product question not covered by
predefined bounded P4 narrative, use a safe temporary response such as:

> “That’s a good question. I don’t want to overstate what this demonstration supports yet, so I’ll capture that for follow-up.”

Then preserve the question and continue the demo where appropriate. Do not
allow Claude to improvise product capabilities, integrations, implementation
behavior, compliance claims, roadmap, licensing, configuration possibilities,
or unsupported workflows. P5 will unlock governed product Q&A.

## Narration

Narration should be concise, conversational, product-centered, responsive to
customer interest, shorter than traditional scripted demo narration, and able
to pause and redirect. Prefer **show → explain briefly → listen** over
**explain extensively → eventually show**. Claude should not narrate
implementation commands or internal system mechanics. The customer should hear
what the product experience means, not what the software engine is doing.

## Customer Model updates

The Agent may propose updates based on the conversation: responsibility,
problem, goal, interest, terminology, explicit customer fact, correction.
Updates must preserve provenance and confidence/status semantics. Customer
corrections override prior inference. Do not convert demo assumptions into
customer facts.

## Actions

Claude requests semantic actions only. Examples:

```
NAVIGATE
OPEN_RECORD
RETURN
SHOW
HIGHLIGHT
FILTER
SET_PARAMETER
SWITCH_ROLE
SWITCH_SITE
START_TEST
ENTER_RESULT
SUBMIT_TEST
TRIGGER_EXCEPTION
OPEN_EXCEPTION
SUBMIT_FOR_REVIEW
APPROVE
SHOW_AUDIT_HISTORY
RESET
```

Claude must never manipulate pixels, DOM selectors, database rows, or arbitrary
UI state directly. Every action still passes through:

**Demo Controller → State Engine → Event recording**

## Events added in P4

Add/expand structured events including:

```
CUSTOMER_SPOKE
INTENT_DETECTED
CUSTOMER_MODEL_UPDATED
DEMO_TURN_CREATED
```

Existing P0–P3 event behavior remains intact. A Demo Turn should make it possible
to inspect what the customer said, how GDE interpreted it, Customer Model
changes, requested actions, approved/rejected actions, narration intent, and
resulting state. Do not record hidden model chain-of-thought. Structured
operational reasons are acceptable.

## Invalid AI behavior

Invalid AI requests must be harmless. Example: Claude requests an unsupported
action. The Controller returns something like CAPABILITY_NOT_AVAILABLE. State
remains unchanged, rejection is recorded, and the Agent can recover
conversationally. Claude never bypasses the Controller.

## P4 PASS gate

P4 passes when all of the following are demonstrated:

1. Customer can control the demo through natural-language text.
2. At least ~10 representative natural-language commands/redirections work.
3. Claude outputs structured, runtime-validated DemoTurnProposal objects.
4. Valid semantic actions execute through the Controller and State Engine.
5. Invalid AI actions are rejected without corrupting state.
6. Customer redirection works naturally.
7. Demo State and Product State remain coherent.
8. Customer Model updates can occur from conversation with provenance preserved.
9. Demo Turn events make the interaction inspectable.
10. Claude has no direct UI/state authority.
11. Open-ended substantive product Q&A is not answered from model memory.
12. Unsupported factual questions receive the temporary safe capture/escalation response.
13. The deterministic P0–P3 architecture remains intact.

## What P4 proves

> Natural language can control the deterministic GDE without giving the language model authority over product reality.

P4 does not yet prove that GDE can safely discuss the product in depth. That is
the purpose of **P5 — Governed Knowledge & Claim Safety**.
