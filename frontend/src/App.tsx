// frontend/src/App.tsx
import { useEffect, useMemo, useState } from "react"
import { supabase } from "./lib/supabase"
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts"
import { BarChart, Bar, CartesianGrid, Legend } from "recharts"

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8080"

type SummaryEntry = {
  id?: string
  summary: string
  created_at: string
}

type DailyItem = {
  day: string
  entries: number
}

type TagItem = {
  tag: string
  tag_count: number
}

type ChatMessage = {
  role: "user" | "assistant"
  content: string
}

type Toast = {
  id: string
  message: string
  type?: "success" | "error" | "info"
}

const MOOD_PRESETS = [
  { label: "Calmo", value: "Calmo / centrato" },
  { label: "Grato", value: "Grato" },
  { label: "Stressato", value: "Stressato" },
  { label: "Stanco", value: "Stanco" },
  { label: "Speranzoso", value: "Speranzoso" },
  { label: "Sovraccarico", value: "Sovraccarico" },
]

function Spinner() {
  return (
    <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
  )
}

export default function App() {
  const [session, setSession] = useState<any>(null)
  const [userId, setUserId] = useState<string>("")

  // UI state
  const [mood, setMood] = useState("")
  const [note, setNote] = useState("")
  const [reflection, setReflection] = useState("")
  const [weeklyInsight, setWeeklyInsight] = useState("")
  const [summaryHistory, setSummaryHistory] = useState<SummaryEntry[]>([])
  const [dailyData, setDailyData] = useState<DailyItem[]>([])
  const [tagData, setTagData] = useState<TagItem[]>([])
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [chatInput, setChatInput] = useState("")
  const [isReflecting, setIsReflecting] = useState(false)
  const [isSummarizing, setIsSummarizing] = useState(false)
  const [isChatLoading, setIsChatLoading] = useState(false)

  const [toasts, setToasts] = useState<Toast[]>([])

  const showToast = (message: string, type: Toast["type"] = "info") => {
    const id = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}`
    setToasts((prev) => [...prev, { id, message, type }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 3500)
  }

  // ---- auth init ----
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        setSession(data.session)
      }
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  // ---- anon id fallback ----
  useEffect(() => {
    let stored = localStorage.getItem("myndself-user-id")
    if (!stored) {
      stored = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}`
      localStorage.setItem("myndself-user-id", stored)
    }
    setUserId(stored)
  }, [])

  // ---- fetch after login / userid ready ----
  useEffect(() => {
    const activeUserId = session?.user?.id || userId
    if (!activeUserId) return

    ;(async () => {
      try {
        const [sumRes, dailyRes, tagRes, chatRes] = await Promise.all([
          fetch(`${API_BASE}/api/summary/history?user_id=${activeUserId}`),
          fetch(`${API_BASE}/api/analytics/daily?user_id=${activeUserId}`),
          fetch(`${API_BASE}/api/analytics/tags?user_id=${activeUserId}`),
          fetch(`${API_BASE}/api/chat/history?user_id=${activeUserId}`),
        ])

        const sumJson = await sumRes.json()
        const dailyJson = await dailyRes.json()
        const tagJson = await tagRes.json()
        const chatJson = await chatRes.json()

        if (sumJson?.ok) setSummaryHistory(sumJson.items || [])
        if (dailyJson?.ok) setDailyData(dailyJson.items || [])
        if (tagJson?.ok) setTagData(tagJson.items || [])

        if (chatJson?.ok && chatJson.items?.length > 0) {
          const last = chatJson.items[0]
          const restored: ChatMessage[] = [
            ...(last.messages || []),
            ...(last.reply ? [{ role: "assistant", content: last.reply }] : []),
          ]
          setChatMessages(restored)
        }
      } catch (err) {
        console.error("init fetch error:", err)
      }
    })()
  }, [session, userId])

  // ---- login/logout ----
  const handleLogin = async () => {
    const email = prompt("Inserisci la tua email")
    if (!email) return
    const { error } = await supabase.auth.signInWithOtp({ email })
    if (error) showToast(error.message, "error")
    else showToast("Magic link inviato. Controlla la tua email ✉️", "success")
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setSession(null)
    showToast("Logout effettuato", "info")
  }

  // ---- reflection ----
  const handleReflection = async () => {
    const activeUserId = session?.user?.id || userId
    if (!activeUserId) {
      showToast("Per favore effettua il login", "error")
      return
    }
    if (!mood && !note) {
      showToast("Aggiungi prima uno stato d'animo o una nota", "error")
      return
    }
    setIsReflecting(true)
    setReflection("")
    try {
      const res = await fetch(`${API_BASE}/api/reflection`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: activeUserId,
          mood,
          note,
        }),
      })
      const data = await res.json()
      setReflection(data.reflection || "")
      showToast("Riflessione Salvata ✅", "success")

      // refetch analytics to see the new entry
      const dailyRes = await fetch(
        `${API_BASE}/api/analytics/daily?user_id=${activeUserId}`
      )
      const dailyJson = await dailyRes.json()
      if (dailyJson?.ok) setDailyData(dailyJson.items || [])

      // clear form
      setMood("")
      setNote("")
    } catch (err) {
      console.error("reflection error:", err)
      showToast("Errore nella generazione della riflessione", "error")
    } finally {
      setIsReflecting(false)
    }
  }

  // ---- summary ----
  const handleSummary = async () => {
    const activeUserId = session?.user?.id || userId
    if (!activeUserId) {
      showToast("Per favore effettua il login", "error")
      return
    }
    setIsSummarizing(true)
    try {
      const res = await fetch(
        `${API_BASE}/api/summary?user_id=${activeUserId}&save=true`
      )
      const data = await res.json()
      setWeeklyInsight(data.summary || "")
      showToast("Approfondimento Salvato ✅", "success")

      // reload history
      const sumRes = await fetch(
        `${API_BASE}/api/summary/history?user_id=${activeUserId}`
      )
      const sumJson = await sumRes.json()
      if (sumJson?.ok) setSummaryHistory(sumJson.items || [])
    } catch (err) {
      console.error("summary error:", err)
      showToast("Errore nella generazione dell'approfondimento", "error")
    } finally {
      setIsSummarizing(false)
    }
  }

  // ---- chat ----
  const handleChatSend = async () => {
    const activeUserId = session?.user?.id || userId
    if (!activeUserId) {
      showToast("Per favore effettua il login", "error")
      return
    }
    if (!chatInput.trim()) return

    const newMessages = [...chatMessages, { role: "user", content: chatInput }]
    setChatMessages(newMessages)
    setChatInput("")
    setIsChatLoading(true)

    try {
      const res = await fetch(`${API_BASE}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: activeUserId,
          messages: newMessages,
        }),
      })
      const data = await res.json()
      if (data.reply) {
        setChatMessages([...newMessages, { role: "assistant", content: data.reply }])
      }
    } catch (err) {
      console.error("chat error:", err)
      showToast("Chat error", "error")
    } finally {
      setIsChatLoading(false)
    }
  }

  // ---- chart friendly data ----
  const chartData = useMemo(() => {
    return (dailyData || []).map((d) => ({
      day: d.day,
      entries: d.entries,
    }))
  }, [dailyData])

  return (
    <main className="min-h-screen bg-gray-950 text-gray-50">
      {/* toasts */}
      <div className="fixed top-4 right-4 z-50 space-y-2 w-[calc(100%-2rem)] sm:w-80">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`px-4 py-3 rounded-lg text-sm border ${
              t.type === "error"
                ? "bg-red-500/10 border-red-400/40 text-red-100"
                : t.type === "success"
                ? "bg-emerald-500/10 border-emerald-400/40 text-emerald-50"
                : "bg-white/10 border-white/20 text-white"
            }`}
          >
            {t.message}
          </div>
        ))}
      </div>

      {/* header */}
      <header className="w-full max-w-6xl mx-auto px-4 sm:px-6 py-5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <img src="/logo.svg" alt="MyndSelf.ai" className="h-9" />
          <div>
            <h1 className="text-lg font-semibold text-emerald-200">MyndSelf.ai</h1>
            <p className="text-xs text-gray-400">AI per Intelligenza Emotiva</p>
          </div>
        </div>
        {session ? (
          <button
            onClick={handleLogout}
            className="text-sm bg-emerald-500/10 border border-emerald-400/40 rounded px-3 py-1.5 hover:bg-emerald-500/20 transition"
          >
            Logout
          </button>
        ) : (
          <button
            onClick={handleLogin}
            className="text-sm bg-emerald-400 text-gray-950 rounded px-3 py-1.5 hover:bg-emerald-300 transition"
          >
            Login
          </button>
        )}
      </header>

      {/* hero / reflection / summary */}
      <section className="w-full max-w-6xl mx-auto px-4 sm:px-6 grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 mt-6">
        {/* reflection */}
        <div className="bg-gray-900/60 border border-white/5 rounded-2xl p-5">
          <h2 className="text-xl font-semibold text-emerald-200 mb-3">
            Riflessione Quotidiana
          </h2>
          <div className="flex flex-wrap gap-2 mb-3">
            {MOOD_PRESETS.map((m) => (
              <button
                key={m.label}
                onClick={() => setMood(m.value)}
                className={`px-3 py-1.5 rounded-full text-xs border transition ${
                  mood === m.value
                    ? "bg-emerald-400 text-gray-950 border-emerald-400"
                    : "bg-white/0 border-white/10 text-white/70 hover:bg-white/5"
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
          <input
            value={mood}
            onChange={(e) => setMood(e.target.value)}
            placeholder="Come ti senti in questo momento? Prova a descriverlo in poche parole"
            className="w-full bg-white/5 rounded-lg px-3 py-2 mb-3 text-sm outline-none focus:ring-1 focus:ring-emerald-400/50"
          />
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Ti va di condividere quello che è successo o quello che hai in mente?"
            className="w-full bg-white/5 rounded-lg px-3 py-2 mb-3 text-sm min-h-[110px] outline-none focus:ring-1 focus:ring-emerald-400/50"
          />
          <button
            onClick={handleReflection}
            disabled={isReflecting}
            className="bg-emerald-400 text-gray-950 px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 disabled:opacity-50"
          >
            {isReflecting ? <Spinner /> : null}
            {isReflecting ? "Salvataggio..." : "Salva e Rifletti"}
          </button>

          {reflection && (
            <div className="mt-4 bg-white/5 rounded-lg p-3 text-sm text-emerald-50 whitespace-pre-wrap">
              {reflection}
            </div>
          )}
        </div>

        {/* summary */}
        <div className="bg-gray-900/60 border border-white/5 rounded-2xl p-5 flex flex-col">
          <h2 className="text-xl font-semibold text-emerald-200 mb-3">
            Weekly insight
          </h2>
          <p className="text-xs text-gray-400 mb-4">
            Crea un breve riassunto delle tue ultime riflessioni.
          </p>
          <button
            onClick={handleSummary}
            disabled={isSummarizing}
            className="bg-emerald-500/90 text-gray-950 px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 mb-4 disabled:opacity-50 w-fit"
          >
            {isSummarizing ? <Spinner /> : null}
            {isSummarizing ? "Generazione in corso..." : "Genera & Salva"}
          </button>
          {weeklyInsight && (
            <div className="bg-white/5 rounded-lg p-3 text-sm text-emerald-50 whitespace-pre-wrap">
              {weeklyInsight}
            </div>
          )}
          <div className="mt-4">
            <h3 className="text-sm font-semibold text-emerald-100 mb-2">
              Approfondimenti Precedenti
            </h3>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {summaryHistory.length === 0 ? (
                <p className="text-xs text-gray-500">
                  Non ci sono ancora approfondimenti salvati. Generane uno qui sopra.
                </p>
              ) : (
                summaryHistory.map((item) => (
                  <div
                    key={item.id || item.created_at}
                    className="bg-white/0 border border-white/5 rounded p-2 text-xs text-gray-100 whitespace-pre-wrap"
                  >
                    <div className="text-[10px] text-gray-500 mb-1">
                      {new Date(item.created_at).toLocaleString()}
                    </div>
                    {item.summary}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </section>

      {/* analytics */}
      <section className="w-full max-w-6xl mx-auto px-4 sm:px-6 grid grid-cols-1 md:grid-cols-2 gap-6 mt-10">
        <div className="bg-gray-900/60 border border-white/5 rounded-2xl p-5">
          <h2 className="text-sm font-semibold text-emerald-200 mb-3">
            Viaggio emotivo (utlimi giorni)
          </h2>
          {chartData.length === 0 ? (
            <p className="text-xs text-gray-500">
              Non ci sono ancora dati. Aggiungi una riflessione per vedere il tuo viaggio.
            </p>
          ) : (
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <XAxis dataKey="day" stroke="#94a3b8" fontSize={10} />
                  <YAxis stroke="#94a3b8" fontSize={10} />
                  <Tooltip
                    contentStyle={{
                      background: "#020617",
                      border: "1px solid rgba(16,185,129,0.4)",
                      borderRadius: "0.5rem",
                      fontSize: "0.7rem",
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="entries"
                    stroke="#10b981"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="bg-gray-900/60 border border-white/5 rounded-2xl p-5">
          <h2 className="text-sm font-semibold text-emerald-200 mb-3">
            Le tue emozioni più frequenti
          </h2>
          {tagData.length === 0 ? (
            <p className="text-xs text-gray-500">
              Quando scrivi, MyndSelf estrae i tag emotivi e li mostra qui.
            </p>
          ) : (
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={tagData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.1)" />
                  <XAxis dataKey="tag" stroke="#94a3b8" fontSize={10} />
                  <YAxis stroke="#94a3b8" fontSize={10} />
                  <Tooltip
                    contentStyle={{
                      background: "#020617",
                      border: "1px solid rgba(16,185,129,0.4)",
                      borderRadius: "0.5rem",
                      fontSize: "0.7rem",
                    }}
                  />
                  <Legend />
                  <Bar dataKey="tag_count" fill="#38bdf8" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </section>

      {/* chat */}
      <section className="w-full max-w-6xl mx-auto px-4 sm:px-6 mt-10 pb-16">
        <div className="bg-gray-900/60 border border-white/5 rounded-2xl p-5 flex flex-col gap-4 min-h-[320px]">
          <h2 className="text-sm font-semibold text-emerald-200">
            Chat Riflessiva
          </h2>
          <div className="flex-1 overflow-y-auto space-y-3">
            {chatMessages.length === 0 ? (
              <p className="text-xs text-gray-500">
                Inizia una riflessione — MyndSelf ricorderà il contesto.
              </p>
            ) : (
              chatMessages.map((m, idx) => (
                <div
                  key={idx}
                  className={`max-w-[90%] sm:max-w-[70%] px-3 py-2 rounded-lg text-sm whitespace-pre-wrap ${
                    m.role === "user"
                      ? "bg-emerald-500/20 text-emerald-50 ml-auto"
                      : "bg-white/5 text-white/90"
                  }`}
                >
                  {m.content}
                </div>
              ))
            )}
            {isChatLoading && (
              <p className="text-xs text-gray-500 italic">Riflettendo un attimo assieme a te…</p>
            )}
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleChatSend()}
              placeholder="Dì a MyndSelf cosa ti passa per la testa..."
              className="flex-1 bg-white/5 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-emerald-400/50"
            />
            <button
              onClick={handleChatSend}
              disabled={isChatLoading}
              className="bg-emerald-400 text-gray-950 px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 disabled:opacity-50"
            >
              {isChatLoading ? <Spinner /> : null}
              Invia
            </button>
          </div>
        </div>
      </section>

      <footer className="w-full max-w-6xl mx-auto px-4 sm:px-6 pb-10 text-xs text-gray-500 text-center">
        © {new Date().getFullYear()} MyndSelf.ai — Empatia attraverso AI
      </footer>
    </main>
  )
}
