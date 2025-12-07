// src/Privacy.tsx

export default function PrivacyPage() {
  const year = new Date().getFullYear();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* HEADER */}
      <header className="border-b border-white/10">
        <div className="max-w-5xl mx-auto flex items-center justify-between px-4 py-4">
          <a href="/" className="flex items-center gap-2">
            <img
              src="/logo.svg"
              alt="Myndself.ai"
              className="h-7 w-7 rounded-md"
            />
            <span className="font-semibold tracking-tight text-sm md:text-base">
              Myndself.ai
            </span>
          </a>
          <a
            href="/"
            className="text-xs md:text-sm text-slate-400 hover:text-slate-100 transition"
          >
            Torna alla home
          </a>
        </div>
      </header>

      {/* CONTENUTO */}
      <main className="flex-1">
        <section className="max-w-3xl mx-auto px-4 py-10 md:py-14">
          <h1 className="text-3xl md:text-4xl font-semibold mb-2">
            Privacy Policy di Myndself.ai
          </h1>
          <p className="text-sm text-slate-400 mb-8">
            Ultimo aggiornamento: 07.12.2025
          </p>

          {/* 👇 QUI INCOLLA TUTTO IL TESTO DELLA PRIVACY CHE AVEVAMO GIÀ */}

          <p className="mb-4">
            La presente informativa descrive come Myndself.ai raccoglie, utilizza
            e protegge i tuoi dati personali quando utilizzi il servizio.
          </p>

          <h2 className="text-xl font-semibold mt-8 mb-3">
            1. Titolare del trattamento
          </h2>
          <p className="mb-4">
            Il Titolare del trattamento è:
            <br />
            <strong>Alessandro Anselmi</strong>
            <br />
            Via Giacomo Mercoli 3
            <br />
            6900 Lugano, Svizzera
            <br />
            Email:{" "}
            <a href="mailto:privacy@myndself.ai" className="underline">
              privacy@myndself.ai
            </a>
          </p>

          <h2 className="text-xl font-semibold mt-8 mb-3">2. Dati raccolti</h2>
          <p className="mb-2">
            Quando utilizzi Myndself.ai possiamo raccogliere le seguenti categorie di dati:
          </p>
          <ul className="list-disc list-inside mb-4 space-y-1">
            <li>
              <strong>Dati identificativi di base</strong>: email, nome (se fornito).
            </li>
            <li>
              <strong>Dati di utilizzo</strong>: data e ora di accesso, numero di
              riflessioni, check–in, funzionalità utilizzate, interazioni con
              l’interfaccia.
            </li>
            <li>
              <strong>Dati emotivi e di journaling</strong>: testi inseriti, tag emotivi,
              valutazioni del tuo stato emotivo e altre informazioni che scegli
              volontariamente di condividere.
            </li>
          </ul>

          <h2 className="text-xl font-semibold mt-8 mb-3">
          3. Finalità e basi giuridiche
        </h2>
        <p className="mb-2">Utilizziamo i tuoi dati per le seguenti finalità:</p>
        <ul className="list-disc list-inside mb-4 space-y-1">
          <li>
            <strong>Erogazione del servizio</strong>
            <br />
            Per permetterti di creare riflessioni, salvare lo storico, utilizzare i check–in
            e le funzionalità dell’app.
            <br />
            <em>Base giuridica:</em> esecuzione del servizio da te richiesto.
          </li>
          <li>
            <strong>Personalizzazione dell’esperienza</strong>
            <br />
            Per proporti insight, promemoria e contenuti più rilevanti in base al tuo uso
            e alle tue preferenze.
            <br />
            <em>Base giuridica:</em> interesse legittimo a migliorare il servizio,
            combinato con il tuo consenso.
          </li>
          <li>
            <strong>Analisi e miglioramento del servizio</strong>
            <br />
            Per analizzare in forma aggregata l’utilizzo (es. frequenza riflessioni, trend
            emozionali) e migliorare algoritmi e funzionalità.
            <br />
            <em>Base giuridica:</em> interesse legittimo del Titolare.
          </li>
          <li>
            <strong>Comunicazioni via email</strong>
            <br />
            Per inviarti email settimanali di riepilogo, aggiornamenti sul servizio e,
            se acconsenti, informazioni su nuove funzionalità.
            <br />
            <em>Base giuridica:</em> consenso. Puoi revocarlo in qualsiasi momento.
          </li>
        </ul>

        <h2 className="text-xl font-semibold mt-8 mb-3">4. Conservazione dei dati</h2>
        <p className="mb-4">
          I dati sono conservati per il tempo necessario a:
        </p>
        <ul className="list-disc list-inside mb-4 space-y-1">
          <li>fornirti il servizio;</li>
          <li>sviluppare analisi interne su base anonima o aggregata;</li>
          <li>adempiere a eventuali obblighi legali.</li>
        </ul>
        <p className="mb-4">
          Puoi richiedere la cancellazione del tuo account e dei dati associati in
          qualsiasi momento scrivendo a{" "}
          <a href="mailto:privacy@myndself.ai" className="underline">
            privacy@myndself.ai
          </a>
          .
        </p>

        <h2 className="text-xl font-semibold mt-8 mb-3">5. Condivisione dei dati</h2>
        <p className="mb-4">
          Non vendiamo i tuoi dati personali a terzi.
        </p>
        <p className="mb-2">
          Possiamo tuttavia condividere alcuni dati con fornitori di servizi che ci aiutano
          a gestire la piattaforma, tra cui:
        </p>
        <ul className="list-disc list-inside mb-4 space-y-1">
          <li>servizi di hosting e infrastruttura (es. provider cloud);</li>
          <li>servizi di database e autenticazione;</li>
          <li>servizi di analytics e monitoraggio.</li>
        </ul>
        <p className="mb-4">
          Tali fornitori agiscono come responsabili del trattamento e sono vincolati da
          accordi che prevedono misure di sicurezza adeguate e rispetto delle normative
          sulla protezione dei dati.
        </p>

        <h2 className="text-xl font-semibold mt-8 mb-3">6. Trasferimenti internazionali</h2>
        <p className="mb-4">
          Alcuni fornitori di servizi potrebbero trovarsi in Paesi diversi dalla Svizzera
          e dall’Unione Europea. In questi casi adottiamo, ove necessario, misure idonee a
          garantire un livello di protezione adeguato (come clausole contrattuali standard
          o strumenti equivalenti previsti dalla normativa applicabile).
        </p>

        <h2 className="text-xl font-semibold mt-8 mb-3">7. Sicurezza dei dati</h2>
        <p className="mb-4">
          Adottiamo misure tecniche e organizzative ragionevoli per proteggere i dati
          personali da accessi non autorizzati, perdita o divulgazione. Tuttavia nessun
          sistema è completamente inviolabile e non possiamo garantire la sicurezza
          assoluta del trasferimento o della conservazione dei dati.
        </p>

        <h2 className="text-xl font-semibold mt-8 mb-3">8. I tuoi diritti</h2>
        <p className="mb-2">
          In linea con la normativa svizzera e, ove applicabile, con il GDPR, hai diritto a:
        </p>
        <ul className="list-disc list-inside mb-4 space-y-1">
          <li>ottenere conferma dell’esistenza di dati che ti riguardano;</li>
          <li>accedere ai tuoi dati personali;</li>
          <li>richiedere la rettifica o l’aggiornamento dei dati inesatti o incompleti;</li>
          <li>richiedere la cancellazione dei dati nei casi previsti dalla legge;</li>
          <li>
            revocare il consenso in qualsiasi momento, senza pregiudicare la liceità del
            trattamento basato sul consenso prima della revoca;
          </li>
          <li>opporti ad alcuni trattamenti basati sull’interesse legittimo;</li>
          <li>
            ottenere una copia portabile dei dati che hai fornito (ove tecnicamente
            possibile).
          </li>
        </ul>
        <p className="mb-4">
          Per esercitare tali diritti puoi contattarci a{" "}
          <a href="mailto:privacy@myndself.ai" className="underline">
            privacy@myndself.ai
          </a>
          .
        </p>

        <h2 className="text-xl font-semibold mt-8 mb-3">
          9. Uso dell’intelligenza artificiale
        </h2>
        <p className="mb-4">
          Myndself.ai utilizza modelli di intelligenza artificiale per generare suggerimenti
          e riflessioni guidate. I dati che inserisci possono essere utilizzati per
          personalizzare le risposte e, in forma anonima o aggregata, per migliorare la
          qualità del servizio.
        </p>
        <p className="mb-4">
          I contenuti generati dall’AI possono occasionalmente essere imprecisi o non
          adeguati al tuo contesto. Ti invitiamo a usarli in modo critico e a non
          considerarli come consigli professionali o terapeutici.
        </p>

        <h2 className="text-xl font-semibold mt-8 mb-3">10. Beta testing</h2>
        <p className="mb-4">
          Durante la fase beta potremmo raccogliere ulteriori dati di utilizzo (ad esempio,
          frequenza di accesso, funzionalità più usate, tassi di ritorno settimanale)
          esclusivamente per migliorare l’esperienza e valutare l’efficacia della
          piattaforma. Queste analisi vengono effettuate ove possibile in forma aggregata o
          pseudonimizzata.
        </p>

        <h2 className="text-xl font-semibold mt-8 mb-3">
          11. Modifiche alla presente informativa
        </h2>
        <p className="mb-4">
          Potremo aggiornare la presente Privacy Policy per riflettere cambiamenti
          normativi o evoluzioni del servizio. In caso di modifiche sostanziali potremo
          informarti tramite email o notifiche nell’app. La versione più aggiornata è
          sempre disponibile su questa pagina.
        </p>

        <h2 className="text-xl font-semibold mt-8 mb-3">12. Contatti</h2>
        <p className="mb-4">
          Per qualsiasi domanda sulla protezione dei dati personali o sulla presente
          informativa, puoi scrivere a:{" "}
          <a href="mailto:privacy@myndself.ai" className="underline">
            privacy@myndself.ai
          </a>
          .
        </p>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="border-t border-white/10">
        <div className="max-w-5xl mx-auto px-4 py-6 text-xs text-slate-500 flex flex-wrap gap-4 justify-between">
          <span>© {year} Myndself.ai • Tutti i diritti riservati</span>
          <div className="flex gap-4">
            <a href="/terms" className="underline hover:text-slate-300">
              Termini d’uso
            </a>
            <a href="/privacy" className="underline hover:text-slate-300">
              Privacy Policy
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}



