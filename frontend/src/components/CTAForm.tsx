import { useState } from 'react'

export function CTAForm({ compact, apiBase = '' }: { compact?: boolean; apiBase?: string }) {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle'|'ok'|'err'|'loading'>('idle')

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setStatus('err'); return }
    try {
      setStatus('loading')
      const res = await fetch(`${apiBase}/api/subscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      })
      if (!res.ok) throw new Error()
      setStatus('ok'); setEmail('')
    } catch {
      setStatus('err')
    }
  }

  return (
    <form onSubmit={submit} className={`flex ${compact ? 'flex-col sm:flex-row gap-2' : 'flex-col sm:flex-row gap-3'} w-full`}>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Enter your email"
        className="flex-1 rounded-xl bg-white/5 ring-1 ring-white/10 px-4 py-3 outline-none focus:ring-2 focus:ring-aqua text-mist placeholder:text-mist/50"
        aria-label="Email"
      />
      <button
        type="submit"
        disabled={status==='loading'}
        className="rounded-xl bg-aqua/90 hover:bg-aqua text-dark font-medium px-5 py-3 transition-colors shadow-glow disabled:opacity-70"
      >
        {status==='loading' ? 'Sending…' : 'Get Early Access'}
      </button>
      {status==='ok' && <div className="text-aqua/90 text-sm sm:ml-3">Thanks! We&apos;ll be in touch soon.</div>}
      {status==='err' && <div className="text-red-300 text-sm sm:ml-3">Please enter a valid email.</div>}
    </form>
  )
}
