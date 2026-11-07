// Mästarprovet i lucka 24: ett spel öppnas i en ram i kassaskåpet med ?prov=1.
// Då körs spelet i övningsläge utan tavla, regler och rubrik, och varje färdig runda
// rapporteras till kassaskåpet. Inget skickas till resultatarket härifrån.
// Med &mal=text visas målet som en egen ruta (Mål) bland spelets mätare.
//   <script src="../../js/prov.js?v=1"></script>   (efter gemensam.js)
//   if (Advent.Prov.aktiv) ...                        spelet startar i övningsläge
//   Advent.Prov.runda(varde, text)                     när en runda är slut (samma varde som spelet skickar till tavlan)
(function () {
  var aktiv = /[?&]prov=1(&|$)/.test(location.search) && window.parent !== window;
  if (aktiv) {
    document.documentElement.classList.add('i-prov');
    var stil = document.createElement('style');
    stil.textContent = '.i-prov .tillbaka, .i-prov h1, .i-prov #under, .i-prov #tavla, .i-prov .regler,' +
      ' .i-prov #tillDagens, .i-prov #ovningsmarke, .i-prov #geUpp, .i-prov #visaSvar, .i-prov #skickat { display: none !important; }' +
      ' .i-prov .spalt { padding-top: 12px; }' +
      // Målet visas som en egen ruta bland spelets mätare, i stället för försöksrutan.
      ' .i-prov .matare { grid-template-columns: none; grid-auto-flow: column; grid-auto-columns: minmax(0, 1fr); }' +
      ' .i-prov .matare > div:has(#forsok) { display: none; }' +
      ' .i-prov .matare > .prov-mal { background: rgba(242,194,48,.16); box-shadow: inset 0 0 0 2px rgba(242,194,48,.55); }' +
      ' .i-prov .matare > .prov-mal b { color: #FFD66B; white-space: nowrap; }';
    document.head.appendChild(stil);
    var mal = (location.search.match(/[?&]mal=([^&]*)/) || [])[1];
    if (mal) {
      var lagg = function () {
        var matare = document.querySelector('.matare');
        if (!matare || matare.querySelector('.prov-mal')) return;
        var ruta = document.createElement('div');
        ruta.className = 'prov-mal';
        var etikett = document.createElement('span');
        etikett.textContent = 'Mål';
        var varde = document.createElement('b');
        varde.textContent = decodeURIComponent(mal);
        ruta.appendChild(etikett);
        ruta.appendChild(varde);
        matare.appendChild(ruta);
      };
      if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', lagg); else lagg();
    }
  }
  Advent.Prov = {
    aktiv: aktiv,
    runda: function (varde, text) {
      if (!aktiv) return;
      window.parent.postMessage({ typ: 'provRunda', varde: varde, text: text }, location.origin);
    }
  };
})();
