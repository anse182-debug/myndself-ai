import test from "node:test"
import assert from "node:assert/strict"
import Fastify from "fastify"
import { registerMemoryRoutes, resolveUserMemories, saveUserMemory } from "./memory.js"

function database(initial, failing = false) {
  let rows = structuredClone(initial)
  let calls = 0
  return {
    get rows() { return rows },
    get calls() { return calls },
    from(table) {
      calls++
      assert.equal(table, "ai_memory")
      const filters = []
      let remove = false
      let count = Infinity
      const query = {
        select() { return query },
        delete() { remove = true; return query },
        eq(key, value) { filters.push(row => String(row[key]) === String(value)); return query },
        in(key, values) { filters.push(row => values.map(String).includes(String(row[key]))); return query },
        limit(value) { count = value; return query },
        insert(row) {
          if (!failing) rows.push(row)
          return Promise.resolve({ error: failing ? new Error("offline") : null })
        },
        then(resolve, reject) {
          if (failing) return Promise.resolve({ data: null, error: new Error("offline") }).then(resolve, reject)
          const matches = rows.filter(row => filters.every(filter => filter(row)))
          if (remove) rows = rows.filter(row => !matches.includes(row))
          return Promise.resolve({ data: matches.slice(0, count), error: null }).then(resolve, reject)
        },
      }
      return query
    },
  }
}

const seed = [
  { id: 1, user_id: "alice", content: "Mi manca casa", source: "chat" },
  { id: 2, user_id: "bob", content: "Private text", source: "chat" },
  { id: 3, user_id: "alice", content: "AI interpretation", source: "chat_reply" },
]

async function server(db) {
  const app = Fastify()
  registerMemoryRoutes(app, {
    supabase: db,
    authenticate: async (req, reply) => {
      if (req.headers.authorization === "Bearer alice-session") return { id: "alice" }
      reply.code(401).send({ error: "invalid_token" })
      return null
    },
  })
  await app.ready()
  return app
}

test("anonymous requests cannot read or delete memory", async t => {
  const db = database(seed)
  const app = await server(db)
  t.after(() => app.close())
  for (const method of ["GET", "DELETE"]) {
    const res = await app.inject({ method, url: method === "GET" ? "/api/memory" : "/api/memory/1" })
    assert.equal(res.statusCode, 401)
  }
  assert.equal(db.calls, 0)
})

test("listing uses authenticated owner despite supplied user_id", async t => {
  const app = await server(database(seed))
  t.after(() => app.close())
  const res = await app.inject({ url: "/api/memory?user_id=bob", headers: { authorization: "Bearer alice-session" } })
  assert.equal(res.statusCode, 200)
  assert.deepEqual(res.json().items.map(item => item.id), [1, 3])
})

test("deletion cannot affect another owner's memory and is idempotent", async t => {
  const db = database(seed)
  const app = await server(db)
  t.after(() => app.close())
  const remove = id => app.inject({ method: "DELETE", url: `/api/memory/${id}`, headers: { authorization: "Bearer alice-session" } })
  assert.equal((await remove(2)).statusCode, 200)
  assert.ok(db.rows.some(row => row.id === 2))
  assert.equal((await remove(1)).statusCode, 200)
  assert.equal((await remove(1)).statusCode, 200)
  assert.deepEqual(db.rows.map(row => row.id), [2, 3])
  assert.deepEqual(await resolveUserMemories(db, "alice", [{ id: 1 }]), [])
})

test("database failures are not reported as successful deletions or empty lists", async t => {
  const app = await server(database(seed, true))
  t.after(() => app.close())
  for (const method of ["GET", "DELETE"]) {
    const res = await app.inject({ method, url: method === "GET" ? "/api/memory" : "/api/memory/1", headers: { authorization: "Bearer alice-session" } })
    assert.equal(res.statusCode, 503)
  }
})

test("RPC results cannot inject another user's text, fabricated contents or AI interpretations", async () => {
  const matches = [{ id: 2, content: "leaked" }, { id: 3 }, { id: 1, content: "fabricated" }]
  const memories = await resolveUserMemories(database(seed), "alice", matches)
  assert.deepEqual(memories.map(item => item.content), ["Mi manca casa"])
})

test("lookup fails closed without IDs or database access", async () => {
  const db = database(seed)
  assert.deepEqual(await resolveUserMemories(db, "alice", [{ content: "Unverifiable text" }]), [])
  assert.equal(db.calls, 0)
  assert.deepEqual(await resolveUserMemories(database(seed, true), "alice", [{ id: 1 }]), [])
})

test("memory opt-in must be explicit and generated sources are never embedded", async () => {
  const db = database([])
  const openai = { embeddings: { create() { throw new Error("must not be called") } } }
  for (const enabled of [false, undefined, "true"]) {
    assert.equal(await saveUserMemory({ supabase: db, openai, userId: "alice", content: "text", source: "chat", enabled }), false)
  }
  assert.equal(await saveUserMemory({ supabase: db, openai, userId: "alice", content: "generated", source: "chat_reply", enabled: true }), false)
  assert.equal(db.calls, 0)
})

test("only opted-in user text is saved; failures are surfaced to caller", async () => {
  const db = database([])
  const openai = { embeddings: { create: async () => ({ data: [{ embedding: [0.2, 0.4] }] }) } }
  const request = { openai, userId: "alice", content: "Sono stanco", source: "chat", enabled: true }
  assert.equal(await saveUserMemory({ ...request, supabase: db }), true)
  assert.equal(db.rows[0].content, "Sono stanco")
  assert.equal(await saveUserMemory({ ...request, supabase: database([], true) }), false)
})
