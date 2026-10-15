import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '../services/api';
import ContactModal from '../components/ContactModal';

// ══════════════════════════════════════════════════════
// Logo Auth: solo il drago (contiene già dado e titolo)
// ══════════════════════════════════════════════════════
function DerganoLogo() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0', marginBottom: '4px' }}>
      <img
        src="/drago.png"
        alt="Dergano & Dragons"
        style={{
          width: 'min(88vw, 360px)',
          maxWidth: '100%',
          height: 'auto',
          objectFit: 'contain',
          filter: 'drop-shadow(0 0 6px rgba(169,121,26,0.15))',
        }}
      />
      {/* Separatore ornamentale */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', maxWidth: '320px', marginTop: '4px' }}>
        <div style={{ flex: 1, height: '1px', background: 'linear-gradient(90deg, transparent, var(--gold), transparent)' }} />
        <span style={{ color: 'var(--gold)', fontSize: '0.7rem' }}>✦</span>
        <div style={{ flex: 1, height: '1px', background: 'linear-gradient(90deg, transparent, var(--gold), transparent)' }} />
      </div>
    </div>
  );
}

export default function AuthPage() {
  const navigate = useNavigate();
  // Link d'invito: /auth?invito=1&email=... apre direttamente la registrazione con l'email compilata.
  const [invite] = useState(() => {
    const q = new URLSearchParams(window.location.search);
    return q.get('invito') ? (q.get('email') || '') : null;
  });
  const [isLogin, setIsLogin] = useState(() => invite === null);
  const [showReset, setShowReset] = useState(false);
  const [showPwd, setShowPwd] = useState(false);
  const [formData, setFormData] = useState(() => ({ email: new URLSearchParams(window.location.search).get('email') || '', password: '', name: '' }));
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [newsletter, setNewsletter] = useState(false);
  const [showContact, setShowContact] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetMsg, setResetMsg] = useState(null);
  const [resetLoading, setResetLoading] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionExpired] = useState(
    () => new URLSearchParams(window.location.search).get('sessione') === 'scaduta'
  );

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      let response;
      if (isLogin) {
        response = await authAPI.login(formData.email, formData.password);
      } else {
        if (!privacyAccepted) {
          setError("Devi accettare l'informativa privacy per registrarti");
          setLoading(false);
          return;
        }
        response = await authAPI.register(formData.email, formData.password, formData.name, privacyAccepted, newsletter);
      }
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Qualcosa è andato storto');
    } finally {
      setLoading(false);
    }
  };

  const cardStyle = {
    backgroundColor: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: '12px',
    padding: '2.5rem',
    width: '100%',
    maxWidth: '440px',
    boxShadow: '0 8px 28px rgba(80,60,20,0.15), 0 0 0 1px rgba(169,121,26,0.08)',
  };

  const inputStyle = {
    width: '100%',
    padding: '10px 14px',
    backgroundColor: 'var(--bg-surface)',
    border: '1px solid var(--border)',
    borderRadius: '8px',
    color: 'var(--text)',
    fontSize: '0.95rem',
    fontFamily: 'var(--font-body, serif)',
    outline: 'none',
    boxSizing: 'border-box',
  };

  const btnStyle = {
    width: '100%',
    padding: '11px',
    background: 'linear-gradient(135deg, var(--gold), var(--gold-light))',
    color: 'var(--on-gold)',
    border: '1px solid var(--gold)',
    borderRadius: '8px',
    fontFamily: 'Atkinson Hyperlegible, system-ui, sans-serif',
    fontWeight: 700,
    fontSize: '0.9rem',
    letterSpacing: '1px',
    cursor: 'pointer',
    boxShadow: '0 2px 10px rgba(169,121,26,0.25)',
    transition: 'all 0.2s',
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      background: 'radial-gradient(ellipse at center, var(--bg-card) 0%, var(--bg-page) 100%)',
    }}>
      <div className="bg-frame" style={cardStyle}>
        <DerganoLogo />

        <h2 style={{
          fontFamily: 'Titan One, Luckiest Guy, fantasy',
          fontSize: '0.95rem',
          textAlign: 'center',
          color: 'var(--text-muted)',
          marginBottom: '1.5rem',
          marginTop: '1rem',
          letterSpacing: '1px',
        }}>
          {isLogin ? '⚔️ Entra nella Gilda' : '📜 Registra il tuo Eroe'}
        </h2>

        {invite !== null && !isLogin && !error && (
          <div style={{ background: 'rgba(43,102,99,0.10)', border: '1px solid rgba(43,102,99,0.35)', color: 'var(--green)', padding: '10px 14px', borderRadius: '8px', marginBottom: '16px', fontSize: '0.88rem', lineHeight: 1.45 }}>
            🎲 Sei stato invitato! Scegli un nome da giocatore e una password per entrare nella gilda.
          </div>
        )}
        {sessionExpired && !error && (
          <div style={{
            background: 'rgba(169,121,26,0.12)',
            border: '1px solid rgba(169,121,26,0.35)',
            color: 'var(--gold-deep)',
            padding: '10px 14px',
            borderRadius: '8px',
            marginBottom: '16px',
            fontSize: '0.88rem',
          }}>
            ⏳ La tua sessione è scaduta. Accedi di nuovo per continuare.
          </div>
        )}

        {error && (
          <div style={{
            background: 'rgba(179,38,30,0.10)',
            border: '1px solid rgba(179,38,30,0.35)',
            color: 'var(--red)',
            padding: '10px 14px',
            borderRadius: '8px',
            marginBottom: '16px',
            fontSize: '0.88rem',
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {!isLogin && (
            <input
              type="text"
              name="name"
              placeholder="Nome giocatore"
              value={formData.name}
              onChange={handleChange}
              required={!isLogin}
              style={inputStyle}
            />
          )}
          <input
            type="email"
            name="email"
            placeholder="Email"
            value={formData.email}
            onChange={handleChange}
            required
            style={inputStyle}
          />
          <div style={{ position: 'relative' }}>
            <input
              type={showPwd ? 'text' : 'password'}
              name="password"
              placeholder="Password"
              value={formData.password}
              onChange={handleChange}
              required
              style={{ ...inputStyle, paddingRight: '40px' }}
            />
            <button
              type="button"
              onClick={() => setShowPwd(!showPwd)}
              style={{
                position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
                background: 'none', border: 'none', cursor: 'pointer', fontSize: '1rem', color: 'var(--text-dim)',
              }}
            >
              {showPwd ? '🙈' : '👁'}
            </button>
          </div>
          {!isLogin && (
            <div className="privacy-summary">
              <p className="privacy-summary-title">🛡️ In breve, i tuoi dati</p>
              <ul>
                <li>Usiamo <b>nome ed email</b> solo per l’account, le iscrizioni e le email sulle sessioni.</li>
                <li>Gli altri iscritti vedono <b>solo il tuo nome</b>; l’email no.</li>
                <li>La <b>newsletter</b> è facoltativa e la togli quando vuoi.</li>
                <li>Niente pubblicità, profilazione o vendita dei dati. Account inattivi cancellati dopo 24 mesi.</li>
                <li>Puoi <b>cancellare l’account</b> da solo in ogni momento.</li>
              </ul>
              <a href="/privacy" target="_blank" rel="noopener noreferrer">Leggi l’informativa completa →</a>
            </div>
          )}
          {!isLogin && (
            <label style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '0.82rem', color: 'var(--text-muted)', cursor: 'pointer', lineHeight: 1.4 }}>
              <input
                type="checkbox"
                checked={privacyAccepted}
                onChange={e => setPrivacyAccepted(e.target.checked)}
                required
                style={{ marginTop: '2px', width: '15px', height: '15px', accentColor: 'var(--gold)', flexShrink: 0 }}
              />
              <span>
                Ho letto e accetto{' '}
                <a href="/privacy" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--gold)', fontWeight: 700 }}>
                  l'informativa privacy
                </a>
                . Se ho meno di 14 anni, confermo che questa registrazione è stata effettuata con il consenso di un genitore o tutore.
              </span>
            </label>
          )}
          {!isLogin && (
            <label style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '0.82rem', color: 'var(--text-muted)', cursor: 'pointer', lineHeight: 1.4 }}>
              <input
                type="checkbox"
                checked={newsletter}
                onChange={e => setNewsletter(e.target.checked)}
                style={{ marginTop: '2px', width: '15px', height: '15px', accentColor: 'var(--gold)', flexShrink: 0 }}
              />
              <span>Voglio ricevere la newsletter con le novità e le nuove sessioni (facoltativo, puoi cambiare idea quando vuoi).</span>
            </label>
          )}
          <button type="submit" disabled={loading || (!isLogin && !privacyAccepted)} style={{ ...btnStyle, opacity: (!isLogin && !privacyAccepted) ? 0.5 : 1 }}>
            {loading ? '⏳ Caricamento...' : isLogin ? '⚔️ Entra' : '📜 Registrati'}
          </button>
        </form>

        <div style={{ marginTop: '1.5rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.88rem' }}>
          {isLogin ? 'Non hai ancora un Eroe? ' : 'Hai già un account? '}
          <button
            onClick={() => setIsLogin(!isLogin)}
            style={{ background: 'none', border: 'none', color: 'var(--gold)', cursor: 'pointer', fontWeight: 700, fontFamily: 'Atkinson Hyperlegible, system-ui, sans-serif', textDecoration: 'underline' }}
          >
            {isLogin ? 'Registrati' : 'Accedi'}
          </button>

          <button type="button" onClick={() => setShowContact(true)}
            style={{ display: 'block', width: '100%', marginTop: '10px', background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', fontSize: '0.85rem', textDecoration: 'underline' }}>
            ✉️ Contatti — scrivi all’organizzatore
          </button>
          {isLogin && (
            <button
              type="button"
              onClick={() => { setResetEmail(formData.email); setResetMsg(null); setShowReset(true); }}
              style={{
                display: 'block', width: '100%', marginTop: '10px',
                background: 'none', border: 'none', color: 'var(--text-dim)',
                cursor: 'pointer', fontSize: '0.85rem', textDecoration: 'underline',
              }}
            >
              🔑 Password dimenticata?
            </button>
          )}
        </div>
      </div>

      {showContact && <ContactModal onClose={() => setShowContact(false)} />}
      {/* Modal reset password */}
      {showReset && (
        <div style={{
          position: 'fixed', inset: 0,
          background: 'rgba(44,32,17,0.45)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50,
        }}>
          <div className="bg-frame" style={{ ...cardStyle, maxWidth: '340px' }}>
            <h3 style={{ fontFamily: 'Titan One, Luckiest Guy, fantasy', color: 'var(--gold)', marginBottom: '16px' }}>🔑 Password dimenticata?</h3>
            {resetMsg?.ok ? (
              <>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 1.55, marginBottom: '16px' }}>{resetMsg.text}</p>
                <p style={{ color: 'var(--text-dim)', fontSize: '0.8rem', lineHeight: 1.5, marginBottom: '16px' }}>Controlla anche lo spam. Il link vale un’ora.</p>
                <button type="button" onClick={() => setShowReset(false)} style={btnStyle}>Ho capito</button>
              </>
            ) : (
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  setResetLoading(true);
                  try {
                    const r = await authAPI.forgotPassword(resetEmail);
                    setResetMsg({ ok: true, text: r.data.message });
                  } catch (err) {
                    setResetMsg({ ok: false, text: err.response?.data?.error || 'Invio non riuscito, riprova' });
                  } finally {
                    setResetLoading(false);
                  }
                }}
                style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}
              >
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 1.55 }}>
                  Scrivi l’email con cui ti sei registrato: ti mandiamo un link per scegliere una nuova password.
                </p>
                <input type="email" required placeholder="Email" value={resetEmail} onChange={e => setResetEmail(e.target.value)} style={inputStyle} autoFocus />
                {resetMsg && !resetMsg.ok && <p style={{ color: 'var(--red)', fontSize: '0.85rem' }}>{resetMsg.text}</p>}
                <button type="submit" disabled={resetLoading} style={btnStyle}>{resetLoading ? '⏳ Invio...' : 'Mandami il link'}</button>
                <button type="button" onClick={() => setShowReset(false)} style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', fontSize: '0.85rem' }}>Annulla</button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
