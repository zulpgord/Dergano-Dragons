import { useEffect, useState } from 'react';
import { authAPI, contentAPI } from '../services/api';

// Se l'informativa e' stata aggiornata dopo l'ultima accettazione, la mostra e chiede di accettarla prima di continuare.
export default function PrivacyGate({ onLogout }) {
  const [need, setNeed] = useState(false);
  const [text, setText] = useState('');
  const [ok, setOk] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    authAPI.getMe().then(r => {
      if ((r.data.privacy_version ?? 0) < (r.data.privacy_current ?? 0)) {
        setNeed(true);
        contentAPI.get('privacy_policy').then(c => setText(c.data.content)).catch(() => {});
      }
    }).catch(() => {});
  }, []);

  if (!need) return null;
  const accept = async () => {
    setSaving(true);
    try { await authAPI.acceptPrivacy(); setNeed(false); }
    catch { alert('Salvataggio non riuscito, riprova'); }
    finally { setSaving(false); }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 90, background: 'rgba(20,14,6,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
      <div className="bg-frame" style={{ width: '100%', maxWidth: '640px', maxHeight: '90vh', display: 'flex', flexDirection: 'column', padding: '1.4rem', fontFamily: 'Atkinson Hyperlegible, system-ui, sans-serif' }}>
        <div className="bg-cartouche">📜 Informativa aggiornata</div>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: '0 0 10px', lineHeight: 1.5 }}>
          Abbiamo aggiornato l’informativa sul trattamento dei dati. Leggila e accettala per continuare a usare Dergano &amp; Dragons.
        </p>
        <div className="bg-parchment privacy-scroll">
          {text ? text.split('\n\n').map((p, i) => <p key={i}>{p}</p>) : <p>Caricamento…</p>}
        </div>
        <label style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', margin: '14px 0 12px', fontSize: '0.88rem', color: 'var(--text)', cursor: 'pointer', lineHeight: 1.4 }}>
          <input type="checkbox" checked={ok} onChange={e => setOk(e.target.checked)} />
          <span>Ho letto e accetto l’informativa. Se ho meno di 14 anni, l’account è usato con il consenso di un genitore o tutore.</span>
        </label>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button type="button" onClick={accept} disabled={!ok || saving}
            style={{ flex: 1, padding: '11px', background: 'linear-gradient(135deg, var(--gold), var(--gold-light))', color: 'var(--on-gold)', border: '1px solid var(--gold)', borderRadius: '8px', fontWeight: 700, cursor: 'pointer', opacity: !ok || saving ? 0.5 : 1 }}>
            {saving ? 'Salvataggio…' : 'Accetto e continuo'}
          </button>
          <button type="button" onClick={onLogout}
            style={{ padding: '11px 16px', background: 'transparent', color: 'var(--text-dim)', border: '1px solid var(--border)', borderRadius: '8px', cursor: 'pointer' }}>
            Esci
          </button>
        </div>
        <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)', margin: '10px 0 0' }}>
          Se non vuoi accettarla puoi uscire; per cancellare l’account scrivi a sicurezza.cenci@gmail.com o eliminalo da «Elimina il mio account» dopo aver accettato.
        </p>
      </div>
    </div>
  );
}
