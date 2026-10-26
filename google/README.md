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

## Säkerhet

- Utan rätt kod gör scriptet ingenting. Efter 10 felaktiga koder på en timme spärras alla försök i en timme.
- Scriptet lämnar bara ut andras resultat för en dag till den som själv har skickat in den dagen.
- Bara det första resultatet per person och dag sparas. Ändringar görs direkt i arket.
- Vill du nollställa efter testandet: radera raderna i fliken Resultat (inte rubrikraden).
