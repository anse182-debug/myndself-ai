# Resilienza di Un momento

Il percorso `/api/journey/turn` applica un termine totale di 25 secondi, timeout di 8 secondi per chiamata e massimo tre chiamate per turno, inclusi retry e correzione del formato. I retry interni del SDK sono disabilitati su queste chiamate. Un errore 429, 5xx o di connessione può causare un solo nuovo tentativo dopo 300 ms; autenticazione, timeout e output non valido non causano retry di trasporto. Il timeout può interrompere l’attesa senza evitare una fatturazione già avvenuta dal provider.

Richieste identiche simultanee dello stesso utente condividono il lavoro in corso. La chiave è un hash di utente e payload; le risposte completate non sono conservate. Il massimo è 32 lavori distinti simultanei per processo. Il rischio immediato riconosciuto deterministicamente continua a ricevere indicazioni controllate senza chiamare il provider. I fallimenti mantengono il contratto HTTP 503 esistente.

Limiti: deduplicazione e capacità sono locali al processo, senza coordinamento tra istanze. Non è un limite di spesa mensile, né una garanzia di fatturazione singola. Gli altri endpoint AI mantengono la configurazione precedente. Nessun contenuto delle conversazioni viene aggiunto ai log.

Verifica: 68 test backend passati; 36 fixture sintetiche validate offline. Nessuna chiamata AI o scrittura database necessaria per questi controlli. La modifica è pubblicata nel backend di test; produzione invariata.

## Stato del rilascio

Il commit `2a7a6f6` è stato inviato a `staging/ai-memory`. L’avvio del deploy tramite API Render ha restituito HTTP 401; la lettura dei deploy ha confermato ancora live il commit precedente `0ee1337`. Per completare il rilascio, sul solo servizio `myndself-api-test` selezionare Manual Deploy → Deploy latest commit, poi verificare il commit e il percorso autenticato. Produzione non modificata.

### Conferma del rilascio

Deploy manuale confermato live: `dep-db74e3favr4c73acthng`, commit `77df092cd9f3590edd6513ce7b3e45ca332f3a8e`. Health HTTP 200. Due richieste autenticate identiche e simultanee hanno restituito risposte uguali in 2685 ms; risposta urgente controllata verificata separatamente. La deduplicazione del numero di chiamate al provider è verificata dai test unitari, non dedotta dalla sola uguaglianza delle risposte pubbliche. Account sintetico eliminato.
