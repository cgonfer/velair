<a id="zone-control-and-delivery-sensors"></a>
# Sensoren für Zonensteuerung und Übertragungsdiagnose
<!-- velair-docs:start -->
Übersetzungen: [Englisches Original](zone-sensors.md) · [Español](zone-sensors.es.md) · [Français](zone-sensors.fr.md) · [Deutsch](zone-sensors.de.md) · [Italiano](zone-sensors.it.md) · [Nederlands](zone-sensors.nl.md) · [Polski](zone-sensors.pl.md) · [Português (Brasil)](zone-sensors.pt-br.md) · [Português (Portugal)](zone-sensors.pt-pt.md) · [Русский](zone-sensors.ru.md) · [Übersetzungsstatus](../translation-status.md)

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

Velair erstellt für jede verwaltete `climate.*`-Entität zwei Kontextsensoren:

- **Steuerung** zeigt, wer die Zone gerade steuert und welche Velair-Konfiguration gilt.
- **Lieferdiagnose** zeigt, was beim letzten Versuch passiert ist, einen Klimasollwert über Home Assistant zu senden.

Sie beschreiben unterschiedliche Ebenen. Eine Zone kann automatisch gesteuert werden, obwohl die letzte Übertragung nicht möglich war oder fehlgeschlagen ist. Die Sensoren ersetzen einander deshalb nicht.

Der separate Sensor **Raumklima** stellt bei aktiviertem Komfort die eingeschalteten `derived_metrics` und die geordnete, nur zur Laufzeit vorhandene Liste `insights` bereit. Hinweise enthalten `code`, `kind`, `tone` und zugehörige `metrics`. Sie dienen der Beobachtung und führen niemals Klimasteuerungsaktionen aus. Siehe [Umgebungskomfort](comfort.de.md#comfort-insights).
Bei aktiviertem Außenvergleich stellt derselbe Sensor außerdem den Teilbaum `outdoor` bereit. Dieser enthält Quellmesswerte, die ausdrücklich ausgewiesene absolute Luftfeuchtigkeit innen und außen, unabhängige Angaben zur Datenqualität und eine fachliche Bewertung der Lüftungsmöglichkeit beziehungsweise eines Zielkonflikts. Velair erstellt keine Stellvertreterentitäten für einzelne Messwerte. Für die unten beschriebene, vom Backend bestimmte Zusammenfassung für Automatisierungen gibt es jedoch einen separaten Enum-Sensor **Lüftungsmöglichkeit**.

<a id="environmental-condition"></a>
## Umgebungszustand

Der Sensor **Raumklima** stellt den aktuellen Zustand für Komfortautomatisierungen bereit. Er ist für jede verwaltete Klimaentität standardmäßig aktiviert und wird anhand derselben Backend-Bewertung wie das Velair-Panel aktualisiert. Das Auslesen fragt keinen Sensor aktiv ab und führt keine Klimasteuerungsaktion aus.

Sein nativer Zustand behält die mit bestehenden Automatisierungen kompatible Einteilung nach Temperatur und Luftfeuchtigkeit bei:

| Zustand | Bedeutung |
| --- | --- |
| `monitoring_off` | Die Komfortüberwachung ist für diese Klimaentität deaktiviert. |
| `no_readings` | Aktuell liegt kein nutzbarer überwachter Messwert vor. |
| `temperature_comfortable` | Nur die Temperatur lässt sich bewerten und liegt im konfigurierten Bereich. |
| `humidity_comfortable` | Nur die Luftfeuchtigkeit lässt sich bewerten und liegt im konfigurierten Bereich. |
| `comfortable` | Temperatur und Luftfeuchtigkeit liegen beide in ihren konfigurierten Bereichen. |
| `cold` / `hot` | Die Temperatur liegt unter oder über ihrem konfigurierten Bereich. |
| `dry` / `humid` | Die Luftfeuchtigkeit liegt unter oder über ihrem konfigurierten Bereich. |
| `cold_and_dry` / `cold_and_humid` | Beide Messwerte sind nutzbar und die Temperatur liegt unter ihrem Bereich. |
| `hot_and_dry` / `hot_and_humid` | Beide Messwerte sind nutzbar und die Temperatur liegt über ihrem Bereich. |

Diese Werte bleiben mit bestehenden Automatisierungen kompatibel. Sie beschreiben die konfigurierten physikalischen Bereiche und treffen keine medizinische oder allgemeingültige Aussage über das persönliche Wohlbefinden.

<a id="environmental-condition-attributes"></a>
### Attribute des Umgebungszustands

| Attribut | Bedeutung |
| --- | --- |
| `data_quality` | `complete`, `unverified`, `partial`, `stale` oder `unavailable` für die überwachten Innenmesswerte. `unverified` bedeutet, dass die Messwerte verwendbar sind, aber für mindestens einen kein überprüfbarer Meldezeitpunkt vorliegt. |
| `data_issues` | Stabile Codes für fehlende, veraltete oder ungültige Innendaten. Entfällt bei leerer Liste. |
| `range_summary` | Sachliche Zusammenfassung der konfigurierten Bereiche, einschließlich eines optionalen Abgleichs mit Humidex. |
| `ventilation_opportunity` | Aktueller, vom Backend bestimmter Lüftungszustand, Bewertungsumfang, Auswirkungen, Hindernisse und Begründung. |
| `comfort_zone` | Gewählte Zielgeometrie des einfachen, geführten oder benutzerdefinierten temperaturabhängigen Modells und der bei der aktuellen Temperatur geltende Luftfeuchtigkeitsbereich. |
| `temperature_source` | Aktuell verwendete Entitäts-ID für die Innentemperatur, sofern verfügbar. |
| `humidity_source` | Aktuell verwendete Entitäts-ID für die Innenluftfeuchtigkeit, sofern verfügbar. |
| `derived_metrics` | Daten für aktivierte Humidex-, Taupunkt- und Absolutfeuchtemessgrößen. Nicht überwachte Größen entfallen. |
| `outdoor` | Optionaler Innen-/Außenvergleich mit geltenden Schwellenwerten für Hinweise, Datenqualität, Messwerten und Bewertung der Möglichkeit beziehungsweise des Zielkonflikts. |
| `insights` | Geordnete Beobachtungshinweise mit `code`, `kind`, `tone` und zugehörigen `metrics`. Entfällt bei leerer Liste. |

`derived_metrics` und `outdoor` entfallen, wenn die jeweilige Funktion deaktiviert ist. Fehlen Messwerte einer aktivierten Funktion oder sind sie veraltet oder ungültig, bleiben ihre Daten mit `availability` und Angaben zum Problem vorhanden. So verwenden Automatisierungen keinen alten Wert weiter. `insights` entfällt, wenn die aktuelle Liste leer ist. Unverarbeitete Innenmesswerte für Temperatur und Luftfeuchtigkeit bleiben an ihren Quellentitäten. Die CO2-Einstufung stellt der separate Sensor **Luftqualität** bereit.

Beim geführten oder benutzerdefinierten temperaturabhängigen Modell ist `comfort_zone.effective_humidity_range` `null`, wenn die aktuelle Temperatur nicht nutzbar ist. Der Luftfeuchtigkeitswert kann dann weiterhin sichtbar sein, erhält aber keine Einstufung. Er darf nicht anhand eines angenommenen Bereichs als innerhalb oder außerhalb des Komfortbereichs behandelt werden.

`range_summary` enthält:

```yaml
status: within_range | outside_range | mixed | unavailable
thermal_relation: aligned | mixed | not_evaluated | unavailable
positions:
  temperature: below | within | above | null
  humidity: below | within | above | null
  humidex: below | within | above | null
```

Dieses Template erkennt beispielsweise widersprüchliche thermische Indikatoren, ohne eine übersetzte Anzeigebezeichnung auszuwerten:

```yaml
{% set summary =
   state_attr('sensor.velair_environmental_condition_living_room',
              'range_summary') %}
{{ summary is mapping and summary.get('thermal_relation') == 'mixed' }}
```

Diese Bedingung prüft, ob der aktivierte Humidex-Wert aktuell ist und über dem konfigurierten Temperaturbereich liegt:

```yaml
{% set metrics =
   state_attr('sensor.velair_environmental_condition_living_room',
              'derived_metrics') or {} %}
{% set humidex = metrics.get('humidex', {}) %}
{{ humidex.get('availability') == 'current'
   and humidex.get('temperature_range_position') == 'above' }}
```

Diese Bedingung verwendet einen vom Backend bestimmten Hinweiscode. Sie bleibt gültig, wenn sich die Anzeigesprache ändert:

```yaml
{% set insights =
   state_attr('sensor.velair_environmental_condition_living_room',
              'insights') or [] %}
{{ insights
   | selectattr('code', 'eq', 'ventilation_may_help_cool')
   | list | count > 0 }}
```

Beim optionalen Außenvergleich solltest du vor der Verwendung eines Zahlenwerts dessen Verfügbarkeit prüfen:

```yaml
{% set outdoor =
   state_attr('sensor.velair_environmental_condition_living_room',
              'outdoor') or {} %}
{% set comparison = outdoor.get('comparison', {}) %}
{% set thresholds = outdoor.get('guidance_thresholds', {}) %}
{% set temperature = comparison.get('temperature', {}) %}
{{ temperature.get('availability') == 'current'
   and temperature.get('potential') == 'cooling'
   and thresholds.get('temperature_delta') is number }}
```

<a id="entity-or-event"></a>
### Entität oder Ereignis?

Verwende diese Entität, wenn eine Automatisierung den aktuellen Zustand benötigt, auch nach einem Neustart von Home Assistant. Ein normaler Zustandsauslöser kann auf eine kompatible physikalische Einstufung reagieren:

```yaml
triggers:
  - trigger: state
    entity_id: sensor.velair_environmental_condition_living_room
    to: hot_and_humid
```

Verwende `comfort_assessment_changed`, wenn die Automatisierung wissen muss, was sich geändert hat. Seine Felder `previous_range_summary`, `range_summary_changed` und `range_status_changed` unterscheiden einen Bereichswechsel von einer anderen Komfortaktualisierung. Die vollständigen Ereignisdaten und eine kopierbare Automatisierung findest du unter [Geänderte Komfortbewertung](automation-events.de.md#comfort-assessment-changed).

<a id="ventilation-opportunity"></a>
## Lüftungsmöglichkeit

Der Sensor **Lüftungsmöglichkeit** je Zone wird durch Ereignisse aktualisiert und dient der Beobachtung:

| Zustand | Bedeutung |
| --- | --- |
| `unavailable` | Komfort, Außenvergleich oder ein erforderlicher konfigurierter Messwert lässt sich derzeit nicht bewerten. |
| `no_opportunity` | Die Außenluft überschreitet die konfigurierten Schwellenwerte nicht in einer hilfreichen Richtung. |
| `may_help` | Die Außenluft bewegt den Raum in Richtung Komfort. Velair kann aber nicht feststellen, ob der gesamte konfigurierte Komfortbereich erreicht wird. |
| `comfort_possible` | Die Außentemperatur liegt im Bereich. Bei überwachter Luftfeuchtigkeit liegt auch die Außenluftfeuchtigkeit im Komfortband, das bei dieser Außentemperatur gilt. |
| `trade_off` | Eine hilfreiche Änderung einer überwachten Größe verschlechtert bekanntermaßen eine andere. |
| `already_comfortable` | Der physikalische Umgebungszustand liegt bereits im Komfortbereich. |

`comfort_possible` ist eine vorsichtige Abschätzung anhand der Umgebungsbedingungen und kein Versprechen über die Wirkung eines geöffneten Fensters. Velair kennt weder Luftaustausch, Wind, Regen, Schadstoffe außen, Sonneneinstrahlung, thermische Masse des Raums noch die Dauer der Fensteröffnung. Es öffnet niemals ein Fenster und ändert die Klimasteuerung nicht.

Zu den Attributen gehören `evaluation_scope`, `potential_effects`, `blocked_by`, `reason`, die Außenangaben `data_quality` und `data_issues` sowie die konfigurierten IDs der Außenquellen. Wird die Innenluftfeuchtigkeit überwacht, ohne eine Außenluftfeuchtigkeit anzugeben, kann die Temperatur zu `may_help` führen, aber niemals zu `comfort_possible`. Ist die Luftfeuchtigkeitsüberwachung bewusst deaktiviert, ist ein ausschließlich auf Temperatur beruhendes Ergebnis `comfort_possible` gültig.

`reason` ist ein stabiler maschinenlesbarer Code. Seine Werte sind: `monitoring_off`, `outdoor_comparison_disabled`, `indoor_temperature_unavailable`, `indoor_humidity_unavailable`, `outdoor_temperature_unavailable`, `outdoor_humidity_unavailable`, `already_comfortable`, `known_trade_off`, `no_useful_difference`, `outdoor_conditions_within_comfort`, `outdoor_humidity_not_configured` und `moves_toward_comfort`.

Für eine Klimaentität wie `climate.living_room` verwendet ein neu angelegter Entitätsregistereintrag normalerweise eine Entitäts-ID wie:

```text
sensor.velair_ventilation_opportunity_living_room
sensor.velair_control_living_room
sensor.velair_delivery_diagnostics_living_room
```

Dies sind vorgeschlagene Entitäts-IDs und keine dauerhafte API. Home Assistant kann zur Vermeidung von Kollisionen ein Suffix hinzufügen; außerdem kannst du eine Entität umbenennen. Wähle Entitäten anhand ihrer tatsächlichen IDs in deinem eigenen Home-Assistant-Entitätsregister aus. Der angezeigte Entitätsname verwendet den Anzeigenamen der verwalteten Klimaentität, die vorgeschlagene ID dagegen deren Objekt-ID. Name und Bereich des Velair-Dienstgeräts sind nicht Bestandteil dieser vorgeschlagenen ID.

<a id="zone-control"></a>
## Zonensteuerung

**Steuerung** ist standardmäßig aktiviert und wird nach jedem Neustart aus dem Zeitplaner wiederhergestellt. Ihr Zustand kennzeichnet, wer die Zone aktuell steuert:

| Zustand | Bedeutung |
| --- | --- |
| `automatic` | Velair steuert die Zone lokal. Dazu gehören Zeitplanbetrieb, Leerlauf, Pause, Stopp, temporäre Anpassung und adaptive Vorkonditionierung. `runtime_state` unterscheidet diese Zustände. |
| `manual` | Velair hat die Steuerung dieser Klimaentität an eine manuelle Anpassung abgegeben, ausdrücklich oder nach einer erkannten externen Änderung. Dies unterscheidet sich vom Velair-Modus **Manuell**, der die Profilauswahl betrifft. |
| `external` | Ein unterstützter externer Zeitplananbieter führt die Steuerung dieser Zone aus. Eine Änderung über eine Klimakarte, Fernbedienung oder andere Automatisierung erzeugt diesen Zustand nicht. Gibt Velair wegen einer solchen Änderung die Steuerung ab, lautet der Zustand `manual`. |

Der Sensor bleibt während einer erforderlichen Migration der Temperatureinheit verfügbar, da die Information über die Steuerungsverantwortung kein Temperaturwert ist.

<a id="zone-control-attributes"></a>
### Attribute der Zonensteuerung

| Attribut | Werte oder Bedeutung |
| --- | --- |
| `runtime_state` | `idle`, `scheduled`, `preconditioning`, `boost`, `paused`, `stopped`, `externally_managed`, `temperature_migration_required` oder der vorsorgliche Fallback `unknown`. |
| `schedule_source` | `default` für den Standardzeitplan der Zone, `profile` für einen wirksamen Profilzeitplan oder `profile_pause`, wenn das wirksame Profil die Zone pausiert. |
| `profile_id` / `profile_name` | Stabile ID und Anzeigename des Profils, das die Zone steuert, sofern eines gilt. |
| `mode_id` / `mode_name` | Stabile ID und Anzeigename des ausgewählten Modus, sofern ein benutzerdefinierter Modus gilt. |
| `manual_source` | Nur bei `manual` vorhanden: `explicit` bei direkt gewählter manueller Anpassung, `external_change` bei Abgabe der Steuerung nach einer erkannten Änderung an der Klimaentität oder der vorsorgliche Fallback `other`. |
| `manual_started_at` | Zeitpunkt, zu dem die aktuelle manuelle Anpassung begann. |
| `manual_until` | Geplanter Ablaufzeitpunkt, sofern die gewählte Regel für manuelle Anpassungen einen vorsieht. Bei einer unbefristeten Anpassung kann er fehlen. |
| `manual_policy` | Nur bei `manual` vorhanden: `until_next_block`, `for_duration`, `until_resumed` oder der vorsorgliche Fallback `unknown`. |

Optionale Attribute entfallen, wenn sie nicht zutreffen. Eine Entität mit `automatic` besitzt beispielsweise weder `manual_source` noch `manual_until`.

Steuerungszustand und Laufzeitzustand sind bewusst getrennt. Beispiele:

- `automatic` mit `runtime_state: paused` bedeutet, dass Velair die Zone weiterhin steuert, eine Pause aber aktuell die normale Zeitplanausführung verhindert.
- `automatic` mit `runtime_state: boost` bedeutet, dass Velair die temporäre Anpassung steuert.
- `external` mit `runtime_state: externally_managed` bedeutet, dass der konfigurierte externe Anbieter die Steuerung ausführt und nicht die lokale Übertragung von Klimabefehlen durch Velair.

<a id="zone-delivery-diagnostics"></a>
## Zonen-Übertragungsdiagnose

**Lieferdiagnose** ist eine standardmäßig deaktivierte Diagnoseentität. Aktiviere sie nur, wenn ein Dashboard oder eine Automatisierung Nachweise zur letzten lokalen Übertragung benötigt:

1. Öffne in Home Assistant **Einstellungen > Geräte & Dienste > Entitäten**.
2. Suche nach dem Namen der verwalteten Klimaentität und **Lieferdiagnose**.
3. Öffne die Entitätseinstellungen und aktiviere die Entität.

Der Sensor wird durch Ereignisse aktualisiert und fragt nichts regelmäßig ab. Sein Zustand beschreibt das zuletzt seit dem Integrationsstart beobachtete Übertragungsergebnis:

| Zustand | Auftreten |
| --- | --- |
| `idle` | Seit dem Start oder dem Löschen der Laufzeitnachweise wurde kein Übertragungsergebnis aufgezeichnet. |
| `success` | Home Assistant hat die vollständige Folge der Velair-Klimadienstaufrufe angenommen. `retry_count` zeigt, ob dies beim ersten Versuch oder einer Wiederholung geschah. |
| `failed` | Home Assistant hat einen Klimadienstaufruf abgelehnt. Vom Zeitplaner verwaltete Vorgänge wechseln normalerweise zur begrenzten Wiederherstellung. Eine einmalige Aktion ohne Wiederherstellung kann ohne erneuten Versuch fehlgeschlagen bleiben. |
| `retrying` | Velair hat nach einem behebbaren Fehler einen seiner begrenzten Wiederholungsversuche begonnen. Dieser Zustand kann nur kurz sichtbar sein. |
| `exhausted` | Der erste vom Zeitplaner verwaltete Versuch und beide verzögerten Wiederholungen sind fehlgeschlagen. |
| `invalid_intent` | Bei der Wiederherstellung oder erneuten Übertragung konnte Velair aus der aktuellen Steuerungsabsicht keinen gültigen Befehl mehr ermitteln. Normale Validierungsfehler bei Diensten und Konfigurationen werden abgewiesen, bevor dieser Zustand erreicht wird. |
| `cancelled` | Aktive oder zurückgestellte Übertragungsvorgänge wurden durch eine neuere Steuerungsabsicht ersetzt, ausdrücklich ungültig gemacht oder vor ihrem Abschluss gestoppt. Beginnt sofort ein neuer Vorgang, kann dieser Zustand nur kurz sichtbar sein. |
| `unavailable` | Die verwaltete Klimaentität fehlte, war `unknown` oder `unavailable`; Velair hat daher keinen Klimadienst aufgerufen. Eine dafür geeignete, vom Zeitplaner verwaltete Steuerungsabsicht wird neu ermittelt, sobald die Entität wieder verfügbar ist. |

Die Diagnoseentität selbst bleibt verfügbar, damit `unavailable` als Zustand beobachtet werden kann. Sie bleibt auch während einer erforderlichen Migration der Temperatureinheit verfügbar. Aufgezeichnete Temperaturnachweise behalten die Einheit, die mit dem angenommenen Sollwert erfasst wurde.

Velair führt derzeit höchstens zwei verzögerte Wiederholungen aus, nach ungefähr 2 und 10 Sekunden. Diese Zeiten beschreiben das Wiederherstellungsverhalten und sind keine empfohlene Schnittstelle für Automatisierungen. Automatisierungen sollten auf Zustände reagieren und sich nicht auf exakte Verzögerungen verlassen.

<a id="delivery-diagnostic-attributes"></a>
### Attribute der Übertragungsdiagnose

| Attribut | Bedeutung |
| --- | --- |
| `updated_at` | Zeitpunkt der letzten Aktualisierung des Übertragungszustands. Im anfänglichen Zustand `idle` fehlt er. |
| `retry_count` | Nummer des Versuchs, auf den sich der aktuelle Abschluss- oder Wiederholungszustand bezieht: `0` für den ersten Versuch, danach `1` oder `2` für Wiederholungen. Ein Abbruch setzt den Wert auf `0` zurück. |
| `last_error_at` | Zeitpunkt des zuletzt aufgezeichneten Ergebnisses `failed`, `exhausted` oder `invalid_intent`. |
| `last_error_code` | `failed`, `exhausted`, `invalid_intent` oder der vorsorgliche Fallback `unknown_delivery_status`. Unverarbeitete Ausnahmetexte werden niemals offengelegt. |
| `last_accepted_at` | Zeitpunkt, zu dem Home Assistant die letzte vollständige Velair-Steuerungsfolge angenommen hat. |
| `last_accepted_source` | `automatic`, `manual`, `boost` oder `automatic_reassertion`. |
| `last_accepted_action` | `set_temperature`, `set_hvac_mode`, `turn_off` oder der vorsorgliche Fallback `other`. |
| `last_accepted_hvac_mode` | HVAC-Modus des angenommenen Sollwerts, sofern einer galt. |
| `last_accepted_temperature_unit` | Mit einem einzelnen Sollwert oder Sollwertbereich aufgezeichnete Temperatureinheit. |
| `last_accepted_temperature` | Angenommener einzelner Sollwert, sofern zutreffend. |
| `last_accepted_target_temp_low` / `last_accepted_target_temp_high` | Angenommener unterer und oberer Sollwert für einen nativen Bereich, sofern zutreffend. |

Aufrufe über `velair.set_temperature` und `velair.set_hvac_mode` werden beide mit `last_accepted_source: manual` gemeldet. Ein erfolgreicher Aufruf, der nur den Modus setzt, enthält `last_accepted_action: set_hvac_mode` und einen HVAC-Modus; sämtliche Temperatursollwertattribute fehlen oder sind `null`.

Die Felder für den letzten Fehler und die letzte Annahme führen unabhängig voneinander Verlaufseinträge. Ein späteres `success` ändert den aktuellen Zustand, löscht aber nicht die bisherigen `last_error_*`-Werte. Ebenso löscht ein späterer Fehler nicht den zuletzt angenommenen Sollwert. Prüfe die Zeitstempel, wenn eine Automatisierung beide vergleichen muss.

`success` bedeutet, dass Home Assistant die Dienstaufrufe angenommen hat. Es bestätigt weder die Übertragung zum Gerät noch dessen Aktivität oder das Erreichen des Sollwerts im Raum. Verwende für den tatsächlichen Gerätezustand die Klimaentität und deren Geräteintegration. Room Assist kann den an den Thermostat gesendeten Sollwert anschließend ändern und besitzt einen eigenen Sensor für diese angewandte Anpassung. Auch die Veröffentlichung externer Zeitpläne hat in Velair einen separaten Status und wird von diesem lokalen Übertragungssensor nicht abgebildet.

Alle Übertragungsnachweise existieren nur zur Laufzeit. Nach einem Neustart der Velair-Integration oder von Home Assistant ist der Zustand wieder `idle`. Ein erfolgreicher Velair-Datenreset löscht die Nachweise ebenfalls. Sie werden weder aus Recorder noch aus dem Velair-Speicher wiederhergestellt.

<a id="automation-examples"></a>
## Automatisierungsbeispiele

Die folgende Automatisierung benachrichtigt erst, wenn Velair seine begrenzten Wiederholungsversuche ausgeschöpft hat. Ersetze die Beispiel-Entitäts-ID durch die ID aus deinem Entitätsregister:

```yaml
alias: Velair living room delivery exhausted
triggers:
  - trigger: state
    entity_id: sensor.velair_delivery_diagnostics_living_room
    to: exhausted
actions:
  - action: persistent_notification.create
    data:
      title: Velair delivery problem
      message: >-
        The living room target could not be delivered after
        {{ trigger.to_state.attributes.retry_count }} retries.
```

Diese Template-Bedingung prüft, ob Velair aktuell die automatische Steuerung übernimmt und ein aktiver Zeitplanblock vorliegt:

```yaml
condition: template
value_template: >-
  {{ is_state('sensor.velair_control_living_room', 'automatic')
     and state_attr('sensor.velair_control_living_room', 'runtime_state')
         == 'scheduled' }}
```

Verwende **Steuerung** für die aktuelle Steuerungsverantwortung und den Zeitplanerkontext, **Lieferdiagnose** für das letzte Ergebnis eines Dienstaufrufs und `climate.living_room` für den vom Gerät gemeldeten Zustand.
