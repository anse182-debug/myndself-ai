import Fastify from 'fastify'
import dotenv from 'dotenv'
import fastifyCors from '@fastify/cors'

dotenv.config()

// crea server
const app = Fastify({
  logger: false, // puoi mettere true se vuoi log su Render
})

// CORS: consenti il tuo dominio Vercel
const allowedOrigin =
  process.env.CORS_ORIGIN ||
  'https://myndself-ai.vercel.app' || // puoi cambiarlo col tuo dominio reale
  '*'

await app.register(fastifyCors, {
  origin: (origin, cb) => {
    // consenti richieste server-to-server e dallo stesso host
    if (!origin) return cb(null, true)
    if (origin === allowedOrigin) {
      return cb(null, true)
    }
    // in dev puoi permettere tutti
    if (process.env.NODE_ENV !== 'production') {
      return cb(null, true)
    }
    return cb(new Error('Not allowed'), false)
  },
  methods: ['GET', 'POST', 'OPTIONS']
})

// store in memoria (ok per mock)
const state = {
  signups: [],
  moods: [
    {
      id: 1,
      mood: 'calm',
      note: 'demo entry',
      at: new Date().toISOString(),
    },
  ],
}

// healthcheck per Render
app.get('/healthz', async () => ({ ok: true }))

// POST /api/subscribe  { email }
app.post('/api/subscribe', async (req, reply) => {
  const { email } = req.body || {}

  if (
    !email ||
    typeof email !== 'string' ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  ) {
    return reply.code(400).send({ ok: false, error: 'invalid_email' })
  }

  state.signups.push({
    email,
    at: new Date().toISOString(),
  })

  return { ok: true }
})

// GET /api/mood
app.get('/api/mood', async () => {
  return { ok: true, items: state.moods }
})

// POST /api/mood  { mood, note? }
app.post('/api/mood', async (req) => {
  const { mood, note } = req.body || {}
  const item = {
    id: state.moods.length + 1,
    mood: mood || 'neutral',
    note: note || '',
    at: new Date().toISOString(),
  }
  state.moods.push(item)
  return { ok: true, item }
})

// porta: Render passa PORT nell'ambiente
const port = Number(process.env.PORT || 8080)
const host = '0.0.0.0'

app
  .listen({ port, host })
  .then(() => {
    console.log(`MyndSelf mock API running on http://${host}:${port}`)
  })
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
