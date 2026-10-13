# Migrazioni e controllo dello schema

## Ambito

Il runner opera esclusivamente sul progetto Supabase test
`weqoitbeyryuznclnzzr`, di cui verifica anche il nome. Non accetta un parametro
per produzione. I backup sono sospesi per scelta del responsabile: questo
lavoro non autorizza migrazioni o promozioni in produzione.

Il registro `app_private.schema_migrations` conserva nome, SHA-256 del file,
data e indicazione di adozione. La tabella `app_private.schema_state` conserva
l'impronta dello schema verificato. Lo schema privato non concede accesso a
public, anon o authenticated; non contiene record degli utenti.

## Comandi

Dalla radice del repository, usando il segreto di gestione già configurato:

```sh
node --use-env-proxy backend/scripts/migrations.mjs check
node --use-env-proxy backend/scripts/migrations.mjs apply
```

`check` verifica file applicati, assenza di migrazioni pendenti, stato registrato
contro database e riferimento dello schema versionato. Fallisce con codice
non zero in caso di discrepanza. Il riferimento contiene solo metadati, non
record o credenziali. Non viene rigenerato automaticamente durante `check`.

`apply` controlla lo stato precedente e applica le migrazioni pendenti in una
transazione con lock advisory e lock del registro. Verifica lo schema finale
contro il riferimento atteso nella stessa transazione: una differenza annulla
DDL e registro. Il riferimento va aggiornato e revisionato quando si prepara
una nuova migrazione. Non supporta istruzioni con controllo delle transazioni
né operazioni non transazionali come CREATE INDEX CONCURRENTLY. I blocchi
interni delle funzioni SQL con dollar quoting sono consentiti. L'applicazione
non è eseguita automaticamente da setup, startup o CI.

## Adozione del database già popolato

Il 13 ottobre 2026 il test conteneva già 000 e 001. È stato acquisito e
revisionato il riferimento dei suoi metadati, confrontato dal runner, e
inizializzato il registro tramite:

```sh
node --use-env-proxy backend/scripts/migrations.mjs adopt
```

Questo comando registra solo le due migrazioni note già presenti e rifiuta
schema diverso o registro già popolato. Non riesegue SQL e non equivale a
provare che 000 ricrei ogni oggetto del riferimento su un database vuoto.
Un database vuoto richiede una procedura di bootstrap separata; non eseguire
000 su un database popolato. Il riferimento è la baseline osservata nel test,
non una certificazione della sua correttezza funzionale.

## Copertura e limiti

L'introspezione comprende tabelle, viste, sequenze, colonne, vincoli, indici,
policy RLS, opzioni di relazione, grant di tabella visibili al ruolo di gestione,
match_ai_memory, funzioni privacy con ACL e trigger account_exists_guard
nello schema public. Non confronta
record, valori correnti delle sequenze, schema Auth/Storage, cron, altri trigger,
privilegi di colonna/funzione/sequenza, default privileges o impostazioni dei
provider. Aggiungere copertura quando si introducono oggetti di questi tipi.
La vista information_schema dipende dalla visibilità del ruolo: usare sempre
lo stesso canale di gestione. Le scritture schema esterne al runner non sono
coordinate dal suo lock advisory.

## Verifiche prima e dopo il rilascio

1. Rieseguire `check` prima di preparare modifiche e conservare backup verificato
   prima di ogni intervento in produzione.
2. Revisionare SQL, effetti sui dati e riferimento; provare sul test con dati
   sintetici, includendo autenticazione e separazione tra utenti.
3. Applicare con `apply`, poi eseguire `check` e i test funzionali pertinenti.
4. Preferire una migrazione correttiva in avanti. Il runner non genera rollback
   dei dati né offre una procedura down automatica. Scrivere un piano specifico
   per la modifica, coordinato con le versioni frontend/backend.

## Evidenza del primo ciclo

Adozione nel test riuscita, due checksum verificati e `apply` senza nuove
migrazioni senza effetti. Una migrazione sintetica con schema finale inatteso
è stata respinta; verifica indipendente ha confermato assenza della tabella
creata e della sua voce nel registro. Una tabella aggiunta fuori dal runner
è stata rilevata come drift e rimossa dopo la prova. Una migrazione sintetica senza cambi di
schema ha provato il percorso di commit. Le fixture sono state rimosse.
Nessuna modifica in produzione.
