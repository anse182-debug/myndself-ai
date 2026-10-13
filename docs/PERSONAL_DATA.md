# Dati personali: inventario e controlli

## Regola concordata

Diario e riflessioni restano finché l'account è attivo; alla cancellazione
si rimuovono dal database attivo. Nessuna eliminazione per anzianità è stata
introdotta. I backup sono sospesi. Una futura procedura backup deve definire
retention e impedire di reintrodurre dati cancellati durante un recupero.

## Inventario

| Sistema | Dati | Controllo implementato |
| --- | --- | --- |
| Supabase Auth | email, metadati, identità e sessioni | Export di id/email/creazione/metadati utente; rimozione Auth in transazione con i dati applicativi |
| mood_entries, summary_entries, mood_summaries | diario, emozioni, riflessioni e sintesi | Export/cancellazione per user_id |
| mood_chats, chat_sessions, guided_history | messaggi e risposte legacy | Export/cancellazione per user_id |
| reflection_sessions | sintesi, prossimo passo e valutazioni | Export/cancellazione; il nuovo percorso non salva il transcript |
| ai_memory, emotion_profile | testi opt-in, vettori e profilo emotivo | Export testo/metadati; cancellazione anche dei vettori |
| agent_ritual_events, user_flags, weekly_email_log | eventi, flag e invii | Export/cancellazione per user_id |
| therapist_invites, therapist_links, therapist_shares | inviti, consensi e accessi PDF | Export delle relazioni come paziente, senza hash segreti; rimozione relazioni proprie e riferimenti alla propria email verificata |
| subscribers | email e preferenza mentor | Export/cancellazione usando solo l'email verificata dell'account |
| Dispositivo | sessione, preferenze e link di condivisione | Pulizia locale MyndSelf e logout dopo successo; altri dispositivi richiedono pulizia separata |
| OpenAI | richieste AI e testi per embeddings | store:false esplicito nelle chat; non equivale a zero retention dei log del fornitore |
| Resend e destinatari email | email e metadati consegna | Nessuna cancellazione automatica delle email già inviate o dei log fornitore |
| Render/Vercel/Supabase logs | metadati e possibili dettagli negli errori legacy | Non esportati/eliminati; minimizzazione e retention da completare |
| Supabase Storage | eventuali file | Cancellazione bloccata se l'utente possiede oggetti; pulizia assistita tramite API Storage |

Il file non contiene password, access/refresh token, segreti di condivisione,
vettori, log esterni, backup o file Storage. Le relazioni come terapeuta con
pazienti altrui richiedono una procedura separata che protegga i dati dei terzi.
L'export non è un backup consistente per recupero del database completo.

## Endpoint e schermata

«I miei dati e il mio account» appare sotto i controlli memoria e richiede
sessione verificata.

- GET /api/account/export: download JSON delle righe proprie, no-store.
- POST /api/account/deletion-challenge: challenge casuale valido 5 minuti,
  associato a utente e sessione corrente.
- DELETE /api/account: richiede challenge e testo DELETE; vietato agire con
  l'ID di un altro utente. Il challenge viene consumato dopo successo.

Budget separato di quattro richieste account al minuto. Export rifiutato oltre
5000 righe per categoria principale o 10 MiB serializzati; nessun successo
parziale. Volumi superiori richiedono assistenza. Il challenge è in memoria:
riavvio/cambio istanza richiede una nuova conferma. Non sostituisce una
riautenticazione recente, ancora necessaria prima della produzione.

## Cancellazione atomica

Migrazione 002: funzioni SECURITY DEFINER con search_path vuoto, RPC solo per
service_role. Il backend passa solo l'ID autenticato; browser anon e
sessioni authenticated non possono invocarle direttamente.

Il lock sull'account Auth coordina cancellazione e salvataggi. Trigger su
user_id/patient_id verificano l'esistenza dell'account con lock key-share,
anche nelle tabelle prive di FK. Una transazione cancella le righe delle
16 tabelle, relazioni all'email verificata e auth.users, con i cascade
Auth previsti dalla piattaforma. Un errore annulla tutto. getUser respinge le
vecchie sessioni; i trigger respingono nuovi salvataggi col vecchio ID.
Una futura sottoscrizione pubblica all'email rimane un flusso distinto.

## Copie esterne e rilascio

L'esito dichiara active_database_and_auth e external_copies_removed:false.
Per log, email o altre copie il responsabile deve seguire una procedura
assistita tramite privacy@myndself.ai, verificando contratti e strumenti
realmente disponibili presso i fornitori. Non si inviano ticket/email né si
dichiara soddisfatta una cancellazione su tutti i sistemi. Retention dei log,
prove di trattamento e revisione indipendente rimangono da completare.

Migrazione e prove soltanto nel test. Produzione richiede backup recuperabile,
rilascio coordinato, riautenticazione e procedure per le copie esterne.
Il controllo schema comprende ora funzioni privacy, ACL e trigger di esistenza.
