<a id="adaptive-preconditioning"></a>
# Adaptive Vorkonditionierung
<!-- velair-docs:start -->
Übersetzungen: [Englisches Original](adaptive-preconditioning.md) · [Español](adaptive-preconditioning.es.md) · [Français](adaptive-preconditioning.fr.md) · [Deutsch](adaptive-preconditioning.de.md) · [Italiano](adaptive-preconditioning.it.md) · [Nederlands](adaptive-preconditioning.nl.md) · [Polski](adaptive-preconditioning.pl.md) · [Português (Brasil)](adaptive-preconditioning.pt-br.md) · [Português (Portugal)](adaptive-preconditioning.pt-pt.md) · [Русский](adaptive-preconditioning.ru.md) · [Übersetzungsstatus](../translation-status.md)

<details>
<summary>Status dieser Übersetzung</summary>

| Angabe | Status |
| --- | --- |
| Referenzversion | 1.9.0-beta.2 |
| Letzte Synchronisierung | 2026-10-17 |
| Sprachliche Prüfung | KI-gestützte Übersetzung |
| Vergleich mit dem Original | Mit dem englischen Original synchronisiert. |

</details>

---
<!-- velair-docs:end -->

Mit adaptiver Vorkonditionierung kann Velair vor einem geplanten Block mit dem Heizen oder Kühlen beginnen, damit die Raumtemperatur beim Blockbeginn näher am Ziel liegt.

Ein Zeitplanblock um `07:00` mit `21 °C` bedeutet beispielsweise „um `07:00` möglichst nahe an `21 °C` sein“, nicht „um `07:00` mit der Änderung auf `21 °C` beginnen“.

Die adaptive Vorkonditionierung läuft lokal in Home Assistant. Velair speichert Einstellungen und Lernbeispiele im Home-Assistant-Speicher und sendet weder Temperaturverlauf noch Beobachtungen oder Kalibrierdaten an einen externen Regler. Zonen mit externer Zeitplanausführung verwenden keine adaptive Vorkonditionierung; für sie wird nur der wirksame Wochenzeitplan veröffentlicht.

Ein Block mit **Nur Temperatur** erlaubt keinen HVAC-Moduswechsel. Solange das Klimagerät aus ist, beginnt Velair weder die vorzeitige Vorbereitung noch das Sammeln thermischer Lerndaten für diesen Sollwert. Nach externem Einschalten kann die Vorbereitung anhand des tatsächlichen kompatiblen Modus neu berechnet werden. Solange das Gerät aus bleibt, kann diese Option keinen Komfort zum Blockbeginn versprechen.

<a id="setup"></a>
## Einrichtung

Der Tab für die Vorkonditionierung bietet in seiner Bereichsauswahl zwei Werkzeuge. Standardmäßig öffnet sich die adaptive Vorkonditionierung. Wähle „Geplante Rückkehr“, um Anwesenheit und wöchentliche Ankünfte zu konfigurieren und die aktuelle Abwesenheit zu verwalten. Die direkten Panelpfade lauten `/velair/preconditioning/preconditioning` und `/velair/preconditioning/planned-return`. Siehe [Geplante Rückkehr](planned-return.de.md).

1. Öffne den Tab für die Vorkonditionierung.
2. Klappe das gewünschte Klimagerät auf.
3. Aktiviere die Vorkonditionierung.
4. Behalte die Standardmodelleinstellungen bei, sofern es keinen konkreten Grund für eine Anpassung gibt.
5. Wähle bei Bedarf einen Außentemperatursensor.

Die Vorkonditionierung wird je Klimagerät konfiguriert. Lerndaten für Heizen und Kühlen werden getrennt geführt: Kühlbeispiele ersetzen keine Heizbeispiele und umgekehrt.

Native `heat_cool`-Bereiche werden unterstützt. Liegt der Raum um mehr als die minimale Temperaturdifferenz unter der unteren Zielgrenze, berechnet Velair die Vorhersage anhand dieser Grenze und startet den vollständigen Bereich zum Heizen frühzeitig. Liegt der Raum um mehr als diese Differenz über der oberen Zielgrenze, verwendet Velair die obere Grenze und startet den vollständigen Bereich zum Kühlen frühzeitig. Bei Messwerten innerhalb des Bereichs oder des Totbands an seinen Grenzen bleibt die normale Zeitplanzeit erhalten. Velair sendet immer beide Bereichsgrenzen und reduziert einen Bereich niemals auf eine einzelne Temperatur.

Beim Aufklappen eines Klimageräts erscheint für jeden unterstützten Modus eine Karte mit der aktuellen Vorhersage. Sie verwendet dieselben Backend-Daten zum nächsten Ereignis wie die Übersicht. Pausen, temporäre Anpassungen, nicht unterstützte Modi und Blöcke, die nicht vorkonditioniert werden können, werden dadurch einheitlich berücksichtigt. Existiert ein passender zukünftiger Block, zeigt die Karte den berechneten Start, die Zielzeit, den Vorlauf, die geplante Temperatur und den Modus. Außerdem zeigt sie, ob Velair das Anfangsmodell oder ähnliche lokale Verlaufsdaten verwendet.

Um eine bestimmte Berechnung zu prüfen, öffne **Berechnungsdetails** in der Vorhersagekarte. Dieser optionale Bereich zeigt die Backend-Werte für die Vorhersage: Anzahl der Beispiele, Schätzung aus abgeschlossenen Beobachtungen, Untergrenze aus Teilbeobachtungen, kombinierte Schätzung, Rundung und endgültiger Vorlauf. Standardmäßig bleibt er ausgeblendet, damit die normale Ansicht übersichtlich bleibt.

Die Vorbereitung einer Geplanten Rückkehr wird getrennt von der Vorbereitung des Wochenzeitplans angezeigt. Bei einer angenommenen zukünftigen Rückkehr zeigt jedes Klimagerät Rückkehrstatus, geschätzten Beginn, Ankunftssollwert und gegebenenfalls den Grund für eine Aussetzung oder Nichtverfügbarkeit. Übersicht, Geplante Rückkehr und Klimakarten verwenden dieselben Rückkehrdaten des Backends; dies ist kein weiteres Wochenereignis. Ein Raum kann weiter dem Abwesenheitsmodus folgen und zugleich eine spätere Rückkehrschätzung anzeigen. **Vorbereitung** beschreibt Velairs Steuerungsabsicht und bestätigt weder den Empfang eines Befehls noch tatsächliches Heizen oder Kühlen. Die Rückkehrzeitleiste zeigt die verstrichene Zeit bis zur gespeicherten Ankunft, keinen thermischen Fortschrittsprozentsatz. Siehe [Raumvorbereitung](planned-return.de.md#room-preparation).

<a id="how-it-starts"></a>
## Wie der Start berechnet wird

Velair berechnet die aktuelle Temperaturdifferenz für den nächsten geplanten Temperaturblock.

Bei einem `heat_cool`-Bereich bezeichnet „Zieltemperatur“ im Folgenden die untere Grenze beim Heizen und die obere Grenze beim Kühlen.

Beim Heizen:

```text
delta = target temperature - current temperature
```

Beim Kühlen:

```text
delta = current temperature - target temperature
```

Ist die Differenz kleiner als die minimale Temperaturdifferenz, behält Velair die normale Blockzeit bei und startet nicht früher.

<a id="schedule-boundaries-and-other-climates"></a>

## Zeitplangrenzen und andere Klimageräte

Ein vorgezogener Start im Wochenplan darf den unmittelbar vorhergehenden wirksamen Zeitplanblock desselben Klimageräts weder erreichen noch überschreiten, auch keinen `Off`-Block. Erreicht oder überschreitet das berechnete Zeitfenster diese Grenze, behält Velair die normale Komfortzeit bei. Bei `Off` um `19:00` und `heat` um `20:00` entfällt beispielsweise ein berechneter Start um `18:00`: `Off` wird um `19:00` angewendet und das Heizen beginnt um `20:00`. Ein `Off`-Block um `22:00` am Vorabend verhindert keinen Start um `05:35` für `07:00`, wenn dazwischen kein weiterer Block liegt. Dies gilt auch für Kühlung und native `heat_cool`-Bereiche; Ankunftsprognosen für die geplante Rückkehr bleiben unverändert.

Ein bereits vorkonditionierendes Klimagerät verzögert keine Blöcke oder vorgezogenen Starts anderer Geräte. Wird während der Verarbeitung einer Aktion eine weitere Übergangszeit überschritten, ermittelt Velair das aktuell zulässige Ziel für das betroffene Gerät, statt veraltete Befehle erneut auszuführen. Pausen, Boosts, manuelle Anpassung, deaktivierte Zonen und externe Zeitplanausführung bestimmen weiterhin, ob ein Ziel übermittelt werden darf. Diese Nachholung gilt bei laufendem Scheduler; das konfigurierte Anwendungsverhalten beim Start bleibt unverändert.

<a id="initial-model-example"></a>
## Beispiel für das Anfangsmodell

Solange nicht genügend lokale Verlaufsdaten vorliegen, verwendet Velair das Anfangsmodell:

```text
lead = Minimum start + Initial model min/degree * temperature delta
```

Ausgangslage:

- Geplanter Block: `21 °C`, `heat`, Zielzeit `07:00`
- Raumtemperatur: `18 °C`
- Minimaler Vorlauf: `10 min`
- Anfangsmodell: `25 min/°C` oder entsprechend `13.89 min/°F`
- Maximaler Vorlauf: `24 h`

Berechnung:

```text
delta = 21 - 18 = 3 °C
lead = 10 + 25 * 3 = 85 min
start = 07:00 - 85 min = 05:35
```

Velair wendet das geplante Ziel um `05:35` an und behält `07:00` als sichtbare Komfortzielzeit bei.

<a id="heating-with-learned-history"></a>
## Heizen mit gelerntem Verlauf

Nach genügend erfolgreichen Beobachtungen kann Velair ähnliche lokale Verlaufsdaten statt des Anfangsmodells verwenden.

Ausgangslage:

- Geplanter Block: `21 °C`, `heat`, Zielzeit `07:00`
- Aktuelle Raumtemperatur: `18.5 °C`
- Aktuelle Differenz: `2.5 °C`
- Ähnliche abgeschlossene Beobachtungen:

```text
A: 2.0 °C in 50 min -> 25.0 min/°C
B: 2.4 °C in 72 min -> 30.0 min/°C
C: 2.8 °C in 84 min -> 30.0 min/°C
D: 2.1 °C in 63 min -> 30.0 min/°C
E: 2.6 °C in 91 min -> 35.0 min/°C
```

Bei einem Komfortperzentil von `80` wählt Velair einen konservativen Wert aus den ähnlichen abgeschlossenen Beispielen. Hier sind das `35.0 min/°C`.

```text
lead = 2.5 * 35 = 87.5 min
```

Velair rundet den endgültigen Vorlauf auf die nächste unterstützte Zeitplanerminute auf, statt unter den berechneten Wert abzurunden.

```text
87.5 min -> 90 min
start = 07:00 - 90 min = 05:30
```

<a id="cooling-example"></a>
## Beispiel für das Kühlen

Ausgangslage:

- Geplanter Block: `23 °C`, `cool`, Zielzeit `22:00`
- Raumtemperatur: `27 °C`
- Minimaler Vorlauf: `10 min`
- Anfangsmodell: `25 min/°C`
- Maximaler Vorlauf: `24 h`

Berechnung:

```text
delta = 27 - 23 = 4 °C
lead = 10 + 25 * 4 = 110 min
start = 22:00 - 110 min = 20:10
```

Liegen später genügend Kühlbeobachtungen vor, verwendet Velair ausschließlich den Kühlverlauf. Heiz- und Kühlverläufe werden nicht gemischt, weil derselbe Raum und dasselbe Gerät beim Heizen und Kühlen unterschiedliche Änderungsraten haben können.

<a id="partial-and-invalid-observations"></a>
## Teilbeobachtungen und ungültige Beobachtungen

Nach Vorkonditionierungsversuchen speichert Velair kompakte lokale Beobachtungen.

Abgeschlossene Beobachtungen sind hilfreiche Beispiele, bei denen der Raum die Zielschwelle rechtzeitig erreicht hat.

Teilbeobachtungen bedeuten, dass Velair frühzeitig gestartet hat, der Raum die Zielschwelle jedoch bis zur geplanten Komfortzeit nicht erreicht hat. Sie dienen als Untergrenzen: Velair weiß, dass mehr Zeit erforderlich war, erfindet aber keine Abschlusszeit.

Ungültige Beobachtungen werden ausschließlich zur Diagnose aufbewahrt und beeinflussen das Modell nicht. Beispiele sind winzige Differenzen, unmögliche Zeitdauern, unterbrochene Sitzungen, fehlende Temperaturen, temporäre Anpassungen, Pausen oder Zustandsänderungen des Zeitplaners.

Folgen auf ältere Teilbeobachtungen genügend abgeschlossene Beobachtungen, die ein inzwischen zuverlässiges Erreichen des Ziels belegen, erzwingen die älteren Teilbeobachtungen keine höhere Vorhersage mehr.

<a id="outdoor-temperature-sensor"></a>
## Außentemperatursensor

Der Außentemperatursensor ist optional.

Ist er konfiguriert, speichert Velair seinen Wert als lokalen Kontext zu den Beobachtungen und vergleicht später die aktuellen Bedingungen mit ähnlichen früheren Beobachtungen. Es werden keine Wetterdienste aufgerufen; eine Internetverbindung ist nicht erforderlich, und das Anfangsmodell erhält keinen festen Zuschlag.

Ist der Außensensor beim Speichern eines Beispiels nicht verfügbar, speichert Velair die Beobachtung einfach ohne diesen Kontext.

<a id="room-assist-interaction"></a>
## Zusammenspiel mit Room Assist

Standardmäßig verwendet die adaptive Vorkonditionierung `current_temperature` der Klimaentität.

Ist die Raumsensorunterstützung für das Klimagerät aktiviert und ein Raumsensor ausgewählt, verwendet die adaptive Vorkonditionierung dessen Messwert als wirksame Raumtemperatur für Entscheidungen und Lernen.

Das ist bei Heizkörperthermostaten oder Thermostaten hilfreich, deren eingebauter Sensor zu nahe an einem Heizkörper, Luftauslass oder einer anderen lokalen Wärmequelle sitzt. Die geräteseitige Wirkung ist unter [Room Assist](room-assist.de.md) beschrieben.

<a id="automation-events"></a>
## Automationsereignisse

Velair verwendet für diesen Ablauf drei `velair_event`-Ereignisse:

- `preconditioning_plan_updated`, wenn ein berechneter Plan entsteht oder sich ändert;
- `preconditioning_plan_cancelled`, wenn ein veröffentlichter Plan nicht mehr gilt;
- `preconditioning_observation_recorded`, nachdem ein Lernbeispiel gespeichert wurde.

Die genauen Auslöseregeln und vollständigen Beispieldaten findest du unter [Automationsereignisse](automation-events.de.md#preconditioning-plan-updated).

Beispiel für einen Automationsauslöser:

```yaml
trigger:
  - platform: event
    event_type: velair_event
    event_data:
      event: preconditioning_plan_updated
      entity_id: climate.living_room
```

<a id="when-velair-does-nothing"></a>
## Wann Velair nicht eingreift

Die adaptive Vorkonditionierung startet nicht frühzeitig, wenn:

- die Vorkonditionierung für das Klimagerät deaktiviert ist;
- der Zeitplaner nicht im automatischen Modus läuft;
- die Zone pausiert ist oder eine temporäre Anpassung aktiv ist;
- der nächste Block `Off` ist;
- das Klimagerät die erforderliche Heiz- oder Kühlrichtung nicht unterstützt;
- die Temperaturdifferenz kleiner als die minimale Temperaturdifferenz ist;
- die benötigte Temperatur nicht verfügbar oder nicht numerisch ist.

<a id="lovelace"></a>
## Lovelace

Die Ansicht für Vorkonditionierung ist als Lovelace-Karte verfügbar:

```yaml
type: custom:velair-card
view: preconditioning
entities:
  - climate.living_room
```

Die Lovelace-Karte verwendet dieselbe Backend-Konfiguration wie das Hauptpanel von Velair.

<a id="technical-details"></a>
## Technische Details

Entwicklerinformationen zu Speicherung, Lernalgorithmus, Teilbeobachtungen, Ähnlichkeitsgewichtung und API-Ausgabe findest du unter [Interna der adaptiven Vorkonditionierung](../developer/adaptive-preconditioning.md).
