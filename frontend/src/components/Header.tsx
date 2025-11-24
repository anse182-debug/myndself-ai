// frontend/src/components/Header.tsx
import React from "react"

type HeaderProps = {
  session: { user: { email?: string | null } } | null
  onLoginClick: () => void
  onLogoutClick: () => void
}

export function Header({ session, onLoginClick, onLogoutClick }: HeaderProps) {
  const userEmail = session?.user?.email || ""

  return (
    <header className="w-full border-b border-white/5 bg-surface/80 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        {/* Logo + tagline */}
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10">
            <span className="text-lg">🧠</span>
          </div>
          <div className="flex flex-col">
            <span className="text-base font-semibold tracking-tight text-primary">
              MyndSelf.ai
            </span>
            <span className="text-xs text-muted">
              AI for Emotional Intelligence
            </span>
          </div>
        </div>

        {/* Pulsante login / logout */}
        <div className="flex items-center gap-3">
          {session ? (
            <>
              {userEmail && (
                <span className="hidden text-xs text-muted sm:inline">
                  {userEmail}
                </span>
              )}
              <button
                onClick={onLogoutClick}
                className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-4 py-1.5 text-xs font-medium text-emerald-100 transition hover:bg-emerald-400/20"
              >
                Esci
              </button>
            </>
          ) : (
            <button
              onClick={onLoginClick}
              className="rounded-full bg-primary px-4 py-1.5 text-xs font-medium text-surface shadow-sm transition hover:bg-primary/90"
            >
              Accedi
            </button>
          )}
        </div>
      </div>
    </header>
  )
}
