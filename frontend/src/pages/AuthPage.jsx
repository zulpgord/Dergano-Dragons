import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '../services/api';

// ══════════════════════════════════════════════════════
// Logo Auth: drago grande al centro, dado SX, testo
// ══════════════════════════════════════════════════════
function DerganoLogo() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0', marginBottom: '4px' }}>

      {/* Layout a 3 colonne: dado | drago | spazio */}
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: '0', width: '100%', justifyContent: 'center' }}>

        {/* DADO — logo testuale verticale a sinistra */}
        <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', paddingBottom: '8px' }}>
          <img
            src="/dado.png"
            alt="Dergano & Dragons logo"
            style={{
              height: '110px',
              width: 'auto',
              objectFit: 'contain',
              /* bianco su sfondo scuro — già trasparente, artwork chiaro */
              filter: 'drop-shadow(0 0 10px rgba(201,162,39,0.35)) brightness(1.05)',
            }}
          />
        </div>

        {/* DRAGO — grande al centro/destra */}
        <div style={{ flexShrink: 0, display: 'flex', alignItems: 'flex-end' }}>
          <img
            src="/drago.png"
            alt="Drago Dergano & Dragons"
            style={{
              height: '190px',
              width: 'auto',
              objectFit: 'contain',
              /* drago ha outlines nere → invert per sfondo dark */
              filter: 'invert(1) drop-shadow(0 0 8px rgba(201,162,39,0.2)) brightness(0.92)',
            }}
          />
        </div>

      </div>

      {/* Separatore ornamentale */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', maxWidth: '380px', marginTop: '2px' }}>
        <div style={{ flex: 1, height: '1px', background: 'linear-gradient(90deg, transparent, #7a5f14, transparent)' }} />
        <span style={{ color: '#c9a227', fontSize: '0.7rem' }}>✦</span>
        <div style={{ flex: 1, height: '1px', background: 'linear-gradient(90deg, transparent, #7a5f14, transparent)' }} />
      </div>
    </div>
  );
}

export default function AuthPage() {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [showReset, setShowReset] = useState(false);
  const [resetForm, setResetForm] = useState({ email: '', newPassword: '' });
  const [showPwd, setShowPwd] = useState(false);
  const [formData, setFormData] = useState({ email: '', password: '', name: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleReset = async (e) => {
    e.preventDefault();
    try {
      await authAPI.resetPassword(resetForm.email, resetForm.newPassword);
      alert('✅ Password reimpostata con successo!');
      setShowReset(false);
      setResetForm({ email: '', newPassword: '' });
    } catch (err) {
      alert(err.response?.data?.error || 'Errore nel reset della password');
    }
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
        response = await authAPI.register(formData.email, formData.password, formData.name);
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
    backgroundColor: 'var(--bg-card, #231508)',
    border: '1px solid var(--border, #4a2e10)',
    borderRadius: '12px',
    padding: '2.5rem',
    width: '100%',
    maxWidth: '440px',
    boxShadow: '0 8px 32px rgba(0,0,0,0.7), 0 0 0 1px rgba(201,162,39,0.1)',
  };

  const inputStyle = {
    width: '100%',
    padding: '10px 14px',
    backgroundColor: 'var(--bg-surface, #2e1c0d)',
    border: '1px solid var(--border, #4a2e10)',
    borderRadius: '8px',
    color: 'var(--text, #e8d5b7)',
    fontSize: '0.95rem',
    fontFamily: 'var(--font-body, serif)',
    outline: 'none',
    boxSizing: 'border-box',
  };

  const btnStyle = {
    width: '100%',
    padding: '11px',
    background: 'linear-gradient(135deg, #c9a227, #e6c44a)',
    color: '#0f0a05',
    border: '1px solid #7a5f14',
    borderRadius: '8px',
    fontFamily: 'Cinzel, Georgia, serif',
    fontWeight: 700,
    fontSize: '0.9rem',
    letterSpacing: '1px',
    cursor: 'pointer',
    boxShadow: '0 0 10px rgba(201,162,39,0.3)',
    transition: 'all 0.2s',
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      background: 'radial-gradient(ellipse at center, #231508 0%, #0f0a05 100%)',
    }}>
      <div style={cardStyle}>
        <DerganoLogo />

        <h2 style={{
          fontFamily: 'Cinzel, serif',
          fontSize: '0.95rem',
          textAlign: 'center',
          color: 'var(--text-muted, #a89070)',
          marginBottom: '1.5rem',
          marginTop: '1rem',
          letterSpacing: '1px',
        }}>
          {isLogin ? '⚔️ Entra nella Gilda' : '📜 Registra il tuo Eroe'}
        </h2>

        {error && (
          <div style={{
            background: 'rgba(139,26,26,0.25)',
            border: '1px solid rgba(139,26,26,0.5)',
            color: '#f87171',
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
              placeholder="Nome del tuo Eroe"
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
                background: 'none', border: 'none', cursor: 'pointer', fontSize: '1rem', color: '#a89070',
              }}
            >
              {showPwd ? '🙈' : '👁'}
            </button>
          </div>
          <button type="submit" disabled={loading} style={btnStyle}>
            {loading ? '⏳ Caricamento...' : isLogin ? '⚔️ Entra' : '📜 Registrati'}
          </button>
        </form>

        <div style={{ marginTop: '1.5rem', textAlign: 'center', color: 'var(--text-muted, #a89070)', fontSize: '0.88rem' }}>
          {isLogin ? 'Non hai ancora un Eroe? ' : 'Hai già un account? '}
          <button
            onClick={() => setIsLogin(!isLogin)}
            style={{ background: 'none', border: 'none', color: '#c9a227', cursor: 'pointer', fontWeight: 700, fontFamily: 'Cinzel, serif', textDecoration: 'underline' }}
          >
            {isLogin ? 'Registrati' : 'Accedi'}
          </button>

          {isLogin && (
            <button
              type="button"
              onClick={() => setShowReset(true)}
              style={{
                display: 'block', width: '100%', marginTop: '10px',
                background: 'none', border: 'none', color: '#6b5035',
                cursor: 'pointer', fontSize: '0.85rem', textDecoration: 'underline',
              }}
            >
              🔑 Reimposta password
            </button>
          )}
        </div>
      </div>

      {/* Modal reset password */}
      {showReset && (
        <div style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.7)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50,
        }}>
          <div style={{ ...cardStyle, maxWidth: '340px' }}>
            <h3 style={{ fontFamily: 'Cinzel, serif', color: '#c9a227', marginBottom: '16px' }}>🔑 Reimposta password</h3>
            <form onSubmit={handleReset} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <input type="email" placeholder="Email" value={resetForm.email}
                onChange={e => setResetForm(p => ({ ...p, email: e.target.value }))}
                required style={inputStyle} />
              <input type="password" placeholder="Nuova password (min 6 caratteri)" value={resetForm.newPassword}
                onChange={e => setResetForm(p => ({ ...p, newPassword: e.target.value }))}
                required minLength={6} style={inputStyle} />
              <button type="submit" style={btnStyle}>Reimposta</button>
              <button type="button" onClick={() => setShowReset(false)}
                style={{ ...btnStyle, background: 'transparent', color: '#a89070', border: '1px solid #4a2e10', boxShadow: 'none' }}>
                Annulla
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
