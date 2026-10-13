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

## Configurazione ancora necessaria

- Servizio di archiviazione e bucket privato dedicato, regione UE quando
  disponibile; accesso pubblico disattivato, versionamento e credenziali
  separate per upload e recupero. Confermare costi e retention prima di creare
  risorse a pagamento. Non mettere dati reali nel repository o nello snapshot
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
