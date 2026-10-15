const jwt = require('jsonwebtoken');
const { pool } = require('../db/database');
const { sendEmail } = require('../utils/emailService');
const { sendResetEmail } = require('../utils/passwordReset');
const { FRONTEND_URL, renderMail } = require('../utils/mailTemplate');

// Get all users (admin only)
const getUsers = async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, email, name, role, created_at FROM users ORDER BY LOWER(name) ASC'
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Get users error:', err);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
};

// Update user role (admin only)
const updateUserRole = async (req, res) => {
  const { id } = req.params;
  const { role } = req.body;
  if (!['admin', 'volunteer'].includes(role)) {
    return res.status(400).json({ error: 'Role must be admin or volunteer' });
  }
  if (parseInt(id) === req.user.id) {
    return res.status(400).json({ error: 'Cannot change your own role' });
  }
  try {
    const result = await pool.query(
      'UPDATE users SET role = $1, updated_at = NOW() WHERE id = $2 RETURNING id, email, name, role',
      [role, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });
    res.json({ message: 'Role updated', user: result.rows[0] });
  } catch (err) {
    console.error('Update user role error:', err);
    res.status(500).json({ error: 'Failed to update role' });
  }
};

// Update user name (admin only) — non tocca l'email
const updateUserName = async (req, res) => {
  const { id } = req.params;
  const { name } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Name is required' });
  }
  try {
    const result = await pool.query(
      'UPDATE users SET name = $1, updated_at = NOW() WHERE id = $2 RETURNING id, email, name, role',
      [name.trim(), id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });
    res.json({ message: 'Name updated', user: result.rows[0] });
  } catch (err) {
    console.error('Update user name error:', err);
    res.status(500).json({ error: 'Failed to update name' });
  }
};

// Reset user password (admin only)
const resetUserPassword = async (req, res) => {
  const { id } = req.params;
  const { new_password } = req.body;
  if (!new_password || new_password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }
  try {
    const bcrypt = require('bcrypt');
    const hash = await bcrypt.hash(new_password, 10);
    const result = await pool.query(
      'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2 RETURNING id',
      [hash, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });
    res.json({ message: 'Password reset successfully' });
  } catch (err) {
    console.error('Reset password error:', err);
    res.status(500).json({ error: 'Failed to reset password' });
  }
};

// Get booking stats per volunteer (admin only)
const getStats = async (req, res) => {
  const { month, year } = req.query;
  let dateFilter = '';
  const params = [];
  if (year) {
    params.push(parseInt(year));
    dateFilter += ` AND EXTRACT(YEAR FROM s.start_time AT TIME ZONE 'UTC' AT TIME ZONE 'Europe/Rome') = $${params.length}`;
  }
  if (month) {
    params.push(parseInt(month));
    dateFilter += ` AND EXTRACT(MONTH FROM s.start_time AT TIME ZONE 'UTC' AT TIME ZONE 'Europe/Rome') = $${params.length}`;
  }
  try {
    const result = await pool.query(
      `SELECT
        u.id,
        u.name,
        u.email,
        COUNT(a.id)::int AS total_bookings,
        COUNT(CASE WHEN a.status = 'assigned' THEN 1 END)::int AS active_bookings,
        COUNT(CASE WHEN a.status = 'cancelled' THEN 1 END)::int AS cancelled_bookings,
        COALESCE(SUM(CASE WHEN a.status = 'assigned' THEN EXTRACT(EPOCH FROM (s.end_time - s.start_time))/3600 END), 0)::numeric(10,1) AS total_hours
      FROM users u
      LEFT JOIN (assignments a JOIN shifts s ON a.shift_id = s.id ${dateFilter}) ON a.user_id = u.id
      WHERE u.role = 'volunteer'
      GROUP BY u.id, u.name, u.email
      ORDER BY total_bookings DESC`,
      params
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Get stats error:', err);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
};

// Get shift-level stats (total / cancelled / active) — admin only
const getShiftStats = async (req, res) => {
  const { month, year } = req.query;
  let dateFilter = '';
  const params = [];
  if (year) {
    params.push(parseInt(year));
    dateFilter += ` AND EXTRACT(YEAR FROM start_time) = $${params.length}`;
  }
  if (month) {
    params.push(parseInt(month));
    dateFilter += ` AND EXTRACT(MONTH FROM start_time) = $${params.length}`;
  }
  try {
    const result = await pool.query(
      `SELECT
        COUNT(*)::int AS total_shifts,
        COUNT(CASE WHEN cancelled = true THEN 1 END)::int AS cancelled_shifts,
        COUNT(CASE WHEN cancelled = false OR cancelled IS NULL THEN 1 END)::int AS active_shifts
      FROM shifts WHERE 1=1 ${dateFilter}`,
      params
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Get shift stats error:', err);
    res.status(500).json({ error: 'Failed to fetch shift stats' });
  }
};

// Fix future shifts with missing required_count
const fixFutureShifts = async (req, res) => {
  try {
    const result = await pool.query(
      "UPDATE shifts SET required_count = 1 WHERE start_time >= CURRENT_DATE + INTERVAL '1 day' AND (required_count IS NULL OR required_count < 1)"
    );
    res.json({ message: 'Fixed', updated: result.rowCount });
  } catch (err) {
    console.error('Fix future shifts error:', err);
    res.status(500).json({ error: 'Failed to fix shifts' });
  }
};

// L'admin manda a un iscritto il link per scegliere una nuova password (non la vede ne' la sceglie lui).
const sendUserResetLink = async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT id, name, email FROM users WHERE id = $1', [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'User not found' });
    const admin = await pool.query('SELECT name FROM users WHERE id = $1', [req.user.id]);
    const r = await sendResetEmail(rows[0], admin.rows[0]?.name || 'Un organizzatore');
    if (r === 'limit') return res.status(429).json({ error: 'Già inviati 3 link nell’ultima ora a questo utente' });
    if (r === 'error') return res.status(502).json({ error: 'Invio email non riuscito' });
    res.json({ message: `Link inviato a ${rows[0].email}` });
  } catch (err) {
    console.error('Send reset link error:', err);
    res.status(500).json({ error: 'Invio non riuscito' });
  }
};

// Newsletter: solo a chi ha dato il consenso. Ogni email ha il proprio link di disiscrizione.
// Con test=true va solo all'admin che la sta scrivendo, per vedere l'anteprima.
const sendNewsletter = async (req, res) => {
  const { subject, message, test } = req.body;
  // group_ids vuoto o assente = tutti gli iscritti alla newsletter; altrimenti solo i membri di quei tavoli.
  const groupIds = Array.isArray(req.body.group_ids) ? req.body.group_ids.map(Number).filter(Boolean) : [];
  if (!subject?.trim() || !message?.trim()) return res.status(400).json({ error: 'Oggetto e messaggio sono obbligatori' });
  try {
    const { rows } = test
      ? await pool.query('SELECT id, name, email FROM users WHERE id = $1', [req.user.id])
      : groupIds.length
        ? await pool.query(
            `SELECT DISTINCT u.id, u.name, u.email FROM users u JOIN user_groups ug ON ug.user_id = u.id
             WHERE u.newsletter_opt_in = TRUE AND ug.group_id = ANY($1) ORDER BY u.id`, [groupIds])
        : await pool.query('SELECT id, name, email FROM users WHERE newsletter_opt_in = TRUE ORDER BY id');
    if (rows.length === 0) return res.status(400).json({ error: groupIds.length ? 'Nessuno in questi tavoli ha accettato la newsletter' : 'Nessun iscritto ha ancora accettato la newsletter' });
    const apiBase = `${req.protocol}://${req.get('host')}`;
    const results = [];
    // In sequenza, per restare comodi nei limiti di Brevo.
    for (const u of rows) {
      const token = jwt.sign({ id: u.id, purpose: 'unsubscribe' }, process.env.JWT_SECRET);
      const unsub = `${apiBase}/api/auth/unsubscribe?token=${encodeURIComponent(token)}`;
      const { html, text } = renderMail({
        greeting: `Ciao ${u.name},`,
        body: message.trim(),
        button: { label: 'Apri Dergano & Dragons', url: FRONTEND_URL },
        footer: `Ricevi questa email perché hai scelto di ricevere la newsletter. <a href="${unsub}" style="color:#8a7a66">Non voglio più riceverla</a>.`,
      });
      const ok = await sendEmail(u.email, (test ? '[Prova] ' : '') + subject.trim(), `${text}

Per non ricevere più la newsletter: ${unsub}`, html);
      results.push(!!ok);
    }
    const sent = results.filter(Boolean).length;
    res.json({ message: 'Invio completato', sent, failed: results.length - sent, total: results.length });
  } catch (err) {
    console.error('Send newsletter error:', err);
    res.status(500).json({ error: 'Invio non riuscito' });
  }
};

const getNewsletterStats = async (req, res) => {
  try {
    const { rows: [r] } = await pool.query('SELECT count(*) FILTER (WHERE newsletter_opt_in)::int AS subscribed, count(*)::int AS total FROM users');
    const { rows: groups } = await pool.query(
      `SELECT g.id, g.name, count(u.id)::int AS members, count(u.id) FILTER (WHERE u.newsletter_opt_in)::int AS subscribed
       FROM groups g LEFT JOIN user_groups ug ON ug.group_id = g.id LEFT JOIN users u ON u.id = ug.user_id
       GROUP BY g.id ORDER BY g.name`
    );
    // Elenco persone con consenso e tavoli, per mostrare accanto alla newsletter chi la riceve e chi no.
    const { rows: users } = await pool.query(
      `SELECT u.id, u.name, u.email, u.newsletter_opt_in,
              COALESCE(array_agg(ug.group_id) FILTER (WHERE ug.group_id IS NOT NULL), '{}') AS group_ids
       FROM users u LEFT JOIN user_groups ug ON ug.user_id = u.id
       GROUP BY u.id ORDER BY u.newsletter_opt_in DESC, lower(u.name)`
    );
    res.json({ ...r, groups, users });
  } catch (err) {
    console.error('Newsletter stats error:', err);
    res.status(500).json({ error: 'Errore' });
  }
};

// Invito una tantum a chi non ha ancora accettato la newsletter: un pulsante registra il consenso.
// E' un messaggio di servizio sul proprio account, non la newsletter stessa.
const sendNewsletterInvite = async (req, res) => {
  const { test } = req.body;
  try {
    const { rows } = test
      ? await pool.query('SELECT id, name, email FROM users WHERE id = $1', [req.user.id])
      : await pool.query('SELECT id, name, email FROM users WHERE newsletter_opt_in = FALSE ORDER BY id');
    if (rows.length === 0) return res.status(400).json({ error: 'Hanno già accettato tutti' });
    const apiBase = `${req.protocol}://${req.get('host')}`;
    const results = [];
    for (const u of rows) {
      const token = jwt.sign({ id: u.id, purpose: 'subscribe' }, process.env.JWT_SECRET, { expiresIn: '60d' });
      const { html, text } = renderMail({
        greeting: `Ciao ${u.name},`,
        body: 'da oggi Dergano & Dragons ha una newsletter: ogni tanto ti scriveremo per annunciare le nuove sessioni, gli eventi speciali e le novità della gilda.\n\nPer riceverla serve il tuo consenso: basta toccare il pulsante qui sotto. Se non ti interessa, ignora questa email e non riceverai nulla. Gli avvisi sulle sessioni a cui ti iscrivi continueranno ad arrivare comunque.',
        button: { label: 'Sì, voglio ricevere la newsletter', url: `${apiBase}/api/auth/subscribe?token=${encodeURIComponent(token)}` },
        footer: 'Puoi cambiare idea quando vuoi da «Il mio account» sul sito, o dal link in fondo a ogni newsletter.',
      });
      results.push(!!(await sendEmail(u.email, (test ? '[Prova] ' : '') + 'Vuoi ricevere la newsletter di Dergano & Dragons?', text, html)));
    }
    const sent = results.filter(Boolean).length;
    res.json({ message: 'Invio completato', sent, failed: results.length - sent, total: results.length });
  } catch (err) {
    console.error('Send newsletter invite error:', err);
    res.status(500).json({ error: 'Invio non riuscito' });
  }
};

// Inviti: email con il link per iscriversi al sito. Non si invita chi e' gia' iscritto.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const sendInvites = async (req, res) => {
  const raw = Array.isArray(req.body.emails) ? req.body.emails : String(req.body.emails || '').split(/[\s,;]+/);
  const emails = [...new Set(raw.map(e => String(e).trim().toLowerCase()).filter(Boolean))];
  const note = String(req.body.message || '').trim().slice(0, 1000);
  if (emails.length === 0) return res.status(400).json({ error: 'Inserisci almeno un indirizzo email' });
  if (emails.length > 30) return res.status(400).json({ error: 'Massimo 30 inviti alla volta' });
  const invalid = emails.filter(e => !EMAIL_RE.test(e));
  if (invalid.length) return res.status(400).json({ error: `Indirizzi non validi: ${invalid.join(', ')}` });
  try {
    const { rows: [me] } = await pool.query('SELECT name FROM users WHERE id = $1', [req.user.id]);
    const { rows: existing } = await pool.query('SELECT lower(email) AS email FROM users WHERE lower(email) = ANY($1)', [emails]);
    const already = new Set(existing.map(r => r.email));
    const results = [];
    for (const email of emails) {
      if (already.has(email)) { results.push({ email, status: 'iscritto' }); continue; }
      await pool.query(
        `INSERT INTO invites (email, invited_by) VALUES ($1, $2)
         ON CONFLICT (email) DO UPDATE SET sends = invites.sends + 1, last_sent_at = NOW(), invited_by = $2`,
        [email, req.user.id]);
      const link = `${FRONTEND_URL}/auth?invito=1&email=${encodeURIComponent(email)}`;
      const { html, text } = renderMail({
        greeting: 'Ciao!',
        body: `${me?.name || 'Un organizzatore'} ti invita a unirti a Dergano & Dragons, le sessioni di gioco di ruolo per ragazzi alla libreria Scamamu.${note ? `\n\n«${note}»` : ''}\n\nSul sito trovi il calendario delle sessioni e puoi iscriverti con un tocco. Per creare il tuo account bastano un nome, la tua email e una password.`,
        button: { label: 'Crea il tuo account', url: link },
        footer: 'Hai ricevuto questa email perché un organizzatore ha indicato il tuo indirizzo. Se non ti interessa, ignorala: non riceverai altri messaggi e l’indirizzo verrà cancellato entro 6 mesi.',
      });
      const ok = await sendEmail(email, 'Sei invitato a Dergano & Dragons 🐉', text, html);
      results.push({ email, status: ok ? 'inviato' : 'errore' });
    }
    res.json({ results, sent: results.filter(r => r.status === 'inviato').length });
  } catch (err) {
    console.error('Send invites error:', err);
    res.status(500).json({ error: 'Invio non riuscito' });
  }
};

const getInvites = async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT i.id, i.email, i.sends, i.created_at, i.last_sent_at, u.name AS invited_by_name,
              r.name AS registered_name, r.created_at AS registered_at
       FROM invites i
       LEFT JOIN users u ON u.id = i.invited_by
       LEFT JOIN users r ON lower(r.email) = i.email
       ORDER BY (r.id IS NULL) DESC, i.last_sent_at DESC`
    );
    res.json(rows);
  } catch (err) {
    console.error('Get invites error:', err);
    res.status(500).json({ error: 'Errore nel caricamento degli inviti' });
  }
};

const deleteInvite = async (req, res) => {
  try {
    await pool.query('DELETE FROM invites WHERE id = $1', [req.params.id]);
    res.json({ message: 'Invito eliminato' });
  } catch (err) {
    console.error('Delete invite error:', err);
    res.status(500).json({ error: 'Errore' });
  }
};

module.exports = { sendInvites, getInvites, deleteInvite, getUsers, updateUserRole, updateUserName, resetUserPassword, getStats, getShiftStats, fixFutureShifts, sendUserResetLink, sendNewsletter, getNewsletterStats, sendNewsletterInvite };
