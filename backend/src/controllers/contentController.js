const { pool } = require('../db/database');

// Lettura pubblica (es. la pagina privacy dev'essere leggibile anche da chi non ha un account)
const getContent = async (req, res) => {
  const { key } = req.params;
  try {
    const result = await pool.query('SELECT key, content, updated_at FROM site_content WHERE key = $1', [key]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Contenuto non trovato' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Get content error:', err);
    res.status(500).json({ error: 'Errore nel caricamento del contenuto' });
  }
};

// Modifica riservata all'admin
const updateContent = async (req, res) => {
  const { key } = req.params;
  const { content } = req.body;
  if (typeof content !== 'string') return res.status(400).json({ error: 'content richiesto' });
  try {
    const result = await pool.query(
      `INSERT INTO site_content (key, content, updated_at) VALUES ($1, $2, NOW())
       ON CONFLICT (key) DO UPDATE SET content = $2, updated_at = NOW()
       RETURNING key, content, updated_at`,
      [key, content]
    );
    res.json({ message: 'Contenuto aggiornato', ...result.rows[0] });
  } catch (err) {
    console.error('Update content error:', err);
    res.status(500).json({ error: "Errore nel salvataggio del contenuto" });
  }
};

module.exports = { getContent, updateContent };
