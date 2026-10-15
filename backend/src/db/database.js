const { Pool } = require('pg');
const { PRIVACY_POLICY, PRIVACY_VERSION } = require('./privacyPolicy');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

pool.on('error', (err) => console.error('Unexpected error on idle client', err));

// Testo iniziale dell'informativa privacy — modificabile poi dall'admin dal pannello,
// senza bisogno di ripubblicare il codice. Questo valore viene inserito una sola
// volta (al primo avvio): le modifiche successive fatte dall'admin non vengono
// mai sovrascritte da un nuovo deploy.
const DEFAULT_PRIVACY_POLICY = `Ai sensi del Regolamento (UE) 2016/679 ("GDPR"), la presente informativa descrive le modalità di trattamento dei dati personali degli utenti del servizio Dergano & Dragons per la prenotazione delle sessioni di gioco.

1. Titolare del trattamento
Il titolare del trattamento è [inserire nome/ragione sociale e recapito di contatto]. Per qualsiasi richiesta relativa al trattamento dei propri dati personali, l'interessato può scrivere a [inserire indirizzo email di contatto].

2. Dati personali raccolti
In fase di registrazione al servizio sono raccolti i seguenti dati: nome, indirizzo email e password, quest'ultima conservata esclusivamente in forma cifrata. In fase di prenotazione di una sessione di gioco vengono inoltre registrati la sessione prescelta e il numero di posti richiesti.

3. Finalità del trattamento
I dati raccolti sono trattati al solo fine di consentire l'accesso al servizio, la gestione delle prenotazioni e delle liste d'attesa, e l'invio di comunicazioni strettamente relative alla propria iscrizione, quali la conferma di prenotazione, l'inserimento in lista d'attesa e la promozione da lista d'attesa. I dati non sono utilizzati per finalità di marketing, né sono ceduti o comunicati a terzi per finalità commerciali.

4. Minori
Il servizio può essere utilizzato da persone minori di età. Per gli utenti di età inferiore a 14 anni, la registrazione richiede il consenso di chi esercita la responsabilità genitoriale, dichiarato in fase di iscrizione. [Punto da definire con un consulente qualificato: modalità di verifica e raccolta di tale consenso.]

5. Luogo di conservazione dei dati
I dati sono conservati su infrastrutture fornite da Neon (database) e Render (applicazione), ospitate su server situati negli Stati Uniti. Ciò comporta un trasferimento di dati personali al di fuori dello Spazio Economico Europeo. [Punto da definire: verifica delle garanzie contrattuali offerte dai fornitori per tale trasferimento, quali le clausole contrattuali standard della Commissione Europea.]

6. Periodo di conservazione
[Punto da definire: criteri di conservazione dei dati relativi ad account e prenotazioni dopo la cessazione della partecipazione alle attività.]

7. Diritti dell'interessato
L'interessato ha diritto di ottenere conferma dell'esistenza dei propri dati personali e di accedervi; di richiederne la rettifica, qualora inesatti; di richiederne la cancellazione, esercitabile autonomamente in qualsiasi momento eliminando il proprio account dalla propria area personale, operazione che comporta la cancellazione automatica di tutte le prenotazioni associate; di proporre reclamo all'Autorità Garante per la protezione dei dati personali, qualora ritenga che il trattamento violi la normativa vigente.

Per l'esercizio di tali diritti, o per qualsiasi altra richiesta, è possibile scrivere a [inserire contatto].

8. Sicurezza
Le password sono conservate in forma cifrata e non sono in alcun momento accessibili in chiaro, nemmeno da parte di chi amministra il servizio. L'accesso alle funzionalità di amministrazione è riservato al personale autorizzato.`;

// Initialize database schema
async function initializeDatabase() {
  const client = await pool.connect();
  try {
    await client.query(`
      -- Users table
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        role VARCHAR(50) NOT NULL DEFAULT 'volunteer',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Locations table
      CREATE TABLE IF NOT EXISTS locations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        address TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Shifts table
      CREATE TABLE IF NOT EXISTS shifts (
        id SERIAL PRIMARY KEY,
        location_id INTEGER REFERENCES locations(id) ON DELETE CASCADE,
        start_time TIMESTAMP NOT NULL,
        end_time TIMESTAMP NOT NULL,
        required_count INTEGER DEFAULT 1,
        created_by INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Assignments table
      CREATE TABLE IF NOT EXISTS assignments (
        id SERIAL PRIMARY KEY,
        shift_id INTEGER REFERENCES shifts(id) ON DELETE CASCADE,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        hours_volunteered DECIMAL(4,2) DEFAULT NULL,
        status VARCHAR(50) DEFAULT 'assigned',
        assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(shift_id, user_id)
      );

      -- Notifications table
      CREATE TABLE IF NOT EXISTS notifications (
        id SERIAL PRIMARY KEY,
        recipient_id INTEGER REFERENCES users(id),
        type VARCHAR(50) NOT NULL,
        subject VARCHAR(255),
        message TEXT,
        email_sent BOOLEAN DEFAULT FALSE,
        sent_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_shifts_location ON shifts(location_id);
      CREATE INDEX IF NOT EXISTS idx_assignments_user ON assignments(user_id);
      CREATE INDEX IF NOT EXISTS idx_assignments_shift ON assignments(shift_id);
      CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON notifications(recipient_id);

      -- Indici per performance query critiche
      CREATE INDEX IF NOT EXISTS idx_shifts_start_time ON shifts(start_time);
      CREATE INDEX IF NOT EXISTS idx_assignments_shift_status ON assignments(shift_id, status);
      CREATE INDEX IF NOT EXISTS idx_assignments_user_status ON assignments(user_id, status);
    `);

    // Migration: add cancelled column if missing
    await client.query(`
      ALTER TABLE shifts ADD COLUMN IF NOT EXISTS cancelled BOOLEAN DEFAULT false;
    `);

    // Migration: add has_pizza column if missing
    await client.query(`
      ALTER TABLE shifts ADD COLUMN IF NOT EXISTS has_pizza BOOLEAN DEFAULT false;
    `);

    // Migration: gruppi eroi e visibilità selettiva delle sessioni
    await client.query(`
      ALTER TABLE shifts ADD COLUMN IF NOT EXISTS visible_to_all BOOLEAN DEFAULT true;

      CREATE TABLE IF NOT EXISTS groups (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) UNIQUE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS user_groups (
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        group_id INTEGER REFERENCES groups(id) ON DELETE CASCADE,
        PRIMARY KEY (user_id, group_id)
      );

      CREATE TABLE IF NOT EXISTS shift_groups (
        shift_id INTEGER REFERENCES shifts(id) ON DELETE CASCADE,
        group_id INTEGER REFERENCES groups(id) ON DELETE CASCADE,
        PRIMARY KEY (shift_id, group_id)
      );
    `);

    // Migration: posti multipli per iscrizione (es. "prenoto per me + 1 amico")
    await client.query(`
      ALTER TABLE assignments ADD COLUMN IF NOT EXISTS seats INTEGER DEFAULT 1;
    `);

    // Migration: registra quando l'utente ha accettato l'informativa privacy
    await client.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS privacy_accepted_at TIMESTAMP DEFAULT NULL;
    `);

    // Migration: eliminare un account (anche di un admin che ha creato sessioni) non deve fallire.
    await client.query(`
      ALTER TABLE shifts DROP CONSTRAINT IF EXISTS shifts_created_by_fkey;
      ALTER TABLE shifts ADD CONSTRAINT shifts_created_by_fkey FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;
      ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_recipient_id_fkey;
      ALTER TABLE notifications ADD CONSTRAINT notifications_recipient_id_fkey FOREIGN KEY (recipient_id) REFERENCES users(id) ON DELETE CASCADE;
    `);

    // Migration: recupero password con link monouso (nel DB resta solo l'hash del token)
    // e consenso separato alla newsletter, revocabile dal link in ogni email.
    await client.query(`
      CREATE TABLE IF NOT EXISTS password_resets (
        token_hash CHAR(64) PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        expires_at TIMESTAMP NOT NULL,
        used_at TIMESTAMP DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      ALTER TABLE users ADD COLUMN IF NOT EXISTS newsletter_opt_in BOOLEAN NOT NULL DEFAULT FALSE;
    `);

    // Migration: contenuti testuali editabili dall'admin (es. informativa privacy)
    // senza dover ripubblicare il codice — chiave/valore generico, riusabile in futuro.
    await client.query(`
      CREATE TABLE IF NOT EXISTS site_content (
        key VARCHAR(100) PRIMARY KEY,
        content TEXT NOT NULL DEFAULT '',
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    await client.query(
      `INSERT INTO site_content (key, content) VALUES ($1, $2) ON CONFLICT (key) DO NOTHING`,
      ['privacy_policy', DEFAULT_PRIVACY_POLICY]
    );

    // Migration: informativa versionata, ultimo accesso (per la conservazione) e inviti via email.
    await client.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS privacy_version INTEGER NOT NULL DEFAULT 0;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP DEFAULT NULL;
      CREATE TABLE IF NOT EXISTS invites (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) NOT NULL UNIQUE,
        invited_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
        sends INTEGER NOT NULL DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    // Migration: registro eventi per gli admin e preferenza email.
    await client.query(`
      CREATE TABLE IF NOT EXISTS admin_events (
        id SERIAL PRIMARY KEY,
        type VARCHAR(40) NOT NULL,
        message TEXT NOT NULL,
        actor_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_admin_events_created ON admin_events(created_at DESC);
      ALTER TABLE users ADD COLUMN IF NOT EXISTS admin_email_notify BOOLEAN NOT NULL DEFAULT TRUE;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS admin_seen_events_at TIMESTAMP DEFAULT NOW();
    `);
    // Nuova informativa: sostituisce il testo solo se e' ancora quello vecchio con i segnaposto
    // (se l'admin l'ha gia' personalizzata, non la tocchiamo) e fissa la versione corrente.
    const cur = await client.query("SELECT content FROM site_content WHERE key = 'privacy_policy'");
    if (!cur.rows[0] || cur.rows[0].content.includes('[inserire')) {
      await client.query(
        `INSERT INTO site_content (key, content, updated_at) VALUES ('privacy_policy', $1, NOW())
         ON CONFLICT (key) DO UPDATE SET content = $1, updated_at = NOW()`, [PRIVACY_POLICY]);
    }
    await client.query(
      `INSERT INTO site_content (key, content) VALUES ('privacy_version', $1)
       ON CONFLICT (key) DO UPDATE SET content = GREATEST(site_content.content::int, $1::int)::text`, [String(PRIVACY_VERSION)]);

    console.log('✅ Database initialized');
  } catch (err) {
    console.error('Error initializing database:', err);
  } finally {
    client.release();
  }
}

const getPrivacyVersion = async () => {
  const r = await pool.query("SELECT content FROM site_content WHERE key = 'privacy_version'");
  return parseInt(r.rows[0]?.content || '0', 10);
};

module.exports = { getPrivacyVersion, pool, initializeDatabase };
