<a id="planned-return"></a>
# Geplante Rückkehr
<!-- velair-docs:start -->
Übersetzungen: [Englisches Original](planned-return.md) · [Español](planned-return.es.md) · [Français](planned-return.fr.md) · [Deutsch](planned-return.de.md) · [Italiano](planned-return.it.md) · [Nederlands](planned-return.nl.md) · [Polski](planned-return.pl.md) · [Português (Brasil)](planned-return.pt-br.md) · [Português (Portugal)](planned-return.pt-pt.md) · [Русский](planned-return.ru.md) · [Übersetzungsstatus](../translation-status.md)

<details>
<summary>Status dieser Übersetzung</summary>

| Angabe | Status |
| --- | --- |
| Referenzversion | 1.9.0-beta.5 |
| Letzte Synchronisierung | 2026-10-24 |
| Sprachliche Prüfung | KI-gestützte Übersetzung |
| Vergleich mit dem Original | Mit dem englischen Original synchronisiert. |

</details>

---
<!-- velair-docs:end -->

Geplante Rückkehr bereitet das Zuhause auf eine regelmäßige oder einmalige Ankunft vor, sobald ausgewählte Anwesenheitssignale bestätigen, dass das ganze Zuhause leer ist, oder nach einem ausdrücklichen einmaligen Start ohne Anwesenheitsquellen oder mit ausgewähltem **Abwesenheitsmodus jetzt anwenden**. Konfiguriere die Funktion in Velair; eine stabile Wochenroutine benötigt weder zusätzlichen Blueprint noch tägliche Aktion. Die automatische Routine ist standardmäßig deaktiviert und läuft lokal in Home Assistant. Einmalige Rückkehrpläne benötigen gespeicherte Abwesenheits-/Rückkehrmodi und eine betriebsbereite automatische Zeitplanung. Anwesenheitsquellen sind für ausdrückliche Starts optional; die Wochenroutine benötigt mindestens eine.

Die vorherige von Rückkehr nach Hause gespeicherte Konfiguration umfasst Basis-Modus-/Profilauswahl und sämtliche Zonenausnahmen. Bestätigte Abreise wählt die Abwesenheitsbasis und löscht Ausnahmen; abgeschlossene Ankunft wählt die Zielbasis. **Abbrechen** einer bestätigten Episode stellt die vollständige frühere Auswahl einschließlich gültiger Ausnahmen wieder her. Eine externe Profil-/Modusauswahl bricht dagegen die ausstehende Rückkehr ab und wendet die angeforderte Auswahl an, ohne die vorherige Konfiguration wiederherzustellen. Siehe [Basis und Zonenausnahmen](climate-profiles.de.md#a-base-with-independent-zone-exceptions).

<a id="setup"></a>
## Einrichtung

**Abwesenheit und Rückkehr** enthält gemeinsame Einstellungen für einmalige Rückkehr und Wochenroutine. Die Abwesenheitserkennung läuft für eine gestartete einmalige Rückkehr oder bei gespeicherter aktivierter Wochenroutine. Dies ist keine separate ständig laufende Zuhause-/Abwesenheitsautomation. Die Bestätigungsdauer misst durchgehend erkannte Abwesenheit, nicht Zeit seit dem Speichern. Der Abwesenheitsmodus gilt normalerweise nach bestätigter Abreise; geeignete Räume können vor Anwendung des Zielmodus bei Ankunft vorbereitet werden.

Ohne Anwesenheitsquellen wendet der Start einer einmaligen Rückkehr den Abwesenheitsmodus sofort an, ohne Bestätigungsverzögerung. Diese Ausnahme steht neben der Verzögerung, wenn keine Quellen gewählt sind.

Zielblöcke mit **Nur Temperatur** behalten die externe HVAC-Modussteuerung bei. Geplante Rückkehr schaltet ein ausgeschaltetes Gerät für solche Blöcke nicht ein; Bereitschaft bei Ankunft ist bei ausgeschaltetem Gerät nicht versprochen. Verwende einen expliziten **Heizen**-/ **Kühlen**-Zielblock, wenn Vorbereitung das Gerät starten soll. Auch die Zielauswahl bei Ankunft respektiert die Blockrichtlinie.

1. Erstelle die gewünschten Abwesenheits- und Zuhause-Modi oder verwende Standard als Ziel. Abwesenheitsprofile können Geräte ausschalten oder Wochenzeitpläne mit geringerem Bedarf verwenden.
2. Öffne den Tab **Geplante Rückkehr** und füge Anwesenheitssignale für überwachte oder wöchentliche Abreisen hinzu. Verwende Binärsensoren, Eingabeschalter, Gruppen oder die Home-Assistant-Zuhausezone `zone.home`. Berücksichtige alle Personen, die im Zuhause bleiben können, einschließlich Gästen. Home Assistant bleibt für Personen- und Standortverfolgung zuständig; komplexe Regeln lassen sich weiterhin in einem Helfer zusammenfassen.
3. Wähle in **Abwesenheit und Rückkehr** Bestätigungsdauer, Abwesenheitsmodus und Zielmodus. Standard sind zehn Minuten; Minuten und Stunden sind möglich. Anwesenheit bei Rückkehr wird sofort berücksichtigt. Die Zielmodushilfe erklärt adaptive Vorbereitung und Verhalten ohne gültige Schätzung.
4. Trage unter **Ankunftszeiten** die übliche Zeit je Wochentag ein. Wochenankünfte gelten für den Tag, an dem das Zuhause leer wird. Tage ohne Zeit verwenden nach Bestätigung Abwesenheit und stellen bei erkannter Anwesenheit das Ziel ohne Frühvorbereitung wieder her. Der Ankunftszeitplan des Ziels bestimmt die Vorbereitung.
5. Aktiviere adaptive Vorkonditionierung für frühzeitig vorzubereitende Zonen. Bestehende Einstellungen und lokale Heiz-/Kühllerndaten werden wiederverwendet.
6. Aktiviere **Wochenroutine** in der Statusleiste und speichere. Dies aktiviert automatische Abwesenheitsbestätigung, Abwesenheitsmodus und wöchentliche **Ankunftszeiten**. Uhrzeiten allein aktivieren die Routine nicht. Einmalige Rückkehr bleibt bei ausgeschaltetem Schalter möglich. Der Schalter ändert den Entwurf; Abbrechen stellt den gespeicherten Wert wieder her. Beende konkurrierende Zuhause-/Abwesenheitsautomationen für denselben Haushalt.

Wochentage folgen der in Velair gespeicherten Einstellung **Erster Wochentag**. Trage die Ankunft direkt je Tag ein. Verlässt du das Zuhause an einem Tag ohne Uhrzeit, aktiviert Velair nach Bestätigung Abwesenheit, plant keine frühzeitige Vorbereitung und stellt bei erkannter Anwesenheit den Zielmodus wieder her. Die Home-Assistant-Zeitzone steht neben der Wochenroutine. Änderungen bleiben bis zum Speichern Entwurf. Abbrechen und Speichern befinden sich rechts in der Konfigurationsfußzeile.

Die obere Zusammenfassung gruppiert drei Routineteile in separaten umrandeten Bereichen passend zu den Einstellungen, ohne umschließende Karte oder gemeinsame Seitenlinie. Die Wochenroutine zeigt Abwesenheitsmodus, Bestätigungsverzögerung, adaptive Vorbereitung und Zielmodus als einfachen Ablauf; ihr Schalter ändert den Aktivierungsentwurf. Die Verzögerung bedeutet, wie lange das Zuhause leer bleiben muss, nicht eine geschätzte Vorbereitungszeit. Der Anwesenheitsbereich zeigt Gesamtergebnis und Quellenanzahlen; klappe ihn zur Signalprüfung auf. Unbekannte Signale verhindern die automatische Abreisebestätigung und sind von bestätigter Anwesenheit getrennt. Die schnelle Rückkehr gruppiert einmalige Abreise und Ankunftsbedienelemente der aktuellen Episode. Laufzeitaktionen verwenden die gespeicherte Konfiguration; speichere oder verwerfe ausstehende Konfigurationsänderungen vor einer neuen Abreisemeldung.

Das Formular gruppiert Anwesenheitsquellen, Bestätigungsdauer und beide Modi unter **Abwesenheit und Rückkehr**. In breiten Containern stehen Dauer und Modi in einer Zeile; auf Tablets steht die Dauer über beiden Modi, mobil stehen alle drei nacheinander. Jede Hilfe bleibt neben ihrem Bedienelement. **Ankunftszeiten** enthält nur Wochentagzeiten, Erklärung und Home-Assistant-Zeitzone. Nach Quellenauswahl verwendet es die runde grüne Hinzufügen-Aktion des Blockeditors. Deaktivierte Hinzufügen-/Entfernen-Aktionen bleiben transparent; aktive Aktionen reagieren auf Hover und Fokus. Die Quellenliste beginnt eingeklappt. Ihre Zusammenfassung zeigt Gesamtzahl und Anzahlen anwesender, abwesender und unbekannter Signale; aufgeklappt lassen sich Quellen prüfen oder entfernen. Mobil erstreckt sich die Zusammenfassung über Auswahl und Hinzufügen-Zeile. Symbole und Zahlen halten die Anzahlen zusammen und haben vollständige zugängliche Beschriftungen. Zähler sind am hinteren Rand ausgerichtet. Mobil hat die aufgeklappte Liste dieselbe Breite, Entfernen steht am Zeilenende und Namen/IDs erhalten mehr Platz. Desktoplisten entsprechen der Auswahlbreite. Aufklappen verändert keine Konfiguration. Stundenverzögerungen werden auf die nächste Minute gerundet; die entsprechende Dauer wird neben dem Bedienelement angezeigt.

Erkannte Anwesenheitszustände sind `on` und `home`, Abwesenheitszustände `off` und `not_home`. Bei der Zuhausezone bedeutet null Personen leer und eine positive Anzahl anwesend. Jedes Anwesenheitssignal macht das Zuhause belegt; nur Abwesenheit aller Signale macht es leer. Ohne Anwesenheit und mit einer unbekannten oder nicht verfügbaren Quelle ist der Gesamtzustand unbekannt: Automatische Abwesenheiten beginnen nicht. Eine ausdrückliche Anfrage **Abwesenheitsmodus jetzt anwenden** kann Abwesenheit dennoch aktivieren, aber keine Abreise bei unbekannter Belegung bestätigen. Ein angenommener Rückkehrplan bleibt bestehen. Das Panel zeigt Gesamtergebnis und jede Quelle.

Wähle Signale, die tatsächliche Anwesenheit repräsentieren: Ein ausgeschalteter Bewegungssensor bedeutet nicht unbedingt, dass niemand zuhause ist.

<a id="room-preparation"></a>
## Raumvorbereitung

Klappe **Raumvorbereitung** unter dem Routineablauf auf, um jedes verwaltete Gerät zu sehen. Die Liste beginnt eingeklappt. Ohne angenommene zukünftige Rückkehr zählen ihre Werte gespeicherte Möglichkeiten: Frühvorbereitung, nur Ankunft oder keine Vorbereitung. Bei angenommener Rückkehr zählt die gemeinsame Zusammenfassung wartende, vorbereitende, am Ziel befindliche, ausgesetzte, nicht verfügbare und nur bei Ankunft aktive Räume. Sie zeigt gespeicherte Ankunft und frühesten geeigneten geschätzten Beginn; Räume können unterschiedlich früh starten. Aufklappen verändert keine Einstellungen und sendet keine Klimabefehle. Die Übersicht gilt für wöchentliche und einmalige Rückkehr.

Jede Zeile nennt Raum, Zielzeitplanquelle und Vorbereitungsstatus. Geräte außerhalb der Zielmodusprofile verwenden weiterhin **Standard**; ausdrücklich normales Verhalten ebenfalls. Ein Profilzeitplan zeigt dessen Namen. Zielprofilpause, deaktivierte Zone und externe Ausführung werden separat genannt statt als „nur bei Ankunft“. Ohne adaptive Vorkonditionierung folgt ein aktivierter lokaler Raum bei Ankunft seinem wirksamen Zeitplan und ist nicht automatisch vom Moduswechsel ausgeschlossen.

Ohne zukünftige Rückkehr beschreibt die Liste gespeicherte Konfigurationsmöglichkeiten, keine Frühstartvorhersage. Nach Annahme einer Rückkehr ermittelt sie je Raum das Ankunftsziel und zeigt ausstehend, vorbereitend, Ziel erreicht, ausgesetzt oder nicht verfügbar mit Grund. Fehlende Temperaturen oder gültige Schätzungen verhindern Frühvorbereitung. Temporäre Anpassung, manuelle Anpassung und ausdrückliche Pausen behalten Vorrang. Ohne **Abwesenheitsmodus jetzt anwenden** kann unbestätigte Abreise nicht als vorbereitend erscheinen. **Vorbereitung** bezeichnet Velairs aktive Vorbereitungsabsicht, nicht bestätigte Befehlsannahme oder physischen Betrieb. **Sollwert erreicht** bedeutet aktuelle Temperatur innerhalb der Vorbereitungstoleranz und kann schon vor Abreise zutreffen; es beginnt keine Abwesenheit und umgeht keine Bestätigung.

**Geplanter Beginn** ist eine Schätzung, kein Beleg für Klimabefehl oder physische Bereitschaft. Ziele unterstützen Heizen, Kühlen und Bereiche. Abgeschlossene, abgebrochene oder übersprungene Rückkehr zeigt wieder Konfigurationsinformationen statt veralteter Vorbereitungszeiten. Die Diagnose verwendet bis zum erfolgreichen Speichern weiterhin gespeicherte Backend-Einstellungen, ohne zusätzliche Vorbereitungserinnerung. Diese vollständige Liste ersetzt die ältere episodenbezogene Zonenliste.

<a id="preconditioning-dependencies"></a>
### Vorkonditionierungsabhängigkeiten

Der **Vorkonditionierungs-Master** eines Raums gilt auch für Geplante Rückkehr. Seine Vorbereitung wartet, bis sowohl der eigene geschätzte Start als auch der Vorbereitungsstart des gewählten Masters sie zulassen. Beide Pläne gehören zur selben Rückkehrepisode und verwenden deren Zielkonfiguration; eine unabhängige wöchentliche Vorbereitung gibt keinen ankunftsabhängigen Raum frei. Hat der Master keine geeignete Vorbereitung, wartet das abhängige Gerät bis zu seinem normalen Ankunftssollwert. Siehe [Vorkonditionierungs-Master](adaptive-preconditioning.de.md#preconditioning-master).

<a id="one-off-return"></a>
## Einmalige Rückkehr

Wähle unter **Einmalige Rückkehr** ein zukünftiges Datum und eine Uhrzeit, dann **Rückkehr planen**. Datum und Zeit stehen zusammen. Mobil folgt die Aktion in der nächsten Zeile rechts bündig mit dem Zeitfeld; größere Layouts behalten sie neben den Feldern. Die Erklärung steht darunter. Das geht vor der Abreise oder unterwegs. Velair verwendet gespeicherte Modus- und Anwesenheitseinstellungen. Standardmäßig bleibt bei konfigurierten Quellen die Anfrage ausstehend und Abwesenheit startet erst nach durchgängiger Abwesenheitsmeldung aller Quellen über die Bestätigungsdauer. Das schützt zuhause verbleibende Personen. Ohne gespeicherte Quellen ist **Rückkehr planen** deine ausdrückliche Abreisebestätigung: Abwesenheit startet sofort ohne Verzögerung. Velair leitet dann kein leeres Zuhause ab und erkennt keine physische Rückkehr; es bereitet normal vor und aktiviert das Ziel zur gespeicherten Ankunft. Konfigurierte unbekannte/nicht verfügbare Quellen warten standardmäßig weiterhin. Eine fehlende Entität zählt nicht als leere Quellenliste.

Bei gespeicherten Anwesenheitsquellen ist **Abwesenheitsmodus jetzt anwenden** ein optionales Kontrollkästchen für jede einmalige Rückkehr. Es ist zunächst nicht ausgewählt und wird nicht als Routinenkonfiguration gespeichert. Mit Auswahl wird der konfigurierte Abwesenheitsmodus sofort angewendet, auch wenn du noch zuhause bist. Vorbereitung und zeitgesteuerter Zielwechsel werden sofort aktiv. Automatische Rückkehr durch Anwesenheit wird erst freigegeben, nachdem alle Quellen während der eingestellten Bestätigungsdauer durchgehend Abwesenheit melden. Anwesenheit oder ein unbekannter Messwert setzt diese Wartezeit zurück; nach Bestätigung aktiviert Anwesenheit das Ziel sofort.

Beispiel mit zehn Minuten Bestätigungsdauer und Rückkehr um 18:00:

| Zeit | Beobachtung | Ergebnis |
| --- | --- | --- |
| 08:00 | Rückkehr mit ausgewähltem Abwesenheitsmodus jetzt anwenden planen, noch zuhause. | Abwesenheit gilt; zeitgesteuerte Rückkehr und Vorbereitung sind aktiv. |
| 08:10 | Alle Quellen melden Abwesenheit. | Zehnminütige Bestätigung beginnt. |
| 08:15 | Anwesenheit nach kurzem Hinausgehen. | Bestätigung wird zurückgesetzt; Abwesenheit bleibt. |
| 08:30 | Alle Quellen melden erneut Abwesenheit. | Neue zehn Minuten beginnen. |
| 08:40 | Alle Quellen sind durchgehend ohne Anwesenheit geblieben. | Automatische Rückkehr durch Anwesenheit wird ohne erneutes Anwenden von Abwesenheit freigegeben. |
| 17:00 | Anwesenheit wird erkannt. | Ziel wird sofort gewählt. |

Rückkehrkarte in der Seitenleiste, Lovelace-Rückkehrkarte und Übersichtszusammenfassung behalten Abwesend oder Vorbereitung als Hauptzustand. Eine separate kompakte Zeile zeigt **Warten auf Abreisebestätigung** oder **Abreise wird bestätigt** mit Bestätigungsfrist. Anwesenheit oder unbekannte Werte während dieser Wartezeit stellen die Wartemeldung wieder her. Die tatsächliche Belegung bleibt unabhängig sichtbar, auch Anwesenheit bei aktivem Abwesenheitsmodus. Alle drei Ansichten halten diese Zeile knapp und erklären die Bestätigungsregeln in ihrer Kontexthilfe, ohne Hauptvorbereitungszustand oder Symbol zu wiederholen. Hilfe in der Übersicht öffnet keine andere Ansicht. Nach Bestätigung verschwindet die Wartezeile; die Hilfe erklärt, dass Anwesenheit jetzt die Rückkehr auslösen kann: in der Hauptphasenhilfe der Rückkehrkarte oder der Zeitleistenstarthilfe der Übersicht. Die Hilfe der Endpunkte erklärt deren Bedeutung, ohne sichtbare Zeiten zu wiederholen.

Die Zeitleiste beginnt bei Anwendung von Abwesenheit; ihre Hilfe unterscheidet diesen Zeitpunkt von der überwachten tatsächlichen Abreise. Endpunktbeschriftungen, Raumvorbereitungsmarker und gespeicherte Ankunft bleiben gleich. Wird Abwesenheit nie bestätigt, erfolgen geplante Vorbereitung und Zielwechsel um 18:00 trotzdem. **Abbrechen** bleibt vor Bestätigung verfügbar, ebenso der ausdrückliche Ankunfts-API-Befehl. Auch eine Dauer von null Minuten erfordert ein beobachtet leeres Zuhause. Ohne Quellen entfällt das Kontrollkästchen; das bisherige sofortige Startverhalten bleibt erhalten.

Einmaliges Datum und Uhrzeit ersetzen nur für diese Abwesenheit die Wochenzeit. Das funktioniert auch bei deaktivierter automatischer Routine. Du kannst die ausstehende Meldung ändern oder abbrechen; fehlt bei normaler ausstehender Abreise die Bestätigung bis zur Ankunft, läuft sie ohne Moduswechsel ab. Melden bereits alle Quellen Abwesenheit und gibt es keine aktive Episode, startet Planung sofort die Bestätigungsverzögerung, ohne neue Sensoränderung. Bei bereits aktiver Abwesenheit änderst du Ankunftsdatum/-zeit im vorhandenen Episodeneditor; das macht die Rückkehr zur einmaligen Ausnahme ohne erneutes Anwenden der Abwesenheit. Verschieben auf später beendet bisherige Vorbereitung und stellt bis zur neuen Vorbereitungszeit das aktuelle Abwesenheitsverhalten wieder her. Temporäre und manuelle Anpassungen bleiben geschützt. Das Ziel wird am gewählten lokalen Ankunftsdatum ermittelt, auch bei Vorbereitungsbeginn am Vortag. Dieselbe Zeit erneut einzureichen setzt Vorbereitung nicht zurück. Vergangene oder aktuelle Ankünfte und bei Sommerzeitwechsel nicht existierende Uhrzeiten werden abgelehnt; doppelte lokale Uhrzeiten verwenden das früheste noch zukünftige Vorkommen.

Abgeschlossene, übersprungene und abgebrochene Episoden sperren die automatische Routine bis erkannter Anwesenheit, damit ein leeres Zuhause nicht selbst eine weitere Wochenabreise startet. Du kannst nach jeder inaktiven Episode ausdrücklich **Rückkehr planen** wählen, ohne auf Heimkehr zu warten. Die neue Anfrage verwendet aktuelle Quellen und Modi. Mit Quellen wird Abwesenheit erneut für die konfigurierte Dauer bestätigt, auch wenn alle bereits weg sind, ohne sofortigen Moduswechsel. Ohne Quellen startet die ausdrückliche Registrierung sofort Abwesenheit. Seitenleiste und Dashboardkarte zeigen bei inaktiver Episode ein neues Planungsformular. Ist Planung nicht verfügbar, bleibt es mit deaktiviertem **Rückkehr planen** und Erklärung der nötigen gespeicherten Einstellungen und Zeitplanerzustände sichtbar. Eine aktive Rückkehr kann trotzdem abgebrochen werden.

Nach bestätigter Abreise beendet **Abbrechen** die Rückkehr und stellt zuvor aufgezeichneten Modus und Profile wieder her. **Ankunft ändern** aktualisiert Datum und Zeit. Während normaler Bestätigung lässt Abbrechen die Auswahl unverändert, da Abwesenheit noch nicht angewendet wurde. Bei sofortiger manueller Abwesenheit stellt Abbrechen die vorherige Auswahl auch vor bestätigter überwachter Abreise wieder her. Deaktivieren der automatischen Routine oder Ändern von Wochenzeiten beendet keine manuelle Rückkehr. Ändern ihrer Quellen oder Modi macht die vorherige Meldung ungültig. Ausdrückliche Modus-/Profilauswahl beendet ausstehende und aktive Rückkehr. Ein gestoppter Zeitplaner führt sie nicht aus.

Die erste Zeile hat links den Titel der einmaligen Rückkehr und rechts Anwesenheitsanzeigen nur auf der Karte. Die aktuelle Phase ist ein kompakter Untertitel am Titel, keine eigene Kapsel oder Zeile. Während Bestätigung liefert stattdessen die Timerüberschrift die Phase. Auf der Dashboardkarte stehen bei Quellenkonfiguration die Anzahlen oben rechts. Ohne Quellen fehlen Zähler und ungenutztes Verzögerungssymbol; die Seitenleiste zeigt **Nicht überwacht** statt unbekannter Anwesenheit. Das Bestätigungsverzögerungssymbol erscheint nur vor bestätigter Abwesenheit, nicht bei Abwesend/Vorbereitung oder aktiven Fehlern mit bestätigter Abreise. Die Seitenleiste wiederholt diese Anzeigen nicht. Hover zeigt eine kurze Phasenerklärung.

Während Bestätigung erklärt eine dezente Timerzeile, dass Velair prüft, ob das Zuhause leer bleibt. **Bis** zeigt die Backend-Bestätigungsfrist in lokaler Home-Assistant-Zeit, bei anderem Datum auch dieses. Abwesenheit startet nach Bestätigung nur bei weiter abwesenden Quellen. Das ist ein Termin, kein Live-Countdown oder bestätigte Abreise. Derselbe Ablauf erscheint bei Bestätigung der Wochenroutine vor einer Episode; fehlende Termindaten erzeugen keine erfundene Zeit.

Vor bestätigter Abreise kennzeichnen Ankunftssymbol und **Erwartete Ankunft** die gespeicherte Rückkehr mit zugänglicher Beschriftung und Tooltip. Die Zeile ist an Titel und Zustandstext ausgerichtet. Gespeichertes Datum/Zeit ist ein kompakter klickbarer Chip ohne Stift oder Unterstreichung. Der bestätigte Zeitverlauf verwendet dasselbe Symbol; gespeichertes Ankunftsdatum und -zeit bilden eine dunklere feldartige Bearbeitungsfläche mit derselben Typografie wie die Abreise. Öffne damit den eingebetteten Datums-/Zeiteditor. Seine Aktionszeile hat links blaues **Zurück** mit Pfeil und rechts grünes **Ankunft ändern**. Zurück verwirft ungespeicherte Ankunftsänderungen und schließt den Editor ohne Rückkehränderung. Im breiten Seitenleistenpanel bleibt der Editor kompakt am Ankunftsendpunkt ausgerichtet, die Änderungsaktion rechts darunter. Schmale Bildschirme und Karte behalten responsive Anordnung.

Eingaben sind bis zum Anfordern verborgen. **Zurück** stellt die neueste gespeicherte Ankunft wieder her, versteckt Felder und löscht Ankunftswarnung und Navigationsschutz. Unabhängige ungespeicherte Routinekonfiguration bleibt geschützt. Erneutes Öffnen beginnt mit der gespeicherten Ankunft. Bei bestätigter Abwesenheit ist der Ankunftsendpunkt dieselbe Bearbeitungsschaltfläche, ohne doppelte Ankunft. Abbrechen steht nur bei geschlossenem Editor links unter dem Episodeninhalt. Beim Bearbeiten ist es verborgen; Ankunft ändern steht rechts und Zurück links zum lokalen Verwerfen. Eingaben ändern den Plan erst nach erfolgreichem **Ankunft ändern**. Erfolg schließt den Editor und gibt Fokus an die gespeicherte Ankunft zurück. Fehler und Sensorupdates behalten den offenen Entwurf. Ein Hinweis kennzeichnet ungespeicherte Änderung; Navigation oder Neuladen warnt vor Verwerfen. Speichern der Routine übernimmt keine Ankunftsänderung.

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

Das verwendet gespeicherte Anwesenheit/Modi und dieselben Bestätigungs-, Vorbereitungs- und Vorrangregeln wie **Rückkehr planen**. Es funktioniert ohne Wochenroutine und aktualisiert bei aktiver Abwesenheit Datum/Zeit ohne erneuten Abwesenheitswechsel. Gespeicherte Modi und Automatik müssen betriebsbereit sein. Quellen sind optional: leere Liste aktiviert sofort Abwesenheit, konfigurierte Quellen behalten normale Bestätigung, sofern `apply_away_now: true` nicht übergeben wird. Vergangene/aktuelle Ankunft wird abgelehnt, ohne den vorherigen Plan zu ersetzen. Abgelaufene oder nicht existierende Sommerzeit-Uhrzeit wird abgelehnt; in doppelter Stunde gilt das früheste zukünftige Vorkommen.

Ausstehende oder aktive Rückkehr abbrechen:

```yaml
action: velair.cancel_planned_return
data: {}
```

Dieselbe Aktion schließt auch Hinweise inaktiver Episoden. Sie stoppt Vorbereitung und zeitgesteuerte Rückkehr und behält die automatische Abbruchsperre. Nach bestätigter Abreise stellt sie Modus und genaue Profilauswahl von vor Episodenbeginn wieder her. Bei normaler ausstehender Bestätigung bleibt die Auswahl unverändert. Bei sofortiger manueller Abwesenheit wird die gespeicherte Auswahl auch vor bestätigter überwachter Abreise wiederhergestellt. Ein neuer ausdrücklicher **Rückkehr planen** kann die inaktive Episode ersetzen. Seitenleiste und Karte verwenden dieselbe Abbruchaktion.

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

Ohne Quellen aktiviert **Rückkehr planen** sofort Abwesend. Es gibt keinen Fünf-Minuten-Bestätigungsschritt. Abbrechen stellt Komfort und die unmittelbar zuvor vermerkten Profile wieder her. Ein konfigurierter unbekannter/nicht verfügbarer Sensor zählt nicht als keine Sensoren; er blockiert weiterhin neue Abwesenheitsbestätigung.

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

Zur erwarteten Zeit wählt Velair das Ziel und folgt dem normalen Zeitplan. Frühzeitige Anwesenheit wählt das Ziel sofort, sobald die überwachte Abreise bestätigt ist. Späte Ankunft schaltet nicht zurück zu Abwesend. Pausen, temporäre und manuelle Anpassung, deaktivierte Zonen und gestoppter Zeitplaner behalten die Übermittlungsbedingungen. Vorbereitung unterstützt Heizen, Kühlen und native `heat_cool`-Bereiche. Sie soll den Raum nahe ans Ziel bringen, garantiert aber keine genaue Temperatur. Reine Bereichsentitäten in Heizen, Kühlen oder Auto werden nur bei Ankunft angewendet: Velair sendet beide Grenzen ohne frühzeitige Vorbereitung oder thermisches Lernen für dieses Ziel. Die Raumvorbereitung erklärt die Einschränkung; gespeicherte Vorbereitungseinstellungen bleiben für kompatible Ziele verfügbar.

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

Der Tab Geplante Rückkehr zeigt angenommenen Plan, Raumvorbereitung und gespeicherte Routine gemeinsam, mit eigener Einführung und Kontexthilfe. Öffne ihn mit `/velair/planned-return`; `/velair/preconditioning` öffnet den eigenen Tab Vorkonditionierung. Frühere Bereichs-URLs öffnen weiterhin ihre jeweiligen Tabs. Eine Ankunftsänderung gilt nur für diese Abwesenheit, nicht die gespeicherte Woche. **Abbrechen** entfernt Vorbereitung und automatischen Zielwechsel. Vor Bestätigung einer normalen Abwesenheit bleibt die Auswahl gleich; nach Bestätigung oder sofortiger manueller Abwesenheit werden Modus und Profile von vor Episodenbeginn wiederhergestellt.

Ausdrückliche Modus-/Profilauswahl beendet automatische Rückkehr. Spätere Anwesenheit oder Neustart darf sie nicht überschreiben. Velair merkt abgeschlossene/abgebrochene Abwesenheiten bis erneuter Anwesenheit.

Die ausdrückliche Auswahl beendet auch laufende Vorbereitung, selbst bei bereits aktivem gewähltem Modus oder Profil. Das unterscheidet sich von einem Temperaturwechsel innerhalb des Abwesenheitszeitplans, der Vorbereitung nicht beendet. Seitenleiste und Karte bieten weder Überspringen, Ich bin zuhause noch Schließen; gemeinsame Rückkehraktionen sind Abbrechen und Ankunft ändern. Das Backend behält separate Überspring- und Ankunftsoperationen für API-Clients; Verträge stehen in der [Entwickler-API](../developer/api.md). `velair.cancel_planned_return` beendet ausstehende oder bestätigte aktive Rückkehr oder schließt inaktive Hinweise. Es stoppt Vorbereitung und zeitgesteuerte Rückkehr und verhindert automatischen Neustart dieser Abwesenheit. Bei bestätigter Abreise stellt es vorige Auswahl wieder her; bei normaler ausstehender Bestätigung oder abschließendem Hinweis ändert es sie nicht. Bei sofortiger manueller Abwesenheit wird die vorherige Auswahl auch vor bestätigter Abreise wiederhergestellt. Ein neuer ausdrücklicher **Rückkehr planen** bleibt möglich.

<a id="restoration-limits"></a>
### Wiederherstellungsgrenzen

Für einmalige Rückkehr vermerkt Velair die Auswahl beim Wählen von **Rückkehr planen**, für Wochenroutine bei bestätigter Abwesenheit unmittelbar vor Anwendung des Abwesenheitsmodus.

Die vorherige Auswahl übersteht Ankunftsänderungen und Neustarts. Wiederhergestellt wird Profilauswahl, nicht frühere Temperatur oder Gerätezustand; Profile verwenden aktuelle Zeitpläne und bestehende Vorrangregeln. Wurde der vorherige Modus gelöscht/geändert, können ursprüngliche Profile manuell wiederhergestellt werden. Fehlt ein gespeichertes Profil, ist es ungültig oder kollidiert es mit einem anderen, gelingt Abbrechen trotzdem, behält aber die aktuelle Auswahl und meldet fehlende Wiederherstellung. Episoden vor Einführung dieser Metadaten behalten aktuelle Auswahl, da Velair die frühere nicht ableiten kann.

Nach Neustart werden ausstehende einmalige Meldungen und bestätigte Abwesenheiten wiederhergestellt statt neu gestartet. Unbestätigte Abwesenheit startet Bestätigungsdauer neu. Meldet ein Sensor Anwesenheit, wird die vorherige Abwesenheit abgeglichen, auch wenn die Ankunft während des Home-Assistant-Ausfalls lag. Sofortige manuelle Abwesenheit behält die Freigabesperre für Rückkehr durch Anwesenheit nach Neustart: Eine unvollständige Bestätigung beginnt erneut mit der gesamten Dauer, anfängliche Anwesenheit kann nicht als Rückkehr gelten. Eine abgeschlossene Bestätigung bleibt abgeschlossen. Die geplante Ankunft bleibt in beiden Fällen maßgeblich.

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

Die Übersicht zeigt bei wöchentlicher/einmaliger Episode oder Problemen eine kompakte Haushaltszusammenfassung mit Ursprung, Zustand und gegebenenfalls Bestätigungsfrist oder erwarteter Ankunft. Bei angenommener Rückkehr zeigen kompakte Symbolzähler Vorbereitungsanzahlen mit Hilfe bei Hover, Tastaturfokus oder Tippen. Eine bestätigte Abreise ergänzt eine schreibgeschützte Zeitleiste mit Abreise-/Ankunftszeiten, den jeweiligen Modi und geschätzten Vorbereitungspunkten aller geeigneten Klimageräte. Farben entsprechen Namen in der Legende darunter. Neben jedem Namen steht in derselben Zeile der geschätzte Vorbereitungsbeginn in Home-Assistant-Zeitzone und -Zeitformat; spätere Tage enthalten das Datum. Punkte entsprechen den 8-Pixel-Legendenkreisen; ein neutraler senkrechter Strich markiert Jetzt.

Die Legende beginnt einzeilig. Lange Namen werden optisch gekürzt; **+N Klimageräte** erweitert weitere Räume innerhalb der Zusammenfassung, **Weniger anzeigen** stellt eine Zeile wieder her. Jeder Raum behält Farbe und vollständige Namens-/Startzeithilfe bei Hover, Fokus oder Tippen. Auf- und Zuklappen navigiert nicht und ändert die Rückkehr nicht. Nur adaptive Vorbereitung mit gültigem Beginn wird eingezeichnet; nur bei Ankunft aktive, ausgesetzte, bereits am Ziel befindliche und nicht verfügbare Räume fehlen. Überlappende Punkte teilen einen Kreis in gleich große Farbsektoren, einen pro Gerät. Punkte und Legendeneinträge zeigen geschätzte Startzeiten bei Hover, Fokus oder Tippen. Es sind aktuelle Schätzungen, kein Verlauf tatsächlicher Geräteaktivität. Bei Platz steht die Zeitleiste neben der Zusammenfassung, sonst darunter. Sie misst verstrichene Abwesenheitszeit, keinen thermischen Fortschritt. Klicke außerhalb der Hilfen auf die Zusammenfassung, um Details im Tab Geplante Rückkehr zu öffnen; Hilfen navigieren nicht und ändern keine Rückkehr.

**Nächste Ereignisse bei aktiver Rückkehr**

Übersicht und Dashboard-Ereigniskarten zeigen die nächste prognostizierte Steuerungsänderung je Gerät samt Quelle Wochenzeitplan oder Geplante Rückkehr. Ein Wochenereignis vor Vorbereitungsbeginn bleibt möglich. Sobald Rückkehrvorbereitung ein Gerät steuert, ist sein nächster Übergang die Ankunft statt eines unzusammenhängenden Abwesenheitsblocks, auch wenn das Ziel erreicht ist. Geräte ohne Rückkehreingriff behalten Wochenereignisse.

Startschätzungen beruhen auf aktuellen Messungen. Ankunft kann Temperatur oder HVAC-Optionen ändern, ausschalten oder ein pausiertes Profil aktivieren; sie ist nicht zwingend ein Temperaturbefehl. Temporäre/manuelle Anpassungen und Pausen behalten Vorrang. Ausgesetzte Zeilen erklären den Blocker und nennen eine bekannte Ablaufzeit nur, wenn alle aktiven Blocker eine haben. Diese verspricht keinen Vorbereitungsstart. Wochen-/Rückkehrzeilen teilen das kompakte Layout: Name, kurze Quelle, Zeiten, Aktion und HVAC-Modus. Die Hilfe am Ende erklärt vollständige Phase, Ankunftsmodus, Aussetzungsgrund/bekannten Ablauf und aktuellen Wochenereignisbezug bei Rückkehrvorrang, per Hover, Tastaturfokus oder Tippen. Es gibt keinen Zustandsuntertitel unter dem Namen. Spaltenbreiten folgen dem breitesten angezeigten Wert aller Zeilen, ohne festen Leerraum in Zeit-, Aktions- und HVAC-Spalten. Schmale Listen behalten einzeilige Ereignisse mit horizontalem Scrollen und fester Namensspalte; Daten wechseln nicht in eine Zusatzzeile.

Diese Prognosen bestätigen keine Geräteübertragung und verändern keine Ausführung. Vorhandene Nächste-Ereignis-Sensoren und spezielle Wochenvorbereitungsansichten behalten ihre Wochenbedeutung. Installiere passende Integration und Frontend für wirksame Prognosen; ein älteres Backend liefert weiterhin Wochenereignisse.

Ein violettes Signal kennzeichnet aktuelle Rückkehrzuständigkeit. Der Betriebszustand bleibt sichtbar; es ersetzt Heizen, Kühlen, Pause, Planung oder Vorkonditionierung nicht. Zukünftige Startschätzungen sind separat beschriftet. Manuelle Steuerung, temporäre Anpassung und unabhängige Pausen behalten Vorrang. Abwesenheitszuordnung umfasst wirksame Abwesenheitsprofile oder ausdrücklich als Abwesenheitsmodus gewähltes Standard, nicht unzugeordnete Geräte, die ihren Standardzeitplan weiterführen. Vorbereitung darf den Standard-Ersatz des Ziels verwenden, wenn das Backend dieses Ankunftsziel auswählt.

Übersichtszonen zeigen einen kompakten Rückkehrindikator neben Profil- und Komfortindikatoren: Raumvorbereitungsstatus und gegebenenfalls Ankunftstemperatur/-bereich. Die Hilfe umfasst den ganzen Indikator und öffnet bei Hover, Tastaturfokus oder Tippen. Sie erklärt Status, geschätzten Beginn, Ankunft, Aussetzungs-/Verfügbarkeitsgrund und aktuelle Steuerungszuordnung ohne mehrzeiliges Vorbereitungspanel. Ein Raum kann noch Abwesenheit folgen und künftige Vorbereitung zeigen, ohne bereits Rückkehrsteuerung zu behaupten. Fehlende Schätzungen werden nicht erfunden; abgeschlossene, abgebrochene und übersprungene Rückkehr behält keine aktive Vorbereitungsvorschau. Klimakarten behalten ihre vorhandene Detaildarstellung.

Diagnose zeigt Haushaltszustand, Steuerungsherkunft und Vorbereitung je Gerät einschließlich Aussetzungs-/Nichtverfügbarkeitsgrund. Die Verlaufskategorie Geplante Rückkehr vermerkt bedeutsame angenommene Übergänge ohne Neulade-Duplikate. Sie teilen die 100-Ereignis-Laufzeitgrenze und verschwinden beim Neustart. Kategoriepräferenzen bleiben gespeichert. Berichte enthalten diese Informationen und entfernen betriebliche Modus-/Profilkennungen. Steuerungsabsicht und Übertragungserfolg bleiben getrennt.

<a id="dashboard-card"></a>
## Dashboardkarte

Die optionale Lovelace-Karte zeigt kompakte Einmalige-Rückkehr-Aktionen. Ihre Überschrift enthält Anzahlen anwesender, abwesender und unbekannter Quellen sowie die gespeicherte Bestätigungsdauer. Angenommene Rückkehr zeigt kompakte Vorbereitungsstatuskennzeichnungen mit Hilfen für Hover, Tastatur und Touch zu Raumzahlen, Ankunft und frühestem geeigneten geschätzten Beginn. Die Haushaltszeitleiste verwendet die Panelgrafik: gleiche Datumstypografie, dunkles bearbeitbares Ankunftsfeld, neutraler Jetzt-Strich und individuelle Vorbereitungspunkte geeigneter Geräte. Die Legende beginnt einzeilig, erweitert sich innerhalb der Karte mit +N und schließt mit Weniger anzeigen. Modusnamen stehen unter dem Balken. Gerätename und geschätzter Beginn bleiben über Punkt- und Legendenhilfen zugänglich. Kontexthilfen erklären Abreisezeit, Ankunftssymbol, Phase, Anwesenheitszähler und Bestätigungsdauer per Hover, Tastaturfokus oder Tippen; Anwesenheitshilfe nennt passende konfigurierte Quellen. Das Ankunftsfeld bleibt eine Bearbeitungsschaltfläche; seine Erklärung liegt am benachbarten Ankunftssymbol. Wochenkonfiguration, Quellenliste und volle Raumvorbereitung bleiben in der Seitenleiste. Konfiguriere den Haushalt zuerst dort.

```yaml
type: custom:velair-card
view: planned-return
```

Wähle im visuellen Editor **Geplante Rückkehr**. Die Karte nutzt dieselbe gespeicherte Episode wie Seitenleiste und andere Karten und unterstützt zukünftige Daten/Zeiten. Aktive Episoden bieten **Abbrechen** und **Ankunft ändern**. Abbrechen beendet die angenommene Rückkehr und stellt nach Anwendung von Abwesenheit einschließlich sofortiger manueller Anwendung die vorherige Modus-/Profilauswahl wieder her; bei normaler ausstehender Bestätigung bleibt sie unverändert. Nach Abschluss, Abbruch oder anderer Inaktivität zeigt die Karte sofort ein neues Formular ohne Warten auf Anwesenheitsänderung. Ungültige Konfiguration oder gestoppter Zeitplaner deaktiviert Planung/Änderung, aktive Rückkehr bleibt abbrechbar. Seitenleiste verwendet dieselben Aktionen und Lebenszyklen; Wochenkonfiguration und Aktivierung bleiben dort. Nur hintere Anwesenheits-/Verzögerungsanzeigen sind kartenspezifisch. Phase, Ankunftseditor und Zeitleiste werden gemeinsam verwendet. Während Bestätigung ersetzt die Timerprozessüberschrift den Untertitel. Diese Haushaltskarte hat keinen Thermostatfilter.

**Klimagerät: Status und Steuerung** bietet **Einmalige Rückkehr** neben temporärer Anpassung und Pause. Aktiviere sie im Aktionseditor, wähle Namensanzeige oder platziere sie unter Mehr. Der Editor gruppiert diese drei zuerst, auch wenn deaktiviert. Sie öffnet dieselben kompakten Steuerelemente im unteren Panel mit schlichter passender Überschrift und 38-Pixel-Feldern. Bestätigte Abreise verwendet die verfeinerte Zeitleiste aus Geplante Rückkehr mit passender Abreise-/Ankunftstypografie, dunkler Ankunftsfläche, neutralem Jetzt-Strich und nur dem Vorbereitungspunkt des ausgewählten Geräts. Dieses Panel lässt Vorbereitungsstatuskennzeichnungen weg und zeigt Gerätename und geschätzten Beginn in der Legende. Fehlt eine gültige aktuelle Frühvorbereitungsschätzung, ersetzt eine kurze Erklärung die Zeitleiste: nur Ankunft, Sollwert erreicht, Aussetzung samt Grund, nicht verfügbare Vorbereitung oder fehlende Schätzung. Schätzungen anderer Geräte werden nicht ersatzweise verwendet. Gespeicherte Ankunft bleibt bearbeitbar und Abbrechen verfügbar, auch ohne Zeitleiste. Anwesenheitsanzeigen bleiben in der Überschrift. Die Aktion steuert die Haushaltsrückkehr einschließlich anderer Geräte und ist nicht auf das angezeigte beschränkt. Wiederholte Countdownabsätze und erste-Start-Details entfallen. Die Haushalts-Rückkehrkarte zeigt die Grafik für alle geeigneten Geräte mit Haushaltsstatuskennzeichnungen und Legende.

X schließt das Panel ohne Abbruch der Episode. Ungespeicherte Ankunftsänderungen erfordern Verwerfsbestätigung; während laufender Aktion ist Schließen blockiert. Bestehende Karten behalten diese Aktion ausgeblendet; neue Karten aus der Home-Assistant-Auswahl aktivieren sie. YAML aktiviert sie ausdrücklich mit <code>type: planned-return</code> in <code>climate_actions</code>.

Während **Abwesend** und **Ankunft wird vorbereitet** zeigt die Karte den Anwendungszeitpunkt von Abwesenheit und die gespeicherte Ankunft samt Abwesenheits-/Rückkehrmodi. Bei sofortiger manueller Abwesenheit kann diese Anwendung vor der bestätigten tatsächlichen Abreise liegen. Der mit **Jetzt**-Hilfe bezeichnete Marker folgt verstrichener UTC-Zeit einschließlich Zeitumstellungen und bleibt im Balken. Endpunkte enthalten Daten bei verschiedenen Home-Assistant-Kalendertagen. Ungespeicherte Änderungen bewegen den Balken nicht. Normale ausstehende Abreisen, abschließende Zustände oder Episoden ohne Zeitstempel der Abwesenheitsanwendung bleiben statisch ohne Zeitleiste; eine aktive Fehlerepisode mit gültigem Anwendungszeitpunkt behält Zeitleiste und Abbruch. Lokale Uhren aktualisieren nur sichtbar und aktiv einmal pro Minute sowie sofort beim Sichtbarwerden, ohne Backend-Anfrage.

Im Tab Geplante Rückkehr entfallen Vorbereitungszähler und mehrzeilige Countdownzusammenfassung, da Raumzustände bereits darüber erklärt sind. Gespeicherte Abreise und bearbeitbare Ankunft stehen mit gleicher Typografie über dem Balken. Die Ankunft ist eine dunklere feldartige Bearbeitungsfläche ohne Stift oder Unterstreichung. Abwesenheits-/Zielmodus stehen darunter. Ein neutraler senkrechter Strich markiert Jetzt am Ende des verstrichenen Segments. Geeignete Geräte erhalten kleine farbige Punkte und eine Legende mit Namen, geschätztem Vorbereitungsbeginn und eigener Starthilfe. Überlappende Punkte bilden einen segmentierten Kreis. Die Legende lässt sich innerhalb des Panels erweitern und wieder schließen. Ausgesetzte, bereits am Ziel befindliche, nur bei Ankunft aktive und nicht verfügbare Geräte bleiben in den Raumdetails darüber statt erfundene Punkte zu erhalten. Die Haushaltskarte behält Statuskennzeichnungen. Die Raumvorbereitung bleibt darüber verfügbar; die Zeitleiste wiederholt den frühesten Beginn nicht in einem Zusatzpanel.

Geänderte gespeicherte Ankunft oder Ziel setzt die Legende zurück und verwirft veraltete Schätzungen. Ein Ankunftsentwurf verändert die gespeicherte Projektion nicht. Abbruch und Ankunftsbearbeitung bleiben vorhanden. Dashboard-Steuerungen verwenden dieselbe Grafik: die Haushaltskarte alle geeigneten Punkte und Kennzeichnungen, die eingebettete Klimakartenaktion nur ihren Raum mit Namen und Startzeit in der Legende. Felder bleiben kompakt mit Zurück-/Ändern-Aktionen. Öffnen des Editors lässt die angenommene Zeitleiste unverändert; Zurück stellt die gespeicherte Ankunft wieder her. Ein Punkt außerhalb der Abreisegrenze liegt am Rand; seine Hilfe behält die tatsächliche Schätzung. Verstrichener Fortschritt misst Zeit bis Ankunft, keine thermische Entwicklung. Ohne Haushaltsschätzung erklären Vorbereitungshilfen den bekannten Zustand, ohne deaktivierte Vorbereitung zu unterstellen.
