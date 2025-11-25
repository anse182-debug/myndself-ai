import { useState } from "react"

export function CTAForm({
  compact,
  apiBase = "",
}: {
  compact?: boolean
  apiBase?: string
}) {
  const [email, setEmail] = useState("")
  const [status, setStatus] = useState<"idle" | "ok" | "err" | "loading">(
    "idle"
  )

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setStatus("err")
      return
    }

    try {
      setStatus("loading")
      const res = await fetch(`${apiBase}/api/subscribe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      })

      if (res.ok) {
        setStatus("ok")
        setEmail("")
      } else {
        setStatus("err")
      }
    } catch {
      setStatus("err")
    }
  }

  return (
    <form
      onSubmit={submit}
      className={`flex flex-col sm:flex-row gap-2 sm:items-center ${
        compact ? "" : "mt-2"
      }`}
    >
      <input
        type="email"
        value={email}
        onChange={(e) => {
          setEmail(e.target.value)
          if (status !== "idle") setStatus("idle")
        }}
        placeholder="Inserisci la tua email"
        className="flex-1 rounded-xl bg-gray-900 border border-white/10 px-3 py-2.5 text-sm text-gray-100 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-400/60"
        aria-label="Email"
      />
      <button
        type="submit"
        disabled={status === "loading"}
        className="rounded-xl bg-emerald-400 text-gray-950 text-sm font-medium px-5 py-2.5 hover:bg-emerald-300 transition-colors disabled:opacity-70"
      >
        {status === "loading" ? "Invio…" : "Ottieni accesso anticipato"}
      </button>
      {status === "ok" && (
        <div className="text-emerald-300 text-xs sm:ml-3">
          Grazie! Ti avviseremo quando la beta sarà pronta.
        </div>
      )}
      {status === "err" && (
        <div className="text-red-300 text-xs sm:ml-3">
          Inserisci un&apos;email valida.
        </div>
      )}
    </form>
  )
}
