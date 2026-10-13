import events from './client-log-events.json'
const allowed=new Set<string>(events)
// Static event names only: no Error, message, request or identity.
export const clientLog={
  info:(event:string)=>{if(allowed.has(event))console.info('myndself_event',event)},
  warn:(event:string)=>{if(allowed.has(event))console.warn('myndself_event',event)},
  error:(event:string)=>{if(allowed.has(event))console.error('myndself_event',event)},
}
