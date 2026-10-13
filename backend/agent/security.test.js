import test from "node:test"
import assert from "node:assert/strict"
import Fastify from "fastify"
import rateLimit from "@fastify/rate-limit"
import { registerAccessControl, registerRequestBudgets } from "./security.js"

async function server() {
  const app = Fastify()
  let handled = 0
  await app.register(rateLimit, { global: false })
    registerAccessControl(app, async (req, reply) => {
    if (req.headers.authorization === "Bearer alice") return { id: "alice" }
    reply.code(401).send({ error: "invalid_token" }); return null
  }, { WEEKLY_BATCH_SECRET: "job-test" })
  registerRequestBudgets(app)
  for (const path of ["/api/mood", "/api/chat", "/api/subscribe", "/api/weekly-email-batch", "/tasks/send-weekly-ritual-preview"]) app.post(path, async req => { handled++; return { owner: req.body?.user_id } })
  app.get("/api/mood", async req => { handled++; return { owner: req.query.user_id } })
  app.get("/api/therapist/report.pdf", async (req, reply) => {
    if (req.query.token !== "valid-capability") return reply.code(403).send({ error: "invalid_capability" })
    return { ok: true }
  })
  return { app, handled: () => handled }
}

test("legacy personal endpoints are closed anonymously without staging mode", async t => {
  const { app, handled } = await server(); t.after(() => app.close())
  for (const method of ["GET", "POST"]) assert.equal((await app.inject({ method, url: "/api/mood?user_id=bob", payload: method === "POST" ? { user_id: "bob" } : undefined })).statusCode, 401)
  assert.equal(handled(), 0)
})

test("owner substitution is rejected in query, body and aliases before the handler", async t => {
  const { app, handled } = await server(); t.after(() => app.close())
  for (const payload of [{ user_id: "bob" }, { userId: "bob" }, { user_id: "alice", userId: "bob" }]) assert.equal((await app.inject({ method: "POST", url: "/api/mood", headers: { authorization: "Bearer alice" }, payload })).statusCode, 403)
  assert.equal((await app.inject({ url: "/api/mood?user_id=bob", headers: { authorization: "Bearer alice" } })).statusCode, 403)
  assert.equal(handled(), 0)
})

test("owner is injected from verified identity when a legacy request omits it", async t => {
  const { app } = await server(); t.after(() => app.close())
  for (const method of ["GET", "POST"]) {
    const r = await app.inject({ method, url: "/api/mood", headers: { authorization: "Bearer alice" }, payload: method === "POST" ? { mood: "calmo" } : undefined })
    assert.equal(r.statusCode, 200); assert.equal(r.json().owner, "alice")
  }
})

test("jobs require their dedicated credential, not a user session", async t => {
  const { app } = await server(); t.after(() => app.close())
  for (const authorization of [undefined, "Bearer alice", "Bearer wrong"]) assert.equal((await app.inject({ method: "POST", url: "/api/weekly-email-batch", headers: authorization ? { authorization } : {} })).statusCode, 401)
  assert.equal((await app.inject({ method: "POST", url: "/api/weekly-email-batch", headers: { authorization: "Bearer job-test" } })).statusCode, 200)
  assert.equal((await app.inject({ method: "POST", url: "/tasks/send-weekly-ritual-preview" })).statusCode, 401)
})

test("public subscription and capability links retain their separate access model", async t => {
  const { app } = await server(); t.after(() => app.close())
  assert.equal((await app.inject({ method: "POST", url: "/api/subscribe", payload: { email: "test@example.com" } })).statusCode, 200)
  assert.equal((await app.inject({ url: "/api/therapist/report.pdf" })).statusCode, 403)
  assert.equal((await app.inject({ url: "/api/therapist/report.pdf?token=valid-capability" })).statusCode, 200)
})

test("AI request budget returns 429 without entering the handler beyond its limit", async t => {
  const { app, handled } = await server(); t.after(() => app.close())
  for (let i = 0; i < 12; i++) assert.equal((await app.inject({ method: "POST", url: "/api/chat", headers: { authorization: "Bearer alice" }, payload: {} })).statusCode, 200)
  assert.equal((await app.inject({ method: "POST", url: "/api/chat", headers: { authorization: "Bearer alice" }, payload: {} })).statusCode, 429)
  assert.equal(handled(), 12)
})

test("unauthenticated attempts are rate-limited before authentication work", async t => {
  const { app, handled } = await server(); t.after(() => app.close())
  for (let i = 0; i < 120; i++) assert.equal((await app.inject({ url: "/api/mood" })).statusCode, 401)
  assert.equal((await app.inject({ url: "/api/mood" })).statusCode, 429)
  assert.equal(handled(), 0)
})
