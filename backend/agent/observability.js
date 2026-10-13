import {AsyncLocalStorage} from 'node:async_hooks'
import crypto from 'node:crypto'
import fs from 'node:fs'
const events=new Set(JSON.parse(fs.readFileSync(new URL('./log-events.json',import.meta.url),'utf8')))
const requestContext=new AsyncLocalStorage()
const errorCodes=new Set(['23502','23503','23505','23514','42501','42P01','42883','PGRST116','PGRST202','ETIMEDOUT','ECONNRESET','ECONNREFUSED','EADDRINUSE','EACCES'])
const methods=new Set(['GET','POST','PUT','PATCH','DELETE','OPTIONS','HEAD'])
const numericFields=new Set(['status','duration_ms','providerStatus','requests','server_errors','client_errors','rate_limited','slow','max_duration_ms','window_seconds'])
export function createSafeLogger({write=line=>console.log(line),routes=new Set()}={}) {
  function emit(level,event,details={}) {
    const record={time:new Date().toISOString(),level,event:events.has(event)?event:'unknown_event'}
    const context=requestContext.getStore()||{}
    if(/^[0-9a-f-]{36}$/.test(context.request_id||''))record.request_id=context.request_id
    if(routes.has(context.route))record.route=context.route
    if(context.method)record.method=methods.has(context.method)?context.method:'OTHER'
    if(details && typeof details==='object') {
      for(const key of numericFields){const value=details[key];if(typeof value==='number'&&Number.isFinite(value)&&value>=0&&value<=3600000)record[key]=Math.round(value)}
      if(typeof details.errorCode==='string')record.error_code=errorCodes.has(details.errorCode)?details.errorCode:'unknown'
    }
    try {write(JSON.stringify(record))} catch { /* Logging must not fail user operations. */ }
  }
  return Object.fromEntries(['info','warn','error'].map(level=>[level,(event,details)=>emit(level,event,details)]))
}
const runtimeRoutes=new Set()
export const safeLog=createSafeLogger({routes:runtimeRoutes})
export function registerObservability(app,{logger=safeLog,intervalMs=60000}={}) {
  const routes=new Set()
  const started=new WeakMap()
  let windowStarted=performance.now()
  let counts={requests:0,server_errors:0,client_errors:0,rate_limited:0,slow:0,max_duration_ms:0}
  const flush=()=>{
    const time=performance.now()
    if(counts.requests)requestContext.run(undefined,()=>{
      const summary={...counts,window_seconds:Math.max(1,(time-windowStarted)/1000)}
      logger.info('request_metrics',summary)
      if(counts.requests>=20 && counts.server_errors/counts.requests>=0.05)logger.warn('service_error_rate_high',summary)
    })
    counts={requests:0,server_errors:0,client_errors:0,rate_limited:0,slow:0,max_duration_ms:0}
    windowStarted=time
  }
  app.addHook('onRoute',options=>{routes.add(options.url);runtimeRoutes.add(options.url)})
  app.addHook('onRequest',(req,reply,done)=>{
    started.set(req,performance.now())
    req.id=crypto.randomUUID()
    reply.header('x-request-id',req.id)
    const route=routes.has(req.routeOptions?.url)?req.routeOptions.url:'unmatched'
    requestContext.run({request_id:req.id,route,method:req.method},done)
  })
  app.addHook('onResponse',async(req,reply)=>{
    if(req.routeOptions?.url==='/health' && reply.statusCode<400)return
    const duration=Math.min(3600000,Math.max(0,Math.round(performance.now()-(started.get(req)??performance.now()))))
    const status=reply.statusCode
    counts.requests++;counts.max_duration_ms=Math.max(counts.max_duration_ms,duration)
    if(status>=500)counts.server_errors++
    else if(status>=400)counts.client_errors++
    if(status===429)counts.rate_limited++
    if(duration>=2000)counts.slow++
    if(status>=500)logger.error('request_failed',{status,duration_ms:duration})
    else if(status>=400)logger.warn('request_rejected',{status,duration_ms:duration})
    else if(duration>=2000)logger.warn('request_slow',{status,duration_ms:duration})
  })
  app.setErrorHandler((error,req,reply)=>{
    const status=Number.isInteger(error.statusCode)&&error.statusCode>=400&&error.statusCode<500?error.statusCode:500
    reply.code(status).send({error:status===429?'request_limit':status<500?'invalid_request':'request_failed',request_id:req.id})
  })
  app.setNotFoundHandler((req,reply)=>reply.code(404).send({error:'not_found',request_id:req.id}))
  const timer=setInterval(flush,intervalMs);timer.unref()
  app.addHook('onClose',async()=>{clearInterval(timer);flush()})
  return {flush}
}
export function registerProcessDiagnostics() {
  const fatal=createSafeLogger({write:line=>fs.writeSync(2,line+'\n')})
  process.on('uncaughtException',error=>{fatal.error('process_uncaught_exception',{errorCode:error?.code});process.exit(1)})
  process.on('unhandledRejection',error=>{fatal.error('process_unhandled_rejection',{errorCode:error?.code});process.exit(1)})
}
