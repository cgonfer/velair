<a id="seasonal-climate-selection"></a>
# Saisonale Auswahl der Klimasteuerung
<!-- velair-docs:start -->
Übersetzungen: [Englisches Original](seasonal-climate-selection.md) · [Español](seasonal-climate-selection.es.md) · [Français](seasonal-climate-selection.fr.md) · [Deutsch](seasonal-climate-selection.de.md) · [Italiano](seasonal-climate-selection.it.md) · [Nederlands](seasonal-climate-selection.nl.md) · [Polski](seasonal-climate-selection.pl.md) · [Português (Brasil)](seasonal-climate-selection.pt-br.md) · [Português (Portugal)](seasonal-climate-selection.pt-pt.md) · [Русский](seasonal-climate-selection.ru.md) · [Übersetzungsstatus](../../translation-status.md)

<details>
<summary>Status dieser Übersetzung</summary>

| Angabe | Status |
| --- | --- |
| Referenzversion | 1.9.0-beta.4 |
| Letzte Synchronisierung | 2026-10-21 |
| Sprachliche Prüfung | KI-gestützte Übersetzung |
| Vergleich mit dem Original | Mit dem englischen Original synchronisiert. |

</details>

---
<!-- velair-docs:end -->

Führe gewählte Aktionen einmal aus, nachdem ein Temperatursensor in einen neuen Winter-, Mildwetter- oder Sommerbereich wechselt und dort für eine konfigurierbare Dauer bleibt. Wähle Modi für Winter, mildes Wetter oder Sommer, ohne Zeitpläne zu duplizieren oder Wetterregeln in Velair einzubauen. Ungültige Sensorwerte erzeugen sofort eine Home-Assistant-Benachrichtigung.

<p>
  <a href="https://my.home-assistant.io/redirect/blueprint_import/?blueprint_url=https%3A%2F%2Fraw.githubusercontent.com%2Fcgonfer%2Fvelair%2Fmain%2Fblueprints%2Fautomation%2Fvelair%2Fseasonal_climate_selection.yaml"><img src="https://my.home-assistant.io/badges/blueprint_import.svg" alt="Home Assistant öffnen und den Blueprint für saisonale Klimasteuerung importieren" height="28"></a>
  <a href="https://raw.githubusercontent.com/cgonfer/velair/main/blueprints/automation/velair/seasonal_climate_selection.yaml"><img src="https://img.shields.io/badge/YAML_source-View-24292F?style=for-the-badge&amp;logo=github&amp;logoColor=white" alt="YAML-Quelldatei für saisonale Klimasteuerung öffnen"></a>
</p>

[Änderungsverlauf](../../../blueprints/changelogs/seasonal_climate_selection.md) · [Zurück zum Blueprint-Index](../blueprints.de.md)

<a id="when-to-use-it"></a>
## Wann der Blueprint sinnvoll ist

Verwende diesen Blueprint, wenn Home Assistant bereits eine vorhergesagte Tageshöchsttemperatur, eine Außenmessung oder eine Durchschnittstemperatur als einzelnen numerischen Temperatursensor bereitstellt. Er wählt die auszuführenden Aktionen; Velair bleibt für Zeitpläne, Presets, Vorkonditionierung und Geräteübermittlung zuständig.

Sowohl ein Tagesvorhersagesensor als auch ein häufig wechselnder Außensensor können einen saisonalen Bereich bestätigen. Änderungen innerhalb dieses Bereichs behalten die ursprüngliche Frist bei. Aktionen laufen einmal pro Eintritt; spätere Aktualisierungen im selben Bereich wählen daher nicht wiederholt einen Modus.

<a id="requirements"></a>
## Voraussetzungen

- Blueprint-Version 1.1.0 und Home Assistant ab 2024.6.0.
- Ein numerischer Sensor mit Geräteklasse Temperatur und angegebener Einheit °C oder °F.
- Velair ist nur für Aktionen mit dessen Entitäten oder Diensten erforderlich. Normale Skripte und andere Home-Assistant-Aktionen funktionieren ohne Velair.
- Bereite den Vorhersagesensor separat vor, wenn dein Wetteranbieter Vorhersagen statt eines numerischen Sensors bereitstellt. Dieser Blueprint ruft keine Vorhersagen ab.

Modi und die native Velair-Modusauswahl sind ab Velair 1.6.0 verfügbar. Gemeinsame Presets und verknüpfte Vorlagen sind optional: Die saisonale Auswahl kann auch Modi aus unabhängigen Zeitplänen wählen.

<a id="configuration"></a>
## Konfiguration

| Feld | Zweck |
|---|---|
| Temperature sensor | Der vorhandene zu überwachende Sensor |
| Temperature unit for thresholds | °C oder °F; Messwerte werden für den Vergleich konvertiert |
| Winter threshold | Werte unterhalb dieser Schwelle führen Winteraktionen aus; Standard 20 |
| Summer threshold | Werte oberhalb dieser Schwelle führen Sommeraktionen aus; Standard 27 |
| Winter / Mild-weather / Summer actions | Normale Home-Assistant-Aktionsfolgen; anfangs leer |
| Range confirmation delay | Wie lange die Temperatur im neuen saisonalen Bereich bleiben muss; Standard 30 Minuten |
| Language for diagnostic notifications | Jede von Velair unterstützte Sprache für dauerhafte Sensor- und Konfigurationswarnungen; standardmäßig Englisch |

Die Winterschwelle muss niedriger als die Sommerschwelle sein und die Verzögerung positiv. Die Schwellenzahlen ändern sich bei Auswahl von Fahrenheit nicht automatisch: Trage die gewünschten Fahrenheit-Schwellen selbst ein.

Diese beiden Auswahlen sind ausdrücklich nötig, da Home Assistant seine globalen Temperatureinheiten- und Spracheinstellungen Blueprint-Templates nicht bereitstellt. Auch die Browsersprache des Benutzers ist keine Automationseinstellung. Die angegebene Sensoreinheit wird automatisch gelesen und in die gewählte Schwelleneinheit umgerechnet; Diagnosebenachrichtigungen verwenden die hier gewählte Sprache.

Die Sprachauswahl verändert nur den Text der Diagnosebenachrichtigungen. Beschriftungen und Beschreibungen des Blueprint-Formulars bleiben Englisch; das Home-Assistant-Konfigurationsformular wird nicht übersetzt.

Eine leere Aktionsfolge tut nichts. Sie schaltet kein Klimagerät aus, hält Velair nicht an und wählt nicht Standard.

<a id="example"></a>
## Beispiel

<a id="daily-maximum-and-three-modes"></a>
### Tagesmaximum und drei Modi

Erstelle in Velair die Modi Invierno, Entretiempo und Verano. Ordne Invierno und Verano ihren jeweiligen Profilen zu. Soll mildes Wetter die Klimatisierung deaktivieren, konfiguriere Entretiempo mit einem Profil, dessen relevante Zonen **Pausieren → Klimagerät ausschalten** verwenden.

Füge in jeder Blueprint-Aktionsfolge die Home-Assistant-Aktion **Select: Select** hinzu, wähle die sichtbare Velair-Modusentität und dann deren Option im Editor. Gehe nicht davon aus, dass deine Entität die folgende Beispiel-ID hat.

```yaml
service: select.select_option
target:
  entity_id: select.velair_mode
data:
  option: Invierno
```

Bei Schwellen von 20 und 27 °C führt ein bei 18 °C in den Winterbereich wechselndes Tagesmaximum nach 30 Minuten durchgehend unter 20 °C die Winteraktionen aus. Ein Wechsel auf 19 °C während der Wartezeit behält dieselbe Frist bei. Ein anschließender Wechsel auf 23 °C führt die Aktionen für mildes Wetter aus; 30 °C führt Sommeraktionen aus. Genau 20 oder 27 °C zählt zu mildem Wetter. Aktualisierungen innerhalb eines bereits bestätigten Bereichs wiederholen dessen Aktionen nicht. Das Verlassen und erneute Betreten eines Bereichs startet eine vollständige neue Wartezeit, auch wenn der zwischenzeitliche Bereich zu kurz für die Ausführung seiner Aktionen war.

<a id="shared-hours-different-indoor-temperatures"></a>
### Gemeinsame Zeiten, unterschiedliche Innentemperaturen

Verknüpfe die Profilzeitpläne von Invierno und Verano mit derselben Tagesvorlage über **Nur Zeiten**. Weise Winter-Presets wie Heizen mit 21 °C und Sommer-Presets wie Kühlen mit 25 °C zu. Das Verschieben des 07:00-Zeitpunkts der Vorlage verändert beide Zeitpläne; die Modusauswahl wählt die zugehörigen Ziele. Der Blueprint bearbeitet weder Presets noch Vorlage. Siehe [praktische Beispiele für verknüpfte Zeitpläne](../linked-schedule-examples.de.md).

<a id="average-temperature-and-fahrenheit"></a>
### Durchschnittstemperatur und Fahrenheit

Ein Durchschnittssensor kann sich mehrmals pro Stunde ändern. Bei zehn Minuten Verzögerung führt ein Wechsel in den Sommerbereich mit 28 °C um 10:00 und eine Änderung auf 29 °C um 10:07 die Sommeraktionen weiterhin um 10:10 aus. Fällt der Messwert um 10:07 auf 27 °C, wird die Sommerbestätigung abgebrochen und stattdessen die Bestätigung für mildes Wetter gestartet.

Ein Fahrenheit-Sensor kann Celsius-Schwellen verwenden, da der Messwert konvertiert wird. Alternativ wähle °F und trage etwa 68 und 80.6 °F als Schwellen ein, entsprechend 20 und 27 °C. Ein Wert von 77 °F wählt dann die Aktionen für mildes Wetter.

<a id="alternative-script-or-service"></a>
### Alternatives Skript oder alternativer Dienst

Jeder Zweig akzeptiert normale Home-Assistant-Aktionen. Beispielsweise kannst du im Sommerzweig ein Haushaltsskript ausführen:

```yaml
service: script.turn_on
target:
  entity_id: script.summer_climate_routine
```

Auch die direkte Profilaktivierung mit `velair.activate_profile` und der stabilen Profil-ID ist möglich. Zum Ändern gemeinsamer Einstellungen statt der Modusauswahl siehe [Automationen mit Presets](../preset-automations.de.md). Beachte alle Verwendungen eines gemeinsamen Presets vor einer Änderung.

<a id="how-it-works"></a>
## Funktionsweise

Native Home-Assistant-Auslöser ordnen jeden Temperaturmesswert nach der Umrechnung in die Schwelleneinheit ein. Der Eintritt in den Winter-, Mildwetter- oder Sommerbereich startet dessen Bestätigungsverzögerung. Messwerte innerhalb desselben Bereichs behalten die ursprüngliche Frist bei; reine Attribut- oder Formatänderungen starten sie nicht neu und wiederholen keine Aktionen.

Das Verlassen eines Bereichs bricht dessen ausstehende Bestätigung sofort ab. Ein kurzer Austritt mit Rückkehr startet eine vollständige neue Wartezeit, auch wenn der andere Bereich nie Zeit hatte, seine Aktionen auszuführen. Exakte Schwellenwerte zählen zu mildem Wetter. Gleichwertige Celsius-/Fahrenheit-Messwerte bleiben im selben Bereich.

Beim Start prüft Home Assistant nur die Diagnose. Es wählt keinen saisonalen Modus. Ausstehende Timer überstehen weder einen Neustart noch ein Neuladen der Automation oder Deaktivieren und erneutes Aktivieren. Der beim Einrichten der Auslöser vorhandene Bereich gilt als Ausgangsbasis: Spätere Änderungen innerhalb dieses Bereichs wählen ihn nicht aus. Ein Bereichswechsel oder die Wiederherstellung gültiger Messwerte startet die Bestätigung. Es gibt weder regelmäßige noch tägliche Auslöser und keinen dauerhaft gespeicherten Helfer für die letzte Auswahl. Fehlte die Entität beim Einrichten der Auslöser, legt ihr erstes Erscheinen den Anfangsbereich fest, ohne ihn auszuwählen.

Die Sensorprüfung läuft getrennt von der saisonalen Bestätigung. Eine fehlende Entität, `unknown`, `unavailable`, ein nicht endlicher oder nichtnumerischer Wert oder eine nicht unterstützte Einheit erstellt sofort eine dauerhafte Benachrichtigung für die Automation in der gewählten Sprache. Sie nennt Automation und Sensor und erklärt die Aussetzung saisonaler Aktionen. Ungültige Konfiguration erzeugt eine separate Benachrichtigung.

Ungültige Messwerte brechen eine ausstehende Wartezeit ab. Die Wiederherstellung nach einem nichtnumerischen Zustand oder einer nicht unterstützten Einheit startet eine vollständige neue Bestätigungsverzögerung. Damit beginnt ein neuer durchgehender Zeitraum gültiger Messwerte; die Wiederherstellung kann dieselben saisonalen Aktionen daher erneut ausführen. Sie entfernt auch die Sensorwarnung.

Wird ein Sensor beispielsweise um 09:00 nicht verfügbar, erfolgt die Warnung sofort. Die Wiederherstellung auf 25 °C um 09:10 erlaubt Aktionen für mildes Wetter um 09:40, sofern die Temperatur während der gesamten Zeit zwischen den Schwellen bleibt, auch wenn sich der genaue Wert ändert.

<a id="safety-and-precedence"></a>
## Sicherheit und Vorrang

Die Auswahl eines Velair-Modus oder -Profils verwendet dessen Blockrichtlinien. **Nur Temperatur** aktualisiert den Sollwert ohne Anforderung eines HVAC-Moduswechsels. Verwende explizite Blöcke mit **Heizen** oder **Kühlen**, wenn die Saisonauswahl das Gerät starten soll. Die Richtlinie unterdrückt keine direkten HVAC-Aktionen im Blueprint.

Solange der Sensor ungültig ist, trifft der Blueprint keine neue saisonale Auswahl. Er schaltet Geräte nicht automatisch aus. Der zuvor gewählte Modus und sein Zeitplan bleiben bestehen. Reagiere auf die Benachrichtigung, wenn dieses Verhalten für dein Zuhause ungeeignet ist.

Konfigurierte Aktionen verwenden die normalen Home-Assistant-Regeln und Ausführungsspuren. Ein Aktionsfehler macht vorherige Aktionen nicht rückgängig. Der Blueprint kann nicht allgemein überprüfen, ob eine beliebige Aktion die gewünschte Routine ausgewählt oder ein physisches Gerät erreicht hat.

Ein neu bestätigter saisonaler Bereich kann einen manuell ausgewählten Abwesenheitsmodus ersetzen. Koordiniere saisonale und Anwesenheitsautomationen, statt beide konkurrierende Modi wählen zu lassen. Ein Haushaltsskript kann beispielsweise bei leerem Zuhause einen Abwesenheitsmodus und den saisonalen Anwesenheitsmodus nur bei erlaubender Anwesenheit wählen.

Das bestehende Modus-/Profilverhalten von Velair gilt weiterhin, einschließlich Pausenvorrang und Beendigung temporärer Anpassungen in betroffenen Zonen. Die Vorkonditionierung wird anhand des wirksamen, durch die Aktion gewählten Zeitplans neu berechnet. Sie kann eine saisonale Auswahl nicht vorhersehen, bevor diese erfolgt.

<a id="limitations"></a>
## Grenzen

- Die Bestätigung erfordert den durchgehenden Verbleib in einem saisonalen Bereich; wiederholte Grenzübertritte können Aktionen unbegrenzt verschieben.
- Keine automatische saisonale Startaktion, tägliche Planung, regelmäßige Abfrage, Speicherung ausstehender Timer, zusätzliche 24-°C-Freigabe oder verzögertes Ausschalten.
- Löschen und Neuerstellen des Sensors bricht die Bestätigung ab. Sein erneutes Erscheinen legt eine Ausgangsbasis fest, ohne eine Saison auszuwählen; ein nachfolgender Bereichswechsel ist erforderlich. Dies vermeidet uneinheitliches natives Wiederaktivieren der Home-Assistant-Auslöser nach dem Entfernen einer Entität. Das gilt auch für eine beim Laden der Automation fehlende Entität. Normale Wiederherstellung nach `unknown`/`unavailable` oder einer ungültigen Einheit startet eine neue Bestätigung.
- Benachrichtigungen erkennen keinen Sensor, der unbemerkt nicht mehr aktualisiert und dabei eine gültige Zahl behält. Eine Überwachung der Quellenaktualität muss bei Bedarf separat bereitgestellt werden.
- Es gibt keine Hysterese; die Bestätigungsverzögerung filtert kurze Bereichswechsel. Aktionen laufen einmal pro Bereichseintritt statt einmal pro neuem Messwert.
- Parallele Ausführung ist begrenzt. Lange Benutzeraktionsfolgen können Plätze belegen; halte Aktionen kurz oder übergib Aufgaben an Skripte.
- Eine bereits gestartete Folge wird durch einen späteren Messwert nicht beendet. Prüfungen schützen ihren Start, nicht jede benutzerdefinierte Aktion.
- Nach dem Umbenennen der Automation kann die frühere Diagnosebenachrichtigung für manuelles Entfernen bestehen bleiben. Umbenannte oder gelöschte Modusoptionen müssen in konfigurierten Aktionen aktualisiert werden.

<a id="troubleshooting"></a>
## Fehlerbehebung

- Wird nichts ausgeführt, prüfe, ob der Sensor in einen anderen saisonalen Bereich gewechselt ist oder nach einem ungültigen Wert oder einer ungültigen Einheit wieder gültig wurde und anschließend die gesamte Verzögerung im Bereich blieb. Start und Neuladen beginnen keine Auswahl; Aktualisierungen im selben Bereich wiederholen sie nicht.
- Erscheint eine Warnung, prüfe den genannten Sensor, Zahlenzustand und `unit_of_measurement`. Unbekannte Einheiten werden niemals geraten.
- Endet ein Timer nie, prüfe den Sensorverlauf auf Grenzübertritte oder ungültige Messwerte. Passe die Schwellen oder die positive Verzögerung an deine Quelle an.
- Läuft der falsche Zweig, prüfe die gewählte Schwelleneinheit und beide Zahlenwerte.
- Läuft das Gerät bei mildem Wetter weiter, konfiguriere einen tatsächlichen Modus mit Pause und Ausschalten. Eine leere Aktionsliste ist kein Ausschaltbefehl.
- Wird ein Modus nicht ausgewählt, teste seine Aktion manuell und prüfe die Automationsspur. Wähle den aktuellen Optionsnamen im Home-Assistant-Editor.
- Ist eine Import-URL vor Veröffentlichung nicht verfügbar, verwende zum Testen die YAML-Datei aus dem ausgecheckten Repository. Die öffentlichen Links funktionieren, sobald die Datei auf `main` veröffentlicht ist.

<a id="updating-and-customizing"></a>
## Aktualisieren und anpassen

Importiere den Blueprint ausdrücklich; Installation oder Aktualisierung von Velair über HACS installiert ihn nicht. Importiere dieselbe fortlaufende `main`-URL für kompatible Aktualisierungen erneut. Version 1.1.0 ersetzt das Zeitverhalten der ersten Beta unter derselben URL mit denselben Eingabenamen und ohne Option für das alte Zeitverhalten. Importiere erneut und lade betroffene Automationen neu, um die Bereichsbestätigung zu verwenden. Andere Blueprints behalten ihre veröffentlichten Kompatibilitätsverträge.

Die erzeugte Automation gehört Home Assistant. Velair migriert weder Automationen noch `.storage`. Verwende **Kontrolle übernehmen** für andere Logik und beachte, dass die unabhängige Automation dann keine Blueprint-Aktualisierungen mehr erhält. Gemeinsame Verteilungs- und Aktualisierungsregeln findest du im [Blueprint-Katalog](../blueprints.de.md).
