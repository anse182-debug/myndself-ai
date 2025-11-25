// src/Landing.tsx
import { Section } from "./components/Section"
import { CTAForm } from "./components/CTAForm"

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8080"

export default function Landing() {
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
          Come funziona
        </a>
        <a href="#mentor" className="hover:text-gray-100">
          Mentor AI
        </a>
        <a href="#insight" className="hover:text-gray-100">
          Insight
        </a>
        <a href="#faq" className="hover:text-gray-100">
          FAQ
        </a>
      </nav>
      <a
        href="/app"
        className="hidden md:inline-flex text-sm bg-emerald-400 text-gray-950 rounded px-3 py-1.5 hover:bg-emerald-300 transition"
      >
        Apri nell&apos;app
      </a>
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
              Una micro-pausa emotiva, ogni giorno
            </p>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight text-gray-100">
              Chiarezza mentale in <span className="text-emerald-300">60 secondi</span>,
              con un Mentor AI gentile.
            </h1>
            <p className="text-sm sm:text-base text-gray-300 max-w-xl">
              MyndSelf.ai ti aiuta a registrare come stai, vedere i tuoi pattern
              emotivi e parlare con un&apos;AI allenata sulla cura di sé.
              Niente giudizi, solo spazio sicuro e chiarezza in pochi minuti.
            </p>
            <ul className="text-sm text-gray-300 space-y-1">
              <li>• Check-in emotivi veloci, anche quando hai pochissimo tempo</li>
              <li>• Un Mentor AI che ricorda come ti senti nel tempo</li>
              <li>• Insight e trend per riconoscere i tuoi pattern</li>
            </ul>

            <div
              id="early-access"
              className="mt-6 max-w-xl bg-gray-950/40 border border-white/10 rounded-2xl p-4 sm:p-5 backdrop-blur"
            >
              <p className="text-xs uppercase tracking-wide text-gray-400 mb-1">
                Pre-lancio • Accesso anticipato
              </p>
              <p className="text-sm text-gray-100 mb-3">
                Iscriviti per entrare tra i primi a provare MyndSelf.ai e per
                ricevere un invito alla beta privata.
              </p>
              <CTAForm apiBase={API_BASE} />
              <p className="mt-2 text-[11px] text-gray-400">
                Nessuno spam, solo aggiornamenti importanti sul lancio.
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
          title="Come funziona MyndSelf.ai"
          subtitle="Un rituale emotivo leggero, costruito intorno a tre momenti chiave."
        />
        <div className="max-w-6xl mx-auto px-6 pb-12 grid gap-6 md:grid-cols-3">
          <Card
            title="1. Check-in veloce"
            body="Ogni giorno, in meno di un minuto, registri come ti senti con poche parole e qualche tocco."
          />
          <Card
            title="2. Mentor AI"
            body="Un'AI gentile ti fa domande, ti restituisce prospettiva e sintetizza cosa sta succedendo dentro di te."
          />
          <Card
            title="3. Insight nel tempo"
            body="Settimana dopo settimana, vedi pattern, ricorrenze emotive e piccoli cambiamenti che da solo non noteresti."
          />
        </div>
      </div>

      {/* MENTOR AI */}
      <div id="mentor" className="border-t border-white/5 bg-gray-950/40">
        <Section
          title="Il tuo Mentor AI, su misura"
          subtitle="Non un chatbot generico, ma un alleato che si modella su di te e sui tuoi stati emotivi."
        />
        <div className="max-w-6xl mx-auto px-6 pb-14 grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] items-center">
          <div className="space-y-4 text-sm text-mist/85">
            <p>
              MyndSelf.ai impara gradualmente dal modo in cui descrivi le tue
              giornate, dalle emozioni che ricorrono e da come rispondi alle
              domande. Il suo obiettivo non è giudicarti, ma aiutarti a vedere
              più chiaramente.
            </p>
            <ul className="space-y-2">
              <li>• Stile di dialogo gentile, diretto ma non invadente</li>
              <li>• Domande brevi che ti aiutano a mettere ordine</li>
              <li>• Sintesi emotive settimanali che danno un quadro d&apos;insieme</li>
              <li>• Ricordo dei pattern, senza riproporti sempre le stesse cose</li>
            </ul>
            <p className="text-xs text-gray-400">
              MyndSelf.ai non sostituisce un professionista, ma può diventare uno
              spazio quotidiano per prenderti cura di te con continuità.
            </p>
          </div>
          <div className="bg-gray-900/70 border border-white/10 rounded-2xl p-4 space-y-3 text-sm">
            <p className="text-[11px] text-emerald-300/80 uppercase tracking-wide">
              Esempio di momento con il Mentor
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
          title="Insight che ti restituiscono la trama"
          subtitle="Non solo sfoghi, ma una visione più chiara di come ti muovi nel tempo."
        />
        <div className="max-w-6xl mx-auto px-6 pb-16 grid gap-6 md:grid-cols-2">
          <div className="bg-gray-900/70 border border-white/10 rounded-2xl p-5 space-y-3 text-sm text-mist/85">
            <h3 className="text-sm font-semibold text-gray-100">Trend settimanali</h3>
            <p>
              MyndSelf.ai crea piccole sintesi della tua settimana emotiva,
              evidenziando cosa è cambiato, cosa torna spesso e dove stai
              costruendo nuove abitudini interiori.
            </p>
            <ul className="text-xs text-mist/70 space-y-1.5">
              <li>• Momenti in cui ti senti più scarico</li>
              <li>• Temi che tornano spesso nelle tue parole</li>
              <li>• Piccoli progressi che rischieresti di non vedere</li>
            </ul>
          </div>
          <div className="bg-gray-900/70 border border-white/10 rounded-2xl p-5 text-sm text-mist/85">
            <h3 className="text-sm font-semibold text-gray-100">
              Un grafico che parla di te, non solo di numeri
            </h3>
            <p className="mt-2">
              Man mano che registri le tue riflessioni, MyndSelf.ai costruisce una
              mappa delle emozioni che attraversi. Non per giudicarti, ma per
              aiutarti a riconoscere quando è il momento di rallentare, di chiedere
              supporto o di celebrare.
            </p>
            <p className="mt-2 text-xs text-gray-400">
              La versione beta si concentrerà su pochi indicatori essenziali, per
              non trasformare la tua vita emotiva in una dashboard da KPI.
            </p>
          </div>
        </div>
      </div>

      {/* CTA FINALE */}
      <section className="border-t border-white/5 bg-gray-950/60">
        <div className="max-w-6xl mx-auto px-6 py-12 md:py-16 grid gap-8 md:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] items-center">
          <div>
            <h2 className="text-2xl md:text-3xl font-semibold text-gray-100">
              Vuoi essere tra i primi a costruire il tuo rituale con MyndSelf.ai?
            </h2>
            <p className="mt-3 text-sm text-gray-300 max-w-lg">
              Stiamo preparando una beta privata con un piccolo gruppo di persone
              che vogliono prendersi cura delle proprie emozioni in modo gentile ma
              strutturato. Se ti risuona, lascia la tua email.
            </p>
            <p className="mt-2 text-xs text-gray-400">
              Useremo la beta per co-creare il prodotto insieme e definire il Mentor
              AI sulle situazioni reali delle persone.
            </p>
          </div>
          <div className="bg-gray-900/70 border border-white/10 rounded-2xl p-4 sm:p-5">
            <p className="text-xs uppercase tracking-wide text-gray-400 mb-1">
              Early access · Limited seats
            </p>
            <CTAForm apiBase={API_BASE} compact />
          </div>
        </div>
      </section>

      {/* FAQ */}
      <div id="faq" className="border-t border-white/5 bg-gray-950">
        <Section title="Domande frequenti" />
        <div className="max-w-4xl mx-auto px-6 pb-16 space-y-6 text-sm text-mist/85">
          <FAQ
            q="MyndSelf.ai sostituisce un percorso con uno psicologo?"
            a="No. MyndSelf.ai può diventare un alleato quotidiano per fare chiarezza, ma non sostituisce un professionista. Può però aiutarti ad arrivare alla terapia con più consapevolezza di ciò che senti."
          />
          <FAQ
            q="Quanto tempo richiede ogni giorno?"
            a="L'obiettivo è restare sotto il minuto per il check-in quotidiano, con la possibilità di approfondire solo quando ne senti il bisogno."
          />
          <FAQ
            q="I miei dati sono al sicuro?"
            a="Le riflessioni sono salvate in modo sicuro e usate solo per generare insight per te. Non vendiamo i tuoi dati e non li usiamo per advertising."
          />
          <FAQ
            q="Quando partirà la beta?"
            a="Stiamo lavorando alla beta chiusa nei prossimi mesi. Le persone iscritte alla lista d'attesa riceveranno l'invito in anticipo rispetto al lancio pubblico."
          />
        </div>
      </div>

      {/* FOOTER */}
      <footer className="border-t border-white/5 bg-gray-950">
        <div className="max-w-6xl mx-auto px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-400">
          <span>© {new Date().getFullYear()} MyndSelf.ai</span>
          <span>Uno spazio sicuro per le tue emozioni.</span>
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
