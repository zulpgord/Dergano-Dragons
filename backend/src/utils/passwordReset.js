const crypto = require('crypto');
const { pool } = require('../db/database');
const { sendEmail } = require('./emailService');
const { FRONTEND_URL, renderMail } = require('./mailTemplate');

const TTL_MIN = 60;
const hashToken = t => crypto.createHash('sha256').update(t).digest('hex');

// Crea un link monouso (valido 1 ora) e lo invia per email. Nel database resta solo l'hash.
// Massimo 3 richieste all'ora per utente, per evitare abusi.
const sendResetEmail = async (user, byName) => {
  const { rows: [{ n }] } = await pool.query(
    "SELECT count(*)::int AS n FROM password_resets WHERE user_id = $1 AND created_at > NOW() - INTERVAL '1 hour'",
    [user.id]
  );
  if (n >= 3) return 'limit';
  const token = crypto.randomBytes(32).toString('base64url');
  await pool.query(
    `INSERT INTO password_resets (token_hash, user_id, expires_at) VALUES ($1, $2, NOW() + INTERVAL '${TTL_MIN} minutes')`,
    [hashToken(token), user.id]
  );
  const intro = byName
    ? `${byName} ha chiesto di reimpostare la tua password di Dergano & Dragons.`
    : 'Hai chiesto di reimpostare la tua password di Dergano & Dragons.';
  const { html, text } = renderMail({
    greeting: `Ciao ${user.name},`,
    body: `${intro} Tocca il pulsante per sceglierne una nuova.`,
    button: { label: 'Scegli una nuova password', url: `${FRONTEND_URL}/reset?token=${token}` },
    footer: `Il link vale ${TTL_MIN} minuti e si può usare una sola volta. Se non sei stato tu, ignora questa email: la tua password non cambia.`,
  });
  const ok = await sendEmail(user.email, 'Reimposta la tua password · Dergano & Dragons', text, html);
  return ok ? 'sent' : 'error';
};

// Consuma il token: valido, non scaduto, non gia' usato. Restituisce l'id utente o null.
const consumeResetToken = async (token, client = pool) => {
  const { rows } = await client.query(
    `UPDATE password_resets SET used_at = NOW()
     WHERE token_hash = $1 AND used_at IS NULL AND expires_at > NOW()
     RETURNING user_id`,
    [hashToken(token)]
  );
  return rows[0]?.user_id ?? null;
};

module.exports = { sendResetEmail, consumeResetToken };
