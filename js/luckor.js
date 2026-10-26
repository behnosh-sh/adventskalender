// Vilket spel som ligger bakom varje lucka. Lägg till nya rader när spelen är klara.
// sokvag är relativ till startsidan; ?dag=N läggs till automatiskt.
window.LUCKOR = {
  1: { titel: 'Minesweeper', sokvag: 'spel/minesweeper/' },
  2: { titel: 'Wikipedia-spelet', sokvag: 'spel/wikipedia/' }
};

// Under bygget är alla luckor öppna. Sätt till false när datumlåset ska gälla.
window.ALLA_OPPNA = true;
