const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { pool } = require('../db/database');
const { sendResetEmail, consumeResetToken } = require('../utils/passwordReset');
require('dotenv').config();

const register = async (req, res) => {
  const { email, password, name, privacy_accepted, newsletter } = req.body;
  if (!email || !password || !name || !name.trim()) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  const cleanEmail = String(email).trim().toLowerCase();
  if (!privacy_accepted) {
    return res.status(400).json({ error: "Devi accettare l'informativa privacy per registrarti" });
  }
  try {
    const dup = await pool.query('SELECT 1 FROM users WHERE lower(email) = $1', [cleanEmail]);
    if (dup.rows.length) return res.status(400).json({ error: 'Email already exists' });
    const hashedPassword = await bcrypt.hash(password, 10);
    // Ci si registra sempre come eroe: admin si diventa solo se un altro admin lo promuove.
    const userRole = 'volunteer';
    const result = await pool.query(
      'INSERT INTO users (email, password_hash, name, role, privacy_accepted_at, newsletter_opt_in) VALUES ($1, $2, $3, $4, NOW(), $5) RETURNING id, email, name, role',
      [cleanEmail, hashedPassword, name.trim(), userRole, newsletter === true]
    );
    const user = result.rows[0];
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    );
    res.status(201).json({ message: 'User registered successfully', token, user: { id: user.id, email: user.email, name: user.name, role: user.role } });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(400).json({ error: 'Email already exists' });
    }
    console.error('Register error:', err);
    res.status(500).json({ error: 'Registration failed' });
  }
};

const login = async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password required' });
  }
  try {
    const result = await pool.query('SELECT * FROM users WHERE lower(email) = lower($1) ORDER BY id LIMIT 1', [String(email).trim()]);
    const user = result.rows[0];
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) return res.status(401).json({ error: 'Invalid credentials' });
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    );
    res.json({ message: 'Login successful', token, user: { id: user.id, email: user.email, name: user.name, role: user.role } });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
};


const getUsers = async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, email, name, role, created_at FROM users ORDER BY created_at ASC'
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Get users error:', err);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
};

const updateUserRole = async (req, res) => {
  const { id } = req.params;
  const { role } = req.body;
  if (!['admin', 'volunteer'].includes(role)) {
    return res.status(400).json({ error: 'Invalid role' });
  }
  if (parseInt(id) === req.user.id && role === 'volunteer') {
    return res.status(400).json({ error: 'Non puoi rimuovere il tuo ruolo di admin' });
  }
  try {
    const result = await pool.query(
      'UPDATE users SET role = $1 WHERE id = $2 RETURNING id, email, name, role',
      [role, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });
    res.json({ message: 'Role updated', user: result.rows[0] });
  } catch (err) {
    console.error('Update role error:', err);
    res.status(500).json({ error: 'Failed to update role' });
  }
};


// Cancellazione account self-service (diritto alla cancellazione).
// Elimina l'utente e, in cascata, le sue iscrizioni e appartenenze ai gruppi.
const deleteMyAccount = async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM users WHERE id = $1 RETURNING id', [req.user.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });
    res.json({ message: 'Account eliminato' });
  } catch (err) {
    console.error('Delete account error:', err);
    res.status(500).json({ error: "Errore nell'eliminazione dell'account" });
  }
};

const MIN_PASSWORD = 8;

// "Password dimenticata": risponde sempre allo stesso modo, cosi' non rivela quali email sono registrate.
const forgotPassword = async (req, res) => {
  const email = (req.body.email || '').trim().toLowerCase();
  if (!email) return res.status(400).json({ error: 'Inserisci la tua email' });
  try {
    const { rows } = await pool.query('SELECT id, name, email FROM users WHERE lower(email) = $1', [email]);
    if (rows[0]) {
      const r = await sendResetEmail(rows[0]);
      if (r === 'limit') return res.status(429).json({ error: 'Troppe richieste: riprova tra un’ora' });
    }
    res.json({ message: 'Se l’email è registrata, riceverai un link per scegliere una nuova password.' });
  } catch (err) {
    console.error('Forgot password error:', err);
    res.status(500).json({ error: 'Invio non riuscito, riprova' });
  }
};

// Nuova password dal link monouso ricevuto per email.
const resetPassword = async (req, res) => {
  const { token, password } = req.body;
  if (!token) return res.status(400).json({ error: 'Link non valido' });
  if (!password || password.length < MIN_PASSWORD) return res.status(400).json({ error: `La password deve avere almeno ${MIN_PASSWORD} caratteri` });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const userId = await consumeResetToken(token, client);
    if (!userId) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Link scaduto o già usato: richiedine uno nuovo' });
    }
    const hash = await bcrypt.hash(password, 10);
    const { rows } = await client.query(
      'UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING id, email, name, role',
      [hash, userId]
    );
    // Gli altri link ancora aperti per questo utente non servono piu'.
    await client.query('UPDATE password_resets SET used_at = NOW() WHERE user_id = $1 AND used_at IS NULL', [userId]);
    await client.query('COMMIT');
    const user = rows[0];
    const jwtToken = jwt.sign({ id: user.id, email: user.email, role: user.role }, process.env.JWT_SECRET, { expiresIn: '30d' });
    res.json({ message: 'Password aggiornata', token: jwtToken, user });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('Reset password error:', err);
    res.status(500).json({ error: 'Aggiornamento non riuscito, riprova' });
  } finally {
    client.release();
  }
};

// Cambio password da loggato: serve quella attuale.
const changePassword = async (req, res) => {
  const { current_password, new_password } = req.body;
  if (!new_password || new_password.length < MIN_PASSWORD) return res.status(400).json({ error: `La nuova password deve avere almeno ${MIN_PASSWORD} caratteri` });
  try {
    const { rows } = await pool.query('SELECT password_hash FROM users WHERE id = $1', [req.user.id]);
    if (!rows[0]) return res.status(404).json({ error: 'User not found' });
    if (!(await bcrypt.compare(current_password || '', rows[0].password_hash))) {
      return res.status(400).json({ error: 'La password attuale non è corretta' });
    }
    await pool.query('UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', [await bcrypt.hash(new_password, 10), req.user.id]);
    res.json({ message: 'Password cambiata' });
  } catch (err) {
    console.error('Change password error:', err);
    res.status(500).json({ error: 'Cambio password non riuscito' });
  }
};

// Preferenze del proprio account (per ora: newsletter).
const getMe = async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT id, email, name, role, newsletter_opt_in FROM users WHERE id = $1', [req.user.id]);
    if (!rows[0]) return res.status(404).json({ error: 'User not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error('Get me error:', err);
    res.status(500).json({ error: 'Errore nel caricamento del profilo' });
  }
};

const setNewsletter = async (req, res) => {
  try {
    await pool.query('UPDATE users SET newsletter_opt_in = $1 WHERE id = $2', [req.body.newsletter === true, req.user.id]);
    res.json({ newsletter_opt_in: req.body.newsletter === true });
  } catch (err) {
    console.error('Set newsletter error:', err);
    res.status(500).json({ error: 'Salvataggio non riuscito' });
  }
};

// Link pubblici della newsletter (iscrizione dall'invito, disiscrizione dal fondo di ogni email): niente login.
const newsletterLink = (purpose, value, okMsg) => async (req, res) => {
  let uid = null;
  try {
    const p = jwt.verify(String(req.query.token || ''), process.env.JWT_SECRET);
    if (p.purpose === purpose) uid = p.id;
  } catch { /* token non valido o scaduto */ }
  const page = (msg) => `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Newsletter</title>
<body style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;background:#fbf6ec;color:#2a2118;display:flex;min-height:100vh;align-items:center;justify-content:center;margin:0;padding:16px">
<div style="max-width:420px;text-align:center"><h1 style="font-family:Georgia,serif;color:#7a4e12">🐉 Dergano &amp; Dragons</h1><p>${msg}</p></div></body>`;
  if (!uid) return res.status(400).send(page('Link non valido o scaduto. Puoi gestire la newsletter da «Il mio account» sul sito.'));
  try {
    const r = await pool.query('UPDATE users SET newsletter_opt_in = $1 WHERE id = $2', [value, uid]);
    if (r.rowCount === 0) return res.status(404).send(page('Account non trovato.'));
    res.send(page(okMsg));
  } catch (err) {
    console.error('Unsubscribe error:', err);
    res.status(500).send(page('Qualcosa è andato storto, riprova più tardi.'));
  }
};

const unsubscribe = newsletterLink('unsubscribe', false, 'Fatto: non riceverai più la newsletter. Continuerai a ricevere solo le email sulle sessioni a cui sei iscritto.');
const subscribe = newsletterLink('subscribe', true, 'Grazie! 🎲 Da ora riceverai la newsletter con le nuove sessioni e le novità. Puoi disiscriverti quando vuoi dal link in fondo a ogni email.');

module.exports = { register, login, getUsers, updateUserRole, deleteMyAccount, forgotPassword, resetPassword, changePassword, getMe, setNewsletter, unsubscribe, subscribe };
