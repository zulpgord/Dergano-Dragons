const { pool } = require('../db/database');
const { sendEmail } = require('../utils/emailService');
const { FRONTEND_URL, renderMail } = require('../utils/mailTemplate');

// Get all shifts — uses parallel queries instead of N+1.
// Gli eroi vedono solo sessioni pubbliche o del proprio gruppo; l'admin vede tutto.
const getShifts = async (req, res) => {
  const { location_id, start_date, end_date } = req.query;
  let query = 'SELECT s.*, l.name as location_name FROM shifts s JOIN locations l ON s.location_id = l.id WHERE 1=1';
  const params = [];

  if (location_id) {
    params.push(location_id);
    query += ` AND s.location_id = $${params.length}`;
  }

  // Date range: use provided params or fall back to a sensible default window
  const rangeStart = start_date || (() => {
    const d = new Date(); d.setMonth(d.getMonth() - 3); return d.toISOString();
  })();
  const rangeEnd = end_date || (() => {
    const d = new Date(); d.setMonth(d.getMonth() + 9); return d.toISOString();
  })();
  params.push(rangeStart);
  query += ` AND s.start_time >= $${params.length}`;
  params.push(rangeEnd);
  query += ` AND s.start_time <= $${params.length}`;

  // Un eroe (non admin) vede solo le sessioni pubbliche o riservate a un suo gruppo
  if (req.user.role !== 'admin') {
    params.push(req.user.id);
    query += ` AND (s.visible_to_all = true OR s.id IN (
      SELECT sg.shift_id FROM shift_groups sg
      JOIN user_groups ug ON sg.group_id = ug.group_id
      WHERE ug.user_id = $${params.length}
    ))`;
  }

  query += ' ORDER BY s.start_time ASC';

  try {
    // 4 parallel queries instead of 1 + (N * 2) sequential queries
    const [shiftsResult, countsResult, usersResult, groupsResult] = await Promise.all([
      pool.query(query, params),
      pool.query(
        `SELECT shift_id, status, COALESCE(SUM(seats), 0) as total_seats
         FROM assignments
         WHERE status IN ('assigned', 'waiting')
         GROUP BY shift_id, status`
      ),
      pool.query(
        `SELECT a.id, a.shift_id, a.status, a.seats, u.id as user_id, u.name
         FROM assignments a
         JOIN users u ON a.user_id = u.id
         WHERE a.status IN ('assigned', 'waiting')
         ORDER BY a.assigned_at ASC`
      ),
      pool.query(
        `SELECT sg.shift_id, g.id as group_id, g.name as group_name
         FROM shift_groups sg JOIN groups g ON sg.group_id = g.id`
      ),
    ]);

    // Build lookup maps (O(n) merge, no extra DB roundtrips)
    const countMap = {};
    const waitingCountMap = {};
    countsResult.rows.forEach(r => {
      if (r.status === 'assigned') countMap[r.shift_id] = parseInt(r.total_seats);
      else waitingCountMap[r.shift_id] = parseInt(r.total_seats);
    });

    const usersMap = {};
    const waitingUsersMap = {};
    usersResult.rows.forEach(r => {
      const map = r.status === 'assigned' ? usersMap : waitingUsersMap;
      if (!map[r.shift_id]) map[r.shift_id] = [];
      map[r.shift_id].push({ id: r.id, user_id: r.user_id, name: r.name, seats: r.seats || 1 });
    });

    const shiftGroupsMap = {};
    groupsResult.rows.forEach(r => {
      if (!shiftGroupsMap[r.shift_id]) shiftGroupsMap[r.shift_id] = [];
      shiftGroupsMap[r.shift_id].push({ id: r.group_id, name: r.group_name });
    });

    const shiftsWithDetails = shiftsResult.rows.map(shift => {
      const assigned_count = countMap[shift.id] || 0;
      return {
        ...shift,
        assigned_count,
        assigned_users: usersMap[shift.id] || [],
        waiting_count: waitingCountMap[shift.id] || 0,
        waiting_users: waitingUsersMap[shift.id] || [],
        groups: shiftGroupsMap[shift.id] || [],
        coverage_status: assigned_count >= shift.required_count ? 'covered' : 'uncovered',
      };
    });

    res.json(shiftsWithDetails);
  } catch (err) {
    console.error('Get shifts error:', err);
    res.status(500).json({ error: 'Failed to fetch shifts' });
  }
};

// Helper: sincronizza le associazioni sessione-gruppi
const syncShiftGroups = async (shiftId, visibleToAll, groupIds) => {
  await pool.query('DELETE FROM shift_groups WHERE shift_id = $1', [shiftId]);
  if (!visibleToAll && Array.isArray(groupIds) && groupIds.length > 0) {
    const values = groupIds.map((_, i) => `($1, $${i + 2})`).join(', ');
    await pool.query(
      `INSERT INTO shift_groups (shift_id, group_id) VALUES ${values}`,
      [shiftId, ...groupIds]
    );
  }
};

// Create shift (admin only)
const createShift = async (req, res) => {
  const { location_id, start_time, end_time, required_count, has_pizza, visible_to_all, group_ids } = req.body;
  if (!location_id || !start_time || !end_time) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  try {
    const result = await pool.query(
      'INSERT INTO shifts (location_id, start_time, end_time, required_count, has_pizza, visible_to_all, created_by) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
      [location_id, start_time, end_time, required_count || 1, !!has_pizza, visible_to_all !== false, req.user.id]
    );
    const shift = result.rows[0];
    await syncShiftGroups(shift.id, visible_to_all !== false, group_ids);
    res.status(201).json({ message: 'Shift created', shift });
  } catch (err) {
    console.error('Create shift error:', err);
    res.status(500).json({ error: 'Failed to create shift' });
  }
};

// Update shift (admin only)
const updateShift = async (req, res) => {
  const { id } = req.params;
  const { location_id, start_time, end_time, required_count, has_pizza, visible_to_all, group_ids } = req.body;
  try {
    const result = await pool.query(
      'UPDATE shifts SET location_id=$1, start_time=$2, end_time=$3, required_count=$4, has_pizza=$5, visible_to_all=$6, updated_at=NOW() WHERE id=$7 RETURNING *',
      [location_id, start_time, end_time, required_count, !!has_pizza, visible_to_all !== false, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Shift not found' });
    await syncShiftGroups(id, visible_to_all !== false, group_ids);
    res.json({ message: 'Shift updated', shift: result.rows[0] });
  } catch (err) {
    console.error('Update shift error:', err);
    res.status(500).json({ error: 'Failed to update shift' });
  }
};

// Cancel / reactivate shift (toggle) — admin only
const cancelShift = async (req, res) => {
  const { id } = req.params;
  try {
    const current = await pool.query('SELECT cancelled FROM shifts WHERE id = $1', [id]);
    if (current.rows.length === 0) return res.status(404).json({ error: 'Shift not found' });
    const newVal = !current.rows[0].cancelled;
    await pool.query('UPDATE shifts SET cancelled=$1, updated_at=NOW() WHERE id=$2', [newVal, id]);
    res.json({ message: newVal ? 'Shift cancelled' : 'Shift reactivated', cancelled: newVal });
  } catch (err) {
    console.error('Cancel shift error:', err);
    res.status(500).json({ error: 'Failed to cancel shift' });
  }
};

// Delete shift (admin only)
const deleteShift = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('DELETE FROM shifts WHERE id = $1 RETURNING id', [id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Shift not found' });
    res.json({ message: 'Shift deleted' });
  } catch (err) {
    console.error('Delete shift error:', err);
    res.status(500).json({ error: 'Failed to delete shift' });
  }
};

// Avviso agli iscritti di una sessione (e, se richiesto, alla lista d'attesa). Invii individuali.
const emailShiftParticipants = async (req, res) => {
  const { subject, message, include_waiting } = req.body;
  if (!subject?.trim() || !message?.trim()) return res.status(400).json({ error: 'Oggetto e messaggio sono obbligatori' });
  try {
    const shift = await pool.query(
      'SELECT s.start_time, l.name AS location_name FROM shifts s JOIN locations l ON s.location_id = l.id WHERE s.id = $1',
      [req.params.id]
    );
    if (!shift.rows[0]) return res.status(404).json({ error: 'Sessione non trovata' });
    const statuses = include_waiting ? ['assigned', 'waiting'] : ['assigned'];
    const { rows } = await pool.query(
      `SELECT DISTINCT u.email, u.name FROM assignments a JOIN users u ON u.id = a.user_id
       WHERE a.shift_id = $1 AND a.status = ANY($2)`,
      [req.params.id, statuses]
    );
    if (rows.length === 0) return res.status(400).json({ error: 'Nessun iscritto a questa sessione' });
    const when = new Date(shift.rows[0].start_time).toLocaleString('it-IT', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Rome' });
    const results = [];
    for (const u of rows) {
      const { html, text } = renderMail({
        greeting: `Ciao ${u.name},`,
        body: message.trim(),
        button: { label: 'Vedi le tue sessioni', url: `${FRONTEND_URL}/dashboard` },
        footer: `Ricevi questa email perché sei iscritto alla sessione di ${when} · ${shift.rows[0].location_name}.`,
      });
      results.push(!!(await sendEmail(u.email, subject.trim(), text, html)));
    }
    const sent = results.filter(Boolean).length;
    res.json({ message: 'Invio completato', sent, failed: results.length - sent, total: results.length });
  } catch (err) {
    console.error('Email shift participants error:', err);
    res.status(500).json({ error: 'Invio non riuscito' });
  }
};

module.exports = { getShifts, createShift, updateShift, cancelShift, deleteShift, emailShiftParticipants };
