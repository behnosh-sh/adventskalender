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
  14: { titel: 'Femtonspel', sokvag: 'spel/femton/' },
  15: { titel: 'Snöflingefångaren', sokvag: 'spel/snoflingor/', lagreArBattre: false },
  16: { titel: 'Kodkryss', sokvag: 'spel/kodkryss/' },
  17: { titel: 'Memory', sokvag: 'spel/memory/' },
  18: { titel: 'Minisudoku', sokvag: 'spel/sudoku/' },
  19: { titel: 'TimeGuessr', sokvag: 'spel/timeguessr/', lagreArBattre: false },
  20: { titel: 'Tidskänslan', sokvag: 'spel/tidskanslan/' },
  21: { titel: 'Wordle', sokvag: 'spel/wordle/' },
  22: { titel: 'Simon säger', sokvag: 'spel/simon/', lagreArBattre: false },
  23: { titel: 'Flygande tomten', sokvag: 'spel/flygande-tomten/', lagreArBattre: false },
  24: { titel: 'Tomtens kassaskåp', sokvag: 'spel/kassaskap/' }
};

// Datumlåset gäller (true öppnar alla luckor).
window.ALLA_OPPNA = false;

// Datumlåset: lucka N öppnas den N:e i den här månaden (telefonens klocka). 11 = december.
window.KALENDER = { ar: 2026, manad: 11 };

// Hur många luckor som är öppna nu: 0 före månaden, dagens datum (högst 24) under månaden, 24 efter.
window.oppnaTill = function (nu) {
  nu = nu || new Date();
  var k = window.KALENDER, ar = nu.getFullYear(), m = nu.getMonth();
  if (ar < k.ar || (ar === k.ar && m < k.manad)) return 0;
  if (ar === k.ar && m === k.manad) return Math.min(nu.getDate(), 24);
  return 24;
};

// Stängd lucka: en spelsida som öppnas före sitt datum (t.ex. via en sparad länk) visar bara ett kort
// med datumet och en väg tillbaka. Spelet körs aldrig: resten av sidan läses in som dold text.
// Undantag: kassaskåpets repetition och Mästarprovets spel (?prov=1), som ska gå att köra före julafton.
(function () {
  if (window.ALLA_OPPNA) return;
  if (new URLSearchParams(location.search).get('prov') === '1') return;
  var sokvag = location.pathname, i = sokvag.indexOf('/spel/');
  if (i === -1) return;
  var q = new URLSearchParams(location.search);
  var dag = parseInt(q.get('dag'), 10);
  if (!(dag >= 1 && dag <= 24)) {
    dag = null;
    for (var n = 1; n <= 24; n++) {
      var l = window.LUCKOR[n];
      if (l && sokvag.slice(i + 1).indexOf(l.sokvag) === 0) { dag = n; break; }
    }
  }
  if (!dag || dag <= window.oppnaTill()) return;
  if (sokvag.indexOf('/spel/kassaskap/') !== -1) {
    var rep = q.get('repetition');
    if (rep === '1') return;
    try { if (rep !== '0' && JSON.parse(localStorage.getItem('kassaskap-repetition')) === true) return; } catch (e) { /* ignorera */ }
  }
  // Resten av sidan (spelets HTML och skript) blir till dold text och körs aldrig.
  if (document.readyState === 'loading') document.write('<plaintext hidden style="display:none">');
  var rot = sokvag.slice(0, i + 1);
  var datum = new Date(window.KALENDER.ar, window.KALENDER.manad, dag)
    .toLocaleDateString('sv-SE', { weekday: 'long', day: 'numeric', month: 'long' });
  function visa() {
    document.title = 'Lucka ' + dag + ' är stängd';
    document.body.innerHTML = '';
    var main = document.createElement('main');
    main.className = 'spalt';
    main.innerHTML = '<a class="tillbaka" href="' + rot + '">← Kalendern</a>' +
      '<div class="kort stangd-lucka" style="text-align:center;padding:28px 20px;margin-top:24px">' +
      '<p style="font-size:44px;margin:0 0 6px" aria-hidden="true">🔒</p>' +
      '<h1 style="font-size:24px;margin:0 0 8px">Lucka ' + dag + ' är inte öppen än.</h1>' +
      '<p style="margin:0 0 20px">Den öppnas ' + datum + '.</p>' +
      '<a class="knapp" href="' + rot + '">Till kalendern</a></div>';
    document.body.appendChild(main);
  }
  document.addEventListener('DOMContentLoaded', visa);
})();
