// === MyndSelf.ai Backend - vG2 ===
// Purpose: Emotional Intelligence API for journaling, reflection and contextual chat

import Fastify from "fastify"
import cors from "@fastify/cors"
import OpenAI from "openai"
import pkg from "@supabase/supabase-js"
const { createClient } = pkg

// --- ENV ---
const PORT = process.env.PORT || 8080
const OPENAI_API_KEY = process.env.OPENAI_API_KEY
const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_KEY

if (!OPENAI_API_KEY) throw new Error("Missing OPENAI_API_KEY")
if (!SUPABASE_URL || !SUPABASE_KEY) throw new Error("Missing Supabase env vars")

// --- INIT ---
const app = Fastify({ logger: false })
await app.register(cors, { origin: "*", methods: ["GET", "POST", "OPTIONS"] })
const openai = new OpenAI({ apiKey: OPENAI_API_KEY })
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

// === REFLECTION ===
app.post("/api/reflection", async (req, reply) => {
  const { mood, note, user_id } = req.body || {}
  if (!user_id) return reply.code(400).send({ error: "Missing user_id" })

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You are MyndSelf, an AI coach specialized in emotional reflection. Respond in a warm, supportive, ACT/CBT-inspired tone, and if the input is Italian, reply in Italian.",
        },
        {
          role: "user",
          content: `Mood: ${mood || "N/A"}\nNote: ${note || "N/A"}\nReflect briefly.`,
        },
      ],
      temperature: 0.8,
      max_tokens: 200,
    })

    const reflection = completion.choices[0]?.message?.content?.trim() || ""
    const tags = extractTags(reflection)

    // Save mood entry
    await supabase.from("mood_entries").insert({
      user_id,
      mood,
      note,
      reflection,
      tags,
      at: new Date().toISOString(),
    })

    // Update emotion profile
    await updateEmotionProfile(user_id)

    reply.send({ reflection, tags })
  } catch (err) {
    console.error("❌ Reflection error:", err)
    reply.code(500).send({ error: err.message })
  }
})

// === HELPER: extract simple emotion keywords ===
function extractTags(text) {
  const base = text.toLowerCase()
  const emotions = [
    "calm",
    "peace",
    "gratitude",
    "stress",
    "hope",
    "sad",
    "anger",
    "focus",
    "fear",
    "tired",
  ]
  return emotions.filter((e) => base.includes(e))
}

// === HELPER: update profile ===
async function updateEmotionProfile(user_id) {
  try {
    const { data: recent } = await supabase
      .from("mood_entries")
      .select("tags, mood")
      .eq("user_id", user_id)
      .order("at", { ascending: false })
      .limit(10)

    if (!recent || recent.length === 0) return

    const tagCounts = {}
    recent.forEach((r) => {
      (r.tags || []).forEach((t) => {
        tagCounts[t] = (tagCounts[t] || 0) + 1
      })
    })
    const sorted = Object.entries(tagCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([t]) => t)
    const dominant = sorted.slice(0, 3)
    const lastMood = recent[0].mood || null

    await supabase
      .from("emotion_profile")
      .upsert(
        {
          user_id,
          dominant_tags: dominant,
          last_mood: lastMood,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      )
  } catch (e) {
    console.warn("⚠️ updateEmotionProfile failed:", e.message)
  }
}

// === MOOD HISTORY ===
app.get("/api/mood", async (req, reply) => {
  const { user_id } = req.query
  if (!user_id) return reply.code(400).send({ error: "Missing user_id" })
  try {
    const { data } = await supabase
      .from("mood_entries")
      .select("*")
      .eq("user_id", user_id)
      .order("at", { ascending: false })
    reply.send({ ok: true, items: data || [] })
  } catch (err) {
    reply.code(500).send({ error: err.message })
  }
})

// === MOOD SAVE ===
app.post("/api/mood", async (req, reply) => {
  const entry = req.body
  if (!entry.user_id) return reply.code(400).send({ error: "Missing user_id" })
  try {
    await supabase.from("mood_entries").insert(entry)
    await updateEmotionProfile(entry.user_id)
    reply.send({ ok: true })
  } catch (err) {
    reply.code(500).send({ error: err.message })
  }
})

// === SUMMARY ===
app.get("/api/summary", async (req, reply) => {
  const { user_id, save } = req.query
  if (!user_id) return reply.code(400).send({ error: "Missing user_id" })
  try {
    const { data } = await supabase
      .from("mood_entries")
      .select("mood,note,reflection")
      .eq("user_id", user_id)
      .order("at", { ascending: false })
      .limit(10)
    const joined = data
      .map((e) => `${e.mood}: ${e.note}\n${e.reflection}`)
      .join("\n")

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "Summarize recent emotional reflections empathetically. Use a reflective and concise tone.",
        },
        { role: "user", content: joined },
      ],
      max_tokens: 250,
    })
    const summary = completion.choices[0]?.message?.content?.trim() || ""

    if (save === "true") {
      await supabase.from("summary_entries").insert({
        user_id,
        summary,
        created_at: new Date().toISOString(),
      })
    }
    reply.send({ summary })
  } catch (err) {
    console.error("❌ Summary error:", err)
    reply.code(500).send({ error: err.message })
  }
})

// === SUMMARY HISTORY ===
app.get("/api/summary/history", async (req, reply) => {
  const { user_id } = req.query
  try {
    const { data } = await supabase
      .from("summary_entries")
      .select("*")
      .eq("user_id", user_id)
      .order("created_at", { ascending: false })
    reply.send({ ok: true, items: data || [] })
  } catch (err) {
    reply.code(500).send({ error: err.message })
  }
})

// === ANALYTICS ===
app.get("/api/analytics/daily", async (req, reply) => {
  const { user_id } = req.query
  try {
    const { data } = await supabase.rpc("get_daily_activity", { uid: user_id })
    reply.send({ ok: true, items: data || [] })
  } catch (err) {
    reply.code(500).send({ error: err.message })
  }
})

app.get("/api/analytics/tags", async (req, reply) => {
  const { user_id } = req.query
  try {
    const { data } = await supabase.rpc("get_top_tags", { uid: user_id })
    reply.send({ ok: true, items: data || [] })
  } catch (err) {
    reply.code(500).send({ error: err.message })
  }
})

// === CHAT (contextual) ===
app.post("/api/chat", async (req, reply) => {
  const { user_id, messages } = req.body || {}
  if (!user_id || !messages)
    return reply.code(400).send({ error: "Missing fields" })

  try {
    const { data: profile } = await supabase
      .from("emotion_profile")
      .select("*")
      .eq("user_id", user_id)
      .maybeSingle()

    const { data: recentMoods } = await supabase
      .from("mood_entries")
      .select("mood,note,tags,at")
      .eq("user_id", user_id)
      .order("at", { ascending: false })
      .limit(3)

    const recentText = (recentMoods || [])
      .map((r) => `${r.mood || ""}: ${r.note || ""}`)
      .join("\n")
    const dominant = profile?.dominant_tags?.join(", ") || "none"

    const systemPrompt = `
You are MyndSelf, an AI coach specialized in emotional intelligence.
You provide short, compassionate, reflective answers (CBT/ACT tone).
If the user's previous notes are in Italian, respond in Italian.

Recent emotional tags: ${dominant}
Recent moods and notes:
${recentText || "No recent data."}
`

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "system", content: systemPrompt }, ...messages],
      temperature: 0.7,
      max_tokens: 300,
    })

    const replyText = completion.choices[0]?.message?.content?.trim() || "..."
    await supabase.from("chat_sessions").insert({
      user_id,
      messages,
      reply: replyText,
      created_at: new Date().toISOString(),
    })

    reply.send({ reply: replyText })
  } catch (err) {
    console.error("❌ Chat error:", err)
    reply.code(500).send({ error: err.message })
  }
})

// === CHAT HISTORY ===
app.get("/api/chat/history", async (req, reply) => {
  const { user_id } = req.query
  if (!user_id) return reply.code(400).send({ error: "Missing user_id" })
  try {
    const { data } = await supabase
      .from("chat_sessions")
      .select("messages,reply,created_at")
      .eq("user_id", user_id)
      .order("created_at", { ascending: false })
      .limit(5)
    reply.send({ ok: true, items: data || [] })
  } catch (err) {
    reply.code(500).send({ error: err.message })
  }
})

// === START SERVER ===
app.listen({ port: PORT, host: "0.0.0.0" }, () =>
  console.log(`🚀 MyndSelf backend running on http://0.0.0.0:${PORT}`)
)
