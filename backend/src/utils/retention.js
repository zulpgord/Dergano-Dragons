const { pool } = require('../db/database');

// Applica i tempi di conservazione scritti nell'informativa. Gira all'avvio e poi una volta al giorno.
// Account (non admin) senza accessi ne' iscrizioni da 24 mesi -> cancellati, con le iscrizioni collegate.
// Inviti a cui non e' seguita l'iscrizione da 6 mesi -> cancellati.
const runRetention = async () => {
  try {
    const users = await pool.query(`
      DELETE FROM users u
      WHERE u.role <> 'admin'
        AND GREATEST(u.created_at, COALESCE(u.last_login_at, u.created_at)) < NOW() - INTERVAL '24 months'
        AND NOT EXISTS (
          SELECT 1 FROM assignments a JOIN shifts s ON s.id = a.shift_id
          WHERE a.user_id = u.id AND s.start_time > NOW() - INTERVAL '24 months')
      RETURNING u.id`);
    const invites = await pool.query(`
      DELETE FROM invites i
      WHERE i.last_sent_at < NOW() - INTERVAL '6 months'
        AND NOT EXISTS (SELECT 1 FROM users r WHERE lower(r.email) = i.email)
      RETURNING i.id`);
    if (users.rowCount || invites.rowCount) {
      console.log(`🧹 Conservazione dati: eliminati ${users.rowCount} account inattivi e ${invites.rowCount} inviti scaduti`);
    }
  } catch (err) {
    console.error('Retention error:', err.message);
  }
};

const scheduleRetention = () => {
  setTimeout(runRetention, 60 * 1000);
  setInterval(runRetention, 24 * 60 * 60 * 1000);
};

module.exports = { runRetention, scheduleRetention };
