import { useState } from 'react';

// Un tavolo da gioco visto dall'alto: piano di legno al centro, giocatori seduti intorno.
// Ogni posto mostra il ritratto dell'eroe scelto (se assegnato) e il nome del giocatore, ben leggibile.
// members: [{ id, name, hero?: { name, klass, image } }]
export default function GameTable({ name, members, footer, emptySeats = 4 }) {
  const n = members.length;
  // Oltre 8 giocatori il tavolo diventa ovale, cosi' i posti non si accavallano.
  const oval = n > 8;
  const seats = n > 0 ? members : Array.from({ length: emptySeats }, (_, i) => ({ id: `vuoto-${i}`, empty: true }));
  const rx = oval ? 43 : 37;
  const ry = oval ? 37 : 37;

  return (
    <div className={`gt-card bg-frame ${oval ? 'gt-card-wide' : ''}`}>
      <div className="bg-cartouche gt-title">{name}</div>
      <div className={`gt-area ${oval ? 'gt-area-oval' : ''}`}>
        <div className={`gt-wood ${oval ? 'gt-wood-oval' : ''}`}>
          <span className="gt-wood-label">{n === 0 ? 'Nessun giocatore' : `${n} ${n === 1 ? 'giocatore' : 'giocatori'}`}</span>
          <span className="gt-dice" aria-hidden>🎲</span>
        </div>
        {seats.map((m, i) => {
          // Il primo posto in alto, poi in senso orario.
          const a = (i / seats.length) * 2 * Math.PI - Math.PI / 2;
          const left = 50 + rx * Math.cos(a);
          const top = 50 + ry * Math.sin(a);
          return <Seat key={m.id} m={m} style={{ left: `${left}%`, top: `${top}%` }} />;
        })}
      </div>
      {footer && <div className="gt-footer">{footer}</div>}
    </div>
  );
}

function Seat({ m, style }) {
  const [broken, setBroken] = useState(false);
  if (m.empty) {
    return (
      <div className="gt-seat" style={style} aria-hidden>
        <div className="gt-token gt-token-empty">🪑</div>
      </div>
    );
  }
  const title = m.hero ? `${m.name} — gioca ${m.hero.name}${m.hero.klass ? ` (${m.hero.klass})` : ''}` : m.name;
  return (
    <div className="gt-seat" style={style} title={title}>
      <div className={`gt-token ${m.hero ? 'gt-token-hero' : ''}`}>
        {m.hero?.image && !broken
          ? <img src={m.hero.image} alt="" loading="lazy" onError={() => setBroken(true)} />
          : <span>{m.name.trim().charAt(0).toUpperCase()}</span>}
      </div>
      <div className="gt-name">{shortName(m.name)}</div>
      {m.hero && <div className="gt-hero">{m.hero.name.split(' ')[0]}</div>}
    </div>
  );
}

// Nomi lunghi: "Maximilian Rossi-Verdi" -> "Maximilian R." (il nome completo resta nel tooltip).
function shortName(full) {
  const parts = full.trim().split(/\s+/);
  if (full.length <= 12 || parts.length < 2) return full;
  const short = `${parts[0]} ${parts[parts.length - 1].charAt(0).toUpperCase()}.`;
  return short.length <= 12 ? short : parts[0];
}
