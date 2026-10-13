import { useState } from 'react'
export default function PersonalDataControls({token,apiBase,language,onDeleted}:{token:string;apiBase:string;language:string;onDeleted:()=>Promise<void>}) {
  const en=language==='en'
  const [busy,setBusy]=useState(false),[error,setError]=useState(''),[confirm,setConfirm]=useState(''),[deleting,setDeleting]=useState(false)
  const headers={Authorization:`Bearer ${token}`,'Content-Type':'application/json'}
  async function exportData() {
    setBusy(true);setError('')
    try {
      const r=await fetch(`${apiBase}/api/account/export`,{headers,cache:'no-store'})
      if(!r.ok)throw Error()
      const url=URL.createObjectURL(await r.blob());const a=document.createElement('a');a.href=url;a.download='myndself-data.json';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000)
    }catch{setError(en?'Export unavailable. Try again later.':'Esportazione non disponibile. Riprova più tardi.')}finally{setBusy(false)}
  }
  async function deleteAccount() {
    if(confirm!=='DELETE')return
    setBusy(true);setError('')
    try {
      const c=await fetch(`${apiBase}/api/account/deletion-challenge`,{method:'POST',headers,body:'{}'})
      if(!c.ok)throw Error()
      const {challenge}=await c.json()
      const r=await fetch(`${apiBase}/api/account`,{method:'DELETE',headers,body:JSON.stringify({challenge,confirmation:confirm})})
      if(!r.ok||(await r.json()).deleted!==true)throw Error()
    }catch{setError(en?'Deletion was not confirmed. Try again or contact privacy@myndself.ai.':'Cancellazione non confermata. Riprova o contatta privacy@myndself.ai.');setBusy(false);return}
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
        <label className="block">{en?'Type DELETE to confirm':'Digita DELETE per confermare'}<input value={confirm} disabled={busy} onChange={e=>setConfirm(e.target.value)} autoComplete="off" className="mt-2 block w-full rounded-lg bg-gray-900 border border-white/20 p-3 text-base" /></label>
        <button disabled={busy||confirm!=='DELETE'} onClick={deleteAccount} className="min-h-11 rounded-xl bg-red-800 px-4 py-2 disabled:opacity-50">{en?'Permanently delete account':'Elimina definitivamente l’account'}</button>
        <button disabled={busy} onClick={()=>{setDeleting(false);setConfirm('')}} className="min-h-11 px-4 py-2">{en?'Cancel':'Annulla'}</button>
      </div>}
      {busy&&<p role="status">{en?'Working…':'Operazione in corso…'}</p>}
      {error&&<p role="alert" className="text-red-200">{error}</p>}
    </div>
  </details>
}
