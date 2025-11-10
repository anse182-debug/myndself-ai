// frontend/src/App.tsx
import { useEffect, useState } from "react"
import { createClient } from "@supabase/supabase-js"
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts"
import { BarChart, Bar, CartesianGrid, Legend } from "recharts"
import "./index.css"

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL!,
  import.meta.env.VITE_SUPABASE_KEY!
)

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8080"

interface MoodEntry {
  id?: number
  mood: string
  note: string
  reflection?: string
  tags?: string[]
  at?: string
}

interface SummaryEntry {
  id?: number
  summary: string
  created_at: string
}

interface ChatMessage {
  role: "user" | "assistant"
  content: string
}

export default function App() {
  const [session, setSession] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const [mood, setMood] = useState("")
  const [note, setNote] = useState("")
  const [reflection, setReflection] = useState("")
  const [summary, setSummary] = useState("")

  const [summaryHistory, setSummaryHistory] = useState<SummaryEntry[]>([])
  const [dailyData, setDailyData] = useState<any[]>([])
  const [tagData, setTagData] = useState<any[]>([])

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [chatInput, setChatInput] = useState("")
  const [chatLoading, setChatLoading] = useState(false)

  // ========== AUTH ==========
  useEffect(() => {
    const currentSession = supabase.auth.getSession()
    currentSession.then(({ data }) => {
      if (data?.session) {
        setSession(data.session)
        fetchData(data.session.user.id)
      }
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session) fetchData(session.user.id)
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  const signIn = async () => {
    const email = prompt("Enter your email for login/signup:")
    if (!email) return
    await supabase.auth.signInWithOtp({ email })
    alert("Check your email for the login link.")
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    setSession(null)
  }

  // ========== FETCH DATA AFTER LOGIN ==========
  async function fetchData(user_id: string) {
    try {
      const [summaryRes, dailyRes, tagRes, chatRes] = await Promise.all([
        fetch(`${API_BASE}/api/summary/history?user_id=${user_id}`),
        fetch(`${API_BASE}/api/analytics/daily?user_id=${user_id}`),
        fetch(`${API_BASE}/api/analytics/tags?user_id=${user_id}`),
        fetch(`${API_BASE}/api/chat/history?user_id=${user_id}`),
      ])

      const summaryJson = await summaryRes.json()
      const dailyJson = await dailyRes.json()
      const tagJson = await tagRes.json()
      const chatJson = await chatRes.json()

      setSummaryHistory(summaryJson.items || [])
      setDailyData(dailyJson.items || [])
      setTagData(tagJson.items || [])

      // chat
      if (chatJson.items?.length > 0) {
        const last = chatJson.items[0]
        const restored = [...(last.messages || []), { role: "assistant", content: last.reply }]
        setChatMessages(restored)
      }
    } catch (err) {
      console.error("❌ fetchData error:", err)
    }
  }

  // ========== REFLECTION ==========
  async function handleReflection() {
    if (!session) return alert("Please login first.")
    setLoading(true)
    try {
      const res = await fetch(`${API_BASE}/api/reflection`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: session.user.id,
          mood,
          note,
        }),
      })
      const data = await res.json()
      setReflection(data.reflection || "")
      fetchData(session.user.id)
    } catch (err) {
      console.error("❌ reflection error:", err)
    } finally {
      setLoading(false)
    }
  }

  // ========== SUMMARY ==========
  async function handleSummary() {
    if (!session) return alert("Please login first.")
    setLoading(true)
    try {
      const res = await fetch(
        `${API_BASE}/api/summary?user_id=${session.user.id}&save=true`
      )
      const data = await res.json()
      setSummary(data.summary || "")
      fetchData(session.user.id)
    } catch (err) {
      console.error("❌ summary error:", err)
    } finally {
      setLoading(false)
    }
  }

  // ========== CHAT ==========
  async function handleChat() {
    if (!session) return alert("Please login first.")
    if (!chatInput.trim()) return
    const newMsgs = [...chatMessages, { role: "user", content: chatInput }]
    setChatMessages(newMsgs)
    setChatInput("")
    setChatLoading(true)
    try {
      const res = await fetch(`${API_BASE}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: session.user.id, messages: newMsgs }),
      })
      const data = await res.json()
      if (data.reply) {
        setChatMessages([...newMsgs, { role: "assistant", content: data.reply }])
      }
    } catch (err) {
      console.error("❌ Chat error:", err)
    } finally {
      setChatLoading(false)
    }
  }

  // ========== UI ==========
  if (!session) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen text-white bg-gradient-to-b from-gray-900 to-gray-800 p-4">
        <img src="/cover_glow.webp" alt="MyndSelf logo" className="w-48 mb-6" />
        <h1 className="text-3xl font-bold mb-4">MyndSelf.ai</h1>
        <p className="text-center mb-6 text-gray-300 max-w-md">
          AI for Emotional Intelligence — your reflective companion for mindful growth.
        </p>
        <button
          onClick={signIn}
          className="bg-indigo-500 hover:bg-indigo-600 text-white px-6 py-3 rounded-xl"
        >
          Login / Signup
        </button>
      </div>
    )
  }

  // LOGGED IN VIEW
  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 px-4 sm:px-6 lg:px-8 py-6">
      <header className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-semibold text-indigo-400">MyndSelf.ai</h1>
        <button onClick={signOut} className="text-sm text-gray-400 hover:text-gray-200">
          Logout
        </button>
      </header>

      <section className="grid md:grid-cols-2 gap-8">
        {/* Reflection Section */}
        <div className="bg-gray-900 p-6 rounded-2xl shadow-lg">
          <h2 className="text-xl font-semibold mb-2 text-indigo-300">Reflect on your day</h2>
          <input
            value={mood}
            onChange={(e) => setMood(e.target.value)}
            placeholder="Mood"
            className="w-full mb-2 p-2 rounded bg-gray-800 text-gray-100"
          />
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Add a note..."
            className="w-full p-2 rounded bg-gray-800 text-gray-100 h-24"
          />
          <button
            onClick={handleReflection}
            className="mt-3 bg-indigo-500 hover:bg-indigo-600 px-4 py-2 rounded-xl"
          >
            {loading ? "Reflecting..." : "Generate Reflection"}
          </button>
          {reflection && (
            <p className="mt-4 p-3 bg-gray-800 rounded-lg text-sm leading-relaxed text-gray-200 whitespace-pre-line">
              {reflection}
            </p>
          )}
        </div>

        {/* Summary Section */}
        <div className="bg-gray-900 p-6 rounded-2xl shadow-lg">
          <h2 className="text-xl font-semibold mb-2 text-indigo-300">Weekly Insight</h2>
          <button
            onClick={handleSummary}
            className="bg-indigo-500 hover:bg-indigo-600 px-4 py-2 rounded-xl mb-3"
          >
            {loading ? "Summarizing..." : "Generate & Save Summary"}
          </button>
          {summary && <p className="p-3 bg-gray-800 rounded text-sm">{summary}</p>}
          <div className="mt-4">
            <h3 className="font-semibold mb-2 text-indigo-200">Previous Insights</h3>
            <ul className="space-y-2 max-h-48 overflow-y-auto text-sm">
  {summaryHistory.length === 0 ? (
    <li className="text-gray-500 text-sm">No insights saved yet.</li>
  ) : (
    summaryHistory.map((s) => (
      <li key={s.id || s.created_at} className="bg-gray-800 p-2 rounded">
        {s.summary}
      </li>
    ))
  )}
</ul>
          </div>
        </div>
      </section>

      {/* Charts */}
      <section className="grid md:grid-cols-2 gap-8 mt-10">
        <div className="bg-gray-900 p-6 rounded-2xl shadow-lg">
          <h2 className="text-lg font-semibold text-indigo-300 mb-3">Emotional Journey</h2>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={dailyData}>
              <XAxis dataKey="day" stroke="#888" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="entries" stroke="#6366f1" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-gray-900 p-6 rounded-2xl shadow-lg">
          <h2 className="text-lg font-semibold text-indigo-300 mb-3">Most Frequent Emotions</h2>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={tagData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="tag" stroke="#888" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="tag_count" fill="#818cf8" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* Reflective Chat */}
      <section className="bg-gray-900 p-6 rounded-2xl shadow-lg mt-10">
        <h2 className="text-lg font-semibold text-indigo-300 mb-4">Reflective Chat</h2>
        <div className="space-y-3 max-h-80 overflow-y-auto p-2 bg-gray-800 rounded-lg text-sm">
          {chatMessages.map((m, idx) => (
            <div
              key={idx}
              className={`p-2 rounded ${
                m.role === "user" ? "bg-indigo-600 text-white self-end" : "bg-gray-700"
              }`}
            >
              {m.content}
            </div>
          ))}
          {chatLoading && <div className="text-gray-400 italic">Thinking...</div>}
        </div>
        <div className="flex mt-3 gap-2">
          <input
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            placeholder="Share a thought..."
            className="flex-1 p-2 rounded bg-gray-800 text-gray-100"
          />
          <button
            onClick={handleChat}
            className="bg-indigo-500 hover:bg-indigo-600 px-4 py-2 rounded-xl"
          >
            Send
          </button>
        </div>
      </section>
    </div>
  )
}
