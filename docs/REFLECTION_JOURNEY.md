# A moment for yourself: pilot workflow

The Un momento / A moment tab replaces the old guided frontend workflow with
an intention-led short conversation: vent, understand, or find calm. It closes
after three user turns, or sooner when the user chooses. Three minutes is an
approximate invitation, not a timer or a promised benefit. Users can stop,
skip the question by closing early, edit the summary, and choose an optional
small step themselves.

Only an explicitly saved, edited summary is persisted, with the optional step,
clarity ratings (1–5, before/after) and felt-understood response. Transcript
messages are sent to the model but not stored by these endpoints. Model requests
set store:false; this is not a promise about provider retention policies.
The session does not automatically use or populate semantic AI memory. Resuming
an earlier summary requires an explicit click. The account-scoped session ID
makes save retries update the same record rather than double-counting sessions.

New authenticated endpoints:

- POST /api/journey/turn: bounded conversation; reply, summary, urgent, final.
- POST /api/journey/save: edited summary and optional feedback, owner from token.
- GET /api/journey/latest: the requesting user's latest explicitly saved summary.

Apply backend/migrations/001_reflection_sessions.sql only to the test database
for this iteration. Production deployment and migration are not part of this
change. Row-level security scopes records to their owner.

The urgent-help panel is always accessible. A limited matcher recognizes some
explicit self-harm intentions, and model output can also flag urgent support.
These mechanisms can miss risks or misunderstand text; they are not a clinical
triage system. On the urgent path, the ordinary exercise stops and emergency
and trusted-person guidance is shown. No emergency contact is made by the app.
Professional review and structured safety evaluations are required before
clinical positioning. Do not use crisis scenarios as casual user-testing tasks.

## Pilot with 5–10 consenting adults

Use the separate test site. Ask participants to choose an ordinary, non-crisis
situation. Observe whether they can choose an intention, complete or leave the
conversation, correct a summary and understand what is saved. Ratings are
optional, and users can stop without explanation. Gather whether the summary
feels accurate and whether they would voluntarily return.

Success signals: participants understand the controls, describe a useful
moment in their own words, and choose to return. Compare clarity ratings only
when both exist; do not treat skipped responses as zero. This small,
self-selected pilot does not establish clinical efficacy or causal improvement.
Stored measures cover saved sessions only; abandoned sessions are not tracked.

Run:

    node --test backend/agent/reflection.test.js backend/agent/memory.test.js backend/agent/journey.test.js
    cd frontend && npm run build

Live smoke tests must use synthetic accounts in the test project and remove
their records afterward. Suppress welcome-email delivery during browser tests.
