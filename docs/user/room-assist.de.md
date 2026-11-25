<a id="room-assist"></a>
# Room Assist
<!-- velair-docs:start -->
Übersetzungen: [Englisches Original](room-assist.md) · [Español](room-assist.es.md) · [Français](room-assist.fr.md) · [Deutsch](room-assist.de.md) · [Italiano](room-assist.it.md) · [Nederlands](room-assist.nl.md) · [Polski](room-assist.pl.md) · [Português (Brasil)](room-assist.pt-br.md) · [Português (Portugal)](room-assist.pt-pt.md) · [Русский](room-assist.ru.md) · [Übersetzungsstatus](../translation-status.md)

<details>
<summary>Status dieser Übersetzung</summary>

| Angabe | Status |
| --- | --- |
| Referenzversion | 1.9.3-beta.5 |
| Letzte Synchronisierung | 2026-11-25 |
| Sprachliche Prüfung | KI-gestützte Übersetzung |
| Vergleich mit dem Original | Mit dem englischen Original synchronisiert. |

</details>

---
<!-- velair-docs:end -->

Mit Room Assist verwendet Velair für ein verwaltetes Klimagerät einen separaten Raumtemperatursensor und steuert weiterhin die reale Entität `climate.*`.

Das ist für Heizkörperthermostate, Heizkörperventile, Wandthermostate oder Klimaanlagen hilfreich, deren eingebauter Messwert die tatsächliche Raumtemperatur nicht repräsentiert. Ein Heizkörperthermostat direkt am Heizkörper kann beispielsweise `22 °C` melden, während der Raumsensor noch `20.5 °C` misst.

Alle Berechnungen verwenden die native Home-Assistant-Einheit des verwalteten Klimageräts. Die folgenden Beispiele verwenden der Lesbarkeit halber Celsius. Dieselben Hysteresegrenzen, vorzeichenbehafteten Korrekturen, Schutzregeln für das Zeitplanziel, Bereichsbreiten, Temperaturschritte und physischen Grenzen gelten direkt auch in Fahrenheit. Eine Temperaturabweichung im Raum von `4 °F` ergibt etwa eine Korrektur von `4 °F`; sie wird nicht als absolute Temperatur behandelt und erhält keinen Celsius-/Fahrenheit-Offset.

Room Assist arbeitet lokal und ereignisgesteuert. Velair fragt nicht kontinuierlich ab und sendet keine Sensordaten außerhalb von Home Assistant.

Bei einem Block mit **Nur Temperatur** wird Room Assist ausgesetzt, solange das Klimagerät aus ist. Beim Entfernen seiner bisherigen Korrektur schaltet es das Gerät nicht ein und stellt keinen früheren HVAC-Modus wieder her. Nach externem Einschalten kann es anhand des tatsächlichen kompatiblen Modus helfen, ohne einen Moduswechsel anzufordern. Ob der geplante Sollwert im ausgeschalteten Zustand aktualisiert werden kann, hängt weiterhin von der Klimaintegration ab.

<a id="what-it-does"></a>
## Was die Funktion bewirkt

Velair behält das Zeitplanziel als tatsächliches Benutzerziel bei, passt aber das an die Klimaentität gesendete Ziel vorübergehend anhand des separaten Raumsensors und des geräteeigenen Messwerts an.

Bei einem Einzelziel in festem `heat` oder `cool` erzeugt ein Totband ungleich null zwei Schaltgrenzen. Mit der Bremsung **Standard** merkt sich Room Assist die angesteuerte Grenze und wechselt die Richtung erst, wenn der separate Raumsensor die gegenüberliegende Grenze erreicht. Damit entsteht ein echter Hysteresezyklus mit separatem Raumsensor, statt den internen Gerätesensor nahe dem zentralen Ziel einen neuen Zyklus beginnen zu lassen. Die maximale Unterstützungsdifferenz begrenzt die vorzeichenbehaftete, aus der aktiven Grenze berechnete Korrektur. Optionale Bremsstufen nehmen die Anforderung stärker zurück; **Stark** beginnt damit am geplanten Ziel statt an der weiter entfernten Schaltgrenze.

Einzelziele in `auto` und `heat_cool` sowie native `heat_cool`-Bereiche behalten ihr neutrales Verhalten beziehungsweise die Randbereiche. Velair zwingt diese Modi nicht, innerhalb eines Einzelziel-Hysteresezyklus abwechselnd aktiv zu heizen und zu kühlen.

Die Klimaentität bleibt das Stellglied. Velair erstellt keine virtuelle Klimaentität und umgeht keine Gerätefirmware. Unterstützt dein Thermostat oder Heizkörperventil die direkte Einbindung eines externen Sensors, ist diese native Geräteoption normalerweise weiterhin die beste erste Wahl.

Für zwei Sollwerte in festem `heat` oder `cool` wähle zunächst den **Referenzsollwert** für Gerät und Modus unter **Einstellungen → Klimageräte und Gruppen**: **Unterer Sollwert** oder **Oberer Sollwert**, entsprechend dem tatsächlich genutzten Wert. Velair leitet dies nicht aus der Bereichsfähigkeit ab. Adaptive Vorkonditionierung verwendet dieselbe Auswahl.

Room Assist nutzt diese Grenze als festen Heiz- oder Kühlsollwert, einschließlich Einzelwert-Hysteresezyklus und Schutz des geplanten Sollwerts. Es verschiebt beide Grenzen gleich weit und erhält ihren Abstand. Beide müssen ins Temperaturraster und die physischen Grenzen passen; die andere Grenze kann die Korrektur begrenzen. Informationen zu physischen Grenzen bleiben in der Grafik und unter **Technische Daten** verfügbar.

Bei **Nicht konfiguriert** werden Festmoduspaare ohne Room-Assist-Korrektur gesendet. `auto`-Bereiche bleiben ohne Unterstützung; native `heat_cool`-Bänder behalten ihr Verhalten. Gespeicherte Einstellungen bleiben erhalten. Referenz- oder Modusänderungen verwerfen veraltete Unterstützung, ohne einen alten korrigierten Sollwert über die neue Absicht zurückzuschreiben.

<a id="setup"></a>
## Einrichtung

1. Öffne den Tab Room Assist.
2. Klappe das gewünschte Klimagerät auf.
3. Wählen Sie unter **Raumsensor-Assistent** zwischen **Fester Sensor** und **Nach Zeitplan**, konfigurieren Sie die gewählte Option und speichern Sie einen Wechsel.
4. Aktiviere die Raumsensorunterstützung.
5. Stelle das Room-Assist-Totband für festes Heizen oder Kühlen um den Einzelwert oder die gewählte Bereichsreferenz ein; bei automatischen Einzelwertmodi und nativen `heat_cool`-Bändern bestimmt es den neutralen Abstand.
6. Passe die maximale Unterstützungsdifferenz an, wenn der Standard für den Raum zu klein ist oder unter der Zielabweichung liegt, die das Thermostat zum Beenden von Heizen/Kühlen benötigt.
7. Wähle optional **Bremsung: Moderat** oder **Stark**, um die Anforderung stärker zurückzunehmen. Diese Stufen benötigen ein Room-Assist-Totband größer als null. **Standard** erhält das bisherige Verhalten.
8. Stelle optional den **Mindestregelabstand** ein, wenn kleine Korrekturen das Thermostat nicht reagieren lassen. Erhöhe bei Bedarf zuerst **Maximale Korrektur**; der Mindestabstand darf diesen Wert nicht überschreiten. Mit `0` bleibt das bisherige Verhalten erhalten.
9. Passe die Aktualisierungsverzögerung an, wenn Sensoraktualisierungen zu langsam oder zu häufig erscheinen.

Die Auswahl eines Raumsensors allein speichert nur den Sensor. Velair verwendet ihn erst bei aktivierter Raumsensorunterstützung als wirksame Raumtemperatur.

Raumsensorunterstützung benötigt keine adaptive Vorkonditionierung. Sie funktioniert auf normalen Zeitplanblöcken und auf frühzeitig durch Vorkonditionierung gestarteten Blöcken.

Ein Temperaturblock mit **Aktuellen Modus beibehalten** wendet weiterhin sein Zeitplanziel an. Room Assist verwendet den tatsächlich laufenden Modus. Ist das Gerät ausgeschaltet, startet Velair es in einem kompatiblen unterstützten Modus. Bei einem Temperaturblock bedeutet **Aktuellen Modus beibehalten** nicht „Thermostatziel unverändert lassen“. Ein reiner Optionsblock hat kein Ziel, daher läuft Room Assist dafür nicht.

Die Aktualisierungsverzögerung fasst Änderungen des Raumsensors oder der Klimagerätetemperatur zusammen. Standard sind `20` Sekunden. Setze `0` für sofortige Neuberechnung oder bis zu `300` Sekunden, um häufige Sensoraktualisierungen zu bündeln.

Das Room-Assist-Totband ist unabhängig von der Mindestdifferenz der adaptiven Vorkonditionierung. Standard sind `0.3 °C` oder `1 °F`. Mit `0` wird das Totband deaktiviert; die Einstellung ist in `0.1`-Grad-Schritten bis `5 °C` oder `9 °F` möglich. Speichern bei aktivem Room Assist aktualisiert das unterstützte Ziel sofort.

Die Livegrafik zeigt das nominale Totband als dünnen schraffierten Streifen direkt über der Temperaturachse, mit passender Legende darunter. Wirksame Stopp- und Wiederaufnahmeschwellen stammen aus dem bestätigten Regelzustand. **Stark** kann die Anforderung daher am Ziel beenden, während der vollständige nominale Streifen sichtbar bleibt. Bei Einzelziel-Automatikmodi stellt er die neutrale Marge dar. Native `heat_cool`-Bereiche schraffieren nur die äußeren Ränder neben dem nominalen Band, mit der Legende **Äußerer Rand**. Bei Totband null gibt es keine schraffierte Fläche; die Legende zeigt die konfigurierte Nullmarge. Diese Anzeigen beschreiben konfigurierte Grenzen, keine Sensorbewegung. Ausblenden von `show_room_assist_deadband` in einer Lovelace-Room-Assist-Karte blendet Einstellung, Streifen und Legende gemeinsam aus.

Es wird nur die gewählte Option angezeigt. Wenn **Fester Sensor** bereits die gespeicherte Variante ist, wird ein anderer Sensor sofort gespeichert. Der Wechsel zwischen **Fester Sensor** und **Nach Zeitplan** ändert einen Entwurf: **Speichern** übernimmt die Variante und ihre Einstellungen, **Abbrechen** stellt die gespeicherte Konfiguration wieder her. Der feste Sensor und der gespeicherte Zeitplan bleiben beim Wechsel erhalten; beide werden nicht gleichzeitig aktiviert.


<a id="optional-braking"></a>

### Optionale Bremsung

Die Bremsung ändert den an das Gerät gesendeten Sollwert; die geplante Temperatur bleibt das tatsächliche Raumziel. Sie ist in festem **Heizen** und **Kühlen** verfügbar, auch bei Geräten mit zwei Sollwerten und konfiguriertem Referenzsollwert. Automatische Einzelzielmodi und native `heat_cool`-Bänder bleiben unverändert.

**T** ist das geplante Ziel, **H** das Room-Assist-Totband und **S** die effektive Sollwertschrittweite des Geräts:

| Bremsung | Heizen: Anforderung zurücknehmen | Heizen: erneut Wärme anfordern | Kühlen: Anforderung zurücknehmen | Kühlen: erneut Kühlung anfordern |
| --- | --- | --- | --- | --- |
| Standard | Bisheriges Verhalten | Bisheriges Verhalten | Bisheriges Verhalten | Bisheriges Verhalten |
| Moderat | Bei T + H | Bei T − H | Bei T − H | Bei T + H |
| Stark | Bei T | Bei T − H | Bei T | Bei T + H |

Während der Rücknahme begrenzt **Moderat** den Heizsollwert auf höchstens **T − S** oder den Kühlsollwert auf mindestens **T + S**. **Stark** verwendet standardmäßig **zwei Schritte**. Nimmt die bestehende Berechnung bereits mehr Anforderung zurück, behält Velair dieses stärkere Ergebnis. Die Grenzen bleiben während der Bremsung fest: Sensoraktualisierungen addieren oder subtrahieren nicht jedes Mal einen weiteren Schritt.

Um die Bremsstärke von Stark für eine Zone zu ändern, öffne **Einstellungen → Klimageräte und Gruppen** und lege **Bremsschritte für Stark** für das Klimagerät oder die Gruppe fest. Die Einstellung akzeptiert ganze Zahlen von `2` bis `10` und zeigt den entsprechenden Temperaturabstand anhand der effektiven Sollwertschrittweite und der aktuellen Einheit des Geräts. Sie wird für jede Zone unabhängig gespeichert und gilt nur, wenn in Room Assist **Stark** ausgewählt ist. **Standard** und **Moderat** verwenden diese Einstellung nicht.

Zum Beispiel entsprechen `3` Schritte zu je `0.5 °C` einem Abstand von `1.5 °C`. Drei Schritte zu je `1 °F` entsprechen `3 °F`. Die Schrittzahl ist keine Temperatur und ändert sich bei einer Celsius/Fahrenheit-Umrechnung nicht; der entsprechende Abstand folgt der effektiven Geräteschrittweite. Room Assist behält die bisherige Auswahl bei und zeigt die konfigurierte Schrittzahl sowie den entsprechenden Abstand.

Beispiel mit Heizungsziel `20.5 °C`, Totband `0.5 °C` und Geräteschrittweite `0.5 °C`:

- **Moderat** nimmt bei `21 °C` die Anforderung zurück; der Gerätesollwert beträgt höchstens `20 °C`.
- **Stark** mit standardmäßig zwei Schritten nimmt sie bei `20.5 °C` zurück; der Gerätesollwert beträgt höchstens `19.5 °C`.
- Ist **Bremsschritte für Stark** auf `3` gesetzt, nimmt Stark die Anforderung weiterhin bei `20.5 °C` zurück, begrenzt den Gerätesollwert jedoch auf höchstens `19 °C`.
- Beide fordern erneut Wärme an, wenn der separate Raumsensor `20 °C` erreicht.

Eine Änderung der Schrittzahl für Stark ändert die Sollwertgrenze, nicht die Rücknahme- oder Wiedereinschalttemperatur. Beim Kühlen liegt die entsprechende Grenze oberhalb statt unterhalb des geplanten Ziels. Dies ist eine feste Anpassung; sie wird nicht schrittweise verstärkt, solange die Raumtemperatur außerhalb des Bandes bleibt.

Vor der Rücknahme bleibt die bestehende Unterstützungsberechnung unverändert. Die Bremsung bleibt bis zur Wiedereinschaltgrenze aktiv, auch beim Überqueren des zentralen Ziels. Startet die Unterstützung innerhalb des Bandes neu, bleibt die bisherige vorsichtige Initialisierung erhalten, ohne absichtlich einen Heiz- oder Kühlzyklus zu starten.

Der aktuelle Status zeigt die effektiven Rücknahme- und Wiedereinschalttemperaturen. Die Grafik behält das nominale Totband bei und kennzeichnet die effektiven Bremsschwellen getrennt. Die Anforderung der gemeinsamen Versorgung folgt derselben bestätigten Phase.

Wähle **Standard**, bevor du das Totband auf null setzt. Kann der aktuelle Modus oder die Temperaturreferenz die gespeicherte Bremsstufe nicht verwenden, bleibt sie gespeichert und der Status erklärt die Inaktivität. Ungültige gespeicherte Kombinationen setzen die zusätzliche Bremsung aus, statt das Totband unbemerkt zu ändern.

Physische Mindest- und Höchstsollwerte können die Bremsung begrenzen. Bei zwei Sollwerten wird das vollständige Paar gemeinsam verschoben; beide Grenzen können die Verschiebung einschränken. **Technische Daten** unterscheiden angefordertes und angewendetes Ergebnis; die Grafik kennzeichnet die erreichte Grenze.

Die Bremsung reduziert die Heiz- oder Kühlanforderung; sie bestätigt keinen Stillstand von Ventil, Kompressor oder Thermostat. Gerätesteuerung, Mindestlaufzeiten und thermische Trägheit können weiterhin ein Überschwingen verursachen. Diese Einstellung lernt keine Zyklen und nimmt die Anforderung nicht vor dem geplanten Ziel zurück. Prüfe sie mit echten Heiz- und Kühlzyklen, bevor du dich für einen bestimmten Raum auf eine Stufe verlässt.

Portable Exporte verwenden Modell **30**, um die Schrittzahl für Stark, die Bremsstufe, Vorbereitungsversätze und den Mindestregelabstand zu erhalten. Ältere unterstützte Importe ohne Schrittzahl für Stark verwenden `2`. Bewahre für ein mögliches Downgrade eine Sicherung der früheren Version auf; ältere Velair-Versionen können Modell 30 nicht importieren.

<a id="minimum-control-margin"></a>
### Mindestregelabstand

Manche Thermostate reagieren erst auf einen deutlichen Abstand zwischen ihrer internen Temperatur und dem angeforderten Sollwert. Ein am Heizkörper montierter Sensor kann mehrere Grad mehr als der Raum messen, obwohl der separate Raumsensor weiterhin Wärme anfordert. **Mindestregelabstand** fordert bei einer geeigneten Room-Assist-Korrektur mindestens diesen Abstand an. Die Einstellung ist optional und standardmäßig `0`.

Die Einstellungen erfüllen unterschiedliche Aufgaben:

| Einstellung | Zweck |
| --- | --- |
| Totband von Room Assist | Bestimmt die Umschaltgrenzen oder den neutralen Bereich der externen Raumtemperatur. |
| Mindestregelabstand | Verstärkt eine geeignete Korrektur gegenüber dem internen Messwert des Thermostats. |
| Maximale Korrektur | Begrenzt diese Korrektur; ein höheres Maximum allein fordert keine größere Korrektur an. |
| Bremsung | Ändert die Rücknahmeschwellen und ergänzt den Schutz des geplanten Sollwerts. |

Der Abstand unterstützt `0–10 °C` (`0–18 °F`) und darf **Maximale Korrektur** nicht überschreiten. Bei widersprüchlichen Werten fordert Velair dich auf, zuerst das Maximum zu erhöhen oder den Mindestabstand zu verringern. Es ändert keine der Einstellungen automatisch. Die Eingabeschritte folgen der effektiven Sollwertschrittweite des Geräts.

Beispiel: Heizsollwert `19.5 °C`, Totband `±0.3 °C`, Bremsung **Standard** sowie Mindestabstand und Maximum jeweils `10 °C`. Bei internem Messwert `21.5 °C` und passender Sollwertschrittweite `0.5 °C`:

| Separater Raumsensor | Room-Assist-Phase | Angeforderter Gerätesollwert |
| --- | --- | --- |
| Bei oder unter `19.2 °C` | Wärme in Richtung `19.8 °C` anfordern | `31.5 °C`: interner Messwert + 10 |
| Temperatur steigt innerhalb des Bandes | Weiter Wärme anfordern | Aktueller interner Messwert + 10 |
| Erreicht `19.8 °C` | Wärmeanforderung bis `19.2 °C` zurücknehmen | `11.5 °C`: interner Messwert − 10 |

Der interne Messwert kann sich ändern; spätere Anforderungen verwenden dessen aktuellen Wert. Das Raumziel bleibt `19.5 °C`; die großen Gerätesollwerte verbreitern das Komfortband nicht. Die Bremsstufen Moderat und Stark behalten ihre Stopp- und Wiederaufnahmegrenzen sowie ein bereits stärkeres Rücknahmeergebnis bei.

Festes Kühlen funktioniert umgekehrt. Bei Ziel `24 °C`, Totband `±0.3 °C`, internem Messwert `26 °C` und Mindestabstand/Maximum `10 °C` fordert Room Assist beim Kühlen `16 °C` an. Erreicht der Raum `23.7 °C`, fordert es vor Anwendung der Gerätegrenzen `36 °C` an. Die Kühlung wird bei `24.3 °C` wieder angefordert. Bei Totband null ohne beibehaltene Phase werden nur Korrekturen ungleich null verstärkt; bei Gleichheit bleibt die Anforderung neutral.

Automatische Einzelzielmodi und native **Heizen/Kühlen**-Bereiche verstärken nur aktive Heiz- oder Kühlanforderungen. Innerhalb des neutralen Raumbandes bleibt das bisherige Halteverhalten erhalten. Eine starke Sollwertsenkung zum Beenden des Heizens könnte bei einem bidirektionalen Gerät sonst die Kühlung starten. Bei nativen Bereichen verschieben sich beide Grenzen gemeinsam und behalten ihren ursprünglichen Abstand. Festmoduspaare verwenden den konfigurierten Referenzsollwert; nicht unterstützte Bereichskonfigurationen bleiben nicht unterstützt.

Geräteschritte und physische Grenzen können den angeforderten Abstand verhindern. Bei internem Messwert `21.7 °C`, Mindestabstand/Maximum `10 °C` und Raster `0.5 °C` liegt beispielsweise kein Rasterpunkt genau `10 °C` entfernt. Velair wählt nach Möglichkeit eine gültige Korrektur innerhalb des Maximums und meldet die Begrenzung durch die Schrittweite. Bei zwei Sollwerten kann die Erhaltung der Bereichsbreite die Bewegung zusätzlich begrenzen. Die aktuelle Erklärung und **Technische Daten** kennzeichnen einen aktiven oder begrenzten Abstand.

Der Schutz des geplanten Sollwerts, die Bremsung und vorübergehende Vorbereitungsversätze können einen endgültigen Abstand oberhalb der maximalen Korrektur erzeugen. Diese Einstellung begrenzt die Room-Assist-Korrektur, nicht jede nachfolgende Schutzmaßnahme oder vorübergehende Zusatzkorrektur. Während der Vorbereitung folgt der Mindestabstand der aktuellen Vorbereitungsrichtung, bevor der Zusatz angewendet wird.

Diese Funktion fordert einen Sollwertabstand an. Sie bestätigt weder das physische Öffnen eines Ventils noch den Kompressorbetrieb oder einen sofortigen Stopp. Verwende den kleinsten für dein Gerät wirksamen Abstand und prüfe vollständige reale Heiz- oder Kühlzyklen.

<a id="optional-sensor-schedule-beta"></a>

### Optionaler Sensorzeitplan (Beta)

Room Assist kann während der Woche unterschiedliche Temperaturreferenzen verwenden, ohne Temperaturzeitpläne, Profile oder Modi zu ändern. Wählen Sie unter **Raumsensor-Assistent** die Option **Nach Zeitplan**, um sie zu konfigurieren. Mit **Fester Sensor** kehren Sie zum festen Raumsensor zurück.

Wählen Sie eine Standardreferenz und fügen Sie Zeiträume mit Wochentagen, Start- und Endzeiten sowie einer Referenz hinzu. Speichern Sie den vollständigen Entwurf, um ihn anzuwenden; Abbrechen verwirft Ihre Änderungen. Als Referenzen dienen in Home Assistant verfügbare Temperatursensoren oder die eigene Temperatur des Klimageräts. Außerhalb der Zeiträume gilt die Standardreferenz. Zeiträume dürfen über Mitternacht reichen und gehören zu den ausgewählten Starttagen; Überschneidungen werden abgelehnt. Die Startzeit ist eingeschlossen, die Endzeit ausgeschlossen. Es gilt die in Home Assistant konfigurierte Zeitzone.

Wählen Sie beispielsweise **Keine Korrektur durch Room Assist** als Standard und einen Bürosensor von Montag bis Freitag zwischen 08:00 und 17:00. Ihre bestehenden Sommer-/Winter-Temperaturzeitpläne bestimmen weiterhin die gewünschte Temperatur. Während der Arbeitszeit berechnet Room Assist die Korrekturen anhand des Bürosensors. Ansonsten sendet Velair den normalen geplanten Sollwert und der Thermostat regelt anhand seiner eigenen Referenz. Dadurch wird nicht geändert, welchen physischen Sensor die Gerätefirmware intern verwendet.

Der einzige Room-Assist-Schalter bestimmt, ob die Unterstützung aktiviert ist. Beim Ausschalten bleiben beide Konfigurationen gespeichert. Mit **Fester Sensor** und anschließendem Speichern gilt wieder der beibehaltene feste Raumsensor. Ist eine externe Referenz nicht verfügbar, setzt Velair die Korrektur aus und verwendet den normalen geplanten Sollwert, wenn es die automatische Kontrolle hat; es wählt weder unbemerkt einen anderen Raum noch verwendet es einen alten Messwert. Die Unterstützung wird fortgesetzt, sobald diese Referenz wieder nutzbar ist.

Referenzwechsel verdrängen weder manuelle Anpassung noch Boost oder Pausen. Beim Fortsetzen der automatischen Steuerung verwendet Velair die dann gültige Referenz. Bei Raumgruppen bedeutet die eigene Gerätetemperatur die konfigurierte Temperaturreferenz der Gruppe.

**Beta-Einschränkung:** Eine Referenz wechselt genau zur geplanten Uhrzeit. Die adaptive Vorkonditionierung startet kein vorgezogenes Ziel über einen Referenzwechsel hinweg; sie berechnet nach diesem Wechsel neu. Der Raumwechsel fordert keine frühere Vorbereitung des nächsten Raums an. Lernbeobachtungen werden ihrer Temperaturquelle zugeordnet, damit ein Messwertsprung zwischen Räumen nicht als Erwärmung oder Abkühlung interpretiert wird.

Alle ausgewählten externen Messwerte müssen unabhängig in Home Assistant verfügbar sein. Bei Nest muss eine Konfiguration mit der offiziellen Integration für den Thermostat und einer anderen Integration für einen entfernten Sensor in der Installation getestet werden. Lassen Sie Nests eigene Referenz unverändert, wenn die Thermostatmessung eine stabile Raumreferenz sein soll. Velair wählt Nests internen aktiven Sensor nicht aus. Ein gemeinsames HVAC-System wirkt weiterhin auf alle versorgten Räume; eine Referenzauswahl schafft keine unabhängig geregelten physischen Zonen.

<a id="room-groups"></a>
### Raumgruppen

Wähle in Room Assist die Gruppe und nutze dieselbe Sensorauswahl, Aktivierung, Totband-, Maximalkorrektur- und Aktualisierungsregler. Die eigene Gruppentemperatur stammt vom unter **Raumgruppen → Temperaturreferenz** gewählten Mitglied; der optionale externe Sensor wird hier eingerichtet. Deaktivieren oder Löschen von Room Assist stellt diesen Mitgliedsmesswert wieder her.

Die Gruppe hat eine gemeinsame Room-Assist-Konfiguration und Korrektur statt unabhängiger Regler pro Mitglied. Velair erhält den geplanten Raumsollwert und sendet den unterstützten Befehl gemäß Gruppenübermittlung: standardmäßig alle Mitglieder oder der gewählte Empfänger, wenn die Anlage bereits weitergibt. Fähigkeits-, Schritt- und Grenzprüfungen gelten für die echten Empfänger. Mitglieder bleiben individuell in der Übersicht sichtbar.

<a id="understanding-the-live-status"></a>
## Den aktuellen Status verstehen

Der Room-Assist-Tab zeigt, was Velair für jedes verwaltete Klimagerät aktuell tun kann. Du musst es nicht aus dem Thermostatziel ableiten:

| Status | Bedeutung |
| --- | --- |
| **Nicht konfiguriert** | Kein separater Raumsensor ausgewählt. |
| **Deaktiviert** | Ein Raumsensor ist gespeichert, Room Assist aber ausgeschaltet. |
| **Inaktiv** | Room Assist ist aktiviert, aber kein kompatibler Temperaturblock aktiv oder noch keine nutzbare Berechnung vorhanden. |
| **Bereit** | Velair hat Messwerte und Ziel für eine Berechnung, aber noch kein unterstütztes Ziel angewendet. |
| **Unterstützt** | Velair hat ein vorübergehend korrigiertes Ziel oder einen verschobenen Bereich angewendet. |
| **Hält** | Room Assist hält ein automatisches Einzelziel neutral, einen nativen `heat_cool`-Bereich oder durch Zeitplanzielschutz ein Ziel auf der sicheren Seite. Ein fester `heat`-/`cool`-Zyklus kann beim Durchlaufen des Totbands stattdessen **Unterstützt** bleiben. |
| **Blockiert** | Pause, temporäre Anpassung, manueller Zustand oder anderer Zeitplanerzustand hat derzeit Vorrang. |
| **Nicht verfügbar** | Das verwaltete Klimagerät oder erforderliche Zielfähigkeit ist nicht nutzbar. Die Oberfläche zeigt einen bekannten Grund an. |

Bei aktivem Room Assist fasst die Übersicht dies je nach Fall als **Zur unteren Grenze**, **Zur oberen Grenze**, **Aktiv**, **Hält** oder **Zeitplanzielschutz** zusammen und zeigt geplante sowie angewendete Werte. Ein Thermostatminimum oder -maximum unterscheidet sich vom Zeitplanzielschutz: Die Grafik kennzeichnet die erreichte physische Grenze, **Technische Daten** trennen angeforderte und angewendete Werte, und Home Assistant erhält eine dauerhafte Benachrichtigung, bis die physische Begrenzung nicht mehr greift.

<a id="fixed-heating-hysteresis-example"></a>
## Beispiel: Hysterese bei festem Heizen

Szenario mit Bremsung **Standard**:

- Zeitplanblock: `21 °C`, `heat`
- Room-Assist-Totband: `±0.3 °C`
- Untere Grenze: `20.7 °C`
- Obere Grenze: `21.3 °C`
- Maximale Unterstützungsdifferenz: `2 °C`
- Temperaturschritt des Klimageräts: `0.1 °C`

Der Zyklus Schritt für Schritt:

1. Raum- und Klimagerätesensor melden beide `21.0 °C`. Ein neuer fester Heizzyklus innerhalb des Bands startet sicher **in Richtung der unteren Grenze**.
2. Das aktive Hystereseziel ist `20.7 °C`. Die Korrektur wird von dieser Grenze statt vom zentralen Zeitplanziel `21 °C` berechnet:

   ```text
   correction = 20.7 - 21.0 = -0.3 °C
   climate target = 21.0 + (-0.3) = 20.7 °C
   ```

   Dieses Heizziel soll bewusst keine Heizanforderung auslösen; Geräteschritt und physische Grenzen werden berücksichtigt.
3. Durchläuft der Raum `20.9 °C`, bleibt Velair in derselben Phase. Es fordert nicht allein deshalb Wärme an, weil die zentrale Zeitplantemperatur `21 °C` unterschritten wurde.
4. Erreicht der separate Raumsensor `20.7 °C`, wechselt Velair **in Richtung der oberen Grenze** bei `21.3 °C`.
5. Angenommen, der Raum hat `20.7 °C` und der Klimagerätesensor `20.5 °C`. Die neue Korrektur fordert Wärme an:

   ```text
   correction = 21.3 - 20.7 = +0.6 °C
   climate target = 20.5 + 0.6 = 21.1 °C
   ```

6. Velair bleibt auf die obere Grenze ausgerichtet, während der Raum `21.0 °C` durchläuft. Bei `21.3 °C` wechselt es zurück zu `20.7 °C`, wendet eine negative Korrektur an und wiederholt den Zyklus.

Das sichtbare Zeitplanziel bleibt `21 °C`. Das vorübergehende Ziel ist nur der an das Thermostat gesendete Wert. Überschreitet die berechnete Korrektur die maximale Unterstützungsdifferenz, begrenzt Velair sie vor dem Addieren zum aktuellen Gerätemesswert.

Die Festmodusphase existiert nur zur Laufzeit. Ein neuer Block, ein Ziel- oder HVAC-Moduswechsel, das Beenden von Room Assist oder Neuladen von Velair startet einen neuen Zyklus. Beginnt ein neuer `heat`-Zyklus innerhalb des Bands, startet er zur unteren Grenze, um nicht sofort Wärme anzufordern.

Verändert dieser Schutz das Ergebnis, erklärt der aktuelle Room-Assist-Status beide Werte: berechnetes Ziel und tatsächlich beibehaltenes Ziel. Die Übersicht zeigt kompakt **Schutz des geplanten Sollwerts**. Das ist normales Schutzverhalten, kein Thermostatfehler, und erzeugt keine dauerhafte Home-Assistant-Benachrichtigung. Physische Thermostatgrenzen bleiben in der Grafik und unter **Technische Daten** gekennzeichnet und haben eine separate Benachrichtigung.

Das Klimagerät bleibt für Kompressorschutz, Mindestlaufzeiten und physische Reaktion verantwortlich. Der Hysteresezyklus gibt Velair eine stärkere Sollwertstrategie, garantiert aber nicht den genauen Schaltzeitpunkt von Relais, Ventil oder Kompressor.

<a id="heating-with-a-capped-delta"></a>
## Heizen mit begrenzter Differenz

Ausgangslage:

- Zeitplanblock: `25 °C`, `heat`
- Raumsensor: `18 °C`
- Aktuelle Klimagerätetemperatur: `17.1 °C`
- Room-Assist-Totband: `0 °C` (bisherige vorzeichenbehaftete Korrektur)
- Maximale Unterstützungsdifferenz: `5 °C`

Die tatsächliche Raumdifferenz ist groß:

```text
25 - 18 = 7 °C
```

Velair begrenzt die Unterstützungsdifferenz auf den konfigurierten Wert:

```text
assist delta = 5 °C
climate target = 17.1 + 5 = 22.1 °C
```

Bei einem Schritt von `0.5 °C` wird das Heizziel auf `22 °C` abgerundet.

Das verhindert unrealistische Thermostatzielwerte, ohne die zum Heizen des Raums nötige Anforderung zu verlieren.

<a id="fixed-cooling-hysteresis-example"></a>
## Beispiel: Hysterese bei festem Kühlen

Szenario mit Bremsung **Standard**:

- Zeitplanblock: `24 °C`, `cool`
- Room-Assist-Totband: `±0.5 °C`
- Untere Grenze: `23.5 °C`
- Obere Grenze: `24.5 °C`
- Maximale Unterstützungsdifferenz: `2 °C`
- Temperaturschritt des Klimageräts: `0.5 °C`

Kühlen verhält sich symmetrisch. Ein neuer Zyklus innerhalb des Bands beginnt sicher **in Richtung der oberen Grenze**, damit nicht sofort Kühlung angefordert wird:

1. Bei beiden Sensoren auf `24.0 °C` ist die aktive Grenze `24.5 °C`:

   ```text
   correction = 24.5 - 24.0 = +0.5 °C
   climate target = 24.0 + 0.5 = 24.5 °C
   ```

   Erhöhen eines festen Kühlziels wirkt einer Kühlanforderung entgegen.
2. Die Phase bleibt beim Durchlaufen des Bands unverändert. Erreicht der separate Raumsensor `24.5 °C`, wechselt Velair zu `23.5 °C`.
3. Hat der Raum dann `24.5 °C` und meldet das Klimagerät `25.0 °C`:

   ```text
   correction = 23.5 - 24.5 = -1.0 °C
   climate target = 25.0 - 1.0 = 24.0 °C
   ```

   Dadurch wird Kühlung angefordert.
4. Velair hält die untere Zielgrenze beim Durchlaufen von `24.0 °C` bei. Bei `23.5 °C` wechselt es zurück zu `24.5 °C` und wiederholt den Zyklus.

Schrittanpassung und physische Grenzen gelten weiterhin für jedes vorübergehende Ziel. Die tatsächliche Kühlfolge bleibt Sache der Gerätefirmware.

<a id="how-legacy-inversion-and-scheduled-protection-work-together"></a>
## Zusammenspiel der bisherigen Vorzeichenumkehr mit dem Zeitplanzielschutz

Vorzeichenumkehr und Zeitplanzielschutz lösen zwei unterschiedliche Teile desselben Steuerungsproblems. Die Umkehr ändert die Korrekturrichtung nach Überschreiten des Ziels durch die am separaten Raumsensor gemessene Temperatur. Zeitplanzielschutz ist die abschließende Sicherheitsgrenze, wenn die umgekehrte Korrektur ein Festmodusziel weiterhin auf der anfordernden Seite des Zeitplans belässt.

Die folgenden Kühlbeispiele verwenden Zeitplanziel `22 °C`, Totband `0 °C`, Zielschritt `0.5 °C` und eine maximale Unterstützungsdifferenz, die die Berechnung nicht begrenzt. „Ohne Umkehr“ und „vor Schutz“ sind erklärende Zwischenwerte, keine auswählbaren Room-Assist-Modi.

| Externer Raum | Gerätemesswert | Ohne Umkehr nach Überschreiten | Ergebnis mit Vorzeichen vor Schutz | Endziel | Grund |
| --- | --- | --- | --- | --- | --- |
| `24 °C` | `25.1 °C` | Nicht relevant | `23.5 °C` | `23.5 °C` | Der Raum benötigt weiterhin Kühlung. |
| `21 °C` | `19 °C` | `19 °C` | `20 °C` | `22 °C` | Umkehr erhöht das Ziel, würde aber noch Kühlung anfordern; daher greift die Zeitplan-Untergrenze. |
| `21 °C` | `25 °C` | `25 °C` | `26 °C` | `26 °C` | Das stärkere umgekehrte Ziel liegt sicher über dem Zeitplan und bleibt erhalten. |

Heizen verhält sich symmetrisch. Bei Heizzeitplan `20 °C`, externem Messwert `21 °C` und internem Messwert `24 °C` ergibt die Vorzeichenberechnung `23 °C`; der Schutz verwendet stattdessen die Zeitplan-Obergrenze `20 °C`. Bei am separaten Raumsensor gemessener Temperatur `24 °C` und internem Messwert `21.5 °C` ist das stärkere umgekehrte Ergebnis `17.5 °C` bereits sicher und bleibt unverändert.

Deshalb bleibt Umkehr auch mit Zeitplanzielschutz nützlich: Sie kann weiter auf die nicht anfordernde Seite gehen, wenn der Gerätemesswert es erlaubt. Der Schutz deckt Fälle ab, in denen der interne Messwert auf die falsche Seite gedriftet ist.

Bei Totband ungleich null verwenden festes `heat` und `cool` den zustandsbehafteten Zyklus statt des Richtungswechsels am zentralen Ziel. Totband `0` behält die bisherige Vorzeichenberechnung: Die Korrektur wechselt beim Überschreiten des Zeitplanziels das Vorzeichen und keine Hysteresephase wird gespeichert.

Ein kompatibles Einzelziel in `auto` oder `heat_cool` behält ebenfalls die bisherige Vorzeichenberechnung. Innerhalb des Totbands verwendet Velair das unterstützte Ziel nahe dem Gerätemesswert, statt das Gerät zu aktivem Wechsel zwischen Heizen und Kühlen zu zwingen. Ein natives `heat_cool`-Gerät behält beide Benutzergrenzen und erhält den unten beschriebenen vollständigen unterstützten Bereich.

<a id="device-hysteresis-and-minimum-run-time"></a>
## Gerätehysterese und Mindestlaufzeit

Room Assist steuert das durch Home Assistant gesendete Ziel. Es ersetzt weder Firmwarehysterese noch Kompressorschutz, Mindestlaufzeit oder die Entscheidung, wann ein gleiches Ziel als inaktiv gilt.

Ein fester Heizzyklus zur unteren Grenze sendet beispielsweise ein Ziel, das Heizen verhindern soll, bis der separate Raumsensor diese Grenze erreicht. Ein Gerät mit breiter interner Hysterese oder Mindestlaufzeit kann trotzdem vorübergehend starten oder weiterheizen. Velair leitet keine undokumentierte gerätespezifische Abschaltmarge ab und verwendet `hvac_action` nicht zum Phasenwechsel.

Zeitplanzielschutz verhindert, dass Velair bei driftendem internem Sensor das Ziel über den Benutzerzeitplan hinweg verschiebt. Er verspricht keinen sofortigen HVAC-Stopp. Native externe Sensoreinbindung oder Kalibrierung bleibt die beste verfügbare Option. Verwende einen `Off`-Block, wenn ausdrücklich gestoppt werden soll statt thermostatgesteuert zu halten.

Die maximale Unterstützungsdifferenz muss die gegebenenfalls benötigte umgekehrte Gerätekorrektur zulassen. Der Editor zeigt diesen Hinweis unter dem Einstellungsnamen dauerhaft, damit er bei der Einrichtung nicht übersehen wird. Beispiel:

```text
Thermostat stopping gap: 2.5 °C
Maximum assist delta:    2.0 °C  -> may be insufficient
Maximum assist delta:    3.0 °C  -> permits enough inverse correction
```

Bei **Mindestregelabstand** `0` wendet die Einstellung `3 °C` nicht sofort eine Korrektur von `3 °C` an. Sie erlaubt Room Assist nur, diesen Wert bei einer entsprechenden Temperaturabweichung am separaten Raumsensor zu erreichen.

Diese Einstellung begrenzt die proportionale Korrektur, nicht den endgültigen Sollwert nach dem Schutz des geplanten Ziels. Die optionale Bremsung verstärkt diesen Schutz mit einer Grenze von einem oder zwei Schritten; sie ändert die maximale Unterstützungsdifferenz nicht und wendet nicht bei jeder Aktualisierung den gesamten Höchstwert an. Ein [Mindestregelabstand](#minimum-control-margin) größer als null kann auch bei kleiner externer Raumtemperaturabweichung eine größere Korrektur anfordern.

<a id="why-climate-target-can-differ-from-the-calculation"></a>
### Warum das Geräteziel von der Berechnung abweichen kann

**Sollwert** ist der derzeit von der Klimaentität gemeldete Wert, während Room Assist bereit oder blockiert ist. Beim Unterstützen oder Halten eines angewendeten Einzelziels zeigt er stattdessen den von Velair gesendeten vorübergehenden Sollwert. Keiner dieser Werte ist das geplante Raumziel oder die aktive Hysteresegrenze. Ein Klimagerät akzeptiert Ziele auf einem gerätespezifischen Raster; Velair muss deshalb den endgültigen Sollwert gegebenenfalls an den wirksamen veröffentlichten, zuletzt gemeldeten, manuellen oder Standardschritt anpassen.

Bei festem Kühlen kann Room Assist etwa `23.9 °C` für ein Gerät mit `0.5 °C`-Schritten berechnen. Velair wendet `24.0 °C` an: Kühlziele werden aufgerundet, um nicht stärker als berechnet zu kühlen. Feste Heizzielwerte werden abgerundet; Einzelziel-Automatikmodi verwenden den nächsten Schritt. Klappe den Chip **Sollwert** auf oder öffne **Technische Daten**, um den angezeigten Wert sowie verfügbare Berechnung, wirksamen Schritt und Nachweise des angewendeten Werts zu prüfen. Hat die Schrittanpassung den bestätigten Sollwert geändert, zeigt **Technische Daten** auch den Wert vor der Schrittanpassung. Physisches Minimum/Maximum und Zeitplanzielschutz werden separat erklärt, nicht als Schrittanpassung.

<a id="heatcool-range-example"></a>
## Beispiel: Heiz-/Kühlbereich

Room Assist unterstützt auch native `heat_cool`-Bereiche. Untere und obere Ziele werden als ein Komfortband behandelt und immer gemeinsam verschoben, sodass ihr Abstand unverändert bleibt.

Ausgangslage:

- Geplanter Bereich: `19–24 °C`
- Raumsensor: `18 °C`
- Aktuelle Klimagerätetemperatur: `22 °C`
- Maximale Unterstützungsdifferenz: `2 °C`
- Temperaturschritt des Klimageräts: `0.5 °C`

Der Raum liegt `1 °C` unter der Heizgrenze. Velair setzt die untere Grenze `1 °C` über den Gerätemesswert und verschiebt die obere um denselben Betrag:

```text
applied range = 23–28 °C
```

Das Gerät misst `22 °C`, liegt unter der angewendeten unteren Grenze und kann Wärme anfordern. Steigt der Raum später über `24 °C`, verwendet Velair auf dieselbe Weise die obere Grenze zum Anfordern von Kühlung. Tritt der Raum erstmals in das geplante Band einschließlich des Totbands um die Grenzen ein, positioniert Velair das angewendete Band so, dass der Gerätemesswert darin liegt. Dieses Halteband bleibt stabil, solange die am separaten Raumsensor gemessene Temperatur im Band bleibt. Spätere Bewegungen des internen Sensors werden nicht verfolgt, da sich dieser bei aktivem Kompressor, Lüfter, Ventil oder Heizkörper selbst verändern kann.

Der angewendete Bereich wird stets am Geräteschritt ausgerichtet und bei physischen Zielgrenzen als Ganzes verschoben. Velair passt Min und Max niemals unabhängig an.

Überschreitet ein berechnetes Einzelziel oder ein Bereich das unterstützte Minimum/Maximum, verwendet Velair das nächstgelegene gültige Ergebnis. Die Grafik kennzeichnet die erreichte Grenze; **Technische Daten** zeigen das angeforderte und angewendete Einzelziel oder den Bereich. Home Assistant erstellt außerdem eine dauerhafte Benachrichtigung für die aktive Grenze. Wiederholte Sensorupdates erzeugen keine Duplikate; Velair entfernt sie nach Wiederherstellung.

<a id="when-velair-does-nothing"></a>
## Wann Velair nicht eingreift

Room Assist benötigt einen gültigen positiven wirksamen Temperaturschritt. Zuerst verwendet Velair das veröffentlichte `target_temp_step`. Fehlt es, schützt der letzte gültige von der Entität gemeldete Schritt dasselbe Zielraster. Danach folgt der manuelle zonenbezogene Ersatzwert aus den Einstellungen, standardmäßig `1`, wenn kein anderer Wert existiert. Speichern bei fehlendem Attribut macht den ausdrücklichen Wert maßgeblich, indem die gemerkte Meldung gelöscht wird. Eine spätere gültige Meldung wird erneut gespeichert. Velair leitet keine Beziehung zu einer anderen Entität ab.

Room Assist wendet kein unterstütztes Ziel an, wenn:

- kein Raumsensor ausgewählt ist;
- die Raumsensorunterstützung deaktiviert ist;
- der Zeitplaner nicht automatisch läuft;
- das Klimagerät pausiert ist oder eine temporäre Anpassung hat;
- kein Temperaturblock aktiv ist;
- der aktive Block `Off` ist;
- Raumsensor oder Gerätetemperatur nicht verfügbar oder nichtnumerisch ist;
- die berechnete Änderung kleiner als der Temperaturschritt der Entität ist;
- der HVAC-Modus nicht als Heizen oder Kühlen interpretiert werden kann.

In diesen Fällen behält Velair das normale Zeitplanziel bei oder stellt es wieder her, sofern das sicher möglich ist.

<a id="external-adjustments-and-manual-adjustment"></a>
## Externe und manuelle Anpassungen

Mit der Standardrichtlinie **Automatisch beibehalten** behält Room Assist Vorrang. Velair berechnet sein aktuelles unterstütztes Ziel nach einer erkannten externen Sollwert- oder HVAC-Modusänderung neu und wendet es erneut an. Bei einer manuellen Richtlinie gibt Room Assist bewusst nach, wenn die Änderung das Gerät in **Manuelle Anpassung** versetzt. Velair erfasst den vollständigen externen Gerätezustand aus dem Home-Assistant-Zustandsereignis, beendet die aktive Korrektur ohne Wiederherstellen des Zeitplanziels und behält das externe Einzelziel oder den nativen `heat_cool`-Bereich. Dadurch kämpft Room Assist nicht sofort gegen eine Klimakarte, physische Fernbedienung oder andere Änderung außerhalb von Velair.

Beispiel:

```text
Scheduled cooling target: 24 °C
Room Assist temporary target: 26 °C
External adjustment: 23 °C
Result during Manual adjustment: 23 °C
```

Beim Fortsetzen automatischer Zeitplanung ermittelt Velair die dann gültige Zeitplan- oder Profilabsicht. Room Assist berechnet daraus anhand aktueller Sensorwerte eine neue Korrektur. Es holt weder die alte `26 °C`-Korrektur noch die frühere Festmodus-Hysteresephase zurück. Neuladen von Velair oder Home Assistant setzt diesen Laufzeitzustand ebenso zurück: Der aktuelle Block wird neu ermittelt und eine sichere neue Phase aus aktuellem Modus und Raumwert gewählt.

Eine geeignete externe Änderung behält entweder automatische Zuständigkeit oder beginnt beziehungsweise aktualisiert eine manuelle Anpassung gemäß der gespeicherten Geräterichtlinie. Richtlinien, Dienstbeispiele, Zusammenspiel temporärer Anpassungen und Profile und Grenzen der Zuordnung stehen unter [Externe Änderungen und manuelle Anpassungen](manual-control.de.md).

<a id="planned-return"></a>
## Geplante Rückkehr

Während [Geplanter Rückkehr](planned-return.de.md) folgt Room Assist dem vorübergehenden Ankunftsziel jeder Zone, sobald deren Vorbereitung startet. Es verwendet dann weder weiter die Abwesenheitstemperatur noch wechselt es bei Änderungen eines Abwesenheitsblocks dorthin zurück. Andere Zonen folgen weiter der Abwesenheit, bis ihre eigene Vorbereitung beginnt.

Ein Abwesenheitsziel von 16 Grad wird beispielsweise beim Vorbereitungsstart dieses Raums zu einem Ankunftsziel von 21 Grad. Room Assist kann den physischen Sollwert anpassen, um am Raumsensor 21 Grad zu erreichen. Manuelle Anpassung und ausdrückliche Pausen setzen den Eingriff in der betroffenen Zone aus. Eine ausdrückliche Modus-/Profilauswahl beendet die frühzeitige Episodenvorbereitung und behält diese Auswahl. **Abbrechen** entfernt ebenfalls die Vorbereitung; nach bestätigter Abreise werden zuvor aufgezeichneter Modus und Profile wiederhergestellt. Siehe [Abbruchbeispiele](planned-return.de.md#cancelling-a-return-examples).

<a id="adaptive-preconditioning"></a>
## Adaptive Vorkonditionierung

Startet die aktivierte adaptive Vorkonditionierung einen zukünftigen Block frühzeitig, folgt Room Assist diesem zukünftigen Ziel bis zur geplanten Komfortzeit.

Das ist wichtig, weil die aktuelle Uhrzeit noch zu einem älteren Block gehören kann. Velair behandelt den bereits gestarteten Vorkonditionierungsblock als aktives verwaltetes Ziel. Room Assist berechnet deshalb nicht gegen den vorherigen Block.

Bei aktivierter Raumsensorunterstützung verwendet die adaptive Vorkonditionierung denselben gewählten Raumsensor als wirksame Raumtemperatur für Entscheidungen und Lernen.

Optionale separate Heiz- und Kühlversätze werden in der Vorkonditionierung eingestellt. Room Assist berechnet seinen Basissollwert aus dem ursprünglichen Raumziel, anschließend wendet Velair den Vorbereitungszusatz an. Gerätegrenzen verringern den Zusatz; Bänder mit zwei Sollwerten behalten ihre Breite. Ein positiv konfigurierter Versatz hält die Vorbereitungsrichtung vorübergehend bis zur ursprünglichen Raumschwelle aktiv, auch bei wirksamem Zusatz null oder einer übernommenen nicht anfordernden Phase von Room Assist. Nach dieser Schwelle oder beim geplanten Start endet der Zusatz und normale Hysterese und Bremsung gelten wieder. Native `heat_cool`-Bereiche behalten ihre bestehenden Einschränkungen bei der Bremsunterstützung.

Room Assist bestätigt seine wirksame Heiz- oder Kühlanforderung zusammen mit dem angewendeten Sollwert. Während der Vorbereitung umfasst diese die vorübergehende Anforderung, während die normale Hysteresephase separat erhalten bleibt. Die gemeinsame Klimaversorgung folgt dieser wirksamen Anforderung über ihre bestehende Room-Assist-Anbindung; sie ergänzt weder einen weiteren Versatz noch eine Hysterese oder Vorbereitungsregel. Nach Ende des Zusatzes gilt wieder die normale Room-Assist-Anforderung. Ein fehlgeschlagener oder überholter Befehl bestätigt keine neue Anforderung; eine fehlgeschlagene Wiederherstellung darf die beendete Vorbereitung nicht unbegrenzt Versorgung anfordern lassen. Siehe [Gemeinsame Klimaversorgung](shared-climate-supply.de.md#room-assist).

Die Grafik trennt das nominale Ziel vom endgültigen Sollwert aus Room Assist plus Vorbereitung. Das Zusatzabzeichen schließt eine begrenzte `0` ein; **Technische Daten** trennen Basis, angeforderten und wirksamen Zusatz sowie endgültigen Befehl. Während der Vorbereitung bietet die Schwelle **Vorbereitung endet** eine Informationsschaltfläche zur konfigurierten Ankunftsmarge. Bei Ziel `21 °C` und Ankunftsmarge `0.1 °C` endet die Heizvorbereitung bei `20.9 °C`; das ist vom Room-Assist-Regelband getrennt. Heiz-, Kühl- und Grenzbeispiele stehen unter [Vorübergehender Sollwertversatz](adaptive-preconditioning.de.md#temporary-setpoint-offset).

<a id="automation-events"></a>
## Automationsereignisse

Aktualisierungsereignisse können außerdem ein Objekt `braking` mit konfigurierter und effektiver Stufe, aktiver Phase, effektiven Stopp- und Wiederanlauftemperaturen, Sollwertgrenze und gegebenenfalls Inaktivitätsgrund enthalten. Diese zusätzlichen Felder beschreiben die bestätigte Anforderungsregel, nicht den physischen HVAC-Betrieb. Ein Beispiel steht unter [Room Sensor Assist aktualisiert](automation-events.de.md#room-sensor-assist-updated).

Velair sendet das normale Home-Assistant-Ereignis `velair_event`.

Room Assist sendet:

- `room_sensor_assist_state_changed`: Room Assist wurde aktiviert oder deaktiviert.
- `room_sensor_assist_updated`: Velair hat ein vorübergehendes unterstütztes Klimaziel angewendet.
- `room_sensor_assist_restored`: Velair hat die vorübergehende Zielsteuerung beendet und, soweit möglich, das normale Zeitplanziel wiederhergestellt.

Vollständige Daten und alle Wiederherstellungsgründe stehen unter [Automationsereignisse](automation-events.de.md#room-sensor-assist-state-changed).

Beispiel-Ereignisdaten:

```yaml
event: room_sensor_assist_updated
entity_id: climate.living_room
room_temperature_entity_id: sensor.living_room_temperature
target_temperature: 21
applied_temperature: 20
room_temperature: 18
climate_temperature: 17.1
assist_delta: 3.3
applied_offset: 2.9
direction: heat
hvac_mode: heat
hysteresis_phase: towards_upper
hysteresis_target: 21.3
deadband_low: 20.7
deadband_high: 21.3
reason: current_schedule
```

Die vier Hysteresefelder sind optional. In Automationsereignissen erscheinen sie für einen festen Einzelwertzyklus `heat` oder `cool` mit Totband ungleich null. Bei alter Null-Totband-Korrektur, automatischen Einzelwertmodi und allen Bereichen fehlen sie. Feste Bereiche mit konfigurierter Referenz zeigen ihre Hysteresephase im Live-Laufzeitstatus; ihre Ereignisse behalten vollständige Grenzpaare und `range_shift`.

Ein Bereichsupdate verwendet vollständige geplante und angewendete Bänder statt Einzelzielfeldern:

```yaml
event: room_sensor_assist_updated
entity_id: climate.living_room
room_temperature_entity_id: sensor.living_room_temperature
target_temp_low: 19
target_temp_high: 24
applied_target_temp_low: 23
applied_target_temp_high: 28
room_temperature: 18
climate_temperature: 22
assist_delta: 1
range_shift: 4
direction: heat
hvac_mode: heat_cool
reason: current_schedule
```

Beispiel für einen Automationsauslöser:

```yaml
trigger:
  - platform: event
    event_type: velair_event
    event_data:
      event: room_sensor_assist_updated
      entity_id: climate.living_room
```

Room Assist lässt sich außerdem aus Automationen steuern mit:

- `velair.enable_room_sensor_assist`
- `velair.disable_room_sensor_assist`

<a id="lovelace"></a>
## Lovelace

Die Room-Assist-Ansicht ist als Lovelace-Karte verfügbar:

```yaml
type: custom:velair-card
view: sensors
entities:
  - climate.living_room
```

Panel und Karten verwenden dieselbe Livegrafik. Kompakte Chips **Raum**, **Ziel**, **Gerät** und **Sollwert** sind senkrecht mit ihren Temperaturpositionen verbunden. Zeige auf einen Chip, fokussiere oder drücke ihn für Details. **Normal** zeigt die aktuelle Anforderung und nächste Schwelle; **Detailliert** ergänzt die Differenz zwischen Raum und Ziel, die Gesamtanpassung und einen darin bereits enthaltenen Vorbereitungszusatz. Messbeschriftungen stehen bei genügend Platz auf ihren Linien, sonst darunter.

Ein durchgezogener Pfeil bedeutet angefordertes Heizen oder Kühlen. Ein gestrichelter Pfeil bedeutet Warten und zeigt zur Wiederaufnahmeschwelle. Diese Pfeile beschreiben die Room-Assist-Anforderung, keinen gemessenen Temperaturtrend und keinen Nachweis eines laufenden Ventils oder Kompressors. Fehlt eine bestätigte Anforderung, meldet die Grafik diese Unsicherheit, statt eine Anforderung oder einen Wartezustand zu erfinden.

Der schraffierte Streifen direkt über der Achse erhält das nominale Regelband und seine Legende. Ein wirksamer Bremsstopp wird separat markiert; der Streifen bedeutet nicht, dass die Anforderung darüber hinaus anhält. Der Sollwertchip kennzeichnet Bremsung nur, wenn ihre Schutzgrenze den angewendeten Befehl tatsächlich geändert hat. Bei nativen `heat_cool`-Bereichen zeigen getrennte Klammern die vollständigen Ziel- und angewendeten Bänder mit Schraffur an den äußeren Room-Assist-Rändern. Physische Grenzen sind beschriftet.

Die Grafik zeigt die Anforderung im Statusabzeichen, die Messwerte in den Temperaturchips und die Abschalt- oder Wiedereinschaltschwelle neben dem Pfeil. Verhindert ein fehlender Raumwert die Darstellung dieses Zusammenhangs, bleibt die Schwelle im Statusabzeichen sichtbar. **Erklärung** öffnet unter der Grafik einen kurzen Kontext: Unterschiede zwischen den Sensorwerten, das Weiterlaufen eines Zyklus nach Erreichen des Komfortziels oder den Einfluss von Vorbereitung, Bremsung oder Gerätegrenzen. Sie ergänzt die Darstellung, ohne angezeigte Temperaturen, Anforderung oder Hilfe zum Regelband zu wiederholen. Unter der Grafik gibt es keine zusätzliche wiederholte Zusammenfassung.

**Technische Daten** gruppieren Gerätesollwertstufen, Regelgrenzen sowie Quelle und Zeitangaben im selben Detailbereich. Messwerte bleiben in der Grafik, statt in einer zweiten Tabelle wiederholt zu werden. Aufeinanderfolgende Werte für Berechnung, Anforderung, Wert vor Schrittanpassung und Anwendung teilen sich bei Übereinstimmung eine Zeile; alle Stufen bleiben benannt. Unterschiedliche Werte werden getrennt gezeigt. Bereichsbefehle und Nachweise ihres einzelnen Referenzwerts bleiben getrennt. Abschalt- und Wiedereinschaltwerte werden nicht als nächste Schwelle oder identische nominale Grenze wiederholt; die Zyklusrichtung erscheint ohne erneute Temperaturangabe. Geräteschritt und relevante Schutz- oder physische Grenzen bleiben verfügbar. Der Vorbereitungszusatz hat eine eigene Gruppe, einschließlich angeforderter und angewendeter Werte bei Abweichung sowie einer begrenzten Null. Quelle und Zeitangaben zeigen die Sensorentität und den Blockstart mit Datum; fehlt dieser, dient die reine Uhrzeit als Ersatz. In schmalen Panels und Karten stehen die Gruppen untereinander. Es ist immer nur eine Detailansicht geöffnet; erneutes Wählen ihrer Schaltfläche oder Escape schließt sie. Die Schaltflächen unterstützen Tastatur und Touch. Details bleiben unter der Grafik, ohne andere Bedienelemente zu verdecken. Öffnen und Schließen ändern die Regelanforderung nicht. Die Grafik passt sich schmalen Spalten an, ohne die Temperaturskala zu ändern oder einen Messwert von seiner tatsächlichen Position zu verschieben.

Die Lovelace-Room-Assist-Karte kann einzelne Teile für eine kompakte Dashboardansicht ausblenden:

```yaml
type: custom:velair-card
view: sensors
entities:
  - climate.living_room
show_room_assist_switch: false
show_room_assist_sensor: false
show_room_assist_deadband: false
show_room_assist_max_delta: false
show_room_assist_debounce: false
show_room_assist_live_status: true
```

Weggelassene Optionen `show_room_assist_*` verwenden standardmäßig `true`.

<a id="technical-details"></a>
## Technische Details

Entwicklerinformationen zu Speicherfeldern, Laufzeitstatus, Zielberechnung, Wiederherstellung und Ereignissen stehen unter [Room-Assist-Interna](../developer/room-assist.md).
