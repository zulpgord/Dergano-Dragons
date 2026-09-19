const { pool } = require('../db/database');
const { sendEmail } = require('../utils/emailService');

// Self-assign to shift — supporta più posti in un'unica iscrizione
// (es. "prenoto per me + 1 amico"). Se i posti richiesti non entrano
// nella capienza rimasta, l'intera richiesta va in waiting list.
const assignShift = async (req, res) => {
  const { shift_id, hours_volunteered, seats } = req.body;
  const user_id = req.user.id;

  if (!shift_id) {
    return res.status(400).json({ error: 'Shift ID required' });
  }

  // Valida il numero di posti richiesti (1-6, intero)
  let requestedSeats = parseInt(seats, 10);
  if (!Number.isInteger(requestedSeats) || requestedSeats < 1) requestedSeats = 1;
  if (requestedSeats > 6) requestedSeats = 6;

  try {
    // Check if already assigned or waiting (active)
    const existingAssignment = await pool.query(
      'SELECT id, status FROM assignments WHERE shift_id = $1 AND user_id = $2',
      [shift_id, user_id]
    );

    if (existingAssignment.rows.length > 0 && ['assigned', 'waiting'].includes(existingAssignment.rows[0].status)) {
      return res.status(400).json({ error: 'Already registered to this shift' });
    }

    // Determina se i posti richiesti entrano nella capienza rimasta
    const [shiftRes, seatsRes] = await Promise.all([
      pool.query('SELECT required_count FROM shifts WHERE id = $1', [shift_id]),
      pool.query("SELECT COALESCE(SUM(seats), 0) as total FROM assignments WHERE shift_id = $1 AND status = 'assigned'", [shift_id]),
    ]);

    if (shiftRes.rows.length === 0) {
      return res.status(404).json({ error: 'Shift not found' });
    }
    const requiredCount = shiftRes.rows[0].required_count;
    const currentAssignedSeats = parseInt(seatsRes.rows[0].total);
    const newStatus = (currentAssignedSeats + requestedSeats) > requiredCount ? 'waiting' : 'assigned';

    let result;
    if (existingAssignment.rows.length > 0) {
      result = await pool.query(
        'UPDATE assignments SET status = $1, hours_volunteered = $2, seats = $3, updated_at = CURRENT_TIMESTAMP WHERE id = $4 RETURNING *',
        [newStatus, hours_volunteered, requestedSeats, existingAssignment.rows[0].id]
      );
    } else {
      result = await pool.query(
        'INSERT INTO assignments (shift_id, user_id, hours_volunteered, status, seats) VALUES ($1, $2, $3, $4, $5) RETURNING *',
        [shift_id, user_id, hours_volunteered, newStatus, requestedSeats]
      );
    }

    // Prefetch email data in parallel (fast, before responding)
    const [shiftDetails, userDetails] = await Promise.all([
      pool.query(
        'SELECT s.*, l.name as location_name FROM shifts s JOIN locations l ON s.location_id = l.id WHERE s.id = $1',
        [shift_id]
      ),
      pool.query('SELECT email, name FROM users WHERE id = $1', [user_id]),
    ]);

    // ✅ Respond immediately — don't block on email delivery
    res.status(201).json({ message: newStatus === 'waiting' ? 'Added to waiting list' : 'Assigned to shift', assignment: result.rows[0] });

    // Send confirmation email in background (non-blocking)
    const shift = shiftDetails.rows[0];
    const user = userDetails.rows[0];
    const startTime = new Date(shift.start_time).toLocaleString('it-IT');
    const seatsNote = requestedSeats > 1 ? ` (${requestedSeats} posti)` : '';
    const subject = newStatus === 'waiting' ? '⏳ Sei in lista d\'attesa' : '✅ Prenotazione confermata';
    const body = newStatus === 'waiting'
      ? `Ciao ${user.name},\n\nLa sessione è al completo, sei stato aggiunto alla lista d'attesa${seatsNote}!\n\nSede: ${shift.location_name}\nOrario: ${startTime}\n\nSe si libera un posto verrai promosso automaticamente.`
      : `Ciao ${user.name},\n\nSei stato iscritto al turno${seatsNote}!\n\nSede: ${shift.location_name}\nOrario: ${startTime}\n\nGrazie per il tuo contributo!`;
    sendEmail(user.email, subject, body).catch(emailErr => console.error('Email send error (non-fatal):', emailErr));

  } catch (err) {
    console.error('Assign shift error:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to assign shift' });
    }
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

    // Promuovi in ordine di arrivo chi è in waiting list, finché i posti liberati bastano
    if (wasAssigned) {
      const seatsRes = await pool.query(
        "SELECT COALESCE(SUM(seats), 0) as total FROM assignments WHERE shift_id = $1 AND status = 'assigned'",
        [assignment.shift_id]
      );
      let freeCapacity = assignment.required_count - parseInt(seatsRes.rows[0].total);

      const waitingRes = await pool.query(
        `SELECT id, user_id, seats FROM assignments
         WHERE shift_id = $1 AND status = 'waiting'
         ORDER BY assigned_at ASC`,
        [assignment.shift_id]
      );

      for (const candidate of waitingRes.rows) {
        if (candidate.seats > freeCapacity) break; // FIFO: non si salta la fila
        await pool.query(
          "UPDATE assignments SET status = 'assigned', updated_at = CURRENT_TIMESTAMP WHERE id = $1",
          [candidate.id]
        );
        freeCapacity -= candidate.seats;

        // Notifica via email (non bloccante)
        const [shiftDetails, userDetails] = await Promise.all([
          pool.query(
            'SELECT s.*, l.name as location_name FROM shifts s JOIN locations l ON s.location_id = l.id WHERE s.id = $1',
            [assignment.shift_id]
          ),
          pool.query('SELECT email, name FROM users WHERE id = $1', [candidate.user_id]),
        ]);
        const shift = shiftDetails.rows[0];
        const user = userDetails.rows[0];
        const startTime = new Date(shift.start_time).toLocaleString('it-IT');
        sendEmail(
          user.email,
          '🎉 Sei stato promosso dalla lista d\'attesa!',
          `Ciao ${user.name},\n\nSi è liberato un posto e sei stato promosso automaticamente!\n\nSede: ${shift.location_name}\nOrario: ${startTime}`
        ).catch(emailErr => console.error('Email send error (non-fatal):', emailErr));
      }
    }

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

module.exports = { assignShift, cancelAssignment, getUserAssignments };
