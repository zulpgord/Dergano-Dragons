export default function PrivacyPage() {
  const sectionStyle = { marginBottom: '1.5rem' };
  const h2Style = { fontFamily: 'Titan One, Luckiest Guy, fantasy', color: '#b0801a', fontSize: '1.1rem', marginBottom: '8px' };
  const pStyle = { color: 'var(--text, #262019)', fontSize: '0.95rem', lineHeight: 1.6, margin: '0 0 8px' };
  const noteStyle = {
    background: 'rgba(162,59,34,0.08)', border: '1px solid rgba(162,59,34,0.3)', borderRadius: '8px',
    padding: '12px 16px', fontSize: '0.85rem', color: '#a23b22', marginBottom: '2rem',
  };

  return (
    <div style={{ minHeight: '100vh', padding: '32px 20px', background: 'var(--bg-page, #f4ead4)' }}>
      <div style={{
        maxWidth: '680px', margin: '0 auto', background: 'var(--bg-card, #fffbf2)',
        border: '1px solid var(--border, #ddd0b3)', borderRadius: '12px', padding: '2rem',
        boxShadow: '0 8px 28px rgba(38,32,25,0.12)',
      }}>
        <h1 style={{ fontFamily: 'Titan One, Luckiest Guy, fantasy', color: '#b0801a', fontSize: '1.4rem', marginBottom: '4px' }}>
          Informativa sulla privacy
        </h1>
        <p style={{ color: '#8a7f6c', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
          Dergano &amp; Dragons — ultimo aggiornamento: [inserire data di pubblicazione]
        </p>

        <div style={noteStyle}>
          ⚠️ Bozza tecnica: questo testo descrive onestamente cosa fa l'app, ma non sostituisce una revisione legale — specialmente perché tra gli utenti ci sono minori. Prima di considerarla definitiva, falla rileggere a chi può darti un parere qualificato.
        </div>

        <div style={sectionStyle}>
          <h2 style={h2Style}>Chi tratta i tuoi dati</h2>
          <p style={pStyle}>
            Titolare del trattamento: [inserire nome/ragione sociale e contatto — es. email dedicata al progetto].
            Per qualsiasi domanda su questa informativa o sui tuoi dati puoi scrivere a [inserire indirizzo email di contatto].
          </p>
        </div>

        <div style={sectionStyle}>
          <h2 style={h2Style}>Che dati raccogliamo</h2>
          <p style={pStyle}>Quando crei un account raccogliamo solo: nome, indirizzo email, e una password (che salviamo in forma cifrata, mai in chiaro).</p>
          <p style={pStyle}>Quando prenoti una sessione, registriamo quale sessione e quanti posti hai richiesto, così da gestire calendario e liste d'attesa.</p>
        </div>

        <div style={sectionStyle}>
          <h2 style={h2Style}>Perché li usiamo</h2>
          <p style={pStyle}>Esclusivamente per farti accedere al servizio, gestire le prenotazioni delle sessioni di gioco e comunicarti informazioni relative alla tua iscrizione (conferma, lista d'attesa, promozione). Non usiamo i tuoi dati per finalità di marketing né li vendiamo o cediamo a terzi.</p>
        </div>

        <div style={sectionStyle}>
          <h2 style={h2Style}>Dati di chi ha meno di 14 anni</h2>
          <p style={pStyle}>
            Se hai meno di 14 anni, la registrazione richiede il consenso di un genitore o di chi ne ha la responsabilità genitoriale.
            [Da definire con un parere qualificato: come questo consenso viene verificato o raccolto in pratica, oltre alla dichiarazione data in fase di registrazione.]
          </p>
        </div>

        <div style={sectionStyle}>
          <h2 style={h2Style}>Dove sono conservati i dati</h2>
          <p style={pStyle}>
            I dati sono conservati su un database fornito da Neon (ospitato su infrastruttura Amazon Web Services, region Stati Uniti) e il servizio applicativo gira su Render. Questo comporta un trasferimento di dati fuori dall'Unione Europea.
            [Da verificare con le condizioni contrattuali di Neon/Render/Vercel: quali garanzie offrono per questo trasferimento — es. clausole contrattuali standard.]
          </p>
        </div>

        <div style={sectionStyle}>
          <h2 style={h2Style}>Per quanto tempo li conserviamo</h2>
          <p style={pStyle}>[Da definire: per quanto tempo mantieni gli account e le prenotazioni dopo che una persona smette di partecipare — es. cancellazione automatica dopo un periodo di inattività, oppure conservazione finché l'account non viene eliminato dall'utente.]</p>
        </div>

        <div style={sectionStyle}>
          <h2 style={h2Style}>I tuoi diritti</h2>
          <p style={pStyle}>Puoi in ogni momento:</p>
          <ul style={{ ...pStyle, paddingLeft: '20px' }}>
            <li>vedere quali dati abbiamo su di te (nome ed email sono sempre visibili nel tuo profilo);</li>
            <li>chiedere che vengano corretti, se sbagliati;</li>
            <li>eliminare il tuo account in autonomia in qualsiasi momento, dalla tua area personale — questo cancella anche tutte le tue prenotazioni;</li>
            <li>scrivere a [inserire contatto] per qualsiasi altra richiesta relativa ai tuoi dati.</li>
          </ul>
        </div>

        <div style={sectionStyle}>
          <h2 style={h2Style}>Sicurezza</h2>
          <p style={pStyle}>Le password sono conservate cifrate (mai leggibili, nemmeno da chi amministra l'app). L'accesso alle funzioni di amministrazione è riservato a chi gestisce le sessioni di gioco.</p>
        </div>
      </div>
    </div>
  );
}
