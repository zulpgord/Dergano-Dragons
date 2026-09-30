require('dotenv').config();

// Render blocca le porte SMTP (25, 465, 587) sui servizi gratuiti, quindi ogni
// invio via SMTP finisce in timeout. L'API di Brevo passa dalla 443, che e' aperta.
const BREVO_SEND = 'https://api.brevo.com/v3/smtp/email';
const BREVO_ACCOUNT = 'https://api.brevo.com/v3/account';

// EMAIL_FROM accetta sia "Nome <indirizzo>" sia il solo indirizzo.
const parseSender = (value = '') => {
  const match = value.match(/^\s*(.*?)\s*<(.+?)>\s*$/);
  return match ? { name: match[1] || undefined, email: match[2] } : { email: value.trim() };
};

const sendEmail = async (to, subject, text, html = null) => {
  if (!process.env.BREVO_API_KEY || !process.env.EMAIL_FROM) {
    console.error(`Email non inviata a ${to}: BREVO_API_KEY o EMAIL_FROM mancante`);
    return null;
  }
  try {
    const res = await fetch(BREVO_SEND, {
      method: 'POST',
      headers: {
        'api-key': process.env.BREVO_API_KEY,
        'content-type': 'application/json',
        accept: 'application/json',
      },
      body: JSON.stringify({
        sender: parseSender(process.env.EMAIL_FROM),
        to: [{ email: to }],
        subject,
        textContent: text,
        htmlContent: html || text.replace(/\n/g, '<br>'),
      }),
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) {
      console.error(`Email sending error (to ${to}): HTTP ${res.status} — ${await res.text()}`);
      return null;
    }
    const info = await res.json();
    console.log(`Email sent to ${to}: ${info.messageId || 'ok'}`);
    return info;
  } catch (err) {
    console.error(`Email sending error (to ${to}): ${err.message}`);
    // Non rilanciare: l'invio non deve mai bloccare la risposta al client.
    return null;
  }
};

// Controlla la chiave all'avvio senza inviare nulla, cosi' un problema di
// configurazione si vede nei log subito invece di emergere a una prenotazione.
const missing = ['BREVO_API_KEY', 'EMAIL_FROM'].filter(k => !process.env[k]);
if (missing.length > 0) {
  console.error(`📧 Email NON configurata — variabili mancanti: ${missing.join(', ')}`);
} else {
  fetch(BREVO_ACCOUNT, {
    headers: { 'api-key': process.env.BREVO_API_KEY, accept: 'application/json' },
    signal: AbortSignal.timeout(10000),
  })
    .then(res => res.ok
      ? console.log(`📧 Email pronta via Brevo — mittente ${parseSender(process.env.EMAIL_FROM).email}`)
      : console.error(`📧 Email NON funzionante: chiave Brevo rifiutata (HTTP ${res.status})`))
    .catch(err => console.error(`📧 Email NON verificabile: ${err.message}`));
}

module.exports = { sendEmail };
