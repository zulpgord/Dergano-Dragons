// ============================================================================
//  IL CONSIGLIO DEL TAVERNIERE — questionario guidato
//
//  Risposte a scelta multipla, punteggio deterministico calcolato nel browser:
//  nessuna chiamata al server, nessuna interpretazione, risultato istantaneo.
//  Ogni opzione assegna punti a classi precise; le tre con il totale più alto
//  vengono proposte alla fine.
//
//  L'ultima domanda non assegna punti: sceglie lo STILE (power / goofy) e
//  filtra quali personaggi mostrare fra quelli della classe consigliata.
// ============================================================================

export const DOMANDE = [
  {
    id: 'rissa',
    testo: 'Scoppia una rissa in taverna. Tu cosa fai?',
    opzioni: [
      { id: 'a', emoji: '💥', testo: 'Mi tuffo nel mucchio senza pensarci',
        punti: { Barbaro: 3, Guerriero: 2, Monaco: 2 } },
      { id: 'b', emoji: '🛡️', testo: 'Mi metto davanti a chi rischia di prenderle',
        punti: { Paladino: 3, Guerriero: 3, Chierico: 1 } },
      { id: 'c', emoji: '🎻', testo: 'Salgo su un tavolo e comincio a cantare',
        punti: { Bardo: 3, Stregone: 1, Warlock: 1 } },
      { id: 'd', emoji: '🌫️', testo: 'Sparisco, e riappaio dietro al più grosso',
        punti: { Ladro: 3, Monaco: 2, Ranger: 1 } },
    ],
  },
  {
    id: 'porta',
    testo: 'Davanti a voi una porta chiusa a chiave. Nessuno ha la chiave.',
    opzioni: [
      { id: 'a', emoji: '🗝️', testo: 'Tiro fuori i grimaldelli',
        punti: { Ladro: 3, Monaco: 1 } },
      { id: 'b', emoji: '🪓', testo: 'Una spallata e la porta è un ricordo',
        punti: { Barbaro: 3, Guerriero: 2 } },
      { id: 'c', emoji: '🪟', testo: 'Cerco un\u2019altra via: finestra, tetto, cantina',
        punti: { Ranger: 3, Druido: 2, Monaco: 2, Ladro: 1 } },
      { id: 'd', emoji: '🔎', testo: 'Ci ragiono: le porte hanno sempre una logica',
        punti: { Mago: 3, Chierico: 1, Paladino: 1 } },
    ],
  },
  {
    id: 'guai',
    testo: 'Il gruppo è nei guai seri. Qual è il tuo primo istinto?',
    opzioni: [
      { id: 'a', emoji: '✨', testo: 'Rimetterli in piedi, uno per uno',
        punti: { Chierico: 3, Druido: 2, Paladino: 1 } },
      { id: 'b', emoji: '🔥', testo: 'Fare più male possibile, e in fretta',
        punti: { Stregone: 3, Warlock: 2, Barbaro: 1 } },
      { id: 'c', emoji: '🌀', testo: 'Cambiare le regole dello scontro',
        punti: { Mago: 3, Druido: 2, Bardo: 1 } },
      { id: 'd', emoji: '💬', testo: 'Parlare. Si può sempre parlare',
        punti: { Bardo: 3, Paladino: 2, Warlock: 1 } },
    ],
  },
  {
    id: 'dono',
    testo: 'Prima di partire il taverniere ti offre un dono. Quale prendi?',
    opzioni: [
      { id: 'a', emoji: '🪓', testo: 'Un\u2019ascia. Una cosa sola, e fatta bene',
        punti: { Barbaro: 3, Guerriero: 2, Paladino: 1 } },
      { id: 'b', emoji: '🛡️', testo: 'Uno scudo consumato e un simbolo sacro',
        punti: { Paladino: 3, Chierico: 2, Guerriero: 1 } },
      { id: 'c', emoji: '🗝️', testo: 'Un mazzo di chiavi che apre serrature diverse',
        punti: { Ladro: 3, Bardo: 1, Monaco: 1, Ranger: 1 } },
      { id: 'd', emoji: '📖', testo: 'Un libro con più formule di quante potrai usarne',
        punti: { Mago: 3, Druido: 2, Chierico: 1 } },
    ],
  },
  {
    id: 'potere',
    testo: 'Da dove viene la tua forza?',
    opzioni: [
      { id: 'a', emoji: '✊', testo: 'Dal mio corpo, allenato per anni',
        punti: { Monaco: 3, Barbaro: 2, Guerriero: 2 } },
      { id: 'b', emoji: '🕯️', testo: 'Da qualcosa in cui credo, e che non tradirei mai',
        punti: { Chierico: 3, Paladino: 3 } },
      { id: 'c', emoji: '🍃', testo: 'Dai libri, o dal bosco: da qualcosa che ho osservato a lungo',
        punti: { Mago: 3, Druido: 3, Ranger: 2 } },
      { id: 'd', emoji: '🩸', testo: 'Ce l\u2019ho dentro da sempre, e ogni tanto mi spaventa',
        punti: { Stregone: 4, Warlock: 1 } },
      { id: 'e', emoji: '👁️', testo: 'Me l\u2019ha data qualcuno che non ho mai visto in faccia, in cambio di qualcosa',
        punti: { Warlock: 4, Stregone: 1 } },
    ],
  },
  {
    id: 'battaglia',
    testo: 'Quando la battaglia comincia, dove ti trovi meglio?',
    opzioni: [
      { id: 'a', emoji: '⚔️', testo: 'In mezzo, dove si spinge',
        punti: { Barbaro: 2, Guerriero: 2, Paladino: 2, Monaco: 2 } },
      { id: 'b', emoji: '🩹', testo: 'Un passo dietro, a coprire gli altri',
        punti: { Chierico: 3, Bardo: 2, Druido: 2 } },
      { id: 'c', emoji: '🏹', testo: 'Lontano, con qualcosa di appuntito',
        punti: { Ranger: 3, Ladro: 2 } },
      { id: 'd', emoji: '💥', testo: 'Lontano, con qualcosa che esplode',
        punti: { Stregone: 3, Mago: 2, Warlock: 2 } },
    ],
  },
  {
    id: 'canzone',
    testo: 'Un giorno i bardi canteranno di te. Che canzone vuoi?',
    nota: 'Questa risposta non cambia la classe: sceglie il tipo di eroe da proporti.',
    opzioni: [
      { id: 'power', emoji: '⚔️', testo: 'Quella dell\u2019eroe che vinse',
        stile: 'power' },
      { id: 'goofy', emoji: '🎭', testo: 'Quella dell\u2019eroe che vinse in un modo che nessuno si aspettava',
        stile: 'goofy' },
    ],
  },
];

// ---------------------------------------------------------------------------
//  Descrizioni brevi mostrate nel risultato finale
// ---------------------------------------------------------------------------
export const CLASSI = {
  Barbaro: { emoji: '🪓', tag: 'Semplice e resistente',
    desc: 'Tanti punti ferita, un\u2019arma grossa e l\u2019Ira, che dimezza quasi tutti i danni. Facile da imparare, difficile da abbattere: se è la tua prima volta al tavolo, qui non sbagli.' },
  Bardo: { emoji: '🎻', tag: 'Il collante del gruppo',
    desc: 'Non fa molti danni: fa vincere gli altri. Regala dadi ai compagni, incanta chi vi sbarra la strada e può addormentare una stanza intera. Da scegliere se ti piace parlare.' },
  Chierico: { emoji: '🕯️', tag: 'Cura e regge',
    desc: 'Rimette in piedi i compagni a terra e incassa colpi grazie all\u2019armatura pesante. Il gruppo se ne accorge quando non c\u2019è. Qualche incantesimo da scegliere ogni mattina.' },
  Druido: { emoji: '🍃', tag: 'Natura e controllo',
    desc: 'Blocca i nemici con i rovi, cura, parla con gli animali e dal secondo livello si trasforma in bestia. Ha parecchie opzioni: meglio se hai già giocato qualche partita.' },
  Guerriero: { emoji: '🛡️', tag: 'Il muro',
    desc: 'La corazza più solida del gruppo e nessuna risorsa complicata da gestire. Sta davanti, tiene la posizione e protegge chi ha meno punti ferita. Semplicissimo da giocare.' },
  Ladro: { emoji: '🗝️', tag: 'Furtività e abilità',
    desc: 'Apre tutto, nota tutto e colpisce forte una volta per turno. Fuori dal combattimento è il personaggio più utile del gruppo. Richiede un po\u2019 di furbizia tattica.' },
  Mago: { emoji: '📖', tag: 'Il più versatile, il più fragile',
    desc: 'Un libro di incantesimi da cui sceglie ogni giorno cosa preparare. Può risolvere scene intere con una formula giusta, ma bastano pochi colpi per metterlo a terra.' },
  Monaco: { emoji: '✋', tag: 'Veloce e mobile',
    desc: 'Due attacchi a mani nude ogni turno già dal primo livello, senza consumare nulla, e nessuna armatura addosso. Va dove gli altri non arrivano.' },
  Paladino: { emoji: '⚔️', tag: 'Difende e giura',
    desc: 'Corazza pesante, scudo, e una riserva di cure per rialzare i compagni. Al secondo livello arriva il Divine Smite e i danni raddoppiano. Solido fin da subito.' },
  Ranger: { emoji: '🏹', tag: 'Distanza ed esplorazione',
    desc: 'Arco lungo, tracce, sopravvivenza: apre gli scontri da lontano e in viaggio non vi perdete mai. Al primo livello è tutto abilità, la magia arriva dopo.' },
  Stregone: { emoji: '🔥', tag: 'Magia esplosiva',
    desc: 'Pochi incantesimi, ma potenti, e una manciata di trucchetti infiniti da lanciare ogni turno. Potere ereditato, non studiato. Fragile: sta dietro.' },
  Warlock: { emoji: '👁️', tag: 'Un patto e un raggio infinito',
    desc: 'Il Raggio Occulto si lancia all\u2019infinito, tutti i turni, senza limiti: nessun\u2019altra classe ha un attacco magico così a questo livello. In cambio, un patto da rispettare.' },
};

// ---------------------------------------------------------------------------
//  Calcolo del punteggio
// ---------------------------------------------------------------------------
export function calcolaRisultato(risposte) {
  const punti = {};
  Object.keys(CLASSI).forEach((c) => { punti[c] = 0; });
  let stile = null;

  DOMANDE.forEach((d) => {
    const scelta = risposte[d.id];
    if (!scelta) return;
    const op = d.opzioni.find((o) => o.id === scelta);
    if (!op) return;
    if (op.stile) stile = op.stile;
    if (op.punti) {
      Object.entries(op.punti).forEach(([cl, p]) => { punti[cl] += p; });
    }
  });

  const classifica = Object.entries(punti)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([classe, punteggio]) => ({ classe, punteggio }));

  return { classifica, top3: classifica.slice(0, 3), stile, punti };
}
