import Fastify from "fastify"
import cors from "@fastify/cors"
import dotenv from "dotenv"
import OpenAI from "openai"

dotenv.config()

const app = Fastify()

// Enable CORS for frontend URL (configurable)
await app.register(cors, {
  origin: process.env.CORS_ORIGIN || "*",
})

// --- OpenAI client initialization ---
const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null
console.log("[MyndSelf] OpenAI key present:", !!process.env.OPENAI_API_KEY)

// --- Health Check ---
app.get("/healthz", async () => {
  return { ok: true, status: "healthy" }
})

// --- Subscribe Endpoint ---
app.post("/api/subscribe", async (req, res) => {
  const { email } = req.body || {}

  if (!email || !email.includes("@")) {
    return res.status(400).send({ ok: false, error: "invalid_email" })
  }

  // Mock subscription logic
  console.log("📬 New subscriber:", email)
  return { ok: true }
})

// --- Mood Endpoints ---
const moodEntries = []

app.get("/api/mood", async () => {
  return { ok: true, items: moodEntries }
})

app.post("/api/mood", async (req, res) => {
  const { mood, note } = req.body || {}

  if (!mood) {
    return res.status(400).send({ ok: false, error: "missing_mood" })
  }

  const entry = {
    id: moodEntries.length + 1,
    mood,
    note: note || "",
    at: new Date().toISOString(),
  }

  moodEntries.push(entry)
  return { ok: true, item: entry }
})

// --- Reflection Endpoint (AI-powered CBT/ACT) ---
app.post("/api/reflection", async (req, res) => {
  const { mood, note } = req.body || {}

  // Prompt “psychologically safe” for AI coach
  const prompt = `
You are MyndSelf, an AI reflective coach that helps users develop emotional awareness using CBT and ACT principles.
You are NOT a therapist. Your tone should be warm, nonjudgmental, and reflective.
Base your response on the user's current mood and note.
Always validate emotions, suggest gentle reflection, and encourage mindful observation.

Example style:
- “It sounds like you’re feeling tense — that’s understandable. Try taking a slow breath and noticing where you feel that tension.”
- “You mentioned calm — that’s wonderful. Maybe take a moment to appreciate what helped you reach that state.”

User input:
Mood: ${mood || "unknown"}
Note: ${note || "(none provided)"}

Now generate a short reflective message (2–3 sentences).
`

  try {
    let reflection = ""

    if (openai) {
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
      reflection = completion.choices[0].message.content.trim()
    } else {
      reflection =
        "Thanks for sharing. Reflect gently on your current state and remember that emotions pass like waves."
    }

    res.send({
      ok: true,
      reflection,
      at: new Date().toISOString(),
    })
  } catch (err) {
    console.error("❌ Reflection error:", err)
    res.status(500).send({
      ok: false,
      error: "AI reflection unavailable",
    })
  }
})

// --- Start Server ---
const PORT = process.env.PORT || 8080
app.listen({ port: PORT, host: "0.0.0.0" }, (err, address) => {
  if (err) {
    console.error(err)
    process.exit(1)
  }
  console.log(`🚀 MyndSelf backend running on ${address}`)
})
