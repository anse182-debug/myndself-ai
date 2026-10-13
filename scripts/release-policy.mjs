import assert from 'node:assert/strict'
export const requiredJobs = ['backend', 'frontend', 'governance']
export function verifyRun(run, jobs, sha) {
  assert.equal(run.head_sha, sha, 'CI must run on the exact current commit')
  assert.equal(run.path, '.github/workflows/checks.yml', 'Unexpected CI workflow')
  assert.equal(run.status, 'completed', 'CI is still running')
  assert.equal(run.conclusion, 'success', 'CI did not pass')
  assert.ok(['push','pull_request'].includes(run.event), 'Unexpected CI event')
  for (const name of requiredJobs) {
    const matches = jobs.filter(j => j.name === name)
    assert.equal(matches.length, 1, `Missing or ambiguous job: ${name}`)
    assert.equal(matches[0].status, 'completed', `${name} still running`)
    assert.equal(matches[0].conclusion, 'success', `${name} failed or skipped`)
  }
}
export function protection(checks, reviews=0) {
  assert.ok([0,1].includes(reviews), 'Reviews must be 0 or 1')
  for (const context of requiredJobs) {
    const match = checks.filter(c => c.context === context)
    assert.equal(match.length, 1, `Missing or ambiguous check: ${context}`)
    assert.ok(Number.isInteger(match[0].app_id) && match[0].app_id > 0, 'Required check must be bound to its GitHub app')
  }
  return {
    required_status_checks: {strict:true,checks},
    enforce_admins:true,
    required_pull_request_reviews:{dismiss_stale_reviews:true,require_code_owner_reviews:false,required_approving_review_count:reviews},
    restrictions:null,
    required_conversation_resolution:true,
    allow_force_pushes:false,
    allow_deletions:false,
  }
}
