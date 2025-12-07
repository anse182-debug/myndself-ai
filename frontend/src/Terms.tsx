// src/Terms.tsx

export default function TermsPage() {
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
            Termini d’uso di Myndself.ai
          </h1>
          <p className="text-sm text-slate-400 mb-8">
            Ultimo aggiornamento: 07.12.2025
          </p>

          {/* 👇 QUI INCOLLA TUTTO IL TESTO LEGALE CHE AVEVAMO GIÀ */}
          {/* Inizia il contenuto dei Termini */}

          <h2 className="text-xl font-semibold mt-8 mb-3">1. Chi siamo</h2>
          <p className="mb-4">
            Myndself.ai è una piattaforma digitale che offre strumenti per il
            benessere personale, la gestione delle emozioni e la riflessione
            guidata tramite intelligenza artificiale.
          </p>
          <p className="mb-4">
            Il servizio è fornito da:
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

          <h2 className="text-xl font-semibold mt-8 mb-3">
            2. Accettazione dei Termini
          </h2>
          <p className="mb-4">
            Accedendo o utilizzando Myndself.ai, accetti di essere vincolato dai
            presenti Termini d’uso (“Termini”). Se non li accetti, non utilizzare
            il servizio.
          </p>
          <p className="mb-4">
            Durante la fase beta il servizio è fornito a titolo sperimentale e
            potrà essere modificato, limitato o sospeso in qualsiasi momento
            senza preavviso.
          </p>

        <h2 className="text-xl font-semibold mt-8 mb-3">
          3. Natura del servizio – Nessun consiglio medico
        </h2>
        <p className="mb-4">
          Myndself.ai non fornisce in alcun modo consulenza medica, psicologica
          o psichiatrica. I contenuti generati dalla piattaforma, inclusi quelli
          prodotti dall’AI, hanno esclusivamente scopo informativo e di supporto
          personale.
        </p>
        <p className="mb-2">Myndself.ai non:</p>
        <ul className="list-disc list-inside mb-4 space-y-1">
          <li>diagnostica disturbi mentali o fisici;</li>
          <li>cura o tratta condizioni mediche o psicologiche;</li>
          <li>fornisce indicazioni terapeutiche o farmacologiche;</li>
          <li>
            sostituisce il rapporto con medici, psicologi, psichiatri o altri
            professionisti.
          </li>
        </ul>
        <p className="mb-4">
          Se stai vivendo una situazione di crisi, pensieri autolesivi, forte
          disagio o ritieni di avere bisogno di aiuto professionale, contatta
          immediatamente un servizio di emergenza, il tuo medico o uno
          specialista qualificato nel tuo Paese.
        </p>

        <h2 className="text-xl font-semibold mt-8 mb-3">4. Età e idoneità</h2>
        <p className="mb-4">
          Il servizio è destinato esclusivamente a persone di età pari o
          superiore a 18 anni. Utilizzando Myndself.ai, dichiari di avere almeno
          18 anni e di avere la capacità giuridica per accettare questi Termini.
        </p>

        <h2 className="text-xl font-semibold mt-8 mb-3">5. Uso consentito</h2>
        <p className="mb-4">
          Ti impegni a utilizzare Myndself.ai in modo lecito, responsabile e
          conforme ai presenti Termini. In particolare, ti è vietato:
        </p>
        <ul className="list-disc list-inside mb-4 space-y-1">
          <li>
            utilizzare il servizio per attività illegali, offensive o
            discriminatorie;
          </li>
          <li>
            tentare di accedere in modo non autorizzato ai sistemi, al codice o
            ai dati di altri utenti;
          </li>
          <li>
            copiare, modificare, reverse–engineerare o distribuire il servizio o
            parti di esso;
          </li>
          <li>
            utilizzare Myndself.ai per raccogliere o trattare dati di terzi
            senza il loro consenso.
          </li>
        </ul>

        <h2 className="text-xl font-semibold mt-8 mb-3">
          6. Account e sicurezza
        </h2>
        <p className="mb-4">
          Potrebbe esserti richiesto di creare un account per utilizzare alcune
          funzionalità. Sei responsabile di:
        </p>
        <ul className="list-disc list-inside mb-4 space-y-1">
          <li>mantenere riservate le credenziali di accesso;</li>
          <li>
            informarci prontamente in caso di sospetto uso non autorizzato
            dell’account;
          </li>
          <li>tutte le attività svolte tramite il tuo account.</li>
        </ul>

        <h2 className="text-xl font-semibold mt-8 mb-3">
          7. Proprietà intellettuale
        </h2>
        <p className="mb-4">
          Tutti i diritti sul marchio, sul design, sull’interfaccia, sui testi e
          sul software di Myndself.ai sono di proprietà di Alessandro Anselmi o
          dei suoi licenzianti. Ti viene concesso un diritto d’uso limitato, non
          esclusivo e revocabile, esclusivamente per fini personali e non
          commerciali.
        </p>

        <h2 className="text-xl font-semibold mt-8 mb-3">
          8. Contenuti generati dall’utente
        </h2>
        <p className="mb-4">
          I contenuti che inserisci (riflessioni, tag emotivi, note personali,
          ecc.) restano tuoi. Con il loro inserimento concedi a Myndself.ai una
          licenza limitata ad utilizzarli, in forma anonima o aggregata, per:
        </p>
        <ul className="list-disc list-inside mb-4 space-y-1">
          <li>erogare il servizio;</li>
          <li>migliorare funzionalità e modelli;</li>
          <li>effettuare analisi statistiche interne.</li>
        </ul>

        <h2 className="text-xl font-semibold mt-8 mb-3">
          9. Limitazione di responsabilità
        </h2>
        <p className="mb-4">
          Myndself.ai è fornito “così com’è” e “come disponibile”, senza
          garanzie di risultato, continuità o assenza di errori. Nei limiti
          massimi consentiti dalla legge applicabile, il Titolare non è
          responsabile per:
        </p>
        <ul className="list-disc list-inside mb-4 space-y-1">
          <li>
            decisioni prese sulla base dei contenuti generati dall’app o
            dall’AI;
          </li>
          <li>
            eventuali interruzioni, malfunzionamenti, perdita di dati o problemi
            tecnici;
          </li>
          <li>
            eventuali conseguenze psicologiche derivanti da un utilizzo
            improprio o non supervisionato del servizio.
          </li>
        </ul>

        <h2 className="text-xl font-semibold mt-8 mb-3">
          10. Modifiche al servizio e ai Termini
        </h2>
        <p className="mb-4">
          Myndself.ai potrà modificare, sospendere o interrompere il servizio
          (in tutto o in parte) in qualsiasi momento, in particolare durante la
          fase beta.
        </p>
        <p className="mb-4">
          I presenti Termini potranno essere aggiornati. In caso di modifiche
          sostanziali potremo informarti tramite email o notifiche nell’app.
          L’uso continuato del servizio dopo tali modifiche implica
          l’accettazione dei nuovi Termini.
        </p>

        <h2 className="text-xl font-semibold mt-8 mb-3">
          11. Legge applicabile e foro competente
        </h2>
        <p className="mb-4">
          I presenti Termini sono regolati dal diritto svizzero. Per qualsiasi
          controversia relativa all’uso di Myndself.ai sarà competente in via
          esclusiva il foro di Lugano, fatti salvi eventuali diritti
          inderogabili dell’utente previsti dalla legge.
        </p>

        <h2 className="text-xl font-semibold mt-8 mb-3">12. Contatti</h2>
        <p className="mb-4">
          Per domande sui presenti Termini, puoi contattarci a:{" "}
          <a href="mailto:privacy@myndself.ai" className="underline">
            privacy@myndself.ai
          </a>
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







        
 
