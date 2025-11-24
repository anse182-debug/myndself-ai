// backend/index.js
// MyndSelf.ai – Backend API (Fastify + Supabase + OpenAI)
// con Mentor + endpoint compatibili + fix per weekly_summaries mancanti

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
// ========== SUBSCRIBER & MENTOR HELPERS (VERSIONE SAFE) ==========
// Per ora NON leggiamo/possiamo leggere la tabella subscribers, perché la colonna user_id
// non esiste nel tuo schema. Usiamo sempre mentor_style = "calm".

async function getOrCreateSubscriber(userId) {
  // Stub: simuliamo un subscriber con mentor_style di default
  return { mentor_style: "calm" };
}

/**
 * Restituisce lo stile del mentor per un dato userId.
 * Attualmente ritorna sempre "calm" per non rompere nulla.
 */
async function getUserMentorStyle(userId) {
  return "calm";
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

// Helper per serializzare le ultime entry per la summary
function serializeEntriesForSummary(entries) {
  return (entries || [])
    .map(
      (e) =>
        `- [${e.created_at}] mood: ${e.mood || "n/d"}, note: ${
          e.note || "n/d"
        }`
    )
    .join("\n");
}

// Genera una weekly summary, opzionalmente salvandola in weekly_summaries
async function generateWeeklySummaryForUser(userId, language = "it", shouldSave = true) {
  const mentorStyle = await getUserMentorStyle(userId);
  const systemPrompt = buildSystemPromptForMentor(mentorStyle);

  const { data: entries, error } = await supabase
    .from("mood_entries")
    .select("mood, note, tags, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: true })
    .limit(60);

  if (error) {
    console.error("❌ Error fetching mood_entries for summary", error);
    throw error;
  }

  const serialized = serializeEntriesForSummary(entries);

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

  let inserted = null;

  if (shouldSave) {
    const { data: ins, error: insertError } = await supabase
      .from("weekly_summaries")
      .insert({
        user_id: userId,
        summary: summaryText,
      })
      .select()
      .single();

    if (insertError) {
      // se la tabella non esiste, non blocchiamo l'utente
      if (insertError.code === "PGRST205") {
        console.warn("⚠️ weekly_summaries table not found, returning summary without save");
      } else {
        console.error("❌ Error inserting weekly_summary", insertError);
        throw insertError;
      }
    } else {
      inserted = ins;
    }
  }

  return { summaryText, inserted };
}

// ========== ENDPOINT: REFLECTION ==========

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

    let reflectionText = raw;
    let tags = null;

    const tagsMatch = raw.match(/\[([^\]]+)\]/);
    if (tagsMatch) {
      try {
        const jsonLike = `[${tagsMatch[1]}]`;
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

// ========== ENDPOINT: MOOD OVERVIEW (Emotional Journey) ==========

fastify.get("/api/mood/overview", async (request, reply) => {
  const userId = request.query.user_id || request.query.userId;

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

// ========== ENDPOINT COMPATIBILE: /api/analytics/daily ==========

fastify.get("/api/analytics/daily", async (request, reply) => {
  const userId = request.query.user_id || request.query.userId;

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
      console.error("❌ Error fetching mood_entries (analytics)", error);
      return reply.status(500).send({ error: "DB fetch failed" });
    }

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
    console.error("❌ Analytics daily error:", error);
    return reply.status(500).send({ error: "Analytics daily failed" });
  }
});

// ========== ENDPOINT: ANALYTICS TAGS (/api/analytics/tags) ==========

fastify.get("/api/analytics/tags", async (request, reply) => {
  const userId = request.query.user_id || request.query.userId;

  if (!userId) {
    return reply.status(400).send({ error: "Missing userId" });
  }

  try {
    const { data: entries, error } = await supabase
      .from("mood_entries")
      .select("tags")
      .eq("user_id", userId);

    if (error) {
      console.error("❌ Error fetching tags from mood_entries", error);
      return reply.status(500).send({ error: "DB fetch failed" });
    }

    const tagCounts = {};
    for (const row of entries || []) {
      if (!row.tags || !Array.isArray(row.tags)) continue;
      for (const tag of row.tags) {
        if (!tag) continue;
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      }
    }

    return reply.send({ tagCounts });
  } catch (error) {
    console.error("❌ Analytics tags error:", error);
    return reply.status(500).send({ error: "Analytics tags failed" });
  }
});

// ========== ENDPOINT: WEEKLY SUMMARY (POST) ==========

fastify.post("/api/summary/weekly", async (request, reply) => {
  const { userId, language = "it" } = request.body || {};

  if (!userId) {
    return reply.status(400).send({ error: "Missing userId" });
  }

  try {
    const { summaryText, inserted } = await generateWeeklySummaryForUser(
      userId,
      language,
      true
    );

    return reply.send({
      summary: summaryText,
      entry: inserted,
    });
  } catch (error) {
    console.error("❌ Weekly summary error (POST):", error);
    return reply.status(500).send({ error: "Weekly summary failed" });
  }
});

// ========== ENDPOINT COMPATIBILE: GET /api/summary ==========

fastify.get("/api/summary", async (request, reply) => {
  const userId = request.query.user_id || request.query.userId;
  const saveParam = request.query.save;
  const language = request.query.language || "it";

  if (!userId) {
    return reply.status(400).send({ error: "Missing userId" });
  }

  const shouldSave =
    typeof saveParam === "string"
      ? saveParam.toLowerCase() === "true"
      : !!saveParam;

  try {
    const { summaryText, inserted } = await generateWeeklySummaryForUser(
      userId,
      language,
      shouldSave
    );

    return reply.send({
      summary: summaryText,
      entry: inserted,
    });
  } catch (error) {
    console.error("❌ Weekly summary error (GET /api/summary):", error);
    return reply.status(500).send({ error: "Summary failed" });
  }
});

// ========== ENDPOINT: LISTA WEEKLY SUMMARIES ==========

fastify.get("/api/summary/weekly", async (request, reply) => {
  const userId = request.query.user_id || request.query.userId;

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
      if (error.code === "PGRST205") {
        console.warn("⚠️ weekly_summaries table not found, returning empty list");
        return reply.send({ summaries: [] });
      }
      console.error("❌ Error fetching weekly_summaries", error);
      return reply.status(500).send({ error: "DB fetch failed" });
    }

    return reply.send({ summaries: data || [] });
  } catch (error) {
    console.error("❌ Weekly summary list error:", error);
    return reply.status(500).send({ error: "Weekly summary list failed" });
  }
});

// ========== ENDPOINT COMPATIBILE: /api/summary/history ==========

fastify.get("/api/summary/history", async (request, reply) => {
  const userId = request.query.user_id || request.query.userId;

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
      if (error.code === "PGRST205") {
        console.warn("⚠️ weekly_summaries table not found (history), returning empty list");
        return reply.send({ summaries: [] });
      }
      console.error("❌ Error fetching weekly_summaries (history)", error);
      return reply.status(500).send({ error: "DB fetch failed" });
    }

    return reply.send({ summaries: data || [] });
  } catch (error) {
    console.error("❌ Summary history error:", error);
    return reply.status(500).send({ error: "Summary history failed" });
  }
});

// ========== ENDPOINT: EMOTIONAL NOTE (BANNER) ==========

fastify.get("/api/emotional-note/latest", async (request, reply) => {
  const userId = request.query.user_id || request.query.userId;

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

// ========== ENDPOINT: CHAT (POST) ==========

// ========== ENDPOINT: CHAT (POST /api/chat) ==========

fastify.post("/api/chat", async (request, reply) => {
  const body = request.body || {};

  const userId =
    body.userId ||
    request.query?.user_id ||
    request.query?.userId ||
    null;

  // accettiamo message / text / content / prompt
  const message =
    body.message ??
    body.text ??
    body.content ??
    body.prompt ??
    "";

  const language = body.language || "it";

  // Ora richiediamo SOLO il messaggio, non più obbligatorio userId
  if (!message || typeof message !== "string" || !message.trim()) {
    return reply
      .status(400)
      .send({ error: "Missing message (message/text/content/prompt)" });
  }

  try {
    let mentorStyle = "calm";
    try {
      if (userId) {
        mentorStyle = await getUserMentorStyle(userId);
      }
    } catch (e) {
      console.warn("⚠️ getUserMentorStyle failed in chat, using calm:", e);
      mentorStyle = "calm";
    }

    const systemPrompt = buildSystemPromptForMentor(mentorStyle);

    // Proviamo a recuperare un po' di contesto, ma se la tabella non esiste non blocchiamo niente
    let historyMessages = [];
    try {
      const { data: history, error: historyError } = await supabase
        .from("chat_messages")
        .select("role, content, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: true })
        .limit(20);

      if (historyError) {
        console.warn("⚠️ Error fetching chat history in POST /api/chat:", historyError.message);
      } else if (history) {
        historyMessages = history.map((m) => ({
          role: m.role,
          content: m.content,
        }));
      }
    } catch (e) {
      console.warn("⚠️ Exception fetching chat history in POST /api/chat:", e);
    }

    const messages = [
      ...historyMessages,
      {
        role: "user",
        content: `Lingua: ${language}\n\n${message}`,
      },
    ];

    const answer = await callOpenAIChat({
      system: systemPrompt,
      messages,
    });

    // Proviamo a salvare, ma se la tabella non esiste non blocchiamo la risposta
    try {
      if (userId) {
        await supabase.from("chat_messages").insert([
          { user_id: userId, role: "user", content: message },
          { user_id: userId, role: "assistant", content: answer },
        ]);
      }
    } catch (e) {
      console.warn("⚠️ Error inserting chat_messages (non-blocking):", e.message || e);
    }

    return reply.send({ answer });
  } catch (error) {
    console.error("❌ Chat error:", error);
    return reply.status(500).send({ error: "Chat failed" });
  }
});

// ========== ENDPOINT: CHAT HISTORY (GET /api/chat/history) ==========

// ========== ENDPOINT: CHAT HISTORY (GET /api/chat/history) ==========
// Per ora non leggiamo il DB perché la tabella chat_messages non esiste nel tuo schema.
// Ritorniamo semplicemente una lista vuota di messaggi, così il frontend non va in errore.

fastify.get("/api/chat/history", async (request, reply) => {
  const userId = request.query.user_id || request.query.userId;

  if (!userId) {
    return reply.status(400).send({ error: "Missing userId" });
  }

  try {
    return reply.send({ messages: [] });
  } catch (error) {
    console.error("❌ Chat history error (stub):", error);
    return reply.status(500).send({ error: "Chat history failed" });
  }
});

// ========== ENDPOINT: EMOTIONAL PROFILE (/api/emotional-profile) ==========

fastify.get("/api/emotional-profile", async (request, reply) => {
  const userId = request.query.user_id || request.query.userId;

  if (!userId) {
    return reply.status(400).send({ error: "Missing userId" });
  }

  try {
    const { data: entries, error } = await supabase
      .from("mood_entries")
      .select("mood, tags, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: true })
      .limit(60);

    if (error) {
      console.error("❌ Error fetching mood_entries for emotional profile", error);
      return reply.status(500).send({ error: "DB fetch failed" });
    }

    // calcola conteggio mood
    const moodCounts = {};
    const tagCounts = {};
    for (const e of entries || []) {
      if (e.mood) {
        moodCounts[e.mood] = (moodCounts[e.mood] || 0) + 1;
      }
      if (Array.isArray(e.tags)) {
        for (const t of e.tags) {
          if (!t) continue;
          tagCounts[t] = (tagCounts[t] || 0) + 1;
        }
      }
    }

    // profilo minimale: nessuna chiamata AI per ora (evitiamo costi extra)
    return reply.send({
      moodCounts,
      tagCounts,
      hasData: (entries || []).length > 0,
    });
  } catch (error) {
    console.error("❌ Emotional profile error:", error);
    return reply.status(500).send({ error: "Emotional profile failed" });
  }
});
// ========== ENDPOINT: GUIDED REFLECTION (POST /api/guided-session e /api/guided) ==========

// ========== ENDPOINT: GUIDED REFLECTION ==========

// ========== ENDPOINT: GUIDED REFLECTION ==========

async function handleGuidedReflection(request, reply) {
  const body = request.body || {};

  // userId, se c'è, lo usiamo; se manca, andiamo comunque avanti
  const userId =
    body.userId ||
    request.query?.user_id ||
    request.query?.userId ||
    null;

  // step attuale (non è obbligatorio)
  const step = body.step ?? body.stage ?? null;

  // QUI la parte importante: recuperiamo la risposta dell’utente
  const answerRaw =
    body.answer ??
    body.text ??
    body.message ??
    body.content ??
    "";

  const language = body.language || "it";

  try {
    let mentorStyle = "calm";
    try {
      if (userId) {
        mentorStyle = await getUserMentorStyle(userId);
      }
    } catch (e) {
      console.warn("⚠️ getUserMentorStyle failed, using calm:", e);
      mentorStyle = "calm";
    }

    const systemPrompt = `
${buildSystemPromptForMentor(mentorStyle)}

Sei in modalità RIFLESSIONE GUIDATA.
L'utente sta rispondendo a una serie di piccole domande, passo per passo.
Il tuo compito:
- riconoscere brevemente ciò che l'utente ha condiviso;
- offrire 1–2 spunti di riflessione;
- proporre UNA sola domanda successiva, chiara e concreta.
Mantieni il tono caldo, non giudicante e rispettoso dei tempi dell'utente.
Rispondi in massimo 4–5 frasi.
`.trim();

    const userContent = `
Lingua: ${language}
Passo corrente: ${step || "non specificato"}
Risposta dell'utente: ${answerRaw || "(nessuna risposta inserita)"}

1) Riconosci ciò che l'utente ha condiviso con 1–2 frasi.
2) Aggiungi 1 piccolo spunto di consapevolezza o normalizzazione.
3) Concludi con UNA sola domanda, aperta ma semplice, per il prossimo passo.
`.trim();

    const replyText = await callOpenAIChat({
      system: systemPrompt,
      messages: [{ role: "user", content: userContent }],
    });

    return reply.send({ reply: replyText });
  } catch (error) {
    console.error("❌ Guided reflection error:", error);

    // Fallback di sicurezza, lo vedrai solo se OpenAI o il backend vanno in errore
    return reply.send({
      reply:
        "Grazie per aver condiviso. Restiamo un momento con quello che stai sentendo. Se vuoi, puoi aggiungere ancora qualche dettaglio su come ti senti adesso.",
    });
  }
}

fastify.post("/api/guided-session", handleGuidedReflection);
fastify.post("/api/guided", handleGuidedReflection);
fastify.post("/api/guided-reflection", handleGuidedReflection);
// ========== START SERVER ==========

try {
  await fastify.listen({ port: PORT, host: HOST });
  fastify.log.info(`🚀 MyndSelf backend (Mentor + compat + analytics) running on http://${HOST}:${PORT}`);
} catch (err) {
  fastify.log.error(err);
  process.exit(1);
}
