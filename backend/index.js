// === MyndSelf.ai Backend - vG3 ===
// Emotional Intelligence Platform - Reflection + AI Memory

import Fastify from "fastify"
import cors from "@fastify/cors"
import OpenAI from "openai"
import pkg from "@supabase/supabase-js"
const { createClient } = pkg

// === ENV ===
const PORT = process.env.PORT || 8080
const OPENAI_API_KEY = process.env.OPENAI_API_KEY
const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_KEY

if (!OPENAI_API_KEY) throw new Error("Missing OPENAI_API_KEY")
if (!SUPABASE_URL || !SUPABASE_KEY) throw new Error("Missing Supabase env vars")

// === INIT ===
const app = Fastify({ logger: false })
await app.register(cors, { origin: "*", methods: ["GET", "POST", "OPTIONS"] })
const openai = new OpenAI({ apiKey: OPENAI_API_KEY })
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)


// =============================================================
// 🔹 MEMORY FUNCTIONS
// =============================================================

// Save a text + embedding to ai_memory
async function saveToMemory({ user_id, content, source = "chat" }) {
  try {
    if (!content || !user_id) return

    const embRes = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: content,
    })

    const embedding = embRes.data[0]?.embedding
    if (!embedding) return

    await supabase.from("ai_memory").insert({
      user_id,
      content,
      source,
      embedding,
    })
  } catch (err) {
    console.warn("⚠️ saveToMemory failed:", err.message)
  }
}

// Retrieve most similar memories for a given input
async function getSimilarMemory({ user_id, content, matchCount = 3 }) {
  try {
    if (!content || !user_id) return []

    const embRes = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: content,
    })
    const embedding = embRes.data[0]?.embedding
    if (!embedding) return []

    const { data, error } = await supabase.rpc("match_ai_memory", {
      query_embedding: embedding,
      match_count: matchCount,
      match_user_id: user_id,
    })

    if (error) {
      console.warn("⚠️ getSimilarMemory error:", error.message)
      return []
    }

    return data || []
  } catch (err) {
    console.warn("⚠️ getSimilarMemory failed:", err.message)
    return []
  }
}


// =============================================================
// 🔹 EMOTION PROFILE UTILITIES
// =============================================================
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


// =============================================================
// 🔹 REFLECTION API
// =============================================================
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
            "You are MyndSelf, an AI coach specialized in emotional reflection. Reply warmly, empathetically, CBT/ACT tone. Mirror user's language.",
        },
        { role: "user", content: `Mood: ${mood}\nNote: ${note}\nReflect briefly.` },
      ],
      temperature: 0.8,
      max_tokens: 200,
    })

    const reflection = completion.choices[0]?.message?.content?.trim() || ""
    const tags = extractTags(reflection)

    await supabase.from("mood_entries").insert({
      user_id,
      mood,
      note,
      reflection,
      tags,
      at: new Date().toISOString(),
    })

    await updateEmotionProfile(user_id)
    await saveToMemory({ user_id, content: reflection, source: "reflection" })

    reply.send({ reflection, tags })
  } catch (err) {
    console.error("❌ Reflection error:", err)
    reply.code(500).send({ error: err.message })
  }
})


// =============================================================
// 🔹 MOOD & SUMMARY ROUTES
// =============================================================
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

    const joined = data.map((e) => `${e.mood}: ${e.note}\n${e.reflection}`).join("\n")

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "Summarize recent reflections with empathy and clarity." },
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
      await saveToMemory({ user_id, content: summary, source: "summary" })
    }

    reply.send({ summary })
  } catch (err) {
    console.error("❌ Summary error:", err)
    reply.code(500).send({ error: err.message })
  }
})


// =============================================================
// 🔹 CONTEXTUAL CHAT with MEMORY
// =============================================================
app.post("/api/chat", async (req, reply) => {
  const { user_id, messages } = req.body || {}
  if (!user_id || !messages)
    return reply.code(400).send({ error: "Missing fields" })

  try {
    const lastUserMessage = [...messages].reverse().find((m) => m.role === "user")
    const userText = lastUserMessage?.content || ""

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
      .map((r) => `• ${r.mood || ""}${r.note ? " – " + r.note : ""}`)
      .join("\n")

    const dominant = profile?.dominant_tags?.join(", ") || "none"

    // === Memory retrieval
    const similarMemories = await getSimilarMemory({
      user_id,
      content: userText,
      matchCount: 3,
    })

    const memoryText =
      similarMemories.length > 0
        ? similarMemories.map((m) => `• ${m.content}`).join("\n")
        : "No similar past reflections."

    const systemPrompt = `
You are MyndSelf, an AI reflection companion.

Context:
- Dominant emotional tags: ${dominant}
- Recent moods and notes:
${recentText}
- Related past reflections from this user:
${memoryText}

Instructions:
1. Acknowledge continuity if similar issues recur ("we talked about this before...").
2. Warm CBT/ACT tone.
3. Ask one gentle follow-up question.
4. Mirror user's language (Italian → Italian).
5. Keep within 3–5 sentences.
`

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "system", content: systemPrompt }, ...messages],
      temperature: 0.7,
      max_tokens: 280,
    })

    const replyText = completion.choices[0]?.message?.content?.trim() || "..."

    await saveToMemory({ user_id, content: userText, source: "chat" })
    await saveToMemory({ user_id, content: replyText, source: "chat_reply" })

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


// =============================================================
// 🔹 SERVER START
// =============================================================
app.listen({ port: PORT, host: "0.0.0.0" }, () =>
  console.log(`🚀 MyndSelf backend (G3) running on port ${PORT}`)
)
