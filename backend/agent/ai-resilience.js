import { createHash } from 'node:crypto'

// Process-local only: no transcript or completed response is retained.
export function createJourneyRunner({ totalMs = 25000, attemptMs = 8000, capacity = 32, sleep = ms => new Promise(resolve => setTimeout(resolve, ms)) } = {}) {
  const active = new Map()
  return function run(owner, body, work) {
    const key = createHash('sha256').update(JSON.stringify([owner, body])).digest('hex')
    if (active.has(key)) return active.get(key)
    if (active.size >= capacity) return Promise.reject(new Error('ai_capacity'))
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), totalMs)
    let calls = 0
    const generate = async (client, config) => {
      for (let attempt = 0; ; attempt++) {
        if (controller.signal.aborted || calls >= 3) throw new Error('ai_budget')
        calls++
        const signal = AbortSignal.any([controller.signal, AbortSignal.timeout(attemptMs)])
        try {
          return await client.chat.completions.create(config, { maxRetries: 0, timeout: attemptMs, signal })
        } catch (error) {
          // A timed-out request may already have been billed: do not retry it.
          const transient = error?.status === 429 || (error?.status >= 500 && error?.status <= 599) || error?.name === 'APIConnectionError'
          if (attempt || signal.aborted || !transient || error?.name === 'APIConnectionTimeoutError') throw error
          await sleep(300)
        }
      }
    }
    const deadline = new Promise((_, reject) => controller.signal.addEventListener('abort', () => reject(new Error('ai_deadline')), { once: true }))
    const pending = Promise.race([Promise.resolve().then(() => work(generate)), deadline]).finally(() => {
      clearTimeout(timer)
      active.delete(key)
    })
    active.set(key, pending)
    return pending
  }
}
