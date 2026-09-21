const { pool } = require('../db/database');
const { sendEmail } = require('../utils/emailService');

// Lista tutti i gruppi con i membri
const getGroups = async (req, res) => {
  try {
    const [groupsResult, membersResult] = await Promise.all([
      pool.query('SELECT * FROM groups ORDER BY name ASC'),
      pool.query(
        `SELECT ug.group_id, u.id as user_id, u.name, u.email
         FROM user_groups ug JOIN users u ON ug.user_id = u.id
         ORDER BY u.name ASC`
      ),
    ]);

    const membersMap = {};
    membersResult.rows.forEach(r => {
      if (!membersMap[r.group_id]) membersMap[r.group_id] = [];
      membersMap[r.group_id].push({ id: r.user_id, name: r.name, email: r.email });
    });

    const groups = groupsResult.rows.map(g => ({
      ...g,
      members: membersMap[g.id] || [],
    }));

    res.json(groups);
  } catch (err) {
    console.error('Get groups error:', err);
    res.status(500).json({ error: 'Failed to fetch groups' });
  }
};

// Crea un nuovo gruppo
const createGroup = async (req, res) => {
  const { name } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ error: 'Group name required' });
  try {
    const result = await pool.query(
      'INSERT INTO groups (name) VALUES ($1) RETURNING *',
      [name.trim()]
    );
    res.status(201).json({ message: 'Group created', group: { ...result.rows[0], members: [] } });
  } catch (err) {
    if (err.code === '23505') return res.status(400).json({ error: 'Esiste già un gruppo con questo nome' });
    console.error('Create group error:', err);
    res.status(500).json({ error: 'Failed to create group' });
  }
};

// Elimina un gruppo
const deleteGroup = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('DELETE FROM groups WHERE id = $1 RETURNING id', [id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Group not found' });
    res.json({ message: 'Group deleted' });
  } catch (err) {
    console.error('Delete group error:', err);
    res.status(500).json({ error: 'Failed to delete group' });
  }
};

// Sostituisce l'intera lista membri di un gruppo
const setGroupMembers = async (req, res) => {
  const { id } = req.params;
  const { user_ids } = req.body;
  if (!Array.isArray(user_ids)) return res.status(400).json({ error: 'user_ids must be an array' });
  try {
    await pool.query('DELETE FROM user_groups WHERE group_id = $1', [id]);
    if (user_ids.length > 0) {
      const values = user_ids.map((_, i) => `($1, $${i + 2})`).join(', ');
      await pool.query(
        `INSERT INTO user_groups (group_id, user_id) VALUES ${values}`,
        [id, ...user_ids]
      );
    }
    res.json({ message: 'Group members updated' });
  } catch (err) {
    console.error('Set group members error:', err);
    res.status(500).json({ error: 'Failed to update group members' });
  }
};

// Invia un'email a tutti i membri del gruppo (invii individuali, mai in "A:" insieme)
const sendGroupEmail = async (req, res) => {
  const { id } = req.params;
  const { subject, message } = req.body;
  if (!subject?.trim() || !message?.trim()) {
    return res.status(400).json({ error: 'Oggetto e messaggio sono obbligatori' });
  }
  try {
    const groupRes = await pool.query('SELECT name FROM groups WHERE id = $1', [id]);
    if (groupRes.rows.length === 0) return res.status(404).json({ error: 'Group not found' });

    const membersRes = await pool.query(
      `SELECT u.email, u.name FROM user_groups ug JOIN users u ON ug.user_id = u.id WHERE ug.group_id = $1`,
      [id]
    );
    if (membersRes.rows.length === 0) {
      return res.status(400).json({ error: 'Questo gruppo non ha ancora membri' });
    }

    const results = await Promise.all(
      membersRes.rows.map(m =>
        sendEmail(m.email, subject.trim(), `Ciao ${m.name},\n\n${message.trim()}`)
          .then(r => ({ ok: !!r, email: m.email }))
      )
    );
    const sent = results.filter(r => r.ok).length;
    const failed = results.length - sent;

    res.json({ message: 'Invio completato', sent, failed, total: results.length });
  } catch (err) {
    console.error('Send group email error:', err);
    res.status(500).json({ error: "Errore nell'invio delle email" });
  }
};

module.exports = { getGroups, createGroup, deleteGroup, setGroupMembers, sendGroupEmail };
