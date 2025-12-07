// src/Landing.tsx
import { useState } from "react"
import { Section } from "./components/Section"
import { CTAForm } from "./components/CTAForm"
import { Link } from "react-router-dom"

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8080"

type Lang = "it" | "en"

const copy = {
  it: {
    header: {
      how: "Come funziona",
      mentor: "Mentor AI",
      insight: "Insight",
      faq: "FAQ",
      openApp: "Apri nell'app",
      betaBadge: "Pre-lancio • Accesso anticipato",
    },
    hero: {
      pill: "Una pausa emotiva di un minuto, ogni giorno",
      title: "Chiarezza emotiva in 60 secondi, con un Mentor AI gentile.",
      subtitle:
        "Registra come stai, l’AI ti aiuta a mettere ordine dentro: riconosci i tuoi pattern emotivi nel tempo, senza giudicarti e senza perdere tempo.",
      bullets: [
        "Check-in emotivi rapidissimi, anche nelle giornate piene",
        "Un Mentor AI che ricorda come ti senti e ti fa le domande giuste",
        "Insight che ti aiutano a notare cosa si ripete e cosa cambia",
      ],
      ctaTitle:
        "Iscriviti per entrare nella beta privata di MyndSelf.ai.",
      ctaNote: "Niente spam: solo aggiornamenti sul lancio e l’accesso anticipato.",
    },
    how: {
      title: "Come funziona MyndSelf.ai",
      subtitle:
        "Un rituale leggero attorno a tre momenti chiave.",
      cards: [
        {
          title: "1. Check-in veloce",
          body: "In meno di un minuto registri come ti senti, con una parola o una breve frase.",
        },
        {
          title: "2. Mentor AI",
          body: "Un'AI gentile ti fa domande, ti restituisce prospettiva e sintetizza cosa sta succedendo dentro di te.",
        },
        {
          title: "3. Insight nel tempo",
          body: "Settimana dopo settimana, emergono ricorrenze emotive, cambiamenti e micro-pattern che da solo faticheresti a vedere.",
        },
      ],
    },
    mentor: {
      title: "Il tuo Mentor AI, su misura",
      subtitle:
        "Non un chatbot qualsiasi: un alleato che si adatta al tuo linguaggio emotivo.",
      body: [
        "MyndSelf.ai impara dalle parole che usi, dalle emozioni che tornano e da come rispondi alle domande. Non ti dice cosa fare: ti aiuta a capire meglio cosa senti.",
      ],
      bullets: [
        "Tonalità gentile, diretta ma non invadente",
        "Domande brevi che ti aiutano a fare chiarezza",
        "Sintesi emotive settimanali per avere una visione d’insieme",
        "Memoria dei pattern, senza ripetere sempre gli stessi consigli",
      ],
      disclaimer:
        "MyndSelf.ai non sostituisce un professionista, ma può diventare uno spazio quotidiano in cui coltivare consapevolezza emotiva.",
      exampleLabel: "Un esempio di dialogo con il Mentor",
    },
    insight: {
      title: "Insight che raccontano la tua storia",
      subtitle:
        "Non solo sfoghi, ma una visione più chiara di come ti muovi nel tempo.",
      trendTitle: "Trend settimanali",
      trendBody:
        "MyndSelf.ai crea piccole sintesi della tua settimana emotiva, evidenziando cosa è cambiato, cosa torna spesso e dove stai costruendo nuove abitudini interiori.",
      trendList: [
        "Momenti in cui ti senti più fragile o più carico",
        "Temi che ricorrono nelle tue parole",
        "Progressi che potresti non notare da solo",
      ],
      graphTitle: "Un grafico che parla di te",
      graphBody:
        "Man mano che registri le tue riflessioni, MyndSelf.ai costruisce una mappa delle emozioni che attraversi. Non per giudicarti, ma per aiutarti a riconoscere quando è il momento di rallentare, chiedere supporto o celebrare.",
      graphNote:
        "La versione beta si concentrerà su pochi indicatori essenziali. Non vogliamo trasformare la tua vita in una dashboard da KPI.",
    },

    beta: {
    title: "Cosa troverai nella beta",
    subtitle:
      "Una versione essenziale, ma già utile per capire se MyndSelf fa per te.",
    items: [
      {
        title: "Check-in emotivi rapidi",
        body:
          "Registri come stai in pochi secondi, con emozioni selezionabili e uno spazio testuale solo quando serve.",
      },
      {
        title: "Prime versioni del Mentor AI",
        body:
          "Un Mentor gentile che ti fa domande brevi, ti restituisce una piccola sintesi e inizia a riconoscere i tuoi pattern.",
      },
      {
        title: "Insight e trend base",
        body:
          "Una prima vista sui momenti ricorrenti e sulle parole che usi più spesso.",
      },
    ],
  },
    cta: {
      title:
        "Vuoi costruire questo rituale insieme a noi?",
      body:
        "Stiamo avviando una beta privata con un piccolo gruppo di persone che vogliono prendersi cura delle proprie emozioni in modo semplice ma costante. Se ti risuona, lascia la tua email.",
      note:
        "La useremo solo per invitarti e raccogliere feedback che aiuteranno a modellare il Mentor AI.",
      label: "Accesso anticipato · Posti limitati",
    },
    faq: {
      title: "Domande frequenti",
      items: [
        {
          q: "MyndSelf.ai sostituisce uno psicologo?",
          a: "No. MyndSelf.ai può diventare un alleato quotidiano per fare chiarezza, ma non sostituisce un professionista. Può però aiutarti ad arrivare alla terapia con più consapevolezza di ciò che senti.",
        },
        {
          q: "Quanto tempo richiede?",
          a: "Meno di un minuto al giorno, con possibilità di approfondire quando vuoi.",
        },
        {
          q: "I miei dati sono al sicuro?",
          a: "Le tue riflessioni sono salvate in modo sicuro e usate solo per generare insight per te. Non venderemo mai i tuoi dati e non li useremo mai per advertising.",
        },
        {
          q: "Quando parte la beta?",
          a: "Nei prossimi mesi. Chi è in lista d’attesa riceverà l’invito prima del lancio pubblico.",
        },
      ],
    },
    footer: {
      tagline: "Uno spazio sicuro per le tue emozioni.",
    },
  },

  en: {
  header: {
    how: "How it works",
    mentor: "AI Mentor",
    insight: "Insights",
    faq: "FAQ",
    openApp: "Open the app",
    betaBadge: "Pre-launch • Early access",
  },
  hero: {
    pill: "A tiny emotional check-in, every day",
    title: "Emotional clarity in 60 seconds, with a gentle AI mentor.",
    subtitle:
      "Capture how you feel, let the AI help you make sense of it, and start seeing your emotional patterns over time — without judgment, in a short ritual you can actually stick to.",
    bullets: [
      "Fast emotional check-ins, even when you barely have time",
      "An AI mentor that remembers how you feel and asks better questions",
      "Insights and trends that help you notice your patterns",
    ],
    ctaTitle:
      "Join the early access list to be among the first to try MyndSelf.ai.",
    ctaNote: "No spam, only important updates about the launch.",
  },
  how: {
    title: "How MyndSelf.ai works",
    subtitle: "A light emotional ritual, built around three key moments.",
    cards: [
      {
        title: "1. Quick check-in",
        body:
          "Every day, in under a minute, you capture how you feel with a few taps and a couple of words.",
      },
      {
        title: "2. AI mentor",
        body:
          "A gentle AI asks you short questions, gives you perspective, and summarises what’s going on inside.",
      },
      {
        title: "3. Insights over time",
        body:
          "Week after week, you start seeing patterns, recurring themes, and small changes you’d normally miss.",
      },
    ],
  },
  mentor: {
    title: "Your AI mentor, shaped around you",
    subtitle:
      "Not a generic chatbot, but an ally that adapts to you and your emotional states.",
    body: [
      "MyndSelf.ai learns from how you describe your days, from the emotions that keep coming back, and from how you answer its questions. It’s not there to judge you, but to help you see things more clearly.",
    ],
    bullets: [
      "Gentle, direct dialogue without being intrusive",
      "Short questions that help you put things in order",
      "Weekly emotional summaries that give you the bigger picture",
      "Memory of your patterns, without repeating the same advice",
    ],
    disclaimer:
      "MyndSelf.ai doesn’t replace professional help, but it can become a daily space where you take care of yourself with continuity.",
    exampleLabel: "Example of a moment with the mentor",
  },
  insight: {
    title: "Insights that give you back the storyline",
    subtitle:
      "Not only venting, but a clearer view of how you move through time.",
    trendTitle: "Weekly trends",
    trendBody:
      "MyndSelf.ai creates short summaries of your emotional week, highlighting what changed, what keeps showing up, and where you’re building new inner habits.",
    trendList: [
      "Moments when you feel more drained or overwhelmed",
      "Themes that keep coming back in your words",
      "Small progress you would otherwise overlook",
    ],
    graphTitle: "A graph that talks about you, not just numbers",
    graphBody:
      "As you log your reflections, MyndSelf.ai builds a map of the emotions you go through. Not to judge you, but to help you know when it’s time to slow down, reach out, or celebrate.",
    graphNote:
      "The beta focuses on a few essential indicators, so your emotional life doesn’t turn into just another KPI dashboard.",
  },
  beta: {
    title: "What you’ll find in the beta",
    subtitle:
      "The private beta focuses on a few essential pieces that are already useful to see if MyndSelf is a fit for you.",
    items: [
      {
        title: "Fast emotional check-ins",
        body:
          "You can capture how you feel in under a minute, with selectable emotions and a text field only when you need it.",
      },
      {
        title: "Early versions of the AI mentor",
        body:
          "A gentle mentor that asks short questions, gives you a small reflection back, and starts noticing your emotional patterns.",
      },
      {
        title: "Basic insights and trends",
        body:
          "An initial view on when you feel more drained or energised, and on recurring themes in the words you use.",
      },
    ],
  },
  cta: {
    title: "Want to be among the first to build this ritual with MyndSelf.ai?",
    body:
      "We’re preparing a private beta with a small group of people who want to care for their emotions in a gentle but structured way. If that resonates with you, leave your email.",
    note:
      "We’ll co-create the product together and tune the AI mentor on real-life situations.",
    label: "Early access · Limited seats",
  },
  faq: {
    title: "Frequently asked questions",
    items: [
      {
        q: "Does MyndSelf.ai replace therapy?",
        a:
          "No. MyndSelf.ai can be a daily ally to gain clarity, but it does not replace a professional. It can, however, help you arrive in therapy with more awareness of what you feel.",
      },
      {
        q: "How much time does it take each day?",
        a:
          "The goal is to stay under one minute for the daily check-in, with the option to go deeper only when you want to.",
      },
      {
        q: "Are my data safe?",
        a:
          "Your reflections are stored securely and only used to generate insights for you. We don’t sell your data and we don’t use them for advertising.",
      },
      {
        q: "When will the beta start?",
        a:
          "We’re working on a closed beta in the next few months. People on the waitlist will receive the invite before the public launch.",
      },
    ],
  },
  footer: {
    tagline: "A safe space for your emotions.",
  },
},
} as const



export default function Landing() {
const [lang, setLang] = useState<Lang>(() =>
    typeof navigator !== "undefined" && navigator.language?.startsWith("it")
      ? "it"
      : "en"
  )

  const { header, hero, how, mentor, insight, beta, cta, faq, footer } = copy[lang]
  
  return (
    <main className="min-h-screen bg-gray-950 text-gray-50">
      {/* HEADER */}
      <header className="border-b border-white/5">
  <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 py-5 flex items-center justify-between gap-3">
    <div className="flex items-center gap-3">
      <img src="/logo.svg" alt="MyndSelf.ai" className="h-9" />
      <div>
        <h1 className="text-lg font-semibold text-emerald-200">
          MyndSelf.ai
        </h1>
        <p className="text-xs text-gray-400">
          Intelligenza emotiva supportata dall&apos;AI
        </p>
      </div>
    </div>

    <div className="flex items-center gap-4">
      <nav className="hidden md:flex items-center gap-6 text-sm text-gray-300">
        <a href="#how-it-works" className="hover:text-gray-100">
          {header.how}
        </a>
        <a href="#mentor" className="hover:text-gray-100">
          {header.mentor}
        </a>
        <a href="#insight" className="hover:text-gray-100">
          {header.insight}
        </a>
        <a href="#faq" className="hover:text-gray-100">
          {header.faq}
        </a>
      </nav>
      <button
          type="button"
          onClick={() => setLang(lang === "it" ? "en" : "it")}
          className="text-xs px-2 py-1 rounded-full border border-white/15 text-gray-300 hover:bg-white/5"
        >
          {lang === "it" ? "IT · EN" : "EN · IT"}
        </button>
     
    </div>
  </div>
</header>

      {/* HERO */}
      <section className="relative overflow-hidden border-b border-white/5">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(45,212,191,0.18),_transparent_55%),radial-gradient(circle_at_bottom,_rgba(59,130,246,0.18),_transparent_55%)]" />
        <div className="relative max-w-6xl mx-auto px-6 pt-12 pb-20 lg:pt-20 lg:pb-24 grid gap-10 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] items-center">
          <div className="space-y-5">
            <p className="inline-flex items-center gap-2 text-xs font-medium px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-400/40 text-emerald-100">
              <span className="text-lg">🧠</span>
              {hero.pill}
            </p>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight text-gray-100">
             {hero.title}
            </h1>
            <p className="text-sm sm:text-base text-gray-300 max-w-xl">
             {hero.subtitle}
            </p>
            <ul className="text-sm text-gray-300 space-y-1">
              {hero.bullets.map((line) => (
          <li key={line}>• {line}</li>
        ))}
            </ul>

            <div
              id="early-access"
              className="mt-6 max-w-xl bg-gray-950/40 border border-white/10 rounded-2xl p-4 sm:p-5 backdrop-blur"
            >
              <p className="text-xs uppercase tracking-wide text-gray-400 mb-1">
                {header.betaBadge}
              </p>
              <p className="text-sm text-gray-100 mb-3">
                {hero.ctaTitle}
              </p>
              <CTAForm apiBase={API_BASE} />
              <p className="mt-2 text-[11px] text-gray-400">
                {hero.ctaNote}
              </p>
            </div>
          </div>

          {/* Mock UI preview */}
          <div className="lg:pl-4 flex justify-center">
            <div className="w-full max-w-sm">
              <div className="rounded-3xl bg-gradient-to-b from-slate-900 to-gray-950 border border-white/10 shadow-[0_0_60px_rgba(15,118,110,0.45)] p-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center border border-emerald-400/40">
                      <span>🪷</span>
                    </div>
                    <div>
                      <p className="text-xs text-mist/70">Oggi</p>
                      <p className="text-sm font-medium text-gray-100">
                        Riflessione del giorno
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] px-2 py-1 rounded-full bg-emerald-500/15 text-emerald-100 border border-emerald-400/40">
                    1 min
                  </span>
                </div>

                <div className="space-y-2 mb-4">
                  <p className="text-[11px] text-mist/70">
                    Come ti senti adesso?
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {["Calmo", "Grato", "Stressato", "Sovraccarico"].map((mood) => (
                      <span
                        key={mood}
                        className="text-[11px] px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-gray-300"
                      >
                        {mood}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="bg-white/3 rounded-2xl border border-white/10 p-3 mb-3">
                  <p className="text-[11px] text-mist/70 mb-1">
                    Mentor AI · Messaggio di sintesi
                  </p>
                  <p className="text-xs text-mist/95">
                    Sembra che tu stia portando molto sulle spalle. Facciamo
                    un piccolo passo alla volta: cosa ti andrebbe di lasciare
                    andare, solo per oggi?
                  </p>
                </div>

                <button className="w-full mt-1 text-xs font-medium bg-emerald-400/90 text-dark rounded-xl py-2.5 hover:bg-emerald-400 transition-colors">
                  Inizia il tuo primo check-in
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* COME FUNZIONA */}
      <div id="how-it-works">
        <Section
          title={how.title}
          subtitle={how.subtitle}
        />
        <div className="max-w-6xl mx-auto px-6 pb-12 grid gap-6 md:grid-cols-3">
          {how.cards.map((card) => (
    <Card key={card.title} title={card.title} body={card.body} />
  ))}
        </div>
      </div>

      {/* MENTOR AI */}
      <div id="mentor" className="border-t border-white/5 bg-gray-950/40">
        <Section
          title={mentor.title}
          subtitle={mentor.subtitle}
        />
        <div className="max-w-6xl mx-auto px-6 pb-14 grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] items-center">
          <div className="space-y-4 text-sm text-mist/85">
            {mentor.body.map((p) => (
    <p key={p}>{p}</p>
  ))}
            <ul className="space-y-2">
    {mentor.bullets.map((b) => (
      <li key={b}>• {b}</li>
    ))}
  </ul>
            <p className="text-xs text-gray-500">{mentor.disclaimer}</p>
          </div>
          <div className="bg-gray-900/70 border border-white/10 rounded-2xl p-4 space-y-3 text-sm">
            <p className="text-[11px] text-emerald-300/80 uppercase tracking-wide">
              {mentor.exampleLabel}
            </p>
            <Bubble role="assistant">
              Ho notato che negli ultimi giorni parli spesso di sentirti
              sovraccarico. Ti va di raccontarmi un singolo momento in cui lo hai
              sentito più forte?
            </Bubble>
            <Bubble role="user">
              Quando rientro a casa la sera e mi sembra di non avere spazio per
              recuperare.
            </Bubble>
            <Bubble role="assistant">
              Ha senso che tu ti senta così. Nel tuo posto, molte persone
              sentirebbero una pressione simile. Ti propongo una micro-domanda:
              cosa potrebbe rendere la tua serata più “tua”, anche solo del 5%?
            </Bubble>
          </div>
        </div>
      </div>

      {/* INSIGHT / TREND */}
      <div id="insight">
        <Section
          title={insight.title}
          subtitle={insight.subtitle}
        />
        <div className="max-w-6xl mx-auto px-6 pb-16 grid gap-6 md:grid-cols-2">
          <div className="bg-gray-900/70 border border-white/10 rounded-2xl p-5 space-y-3 text-sm text-mist/85">
            <h3 className="text-sm font-semibold text-gray-100">{insight.trendTitle}</h3>
            <p>
              {insight.trendBody}
            </p>
            <ul className="text-xs text-mist/70 space-y-1.5">
              {insight.trendList.map((line) => (
    <li key={line}>• {line}</li>
  ))}
            </ul>
          </div>
          <div className="bg-gray-900/70 border border-white/10 rounded-2xl p-5 text-sm text-mist/85">
            <h3 className="text-sm font-semibold text-gray-100">
              {insight.graphTitle}
            </h3>
            <p className="mt-2">
              {insight.graphBody}
            </p>
            <p className="mt-2 text-xs text-gray-400">
              {insight.graphNote}
            </p>
          </div>
        </div>
      </div>
      {/* BETA OVERVIEW */}
      <div id="beta">
        <Section title={beta.title} subtitle={beta.subtitle} />
        <div className="max-w-6xl mx-auto px-6 pb-16 grid gap-6 md:grid-cols-3">
          {beta.items.map((item) => (
            <Card key={item.title} title={item.title} body={item.body} />
          ))}
        </div>
      </div>

      {/* CTA FINALE */}
      <section className="border-t border-white/5 bg-gray-950/60">
        <div className="max-w-6xl mx-auto px-6 py-12 md:py-16 grid gap-8 md:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] items-center">
          <div>
            <h2 className="text-2xl md:text-3xl font-semibold text-gray-100">
              {cta.title}
            </h2>
            <p className="mt-3 text-sm text-gray-300 max-w-lg">
              {cta.body}
            </p>
            <p className="mt-2 text-xs text-gray-400">
              {cta.note}
            </p>
          </div>
          <div className="bg-gray-900/70 border border-white/10 rounded-2xl p-4 sm:p-5">
            <p className="text-xs uppercase tracking-wide text-gray-400 mb-1">
              {cta.label}
            </p>
            <CTAForm apiBase={API_BASE} compact />
          </div>
        </div>
      </section>

      {/* FAQ */}
      <div id="faq" className="border-t border-white/5 bg-gray-950">
        <Section title={faq.title} />
        <div className="max-w-4xl mx-auto px-6 pb-16 space-y-6 text-sm text-mist/85">
          {faq.items.map((item) => (
    <FAQ key={item.q} q={item.q} a={item.a} />
  ))}
        </div>
      </div>

      {/* FOOTER */}
     <footer className="border-t border-white/5 bg-gray-950">
  <div className="max-w-6xl mx-auto px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-400">
    <span>© {new Date().getFullYear()} MyndSelf.ai</span>
    <span>{footer.tagline}</span>
    <p className="text-xs text-slate-400">
      <Link to="/terms" className="underline">
        Termini d’uso
      </Link>
      <span className="mx-2">•</span>
      <Link to="/privacy" className="underline">
        Privacy Policy
      </Link>
    </p>
  </div>
</footer>

    </main>
  )
}

function Card({ title, body }: { title: string; body: string }) {
  return (
    <div className="bg-gray-900/70 border border-white/10 rounded-2xl p-5 text-sm text-mist/85">
      <h3 className="text-sm font-semibold text-gray-100 mb-2">{title}</h3>
      <p>{body}</p>
    </div>
  )
}

function Bubble({
  role,
  children,
}: {
  role: "user" | "assistant"
  children: React.ReactNode
}) {
  const isUser = role === "user"
  return (
    <div
      className={`max-w-[90%] px-3 py-2 rounded-2xl text-xs ${
        isUser
          ? "ml-auto bg-emerald-500/20 text-emerald-50"
          : "bg-white/5 text-gray-100"
      }`}
    >
      {children}
    </div>
  )
}

function FAQ({ q, a }: { q: string; a: string }) {
  return (
    <div>
      <p className="font-medium text-gray-100 mb-1">{q}</p>
      <p className="text-gray-300 text-sm">{a}</p>
    </div>
  )
}
