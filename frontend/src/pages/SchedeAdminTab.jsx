// ============================================================================
//  Sezione: Schede — decide chi vede quali personaggi
//  Stesse convenzioni delle altre sezioni di AdminPage: stili inline,
//  cardSty / btnGold, titolo in Titan One, variabili CSS --bg-card e --border.
// ============================================================================
import { useState, useEffect, useCallback } from 'react';
import { sheetsAPI, groupsAPI, adminAPI } from '../services/api';

const cardSty = { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '10px', padding: '20px' };
const btnGold = { background: 'linear-gradient(135deg, #b0801a, #c99a35)', color: '#fffbf2', border: '1px solid #b0801a', borderRadius: '7px', fontFamily: 'Atkinson Hyperlegible, system-ui, sans-serif', fontWeight: 700, fontSize: '0.85rem', padding: '10px 20px', cursor: 'pointer' };
const btnGray = { background: 'none', color: '#8a7f6c', border: '1px solid var(--border)', borderRadius: '7px', fontFamily: 'Atkinson Hyperlegible, system-ui, sans-serif', fontWeight: 700, fontSize: '0.85rem', padding: '10px 20px', cursor: 'pointer' };
const thSty = { textAlign: 'left', padding: '8px 6px', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#8a7f6c', fontWeight: 700 };
const tdSty = { padding: '10px 6px', verticalAlign: 'top', fontSize: '0.85rem' };
const selSty = { minWidth: 140, fontFamily: 'Atkinson Hyperlegible, system-ui, sans-serif', fontSize: '0.8rem' };

export default function SchedeAdminTab() {
  const [sheets, setSheets] = useState([]);
  const [groups, setGroups] = useState([]);
  const [heroes, setHeroes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [sRes, gRes, hRes] = await Promise.all([
        sheetsAPI.getSheets(), groupsAPI.getGroups(), adminAPI.getUsers(),
      ]);
      setSheets(sRes.data);
      setGroups(gRes.data);
      setHeroes(hRes.data);
    } catch { alert('Errore nel caricamento delle schede'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const avvisa = (t) => { setMsg(t); setTimeout(() => setMsg(''), 2600); };

  const toggleVisibile = async (s, aperta) => {
    try {
      await sheetsAPI.update(s.id, { visible_to_all: aperta });
      setSheets(p => p.map(x => (x.id === s.id ? { ...x, visible_to_all: aperta } : x)));
      avvisa(aperta ? `"${s.name}" e' visibile a tutti` : `"${s.name}" e' tornata riservata`);
    } catch (err) { alert(err.response?.data?.error || 'Errore nel salvataggio'); }
  };

  const cambiaStile = async (s, style) => {
    try {
      await sheetsAPI.update(s.id, { style });
      setSheets(p => p.map(x => (x.id === s.id ? { ...x, style } : x)));
      avvisa('Abbinamento aggiornato');
    } catch (err) { alert(err.response?.data?.error || 'Errore nel salvataggio'); }
  };

  const cambiaGruppi = async (s, ids) => {
    try {
      await sheetsAPI.setGroups(s.id, ids);
      setSheets(p => p.map(x => (x.id === s.id
        ? { ...x, groups: groups.filter(g => ids.includes(g.id)) } : x)));
      avvisa('Gruppi aggiornati');
    } catch (err) { alert(err.response?.data?.error || 'Errore nel salvataggio'); }
  };

  const cambiaEroi = async (s, ids) => {
    try {
      await sheetsAPI.setUsers(s.id, ids);
      setSheets(p => p.map(x => (x.id === s.id
        ? { ...x, users: heroes.filter(h => ids.includes(h.id)) } : x)));
      avvisa('Eroi autorizzati aggiornati');
    } catch (err) { alert(err.response?.data?.error || 'Errore nel salvataggio'); }
  };

  const tutte = async (aperta) => {
    try {
      await sheetsAPI.bulkVisibility(sheets.map(s => s.id), aperta);
      setSheets(p => p.map(x => ({ ...x, visible_to_all: aperta })));
      avvisa(aperta ? 'Tutte le schede sono visibili' : 'Tutte le schede sono chiuse');
    } catch (err) { alert(err.response?.data?.error || 'Errore nel salvataggio'); }
  };

  const multi = (e) => Array.from(e.target.selectedOptions).map(o => Number(o.value));

  return (
    <div style={cardSty}>
      <h2 style={{ fontFamily: 'Titan One, Luckiest Guy, fantasy', color: '#b0801a', margin: '0 0 6px', fontSize: '1.05rem' }}>
        🎭 Schede personaggio
      </h2>
      <p style={{ fontSize: '0.78rem', color: '#8a7f6c', margin: '0 0 14px', lineHeight: 1.5 }}>
        Un eroe vede una scheda se e' <strong>aperta a tutti</strong>, oppure se appartiene a
        un <strong>gruppo autorizzato</strong>, oppure se lo hai <strong>autorizzato di persona</strong>.
        Di default sono tutte chiuse. La pagina pubblica e' <code>/personaggi</code>.
      </p>

      {loading ? (
        <p style={{ color: '#8a7f6c', fontSize: '0.85rem' }}>Caricamento schede...</p>
      ) : (
        <>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '16px' }}>
            <button onClick={() => tutte(true)} style={btnGold}>👁 Apri tutte</button>
            <button onClick={() => tutte(false)} style={btnGray}>🔒 Chiudi tutte</button>
            {msg && <span style={{ color: '#2b6663', fontSize: '0.85rem', fontWeight: 700 }}>✅ {msg}</span>}
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={thSty}>Personaggio</th>
                  <th style={thSty}>Tutti</th>
                  <th style={thSty}>Abbinamento</th>
                  <th style={thSty}>Gruppi</th>
                  <th style={thSty}>Eroi</th>
                </tr>
              </thead>
              <tbody>
                {sheets.map(s => (
                  <tr key={s.id} style={{ borderTop: '1px solid var(--border)' }}>
                    <td style={tdSty}>
                      <strong>{s.name}</strong><br />
                      <span style={{ fontSize: '0.75rem', color: '#8a7f6c' }}>{s.klass} · {s.race}</span>
                    </td>
                    <td style={tdSty}>
                      <input type="checkbox" checked={!!s.visible_to_all}
                             onChange={e => toggleVisibile(s, e.target.checked)}
                             style={{ width: 18, height: 18, cursor: 'pointer' }} />
                    </td>
                    <td style={tdSty}>
                      <select value={s.style} onChange={e => cambiaStile(s, e.target.value)}
                              style={{ fontFamily: 'Atkinson Hyperlegible, system-ui, sans-serif', fontSize: '0.8rem', padding: '5px' }}>
                        <option value="power">🎯 Ottimizzato</option>
                        <option value="goofy">🎭 Bizzarro</option>
                      </select>
                    </td>
                    <td style={tdSty}>
                      <select multiple size={3} disabled={s.visible_to_all}
                              value={(s.groups || []).map(g => String(g.id))}
                              onChange={e => cambiaGruppi(s, multi(e))}
                              style={{ ...selSty, opacity: s.visible_to_all ? 0.45 : 1 }}>
                        {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                      </select>
                    </td>
                    <td style={tdSty}>
                      <select multiple size={3} disabled={s.visible_to_all}
                              value={(s.users || []).map(u => String(u.id))}
                              onChange={e => cambiaEroi(s, multi(e))}
                              style={{ ...selSty, opacity: s.visible_to_all ? 0.45 : 1 }}>
                        {heroes.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p style={{ fontSize: '0.75rem', color: '#8a7f6c', marginTop: '14px', lineHeight: 1.5 }}>
            Tieni premuto Ctrl (Cmd su Mac) per selezionare piu' gruppi o piu' eroi.
            I menu si disattivano quando la scheda e' aperta a tutti: in quel caso
            l'autorizzazione puntuale non serve.
          </p>
        </>
      )}
    </div>
  );
}
