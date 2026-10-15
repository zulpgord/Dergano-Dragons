const { pool } = require('../db/database');
const { sendEmail } = require('../utils/emailService');
const { logEvent, shiftLabel } = require('../utils/adminEvents');

// Il server gira in UTC: senza fuso le email mostrerebbero l'orario sbagliato di 1-2 ore.
const fmtRome = (d) => new Date(d).toLocaleString('it-IT', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Rome' });

// Promuove in ordine d'arrivo chi e' in lista d'attesa, finche' i posti liberi bastano (FIFO, non si salta la fila).
// Usata quando qualcuno si cancella e quando l'admin aumenta i posti di una sessione.
const promoteWaiting = async (shiftId, client = pool) => {
  const { rows: [shift] } = await client.query(
    'SELECT s.required_count, s.start_time, l.name AS location_name FROM shifts s JOIN locations l ON l.id = s.location_id WHERE s.id = $1',
    [shiftId]
  );
  if (!shift) return [];
  const seatsRes = await client.query(
    "SELECT COALESCE(SUM(seats), 0) AS total FROM assignments WHERE shift_id = $1 AND status = 'assigned'", [shiftId]
  );
  let free = shift.required_count - parseInt(seatsRes.rows[0].total);
  const waiting = await client.query(
    `SELECT a.id, a.seats, u.email, u.name FROM assignments a JOIN users u ON u.id = a.user_id
     WHERE a.shift_id = $1 AND a.status = 'waiting' ORDER BY a.assigned_at ASC`, [shiftId]
  );
  const promoted = [];
  for (const c of waiting.rows) {
    if (c.seats > free) break;
    await client.query("UPDATE assignments SET status = 'assigned', updated_at = CURRENT_TIMESTAMP WHERE id = $1", [c.id]);
    free -= c.seats;
    promoted.push({ ...c, shift });
  }
  return promoted;
};

const notifyPromoted = (promoted) => {
  for (const p of promoted) {
    logEvent('promozione', `${p.name} è passato dalla lista d'attesa agli iscritti · ${p.shift.location_name} · ${new Date(p.shift.start_time).toLocaleString('it-IT', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Rome' })}`);
    sendEmail(
      p.email,
      '🎉 Si è liberato un posto: sei dentro!',
      `Ciao ${p.name},\n\nsi è liberato un posto e sei passato dalla lista d'attesa agli iscritti.\n\nDove: ${p.shift.location_name}\nQuando: ${fmtRome(p.shift.start_time)}\n\nCi vediamo al tavolo!`
    ).catch(err => console.error('Email send error (non-fatal):', err));
  }
};

// Controlla e iscrive dentro una transazione: la riga della sessione resta bloccata finche' non abbiamo
// deciso, cosi' due iscrizioni contemporanee non possono superare i posti disponibili.
const registerInShift = async ({ shiftId, userId, seats, hours, asAdmin, role }) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows: [shift] } = await client.query(
      'SELECT id, required_count, cancelled, end_time, visible_to_all FROM shifts WHERE id = $1 FOR UPDATE', [shiftId]
    );
    if (!shift) { await client.query('ROLLBACK'); return { error: [404, 'Sessione non trovata'] }; }
    if (shift.cancelled) { await client.query('ROLLBACK'); return { error: [400, 'Questa sessione è stata annullata'] }; }
    if (!asAdmin && new Date(shift.end_time) < new Date()) { await client.query('ROLLBACK'); return { error: [400, 'Questa sessione è già conclusa'] }; }
    if (!asAdmin && role !== 'admin' && !shift.visible_to_all) {
      const ok = await client.query(
        'SELECT 1 FROM shift_groups sg JOIN user_groups ug ON ug.group_id = sg.group_id WHERE sg.shift_id = $1 AND ug.user_id = $2 LIMIT 1',
        [shiftId, userId]
      );
      if (ok.rows.length === 0) { await client.query('ROLLBACK'); return { error: [403, 'Questa sessione è riservata a un altro tavolo'] }; }
    }
    const existing = await client.query('SELECT id, status FROM assignments WHERE shift_id = $1 AND user_id = $2', [shiftId, userId]);
    if (existing.rows[0] && ['assigned', 'waiting'].includes(existing.rows[0].status)) {
      await client.query('ROLLBACK');
      return { error: [400, asAdmin ? "Questo eroe è già iscritto o in lista d'attesa per questa sessione" : 'Sei già iscritto a questa sessione'] };
    }
    const seatsRes = await client.query("SELECT COALESCE(SUM(seats), 0) AS total FROM assignments WHERE shift_id = $1 AND status = 'assigned'", [shiftId]);
    const status = (parseInt(seatsRes.rows[0].total) + seats) > shift.required_count ? 'waiting' : 'assigned';
    // Chi si reiscrive dopo essersi cancellato riparte dal fondo della coda (assigned_at = adesso).
    const { rows: [assignment] } = existing.rows[0]
      ? await client.query(
          'UPDATE assignments SET status = $1, hours_volunteered = $2, seats = $3, assigned_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = $4 RETURNING *',
          [status, hours ?? null, seats, existing.rows[0].id])
      : await client.query(
          'INSERT INTO assignments (shift_id, user_id, hours_volunteered, status, seats) VALUES ($1, $2, $3, $4, $5) RETURNING *',
          [shiftId, userId, hours ?? null, status, seats]);
    await client.query('COMMIT');
    return { assignment, status };
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }
};

const parseSeats = (seats) => {
  const n = parseInt(seats, 10);
  return !Number.isInteger(n) || n < 1 ? 1 : Math.min(n, 6);
};

// Self-assign to shift — supporta più posti in un'unica iscrizione
// (es. "prenoto per me + 1 amico"). Se i posti richiesti non entrano
// nella capienza rimasta, l'intera richiesta va in waiting list.
const assignShift = async (req, res) => {
  const { shift_id, hours_volunteered, seats } = req.body;
  if (!shift_id) return res.status(400).json({ error: 'Shift ID required' });
  const requestedSeats = parseSeats(seats);
  try {
    const r = await registerInShift({ shiftId: shift_id, userId: req.user.id, seats: requestedSeats, hours: hours_volunteered, asAdmin: false, role: req.user.role });
    if (r.error) return res.status(r.error[0]).json({ error: r.error[1] });
    res.status(201).json({ message: r.status === 'waiting' ? 'Added to waiting list' : 'Assigned to shift', assignment: r.assignment });
    shiftLabel(shift_id).then(async (sl) => {
      const nm = (await pool.query('SELECT name FROM users WHERE id = $1', [req.user.id])).rows[0]?.name;
      const seats = requestedSeats > 1 ? ` (${requestedSeats} posti)` : '';
      logEvent(r.status === 'waiting' ? 'attesa' : 'iscrizione',
        r.status === 'waiting' ? `${nm} è in lista d'attesa${seats} · ${sl.text}` : `${nm} si è iscritto${seats} · ${sl.text} · ${sl.seats}`, req.user.id);
    }).catch(() => {});

    // Email di conferma in background (non blocca la risposta)
    const [{ rows: [shift] }, { rows: [user] }] = await Promise.all([
      pool.query('SELECT s.start_time, l.name AS location_name FROM shifts s JOIN locations l ON s.location_id = l.id WHERE s.id = $1', [shift_id]),
      pool.query('SELECT email, name FROM users WHERE id = $1', [req.user.id]),
    ]);
    const seatsNote = requestedSeats > 1 ? ` (${requestedSeats} posti)` : '';
    const subject = r.status === 'waiting' ? "⏳ Sei in lista d'attesa" : '✅ Iscrizione confermata';
    const body = r.status === 'waiting'
      ? `Ciao ${user.name},\n\nla sessione è al completo: sei in lista d'attesa${seatsNote}.\n\nDove: ${shift.location_name}\nQuando: ${fmtRome(shift.start_time)}\n\nSe si libera un posto passi automaticamente tra gli iscritti e ti avvisiamo.`
      : `Ciao ${user.name},\n\nsei iscritto alla sessione${seatsNote}!\n\nDove: ${shift.location_name}\nQuando: ${fmtRome(shift.start_time)}\n\nCi vediamo al tavolo!`;
    sendEmail(user.email, subject, body).catch(emailErr => console.error('Email send error (non-fatal):', emailErr));
  } catch (err) {
    console.error('Assign shift error:', err);
    if (!res.headersSent) res.status(500).json({ error: 'Failed to assign shift' });
  }
};

// Admin: iscrive manualmente un eroe a una sessione (bypassa il self-assign)
const adminAssignUser = async (req, res) => {
  const { shiftId } = req.params;
  const { user_id, seats } = req.body;
  if (!user_id) return res.status(400).json({ error: 'user_id richiesto' });
  try {
    const r = await registerInShift({ shiftId, userId: user_id, seats: parseSeats(seats), asAdmin: true, role: 'admin' });
    if (r.error) return res.status(r.error[0]).json({ error: r.error[1] });
    res.status(201).json({ message: r.status === 'waiting' ? 'Aggiunto in lista di attesa' : 'Iscritto', assignment: r.assignment });
  } catch (err) {
    console.error('Admin assign user error:', err);
    res.status(500).json({ error: "Errore nell'iscrizione manuale" });
  }
};

// Cancel assignment (until 2 hours before shift) — se l'iscrizione cancellata
// era 'assigned', promuove in ordine chi è in waiting list finché i posti liberati bastano.
const cancelAssignment = async (req, res) => {
  const { id } = req.params;
  const user_id = req.user.id;

  try {
    const assignmentResult = await pool.query(
      'SELECT a.*, s.start_time, s.required_count FROM assignments a JOIN shifts s ON a.shift_id = s.id WHERE a.id = $1',
      [id]
    );

    if (assignmentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Assignment not found' });
    }

    const assignment = assignmentResult.rows[0];

    if (assignment.user_id !== user_id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const shiftStartTime = new Date(assignment.start_time).getTime();
    const now = Date.now();
    const twoHoursMs = -Infinity;

    if (shiftStartTime - now < twoHoursMs && req.user.role !== 'admin') {
      return res.status(400).json({ error: 'Cannot cancel within 2 hours of shift start' });
    }

    const wasAssigned = assignment.status === 'assigned';

    const result = await pool.query(
      'UPDATE assignments SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
      ['cancelled', id]
    );

    const byAdmin = assignment.user_id !== user_id;
    const sl = await shiftLabel(assignment.shift_id).catch(() => ({ text: 'sessione', seats: '' }));
    const nm = (await pool.query('SELECT name FROM users WHERE id = $1', [assignment.user_id])).rows[0]?.name;
    if (wasAssigned) notifyPromoted(await promoteWaiting(assignment.shift_id));
    const after = await shiftLabel(assignment.shift_id).catch(() => sl);
    logEvent('defezione', byAdmin
      ? `${nm} è stato tolto da un admin ${wasAssigned ? 'dalla sessione' : "dalla lista d'attesa"} · ${sl.text} · ora ${after.seats}`
      : `${nm} ${wasAssigned ? 'ha annullato la partecipazione' : "è uscito dalla lista d'attesa"} · ${sl.text} · ora ${after.seats}`, user_id);

    res.json({ message: 'Assignment cancelled', assignment: result.rows[0] });
  } catch (err) {
    console.error('Cancel assignment error:', err);
    res.status(500).json({ error: 'Failed to cancel assignment' });
  }
};

// Get user's assignments — prenotazioni attive (assigned o waiting) nella finestra temporale corrente
const getUserAssignments = async (req, res) => {
  const user_id = req.user.id;

  try {
    const result = await pool.query(
      `SELECT a.*, s.start_time, s.end_time, l.name as location_name
       FROM assignments a
       JOIN shifts s ON a.shift_id = s.id
       JOIN locations l ON s.location_id = l.id
       WHERE a.user_id = $1
       AND a.status IN ('assigned', 'waiting')
       AND s.start_time >= NOW() - INTERVAL '3 months'
       AND s.start_time <= NOW() + INTERVAL '9 months'
       ORDER BY s.start_time DESC`,
      [user_id]
    );

    res.json(result.rows);
  } catch (err) {
    console.error('Get assignments error:', err);
    res.status(500).json({ error: 'Failed to fetch assignments' });
  }
};

module.exports = { assignShift, adminAssignUser, cancelAssignment, getUserAssignments, promoteWaiting, notifyPromoted };
