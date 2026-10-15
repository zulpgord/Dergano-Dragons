import { useState, useEffect } from 'react';
import AccountModal from '../components/AccountModal';
import ThemeToggle from '../components/ThemeToggle';
import PrivacyGate from '../components/PrivacyGate';
import ContactModal from '../components/ContactModal';
import { useNavigate } from 'react-router-dom';
import { shiftsAPI, assignmentsAPI, authAPI } from '../services/api';

// ── Header logo fantasy: solo drago (contiene già dado e titolo) ───────────
function DerganoHeader() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', height: '70px' }}>
      <img
        src="/drago.png"
        alt="Dergano & Dragons"
        style={{ height: '70px', width: 'auto', objectFit: 'contain' }}
      />
      <div className="dg-header-sep" style={{ width: '1px', height: '32px', background: 'var(--border)', flexShrink: 0 }} />
      <div className="dg-subtitle" style={{
        fontFamily: 'Atkinson Hyperlegible, system-ui, sans-serif', fontSize: '0.55rem', color: 'var(--text-muted)',
        letterSpacing: '3px', lineHeight: 1.4,
      }}>
        SESSION<br/>MANAGER
      </div>
    </div>
  );
}

// ── Overlay: il drago manda un bacio (o avvisa della lista d'attesa) ───────
function KissOverlay({ show, waiting }) {
  if (!show) return null;
  return (
    <div className="kiss-overlay">
      <div className="kiss-overlay-inner">
        <img src="/drago.png" alt="" className="kiss-dragon" />
        {waiting ? (
          <span className="kiss-waiting-bubble">⏳ Sei in lista d'attesa!</span>
        ) : (
          <span className="kiss-emoji">💋</span>
        )}
      </div>
    </div>
  );
}

// ── Barra di riempimento proporzionale (avventurieri iscritti / richiesti) ──
function FillBar({ current, total, height = 7 }) {
  const pct = total > 0 ? Math.min(100, Math.round((current / total) * 100)) : 0;
  const isFull = pct >= 100;
  return (
    <div className="fill-track" style={{ height }}>
      <div
        className={`fill-bar ${isFull ? 'full' : ''} ${pct === 0 ? 'empty-track' : ''}`}
        style={{ width: `${pct}%`, height: '100%' }}
      />
    </div>
  );
}

// ── Modale sessione ──────────────────────────────────────────────────────────
function SessionModal({ session, userAssignments, onClose, onAssign, onCancel }) {
  const [isBooking, setIsBooking] = useState(false);
  const [seatsWanted, setSeatsWanted] = useState(1);
  useEffect(() => { setIsBooking(false); setSeatsWanted(1); }, [session?.id]);
  if (!session) return null;
  const isPast = new Date(session.end_time) < new Date();
  const fmt = (dt) => new Date(dt).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
  const fmtDate = (dt) => new Date(dt).toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const myAssignment = userAssignments.find(a => a.shift_id === session.id && ['assigned', 'waiting'].includes(a.status));
  const isAssigned = myAssignment?.status === 'assigned';
  const isWaitingMe = myAssignment?.status === 'waiting';
  const isRegistered = isAssigned || isWaitingMe;
  const fullyC = session.assigned_count >= session.required_count;
  const partial = session.assigned_count > 0 && session.assigned_count < session.required_count;
  const assignedUsers = session.assigned_users || [];
  const waitingUsers = session.waiting_users || [];
  const statusLabel = session.cancelled ? 'Annullata'
    : isPast ? 'Conclusa'
    : isAssigned ? '✓ Sei registrato'
    : isWaitingMe ? '⏳ Sei in lista d\'attesa'
    : fullyC ? 'Completa'
    : partial ? 'Parzialmente coperta'
    : 'Senza avventurieri';

  const statusBg = session.cancelled ? 'rgba(169,121,26,0.14)'
    : isAssigned ? 'rgba(36,85,164,0.14)'
    : isWaitingMe ? 'rgba(169,121,26,0.16)'
    : fullyC ? 'rgba(169,121,26,0.18)'
    : partial ? 'rgba(47,125,58,0.14)'
    : 'rgba(179,38,30,0.12)';
  const statusText = session.cancelled ? 'var(--red)'
    : isAssigned ? 'var(--green)'
    : isWaitingMe ? 'var(--red)'
    : fullyC ? 'var(--gold)'
    : partial ? 'var(--green)'
    : 'var(--red)';

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 50,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '16px',
        backgroundColor: 'rgba(44,32,17,0.45)',
      }}
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        className="bg-frame"
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-gold, var(--gold))',
          borderRadius: '12px',
          boxShadow: '0 8px 32px rgba(80,60,20,0.25)',
          width: '100%',
          maxWidth: '380px',
          padding: '1.5rem',
        }}
      >
        {session.cancelled && (
          <div style={{ marginBottom: '12px', padding: '10px', background: 'rgba(169,121,26,0.14)', border: '1px solid rgba(169,121,26,0.3)', borderRadius: '8px', color: 'var(--red)', fontSize: '0.85rem', textAlign: 'center' }}>
            ⚠️ Questa sessione è stata annullata
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
          <div>
            <h2 style={{ fontFamily: 'Titan One, Luckiest Guy, fantasy', color: 'var(--gold)', margin: 0, fontSize: '1.1rem' }}>
              {session.location_name}
            </h2>
            {session.has_pizza && (
              <span className="pizza-badge" style={{ marginTop: '4px', display: 'inline-flex' }}>
                🍕 Pizza inclusa
              </span>
            )}
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', fontSize: '1.4rem', lineHeight: 1 }}>×</button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '14px', color: 'var(--text-muted)' }}>
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
            <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text)' }}>
              {session.assigned_count} / {session.required_count} avventurieri
            </span>
            <span style={{ fontSize: '0.72rem', padding: '2px 8px', borderRadius: '10px', fontWeight: 600, background: statusBg, color: statusText }}>
              {statusLabel}
            </span>
          </div>
          {/* Barra di riempimento */}
          <FillBar current={session.assigned_count} total={session.required_count} height={9} />
        </div>

        {assignedUsers.length > 0 && (
          <div style={{ marginBottom: waitingUsers.length > 0 ? '12px' : '20px' }}>
            <p style={{ fontSize: '0.72rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '8px', fontFamily: 'Atkinson Hyperlegible, system-ui, sans-serif' }}>
              Avventurieri
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {assignedUsers.map(u => (
                <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', color: 'var(--text)' }}>
                  <span style={{
                    width: '22px', height: '22px', borderRadius: '50%',
                    background: 'rgba(169,121,26,0.14)', border: '1px solid rgba(169,121,26,0.3)',
                    color: 'var(--gold)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '0.75rem', fontWeight: 700, flexShrink: 0,
                  }}>
                    {u.name.charAt(0).toUpperCase()}
                  </span>
                  {u.name}{u.seats > 1 && <span style={{ color: 'var(--text-dim)', fontSize: '0.78rem' }}> (+{u.seats - 1}, {u.seats} posti)</span>}
                </div>
              ))}
            </div>
          </div>
        )}

        {waitingUsers.length > 0 && (
          <div style={{ marginBottom: '20px' }}>
            <p style={{ fontSize: '0.72rem', color: 'var(--red)', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '8px', fontFamily: 'Atkinson Hyperlegible, system-ui, sans-serif' }}>
              ⏳ Lista d'attesa
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {waitingUsers.map((u, i) => (
                <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                  <span style={{
                    width: '22px', height: '22px', borderRadius: '50%',
                    background: 'rgba(169,121,26,0.10)', border: '1px dashed rgba(169,121,26,0.4)',
                    color: 'var(--red)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '0.72rem', fontWeight: 700, flexShrink: 0,
                  }}>
                    {i + 1}
                  </span>
                  {u.name}{u.seats > 1 && <span style={{ fontSize: '0.78rem' }}> ({u.seats} posti)</span>}
                </div>
              ))}
            </div>
          </div>
        )}

        {session.cancelled ? (
          <div style={{ background: 'rgba(169,121,26,0.12)', border: '1px solid rgba(169,121,26,0.25)', borderRadius: '8px', padding: '12px', textAlign: 'center', color: 'var(--red)', fontSize: '0.85rem' }}>
            Questa sessione è stata annullata dall'organizzazione.
          </div>
        ) : isPast ? (
          <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '8px', padding: '12px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            {isRegistered ? '✓ Hai partecipato a questa sessione.' : 'Questa sessione è già conclusa.'}
          </div>
        ) : isRegistered ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{
              background: isWaitingMe ? 'rgba(169,121,26,0.10)' : 'rgba(36,85,164,0.10)',
              border: `1px solid ${isWaitingMe ? 'rgba(169,121,26,0.3)' : 'rgba(36,85,164,0.3)'}`,
              borderRadius: '8px', padding: '10px', textAlign: 'center',
              color: isWaitingMe ? 'var(--red)' : 'var(--green)', fontSize: '0.88rem', fontWeight: 600,
            }}>
              {isWaitingMe ? '⏳ Sei in lista d\'attesa — verrai promosso se si libera un posto' : '✓ Sei registrato a questa sessione'}
            </div>
            <button
              onClick={() => { onCancel(myAssignment.id); onClose(); }}
              style={{ width: '100%', padding: '10px', background: 'rgba(179,38,30,0.10)', color: 'var(--red)', border: '1px solid rgba(179,38,30,0.3)', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '0.88rem' }}
            >
              {isWaitingMe ? 'Esci dalla lista d\'attesa' : 'Annulla partecipazione'}
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontFamily: 'Atkinson Hyperlegible, system-ui, sans-serif', fontSize: '0.8rem', color: 'var(--text-muted)' }}>Posti da prenotare:</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <button type="button" onClick={() => setSeatsWanted(s => Math.max(1, s - 1))}
                  style={{ width: '26px', height: '26px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg-surface)', color: 'var(--gold)', fontWeight: 700, cursor: 'pointer' }}>−</button>
                <span style={{ minWidth: '20px', textAlign: 'center', fontWeight: 700, color: 'var(--text)' }}>{seatsWanted}</span>
                <button type="button" onClick={() => setSeatsWanted(s => Math.min(6, s + 1))}
                  style={{ width: '26px', height: '26px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg-surface)', color: 'var(--gold)', fontWeight: 700, cursor: 'pointer' }}>+</button>
              </div>
            </div>
            <button
              className="dado-join-btn"
              onClick={async () => { setIsBooking(true); try { await onAssign(session.id, seatsWanted); onClose(); } catch(e) { setIsBooking(false); } }}
              disabled={isBooking}
              style={{ width: '78px', height: '78px' }}
              title={fullyC ? "Iscriviti in lista d'attesa" : "Unisciti all'avventura"}
            >
              <img src="/dado.png" alt="" />
            </button>
            <span style={{ fontFamily: 'Atkinson Hyperlegible, system-ui, sans-serif', fontSize: '0.85rem', fontWeight: 700, color: 'var(--gold)', textAlign: 'center' }}>
              {isBooking ? '⏳ Registrazione...' : fullyC ? 'Iscriviti in lista d\'attesa' : 'Unisciti all\'avventura'}
            </span>
          </div>
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
  const [slowLoading, setSlowLoading] = useState(false);
  const [error, setError] = useState('');
  const [viewMode, setViewMode] = useState('calendario');
  const [selectedSession, setSelectedSession] = useState(null);
  const [toast, setToast] = useState(null);
  const [showKiss, setShowKiss] = useState(false);
  const [kissWaiting, setKissWaiting] = useState(false);
  const [bookingSessionId, setBookingSessionId] = useState(null);
  const [calMonth, setCalMonth] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });
  const [calendarRevealed, setCalendarRevealed] = useState(() => { try { return localStorage.getItem('dg_art_seen') === '1'; } catch { return true; } });
  const [showAccount, setShowAccount] = useState(false);
  const [showContact, setShowContact] = useState(false);

  useEffect(() => {
    if (!user.id) { navigate('/auth'); return; }
    loadSessions();
  }, []);

  // Le illustrazioni del party si vedono solo alla prima apertura dell'app: poi resta solo il calendario.
  const [showArt, setShowArt] = useState(() => {
    try { return localStorage.getItem('dg_art_seen') !== '1'; } catch { return false; }
  });
  const hideArt = () => {
    setShowArt(false);
    setCalendarRevealed(true);
    try { localStorage.setItem('dg_art_seen', '1'); } catch { /* ignora */ }
  };

  const loadSessions = async (silent = false) => {
    let slowTimer;
    try {
      if (!silent) {
        setLoading(true);
        setError('');
        slowTimer = setTimeout(() => setSlowLoading(true), 4000);
      }
      const [sessRes, assignRes] = await Promise.all([
        shiftsAPI.getShifts(),
        assignmentsAPI.getUserAssignments(),
      ]);
      setSessions(sessRes.data);
      setUserAssignments(assignRes.data);
    } catch (err) {
      setError(err.response
        ? 'Errore nel caricamento delle sessioni.'
        : 'Non riesco a contattare il server. Potrebbe essersi appena riavviato: riprova tra qualche secondo.');
    } finally {
      clearTimeout(slowTimer);
      if (!silent) {
        setLoading(false);
        setSlowLoading(false);
      }
    }
  };

  const showToast = (msg, duration = 3500) => {
    setToast(msg);
    setTimeout(() => setToast(null), duration);
  };

  const handleAssign = async (sessionId, seats = 1) => {
    try {
      const res = await assignmentsAPI.assignShift(sessionId, seats);
      const isWaiting = res.data?.assignment?.status === 'waiting';
      showToast(isWaiting ? '⏳ Sessione al completo — sei in lista d\'attesa' : '⚔️ Sei nell\'avventura!');
      setKissWaiting(isWaiting);
      setShowKiss(true);
      setTimeout(() => setShowKiss(false), 1900);
      await loadSessions(true);
    } catch (err) {
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

  const handleDeleteAccount = async () => {
    if (!confirm('Eliminare definitivamente il tuo account? Verranno cancellate anche tutte le tue iscrizioni alle sessioni. Questa azione non si può annullare.')) return;
    if (!confirm('Sei sicuro? Non potrai recuperare il tuo account dopo averlo eliminato.')) return;
    try {
      await authAPI.deleteMyAccount();
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      navigate('/auth');
    } catch (err) {
      alert(err.response?.data?.error || "Errore nell'eliminazione dell'account");
    }
  };

  const prevMonth = () => setCalMonth(({ year, month }) => month === 0 ? { year: year - 1, month: 11 } : { year, month: month - 1 });
  const nextMonth = () => setCalMonth(({ year, month }) => month === 11 ? { year: year + 1, month: 0 } : { year, month: month + 1 });
  const goToday = () => { const n = new Date(); setCalMonth({ year: n.getFullYear(), month: n.getMonth() }); };

  const monthSessions = sessions.filter(s => {
    const d = new Date(s.start_time);
    return d.getFullYear() === calMonth.year && d.getMonth() === calMonth.month;
  });
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

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg-page)' }}>
      <SessionModal
        session={selectedSession}
        userAssignments={userAssignments}
        onClose={() => setSelectedSession(null)}
        onAssign={handleAssign}
        onCancel={handleCancel}
      />

      <KissOverlay show={showKiss} waiting={kissWaiting} />

      {toast && (
        <div style={{
          position: 'fixed', top: '24px', left: '50%', transform: 'translateX(-50%)',
          zIndex: 100, padding: '12px 24px', borderRadius: '10px', fontWeight: 700,
          fontSize: '0.9rem', whiteSpace: 'nowrap',
          background: toast.startsWith('❌') ? 'rgba(179,38,30,0.95)' : 'rgba(47,125,58,0.95)',
          color: 'var(--on-gold)',
          border: `1px solid ${toast.startsWith('❌') ? 'rgba(179,38,30,0.8)' : 'rgba(47,125,58,0.8)'}`,
          boxShadow: '0 4px 16px rgba(80,60,20,0.25)',
        }}>
          {toast}
        </div>
      )}

      <header style={{
        background: 'linear-gradient(180deg, var(--bg-card) 0%, var(--bg-page) 100%)',
        borderBottom: '2px solid var(--border)',
        padding: '14px 24px',
        boxShadow: '0 2px 10px rgba(80,60,20,0.08)',
      }}>
        <div className="dg-header-row" style={{ maxWidth: '1240px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
          <DerganoHeader />
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <button
              onClick={() => navigate('/personaggi')}
              style={{
                background: 'var(--bg-card)',
                color: 'var(--green)', border: '1px solid var(--green)', borderRadius: '8px',
                padding: '6px 14px', fontFamily: 'Atkinson Hyperlegible, system-ui, sans-serif', fontWeight: 700,
                fontSize: '0.8rem', cursor: 'pointer', letterSpacing: '0.5px',
              }}
            >
              🎭 Personaggi
            </button>
            <button
              onClick={() => navigate('/quiz')}
              style={{
                background: 'var(--bg-card)',
                color: 'var(--gold)', border: '1px solid var(--gold)', borderRadius: '8px',
                padding: '6px 14px', fontFamily: 'Atkinson Hyperlegible, system-ui, sans-serif', fontWeight: 700,
                fontSize: '0.8rem', cursor: 'pointer', letterSpacing: '0.5px',
              }}
            >
              🎲 Trova la tua classe
            </button>
            {user.role === 'admin' && (
              <button
                onClick={() => navigate('/admin')}
                style={{
                  background: 'linear-gradient(135deg, var(--gold), var(--gold-light))',
                  color: 'var(--on-gold)', border: '1px solid var(--gold)', borderRadius: '8px',
                  padding: '6px 14px', fontFamily: 'Atkinson Hyperlegible, system-ui, sans-serif', fontWeight: 700,
                  fontSize: '0.8rem', cursor: 'pointer', letterSpacing: '0.5px',
                }}
              >
                🛡️ Admin
              </button>
            )}
            <span style={{ color: 'var(--text-muted)', fontSize: '0.88rem', fontFamily: 'Atkinson Hyperlegible, system-ui, sans-serif' }}>
              ⚔️ {user.name}
            </span>
            <button onClick={() => setShowContact(true)} title="Scrivi all'organizzatore"
              style={{ background: 'var(--bg-card)', color: 'var(--gold)', border: '1px solid var(--gold)', borderRadius: '8px', padding: '6px 12px', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 700, fontFamily: 'Atkinson Hyperlegible, system-ui, sans-serif' }}>
              ✉️ Contatti
            </button>
            <ThemeToggle />
            <button
              onClick={handleLogout}
              style={{ background: 'rgba(179,38,30,0.10)', color: 'var(--red)', border: '1px solid rgba(179,38,30,0.3)', borderRadius: '8px', padding: '6px 12px', cursor: 'pointer', fontSize: '0.82rem' }}
            >
              Esci
            </button>
          </div>
        </div>
        <div className="dg-header-links" style={{ display: 'flex', justifyContent: 'flex-end', gap: '14px', maxWidth: '1240px', margin: '4px auto 0', padding: '0', fontSize: '0.72rem' }}>
          <button onClick={() => setShowAccount(true)} style={{ background: 'none', border: 'none', color: 'var(--gold)', textDecoration: 'underline', cursor: 'pointer', fontSize: '0.72rem', padding: 0, fontWeight: 700, fontFamily: 'Atkinson Hyperlegible, system-ui, sans-serif' }}>
            Il mio account
          </button>
          <a href="/privacy" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--text-dim)', textDecoration: 'underline' }}>Privacy</a>
          <button onClick={handleDeleteAccount} style={{ background: 'none', border: 'none', color: 'var(--text-dim)', textDecoration: 'underline', cursor: 'pointer', fontSize: '0.72rem', padding: 0, fontFamily: 'Atkinson Hyperlegible, system-ui, sans-serif' }}>
            Elimina il mio account
          </button>
        </div>
      </header>
      {showAccount && <AccountModal onClose={() => setShowAccount(false)} />}
      {showContact && <ContactModal onClose={() => setShowContact(false)} />}
      <PrivacyGate onLogout={handleLogout} />

      <main style={{ maxWidth: '1288px', margin: '0 auto', padding: '24px 24px 48px' }}>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '18px', marginBottom: '16px' }}>
          <button onClick={prevMonth} style={{ width: '36px', height: '36px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--gold)', fontSize: '1.2rem', cursor: 'pointer' }}>‹</button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h2 style={{ margin: 0, fontFamily: 'Titan One, Luckiest Guy, fantasy', color: 'var(--gold)', fontSize: '1.1rem' }}>
              {MONTHS_IT[calMonth.month]} {calMonth.year}
            </h2>
            <button onClick={goToday} style={{ fontSize: '0.72rem', padding: '3px 10px', borderRadius: '6px', background: 'rgba(169,121,26,0.12)', color: 'var(--gold)', border: '1px solid rgba(169,121,26,0.3)', cursor: 'pointer', fontFamily: 'Atkinson Hyperlegible, system-ui, sans-serif' }}>
              Oggi
            </button>
          </div>
          <button onClick={nextMonth} style={{ width: '36px', height: '36px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--gold)', fontSize: '1.2rem', cursor: 'pointer' }}>›</button>
        </div>

        <div style={{ display: 'flex', gap: '4px', margin: '0 auto 22px', background: 'var(--bg-card)', padding: '4px', borderRadius: '10px', width: 'fit-content', border: '1px solid var(--border)' }}>
          {['calendario', 'lista'].map(mode => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              style={{
                padding: '8px 20px', borderRadius: '8px', fontSize: '0.88rem',
                fontFamily: 'Atkinson Hyperlegible, system-ui, sans-serif', fontWeight: 600,
                background: viewMode === mode ? 'linear-gradient(135deg, var(--gold), var(--gold-light))' : 'transparent',
                color: viewMode === mode ? 'var(--bg-card)' : 'var(--text-muted)',
                border: 'none', cursor: 'pointer', transition: 'all 0.2s',
              }}
            >
              {mode === 'calendario' ? '📅 Calendario' : '📋 Lista'}
            </button>
          ))}
        </div>

        {error && (
          <div style={{ background: 'rgba(179,38,30,0.10)', border: '1px solid rgba(179,38,30,0.3)', color: 'var(--red)', padding: '12px', borderRadius: '8px', marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
            <span>{error}</span>
            <button
              onClick={() => loadSessions()}
              disabled={loading}
              style={{ padding: '7px 16px', borderRadius: '8px', background: 'rgba(179,38,30,0.12)', color: 'var(--red)', border: '1px solid rgba(179,38,30,0.35)', cursor: loading ? 'default' : 'pointer', fontWeight: 700, fontSize: '0.82rem', fontFamily: 'Atkinson Hyperlegible, system-ui, sans-serif', flexShrink: 0, opacity: loading ? 0.5 : 1 }}
            >
              {loading ? '⏳ Riprovo...' : '🔄 Riprova'}
            </button>
          </div>
        )}

        {loading ? (
          <div style={{ textAlign: 'center', padding: '64px', color: 'var(--text-muted)', fontFamily: 'Atkinson Hyperlegible, system-ui, sans-serif' }}>
            <div>⏳ Caricamento...</div>
            {slowLoading && (
              <div style={{ marginTop: '10px', fontSize: '0.85rem', color: 'var(--text-dim)', maxWidth: '360px', margin: '10px auto 0', lineHeight: 1.5 }}>
                🐉 Il drago si sta svegliando — il server riparte dopo un periodo di inattività.
                Possono volerci fino a un minuto: sto già riprovando da solo.
              </div>
            )}
          </div>
        ) : (
          <>
            {/* ── CALENDARIO ── */}
            {viewMode === 'calendario' && showArt && !calendarRevealed && (
              <div className="mobile-party-splash" onClick={hideArt}>
                <img src="/party-sx.jpg" alt="" />
                <div className="mobile-party-splash-caption">⚔️ Clicca qui per aprire il calendario</div>
              </div>
            )}
            {viewMode === 'calendario' && (
              <div className={`calendar-with-art ${showArt && !calendarRevealed ? 'calendar-hide-mobile' : ''}`}>
                {showArt && (
                  <div className="calendar-side-art-wrap">
                    <img src="/party-sx.jpg" alt="" className="calendar-side-art" />
                    <button type="button" className="calendar-art-close" onClick={hideArt} aria-label="Chiudi le illustrazioni" title="Chiudi">✕</button>
                  </div>
                )}
                <div style={{ flex: 1, minWidth: 0, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '20px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', marginBottom: '4px' }}>
                  {DAYS_IT.map(d => (
                    <div key={d} style={{ textAlign: 'center', fontSize: '0.72rem', color: 'var(--text-dim)', padding: '4px', fontFamily: 'Atkinson Hyperlegible, system-ui, sans-serif' }}>{d}</div>
                  ))}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: '3px' }}>
                  {cells.map((day, idx) => {
                    const daySessions = day ? (sessionsByDay[day] || []) : [];
                    const today = new Date();
                    const isToday = day && today.getDate() === day && today.getMonth() === calMonth.month && today.getFullYear() === calMonth.year;
                    const hasSessions = daySessions.length > 0;
                    return (
                      <div
                        key={idx}
                        style={{
                          minHeight: '104px', borderRadius: '6px', padding: '3px',
                          background: !day ? 'transparent' : isToday ? 'rgba(169,121,26,0.06)' : 'var(--bg-surface)',
                          border: !day ? '1px solid transparent' : isToday ? '1px solid rgba(169,121,26,0.35)' : '1px solid var(--border)',
                        }}
                      >
                        {day && (
                          <>
                            <p style={{ fontSize: '0.72rem', fontWeight: 700, margin: '0 0 2px 2px', color: isToday ? 'var(--gold)' : 'var(--text-dim)', fontFamily: 'Atkinson Hyperlegible, system-ui, sans-serif' }}>{day}</p>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                              {daySessions.map(s => {
                                const myA = userAssignments.find(a => a.shift_id === s.id && ['assigned', 'waiting'].includes(a.status));
                                const isMySession = myA?.status === 'assigned';
                                const isMyWaiting = myA?.status === 'waiting';
                                return (
                                  <div
                                    key={s.id}
                                    onClick={() => setSelectedSession(s)}
                                    style={{
                                      fontSize: '0.74rem', padding: '4px 6px', borderRadius: '5px', cursor: 'pointer',
                                      opacity: s.cancelled ? 0.6 : 1,
                                      background: s.cancelled ? 'rgba(169,121,26,0.12)' : 'var(--bg-page)',
                                      border: isMySession ? '2px solid var(--green)' : isMyWaiting ? '2px dashed var(--gold)' : '1px solid var(--border)',
                                    }}
                                  >
                                    <div className="calendar-cell-text" style={{ fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text)' }}>
                                      {s.cancelled && '⚠ '}{isMyWaiting && '⏳ '}{s.has_pizza && '🍕 '}{s.location_name}
                                    </div>
                                    <div className="calendar-cell-text" style={{ opacity: 0.7, color: 'var(--text-muted)' }}>{fmt(s.start_time)}–{fmt(s.end_time)}</div>
                                    {!s.cancelled && (
                                      <div style={{ marginTop: '3px' }}>
                                        <FillBar current={s.assigned_count} total={s.required_count} height={7} />
                                      </div>
                                    )}
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
                <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '14px', marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div style={{ width: '28px', height: '6px', borderRadius: '3px' }} className="fill-track"><div className="fill-bar" style={{ width: '40%', height: '100%' }} /></div>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Riempimento parziale</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div style={{ width: '28px', height: '6px', borderRadius: '3px' }} className="fill-track"><div className="fill-bar full" style={{ width: '100%', height: '100%' }} /></div>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Sessione completa</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <div style={{ width: '12px', height: '12px', borderRadius: '3px', border: '1.5px solid var(--green)', background: 'var(--bg-page)' }} />
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Le mie sessioni</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <div style={{ width: '12px', height: '12px', borderRadius: '3px', border: '1.5px dashed var(--gold)', background: 'var(--bg-page)' }} />
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>⏳ In lista d'attesa</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: 'rgba(169,121,26,0.25)' }} />
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>⚠ Annullata</span>
                  </div>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginLeft: 'auto', fontStyle: 'italic' }}>Clicca una sessione per aprirla</span>
                </div>
                </div>
                {showArt && (
                  <div className="calendar-side-art-wrap">
                    <img src="/party-dx.jpg" alt="" className="calendar-side-art" />
                    <button type="button" className="calendar-art-close" onClick={hideArt} aria-label="Chiudi le illustrazioni" title="Chiudi">✕</button>
                  </div>
                )}
              </div>
            )}

            {/* ── LISTA ── */}
            {viewMode === 'lista' && (
              <div className="bg-frame" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '20px' }}>
                <h2 className="bg-cartouche" style={{ fontFamily: 'Titan One, Luckiest Guy, fantasy', color: 'var(--gold)', margin: '0 0 16px', fontSize: '1rem' }}>
                  ⚔️ Sessioni — {MONTHS_IT[calMonth.month]} {calMonth.year}
                </h2>
                {monthSessions.length === 0 ? (
                  <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '32px', fontFamily: 'Atkinson Hyperlegible, system-ui, sans-serif' }}>Nessuna sessione in questo mese</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {monthSessions.map(s => {
                      const myAssignment = userAssignments.find(a => a.shift_id === s.id && ['assigned', 'waiting'].includes(a.status));
                      const isMySession = myAssignment?.status === 'assigned';
                      const isMyWaiting = myAssignment?.status === 'waiting';
                      const assignedUsers = s.assigned_users || [];
                      const waitingUsers = s.waiting_users || [];
                      const fullyC = s.assigned_count >= s.required_count;
                      const isPast = new Date(s.end_time) < new Date();
                      const statusLabel = s.cancelled ? 'Annullata'
                        : isPast ? 'Conclusa'
                        : s.assigned_count === 0 ? 'Nessun avventuriero'
                        : s.assigned_count < s.required_count ? `${s.assigned_count}/${s.required_count} avventurieri`
                        : `${s.assigned_count}/${s.required_count} ✓`;
                      return (
                        <div key={s.id} style={{
                          padding: '14px', borderRadius: '10px',
                          background: s.cancelled ? 'rgba(169,121,26,0.06)' : 'var(--bg-page)',
                          opacity: isPast && !s.cancelled ? 0.7 : 1,
                          border: isMySession ? '1.5px solid var(--green)' : isMyWaiting ? '1.5px dashed var(--gold)' : '1px solid var(--border)',
                          opacity: s.cancelled ? 0.75 : 1,
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ flex: 1 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', marginBottom: '4px' }}>
                                <span style={{ fontWeight: 700, fontFamily: 'Titan One, Luckiest Guy, fantasy', color: s.cancelled ? 'var(--text-dim)' : 'var(--gold)', fontSize: '0.95rem' }}>
                                  {s.location_name}
                                </span>
                                <span style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: '10px', fontWeight: 600, background: 'rgba(169,121,26,0.10)', color: 'var(--text-muted)' }}>{statusLabel}</span>
                                {isMySession && !s.cancelled && (
                                  <span style={{ fontSize: '0.72rem', padding: '2px 8px', borderRadius: '12px', background: 'rgba(36,85,164,0.14)', color: 'var(--green)', fontWeight: 700 }}>✓ Iscritto</span>
                                )}
                                {isMyWaiting && !s.cancelled && (
                                  <span style={{ fontSize: '0.72rem', padding: '2px 8px', borderRadius: '12px', background: 'rgba(169,121,26,0.16)', color: 'var(--red)', fontWeight: 700 }}>⏳ In lista d'attesa</span>
                                )}
                                {s.has_pizza && <span className="pizza-badge">🍕 Pizza</span>}
                              </div>
                              <p style={{ margin: '2px 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>{fmtDate(s.start_time)}</p>
                              <p style={{ margin: '2px 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>{fmt(s.start_time)} — {fmt(s.end_time)}</p>
                              {!s.cancelled && (
                                <div style={{ marginTop: '8px', maxWidth: '220px' }}>
                                  <FillBar current={s.assigned_count} total={s.required_count} height={7} />
                                </div>
                              )}
                              {assignedUsers.length > 0 && !s.cancelled && (
                                <p style={{ margin: '6px 0 0', fontSize: '0.78rem', color: 'var(--text-dim)' }}>
                                  ⚔️ {assignedUsers.map(u => u.seats > 1 ? `${u.name} (${u.seats})` : u.name).join(', ')}
                                </p>
                              )}
                              {waitingUsers.length > 0 && !s.cancelled && (
                                <p style={{ margin: '2px 0 0', fontSize: '0.75rem', color: 'var(--red)' }}>
                                  ⏳ Attesa: {waitingUsers.map(u => u.seats > 1 ? `${u.name} (${u.seats})` : u.name).join(', ')}
                                </p>
                              )}
                            </div>
                            {!s.cancelled && !isPast && (
                              (isMySession || isMyWaiting) ? (
                                <button
                                  onClick={() => handleCancel(myAssignment?.id)}
                                  style={{
                                    marginLeft: '12px', padding: '8px 14px', borderRadius: '8px', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer', flexShrink: 0, fontFamily: 'Atkinson Hyperlegible, system-ui, sans-serif',
                                    background: 'rgba(169,121,26,0.10)', color: 'var(--text-muted)', border: '1px solid var(--border)',
                                  }}
                                >
                                  {isMySession ? '✓ Iscritto' : '⏳ In attesa'}
                                </button>
                              ) : (
                                <div style={{ marginLeft: '12px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px', flexShrink: 0 }}>
                                  <button
                                    className="dado-join-btn"
                                    onClick={async () => {
                                      setBookingSessionId(s.id);
                                      try { await handleAssign(s.id); } catch(e) {} finally { setBookingSessionId(null); }
                                    }}
                                    disabled={bookingSessionId === s.id}
                                    style={{ width: '40px', height: '40px' }}
                                    title={fullyC ? "Iscriviti in lista d'attesa" : 'Unisciti alla sessione'}
                                  >
                                    <img src="/dado.png" alt="Partecipa" />
                                  </button>
                                  {bookingSessionId === s.id && <span style={{ fontSize: '0.65rem', color: 'var(--text-dim)' }}>⏳</span>}
                                </div>
                              )
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
