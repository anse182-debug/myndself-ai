import Fastify from "fastify"
import cors from "@fastify/cors"
import { createClient } from "@supabase/supabase-js"
import OpenAI from "openai"

const app = Fastify({ logger: true })

// ENV
const PORT = process.env.PORT || 8080
const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY
const OPENAI_KEY = process.env.OPENAI_API_KEY

// Clients
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)
const openai = new OpenAI({ apiKey: OPENAI_KEY })

// CORS
await app.register(cors, {
  origin: process.env.CORS_ORIGIN || "*",
  methods: ["GET", "POST", "OPTIONS"],
})

// HEALTH
app.get("/", async () => {
  return { ok: true, service: "MyndSelf backend is running" }
})

/**
 * AI REFLECTION (multilingua + tags + contesto emozionale)
 */
app.post("/api/reflection", async (req, reply) => {
  try {
    const { mood, note, user_id } = req.body || {}
    if (!mood && !note) {
      return reply.status(400).send({ error: "Missing mood or note" })
    }

    // recupero (facoltativo) del profilo emozionale per personalizzare la risposta
    let emotionProfile = null
    if (user_id) {
      try {
        const { data } = await supabase
          .from("emotion_profile")
          .select("*")
          .eq("user_id", user_id)
          .maybeSingle()
        emotionProfile = data
      } catch {
        emotionProfile = null
      }
    }

    const prompt = `
You are MyndSelf.ai — an AI emotional reflection coach.
The user may write in ITALIAN, ENGLISH or another language.
Your task:
1. Detect the user's language.
2. Answer in the SAME language.
3. Give a short, compassionate reflection (max 3 sentences, CBT/ACT tone).
4. Extract up to 3 emotional tags (short words).

Current emotional context (if available):
Dominant emotions: ${
      emotionProfile?.dominant_tags?.join(", ") || "N/A"
    }
Most recent mood: ${emotionProfile?.last_mood || "unknown"}

User input:
Mood: ${mood}
Note: ${note}

Respond ONLY in valid JSON, like:
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
    })

    const raw = completion.choices?.[0]?.message?.content || "{}"
    let parsed = {}
    try {
      parsed = JSON.parse(raw)
    } catch {
      parsed = {}
    }

    const reflection =
      parsed.reflection ||
      "Rifletti gentilmente su ciò che provi. Ogni emozione è valida."
    const tags = Array.isArray(parsed.tags) ? parsed.tags : []

    reply.send({ reflection, tags })
  } catch (err) {
    console.error("❌ Reflection error:", err)
    reply
      .status(500)
      .send({ reflection: "Servizio non disponibile.", tags: [] })
  }
})

/**
 * SUBSCRIBE (beta / newsletter)
 */
app.post("/api/subscribe", async (req, reply) => {
  const { email } = req.body || {}
  if (!email || !email.includes("@")) {
    return reply.status(400).send({ ok: false, error: "invalid_email" })
  }

  try {
    await supabase.from("subscribers").insert([{ email }])
  } catch (e) {
    console.warn("⚠️ Subscriber insert non blocking:", e.message)
  }

  reply.send({ ok: true })
})

/**
 * SAVE MOOD ENTRY + update emotion_profile
 */
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

    if (error) throw error

    // --- aggiorna profilo emozionale (se abbiamo l'utente) ---
    if (user_id) {
      try {
        const { data: recentEntries } = await supabase
          .from("mood_entries")
          .select("tags, mood")
          .eq("user_id", user_id)
          .order("at", { ascending: false })
          .limit(10)

        if (recentEntries && recentEntries.length > 0) {
          const tagCounts = {}
          recentEntries.forEach((r) => {
            (r.tags || []).forEach((t) => {
              tagCounts[t] = (tagCounts[t] || 0) + 1
            })
          })
          const sortedTags = Object.entries(tagCounts)
            .sort((a, b) => b[1] - a[1])
            .map(([tag]) => tag)

          const dominant = sortedTags.slice(0, 3)
          const lastMood = recentEntries[0].mood || null

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
        }
      } catch (profileErr) {
        console.warn("⚠️ Profile update failed:", profileErr.message)
      }
    }

    reply.send({ ok: true, item: data?.[0] })
  } catch (err) {
    console.error("❌ Mood save error:", err)
    reply.status(500).send({ ok: false })
  }
})

/**
 * GET MOOD HISTORY
 */
app.get("/api/mood", async (req, reply) => {
  try {
    const { user_id } = req.query
    let query = supabase.from("mood_entries").select("*")

    if (user_id) {
      query = query.eq("user_id", user_id)
    }

    // ordinamento per at (colonna che hai aggiunto)
    query = query.order("at", { ascending: false })

    const { data, error } = await query
    if (error) throw error

    reply.send({ ok: true, items: data })
  } catch (err) {
    console.error("❌ Mood fetch error:", err)
    reply.status(500).send({ ok: false, items: [] })
  }
})

/**
 * WEEKLY / ON-DEMAND SUMMARY
 * ?save=true per salvarlo in mood_summaries
 */
app.get("/api/summary", async (req, reply) => {
  try {
    const { user_id, save } = req.query
    if (!user_id) {
      return reply.status(400).send({ error: "Missing user_id" })
    }

    const { data, error } = await supabase
      .from("mood_entries")
      .select("mood, note, reflection, tags, at")
      .eq("user_id", user_id)
      .order("at", { ascending: false })
      .limit(10)

    if (error) throw error

    if (!data || data.length === 0) {
      return reply.send({
        summary:
          "Non ci sono ancora abbastanza riflessioni per creare un riepilogo.",
      })
    }

    const inputText = data
      .map(
        (d) =>
          `Mood: ${d.mood}\nNote: ${d.note}\nReflection: ${d.reflection}\nTags: ${
            (d.tags || []).join(", ")
          }`
      )
      .join("\n---\n")

    const prompt = `
You are MyndSelf.ai, an AI for emotional self-reflection.
Analyze the following reflections from the same user.
Summarize the emotional trends of the last few days in 4–6 lines,
mentioning progress and gentle suggestions for balance.
Respond in the same language detected in the reflections.

Reflections:
${inputText}

Respond ONLY with plain text.
    `

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
    })

    const summary =
      completion.choices?.[0]?.message?.content?.trim() ||
      "Non è stato possibile generare un riepilogo."

    // salvataggio opzionale
    if (save === "true") {
      await supabase.from("mood_summaries").insert([
        {
          user_id,
          summary,
        },
      ])
    }

    reply.send({ summary })
  } catch (err) {
    console.error("❌ Summary error:", err)
    reply
      .status(500)
      .send({ summary: "Errore nel generare il riepilogo settimanale." })
  }
})

/**
 * SUMMARY HISTORY
 */
app.get("/api/summary/history", async (req, reply) => {
  try {
    const { user_id } = req.query
    if (!user_id) {
      return reply.status(400).send({ error: "Missing user_id" })
    }

    const { data, error } = await supabase
      .from("mood_summaries")
      .select("*")
      .eq("user_id", user_id)
      .order("created_at", { ascending: false })
      .limit(20)

    if (error) throw error

    reply.send({ ok: true, items: data })
  } catch (err) {
    console.error("❌ Summary history error:", err)
    reply.status(500).send({ ok: false, items: [] })
  }
})

/**
 * ANALYTICS: daily activity (uses view v_mood_daily)
 */
app.get("/api/analytics/daily", async (req, reply) => {
  try {
    const { user_id } = req.query
    if (!user_id) {
      return reply.status(400).send({ error: "Missing user_id" })
    }

    const { data, error } = await supabase
      .from("v_mood_daily")
      .select("*")
      .eq("user_id", user_id)
      .order("day", { ascending: false })
      .limit(14)

    if (error) throw error

    reply.send({ ok: true, items: data })
  } catch (err) {
    console.error("❌ daily analytics error:", err)
    reply.status(500).send({ ok: false, items: [] })
  }
})

/**
 * ANALYTICS: top emotion tags (uses view v_emotion_tags)
 */
app.get("/api/analytics/tags", async (req, reply) => {
  try {
    const { user_id } = req.query
    if (!user_id) {
      return reply.status(400).send({ error: "Missing user_id" })
    }

    const { data, error } = await supabase
      .from("v_emotion_tags")
      .select("*")
      .eq("user_id", user_id)
      .order("tag_count", { ascending: false })
      .limit(10)

    if (error) throw error

    reply.send({ ok: true, items: data })
  } catch (err) {
    console.error("❌ tag analytics error:", err)
    reply.status(500).send({ ok: false, items: [] })
  }
})

/**
 * CONVERSATIONAL MODE (chat)
 */
app.post("/api/chat", async (req, reply) => {
  try {
    const { user_id, messages } = req.body || {}

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return reply.status(400).send({ error: "Messages array required" })
    }

    // contesto dai mood recenti
    let moodContext = ""
    if (user_id) {
      const { data } = await supabase
        .from("mood_entries")
        .select("mood, note, tags")
        .eq("user_id", user_id)
        .order("at", { ascending: false })
        .limit(5)
      if (data && data.length > 0) {
        moodContext = data
          .map(
            (d) =>
              `Mood: ${d.mood} | Note: ${d.note} | Tags: ${(d.tags || []).join(
                ", "
              )}`
          )
          .join("\n")
      }
    }

    const systemPrompt = `
You are MyndSelf.ai, an AI reflection companion.
Style:
- short, warm, non-judgmental
- CBT / ACT inspired
- ask 1 follow-up at a time
- never give medical/clinical advice
- if the user writes in Italian, reply in Italian
- keep answers within 2-4 sentences

User recent emotional context:
${moodContext || "No previous context."}
`

    const openaiMessages = [
      { role: "system", content: systemPrompt },
      ...messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
    ]

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: openaiMessages,
      temperature: 0.7,
      max_tokens: 200,
    })

    const answer = completion.choices?.[0]?.message?.content?.trim() || "..."

    // salvataggio della conversazione
    try {
      await supabase.from("mood_chats").insert([
        {
          user_id,
          messages: [
            ...messages,
            { role: "assistant", content: answer },
          ],
        },
      ])
    } catch (dbErr) {
      console.warn("⚠️ Chat save failed:", dbErr.message)
    }

    reply.send({ reply: answer })
  } catch (err) {
    console.error("❌ Chat error:", err)
    reply.status(500).send({ reply: "Qualcosa è andato storto, riprova." })
  }
})

/**
 * CHAT HISTORY
 */
app.get("/api/chat/history", async (req, reply) => {
  try {
    const { user_id } = req.query
    if (!user_id) {
      return reply.status(400).send({ error: "Missing user_id" })
    }

    const { data, error } = await supabase
      .from("mood_chats")
      .select("id, messages, created_at")
      .eq("user_id", user_id)
      .order("created_at", { ascending: false })
      .limit(20)

    if (error) throw error

    reply.send({ ok: true, items: data })
  } catch (err) {
    console.error("❌ Chat history error:", err)
    reply.status(500).send({ ok: false, items: [] })
  }
})

/**
 * START SERVER
 */
app.listen({ port: PORT, host: "0.0.0.0" }, () => {
  console.log(`🚀 MyndSelf backend running on http://0.0.0.0:${PORT}`)
})
