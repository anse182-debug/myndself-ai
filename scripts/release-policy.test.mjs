import test from 'node:test'
import assert from 'node:assert/strict'
import {verifyRun,protection,requiredJobs} from './release-policy.mjs'
const run={head_sha:'abc',path:'.github/workflows/checks.yml',status:'completed',conclusion:'success',event:'push'}
const jobs=requiredJobs.map(name=>({name,status:'completed',conclusion:'success'}))
test('accepts successful current workflow and every required job',()=>assert.doesNotThrow(()=>verifyRun(run,jobs,'abc')))
test('rejects success from an older commit or another workflow',()=>{
  assert.throws(()=>verifyRun(run,jobs,'def'))
  assert.throws(()=>verifyRun({...run,path:'other.yml'},jobs,'abc'))
})
test('rejects skipped, missing, duplicate or failed required jobs',()=>{
  assert.throws(()=>verifyRun(run,jobs.slice(1),'abc'))
  assert.throws(()=>verifyRun(run,[...jobs,jobs[0]],'abc'))
  for(const conclusion of ['skipped','failure','cancelled'])assert.throws(()=>verifyRun(run,jobs.map(j=>({...j,conclusion})),'abc'))
})
test('binds checks to an app and enforces current-branch checks for administrators',()=>{
  const p=protection(requiredJobs.map(context=>({context,app_id:1})),0)
  assert.equal(p.required_status_checks.strict,true)
  assert.equal(p.enforce_admins,true)
  assert.equal(p.required_pull_request_reviews.required_approving_review_count,0)
  assert.equal(p.allow_force_pushes,false)
})
test('rejects unbound checks and supports one reviewer',()=>{
  assert.throws(()=>protection(requiredJobs.map(context=>({context,app_id:-1}))))
  assert.equal(protection(requiredJobs.map(context=>({context,app_id:1})),1).required_pull_request_reviews.required_approving_review_count,1)
})
