# Monitor esterno: configurazione pronta, non attiva

Un monitor indipendente deve continuare a funzionare quando Render e il
monitor interno sono spenti. Destinatario già concordato: info@myndself.ai.
In questa sessione non sono presenti credenziali UptimeRobot/Better Stack né
un connettore per creare monitor. La scelta del servizio è ancora pendente;
non è stato creato un account né attivato alcun monitor esterno.

## Risorse da monitorare

| Nome | Metodo e URL | Esito atteso | Ambito |
| --- | --- | --- | --- |
| MyndSelf Test Frontend | GET https://myndself-test.vercel.app/app | HTTP 200 | Raggiungibilità frontend; non verifica autenticazione o AI |
| MyndSelf Test API | GET https://myndself-api-test.onrender.com/health | HTTP 200, status ok | Processo backend; non verifica database, modello o email |

Nessun token, cookie o account paziente nelle richieste. TLS verificato;
non disabilitare il controllo del certificato. Notifiche sia di indisponibilità
sia di rientro, con nome esplicitamente Test per evitare confusione con
produzione. Verificare il contatto email del fornitore prima di affidarsi agli
avvisi. Se supportati, usare tentativi di conferma e timeout compatibile con
un cold start; non dichiarare un servizio guarito soltanto dal frontend 200.

## Vincolo Render Free verificato

Il 13 ottobre 2026 le API Render confermano piano free sia per test sia per
produzione. Il test ha healthCheckPath /health; produzione non lo ha impostato.
Non modificare il servizio produzione o puntarlo al nuovo endpoint senza un
rilascio esplicito: non è detto che quel codice sia già presente in produzione.

Un ping periodico del backend può impedire lo sleep e consumare le ore gratuite
del workspace. Prima di attivare il monitor API continuo, verificare quota e
consumo reali nella dashboard Render e concordare modalità: finestre di prova,
controllo continuo consapevole del consumo oppure un futuro piano adeguato.
Non effettuare upgrade a pagamento automaticamente. Un cold start del test
può produrre lentezza senza indicare un guasto applicativo persistente.

Il monitor frontend può essere configurato separatamente. Per UptimeRobot
Free si propone l'intervallo offerto dal piano, normalmente cinque minuti,
da verificare nel pannello corrente; non si promette una frequenza inferiore
né tempi di rilevamento garantiti. La capacità di pause/scheduling e tentativi
va verificata nel piano scelto prima di promettere controllo per fascia oraria.

## Prova richiesta prima di dichiararlo attivo

1. Monitor creati nell'account del responsabile, URL e TLS verificati.
2. Contatto info@myndself.ai verificato dal fornitore e associato ai monitor.
3. Prova della notifica esterna con un endpoint di prova controllato, senza
   spegnere o alterare il backend reale per provocare un allarme.
4. Verifica del rientro e del destinatario, con pulizia del monitor di prova.
5. Responsabile operativo, comportamento nei cold start e consumo Free chiariti.

Una procedura scritta, una singola richiesta HTTP riuscita o l'email inviata
tramite Resend dal monitor interno non dimostrano attivazione di questo
monitor indipendente. Stato attuale: configurazione proposta, attivazione
bloccata dall'accesso al servizio e dalla decisione sul controllo API continuo.
