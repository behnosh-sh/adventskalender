// Familjens gemensamma resultat. Pratar med Apps Script-webbappen i google/resultat.gs.
// Ladda efter gemensam.js och luckor.js:
//   <script src="../../js/resultat.js"></script>
//
// Ett spel gör så här:
//   Advent.Resultat.tavla(elem, dag, { vidStatus: function (d) { ... }, sparNyckel })  visar kodruta, låst tavla eller dagens tavla
//     sparNyckel (valfri, sträng eller lista): där spelet sparar dagens omgång med skickad: true. Har resultatet
//     tagits bort ur arket töms de nycklarna och sidan laddas om, så att man kan spela om.
//   Advent.Resultat.skicka({ dag, spel, status: 'klar' | 'gav upp', varde, medalj, text })  skickar och uppdaterar tavlan
// varde är talet som tavlan sorteras på (t.ex. sekunder). text är det som visas, t.ex. "1:42" eller "5 klick · 1:12".
// Om lägre eller högre är bättre står i js/luckor.js (lagreArBattre, standard true).
(function () {
  // Webbappens adress från Apps Script (Distribuera > Hantera distributioner). Den är inte hemlig.
  var ADRESS = 'https://script.google.com/macros/s/AKfycbz74yJoPNWyAhUPwBwA2-dFhQfr_6AgAZeKFXDW9MCLU-isx2EpocxdSqQdsK3Edgsd/exec';

  var KOD_NYCKEL = 'advent-kod';
  var NAMN_NYCKEL = 'advent-namn';
  var MEDALJ_BOKSTAV = { guld: 'G', silver: 'S', brons: 'B' };
  var MEDALJ_NAMN = { guld: 'Guld', silver: 'Silver', brons: 'Brons' };

  var monterade = [];

  function arInkopplad() { return !!ADRESS; }
  function kod() { return Advent.lasa(KOD_NYCKEL, null); }
  function namn() { return Advent.lasa(NAMN_NYCKEL, null); }

  function anrop(atgard, data) {
    if (!arInkopplad()) return Promise.reject(new Error('Resultattavlan är inte inkopplad än.'));
    var kropp = { atgard: atgard, kod: (data && data.kod) || kod() };
    for (var k in data) if (k !== 'kod') kropp[k] = data[k];
    return fetch(ADRESS, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(kropp)
    })
      .then(function (r) { return r.json(); }, function () { throw new Error('Kunde inte nå resultattavlan. Har du nät?'); })
      .then(function (svar) {
        if (!svar.ok) {
          if (svar.fel === 'Koden stämmer inte.') glomKod();
          throw new Error(svar.fel || 'Något gick fel.');
        }
        if (svar.namn) Advent.spara(NAMN_NYCKEL, svar.namn);
        return svar;
      });
  }

  function glomKod() {
    Advent.spara(KOD_NYCKEL, null);
    Advent.spara(NAMN_NYCKEL, null);
  }

  function loggaIn(nyKod) {
    return anrop('vem', { kod: nyKod }).then(function (svar) {
      Advent.spara(KOD_NYCKEL, nyKod);
      return svar;
    });
  }

  function hamta(dag) { return anrop('hamta', { dag: dag }); }
  function alla() { return anrop('alla', {}); }

  function skicka(resultat) {
    return anrop('skicka', resultat).then(function (svar) {
      monterade.forEach(function (m) { if (m.dag === resultat.dag) rita(m, svar); });
      return svar;
    });
  }

  function lagreArBattre(dag) {
    var l = window.LUCKOR && window.LUCKOR[dag];
    return !(l && l.lagreArBattre === false);
  }

  // Klara först (bäst först), sedan de som gett upp, sedan de som inte spelat.
  function ordna(dag, dagdata, spelare) {
    var lagre = lagreArBattre(dag);
    var rader = (dagdata.rader || []).slice();
    var klara = rader.filter(function (r) { return r.status === 'klar'; })
      .sort(function (a, b) { return lagre ? a.varde - b.varde : b.varde - a.varde; });
    var gavUpp = rader.filter(function (r) { return r.status !== 'klar'; });
    var spelat = rader.map(function (r) { return r.spelare; });
    var ejSpelat = (spelare || []).filter(function (n) { return spelat.indexOf(n) === -1; })
      .map(function (n) { return { spelare: n, status: 'ej' }; });
    var plats = 0, forra = null;
    klara.forEach(function (r, i) {
      if (r.varde !== forra) plats = i + 1;
      forra = r.varde;
      r.plats = plats;
    });
    return klara.concat(gavUpp, ejSpelat);
  }

  function el(tagg, klass, text) {
    var e = document.createElement(tagg);
    if (klass) e.className = klass;
    if (text != null) e.textContent = text;
    return e;
  }

  function medaljBricka(medalj) {
    var b = el('span', 'medalj' + (medalj ? ' ' + medalj : ' ingen'), MEDALJ_BOKSTAV[medalj] || '');
    if (medalj) b.setAttribute('aria-label', MEDALJ_NAMN[medalj]);
    else b.setAttribute('aria-hidden', 'true');
    return b;
  }

  // Ritar dagens rader i en lista. Används både i luckorna och på resultatsidan.
  function ritaRader(lista, dag, dagdata, spelare, jag) {
    lista.textContent = '';
    var rader = ordna(dag, dagdata, spelare);
    // Spel utan medaljer visas utan medaljkolumn.
    lista.classList.toggle('utan-medalj', !rader.some(function (r) { return r.medalj; }));
    rader.forEach(function (r) {
      var rad = el('li', 'tavla-rad' + (r.spelare === jag ? ' jag' : '') + (r.status === 'ej' ? ' vantar' : ''));
      rad.appendChild(el('span', 'plats', r.plats ? String(r.plats) : ''));
      rad.appendChild(r.status === 'ej' ? el('span', 'medalj tom') : medaljBricka(r.status === 'klar' ? r.medalj : ''));
      rad.appendChild(el('span', 'vem', r.spelare));
      rad.appendChild(el('span', 'hur', r.status === 'ej' ? 'har inte spelat än' : r.status === 'klar' ? r.text : 'gav upp'));
      lista.appendChild(rad);
    });
  }

  function ritaLast(ruta, dagdata, spelare) {
    var totalt = (spelare || []).length || 4;
    ruta.appendChild(el('p', 'tavla-antal', dagdata.antal + ' av ' + totalt + ' har spelat'));
    ruta.appendChild(el('p', 'tavla-info', 'Skicka ditt resultat för att se de andras.'));
    var prickar = el('div', 'tavla-prickar');
    prickar.setAttribute('aria-hidden', 'true');
    for (var i = 0; i < totalt; i++) prickar.appendChild(el('span', i < dagdata.antal ? 'pa' : ''));
    ruta.appendChild(prickar);
  }

  function ritaKodruta(m) {
    var ruta = m.innehall;
    ruta.textContent = '';
    ruta.appendChild(el('p', 'tavla-info', 'Skriv in din personliga kod en gång, så kommer telefonen ihåg dig.'));
    var form = el('form', 'tavla-kod');
    var etikett = el('label', null, 'Din kod');
    var inmatning = el('input');
    var id = 'kod-' + Math.random().toString(36).slice(2, 8);
    etikett.htmlFor = id;
    inmatning.id = id;
    inmatning.type = 'password';
    inmatning.inputMode = 'numeric';
    inmatning.autocomplete = 'off';
    inmatning.maxLength = 8;
    var knapp = el('button', 'knapp', 'Spara');
    knapp.type = 'submit';
    var meddelande = el('p', 'tavla-fel');
    form.appendChild(etikett);
    form.appendChild(inmatning);
    form.appendChild(knapp);
    ruta.appendChild(form);
    ruta.appendChild(meddelande);
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var v = inmatning.value.trim();
      if (!v) return;
      knapp.disabled = true;
      meddelande.textContent = '';
      loggaIn(v).then(function () { ladda(m); }, function (fel) {
        knapp.disabled = false;
        meddelande.textContent = fel.message;
      });
    });
  }

  // Telefonen säger att dagens resultat är skickat men tavlan säger att man inte har spelat:
  // raden har tagits bort ur arket. Då töms spelets sparade omgång och sidan laddas om.
  function borttaget(m, dagdata) {
    if (!m.sparNycklar.length || !dagdata || dagdata.harSpelat) return false;
    var skickat = m.sparNycklar.some(function (k) { var v = Advent.lasa(k, null); return v && v.skickad; });
    if (!skickat) return false;
    m.sparNycklar.forEach(function (k) { Advent.spara(k, null); });
    location.reload();
    return true;
  }

  function rita(m, svar) {
    if (borttaget(m, svar.dag)) return;
    var ruta = m.innehall;
    ruta.textContent = '';
    if (svar.dag.harSpelat) {
      var lista = el('ol', 'tavla-lista');
      ritaRader(lista, m.dag, svar.dag, svar.spelare, svar.namn);
      ruta.appendChild(lista);
    } else {
      ritaLast(ruta, svar.dag, svar.spelare);
    }
    var vem = el('p', 'tavla-vem');
    vem.appendChild(document.createTextNode('Du är ' + svar.namn + '. '));
    var byt = el('button', 'lanklik', 'Byt person');
    byt.type = 'button';
    byt.addEventListener('click', function () { glomKod(); ladda(m); });
    vem.appendChild(byt);
    ruta.appendChild(vem);
    if (m.vidStatus) m.vidStatus(svar.dag, svar);
  }

  function ladda(m) {
    if (!arInkopplad()) {
      m.innehall.textContent = '';
      m.innehall.appendChild(el('p', 'tavla-info', 'Resultattavlan är inte inkopplad än.'));
      if (m.vidStatus) m.vidStatus(null);
      return;
    }
    if (!kod()) {
      ritaKodruta(m);
      if (m.vidStatus) m.vidStatus(null);
      return;
    }
    m.innehall.textContent = '';
    m.innehall.appendChild(el('p', 'tavla-info', 'Hämtar…'));
    hamta(m.dag).then(function (svar) { rita(m, svar); }, function (fel) {
      if (!kod()) { ritaKodruta(m); return; }
      m.innehall.textContent = '';
      m.innehall.appendChild(el('p', 'tavla-fel', fel.message));
    });
  }

  // Lägger dagens tavla i elem. vidStatus(dagdata) anropas när det är klart om man har spelat
  // (dagdata.harSpelat), eller med null om personen inte är inloggad.
  function tavla(elem, dag, val) {
    elem.classList.add('tavla', 'kort');
    elem.textContent = '';
    elem.appendChild(el('h2', null, 'Dagens tavla'));
    var innehall = el('div');
    elem.appendChild(innehall);
    var nycklar = val && val.sparNyckel;
    var m = { dag: dag, innehall: innehall, vidStatus: val && val.vidStatus, sparNycklar: nycklar ? [].concat(nycklar) : [] };
    monterade.push(m);
    ladda(m);
    return m;
  }

  Advent.Resultat = {
    arInkopplad: arInkopplad,
    kod: kod,
    namn: namn,
    loggaIn: loggaIn,
    glomKod: glomKod,
    hamta: hamta,
    alla: alla,
    skicka: skicka,
    tavla: tavla,
    ritaRader: ritaRader,
    medaljBricka: medaljBricka
  };
})();
