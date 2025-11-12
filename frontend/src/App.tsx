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
  { label: "Calm", value: "Calmo / centrato" },
  { label: "Grateful", value: "Grato" },
  { label: "Stressed", value: "Stressato" },
  { label: "Tired", value: "Stanco" },
  { label: "Hopeful", value: "Speranzoso" },
  { label: "Overwhelmed", value: "Sovraccarico" },
]

function Spinner() {
  return (
    <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
  )
}

export default function App() {
  const [session, setSession] = useState<any>(null)
  const [userId, setUserId] = useState<string>("")

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
  // --- Guided Reflection Mode (H1) ---
type GuidedMsg = { role: "user" | "assistant"; content: string }

const [guidedActive, setGuidedActive] = useState(false)
const [guidedStep, setGuidedStep] = useState<number>(0) // 0=non iniziata, 1..4 in sessione
const [guidedMessages, setGuidedMessages] = useState<GuidedMsg[]>([])
const [guidedInput, setGuidedInput] = useState("")
const [guidedLoading, setGuidedLoading] = useState(false)
const [guidedFinal, setGuidedFinal] = useState(false)

async function startGuidedSession() {
  const activeUserId = session?.user?.id || userId
  if (!activeUserId) {
    showToast("Please log in first", "error")
    return
  }
  setGuidedActive(true)
  setGuidedFinal(false)
  setGuidedStep(1)
  setGuidedMessages([
    { role: "assistant", content: "Ti va di fare una breve riflessione insieme? Cosa senti più presente in te adesso?" },
  ])
}

async function sendGuidedTurn() {
  const activeUserId = session?.user?.id || userId
  if (!activeUserId) {
    showToast("Please log in first", "error")
    return
  }
  if (!guidedActive) {
    startGuidedSession()
    return
  }
  if (!guidedInput.trim() && guidedStep > 0 && !guidedFinal) {
    showToast("Scrivi una breve risposta per continuare 💭", "info")
    return
  }

  // Accodo la risposta utente (se c'è)
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
      body: JSON.stringify({
        user_id: activeUserId,
        messages: msgs,
        step: guidedStep || 1,
      }),
    })
    const data = await res.json()
    const reply = data?.reply || "Grazie per aver condiviso. Restiamo un momento con ciò che senti."
    const isFinal = Boolean(data?.isFinal)

    setGuidedMessages((prev) => [...prev, { role: "assistant", content: reply }])
    setGuidedFinal(isFinal)
    setGuidedStep((prev) => (isFinal ? 4 : Math.min(4, (prev || 1) + 1)))
  } catch (err) {
    console.error("guided error:", err)
    showToast("Errore nella sessione guidata", "error")
  } finally {
    setGuidedLoading(false)
  }
}

function resetGuided() {
  setGuidedActive(false)
  setGuidedFinal(false)
  setGuidedStep(0)
  setGuidedMessages([])
  setGuidedInput("")
}


  const [toasts, setToasts] = useState<Toast[]>([])

  const showToast = (message: string, type: Toast["type"] = "info") => {
    const id = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}`
    setToasts((prev) => [...prev, { id, message, type }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 3500)
  }

  // auth init
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setSession(data.session)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  // anon id
  useEffect(() => {
    let stored = localStorage.getItem("myndself-user-id")
    if (!stored) {
      stored = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}`
      localStorage.setItem("myndself-user-id", stored)
    }
    setUserId(stored)
  }, [])

  // fetch data when user changes
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

  const handleLogin = async () => {
    const email = prompt("Enter your email")
    if (!email) return
    const { error } = await supabase.auth.signInWithOtp({ email })
    if (error) showToast(error.message, "error")
    else showToast("Magic link sent. Check your email ✉️", "success")
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setSession(null)
    showToast("Signed out", "info")
  }

  const handleReflection = async () => {
    const activeUserId = session?.user?.id || userId
    if (!activeUserId) {
      showToast("Please log in first", "error")
      return
    }
    if (!mood && !note) {
      showToast("Try to write at least a mood or a short note 💭", "error")
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
      showToast("Reflection saved ✅", "success")

      // refresh analytics
      const dailyRes = await fetch(
        `${API_BASE}/api/analytics/daily?user_id=${activeUserId}`
      )
      const dailyJson = await dailyRes.json()
      if (dailyJson?.ok) setDailyData(dailyJson.items || [])

      setMood("")
      setNote("")
    } catch (err) {
      console.error("reflection error:", err)
      showToast("Error generating reflection", "error")
    } finally {
      setIsReflecting(false)
    }
  }

  const handleSummary = async () => {
    const activeUserId = session?.user?.id || userId
    if (!activeUserId) {
      showToast("Please log in first", "error")
      return
    }
    setIsSummarizing(true)
    try {
      const res = await fetch(
        `${API_BASE}/api/summary?user_id=${activeUserId}&save=true`
      )
      const data = await res.json()
      setWeeklyInsight(data.summary || "")
      showToast("Insight saved ✅", "success")

      const sumRes = await fetch(
        `${API_BASE}/api/summary/history?user_id=${activeUserId}`
      )
      const sumJson = await sumRes.json()
      if (sumJson?.ok) setSummaryHistory(sumJson.items || [])
    } catch (err) {
      console.error("summary error:", err)
      showToast("Error generating insight", "error")
    } finally {
      setIsSummarizing(false)
    }
  }

  const handleChatSend = async () => {
    const activeUserId = session?.user?.id || userId
    if (!activeUserId) {
      showToast("Please log in first", "error")
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
        setChatMessages([
          ...newMessages,
          { role: "assistant", content: data.reply },
        ])
      }
    } catch (err) {
      console.error("chat error:", err)
      showToast("Chat error", "error")
    } finally {
      setIsChatLoading(false)
    }
  }

  const chartData = useMemo(() => {
    return (dailyData || []).map((d) => ({
      day: d.day,
      entries: d.entries,
    }))
  }, [dailyData])

  return (
    <main className="min-h-screen bg-gray-950 text-gray-50">
      {/* TOASTS */}
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

      {/* HEADER */}
      <header className="w-full max-w-6xl mx-auto px-4 sm:px-6 py-5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <img src="/logo.svg" alt="MyndSelf.ai" className="h-9" />
          <div>
            <h1 className="text-lg font-semibold text-emerald-200">
              MyndSelf.ai
            </h1>
            <p className="text-xs text-gray-400">
              AI for Emotional Intelligence
            </p>
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

      {/* MAIN GRID: Reflection + Summary */}
      <section className="w-full max-w-6xl mx-auto px-4 sm:px-6 grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 mt-6">
        {/* reflection */}
        <div className="bg-gray-900/60 border border-white/5 rounded-2xl p-5">
          <h2 className="text-xl font-semibold text-emerald-200 mb-3">
            Daily reflection
          </h2>
          <p className="text-xs text-gray-400 mb-3">
            Describe how you feel right now — I’ll help you look at it with
            kindness.
          </p>
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
            placeholder="How are you feeling in this moment?"
            className="w-full bg-white/5 rounded-lg px-3 py-2 mb-3 text-sm outline-none focus:ring-1 focus:ring-emerald-400/50"
          />
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Would you like to share what happened, or what’s on your mind?"
            className="w-full bg-white/5 rounded-lg px-3 py-2 mb-3 text-sm min-h-[110px] outline-none focus:ring-1 focus:ring-emerald-400/50"
          />
          <button
            onClick={handleReflection}
            disabled={isReflecting}
            className="bg-emerald-400 text-gray-950 px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 disabled:opacity-50"
          >
            {isReflecting ? <Spinner /> : null}
            {isReflecting ? "Reflecting..." : "Reflect with AI"}
          </button>

          {reflection && (
            <div className="mt-4 bg-white/5 rounded-lg p-3 text-sm text-emerald-50 whitespace-pre-wrap fade-in">
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
            MyndSelf can read your recent reflections and give you a calm
            emotional snapshot.
          </p>
          <button
            onClick={handleSummary}
            disabled={isSummarizing}
            className="bg-emerald-500/90 text-gray-950 px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 mb-4 disabled:opacity-50 w-fit"
          >
            {isSummarizing ? <Spinner /> : null}
            {isSummarizing ? "Generating..." : "Generate & save insight"}
          </button>
          {weeklyInsight && (
            <div className="bg-white/5 rounded-lg p-3 text-sm text-emerald-50 whitespace-pre-wrap fade-in">
              {weeklyInsight}
            </div>
          )}
          <div className="mt-4">
            <h3 className="text-sm font-semibold text-emerald-100 mb-2">
              Previous insights
            </h3>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {summaryHistory.length === 0 ? (
                <p className="text-xs text-gray-500">
                  No insights saved yet. Generate one above.
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
            Emotional journey (last days)
          </h2>
          {chartData.length === 0 ? (
            <p className="text-xs text-gray-500">
              Do a few check-ins and your emotional journey will appear here.
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
            Most frequent emotions
          </h2>
          {tagData.length === 0 ? (
            <p className="text-xs text-gray-500">
              When you write, MyndSelf extracts emotional tags and shows them
              here.
            </p>
          ) : (
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={tagData}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="rgba(148,163,184,0.1)"
                  />
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
{/* emotional evolution */}
<section className="w-full max-w-6xl mx-auto px-4 sm:px-6 mt-10">
  <div className="bg-gray-900/60 border border-white/5 rounded-2xl p-5">
    <h2 className="text-sm font-semibold text-emerald-200 mb-3">
      Emotional Evolution
    </h2>
    <p className="text-xs text-gray-400 mb-3">
      A reflection of how your emotions have evolved over time.
    </p>

    {/* Fetch profile data */}
    {(() => {
      const [profile, setProfile] = useState<string>("")
      const [topTags, setTopTags] = useState<string[]>([])
      const [loading, setLoading] = useState(true)

      useEffect(() => {
        const activeUserId = session?.user?.id || userId
        if (!activeUserId) return
        ;(async () => {
          try {
            const res = await fetch(
              `${API_BASE}/api/emotional-profile?user_id=${activeUserId}`
            )
            const data = await res.json()
            if (data?.ok) {
              setProfile(data.profileText)
              setTopTags(data.topTags || [])
            }
          } catch (err) {
            console.error("profile fetch error:", err)
          } finally {
            setLoading(false)
          }
        })()
      }, [session, userId])

      if (loading)
        return (
          <div className="text-xs text-gray-500 italic animate-pulse">
            Reflecting on your emotional path...
          </div>
        )

      if (!profile)
        return (
          <p className="text-xs text-gray-500">
            Not enough reflections yet to build your emotional evolution.
          </p>
        )

      return (
        <div className="fade-in">
          <div className="text-sm text-emerald-50 whitespace-pre-wrap mb-3 bg-white/5 rounded-lg p-3">
            {profile}
          </div>
          {topTags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {topTags.map((tag, i) => (
                <span
                  key={i}
                  className="bg-emerald-500/10 text-emerald-200 text-xs px-2 py-1 rounded-full border border-emerald-400/30"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      )
    })()}
  </div>
</section>

      {/* chat */}
      <section className="w-full max-w-6xl mx-auto px-4 sm:px-6 mt-10 pb-16">
        <div className="bg-gray-900/60 border border-white/5 rounded-2xl p-5 flex flex-col gap-4 min-h-[320px]">
          <h2 className="text-sm font-semibold text-emerald-200">
            Reflective Chat
          </h2>
          <div className="flex-1 overflow-y-auto space-y-3">
            {chatMessages.length === 0 ? (
              <p className="text-xs text-gray-500">
                Share a thought, a worry, or a small win — I’ll stay with you in
                it.
              </p>
            ) : (
              chatMessages.map((m, idx) => (
                <div
                    key={idx}
                    className={`max-w-[90%] sm:max-w-[70%] px-3 py-2 rounded-lg text-sm whitespace-pre-wrap ${
                        m.role === "user"
                            ? "bg-emerald-500/20 text-emerald-50 ml-auto"
                            : "bg-white/5 text-white/90 fade-in"
                    }`}
                >
                  {m.content}
                </div>
              ))
            )}
            {isChatLoading && (
              <p className="text-xs text-gray-400 italic animate-pulse">
                Reflecting with you for a moment...
              </p>
            )}
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleChatSend()}
              placeholder="Write what’s on your mind — I’m here to listen."
              className="flex-1 bg-white/5 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-emerald-400/50"
            />
            <button
              onClick={handleChatSend}
              disabled={isChatLoading}
              className="bg-emerald-400 text-gray-950 px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 disabled:opacity-50"
            >
              {isChatLoading ? <Spinner /> : null}
              Send
            </button>
          </div>
        </div>
      </section>

      <footer className="w-full max-w-6xl mx-auto px-4 sm:px-6 pb-10 text-xs text-gray-500 text-center">
        © {new Date().getFullYear()} MyndSelf.ai — Empathy through AI
      </footer>
    </main>
  )
}
