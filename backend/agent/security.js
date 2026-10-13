const PUBLIC = new Set(["POST /api/subscribe", "GET /api/therapist/report.pdf"])
const JOBS = {
  "POST /api/weekly-email-batch": "WEEKLY_BATCH_SECRET",
  "POST /tasks/send-weekly-ritual-preview": "WEEKLY_RITUAL_CRON_KEY",
}

export function registerAccessControl(app, authenticate, jobSecrets = {}) {
  app.addHook("preHandler", async (req, reply) => {
    if (req.method === "OPTIONS") return
    const path = req.url.split("?")[0]
    if (!["/api/", "/agent/", "/tasks/"].some(prefix => path.startsWith(prefix))) return
    const route = `${req.method} ${path}`
    if (PUBLIC.has(route)) return // Public PDF handler verifies its hashed, expiring capability token.
    if (JOBS[route]) {
      const expected = jobSecrets[JOBS[route]]
      if (!expected || req.headers.authorization !== `Bearer ${expected}`) return reply.code(401).send({ error: "unauthorized_job" })
      return
    }
    const user = await authenticate(req, reply)
    if (!user) return reply
    req.authenticatedUser = user
    const owners = [req.query?.user_id, req.query?.userId, req.body?.user_id, req.body?.userId]
    if (owners.some(id => id != null && id !== user.id)) return reply.code(403).send({ error: "wrong_user" })
    // Legacy handlers continue to work, but their owner always comes from authentication.
    req.query = { ...req.query, user_id: user.id }
    if (req.body && typeof req.body === "object" && !Array.isArray(req.body)) {
      req.body = { ...req.body, user_id: user.id }
    }
  })
}

export function requestBudget(req) {
  const path = req.url.split("?")[0]
  if (path === "/api/subscribe") return { key: `${req.ip}:subscribe`, max: 5 }
  const costly = /\/(chat|mentor-chat|guided-chat|reflection|reflect|guided-reflection|emotional-profile|summary|weekly-ritual)$/.test(path) || path === "/api/journey/turn"
  return { key: `${req.authenticatedUser?.id || req.ip}:${costly ? "ai" : "general"}`, max: costly ? 12 : 120 }
}

export function registerRequestBudgets(app) {
  app.addHook("onRequest", app.rateLimit({ timeWindow: "1 minute", max: 120, keyGenerator: req => req.ip }))
  // createRateLimit allows an independent account budget after the IP limiter;
  // two rateLimit hooks would share the plugin's already-applied request flag.
  const accountLimit = app.createRateLimit({ timeWindow: "1 minute", max: req => requestBudget(req).max, keyGenerator: req => requestBudget(req).key })
  app.addHook("preHandler", async (req, reply) => {
    const limit = await accountLimit(req)
    if (limit.isExceeded) return reply.header("retry-after", String(limit.ttlInSeconds)).code(429).send({ error: "request_limit", retry_after_seconds: limit.ttlInSeconds })
  })
}
