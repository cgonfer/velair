<a id="automation-blueprints"></a>
# Blueprints voor automatiseringen
<!-- velair-docs:start -->
Vertalingen: [Engels origineel](blueprints.md) · [Español](blueprints.es.md) · [Français](blueprints.fr.md) · [Deutsch](blueprints.de.md) · [Italiano](blueprints.it.md) · [Nederlands](blueprints.nl.md) · [Polski](blueprints.pl.md) · [Português (Brasil)](blueprints.pt-br.md) · [Português (Portugal)](blueprints.pt-pt.md) · [Русский](blueprints.ru.md) · [Vertaalstatus](../translation-status.md)

<details>
<summary>Status van deze vertaling</summary>

| Gegeven | Status |
| --- | --- |
| Referentieversie | 1.9.0-beta.4 |
| Laatst gesynchroniseerd | 2026-10-21 |
| Taalcontrole | AI-ondersteunde vertaling |
| Vergeleken met het origineel | Gesynchroniseerd met het Engelse origineel. |

</details>

---
<!-- velair-docs:end -->

Velair laat aanwezigheid, deuren, gasten en huishoudspecifieke voorwaarden in Home Assistant, in plaats van een tweede automatiseringssysteem te bouwen. Deze optionele blueprints bieden begeleide startpunten voor veelvoorkomende situaties en blijven volledig lokaal en gebeurtenisgestuurd.

Het importeren van een blueprint verandert Velair op zichzelf niet. Home Assistant voegt eerst de herbruikbare blueprint toe; daarna maak en configureer je daarmee een automatisering. Bestaande automatiseringen kunnen blueprintupdates ontvangen door opnieuw te importeren, of je kunt **Controle overnemen** gebruiken om er een zelfstandige Home Assistant-automatisering van te maken.

HACS-integratiepakketten kopiëren automatiseringsblueprints niet automatisch naar de blueprintmap van Home Assistant. Gebruik de onderstaande importlinks.

<a id="available-blueprints"></a>
## Beschikbare blueprints

Blueprints staan in alfabetische volgorde van hun Engelse namen.

- [Thuis en afwezig op basis van bezetting](#home-and-away-from-occupancy)
- [Een zone pauzeren zolang ramen open zijn](#pause-a-zone-while-windows-are-open)
- [Seizoensgebonden klimaatkeuze](#seasonal-climate-selection)

<hr>

<a id="home-and-away-from-occupancy"></a>
### Thuis en afwezig op basis van bezetting

Voer gekozen Home Assistant-acties uit wanneer één gecombineerde bezettingsentiteit bezet of leeg wordt. De acties kunnen een Velair-modus kiezen, een profiel activeren of Velair afstemmen op de rest van het huis. Een vertraagde melding geeft aan wanneer bezetting niet beschikbaar is.

**Versie:** 1.0.0 · **Vereist:** Home Assistant 2024.6.0+

<p>
  <a href="blueprints/home-away-from-occupancy.nl.md"><img src="https://img.shields.io/badge/Documentation-View-24292F?style=for-the-badge&amp;logo=github&amp;logoColor=white" alt="Documentatie van Thuis en afwezig op basis van bezetting bekijken"></a>
  <a href="https://my.home-assistant.io/redirect/blueprint_import/?blueprint_url=https%3A%2F%2Fraw.githubusercontent.com%2Fcgonfer%2Fvelair%2Fmain%2Fblueprints%2Fautomation%2Fvelair%2Foccupancy_home_away.yaml"><img src="https://my.home-assistant.io/badges/blueprint_import.svg" alt="Home Assistant openen en de blueprint Thuis en afwezig op basis van bezetting importeren" height="28"></a>
</p>

<hr>

<a id="pause-a-zone-while-windows-are-open"></a>
### Een zone pauzeren zolang ramen open zijn

Pauzeer een of meer door Velair beheerde klimaatapparaten zolang een geselecteerd raam of een geselecteerde deur open blijft. Hervat daarna hun schema's alleen waar de automatisering nog verantwoordelijk is voor de actieve pauze. Een vertraagde Home Assistant-melding noemt onbeschikbare contacten en de betrokken thermostaten.

**Versie:** 1.0.0 · **Vereist:** Home Assistant 2024.6.0+ en Velair 1.6.0+

<p>
  <a href="blueprints/pause-zone-for-open-windows.nl.md"><img src="https://img.shields.io/badge/Documentation-View-24292F?style=for-the-badge&amp;logo=github&amp;logoColor=white" alt="Documentatie van Een zone pauzeren zolang ramen open zijn bekijken"></a>
  <a href="https://my.home-assistant.io/redirect/blueprint_import/?blueprint_url=https%3A%2F%2Fraw.githubusercontent.com%2Fcgonfer%2Fvelair%2Fmain%2Fblueprints%2Fautomation%2Fvelair%2Fwindow_pause.yaml"><img src="https://my.home-assistant.io/badges/blueprint_import.svg" alt="Home Assistant openen en de blueprint Een zone pauzeren zolang ramen open zijn importeren" height="28"></a>
</p>

<hr>

<a id="seasonal-climate-selection"></a>
### Seizoensgebonden klimaatkeuze

Voer instelbare winter-, zachtweer- of zomeracties eenmaal uit nadat de temperatuur gedurende een positieve vertraging in een nieuw seizoensbereik is gebleven, standaard 30 minuten. Veranderingen binnen dat bereik behouden de eindtijd en herhalen de acties niet. Gebruik de standaard actie-editor om Velair-modi of andere Home Assistant-acties te kiezen. Ongeldige metingen veroorzaken onmiddellijk een melding; bij opstarten wordt de diagnose gecontroleerd zonder een seizoen te kiezen.

Diagnosemeldingen ondersteunen dezelfde talen als Velair, expliciet gekozen in de blueprint.

**Versie:** 1.1.0 · **Vereist:** Home Assistant 2024.6.0+ · **Categorie:** Temperatuur / seizoensautomatisering

<p>
  <a href="blueprints/seasonal-climate-selection.nl.md"><img src="https://img.shields.io/badge/Documentation-View-24292F?style=for-the-badge&amp;logo=github&amp;logoColor=white" alt="Documentatie van Seizoensgebonden klimaatkeuze bekijken"></a>
  <a href="https://my.home-assistant.io/redirect/blueprint_import/?blueprint_url=https%3A%2F%2Fraw.githubusercontent.com%2Fcgonfer%2Fvelair%2Fmain%2Fblueprints%2Fautomation%2Fvelair%2Fseasonal_climate_selection.yaml"><img src="https://my.home-assistant.io/badges/blueprint_import.svg" alt="Home Assistant openen en de blueprint Seizoensgebonden klimaatkeuze importeren" height="28"></a>
  <a href="https://raw.githubusercontent.com/cgonfer/velair/main/blueprints/automation/velair/seasonal_climate_selection.yaml"><img src="https://img.shields.io/badge/YAML_source-View-24292F?style=for-the-badge&amp;logo=github&amp;logoColor=white" alt="YAML-bron van Seizoensgebonden klimaatkeuze bekijken"></a>
</p>

<hr>

<a id="shared-behavior"></a>
## Gemeenschappelijk gedrag

- Blueprints reageren op statuswijzigingen en opstartgebeurtenissen van Home Assistant; ze vragen de status niet voortdurend op.
- Instelbare vertragingen filteren korte statuswijzigingen.
- Statussen `unknown` en `unavailable` worden voorzichtig afgehandeld.
- De bezettingsblueprint meldt langdurige beschikbaarheidsproblemen met de bezettingsbron en verwijdert de waarschuwing na herstel.
- De raamblueprint meldt aanhoudende beschikbaarheidsproblemen met contacten zonder de besturing via werkende contacten te vertragen.
- De seizoensblueprint meldt ongeldige temperatuurmetingen onmiddellijk en kiest nooit een seizoen bij opstarten.
- De blueprintconfiguratie blijft in Home Assistant en komt niet in de Velair-opslag.
- Het opnieuw importeren van dezelfde URL werkt de blueprint bij die bestaande automatiseringen gebruiken.

Elke blueprintpagina beschrijft de eigen vereisten, configuratie, een voorbeeld, veiligheidsmaatregelen, beperkingen en stappen voor probleemoplossing.

<a id="versions-and-updates"></a>
## Versies en updates

Blueprints gebruiken hun eigen semantische versies, los van de Velair-integratie. De importlinks volgen bewust de doorlopende `main`-versie. Importeer dezelfde URL opnieuw als je een compatibele update voor een bestaande automatisering wilt. Home Assistant werkt geïmporteerde blueprints niet automatisch bij.

Updates binnen versie 1 behouden bestaande invoernamen en elke nieuwe invoer krijgt een standaardwaarde. Een niet-compatibele wijziging verschijnt onder een nieuwe bestandsnaam en hoofdversie, waarbij de bestaande URL beschikbaar blijft. Velair inspecteert of migreert geen Home Assistant-automatiseringen of `.storage`-gegevens. **Controle overnemen** maakt een automatisering zelfstandig, maar zorgt er ook voor dat deze geen latere blueprintupdates ontvangt.
