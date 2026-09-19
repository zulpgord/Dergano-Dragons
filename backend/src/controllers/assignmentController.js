const { pool } = require('../db/database');
const { sendEmail } = require('../utils/emailService');

// Self-assign to shift
const assignShift = async (req, res) => {
  const { shift_id, hours_volunteered } = req.body;
  const user_id = req.user.id;

  if (!shift_id) {
    return res.status(400).json({ error: 'Shift ID required' });
  }

  try {
    // Check if already assigned (active)
    const existingAssignment = await pool.query(
      'SELECT id, status FROM assignments WHERE shift_id = $1 AND user_id = $2',
      [shift_id, user_id]
    );

    if (existingAssignment.rows.length > 0 && existingAssignment.rows[0].status === 'assigned') {
      return res.status(400).json({ error: 'Already assigned to this shift' });
    }

    // Create or re-activate assignment
    let result;
    if (existingAssignment.rows.length > 0) {
      result = await pool.query(
        'UPDATE assignments SET status = $1, hours_volunteered = $2 WHERE id = $3 RETURNING *',
        ['assigned', hours_volunteered, existingAssignment.rows[0].id]
      );
    } else {
      result = await pool.query(
        'INSERT INTO assignments (shift_id, user_id, hours_volunteered, status) VALUES ($1, $2, $3, $4) RETURNING *',
        [shift_id, user_id, hours_volunteered, 'assigned']
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
    res.status(201).json({ message: 'Assigned to shift', assignment: result.rows[0] });

    // Send confirmation email in background (non-blocking)
    const shift = shiftDetails.rows[0];
    const user = userDetails.rows[0];
    const startTime = new Date(shift.start_time).toLocaleString('it-IT');
    sendEmail(
      user.email,
      '✅ Prenotazione confermata',
      `Ciao ${user.name},\n\nSei stato iscritto al turno!\n\nSede: ${shift.location_name}\nOrario: ${startTime}\n\nGrazie per il tuo contributo!`
    ).catch(emailErr => console.error('Email send error (non-fatal):', emailErr));

  } catch (err) {
    console.error('Assign shift error:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to assign shift' });
    }
  }
};

// Cancel assignment (until 2 hours before shift)
const cancelAssignment = async (req, res) => {
  const { id } = req.params;
  const user_id = req.user.id;

  try {
    const assignmentResult = await pool.query(
      'SELECT a.*, s.start_time FROM assignments a JOIN shifts s ON a.shift_id = s.id WHERE a.id = $1',
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

    const result = await pool.query(
      'UPDATE assignments SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
      ['cancelled', id]
    );

    res.json({ message: 'Assignment cancelled', assignment: result.rows[0] });
  } catch (err) {
    console.error('Cancel assignment error:', err);
    res.status(500).json({ error: 'Failed to cancel assignment' });
  }
};

// Get user's assignments — solo prenotazioni attive nella finestra temporale corrente
const getUserAssignments = async (req, res) => {
  const user_id = req.user.id;

  try {
    const result = await pool.query(
      `SELECT a.*, s.start_time, s.end_time, l.name as location_name
       FROM assignments a
       JOIN shifts s ON a.shift_id = s.id
       JOIN locations l ON s.location_id = l.id
       WHERE a.user_id = $1
       AND a.status = 'assigned'
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
