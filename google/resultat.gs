/** @OnlyCurrentDoc */
// Familjens adventskalender: resultat i ett privat Google Sheet.
// Klistras in i arkets Apps Script (Tillägg > Apps Script) och publiceras som webbapp:
//   Kör som: Jag   Åtkomst: Alla
// Arket delas aldrig. Koderna ligger i fliken "Spelare" i arket, aldrig i det publika repot.
//
// Flikar som scriptet använder (skapas av installera() om de saknas):
//   Spelare:  Namn | Kod
//   Resultat: Tidsstämpel | Dag | Spel | Spelare | Status | Värde | Medalj | Text
//   Resultat-test: samma kolumner, låtsasresultat för repetitionen av lucka 24 (skapas av skapaTestflik()).
//
// Repetitionen: när sidan skickar rep: true läser och skriver scriptet BARA i Resultat-test,
// och hela årets lista (alla) visar allt för alla oavsett datum. Fliken Resultat rörs aldrig då.

var FLIK_SPELARE = 'Spelare';
var FLIK_RESULTAT = 'Resultat';
var FLIK_TEST = 'Resultat-test';
var MAX_FEL_PER_TIMME = 10;
var MAX_FEL_JULAFTON = 50;   // 24–26 december, när fyra telefoner och kanske en dator frågar samtidigt
var STATUSAR = ['klar', 'gav upp'];
var MEDALJER = ['', 'guld', 'silver', 'brons'];

// Kör en gång från redigeraren för att skapa flikarna.
function installera() {
  var ark = SpreadsheetApp.getActiveSpreadsheet();
  if (!ark.getSheetByName(FLIK_SPELARE)) {
    var s = ark.insertSheet(FLIK_SPELARE);
    s.appendRow(['Namn', 'Kod']);
    s.getRange('B:B').setNumberFormat('@');
    ['Behnosh', 'Daniel', 'Josefin', 'Joel'].forEach(function (namn) { s.appendRow([namn, '']); });
  }
  if (!ark.getSheetByName(FLIK_RESULTAT)) {
    ark.insertSheet(FLIK_RESULTAT).appendRow(['Tidsstämpel', 'Dag', 'Spel', 'Spelare', 'Status', 'Värde', 'Medalj', 'Text']);
  }
}

// Kör en gång från redigeraren för att skapa fliken Resultat-test med låtsasresultat för dag 1–23.
// Kör den igen för att börja om: fliken töms och fylls på nytt. Fliken Resultat rörs inte.
function skapaTestflik() {
  var ark = SpreadsheetApp.getActiveSpreadsheet();
  var s = ark.getSheetByName(FLIK_TEST) || ark.insertSheet(FLIK_TEST);
  s.clear();
  s.appendRow(['Tidsstämpel', 'Dag', 'Spel', 'Spelare', 'Status', 'Värde', 'Medalj', 'Text']);
  var namn = hamtaSpelare().map(function (p) { return p.namn; });
  var rader = TESTDATA.filter(function (r) { return namn.indexOf(r[3]) !== -1; })
    .map(function (r) { return [new Date(r[0]), r[1], r[2], r[3], r[4], r[5], r[6], r[7]]; });
  if (rader.length) s.getRange(2, 1, rader.length, 8).setValues(rader);
  Logger.log('Fliken ' + FLIK_TEST + ' har ' + rader.length + ' låtsasresultat för ' + namn.join(', ') + '.');
}

// Sidan skickar allt som POST med JSON i kroppen (text/plain, så att webbläsaren inte gör en förfrågan i förväg).
function doPost(e) {
  var svar;
  try {
    var in_ = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    svar = hantera(in_);
  } catch (fel) {
    var saknas = fel && /^Fliken .* saknas/.test(String(fel.message));
    svar = { ok: false, fel: saknas ? String(fel.message) : 'Något gick fel i scriptet.' };
  }
  return ContentService.createTextOutput(JSON.stringify(svar)).setMimeType(ContentService.MimeType.JSON);
}

function hantera(in_) {
  var spelare = hamtaSpelare();
  var jag = vemArDet(in_.kod, spelare);
  if (jag.fel) return { ok: false, fel: jag.fel };
  var namnen = spelare.map(function (s) { return s.namn; });
  if (in_.rep === true) {
    var svar = hanteraRepetition(in_, jag.namn, namnen);
    svar.rep = true;   // sidan kontrollerar att svaret kommer från repetitionen
    return svar;
  }

  if (in_.atgard === 'vem') {
    return { ok: true, namn: jag.namn, spelare: namnen };
  }
  if (in_.atgard === 'hamta') {
    var dag = giltigDag(in_.dag);
    if (!dag) return { ok: false, fel: 'Fel dag.' };
    return { ok: true, namn: jag.namn, spelare: namnen, dag: tavlaForDag(dag, jag.namn, lasResultat()) };
  }
  if (in_.atgard === 'alla') {
    var alla = lasResultat(), dagar = {}, allt = arJulafton();
    for (var d = 1; d <= 24; d++) dagar[d] = tavlaForDag(d, jag.namn, alla, allt);
    return { ok: true, namn: jag.namn, spelare: namnen, dagar: dagar };
  }
  if (in_.atgard === 'skicka') {
    return skicka(in_, jag.namn, namnen);
  }
  return { ok: false, fel: 'Okänd åtgärd.' };
}

// Repetitionen av lucka 24. Allt läses och skrivs i fliken Resultat-test, aldrig i Resultat.
function hanteraRepetition(in_, namn, namnen) {
  var flik = FLIK_TEST;
  if (in_.atgard === 'repKoll' || in_.atgard === 'vem') {
    arket(flik);   // kastar ett fel om testfliken saknas
    return { ok: true, namn: namn, spelare: namnen };
  }
  if (in_.atgard === 'hamta') {
    var dag = giltigDag(in_.dag);
    if (!dag) return { ok: false, fel: 'Fel dag.' };
    return { ok: true, namn: namn, spelare: namnen, dag: tavlaForDag(dag, namn, lasResultat(flik)) };
  }
  if (in_.atgard === 'alla') {
    var alla = lasResultat(flik), dagar = {};
    for (var d = 1; d <= 24; d++) dagar[d] = tavlaForDag(d, namn, alla, true);
    return { ok: true, namn: namn, spelare: namnen, dagar: dagar };
  }
  if (in_.atgard === 'skicka') {
    if (Number(in_.dag) !== 24) return { ok: false, fel: 'I repetitionen skickas bara dag 24.' };
    return skicka(in_, namn, namnen, flik);
  }
  if (in_.atgard === 'repNollstall') {
    var las = LockService.getScriptLock();
    las.waitLock(10000);
    try {
      var s = arket(flik), v = s.getDataRange().getValues();
      for (var r = v.length - 1; r >= 1; r--) if (Number(v[r][1]) === 24) s.deleteRow(r + 1);
    } finally {
      las.releaseLock();
    }
    return { ok: true, namn: namn, spelare: namnen };
  }
  return { ok: false, fel: 'Okänd åtgärd.' };
}

function skicka(in_, namn, namnen, flik) {
  flik = flik || FLIK_RESULTAT;
  var dag = giltigDag(in_.dag);
  var spel = kortText(in_.spel, 40);
  var status = STATUSAR.indexOf(in_.status) !== -1 ? in_.status : null;
  var medalj = MEDALJER.indexOf(in_.medalj || '') !== -1 ? (in_.medalj || '') : null;
  var text = kortText(in_.text, 200);
  var varde = status === 'klar' ? Number(in_.varde) : '';
  if (!dag || !spel || !status || medalj === null) return { ok: false, fel: 'Resultatet ser konstigt ut.' };
  if (status === 'klar' && !(isFinite(varde) && varde >= 0 && varde < 1e9)) return { ok: false, fel: 'Resultatet ser konstigt ut.' };

  var las = LockService.getScriptLock();
  las.waitLock(10000);
  try {
    var alla = lasResultat(flik);
    var redan = alla.some(function (r) { return r.dag === dag && r.spelare === namn; });
    if (!redan) {
      arket(flik).appendRow([new Date(), dag, skyddaCell(spel), namn, status, varde, medalj, skyddaCell(text)]);
      alla = lasResultat(flik);
    }
    return { ok: true, redanSkickat: redan, namn: namn, spelare: namnen, dag: tavlaForDag(dag, namn, alla) };
  } finally {
    las.releaseLock();
  }
}

// Från julafton (24–31 december, svensk tid) visas hela året för alla, så att
// prisutdelningen i lucka 24 räknar likadant på varje telefon.
function arJulafton() {
  return Utilities.formatDate(new Date(), 'Europe/Stockholm', 'MM-dd') >= '12-24';
}

// Andras resultat lämnas bara ut till den som själv har skickat in för dagen, utom från julafton
// (allt = true, bara i hela årets lista).
function tavlaForDag(dag, namn, alla, allt) {
  var rader = alla.filter(function (r) { return r.dag === dag; });
  var harSpelat = allt || rader.some(function (r) { return r.spelare === namn; });
  if (!harSpelat) return { harSpelat: false, antal: rader.length };
  return {
    harSpelat: true,
    antal: rader.length,
    rader: rader.map(function (r) {
      return { spelare: r.spelare, status: r.status, varde: r.varde, medalj: r.medalj, text: r.text, tid: r.tid };
    })
  };
}

// En tom kod (telefonen är inte inloggad) räknas inte som ett fel och väntar inte.
function vemArDet(kod, spelare) {
  if (String(kod == null ? '' : kod).trim() === '') return { fel: 'Telefonen är inte inloggad.' };
  // Fel format (bokstäver, för få eller för många siffror) räknas inte som ett fel och väntar inte.
  if (!giltigtFormat(kod)) return { fel: 'Koden ska vara 4 siffror.' };
  kod = String(kod).trim();
  var cache = CacheService.getScriptCache();
  var fel = Number(cache.get('fel') || 0);
  if (fel >= maxFel()) return { fel: 'För många felaktiga koder. Vänta en timme och försök igen.' };
  var traff = spelare.filter(function (s) { return s.kod === kod; })[0];
  if (!traff) {
    cache.put('fel', String(fel + 1), 3600);
    Utilities.sleep(1500);
    return { fel: 'Koden stämmer inte.' };
  }
  return { namn: traff.namn };
}

function maxFel() {
  var d = Utilities.formatDate(new Date(), 'Europe/Stockholm', 'MM-dd');
  return d >= '12-24' && d <= '12-26' ? MAX_FEL_JULAFTON : MAX_FEL_PER_TIMME;
}

function hamtaSpelare() {
  var v = arket(FLIK_SPELARE).getDataRange().getValues().slice(1);
  return v.filter(function (r) { return r[0] && rensaKod(r[1]); })
    .map(function (r) { return { namn: String(r[0]).trim(), kod: rensaKod(r[1]) }; });
}

function lasResultat(flik) {
  var v = arket(flik || FLIK_RESULTAT).getDataRange().getValues().slice(1);
  return v.map(function (r) {
    return {
      tid: r[0] instanceof Date ? r[0].toISOString() : String(r[0]),
      dag: Number(r[1]), spel: String(r[2]), spelare: String(r[3]), status: String(r[4]),
      varde: r[5] === '' ? null : Number(r[5]), medalj: String(r[6]), text: String(r[7])
    };
  });
}

function arket(namn) {
  var s = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(namn);
  if (!s) throw new Error('Fliken ' + namn + ' saknas. Kör ' + (namn === FLIK_TEST ? 'skapaTestflik()' : 'installera()') + '.');
  return s;
}

// Koder jämförs som text. Ett tal som 123 blir "0123" om arket har tagit bort nollan först.
function rensaKod(k) {
  k = String(k == null ? '' : k).trim();
  if (/^\d{1,3}$/.test(k)) k = ('0000' + k).slice(-4);
  return /^\d{4,8}$/.test(k) ? k : '';
}

// Det som skrivs in på telefonen fylls aldrig ut: "12" är fel format, inte "0012".
function giltigtFormat(k) {
  return /^\d{4}$/.test(String(k == null ? '' : k).trim());
}

function giltigDag(d) {
  d = Number(d);
  return d >= 1 && d <= 24 && Math.floor(d) === d ? d : null;
}

function kortText(t, max) {
  t = String(t == null ? '' : t).replace(/[\u0000-\u0009\u000B-\u001F]/g, '').trim();
  return t ? t.slice(0, max) : '';
}

// Text som börjar med = + - @ tolkas annars som en formel i arket.
function skyddaCell(t) {
  return /^[=+\-@]/.test(t) ? "'" + t : t;
}

// Låtsasresultat för repetitionen (dag 1–23). Används bara av skapaTestflik().
var TESTDATA = [
  ["2026-12-01T17:46:00Z",1,"snake","Behnosh","klar",139609,"brons","längd 13 · 0:39"],
  ["2026-12-01T18:08:00Z",1,"snake","Daniel","klar",109669,"","längd 10 · 0:33"],
  ["2026-12-01T19:35:00Z",1,"snake","Josefin","klar",179499,"silver","längd 17 · 0:50"],
  ["2026-12-01T20:15:00Z",1,"snake","Joel","klar",179489,"silver","längd 17 · 0:51"],
  ["2026-12-02T17:34:00Z",2,"wikipedia","Behnosh","klar",5,"","5 klick"],
  ["2026-12-02T18:05:00Z",2,"wikipedia","Daniel","klar",10,"","10 klick"],
  ["2026-12-02T19:15:00Z",2,"wikipedia","Josefin","klar",6,"","6 klick"],
  ["2026-12-02T20:00:00Z",2,"wikipedia","Joel","klar",8,"","8 klick"],
  ["2026-12-03T17:52:00Z",3,"connections","Behnosh","klar",1,"silver","1 fel"],
  ["2026-12-03T18:54:00Z",3,"connections","Daniel","klar",0,"guld","0 fel"],
  ["2026-12-03T19:16:00Z",3,"connections","Josefin","gav upp","","",""],
  ["2026-12-03T20:38:00Z",3,"connections","Joel","klar",2,"","2 fel"],
  ["2026-12-04T17:26:00Z",4,"gissning","Behnosh","klar",72,"silver","72 p"],
  ["2026-12-04T18:12:00Z",4,"gissning","Daniel","klar",84,"guld","84 p"],
  ["2026-12-04T19:06:00Z",4,"gissning","Josefin","klar",86,"guld","86 p"],
  ["2026-12-04T20:31:00Z",4,"gissning","Joel","klar",73,"silver","73 p"],
  ["2026-12-05T17:44:00Z",5,"globle","Behnosh","klar",5,"silver","5 gissningar"],
  ["2026-12-05T18:15:00Z",5,"globle","Daniel","klar",7,"brons","7 gissningar"],
  ["2026-12-05T19:54:00Z",5,"globle","Josefin","klar",9,"","9 gissningar"],
  ["2026-12-05T20:27:00Z",5,"globle","Joel","klar",4,"guld","4 gissningar"],
  ["2026-12-06T17:27:00Z",6,"2048","Behnosh","klar",9807,"guld","9807 p"],
  ["2026-12-06T18:53:00Z",6,"2048","Daniel","klar",7449,"silver","7449 p"],
  ["2026-12-06T19:51:00Z",6,"2048","Josefin","klar",7449,"silver","7449 p"],
  ["2026-12-06T20:46:00Z",6,"2048","Joel","klar",4005,"","4005 p"],
  ["2026-12-07T17:49:00Z",7,"monster","Behnosh","klar",7,"brons","7 av 10"],
  ["2026-12-07T18:53:00Z",7,"monster","Daniel","klar",8,"silver","8 av 10"],
  ["2026-12-07T19:52:00Z",7,"monster","Josefin","klar",6,"brons","6 av 10"],
  ["2026-12-07T20:07:00Z",7,"monster","Joel","klar",7,"brons","7 av 10"],
  ["2026-12-08T17:16:00Z",8,"cirkel","Behnosh","klar",879,"silver","87,9 %"],
  ["2026-12-08T18:32:00Z",8,"cirkel","Daniel","klar",939,"guld","93,9 %"],
  ["2026-12-08T19:28:00Z",8,"cirkel","Josefin","klar",857,"silver","85,7 %"],
  ["2026-12-08T20:41:00Z",8,"cirkel","Joel","klar",907,"guld","90,7 %"],
  ["2026-12-09T17:44:00Z",9,"revealed","Behnosh","klar",420,"brons","580 p"],
  ["2026-12-09T18:32:00Z",9,"revealed","Daniel","klar",370,"brons","630 p"],
  ["2026-12-09T19:58:00Z",9,"revealed","Josefin","klar",389,"brons","611 p"],
  ["2026-12-10T17:16:00Z",10,"minesweeper","Behnosh","klar",46.2,"silver","46,2 s"],
  ["2026-12-10T18:37:00Z",10,"minesweeper","Daniel","klar",64.4,"","64,4 s"],
  ["2026-12-10T19:32:00Z",10,"minesweeper","Josefin","klar",57.5,"brons","57,5 s"],
  ["2026-12-10T20:55:00Z",10,"minesweeper","Joel","klar",72.2,"","72,2 s"],
  ["2026-12-11T17:55:00Z",11,"wikitrivia","Behnosh","klar",9,"brons","9 i rad"],
  ["2026-12-11T18:56:00Z",11,"wikitrivia","Daniel","klar",10,"silver","10 i rad"],
  ["2026-12-11T19:13:00Z",11,"wikitrivia","Josefin","klar",5,"","5 i rad"],
  ["2026-12-11T20:47:00Z",11,"wikitrivia","Joel","klar",8,"brons","8 i rad"],
  ["2026-12-12T17:41:00Z",12,"labyrint","Behnosh","klar",761,"silver","1:16,1"],
  ["2026-12-12T18:07:00Z",12,"labyrint","Daniel","klar",912,"brons","1:31,2"],
  ["2026-12-12T19:06:00Z",12,"labyrint","Josefin","klar",866,"silver","1:26,6"],
  ["2026-12-12T20:15:00Z",12,"labyrint","Joel","klar",668,"guld","1:06,8"],
  ["2026-12-13T17:19:00Z",13,"nerdle","Behnosh","klar",2,"guld","2 gissningar"],
  ["2026-12-13T18:57:00Z",13,"nerdle","Daniel","klar",4,"brons","4 gissningar"],
  ["2026-12-13T19:33:00Z",13,"nerdle","Josefin","klar",4,"brons","4 gissningar"],
  ["2026-12-13T20:37:00Z",13,"nerdle","Joel","klar",3,"silver","3 gissningar"],
  ["2026-12-14T17:09:00Z",14,"femton","Behnosh","klar",11700124,"silver","1:57 · 124 drag"],
  ["2026-12-14T18:48:00Z",14,"femton","Daniel","klar",13300134,"silver","2:13 · 134 drag"],
  ["2026-12-14T19:18:00Z",14,"femton","Josefin","klar",13900137,"silver","2:19 · 137 drag"],
  ["2026-12-14T20:07:00Z",14,"femton","Joel","klar",12500129,"silver","2:05 · 129 drag"],
  ["2026-12-15T17:54:00Z",15,"snoflingor","Behnosh","klar",1028,"brons","28 poäng"],
  ["2026-12-15T18:30:00Z",15,"snoflingor","Daniel","klar",1030,"silver","30 poäng"],
  ["2026-12-15T19:58:00Z",15,"snoflingor","Josefin","klar",1030,"silver","30 poäng"],
  ["2026-12-15T20:27:00Z",15,"snoflingor","Joel","klar",1021,"brons","21 poäng"],
  ["2026-12-16T17:51:00Z",16,"kodkryss","Behnosh","klar",2180,"silver","3:38"],
  ["2026-12-16T18:10:00Z",16,"kodkryss","Daniel","gav upp","","",""],
  ["2026-12-16T19:47:00Z",16,"kodkryss","Josefin","klar",3520,"brons","5:52"],
  ["2026-12-16T20:41:00Z",16,"kodkryss","Joel","klar",4190,"","6:59"],
  ["2026-12-17T17:05:00Z",17,"memory","Behnosh","klar",2000570,"guld","20 drag · 0:57"],
  ["2026-12-17T18:57:00Z",17,"memory","Daniel","klar",2600810,"silver","26 drag · 1:21"],
  ["2026-12-17T19:17:00Z",17,"memory","Josefin","klar",2600810,"silver","26 drag · 1:21"],
  ["2026-12-17T20:52:00Z",17,"memory","Joel","klar",3201050,"","32 drag · 1:45"],
  ["2026-12-18T18:25:00Z",18,"sudoku","Daniel","klar",3620,"brons","6:02"],
  ["2026-12-18T19:36:00Z",18,"sudoku","Josefin","klar",4710,"","7:51"],
  ["2026-12-18T20:39:00Z",18,"sudoku","Joel","klar",2960,"silver","4:56"],
  ["2026-12-19T17:17:00Z",19,"timeguessr","Behnosh","klar",36331,"guld","36331 p"],
  ["2026-12-19T18:41:00Z",19,"timeguessr","Daniel","klar",18480,"","18480 p"],
  ["2026-12-19T19:22:00Z",19,"timeguessr","Josefin","klar",22985,"brons","22985 p"],
  ["2026-12-19T20:06:00Z",19,"timeguessr","Joel","klar",25705,"brons","25705 p"],
  ["2026-12-20T17:28:00Z",20,"tidskanslan","Behnosh","klar",222,"","2,22 s fel"],
  ["2026-12-20T18:53:00Z",20,"tidskanslan","Daniel","klar",102,"silver","1,02 s fel"],
  ["2026-12-20T19:01:00Z",20,"tidskanslan","Josefin","klar",195,"brons","1,95 s fel"],
  ["2026-12-20T20:37:00Z",20,"tidskanslan","Joel","klar",226,"","2,26 s fel"],
  ["2026-12-21T17:11:00Z",21,"wordle","Behnosh","klar",4,"brons","4/6"],
  ["2026-12-21T18:51:00Z",21,"wordle","Daniel","klar",4,"brons","4/6"],
  ["2026-12-21T19:01:00Z",21,"wordle","Josefin","klar",3,"silver","3/6"],
  ["2026-12-21T20:41:00Z",21,"wordle","Joel","klar",4,"brons","4/6"],
  ["2026-12-22T17:08:00Z",22,"simon","Behnosh","klar",119309,"silver","längd 11 · 1:09"],
  ["2026-12-22T18:13:00Z",22,"simon","Daniel","klar",99449,"brons","längd 9 · 0:55"],
  ["2026-12-22T19:16:00Z",22,"simon","Josefin","klar",99449,"brons","längd 9 · 0:55"],
  ["2026-12-22T20:31:00Z",22,"simon","Joel","klar",119369,"brons","längd 11 · 1:03"],
  ["2026-12-23T17:43:00Z",23,"flygande-tomten","Behnosh","klar",7593,"","7 skorstenar"],
  ["2026-12-23T18:39:00Z",23,"flygande-tomten","Daniel","klar",12815,"silver","12 skorstenar"],
  ["2026-12-23T19:46:00Z",23,"flygande-tomten","Josefin","klar",6314,"","6 skorstenar"],
  ["2026-12-23T20:57:00Z",23,"flygande-tomten","Joel","klar",6600,"","6 skorstenar"]
];
