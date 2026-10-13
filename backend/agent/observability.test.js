import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import {spawnSync} from 'node:child_process'
import Fastify from 'fastify'
import {createSafeLogger,registerObservability} from './observability.js'
const secret='SENSITIVE_TEST_NOTE user@example.com Bearer synthetic-token'
test('logger discards content, identities, provider bodies, unknown codes and event names',()=>{
  const lines=[];const log=createSafeLogger({write:line=>lines.push(line)})
  log.error(secret,{body:secret,email:secret,token:secret,error:new Error(secret),errorCode:secret,status:503,providerStatus:429,duration_ms:17,stack:secret})
  log.warn('request_failed',{status:NaN,duration_ms:Infinity,providerStatus:secret,errorCode:'23505'})
  assert.equal(lines.length,2)
  assert.doesNotMatch(lines.join(''),/SENSITIVE_TEST_NOTE|user@example|synthetic-token/)
  assert.equal(JSON.parse(lines[0]).event,'unknown_event');assert.equal(JSON.parse(lines[0]).status,503)
  assert.equal(JSON.parse(lines[1]).error_code,'23505');assert.equal(JSON.parse(lines[1]).status,undefined)
})
test('diagnostic sink failures do not break application work',()=>{
  const log=createSafeLogger({write:()=>{throw Error('sink failed')}})
  assert.doesNotThrow(()=>log.error('request_failed'))
})
test('fatal failures exit without printing rejection messages or stacks',()=>{
  const module=new URL('./observability.js',import.meta.url).href
  for(const failure of ["throw new Error('SENSITIVE_TEST_NOTE')", "Promise.reject(new Error('SENSITIVE_TEST_NOTE'))"]){
    const source=`import {registerProcessDiagnostics} from ${JSON.stringify(module)}; registerProcessDiagnostics(); setImmediate(()=>{${failure}})`
    const result=spawnSync(process.execPath,['--input-type=module','-e',source],{encoding:'utf8',env:{}})
    assert.equal(result.status,1);assert.match(result.stderr,/process_(uncaught_exception|unhandled_rejection)/)
    assert.doesNotMatch(result.stderr,/SENSITIVE_TEST_NOTE|Error:| at /)
  }
})
test('concurrent errors correlate by server IDs while parameters and forged headers remain absent',async t=>{
  const app=Fastify({logger:false});t.after(()=>app.close())
  const lines=[];const logger=createSafeLogger({write:line=>lines.push(JSON.parse(line)),routes:new Set(['/api/items/:id'])})
  const telemetry=registerObservability(app,{logger,intervalMs:60000})
  app.get('/health',()=>({ok:true}))
  app.get('/api/items/:id',async()=>{await Promise.resolve();logger.warn('request_rejected',{body:secret});throw new Error(secret)})
  const responses=await Promise.all(['first','second'].map(id=>app.inject({url:`/api/items/${id}?token=${encodeURIComponent(secret)}`,headers:{authorization:secret,'x-request-id':secret,cookie:secret}})))
  for(const response of responses){assert.equal(response.statusCode,500);assert.match(response.headers['x-request-id'],/^[a-f0-9-]{36}$/);assert.equal(response.json().request_id,response.headers['x-request-id']);assert.doesNotMatch(response.body,/SENSITIVE_TEST_NOTE/)}
  assert.notEqual(responses[0].headers['x-request-id'],responses[1].headers['x-request-id'])
  const errors=lines.filter(l=>l.event==='request_failed');assert.equal(errors.length,2)
  for(const response of responses)assert.ok(errors.some(l=>l.request_id===response.headers['x-request-id']&&l.route==='/api/items/:id'))
  await app.inject('/health');telemetry.flush()
  const metrics=lines.find(l=>l.event==='request_metrics');assert.equal(metrics.requests,2);assert.equal(metrics.server_errors,2)
  assert.ok(Number.isFinite(metrics.max_duration_ms))
  assert.doesNotMatch(JSON.stringify(lines),/SENSITIVE_TEST_NOTE|user@example|synthetic-token|\?token|"first"|"second"/)
})
test('unknown routes never log raw URLs and handled 429 is included in counters',async t=>{
  const app=Fastify({logger:false});t.after(()=>app.close());const lines=[]
  const logger=createSafeLogger({write:line=>lines.push(JSON.parse(line)),routes:new Set(['/limited'])})
  const {flush}=registerObservability(app,{logger})
  app.get('/limited',async(_,reply)=>reply.code(429).send({error:'request_limit'}))
  await app.inject('/limited');await app.inject('/'+encodeURIComponent(secret));flush()
  const metrics=lines.find(l=>l.event==='request_metrics');assert.equal(metrics.rate_limited,1);assert.equal(metrics.client_errors,2)
  assert.doesNotMatch(JSON.stringify(lines),/SENSITIVE_TEST_NOTE|user@example|synthetic-token/)
})
test('sufficient traffic with five percent server errors emits a degradation signal',async t=>{
  const app=Fastify({logger:false});t.after(()=>app.close());const lines=[]
  const logger=createSafeLogger({write:line=>lines.push(JSON.parse(line))})
  const {flush}=registerObservability(app,{logger})
  app.get('/ok',()=>({ok:true}));app.get('/fail',async(_,reply)=>reply.code(503).send({error:'unavailable'}))
  for(let i=0;i<19;i++)await app.inject('/ok')
  await app.inject('/fail');flush()
  const degradation=lines.find(l=>l.event==='service_error_rate_high')
  assert.equal(degradation.requests,20);assert.equal(degradation.server_errors,1)
  assert.equal(degradation.request_id,undefined)
})
test('empty windows reach the monitor without logging false recovery or request metrics',async t=>{
  const app=Fastify({logger:false});t.after(()=>app.close());const windows=[],lines=[]
  const logger=createSafeLogger({write:line=>lines.push(JSON.parse(line))})
  const {flush}=registerObservability(app,{logger,onWindow:summary=>windows.push(summary)})
  flush();await Promise.resolve()
  assert.equal(windows.length,1);assert.equal(windows[0].requests,0);assert.equal(lines.length,0)
})
test('runtime code cannot bypass the approved logging sinks',async()=>{
  const root=new URL('../../',import.meta.url)
  const server=await fs.readFile(new URL('backend/index.js',root),'utf8')
  assert.doesNotMatch(server,/console\.(log|warn|error|info)\s*\(|req\.log/)
  async function inspect(dir){for(const item of await fs.readdir(dir,{withFileTypes:true})){const path=new URL(item.name+(item.isDirectory()?'/':''),dir);if(item.isDirectory())await inspect(path);else if(/\.(tsx?|js)$/.test(item.name)&&item.name!=='clientLog.ts')assert.doesNotMatch(await fs.readFile(path,'utf8'),/console\.(log|warn|error|info)\s*\(/)}}
  await inspect(new URL('frontend/src/',root))
})
