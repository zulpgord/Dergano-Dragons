import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { shiftsAPI, assignmentsAPI } from '../services/api';

// ── Header logo fantasy: dado SX + drago DX ─────────────────────────────────
function DerganoHeader() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', height: '54px' }}>

      {/* DADO — logo testuale compatto */}
      <img
        src="/dado.png"
        alt="Dergano & Dragons"
        style={{
          height: '52px', width: 'auto', objectFit: 'contain',
          filter: 'drop-shadow(0 0 6px rgba(201,162,39,0.3)) brightness(1.05)',
        }}
      />

      {/* Separatore verticale */}
      <div style={{ width: '1px', height: '32px', background: '#4a2e10', margin: '0 6px', flexShrink: 0 }} />

      {/* DRAGO — illustrazione piccola */}
      <img
        src="/drago.png"
        alt="Drago"
        style={{
          height: '54px', width: 'auto', objectFit: 'contain',
          /* invert per dark bg */
          filter: 'invert(1) brightness(0.88) drop-shadow(0 0 4px rgba(201,162,39,0.15))',
        }}
      />

      {/* Etichetta SESSION MANAGER */}
      <div style={{
        fontFamily: 'Cinzel, serif', fontSize: '0.55rem', color: '#a89070',
        letterSpacing: '3px', paddingLeft: '8px', lineHeight: 1.4,
        borderLeft: '1px solid #4a2e10', marginLeft: '4px',
      }}>
        SESSION<br/>MANAGER
      </div>

    </div>
  );
}

// ── Colori in base allo stato della sessione ─────────────────────────────────
function getSessionColors(session, isMySession) {
  if (session.cancelled) return {
    cell: 'bg-yellow-100 text-yellow-600',
    card: 'border-yellow-200 bg-yellow-50 opacity-75',
    badge: 'bg-yellow-200 text-yellow-700',
  };
  if (isMySession) return {
    cell: 'bg-blue-100 text-blue-800',
    card: 'border-blue-200 bg-blue-50',
    badge: 'bg-blue-200 text-blue-800',
  };
  if (session.assigned_count === 0) return {
    cell: 'bg-red-100 text-red-800',
    card: 'border-red-200 bg-red-50',
    badge: 'bg-red-200 text-red-800',
  };
  if (session.assigned_count < session.required_count) return {
    cell: 'bg-green-100 text-green-700',
    card: 'border-green-100 bg-green-50',
    badge: 'bg-green-100 text-green-700',
  };
  return {
    cell: 'bg-green-300 text-green-900',
    card: 'border-green-300 bg-green-100',
    badge: 'bg-green-300 text-green-900',
  };
}

// ── Modale sessione ──────────────────────────────────────────────────────────
function SessionModal({ session, userAssignments, onClose, onAssign, onCancel }) {
  if (!session) return null;
  const fmt = (dt) => new Date(dt).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
  const fmtDate = (dt) => new Date(dt).toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const myAssignment = userAssignments.find(a => a.shift_id === session.id && a.status === 'assigned');
  const isAssigned = !!myAssignment;
  const fullyC = session.assigned_count >= session.required_count;
  const partial = session.assigned_count > 0 && session.assigned_count < session.required_count;
  const assignedUsers = session.assigned_users || [];
  const [isBooking, setIsBooking] = useState(false);

  const statusLabel = session.cancelled ? 'Annullata'
    : isAssigned ? '✓ Sei registrato'
    : fullyC ? 'Completa'
    : partial ? 'Parzialmente coperta'
    : 'Senza avventurieri';

  const statusColor = session.cancelled ? 'bg-yellow-100 text-yellow-700'
    : isAssigned ? 'bg-blue-100 text-blue-800'
    : fullyC ? 'bg-green-300 text-green-900'
    : partial ? 'bg-green-100 text-green-700'
    : 'bg-red-100 text-red-800';

  const countColor = session.cancelled ? 'text-yellow-600'
    : isAssigned ? 'text-blue-700'
    : fullyC ? 'text-green-700'
    : partial ? 'text-yellow-700'
    : 'text-red-600';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.75)' }}
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'var(--bg-card, #231508)',
          border: '1px solid var(--border-gold, #7a5f14)',
          borderRadius: '12px',
          boxShadow: '0 0 30px rgba(201,162,39,0.15), 0 8px 32px rgba(0,0,0,0.8)',
          width: '100%',
          maxWidth: '380px',
          padding: '1.5rem',
        }}
      >
        {session.cancelled && (
          <div style={{ marginBottom: '12px', padding: '10px', background: 'rgba(139,26,26,0.2)', border: '1px solid rgba(139,26,26,0.4)', borderRadius: '8px', color: '#fbbf24', fontSize: '0.85rem', textAlign: 'center' }}>
            ⚠️ Questa sessione è stata annullata
          </div>
        )}

        {/* Header modale */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
          <div>
            <h2 style={{ fontFamily: 'Cinzel, serif', color: '#c9a227', margin: 0, fontSize: '1.1rem' }}>
              {session.location_name}
            </h2>
            {session.has_pizza && (
              <span className="pizza-badge" style={{ marginTop: '4px', display: 'inline-flex' }}>
                🍕 Pizza inclusa
              </span>
            )}
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#a89070', cursor: 'pointer', fontSize: '1.4rem', lineHeight: 1 }}>×</button>
        </div>

        {/* Info sessione */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px', color: 'var(--text-muted, #a89070)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>📅</span>
            <span style={{ fontSize: '0.9rem', textTransform: 'capitalize' }}>{fmtDate(session.start_time)}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>🕐</span>
            <span style={{ fontSize: '0.9rem' }}>{fmt(session.start_time)} — {fmt(session.end_time)}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>⚔️</span>
            <span className={`text-sm font-semibold ${countColor}`}>
              {session.assigned_count} / {session.required_count} avventurieri
            </span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor}`}>
              {statusLabel}
            </span>
          </div>
        </div>

        {/* Lista avventurieri */}
        {assignedUsers.length > 0 && (
          <div style={{ marginBottom: '20px' }}>
            <p style={{ fontSize: '0.72rem', color: '#a89070', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '8px', fontFamily: 'Cinzel, serif' }}>
              Avventurieri
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {assignedUsers.map((name, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', color: 'var(--text, #e8d5b7)' }}>
                  <span style={{
                    width: '22px', height: '22px', borderRadius: '50%',
                    background: 'rgba(201,162,39,0.15)', border: '1px solid rgba(201,162,39,0.3)',
                    color: '#c9a227', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '0.75rem', fontWeight: 700, flexShrink: 0,
                  }}>
                    {name.charAt(0).toUpperCase()}
                  </span>
                  {name}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Azioni */}
        {session.cancelled ? (
          <div style={{ background: 'rgba(139,26,26,0.2)', border: '1px solid rgba(139,26,26,0.3)', borderRadius: '8px', padding: '12px', textAlign: 'center', color: '#fbbf24', fontSize: '0.85rem' }}>
            Questa sessione è stata annullata dall'organizzazione.
          </div>
        ) : isAssigned ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ background: 'rgba(26,52,96,0.3)', border: '1px solid rgba(26,52,96,0.5)', borderRadius: '8px', padding: '10px', textAlign: 'center', color: '#93c5fd', fontSize: '0.88rem', fontWeight: 600 }}>
              ✓ Sei registrato a questa sessione
            </div>
            <button
              onClick={() => { onCancel(myAssignment.id); onClose(); }}
              style={{ width: '100%', padding: '10px', background: 'rgba(139,26,26,0.2)', color: '#f87171', border: '1px solid rgba(139,26,26,0.4)', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '0.88rem' }}
            >
              Annulla partecipazione
            </button>
          </div>
        ) : (
          <button
            onClick={async () => { setIsBooking(true); try { await onAssign(session.id); onClose(); } catch(e) { setIsBooking(false); } }}
            disabled={isBooking}
            style={{
              width: '100%', padding: '11px',
              background: isBooking ? 'rgba(201,162,39,0.3)' : 'linear-gradient(135deg, #c9a227, #e6c44a)',
              color: '#0f0a05', border: '1px solid #7a5f14', borderRadius: '8px',
              fontFamily: 'Cinzel, serif', fontWeight: 700, fontSize: '0.9rem',
              letterSpacing: '0.5px', cursor: isBooking ? 'not-allowed' : 'pointer',
              boxShadow: isBooking ? 'none' : '0 0 10px rgba(201,162,39,0.3)',
            }}
          >
            {isBooking ? '⏳ Registrazione...' : '⚔️ Unisciti all\'avventura'}
          </button>
        )}
      </div>
    </div>
  );
}

// ── Costanti ─────────────────────────────────────────────────────────────────
const MONTHS_IT = ['Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno','Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre'];
const DAYS_IT = ['Lun','Mar','Mer','Gio','Ven','Sab','Dom'];

// ── DashboardPage ─────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const navigate = useNavigate();
  const [user] = useState(() => JSON.parse(localStorage.getItem('user') || '{}'));
  const [sessions, setSessions] = useState([]);
  const [userAssignments, setUserAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [viewMode, setViewMode] = useState('calendario');
  const [selectedSession, setSelectedSession] = useState(null);
  const [toast, setToast] = useState(null);
  const [bookingSessionId, setBookingSessionId] = useState(null);
  const [calMonth, setCalMonth] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });

  useEffect(() => {
    if (!user.id) { navigate('/auth'); return; }
    loadSessions();
  }, []);

  const loadSessions = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const [sessRes, assignRes] = await Promise.all([
        shiftsAPI.getShifts(),
        assignmentsAPI.getUserAssignments(),
      ]);
      setSessions(sessRes.data);
      setUserAssignments(assignRes.data);
    } catch (err) {
      setError('Errore nel caricamento');
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const showToast = (msg, duration = 3500) => {
    setToast(msg);
    setTimeout(() => setToast(null), duration);
  };

  const handleAssign = async (sessionId) => {
    setSessions(prev => prev.map(s => s.id === sessionId
      ? { ...s, assigned_count: s.assigned_count + 1, assigned_users: [...(s.assigned_users || []), user.name] }
      : s
    ));
    setUserAssignments(prev => [...prev, {
      id: -1,
      shift_id: sessionId,
      status: 'assigned',
      start_time: sessions.find(s => s.id === sessionId)?.start_time || '',
    }]);
    try {
      await assignmentsAPI.assignShift(sessionId);
      showToast('⚔️ Sei nell\'avventura!');
      loadSessions(true);
    } catch (err) {
      loadSessions(true);
      showToast('❌ ' + (err.response?.data?.error || 'Errore nella registrazione'));
      throw err;
    }
  };

  const handleCancel = async (assignmentId) => {
    if (!window.confirm('Abbandonare questa sessione?')) return;
    try {
      await assignmentsAPI.cancelAssignment(assignmentId);
      await loadSessions(true);
    } catch (err) {
      showToast('❌ ' + (err.response?.data?.error || 'Errore'));
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/auth');
  };

  const prevMonth = () => setCalMonth(({ year, month }) => month === 0 ? { year: year - 1, month: 11 } : { year, month: month - 1 });
  const nextMonth = () => setCalMonth(({ year, month }) => month === 11 ? { year: year + 1, month: 0 } : { year, month: month + 1 });
  const goToday = () => { const n = new Date(); setCalMonth({ year: n.getFullYear(), month: n.getMonth() }); };

  // ── Dati filtrati per mese ────────────────────────────────────────────────
  const monthSessions = sessions.filter(s => {
    const d = new Date(s.start_time);
    return d.getFullYear() === calMonth.year && d.getMonth() === calMonth.month;
  });
  const activeSessions = monthSessions.filter(s => !s.cancelled);
  const coveredCount = activeSessions.filter(s => s.assigned_count >= s.required_count).length;
  const partialCount = activeSessions.filter(s => s.assigned_count > 0 && s.assigned_count < s.required_count).length;
  const coveragePercent = activeSessions.length > 0
    ? Math.round((coveredCount + partialCount) / activeSessions.length * 100) : 0;
  const myMonthBookings = userAssignments.filter(a => {
    if (a.status !== 'assigned') return false;
    const d = new Date(a.start_time);
    return d.getFullYear() === calMonth.year && d.getMonth() === calMonth.month;
  });

  // ── Griglia calendario ────────────────────────────────────────────────────
  const daysInMonth = new Date(calMonth.year, calMonth.month + 1, 0).getDate();
  const rawFirstDay = new Date(calMonth.year, calMonth.month, 1).getDay();
  const firstDay = (rawFirstDay + 6) % 7;
  const sessionsByDay = {};
  monthSessions.forEach(s => {
    const day = new Date(s.start_time).getDate();
    if (!sessionsByDay[day]) sessionsByDay[day] = [];
    sessionsByDay[day].push(s);
  });
  const totalCells = Math.ceil((firstDay + daysInMonth) / 7) * 7;
  const cells = Array.from({ length: totalCells }, (_, i) => {
    const d = i - firstDay + 1;
    return d >= 1 && d <= daysInMonth ? d : null;
  });

  const fmt = (dt) => new Date(dt).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
  const fmtDate = (dt) => new Date(dt).toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' });

  // ── Colori copertura ──────────────────────────────────────────────────────
  const coverageColor = coveragePercent >= 80
    ? { bg: 'rgba(26,92,46,0.25)', text: '#4ade80', num: '#4ade80', border: 'rgba(26,92,46,0.4)' }
    : coveragePercent >= 50
    ? { bg: 'rgba(92,70,10,0.25)', text: '#fbbf24', num: '#fbbf24', border: 'rgba(92,70,10,0.4)' }
    : { bg: 'rgba(139,26,26,0.2)', text: '#f87171', num: '#f87171', border: 'rgba(139,26,26,0.3)' };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg-dark, #1a1008)' }}>
      {/* Modale sessione */}
      <SessionModal
        session={selectedSession}
        userAssignments={userAssignments}
        onClose={() => setSelectedSession(null)}
        onAssign={handleAssign}
        onCancel={handleCancel}
      />

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', top: '24px', left: '50%', transform: 'translateX(-50%)',
          zIndex: 100, padding: '12px 24px', borderRadius: '10px', fontWeight: 700,
          fontSize: '0.9rem', whiteSpace: 'nowrap',
          background: toast.startsWith('❌') ? 'rgba(139,26,26,0.95)' : 'rgba(26,92,46,0.95)',
          color: '#e8d5b7',
          border: `1px solid ${toast.startsWith('❌') ? 'rgba(139,26,26,0.8)' : 'rgba(26,92,46,0.8)'}`,
          boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
        }}>
          {toast}
        </div>
      )}

      {/* Header */}
      <header style={{
        background: 'linear-gradient(180deg, #0f0a05 0%, #1a1008 100%)',
        borderBottom: '2px solid #4a2e10',
        padding: '14px 24px',
        boxShadow: '0 2px 16px rgba(0,0,0,0.6)',
      }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <DerganoHeader />
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {user.role === 'admin' && (
              <button
                onClick={() => navigate('/admin')}
                style={{
                  background: 'linear-gradient(135deg, #c9a227, #e6c44a)',
                  color: '#0f0a05', border: '1px solid #7a5f14', borderRadius: '8px',
                  padding: '6px 14px', fontFamily: 'Cinzel, serif', fontWeight: 700,
                  fontSize: '0.8rem', cursor: 'pointer', letterSpacing: '0.5px',
                }}
              >
                🛡️ Admin
              </button>
            )}
            <span style={{ color: '#a89070', fontSize: '0.88rem', fontFamily: 'Cinzel, serif' }}>
              ⚔️ {user.name}
            </span>
            <button
              onClick={handleLogout}
              style={{ background: 'rgba(139,26,26,0.2)', color: '#f87171', border: '1px solid rgba(139,26,26,0.4)', borderRadius: '8px', padding: '6px 12px', cursor: 'pointer', fontSize: '0.82rem' }}
            >
              Esci
            </button>
          </div>
        </div>
      </header>

      <main style={{ maxWidth: '1100px', margin: '0 auto', padding: '24px 16px' }}>

        {/* Navigazione mese */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <button onClick={prevMonth} style={{ width: '36px', height: '36px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px', color: '#c9a227', fontSize: '1.2rem', cursor: 'pointer' }}>‹</button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h2 style={{ margin: 0, fontFamily: 'Cinzel, serif', color: '#c9a227', fontSize: '1.1rem' }}>
              {MONTHS_IT[calMonth.month]} {calMonth.year}
            </h2>
            <button onClick={goToday} style={{ fontSize: '0.72rem', padding: '3px 10px', borderRadius: '6px', background: 'rgba(201,162,39,0.15)', color: '#c9a227', border: '1px solid rgba(201,162,39,0.3)', cursor: 'pointer', fontFamily: 'Cinzel, serif' }}>
              Oggi
            </button>
          </div>
          <button onClick={nextMonth} style={{ width: '36px', height: '36px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px', color: '#c9a227', fontSize: '1.2rem', cursor: 'pointer' }}>›</button>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
          <div style={{ padding: '16px', borderRadius: '10px', background: coverageColor.bg, border: `1px solid ${coverageColor.border}` }}>
            <p style={{ margin: 0, fontSize: '0.82rem', color: coverageColor.text, fontFamily: 'Cinzel, serif' }}>Copertura del mese</p>
            <p style={{ margin: '4px 0 0', fontSize: '2rem', fontWeight: 900, color: coverageColor.num, fontFamily: 'Cinzel, serif' }}>{coveragePercent}%</p>
            <p style={{ margin: '4px 0 0', fontSize: '0.75rem', color: coverageColor.text, opacity: 0.8 }}>
              {coveredCount + partialCount}/{activeSessions.length} sessioni coperte
            </p>
          </div>
          <div style={{ padding: '16px', borderRadius: '10px', background: 'rgba(26,52,96,0.25)', border: '1px solid rgba(26,52,96,0.4)' }}>
            <p style={{ margin: 0, fontSize: '0.82rem', color: '#93c5fd', fontFamily: 'Cinzel, serif' }}>Le mie sessioni</p>
            <p style={{ margin: '4px 0 0', fontSize: '2rem', fontWeight: 900, color: '#93c5fd', fontFamily: 'Cinzel, serif' }}>{myMonthBookings.length}</p>
            <p style={{ margin: '4px 0 0', fontSize: '0.75rem', color: '#93c5fd', opacity: 0.8 }}>questo mese</p>
          </div>
        </div>

        {/* Toggle vista */}
        <div style={{ display: 'flex', gap: '4px', marginBottom: '20px', background: 'var(--bg-card)', padding: '4px', borderRadius: '10px', width: 'fit-content', border: '1px solid var(--border)' }}>
          {['calendario', 'lista'].map(mode => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              style={{
                padding: '8px 20px', borderRadius: '8px', fontSize: '0.88rem',
                fontFamily: 'Cinzel, serif', fontWeight: 600,
                background: viewMode === mode ? 'linear-gradient(135deg, #c9a227, #e6c44a)' : 'transparent',
                color: viewMode === mode ? '#0f0a05' : '#a89070',
                border: 'none', cursor: 'pointer', transition: 'all 0.2s',
              }}
            >
              {mode === 'calendario' ? '📅 Calendario' : '📋 Lista'}
            </button>
          ))}
        </div>

        {error && (
          <div style={{ background: 'rgba(139,26,26,0.2)', border: '1px solid rgba(139,26,26,0.4)', color: '#f87171', padding: '12px', borderRadius: '8px', marginBottom: '16px' }}>
            {error}
          </div>
        )}

        {loading ? (
          <div style={{ textAlign: 'center', padding: '64px', color: '#a89070', fontFamily: 'Cinzel, serif' }}>
            ⏳ Caricamento...
          </div>
        ) : (
          <>
            {/* ── CALENDARIO ── */}
            {viewMode === 'calendario' && (
              <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '20px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', marginBottom: '4px' }}>
                  {DAYS_IT.map(d => (
                    <div key={d} style={{ textAlign: 'center', fontSize: '0.72rem', color: '#a89070', padding: '4px', fontFamily: 'Cinzel, serif' }}>{d}</div>
                  ))}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '3px' }}>
                  {cells.map((day, idx) => {
                    const daySessions = day ? (sessionsByDay[day] || []) : [];
                    const today = new Date();
                    const isToday = day && today.getDate() === day && today.getMonth() === calMonth.month && today.getFullYear() === calMonth.year;
                    return (
                      <div
                        key={idx}
                        style={{
                          minHeight: '88px', borderRadius: '6px', padding: '3px',
                          background: !day ? 'transparent' : isToday ? 'rgba(201,162,39,0.08)' : 'var(--bg-surface)',
                          border: !day ? '1px solid transparent' : isToday ? '1px solid rgba(201,162,39,0.4)' : '1px solid var(--border)',
                        }}
                      >
                        {day && (
                          <>
                            <p style={{ fontSize: '0.72rem', fontWeight: 700, margin: '0 0 2px 2px', color: isToday ? '#c9a227' : '#6b5035', fontFamily: 'Cinzel, serif' }}>{day}</p>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                              {daySessions.map(s => {
                                const isMySession = userAssignments.some(a => a.shift_id === s.id && a.status === 'assigned');
                                const colors = getSessionColors(s, isMySession);
                                return (
                                  <div
                                    key={s.id}
                                    onClick={() => setSelectedSession(s)}
                                    className={`${colors.cell}`}
                                    style={{ fontSize: '0.67rem', padding: '2px 4px', borderRadius: '4px', cursor: 'pointer', opacity: s.cancelled ? 0.65 : 1 }}
                                  >
                                    <div style={{ fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                      {s.cancelled && '⚠ '}{s.has_pizza && '🍕 '}{s.location_name}
                                    </div>
                                    <div style={{ opacity: 0.75 }}>{fmt(s.start_time)}–{fmt(s.end_time)}</div>
                                  </div>
                                );
                              })}
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
                {/* Legenda */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--border)' }}>
                  {[
                    { color: '#93c5fd', label: 'Le mie sessioni' },
                    { color: '#4ade80', label: 'Sessione completa' },
                    { color: '#86efac', label: 'Parzialmente coperta' },
                    { color: '#f87171', label: 'Senza avventurieri' },
                    { color: '#fbbf24', label: '⚠ Annullata' },
                  ].map(({ color, label }) => (
                    <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: color, opacity: 0.7 }} />
                      <span style={{ fontSize: '0.72rem', color: '#a89070' }}>{label}</span>
                    </div>
                  ))}
                  <span style={{ fontSize: '0.72rem', color: '#6b5035', marginLeft: 'auto', fontStyle: 'italic' }}>Clicca una sessione per aprirla</span>
                </div>
              </div>
            )}

            {/* ── LISTA ── */}
            {viewMode === 'lista' && (
              <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '20px' }}>
                <h2 style={{ fontFamily: 'Cinzel, serif', color: '#c9a227', margin: '0 0 16px', fontSize: '1rem' }}>
                  ⚔️ Sessioni — {MONTHS_IT[calMonth.month]} {calMonth.year}
                </h2>
                {monthSessions.length === 0 ? (
                  <p style={{ color: '#a89070', textAlign: 'center', padding: '32px', fontFamily: 'Cinzel, serif' }}>Nessuna sessione in questo mese</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {monthSessions.map(s => {
                      const isMySession = userAssignments.some(a => a.shift_id === s.id && a.status === 'assigned');
                      const myAssignment = userAssignments.find(a => a.shift_id === s.id && a.status === 'assigned');
                      const colors = getSessionColors(s, isMySession);
                      const assignedUsers = s.assigned_users || [];
                      const statusLabel = s.cancelled ? 'Annullata'
                        : s.assigned_count === 0 ? 'Nessun avventuriero'
                        : s.assigned_count < s.required_count ? `${s.assigned_count}/${s.required_count} avventurieri`
                        : `${s.assigned_count}/${s.required_count} ✓`;
                      return (
                        <div key={s.id} className={`border rounded-xl ${colors.card}`} style={{ padding: '14px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', marginBottom: '4px' }}>
                                <span style={{ fontWeight: 700, fontFamily: 'Cinzel, serif', color: s.cancelled ? '#6b5035' : '#c9a227', fontSize: '0.95rem' }}>
                                  {s.location_name}
                                </span>
                                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${colors.badge}`}>{statusLabel}</span>
                                {isMySession && !s.cancelled && (
                                  <span style={{ fontSize: '0.72rem', padding: '2px 8px', borderRadius: '12px', background: 'rgba(26,52,96,0.4)', color: '#93c5fd', fontWeight: 700 }}>✓ Iscritto</span>
                                )}
                                {s.has_pizza && <span className="pizza-badge">🍕 Pizza</span>}
                              </div>
                              <p style={{ margin: '2px 0', fontSize: '0.85rem', color: '#a89070' }}>{fmtDate(s.start_time)}</p>
                              <p style={{ margin: '2px 0', fontSize: '0.85rem', color: '#a89070' }}>{fmt(s.start_time)} — {fmt(s.end_time)}</p>
                              {assignedUsers.length > 0 && !s.cancelled && (
                                <p style={{ margin: '4px 0 0', fontSize: '0.78rem', color: '#6b5035' }}>
                                  ⚔️ {assignedUsers.join(', ')}
                                </p>
                              )}
                            </div>
                            {!s.cancelled && (
                              <button
                                onClick={async () => {
                                  if (isMySession) { handleCancel(myAssignment?.id); }
                                  else {
                                    setBookingSessionId(s.id);
                                    try { await handleAssign(s.id); } catch(e) {} finally { setBookingSessionId(null); }
                                  }
                                }}
                                disabled={bookingSessionId === s.id}
                                style={{
                                  marginLeft: '12px', padding: '8px 14px', borderRadius: '8px', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer', flexShrink: 0, fontFamily: 'Cinzel, serif',
                                  background: isMySession ? 'rgba(201,162,39,0.1)' : bookingSessionId === s.id ? 'rgba(201,162,39,0.2)' : 'linear-gradient(135deg, #c9a227, #e6c44a)',
                                  color: isMySession ? '#a89070' : '#0f0a05',
                                  border: isMySession ? '1px solid #4a2e10' : '1px solid #7a5f14',
                                }}
                              >
                                {isMySession ? '✓ Iscritto' : bookingSessionId === s.id ? '⏳' : '⚔️ Partecipa'}
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
