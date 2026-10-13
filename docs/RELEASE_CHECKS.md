# Controlli CI e protezione del rilascio

## Policy concordata

Il responsabile lavora da solo: per main richiedere pull request e controlli
superati senza una seconda approvazione. Richiedere aggiornamento rispetto a
main, risoluzione delle conversazioni, blocco di force push e cancellazione,
applicazione delle regole anche agli amministratori.

Il workflow Checks contiene tre job senza credenziali di produzione:

- backend: installazione con lockfile, test, audit dipendenze e verifica sintassi.
- frontend: installazione con lockfile, audit dipendenze e build.
- governance: test della policy di rilascio e sintassi degli script di gestione.

Le azioni sono fissate a commit. Un audit high blocca vulnerabilità high e
critical. Il job governance non applica migrazioni né verifica lo schema
live: il controllo test database rimane un'operazione separata.

## Verifica remota e applicazione

Dalla radice del checkout con il commit corrente già pubblicato:

```sh
node --use-env-proxy scripts/github-release.mjs
node --use-env-proxy scripts/github-release.mjs --apply --reviews=0
```

Il primo comando legge GitHub e produce il piano; il secondo applica la
protezione e la rilegge. Richiedono accesso di rete a api.github.com e una
credenziale API utilizzabile (MYNDSELF_GITHUB_TOKEN oppure GH_TOKEN).
L'autenticazione del proxy Git per fetch/push non dimostra accesso all'API.
Non inserire token nei comandi, nel repository o in chat; usare esclusivamente
impostazioni segrete del runner/ambiente.

Il runner verifica repository e branch, commit locale uguale al remoto staging,
workflow Checks completato con successo su quel commit, successo di tutti e
tre i job e corrispondenza con i check GitHub Actions effettivi. Vincola i
controlli obbligatori all'app osservata; un check omonimo da un'altra app non
soddisfa la policy. Non applica la protezione se CI manca, fallisce o è ancora
in corso. Non distribuisce, non fa merge e non cambia main.

Se esiste già una protezione, il runner la mostra come esistente ma rifiuta di
sovrascriverla: occorre preservare restrizioni, team e altre regole con una
revisione separata. Ruleset e altri vincoli possono aggiungere requisiti;
questa procedura non pretende di elencarli tutti. GitHub può richiedere un
piano a pagamento per proteggere repository privati: non effettuare upgrade
senza una decisione esplicita. I controlli in un workflow da soli non rendono
obbligatorio il loro superamento prima del merge.

## Stato del lavoro

L'accesso Git a staging è verificato. La lettura iniziale dell'API GitHub è
bloccata dal proxy per il dominio non autorizzato. È salvata una bozza cloud
che aggiunge api.github.com preservando le altre regole personalizzate e i
preset; occorre salvare/pubblicare l'ambiente per applicarla. Non è ancora
verificata la validità della credenziale API attualmente presente. Lo stato
remoto della CI e la protezione di main non sono ancora confermati.

Verifica locale del 13 ottobre 2026: installazioni con npm ci riuscite, 32 test
backend e 5 test della policy passati, audit senza vulnerabilità e build frontend
riuscita. Rimane l'avviso relativo alle dimensioni del bundle frontend. Questi
risultati locali non sostituiscono l'esito remoto sul commit pubblicato.

I backup restano sospesi. Un futuro merge in produzione richiede anche il
piano database e il rilascio coordinato frontend/backend già descritti
nell'audit tecnico.
