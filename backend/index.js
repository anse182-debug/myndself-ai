import Fastify from "fastify"
import cors from "@fastify/cors"
import dotenv from "dotenv"
import fs from "fs"
import path from "path"
import OpenAI from "openai"

dotenv.config()

const app = Fastify()

// --- CORS per frontend ---
await app.register(cors, {
  origin: process.env.CORS_ORIGIN || "*",
})

// --- Path file locale persistente (mock database) ---
const __dirname = path.resolve()
const DATA_FILE = path.join(__dirname, "mood-data.json")

function readMoodData() {
  try {
    const data = fs.readFileSync(DATA_FILE, "utf8")
    return JSON.parse(data)
  } catch {
    return []
  }
}

function writeMoodData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2))
}

// --- OpenAI setup ---
const hasKey = !!process.env.OPENAI_API_KEY
console.log("[MyndSelf] OpenAI key present:", hasKey)
const openai = hasKey ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null

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

// --- Mood endpoints (con salvataggio in file) ---
app.get("/api/mood", async () => {
  const items = readMoodData()
  return { ok: true, items }
})

app.post("/api/mood", async (req, res) => {
  const { mood, note, reflection } = req.body || {}
  if (!mood) {
    return res.status(400).send({ ok: false, error: "missing_mood" })
  }

  const data = readMoodData()
  const entry = {
    id: data.length + 1,
    mood,
    note: note || "",
    reflection: reflection || "",
    at: new Date().toISOString(),
  }

  data.push(entry)
  writeMoodData(data)
  return { ok: true, item: entry }
})

// --- Reflection endpoint (AI CBT/ACT) ---
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
      reflection = completion?.choices?.[0]?.message?.content?.trim()
      console.log("[MyndSelf] OpenAI response:", reflection)
    } else {
      console.warn("[MyndSelf] No OpenAI key detected, using fallback.")
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
  console.log(`🚀 MyndSelf backend running on ${address}`)
})
