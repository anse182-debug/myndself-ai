import test from 'node:test'
import assert from 'node:assert/strict'
import {monthlyBudget, estimateReservation, budgetedOpenAI} from './ai-budget.js'
const params={model:'gpt-4o-mini',messages:[{role:'user',content:'Synthetic only'}]}
function fixture(fail=false){
 const calls=[],reservations=[]
 const client={chat:{completions:{create:async(p,o)=>{calls.push({p,o});return {usage:{prompt_tokens:20,completion_tokens:10}}}}},embeddings:{create:async()=>({usage:{total_tokens:5}})}}
 const supabase={rpc:(name,args)=>{reservations.push({name,args});return {abortSignal:async()=>({data:name==='reserve_ai_budget'?'2026-10-01':null,error:fail?{}:null})}}}
 return {client,supabase,calls,reservations,ai:budgetedOpenAI({client,supabase,limit:10000000})}
}
test('configuration rejects invalid limits',()=>{
 assert.equal(monthlyBudget(undefined),null);assert.equal(monthlyBudget('10'),10000000)
 for(const v of ['0','-1','NaN','1001','1.001',' '])assert.throws(()=>monthlyBudget(v))
})
test('unsupported requests fail before reservation',async()=>{
 for(const p of [{...params,model:'other'},{...params,n:2},{...params,stream:true},{...params,messages:[{role:'user',content:[]}]},{...params,max_tokens:10000}]){
 const f=fixture();await assert.rejects(f.ai.chat.completions.create(p));assert.equal(f.reservations.length,0);assert.equal(f.calls.length,0)
 }
})
test('reserve before generation, cap output, disable SDK retry and record only aggregates',async()=>{
 const f=fixture();await f.ai.chat.completions.create(params);await new Promise(r=>setImmediate(r))
 assert.equal(f.reservations[0].name,'reserve_ai_budget');assert.equal(f.reservations[0].args.p_limit,10000000);assert.ok(f.reservations[0].args.p_cost>1024)
 assert.equal(f.calls[0].p.max_tokens,512);assert.equal(f.calls[0].p.store,false);assert.equal(f.calls[0].o.maxRetries,0)
 assert.deepEqual(f.reservations[1].args,{p_month:'2026-10-01',p_input:20,p_output:10});assert.ok(!JSON.stringify(f.reservations).includes('Synthetic'))
})
test('failed reservation prevents provider call',async()=>{
 const f=fixture(true);await assert.rejects(f.ai.chat.completions.create(params),/ai_budget_unavailable/);assert.equal(f.calls.length,0)
})
test('provider errors keep reservations without internal retry',async()=>{
 const f=fixture();f.client.chat.completions.create=async()=>{throw {status:503}}
 await assert.rejects(f.ai.chat.completions.create(params));assert.equal(f.reservations.length,1)
})
test('aborted requests never reserve; embeddings share budget',async()=>{
 const f=fixture(),c=new AbortController();c.abort();await assert.rejects(f.ai.chat.completions.create(params,{signal:c.signal}));assert.equal(f.reservations.length,0)
 await f.ai.embeddings.create({model:'text-embedding-3-small',input:'Synthetic'});assert.equal(f.reservations[0].name,'reserve_ai_budget')
 assert.ok(estimateReservation('chat',{...params,max_tokens:350}).cost>700)
})
test('disabled configuration preserves the existing client',()=>{
 const f=fixture();assert.equal(budgetedOpenAI({client:f.client,supabase:f.supabase,limit:null}),f.client)
})
test('usage reporting failure does not discard successful generation',async()=>{
 const f=fixture();const rpc=f.supabase.rpc
 f.supabase.rpc=(name,args)=>name==='record_ai_usage'?{abortSignal:async()=>{throw Error('synthetic outage')}}:rpc(name,args)
 const result=await f.ai.chat.completions.create(params);assert.equal(result.usage.completion_tokens,10);await new Promise(r=>setImmediate(r))
})
