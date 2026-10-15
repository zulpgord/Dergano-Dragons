import { useState, useEffect } from 'react';
import { contentAPI } from '../services/api';

export default function PrivacyPage() {
  const [content, setContent] = useState('');
  const [updatedAt, setUpdatedAt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    contentAPI.get('privacy_policy')
      .then(res => { setContent(res.data.content); setUpdatedAt(res.data.updated_at); })
      .catch(() => setError('Impossibile caricare l\'informativa in questo momento.'))
      .finally(() => setLoading(false));
  }, []);

  const pStyle = { color: 'var(--text)', fontSize: '0.95rem', lineHeight: 1.7, margin: '0 0 14px', whiteSpace: 'pre-wrap' };

  return (
    <div style={{ minHeight: '100vh', padding: '32px 20px', background: 'var(--bg-page)' }}>
      <div style={{ maxWidth: '760px', margin: '0 auto 12px' }}>
        <a href="/" style={{ color: 'var(--gold)', fontWeight: 700, fontSize: '0.9rem' }}>← Torna al sito</a>
      </div>
      <div style={{
        maxWidth: '760px', margin: '0 auto', background: 'var(--bg-card)',
        border: '1px solid var(--border)', borderRadius: '12px', padding: '2rem',
        boxShadow: '0 8px 28px rgba(38,32,25,0.12)',
      }}>
        <h1 style={{ fontFamily: 'Titan One, Luckiest Guy, fantasy', color: 'var(--gold)', fontSize: '1.4rem', marginBottom: '4px' }}>
          Informativa sul trattamento dei dati personali
        </h1>
        {updatedAt && (
          <p style={{ color: 'var(--text-dim)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
            Dergano &amp; Dragons — ultimo aggiornamento: {new Date(updatedAt).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        )}

        {loading ? (
          <p style={pStyle}>Caricamento...</p>
        ) : error ? (
          <p style={{ ...pStyle, color: 'var(--red)' }}>{error}</p>
        ) : (
          content.split('\n\n').map((para, i) => {
            // "3. Titolo\ntesto…" -> titoletto + testo; le righe che iniziano con "- " diventano un elenco
            const [first, ...rest] = para.split('\n');
            const isHead = /^\d+\.\s/.test(first) && rest.length > 0;
            const body = isHead ? rest : [first, ...rest];
            const bullets = body.filter(l => l.startsWith('- '));
            const lines = body.filter(l => !l.startsWith('- '));
            return (
              <section key={i} style={{ marginBottom: '18px' }}>
                {isHead && <h2 style={{ fontFamily: 'Titan One, Luckiest Guy, fantasy', color: 'var(--gold)', fontSize: '1.02rem', margin: '22px 0 8px', letterSpacing: '0.5px' }}>{first}</h2>}
                {lines.map((l, j) => <p key={j} style={{ ...pStyle, margin: '0 0 8px' }}>{l}</p>)}
                {bullets.length > 0 && <ul style={{ margin: '0 0 8px', paddingLeft: '20px', color: 'var(--text)', lineHeight: 1.7 }}>{bullets.map((l, j) => <li key={j}>{l.slice(2)}</li>)}</ul>}
              </section>
            );
          })
        )}
      </div>
    </div>
  );
}
