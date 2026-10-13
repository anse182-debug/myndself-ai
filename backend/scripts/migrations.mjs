import fs from 'node:fs/promises'
import crypto from 'node:crypto'
import assert from 'node:assert/strict'
const ref = 'weqoitbeyryuznclnzzr' // Mutations are deliberately restricted to test.
const command = process.argv[2] || 'check'
assert.ok(['check', 'adopt', 'apply'].includes(command), 'Use check, adopt or apply')
assert.ok(process.env.SUPABASE_ACCESS_TOKEN, 'Missing SUPABASE_ACCESS_TOKEN')
async function api(path, method='GET', body) {
  const r = await fetch(`https://api.supabase.com/v1/projects/${ref}${path}`, {method,headers:{Authorization:`Bearer ${process.env.SUPABASE_ACCESS_TOKEN}`,'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body),signal:AbortSignal.timeout(60000)})
  if(!r.ok) throw new Error(`Migration API HTTP ${r.status}; no response body logged`)
  return r.json()
}
const query = sql => api('/database/query','POST',{query:sql})
const hash = text => crypto.createHash('sha256').update(text).digest('hex')
const literal = text => "'"+text.replaceAll("'","''")+"'"
function canonical(value) {
  if(Array.isArray(value)) return value.map(canonical)
  if(value && typeof value==='object') return Object.fromEntries(Object.keys(value).sort().map(k=>[k,canonical(value[k])]))
  return value
}
const fingerprint = rows => hash(JSON.stringify([...new Set(rows.map(r=>JSON.stringify(canonical(r))))].sort()))
const project = await api('')
assert.equal(project.name,'myndself-test','Refusing any project other than test')
const sql = await fs.readFile(new URL('../schema/introspection.sql',import.meta.url),'utf8')
const expected = JSON.parse(await fs.readFile(new URL('../schema/expected-test.json',import.meta.url),'utf8'))
const expectedHash = fingerprint(expected)
const files = (await fs.readdir(new URL('../migrations/',import.meta.url))).filter(f=>/^\d{3}_[a-z_]+\.sql$/.test(f)).sort()
const migrations = await Promise.all(files.map(async name=>{const source=await fs.readFile(new URL('../migrations/'+name,import.meta.url),'utf8');return {name,source,checksum:hash(source)}}))
const init = `create schema if not exists app_private;
revoke all on schema app_private from public, anon, authenticated;
create table if not exists app_private.schema_migrations (name text primary key, checksum text not null, applied_at timestamptz not null default now(), adopted boolean not null default false);
create table if not exists app_private.schema_state (id boolean primary key default true check(id), fingerprint text not null);
revoke all on all tables in schema app_private from public, anon, authenticated;`
const exists = (await query("select to_regclass('app_private.schema_migrations') is not null as present"))[0].present
const ledger = exists ? await query('select name,checksum from app_private.schema_migrations order by name') : []
for(const entry of ledger) assert.equal(migrations.find(m=>m.name===entry.name)?.checksum,entry.checksum,`Changed or removed migration: ${entry.name}`)
const actualRows = await query(sql)
const actualHash = fingerprint(actualRows)
if(command==='adopt') {
  assert.equal(ledger.length,0,'Ledger already populated; use check')
  assert.equal(actualHash,expectedHash,'Schema drift: adoption refused')
  assert.deepEqual(files,['000_baseline.sql','001_reflection_sessions.sql'],'Adopt only the two verified existing migrations')
  await query(`begin; select pg_advisory_xact_lock(182,1); ${init}
  create temporary table adoption_observed on commit drop as ${sql.trim().replace(/;$/, '')};
  do $verify$ begin if exists(
    (select kind,name,definition from adoption_observed except select kind,name,definition from jsonb_to_recordset(${literal(JSON.stringify(expected))}::jsonb) as x(kind text,name text,definition jsonb))
    union all
    (select kind,name,definition from jsonb_to_recordset(${literal(JSON.stringify(expected))}::jsonb) as x(kind text,name text,definition jsonb) except select kind,name,definition from adoption_observed)
  ) then raise exception 'Schema mismatch during adoption'; end if; end $verify$;
  do $$ begin if exists(select 1 from app_private.schema_migrations) then raise exception 'Already adopted'; end if; end $$;
  insert into app_private.schema_migrations(name,checksum,adopted) values ${migrations.map(m=>`(${literal(m.name)},${literal(m.checksum)},true)`).join(',')};
  insert into app_private.schema_state(id,fingerprint) values(true,${literal(expectedHash)}); commit;`)
  console.log('Existing test schema adopted; migration SQL was not replayed.')
} else {
  assert.ok(exists,'No ledger: verify schema and run adopt on existing test')
  const state=await query('select fingerprint from app_private.schema_state where id=true')
  assert.equal(state[0]?.fingerprint,actualHash,'Schema drift: database differs from last verified state')
  const pending=migrations.filter(m=>!ledger.some(e=>e.name===m.name))
  if(command==='check') {
    assert.equal(actualHash,expectedHash,'Schema differs from committed reference')
    assert.equal(pending.length,0,'Pending migrations; apply required')
    console.log(`Schema and ${ledger.length} migration checksums verified.`)
  } else {
    if(!pending.length) {console.log('No pending migrations.');process.exit(0)}
    for(const m of pending) assert.ok(!/\b(begin|commit|rollback)\b|\bconcurrently\b/i.test(m.source),'Migration must be transaction-compatible without transaction control')
    const selectSchema = sql.trim().replace(/;$/, '')
    const compare = (table, rows) => `do $verify$ begin if exists(
      (select kind,name,definition from ${table} except select kind,name,definition from jsonb_to_recordset(${literal(JSON.stringify(rows))}::jsonb) as x(kind text,name text,definition jsonb))
      union all
      (select kind,name,definition from jsonb_to_recordset(${literal(JSON.stringify(rows))}::jsonb) as x(kind text,name text,definition jsonb) except select kind,name,definition from ${table})
    ) then raise exception 'Schema mismatch'; end if; end $verify$;`
    await query(`begin; select pg_advisory_xact_lock(182,1); lock table app_private.schema_migrations in exclusive mode;
      create temporary table migration_before on commit drop as ${selectSchema};
      ${compare('migration_before',actualRows)}
      ${pending.map(m=>`${m.source}\ninsert into app_private.schema_migrations(name,checksum) values(${literal(m.name)},${literal(m.checksum)});`).join('\n')}
      create temporary table migration_after on commit drop as ${selectSchema};
      ${compare('migration_after',expected)}
      update app_private.schema_state set fingerprint=${literal(expectedHash)} where id=true;
      commit;`)
    console.log(`Applied ${pending.length} migrations atomically and verified final schema.`)
  }
}
