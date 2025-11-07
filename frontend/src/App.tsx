import { useEffect, useState } from "react"
import { supabase } from "./lib/supabase"
import type { User } from "@supabase/supabase-js"

type ReflectionEntry = {
  id: string
  mood: string
  note: string
  reflection: string
  at: string
}

export default function App() {
  const [email, setEmail] = useState("")
  const [submitted, setSubmitted] = useState(false)
  const [mood, setMood] = useState("")
  const [note, setNote] = useState("")
  const [reflection, setReflection] = useState("")
  const [loading, setLoading] = useState(false)
  const [history, setHistory] = useState<ReflectionEntry[]>([])
  const [userId, setUserId] = useState<string>("")

  // Supabase Auth
  const [user, setUser] = useState<User | null>(null)
  const [authLoading, setAuthLoading] = useState(false)
  const [emailForLogin, setEmailForLogin] = useState("")

  // Gestione sessione Supabase
  useEffect(() => {
    const session = supabase.auth.getSession().then(({ data }) => {
      if (data.session) setUser(data.session.user)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  // Login via magic link
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setAuthLoading(true)
    const { error } = await supabase.auth.signInWithOtp({
      email: emailForLogin,
      options: { emailRedirectTo: window.location.origin },
    })
    setAuthLoading(false)
    if (error) alert(error.message)
    else alert("Check your email for the magic login link!")
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
  }

  // userId anonimo (fallback)
  useEffect(() => {
    let stored = localStorage.getItem("myndself-user-id")
    if (!stored) {
      stored = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}`
      localStorage.setItem("myndself-user-id", stored)
    }
    setUserId(stored)
  }, [])

  // Carica storico filtrato
  useEffect(() => {
    if (!userId) return
    async function fetchHistory() {
      try {
        const res = await fetch(
          `${import.meta.env.VITE_API_BASE}/api/mood?user_id=${userId}`
        )
        const data = await res.json()
        if (data?.ok && Array.isArray(data.items)) {
          setHistory(data.items)
        }
      } catch (err) {
        console.error("Failed to fetch mood data:", err)
      }
    }
    fetchHistory()
  }, [userId])

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
      await fetch(`${import.meta.env.VITE_API_BASE}/api/mood`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...newEntry, user_id: user?.id || userId }),
      })

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

      {/* AUTH BLOCK */}
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

      {/* RESTO SEZIONI */}
      {/* ... (Daily Check-In e History restano identici) ... */}

      <footer className="max-w-6xl mx-auto px-6 pb-10 text-sm text-white/60 text-center">
        © {new Date().getFullYear()} MyndSelf.ai — All rights reserved.
      </footer>
    </main>
  )
}
