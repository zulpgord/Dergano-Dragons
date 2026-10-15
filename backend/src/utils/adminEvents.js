const { pool } = require('../db/database');
const { sendEmail } = require('./emailService');
const { FRONTEND_URL, renderMail } = require('./mailTemplate');

// Registro degli eventi per gli admin (nuovi iscritti, iscrizioni, defezioni, ...).
// Ogni evento finisce nel pannello «Notifiche» e, a chi lo vuole, arriva subito via email.
// Non blocca mai la richiesta che lo genera: gli errori finiscono solo nei log.
const ICONS = { registrazione: '🆕', iscrizione: '⚔️', attesa: '⏳', defezione: '🚪', promozione: '🎉', account_eliminato: '🗑️', newsletter: '📜', contatto: '✉️' };

const fmtRome = (d) => new Date(d).toLocaleString('it-IT', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Rome' });

// Descrizione breve di una sessione: "Libreria Scamamu · sab 18 ott, 16:00"
const shiftLabel = async (shiftId) => {
  const { rows: [s] } = await pool.query(
    `SELECT s.start_time, s.required_count, l.name AS location_name,
            (SELECT COALESCE(SUM(seats),0) FROM assignments WHERE shift_id = s.id AND status = 'assigned')::int AS taken
     FROM shifts s JOIN locations l ON l.id = s.location_id WHERE s.id = $1`, [shiftId]);
  return s ? { text: `${s.location_name} · ${fmtRome(s.start_time)}`, seats: `${s.taken}/${s.required_count} posti` } : { text: 'sessione', seats: '' };
};

const logEvent = (type, message, actorId = null) => {
  (async () => {
    await pool.query('INSERT INTO admin_events (type, message, actor_id) VALUES ($1, $2, $3)', [type, message, actorId]);
    const { rows: admins } = await pool.query(
      "SELECT id, email, name FROM users WHERE role = 'admin' AND admin_email_notify = TRUE AND id IS DISTINCT FROM $1", [actorId]);
    const icon = ICONS[type] || '🔔';
    for (const a of admins) {
      const { html, text } = renderMail({
        greeting: `Ciao ${a.name},`,
        body: `${icon} ${message}`,
        button: { label: 'Apri le notifiche', url: `${FRONTEND_URL}/admin?tab=notifiche` },
        footer: 'Ricevi questa email perché sei amministratore di Dergano & Dragons. Puoi disattivarle da Admin → Notifiche.',
      });
      await sendEmail(a.email, `${icon} ${message.length > 70 ? message.slice(0, 67) + '…' : message}`, text, html);
    }
  })().catch(err => console.error('Admin event error:', err.message));
};

module.exports = { logEvent, shiftLabel };
