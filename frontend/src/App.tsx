import { useState } from "react"

export default function App() {
  const [email, setEmail] = useState("")
  const [submitted, setSubmitted] = useState(false)
  const [mood, setMood] = useState("")
  const [note, setNote] = useState("")
  const [reflection, setReflection] = useState("")

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
    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE}/api/reflection`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mood, note }),
      })
      const data = await res.json()
      setReflection(data.reflection || "No response.")
    } catch (err) {
      setReflection("Error connecting to reflection service.")
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
            AI for Emotional Intelligence — helping you reflect, rebalance and grow every day.
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
      <section id="join" className="max-w-3xl mx-auto px-6 py-20 text-center">
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
          <p className="text-emerald-300 mt-4">
            Thank you! You're on the list 💫
          </p>
        )}
      </section>

      {/* DAILY REFLECTION DEMO */}
      <section className="max-w-3xl mx-auto px-6 py-20 text-center">
        <h2 className="text-3xl font-semibold mb-4 text-emerald-300">
          Daily Reflection (Demo)
        </h2>
        <input
          type="text"
          placeholder="Your mood (e.g. calm, stressed)"
          value={mood}
          onChange={(e) => setMood(e.target.value)}
          className="w-full p-3 mb-3 rounded bg-white/10 text-white"
        />
        <textarea
          placeholder="Add a note (optional)"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="w-full p-3 mb-3 rounded bg-white/10 text-white"
        />
        <button
          onClick={handleReflect}
          className="bg-emerald-400 text-gray-900 font-semibold px-5 py-2 rounded-lg hover:bg-emerald-300 transition"
        >
          Reflect
        </button>

        {reflection && (
          <div className="mt-6 bg-white/10 p-4 rounded text-left">
            <strong className="text-emerald-300">AI Reflection:</strong>
            <p className="mt-2 text-emerald-100">{reflection}</p>
          </div>
        )}
      </section>

      <footer className="max-w-6xl mx-auto px-6 pb-10 text-sm text-white/60 text-center">
        © {new Date().getFullYear()} MyndSelf.ai — All rights reserved.
      </footer>
    </main>
  )
}
