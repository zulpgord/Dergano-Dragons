const { pool } = require('../db/database');

// Get all users (admin only)
const getUsers = async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, email, name, role, created_at FROM users ORDER BY created_at DESC'
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

// Reset user password (admin only)
const resetUserPassword = async (req, res) => {
  const { id } = req.params;
  const { new_password } = req.body;
  if (!new_password || new_password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }
  try {
    const bcrypt = require('bcryptjs');
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

module.exports = { getUsers, updateUserRole, resetUserPassword, getStats, getShiftStats, fixFutureShifts };
