<a id="velair-sensor-reference"></a>
# Velair-Sensorreferenz
<!-- velair-docs:start -->
Übersetzungen: [Englisches Original](sensors.md) · [Español](sensors.es.md) · [Français](sensors.fr.md) · [Deutsch](sensors.de.md) · [Italiano](sensors.it.md) · [Nederlands](sensors.nl.md) · [Polski](sensors.pl.md) · [Português (Brasil)](sensors.pt-br.md) · [Português (Portugal)](sensors.pt-pt.md) · [Русский](sensors.ru.md) · [Übersetzungsstatus](../translation-status.md)

<details>
<summary>Status dieser Übersetzung</summary>

| Angabe | Status |
| --- | --- |
| Referenzversion | 1.9.0-beta.1 |
| Letzte Synchronisierung | 2026-10-11 |
| Sprachliche Prüfung | KI-gestützte Übersetzung |
| Vergleich mit dem Original | Mit dem englischen Original synchronisiert. |

</details>

---
<!-- velair-docs:end -->

Velair erstellt Home-Assistant-Entitäten, damit Dashboards und Automationen den aktuellen Zeitplaner-, Komfort-, Übertragungs- und Klimagerätekontext lesen können, ohne das Velair-Panel zu öffnen.

Die hier gezeigten Entitäts-IDs sind Beispiele. Home Assistant kann Zusätze anhängen oder Umbenennungen erlauben. Verwende daher die tatsächlichen IDs aus deiner Entitätsregistrierung.

<a id="quick-guide"></a>
## Kurzübersicht

| Entität | Erstellt für | Geeignet für |
| --- | --- | --- |
| **Nächstes geplantes Ereignis** | Velair-Integration | Die nächste geplante Velair-Aktion anzeigen. |
| **Zeitplanstatus** | Velair-Integration | Prüfen, ob die Planung inaktiv, geplant, pausiert oder übersteuert ist. |
| **Diagnosestatus** | Velair-Integration | Bei Laufzeitproblemen von Velair warnen. |
| **Aktive Solltemperatur** | Jedes verwaltete Klimagerät | Das aktuelle von Velair gesteuerte Ziel anzeigen. |
| **Raumklima** | Jedes verwaltete Klimagerät | Komfortzustand, Datenqualität, abgeleitete Messgrößen und Außenkontext lesen. |
| **Lüftungsmöglichkeit** | Jedes verwaltete Klimagerät | Vorsichtig formulierte Möglichkeiten zum Fensteröffnen anzeigen oder in Automationen verwenden. |
| **Luftqualität** | Jedes verwaltete Klimagerät | Die CO2-Bewertung unabhängig vom thermischen Komfort anzeigen. |
| **Übersteuerung** | Jedes verwaltete Klimagerät | Aktive temporäre Anpassungen oder Pausen anzeigen. |
| **Steuerung** | Jedes verwaltete Klimagerät | Die Steuerungszuständigkeit erkennen: Velair, manuelle Anpassung oder externe Ausführung. |
| **Lieferdiagnose** | Jedes verwaltete Klimagerät, standardmäßig deaktiviert | Das letzte lokale Übertragungsergebnis untersuchen oder automatisieren. |
| **Start der Vorkonditionierung** | Jedes verwaltete Klimagerät | Den geplanten Frühstart der adaptiven Vorkonditionierung anzeigen. |
| **Room Assist** | Jedes verwaltete Klimagerät | Laufzeitzustand und angewendeten Zielkontext von Room Assist anzeigen. |

Velair erstellt außerdem beschreibbare Entitäten wie **Automatische Zeitplanung** und **Modus**. Sie sind Bedienelemente statt Sensoren; siehe [Verwendungsanleitung](usage.de.md#home-assistant-entities).

<a id="global-sensors"></a>
## Globale Sensoren

<a id="next-climate-event"></a>
### Nächstes Klimaereignis

Beispiel für eine Entitäts-ID:

```text
sensor.velair_next_scheduled_event
```

Wichtigste Attribute:

| Attribut | Bedeutung |
| --- | --- |
| `entity_id` | Klimaentität des ersten Ereignisses zu diesem Zeitpunkt. |
| `action` | `set_temperature`, `set_hvac_mode` oder `turn_off`. |
| `hvac_mode` | Von Velair geplanter HVAC-Modus, sofern relevant. |
| `temperature` | Einzelne Zieltemperatur, sofern relevant. |
| `target_temp_low` / `target_temp_high` | Bereichsziel, sofern relevant. |
| `weekday` / `start` | Quelle des Zeitplanblocks. |
| `when` | Tatsächlicher Anwendungszeitpunkt. |
| `target_when` | Ursprüngliche Komfortzielzeit bei frühzeitiger Vorkonditionierung. |
| `event_count` | Anzahl der Ereignisse mit demselben Anwendungszeitpunkt. |
| `events` | Serialisierte Liste aller Ereignisse mit demselben Anwendungszeitpunkt. |

Beispiel:

```yaml
{{ state_attr('sensor.velair_next_scheduled_event', 'action') == 'turn_off' }}
```

<a id="current-schedule-state"></a>
### Aktueller Zeitplanzustand

Beispiel für eine Entitäts-ID:

```text
sensor.velair_current_schedule_state
```

Zustände:

```text
paused
override_active
scheduled
idle
temperature_migration_required
```

Wichtigste Attribute:

| Attribut | Bedeutung |
| --- | --- |
| `global_mode` | Aktueller globaler Zeitplanermodus. |
| `paused_started_at` | Beginn der globalen Pause, sofern vorhanden. |
| `paused_until` | Geplanter Ablauf der globalen Pause, sofern vorhanden. |

<a id="diagnostics-status"></a>
### Diagnosestatus

Beispiel für eine Entitäts-ID:

```text
sensor.velair_diagnostics_status
```

Zustände:

```text
ok
warning
error
```

Wichtigste Attribute:

| Attribut | Bedeutung |
| --- | --- |
| `scheduler_mode` / `scheduler_status` | Kompakter Zeitplanerkontext. |
| `units_ok` / `units_warning` / `units_error` | Zustandsanzahlen je Klimagerät. |
| `issue_count` | Gesamtzahl aktiver Laufzeitprobleme. |
| `warning_count` / `error_count` | Anzahl aktiver Probleme je Schweregrad. |
| `issue_codes` | Stabile Problemcodes für Automationen. |

Beispielauslöser:

```yaml
triggers:
  - trigger: state
    entity_id: sensor.velair_diagnostics_status
    to: error
```

<a id="per-climate-sensors"></a>
## Sensoren je Klimagerät

Für ein verwaltetes Klimagerät wie `climate.living_room` erstellt Home Assistant normalerweise zugehörige IDs wie `sensor.velair_control_living_room`. Verwende in Dashboards und Automationen die tatsächlichen IDs deiner Registrierung.

<a id="zone-active-target-temperature"></a>
### Aktive Zieltemperatur der Zone

Wichtigste Attribute:

| Attribut | Bedeutung |
| --- | --- |
| `action` | Aktive Velair-Zielaktion. |
| `hvac_mode` | Vom aktiven Block oder der Übersteuerung gewählter HVAC-Modus. |
| `temperature` | Aktive Einzelzieltemperatur. |
| `target_temp_low` / `target_temp_high` | Aktives Bereichsziel für native Bereichsmodi. |
| `weekday` / `start` | Zeitplanquelle des aktiven Blocks. |
| `when` | Anwendungszeitpunkt des aktiven Ziels. |
| `target_when` | Komfortzielzeit, wenn Vorkonditionierung die Anwendung vorgezogen hat. |

Bei nativen Bereichszielen ist der Sensorzustand nicht verfügbar, da es keinen einzelnen korrekten Temperaturwert gibt. Lies stattdessen `target_temp_low` und `target_temp_high`.

<a id="zone-environmental-condition"></a>
### Umgebungszustand der Zone

Zustände:

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

Wichtigste Attribute:

| Attribut | Bedeutung |
| --- | --- |
| `data_quality` | `complete`, `unverified`, `partial`, `stale` oder `unavailable`. |
| `data_issues` | Stabile Codes für fehlende, veraltete, ungültige oder nutzbare Werte mit ungeprüfter Aktualität. |
| `range_summary` | Aktuelles Komfortbereichsergebnis und Humidex-Abgleich. |
| `ventilation_opportunity` | Vollständige Daten zur Lüftungsmöglichkeit. |
| `comfort_zone` | Ausgewähltes Komfortmodell und wirksamer Luftfeuchtigkeitsbereich. |
| `temperature_source` / `humidity_source` | Für Innenmesswerte verwendete Quellentitäten. |
| `derived_metrics` | Aktivierte Daten für Humidex, Taupunkt und absolute Luftfeuchtigkeit. |
| `outdoor` | Optionaler Innen-/Außenvergleich. |
| `insights` | Geordnete Beobachtungshinweise mit stabilen Codes. |

Beispiel:

```yaml
{% set insights =
   state_attr('sensor.velair_climate_living_room_environmental_condition',
              'insights') or [] %}
{{ insights
   | selectattr('code', 'eq', 'ventilation_may_help_cool')
   | list | count > 0 }}
```

Die vollständigen Komfortdaten beschreiben [Umgebungskomfort](comfort.de.md) und [Sensoren für Zonensteuerung und Übermittlung](zone-sensors.de.md#environmental-condition).

<a id="zone-ventilation-opportunity"></a>
### Lüftungsmöglichkeit der Zone

Zustände:

```text
unavailable
no_opportunity
may_help
comfort_possible
trade_off
already_comfortable
```

Wichtigste Attribute:

| Attribut | Bedeutung |
| --- | --- |
| `evaluation_scope` | Ob Velair Temperatur, Luftfeuchtigkeit oder beides bewertet hat. |
| `reason` | Stabiler maschinenlesbarer Grundcode. |
| `data_quality` / `data_issues` | Qualität des Außenvergleichs. |
| `outdoor_temperature_source` | Quellentität der Außentemperatur. |
| `outdoor_humidity_source` | Quellentität der Außenluftfeuchtigkeit, sofern konfiguriert. |
| `potential_effects` | Mögliche Wirkungen der Außenluft nach Velairs Einschätzung. |
| `blocked_by` | Bedingungen, die ein deutlicheres Gelegenheitsergebnis verhindern. |

Beispiel:

```yaml
{{ is_state('sensor.velair_ventilation_opportunity_living_room',
            'comfort_possible') }}
```

Dieser Sensor dient der Beobachtung. Velair öffnet auf seiner Grundlage niemals Fenster und verändert keine Klimasteuerung.

<a id="zone-air-quality"></a>
### Luftqualität der Zone

Zustände:

```text
not_monitored
unavailable
good
elevated
poor
```

Wichtigste Attribute:

| Attribut | Bedeutung |
| --- | --- |
| `availability` | Verfügbarkeit des aktuellen CO2-Messwerts. |
| `co2_source` | Für die Bewertung verwendeter CO2-Sensor. |

<a id="zone-override-state"></a>
### Übersteuerungszustand der Zone

Zustände:

```text
none
boost
paused
disabled
```

Wichtigste Attribute:

| Attribut | Bedeutung |
| --- | --- |
| `started_at` | Beginn der aktiven Übersteuerung. |
| `until` | Geplanter Ablauf der Übersteuerung, sofern vorhanden. |
| `action` | Übersteuerungsaktion, sofern vorhanden. |
| `pause_id` | Kennung der aktiven Pause bei einer einzelnen Pause. |
| `pause_count` / `pause_ids` | Kompakter Kontext mehrerer Pausen. |
| `manual` | Ob die Pause eine manuelle Anpassung ist. |

Verwende diesen Sensor für temporäre Anpassungen und Pausen. Für Zuständigkeit wie automatisch, manuell oder extern verwende **Steuerung**.

<a id="zone-control"></a>
### Zonensteuerung

Zustände:

```text
automatic
manual
external
```

Wichtigste Attribute:

| Attribut | Bedeutung |
| --- | --- |
| `runtime_state` | `idle`, `scheduled`, `preconditioning`, `boost`, `paused`, `stopped`, `externally_managed` oder `temperature_migration_required`. |
| `schedule_source` | `default`, `profile` oder `profile_pause`. |
| `profile_id` / `profile_name` | Wirksames zuständiges Profil der Zone, sofern vorhanden. |
| `mode_id` / `mode_name` | Gewählter Modus, sofern vorhanden. |
| `manual_source` | `explicit`, `external_change` oder `other`, nur bei manueller Steuerung. |
| `manual_started_at` | Beginn der manuellen Anpassung. |
| `manual_until` | Geplanter Ablauf der manuellen Anpassung, sofern vorhanden. |
| `manual_policy` | `until_next_block`, `for_duration` oder `until_resumed`. |

Beispiel:

```yaml
{{ is_state('sensor.velair_control_living_room', 'automatic')
   and state_attr('sensor.velair_control_living_room', 'runtime_state')
       == 'scheduled' }}
```

<a id="zone-delivery-diagnostics"></a>
### Übertragungsdiagnose der Zone

Diese Diagnoseentität ist standardmäßig deaktiviert. Aktiviere sie in der Entitätsregistrierung von Home Assistant, wenn ein Dashboard oder eine Automation Informationen zur Laufzeitübermittlung benötigt.

Zustände:

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

Wichtigste Attribute:

| Attribut | Bedeutung |
| --- | --- |
| `updated_at` | Letzte Aktualisierung des Übertragungszustands. |
| `retry_count` | Durch den aktuellen Zustand dargestellter Versuch. |
| `last_error_at` / `last_error_code` | Letzter bereinigter Übertragungsfehler. |
| `last_accepted_at` | Letzter Zeitpunkt, zu dem Home Assistant eine vollständige Velair-Dienstfolge angenommen hat. |
| `last_accepted_source` | `automatic`, `manual`, `boost` oder `automatic_reassertion`. |
| `last_accepted_action` | `set_temperature`, `set_hvac_mode`, `turn_off` oder `other`. |
| `last_accepted_hvac_mode` | Von Home Assistant angenommener HVAC-Modus. |
| `last_accepted_temperature_unit` | Zusammen mit dem angenommenen Ziel gespeicherte Einheit. |
| `last_accepted_temperature` | Angenommene einzelne Zieltemperatur, sofern relevant. |
| `last_accepted_target_temp_low` / `last_accepted_target_temp_high` | Angenommenes Bereichsziel, sofern relevant. |

Beispiel:

```yaml
triggers:
  - trigger: state
    entity_id: sensor.velair_delivery_diagnostics_living_room
    to: exhausted
```

`success` bedeutet, dass Home Assistant die Dienstfolge angenommen hat. Es beweist nicht, dass das physische Gerät sein Ziel erreicht hat.

<a id="zone-preconditioning-start"></a>
### Vorkonditionierungsstart der Zone

Wichtigste Attribute:

| Attribut | Bedeutung |
| --- | --- |
| `status` | `planned` oder `active`. |
| `scheduled_for` | Ursprüngliche Komfortzeit des Blocks. |
| `lead_minutes` | Minuten, um die Velair den Start vorgezogen hat. |
| `direction` | Heiz- oder Kühlrichtung. |
| `target_kind` / `target_boundary` | Vorhersagekontext für Einzelziel oder Bereichsgrenze. |
| `boundary_temperature` | Für die Vorhersage verwendete Grenze. |
| `model_source` | Von Velair gewählte Vorhersagequelle. |
| `target_temperature` | Einzelzieltemperatur, sofern relevant. |
| `target_temp_low` / `target_temp_high` | Bereichsziel, sofern relevant. |
| `hvac_mode` | HVAC-Modus des Vorkonditionierungsereignisses. |

<a id="zone-room-assist-state"></a>
### Room-Assist-Zustand der Zone

Zustände:

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

Wichtigste Attribute:

| Attribut | Bedeutung |
| --- | --- |
| `room_temperature_entity_id` | Raumsensorquelle. |
| `target_temperature` | Sichtbares Zeitplan- oder Übersteuerungsziel. |
| `applied_temperature` | Von Room Assist am Klimagerät angewendetes Ziel. |
| `applied_offset` | Aktuell angewendeter Versatz. |
| `calculated_temperature` | Berechnetes Ziel vor der Begrenzung. |
| `assist_delta` | Aktive Unterstützungsdifferenz, wenn größer als null. |
| `scheduled_target_guard` | Schutz vor unsicheren Zieländerungen. |
| `hysteresis_phase` / `hysteresis_target` | Laufzeitphase des Haltebereichs. |
| `deadband_low` / `deadband_high` | Wirksamer Haltebereich. |
| `target_temp_low` / `target_temp_high` | Sichtbares natives Bereichsziel. |
| `applied_target_temp_low` / `applied_target_temp_high` | Nach Unterstützung gesendeter nativer Bereich. |
| `climate_target_temp_low` / `climate_target_temp_high` | Aktuell vom Klimagerät gemeldeter nativer Bereich. |
| `range_shift` | Aktuelle Bereichsverschiebung, sofern relevant. |
| `direction` | Heiz- oder Kühlrichtung. |
| `hvac_mode` | HVAC-Modus des unterstützten Ziels. |
| `active_from` / `target_when` | Zeitkontext des unterstützten Blocks. |

<a id="choosing-the-right-surface"></a>
## Die passende Informationsquelle wählen

| Frage | Verwenden |
| --- | --- |
| Was plant Velair als Nächstes? | **Nächstes geplantes Ereignis** |
| Ist Velair global pausiert oder geplant? | **Zeitplanstatus** |
| Funktioniert Velair ordnungsgemäß? | **Diagnosestatus** |
| Welches Ziel steuert Velair gerade? | **Aktive Solltemperatur** |
| Ist der Raum angenehm, sind Werte veraltet oder fehlen sie? | **Raumklima** |
| Könnte Außenluft helfen? | **Lüftungsmöglichkeit** |
| Ist der CO2-Wert gut oder schlecht? | **Luftqualität** |
| Hat dieses Klimagerät eine temporäre Anpassung oder Pause? | **Übersteuerung** |
| Wer steuert dieses Klimagerät gerade? | **Steuerung** |
| Hat Home Assistant den letzten Velair-Befehl angenommen? | **Lieferdiagnose** |
| Wann beginnt die Vorkonditionierung? | **Start der Vorkonditionierung** |
| Was wendet Room Assist an? | **Room Assist** |

Ereignisse sind besser geeignet, wenn eine Automation auf einen Übergang reagieren und die Änderung kennen muss. Sensoren eignen sich besser, wenn ein Dashboard oder eine Automation den aktuellen Zustand benötigt, auch nach einem Neustart.
