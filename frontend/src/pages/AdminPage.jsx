import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { shiftsAPI, locationsAPI, adminAPI } from '../services/api';

function getWeekStart(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}
function addDays(date, n) { const d = new Date(date); d.setDate(d.getDate() + n); return d; }
function fmtShortDate(date) { return date.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' }); }

// ── Stile comune per input admin ────────────────────────────────────────────
const IS = {
  width: '100%', padding: '9px 12px',
  backgroundColor: 'var(--bg-dark, #1a1008)',
  border: '1px solid var(--border, #4a2e10)',
  borderRadius: '7px', color: 'var(--text, #e8d5b7)',
  fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box',
};

// ═══════════════════════════════════════════════════════════════════════════════
// Sezione: Sessioni
// ═══════════════════════════════════════════════════════════════════════════════
function SessionsSection({ locations }) {
  const [showForm, setShowForm] = useState(false);
  const [repeat, setRepeat] = useState(false);
  const [weeks, setWeeks] = useState(4);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    location_id: '',
    date: '',
    start_hour: '09:00',
    duration: 2,
    required_count: 1,
    has_pizza: false,    // 🍕 NUOVO CAMPO
  });

  const [allSessions, setAllSessions] = useState([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [weekStart, setWeekStart] = useState(() => getWeekStart(new Date()));
  const [editingSession, setEditingSession] = useState(null);
  const [editData, setEditData] = useState({});
  const [savingEdit, setSavingEdit] = useState(false);

  useEffect(() => {
    if (locations.length > 0 && !formData.location_id) {
      setFormData(p => ({ ...p, location_id: String(locations[0].id) }));
    }
  }, [locations]);

  const loadSessions = useCallback(async () => {
    setSessionsLoading(true);
    try { const res = await shiftsAPI.getShifts(); setAllSessions(res.data); }
    catch { /* silent */ }
    finally { setSessionsLoading(false); }
  }, []);

  useEffect(() => { loadSessions(); }, [loadSessions]);
  useEffect(() => { adminAPI.fixFutureShifts().catch(() => {}); }, []);

  const startEditSession = (s) => {
    const start = new Date(s.start_time), end = new Date(s.end_time);
    const durationHrs = (end - start) / (1000 * 60 * 60);
    const pad = n => String(n).padStart(2, '0');
    setEditingSession(s.id);
    setEditData({
      location_id: String(s.location_id),
      date: `${start.getFullYear()}-${pad(start.getMonth() + 1)}-${pad(start.getDate())}`,
      start_hour: `${pad(start.getHours())}:${pad(start.getMinutes())}`,
      duration: durationHrs,
      required_count: s.required_count || 1,
      has_pizza: !!s.has_pizza,
    });
  };

  const handleEditChange = (e) => {
    const { name, value, type, checked } = e.target;
    setEditData(p => ({
      ...p,
      [name]: type === 'checkbox' ? checked : (['required_count', 'duration'].includes(name) ? parseFloat(value) : value),
    }));
  };

  const handleEditSave = async (sessionId) => {
    setSavingEdit(true);
    try {
      const [year, month, day] = editData.date.split('-').map(Number);
      const [hours, minutes] = editData.start_hour.split(':').map(Number);
      const start = new Date(year, month - 1, day, hours, minutes, 0);
      const end = new Date(start.getTime() + editData.duration * 3600000);
      await shiftsAPI.updateShift(sessionId, {
        location_id: editData.location_id,
        start_time: start.toISOString(),
        end_time: end.toISOString(),
        required_count: editData.required_count,
        has_pizza: editData.has_pizza,
      });
      setEditingSession(null);
      await loadSessions();
    } catch (err) {
      alert(err.response?.data?.error || 'Errore nel salvataggio');
    } finally { setSavingEdit(false); }
  };

  const handleCancelSession = async (s) => {
    const action = s.cancelled ? 'riattivare' : 'annullare';
    if (!confirm(`Vuoi ${action} la sessione del ${fmtDay(s.start_time)} a ${s.location_name}?`)) return;
    try { await shiftsAPI.cancelShift(s.id); await loadSessions(); }
    catch (err) { alert(err.response?.data?.error || `Errore`); }
  };

  const handleDeleteSession = async (sessionId) => {
    if (!confirm("Eliminare questa sessione? L'operazione non è reversibile.")) return;
    try { await shiftsAPI.deleteShift(sessionId); await loadSessions(); }
    catch (err) { alert(err.response?.data?.error || "Errore nell'eliminazione"); }
  };

  const weekEnd = addDays(weekStart, 6);
  const weekSessions = allSessions.filter(s => {
    const d = new Date(s.start_time);
    return d >= weekStart && d <= new Date(weekEnd.getFullYear(), weekEnd.getMonth(), weekEnd.getDate(), 23, 59, 59);
  }).sort((a, b) => new Date(a.start_time) - new Date(b.start_time));

  const prevWeek = () => setWeekStart(w => addDays(w, -7));
  const nextWeek = () => setWeekStart(w => addDays(w, 7));
  const goCurrentWeek = () => setWeekStart(getWeekStart(new Date()));
  const isCurrentWeek = getWeekStart(new Date()).getTime() === weekStart.getTime();

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(p => ({
      ...p,
      [name]: type === 'checkbox' ? checked : (['required_count', 'duration'].includes(name) ? parseFloat(value) : value),
    }));
  };

  const buildSession = (offsetDays = 0) => {
    const [year, month, day] = formData.date.split('-').map(Number);
    const [hours, minutes] = formData.start_hour.split(':').map(Number);
    const start = new Date(year, month - 1, day + offsetDays * 7, hours, minutes, 0);
    const end = new Date(start.getTime() + formData.duration * 60 * 60 * 1000);
    return {
      location_id: formData.location_id,
      start_time: start.toISOString(),
      end_time: end.toISOString(),
      required_count: formData.required_count,
      has_pizza: formData.has_pizza,
    };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.date) { alert('Seleziona una data'); return; }
    setSubmitting(true);
    try {
      const count = repeat ? weeks : 1;
      const targets = Array.from({ length: count }, (_, i) => buildSession(i));
      await Promise.all(targets.map(t => shiftsAPI.createShift(t)));
      alert(`✅ ${targets.length} sessione/i creata/e!`);
      setShowForm(false);
      setFormData(p => ({ ...p, date: '', start_hour: '09:00', duration: 2, required_count: 1, has_pizza: false }));
      await loadSessions();
    } catch (err) {
      alert(err.response?.data?.error || 'Errore nella creazione della sessione');
    } finally { setSubmitting(false); }
  };

  const fmt = dt => new Date(dt).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
  const fmtDay = dt => new Date(dt).toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'short' });

  const cardSty = { background: 'var(--bg-card, #231508)', border: '1px solid var(--border, #4a2e10)', borderRadius: '10px', padding: '20px', marginBottom: '20px' };
  const btnGold = { background: 'linear-gradient(135deg, #c9a227, #e6c44a)', color: '#0f0a05', border: '1px solid #7a5f14', borderRadius: '7px', fontFamily: 'Cinzel, serif', fontWeight: 700, fontSize: '0.82rem', padding: '8px 16px', cursor: 'pointer' };
  const btnGreen = { ...btnGold, background: 'linear-gradient(135deg, #1a5c2e, #22763b)', color: '#e8d5b7', border: '1px solid rgba(26,92,46,0.6)' };
  const btnGray = { background: 'rgba(74,46,16,0.3)', color: '#a89070', border: '1px solid #4a2e10', borderRadius: '7px', padding: '8px 14px', cursor: 'pointer', fontSize: '0.82rem' };

  return (
    <div>
      {/* ── Crea sessione ── */}
      <div style={cardSty}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 style={{ margin: 0, fontFamily: 'Cinzel, serif', color: '#c9a227', fontSize: '1.05rem' }}>⚔️ Sessioni</h2>
          <button onClick={() => setShowForm(!showForm)} style={showForm ? btnGray : btnGold}>
            {showForm ? '❌ Annulla' : '➕ Nuova Sessione'}
          </button>
        </div>

        {showForm && (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px', padding: '16px', background: 'var(--bg-dark)', borderRadius: '8px', border: '1px solid var(--border)' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontFamily: 'Cinzel, serif', color: '#a89070', marginBottom: '5px' }}>📍 Location</label>
              <select name="location_id" value={formData.location_id} onChange={handleChange} required style={IS}>
                {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontFamily: 'Cinzel, serif', color: '#a89070', marginBottom: '5px' }}>📅 Data</label>
                <input type="date" name="date" value={formData.date} onChange={handleChange} required style={IS} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontFamily: 'Cinzel, serif', color: '#a89070', marginBottom: '5px' }}>🕐 Ora inizio</label>
                <input type="time" name="start_hour" value={formData.start_hour} onChange={handleChange} required style={IS} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontFamily: 'Cinzel, serif', color: '#a89070', marginBottom: '5px' }}>⏱ Durata (ore)</label>
                <input type="number" name="duration" min="0.5" step="0.5" value={formData.duration} onChange={handleChange} required style={IS} />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontFamily: 'Cinzel, serif', color: '#a89070', marginBottom: '5px' }}>⚔️ Avventurieri minimi</label>
              <input type="number" name="required_count" min="1" value={formData.required_count} onChange={handleChange} style={{ ...IS, width: '140px' }} />
            </div>

            {/* 🍕 PIZZA TOGGLE */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', background: 'rgba(201,162,39,0.08)', border: '1px solid rgba(201,162,39,0.2)', borderRadius: '8px' }}>
              <input type="checkbox" id="has_pizza" name="has_pizza" checked={formData.has_pizza} onChange={handleChange}
                style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#c9a227' }} />
              <label htmlFor="has_pizza" style={{ fontFamily: 'Cinzel, serif', color: '#c9a227', fontSize: '0.9rem', cursor: 'pointer', userSelect: 'none' }}>
                🍕 Pizza inclusa in questa sessione
              </label>
            </div>

            {/* Ripetizione */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <input type="checkbox" id="repeat" checked={repeat} onChange={e => setRepeat(e.target.checked)} style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: '#c9a227' }} />
              <label htmlFor="repeat" style={{ fontFamily: 'Cinzel, serif', color: '#a89070', fontSize: '0.85rem', cursor: 'pointer' }}>Sessione ripetitiva (settimanale)</label>
            </div>
            {repeat && (
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontFamily: 'Cinzel, serif', color: '#a89070', marginBottom: '5px' }}>Numero di settimane</label>
                <input type="number" min="1" max="52" value={weeks} onChange={e => setWeeks(parseInt(e.target.value))} style={{ ...IS, width: '100px' }} />
                <p style={{ fontSize: '0.75rem', color: '#6b5035', marginTop: '4px' }}>Verranno create {weeks} sessioni.</p>
              </div>
            )}

            <button type="submit" disabled={submitting} style={{ ...btnGreen, padding: '11px', fontSize: '0.9rem', opacity: submitting ? 0.6 : 1 }}>
              {submitting ? 'Creazione in corso...' : `⚔️ Crea Sessione${repeat ? ` (×${weeks})` : ''}`}
            </button>
          </form>
        )}
      </div>

      {/* ── Lista sessioni settimana ── */}
      <div style={cardSty}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <h2 style={{ margin: 0, fontFamily: 'Cinzel, serif', color: '#c9a227', fontSize: '1rem' }}>📋 Sessioni della settimana</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <button onClick={prevWeek} style={{ ...btnGray, padding: '4px 10px' }}>‹</button>
            <span style={{ fontSize: '0.82rem', color: '#a89070', minWidth: '150px', textAlign: 'center', fontFamily: 'Cinzel, serif' }}>
              {fmtShortDate(weekStart)} – {fmtShortDate(weekEnd)}
            </span>
            <button onClick={nextWeek} style={{ ...btnGray, padding: '4px 10px' }}>›</button>
            {!isCurrentWeek && (
              <button onClick={goCurrentWeek} style={{ ...btnGold, padding: '4px 10px', fontSize: '0.75rem' }}>Questa sett.</button>
            )}
          </div>
        </div>

        {/* Legenda */}
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '12px', fontSize: '0.75rem', color: '#6b5035' }}>
          {[['#f87171','Nessun avventuriero'],['#86efac','1 avventuriero'],['#4ade80','Più avventurieri'],['#fbbf24','Annullata']].map(([color, label]) => (
            <span key={label} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: color, display: 'inline-block', opacity: 0.8 }} />
              {label}
            </span>
          ))}
        </div>

        {sessionsLoading ? (
          <p style={{ color: '#a89070', fontFamily: 'Cinzel, serif', textAlign: 'center', padding: '20px' }}>Caricamento...</p>
        ) : weekSessions.length === 0 ? (
          <p style={{ color: '#6b5035', textAlign: 'center', padding: '24px', fontFamily: 'Cinzel, serif' }}>Nessuna sessione questa settimana.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {weekSessions.map(s => {
              const isCancelled = !!s.cancelled;
              const n = s.assigned_count;
              const borderColor = isCancelled ? 'rgba(201,162,39,0.3)' : n === 0 ? 'rgba(139,26,26,0.5)' : n === 1 ? 'rgba(26,92,46,0.4)' : 'rgba(26,92,46,0.6)';
              const bgColor = isCancelled ? 'rgba(92,70,10,0.15)' : n === 0 ? 'rgba(139,26,26,0.1)' : n === 1 ? 'rgba(26,92,46,0.1)' : 'rgba(26,92,46,0.15)';

              if (editingSession === s.id) {
                return (
                  <div key={s.id} style={{ border: '1px solid rgba(201,162,39,0.4)', background: 'rgba(201,162,39,0.05)', borderRadius: '8px', padding: '12px' }}>
                    <p style={{ fontSize: '0.75rem', fontFamily: 'Cinzel, serif', color: '#c9a227', marginBottom: '10px' }}>✏️ Modifica sessione</p>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
                      <div style={{ gridColumn: '1/-1' }}>
                        <label style={{ fontSize: '0.72rem', color: '#a89070', fontFamily: 'Cinzel, serif' }}>Location</label>
                        <select name="location_id" value={editData.location_id} onChange={handleEditChange} style={{ ...IS, padding: '6px 10px', fontSize: '0.85rem', marginTop: '3px' }}>
                          {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                        </select>
                      </div>
                      {[['date','Data','date'],['start_hour','Ora inizio','time'],['duration','Durata (ore)','number'],['required_count','Avv. minimi','number']].map(([name,label,type]) => (
                        <div key={name}>
                          <label style={{ fontSize: '0.72rem', color: '#a89070', fontFamily: 'Cinzel, serif' }}>{label}</label>
                          <input type={type} name={name} value={editData[name]} onChange={handleEditChange}
                            min={type==='number'?'0.5':undefined} step={name==='duration'?'0.5':undefined}
                            style={{ ...IS, padding: '6px 10px', fontSize: '0.85rem', marginTop: '3px' }} />
                        </div>
                      ))}
                      {/* Pizza edit */}
                      <div style={{ gridColumn: '1/-1', display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                        <input type="checkbox" name="has_pizza" checked={!!editData.has_pizza} onChange={handleEditChange}
                          style={{ width: '16px', height: '16px', accentColor: '#c9a227' }} />
                        <label style={{ fontFamily: 'Cinzel, serif', color: '#c9a227', fontSize: '0.82rem' }}>🍕 Pizza inclusa</label>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button onClick={() => handleEditSave(s.id)} disabled={savingEdit} style={{ ...btnGold, padding: '6px 14px' }}>
                        {savingEdit ? 'Salvataggio...' : '✓ Salva'}
                      </button>
                      <button onClick={() => setEditingSession(null)} style={{ ...btnGray, padding: '6px 12px' }}>Annulla</button>
                    </div>
                  </div>
                );
              }

              return (
                <div key={s.id} style={{ border: `1px solid ${borderColor}`, background: bgColor, borderRadius: '8px', padding: '10px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px' }}>
                      <span style={{ fontFamily: 'Cinzel, serif', fontWeight: 700, fontSize: '0.88rem', color: isCancelled ? '#6b5035' : '#c9a227', textDecoration: isCancelled ? 'line-through' : 'none' }}>
                        {s.location_name}
                      </span>
                      <span style={{ fontSize: '0.7rem', padding: '1px 7px', borderRadius: '10px', background: 'rgba(74,46,16,0.4)', color: '#a89070' }}>
                        {isCancelled ? 'Annullata' : n === 0 ? 'Nessun avventuriero' : `${n}/${s.required_count} ✓`}
                      </span>
                      {s.has_pizza && <span className="pizza-badge">🍕</span>}
                    </div>
                    <p style={{ margin: 0, fontSize: '0.78rem', color: '#6b5035' }}>
                      {fmtDay(s.start_time)} · {fmt(s.start_time)}–{fmt(s.end_time)}
                    </p>
                    {(s.assigned_users || []).length > 0 && (
                      <p style={{ margin: '2px 0 0', fontSize: '0.72rem', color: '#6b5035' }}>⚔️ {s.assigned_users.join(', ')}</p>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: '4px', marginLeft: '8px', flexShrink: 0 }}>
                    {!isCancelled && (
                      <button onClick={() => startEditSession(s)} title="Modifica"
                        style={{ width: '30px', height: '30px', borderRadius: '6px', background: 'var(--bg-dark)', border: '1px solid var(--border)', cursor: 'pointer', fontSize: '0.85rem' }}>✏️</button>
                    )}
                    <button onClick={() => handleCancelSession(s)} title={isCancelled ? 'Riattiva' : 'Annulla sessione'}
                      style={{ width: '30px', height: '30px', borderRadius: '6px', background: 'var(--bg-dark)', border: '1px solid var(--border)', cursor: 'pointer', fontSize: '0.85rem' }}>
                      {isCancelled ? '↩️' : '🚫'}
                    </button>
                    <button onClick={() => handleDeleteSession(s.id)} title="Elimina"
                      style={{ width: '30px', height: '30px', borderRadius: '6px', background: 'var(--bg-dark)', border: '1px solid var(--border)', cursor: 'pointer', fontSize: '0.85rem' }}>🗑️</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Sezione: Eroi (ex Utenti)
// ═══════════════════════════════════════════════════════════════════════════════
function HeroesSection() {
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
  const [heroes, setHeroes] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try { const res = await adminAPI.getUsers(); setHeroes(res.data); }
    catch { alert('Errore nel caricamento eroi'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const toggleRole = async (hero) => {
    const newRole = hero.role === 'admin' ? 'volunteer' : 'admin';
    if (!confirm(`Cambia il ruolo di ${hero.name} a "${newRole === 'admin' ? 'Admin' : 'Avventuriero'}"?`)) return;
    try {
      await adminAPI.updateUserRole(hero.id, newRole);
      setHeroes(prev => prev.map(u => u.id === hero.id ? { ...u, role: newRole } : u));
    } catch (err) { alert(err.response?.data?.error || 'Errore nel cambio ruolo'); }
  };

  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '10px', padding: '20px' }}>
      <h2 style={{ fontFamily: 'Cinzel, serif', color: '#c9a227', margin: '0 0 16px', fontSize: '1.05rem' }}>🧙 Eroi registrati</h2>
      {loading ? <p style={{ color: '#a89070', fontFamily: 'Cinzel, serif' }}>Caricamento...</p> : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', fontSize: '0.88rem', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {['Nome', 'Email', 'Ruolo', 'Azione'].map(h => (
                  <th key={h} style={{ paddingBottom: '8px', paddingRight: '16px', textAlign: 'left', color: '#a89070', fontFamily: 'Cinzel, serif', fontSize: '0.72rem', letterSpacing: '1px' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {heroes.map(u => (
                <tr key={u.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '10px 16px 10px 0', fontWeight: 700, color: 'var(--text)' }}>{u.name}</td>
                  <td style={{ padding: '10px 16px 10px 0', color: '#a89070' }}>{u.email}</td>
                  <td style={{ padding: '10px 16px 10px 0' }}>
                    <span style={{
                      padding: '2px 10px', borderRadius: '10px', fontSize: '0.75rem', fontFamily: 'Cinzel, serif', fontWeight: 700,
                      background: u.role === 'admin' ? 'rgba(201,162,39,0.15)' : 'rgba(26,92,46,0.2)',
                      color: u.role === 'admin' ? '#c9a227' : '#4ade80',
                    }}>
                      {u.role === 'admin' ? '🛡️ Admin' : '⚔️ Avventuriero'}
                    </span>
                  </td>
                  <td style={{ padding: '10px 0' }}>
                    {u.id !== currentUser.id ? (
                      <button onClick={() => toggleRole(u)}
                        style={{ background: 'none', border: 'none', color: '#c9a227', cursor: 'pointer', fontSize: '0.82rem', textDecoration: 'underline', fontFamily: 'Cinzel, serif' }}>
                        {u.role === 'admin' ? '→ Avventuriero' : '→ Admin'}
                      </button>
                    ) : <span style={{ fontSize: '0.78rem', color: '#6b5035' }}>Tu</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Sezione: Statistiche
// ═══════════════════════════════════════════════════════════════════════════════
function StatsSection() {
  const [stats, setStats] = useState([]);
  const [shiftStats, setShiftStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(String(currentYear));
  const [month, setMonth] = useState('');
  const MONTHS = [
    {value:'1',label:'Gennaio'},{value:'2',label:'Febbraio'},{value:'3',label:'Marzo'},
    {value:'4',label:'Aprile'},{value:'5',label:'Maggio'},{value:'6',label:'Giugno'},
    {value:'7',label:'Luglio'},{value:'8',label:'Agosto'},{value:'9',label:'Settembre'},
    {value:'10',label:'Ottobre'},{value:'11',label:'Novembre'},{value:'12',label:'Dicembre'},
  ];

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (year) params.year = year;
      if (month) params.month = month;
      const [resUsers, resShifts] = await Promise.all([adminAPI.getStats(params), adminAPI.getShiftStats(params)]);
      setStats(resUsers.data);
      setShiftStats(resShifts.data);
    } catch { alert('Errore nel caricamento statistiche'); }
    finally { setLoading(false); }
  }, [year, month]);
  useEffect(() => { load(); }, [load]);

  const cardSty = { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '10px', padding: '20px', marginBottom: '16px' };
  const selSty = { ...IS, width: 'auto', padding: '6px 12px' };

  return (
    <div>
      <div style={cardSty}>
        <h2 style={{ fontFamily: 'Cinzel, serif', color: '#c9a227', margin: '0 0 16px', fontSize: '1.05rem' }}>📊 Statistiche</h2>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.72rem', fontFamily: 'Cinzel, serif', color: '#a89070', marginBottom: '4px' }}>Anno</label>
            <select value={year} onChange={e => setYear(e.target.value)} style={selSty}>
              <option value="">Tutti</option>
              {Array.from({length: 5}, (_,i) => String(currentYear-i)).map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.72rem', fontFamily: 'Cinzel, serif', color: '#a89070', marginBottom: '4px' }}>Mese</label>
            <select value={month} onChange={e => setMonth(e.target.value)} style={selSty}>
              <option value="">Tutti</option>
              {MONTHS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <div style={cardSty}><p style={{ color: '#a89070', fontFamily: 'Cinzel, serif' }}>Caricamento...</p></div>
      ) : (
        <>
          {shiftStats && (
            <div style={cardSty}>
              <h3 style={{ fontFamily: 'Cinzel, serif', color: '#a89070', fontSize: '0.85rem', margin: '0 0 12px', letterSpacing: '1px' }}>📋 Riepilogo sessioni nel periodo</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                {[
                  { label: 'Sessioni totali', val: shiftStats.total_shifts, color: '#e8d5b7', bg: 'rgba(74,46,16,0.3)' },
                  { label: 'Sessioni attive', val: shiftStats.active_shifts, color: '#4ade80', bg: 'rgba(26,92,46,0.2)' },
                  { label: 'Annullate', val: shiftStats.cancelled_shifts, color: '#fbbf24', bg: 'rgba(92,70,10,0.2)' },
                ].map(({label, val, color, bg}) => (
                  <div key={label} style={{ textAlign: 'center', padding: '12px', background: bg, borderRadius: '8px' }}>
                    <div style={{ fontSize: '1.8rem', fontWeight: 900, color, fontFamily: 'Cinzel, serif' }}>{val}</div>
                    <div style={{ fontSize: '0.72rem', color: '#a89070', marginTop: '4px' }}>{label}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={cardSty}>
            <h3 style={{ fontFamily: 'Cinzel, serif', color: '#a89070', fontSize: '0.85rem', margin: '0 0 12px', letterSpacing: '1px' }}>⚔️ Sessioni per avventuriero</h3>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', fontSize: '0.85rem', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    {['#','Avventuriero','Prenotazioni','Attive','Annullate','Ore totali'].map(h => (
                      <th key={h} style={{ paddingBottom: '8px', paddingRight: '12px', textAlign: h==='#'?'left':'center', color: '#a89070', fontFamily: 'Cinzel, serif', fontSize: '0.7rem', letterSpacing: '1px' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {stats.map((s, i) => (
                    <tr key={s.id} style={{ borderBottom: '1px solid rgba(74,46,16,0.3)', opacity: s.total_bookings === 0 ? 0.5 : 1 }}>
                      <td style={{ padding: '8px 12px 8px 0', color: '#6b5035' }}>{i+1}</td>
                      <td style={{ padding: '8px 12px 8px 0' }}>
                        <div style={{ fontWeight: 700, color: 'var(--text)' }}>{s.name}</div>
                        <div style={{ fontSize: '0.72rem', color: '#6b5035' }}>{s.email}</div>
                      </td>
                      <td style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 700, color: '#e8d5b7' }}>{s.total_bookings}</td>
                      <td style={{ padding: '8px 12px', textAlign: 'center', color: '#4ade80', fontWeight: 600 }}>{s.active_bookings}</td>
                      <td style={{ padding: '8px 12px', textAlign: 'center', color: '#f87171' }}>{s.cancelled_bookings}</td>
                      <td style={{ padding: '8px 0', textAlign: 'center', color: '#c9a227', fontWeight: 700, fontFamily: 'Cinzel, serif' }}>{s.total_hours}h</td>
                    </tr>
                  ))}
                  {stats.length === 0 && (
                    <tr><td colSpan={6} style={{ padding: '20px', textAlign: 'center', color: '#6b5035', fontFamily: 'Cinzel, serif' }}>Nessun dato disponibile</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Sezione: Locations
// ═══════════════════════════════════════════════════════════════════════════════
function LocationsSection() {
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ name: '', address: '' });

  const load = useCallback(async () => {
    try { const res = await locationsAPI.getLocations(); setLocations(res.data); }
    catch { alert('Errore nel caricamento locations'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const startEdit = (loc) => { setEditingId(loc.id); setFormData({ name: loc.name, address: loc.address || '' }); setShowForm(true); };
  const startNew = () => { setEditingId(null); setFormData({ name: '', address: '' }); setShowForm(true); };
  const cancel = () => { setShowForm(false); setEditingId(null); setFormData({ name: '', address: '' }); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) await locationsAPI.updateLocation(editingId, formData);
      else await locationsAPI.createLocation(formData);
      await load(); cancel();
    } catch (err) { alert(err.response?.data?.error || 'Errore nel salvataggio'); }
  };

  const cardSty = { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '10px', padding: '20px' };
  const btnGold = { background: 'linear-gradient(135deg, #c9a227, #e6c44a)', color: '#0f0a05', border: '1px solid #7a5f14', borderRadius: '7px', fontFamily: 'Cinzel, serif', fontWeight: 700, fontSize: '0.82rem', padding: '8px 16px', cursor: 'pointer' };
  const btnGray = { background: 'rgba(74,46,16,0.3)', color: '#a89070', border: '1px solid #4a2e10', borderRadius: '7px', padding: '8px 14px', cursor: 'pointer', fontSize: '0.82rem' };

  return (
    <div style={cardSty}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h2 style={{ fontFamily: 'Cinzel, serif', color: '#c9a227', margin: 0, fontSize: '1.05rem' }}>📍 Locations</h2>
        {!showForm && <button onClick={startNew} style={btnGold}>➕ Aggiungi Location</button>}
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px', padding: '14px', background: 'var(--bg-dark)', borderRadius: '8px', border: '1px solid var(--border)' }}>
          <h3 style={{ fontFamily: 'Cinzel, serif', color: '#a89070', margin: '0 0 6px', fontSize: '0.88rem' }}>
            {editingId ? 'Modifica Location' : 'Nuova Location'}
          </h3>
          <input type="text" value={formData.name} onChange={e => setFormData(p => ({ ...p, name: e.target.value }))}
            required placeholder="es. Libreria Scamamu" style={IS} />
          <input type="text" value={formData.address} onChange={e => setFormData(p => ({ ...p, address: e.target.value }))}
            placeholder="es. Via Dergano 1, Milano" style={IS} />
          <div style={{ display: 'flex', gap: '8px' }}>
            <button type="submit" style={btnGold}>{editingId ? 'Salva modifiche' : '➕ Aggiungi'}</button>
            <button type="button" onClick={cancel} style={btnGray}>Annulla</button>
          </div>
        </form>
      )}

      {loading ? <p style={{ color: '#a89070', fontFamily: 'Cinzel, serif' }}>Caricamento...</p>
        : locations.length === 0 ? <p style={{ color: '#6b5035', fontFamily: 'Cinzel, serif' }}>Nessuna location. Aggiungine una!</p>
        : (
          <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            {locations.map(loc => (
              <li key={loc.id} style={{ padding: '12px 0', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontWeight: 700, color: '#c9a227', fontFamily: 'Cinzel, serif', fontSize: '0.9rem' }}>{loc.name}</div>
                  {loc.address && <div style={{ fontSize: '0.82rem', color: '#a89070', marginTop: '2px' }}>{loc.address}</div>}
                </div>
                <button onClick={() => startEdit(loc)} style={{ background: 'none', border: 'none', color: '#c9a227', cursor: 'pointer', fontSize: '0.82rem', textDecoration: 'underline', fontFamily: 'Cinzel, serif' }}>
                  ✏️ Modifica
                </button>
              </li>
            ))}
          </ul>
        )
      }
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// AdminPage principale
// ═══════════════════════════════════════════════════════════════════════════════
export default function AdminPage() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const [tab, setTab] = useState('sessioni');
  const [locations, setLocations] = useState([]);

  useEffect(() => {
    locationsAPI.getLocations().then(res => setLocations(res.data)).catch(() => {});
  }, []);

  if (user.role !== 'admin') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-dark)' }}>
        <div style={{ textAlign: 'center' }}>
          <h1 style={{ fontFamily: 'Cinzel, serif', color: '#f87171' }}>❌ Accesso negato</h1>
          <button onClick={() => navigate('/dashboard')} style={{ background: 'linear-gradient(135deg, #c9a227, #e6c44a)', color: '#0f0a05', border: 'none', borderRadius: '8px', padding: '10px 20px', fontFamily: 'Cinzel, serif', fontWeight: 700, cursor: 'pointer' }}>
            Torna alla Dashboard
          </button>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'sessioni', label: '⚔️ Sessioni' },
    { id: 'eroi', label: '🧙 Eroi' },
    { id: 'statistiche', label: '📊 Statistiche' },
    { id: 'locations', label: '📍 Locations' },
  ];

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-dark, #1a1008)' }}>
      <header style={{ background: 'linear-gradient(180deg, #0f0a05, #1a1008)', borderBottom: '2px solid #4a2e10', boxShadow: '0 2px 16px rgba(0,0,0,0.6)' }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1 style={{ margin: 0, fontFamily: 'Cinzel, serif', color: '#c9a227', fontSize: '1.05rem' }}>🛡️ Pannello Admin</h1>
          <button onClick={() => navigate('/dashboard')} style={{ background: 'none', border: 'none', color: '#c9a227', cursor: 'pointer', fontFamily: 'Cinzel, serif', fontSize: '0.85rem', textDecoration: 'underline' }}>
            ← Dashboard
          </button>
        </div>
        <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '0 16px', display: 'flex', gap: '2px', overflowX: 'auto' }}>
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              padding: '10px 18px', fontSize: '0.82rem', fontFamily: 'Cinzel, serif', fontWeight: 600,
              background: 'none', border: 'none', borderBottom: `2px solid ${tab === t.id ? '#c9a227' : 'transparent'}`,
              color: tab === t.id ? '#c9a227' : '#a89070', cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.2s',
            }}>
              {t.label}
            </button>
          ))}
        </div>
      </header>

      <main style={{ maxWidth: '1000px', margin: '0 auto', padding: '20px 16px' }}>
        {tab === 'sessioni' && <SessionsSection locations={locations} />}
        {tab === 'eroi' && <HeroesSection />}
        {tab === 'statistiche' && <StatsSection />}
        {tab === 'locations' && <LocationsSection />}
      </main>
    </div>
  );
}
