import { BrowserRouter, Routes, Route } from "react-router-dom";
import Landing from "./Landing";
import Onboarding from "./Onboarding";
import TermsPage from "./Terms";
import PrivacyPage from "./Privacy";
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
const MAX_GUIDED_TURNS = 3 // numero massimo di messaggi del Mentor in una riflessione guidata

// 🎨 Colori per emozioni specifiche (pill, tag, ecc.)
const EMOTION_COLORS: Record<string, string> = {
  // macro stati (prima riga "come ti senti, a grandi linee?")
  calmo: "#74D8FF",
  grato: "#59E7B3",
  contento: "#66E0C2",
  entusiasta: "#2EEB80",
  stressato: "#4C66E6",
  stanco: "#6C6C6C",
  sovraccarico: "#FF4FCC",
  ansioso: "#4C66E6",
  triste: "#4A4A4A",
  arrabbiato: "#FF5454",
  frustrato: "#FF7A5A",
  confuso: "#7D7FFF",
  annoiato: "#A0A0A0",

  // dettaglio "scegli qualche parola che descrive questo momento"
  rabbia: "#FF5454",
  frustrazione: "#FF7A5A",
  impazienza: "#FF9D4D",
  agitazione: "#FF6F8D",
  determinazione: "#3CD45A",
  motivazione: "#4CEB66",
  entusiasmo: "#2EEB80",
  apatia: "#8A8A8A",
  "stanchezza mentale": "#6C6C6C",
  "stanchezza fisica": "#5E5E5E",
  noia: "#A0A0A0",
  "ansia a bassa intensità": "#7993FF",
  "ansia forte": "#4C66E6",
  "senso di colpa": "#9C5AC8",
  "ansia bassa intensità": "#7993FF", // nel caso usi questa variante
  confusione: "#7D7FFF",
  sovraccarico: "#FF4FCC",
  serenità: "#74D8FF",
  apprezzamento: "#66E0C2",
  gratitudine: "#59E7B3",
  speranza: "#8FF29F",
  fiducia: "#52C5D8",
  curiosità: "#63D6E1",
  vicinanza: "#5CBFE6",
  vuoto: "#4A4A4A",
  solitudine: "#705C99",
}

// 🎨 Colori per i "bucket" del calendario (calma / gioia / tristezza / rabbia / ansia / nessuna)
const BUCKET_COLORS: Record<string, string> = {
  calma: "#74D8FF",      // azzurro calma
  gioia: "#2EEB80",      // verde gioia/espansione
  tristezza: "#4A4A4A",  // grigio profondo
  rabbia: "#FF5454",     // rosso
  ansia: "#4C66E6",      // blu profondo
  nessuna: "#343434",    // neutro
}


type SummaryEntry = { id?: string; summary: string; created_at: string }
type DailyItem = { day: string; entries: number }
type TagItem = { tag: string; tag_count: number }
type ChatMessage = { role: "user" | "assistant"; content: string }
type Toast = { id: string; message: string; type?: "success" | "error" | "info" }
type GuidedMsg = { role: "user" | "assistant"; content: string }
type CalendarDay = {
  day: string
  dominantMood: string | null
  entriesCount: number
  moodsCount: Record<string, number>
  tags: string[]
  // aggiunte per il pannellino di dettaglio
  mood?: string | null
  detail?: string | null
}


type MoodCalendarProps = {
  days: CalendarDay[]
  monthOffset: number
  onChangeMonth: (offset: number) => void
  onSelectDay: (day: CalendarDay | null) => void
}

// Colori delle celle del calendario allineati alla legenda BUCKET_COLORS
const moodToColor = (mood: string | null): string => {
  switch ((mood || "").toLowerCase()) {
    case "calma":
    case "calm":
      // calma / serenità → azzurro
      return "bg-sky-300"
    case "gioia":
    case "joy":
      // gioia / apertura → verde
      return "bg-emerald-400"
    case "tristezza":
    case "sadness":
      // tristezza / pesantezza → grigio scuro
      return "bg-neutral-700"
    case "rabbia":
    case "anger":
      // rabbia / frustrazione → rosso
      return "bg-rose-400"
    case "ansia":
    case "anxiety":
      // ansia / tensione → blu profondo
      return "bg-indigo-500"
    default:
      // nessuna riflessione / neutro
      return "bg-gray-800/60"
  }
}

const MoodCalendar: React.FC<MoodCalendarProps> = ({
  days,
  monthOffset,
  onChangeMonth,
  onSelectDay,
}) => {
  // calcoliamo il mese da mostrare
  const base = new Date()
  base.setMonth(base.getMonth() + monthOffset)
  const year = base.getFullYear()
  const month = base.getMonth()

  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)

  const firstWeekday = firstDay.getDay() // 0 = Sunday
  const daysInMonth = lastDay.getDate()

  // mappa date -> CalendarDay
  const map = new Map<string, CalendarDay>()
  for (const d of days) {
    map.set(d.day, d)
  }

  const cells: (CalendarDay | null)[] = []
  // offset per iniziare dal lunedì (0=lunedì, 6=domenica)
  const offset = (firstWeekday + 6) % 7
  for (let i = 0; i < offset; i++) {
    cells.push(null)
  }
  for (let dayNum = 1; dayNum <= daysInMonth; dayNum++) {
    const dateStr = new Date(year, month, dayNum).toISOString().slice(0, 10)
    cells.push(map.get(dateStr) || {
      day: dateStr,
      dominantMood: null,
      entriesCount: 0,
      moodsCount: {},
      tags: [],
    })
  }

  const monthLabel = base.toLocaleDateString("it-IT", {
    month: "long",
    year: "numeric",
  })

  const weekdayLabels = ["D", "L", "M", "M", "G", "V", "S"]

  return (
    <div className="space-y-3">
      {/* Header mese */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => onChangeMonth(monthOffset - 1)}
          className="text-xs text-emerald-300 hover:text-emerald-200"
        >
          ← mese prec.
        </button>
        <div className="text-xs font-medium text-gray-200 uppercase tracking-wide">
          {monthLabel}
        </div>
        <button
          type="button"
          onClick={() => onChangeMonth(monthOffset + 1)}
          className="text-xs text-emerald-300 hover:text-emerald-200"
        >
          mese succ. →
        </button>
      </div>

      {/* Intestazione giorni settimana */}
      <div className="grid grid-cols-7 gap-1 text-[10px] text-gray-500">
        {weekdayLabels.map((d) => (
          <div key={d} className="text-center">
            {d}
          </div>
        ))}
      </div>

      {/* Celle calendario */}
      <div className="grid grid-cols-7 gap-1">
        {cells.map((cell, idx) => {
          if (!cell) {
            return <div key={idx} className="h-7" />
          }

          const colorClass = cell.entriesCount > 0
            ? moodToColor(cell.dominantMood)
            : "bg-gray-800/60"

          return (
            <button
              key={cell.day}
              type="button"
              onClick={() => onSelectDay(cell)}
              className={`h-7 rounded-md ${colorClass} flex items-center justify-center text-[10px] text-gray-100 hover:ring-2 hover:ring-emerald-300/60 transition`}
            >
              {new Date(cell.day).getDate()}
            </button>
          )
        })}
      </div>
    </div>
  )
}



const MOOD_PRESETS = [
  { label: "Calmo", value: "Calmo / centrato" },
  { label: "Grato", value: "Grato" },
  { label: "Contento", value: "Contento" },
  { label: "Entusiasta", value: "Entusiasta" },
  { label: "Stressato", value: "Stressato" },
  { label: "Stanco", value: "Stanco / scarico" },
  { label: "Ansioso", value: "Ansioso / in allerta" },
  { label: "Triste", value: "Triste" },
  { label: "Sovraccarico", value: "Sovraccarico" },
  { label: "Arrabbiato", value: "Arrabbiato" },
  { label: "Frustrato", value: "Frustrato" },
  { label: "Confuso", value: "Confuso" },
  { label: "Annoiato", value: "Annoiato" },
]

const MOOD_EMOJI: Record<string, string> = {
  "Calmo / centrato": "🧘‍♀️",
  Grato: "🙏",
  Contento: "😊",
  Entusiasta: "🤩",
  Stressato: "😣",
  "Stanco / scarico": "😴",
  "Ansioso / in allerta": "😰",
  Triste: "😔",
  Arrabbiato: "😠",
  Frustrato: "😣",
  Sovraccarico: "💥",
  Confuso: "😕",
  Annoiato: "😑",
}

const QUICK_TAGS = [
  "Stanchezza mentale",
  "Stanchezza fisica",
  "Senso di colpa",
  "Ansia a bassa intensità",
  "Ansia forte",
  "Confusione",
  "Speranza",
  "Motivazione",
  "Serenità",
  "Frustrazione",
  "Sovraccarico",
  "Apprezzamento",
  "Rabbia",
  "Impazienza",
  "Agitazione",
  "Determinazione",
  "Entusiasmo",
  "Apatia",
  "Noia",
  "Gratitudine",
  "Fiducia",
  "Curiosità",
  "Solitudine",
  "Vicinanza",
]

const GUIDED_PROMPTS = [
  "Se dovessi descrivere la tua giornata come una scena di un film, cosa vedresti?",
  "C'è stata un'emozione piccola ma insistente oggi, anche solo sullo sfondo?",
  "In quale momento della giornata hai sentito più chiaramente il tuo corpo parlarti?",
  "Se dovessi ringraziare qualcosa o qualcuno di oggi, chi o cosa sarebbe?",
  "C'è stata una situazione in cui ti sei sorpreso/a della tua reazione?",
]

const EMOTIONAL_TONES = [
  {
    id: "calma",
    label: "Più calma",
    description: "MomentI di respiro, centratura, presenza.",
  },
  {
    id: "intensità",
    label: "Più intensità",
    description: "Picchi emotivi, tensioni, nervosismo.",
  },
  {
    id: "stanchezza",
    label: "Più stanchezza",
    description: "Sovraccarico, esaurimento, poca energia.",
  },
  {
    id: "gratitudine",
    label: "Più gratitudine",
    description: "Momenti in cui noti ciò che funziona.",
  },
]

const BANNER_NOTES = [
  {
    id: "start",
    title: "Uno spazio sicuro, non una performance",
    body: "Qui non devi essere brillante o interessante. Puoi anche scrivere solo due righe sconnesse: valgono comunque come un atto di cura verso di te.",
  },
  {
    id: "tiny",
    title: "Un minuto alla volta",
    body: "Non serve recuperare tutto il passato. Ti basta guardare oggi: come ti sei svegliato, cosa ti ha colpito, cosa ti ha fatto respirare meglio.",
  },
  {
    id: "soft",
    title: "Puoi cambiare idea tra una riflessione e l’altra",
    body: "Non devi essere coerente con quello che hai scritto ieri. Le emozioni non lo sono quasi mai, e va bene così.",
  },
]

// piccolo spinner
const Spinner = () => (
  <div className="w-4 h-4 border-2 border-emerald-300 border-t-transparent rounded-full animate-spin" />
)

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

    const dismissed = window.localStorage.getItem(BETA_BANNER_KEY) === "true"
    if (!dismissed) {
      setShowBetaBanner(true)
    }
  }, [session?.user?.id])

  const handleDismissBetaBanner = () => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(BETA_BANNER_KEY, "true")
    }
    setShowBetaBanner(false)
  }

  // journaling & insights
  const [guidedError, setGuidedError] = useState<string | null>(null)
  const [guidedSending, setGuidedSending] = useState(false)
  const [mood, setMood] = useState("")
  const [selectedMoods, setSelectedMoods] = useState<string[]>([])
  const [note, setNote] = useState("")
  const [reflection, setReflection] = useState("")
  const [weeklyInsight, setWeeklyInsight] = useState("")
  const [summaryHistory, setSummaryHistory] = useState<SummaryEntry[]>([])
  const [insightsLoading, setInsightsLoading] = useState(false)
  const [insightsError, setInsightsError] = useState<string | null>(null)
  const [insightsMoodSeries, setInsightsMoodSeries] = useState<
    { date: string; label: string }[]
  >([])
  const [insightsTopTags, setInsightsTopTags] = useState<
    { tag: string; count: number }[]
  >([])
  const [mentorInsight, setMentorInsight] = useState<string | null>(null)
  const [weeklyRitual, setWeeklyRitual] = useState<string | null>(null)
  const [weeklyRitualRange, setWeeklyRitualRange] = useState<{
    from: string
    to: string
  } | null>(null)
  const [weeklyRitualError, setWeeklyRitualError] = useState<string | null>(
    null
  )
  const [calendarDays, setCalendarDays] = useState<CalendarDay[]>([])
  const [calendarLoading, setCalendarLoading] = useState(false)
  const [calendarError, setCalendarError] = useState<string | null>(null)
  const [calendarMonthOffset, setCalendarMonthOffset] = useState(0)
  const [selectedCalendarDay, setSelectedCalendarDay] =
  useState<CalendarDay | null>(null)


  // emotional profile
  const [emotionalShort, setEmotionalShort] = useState<string | null>(null)
  const [emotionalFull, setEmotionalFull] = useState<string | null>(null)
  const [emotionalExpanded, setEmotionalExpanded] = useState(false)
  const [emotionalTags, setEmotionalTags] = useState<string[]>([])

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
    ;(async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (session?.user) {
        setSession(session)
      }
    })()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const [magicLinkEmail, setMagicLinkEmail] = useState("")
  const [authError, setAuthError] = useState<string | null>(null)
  const [authLoading, setAuthLoading] = useState(false)

const handleLogin = async () => {
  setAuthError(null)

  if (!magicLinkEmail) {
    setAuthError("Inserisci una email per continuare.")
    return
  }

  setAuthLoading(true)

  try {
    // URL di redirect per il magic link
    // In prod: https://myndself.ai/app
    // In dev puoi usare un env, vedi sotto
    const redirectTo =
      import.meta.env.VITE_SUPABASE_REDIRECT_URL ||
      `${window.location.origin}/app`

    const { error } = await supabase.auth.signInWithOtp({
      email: magicLinkEmail,
      options: {
        emailRedirectTo: redirectTo,
      },
    })

    if (error) {
      throw error
    }

    showToast("Ti ho mandato un link magico via email ✉️", "success")
    setAuthError(null)
  } catch (error: any) {
    console.error("auth error", error)
    setAuthError(error.message || "Errore durante l'invio del link magico.")
    showToast(error.message || "Errore durante l'invio del link magico.", "error")
  } finally {
    setAuthLoading(false)
  }
}


  const handleLogout = async () => {
    await supabase.auth.signOut()
    setSession(null)
    showToast("Sei uscito dall'account", "info")
  }

  // ---------- RIFLESSIONE DEL GIORNO ----------
  const [isReflecting, setIsReflecting] = useState(false)
  const [showReflectionDone, setShowReflectionDone] = useState(false)
  const [emotionProfileLoading, setEmotionProfileLoading] = useState(false)

  const handleReflection = async () => {
    const uid = session?.user?.id
    if (!uid)
      return showToast("Accedi prima per salvare le riflessioni", "error")
    if (!mood && !note)
      return showToast(
        "Scrivi almeno come ti senti o una breve nota 💭",
        "error"
      )

    setIsReflecting(true)
    setReflection("")
    try {
      const goal =
        typeof window !== "undefined"
          ? window.localStorage.getItem("myndself_onboarding_goal_v1") || ""
          : ""

      const res = await fetch(`${API_BASE}/api/reflection`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: uid, mood, note, goal }),
      })
      const data = await res.json()
      setReflection(data.reflection || "")
      showToast("Riflessione salvata ✅", "success")
      setMood("")
      setSelectedMoods([])
      setNote("")
      setShowReflectionDone(true)

      // refresh dati per Insight
      await loadInsights(uid)
      await refreshEmotionalProfile(uid)
    } catch (err: any) {
      console.error(err)
      showToast(
        "Non sono riuscito a salvare la riflessione. Riprova tra poco.",
        "error"
      )
    } finally {
      setIsReflecting(false)
    }
  }

  // ---------- INSIGHT & PROFILO EMOTIVO ----------
  async function refreshEmotionalProfile(userId: string) {
    try {
      setEmotionProfileLoading(true)
      const res = await fetch(
        `${API_BASE}/api/emotional-profile?user_id=${userId}`
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
          .filter(Boolean)

        if (sentences.length > 2) {
          const firstTwo = sentences.slice(0, 2).join(" ")
          setEmotionalShort(firstTwo)
        } else {
          setEmotionalShort(raw)
        }
      }
    } catch (err) {
      console.error("emotional profile error", err)
    } finally {
      setEmotionProfileLoading(false)
    }
  }

async function loadMoodCalendar(userId: string, monthOffset = 0) {
  setCalendarLoading(true)
  setCalendarError(null)

  try {
    // chiamiamo il backend come si aspetta lui:
    // /api/metrics?user_id=...&month_offset=...
    const url = `${API_BASE}/api/metrics?user_id=${encodeURIComponent(
      userId
    )}&month_offset=${monthOffset}`

    const res = await fetch(url)
    if (!res.ok) {
      throw new Error("Non riesco a caricare il calendario emotivo")
    }

    const json = await res.json()

    const days: CalendarDay[] =
      json.days?.map((d: any) => ({
        // il backend manda "date"
        day: d.date,
        // bucket = calma / gioia / tristezza / rabbia / ansia / nessuna
        dominantMood: d.bucket === "nessuna" ? null : d.bucket,
        // per ora: 1 se c’è almeno un entry quel giorno, 0 altrimenti
        entriesCount: d.mood ? 1 : 0,
        moodsCount: d.mood ? { [d.bucket]: 1 } : {},
        tags: [],
        // extra per il pannellino di dettaglio
        mood: d.mood || null,
        detail: d.detail || null,
      })) ?? []

    setCalendarDays(days)
    setCalendarMonthOffset(monthOffset)
  } catch (err: any) {
    console.error("mood calendar error", err)
    setCalendarError(
      "Non riesco a preparare il calendario emotivo. Riprova più tardi."
    )
  } finally {
    setCalendarLoading(false)
  }
}



  async function loadInsights(userId: string) {
    setInsightsLoading(true)
    setInsightsError(null)
    try {
      // 1) dataset grezzo
      const url = `${API_BASE}/api/insights?user_id=${userId}`
      const res = await fetch(url)
      if (!res.ok) throw new Error("Non riesco a caricare gli insight")
      const json = await res.json()

      const moodSeries: { date: string; label: string }[] =
        json.moods?.map((item: any) => ({
          date: item.date,
          label: item.mood || "",
        })) ?? []

      const topTags =
        json.top_tags?.map((t: any) => ({
          tag: t.tag,
          count: t.tag_count || 0,
        })) ?? []

      setInsightsMoodSeries(moodSeries)
      setInsightsTopTags(topTags)

      // 2) mentor summary
      if (json.mentor_insight && typeof json.mentor_insight === "string") {
        setMentorInsight(json.mentor_insight.trim())
      } else {
        setMentorInsight(null)
      }

      // 3) rituale settimanale
      try {
        const resRitual = await fetch(
          `${API_BASE}/api/weekly-ritual?user_id=${encodeURIComponent(userId)}`
        )

        if (resRitual.ok) {
          const ritualJson = await resRitual.json()
          if (ritualJson.ritual) {
            setWeeklyRitual(ritualJson.ritual)
            setWeeklyRitualRange(
              ritualJson.from && ritualJson.to
                ? { from: ritualJson.from, to: ritualJson.to }
                : null
            )
            setWeeklyRitualError(null)
          } else if (ritualJson.reason === "no_entries") {
            setWeeklyRitual(null)
            setWeeklyRitualRange(null)
            setWeeklyRitualError(
              "Per vedere il rituale settimanale servono ancora alcune riflessioni."
            )
          } else {
            setWeeklyRitual(null)
            setWeeklyRitualRange(null)
            setWeeklyRitualError(null)
          }
        } else {
          setWeeklyRitual(null)
          setWeeklyRitualRange(null)
          setWeeklyRitualError("Non sono riuscito a recuperare il rituale.")
        }
      } catch (err) {
        console.error("weekly ritual error", err)
        setWeeklyRitual(null)
        setWeeklyRitualRange(null)
        setWeeklyRitualError("Non sono riuscito a recuperare il rituale.")
      }
      await loadMoodCalendar(userId, calendarMonthOffset)
    } catch (err: any) {
      console.error(err)
      setInsightsError(
        "Non sono riuscito a preparare i tuoi insight. Riprova più tardi."
      )
    } finally {
      setInsightsLoading(false)
    }
  }

  useEffect(() => {
    const uid = session?.user?.id
    if (!uid) return

    ;(async () => {
      try {
        const res = await fetch(
          `${API_BASE}/api/summary-history?user_id=${uid}`
        )
        const json = await res.json()
        const items = Array.isArray(json.items) ? json.items : []
        const typed: SummaryEntry[] = items.map((x: any) => ({
          id: x.id,
          summary: x.summary,
          created_at: x.created_at,
        }))
        setSummaryHistory(typed)
      } catch (e) {
        console.error("summary history error", e)
      }
    })()
  }, [session?.user?.id])

  // ---------- GUIDED REFLECTION ----------
// ---------- GUIDED REFLECTION ----------
const [guidedMessages, setGuidedMessages] = useState<GuidedMsg[]>([])
const [guidedInput, setGuidedInput] = useState("")
const [guidedLoading, setGuidedLoading] = useState(false)
const [guidedActive, setGuidedActive] = useState(false)
const [guidedStep, setGuidedStep] = useState<number>(0)
const [guidedFinal, setGuidedFinal] = useState(false)

function startGuidedSession() {
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
    return showToast(
      "Accedi prima per continuare la riflessione guidata",
      "error"
    )

  // se non abbiamo ancora iniziato, parto con la prima domanda fissa
  if (!guidedActive) return startGuidedSession()

  // se non è il turno finale, serve una risposta dell’utente
  if (!guidedInput.trim() && guidedStep > 0 && !guidedFinal) {
    return showToast("Scrivi una breve risposta per continuare 💭", "info")
  }

  // aggiungo il messaggio dell’utente al contesto
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
      body: JSON.stringify({
        user_id: uid,
        messages: msgs,
        step: guidedStep || 1,
      }),
    })

    const data = await res.json()
    const reply =
      data?.reply ||
      "Grazie per aver condiviso. Restiamo un momento con quello che stai sentendo."
    const isFinal = Boolean(data?.isFinal)

    setGuidedMessages(prev => [...prev, { role: "assistant", content: reply }])
    setGuidedFinal(isFinal)
    setGuidedStep(prev => (isFinal ? 4 : Math.min(4, (prev || 1) + 1)))

    if (isFinal) {
      showToast("Riflessione guidata salvata tra le sintesi ✅", "success")
      try {
        const sumRes = await fetch(
          `${API_BASE}/api/summary-history?user_id=${uid}`
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



  // ---------- MENTOR CHAT ----------
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [chatInput, setChatInput] = useState("")
  const [isChatLoading, setIsChatLoading] = useState(false)

  useEffect(() => {
    const uid = session?.user?.id
    if (!uid) return

    ;(async () => {
      try {
        const res = await fetch(
          `${API_BASE}/api/mentor-history?user_id=${uid}`
        )
        if (!res.ok) return
        const data = await res.json()
        if (Array.isArray(data.items) && data.items.length > 0) {
          const last = data.items[0]
          const restored: ChatMessage[] = [
            { role: "assistant", content: last.opening || "" },
            ...(last.exchange && Array.isArray(last.exchange)
              ? last.exchange
              : []),
            ...(last.reply ? [{ role: "assistant", content: last.reply }] : []),
          ]
          setChatMessages(restored)
        }
      } catch (e) {
        console.error("init fetch error:", e)
      }
    })()
  }, [session])

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


  // ---------- QUICK METRICS ----------
  const [dailyItems, setDailyItems] = useState<DailyItem[]>([])
  const [tagItems, setTagItems] = useState<TagItem[]>([])

  useEffect(() => {
    const uid = session?.user?.id
    if (!uid) return

    ;(async () => {
      try {
        const res = await fetch(`${API_BASE}/api/metrics?user_id=${uid}`)
        const data = await res.json()

        const days: DailyItem[] = Array.isArray(data.by_day)
          ? data.by_day.map((d: any) => ({
              day: d.day,
              entries: d.entries,
            }))
          : []

        const tags: TagItem[] = Array.isArray(data.top_tags)
          ? data.top_tags.map((t: any) => ({
              tag: t.tag,
              tag_count: t.tag_count,
            }))
          : []

        setDailyItems(days)
        setTagItems(tags)
      } catch (err) {
        console.error("metrics error", err)
      }
    })()
  }, [session?.user?.id])

  const dailyChartData = useMemo(
    () =>
      dailyItems.map((d) => ({
        ...d,
        label: new Date(d.day).toLocaleDateString("it-IT", {
          day: "2-digit",
          month: "2-digit",
        }),
      })),
    [dailyItems]
  )

  const tagChartData = useMemo(
    () =>
      tagItems.map((t) => ({
        ...t,
        label: t.tag,
      })),
    [tagItems]
  )

  // ---------- BANNER EMOTIVO ----------
  const [emotionalNoteIndex, setEmotionalNoteIndex] = useState(0)
  const currentBanner = BANNER_NOTES[emotionalNoteIndex]

  useEffect(() => {
    if (!BANNER_NOTES.length) return
    const id = setInterval(() => {
      setEmotionalNoteIndex((prev) => (prev + 1) % BANNER_NOTES.length)
    }, 20000)
    return () => clearInterval(id)
  }, [])

  // ---------- TABS ----------
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
        <div className="flex justify-between sm:justify-start items-center gap-2 sm:gap-3">
          <div className="inline-flex items-center gap-1 sm:gap-2 bg-gray-900/70 border border-white/5 rounded-full p-1">
            {tabs.map((t) => {
              const active = currentTab === t.id
              return (
                <button
                  key={t.id}
                  onClick={() => setCurrentTab(t.id)}
                  className={`px-3 sm:px-4 py-1 rounded-full text-xs sm:text-sm transition-colors ${
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

          {currentTab === "insight" && (
            <button
              onClick={() => setCurrentTab("oggi")}
              className="hidden sm:inline-flex items-center text-xs text-gray-400 hover:text-emerald-300"
            >
              + Aggiungi una riflessione
            </button>
          )}
        </div>
      </nav>
    )
  }

  const formatDateLabel = (iso: string) => {
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return iso
    return d
      .toLocaleDateString("it-IT", {
        day: "2-digit",
        month: "2-digit",
      })
      .replace("/", "-")
  }

  type InsightsTabProps = {
  loading: boolean
  error: string | null
  moodSeries: { date: string; label: string }[]
  topTags: { tag: string; count: number }[]
  mentorInsight: string | null
  weeklyRitual: string | null
  weeklyRitualRange: { from: string; to: string } | null
  weeklyRitualError: string | null
  onStartReflection: () => void

  // 👇 NUOVO: calendario emotivo
  calendarDays: CalendarDay[]
  calendarMonthOffset: number
  calendarLoading: boolean
  calendarError: string | null
  selectedCalendarDay: CalendarDay | null
  onChangeCalendarMonth: (offset: number) => void
  onSelectCalendarDay: (day: CalendarDay | null) => void
}


const InsightsTab: React.FC<InsightsTabProps> = ({
  loading,
  error,
  moodSeries,
  topTags,
  mentorInsight,
  weeklyRitual,
  weeklyRitualRange,
  weeklyRitualError,
  onStartReflection,
  calendarDays,
  calendarMonthOffset,
  calendarLoading,
  calendarError,
  selectedCalendarDay,
  onChangeCalendarMonth,
  onSelectCalendarDay,
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
const reflectionDaysCount = moodSeries?.length ?? 0
  return (
    <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-8">
      {/* 1️⃣ Calendario emotivo */}
      <section className="bg-gray-900/60 border border-emerald-400/20 rounded-2xl p-5 space-y-3">
        <div>
          <h2 className="text-sm font-semibold text-emerald-200">
            Calendario emotivo
          </h2>
          <p className="text-xs text-gray-400">
            Uno sguardo visivo a come ti sei sentito negli ultimi giorni.
          </p>
        </div>

        {calendarLoading && (
          <p className="text-xs text-gray-400">
            Sto preparando il tuo calendario…
          </p>
        )}

        {calendarError && (
          <p className="text-xs text-rose-400">{calendarError}</p>
        )}

        {!calendarLoading && !calendarError && (
          <MoodCalendar
            days={calendarDays}
            monthOffset={calendarMonthOffset}
            onChangeMonth={onChangeCalendarMonth}
            onSelectDay={onSelectCalendarDay}
          />
        )}

        {reflectionDaysCount > 0 && (
  <p className="text-[11px] text-gray-400 mt-1">
    Negli ultimi 30 giorni hai dato spazio alle tue emozioni in {" "}
    <span className="font-semibold text-emerald-200">
      {reflectionDaysCount} occasion
      {reflectionDaysCount !== 1 && "i"}
    </span>
    .
  </p>
)}

        {!calendarLoading && !calendarError && (
  <div className="mt-3 flex flex-wrap gap-3 text-[11px] text-gray-400">
    <span className="flex items-center gap-1">
      <span
        className="inline-block w-3 h-3 rounded-full"
        style={{ backgroundColor: BUCKET_COLORS.calma }}
      />
      calma / serenità
    </span>
    <span className="flex items-center gap-1">
      <span
        className="inline-block w-3 h-3 rounded-full"
        style={{ backgroundColor: BUCKET_COLORS.gioia }}
      />
      gioia / apertura
    </span>
    <span className="flex items-center gap-1">
      <span
        className="inline-block w-3 h-3 rounded-full"
        style={{ backgroundColor: BUCKET_COLORS.tristezza }}
      />
      tristezza / pesantezza
    </span>
    <span className="flex items-center gap-1">
      <span
        className="inline-block w-3 h-3 rounded-full"
        style={{ backgroundColor: BUCKET_COLORS.rabbia }}
      />
      rabbia / frustrazione
    </span>
    <span className="flex items-center gap-1">
      <span
        className="inline-block w-3 h-3 rounded-full"
        style={{ backgroundColor: BUCKET_COLORS.ansia }}
      />
      ansia / tensione
    </span>
  </div>
)}


        {selectedCalendarDay && (
          <div className="mt-3 rounded-xl bg-gray-900/80 border border-gray-700/60 p-3 space-y-1">
            <div className="text-xs font-medium text-gray-200">
              {new Date(selectedCalendarDay.day).toLocaleDateString("it-IT", {
                weekday: "long",
                day: "2-digit",
                month: "long",
              })}
            </div>
            <p className="text-xs text-gray-300">
              {selectedCalendarDay.detail || selectedCalendarDay.mood || "—"}
            </p>
          </div>
        )}
      </section>

      {/* 2️⃣ Uno sguardo del Mentor */}
      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-emerald-200">
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

      {/* 3️⃣ Rituale della settimana */}
      <section className="bg-gray-900/60 border border-emerald-400/20 rounded-2xl p-5 space-y-3">
        <div>
          <h2 className="text-sm font-semibold text-emerald-200">
            Rituale della settimana
          </h2>

        {weeklyRitualRange && (
          <p className="text-[11px] text-gray-400 mt-0.5">
            Ultimi 7 giorni ·{" "}
            {new Date(weeklyRitualRange.from).toLocaleDateString("it-IT", {
              day: "2-digit",
              month: "2-digit",
            })}{" "}
            –{" "}
            {new Date(weeklyRitualRange.to).toLocaleDateString("it-IT", {
              day: "2-digit",
              month: "2-digit",
            })}
          </p>
        )}
        </div>

        {weeklyRitualError && (
          <p className="text-xs text-gray-400">{weeklyRitualError}</p>
        )}

        {weeklyRitual && !weeklyRitualError && (
          <p className="text-sm text-gray-200 whitespace-pre-wrap">
            {weeklyRitual}
          </p>
        )}

        {!weeklyRitual && !weeklyRitualError && (
          <p className="text-xs text-gray-400">
            Quando avrai qualche giorno di riflessioni alle spalle, qui
            troverai una piccola lettura settimanale del tuo Mentor.
          </p>
        )}

        <button
          onClick={onStartReflection}
          className="inline-flex items-center px-3 py-1.5 rounded-lg bg-emerald-400 text-gray-950 text-xs font-semibold hover:bg-emerald-300 transition"
        >
          Fai una riflessione ora
        </button>
      </section>

      {/* 4️⃣ Emozioni più ricorrenti (compatto) */}
      {topTags.length > 0 && (
        <section className="space-y-2 bg-gray-900/40 border border-gray-700/30 rounded-xl p-3">
          <h3 className="text-sm font-semibold text-gray-300">
            Emozioni più ricorrenti
          </h3>
          <div className="flex flex-wrap gap-2">
            {topTags.slice(0, 6).map((t, idx) => (
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
          <p className="text-[11px] text-gray-500">
            Queste parole mostrano cosa sta occupando più spesso il tuo spazio
            emotivo in questo periodo.
          </p>
        </section>
      )}
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
      {/* TOASTS - in basso a destra */}
      <div className="fixed bottom-4 right-4 z-50 space-y-2 w-[calc(100%-2rem)] sm:w-80">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`px-4 py-3 rounded-lg text-sm border ${
              t.type === "error"
                ? "bg-red-500/10 border-red-400/40 text-red-50"
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
            <h1 className="text-lg sm:text-xl font-semibold">
              MyndSelf.ai
            </h1>
            <p className="text-xs text-gray-400">
              Un diario emotivo che ti aiuta a osservarti con gentilezza.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {session && (
            <button
              onClick={handleLogout}
              className="text-xs text-gray-400 hover:text-gray-200"
            >
              Esci
            </button>
          )}
        </div>
      </header>

      {/* SE L’UTENTE NON È LOGGATO → HERO / CTA */}
      {!session && (
        <>
          <section className="w-full max-w-6xl mx-auto px-4 sm:px-6 mt-4 pb-16">
            <div className="bg-gray-900/70 border border-white/10 rounded-2xl p-6 sm:p-8 flex flex-col md:flex-row items-center gap-6">
              <div className="flex-1 space-y-4">
                <p className="inline-flex items-center text-xs font-semibold text-emerald-300 bg-emerald-500/10 border border-emerald-400/30 rounded-full px-3 py-1 w-fit">
                  Beta privata · spazio emotivo gentile 🌿
                </p>
                <h2 className="text-2xl sm:text-3xl font-semibold leading-tight">
                  Un posto dove mettere in ordine
                  <br className="hidden sm:block" /> quello che senti,{" "}
                  <span className="text-emerald-300">
                    senza giudicarti.
                  </span>
                </h2>
                <p className="text-sm text-gray-300">
                  Ogni giorno ti facciamo una sola domanda:{" "}
                  <span className="italic">
                    “Come ti stai muovendo, emotivamente?”
                  </span>{" "}
                  Da lì, MyndSelf.ai tiene traccia dei tuoi stati d’animo,
                  nota i pattern e ti restituisce piccole letture del tuo
                  paesaggio emotivo.
                </p>
                <ul className="text-xs text-gray-300 space-y-1">
                  <li>• Riflessioni brevi, senza pressione di “fare bene”.</li>
                  <li>• Insight settimanali su come oscillano le tue emozioni.</li>
                  <li>• Un Mentor AI che ti restituisce domande, non giudizi.</li>
                </ul>
              </div>

              <div className="w-full md:w-[320px] bg-gray-950/60 border border-white/10 rounded-2xl p-5 space-y-4">
                <h3 className="text-sm font-semibold">
                  Entra nella beta privata
                </h3>
                <p className="text-xs text-gray-400">
                  Ti mandiamo un link magico via email: niente password, niente
                  fronzoli.
                </p>
                <div className="space-y-2">
                  <label className="text-xs text-gray-300">
                    Email
                    <input
                      type="email"
                      value={magicLinkEmail}
                      onChange={(e) => setMagicLinkEmail(e.target.value)}
                      placeholder="nome@esempio.com"
                      className="mt-1 w-full rounded-md bg-gray-900 border border-white/10 px-3 py-2 text-sm text-gray-50 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-400/60"
                    />
                  </label>
                  {authError && (
                    <p className="text-[11px] text-red-300">{authError}</p>
                  )}
                </div>
                <button
                  onClick={handleLogin}
                  disabled={authLoading}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-md bg-emerald-400 text-gray-950 text-sm font-semibold py-2 hover:bg-emerald-300 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {authLoading && <Spinner />}
                  {authLoading ? "Invio in corso…" : "Ricevi il link magico"}
                </button>
                <p className="text-[11px] text-gray-500">
                  Nessuna newsletter automatica. Useremo il tuo contatto solo
                  per questa beta.
                </p>
              </div>
            </div>
          </section>
        </>
      )}

      {/* SE L’UTENTE È LOGGATO → APP */}
      {session && (
        <>
          {/* Banner beta */}
          {showBetaBanner && (
            <section className="w-full max-w-6xl mx-auto px-4 sm:px-6 mt-2">
              <div className="rounded-2xl border border-emerald-400/30 bg-emerald-400/5 px-4 py-3 flex items-start gap-3">
                <div className="mt-0.5">🌱</div>
                <div className="space-y-1 text-xs text-gray-100">
                  <p className="font-semibold">
                    Stai usando la beta privata di MyndSelf.ai
                  </p>
                  <p>
                    Potresti incontrare qualche piccola imperfezione. Ogni tua
                    riflessione ci aiuta a rendere questo spazio emotivo più
                    preciso e accogliente.
                  </p>
                  <button
                    onClick={handleDismissBetaBanner}
                    className="text-[11px] text-emerald-300 hover:text-emerald-200"
                  >
                    Capito, nascondi questo messaggio
                  </button>
                </div>
              </div>
            </section>
          )}

          {/* Tabs */}
          <TabsNav />

          {/* CONTENUTO PRINCIPALE */}
          <section className="w-full max-w-6xl mx-auto px-4 sm:px-6 pb-10">
            {/* Banner nota emotiva (sopra le tab) */}
            <section className="mb-4 rounded-2xl border border-emerald-400/20 bg-emerald-400/5 px-4 py-3 flex gap-3 items-start">
              <div className="mt-0.5 text-lg">💭</div>
              <div className="flex-1">
                <p className="text-[11px] font-semibold text-emerald-200 uppercase tracking-wide">
                  Nota emotiva
                </p>
                <p className="text-xs text-gray-100 font-medium">
                  {currentBanner.title}
                </p>
                <p className="text-xs text-gray-200 mt-1">
                  {currentBanner.body}
                </p>
              </div>
            </section>

            <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,2fr)_minmax(0,1.4fr)] gap-4 lg:gap-6 items-start">
              {/* COLONNA SINISTRA */}
              <div className="space-y-4">
                {/* TAB: OGGI */}
                {currentTab === "oggi" && (
                  <section className="bg-gray-900/70 border border-white/10 rounded-2xl p-4 sm:p-5 space-y-4">
                    <header className="flex items-start justify-between gap-3">
                      <div>
                        <h2 className="text-sm font-semibold">
                          La riflessione di oggi
                        </h2>
                        <p className="text-xs text-gray-400">
                          Non devi raccontare tutto. Parti da un punto della
                          tua giornata che “punge” o che illumina qualcosa.
                        </p>
                      </div>
                    </header>

                    {/* MOOD PRESET CHIPS */}
                    <div className="space-y-2">
                      <p className="text-[11px] text-gray-400">
                        Come ti senti, a grandi linee?
                      </p>
                      <div className="flex flex-wrap gap-2">
                       {MOOD_PRESETS.map((m) => {
  const active = selectedMoods.includes(m.value)
  const colorKey = m.label.toLowerCase() // "calmo", "grato", ecc.
  const hex = EMOTION_COLORS[colorKey]

  return (
    <button
      key={m.value}
      type="button"
      onClick={() => {
        setMood(m.value)
        setSelectedMoods((prev) => {
          if (prev.includes(m.value)) {
            return prev.filter((v) => v !== m.value)
          }
          return [...prev, m.value]
        })
      }}
      className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs transition-colors ${
        active
          ? "text-gray-950"
          : "bg-white/5 text-gray-100 hover:bg-white/10"
      }`}
      style={
        active && hex
          ? { backgroundColor: hex, borderColor: hex }
          : !active && hex
          ? { borderColor: hex }
          : undefined
      }
    >
      <span>{MOOD_EMOJI[m.value] ?? "✨"}</span>
      <span>{m.label}</span>
    </button>
  )
})}

                      </div>
                    </div>

                    {/* NOTE + TAGS */}
                    <div className="space-y-2">
                      <p className="text-[11px] text-gray-400">
                        Se ti va, racconta con poche parole cosa ti ha colpito
                        di oggi.
                      </p>
                      <textarea
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        rows={4}
                        className="w-full rounded-md bg-gray-950/70 border border-white/10 px-3 py-2 text-sm text-gray-50 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-400/60"
                        placeholder="Ad esempio: quando mi sono svegliato ho sentito..."
                      />
                    </div>

                    <div className="space-y-2">
                      <p className="text-[11px] text-gray-400">
                        Se vuoi, scegli qualche parola che descrive questo
                        momento.
                      </p>
                      <div className="flex flex-wrap gap-2">
                       {QUICK_TAGS.map((tag) => {
  const active = note.includes(tag)
  const colorKey = tag.toLowerCase()
  const hex = EMOTION_COLORS[colorKey]

  return (
    <button
      key={tag}
      type="button"
      onClick={() => {
        if (active) {
          setNote((prev) =>
            prev.replace(tag, "").replace("  ", " ")
          )
        } else {
          setNote((prev) =>
            prev.length ? `${prev.trim()} · ${tag}` : tag
          )
        }
      }}
      className={`inline-flex items-center rounded-full border px-3 py-1 text-[11px] transition-colors ${
        active
          ? "text-gray-950"
          : "bg-white/5 text-gray-200 hover:bg-white/10"
      }`}
      style={
        active && hex
          ? { backgroundColor: hex, borderColor: hex }
          : !active && hex
          ? { borderColor: hex }
          : undefined
      }
    >
      {tag}
    </button>
  )
})}

                      </div>
                    </div>

                    {/* BOTTONI AZIONE */}
                    <div className="flex flex-col sm:flex-row justify-between gap-3 pt-2">
                      <div className="flex items-center gap-2 text-[11px] text-gray-400">
                        <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/15 border border-emerald-400/30 text-xs">
                          ℹ️
                        </span>
                        <span>
                          Una sola riflessione al giorno è più che sufficiente.
                          Se non sai cosa dire, puoi anche scrivere solo una
                          frase.
                        </span>
                      </div>

                      <button
                        onClick={handleReflection}
                        disabled={isReflecting}
                        className="inline-flex items-center justify-center rounded-md bg-emerald-400 text-gray-950 text-sm font-semibold px-4 py-2 hover:bg-emerald-300 disabled:opacity-60"
                      >
                        {isReflecting ? (
                          <>
                            <Spinner />{" "}
                            <span className="ml-2">
                              Sto registrando la tua riflessione…
                            </span>
                          </>
                        ) : (
                          "Salva la riflessione di oggi"
                        )}
                      </button>
                    </div>

                    {/* Riflessione AI del Mentor */}
                    {reflection && (
                      <div className="mt-4 bg-white/5 rounded-lg p-3 text-sm text-emerald-50 whitespace-pre-wrap fade-in">
                        {reflection}
                      </div>
                    )}

                    {/* Reward box dopo riflessione */}
                    {showReflectionDone && (
                      <ReflectionSuccess
                        moods={selectedMoods}
                        onShowInsights={() => {
                          setShowReflectionDone(false)
                          setCurrentTab("insight")
                        }}
                        onDismiss={() => setShowReflectionDone(false)}
                      />
                    )}
                  </section>
                )}

                {/* TAB: INSIGHT */}
                {currentTab === "insight" && (
  <InsightsTab
    loading={insightsLoading}
    error={insightsError}
    moodSeries={insightsMoodSeries}
    topTags={insightsTopTags}
    mentorInsight={mentorInsight}
    weeklyRitual={weeklyRitual}
    weeklyRitualRange={weeklyRitualRange}
    weeklyRitualError={weeklyRitualError}
    onStartReflection={() => setCurrentTab("oggi")}
    calendarDays={calendarDays}
    calendarMonthOffset={calendarMonthOffset}
    calendarLoading={calendarLoading}
    calendarError={calendarError}
    selectedCalendarDay={selectedCalendarDay}
    onChangeCalendarMonth={(offset) => {
      if (session?.user?.id) {
        loadMoodCalendar(session.user.id, offset)
      }
    }}
    onSelectCalendarDay={setSelectedCalendarDay}
  />
)}


                {/* TAB: GUIDATA */}
                {currentTab === "guidata" && (
                  <section className="bg-gray-900/70 border border-white/10 rounded-2xl p-4 sm:p-5 space-y-4">
                    <header className="flex items-start justify-between gap-3">
                      <div>
                        <h2 className="text-sm font-semibold">
                          Riflessione guidata
                        </h2>
                        <p className="text-xs text-gray-400">
                          Se non sai da dove iniziare, ti accompagniamo noi con
                          qualche domanda.
                        </p>
                      </div>
                    </header>

                    <div className="space-y-3">
                      {guidedMessages.length === 0 && (
                        <p className="text-xs text-gray-300">
                          Quando inizi, ti farò qualche domanda alla volta. Tu
                          puoi rispondere con parole sparse, senza dover essere
                          lineare.
                        </p>
                      )}

                      {guidedMessages.length > 0 && (
                        <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                          {guidedMessages.map((m, idx) => (
                            <div
                              key={idx}
                              className={`text-sm px-3 py-2 rounded-lg max-w-[80%] ${
                                m.role === "assistant"
                                  ? "bg-emerald-500/10 text-emerald-50 self-start"
                                  : "bg-white/10 text-gray-50 self-end ml-auto"
                              }`}
                            >
                              {m.content}
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="space-y-2 pt-2">
                        <textarea
                          value={guidedInput}
                          onChange={(e) => setGuidedInput(e.target.value)}
                          rows={3}
                          placeholder={
                            guidedMessages.length === 0
                              ? "Se ti va, dimmi solo da dove vuoi partire oggi…"
                              : "Scrivi liberamente quello che ti viene in mente ora…"
                          }
                          className="w-full rounded-md bg-gray-950/70 border border-white/10 px-3 py-2 text-sm text-gray-50 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-400/60"
                        />
                        <div className="flex justify-between items-center gap-2">
                          <button
  type="button"
  onClick={guidedFinal ? resetGuided : sendGuidedTurn}
  disabled={guidedLoading}
  className="inline-flex items-center px-3 py-1.5 rounded-lg bg-emerald-400 text-gray-950 text-xs font-semibold hover:bg-emerald-300 transition disabled:opacity-50"
>
  {guidedFinal
    ? "Ricomincia una nuova riflessione"
    : guidedMessages.length === 0
      ? "Inizia la riflessione guidata"
      : "Continua"}
</button>

                        </div>
                      </div>
                    </div>
                  </section>
                )}

                {/* TAB: CHAT MENTOR */}
                {currentTab === "chat" && (
                  <section className="bg-gray-900/70 border border-white/10 rounded-2xl p-4 sm:p-5 space-y-4">
                    <header className="flex items-start justify-between gap-3">
                      <div>
                        <h2 className="text-sm font-semibold">
                          Parla con il Mentor
                        </h2>
                        <p className="text-xs text-gray-400">
                          Qui puoi portare un pensiero specifico, un dubbio o
                          qualcosa che non riesci a decifrare. Il Mentor non ti
                          dirà cosa fare: ti aiuterà a guardare da un’altra
                          angolatura.
                        </p>
                      </div>
                    </header>

                    <div className="space-y-3">
                      <div className="min-h-[140px] max-h-64 overflow-y-auto space-y-2 pr-1">
                        {chatMessages.length === 0 && (
                          <div className="text-xs text-gray-400">
                            Puoi iniziare dicendo cosa ti pesa di più in questo
                            momento, o qual è la domanda che ti torna più
                            spesso in mente.
                          </div>
                        )}
                        {chatMessages.map((m, idx) => (
                          <div
                            key={idx}
                            className={`text-sm px-3 py-2 rounded-lg max-w-[80%] ${
                              m.role === "assistant"
                                ? "bg-emerald-500/10 text-emerald-50 self-start"
                                : "bg-white/10 text-gray-50 self-end ml-auto"
                            }`}
                          >
                            {m.content}
                          </div>
                        ))}
                        {isChatLoading && (
                          <div className="inline-flex items-center gap-2 text-xs text-gray-400">
                            <Spinner />
                            <span>Il Mentor sta ascoltando…</span>
                          </div>
                        )}
                      </div>

                      <div className="space-y-2 pt-1">
                        <div className="flex gap-2 items-center">
                          <input
                            value={chatInput}
                            onChange={(e) => setChatInput(e.target.value)}
                            onKeyDown={(e) =>
                              e.key === "Enter" && handleChatSend()
                            }
                            placeholder="Scrivi cosa senti in questo momento…"
                            className="flex-1 bg-white/5 rounded-lg border border-white/10 px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-emerald-400/50"
                          />
                          <button
                            onClick={handleChatSend}
                            disabled={isChatLoading}
                            className="bg-emerald-400 text-gray-950 rounded-lg px-3 py-2 text-sm font-semibold flex items-center gap-2 disabled:opacity-50"
                          >
                            {isChatLoading && <Spinner />}
                            Invia
                          </button>
                        </div>
                      </div>
                    </div>
                  </section>
                )}
              </div>

              {/* COLONNA DESTRA: INSIGHT VELOCI + PROFILO EMOTIVO */}
              <aside className="space-y-4">
                {/* Profilo emotivo */}
              

                


                {/* Top tag chart (se hai molti dati) */}
                {tagChartData.length > 0 && (
                  <section className="bg-gray-900/70 border border-white/10 rounded-2xl p-4 sm:p-5 space-y-3">
                    <h2 className="text-sm font-semibold">
                      Cosa torna più spesso
                    </h2>
                    <div className="h-40">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={tagChartData}>
                          <CartesianGrid
                            strokeDasharray="3 3"
                            stroke="#1F2937"
                          />
                          <XAxis
                            dataKey="label"
                            tick={{ fontSize: 10, fill: "#9CA3AF" }}
                          />
                          <YAxis
                            tick={{ fontSize: 10, fill: "#9CA3AF" }}
                            allowDecimals={false}
                          />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: "#020617",
                              border: "1px solid #4B5563",
                              borderRadius: 8,
                              fontSize: 11,
                            }}
                          />
                          <Legend />
                          <Bar dataKey="tag_count" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </section>
                )}
              </aside>
            </div>
          </section>

          <footer className="w-full max-w-6xl mx-auto px-4 sm:px-6 pb-6 pt-2 text-[10px] text-gray-500 text-center">
            © {new Date().getFullYear()} MyndSelf.ai — Uno spazio sicuro per le
            tue emozioni
          </footer>
        </>
      )}
    </main>
  )
}

type ReflectionSuccessProps = {
  moods: string[]
  onShowInsights: () => void
  onDismiss: () => void
}

const ReflectionSuccess: React.FC<ReflectionSuccessProps> = ({
  moods,
  onShowInsights,
  onDismiss,
}) => {
  const emojis =
    moods.length > 0
      ? moods.map((m) => MOOD_EMOJI[m] ?? "✨")
      : ["✨", "🧡", "🌿"]

  return (
    <div className="mt-3 rounded-2xl border border-emerald-400/40 bg-emerald-500/10 px-4 py-3 flex flex-col sm:flex-row items-start sm:items-center gap-3">
      <div className="flex items-center gap-2 text-lg">
        {emojis.slice(0, 3).map((e, i) => (
          <span key={i}>{e}</span>
        ))}
      </div>
      <div className="flex-1 space-y-1">
        <p className="text-sm text-emerald-50 font-medium">
          Riflessione registrata. Ogni volta che ti fermi un attimo, stai già
          facendo qualcosa per te.
        </p>
        <p className="text-xs text-emerald-100/80">
          Se ti va, possiamo dare uno sguardo a come si sta muovendo il tuo
          paesaggio emotivo negli ultimi giorni.
        </p>
        <div className="flex flex-wrap gap-2 pt-1">
          <button
            onClick={onShowInsights}
            className="inline-flex items-center rounded-full bg-emerald-400 text-gray-950 text-xs font-semibold px-3 py-1.5 hover:bg-emerald-300"
          >
            Mostrami gli insight →
          </button>
          <button
            onClick={onDismiss}
            className="inline-flex items-center rounded-full border border-emerald-200/40 text-emerald-100 text-xs px-3 py-1.5 hover:bg-emerald-500/10"
          >
            Non ora
          </button>
        </div>
      </div>
    </div>
  )
}
