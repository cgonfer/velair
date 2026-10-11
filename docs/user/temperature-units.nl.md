<a id="temperature-units-and-migration"></a>
# Temperatuureenheden en migratie
<!-- velair-docs:start -->
Vertalingen: [Engels origineel](temperature-units.md) · [Español](temperature-units.es.md) · [Français](temperature-units.fr.md) · [Deutsch](temperature-units.de.md) · [Italiano](temperature-units.it.md) · [Nederlands](temperature-units.nl.md) · [Polski](temperature-units.pl.md) · [Português (Brasil)](temperature-units.pt-br.md) · [Português (Portugal)](temperature-units.pt-pt.md) · [Русский](temperature-units.ru.md) · [Vertaalstatus](../translation-status.md)

<details>
<summary>Status van deze vertaling</summary>

| Gegeven | Status |
| --- | --- |
| Referentieversie | 1.9.0-beta.1 |
| Laatst gesynchroniseerd | 2026-10-11 |
| Taalcontrole | AI-ondersteunde vertaling |
| Vergeleken met het origineel | Gesynchroniseerd met het Engelse origineel. |

</details>

---
<!-- velair-docs:end -->

Velair ondersteunt Celsius en Fahrenheit en volgt de ingestelde temperatuureenheid van Home Assistant. Er is geen afzonderlijke eenheidskeuze in Velair. De gedetecteerde eenheid wordt alleen weergegeven onder **Instellingen > Temperatuureenheid**; wijzig deze via de instellingen voor het eenhedenstelsel van Home Assistant.

<a id="new-installations-and-resets"></a>
## Nieuwe installaties en resets

Bij de eerste configuratie maakt Velair schema's, ingebouwde sjablonen, comfortdrempels, Room Assist-limieten en instellingen voor adaptieve voorconditionering aan in de eenheid die Home Assistant aangeeft. Een reset van Velair maakt deze standaardwaarden opnieuw aan voor de op dat moment gedetecteerde eenheid.

Doeltemperaturen worden gecontroleerd tegen het minimum, maximum en de effectieve temperatuurstap van elk beheerd klimaatapparaat. Velair gebruikt `target_temp_step` rechtstreeks wanneer Home Assistant dit attribuut aanbiedt. Anders tonen de instellingen de gebruikte terugvalwaarde: de laatst geldige stap die de entiteit heeft gemeld, de opgeslagen handmatige waarde voor de zone of `1` als beide ontbreken. Je kunt deze instellen op de werkelijke stapgrootte van het apparaat. Als je de waarde opslaat terwijl het attribuut ontbreekt, wordt de onthouden waarneming gewist zonder schemaregels te wijzigen. Een latere geldige melding krijgt weer voorrang en wordt opnieuw onthouden. Zo kan een onregelmatig rapporterende entiteit bestaande schema's met decimalen niet ongeldig maken door het attribuut weg te laten.

De reeks geldige doeltemperaturen begint bij de minimumtemperatuur die het apparaat meldt, niet bij nul. Dit behoudt de werkelijke instelpunten van het apparaat in Celsius en Fahrenheit, ook als het minimum geen exact veelvoud van de stapgrootte is.

<a id="existing-stored-data"></a>
## Bestaande opgeslagen gegevens

Velair bewaart temperatuurinstellingen in de eenheid die bij de gegevens is vastgelegd. Opgeslagen getallen krijgen niet stilzwijgend een andere betekenis wanneer de Home Assistant-eenheid verandert.

Als opgeslagen gegevens al een eenheid vermelden en Home Assistant later de andere eenheid meldt, doet Velair het volgende:

1. automatische planning en het versturen van temperatuurinstellingen stoppen;
2. de actieve herstelstatus van Room Assist bewaren en de listeners stoppen;
3. een blijvende Home Assistant-melding aanmaken;
4. de bron- en doeleenheid in de Velair-instellingen tonen; en
5. een expliciete migratie van alle opgeslagen temperatuurgegevens aanbieden.

Voer deze migratie alleen uit als alle opgeslagen waarden nog steeds de getoonde broneenheid gebruiken. De bewerking converteert schema's, sjablonen, actieve en eerdere doeltemperaturen van tijdelijke aanpassingen, terugvalwaarden voor temperatuurstappen, comfortdrempels, Room Assist-instellingen, configuratie van adaptieve voorconditionering, laatst gemelde temperatuurstappen, snelheden en leerwaarnemingen. Doeltemperaturen die bij een bekend klimaatapparaat horen, worden zo mogelijk op de effectieve stapgrootte afgestemd. Andere geconverteerde bewerkbare waarden krijgen een veilige nauwkeurigheid; er wordt geen apparaatstap verzonnen.

De planner hervat pas nadat de geconverteerde gegevens zijn opgeslagen en de runtime-status is hersteld. Na een geslaagde bewerking herstelt Room Assist de geconverteerde geplande doeltemperatuur en wist de opgeslagen herstelstatus. Als de gegevens wel zijn opgeslagen maar het runtimeherstel mislukt, blijft Velair gestopt en meldt het dat je de integratie opnieuw moet laden of Home Assistant moet herstarten.

<a id="upgrading-published-celsius-only-data"></a>
## Oudere Celsius-gegevens bijwerken

Uitgebrachte Velair-versies van vóór de registratie van eenheidsmetadata behandelden opgeslagen temperatuurwaarden als Celsius. Velair gaat er daarom van uit dat oudere gegevens zonder eenheid Celsius gebruiken.

- Als Home Assistant Celsius gebruikt, kan Velair met deze waarden doorgaan en de eenheidsmetadata vastleggen.
- Als Home Assistant Fahrenheit gebruikt, probeert Velair niet te raden of afzonderlijke waarden handmatig zijn aangepast. De planner stopt en vraagt om **Velair resetten**, waarmee oude gegevens worden vervangen door nieuwe standaardwaarden in Fahrenheit.

Export blijft beschikbaar zolang deze reset nodig is. Zo kun je een kopie ter referentie bewaren voordat de oude schema's en instellingen worden gewist.

<a id="export-and-import"></a>
## Exporteren en importeren

Huidige exports bevatten een veld `temperature_unit`. Als een geïmporteerd bestand de andere eenheid gebruikt, converteert Velair de geselecteerde temperatuuronderdelen naar de huidige Home Assistant-eenheid voordat deze worden opgeslagen.

Oudere back-ups zonder `temperature_unit` worden geaccepteerd en als Celsius behandeld. Het importscherm toont deze aanname vóór de import. Bij een Fahrenheit-installatie worden deze oudere waarden automatisch naar Fahrenheit geconverteerd.

Importeren overschrijft de geselecteerde onderdelen: overeenkomende schema's, sjablonen, instellingen of leergegevens worden vervangen. Exporteer eerst de huidige configuratie als je mogelijk een herstelpunt nodig hebt.

De handmatige terugvalwaarde voor de temperatuurstap per zone wordt opgenomen in de overdraagbare zonegegevens en als temperatuurverschil geconverteerd wanneer de eenheden verschillen. De laatst waargenomen stap van een lokale klimaatentiteit hoort bij de interne apparaatcontext en wordt niet geëxporteerd.

<a id="temporarily-unavailable-climates"></a>
## Tijdelijk onbeschikbare klimaatapparaten

Een klimaatapparaat meldt mogelijk geen temperatuurbereik of stapgrootte zolang het niet beschikbaar is. Velair kan de opgeslagen gegevens toch migreren of importeren en controleert de schema's wanneer het apparaat zijn mogelijkheden weer meldt. Een niet-compatibel schema wordt in het paneel aangeduid en moet worden gecorrigeerd voordat je erop kunt vertrouwen.

<a id="what-velair-converts"></a>
## Wat Velair converteert

Opgeslagen configuratie en geïmporteerde back-upgegevens worden alleen tijdens een expliciete migratie of import geconverteerd. Actuele metingen en doeltemperaturen van klimaatapparaten horen al bij Home Assistant en worden niet nogmaals geconverteerd. Metingen van externe kamer- of buitensensoren worden alleen voor een vergelijking geconverteerd wanneer hun opgegeven eenheid verschilt van die van het beheerde klimaatapparaat.
