// src/Onboarding.tsx
import { useState } from "react";
import { supabase } from "./supabaseClient";
import { useNavigate } from "react-router-dom";

export default function Onboarding() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);

  const [motivation, setMotivation] = useState<string[]>([]);
  const [commitment, setCommitment] = useState<string>("");
  const [desiredChange, setDesiredChange] = useState("");

  const motivations = [
    "Gestire meglio le mie emozioni",
    "Ridurre stress / ansia",
    "Capire i miei pattern emotivi",
    "Aumentare consapevolezza",
    "Fermarmi almeno una volta al giorno",
    "Parlarne senza giudizio",
    "Altro"
  ];

  async function completeOnboarding() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from("user_profile").upsert({
      user_id: user.id,
      motivation,
      commitment_level: commitment,
      desired_change: desiredChange,
      onboarding_completed: true,
      updated_at: new Date().toISOString(),
    });

    navigate("/app");
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center px-6">
      {step === 1 && (
        <div className="max-w-md text-center">
          <h1 className="text-3xl font-semibold mb-3">Benvenuto su Myndself.ai</h1>
          <p className="text-slate-400 mb-8">
            Uno spazio per capire cosa provi e come cambi nel tempo.
          </p>
          <button
            onClick={() => setStep(2)}
            className="w-full bg-white text-slate-900 py-3 rounded-md font-medium"
          >
            Inizia il tuo percorso
          </button>
        </div>
      )}

      {step === 2 && (
        <div className="max-w-md text-left">
          <h2 className="text-2xl font-semibold mb-3">Perché sei qui?</h2>
          <p className="text-slate-400 mb-6">
            La tua risposta guiderà la tua esperienza.
          </p>

          <div className="space-y-3">
            {motivations.map((m) => (
              <label key={m} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  value={m}
                  checked={motivation.includes(m)}
                  onChange={(e) => {
                    if (motivation.includes(m)) {
                      setMotivation(motivation.filter((val) => val !== m));
                    } else {
                      setMotivation([...motivation, m]);
                    }
                  }}
                  className="h-4 w-4"
                />
                {m}
              </label>
            ))}
          </div>

          <button
            disabled={motivation.length === 0}
            onClick={() => setStep(3)}
            className="mt-8 w-full bg-white text-slate-900 py-3 rounded-md font-medium disabled:opacity-40"
          >
            Continua
          </button>
        </div>
      )}

      {step === 3 && (
        <div className="max-w-md text-left">
          <h2 className="text-2xl font-semibold mb-3">
            Quanto vuoi prenderti cura di te?
          </h2>
          <p className="text-slate-400 mb-6">
            Non serve molto. Solo costanza.
          </p>

          <div className="flex flex-col gap-3">
            {["Ogni giorno", "3 volte a settimana", "Quando ne ho bisogno"].map((c) => (
              <button
                key={c}
                onClick={() => {
                  setCommitment(c);
                  setStep(4);
                }}
                className="border border-slate-600 py-3 rounded-md"
              >
                {c}
              </button>
            ))}
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="max-w-md text-left">
          <h2 className="text-2xl font-semibold mb-3">Il tuo primo passo</h2>
          <p className="text-slate-400 mb-6">
            Cosa speri che cambi iniziando questo percorso?
          </p>

          <textarea
            placeholder="Esempio: Voglio capire perché mi sento sopraffatto"
            value={desiredChange}
            onChange={(e) => setDesiredChange(e.target.value)}
            className="w-full h-28 bg-slate-900 border border-slate-700 rounded-md p-3 text-sm"
          />

          <button
            disabled={!desiredChange}
            onClick={completeOnboarding}
            className="mt-6 w-full bg-white text-slate-900 py-3 rounded-md disabled:opacity-40"
          >
            Crea il mio spazio
          </button>
        </div>
      )}
    </div>
  );
}
