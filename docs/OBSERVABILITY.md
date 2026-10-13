# Log minimizzati e monitoraggio di base

## Dati consentiti

Il backend scrive JSON con timestamp, livello ed evento scelto da un catalogo
versionato. I campi aggiuntivi sono consentiti esplicitamente: codici di errore
noti, stato HTTP/fornitore, durata e contatori. Tutto il resto è scartato:
nessun Error.message/stack, testo del diario, contenuto AI, email, user_id,
IP, cookie, Authorization, token PDF, body o query string.

Un identificativo UUID casuale, generato dal server indipendentemente dagli
header client, collega eventi della stessa richiesta. Il percorso è solo il
template registrato, ad esempio /api/memory/:id; una URL sconosciuta non è
registrata. Le risposte espongono x-request-id tramite CORS. Errori framework,
JSON non valido e route mancanti usano messaggi generici con request_id.
Le risposte applicative gestite mantengono il loro contratto e ricevono l'header.
I log client contengono soltanto eventi statici consentiti; i messaggi toast
rimangono nella UI e non vengono copiati nella console.

Unhandled rejection ed eccezioni non catturate producono un evento minimo su
stderr ed escono con codice 1, senza stampare il messaggio o lo stack. Questo
non recupera automaticamente una richiesta; il provider deve riavviare il
processo. Import/parse failure prima dell'installazione degli handler e log
interni di dipendenze/piattaforma non sono coperti da questa garanzia.

## Metriche e diagnosi

Ogni 60 secondi, se ci sono richieste, request_metrics riporta totale, errori
server/client, 429, richieste oltre due secondi, durata massima e durata della
finestra osservata. I check health riusciti sono esclusi. Ogni errore HTTP o
richiesta lenta produce un evento con stato e durata. Il logger non conserva
un database di tracce e non invia dati a un nuovo servizio esterno.

Con almeno 20 richieste in una finestra e almeno 5% di errori server, viene
emesso service_error_rate_high. È un segnale nei log, non una notifica email,
Slack o paging. I contatori sono per processo, non distribuiti; non sono P95,
metriche di billing o disponibilità globale. L'ultima finestra può andare
persa se il processo viene terminato prima del flush. Successi senza errori
non vengono registrati uno per uno.

Per investigare in Render test, filtrare gli eventi request_failed,
service_error_rate_high o gli eventi specifici dell'operazione; correlare
request_id e controllare stato/durata. Non reintrodurre log di payload per
capire un errore: riprodurre con dati sintetici in test. Accesso ai log deve
rimanere limitato agli operatori autorizzati.

## Limiti operativi ancora da completare

- Canale di allarme, destinatario e responsabilità della risposta. Nessuna
  notifica a terzi viene inviata da questo lavoro.
- Retention e cancellazione dei log storici nei provider. Cambiare il codice
  non rimuove log precedenti. Le URL reali possono ancora comparire nei log
  di accesso delle piattaforme, inclusi endpoint legacy con parametri: questo
  richiede una verifica e configurazione distinta.
- Analisi di crash della piattaforma e minimizzazione di eventuali log SDK.
- Dashboard, aggregazione tra istanze e verifiche esterne di disponibilità.

L'assenza di testi nei nuovi log applicativi non certifica l'assenza di dati
personali in tutti i sistemi né la cancellazione delle copie esterne.

## Verifiche

Test con stringhe sintetiche sensibili in errori, header, cookie e URL:
nessuna di queste stringhe raggiunge i log. Verificati isolamento tra richieste
concorrenti, identificativi non controllabili dal client, campi esclusi,
metriche 429/5xx, segnale 5%/20 richieste e crash senza messaggi/stack. Un
controllo dei sorgenti impedisce bypass dei sink approvati nel backend index
 e nel frontend. Backend completo avviato localmente: health 200, richiesta
anonima 401, JSON invalido 400 e route sconosciuta 404; header presente e
nessun valore sintetico ripetuto nelle risposte o negli eventi osservati.
46 test backend, 5 test della policy e build frontend passati. Tutta la
pubblicazione riguarda solo i progetti test; produzione invariata.

## Verifica pubblicata

Vercel READY e Render live sul commit 64d4b10. Sul backend pubblico verificati
200/401/400/404, ID server indipendente dagli header client e valori sintetici
assenti dalle risposte. Il browser legge x-request-id attraverso CORS; la prova
mobile/desktop di Impostazioni, export e cancellazione è passata, con cleanup
dell'account sintetico. L'API Render per leggere i log restituisce HTTP 403:
il contenuto dei log remoti non è stato ispezionato tramite quel canale.
Il formato e l'assenza dei valori sintetici sono verificati nei test e nello
stdout del processo locale, inclusa la finestra aggregata di 60 secondi.
