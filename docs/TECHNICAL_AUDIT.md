# Technical audit: first hardening iteration

## Logging and observability follow-up

Application runtime logs now use static event catalogs and explicit allowed
fields. Error objects, messages, stacks, email/user IDs, body, query, cookies
and credentials are discarded. Server-generated request IDs and registered
route templates correlate errors; generic framework/404 responses prevent
echoing input. Per-process 60-second counters report errors, 429, slow requests
and max duration; >=5% server errors with >=20 requests emits a degradation
event in logs. Fatal events exit without printing error content. Client logs
contain static events only. 46 backend tests, 5 policy tests, build and local
full-process validation passed. Test deployments on 64d4b10 are live; public
checks and browser export/delete flow passed. Render log-read API returns 403,
so remote log content remains uninspected through that API. Automatic external
notifications, historical-log cleanup, platform log controls and retention
remain outstanding. See [OBSERVABILITY.md](OBSERVABILITY.md).

## Recent-authentication follow-up

Account deletion now requires a recognized AMR authentication timestamp within
10 minutes from the exact bearer already verified by Supabase getUser. JWT iat
and account-wide last_sign_in_at cannot renew this privilege. Both challenge
and execution enforce the check; the UI offers local sign-out and a new login
when denied. Test deployments on 47add80 are live. 39 backend tests and build
passed. Published browser checks covered successful fresh-session deletion
and rejection of a genuinely signed refreshed session whose synthetic AMR
record was aged past the limit in test. The latter preserved the account and
successfully prompted local sign-out. All synthetic accounts were removed,
no email sent. External-copy procedures, log retention, backup and production
release requirements remain separate outstanding work.

## Personal-data follow-up

The test-only migration 002 adds service-role RPC for owned-row export and
atomic active database/Auth deletion, plus account-existence write guards.
The user chose to retain journal/reflections while the account is active.
The UI exposes JSON export and typed deletion confirmation with explicit
external-copy limitations. Backend challenges are session-bound and expire;
responses are no-store and failures do not claim success. Legacy chat calls
now explicitly set store:false; provider log retention is not thereby removed.
Live two-account synthetic verification covered the 16 tables, cross-user
rejection, anonymous RPC denial, rollback on an injected cleanup failure,
deletion preserving the other account, rejected deleted sessions and orphan
writes. Fixtures were removed. 37 backend tests and the frontend build passed.
See [PERSONAL_DATA.md](PERSONAL_DATA.md) for scope, inventory and remaining
work: recent reauthentication, external-copy handling, log retention and
independent review before production. No production migration was applied.

## CI and branch protection follow-up

Checks now includes a governance job covering release policy and management
script syntax. A GitHub API runner verifies the current remote staging commit,
successful Checks workflow and app-bound job results before proposing or
applying main protection. The agreed solo-maintainer policy requires PRs,
current successful checks and resolved conversations, including for admins,
without a second reviewer. Existing protection is never silently replaced.
Local frozen installs, 32 backend tests, 5 policy tests, audits and frontend
build passed. GitHub API access is currently blocked by proxy egress policy;
api.github.com was added to the saved cloud draft, requiring publication.
Remote CI and actual main protection remain unverified/unapplied. See
[RELEASE_CHECKS.md](RELEASE_CHECKS.md).

## Migration ledger follow-up

The test database now has a private migration ledger with SHA-256 checksums
for the two existing migrations, adopted without replaying their SQL. The
test-only runner checks observed schema metadata against its committed
reference and last recorded state. Pending migration DDL, ledger writes and
post-schema validation share a transaction. Live synthetic checks verified
commit, rollback of both DDL and ledger on mismatch, and detection of a schema
change outside the runner. Fixtures were removed. See
[DATABASE_MIGRATIONS.md](DATABASE_MIGRATIONS.md) for scope and limitations.
No production adoption or migration was performed; backups remain suspended.

## Backup follow-up (13 October 2026)

Read-only management API inspection confirms the organization is Free, with
zero listed backups and PITR disabled for both production and test. The user
chose encrypted external backups while remaining on Free. See
[BACKUP_RECOVERY.md](BACKUP_RECOVERY.md) for the operational prerequisites,
restore isolation, data scope and completion criteria. The metadata checker
`backend/scripts/backup-preflight.mjs` was executed and correctly exited 2
for the unprotected managed-backup state. The synthetic restore drill passed
again and cleaned up. No real production data was exported; external storage,
database connectivity, encryption keys, scheduling and full recovery remain
to be configured. This does not establish an operational backup.

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

## Live test deployment verification

Render now builds with npm ci and checks /health; Vercel test also installs with
npm ci. Both test deployments are live. A real two-account synthetic audit
confirmed 401 for anonymous legacy reads, successful owner-injected mood
creation/read, 403 for cross-user reads/writes and aliases, rejection of ordinary
sessions on job endpoints, anonymous PDF access with a valid capability and
rejection after revocation, and 429 for the thirteenth AI-route request. Invalid
chat bodies were used for the rate-limit drill to avoid model charges.
Accounts and fixture records were removed afterward. No production operations
were performed.

Published UI viewport checks at 320/360/390px and the complete short journey
(edited summary, ratings, idempotent save, resume and synthetic urgent branch)
passed after the framework/toolchain updates. HTTPS-verified browser transport
and suppressed welcome emails were used as in earlier staging checks. There
are 32 local tests. Remote GitHub CI status is still not independently observed.
The new cloud npm-ci installation/startup instructions are saved as a draft;
review/save/publish the environment to activate and retain them for later tasks.
Production still runs the previous implementation: promoting this security
revision requires a coordinated frontend/backend rollout, authentication-aware
clients, exact CORS origins, and a separately reviewed database/backup plan.
