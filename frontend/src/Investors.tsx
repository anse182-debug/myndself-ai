import React, { useMemo, useState } from "react";

type Lang = "EN" | "IT";

const LINKS = {
  deckUrl: "https://www.canva.com/design/DAG7T_sh1bc/5PBUt0_yf6488YjsTrCyew/view?utm_content=DAG7T_sh1bc&utm_campaign=designshare&utm_medium=link2&utm_source=uniquelinks&utlId=ha8796792eb", // TODO: incolla link Canva (pubblico)
  faqUrl: "https://YOUR_FAQ_LINK", // TODO: link a PDF/Notion/Drive (Numeric Addendum / 1-pager)
};

export default function Investors() {
  const [lang, setLang] = useState<Lang>("EN");

  const t = useMemo(() => {
    const EN = {
      navTitle: "Investor Info",
      title: "The Emotional Operating System",
      subtitle: "Building the missing infrastructure of the digital age.",
      meta: "Pre-seed · Based in Switzerland · CH / IT focus",
      visionTitle: "Why now",
      vision:
        "We have operating systems for work, money, health and identity. What we still lack is a system to make emotions legible over time.\n\nMyndSelf.ai is building the first Emotional Operating System: a lightweight daily ritual that turns emotional states into patterns, and patterns into better decisions.",
      numbersTitle: "Early signals (beta)",
      num1Top: "~60–70%",
      num1Bottom: "Weekly Emotional Engagement Rate",
      num1Note: "early beta",
      num2Top: "~20%",
      num2Bottom: "EU adults affected by anxiety / burnout",
      num3Top: "$2B",
      num3Bottom: "EU mental health apps revenue (2024)",
      valueTitle: "How we create value",
      value1: "B2C → builds habit & emotional language",
      value2: "B2B → monetizes legibility (insights, prevention)",
      value3: "Healthcare → long-term integration (CH / IT)",
      valueNote: "B2C is not the business. It is the foundation.",
      linksTitle: "Materials",
      deckBtn: "View Investor Deck",
      faqBtn: "Investor FAQ (1 page)",
      fundsTitle: "Use of funds (350k CHF)",
      funds:
        "This round funds: core product & AI refinement, beta scaling without losing engagement, validation of paid emotional rituals.\n\nNo growth hacks. No mass marketing.",
      ctaTitle: "Get in touch",
      cta:
        "If you’d like to learn more, reach out via email. We’ll share the right level of detail based on your interest.",
      emailLabel: "Email",
      backHome: "Back to home",
      disclaimer:
        "Note: MyndSelf.ai is not a medical or therapeutic service. It is designed for emotional awareness and reflective support.",
    };

    const IT = {
      navTitle: "Info Investitori",
      title: "Il sistema operativo delle emozioni",
      subtitle: "Costruiamo l’infrastruttura mancante dell’era digitale.",
      meta: "Pre-seed · Basati in Svizzera · Focus CH / IT",
      visionTitle: "Perché ora",
      vision:
        "Abbiamo sistemi operativi per lavoro, denaro, salute e identità. Quello che manca ancora è un sistema per rendere le emozioni leggibili nel tempo.\n\nMyndSelf.ai costruisce il primo Emotional Operating System: un rituale quotidiano leggero che trasforma stati emotivi in pattern e pattern in decisioni migliori.",
      numbersTitle: "Segnali iniziali (beta)",
      num1Top: "~60–70%",
      num1Bottom: "Weekly Emotional Engagement Rate",
      num1Note: "beta iniziale",
      num2Top: "~20%",
      num2Bottom: "Adulti EU con ansia / burnout",
      num3Top: "$2B",
      num3Bottom: "Ricavi app mental health EU (2024)",
      valueTitle: "Come creiamo valore",
      value1: "B2C → crea abitudine e linguaggio emotivo",
      value2: "B2B → monetizza la leggibilità (insight, prevenzione)",
      value3: "Sanità → integrazione di lungo periodo (CH / IT)",
      valueNote: "Il B2C non è il business finale. È la base.",
      linksTitle: "Materiali",
      deckBtn: "Apri Investor Deck",
      faqBtn: "Investor FAQ (1 pagina)",
      fundsTitle: "Use of funds (350k CHF)",
      funds:
        "Questo round finanzia: raffinamento del core prodotto e dell’AI, scaling della beta senza perdere engagement, validazione di rituali emotivi a pagamento.\n\nNiente growth hacks. Niente marketing massivo.",
      ctaTitle: "Contatti",
      cta:
        "Se vuoi approfondire, scrivici via email. Condividiamo il livello giusto di dettaglio in base all’interesse.",
      emailLabel: "Email",
      backHome: "Torna alla home",
      disclaimer:
        "Nota: MyndSelf.ai non è un servizio medico o terapeutico. È progettato per consapevolezza emotiva e supporto riflessivo.",
    };

    return lang === "EN" ? EN : IT;
  }, [lang]);

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Top bar */}
      <header className="sticky top-0 z-10 border-b border-white/10 bg-black/70 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
          <a href="/" className="flex items-center gap-3">
            <img src="/logo.svg" alt="MyndSelf" className="h-7 w-7" />
            <span className="text-sm font-semibold tracking-wide text-white/90">
              MyndSelf.ai
            </span>
          </a>

          <div className="flex items-center gap-3">
            <span className="hidden text-xs text-white/60 sm:inline">{t.navTitle}</span>
            <div className="flex rounded-full border border-white/15 p-1">
              <button
                className={`rounded-full px-3 py-1 text-xs transition ${
                  lang === "EN" ? "bg-white text-black" : "text-white/70 hover:text-white"
                }`}
                onClick={() => setLang("EN")}
              >
                EN
              </button>
              <button
                className={`rounded-full px-3 py-1 text-xs transition ${
                  lang === "IT" ? "bg-white text-black" : "text-white/70 hover:text-white"
                }`}
                onClick={() => setLang("IT")}
              >
                IT
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero */}
      <main className="mx-auto max-w-6xl px-5 py-14">
        <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-white/5 to-transparent p-10">
          <div className="max-w-3xl">
            <h1 className="text-3xl font-semibold leading-tight sm:text-4xl">
              {t.title}
            </h1>
            <p className="mt-4 text-lg text-white/75">{t.subtitle}</p>
            <p className="mt-4 text-sm text-white/55">{t.meta}</p>

            <div className="mt-8 flex flex-wrap gap-3">
              <a
                href={LINKS.deckUrl}
                target="_blank"
                rel="noreferrer"
                className="rounded-full bg-white px-5 py-2 text-sm font-semibold text-black hover:opacity-90"
              >
                {t.deckBtn}
              </a>
              <a
                href={LINKS.faqUrl}
                target="_blank"
                rel="noreferrer"
                className="rounded-full border border-white/20 px-5 py-2 text-sm font-semibold text-white hover:bg-white/5"
              >
                {t.faqBtn}
              </a>
            </div>
          </div>

          {/* subtle decor */}
          <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-28 -left-28 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
        </section>

        {/* Vision */}
        <section className="mt-12 grid gap-6 md:grid-cols-2">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-8">
            <h2 className="text-base font-semibold text-white/90">{t.visionTitle}</h2>
            <p className="mt-4 whitespace-pre-line text-sm leading-relaxed text-white/70">
              {t.vision}
            </p>
          </div>

          {/* Numbers */}
          <div className="rounded-3xl border border-white/10 bg-white/5 p-8">
            <h2 className="text-base font-semibold text-white/90">{t.numbersTitle}</h2>

            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              <StatCard top={t.num1Top} bottom={t.num1Bottom} note={t.num1Note} />
              <StatCard top={t.num2Top} bottom={t.num2Bottom} />
              <StatCard top={t.num3Top} bottom={t.num3Bottom} />
            </div>

            <p className="mt-5 text-xs text-white/55">
              {lang === "EN"
                ? "Note: numbers are directional and will be updated as the beta scales."
                : "Nota: i numeri sono indicativi e verranno aggiornati man mano che la beta scala."}
            </p>
          </div>
        </section>

        {/* Value */}
        <section className="mt-12 rounded-3xl border border-white/10 bg-white/5 p-8">
          <h2 className="text-base font-semibold text-white/90">{t.valueTitle}</h2>
          <ul className="mt-5 space-y-3 text-sm text-white/75">
            <li>• {t.value1}</li>
            <li>• {t.value2}</li>
            <li>• {t.value3}</li>
          </ul>
          <p className="mt-5 text-sm font-semibold text-white/85">{t.valueNote}</p>
        </section>

        {/* Use of funds + CTA */}
        <section className="mt-12 grid gap-6 md:grid-cols-2">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-8">
            <h2 className="text-base font-semibold text-white/90">{t.fundsTitle}</h2>
            <p className="mt-4 whitespace-pre-line text-sm leading-relaxed text-white/70">
              {t.funds}
            </p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-8">
            <h2 className="text-base font-semibold text-white/90">{t.ctaTitle}</h2>
            <p className="mt-4 text-sm leading-relaxed text-white/70">{t.cta}</p>

            <div className="mt-6">
              <div className="text-xs text-white/55">{t.emailLabel}</div>
              <a
                href="mailto:investors@myndself.ai"
                className="mt-2 inline-flex items-center gap-2 rounded-full bg-white px-5 py-2 text-sm font-semibold text-black hover:opacity-90"
              >
                investors@myndself.ai
              </a>
            </div>

            <p className="mt-6 text-xs text-white/45">{t.disclaimer}</p>
          </div>
        </section>

        {/* Footer */}
        <footer className="mt-14 flex flex-col items-start justify-between gap-4 border-t border-white/10 pt-8 sm:flex-row sm:items-center">
          <a href="/" className="text-sm text-white/70 hover:text-white">
            ← {t.backHome}
          </a>
          <div className="text-xs text-white/45">
            © {new Date().getFullYear()} MyndSelf.ai
          </div>
        </footer>
      </main>
    </div>
  );
}

function StatCard(props: { top: string; bottom: string; note?: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/30 p-5">
      <div className="text-2xl font-semibold">{props.top}</div>
      <div className="mt-2 text-xs text-white/65">{props.bottom}</div>
      {props.note ? <div className="mt-2 text-[11px] text-white/45">{props.note}</div> : null}
    </div>
  );
}
