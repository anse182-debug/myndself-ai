import { useState } from 'react'
export default function PersonalDataControls({token,apiBase,language,onDeleted,onReauthenticate}:{token:string;apiBase:string;language:string;onDeleted:()=>Promise<void>;onReauthenticate:()=>Promise<void>}) {
  const en=language==='en'
  const [busy,setBusy]=useState(false),[error,setError]=useState(''),[confirm,setConfirm]=useState(''),[deleting,setDeleting]=useState(false)
  const [needsLogin,setNeedsLogin]=useState(false)
  const headers={Authorization:`Bearer ${token}`,'Content-Type':'application/json'}
  async function exportData() {
    setBusy(true);setError('');setNeedsLogin(false)
    try {
      const r=await fetch(`${apiBase}/api/account/export`,{headers,cache:'no-store'})
      if(!r.ok)throw Error()
      const url=URL.createObjectURL(await r.blob());const a=document.createElement('a');a.href=url;a.download='myndself-data.json';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000)
    }catch{setError(en?'Export unavailable. Try again later.':'Esportazione non disponibile. Riprova più tardi.')}finally{setBusy(false)}
  }
  async function deleteAccount() {
    if(confirm!=='DELETE')return
    setBusy(true);setError('');setNeedsLogin(false)
    try {
      const c=await fetch(`${apiBase}/api/account/deletion-challenge`,{method:'POST',headers,body:'{}'})
      if(!c.ok){const result=await c.json();if(result.error==='reauthentication_required')throw Error('reauthentication_required');throw Error()}
      const {challenge}=await c.json()
      const r=await fetch(`${apiBase}/api/account`,{method:'DELETE',headers,body:JSON.stringify({challenge,confirmation:confirm})})
      const result=await r.json()
      if(result.error==='reauthentication_required')throw Error('reauthentication_required')
      if(!r.ok||result.deleted!==true)throw Error()
    }catch(e){
      const reauth=e instanceof Error&&e.message==='reauthentication_required'
      setNeedsLogin(reauth)
      setError(reauth?(en?'Sign in again, then return to Settings to confirm deletion within 10 minutes.':'Accedi di nuovo, poi torna in Impostazioni per confermare la cancellazione entro 10 minuti.'):(en?'Deletion was not confirmed. Try again or contact privacy@myndself.ai.':'Cancellazione non confermata. Riprova o contatta privacy@myndself.ai.'))
      setBusy(false);return
    }
    await onDeleted()
  }
  return <details className="w-full max-w-6xl mx-auto mb-3">
    <summary className="mx-4 sm:mx-6 min-h-11 cursor-pointer rounded-xl border border-white/10 px-4 py-3 text-sm text-gray-300">{en?'My data and account':'I miei dati e il mio account'}</summary>
    <div className="mx-4 sm:mx-6 mt-3 rounded-xl border border-white/10 p-4 space-y-3 text-sm">
      <p>{en?'Download your profile, journal, conversations, reflections and saved AI memory as JSON. Keep the file private.':'Scarica profilo, diario, conversazioni, riflessioni e memoria AI salvata in formato JSON. Conserva il file in modo privato.'}</p>
      <button disabled={busy} onClick={exportData} className="min-h-11 rounded-xl border border-white/20 px-4 py-2 disabled:opacity-50">{en?'Download my data':'Scarica i miei dati'}</button>
      <p className="text-gray-400">{en?'Data stays while your account is active. Deletion removes your account and data from the active database, including sharing links. Copies in provider logs, emails already delivered, backups or other devices require separate handling. Storage files, if present, require assistance before deletion.':'I dati restano finché l’account è attivo. La cancellazione rimuove account e dati dal database attivo, inclusi i link di condivisione. Copie nei log dei fornitori, email già consegnate, backup o altri dispositivi richiedono un trattamento separato. Eventuali file archiviati richiedono assistenza prima della cancellazione.'}</p>
      {!deleting?<button disabled={busy} onClick={()=>setDeleting(true)} className="min-h-11 rounded-xl border border-red-400/40 px-4 py-2 text-red-200">{en?'Delete my account…':'Elimina il mio account…'}</button>:<div className="space-y-3">
        <p>{en?'This cannot be undone. Export first if you want a copy.':'Questa operazione è irreversibile. Esporta prima se vuoi una copia.'}</p>
        <p className="text-gray-400">{en?'Deletion requires a sign-in within the last 10 minutes.':'La cancellazione richiede un accesso effettuato negli ultimi 10 minuti.'}</p>
        <label className="block">{en?'Type DELETE to confirm':'Digita DELETE per confermare'}<input value={confirm} disabled={busy} onChange={e=>setConfirm(e.target.value)} autoComplete="off" className="mt-2 block w-full rounded-lg bg-gray-900 border border-white/20 p-3 text-base" /></label>
        <button disabled={busy||confirm!=='DELETE'} onClick={deleteAccount} className="min-h-11 rounded-xl bg-red-800 px-4 py-2 disabled:opacity-50">{en?'Permanently delete account':'Elimina definitivamente l’account'}</button>
        <button disabled={busy} onClick={()=>{setDeleting(false);setConfirm('')}} className="min-h-11 px-4 py-2">{en?'Cancel':'Annulla'}</button>
      </div>}
      {busy&&<p role="status">{en?'Working…':'Operazione in corso…'}</p>}
      {error&&<p role="alert" className="text-red-200">{error}</p>}
      {needsLogin&&<button disabled={busy} className="min-h-11 rounded-xl border border-white/20 px-4 py-2" onClick={async()=>{
        setBusy(true)
        try{await onReauthenticate()}catch{setError(en?'Unable to sign out. Try again.':'Impossibile uscire. Riprova.');setBusy(false)}
      }}>{en?'Sign out and sign in again':'Esci e accedi di nuovo'}</button>}
    </div>
  </details>
}
