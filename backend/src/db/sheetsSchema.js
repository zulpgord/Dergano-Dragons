// ============================================================================
//  PAGINA PERSONAGGI — schema e popolamento iniziale
//  Richiamato da initializeDatabase() in src/db/database.js passando il
//  client della transazione (le altre migrazioni usano `client.query`). La
//  migrazione si applica da sola al primo avvio dopo il deploy: nessun SQL
//  da lanciare a mano su Neon.
//
//  L'autorizzazione ricalca esattamente quella delle sessioni:
//      shifts.visible_to_all  +  shift_groups   ->   sheets.visible_to_all  +  sheet_groups
//  con in più sheet_users, per autorizzare il singolo eroe senza creargli un gruppo.
// ============================================================================

const SCHEDE = [
  // slug, nome, classe, razza, tag ruolo, difficoltà, stile, blurb, pdf
  ['dorunn-martelcuore', 'Dorunn Martelcuore', 'Chierico', 'Nano delle Colline', 'Cura', 'facile', 'power',
    'Fabbro e guaritore. Rimette in piedi i compagni e regge i colpi meglio di chiunque.',
    '/schede/PG_01_Dorunn_Martelcuore_chierico_nano.pdf'],
  ['aldrec-vantorre', 'Aldrec Vantorre', 'Guerriero', 'Umano', 'Difesa', 'facile', 'power',
    'Il muro del gruppo. Nessuno passa, e chi ci prova si ferma dov\u2019\u00e8.',
    '/schede/PG_02_Aldrec_Vantorre_guerriero_umano.pdf'],
  ['vessa-nove-dita', 'Vessa Nove-Dita', 'Ladro', 'Mezzelfo', 'Furtivit\u00e0', 'media', 'power',
    'Otto abilit\u00e0, una falsa identit\u00e0 e un pugnale nella manica. Colpisce e sparisce.',
    '/schede/PG_03_Vessa_NoveDita_ladro_mezzelfo.pdf'],
  ['thavien-passabruma', 'Thavien Passabruma', 'Ranger', 'Elfo dei Boschi', 'Distanza', 'media', 'power',
    'Arco lungo a quarantacinque metri e nessun rischio di perdersi nel bosco.',
    '/schede/PG_04_Thavien_Passabruma_ranger_elfo.pdf'],
  ['pip-fiorcanto', 'Pip Fiorcanto', 'Bardo', 'Halfling Piedelesto', 'Supporto', 'media', 'power',
    'Non fa danni: fa vincere gli altri. E pu\u00f2 addormentare una stanza intera.',
    '/schede/PG_05_Pip_Fiorcanto_bardo_halfling.pdf'],
  ['ashmara-vhalen', 'Ashmara Vhalen', 'Stregone', 'Tiefling', 'Area', 'media', 'power',
    'Fuoco, corna e un contratto di famiglia mai saldato.',
    '/schede/PG_06_Ashmara_Vhalen_stregone_tiefling.pdf'],
  ['grukka-spaccaceppi', 'Grukka Spaccaceppi', 'Barbaro', 'Mezzorco', 'Prima linea', 'facile', 'power',
    'Ascia bipenne e Ira. In Ira i suoi quattordici punti ferita ne valgono ventotto.',
    '/schede/PG_07_Grukka_Spaccaceppi_barbaro_mezzorco.pdf'],
  ['fizwick-trentapagine', 'Fizwick Trentapagine', 'Mago', 'Gnomo delle Rocce', 'Controllo', 'difficile', 'power',
    'Sessantun anni di biblioteca e un libro di incantesimi da proteggere con la vita.',
    '/schede/PG_08_Fizwick_Trentapagine_mago_gnomo.pdf'],
  ['isolde-rovoscuro', 'Isolde Rovoscuro', 'Warlock', 'Umano', 'Distanza', 'media', 'power',
    'Raggio Occulto illimitato e un patto che non ricorda di aver firmato.',
    '/schede/PG_09_Isolde_Rovoscuro_warlock_umano.pdf'],
  ['bree-sassolesto', 'Bree Sassolesto', 'Monaco', 'Halfling Tozzo', 'Mobilit\u00e0', 'media', 'power',
    'Due attacchi ogni turno gi\u00e0 al primo livello. E nessuna armatura addosso.',
    '/schede/PG_10_Bree_Sassolesto_monaco_halfling.pdf'],
  ['medrash-brumargento', 'Medrash Brumargento', 'Paladino', 'Dragonide d\u2019argento', 'Difesa', 'facile', 'power',
    'Fabbro pentito, soffio di gelo e una riserva di cure per i compagni.',
    '/schede/PG_11_Medrash_Brumargento_paladino_dragonide_argento.pdf'],
  ['medrash-forgiabrace', 'Medrash Forgiabrace', 'Paladino', 'Dragonide rosso', 'Difesa', 'facile', 'power',
    'Stessa storia, soffio di fuoco. La variante infuocata di Medrash.',
    '/schede/PG_11b_Medrash_Forgiabrace_paladino_dragonide_rosso.pdf'],
  ['nyx-canneto', 'Nyx Canneto', 'Druido', 'Gnomo delle Foreste', 'Controllo', 'difficile', 'goofy',
    'Parla con gli animali piccoli e blocca i nemici con i rovi. Mai metallo addosso.',
    '/schede/PG_12_Nyx_Canneto_druido_gnomo.pdf'],
  ['ownka-sillaba-lenta', 'Ownka Sillaba-Lenta', 'Mago', 'Mezzorco', 'Controllo', 'difficile', 'goofy',
    'Ha imparato a leggere a ventitr\u00e9 anni. Il suo libro di magia era un registro contabile.',
    '/schede/PG_13_Ownka_SillabaLenta_mago_mezzorco.pdf'],
  ['roscoe-spaccabotte', 'Roscoe Spaccabotte', 'Barbaro', 'Halfling Piedelesto', 'Prima linea', 'facile', 'goofy',
    'Un metro scarso di lottatore da fiera. Passa in mezzo ai nemici, letteralmente.',
    '/schede/PG_14_Roscoe_Spaccabotte_barbaro_halfling.pdf'],
  ['vistra-passocavo', 'Vistra Passocavo', 'Ladro', 'Nano delle Montagne', 'Esplorazione', 'media', 'goofy',
    'Geniere guastatrice: disinnesca tutto e incassa i colpi meglio di un ladro normale.',
    '/schede/PG_15_Vistra_Passocavo_ladro_nano.pdf'],
  ['quarion-duefacce', 'Quarion Duefacce', 'Chierico', 'Elfo Alto', 'Supporto', 'media', 'goofy',
    'Il chierico che spara: arco lungo e una maschera d\u2019argento rubata a un tempio.',
    '/schede/PG_16_Quarion_Duefacce_chierico_elfo_alto.pdf'],
  ['boddynock-saldafede', 'Boddynock Saldafede', 'Paladino', 'Gnomo delle Rocce', 'Difesa', 'facile', 'goofy',
    'Un metro di paladino dentro un\u2019armatura pesante. Quasi impossibile da ammaliare.',
    '/schede/PG_17_Boddynock_Saldafede_paladino_gnomo.pdf'],
  ['kansif-salmodia', 'Kansif Salmodia', 'Chierico', 'Mezzorco', 'Mischia', 'media', 'goofy',
    'Cappellana da campo. Due attacchi per turno e quarantatr\u00e9 nomi cuciti nella fodera.',
    '/schede/PG_18_Kansif_Salmodia_chierico_mezzorco.pdf'],
  ['chalithra-velsarn', 'Chalithra Vel\u2019Sarn', 'Ladro', 'Elfo Oscuro (drow)', 'Furtivit\u00e0', 'difficile', 'power',
    'Vede al buio a trentasei metri. Alla luce del sole, molto meno.',
    '/schede/PG_19_Chalithra_VelSarn_ladro_drow.pdf'],
];

async function ensureSheetTables(db) {
  await db.query(`
    CREATE TABLE IF NOT EXISTS sheets (
      id             SERIAL PRIMARY KEY,
      slug           VARCHAR(80)  NOT NULL UNIQUE,
      name           VARCHAR(120) NOT NULL,
      klass          VARCHAR(40)  NOT NULL,
      race           VARCHAR(60)  NOT NULL,
      level          INTEGER      NOT NULL DEFAULT 1,
      role_tag       VARCHAR(40)  NOT NULL DEFAULT '',
      difficulty     VARCHAR(20)  NOT NULL DEFAULT 'media',
      style          VARCHAR(20)  NOT NULL DEFAULT 'power',
      blurb          TEXT         NOT NULL DEFAULT '',
      pdf_path       VARCHAR(220) NOT NULL,
      image_path     VARCHAR(220),
      sort_order     INTEGER      NOT NULL DEFAULT 0,
      visible_to_all BOOLEAN      NOT NULL DEFAULT false,
      archived       BOOLEAN      NOT NULL DEFAULT false,
      created_at     TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
      updated_at     TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
    )`);

  await db.query(`
    CREATE TABLE IF NOT EXISTS sheet_groups (
      sheet_id INTEGER NOT NULL REFERENCES sheets(id) ON DELETE CASCADE,
      group_id INTEGER NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
      PRIMARY KEY (sheet_id, group_id)
    )`);

  await db.query(`
    CREATE TABLE IF NOT EXISTS sheet_users (
      sheet_id   INTEGER NOT NULL REFERENCES sheets(id) ON DELETE CASCADE,
      user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      granted_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (sheet_id, user_id)
    )`);

  await db.query('CREATE INDEX IF NOT EXISTS idx_sheet_groups_group ON sheet_groups(group_id)');
  await db.query('CREATE INDEX IF NOT EXISTS idx_sheet_users_user ON sheet_users(user_id)');

  // Popolamento: solo le schede mancanti, così il file resta rilanciabile
  // e non sovrascrive niente di quello che hai modificato dal pannello admin.
  for (let i = 0; i < SCHEDE.length; i++) {
    const [slug, name, klass, race, roleTag, difficulty, style, blurb, pdfPath] = SCHEDE[i];
    await db.query(
      `INSERT INTO sheets (slug, name, klass, race, role_tag, difficulty, style, blurb, pdf_path, sort_order)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       ON CONFLICT (slug) DO NOTHING`,
      [slug, name, klass, race, roleTag, difficulty, style, blurb, pdfPath, (i + 1) * 10]
    );
  }

  console.log('✅ Tabelle schede personaggi pronte');
}

module.exports = { ensureSheetTables };
