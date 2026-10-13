import crypto from 'node:crypto'
// Use only after getUser has verified this exact bearer token. iat is not
// authentication time: refreshing a session must not renew destructive access.
export function hasRecentAuthentication(req, user, now=Date.now()) {
  try {
    const token=String(req.headers.authorization||'').match(/^Bearer\s+(\S+)$/i)?.[1]
    if(!token || token.split('.').length!==3)return false
    const claims=JSON.parse(Buffer.from(token.split('.')[1],'base64url').toString('utf8'))
    if(claims.sub!==user.id || !Array.isArray(claims.amr))return false
    const seconds=now/1000
    return claims.amr.some(a=>['password','otp','magiclink','oauth','sso/saml'].includes(a.method)
      && Number.isFinite(a.timestamp) && a.timestamp<=seconds+30 && a.timestamp>=seconds-600)
  } catch {return false}
}
export function registerPersonalDataRoutes(app, {supabase, authenticate, now=Date.now}) {
  const confirmations=new Map()
  const tokenHash=req=>crypto.createHash('sha256').update(String(req.headers.authorization||'')).digest('hex')
  const noCache=reply=>reply.header('cache-control','no-store, private').header('pragma','no-cache')
  app.get('/api/account/export',async(req,reply)=>{
    noCache(reply)
    const user=await authenticate(req,reply);if(!user)return reply
    try {
      const {data,error}=await supabase.rpc('export_personal_data',{p_user_id:user.id})
      if(error||!data||data.account?.id!==user.id)return reply.code(503).send({error:'export_failed'})
      const payload=JSON.stringify({...data,scope:'Active application database and account profile. Excludes provider logs, delivered emails, storage files, local device data and backups. Memory vectors and share secrets are omitted.'})
      if(Buffer.byteLength(payload)>10*1024*1024)return reply.code(413).send({error:'export_too_large'})
      return reply.header('content-disposition','attachment; filename="myndself-data.json"').type('application/json').send(payload)
    } catch {return reply.code(503).send({error:'export_failed'})}
  })
  app.post('/api/account/deletion-challenge',async(req,reply)=>{
    noCache(reply)
    const user=await authenticate(req,reply);if(!user)return reply
    if(!hasRecentAuthentication(req,user,now()))return reply.code(403).send({error:'reauthentication_required'})
    for(const [id,c] of confirmations)if(c.expires<=now())confirmations.delete(id)
    if(confirmations.size>=10000 && !confirmations.has(user.id))return reply.code(503).send({error:'try_later'})
    const challenge=crypto.randomBytes(32).toString('hex')
    confirmations.set(user.id,{challenge,token:tokenHash(req),expires:now()+5*60*1000,busy:false})
    return {challenge,expires_in_seconds:300}
  })
  app.delete('/api/account',async(req,reply)=>{
    noCache(reply)
    const user=await authenticate(req,reply);if(!user)return reply
    if(!hasRecentAuthentication(req,user,now()))return reply.code(403).send({error:'reauthentication_required'})
    const c=confirmations.get(user.id)
    if(req.body?.confirmation!=='DELETE'||!c||c.expires<=now()||c.token!==tokenHash(req)||c.challenge!==req.body?.challenge)return reply.code(400).send({error:'confirmation_required'})
    if(c.busy)return reply.code(409).send({error:'deletion_in_progress'})
    c.busy=true
    try {
      const {error}=await supabase.rpc('delete_personal_account',{p_user_id:user.id})
      if(error)return reply.code(503).send({error:error.message?.includes('storage_cleanup_required')?'storage_cleanup_required':'deletion_failed'})
      confirmations.delete(user.id)
      return {deleted:true,scope:'active_database_and_auth',external_copies_removed:false}
    } catch {return reply.code(503).send({error:'deletion_failed'})} finally {c.busy=false}
  })
}
