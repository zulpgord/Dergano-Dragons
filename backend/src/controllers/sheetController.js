const { pool } = require('../db/database');

// Percorso immagine: se non è stato impostato a mano, si usa la convenzione
// /schede/img/<slug>.jpg — così ti basta caricare i file col nome giusto.
const conImmagine = (r) => ({ ...r, image_path: r.image_path || `/schede/img/${r.slug}.jpg` });

// ---------------------------------------------------------------------------
// GET /api/sheets — schede visibili all'eroe loggato.
// Stessa logica di visibilità delle sessioni: pubblica, oppure gruppo
// autorizzato, oppure autorizzazione nominale. L'admin vede tutto.
// ---------------------------------------------------------------------------
const getSheets = async (req, res) => {
  try {
    if (req.user.role === 'admin') {
      const result = await pool.query(`
        SELECT s.*,
          COALESCE((SELECT json_agg(json_build_object('id', g.id, 'name', g.name) ORDER BY g.name)
                    FROM sheet_groups sg JOIN groups g ON g.id = sg.group_id
                    WHERE sg.sheet_id = s.id), '[]'::json) AS groups,
          COALESCE((SELECT json_agg(json_build_object('id', u.id, 'name', u.name) ORDER BY u.name)
                    FROM sheet_users su JOIN users u ON u.id = su.user_id
                    WHERE su.sheet_id = s.id), '[]'::json) AS users
        FROM sheets s
        WHERE s.archived = false
        ORDER BY s.sort_order ASC, s.id ASC`);
      return res.json(result.rows.map(conImmagine));
    }

    const result = await pool.query(`
      SELECT DISTINCT s.id, s.slug, s.name, s.klass, s.race, s.level, s.role_tag,
             s.difficulty, s.style, s.blurb, s.image_path, s.sort_order
      FROM sheets s
      LEFT JOIN sheet_groups sg ON sg.sheet_id = s.id
      LEFT JOIN user_groups  ug ON ug.group_id = sg.group_id AND ug.user_id = $1
      LEFT JOIN sheet_users  su ON su.sheet_id = s.id        AND su.user_id = $1
      WHERE s.archived = false
        AND (s.visible_to_all = true OR ug.user_id IS NOT NULL OR su.user_id IS NOT NULL)
      ORDER BY s.sort_order ASC, s.id ASC`, [req.user.id]);
    res.json(result.rows.map(conImmagine));
  } catch (err) {
    console.error('Get sheets error:', err);
    res.status(500).json({ error: 'Failed to fetch sheets' });
  }
};

// ---------------------------------------------------------------------------
// GET /api/sheets/:slug/download — verifica il permesso e rimanda al PDF.
// ---------------------------------------------------------------------------
const downloadSheet = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT s.pdf_path,
        (s.visible_to_all
         OR $2 = 'admin'
         OR EXISTS (SELECT 1 FROM sheet_groups sg JOIN user_groups ug ON ug.group_id = sg.group_id
                    WHERE sg.sheet_id = s.id AND ug.user_id = $3)
         OR EXISTS (SELECT 1 FROM sheet_users su
                    WHERE su.sheet_id = s.id AND su.user_id = $3)) AS allowed
      FROM sheets s WHERE s.slug = $1 AND s.archived = false`,
      [req.params.slug, req.user.role, req.user.id]);

    if (result.rows.length === 0) return res.status(404).json({ error: 'Scheda non trovata' });
    if (!result.rows[0].allowed) return res.status(403).json({ error: 'Non sei autorizzato a questa scheda' });
    res.json({ url: result.rows[0].pdf_path });
  } catch (err) {
    console.error('Download sheet error:', err);
    res.status(500).json({ error: 'Errore nel download della scheda' });
  }
};

// ---------------------------------------------------------------------------
// ADMIN
// ---------------------------------------------------------------------------
const CAMPI = ['visible_to_all', 'archived', 'blurb', 'difficulty', 'style',
               'role_tag', 'sort_order', 'image_path'];

const updateSheet = async (req, res) => {
  const set = [], val = [];
  CAMPI.forEach((c) => {
    if (req.body[c] !== undefined) { val.push(req.body[c]); set.push(`${c} = $${val.length}`); }
  });
  if (set.length === 0) return res.status(400).json({ error: 'Nessun campo da aggiornare' });
  val.push(req.params.id);
  try {
    const result = await pool.query(
      `UPDATE sheets SET ${set.join(', ')}, updated_at = CURRENT_TIMESTAMP
       WHERE id = $${val.length} RETURNING *`, val);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Scheda non trovata' });
    res.json(conImmagine(result.rows[0]));
  } catch (err) {
    console.error('Update sheet error:', err);
    res.status(500).json({ error: "Errore nell'aggiornamento della scheda" });
  }
};

const setSheetGroups = async (req, res) => {
  const ids = Array.isArray(req.body.group_ids) ? req.body.group_ids : [];
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('DELETE FROM sheet_groups WHERE sheet_id = $1', [req.params.id]);
    for (const gid of ids) {
      await client.query(
        'INSERT INTO sheet_groups (sheet_id, group_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [req.params.id, gid]);
    }
    await client.query('COMMIT');
    res.json({ message: 'Tavoli aggiornati', sheet_id: Number(req.params.id), group_ids: ids });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Set sheet groups error:', err);
    res.status(500).json({ error: "Errore nell'assegnazione dei tavoli" });
  } finally {
    client.release();
  }
};

const setSheetUsers = async (req, res) => {
  const ids = Array.isArray(req.body.user_ids) ? req.body.user_ids : [];
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('DELETE FROM sheet_users WHERE sheet_id = $1', [req.params.id]);
    for (const uid of ids) {
      await client.query(
        'INSERT INTO sheet_users (sheet_id, user_id, granted_by) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING',
        [req.params.id, uid, req.user.id]);
    }
    await client.query('COMMIT');
    res.json({ message: 'Eroi autorizzati aggiornati', sheet_id: Number(req.params.id), user_ids: ids });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Set sheet users error:', err);
    res.status(500).json({ error: "Errore nell'assegnazione degli eroi" });
  } finally {
    client.release();
  }
};

const bulkVisibility = async (req, res) => {
  const { ids = [], visible_to_all } = req.body;
  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ error: 'Nessuna scheda selezionata' });
  }
  try {
    await pool.query(
      `UPDATE sheets SET visible_to_all = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = ANY($2::int[])`, [!!visible_to_all, ids]);
    res.json({ message: 'Visibilità aggiornata', updated: ids.length });
  } catch (err) {
    console.error('Bulk visibility error:', err);
    res.status(500).json({ error: "Errore nell'aggiornamento massivo" });
  }
};

module.exports = { getSheets, downloadSheet, updateSheet, setSheetGroups, setSheetUsers, bulkVisibility };
