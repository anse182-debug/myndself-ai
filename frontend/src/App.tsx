import { useEffect, useState } from "react"
import { API_BASE } from "./config"
import { useSession } from "./hooks/useSession"
import { showToast } from "./utils/toast"

export default function App() {
  const { session, loading: sessionLoading } = useSession()

  // ===========================
  // EMOTIONAL BANNER (summary)
  // ===========================
  const [emotionalNote, setEmotionalNote] = useState<string | null>(null)
  const [emotionalFull, setEmotionalFull] = useState<string | null>(null)
  const [emotionalExpanded, setEmotionalExpanded] = useState(false)
  const [emotionalTags, setEmotionalTags] = useState<string[]>([])

  // ===========================
  // INSIGHTS
  // ===========================
  const [dailySeries, setDailySeries] = useState<any[]>([])
  const [tagStats, setTagStats] = useState<any[]>([])
  const [summaryHistory, setSummaryHistory] = useState<any[]>([])

  // ===========================
  // CHAT
  // ===========================
  const [chatMessages, setChatMessages] = useState<any[]>([])
  const [isChatLoading, setIsChatLoading] = useState(false)
  const [chatInput, setChatInput] = useState("")

  // ===========================
  // GUIDED REFLECTION
  // ===========================
  const [guidedMessages, setGuidedMessages] = useState<any[]>([])
  const [guidedStep, setGuidedStep] = useState(1)
  const [guidedActive, setGuidedActive] = useState(false)
  const [guidedInput, setGuidedInput] = useState("")
  const [guidedFinal, setGuidedFinal] = useState(false)
  const [guidedLoading, setGuidedLoading] = useState(false)

  // ===========================
  // FETCH INITIAL DATA
  // ===========================
  useEffect(() => {
    if (sessionLoading) return
    if (!session?.user?.id) return

    const uid = session.user.id
    fetchDaily(uid)
    fetchTags(uid)
    fetchEmotionalProfile(uid)
    fetchSummaryHistory(uid)
    fetchChatHistory(uid)
  }, [sessionLoading, session])

  // =========================================
  // FETCH: DAILY EMOTIONAL TREND
  // =========================================
  async function fetchDaily(uid: string) {
    try {
      const res = await fetch(`${API_BASE}/api/analytics/daily?user_id=${uid}`)
      const json = await res.json()
      if (json.ok) setDailySeries(json.items || [])
    } catch (e) {
      console.error("daily fetch error:", e)
    }
  }

  // =========================================
  // FETCH: TAG STATS
  // =========================================
  async function fetchTags(uid: string) {
    try {
      const res = await fetch(`${API_BASE}/api/analytics/tags?user_id=${uid}`)
      const json = await res.json()
      if (json.ok) setTagStats(json.items || [])
    } catch (e) {
      console.error("tag stats error:", e)
    }
  }

  // =========================================
  // FETCH: EMOTIONAL BANNER
  // =========================================
  async function fetchEmotionalProfile(uid: string) {
    try {
      const res = await fetch(`${API_BASE}/api/emotional-profile?user_id=${uid}`)
      const json = await res.json()
      if (json.ok) {
        setEmotionalNote(json.note || null)
        setEmotionalFull(json.full || null)
        setEmotionalTags(json.tags || [])
      }
    } catch (e) {
      console.error("emotional-profile error:", e)
    }
  }

  // =========================================
  // FETCH: SUMMARY HISTORY
  // =========================================
  async function fetchSummaryHistory(uid: string) {
    try {
      const res = await fetch(`${API_BASE}/api/summary/history?user_id=${uid}`)
      const json = await res.json()
      if (json.ok) {
        setSummaryHistory(json.items || [])
      }
    } catch (e) {
      console.error("summary history error:", e)
    }
  }

  // =========================================
  // FETCH: CHAT HISTORY
  // =========================================
  async function fetchChatHistory(uid: string) {
    try {
      const res = await fetch(`${API_BASE}/api/chat/history?user_id=${uid}`)
      const json = await res.json()
      if (json.ok) {
        setChatMessages(json.items || [])
      }
    } catch (e) {
      console.error("chat history error:", e)
    }
  }

  // =========================================
  // CHAT: SEND MESSAGE
  // =========================================
  const handleChatSend = async () => {
    const uid = session?.user?.id
    if (!uid)
      return showToast("Accedi prima per usare la chat riflessiva", "error")
    if (!chatInput.trim()) return

    const newMessages = [...chatMessages, { role: "user", content: chatInput }]
    setChatMessages(newMessages)
    setChatInput("")
    setIsChatLoading(true)
    try {
      const res = await fetch(`${API_BASE}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: uid, messages: newMessages }),
      })
      const data = await res.json()
      if (data.reply) {
        setChatMessages([
          ...newMessages,
          { role: "assistant", content: data.reply },
        ])
      }
    } catch (e) {
      console.error("chat error:", e)
      showToast("Errore nella chat riflessiva", "error")
    } finally {
      setIsChatLoading(false)
    }
  }

  // =========================================
  // GUIDED REFLECTION: START / RESET
  // =========================================
  function startGuidedSession() {
    const uid = session?.user?.id
    if (!uid) {
      showToast("Accedi prima per iniziare la riflessione guidata", "error")
      return
    }

    setGuidedActive(true)
    setGuidedFinal(false)
    setGuidedStep(1)
    setGuidedMessages([
      {
        role: "assistant",
        content:
          "Iniziamo con un respiro profondo. Quando ti va, raccontami in una frase com’è stata la tua giornata.",
      },
    ])
  }

  function resetGuidedReflection() {
    setGuidedActive(false)
    setGuidedFinal(false)
    setGuidedStep(1)
    setGuidedMessages([])
    setGuidedInput("")
  }

  // =========================================
  // GUIDED REFLECTION: SEND TURN
  // =========================================
  async function sendGuidedTurn() {
    const uid = session?.user?.id
    if (!uid)
      return showToast("Accedi prima per continuare la riflessione guidata", "error")

    if (!guidedActive) return startGuidedSession()
    if (!guidedInput.trim() && guidedStep > 0 && !guidedFinal) {
      return showToast("Scrivi una breve risposta per continuare 💭", "info")
    }

    let msgs = guidedMessages
    if (guidedInput.trim()) {
      msgs = [...guidedMessages, { role: "user", content: guidedInput.trim() }]
      setGuidedMessages(msgs)
      setGuidedInput("")
    }

    setGuidedLoading(true)
    try {
      const res = await fetch(`${API_BASE}/api/guided-reflection`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: uid, messages: msgs, step: guidedStep || 1 }),
      })
      const data = await res.json()
      const reply =
        data?.reply ||
        "Grazie per aver condiviso. Restiamo un momento con quello che stai sentendo."
      const isFinal = Boolean(data?.isFinal)

      setGuidedMessages((prev) => [
        ...prev,
        { role: "assistant", content: reply },
      ])
      setGuidedFinal(isFinal)
      setGuidedStep((prev) => (isFinal ? 4 : Math.min(4, (prev || 1) + 1)))

      if (isFinal) {
        showToast("Riflessione guidata salvata tra le sintesi ✅", "success")
        try {
          const sumRes = await fetch(
            `${API_BASE}/api/summary/history?user_id=${uid}`
          )
          const sumJson = await sumRes.json()
          if (sumJson?.ok) setSummaryHistory(sumJson.items || [])
        } catch (e) {
          console.error("refresh insights error:", e)
        }
      }
    } catch (e) {
      console.error("guided error:", e)
      showToast("Errore nella riflessione guidata", "error")
    } finally {
      setGuidedLoading(false)
    }
  }

  // =============================================================
  // UI: EMOTIONAL BANNER COMPONENT
  // =============================================================
  function EmotionalBanner() {
    if (!emotionalNote && !emotionalFull) return null

    return (
      <div className="bg-[#1d2a2f] p-4 rounded-xl shadow mb-6 border border-[#243236]">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-lg font-semibold text-white mb-1">
              La tua nota emotiva
            </h3>

            {!emotionalExpanded ? (
              <p className="text-gray-300 text-sm">{emotionalNote}</p>
            ) : (
              <p className="text-gray-300 text-sm whitespace-pre-line">
                {emotionalFull}
              </p>
            )}

            {emotionalTags?.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {emotionalTags.map((t) => (
                  <span
                    key={t}
                    className="px-2 py-1 text-xs rounded-full bg-[#2f3d42] text-gray-300"
                  >
                    {t}
                  </span>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={() => setEmotionalExpanded((x) => !x)}
            className="text-xs text-gray-400 hover:text-gray-200 underline"
          >
            {emotionalExpanded ? "Mostra meno" : "Mostra di più"}
          </button>
        </div>
      </div>
    )
  }

  // =============================================================
  // RENDER
  // =============================================================
  return (
    <div className="min-h-screen bg-[#0e1416] text-gray-50">
      <header className="border-b border-[#1f2a2e]">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-emerald-400 font-semibold">MyndSelf.ai</span>
            <span className="text-xs text-gray-400">
              AI for Emotional Intelligence
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        <EmotionalBanner />

        {sessionLoading ? (
          <div className="text-center text-gray-300 mt-10">
            Caricamento in corso…
          </div>
        ) : !session?.user ? (
          <section className="mt-10 text-center text-gray-200">
            <h1 className="text-2xl font-semibold mb-3">
              Benvenuto su MyndSelf.ai
            </h1>
            <p className="text-sm text-gray-400 max-w-xl mx-auto">
              Accedi con il link magico (come già configurato) per iniziare a tracciare
              il tuo stato emotivo, riflettere con l’AI e vedere l’evoluzione nel tempo.
            </p>
            <p className="mt-4 text-xs text-gray-500">
              Una volta autenticato, qui vedrai riflessioni guidate, chat e insight.
            </p>
          </section>
        ) : (
          <div className="grid lg:grid-cols-2 gap-6 mt-4">
            {/* Colonna sinistra: riflessione guidata + chat */}
            <div className="flex flex-col gap-6">
              {/* GUIDED REFLECTION CARD */}
              <section className="bg-[#11191c] rounded-xl border border-[#1f2a2e] p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h2 className="text-base font-semibold text-white">
                      Riflessione guidata
                    </h2>
                    <p className="text-xs text-gray-400">
                      3–4 passi brevi per mettere a fuoco come stai.
                    </p>
                  </div>
                  {guidedActive && !guidedFinal && (
                    <span className="text-[11px] px-2 py-1 rounded-full bg-[#243236] text-gray-200">
                      Passo {guidedStep} di 4
                    </span>
                  )}
                  {guidedFinal && (
                    <span className="text-[11px] px-2 py-1 rounded-full bg-emerald-600/20 text-emerald-300 border border-emerald-600/40">
                      Sessione completata
                    </span>
                  )}
                </div>

                <div className="h-40 overflow-y-auto mb-3 space-y-2 text-sm">
                  {guidedMessages.map((m, idx) => (
                    <div
                      key={idx}
                      className={
                        m.role === "assistant"
                          ? "text-emerald-200"
                          : "text-gray-200"
                      }
                    >
                      {m.role === "assistant" && (
                        <span className="text-[11px] uppercase tracking-wide text-emerald-400 mr-1">
                          Mentor
                        </span>
                      )}
                      {m.role === "user" && (
                        <span className="text-[11px] uppercase tracking-wide text-gray-500 mr-1">
                          Tu
                        </span>
                      )}
                      <span>{m.content}</span>
                    </div>
                  ))}
                  {guidedMessages.length === 0 && (
                    <p className="text-xs text-gray-500">
                      Premi “Inizia” per partire con una breve riflessione guidata.
                    </p>
                  )}
                </div>

                <textarea
                  className="w-full text-sm rounded-md bg-[#182125] border border-[#243236] px-3 py-2 text-gray-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  rows={3}
                  placeholder={
                    guidedActive
                      ? "Scrivi qui cosa stai vivendo in questo momento…"
                      : "Quando sei pronto, premi Inizia per partire."
                  }
                  value={guidedInput}
                  onChange={(e) => setGuidedInput(e.target.value)}
                  disabled={!guidedActive || guidedFinal || guidedLoading}
                />

                <div className="mt-3 flex items-center justify-between gap-3">
                  <button
                    onClick={
                      guidedActive ? sendGuidedTurn : startGuidedSession
                    }
                    disabled={guidedLoading}
                    className="px-3 py-2 text-xs rounded-md bg-emerald-600 text-white hover:bg-emerald-500 disabled:opacity-60"
                  >
                    {guidedActive ? "Avanti" : "Inizia"}
                  </button>

                  {guidedActive && (
                    <button
                      type="button"
                      onClick={resetGuidedReflection}
                      className="text-[11px] text-gray-400 hover:text-gray-200 underline"
                    >
                      Termina sessione
                    </button>
                  )}

                  {guidedLoading && (
                    <span className="text-[11px] text-gray-400">
                      Sto riflettendo insieme a te…
                    </span>
                  )}
                </div>
              </section>

              {/* CHAT CARD */}
              <section className="bg-[#11191c] rounded-xl border border-[#1f2a2e] p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h2 className="text-base font-semibold text-white">
                      Chat riflessiva
                    </h2>
                    <p className="text-xs text-gray-400">
                      Parla in modo libero, l’AI ti risponde con uno stile calmo ed
                      empatico.
                    </p>
                  </div>
                </div>

                <div className="h-40 overflow-y-auto mb-3 space-y-2 text-sm">
                  {chatMessages.map((m, idx) => (
                    <div
                      key={idx}
                      className={
                        m.role === "assistant"
                          ? "text-emerald-200"
                          : "text-gray-200"
                      }
                    >
                      {m.role === "assistant" && (
                        <span className="text-[11px] uppercase tracking-wide text-emerald-400 mr-1">
                          Mentor
                        </span>
                      )}
                      {m.role === "user" && (
                        <span className="text-[11px] uppercase tracking-wide text-gray-500 mr-1">
                          Tu
                        </span>
                      )}
                      <span>{m.content}</span>
                    </div>
                  ))}
                  {chatMessages.length === 0 && (
                    <p className="text-xs text-gray-500">
                      Scrivi un pensiero o una domanda per iniziare la conversazione.
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <input
                    className="flex-1 text-sm rounded-md bg-[#182125] border border-[#243236] px-3 py-2 text-gray-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    placeholder="Come ti senti in questo momento?"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                  />
                  <button
                    onClick={handleChatSend}
                    disabled={isChatLoading}
                    className="px-3 py-2 text-xs rounded-md bg-emerald-600 text-white hover:bg-emerald-500 disabled:opacity-60"
                  >
                    Invia
                  </button>
                </div>
                {isChatLoading && (
                  <p className="mt-1 text-[11px] text-gray-400">
                    Sto pensando alla risposta…
                  </p>
                )}
              </section>
            </div>

            {/* Colonna destra: INSIGHTS */}
            <div className="flex flex-col gap-6">
              {/* EVOLUZIONE EMOTIVA */}
              <section className="bg-[#11191c] rounded-xl border border-[#1f2a2e] p-4">
                <h2 className="text-base font-semibold text-white mb-2">
                  Evoluzione emotiva
                </h2>
                <p className="text-xs text-gray-400 mb-3">
                  Una panoramica dei tuoi ultimi registri di umore.
                </p>
                {dailySeries.length === 0 ? (
                  <p className="text-xs text-gray-500">
                    Ancora nessun dato. Aggiungi qualche riflessione e umore per
                    iniziare a vedere l’andamento.
                  </p>
                ) : (
                  <ul className="text-xs text-gray-300 space-y-1 max-h-40 overflow-y-auto">
                    {dailySeries.map((d, idx) => (
                      <li key={idx}>
                        <span className="text-gray-400">
                          {d.day || d.date || d.at}:
                        </span>{" "}
                        <span>mood medio {d.avg_mood ?? d.mood ?? "-"}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              {/* EMOZIONI RICORRENTI */}
              <section className="bg-[#11191c] rounded-xl border border-[#1f2a2e] p-4">
                <h2 className="text-base font-semibold text-white mb-2">
                  Emozioni ricorrenti
                </h2>
                <p className="text-xs text-gray-400 mb-3">
                  Le parole emotive che compaiono più spesso nelle tue note.
                </p>
                {tagStats.length === 0 ? (
                  <p className="text-xs text-gray-500">
                    Non ci sono ancora abbastanza dati per mostrare i pattern. Continua
                    a scrivere cosa provi.
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                    {tagStats.map((t: any, idx) => (
                      <span
                        key={idx}
                        className="px-3 py-1 rounded-full bg-[#182125] border border-[#243236] text-xs text-gray-200"
                      >
                        {t.tag || t.label} ·{" "}
                        <span className="text-emerald-300">
                          {t.count ?? t.total ?? 1}x
                        </span>
                      </span>
                    ))}
                  </div>
                )}
              </section>

              {/* SINTESI SALVATE */}
              <section className="bg-[#11191c] rounded-xl border border-[#1f2a2e] p-4">
                <h2 className="text-base font-semibold text-white mb-2">
                  Sintesi salvate
                </h2>
                <p className="text-xs text-gray-400 mb-3">
                  I riassunti emotivi che hai generato con l’AI nel tempo.
                </p>
                {summaryHistory.length === 0 ? (
                  <p className="text-xs text-gray-500">
                    Nessuna sintesi salvata al momento. Usa la riflessione guidata o
                    le funzioni di sintesi per crearne una.
                  </p>
                ) : (
                  <ul className="space-y-3 max-h-40 overflow-y-auto text-xs">
                    {summaryHistory.map((s: any, idx) => (
                      <li
                        key={idx}
                        className="p-2 rounded-md bg-[#182125] border border-[#243236]"
                      >
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-[11px] text-gray-400">
                            {s.created_at
                              ? new Date(s.created_at).toLocaleString("it-IT")
                              : "Sintesi"}
                          </span>
                          {Array.isArray(s.tags) && s.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {s.tags.map((t: string, i: number) => (
                                <span
                                  key={`${t}-${i}`}
                                  className="px-2 py-0.5 rounded-full bg-[#243236] text-[10px] text-gray-200"
                                >
                                  {t}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        <p className="text-gray-200 whitespace-pre-line">
                          {s.summary}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
