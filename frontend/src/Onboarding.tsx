// frontend/src/Onboarding.tsx
import React, { useState } from "react"

type OnboardingProps = {
  onFinish: () => void
}

const STEPS = [0, 1, 2] as const

export function Onboarding({ onFinish }: OnboardingProps) {
  const [step, setStep] = useState<(typeof STEPS)[number]>(0)

  const next = () => {
    if (step < STEPS.length - 1) {
      setStep((s) => (s + 1) as (typeof STEPS)[number])
    } else {
      onFinish()
    }
  }

  const back = () => {
    if (step > 0) {
      setStep((s) => (s - 1) as (typeof STEPS)[number])
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 flex items-center justify-center px-4">
      <div className="w-full max-w-xl bg-gray-900 rounded-3xl border border-white/10 p-6 sm:p-8 shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <img src="/logo.svg" alt="MyndSelf.ai" className="h-8" />
            <div>
              <p className="text-sm font-semibold text-emerald-200">
                MyndSelf.ai
              </p>
              <p className="text-xs text-gray-400">
                Beta privata · Onboarding
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1 text-xs text-gray-400">
            {STEPS.map((s) => (
              <span
                key={s}
                className={
                  "inline-flex w-2 h-2 rounded-full " +
                  (s === step ? "bg-emerald-400" : "bg-gray-700")
                }
              />
            ))}
          </div>
        </div>

        {/* Step content */}
        {step === 0 && <Step1 />}
        {step === 1 && <Step2 />}
        {step === 2 && <Step3 />}

        {/* Controls */}
        <div className="mt-6 flex items-center justify-between">
          <button
            type="button"
            onClick={back}
            disabled={step === 0}
            className="text-xs text-gray-400 hover:text-gray-200 disabled:opacity-40 disabled:hover:text-gray-400"
          >
            Indietro
          </button>
          <button
            type="button"
            onClick={next}
            className="inline-flex items-center justify-center rounded-xl bg-emerald-400 text-gray-950 text-sm font-medium px-4 py-2.5 hover:bg-emerald-300 transition-colors"
          >
            {step < STEPS.length - 1
              ? "Avanti"
              : "Inizia il tuo primo check-in"}
          </button>
        </div>
      </div>
    </div>
  )
}

function Step1() {
  return (
    <div className="space-y-3">
      <p className="text-xs font-medium text-emerald-300 uppercase tracking-wide">
        Benvenuto nella beta
      </p>
      <h1 className="text-2xl sm:text-3xl font-semibold">
        Uno spazio per vedere più chiaramente come stai.
      </h1>
      <p className="text-sm text-gray-300">
        MyndSelf.ai è un posto in cui puoi fermarti un attimo, dire come ti
        senti e lasciare che l&apos;AI ti aiuti a mettere ordine nelle
        emozioni, senza giudizio.
      </p>
      <p className="text-xs text-gray-500">
        In questa beta vedrai alcune funzioni già attive e altre ancora in
        costruzione. Il tuo modo di usarle ci aiuterà a capire cosa sviluppare
        dopo.
      </p>
    </div>
  )
}

function Step2() {
  return (
    <div className="space-y-3">
      <p className="text-xs font-medium text-emerald-300 uppercase tracking-wide">
        Cosa farai ogni giorno
      </p>
      <h2 className="text-xl sm:text-2xl font-semibold">
        Un check-in emotivo in meno di un minuto.
      </h2>
      <p className="text-sm text-gray-300">
        Ti faremo poche domande semplici. A volte basterà scegliere un&apos;
        emozione, a volte scrivere una frase. L&apos;importante non è essere
        perfetti, ma esserci.
      </p>
      <ul className="text-sm text-gray-300 space-y-1.5">
        <li>• scegli come ti senti</li>
        <li>• aggiungi, se vuoi, una frase o un dettaglio</li>
        <li>• ricevi una piccola restituzione dall&apos;AI</li>
      </ul>
      <p className="text-xs text-gray-500">
        Puoi usare MyndSelf sia nei momenti difficili che in quelli buoni:
        entrambi raccontano qualcosa di te.
      </p>
    </div>
  )
}

function Step3() {
  return (
    <div className="space-y-3">
      <p className="text-xs font-medium text-emerald-300 uppercase tracking-wide">
        Il Mentor AI
      </p>
      <h2 className="text-xl sm:text-2xl font-semibold">
        Il Mentor ti fa le domande giuste, non ti giudica.
      </h2>
      <p className="text-sm text-gray-300">
        Man mano che usi MyndSelf, il Mentor inizia a riconoscere i pattern
        nelle tue parole. Il suo obiettivo non è dirti cosa fare, ma aiutarti
        a vedere più chiaramente cosa senti.
      </p>
      <p className="text-xs text-gray-500">
        MyndSelf.ai non sostituisce un professionista. Può però diventare un
        alleato quotidiano per arrivare con più consapevolezza a ogni scelta
        che fai.
      </p>
      <div className="mt-3 rounded-2xl bg-gray-800 border border-white/10 p-3 text-xs text-gray-200">
        <p className="text-[11px] text-emerald-300 mb-1">
          Cosa succede dopo?
        </p>
        <p>
          Alla schermata successiva vedrai il tuo primo check-in. Non serve
          pensarci troppo: descrivi semplicemente come ti senti adesso, in una
          parola o due.
        </p>
      </div>
    </div>
  )
}
