// Read-only metadata inspection. Never exports patient records or API keys.
const refs = { production: 'tmdswrgpmmpjnzfgeewh', test: 'weqoitbeyryuznclnzzr' }
const token = process.env.SUPABASE_ACCESS_TOKEN
if (!token) throw new Error('Missing SUPABASE_ACCESS_TOKEN')
async function get(path) {
  const response = await fetch(`https://api.supabase.com/v1${path}`, {
    headers: { Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(30000),
  })
  if (!response.ok) throw new Error(`Backup metadata request: HTTP ${response.status}`)
  return response.json()
}
const organization = await get('/organizations/fxalljfncsveygxcgkxl')
const projects = await Promise.all(Object.entries(refs).map(async ([environment, ref]) => {
  const metadata = await get(`/projects/${ref}/database/backups`)
  return {
    environment, ref, region: metadata.region,
    pitrEnabled: metadata.pitr_enabled === true,
    listedBackupCount: Array.isArray(metadata.backups) ? metadata.backups.length : null,
    // Internal WAL tooling being enabled does not mean a recoverable backup exists.
  }
}))
console.log(JSON.stringify({ checkedAt: new Date().toISOString(), plan: organization.plan, projects }, null, 2))
if (projects.some(p => p.environment === 'production' && p.listedBackupCount === 0 && !p.pitrEnabled)) {
  console.error('Production has no listed managed backups and PITR is disabled. External backup must be established and restore-tested.')
  process.exitCode = 2
}
