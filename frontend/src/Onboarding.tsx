import { useState } from "react"

const ONBOARDING_KEY = "myndself_onboarding_v1_done"
const GOAL_KEY = "myndself_onboarding_goal_v1"

export function Onboarding({ onFinish }: { onFinish: () => void }) {
  const [goal, setGoal] = useState("")
  const [customGoal, setCustomGoal] = useState("")
  const [step, setStep] = useState(1)

  const options = [
    "Perché mi sento spesso stanco o sovraccarico",
    "Come gestire meglio le mie emozioni",
    "Cosa mi fa stare davvero bene",
    "Perché faccio fatica a prendere decisioni",
  ]

  function handleNext() {
    if (step === 1 && !goal && !customGoal) return
    if (step === 2) {
      const finalGoal = customGoal ? `Altro: ${customGoal}` : goal
      window.localStorage.setItem(GOAL_KEY, finalGoal)
      window.localStorage.setItem(ONBOARDING_KEY, "true")
      onFinish()
    } else {
      setStep(2)
    }
  }

  return (
    <main className="min-h-screen bg-gray-950 text-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-lg bg-gray-900/70 border border-white/10 rounded-2xl p-6 space-y-6">
        {step === 1 && (
          <>
            <h2 className="text-xl font-semibold text-emerald-200">
              Prima di iniziare
            </h2>
            <p className="text-sm text-gray-300">
              Per accompagnarti meglio, vorrei capire cosa ti porta qui.
            </p>

            <div className="space-y-2 text-sm">
              {options.map((opt) => (
                <button
                  key={opt}
                  onClick={() => {
                    setGoal(opt)
                    setCustomGoal("")
                  }}
                  className={`w-full text-left px-3 py-2 rounded-lg border transition ${
                    goal === opt
                      ? "bg-emerald-400 text-gray-950 border-emerald-400"
                      : "bg-white/5 border-white/10 text-gray-200 hover:bg-white/10"
                  }`}
                >
                  {opt}
                </button>
              ))}

              <textarea
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-200"
                placeholder="Altro…"
                value={customGoal}
                onChange={(e) => {
                  setGoal("")
                  setCustomGoal(e.target.value)
                }}
              />
            </div>

            <button
              onClick={handleNext}
              className="w-full bg-emerald-400 text-gray-900 rounded-lg py-2 font-semibold text-sm hover:bg-emerald-300"
            >
              Avanti
            </button>
          </>
        )}

        {step === 2 && (
          <>
            <h2 className="text-xl font-semibold text-emerald-200">
              Ottimo 🌿
            </h2>
            <p className="text-sm text-gray-300">
              Ti accompagnerò tenendo a mente questa intenzione.
            </p>
            <button
              onClick={handleNext}
              className="w-full bg-emerald-400 text-gray-900 rounded-lg py-2 font-semibold text-sm hover:bg-emerald-300"
            >
              Inizia
            </button>
          </>
        )}
      </div>
    </main>
  )
}
