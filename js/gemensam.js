// Gemensam kod för startsidan och alla spel.
// Ladda med <script src="../../js/gemensam.js"></script> från spel/<namn>/index.html.
(function () {
  // Byt den här strängen senare så att ingen (inte ens den som byggt) vet dagens banor.
  var FRO_PREFIX = 'adventskalender-2026-dag-';

  // Dag 1–24 från ?dag=N. Saknas eller fel värde blir det null.
  function hamtaDag() {
    var n = parseInt(new URLSearchParams(location.search).get('dag'), 10);
    return n >= 1 && n <= 24 ? n : null;
  }

  // Dagens frösträng, t.ex. "adventskalender-2026-dag-2".
  function froForDag(dag) {
    return FRO_PREFIX + dag;
  }

  // Gör om en sträng till ett 32-bitars tal (cyrb53-varianten, stabil i alla webbläsare).
  function hashStrang(str) {
    var h1 = 0xdeadbeef, h2 = 0x41c6ce57;
    for (var i = 0; i < str.length; i++) {
      var c = str.charCodeAt(i);
      h1 = Math.imul(h1 ^ c, 2654435761);
      h2 = Math.imul(h2 ^ c, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return (h2 ^ h1) >>> 0;
  }

  // Slumpgenerator (mulberry32) som ger samma följd för samma frö. Returnerar tal i [0, 1).
  function skapaSlump(fro) {
    var a = typeof fro === 'number' ? fro >>> 0 : hashStrang(String(fro));
    return function () {
      a = (a + 0x6d2b79f5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // Slump för dagens tävlingsrunda: samma för alla i familjen.
  function dagensSlump(dag) {
    return skapaSlump(froForDag(dag));
  }

  // Slump för "Spela igen": ny varje gång.
  function nySlump() {
    return skapaSlump(Math.floor(Math.random() * 4294967296));
  }

  // Kopierar text till urklipp. Knappen (valfri) visar "Kopierat!" en stund.
  function kopieraResultat(text, knapp) {
    function klart(ok) {
      if (!knapp) return;
      var gammal = knapp.dataset.text || knapp.textContent;
      knapp.dataset.text = gammal;
      knapp.textContent = ok ? 'Kopierat! Klistra in i Discord' : 'Kunde inte kopiera';
      setTimeout(function () { knapp.textContent = gammal; }, 2500);
    }
    function reserv() {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      var ok = false;
      try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
      document.body.removeChild(ta);
      klart(ok);
    }
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(function () { klart(true); }, reserv);
    } else {
      reserv();
    }
  }

  // Formaterar sekunder som 3:07 eller 1:02:07.
  function formateraTid(sek) {
    sek = Math.max(0, Math.round(sek));
    var h = Math.floor(sek / 3600), m = Math.floor((sek % 3600) / 60), s = sek % 60;
    var ss = (s < 10 ? '0' : '') + s;
    return h ? h + ':' + (m < 10 ? '0' : '') + m + ':' + ss : m + ':' + ss;
  }

  // localStorage som tål privata fönster och blockerad lagring.
  function lasa(nyckel, standard) {
    try {
      var v = localStorage.getItem(nyckel);
      return v === null ? standard : JSON.parse(v);
    } catch (e) { return standard; }
  }
  function spara(nyckel, varde) {
    try { localStorage.setItem(nyckel, JSON.stringify(varde)); } catch (e) { /* ignorera */ }
  }

  // Markerar en lucka som öppnad (granen visas "vänd" på startsidan).
  function markeraOppnad(dag) {
    var lista = lasa('advent-oppnade', []);
    if (lista.indexOf(dag) === -1) { lista.push(dag); spara('advent-oppnade', lista); }
  }

  // Egen fråga-ruta i kalenderns stil i stället för confirm(). Ger ett Promise med true/false.
  // Advent.fraga({ rubrik, text, ja, nej }).then(function (ok) { ... });
  function fraga(o) {
    return new Promise(function (svara) {
      var bak = document.createElement('div');
      bak.className = 'fraga-bakgrund';
      var ruta = document.createElement('div');
      ruta.className = 'fraga';
      ruta.setAttribute('role', 'alertdialog');
      ruta.setAttribute('aria-modal', 'true');
      var h = document.createElement('h2');
      h.textContent = o.rubrik;
      ruta.appendChild(h);
      if (o.text) { var t = document.createElement('p'); t.textContent = o.text; ruta.appendChild(t); }
      var ja = document.createElement('button');
      ja.type = 'button';
      ja.className = 'knapp';
      ja.textContent = o.ja || 'Ja';
      var nej = document.createElement('button');
      nej.type = 'button';
      nej.className = 'knapp ljus';
      nej.textContent = o.nej || 'Avbryt';
      ruta.appendChild(ja);
      ruta.appendChild(nej);
      bak.appendChild(ruta);
      function klar(svar) {
        document.removeEventListener('keydown', tangent, true);
        bak.remove();
        svara(svar);
      }
      function tangent(e) {
        if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); klar(false); }
        else e.stopPropagation();   // spelets tangenter ska inte reagera medan rutan är öppen
      }
      ja.addEventListener('click', function () { klar(true); });
      nej.addEventListener('click', function () { klar(false); });
      bak.addEventListener('click', function (e) { if (e.target === bak) klar(false); });
      document.addEventListener('keydown', tangent, true);
      document.body.appendChild(bak);
      nej.focus();
    });
  }

  window.Advent = {
    FRO_PREFIX: FRO_PREFIX,
    hamtaDag: hamtaDag,
    froForDag: froForDag,
    hashStrang: hashStrang,
    skapaSlump: skapaSlump,
    dagensSlump: dagensSlump,
    nySlump: nySlump,
    kopieraResultat: kopieraResultat,
    formateraTid: formateraTid,
    lasa: lasa,
    spara: spara,
    markeraOppnad: markeraOppnad,
    fraga: fraga
  };
})();
