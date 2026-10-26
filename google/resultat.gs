/** @OnlyCurrentDoc */
// Familjens adventskalender: resultat i ett privat Google Sheet.
// Klistras in i arkets Apps Script (Tillägg > Apps Script) och publiceras som webbapp:
//   Kör som: Jag   Åtkomst: Alla
// Arket delas aldrig. Koderna ligger i fliken "Spelare" i arket, aldrig i det publika repot.
//
// Flikar som scriptet använder (skapas av installera() om de saknas):
//   Spelare:  Namn | Kod
//   Resultat: Tidsstämpel | Dag | Spel | Spelare | Status | Värde | Medalj | Text

var FLIK_SPELARE = 'Spelare';
var FLIK_RESULTAT = 'Resultat';
var MAX_FEL_PER_TIMME = 10;
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

// Sidan skickar allt som POST med JSON i kroppen (text/plain, så att webbläsaren inte gör en förfrågan i förväg).
function doPost(e) {
  var svar;
  try {
    var in_ = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    svar = hantera(in_);
  } catch (fel) {
    svar = { ok: false, fel: 'Något gick fel i scriptet.' };
  }
  return ContentService.createTextOutput(JSON.stringify(svar)).setMimeType(ContentService.MimeType.JSON);
}

function hantera(in_) {
  var spelare = hamtaSpelare();
  var jag = vemArDet(in_.kod, spelare);
  if (jag.fel) return { ok: false, fel: jag.fel };
  var namnen = spelare.map(function (s) { return s.namn; });

  if (in_.atgard === 'vem') {
    return { ok: true, namn: jag.namn, spelare: namnen };
  }
  if (in_.atgard === 'hamta') {
    var dag = giltigDag(in_.dag);
    if (!dag) return { ok: false, fel: 'Fel dag.' };
    return { ok: true, namn: jag.namn, spelare: namnen, dag: tavlaForDag(dag, jag.namn, lasResultat()) };
  }
  if (in_.atgard === 'alla') {
    var alla = lasResultat(), dagar = {};
    for (var d = 1; d <= 24; d++) dagar[d] = tavlaForDag(d, jag.namn, alla);
    return { ok: true, namn: jag.namn, spelare: namnen, dagar: dagar };
  }
  if (in_.atgard === 'skicka') {
    return skicka(in_, jag.namn, namnen);
  }
  return { ok: false, fel: 'Okänd åtgärd.' };
}

function skicka(in_, namn, namnen) {
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
    var alla = lasResultat();
    var redan = alla.some(function (r) { return r.dag === dag && r.spelare === namn; });
    if (!redan) {
      arket(FLIK_RESULTAT).appendRow([new Date(), dag, skyddaCell(spel), namn, status, varde, medalj, skyddaCell(text)]);
      alla = lasResultat();
    }
    return { ok: true, redanSkickat: redan, namn: namn, spelare: namnen, dag: tavlaForDag(dag, namn, alla) };
  } finally {
    las.releaseLock();
  }
}

// Andras resultat lämnas bara ut till den som själv har skickat in för dagen.
function tavlaForDag(dag, namn, alla) {
  var rader = alla.filter(function (r) { return r.dag === dag; });
  var harSpelat = rader.some(function (r) { return r.spelare === namn; });
  if (!harSpelat) return { harSpelat: false, antal: rader.length };
  return {
    harSpelat: true,
    antal: rader.length,
    rader: rader.map(function (r) {
      return { spelare: r.spelare, status: r.status, varde: r.varde, medalj: r.medalj, text: r.text, tid: r.tid };
    })
  };
}

function vemArDet(kod, spelare) {
  var cache = CacheService.getScriptCache();
  var fel = Number(cache.get('fel') || 0);
  if (fel >= MAX_FEL_PER_TIMME) return { fel: 'För många felaktiga koder. Vänta en timme och försök igen.' };
  kod = rensaKod(kod);
  var traff = kod ? spelare.filter(function (s) { return s.kod === kod; })[0] : null;
  if (!traff) {
    cache.put('fel', String(fel + 1), 3600);
    Utilities.sleep(1500);
    return { fel: 'Koden stämmer inte.' };
  }
  return { namn: traff.namn };
}

function hamtaSpelare() {
  var v = arket(FLIK_SPELARE).getDataRange().getValues().slice(1);
  return v.filter(function (r) { return r[0] && rensaKod(r[1]); })
    .map(function (r) { return { namn: String(r[0]).trim(), kod: rensaKod(r[1]) }; });
}

function lasResultat() {
  var v = arket(FLIK_RESULTAT).getDataRange().getValues().slice(1);
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
  if (!s) throw new Error('Fliken ' + namn + ' saknas. Kör installera().');
  return s;
}

// Koder jämförs som text. Ett tal som 123 blir "0123" om arket har tagit bort nollan först.
function rensaKod(k) {
  k = String(k == null ? '' : k).trim();
  if (/^\d{1,3}$/.test(k)) k = ('0000' + k).slice(-4);
  return /^\d{4,8}$/.test(k) ? k : '';
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
