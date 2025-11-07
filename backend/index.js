import Fastify from "fastify"
import cors from "@fastify/cors"
import dotenv from "dotenv"
import OpenAI from "openai"
import { createClient } from "@supabase/supabase-js"

dotenv.config()

const app = Fastify()

await app.register(cors, {
  origin: process.env.CORS_ORIGIN || "*",
})

// --- Supabase client ---
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY)

// --- OpenAI setup ---
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

// --- Health check ---
app.get("/healthz", async () => ({ ok: true, status: "healthy" }))

// --- Subscribe endpoint ---
app.post("/api/subscribe", async (req, res) => {
  const { email } = req.body || {}
  if (!email || !email.includes("@")) {
    return res.status(400).send({ ok: false, error: "invalid_email" })
  }
  console.log("📬 New subscriber:", email)
  return { ok: true }
})

// GET /api/mood?user_id=abc
app.get("/api/mood", async (req, res) => {
  const userId = req.query.user_id

  let query = supabase
    .from("mood_entries")
    .select("*")
    .order("created_at", { ascending: false })

  if (userId) {
    query = query.eq("user_id", userId)
  }

  const { data, error } = await query
  if (error) return res.status(500).send({ ok: false, error: error.message })
  return { ok: true, items: data }
})

// POST /api/mood
app.post("/api/mood", async (req, res) => {
  const { mood, note, reflection, user_id } = req.body || {}
  if (!mood) return res.status(400).send({ ok: false, error: "missing_mood" })

  const { data, error } = await supabase
    .from("mood_entries")
    .insert([{ mood, note, reflection, user_id }])
    .select()

  if (error) return res.status(500).send({ ok: false, error: error.message })
  return { ok: true, item: data?.[0] }
})


// --- Reflection endpoint ---
app.post("/api/reflection", async (req, res) => {
  const { mood, note } = req.body || {}
  const prompt = `
You are MyndSelf, an AI reflective coach that helps users develop emotional awareness using CBT and ACT principles.
You are NOT a therapist. Your tone should be warm, nonjudgmental, and reflective.
Always validate emotions, suggest gentle reflection, and encourage mindful observation.

User input:
Mood: ${mood || "unknown"}
Note: ${note || "(none provided)"}

Now generate a short reflective message (2–3 sentences).
`

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You are a supportive reflective AI coach using CBT and ACT principles. Never diagnose; focus on awareness and self-compassion.",
        },
        { role: "user", content: prompt },
      ],
      temperature: 0.8,
      max_tokens: 200,
    })

    const reflection = completion?.choices?.[0]?.message?.content?.trim() || ""
    res.send({ ok: true, reflection, at: new Date().toISOString() })
  } catch (err) {
    console.error("❌ Reflection error:", err)
    res.status(500).send({ ok: false, error: "AI reflection unavailable" })
  }
})

// --- Start server ---
const PORT = process.env.PORT || 8080
app.listen({ port: PORT, host: "0.0.0.0" }, (err, address) => {
  if (err) {
    console.error(err)
    process.exit(1)
  }
  console.log(`🚀 MyndSelf backend (Supabase) running on ${address}`)
})
