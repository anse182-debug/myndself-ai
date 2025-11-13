// backend/index.js
// MyndSelf.ai backend - Fastify + Supabase + OpenAI
// versione con G3: tono empatico CBT/ACT e memoria leggera

import Fastify from "fastify"
import cors from "@fastify/cors"
import OpenAI from "openai"
import pkg from "@supabase/supabase-js"
const { createClient } = pkg

// ====== ENV ======
const PORT = process.env.PORT || 8080
const OPENAI_API_KEY = process.env.OPENAI_API_KEY
const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_KEY

if (!OPENAI_API_KEY) throw new Error("Missing OPENAI_API_KEY")
if (!SUPABASE_URL || !SUPABASE_KEY)
  throw new Error("Missing SUPABASE_URL / SUPABASE_KEY")

// ====== INIT ======
const app = Fastify({ logger: false })
await app.register(cors, { origin: "*", methods: ["GET", "POST", "OPTIONS"] })

const openai = new OpenAI({ apiKey: OPENAI_API_KEY })
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

// ====== SYSTEM PROMPT (G3) ======
const SYSTEM_PROMPT = `
You are MyndSelf.ai — a calm, emotionally intelligent companion.
Your purpose is to help people reflect on their emotional state and move toward balance.

Principles:
- Start by acknowledging the user's emotion (validation).
- Use CBT ideas: highlight connections between thoughts, emotions, and behaviors.
- Use ACT ideas: acceptance, present-moment awareness, gentle movement toward values.
- Never diagnose, never give medical/clinical instructions.
- Keep it concise: 2–4 sentences.
- If the user writes in Italian, answer in Italian in the same tone.
- If you detect recurring topics and the user mentions them again, you can say that you remember or that it makes sense this comes back.
- Be kind and non-judgmental.
`

// ====== HELPERS ======
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
//  REFLECTION
// =============================================================
async function handleReflection(req, reply) {
  const { mood, note, user_id } = req.body || {}
  if (!user_id) return reply.code(400).send({ error: "Missing user_id" })

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: `User mood: ${mood || "not specified"}\nUser note: ${
            note || "none"
          }\nGive a short, validating reflection.`,
        },
      ],
      temperature: 0.8,
      max_tokens: 200,
    })

    const reflection =
      completion.choices[0]?.message?.content?.trim() ||
      "Thanks for sharing. Keep observing your emotions."
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
}

app.post("/api/reflection", handleReflection)
app.post("/api/reflect", handleReflection) // alias compatibilità

// =============================================================
//  MOOD (GET/POST)
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
//  SUMMARY + HISTORY
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
      .map((e) => `${e.mood || ""} · ${e.note || ""}\n${e.reflection || ""}`)
      .join("\n")

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: `Here are the user's recent reflections and moods:\n${joined}\nCreate a short weekly emotional insight.`,
        },
      ],
      max_tokens: 250,
      temperature: 0.7,
    })

    const summary =
      completion.choices[0]?.message?.content?.trim() ||
      "Questa settimana hai mantenuto consapevolezza emotiva. Continua così."

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
//  ANALYTICS
// =============================================================
app.get("/api/analytics/daily", async (req, reply) => {
  const { user_id } = req.query
  if (!user_id) return reply.code(400).send({ error: "Missing user_id" })

  try {
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
//  CHAT (con G3, ACT/CBT, memoria + contesto corto)
// =============================================================
app.post("/api/chat", async (req, reply) => {
  const { user_id, messages } = req.body || {}
  if (!user_id || !messages)
    return reply.code(400).send({ error: "Missing fields" })

  try {
    // prendo l'ultimo messaggio dell'utente per la memoria
    const lastUserMessage = [...messages].reverse().find((m) => m.role === "user")
    const userText = lastUserMessage?.content || ""

    // profilo emozioni
    const { data: profile } = await supabase
      .from("emotion_profile")
      .select("*")
      .eq("user_id", user_id)
      .maybeSingle()

    // ultimi mood
    const { data: recentMoods } = await supabase
      .from("mood_entries")
      .select("mood,note,tags,at")
      .eq("user_id", user_id)
      .order("at", { ascending: false })
      .limit(3)

    const recentText = (recentMoods || [])
      .map((r) => `• ${r.mood || ""}${r.note ? " – " + r.note : ""}`)
      .join("\n")

    // memoria vettoriale
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

    // mantengo il contesto corto
    const shortContext = messages.slice(-10)

    const fullSystemPrompt = `
${SYSTEM_PROMPT}

Additional context for this user:
- Dominant emotional tags: ${profile?.dominant_tags?.join(", ") || "none"}
- Recent moods/notes:
${recentText || "no recent entries"}
- Related past reflections:
${memoryText}
`

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "system", content: fullSystemPrompt }, ...shortContext],
      temperature: 0.75,
      max_tokens: 280,
    })

    const replyText =
      completion.choices[0]?.message?.content?.trim() ||
      "Ti ho ascoltato. Possiamo restare un momento con quello che senti."

    // salvataggi
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
//  CHAT HISTORY
// =============================================================
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
//  SUBSCRIBE
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
app.get("/api/emotional-profile", async (req, reply) => {
  const { user_id } = req.query
  if (!user_id) return reply.code(400).send({ error: "Missing user_id" })

  try {
    // 1️⃣ Prendi ultimi 30 mood entries
    const { data: entries, error } = await supabase
      .from("mood_entries")
      .select("mood, note, tags, reflection, created_at")
      .eq("user_id", user_id)
      .order("created_at", { ascending: false })
      .limit(30)

    if (error) throw error
    if (!entries || entries.length === 0)
      return reply.send({ ok: true, profileText: "No emotional data yet." })

    const tags = entries
      .map((e) => e.tags || [])
      .flat()
      .filter(Boolean)
    const lastReflections = entries
      .map((e) => `${e.mood || ""}: ${e.reflection || e.note || ""}`)
      .join("\n")

    // 2️⃣ Prompt a GPT per analisi emotiva
    const prompt = `
    Sei un assistente psicologico gentile che analizza journaling emozionale.
    Questi sono gli ultimi stati e riflessioni dell'utente:

    ${lastReflections.slice(0, 3000)}

    Elabora in 3 brevi paragrafi:
    1. Emozioni predominanti o ricorrenti.
    2. Come sembra evolvere il tono emotivo nel tempo (più calmo, più stanco, più sereno...).
    3. Un suggerimento mindful, basato su compassione e accettazione.
    Rispondi in italiano, tono empatico e sintetico.
    `

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.8,
    })

    const profileText =
      response.choices?.[0]?.message?.content?.trim() ||
      "Non riesco ancora a valutare l’evoluzione emotiva."

    // 3️⃣ Aggiorna tabella emotion_profile (o crea se non esiste)
    await supabase.from("emotion_profile").upsert(
      {
        user_id,
        summary: profileText,
        top_tags: tags.slice(0, 5),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    )

    reply.send({
      ok: true,
      profileText,
      topTags: tags.slice(0, 5),
    })
  } catch (err) {
    console.error("❌ Emotional profile error:", err)
    reply.code(500).send({ error: err.message })
  }
})
// Guided Reflection (H1)
// POST /api/guided-reflection
// Body: { user_id: string, messages: [{role,content}], step?: number }
app.post("/api/guided-reflection", async (req, reply) => {
  const { user_id, messages = [], step } = req.body || {}
  if (!user_id) return reply.code(400).send({ error: "Missing user_id" })

  try {
    // step server-side (fallback): 1..4
    const currentStep = Math.max(1, Math.min(4, Number(step || 1)))
    const isFinal = currentStep >= 4

    // contesto corto per ridurre i costi e mantenere la coerenza
    const shortContext = Array.isArray(messages) ? messages.slice(-8) : []

    // prompt dedicato H1 (CBT/ACT, domande progressive)
    const GUIDED_PROMPT = `
You are MyndSelf.ai, a calm CBT/ACT-inspired reflection guide.
Run a short guided session of 3–4 turns:
- Ask one gentle, open question per turn.
- Validate the user's feeling before asking.
- Keep replies short (2–3 sentences), Italian if the user is Italian.
- Never diagnose; be kind and non-judgmental.

Session logic:
- Steps 1–3: ask ONE next question that deepens awareness (thoughts ↔ emotions ↔ body ↔ values).
- Step 4 (final): do NOT ask a question. Offer a concise, compassionate summary + one tiny mindful suggestion (no imperative tone).
`

    // Istruzione additiva in base allo step
    const turnInstruction = isFinal
      ? "FINAL STEP: Provide a brief compassionate summary and one gentle mindful suggestion. No questions."
      : "NON-FINAL STEP: Validate briefly, then ask ONE open question to go a bit deeper."

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.7,
      max_tokens: 220,
      messages: [
        { role: "system", content: GUIDED_PROMPT },
        // Aggiungo una breve istruzione esplicita per il turno corrente
        { role: "system", content: `SESSION STEP = ${currentStep}. ${turnInstruction}` },
        ...shortContext,
      ],
    })

    const replyText =
      completion.choices?.[0]?.message?.content?.trim() ||
      (isFinal
        ? "Grazie per aver condiviso. Onora quello che provi e concediti un piccolo gesto di gentilezza."
        : "Ti va di restare un attimo con ciò che senti? Cosa emerge di più in questo momento?")

    // Salva sessione guidata (se vuoi separarla dalla chat libera)
    try {
      await supabase.from("chat_sessions").insert({
        user_id,
        messages,
        reply: replyText,
        type: "guided",           // richiede la colonna "type" (vedi nota SQL sotto)
        step: currentStep,        // opzionale se vuoi tracciare lo step
        created_at: new Date().toISOString(),
      })
    } catch (e) {
      console.warn("⚠️ guided session insert failed:", e.message)
    }
// Se è l’ultimo step, salva il riepilogo finale negli insights
try {
  if (isFinal) {
    await supabase.from("summary_entries").insert({
      user_id,
      summary: replyText,
      created_at: new Date().toISOString(),
    })
  }
} catch (e) {
  console.warn("⚠️ save guided summary failed:", e.message)
}

    // Memoria semantica minimale (facoltativa)
    try {
      // ultimo input utente, se presente
      const lastUser = [...messages].reverse().find((m) => m.role === "user")
      if (lastUser?.content) {
        await saveToMemory({ user_id, content: lastUser.content, source: "guided_user" })
      }
      await saveToMemory({ user_id, content: replyText, source: "guided_reply" })
    } catch (_) {}

    reply.send({ reply: replyText, isFinal })
  } catch (err) {
    console.error("❌ Guided reflection error:", err)
    reply.code(500).send({ error: err.message })
  }
})

// =============================================================
//  START
// =============================================================
app.listen({ port: PORT, host: "0.0.0.0" }, () => {
  console.log(`🚀 MyndSelf backend (G3) running on ${PORT}`)
})
