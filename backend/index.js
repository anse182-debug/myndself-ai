import Fastify from 'fastify'
import dotenv from 'dotenv'
import fastifyCors from '@fastify/cors'

dotenv.config()

const app = Fastify({
  logger: false,
})

await app.register(fastifyCors, {
  origin: process.env.CORS_ORIGIN || '*',
})

// in-memory store
const state = {
  signups: [],
  moods: [{ id: 1, mood: 'calm', note: 'demo', at: new Date().toISOString() }]
}

app.get('/healthz', async () => ({ ok: true }))

app.post('/api/subscribe', async (req, reply) => {
  const { email } = req.body || {}
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return reply.code(400).send({ ok: false, error: 'invalid_email' })
  }
  state.signups.push({ email, at: new Date().toISOString() })
  return { ok: true }
})

app.get('/api/mood', async () => ({ ok: true, items: state.moods }))

app.post('/api/mood', async (req) => {
  const { mood, note } = req.body || {}
  const item = {
    id: state.moods.length + 1,
    mood: mood || 'neutral',
    note: note || '',
    at: new Date().toISOString()
  }
  state.moods.push(item)
  return { ok: true, item }
})

const port = Number(process.env.PORT || 8080)
app.listen({ port, host: '0.0.0.0' }).then(() => {
  console.log(`Mock API on http://localhost:${port}`)
})
