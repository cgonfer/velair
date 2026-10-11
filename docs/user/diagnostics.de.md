<a id="diagnostics"></a>
# Diagnose
<!-- velair-docs:start -->
Übersetzungen: [Englisches Original](diagnostics.md) · [Español](diagnostics.es.md) · [Français](diagnostics.fr.md) · [Deutsch](diagnostics.de.md) · [Italiano](diagnostics.it.md) · [Nederlands](diagnostics.nl.md) · [Polski](diagnostics.pl.md) · [Português (Brasil)](diagnostics.pt-br.md) · [Português (Portugal)](diagnostics.pt-pt.md) · [Русский](diagnostics.ru.md) · [Übersetzungsstatus](../translation-status.md)

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

Der Bereich **Diagnose** bietet eine lokale, schreibgeschützte Ansicht dessen, was Velair ohne Home Assistant Recorder oder externe Dienste überprüfen kann.

Er zeigt den aktuellen Zustand des Zeitplaners und eine kompakte horizontale Leiste der verwalteten Klimageräte in der konfigurierten Thermostatreihenfolge. Die Auswahl eines Klimageräts öffnet darunter genau ein Detailpanel über die volle Breite. Dieses ordnet jede Information einmal den Bereichen Status und Übertragung, aktive Konfiguration, Funktionen sowie Gerät und Sensoren zu. Es enthält:

- Verfügbarkeit und gemeldete HVAC-/Temperaturfähigkeiten;
- erkannte Konfigurationsprobleme, für die Velair direkte Belege hat;
- den wirksamen Modus und die Profile, die berechnete Laufzeitabsicht, temporäre Anpassungen und Pausen;
- das letzte von Home Assistant angenommene Steuerungsziel, Übertragungsfehler und den begrenzten Wiederholungszustand;
- Room Assist, adaptive Vorkonditionierung, Komfort und ausdrücklich zugeordnete Sensoren.

Erfolgreiche Aufrufe von `velair.set_hvac_mode` erscheinen als angenommene manuelle Übertragung, die nur den Modus setzt. Sie enthalten den ausgewählten HVAC-Modus, aber keine erfundene Temperatur. Validierungsfehler ersetzen die zuvor angenommene Übermittlungsinformation nicht; Fehler bei der tatsächlichen Übermittlung erzeugen kein Ereignis über eine erfolgreiche Zielanwendung.

Velair leitet keine Ursache ab, wenn die verfügbaren Belege nur ein Symptom wie eine nicht verfügbare Entität nachweisen. Batterieinformationen werden weggelassen, wenn keine zuverlässige Zuordnung möglich ist; die erste Version versucht keine heuristische Gerätezuordnung.

Für Komfort enthält die Diagnose die gespeicherte Quelle jedes aktivierten abgeleiteten Messwerts, den wirksamen Eingang oder die externe Entität, deren aktuelle Verfügbarkeit und stabile Problemcodes für fehlende, veraltete, ungültige oder ungeprüfte Daten. Taupunkt, absolute Luftfeuchtigkeit und Humidex bleiben hier reine Beobachtungen: Ihre Erwähnung im Bericht bedeutet nicht, dass sie Zeitplanung oder Klimasteuerung beeinflusst haben. Dieselben aktivierten Daten stehen im Attribut `derived_metrics` des Zonensensors **Raumklima** bereit; Velair erstellt dafür keine separaten Stellvertreterentitäten. Aktuelle Messwerte enthalten `freshness: reported` oder `unverified`; Letzteres bleibt mit einem Informationshinweis sichtbar und lässt sich bis zur Quelle zurückverfolgen.

Bei aktiviertem Außenvergleich enthält derselbe Komfortbericht außerdem die ausdrückliche Sensorverfügbarkeit, eine unabhängige Bewertung der Außendatenqualität, den normalisierten Vergleich, die absolute Innen- und Außenluftfeuchtigkeit und einen möglichen Code für Lüftungsmöglichkeit oder Zielkonflikt. Der Block `guidance_thresholds` enthält die wirksame zonenspezifische Empfindlichkeit für diese Schlussfolgerung. Damit lässt sich ein Sensorproblem von bewusst strengeren Hinweisen unterscheiden. Diese Werte sind Beobachtungen und bedeuten nicht, dass Velair ein Fenster geöffnet oder HVAC geändert hat. Die Diagnose enthält außerdem `comfort_zone`: die konfigurierte einfache, geführte oder benutzerdefinierte temperaturabhängige Geometrie und den bei aktueller Temperatur wirksamen Luftfeuchtigkeitsbereich. Ein wirksamer Bereich von `null` erklärt, warum ein aktueller Luftfeuchtigkeitswert bei fehlender Temperatur nicht eingeordnet wurde; er wird nicht durch einen geschätzten Ersatzbereich ersetzt.

Die aktuelle Bewertung enthält `range_summary`. Gespeicherte Einträge von `comfort_assessment_changed` behalten außerdem `previous_range_summary` sowie die Kennzeichen `range_summary_changed` und `range_status_changed`. Ein heruntergeladener Bericht kann dadurch zeigen, ob das Ereignis einen Übergang im konfigurierten Bereich oder eine andere Komfortänderung darstellte. Diese Felder enthalten nur stabile semantische Codes, keinen unverarbeiteten Home-Assistant-Ereigniskontext.

<a id="runtime-history-and-privacy"></a>
## Laufzeitverlauf und Datenschutz

Die Diagnose bewahrt höchstens 100 relevante Ereignisse in einem globalen Zeitverlauf auf. Unter **Verlaufseinstellungen** kannst du Steuerungs- und Zeitplanaktivität, Room Assist, Vorkonditionierung, Komfort, Klimabefehlsübermittlung und Verfügbarkeitsereignisse unabhängig voneinander speichern lassen. Neue Velair-Ereignistypen, die noch keiner Kategorie zugeordnet sind, werden unter Steuerung und Zeitplänen gespeichert statt stillschweigend verworfen. Externe Anpassungen und Wechsel zwischen automatischer und manueller Steuerung bleiben ebenfalls in dieser Kategorie. Ihre Einträge zeigen nur den geänderten HVAC-Modus oder das einzelne beziehungsweise Bereichsziel, die wirksame Richtlinie für externe Änderungen sowie einen Ablauf- oder Fortsetzungsgrund. Beliebige Klimaattribute und Home-Assistant-Kontextkennungen werden nicht gespeichert.

Alle Kategorien sind standardmäßig aktiviert. Das Backend speichert diese Auswahl lokal; das Deaktivieren einer Kategorie entfernt sofort ihre bereits gespeicherten Ereignisse. **Verlauf löschen** entfernt alle aufbewahrten Ereignisse, ohne aktuelle Zustands-, Übertragungs- oder Konfigurationsinformationen zu ändern.

Du kannst das Laufzeitprotokoll lokal filtern, ohne zu ändern, was Velair aufbewahrt. Wähle beliebige Kombinationen aus der Velair-Systemquelle und verwalteten Klimageräten oder verwende die Gesamtauswahl **Alle**. Bei Bedarf kannst du die Liste weiter nach Kategorie und einem Datumsbereich, der Anfangs- und Enddatum einschließt eingrenzen. **Filter löschen** stellt den vollständigen gespeicherten Zeitverlauf wieder her. Ein leerer Verlauf wird anders dargestellt als eine Filterkombination ohne Treffer. Diese Filter sind vorübergehender Oberflächenzustand und werden nicht dauerhaft gespeichert.

Auf Desktopgeräten lassen sich die Spalten des Laufzeitprotokolls durch Ziehen ihrer Trennlinien oder mit der Tastatur bei fokussierter Trennlinie vergrößern und verkleinern. Pfeiltasten ändern die Breite in kleinen Schritten, Umschalt+Pfeil in größeren Schritten; Pos1/Ende springt zu den zulässigen Grenzen und ein Doppelklick stellt die Standardbreite wieder her. Spaltenbreiten sind vorübergehend und werden nicht gespeichert. Auf Mobilgeräten erscheinen Zeit, Klimagerät, Typ und Nachricht in vier getrennten Zeilen. Passt ein Wert nicht ohne Umbruch, lässt sich seine Zeile horizontal scrollen.

Nur die Kategorieauswahl wird dauerhaft gespeichert. Der Ereignisverlauf liegt ausschließlich im Arbeitsspeicher, wird bei einem Neustart der Integration oder von Home Assistant gelöscht und verwendet Recorder nicht. Er wird aus bestehenden Velair-Ereignissen, Verfügbarkeitsänderungen und Übertragungsergebnissen gefüllt und verursacht daher keine regelmäßigen Abfragen.

**Bericht herunterladen** öffnet Datenschutzoptionen, bevor eine für ein Issue geeignete JSON-Datei erstellt wird. Entitäts-IDs verwalteter Klimageräte werden standardmäßig durch stabile Aliasnamen ersetzt. Für lokale Prüfungen kannst du die unveränderten Entitäts-IDs beibehalten. Profil-, Modus- und Pausenkennungen werden immer entfernt. Beim Schließen des Panels oder nach einem Download wird die sicherere Standardeinstellung wiederhergestellt. Der normale Diagnose-Download des Home-Assistant-Konfigurationseintrags verwendet immer die bereinigte Momentaufnahme. Der Berichtsexport ist bei Layouts in Smartphonegröße ausgeblendet, da Downloads in der Webansicht der Home-Assistant-Companion-App nicht zuverlässig sind. Öffne Velair auf einem Tablet oder in einem Desktopbrowser, wenn du einen Bericht herunterladen möchtest. Prüfe jeden Bericht vor der Veröffentlichung. Auch zugeordnete Sensor-Entitäts-IDs werden ersetzt; die lokale Liveansicht zeigt sie weiterhin, weil sie für die Konfigurationsprüfung hilfreich sind.

Die lokale Diagnoseansicht verwendet beim Filtern die Anzeigenamen der Klimageräte aus Home Assistant. Ihr Detailpanel zeigt bewusst lokale Entitäts-IDs, damit du die Konfiguration überprüfen kannst. Bei aktivierter Standard-Datenschutzoption ersetzen heruntergeladene Berichte sowohl strukturierte IDs als auch IDs in gespeicherten Fehlertexten durch deterministische Aliasnamen wie `climate_unit_1` und `associated_entity_1`. Wiederholte Verweise behalten denselben Alias, sodass Beziehungen nachvollziehbar bleiben, ohne ursprüngliche lokale IDs offenzulegen. Wenn du unveränderte Entitäts-IDs ausdrücklich beibehältst, bleiben diese lokalen Kennungen im Bericht. Profil-, Modus- und Pausenkennungen werden trotzdem entfernt. Prüfe jeden Bericht vor dem Teilen.

Die Diagnose bietet keine Bedienelemente für Zeitplaner, Wiederholungen, Rücknahmen oder Klimageräte. Konfiguration und Wartungsaktionen bleiben in den Einstellungen; Gerätefähigkeiten und Zustandsdetails gehören nun zur Diagnose.

Jedes verwaltete Klimagerät meldet außerdem ausschließlich zur Laufzeit verfügbare Informationen zur Stabilisierung von Befehlen. Während sich ein neuer Velair-Befehl stabilisiert, führt die Diagnose die betroffenen Steuerungsfelder in ihrer Momentaufnahme auf. Hat sich das Klimagerät bis zum begrenzten Ablaufzeitpunkt nicht angeglichen, kennzeichnet die nächste aktuelle Momentaufnahme das Gerät mit der Warnung `command_settling_mismatch`. Der Block `command_settling` im heruntergeladenen Bericht enthält erwartete und beobachtete Werte. Das sind Informationen zur Fehlerbehebung: Die Diagnose wiederholt keinen Befehl, verändert kein Klimagerät und erstellt keine manuelle Anpassung. Ein neuerer Befehl für dieses Feld oder ein Neustart löscht diese Informationen.

<a id="automating-diagnostic-health"></a>
## Diagnosezustand in Automationen verwenden

Velair erstellt eine Entität **Diagnosestatus** mit den Zuständen `ok`, `warning` und `error`. Sie wird aus derselben Backend-Momentaufnahme wie diese Ansicht aktualisiert und fragt nicht regelmäßig ab. Ihre kompakten Attribute enthalten Zeitplanerzustand, Geräteanzahl, Problemanzahl und stabile Problemcodes; unverarbeitete Fehler und betriebliche Kennungen fehlen.

Verwende einen Zustandsauslöser, wenn eine Automation nur den zusammengefassten aktuellen Zustand benötigt. Verwende das Ereignis `diagnostic_issue_changed`, wenn sie auf das Erkennen oder Beheben eines einzelnen Problems reagieren soll, während andere Probleme bestehen bleiben. Ereignisdaten und Beispiele findest du unter [Automationsereignisse](automation-events.de.md#diagnostic-issue-changed).

Jedes verwaltete Klimagerät hat außerdem einen standardmäßig deaktivierten Sensor **Lieferdiagnose**. Er bildet denselben ausschließlich zur Laufzeit verfügbaren Übertragungsstatus und das letzte angenommene Steuerungsziel ab, die die Diagnose verwendet, jedoch ohne unverarbeiteten Fehlertext. Ein angenommenes Ziel bedeutet, dass Home Assistant die dazugehörige Folge von Velair-Dienstaufrufen angenommen hat. Es belegt weder den Zustand des Geräts noch des Übertragungswegs. Room Assist kann das gesendete Ziel anschließend anpassen und stellt diesen Kontext über seinen eigenen Sensor bereit. Übermittlungsinformationen werden nach einem Neustart nie wiederhergestellt und bei einem erfolgreichen Zurücksetzen der Velair-Daten gelöscht. Den vollständigen Zustands- und Attributvertrag, Aktivierungsschritte und Automationsbeispiele findest du unter [Sensoren für Zonensteuerung und Befehlsübermittlung](zone-sensors.de.md#zone-delivery-diagnostics).
