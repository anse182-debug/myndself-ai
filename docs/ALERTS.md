# Avvisi operativi via email

## Configurazione concordata

Il responsabile ha scelto email verso info@myndself.ai. Solo il servizio
Render test è configurato: MONITOR_ENABLED=true, MONITOR_TO=info@myndself.ai,
MONITOR_FROM=MyndSelf.ai <info@myndself.ai>. STAGING_MODE=true seleziona il
contesto test. Le variabili sono state aggiornate singolarmente e rilette,
senza sostituire gli altri segreti o modificare produzione.

L'invio usa Resend già adottato dall'app. Credenziali solo nel backend; niente
segreti o indirizzi operatore nel frontend. Fuori dalla configurazione esplicita
MONITOR_ENABLED=true, gli avvisi rimangono disattivati. Configurazione invalida
produce un evento minimo e nessun invio.

## Regole

Una finestra di circa un minuto con >=20 richieste e >=5% errori server apre
un incidente. L'email include esclusivamente ambiente, timestamp UTC, contatori,
latenza massima e link statico alla dashboard del servizio. Nessun testo,
email utente, token, body, URL richiesta o ID personale viene serializzato.

Per ogni incidente un avviso iniziale; un eventuale promemoria non prima di
30 minuti. Il rientro viene comunicato dopo due finestre consecutive con
>=20 richieste e tasso errori sotto 5%. Le finestre vuote o insufficienti
interrompono il conteggio del rientro e non attestano disponibilità. HTTP 4xx
non è un errore server: questi avvisi non coprono ogni possibile guasto.

Un solo invio in corso per processo. Fallimenti: backoff 5/10/20/30 minuti,
con limite 30 minuti; una nuova osservazione avvia il retry quando ammesso.
La stessa notifica conserva payload e Idempotency-Key tra i tentativi, evitando
un duplicato se Resend ha accettato una richiesta la cui risposta è andata
persa. Il rientro rimane comunicabile anche se la prima accettazione è
incerta. I promemoria hanno una chiave distinta. Lo stato è in memoria: riavvii
possono azzerare cooldown/incidente e interrompere un retry; più istanze
richiedono un registro condiviso prima di promettere un limite globale.

Gli eventi monitor_alert_sent e monitor_recovery_sent attestano accettazione
API, non consegna in casella. monitor_delivery_failed non include risposta
fornitore o indirizzo. I guasti dell'invio non bloccano richieste dell'app e
non fanno partire email di errore recursive.

## Verifiche e operatività

Deduplicazione, promemoria, recupero, backoff, idempotenza, richieste concorrenti,
insufficienza del campione e minimizzazione del payload sono testati senza
inviare email. È stata inviata una sola email tecnica «Verifica notifiche»
all'indirizzo concordato: Resend l'ha accettata. Non è una prova che sia già
arrivata in casella né una simulazione di un incidente reale in produzione.

Se arriva un degrado: aprire Render test, verificare service_error_rate_high e
request_failed, controllare deployment e dipendenze senza aggiungere log di
payload. Un rientro certifica solo il ritorno del tasso osservato sotto soglia.
Per sospendere gli invii impostare MONITOR_ENABLED=false e ridistribuire il
backend. Non cambiare automaticamente destinatario o attivare produzione.

Questo monitor vive nello stesso processo che osserva. Non segnala un backend
spento, un crash prima dell'invio, un problema di rete generale o un servizio
senza traffico. Il prossimo controllo necessario è un monitor esterno di
raggiungibilità, indipendente da Render, con responsabilità della risposta e
retention dei log da definire. La lettura API dei log Render è ancora bloccata
con 403; la dashboard rimane il canale operativo previsto.

La lettura dello stato consegna tramite API Resend ha restituito HTTP 401;
non si presume consegna in casella dalla sola accettazione dell'invio.
54 test backend passati; nessun incidente fittizio è stato provocato nel
servizio pubblicato per generare ulteriori email.

Il backend Render test è live sul commit 59058cc, con le tre variabili monitor
verificate. Health 200 e export anonimo 401 conservano l'ID server. La catena
HTTP -> finestra metriche -> controller è stata verificata su Fastify locale
con trasporto email finto: 19 successi e un 503 hanno prodotto un solo avviso
aggregato, senza parametri o testo della richiesta. Non è stata provocata una
notifica aggiuntiva sul servizio pubblico. Produzione invariata.
