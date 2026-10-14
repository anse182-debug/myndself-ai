# Budget AI dell’ambiente di test

`AI_MONTHLY_BUDGET_USD=10` abilita un limite condiviso di 10 USD per mese solare UTC sul backend di test. La variabile assente lascia il client precedente: la produzione non è stata attivata né migrata. Per attivare il controllo altrove occorre applicare e verificare prima la migrazione 003.

Ogni chiamata chat o embedding riserva unità di costo nel database prima di contattare OpenAI. Il contatore è atomico, persiste ai riavvii e coordina più processi sullo stesso database. Quando la soglia viene superata o il database non è disponibile, non parte la chiamata AI. La risposta urgente deterministica di Un momento continua a funzionare senza provider.

## Significato della soglia

È un limite applicativo **prudente**, non un limite sulla fattura OpenAI. Le unità interne sono 1 micro-USD per byte UTF-8 stimato di input (più margine di framing) e 2 micro-USD per token massimo di output. Questi valori volutamente maggiorati non sono i prezzi del provider e non misurano dollari effettivamente fatturati. Sono supportati soltanto testo `gpt-4o-mini` e `text-embedding-3-small`; cambi di modello, modalità multimodali, strumenti, streaming e output multipli richiedono una nuova valutazione. I prezzi dei modelli supportati devono essere ricontrollati prima di estendere l’attivazione alla produzione.

Le riserve di chiamate fallite o interrotte non vengono rimborsate: dopo un timeout non sappiamo se il provider abbia già fatturato. I retry e le correzioni del formato fanno una nuova riserva. Nessun credito viene liberato dopo la generazione. La soglia può quindi essere raggiunta prima di 10 USD reali. Chiamate eseguite fuori da questo backend, inclusa la valutazione AI da CLI, non sono coperte. Nessun limite applicativo sostituisce il controllo del progetto e della fatturazione OpenAI.

Tutte le chiamate coperte disabilitano i retry interni del SDK e hanno timeout massimo 20 secondi. Un momento mantiene anche le proprie protezioni: timeout per tentativo di 8 secondi, massimo 25 secondi totali e tre chiamate contando le correzioni. Le chiamate chat senza limite di output ricevono massimo 512 token. Le altre risposte conservano il limite già esplicito.

## Dati e controllo operativo

`app_private.ai_budget_months` contiene soltanto mese, costo riservato, numero di riserve e totali token input/output riportati dal provider. Non contiene identità, messaggi, prompt o risposte. Le funzioni pubbliche sono eseguibili soltanto dal ruolo di servizio; gli utenti non hanno accesso alla tabella. I token effettivi vengono aggiornati al meglio dopo il successo: un’interruzione del processo o un errore del database può lasciare incompleta questa metrica, senza ridurre le riserve.

Report di sola lettura, limitato al progetto di test:

```sh
node --use-env-proxy backend/scripts/ai-usage.mjs
```

Richiede `SUPABASE_ACCESS_TOKEN` nell’ambiente; non stampa credenziali. Il report espone solo aggregati degli ultimi 12 mesi. Non esiste ancora una dashboard o un avviso email specifico per la soglia. Per cambiare il budget, modificare solo `AI_MONTHLY_BUDGET_USD` sul servizio Render `myndself-api-test` e ripubblicare. Ridurlo sotto le riserve correnti blocca nuove chiamate; il reset è automatico al nuovo mese UTC.

## Verifica

Migrazione 003 prima provata e annullata in transazione, verificando soglia e permessi; poi applicata con registro checksum e confronto dello schema. Prova concorrente sul database di test: 20 riserve simultanee da un micro-USD con capacità residua di 10 micro-USD, esattamente 10 accettate e 10 rifiutate. Sono rimasti 10 micro-USD e 10 riserve sintetiche nel contatore, senza chiamate OpenAI. Accesso anonimo rifiutato. Nessun dato utente coinvolto.

### Pubblicazione e prova reale del 14 ottobre 2026

Backend di test live sul commit `14fed48029375410c4973ed350b694f25b617f95`, deploy Render `dep-db7jfq25b2lc7386flcg`, variabile `AI_MONTHLY_BUDGET_USD=10`. Due richieste autenticate identiche simultanee hanno condiviso la risposta: una sola nuova riserva da 4259 micro-USD; registrati 555 token input e 47 output. La risposta urgente deterministica non ha aggiunto riserve. Account sintetico eliminato. Nessuna trascrizione salvata dai controlli. Passati 76 test backend e 5 test delle regole di rilascio, validate 36 fixture offline e verificati schema e quattro checksum delle migrazioni. Produzione non modificata.
