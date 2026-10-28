<a id="environmental-comfort"></a>
# Umgebungskomfort
<!-- velair-docs:start -->
Übersetzungen: [Englisches Original](comfort.md) · [Español](comfort.es.md) · [Français](comfort.fr.md) · [Deutsch](comfort.de.md) · [Italiano](comfort.it.md) · [Nederlands](comfort.nl.md) · [Polski](comfort.pl.md) · [Português (Brasil)](comfort.pt-br.md) · [Português (Portugal)](comfort.pt-pt.md) · [Русский](comfort.ru.md) · [Übersetzungsstatus](../translation-status.md)

<details>
<summary>Status dieser Übersetzung</summary>

| Angabe | Status |
| --- | --- |
| Referenzversion | 1.9.0-beta.6 |
| Letzte Synchronisierung | 2026-10-28 |
| Sprachliche Prüfung | KI-gestützte Übersetzung |
| Vergleich mit dem Original | Mit dem englischen Original synchronisiert. |

</details>

---
<!-- velair-docs:end -->

Der voreingestellte angenehme Temperaturbereich beträgt `20–24 °C`. Für Installationen mit Fahrenheit beträgt der Standardbereich `68–75 °F`; seine Grenzen sind auf ganze Grad gerundet.

Komfortgrenzwerte verwenden die in Home Assistant konfigurierte Temperatureinheit und werden mit den übrigen gespeicherten Temperaturdaten von Velair migriert oder importiert. Meldet ein Temperatursensor die andere Einheit, wird sein Messwert vor dem Vergleich mit den Komfortgrenzwerten des verwalteten Klimageräts umgerechnet.

Umgebungskomfort gibt für jedes verwaltete Klimagerät eine verständliche Beschreibung des Raums statt einer allgemeinen Warnstufe.

Behaglichkeit bleibt für jedes physische Klimagerät einer Raumgruppe unabhängig. Jedes Mitglied hat eigene Überwachung, Sensoren, Grenzwerte und Bewertung. Gruppieren teilt Zeitplanung und Raumsteuerung, ohne diese Einstellungen zu ersetzen.

Die Funktion überwacht lokal verfügbare Temperatur-, Luftfeuchtigkeits- und CO2-Messwerte. Sie verändert keine Zeitpläne und steuert Geräte nicht automatisch. Velair stellt die Bewertung im Panel, in Lovelace-Karten und über Home-Assistant-Ereignisse bereit, damit Automationen über das weitere Vorgehen entscheiden können.

<a id="sources"></a>
## Quellen

Für die Temperatur wird die erste verfügbare Quelle in dieser Reihenfolge verwendet:

1. der im Komfort-Tab ausgewählte Temperatursensor;
2. der für das Klimagerät konfigurierte Room-Assist-Sensor;
3. `current_temperature` der Klimaentität.

Bei gruppierten Geräten verwendet die automatische Temperatur das physische `current_temperature` des Mitglieds; der Room-Assist-Sensor der Gruppe wird nicht übernommen. Wähle bei Bedarf einen externen Sensor ausdrücklich in den Behaglichkeitseinstellungen dieses Mitglieds.

Für die Luftfeuchtigkeit werden verwendet:

1. der im Komfort-Tab ausgewählte Luftfeuchtigkeitssensor;
2. das gemessene Attribut `current_humidity` der Klimaentität, sofern verfügbar. Das Attribut `humidity` ist eine Zieleinstellung, kein Messwert.

Die Standardoption `Automatische Quelle verwenden` behält dieses automatische Verhalten bei. Wähle `Luftfeuchtigkeit nicht überwachen`, wenn die Luftfeuchtigkeit den Umgebungszustand oder die Datenqualität dieses Klimageräts nicht beeinflussen soll. Die gespeicherte Sensorauswahl bleibt erhalten, aber Velair liest oder überwacht den Sensor bei deaktivierter Luftfeuchtigkeitsüberwachung nicht.

CO2 wird nur überwacht, wenn ein CO2-Sensor ausgewählt ist.

Die wirksame Entitäts-ID erscheint unter jeder Auswahl. Optionale Messgrößen ohne Quelle gelten nicht als Fehler.

<a id="comfort-models"></a>
## Komfortmodelle

Velair bietet drei Möglichkeiten, den für einen Raum passenden Temperatur- und relativen Luftfeuchtigkeitsbereich zu beschreiben. Es handelt sich um ein vom Benutzer konfiguriertes Ziel, nicht um eine allgemeingültige oder medizinische Komfortdefinition.

- **Einfache Bereiche** ist die Standardeinstellung. Ein Temperaturbereich und ein Luftfeuchtigkeitsbereich bilden die vertraute rechteckige Zielfläche. Bestehende Konfigurationen behalten dieses Verhalten unverändert bei.
- **Geführter psychrometrischer Bereich** verwendet einen Luftfeuchtigkeitsbereich als Referenz am Mittelpunkt des konfigurierten Temperaturbereichs. Velair folgt dem physikalischen Zusammenhang zwischen Temperatur und relativer Luftfeuchtigkeit und passt den Bereich automatisch an. Die Grafik zeigt die resultierende gekrümmte Zielfläche statt eines Rechtecks. Das ist eine praktische lokale Orientierung, kein vollständiger physiologischer Komfortstandard.
- **Temperaturabhängige Bereiche** behält denselben Temperaturbereich bei, erlaubt aber unterschiedliche minimale und maximale Luftfeuchtigkeitswerte an seinem kühleren und wärmeren Ende. Velair verbindet diese beiden Luftfeuchtigkeitsbereiche stufenlos. Dadurch wird die Zielfläche zu einem schrägen Viereck statt eines Rechtecks.

Ein für `20–24 °C` konfigurierter Raum kann beispielsweise bei `20 °C` einen Bereich von `40–60%` und bei `24 °C` einen Bereich von `35–50%` zulassen. Bei `22 °C` bewertet Velair die Luftfeuchtigkeit anhand des Mittelwerts: `37.5–55%`. Unterhalb oder oberhalb des konfigurierten Temperaturintervalls wird der nächstgelegene Endpunkt verwendet, statt über die Benutzervorgaben hinaus zu extrapolieren.

Der aktuell wirksame Luftfeuchtigkeitsbereich erscheint unter der Karte. Derselbe vom Backend berechnete Bereich bestimmt angezeigten Zustand, Bereichszusammenfassung, Umgebungszustandsentität, Ereignisse, Diagnose und optionale Außenhinweise. Clients berechnen keine zweite Interpretation. Fehlt die aktuelle Temperatur oder ist sie veraltet, kann Velair weiterhin einen aktuellen Luftfeuchtigkeitsmesswert anzeigen. Dieser wird jedoch nicht eingeordnet, und es werden keine Luftfeuchtigkeitshinweise erzeugt, bis sich der wirksame Bereich berechnen lässt.

Der geführte Modus benötigt eine von Velair erkennbare Luftfeuchtigkeitsquelle, entweder das verwaltete Klimagerät oder einen ausgewählten Home-Assistant-Sensor. Bis eine Quelle erkannt wird, bleibt die Option nicht verfügbar. Ist diese Quelle vorübergehend nicht verfügbar, behält Velair Modell und Einstellungen bei und wartet auf aktuelle Daten, statt das Modell zu wechseln.

Die beiden benutzerdefinierten Luftfeuchtigkeitsbereiche an den Endpunkten dürfen mit zunehmender Temperatur steigen, fallen oder gleich bleiben. Velair schreibt keine Richtung vor, da Gebäude und Bewohner unterschiedlich sind. „Geführt“ ist die kompakte Wahl, wenn derselbe relative Luftfeuchtigkeitsprozentsatz nicht bei jeder Temperatur identisch behandelt werden soll. Verwende „Benutzerdefiniert“ nur, wenn das gemessene Raumverhalten einen klaren Grund gibt, beide Endpunkte selbst festzulegen.

Bevor die Endpunktbereiche angepasst wurden, hält eine Änderung des einfachen Luftfeuchtigkeitsbereichs beide Endpunkte mit ihm gleich. Sobald ein temperaturabhängiger Bereich angepasst wurde, behält Velair ihn beim Modellwechsel bei, damit eine alternative Konfiguration nicht verloren geht.

<a id="additional-environmental-information"></a>
## Zusätzliche Umgebungsinformationen

Die Komfortkonfiguration kann die vorhandenen Informationen für ein verwaltetes Klimagerät optional um drei Messgrößen ergänzen:

| Messgröße | Zusätzliche Information in Velair |
| --- | --- |
| **Taupunkt** | Ein kompakter Hinweis darauf, wie nahe die Luft an Kondensationsbedingungen liegt. Er belegt nicht, dass Kondensation auftreten wird, da Velair die Temperatur von Wänden, Fenstern und anderen Oberflächen nicht kennt. |
| **Absolute Luftfeuchtigkeit** | Die Masse des Wasserdampfs pro Kubikmeter Luft, angezeigt in `g/m³`. Anders als relative Luftfeuchtigkeit wird sie nicht als Prozentsatz des Sättigungsgrads der Luft ausgedrückt. Velair verwendet keinen allgemeingültigen guten oder schlechten Bereich dafür. |
| **Humidex** | Ein zusätzlicher Wert für wahrgenommene Wärme, abgeleitet aus Temperatur und Luftfeuchtigkeit. Velair zeigt den Wert an, macht daraus aber anhand veröffentlichter Kategorien keine Empfehlungen und verwendet ihn nicht als vollständige Bewertung des Innenraumkomforts. |

Aktiviere nur Messgrößen, die für dein Dashboard oder deine Automationen hilfreich sind. Für den normalen Komfortzustand sind sie nicht erforderlich; alle sind standardmäßig deaktiviert.

Die aufgeklappte Klimageräteansicht trennt aktuelle Informationen von Einrichtungsbedienelementen. Aktivierte Messgrößen erscheinen als kompakte responsive Gruppe direkt unter Temperatur-/Luftfeuchtigkeitskarte und CO2-Skala. Jeder Eintrag enthält den aktuellen Wert oder Verfügbarkeitszustand sowie zugängliche Informationshilfe, aber niemals einen Schalter oder eine Quellenauswahl. Deaktivierte Messgrößen hinterlassen keine leere Karte oder Lücke im Raster.

Alle Einrichtungsbedienelemente sind unter **Komfortkonfiguration** gruppiert. Der Bereich ist standardmäßig geschlossen, damit die aktuelle Bewertung im Mittelpunkt bleibt. Seine kompakten Abschnitte trennen Datenquellen, Komfortmodell, modellspezifische Einstellungen, Empfehlungen und zusätzliche Umgebungsinformationen. Bedienelemente abgeleiteter Messgrößen enthalten nur Aktivierungsschalter und Quellenauswahl, keinen doppelten aktuellen Messwert. Das Konfigurationspanel bleibt bei deaktivierter Komfortüberwachung verfügbar, damit ein Klimagerät vor der Aktivierung vorbereitet werden kann. Öffnen und Schließen sind lokale Oberflächenentscheidungen und werden nicht als Konfiguration gespeichert.

Jede Messgröße ist standardmäßig deaktiviert und hat eine Quellenauswahl. Die erste Option ist **Calculated by Velair**; weitere Optionen sind kompatible Home-Assistant-Sensoren. Ein externer Messwert benötigt daher kein zweites Entitätsbedienelement:

- **Calculated by Velair** verwendet die wirksamen, bereits für das Klimagerät ausgewählten Komfort-Temperatur- und Luftfeuchtigkeitswerte. Wird die Luftfeuchtigkeit nicht überwacht oder fehlt ein Eingang, wird der berechnete Messwert als fehlend gemeldet.
- **Home Assistant entity** liest eine bestehende `sensor.*`-Entität. Sie kann aus Thermal Comfort, einer Vorlage oder einer anderen Integration stammen. Thermal Comfort ist weder erforderlich noch wird es gesondert erkannt.

Ein externer Taupunktsensor muss `°C` oder `°F` veröffentlichen. Velair zeigt ihn in der Temperatureinheit des verwalteten Klimageräts an. Ein Sensor für absolute Luftfeuchtigkeit muss `g/m³` oder `mg/m³` veröffentlichen; Velair zeigt `g/m³` an. Ein Humidex-Sensor darf die bei Entitäten mit Temperaturklasse übliche Darstellung `°C` oder `°F` oder einen einheitenlosen Wert verwenden. Velair normalisiert ihn zum kanonischen einheitenlosen Humidex-Wert, auch bei Fahrenheit-Installationen.

Velair normalisiert gültige Messwerte und meldet fehlende, veraltete oder ungültige Quellen, ohne das bestehende Ergebnis für Umgebungszustand oder Datenqualität zu verändern. Eine aktivierte externe Messgröße kann bereits ohne ausgewählte Entität gespeichert werden. Dieser gültige unvollständige Zustand wird als fehlend gemeldet und bleibt bei Export/Import erhalten. Die Home-Assistant-Zustände `unknown` und `unavailable` gelten als fehlend; nichtnumerische Werte, inkompatible Einheiten und negative absolute Luftfeuchtigkeit gelten als ungültig.

Diese Messgrößen dienen der Beobachtung. Sie verändern niemals Zeitplan, HVAC-Modus, Zieltemperatur, Room-Assist-Anpassung oder Vorkonditionierungsentscheidung. Insbesondere ergänzt Humidex die reale Temperatur und Luftfeuchtigkeit, statt eine davon zu ersetzen. Damit wird Luftfeuchtigkeit nicht doppelt berücksichtigt.

<a id="comfort-insights"></a>
## Hinweise zum Komfort

Velair behält den konfigurierten Temperatur-/Luftfeuchtigkeitszustand als Hauptzusammenfassung bei und gruppiert kompakte Kontextkarten über den Messwerten. Sie erklären Überschreitungen von CO2-Grenzwerten, eine bedeutsame Humidex-Erhöhung und aktuelle Lüftungsmöglichkeiten oder Abwägungen, ohne den Zustand zu wiederholen oder Karte beziehungsweise CO2-Skala zu ersetzen.

Die Formulierungen sind vorsichtig. Humidex erscheint nur als Hinweis, wenn die wahrgenommene Wärme mindestens 1 °C über der Lufttemperatur liegt. Erhöhtes oder schlechtes CO2 kann ebenfalls einen Hinweis ergänzen. Taupunkt und absolute Luftfeuchtigkeit bleiben nützliche Messwerte statt dauerhafter Meldungen. Ihre Infoschaltflächen erklären die mögliche Kondensationsschwelle an Oberflächen beziehungsweise die Wasserdampfmenge. Die Hilfe ist mit Mauszeiger, Tastaturfokus oder Tippen auf Touchscreens verfügbar. Fehlende, veraltete und ungültige Messwerte werden ignoriert. Außendaten verändern weder den Innenraumzustand noch die Klimasteuerung.

Aktuelle Werte erscheinen in der aufgeklappten Klimagerätezeile des Tabs **Komfort**. Die Lovelace-Komfortansicht verwendet dieselbe Darstellung. Ist Komfort in einer Velair-Einzelklimagerätekarte aktiviert, enthält die aufgeklappte Zusammenfassung jeden aktivierten aktuellen abgeleiteten Messwert. Der Karteneditor kann diese Werte auch in der eingeklappten Komfortzeile des aktuellen Zustands anzeigen, wenn das Dashboard kompaktere Informationen benötigt. Fehlende, veraltete und ungültige Werte bleiben in der Komfortansicht mit ihrem Status sichtbar, statt eine alte oder erfundene Zahl darzustellen. Humidex erscheint neben der Raumtemperatur mit einem gerichteten Vergleich; in Fahrenheit wird nur die Differenz skaliert, sodass niemals ein Zuschlag von 32 erfolgt. Differenzen erscheinen auch im Humidex-Kontexthinweis mit der Zoneneinheit und einer Dezimalstelle. Humidex selbst ist ein einheitenloser, auf Celsius bezogener Index für wahrgenommene Wärme, keine physische Temperatur. Velair hängt an seinen Wert keine Einheit an.

Ist Humidex aktuell, zeigt sein Panel außerdem eine kompakte Vergleichsskala. Zwei Markierungen kennzeichnen Raumlufttemperatur und Humidex; das hervorgehobene Band ist der für das Klimagerät konfigurierte Temperaturbereich. Der Status sagt, ob Humidex unterhalb, innerhalb oder oberhalb dieses Bereichs liegt. Er behauptet nicht, der Raum sei angenehm oder gefährlich. Die Skala reicht 5 °C unter und über den konfigurierten Bereich, damit nahe Unterschiede gut lesbar bleiben. In Fahrenheit werden absolute Skalenbeschriftungen normal konvertiert, während die Differenz nur mit `9 / 5` multipliziert wird. Der Humidex-Wert selbst bleibt einheitenlos. Fehlende oder ungültige Daten erzeugen keine erfundene Position. Der Taupunkt wird neutral als oberhalb oder unterhalb der Raumluft beschrieben. Absolute Luftfeuchtigkeit bleibt ein neutraler `g/m³`-Messwert. Definitionen befinden sich hinter zugänglichen Infoschaltflächen, damit die Panels kompakt bleiben.

Die Hauptzusammenfassung beginnt immer mit dem physischen Umgebungszustand anhand der konfigurierten Temperatur- und Luftfeuchtigkeitswerte. Ist Humidex aktiviert und weicht seine Bereichsposition von der Raumlufttemperatur ab, zeigt ein zweiter **Humidex**-Chip, ob die wahrgenommene Wärme unterhalb, innerhalb oder oberhalb des konfigurierten Temperaturbereichs liegt. Der physische Zustand bleibt sichtbar und wird nicht durch eine abgeleitete Interpretation ersetzt. Das Humidex-Panel erklärt die gemessene Differenz, ohne den Raum heiß, kalt oder angenehm zu nennen. Fehlende oder ungültige abgeleitete Daten verändern den physischen Zustand niemals.

Der unten beschriebene kompatible Umgebungszustandswert bleibt unverändert. Bestehende Automationen können ihn weiterverwenden. Humidex und Bereichszusammenfassung ergänzen lediglich Beobachtungskontext und steuern niemals das Klimagerät.

<a id="indoor-vs-outdoor"></a>
## Innen- und Außenvergleich

Der optionale Außenvergleich ergänzt Kontext, ohne den Komfortzustand im Innenraum zu verändern. Aktiviere **Indoor vs outdoor** im eingeklappten Panel **Komfortkonfiguration**, wähle einen ausdrücklichen Außentemperatursensor und optional einen Außenluftfeuchtigkeitssensor. Beim Deaktivieren des Vergleichs bleibt die Sensorauswahl erhalten, sodass du ihn ohne neue Konfiguration wieder aktivieren kannst.

Das Laufzeitpanel bleibt von der Grafik getrennt. Es zeigt Innen- und Außentemperatur mit ihrer Differenz, absolute Innen- und Außenluftfeuchtigkeit sowie die relative Luftfeuchtigkeit, die die Außenluft nach Erreichen der aktuellen Innentemperatur hätte. Auf breiteren Bildschirmen stehen beide Bereiche symmetrisch nebeneinander, auf Mobilgeräten untereinander.

Beide absoluten Luftfeuchtigkeitswerte kommen direkt vom Backend. Stellt ein älteres Backend den Innenwert nicht bereit, zeigt die Oberfläche ihn als nicht verfügbar an, statt einen physischen Messwert aus gerundeten Differenzen zu rekonstruieren.

Velair kann im gemeinsamen Hinweisbereich über den Messwerten eine vorsichtig formulierte, vom Backend gelieferte Lüftungsmöglichkeit oder Abwägung anzeigen. Eine ausschließlich temperaturbezogene Gelegenheit weist ausdrücklich darauf hin, dass die Wirkung auf die Luftfeuchtigkeit nicht verfügbar ist. Fehlende, veraltete, ungültige und nicht überwachte Messgrößen erscheinen als Zustände statt als wiederverwendete Werte oder falsche Vergleiche.

Velair erstellt außerdem je verwaltetem Klimagerät einen Aufzählungssensor **Lüftungsmöglichkeit**. Er stellt das aktuelle Ergebnis nach einem Neustart für Dashboards und Automationen bereit, ohne den kompatiblen Umgebungszustand zu verändern. Siehe [Lüftungsmöglichkeit](zone-sensors.de.md#ventilation-opportunity).

Unter **Ventilation guidance** im selben Konfigurationspanel legt jedes Klimagerät fest, wie groß ein nützlicher Unterschied sein muss, bevor Velair diesen Kontext zeigt:

| Einstellung | Standardwert | Gefilterte Unterschiede |
| --- | --- | --- |
| Temperaturdifferenz | `1 °C` / `1.8 °F` | Kleine Temperaturunterschiede zwischen innen und außen. |
| Angepasste Luftfeuchtigkeitsdifferenz | `5` Prozentpunkte | Kleine erwartete Änderungen der relativen Luftfeuchtigkeit, nachdem Außenluft die Innentemperatur erreicht. |
| Luftfeuchtedifferenz | `1 g/m³` | Kleine Unterschiede der absoluten Luftfeuchtigkeit, die sonst allein aufgrund der Temperatur nützlich erscheinen könnten. |

Die Luftfeuchtigkeitsbedienelemente erscheinen nach Auswahl eines Außenluftfeuchtigkeitssensors. Ihre Werte bleiben erhalten, wenn dieser Sensor oder der Vergleich später deaktiviert wird. Kleinere Werte machen die Hinweise empfindlicher; größere verlangen einen deutlicheren Unterschied. Diese Abstände ersetzen die konfigurierten Komfortbereiche nicht: Außenluft muss den Raum weiterhin in Richtung des jeweiligen Bereichs bewegen.

Diese Funktion ist visuell und ereignisgesteuert. Sie öffnet oder schließt keine Fenster und verändert weder Klimaziel noch Modus, Zeitplan, Pause oder temporäre Anpassung. Velair verwendet nur die ausgewählten `sensor.*`-Entitäten und greift nicht auf Wetterdaten zurück.

Velair erstellt keine drei zusätzlichen Stellvertretersensoren. Aktivierte Messwerte stehen unter `derived_metrics` des bestehenden Zonensensors **Raumklima**, in der Zeitplan-API, der Diagnose und dem Ereignis `comfort_assessment_changed` bereit. So gibt es eine zentrale Referenz, während Dashboards und Automationen die Daten trotzdem nutzen können. Vollständige Zustände, Attribute, robuste Vorlagen und Hinweise zur Wahl zwischen Entität und Ereignis findest du unter [Umgebungszustand](zone-sensors.de.md#environmental-condition).

<a id="environmental-conditions"></a>
## Umgebungszustände

Temperatur und Luftfeuchtigkeit werden anhand der konfigurierten Bereiche eingeordnet und zu einem kompatiblen Umgebungszustand kombiniert:

| Temperatur | Luftfeuchtigkeit | Zustand |
| --- | --- | --- |
| Unterhalb des Bereichs | Unterhalb des Bereichs | `Kalt und trocken` |
| Unterhalb des Bereichs | Im Bereich | `Kalt` |
| Unterhalb des Bereichs | Oberhalb des Bereichs | `Kalt und feucht` |
| Im Bereich | Unterhalb des Bereichs | `Trockene Luft` |
| Im Bereich | Im Bereich | `Angenehm` |
| Im Bereich | Oberhalb des Bereichs | `Feucht` |
| Oberhalb des Bereichs | Unterhalb des Bereichs | `Heiß und trocken` |
| Oberhalb des Bereichs | Im Bereich | `Heiß` |
| Oberhalb des Bereichs | Oberhalb des Bereichs | `Heiß und feucht` |

Ist nur eine nützliche Messgröße verfügbar, meldet Velair, was sich feststellen lässt, ohne vollständigen Komfort zu behaupten:

- `Temperatur im Zielbereich`;
- `Luftfeuchtigkeit im Zielbereich`;
- `Kalt`, `Heiß`, `Trockene Luft` oder `Feucht`.

Gibt es keinen nützlichen Umgebungsmesswert, lautet der Zustand `Keine Messwerte`. Sind alle überwachten Quellen veraltet, lautet er `Messwerte veraltet`.

<a id="air-quality"></a>
## Luftqualität

CO2 bleibt von Temperatur und Luftfeuchtigkeit getrennt, da es Luftqualität statt thermischen Komfort beschreibt:

- `Gute Luft`: unterhalb der Aufmerksamkeitsschwelle;
- `CO2 erhöht`: auf oder über der Aufmerksamkeitsschwelle;
- `Schlechte Luftqualität`: auf oder über der Schwelle für schlechte Luft;
- `CO2 nicht verfügbar`: eine konfigurierte CO2-Quelle kann derzeit nicht gelesen werden.

Ein Raum kann deshalb beispielsweise gleichzeitig `Heiß und feucht` und `CO2 erhöht` anzeigen.

<a id="data-quality"></a>
## Datenqualität

Velair stellt einen Datenqualitätswert bereit:

- `complete`: jede überwachte Messgröße hat einen aktuellen Messwert, der durch eine kürzlich erfolgte Home-Assistant-Meldung belegt ist;
- `unverified`: alle überwachten Messgrößen sind nutzbar, aber mindestens ein Messwert hat keinen überprüfbaren Meldezeitpunkt;
- `partial`: eine Bewertung ist verfügbar, aber mindestens ein überwachter Messwert fehlt oder ist veraltet;
- `stale`: es gibt keinen aktuellen Messwert und alle überwachten Quellen sind veraltet;
- `unavailable`: aus einem anderen Grund ist kein aktueller Messwert nutzbar.

Der Tab Behaglichkeit gruppiert nutzbare Messwerte mit nicht überprüfbarer Aktualität neben den Sensorauswahlen unter **Konfiguration → Datenquellen**. Eine dezente Erklärung nennt die betroffenen Werte: Ein unbekannter Messzeitpunkt bedeutet weder falsche Werte noch einen unbehaglichen Raum. Übersicht und Lovelace-Karten lassen diesen Routinezustand weg; die Diagnose behält den technischen Kontext. Das ist eine gültige automatische Gerätequelle, kein Konfigurationsfehler. Fehlende oder veraltete Werte erzeugen weiterhin eine Warnung in der Zonenliste.

<a id="visual-status"></a>
## Visuelle Statusanzeige

Die eingeklappte Klimagerätezeile zeigt:

- den Umgebungszustand;
- einen separaten Humidex-Chip nur dann, wenn aktuelle Temperatur und Humidex in unterschiedlichen Teilen des konfigurierten Bereichs liegen;
- optionale Chips für Humidex, Taupunkt und absolute Luftfeuchtigkeit, wenn der Einzelklimageräte-Karteneditor zusätzliche eingeklappte Messwerte aktiviert;
- Luftqualität bei überwachtem CO2;
- ein Warnsymbol bei unvollständigen Messwerten;
- den Komfort-Ein-/Ausschalter.

Der aufgeklappte aktuelle Status verwendet:

- denselben physischen Umgebungszustand als Hauptüberschrift;
- eine Temperatur-/Luftfeuchtigkeitskarte, wenn beide Werte aktuell sind;
- eine einzelne horizontale Skala, wenn nur Temperatur oder Luftfeuchtigkeit aktuell ist;
- eine separate CO2-Skala, wenn CO2 überwacht wird und aktuell ist.

Die Temperatur-/Luftfeuchtigkeitskarte verwendet neun dezente Bereiche für kalte, heiße, trockene, feuchte und kombinierte Zustände. Die hervorgehobene Zielfläche folgt immer dem ausgewählten Modell: ein Rechteck für „Einfach“, eine vom Backend berechnete Kurve für „Geführt“ und das konfigurierte Vieleck für „Benutzerdefiniert“. Eine kleine Markierung zeigt die aktuelle Position; ihre Beschriftung enthält beide Messwerte.

Auf Skalen mit einer einzelnen Messgröße ist der mittlere grüne Abschnitt der konfigurierte Komfortbereich. Minimum und Maximum stehen am Anfang und Ende dieses Abschnitts; äußere Abschnitte geben Kontext zu Werten unterhalb oder oberhalb des Bereichs.

<a id="lovelace"></a>
## Lovelace

Die Komfortansicht ist als Lovelace-Karte verfügbar:

```yaml
type: custom:velair-card
view: comfort
```

Die Karte lässt sich auf ausgewählte verwaltete Klimageräte begrenzen:

```yaml
type: custom:velair-card
view: comfort
entities:
  - climate.living_room
  - climate.bedroom
```

Sie kann außerdem lokale Oberflächenbereiche ausblenden, wenn sich ein Dashboard auf die gewünschten Messwerte konzentrieren soll:

```yaml
type: custom:velair-card
view: comfort
show_comfort_configuration: false
show_comfort_temperature: true
show_comfort_humidity: false
show_comfort_co2: true
```

Weggelassene Optionen `show_comfort_*` verwenden standardmäßig `true`. Ist `show_comfort_configuration` auf `false` gesetzt, blendet die Karte das vollständige Einrichtungspanel aus, behält aber aktivierte abgeleitete Messwerte in der visuellen Bewertung.

Sichtbarkeitsoptionen für Temperatur, Luftfeuchtigkeit und CO2 beeinflussen nur die Grafiken dieser Lovelace-Karte. Sie verändern weder Komfortkonfiguration noch Quellenauswahl, Grenzwerte, Automationsereignisse oder Home-Assistant-Sensoren. Sind Temperatur und Luftfeuchtigkeit sichtbar, aber nur ein aktueller Messwert vorhanden, verwendet die Karte dieselbe Einzelmessgrößenskala wie das Hauptpanel von Velair.

<a id="freshness"></a>
## Aktualität der Daten

`Veraltet nach` ist die maximale Zeit seit der letzten Zustandsmeldung eines ausgewählten Sensors an Home Assistant (`last_reported`). Das erneute Melden desselben Werts aktualisiert den Meldezeitpunkt und hält den Wert aktuell. Velair überwacht diese Meldungen und plant den nächsten Ablaufzeitpunkt, damit Panel, Sensoren und Ereignisse `stale` anzeigen können, wenn die Frist ohne weitere Meldung verstreicht.

Die Einstellung liegt im eigenen Bereich **Datenaktualität** hinter der Quellenauswahl. Er nennt direkte Quellen, für die die Grenze gilt, darunter Room Assist, CO2, Außen- oder externe Sensoren abgeleiteter Größen. Der Hinweis zu nicht überprüfbarer Aktualität steht neben der Sensorauswahl, einschließlich aktivierter abgeleiteter Größen und Außenwerte. Außensensoren können die Grenze aktiv halten, auch wenn Temperatur und Feuchtigkeit innen vom Klimagerät kommen; dessen Werte lässt sie nicht veralten. Du kannst sie vor der Behaglichkeitsaktivierung einstellen. Ohne direkte Quelle ist das Feld mit Erklärung deaktiviert; sein Wert bleibt für eine spätere Sensorwahl erhalten.

Die automatischen Temperatur- und Luftfeuchtigkeitsattribute von `climate.*` haben keinen unabhängigen Meldezeitpunkt. Velair hält einen gültigen Wert sichtbar und kennzeichnet seine Aktualität als `unverified`. Änderungen des Klimaziels bestätigen keine neue Messung. Wähle wenn möglich den ursprünglichen Temperatur- oder Luftfeuchtigkeitssensor. Fehlt einem ausgewählten Sensor `last_reported`, ist auch sein gültiger Wert `unverified`. Eine Entität mit `unavailable` oder `unknown` liefert keinen nutzbaren Messwert, selbst wenn alte numerische Attribute erhalten bleiben.

Eine Home-Assistant-Meldung beweist nicht, dass der physische Sensor erneut gemessen hat. Eine Integration, die nur bei Wertänderungen meldet, wird schließlich als veraltet markiert, wenn der Wert konstant bleibt.

<a id="automation-event"></a>
## Automationsereignis

Ändern sich Umgebungszustand, Luftqualität, Datenqualität, Datenprobleme oder der semantische Zustand einer aktivierten abgeleiteten Messgröße, sendet Velair:

```yaml
event_type: velair_event
event_data:
  event: comfort_assessment_changed
```

Beispieldaten:

```json
{
  "domain": "velair",
  "event": "comfort_assessment_changed",
  "entity_id": "climate.living_room",
  "condition": "cold_and_humid",
  "air_quality": "elevated",
  "data_quality": "complete",
  "data_issues": [],
  "range_summary": {
    "status": "outside_range",
    "thermal_relation": "not_evaluated",
    "positions": {
      "temperature": "below",
      "humidity": "above",
      "humidex": null
    }
  },
  "previous_range_summary": {
    "status": "within_range",
    "thermal_relation": "not_evaluated",
    "positions": {
      "temperature": "within",
      "humidity": "within",
      "humidex": null
    }
  },
  "range_summary_changed": true,
  "range_status_changed": true,
  "temperature": {
    "metric": "temperature",
    "availability": "current",
    "freshness": "reported",
    "condition": "cold",
    "source": "sensor",
    "entity_id": "sensor.living_room_temperature",
    "value": 18.7,
    "min": 20.0,
    "max": 24.0
  },
  "humidity": {
    "metric": "humidity",
    "availability": "current",
    "freshness": "reported",
    "condition": "humid",
    "source": "sensor",
    "entity_id": "sensor.living_room_humidity",
    "value": 68,
    "min": 40,
    "max": 60
  },
  "co2": {
    "metric": "co2",
    "availability": "current",
    "freshness": "reported",
    "condition": "elevated",
    "source": "sensor",
    "entity_id": "sensor.living_room_co2",
    "value": 1200,
    "attention": 1000,
    "max": 1500
  },
  "derived_metrics": {
    "dew_point": {
      "metric": "dew_point",
      "availability": "current",
      "freshness": "reported",
      "source": "velair",
      "entity_id": null,
      "value": 12.9,
      "unit": "°C",
      "issues": [],
      "input_entity_ids": [
        "sensor.living_room_temperature",
        "sensor.living_room_humidity"
      ]
    }
  }
}
```

Beispielautomation:

```yaml
automation:
  - alias: "Velair poor air quality"
    triggers:
      - trigger: event
        event_type: velair_event
        event_data:
          event: comfort_assessment_changed
          air_quality: poor
    actions:
      - action: notify.mobile_app_phone
        data:
          message: >
            Poor air quality in {{ trigger.event.data.entity_id }}:
            {{ trigger.event.data.co2.value | round(0) }} ppm
```

Öffnen oder Neuladen des Panels löst kein Automationsereignis aus. Zahlenänderungen ursprünglicher oder abgeleiteter Werte erzeugen keine doppelten Ereignisse, solange ihre semantische Einordnung und Verfügbarkeit unverändert bleiben. Das Panel und die Attribute der Home-Assistant-Sensoren werden trotzdem mit den neuesten Werten aktualisiert.

Verwende `range_status_changed: true`, wenn eine Automation nur auf Änderungen des zusammengefassten Status im konfigurierten Bereich reagieren soll. Verwende `range_summary_changed: true`, wenn auch Änderungen einzelner Positionen oder ihrer thermischen Beziehung relevant sind. Andere Komfortänderungen können dasselbe Ereignis mit beiden Kennzeichen auf `false` auslösen. Aktuelle und vorherige Zusammenfassung machen den Übergang ausdrücklich erkennbar.

Vollständige Daten, die genauen abgeleiteten Felder dieses semantischen Zustands und das gemeinsame `velair_event`-Auslösermuster findest du unter [Automationsereignisse](automation-events.de.md#comfort-assessment-changed).

<a id="performance-and-privacy"></a>
## Leistung und Datenschutz

Komfort ist standardmäßig deaktiviert.

Bei deaktiviertem Komfort registriert Velair für dieses Klimagerät keine Komfort-Ereignisüberwachung. Bei aktiviertem Komfort überwacht es ausschließlich das verwaltete Klimagerät und ausgewählte oder automatisch ermittelte Sensorentitäten, einschließlich aktiver externer Quellen abgeleiteter Messgrößen. Native abgeleitete Messgrößen verwenden die bereits vorhandene Temperatur- und Luftfeuchtigkeitsüberwachung mit. Es gibt keine kontinuierlichen Abfragen.

Alle Messwerte und Bewertungen bleiben lokal in Home Assistant.
