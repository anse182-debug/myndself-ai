# Resilienza di Un momento

Il percorso `/api/journey/turn` applica un termine totale di 25 secondi, timeout di 8 secondi per chiamata e massimo tre chiamate per turno, inclusi retry e correzione del formato. I retry interni del SDK sono disabilitati su queste chiamate. Un errore 429, 5xx o di connessione può causare un solo nuovo tentativo dopo 300 ms; autenticazione, timeout e output non valido non causano retry di trasporto. Il timeout può interrompere l’attesa senza evitare una fatturazione già avvenuta dal provider.

Richieste identiche simultanee dello stesso utente condividono il lavoro in corso. La chiave è un hash di utente e payload; le risposte completate non sono conservate. Il massimo è 32 lavori distinti simultanei per processo. Il rischio immediato riconosciuto deterministicamente continua a ricevere indicazioni controllate senza chiamare il provider. I fallimenti mantengono il contratto HTTP 503 esistente.

Limiti: deduplicazione e capacità sono locali al processo, senza coordinamento tra istanze. Non è un limite di spesa mensile, né una garanzia di fatturazione singola. Gli altri endpoint AI mantengono la configurazione precedente. Nessun contenuto delle conversazioni viene aggiunto ai log.

Verifica: 68 test backend passati; 36 fixture sintetiche validate offline. Nessuna chiamata AI o scrittura database necessaria per questi controlli. Questa modifica non è ancora pubblicata.
