<a id="documentation"></a>
# Documentatie
<!-- velair-docs:start -->
Vertalingen: [Engels origineel](README.md) · [Español](README.es.md) · [Français](README.fr.md) · [Deutsch](README.de.md) · [Italiano](README.it.md) · [Nederlands](README.nl.md) · [Polski](README.pl.md) · [Português (Brasil)](README.pt-br.md) · [Português (Portugal)](README.pt-pt.md) · [Русский](README.ru.md) · [Vertaalstatus](translation-status.md)

<details>
<summary>Status van deze vertaling</summary>

| Gegeven | Status |
| --- | --- |
| Referentieversie | 1.9.0-beta.6 |
| Laatst gesynchroniseerd | 2026-10-28 |
| Taalcontrole | AI-ondersteunde vertaling |
| Vergeleken met het origineel | Gesynchroniseerd met het Engelse origineel. |

</details>

---
<!-- velair-docs:end -->

De Velair-documentatie is ingedeeld naar doelgroep en onderwerp.

<a id="user-documentation"></a>
## Gebruikersdocumentatie

- [Installatie](user/installation.nl.md): installeer Velair via HACS of handmatig.
- [Gebruik](user/usage.nl.md): stel klimaatapparaten, schema's, sjablonen, profielen, tijdelijke aanpassingen, pauzes, import/export en services in.
- [Kamergroepen](user/room-groups.nl.md): deel planning, besturing en leren van één kamer over meerdere apparaten, met individuele waarnemingen.
- [Paneelnavigatie en directe links](user/usage.nl.md#panel-navigation-and-direct-links): link naar tabbladen en onderdelen, herstel het onderdeel na vernieuwen en gebruik browsergeschiedenis.
- [Externe wijzigingen en handmatige aanpassing](user/manual-control.nl.md): kies of Velair de automatische besturing behoudt of voorrang geeft aan wijzigingen via HA-kaarten, afstandsbedieningen, apparaten en automatiseringen.
- [Externe schema-uitvoering](user/external-systems.nl.md): publiceer compatibele effectieve weekschema's, inclusief profiel- en moduskeuze, naar ondersteunde regelaars zonder aanbiederspecifieke logica in de Velair-planner te mengen.
- [Klimaatprofielen](user/climate-profiles.nl.md): coördineer alternatieve schema's en bied instelbare modi aan Home Assistant-automatiseringen aan.
- [Blokpresets en gekoppelde sjablonen](user/linked-schedules.nl.md): hergebruik klimaatinstellingen en deel dagelijkse tijden of volledige dagschema's tussen standaard- en profielschema's.
- [Voorbeelden van presets en sjablonen](user/linked-schedule-examples.nl.md): stapsgewijze huishoudconfiguraties, seizoensschema's, kopieën, gedeelde wijzigingen en probleemoplossing.
- [Presetautomatiseringen](user/preset-automations.nl.md): wijzig gedeelde doelen en apparaatinstellingen via scripts, met buitentemperatuurvoorbeelden en expliciete vervanging.
- [Gebeurtenissen voor automatiseringen](user/automation-events.nl.md): gebruik volledige runtimegebeurtenisgegevens in Home Assistant-automatiseringen.
- [Blueprints voor automatiseringen](user/blueprints.nl.md): importeer optionele helpers voor bezetting, open ramen en seizoentemperaturen zonder polling.
- [Seizoensgebonden klimaatkeuze](user/blueprints/seasonal-climate-selection.nl.md): kies modi of andere acties op basis van stabiele temperatuurwijzigingen, met onmiddellijke diagnosemeldingen.
- [Adaptieve voorconditionering](user/adaptive-preconditioning.nl.md): begin eerder met geplande comfortdoelen via lokale leergegevens.
- [Geplande terugkeer](user/planned-return.nl.md): stel afwezigheid op basis van bezetting en wekelijkse of eenmalige aankomsten in, met voorbeelden van annuleren vóór en na bevestigd vertrek.
- [Room Assist](user/room-assist.nl.md): gebruik een aparte kamertemperatuursensor voor radiatorkranen, thermostaten en airco's.
- [Toevoerregeling](user/shared-climate-supply.nl.md): regel een gedeelde verwarmings- of koelschakelaar vanuit geschatte kamervraag, met toevoerhysterese en thermostaatuitzonderingen.
- [Betrouwbare overdracht van klimaatopdrachten](user/resilient-climate-delivery.nl.md): begrijp uitgestelde herhaalpogingen en gedrag bij verbindingsherstel wanneer een apparaat tijdelijk niet beschikbaar is.
- [Omgevingscomfort](user/comfort.nl.md): begrijp temperatuur, luchtvochtigheid, CO2-luchtkwaliteit en actualiteit van metingen via lokale kamerbeoordelingen.
- [Temperatuureenheden en migratie](user/temperature-units.nl.md): begrijp Celsius-/Fahrenheit-standaardwaarden, upgrades, migratie, import/export en herstel.
- [Problemen oplossen](user/troubleshooting.nl.md): gebruikelijke problemen met installatie, frontendresources en runtime.
- [Diagnose](user/diagnostics.nl.md): lokale runtimegezondheid, begrensde geschiedenis en probleemrapporten waarin identificerende gegevens zijn vervangen.
- [Sensorreferentie](user/sensors.nl.md): bekijk elke Velair-sensor, de belangrijkste attributen en praktische automatiseringsvoorbeelden.
- [Sensoren voor zonebesturing en overdracht](user/zone-sensors.nl.md): gebruik besturingscontext per klimaatapparaat en runtimegegevens over opdrachtoverdracht in dashboards en automatiseringen.

<a id="developer-documentation"></a>
## Ontwikkelaarsdocumentatie

- [Architectuur](developer/architecture.md): modulegrenzen tussen backend en frontend, opslagmodel en plannerverloop.
- [Interne werking van gekoppelde schema's](developer/linked-schedules.md): actieve blokpresets, koppelingen van alleen tijden en volledige sjablonen, gedeelde transacties en opgeloste schema's.
- [Blueprintonderhoud](developer/blueprints.md): blueprint-YAML, catalogusvermeldingen, consistente detailpagina's, vertalingen en tests toevoegen.
- [WebSocket-API](developer/api.md): afspraken tussen frontend en backend.
- [Interne werking van adaptieve voorconditionering](developer/adaptive-preconditioning.md): lokale leerstatussen, vergelijkbaarheidsweging, opslag en API-uitvoer.
- [Interne werking van Room Assist](developer/room-assist.md): keuze van bron van de kamersensornen, gecorrigeerde doelberekening, runtime-status, herstel en gebeurtenissen.
- [Interne werking van opdrachtoverdracht](developer/climate-delivery.md): gebeurtenisgestuurde herhaalpogingen, beschikbaarheidsherstel, opeenvolgende afhandeling, generaties en grenzen van geslaagde overdracht.
- [Interne werking van omgevingscomfort](developer/comfort.md): bronkeuze, conditiebeoordeling, gegevenskwaliteit, listeners, API-uitvoer en gebeurtenissen.
- [Interne werking van temperatuureenheden](developer/temperature-units.md): opslagmetadata, migratiegrenzen, overdraagbare conversie, validatie en runtimeveiligheid.
- [Frontend](developer/frontend.md): frontend-runtime-elementen, buildopdrachten, Lovelace-resource, vertalingen, interfaceprincipes en frontendwerkproces.
- [Ontwikkeling](developer/development.md): lokale controles, gegenereerde bestanden, coderichtlijnen en bijdragen.
- [Handmatig testen](developer/manual-testing.md): checklist voor releases en gedragscontrole.

<a id="project-documentation"></a>
## Projectdocumentatie

- [Schermafbeeldingen](project/screenshots.md): echte schermafbeeldingen.

Toekomstige ideeën en functieverzoeken horen in GitHub-issues of -discussies, zodat ze met communityfeedback kunnen groeien zonder beloften over een roadmap te maken.
