const { sendEmail } = require('../utils/emailService');
const { renderMail, esc } = require('../utils/mailTemplate');
const { pool } = require('../db/database');

// Destinatario dei messaggi "Contatti": l'organizzatore. Modificabile con la variabile CONTACT_EMAIL.
const CONTACT_EMAIL = process.env.CONTACT_EMAIL || 'sicurezza.cenci@gmail.com';
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Limite semplice anti-abuso: massimo 5 messaggi all'ora per indirizzo IP.
const recent = new Map();
const tooMany = (ip) => {
  const now = Date.now();
  const list = (recent.get(ip) || []).filter(t => now - t < 3600e3);
  if (list.length >= 5) return true;
  list.push(now);
  recent.set(ip, list);
  return false;
};

// Messaggio dal modulo "Contatti": arriva all'organizzatore con "Rispondi a" impostato su chi scrive.
const sendContact = async (req, res) => {
  const name = String(req.body.name || '').trim().slice(0, 100);
  const email = String(req.body.email || '').trim().toLowerCase().slice(0, 200);
  const subject = String(req.body.subject || '').trim().slice(0, 150);
  const message = String(req.body.message || '').trim().slice(0, 4000);
  // Campo esca invisibile: se qualcuno lo compila e' un bot.
  if (req.body.website) return res.json({ message: 'Messaggio inviato' });
  if (!name || !message) return res.status(400).json({ error: 'Scrivi il tuo nome e il messaggio' });
  if (!EMAIL_RE.test(email)) return res.status(400).json({ error: 'Inserisci un indirizzo email valido, così possiamo risponderti' });
  if (tooMany(req.ip)) return res.status(429).json({ error: 'Hai già inviato diversi messaggi: riprova tra un’ora' });

  // Il messaggio resta comunque leggibile nel pannello Notifiche, anche se l'email non dovesse partire.
  await pool.query('INSERT INTO admin_events (type, message) VALUES ($1, $2)',
    ['contatto', `Messaggio da ${name} (${email})${subject ? ' — ' + subject : ''}: «${message}»`]).catch(() => {});
  const { html, text } = renderMail({
    greeting: `Nuovo messaggio dal sito da ${name} (${email})`,
    body: `${subject ? `Oggetto: ${subject}\n\n` : ''}${message}`,
    footer: `Premi «Rispondi» per scrivere direttamente a ${esc(email)}.`,
  });
  const ok = await sendEmail(CONTACT_EMAIL, `✉️ Contatti — ${subject || 'messaggio da ' + name}`, text, html, { replyTo: { email, name } });
  if (!ok) return res.status(502).json({ error: 'Invio non riuscito, riprova tra poco o scrivi direttamente all’indirizzo indicato' });
  res.json({ message: 'Messaggio inviato' });
};

module.exports = { sendContact, CONTACT_EMAIL };
