<a id="update-shared-presets-from-automations"></a>
# Gedeelde presets wijzigen via automatiseringen
<!-- velair-docs:start -->
Vertalingen: [Engels origineel](preset-automations.md) · [Español](preset-automations.es.md) · [Français](preset-automations.fr.md) · [Deutsch](preset-automations.de.md) · [Italiano](preset-automations.it.md) · [Nederlands](preset-automations.nl.md) · [Polski](preset-automations.pl.md) · [Português (Brasil)](preset-automations.pt-br.md) · [Português (Portugal)](preset-automations.pt-pt.md) · [Русский](preset-automations.ru.md) · [Vertaalstatus](../translation-status.md)

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

Gebruik `velair.update_block_preset` om een opgeslagen Velair-preset vanuit een Home Assistant-automatisering of -script te wijzigen. Dit verandert de gedeelde definitie blijvend: elk blok dat ernaar verwijst krijgt de nieuwe configuratie, ook blokken in sjablonen en dagen die de volledige configuratie van die sjablonen volgen.

Dit kiest geen andere preset voor een blok en activeert geen profiel. Gebruik profielen of modi als de automatisering een andere routine moet kiezen.

<a id="find-the-identifier"></a>
## De ID vinden

Open **Sjablonen → Klimaatpresets**, selecteer een opgeslagen preset en kopieer de **Automatiserings-ID**. Gebruik die als `preset_key`; hernoemen verandert de ID niet. De onderstaande voorbeeld-ID's zijn illustratief. Vervang ze door jouw gekopieerde waarden.

<a id="update-or-replace"></a>
## Bijwerken of vervangen

Standaard wijzigt `operation: update` alleen de meegestuurde velden en behoudt het de actie en overige instellingen. Stuur bij deze bewerking geen `action` mee.

`operation: replace` vervangt de volledige klimaatconfiguratie. Stuur `action` en alle instellingen mee die moeten blijven. Zo wissel je tussen een temperatuuractie, alleen modus, alleen aanvullende instellingen en Uit. Naam, ID en positie in de bibliotheek blijven gelijk.

| Veld | Betekenis |
|---|---|
| `preset_key` | Vereiste ID van een bestaande Velair-preset. |
| `operation` | `update` (standaard) of `replace`. |
| `action` | Vereist voor `replace`, verboden voor `update`. Gebruik `set_temperature`, `set_hvac_mode`, `set_climate_options` of `turn_off`. |
| `temperature` | Eén doeltemperatuur, in de opgegeven Velair-temperatuureenheid. |
| `target_temp_low`, `target_temp_high` | Oorspronkelijk doelbereik; stuur altijd beide grenzen samen. |
| `hvac_mode` | HVAC-modus, volgens de regels van de gekozen actie. |
| `fan_mode`, `preset_mode`, `swing_mode`, `swing_horizontal_mode`, `humidity` | Optionele apparaatinstellingen, volgens de regels van de gekozen actie. |
| `clear_fields` | Alleen voor `update`: lijst met te verwijderen klimaatparameters. |

Eén doeltemperatuur versturen verwijdert een eerder bereik; een volledig bereik versturen verwijdert een eerdere enkele doeltemperatuur. Stuur nooit beide in dezelfde aanroep. Een vereist doel of de laatste instelling van een preset met alleen opties verwijderen is ongeldig. Gebruik `replace` om de actie zelf te veranderen.

Een weggelaten veld blijft bij `update` behouden. Lege tekenreeksen en `null` zijn geen verwijderopdrachten; gebruik `clear_fields`. Een veld kan niet in dezelfde aanroep worden ingesteld en gewist. Het verwijderen van een apparaatinstelling stopt het versturen van die opdracht, maar reset de instelling op de thermostaat niet.

Het standaard Home Assistant-actieformulier legt de wijzigingen voor elke automatiseringsuitvoering vast. Het laadt de huidige presetwaarden niet in het formulier. Minder gebruikte parameters staan in ingeklapte onderdelen.

<a id="example-adjust-heating-comfort-to-outdoor-temperature"></a>
## Voorbeeld: verwarmingscomfort aanpassen aan buitentemperatuur

**Situatie:** Woonkamer en Studeerkamer gebruiken de Velair-preset **Verwarmingscomfort**, ingesteld op verwarmen naar 21 °C met stille ventilator. Je wilt 21 °C bij koud weer en 19 °C bij zachter weer, met behoud van modus en ventilatorinstellingen.

Deze automatisering controleert bij Home Assistant-opstarten en bij wijzigingen van de buitensensor. Onder 10 °C kiest ze 21 °C; boven 12 °C kiest ze 19 °C. Daartussen blijft het eerdere doel behouden. De marge voorkomt herhaald wisselen rond één drempel. Bij een onbeschikbare sensor verandert niets.

```yaml
alias: Velair heating comfort by outdoor temperature
triggers:
  - trigger: homeassistant
    event: start
  - trigger: state
    entity_id: sensor.outdoor_temperature
conditions:
  - condition: template
    value_template: "{{ is_number(states('sensor.outdoor_temperature')) }}"
actions:
  - choose:
      - conditions:
          - condition: numeric_state
            entity_id: sensor.outdoor_temperature
            below: 10
        sequence:
          - action: velair.update_block_preset
            data:
              preset_key: preset_heating_comfort
              temperature: 21
      - conditions:
          - condition: numeric_state
            entity_id: sensor.outdoor_temperature
            above: 12
        sequence:
          - action: velair.update_block_preset
            data:
              preset_key: preset_heating_comfort
              temperature: 19
mode: queued
max: 10
```

Het voorbeeld veronderstelt Celsius voor Velair en buitensensor. Kies voor Fahrenheit equivalente drempels en doelen in de juiste eenheden. De service converteert de buitensensorwaarde voor deze automatisering nooit.

Beide kamers behouden hun eigen schema's. Als Verwarmingscomfort actief is en Velair automatisch bestuurt, verandert het doel na opslaan. Als het volgende blok in de toekomst ligt, herberekent Velair geplande gebeurtenissen en het voorconditioneringsplan. Herhaalde aanroepen met ongewijzigde configuratie schrijven niet naar opslag en versturen geen opdrachten.

<a id="example-update-a-native-range"></a>
## Voorbeeld: een oorspronkelijk bereik wijzigen

**Situatie:** een thermostaat met ondersteuning voor verwarmings-/koelbereiken gebruikt **Thuisbereik**. Verander het doel naar 19–25 °C met behoud van modus en apparaatopties:

```yaml
action: velair.update_block_preset
data:
  preset_key: preset_home_range
  target_temp_low: 19
  target_temp_high: 25
```

Stuur beide grenzen, ook als er maar één verandert. Een thermostaat die alleen één doeltemperatuur ondersteunt, kan deze preset niet gebruiken. Velair leidt geen geschikte enkele waarde of ontbrekende grens af.

<a id="example-change-or-remove-a-device-setting"></a>
## Voorbeeld: een apparaatinstelling wijzigen of verwijderen

Alleen de ventilatorinstelling wijzigen, met behoud van temperatuur en HVAC-modus:

```yaml
action: velair.update_block_preset
data:
  preset_key: preset_heating_comfort
  fan_mode: auto
```

Stoppen met het opnemen van een ventilatoropdracht in die preset:

```yaml
action: velair.update_block_preset
data:
  preset_key: preset_heating_comfort
  clear_fields:
    - fan_mode
```

`preset_mode` verwijst naar een **apparaatpreset**, zoals `eco` of `sleep`. Dit is een parameter binnen de Velair-preset, niet de ID van een andere Velair-preset.

<a id="example-replace-with-off-and-restore-explicitly"></a>
## Voorbeeld: vervangen door Uit en expliciet herstellen

Vervang de configuratie van een opgeslagen preset door Uit:

```yaml
action: velair.update_block_preset
data:
  preset_key: preset_heating_comfort
  operation: replace
  action: turn_off
```

Vervang de preset opnieuw expliciet om verwarmen naar 21 °C met stille ventilator te herstellen:

```yaml
action: velair.update_block_preset
data:
  preset_key: preset_heating_comfort
  operation: replace
  action: set_temperature
  temperature: 21
  hvac_mode: heat
  fan_mode: quiet
```

Er is geen getimed vervalmoment of automatisch herstel. Uit raakt elke opgeslagen verwijzing naar deze preset. Gebruik voor een open raam of tijdelijke onderbreking per kamer liever een [zonepauze met eigen ID](usage.nl.md#services), die de gedeelde preset ongemoeid laat.

<a id="validation-and-runtime-behavior"></a>
## Validatie en runtimegedrag

- Velair controleert elke opgeslagen toepassing, ook inactieve profielen en standaardschema's die een profiel verbergt. Eén ongeschikte toepassing weigert de hele wijziging; er wordt niets gedeeltelijk opgeslagen.
- Ondersteunde optionele instellingen kunnen per thermostaat volgens de bestaande aanpassingsregels worden gefilterd. Temperatuurgrenzen, actiecompatibiliteit en externe-regelaarbeperkingen blijven gelden.
- Tijdelijke aanpassingen, pauzes, handmatige aanpassingen en Stop behouden hun voorrang. Een presetwijziging annuleert deze niet. Bij automatisch hervatten gebruikt Velair de nieuwste opgeslagen instellingen.
- Een actieve automatische wijziging wordt na opslaan toegepast; een uitsluitend toekomstige wijziging verstuurt nu niet onnodig een opdracht. Voorconditionering en Room Assist worden afgestemd zodra hun doel of bron verandert. Acties met alleen modus, alleen opties of Uit krijgen geen temperatuuranticipatie.
- Externe regelaars ontvangen bijgewerkte volledig uitgewerkte weekplanningen wanneer hun effectieve schema verandert. Een publicatiefout schakelt lokale uitvoering niet in.
- Onbekende ID's, ongeldige combinaties, ongeschikte toepassingen en een wachtende temperatuureenheidsmigratie geven fouten. Overdrachtsfouten na opslaan draaien de opgeslagen preset niet terug.

Omgevingsdrempels, hysterese, interpretatie van weersvoorspellingen en het moment om een instelling te herstellen horen bij Home Assistant-automatiseringen. De service maakt geen weerregels of polling in Velair aan. De [blueprint voor seizoensgebonden klimaatkeuze](blueprints/seasonal-climate-selection.nl.md) kan modi kiezen of deze services eenmaal uitvoeren nadat de temperatuur een ingestelde tijd in een nieuw seizoensbereik blijft. Kies modi wanneer winter en zomer afzonderlijke presetdefinities moeten behouden; een preset wijzigen verandert alle toepassingen ervan.

Zie [Blokpresets en gekoppelde sjablonen](linked-schedules.nl.md) voor de reikwijdte van gedeelde bronnen en [Praktische voorbeelden](linked-schedule-examples.nl.md) voor volledige huishoudconfiguraties.
