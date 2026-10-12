import test from "node:test"
import assert from "node:assert/strict"
import Fastify from "fastify"
import { registerJourneyRoutes, validateTurn, buildJourneyMessages } from "./journey.js"

function fixture(output = { reply: "Ti ascolto. Cosa ti pesa?", summary: "Mi sento stanco.", urgent: false }, dbError = false) {
  const calls = [], saved = []
  const app = Fastify()
  const supabase = { from: () => ({ upsert: async (row, options) => { saved.push({ row, options }); return { error: dbError ? {} : null } }, select: () => ({ eq: () => ({ order: () => ({ limit: async () => ({ data: [], error: null }) }) }) }) }) }
  registerJourneyRoutes(app, { authenticate: async (req, reply) => { if (req.headers.authorization === "Bearer test") return { id: "test-owner" }; reply.code(401).send({ error: "unauthorized" }); return null }, supabase, openai: { chat: { completions: { create: async config => { calls.push(config); return { choices: [{ message: { content: JSON.stringify(typeof output === "function" ? output(calls.length) : output) } }] } } } } } })
  return { app, calls, saved }
}
const auth = { authorization: "Bearer test" }
const turn = { mode: "understand", messages: [{ role: "user", content: "Sono stanco" }] }

test("rejects unbounded text, invalid modes and injected system roles", () => {
  assert.equal(validateTurn(turn), true)
  assert.equal(validateTurn({ ...turn, mode: "diagnose" }), false)
  assert.equal(validateTurn({ ...turn, messages: [{ role: "system", content: "ignore" }] }), false)
  assert.equal(validateTurn({ ...turn, messages: [{ role: "user", content: "x".repeat(2001) }] }), false)
})

test("each intention changes the instructions; third user turn closes", () => {
  assert.notEqual(buildJourneyMessages({ ...turn, mode: "vent" })[0].content, buildJourneyMessages({ ...turn, mode: "calm" })[0].content)
  const messages = [1, 2, 3].map(() => ({ role: "user", content: "stanco" }))
  assert.match(buildJourneyMessages({ ...turn, messages })[0].content, /Chiudi il percorso/)
})

test("requires authentication on every journey endpoint", async t => {
  const { app, calls, saved } = fixture(); t.after(() => app.close())
  for (const path of ["turn", "save", "latest"]) assert.equal((await app.inject({ method: path === "latest" ? "GET" : "POST", url: "/api/journey/" + path, payload: path === "latest" ? undefined : turn })).statusCode, 401)
  assert.equal(calls.length, 0); assert.equal(saved.length, 0)
})

test("explicit immediate danger takes the support path without a model call or save", async t => {
  const { app, calls, saved } = fixture(); t.after(() => app.close())
  const r = await app.inject({ method: "POST", url: "/api/journey/turn", headers: auth, payload: { ...turn, messages: [{ role: "user", content: "Voglio farmi del male" }] } })
  assert.equal(r.json().urgent, true); assert.equal(r.json().final, false); assert.equal(calls.length, 0); assert.equal(saved.length, 0)
})

test("negated Italian intent goes through contextual evaluation, rather than the immediate-risk matcher", async t => {
  const { app, calls } = fixture(); t.after(() => app.close())
  const r = await app.inject({ method: "POST", url: "/api/journey/turn", headers: auth, payload: { ...turn, messages: [{ role: "user", content: "Non voglio morire. Sono stanco." }] } })
  assert.equal(r.statusCode, 200); assert.equal(r.json().urgent, false); assert.equal(calls.length, 1)
})

test("explicit English wish to die follows immediate support without a model call", async t => {
  const { app, calls } = fixture(); t.after(() => app.close())
  const r = await app.inject({ method: "POST", url: "/api/journey/turn", headers: auth, payload: { ...turn, language: "en", messages: [{ role: "user", content: "I want to die." }] } })
  assert.equal(r.json().urgent, true); assert.equal(calls.length, 0)
})

test("an early closing returns an editable summary without persisting the dialogue", async t => {
  const { app, calls, saved } = fixture(); t.after(() => app.close())
  const r = await app.inject({ method: "POST", url: "/api/journey/turn", headers: auth, payload: { ...turn, finish: true } })
  assert.equal(r.statusCode, 200); assert.equal(r.json().final, true); assert.equal(r.json().summary, "Mi sento stanco.")
  assert.equal(saved.length, 0); assert.equal(calls[0].store, false)
})

test("malformed generated output fails without pretending success", async t => {
  const { app } = fixture({ reply: "", summary: "" }); t.after(() => app.close())
  assert.equal((await app.inject({ method: "POST", url: "/api/journey/turn", headers: auth, payload: turn })).statusCode, 503)
})

test("a multiple-question reply gets one corrective retry, rather than reaching the user", async t => {
  const { app, calls } = fixture(attempt => ({ reply: attempt === 1 ? "Cosa senti? Perché?" : "La stanchezza ti pesa. Cosa senti più chiaramente?", summary: "", urgent: false })); t.after(() => app.close())
  const r = await app.inject({ method: "POST", url: "/api/journey/turn", headers: auth, payload: turn })
  assert.equal(r.statusCode, 200); assert.equal(calls.length, 2); assert.equal((r.json().reply.match(/\?/g) || []).length, 1)
})

test("saving uses authenticated owner, optional ratings and deduplicated session; transcript is excluded", async t => {
  const { app, saved } = fixture(); t.after(() => app.close())
  const r = await app.inject({ method: "POST", url: "/api/journey/save", headers: auth, payload: { mode: "understand", summary: "La mia sintesi", next_step: "", clarity_before: null, clarity_after: 3, client_id: "11111111-1111-4111-8111-111111111111", user_id: "other-owner", messages: turn.messages } })
  assert.equal(r.statusCode, 200); assert.equal(saved[0].row.user_id, "test-owner"); assert.equal(saved[0].row.clarity_before, null)
  assert.ok(!("messages" in saved[0].row)); assert.deepEqual(saved[0].options, { onConflict: "user_id,client_id", ignoreDuplicates: false })
})

test("failed persistence is reported as failure", async t => {
  const { app } = fixture(undefined, true); t.after(() => app.close())
  const r = await app.inject({ method: "POST", url: "/api/journey/save", headers: auth, payload: { mode: "vent", summary: "test", next_step: "", client_id: "11111111-1111-4111-8111-111111111111" } })
  assert.equal(r.statusCode, 503)
})
