# Backup e recupero

## Stato verificato il 13 ottobre 2026

L'organizzazione Supabase è sul piano Free. L'API restituisce zero backup
elencati e PITR disattivato per produzione (`tmdswrgpmmpjnzfgeewh`) e test
(`weqoitbeyryuznclnzzr`). `walg_enabled` non dimostra che una copia sia
disponibile per il recupero. La scelta concordata è restare sul Free e usare
backup cifrati su uno spazio esterno.

Controllo ripetibile, di sola lettura, senza esportare record o chiavi:

```sh
node --use-env-proxy backend/scripts/backup-preflight.mjs
```

Esce con codice 2 quando non trova backup gestiti/PITR per produzione; non è
una verifica della presenza o dell'integrità delle future copie esterne.

## Destinazione scelta: Google Drive

Il responsabile ha scelto Google Drive. Non è disponibile un collegamento
Drive utilizzabile in questa sessione; la sola variabile di credenziali Google
dell'ambiente non dimostra accesso al Drive del responsabile.

Usare una cartella dedicata `MyndSelf Backups`, con accesso generale
**Limitato**, senza link pubblico. Conservare esclusivamente copie cifrate e
manifest non sensibili. Il Drive non garantisce automaticamente regione UE,
immutabilità o retention dei file: verificarle in base all'account utilizzato.
Evitare che il runner cancelli l'ultima copia valida in caso di upload fallito.

Per automatizzare gli upload usare un runner persistente con `rclone` e un
remote Drive autorizzato tramite OAuth dal proprietario. Configurare la
cartella come root del remote; questa scelta limita la destinazione operativa,
ma non riduce da sola i permessi OAuth concessi. Preferire l'ambito
`drive.file` dove compatibile con il flusso scelto e verificare la visibilità
della cartella. Un service account richiede invece una configurazione Drive
compatibile, per esempio uno Shared Drive, e non va presunto funzionante su
un normale Drive personale.

Conservare il refresh token/configurazione `rclone` nel secret store del
runner, con accesso ristretto; mai nel repository, in chat o nelle variabili
pubbliche del frontend. Non affidarsi a un access token temporaneo per i job
giornalieri. Verificare prima upload e download di un artefatto sintetico
cifrato nella cartella, confrontando il SHA-256 locale con quello ricalcolato
dal download. La verifica va eseguita con il reale account del runner.

Il collegamento di un'app Drive alla chat può aiutare a individuare una
cartella, ma non sostituisce credenziali persistenti e pianificazione del
runner. Mancano ancora il link della cartella e l'autorizzazione OAuth del
runner, oltre ai prerequisiti database e cifratura elencati sotto.

## Configurazione ancora necessaria

- Cartella Drive dedicata con accesso limitato, autorizzazione del runner e
  spazio sufficiente. Confermare costi e retention prima di creare risorse a
  pagamento. Non mettere dati reali nel repository o nello snapshot
  dell'ambiente cloud.
- Un runner affidabile che supporti connessioni PostgreSQL/TLS e una versione
  di `pg_dump` compatibile con il server. Questo ambiente ha il proxy HTTPS
  di gestione, ma non dispone attualmente di `pg_dump`: l'accesso all'API
  Supabase non equivale ad accesso PostgreSQL.
- Connessione database ottenuta da Supabase > progetto produzione > Connect.
  Usare connessione diretta oppure session pooler, non transaction pooler;
  verificare raggiungibilità e certificato con `sslmode=verify-full` e CA
  ufficiale. Fornire credenziali nel secret store del runner, mai in chat,
  argomenti della riga di comando, log o file tracciati. I segreti proxy HTTPS
  di questo ambiente non sono credenziali raw per `pg_dump`.
- Destinatario pubblico `age` per cifrare sul runner; chiave privata conservata
  separatamente in un password manager, con una copia di recupero. Il runner
  di backup non deve conoscere la chiave privata. Testare che il responsabile
  possa effettivamente decifrare prima del primo backup di produzione.

## Procedura da implementare sul runner

1. Acquisire un dump PostgreSQL consistente di schema e dati dell'applicazione,
   includendo Auth e metadati Storage necessari al recupero. Verificare la
   procedura Supabase supportata per il trasferimento su un nuovo progetto:
   ruoli e oggetti gestiti dalla piattaforma richiedono trattamento specifico,
   un dump generico non è automaticamente ripristinabile su Supabase.
2. Trasmettere il dump direttamente al processo di cifratura `age`, senza
   scrivere SQL/dati in chiaro su disco. Propagare il fallimento di entrambi
   i processi (`pipefail`), eliminare file parziali e pubblicare il manifest
   soltanto dopo upload riuscito. Evitare dump/restore tramite API REST per
   tabelle singole: non garantiscono uno snapshot consistente tra tabelle.
3. Salvare artefatto cifrato e manifest non sensibile: timestamp UTC,
   progetto origine, commit, versione server/client, dimensione e SHA-256 del
   ciphertext. Rileggere l'oggetto caricato e verificarne hash e dimensione.
   Il checksum dimostra integrità dei byte, non recuperabilità dei dati.
4. Inventariare e copiare separatamente eventuali file Storage: il backup
   database conserva metadati, non i byte degli oggetti. Inventariare anche
   impostazioni Auth, redirect, provider, funzioni, cron e configurazione dei
   servizi; i segreti rimangono nel secret store e si ricollegano/ruotano.
5. Pianificare una copia giornaliera e prima di ogni migrazione. Obiettivo
   proposto RPO 24 ore, da confermare con il responsabile. Definire retention
   e cancellazione coerenti con i dati di salute mentale prima dell'attivazione;
   non assegnare una conservazione indefinita. Allarme per errore, backup
   mancante e copia oltre la soglia; identificare un responsabile operativo.

## Prova di recupero

La prova attuale, ripetuta con successo il 13 ottobre, ripristina lo schema
applicativo in uno schema temporaneo nel progetto test e verifica l'uguaglianza
di una riga sintetica serializzata. Rimuove schema e account al termine:

```sh
node --use-env-proxy backend/scripts/restore-drill.mjs
```

Non dimostra il ripristino di utenti Auth reali, file Storage o dell'intero
database. Non fornisce ancora un RTO misurato.

Per la prova completa usare un progetto di recupero isolato, senza email,
cron, webhook o accesso pubblico all'app. Non importare dati reali nel test
attualmente accessibile agli utenti. Poiché produzione e test occupano già
due progetti Free, verificare le quote e concordare la destinazione prima di
crearne un altro o sostituire il test esistente.

Decifrare in streaming e ripristinare secondo la procedura Supabase verificata.
Controllare conteggi, vincoli, viste, funzioni, policy RLS, autenticazione,
accesso tra due utenti, file e funzioni applicative. Registrare timestamp del
backup, tempo totale di recupero, anomalie e cleanup. Tenere la prova separata
da un cambio di produzione: cambiare URL/chiavi dei servizi richiede un piano
di rilascio e rollback coordinato.

## Criteri di completamento

Il backup è operativo soltanto dopo: upload cifrato e rilettura verificati,
recupero completo riuscito, chiave di decifratura recuperabile, pianificazione
e allarmi verificati, retention definita e RPO/RTO misurati. Nessuno di questi
risultati è implicito nella sola preparazione di questa procedura.
