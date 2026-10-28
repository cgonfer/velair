<a id="shared-climate-supply"></a>
# Gemeinsame Klimaversorgung
<!-- velair-docs:start -->
Übersetzungen: [Englisches Original](shared-climate-supply.md) · [Español](shared-climate-supply.es.md) · [Français](shared-climate-supply.fr.md) · [Deutsch](shared-climate-supply.de.md) · [Italiano](shared-climate-supply.it.md) · [Nederlands](shared-climate-supply.nl.md) · [Polski](shared-climate-supply.pl.md) · [Português (Brasil)](shared-climate-supply.pt-br.md) · [Português (Portugal)](shared-climate-supply.pt-pt.md) · [Русский](shared-climate-supply.ru.md) · [Übersetzungsstatus](../translation-status.md)

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

Die gemeinsame Klimaversorgung schätzt den Heiz- oder Kühlbedarf zugeordneter Thermostate und steuert einen gemeinsamen `switch`, etwa ein Kesselanforderungsrelais. Sie ist optional und bleibt deaktiviert, bis du eine Versorgung ausdrücklich in **Versorgungssteuerung** aktivierst. Die Schätzung bestätigt weder Ventilöffnung noch Wasserfluss oder tatsächlichen Heizbetrieb.

<a id="configure-a-supply"></a>
## Eine Versorgung einrichten

Öffne **Versorgungssteuerung** im Velair-Panel und wähle **Versorgung hinzufügen**. Wähle eine Versorgung aus der Liste, um ihre Details daneben zu bearbeiten; auf schmalen Bildschirmen stehen sie darunter. Ohne vorhandene Versorgungen bietet der leere Bereich dieselbe Aktion an. **Gemeinsame Versorgungen** enthält gesteuerte Heiz- oder Kühlkreise und ist von einer allgemeinen Thermostatgruppierung getrennt.

Gib den **Versorgungsnamen** ein, wähle einen vorhandenen **Versorgungsschalter**, den **Versorgungszweck** (Heizen oder Kühlen) und die verwalteten Thermostate dieses Kreises. Jeder Schalter darf nur einer Versorgung gehören. Velairs eigene Steuerschalter sind keine zulässigen Versorgungsausgänge.

Der Versorgungszweck beschreibt die gemeinsame Anlage und ändert keine HVAC-Modi der Thermostate. Eine Wärmeversorgung reagiert ausschließlich auf Heizbedarf, eine Kälteversorgung ausschließlich auf Kühlbedarf.

Jeder Listeneintrag zeigt Zweck, Thermostatanzahl, Schalter und gespeicherten Automatikstatus. Name, Schalter und Zweck bearbeitest du direkt in der oberen Zusammenfassung neben Aktivierung und Speichersymbol. Jede Einstellung erscheint einmal; ein separater Abschnitt Versorgungseinstellungen entfällt. **Schaltzustand** ist der beobachtete Entitätszustand, die Steuerungsübersicht in der Liste beschreibt die gespeicherte Einrichtung. Der Aktivierungsschalter ändert zunächst den Entwurf: Ein noch nicht gespeichertes Einschalten kann deshalb neben einem gespeicherten deaktivierten Status stehen. Bei deaktivierter oder ausgesetzter Steuerung wird kein Bedarf ausgewertet. Infotasten erklären diese Unterschiede, die Schalterzuständigkeit, den Zweck und die Zeitoptionen, ohne das Formular zu verlängern.

**Versorgung entfernen** ist die Papierkorbtaste im Listeneintrag. Auch das Entfernen bleibt bis zum Speichern ein Entwurf. Öffne **Zeitoptionen**, **Bedarf und Hysterese** oder **Zugeordnete Thermostate** für die jeweiligen Einstellungen. Das Hilfesymbol neben dem Funktionstitel öffnet eine Zusammenfassung und diesen Leitfaden. Beim Wechsel zwischen Versorgungen bleiben Entwürfe erhalten. **Versorgungen speichern**, das Speichersymbol im Detailkopf, übernimmt die gesamte bearbeitete Liste einschließlich Entfernungen und bleibt auch nach dem Entfernen der letzten Versorgung verfügbar. Wie bei Vorlagen und Presets gibt es keine eigene Verwerfen-Taste. Beim Verlassen mit ungespeicherten Änderungen wirst du nach dem Verwerfen gefragt; beim Zurückkehren wird dann die gespeicherte Liste geladen. Während Speichern oder Fortsetzen läuft, wartet die Navigation.

Setzt du alle bearbeiteten Werte auf ihre gespeicherten Werte zurück, wird der Entwurf aufgehoben. Live-Konfigurationsaktualisierungen und **Automatische Steuerung fortsetzen** sind wieder verfügbar. Gespeicherte Änderungen erreichen andere verbundene Panels auch ohne Änderung des geschätzten Bedarfs.

Wähle Hystereseverhalten und Werte der Versorgung. Jeder zugeordnete Thermostat übernimmt das Verhalten; nur seine Zahlenwerte können abweichen. **Thermostathysterese** bietet in jeder ausgewählten Zeile **Versorgungshysterese verwenden** oder **Eigene Hysteresewerte**. Die Auswahl ist an Kontrollkästchen und Namen ausgerichtet, Ausnahmen und wirksame Grenzen stehen darunter. Bei eigenen Werten können beide Abstände unabhängig geerbt werden. Sie sind Temperaturdifferenzen in der aktuellen Paneleinheit und werden beim Einheitenwechsel als Differenzen, nicht als absolute Temperaturen umgerechnet.

Zahlenfelder melden ungültige Eingaben während der Bearbeitung. Hysteresewerte müssen endlich und nichtnegativ sein; leere Thermostatausnahmen übernehmen den Versorgungswert. Solange eine Versorgung ungültige Zahlen enthält, ist Speichern nicht verfügbar und die Liste markiert den zu prüfenden Eintrag.

Speichere ausdrücklich, um die Konfiguration anzuwenden. Eine aktivierte Versorgung überlässt Velair die alleinige automatische Steuerung ihres Schalters. Vermeide eine weitere Automation, die denselben Ausgang fortlaufend steuert.

Speicherfehler erscheinen im Detailkopf neben der Speicheraktion. Konfigurationsfehler nennen Versorgung, Feld und Korrektur. Velair wählt die Versorgung, öffnet den passenden Abschnitt, markiert das Feld und setzt den Fokus darauf. Home-Assistant- oder Verbindungsfehler behalten ihre ursprüngliche Erklärung und werden keinem fremden Feld zugeordnet. Entwürfe bleiben für Korrektur und Wiederholung erhalten, auch nach Entfernen der letzten Versorgung.

<a id="live-status"></a>
## Live-Status

Wähle **Live-Status** im Detailkopf einer gespeicherten Versorgung, um den schreibgeschützten Monitor zu öffnen. Er nutzt die gespeicherte Konfiguration auch bei ungespeichertem Entwurf. Neue Versorgungen müssen zunächst gespeichert werden.

Die Zusammenfassung zeigt den von Home Assistant gemeldeten Schaltzustand, die Zahl anfordernder Thermostate und den Automatikstatus einschließlich Mindest-Aus- und Ausschaltwartezeiten. Anforderung und eingeschalteter Schalter bestätigen weder physisches Heizen/Kühlen noch Ventilöffnung oder Durchfluss.

Bei ausgewertetem Bedarf und verfügbaren Messwerten zeigt jede Temperaturzeile aktuellen Wert, wirksamen Sollwert und Start-/Stoppgrenzen. Ein schraffiertes Band in derselben Themenfarbe wie Room Assist markiert den Bereich zwischen den Grenzen unabhängig vom Bedarf. Bei Bedarf zeigt ein dünner Pfeil auf der Temperaturlinie vom aktuellen Wert zur Stoppgrenze: orange für Heizen, blau für Kühlen. Er zeigt die angeforderte Temperaturrichtung, keinen tatsächlichen Wärmefluss oder bestätigten Betrieb. Ohne Bedarf verschwindet er, die aktuelle Markierung wird neutral und das statische Band bleibt. Temperatur steigt beim Heizen und Kühlen nach rechts. Werte und Grenzbeschriftungen bleiben auch mobil ohne Darüberfahren sichtbar. Aktuell- und Sollwerte sind über ihren echten Positionen zentriert; nahe Beschriftungen stehen in getrennten Zeilen. Jede Start-/Stoppmarkierung gruppiert Grenztemperatur und vorzeichenbehafteten Sollwertabstand ohne zusätzliche Grenzwerttabelle.

Beschriftungen betonen die nächste relevante Grenze. Bei Bedarf bezeichnet **Stoppt bei** die Stoppgrenze. Bevor der Messwert die Startschwelle passiert, heißt sie **Untere Grenze** beim Heizen oder **Obere Grenze** beim Kühlen. Nach Überschreiten in das gehaltene Band bezeichnet **Startet erneut bei** die nächste Zyklusgrenze. Ohne Bedarf wird **Startet bei** hervorgehoben; die andere Grenze bleibt neutral. Zusammenfallende Grenzen teilen eine Markierung. Unbekannter Bedarf bleibt neutral ohne angenommene Anforderung.

Wenn Room Assist den Bedarf bestimmt, kennzeichnet der Monitor diese Quelle und nutzt ihren Raumsensor und verbindlichen Regelgrenzen statt eines korrigierten Thermostatsollwerts als Raumziel. **Warum wird meine Versorgungshysterese nicht verwendet?** öffnet eine Erklärung zu Vorrang und inaktiven Versorgungseinstellungen. Die Hilfe bleibt bis zur Auswahl geschlossen und behält ihren Öffnungszustand bei Aktualisierungen. Normale Start-/Stopphinweise werden unter der Grafik nicht wiederholt; fehlende oder nicht ausgewertete Daten werden weiterhin erklärt. Beispiel: 17 °C Komfortziel und Room-Assist-Grenzen 16/18 °C bedeuten Startabstand 1 °C unter und Stoppabstand 1 °C über Sollwert, auch bei ungenutztem Versorgungsstartabstand 0.2 °C. Native Bereiche können eine einzige Schaltgrenze verwenden: zusammenfallende Markierungen bedeuten nicht Abstand null zum Komfortziel. Fehlende Werte oder nicht ausgewerteter Bedarf werden ausdrücklich benannt, statt alte Anforderungen als live zu zeigen. Ausgeschaltete Thermostate und deaktivierte/ausgesetzte Versorgungen zeigen verfügbare aktuelle Werte ohne nicht ausgewertete Sollwerte oder Regelgrenzen.

Der Monitor erhält bei geöffnetem Fenster Aktualisierungen und beendet das Abonnement beim Schließen. Er zeigt die neuesten Home-Assistant-Meldungen, erhöht keine Meldefrequenz, simuliert keine Temperaturen und speichert keinen Verlauf.

<a id="how-estimated-demand-works"></a>
## So funktioniert der geschätzte Bedarf

Neue Versorgungen verwenden **Am Sollwert stoppen** mit **Einschalthysterese** von **0,3 °C** oder **0,54 °F** und **Ausschalthysterese** null. Diese Temperaturdifferenzen sind gleichwertig. Thermostatausnahmen übernehmen die Versorgungswerte, sofern du keine eigenen wählst. Die folgenden Beispiele nutzen zur Verdeutlichung andere Werte.

Bei gewöhnlichen Thermostaten legt die Hysterese eine Start- und eine Stoppgrenze fest. Dazwischen bleibt der bisherige Bedarf bestehen. Alle Vergleiche schließen die Grenze ein. Beispiele mit einem Sollwert von 22 °C:

Hysteresewerte sind Temperaturdifferenzen zum Sollwert. Die Einschalthysterese bestimmt den Beginn der Anforderung. Die Ausschalthysterese legt fest, wie weit der Sollwert in Heiz- oder Kühlrichtung überschritten wird, bevor die Anforderung endet. Am Sollwert stoppen verwendet eine Ausschalthysterese von null. Symmetrisch verwendet auf beiden Seiten denselben Wert; Benutzerdefinierte Hysterese lässt beide Werte getrennt einstellen.

| Verhalten | Werte | Heizen: start / stop | Kühlen: start / stop |
| --- | --- | --- | --- |
| Am Sollwert stoppen (Standard) | Einschalthysterese 0.5 °C | ≤21.5 / ≥22 °C | ≥22.5 / ≤22 °C |
| Symmetrisch | Symmetrische Hysterese 0.5 °C je Seite | ≤21.5 / ≥22.5 °C | ≥22.5 / ≤21.5 °C |
| Benutzerdefinierte Hysterese | Einschalthysterese 0.5 °C; Ausschalthysterese 0.2 °C | ≤21.5 / ≥22.2 °C | ≥22.5 / ≤21.8 °C |

Das Diagramm in **Bedarf und Hysterese** folgt Änderungen von Zweck, Verhalten und Abständen. Es verwendet einen beschrifteten Beispielsollwert statt eines aktuellen Thermostatwerts. Temperaturen stehen an Start- und Stoppmarkierungen; Klammern verbinden jeden Hystereseabstand mit dem Sollwert. Die beschriftete Raumtemperaturachse steigt nach rechts. Der Hinweis darunter erklärt: Zwischen Start und Stopp läuft nur eine bestehende Anforderung weiter. Beim Heizen liegt die Anforderung auf der kälteren, beim Kühlen auf der wärmeren Seite. Das Diagramm erklärt die Schätzung und simuliert weder Gerätebetrieb noch Verzögerungen. Sein Beispielsollwert beträgt 22 °C oder 72 °F. Bei leeren, unvollständigen oder ungültigen Zahlen erhält ein graues Diagramm ohne Temperaturangaben die Vorschauhöhe, bis die Eingabe wieder gültig ist.

**Einschalthysterese** ist die Temperaturdifferenz zum Sollwert vor einer Heiz- oder Kühlanforderung. **Ausschalthysterese** ist die Differenz jenseits des Sollwerts bis zum Anforderungsende. **Symmetrische Hysterese** gilt auf jeder Seite, nicht als Gesamtbandbreite. **Benutzerdefinierte Hysterese** setzt beide getrennt. Beide dürfen null sein; bei zweimal null gibt es genau am Sollwert keinen Bedarf. Nach Neustart, Sollwert- oder Hystereseänderung wird innerhalb des Bands kein neuer Bedarf angenommen. Moduswechsel erhalten eigene Stoppwerte, die bei Rückkehr zu **Benutzerdefinierte Hysterese** wieder gelten.

**Am Sollwert stoppen** ist der empfohlene Einstieg für gewöhnliche Thermostate. Symmetrische und eigene Abstände sind erweiterte Optionen: Ein Thermostat kann sein Ventil schließen oder den Kompressor stoppen, bevor der Raum die Stoppgrenze jenseits des Sollwerts erreicht. Die gemeinsame Versorgung könnte dann weiter angefordert bleiben. Diese Einstellungen schätzen Bedarf; sie ändern keine geräteeigenen Schaltgrenzen und erzwingen keinen Wärmefluss.

Halte die Grenzen getrennter Wärme- und Kälteversorgungen auseinander, wenn sie denselben Bereichsthermostat verwenden. Große Stoppabstände können Heizbedarf erhalten, während Kühlen beginnt, oder umgekehrt. Versorgungen werten unabhängig aus und verriegeln gegensätzliche Ausgänge nicht. Verwende bei Bedarf geeignete Anlagenverriegelungen.

Mindestens ein zugeordneter Thermostat mit gültigem Bedarf fordert die Versorgung an. Ein ausgeschalteter Thermostat oder eine inkompatible HVAC-Richtung fordert nichts an. Fehlende oder nicht verfügbare Temperaturdaten ergeben unbekannten Bedarf und bewahren keine alte Anforderung unbegrenzt. Andere gültige Räume können weiter Bedarf melden. Ohne gültig anfordernden Raum wird nach der konfigurierten Verzögerung ausgeschaltet.

Aktuelle Thermostatsollwerte gelten einschließlich manueller Änderungen und Ziele von adaptiver Vorkonditionierung oder geplanter Rückkehr. Ein pausierter Zeitplan deaktiviert die Versorgungsautomatik nicht. Gültige Bereiche verwenden standardmäßig die untere Grenze zum Heizen und die obere zum Kühlen. Bei festem Heizen oder Kühlen mit **Referenzsollwert** unter **Einstellungen → Klimageräte und Gruppen** nutzt die Versorgung dieselbe Grenze und die feste Modusrichtung. Ein mehrdeutiges Ziel kann keinen Bedarf anfordern.

<a id="room-assist"></a>
## Room Assist

Ein blaues Informationsfeld am Anfang von **Bedarf und Hysterese**, vor der Verhaltensauswahl, erläutert den Vorrang von Room Assist und wann die Versorgungshysterese gilt.

Wenn Room Assist das aktive Raumziel steuert, folgt die gemeinsame Versorgung seiner bestätigten Steuerungsabsicht. Bei festem Heizen fordert die Phase `towards_upper` Wärme an, bei festem Kühlen fordert `towards_lower` Kälte an. Seine bestehenden Schaltgrenzen bleiben maßgeblich; Versorgungshysterese und Thermostatausnahme werden nicht erneut angewendet. Native Bereichssteuerung folgt ihrer bestätigten Richtung. Ungültige oder noch ausstehende unterstützte Ziele bleiben unbekannt, bis eine gültige Steuerungsabsicht bestätigt wurde.

Der korrigierte Thermostatsollwert wird nicht mit einem externen Raumsensor verglichen. Room Assist kann eine Anforderung beenden, obwohl der Thermostat weiterhin denselben korrigierten Sollwert meldet.

<a id="timing-and-manual-control"></a>
## Zeitverhalten und manuelle Steuerung

**Einschaltverzögerung** verlangt vor dem Start durchgehenden geschätzten Bedarf. Entfällt er oder wird unbekannt, beginnt die Bestätigung neu. Sie gehört der Versorgung: Wechselt der anfordernde Raum bei anhaltendem Bedarf, beginnt sie nicht neu. **Mindestausschaltzeit** schützt nach dem Ausschalten. Bei Bedarf gilt die längere Zeit: **verbleibende Mindestausschaltzeit** oder **vollständige Einschaltverzögerung**. Sie werden nicht addiert.

Beispiel mit 60 Sekunden Mindestausschaltzeit und 20 Sekunden Einschaltverzögerung:

- Nach einem Tag Aus ist der Schutz abgelaufen: 20 Sekunden ab Bedarfsbeginn warten.
- Bei Bedarf direkt nach dem Ausschalten 60 Sekunden warten, die längere konfigurierte Zeit.
- Bei Bedarf 50 Sekunden nach dem Ausschalten bleiben 10 Sekunden Schutz. Warte 20 Sekunden ab Bedarfsbeginn; Start ist 70 Sekunden nach dem Ausschalten möglich.

Bedarf muss durchgehend bestehen. Der Live-Status zeigt Restzeit und ob Bestätigung oder Mindestausschaltzeit blockiert. Null deaktiviert nur die jeweilige Wartezeit; die andere gilt weiter.

**Ausschaltverzögerung** verlangt durchgehende Bedarfslosigkeit; neuer Bedarf hebt sie auf. Alle drei Zeiten akzeptieren ganze Sekunden von 0 bis 86.400, Standard null. Keine erzwungene Mindestlaufzeit hält die Quelle nach möglichem Ventilschließen aktiv.

Umbenennen oder Ändern eines derzeit ungenutzten Stoppabstands startet weder Bedarfszyklus noch Ausschaltverzögerung neu. Beim erneuten Aktivieren verwendet die Versorgung den zuletzt gemeldeten Ausschaltzeitpunkt für die Mindestausschaltzeit.

Ausschalten einer aktivierten Versorgung außerhalb von Velair pausiert die Automatik. Eine dauerhafte Home-Assistant-Benachrichtigung und ein Aktivitätseintrag erklären Ursache und Fortsetzungsbedarf. Der Grund steht auch bei **Automatik fortsetzen** und im Live-Status. Verfügbare Raumtemperaturen bleiben sichtbar. Fortsetzen wertet aktuellen Bedarf neu aus und schaltet nicht zwingend ein. Bei bestätigtem Bedarf beginnt eine neue Einschaltverzögerung; die Mindestausschaltzeit gilt weiter. Die Pause überlebt Neustarts und anderes Speichern. Deaktivieren oder Entfernen fordert Aus am zuvor gesteuerten Ausgang an.

Externes Einschalten überstimmt die Automatik nicht. Melden alle zugeordneten Thermostate keinen Bedarf, schaltet Velair nach der Ausschaltverzögerung wieder aus. Bestätigt Home Assistant diesen Ausschaltübergang als Velairs Korrektur, erstellt Velair eine dauerhafte Benachrichtigung und einen mit dem Schalter verknüpften Aktivitätseintrag. Der Text nennt die Versorgung, erklärt das Rückgängigmachen einer externen Aktivierung wegen fehlenden geschätzten Heiz- oder Kühlbedarfs und verlinkt **Versorgungssteuerung** zur Prüfung oder Deaktivierung. Er unterstellt keine menschliche Ursache.

Wiederholte Korrekturen derselben Versorgung und desselben Schalters werden pro Integrationslauf höchstens alle 15 Minuten gemeldet. Eine Schalterneuzuordnung beginnt einen neuen Meldezeitraum. Jede Versorgung verwendet eine Benachrichtigung; ein später zulässiger Hinweis ersetzt den vorherigen. Fehler bei der Übermittlung oder die bloße Annahme eines Dienstaufrufs ohne zugehörigen gemeldeten Ausschaltübergang erzeugen keine Erfolgsmeldung. Unbekannter Thermostatbedarf gilt nicht als bestätigter Nullbedarf. Eine Schalterintegration ohne Erhalt des Befehlskontexts ermöglicht keine dafür nötige Zuordnung. Diese Regeln ändern die Steuerung nicht und benötigen kein Polling. Fehler bei Benachrichtigung oder Aktivität unterbrechen die Steuerung nicht; Aktivität benötigt Home Assistants Aktivitäts-/Logbuchintegration. Pausenhinweise haben eine eigene Benachrichtigung und ein eigenes 15-Minuten-Limit; eine kürzliche Korrektur unterdrückt keine spätere Pause.

Ein neueres manuelles Ausschalten hat Vorrang vor bereits laufendem Speichern oder Fortsetzen. Setze anschließend bei Bedarf erneut ausdrücklich fort. Auch Temperatureinheitenmigration und Neustart erhalten die manuelle Aussetzung.

Nicht verfügbare Schalter oder fehlgeschlagene Befehle werden in der Versorgung angezeigt. Übermittlungsversuche sind begrenzt und werden nicht bei jedem Sensorupdate wiederholt. Die Annahme eines Befehls durch Home Assistant beweist keinen tatsächlichen Anlagenbetrieb.

Importierte Versorgungen sind deaktiviert und ausgesetzt. Prüfe Ausgang und Räume, aktiviere die Versorgung, speichere und setze die automatische Steuerung bei Bedarf ausdrücklich fort.

<a id="preconditioning-master-and-performance"></a>
## Vorkonditionierungs-Master und Leistung

Der [Vorkonditionierungs-Master](adaptive-preconditioning.de.md#preconditioning-master) begrenzt den Vorbereitungsbeginn abhängiger Räume; die gemeinsame Versorgung folgt stattdessen dem Raumbedarf. Eine Kesselanlage mit Heizkörperventilen benötigt nicht automatisch einen Master. Velair stellt keine Abhängigkeit zwischen diesen Einstellungen her.

Die Steuerung lauscht konfigurierten Entitäten und verwendet einen zusammenfassenden Worker und höchstens einen Timer pro Versorgung. Sie fragt nicht fortlaufend ab, speichert keine Temperaturmessreihe und benötigt keinen geöffneten Browser. Gewöhnliche Temperaturänderungen ohne relevante Steuerungsänderung versenden keine neue vollständige Panel-Momentaufnahme.
