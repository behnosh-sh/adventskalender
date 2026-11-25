# Resultattavlan i Google

Resultaten sparas i ett privat Google Sheet. Sidan pratar bara med ett litet Apps Script
(`resultat.gs`) som körs som Behnosh. Arket delas aldrig, och koderna finns bara i arket.

## Så sätter du upp det (en gång)

1. Skapa ett nytt Google Sheet, t.ex. "Adventskalender resultat". Dela det inte.
2. I arket: **Tillägg > Apps Script**. Ta bort det som står där och klistra in hela `resultat.gs`. Spara.
   Första raden ska vara `/** @OnlyCurrentDoc */`. Den gör att scriptet bara får komma åt just det här arket.
3. Välj funktionen **installera** i listan överst och tryck **Kör**. Godkänn behörigheterna
   (Google varnar för att appen inte är verifierad: **Avancerat > Gå till ... (osäkert)**, det är ditt eget script).
   Nu finns flikarna **Spelare** och **Resultat** i arket.
4. I fliken **Spelare**: skriv en fyrsiffrig kod till var och en i kolumnen Kod. Kolumnen är formaterad som text,
   så nollor i början stannar kvar.
5. I Apps Script: **Distribuera > Ny distribution**. Kugghjulet: **Webbapp**.
   - Kör som: **Jag**
   - Vem har åtkomst: **Alla**
   Tryck **Distribuera** och kopiera webbappens adress (slutar på `/exec`).
6. Klistra in adressen i `js/resultat.js` på raden `var ADRESS = '';`. Adressen är inte hemlig.

## Om du ändrar scriptet senare

**Distribuera > Hantera distributioner > pennan > Version: Ny version > Distribuera.** Då behålls samma adress.

## Ny version för julafton och repetitionen (november 2026)

Den här versionen gör tre saker: en telefon som inte är inloggad räknas inte längre som en felaktig kod,
gränsen för felaktiga koder är 50 i timmen den 24–26 december (annars 10), och repetitionen av lucka 24
får en egen flik, **Resultat-test**. Fliken Resultat ändras inte.

1. Öppna arket på en dator. **Tillägg > Apps Script**.
2. Markera allt i `Kod.gs` (Ctrl+A eller Cmd+A) och ta bort det. Klistra in hela den nya `resultat.gs` från repot. Spara (diskettikonen).
3. Välj funktionen **skapaTestflik** i listan överst och tryck **Kör**. Godkänn behörigheterna om Google frågar.
   Nu finns fliken **Resultat-test** med låtsasresultat för dag 1–23. Loggen längst ner säger hur många rader det blev (90).
   Kör den igen när du vill börja om med fräsch låtsasdata. Den rör bara Resultat-test.
4. **Distribuera > Hantera distributioner**, tryck på pennan, välj **Version: Ny version** och tryck **Distribuera**.
   Adressen är densamma som förut, så ingenting behöver ändras i sidan.

Klart. Sidan kontrollerar själv att scriptet är uppdaterat innan repetitionen skickar något. Är det inte det står det
"Scriptet i arket är inte uppdaterat för repetitionen." och inget skickas.

## Repetitionen av lucka 24

- Öppna `…/spel/kassaskap/?repetition=1` på varje telefon. Det står **Repetition** vid rubriken.
- Lamporna, Mästarprovet och prisutdelningen är på riktigt, men läser och skriver bara i fliken Resultat-test.
  Gran, brev, gåta och paket är exempelpusslen (koden blir 3816). Turordningen och lagen lottas med ett annat frö än på julafton.
- **Börja om repetitionen** tar bort raderna för dag 24 i Resultat-test och börjar om från kuvertet på den telefonen. Tryck på den på varje telefon.
- **Avsluta repetitionen** (eller `?repetition=0`) tar telefonen tillbaka till det vanliga skåpet. Från den 24 december fungerar repetitionen inte alls.
- Ett långt tryck på rubriken visar lägesraden: vem telefonen är inloggad som, när arket svarade senast och hur många som är klara.

## Säkerhet

- Utan rätt kod gör scriptet ingenting. Efter 10 felaktiga koder på en timme spärras alla försök i en timme (50 den 24–26 december). En tom kod räknas inte, och inte heller en kod i fel format (allt som inte är exakt fyra siffror). Det som skrivs in fylls aldrig ut med nollor.
- Scriptet lämnar bara ut andras resultat för en dag till den som själv har skickat in den dagen. Från julafton (24 december) visar hela årets lista allt för alla, så att prisutdelningen i lucka 24 blir likadan på varje telefon.
- Bara det första resultatet per person och dag sparas. Ändringar görs direkt i arket.
- Vill du nollställa efter testandet: radera raderna i fliken Resultat (inte rubrikraden).
