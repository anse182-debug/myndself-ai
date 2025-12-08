// src/Onboarding.tsx
import { useState } from "react"

const ONBOARDING_KEY = "myndself_onboarding_v1_done"
const GOAL_KEY = "myndself_onboarding_goal_v1"
const MOTIVATION_KEY = "myndself_onboarding_motivation_v1"
const COMMITMENT_KEY = "myndself_onboarding_commitment_v1"
const DESIRED_CHANGE_KEY = "myndself_onboarding_desired_change_v1"

export function Onboarding({ onFinish }: { onFinish: () => void }) {
  const [step, setStep] = useState(1)
  const [motivation, setMotivation] = useState<string[]>([])
  const [commitment, setCommitment] = useState<string>("")
  const [desiredChange, setDesiredChange] = useState("")

  const motivations = [
    "Gestire meglio le mie emozioni",
    "Ridurre stress / ansia",
    "Capire i miei pattern emotivi",
    "Aumentare consapevolezza",
    "Fermarmi almeno una volta al giorno",
    "Parlarne senza giudizio",
    "Altro",
  ]

  function goToNextStep() {
    if (step === 2 && motivation.length === 0) return
    if (step === 4 && !desiredChange.trim()) return

    if (step < 4) {
      setStep(step + 1)
    } else {
      // salvataggio finale su localStorage (come fa già l'app)
      const finalGoal =
        desiredChange.trim() ||
        (motivation.length ? motivation.join(", ") : "Percorso emotivo")

      if (typeof window !== "undefined") {
        window.localStorage.setItem(ONBOARDING_KEY, "true")
        window.localStorage.setItem(GOAL_KEY, finalGoal)
        window.localStorage.setItem(
          MOTIVATION_KEY,
          JSON.stringify(motivation)
        )
        if (commitment) {
          window.localStorage.setItem(COMMITMENT_KEY, commitment)
        }
        window.localStorage.setItem(DESIRED_CHANGE_KEY, desiredChange.trim())
      }

      onFinish()
    }
  }

  return (
    <main className="min-h-screen bg-gray-950 text-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-lg bg-gray-900/70 border border-white/10 rounded-2xl p-6 space-y-6">
        {step === 1 && (
          <>
            <h2 className="text-xl font-semibold text-emerald-200">
              Benvenuto su Myndself.ai
            </h2>
            <p className="text-sm text-gray-300">
              Uno spazio per capire cosa provi e come cambi nel tempo.
            </p>
            <button
              onClick={() => setStep(2)}
              className="w-full bg-emerald-400 text-gray-900 rounded-lg py-2 font-semibold text-sm hover:bg-emerald-300"
            >
              Inizia il tuo percorso
            </button>
          </>
        )}

        {step === 2 && (
          <>
            <h2 className="text-xl font-semibold text-emerald-200">
              Perché sei qui?
            </h2>
            <p className="text-sm text-gray-300 mb-2">
              La tua risposta guiderà la tua esperienza.
            </p>

            <div className="space-y-2 text-sm">
              {motivations.map((m) => (
                <label
                  key={m}
                  className="flex items-center gap-2 text-sm text-gray-200"
                >
                  <input
                    type="checkbox"
                    checked={motivation.includes(m)}
                    onChange={() => {
                      if (motivation.includes(m)) {
                        setMotivation(motivation.filter((x) => x !== m))
                      } else {
                        setMotivation([...motivation, m])
                      }
                    }}
                    className="h-4 w-4 rounded border-white/30 bg-transparent"
                  />
                  <span>{m}</span>
                </label>
              ))}
            </div>

            <button
              onClick={goToNextStep}
              disabled={motivation.length === 0}
              className="w-full bg-emerald-400 text-gray-900 rounded-lg py-2 font-semibold text-sm hover:bg-emerald-300 disabled:opacity-40"
            >
              Continua
            </button>
          </>
        )}

        {step === 3 && (
          <>
            <h2 className="text-xl font-semibold text-emerald-200">
              Quanto vuoi prenderti cura di te?
            </h2>
            <p className="text-sm text-gray-300 mb-3">
              Non serve molto tempo. Solo costanza.
            </p>

            <div className="space-y-3">
              {["Ogni giorno", "3 volte a settimana", "Quando ne ho bisogno"].map(
                (c) => (
                  <button
                    key={c}
                    onClick={() => setCommitment(c)}
                    className={`w-full text-left px-3 py-2 rounded-lg border text-sm transition ${
                      commitment === c
                        ? "bg-emerald-400 text-gray-950 border-emerald-400"
                        : "bg-white/5 border-white/10 text-gray-200 hover:bg-white/10"
                    }`}
                  >
                    {c}
                  </button>
                )
              )}
            </div>

            <button
              onClick={goToNextStep}
              className="w-full mt-4 bg-emerald-400 text-gray-900 rounded-lg py-2 font-semibold text-sm hover:bg-emerald-300"
            >
              Continua
            </button>
          </>
        )}

        {step === 4 && (
          <>
            <h2 className="text-xl font-semibold text-emerald-200">
              Il tuo primo passo
            </h2>
            <p className="text-sm text-gray-300 mb-3">
              Cosa speri che cambi iniziando questo percorso?
            </p>

            <textarea
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-200"
              placeholder="Esempio: Voglio capire perché mi sento spesso sopraffatto."
              value={desiredChange}
              onChange={(e) => setDesiredChange(e.target.value)}
            />

            <button
              onClick={goToNextStep}
              disabled={!desiredChange.trim()}
              className="w-full mt-4 bg-emerald-400 text-gray-900 rounded-lg py-2 font-semibold text-sm hover:bg-emerald-300 disabled:opacity-40"
            >
              Crea il mio spazio
            </button>
          </>
        )}
      </div>
    </main>
  )
}

// così puoi importare sia default che nominato
export default Onboarding
