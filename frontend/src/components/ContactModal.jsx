import { useEffect, useState } from 'react';
import { contactAPI } from '../services/api';

// Modulo "Contatti": il messaggio arriva all'organizzatore via email, con "Rispondi" verso chi scrive.
export default function ContactModal({ onClose }) {
  const me = (() => { try { return JSON.parse(localStorage.getItem('user') || '{}'); } catch { return {}; } })();
  const [form, setForm] = useState({ name: me.name || '', email: me.email || '', subject: '', message: '', website: '' });
  const [address, setAddress] = useState('');
  const [state, setState] = useState(null); // null | 'sending' | {ok, text}

  useEffect(() => {
    contactAPI.info().then(r => setAddress(r.data.email)).catch(() => {});
    const k = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [onClose]);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const submit = async (e) => {
    e.preventDefault();
    setState('sending');
    try {
      await contactAPI.send(form);
      setState({ ok: true, text: 'Messaggio inviato! Ti risponderemo all’indirizzo che hai indicato.' });
    } catch (err) {
      setState({ ok: false, text: err.response?.data?.error || 'Invio non riuscito, riprova' });
    }
  };

  const input = { width: '100%', padding: '10px 12px', background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '16px', boxSizing: 'border-box', color: 'var(--text)', fontFamily: 'inherit' };
  const sent = state && state !== 'sending' && state.ok;

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(44,32,17,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 80, padding: '16px' }}>
      <div onClick={e => e.stopPropagation()} className="bg-frame" role="dialog" aria-modal="true" aria-label="Contatti"
        style={{ width: '100%', maxWidth: '460px', maxHeight: '92vh', overflowY: 'auto', padding: '1.4rem', fontFamily: 'Atkinson Hyperlegible, system-ui, sans-serif', color: 'var(--text)' }}>
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button onClick={onClose} aria-label="Chiudi" style={{ background: 'none', border: 'none', fontSize: '1.5rem', color: 'var(--text-dim)', cursor: 'pointer', lineHeight: 1 }}>×</button>
        </div>
        <div className="bg-cartouche">✉️ Contatti</div>
        {sent ? (
          <div style={{ textAlign: 'center', padding: '10px 0' }}>
            <p style={{ fontSize: '2.2rem', margin: '0 0 6px' }}>🕊️</p>
            <p style={{ color: 'var(--green)', fontWeight: 700, margin: '0 0 16px' }}>{state.text}</p>
            <button onClick={onClose} style={{ padding: '10px 24px', background: 'linear-gradient(135deg, var(--gold), var(--gold-light))', color: 'var(--on-gold)', border: '1px solid var(--gold)', borderRadius: '8px', fontWeight: 700, cursor: 'pointer' }}>Chiudi</button>
          </div>
        ) : (
          <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', margin: '0 0 4px', lineHeight: 1.5 }}>
              Domande sulle sessioni, sull’account o sui tuoi dati? Scrivici: ti rispondiamo via email.
            </p>
            <input placeholder="Il tuo nome" value={form.name} onChange={set('name')} required style={input} />
            <input type="email" placeholder="La tua email (per risponderti)" value={form.email} onChange={set('email')} required style={input} />
            <input placeholder="Oggetto (facoltativo)" value={form.subject} onChange={set('subject')} style={input} />
            <textarea placeholder="Il tuo messaggio" rows={5} value={form.message} onChange={set('message')} required style={{ ...input, resize: 'vertical' }} />
            {/* campo esca per i bot: invisibile alle persone */}
            <input tabIndex={-1} autoComplete="off" value={form.website} onChange={set('website')} aria-hidden="true" style={{ position: 'absolute', left: '-9999px', width: '1px', height: '1px' }} />
            {state && state !== 'sending' && !state.ok && <p style={{ color: 'var(--red)', fontSize: '0.85rem', margin: 0 }}>{state.text}</p>}
            <button type="submit" disabled={state === 'sending'}
              style={{ padding: '11px', background: 'linear-gradient(135deg, var(--gold), var(--gold-light))', color: 'var(--on-gold)', border: '1px solid var(--gold)', borderRadius: '8px', fontWeight: 700, cursor: 'pointer', opacity: state === 'sending' ? 0.6 : 1 }}>
              {state === 'sending' ? 'Invio…' : 'Invia messaggio'}
            </button>
            {address && (
              <p style={{ fontSize: '0.8rem', color: 'var(--text-dim)', margin: '4px 0 0', textAlign: 'center' }}>
                Oppure scrivi dalla tua casella a <a href={`mailto:${address}`} style={{ color: 'var(--gold)', fontWeight: 700 }}>{address}</a>
              </p>
            )}
          </form>
        )}
      </div>
    </div>
  );
}
