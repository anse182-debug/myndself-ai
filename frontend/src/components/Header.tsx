import React from "react"
import { useSession, supabase } from "../hooks/useSession"
import { showToast } from "../utils/toast"

const Header: React.FC = () => {
  const { session, isLoading } = useSession()

  const handleLogin = async () => {
    const email = window.prompt(
      "Inserisci la tua email per ricevere il link magico di accesso:"
    )
    if (!email) return

    try {
      const { error } = await supabase.auth.signInWithOtp({ email })
      if (error) throw error
      showToast(
        "Link magico inviato! Controlla la tua email per completare l’accesso.",
        "success"
      )
    } catch (err: any) {
      console.error("magic link error:", err)
      showToast(
        "Non sono riuscito a inviare il link magico. Riprova tra poco.",
        "error"
      )
    }
  }

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut()
      showToast("Sei uscito da MyndSelf.ai", "info")
    } catch (err: any) {
      console.error("logout error:", err)
      showToast("Errore durante il logout", "error")
    }
  }

  return (
    <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur">
      <div className="max-w-6xl mx-auto flex items-center justify-between px-4 py-3">
        {/* Logo + tagline */}
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 border border-emerald-500/30">
            <span className="text-lg">🧠</span>
          </div>
          <div className="flex flex-col leading-tight">
            <span className="font-semibold text-emerald-400">MyndSelf.ai</span>
            <span className="text-xs text-slate-400">
              AI for Emotional Intelligence
            </span>
          </div>
        </div>

        {/* Login / Logout */}
        <div className="flex items-center gap-3">
          {!isLoading && !session && (
            <button
              onClick={handleLogin}
              className="rounded-full border border-emerald-500/60 bg-emerald-500/10 px-4 py-1.5 text-sm font-medium text-emerald-100 hover:bg-emerald-500/20 transition-colors"
            >
              Accedi
            </button>
          )}

          {session && (
            <button
              onClick={handleLogout}
              className="rounded-full border border-slate-600 bg-slate-800 px-4 py-1.5 text-sm font-medium text-slate-200 hover:bg-slate-700 transition-colors"
            >
              Esci
            </button>
          )}
        </div>
      </div>
    </header>
  )
}

export default Header
