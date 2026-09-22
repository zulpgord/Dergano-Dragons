import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '../services/api';

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
        <div style={{ flex: 1, height: '1px', background: 'linear-gradient(90deg, transparent, #b0801a, transparent)' }} />
        <span style={{ color: '#b0801a', fontSize: '0.7rem' }}>✦</span>
        <div style={{ flex: 1, height: '1px', background: 'linear-gradient(90deg, transparent, #b0801a, transparent)' }} />
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
    backgroundColor: 'var(--bg-card, #fffbf2)',
    border: '1px solid var(--border, #ddd0b3)',
    borderRadius: '12px',
    padding: '2.5rem',
    width: '100%',
    maxWidth: '440px',
    boxShadow: '0 8px 28px rgba(80,60,20,0.15), 0 0 0 1px rgba(169,121,26,0.08)',
  };

  const inputStyle = {
    width: '100%',
    padding: '10px 14px',
    backgroundColor: 'var(--bg-surface, #ece0c3)',
    border: '1px solid var(--border, #ddd0b3)',
    borderRadius: '8px',
    color: 'var(--text, #262019)',
    fontSize: '0.95rem',
    fontFamily: 'var(--font-body, serif)',
    outline: 'none',
    boxSizing: 'border-box',
  };

  const btnStyle = {
    width: '100%',
    padding: '11px',
    background: 'linear-gradient(135deg, #b0801a, #c99a35)',
    color: '#fffbf2',
    border: '1px solid #b0801a',
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
      background: 'radial-gradient(ellipse at center, #fffbf2 0%, #f4ead4 100%)',
    }}>
      <div style={cardStyle}>
        <DerganoLogo />

        <h2 style={{
          fontFamily: 'Titan One, Luckiest Guy, fantasy',
          fontSize: '0.95rem',
          textAlign: 'center',
          color: 'var(--text-muted, #6b5a3c)',
          marginBottom: '1.5rem',
          marginTop: '1rem',
          letterSpacing: '1px',
        }}>
          {isLogin ? '⚔️ Entra nella Gilda' : '📜 Registra il tuo Eroe'}
        </h2>

        {error && (
          <div style={{
            background: 'rgba(179,38,30,0.10)',
            border: '1px solid rgba(179,38,30,0.35)',
            color: '#a23b22',
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
                background: 'none', border: 'none', cursor: 'pointer', fontSize: '1rem', color: '#8a7f6c',
              }}
            >
              {showPwd ? '🙈' : '👁'}
            </button>
          </div>
          <button type="submit" disabled={loading} style={btnStyle}>
            {loading ? '⏳ Caricamento...' : isLogin ? '⚔️ Entra' : '📜 Registrati'}
          </button>
        </form>

        <div style={{ marginTop: '1.5rem', textAlign: 'center', color: 'var(--text-muted, #6b5a3c)', fontSize: '0.88rem' }}>
          {isLogin ? 'Non hai ancora un Eroe? ' : 'Hai già un account? '}
          <button
            onClick={() => setIsLogin(!isLogin)}
            style={{ background: 'none', border: 'none', color: '#b0801a', cursor: 'pointer', fontWeight: 700, fontFamily: 'Atkinson Hyperlegible, system-ui, sans-serif', textDecoration: 'underline' }}
          >
            {isLogin ? 'Registrati' : 'Accedi'}
          </button>

          {isLogin && (
            <button
              type="button"
              onClick={() => setShowReset(true)}
              style={{
                display: 'block', width: '100%', marginTop: '10px',
                background: 'none', border: 'none', color: '#8a7f6c',
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
          background: 'rgba(44,32,17,0.45)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50,
        }}>
          <div style={{ ...cardStyle, maxWidth: '340px' }}>
            <h3 style={{ fontFamily: 'Titan One, Luckiest Guy, fantasy', color: '#b0801a', marginBottom: '16px' }}>🔑 Reimposta password</h3>
            <form onSubmit={handleReset} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <input type="email" placeholder="Email" value={resetForm.email}
                onChange={e => setResetForm(p => ({ ...p, email: e.target.value }))}
                required style={inputStyle} />
              <input type="password" placeholder="Nuova password (min 6 caratteri)" value={resetForm.newPassword}
                onChange={e => setResetForm(p => ({ ...p, newPassword: e.target.value }))}
                required minLength={6} style={inputStyle} />
              <button type="submit" style={btnStyle}>Reimposta</button>
              <button type="button" onClick={() => setShowReset(false)}
                style={{ ...btnStyle, background: 'transparent', color: '#6b5a3c', border: '1px solid #ddd0b3', boxShadow: 'none' }}>
                Annulla
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
