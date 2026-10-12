import { useEffect, useRef, useState } from "react"

type Message = { role: "user" | "assistant"; content: string }
type Mode = "vent" | "understand" | "calm"

export default function ReflectionJourney({ token, apiBase, language }: { token: string; apiBase: string; language: string }) {
  const en = language === "en"
  const [mode, setMode] = useState<Mode>("understand")
  const [clientId, setClientId] = useState(() => crypto.randomUUID())
  const [phase, setPhase] = useState<"start" | "dialogue" | "close">("start")
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [summary, setSummary] = useState("")
  const [nextStep, setNextStep] = useState("")
  const [before, setBefore] = useState<number | null>(null)
  const [after, setAfter] = useState<number | null>(null)
  const [understood, setUnderstood] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const [saved, setSaved] = useState(false)
  const [urgent, setUrgent] = useState(false)
  const [help, setHelp] = useState(false)
  const [latest, setLatest] = useState<{ summary: string; next_step: string } | null>(null)
  const request = useRef<AbortController | null>(null)
  useEffect(() => () => request.current?.abort(), [])
  const text = (it: string, english: string) => en ? english : it
  const panel = "rounded-2xl border border-white/10 bg-gray-900/70 p-4 sm:p-6 space-y-4"
  const field = "w-full rounded-xl bg-gray-950/70 border border-white/15 p-3 text-sm focus:ring-2 focus:ring-emerald-400"
  const button = "rounded-xl bg-emerald-400 text-gray-950 px-4 py-2 text-sm font-semibold disabled:opacity-50"

  async function call(path: string, body?: unknown) {
    request.current?.abort()
    const controller = new AbortController()
    request.current = controller
    const r = await fetch(`${apiBase}/api/journey/${path}`, { method: body === undefined ? "GET" : "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body), signal: controller.signal })
    if (!r.ok) throw new Error("unavailable")
    const data = await r.json()
    if (controller.signal.aborted) throw new DOMException("Cancelled", "AbortError")
    return data
  }

  async function send(finish = false) {
    if (!finish && !input.trim()) return
    setBusy(true); setError("")
    const next: Message[] = input.trim() ? [...messages, { role: "user", content: input.trim() }] : messages
    try {
      const data = await call("turn", { mode, messages: next, finish, language })
      setMessages([...next, { role: "assistant", content: data.reply }]); setInput(""); setUrgent(data.urgent)
      if (data.urgent) setHelp(true)
      else if (data.final) { setSummary(data.summary); setPhase("close") }
      else setPhase("dialogue")
    } catch (err) { if (!(err instanceof DOMException && err.name === "AbortError")) setError(text("Le tue parole sono ancora qui. Non riesco a rispondere ora: puoi riprovare o uscire.", "Your words are still here. I cannot reply right now: retry or leave.")) }
    finally { setBusy(false) }
  }

  function reset() {
    setClientId(crypto.randomUUID())
    request.current?.abort(); setBusy(false); setError(""); setPhase("start"); setMessages([]); setInput(""); setSummary(""); setNextStep(""); setBefore(null); setAfter(null); setUnderstood(null); setSaved(false); setUrgent(false); setHelp(false); setLatest(null)
  }

  function score(value: number | null, change: (value: number | null) => void, label: string) {
    return <fieldset className="space-y-2"><legend className="text-sm">{label}</legend>
      <div className="flex flex-wrap gap-2">{[1, 2, 3, 4, 5].map(n => <button type="button" key={n} disabled={saved || busy} aria-pressed={value === n} onClick={() => change(n)} className={`rounded-lg border px-3 py-2 ${value === n ? "border-emerald-300 bg-emerald-400/20" : "border-white/15"}`}>{n}</button>)}
        <button type="button" disabled={saved || busy} onClick={() => change(null)} aria-pressed={value === null} className="text-xs underline">{text("Salta", "Skip")}</button></div>
      <p className="text-xs text-gray-400">{text("1 = poco · 5 = molto. Facoltativo; non è una valutazione clinica.", "1 = a little · 5 = very clear. Optional; this is not a clinical assessment.")}</p></fieldset>
  }

  return <section className={panel}>
    <header><p className="text-xs uppercase tracking-widest text-emerald-300">{text("Un momento per te", "A moment for yourself")}</p><h2 className="mt-2 text-xl font-semibold">{phase === "close" ? text("Cosa vuoi portare con te?", "What would you like to take with you?") : text("Partiamo da quello che ti serve adesso.", "Let's start with what you need right now.")}</h2>
      <p className="mt-2 text-sm text-gray-400">{text("Circa tre minuti, senza fretta. Puoi saltare una domanda o fermarti. Questo spazio non sostituisce una terapia o un servizio di emergenza.", "About three minutes, at your pace. Skip a question or stop whenever you want. This space does not replace therapy or emergency support.")}</p></header>
    <button type="button" onClick={() => setHelp(!help)} aria-expanded={help} className="text-xs underline text-amber-200">{text("Hai bisogno di aiuto urgente?", "Do you need urgent help?")}</button>
    {help && <aside role={urgent ? "alert" : "note"} className="rounded-xl border border-amber-300/40 bg-amber-400/10 p-4 text-sm space-y-2"><p>{text("Se sei in pericolo immediato o potresti farti del male, contatta subito i servizi di emergenza: 112 nell’UE e in Svizzera, oppure il numero locale dove ti trovi. Chiedi a una persona fidata di stare con te.", "If you are in immediate danger or may hurt yourself, contact emergency services now: 112 in the EU and Switzerland, or your local emergency number elsewhere. Ask someone you trust to stay with you.")}</p><p>{text("Questa app non monitora la tua sicurezza e non può inviare soccorsi.", "This app does not monitor your safety and cannot send emergency help.")}</p></aside>}
    {urgent ? <button type="button" onClick={reset} className={button}>{text("Esci dal percorso", "Leave this session")}</button> : <>
      {phase === "start" && <>
        <fieldset className="space-y-2"><legend className="text-sm">{text("Cosa cerchi in questo momento?", "What do you need right now?")}</legend><div className="grid gap-2 sm:grid-cols-3">{([
          ["vent", text("Sfogarmi", "Let it out"), text("Essere ascoltato, senza soluzioni imposte.", "Be heard, without imposed solutions.")],
          ["understand", text("Capire", "Understand"), text("Mettere a fuoco ciò che sento.", "Make sense of what I feel.")],
          ["calm", text("Ritrovare calma", "Find calm"), text("Rallentare, senza dover fare tutto.", "Slow down, without having to do everything.")],
        ] as const).map(([id, title, detail]) => <button type="button" key={id} disabled={busy} aria-pressed={mode === id} onClick={() => setMode(id)} className={`rounded-xl border p-3 text-left ${mode === id ? "border-emerald-300 bg-emerald-400/10" : "border-white/15"}`}><span className="block font-medium">{title}</span><span className="mt-1 block text-xs text-gray-400">{detail}</span></button>)}</div></fieldset>
        {score(before, setBefore, text("Quanto ti è chiaro ciò che senti, adesso?", "How clear are you about what you feel right now?"))}
        <button type="button" disabled={busy} className="text-xs underline text-emerald-300" onClick={async () => { setBusy(true); setError(""); try { const data = await call("latest"); setLatest(data.item); if (!data.item) setError(text("Non hai ancora una sintesi salvata.", "You do not have a saved summary yet.")) } catch { setError(text("Non riesco a recuperare la sintesi.", "I cannot retrieve your summary.")) } finally { setBusy(false) } }}>{text("Riprendi l’ultima sintesi salvata", "Revisit your last saved summary")}</button>
        {latest && <aside className="rounded-xl border border-white/15 p-3 space-y-2"><p className="text-sm whitespace-pre-wrap">{latest.summary}</p>{latest.next_step && <p className="text-xs">{text("Avevi scelto: ", "You chose: ")}{latest.next_step}</p>}<button type="button" onClick={() => { setInput(latest.summary.slice(0, 2000)); setLatest(null) }} className="text-xs underline">{text("Usa questa sintesi come punto di partenza", "Use this summary as a starting point")}</button></aside>}
      </>}
      {phase === "dialogue" && <div className="space-y-3" aria-live="polite">{messages.map((m, i) => <p key={i} className={`rounded-xl p-3 text-sm whitespace-pre-wrap ${m.role === "user" ? "bg-white/5" : "bg-emerald-400/10"}`}><span className="sr-only">{m.role === "user" ? text("Tu: ", "You: ") : "MyndSelf: "}</span>{m.content}</p>)}<p className="text-xs text-gray-400">{text("Puoi rispondere, saltare la domanda e chiudere, oppure uscire senza salvare.", "Reply, skip the question and close, or leave without saving.")}</p></div>}
      {phase !== "close" && <><label className="block text-sm space-y-2"><span>{phase === "start" ? text("Come stai? Da dove vuoi partire?", "How are you? Where would you like to start?") : text("Solo quello che ti va di condividere", "Only what you feel like sharing")}</span><textarea className={field} rows={3} maxLength={2000} value={input} onChange={e => setInput(e.target.value)} disabled={busy} /></label><div className="flex flex-wrap gap-3"><button type="button" className={button} disabled={busy || !input.trim()} onClick={() => send()}>{busy ? text("Un momento…", "One moment…") : phase === "start" ? text("Inizia il mio momento", "Start my moment") : text("Continua", "Continue")}</button>{phase === "dialogue" && <button type="button" disabled={busy} onClick={() => send(true)} className="text-sm underline">{text("Chiudi qui e prepara la sintesi", "Close here and prepare a summary")}</button>}<button type="button" onClick={reset} className="text-xs underline">{text("Esci senza salvare", "Leave without saving")}</button></div></>}
      {phase === "close" && <><p className="text-sm text-gray-400">{text("Questa sintesi è una proposta: correggila perché ti rappresenti. Verrà salvata solo se lo scegli, insieme alle valutazioni facoltative; il dialogo non viene salvato e non alimenta la memoria AI.", "This summary is a proposal: edit it so it reflects you. It is saved only if you choose, together with optional ratings; the conversation is not saved or added to AI memory.")}</p><label className="block text-sm space-y-2"><span>{text("La mia sintesi", "My summary")}</span><textarea className={field} rows={4} maxLength={2500} disabled={saved || busy} value={summary} onChange={e => setSummary(e.target.value)} /></label><label className="block text-sm space-y-2"><span>{text("Un piccolo passo che scelgo io (facoltativo)", "A small step I choose (optional)")}</span><input className={field} maxLength={500} disabled={saved || busy} value={nextStep} onChange={e => setNextStep(e.target.value)} /></label>
        {score(after, setAfter, text("Quanto ti è chiaro ciò che senti, ora?", "How clear are you about what you feel now?"))}
        <fieldset><legend className="mb-2 text-sm">{text("Ti sei sentito compreso? (Facoltativo)", "Did you feel understood? (Optional)")}</legend><div className="flex gap-3">{["yes", "partly", "no"].map((value, i) => <button type="button" key={value} disabled={saved || busy} aria-pressed={understood === value} onClick={() => setUnderstood(understood === value ? null : value)} className={`rounded-lg border px-3 py-2 text-sm ${understood === value ? "border-emerald-300" : "border-white/15"}`}>{[text("Sì", "Yes"), text("In parte", "Partly"), text("No", "No")][i]}</button>)}</div></fieldset>
        {saved ? <p role="status" className="text-emerald-300">{text("Sintesi salvata. Potrai riprenderla quando vorrai.", "Summary saved. Revisit it whenever you want.")}</p> : <button type="button" className={button} disabled={busy || !summary.trim()} onClick={async () => { setBusy(true); setError(""); try { await call("save", { client_id: clientId, mode, summary, next_step: nextStep, clarity_before: before, clarity_after: after, understood }); setSaved(true) } catch { setError(text("La sintesi non è stata salvata. Puoi riprovare: il testo è ancora qui.", "Summary was not saved. Retry: your text is still here.")) } finally { setBusy(false) } }}>{busy ? text("Salvataggio…", "Saving…") : text("Salva la mia sintesi", "Save my summary")}</button>}
        <button type="button" onClick={reset} className="ml-3 text-xs underline">{text("Termina", "Finish")}</button>
      </>}
    </>}
    {error && <p role="alert" className="text-sm text-rose-300">{error}</p>}
  </section>
}
