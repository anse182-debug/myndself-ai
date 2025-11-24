// frontend/src/hooks/useSession.ts

import { useEffect, useState } from "react"
import { createClient, Session } from "@supabase/supabase-js"

// Legge le variabili dal frontend (devono essere già settate su Vercel)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

if (!supabaseUrl || !supabaseAnonKey) {
  // Questo non blocca la build, ma ti avvisa in console se manca la config
  console.warn(
    "[MyndSelf] VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY non sono configurate."
  )
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

type UseSessionResult = {
  session: Session | null
  loading: boolean
}

export function useSession(): UseSessionResult {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let isMounted = true

    // 1) Prende la sessione corrente
    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!isMounted) return
        setSession(data.session ?? null)
        setLoading(false)
      })
      .catch((err) => {
        console.error("useSession getSession error:", err)
        if (isMounted) setLoading(false)
      })

    // 2) Si iscrive ai cambi di stato (login/logout, link magico, ecc.)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      if (!isMounted) return
      setSession(newSession)
    })

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [])

  return { session, loading }
}
