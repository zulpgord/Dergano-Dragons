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
    dateFilter += ` AND EXTRACT(YEAR FROM s.start_time) = $${params.length}`;
  }
  if (month) {
    params.push(parseInt(month));
    dateFilter += ` AND EXTRACT(MONTH FROM s.start_time) = $${params.length}`;
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
      LEFT JOIN assignments a ON a.user_id = u.id
      LEFT JOIN shifts s ON a.shift_id = s.id ${dateFilter}
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
  if (!subject?.trim() || !message?.trim()) return res.status(400).json({ error: 'Oggetto e messaggio sono obbligatori' });
  try {
    const { rows } = test
      ? await pool.query('SELECT id, name, email FROM users WHERE id = $1', [req.user.id])
      : await pool.query('SELECT id, name, email FROM users WHERE newsletter_opt_in = TRUE ORDER BY id');
    if (rows.length === 0) return res.status(400).json({ error: 'Nessun iscritto ha ancora accettato la newsletter' });
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
    res.json(r);
  } catch (err) {
    console.error('Newsletter stats error:', err);
    res.status(500).json({ error: 'Errore' });
  }
};

module.exports = { getUsers, updateUserRole, updateUserName, resetUserPassword, getStats, getShiftStats, fixFutureShifts, sendUserResetLink, sendNewsletter, getNewsletterStats };
