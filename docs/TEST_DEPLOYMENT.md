# Test deployment: Vercel frontend and Render backend

The code supports a separate test deployment. The cloud environment snapshot
is not a website deployment. Test frontend: https://myndself-test.vercel.app
Test backend: https://myndself-api-test.onrender.com
Test Supabase project: weqoitbeyryuznclnzzr (Frankfurt).

## Prerequisites

- A dedicated Supabase development project with the existing application schema,
  RLS policies and functions. This repository has no complete database migrations;
  creating an empty Supabase project is insufficient. Do not copy real journal data.
- Access to a separate Render service and Vercel project or preview deployment.
- OpenAI credentials with access to gpt-4o-mini and text-embedding-3-small.
- A test account in Supabase Auth.

Some legacy backend endpoints accept user_id without authentication. Keep this
staging deployment restricted to testers and use only development data. The new
chat, reflection and memory endpoints require authenticated bearer tokens, but
that does not establish authorization for the entire legacy API.

## OpenAI in the Codex cloud environment

Add the key securely to the saved MYNDSELF_OPENAI_API_KEY requirement in
settings. Its allowed destination is api.openai.com. OPENAI_API_KEY is a
reserved proxy target; the backend now accepts either variable, preferring
MYNDSELF_OPENAI_API_KEY. Never put keys in frontend variables, source or chat.
Save the configuration and publish the environment. This step does not publish
the website. Node 24 native HTTPS requests in this environment need
NODE_USE_ENV_PROXY=1 to use the injected proxy.

## Render: separate backend service

Deploy the branch containing these changes as a Node web service:

- Root directory: backend
- Node version: 24.19.0
- Build command: npm install --package-lock=false --no-audit --no-fund
- Start command: npm start
- Render supplies PORT; the app listens on 0.0.0.0.

Set backend environment variables securely:

- MYNDSELF_OPENAI_API_KEY (or OPENAI_API_KEY)
- SUPABASE_URL: dedicated development project URL
- SUPABASE_KEY: development project key required by the current startup check
- SUPABASE_SERVICE_ROLE_KEY: development project service-role credential
- RESEND_API_KEY: test credential (currently needed by the Resend constructor)

Do not copy proxy placeholders from the cloud runtime to Render. Configure
provider-side secret values separately. No deployment token or credential is
included in this repository.

## Vercel: frontend preview

Deploy frontend as the root directory using the Vite preset:

- Build command: npm install --package-lock=false --no-audit --no-fund && npm run build
- Output directory: dist
- VITE_API_BASE: the public URL of the separate Render backend
- VITE_SUPABASE_URL: the development project URL
- VITE_SUPABASE_ANON_KEY: development project PUBLIC anon key

These VITE variables are public build inputs. Never use a service-role or OpenAI
key there. The existing vercel.json provides single-page application rewrites.
After obtaining the preview URL, add its /app URL to the development Supabase
Auth redirect allowlist. Redeploy if build-time variables change.

## Validation before sharing

Run from the repository root:

    node --test backend/agent/reflection.test.js backend/agent/memory.test.js
    node --check backend/index.js
    cd frontend && npm run build

Check backend POST /agent/ritual-message with JSON {} returns ritual:null and
reason:no_matching_mode. Anonymous GET /api/memory must return 401.

With a development account, sign in on the preview, submit a reflection and
verify it appears in the development database. Enable memory, submit another
reflection, send a related chat message and inspect the supplied sources. Remove
that memory and check it cannot be retrieved again. Disable memory and verify
new texts are not embedded. Do not send welcome or weekly emails as smoke tests.

Current local evidence: 14 tests passed and frontend build passed before the
OpenAI variable-alias change; backend syntax and tests passed after it. Real
OpenAI requests and public deployment remain pending credentials and hosting.

## Creating the missing test projects

Proposed names: `myndself-test` (Vercel), `myndself-api-test` (Render), and
`myndself-test` (Supabase). Use a free tier where available; stop if the account
requires a paid plan or has no free project capacity.

Management credentials required in secure cloud environment settings:

- VERCEL_TOKEN: Vercel account token, HTTPS destination api.vercel.com.
- RENDER_API_KEY: Render account API key, HTTPS destination api.render.com.
- SUPABASE_ACCESS_TOKEN: Supabase personal access token, HTTPS destination
  api.supabase.com. This is distinct from the database anon/service-role keys.
- MYNDSELF_OPENAI_API_KEY: OpenAI API credential, destination api.openai.com.

Vercel and Supabase management credentials are now present. Render remains missing.
After they are supplied, inspect account organizations/teams and existing
resources before creating anything. Choose the production project's owner
where unambiguous; ask only if multiple possible owners remain. Use an EU
region if available. Create fresh test resources, copy schema and required
functions/policies only, and create a new test user. Do not clone production
users, journal entries, vectors, email jobs, subscribers or data.

Do not reuse the current cloud bindings as test service credentials: the
existing Supabase URL refers to the production project. Provider credentials
for deployment must be configured at the providers, not exported from proxy
placeholders. Provider-side secret delivery remains to be resolved before
publishing. Provisioning is not complete until both services are deployed and
an authenticated browser workflow against the separate database passes.


## Latest runtime verification

OpenAI gpt-4o-mini returned a nonempty reflection for synthetic journal input;
text-embedding-3-small returned a 1,536-dimensional embedding. The OpenAI SDK
now uses native fetch so Node 24 proxy configuration applies. Local backend
startup and the non-mutating ritual smoke request passed; anonymous memory
access returned 401. All 14 local tests passed after the transport change.

Provisioning attempts: Vercel project creation in the existing production team
returned HTTP 403 forbidden. Supabase project creation in the production
project's organization returned HTTP 403 Forbidden, with plan explicitly free.
Production project listing succeeded for both providers. No new project or
public deployment was created, and no production data was modified. Update
credentials/account permissions for resource creation and configure
RENDER_API_KEY securely before resuming provisioning.


## Deployment completed

The refreshed credentials allowed separate project creation. Vercel project
myndself-test has a READY deployment from staging/ai-memory; Render service
myndself-api-test is live on its free plan. The dedicated Supabase database
has copied schema only: 15 tables, 19 views (with original view security options),
7 policies and one custom function, plus constraints and indexes. No production
rows were copied. Test backend runs with STAGING_MODE=true: application API
routes require test-project authentication and reject mismatched user IDs.
Existing OpenAI and Resend credentials were transferred provider-to-provider
in memory, without logging or writing their values to files. Production service
configuration was not changed. No cron credentials or scheduled jobs were copied.

Vercel build variables reference only the test API and public test Supabase key.
Supabase Auth redirects are configured for the stable test frontend URL and
its deployment URL. Remote provider status confirms deployment success; a full
signed-in smoke test is still outstanding because direct requests to the new
hosts are cancelled in the current cloud instance. New hostname allowlist
entries have been saved in the environment draft and need runtime activation.

## Live validation completed

After network-policy activation, frontend GET /app returned 200 and anonymous
backend GET /api/memory returned 401. A synthetic user in the test project
successfully authenticated, saved a generated reflection and its embedding,
received a chat reply with that reflection's verified source, removed the
memory, and confirmed memory-disabled chat does not save or retrieve memories.
All synthetic user rows and the user account were removed afterward.

The deployed UI was also exercised with a synthetic authenticated session:
rendering, default-disabled opt-in, submitting the reflection form, listing
memory and deleting it all passed. Chromium's proxy-certificate trust remained
unresolved, so the browser's requests were relayed through native fetch with
TLS verification enabled, retaining actual deployed URLs and API responses.
Only welcome-email delivery was intercepted to prevent sending test emails.
Email magic-link delivery itself was not tested. No production data or service
configuration was modified. Live frontend: https://myndself-test.vercel.app/app.
