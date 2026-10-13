import assert from 'node:assert/strict'
import {execFileSync} from 'node:child_process'
import {verifyRun, protection, requiredJobs} from './release-policy.mjs'
const args=process.argv.slice(2)
assert.ok(args.every(a=>['--apply','--reviews=0','--reviews=1'].includes(a)),'Unknown argument')
assert.ok(!(args.includes('--reviews=0')&&args.includes('--reviews=1')),'Choose one review policy')
const reviews=args.includes('--reviews=1')?1:0
const token=process.env.MYNDSELF_GITHUB_TOKEN || process.env.GH_TOKEN
assert.ok(token,'Missing usable GitHub API credential')
const sha=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim()
const base='https://api.github.com/repos/anse182-debug/myndself-ai'
async function api(path,method='GET',body,allow404=false) {
  const response=await fetch(base+path,{method,headers:{Authorization:`Bearer ${token}`,Accept:'application/vnd.github+json','Content-Type':'application/json','X-GitHub-Api-Version':'2022-11-28'},body:body===undefined?undefined:JSON.stringify(body),signal:AbortSignal.timeout(30000)})
  if(allow404 && response.status===404)return null
  if(!response.ok)throw Error(`GitHub API HTTP ${response.status}; endpoint ${path.split('?')[0]}`)
  return response.json()
}
const repo=await api('')
assert.equal(repo.full_name,'anse182-debug/myndself-ai')
assert.equal(repo.default_branch,'main','Unexpected default branch')
const branch=await api('/branches/staging%2Fai-memory')
assert.equal(branch.commit.sha,sha,'Local commit must match the current remote staging branch')
const runs=await api('/actions/workflows/checks.yml/runs?branch=staging%2Fai-memory&per_page=50')
const run=runs.workflow_runs.find(r=>r.head_sha===sha)
assert.ok(run,'No CI run found for the current commit')
const jobs=(await api(`/actions/runs/${run.id}/jobs?filter=latest&per_page=100`)).jobs
verifyRun(run,jobs,sha)
const checkRuns=(await api(`/commits/${sha}/check-runs?filter=latest&per_page=100`)).check_runs
const checks=requiredJobs.map(name=>{
  const job=jobs.find(j=>j.name===name)
  const check=checkRuns.find(c=>c.url===job.check_run_url)
  assert.ok(check && check.app?.slug==='github-actions','Check must originate from the verified Actions job')
  assert.equal(check.head_sha,sha)
  assert.equal(check.conclusion,'success')
  return {context:name,app_id:check.app.id}
})
const existing=await api('/branches/main/protection','GET',undefined,true)
const plan=protection(checks,reviews)
console.log(JSON.stringify({sha,ci:run.html_url,ciVerified:true,branch:'main',existingProtection:!!existing,plan},null,2))
if(args.includes('--apply')) {
  assert.equal(repo.permissions?.admin,true,'Repository administration permission required')
  assert.equal(existing,null,'Existing protection found: preserve and review it rather than overwrite')
  const protectedBranch=await api('/branches/main/protection','PUT',plan)
  assert.equal(protectedBranch.required_status_checks.strict,true)
  assert.equal(protectedBranch.enforce_admins.enabled,true)
  const verified=await api('/branches/main/protection')
  assert.equal(verified.required_status_checks.strict,true)
  assert.equal(verified.enforce_admins.enabled,true)
  assert.equal(verified.required_pull_request_reviews.required_approving_review_count,reviews)
  for(const check of checks) assert.ok(verified.required_status_checks.checks.some(c=>c.context===check.context&&c.app_id===check.app_id))
  assert.equal(verified.allow_force_pushes.enabled,false)
  assert.equal(verified.allow_deletions.enabled,false)
  assert.equal(verified.required_conversation_resolution.enabled,true)
  console.log('Main branch protection applied and read back successfully.')
}
