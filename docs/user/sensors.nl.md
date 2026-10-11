<a id="velair-sensor-reference"></a>
# Velair-sensorreferentie
<!-- velair-docs:start -->
Vertalingen: [Engels origineel](sensors.md) · [Español](sensors.es.md) · [Français](sensors.fr.md) · [Deutsch](sensors.de.md) · [Italiano](sensors.it.md) · [Nederlands](sensors.nl.md) · [Polski](sensors.pl.md) · [Português (Brasil)](sensors.pt-br.md) · [Português (Portugal)](sensors.pt-pt.md) · [Русский](sensors.ru.md) · [Vertaalstatus](../translation-status.md)

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

Velair maakt Home Assistant-entiteiten aan zodat dashboards en automatiseringen actuele planner-, comfort-, overdrachts- en apparaatcontext kunnen lezen zonder het Velair-paneel te openen.

De entiteits-ID's hier zijn voorbeelden. Home Assistant kan achtervoegsels toevoegen of je entiteiten laten hernoemen; gebruik daarom de werkelijke ID's uit jouw entiteitenregister.

<a id="quick-guide"></a>
## Kort overzicht

| Entiteit | Aangemaakt voor | Geschikt voor |
| --- | --- | --- |
| **Volgende geplande gebeurtenis** | Velair-integratie | De volgende geplande Velair-actie tonen. |
| **Plannerstatus** | Velair-integratie | Controleren of planning inactief, gepland, gepauzeerd of tijdelijk overschreven is. |
| **Diagnosestatus** | Velair-integratie | Waarschuwen over Velair-runtimegezondheid. |
| **Actieve doeltemperatuur** | Elk beheerd klimaatapparaat | Het huidige door Velair beheerde doel tonen. |
| **Omgevingsconditie** | Elk beheerd klimaatapparaat | Comfort-status, gegevenskwaliteit, afgeleide metingen en buitencontext lezen. |
| **Ventilatiemogelijkheid** | Elk beheerd klimaatapparaat | Voorzichtige kansen voor raamventilatie tonen of in automatiseringen gebruiken. |
| **Luchtkwaliteit** | Elk beheerd klimaatapparaat | CO2-beoordeling afzonderlijk van thermisch comfort tonen. |
| **Tijdelijke aanpassing** | Elk beheerd klimaatapparaat | Actieve tijdelijke aanpassingen of pauzes tonen. |
| **Bediening** | Elk beheerd klimaatapparaat | Weten wie bestuurt: Velair, handmatige aanpassing of externe uitvoering. |
| **Leveringsdiagnose** | Elk beheerd klimaatapparaat, standaard uitgeschakeld | Diagnose of automatiseringen op basis van de nieuwste lokale overdrachtsuitkomst. |
| **Start voorconditionering** | Elk beheerd klimaatapparaat | Tonen wanneer adaptieve voorconditionering eerder wil starten. |
| **Room Assist** | Elk beheerd klimaatapparaat | Actuele Room Assist-status en toegepaste doelcontext tonen. |

Velair maakt ook bewerkbare entiteiten aan, zoals **Automatische planning** en **Modus**. Dit zijn bedieningsentiteiten, geen sensoren; zie de [gebruikshandleiding](usage.nl.md#home-assistant-entities).

<a id="global-sensors"></a>
## Globale sensoren

<a id="next-climate-event"></a>
### Volgende klimaatgebeurtenis

Voorbeeld-ID:

```text
sensor.velair_next_scheduled_event
```

Belangrijkste attributen:

| Attribuut | Betekenis |
| --- | --- |
| `entity_id` | Klimaatentiteit van de eerste gebeurtenis op dit tijdstip. |
| `action` | `set_temperature`, `set_hvac_mode` of `turn_off`. |
| `hvac_mode` | HVAC-modus die Velair zo nodig wil gebruiken. |
| `temperature` | Afzonderlijk doel, indien van toepassing. |
| `target_temp_low` / `target_temp_high` | Doelbereik, indien van toepassing. |
| `weekday` / `start` | Bron van het schemablok. |
| `when` | Werkelijk toepassingstijdstip. |
| `target_when` | Oorspronkelijke comfortdoeltijd bij eerder starten door voorconditionering. |
| `event_count` | Aantal gebeurtenissen met hetzelfde toepassingstijdstip. |
| `events` | Geserialiseerde lijst van alle gebeurtenissen met hetzelfde toepassingstijdstip. |

Voorbeeld:

```yaml
{{ state_attr('sensor.velair_next_scheduled_event', 'action') == 'turn_off' }}
```

<a id="current-schedule-state"></a>
### Huidige schemastatus

Voorbeeld-ID:

```text
sensor.velair_current_schedule_state
```

Statussen:

```text
paused
override_active
scheduled
idle
temperature_migration_required
```

Belangrijkste attributen:

| Attribuut | Betekenis |
| --- | --- |
| `global_mode` | Huidige globale plannermodus. |
| `paused_started_at` | Begin van de globale pauze, indien van toepassing. |
| `paused_until` | Gepland einde van de globale pauze, indien van toepassing. |

<a id="diagnostics-status"></a>
### Diagnosestatus

Voorbeeld-ID:

```text
sensor.velair_diagnostics_status
```

Statussen:

```text
ok
warning
error
```

Belangrijkste attributen:

| Attribuut | Betekenis |
| --- | --- |
| `scheduler_mode` / `scheduler_status` | Compacte plannercontext. |
| `units_ok` / `units_warning` / `units_error` | Aantallen per gezondheidsstatus van apparaten. |
| `issue_count` | Totaal actieve runtimeproblemen. |
| `warning_count` / `error_count` | Aantallen actieve waarschuwingen en fouten. |
| `issue_codes` | Stabiele probleemcodes voor automatiseringen. |

Voorbeeldtrigger:

```yaml
triggers:
  - trigger: state
    entity_id: sensor.velair_diagnostics_status
    to: error
```

<a id="per-climate-sensors"></a>
## Sensoren per klimaatapparaat

Voor een beheerd apparaat zoals `climate.living_room` maakt Home Assistant doorgaans gerelateerde ID's aan, zoals `sensor.velair_control_living_room`. Gebruik jouw werkelijke register-ID's in dashboards en automatiseringen.

<a id="zone-active-target-temperature"></a>
### Actieve doeltemperatuur van de zone

Belangrijkste attributen:

| Attribuut | Betekenis |
| --- | --- |
| `action` | Actieve Velair-doelactie. |
| `hvac_mode` | HVAC-modus gekozen door het actieve blok of de tijdelijke aanpassing. |
| `temperature` | Actieve afzonderlijke doeltemperatuur. |
| `target_temp_low` / `target_temp_high` | Actief doelbereik voor oorspronkelijke bereikmodi. |
| `weekday` / `start` | Schemabron van het actieve blok. |
| `when` | Toepassingstijdstip van het actieve doel. |
| `target_when` | Comfortdoeltijd wanneer voorconditionering het toepassingstijdstip vervroegt. |

Voor oorspronkelijke doelbereiken is de sensorstatus niet beschikbaar, omdat er niet één juiste enkele waarde is. Lees in plaats daarvan `target_temp_low` en `target_temp_high`.

<a id="zone-environmental-condition"></a>
### Omgevingsconditie van de zone

Statussen:

```text
monitoring_off
no_readings
temperature_comfortable
humidity_comfortable
comfortable
cold
hot
dry
humid
cold_and_dry
cold_and_humid
hot_and_dry
hot_and_humid
```

Belangrijkste attributen:

| Attribuut | Betekenis |
| --- | --- |
| `data_quality` | `complete`, `unverified`, `partial`, `stale` of `unavailable`. |
| `data_issues` | Stabiele codes voor ontbrekende, verouderde, ongeldige of bruikbare maar niet op actualiteit geverifieerde metingen. |
| `range_summary` | Actueel comfortbereiksresultaat en afstemming met Humidex. |
| `ventilation_opportunity` | Volledige gegevens over de ventilatiekans. |
| `comfort_zone` | Gekozen comfortmodel en effectief luchtvochtigheidsbereik. |
| `temperature_source` / `humidity_source` | Bronentiteiten voor binnenmetingen. |
| `derived_metrics` | Gegevens voor ingeschakelde Humidex, dauwpunt en absolute luchtvochtigheid. |
| `outdoor` | Optionele vergelijking tussen binnen en buiten. |
| `insights` | Geordende informatieve inzichten met stabiele codes. |

Voorbeeld:

```yaml
{% set insights =
   state_attr('sensor.velair_climate_living_room_environmental_condition',
              'insights') or [] %}
{{ insights
   | selectattr('code', 'eq', 'ventilation_may_help_cool')
   | list | count > 0 }}
```

Zie [Omgevingscomfort](comfort.nl.md) en [Sensoren voor zonebesturing en overdracht](zone-sensors.nl.md#environmental-condition) voor de volledige Comfort-gegevens.

<a id="zone-ventilation-opportunity"></a>
### Ventilatiekans van de zone

Statussen:

```text
unavailable
no_opportunity
may_help
comfort_possible
trade_off
already_comfortable
```

Belangrijkste attributen:

| Attribuut | Betekenis |
| --- | --- |
| `evaluation_scope` | Of temperatuur, luchtvochtigheid of beide zijn beoordeeld. |
| `reason` | Stabiele machineleesbare redencode. |
| `data_quality` / `data_issues` | Kwaliteit van de buitenvergelijking. |
| `outdoor_temperature_source` | Bronentiteit van de buitentemperatuur. |
| `outdoor_humidity_source` | Bronentiteit van buitenluchtvochtigheid, indien ingesteld. |
| `potential_effects` | Effecten die Velair van buitenlucht verwacht. |
| `blocked_by` | Voorwaarden die een sterker resultaat verhinderen. |

Voorbeeld:

```yaml
{{ is_state('sensor.velair_ventilation_opportunity_living_room',
            'comfort_possible') }}
```

Deze sensor dient alleen ter informatie. Velair opent er nooit ramen door en wijzigt de klimaatbesturing niet.

<a id="zone-air-quality"></a>
### Luchtkwaliteit van de zone

Statussen:

```text
not_monitored
unavailable
good
elevated
poor
```

Belangrijkste attributen:

| Attribuut | Betekenis |
| --- | --- |
| `availability` | Beschikbaarheid van de huidige CO2-meting. |
| `co2_source` | CO2-sensor voor de beoordeling. |

<a id="zone-override-state"></a>
### Tijdelijke aanpassing of pauze van de zone

Statussen:

```text
none
boost
paused
disabled
```

Belangrijkste attributen:

| Attribuut | Betekenis |
| --- | --- |
| `started_at` | Begin van de actieve tijdelijke aanpassing of pauze. |
| `until` | Gepland einde, indien van toepassing. |
| `action` | Actie van de tijdelijke instelling, indien van toepassing. |
| `pause_id` | Actieve pauze-ID bij één pauze. |
| `pause_count` / `pause_ids` | Compacte context van meerdere pauzes. |
| `manual` | Of de pauze een handmatige aanpassing is. |

Gebruik deze sensor voor tijdelijke aanpassingen en pauzestatus. Gebruik **Bediening** om te zien of besturing automatisch, handmatig of extern is.

<a id="zone-control"></a>
### Zonebesturing

Statussen:

```text
automatic
manual
external
```

Belangrijkste attributen:

| Attribuut | Betekenis |
| --- | --- |
| `runtime_state` | `idle`, `scheduled`, `preconditioning`, `boost`, `paused`, `stopped`, `externally_managed` of `temperature_migration_required`. |
| `schedule_source` | `default`, `profile` of `profile_pause`. |
| `profile_id` / `profile_name` | Effectief besturend profiel, indien van toepassing. |
| `mode_id` / `mode_name` | Gekozen modus, indien van toepassing. |
| `manual_source` | `explicit`, `external_change` of `other`, alleen tijdens handmatige besturing. |
| `manual_started_at` | Begin van de handmatige aanpassing. |
| `manual_until` | Gepland einde van de handmatige aanpassing, indien van toepassing. |
| `manual_policy` | `until_next_block`, `for_duration` of `until_resumed`. |

Voorbeeld:

```yaml
{{ is_state('sensor.velair_control_living_room', 'automatic')
   and state_attr('sensor.velair_control_living_room', 'runtime_state')
       == 'scheduled' }}
```

<a id="zone-delivery-diagnostics"></a>
### Diagnose van zone-overdracht

Deze diagnose-entiteit is standaard uitgeschakeld. Schakel haar in via het Home Assistant-entiteitenregister als een dashboard of automatisering runtimebewijs van overdracht nodig heeft.

Statussen:

```text
idle
success
failed
retrying
exhausted
invalid_intent
cancelled
unavailable
```

Belangrijkste attributen:

| Attribuut | Betekenis |
| --- | --- |
| `updated_at` | Nieuwste wijziging van overdrachtsstatus. |
| `retry_count` | Poging die de huidige status vertegenwoordigt. |
| `last_error_at` / `last_error_code` | Nieuwste opgeschoonde overdrachtsfout. |
| `last_accepted_at` | Laatste tijdstip waarop Home Assistant een volledige Velair-servicereeks accepteerde. |
| `last_accepted_source` | `automatic`, `manual`, `boost` of `automatic_reassertion`. |
| `last_accepted_action` | `set_temperature`, `set_hvac_mode`, `turn_off` of `other`. |
| `last_accepted_hvac_mode` | Door Home Assistant geaccepteerde HVAC-modus. |
| `last_accepted_temperature_unit` | Eenheid vastgelegd bij het geaccepteerde doel. |
| `last_accepted_temperature` | Geaccepteerde afzonderlijke doeltemperatuur, indien van toepassing. |
| `last_accepted_target_temp_low` / `last_accepted_target_temp_high` | Geaccepteerd doelbereik, indien van toepassing. |

Voorbeeld:

```yaml
triggers:
  - trigger: state
    entity_id: sensor.velair_delivery_diagnostics_living_room
    to: exhausted
```

`success` betekent dat Home Assistant de servicereeks heeft geaccepteerd. Het bewijst niet dat het fysieke apparaat het doel heeft bereikt.

<a id="zone-preconditioning-start"></a>
### Start voorconditionering van de zone

Belangrijkste attributen:

| Attribuut | Betekenis |
| --- | --- |
| `status` | `planned` of `active`. |
| `scheduled_for` | Oorspronkelijke comforttijd van het blok. |
| `lead_minutes` | Aantal minuten dat Velair de start heeft vervroegd. |
| `direction` | Verwarmings- of koelrichting. |
| `target_kind` / `target_boundary` | Context van de voorspelling voor één doel of bereikgrens. |
| `boundary_temperature` | Grens voor de voorspelling. |
| `model_source` | Door Velair gekozen voorspellingsbron. |
| `target_temperature` | Afzonderlijk doel, indien van toepassing. |
| `target_temp_low` / `target_temp_high` | Doelbereik, indien van toepassing. |
| `hvac_mode` | HVAC-modus van de voorconditioneringsgebeurtenis. |

<a id="zone-room-assist-state"></a>
### Room Assist-status van de zone

Statussen:

```text
unavailable
not_configured
disabled
blocked
idle
holding
assisting
ready
```

Belangrijkste attributen:

| Attribuut | Betekenis |
| --- | --- |
| `room_temperature_entity_id` | Kamersensorbron. |
| `target_temperature` | Zichtbaar schema- of tijdelijk doel. |
| `applied_temperature` | Doel dat Room Assist op het apparaat toepaste. |
| `applied_offset` | Momenteel toegepaste correctie. |
| `calculated_temperature` | Berekend doel vóór begrenzing. |
| `assist_delta` | Actief correctieverschil indien groter dan nul. |
| `scheduled_target_guard` | Beveiliging tegen onveilige doelwijzigingen. |
| `hysteresis_phase` / `hysteresis_target` | Runtimefase van de aanhoudband. |
| `deadband_low` / `deadband_high` | Effectieve aanhoudband. |
| `target_temp_low` / `target_temp_high` | Zichtbaar oorspronkelijk doelbereik. |
| `applied_target_temp_low` / `applied_target_temp_high` | Oorspronkelijk bereik na correctie verstuurd. |
| `climate_target_temp_low` / `climate_target_temp_high` | Actueel door het apparaat gemeld oorspronkelijk bereik. |
| `range_shift` | Huidige bereikverschuiving, indien van toepassing. |
| `direction` | Verwarmings- of koelrichting. |
| `hvac_mode` | HVAC-modus bij het gecorrigeerde doel. |
| `active_from` / `target_when` | Tijdcontext van het gecorrigeerde blok. |

<a id="choosing-the-right-surface"></a>
## De juiste informatiebron kiezen

| Vraag | Gebruik |
| --- | --- |
| Wat plant Velair als volgende? | **Volgende geplande gebeurtenis** |
| Is Velair globaal gepauzeerd of gepland? | **Plannerstatus** |
| Is Velair gezond? | **Diagnosestatus** |
| Welk doel beheert Velair nu? | **Actieve doeltemperatuur** |
| Is de kamer comfortabel, zijn metingen verouderd of ontbreken ze? | **Omgevingsconditie** |
| Kan buitenlucht helpen? | **Ventilatiemogelijkheid** |
| Is de CO2-waarde goed of slecht? | **Luchtkwaliteit** |
| Heeft dit apparaat een tijdelijke aanpassing of pauze? | **Tijdelijke aanpassing** |
| Wie bestuurt dit apparaat nu? | **Bediening** |
| Heeft Home Assistant de laatste Velair-opdracht geaccepteerd? | **Leveringsdiagnose** |
| Wanneer begint voorconditionering? | **Start voorconditionering** |
| Wat past Room Assist toe? | **Room Assist** |

Gebeurtenissen zijn beter wanneer een automatisering op een overgang moet reageren en moet weten wat veranderde. Sensoren zijn beter wanneer een dashboard of automatisering de actuele status nodig heeft, ook na een herstart.
