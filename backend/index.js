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
const RESEND_API_KEY = process.env.RESEND_API_KEY
const WELCOME_FROM_EMAIL =
  process.env.WELCOME_FROM_EMAIL || "MyndSelf.ai <info@myndself.ai>"

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
// ====== MENTOR SYSTEM PROMPT (Reflection v2) ======
const MENTOR_SYSTEM_PROMPT = `
Tu sei MyndSelf Mentor, un alleato emotivo gentile.

OBIETTIVO GENERALE
Aiutare l'utente a vedere più chiaramente cosa sente e cosa si ripete nel tempo, senza dare consigli o diagnosi.

REGOLE
- Non dai consigli pratici, non prescrivi soluzioni, non diagnostichi.
- Non usi termini clinici (es. disturbo, depressione, trauma, ansia clinica).
- Non citi farmaci, terapie o percorsi sanitari.
- Non minimizzi e non amplifichi il dolore dell’utente.
- Usi frasi brevi (massimo 3 frasi) e un tono calmo, concreto, gentile.
- Fai al massimo UNA domanda aperta alla fine della risposta.
- Scrivi sempre in italiano.

STRUTTURA IDEALE DELLA RISPOSTA
1) Una frase che riconosce e normalizza ciò che l'utente sta provando.
2) Una frase che collega o approfondisce leggermente la sensazione.
3) Una domanda aperta che invita a proseguire la riflessione.

RICORDA
L’utente non deve trovare la risposta giusta, ma la sua.
Tu sei al suo fianco, non sopra di lui.
`.trim()

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
// ---- MENTOR: gruppi emozionali + domande seme ----

async function sendWelcomeEmail({ to, name }) {
  if (!RESEND_API_KEY) {
    console.warn("⚠️ RESEND_API_KEY non impostata, salto welcome email")
    return
  }

  const subject = "Benvenuto su MyndSelf.ai 🌿"

  const plainText = `Ciao${name ? " " + name : ""},

hai appena attivato il tuo spazio su MyndSelf.ai.

Il prossimo passo è semplice: fai la tua prima "Riflessione del giorno".
Ti aiuterà a scaricare un po' la testa e a darmi un minimo di contesto su come ti senti in questo periodo.

Quando hai un momento tranquillo, entra qui:
https://myndself.ai/app/

Io sarò lì ad ascoltare.

A presto,
Il tuo Mentor AI`

  const html = `
  <p>Ciao${name ? " " + name : ""},</p>
  <p>hai appena attivato il tuo spazio su <strong>MyndSelf.ai</strong>.</p>
  <p>Il prossimo passo è semplice: fai la tua prima <strong>“Riflessione del giorno”</strong>.<br/>
  Ti aiuterà a scaricare un po' la testa e a darmi un minimo di contesto su come ti senti in questo periodo.</p>
  <p>Quando hai un momento tranquillo, entra qui:<br/>
  <a href="https://myndself.ai/app/">Apri MyndSelf.ai</a></p>
  <p>Io sarò lì ad ascoltare.</p>
  <p>A presto,<br/>Il tuo Mentor AI 🌿</p>
  `

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: WELCOME_FROM_EMAIL,
        to,
        subject,
        text: plainText,
        html,
      }),
    })

    if (!res.ok) {
      const body = await res.text()
      console.warn("⚠️ sendWelcomeEmail failed:", res.status, body)
    }
  } catch (err) {
    console.warn("⚠️ sendWelcomeEmail error:", err.message)
  }
}


// Parole chiave grezze per capire il "cluster" emotivo dal mood testuale
const GROUP3_KEYWORDS = [
  "stress",
  "stressato",
  "sovraccaric",
  "ansia",
  "ansioso",
  "allerta",
  "in colpa",
]
const GROUP2_KEYWORDS = ["confus", "giù", "meh", "svuotat", "scarico"]
const GROUP4_KEYWORDS = ["carico", "motivato", "ispirat", "chiaro", "deciso", "energ"]

// 20 domande seme, divise per gruppo 1..4
const SEED_QUESTIONS = {
  1: [
    "Cosa rende questo momento stabile per te oggi?",
    "C’è qualcosa che oggi è più semplice del solito?",
    "Se potessi dare un titolo alla tua giornata fin qui, quale sarebbe?",
    "Quale sensazione nel corpo accompagna questo stare bene?",
    "C’è un dettaglio piccolo che non vuoi perdere di vista?",
  ],
  2: [
    "Cosa senti che è un po’ diverso dal solito oggi?",
    "Se questa sensazione avesse un colore, quale sarebbe?",
    "Quando è iniziata, più o meno?",
    "È una cosa che torna o sembra nuova?",
    "C’è qualcosa che vorresti capire meglio di quello che provi?",
  ],
  3: [
    "Qual è la parte della tua giornata che ti pesa di più in questo momento?",
    "Cosa ti chiede più energia, secondo te?",
    "C’è un pensiero che torna spesso oggi?",
    "Questa sensazione ti sorprende o te l’aspettavi?",
    "Ti va di descrivere cosa succede nel corpo quando la vivi?",
  ],
  4: [
    "Cosa ti ha dato questa energia oggi?",
    "Dove la senti più forte, nella mente o nel corpo?",
    "È qualcosa che vuoi portare anche domani?",
    "C’è una scelta che questa energia ti sta facilitando?",
    "Qual è la parte di te che senti più presente ora?",
  ],
}

// Decide il gruppo 1–4 partendo dal testo "mood"
function detectGroupFromMood(moodRaw = "") {
  const mood = (moodRaw || "").toLowerCase()
  const hasAny = (keywords) => keywords.some((k) => mood.includes(k))

  if (hasAny(GROUP3_KEYWORDS)) return 3
  if (hasAny(GROUP2_KEYWORDS)) return 2
  if (hasAny(GROUP4_KEYWORDS)) return 4
  return 1 // default: zona "ok / neutro"
}

// Memoria minimale in RAM per non ripetere sempre la stessa domanda
const seedHistory = {
  1: [],
  2: [],
  3: [],
  4: [],
}

function pickSeedQuestion(group) {
  const all = SEED_QUESTIONS[group]
  if (!all || all.length === 0) {
    return "Cosa senti più chiaramente in questo momento?"
  }

  const used = seedHistory[group] || []
  const pool = all.filter((q) => !used.includes(q))
  const list = pool.length > 0 ? pool : all

  const idx = Math.floor(Math.random() * list.length)
  const chosen = list[idx]

  // aggiorno la storia (semplice, non per utente, solo per evitare ripetizioni continue)
  seedHistory[group] = [...used, chosen].slice(-all.length)

  return chosen
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
// =============================================================
//  REFLECTION (Mentor v2)
// =============================================================
async function handleReflection(req, reply) {
    const { mood, note, user_id, goal } = req.body || {}
  if (!user_id) return reply.code(400).send({ error: "Missing user_id" })

  try {
    // 1) decidi gruppo emotivo + domanda seme
    const group = detectGroupFromMood(mood || "")
    const seedQuestion = pickSeedQuestion(group)

    // 2) normalizza i testi
    const safeMood =
      mood && String(mood).trim().length > 0
        ? String(mood).trim()
        : "non specificato"
    const safeNote =
      note && String(note).trim().length > 0
        ? String(note).trim()
        : "nessuna nota aggiuntiva"

    // 3) costruisci il prompt utente per il Mentor
    const userPrompt = `
L'utente ha appena registrato una "Riflessione del giorno" in MyndSelf.ai.

DATI DI OGGI
- Come si sente: "${safeMood}"
- Nota aggiuntiva: "${safeNote}"

OBIETTIVO DELLA RISPOSTA
Restituisci una breve riflessione che lo aiuti a vedere con più chiarezza cosa sta provando, senza dare consigli e senza parlare di terapie o professionisti.

STRUTTURA DA SEGUIRE
- Prima frase: riconosci e normalizza l'emozione o il vissuto descritto.
- Seconda frase: aiuta a mettere a fuoco un aspetto importante di ciò che prova (senza interpretazioni pesanti).
- Terza frase: fai una domanda aperta che inviti a proseguire la riflessione.

DOMANDA FINALE OBBLIGATORIA
Chiudi la risposta usando *esattamente* questa domanda (puoi solo adattare genere/numero se serve):

"${seedQuestion}"

ALTRI VINCOLI
- Non numerare le frasi.
- Non aggiungere spiegazioni meta (non dire che sei un'AI, non citare “MyndSelf”).
- Non superare le 3 frasi brevi.
    `.trim()

    // 4) chiama il modello con il prompt del Mentor
        const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: `
User is doing emotional journaling.

Today's data:
- Mood: ${mood || "not specified"}
- Note: ${note || "none"}
- Stated intention for the next weeks: "${goal || "not provided"}"

Your task:
- Offer a brief, kind reflection on what the user is experiencing today.
- When it feels natural, gently connect what you say to the stated intention (without forcing it).
- Do NOT give practical advice or instructions; do not tell the user what to do.
- Avoid imperative forms like "you should", "try to", "do this".
- Use at most 4 sentences in a single paragraph.
- Always end with one open question that invites the user to look at themself with a bit more curiosity.
`,
        },
      ],
      temperature: 0.8,
      max_tokens: 200,
    })


    const reflection =
      completion.choices?.[0]?.message?.content?.trim() ||
      "Grazie per aver condiviso. Restiamo un momento con quello che stai sentendo."
    const tags = extractTags(reflection)

    // 5) salva nel DB come prima
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
    
    if (!data || data.length === 0) {
      return reply.send({
        summary:
          "Per ora hai registrato poche riflessioni. Quando ne avrai qualcuna in più, potrò restituirti una piccola sintesi dei pattern emotivi che emergono.",
      })
    }
        const joined = data
      .map(
        (e, idx) =>
          `Check-in ${idx + 1}:\nMood: ${e.mood || ""}\nNote: ${
            e.note || ""
          }\nReflection: ${e.reflection || ""}`
      )
      .join("\n\n")

            const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        // prompt generale dell'app
        { role: "system", content: SYSTEM_PROMPT },
        // prompt specifico SOLO per questa sintesi settimanale
        {
          role: "system",
          content: `
In this task you are NOT a coach and you should not give advice, suggestions or action plans.
You are a gentle emotional mirror. You only describe patterns you notice and ask one soft reflective question.
Please do not use imperative forms like "prova a", "dovresti", "ti consiglio" or "fai".`,
        },
        {
          role: "user",
          content: `
The following are the user's most recent emotional check-ins (mood, note, reflection):

${joined}

Based on these entries, write a brief emotional insight about how this recent period seems to feel for the user.

Guidelines:
- Reply in the same language used in the entries (Italian if the text is Italian).
- Use 3–5 sentences in a single, compact paragraph.
- Start with a gentle summary of the overall emotional tone of this period.
- Highlight 1–2 recurring emotional patterns or themes you notice (without sounding certain or clinical).
- Do NOT give advice, instructions or a to-do list; keep it reflective, descriptive and kind.
- Ask exactly ONE soft reflective question at the very end (e.g. starting with "Che cosa", "C'è qualcosa", "In che modo").
- Speak directly to the user using second person singular ("tu").`,
        },
      ],
      max_tokens: 220,
      temperature: 0.7, 
    })

        let summary =
      completion.choices[0]?.message?.content?.trim() || ""

    // fallback di base se il modello non ha restituito nulla
    if (!summary) {
      summary =
        "In questo periodo sembri stare ascoltando con attenzione quello che provi. " +
        "C'è qualcosa che ti andrebbe di esplorare un po' meglio oggi?"
    }

    // Se non termina con un punto di domanda, aggiungiamo una domanda gentile.
    if (!/[?？]\s*$/.test(summary)) {
      // togliamo eventuali punti/finale spazi
      summary = summary.replace(/[\.\s]*$/, "")
      summary +=
        ". C'è qualcosa che ti andrebbe di guardare con un po' più di gentilezza oggi?"
    }

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
//  CHAT RIFLESSIVA (Mentor + memoria + contesto corto)
// =============================================================
// =============================================================
//  CHAT RIFLESSIVA (Mentor + memoria + contesto corto)
// =============================================================
app.post("/api/chat", async (req, reply) => {
  const { user_id, messages } = req.body || {}
  if (!user_id || !messages)
    return reply.code(400).send({ error: "Missing fields" })

  try {
    // prendo l'ultimo messaggio dell'utente per la memoria
    const lastUserMessage = [...messages].reverse().find(
      (m) => m.role === "user"
    )
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
        : "Nessuna riflessione passata particolarmente simile."

    // mantengo il contesto corto (ultimi scambi)
    const shortContext = messages.slice(-10)

    // prompt di contesto aggiuntivo per il Mentor
    const contextPrompt = `
Contesto aggiuntivo su questo utente:

- Tag emotivi dominanti (se presenti): ${
      profile?.dominant_tags?.join(", ") || "nessuno"
    }
- Ultimi mood/annotazioni:
${recentText || "nessuna registrazione recente"}
- Riflessioni passate simili:
${memoryText}

Usa queste informazioni solo per dare più profondità alla risposta,
senza elencarle esplicitamente e senza fare diagnosi.
`.trim()

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: MENTOR_SYSTEM_PROMPT },
        { role: "system", content: contextPrompt },
        ...shortContext,
      ],
      temperature: 0.6,
      max_tokens: 280,
    })

    const replyText =
      completion.choices?.[0]?.message?.content?.trim() ||
      "Ti ho ascoltato. Possiamo restare un momento con quello che senti."

    // salvataggi memoria
    if (userText) {
      await saveToMemory({ user_id, content: userText, source: "chat" })
    }
    await saveToMemory({ user_id, content: replyText, source: "chat_reply" })

    // salvataggio sessione chat
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
Sei un assistente emotivo molto gentile che analizza journaling emozionale.
Questi sono gli ultimi stati e riflessioni dell'utente:

${lastReflections.slice(0, 3000)}

Elabora in 3 brevi paragrafi, tono calmo e sintetico:
1. Descrivi le emozioni predominanti o ricorrenti che emergono, senza giudizio.
2. Spiega in modo leggero come sembra evolvere il tono emotivo nel tempo (più calmo, più stanco, più sereno...).
3. Concludi con una breve riflessione che aiuti la persona a guardarsi con più gentilezza, terminando con UNA domanda aperta.

Regole importanti:
- Non dare consigli, non proporre esercizi, non usare imperativi come "prova a", "fai", "ti invito a", "dovresti".
- Non scrivere una lista di passi o azioni.
- Parla direttamente alla persona dando del "tu".
- Rispondi in italiano.
`

const response = await openai.chat.completions.create({
  model: "gpt-4o-mini",
  messages: [
    {
      role: "system",
      content:
        "In questo compito non sei un coach e non dai consigli. Descrivi soltanto i pattern emotivi e chiudi con una domanda gentile.",
    },
    { role: "user", content: prompt },
  ],
  temperature: 0.7,
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
    // prompt dedicato per la sessione guidata, allineato al Mentor
const GUIDED_PROMPT = `
Sei MyndSelf Mentor, una guida emotiva gentile.

OBIETTIVO
Guidare una breve sessione guidata in 3–4 scambi, aiutando l'utente a osservare con più chiarezza cosa prova.

REGOLE GENERALI
- Non dai consigli pratici, non prescrivi soluzioni, non fai diagnosi.
- Non usi termini clinici e non citi terapie o farmaci.
- Non minimizzi e non amplifichi il dolore dell'utente.
- Usi frasi brevi (2–3 frasi) e un tono calmo, concreto, gentile.
- Scrivi sempre in italiano.
- Validi sempre brevemente ciò che l'utente prova prima di fare una domanda.

LOGICA DELLA SESSIONE
- Step 1–3: fai UNA sola domanda aperta che aiuti a esplorare il collegamento tra pensieri, emozioni, corpo, bisogni o valori.
- Step 4 (finale): NON fare domande. Offri una sintesi compassionevole di ciò che è emerso e una piccola proposta di gesto di cura o attenzione verso di sé, formulata in modo gentile (es. "Potrebbe aiutare..." invece di "Devi...").
`.trim()


   const turnInstruction = isFinal
  ? "STEP FINALE: Offri una breve sintesi compassionevole di ciò che è emerso e una sola piccola proposta di gesto di cura verso di sé. Non fare domande."
  : "STEP NON FINALE: Valida brevemente ciò che l'utente prova e poi fai UNA sola domanda aperta per andare un po' più in profondità."


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
app.post("/api/send-welcome-if-needed", async (req, reply) => {
  const { user_id } = req.body || {}
  if (!user_id) {
    return reply.code(400).send({ error: "Missing user_id" })
  }

  try {
    // 1) controlla se l'abbiamo già mandata
    const { data: flagRow, error: flagErr } = await supabase
      .from("user_flags")
      .select("welcome_sent")
      .eq("user_id", user_id)
      .maybeSingle()

    if (flagErr) throw flagErr

    if (flagRow?.welcome_sent) {
      return reply.send({ sent: false, reason: "already_sent" })
    }

    // 2) recupera l'email dall'auth di Supabase
    const { data: userData, error: userErr } =
      await supabase.auth.admin.getUserById(user_id)

    if (userErr) throw userErr

    const email = userData?.user?.email || userData?.email
    const name =
      userData?.user?.user_metadata?.full_name ||
      userData?.user?.user_metadata?.name ||
      null

    if (!email) {
      console.warn("⚠️ Nessuna email trovata per user_id", user_id)
      return reply.send({ sent: false, reason: "no_email" })
    }

    // 3) invia welcome email
    await sendWelcomeEmail({ to: email, name })

    // 4) marca come inviata
    await supabase.from("user_flags").upsert({
      user_id,
      welcome_sent: true,
    })

    reply.send({ sent: true })
  } catch (err) {
    console.error("❌ send-welcome-if-needed error:", err)
    reply.code(500).send({ error: err.message })
  }
})

app.get("/api/weekly-ritual", async (req, reply) => {
  const { user_id } = req.query || {}

  if (!user_id) {
    return reply.code(400).send({ error: "Missing user_id" })
  }

  try {
    // calcolo finestra ultimi 7 giorni (incluso oggi)
    const now = new Date()
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

    const fromIso = sevenDaysAgo.toISOString()
    const toIso = now.toISOString()

    // prendi le entry dell'utente negli ultimi 7 giorni
    const { data: entries, error } = await supabase
      .from("mood_entries")
      .select("mood, note, reflection, tags, at")
      .eq("user_id", user_id)
      .gte("at", fromIso)
      .lte("at", toIso)
      .order("at", { ascending: true })

    if (error) throw error

    if (!entries || entries.length === 0) {
      return reply.send({
        ritual: null,
        reason: "no_entries",
        entries_count: 0,
      })
    }

    // limitiamo a massimo 15 per non esplodere il prompt
    const limited = entries.slice(-15)

    const historyText = limited
      .map((e) => {
        const date = e.at
        const mood = e.mood || "non specificato"
        const note = e.note || ""
        const refl = e.reflection || ""
        return `- [${date}] Mood: ${mood} | Nota: ${note} | Riflessione: ${refl}`
      })
      .join("\n")

    const userPrompt = `
Stai preparando un piccolo rituale settimanale per una persona che tiene un diario emotivo.

Qui sotto trovi una lista in ordine cronologico delle sue ultime annotazioni (negli ultimi 7 giorni):

${historyText}

Il tuo compito è scrivere ESATTAMENTE un solo paragrafo (3–5 frasi) che:
- Nomina un unico pattern emotivo che sembra emergere questa settimana (es. "una alternanza tra stanchezza e speranza").
- Riconosce almeno una risorsa o qualità di cui la persona già dispone (es. momenti di gratitudine, piccoli spazi di respiro, relazioni di supporto).
- Termina con una sola domanda aperta, breve e gentile, che inizi con "Che cosa..." oppure "Qual è..." e la inviti a guardare la settimana con più curiosità.

Regole importanti:
- Scrivi in italiano.
- Dai del "tu".
- Non dare consigli pratici, non proporre esercizi, non usare frasi imperative ("dovresti", "prova a", "fai").
- Non parlare di "dati", "voci", "lista" o "registrazioni". Parla semplicemente della sua settimana.
`

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "Sei un mentor emotivo molto gentile. Offri solo riflessioni e domande, mai consigli o istruzioni.",
        },
        {
          role: "user",
          content: userPrompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 300,
    })

    const ritualText =
      completion.choices[0]?.message?.content?.trim() ||
      "Questa settimana hai attraversato emozioni diverse. Concediti un momento per riconoscere ciò che hai sentito. Che cosa ti colpisce di più se ripensi agli ultimi giorni?"

    return reply.send({
      ritual: ritualText,
      from: fromIso,
      to: toIso,
      entries_count: entries.length,
    })
  } catch (err) {
    console.error("❌ weekly-ritual error:", err)
    return reply.code(500).send({ error: err.message })
  }
})


// =============================================================
//  START
// =============================================================
app.listen({ port: PORT, host: "0.0.0.0" }, () => {
  console.log(`🚀 MyndSelf backend (G3) running on ${PORT}`)
})
