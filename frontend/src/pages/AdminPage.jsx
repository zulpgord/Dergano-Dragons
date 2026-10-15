import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { shiftsAPI, locationsAPI, adminAPI, authAPI, groupsAPI, assignmentsAPI, contentAPI, sheetsAPI } from '../services/api';
import SchedeAdminTab from './SchedeAdminTab';
import ThemeToggle from '../components/ThemeToggle';
import GameTable from '../components/GameTable';

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

// ── Stile comune per input admin (tema chiaro) ──────────────────────────────
const IS = {
  width: '100%', padding: '9px 12px',
  backgroundColor: 'var(--bg-card)',
  border: '1px solid var(--border)',
  borderRadius: '7px', color: 'var(--text)',
  fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box',
};

// ── Barra di riempimento proporzionale ──────────────────────────────────────
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

// ── Modale dettaglio sessione: lista iscritti + lista d'attesa ─────────────
function SessionDetailModal({ session, onClose, heroes, heroesFailed, onReloadHeroes, onRefresh }) {
  const [removingId, setRemovingId] = useState(null);
  const [addUserId, setAddUserId] = useState('');
  const [addSeats, setAddSeats] = useState(1);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    setAddUserId('');
    setAddSeats(1);
  }, [session?.id]);

  if (!session) return null;
  const fmt = dt => new Date(dt).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
  const fmtDate = dt => new Date(dt).toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const assignedUsers = session.assigned_users || [];
  const waitingUsers = session.waiting_users || [];
  const registeredIds = new Set([...assignedUsers, ...waitingUsers].map(u => u.user_id));
  const availableHeroes = (heroes || []).filter(h => !registeredIds.has(h.id));

  const handleRemove = async (assignmentId) => {
    if (!confirm('Rimuovere questo eroe dalla sessione?')) return;
    setRemovingId(assignmentId);
    try {
      await assignmentsAPI.cancelAssignment(assignmentId);
      await onRefresh();
      onClose();
    } catch (err) {
      alert(err.response?.data?.error || 'Errore nella rimozione');
      setRemovingId(null);
    }
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!addUserId) return;
    setAdding(true);
    try {
      await assignmentsAPI.adminAssignUser(session.id, addUserId, addSeats);
      await onRefresh();
      onClose();
    } catch (err) {
      alert(err.response?.data?.error || "Errore nell'iscrizione");
    } finally { setAdding(false); }
  };

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 60,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '16px', backgroundColor: 'rgba(44,32,17,0.45)',
      }}
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        className="bg-frame"
        style={{
          background: 'var(--bg-card)', border: '1px solid var(--border-gold, var(--gold))',
          borderRadius: '12px', boxShadow: '0 8px 32px rgba(80,60,20,0.25)',
          width: '100%', maxWidth: '400px', padding: '1.5rem', maxHeight: '85vh', overflowY: 'auto',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
          <div>
            <h2 style={{ fontFamily: 'Titan One, Luckiest Guy, fantasy', color: 'var(--gold)', margin: 0, fontSize: '1.1rem' }}>
              {session.location_name}
            </h2>
            {session.has_pizza && (
              <span className="pizza-badge" style={{ marginTop: '4px', display: 'inline-flex' }}>🍕 Pizza inclusa</span>
            )}
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', fontSize: '1.4rem', lineHeight: 1 }}>×</button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '14px', color: 'var(--text-muted)' }}>
          <div style={{ fontSize: '0.9rem', textTransform: 'capitalize' }}>📅 {fmtDate(session.start_time)}</div>
          <div style={{ fontSize: '0.9rem' }}>🕐 {fmt(session.start_time)} — {fmt(session.end_time)}</div>
          <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text)' }}>
            ⚔️ {session.assigned_count} / {session.required_count} avventurieri
            {session.cancelled && <span style={{ marginLeft: '8px', fontSize: '0.75rem', color: 'var(--red)', fontWeight: 700 }}>⚠ Annullata</span>}
          </div>
          <FillBar current={session.assigned_count} total={session.required_count} height={8} />
        </div>

        <p style={{ fontSize: '0.72rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '8px', fontFamily: 'Atkinson Hyperlegible, system-ui, sans-serif' }}>
          Avventurieri iscritti ({assignedUsers.length})
        </p>
        {assignedUsers.length === 0 ? (
          <p style={{ fontSize: '0.85rem', color: 'var(--text-dim)', marginBottom: '18px' }}>Nessuno iscritto ancora.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '18px' }}>
            {assignedUsers.map(u => (
              <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', color: 'var(--text)' }}>
                <span style={{
                  width: '22px', height: '22px', borderRadius: '50%',
                  background: 'rgba(169,121,26,0.14)', border: '1px solid rgba(169,121,26,0.3)',
                  color: 'var(--gold)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '0.75rem', fontWeight: 700, flexShrink: 0,
                }}>{u.name.charAt(0).toUpperCase()}</span>
                <span style={{ flex: 1 }}>{u.name}{u.seats > 1 && <span style={{ color: 'var(--text-dim)', fontSize: '0.78rem' }}> — {u.seats} posti</span>}</span>
                <button onClick={() => handleRemove(u.id)} disabled={removingId === u.id} title="Rimuovi dalla sessione"
                  style={{ background: 'none', border: 'none', color: 'var(--red)', cursor: 'pointer', fontSize: '0.85rem', opacity: removingId === u.id ? 0.5 : 1 }}>
                  🗑️
                </button>
              </div>
            ))}
          </div>
        )}

        <p style={{ fontSize: '0.72rem', color: 'var(--red)', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '8px', fontFamily: 'Atkinson Hyperlegible, system-ui, sans-serif' }}>
          ⏳ Lista d'attesa ({waitingUsers.length})
        </p>
        {waitingUsers.length === 0 ? (
          <p style={{ fontSize: '0.85rem', color: 'var(--text-dim)' }}>Nessuno in lista d'attesa.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {waitingUsers.map((u, i) => (
              <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                <span style={{
                  width: '22px', height: '22px', borderRadius: '50%',
                  background: 'rgba(169,121,26,0.10)', border: '1px dashed rgba(169,121,26,0.4)',
                  color: 'var(--red)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '0.72rem', fontWeight: 700, flexShrink: 0,
                }}>{i + 1}</span>
                <span style={{ flex: 1 }}>{u.name}{u.seats > 1 && <span style={{ fontSize: '0.78rem' }}> — {u.seats} posti</span>}</span>
                <button onClick={() => handleRemove(u.id)} disabled={removingId === u.id} title="Rimuovi dalla sessione"
                  style={{ background: 'none', border: 'none', color: 'var(--red)', cursor: 'pointer', fontSize: '0.85rem', opacity: removingId === u.id ? 0.5 : 1 }}>
                  🗑️
                </button>
              </div>
            ))}
          </div>
        )}

        {!session.cancelled && (
          <div style={{ marginTop: '18px', paddingTop: '16px', borderTop: '1px solid var(--border)' }}>
            <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '8px', fontFamily: 'Atkinson Hyperlegible, system-ui, sans-serif' }}>
              ➕ Iscrivi un eroe manualmente
            </p>
            {heroesFailed ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.82rem', color: 'var(--red)' }}>Non sono riuscito a caricare l'elenco degli eroi.</span>
                <button type="button" onClick={onReloadHeroes}
                  style={{ padding: '5px 12px', borderRadius: '6px', background: 'rgba(179,38,30,0.12)', color: 'var(--red)', border: '1px solid rgba(179,38,30,0.35)', cursor: 'pointer', fontWeight: 700, fontSize: '0.78rem', fontFamily: 'Atkinson Hyperlegible, system-ui, sans-serif' }}>
                  🔄 Riprova
                </button>
              </div>
            ) : availableHeroes.length === 0 ? (
              <p style={{ fontSize: '0.82rem', color: 'var(--text-dim)' }}>Tutti gli eroi sono già iscritti o in attesa per questa sessione.</p>
            ) : (
              <form onSubmit={handleAdd} style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                <select value={addUserId} onChange={e => setAddUserId(e.target.value)} required
                  style={{ flex: '1 1 160px', padding: '8px 10px', background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '7px', color: 'var(--text)', fontSize: '0.85rem' }}>
                  <option value="">Scegli eroe...</option>
                  {availableHeroes.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
                </select>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <button type="button" onClick={() => setAddSeats(s => Math.max(1, s - 1))}
                    style={{ width: '24px', height: '24px', borderRadius: '5px', border: '1px solid var(--border)', background: 'var(--bg-surface)', color: 'var(--gold)', cursor: 'pointer' }}>−</button>
                  <span style={{ minWidth: '16px', textAlign: 'center', fontSize: '0.85rem', color: 'var(--text)' }}>{addSeats}</span>
                  <button type="button" onClick={() => setAddSeats(s => Math.min(6, s + 1))}
                    style={{ width: '24px', height: '24px', borderRadius: '5px', border: '1px solid var(--border)', background: 'var(--bg-surface)', color: 'var(--gold)', cursor: 'pointer' }}>+</button>
                </div>
                <button type="submit" disabled={adding || !addUserId}
                  style={{ padding: '8px 14px', background: 'linear-gradient(135deg, var(--gold), var(--gold-light))', color: 'var(--on-gold)', border: '1px solid var(--gold)', borderRadius: '7px', fontFamily: 'Atkinson Hyperlegible, system-ui, sans-serif', fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer', opacity: (adding || !addUserId) ? 0.6 : 1 }}>
                  {adding ? '...' : 'Iscrivi'}
                </button>
              </form>
            )}
          </div>
        )}
        {(assignedUsers.length > 0 || waitingUsers.length > 0) && (
          <ShiftEmailBox sessionId={session.id} assigned={assignedUsers.length} waiting={waitingUsers.length} />
        )}
      </div>
    </div>
  );
}

// Avviso via email agli iscritti di una sessione (ognuno riceve la sua email).
function ShiftEmailBox({ sessionId, assigned, waiting }) {
  const [open, setOpen] = useState(false);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [includeWaiting, setIncludeWaiting] = useState(false);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState(null);
  const count = assigned + (includeWaiting ? waiting : 0);

  const send = async (e) => {
    e.preventDefault();
    if (!confirm(`Inviare l’email a ${count} ${count === 1 ? 'persona' : 'persone'}?`)) return;
    setSending(true);
    setResult(null);
    try {
      const r = await shiftsAPI.emailParticipants(sessionId, subject, message, includeWaiting);
      setResult({ ok: true, text: `✓ Inviata a ${r.data.sent} su ${r.data.total}${r.data.failed ? ` (${r.data.failed} non riuscite)` : ''}` });
      setSubject(''); setMessage('');
    } catch (err) {
      setResult({ ok: false, text: err.response?.data?.error || 'Invio non riuscito' });
    } finally { setSending(false); }
  };

  const field = { width: '100%', padding: '8px 10px', background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '7px', color: 'var(--text)', fontSize: '16px', boxSizing: 'border-box', fontFamily: 'inherit' };
  return (
    <div style={{ marginTop: '18px', paddingTop: '14px', borderTop: '1px solid var(--border)' }}>
      {!open ? (
        <button type="button" onClick={() => setOpen(true)}
          style={{ padding: '8px 14px', background: 'rgba(169,121,26,0.12)', color: 'var(--gold)', border: '1px solid rgba(169,121,26,0.35)', borderRadius: '7px', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', fontFamily: 'Atkinson Hyperlegible, system-ui, sans-serif' }}>
          📧 Scrivi agli iscritti
        </button>
      ) : (
        <form onSubmit={send} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', letterSpacing: '1px', textTransform: 'uppercase', margin: 0, fontWeight: 700 }}>📧 Scrivi agli iscritti</p>
          <input placeholder="Oggetto (es. Cambio orario)" value={subject} onChange={e => setSubject(e.target.value)} required style={field} />
          <textarea placeholder="Messaggio" rows={4} value={message} onChange={e => setMessage(e.target.value)} required style={field} />
          {waiting > 0 && (
            <label style={{ fontSize: '0.82rem', color: 'var(--text-muted)', display: 'flex', gap: '6px', alignItems: 'center' }}>
              <input type="checkbox" checked={includeWaiting} onChange={e => setIncludeWaiting(e.target.checked)} style={{ accentColor: 'var(--gold)' }} />
              Anche alla lista d’attesa ({waiting})
            </label>
          )}
          {result && <p style={{ fontSize: '0.82rem', margin: 0, color: result.ok ? 'var(--green)' : 'var(--red)' }}>{result.text}</p>}
          <div style={{ display: 'flex', gap: '8px' }}>
            <button type="submit" disabled={sending}
              style={{ flex: 1, padding: '9px', background: 'linear-gradient(135deg, var(--gold), var(--gold-light))', color: 'var(--on-gold)', border: '1px solid var(--gold)', borderRadius: '7px', fontWeight: 700, cursor: 'pointer', opacity: sending ? 0.6 : 1, fontFamily: 'Atkinson Hyperlegible, system-ui, sans-serif' }}>
              {sending ? 'Invio...' : `Invia a ${count}`}
            </button>
            <button type="button" onClick={() => { setOpen(false); setResult(null); }}
              style={{ padding: '9px 14px', background: 'rgba(217,201,158,0.35)', color: 'var(--text-muted)', border: '1px solid var(--border)', borderRadius: '7px', cursor: 'pointer' }}>Chiudi</button>
          </div>
        </form>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Sezione: Newsletter (solo a chi ha dato il consenso)
// ═══════════════════════════════════════════════════════════════════════════════
function NewsletterSection() {
  const [stats, setStats] = useState(null);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [target, setTarget] = useState('all');
  const [groupIds, setGroupIds] = useState([]);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState(null);
  const [inviteResult, setInviteResult] = useState(null);

  const load = () => adminAPI.getNewsletterStats().then(r => setStats(r.data)).catch(() => {});
  useEffect(() => { load(); }, []);

  const groups = stats?.groups || [];
  const selected = groups.filter(g => groupIds.includes(g.id));
  // Stima: chi sta in piu' tavoli selezionati riceve comunque una sola email (il server deduplica).
  const recipients = target === 'all' ? (stats?.subscribed ?? 0) : selected.reduce((a, g) => a + g.subscribed, 0); // sostituito sotto dal conteggio esatto
  const notSubscribed = stats ? stats.total - stats.subscribed : 0;
  const [listFilter, setListFilter] = useState('target');
  const users = stats?.users || [];
  // Chi rientra nel pubblico scelto (tutti, o membri dei tavoli selezionati)
  const inTarget = (u) => target === 'all' || u.group_ids.some(id => groupIds.includes(id));
  const shown = users.filter(u => listFilter === 'all' ? true : listFilter === 'yes' ? u.newsletter_opt_in : listFilter === 'no' ? !u.newsletter_opt_in : inTarget(u));
  const exactRecipients = users.filter(u => inTarget(u) && u.newsletter_opt_in).length;

  const send = async (test) => {
    if (!subject.trim() || !message.trim()) return setResult({ ok: false, text: 'Scrivi oggetto e messaggio' });
    if (target === 'groups' && groupIds.length === 0) return setResult({ ok: false, text: 'Scegli almeno un tavolo' });
    const dest = target === 'all' ? 'tutti gli iscritti alla newsletter' : `gli iscritti di: ${selected.map(g => g.name).join(', ')}`;
    if (!test && !confirm(`Inviare la newsletter a ${dest}?`)) return;
    setSending(true);
    setResult(null);
    try {
      const r = await adminAPI.sendNewsletter(subject, message, test, target === 'groups' ? groupIds : []);
      setResult({ ok: true, text: test ? '✓ Prova inviata alla tua email' : `✓ Inviata a ${r.data.sent} su ${r.data.total}${r.data.failed ? ` (${r.data.failed} non riuscite)` : ''}` });
      if (!test) { setSubject(''); setMessage(''); }
    } catch (err) {
      setResult({ ok: false, text: err.response?.data?.error || 'Invio non riuscito' });
    } finally { setSending(false); }
  };

  const sendInvite = async (test) => {
    if (!test && !confirm(`Inviare l’invito a ${notSubscribed} ${notSubscribed === 1 ? 'iscritto' : 'iscritti'} che non hanno ancora accettato la newsletter?`)) return;
    setSending(true);
    setInviteResult(null);
    try {
      const r = await adminAPI.sendNewsletterInvite(test);
      setInviteResult({ ok: true, text: test ? '✓ Prova inviata alla tua email' : `✓ Invito inviato a ${r.data.sent} su ${r.data.total}` });
    } catch (err) {
      setInviteResult({ ok: false, text: err.response?.data?.error || 'Invio non riuscito' });
    } finally { setSending(false); }
  };

  const card = { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '10px', padding: '20px', marginBottom: '22px' };
  const h2 = { fontFamily: 'Titan One, Luckiest Guy, fantasy', color: 'var(--gold)', margin: '0 0 6px', fontSize: '1.05rem' };
  const p = { fontSize: '0.82rem', color: 'var(--text-muted)', margin: '0 0 14px', lineHeight: 1.5 };
  const field = { width: '100%', padding: '9px 12px', background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '7px', color: 'var(--text)', fontSize: '16px', boxSizing: 'border-box', fontFamily: 'inherit' };
  const btn = { padding: '10px 16px', borderRadius: '8px', fontWeight: 700, cursor: 'pointer', fontFamily: 'Atkinson Hyperlegible, system-ui, sans-serif', opacity: sending ? 0.6 : 1 };
  const ghost = { ...btn, background: 'rgba(169,121,26,0.12)', color: 'var(--gold)', border: '1px solid rgba(169,121,26,0.35)' };
  const gold = { ...btn, flex: 1, background: 'linear-gradient(135deg, var(--gold), var(--gold-light))', color: 'var(--on-gold)', border: '1px solid var(--gold)' };
  const chip = (on) => ({ padding: '7px 14px', borderRadius: '20px', fontSize: '0.85rem', cursor: 'pointer', fontFamily: 'Atkinson Hyperlegible, system-ui, sans-serif', border: `1px solid ${on ? 'var(--gold)' : 'var(--border)'}`, background: on ? 'rgba(169,121,26,0.14)' : 'var(--bg-surface)', color: on ? 'var(--gold-deep)' : 'var(--text-muted)', fontWeight: on ? 700 : 400 });

  return (
    <div className="nl-layout">
    <div className="nl-main">
      {/* Invito al consenso, per chi era gia' iscritto prima della newsletter */}
      {notSubscribed > 0 && (
        <div className="bg-frame" style={{ ...card, borderColor: 'rgba(169,121,26,0.45)' }}>
          <h2 className="bg-cartouche" style={h2}>✉️ Invita a iscriversi</h2>
          <p style={p}>
            <strong>{notSubscribed}</strong> {notSubscribed === 1 ? 'iscritto non ha' : 'iscritti non hanno'} ancora accettato la newsletter.
            Ricevono un’email con il pulsante «Sì, voglio ricevere la newsletter»: un tocco e il consenso è registrato, senza entrare nel sito.
            Chi non risponde non riceverà nulla.
          </p>
          {inviteResult && <p style={{ fontSize: '0.85rem', margin: '0 0 10px', color: inviteResult.ok ? 'var(--green)' : 'var(--red)' }}>{inviteResult.text}</p>}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button type="button" disabled={sending} onClick={() => sendInvite(true)} style={ghost}>Mandami una prova</button>
            <button type="button" disabled={sending} onClick={() => sendInvite(false)} style={gold}>Invia l’invito a {notSubscribed}</button>
          </div>
        </div>
      )}

      <div className="bg-frame" style={card}>
        <h2 className="bg-cartouche" style={h2}>📜 Newsletter</h2>
        <p style={p}>
          {stats ? <><strong>{stats.subscribed}</strong> iscritti su {stats.total} hanno scelto di riceverla. </> : null}
          Parte solo a chi ha dato il consenso; ogni email ha il link per disiscriversi.
        </p>

        <p style={{ ...p, margin: '0 0 8px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', fontSize: '0.72rem' }}>A chi</p>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '10px' }}>
          <button type="button" onClick={() => setTarget('all')} style={chip(target === 'all')}>Tutti gli iscritti</button>
          <button type="button" onClick={() => setTarget('groups')} style={chip(target === 'groups')}>Solo alcuni tavoli</button>
        </div>
        {target === 'groups' && (
          groups.length === 0
            ? <p style={p}>Non hai ancora creato tavoli: falli dalla tab 👥 Gruppi.</p>
            : <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '14px' }}>
                {groups.map(g => {
                  const on = groupIds.includes(g.id);
                  return (
                    <button key={g.id} type="button" onClick={() => setGroupIds(ids => on ? ids.filter(i => i !== g.id) : [...ids, g.id])} style={chip(on)}
                      title={`${g.subscribed} su ${g.members} hanno accettato la newsletter`}>
                      {on ? '✓ ' : ''}{g.name} <span style={{ opacity: 0.7 }}>· {g.subscribed}/{g.members}</span>
                    </button>
                  );
                })}
              </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <input placeholder="Oggetto" value={subject} onChange={e => setSubject(e.target.value)} style={field} />
          <textarea placeholder="Messaggio (es. le sessioni del prossimo mese)" rows={8} value={message} onChange={e => setMessage(e.target.value)} style={field} />
          {result && <p style={{ fontSize: '0.85rem', margin: 0, color: result.ok ? 'var(--green)' : 'var(--red)' }}>{result.text}</p>}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button type="button" disabled={sending} onClick={() => send(true)} style={ghost}>Mandami una prova</button>
            <button type="button" disabled={sending || !exactRecipients} onClick={() => send(false)} style={gold}>
              {sending ? 'Invio...' : target === 'all' ? `Invia a ${recipients} iscritti` : `Invia ai tavoli scelti (${exactRecipients})`}
            </button>
          </div>
          {target === 'groups' && <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)', margin: 0 }}>Il numero accanto a ogni tavolo indica quanti hanno accettato la newsletter su quanti membri. Chi è in più tavoli riceve una sola email.</p>}
        </div>
      </div>
    </div>

    {/* Destinatari: chi ha accettato e chi no */}
    <aside className="nl-side bg-frame" style={{ ...card, padding: '18px' }}>
      <h2 className="bg-cartouche" style={h2}>📬 Destinatari</h2>
      <p style={{ ...p, margin: '0 0 10px' }}>
        {target === 'all' ? 'Pubblico: tutti gli iscritti.' : selected.length ? `Pubblico: ${selected.map(g => g.name).join(', ')}.` : 'Scegli almeno un tavolo.'}{' '}
        Riceveranno la newsletter <strong>{exactRecipients}</strong> {exactRecipients === 1 ? 'persona' : 'persone'} (solo chi ha accettato).
      </p>
      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '10px' }}>
        {[['target', 'Pubblico scelto'], ['yes', '✓ Accettato'], ['no', '✗ Non ancora'], ['all', 'Tutti']].map(([v, l]) => (
          <button key={v} type="button" onClick={() => setListFilter(v)} style={{ ...chip(listFilter === v), padding: '5px 11px', fontSize: '0.78rem' }}>{l}</button>
        ))}
      </div>
      <div className="nl-list">
        {shown.length === 0 && <p style={{ ...p, margin: '8px 0' }}>Nessuno in questo elenco.</p>}
        {shown.map(u => {
          const gets = u.newsletter_opt_in && inTarget(u);
          return (
            <div key={u.id} className={`nl-row ${gets ? 'nl-row-on' : ''}`} title={gets ? 'Riceverà questa newsletter' : u.newsletter_opt_in ? 'Ha accettato, ma non è nel pubblico scelto' : 'Non ha ancora accettato la newsletter'}>
              <span className={`nl-dot ${u.newsletter_opt_in ? 'nl-dot-yes' : 'nl-dot-no'}`} aria-hidden>{u.newsletter_opt_in ? '✓' : '✗'}</span>
              <span style={{ minWidth: 0 }}>
                <span className="nl-name">{u.name}</span>
                <span className="nl-email">{u.email}</span>
              </span>
              {gets && <span className="nl-tag">riceve</span>}
            </div>
          );
        })}
      </div>
      <p style={{ fontSize: '0.72rem', color: 'var(--text-dim)', margin: '10px 0 0' }}>
        ✓ ha accettato la newsletter · ✗ non ancora (riceve solo gli avvisi delle sessioni a cui è iscritto).
      </p>
    </aside>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Sezione: Sessioni (con vista Settimana / Mese)
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
    has_pizza: false,
    visible_to_all: true,
    group_ids: [],
  });

  const [groups, setGroups] = useState([]);
  const [heroes, setHeroes] = useState([]);
  const [allSessions, setAllSessions] = useState([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [rangeMode, setRangeMode] = useState('mese'); // 'settimana' | 'mese'
  const [weekStart, setWeekStart] = useState(() => getWeekStart(new Date()));
  const [calMonth, setCalMonth] = useState(() => {
    const n = new Date();
    return { year: n.getFullYear(), month: n.getMonth() };
  });
  const [editingSession, setEditingSession] = useState(null);
  const [editData, setEditData] = useState({});
  const [savingEdit, setSavingEdit] = useState(false);
  const [detailSession, setDetailSession] = useState(null);
  const [heroesFailed, setHeroesFailed] = useState(false);
  const [sessionsError, setSessionsError] = useState('');

  const loadHeroes = useCallback(() => {
    setHeroesFailed(false);
    adminAPI.getUsers()
      .then(res => setHeroes(res.data))
      .catch(() => setHeroesFailed(true));
  }, []);

  useEffect(() => {
    groupsAPI.getGroups().then(res => setGroups(res.data)).catch(() => {});
    loadHeroes();
  }, [loadHeroes]);

  useEffect(() => {
    if (locations.length > 0 && !formData.location_id) {
      setFormData(p => ({ ...p, location_id: String(locations[0].id) }));
    }
  }, [locations]);

  const loadSessions = useCallback(async () => {
    setSessionsLoading(true);
    setSessionsError('');
    try { const res = await shiftsAPI.getShifts(); setAllSessions(res.data); }
    catch { setSessionsError('Non riesco a caricare le sessioni. Il server potrebbe essersi appena riavviato.'); }
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
      visible_to_all: s.visible_to_all !== false,
      group_ids: (s.groups || []).map(g => g.id),
    });
  };

  const handleEditChange = (e) => {
    const { name, value, type, checked } = e.target;
    setEditData(p => ({
      ...p,
      [name]: type === 'checkbox' ? checked : (['required_count', 'duration'].includes(name) ? parseFloat(value) : value),
    }));
  };

  const toggleEditGroup = (groupId) => {
    setEditData(p => ({
      ...p,
      group_ids: p.group_ids.includes(groupId) ? p.group_ids.filter(id => id !== groupId) : [...p.group_ids, groupId],
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
        visible_to_all: editData.visible_to_all,
        group_ids: editData.group_ids,
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

  // ── Filtri settimana / mese ─────────────────────────────────────────────
  const weekEnd = addDays(weekStart, 6);
  const weekSessions = allSessions.filter(s => {
    const d = new Date(s.start_time);
    return d >= weekStart && d <= new Date(weekEnd.getFullYear(), weekEnd.getMonth(), weekEnd.getDate(), 23, 59, 59);
  }).sort((a, b) => new Date(a.start_time) - new Date(b.start_time));

  const monthSessionsAdmin = allSessions.filter(s => {
    const d = new Date(s.start_time);
    return d.getFullYear() === calMonth.year && d.getMonth() === calMonth.month;
  }).sort((a, b) => new Date(a.start_time) - new Date(b.start_time));

  const visibleSessions = rangeMode === 'settimana' ? weekSessions : monthSessionsAdmin;

  // ── Resoconto per trimestre: sessioni + iscritti aggregati per Q1-Q4 ──
  const quarterlyData = (() => {
    const map = {};
    allSessions.forEach(s => {
      const d = new Date(s.start_time);
      const q = Math.floor(d.getMonth() / 3) + 1;
      const key = `${d.getFullYear()}-Q${q}`;
      if (!map[key]) map[key] = { year: d.getFullYear(), quarter: q, total: 0, cancelled: 0, active: 0, enrolled: 0, fillSum: 0 };
      map[key].total += 1;
      if (s.cancelled) {
        map[key].cancelled += 1;
      } else {
        map[key].active += 1;
        map[key].enrolled += s.assigned_count;
        map[key].fillSum += Math.min(1, s.assigned_count / (s.required_count || 1));
      }
    });
    return Object.values(map).sort((a, b) => a.year - b.year || a.quarter - b.quarter);
  })();

  const prevWeek = () => setWeekStart(w => addDays(w, -7));
  const nextWeek = () => setWeekStart(w => addDays(w, 7));
  const goCurrentWeek = () => setWeekStart(getWeekStart(new Date()));
  const isCurrentWeek = getWeekStart(new Date()).getTime() === weekStart.getTime();

  const MONTHS_IT = ['Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno','Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre'];
  const prevMonth = () => setCalMonth(({ year, month }) => month === 0 ? { year: year - 1, month: 11 } : { year, month: month - 1 });
  const nextMonth = () => setCalMonth(({ year, month }) => month === 11 ? { year: year + 1, month: 0 } : { year, month: month + 1 });
  const goCurrentMonth = () => { const n = new Date(); setCalMonth({ year: n.getFullYear(), month: n.getMonth() }); };
  const isCurrentMonth = (() => { const n = new Date(); return n.getFullYear() === calMonth.year && n.getMonth() === calMonth.month; })();

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
      visible_to_all: formData.visible_to_all,
      group_ids: formData.group_ids,
    };
  };

  const toggleFormGroup = (groupId) => {
    setFormData(p => ({
      ...p,
      group_ids: p.group_ids.includes(groupId) ? p.group_ids.filter(id => id !== groupId) : [...p.group_ids, groupId],
    }));
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
      setFormData(p => ({ ...p, date: '', start_hour: '09:00', duration: 2, required_count: 1, has_pizza: false, visible_to_all: true, group_ids: [] }));
      await loadSessions();
    } catch (err) {
      alert(err.response?.data?.error || 'Errore nella creazione della sessione');
    } finally { setSubmitting(false); }
  };

  const fmt = dt => new Date(dt).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
  const fmtDay = dt => new Date(dt).toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'short' });

  const cardSty = { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '10px', padding: '20px', marginBottom: '20px' };
  const btnGold = { background: 'linear-gradient(135deg, var(--gold), var(--gold-light))', color: 'var(--on-gold)', border: '1px solid var(--gold)', borderRadius: '7px', fontFamily: 'Atkinson Hyperlegible, system-ui, sans-serif', fontWeight: 700, fontSize: '0.82rem', padding: '8px 16px', cursor: 'pointer' };
  const btnGreen = { ...btnGold, background: 'linear-gradient(135deg, var(--green), var(--green-light))', color: 'var(--on-gold)', border: '1px solid rgba(47,125,58,0.6)' };
  const btnGray = { background: 'rgba(217,201,158,0.35)', color: 'var(--text-muted)', border: '1px solid var(--border)', borderRadius: '7px', padding: '8px 14px', cursor: 'pointer', fontSize: '0.82rem' };

  // ── Rendering condiviso di una riga sessione ────────────────────────────
  const renderSessionRow = (s) => {
    const isCancelled = !!s.cancelled;

    if (editingSession === s.id) {
      return (
        <div key={s.id} style={{ border: '1px solid rgba(169,121,26,0.4)', background: 'rgba(169,121,26,0.05)', borderRadius: '8px', padding: '12px' }}>
          <p style={{ fontSize: '0.75rem', fontFamily: 'Atkinson Hyperlegible, system-ui, sans-serif', color: 'var(--gold)', marginBottom: '10px' }}>✏️ Modifica sessione</p>
          <div className="form-grid-2" style={{ marginBottom: '8px' }}>
            <div style={{ gridColumn: '1/-1' }}>
              <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'Atkinson Hyperlegible, system-ui, sans-serif' }}>Location</label>
              <select name="location_id" value={editData.location_id} onChange={handleEditChange} style={{ ...IS, padding: '6px 10px', fontSize: '0.85rem', marginTop: '3px' }}>
                {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            </div>
            {[['date','Data','date'],['start_hour','Ora inizio','time'],['duration','Durata (ore)','number'],['required_count','Avv. massimi','number']].map(([name,label,type]) => (
              <div key={name}>
                <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'Atkinson Hyperlegible, system-ui, sans-serif' }}>{label}</label>
                <input type={type} name={name} value={editData[name]} onChange={handleEditChange}
                  min={type==='number'?'0.5':undefined} step={name==='duration'?'0.5':undefined}
                  style={{ ...IS, padding: '6px 10px', fontSize: '0.85rem', marginTop: '3px' }} />
              </div>
            ))}
            <div style={{ gridColumn: '1/-1', display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
              <input type="checkbox" name="has_pizza" checked={!!editData.has_pizza} onChange={handleEditChange}
                style={{ width: '16px', height: '16px', accentColor: 'var(--gold)' }} />
              <label style={{ fontFamily: 'Atkinson Hyperlegible, system-ui, sans-serif', color: 'var(--gold)', fontSize: '0.82rem' }}>🍕 Pizza inclusa</label>
            </div>
            <div style={{ gridColumn: '1/-1', marginTop: '6px', padding: '10px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '7px' }}>
              <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'Atkinson Hyperlegible, system-ui, sans-serif', display: 'block', marginBottom: '6px' }}>👁 Visibilità</label>
              <div style={{ display: 'flex', gap: '14px', marginBottom: editData.visible_to_all ? 0 : '8px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer', fontSize: '0.8rem', color: 'var(--text)' }}>
                  <input type="radio" checked={!!editData.visible_to_all} onChange={() => setEditData(p => ({ ...p, visible_to_all: true }))} style={{ accentColor: 'var(--gold)' }} />
                  Tutti
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer', fontSize: '0.8rem', color: 'var(--text)' }}>
                  <input type="radio" checked={!editData.visible_to_all} onChange={() => setEditData(p => ({ ...p, visible_to_all: false }))} style={{ accentColor: 'var(--gold)' }} />
                  Solo gruppi
                </label>
              </div>
              {!editData.visible_to_all && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {groups.map(g => (
                    <label key={g.id} style={{
                      display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer',
                      fontSize: '0.75rem', padding: '3px 8px', borderRadius: '10px',
                      background: (editData.group_ids || []).includes(g.id) ? 'rgba(169,121,26,0.16)' : 'var(--bg-surface)',
                      border: `1px solid ${(editData.group_ids || []).includes(g.id) ? 'var(--gold)' : 'var(--border)'}`,
                      color: (editData.group_ids || []).includes(g.id) ? 'var(--gold)' : 'var(--text-muted)',
                    }}>
                      <input type="checkbox" checked={(editData.group_ids || []).includes(g.id)} onChange={() => toggleEditGroup(g.id)} style={{ accentColor: 'var(--gold)' }} />
                      {g.name}
                    </label>
                  ))}
                </div>
              )}
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

    const waitingCount = s.waiting_count || 0;

    return (
      <div
        key={s.id}
        onClick={() => setDetailSession(s)}
        title="Clicca per vedere gli iscritti"
        style={{
          border: '1px solid var(--border)',
          background: isCancelled ? 'rgba(169,121,26,0.06)' : 'var(--bg-page)',
          borderRadius: '8px', padding: '10px 12px',
          opacity: isCancelled ? 0.75 : 1,
          cursor: 'pointer',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px', flexWrap: 'wrap' }}>
              <span style={{ fontFamily: 'Titan One, Luckiest Guy, fantasy', fontWeight: 700, fontSize: '0.88rem', color: isCancelled ? 'var(--text-dim)' : 'var(--gold)', textDecoration: isCancelled ? 'line-through' : 'none' }}>
                {s.location_name}
              </span>
              <span style={{ fontSize: '0.7rem', padding: '1px 7px', borderRadius: '10px', background: 'rgba(169,121,26,0.10)', color: 'var(--text-muted)' }}>
                {isCancelled ? 'Annullata' : s.assigned_count === 0 ? 'Nessun avventuriero' : `${s.assigned_count}/${s.required_count} ✓`}
              </span>
              {waitingCount > 0 && !isCancelled && (
                <span style={{ fontSize: '0.7rem', padding: '1px 7px', borderRadius: '10px', background: 'rgba(169,121,26,0.14)', color: 'var(--red)' }}>
                  ⏳ {waitingCount} in attesa
                </span>
              )}
              {s.has_pizza && <span className="pizza-badge">🍕</span>}
              {s.visible_to_all === false && (
                <span style={{ fontSize: '0.7rem', padding: '1px 7px', borderRadius: '10px', background: 'rgba(36,85,164,0.12)', color: 'var(--green)' }} title={(s.groups || []).map(g => g.name).join(', ')}>
                  🔒 {(s.groups || []).map(g => g.name).join(', ') || 'gruppo'}
                </span>
              )}
            </div>
            <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              {fmtDay(s.start_time)} · {fmt(s.start_time)}–{fmt(s.end_time)}
            </p>
            {!isCancelled && (
              <div style={{ marginTop: '6px', maxWidth: '200px' }}>
                <FillBar current={s.assigned_count} total={s.required_count} height={6} />
              </div>
            )}
            {(s.assigned_users || []).length > 0 && (
              <p style={{ margin: '4px 0 0', fontSize: '0.72rem', color: 'var(--text-dim)' }}>⚔️ {s.assigned_users.map(u => u.seats > 1 ? `${u.name} (${u.seats})` : u.name).join(', ')}</p>
            )}
          </div>
          <div onClick={e => e.stopPropagation()} style={{ display: 'flex', gap: '4px', marginLeft: '8px', flexShrink: 0 }}>
            {!isCancelled && (
              <button onClick={() => startEditSession(s)} title="Modifica"
                style={{ width: '30px', height: '30px', borderRadius: '6px', background: 'var(--bg-card)', border: '1px solid var(--border)', cursor: 'pointer', fontSize: '0.85rem' }}>✏️</button>
            )}
            <button onClick={() => handleCancelSession(s)} title={isCancelled ? 'Riattiva' : 'Annulla sessione'}
              style={{ width: '30px', height: '30px', borderRadius: '6px', background: 'var(--bg-card)', border: '1px solid var(--border)', cursor: 'pointer', fontSize: '0.85rem' }}>
              {isCancelled ? '↩️' : '🚫'}
            </button>
            <button onClick={() => handleDeleteSession(s.id)} title="Elimina"
              style={{ width: '30px', height: '30px', borderRadius: '6px', background: 'var(--bg-card)', border: '1px solid var(--border)', cursor: 'pointer', fontSize: '0.85rem' }}>🗑️</button>
          </div>
        </div>
      </div>
    );
  };

  // ── KPI sul periodo visualizzato (settimana o mese) ─────────────────────
  const activeVisible = visibleSessions.filter(s => !s.cancelled);
  const kpiSessionCount = activeVisible.length;
  const kpiFillPercent = activeVisible.length > 0
    ? Math.round(
        activeVisible.reduce((sum, s) => sum + Math.min(1, s.assigned_count / (s.required_count || 1)), 0)
        / activeVisible.length * 100
      )
    : 0;
  const kpiColor = kpiFillPercent >= 80
    ? { bg: 'rgba(47,125,58,0.12)', text: 'var(--green)', border: 'rgba(47,125,58,0.3)' }
    : kpiFillPercent >= 50
    ? { bg: 'rgba(169,121,26,0.12)', text: 'var(--red)', border: 'rgba(169,121,26,0.3)' }
    : { bg: 'rgba(179,38,30,0.10)', text: 'var(--red)', border: 'rgba(179,38,30,0.25)' };

  return (
    <div>
      <SessionDetailModal session={detailSession} onClose={() => setDetailSession(null)} heroes={heroes} heroesFailed={heroesFailed} onReloadHeroes={loadHeroes} onRefresh={loadSessions} />

      {/* ── Crea sessione ── */}
      <div style={cardSty}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 style={{ margin: 0, fontFamily: 'Titan One, Luckiest Guy, fantasy', color: 'var(--gold)', fontSize: '1.05rem' }}>⚔️ Sessioni</h2>
          <button onClick={() => setShowForm(!showForm)} style={showForm ? btnGray : btnGold}>
            {showForm ? '❌ Annulla' : '➕ Nuova Sessione'}
          </button>
        </div>

        {showForm && (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px', padding: '16px', background: 'var(--bg-surface)', borderRadius: '8px', border: '1px solid var(--border)' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontFamily: 'Atkinson Hyperlegible, system-ui, sans-serif', color: 'var(--text-muted)', marginBottom: '5px' }}>📍 Location</label>
              <select name="location_id" value={formData.location_id} onChange={handleChange} required style={IS}>
                {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            </div>

            <div className="form-grid-3">
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontFamily: 'Atkinson Hyperlegible, system-ui, sans-serif', color: 'var(--text-muted)', marginBottom: '5px' }}>📅 Data</label>
                <input type="date" name="date" value={formData.date} onChange={handleChange} required style={IS} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontFamily: 'Atkinson Hyperlegible, system-ui, sans-serif', color: 'var(--text-muted)', marginBottom: '5px' }}>🕐 Ora inizio</label>
                <input type="time" name="start_hour" value={formData.start_hour} onChange={handleChange} required style={IS} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontFamily: 'Atkinson Hyperlegible, system-ui, sans-serif', color: 'var(--text-muted)', marginBottom: '5px' }}>⏱ Durata (ore)</label>
                <input type="number" name="duration" min="0.5" step="0.5" value={formData.duration} onChange={handleChange} required style={IS} />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontFamily: 'Atkinson Hyperlegible, system-ui, sans-serif', color: 'var(--text-muted)', marginBottom: '5px' }}>⚔️ Avventurieri massimi</label>
              <input type="number" name="required_count" min="1" value={formData.required_count} onChange={handleChange} style={{ ...IS, width: '140px' }} />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', background: 'rgba(169,121,26,0.08)', border: '1px solid rgba(169,121,26,0.2)', borderRadius: '8px' }}>
              <input type="checkbox" id="has_pizza" name="has_pizza" checked={formData.has_pizza} onChange={handleChange}
                style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: 'var(--gold)' }} />
              <label htmlFor="has_pizza" style={{ fontFamily: 'Atkinson Hyperlegible, system-ui, sans-serif', color: 'var(--gold)', fontSize: '0.9rem', cursor: 'pointer', userSelect: 'none' }}>
                🍕 Pizza inclusa in questa sessione
              </label>
            </div>

            {/* 👁 Visibilità: tutti oppure solo gruppi selezionati */}
            <div style={{ padding: '12px 14px', background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '8px' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontFamily: 'Atkinson Hyperlegible, system-ui, sans-serif', color: 'var(--text-muted)', marginBottom: '8px' }}>👁 Visibilità sessione</label>
              <div style={{ display: 'flex', gap: '16px', marginBottom: formData.visible_to_all ? 0 : '10px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '0.85rem', color: 'var(--text)' }}>
                  <input type="radio" name="visibility" checked={formData.visible_to_all}
                    onChange={() => setFormData(p => ({ ...p, visible_to_all: true }))}
                    style={{ accentColor: 'var(--gold)' }} />
                  Tutti gli eroi
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '0.85rem', color: 'var(--text)' }}>
                  <input type="radio" name="visibility" checked={!formData.visible_to_all}
                    onChange={() => setFormData(p => ({ ...p, visible_to_all: false }))}
                    style={{ accentColor: 'var(--gold)' }} />
                  Solo gruppi selezionati
                </label>
              </div>
              {!formData.visible_to_all && (
                groups.length === 0 ? (
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-dim)', margin: 0 }}>Non hai ancora creato gruppi — vai nella tab "Gruppi" per crearne uno.</p>
                ) : (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {groups.map(g => (
                      <label key={g.id} style={{
                        display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer',
                        fontSize: '0.8rem', padding: '4px 10px', borderRadius: '12px',
                        background: formData.group_ids.includes(g.id) ? 'rgba(169,121,26,0.16)' : 'var(--bg-card)',
                        border: `1px solid ${formData.group_ids.includes(g.id) ? 'var(--gold)' : 'var(--border)'}`,
                        color: formData.group_ids.includes(g.id) ? 'var(--gold)' : 'var(--text-muted)',
                      }}>
                        <input type="checkbox" checked={formData.group_ids.includes(g.id)} onChange={() => toggleFormGroup(g.id)}
                          style={{ accentColor: 'var(--gold)' }} />
                        {g.name}
                      </label>
                    ))}
                  </div>
                )
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <input type="checkbox" id="repeat" checked={repeat} onChange={e => setRepeat(e.target.checked)} style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: 'var(--gold)' }} />
              <label htmlFor="repeat" style={{ fontFamily: 'Atkinson Hyperlegible, system-ui, sans-serif', color: 'var(--text-muted)', fontSize: '0.85rem', cursor: 'pointer' }}>Sessione ripetitiva (settimanale)</label>
            </div>
            {repeat && (
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontFamily: 'Atkinson Hyperlegible, system-ui, sans-serif', color: 'var(--text-muted)', marginBottom: '5px' }}>Numero di settimane</label>
                <input type="number" min="1" max="52" value={weeks} onChange={e => setWeeks(parseInt(e.target.value))} style={{ ...IS, width: '100px' }} />
                <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '4px' }}>Verranno create {weeks} sessioni.</p>
              </div>
            )}

            <button type="submit" disabled={submitting} style={{ ...btnGreen, padding: '11px', fontSize: '0.9rem', opacity: submitting ? 0.6 : 1 }}>
              {submitting ? 'Creazione in corso...' : `⚔️ Crea Sessione${repeat ? ` (×${weeks})` : ''}`}
            </button>
          </form>
        )}
      </div>

      {/* ── KPI del periodo (solo settimana/mese) ── */}
      {rangeMode !== 'trimestre' && (
        <div className="kpi-grid-2" style={{ marginBottom: '16px' }}>
          <div style={{ padding: '14px', borderRadius: '10px', background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-muted)', fontFamily: 'Atkinson Hyperlegible, system-ui, sans-serif' }}>
              Sessioni {rangeMode === 'settimana' ? 'della settimana' : 'del mese'}
            </p>
            <p style={{ margin: '4px 0 0', fontSize: '1.8rem', fontWeight: 900, color: 'var(--gold)', fontFamily: 'Atkinson Hyperlegible, system-ui, sans-serif' }}>{kpiSessionCount}</p>
          </div>
          <div style={{ padding: '14px', borderRadius: '10px', background: kpiColor.bg, border: `1px solid ${kpiColor.border}` }}>
            <p style={{ margin: 0, fontSize: '0.78rem', color: kpiColor.text, fontFamily: 'Atkinson Hyperlegible, system-ui, sans-serif' }}>% riempimento medio</p>
            <p style={{ margin: '4px 0 0', fontSize: '1.8rem', fontWeight: 900, color: kpiColor.text, fontFamily: 'Atkinson Hyperlegible, system-ui, sans-serif' }}>{kpiFillPercent}%</p>
          </div>
        </div>
      )}

      {/* ── Lista sessioni: settimana, mese o trimestre ── */}
      <div style={cardSty}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
          <h2 style={{ margin: 0, fontFamily: 'Titan One, Luckiest Guy, fantasy', color: 'var(--gold)', fontSize: '1rem' }}>
            📋 {rangeMode === 'settimana' ? 'Sessioni della settimana' : rangeMode === 'mese' ? 'Sessioni del mese' : 'Resoconto per trimestre'}
          </h2>

          {/* Toggle Settimana / Mese / Trimestre */}
          <div style={{ display: 'flex', gap: '4px', background: 'var(--bg-surface)', padding: '3px', borderRadius: '8px', border: '1px solid var(--border)' }}>
            {['settimana', 'mese', 'trimestre'].map(mode => (
              <button key={mode} onClick={() => setRangeMode(mode)} style={{
                padding: '5px 14px', borderRadius: '6px', fontSize: '0.78rem', fontFamily: 'Atkinson Hyperlegible, system-ui, sans-serif', fontWeight: 600,
                background: rangeMode === mode ? 'linear-gradient(135deg, var(--gold), var(--gold-light))' : 'transparent',
                color: rangeMode === mode ? 'var(--bg-card)' : 'var(--text-muted)', border: 'none', cursor: 'pointer',
              }}>
                {mode === 'settimana' ? 'Settimana' : mode === 'mese' ? 'Mese' : 'Trimestre'}
              </button>
            ))}
          </div>
        </div>

        {sessionsError && (
          <div style={{ background: 'rgba(179,38,30,0.10)', border: '1px solid rgba(179,38,30,0.3)', color: 'var(--red)', padding: '12px', borderRadius: '8px', marginBottom: '14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.85rem' }}>{sessionsError}</span>
            <button type="button" onClick={loadSessions} disabled={sessionsLoading}
              style={{ padding: '6px 14px', borderRadius: '7px', background: 'rgba(179,38,30,0.12)', color: 'var(--red)', border: '1px solid rgba(179,38,30,0.35)', cursor: sessionsLoading ? 'default' : 'pointer', fontWeight: 700, fontSize: '0.8rem', fontFamily: 'Atkinson Hyperlegible, system-ui, sans-serif', flexShrink: 0, opacity: sessionsLoading ? 0.5 : 1 }}>
              {sessionsLoading ? '⏳ Riprovo...' : '🔄 Riprova'}
            </button>
          </div>
        )}

        {rangeMode === 'trimestre' ? (
          sessionsLoading ? (
            <p style={{ color: 'var(--text-muted)', fontFamily: 'Atkinson Hyperlegible, system-ui, sans-serif', textAlign: 'center', padding: '20px' }}>Caricamento...</p>
          ) : quarterlyData.length === 0 ? (
            <p style={{ color: 'var(--text-dim)', textAlign: 'center', padding: '24px', fontFamily: 'Atkinson Hyperlegible, system-ui, sans-serif' }}>Nessuna sessione nel periodo disponibile.</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', fontSize: '0.85rem', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    {['Trimestre', 'Sessioni attive', 'Annullate', 'Iscritti totali', 'Riempimento medio'].map(h => (
                      <th key={h} style={{ padding: '0 12px 8px 0', textAlign: h === 'Trimestre' ? 'left' : 'center', color: 'var(--text-muted)', fontFamily: 'Atkinson Hyperlegible, system-ui, sans-serif', fontSize: '0.7rem', letterSpacing: '1px' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {quarterlyData.map(q => {
                    const avgFill = q.active > 0 ? Math.round((q.fillSum / q.active) * 100) : 0;
                    return (
                      <tr key={`${q.year}-${q.quarter}`} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '10px 12px 10px 0', fontFamily: 'Atkinson Hyperlegible, system-ui, sans-serif', fontWeight: 700, color: 'var(--gold)' }}>Q{q.quarter} {q.year}</td>
                        <td style={{ padding: '10px 12px', textAlign: 'center', color: 'var(--green)', fontWeight: 600 }}>{q.active}</td>
                        <td style={{ padding: '10px 12px', textAlign: 'center', color: 'var(--red)' }}>{q.cancelled}</td>
                        <td style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 700, color: 'var(--text)' }}>{q.enrolled}</td>
                        <td style={{ padding: '10px 0', textAlign: 'center', color: 'var(--gold)', fontWeight: 700 }}>{avgFill}%</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <p style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: '10px', fontStyle: 'italic' }}>
                Copre le sessioni attualmente caricate (circa 3 mesi indietro, 9 in avanti da oggi).
              </p>
            </div>
          )
        ) : (
          <>
            {/* Navigazione */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '14px' }}>
              {rangeMode === 'settimana' ? (
                <>
                  <button onClick={prevWeek} style={{ ...btnGray, padding: '4px 10px' }}>‹</button>
                  <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', minWidth: '150px', textAlign: 'center', fontFamily: 'Atkinson Hyperlegible, system-ui, sans-serif' }}>
                    {fmtShortDate(weekStart)} – {fmtShortDate(weekEnd)}
                  </span>
                  <button onClick={nextWeek} style={{ ...btnGray, padding: '4px 10px' }}>›</button>
                  {!isCurrentWeek && (
                    <button onClick={goCurrentWeek} style={{ ...btnGold, padding: '4px 10px', fontSize: '0.75rem' }}>Questa sett.</button>
                  )}
                </>
              ) : (
                <>
                  <button onClick={prevMonth} style={{ ...btnGray, padding: '4px 10px' }}>‹</button>
                  <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', minWidth: '150px', textAlign: 'center', fontFamily: 'Atkinson Hyperlegible, system-ui, sans-serif' }}>
                    {MONTHS_IT[calMonth.month]} {calMonth.year}
                  </span>
                  <button onClick={nextMonth} style={{ ...btnGray, padding: '4px 10px' }}>›</button>
                  {!isCurrentMonth && (
                    <button onClick={goCurrentMonth} style={{ ...btnGold, padding: '4px 10px', fontSize: '0.75rem' }}>Questo mese</button>
                  )}
                </>
              )}
            </div>

            {sessionsLoading ? (
              <p style={{ color: 'var(--text-muted)', fontFamily: 'Atkinson Hyperlegible, system-ui, sans-serif', textAlign: 'center', padding: '20px' }}>Caricamento...</p>
            ) : visibleSessions.length === 0 ? (
              <p style={{ color: 'var(--text-dim)', textAlign: 'center', padding: '24px', fontFamily: 'Atkinson Hyperlegible, system-ui, sans-serif' }}>
                Nessuna sessione {rangeMode === 'settimana' ? 'questa settimana' : 'questo mese'}.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {visibleSessions.map(renderSessionRow)}
              </div>
            )}
          </>
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
  const [resetHero, setResetHero] = useState(null);
  const [newPwd, setNewPwd] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [savingPwd, setSavingPwd] = useState(false);
  const [pwdDone, setPwdDone] = useState(false);
  const [renameHero, setRenameHero] = useState(null);
  const [newName, setNewName] = useState('');
  const [savingName, setSavingName] = useState(false);

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

  const openReset = (hero) => { setResetHero(hero); setNewPwd(''); setShowPwd(false); setPwdDone(false); };
  const closeReset = () => { setResetHero(null); setNewPwd(''); setPwdDone(false); setLinkMsg(null); };

  const openRename = (hero) => { setRenameHero(hero); setNewName(hero.name); };
  const closeRename = () => { setRenameHero(null); setNewName(''); };

  const handleRename = async (e) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setSavingName(true);
    try {
      await adminAPI.updateUserName(renameHero.id, newName.trim());
      setHeroes(prev => prev.map(u => u.id === renameHero.id ? { ...u, name: newName.trim() } : u));
      closeRename();
    } catch (err) {
      alert(err.response?.data?.error || 'Errore nel rinominare l\'eroe');
    } finally { setSavingName(false); }
  };

  const generateRandomPwd = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
    let pwd = '';
    for (let i = 0; i < 10; i++) pwd += chars[Math.floor(Math.random() * chars.length)];
    setNewPwd(pwd);
    setShowPwd(true);
  };

  const [linkMsg, setLinkMsg] = useState(null);
  const [sendingLink, setSendingLink] = useState(false);
  const handleSendLink = async () => {
    setSendingLink(true);
    setLinkMsg(null);
    try {
      const r = await adminAPI.sendResetLink(resetHero.id);
      setLinkMsg({ ok: true, text: r.data.message });
    } catch (err) {
      setLinkMsg({ ok: false, text: err.response?.data?.error || 'Invio non riuscito' });
    } finally { setSendingLink(false); }
  };

  const handleResetPwd = async (e) => {
    e.preventDefault();
    if (newPwd.length < 6) { alert('La password deve essere di almeno 6 caratteri'); return; }
    setSavingPwd(true);
    try {
      await adminAPI.resetUserPassword(resetHero.id, newPwd);
      setPwdDone(true);
    } catch (err) {
      alert(err.response?.data?.error || 'Errore nel reset della password');
    } finally { setSavingPwd(false); }
  };

  const inputSty = {
    width: '100%', padding: '9px 12px', backgroundColor: 'var(--bg-surface)',
    border: '1px solid var(--border)', borderRadius: '7px', color: 'var(--text)',
    fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box',
  };

  return (
    <div className="bg-frame" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '10px', padding: '20px' }}>
      <h2 className="bg-cartouche" style={{ fontFamily: 'Titan One, Luckiest Guy, fantasy', color: 'var(--gold)', margin: '0 0 6px', fontSize: '1.05rem' }}>🧙 Eroi registrati</h2>
      <p style={{ fontSize: '0.78rem', color: 'var(--text-dim)', margin: '0 0 16px' }}>
        Promuovi un eroe ad admin con "→ Admin", oppure reimposta la sua password con 🔑.
      </p>
      {loading ? <p style={{ color: 'var(--text-muted)', fontFamily: 'Atkinson Hyperlegible, system-ui, sans-serif' }}>Caricamento...</p> : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', fontSize: '0.88rem', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {['Nome', 'Email', 'Ruolo', 'Azioni'].map(h => (
                  <th key={h} style={{ paddingBottom: '8px', paddingRight: '16px', textAlign: 'left', color: 'var(--text-muted)', fontFamily: 'Atkinson Hyperlegible, system-ui, sans-serif', fontSize: '0.72rem', letterSpacing: '1px' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {heroes.map(u => (
                <tr key={u.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '10px 16px 10px 0', fontWeight: 700, color: 'var(--text)' }}>
                    {u.name}
                    <button onClick={() => openRename(u)} title="Rinomina eroe"
                      style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', fontSize: '0.8rem', marginLeft: '6px' }}>
                      ✏️
                    </button>
                  </td>
                  <td style={{ padding: '10px 16px 10px 0', color: 'var(--text-muted)' }}>{u.email}</td>
                  <td style={{ padding: '10px 16px 10px 0' }}>
                    <span style={{
                      padding: '2px 10px', borderRadius: '10px', fontSize: '0.75rem', fontFamily: 'Atkinson Hyperlegible, system-ui, sans-serif', fontWeight: 700,
                      background: u.role === 'admin' ? 'rgba(169,121,26,0.14)' : 'rgba(47,125,58,0.14)',
                      color: u.role === 'admin' ? 'var(--gold)' : 'var(--green)',
                    }}>
                      {u.role === 'admin' ? '🛡️ Admin' : '⚔️ Avventuriero'}
                    </span>
                  </td>
                  <td style={{ padding: '10px 0', display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                    {u.id !== currentUser.id ? (
                      <button onClick={() => toggleRole(u)}
                        style={{ background: 'none', border: 'none', color: 'var(--gold)', cursor: 'pointer', fontSize: '0.82rem', textDecoration: 'underline', fontFamily: 'Atkinson Hyperlegible, system-ui, sans-serif' }}>
                        {u.role === 'admin' ? '→ Avventuriero' : '→ Admin'}
                      </button>
                    ) : <span style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>Tu</span>}
                    <button onClick={() => openReset(u)} title="Reimposta password"
                      style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.92rem' }}>
                      🔑
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Modale reset password ── */}
      {resetHero && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 70, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', backgroundColor: 'rgba(44,32,17,0.45)' }}
          onClick={closeReset}
        >
          <div
            onClick={e => e.stopPropagation()}
            className="bg-frame"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border-gold, var(--gold))', borderRadius: '12px', boxShadow: '0 8px 32px rgba(80,60,20,0.25)', width: '100%', maxWidth: '360px', padding: '1.5rem' }}
          >
            <h3 style={{ fontFamily: 'Titan One, Luckiest Guy, fantasy', color: 'var(--gold)', margin: '0 0 4px', fontSize: '1rem' }}>🔑 Reimposta password</h3>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: '0 0 16px' }}>Per <strong>{resetHero.name}</strong> ({resetHero.email})</p>

            {pwdDone ? (
              <div>
                <div style={{ background: 'rgba(47,125,58,0.10)', border: '1px solid rgba(47,125,58,0.3)', borderRadius: '8px', padding: '12px', marginBottom: '14px' }}>
                  <p style={{ margin: '0 0 8px', fontSize: '0.85rem', color: 'var(--green)', fontWeight: 600 }}>✓ Password reimpostata</p>
                  <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>Comunicala a {resetHero.name}:</p>
                  <p style={{ margin: '6px 0 0', fontFamily: 'monospace', fontSize: '1rem', background: 'var(--bg-surface)', padding: '8px 10px', borderRadius: '6px', color: 'var(--text)', letterSpacing: '1px' }}>
                    {newPwd}
                  </p>
                </div>
                <button onClick={closeReset} style={{ width: '100%', padding: '10px', background: 'linear-gradient(135deg, var(--gold), var(--gold-light))', color: 'var(--on-gold)', border: '1px solid var(--gold)', borderRadius: '8px', fontFamily: 'Atkinson Hyperlegible, system-ui, sans-serif', fontWeight: 700, cursor: 'pointer' }}>
                  Chiudi
                </button>
              </div>
            ) : (
              <>
              <button type="button" onClick={handleSendLink} disabled={sendingLink || linkMsg?.ok}
                style={{ width: '100%', padding: '10px', background: 'linear-gradient(135deg, var(--gold), var(--gold-light))', color: 'var(--on-gold)', border: '1px solid var(--gold)', borderRadius: '8px', fontFamily: 'Atkinson Hyperlegible, system-ui, sans-serif', fontWeight: 700, cursor: 'pointer', opacity: sendingLink ? 0.6 : 1 }}>
                {sendingLink ? 'Invio...' : linkMsg?.ok ? '✓ Link inviato' : '📧 Manda link via email (consigliato)'}
              </button>
              <p style={{ fontSize: '0.78rem', margin: '6px 0 14px', color: linkMsg && !linkMsg.ok ? 'var(--red)' : 'var(--text-dim)' }}>
                {linkMsg ? linkMsg.text : 'Riceverà un link valido un’ora per scegliere da solo la nuova password.'}
              </p>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)', margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: '1px' }}>Oppure impostala tu</p>
              <form onSubmit={handleResetPwd} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPwd ? 'text' : 'password'}
                    value={newPwd}
                    onChange={e => setNewPwd(e.target.value)}
                    placeholder="Nuova password (min 6 caratteri)"
                    minLength={6}
                    required
                    style={{ ...inputSty, paddingRight: '38px' }}
                  />
                  <button type="button" onClick={() => setShowPwd(!showPwd)}
                    style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.95rem' }}>
                    {showPwd ? '🙈' : '👁'}
                  </button>
                </div>
                <button type="button" onClick={generateRandomPwd}
                  style={{ background: 'none', border: 'none', color: 'var(--gold)', cursor: 'pointer', fontSize: '0.8rem', textDecoration: 'underline', textAlign: 'left', padding: 0 }}>
                  🎲 Genera password casuale
                </button>
                <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                  <button type="submit" disabled={savingPwd}
                    style={{ flex: 1, padding: '10px', background: 'linear-gradient(135deg, var(--gold), var(--gold-light))', color: 'var(--on-gold)', border: '1px solid var(--gold)', borderRadius: '8px', fontFamily: 'Atkinson Hyperlegible, system-ui, sans-serif', fontWeight: 700, cursor: 'pointer', opacity: savingPwd ? 0.6 : 1 }}>
                    {savingPwd ? 'Salvataggio...' : 'Reimposta'}
                  </button>
                  <button type="button" onClick={closeReset}
                    style={{ padding: '10px 16px', background: 'rgba(217,201,158,0.35)', color: 'var(--text-muted)', border: '1px solid var(--border)', borderRadius: '8px', cursor: 'pointer' }}>
                    Annulla
                  </button>
                </div>
              </form>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Modale rinomina eroe ── */}
      {renameHero && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 70, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', backgroundColor: 'rgba(44,32,17,0.45)' }}
          onClick={closeRename}
        >
          <div
            onClick={e => e.stopPropagation()}
            className="bg-frame"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border-gold, var(--gold))', borderRadius: '12px', boxShadow: '0 8px 32px rgba(80,60,20,0.25)', width: '100%', maxWidth: '340px', padding: '1.5rem' }}
          >
            <h3 style={{ fontFamily: 'Titan One, Luckiest Guy, fantasy', color: 'var(--gold)', margin: '0 0 4px', fontSize: '1rem' }}>✏️ Rinomina eroe</h3>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-dim)', margin: '0 0 14px' }}>{renameHero.email} (l'email non cambia)</p>
            <form onSubmit={handleRename} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <input type="text" value={newName} onChange={e => setNewName(e.target.value)} required autoFocus style={inputSty} />
              <div style={{ display: 'flex', gap: '8px' }}>
                <button type="submit" disabled={savingName} style={{ flex: 1, padding: '10px', background: 'linear-gradient(135deg, var(--gold), var(--gold-light))', color: 'var(--on-gold)', border: '1px solid var(--gold)', borderRadius: '8px', fontFamily: 'Atkinson Hyperlegible, system-ui, sans-serif', fontWeight: 700, cursor: 'pointer', opacity: savingName ? 0.6 : 1 }}>
                  {savingName ? 'Salvataggio...' : 'Salva'}
                </button>
                <button type="button" onClick={closeRename} style={{ padding: '10px 16px', background: 'rgba(217,201,158,0.35)', color: 'var(--text-muted)', border: '1px solid var(--border)', borderRadius: '8px', cursor: 'pointer' }}>
                  Annulla
                </button>
              </div>
            </form>
          </div>
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
  const [allUsers, setAllUsers] = useState([]);
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
  useEffect(() => { adminAPI.getUsers().then(res => setAllUsers(res.data)).catch(() => {}); }, []);

  const avventurieriTotali = allUsers.filter(u => u.role === 'volunteer').length;
  const numeroAdmin = allUsers.filter(u => u.role === 'admin').length;
  const avventurieriAttivi = stats.filter(s => s.active_bookings > 0).length;

  const cardSty = { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '10px', padding: '20px', marginBottom: '16px' };
  const selSty = { ...IS, width: 'auto', padding: '6px 12px' };

  return (
    <div>
      <div style={cardSty}>
        <h2 style={{ fontFamily: 'Titan One, Luckiest Guy, fantasy', color: 'var(--gold)', margin: '0 0 16px', fontSize: '1.05rem' }}>📊 Statistiche</h2>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.72rem', fontFamily: 'Atkinson Hyperlegible, system-ui, sans-serif', color: 'var(--text-muted)', marginBottom: '4px' }}>Anno</label>
            <select value={year} onChange={e => setYear(e.target.value)} style={selSty}>
              <option value="">Tutti</option>
              {Array.from({length: 5}, (_,i) => String(currentYear-i)).map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.72rem', fontFamily: 'Atkinson Hyperlegible, system-ui, sans-serif', color: 'var(--text-muted)', marginBottom: '4px' }}>Mese</label>
            <select value={month} onChange={e => setMonth(e.target.value)} style={selSty}>
              <option value="">Tutti</option>
              {MONTHS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <div style={cardSty}><p style={{ color: 'var(--text-muted)', fontFamily: 'Atkinson Hyperlegible, system-ui, sans-serif' }}>Caricamento...</p></div>
      ) : (
        <>
          <div style={cardSty}>
            <h3 style={{ fontFamily: 'Atkinson Hyperlegible, system-ui, sans-serif', color: 'var(--text-muted)', fontSize: '0.85rem', margin: '0 0 12px', letterSpacing: '1px' }}>👥 Eroi</h3>
            <div className="form-grid-3">
              {[
                { label: 'Avventurieri totali', val: avventurieriTotali, color: 'var(--text)', bg: 'rgba(217,201,158,0.3)' },
                { label: 'Attivi nel periodo', val: avventurieriAttivi, color: 'var(--green)', bg: 'rgba(47,125,58,0.12)' },
                { label: 'Admin', val: numeroAdmin, color: 'var(--gold)', bg: 'rgba(169,121,26,0.12)' },
              ].map(({label, val, color, bg}) => (
                <div key={label} style={{ textAlign: 'center', padding: '12px', background: bg, borderRadius: '8px' }}>
                  <div style={{ fontSize: '1.8rem', fontWeight: 900, color, fontFamily: 'Atkinson Hyperlegible, system-ui, sans-serif' }}>{val}</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '4px' }}>{label}</div>
                </div>
              ))}
            </div>
          </div>

          {shiftStats && (
            <div style={cardSty}>
              <h3 style={{ fontFamily: 'Atkinson Hyperlegible, system-ui, sans-serif', color: 'var(--text-muted)', fontSize: '0.85rem', margin: '0 0 12px', letterSpacing: '1px' }}>📋 Riepilogo sessioni nel periodo</h3>
              <div className="form-grid-3">
                {[
                  { label: 'Sessioni totali', val: shiftStats.total_shifts, color: 'var(--text)', bg: 'rgba(217,201,158,0.3)' },
                  { label: 'Sessioni attive', val: shiftStats.active_shifts, color: 'var(--green)', bg: 'rgba(47,125,58,0.12)' },
                  { label: 'Annullate', val: shiftStats.cancelled_shifts, color: 'var(--red)', bg: 'rgba(169,121,26,0.12)' },
                ].map(({label, val, color, bg}) => (
                  <div key={label} style={{ textAlign: 'center', padding: '12px', background: bg, borderRadius: '8px' }}>
                    <div style={{ fontSize: '1.8rem', fontWeight: 900, color, fontFamily: 'Atkinson Hyperlegible, system-ui, sans-serif' }}>{val}</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '4px' }}>{label}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={cardSty}>
            <h3 style={{ fontFamily: 'Atkinson Hyperlegible, system-ui, sans-serif', color: 'var(--text-muted)', fontSize: '0.85rem', margin: '0 0 12px', letterSpacing: '1px' }}>⚔️ Sessioni per avventuriero</h3>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', fontSize: '0.85rem', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    {['#','Avventuriero','Prenotazioni','Attive','Annullate','Ore totali'].map(h => (
                      <th key={h} style={{ paddingBottom: '8px', paddingRight: '12px', textAlign: h==='#'?'left':'center', color: 'var(--text-muted)', fontFamily: 'Atkinson Hyperlegible, system-ui, sans-serif', fontSize: '0.7rem', letterSpacing: '1px' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {stats.map((s, i) => (
                    <tr key={s.id} style={{ borderBottom: '1px solid var(--border)', opacity: s.total_bookings === 0 ? 0.5 : 1 }}>
                      <td style={{ padding: '8px 12px 8px 0', color: 'var(--text-dim)' }}>{i+1}</td>
                      <td style={{ padding: '8px 12px 8px 0' }}>
                        <div style={{ fontWeight: 700, color: 'var(--text)' }}>{s.name}</div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>{s.email}</div>
                      </td>
                      <td style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 700, color: 'var(--text)' }}>{s.total_bookings}</td>
                      <td style={{ padding: '8px 12px', textAlign: 'center', color: 'var(--green)', fontWeight: 600 }}>{s.active_bookings}</td>
                      <td style={{ padding: '8px 12px', textAlign: 'center', color: 'var(--red)' }}>{s.cancelled_bookings}</td>
                      <td style={{ padding: '8px 0', textAlign: 'center', color: 'var(--gold)', fontWeight: 700, fontFamily: 'Atkinson Hyperlegible, system-ui, sans-serif' }}>{s.total_hours}h</td>
                    </tr>
                  ))}
                  {stats.length === 0 && (
                    <tr><td colSpan={6} style={{ padding: '20px', textAlign: 'center', color: 'var(--text-dim)', fontFamily: 'Atkinson Hyperlegible, system-ui, sans-serif' }}>Nessun dato disponibile</td></tr>
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
  const btnGold = { background: 'linear-gradient(135deg, var(--gold), var(--gold-light))', color: 'var(--on-gold)', border: '1px solid var(--gold)', borderRadius: '7px', fontFamily: 'Atkinson Hyperlegible, system-ui, sans-serif', fontWeight: 700, fontSize: '0.82rem', padding: '8px 16px', cursor: 'pointer' };
  const btnGray = { background: 'rgba(217,201,158,0.35)', color: 'var(--text-muted)', border: '1px solid var(--border)', borderRadius: '7px', padding: '8px 14px', cursor: 'pointer', fontSize: '0.82rem' };

  return (
    <div style={cardSty}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h2 style={{ fontFamily: 'Titan One, Luckiest Guy, fantasy', color: 'var(--gold)', margin: 0, fontSize: '1.05rem' }}>📍 Locations</h2>
        {!showForm && <button onClick={startNew} style={btnGold}>➕ Aggiungi Location</button>}
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px', padding: '14px', background: 'var(--bg-surface)', borderRadius: '8px', border: '1px solid var(--border)' }}>
          <h3 style={{ fontFamily: 'Titan One, Luckiest Guy, fantasy', color: 'var(--text-muted)', margin: '0 0 6px', fontSize: '0.88rem' }}>
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

      {loading ? <p style={{ color: 'var(--text-muted)', fontFamily: 'Atkinson Hyperlegible, system-ui, sans-serif' }}>Caricamento...</p>
        : locations.length === 0 ? <p style={{ color: 'var(--text-dim)', fontFamily: 'Atkinson Hyperlegible, system-ui, sans-serif' }}>Nessuna location. Aggiungine una!</p>
        : (
          <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            {locations.map(loc => (
              <li key={loc.id} style={{ padding: '12px 0', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontWeight: 700, color: 'var(--gold)', fontFamily: 'Titan One, Luckiest Guy, fantasy', fontSize: '0.9rem' }}>{loc.name}</div>
                  {loc.address && <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '2px' }}>{loc.address}</div>}
                </div>
                <button onClick={() => startEdit(loc)} style={{ background: 'none', border: 'none', color: 'var(--gold)', cursor: 'pointer', fontSize: '0.82rem', textDecoration: 'underline', fontFamily: 'Atkinson Hyperlegible, system-ui, sans-serif' }}>
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
// Sezione: Gruppi — creare gruppi e decidere chi vede quali sessioni
// ═══════════════════════════════════════════════════════════════════════════════
function GroupsSection() {
  const [groups, setGroups] = useState([]);
  const [heroes, setHeroes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);
  const [editingGroup, setEditingGroup] = useState(null);
  const [memberIds, setMemberIds] = useState([]);
  const [savingMembers, setSavingMembers] = useState(false);
  const [copiedGroupId, setCopiedGroupId] = useState(null);
  const [heroOf, setHeroOf] = useState({});
  const [view, setView] = useState('tavoli');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [gRes, hRes, sRes] = await Promise.all([groupsAPI.getGroups(), adminAPI.getUsers(), sheetsAPI.getSheets().catch(() => ({ data: [] }))]);
      setGroups(gRes.data);
      setHeroes(hRes.data);
      // Eroe scelto da ciascun giocatore = scheda a cui e' autorizzato nominalmente.
      const map = {};
      for (const sh of sRes.data) for (const u of (sh.users || [])) if (!map[u.id]) map[u.id] = { name: sh.name, klass: sh.klass, image: sh.image_path };
      setHeroOf(map);
    } catch { alert('Errore nel caricamento gruppi'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreating(true);
    try {
      await groupsAPI.createGroup(newName.trim());
      setNewName('');
      await load();
    } catch (err) {
      alert(err.response?.data?.error || 'Errore nella creazione del gruppo');
    } finally { setCreating(false); }
  };

  const handleDelete = async (group) => {
    if (!confirm(`Eliminare il gruppo "${group.name}"? Le sessioni riservate a questo gruppo diventeranno visibili solo agli altri eventuali gruppi assegnati.`)) return;
    try { await groupsAPI.deleteGroup(group.id); await load(); }
    catch (err) { alert(err.response?.data?.error || "Errore nell'eliminazione"); }
  };

  const openMembers = (group) => {
    setEditingGroup(group);
    setMemberIds(group.members.map(m => m.id));
  };

  const toggleMember = (heroId) => {
    setMemberIds(prev => prev.includes(heroId) ? prev.filter(id => id !== heroId) : [...prev, heroId]);
  };

  const saveMembers = async () => {
    setSavingMembers(true);
    try {
      await groupsAPI.setMembers(editingGroup.id, memberIds);
      setEditingGroup(null);
      await load();
    } catch (err) {
      alert(err.response?.data?.error || 'Errore nel salvataggio membri');
    } finally { setSavingMembers(false); }
  };

  const copyEmails = async (group) => {
    const emails = group.members.map(m => m.email).filter(Boolean).join(', ');
    try {
      await navigator.clipboard.writeText(emails);
      setCopiedGroupId(group.id);
      setTimeout(() => setCopiedGroupId(null), 2000);
    } catch {
      alert('Impossibile copiare automaticamente. Ecco gli indirizzi:\n\n' + emails);
    }
  };

  const cardSty = { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '10px', padding: '20px', marginBottom: '16px' };
  const btnGold = { background: 'linear-gradient(135deg, var(--gold), var(--gold-light))', color: 'var(--on-gold)', border: '1px solid var(--gold)', borderRadius: '7px', fontFamily: 'Atkinson Hyperlegible, system-ui, sans-serif', fontWeight: 700, fontSize: '0.82rem', padding: '8px 16px', cursor: 'pointer' };
  const btnGray = { background: 'rgba(217,201,158,0.35)', color: 'var(--text-muted)', border: '1px solid var(--border)', borderRadius: '7px', padding: '8px 14px', cursor: 'pointer', fontSize: '0.82rem' };

  return (
    <div>
      <div style={cardSty}>
        <h2 className="bg-cartouche" style={{ fontFamily: 'Titan One, Luckiest Guy, fantasy', color: 'var(--gold)', margin: '0 0 6px', fontSize: '1.05rem' }}>👥 Gruppi</h2>
        <p style={{ fontSize: '0.78rem', color: 'var(--text-dim)', margin: '0 0 16px' }}>
          Crea gruppi di eroi (es. "Tavolo Rosso", "Junior") per riservare certe sessioni solo a loro.
          Il ritratto al tavolo è l’eroe assegnato al giocatore nella tab 🎭 Schede.
        </p>
        <div style={{ display: 'flex', gap: '4px', margin: '0 auto 14px', background: 'var(--bg-surface)', padding: '4px', borderRadius: '10px', width: 'fit-content', border: '1px solid var(--border)' }}>
          {[['tavoli', '🪑 Tavoli'], ['elenco', '📋 Elenco']].map(([v, l]) => (
            <button key={v} type="button" onClick={() => setView(v)}
              style={{ padding: '6px 16px', borderRadius: '7px', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '0.85rem', fontFamily: 'Atkinson Hyperlegible, system-ui, sans-serif', background: view === v ? 'var(--gold)' : 'transparent', color: view === v ? 'var(--on-gold)' : 'var(--text-muted)' }}>{l}</button>
          ))}
        </div>
        <form onSubmit={handleCreate} style={{ display: 'flex', gap: '8px', marginBottom: '18px' }}>
          <input type="text" value={newName} onChange={e => setNewName(e.target.value)}
            placeholder="Nome nuovo gruppo" style={{ ...IS, flex: 1 }} />
          <button type="submit" disabled={creating} style={btnGold}>➕ Crea</button>
        </form>

        {loading ? <p style={{ color: 'var(--text-muted)', fontFamily: 'Atkinson Hyperlegible, system-ui, sans-serif' }}>Caricamento...</p>
          : groups.length === 0 ? <p style={{ color: 'var(--text-dim)', fontFamily: 'Atkinson Hyperlegible, system-ui, sans-serif' }}>Nessun gruppo ancora creato.</p>
          : view === 'tavoli' ? (
            <div className="gt-grid">
              {groups.map(g => (
                <GameTable key={g.id} name={g.name}
                  members={g.members.map(m => ({ ...m, hero: heroOf[m.id] }))}
                  footer={<>
                    <button onClick={() => openMembers(g)} style={btnGray}>👥 Membri</button>
                    <button onClick={() => copyEmails(g)} disabled={g.members.length === 0} style={{ ...btnGray, opacity: g.members.length === 0 ? 0.5 : 1 }}>
                      {copiedGroupId === g.id ? '✅ Copiato!' : '📋 Email'}
                    </button>
                    <button onClick={() => handleDelete(g)} title="Elimina gruppo" aria-label="Elimina gruppo"
                      style={{ width: '34px', height: '34px', borderRadius: '7px', background: 'var(--bg-card)', border: '1px solid var(--border)', cursor: 'pointer' }}>🗑️</button>
                  </>}
                />
              ))}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {groups.map(g => (
                <div key={g.id} style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '10px', padding: '10px 14px', background: 'var(--bg-page)', border: '1px solid var(--border)', borderRadius: '8px' }}>
                  <div style={{ flex: '1 1 200px', minWidth: 0 }}>
                    <span style={{ fontFamily: 'Titan One, Luckiest Guy, fantasy', fontWeight: 700, color: 'var(--gold)', fontSize: '0.92rem' }}>{g.name}</span>
                    <span style={{ marginLeft: '10px', fontSize: '0.78rem', color: 'var(--text-dim)', overflowWrap: 'break-word' }}>
                      {g.members.length === 0 ? 'nessun membro' : g.members.map(m => m.name).join(', ')}
                    </span>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    <button onClick={() => openMembers(g)} style={btnGray}>👥 Membri</button>
                    <button onClick={() => copyEmails(g)} disabled={g.members.length === 0} title={g.members.length === 0 ? 'Aggiungi prima dei membri' : 'Copia gli indirizzi email dei membri'}
                      style={{ ...btnGray, opacity: g.members.length === 0 ? 0.5 : 1 }}>
                      {copiedGroupId === g.id ? '✅ Copiato!' : '📋 Copia email'}
                    </button>
                    <button onClick={() => handleDelete(g)} title="Elimina gruppo"
                      style={{ width: '34px', height: '34px', borderRadius: '7px', background: 'var(--bg-card)', border: '1px solid var(--border)', cursor: 'pointer' }}>🗑️</button>
                  </div>
                </div>
              ))}
            </div>
          )
        }
      </div>

      {/* ── Modale gestione membri ── */}
      {editingGroup && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 70, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', backgroundColor: 'rgba(44,32,17,0.45)' }}
          onClick={() => setEditingGroup(null)}
        >
          <div
            onClick={e => e.stopPropagation()}
            className="bg-frame"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border-gold, var(--gold))', borderRadius: '12px', boxShadow: '0 8px 32px rgba(80,60,20,0.25)', width: '100%', maxWidth: '380px', padding: '1.5rem', maxHeight: '80vh', overflowY: 'auto' }}
          >
            <h3 style={{ fontFamily: 'Titan One, Luckiest Guy, fantasy', color: 'var(--gold)', margin: '0 0 4px', fontSize: '1rem' }}>👥 Membri di "{editingGroup.name}"</h3>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-dim)', margin: '0 0 14px' }}>Seleziona chi fa parte di questo gruppo.</p>
            {heroes.length === 0 ? (
              <p style={{ fontSize: '0.85rem', color: 'var(--text-dim)' }}>Nessun eroe registrato ancora.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '16px' }}>
                {heroes.map(h => (
                  <label key={h.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.9rem', color: 'var(--text)' }}>
                    <input type="checkbox" checked={memberIds.includes(h.id)} onChange={() => toggleMember(h.id)} style={{ width: '16px', height: '16px', accentColor: 'var(--gold)' }} />
                    {h.name} <span style={{ color: 'var(--text-dim)', fontSize: '0.78rem' }}>({h.email})</span>
                  </label>
                ))}
              </div>
            )}
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={saveMembers} disabled={savingMembers} style={{ ...btnGold, flex: 1 }}>
                {savingMembers ? 'Salvataggio...' : '✓ Salva'}
              </button>
              <button onClick={() => setEditingGroup(null)} style={btnGray}>Annulla</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Sezione: Privacy — modifica l'informativa senza dover ripubblicare il codice
// ═══════════════════════════════════════════════════════════════════════════════
function PrivacyEditorSection() {
  const [text, setText] = useState('');
  const [updatedAt, setUpdatedAt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    contentAPI.get('privacy_policy')
      .then(res => { setText(res.data.content); setUpdatedAt(res.data.updated_at); })
      .catch(() => alert("Errore nel caricamento dell'informativa"))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      const res = await contentAPI.update('privacy_policy', text);
      setUpdatedAt(res.data.updated_at);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      alert(err.response?.data?.error || 'Errore nel salvataggio');
    } finally { setSaving(false); }
  };

  const cardSty = { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '10px', padding: '20px' };
  const btnGold = { background: 'linear-gradient(135deg, var(--gold), var(--gold-light))', color: 'var(--on-gold)', border: '1px solid var(--gold)', borderRadius: '7px', fontFamily: 'Atkinson Hyperlegible, system-ui, sans-serif', fontWeight: 700, fontSize: '0.85rem', padding: '10px 20px', cursor: 'pointer' };

  return (
    <div style={cardSty}>
      <h2 className="bg-cartouche" style={{ fontFamily: 'Titan One, Luckiest Guy, fantasy', color: 'var(--gold)', margin: '0 0 6px', fontSize: '1.05rem' }}>📄 Informativa privacy</h2>
      <p style={{ fontSize: '0.78rem', color: 'var(--text-dim)', margin: '0 0 4px' }}>
        Il testo qui sotto è quello mostrato pubblicamente sulla pagina <code>/privacy</code>, raggiungibile anche dal link in fondo alla Dashboard e dal modulo di registrazione. Modificalo liberamente: non serve nessuna pubblicazione di codice.
      </p>
      {updatedAt && (
        <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)', margin: '0 0 14px', fontStyle: 'italic' }}>
          Ultimo aggiornamento: {new Date(updatedAt).toLocaleString('it-IT')}
        </p>
      )}
      {loading ? (
        <p style={{ color: 'var(--text-muted)' }}>Caricamento...</p>
      ) : (
        <>
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            rows={20}
            style={{
              width: '100%', padding: '14px', background: 'var(--bg-surface)', border: '1px solid var(--border)',
              borderRadius: '8px', color: 'var(--text)', fontSize: '0.88rem', lineHeight: 1.6,
              fontFamily: 'Atkinson Hyperlegible, system-ui, sans-serif', resize: 'vertical', boxSizing: 'border-box',
            }}
          />
          <p style={{ fontSize: '0.72rem', color: 'var(--text-dim)', margin: '6px 0 14px' }}>
            Suggerimento: lascia una riga vuota tra un paragrafo e l'altro — è così che la pagina pubblica li separa visivamente.
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button onClick={handleSave} disabled={saving} style={{ ...btnGold, opacity: saving ? 0.6 : 1 }}>
              {saving ? 'Salvataggio...' : '💾 Salva modifiche'}
            </button>
            {saved && <span style={{ color: 'var(--green)', fontSize: '0.85rem', fontWeight: 700 }}>✅ Salvato</span>}
            <a href="/privacy" target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.82rem', color: 'var(--text-dim)', textDecoration: 'underline' }}>
              👁 Vedi la pagina pubblica
            </a>
          </div>
        </>
      )}
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
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-page)' }}>
        <div style={{ textAlign: 'center' }}>
          <h1 style={{ fontFamily: 'Titan One, Luckiest Guy, fantasy', color: 'var(--red)' }}>❌ Accesso negato</h1>
          <button onClick={() => navigate('/dashboard')} style={{ background: 'linear-gradient(135deg, var(--gold), var(--gold-light))', color: 'var(--on-gold)', border: 'none', borderRadius: '8px', padding: '10px 20px', fontFamily: 'Atkinson Hyperlegible, system-ui, sans-serif', fontWeight: 700, cursor: 'pointer' }}>
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
    { id: 'gruppi', label: '👥 Gruppi' },
    { id: 'newsletter', label: '📜 Newsletter' },
    { id: 'privacy', label: '📄 Privacy' },
    { id: 'schede', label: '🎭 Schede' },
  ];

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-page)' }}>
      <header style={{ background: 'linear-gradient(180deg, var(--bg-card), var(--bg-page))', borderBottom: '2px solid var(--border)', boxShadow: '0 2px 10px rgba(80,60,20,0.08)' }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '14px 24px', display: 'flex', gap: '14px', alignItems: 'center' }}>
          <h1 style={{ margin: 0, marginRight: 'auto', fontFamily: 'Titan One, Luckiest Guy, fantasy', color: 'var(--gold)', fontSize: '1.05rem' }}>🛡️ Pannello Admin</h1>
          <button onClick={() => navigate('/dashboard')} style={{ background: 'none', border: 'none', color: 'var(--gold)', cursor: 'pointer', fontFamily: 'Atkinson Hyperlegible, system-ui, sans-serif', fontSize: '0.85rem', textDecoration: 'underline' }}>
            ← Dashboard
          </button>
          <ThemeToggle />
        </div>
        <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 24px', display: 'flex', gap: '2px', overflowX: 'auto' }}>
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              padding: '10px 18px', fontSize: '0.82rem', fontFamily: 'Atkinson Hyperlegible, system-ui, sans-serif', fontWeight: 600,
              background: 'none', border: 'none', borderBottom: `2px solid ${tab === t.id ? 'var(--gold)' : 'transparent'}`,
              color: tab === t.id ? 'var(--gold)' : 'var(--text-muted)', cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.2s',
            }}>
              {t.label}
            </button>
          ))}
        </div>
      </header>

      <main style={{ maxWidth: '1280px', margin: '0 auto', padding: '24px 24px 48px' }}>
        {tab === 'sessioni' && <SessionsSection locations={locations} />}
        {tab === 'eroi' && <HeroesSection />}
        {tab === 'statistiche' && <StatsSection />}
        {tab === 'locations' && <LocationsSection />}
        {tab === 'gruppi' && <GroupsSection />}
        {tab === 'newsletter' && <NewsletterSection />}
        {tab === 'privacy' && <PrivacyEditorSection />}
        {tab === 'schede' && <SchedeAdminTab />}
      </main>
    </div>
  );
}
