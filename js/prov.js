// Mästarprovet i lucka 24: ett spel öppnas i en ram i kassaskåpet med ?prov=1.
// Då körs spelet i övningsläge utan tavla, regler och rubrik, och varje färdig runda
// rapporteras till kassaskåpet. Inget skickas till resultatarket härifrån.
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
      ' .i-prov .spalt { padding-top: 12px; }';
    document.head.appendChild(stil);
  }
  Advent.Prov = {
    aktiv: aktiv,
    runda: function (varde, text) {
      if (!aktiv) return;
      window.parent.postMessage({ typ: 'provRunda', varde: varde, text: text }, location.origin);
    }
  };
})();
