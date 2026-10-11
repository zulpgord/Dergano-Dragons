// Applica il tema salvato prima del primo disegno, per evitare il lampo del tema chiaro.
export const applySavedTheme = () => {
  try {
    if (localStorage.getItem('dd_theme') === 'dungeon') document.documentElement.dataset.theme = 'dungeon';
  } catch { /* storage non disponibile */ }
};
