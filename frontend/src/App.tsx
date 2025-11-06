import { useEffect, useState } from "react"

type ReflectionEntry = {
  id: string
  mood: string
  note: string
  reflection: string
  at: string
}

export default function App() {
  // join beta
  const [email, setEmail] = useState("")
  const [submitted, setSubmitted] = useState(false)

  // daily check-in
  const [mood, setMood] = useState("")
  const [note, setNote] = useState("")
  const [reflection, setReflection] = useState("")
  const [loading, setLoading] = useState(false)

  // history
  const [history, setHistory] = useState<ReflectionEntry[]>([])

  // load history from localStorage at startup
  useEffect(() => {
    const raw = localStorage.getItem("myndself-reflections")
    if (raw) {
      try {
        setHistory(JSON.parse(raw))
      } catch {
        // ignore
      }
    }
  }, [])

  // save history to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem("myndself-reflections", JSON.stringify(history))
  }, [history])

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

  const handleReflect = async () => {
    if (!mood && !note) return
    setLoading(true)
    setReflection("")

    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE}/api/reflection`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mood, note }),
      })
      const data = await res.json()

      const now = new Date().toISOString()
      const newEntry: ReflectionEntry = {
        id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}`,
        mood: mood || "unspecified",
        note: note || "",
        reflection: data.reflection || "No response.",
        at: now,
      }

      setReflection(data.reflection || "")
      setHistory((prev) => [newEntry, ...prev])
      setMood("")
      setNote("")
    } catch (err) {
      console.error(err)
      setReflection("Error connecting to reflection service.")
    } finally {
      setLoading(false)
    }
  }

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

      {/* JOIN THE BETA */}
      <section id="join" className="max-w-3xl mx-auto px-6 py-16 text-center">
        <h2 className="text-3xl font-semibold mb-6 text-emerald-300">
          Join the Beta
        </h2>
        {!submitted ? (
          <form
            onSubmit={handleJoin}
            className="flex flex-col md:flex-row gap-3 justify-center"
          >
            <input
              type="email"
              placeholder="Your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="flex-1 px-4 py-3 rounded bg-white/10 text-white placeholder-white/40 border border-white/10"
              required
            />
            <button
              type="submit"
              className="bg-emerald-400 text-gray-900 font-semibold px-5 py-3 rounded-lg hover:bg-emerald-300 transition"
            >
              Sign Up
            </button>
          </form>
        ) : (
          <p className="text-emerald-300 mt-4">Thank you! You're on the list 💫</p>
        )}
      </section>

      {/* DAILY CHECK-IN */}
      <section className="max-w-3xl mx-auto px-6 py-16">
        <h2 className="text-3xl font-semibold mb-4 text-emerald-300 text-center">
          Daily Check-In
        </h2>
        <p className="text-white/60 mb-6 text-center">
          Share how you feel right now. MyndSelf will reflect it back using CBT/ACT style.
        </p>

        <div className="space-y-3">
          <input
            type="text"
            placeholder="Your mood (e.g. calm, stressed, hopeful)"
            value={mood}
            onChange={(e) => setMood(e.target.value)}
            className="w-full p-3 rounded bg-white/10 text-white"
          />
          <textarea
            placeholder="Add a note (what happened, what you noticed...)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="w-full p-3 rounded bg-white/10 text-white min-h-[120px]"
          />
          <button
            onClick={handleReflect}
            disabled={loading}
            className="bg-emerald-400 text-gray-900 font-semibold px-5 py-2 rounded-lg hover:bg-emerald-300 transition disabled:opacity-50"
          >
            {loading ? "Reflecting..." : "Get reflection"}
          </button>
        </div>

        {reflection && (
          <div className="mt-6 bg-white/10 p-4 rounded text-left">
            <strong className="text-emerald-300">AI Reflection:</strong>
            <p className="mt-2 text-emerald-100">{reflection}</p>
          </div>
        )}
      </section>

      {/* HISTORY */}
      <section className="max-w-4xl mx-auto px-6 pb-20">
        <h2 className="text-2xl font-semibold mb-4 text-emerald-200">
          Your reflections
        </h2>
        {history.length === 0 ? (
          <p className="text-white/40">No check-ins yet. Try adding one above.</p>
        ) : (
          <ul className="space-y-4">
            {history.map((entry) => (
              <li
                key={entry.id}
                className="bg-white/5 rounded-lg p-4 border border-white/5"
              >
                <div className="flex items-center justify-between mb-2 gap-3">
                  <span className="text-sm text-white/60">
                    {new Date(entry.at).toLocaleString()}
                  </span>
                  <span className="text-xs bg-emerald-500/20 text-emerald-200 px-2 py-1 rounded">
                    {entry.mood}
                  </span>
                </div>
                {entry.note && (
                  <p className="text-white/80 mb-2 text-sm">{entry.note}</p>
                )}
                <p className="text-emerald-100 text-sm">
                  {entry.reflection}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <footer className="max-w-6xl mx-auto px-6 pb-10 text-sm text-white/60 text-center">
        © {new Date().getFullYear()} MyndSelf.ai — All rights reserved.
      </footer>
    </main>
  )
}
