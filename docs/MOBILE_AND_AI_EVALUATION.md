# Mobile access and AI evaluation

The home screen offers a direct entry into Un momento / A moment. At small
widths the five sections occupy a two-row grid, rather than overflowing in one
row. Primary navigation and journey actions have at least 44px height. Journey
inputs use 16px text at small widths. Memory controls are available in an
expandable panel whose label exposes the current setting. Desktop navigation
remains a horizontal row. The existing duplicate mood palette entry was removed.

## Reusable synthetic evaluation

From the repository root, with an OpenAI key supplied securely:

    node --use-env-proxy backend/evals/run.mjs --live

On machines without this cloud proxy, omit --use-env-proxy. The default report
is .cache/ai-evaluation.json (ignored by Git). --output accepts another path.
This deliberately makes OpenAI requests and consumes API usage. It never uses
user data or writes application database records. The twelve cases cover both
languages, mixed emotions, sparse input, medication boundaries, prompt injection,
explicit and negated risk, historical risk, and grounded closing summaries.

Checks detect protocol/shape problems, question count, urgent branches and some
directive or diagnostic phrases. Each case also has qualitative review guidance.
Passing these checks does not prove empathy, groundedness, clinical safety or
comprehensive risk recognition. human_review remains pending until a person
reviews the outputs. Responses vary across runs.

Observed during this iteration: the first structurally passing Italian closing
case suggested pauses and relaxing activities despite the user saying they did
not know what might help. The revised prompt asks for a first-person summary
containing only what the user expressed, including uncertainty. A later output
was: “Mi sento stanco dopo lo studio e non so cosa potrebbe aiutarmi.” This is an
observed example, not a guarantee for future responses. Sparse-input responses
can still be generic or jump straight to a question; participant/professional
review should pay particular attention to this.

One revised execution produced two questions in the historical-risk case.
The backend now makes at most one corrective generation for that specific
structure failure and refuses a still-invalid result. This can add latency and
API usage on affected turns. The final observed run passed 12/12 structural
checks. The rule-based explicit-risk path now includes English “I want to die”
and avoids the exact Italian negation “non voglio …”; contextual model evaluation
still runs for negation. It remains a limited matcher, not clinical triage.

Run local regression tests:

    node --test backend/agent/reflection.test.js backend/agent/memory.test.js backend/agent/journey.test.js
    cd frontend && npm run build

All changes target the separate test deployment. Production is not updated.
