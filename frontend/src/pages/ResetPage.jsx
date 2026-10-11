import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '../services/api';

// Pagina raggiunta dal link nell'email "Reimposta la tua password".
export default function ResetPage() {
  const navigate = useNavigate();
  const [token] = useState(() => new URLSearchParams(window.location.search).get('token') || '');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (password.length < 8) return setError('La password deve avere almeno 8 caratteri');
    if (password !== confirm) return setError('Le due password non coincidono');
    setLoading(true);
    try {
      const r = await authAPI.resetPassword(token, password);
      localStorage.setItem('token', r.data.token);
      localStorage.setItem('user', JSON.stringify(r.data.user));
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Qualcosa è andato storto');
    } finally {
      setLoading(false);
    }
  };

  const input = {
    width: '100%', padding: '10px 14px', backgroundColor: 'var(--bg-surface)',
    border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text)',
    fontSize: '16px', fontFamily: 'var(--font-body, serif)', outline: 'none', boxSizing: 'border-box',
  };
  const btn = {
    width: '100%', padding: '11px', background: 'linear-gradient(135deg, var(--gold), var(--gold-light))', color: 'var(--on-gold)',
    border: '1px solid var(--gold)', borderRadius: '8px', fontFamily: 'Atkinson Hyperlegible, system-ui, sans-serif',
    fontWeight: 700, fontSize: '0.9rem', letterSpacing: '1px', cursor: 'pointer',
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', background: 'radial-gradient(ellipse at center, var(--bg-card) 0%, var(--bg-page) 100%)' }}>
      <div className="bg-frame" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '2rem', width: '100%', maxWidth: '400px', boxShadow: '0 8px 28px rgba(80,60,20,0.15)' }}>
        <img src="/drago.png" alt="Dergano & Dragons" style={{ width: '220px', maxWidth: '100%', display: 'block', margin: '0 auto 8px' }} />
        <h2 style={{ fontFamily: 'Titan One, Luckiest Guy, fantasy', fontSize: '1rem', textAlign: 'center', color: 'var(--text-muted)', margin: '0.5rem 0 1.25rem', letterSpacing: '1px' }}>
          🔑 Scegli una nuova password
        </h2>
        {!token ? (
          <p style={{ color: 'var(--red)', textAlign: 'center' }}>Link non valido. Richiedine uno nuovo dalla pagina di accesso.</p>
        ) : (
          <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <input type={showPwd ? 'text' : 'password'} placeholder="Nuova password (min 8 caratteri)" value={password} onChange={e => setPassword(e.target.value)} required autoComplete="new-password" style={input} />
            <input type={showPwd ? 'text' : 'password'} placeholder="Ripeti la password" value={confirm} onChange={e => setConfirm(e.target.value)} required autoComplete="new-password" style={input} />
            <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'flex', gap: '6px', alignItems: 'center' }}>
              <input type="checkbox" checked={showPwd} onChange={e => setShowPwd(e.target.checked)} style={{ accentColor: 'var(--gold)' }} /> Mostra password
            </label>
            {error && <p style={{ color: 'var(--red)', fontSize: '0.88rem' }}>{error}</p>}
            <button type="submit" disabled={loading} style={btn}>{loading ? '⏳ Salvataggio...' : 'Salva e entra'}</button>
          </form>
        )}
        <p style={{ textAlign: 'center', marginTop: '1rem' }}>
          <a href="/auth" style={{ color: 'var(--text-dim)', fontSize: '0.85rem' }}>Torna all’accesso</a>
        </p>
      </div>
    </div>
  );
}
