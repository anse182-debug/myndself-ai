import test from 'node:test'
import assert from 'node:assert/strict'
import {createAlertController,createEmailAlertSender,configuredAlerts} from './alerts.js'
const bad={requests:20,server_errors:1,client_errors:0,rate_limited:0,slow:0,max_duration_ms:100,window_seconds:60}
const good={...bad,server_errors:0}
const quietLogger={info(){},warn(){}}
test('deduplicates incident, sends later reminder and requires two healthy windows for recovery',async()=>{
  let time=0;const sent=[];const {observe}=createAlertController({send:async a=>sent.push(a),now:()=>time,logger:quietLogger})
  await observe(bad);await observe(bad);assert.equal(sent.length,1)
  time=30*60*1000;await observe(bad);assert.equal(sent.length,2)
  assert.equal(sent[0].incident,sent[1].incident);assert.notEqual(sent[0].notification,sent[1].notification)
  await observe(good);assert.equal(sent.length,2);await observe(good);assert.equal(sent[2].kind,'recovered')
  await observe(good);assert.equal(sent.length,3)
})
test('failed delivery backs off and retries the same payload and idempotency identity',async()=>{
  let time=0;const attempts=[];let fail=true
  const {observe}=createAlertController({now:()=>time,logger:quietLogger,send:async a=>{attempts.push(a);if(fail)throw Error('PRIVATE provider response')}})
  await observe(bad);await observe(bad);assert.equal(attempts.length,1)
  time=5*60*1000;fail=false;await observe({...bad,server_errors:2})
  assert.equal(attempts.length,2);assert.deepEqual(attempts[0],attempts[1])
})
test('in-flight delivery cannot cause concurrent duplicates',async()=>{
  let release;const pending=new Promise(r=>{release=r});let count=0
  const {observe}=createAlertController({logger:quietLogger,send:async()=>{count++;await pending}})
  const first=observe(bad);await observe(bad);assert.equal(count,1);release();await first
})
test('low traffic and invalid input do not alert or claim recovery',async()=>{
  const sent=[];const {observe}=createAlertController({logger:quietLogger,send:async a=>sent.push(a)})
  await observe({...bad,requests:19});await observe({...bad,requests:NaN});await observe({...bad,server_errors:21});assert.equal(sent.length,0)
  await observe(bad);await observe({...good,requests:0});await observe({...good,requests:0});assert.equal(sent.length,1)
  await observe(good);await observe({...good,requests:0});await observe(good);assert.equal(sent.length,1)
  await observe(good);assert.equal(sent.length,2)
})
test('email contains only aggregate fields, fixed destination and no supplied user text',async()=>{
  let request
  const send=createEmailAlertSender({apiKey:'synthetic',to:'operator@example.com',from:'MyndSelf <info@example.com>',fetcher:async(url,options)=>{request={url,options};return {ok:true,json:async()=>({id:'accepted'})}}})
  await send({kind:'degraded',incident:'synthetic-id',notification:'synthetic-notification',environment:'test',metrics:{...bad,email:'PRIVATE_EMAIL',note:'PRIVATE_JOURNAL',authorization:'PRIVATE_TOKEN'}})
  const payload=JSON.parse(request.options.body);assert.deepEqual(payload.to,['operator@example.com'])
  assert.doesNotMatch(request.options.body,/PRIVATE_EMAIL|PRIVATE_JOURNAL|PRIVATE_TOKEN/)
  assert.match(request.options.headers['Idempotency-Key'],/synthetic-notification/)
  assert.match(payload.subject,/test/)
})
test('alerting is disabled unless explicitly configured and invalid config fails closed',()=>{
  assert.equal(configuredAlerts({MONITOR_TO:'operator@example.com'}),undefined)
  assert.throws(()=>createEmailAlertSender({apiKey:'synthetic',to:'bad\naddress',from:'sender'}))
})
