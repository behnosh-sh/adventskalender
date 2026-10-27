// Vilket spel som ligger bakom varje lucka. Lägg till nya rader när spelen är klara.
// sokvag är relativ till startsidan; ?dag=N läggs till automatiskt.
// lagreArBattre: false om högre poäng vinner på resultattavlan (standard: lägre är bättre, t.ex. tid).
window.LUCKOR = {
  1: { titel: 'Snake', sokvag: 'spel/snake/', lagreArBattre: false },
  2: { titel: 'Wikipedia-spelet', sokvag: 'spel/wikipedia/' },
  3: { titel: 'Connections', sokvag: 'spel/connections/' },
  4: { titel: 'Gissningsdagen', sokvag: 'spel/gissning/', lagreArBattre: false },
  5: { titel: 'Globle', sokvag: 'spel/globle/' },
  6: { titel: '2048', sokvag: 'spel/2048/', lagreArBattre: false },
  7: { titel: 'Mönsterdagen', sokvag: 'spel/monster/', lagreArBattre: false },
  8: { titel: 'Perfekt cirkel', sokvag: 'spel/perfekt-cirkel/', lagreArBattre: false },
  9: { titel: 'Revealed', sokvag: 'spel/revealed/' },
  10: { titel: 'Minesweeper', sokvag: 'spel/minesweeper/' },
  11: { titel: 'Wikitrivia', sokvag: 'spel/wikitrivia/', lagreArBattre: false },
  12: { titel: 'Labyrinten', sokvag: 'spel/labyrint/' },
  13: { titel: 'Nerdle', sokvag: 'spel/nerdle/' },
  19: { titel: 'TimeGuessr', sokvag: 'spel/timeguessr/', lagreArBattre: false }
};

// Under bygget är alla luckor öppna. Sätt till false när datumlåset ska gälla.
window.ALLA_OPPNA = true;
