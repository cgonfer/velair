<a id="seasonal-climate-selection"></a>
# Saisonale Auswahl der Klimasteuerung
<!-- velair-docs:start -->
Übersetzungen: [Englisches Original](seasonal-climate-selection.md) · [Español](seasonal-climate-selection.es.md) · [Français](seasonal-climate-selection.fr.md) · [Deutsch](seasonal-climate-selection.de.md) · [Italiano](seasonal-climate-selection.it.md) · [Nederlands](seasonal-climate-selection.nl.md) · [Polski](seasonal-climate-selection.pl.md) · [Português (Brasil)](seasonal-climate-selection.pt-br.md) · [Português (Portugal)](seasonal-climate-selection.pt-pt.md) · [Русский](seasonal-climate-selection.ru.md) · [Übersetzungsstatus](../../translation-status.md)

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

Führe gewählte Aktionen aus, nachdem ein Temperatursensor seinen Wert geändert und für eine konfigurierbare Dauer beibehalten hat. Wähle Modi für Winter, mildes Wetter oder Sommer, ohne Zeitpläne zu duplizieren oder Wetterregeln in Velair einzubauen. Ungültige Sensorwerte erzeugen sofort eine Home-Assistant-Benachrichtigung.

<p>
  <a href="https://my.home-assistant.io/redirect/blueprint_import/?blueprint_url=https%3A%2F%2Fraw.githubusercontent.com%2Fcgonfer%2Fvelair%2Fmain%2Fblueprints%2Fautomation%2Fvelair%2Fseasonal_climate_selection.yaml"><img src="https://my.home-assistant.io/badges/blueprint_import.svg" alt="Home Assistant öffnen und den Blueprint für saisonale Klimasteuerung importieren" height="28"></a>
  <a href="https://raw.githubusercontent.com/cgonfer/velair/main/blueprints/automation/velair/seasonal_climate_selection.yaml"><img src="https://img.shields.io/badge/YAML_source-View-24292F?style=for-the-badge&amp;logo=github&amp;logoColor=white" alt="YAML-Quelldatei für saisonale Klimasteuerung öffnen"></a>
</p>

[Änderungsverlauf](../../../blueprints/changelogs/seasonal_climate_selection.md) · [Zurück zum Blueprint-Index](../blueprints.de.md)

<a id="when-to-use-it"></a>
## Wann der Blueprint sinnvoll ist

Verwende diesen Blueprint, wenn Home Assistant bereits eine vorhergesagte Tageshöchsttemperatur, eine Außenmessung oder eine Durchschnittstemperatur als einzelnen numerischen Temperatursensor bereitstellt. Er wählt die auszuführenden Aktionen; Velair bleibt für Zeitpläne, Presets, Vorkonditionierung und Geräteübermittlung zuständig.

Bei einem einmal täglich aktualisierten Sensor kann eine stabile Aktualisierung die Tagesroutine wählen. Bei häufig wechselnden Außen- oder Durchschnittssensoren musst du die Verzögerung sorgfältig wählen: Jeder neue Wert startet die Wartezeit neu. Ein alle fünf Minuten aktualisierter Sensor beendet möglicherweise nie eine Wartezeit von 30 Minuten.

<a id="requirements"></a>
## Voraussetzungen

- Blueprint-Version 1.0.0 und Home Assistant ab 2024.6.0.
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
| Stability delay | Wie lange die neue numerische Temperatur unverändert bleiben muss; Standard 30 Minuten |
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

Bei Schwellen von 20 und 27 °C führt ein auf 18 °C wechselndes Tagesmaximum nach 30 unveränderten Minuten die Winteraktionen aus. Ein anschließender Wechsel auf 23 °C führt die Aktionen für mildes Wetter aus; 30 °C führt Sommeraktionen aus. Genau 20 oder 27 °C zählt zu mildem Wetter. Jeder geänderte Wert kann auslösen, einschließlich 18 → 19 °C innerhalb des Winterbereichs.

<a id="shared-hours-different-indoor-temperatures"></a>
### Gemeinsame Zeiten, unterschiedliche Innentemperaturen

Verknüpfe die Profilzeitpläne von Invierno und Verano mit derselben Tagesvorlage über **Nur Zeiten**. Weise Winter-Presets wie Heizen mit 21 °C und Sommer-Presets wie Kühlen mit 25 °C zu. Das Verschieben des 07:00-Zeitpunkts der Vorlage verändert beide Zeitpläne; die Modusauswahl wählt die zugehörigen Ziele. Der Blueprint bearbeitet weder Presets noch Vorlage. Siehe [praktische Beispiele für verknüpfte Zeitpläne](../linked-schedule-examples.de.md).

<a id="average-temperature-and-fahrenheit"></a>
### Durchschnittstemperatur und Fahrenheit

Ein Durchschnittssensor kann sich mehrmals pro Stunde ändern. Bei zehn Minuten Verzögerung verschieben Aktualisierungen um 10:00 und 10:07 die Entscheidung auf 10:17, sofern kein weiterer Wert eintrifft. Ändert er sich weiterhin vor Ablauf von zehn Minuten, laufen keine saisonalen Aktionen.

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

Ein Zustandsauslöser erkennt eine geänderte numerische Temperatur. Danach prüft die native unterbrechbare Wartefunktion von Home Assistant, ob sie für die konfigurierte Verzögerung stabil bleibt. Eine echte Zahlenänderung unterbricht die ausstehende Entscheidung und beginnt neu, auch bei Rückkehr zu einem früheren Wert: `21 → 22 → 21` startet beim letzten 21 eine neue Verzögerung. Eine reine Formatänderung wie `21` zu `21.0` startet keine neue Entscheidung und unterbricht keine laufende Wartezeit. Reine Attributänderungen starten keine saisonalen Aktionen. Vor Beginn der Aktionen prüft der Blueprint den aktuellen Zahlenwert, die Einheit, Schwellen, Verzögerung und die ununterbrochene Wartezeit erneut.

Ein ungültiger Messwert oder eine ungültige Einheit unterbricht sofort eine ausstehende Entscheidung, auch wenn sich nur das Einheitenattribut ändert. Alleiniges Wiederherstellen der Einheit entfernt den Diagnosehinweis, wählt aber keine Saison; eine weitere numerische Zustandsänderung ist erforderlich. Der Wechsel von einem ungültigen Zahlenzustand wie `unavailable` zu einer gültigen Zahl startet eine neue Verzögerung.

Beim Start prüft Home Assistant nur die Diagnose. Es wählt keinen saisonalen Modus. Ausstehende Timer überstehen keinen Neustart und kein Neuladen der Automation; anschließend ist eine weitere Sensorzustandsänderung erforderlich. Es gibt weder regelmäßige noch tägliche Auslöser und keinen Helfer, der die letzte Einordnung speichert.

Fehlt die ausgewählte Sensorentität anfangs und erscheint später mit einem gültigen Messwert, zählt dieser erste Wert als Wiederherstellung und startet die vollständige Stabilitätswartezeit. Dasselbe gilt für einen entfernten und neu erstellten Sensor. Es handelt sich um einen Sensorübergang nach dem Start, nicht um eine saisonale Aktion durch das Startereignis selbst.

Die Sensorprüfung läuft getrennt von der saisonalen Wartezeit. Eine fehlende Entität, `unknown`, `unavailable`, ein nicht endlicher oder nichtnumerischer Wert oder eine nicht unterstützte Einheit erstellt sofort eine dauerhafte Benachrichtigung für die Automation in der gewählten Sprache. Sie nennt Automation und Sensor und erklärt die Aussetzung saisonaler Aktionen. Wiederherstellung entfernt die Sensorwarnung. Wiederherstellung eines gültigen Zahlenzustands startet eine neue Stabilitätswartezeit; eine reine Einheitenwiederherstellung aktualisiert nur die Diagnose. Ungültige Konfiguration erzeugt eine separate Benachrichtigung.

Wird ein Sensor beispielsweise um 09:00 nicht verfügbar, erfolgt die Warnung sofort, nicht erst um 09:30. Die Wiederherstellung auf 25 °C um 09:10 erlaubt Aktionen für mildes Wetter um 09:40, sofern der Wert unverändert bleibt.

<a id="safety-and-precedence"></a>
## Sicherheit und Vorrang

Die Auswahl eines Velair-Modus oder -Profils verwendet dessen Blockrichtlinien. **Nur Temperatur** aktualisiert den Sollwert ohne Anforderung eines HVAC-Moduswechsels. Verwende explizite Blöcke mit **Heizen** oder **Kühlen**, wenn die Saisonauswahl das Gerät starten soll. Die Richtlinie unterdrückt keine direkten HVAC-Aktionen im Blueprint.

Solange der Sensor ungültig ist, trifft der Blueprint keine neue saisonale Auswahl. Er schaltet Geräte nicht automatisch aus. Der zuvor gewählte Modus und sein Zeitplan bleiben bestehen. Reagiere auf die Benachrichtigung, wenn dieses Verhalten für dein Zuhause ungeeignet ist.

Konfigurierte Aktionen verwenden die normalen Home-Assistant-Regeln und Ausführungsspuren. Ein Aktionsfehler macht vorherige Aktionen nicht rückgängig. Der Blueprint kann nicht allgemein überprüfen, ob eine beliebige Aktion die gewünschte Routine ausgewählt oder ein physisches Gerät erreicht hat.

Ein stabiler neuer Messwert kann einen manuell ausgewählten Abwesenheitsmodus ersetzen. Koordiniere saisonale und Anwesenheitsautomationen, statt beide konkurrierende Modi wählen zu lassen. Ein Haushaltsskript kann beispielsweise bei leerem Zuhause einen Abwesenheitsmodus und den saisonalen Anwesenheitsmodus nur bei erlaubender Anwesenheit wählen.

Das bestehende Modus-/Profilverhalten von Velair gilt weiterhin, einschließlich Pausenvorrang und Beendigung temporärer Anpassungen in betroffenen Zonen. Die Vorkonditionierung wird anhand des wirksamen, durch die Aktion gewählten Zeitplans neu berechnet. Sie kann eine saisonale Auswahl nicht vorhersehen, bevor diese erfolgt.

<a id="limitations"></a>
## Grenzen

- Stabilität bezieht sich auf den Sensorwert, nicht nur auf die Winter-/Mild-/Sommer-Einordnung. Häufig wechselnde Sensoren können die Ausführung unbegrenzt verschieben.
- Keine automatische saisonale Startaktion, tägliche Planung, regelmäßige Abfrage, Speicherung ausstehender Timer, zusätzliche 24-°C-Freigabe oder verzögertes Ausschalten.
- Benachrichtigungen erkennen keinen Sensor, der unbemerkt nicht mehr aktualisiert und dabei eine gültige Zahl behält. Eine Überwachung der Quellenaktualität muss bei Bedarf separat bereitgestellt werden.
- Es gibt keine Hysterese; die Stabilitätsverzögerung filtert Änderungen. Ein neuer stabiler Wert in derselben Kategorie führt seinen Zweig trotzdem aus.
- Parallele Ausführung ist begrenzt. Lange Benutzeraktionsfolgen können Plätze belegen; halte Aktionen kurz oder übergib Aufgaben an Skripte.
- Eine bereits gestartete Folge wird durch einen späteren Messwert nicht beendet. Prüfungen schützen ihren Start, nicht jede benutzerdefinierte Aktion.
- Nach dem Umbenennen der Automation kann die frühere Diagnosebenachrichtigung für manuelles Entfernen bestehen bleiben. Umbenannte oder gelöschte Modusoptionen müssen in konfigurierten Aktionen aktualisiert werden.

<a id="troubleshooting"></a>
## Fehlerbehebung

- Wird nichts ausgeführt, prüfe, ob sich der Wert tatsächlich geändert hat und während der gesamten Verzögerung unverändert blieb. Starten oder Neuladen von Home Assistant beginnt keine saisonale Auswahl.
- Erscheint eine Warnung, prüfe den genannten Sensor, Zahlenzustand und `unit_of_measurement`. Unbekannte Einheiten werden niemals geraten.
- Endet ein Timer nie, prüfe den Sensorverlauf und verkürze die positive Verzögerung oder verwende einen Tagesmaximumsensor.
- Läuft der falsche Zweig, prüfe die gewählte Schwelleneinheit und beide Zahlenwerte.
- Läuft das Gerät bei mildem Wetter weiter, konfiguriere einen tatsächlichen Modus mit Pause und Ausschalten. Eine leere Aktionsliste ist kein Ausschaltbefehl.
- Wird ein Modus nicht ausgewählt, teste seine Aktion manuell und prüfe die Automationsspur. Wähle den aktuellen Optionsnamen im Home-Assistant-Editor.
- Ist eine Import-URL vor Veröffentlichung nicht verfügbar, verwende zum Testen die YAML-Datei aus dem ausgecheckten Repository. Die öffentlichen Links funktionieren, sobald die Datei auf `main` veröffentlicht ist.

<a id="updating-and-customizing"></a>
## Aktualisieren und anpassen

Importiere den Blueprint ausdrücklich; Installation oder Aktualisierung von Velair über HACS installiert ihn nicht. Importiere dieselbe fortlaufende `main`-URL für kompatible Aktualisierungen erneut. Version 1 behält Eingabenamen bei; neue kompatible Eingaben erhalten Standardwerte. Inkompatible Änderungen verwenden einen neuen Dateinamen und eine neue Hauptversion.

Die erzeugte Automation gehört Home Assistant. Velair migriert weder Automationen noch `.storage`. Verwende **Kontrolle übernehmen** für andere Logik und beachte, dass die unabhängige Automation dann keine Blueprint-Aktualisierungen mehr erhält. Gemeinsame Verteilungs- und Aktualisierungsregeln findest du im [Blueprint-Katalog](../blueprints.de.md).
