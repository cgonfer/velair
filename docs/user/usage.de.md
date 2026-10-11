<a id="usage-guide"></a>
# Benutzerhandbuch
<!-- velair-docs:start -->
Übersetzungen: [Englisches Original](usage.md) · [Español](usage.es.md) · [Français](usage.fr.md) · [Deutsch](usage.de.md) · [Italiano](usage.it.md) · [Nederlands](usage.nl.md) · [Polski](usage.pl.md) · [Português (Brasil)](usage.pt-br.md) · [Português (Portugal)](usage.pt-pt.md) · [Русский](usage.ru.md) · [Übersetzungsstatus](../translation-status.md)

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

Dieses Handbuch erklärt Velair aus Sicht eines Home-Assistant-Nutzers.

<a id="panel-navigation-and-direct-links"></a>
## Navigation im Panel und direkte Links

Das Seitenleisten-Panel aktualisiert seine URL beim Wechsel zwischen Tabs oder den Unterbereichen von Zeitplänen, Vorlagen und Vorkonditionierung. Beim Neuladen oder Öffnen einer kopierten URL wird der entsprechende Bereich wieder geöffnet. Auch die Vorwärts- und Zurück-Funktionen des Browsers folgen dieser Navigation.

| Bereich | Pfad |
| --- | --- |
| Übersicht | `/velair` |
| Zeitpläne: Standard | `/velair/schedules/default` |
| Zeitpläne: Profile | `/velair/schedules/profiles` |
| Modi | `/velair/modes` |
| Vorlagen: Vorlagen | `/velair/templates/templates` |
| Vorlagen: Klima-Presets | `/velair/templates/presets` |
| Sensoren | `/velair/sensors` |
| Komfort | `/velair/comfort` |
| Vorkonditionierung: Adaptive Vorkonditionierung | `/velair/preconditioning/preconditioning` |
| Vorkonditionierung: Geplante Rückkehr | `/velair/preconditioning/planned-return` |
| Diagnose | `/velair/diagnostics` |
| Einstellungen | `/velair/settings` |

Verwende diese Pfade in Navigationsaktionen eines Home-Assistant-Dashboards oder hänge sie an deine Home-Assistant-Adresse an, um einen vollständigen Link zu erstellen. Das Öffnen eines Links wählt einen Bereich aus; es aktiviert keinen Modus und ändert keine Klimaeinstellungen.

Ein Dashboard-Button kann beispielsweise die Bibliothek der Klima-Presets öffnen:

```yaml
type: button
name: Velair climate presets
icon: mdi:thermometer-lines
tap_action:
  action: navigate
  navigation_path: /velair/templates/presets
```

Ersetze `navigation_path` durch einen beliebigen Pfad aus der Tabelle. Dabei wird die normale [Dashboard-Navigationsaktion](https://www.home-assistant.io/dashboards/actions/) von Home Assistant verwendet. Für ein Lesezeichen oder einen Link aus einer anderen Anwendung verwende deine eigene Home-Assistant-Adresse mit dem Pfad, beispielsweise `https://your-home-assistant.example/velair/schedules/profiles`.

`/velair/schedules` öffnet Standard und `/velair/templates` öffnet Vorlagen. `/velair/preconditioning` öffnet die adaptive Vorkonditionierung. Die Unterbereichsauswahl wechselt zwischen adaptiver Zeitplanvorbereitung und geplanter Rückkehr. `/velair/overview` öffnet die Übersicht und der frühere Pfad `/velair/profiles` die Modi. Ein unbekannter Unterbereich öffnet den Standardunterbereich seines Tabs, ein unbekannter Tab die Übersicht. Die Pfade werden ohne zusätzlichen Verlaufseintrag normalisiert.

Links speichern keine Auswahl einer einzelnen Klimaentität, eines Wochentags, Profils, einer Vorlage oder eines Presets. Nicht gespeicherte Änderungen werden nach dem Neuladen nicht wiederhergestellt. Würde die Navigation Änderungen verwerfen, gelten die bestehenden Rückfragen. Bei Abbruch bleiben Bereich und URL erhalten. Optionale Lovelace-Karten behalten ihre Dashboard-URLs.

Solange das Seitenleisten-Panel geöffnet ist, verwenden seine Tabs gemeinsam die neuesten bestätigten Backend-Daten. Nach dem ersten Laden wiederholt ein Tabwechsel diese erste Abfrage nicht. Aktualisierungen laufen während der Navigation weiter; Rückfragen zu nicht gespeicherten Änderungen gelten weiterhin. Beim Neuladen werden die Daten erneut geladen und Entwürfe gehen verloren.
Optionale Lovelace-Karten verwenden eine eigene Sitzung. Eingebundene Karten derselben Home-Assistant-Verbindung teilen sich die erste Datenabfrage und Live-Aktualisierungen, behalten aber ihre eigenen Bedienelemente und nicht gespeicherten Änderungen. Lovelace kann Karten beim Wechsel zu einer anderen Dashboard-Ansicht eingebunden lassen, sodass sie bei der Rückkehr nicht neu laden müssen. Die gemeinsame Sitzung endet, sobald die letzte Karte entfernt wird. Beim Neuladen beginnt eine neue Abfrage. YAML-Änderungen sind nicht erforderlich.

<a id="help-and-documentation"></a>
## Hilfe und Dokumentation

Unter **Einstellungen → Hilfe und Community** findest du die Dokumentation, können ein Problem in GitHub Issues melden oder Fragen und Vorschläge in Discussions teilen. Das Hilfesymbol neben einer Bereichsüberschrift oder rechts in einer Unterbereichsauswahl öffnet eine kurze Erklärung und den Link **Anleitung öffnen**. Hilfe für eine Unterbereichsauswahl öffnet diesen Bereich nicht und ändert keine Bearbeitungen. Erklärung und Anleitung beziehen sich auf diese Auswahl, auch wenn sie gerade nicht aktiv ist. In den Einstellungen bietet auch das Hilfesymbol für **Externe Anpassungen** die zugehörige Anleitung. Alle Hilfesymbole verwenden ein einheitliches Fragezeichen und werden beim Darüberfahren hervorgehoben. Informationssymbole bieten weiterhin kurze Erklärungen einzelner Felder. Schließe den Hilfedialog mit seiner Schaltfläche, Escape oder einem Klick außerhalb. Der Tastaturfokus kehrt zum Hilfesymbol zurück.

Kurze Erklärungen sind in Velair in allen unterstützten Oberflächensprachen verfügbar, auch ohne Internetverbindung. Die Anleitungslinks verwenden deine Home-Assistant-Sprache, wenn eine Übersetzung verfügbar ist; andernfalls öffnen sie für die jeweilige Anleitung Englisch. Nur bei diesem Rückgriff auf Englisch erscheint **Auf Englisch**. Übersetzte Anleitungen zeigen den Stand des Abgleichs mit dem Original und der sprachlichen Prüfung sowie bei ausstehenden Änderungen einen Link zum englischen Original. Veröffentlichte Release-Builds öffnen die Dokumentation ihres passenden Versions-Tags, Entwicklungsbuilds die aktuelle Dokumentation unter `main`. Dokumentations- und Community-Links öffnen GitHub in einem neuen Tab. Erst beim Öffnen benötigen sie Internetzugang. Diagnoseinformationen oder lokale Konfigurationen werden nicht automatisch hochgeladen.

<a id="concepts"></a>
## Grundbegriffe

Velair verwaltet Zeitpläne für die bei der Einrichtung ausgewählten `climate.*`-Entitäten. Jede ausgewählte Entität ist eine verwaltete Klimazone.

Ein Zeitplan besteht aus Wochentagsblöcken. Ein Block beginnt zu einer bestimmten Uhrzeit und kann:

- eine Solltemperatur setzen, optional mit HVAC-Modus und unterstützten Klimaoptionen wie Lüftermodus, Gerätepreset, Schwenkmodus, horizontalem Schwenkmodus oder Zielluftfeuchtigkeit;
- eine oder mehrere unterstützte Klimaoptionen setzen, ohne eine Solltemperatur zu senden oder den HVAC-Modus zu ändern;
- nur den HVAC-Modus ändern und die Sollwertsteuerung dem Gerät überlassen;
- die Klimaentität ausschalten.

Ein Block bleibt bis zum Beginn des nächsten Blocks im Wochenzeitplan aktiv. Das gilt auch über Mitternacht und an leeren Wochentagen: Vor dem ersten Block eines Tages gilt der letzte Block eines früheren Tages weiter. Die Zeitleiste stellt diesen übernommenen Zeitraum getrennt dar, damit der ursprüngliche Konfigurationstag klar bleibt.

<a id="external-adjustments-and-manual-adjustment"></a>
## Externe Anpassungen und manuelle Anpassung

Für jede Zone lässt sich wählen, was Velair bei einer Änderung des HVAC-Modus oder Sollwerts außerhalb von Velair tun soll, etwa über eine Home-Assistant-Klimakarte, eine Infrarotfernbedienung oder andere Automatisierung. Konfiguriere **Externe Anpassungen** in der Zeile der jeweiligen verwalteten Klimaentität unter **Einstellungen**:

- **Automatisch beibehalten** ist der Standard und wendet die aktuelle Velair-Steuerungsabsicht erneut an.
- **Bis zum nächsten Block** respektiert die Anpassung bis zum Beginn des nächsten wirksamen Blocks.
- **Für eine Dauer** setzt nach der konfigurierten Anzahl von Minuten fort.
- **Bis zur Fortsetzung** wartet auf eine ausdrückliche Aktion.

Während die Steuerung abgegeben ist, zeigt die dauerhafte Automatisch/Manuell-Auswahl der Übersicht **Manuelle Anpassung**. Das ist nicht der Velair-Modus **Manuell**: Dieser beschreibt die Profilauswahl, eine manuelle Anpassung dagegen die aktuelle Steuerungsverantwortung für eine einzelne Klimaentität. Beim Fortsetzen wird der aktive Profilzeitplan, Standardzeitplan oder eine andere aktuelle Steuerungsabsicht des Zeitplaners wieder angewendet. Andere unabhängige Pausengründe bleiben bestehen.

Die Übersicht wählt **Automatische Zeitplanung**, solange Velair die Klimaentität steuert. Wähle **Manuelle Anpassung**, um deren aktuellen Zustand zu halten, ohne zuvor das Gerät ändern zu müssen. Dafür gilt die bereits in den Einstellungen gespeicherte Regel. Ist **Automatisch beibehalten** gespeichert, bleibt eine ausdrückliche manuelle Aktion bis zur Fortsetzung manuell, ohne diese Einstellung zu ändern. Dasselbe bietet `velair.enter_manual_adjustment`. Der Dienst erfasst den aktuellen Heiz-, Kühl-, Aus- oder nativen Bereichszustand und akzeptiert ausschließlich die Entitäts-ID der Klimaentität.

Bei **Automatisch beibehalten** berechnet Room Assist seinen maßgeblichen Sollwert neu und wendet ihn erneut an. Bei einer Regel für manuelle Anpassungen gibt es die Steuerung ab, ohne die Zeitplankorrektur wiederherzustellen. Einzelne Sollwerte und native Sollwertbereiche werden unterstützt.

Die vollständige Anleitung erklärt Erkennungsgrenzen, sämtliche Regeln, wiederholte Anpassungen, Profile und Modi, den Vorrang von temporären Anpassungen und Pausen, Neustartverhalten, genaue Dienst- und Ereignis-YAML sowie schrittweise Praxisabläufe. Siehe [Externe Änderungen und manuelle Anpassung](manual-control.de.md).

Velair berechnet anstehende Ereignisse im Backend und plant über Home Assistant genaue einmalige Rückrufe. Das Frontend erhält Backend-Aktualisierungen über WebSocket und benötigt daher keine ständigen Abfragen.

Während einer geplanten Rückkehr zeigt die Übersicht eine kompakte Haushaltszusammenfassung mit Wochenroutine oder einmaligem Ursprung, aktuellem Ablauf und gegebenenfalls Bestätigungs- oder Ankunftszeit. Wähle diese Zusammenfassung, um die geplante Rückkehr unter Vorkonditionierung zu öffnen. Die Abwesenheitsbedienelemente werden dort nicht dupliziert. Ein Problem kann sichtbar bleiben, auch wenn gerade keine Abwesenheit läuft.

Jede betroffene Klimaentität zeigt ein violettes Signal für geplante Rückkehr, wenn das Backend derzeit die Steuerung durch den Abwesenheitsmodus oder die Ankunftsvorbereitung meldet. Normaler Betriebszustand, Profil und Room-Assist-Informationen bleiben sichtbar. Zukünftige Vorbereitungszeiten sind Vorschauen, kein Signal für aktive Steuerung. Manuelle Steuerung, temporäre Anpassungen, unabhängige Pausen, gestoppte Zeitplanung und externe Ausführung behalten ihren Vorrang. Eine Klimaentität, die unter einem benutzerdefinierten Abwesenheitsmodus einfach ihren Standardzeitplan behält, erhält kein Abwesenheitssignal. Die Anzeige beschreibt die Steuerungsabsicht und bestätigt weder eine erfolgreiche Befehlsübertragung noch das Erreichen des Raum-Sollwerts.

Veröffentlicht eine verwaltete Klimaentität kein `target_temp_step`, zeigt ihre Zeile unter **Einstellungen** die **Temperaturschrittweite**. Velair verwendet standardmäßig `1` und erlaubt die Angabe der tatsächlichen positiven Geräteschrittweite. Es merkt sich die zuletzt von Home Assistant gemeldete gültige Schrittweite. Verschwindet das Attribut, werden vorhandene Dezimalsollwerte daher nicht ungültig. Eine aktuell veröffentlichte Schrittweite hat stets Vorrang. Ein gespeicherter manueller Wert ersetzt bei fehlendem Attribut den gemerkten Fallback. Veröffentlicht die Entität später wieder eine Schrittweite, merkt Velair sich dieses neuere Raster, obwohl der manuelle Fallback gespeichert bleibt.

**Diagnose** im Panel bietet eine schreibgeschützte Momentaufnahme des Zeitplaners und jeder Zone, einen begrenzten Laufzeitverlauf und einen bereinigten JSON-Bericht für Problemmeldungen. Sie erzeugt keine regelmäßigen Abfragen und hängt nicht von Recorder ab. Am Desktop lassen sich Spalten des Laufzeitprotokolls für die aktuelle Sitzung verbreitern. Die Breiten werden nie gespeichert und beim Neuladen zurückgesetzt. Mobil werden dieselben Ereignisse kompakt dargestellt, ohne Bedienelemente für die Spaltenbreite.

Diagnose zeigt auch den Haushaltszustand der geplanten Rückkehr sowie wirksame Beteiligung, Vorbereitungsschätzung und mögliche Aussetzungsgründe der ausgewählten Klimaentität. Eine deaktivierte Wochenroutine ist von der Verfügbarkeit einmaliger Rückkehrpläne getrennt. Die Verlaufskategorie **Geplante Rückkehr** erfasst angenommene Planungen, Bestätigung, bestätigte Abwesenheit, Ankunftsänderungen, Vorbereitungsbeginn, Abschluss, Abbruch und Fehler. Sie teilt sich die bestehende Grenze von 100 Ereignissen und wird bei Neustart geleert; die Kategorieauswahl bleibt gespeichert. Aktualisieren einer Ansicht erzeugt keine Verlaufseinträge. Berichte enthalten diesen Kontext, entfernen aber Modus- und Profilkennungen selbst dann, wenn Entitäts-IDs ausdrücklich enthalten sein sollen.

<a id="home-assistant-entities"></a>
## Home-Assistant-Entitäten

Velair erstellt dauerhafte Home-Assistant-Entitäten als Ergänzung zu seinen kurzlebigen Automatisierungsereignissen:

- **Nächstes geplantes Ereignis** ist ein Zeitstempelsensor für die früheste anstehende Velair-Aktion. Seine Attribute umfassen alle Ereignisse dieses Zeitpunkts, die berechnete Anwendungszeit und die ursprüngliche Zielzeit, wenn adaptive Vorkonditionierung einen Block vorzieht.
- **Zeitplanstatus** beschreibt Leerlauf, Zeitplanbetrieb, Übersteuerung oder Pause. Die Attribute enthalten den globalen Modus und das Ende der Pause. Anstehende Ereignisse und zonenbezogene Übersteuerungen bleiben in ihren eigenen Sensoren, um den Recorder-Verlauf nicht zu duplizieren.
- **Diagnosestatus** ist ein diagnostischer Enum-Sensor mit den Zuständen `ok`, `warning` und `error`. Er enthält nur kompakte Attribute: Zeitplanerzustand, Anzahl unauffälliger Einheiten beziehungsweise Einheiten mit Warnungen oder Fehlern, Problemzahlen und aktive Problemcodes. Dashboards und zustandsbasierte Automatisierungen erhalten damit den aktuellen Zustand ohne unverarbeitete Ausnahmetexte.
- **Aktive Solltemperatur** wird je verwalteter Klimaentität erstellt und zeigt den von Velair aktuell verwalteten Sollwert, einschließlich temporärer Anpassungen und durch Vorkonditionierung bereits gestarteter Blöcke. Die Einheit folgt der Klimaentität. Bei einem nativen Bereich ist der einzelne Sensorwert nicht verfügbar, da kein einzelner Wert korrekt wäre. Verwende stattdessen `target_temp_low` und `target_temp_high`.
- **Raumklima** wird je verwalteter Klimaentität erstellt und zeigt verständliche Zustände wie angenehm, kalt, feucht oder heiß und feucht. Datenqualität und Quellentitäts-IDs sind kompakte Attribute; die ursprünglichen Temperatur- und Luftfeuchtigkeitsmesswerte werden nicht kopiert.
- **Lüftungsmöglichkeit** wird je verwalteter Klimaentität erstellt. Die vorsichtige beobachtende Einstufung beschreibt, ob Außenluft den Raum in Richtung seines konfigurierten Komfortbereichs bewegen könnte. Sie öffnet keine Fenster und steuert keine Klimaentität.
- **Luftqualität** wird je verwalteter Klimaentität erstellt und führt die unabhängige CO2-Bewertung: gut, erhöht, schlecht, nicht verfügbar oder nicht überwacht.
- **Übersteuerung** zeigt, ob die Klimaentität keine Übersteuerung, eine aktive temporäre Anpassung oder eine aktive Zonenpause besitzt.
- **Steuerung** wird je verwalteter Klimaentität erstellt und zeigt die lokale Steuerung `automatic`, eine aktive manuelle Anpassung oder die Ausführung durch einen externen Zeitplananbieter. Seine Attribute liefern den aktuellen Kontext zu Zeitplaner, Profil, Modus und manueller Anpassung.
- **Lieferdiagnose** ist ein je verwalteter Klimaentität erstellter, standardmäßig deaktivierter Diagnosesensor. Er zeigt das letzte nur zur Laufzeit vorhandene Ergebnis einer Klimabefehlsübertragung und den letzten Sollwert, dessen vollständige Dienstaufruffolge Home Assistant angenommen hat. Unverarbeitete Fehlertexte und Aussagen über die tatsächliche Gerätewirkung werden nicht ausgegeben.
- **Start der Vorkonditionierung** ist ein Zeitstempelsensor für den berechneten Start des nächsten oder aktuell vorzeitig gestarteten Blocks. Attribute enthalten geplante Zielzeit, Vorlauf, Richtung, Modellquelle, Solltemperatur und HVAC-Modus.
- **Room Assist** zeigt den aktuellen Laufzeitzustand und kompakten Sollwertkontext, ohne die ursprünglichen Raum- und Klimamesswerte zu duplizieren.
- **Automatische Zeitplanung** und **Modus** sind die beschreibbaren Steuerentitäten. Ausschalten der automatischen Zeitplanung stoppt den Zeitplaner unbefristet, Einschalten setzt den aktiven Zeitplan fort. Ein benutzerdefinierter Modus aktiviert seine zugeordneten Profile; **Standard** leert die aktive Auswahl. **Manuell** bedeutet, dass kein benutzerdefinierter Modus die aktiven Profile bestimmt. Direkte Aktivierung führt normalerweise in diesen Zustand. Velair zeigt ihn als Zustand statt als auswählbare Aktion. Für eine befristete Pause verwende `velair.pause`.

Diese Entitäten verwenden Backend-Momentaufnahmen und Dispatcher-Aktualisierungen; sie fragen Home Assistant nicht regelmäßig ab. Ereignisse eignen sich für Reaktionen auf Übergänge, Entitäten für Abfragen des aktuellen Zustands in Automatisierungen oder Dashboards. Room Assist kann den gesendeten Sollwert nach Annahme des Steuerungssollwerts noch anpassen. Der eigene **Room Assist**-Sensor liefert den Kontext dieser angewandten Anpassung. [Sensorreferenz](sensors.de.md) enthält alle Velair-Sensoren mit Hauptattributen und Beispielen. [Sensoren für Zonensteuerung und Übertragungsdiagnose](zone-sensors.de.md) erläutert genauer Steuerungsverantwortung, Komfort, Lüftung und Übertragung.

Wird eine Klimaentität aus den Integrationsoptionen entfernt, löscht Velair beim Neuladen ihre erzeugten Zonensensoren aus dem Home-Assistant-Entitätsregister. Globale Velair-Entitäten und Entitäten anderer Integrationen sind nicht betroffen. Erneutes Hinzufügen erstellt die Sensoren mit deterministischen eindeutigen IDs neu.

Home Assistant wählt übersetzte Entitätsnamen anhand der Backend-Sprache bei der ersten Erstellung. Nur die Oberflächensprache eines Nutzers zu ändern benennt bestehende Registereinträge nicht um. Du kannst bestehende Entitäten in Home Assistant manuell umbenennen, ohne das Velair-Verhalten zu ändern.

<a id="open-velair"></a>
## Velair öffnen

Nach der Einrichtung erscheint Velair in der Home-Assistant-Seitenleiste.

Das Seitenleisten-Panel ist die empfohlene Oberfläche. Die optionale Lovelace-Karte eignet sich zum Einbetten bestimmter Velair-Bereiche in ein vorhandenes Dashboard.

Die Liste anstehender Ereignisse in der Übersicht zeigt für jede verwaltete Klimaentität das nächste geplante Ereignis, auch vorgezogene Vorkonditionierungsereignisse. Die Liste dient der Übersicht; intern plant Velair weiterhin die früheste fällige Aktion.

Kompakte, anpassungsfähige Zonenkarten zeigen, was Velair und das Klimagerät gerade im Raum tun. Meldet die Entität `hvac_action`, verwendet die Zusammenfassung die aktuelle Geräteaktivität Heizen, Kühlen, Trocknen, Lüften, Leerlauf, Aus, Vorheizen oder Abtauen als Hauptstatus. Anschließend zeigt sie Velairs Zeitplan-, manuelle, Anpassungs-, Pausen-, Vorkonditionierungs- oder Automatik-aus-Zustände, den gemeldeten HVAC-Modus und relevante Zeiten, ohne die Aktivität nochmals als separates Signal zu wiederholen. Fehlt `hvac_action` oder ist es ungültig, zeigt Velair seinen eigenen Laufzeitzustand und leitet daraus keine Geräteaktivität ab.
Jede Karte zeigt zuerst Klimaname und Entitäts-ID, danach das aktive Profil und geordnete Room-Assist-, Komfort-, Luftqualitäts- und Datensignale. Bei sehr breiten Karten teilen sich diese Signale und die kompakte Statuszusammenfassung den Kopfbereich. Bei schmalen Karten, mobil und in kompakten Lovelace-Ansichten bleiben Identität und Kurzstatus nebeneinander; vollständige Profil- und Komfortsignale nutzen darunter eine ganze Zeile, statt ihren Inhalt zu verkürzen. Die Zusammenfassung verwendet ein einheitliches Symbol, ausgewogenen Text und eine zurückhaltende Aktivitätsfarbe ohne feste Überschrift oder dekorative Umrandung.
Bei aktivem oder haltendem Room Assist sind Details nach Temperatur (zuerst Klimaentität, dann Sensor), Sollwert (zuerst Klimaentität, dann Zeitplan) und richtungsabhängiger Abweichung gruppiert. Fehlende Werte entfallen. Neutrale Signale bleiben dezent; Warnfarben kennzeichnen nur Zustände mit Handlungsbedarf.

Die Lovelace-Karte unterstützt folgende `view`-Werte:

- `climate`;
- `overview-status`;
- `overview-boosts`;
- `overview-events`;
- `overview-timeline`;
- `overview-zones`;
- `active-setup`;
- `schedules`;
- `sensors`;
- `comfort`;
- `preconditioning`;
- `planned-return`;
- `diagnostics`.

<a id="planned-return-card"></a>
### Karte für geplante Rückkehr

Füge dieselben Haushalts-Rückkehrbedienelemente wie in der Seitenleiste einem beliebigen Dashboard hinzu:

```yaml
type: custom:velair-card
view: planned-return
```

Während der Abwesenheitsbestätigung erklärt eine Timerzeile die Prüfung, ob das Zuhause leer bleibt, und zeigt deren Backend-Endzeit in der lokalen Home-Assistant-Zeit. Der Abwesenheitsmodus wird erst nach Bestätigung aktiviert, sofern alle Quellen weiterhin Abwesenheit melden. Vor der Bestätigung gibt es weder einen laufenden Countdown noch eine Abwesenheitszeitleiste.

Der visuelle Karteneditor nennt diese Ansicht **Geplante Rückkehr**. Sie zeigt nur die kompakten Bedienelemente für **One-off return**, mit der Anzahl anwesender, abwesender und unbekannter Quellen rechts oben. Die gespeicherte Verzögerung zur Abwesenheitsbestätigung erscheint dort nur vor einer bestätigten aktiven Abwesenheit. Ohne gespeicherte Anwesenheitsquellen entfallen diese Anzeigen: **Plan return** bestätigt die Abwesenheit ausdrücklich und aktiviert den Abwesenheitsmodus sofort, ohne Wartezeit. Die gespeicherte Ankunft steuert weiterhin Vorbereitung und Zielaktivierung; ohne Quellen erkennt Velair keine tatsächliche Heimkehr. Konfigurierte unbekannte oder nicht verfügbare Quellen behalten ihr normales Warteverhalten; die Wochenroutine benötigt Quellen.
Lege vor dem Verlassen oder während deiner Abwesenheit ein zukünftiges Rückkehrdatum mit Uhrzeit fest. Eine aktive Episode bietet nur **Abbrechen** und **Ankunft ändern**. Abbrechen beendet die Rückkehrautomatik und stellt nach bestätigter Abwesenheit die vorherige Modus-/Profilauswahl wieder her. Eine laufende Bestätigung ändert die Auswahl noch nicht. Beginne etwa im Modus Comfort mit fünf Minuten Verzögerung: Abbruch nach zwei Minuten lässt Comfort aktiv; Abbruch nach Aktivierung von Away stellt Comfort mit seinen ursprünglichen Profilen wieder her. Siehe die [Abbruchbeispiele](planned-return.de.md#cancelling-a-return-examples), einschließlich Starts ohne Sensoren, Ankunftsänderungen und ausdrücklicher Modusauswahl.
Nach Abschluss oder Abbruch zeigt die Karte ein neues Datums-/Uhrzeitformular, auch wenn die Haushaltsanwesenheit weiterhin vollständige Abwesenheit meldet. **Plan return** bleibt sichtbar, ist aber deaktiviert, wenn gespeicherte Konfiguration oder Zeitplaner nicht verfügbar sind. Die Seitenleiste verwendet dieselben Schaltflächen zum Abbrechen und Ändern der Ankunft sowie dasselbe neue Formular. Nur die abschließenden Anwesenheits-/Verzögerungsanzeigen sind kartenspezifisch; die Seitenleiste bietet vollständige Wochen-, Anwesenheits- und Vorbereitungseinstellungen.
Beide Ansichten zeigen einen kompakten Phasenuntertitel am Titel und einen nativen Tooltip zur Erklärung. Während der Bestätigung liefert die Prozessüberschrift diesen Kontext. Vor bestätigter Abwesenheit kennzeichnen ein zugängliches Ankunftssymbol und **Expected arrival** die gespeicherte Rückkehr, ausgerichtet mit Titel und Zustand. Der gespeicherte Wert erscheint als kompakter anklickbarer Chip ohne Stift oder Unterstreichung. Die bestätigte Grafik verwendet dagegen ein unterstrichenes Datum mit Uhrzeit und vorangestelltem Stift. Beides öffnet denselben Ankunftseditor.
Die blaue Schaltfläche **Zurück** mit Linkspfeil in der Aktionszeile verwirft die Ankunftsbearbeitung und schließt sie lokal. Die zuletzt gespeicherte Ankunft wird wiederhergestellt; Warnung und Navigationsschutz für diese Bearbeitung werden aufgehoben. Unabhängige nicht gespeicherte Routineänderungen bleiben geschützt. Erneutes Öffnen beginnt mit dem gespeicherten Wert. Erfolg schließt den Editor, fehlgeschlagenes Speichern und Live-Aktualisierungen erhalten den Entwurf. Abwesenheits- und Ankunftswerte verwenden dieselbe Typografie.
**Abbrechen** ist eine kompakte rote Schaltfläche mit weißer Schrift unter den Episodendaten links. Sie erscheint nur bei abbrechbarer aktiver Rückkehr und geschlossenem Editor. Beim Bearbeiten schließt **Zurück** links den Editor; **Ankunft ändern** bleibt rechts auf kompakter grüner Fläche. Beide besitzen 32 Pixel große sichtbare Flächen innerhalb 44 Pixel großer Berührungsziele. Die Anwesenheitsanzeigen bleiben rechts oben; die Verzögerungsanzeige verschwindet nach bestätigter Abwesenheit.

Konfiguriere Anwesenheitsquellen, Modi, Abwesenheitsbestätigung und Wochenroutine unter **Vorkonditionierung > Geplante Rückkehr** in der Seitenleiste. Die Karte verwendet diese gespeicherte Haushaltskonfiguration und zeigt weder Konfigurationsfelder noch den Schalter der Wochenroutine. Thermostat-Anzeigefilter begrenzen diese Haushaltskarte nicht. Dashboard und Seitenleiste ändern dieselbe Backend-Episode; Ankunftsentwürfe bleiben bis zum Absenden lokal in der jeweiligen offenen Karte.

Während bestätigter Abwesenheit stehen Abwesenheits- und Ankunftssymbole an den Enden der Zeitleiste. Gespeicherte Zeiten stehen direkt darunter, die Ankunft behält ihren Stift. **Zurück** schließt den Editor über die Aktionszeile; neben der Zeit gibt es kein Schließelement. Schlichte Modusbezeichnungen mit Symbol unter den Zeiten kennzeichnen Away/Return ohne wiederholte Beschriftung. Die Zeitleiste zeigt die tatsächlich bestätigte Abwesenheit und gespeicherte Rückkehrzeit sowie die Namen der zugehörigen Abwesenheits- und Rückkehrmodi.
Der aktuelle Zeitpunkt besitzt den übersetzten Tooltip **Jetzt** und markiert die vergangene UTC-Zeit zwischen den Endpunkten, begrenzt auf die Leiste. Daten erscheinen, wenn Abwesenheitsbeginn und Ankunft in der Home-Assistant-Zeitzone an verschiedenen Tagen liegen. Eine bearbeitete Ankunft verschiebt den Endpunkt erst nach Annahme durch das Backend. Ausstehende, abgeschlossene, abgebrochene, übersprungene oder fehlerhafte Rückkehrpläne haben keine laufende Leiste. Solange Karte oder Seitenleiste sichtbar sind, aktualisiert sich die lokale Uhr einmal pro Minute; Home Assistant wird nicht regelmäßig abgefragt. Die farbige Strecke stellt Zeit dar, keinen Raumtemperaturfortschritt.
Fehlt ein zuverlässiger erster Startzeitpunkt, erklärt ein kleiner Informationsbutton neben dem Titel **One-off return** ausgesetzte, erreichte, nur bei Ankunft beteiligte oder ausgeschlossene Räume, sofern die aktuelle Vorschau diese Aussage stützt. Fehlende oder widersprüchliche Angaben ergeben keine eindeutige Aussage. Am Desktop öffnen Darüberfahren oder Fokus die Hilfe, mobil ein Tippen. Escape oder eine Interaktion außerhalb schließt sie.
Eine Backend-Schätzung kann eine Uhrmarkierung für die geschätzte Vorbereitung des frühesten geeigneten Raums ergänzen. Die dezent blaue Beschriftung lässt sich erweitern und zeigt geeignete Räume mit geschätzten Startzeiten in zeitlicher Reihenfolge. Sie beginnt eingeklappt; jeder Raum kann gesondert starten. Gewöhnliche Aktualisierungen lassen die Liste offen, eine geänderte gespeicherte Ankunft oder Episode klappt sie ein. Ankunftsbearbeitung blendet Hinweis und Ersatzhilfe aus, erhält aber die gespeicherte Zeitleistenschätzung. **Zurück** stellt den Aufklappzustand derselben Episode wieder her. Es handelt sich um eine Orientierungsschätzung, nicht um tatsächlichen HVAC- oder Wärmefortschritt. Wochenzusammenfassung, Quellenliste und Vorbereitungsdetails bleiben in der Seitenleiste.

<a id="climate-status-and-control-card"></a>
### Karte für Klimastatus und Steuerung

Verwende `view: climate` für eine kompakte Karte einer einzelnen von Velair verwalteten `climate.*`-Entität. Sie folgt dem aktiven Home-Assistant-Theme über dessen Farb- und Oberflächenvariablen und passt sich an helle und dunkle Themes sowie Mobil-, Tablet- und Desktopansichten an.

Die Karte kombiniert vom Gerät gemeldete Temperatur, Luftfeuchtigkeit, HVAC-Modus und `hvac_action` mit Velairs aktueller Steuerungsverantwortung und Laufzeitdaten. Sie verwendet dieselbe wirksame Tageszeitleiste, dasselbe Profilsymbol und dieselbe Profilfarbe wie die Übersicht. Modus-, Profil-, Komfort-, Room-Assist- und Vorkonditionierungsinformationen erscheinen nur, wenn sie konfiguriert und relevant sind. Eine extern ausgeführte Klimaentität zeigt Anbieter und Veröffentlichungsstatus statt rein lokaler Velair-Funktionen oder klimabezogener Aktionen. Die optionale einmalige Rückkehraktion steuert den Haushalt unabhängig davon, wer die ausgewählte Klimaentität steuert.

```yaml
type: custom:velair-card
view: climate
selected_entity: climate.living_room
climate_name: Living room
climate_humidity_entity: sensor.living_room_humidity
climate_outdoor_temperature_entity: sensor.outdoor_temperature
climate_window_entities:
  - binary_sensor.living_room_window
  - binary_sensor.patio_door
climate_window_display: grouped
climate_room_assist_display: both
climate_preconditioning_display: both
climate_show_control_mode: true
climate_show_target_control: true
climate_show_hvac_mode_control: true
climate_show_native_climate_link: true
climate_actions:
  - type: boost
  - type: pause
    placement: more
  - type: planned-return
    enabled: true
  - type: script
    name: Ventilate room
    script: script.ventilate_living_room
    icon: mdi:window-open-variant
    color: "#03a9f4"
    confirmation: true
    placement: auto
```

Die Klimasteuerungsfläche kombiniert geordnete Schnellaktionen mit einer unabhängig konfigurierbaren Automatisch/Manuell-Auswahl nach demselben Verantwortungsmodell wie die Übersicht. Der untere Bereich bündelt HVAC-Modus, aktuellen Sollwert bei eingeschalteter Klimaentität und den Link zum nativen Home-Assistant-Klimadialog. Jeder veröffentlichte HVAC-Modus erscheint mit Symbol. Direkte Änderungen bleiben schreibgeschützt, solange Velair den aktiven Zeitplan steuert: Wähle zuerst **Manuell**, warte die Bestätigung der manuellen Anpassung ab und verwende anschließend Sollwert- und Modusbedienelemente. **Automatisch** setzt die Zeitplanung fort.
Temporäre Anpassungen, unabhängige Pausen, gestoppte und nicht verfügbare Zustände verhindern direkte Bearbeitung und zeigen eine Erklärung. Die interne Pause der manuellen Anpassung selbst blockiert diese Bedienelemente nicht. Extern ausgeführte Zonen behalten den nativen Home-Assistant-Link; eine aktivierte einmalige Rückkehraktion kann weiterhin die Haushalts-Abwesenheitsbedienelemente öffnen.

Einzelne Sollwerte und native `heat_cool`-Bereiche werden unterstützt. Bereichsänderungen senden beide Grenzen gemeinsam. Velair verwendet die von der Klimaentität veröffentlichten `min_temp`, `max_temp` und `hvac_modes`. Sollwertänderungen verwenden `target_temp_step`, sofern veröffentlicht. Verschwindet das Attribut, gilt die zuletzt gemeldete gültige Schrittweite weiter, damit vorhandene Dezimalsollwerte gültig bleiben. Danach folgt der manuelle Zonen-Fallback aus den Einstellungen, schließlich `1`, wenn nie eine Schrittweite gemeldet oder konfiguriert wurde. Velair erfindet keine HVAC-Modi.

Vor der geordneten Aktionsliste erstellte Karten verwendeten `climate_show_boost_action`, `climate_show_pause_action` und `climate_custom_actions`. Velair liest diese älteren Felder weiterhin. Der visuelle Editor schreibt bei Änderung der Aktionsliste `climate_actions`.

**One-off return** ist eine weitere von Velair bereitgestellte Aktion. Sie unterstützt dieselben Sichtbarkeits-, Namensausblendungs- und Automatisch/Mehr-Platzierungsoptionen wie temporäre Anpassung und Pause. Der Editor listet bereitgestellte Aktionen zuerst auf: temporäre Anpassung, Pause und einmalige Rückkehr, auch ausgeblendete Aktionen. Die einmalige Rückkehr verwendet zur Unterscheidung von Pause einen violetten Akzent. Öffnen ersetzt den unteren Steuerungsbereich durch das kompakte Abwesenheitsformular oder die Zeitleiste und Bedienelemente der aktuellen Episode. Das X schließt den Bereich und zeigt wieder die Klimasteuerung; eine aktive Abwesenheit wird dadurch nicht abgebrochen. Nicht gespeicherte Ankunftsänderungen erfordern vor dem Schließen eine Bestätigung; eine laufende Aktion muss zuerst abgeschlossen werden. Abwesenheitseinstellungen und Auswirkungen gelten für den ganzen Haushalt, nicht nur die ausgewählte Klimaentität.

Die Bereiche für temporäre Anpassung, Pause und einmalige Rückkehr schließen wie die normalen Thermostatbedienelemente an Rand und Oberfläche der Werkzeugleiste an. Direkte reine Symbolaktionen behalten ihre kompakte Breite und zentrieren ihr Symbol. Beim Öffnen eines Bereichs kommt Platz für dessen Schließsymbol hinzu.

Vorhandene Karten behalten diese Aktion ausgeblendet, bis sie ausdrücklich aktiviert wird. Über die Home-Assistant-Kartenauswahl neu erstellte Karten haben sie in der anfänglichen Aktionsliste aktiviert. Das gilt auch, wenn die Ansicht dieser neuen Karte auf `climate` geändert wird. Eine YAML-Karte ohne `planned-return`-Aktion blendet sie aus. Aktiviere sie im visuellen Editor oder füge die oben gezeigte Aktion hinzu.

Der Editor belässt bereitgestellte Aktionen in ihrem festen Abschnitt und bietet Sortierbedienelemente für benutzerdefinierte Aktionen. Öffnen des Editors sortiert die gespeicherte Dashboard-Aktionsliste nicht um.

Standardmäßig verwenden aktuelle Luftfeuchtigkeit und Verlaufslink die Attribute der gewählten Klimaentität. Mit `climate_humidity_entity` verwende stattdessen Live-Wert und nativen Home-Assistant-Verlauf eines eigenen Luftfeuchtigkeitssensors. Velair leitet diese Zuordnung nicht selbst ab, da Home-Assistant-Integrationen sie nicht einheitlich veröffentlichen.

Außentemperatur- und Fensterentitäten sind optionaler Dashboard-Kontext. Die Karte entdeckt, verwaltet oder automatisiert sie nicht. Fensterzustände dienen ausschließlich der Information, auch wenn eine separate Automatisierung oder der [Fenster-Blueprint](blueprints/pause-zone-for-open-windows.de.md) diese Entitäten verwendet. Setze `climate_window_display` auf `grouped` oder `individual`. Der visuelle Editor bietet separate Kontrollkästchen für Außenmesswert und Fenster und zeigt den jeweiligen Bereich erst nach Auswahl einer Entität.
Die gesamte Überschrift des aktuellen Zustands klappt den geöffneten Bereich ein. Kompakte Messwerte und Kontext verwenden umbrechende Chips statt horizontalem Scrollen, sodass jeder aktivierte Sensor auch bei geringer Breite sichtbar bleibt. Eine verfügbare Komfortbewertung erscheint als eigene beschreibende Zeile unter der eingeklappten Überschrift mit Zustand, passendem Komforthinweis, Symbol und Zustandsfarbe. Der Karteneditor kann aktivierte abgeleitete Komfortwerte ebenfalls dort zeigen; andernfalls bleiben sie im aufgeklappten Bereich. Bei nicht verfügbarer Bewertung entfällt die Komfortzeile. Das Aufklappelement bleibt fest stehen, während die Chips so viele kompakte Zeilen verwenden, wie die Kartenbreite erfordert. Dieser Anzeigezustand gilt nur für die laufende Kartensitzung.
Der aktuelle Zustand beginnt standardmäßig eingeklappt. Der visuelle Editor kann stattdessen einen aufgeklappten Start wählen; manuelles Ein- und Aufklappen bleibt möglich.

Der visuelle Editor folgt derselben Reihenfolge wie die Karte. Er kann Zustandsleiste, Klimaname, Betriebszustand, einzelne Thermostatbedienelemente und Aktionen, aktuelle Temperatur, Luftfeuchtigkeit, Außenwert, Fenster, Komfort, optionale Komfortwerte in der eingeklappten Ansicht, Zeitleiste, Room Assist und Vorkonditionierung unabhängig ausblenden. Der Klimaname lässt sich durch eine nur für die Karte geltende Beschriftung ersetzen, auch eine leere, und auf den aktuellen Entitäts-Anzeigenamen zurücksetzen. Sind alle Elemente des aktuellen Zustands deaktiviert, entfällt der gesamte Bereich. Nicht angegebene Sichtbarkeitswerte bedeuten sichtbar, damit bestehende Karten ihr Aussehen behalten.
Jeder sichtbare aktuelle Temperatur- oder Luftfeuchtigkeitswert besitzt einen kompakten Link zum nativen Home-Assistant-Verlauf seiner Quelle. Mit dem Wert entfällt auch der Link. Jede Konfigurationskategorie lässt sich einklappen; einzelne eigene Skriptaktionen bleiben eingeklappt, bis sie bearbeitet werden müssen. Das hält den Editor auf schmalen Bildschirmen handhabbar. Ein anderes Skript zu wählen aktualisiert den Aktionsnamen aus dessen Entität; danach ist er erneut anpassbar. Der Velair-Link im Kopfbereich bleibt immer vorhanden, damit die Karte erkennbar ist und ein einheitlicher Weg zur Integration besteht. Jede direkte Aktion kann ihren sichtbaren Namen ausblenden und auf einen Symbolbutton reduziert werden. Zugängliche Beschriftung und vollständiger Name im Menü **Mehr** bleiben erhalten.

Schnellaktionen teilen sich die obere Steuerungszeile mit der Automatisch/Manuell-Auswahl, bleiben aber in einer eigenen Gruppe am gegenüberliegenden Ende dieser Zeile, bei jeder Kartenbreite. Überschreiten ihre Beschriftungen den Platz, behalten die vollständigen Texte ihre natürliche Breite; die Gruppe scrollt horizontal statt umzubrechen oder zu kürzen. Temporäre Anpassung oder Pause ersetzen den normalen Thermostatbereich an derselben Stelle. **Abbrechen** oder ein erneuter Druck auf die gewählte Aktion stellt die normalen Bedienelemente wieder her.
Die native Scrollleiste bleibt verborgen. Bei Überlauf erscheinen Richtungsbedienelemente in festen äußeren Plätzen nur, solange weitere Aktionen außerhalb des sichtbaren Bereichs liegen. Sie überdecken oder verändern die Aktionszeile nicht; passen alle Aktionen, entfallen diese Plätze vollständig. Die Zeile unterstützt Wischen und Ziehen mit Maus oder Stift, ohne die zum Beginn des Ziehens verwendete Aktion auszuführen. Skriptaktionen bestätigen angenommene Ausführung oder Fehler kurz direkt am Button; eine offene temporäre Anpassung oder Pause zeigt ein Schließsymbol.

Der Klimakopf verwendet die aktuelle Betriebsaktivität als vorrangiges visuelles Signal und bündelt Aktivität, Ausführungsquelle und HVAC-Modus unter dem Klimanamen. Eine kompakte Velair-Kennung verlinkt zum Hauptpanel und zeigt Projektname und Autor bei jeder Breite auf zwei Zeilen.

Zeitleiste und Room Assist verwenden die zugehörigen Velair-Grafiken, einschließlich horizontalem Scrollen auf schmalen Bildschirmen. `climate_room_assist_display` kann `text`, `chart` oder `both` sein: kurze Laufzeiterklärung, Temperaturgrafik oder beides. Der Room-Assist-Zustand bleibt stets neben dem Titel; eine aktivierte Erklärung nutzt eine zweite Zeile. Nur Ansichten mit Grafik lassen sich einklappen. Reiner Text bleibt sichtbar und erhält kein irreführendes Aufklappelement.

`climate_preconditioning_display` folgt demselben Modell `text`, `chart` oder `both`. Die Überschrift zeigt weiter den geplanten oder aktiven Zustand; die optionale zweite Zeile nennt Sollwert und berechneten Start. Reine Grafikansicht behält nur den Zustand über der aufklappbaren Vorschau. Beide Grafikbereiche beginnen eingeklappt, sofern nichts anderes konfiguriert ist. Die Option für den Anfangszustand erscheint im visuellen Editor nur bei gewählter Grafik. Zeitleistentitel, aktives Profil und aktiver Modus behalten eigene Sichtbarkeitsoptionen; Modus- und Profilchips verwenden eine geringere kartenspezifische Höhe. Manuelles Aufklappen bleibt lokal in der laufenden Kartensitzung.

Die temporäre Anpassung öffnet ein Kartenformular für alle von Klimaentität und Dienst unterstützten Optionen: Sollwert oder Bereich, Dauer, HVAC-Modus, Lüfter, Preset, Schwenken, horizontales Schwenken und Luftfeuchtigkeit. Pause erlaubt eine befristete oder unbefristete Dauer und die Wahl zwischen unveränderter Klimaentität und Ausschalten. `pause_id` wird in der Karte nicht angeboten; es identifiziert Pausengründe von Automatisierungen. Könnte eine Pause einen anderen Verantwortlichen oder Grund besitzen, öffnet die Karte Velair, statt Gründe stillschweigend zu löschen. Manuelle Steuerung kann aus der Karte zur automatischen Steuerung zurückkehren.
Diese lokalen Aktionen werden für extern ausgeführte Zonen nie gezeigt. Temporäre Anpassung und Pause/Fortsetzen lassen sich unabhängig ausblenden und in derselben geordneten Aktionsliste wie Skriptlinks verschieben. Verhalten, Beschriftungen, Symbole und Formulare liefert Velair; sie sind nicht anpassbar.

Die Aktionsliste kann auch selbst ausgewählte Home-Assistant-Entitäten `script.*` enthalten. Jeder Link besitzt einen kartenspezifischen Namen, ein MDI-Symbol, eine Farbe und optional eine Bestätigung. Velair speichert nur diese Darstellungseinstellungen in der Lovelace-Karte und startet die gewählte Entität über `script.turn_on`. Skript, Berechtigungen und Aktionen verbleiben bei Home Assistant. Die Karte akzeptiert kein beliebiges JavaScript, Templates, Dienstdaten oder eingebettete Aktionsfolgen. Skriptlinks müssen daher ohne erforderliche Eingabefelder ausführbar sein. Definiere nötige Werte im Home-Assistant-Skript oder hinterlege dort Standardwerte.
Jede Aktion kann `placement: auto` oder `placement: more` verwenden. Automatische Aktionen belegen die ersten drei verfügbaren direkten Plätze und wandern bei voller Belegung nach **Mehr**. Mit `more` zugewiesene Aktionen bleiben unabhängig von ihrer Listenposition immer in diesem Menü. Die Grenze von drei Plätzen ist fest und keine weitere Anzeigeeinstellung. **Mehr** entfällt, wenn es keine Aktionen enthält. **Velair öffnen** bleibt sein fester letzter Eintrag und lässt das Menü allein nicht erscheinen. Skriptlinks bleiben bei extern ausgeführten Zonen verfügbar, da sie unabhängige Home-Assistant-Aktionen sind. Velair-spezifische Aktionen behalten ihre üblichen Einschränkungen bezüglich Steuerungsverantwortung und Verfügbarkeit.

Die dünne Linie oben kennzeichnet den Betriebszustand, keinen Fortschritt. Heizen und Vorheizen verwenden einen warmen, Kühlen einen kühlen Akzent; Trocknen und Lüften bleiben gleichmäßig. Leerlauf ist eine abgeschwächte Darstellung des aktiven Modus, Aus neutral, Nicht verfügbar eine unterbrochene Fehlerdarstellung. Bewegung weist kurz auf einen Zustandswechsel hin und entfällt bei gewünschter reduzierter Bewegung. Der HVAC-Modus `off` hat Vorrang vor einer veralteten Aktivität `idle`: Die Karte zeigt **Aus** mit Ein-/Aus-Symbol. Leerlauf bei weiterhin aktivem Modus verwendet ein neutrales Thermostatsymbol und ähnelt keiner Velair-Pause.

Zonenbezogene Lovelace-Karten können die angezeigten Thermostate begrenzen. Das ist nur ein Dashboard-Anzeigefilter und ändert weder gespeicherte Zeitpläne noch das Zeitplanerverhalten. Globale Karten wie `overview-status` und `active-setup` zeigen im Editor keine Thermostat- oder Wochentagsauswahl, da sie nicht einem einzelnen Thermostat oder Zeitplaneditor zugeordnet sind.

Füge `view: active-setup` unabhängig von der Zeitplanstatuskarte hinzu. Im visuellen Editor oder mit `active_setup_controls` wähle, ob die aktive Konfiguration `modes`, `profiles` oder `both` ändern kann:

```yaml
type: custom:velair-card
view: active-setup
active_setup_controls: profiles
```

Standard ist `both`; jede Variante zeigt weiterhin aktuellen Modus und angewandte Profile. Die reine Profilauswahl behält eine Aktion für Standardzeitpläne. Direkte Auswahl eines Profils ersetzt alle zuvor aktiven Profile und setzt den Modus auf Manuell. Nicht mehr vom neuen Profil abgedeckte Zonen kehren zum Standardzeitplan zurück, statt die Konfiguration des vorherigen Modus zu behalten. Verwende einen Modus, wenn mehrere nicht überlappende Profile gemeinsam aktiviert werden sollen.

```yaml
type: custom:velair-card
view: preconditioning
entities:
  - climate.living_room
  - climate.bedroom
zone_order:
  - climate.bedroom
  - climate.living_room
```

Fehlt `entities`, zeigen zonenbezogene Karten alle von Velair verwalteten Thermostate.

Bei `view: sensors` kann der Karteneditor Ein-/Aus-Schalter, Raumsensorauswahl, Room-Assist-Totband, maximale Korrektur, Aktualisierungsverzögerung oder Live-Statusbereich ausblenden. So kann eine Dashboard-Karte rein zur Anzeige dienen oder kompakter sein.

Bei `view: comfort` kann der Editor die Karte auf ausgewählte Thermostate begrenzen und Konfigurationsbereich sowie Temperatur-, Luftfeuchtigkeits- und CO2-Grafik unabhängig ausblenden. Diese Dashboard-Anzeigeoptionen ändern weder Komforteinstellungen noch überwachte Sensoren, Schwellenwerte, Ereignisse oder erzeugte Home-Assistant-Entitäten.

```yaml
type: custom:velair-card
view: comfort
entities:
  - climate.living_room
show_comfort_configuration: false
show_comfort_temperature: true
show_comfort_humidity: false
show_comfort_co2: true
```

<a id="create-a-daily-schedule"></a>
## Einen Tageszeitplan erstellen

Beim Öffnen von **Zeitpläne** wählt Velair den aktuellen lokalen Wochentag. Die Auswahl bleibt beim Wechsel zwischen Thermostaten, Standard- und Profilzeitplänen oder bei aktualisierten Backend-Daten erhalten.

1. Wähle die zu konfigurierende Klimaentität.
2. Wähle den Wochentag.
3. Wähle für unabhängige Blöcke **Eigener Zeitplan** oder eine Vorlage mit **Nur Zeiten** beziehungsweise **Zeiten und Einstellungen**. Für unabhängige Blöcke fahre wie folgt fort.
4. Füge einen Block hinzu.
5. Wähle die Startzeit.
6. Wähle einen HVAC-Modus oder belasse **Aktuellen Modus beibehalten**.
7. Gib eine Solltemperatur oder einen Bereich ein oder wähle Klimaoptionen ohne Sollwert.
8. Speichere.

Unter den zusätzlichen Einstellungen kann ein **Velair-Preset** die Klimakonfiguration liefern, während die Blockzeit unabhängig bleibt. Verknüpfte Tage folgen dem gewählten Vorlagenumfang. Lies vor der Wahl zwischen Kopieren und Verknüpfen die [vollständigen Regeln](linked-schedules.de.md) und [praktischen Haushaltsbeispiele](linked-schedule-examples.de.md).

Nach Auswahl eines ausdrücklichen HVAC-Modus außer Aus deaktiviert der kompakte Thermometerbutton in der Sollwertzelle die Temperatureingabe. Das graue Feld zeigt dann einen Strich. Der Block ruft ausschließlich `climate.set_hvac_mode` von Home Assistant auf, ohne einzelnen Sollwert oder Bereich. Das ist etwa bei `auto` nützlich, wenn Integration oder Gerät das eigene Programm fortsetzen sollen. Die Option steht aber für jeden von der Entität gemeldeten HVAC-Modus außer Aus bereit. Derselbe Button aktiviert die Eingabe wieder und stellt den vorherigen Sollwertentwurf her. Dieser muss gültig sein, bevor der Zeitplan gespeichert werden kann. Vorhandene Blöcke behalten ihr bisheriges Sollwertverhalten.

Reine Modusblöcke verwenden weder Vorkonditionierung noch Room Assist, da kein Temperatursollwert zum Erreichen oder Anpassen vorliegt. Optionale Klimaeinstellungen sind ebenfalls nicht verfügbar, damit die gespeicherte Aktion eine eindeutige HVAC-Modusänderung bleibt. Externe Zeitplananbieter müssen diese Aktion ausdrücklich unterstützen. Velair wandelt sie niemals in einen Temperaturblock um.

Um ein Gerätepreset oder eine andere Klimaoption ohne Solltemperatur zu planen, wähle die Option in den zusätzlichen Blockbedienelementen und deaktiviere die Sollwerteingabe. Der Block kann Preset, Lüfter, Schwenken, horizontales Schwenken und Zielluftfeuchtigkeit kombinieren. Er ruft nur die entsprechenden Home-Assistant-Klimadienste auf, sendet kein `climate.set_temperature`, ändert keinen HVAC-Modus und schaltet eine ausgeschaltete Klimaentität nicht ein. Mindestens eine unterstützte Option ist erforderlich. Direkte Änderungen dieser Optionen zwischen geplanten Ereignissen stellt Velair nicht sofort wieder her. Reine Optionsblöcke verwenden weder Vorkonditionierung noch Room Assist. Bei mehreren Bedienelementen erhält Home Assistant nacheinander separate Dienstaufrufe. Schlägt ein späterer Aufruf fehl, können frühere Optionen bereits geändert sein; Velair meldet die fehlgeschlagene Übertragung.

Beim Anwenden einer Vorlage oder eines Profils auf eine andere Klimaentität bleiben deren unterstützte Optionen erhalten. Bleibt bei einem reinen Optionsblock keine übrig, wird der Zielzeitplan abgewiesen, statt eine leere Aktion zu speichern.

Der Zeitplaneditor verwendet die Fähigkeiten der gewählten Klimaentität. Nicht unterstützte Modi werden nicht angeboten; Temperaturen sind auf deren Grenzen beschränkt.

In einem Temperaturblock sendet **Aktuellen Modus beibehalten** den Sollwert und gewählte Klimaoptionen, ohne bei eingeschaltetem Gerät einen anderen Modus anzufordern. Ist die Klimaentität aus, startet Velair sie im ersten unterstützten, zum Sollwert passenden Modus. Ein Keep-Block lässt sich speichern, wenn mindestens ein unterstützter Modus außer Aus zum Sollwerttyp passt. Das garantiert jedoch nicht, dass der beim Ausführen aktive Modus kompatibel ist. Kann dieser Modus den Sollwert nicht annehmen, schlägt die Übertragung fehl, ohne einen anderen Modus zu wählen.
Einige Integrationen melden ihre Unterstützung für einzelne Solltemperaturen erst nach Modusstart. Velair startet deshalb zuerst den kompatiblen Modus und überlässt gerätespezifische Fehler dem Home-Assistant-Dienst. Native Bereiche benötigen weiterhin ausdrücklich gemeldete Bereichsunterstützung. Velair wandelt weder einen einzelnen Sollwert in einen Bereich noch einen Bereich in einen einzelnen Sollwert um.

Gewählte Klimaoptionen bleiben im Editor in einer kompakten Zeile sichtbar. Öffne bei einem Block mit Optionen dessen Optionsbedienelement, um Sollwert (sofern vorhanden), HVAC-Modusbehandlung und gewählte Optionen zu sehen. Die Erklärung stellt auch klar, dass aus einer einzelnen Temperatur kein Bereich wird. Dies gilt für Zeitpläne, Profile und Vorlagen.
Der Editor warnt ohne Speichersperre, wenn ein früherer Block desselben Tages einen möglicherweise nicht zum Sollwerttyp passenden Modus wählt. Bestimmt kein früherer ausdrücklicher Modus- oder Ausschaltblock den Modus, verwendet der Hinweis den aktuellen Klimamodus. Da er sich vor Blockstart ändern kann, ist die Warnung bedingt.

Temperaturblöcke enthalten entweder eine einzelne Solltemperatur oder einen vollständigen unteren und oberen Bereich. Der Editor nutzt die veröffentlichten Fähigkeiten und erstellt neue `heat_cool`-Blöcke bei entsprechender Unterstützung standardmäßig als Bereich. Ein Bereich erscheint beispielsweise als `20–24 °C`. Velair erfindet keinen Bereich aus einer einzelnen Temperatur und weist unvollständige, vertauschte oder inkompatible Sollwerte vor dem Senden ab.

Native Bereiche sind in dieser ersten Phase auf `heat_cool` beschränkt. Velair nimmt nicht an, dass der Gerätemodus `auto` dasselbe Modell mit unterem und oberem Sollwert verwendet.

Veröffentlicht die gewählte Klimaentität zusätzliche Bedienelemente, zeigt der Blockeditor diese ebenfalls. Eine Klimaanlage kann etwa Lüfter-, Preset-, Schwenk- und horizontalen Schwenkmodus sowie Luftfeuchtigkeit anbieten. Velair speichert und sendet ausschließlich unterstützte Optionen; nicht unterstützte werden weggelassen und nicht blind gesendet.

Bei **Aus** werden Sollwertfelder nicht verwendet, da der Block die Klimaentität ausschaltet.

<a id="timeline-editing"></a>
## Zeitleiste bearbeiten

Die Zeitleiste stellt den ausgewählten Tag über 24 Stunden dar.

- Ziehe einen Block, um seine Startzeit zu verschieben.
- Ziehe einen Blockrand, um den Zeitraum zwischen benachbarten Blöcken zu ändern.
- Verwende die Blockliste für genaue Uhrzeit-, Modus- und Temperaturangaben.

<a id="preconditioning"></a>
## Vorkonditionierung

Für anwesenheitsabhängige Abwesenheit mit vorkonfigurierten wöchentlichen oder einmaligen Ankünften siehe [Geplante Rückkehr](planned-return.de.md). Konfiguriere die Routine im entsprechenden Unterbereich der Vorkonditionierung. Dessen Live-Status zeigt einzelne Quellenzustände und erlaubt einmalige Ankunftsänderungen, ohne die gespeicherte Woche zu bearbeiten. **Plan return** kann auch bei deaktivierter Wochenroutine mit einmaliger Ankunftszeit auf bestätigte Abwesenheit warten. Ohne gespeicherte Anwesenheitsquellen aktiviert der ausdrückliche Start den Abwesenheitsmodus sofort; normale Vorbereitung und gespeicherte Ankunft werden weiterhin ausgeführt.

Vorkonditionierung lässt Velair einen geplanten Komfortsollwert für eine verwaltete Klimaentität vor der sichtbaren Blockzeit starten.

Ist sie im Vorkonditionierungs-Tab aktiviert, bezeichnet die Blockzeit den gewünschten Komfortzeitpunkt. Velair kann den Sollwert mit seiner adaptiven Vorhersage früher anwenden und zeigt die ursprüngliche Zielzeit weiterhin bei anstehenden Ereignissen.

Berechnet Velair innerhalb eines bereits laufenden Vorkonditionierungsfensters neu, wendet es den Sollwert sofort an, sofern die aktuelle Temperatur noch Heizen oder Kühlen erfordert.

Der Tab listet verwaltete Klimaentitäten in der in den Einstellungen festgelegten Reihenfolge. Je Klimaentität kannst du:

- Vorkonditionierung aktivieren oder deaktivieren;
- einen maximalen Vorlauf bis 1440 Minuten setzen;
- adaptive Modellparameter und Mindesttemperaturdifferenz einstellen;
- das Lernen für Heizen und Kühlen getrennt prüfen;
- Abstimmungsparameter ohne Löschen der Lerndaten auf Standardwerte zurücksetzen;
- eine Lernrichtung zurücksetzen, ohne die andere zu beeinflussen.

Die Konfiguration ist nach Zeitplanung und Grenzen, Lernmodell, Verlauf und optionalem Außenkontext gruppiert. Ohne Außenkontext ist auch dessen Sensorauswahl deaktiviert. Für nicht verfügbare Klimaentitäten lässt sich die Vorkonditionierung nicht aktivieren; der Tab erklärt den Grund.

Jeder Abstimmungsparameter hat eine kurze kontextbezogene Hilfe. Darüberfahren, Fokus oder Tippen auf das Informationssymbol erklärt, wie Erhöhen, Verringern oder Aktivieren dieses Werts die Vorkonditionierung beeinflusst.

Die Vorkonditionierung ist adaptiv. Velair prognostiziert jedes zukünftige Ereignis anhand der aktuellen Temperaturdifferenz, zunächst mit einem lokalen Ausgangsmodell und später mit ähnlichen lokalen Verlaufsdaten, sobald genug vollständige Beobachtungen vorliegen. Verlaufsprognosen lernen das thermische Potenzial pro Grad. Kleine vergangene Temperaturänderungen lassen sich damit auf größere zukünftige Differenzen hochrechnen und große vergangene Änderungen auf kleinere herunterrechnen. Ähnlichere und neuere Beobachtungen haben mehr Gewicht.

Für **Aus**-Blöcke startet Velair nicht früher. Liegt die Temperatur bereits nahe genug am Sollwert, bleibt die normale Blockzeit bestehen.

Bei nativen `heat_cool`-Bereichen verwendet Velair zum Heizen die untere, zum Kühlen die obere Grenze. Der vollständige Bereich wird dennoch früher angewendet; die Lernaufzeichnung hält fest, welche Grenze die Sitzung bestimmt hat.

Ausführliche Beispiele zu Einrichtung, Heizen, Kühlen, Außensensoren, Automatisierung und Lovelace findest du unter [Adaptive Vorkonditionierung](adaptive-preconditioning.de.md).

Vor einem vorgezogenen Start hört Velair auf relevante Temperaturänderungen verwalteter Klimaentitäten mit aktivierter Vorkonditionierung. Standard ist `current_temperature` des Thermostats. Bei aktiviertem Room Sensor Assist gilt dessen gewählter Raumsensor als wirksame Raumtemperatur für Entscheidungen und Lernen. Ändert sich die Temperatur ausreichend, um die aktuelle Differenz zu beeinflussen, bündelt Velair Änderungen verzögert und berechnet die nächste Zeitplaneraktion lokal neu.
Offene Panels bündeln ebenfalls relevante Innen- oder konfigurierte Außentemperaturänderungen in einer Aktualisierung, ohne ständige Abfragen. Ändert sich der vorgezogene Start desselben sichtbaren Ereignisses, wird dessen Zeile kurz hervorgehoben, ohne Dialog oder globale Benachrichtigung.

<a id="room-assist"></a>
## Room Assist

Der Room-Assist-Tab listet verwaltete Klimaentitäten in der eingestellten Reihenfolge. Für jede lässt sich die Unterstützung durch einen Raumsensor konfigurieren.

Ein ausgewählter Raumtemperatursensor eignet sich für Heizkörperthermostate oder andere Thermostate, deren eingebauter Sensor zu nahe an Heizkörper, Luftauslass oder einer anderen örtlichen Wärmequelle liegt. Allein die Auswahl ändert die Velair-Steuerung nicht. Erst bei aktiviertem Room Sensor Assist wird er zur wirksamen Raumtemperatur. Velair passt dann zusätzlich den Thermostatsollwert an, damit das Gerät weiter in Richtung der am separaten Raumsensor gemessenen Temperatur heizt oder kühlt.

Ausführliche Heiz-, Kühl-, Automatisierungs- und Lovelace-Beispiele findest du unter [Room Assist](room-assist.de.md).

Room Sensor Assist ist eine erweiterte Option, die einen Raumtemperatursensor, aber keine adaptive Vorkonditionierung benötigt. Bei festen `heat`- oder `cool`-Blöcken mit einem Totband größer null verwendet Velair dessen untere und obere Grenze als Umschaltgrenzen. Eine Laufzeitphase bleibt erhalten, bis der separate Raumsensor die gegenüberliegende Grenze erreicht; danach wird umgeschaltet. Festes Heizen beginnt vorsichtig in Richtung der unteren, festes Kühlen in Richtung der oberen Grenze. Die maximale Korrektur begrenzt die vorzeichenbehaftete Anpassung ab der aktuell aktiven Grenze.
Ein Totband von `0` erhält die bisherige vorzeichenbehaftete Korrektur um den mittleren Sollwert. Einzelne `auto`- und `heat_cool`-Sollwerte behalten dieses neutrale Verhalten; native `heat_cool`-Bereiche ihr stabiles Halteband. Velair zwingt automatische Geräte also nicht zum aktiven Wechsel zwischen Heizen und Kühlen.
Das Totband beträgt standardmäßig `0.3 °C` oder `1 °F`, unterstützt Schritte von `0.1` Grad zwischen `0` und `5 °C` beziehungsweise `9 °F` und wirkt sofort nach dem Speichern. Die maximale Korrektur beträgt standardmäßig `2 °C` oder `4 °F` und ist in `0.1`-Grad-Schritten bis `10 °C` beziehungsweise `18 °F` konfigurierbar. Sichtbarer Zeitplansollwert beziehungsweise Bereich bleiben unverändert. Schrittweitenanpassung, Schutz des Zeitplanziels und physische Gerätegrenzen gelten weiterhin.
Die Phase existiert nur zur Laufzeit und beginnt nach Block-, Sollwert- oder Moduswechsel, Löschen des Room-Assist-Zustands oder Neuladen der Integration neu. Velair beeinflusst das Gerät über dessen Sollwert; es kann Gerätehysterese, Kompressorschutz oder Mindestlaufzeit nicht umgehen. Für ausdrückliches Ausschalten verwende einen **Aus**-Block.

Velair folgt der konfigurierten Home-Assistant-Temperatureinheit. Es gibt keine separate Celsius- oder Fahrenheit-Einstellung. Die Einstellungen zeigen die Home-Assistant-Einheit schreibgeschützt zur Kontrolle. Ändere sie in Home Assistants Einheitensystem-Einstellungen. Neue Zeitpläne, mitgelieferte Vorlagen, Komfortschwellen, Room-Assist-Grenzen und Vorkonditionierungs-Standardwerte sind in beiden Einheiten physikalisch gleichwertig. Externe Temperatursensoren werden vor dem Vergleich mit einem Klimasollwert umgerechnet.

Velair speichert Temperaturwerte unverändert in der mit seinen Daten aufgezeichneten Einheit. Ändert Home Assistant die Einheit, stoppt Velair Zeitplanung und schreibende Temperaturvorgänge, erstellt eine dauerhafte Benachrichtigung und bietet in den Einstellungen eine ausdrückliche Migration von der gespeicherten zur aktuellen Home-Assistant-Einheit an. Fahre nur fort, wenn alle gespeicherten Werte weiterhin die gezeigte Quelleinheit verwenden. Bereits in der Zieleinheit vorliegende Werte würden falsch umgerechnet.
Zeitpläne, Vorlagen, aktuelle und vorherige Übersteuerungssollwerte, Komfortgrenzen, Room-Assist-Werte, Vorkonditionierungseinstellungen, Raten und Lernbeobachtungen werden atomar migriert.

Das einmalige Upgrade früher veröffentlichter, ausschließlich Celsius unterstützender Velair-Daten ist anders. Verwendet Home Assistant bereits Fahrenheit, nimmt Velair für die Altdaten ohne Rückfrage Celsius an, hält den Zeitplaner gestoppt und verweist auf **Velair zurücksetzen**. Dies verwirft die alte Konfiguration und erstellt atomar neue Fahrenheit-Standardwerte. Spätere Home-Assistant-Einheitenwechsel nach diesem Upgrade verwenden die vollständige ausdrückliche Umrechnung oben und erhalten Daten.

Aktuelle Exporte des portablen Modells v16 erhalten Rohwerte und geben deren Einheit an. Frühere Velair-Versionen können v16 nicht importieren; verwende zur Wiederherstellung eine unterstützende Version. Ältere unterstützte Dateien, darunter v4, v5, v8 und v9, bleiben importierbar. Beim Import werden ausgewählte Temperaturdaten umgerechnet, wenn Datei und aktuelle Home-Assistant-Einheit abweichen. Ältere Dateien ohne Einheit gelten als Celsius, da alle veröffentlichten Versionen, die diese Dateien erzeugten, Celsius speicherten. Export bleibt bei gestoppter Zeitplanung wegen einer Einheitenaktualisierung verfügbar, sodass vor einem Reset eine Referenzkopie gespeichert und danach importiert werden kann.

War eine Klimaentität bei Migration oder Import nicht verfügbar, prüft Velair ihre Grenzen und wirksame Temperaturschrittweite. Ein gültiges, aktuell von Home Assistant veröffentlichtes `target_temp_step` hat Vorrang vor der zuletzt gemeldeten Schrittweite und danach dem manuellen Zonen-Fallback. Das Panel warnt bei nicht mehr kompatiblen gespeicherten Zeitplansollwerten, damit du sie vor der Nutzung korrigieren können.

Das vollständige Upgrade-, Migrations-, Sicherungs- und Wiederherstellungsverhalten beschreibt [Temperatureinheiten und Migration](temperature-units.de.md).

Bei aktiviertem Room Sensor Assist zeigt dessen Tab eine kompakte Live-Temperaturskala, solange ein verwalteter Temperaturblock aktiv ist. Bei einem einzelnen Sollwert markiert sie Zeitplansollwert, Raumsensor, Klimasollwert und Thermostatmesswert. Ein neutrales gestreiftes Band zeigt die untere und obere Totbandgrenze. Bei festem `heat` oder `cool` zeigt der Status auch die Richtung zur unteren oder oberen Grenze; bei einzelnen automatischen Sollwerten bleibt das Band ein neutraler Spielraum.
Bei nativen Bereichen reicht es von geplanter Untergrenze minus Totband bis geplanter Obergrenze plus Totband. Separate Klammern zeigen weiterhin vollständige geplante und angewandte Bereiche; eine Verbindung ihrer Mittelpunkte stellt die vorzeichenbehaftete Bewegung des gesamten Bereichs dar. Raum- und Klimamesswert bleiben einzelne Markierungen. Die vollständig übersetzte Legende bleibt auf dem dargestellten Totband zentriert, auch wenn dieses schmaler als die Beschriftung ist. Bei Totband null entfällt die Fläche und dies wird ausdrücklich angegeben. Ausblenden von `show_room_assist_deadband` entfernt gemeinsam Einstellung, Band und Legende.
Die Werte stammen aus Home-Assistant- und Velair-Laufzeitzustand und werden nicht als neuer Verlauf gespeichert. Ohne aktiven verwalteten Temperaturblock zeigt der Tab einen Wartezustand statt Platzhalterwerten. Ist ein Sensor gewählt, Assist aber ausgeschaltet, zeigt er, dass der Sensor gespeichert, jedoch nicht wirksam ist.

Room Sensor Assist arbeitet ereignisgesteuert, ohne regelmäßige Temperaturabfragen. Bei aktiver Unterstützung hört Velair nur auf den gewählten Raumsensor und die Klimaentität. Änderungen werden anhand der zonenbezogenen Aktualisierungsverzögerung gebündelt. Temporäre Sollwerte werden an die wirksame veröffentlichte, zuletzt gemeldete oder konfigurierte Schrittweite angepasst; kleinere Bewegungen werden ignoriert.
Der echte Zeitplansollwert wird wiederhergestellt, wenn der Zeitplaner oder eine Zone pausiert, eine temporäre Anpassung beginnt, ein Block ausschaltet, der Sensor unbrauchbar wird oder die Funktion deaktiviert wird. Löschen dieses Laufzeitzustands löscht auch die Hysteresephase fester Modi. Hat Vorkonditionierung einen zukünftigen Block vorzeitig gestartet, folgt Room Sensor Assist bis zum geplanten Komfortzeitpunkt diesem zukünftigen Sollwert statt dem vorherigen Zeitblock.

Bei deaktivierter Vorkonditionierung registriert Velair für diese Klimaentität keine entsprechenden Temperatur-Listener oder Neuberechnungsrückrufe, startet keine Lernsitzungen und speichert keine neuen Beobachtungen. Bestehende Lerndaten bleiben erhalten und können bei erneutem Aktivieren wiederverwendet werden.

Velair führt außerdem einen kompakten lokalen Lernverlauf für Vorkonditionierungsversuche. Beim vorzeitigen Anwenden eines Komfortsollwerts beginnt eine Laufzeit-Lernsitzung. Eine kompakte Beobachtung wird gespeichert, wenn die Zielschwelle erreicht wird oder der Komfortzeitpunkt eintritt. Durch temporäre Anpassungen, Pausen, Zeitplanerstopp oder Zeitplanänderungen unterbrochene Sitzungen werden verworfen.

Der Vorkonditionierungs-Tab zeigt den lokalen Lernstand je Klimaentität. Heizen und Kühlen werden getrennt erfasst; eine nicht unterstützte Richtung erscheint als nicht verfügbar. Sobald genug vollständige Beobachtungen einer unterstützten Richtung vorliegen, kann Velair ähnliche lokale Verlaufsdaten statt des Ausgangsmodells nutzen.

Jede unterstützte Richtung hat eine kompakte Statuskarte mit Lernbereitschaft, aktiver Modellquelle sowie Anzahl vollständiger, teilweiser und ungültiger Beobachtungen. Eine eigene Rücksetzaktion je Richtung kalibriert Heizen oder Kühlen unabhängig von null neu und erhält Zeitpläne, Vorkonditionierungseinstellungen und den Verlauf der anderen Richtung.

Die zonenbezogene Wiederherstellung ist davon getrennt. Sie setzt nur Abstimmungsparameter der adaptiven Vorkonditionierung zurück und erhält Aktivierungszustand, Raumsensoreinstellungen und sämtliche gespeicherten Heiz- und Kühlbeobachtungen.

Teilbeobachtungen werden nicht als erfundene Abschlusszeiten verwendet. Sie dienen als Untergrenzen: Velair weiß, dass die benötigte Zeit länger als das versuchte Startfenster war. Zeigen genug spätere vollständige Beobachtungen, dass weniger Vorlauf funktioniert, treiben ältere Teilbeobachtungen die Prognose nicht länger nach oben. Das hält das Lernen vorsichtig, ohne hohe Vorläufe dauerhaft festzuschreiben.

Velair führt getrennte kompakte Verläufe für Heizen und Kühlen, damit saisonale Nutzung einer Richtung nicht die Lerndaten der anderen verdrängt.

Alle Vorkonditionierungseinstellungen und Berechnungen laufen lokal in Home Assistant. Velair sendet weder Klimaverlauf noch Zeitplandaten an externe Dienste.

Entwicklerdetails zu Lernzuständen, API-Ausgaben und Vorhersageregeln findest du in [Adaptive preconditioning internals](../developer/adaptive-preconditioning.md) auf Englisch.

<a id="environmental-comfort"></a>
## Umgebungskomfort

Der Komfort-Tab listet verwaltete Klimaentitäten in der eingestellten Reihenfolge. Je Klimaentität kann er Raumtemperatur, Luftfeuchtigkeit und CO2 überwachen. Optional zeigt er Taupunkt, absolute Luftfeuchtigkeit und Humidex, lokal aus wirksamer Temperatur und Luftfeuchtigkeit berechnet oder von einem vorhandenen Home-Assistant-Sensor bezogen.

Komfort dient ausschließlich der Überwachung. Es ändert weder Zeitplanblöcke, Klimasollwerte, Lüftermodi, Presets noch Pausen. Velair beschreibt den Raum mit verständlichen Zuständen wie `Kalt und feucht`, bewertet CO2-Luftqualität unabhängig, zeigt die Vollständigkeit der Messwerte und sendet bei Bewertungsänderungen Automatisierungsereignisse.

Temperatur kann von einem eigenen Komforttemperatursensor, dem konfigurierten Room-Assist-Raumsensor oder `current_temperature` der Klimaentität stammen. Luftfeuchtigkeit kann von einem gewählten Sensor oder verfügbarem `current_humidity` kommen. CO2 wird nur bei ausgewähltem CO2-Sensor bewertet.

Das standardmäßige einfache Komfortmodell verwendet einen rechteckigen Temperatur- und Luftfeuchtigkeitsbereich. Der geführte Modus macht aus einer Luftfeuchtigkeitsreferenz am Temperaturmittelpunkt eine temperaturabhängige psychrometrische Kurve. Im benutzerdefinierten temperaturabhängigen Modell können sich Feuchtigkeitsgrenzen am kühleren und wärmeren Temperaturendpunkt unterscheiden. Velair interpoliert den wirksamen Bereich und zeigt dessen geneigte Zielfläche, ohne allgemeingültige Komfortaussagen zu treffen. Bestehende Zonen bleiben bis zu einer ausdrücklichen Änderung im einfachen Modell.

Zusätzliche Messgrößen sind standardmäßig deaktiviert und rein informativ; sie ändern weder Komfortklassifikation noch Klimaverhalten. Bei deaktiviertem Komfort registriert Velair keine Komfortsensor-Listener für diese Klimaentität. Bei Aktivierung hört es nur auf relevante gewählte Sensoren und die Klimaentität, ohne ständige Abfragen.

Komfort kann außerdem den Raum mit ausdrücklich gewählten Außentemperatur- und optionalen Außenluftfeuchtigkeitssensoren vergleichen. **Innen und außen** zeigt Temperaturdifferenz, absolute Luftfeuchtigkeit innen und außen sowie die relative Luftfeuchtigkeit, die Außenluft bei der Innentemperatur hätte. Erkennt das Backend eine hilfreiche Richtung oder einen Zielkonflikt, zeigt Velair einen vorsichtigen Lüftungshinweis. Der Vergleich wird nie als Befehl behandelt.
Die Konfiguration liegt im eingeklappten Komfort-Einstellungsbereich; Deaktivierung des Vergleichs erhält gewählte Sensor-IDs. Zonenbezogene **Lüftungshinweise** können größere oder kleinere Unterschiede bei Temperatur, projizierter Luftfeuchtigkeit und Wassergehalt der Luft verlangen, bevor ein Hinweis erscheint. Die ursprünglichen vorsichtigen Abstände bleiben die Standardwerte.

Ausführliche Beispiele zu Einrichtung, Heizen, Kühlen, CO2, Automatisierung und Datenschutz findest du unter [Umgebungskomfort](comfort.de.md).

<a id="templates"></a>
## Vorlagen

Vorlagen sind wiederverwendbare Tagesgruppen von Blöcken. Ihre Einstellungen können manuell sein oder gemeinsame Velair-Presets verwenden. Der Vorlagen-Tab enthält außerdem die Klima-Preset-Bibliothek. Ein Velair-Preset teilt Klimaeinstellungen ohne Blockzeiten.

Der Tab erlaubt:

- eine neue Vorlage zu erstellen;
- eine Vorlage umzubenennen;
- ihre Blöcke zu bearbeiten;
- eine Vorlage auf gewählte Klimaentitäten und Wochentage anzuwenden;
- Vorlagen ohne verknüpfte Tage zu löschen.

Wähle unter Zeitpläne eine Vorlage als Tagesquelle, um deren Zeiten oder vollständige Konfiguration zu verknüpfen. Kopieren bleibt ein gesonderter Vorgang. Der Zeitplan-Tab kann den aktuellen Tag auch als neue Vorlage speichern.

Beim Kopieren oder Verknüpfen prüft Velair HVAC-Modi, Sollwerttypen, Temperaturgrenzen und Anbietereinschränkungen der Zielklimaentität. Außerhalb der Grenzen liegende Sollwerte und inkompatible Modi werden abgewiesen. Manuelle Einstellungen werden an unterstützte Schrittweiten angepasst, gemeinsame Presetwerte je Ziel, ohne die Bibliothek zu ändern. Nicht unterstützte optionale Einstellungen entfallen, sofern der Block eine gültige Aktion behält.

Kopieren erzeugt unabhängige Vorlagenzeiten, behält aber live wirksame Presetreferenzen. **Nur Zeiten** teilt Zeiten mit unabhängigen Klimaeinstellungen. **Zeiten und Einstellungen** teilt die vollständige Vorlage; die Zielbedienelemente sind schreibgeschützt. Vorlagenänderungen prüfen jeden verknüpften Tag, auch in inaktiven Profilen. Bearbeitung erhält die Position der Vorlage in der Bibliothek.

[Block-Presets und verknüpfte Vorlagen](linked-schedules.de.md) erklärt alle Regeln. [Praxisbeispiele](linked-schedule-examples.de.md) erläutert vollständige Konfigurationen, Fallbacks neuer Blöcke, Umwandlung von Verknüpfungen, Nutzungszahlen und Fehlerbehebung.

Vorlagen können jede optionale Klimaeinstellung enthalten, die in den verwalteten Klimaentitäten verfügbar ist, und eignen sich dadurch für gemischte Installationen. Beim Anwenden auf eine bestimmte Klimaentität bleiben nur deren unterstützte Optionen. Eine Vorlage kann etwa `fan_mode: quiet` für eine Klimaanlage enthalten; bei einem Heizkörperthermostat ohne Lüftermodi entfällt das Feld automatisch.

<a id="climate-profiles"></a>
## Klimaprofile

Klimaprofile wechseln mehrere Zonen zwischen abgestimmten Wochenplänen, ohne Standardzeitpläne zu überschreiben. Jedes Profil kann einer Zone einen alternativen Wochenzeitplan geben, sie pausieren, pausieren und ausschalten oder beim Standardzeitplan belassen. Nicht enthaltene Zonen verwenden weiter ihre Standardzeitpläne.

Ein Modus kann mehrere Profile gemeinsam aktivieren, wenn deren konfigurierte Zonen nicht überlappen. Direkte Aktivierung ersetzt die aktive Auswahl durch ein einzelnes Profil und wählt Manuell. Zonen, die zuvor abgedeckt waren, vom neuen Profil aber nicht, kehren zum Standardzeitplan zurück. Aktivierung wendet die zum aktuellen Zeitpunkt gültigen Blöcke an, einschließlich an früheren Tagen gestarteter Blöcke, und beendet temporäre Anpassungen betroffener Zonen. Globale und zonenbezogene Pausen behalten Vorrang.

Die Seitenleiste verwendet **Zeitpläne** als vollständigen Planungsbereich. **Standardzeitpläne** bearbeitet den normalen Wochenplan. **Profilzeitpläne** erstellt ein Profil und konfiguriert Thermostate einzeln mit **Standardzeitplan**, **Profilzeitplan** oder **Pause**. Beide Quellen bieten dieselbe Zeitleiste, Blockoptionen, Vorlagen und Kopierwerkzeuge; bewusst unterschiedlich ist das Speichern: Ein Standardtag wird direkt gespeichert, Profilmetadaten und Thermostatverhalten atomar als vollständiges Profil. Ein Profil kann weiter direkt aus seiner Zeile aktiviert werden. Der separate Tab **Modi** kombiniert Profile zu wiederverwendbaren Konfigurationen und dupliziert deren Zeitplaneditor nicht.

Während Velair betroffene Zonen verarbeitet, zeigt eine globale Vorgangsleiste tabübergreifend die aktuelle Zone, Anzahl verarbeiteter Zonen und abschließenden Erfolg beziehungsweise Teilerfolg mit Fehlern. In Lovelace erscheint sie nur in der Karte für die aktive Konfiguration, wo Modi und Profile aktiviert werden. Verarbeitet bedeutet, dass Home Assistant und Velair die Behandlung dieser Zone abgeschlossen haben, auch wenn aufgrund einer Pause oder Übersteuerung kein Klimabefehl nötig war. Es bedeutet nicht, dass der Raum seine Solltemperatur erreicht hat. Erfolgreiche Ergebnisse verschwinden nach kurzer Bestätigung automatisch; teilweise und vollständig fehlgeschlagene bleiben bis zum Schließen sichtbar.

Home-Assistant-Automatisierungen können ein Profil mit `velair.activate_profile` aktivieren oder einen konfigurierbaren Wert der nativen Entität `select.velair_mode` auswählen. [Klimaprofile](climate-profiles.de.md) beschreibt Einrichtung, Automatisierung, Neustart, Zusammenspiel und Portabilität.

<a id="external-schedule-execution"></a>
## Externe Zeitplanausführung

Normalerweise speichert Velair den Wochenplan einer Zone und führt ihn über deren Home-Assistant-Entität `climate.*` aus. Erkennt **Einstellungen → Externe Systeme** einen kompatiblen Controller, kann eine geeignete Zone die Ausführung stattdessen an dieses System abgeben. Velair veröffentlicht dann die vollständige wirksame Woche aus Standard, Profil oder Modus. Die Zone muss zuerst einen gespeicherten wirksamen Zeitplan mit mindestens einem Temperaturblock besitzen. Andernfalls bleibt die Ausführung lokal und die Einstellungen erklären diese Voraussetzung.

Eine extern verwaltete Zone bleibt auf Zeitpläne beschränkt. Velair sendet dort keine direkten Klimabefehle für temporäre Anpassung, Pause/Fortsetzen, manuelle Anpassung, Room Assist oder adaptive Vorkonditionierung. Profilverhalten **Pause** ist nicht verfügbar; **Standardzeitplan** und **Profilzeitplan** wählen die veröffentlichte Woche. Controllerspezifische Grenzen erscheinen einmal je verwendetem System in den Einstellungen und werden beim Bearbeiten kompatibler Standard- und Profilzeitpläne geprüft. Benötigt der Controller einen impliziten Kontinuitätsschaltpunkt um Mitternacht, zählt ihn der Editor in der sichtbaren täglichen Schaltpunktbelegung mit.

Die Übersicht meldet nach einem Versuch in der aktuellen Home-Assistant-Laufzeit nur **Wird veröffentlicht**, **Akzeptiert** oder **Fehlgeschlagen**. Akzeptiert bedeutet, dass die externe Integration den Dienstaufruf angenommen hat, nicht dass der physische Controller den Zeitplan angewendet hat. Die Zone behält ihre normale Zeitplanaktivität und ihr nächstes Ereignis. Ein kompaktes **Extern**-Signal zeigt Controller und Veröffentlichungsstatus. Velair fragt nicht regelmäßig ab, liest nicht zurück und wiederholt nicht automatisch. [Externe Zeitplanausführung](external-systems.de.md) beschreibt unterstützte Systeme, Grenzen, Übergabe und aktuellen Validierungsstand.

<a id="clone-schedules"></a>
## Zeitpläne kopieren

Unter dem Editor kann Velair den aktuellen Tag kopieren:

- auf andere Wochentage derselben Klimaentität;
- auf denselben Wochentag anderer verwalteter Klimaentitäten.

Bei Wochentagskopien bieten **Mo–Fr**, **Wochenende**, **Alle Tage** und **Auswahl löschen** eine schnelle Zielauswahl; einzelne Wochentage bleiben auswählbar. Diese Schnellwahlen ändern nur die Zielauswahl. **Kopieren** bleibt eine ausdrückliche Aktion, und der Quelltag wird nie einbezogen.

Kopieraktionen speichern bei Bedarf zuerst ausstehende Änderungen. Sie kopieren die Quellkonfiguration einschließlich Vorlage, Verknüpfungstyp, Zuordnungen bei reinen Zeitverknüpfungen und Presetreferenzen. Kopieren eines unabhängigen Tages entfernt die Zielverknüpfung dieses Tages; andere Tage behalten ihre Verknüpfungen. Inkompatible Ziele weisen die Kopie ab, ohne irgendein gewähltes Ziel zu ändern. Verwende danach **Verknüpfung lösen**, wenn der neue Tag seiner Vorlage nicht länger folgen soll.

<a id="pause-stop-and-resume"></a>
## Pausieren, stoppen und fortsetzen

Velair bietet globale Zeitplanerbedienelemente:

- **Pause** unterbricht die automatische Zeitplanausführung für eine Dauer in Minuten.
- **Stopp** unterbricht sie unbefristet.
- **Fortsetzen** schaltet den Zeitplaner wieder auf Automatik.

Bei aktiver befristeter Pause zeigt die Übersicht Restzeit und Fortschritt.

Pausen- und Anpassungsdauern werden in Minuten angegeben. Die Home-Assistant-Dienstoberfläche erlaubt bis zu 10 080 Minuten, also sieben Tage.

Velair unterstützt zonenbezogene Pausen über Dienste und Automatisierungen. Sie betreffen nur eine verwaltete Klimaentität; andere folgen weiter ihren Zeitplänen. Bei Fortsetzen wendet Velair den aktuellen Zeitplan nur an, wenn zu diesem Zeitpunkt ein Block für die Klimaentität aktiv ist. Andernfalls bleibt sie unverändert.

<a id="boost"></a>
## Temporäre Anpassung

Eine temporäre Anpassung gilt je Klimazone. Sie übersteuert vorübergehend den Zeitplan einer Klimaentität; andere Zonen laufen normal weiter.

Beim Start erfasst Velair den wiederherstellbaren Klimazustand dieser Zone: HVAC-Modus sowie einzelnen Sollwert oder vollständigen Bereich, soweit Home Assistant diese meldet. Die Momentaufnahme bestimmt ausschließlich das Verhalten am Ende der Anpassung.

Temporäre Anpassungen sind über Home-Assistant-Dienste, Skripte, Automatisierungen und Dashboard-Bedienelemente verfügbar. Der Hauptzeitplaneditor bleibt dadurch übersichtlich, während weitergehende Automatisierungen möglich sind, beispielsweise:

- einen Raum per Button vorübergehend anpassen;
- eine Anpassung nach Bewegungserkennung starten;
- über einen Sprachassistenten starten;
- einen bevorzugten HVAC-Modus verwenden.

Beim Ablauf bestimmt Velair das Verhalten der betroffenen Zone in dieser Reihenfolge:

1. Gibt es einen aktiven Zeitplanblock mit ausdrücklichem HVAC-Modus, wendet es dessen Sollwert an.
2. Schaltet ein aktiver Block die Klimaentität aus, wird sie ausgeschaltet.
3. Ohne aktiven Block wird der vor der Anpassung erfasste Zustand wiederhergestellt.
4. Verwendet der aktive Block `Keep`, wird ebenfalls der erfasste Zustand wiederhergestellt, da `Keep` keinen neuen HVAC-Modus für die Zeit nach der Übersteuerung vorgibt.

Die Anpassung soll Velair daher keinen neuen Heiz- oder Kühlsollwert erfinden lassen, wenn der aktuelle Zeitplan keinen ausdrücklich festlegt.

<a id="startup-behavior"></a>
## Startverhalten

Standardmäßig stellt Velair nach dem Home-Assistant-Start seinen gespeicherten Zeitplanerzustand wieder her, zwingt Geräte aber nicht auf einen Zeitplansollwert.

In den Einstellungen kannst du **Aktiven Zeitplan nach dem Start von Home Assistant anwenden** aktivieren. Dann wendet Velair nach dem Start den derzeit aktiven Block auf verwaltete Klimaentitäten an, sofern der Zeitplaner automatisch läuft. Auch ein an einem früheren Tag gestarteter Block gilt bis zum nächsten Wochenblock als aktiv. Aktive temporäre Anpassungen werden respektiert.

<a id="automation-blueprints"></a>
## Automatisierungs-Blueprints

Velair bietet in seiner Dokumentation optionale Home-Assistant-Blueprints:

- anhand einer zusammengefassten Anwesenheitsentität zwischen gewählten Zuhause-/Abwesenheitsaktionen wechseln;
- eine oder mehrere verwaltete Klimaentitäten pausieren, solange ein ausgewähltes Fenster oder eine Tür offen ist;
- nach einer stabilen Temperaturänderung saisonale Modi oder andere Aktionen wählen und ungültige Messwerte sofort melden.

Sie verwenden Home-Assistant-Zustandsereignisse und konfigurierbare Verzögerungen statt regelmäßiger Abfragen. Der Anwesenheits-Blueprint kann melden, wenn zusammengefasste Gruppe, Templatesensor oder Helfer nicht verfügbar bleibt, ohne Zuhause- oder Abwesenheitsaktionen auszuführen. Der Fenster-Blueprint kennzeichnet seine eigene Pause, damit Fensterschließen keine manuelle oder von einer anderen Automatisierung verwaltete Pause entfernt. Bleibt ein Kontakt unbekannt oder nicht verfügbar, zeigt Home Assistant eine verzögerte Diagnosebenachrichtigung für die Thermostatgruppe und entfernt sie nach Erholung automatisch. Der betroffene Kontakt blockiert das Fortsetzen weiterhin.
[Automatisierungs-Blueprints](blueprints.de.md) erläutert Einrichtung, Beispiele, Startverhalten und die Regel einer Fensterautomatisierung je Zone.

Der [saisonale Blueprint](blueprints/seasonal-climate-selection.de.md) wartet standardmäßig nach jeder Temperaturänderung 30 Minuten. Ständig wechselnde Messwerte können Aktionen unbefristet hinausschieben. Startprüfungen prüfen nur Diagnosen. Wähle Velair-Modi im normalen Home-Assistant-Aktionseditor. Konfiguriere einen tatsächlichen Pausen-und-Aus-Modus, wenn mildes Wetter die Klimatisierung stoppen soll. Leere Aktionen lassen den aktuellen Betrieb unverändert.

<a id="portability"></a>
## Portabilität

Die Einstellungen können eine versionierte JSON-Datei exportieren und importieren. Sie kann enthalten:

- Thermostatzeitpläne;
- Vorlagen;
- gemeinsame Block-Presets;
- Paneleinstellungen;
- Lerndaten der adaptiven Vorkonditionierung;
- Klimaprofildefinitionen;
- Modusdefinitionen.

Modell 16 erhält beide Vorlagenverknüpfungstypen und Presetreferenzen. Export von Zeitplänen oder Profilen enthält benötigte Vorlagen und Presets als zusätzlich ausgewählte Bereiche. Importe prüfen die zusammengeführte Konfiguration einschließlich bestehender Nutzer ersetzter gemeinsamer Ressourcen. Presets werden anhand stabiler Schlüssel zusammengeführt: Passende Schlüssel werden ersetzt, nicht in der Datei enthaltene lokale Presets bleiben erhalten. Bestehende Sicherungen bleiben importierbar. Ältere Velair-Versionen können Modell-16-Dateien nicht importieren. Siehe [Sicherungsbeispiel](linked-schedule-examples.de.md#back-up-the-whole-setup).

Beim Import wählst du die zu überschreibenden Bereiche. Ausgewählte Daten werden ersetzt; exportiere vorher, wenn ein Wiederherstellungspunkt nötig ist. Profil- und Modusdefinitionen sind portabel, ihre aktive Auswahl nicht. Velair behält aktive Profil-IDs, die noch existieren, und kehrt nur dann zu Standardzeitplänen zurück, wenn keine übrig bleiben.

Jeder neue Export zeichnet seine Temperatureinheit auf. Beim Import einer Datei aus dem anderen Einheitensystem rechnet Velair ausgewählte Temperaturwerte in die aktuelle Home-Assistant-Einheit um. An verfügbare Klimaentitäten gebundene Werte werden an deren wirksame Sollwertschrittweite angepasst. Unabhängige Werte verwenden sichere Genauigkeit, wenn keine gemeinsame Geräteschrittweite vorliegt. Der manuelle Zonen-Fallback ist portabel; die zuletzt lokal beobachtete Schrittweite wird bewusst nicht exportiert. Ältere Exporte ohne Einheit werden im Importbildschirm angekündigt und als Celsius interpretiert.

Lerndaten werden über die genaue Home-Assistant-Klimaentitäts-ID zugeordnet. Daten aktuell nicht verwalteter Klimaentitäten werden vor dem Import angezeigt und übersprungen. Bei passenden Entitäten ersetzen importierte Lerndaten die vorhandene Kalibrierung. Lerndaten lokaler Klimaentitäten, die nicht in der Datei enthalten sind, bleiben unverändert.

Vorkonditionierungseinstellungen sind bereits in **Thermostatzeitpläne** enthalten. Der separate Bereich **Vorkonditionierungs-Lerndaten** enthält den aufwendig aufgebauten lokalen Kalibrierungsverlauf.

<a id="maintenance"></a>
## Wartung

Die Einstellungen zeigen technische Versionsinformationen:

- Frontend-Build;
- Version des portablen Exportmodells;
- Speicher-/Modellversion;
- Integrationsversion.

Eine Rücksetzaktion löscht sämtliche gespeicherten Velair-Zeitplandaten: Zeitpläne, Vorlagen, Panelpräferenzen, aktive temporäre Anpassungen und Pausen, zonenbezogene Regeln für externe Änderungen und aktive manuelle Anpassungen, Komfort- und Room-Assist-Einstellungen, Vorkonditionierungseinstellungen und Lerndaten sowie Startverhalten. Anschließend erstellt sie einheitengerechte Standardwerte für die aktuell verwalteten Klimaentitäten. Die separate Diagnosekategorieauswahl und deren aktuelles Laufzeitprotokoll gehören nicht zu diesem Reset. Velair fragt vor der Ausführung nach Bestätigung.

<a id="services"></a>
## Dienste

Velair stellt Home-Assistant-Dienste für Automatisierungen und Skripte bereit:

- `velair.set_temperature`
- `velair.set_hvac_mode`
- `velair.apply_schedule`
- `velair.boost`
- `velair.cancel_boost`
- `velair.activate_profile`
- `velair.deactivate_profile`
- `velair.enable_room_sensor_assist`
- `velair.disable_room_sensor_assist`
- `velair.pause`
- `velair.pause_zone`
- `velair.resume`
- `velair.resume_zone`
- `velair.set_external_change_policy`
- `velair.enter_manual_adjustment`
- `velair.resume_automatic_control`
- `velair.set_daily_schedule`
- `velair.copy_day_schedule`
- `velair.clear_schedule`
- `velair.update_block_preset`

Dienste mit Entitätsziel funktionieren nur für bei der Einrichtung ausgewählte Klimaentitäten. Bei einer nicht verwalteten Klimaentität weist Velair den Aufruf vor jeder Änderung ab.

<a id="velairupdate_block_preset"></a>
### `velair.update_block_preset`

Aktualisiert ein gespeichertes gemeinsames Preset über seinen stabilen `preset_key`. Teilaktualisierungen erhalten nicht angegebene Felder; ausdrücklicher Ersatz kann die Aktion ändern. Änderungen betreffen jede Referenz und verwenden die normalen Prüfungen, Übersteuerungsverantwortung und Vorkonditionierungs-Neuberechnung. [Preset-Automatisierungen](preset-automations.de.md) enthält Feldreferenz sowie Beispiele für Außentemperatur, Bereiche, Geräteoptionen und Ausschalten/Wiederherstellen. Der Dienst ändert eine gemeinsame Definition und wählt kein anderes Preset für einen Block.

<a id="velairactivate_profile"></a>
### `velair.activate_profile`

Aktiviert ein gespeichertes Klimaprofil und wendet sofort das wirksame aktuelle Verhalten an. Die gesamte aktive Profilauswahl wird ersetzt; nicht abgedeckte Zonen kehren zu Standardzeitplänen zurück. Verwende die von Velair gezeigte stabile Profil-ID statt des bearbeitbaren Anzeigenamens. Direkte Aktivierung setzt den Moduswähler auf `Manual`. Weglassen von `profile_id` kehrt aus Kompatibilitätsgründen weiterhin zu Standardzeitplänen zurück; neue Automatisierungen sollten ausdrücklich `velair.deactivate_profile` verwenden.

```yaml
action: velair.activate_profile
data:
  profile_id: vacation
```

<a id="velairdeactivate_profile"></a>
### `velair.deactivate_profile`

Deaktiviert alle aktiven Profile und setzt jede Zone sofort auf ihren Standardzeitplan zurück.

```yaml
action: velair.deactivate_profile
```

<a id="velairset_temperature"></a>
### `velair.set_temperature`

Setzt eine verwaltete Klimaentität auf eine einzelne Temperatur oder einen unteren und oberen Sollwertbereich. `hvac_mode` ist optional.

Dieser auf Velair beschränkte Hilfsdienst gilt nur innerhalb von Velair und ersetzt nicht Home Assistants `climate.set_temperature`. Unterschiede:

- Er akzeptiert ausschließlich von Velair verwaltete Klimaentitäten.
- Er prüft Sollwerte gegen Velair bekannte Fähigkeiten und Temperaturgrenzen.
- Er verwendet Velairs HVAC-Modus-Fallbackregeln bei angegebenem Modus oder nötigem Einschalten.

Verwende native Home-Assistant-Klimadienste für allgemeine Klimasteuerung und `velair.set_temperature`, wenn eine Automatisierung ausschließlich verwaltete Klimaentitäten ansprechen soll.

Optional sind `fan_mode`, `preset_mode`, `swing_mode`, `swing_horizontal_mode` und `humidity` möglich. Velair wendet nur vom Ziel unterstützte Felder an.

```yaml
action: velair.set_temperature
data:
  entity_id: climate.living_room
  temperature: 21
  hvac_mode: heat
  fan_mode: quiet
```

Für einen Bereich lässt du `temperature` weg und gibst beide Grenzen an:

```yaml
action: velair.set_temperature
data:
  entity_id: climate.living_room
  target_temp_low: 20
  target_temp_high: 24
  hvac_mode: heat_cool
```

`temperature` und Bereichsfelder schließen sich gegenseitig aus. Beide Bereichsgrenzen müssen gemeinsam angegeben werden.

<a id="velairset_hvac_mode"></a>
### `velair.set_hvac_mode`

Setzt einen veröffentlichten HVAC-Modus außer Aus, ohne Solltemperatur zu senden. Velair akzeptiert nur lokal ausgeführte verwaltete Klimaentitäten, prüft den Modus gegen die Entität und erfasst den Befehl als Velair-eigene Aktion, damit er nicht als externe Anpassung gilt.

```yaml
action: velair.set_hvac_mode
data:
  entity_id: climate.living_room
  hvac_mode: auto
```

Verwende diesen Dienst, wenn eine Velair-Automatisierung ausschließlich den HVAC-Modus ändern soll. Es wird weder ein einzelner Sollwert noch ein Bereich mitgesendet. Integration oder Gerät können beim Moduswechsel ihren Zustand intern dennoch ändern. Erfolgreiche Übertragung deaktiviert aktives Room Assist, da Velair für diesen Befehl keinen Temperatursollwert mehr steuert. Fehlgeschlagene Übertragung lässt Room Assist unverändert und erzeugt kein erfolgreiches Sollwertereignis.

Für allgemeine Steuerung außerhalb von Velair verwende Home Assistants natives `climate.set_hvac_mode`. `off` wird bewusst abgewiesen. Verwende für dieses separate Ziel die passende Velair-Pausen-, Zeitplan- oder Klimaaktion.

<a id="velairapply_schedule"></a>
### `velair.apply_schedule`

Wendet den aktuell aktiven Zeitplanblock sofort an. Ohne `entity_id` gilt dies für alle verwalteten Klimaentitäten.

```yaml
action: velair.apply_schedule
data:
  entity_id: climate.living_room
```

<a id="velairboost"></a>
### `velair.boost`

Übersteuert eine Klimaentität vorübergehend. Beim Ablauf wendet Velair einen vorhandenen aktiven ausdrücklichen Zeitplansollwert an oder stellt ohne solchen Sollwert den vor der Anpassung erfassten Klimazustand wieder her.

```yaml
action: velair.boost
data:
  entity_id: climate.living_room
  temperature: 22
  duration_minutes: 45
  hvac_mode: heat
  fan_mode: high
```

Velair erfasst den wiederherstellbaren Zustand vor dem Anwenden. Ist die Klimaentität nicht verfügbar und ihr Zustand nicht sicher erfassbar, wird die Anpassung abgewiesen.

Eine Bereichsanpassung verwendet `target_temp_low` und `target_temp_high` statt `temperature`, nach denselben Regeln wie `velair.set_temperature`.

<a id="velaircancel_boost"></a>
### `velair.cancel_boost`

Beendet eine aktive temporäre Anpassung vorzeitig. Es gilt immer dasselbe Rückkehrverhalten wie beim normalen Ablauf: Ein vorhandener aktiver ausdrücklicher Zeitplansollwert wird angewendet; andernfalls, auch bei einem `Keep`-Block, werden zuvor erfasster HVAC-Modus und Sollwert wiederhergestellt. Ohne aktive Anpassung hat der Aufruf keine Wirkung.

```yaml
action: velair.cancel_boost
data:
  entity_id: climate.living_room
```

<a id="velairenable_room_sensor_assist"></a>
### `velair.enable_room_sensor_assist`

Aktiviert Room Sensor Assist für eine verwaltete Klimaentität. Ein Raumtemperatursensor muss bereits im Room-Assist-Tab konfiguriert sein.

```yaml
action: velair.enable_room_sensor_assist
data:
  entity_id: climate.living_room
```

<a id="velairdisable_room_sensor_assist"></a>
### `velair.disable_room_sensor_assist`

Deaktiviert Room Sensor Assist für eine verwaltete Klimaentität. Hat Velair einen korrigierten Sollwert angewendet, stellt es den aktuellen Zeitplansollwert wieder her.

```yaml
action: velair.disable_room_sensor_assist
data:
  entity_id: climate.living_room
```

<a id="velairpause"></a>
### `velair.pause`

Pausiert die automatische Zeitplanausführung. Ohne `duration_minutes` wird sie unbefristet gestoppt.

```yaml
action: velair.pause
data:
  duration_minutes: 60
```

<a id="velairresume"></a>
### `velair.resume`

Setzt die automatische Zeitplanausführung fort und wendet den aktuellen Zeitplan an.

```yaml
action: velair.resume
```

<a id="velairpause_zone"></a>
### `velair.pause_zone`

Pausiert die automatische Zeitplanausführung einer verwalteten Klimaentität, während übrige Zonen weiterlaufen. Ohne `duration_minutes` ist die Pause unbefristet.

Das optionale Feld `action` kann sein:

- `none`: Klimaentität unverändert lassen und nur automatische Änderungen durch Velair verhindern;
- `turn_off`: sofort ausschalten und pausiert halten.

Automatisierungen können ein optionales `pause_id` mit 1 bis 128 Buchstaben, Zahlen, Punkten, Unterstrichen, Doppelpunkten oder Bindestrichen senden. Es muss mit Buchstabe oder Zahl beginnen. Eine gekennzeichnete Pause ergänzt einen Grund, ohne Gründe anderer IDs zu ersetzen. Wiederverwenden der ID aktualisiert nur diesen Grund; identische Wiederholung hat keine Wirkung. Aufrufe ohne `pause_id` behalten manuelle Priorität und ersetzen sämtliche Gründe durch eine manuelle Pause.

```yaml
action: velair.pause_zone
data:
  entity_id: climate.guest_room
  duration_minutes: 120
  action: turn_off
  pause_id: window_guard
```

<a id="velairresume_zone"></a>
### `velair.resume_zone`

Setzt die automatische Zeitplanausführung einer verwalteten Klimaentität fort. Standardmäßig wendet Velair deren aktuell aktiven Block an, sofern vorhanden. Gilt gerade kein Block, bleibt die Klimaentität unverändert.

Mit `pause_id` entfernt Velair ausschließlich diesen Grund. Andere Gründe halten die Zone pausiert; der Zeitplan wird erst nach Ende des letzten Grunds angewendet. `resume_all: true` löscht ausdrücklich alle Gründe. Weglassen beider Felder behält das bisherige Verhalten bei, alle Gründe zu entfernen. Die Felder sind nicht kombinierbar; `resume_all: false` ohne ID wird abgewiesen.

Gründe laufen unabhängig ab. Verwendet ein verbleibender Grund `turn_off`, bleibt die wirksame Pausenaktion Ausschalten. Temporäre Anpassungen werden bei pausierter Zone abgewiesen.

```yaml
action: velair.resume_zone
data:
  entity_id: climate.guest_room
  apply_current_schedule: true
  pause_id: window_guard
```

<a id="velairset_daily_schedule"></a>
### `velair.set_daily_schedule`

Ersetzt den Zeitplan eines Wochentags einer verwalteten Klimaentität.

```yaml
action: velair.set_daily_schedule
data:
  entity_id: climate.living_room
  weekday: monday
  blocks:
    - start: "06:30"
      action: set_temperature
      temperature: 21
      hvac_mode: heat
      fan_mode: quiet
    - start: "09:00"
      action: turn_off
    - start: "18:00"
      action: set_temperature
      temperature: 20
      hvac_mode: heat
```

Zeitplanblöcke können optionale Werte `fan_mode`, `preset_mode`, `swing_mode`, `swing_horizontal_mode` und `humidity` enthalten. Nicht unterstützte Werte entfallen für die Zielklimaentität vor dem Speichern oder Anwenden.

Verwende `action: set_climate_options` mit mindestens einem dieser Felder und ohne Temperatur oder `hvac_mode`, um nur deren Home-Assistant-Dienste aufzurufen. Beispiel:

```yaml
action: velair.set_daily_schedule
data:
  entity_id: climate.living_room
  weekday: monday
  blocks:
    - start: "06:30"
      action: set_climate_options
      preset_mode: comfort
    - start: "22:00"
      action: set_climate_options
      preset_mode: eco
      fan_mode: quiet
```

<a id="velaircopy_day_schedule"></a>
### `velair.copy_day_schedule`

Kopiert einen gespeicherten Standardtag samt Vorlagenverknüpfung und Presetreferenzen auf gewählte Wochentage. Ohne `target_entity_ids` bleibt die Kopie innerhalb der Quellklimaentität; mit dieser Liste gilt sie für andere verwaltete Klimaentitäten. Alle gewählten Kombinationen aus Klimaentität und Wochentag werden in einer Transaktion geprüft und gespeichert.

```yaml
action: velair.copy_day_schedule
data:
  entity_id: climate.living_room
  source_weekday: monday
  target_weekdays:
    - tuesday
    - wednesday
    - thursday
```

Um dieselbe Montagskonfiguration auf andere Thermostate zu kopieren:

```yaml
action: velair.copy_day_schedule
data:
  entity_id: climate.living_room
  source_weekday: monday
  target_weekdays:
    - monday
  target_entity_ids:
    - climate.study
    - climate.bedroom
```

Der Dienst kopiert die zuletzt gespeicherte Quelle unter Konfigurationssperre. Optionales `expected_revision` weist den Vorgang bei geänderter Konfiguration ab; das Panel sendet seine aktuelle Revision automatisch. Profile werden über ihren eigenen vollständigen Profilablauf bearbeitet und gespeichert. Eine Kopie eines gespeicherten unabhängigen Tages entfernt die Vorlagenverknüpfungen der gewählten Zieltage; andere Tage bleiben erhalten.

<a id="velairclear_schedule"></a>
### `velair.clear_schedule`

Leert den Zeitplan eines Wochentags. Ohne `weekday` werden alle Wochentage dieser verwalteten Klimaentität geleert.

```yaml
action: velair.clear_schedule
data:
  entity_id: climate.living_room
  weekday: sunday
```

<a id="automation-events"></a>
## Automatisierungsereignisse

Velair sendet außerdem Home-Assistant-Ereignisse als mögliche Automatisierungsauslöser. Sie sind kurzlebig, werden nicht als Konfiguration gespeichert und ersetzen keine Diagnoseentitäten.

Alle Laufzeitereignisse verwenden denselben Home-Assistant-Ereignistyp:

```text
velair_event
```

Das Datenfeld `event` identifiziert Änderungen an Profilauswahl oder Zeitplanermodus, angewandte Sollwerte, Vorkonditionierungspläne und -beobachtungen, Komfortänderungen, Room-Assist-Zustands- und Sollwertänderungen, temporäre Anpassungen sowie Zonenpausen.

[Automatisierungsereignisse](automation-events.de.md) beschreibt genaue Ausgaberegeln, Behandlung wiederholter Ereignisse, verfügbare Felder und ein vollständiges Datenbeispiel je Ereignistyp.
