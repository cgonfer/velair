<a id="seasonal-climate-selection"></a>
# Seizoensgebonden klimaatkeuze
<!-- velair-docs:start -->
Vertalingen: [Engels origineel](seasonal-climate-selection.md) · [Español](seasonal-climate-selection.es.md) · [Français](seasonal-climate-selection.fr.md) · [Deutsch](seasonal-climate-selection.de.md) · [Italiano](seasonal-climate-selection.it.md) · [Nederlands](seasonal-climate-selection.nl.md) · [Polski](seasonal-climate-selection.pl.md) · [Português (Brasil)](seasonal-climate-selection.pt-br.md) · [Português (Portugal)](seasonal-climate-selection.pt-pt.md) · [Русский](seasonal-climate-selection.ru.md) · [Vertaalstatus](../../translation-status.md)

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

Voer gekozen acties uit nadat een temperatuursensor verandert en gedurende een instelbare vertraging dezelfde nieuwe waarde houdt. Kies winter-, zachtweer- of zomermodi zonder schema's te dupliceren of weerregels in Velair op te nemen. Ongeldige sensormetingen veroorzaken onmiddellijk een Home Assistant-melding.

<p>
  <a href="https://my.home-assistant.io/redirect/blueprint_import/?blueprint_url=https%3A%2F%2Fraw.githubusercontent.com%2Fcgonfer%2Fvelair%2Fmain%2Fblueprints%2Fautomation%2Fvelair%2Fseasonal_climate_selection.yaml"><img src="https://my.home-assistant.io/badges/blueprint_import.svg" alt="Home Assistant openen en de blueprint Seizoensgebonden klimaatkeuze importeren" height="28"></a>
  <a href="https://raw.githubusercontent.com/cgonfer/velair/main/blueprints/automation/velair/seasonal_climate_selection.yaml"><img src="https://img.shields.io/badge/YAML_source-View-24292F?style=for-the-badge&amp;logo=github&amp;logoColor=white" alt="YAML-bron van Seizoensgebonden klimaatkeuze bekijken"></a>
</p>

[Wijzigingslog bekijken](../../../blueprints/changelogs/seasonal_climate_selection.md) · [Terug naar de blueprintindex](../blueprints.nl.md)

<a id="when-to-use-it"></a>
## Wanneer gebruiken

Gebruik deze blueprint als Home Assistant al een verwachte dagmaximumtemperatuur, buitenmeting of gemiddelde temperatuur als één numerieke temperatuursensor aanbiedt. Ze kiest welke acties worden uitgevoerd; Velair blijft verantwoordelijk voor schema's, presets, voorconditionering en opdrachtoverdracht naar apparaten.

Bij een sensor die eenmaal per dag wordt bijgewerkt, kan één stabiele update de dagroutine kiezen. Kies de vertraging zorgvuldig bij een vaak veranderende buiten- of gemiddeldesensor: elke nieuwe waarde begint de wachttijd opnieuw. Een sensor met updates om de vijf minuten kan een wachttijd van 30 minuten mogelijk nooit voltooien.

<a id="requirements"></a>
## Vereisten

- Blueprintversie 1.0.0 en Home Assistant 2024.6.0 of nieuwer.
- Eén numerieke sensor met apparaatklasse temperatuur en opgegeven eenheid °C of °F.
- Velair is alleen nodig voor acties die de entiteiten of services ervan gebruiken. Standaardscripts en andere Home Assistant-acties werken zonder Velair.
- Maak de voorspellingssensor apart als je weeraanbieder voorspellingen aanbiedt in plaats van een numerieke sensor. Deze blueprint haalt geen voorspellingen op.

Modi en de oorspronkelijke Velair-moduskiezer zijn beschikbaar vanaf Velair 1.6.0. Gedeelde presets en gekoppelde sjablonen zijn optioneel: de seizoenskiezer kan ook modi kiezen die onafhankelijke schema's gebruiken.

<a id="configuration"></a>
## Configuratie

| Veld | Doel |
|---|---|
| Temperature sensor | De bestaande sensor die wordt gevolgd |
| Temperature unit for thresholds | °C of °F; metingen worden voor vergelijking geconverteerd |
| Winter threshold | Waarden onder deze drempel voeren winteracties uit; standaard 20 |
| Summer threshold | Waarden boven deze drempel voeren zomeracties uit; standaard 27 |
| Winter / Mild-weather / Summer actions | Standaard Home Assistant-actiereeksen; aanvankelijk leeg |
| Stability delay | Hoe lang de nieuwe numerieke temperatuur ongewijzigd moet blijven; standaard 30 minuten |
| Language for diagnostic notifications | Elke Velair-taal voor blijvende sensor- en configuratiewaarschuwingen; standaard Engels |

De winterdrempel moet lager zijn dan de zomerdrempel en de vertraging moet positief zijn. Drempelgetallen veranderen niet automatisch wanneer je Fahrenheit kiest: vul zelf de gewenste Fahrenheit-drempels in.

Deze twee keuzes zijn expliciet, omdat Home Assistant de globale temperatuureenheids- en taalvoorkeuren niet aan blueprint-sjablonen aanbiedt. Ook de taal van de browsergebruiker is geen automatiseringsinstelling. De opgegeven sensoreenheid wordt automatisch gelezen en naar de gekozen drempeleenheid geconverteerd; diagnosemeldingen gebruiken de hier geselecteerde taal.

De taalkeuze verandert uitsluitend de tekst van diagnosemeldingen. Formulierlabels en -beschrijvingen van de blueprint blijven Engels; de Home Assistant-configuratie wordt niet vertaald.

Een lege actiereeks doet niets. Ze schakelt geen klimaatapparaat uit, pauzeert Velair niet en kiest geen Standaard.

<a id="example"></a>
## Voorbeeld

<a id="daily-maximum-and-three-modes"></a>
### Dagmaximum en drie modi

Maak de modi Invierno, Entretiempo en Verano in Velair aan. Koppel Invierno en Verano aan hun bijbehorende profielen. Stel Entretiempo in met een profiel waarvan de betrokken zones **Pauzeren → Klimaatentiteit uitschakelen** gebruiken als zacht weer de klimaatregeling moet uitschakelen.

Voeg in elke blueprintactiereeks de Home Assistant-actie **Select: Select** toe, kies de zichtbare Velair-modusentiteit en selecteer de optie in de editor. Neem niet aan dat jouw entiteit dezelfde ID heeft als het voorbeeld.

```yaml
service: select.select_option
target:
  entity_id: select.velair_mode
data:
  option: Invierno
```

Bij drempels van 20 en 27 °C voert een dagmaximum dat naar 18 °C verandert na 30 ongewijzigde minuten winteracties uit. Een latere update naar 23 °C voert zachtweeracties uit; 30 °C voert zomeracties uit. Precies 20 of 27 °C valt onder zacht weer. Elke gewijzigde waarde kan uitvoeren, ook 18 → 19 °C binnen winter.

<a id="shared-hours-different-indoor-temperatures"></a>
### Gedeelde tijden, verschillende binnentemperaturen

Koppel de profielschema's Invierno en Verano aan hetzelfde dagsjabloon met **Alleen tijden**. Wijs winterpresets toe zoals verwarmen op 21 °C en zomerpresets zoals koelen op 25 °C. Het verplaatsen van het tijdvak 07:00 in het sjabloon verandert beide schema's; de moduskeuze kiest de bijbehorende doelen. De blueprint bewerkt presets of het sjabloon niet. Zie [praktische voorbeelden van gekoppelde schema's](../linked-schedule-examples.nl.md).

<a id="average-temperature-and-fahrenheit"></a>
### Gemiddelde temperatuur en Fahrenheit

Een gemiddeldesensor kan meerdere keren per uur veranderen. Met tien minuten vertraging verschuiven updates om 10:00 en 10:07 de beslissing naar 10:17, mits geen nieuwe waarde volgt. Als de waarde steeds vóór tien minuten verandert, worden geen seizoensacties uitgevoerd.

Een Fahrenheit-sensor kan Celsius-drempels gebruiken, omdat de meting wordt geconverteerd. Je kunt ook °F kiezen en bijvoorbeeld 68 en 80.6 °F invullen, gelijk aan 20 en 27 °C. Een waarde van 77 °F kiest dan zachtweeracties.

<a id="alternative-script-or-service"></a>
### Een ander script of andere service

Elke tak accepteert gewone Home Assistant-acties. Voer bijvoorbeeld een huishoudscript in de zomertak uit:

```yaml
service: script.turn_on
target:
  entity_id: script.summer_climate_routine
```

Rechtstreekse profielactivering kan ook met `velair.activate_profile` en de vaste profiel-ID. Zie [presetautomatiseringen](../preset-automations.nl.md) om gedeelde instellingen te veranderen in plaats van een modus te kiezen; houd rekening met alle gebruikers van een gedeelde preset voordat je deze wijzigt.

<a id="how-it-works"></a>
## Werking

Een statustrigger detecteert een gewijzigde numerieke temperatuur. De oorspronkelijke onderbreekbare Home Assistant-wachttijd controleert vervolgens of deze gedurende de ingestelde vertraging stabiel blijft. Een echte numerieke wijziging onderbreekt de wachtende beslissing en begint een nieuwe wachttijd, ook bij terugkeer naar een eerdere waarde: `21 → 22 → 21` begint opnieuw bij de laatste 21. Alleen een opmaakwijziging zoals `21` naar `21.0` begint geen nieuwe beslissing en onderbreekt geen lopende wachttijd. Alleen attribuutwijzigingen starten geen seizoensacties. Vóór de acties controleert de blueprint de actuele numerieke meting, eenheid, drempels, vertraging en continuïteit van de wachttijd opnieuw.

Een ongeldige meting of eenheid onderbreekt een wachtende beslissing onmiddellijk, ook als alleen het eenheidsattribuut verandert. Herstel van alleen de eenheid verwijdert de diagnosemelding maar kiest geen seizoen; een nieuwe numerieke statuswijziging is nodig. Herstel vanuit een ongeldige numerieke status zoals `unavailable` naar een geldig getal begint een nieuwe vertraging.

Home Assistant-opstarten controleert uitsluitend diagnose. Het kiest geen seizoensmodus. Lopende timers overleven geen herstart of herladen van de automatisering; daarna is een nieuwe sensorstatuswijziging nodig. Er is geen periodieke of dagelijkse trigger en geen helper die de laatste classificatie bewaart.

Als de sensor aanvankelijk ontbreekt en later met een geldige meting verschijnt, geldt die eerste meting als herstel en begint de volledige stabiliteitswachttijd. Hetzelfde geldt als een verwijderde sensor opnieuw wordt aangemaakt. Dit is een sensorovergang na opstarten, geen seizoensactie door de opstartgebeurtenis zelf.

Sensorvalidatie loopt apart van de seizoenswachttijd. Een ontbrekende entiteit, `unknown`, `unavailable`, een niet-eindige of niet-numerieke waarde of een ongeschikte eenheid maakt onmiddellijk één blijvende melding per automatisering in de gekozen taal. Deze noemt automatisering en sensor en legt uit dat seizoensacties zijn onderbroken. Herstel verwijdert de sensorwaarschuwing. Herstel naar een geldige numerieke status begint een nieuwe stabiliteitswachttijd; herstel van alleen de eenheid werkt uitsluitend diagnose bij. Ongeldige configuratie gebruikt een aparte melding.

Een sensor die om 09:00 niet beschikbaar wordt, waarschuwt bijvoorbeeld meteen en niet pas om 09:30. Herstel naar 25 °C om 09:10 maakt zachtweeracties om 09:40 mogelijk als de waarde ongewijzigd blijft.

<a id="safety-and-precedence"></a>
## Veiligheid en voorrang

Bij een ongeldige sensor maakt de blueprint geen nieuwe seizoenskeuze en schakelt apparaten niet automatisch uit. De eerder gekozen modus en het bijbehorende schema blijven actief. Reageer op de melding als dat gedrag voor jouw huis niet geschikt is.

Ingestelde acties gebruiken normale Home Assistant-werking en traces. Een fout draait eerdere acties niet terug. De blueprint kan niet algemeen controleren of een willekeurige actie de bedoelde routine heeft gekozen of een fysiek apparaat heeft bereikt.

Een stabiele nieuwe meting kan een handmatig gekozen afwezigheidsmodus vervangen. Stem seizoens- en aanwezigheidsautomatiseringen af in plaats van beide concurrerende modi te laten kiezen. Een huishoudscript kan bijvoorbeeld Afwezig kiezen als niemand thuis is en alleen bij toegestane aanwezigheid de seizoensmodus voor bezetting kiezen.

Bestaand Velair-modus-/profielgedrag blijft gelden, inclusief pauzevoorrang en annulering van tijdelijke aanpassingen in betrokken zones. Voorconditionering herberekent vanuit het effectieve schema dat de actie kiest; ze kan een nog niet gemaakte seizoenskeuze niet voorspellen.

<a id="limitations"></a>
## Beperkingen

- Stabiliteit betreft de sensorwaarde, niet alleen de classificatie winter/zacht/zomer. Vaak veranderende sensoren kunnen uitvoering onbeperkt uitstellen.
- Geen automatische seizoensactie bij opstarten, dagschema, polling, opgeslagen wachtende timer, extra 24 °C-toestemming of vertraagd uitschakelen.
- Meldingen herkennen geen sensor die stilzwijgend stopt met bijwerken maar een geldig getal behoudt. Bewaking van bronactualiteit moet zo nodig afzonderlijk worden geregeld.
- Er is geen hysterese; de stabiliteitsvertraging filtert wijzigingen. Een nieuwe stabiele waarde binnen dezelfde classificatie voert de tak opnieuw uit.
- Parallelle uitvoering is begrensd. Lange eigen actiereeksen kunnen plaatsen bezet houden; houd acties kort of draag werk aan scripts over.
- Een al gestarte reeks wordt niet door een latere meting geannuleerd. Controles beschermen de start, niet elke zelf ingestelde actie.
- Hernoemen kan de vroegere diagnosemelding laten staan om handmatig te verwijderen. Hernoemde of verwijderde modusopties moeten in de ingestelde acties worden bijgewerkt.

<a id="troubleshooting"></a>
## Problemen oplossen

- Als niets wordt uitgevoerd, controleer of de waarde werkelijk veranderde en de hele vertraging gelijk bleef. Home Assistant starten of herladen begint geen seizoenskeuze.
- Controleer bij een waarschuwing de genoemde sensor, numerieke status en `unit_of_measurement`. Onbekende eenheden worden nooit geraden.
- Als een timer nooit afloopt, bekijk de sensorgeschiedenis en verkort de positieve vertraging of gebruik een dagmaximumsensor.
- Controleer de gekozen drempeleenheid en beide getallen als de verkeerde tak draait.
- Stel bij zacht weer dat apparatuur laat draaien een echte pauze-en-uit-modus in; een lege actielijst is geen uitschakelopdracht.
- Test een modusactie handmatig als de modus niet wordt gekozen en bekijk de trace. Kies de huidige optienaam in de Home Assistant-editor.
- Gebruik bij een import-URL die vóór publicatie nog niet beschikbaar is het YAML-bestand uit de lokale repository om te testen. Openbare links werken zodra het bestand op `main` is gepubliceerd.

<a id="updating-and-customizing"></a>
## Bijwerken en aanpassen

Importeer de blueprint expliciet; installatie of updates van Velair via HACS installeren haar niet. Importeer dezelfde doorlopende `main`-URL opnieuw voor compatibele updates. Versie 1 behoudt invoernamen; nieuwe compatibele invoer krijgt standaardwaarden. Niet-compatibele wijzigingen gebruiken een nieuwe bestandsnaam en hoofdversie.

Home Assistant beheert de resulterende automatisering. Velair migreert geen automatiseringen of `.storage`. Gebruik **Controle overnemen** voor andere logica, waarbij de zelfstandige automatisering geen blueprintupdates meer ontvangt. Zie de [blueprintcatalogus](../blueprints.nl.md) voor gemeenschappelijke verspreidings- en updateregels.
