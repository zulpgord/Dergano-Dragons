import { useState, useEffect, useMemo } from 'react';
import { sheetsAPI } from '../services/api';
import { DOMANDE, CLASSI, calcolaRisultato } from '../data/quizPersonaggi';
import './PersonaggiPage.css';

export default function PersonaggiPage() {
  const [schede, setSchede] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // filtri
  const [fClasse, setFClasse] = useState('tutte');
  const [fRazza, setFRazza] = useState('tutte');
  const [fStile, setFStile] = useState('tutti');     // tutti | power | goofy
  const [cerca, setCerca] = useState('');

  // questionario
  const [quizAperto, setQuizAperto] = useState(false);
  const [passo, setPasso] = useState(0);
  const [risposte, setRisposte] = useState({});
  const [esito, setEsito] = useState(null);
  const [scaricando, setScaricando] = useState(null);

  useEffect(() => {
    sheetsAPI.getSheets()
      .then((res) => setSchede(res.data))
      .catch(() => setError('Non riesco a raggiungere la taverna in questo momento.'))
      .finally(() => setLoading(false));
  }, []);

  const classi = useMemo(
    () => [...new Set(schede.map((s) => s.klass))].sort((a, b) => a.localeCompare(b)), [schede]);
  const razze = useMemo(
    () => [...new Set(schede.map((s) => s.race))].sort((a, b) => a.localeCompare(b)), [schede]);

  const visibili = useMemo(() => schede.filter((s) => {
    if (fClasse !== 'tutte' && s.klass !== fClasse) return false;
    if (fRazza !== 'tutte' && s.race !== fRazza) return false;
    if (fStile !== 'tutti' && s.style !== fStile) return false;
    if (!cerca.trim()) return true;
    const q = cerca.trim().toLowerCase();
    return [s.name, s.klass, s.race, s.role_tag, s.blurb].join(' ').toLowerCase().includes(q);
  }), [schede, fClasse, fRazza, fStile, cerca]);

  const filtriAttivi = fClasse !== 'tutte' || fRazza !== 'tutte' || fStile !== 'tutti' || cerca.trim();

  function azzeraFiltri() {
    setFClasse('tutte'); setFRazza('tutte'); setFStile('tutti'); setCerca('');
  }

  // ---------------------------------------------------------------- download
  async function scarica(s) {
    setScaricando(s.slug);
    try {
      const res = await sheetsAPI.download(s.slug);
      const a = document.createElement('a');
      a.href = res.data.url;
      a.download = '';
      document.body.appendChild(a); a.click(); a.remove();
    } catch (err) {
      alert(err.response?.status === 403
        ? 'Questa scheda non è ancora stata assegnata a te. Chiedi al tuo master.'
        : 'Non sono riuscito a scaricare la scheda.');
    } finally {
      setScaricando(null);
    }
  }

  // -------------------------------------------------------------- questionario
  function apriQuiz() {
    setQuizAperto(true); setPasso(0); setRisposte({}); setEsito(null);
  }

  function rispondi(domanda, opzione) {
    const nuove = { ...risposte, [domanda.id]: opzione.id };
    setRisposte(nuove);
    if (passo + 1 < DOMANDE.length) {
      setPasso(passo + 1);
    } else {
      setEsito(calcolaRisultato(nuove));
    }
  }

  function applicaConsiglio(classe, stile) {
    setFClasse(classe);
    setFRazza('tutte');
    setFStile(stile || 'tutti');
    setCerca('');
    setQuizAperto(false);
    document.getElementById('griglia-pg')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  const quantiPer = (classe, stile) => schede.filter(
    (s) => s.klass === classe && (!stile || s.style === stile)).length;

  // --------------------------------------------------------------------- UI
  return (
    <div className="pg-page">
      <header className="pg-hero">
        <p className="pg-occhiello">Dergano &amp; Dragons</p>
        <h1>Scegli il tuo eroe</h1>
        <p className="pg-sub">
          Ogni foglio contiene la scheda completa e un riassunto con tutto quello
          che ti serve al tavolo. Se non sai da dove cominciare, chiedi consiglio
          al taverniere.
        </p>
        <button className="pg-btn pg-btn-primario" onClick={apriQuiz}>
          🍺 Chiedi consiglio al taverniere
        </button>
      </header>

      {loading && <p className="pg-stato">Il taverniere sta controllando il registro…</p>}
      {error && <p className="pg-stato pg-errore">{error}</p>}

      {!loading && !error && schede.length === 0 && (
        <div className="pg-vuoto">
          <p className="pg-vuoto-icona">🕯️</p>
          <h2>La taverna è ancora chiusa</h2>
          <p>Non ci sono eroi assegnati al tuo nome. Parla con il tuo master: sarà lui ad aprirti la porta.</p>
        </div>
      )}

      {!loading && schede.length > 0 && (
        <>
          <div className="pg-filtri">
            <input className="pg-cerca" type="search" placeholder="Cerca per nome…"
                   value={cerca} onChange={(e) => setCerca(e.target.value)} />

            <select value={fClasse} onChange={(e) => setFClasse(e.target.value)} aria-label="Filtra per classe">
              <option value="tutte">Tutte le classi</option>
              {classi.map((c) => <option key={c} value={c}>{CLASSI[c]?.emoji || '🎲'} {c}</option>)}
            </select>

            <select value={fRazza} onChange={(e) => setFRazza(e.target.value)} aria-label="Filtra per razza">
              <option value="tutte">Tutte le razze</option>
              {razze.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>

            <div className="pg-stile" role="group" aria-label="Tipo di abbinamento">
              {[['tutti', 'Tutti'], ['power', '🎯 Ottimizzati'], ['goofy', '🎭 Bizzarri']].map(([v, l]) => (
                <button key={v} type="button"
                        className={`pg-chip ${fStile === v ? 'attivo' : ''}`}
                        onClick={() => setFStile(v)}>{l}</button>
              ))}
            </div>

            {filtriAttivi && (
              <button className="pg-azzera" type="button" onClick={azzeraFiltri}>Azzera</button>
            )}
          </div>

          <p className="pg-conteggio">
            {visibili.length === 1 ? '1 eroe disponibile' : `${visibili.length} eroi disponibili`}
            {fStile === 'power' && ' · abbinamenti classici, la razza spinge la classe'}
            {fStile === 'goofy' && ' · abbinamenti fuori standard, vincono in un altro modo'}
          </p>

          <div className="pg-griglia" id="griglia-pg">
            {visibili.map((s) => (
              <Riquadro key={s.slug} s={s}
                        scaricando={scaricando === s.slug}
                        onScarica={() => scarica(s)} />
            ))}
          </div>

          {visibili.length === 0 && (
            <p className="pg-stato">Nessun eroe corrisponde ai filtri. Prova ad allargare la ricerca.</p>
          )}
        </>
      )}

      {quizAperto && (
        <Questionario
          passo={passo} esito={esito} risposte={risposte}
          onRispondi={rispondi}
          onIndietro={() => setPasso(Math.max(0, passo - 1))}
          onChiudi={() => setQuizAperto(false)}
          onRicomincia={apriQuiz}
          onScegli={applicaConsiglio}
          quantiPer={quantiPer}
        />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ riquadro */
function Riquadro({ s, scaricando, onScarica }) {
  const [senzaImmagine, setSenzaImmagine] = useState(false);
  const cl = CLASSI[s.klass] || { emoji: '🎲' };

  return (
    <article className="pg-carta">
      <div className="pg-ritratto">
        {!senzaImmagine ? (
          <img src={s.image_path} alt="" loading="lazy"
               onError={() => setSenzaImmagine(true)} />
        ) : (
          <div className="pg-ritratto-vuoto" aria-hidden="true">
            <span className="pg-ritratto-emoji">{cl.emoji}</span>
          </div>
        )}

        <span className={`pg-badge pg-badge-${s.style}`}>
          {s.style === 'goofy' ? '🎭' : '🎯'}
        </span>

        <div className="pg-velo">
          <h3>{s.name}</h3>
          <p>{cl.emoji} {s.klass} · {s.race}</p>
        </div>
      </div>

      <div className="pg-corpo">
        <p className="pg-blurb">{s.blurb}</p>
        <div className="pg-tag">
          <span className="tag">{s.role_tag}</span>
          <span className={`tag tag-${s.difficulty}`}>
            {s.difficulty === 'facile' ? 'Per chi inizia'
              : s.difficulty === 'difficile' ? 'Per esperti' : 'Intermedio'}
          </span>
        </div>
        <button className="pg-btn" onClick={onScarica} disabled={scaricando}>
          {scaricando ? 'Preparo la pergamena…' : '📜 Scarica la scheda'}
        </button>
      </div>
    </article>
  );
}

/* -------------------------------------------------------------- questionario */
function Questionario({ passo, esito, risposte, onRispondi, onIndietro,
                        onChiudi, onRicomincia, onScegli, quantiPer }) {
  const d = DOMANDE[passo];

  return (
    <div className="pg-modale" role="dialog" aria-modal="true" onClick={onChiudi}>
      <div className="pg-modale-box" onClick={(e) => e.stopPropagation()}>
        <button className="pg-chiudi" onClick={onChiudi} aria-label="Chiudi">×</button>

        {!esito ? (
          <>
            <p className="pg-passo">Domanda {passo + 1} di {DOMANDE.length}</p>
            <div className="pg-barra"><div style={{ width: `${(passo / DOMANDE.length) * 100}%` }} /></div>

            <h2>{d.testo}</h2>
            {d.nota && <p className="pg-nota">{d.nota}</p>}

            <div className="pg-opzioni">
              {d.opzioni.map((o) => (
                <button key={o.id} className={`pg-opzione ${risposte[d.id] === o.id ? 'scelta' : ''}`}
                        onClick={() => onRispondi(d, o)}>
                  <span className="pg-opzione-emoji">{o.emoji}</span>
                  <span>{o.testo}</span>
                </button>
              ))}
            </div>

            {passo > 0 && (
              <button className="pg-indietro" onClick={onIndietro}>← Torna indietro</button>
            )}
          </>
        ) : (
          <>
            <p className="pg-passo">Il consiglio del taverniere</p>
            <h2>Tre strade fanno per te</h2>
            <p className="pg-nota">
              Non c'è una risposta sbagliata: scegli quella che ti somiglia di più.
            </p>

            <ol className="pg-risultati">
              {esito.top3.map(({ classe }, i) => {
                const c = CLASSI[classe];
                const n = quantiPer(classe, esito.stile);
                return (
                  <li key={classe} className={i === 0 ? 'primo' : ''}>
                    <div className="pg-ris-testa">
                      <span className="pg-ris-emoji">{c.emoji}</span>
                      <div>
                        <h3>{classe}{i === 0 && <em> — la più adatta a te</em>}</h3>
                        <p className="pg-ris-tag">{c.tag}</p>
                      </div>
                    </div>
                    <p className="pg-ris-desc">{c.desc}</p>
                    <button className="pg-btn" onClick={() => onScegli(classe, esito.stile)}>
                      {n === 0
                        ? `Vedi i ${classe} disponibili`
                        : n === 1 ? 'Guarda questo eroe' : `Guarda i ${n} eroi disponibili`}
                    </button>
                  </li>
                );
              })}
            </ol>

            <button className="pg-indietro" onClick={onRicomincia}>↺ Rifai il questionario</button>
          </>
        )}
      </div>
    </div>
  );
}
