<a id="planned-return"></a>
# Geplante Rückkehr
<!-- velair-docs:start -->
Übersetzungen: [Englisches Original](planned-return.md) · [Español](planned-return.es.md) · [Français](planned-return.fr.md) · [Deutsch](planned-return.de.md) · [Italiano](planned-return.it.md) · [Nederlands](planned-return.nl.md) · [Polski](planned-return.pl.md) · [Português (Brasil)](planned-return.pt-br.md) · [Português (Portugal)](planned-return.pt-pt.md) · [Русский](planned-return.ru.md) · [Übersetzungsstatus](../translation-status.md)

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

Geplante Rückkehr bereitet das Zuhause auf eine regelmäßige oder einmalige Ankunft vor, sobald ausgewählte Anwesenheitssignale bestätigen, dass das ganze Zuhause leer ist, oder nach einem ausdrücklichen einmaligen Start ohne konfigurierte Anwesenheitsquellen. Konfiguriere die Funktion in Velair; eine stabile Wochenroutine benötigt weder zusätzlichen Blueprint noch tägliche Aktion. Die automatische Routine ist standardmäßig deaktiviert und läuft lokal in Home Assistant. Einmalige Rückkehrpläne benötigen gespeicherte Abwesenheits-/Rückkehrmodi und eine betriebsbereite automatische Zeitplanung. Anwesenheitsquellen sind für ausdrückliche Starts optional; die Wochenroutine benötigt mindestens eine.

<a id="setup"></a>
## Einrichtung

1. Erstelle die gewünschten Abwesenheits- und Zuhause-Modi oder verwende Standard als Ziel. Abwesenheitsprofile können Geräte ausschalten oder Wochenzeitpläne mit geringerem Bedarf verwenden.
2. Öffne **Vorkonditionierung**, wähle **Geplante Rückkehr** in der Bereichsauswahl und füge Anwesenheitssignale für überwachte oder wöchentliche Abreisen hinzu. Verwende Binärsensoren, Eingabeschalter, Gruppen oder die Home-Assistant-Zuhausezone `zone.home`. Berücksichtige alle Personen, die im Zuhause bleiben können, einschließlich Gästen. Home Assistant bleibt für Personen- und Standortverfolgung zuständig; komplexe Regeln lassen sich weiterhin in einem Helfer zusammenfassen.
3. Wähle im Abwesenheitsbereich, wie lange das Zuhause leer bleiben muss und welcher Abwesenheitsmodus aktiviert wird. Standard sind zehn Minuten; das kompakte Bedienelement akzeptiert Minuten oder Stunden. Anwesenheit bei Rückkehr wird sofort berücksichtigt.
4. Trage im Ankunftsbereich die übliche Uhrzeit für jeden zutreffenden Wochentag ein und wähle den Zielmodus. Tage ohne Uhrzeit haben keine automatische Rückkehr. Velair bereitet jede Zone anhand des Zielzeitplans zur Ankunft vor.
5. Aktiviere adaptive Vorkonditionierung für frühzeitig vorzubereitende Zonen. Bestehende Einstellungen und lokale Heiz-/Kühllerndaten werden wiederverwendet.
6. Aktiviere die Routine mit dem Schalter in der Statusleiste und speichere. Der Schalter bearbeitet den Entwurf; Abbrechen stellt den gespeicherten Wert wieder her. Beende andere Zuhause-/Abwesenheitsautomationen, die Modi desselben Haushalts wählen, damit keine zwei Steuerungen konkurrieren.

Wochentage folgen der in Velair gespeicherten Einstellung **Erster Wochentag**. Trage die Ankunft direkt je Tag ein. Verlässt du das Zuhause an einem Tag ohne Uhrzeit, aktiviert Velair nach Bestätigung Abwesenheit, plant keine frühzeitige Vorbereitung und stellt bei erkannter Anwesenheit den Zielmodus wieder her. Die Home-Assistant-Zeitzone steht neben der Wochenroutine. Änderungen bleiben bis zum Speichern Entwurf. Abbrechen und Speichern befinden sich rechts in der Konfigurationsfußzeile.

Die obere Zusammenfassung gruppiert drei Routineteile in separaten umrandeten Bereichen passend zu den Einstellungen, ohne umschließende Karte oder gemeinsame Seitenlinie. Die Wochenroutine zeigt Abwesenheitsmodus, Bestätigungsverzögerung, adaptive Vorbereitung und Zielmodus als einfachen Ablauf; ihr Schalter ändert den Aktivierungsentwurf. Die Verzögerung bedeutet, wie lange das Zuhause leer bleiben muss, nicht eine geschätzte Vorbereitungszeit. Der Anwesenheitsbereich zeigt Gesamtergebnis und Quellenanzahlen; klappe ihn zur Signalprüfung auf. Unbekannte Signale verhindern neue Abwesenheiten und sind von bestätigter Anwesenheit getrennt. Die schnelle Rückkehr gruppiert einmalige Abreise und Ankunftsbedienelemente der aktuellen Episode. Laufzeitaktionen verwenden die gespeicherte Konfiguration; speichere oder verwerfe ausstehende Konfigurationsänderungen vor einer neuen Abreisemeldung.

Das Formular folgt Abreise und Ankunft: Anwesenheitsquellen, Abwesenheitsverzögerung und Abwesenheitsmodus, danach wöchentliche Ankunftszeiten und Zielmodus. Nach Quellenauswahl verwendet es die runde grüne Hinzufügen-Aktion des Blockeditors. Deaktivierte Hinzufügen-/Entfernen-Aktionen bleiben transparent; aktive Aktionen reagieren auf Hover und Fokus. Die Quellenliste beginnt eingeklappt. Ihre Zusammenfassung zeigt Gesamtzahl und Anzahlen anwesender, abwesender und unbekannter Signale; aufgeklappt lassen sich Quellen prüfen oder entfernen. Mobil erstreckt sich die Zusammenfassung über Auswahl und Hinzufügen-Zeile. Symbole und Zahlen halten die Anzahlen zusammen und haben vollständige zugängliche Beschriftungen. Zähler sind am hinteren Rand ausgerichtet. Mobil hat die aufgeklappte Liste dieselbe Breite, Entfernen steht am Zeilenende und Namen/IDs erhalten mehr Platz. Desktoplisten entsprechen der Auswahlbreite. Aufklappen verändert keine Konfiguration. Stundenverzögerungen werden auf die nächste Minute gerundet; die entsprechende Dauer wird neben dem Bedienelement angezeigt.

Erkannte Anwesenheitszustände sind `on` und `home`, Abwesenheitszustände `off` und `not_home`. Bei der Zuhausezone bedeutet null Personen leer und eine positive Anzahl anwesend. Jedes Anwesenheitssignal macht das Zuhause belegt; nur Abwesenheit aller Signale macht es leer. Ohne Anwesenheit und mit einer unbekannten oder nicht verfügbaren Quelle ist der Gesamtzustand unbekannt: Neue Abwesenheiten beginnen nicht. Ein angenommener Rückkehrplan bleibt bestehen. Das Panel zeigt Gesamtergebnis und jede Quelle.

Wähle Signale, die tatsächliche Anwesenheit repräsentieren: Ein ausgeschalteter Bewegungssensor bedeutet nicht unbedingt, dass niemand zuhause ist.

<a id="room-preparation"></a>
## Raumvorbereitung

Klappe **Room preparation** unter dem Routineablauf auf, um jedes verwaltete Gerät zu sehen. Die Liste beginnt eingeklappt und nennt Anzahlen für adaptive Vorbereitung, Aktion nur bei Ankunft und keine Vorbereitung. Aufklappen verändert keine Einstellungen und sendet keine Klimabefehle. Die Übersicht gilt für wöchentliche und einmalige Rückkehr.

Jede Zeile nennt Raum, Zielzeitplanquelle und Vorbereitungsstatus. Geräte außerhalb der Zielmodusprofile verwenden weiterhin **Standard**; ausdrücklich normales Verhalten ebenfalls. Ein Profilzeitplan zeigt dessen Namen. Zielprofilpause, deaktivierte Zone und externe Ausführung werden separat genannt statt als „nur bei Ankunft“. Ohne adaptive Vorkonditionierung folgt ein aktivierter lokaler Raum bei Ankunft seinem wirksamen Zeitplan und ist nicht automatisch vom Moduswechsel ausgeschlossen.

Ohne zukünftige Rückkehr beschreibt die Liste gespeicherte Konfigurationsmöglichkeiten, keine Frühstartvorhersage. Nach Annahme einer Rückkehr ermittelt sie je Raum das Ankunftsziel und zeigt ausstehend, vorbereitend, Ziel erreicht, ausgesetzt oder nicht verfügbar mit Grund. Fehlende Temperaturen oder gültige Schätzungen verhindern Frühvorbereitung. Temporäre Anpassung, manuelle Anpassung und ausdrückliche Pausen behalten Vorrang. Unbestätigte Abreise kann nicht als vorbereitend erscheinen. **Preparing** bezeichnet Velairs aktive Vorbereitungsabsicht, nicht bestätigte Befehlsannahme oder physischen Betrieb. **Target reached** bedeutet aktuelle Temperatur innerhalb der Vorbereitungstoleranz und kann schon vor Abreise zutreffen; es beginnt keine Abwesenheit und umgeht keine Bestätigung.

**Planned start** ist eine Schätzung, kein Beleg für Klimabefehl oder physische Bereitschaft. Ziele unterstützen Heizen, Kühlen und Bereiche. Abgeschlossene, abgebrochene oder übersprungene Rückkehr zeigt wieder Konfigurationsinformationen statt veralteter Vorbereitungszeiten. Die Diagnose verwendet bis zum erfolgreichen Speichern weiterhin gespeicherte Backend-Einstellungen, ohne zusätzliche Vorbereitungserinnerung. Diese vollständige Liste ersetzt die ältere episodenbezogene Zonenliste.

<a id="one-off-return"></a>
## Einmalige Rückkehr

Wähle unter **One-off return** ein zukünftiges Datum und eine Uhrzeit, dann **Plan return**. Datum und Zeit stehen zusammen. Mobil folgt die Aktion in der nächsten Zeile rechts bündig mit dem Zeitfeld; größere Layouts behalten sie neben den Feldern. Die Erklärung steht darunter. Das geht vor der Abreise oder unterwegs. Velair verwendet gespeicherte Modus- und Anwesenheitseinstellungen. Bei konfigurierten Quellen bleibt die Anfrage ausstehend und Abwesenheit startet erst nach durchgängiger Abwesenheitsmeldung aller Quellen über die Bestätigungsdauer. Das schützt zuhause verbleibende Personen. Ohne gespeicherte Quellen ist **Plan return** deine ausdrückliche Abreisebestätigung: Abwesenheit startet sofort ohne Verzögerung. Velair leitet dann kein leeres Zuhause ab und erkennt keine physische Rückkehr; es bereitet normal vor und aktiviert das Ziel zur gespeicherten Ankunft. Konfigurierte unbekannte/nicht verfügbare Quellen warten weiterhin. Eine fehlende Entität zählt nicht als leere Quellenliste.

Einmaliges Datum und Uhrzeit ersetzen nur für diese Abwesenheit die Wochenzeit. Das funktioniert auch bei deaktivierter automatischer Routine. Du kannst die ausstehende Meldung ändern oder abbrechen; fehlt Abreisebestätigung bis zur Ankunft, läuft sie ohne Moduswechsel ab. Melden bereits alle Quellen Abwesenheit und gibt es keine aktive Episode, startet Planung sofort die Bestätigungsverzögerung, ohne neue Sensoränderung. Bei bereits aktiver Abwesenheit änderst du Ankunftsdatum/-zeit im vorhandenen Episodeneditor; das macht die Rückkehr zur einmaligen Ausnahme ohne erneutes Anwenden der Abwesenheit. Verschieben auf später beendet bisherige Vorbereitung und stellt bis zur neuen Vorbereitungszeit das aktuelle Abwesenheitsverhalten wieder her. Temporäre und manuelle Anpassungen bleiben geschützt. Das Ziel wird am gewählten lokalen Ankunftsdatum ermittelt, auch bei Vorbereitungsbeginn am Vortag. Dieselbe Zeit erneut einzureichen setzt Vorbereitung nicht zurück. Vergangene oder aktuelle Ankünfte und bei Sommerzeitwechsel nicht existierende Uhrzeiten werden abgelehnt; doppelte lokale Uhrzeiten verwenden das früheste noch zukünftige Vorkommen.

Abgeschlossene, übersprungene und abgebrochene Episoden sperren die automatische Routine bis erkannter Anwesenheit, damit ein leeres Zuhause nicht selbst eine weitere Wochenabreise startet. Du kannst nach jeder inaktiven Episode ausdrücklich **Plan return** wählen, ohne auf Heimkehr zu warten. Die neue Anfrage verwendet aktuelle Quellen und Modi. Mit Quellen wird Abwesenheit erneut für die konfigurierte Dauer bestätigt, auch wenn alle bereits weg sind, ohne sofortigen Moduswechsel. Ohne Quellen startet die ausdrückliche Registrierung sofort Abwesenheit. Seitenleiste und Dashboardkarte zeigen bei inaktiver Episode ein neues Planungsformular. Ist Planung nicht verfügbar, bleibt es mit deaktiviertem **Plan return** und Erklärung der nötigen gespeicherten Einstellungen und Zeitplanerzustände sichtbar. Eine aktive Rückkehr kann trotzdem abgebrochen werden.

Nach bestätigter Abreise beendet **Abbrechen** die Rückkehr und stellt zuvor aufgezeichneten Modus und Profile wieder her. **Ankunft ändern** aktualisiert Datum und Zeit. Während Bestätigung lässt Abbrechen die Auswahl unverändert, da Abwesenheit noch nicht angewendet wurde. Deaktivieren der automatischen Routine oder Ändern von Wochenzeiten beendet keine manuelle Rückkehr. Ändern ihrer Quellen oder Modi macht die vorherige Meldung ungültig. Ausdrückliche Modus-/Profilauswahl beendet ausstehende und aktive Rückkehr. Ein gestoppter Zeitplaner führt sie nicht aus.

Die erste Zeile hat links den Titel der einmaligen Rückkehr und rechts Anwesenheitsanzeigen nur auf der Karte. Die aktuelle Phase ist ein kompakter Untertitel am Titel, keine eigene Kapsel oder Zeile. Während Bestätigung liefert stattdessen die Timerüberschrift die Phase. Auf der Dashboardkarte stehen bei Quellenkonfiguration die Anzahlen oben rechts. Ohne Quellen fehlen Zähler und ungenutztes Verzögerungssymbol; die Seitenleiste zeigt **Nicht überwacht** statt unbekannter Anwesenheit. Das Bestätigungsverzögerungssymbol erscheint nur vor bestätigter Abwesenheit, nicht bei Abwesend/Vorbereitung oder aktiven Fehlern mit bestätigter Abreise. Die Seitenleiste wiederholt diese Anzeigen nicht. Hover zeigt eine kurze Phasenerklärung.

Während Bestätigung erklärt eine dezente Timerzeile, dass Velair prüft, ob das Zuhause leer bleibt. **Bis** zeigt die Backend-Bestätigungsfrist in lokaler Home-Assistant-Zeit, bei anderem Datum auch dieses. Abwesenheit startet nach Bestätigung nur bei weiter abwesenden Quellen. Das ist ein Termin, kein Live-Countdown oder bestätigte Abreise. Derselbe Ablauf erscheint bei Bestätigung der Wochenroutine vor einer Episode; fehlende Termindaten erzeugen keine erfundene Zeit.

Vor bestätigter Abreise kennzeichnen Ankunftssymbol und **Expected arrival** die gespeicherte Rückkehr mit zugänglicher Beschriftung und Tooltip. Die Zeile ist an Titel und Zustandstext ausgerichtet. Gespeichertes Datum/Zeit ist ein kompakter klickbarer Chip ohne Stift oder Unterstreichung. Der bestätigte Zeitverlauf verwendet dasselbe Symbol; nur unterstrichenes Datum/Zeit und der Stift links bilden die Bearbeitungsschaltfläche. Öffne damit den eingebetteten Datums-/Zeiteditor. Seine Aktionszeile hat links blaues **Zurück** mit Pfeil und rechts grünes **Ankunft ändern**. Zurück verwirft ungespeicherte Ankunftsänderungen und schließt den Editor ohne Rückkehränderung. Im breiten Seitenleistenpanel bleibt der Editor kompakt am Ankunftsendpunkt ausgerichtet, die Änderungsaktion rechts darunter. Schmale Bildschirme und Karte behalten responsive Anordnung.

Eingaben sind bis zum Anfordern verborgen. **Zurück** stellt die neueste gespeicherte Ankunft wieder her, versteckt Felder und löscht Ankunftswarnung und Navigationsschutz. Unabhängige ungespeicherte Routinekonfiguration bleibt geschützt. Erneutes Öffnen beginnt mit der gespeicherten Ankunft. Bei bestätigter Abwesenheit ist der Ankunftsendpunkt dieselbe Bearbeitungsschaltfläche, ohne doppelte Ankunft. Abbrechen steht nur bei geschlossenem Editor links unter Grafik und Vorbereitungstext. Beim Bearbeiten ist es verborgen; Ankunft ändern steht rechts und Zurück links zum lokalen Verwerfen. Eingaben ändern den Plan erst nach erfolgreichem **Ankunft ändern**. Erfolg schließt den Editor und gibt Fokus an die gespeicherte Ankunft zurück. Fehler und Sensorupdates behalten den offenen Entwurf. Ein Hinweis kennzeichnet ungespeicherte Änderung; Navigation oder Neuladen warnt vor Verwerfen. Speichern der Routine übernimmt keine Ankunftsänderung.

Zurück und Ankunft ändern haben kompakte blaue beziehungsweise grüne gefüllte Flächen, 32 Pixel hoch innerhalb 44-Pixel-Touchziele. Abbrechen verwendet unter Episodendaten eine kompakte rote Fläche mit weißen Symbolen/Text, ebenfalls 32 in 44 Pixeln, mit klarer Hover-/Fokusreaktion. Vordergrundfarben passen sich fürs Lesen dem Theme an. Nicht verfügbare Aktionen haben neutralen Hintergrund, gedämpften Text/Symbole und Verbotscursor. Ankunft ändern wird bei geänderter Ankunft grün. Die Phase bleibt am Titel. Abbrechen bleibt links unter Daten, Ankunft ändern rechts unter offenem Editor. Seitenleiste und Karte behalten dies mobil. Plan return bleibt rechts im neuen Formular. Erfolgreiche Aktionen aktualisieren ohne zusätzliche Speichermeldung die Episode.

<a id="home-assistant-actions"></a>
### Home-Assistant-Aktionen

Automationen, Skripte und Dashboards melden Abreise mit `velair.start_planned_return`. `return_date` (`YYYY-MM-DD`) und `return_time` (24 Stunden, `HH:MM`) sind erforderlich und müssen zusammen eine zukünftige Ankunft in Home-Assistant-Zeitzone angeben. Der native Zeitwähler darf `HH:MM:00` senden; null Sekunden werden akzeptiert und auf Minuten normalisiert. Wähle für folgendes Beispiel ein zukünftiges Datum:

```yaml
action: velair.start_planned_return
data:
  return_date: "2026-10-09"
  return_time: "19:25"
```

Das verwendet gespeicherte Anwesenheit/Modi und dieselben Bestätigungs-, Vorbereitungs- und Vorrangregeln wie **Plan return**. Es funktioniert ohne Wochenroutine und aktualisiert bei aktiver Abwesenheit Datum/Zeit ohne erneuten Abwesenheitswechsel. Gespeicherte Modi und Automatik müssen betriebsbereit sein. Quellen sind optional: leere Liste aktiviert sofort Abwesenheit, konfigurierte Quellen behalten normale Bestätigung. Vergangene/aktuelle Ankunft wird abgelehnt, ohne den vorherigen Plan zu ersetzen. Abgelaufene oder nicht existierende Sommerzeit-Uhrzeit wird abgelehnt; in doppelter Stunde gilt das früheste zukünftige Vorkommen.

Ausstehende oder aktive Rückkehr abbrechen:

```yaml
action: velair.cancel_planned_return
data: {}
```

Dieselbe Aktion schließt auch Hinweise inaktiver Episoden. Sie stoppt Vorbereitung und zeitgesteuerte Rückkehr und behält die automatische Abbruchsperre. Nach bestätigter Abreise stellt sie Modus und genaue Profilauswahl von vor Episodenbeginn wieder her. Während Bestätigung bleibt die Auswahl unverändert. Ein neuer ausdrücklicher **Plan return** kann die inaktive Episode ersetzen. Seitenleiste und Karte verwenden dieselbe Abbruchaktion.

<a id="cancelling-a-return-examples"></a>
## Rückkehr abbrechen: Beispiele

Die Bestätigungsverzögerung liegt **vor** dem Anwenden des Abwesenheitsmodus. Ein Abbruch darin benötigt keine Wiederherstellung, da vorheriger Modus und Profile noch aktiv sind. Nach bestätigter Abreise wird die zu Episodenbeginn vermerkte Auswahl wiederhergestellt, statt sofort den konfigurierten Rückkehrmodus zu aktivieren.

Für die Beispiele gilt:

- **Komfort** ist aktiv mit **Wohnzimmerkomfort** und **Schlafzimmerkomfort**.
- Abwesenheitsmodus ist **Abwesend**, Rückkehrmodus **Abend**, Ankunft 18:00.
- Quellen melden um 13:00 ein leeres Zuhause; Bestätigung dauert fünf Minuten.

<a id="cancel-before-confirmation-finishes"></a>
### Vor Abschluss der Bestätigung abbrechen

| Zeit | Ablauf | Gewählter Modus und Profile |
| --- | --- | --- |
| 13:00 | Rückkehr starten. Velair prüft leeres Zuhause bis 13:05. | Komfort und beide Profile bleiben aktiv. |
| 13:02 | Während Bestätigung **Abbrechen** wählen. | Komfort und beide Profile bleiben; Abwesend wurde nie angewendet. |

Die geplante Ankunft um 18:00 wird entfernt. Diese abgebrochene Episode aktiviert später weder Abwesend noch Abend.

<a id="cancel-after-departure-is-confirmed"></a>
### Nach bestätigter Abreise abbrechen

Eine separate Episode mit derselben Anfangskonfiguration:

| Zeit | Ablauf | Gewählter Modus und Profile |
| --- | --- | --- |
| 13:00 | Rückkehr starten und bestätigen. | Komfort und beide Profile bleiben. |
| 13:05 | Alle Quellen melden weiter Abwesenheit. | Velair aktiviert Abwesend mit Profilen. |
| 13:10 | **Abbrechen** wählen. | Velair stellt Komfort und die ursprünglichen Profile wieder her und entfernt die Ankunft. |

Ergebnis ist Komfort, **nicht** der konfigurierte Rückkehrmodus Abend. Bereits gestartete Abendvorbereitung wird ebenfalls entfernt und die ursprüngliche Auswahl wiederhergestellt. Aktive temporäre/manuelle Anpassungen und unabhängige Pausen behalten Vorrang.

<a id="start-without-occupancy-sensors"></a>
### Ohne Anwesenheitssensoren starten

Ohne Quellen aktiviert **Plan return** sofort Abwesend. Es gibt keinen Fünf-Minuten-Bestätigungsschritt. Abbrechen stellt Komfort und die unmittelbar zuvor vermerkten Profile wieder her. Ein konfigurierter unbekannter/nicht verfügbarer Sensor zählt nicht als keine Sensoren; er blockiert weiterhin neue Abwesenheitsbestätigung.

<a id="default-arrival-edits-and-restart"></a>
### Standard, Ankunftsänderungen und Neustart

Beginnt die Episode mit **Standard** ohne aktive Profile, kehrt Abbrechen nach bestätigter Abreise zu Standard ohne Profile zurück. Eine manuelle Profilkombination wird in ursprünglicher Reihenfolge wiederhergestellt.

Ankunftsänderung von 18:00 auf 19:00 oder Home-Assistant-Neustart ersetzt die vorherige vermerkte Auswahl nicht. Abbrechen stellt weiterhin die Auswahl vor Episodenbeginn her, keine früheren Temperaturen oder HVAC-Zustände. Die wiederhergestellte Auswahl verwendet aktuelle Zeitpläne und vorhandene Übersteuerungen.

<a id="choose-another-mode-instead-of-cancelling"></a>
### Einen anderen Modus statt Abbrechen wählen

Wählst du bei aktiver Rückkehr ausdrücklich **Eco**, beendet diese Auswahl die Rückkehr und behält Eco. Velair stellt später bei Anwesenheitsänderung oder Schließen des abschließenden Hinweises Komfort nicht wieder her. Das bewahrt deine ausdrückliche Auswahl und unterscheidet sich von **Abbrechen** der Episode.

<a id="distinguish-the-controls"></a>
### Die Bedienelemente unterscheiden

- **Abbrechen** in Rückkehrbedienelementen beendet die Episode wie beschrieben.
- **Zurück** im Ankunftseditor verwirft nicht übernommene Ankunftsänderungen; gespeicherte Rückkehr läuft weiter.
- **X** im allgemeinen Klimakarten-Aktionspanel schließt nur dieses Panel, nicht die Rückkehr.
- **Abbrechen** neben **Speichern** der Routine verwirft ungespeicherte Einstellungen, nicht die Episode.

Für ältere Episoden ohne vorige Auswahl oder ungültige gespeicherte Profile siehe [Wiederherstellungsgrenzen](#restoration-limits).

<a id="daily-behavior"></a>
## Tägliches Verhalten

Konfiguriere beispielsweise Montag bis Freitag um 18:15. Nach leerem Zuhause über die Bestätigungsdauer aktiviert Velair Abwesend und ermittelt den Zuhause-Zeitplan um 18:15. Jede Zone verwendet ihre eigene Vorbereitungsschätzung. Ein Raum mit einer Stunde Bedarf beginnt um 17:15, schnellere später.

Das Ziel ist der **bei Ankunft** wirksame Block einschließlich Wochenkontinuität. Fordert Zuhause vor 18:00 17 Grad und danach 21 Grad, bereitet Rückkehr um 18:15 21 Grad vor, auch mit Vorbereitungsbeginn vor 18:00. Der Wochenplan wird weder bearbeitet noch mit temporären Blöcken ergänzt.

Zur erwarteten Zeit wählt Velair das Ziel und folgt dem normalen Zeitplan. Frühzeitige Anwesenheit wählt das Ziel sofort. Späte Ankunft schaltet nicht zurück zu Abwesend. Pausen, temporäre und manuelle Anpassung, deaktivierte Zonen und gestoppter Zeitplaner behalten die Übermittlungsbedingungen. Vorbereitung unterstützt Heizen, Kühlen und native Bereiche. Sie soll den Raum nahe ans Ziel bringen, garantiert aber keine genaue Temperatur.

<a id="preparation-and-room-assist"></a>
### Vorbereitung und Room Assist

Der Zielmodus definiert die Ankunftskonfiguration. Jede Zone beginnt zur eigenen geschätzten Zeit; der gesamte Modus wird erst bei Ankunft gewählt, nicht beim ersten Vorbereitungsbeginn. Noch nicht gestartete Zonen folgen weiter Abwesenheit.

Nach Vorbereitungsstart hat das temporäre Ankunftsziel Vorrang vor späteren Abwesenheitsblöcken. Beispiel mit zehn Stunden Abwesenheit und Rückkehr 19:25:

| Zeit | Raumziel |
|---|---|
| 09:25, Abwesenheit bestätigt | Abwesend fordert 16 Grad |
| 16:25, Raumvorbereitung beginnt | Ankunftszeitplan fordert 21 Grad |
| 17:00, Abwesenheitsblock fordert 18 Grad | Vorbereitung bleibt bei 21 Grad |
| 19:25, geplante Ankunft | Zielmodus beginnt normalen Zeitplan |

Ein Abwesenheitsblock beendet Raumvorbereitung nicht. Dieser Vorrang gilt auch für Kühlen und Bereiche.

Aktives Room Assist folgt demselben temporären Ankunftsziel. Hier unterstützt es 21 Grad statt zur Abwesenheitstemperatur 16 Grad zurückzukorrigieren. Der gesendete Sollwert kann von 21 Grad abweichen, weil Room Assist Unterschiede zwischen Raum- und Gerätesensor ausgleicht. Wartende Korrekturen werden vor Übermittlung gegen das aktuelle Ziel geprüft.

Direkte Temperaturänderungen folgen der externen Zonenrichtlinie. **Automatisch beibehalten** wendet die aktuelle maßgebliche Absicht erneut an, während Vorbereitung also das Ankunftsziel. **Manuelle Anpassung** setzt automatische Übermittlung und Room Assist für diese Zone aus. Temporäre Anpassung und ausdrückliche Zonenpausen behalten Vorrang und beenden nicht die gesamte Haushaltsrückkehr. Siehe [Room Assist](room-assist.de.md) und [Manuelle Anpassung](manual-control.de.md).

<a id="exceptions-and-restarts"></a>
## Ausnahmen und Neustarts

Der Bereich Geplante Rückkehr zeigt angenommenen Plan, Raumvorbereitung und gespeicherte Routine gemeinsam. Öffne ihn mit `/velair/preconditioning/planned-return`; `/velair/preconditioning/preconditioning` öffnet adaptive Vorkonditionierung als Standardbereich. Eine Ankunftsänderung gilt nur für diese Abwesenheit, nicht die gespeicherte Woche. **Abbrechen** entfernt Vorbereitung und automatischen Zielwechsel. Vor Bestätigung bleibt die Auswahl gleich; danach werden Modus/Profile vor Episodenbeginn wiederhergestellt.

Ausdrückliche Modus-/Profilauswahl beendet automatische Rückkehr. Spätere Anwesenheit oder Neustart darf sie nicht überschreiben. Velair merkt abgeschlossene/abgebrochene Abwesenheiten bis erneuter Anwesenheit.

Die ausdrückliche Auswahl beendet auch laufende Vorbereitung, selbst bei bereits aktivem gewähltem Modus oder Profil. Das unterscheidet sich von einem Temperaturwechsel innerhalb des Abwesenheitszeitplans, der Vorbereitung nicht beendet. Seitenleiste und Karte bieten weder Überspringen, Ich bin zuhause noch Schließen; gemeinsame Rückkehraktionen sind Abbrechen und Ankunft ändern. Das Backend behält separate Überspring- und Ankunftsoperationen für API-Clients; Verträge stehen in der [Entwickler-API](../developer/api.md). `velair.cancel_planned_return` beendet ausstehende oder bestätigte aktive Rückkehr oder schließt inaktive Hinweise. Es stoppt Vorbereitung und zeitgesteuerte Rückkehr und verhindert automatischen Neustart dieser Abwesenheit. Bei bestätigter Abreise stellt es vorige Auswahl wieder her; bei Bestätigung oder abschließendem Hinweis ändert es sie nicht. Ein neuer ausdrücklicher **Plan return** bleibt möglich.

<a id="restoration-limits"></a>
### Wiederherstellungsgrenzen

Für einmalige Rückkehr vermerkt Velair die Auswahl beim Wählen von **Plan return**, für Wochenroutine bei bestätigter Abwesenheit unmittelbar vor Anwendung des Abwesenheitsmodus.

Die vorherige Auswahl übersteht Ankunftsänderungen und Neustarts. Wiederhergestellt wird Profilauswahl, nicht frühere Temperatur oder Gerätezustand; Profile verwenden aktuelle Zeitpläne und bestehende Vorrangregeln. Wurde der vorherige Modus gelöscht/geändert, können ursprüngliche Profile manuell wiederhergestellt werden. Fehlt ein gespeichertes Profil, ist es ungültig oder kollidiert es mit einem anderen, gelingt Abbrechen trotzdem, behält aber die aktuelle Auswahl und meldet fehlende Wiederherstellung. Episoden vor Einführung dieser Metadaten behalten aktuelle Auswahl, da Velair die frühere nicht ableiten kann.

Nach Neustart werden ausstehende einmalige Meldungen und bestätigte Abwesenheiten wiederhergestellt statt neu gestartet. Unbestätigte Abwesenheit startet Bestätigungsdauer neu. Meldet ein Sensor Anwesenheit, wird die vorherige Abwesenheit abgeglichen, auch wenn die Ankunft während des Home-Assistant-Ausfalls lag.

<a id="limits-and-backups"></a>
## Grenzen und Sicherungen

- Eine Routine für das ganze Zuhause wird unterstützt. Wöchentliche Ankünfte gelten weiter am selben Tag: Abreise nach der heutigen Zeit oder an einem Tag ohne Zeit aktiviert Abwesenheit ohne morgige Rückkehr. Einmalige Rückkehr erlaubt jedes zukünftige Datum.
- Kalender, wechselnde Schichten und automatische Übernachtroutinen werden nicht ausgewertet.
- Ohne aktivierte Vorkonditionierung, Messwert oder Temperaturziel wechselt das Ziel weiterhin bei Ankunft, aber der Raum startet nicht frühzeitig.
- Übergänge mit extern ausgeführten Zonen werden vor Moduswechsel abgelehnt; Velair übernimmt nicht deren lokale Steuerung.
- Der allgemeine Zuhause-/Abwesend-Blueprint bleibt unverändert und für andere Installationen/Aktionen hilfreich.
- Portable Sicherungen enthalten Routinenkonfiguration, keine Anwesenheitsepisoden oder Timer. Importierte Routinen bleiben bis ausdrücklicher Aktivierung deaktiviert.

Grundlegende Bedienelemente erklären [Klimaprofile](climate-profiles.de.md), [Adaptive Vorkonditionierung](adaptive-preconditioning.de.md) und [Manuelle Anpassung](manual-control.de.md).

<a id="overview-and-diagnostics"></a>
## Übersicht und Diagnose

Die Übersicht zeigt während wöchentlicher oder einmaliger Episoden oder bei Problemen eine kompakte Haushaltszusammenfassung mit Ursprung, Zustand und gegebenenfalls Bestätigungsfrist oder erwarteter Ankunft. Wähle sie zum Öffnen vollständiger Details in Vorkonditionierung.

Ein violettes Signal am Klimagerät kennzeichnet aktuelle Rückkehrzuständigkeit. Der Betriebszustand bleibt sichtbar: Das Signal erklärt die Herkunft, ersetzt aber Heizen, Kühlen, Pause, Planung oder Vorkonditionierung nicht. Zukünftige Startschätzungen sind separat beschriftet. Manuelle Steuerung, temporäre Anpassung und unabhängige Pausen behalten Vorrang. Abwesenheitszuordnung umfasst wirksame Abwesenheitsprofile oder ausdrücklich als Abwesenheitsmodus gewähltes Standard, nicht unzugeordnete Geräte, die nur ihren Standardzeitplan weiterführen. Vorbereitung darf den Standard-Ersatz des Ziels verwenden, wenn das Backend dessen Ankunftsziel wählt.

Die Diagnose zeigt Haushaltszustand, Steuerungsherkunft und Vorbereitung je Gerät einschließlich Aussetzungs-/Nichtverfügbarkeitsgrund. Die Verlaufskategorie Geplante Rückkehr vermerkt bedeutsame angenommene Übergänge ohne Duplikate durch Neuladen. Sie teilen die 100-Ereignis-Laufzeitgrenze und werden beim Neustart gelöscht. Kategoriepräferenzen bleiben gespeichert. Berichte enthalten diese Informationen und entfernen betriebliche Modus-/Profilkennungen. Steuerungsabsicht und erfolgreiche Übermittlung bleiben getrennt.

<a id="dashboard-card"></a>
## Dashboardkarte

Die optionale Lovelace-Karte zeigt kompakte einmalige Rückkehraktionen. Ihre Überschrift enthält Anzahlen anwesender, abwesender, unbekannter Quellen und gespeicherte Bestätigungsdauer. Wochenzusammenfassung, Quellenliste und Raumdetails bleiben in der Seitenleiste. Konfiguriere den Haushalt dort zuerst.

```yaml
type: custom:velair-card
view: planned-return
```

Wähle im visuellen Editor **Geplante Rückkehr**. Die Karte verwendet dieselbe gespeicherte Episode wie Seitenleiste und andere Karten und unterstützt zukünftige Daten/Zeiten. Aktive Episoden bieten **Abbrechen** und **Ankunft ändern**. Abbrechen stoppt angenommene Rückkehr und stellt nach bestätigter Abreise vorige Modus-/Profilauswahl wieder her; während Bestätigung bleibt sie gleich. Nach Abschluss, Abbruch oder anderer Inaktivität zeigt die Karte sofort ein neues Formular, ohne auf Anwesenheitsänderung zu warten. Ungültige Konfiguration oder gestoppter Zeitplaner deaktiviert Planung/Änderung, aber aktive Rückkehr lässt sich abbrechen. Seitenleiste verwendet dieselben Aktionen und Lebenszyklus; Wochenkonfiguration und Aktivierungsschalter bleiben dort. Nur hintere Quellen-/Verzögerungsanzeigen gehören ausschließlich zur Karte. Titel-Unterphase, Ankunftseditor und Zeitverlauf werden gemeinsam verwendet. Während Bestätigung ersetzt der Timerblock den Untertitel. Diese Haushaltsansicht hat keinen Thermostatfilter.

**Klimagerät: Status und Steuerung** kann **One-off return** als schnelle Velair-Aktion neben temporärer Anpassung und Pause zeigen. Aktiviere sie im Aktionseditor, wähle Namensanzeige oder platziere sie in „Mehr“. Der Editor gruppiert diese drei zuerst, auch deaktiviert. Sie öffnet dieselben kompakten Bedienelemente im unteren Steuerungspanel mit schlichter passender Überschrift. Alle drei Formulare verwenden 38-Pixel-Felder. Aktive Abreise zeigt vorhandenen Zeitverlauf und Ankunftseditor. X schließt Bedienelemente ohne Abbruch. Ungespeicherte Ankunftsänderungen verlangen Bestätigung des Verwerfens; während laufender Aktion ist Schließen blockiert. Die Aktion steuert immer den Haushalt unabhängig vom gewählten Gerät. Bestehende Karten behalten sie ausgeblendet; neue Karten aus der Home-Assistant-Kartenauswahl aktivieren sie. YAML muss sie mit `type: planned-return` in `climate_actions` ausdrücklich einschalten.

Während **Away** und **Preparing for arrival** zeigt die Karte bestätigte Abreise und gespeicherte Ankunft mit Abwesenheits-/Rückkehrmodusnamen. Der mit **Jetzt**-Tooltip bezeichnete aktuelle Zeitmarker folgt verstrichener UTC-Zeit auch über Zeitumstellungen und bleibt im Balken. Endpunkte zeigen Daten bei verschiedenen lokalen Home-Assistant-Kalendertagen. Ungespeicherte Änderungen verändern den Balken nicht. Ausstehende/abschließende Zustände und Episoden ohne bestätigten Abreisezeitpunkt bleiben statisch ohne Zeitverlauf. Seitenleiste und Karte aktualisieren lokale Uhren nur sichtbar und aktiv einmal pro Minute und sofort beim Sichtbarwerden. Diese Anzeigeaktualisierung fragt niemals Backend-Daten an.

Abreise-/Ankunftssymbole stehen an den Balkenenden mit nativen Tooltips und zugänglichen Beschriftungen. Gespeicherte Zeiten stehen nah darunter; nur Ankunft ist bearbeitbar. Schlichte Modusbeschriftungen mit generischem Modussymbol nennen die Konfigurationen. Lange Namen und mehrtägige Daten umbrechen im Panel. Jeder Endpunkt gruppiert Zeit und Modus nah darunter. Bearbeitungsfelder behalten kompakte Aktionsgröße; keine Schließen-Schaltfläche steht neben gespeicherter Zeit. Die Vorbereitungsposition ist eine kleine Balkenmarkierung mit Uhr und Erklärung unter den Zeiten. Verstrichener Balkenanteil, Endpunktstriche und Jetztmarker zeigen Zeitverlauf, keinen Temperaturfortschritt. Fehlt eine gültige erste Raumschätzung, erklärt ein kleines Infosymbol neben dem Rückkehrtitel die aktuelle Vorschau: Räume können ausgesetzt, schon am Ziel, ausgeschlossen oder nur bei Ankunft aktiv sein. Desktop-Hover/Fokus und mobiles Tippen öffnen Hilfe. Fehlende/gemischte Information bleibt unklar und bedeutet keine deaktivierte Frühvorbereitung. Escape oder Interaktion außerhalb schließt die Hilfe.

Bei gültiger adaptiver Backend-Schätzung für die gespeicherte Ankunft ergänzt der Zeitverlauf **Geschätzte Vorbereitung** mit Uhr und Zeit. Es ist die früheste geeignete Raumschätzung; andere beginnen später. Der sanft getönte Erklärungstext ist standardmäßig eingeklappt. Öffnen zeigt geeignete Räume und geschätzte Starts nach Zeit sortiert mit Home-Assistant-Raumnamen, Symbolen und lokaler Zeit samt Datum bei Bedarf. Ausgesetzte, bereits am Ziel befindliche und nur bei Ankunft aktive Räume fehlen. Öffnen fragt das Backend nicht ab. Normale Liveupdates bewahren den Zustand; geänderte gespeicherte Ankunft oder Episode schließt ihn. Beim Bearbeiten sind Erklärung und Ersatz-Infosymbol verborgen; der Balken behält gespeicherte Schätzung. Zurück stellt den Aufklappzustand derselben Episode wieder her. Hover über die Überschrift zeigt die Erklärung. Es ist eine Planungsschätzung, kein Startbeleg oder Maß des Temperaturfortschritts. Ausgesetzte, erreichte, nicht verfügbare und nur bei Ankunft aktive Räume liefern diesen Marker nicht. Seine Position bleibt im Abreise-/Ankunftsbalken, während die Beschriftung die tatsächliche Schätzung auch mit früherem Datum beibehält.
