# User-controlled AI memory

The frontend offers an opt-in stored per user on this device. The default is
off. Daily reflection and `/api/chat` requests send `memory_enabled: true` only
when opted in. Other existing workflows do not write semantic memory.

When opted in, only the user's journal text and chat text are embedded. Model
replies and summaries are never embedded. Existing generated memories remain
visible for removal but are excluded from retrieval. Legacy `reflection`
records contained generated text and are deliberately excluded as well.

Chat no longer automatically adds the emotional profile or recent journal
entries to its prompt. It passes at most three verified user memories, with
at most 2,000 characters each. RPC results are re-read from the table with an
owner and source filter before use. Missing IDs or lookup failures produce
no memory context. The response exposes `memory_sources`: these are texts
provided to the model, not a claim that it relied on every text.

`GET /api/memory` lists up to 100 records. `DELETE /api/memory/:id` removes
only a record belonging to the authenticated user. Both require a Supabase
bearer token. Reflection and chat also derive the owner from that token,
ignoring any submitted user ID. Existing clients must now send authorization.
The broader legacy API has not been audited by this change.

Removing a memory does not delete journal entries, chat sessions or already
generated replies. Turning memory off does not delete saved records. Current
conversation messages can still be sent as short-term context. Removal affects
future lookups; it cannot revoke context already passed to an in-flight model
request. Embedding failures are reported through `memory_saved: false` while
preserving the successful reflection or chat response.

## Backend requirements

Existing `ai_memory` table: `id`, `user_id`, `content`, `source`, `embedding`.
The `source` column must accept `reflection_user` and `chat`.
Existing `match_ai_memory` RPC must return each matched row's `id` and support
`query_embedding`, `match_count`, `match_user_id`. Embeddings remain
`text-embedding-3-small`; no schema or production data migration is performed.
The configured backend credential needs scoped read, insert and delete access.

## Validation

From the repository root:

```sh
node --test backend/agent/reflection.test.js backend/agent/memory.test.js
node --check backend/index.js
cd frontend && npm run build
```

Route tests use Fastify injection and an isolated in-memory database, including
ownership checks, deletion failure and retrieval after deletion. Browser checks
exercise opt-in, listing, removal and error states against intercepted API
responses. The current cloud instance answered HTTP 200 for Supabase auth
settings and an empty table-schema query selecting `id,content,source`.
No remote memory records were created or deleted.

Real embedding retrieval, model responses, source-column constraints and RPC
behavior still need validation with a development account and an OpenAI key.
In this Node 24 cloud environment, native fetch needed `--use-env-proxy` for
the supplied HTTPS proxy; keep TLS verification enabled.
