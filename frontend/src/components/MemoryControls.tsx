import { useEffect, useState } from "react"

export type MemoryItem = { id: string | number; content: string; source: string }

export default function MemoryControls({ token, apiBase, enabled, onChange, language }: {
  token: string; apiBase: string; enabled: boolean; onChange: (value: boolean) => void; language: string
}) {
  const [items, setItems] = useState<MemoryItem[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(false)
  const [open, setOpen] = useState(false)
  const en = language === "en"
  useEffect(() => {
    if (!open) return
    const controller = new AbortController()
    setBusy(true)
    setError(false)
    fetch(`${apiBase}/api/memory`, {
      headers: { Authorization: `Bearer ${token}` }, signal: controller.signal,
    }).then(async res => {
      if (!res.ok) throw new Error("memory_unavailable")
      const data = await res.json()
      if (!controller.signal.aborted) setItems(data.items)
    }).catch(() => {
      if (!controller.signal.aborted) setError(true)
    }).finally(() => {
      if (!controller.signal.aborted) setBusy(false)
    })
    return () => controller.abort()
  }, [open, token, apiBase])

  async function remove(id: string | number) {
    if (!window.confirm(en ? "Remove this text from AI memory? Your journal stays unchanged." : "Rimuovere questo testo dalla memoria AI? Il diario resta invariato.")) return
    setBusy(true)
    setError(false)
    try {
      const res = await fetch(`${apiBase}/api/memory/${encodeURIComponent(id)}`, {
        method: "DELETE", headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error("memory_delete_failed")
      setItems(current => current.filter(item => item.id !== id))
    } catch { setError(true) } finally { setBusy(false) }
  }

  return <section className="max-w-6xl mx-auto px-4 sm:px-6 mb-4">
    <div className="rounded-2xl border border-white/10 bg-gray-900/70 p-4 space-y-3">
      <label className="flex items-center gap-3 text-sm">
        <input type="checkbox" checked={enabled} onChange={e => onChange(e.target.checked)} />
        {en ? "Use my texts as AI memory" : "Usa i miei testi come memoria AI"}
      </label>
      <p className="text-xs text-gray-400">{en
        ? "Off by default on this device. When enabled, daily reflections and chat save your texts; chat can retrieve them. Turning it off stops saving and retrieval, without deleting stored memories. The current conversation remains in context."
        : "Disattivata per impostazione predefinita su questo dispositivo. Quando attiva, riflessioni quotidiane e chat memorizzano i tuoi testi; la chat può recuperarli. Disattivarla interrompe salvataggio e recupero, senza eliminare i ricordi salvati. La conversazione corrente resta nel contesto."}</p>
      <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} className="text-xs text-emerald-300 underline">
        {en ? "Manage saved memory" : "Gestisci la memoria salvata"}
      </button>
      {open && <div className="space-y-2">
        <p className="text-xs text-gray-400">{en ? "Up to 100 stored texts. Removing one affects future retrieval, not your journal or existing replies. Older AI-generated texts may appear here but are excluded from retrieval." : "Fino a 100 testi salvati. Rimuoverne uno cambia i recuperi futuri, non il diario o le risposte già ricevute. I vecchi testi generati dall’AI possono apparire qui, ma sono esclusi dal recupero."}</p>
        {busy && <p role="status">{en ? "Loading…" : "Operazione in corso…"}</p>}
        {error && <p role="alert" className="text-sm text-rose-300">{en ? "Memory could not be loaded or updated. Close and reopen to retry." : "Non è stato possibile caricare o aggiornare la memoria. Chiudi e riapri per riprovare."}</p>}
        {!busy && !error && !items.length && <p className="text-sm">{en ? "No saved memories." : "Nessun ricordo salvato."}</p>}
        {items.map(item => <div key={item.id} className="rounded-lg border border-white/10 p-3 space-y-2">
          <p className="text-sm whitespace-pre-wrap break-words">{item.content}</p>
          <button type="button" disabled={busy} onClick={() => remove(item.id)} className="text-xs text-rose-300 disabled:opacity-50">{en ? "Remove from memory" : "Rimuovi dalla memoria"}</button>
        </div>)}
      </div>}
    </div>
  </section>
}
