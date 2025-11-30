import { useEffect, useMemo, useState } from "react"
import { Onboarding } from "./Onboarding"
import { supabase } from "./lib/supabase"
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts"
import { BarChart, Bar, CartesianGrid, Legend } from "recharts"

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8080"
const ONBOARDING_KEY = "myndself_onboarding_v1_done"

type SummaryEntry = { id?: string; summary: string; created_at: string }
type DailyItem = { day: string; entries: number }
type TagItem = { tag: string; tag_count: number }
type ChatMessage = { role: "user" | "assistant"; content: string }
type Toast = { id: string; message: string; type?: "success" | "error" | "info" }
type GuidedMsg = { role: "user" | "assistant"; content: string }

const MOOD_PRESETS = [
  { label: "Calmo", value: "Calmo / centrato" },
  { label: "Grato", value: "Grato" },
  { label: "Stressato", value: "Stressato" },
  { label: "Stanco", value: "Stanco" },
  { label: "Speranzoso", value: "Speranzoso" },
  { label: "Sovraccarico", value: "Sovraccarico" },
]

const EMOTION_LABELS_IT: Record<string, string> = {
  calm: "calma",
  calmness: "calma",
  stressed: "stress",
  stress: "stress",
  tired: "stanchezza",
  fatigue: "stanchezza",
  hopeful: "speranza",
  hope: "speranza",
  overwhelmed: "sovraccarico",
  anxiety: "ansia",
  anxious: "ansia",
  gratitude: "gratitudine",
  grateful: "gratitudine",
  joy: "gioia",
  happy: "felicità",
  happiness: "felicità",
  sadness: "tristezza",
  sad: "tristezza",
}

function Spinner() {
  return (
    <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
  )
}

type TabId = "oggi" | "insight" | "guidata" | "chat"

export default function App() {
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(false)
  const [session, setSession] = useState<any>(null)
  const BETA_BANNER_KEY = "myndself_beta_banner_dismissed"
  const [showBetaBanner, setShowBetaBanner] = useState(false)

  useEffect(() => {
    if (typeof window === "undefined") return
    const done = window.localStorage.getItem(ONBOARDING_KEY) === "true"
    setHasCompletedOnboarding(done)
  }, [])

    // mostra banner beta solo se utente loggato e non l'ha già chiuso
  useEffect(() => {
    if (!session?.user?.id) return
    if (typeof window === "undefined") return

    const dismissed = window.localStorage.getItem(BETA_BANNER_KEY)
    if (!dismissed) {
      setShowBetaBanner(true)
    }
  }, [session])
  
  const dismissBetaBanner = () => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(BETA_BANNER_KEY, "true")
    }
    setShowBetaBanner(false)
  }




// journaling & insights
  const [mood, setMood] = useState("")
  const [selectedMoods, setSelectedMoods] = useState<string[]>([])
  const [note, setNote] = useState("")
  const [reflection, setReflection] = useState("")
  const [weeklyInsight, setWeeklyInsight] = useState("")
  const [summaryHistory, setSummaryHistory] = useState<SummaryEntry[]>([])
  const [dailyData, setDailyData] = useState<DailyItem[]>([])
  const [tagData, setTagData] = useState<TagItem[]>([])

  // chat libera
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [chatInput, setChatInput] = useState("")
  const [isChatLoading, setIsChatLoading] = useState(false)

  // riflessione guidata
  const [guidedActive, setGuidedActive] = useState(false)
  const [guidedStep, setGuidedStep] = useState<number>(0) // 0 = non iniziata, 1..4
  const [guidedMessages, setGuidedMessages] = useState<GuidedMsg[]>([])
  const [guidedInput, setGuidedInput] = useState("")
  const [guidedLoading, setGuidedLoading] = useState(false)
  const [guidedFinal, setGuidedFinal] = useState(false)

  // loading generici
  const [isReflecting, setIsReflecting] = useState(false)
  const [isSummarizing, setIsSummarizing] = useState(false)

  // emotional profile / banner
  const [emotionalWelcome, setEmotionalWelcome] = useState<string | null>(null)
  const [emotionalFull, setEmotionalFull] = useState<string | null>(null)
  const [emotionalExpanded, setEmotionalExpanded] = useState(false)
  const [emotionalTags, setEmotionalTags] = useState<string[]>([])

  // insights
const [insightsLoading, setInsightsLoading] = useState(false)
const [insightsError, setInsightsError] = useState<string | null>(null)
const [insightsMoodSeries, setInsightsMoodSeries] = useState<
  { date: string; label: string }[]
>([])
const [insightsTopTags, setInsightsTopTags] = useState<
  { tag: string; count: number }[]
>([])
const [mentorInsight, setMentorInsight] = useState<string | null>(null)


  // tab / viste
  const [currentTab, setCurrentTab] = useState<TabId>("oggi")

  // toasts
  const [toasts, setToasts] = useState<Toast[]>([])
  const showToast = (message: string, type: Toast["type"] = "info") => {
    const id = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}`
    setToasts((prev) => [...prev, { id, message, type }])
    setTimeout(
      () => setToasts((prev) => prev.filter((t) => t.id !== id)),
      3500
    )
  }

  // ---------- AUTH ----------
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setSession(data.session)
    })
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => data.subscription.unsubscribe()
  }, [])

  // fetch iniziale dati (solo se loggato)
  useEffect(() => {
    const uid = session?.user?.id
    if (!uid) return

    ;(async () => {
      try {
        const [sumRes, dailyRes, tagRes, chatRes] = await Promise.all([
          fetch(`${API_BASE}/api/summary/history?user_id=${uid}`),
          fetch(`${API_BASE}/api/analytics/daily?user_id=${uid}`),
          fetch(`${API_BASE}/api/analytics/tags?user_id=${uid}`),
          fetch(`${API_BASE}/api/chat/history?user_id=${uid}`),
        ])
        const [sumJson, dailyJson, tagJson, chatJson] = await Promise.all([
          sumRes.json(),
          dailyRes.json(),
          tagRes.json(),
          chatRes.json(),
        ])

        if (sumJson?.ok) setSummaryHistory(sumJson.items || [])
        if (dailyJson?.ok) setDailyData(dailyJson.items || [])
        if (tagJson?.ok) setTagData(tagJson.items || [])
        if (chatJson?.ok && chatJson.items?.length > 0) {
          const last = chatJson.items[0]
          const restored: ChatMessage[] = [
            ...(last.messages || []),
            ...(last.reply ? [{ role: "assistant", content: last.reply }] : []),
          ]
          setChatMessages(restored)
        }
      } catch (e) {
        console.error("init fetch error:", e)
      }
    })()
  }, [session])

  // fetch profilo emotivo (solo se loggato)
  useEffect(() => {
    const uid = session?.user?.id
    if (!uid) return

    ;(async () => {
      try {
        const res = await fetch(
          `${API_BASE}/api/emotional-profile?user_id=${uid}`
        )
        const data = await res.json()

        if (data?.ok && typeof data.profileText === "string") {
          const raw = data.profileText.trim()
          setEmotionalFull(raw)
          setEmotionalExpanded(false)
          setEmotionalTags(Array.isArray(data.topTags) ? data.topTags : [])

          const sentences = raw
            .split(/(?<=[.!?])\s+/)
            .map((s: string) => s.trim())
            .filter((s: string) => s.length > 0)

          if (sentences.length === 0) {
            setEmotionalWelcome(null)
            return
          }

          const clean = (s: string) =>
            s.replace(/^[\-\u2022]*\s*(\d+[\.\)]\s*)?/, "").trim()

          let result = clean(sentences[0])
          if (result.length < 80 && sentences.length > 1) {
            result += " " + clean(sentences[1])
          }

          setEmotionalWelcome(result)
        } else {
          setEmotionalWelcome(null)
          setEmotionalFull(null)
          setEmotionalTags([])
          setEmotionalExpanded(false)
        }
      } catch (err) {
        console.error("welcome emotional-profile error:", err)
        setEmotionalWelcome(null)
        setEmotionalFull(null)
        setEmotionalTags([])
        setEmotionalExpanded(false)
      }
    })()
  }, [session])
useEffect(() => {
    const uid = session?.user?.id
    if (!uid) return
    if (currentTab !== "insight") return

    loadInsights(uid)
  }, [currentTab, session?.user?.id])
  
 const handleLogin = async () => {
  const email = prompt("Inserisci la tua email")
  if (!email) return

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${window.location.origin}/app`
    },
  })

  if (error) {
    showToast(error.message, "error")
  } else {
    showToast("Ti ho mandato un link magico via email ✉️", "success")
  }
}


  const handleLogout = async () => {
    await supabase.auth.signOut()
    setSession(null)
    showToast("Sei uscito dall'account", "info")
  }

  // ---------- RIFLESSIONE DEL GIORNO ----------
  const handleReflection = async () => {
    const uid = session?.user?.id
    if (!uid) return showToast("Accedi prima per salvare le riflessioni", "error")
    if (!mood && !note)
      return showToast("Scrivi almeno come ti senti o una breve nota 💭", "error")

    setIsReflecting(true)
    setReflection("")
    try {
      const res = await fetch(`${API_BASE}/api/reflection`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: uid, mood, note }),
      })
      const data = await res.json()
      setReflection(data.reflection || "")
      showToast("Riflessione salvata ✅", "success")

      const dailyRes = await fetch(
        `${API_BASE}/api/analytics/daily?user_id=${uid}`
      )
      const dailyJson = await dailyRes.json()
      if (dailyJson?.ok) setDailyData(dailyJson.items || [])

     setMood("")
     setSelectedMoods([])
     setNote("")

    } catch (e) {
      console.error("reflection error:", e)
      showToast("Errore durante la riflessione", "error")
    } finally {
      setIsReflecting(false)
    }
  }

  // ---------- SINTESI DELLA SETTIMANA ----------
  const handleSummary = async () => {
    const uid = session?.user?.id
    if (!uid)
      return showToast("Accedi prima per generare una sintesi", "error")
    setIsSummarizing(true)
    try {
      const res = await fetch(
        `${API_BASE}/api/summary?user_id=${uid}&save=true`
      )
      const data = await res.json()
      setWeeklyInsight(data.summary || "")
      showToast("Sintesi salvata ✅", "success")

      const sumRes = await fetch(
        `${API_BASE}/api/summary/history?user_id=${uid}`
      )
      const sumJson = await sumRes.json()
      if (sumJson?.ok) setSummaryHistory(sumJson.items || [])
    } catch (e) {
      console.error("summary error:", e)
      showToast("Errore durante la sintesi", "error")
    } finally {
      setIsSummarizing(false)
    }
  }

  // ---------- CHAT RIFLESSIVA ----------
  const handleChatSend = async () => {
    const uid = session?.user?.id
    if (!uid)
      return showToast("Accedi prima per usare la chat riflessiva", "error")
    if (!chatInput.trim()) return

    const newMessages = [...chatMessages, { role: "user", content: chatInput }]
    setChatMessages(newMessages)
    setChatInput("")
    setIsChatLoading(true)
    try {
      const res = await fetch(`${API_BASE}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: uid, messages: newMessages }),
      })
      const data = await res.json()
      if (data.reply) {
        setChatMessages([
          ...newMessages,
          { role: "assistant", content: data.reply },
        ])
      }
    } catch (e) {
      console.error("chat error:", e)
      showToast("Errore nella chat riflessiva", "error")
    } finally {
      setIsChatLoading(false)
    }
  }

  // ---------- RIFLESSIONE GUIDATA ----------
  async function startGuidedSession() {
    const uid = session?.user?.id
    if (!uid)
      return showToast("Accedi prima per avviare una riflessione guidata", "error")

    setGuidedActive(true)
    setGuidedFinal(false)
    setGuidedStep(1)
    setGuidedMessages([
      {
        role: "assistant",
        content:
          "Ti va di fare una breve riflessione insieme? In poche parole, cosa sta succedendo dentro di te adesso?",
      },
    ])
  }

  async function sendGuidedTurn() {
    const uid = session?.user?.id
    if (!uid)
      return showToast("Accedi prima per continuare la riflessione guidata", "error")

    if (!guidedActive) return startGuidedSession()
    if (!guidedInput.trim() && guidedStep > 0 && !guidedFinal) {
      return showToast("Scrivi una breve risposta per continuare 💭", "info")
    }

    let msgs = guidedMessages
    if (guidedInput.trim()) {
      msgs = [...guidedMessages, { role: "user", content: guidedInput.trim() }]
      setGuidedMessages(msgs)
      setGuidedInput("")
    }

    setGuidedLoading(true)
    try {
      const res = await fetch(`${API_BASE}/api/guided-reflection`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: uid, messages: msgs, step: guidedStep || 1 }),
      })
      const data = await res.json()
      const reply =
        data?.reply ||
        "Grazie per aver condiviso. Restiamo un momento con quello che stai sentendo."
      const isFinal = Boolean(data?.isFinal)

      setGuidedMessages((prev) => [
        ...prev,
        { role: "assistant", content: reply },
      ])
      setGuidedFinal(isFinal)
      setGuidedStep((prev) => (isFinal ? 4 : Math.min(4, (prev || 1) + 1)))

      if (isFinal) {
        showToast("Riflessione guidata salvata tra le sintesi ✅", "success")
        try {
          const sumRes = await fetch(
            `${API_BASE}/api/summary/history?user_id=${uid}`
          )
          const sumJson = await sumRes.json()
          if (sumJson?.ok) setSummaryHistory(sumJson.items || [])
        } catch (e) {
          console.error("refresh insights error:", e)
        }
      }
    } catch (e) {
      console.error("guided error:", e)
      showToast("Errore nella riflessione guidata", "error")
    } finally {
      setGuidedLoading(false)
    }
  }

  function resetGuided() {
    setGuidedActive(false)
    setGuidedFinal(false)
    setGuidedStep(0)
    setGuidedMessages([])
    setGuidedInput("")
  }

  async function loadInsights(userId: string) {
  try {
    setInsightsLoading(true)
    setInsightsError(null)

  // 1) dati ultimi 30 giorni da Supabase
    // 1) dati ultimi 7 giorni da Supabase
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6)

    const { data, error } = await supabase
      .from("mood_entries")
      .select("mood, tags, at")
      .eq("user_id", userId)
      .gte("at", sevenDaysAgo.toISOString())
      .order("at", { ascending: true })

    const entries = data || []

    // se non ci sono proprio dati → schermata “vuota”
    if (!entries.length) {
      setInsightsMoodSeries([])
      setInsightsTopTags([])
      setMentorInsight(null)
      setInsightsLoading(false)
      return
    }


    // 1a) serie giornaliera (semplificata: prendiamo il primo mood del giorno)
    const byDay = new Map<string, string>()
    for (const e of entries) {
      const d = new Date(e.at)
      const key = d.toISOString().slice(0, 10) // YYYY-MM-DD
      if (!byDay.has(key)) {
        byDay.set(key, e.mood || "")
      }
    }
    const moodSeries = Array.from(byDay.entries()).map(([date, label]) => ({
      date,
      label,
    }))
    setInsightsMoodSeries(moodSeries)

    // 1b) tag cloud – contiamo i tag
    const tagCount = new Map<string, number>()
    for (const e of entries) {
      if (Array.isArray(e.tags)) {
        for (const t of e.tags) {
          const key = String(t).toLowerCase()
          tagCount.set(key, (tagCount.get(key) || 0) + 1)
        }
      }
    }

    const topTags = Array.from(tagCount.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([tag, count]) => ({ tag, count }))

    setInsightsTopTags(topTags)

    // 2) insight del Mentor → /api/summary (riassunto settimanale)
        // 2) insight del Mentor → /api/summary (riassunto recente)
    const res = await fetch(
      `${API_BASE}/api/summary?user_id=${encodeURIComponent(userId)}`
    )

    if (res.ok) {
      const json = await res.json()
      const text = json.summary || json.text || null
      setMentorInsight(text)
    } else {
      setMentorInsight(null)
    }


    setInsightsLoading(false)
  } catch (err: any) {
    console.error("loadInsights error", err)
    setInsightsError("Non sono riuscito a caricare gli insight.")
    setInsightsLoading(false)
  }
}


  // ---------- CHART DATA ----------
  const chartData = useMemo(
    () => (dailyData || []).map((d) => ({ day: d.day, entries: d.entries })),
    [dailyData]
  )

  // ---------- COMPONENTI UI INTERNI ----------

  const EmotionalBanner = () =>
    emotionalWelcome ? (
      <div className="w-full max-w-6xl mx-auto px-4 sm:px-6">
        <div className="mb-4 bg-gradient-to-r from-emerald-500/15 via-emerald-400/10 to-cyan-500/10 border border-emerald-400/40 rounded-2xl px-4 py-3 flex items-start gap-3 text-xs sm:text-sm text-emerald-50 shadow-[0_0_40px_rgba(16,185,129,0.15)]">
          <div className="mt-0.5 flex-shrink-0">
            <div className="w-7 h-7 rounded-full bg-emerald-500/20 flex items-center justify-center border border-emerald-400/40">
              <span className="text-emerald-200 text-sm">🪷</span>
            </div>
          </div>
          <div className="flex-1">
            <span className="font-semibold mr-1">Nota emotiva:</span>
            <span className="align-middle">
              {emotionalExpanded && emotionalFull
                ? emotionalFull
                : emotionalWelcome}
            </span>
            {emotionalTags.length > 0 && (
              <div className="mt-1 flex flex-wrap gap-1.5">
                {emotionalTags.map((tag, idx) => {
                  const key = tag.toLowerCase().trim()
                  const label = EMOTION_LABELS_IT[key] || tag
                  return (
                    <span
                      key={idx}
                      className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-400/40 text-emerald-100"
                    >
                      {label}
                    </span>
                  )
                })}
              </div>
            )}
          </div>
          {emotionalFull && emotionalFull !== emotionalWelcome && (
            <button
              onClick={() => setEmotionalExpanded((prev) => !prev)}
              className="ml-3 text-[11px] sm:text-xs px-2 py-1 rounded-full border border-emerald-300/60 bg-emerald-500/10 hover:bg-emerald-500/20 whitespace-nowrap"
            >
              {emotionalExpanded ? "Mostra meno" : "Mostra di più"}
            </button>
          )}
        </div>
      </div>
    ) : null

  const TabsNav = () => {
    const tabs: { id: TabId; label: string }[] = [
      { id: "oggi", label: "Oggi" },
      { id: "insight", label: "Insight" },
      { id: "guidata", label: "Guidata" },
      { id: "chat", label: "Chat" },
    ]
    // ---------- RENDER ----------
    return (
      <nav className="w-full max-w-6xl mx-auto px-4 sm:px-6 mb-3">
        <div className="flex justify-between sm:justify-start sm:gap-2 bg-gray-900/70 border border-white/5 rounded-full p-1">
          {tabs.map((t) => {
            const active = currentTab === t.id
            return (
              <button
                key={t.id}
                onClick={() => setCurrentTab(t.id)}
                className={`flex-1 sm:flex-none px-3 sm:px-4 py-1.5 rounded-full text-xs sm:text-sm transition ${
                  active
                    ? "bg-emerald-400 text-gray-950 font-semibold"
                    : "text-gray-300 hover:bg-white/5"
                }`}
              >
                {t.label}
              </button>
            )
          })}
        </div>
      </nav>
    )
  }

  function formatDateLabel(iso: string) {
  const d = new Date(iso)
  return d
    .toLocaleDateString("it-IT", {
      day: "2-digit",
      month: "2-digit",
    })
    .replace("/", "-") // es: 07-11
}

type InsightsTabProps = {
  loading: boolean
  error: string | null
  moodSeries: { date: string; label: string }[]
  topTags: { tag: string; count: number }[]
  mentorInsight: string | null
  onStartReflection: () => void
}

const InsightsTab: React.FC<InsightsTabProps> = ({
  loading,
  error,
  moodSeries,
  topTags,
  mentorInsight,
  onStartReflection,
}) => {
  if (loading) {
    return (
      <div className="py-8 text-sm text-gray-400">
        Sto preparando i tuoi insight…
      </div>
    )
  }

  if (error) {
    return (
      <div className="py-8 text-sm text-red-300">
        {error}
      </div>
    )
  }

  // stato "non ancora abbastanza dati"
   if (!moodSeries.length) {
    return (
      <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-4 text-sm text-gray-300">
        <p>
          Per vedere i tuoi insight serve almeno{" "}
          <span className="font-semibold">una riflessione</span>.
        </p>
        <button
          onClick={onStartReflection}
          className="inline-flex items-center px-4 py-2 rounded-xl bg-emerald-400 text-gray-950 text-sm font-medium hover:bg-emerald-300 transition-colors"
        >
          Inizia una riflessione
        </button>
      </div>
    )
  }


  return (
    <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold mb-1">
          I tuoi ultimi 7 giorni
        </h2>
        <p className="text-xs text-gray-400">
          Uno sguardo leggero su come ti sei mosso emotivamente di recente.
        </p>
      </div>

      {/* Mood trend */}
     <section className="space-y-3">
  <h3 className="text-sm font-semibold">
    Come ti sei sentito negli ultimi giorni
  </h3>

  <div className="w-full overflow-x-auto">
    <div className="flex items-end gap-2 text-xs pb-1">
      {moodSeries.map((d) => (
        <div key={d.date} className="flex flex-col items-center gap-1">
          <span className="inline-flex items-center justify-center px-3 py-1 rounded-full bg-white/5 border border-white/10 whitespace-nowrap">
            {d.label || "—"}
          </span>
          <span className="text-[10px] text-gray-500">
            {formatDateLabel(d.date)}
          </span>
        </div>
      ))}
    </div>
  </div>

  <p className="text-xs text-gray-400">
    Le etichette sono come le hai scritte tu: non devono essere perfette,
    servono solo a non perdere di vista come ti sei sentito.
  </p>
</section>


      {/* Tag cloud */}
      {topTags.length > 0 && (
      <section className="space-y-3">
  <h3 className="text-sm font-semibold">
    Le emozioni che hai nominato più spesso
  </h3>

  <div className="w-full overflow-x-auto">
    <div className="flex flex-wrap gap-2 pb-1">
      {topTags.map((t, idx) => (
        <span
          key={t.tag}
          className={`inline-flex items-center justify-center rounded-full border px-3 py-1 text-xs ${
            idx === 0
              ? "bg-emerald-400/20 border-emerald-300/40 text-emerald-100"
              : "bg-white/5 border-white/10 text-gray-200"
          }`}
        >
          {t.tag}
        </span>
      ))}
    </div>
  </div>

  <p className="text-xs text-gray-400">
    Queste parole mostrano cosa sta occupando più spesso il tuo spazio
    emotivo in questo periodo.
  </p>
</section>
      )}

      {/* Mentor insight */}
      <section className="space-y-3">
        <h3 className="text-sm font-semibold">
          Uno sguardo del Mentor
        </h3>
        <div className="rounded-2xl border border-emerald-400/30 bg-emerald-400/5 p-4 text-sm text-gray-100">
          {mentorInsight ? (
            <p>{mentorInsight}</p>
          ) : (
            <p className="text-gray-300">
              Appena avrà un po&apos; più di storia alle spalle, il Mentor ti
              restituirà qui una breve sintesi dei pattern che emergono.
            </p>
          )}
        </div>
        <button
          onClick={onStartReflection}
          className="inline-flex items-center text-xs text-emerald-300 hover:text-emerald-200"
        >
          Riflettiamo insieme ora →
        </button>
      </section>
    </div>
  )
}

  // ---------- RENDER ----------
    // se non ha completato l'onboarding, mostra solo quello
  if (!hasCompletedOnboarding) {
    return (
      <Onboarding
        onFinish={() => {
          if (typeof window !== "undefined") {
            window.localStorage.setItem(ONBOARDING_KEY, "true")
          }
          setHasCompletedOnboarding(true)
        }}
      />
    )
  }

  return (
    <main className="min-h-screen bg-gray-950 text-gray-50">
    

      {/* TOASTS - spostati IN BASSO A DESTRA */}
      <div className="fixed bottom-4 right-4 z-50 space-y-2 w-[calc(100%-2rem)] sm:w-80">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`px-4 py-3 rounded-lg text-sm border ${
              t.type === "error"
                ? "bg-red-500/10 border-red-400/40 text-red-100"
                : t.type === "success"
                ? "bg-emerald-500/10 border-emerald-400/40 text-emerald-50"
                : "bg-white/10 border-white/20 text-white"
            }`}
          >
            {t.message}
          </div>
        ))}
      </div>

      {/* HEADER */}
      <header className="w-full max-w-6xl mx-auto px-4 sm:px-6 py-5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <img src="/logo.svg" alt="MyndSelf.ai" className="h-9" />
          <div>
            <h1 className="text-lg font-semibold text-emerald-200">
              MyndSelf.ai
            </h1>
            <p className="text-xs text-gray-400">
              Intelligenza emotiva supportata dall'AI
            </p>
          </div>
        </div>
        {session ? (
          <button
            onClick={handleLogout}
            className="text-sm bg-emerald-500/10 border border-emerald-400/40 rounded px-3 py-1.5 hover:bg-emerald-500/20 transition"
          >
            Esci
          </button>
        ) : (
          <button
            onClick={handleLogin}
            className="text-sm bg-emerald-400 text-gray-950 rounded px-3 py-1.5 hover:bg-emerald-300 transition"
          >
            Accedi
          </button>
        )}
      </header>

      {/* SE L’UTENTE NON È LOGGATO → HERO / CTA */}
      {!session && (
        <>
          <section className="w-full max-w-6xl mx-auto px-4 sm:px-6 mt-4 pb-16">
            <div className="bg-gray-900/70 border border-white/5 rounded-2xl p-6 sm:p-8 flex flex-col md:flex-row items-center gap-6">
              <div className="flex-1">
                <h2 className="text-2xl sm:text-3xl font-semibold text-emerald-200 mb-3">
                  Un luogo gentile per guardare le tue emozioni
                </h2>
                <p className="text-sm text-gray-300 mb-4">
                  MyndSelf ti aiuta a registrare come stai, vedere i tuoi pattern
                  emotivi e parlare con un’AI allenata sulla cura di sé, senza
                  giudizio.
                </p>
                <ul className="text-xs text-gray-400 space-y-1.5 mb-5">
                  <li>• Riflessioni quotidiane guidate dall’AI</li>
                  <li>• Sintesi settimanali del tuo stato emotivo</li>
                  <li>• Grafici e insight per riconoscere i tuoi pattern</li>
                  <li>• Chat riflessiva quando senti il bisogno di parlarne</li>
                </ul>
                <button
                  onClick={handleLogin}
                  className="inline-flex items-center justify-center bg-emerald-400 text-gray-950 px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-emerald-300"
                >
                  Inizia con la tua email
                </button>
              </div>
              <div className="flex-1 flex items-center justify-center">
                <div className="w-40 h-40 sm:w-48 sm:h-48 rounded-full bg-emerald-500/10 border border-emerald-400/40 flex items-center justify-center shadow-[0_0_60px_rgba(16,185,129,0.25)]">
                  <span className="text-5xl">🧠</span>
                </div>
              </div>
            </div>
          </section>

          <footer className="w-full max-w-6xl mx-auto px-4 sm:px-6 pb-10 text-xs text-gray-500 text-center">
            © {new Date().getFullYear()} MyndSelf.ai — Uno spazio sicuro per le tue
            emozioni
          </footer>
        </>
      )}

    {/* SE LOGGATO → TABS + CONTENUTO */}
      {session && (
        <>
          <TabsNav />

          {currentTab === "oggi" && (
            <>
              {showBetaBanner && (
                <div className="w-full max-w-3xl mx-auto px-4 sm:px-6 mb-4">
                  <div className="rounded-2xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-3 text-xs sm:text-sm text-emerald-50 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                    <div>
                      <p className="font-semibold mb-1">
                        Stai usando la beta privata di MyndSelf.ai 🌿
                      </p>
                      <p className="text-emerald-100/90">
                        Alcune parti sono ancora in evoluzione. Se qualcosa non ti è chiaro
                        o non funziona come ti aspetti, puoi scrivermi a{" "}
                        <span className="font-mono underline">
                          info@myndself.ai
                        </span>
                        . Il tuo feedback è oro.
                      </p>
                    </div>
                    <button
                      onClick={dismissBetaBanner}
                      className="self-end sm:self-start text-[11px] sm:text-xs text-emerald-100/80 hover:text-emerald-50"
                    >
                      Ho capito
                    </button>
                  </div>
                </div>
              )}

              <EmotionalBanner />

              <section className="w-full max-w-6xl mx-auto px-4 sm:px-6 mt-2">
                <div className="bg-gray-900/60 border border-white/5 rounded-2xl p-5">
                  <h2 className="text-xl font-semibold text-emerald-200 mb-3">
                    Riflessione del giorno
                  </h2>
                  <p className="text-xs text-gray-400 mb-3">
                    Usala a fine giornata per decomprimere, chiarire cosa senti e
                    lasciare andare ciò che pesa.
                  </p>

                  <div className="flex flex-wrap gap-2 mb-3">
                    {MOOD_PRESETS.map((m) => {
                      const isActive = selectedMoods.includes(m.value)
                      return (
                        <button
                          key={m.label}
                          onClick={() => {
                            setSelectedMoods((prev) => {
                              let next: string[]
                              if (prev.includes(m.value)) {
                                next = prev.filter((v) => v !== m.value)
                              } else {
                                next = [...prev, m.value]
                              }
                              setMood(next.join(", "))
                              return next
                            })
                          }}
                          className={`px-3 py-1.5 rounded-full text-xs border transition ${
                            isActive
                              ? "bg-emerald-400 text-gray-950 border-emerald-400"
                              : "bg-white/0 border-white/10 text-white/70 hover:bg-white/5"
                          }`}
                        >
                          {m.label}
                        </button>
                      )
                    })}
                  </div>

                  <input
                    value={mood}
                    onChange={(e) => {
                      setMood(e.target.value)
                      setSelectedMoods([]) // se scrive a mano, le chips si deselezionano
                    }}
                    placeholder="Come ti senti oggi?"
                    className="w-full bg-white/5 rounded-lg px-3 py-2 mb-3 text-sm outline-none focus:ring-1 focus:ring-emerald-400/50"
                  />

                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Vuoi aggiungere una nota su ciò che è successo o su come ti senti?"
                    className="w-full bg-white/5 rounded-lg px-3 py-2 mb-3 text-sm min-h-[110px] outline-none focus:ring-1 focus:ring-emerald-400/50"
                  />

                  <button
                    onClick={handleReflection}
                    disabled={isReflecting}
                    className="bg-emerald-400 text-gray-950 px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 disabled:opacity-50"
                  >
                    {isReflecting && <Spinner />}
                    {isReflecting ? "Sto riflettendo..." : "Registra la riflessione"}
                  </button>

                  {reflection && (
                    <div className="mt-4 bg-white/5 rounded-lg p-3 text-sm text-emerald-50 whitespace-pre-wrap fade-in">
                      {reflection}
                    </div>
                  )}
                </div>
              </section>
            </>
          )}

          {currentTab === "insight" && (
            <InsightsTab
              loading={insightsLoading}
              error={insightsError}
              moodSeries={insightsMoodSeries}
              topTags={insightsTopTags}
              mentorInsight={mentorInsight}
              onStartReflection={() => setCurrentTab("oggi")}
            />
          )}


          {currentTab === "guidata" && (
            <section className="w-full max-w-6xl mx-auto px-4 sm:px-6 mt-4 pb-16">
              <div className="bg-gray-900/60 border border-white/5 rounded-2xl p-5 flex flex-col gap-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-sm font-semibold text-emerald-200">
                      Riflessione guidata
                    </h2>
                    <p className="text-xs text-gray-400">
                      Un percorso breve di 3–4 domande per vedere meglio ciò che stai
                      vivendo.
                    </p>
                    {guidedActive && (
                      <p className="text-[10px] text-gray-500 mt-1">
                        Passo {guidedStep > 0 ? guidedStep : 1}/4
                      </p>
                    )}
                  </div>
                  {guidedActive ? (
                    <button
                      onClick={resetGuided}
                      className="text-xs bg-white/10 border border-white/20 rounded px-3 py-1.5 hover:bg-white/15"
                    >
                      Reset
                    </button>
                  ) : null}
                </div>

                {!guidedActive ? (
                  <button
                    onClick={startGuidedSession}
                    className="self-start bg-emerald-400 text-gray-950 px-4 py-2 rounded-lg text-sm font-semibold"
                  >
                    Avvia percorso guidato
                  </button>
                ) : (
                  <>
                    <div className="min-h-[180px] max-h-[320px] overflow-y-auto space-y-3 bg-white/5 rounded-lg p-3">
                      {guidedMessages.length === 0 ? (
                        <p className="text-xs text-gray-500">
                          Avvia il percorso per iniziare una riflessione passo-passo.
                        </p>
                      ) : (
                        guidedMessages.map((m, idx) => (
                          <div
                            key={idx}
                            className={`max-w-[90%] sm:max-w-[70%] px-3 py-2 rounded-lg text-sm whitespace-pre-wrap ${
                              m.role === "user"
                                ? "bg-emerald-500/20 text-emerald-50 ml-auto"
                                : "bg-white/5 text-white/90 fade-in"
                            }`}
                          >
                            {m.content}
                          </div>
                        ))
                      )}
                      {guidedLoading && (
                        <p className="text-xs text-gray-400 italic animate-pulse">
                          Sto riflettendo con te per un momento...
                        </p>
                      )}
                    </div>

                    {!guidedFinal ? (
                      <div className="flex flex-col sm:flex-row gap-2">
                        <input
                          value={guidedInput}
                          onChange={(e) => setGuidedInput(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && sendGuidedTurn()}
                          placeholder="Scrivi cosa emerge adesso…"
                          className="flex-1 bg-white/5 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-emerald-400/50"
                        />
                        <button
                          onClick={sendGuidedTurn}
                          disabled={guidedLoading}
                          className="bg-emerald-400 text-gray-950 px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-50"
                        >
                          {guidedStep === 0
                            ? "Avvia"
                            : `Avanti (${guidedStep}/4)`}
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs text-emerald-200">
                          Sessione conclusa con gentilezza. Se vuoi, puoi ripartire
                          quando senti che ti serve.
                        </p>
                        <button
                          onClick={resetGuided}
                          className="text-xs bg-white/10 border border-white/20 rounded px-3 py-1.5 hover:bg-white/15"
                        >
                          Nuova sessione
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            </section>
          )}

          {currentTab === "chat" && (
            <section className="w-full max-w-6xl mx-auto px-4 sm:px-6 mt-4 pb-16">
              <div className="bg-gray-900/60 border border-white/5 rounded-2xl p-5 flex flex-col gap-4 min-h-[320px]">
                <h2 className="text-sm font-semibold text-emerald-200">
                  Chat riflessiva
                </h2>
                <p className="text-xs text-gray-400">
                  Quando senti il bisogno di parlarne subito, anche solo per mettere
                  ordine tra i pensieri.
                </p>
                <div className="flex-1 overflow-y-auto space-y-3">
                  {chatMessages.length === 0 ? (
                    <p className="text-xs text-gray-500">
                      Puoi iniziare scrivendo una preoccupazione, un pensiero
                      ricorrente o un piccolo momento positivo della tua giornata.
                    </p>
                  ) : (
                    chatMessages.map((m, idx) => (
                      <div
                        key={idx}
                        className={`max-w-[90%] sm:max-w-[70%] px-3 py-2 rounded-lg text-sm whitespace-pre-wrap ${
                          m.role === "user"
                            ? "bg-emerald-500/20 text-emerald-50 ml-auto"
                            : "bg-white/5 text-white/90 fade-in"
                        }`}
                      >
                        {m.content}
                      </div>
                    ))
                  )}
                  {isChatLoading && (
                    <p className="text-xs text-gray-500 italic">
                      Sto pensando a come risponderti…
                    </p>
                  )}
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleChatSend()}
                    placeholder="Scrivi cosa senti in questo momento…"
                    className="flex-1 bg-white/5 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-emerald-400/50"
                  />
                  <button
                    onClick={handleChatSend}
                    disabled={isChatLoading}
                    className="bg-emerald-400 text-gray-950 px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 disabled:opacity-50"
                  >
                    {isChatLoading && <Spinner />}
                    Invia
                  </button>
                </div>
              </div>
            </section>
          )}

          <footer className="w-full max-w-6xl mx-auto px-4 sm:px-6 pb-10 text-xs text-gray-500 text-center">
            © {new Date().getFullYear()} MyndSelf.ai — Uno spazio sicuro per le
            tue emozioni
          </footer>
          </>
      )}
    </main>
  )
}
