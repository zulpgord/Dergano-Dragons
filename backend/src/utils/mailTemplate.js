// Impaginazione comune delle email: HTML semplice compatibile con i client di posta, piu' versione testo.
const FRONTEND_URL = (process.env.FRONTEND_URL || 'https://frontend-virid-eight-r13ams4n3t.vercel.app').replace(/\/$/, '');

const esc = (s = '') => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// body: testo semplice (a capo = nuova riga). button: { label, url } opzionale. footer: HTML opzionale.
const renderMail = ({ greeting, body, button, footer }) => {
  const html = `<div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:520px;margin:auto;padding:24px;color:#2a2118;background:#fbf6ec">
  <h1 style="font-family:Georgia,serif;font-size:24px;margin:0 0 16px;color:#7a4e12">🐉 Dergano &amp; Dragons</h1>
  ${greeting ? `<p>${esc(greeting)}</p>` : ''}
  <p style="line-height:1.55">${esc(body).replace(/\n/g, '<br>')}</p>
  ${button ? `<p style="margin:28px 0"><a href="${esc(button.url)}" style="background:#9a6a1c;color:#fff;text-decoration:none;padding:12px 22px;border-radius:10px;font-weight:600">${esc(button.label)}</a></p>` : ''}
  ${footer ? `<p style="color:#8a7a66;font-size:12px;margin-top:28px">${footer}</p>` : ''}
</div>`;
  const text = [greeting, body, button ? `${button.label}: ${button.url}` : ''].filter(Boolean).join('\n\n');
  return { html, text };
};

module.exports = { FRONTEND_URL, renderMail, esc };
