import Fastify from "fastify"
import cors from "@fastify/cors"
import { createClient } from "@supabase/supabase-js"
import OpenAI from "openai"

const app = Fastify({ logger: true })

// --- CONFIG ---
const PORT = process.env.PORT || 8080
const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const OPENAI_KEY = process.env.OPENAI_API_KEY

// --- CLIENTS ---
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)
const openai = new OpenAI({ apiKey: OPENAI_KEY })

// --- MIDDLEWARE ---
await app.register(cors, {
  origin: ["*"],
  methods: ["GET", "POST", "OPTIONS"],
})

// --- HEALTH CHECK ---
app.get("/", async (_, reply) => {
  reply.send({ ok: true, service: "MyndSelf backend is running" })
})

// --- REFLECTION ENDPOINT (AI + TAGGING) ---
app.post("/api/reflection", async (req, reply) => {
  try {
    const { mood, note } = req.body

    if (!mood && !note) {
      return reply.status(400).send({ error: "Missing mood or note" })
    }

    const prompt = `
The user reports:
Mood: ${mood}
Note: ${note}

You are MyndSelf.ai — an AI coach using CBT and ACT.
Respond with a short compassionate reflection (max 3 sentences)
and infer up to 3 emotional tags based on the text.

Respond ONLY in this JSON format:
{
  "reflection": "...",
  "tags": ["tag1", "tag2"]
}`

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
    })

    const result = JSON.parse(completion.choices[0].message.content || "{}")

    const reflection =
      result.reflection ||
      "Reflect gently on what you feel. Every emotion is valid."
    const tags = Array.isArray(result.tags) ? result.tags : []

    reply.send({ reflection, tags })
  } catch (error) {
    console.error("❌ Reflection error:", error)
    const message =
      error?.error?.message ||
      error?.message ||
      "An internal error occurred generating reflection."
    reply.status(500).send({ reflection: message, tags: [] })
  }
})

// --- SUBSCRIBE (newsletter / beta) ---
app.post("/api/subscribe", async (req, reply) => {
  try {
    const { email } = req.body
    if (!email) return reply.status(400).send({ ok: false, error: "Missing email" })

    const { data, error } = await supabase
      .from("subscribers")
      .insert([{ email }])
      .select()

    if (error) throw error

    reply.send({ ok: true, data })
  } catch (err) {
    console.error("❌ Subscribe error:", err)
    reply.status(500).send({ ok: false })
  }
})

// --- MOOD SAVE ---
app.post("/api/mood", async (req, reply) => {
  try {
    const { id, user_id, mood, note, reflection, at, tags } = req.body

    const { data, error } = await supabase
      .from("mood_entries")
      .insert([{ id, user_id, mood, note, reflection, at, tags }])
      .select()

    if (error) throw error
    reply.send({ ok: true, data })
  } catch (err) {
    console.error("❌ Mood save error:", err)
    reply.status(500).send({ ok: false })
  }
})

// --- MOOD HISTORY ---
app.get("/api/mood", async (req, reply) => {
  try {
    const { user_id } = req.query
    const { data, error } = await supabase
      .from("mood_entries")
      .select("*")
      .eq("user_id", user_id)
      .order("at", { ascending: false })

    if (error) throw error
    reply.send({ ok: true, items: data })
  } catch (err) {
    console.error("❌ Mood fetch error:", err)
    reply.status(500).send({ ok: false, items: [] })
  }
})

// --- START SERVER ---
app.listen({ port: PORT, host: "0.0.0.0" }, () => {
  console.log(`🚀 MyndSelf backend running on port ${PORT}`)
})
