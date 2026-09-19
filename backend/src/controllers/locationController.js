const { pool } = require('../db/database');

const getLocations = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM locations ORDER BY name ASC');
    res.json(result.rows);
  } catch (err) {
    console.error('Get locations error:', err);
    res.status(500).json({ error: 'Failed to fetch locations' });
  }
};

const createLocation = async (req, res) => {
  const { name, address } = req.body;
  if (!name) return res.status(400).json({ error: 'Name is required' });
  try {
    const result = await pool.query(
      'INSERT INTO locations (name, address) VALUES ($1, $2) RETURNING *',
      [name, address || null]
    );
    res.status(201).json({ message: 'Location created', location: result.rows[0] });
  } catch (err) {
    console.error('Create location error:', err);
    res.status(500).json({ error: 'Failed to create location' });
  }
};

const updateLocation = async (req, res) => {
  const { id } = req.params;
  const { name, address } = req.body;
  if (!name) return res.status(400).json({ error: 'Name is required' });
  try {
    const result = await pool.query(
      'UPDATE locations SET name = $1, address = $2 WHERE id = $3 RETURNING *',
      [name, address || null, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Location not found' });
    res.json({ message: 'Location updated', location: result.rows[0] });
  } catch (err) {
    console.error('Update location error:', err);
    res.status(500).json({ error: 'Failed to update location' });
  }
};

module.exports = { getLocations, createLocation, updateLocation };
