const { pool } = require('../db/database');

// Get all shifts — uses 3 parallel queries instead of N+1
// Default date range: 3 months back to 9 months forward
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

  query += ' ORDER BY s.start_time ASC';

  try {
    // 3 parallel queries instead of 1 + (N * 2) sequential queries
    const [shiftsResult, countsResult, usersResult] = await Promise.all([
      pool.query(query, params),
      pool.query(
        `SELECT shift_id, COUNT(*) as count
         FROM assignments
         WHERE status = 'assigned'
         GROUP BY shift_id`
      ),
      pool.query(
        `SELECT a.shift_id, u.name
         FROM assignments a
         JOIN users u ON a.user_id = u.id
         WHERE a.status = 'assigned'`
      ),
    ]);

    // Build lookup maps (O(n) merge, no extra DB roundtrips)
    const countMap = {};
    countsResult.rows.forEach(r => { countMap[r.shift_id] = parseInt(r.count); });

    const usersMap = {};
    usersResult.rows.forEach(r => {
      if (!usersMap[r.shift_id]) usersMap[r.shift_id] = [];
      usersMap[r.shift_id].push(r.name);
    });

    const shiftsWithDetails = shiftsResult.rows.map(shift => {
      const assigned_count = countMap[shift.id] || 0;
      return {
        ...shift,
        assigned_count,
        assigned_users: usersMap[shift.id] || [],
        coverage_status: assigned_count >= shift.required_count ? 'covered' : 'uncovered',
      };
    });

    res.json(shiftsWithDetails);
  } catch (err) {
    console.error('Get shifts error:', err);
    res.status(500).json({ error: 'Failed to fetch shifts' });
  }
};

// Create shift (admin only)
const createShift = async (req, res) => {
  const { location_id, start_time, end_time, required_count, has_pizza } = req.body;
  if (!location_id || !start_time || !end_time) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  try {
    const result = await pool.query(
      'INSERT INTO shifts (location_id, start_time, end_time, required_count, has_pizza, created_by) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [location_id, start_time, end_time, required_count || 1, !!has_pizza, req.user.id]
    );
    res.status(201).json({ message: 'Shift created', shift: result.rows[0] });
  } catch (err) {
    console.error('Create shift error:', err);
    res.status(500).json({ error: 'Failed to create shift' });
  }
};

// Update shift (admin only)
const updateShift = async (req, res) => {
  const { id } = req.params;
  const { location_id, start_time, end_time, required_count, has_pizza } = req.body;
  try {
    const result = await pool.query(
      'UPDATE shifts SET location_id=$1, start_time=$2, end_time=$3, required_count=$4, has_pizza=$5, updated_at=NOW() WHERE id=$6 RETURNING *',
      [location_id, start_time, end_time, required_count, !!has_pizza, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Shift not found' });
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

module.exports = { getShifts, createShift, updateShift, cancelShift, deleteShift };
