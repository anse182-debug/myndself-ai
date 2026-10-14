import { safeLog } from './observability.js'

export function monthlyBudget(value) {
  if (value === undefined || value === '') return null
  if (!/^\d+(?:\.\d{1,2})?$/.test(value)) throw new Error('invalid_ai_budget_configuration')
  const amount = Math.round(Number(value) * 1e6)
  if (!Number.isSafeInteger(amount) || amount <= 0 || amount > 1e9) throw new Error('invalid_ai_budget_configuration')
  return amount
}

// Internal conservative units, not an OpenAI invoice estimate. Assumes text-only
// gpt-4o-mini and text-embedding-3-small. Revalidate before adding/changing models.
export function estimateReservation(kind, params) {
  if (kind === 'chat' && (params.model !== 'gpt-4o-mini' || params.stream || params.n > 1 || params.tools || params.functions || params.response_format?.type === 'json_schema')) throw new Error('unsupported_budget_request')
  if (kind === 'embedding' && params.model !== 'text-embedding-3-small') throw new Error('unsupported_budget_request')
  const input = kind === 'chat' ? params.messages : params.input
  if (kind === 'chat' && (!Array.isArray(input) || input.some(m => typeof m.content !== 'string'))) throw new Error('unsupported_budget_request')
  if (kind === 'embedding' && !(typeof input === 'string' || (Array.isArray(input) && input.every(x => typeof x === 'string')))) throw new Error('unsupported_budget_request')
  const output = kind === 'chat' ? (params.max_completion_tokens ?? params.max_tokens ?? 512) : 0
  if (!Number.isInteger(output) || output < 0 || output > 4096 || (kind === 'chat' && output === 0)) throw new Error('unsupported_budget_request')
  // UTF-8 bytes plus framing allowance upper-bound text tokenization conservatively.
  const bytes = Buffer.byteLength(JSON.stringify(input)) + 1024 + (Array.isArray(input) ? input.length * 64 : 0)
  return { cost: bytes + 2 * output, output }
}

export function budgetedOpenAI({ client, supabase, limit }) {
  if (limit === null) return client
  async function invoke(kind, params, options = {}) {
    const { cost, output } = estimateReservation(kind, params)
    const signal = options.signal ? AbortSignal.any([options.signal, AbortSignal.timeout(20000)]) : AbortSignal.timeout(20000)
    signal.throwIfAborted()
    const { data: month, error } = await supabase.rpc('reserve_ai_budget', { p_cost: cost, p_limit: limit }).abortSignal(AbortSignal.any([signal, AbortSignal.timeout(5000)]))
    if (error || !month) {
      safeLog.warn('ai_budget_reservation_failed')
      throw new Error('ai_budget_unavailable')
    }
    signal.throwIfAborted()
    const config = kind === 'chat' ? { ...params, store: false, ...(params.max_completion_tokens === undefined ? { max_tokens: output } : {}) } : params
    const target = kind === 'chat' ? client.chat.completions : client.embeddings
    const result = await target.create(config, { ...options, maxRetries: 0, timeout: Math.min(options.timeout || 20000, 20000), signal })
    const inputTokens = result.usage?.prompt_tokens ?? result.usage?.total_tokens ?? 0
    const outputTokens = result.usage?.completion_tokens ?? 0
    // Reporting must not delay or discard a successful user response.
    void (async () => {
      try {
        const r = await supabase.rpc('record_ai_usage', { p_month: month, p_input: inputTokens, p_output: outputTokens }).abortSignal(AbortSignal.timeout(5000))
        if (r.error) safeLog.warn('ai_usage_record_failed')
      } catch { safeLog.warn('ai_usage_record_failed') }
    })()
    return result
  }
  return { chat: { completions: { create: (p, o) => invoke('chat', p, o) } }, embeddings: { create: (p, o) => invoke('embedding', p, o) } }
}
