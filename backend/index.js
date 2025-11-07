import Fastify from "fastify"
import cors from "@fastify/cors"
import { createClient } from "@supabase/supabase-js"
import OpenAI from "openai"

const app = Fastify({ logger: true })

// ENV
const PORT = process.env.PORT || 8080
const SUPABASE_URL = process.env.SUPABASE_URL
// preferisci la service role se presente, altrimenti la key normale
const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY
const OPENAI_KEY = process.env.OPENAI_API_KEY

// clients
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)
const openai = new OpenAI({ apiKey: OPENAI_KEY })

// CORS
await app.register(cors, {
  origin: process.env.CORS_ORIGIN || "*",
  methods: ["GET", "POST", "OPTIONS"],
})

// health
app.get("/", async () => {
  return { ok: true, service: "MyndSelf backend is running" }
})

// AI reflection con lingua = input + tags
app.post("/api/reflection", async (req, reply) => {
  try {
    const { mood, note } = req.body || {}

    if (!mood && !note) {
      return reply.status(400).send({ error: "Missing mood or note" })
    }

    const prompt = `
You are MyndSelf.ai — an AI emotional reflection coach.
The user may write in ITALIAN or ENGLISH (or another language).
Your job:
1. Detect the user's language.
2. Answer in the SAME language as the user.
3. Give a short, compassionate reflection (max 3 sentences) in CBT/ACT tone.
4. Extract up to 3 emotional tags (short words, e.g. "Calm", "Stress", "Hope").

User input:
Mood: ${mood}
Note: ${note}

Respond ONLY as valid JSON, like:
{
  "reflection": "....",
  "tags": ["...", "..."]
}
`

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      temperature: 0.8,
      max_tokens: 200,
    })

    const raw = completion.choices?.[0]?.message?.content || "{}"
    let parsed
    try {
      parsed = JSON.parse(raw)
    } catch (e) {
      parsed = {}
    }

    const reflection =
      parsed.reflection ||
      "Rifletti gentilmente su ciò che provi. Ogni emozione è valida."
    const tags = Array.isArray(parsed.tags) ? parsed.tags : []

    reply.send({ reflection, tags })
  } catch (error) {
    console.error("❌ Reflection error:", error)
    reply
      .status(500)
      .send({ reflection: "Servizio temporaneamente non disponibile.", tags: [] })
  }
})

// subscribe (semplice)
app.post("/api/subscribe", async (req, reply) => {
  const { email } = req.body || {}
  if (!email || !email.includes("@")) {
    return reply.status(400).send({ ok: false, error: "invalid_email" })
  }

  // opzionale: salva in una tabella "subscribers", se l'hai creata
  try {
    await supabase.from("subscribers").insert([{ email }])
  } catch (e) {
    // non bloccare la risposta al frontend
    console.warn("subscribe insert error (non blocking):", e.message)
  }

  reply.send({ ok: true })
})

// salva mood
app.post("/api/mood", async (req, reply) => {
  try {
    const { id, user_id, mood, note, reflection, at, tags } = req.body || {}
    if (!mood) {
      return reply.status(400).send({ ok: false, error: "missing_mood" })
    }

    const payload = {
      id,
      user_id,
      mood,
      note,
      reflection,
      at: at || new Date().toISOString(),
      tags: Array.isArray(tags) ? tags : null,
    }

    const { data, error } = await supabase
      .from("mood_entries")
      .insert([payload])
      .select()

    if (error) {
      console.error("❌ Supabase insert error:", error)
      return reply.status(500).send({ ok: false, error: error.message })
    }

    reply.send({ ok: true, item: data?.[0] })
  } catch (err) {
    console.error("❌ Mood save error:", err)
    reply.status(500).send({ ok: false })
  }
})

// recupera mood per utente
app.get("/api/mood", async (req, reply) => {
  try {
    const { user_id } = req.query

    let query = supabase.from("mood_entries").select("*")

    if (user_id) {
      query = query.eq("user_id", user_id)
    }

    // ordina prima per at (che ora hai aggiunto), poi per created_at
    query = query.order("at", { ascending: false })

    const { data, error } = await query

    if (error) {
      console.error("❌ Supabase select error:", error)
      return reply.status(500).send({ ok: false, items: [] })
    }

    reply.send({ ok: true, items: data })
  } catch (err) {
    console.error("❌ Mood fetch error:", err)
    reply.status(500).send({ ok: false, items: [] })
  }
})

// start
app.listen({ port: PORT, host: "0.0.0.0" }, () => {
  console.log(`🚀 MyndSelf backend running on http://0.0.0.0:${PORT}`)
})
