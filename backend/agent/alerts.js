import crypto from 'node:crypto'
import {safeLog} from './observability.js'
const fields=['requests','server_errors','client_errors','rate_limited','slow','max_duration_ms','window_seconds']
export function createAlertController({send,now=Date.now,logger=safeLog,environment='test'}) {
  let incident=null,pending=null,lastSuccessful=0,nextRetry=0,failures=0,healthy=0,inFlight=false
  const cooldown=30*60*1000
  async function observe(input) {
    if(inFlight)return
    const metrics={}
    for(const field of fields){const value=input?.[field];if(typeof value!=='number'||!Number.isFinite(value)||value<0||value>3600000)return;metrics[field]=Math.round(value)}
    if(metrics.requests<20){healthy=0;return} // Insufficient traffic cannot prove recovery.
    if(metrics.server_errors>metrics.requests)return
    const degraded=metrics.server_errors/metrics.requests>=0.05
    if(degraded)healthy=0;else healthy++
    if(!degraded && !incident){pending=null;failures=0;nextRetry=0;return}
    if(!degraded && healthy<2)return
    const kind=degraded?'degraded':'recovered'
    if(degraded && incident && now()-lastSuccessful<cooldown)return
    if(now()<nextRetry)return
    if(!pending || pending.kind!==kind)pending={kind,incident:incident||crypto.randomUUID(),notification:crypto.randomUUID(),observedAt:new Date(now()).toISOString(),environment:environment==='production'?'production':'test',metrics}
    const payload=pending;inFlight=true
    try {
      await send(payload)
      failures=0;nextRetry=0;lastSuccessful=now()
      incident=degraded?payload.incident:null;pending=null;healthy=0
      logger.info(kind==='degraded'?'monitor_alert_sent':'monitor_recovery_sent')
    } catch {
      failures++;nextRetry=now()+Math.min(30,5*2**Math.min(failures-1,3))*60*1000
      logger.warn('monitor_delivery_failed')
    } finally {inFlight=false}
  }
  return {observe}
}
export function createEmailAlertSender({apiKey,to,from,fetcher=fetch}) {
  if(!apiKey || !/^[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+$/.test(to||'') || !from || /[\r\n]/.test(from))throw Error('Invalid monitor email configuration')
  return async ({kind,incident,notification=incident,observedAt,environment,metrics})=>{
    const title=kind==='recovered'?'Errori server rientrati':kind==='test'?'Verifica notifiche':'Degrado del servizio'
    const timestamp=/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(observedAt||'')?observedAt:new Date().toISOString()
    const dashboard=environment==='production'?'https://dashboard.render.com/web/srv-d45o1dhr0fns73f96mh0':'https://dashboard.render.com/web/srv-db6jh5vf3r2c73cjk63g'
    // Construct the payload from a fixed schema; never serialize supplied objects.
    const lines=fields.filter(f=>Number.isFinite(metrics?.[f])).map(f=>`${f}: ${Math.round(metrics[f])}`)
    const r=await fetcher('https://api.resend.com/emails',{
      method:'POST',headers:{Authorization:`Bearer ${apiKey}`,'Content-Type':'application/json','Idempotency-Key':`myndself-monitor-${notification}-${kind}`},
      body:JSON.stringify({from,to:[to],subject:`[MyndSelf ${environment==='production'?'produzione':'test'}] ${title}`,text:`Avviso operativo MyndSelf.\n${title}\nFinestra osservata (UTC): ${timestamp}\n\n${lines.join('\n')}\n\nLog del servizio: ${dashboard}\nNessun dato degli utenti incluso.\nQuesto controllo interno non rileva un processo spento o l'assenza di traffico.`}),
      signal:AbortSignal.timeout(15000),
    })
    if(!r.ok)throw Error('Monitor email delivery failed')
    const result=await r.json();if(typeof result.id!=='string')throw Error('Monitor email acceptance missing')
    return {id:result.id}
  }
}
export function configuredAlerts(env=process.env) {
  if(env.MONITOR_ENABLED!=='true')return undefined
  try {
    const send=createEmailAlertSender({apiKey:env.RESEND_API_KEY,to:env.MONITOR_TO,from:env.MONITOR_FROM||env.WELCOME_FROM_EMAIL||'MyndSelf.ai <info@myndself.ai>'})
    return createAlertController({send,environment:env.STAGING_MODE==='true'?'test':'production'}).observe
  } catch {safeLog.warn('monitor_configuration_invalid');return undefined}
}
