import test from 'node:test'
import assert from 'node:assert/strict'
import Fastify from 'fastify'
import {registerPersonalDataRoutes} from './personal-data.js'
import {registerAccessControl} from './security.js'
async function server({fail=false}={}) {
  const app=Fastify();const calls=[];let clock=0
  const authenticate=async(req,reply)=>{const token=req.headers.authorization;const id=token?.includes('alice')?'alice':token==='Bearer bob'?'bob':null;if(!id){reply.code(401).send({error:'unauthorized'});return null}return {id}}
  registerAccessControl(app,authenticate)
  const supabase = { rpc: async (name, params) => {
    calls.push({name, params})
    if (fail) return {error: {message: 'private database details'}}
    return {error: null, data: name === 'export_personal_data' ? {account: {id: params.p_user_id}, mood_entries: [{note: 'own data'}]} : null}
  }}
  registerPersonalDataRoutes(app, {authenticate, now: () => clock, supabase})
  await app.ready();return {app,calls,advance:()=>{clock=300001}}
}
const headers={authorization:'Bearer alice'}
async function challenge(app,h=headers){const r=await app.inject({method:'POST',url:'/api/account/deletion-challenge',headers:h});assert.equal(r.statusCode,200);return r.json().challenge}
test('anonymous export and deletion denied, foreign owner rejected',async t=>{
  const {app,calls}=await server();t.after(()=>app.close())
  assert.equal((await app.inject('/api/account/export')).statusCode,401)
  assert.equal((await app.inject({method:'DELETE',url:'/api/account',payload:{confirmation:'DELETE'}})).statusCode,401)
  assert.equal((await app.inject({method:'GET',url:'/api/account/export?user_id=bob',headers})).statusCode,403)
  assert.equal(calls.length,0)
})
test('export is owner scoped, downloadable and never cacheable',async t=>{
  const {app,calls}=await server();t.after(()=>app.close())
  const r=await app.inject({method:'GET',url:'/api/account/export',headers})
  assert.equal(r.statusCode,200);assert.equal(r.json().account.id,'alice')
  assert.match(r.headers['cache-control'],/no-store/);assert.match(r.headers['content-disposition'],/attachment/)
  assert.deepEqual(calls[0].params,{p_user_id:'alice'})
})
test('deletion requires exact confirmation and challenge bound to user and session',async t=>{
  const {app,calls}=await server();t.after(()=>app.close());const c=await challenge(app)
  for(const [h,p] of [[headers,{confirmation:'DELETE'}],[{authorization:'Bearer bob'},{challenge:c,confirmation:'DELETE'}],[{authorization:'Bearer alice-refreshed'},{challenge:c,confirmation:'DELETE'}],[headers,{challenge:c,confirmation:'wrong'}]])assert.equal((await app.inject({method:'DELETE',url:'/api/account',headers:h,payload:p})).statusCode,400)
  assert.equal(calls.length,0)
  const r=await app.inject({method:'DELETE',url:'/api/account',headers,payload:{challenge:c,confirmation:'DELETE'}})
  assert.equal(r.statusCode,200);assert.equal(r.json().external_copies_removed,false);assert.deepEqual(calls[0].params,{p_user_id:'alice'})
  assert.equal((await app.inject({method:'DELETE',url:'/api/account',headers,payload:{challenge:c,confirmation:'DELETE'}})).statusCode,400)
})
test('expired challenge cannot delete data',async t=>{
  const {app,calls,advance}=await server();t.after(()=>app.close());const c=await challenge(app);advance()
  assert.equal((await app.inject({method:'DELETE',url:'/api/account',headers,payload:{challenge:c,confirmation:'DELETE'}})).statusCode,400);assert.equal(calls.length,0)
})
test('database failure is not presented as deletion or successful empty export',async t=>{
  const {app}=await server({fail:true});t.after(()=>app.close());const c=await challenge(app)
  const r=await app.inject({method:'DELETE',url:'/api/account',headers,payload:{challenge:c,confirmation:'DELETE'}})
  assert.equal(r.statusCode,503);assert.equal(r.json().deleted,undefined);assert.doesNotMatch(r.body,/private database details/)
  assert.equal((await app.inject({method:'GET',url:'/api/account/export',headers})).statusCode,503)
})
