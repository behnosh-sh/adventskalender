# Adventskalender 2026

Familjens digitala adventskalender. Statisk sida på GitHub Pages, inga konton och ingen server.

## Struktur

- `index.html` – startsidan med 24 granvimplar på snöre.
- `js/luckor.js` – vilket spel som ligger bakom varje lucka, och `ALLA_OPPNA` (byggläge).
- `js/gemensam.js` – delad kod: `Advent.hamtaDag()` läser `?dag=N`, dagens frö
  (`"adventskalender-2026-dag-N"`, prefixet i `FRO_PREFIX`), slumpgenerator m.m.
  `Advent.pausKlocka()` pausar spelets klocka och döljer brädet när man lämnar sidan; nya spel med klocka ska använda den.
- `js/resultat.js` – familjens resultattavla: kodruta, "Skicka till familjen", dagens tavla. Se kommentaren överst.
- `resultat/index.html` – alla luckors resultat. Andras resultat syns bara för luckor man själv har skickat in.
- `google/resultat.gs` – Apps Script som sparar resultaten i ett privat Google Sheet. Se `google/README.md`.
- `css/gemensam.css` – färger, typsnitt och knappar som alla sidor delar.
- `spel/<namn>/index.html` – ett spel per mapp. Läser dagen från `?dag=N` (1–24).

## Testa lokalt

```
python3 -m http.server
```

Öppna http://localhost:8000/. Lägg till `?idag=5` på startsidan för att låtsas att det är 5 december.
