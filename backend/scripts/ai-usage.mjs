// Test-only operational report; no user identifiers or conversation content.
const ref = 'weqoitbeyryuznclnzzr'
if (!process.env.SUPABASE_ACCESS_TOKEN) throw new Error('Missing SUPABASE_ACCESS_TOKEN')
const r = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${process.env.SUPABASE_ACCESS_TOKEN}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ query: 'select month, reserved_microusd / 1000000.0 as reserved_usd, calls as reservations, input_tokens, output_tokens from app_private.ai_budget_months order by month desc limit 12' }),
  signal: AbortSignal.timeout(30000),
})
if (!r.ok) throw new Error(`Usage report HTTP ${r.status}`)
console.log(JSON.stringify(await r.json(), null, 2))
