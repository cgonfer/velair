<a id="block-presets-and-linked-templates"></a>
# Block-Presets und verknüpfte Vorlagen
<!-- velair-docs:start -->
Übersetzungen: [Englisches Original](linked-schedules.md) · [Español](linked-schedules.es.md) · [Français](linked-schedules.fr.md) · [Deutsch](linked-schedules.de.md) · [Italiano](linked-schedules.it.md) · [Nederlands](linked-schedules.nl.md) · [Polski](linked-schedules.pl.md) · [Português (Brasil)](linked-schedules.pt-br.md) · [Português (Portugal)](linked-schedules.pt-pt.md) · [Русский](linked-schedules.ru.md) · [Übersetzungsstatus](../translation-status.md)

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

Velair kann eine Klimakonfiguration über ein **Block-Preset** wiederverwenden und einen Tag mit einer Tagesvorlage verknüpfen. Wähle **Nur Zeiten**, um Zeiten mit unabhängigen Klimaeinstellungen zu teilen, oder **Zeiten und Einstellungen**, um der vollständigen Vorlage zu folgen. Standard und Profile unterstützen beide Möglichkeiten. Vorlagenblöcke dürfen manuelle Einstellungen oder Velair-Presets verwenden.

Beginne mit [Praktischen Beispielen](linked-schedule-examples.de.md) für gemeinsame Heizung, saisonale Profile, unabhängige Kopien, Umwandlung von Verknüpfungen und inkompatible Änderungen.

<a id="block-presets"></a>
## Block-Presets

Ein Velair-Block-Preset hat einen Namen und dieselbe Klimakonfiguration wie ein Zeitplanblock, jedoch ohne Startzeit. Es kann eine Temperatur oder einen nativen Bereich mit unterstützten Optionen setzen, nur einen HVAC-Modus wählen, nur Klimaoptionen anwenden oder ausschalten. Ein Velair-Preset unterscheidet sich vom Geräteparameter `preset_mode`, der eine seiner konfigurierten Optionen sein kann.

Presets gehören zu einer gemeinsamen Bibliothek. Jedes Ziel wird anhand seines Thermostats und gegebenenfalls seines externen Zeitplanreglers geprüft. Eine weggelassene Option wird nicht gesendet; das Weglassen einer Lüftereinstellung setzt den Thermostatlüfter nicht zurück.

Verwalte die Bibliothek unter **Vorlagen → Klima-Presets**. Die Bibliotheksauswahl erklärt Tagesvorlagen und gemeinsame Klimapresets. Erstelle ein Preset mit der Hinzufügen-Schaltfläche in der Listenüberschrift. Eine leere Bibliothek behält dieselbe Listen- und Detailstruktur. Wähle ein vorhandenes Preset, um es anzusehen. Ungespeicherte Änderungen werden erst angezeigt, nachdem du Name oder Klimaeinstellungen geändert hast. Die optionale Kompatibilitätsprüfung markiert das Preset nicht als bearbeitet. Verwendungen erscheinen als schreibgeschützte Information. Der Editor verlangt kein Thermostat: Wähle Heiz- oder Kühleinstellungen, Einzeltemperatur oder Bereich sowie optionale Geräteeinstellungen. Eine optionale Thermostatprüfung zeigt die Kompatibilität, ohne gemeinsame Werte zu verändern. Jede tatsächliche Verwendung wird vor dem Speichern vom Backend geprüft.

Speichere ein Preset mit dem Symbol neben seinem Namen. Bearbeiten behält seine Bibliotheksposition bei, auch nach Neuladen; neue Presets werden angehängt. Temperaturfelder akzeptieren Dezimalpunkt oder Komma, etwa `21.5` oder `21,5`, auch für beide Grenzen eines nativen Bereichs. Der Editor bewahrt die Eingabe beim Tippen und sendet numerische Werte für Vorschau und Speichern. Die optionale Kompatibilitätsprüfung zeigt wirksame Einstellungen für ein gewähltes Thermostat mit separatem Erfolgs- oder Fehlerergebnis. Sie speichert das Preset nicht und verändert seinen ungespeicherten Status nicht.

Preset-Verweise in Vorlagen erscheinen getrennt von direkten Verweisen in Standard und Profilen. Verwendungs-Chips zählen direkte Verweise, auch in Vorlagen ohne verknüpfte Tage. Thermostate, die ein Preset über eine vollständige Vorlage übernehmen, erscheinen als zusätzliche betroffene Ziele, ohne denselben Vorlagenverweis erneut zu zählen. Geräteverwendungen sind nach Thermostat gruppiert, mit separater Zeile für Standard und jedes Profil.

Die Liste zeigt neben jeder Verwendungsanzahl ein Verknüpfungssymbol. Bewege den Mauszeiger über die deaktivierte Löschschaltfläche, um zu erfahren, warum ein verwendetes Preset nicht gelöscht werden kann; löse zuerst seine Blockverknüpfungen. Der Verwendungs-Chip jedes Presets hat eine eigene letzte Zeile unter seiner Konfigurationszusammenfassung.

Wähle in einem Zeitplanblock ein Preset, um einen dynamischen Verweis darauf zu behalten. Bearbeiten des Presets aktualisiert jeden Verweis. Der Block kann nicht zusätzlich lokale Klimaeinstellungen enthalten. Das Lösen der Preset-Verknüpfung behält dessen wirksame Konfiguration als manuelle Einstellungen bei und beendet zukünftige Preset-Aktualisierungen für diesen Block.

Öffne **Zusätzliche Einstellungen** eines Blocks und wähle ein **Velair-Preset**. Dies ist getrennt vom **Geräte-Preset**, der nativen Thermostatoption `preset_mode`. Der Block behält seine normalen Spalten für Zeit, Modus, Ziel, Einstellungen und Löschen. Verknüpfte Klimaeinstellungen erscheinen in den üblichen Bedienelementen und sind schreibgeschützt. Die Zeit bleibt bearbeitbar, sofern nicht auch die Tageszeiten verknüpft sind.

Eine Zeile unter dem Block nennt das verknüpfte Preset und seine zusätzlichen Einstellungen. Die Einstellungsanzahl zählt eins für die Velair-Preset-Verknüpfung plus jede konfigurierte Geräteoption, ohne Zeit, HVAC-Modus und Temperaturziel. Werte und Kompatibilitätsanpassungen kommen vom Backend. Laufende oder fehlgeschlagene Vorschauen ersetzen den gespeicherten Verweis nicht durch manuelle Einstellungen. Beim Verschieben der Startzeit bleiben die aufgelösten Preset-Einstellungen sichtbar; eine Zeitänderung benötigt keine weitere Preset-Vorschau.

Wähle in den zusätzlichen Einstellungen ein anderes Velair-Preset oder **Kein Velair-Preset**, um die Verknüpfung zu lösen und wirksame Einstellungen zur manuellen Bearbeitung zu behalten. Gemeinsame Presets verwaltest und bearbeitest du unter **Vorlagen → Klima-Presets**. Geräteoptionen bleiben während der Verknüpfung schreibgeschützt. Die Löschschaltfläche bleibt an ihrer normalen Position und deaktiviert, wenn der Block zu verknüpften Vorlagenzeiten gehört.

Das Panel zeigt zuerst die Konfigurationsauswahl, danach Geräteoptionen und am Ende eine Zusammenfassung **Was dieser Block sendet**. Sie umfasst manuelle Blöcke und aufgelöste Velair-Presets einschließlich Temperaturbereiche, reine Modusaktionen, reine Optionsaktionen und Ausschalten. Sie erscheint auch ohne zusätzliche Geräteoptionen. Ist eine Preset-Vorschau ausstehend oder nicht verfügbar, zeigt die Zusammenfassung diesen Zustand, statt Befehle zu erraten.

<a id="linked-templates"></a>
## Verknüpfte Vorlagen

<a id="apply-a-template-to-schedules"></a>
### Eine Vorlage auf Zeitpläne anwenden

Öffne **Anwenden auf…** bei einer gespeicherten Tagesvorlage. Das Panel führt durch **Auswählen → Prüfen → Anwenden**. Speichere ausstehende Vorlagenänderungen zuerst; beim Anwenden wird weder stillschweigend die gemeinsame Vorlage gespeichert noch eine ungespeicherte Version verwendet.

Wähle **Standard** oder ein vorhandenes Profil und dann **Unabhängige Kopie**, **Nur Zeiten** oder **Zeiten und Einstellungen**. Eine unabhängige Kopie hat keine Vorlagenverknüpfung; Velair-Preset-Verweise bleiben wirksam. Reine Zeitverknüpfungen behalten unabhängige Klimazuordnungen. Vollständige Verknüpfungen folgen Zeiten und Einstellungen der Vorlage.

Wähle eine gemeinsame **Tagesaufteilung** und markiere die erforderlichen Gruppen je Thermostat: Einzelne Tage bietet sieben Optionen, Wochentage / Wochenende zwei Gruppen und Alle Tage die gesamte Woche. Beim Wechsel der Aufteilung wird die Auswahl gelöscht. Ein Wechsel des Ziels oder Anwendungstyps behält die Gruppen bei, erfordert aber eine neue Prüfung. Wähle einen Tageskopf, um die ganze Spalte für alle sichtbaren Thermostate auszuwählen; eine vollständig gewählte Spalte wird beim erneuten Wählen geleert. Auf Mobilgeräten scrollt die Tabelle horizontal, während die Thermostatnamen sichtbar bleiben.

Nur Thermostate mit ausgewählten Gruppen übernehmen die Aufteilung. Nicht gewählte Tage behalten Blöcke und Verknüpfungen. Fasst die neue Aufteilung nicht gewählte Tage mit unterschiedlichen Konfigurationen zusammen, warnt die Prüfung, dass **Unterschiedliche Zeitpläne** erhalten bleiben. Die Annahme gleicht sie nicht an.

Wähle bei **Nur Zeiten** eine Grundlage, wenn eine Zielgruppe unterschiedliche gespeicherte Konfigurationen hat. Diese Auswahl bleibt bis zum Anwenden temporär. Velair schlägt Klimazuordnungen aus dieser Grundlage vor: zuerst die genaue Uhrzeit, dann vorherige Zeiten von der nächsten zur entferntesten und schließlich spätere Zeiten. Presets bleiben Verweise. Die Prüfung kennzeichnet die Herkunft jedes Vorschlags und erlaubt Einstellungsänderungen bei festen Vorlagenzeiten. Fehlende kompatible Zuordnungen müssen ergänzt werden; Vorlageneinstellungen werden nicht stillschweigend als Ersatz verwendet. Alle gewählten Tage der Gruppe erhalten dieselben geprüften Zuordnungen. Eine Profilzone ohne eigenen Zeitplan benötigt manuelle Zuordnungen und übernimmt keine Standardeinstellungen.

Die Prüfung nennt ersetzte Tage und Verknüpfungen, Aufteilungsänderungen, Kompatibilitätsprobleme und Profilzonen, die zu **Profilzeitplan** wechseln. Zurück führt ohne Speichern zur Auswahl. Anwenden prüft und speichert die gesamte Auswahl einmalig; ein ungültiges Ziel oder Versionskonflikt wendet andere Zonen nicht teilweise an. Bei einem Speicherfehler bleibt die vorherige Konfiguration erhalten. Prüfe nach Änderungen der Quelle oder Konfiguration erneut. Beim Schließen mit ungespeicherten Prüfungsänderungen gilt der normale Verwerfschutz.

Das Anwenden auf ein Profil speichert dessen gewählte Zeitpläne direkt. Es aktiviert weder das Profil noch einen Modus und ändert nicht die Basis-/Ausnahmeselektion. Änderungen an bereits wirksamen Zeitplänen können die Klimasteuerung beeinflussen. Für externe Veröffentlichung und physische Gerätereaktionen gelten weiterhin die normalen Übertragungsgrenzen; konsistent gespeicherte Konfiguration ist keine gleichzeitige physische Reaktion.

Vorlagenverknüpfungen sind schreibgeschützt und erst nach Thermostat, dann nach Standard oder Profil gruppiert; verknüpfte Wochentage werden gemeinsam aufgeführt. **Verknüpfte Tage** zählt einen verknüpften Tag unabhängig von der Blockanzahl der Vorlage. Die Liste zeigt diese Tagesanzahl in einer separaten letzten Zeile unter der Blockanzahl jeder Vorlage. Unabhängige Kopien werden nicht gezählt und erscheinen nicht in der Liste. Löse vor dem Löschen einer Vorlage alle Tagesverknüpfungen; die deaktivierte Löschschaltfläche erklärt diese Voraussetzung.

Standard- und Profilzeitpläne können jeden Thermostat-Wochentag mit einer Tagesvorlage verknüpfen. Bei **Nur Zeiten** konfigurierst du die Klimaaktion jedes Zeitpunkts am Ziel. Einstellungen können manuell sein oder ein Block-Preset verwenden. Unterschiedliche Ziele dürfen zur selben gemeinsamen Uhrzeit unterschiedliche Aktionen verwenden.

Bei **Zeiten und Einstellungen** liefert die Vorlage Zeiten und Klimaeinstellungen. Ihre Blöcke können manuelle Einstellungen oder dynamische Preset-Verweise enthalten. Jedes Zielbedienelement ist schreibgeschützt und zeigt seine wirksamen Werte. Bearbeite die Vorlage oder löse die Tagesverknüpfung, um sie zu ändern. Es gibt keine Übersteuerungen je Block. Änderungen an Vorlageneinstellungen wirken auf vollständige Verknüpfungen, während reine Zeitverknüpfungen ihre eigenen Klimaeinstellungen behalten.

Eine Arbeitstagsvorlage beginnt beispielsweise um 07:00 und 23:00. Standard kann sein gewohntes Komfort-Preset zuweisen, ein Winterprofil Heiz-Presets und ein Sommerprofil Kühlen und Ausschalten. Das Verschieben von 07:00 auf 07:30 aktualisiert alle drei, ohne ihre Konfigurationen auszutauschen.

Verknüpfte Zeiten werden in der Vorlage bearbeitet, nicht durch Ziehen am Zeitverlauf eines Ziels. Ändern von Vorlagentemperaturen oder -modi verändert reine Zeitverknüpfungen nicht. Eine Woche darf unabhängige Tage und beide Verknüpfungstypen mischen.

Die Auswahl **Zeitplanquelle** wählt einen unabhängigen Zeitplan oder eine Vorlage. Bei einer Vorlage wählst du **Nur Zeiten** oder **Zeiten und Einstellungen**. Das Infosymbol erklärt die Möglichkeiten. Beim Wechsel von reiner Zeitverknüpfung zu vollständiger Verknüpfung wird vor dem Ersetzen der Klima-Zuordnungen des Tages nachgefragt. Der umgekehrte Wechsel behält aktuelle Vorlageneinstellungen einschließlich Preset-Verweisen als unabhängige Zuordnungen. **Verknüpfung lösen** behält aktuelle Entwurfszeiten und Konfigurationen einschließlich Presets. Manuelle Einstellungen werden zu den wirksamen, vom Backend an dieses Thermostat angepassten Werten: Ein gemeinsames Ziel von 18.3 °C wird beispielsweise auf einem Gerät mit 0.5-°C-Schritten zu 18.5 °C. Preset-Verweise bleiben dynamisch und gemeinsame Definitionen unverändert. Fahre über ein gesperrtes Bedienelement, tippe darauf oder fokussiere es, um zu sehen, wie die gemeinsame Konfiguration bearbeitet wird. Standard und Profile verwenden dieselben Hilfebedienelemente.

Ein Wechsel der Zeitplanquelle fragt vor dem Ersetzen des Tagesentwurfs nach, auch bei unvollständigen Einstellungen. Einstellungen an genau passenden Zeiten bleiben erhalten; neue Zeiten benötigen eigene Zuordnungen. Abbrechen behält bisherige Auswahl und Entwurf. Änderungen gelten erst nach dem Speichern.

**Eigener Zeitplan** fragt vor dem Verwerfen der Tagesänderungen nach und stellt den gespeicherten Zeitplan derselben Quelle wieder her: Standard oder das ausgewählte Profil. Hat der gespeicherte Tag verknüpfte Zeiten, werden diese gespeicherten Zeiten und Zuordnungen zum unabhängigen Entwurf; Preset-Verweise bleiben erhalten. Dabei wird kein historischer manueller Zeitplan wiederhergestellt. Andere Wochentage bleiben erhalten.

**Verknüpfung lösen** unterscheidet sich davon: Es behält Zeiten und Einstellungen des aktuellen Entwurfs einschließlich Änderungen seit dem letzten Speichern.

<a id="copy-or-link"></a>
## Kopieren oder verknüpfen

- **Blöcke kopieren** kopiert Zeiten und Klimaeinstellungen einer Vorlage, behält Preset-Verweise und passt manuelle Einstellungen ans Ziel an. Das Ergebnis folgt der Vorlage nicht.
- **Zeiten verknüpfen** hält Zeiten mit der Vorlage verbunden und verwendet separate Klimaeinstellungen je Ziel.
- **Vollständige Konfiguration verknüpfen** folgt Zeiten und Klimaeinstellungen der Vorlage einschließlich dynamischer Presets, ohne lokale Übersteuerungen.
- Das Klonen eines Zeitplantags kopiert seine Konfiguration einschließlich Vorlagen-Verknüpfungstyp, Zuordnungen reiner Zeitverknüpfungen und Preset-Verweise. Eine verknüpfte Quelle erzeugt einen weiteren verknüpften Tag; eine unabhängige Quelle einen weiteren unabhängigen Tag. Verknüpfungen an nicht zum Klonen ausgewählten Zieltagen bleiben erhalten.
- Das Speichern eines Tages als Vorlage behält wirksame manuelle Einstellungen und Preset-Verweise. Es verändert weder ursprüngliche Vorlage noch gemeinsame Presets.
- Das Leeren eines Tages entfernt lokale Blöcke und die Vorlagenverknüpfung, ohne Vorlage oder andere Ziele zu verändern.

Klonen auf ein anderes Thermostat prüft die kopierte Konfiguration anhand dieses Ziels. Inkompatible gemeinsame Einstellungen lehnen das Klonen ab, statt die Verknüpfung zu entfernen oder manuelle Einstellungen einzusetzen. Die bestehende Anpassung je Geräteschritt und optionaler Einstellungen gilt weiterhin. In Standard werden gewählte Ziele gemeinsam gespeichert; scheitert ein Ziel, bleiben alle Klonziele unverändert. Ausstehende Änderungen des Quelltags werden zuerst gespeichert, wie bei anderen Standard-Klonaktionen. Klonen in Profilen verändert den Entwurf und prüft das vorgeschlagene Profil; Speichern übernimmt weiterhin das ganze Profil.

Um aus einem verknüpften Tag einen unabhängigen zu machen, löse nach dem Klonen seine **Verknüpfung** und speichere. **Blöcke kopieren** aus der Vorlagenbibliothek bleibt eine unabhängige Kopie.

<a id="shared-edits"></a>
## Gemeinsame Änderungen

Bearbeiten einer Vorlage behält ihre Bibliotheksposition bei, auch nach Neuladen.

Das Hinzufügen eines Vorlagenzeitpunkts schlägt für jeden nur zeitlich verknüpften Tag eine Konfiguration vor, einschließlich inaktiver Profile und durch ein aktives Profil verdeckter Standardzeitpläne. Velair versucht zuerst die Klimaeinstellungen des neuen Zeitpunkts. Sind sie inkompatibel, versucht es zuvor gespeicherte Blöcke dieses Ziels: eine genaue Zeitübereinstimmung, frühere Blöcke vom nächsten zum entferntesten und danach spätere Blöcke in derselben Reihenfolge. Die erste kompatible Konfiguration wird kopiert. Der Velair-Preset-Verweis einer Quellzuordnung bleibt mit diesem Preset verknüpft.

Quellzuordnungen stammen aus demselben Ziel und Wochentag und verwenden Zeiten vor der Änderung. Ein verschobener oder entfernter Block kann seine gespeicherten Einstellungen noch bereitstellen; ein anderer neu hinzugefügter Block nicht. Kopierte Einstellungen sind unabhängig von den Klimaeinstellungen der Vorlage: Nur die Zeiten bleiben verknüpft. Verwendet der neue Vorlagenzeitpunkt ein Preset, behält ein kompatibler Vorschlag diesen Preset-Verweis.

Vollständige Verknüpfungen erhalten den neuen Vorlagenzeitpunkt unverändert, ohne Suche nach einer Quellzuordnung. Sind dessen Einstellungen mit einem vollständigen Ziel inkompatibel, wird das gesamte Speichern abgelehnt. Das umfasst inaktive Profile und verdeckte Standardzeitpläne.

Prüfe die Vorschläge unter **Verknüpfte Tage**, gruppiert nach Thermostat und Standard oder Profil, mit angegebenem Verknüpfungstyp. Vollständige Verknüpfungen zeigen wirksame Einstellungen und Fehler ohne Zuordnungseditor. Ersatzzuordnungen nennen ihre Quelle. Gibt es keine kompatible Konfiguration, vervollständige den neuen Zeitpunkt dort mit manuellen Einstellungen oder einem Velair-Preset. Auch Fehler des gesamten Zeitplans, etwa Zeitraster oder Änderungsgrenze eines externen Reglers, müssen vor dem Speichern behoben werden.

Die normale Vorlagen-Speicherschaltfläche übernimmt Vorlage und alle Zuordnungen gemeinsam, ohne zusätzliches Bestätigungspanel. Unvollständige oder inkompatible Änderungen bleiben Entwürfe; gespeicherte Zeitpläne laufen weiter. Das Verschieben eines vorhandenen Zeitpunkts behält seine Zieleinstellungen, und das Entfernen löscht dessen Zuordnungen beim selben Speichern.

Velair verhindert das Löschen verwendeter Presets und Vorlagen. Auch ein Preset in einer nicht verwendeten Vorlage ist noch in Verwendung. Ersetze oder löse zuerst seine Verwendungen. Bei konkurrierenden Änderungen muss die Konfiguration neu geladen werden; verknüpfte Ziele dürfen nicht teilweise aktualisiert werden.

Änderungen eines aktiven automatischen Ziels gelten nach dem Speichern. Pause, manuelle Anpassung und temporäre Anpassung behalten Vorrang. Eine durch einen eigenen Profilzeitplan verdeckte Standardänderung ersetzt dieses Profil nicht; die Rückkehr zu Standard verwendet die neueste Standardkonfiguration. Externe Regler erhalten aufgelöste Wochenpläne, keine Verweise. Fehler aktivieren keine lokale Ausführung.

<a id="seasonal-automations"></a>
## Saisonale Automationen

Mit [`velair.update_block_preset`](preset-automations.de.md) aktualisierst du ein gemeinsames Preset aus einer Automation. Teilaktualisierungen behalten andere Felder bei; ausdrückliches Ersetzen kann die Aktion ändern. Änderungen sind dauerhaft, wirken auf jeden Verweis und unterliegen normaler Validierung und Laufzeitpriorität. Die Anleitung enthält Beispiele für Außentemperatur, native Bereiche, Geräteoptionen und Ausschalten/Wiederherstellen.

Home Assistant entscheidet weiterhin, wann ein Profil oder Modus ausgewählt wird. Wiederverwendete Vorlagenzeiten und Presets vermeiden doppelte Konfiguration, ergänzen aber keine Außentemperaturregeln oder regelmäßigen Abfragen in Velair. Fensterlogik sollte unabhängig zugeordnete Zonenpausen verwenden. Ein Preset ergänzt weder ein Rückkehrdatum mit Vorbereitung noch verlängert es automatisch einen geplanten Kühlzeitraum.

<a id="backups-and-compatibility"></a>
## Sicherungen und Kompatibilität

Das portable Modell 16 behält Presets, Vorlagen-Zeitpunktkennungen und beide Verknüpfungstypen bei. Exporte enthalten erforderliche Vorlagen und deren Presets. Importe werden anhand der vollständigen resultierenden Konfiguration geprüft; bestehende Sicherungen ohne Verknüpfungen bleiben nutzbar. Bestehende Verknüpfungen ohne Typ bleiben reine Zeitverknüpfungen. Vorhandene Zeitpläne werden bei einem Upgrade nicht automatisch verknüpft.

Temperaturen behalten die angegebene Velair-Temperatureinheit und nehmen am bestehenden Einheitenmigrationsverfahren teil. Ein gemeinsames Preset wird je Ziel angepasst, ohne seinen Wert passend zur Schrittweite eines einzelnen Thermostats umzuschreiben.

Zeitplan-Zeitverläufe zeigen die wirksame Temperatur oder den Bereich aus dem Backend. Ein Verknüpfungssymbol markiert ein Velair-Preset; ein Kopiersymbol neben der Zeit markiert mit einer Vorlage verknüpfte Zeiten. Der native Block-Tooltip enthält Aktion, Modus, Geräteoptionen und Namen gemeinsamer Ressourcen. Ausstehende oder nicht verfügbare Preset-Einstellungen werden ausdrücklich angezeigt. Übernommene Blöcke beschreiben Konfiguration und Ressourcen ihres Quelltags.

Sehr kurze Intervalle geben Zeit und Ziel Vorrang vor Herkunftssymbolen und zusätzlichen Einstellungen. Ihre Details enthalten trotzdem vollständige Werte und Ressourcennamen, ohne die Intervalldauer zu verändern.
