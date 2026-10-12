// Test services require a valid test-project session on every application API.
export function registerStagingGuard(app, authenticate) {
  app.addHook("preHandler", async (req, reply) => {
    if (req.method === "OPTIONS") return
    const path = req.url.split("?")[0]
    if (!["/api/", "/agent/", "/tasks/"].some(prefix => path.startsWith(prefix))) return
    const user = await authenticate(req, reply)
    if (!user) return reply
    const owners = [req.query?.user_id, req.query?.userId, req.body?.user_id, req.body?.userId]
    if (owners.some(id => id != null && id !== user.id)) {
      return reply.code(403).send({ error: "wrong_user" })
    }
  })
}
