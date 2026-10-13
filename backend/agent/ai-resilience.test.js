import test from 'node:test'
import assert from 'node:assert/strict'
import { createJourneyRunner } from './ai-resilience.js'
const client = create => ({ chat: { completions: { create } } })
test('duplicates share pending work; different owners and completed requests do not', async () => {
 const run=createJourneyRunner();let calls=0,release;const gate=new Promise(r=>{release=r});const work=async()=>{calls++;await gate;return 'ok'}
 const a=run('a',{},work),b=run('a',{},work),c=run('b',{},work);assert.equal(a,b);assert.notEqual(a,c);release();await Promise.all([a,b,c]);assert.equal(calls,2);await run('a',{},work);assert.equal(calls,3)
})
test('transient failure retries once with SDK retries disabled',async()=>{
 let calls=0;const run=createJourneyRunner({sleep:async()=>{}})
 const result=await run('a',{},g=>g(client(async(_,options)=>{assert.equal(options.maxRetries,0);assert.ok(options.signal);if(++calls===1)throw {status:503};return 'ok'}),{}));assert.equal(result,'ok');assert.equal(calls,2)
})
test('authentication and timeout errors are not retried',async()=>{
 for(const error of [{status:401},{name:'APIConnectionTimeoutError'}]){let calls=0;const run=createJourneyRunner({sleep:async()=>{}});await assert.rejects(run('a',{},g=>g(client(async()=>{calls++;throw error}),{})));assert.equal(calls,1)}
})
test('deadline releases capacity even when work hangs',async()=>{
 const run=createJourneyRunner({totalMs:20,capacity:1});const pending=run('a',{},()=>new Promise(()=>{}));await assert.rejects(run('b',{},async()=>1),/ai_capacity/);await assert.rejects(pending,/ai_deadline/);assert.equal(await run('b',{},async()=>1),1)
})
test('format corrections share the three-call ceiling with retries',async()=>{
 let calls=0;const run=createJourneyRunner({sleep:async()=>{}})
 await assert.rejects(run('a',{},async g=>{const c=client(async()=>{calls++;if(calls===1||calls===3)throw {status:500};return 'ok'});await g(c,{});await g(c,{})}),/ai_budget/);assert.equal(calls,3)
})
