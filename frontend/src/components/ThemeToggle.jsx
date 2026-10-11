import { useState } from 'react';

// Tema "pergamena" (chiaro) o "dungeon" (scuro, stile Baldur's Gate). Ricordato sul dispositivo.
export default function ThemeToggle() {
  const [dark, setDark] = useState(() => document.documentElement.dataset.theme === 'dungeon');
  const toggle = () => {
    const next = !dark;
    setDark(next);
    if (next) document.documentElement.dataset.theme = 'dungeon';
    else delete document.documentElement.dataset.theme;
    try { localStorage.setItem('dd_theme', next ? 'dungeon' : 'pergamena'); } catch { /* ignora */ }
  };
  return (
    <button type="button" onClick={toggle} className="theme-toggle"
      title={dark ? 'Passa al tema pergamena' : 'Passa al tema dungeon'} aria-label={dark ? 'Tema chiaro' : 'Tema scuro'}>
      {dark ? '☀️' : '🌙'}
    </button>
  );
}
