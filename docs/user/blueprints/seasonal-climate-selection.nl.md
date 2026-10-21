<a id="seasonal-climate-selection"></a>
# Seizoensgebonden klimaatkeuze
<!-- velair-docs:start -->
Vertalingen: [Engels origineel](seasonal-climate-selection.md) · [Español](seasonal-climate-selection.es.md) · [Français](seasonal-climate-selection.fr.md) · [Deutsch](seasonal-climate-selection.de.md) · [Italiano](seasonal-climate-selection.it.md) · [Nederlands](seasonal-climate-selection.nl.md) · [Polski](seasonal-climate-selection.pl.md) · [Português (Brasil)](seasonal-climate-selection.pt-br.md) · [Português (Portugal)](seasonal-climate-selection.pt-pt.md) · [Русский](seasonal-climate-selection.ru.md) · [Vertaalstatus](../../translation-status.md)

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

Voer gekozen acties eenmaal uit nadat een temperatuursensor een nieuw winter-, zachtweer- of zomerbereik binnengaat en daar gedurende een instelbare vertraging blijft. Kies winter-, zachtweer- of zomermodi zonder schema’s te dupliceren of weerregels in Velair op te nemen. Ongeldige sensormetingen veroorzaken onmiddellijk een Home Assistant-melding.

<p>
  <a href="https://my.home-assistant.io/redirect/blueprint_import/?blueprint_url=https%3A%2F%2Fraw.githubusercontent.com%2Fcgonfer%2Fvelair%2Fmain%2Fblueprints%2Fautomation%2Fvelair%2Fseasonal_climate_selection.yaml"><img src="https://my.home-assistant.io/badges/blueprint_import.svg" alt="Home Assistant openen en de blueprint Seizoensgebonden klimaatkeuze importeren" height="28"></a>
  <a href="https://raw.githubusercontent.com/cgonfer/velair/main/blueprints/automation/velair/seasonal_climate_selection.yaml"><img src="https://img.shields.io/badge/YAML_source-View-24292F?style=for-the-badge&amp;logo=github&amp;logoColor=white" alt="YAML-bron van Seizoensgebonden klimaatkeuze bekijken"></a>
</p>

[Wijzigingslog bekijken](../../../blueprints/changelogs/seasonal_climate_selection.md) · [Terug naar de blueprintindex](../blueprints.nl.md)

<a id="when-to-use-it"></a>
## Wanneer gebruiken

Gebruik deze blueprint als Home Assistant al een verwachte dagmaximumtemperatuur, buitenmeting of gemiddelde temperatuur als één numerieke temperatuursensor aanbiedt. Ze kiest welke acties worden uitgevoerd; Velair blijft verantwoordelijk voor schema's, presets, voorconditionering en opdrachtoverdracht naar apparaten.

Zowel een dagelijkse voorspellingssensor als een vaak veranderende buitensensor kan een seizoensbereik bevestigen. Wijzigingen binnen dat bereik behouden de oorspronkelijke eindtijd. Acties worden eenmaal per binnengaan uitgevoerd; latere updates binnen hetzelfde bereik kiezen dus niet herhaaldelijk een modus.

<a id="requirements"></a>
## Vereisten

- Blueprintversie 1.1.0 en Home Assistant 2024.6.0 of nieuwer.
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
| Range confirmation delay | Hoe lang de temperatuur in het nieuwe seizoensbereik moet blijven; standaard 30 minuten |
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

Bij drempels van 20 en 27 °C voert een dagmaximum dat bij 18 °C het winterbereik binnengaat na 30 minuten onafgebroken onder 20 °C winteracties uit. Een wijziging naar 19 °C tijdens het wachten behoudt dezelfde eindtijd. Een latere update naar 23 °C voert zachtweeracties uit; 30 °C voert zomeracties uit. Precies 20 of 27 °C valt onder zacht weer. Updates binnen een al bevestigd bereik herhalen de acties niet. Een bereik verlaten en terugkeren begint een volledige nieuwe wachttijd, ook als het tussenliggende bereik te kort duurde om de eigen acties uit te voeren.

<a id="shared-hours-different-indoor-temperatures"></a>
### Gedeelde tijden, verschillende binnentemperaturen

Koppel de profielschema's Invierno en Verano aan hetzelfde dagsjabloon met **Alleen tijden**. Wijs winterpresets toe zoals verwarmen op 21 °C en zomerpresets zoals koelen op 25 °C. Het verplaatsen van het tijdvak 07:00 in het sjabloon verandert beide schema's; de moduskeuze kiest de bijbehorende doelen. De blueprint bewerkt presets of het sjabloon niet. Zie [praktische voorbeelden van gekoppelde schema's](../linked-schedule-examples.nl.md).

<a id="average-temperature-and-fahrenheit"></a>
### Gemiddelde temperatuur en Fahrenheit

Een gemiddeldesensor kan meerdere keren per uur veranderen. Met tien minuten vertraging worden zomeracties nog steeds om 10:10 uitgevoerd als de sensor om 10:00 bij 28 °C het zomerbereik binnengaat en om 10:07 naar 29 °C verandert. Daalt de meting om 10:07 naar 27 °C, dan wordt de zomerbevestiging geannuleerd en begint in plaats daarvan de zachtweerbevestiging.

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

De oorspronkelijke Home Assistant-triggers classificeren elke temperatuurmeting na omzetting naar de drempeleenheid. Het binnengaan van het winter-, zachtweer- of zomerbereik begint de bevestigingsvertraging voor dat bereik. Metingen binnen hetzelfde bereik behouden de oorspronkelijke eindtijd; updates van alleen attributen of opmaak beginnen de wachttijd niet opnieuw en herhalen geen acties.

Een bereik verlaten annuleert de wachtende bevestiging onmiddellijk. Kort verlaten en terugkeren begint een volledige nieuwe wachttijd, ook als het andere bereik nooit tijd had om de eigen acties uit te voeren. Exacte drempelwaarden vallen onder zacht weer. Gelijkwaardige Celsius-/Fahrenheit-metingen blijven binnen hetzelfde bereik.

Home Assistant-opstarten controleert uitsluitend diagnose. Het kiest geen seizoensmodus. Lopende timers overleven geen herstart, herladen van de automatisering of uitschakelen en opnieuw inschakelen. Het bereik dat bij het koppelen van de triggers aanwezig is, geldt als uitgangspunt: latere wijzigingen binnen dat bereik selecteren het niet. Een bereikovergang of herstel van ongeldige metingen begint bevestiging. Er is geen periodieke of dagelijkse trigger en geen opgeslagen helper voor de laatste selectie. Als de entiteit ontbrak bij het koppelen van de triggers, stelt haar eerste verschijning het beginbereik vast zonder het te selecteren.

Sensorvalidatie loopt apart van seizoensbevestiging. Een ontbrekende entiteit, `unknown`, `unavailable`, een niet-eindige of niet-numerieke waarde of een ongeschikte eenheid maakt onmiddellijk één blijvende melding per automatisering in de gekozen taal. Deze noemt automatisering en sensor en legt uit dat seizoensacties zijn onderbroken. Ongeldige configuratie gebruikt een aparte melding.

Ongeldige metingen annuleren een lopende wachttijd. Herstel na een niet-numerieke status of een niet-ondersteunde eenheid begint een volledige nieuwe bevestigingsvertraging. Dit is een nieuwe ononderbroken periode van geldige metingen, zodat herstel dezelfde seizoensacties opnieuw kan uitvoeren. Herstel verwijdert ook de sensorwaarschuwing.

Een sensor die om 09:00 niet beschikbaar wordt, waarschuwt bijvoorbeeld meteen. Herstel naar 25 °C om 09:10 maakt zachtweeracties om 09:40 mogelijk als de temperatuur gedurende de hele periode tussen de drempels blijft, ook als de precieze waarde verandert.

<a id="safety-and-precedence"></a>
## Veiligheid en voorrang

Een Velair-modus of -profiel selecteren gebruikt het bijbehorende blokbeleid. **Alleen temperatuur** werkt het doel bij zonder een HVAC-moduswijziging te vragen. Gebruik expliciete blokken met **Verwarmen** of **Koelen** wanneer seizoenskeuze de apparatuur moet starten. Het beleid onderdrukt geen rechtstreekse HVAC-acties in de blauwdruk.

Bij een ongeldige sensor maakt de blueprint geen nieuwe seizoenskeuze en schakelt apparaten niet automatisch uit. De eerder gekozen modus en het bijbehorende schema blijven actief. Reageer op de melding als dat gedrag voor jouw huis niet geschikt is.

Ingestelde acties gebruiken normale Home Assistant-werking en traces. Een fout draait eerdere acties niet terug. De blueprint kan niet algemeen controleren of een willekeurige actie de bedoelde routine heeft gekozen of een fysiek apparaat heeft bereikt.

Een nieuw bevestigd seizoensbereik kan een handmatig gekozen afwezigheidsmodus vervangen. Stem seizoens- en aanwezigheidsautomatiseringen af in plaats van beide concurrerende modi te laten kiezen. Een huishoudscript kan bijvoorbeeld Afwezig kiezen als niemand thuis is en alleen bij toegestane aanwezigheid de seizoensmodus voor bezetting kiezen.

Bestaand Velair-modus-/profielgedrag blijft gelden, inclusief pauzevoorrang en annulering van tijdelijke aanpassingen in betrokken zones. Voorconditionering herberekent vanuit het effectieve schema dat de actie kiest; ze kan een nog niet gemaakte seizoenskeuze niet voorspellen.

<a id="limitations"></a>
## Beperkingen

- Bevestiging vereist ononderbroken verblijf binnen één seizoensbereik; herhaalde grensoverschrijdingen kunnen acties onbeperkt uitstellen.
- Geen automatische seizoensactie bij opstarten, dagschema, polling, opgeslagen wachtende timer, extra 24 °C-toestemming of vertraagd uitschakelen.
- De sensor verwijderen en opnieuw aanmaken annuleert de bevestiging. Opnieuw verschijnen stelt een uitgangspunt vast zonder een seizoen te selecteren; daarna is een bereikovergang nodig. Dit voorkomt inconsistent opnieuw activeren van de oorspronkelijke Home Assistant-triggers na het verwijderen van een entiteit. Dit geldt ook voor een entiteit die ontbreekt bij het laden van de automatisering. Normaal herstel na `unknown`/`unavailable` of een ongeldige eenheid begint een nieuwe bevestiging.
- Meldingen herkennen geen sensor die stilzwijgend stopt met bijwerken maar een geldig getal behoudt. Bewaking van bronactualiteit moet zo nodig afzonderlijk worden geregeld.
- Er is geen hysterese; de bevestigingsvertraging filtert korte bereikovergangen. Acties worden eenmaal per binnengaan van een bereik uitgevoerd, in plaats van eenmaal per nieuwe meting.
- Parallelle uitvoering is begrensd. Lange eigen actiereeksen kunnen plaatsen bezet houden; houd acties kort of draag werk aan scripts over.
- Een al gestarte reeks wordt niet door een latere meting geannuleerd. Controles beschermen de start, niet elke zelf ingestelde actie.
- Hernoemen kan de vroegere diagnosemelding laten staan om handmatig te verwijderen. Hernoemde of verwijderde modusopties moeten in de ingestelde acties worden bijgewerkt.

<a id="troubleshooting"></a>
## Problemen oplossen

- Als niets wordt uitgevoerd, controleer dan of de sensor een ander seizoensbereik binnenging of herstelde van een ongeldige waarde of eenheid en vervolgens de hele vertraging in dat bereik bleef. Opstarten en herladen beginnen geen selectie; updates binnen hetzelfde bereik herhalen deze niet.
- Controleer bij een waarschuwing de genoemde sensor, numerieke status en `unit_of_measurement`. Onbekende eenheden worden nooit geraden.
- Als een timer nooit afloopt, zoek dan in de sensorgeschiedenis naar grensoverschrijdingen of ongeldige metingen. Pas de drempels of de positieve vertraging aan de bron aan.
- Controleer de gekozen drempeleenheid en beide getallen als de verkeerde tak draait.
- Stel bij zacht weer dat apparatuur laat draaien een echte pauze-en-uit-modus in; een lege actielijst is geen uitschakelopdracht.
- Test een modusactie handmatig als de modus niet wordt gekozen en bekijk de trace. Kies de huidige optienaam in de Home Assistant-editor.
- Gebruik bij een import-URL die vóór publicatie nog niet beschikbaar is het YAML-bestand uit de lokale repository om te testen. Openbare links werken zodra het bestand op `main` is gepubliceerd.

<a id="updating-and-customizing"></a>
## Bijwerken en aanpassen

Importeer de blueprint expliciet; installatie of updates van Velair via HACS installeren haar niet. Importeer dezelfde doorlopende `main`-URL opnieuw voor compatibele updates. Versie 1.1.0 vervangt het tijdgedrag van de eerste beta op dezelfde URL, met dezelfde invoernamen en zonder optie voor het oude tijdgedrag. Importeer opnieuw en herlaad de betrokken automatiseringen om bereikbevestiging te gebruiken. Andere blueprints behouden hun gepubliceerde compatibiliteitsafspraken.

Home Assistant beheert de resulterende automatisering. Velair migreert geen automatiseringen of `.storage`. Gebruik **Controle overnemen** voor andere logica, waarbij de zelfstandige automatisering geen blueprintupdates meer ontvangt. Zie de [blueprintcatalogus](../blueprints.nl.md) voor gemeenschappelijke verspreidings- en updateregels.
