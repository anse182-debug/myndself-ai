# Technical audit: first hardening iteration

Implemented on the staging branch and separate test services; production is
not deployed or migrated by this iteration.

## Access and abuse controls

Personal /api, /agent and /tasks routes require Supabase authentication in every
runtime mode. Supplied user_id/userId mismatches are rejected before handlers;
legacy handler ownership is injected from verified identity. Authentication is
cached only on that request. Chat aliases share bounded role validation.
Legacy mood insert accepts only mood/note and server-owned user/time fields,
checks database insertion errors, and ignores client-controlled extra fields.

Exceptions are exact method/path pairs: public subscription; PDF sharing through
an existing hashed, expiring and revocable capability token; two job routes
protected by their dedicated credentials. A normal user token cannot authorize
jobs. Capability-link recipients do not need a patient account.

An IP envelope limits 120 requests/minute before authentication work. Additional
request budgets: 12 AI-route requests/account/minute, 120 general requests/IP or
account/minute, and 5 subscription requests/IP/minute. Limits are per process,
not a distributed quota or guaranteed billing ceiling. One trusted proxy hop
assumes the Render deployment topology; verify it before changing host topology.
CORS uses exact allowed origins (including the stable test site), not wildcard
access. Set CORS_ORIGIN explicitly before any production rollout with a different
frontend domain. Existing clients must send bearer tokens for personal APIs.
Token snippets and the mentor request-body log were removed. Generic failures
replace some provider/database messages in client responses; broader log/PII
minimization remains work to complete.

## Reproducible dependencies and release checks

Both components now have committed lockfiles and install with npm ci. Node
24.19.0 is pinned for local/CI and backend; Vercel frontend uses its supported
24.x major. Fastify and compatible plugins, Vite/React plugin and Tailwind were
updated. Tailwind 4 uses its supported PostCSS plugin and @config bridge for
custom theme configuration. Modern browser compatibility must be considered
before rollout to older devices.

CI installs frozen dependencies, runs backend tests and frontend build, and
fails on high/critical audit findings. GitHub Actions are pinned by commit.
32 local tests pass; frontend build and frozen installs passed. Final npm audit
reports zero findings for backend production dependencies and for the complete
frontend dependency tree. This is registry advisory evidence, not proof that
application code has no vulnerabilities. GitHub branch protection and actual
remote CI outcome have not been independently configured/verified.

The /health endpoint is a liveness probe, not database/model readiness. Startup
now exits with a failure status on listen errors instead of logging a fake
successful startup. Deployment rollback should redeploy a previously verified
commit in the test service first; database changes require their own plan.

## Schema and restore evidence

000_baseline.sql contains the observed application public schema: tables,
constraints, indexes, function, views with security options and role policies.
It has no rows and is for an EMPTY Supabase project with its platform auth
schema already provisioned. Follow with 001_reflection_sessions.sql. Do not
run the baseline against the existing production or test database. This is not
a full export of Supabase Auth configuration, storage, scheduled jobs, user
accounts or all platform settings. No automatic baseline adoption/version
ledger is provided for populated databases yet.

Run an isolated drill with a securely supplied management credential:

    node --use-env-proxy backend/scripts/restore-drill.mjs

The script refuses projects other than the known myndself-test project. It
restores the baseline into a random scratch schema, creates one synthetic user
and row, serializes that row outside PostgreSQL in memory, restores it into a
new table and checks full-row equality. The observed drill passed and removed
the schema and account afterward. No production rows were accessed or copied.
This demonstrates schema and synthetic-row restoration, not full production
backup/PITR recovery, disaster recovery time or backup retention guarantees.

## Still required before production promotion

- Complete input/provenance validation across remaining legacy handlers.
- Minimize all sensitive logging; implement/test full data export, deletion and
  retention including providers and backup handling.
- Establish production backup schedules, encrypted storage and measured RPO/RTO.
- Add a migration ledger, drift checks and explicit forward/rollback procedures.
- Configure branch protection and observe CI before gating production releases.
- Add distributed request budgets if services run multiple instances.
- Independent security and mental-health safety review.
