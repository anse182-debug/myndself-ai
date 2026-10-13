import fs from 'node:fs/promises'
import crypto from 'node:crypto'
import assert from 'node:assert/strict'
const ref = 'weqoitbeyryuznclnzzr' // Explicitly the separate test project, never production.
const management = { Authorization: `Bearer ${process.env.SUPABASE_ACCESS_TOKEN}`, 'Content-Type': 'application/json' }
async function call(path, method = 'GET', body) {
  const r = await fetch(`https://api.supabase.com/v1/projects/${ref}${path}`, { method, headers: management, body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(60000) })
  if (!r.ok) throw new Error(`Management API HTTP ${r.status}`)
  return r.json()
}
async function query(sql) { return call('/database/query', 'POST', { query: sql }) }
const project = await call('')
assert.equal(project.name, 'myndself-test', 'Refuse any project not identified as the test project')
const keys = await call('/api-keys')
const service = keys.find(k => k.name === 'service_role')?.api_key
assert.ok(service)
const admin = { apikey: service, Authorization: `Bearer ${service}`, 'Content-Type': 'application/json' }
const base = `https://${ref}.supabase.co`
const schema = 'restore_drill_' + crypto.randomBytes(8).toString('hex')
let userId
try {
  const sql = await fs.readFile(new URL('../migrations/000_baseline.sql', import.meta.url), 'utf8')
  const restore = sql.replaceAll('public.', `${schema}.`).replace('begin;', `begin; create schema ${schema}; set local search_path = ${schema}, extensions, public;`)
  await query(restore)
  console.log('Application baseline schema restored into isolated scratch schema.')
  const r = await fetch(base + '/auth/v1/admin/users', { method: 'POST', headers: admin, body: JSON.stringify({ email: `restore-${crypto.randomUUID()}@example.com`, password: crypto.randomBytes(32).toString('hex'), email_confirm: true }) })
  assert.equal(r.status, 200); userId = (await r.json()).id
  assert.match(userId, /^[0-9a-f-]{36}$/)
  await query(`insert into ${schema}.mood_entries (user_id,mood,note,at) values ('${userId}','calmo','Synthetic restore drill',now());`)
  const snapshot = await query(`select * from ${schema}.mood_entries where user_id='${userId}';`)
  assert.equal(snapshot.length, 1)
  const backup = JSON.stringify(snapshot).replaceAll("'", "''")
  await query(`create table ${schema}.restored_entries (like ${schema}.mood_entries including all); insert into ${schema}.restored_entries select * from json_populate_recordset(null::${schema}.restored_entries, '${backup}'::json);`)
  const result = await query(`select count(*)::int as rows, bool_and(to_jsonb(a)=to_jsonb(b)) as identical from ${schema}.mood_entries a join ${schema}.restored_entries b using(id);`)
  assert.equal(result[0].rows, 1); assert.equal(result[0].identical, true)
  console.log('Serialized synthetic row backup restored identically (1 row).')
} finally {
  await query(`drop schema if exists ${schema} cascade;`)
  if (userId) {
    const r = await fetch(base + '/auth/v1/admin/users/' + userId, { method: 'DELETE', headers: admin })
    assert.equal(r.status, 200)
  }
  console.log('Scratch schema and synthetic user removed.')
}
