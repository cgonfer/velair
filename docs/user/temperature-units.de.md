<a id="temperature-units-and-migration"></a>
# Temperatureinheiten und Migration
<!-- velair-docs:start -->
Übersetzungen: [Englisches Original](temperature-units.md) · [Español](temperature-units.es.md) · [Français](temperature-units.fr.md) · [Deutsch](temperature-units.de.md) · [Italiano](temperature-units.it.md) · [Nederlands](temperature-units.nl.md) · [Polski](temperature-units.pl.md) · [Português (Brasil)](temperature-units.pt-br.md) · [Português (Portugal)](temperature-units.pt-pt.md) · [Русский](temperature-units.ru.md) · [Übersetzungsstatus](../translation-status.md)

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

Velair unterstützt Celsius und Fahrenheit und verwendet die in Home Assistant konfigurierte Temperatureinheit. Einen eigenen Einheitenwähler gibt es in Velair nicht. Die erkannte Einheit wird unter **Einstellungen > Temperatureinheit** schreibgeschützt angezeigt; ändern kannst du sie in den Einstellungen des Einheitensystems von Home Assistant.

<a id="new-installations-and-resets"></a>
## Neue Installationen und Zurücksetzen

Bei der Ersteinrichtung erstellt Velair Zeitpläne, integrierte Vorlagen, Komfortgrenzwerte, Room-Assist-Grenzen und Einstellungen zur adaptiven Vorkonditionierung in der von Home Assistant erkannten Einheit. Beim Zurücksetzen von Velair werden diese Standardwerte für die aktuell erkannte Einheit neu erstellt.

Zieltemperaturen werden anhand des Minimums, Maximums und wirksamen Temperaturschritts jedes verwalteten Klimageräts geprüft. Stellt Home Assistant `target_temp_step` bereit, verwendet Velair diesen Wert direkt. Andernfalls zeigen die Einstellungen den wirksamen Ersatzwert: den letzten gültigen, von der Entität gemeldeten Schritt, den gespeicherten manuellen Wert der Zone oder `1`, wenn keiner davon vorliegt. Du kannst ihn auf die tatsächliche Schrittweite des Geräts setzen. Speichern bei fehlendem Attribut löscht die zuvor gemerkte Meldung, ohne Zeitplanregeln zu ändern. Eine spätere gültige Meldung hat wieder Vorrang und wird erneut gespeichert. Eine Entität mit inkonsistenten Angaben kann daher bestehende Zeitpläne mit Dezimalwerten nicht allein dadurch ungültig machen, dass sie das Attribut auslässt.

Das Raster gültiger Zieltemperaturen beginnt bei der vom Klimagerät angegebenen Mindesttemperatur, nicht bei null. Dadurch bleiben die tatsächlichen Sollwerte des Geräts in Celsius und Fahrenheit erhalten, auch wenn dessen Minimum kein genaues Vielfaches der Schrittweite ist.

<a id="existing-stored-data"></a>
## Bereits gespeicherte Daten

Velair speichert temperaturbezogene Einstellungen in der mit den Daten vermerkten Einheit. Ändert sich die Einheit von Home Assistant, werden gespeicherte Zahlen nicht stillschweigend neu interpretiert.

Ist für gespeicherte Daten bereits eine Einheit angegeben und meldet Home Assistant später die andere Einheit, führt Velair folgende Schritte aus:

1. Automatische Zeitplanung und temperaturbezogene Schreibvorgänge werden angehalten.
2. Der aktive Wiederherstellungszustand von Room Assist bleibt erhalten, während dessen Ereignisüberwachung gestoppt wird.
3. Eine dauerhafte Benachrichtigung wird in Home Assistant erstellt.
4. Ausgangs- und Zieleinheit werden in den Velair-Einstellungen angezeigt.
5. Eine ausdrückliche Migration aller gespeicherten temperaturbezogenen Daten wird angeboten.

Führe diese Migration nur aus, wenn alle gespeicherten Werte weiterhin die angezeigte Ausgangseinheit verwenden. Der Vorgang konvertiert Zeitpläne, Vorlagen, aktive und vorherige Übersteuerungsziele, Ersatzwerte für Temperaturschritte, Komfortgrenzwerte, Room-Assist-Einstellungen, die Konfiguration der adaptiven Vorkonditionierung, zuletzt gemeldete Temperaturschritte, Änderungsraten und Lernbeobachtungen. Ziele, die einem bekannten Klimagerät zugeordnet sind, werden an dessen wirksame Schrittweite angepasst, sofern sie verfügbar ist. Andere konvertierte, bearbeitbare Werte erhalten eine geeignete Genauigkeit, statt eine Geräteschrittweite zu erfinden.

Der Zeitplaner läuft erst weiter, nachdem die konvertierten Daten erfolgreich gespeichert und der Laufzeitzustand wiederhergestellt wurden. Nach einem erfolgreichen Vorgang stellt Room Assist das konvertierte Zeitplanziel wieder her und löscht den gespeicherten Wiederherstellungszustand. Wurden die Daten gespeichert, schlägt aber die Laufzeitwiederherstellung fehl, bleibt Velair angehalten und weist darauf hin, dass die Integration neu geladen oder Home Assistant neu gestartet werden muss.

<a id="upgrading-published-celsius-only-data"></a>
## Aktualisierung älterer Daten ohne Einheitenangabe

Veröffentlichte Velair-Versionen vor Einführung der Einheitenmetadaten behandelten gespeicherte Temperaturwerte als Celsius. Velair geht deshalb davon aus, dass ältere Daten ohne Einheitenangabe Celsius verwenden.

- Verwendet Home Assistant Celsius, kann Velair die Werte weiterverwenden und ergänzt die Einheitenmetadaten.
- Verwendet Home Assistant Fahrenheit, versucht Velair nicht zu erraten, ob einzelne Werte manuell bearbeitet wurden. Der Zeitplaner wird angehalten und **Velair zurücksetzen** angefordert. Dabei werden die alten Daten durch neue Fahrenheit-Standardwerte ersetzt.

Während dieses Zurücksetzen noch aussteht, bleibt der Export verfügbar. So kannst du eine Kopie als Referenz sichern, bevor die alten Zeitpläne und Einstellungen gelöscht werden.

<a id="export-and-import"></a>
## Export und Import

Aktuelle Exporte enthalten das Feld `temperature_unit`. Verwendet eine importierte Datei die andere Einheit, konvertiert Velair die ausgewählten temperaturbezogenen Bereiche vor dem Speichern in die aktuelle Home-Assistant-Einheit.

Ältere Sicherungen ohne `temperature_unit` werden akzeptiert und als Celsius behandelt. Der Importbildschirm zeigt diese Annahme vor dem Import an. Bei einer Fahrenheit-Installation werden diese älteren Werte automatisch in Fahrenheit konvertiert.

Der Import überschreibt weiterhin Daten in den ausgewählten Bereichen: passende Zeitpläne, Vorlagen, Einstellungen oder Lerndaten werden ersetzt. Exportiere zuerst die aktuelle Konfiguration, wenn du einen Wiederherstellungspunkt benötigen könntest.

Der manuelle Ersatzwert für den Temperaturschritt jeder Zone ist in den portablen Zonendaten enthalten und wird bei abweichenden Einheiten als Temperaturdifferenz konvertiert. Der zuletzt von einer lokalen Klimaentität gemeldete Schritt gehört zum internen Gerätekontext und wird nicht exportiert.

<a id="temporarily-unavailable-climates"></a>
## Vorübergehend nicht verfügbare Klimageräte

Ein nicht verfügbares Klimagerät stellt seinen Temperaturbereich oder seine Zielschrittweite möglicherweise nicht bereit. Velair kann die gespeicherten Daten trotzdem migrieren oder importieren und prüft die Zeitpläne, sobald das Gerät seine Fähigkeiten wieder meldet. Ein inkompatibler Zeitplan wird im Panel gekennzeichnet und muss korrigiert werden, bevor du dich auf ihn verlassen kannst.

<a id="what-velair-converts"></a>
## Welche Werte Velair konvertiert

Gespeicherte Konfiguration und importierte Sicherungsdaten werden nur bei einer ausdrücklichen Migration oder einem Import konvertiert. Aktuelle Klimamesswerte und Zieltemperaturen gehören bereits zu Home Assistant und werden nicht erneut umgerechnet. Messwerte separater Raumsensoren oder Außensensoren werden nur beim Vergleich konvertiert, wenn ihre angegebene Einheit von der des verwalteten Klimageräts abweicht.
