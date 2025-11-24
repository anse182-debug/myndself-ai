import { useEffect, useState } from "react"
import Header from "./components/Header"
import { API_BASE } from "./config"
import { useSession } from "./hooks/useSession"
import { showToast } from "./utils/toast"

export default function App() {
  const { session, isLoading } = useSession()

  // === STATE ===
  const [chatMessages, setChatMessages] = useState<any[]>([])
  const [chatInput, setChatInput] = useState("")
  const [isChatLoading, setIsChatLoading] = useState(false)

  const [guidedMessages, setGuidedMessages] = useState<any[]>([])
  const [guidedInput, setGuidedInput] = useState("")
  const [guidedActive, setGuidedActive] = useState(false)
  const [guidedStep, setGuidedStep] = useState(1)
  const [guidedFinal, setGuidedFinal] = useState(false)
  const [guidedLoading, setGuidedLoading] = useState(false)

  const [insightDaily, setInsightDaily] = useState<any[]>([])
  const [insightTags, setInsightTags] = useState<string[]>([])
  const [summaryHistory, setSummaryHistory] = useState<any[]>([])
  const [emotionalProfile, setEmotionalProfile] = useState<any>(null)

  // === LOADING SCREEN ===
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-200">
        Caricamento...
      </div>
    )
  }

  // === FETCH SECURE DATA WHEN LOGGED ===
  useEffect(() => {
    if (!session?.user?.id) return

    const uid = session.user.id

    // analytics daily
    fetch(`${API_BASE}/api/analytics/daily?user_id=${uid}`)
      .then((r) => r.json())
      .then((j) => j.items && setInsightDaily(j.items))

    // analytics tags
    fetch(`${API_BASE}/api/analytics/tags?user_id=${uid}`)
      .then((r) => r.json())
      .then((j) => j.items && setInsightTags(j.items))

    // history
    fetch(`${API_BASE}/api/summary/history?user_id=${uid}`)
      .then((r) => r.json())
      .then((j) => j.ok && setSummaryHistory(j.items))

    // emotional profile
    fetch(`${API_BASE}/api/emotional-profile?user_id=${uid}`)
      .then((r) => r.json())
      .then((j) => j.profile && setEmotionalProfile(j.profile))
  }, [session])

  // === CHAT SEND ===
  const handleChatSend = async () => {
    const uid = session?.user?.id
    if (!uid) return showToast("Accedi prima per usare la chat riflessiva", "error")
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
        setChatMessages([...newMessages, { role: "assistant", content: data.reply }])
      }
    } catch (e) {
      console.error("chat error:", e)
      showToast("Errore nella chat riflessiva", "error")
    } finally {
      setIsChatLoading(false)
    }
  }

  // === GUIDED REFLECTION SEND ===
  const sendGuidedTurn = async () => {
    const uid = session?.user?.id
    if (!uid) return showToast("Accedi prima per continuare la riflessione guidata", "error")

    if (!guidedActive) {
      setGuidedActive(true)
      return
    }

    if (!guidedInput.trim() && guidedStep > 0 && !guidedFinal) {
      return showToast("Scrivi una breve risposta per continuare 💭", "info")
    }

    let msgs = guidedMessages
    if (guidedInput.trim()) {
      msgs = [...guidedMessages, { role: "user", content: guidedInput }]
      setGuidedMessages(msgs)
      setGuidedInput("")
    }

    setGuidedLoading(true)

    try {
      const res = await fetch(`${API_BASE}/api/guided-reflection`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: uid, messages: msgs, step: guidedStep }),
      })
      const data = await res.json()

      const reply =
        data?.reply ||
        "Grazie per aver condiviso. Restiamo un momento con quello che stai sentendo."

      setGuidedMessages((prev) => [...prev, { role: "assistant", content: reply }])
      setGuidedFinal(Boolean(data?.isFinal))
      setGuidedStep((prev) => (data?.isFinal ? 4 : prev + 1))

      if (data?.isFinal) {
        const h = await fetch(`${API_BASE}/api/summary/history?user_id=${uid}`)
        const j = await h.json()
        if (j?.ok) setSummaryHistory(j.items)
      }
    } catch (e) {
      console.error("guided error:", e)
      showToast("Errore nella riflessione guidata", "error")
    } finally {
      setGuidedLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      <Header />

      {!session && (
        <main className="flex flex-col items-center justify-center pt-20 text-center">
          <h1 className="text-4xl font-semibold mb-4">Benvenuto su MyndSelf.ai</h1>
          <p className="text-slate-300 max-w-xl">
            Accedi per iniziare a tracciare il tuo stato emotivo,
            riflettere con l’AI e vedere la tua evoluzione nel tempo.
          </p>
        </main>
      )}

      {session && (
        <main className="max-w-4xl mx-auto px-4 py-10 space-y-12">

          {/* --- GUIDED REFLECTION --- */}
          <section className="p-6 bg-slate-800 rounded-xl shadow">
            <h2 className="text-2xl font-semibold mb-4">Riflessione guidata</h2>
            <div className="space-y-3 mb-4">
              {guidedMessages.map((m, i) => (
                <div
                  key={i}
                  className={m.role === "assistant" ? "text-emerald-300" : ""}
                >
                  {m.content}
                </div>
              ))}
            </div>

            {!guidedFinal && (
              <div className="flex gap-3">
                <input
                  className="flex-1 rounded bg-slate-700 px-3 py-2"
                  value={guidedInput}
                  onChange={(e) => setGuidedInput(e.target.value)}
                  placeholder="Scrivi la tua risposta..."
                />
                <button
                  onClick={sendGuidedTurn}
                  className="bg-emerald-600 hover:bg-emerald-500 px-4 py-2 rounded"
                >
                  {guidedLoading ? "..." : "Invia"}
                </button>
              </div>
            )}
          </section>

          {/* --- CHAT --- */}
          <section className="p-6 bg-slate-800 rounded-xl shadow">
            <h2 className="text-2xl font-semibold mb-4">Chat riflessiva</h2>

            <div className="space-y-3 mb-4">
              {chatMessages.map((m, i) => (
                <div key={i} className={m.role === "assistant" ? "text-emerald-300" : ""}>
                  {m.content}
                </div>
              ))}
            </div>

            <div className="flex gap-3">
              <input
                className="flex-1 rounded bg-slate-700 px-3 py-2"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Scrivi un messaggio..."
              />
              <button
                onClick={handleChatSend}
                className="bg-emerald-600 hover:bg-emerald-500 px-4 py-2 rounded"
              >
                {isChatLoading ? "..." : "Invia"}
              </button>
            </div>
          </section>

          {/* --- INSIGHTS --- */}
          <section className="p-6 bg-slate-800 rounded-xl shadow">
            <h2 className="text-2xl font-semibold mb-4">Insight emotivi</h2>

            <div className="text-slate-300">
              {insightDaily.length === 0 && "I tuoi insight appariranno qui dopo qualche riflessione."}
            </div>
          </section>

          {/* --- SUMMARY HISTORY --- */}
          <section className="p-6 bg-slate-800 rounded-xl shadow">
            <h2 className="text-xl font-semibold mb-3">Sintesi salvate</h2>

            {summaryHistory.map((s, i) => (
              <div key={i} className="mb-4 p-3 bg-slate-700 rounded">
                <div className="text-slate-400 text-sm mb-1">{s.created_at}</div>
                <div>{s.summary}</div>
              </div>
            ))}

            {summaryHistory.length === 0 && (
              <p className="text-slate-400">Nessuna sintesi salvata ancora.</p>
            )}
          </section>

        </main>
      )}
    </div>
  )
}
