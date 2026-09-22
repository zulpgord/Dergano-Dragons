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

  const pStyle = { color: 'var(--text, #262019)', fontSize: '0.95rem', lineHeight: 1.7, margin: '0 0 14px', whiteSpace: 'pre-wrap' };

  return (
    <div style={{ minHeight: '100vh', padding: '32px 20px', background: 'var(--bg-page, #f4ead4)' }}>
      <div style={{
        maxWidth: '680px', margin: '0 auto', background: 'var(--bg-card, #fffbf2)',
        border: '1px solid var(--border, #ddd0b3)', borderRadius: '12px', padding: '2rem',
        boxShadow: '0 8px 28px rgba(38,32,25,0.12)',
      }}>
        <h1 style={{ fontFamily: 'Titan One, Luckiest Guy, fantasy', color: '#b0801a', fontSize: '1.4rem', marginBottom: '4px' }}>
          Informativa sul trattamento dei dati personali
        </h1>
        {updatedAt && (
          <p style={{ color: '#8a7f6c', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
            Dergano &amp; Dragons — ultimo aggiornamento: {new Date(updatedAt).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        )}

        {loading ? (
          <p style={pStyle}>Caricamento...</p>
        ) : error ? (
          <p style={{ ...pStyle, color: '#a23b22' }}>{error}</p>
        ) : (
          content.split('\n\n').map((para, i) => <p key={i} style={pStyle}>{para}</p>)
        )}
      </div>
    </div>
  );
}
