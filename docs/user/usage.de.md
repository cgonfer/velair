<a id="usage-guide"></a>
# Benutzerhandbuch
<!-- velair-docs:start -->
Übersetzungen: [Englisches Original](usage.md) · [Español](usage.es.md) · [Français](usage.fr.md) · [Deutsch](usage.de.md) · [Italiano](usage.it.md) · [Nederlands](usage.nl.md) · [Polski](usage.pl.md) · [Português (Brasil)](usage.pt-br.md) · [Português (Portugal)](usage.pt-pt.md) · [Русский](usage.ru.md) · [Übersetzungsstatus](../translation-status.md)

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

Dieses Handbuch erklärt Velair aus Sicht eines Home-Assistant-Nutzers.

Verwende [Raumgruppen](room-groups.de.md), wenn mehrere Geräte denselben Raum steuern. Die Gruppe besitzt einen Zeitplan, eine Profilzuordnung und ein Lernmodell; die Übersicht zeigt weiterhin Einzelgeräte. Mitgliedschaft wird im Tab Raumgruppen, Anzeigereihenfolge in den Einstellungen konfiguriert.

<a id="panel-navigation-and-direct-links"></a>
## Navigation im Panel und direkte Links

Das Seitenleisten-Panel aktualisiert seine URL beim Wechsel zwischen Tabs oder den Unterbereichen von Zeitplänen und Vorlagen. Beim Neuladen oder Öffnen einer kopierten URL wird der entsprechende Bereich wieder geöffnet. Auch die Vorwärts- und Zurück-Funktionen des Browsers folgen dieser Navigation.

| Bereich | Pfad |
| --- | --- |
| Übersicht | `/velair` |
| Zeitpläne: Standard | `/velair/schedules/default` |
| Zeitpläne: Profile | `/velair/schedules/profiles` |
| Modi | `/velair/modes` |
| Vorlagen: Vorlagen | `/velair/templates/templates` |
| Vorlagen: Klima-Presets | `/velair/templates/presets` |
| [Versorgungssteuerung](shared-climate-supply.de.md) | `/velair/supply-control` |
| [Raumgruppen](room-groups.de.md) | `/velair/room-groups` |
| Sensoren | `/velair/sensors` |
| Komfort | `/velair/comfort` |
| Vorkonditionierung | `/velair/preconditioning` |
| Geplante Rückkehr | `/velair/planned-return` |
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

`/velair/schedules` öffnet Standard und `/velair/templates` öffnet Vorlagen. `/velair/preconditioning` öffnet Vorkonditionierung und `/velair/planned-return` den eigenen Tab Geplante Rückkehr. Frühere Bereichslinks öffnen den jeweiligen Tab. `/velair/overview` öffnet die Übersicht und der frühere Pfad `/velair/profiles` die Modi. Ein unbekannter Unterbereich öffnet den Standardunterbereich seines Tabs, ein unbekannter Tab die Übersicht. Die Pfade werden ohne zusätzlichen Verlaufseintrag normalisiert.

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

Während einer Geplanten Rückkehr zeigt die Übersicht eine kompakte Haushaltszusammenfassung mit wöchentlichem/einmaligem Ursprung, aktuellem Prozess und gegebenenfalls Bestätigungs- oder Ankunftszeit. Sie verwendet den normalen Kartenhintergrund des Themes, einen dezenten violetten Rahmen und das Rückkehr-Hauptsymbol; andere Symbole behalten ihre Textfarbe. Eine angenommene zukünftige Rückkehr ergänzt Vorbereitungszähler mit Hover-, Tastatur- und Touchhilfe. Bestätigte Abreise zeigt eine kompakte schreibgeschützte Zeitleiste mit Zeiten und Modi, bei Platz neben der Zusammenfassung, sonst darunter. Die Navigationsschaltfläche öffnet den Tab Geplante Rückkehr; die Zusammenfassung dupliziert keine Abreisesteuerungen. Ein Problem kann auch ohne laufende Abreise sichtbar bleiben.

Jede betroffene Klimaentität zeigt ein violettes Signal für geplante Rückkehr, wenn das Backend derzeit die Steuerung durch den Abwesenheitsmodus oder die Ankunftsvorbereitung meldet. Normaler Betriebszustand, Profil und Room-Assist-Informationen bleiben sichtbar. Zukünftige Vorbereitungszeiten sind Vorschauen, kein Signal für aktive Steuerung. Manuelle Steuerung, temporäre Anpassungen, unabhängige Pausen, gestoppte Zeitplanung und externe Ausführung behalten ihren Vorrang. Eine Klimaentität, die unter einem benutzerdefinierten Abwesenheitsmodus einfach ihren Standardzeitplan behält, erhält kein Abwesenheitssignal. Die Anzeige beschreibt die Steuerungsabsicht und bestätigt weder eine erfolgreiche Befehlsübertragung noch das Erreichen des Raum-Sollwerts.

Rückkehrvorbereitungsinformationen sind vom Zuständigkeitsindikator getrennt: Jedes Gerät kann Wartet, Vorbereitung, Sollwert erreicht, Ausgesetzt, Nicht verfügbar oder Nur bei Ankunft sowie geschätzten Beginn, Ankunftssollwert und Grund zeigen, auch wenn es noch Abwesenheit folgt. Fehlende Schätzungen werden nicht durch erfundene Zeiten ersetzt. Inaktive Rückkehr behält keine zukünftige Vorbereitungsvorschau.

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

In Dashboards vom Typ Abschnitte verwenden Velair-Karten eine automatische Höhe, damit ausgeklappte Steuerelemente, zusätzliche Zonen und umgebrochener Text Platz oberhalb der nächsten Karte erhalten. Überlappt eine vorhandene Karte nach dem Update weiterhin eine andere, prüfe ihr Dashboard-YAML: Entferne einen numerischen Wert für `grid_options.rows` oder ändere ihn in `auto`. Gespeicherte Layoutoptionen haben Vorrang vor den Standardwerten der Karte:

```yaml
grid_options:
  columns: 12
  rows: auto
```

Die Liste anstehender Ereignisse in Übersicht und Dashboard-Ereigniskarten zeigt die nächste prognostizierte Steuerungsänderung je Klimagerät, einschließlich geschätzter Vorbereitung und Ankunft bei bestätigter Geplanter Rückkehr. Alle Zeilen verwenden Name/Quelle/Zeit/Aktion/HVAC ohne Zustandsuntertitel unter dem Namen. Die Hilfe am Ende erklärt Phase und bei Rückkehrvorrang Ankunftsmodus, Aussetzungsdetails und aktuelle Wochenreferenz. Sie öffnet bei Hover, Tastaturfokus oder Tippen. Aussetzungen erklären höher priorisierte Blocker statt einen blockierten Start zu versprechen. Vorhandene Ereignissensoren und spezielle Wochenvorbereitungsansichten behalten ihre Wochenbedeutung. Die Prognose dient der Anzeige; sie ändert keine Zeitplanerausführung und bestätigt keine Geräteübertragung.

Kompakte, anpassungsfähige Zonenkarten zeigen, was Velair und das Klimagerät gerade im Raum tun. Meldet die Entität `hvac_action`, verwendet die Zusammenfassung die aktuelle Geräteaktivität Heizen, Kühlen, Trocknen, Lüften, Leerlauf, Aus, Vorheizen oder Abtauen als Hauptstatus. Anschließend zeigt sie Velairs Zeitplan-, manuelle, Anpassungs-, Pausen-, Vorkonditionierungs- oder Automatik-aus-Zustände, den gemeldeten HVAC-Modus und relevante Zeiten, ohne die Aktivität nochmals als separates Signal zu wiederholen. Fehlt `hvac_action` oder ist es ungültig, zeigt Velair seinen eigenen Laufzeitzustand und leitet daraus keine Geräteaktivität ab.
Jede Karte zeigt zuerst Klimaname und Entitäts-ID, danach das aktive Profil und geordnete Room-Assist-, Komfort-, Luftqualitäts- und Datensignale. Bei sehr breiten Karten teilen sich diese Signale und die kompakte Statuszusammenfassung den Kopfbereich. Bei schmalen Karten, mobil und in kompakten Lovelace-Ansichten bleiben Identität und Kurzstatus nebeneinander; Profil- und Komfortsignale nutzen darunter die ganze Zeile. Profil-, Rückkehr-, Room-Assist-, Komfort-, Luft- und Datenchips teilen kompakte Typografie mit getrennter Symbol-/Beschriftungs- und Wertdarstellung. Rückkehr ist dezent violett; Komfortfarben unterscheiden Normal, Information, Warnung und Fehler. Lange Werte können für kompakte Höhe optisch gekürzt werden, bleiben aber vollständig per Hover-, Tastaturfokus- oder Tipphilfe verfügbar. Die Zusammenfassung verwendet ein einheitliches Symbol, ausgewogenen Text und eine zurückhaltende Aktivitätsfarbe ohne feste Überschrift oder dekorative Umrandung.
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
- `supply-live`;
- `diagnostics`.

<a id="supply-live-status-card"></a>
### Karte für den Live-Versorgungsstatus

Wähle im visuellen Editor die Ansicht `supply-live` und eine konfigurierte Versorgung anhand ihres Namens aus. Die Karte zeigt denselben schreibgeschützten Live-Monitor wie die Seitenleiste: Backend-Messwerte, Sollwerte, Hysterese und Heiz- oder Kühlbedarf, mit einem climate pro Zeile und einer an den Inhalt angepassten Höhe. Solange sie eingebunden ist, empfängt sie Live-Aktualisierungen, auch außerhalb des sichtbaren Bereichs; beim Entfernen wird das Abonnement beendet. Versorgung und Regeln werden nicht bearbeitet.

Der Editor speichert die stabile interne Versorgungs-ID in `supply_id`. Ersetze im Beispiel `boiler` durch die vom Editor gespeicherte ID; sie ist weder eine `switch.*`-Entitäts-ID noch eine Raumgruppen-ID. Es wird keine Versorgung automatisch ausgewählt. Wird die ausgewählte Versorgung gelöscht, fordert die Karte zur Auswahl einer anderen auf, statt zur ersten verfügbaren zu wechseln.

```yaml
type: custom:velair-card
view: supply-live
supply_id: boiler
supply_show_header: true
supply_show_connection: true
supply_show_switch_state: true
supply_show_room_count: true
supply_show_legend: true
supply_show_demand_description: true
```

Alle sechs Anzeigeoptionen sind standardmäßig `true`. Mit `false` lässt sich die jeweilige reguläre Information ausblenden. Das optionale Feld `title` ersetzt den Standardtitel, wenn die Kopfzeile angezeigt wird.

| YAML | Information |
| --- | --- |
| `supply_show_header` | Kopfzeile |
| `supply_show_connection` | Live-Verbindungsanzeige |
| `supply_show_switch_state` | Schalterzustand |
| `supply_show_room_count` | Anzahl der Räume mit Versorgungsbedarf |
| `supply_show_legend` | Diagrammlegende |
| `supply_show_demand_description` | Reguläre Bedarfsbeschreibung, etwa Geschätzter Bedarf |

Ladezustand, Fehler, Verbindungsabbruch, Aussetzung, unbekannter Schalterzustand oder Bedarf und laufende Wartezeiten bleiben auch bei deaktivierten Anzeigeoptionen sichtbar. Das Ausblenden regulärer Informationen verbirgt keine Bedingungen, die die Interpretation der Messwerte beeinflussen.

<a id="planned-return-card"></a>
### Karte für geplante Rückkehr

Füge dieselben Haushalts-Rückkehrbedienelemente wie in der Seitenleiste einem beliebigen Dashboard hinzu:

```yaml
type: custom:velair-card
view: planned-return
```

Bei einer normalen ausstehenden Abreise erklärt eine Timerzeile die Prüfung, ob das Zuhause leer bleibt, und zeigt deren Backend-Endzeit in der lokalen Home-Assistant-Zeit. Der Abwesenheitsmodus wird erst nach Bestätigung aktiviert, sofern alle Quellen weiterhin Abwesenheit melden. Vor der Bestätigung gibt es weder einen laufenden Countdown noch eine Abwesenheitszeitleiste. Mit **Abwesenheitsmodus jetzt anwenden** beginnen Abwesenheit und ihre Zeitleiste sofort; die Abreisebestätigung gibt die automatische Rückkehr durch Anwesenheit separat frei, während geplante Vorbereitung und Ankunft aktiv bleiben.

Der visuelle Karteneditor nennt diese Ansicht **Geplante Rückkehr**. Sie zeigt nur die kompakten Bedienelemente für **Einmalige Rückkehr**, mit der Anzahl anwesender, abwesender und unbekannter Quellen rechts oben. Die gespeicherte Verzögerung zur Abwesenheitsbestätigung erscheint dort nur vor einer bestätigten aktiven Abwesenheit. Ohne gespeicherte Anwesenheitsquellen entfallen diese Anzeigen: **Rückkehr planen** bestätigt die Abwesenheit ausdrücklich und aktiviert den Abwesenheitsmodus sofort, ohne Wartezeit. Die gespeicherte Ankunft steuert weiterhin Vorbereitung und Zielaktivierung; ohne Quellen erkennt Velair keine tatsächliche Heimkehr. Konfigurierte unbekannte oder nicht verfügbare Quellen behalten ihr normales Warteverhalten, sofern **Abwesenheitsmodus jetzt anwenden** nicht gewählt ist; die Wochenroutine benötigt Quellen.
Lege vor dem Verlassen oder während deiner Abwesenheit ein zukünftiges Rückkehrdatum mit Uhrzeit fest. Eine aktive Episode bietet nur **Abbrechen** und **Ankunft ändern**. Abbrechen beendet die Rückkehrautomatik und stellt nach bestätigter Abreise oder sofortiger manueller Abwesenheit die vorherige Modus-/Profilauswahl auch vor bestätigter überwachter Abreise wieder her. Eine normale ausstehende Bestätigung ändert die Auswahl nicht. Beginne etwa im Modus Comfort mit fünf Minuten Verzögerung: Abbruch nach zwei Minuten lässt Comfort aktiv; Abbruch nach Aktivierung von Away stellt Comfort mit seinen ursprünglichen Profilen wieder her. Siehe die [Abbruchbeispiele](planned-return.de.md#cancelling-a-return-examples), einschließlich Starts ohne Sensoren, Ankunftsänderungen und ausdrücklicher Modusauswahl.
Nach Abschluss oder Abbruch zeigt die Karte ein neues Datums-/Uhrzeitformular, auch wenn die Haushaltsanwesenheit weiterhin vollständige Abwesenheit meldet. **Rückkehr planen** bleibt sichtbar, ist aber deaktiviert, wenn gespeicherte Konfiguration oder Zeitplaner nicht verfügbar sind. Die Seitenleiste verwendet dieselben Schaltflächen zum Abbrechen und Ändern der Ankunft sowie dasselbe neue Formular. Nur die abschließenden Anwesenheits-/Verzögerungsanzeigen sind kartenspezifisch; die Seitenleiste bietet vollständige Wochen-, Anwesenheits- und Vorbereitungseinstellungen.
Beide Ansichten zeigen einen kompakten Phasenuntertitel am Titel und Kontexthilfe zur Erklärung. Während der Bestätigung liefert die Prozessüberschrift diesen Kontext. Vor bestätigter Abwesenheit kennzeichnen ein zugängliches Ankunftssymbol und **Erwartete Ankunft** die gespeicherte Rückkehr, ausgerichtet mit Titel und Zustand. Der gespeicherte Wert erscheint als kompakter anklickbarer Chip ohne Stift oder Unterstreichung. Die bestätigte Grafik verwendet eine dunkle feldartige Ankunftsfläche mit derselben Typografie wie die Abreise, ohne Stift oder Unterstreichung. Beides öffnet denselben Ankunftseditor.
Die blaue Schaltfläche **Zurück** mit Linkspfeil in der Aktionszeile verwirft die Ankunftsbearbeitung und schließt sie lokal. Die zuletzt gespeicherte Ankunft wird wiederhergestellt; Warnung und Navigationsschutz für diese Bearbeitung werden aufgehoben. Unabhängige nicht gespeicherte Routineänderungen bleiben geschützt. Erneutes Öffnen beginnt mit dem gespeicherten Wert. Erfolg schließt den Editor, fehlgeschlagenes Speichern und Live-Aktualisierungen erhalten den Entwurf. Abwesenheits- und Ankunftswerte verwenden dieselbe Typografie.
**Abbrechen** ist eine kompakte rote Schaltfläche mit weißer Schrift unter den Episodendaten links. Sie erscheint nur bei abbrechbarer aktiver Rückkehr und geschlossenem Editor. Beim Bearbeiten schließt **Zurück** links den Editor; **Ankunft ändern** bleibt rechts auf kompakter grüner Fläche. Beide besitzen 32 Pixel große sichtbare Flächen innerhalb 44 Pixel großer Berührungsziele. Die Anwesenheitsanzeigen bleiben rechts oben; die Verzögerungsanzeige verschwindet nach bestätigter Abwesenheit.

Konfiguriere Anwesenheitsquellen, Modi, Abwesenheitsbestätigung und Wochenroutine unter dem Tab **Geplante Rückkehr** in der Seitenleiste. Die Karte verwendet diese gespeicherte Haushaltskonfiguration und zeigt weder Konfigurationsfelder noch den Schalter der Wochenroutine. Thermostat-Anzeigefilter begrenzen diese Haushaltskarte nicht. Dashboard und Seitenleiste ändern dieselbe Backend-Episode; Ankunftsentwürfe bleiben bis zum Absenden lokal in der jeweiligen offenen Karte.

Während bestätigter Abwesenheit stehen gespeicherte Abreise und bearbeitbare Ankunft über der Zeitleiste; Abwesenheits-/Rückkehrmodus darunter. Hilfen für Abreisezeit, Ankunftssymbol und Modi erklären sie bei Hover, Tastaturfokus oder Tippen. Ankunft bleibt eine separate Bearbeitungsschaltfläche. Ein neutraler senkrechter Jetzt-Strich zeigt verstrichene UTC-Zeit am Ende des farbigen Balkens. Daten erscheinen bei verschiedenen Home-Assistant-Kalendertagen. Ankunftsentwürfe bewegen den Endpunkt erst nach Annahme. Ausstehende/abschließende Zustände oder fehlende bestätigte Abreise haben keine laufende Zeitleiste. Eine aktive Fehlerepisode mit gültiger Abreise behält Zeitleiste und Abbruch. Die lokale Uhr aktualisiert nur sichtbar und aktiv einmal pro Minute ohne Home-Assistant-Polling.

Geeignete adaptive Geräte haben individuelle farbige Vorbereitungspunkte mit passender Legende aus Namen und sichtbar geschätzten Startzeiten sowie vollständigen Hilfen. Überlappende Punkte teilen einen segmentierten Kreis. Ausgesetzte, bereits am Ziel befindliche, nicht verfügbare und nur bei Ankunft aktive Räume erhalten keine Punkte. Die Haushaltslegende beginnt einzeilig; +N erweitert weitere Räume innerhalb der Karte, Weniger anzeigen schließt sie. Normale Updates erhalten die Erweiterung; geänderte gespeicherte Ankunft, Ziel oder Episode setzt sie zurück. Haushaltskennzeichnungen behalten Zähler und Ankunfts-/Frühstartdetails in Kontexthilfen. Anwesenheitszähler, Bestätigungsdauer und Phase haben ebenfalls Tastatur-/Mobilhilfen. Wochenkonfiguration, Quellen und vollständige Raumdetails bleiben in der Seitenleiste. Schätzung und verstrichene Zeit bestätigen weder physischen HVAC-Betrieb noch thermischen Fortschritt.

<a id="climate-status-and-control-card"></a>
### Karte für Klimastatus und Steuerung

Verwende `view: climate` für eine kompakte Karte einer einzelnen von Velair verwalteten `climate.*`-Entität. Sie folgt dem aktiven Home-Assistant-Theme über dessen Farb- und Oberflächenvariablen und passt sich an helle und dunkle Themes sowie Mobil-, Tablet- und Desktopansichten an.

Die Karte kombiniert vom Gerät gemeldete Temperatur, Luftfeuchtigkeit, HVAC-Modus und `hvac_action` mit Velairs aktueller Steuerungsverantwortung und Laufzeitdaten. Sie verwendet dieselbe wirksame Tageszeitleiste, dasselbe Profilsymbol und dieselbe Profilfarbe wie die Übersicht. Modus-, Profil-, Komfort-, Room-Assist- und Vorkonditionierungsinformationen erscheinen nur, wenn sie konfiguriert und relevant sind. Eine extern ausgeführte Klimaentität zeigt Anbieter und Veröffentlichungsstatus statt rein lokaler Velair-Funktionen oder klimabezogener Aktionen. Die optionale einmalige Rückkehraktion steuert den Haushalt unabhängig davon, wer die ausgewählte Klimaentität steuert.

Bei einem Gruppenmitglied zeigt die Karte weiterhin die eigenen Messwerte und den individuellen Komfort des Thermostats an, verwendet aber die gemeinsamen Steuerungen und den gemeinsamen Zeitplan. Temperatursteuerungen beachten die gemeinsamen Gruppengrenzen. Eine dritte Kopfzeile zeigt Gruppensymbol, Namen und Informationsschaltfläche unter dem bisherigen Status, ohne die Ausrichtung des Modussymbols zu verändern. Die Hilfe erklärt gemeinsame Aktionen und listet die Mitglieder auf. **Gruppe anzeigen** ist standardmäßig aktiviert (`climate_show_group: true`), unabhängig von der Anzeige des Thermostatnamens. Das Ausschalten blendet nur diesen Kontext aus. Thermostate ohne Gruppe zeigen auch bei aktivierter Option keine Gruppenzeile.

Die Karten Übersicht, Heutiger Zeitverlauf und Zonenübersicht beschränken einen einzelnen Mitgliederfilter weiterhin auf dieses Thermostat. Bei Auswahl einer Gruppe werden alle Mitglieder einbezogen.

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
climate_show_group: true
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

Einzelne Sollwerte und kompatible native Bereiche werden unterstützt, einschließlich Heizen, Kühlen und Auto bei Entitäten, die nur zwei Sollwerte akzeptieren. Bereichsänderungen senden beide Grenzen gemeinsam. Velair verwendet die von der Klimaentität veröffentlichten `min_temp`, `max_temp` und `hvac_modes`. Sollwertänderungen verwenden `target_temp_step`, sofern veröffentlicht. Verschwindet das Attribut, gilt die zuletzt gemeldete gültige Schrittweite weiter, damit vorhandene Dezimalsollwerte gültig bleiben. Danach folgt der manuelle Zonen-Fallback aus den Einstellungen, schließlich `1`, wenn nie eine Schrittweite gemeldet oder konfiguriert wurde. Velair erfindet keine HVAC-Modi.

Vor der geordneten Aktionsliste erstellte Karten verwendeten `climate_show_boost_action`, `climate_show_pause_action` und `climate_custom_actions`. Velair liest diese älteren Felder weiterhin. Der visuelle Editor schreibt bei Änderung der Aktionsliste `climate_actions`.

**Einmalige Rückkehr** ist eine weitere von Velair bereitgestellte Aktion. Sie unterstützt dieselben Sichtbarkeits-, Namensausblendungs- und Automatisch/Mehr-Platzierungsoptionen wie temporäre Anpassung und Pause. Der Editor listet bereitgestellte Aktionen zuerst auf: temporäre Anpassung, Pause und einmalige Rückkehr, auch ausgeblendete Aktionen. Die einmalige Rückkehr verwendet zur Unterscheidung von Pause einen violetten Akzent. Öffnen ersetzt den unteren Steuerungsbereich durch das kompakte Abwesenheitsformular oder die Zeitleiste und Bedienelemente der aktuellen Episode. Das X schließt den Bereich und zeigt wieder die Klimasteuerung; eine aktive Abwesenheit wird dadurch nicht abgebrochen. Nicht gespeicherte Ankunftsänderungen erfordern vor dem Schließen eine Bestätigung; eine laufende Aktion muss zuerst abgeschlossen werden. Abwesenheitseinstellungen und Auswirkungen gelten für den ganzen Haushalt, nicht nur die ausgewählte Klimaentität.

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

Angenommene Rückkehrvorbereitung wird getrennt von Wochenvorbereitung mit Raumstatus, geschätztem Beginn, Ankunftsziel und Grund angezeigt. Diese Details beschreiben gespeicherte Rückkehr und aktuelle Steuerungsabsicht, keinen bestätigten Gerätebetrieb. Eingebettete Einmalige-Rückkehr-Aktionen zeigen nur den geeigneten Punkt des ausgewählten Geräts, ohne Vorbereitungskennzeichnungen, behalten aber Namen und geschätzten Beginn in der Legende. Ohne aktuellen Punkt ersetzt ein kurzer Status-/Grundhinweis die Zeitleiste. Gespeicherte Ankunft bleibt bearbeitbar und Abbruch verfügbar; diese Aktionen wirken weiterhin auf den Haushalt. Die Zeitleiste misst Zeit bis Ankunft, keinen thermischen Fortschritt.

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

Standard ist <code>both</code>; jede Variante zeigt **Basis** und **Ausnahmen** mit tatsächlicher Modus-/Profil-/Standardidentität und Raumzahlen je Ausnahmegruppe. Basis und Typ stehen über dem Namen; lange Namen umbrechen auf Mobilgeräten und schmalen Karten. Die Basis zeigt außerdem die Zahl ihrer eingeschlossenen Zonen, die sie noch erben; Ausnahmen und Standardzonen außerhalb einer Profilbasis zählen nicht dazu. Eine Standardbasis umfasst alle Zonen. Dies beschreibt Auswahlabdeckung, keine Geräteaktivität.

**Verteilung im Haushalt** unter der Basis ist zunächst geschlossen. Die Beschriftung öffnet Balken und Legende; erneute Auswahl oder Escape schließt bei feststehender Überschrift. Der Balken umfasst alle verwalteten Zonen und nennt deren Gesamtzahl. Die kompakte Legende verwendet Profilfarben, kleine Symbole und rechtsbündige Zahlen. Ausnahmen stimmen mit der Liste überein, auch außerhalb der Basis. Nicht abgedeckte Zonen ohne Ausnahme bilden ein neutrales Standardsegment. Haushaltsgesamtzahl und Basisabdeckung bleiben getrennt. Ohne Zonen gibt es keinen Balken. Basisprofile stehen in der erweiterten Legende ohne separate Moduskomponentenliste. Breite Layouts geben Ausnahmen mehr Raum, schmale behalten die gestapelte Zusammenfassung.

Die ganze Ausnahmezeile öffnet ihre Räume darunter, während alle Ausnahmen sichtbar bleiben. Erneut wählen oder Escape schließt; Zeile und Zähler bleiben stehen, während Details nach unten wachsen. Eine andere Gruppe schließt die vorherige. Raumnamen fehlen in der kompakten Zusammenfassung, lange Listen scrollen intern. Diese Details sind in allen Varianten schreibgeschützt; Aktive Konfiguration hat kein separates Zonenmenü. Die reine Profilsteuerung behält Standardzeitpläne als Aktion. Direkte Profilauswahl ersetzt alle Basisprofile und setzt den nativen Modus auf Manuell. Nicht mehr umfasste Zonen kehren zu Standard zurück statt vorherige Moduseinstellungen zu behalten. Verwende für mehrere überschneidungsfreie Basisprofile einen Modus. Das Ebenensymbol wendet ein Profil nur auf seine konfigurierten Zonen als Ausnahmen an und erhält andere Räume. Siehe [Basis und Zonenausnahmen](climate-profiles.de.md#a-base-with-independent-zone-exceptions).

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
2. Wähle eine **Tagesaufteilung** und dann einen Tag oder eine Tagesgruppe.
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

Wähle **Nur Temperatur** im Modusfeld eines Blocks, um seinen Sollwert zu aktualisieren, ohne Velair zum Einschalten oder zum HVAC-Moduswechsel aufzufordern. Ein ausgeschaltetes Klimagerät bleibt aus, wenn seine Integration Sollwertänderungen ausgeschaltet akzeptiert; ein laufendes behält seinen tatsächlichen Modus. Dies ist eine separate Auswahl: **Aktuellen Modus beibehalten**, explizite Modi und vorhandene Zeitpläne behalten ihr Verhalten. Solche Blöcke dürfen keine zusätzlichen Klimaoptionen wie Presets enthalten, weil diese Befehle den Betriebszustand ändern könnten.

Die Auswahl gilt während des ganzen aktiven Blocks, auch bei manuellen HVAC-Modusänderungen, Start, Fortsetzen und Übertragungswiederherstellung. Ein reiner HVAC-Moduswechsel startet keine Manuelle Anpassung; Temperaturänderungen folgen weiterhin der externen Änderungsrichtlinie. Room Assist und Frühvorbereitung arbeiten bei einem ausgeschalteten Nur-Temperatur-Gerät nicht. Nach externem Einschalten können sie mit dem tatsächlichen kompatiblen Modus fortsetzen. Eine ausdrückliche temporäre Anpassung bleibt ein separater Auftrag, der einschalten darf.

Die Unterstützung hängt von der Klimaintegration ab. Einige verbergen oder verweigern Sollwerte im ausgeschalteten Zustand oder schalten beim Empfang intern ein. Velair sendet für Nur-Temperatur-Blöcke keinen Moduswechsel und kein Einschalten als Ersatz. Fehlgeschlagene Aktualisierungen werden gemeldet; es schaltet nicht kurz ein, um den Sollwert zu setzen. Native Bereiche erfordern die entsprechende Bereichsfähigkeit. Externe Zeitplananbieter müssen diese Blockrichtlinie ausdrücklich unterstützen.

Gewählte Klimaoptionen bleiben im Editor in einer kompakten Zeile sichtbar. Öffne bei einem Block mit Optionen dessen Optionsbedienelement, um Sollwert (sofern vorhanden), HVAC-Modusbehandlung und gewählte Optionen zu sehen. Die Erklärung stellt auch klar, dass aus einer einzelnen Temperatur kein Bereich wird. Dies gilt für Zeitpläne, Profile und Vorlagen.
Der Editor warnt ohne Speichersperre, wenn ein früherer Block desselben Tages einen möglicherweise nicht zum Sollwerttyp passenden Modus wählt. Bestimmt kein früherer ausdrücklicher Modus- oder Ausschaltblock den Modus, verwendet der Hinweis den aktuellen Klimamodus. Da er sich vor Blockstart ändern kann, ist die Warnung bedingt.

Temperaturblöcke enthalten entweder eine einzelne Solltemperatur oder einen vollständigen unteren und oberen Bereich. Der Editor nutzt die veröffentlichten Fähigkeiten und erstellt neue `heat_cool`-Blöcke bei entsprechender Unterstützung standardmäßig als Bereich. Ein Bereich erscheint beispielsweise als `20–24 °C`. Velair erfindet keinen Bereich aus einer einzelnen Temperatur und weist unvollständige, vertauschte oder inkompatible Sollwerte vor dem Senden ab.

Entitäten, die nur Bereiche unterstützen, verwenden beide Grenzen in den gemeldeten Modi `heat`, `cool`, `auto` oder `heat_cool`. Der Editor bewahrt sie beim Wechsel zwischen kompatiblen Modi, **Aktuellen Modus beibehalten** und **Nur Temperatur**. Beide Grenzen dürfen gleich sein. Bei Entitäten mit beiden Formaten gilt die Modusrichtlinie aus den Einstellungen. Reine Bereichsentitäten verwenden Entfeuchten und Nur Lüfter weiterhin ohne Temperatur; bei gemischten Formaten bestimmt die Richtlinie das Format, wobei die Integration nicht unterstützte Vorgänge dennoch ablehnen kann.

Beibehalten startet eine ausgeschaltete reine Bereichsentität im ersten gemeldeten kompatiblen Modus. Ein bereits laufender inkompatibler Modus wird nicht durch einen Wechsel umgangen. Bei beiden Formaten bevorzugt ein Bereichsblock mit Beibehalten aus Aus weiterhin `heat_cool`. Nur Temperatur kann beide Grenzen bei ausgeschaltetem Gerät senden, wenn Bereichsunterstützung und ein kompatibler Klimamodus gemeldet sind, ohne einzuschalten oder den Modus zu ändern. Eine bekannte reine Bereichsentität akzeptiert auch ausgeschaltet kein Einzelziel.

Der Editor verwendet für diese Entitäten untere und obere Zieltemperatur. Das sind die beiden akzeptierten Werte; Velair unterstellt Auto nicht die automatische Heiz-/Kühlbandfunktion von `heat_cool`. Dieselben Prüfungen gelten für Profile, Presets, temporäre Anpassung sowie kopierte oder verknüpfte Vorlagen. Vorlagen und Presets folgen den Formaten ihrer möglichen Ziele; beim Anwenden prüft Velair jedes tatsächliche Ziel. Hat eine temporäre Anpassung keine brauchbaren aktuellen Grenzen, gib beide vor dem Anwenden ein.

Room Assist und adaptive Vorkonditionierung unterstützen native `heat_cool`-Bereiche sowie feste Heiz- oder Kühlbereiche mit gewähltem Referenzsollwert unter **Einstellungen → Klimageräte und Gruppen**. Ohne Auswahl gilt das nominelle Festmoduspaar zur geplanten Zeit, ohne Room-Assist-Verschiebung, Frühstart oder thermisches Lernen; geplante Rückkehr wendet es bei Ankunft an. Auto-Bereiche behalten diese Einschränkung.

Veröffentlicht die gewählte Klimaentität zusätzliche Bedienelemente, zeigt der Blockeditor diese ebenfalls. Eine Klimaanlage kann etwa Lüfter-, Preset-, Schwenk- und horizontalen Schwenkmodus sowie Luftfeuchtigkeit anbieten. Velair speichert und sendet ausschließlich unterstützte Optionen; nicht unterstützte werden weggelassen und nicht blind gesendet.

Bei **Aus** werden Sollwertfelder nicht verwendet, da der Block die Klimaentität ausschaltet.

**Tagesaufteilungen und mehrere Tage bearbeiten**

Jeder Standardzeitplan und jeder Klimazeitplan innerhalb eines Profils merkt seine eigene **Tagesaufteilung**. Wähle **Einzelne Tage**, **Wochentage / Wochenende** oder **Alle Tage** vor der Tagesauswahl. Bestehende Zeitpläne beginnen mit Einzelne Tage.

Alle Aufteilungen behalten dieselben sieben Zellen in deiner Wochenreihenfolge. Einzelne Tage wählt eine Zelle, Wochentage / Wochenende gemeinsam Montag–Freitag oder Samstag–Sonntag. Bei Sonntag zuerst wählt ein Klick auf Samstag auch Sonntag am anderen Streifenende. Alle Tage wählt die ganze Woche unabhängig von der geklickten Zelle. Benachbarte gewählte Zellen verbinden sich optisch, getrennte behalten ihre Position. Ein Klick auf die bereits gewählte Gruppe erhält den Entwurf.

Die Aufteilungsauswahl erhält vorhandene Blöcke. Speichere sie mit dem Standardzeitplan oder **Profil speichern**. Jede Zone kann anders aufgeteilt sein; Tagesvorlagen bleiben tägliche Blocklisten.

Bei identischen gespeicherten Konfigurationen bearbeitest du den gemeinsamen Zeitplan direkt. **Unterschiedliche Zeitpläne** lässt sonst Varianten prüfen und eine Grundlage ausdrücklich wählen. Gleiche Blöcke und Vorlagenlinks bilden eine Variante mit Tagesnamen. Jede Variante verwendet kompakte Übersichts-Zeitleisten mit Sollwert-/Modusbeschriftungen im farbigen Segment, ohne dauerhafte Blockliste darunter. Das Infosymbol öffnet alle Zeiten, Einstellungen und Verweise bei Hover, Tastaturfokus oder Tippen; diese Prüfung wählt keine Variante. Klick oder Tippen wählt eine Grundlage, Hintergrund und Rahmen markieren genau eine. Pfeiltasten, Leertaste und Eingabe funktionieren ebenfalls. Alle Varianten bleiben für eine andere Wahl vor dem Speichern sichtbar.

Bei **Alle Tage** oder **Wochentage / Wochenende** wähle zuerst eine Variante und speichere sie für die Gruppe: sieben Tage, fünf Wochentage oder zwei Wochenendtage. **Speichern** wendet sie direkt ohne zusätzliche Ersetzungsbestätigung an. Erst nach Erfolg öffnet sich der gemeinsame Blockeditor für weitere Änderungen. Fehler erhalten Auswahl und Vergleich für einen neuen Versuch. Leere Varianten zeigen **Keine eigenen Blöcke** ohne zusätzliche Nullzählung. Ihre Hilfe erklärt: Anwenden entfernt eigene Blöcke der gewählten Tage; ein leerer Tag schaltet nicht aus und Wochenkontinuität kann weitergelten. Die Darstellung passt auch mobil.

Eine Grundlagenwahl speichert noch nichts. **Speichern** bleibt ohne Grundlage deaktiviert und steht rechts unter dem Inhalt. Daneben nennt eine Zusammenfassung Quelltag und Zieltage. Speichern ersetzt die gewählten Tage durch diese Konfiguration; andere bleiben erhalten. Gleiche sichtbare Temperaturen bedeuten keine gleichen Konfigurationen bei unterschiedlichen Vorlagen-/Preset-Verweisen. Kompakte Abhängigkeitslabels nennen bei gleich aussehenden Varianten Vorlage und Umfang, Presetnamen oder unabhängige Konfiguration. Vollständige Verweise stehen in der Infohilfe.

Blöcke hinzufügen, entfernen oder verschieben, Vorlage anwenden, Linkumfang ändern und lösen betrifft beim Speichern alle gewählten Tage. Andere bleiben unverändert. **Als Vorlage speichern** speichert eine wiederverwendbare Tagesliste. Kopieren auf andere Geräte zielt auf dieselben Wochentage und erhält deren eigene Aufteilungen. Für Tagesklonen wechsle zu Einzelne Tage.

Die Gruppenzeitleiste zeigt gemeinsame bearbeitete Blöcke ohne separate Tagesvorschau oder tagesspezifisches übernommenes Segment. Einzelne Tage zeigt weiterhin Kontinuität vom Vortag. Wochenkontinuität des Zeitplaners bleibt unverändert; übernommene Blöcke werden nie in gespeicherte Blöcke kopiert. Gerätegrenzen werden je betroffenem Tag vor dem vollständigen Speichern validiert.

Aufteilungen überstehen Home-Assistant-Neustarts und portable Exporte. Ältere Exporte ohne Aufteilung und frühere benutzerdefinierte Aufteilungsverweise öffnen als Einzelne Tage und behalten alle Tagesblöcke und Vorlagenlinks.

<a id="target-format-by-climate-and-mode"></a>
## Sollwertformat je Klimaentität und Modus

Home Assistant meldet die Unterstützung einzelner Temperaturen und Bereiche, aber keine Kompatibilitätstabelle je HVAC-Modus. Unter **Einstellungen → Klimageräte und Gruppen** bietet jede Entität mit beiden Formaten **Modi mit zwei Sollwerten**. Die geschlossene Auswahl zeigt gewählte Modi; geöffnet kannst du einzelne Modi auswählen oder abwählen. Angeboten werden nur gemeldete Modi ohne Aus. Heizen/Kühlen ist anfangs gewählt, falls verfügbar; weitere Modi werden nicht automatisch gewählt. Eine leere Auswahl ist gültig. Entitäten mit nur einem Format verwenden es ohne Auswahl. Die Hilfe erläutert die Grenzen. Änderungen durchlaufen vor der Anwendung die Inkompatibilitätsprüfung.

Diese Einstellung bestimmt, wie Velair Ziele sendet; sie beweist nicht, dass das Gerät beide Werte akzeptiert oder nutzt. Die Integration kann Parameter ablehnen oder ignorieren. Velair meldet bekannte Inkompatibilitäten vor dem Speichern und empfangene Übermittlungsfehler. Es gibt weder automatischen Gerätetest noch probeweise Moduswechsel.

Für Modi mit zwei Sollwerten erscheint **Referenzsollwert** bei Heizen und Kühlen, auch bei reinen Bereichsgeräten. Wähle **Unterer Sollwert** oder **Oberer Sollwert** gemäß Gerätenutzung. **Nicht konfiguriert** erhält die Zeitplanübermittlung, deaktiviert aber Room Assist und adaptive Vorkonditionierung für diesen Festmodusbereich. Konfiguriere einmal pro Gerät und Modus; beide Funktionen teilen die im Backend gespeicherte, exportierte und importierte Auswahl. Ändern beendet veraltete Unterstützung und Lernbeobachtungen, ohne Zeitplantemperaturen oder Zielformat zu ändern.

Room Assist berechnet die Festmodushysterese um die Referenz und verschiebt beide Sollwerte gleich weit innerhalb der Gerätegrenzen. Vorkonditionierung prognostiziert und lernt anhand dieser Grenze in Modusrichtung und sendet das vollständige ursprüngliche Paar früh. `heat_cool` behält seine Bandregelung ohne Auswahl; `auto`-Bereiche bleiben für diese Funktionen ohne Unterstützung.

**Standard**, Zonen in **Profilen**, **Temporäre Anpassung** und die Klimasteuerung zeigen anhand dieser Richtlinie ein oder zwei Felder für einen expliziten Modus. Moduswechsel halten getrennte temporäre Entwürfe beider Formate vor. Die Rückkehr stellt die während dieser Bearbeitung eingegebenen Werte wieder her; fehlende Werte musst du ergänzen. Velair erfindet keinen Bereich und reduziert kein Paar auf einen Wert. Alternative Entwürfe werden nicht gespeichert und überstehen kein Neuladen.

**Aktuellen Modus beibehalten** und **Nur Temperatur** nennen keinen expliziten Modus. Kann das Gerät je nach Modus beide Formate verwenden, wähle das gewünschte Format in **Weitere Einstellungen** des Blocks. Der tatsächliche Modus wird bei der Ausführung erneut geprüft. Nur Temperatur aktiviert oder ändert den HVAC-Modus nicht.

<a id="formats-in-templates-and-presets"></a>
### Formate in Vorlagen und Presets

Für einen expliziten Modus berücksichtigt Velair verwaltete Entitäten, die ihn anbieten:

- Verwenden alle eine Temperatur, erscheint ein Feld.
- Verwenden alle zwei Sollwerte, erscheinen zwei Felder.
- Bei beiden Formaten wechselt die erste Aktion in **Weitere Einstellungen** zwischen **Zwei Sollwerte verwenden** und **Eine Temperatur verwenden**. Neue Blöcke beginnen mit einer Temperatur, Heizen/Kühlen mit zwei.
- Ohne kompatible Ziele oder bei unklaren Fähigkeiten bleibt die Wahl offen.

Beibehalten und Nur Temperatur berücksichtigen alle möglichen wirksamen Modi. Heizen/Kühlen erlaubt ebenfalls den Wechsel bei unterschiedlichen Zielformaten. Die Aktion liegt auf Desktop und Mobilgerät in der vorhandenen Einstellungstaste und fügt keine Spalte neben den Temperaturfeldern hinzu. Verknüpfte Preset-Werte bleiben bis zum Lösen schreibgeschützt.

Bestehende Vorlagen und Presets behalten beim Ändern der Geräteeinstellungen ihre Werte. Ein jetzt inkompatibles Format erhält eine ausdrückliche Korrekturaktion; das Öffnen eines Editors konvertiert oder entfernt nichts. Zuweisen und Kopieren prüfen jedes Ziel.

<a id="reviewing-changes-to-the-mode-policy"></a>
### Änderungen der Modusrichtlinie prüfen

Eine Änderung zeigt zuerst Auswirkungen auf Standardzeitpläne, alle Profile und Verwendungen gemeinsamer Vorlagen und Presets. Korrekturen gelten lokal für den betroffenen Tag und die Entität in Standard oder dem Profil. Fehlende Ziele gibst du selbst ein; Velair wählt keine Ersatztemperaturen. Eine inkompatible aktive Korrektur von Room Assist wird beim Speichern automatisch beendet; die Prüfung erklärt dies. Einstellungen von Room Assist bleiben für kompatible Modi erhalten. Andere inkompatible temporäre Ziele müssen vor Anwendung korrigiert oder beendet werden.

Die Prüfung gruppiert Tage unter Standard oder ihrem Profil. Nach **Änderungen prüfen** sind Gruppen und Tage eingeklappt, damit die Anzahlen übersichtlich bleiben. Öffne einen Tag zur Bearbeitung; nur ein Tageseditor ist gleichzeitig geöffnet. Große Listen haben Seiten. **Nächsten Eintrag prüfen** führt zur nächsten Korrektur, auch auf einer anderen Seite. Einklappen und Seitenwechsel bewahren Eingaben. Vor der ersten Prüfung erscheint neben Abbrechen nur Änderungen prüfen; danach ersetzt **Speichern** diese Aktion. Vervollständige die Felder und speichere: Das Backend prüft aktuelle Korrekturen und Hindernisse und speichert nur bei Erfolg. Eine getrennte zweite Prüfung entfällt. Prüfungs-, Verbindungs- und Speicherfehler bewahren Eingaben.

Hinzufügen oder Entfernen eines Zwei-Sollwert-Modus führt zurück zu Änderungen prüfen und verbirgt Speichern bis zur erneuten Prüfung. Temperaturentwürfe bleiben erhalten, auch alternative Einzel-/Bereichswerte beim Rückwechsel. Nur aktuell betroffene Blöcke werden korrigiert; wieder kompatible behalten ursprüngliche Verweise.

Es gibt keine Auswahl eines Korrekturumfangs. Die Reparatur eines Preset-Blocks erzeugt einen lokalen eingebetteten Wert. Ein vorlagenverknüpfter Tag verliert bei Reparatur seine Tagesverknüpfung; übrige Blöcke bewahren Werte und nicht betroffene Preset-Verweise. Andere Tage behalten ihre Verknüpfungen. Die Prüfung zeigt diese Folgen vor dem Speichern. Vorlagen, Presets und andere Ziele bleiben unverändert, daher braucht jeder betroffene Tag eigene vollständige Korrekturen. Künftige Änderungen am ursprünglichen Baustein erreichen gelöste Blöcke oder Tage nicht mehr.

Die aktuelle Konfiguration bleibt erhalten, bis Richtlinie und Korrekturen gemeinsam gespeichert werden können. Gleichzeitige Änderungen verlangen eine neue Prüfung; Speicherfehler lassen die bisherige Konfiguration bestehen. Nicht mehr gemeldete gespeicherte Modi bleiben erhalten und werden gemeldet, statt stillschweigend gelöscht. Room Assist endet erst nach erfolgreichem Speichern und ohne Wiederherstellen seines alten Ziels. Danach wendet Velair das aktuelle nominelle Zeitplanziel an; Fehler nutzen die normale Wiederherstellung. Ein fehlgeschlagenes Speichern bewahrt bisherige Korrektur und Konfiguration.

Zwei Sollwerte für Heizen, Kühlen oder Auto aktivieren weder Room Assist noch adaptive Vorkonditionierung. Thermische Bereichsunterstützung bleibt auf Heizen/Kühlen begrenzt; Geplante Rückkehr wendet das nominelle Ziel bei Ankunft an.

<a id="timeline-editing"></a>
## Zeitleiste bearbeiten

Die Zeitleiste stellt den ausgewählten Tag über 24 Stunden dar.

- Ziehe einen Block, um seine Startzeit zu verschieben.
- Ziehe einen Blockrand, um den Zeitraum zwischen benachbarten Blöcken zu ändern.
- Verwende die Blockliste für genaue Uhrzeit-, Modus- und Temperaturangaben.

<a id="preconditioning"></a>
## Vorkonditionierung

Für anwesenheitsabhängige Abwesenheit mit vorkonfigurierten wöchentlichen oder einmaligen Ankünften siehe [Geplante Rückkehr](planned-return.de.md). Konfiguriere die Routine im entsprechenden Unterbereich der Vorkonditionierung. Dessen Live-Status zeigt einzelne Quellenzustände und erlaubt einmalige Ankunftsänderungen, ohne die gespeicherte Woche zu bearbeiten. **Rückkehr planen** kann auch bei deaktivierter Wochenroutine mit einmaliger Ankunftszeit auf bestätigte Abwesenheit warten. Ohne gespeicherte Anwesenheitsquellen aktiviert der ausdrückliche Start den Abwesenheitsmodus sofort; normale Vorbereitung und gespeicherte Ankunft werden weiterhin ausgeführt.

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

Aktuelle Exporte des portablen Modells v25 erhalten Rohwerte und geben deren Einheit an. Frühere Velair-Versionen können v25 nicht importieren; verwende zur Wiederherstellung eine unterstützende Version. Ältere unterstützte Dateien, darunter v4, v5, v8 und v9, bleiben importierbar. Beim Import werden ausgewählte Temperaturdaten umgerechnet, wenn Datei und aktuelle Home-Assistant-Einheit abweichen. Ältere Dateien ohne Einheit gelten als Celsius, da alle veröffentlichten Versionen, die diese Dateien erzeugten, Celsius speicherten. Export bleibt bei gestoppter Zeitplanung wegen einer Einheitenaktualisierung verfügbar, sodass vor einem Reset eine Referenzkopie gespeichert und danach importiert werden kann.

War eine Klimaentität bei Migration oder Import nicht verfügbar, prüft Velair ihre Grenzen und wirksame Temperaturschrittweite. Ein gültiges, aktuell von Home Assistant veröffentlichtes `target_temp_step` hat Vorrang vor der zuletzt gemeldeten Schrittweite und danach dem manuellen Zonen-Fallback. Das Panel warnt bei nicht mehr kompatiblen gespeicherten Zeitplansollwerten, damit du sie vor der Nutzung korrigieren können.

Das vollständige Upgrade-, Migrations-, Sicherungs- und Wiederherstellungsverhalten beschreibt [Temperatureinheiten und Migration](temperature-units.de.md).

Bei aktiviertem Room Sensor Assist zeigt dessen Tab eine kompakte Live-Temperaturskala, solange ein verwalteter Temperaturblock aktiv ist. Bei einem einzelnen Sollwert markiert sie Zeitplansollwert, Raumsensor, Klimasollwert und Thermostatmesswert. Ein neutrales gestreiftes Band zeigt die untere und obere Totbandgrenze. Bei festem `heat` oder `cool` zeigt der Status auch die Richtung zur unteren oder oberen Grenze; bei einzelnen automatischen Sollwerten bleibt das Band ein neutraler Spielraum.
Bei nativen Bereichen reicht es von geplanter Untergrenze minus Totband bis geplanter Obergrenze plus Totband. Separate Klammern zeigen weiterhin vollständige geplante und angewandte Bereiche; eine Verbindung ihrer Mittelpunkte stellt die vorzeichenbehaftete Bewegung des gesamten Bereichs dar. Raum- und Klimamesswert bleiben einzelne Markierungen. Die vollständig übersetzte Legende bleibt auf dem dargestellten Totband zentriert, auch wenn dieses schmaler als die Beschriftung ist. Bei Totband null entfällt die Fläche und dies wird ausdrücklich angegeben. Ausblenden von `show_room_assist_deadband` entfernt gemeinsam Einstellung, Band und Legende.
Die Werte stammen aus Home-Assistant- und Velair-Laufzeitzustand und werden nicht als neuer Verlauf gespeichert. Ohne aktiven verwalteten Temperaturblock zeigt der Tab einen Wartezustand statt Platzhalterwerten. Ist ein Sensor gewählt, Assist aber ausgeschaltet, zeigt er, dass der Sensor gespeichert, jedoch nicht wirksam ist. Bei einem konfigurierten festen Heiz- oder Kühlbereich liegt das Totband stattdessen um den gewählten Referenzsollwert, jeweils minus und plus Totband.

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
- saisonale Modi oder andere Aktionen einmal nach Bestätigung eines neuen saisonalen Bereichs wählen und ungültige Messwerte sofort melden.

Sie verwenden Home-Assistant-Zustandsereignisse und konfigurierbare Verzögerungen statt regelmäßiger Abfragen. Der Anwesenheits-Blueprint kann melden, wenn zusammengefasste Gruppe, Templatesensor oder Helfer nicht verfügbar bleibt, ohne Zuhause- oder Abwesenheitsaktionen auszuführen. Der Fenster-Blueprint kennzeichnet seine eigene Pause, damit Fensterschließen keine manuelle oder von einer anderen Automatisierung verwaltete Pause entfernt. Bleibt ein Kontakt unbekannt oder nicht verfügbar, zeigt Home Assistant eine verzögerte Diagnosebenachrichtigung für die Thermostatgruppe und entfernt sie nach Erholung automatisch. Der betroffene Kontakt blockiert das Fortsetzen weiterhin.
[Automatisierungs-Blueprints](blueprints.de.md) erläutert Einrichtung, Beispiele, Startverhalten und die Regel einer Fensterautomatisierung je Zone.

Der [saisonale Blueprint](blueprints/seasonal-climate-selection.de.md) bestätigt einen neuen saisonalen Bereich standardmäßig über 30 Minuten. Änderungen innerhalb dieses Bereichs behalten die ursprüngliche Frist bei; die Aktionen werden pro Eintritt in den Bereich einmal ausgeführt. Startprüfungen prüfen nur Diagnosen. Wähle Velair-Modi im normalen Home-Assistant-Aktionseditor. Konfiguriere einen tatsächlichen Pausen-und-Aus-Modus, wenn mildes Wetter die Klimatisierung stoppen soll. Leere Aktionen lassen den aktuellen Betrieb unverändert.

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

Aktuelle Exporte des Modells 25 erhalten beide Vorlagenverknüpfungen, Presetreferenzen, Vorkonditionierungs-Masterbeziehungen, Zielformat- und Referenzrichtlinien sowie Raumgruppenzuständigkeit und gemeinsame Konfiguration. Akzeptierte Master-Ausführungsanker bleiben lokal. Zeitplan- oder Profilexporte enthalten benötigte Vorlagen und Presets als zusätzliche Auswahl. Sind Gruppen beteiligt, werden erforderliche Raumgruppen, Zeitpläne und Profile ebenfalls eingeschlossen, auch bei einem Lernexport. Importe prüfen die Gesamtkonfiguration einschließlich bestehender Nutzer ersetzter gemeinsamer Ressourcen. Presets werden nach stabilem Schlüssel zusammengeführt: passende ersetzt, nicht enthaltene lokale erhalten. Alte Sicherungen bleiben importierbar; ältere Velair-Versionen können Modell 25 nicht importieren. Siehe [Sicherungsbeispiel](linked-schedule-examples.de.md#back-up-the-whole-setup).

Beim Import wählst du die zu überschreibenden Bereiche. Ausgewählte Daten werden ersetzt; exportiere vorher, wenn ein Wiederherstellungspunkt nötig ist. Profil- und Modusdefinitionen sind portabel, ihre aktive Auswahl nicht. Velair behält aktive Profil-IDs, die noch existieren, und kehrt nur dann zu Standardzeitplänen zurück, wenn keine übrig bleiben.

Jeder neue Export zeichnet seine Temperatureinheit auf. Beim Import einer Datei aus dem anderen Einheitensystem rechnet Velair ausgewählte Temperaturwerte in die aktuelle Home-Assistant-Einheit um. An verfügbare Klimaentitäten gebundene Werte werden an deren wirksame Sollwertschrittweite angepasst. Unabhängige Werte verwenden sichere Genauigkeit, wenn keine gemeinsame Geräteschrittweite vorliegt. Der manuelle Zonen-Fallback ist portabel; die zuletzt lokal beobachtete Schrittweite wird bewusst nicht exportiert. Ältere Exporte ohne Einheit werden im Importbildschirm angekündigt und als Celsius interpretiert.

Lernen wird über die genaue Steuereinheits-ID zugeordnet: Home-Assistant-Klimaentitäts-ID für unabhängige Geräte oder stabile interne Gruppen-ID für Raumgruppen. Nicht zuordenbare Daten werden vor dem Import angezeigt und übersprungen. Passende Daten ersetzen die Kalibrierung; nicht enthaltenes lokales Lernen bleibt unverändert. Gruppenverläufe werden nicht auf Mitglieder verteilt. Lies [Raumgruppen](room-groups.de.md#learning-and-membership-changes) vor Entfernen oder Auflösen.

Das Wiederherstellen einer Gruppenlernsicherung stellt auch erforderliche Gruppenzuständigkeit und gemeinsame Konfiguration wieder her. Prüfe diese Abhängigkeiten in der Importvorschau; es ist keine isolierte Kalibrierungswiederherstellung ohne Mitgliedschaftsänderungen.

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

Pausiert die automatische Zeitplanausführung einer verwalteten Klimaentität, während das übrige Velair weiterläuft. Lasse sowohl `duration_minutes` als auch `until_next_block` weg, um diese Zone unbefristet zu pausieren.

Setze `until_next_block: true`, damit diese Pause beim nächsten Blockbeginn im wirksamen Zeitplan der Zone endet. Es gilt die nominale Blockzeit, kein früherer Vorkonditionierungsstart. Der Ablaufzeitpunkt wird beim Dienstaufruf festgelegt und bleibt über Neustarts erhalten; spätere Zeitplanänderungen verschieben ihn nicht. Die Option ist nicht mit `duration_minutes` kombinierbar. Existiert kein zukünftiger Block, schlägt der Aufruf ohne Änderung der Zone fehl. Andere Pausengründe halten die Zone weiterhin pausiert, bis auch sie enden.

```yaml
action: velair.pause_zone
data:
  entity_id: climate.guest_room
  pause_id: external_control
  action: none
  until_next_block: true
```

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
