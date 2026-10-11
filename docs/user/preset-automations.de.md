<a id="update-shared-presets-from-automations"></a>
# Gemeinsame Presets über Automationen aktualisieren
<!-- velair-docs:start -->
Übersetzungen: [Englisches Original](preset-automations.md) · [Español](preset-automations.es.md) · [Français](preset-automations.fr.md) · [Deutsch](preset-automations.de.md) · [Italiano](preset-automations.it.md) · [Nederlands](preset-automations.nl.md) · [Polski](preset-automations.pl.md) · [Português (Brasil)](preset-automations.pt-br.md) · [Português (Portugal)](preset-automations.pt-pt.md) · [Русский](preset-automations.ru.md) · [Übersetzungsstatus](../translation-status.md)

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

Mit `velair.update_block_preset` änderst du ein gespeichertes Velair-Preset aus einer Home-Assistant-Automation oder einem Skript. Dabei wird die gemeinsame Definition dauerhaft bearbeitet: Jeder darauf verweisende Block erhält die neue Konfiguration, einschließlich Blöcken in Vorlagen und Tagen, die der vollständigen Vorlagenkonfiguration folgen.

Der Dienst wählt kein anderes Preset für einen Block und aktiviert kein Profil. Verwende Profile oder Modi, wenn eine Automation eine andere Routine auswählen soll.

<a id="find-the-identifier"></a>
## Die Kennung finden

Öffne **Vorlagen → Klima-Presets**, wähle ein gespeichertes Preset und kopiere seine **Automations-ID**. Verwende diesen Wert als `preset_key`; ein Umbenennen des Presets verändert die Kennung nicht. Die folgenden Beispiele verwenden Beispielkennungen. Ersetze sie durch deine eigenen kopierten Werte.

<a id="update-or-replace"></a>
## Aktualisieren oder ersetzen

Standardmäßig ändert `operation: update` nur die gesendeten Felder und behält Aktion und übrige Einstellungen des Presets bei. Sende bei diesem Vorgang kein `action`.

`operation: replace` ersetzt die vollständige Klimakonfiguration. Sende `action` und alle Einstellungen, die erhalten bleiben sollen. Damit wechselst du zwischen einer Temperaturaktion, einer reinen Modusaktion, einer Aktion nur für zusätzliche Einstellungen und Ausschalten. Name, Kennung und Position des Presets in der Bibliothek bleiben unverändert.

| Feld | Bedeutung |
|---|---|
| `preset_key` | Erforderliche Kennung eines vorhandenen Velair-Presets. |
| `operation` | `update` (Standard) oder `replace`. |
| `action` | Für `replace` erforderlich, für `update` nicht zulässig. Verwende `set_temperature`, `set_hvac_mode`, `set_climate_options` oder `turn_off`. |
| `temperature` | Einzelne Zieltemperatur in der von Velair angegebenen Temperatureinheit. |
| `target_temp_low`, `target_temp_high` | Natives Bereichsziel; immer beide Grenzen zusammen senden. |
| `hvac_mode` | HVAC-Modus gemäß den Regeln der ausgewählten Aktion. |
| `fan_mode`, `preset_mode`, `swing_mode`, `swing_horizontal_mode`, `humidity` | Optionale Geräteeinstellungen gemäß den Regeln der ausgewählten Aktion. |
| `clear_fields` | Nur für `update`: Liste der zu entfernenden Klimaparameter. |

Das Senden einer einzelnen Zieltemperatur entfernt einen vorherigen Bereich. Das Senden eines vollständigen Bereichs entfernt eine vorherige Einzeltemperatur. Sende niemals beides in einem Aufruf. Das Entfernen einer erforderlichen Zieltemperatur oder der letzten Einstellung eines reinen Options-Presets ist ungültig. Verwende `replace`, um die Aktion selbst zu ändern.

Ein bei `update` weggelassenes Feld bleibt erhalten. Leere Zeichenfolgen und `null` sind keine Anweisung zum Entfernen einer Einstellung; verwende `clear_fields`. Ein Feld darf im selben Aufruf nicht gleichzeitig gesetzt und gelöscht werden. Beim Entfernen einer Geräteeinstellung wird ihr Befehl nicht mehr gesendet; die Einstellung am Thermostat wird dadurch nicht zurückgesetzt.

Das normale Home-Assistant-Aktionsformular legt fest, welche Änderungen bei jedem Automationslauf ausgeführt werden. Es lädt nicht die aktuellen Preset-Werte in das Formular. Seltener verwendete Parameter sind in eingeklappten Bereichen gruppiert.

<a id="example-adjust-heating-comfort-to-outdoor-temperature"></a>
## Beispiel: Heizkomfort an die Außentemperatur anpassen

**Ausgangslage:** Wohnzimmer und Arbeitszimmer verwenden beide das Velair-Preset **Heizkomfort**, konfiguriert auf Heizen mit 21 °C und leisem Lüfter. Du möchtest bei kaltem Wetter 21 °C und bei milderem Wetter 19 °C, ohne Modus und Lüftereinstellungen zu ändern.

Diese Automation prüft beim Start von Home Assistant und bei Änderungen des Außensensors. Unter 10 °C setzt sie 21 °C, über 12 °C setzt sie 19 °C. Zwischen diesen Schwellen bleibt das bisherige Ziel erhalten. Der Abstand verhindert wiederholtes Umschalten an einer einzelnen Schwelle. Ist der Sensor nicht verfügbar, wird nichts geändert.

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

Das Beispiel setzt voraus, dass Velair und Außensensor °C verwenden. Wähle für Fahrenheit entsprechende Schwellen und Ziele in den passenden Einheiten. Der Dienst konvertiert den Außensensorwert für diese Automation niemals.

Beide Räume behalten ihre eigenen Zeitpläne. Ist Heizkomfort aktiv und steuert Velair automatisch, ändert sich das Ziel nach dem Speichern. Liegt der nächste Block in der Zukunft, berechnet Velair die geplanten Ereignisse und den Vorkonditionierungsplan neu. Wiederholte Aufrufe mit unveränderter Konfiguration speichern nichts und senden keine Befehle.

<a id="example-update-a-native-range"></a>
## Beispiel: Einen nativen Bereich aktualisieren

**Ausgangslage:** Ein Thermostat mit Unterstützung für Heiz-/Kühlbereiche verwendet **Zuhause-Bereich**. Ändere sein Ziel auf 19–25 °C, ohne Modus oder Geräteoptionen zu verändern:

```yaml
action: velair.update_block_preset
data:
  preset_key: preset_home_range
  target_temp_low: 19
  target_temp_high: 25
```

Sende beide Grenzen, auch wenn sich nur eine ändert. Ein Thermostat, das nur einzelne Zieltemperaturen unterstützt, kann dieses Preset nicht verwenden. Velair leitet weder eine kompatible Einzeltemperatur noch eine fehlende Bereichsgrenze ab.

<a id="example-change-or-remove-a-device-setting"></a>
## Beispiel: Eine Geräteeinstellung ändern oder entfernen

Um nur die Lüftereinstellung zu ändern und Temperatur sowie HVAC-Modus beizubehalten:

```yaml
action: velair.update_block_preset
data:
  preset_key: preset_heating_comfort
  fan_mode: auto
```

Um keinen Lüfterbefehl mehr in diesem Preset zu senden:

```yaml
action: velair.update_block_preset
data:
  preset_key: preset_heating_comfort
  clear_fields:
    - fan_mode
```

`preset_mode` bezeichnet ein **Geräte-Preset** wie `eco` oder `sleep`. Es ist ein Parameter innerhalb des Velair-Presets und keine Kennung eines anderen Velair-Presets.

<a id="example-replace-with-off-and-restore-explicitly"></a>
## Beispiel: Durch Ausschalten ersetzen und ausdrücklich wiederherstellen

Ersetze die Konfiguration eines gespeicherten Presets durch Ausschalten:

```yaml
action: velair.update_block_preset
data:
  preset_key: preset_heating_comfort
  operation: replace
  action: turn_off
```

Um Heizen mit 21 °C und leisem Lüfter wiederherzustellen, ersetze es erneut ausdrücklich:

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

Es gibt keinen zeitgesteuerten Ablauf und keine automatische Wiederherstellung. Ausschalten wirkt auf jeden gespeicherten Verweis auf dieses Preset. Bei einem offenen Fenster oder einer vorübergehenden Unterbrechung für einen Raum ist eine eindeutig zugeordnete [Zonenpause](usage.de.md#services) vorzuziehen. Sie lässt das gemeinsame Preset unverändert.

<a id="validation-and-runtime-behavior"></a>
## Validierung und Laufzeitverhalten

- Velair prüft jede gespeicherte Verwendung, einschließlich inaktiver Profile und durch ein Profil verdeckter Standardzeitpläne. Eine inkompatible Verwendung lehnt die gesamte Aktualisierung ab; nichts wird teilweise gespeichert.
- Unterstützte optionale Einstellungen können je Thermostat anhand der bestehenden Anpassungsregeln gefiltert werden. Temperaturgrenzen, Aktionskompatibilität und Einschränkungen externer Regler gelten weiterhin.
- Temporäre Anpassung, Pause, manuelle Anpassung und Stopp behalten ihren Vorrang. Ein Preset-Update beendet sie nicht. Bei Wiederaufnahme der automatischen Steuerung verwendet Velair die neuesten gespeicherten Einstellungen.
- Eine aktive automatische Änderung wird nach dem Speichern angewendet; eine nur zukünftige Änderung sendet jetzt keinen unnötigen Befehl. Vorkonditionierung und Room Assist werden bei Änderungen von Ziel oder Quelle abgeglichen. Reine Modus- und Optionsaktionen sowie Ausschalten erhalten keine Temperaturvorbereitung.
- Externe Regler erhalten aktualisierte aufgelöste Wochenpläne, wenn sich ihre wirksamen Zeitpläne ändern. Eine fehlgeschlagene Veröffentlichung aktiviert keine lokale Ausführung.
- Unbekannte Kennungen, ungültige Kombinationen, inkompatible Verwendungen und eine ausstehende Temperatureinheitenmigration verursachen Fehler. Fehler bei der Geräteübermittlung nach dem Speichern machen das gespeicherte Preset nicht rückgängig.

Umgebungsschwellen, Hysterese, Auswertung von Vorhersagen und der Zeitpunkt einer Wiederherstellung gehören in Home-Assistant-Automationen. Der Dienst erstellt keine Wetterregeln oder regelmäßigen Abfragen in Velair. Der [Blueprint für saisonale Klimasteuerung](blueprints/seasonal-climate-selection.de.md) kann Modi wählen oder diese Dienste ausführen, nachdem eine Temperatur für die konfigurierte Dauer stabil geblieben ist. Wähle Modi, wenn Winter und Sommer separate Preset-Definitionen behalten sollen; das Aktualisieren eines Presets verändert alle seine Verwendungen.

Den Geltungsbereich gemeinsamer Ressourcen erklärt [Block-Presets und verknüpfte Vorlagen](linked-schedules.de.md). Vollständige Haushaltskonfigurationen findest du unter [Praktische Beispiele](linked-schedule-examples.de.md).
