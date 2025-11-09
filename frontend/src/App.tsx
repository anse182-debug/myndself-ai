import { useEffect, useMemo, useState } from "react"
import { supabase } from "./lib/supabase"
import type { User } from "@supabase/supabase-js"
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts"

type ReflectionEntry = {
  id: string
  mood: string
  note: string
  reflection: string
  tags?: string[]
  at?: string
  created_at?: string
}

type SummaryItem = {
  id: string
  summary: string
  created_at: string
}

type DailyActivity = {
  day: string
  entries: number
}

type TopTag = {
  tag: string
  tag_count: number
}

type ChatMessage = {
  role: "user" | "assistant"
  content: string
}

export default function App() {
  // newsletter / beta (se vuoi usarla)
  const [email, setEmail] = useState("")
  const [submitted, setSubmitted] = useState(false)

  // auth
  const [user, setUser] = useState<User | null>(null)
  const [authLoading, setAuthLoading] = useState(false)
  const [emailForLogin, setEmailForLogin] = useState("")

  // daily check-in
  const [mood, setMood] = useState("")
  const [note, setNote] = useState("")
  const [reflection, setReflection] = useState("")
  const [loading, setLoading] = useState(false)

  // data
  const [history, setHistory] = useState<ReflectionEntry[]>([])
  const [userId, setUserId] = useState<string>("")

  // insights
  const [weeklyInsight, setWeeklyInsight] = useState<string>("")
  const [insightHistory, setInsightHistory] = useState<SummaryItem[]>([])

  // analytics
  const [dailyActivity, setDailyActivity] = useState<DailyActivity[]>([])
  const [topTags, setTopTags] = useState<TopTag[]>([])

  // chat
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [chatInput, setChatInput] = useState("")
  const [isChatLoading, setIsChatLoading] = useState(false)

  // ---- AUTH INIT ----
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setUser(data.session.user)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  // ---- ANON USER ID ----
  useEffect(() => {
    let stored = localStorage.getItem("myndself-user-id")
    if (!stored) {
      stored = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}`
      localStorage.setItem("myndself-user-id", stored)
    }
    setUserId(stored)
  }, [])

  // ---- FETCH MOOD HISTORY, SUMMARY HISTORY, ANALYTICS, CHAT HISTORY ----
  useEffect(() => {
    const activeUserId = user?.id || userId
    if (!activeUserId) return

    async function fetchAll() {
      try {
        // mood history
        const moodRes = await fetch(
          `${import.meta.env.VITE_API_BASE}/api/mood?user_id=${activeUserId}`
        )
        const moodJson = await moodRes.json()
        if (moodJson?.ok && Array.isArray(moodJson.items)) {
          setHistory(moodJson.items)
        }

        // summary history
        const sumRes = await fetch(
          `${import.meta.env.VITE_API_BASE}/api/summary/history?user_id=${activeUserId}`
        )
        const sumJson = await sumRes.json()
        if (sumJson?.ok && Array.isArray(sumJson.items)) {
          setInsightHistory(sumJson.items)
        }

        // analytics daily
        const [dailyRes, tagsRes] = await Promise.all([
          fetch(
            `${import.meta.env.VITE_API_BASE}/api/analytics/daily?user_id=${activeUserId}`
          ),
          fetch(
            `${import.meta.env.VITE_API_BASE}/api/analytics/tags?user_id=${activeUserId}`
          ),
        ])

        const dailyJson = await dailyRes.json()
        if (dailyJson?.ok && Array.isArray(dailyJson.items)) {
          setDailyActivity(
            dailyJson.items.map((d: any) => ({
              day: d.day,
              entries: d.entries,
            }))
          )
        }

        const tagsJson = await tagsRes.json()
        if (tagsJson?.ok && Array.isArray(tagsJson.items)) {
          setTopTags(
            tagsJson.items.map((t: any) => ({
              tag: t.tag,
              tag_count: t.tag_count,
            }))
          )
        }

        // chat history (ultima sessione)
        const chatRes = await fetch(
          `${import.meta.env.VITE_API_BASE}/api/chat/history?user_id=${activeUserId}`
        )
        const chatJson = await chatRes.json()
        if (chatJson?.ok && Array.isArray(chatJson.items) && chatJson.items[0]) {
          setChatMessages(chatJson.items[0].messages || [])
        }
      } catch (err) {
        console.error("Failed to fetch initial data:", err)
      }
    }

    fetchAll()
  }, [user, userId])

  // ---- LOGIN ----
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setAuthLoading(true)

    const redirectUrl =
      import.meta.env.VITE_SITE_URL || window.location.origin

    const { error } = await supabase.auth.signInWithOtp({
      email: emailForLogin,
      options: { emailRedirectTo: redirectUrl },
    })

    setAuthLoading(false)
    if (error) alert(error.message)
    else alert("Check your email for the magic link!")
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
  }

  // ---- SUBSCRIBE (opzionale) ----
  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await fetch(`${import.meta.env.VITE_API_BASE}/api/subscribe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      })
      setSubmitted(true)
    } catch (err) {
      console.error(err)
    }
  }

  // ---- REFLECTION ----
  const handleReflect = async () => {
    if (!mood && !note) return
    setLoading(true)
    setReflection("")

    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE}/api/reflection`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mood,
          note,
          user_id: user?.id || userId,
        }),
      })
      const data = await res.json()

      const now = new Date().toISOString()
      const newEntry: ReflectionEntry = {
        id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}`,
        mood: mood || "unspecified",
        note: note || "",
        reflection: data.reflection || "No response.",
        tags: Array.isArray(data.tags) ? data.tags : [],
        at: now,
      }

      // UI
      setReflection(data.reflection || "")
      setHistory((prev) => [newEntry, ...prev])

      // save
      await fetch(`${import.meta.env.VITE_API_BASE}/api/mood`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...newEntry,
          user_id: user?.id || userId,
        }),
      })

      setMood("")
      setNote("")
    } catch (err) {
      console.error(err)
      setReflection("Errore durante la riflessione.")
    } finally {
      setLoading(false)
    }
  }

  // ---- WEEKLY SUMMARY ----
  const handleWeeklySummary = async (save = false) => {
    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_BASE}/api/summary?user_id=${user?.id || userId}${
          save ? "&save=true" : ""
        }`
      )
      const data = await res.json()
      setWeeklyInsight(data.summary || "Nessun riepilogo disponibile.")

      // se ho salvato, ricarico lo storico
      if (save) {
        const sh = await fetch(
          `${import.meta.env.VITE_API_BASE}/api/summary/history?user_id=${
            user?.id || userId
          }`
        )
        const shJson = await sh.json()
        if (shJson?.ok && Array.isArray(shJson.items)) {
          setInsightHistory(shJson.items)
        }
      }
    } catch (err) {
      console.error("Errore nel riepilogo:", err)
      setWeeklyInsight("Errore nel generare il riepilogo.")
    }
  }

  // ---- CHAT SEND ----
  async function handleChatSend() {
    if (!chatInput.trim()) return
    const userMessage: ChatMessage = {
      role: "user",
      content: chatInput.trim(),
    }

    setChatMessages((prev) => [...prev, userMessage])
    setChatInput("")
    setIsChatLoading(true)

    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: user?.id || userId,
          messages: [...chatMessages, userMessage],
        }),
      })
      const data = await res.json()
      const aiMessage: ChatMessage = {
        role: "assistant",
        content: data.reply || "...",
      }
      setChatMessages((prev) => [...prev, aiMessage])
    } catch (err) {
      console.error("Chat error:", err)
      setChatMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Non riesco a rispondere ora, riprova tra poco.",
        },
      ])
    } finally {
      setIsChatLoading(false)
    }
  }

  // ---- CHART DATA ----
  const chartData = useMemo(() => {
    const moodToScore = (m: string) => {
      const val = m?.toLowerCase?.() || ""
      if (val.includes("calm") || val.includes("seren") || val.includes("tran"))
        return 4
      if (val.includes("felic") || val.includes("happy") || val.includes("hope"))
        return 5
      if (val.includes("stress") || val.includes("ansia") || val.includes("tired"))
        return 2
      if (val.includes("trist") || val.includes("sad")) return 1
      return 3
    }

    return (history || [])
      .map((entry) => {
        const dateStr = entry.at || entry.created_at || ""
        return {
          date: dateStr ? new Date(dateStr).toLocaleDateString() : "",
          score: moodToScore(entry.mood),
        }
      })
      .reverse()
  }, [history])

  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-950 text-white">
      {/* HERO */}
      <section className="max-w-6xl mx-auto px-6 pt-20 pb-32 grid md:grid-cols-2 gap-10 items-center">
        <div>
          <h1 className="text-5xl font-semibold leading-tight mb-6 text-emerald-300">
            MyndSelf.ai
          </h1>
          <p className="text-xl text-white/80 mb-8">
            AI for Emotional Intelligence — reflect, rebalance and grow every day.
          </p>
          <a
            href="#join"
            className="inline-block bg-emerald-400 text-gray-900 font-semibold px-6 py-3 rounded-lg hover:bg-emerald-300 transition"
          >
            Join the Beta
          </a>
        </div>
        <div>
          <img
            src="/images/cover_glow.webp"
            alt="MyndSelf AI visual"
            className="w-full rounded-3xl shadow-2xl brightness-110"
          />
        </div>
      </section>

      {/* AUTH */}
      <section className="max-w-3xl mx-auto px-6 py-8 text-center">
        {!user ? (
          <div className="bg-white/10 p-6 rounded-lg border border-white/10">
            <h2 className="text-2xl font-semibold mb-3 text-emerald-300">
              Sign in to your Journal
            </h2>
            <form
              onSubmit={handleLogin}
              className="flex flex-col sm:flex-row gap-3 justify-center"
            >
              <input
                type="email"
                placeholder="Enter your email"
                value={emailForLogin}
                onChange={(e) => setEmailForLogin(e.target.value)}
                className="flex-1 px-4 py-3 rounded bg-white/10 text-white placeholder-white/40 border border-white/10"
                required
              />
              <button
                type="submit"
                disabled={authLoading}
                className="bg-emerald-400 text-gray-900 font-semibold px-5 py-3 rounded-lg hover:bg-emerald-300 transition disabled:opacity-50"
              >
                {authLoading ? "Sending..." : "Send Magic Link"}
              </button>
            </form>
          </div>
        ) : (
          <div className="bg-white/10 p-6 rounded-lg border border-white/10">
            <p className="text-white/80 mb-3">
              Signed in as <span className="text-emerald-300">{user.email}</span>
            </p>
            <button
              onClick={handleLogout}
              className="bg-emerald-400 text-gray-900 font-semibold px-5 py-2 rounded-lg hover:bg-emerald-300 transition"
            >
              Sign Out
            </button>
          </div>
        )}
      </section>

      {/* DAILY CHECK-IN */}
      <section className="max-w-3xl mx-auto px-6 py-16">
        <h2 className="text-3xl font-semibold mb-4 text-emerald-300 text-center">
          Daily Check-In
        </h2>
        <p className="text-white/60 mb-6 text-center">
          Tell MyndSelf how you feel right now — it will reflect in your language.
        </p>

        <div className="space-y-3">
          <input
            type="text"
            placeholder="Il tuo stato d'animo"
            value={mood}
            onChange={(e) => setMood(e.target.value)}
            className="w-full p-3 rounded bg-white/10 text-white"
          />
          <textarea
            placeholder="Aggiungi una nota"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="w-full p-3 rounded bg-white/10 text-white min-h-[120px]"
          />
          <button
            onClick={handleReflect}
            disabled={loading}
            className="bg-emerald-400 text-gray-900 font-semibold px-5 py-2 rounded-lg hover:bg-emerald-300 transition disabled:opacity-50"
          >
            {loading ? "Rifletto..." : "Ottieni la riflessione"}
          </button>
        </div>

        {reflection && (
          <div className="mt-6 bg-white/10 p-4 rounded text-left">
            <strong className="text-emerald-300">AI Reflection:</strong>
            <p className="mt-2 text-emerald-100">{reflection}</p>
          </div>
        )}
      </section>

      {/* WEEKLY INSIGHT + HISTORY */}
      <section className="max-w-4xl mx-auto px-6 pb-10 space-y-6">
        <div className="bg-white/5 rounded-lg p-5 border border-white/5">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <h2 className="text-2xl font-semibold text-emerald-200">
              Weekly Insight
            </h2>
            <div className="flex gap-3">
              <button
                onClick={() => handleWeeklySummary(false)}
                className="bg-emerald-400 text-gray-900 font-semibold px-4 py-2 rounded-lg hover:bg-emerald-300 transition"
              >
                Preview
              </button>
              <button
                onClick={() => handleWeeklySummary(true)}
                className="bg-emerald-500 text-gray-900 font-semibold px-4 py-2 rounded-lg hover:bg-emerald-400 transition"
              >
                Generate & Save
              </button>
            </div>
          </div>
          <p className="text-white/70 text-sm leading-relaxed">
            {weeklyInsight
              ? weeklyInsight
              : "Ask MyndSelf to analyze your recent reflections and get a gentle summary of your emotional trend."}
          </p>
        </div>

        <div className="bg-white/5 rounded-lg p-5 border border-white/5">
          <h3 className="text-lg font-semibold mb-3 text-emerald-200">
            Previous insights
          </h3>
          {insightHistory.length === 0 ? (
            <p className="text-white/40 text-sm">
              Nessun insight salvato ancora. Generane uno con “Generate & Save”.
            </p>
          ) : (
            <ul className="space-y-3">
              {insightHistory.map((item) => (
                <li key={item.id} className="bg-white/5 rounded p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-white/40">
                      {new Date(item.created_at).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-sm text-white/80 leading-relaxed">
                    {item.summary}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* EMOTIONAL JOURNEY */}
      <section className="max-w-4xl mx-auto px-6 pb-10 space-y-6">
        <h2 className="text-2xl font-semibold text-emerald-200">
          Your Emotional Journey
        </h2>

        {/* Daily activity */}
        <div className="bg-white/5 rounded-lg p-4 border border-white/5">
          <h3 className="text-sm font-semibold text-white/80 mb-3">
            Check-ins (last 14 days)
          </h3>
          {dailyActivity.length === 0 ? (
            <p className="text-white/30 text-sm">
              Do a few daily check-ins to see your activity here.
            </p>
          ) : (
            <div className="flex gap-2 overflow-x-auto">
              {dailyActivity
                .slice()
                .reverse()
                .map((d) => (
                  <div
                    key={d.day}
                    className="flex flex-col items-center gap-1 min-w-[48px]"
                  >
                    <div
                      className="w-8 rounded bg-emerald-400/30 border border-emerald-400/30"
                      style={{ height: 20 + d.entries * 14 }}
                      title={`${d.entries} entries`}
                    />
                    <span className="text-[10px] text-white/40">
                      {new Date(d.day).toLocaleDateString()}
                    </span>
                  </div>
                ))}
            </div>
          )}
        </div>

        {/* Top tags */}
        <div className="bg-white/5 rounded-lg p-4 border border-white/5">
          <h3 className="text-sm font-semibold text-white/80 mb-3">
            Most frequent emotions
          </h3>
          {topTags.length === 0 ? (
            <p className="text-white/30 text-sm">
              When you add moods, MyndSelf will extract emotional tags and show them here.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {topTags.map((t) => (
                <span
                  key={t.tag}
                  className="text-xs bg-emerald-500/15 text-emerald-100 px-3 py-1 rounded-full border border-emerald-500/20"
                >
                  {t.tag} · {t.tag_count}
                </span>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* REFLECTIVE CHAT */}
      <section className="max-w-3xl mx-auto px-6 pb-16 space-y-4">
        <h2 className="text-2xl font-semibold text-emerald-200">
          Reflective Chat
        </h2>
        <div className="bg-white/5 rounded-xl p-4 border border-white/10 min-h-[320px] flex flex-col justify-between">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto space-y-3 mb-4">
            {chatMessages.length === 0 && (
              <p className="text-white/30 text-sm text-center mt-6">
                Start a conversation with your inner reflection companion.
              </p>
            )}
            {chatMessages.map((m, idx) => (
              <div
                key={idx}
                className={`flex ${
                  m.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`max-w-[75%] px-3 py-2 rounded-xl text-sm whitespace-pre-wrap ${
                    m.role === "user"
                      ? "bg-emerald-500/20 text-emerald-100"
                      : "bg-white/10 text-white/90"
                  }`}
                >
                  {m.content}
                </div>
              </div>
            ))}
            {isChatLoading && (
              <div className="flex justify-start">
                <div className="text-white/40 text-sm italic animate-pulse">
                  Thinking...
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Type your thought..."
              className="flex-1 bg-white/10 text-white/90 text-sm px-3 py-2 rounded-xl border border-white/10 focus:outline-none focus:ring-1 focus:ring-emerald-400/50"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleChatSend()}
            />
            <button
              onClick={handleChatSend}
              disabled={isChatLoading}
              className="bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-100 px-4 py-2 rounded-xl border border-emerald-500/20 text-sm transition disabled:opacity-50"
            >
              {isChatLoading ? "..." : "Send"}
            </button>
          </div>
        </div>
      </section>

      {/* MOOD TREND */}
      <section className="max-w-4xl mx-auto px-6 pb-16">
        <h2 className="text-2xl font-semibold mb-4 text-emerald-200">
          Mood trend
        </h2>
        {chartData.length === 0 ? (
          <p className="text-white/40 text-sm">
            Nessun dato ancora. Aggiungi un check-in sopra.
          </p>
        ) : (
          <div className="bg-white/5 rounded-lg p-4 border border-white/5 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <XAxis dataKey="date" stroke="#d1fae5" />
                <YAxis domain={[0, 6]} tickCount={7} stroke="#d1fae5" />
                <Tooltip
                  contentStyle={{
                    background: "#111827",
                    border: "1px solid #10b981",
                  }}
                  labelStyle={{ color: "#fff" }}
                />
                <Line
                  type="monotone"
                  dataKey="score"
                  stroke="#10b981"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>

      {/* HISTORY */}
      <section className="max-w-4xl mx-auto px-6 pb-20">
        <h2 className="text-2xl font-semibold mb-4 text-emerald-200">
          Your reflections
        </h2>
        {history.length === 0 ? (
          <p className="text-white/40">
            Nessun check-in ancora. Prova ad aggiungerne uno sopra.
          </p>
        ) : (
          <ul className="space-y-4">
            {history.map((entry) => (
              <li
                key={entry.id}
                className="bg-white/5 rounded-lg p-4 border border-white/5"
              >
                <div className="flex items-center justify-between mb-2 gap-3">
                  <span className="text-sm text-white/60">
                    {new Date(entry.at || entry.created_at || "").toLocaleString()}
                  </span>
                  <span className="text-xs bg-emerald-500/20 text-emerald-200 px-2 py-1 rounded">
                    {entry.mood}
                  </span>
                </div>
                {entry.note && (
                  <p className="text-white/80 mb-2 text-sm">{entry.note}</p>
                )}
                {entry.reflection && (
                  <p className="text-emerald-100 text-sm">{entry.reflection}</p>
                )}
                {entry.tags && entry.tags.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {entry.tags.map((tag, i) => (
                      <span
                        key={i}
                        className="text-xs bg-emerald-500/20 text-emerald-200 px-2 py-1 rounded-full"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* FOOTER */}
      <footer className="max-w-6xl mx-auto px-6 pb-10 text-sm text-white/60 text-center">
        © {new Date().getFullYear()} MyndSelf.ai — All rights reserved.
      </footer>
    </main>
  )
}
