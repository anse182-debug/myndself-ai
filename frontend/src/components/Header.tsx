import React from "react"
import useSession from "../hooks/useSession"
import { showToast } from "../utils/toast"

const Header: React.FC = () => {
  const { session, isLoading, signInWithEmail, signOut } = useSession()

  const handleLoginClick = async () => {
    const email = window.prompt(
      "Inserisci la tua email per ricevere il link magico:"
    )
    if (!email) return

    try {
      await signInWithEmail(email.trim())
      showToast(
        "Ti ho inviato un link magico. Controlla la tua casella email 📩",
        "success"
      )
    } catch (err) {
      console.error("login error:", err)
      showToast(
        "Errore durante l'invio del link magico. Riprova tra poco.",
        "error"
      )
    }
  }

  const handleLogoutClick = async () => {
    try {
      await signOut()
      showToast("Sei uscito da MyndSelf.ai", "info")
    } catch (err) {
      console.error("logout error:", err)
      showToast("Errore durante il logout. Riprova.", "error")
    }
  }

  return (
    <header className="border-b border-slate-800/80 bg-slate-950/80 backdrop-blur">
      <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
        {/* Logo + tagline */}
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-emerald-500/10 border border-emerald-400/40 flex items-center justify-center">
            <span className="text-emerald-300 text-lg font-semibold">🧠</span>
          </div>
          <div className="flex flex-col leading-tight">
            <span className="font-semibold text-slate-50">MyndSelf.ai</span>
            <span className="text-xs text-slate-400">
              AI for Emotional Intelligence
            </span>
          </div>
        </div>

        {/* Pulsante login / logout */}
        <div className="flex items-center gap-3">
          {!isLoading &&
            (session ? (
              <button
                onClick={handleLogoutClick}
                className="text-sm px-4 py-1.5 rounded-full border border-slate-700/80 hover:border-slate-500 hover:bg-slate-900 transition"
              >
                Esci
              </button>
            ) : (
              <button
                onClick={handleLoginClick}
                className="text-sm px-4 py-1.5 rounded-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-medium transition"
              >
                Accedi
              </button>
            ))}
        </div>
      </div>
    </header>
  )
}

export default Header
