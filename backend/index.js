// backend/index.js
// MyndSelf.ai – Backend API (Fastify + Supabase + OpenAI) con Mentor

import Fastify from "fastify";
import cors from "@fastify/cors";
import { createClient } from "@supabase/supabase-js";
import OpenAI from "openai";

// ========== ENV ==========

const PORT = process.env.PORT || 8080;
const HOST = process.env.HOST || "0.0.0.0";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("❌ Missing Supabase env vars");
  process.exit(1);
}

if (!OPENAI_API_KEY) {
  console.error("❌ Missing OPENAI_API_KEY");
  process.exit(1);
}

// ========== CLIENTS ==========

const fastify = Fastify({ logger: true });

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

// ========== CORS ==========

await fastify.register(cors, {
  origin: process.env.FRONTEND_ORIGIN || true,
  methods: ["GET", "POST", "OPTIONS"],
});

// ========== BASE SYSTEM PROMPT ==========

const BASE_SYSTEM_PROMPT = `
Sei un assistente di supporto emotivo per MyndSelf.ai.
Il tuo obiettivo è aiutare l'utente a:
- dare un nome a ciò che prova,
- sentirsi compreso e non giudicato,
- trovare piccoli passi concreti per prendersi cura di sé.

Linee guida:
- Non fare diagnosi cliniche.
- Non usare etichette psicopatologiche (es. "depressione", "disturbo", "trauma complesso").
- Non dare consigli medici o farmacologici.
- Mantieni un tono caldo, empatico e chiaro.
- Usa frasi relativamente brevi.
- Puoi usare elenchi puntati per organizzare le idee.
- Se l'utente esprime pensieri di autolesionismo o grave rischio, invita a contattare un professionista o un servizio di emergenza locale.
`;

// ========== MENTOR STYLES (PROMPTS) ==========

const CALM_PROMPT = `
Tu sei la "Guida calma".
Parli con un tono morbido, pacato e rassicurante.
Aiuti l’utente a respirare, normalizzi le emozioni, non giudichi.
Usi frasi semplici e relativamente brevi.
Inviti all’ascolto del corpo e alla centratura, senza fare diagnosi.
`;

const PRAGMATIC_PROMPT = `
Tu sei il "Coach pragmatico".
Parli in modo diretto, chiaro e orientato all’azione.
Aiuti l’utente a individuare 2–3 passi concreti che può fare subito.
Eviti frasi troppo lunghe o vaghe.
Dai priorità alla chiarezza, alla struttura e alla motivazione.
Non fai diagnosi né usi un linguaggio clinico.
`;

const MINDFUL_PROMPT = `
Tu sei il "Mentore cognitivo".
Combini un tono caldo con tecniche leggere di CBT e ACT.
Aiuti l’utente a riconoscere le emozioni, distinguere pensieri e fatti
e usare piccoli esercizi di consapevolezza.
Normalizzi le esperienze difficili senza minimizzarle.
Non fai diagnosi né usi etichette cliniche.
`;

/**
 * Restituisce il prompt specifico in base allo stile del mentor.
 * Valori attesi: "calm" | "pragmatic" | "mindful"
 */
function getMentorPrompt(style) {
  switch (style) {
    case "pragmatic":
      return PRAGMATIC_PROMPT;
    case "mindful":
      return MINDFUL_PROMPT;
    case "calm":
    default:
      return CALM_PROMPT;
  }
}

/**
 * Combina il system prompt base con lo stile del Mentor selezionato.
 */
function buildSystemPromptForMentor(style) {
  const mentorPrompt = getMentorPrompt(style);
  return `
${BASE_SYSTEM_PROMPT}

-----
STILE DEL MENTOR SELEZIONATO:

${mentorPrompt}
`.trim();
}

// ========== SUBSCRIBER & MENTOR HELPERS ==========

/**
 * Restituisce il subscriber per uno user_id.
 * Se non esiste ancora, lo crea con mentor_style = "calm".
 *
 * Tabelle attese:
 * - subscribers: { id, user_id, mentor_style, created_at, ... }
 */
async function getOrCreateSubscriber(userId) {
  const { data: existing, error: readError } = await supabase
    .from("subscribers")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (readError) {
    console.error("❌ Error fetching subscriber", readError);
    throw readError;
  }

  if (existing) {
    return existing;
  }

  const { data: inserted, error: insertError } = await supabase
    .from("subscribers")
    .insert({
      user_id: userId,
      mentor_style: "calm",
    })
    .select()
    .single();

  if (insertError) {
    console.error("❌ Error creating subscriber", insertError);
    throw insertError;
  }

  return inserted;
}

/**
 * Restituisce lo stile del mentor per un dato userId.
 * Se non impostato, restituisce "calm".
 */
async function getUserMentorStyle(userId) {
  const subscriber = await getOrCreateSubscriber(userId);
  const style = subscriber.mentor_style || "calm";
  return style;
}

// ========== HEALTHCHECK ==========

fastify.get("/health", async () => {
  return { status: "ok", service: "myndself-backend" };
});

// ========== AI HELPERS ==========

async function callOpenAIChat({ system, messages }) {
  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: system },
      ...messages,
    ],
    temperature: 0.4,
  });

  const content = completion.choices?.[0]?.message?.content || "";
  return content;
}

// ========== ENDPOINT: REFLECTION ==========
/**
 * POST /api/reflection
 * Body: { userId, mood, note, language }
 *
 * - genera una riflessione con l'AI
 * - salva su mood_entries { user_id, mood, note, reflection, tags, at }
 */
fastify.post("/api/reflection", async (request, reply) => {
  const { userId, mood, note, language = "it" } = request.body || {};

  if (!userId) {
    return reply.status(400).send({ error: "Missing userId" });
  }

  try {
    const mentorStyle = await getUserMentorStyle(userId);
    const systemPrompt = buildSystemPromptForMentor(mentorStyle);

    const userMessage = `
Lingua: ${language}
Umore dichiarato: ${mood || "non specificato"}
Nota dell'utente: ${note || "(nessuna nota)"}

1) Rispondi con una breve riflessione empatica (max 4-5 frasi).
2) Suggerisci 1 piccolo passo concreto per oggi.
3) Identifica 2-3 tag emozionali sintetici (es. "ansia", "stanchezza", "speranza") in formato array JSON.
`.trim();

    const raw = await callOpenAIChat({
      system: systemPrompt,
      messages: [{ role: "user", content: userMessage }],
    });

    // Proviamo a estrarre i tag da una sezione tipo "Tag: [...]"
    let reflectionText = raw;
    let tags = null;

    const tagsMatch = raw.match(/\[([^\]]+)\]/);
    if (tagsMatch) {
      try {
        const jsonLike = `[${tagsMatch[1]}]`;
        // Normalizza eventuali virgolette
        const normalized = jsonLike.replace(/'/g, '"');
        tags = JSON.parse(normalized);
      } catch (e) {
        console.warn("⚠️ Could not parse tags from AI response", e);
      }
    }

    const { data: inserted, error: insertError } = await supabase
      .from("mood_entries")
      .insert({
        user_id: userId,
        mood,
        note,
        reflection: reflectionText,
        tags,
      })
      .select()
      .single();

    if (insertError) {
      console.error("❌ Error inserting mood_entry", insertError);
      return reply.status(500).send({ error: "DB insert failed" });
    }

    return reply.send({
      reflection: reflectionText,
      tags,
      entry: inserted,
    });
  } catch (error) {
    console.error("❌ Reflection error:", error);
    return reply.status(500).send({ error: "Reflection failed" });
  }
});

// ========== ENDPOINT: MOOD OVERVIEW (EMOTIONAL JOURNEY) ==========
/**
 * GET /api/mood/overview?userId=...
 *
 * Restituisce:
 * - entries recenti (es. 30 giorni)
 * - conteggio emozioni più frequenti
 */
fastify.get("/api/mood/overview", async (request, reply) => {
  const { userId } = request.query;

  if (!userId) {
    return reply.status(400).send({ error: "Missing userId" });
  }

  try {
    const { data: entries, error } = await supabase
      .from("mood_entries")
      .select("id, mood, note, tags, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("❌ Error fetching mood_entries", error);
      return reply.status(500).send({ error: "DB fetch failed" });
    }

    // Conta le emozioni più frequenti dalla colonna mood
    const moodCounts = {};
    for (const e of entries || []) {
      if (!e.mood) continue;
      moodCounts[e.mood] = (moodCounts[e.mood] || 0) + 1;
    }

    return reply.send({
      entries: entries || [],
      moodCounts,
    });
  } catch (error) {
    console.error("❌ Mood overview error:", error);
    return reply.status(500).send({ error: "Mood overview failed" });
  }
});

// ========== ENDPOINT: WEEKLY SUMMARY ==========
/**
 * POST /api/summary/weekly
 * Body: { userId, language }
 *
 * - prende le ultime X entry
 * - genera una sintesi settimanale
 * - salva in weekly_summaries
 */
fastify.post("/api/summary/weekly", async (request, reply) => {
  const { userId, language = "it" } = request.body || {};

  if (!userId) {
    return reply.status(400).send({ error: "Missing userId" });
  }

  try {
    const mentorStyle = await getUserMentorStyle(userId);
    const systemPrompt = buildSystemPromptForMentor(mentorStyle);

    const { data: entries, error } = await supabase
      .from("mood_entries")
      .select("mood, note, tags, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: true })
      .limit(60); // ultime 60 entry, es.

    if (error) {
      console.error("❌ Error fetching mood_entries for summary", error);
      return reply.status(500).send({ error: "DB fetch failed" });
    }

    const serialized = (entries || [])
      .map(
        (e) =>
          `- [${e.created_at}] mood: ${e.mood || "n/d"}, note: ${
            e.note || "n/d"
          }`
      )
      .join("\n");

    const userMessage = `
Lingua: ${language}

Queste sono le ultime riflessioni dell'utente:

${serialized || "(nessun dato disponibile)"}

1) Scrivi una breve sintesi della settimana emotiva (max 8–10 frasi).
2) Evidenzia i 2–3 temi principali.
3) Proponi 2 suggerimenti pratici per la prossima settimana.
`.trim();

    const summaryText = await callOpenAIChat({
      system: systemPrompt,
      messages: [{ role: "user", content: userMessage }],
    });

    const { data: inserted, error: insertError } = await supabase
      .from("weekly_summaries")
      .insert({
        user_id: userId,
        summary: summaryText,
      })
      .select()
      .single();

    if (insertError) {
      console.error("❌ Error inserting weekly_summary", insertError);
      return reply.status(500).send({ error: "DB insert failed" });
    }

    return reply.send({
      summary: summaryText,
      entry: inserted,
    });
  } catch (error) {
    console.error("❌ Weekly summary error:", error);
    return reply.status(500).send({ error: "Weekly summary failed" });
  }
});

/**
 * GET /api/summary/weekly?userId=...
 * Restituisce le sintesi salvate (ultime N).
 */
fastify.get("/api/summary/weekly", async (request, reply) => {
  const { userId } = request.query;

  if (!userId) {
    return reply.status(400).send({ error: "Missing userId" });
  }

  try {
    const { data, error } = await supabase
      .from("weekly_summaries")
      .select("id, summary, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("❌ Error fetching weekly_summaries", error);
      return reply.status(500).send({ error: "DB fetch failed" });
    }

    return reply.send({ summaries: data || [] });
  } catch (error) {
    console.error("❌ Weekly summary list error:", error);
    return reply.status(500).send({ error: "Weekly summary list failed" });
  }
});

// ========== ENDPOINT: EMOTIONAL NOTE (BANNER) ==========
/**
 * GET /api/emotional-note/latest?userId=...
 *
 * Restituisce l'ultima nota emotiva sintetica (se c'è).
 * Se non hai una tabella dedicata, puoi ricollegarla a weekly_summaries.summary
 * oppure usare una tabella emotional_notes.
 */
fastify.get("/api/emotional-note/latest", async (request, reply) => {
  const { userId } = request.query;

  if (!userId) {
    return reply.status(400).send({ error: "Missing userId" });
  }

  try {
    const { data, error } = await supabase
      .from("emotional_notes")
      .select("id, note, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error && error.code !== "PGRST116") {
      // PGRST116 = no rows
      console.error("❌ Error fetching emotional_notes", error);
      return reply.status(500).send({ error: "DB fetch failed" });
    }

    if (!data) {
      return reply.send({ note: null });
    }

    return reply.send({ note: data.note, createdAt: data.created_at });
  } catch (error) {
    console.error("❌ Emotional note error:", error);
    return reply.status(500).send({ error: "Emotional note failed" });
  }
});

// ========== ENDPOINT: CHAT ==========
/**
 * POST /api/chat
 * Body: { userId, message, language }
 *
 * - legge lo storico da chat_messages
 * - aggiunge il messaggio utente
 * - chiama l'AI
 * - salva sia il messaggio utente che la risposta
 */
fastify.post("/api/chat", async (request, reply) => {
  const { userId, message, language = "it" } = request.body || {};

  if (!userId || !message) {
    return reply.status(400).send({ error: "Missing userId or message" });
  }

  try {
    const mentorStyle = await getUserMentorStyle(userId);
    const systemPrompt = buildSystemPromptForMentor(mentorStyle);

    // recupera ultimi N messaggi chat
    const { data: history, error: historyError } = await supabase
      .from("chat_messages")
      .select("role, content, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: true })
      .limit(20);

    if (historyError) {
      console.error("❌ Error fetching chat history", historyError);
    }

    const messages = [
      { role: "system", content: systemPrompt },
      ...(history || []).map((m) => ({
        role: m.role,
        content: m.content,
      })),
      {
        role: "user",
        content: `Lingua: ${language}\n\n${message}`,
      },
    ];

    const answer = await callOpenAIChat({ system: systemPrompt, messages: messages.slice(1) });

    // salva messaggi
    const { error: insertError } = await supabase
      .from("chat_messages")
      .insert([
        { user_id: userId, role: "user", content: message },
        { user_id: userId, role: "assistant", content: answer },
      ]);

    if (insertError) {
      console.error("❌ Error inserting chat_messages", insertError);
    }

    return reply.send({ answer });
  } catch (error) {
    console.error("❌ Chat error:", error);
    return reply.status(500).send({ error: "Chat failed" });
  }
});

// ========== START SERVER ==========

try {
  await fastify.listen({ port: PORT, host: HOST });
  fastify.log.info(`🚀 MyndSelf backend (Mentor) running on http://${HOST}:${PORT}`);
} catch (err) {
  fastify.log.error(err);
  process.exit(1);
}
