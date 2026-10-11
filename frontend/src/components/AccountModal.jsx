import { useEffect, useState } from 'react';
import { authAPI } from '../services/api';

// Pannello "Il mio account": cambio password e consenso alla newsletter.
export default function AccountModal({ onClose }) {
  const [newsletter, setNewsletter] = useState(null);
  const [nlMsg, setNlMsg] = useState('');
  const [pw, setPw] = useState({ current: '', next: '' });
  const [pwMsg, setPwMsg] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    authAPI.getMe().then(r => setNewsletter(!!r.data.newsletter_opt_in)).catch(() => setNewsletter(false));
  }, []);
  useEffect(() => {
    const k = e => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [onClose]);

  const toggleNewsletter = async (v) => {
    setNewsletter(v);
    setNlMsg('');
    try {
      await authAPI.setNewsletter(v);
      setNlMsg(v ? 'Iscritto alla newsletter ✓' : 'Non riceverai più la newsletter ✓');
    } catch {
      setNewsletter(!v);
      setNlMsg('Salvataggio non riuscito');
    }
  };

  const changePassword = async (e) => {
    e.preventDefault();
    setPwMsg(null);
    if (pw.next.length < 8) return setPwMsg({ ok: false, text: 'La nuova password deve avere almeno 8 caratteri' });
    setSaving(true);
    try {
      await authAPI.changePassword(pw.current, pw.next);
      setPw({ current: '', next: '' });
      setPwMsg({ ok: true, text: 'Password cambiata ✓' });
    } catch (err) {
      setPwMsg({ ok: false, text: err.response?.data?.error || 'Cambio password non riuscito' });
    } finally {
      setSaving(false);
    }
  };

  const input = { width: '100%', padding: '10px 12px', background: '#ece0c3', border: '1px solid #ddd0b3', borderRadius: '8px', fontSize: '16px', boxSizing: 'border-box', color: '#262019' };
  const h = { fontFamily: 'Titan One, Luckiest Guy, fantasy', color: '#b0801a', fontSize: '1rem', margin: '0 0 10px' };

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(44,32,17,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 60, padding: '16px' }}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#fffbf2', border: '1px solid #ddd0b3', borderRadius: '12px', padding: '1.5rem', width: '100%', maxWidth: '400px', maxHeight: '90vh', overflowY: 'auto', fontFamily: 'Atkinson Hyperlegible, system-ui, sans-serif', color: '#262019' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 style={{ ...h, fontSize: '1.2rem', margin: 0 }}>⚔️ Il mio account</h2>
          <button onClick={onClose} aria-label="Chiudi" style={{ background: 'none', border: 'none', fontSize: '1.5rem', color: '#8a7f6c', cursor: 'pointer' }}>×</button>
        </div>

        <h3 style={h}>📜 Newsletter</h3>
        <label style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', fontSize: '0.9rem', lineHeight: 1.45, cursor: 'pointer' }}>
          <input type="checkbox" disabled={newsletter === null} checked={!!newsletter} onChange={e => toggleNewsletter(e.target.checked)} style={{ width: '18px', height: '18px', accentColor: '#b0801a', marginTop: '2px' }} />
          <span>Ricevi via email le novità e le nuove sessioni. Gli avvisi sulle sessioni a cui sei iscritto arrivano comunque.</span>
        </label>
        {nlMsg && <p style={{ fontSize: '0.82rem', color: '#6b5a3c', margin: '6px 0 0' }}>{nlMsg}</p>}

        <h3 style={{ ...h, marginTop: '24px' }}>🔑 Cambia password</h3>
        <form onSubmit={changePassword} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <input type="password" placeholder="Password attuale" autoComplete="current-password" value={pw.current} onChange={e => setPw({ ...pw, current: e.target.value })} required style={input} />
          <input type="password" placeholder="Nuova password (min 8 caratteri)" autoComplete="new-password" value={pw.next} onChange={e => setPw({ ...pw, next: e.target.value })} required style={input} />
          {pwMsg && <p style={{ fontSize: '0.85rem', margin: 0, color: pwMsg.ok ? '#4a6b2a' : '#a23b22' }}>{pwMsg.text}</p>}
          <button type="submit" disabled={saving} style={{ padding: '10px', background: 'linear-gradient(135deg, #b0801a, #c99a35)', color: '#fffbf2', border: '1px solid #b0801a', borderRadius: '8px', fontWeight: 700, cursor: 'pointer' }}>
            {saving ? '⏳ Salvataggio...' : 'Cambia password'}
          </button>
        </form>
        <p style={{ fontSize: '0.78rem', color: '#8a7f6c', marginTop: '10px' }}>Non ricordi quella attuale? Esci e usa «Password dimenticata?» nella pagina di accesso.</p>
      </div>
    </div>
  );
}
