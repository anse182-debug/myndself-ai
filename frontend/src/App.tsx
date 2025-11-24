import { useEffect, useState } from "react"
import { API_BASE } from "./config"
import Header from "./components/Header"
import ChatSection from "./components/ChatSection"
import GuidedReflection from "./components/GuidedReflection"
import InsightsPanel from "./components/InsightsPanel"
import OnboardingModal from "./components/OnboardingModal"
import { useSession } from "./hooks/useSession"
import { showToast } from "./utils/toast"

export default function App() {
  const { session, loading: sessionLoading } = useSession()

  // ===========================
  // EMOTIONAL BANNER (summary)
  // ===========================
  const [emotionalNote, setEmotionalNote] = useState<string | null>(null)
  const [emotionalFull, setEmotionalFull] = useState<string | null>(null)
  const [emotionalExpanded, setEmotionalExpanded] = useState(false)
  const [emotionalTags, setEmotionalTags] = useState<string[]>([])

  // ===========================
  // INSIGHTS
  // ===========================
  const [dailySeries, setDailySeries] = useState<any[]>([])
  const [tagStats, setTagStats] = useState<any[]>([])
  const [summaryHistory, setSummaryHistory] = useState<any[]>([])

  // ===========================
  // CHAT
  // ===========================
  const [chatMessages, setChatMessages] = useState<any[]>([])
  const [isChatLoading, setIsChatLoading] = useState(false)
  const [chatInput, setChatInput] = useState("")

  // ===========================
  // GUIDED REFLECTION
  // ===========================
  const [guidedMessages, setGuidedMessages] = useState<any[]>([])
  const [guidedStep, setGuidedStep] = useState(1)
  const [guidedActive, setGuidedActive] = useState(false)
  const [guidedInput, setGuidedInput] = useState("")
  const [guidedFinal, setGuidedFinal] = useState(false)
  const [guidedLoading, setGuidedLoading] = useState(false)

  // ===========================
  // ONBOARDING
  // ===========================
  const [showOnboarding, setShowOnboarding] = useState(false)

  // ===========================
  // FETCH INITIAL DATA
  // ===========================
  useEffect(() => {
    if (sessionLoading) return
    if (!session?.user?.id) return

    const uid = session.user.id

    fetchDaily(uid)
    fetchTags(uid)
    fetchEmotionalProfile(uid)
    fetchSummaryHistory(uid)
    fetchChatHistory(uid)
  }, [sessionLoading, session])

  // =========================================
  // FETCH: DAILY EMOTIONAL TREND
  // =========================================
  async function fetchDaily(uid: string) {
    try {
      const res = await fetch(`${API_BASE}/api/analytics/daily?user_id=${uid}`)
      const json = await res.json()
      if (json.ok) setDailySeries(json.items || [])
    } catch (e) {
      console.error("daily fetch error:", e)
    }
  }

  // =========================================
  // FETCH: TAG STATS
  // =========================================
  async function fetchTags(uid: string) {
    try {
      const res = await fetch(`${API_BASE}/api/analytics/tags?user_id=${uid}`)
      const json = await res.json()
      if (json.ok) setTagStats(json.items || [])
    } catch (e) {
      console.error("tag stats error:", e)
    }
  }

  // =========================================
  // FETCH: EMOTIONAL BANNER
  // =========================================
  async function fetchEmotionalProfile(uid: string) {
    try {
      const res = await fetch(`${API_BASE}/api/emotional-profile?user_id=${uid}`)
      const json = await res.json()
      if (json.ok) {
        setEmotionalNote(json.note || null)
        setEmotionalFull(json.full || null)
        setEmotionalTags(json.tags || [])
      }
    } catch (e) {
      console.error("emotional-profile error:", e)
    }
  }

  // =========================================
  // FETCH: SUMMARY HISTORY
  // =========================================
  async function fetchSummaryHistory(uid: string) {
    try {
      const res = await fetch(`${API_BASE}/api/summary/history?user_id=${uid}`)
      const json = await res.json()
      if (json.ok) {
        setSummaryHistory(json.items || [])
      }
    } catch (e) {
      console.error("summary history error:", e)
    }
  }

  // =========================================
  // FETCH: CHAT HISTORY
  // =========================================
  async function fetchChatHistory(uid: string) {
    try {
      const res = await fetch(`${API_BASE}/api/chat/history?user_id=${uid}`)
      const json = await res.json()
      if (json.ok) {
        setChatMessages(json.items || [])
      }
    } catch (e) {
      console.error("chat history error:", e)
    }
  }

  // =========================================
  // CHAT: SEND MESSAGE
  // =========================================
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

  // =========================================
  // GUIDED REFLECTION: START / RESET
  // =========================================
  function startGuidedSession() {
    const uid = session?.user?.id
    if (!uid) {
      showToast("Accedi prima per iniziare la riflessione guidata", "error")
      return
    }

    setGuidedActive(true)
    setGuidedFinal(false)
    setGuidedStep(1)
    setGuidedMessages([
      {
        role: "assistant",
        content:
          "Iniziamo con un respiro profondo. Quando ti va, raccontami in una frase com’è stata la tua giornata.",
      },
    ])
  }

  function resetGuidedReflection() {
    setGuidedActive(false)
    setGuidedFinal(false)
    setGuidedStep(1)
    setGuidedMessages([])
    setGuidedInput("")
  }

  // =========================================
  // GUIDED REFLECTION: SEND TURN
  // =========================================
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

  // =============================================================
  // UI: EMOTIONAL BANNER COMPONENT
  // =============================================================
  function EmotionalBanner() {
    if (!emotionalNote && !emotionalFull) return null

    return (
      <div className="bg-[#1d2a2f] p-4 rounded-xl shadow mb-6 border border-[#243236]">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-lg font-semibold text-white mb-1">
              La tua nota emotiva
            </h3>

            {!emotionalExpanded ? (
              <p className="text-gray-300 text-sm">{emotionalNote}</p>
            ) : (
              <p className="text-gray-300 text-sm whitespace-pre-line">
                {emotionalFull}
              </p>
            )}

            {emotionalTags?.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {emotionalTags.map((t) => (
                  <span
                    key={t}
                    className="px-2 py-1 text-xs rounded-full bg-[#2f3d42] text-gray-300"
                  >
                    {t}
                  </span>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={() => setEmotionalExpanded((x) => !x)}
            className="text-xs text-gray-400 hover:text-gray-200 underline"
          >
            {emotionalExpanded ? "Mostra meno" : "Mostra di più"}
          </button>
        </div>
      </div>
    )
  }

  // =============================================================
  // RENDER
  // =============================================================
  return (
    <div className="min-h-screen bg-[#0e1416]">
      <Header />

      <main className="max-w-6xl mx-auto px-4 py-6">
        <EmotionalBanner />

        {sessionLoading ? (
          <div className="text-center text-gray-300 mt-10">
            Caricamento in corso…
          </div>
        ) : !session?.user ? (
          <section className="mt-10 text-center text-gray-200">
            <h1 className="text-2xl font-semibold mb-3">
              Benvenuto su MyndSelf.ai
            </h1>
            <p className="text-sm text-gray-400 max-w-xl mx-auto">
              Accedi con il tuo indirizzo email per iniziare a tracciare il tuo
              stato emotivo, riflettere con l’AI e vedere l’evoluzione nel tempo.
            </p>
            <p className="mt-4 text-xs text-gray-500">
              Usa il pulsante “Accedi” in alto a destra per iniziare.
            </p>
          </section>
        ) : (
          <div className="grid lg:grid-cols-2 gap-6 mt-4">
            {/* Colonna sinistra: riflessione guidata + chat */}
            <div className="flex flex-col gap-6">
              {/* @ts-ignore - le props sono coerenti con la nostra implementazione */}
              <GuidedReflection
                messages={guidedMessages}
                step={guidedStep}
                active={guidedActive}
                input={guidedInput}
                final={guidedFinal}
                loading={guidedLoading}
                onInputChange={setGuidedInput}
                onStart={startGuidedSession}
                onSend={sendGuidedTurn}
                onReset={resetGuidedReflection}
              />

              {/* @ts-ignore */}
              <ChatSection
                chatMessages={chatMessages}
                chatInput={chatInput}
                setChatInput={setChatInput}
                isChatLoading={isChatLoading}
                onSend={handleChatSend}
              />
            </div>

            {/* Colonna destra: insights */}
            {/* @ts-ignore */}
            <InsightsPanel
              dailySeries={dailySeries}
              tagStats={tagStats}
              summaryHistory={summaryHistory}
            />
          </div>
        )}
      </main>

      {/* @ts-ignore */}
      <OnboardingModal
        open={showOnboarding}
        onClose={() => setShowOnboarding(false)}
      />
    </div>
  )
}
