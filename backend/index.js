// backend/index.js
// MyndSelf.ai backend - ESM
// Fastify + Supabase + OpenAI + memory (G3)

import Fastify from "fastify"
import cors from "@fastify/cors"
import OpenAI from "openai"
import pkg from "@supabase/supabase-js"
const { createClient } = pkg

// ===== ENV =====
const PORT = process.env.PORT || 8080
const OPENAI_API_KEY = process.env.OPENAI_API_KEY
const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_KEY

if (!OPENAI_API_KEY) throw new Error("Missing OPENAI_API_KEY")
if (!SUPABASE_URL || !SUPABASE_KEY)
  throw new Error("Missing SUPABASE_URL / SUPABASE_KEY")

// ===== INIT =====
const app = Fastify({ logger: false })
await app.register(cors, { origin: "*", methods: ["GET", "POST", "OPTIONS"] })

const openai = new OpenAI({ apiKey: OPENAI_API_KEY })
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

// =============================================================
//  MEMORY HELPERS (G3)
// =============================================================
async function saveToMemory({ user_id, content, source = "chat" }) {
  try {
    if (!user_id || !content) return

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

async function getSimilarMemory({ user_id, content, matchCount = 3 }) {
  try {
    if (!user_id || !content) return []

    const embRes = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: content,
    })
    const embedding = embRes.data[0]?.embedding
    if (!embedding) return []

    // proviamo la RPC; se non esiste, restituiamo []
    const { data, error } = await supabase.rpc("match_ai_memory", {
      query_embedding: embedding,
      match_count: matchCount,
      match_user_id: user_id,
    })

    if (error) {
      console.warn("⚠️ getSimilarMemory RPC missing or failed:", error.message)
      return []
    }

    return data || []
  } catch (err) {
    console.warn("⚠️ getSimilarMemory failed:", err.message)
    return []
  }
}

// =============================================================
//  EMOTION PROFILE HELPERS
// =============================================================
function extractTags(text) {
  const base = (text || "").toLowerCase()
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
      .select("tags,mood")
      .eq("user_id", user_id)
      .order("at", { ascending: false })
      .limit(10)

    if (!recent || recent.length === 0) return

    const tagCounts = {}
    recent.forEach((r) => {
      ;(r.tags || []).forEach((t) => {
        tagCounts[t] = (tagCounts[t] || 0) + 1
      })
    })

    const sorted = Object.entries(tagCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([t]) => t)
    const dominant = sorted.slice(0, 3)
    const lastMood = recent[0]?.mood || null

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
//  REFLECTION (main journaling endpoint)
//  frontend a volte lo chiama /api/reflect, a volte /api/reflection
// =============================================================
async function handleReflection(req, reply) {
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
        {
          role: "user",
          content: `Mood: ${mood || "not specified"}\nNote: ${
            note || "none"
          }\nCreate a short, validating reflection.`,
        },
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

    // update profile + memory
    await updateEmotionProfile(user_id)
    await saveToMemory({ user_id, content: reflection, source: "reflection" })

    reply.send({ reflection, tags })
  } catch (err) {
    console.error("❌ Reflection error:", err)
    reply.code(500).send({ error: err.message })
  }
}

app.post("/api/reflection", handleReflection)
app.post("/api/reflect", handleReflection) // alias

// =============================================================
//  MOOD (GET/POST) - usato dal frontend per salvare e per la history
// =============================================================
app.post("/api/mood", async (req, reply) => {
  const entry = req.body
  if (!entry?.user_id) return reply.code(400).send({ error: "Missing user_id" })
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

// =============================================================
//  SUMMARY (generate) + SUMMARY HISTORY
// =============================================================
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

    const joined = (data || [])
      .map((e) => `${e.mood || ""}: ${e.note || ""}\n${e.reflection || ""}`)
      .join("\n")

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "Summarize recent reflections with empathy and clarity. Mirror language.",
        },
        { role: "user", content: joined || "no data" },
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

// restituisce gli insights salvati
app.get("/api/summary/history", async (req, reply) => {
  const { user_id } = req.query
  if (!user_id) return reply.code(400).send({ error: "Missing user_id" })
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

// =============================================================
//  ANALYTICS (per Emotional Journey)
// =============================================================
app.get("/api/analytics/daily", async (req, reply) => {
  const { user_id } = req.query
  if (!user_id) return reply.code(400).send({ error: "Missing user_id" })

  try {
    // prendo ultimi 30
    const { data } = await supabase
      .from("mood_entries")
      .select("at")
      .eq("user_id", user_id)
      .order("at", { ascending: false })
      .limit(60)

    const counts = {}
    ;(data || []).forEach((row) => {
      const d = row.at ? row.at.slice(0, 10) : null
      if (!d) return
      counts[d] = (counts[d] || 0) + 1
    })

    const items = Object.entries(counts)
      .map(([day, entries]) => ({ day, entries }))
      .sort((a, b) => (a.day > b.day ? 1 : -1))

    reply.send({ ok: true, items })
  } catch (err) {
    console.error("❌ analytics/daily error:", err)
    reply.code(500).send({ error: err.message })
  }
})

app.get("/api/analytics/tags", async (req, reply) => {
  const { user_id } = req.query
  if (!user_id) return reply.code(400).send({ error: "Missing user_id" })

  try {
    const { data } = await supabase
      .from("mood_entries")
      .select("tags")
      .eq("user_id", user_id)
      .order("at", { ascending: false })
      .limit(100)

    const counts = {}
    ;(data || []).forEach((row) => {
      ;(row.tags || []).forEach((t) => {
        counts[t] = (counts[t] || 0) + 1
      })
    })

    const items = Object.entries(counts)
      .map(([tag, tag_count]) => ({ tag, tag_count }))
      .sort((a, b) => b.tag_count - a.tag_count)
      .slice(0, 12)

    reply.send({ ok: true, items })
  } catch (err) {
    console.error("❌ analytics/tags error:", err)
    reply.code(500).send({ error: err.message })
  }
})

// =============================================================
//  CHAT with MEMORY + history
// =============================================================
app.post("/api/chat", async (req, reply) => {
  const { user_id, messages } = req.body || {}
  if (!user_id || !messages)
    return reply.code(400).send({ error: "Missing fields" })

  try {
    // ultimo messaggio dell’utente
    const lastUserMessage = [...messages].reverse().find((m) => m.role === "user")
    const userText = lastUserMessage?.content || ""

    // profilo
    const { data: profile } = await supabase
      .from("emotion_profile")
      .select("*")
      .eq("user_id", user_id)
      .maybeSingle()

    // ultimi 3 mood
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

    // memoria semantica
    const similarMemories = userText
      ? await getSimilarMemory({
          user_id,
          content: userText,
          matchCount: 3,
        })
      : []

    const memoryText =
      similarMemories.length > 0
        ? similarMemories.map((m) => `• ${m.content}`).join("\n")
        : "No similar past reflections."

    const systemPrompt = `
You are MyndSelf, an AI reflection companion.

Context:
- Dominant emotional tags: ${dominant}
- Recent moods/notes:
${recentText || "No recent data."}
- Related past reflections from this user:
${memoryText}

Instructions:
1. Acknowledge continuity if similar issues recur ("we talked about this before...").
2. Warm CBT/ACT tone.
3. Ask ONE gentle follow-up question.
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

    // salva in memoria
    await saveToMemory({ user_id, content: userText, source: "chat" })
    await saveToMemory({ user_id, content: replyText, source: "chat_reply" })

    // salva la chat session
    try {
      await supabase.from("chat_sessions").insert({
        user_id,
        messages,
        reply: replyText,
        created_at: new Date().toISOString(),
      })
    } catch (e) {
      console.warn("⚠️ chat_sessions insert failed:", e.message)
    }

    reply.send({ reply: replyText })
  } catch (err) {
    console.error("❌ Chat error:", err)
    reply.code(500).send({ error: err.message })
  }
})

// restituisce la storia chat (serve al frontend per ripopolarla dopo login)
app.get("/api/chat/history", async (req, reply) => {
  const { user_id } = req.query
  if (!user_id) return reply.code(400).send({ error: "Missing user_id" })

  try {
    const { data } = await supabase
      .from("chat_sessions")
      .select("id,messages,reply,created_at")
      .eq("user_id", user_id)
      .order("created_at", { ascending: false })
      .limit(10)

    reply.send({ ok: true, items: data || [] })
  } catch (err) {
    reply.code(500).send({ error: err.message })
  }
})

// =============================================================
//  SUBSCRIBE (beta form)
// =============================================================
app.post("/api/subscribe", async (req, reply) => {
  const { email } = req.body || {}
  if (!email) return reply.code(400).send({ error: "Missing email" })

  try {
    await supabase.from("subscribers").insert({ email })
    reply.send({ ok: true, message: "Subscribed successfully" })
  } catch (err) {
    if (err.message?.includes("duplicate")) {
      reply.send({ ok: true, message: "Already subscribed" })
    } else {
      reply.code(500).send({ error: err.message })
    }
  }
})

// =============================================================
//  START
// =============================================================
app.listen({ port: PORT, host: "0.0.0.0" }, () => {
  console.log(`🚀 MyndSelf backend running on ${PORT}`)
})
