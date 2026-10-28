<a id="room-groups"></a>
# Raumgruppen
<!-- velair-docs:start -->
Übersetzungen: [Englisches Original](room-groups.md) · [Español](room-groups.es.md) · [Français](room-groups.fr.md) · [Deutsch](room-groups.de.md) · [Italiano](room-groups.it.md) · [Nederlands](room-groups.nl.md) · [Polski](room-groups.pl.md) · [Português (Brasil)](room-groups.pt-br.md) · [Português (Portugal)](room-groups.pt-pt.md) · [Русский](room-groups.ru.md) · [Übersetzungsstatus](../translation-status.md)

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

Eine Raumgruppe gibt mehreren verwalteten `climate`-Entitäten einen gemeinsamen Zeitplan, eine Profilzuordnung, Verstärkung, Pause und ein Modell für adaptive Vorkonditionierung. Verwende sie für Geräte im selben physischen Raum. Unterschiedliche Räume sollten unabhängig bleiben, auch wenn sie dieselbe Tagesvorlage oder Wärme-/Kälteversorgung nutzen.

<a id="what-a-group-shares"></a>
## Was eine Gruppe gemeinsam nutzt

| Gemeinsam für die Raumgruppe | Unabhängig je physischem Klimagerät |
| --- | --- |
| Zeitplan, Modus-/Profilzuordnungen und Steuerungseinstellungen | Gemeldete Temperatur, Luftfeuchtigkeit, HVAC-Aktion und Verfügbarkeit |
| Verstärkungen, Zonenpausen und manuelle Anpassung | Behaglichkeitssensoren, Grenzwerte und Überwachungsschalter |
| Eine Startentscheidung und ein thermisches Lernmodell für die Vorkonditionierung | Gerätebeobachtungen und Übermittlungsnachweise in der Diagnose |
| Room-Assist-Einstellungen und Korrektur | Die geräteeigene interne Temperaturregelung |

Die Gruppe ist eine Steuereinheit innerhalb von Velair, keine neue Home-Assistant-Entität vom Typ `climate` oder `group`. Velair erzeugt eine stabile interne Kennung wie `group.0123456789abcdef0123456789abcdef`; Umbenennen ändert sie nicht. Sie kann in Diagnose, Exporten oder technischen Einstellungen erscheinen, aber nicht in der Entitätsregistrierung oder den Zuständen der Entwicklerwerkzeuge von Home Assistant. Verwende sie nicht als Ziel eines Home-Assistant-Dienstes `climate.*`. Velair löst die Gruppe in ihre tatsächlichen Befehlsempfänger auf.

<a id="create-a-group"></a>
## Gruppe erstellen

1. Öffne den Tab **Raumgruppen** und verwende die Schaltfläche zum Hinzufügen.
2. Gib einen Namen ein und wähle über **Klimageräte hinzufügen** mindestens zwei verwaltete Geräte dieses Raums. Suche nach Name oder Entitäts-ID und bestätige die Auswahl. Bereits einer anderen Gruppe zugeordnete Geräte sind nicht verfügbar; ihre Gruppe wird angezeigt.
3. Wähle ein Mitglied, dessen gemeldete Raumtemperatur die eigene Temperatur der Gruppe repräsentiert. Diese Referenz macht das Gerät nicht zum Besitzer der Gruppe. Einen optionalen externen Temperatursensor richtest du wie bei einem unabhängigen Gerät unter **Room Assist** ein.
4. Entscheide, ob Velair Befehle an alle Mitglieder oder nur an ein Mitglied sendet, dessen Anlage sie bereits an die anderen Geräte weitergibt.
5. Wähle unter **Konfiguration übernehmen von** die bestehende Mitgliedskonfiguration. Exportiere vorher deine Konfiguration, wenn du eine Sicherung benötigst; schließe **Vorkonditionierungslernen** ein, um auch die Kalibrierung zu sichern.
6. Die Speicherschaltfläche im Kopf öffnet **Gruppenänderungen prüfen**. Noch wurde nichts angewendet. Lies die Unterschiede und den Hinweis zum Lernneustart. Wähle **Bestätigen und speichern** oder **Zurück zur Bearbeitung**. Validierungs- und Speicherfehler bleiben in diesem Ablauf sichtbar, damit du den Entwurf korrigieren und erneut versuchen kannst.

<a id="configuration-fields"></a>
### Konfigurationsfelder

| Feld | Bedeutung |
| --- | --- |
| Gruppenname | Erforderlicher Anzeigename, der unter den Gruppen eindeutig sein muss. |
| Mitglieder | Verwaltete Klimageräte in diesem Raum. Ihre Reihenfolge bestimmt die individuelle Darstellung in der Übersicht. Ein Gerät kann nicht zwei Gruppen angehören. |
| Temperaturreferenz | Die gemeldete Temperatur eines Mitglieds repräsentiert den Raum in Velair. Dieses Mitglied erhält dadurch keinen Vorrang. |
| Befehlsübermittlung | Standardmäßig **Alle Mitglieder**, oder **Ausgewähltes Mitglied**, wenn die Anlage Befehle bereits weitergibt. |
| Befehlsempfänger | Nur bei **Ausgewähltes Mitglied** sichtbar; das Mitglied, das Velairs Befehle erhält. |
| Konfiguration übernehmen von | Nur beim Erstellen: Zeitplan, Profilkonfiguration und Steuerungseinstellungen dieses Mitglieds werden zum gemeinsamen Ausgangspunkt. |

Temperaturreferenz, Befehlsempfänger und ursprüngliche Konfigurationsquelle dürfen drei unterschiedliche Mitglieder sein.

<a id="send-commands-to-all-members-or-one-recipient"></a>
### Befehle an alle Mitglieder oder einen Empfänger senden

**Alle Mitglieder** ist der Standard: Velair sendet Befehle an jedes Mitglied. **Ausgewähltes Mitglied** sendet nur an den darunter gewählten **Befehlsempfänger**. Verwende dies nur, wenn die Anlage diese Befehle bereits an die anderen Geräte weitergibt; Velair übernimmt diese zusätzliche Weitergabe nicht.

Beispielsweise enthält ein Raum drei Heizkörperventile und einen Raumregler, der ebenfalls als `climate`-Entität erscheint. Gibt die Anlage Reglerbefehle an die Ventile weiter, nimm alle vier Mitglieder auf, wähle den Regler als Temperaturreferenz sowie unter **Ausgewähltes Mitglied** als Empfänger. Alle vier bleiben sichtbar, mit einem Zeitplan und einer Vorkonditionierungsentscheidung. Benötigt jedes Gerät einen direkten Befehl, verwende **Alle Mitglieder**.

Diese Optionen bestimmen die Empfänger; sie erzeugen keine unabhängigen Zeitpläne oder Lernmodelle.

<a id="adopt-an-existing-configuration"></a>
### Bestehende Konfiguration übernehmen

Die Übernahme erstellt eine gemeinsame Velair-Konfiguration aus Zeitplänen, Profilen und Steuerungseinstellungen des gewählten Mitglieds. Sie ersetzt die unabhängige Steuerungskonfiguration der Mitglieder, hält keine getrennten synchronisierten Kopien vor und kopiert keine Firmware-Einstellungen. Jedes physische Gerät behält seine eigenen Behaglichkeitseinstellungen, Sensoren und Grenzwerte. Bestehende Lernverläufe werden nicht zusammengeführt. Referenz, Empfänger und Konfigurationsquelle dürfen unterschiedlich sein.

Velair validiert die gesamte Gruppe vor dem Speichern. Ein Gerät darf nur einer Gruppe angehören. Nicht unterstützte Kombinationen müssen vorher aufgelöst werden; Gruppieren erweitert keine HVAC-Fähigkeiten. Externe Zeitplanausführung und Velair können nicht gleichzeitig ein gruppiertes Mitglied steuern. Befehlsempfänger benötigen gemeinsame unterstützte Modi, überlappende Temperaturgrenzen und ein kompatibles Temperaturschrittraster. Unterscheiden sich ihre aktiven HVAC-Modi, wähle einen expliziten Modus statt der Beibehaltung eines gemeinsamen Modus.

<a id="shared-control-and-individual-observations"></a>
## Gemeinsame Steuerung und individuelle Beobachtungen

Zeitpläne, Profile und andere Raumsteuerungs-Auswahlen zeigen die Gruppe statt ihrer Mitglieder. Bearbeite die bestehenden Zeitplan- und Funktionsregler wie gewohnt. Die Gruppe speichert eine Konfiguration statt getrennter synchronisierter Kopien.

Behaglichkeit bleibt individuell: Panel und Karten zeigen jedes physische Gerät mit eigenen Messwerten, Sensoren, Grenzwerten und Überwachungsschalter. Ein externer Room-Assist-Sensor ersetzt diese Werte nur, wenn du ihn ausdrücklich in den Behaglichkeitseinstellungen eines Mitglieds auswählst. Erstellen, Bearbeiten und Auflösen erhalten die jeweilige Konfiguration. Bei Gruppen aus der Zeit vor der unabhängigen Speicherung wird jedes Mitglied mit einer Kopie der zuvor gespeicherten Gruppen-Behaglichkeitseinstellungen initialisiert. Danach sind sie unabhängig änderbar; frühere individuelle Einstellungen lassen sich nicht automatisch wiederherstellen.

Die **Übersicht** zeigt weiterhin jedes physische Gerät. Die Gruppe kennzeichnet den gemeinsamen Zeitplan und die Steuerungszuständigkeit; Temperatur, Verfügbarkeit und Gerätezustand bleiben individuell. Eine Steuerungsaktion an einem Mitglied gilt für den Raum und erzeugt keinen konkurrierenden Einzelzeitplan.

**Nächste Ereignisse** zeigt jedes Gerät mit der Gruppe unter dem Namen, passend zu den Einzelzeilen im **Heutigen Zeitplan**. Mitglieder zeigen dasselbe maßgebliche Gruppenereignis; Velair erzeugt dafür keine getrennten Backend-Ereignisse oder Zeitpläne. Wähle einen Gerätenamen, um den gemeinsamen Zeitplan am Wochentag des Ereignisses zu öffnen, einschließlich eines eigenen Profilzeitplans als Ereignisquelle. Die geplante Rückkehr verwendet die Programmierung des Zielmodus. Das funktioniert auch über eine Dashboard-Karte für nächste Ereignisse. Ein Filter auf ein Mitglied zeigt nur dieses, ein Gruppenfilter alle Mitglieder.

Wähle die Gruppe in der Liste, um sie im angrenzenden Detailpanel zu bearbeiten, wie bei Vorlagen und Versorgungssteuerung. Die Zusammenfassung nennt Mitglieder, Temperaturquelle, Empfänger sowie Steuerungs- und Vorbereitungsstatus. Die Kopfaktion prüft und speichert Änderungen. Entfernen erfolgt mit Bestätigung über die Gruppenliste. Feldhilfen erklären die Auswahlmöglichkeiten; fehlende Pflichtangaben werden bei der Prüfung benannt. Während der Bearbeitung beschreibt die Statuszusammenfassung weiterhin die gespeicherte Gruppe bis zum geprüften Speichern.

Die Diagnose trennt gerätebezogene Nachweise von der gemeinsamen Raumabsicht. Erfolgreiche Home-Assistant-Dienstaufrufe beweisen weder Ventilbewegung noch Wärmefluss. Beim Senden an ein ausgewähltes Mitglied behauptet Velair nicht, auch die anderen direkt angesteuert zu haben.

<a id="temperature-reference-and-room-assist"></a>
## Temperaturreferenz und Room Assist

Bei normaler Zeitplanung sendet Velair den gemeinsamen Sollwert an die eingerichteten Empfänger. Jedes Gerät regelt intern weiterhin mit seinem eigenen Sensor; die Gruppenreferenz verändert seine Firmware-Regelung nicht.

Die **Temperaturreferenz** liefert den eigenen Gruppenmesswert für Vorkonditionierung, thermisches Lernen, Room Assists Ausgangswert, Versorgungsbedarfsschätzung und Gruppenzusammenfassung. Wähle sie aus den Mitgliedern. Einen optionalen externen Raumsensor konfigurierst du in [Room Assist](room-assist.de.md#room-groups), nicht als zusätzliche eigene Referenz im Gruppeneditor. Ist Room Assist aktiviert, wird dieser externe Wert zur wirksamen Raumtemperatur, und Velair berechnet eine gemeinsame Korrektur. Befehle verwenden weiterhin die **Befehlsübermittlung**.

Behaglichkeit bleibt unabhängig: Gruppen-Room-Assist ersetzt weder Sensoren noch Grenzwerte der Mitglieder.

<a id="pauses-manual-adjustment-and-resuming"></a>
## Pausen, manuelle Anpassung und Fortsetzen

Eine Gruppe hat eine Zeitplanungszuständigkeit. Eine über ein Mitglied angeforderte Velair-Zonenpause oder Verstärkung gilt daher für die ganze Gruppe. Der Tab Raumgruppen zeigt den gespeicherten Steuerungsstatus, hat aber keine eigene Pausenschaltfläche. Nutze die bestehenden Mitgliedsregler. Auch das Fortsetzen derselben gemeinsamen Pause über ein anderes Mitglied gilt für die Gruppe. Andere unabhängige Pausengründe behalten bis zu ihrem Ende oder ihrer Entfernung Vorrang. Globale Pause oder Stopp wirken weiterhin auf alle Räume, auch ungruppierte Geräte.

Zeitplanung pausieren schaltet Geräte nicht zwingend aus. Die gewählte Pausenaktion bestimmt, ob Velair die aktuellen Gerätezustände erhält oder Aus an die eingerichteten Empfänger sendet.

Die Richtlinie **Externe Anpassungen** in den Einstellungen gehört der Gruppe. Eine erkannte externe Änderung an Sollwert oder HVAC-Modus eines Mitglieds kann die ganze Gruppe gemäß denselben Zeitplaner- und Pausenregeln wie bei einem unabhängigen Gerät in **Manuelle Anpassung** versetzen. Mit **Bis zum nächsten Block**:

1. Drei Mitglieder folgen dem gemeinsamen Sollwert `20 °C`.
2. Eine externe Änderung erhöht ein Mitglied auf `22 °C`.
3. Velair gibt die Zeitplanungszuständigkeit der ganzen Gruppe ab und erhält die Mitgliedszustände. Die Änderung wird nicht kopiert: Sie können bei `22, 20, 20 °C` bleiben. Die Anlage selbst kann Änderungen dennoch weitergeben.
4. Beim nächsten Block kehrt Velair zur Automatik zurück und übermittelt den gemeinsamen Sollwert an die konfigurierten Empfänger. Du kannst die Automatik früher fortsetzen.

| Richtlinie für externe Anpassungen | Gruppenverhalten |
| --- | --- |
| Automatisch beibehalten | Velair behält die Zuständigkeit und wendet die aktuelle wirksame Absicht erneut an, sofern vorhanden. |
| Bis zum nächsten Block | Die manuelle Anpassung endet beim nächsten zutreffenden Block. Ohne zukünftigen Block musst du die Automatik ausdrücklich fortsetzen. |
| Für eine Dauer | Die Gruppe gibt für die eingestellte Dauer ab. Weitere externe Änderungen erneuern diese Dauer. |
| Bis zur Fortsetzung | Die Gruppe gibt ab, bis du die Automatik ausdrücklich fortsetzt. |

Explizites Auswählen von Manuell verwendet die gespeicherte Gruppenrichtlinie und erhält die Mitgliedszustände. Bei **Automatisch beibehalten** dauert explizites Manuell dagegen bis zum Fortsetzen. Room Assist setzt während der manuellen Anpassung aus.

Diese Manuell/Automatisch-Steuerung unterscheidet sich vom Modus **Manuell** bei direkter Profilwahl. Siehe [Externe Änderungen und manuelle Anpassungen](manual-control.de.md) für Prioritäten und besondere Blockregeln.

<a id="display-order"></a>
## Anzeigereihenfolge

Verschiebe Gruppen und unabhängige Geräte mit den bestehenden Reihenfolgereglern in den Einstellungen. Eine neue Gruppe übernimmt zunächst die Position ihres frühesten Mitglieds. Ordne Mitglieder im Detailpanel des Tabs Raumgruppen. Die Übersicht zeigt sie als aufeinanderfolgende Einzeleinträge in dieser Reihenfolge; Zeitplanauswahlen zeigen einen Gruppeneintrag. Beide Reihenfolgen speichert das Backend.

Die Mitgliedsliste zeigt nur ausgewählte Geräte. Neue werden ohne Umordnung der bestehenden angehängt. Nutze die Pfeile zum Verschieben und die Entfernen-Aktion zum Herausnehmen. Lange Listen lassen sich vollständig erweitern. Mitgliedschaftsänderungen werden erst nach Prüfung und Speicherung angewendet.

<a id="learning-and-membership-changes"></a>
## Lernen und Änderungen der Mitgliedschaft

Die Gruppe lernt eine thermische Reaktion mit getrennten Heiz- und Kühlverläufen. Bei deaktiviertem Room Assist stammt die eigene Temperatur vom gewählten Mitglied. Room Assist nutzt seinen externen Sensor nur im aktivierten Zustand, mit denselben Steuerungs-, Korrekturgrenzen und Vorbereitungsregeln wie bei unabhängigen Geräten. Sensorwahl allein aktiviert die Unterstützung nicht. Löschen oder Deaktivieren stellt die Mitgliedsreferenz wieder her. Befehle folgen weiter dem Übermittlungsmodus; vorübergehende Korrekturen verändern den echten geplanten Sollwert nicht. Unabhängige frühere Verläufe werden nicht zusammengeführt. Velair speichert das Lernen für die Gruppe, nicht als Einzelmodell je Mitglied. Individuelle Beobachtungen bleiben in der Diagnose verfügbar. Neue Gruppen beginnen ohne früheres Lernen.

| Änderung | Lernen danach |
| --- | --- |
| Gruppe umbenennen oder Mitglieder umordnen | Das Gruppenlernen bleibt erhalten. |
| Mitglied hinzufügen oder entfernen | Die verbleibende Gruppe beginnt wegen der geänderten physischen Zusammensetzung neu. Das entfernte Mitglied lernt unabhängig von null. |
| Temperaturreferenz oder Befehlsübermittlung ändern | Die Gruppe beginnt neu und verwirft die vorherige aktive Beobachtung. |
| Gruppe auflösen | Jedes Mitglied lernt unabhängig von null. Der frühere Gruppenverlauf wird entfernt. |

Ein entferntes Mitglied erhält eine unabhängige Kopie der gemeinsamen Konfiguration. Auflösen bewirkt das für alle Mitglieder. Aktive Verstärkungen, Pausen und thermischer Verlauf werden nicht in diese unabhängigen Räume kopiert. Prüfe danach Zeitpläne und Profile.

Entfernst du beispielsweise eines von drei Mitgliedern, bleiben zwei mit neuem Gruppenlernverlauf und ein unabhängiges Gerät mit neuem Verlauf. Löschen macht alle drei unabhängig. Keine der Aktionen stellt alte Verläufe aus der Zeit vor der Gruppe automatisch wieder her. Eine gespeicherte Gruppe benötigt mindestens zwei Mitglieder; löse sie auf, wenn alle unabhängig werden sollen.

<a id="before-testing-the-beta"></a>
## Vor dem Testen der Beta

Sichere die Konfiguration und bei Bedarf das Vorkonditionierungslernen. Prüfe nach dem bestätigten Speichern:

- Ein Gruppeneintrag erscheint in Zeitplanung, Profilen, Vorkonditionierung und Room Assist.
- Alle Mitglieder bleiben individuell in Übersicht, nächsten Ereignissen, heutigem Zeitverlauf, Behaglichkeit und Diagnose sichtbar.
- Die Übermittlung passt zur Anlage: alle erhalten direkte Befehle, oder der gewählte Empfänger erhält sie und die Anlage gibt sie weiter.
- Geänderte Behaglichkeitseinstellungen eines Mitglieds verändern die anderen nicht.
- Eine Pause oder manuelle Anpassung über ein Mitglied gilt für den gemeinsamen Raum.
- Ein Home-Assistant-Neustart erhält Gruppe, Mitgliedsreihenfolge und gemeinsame Einrichtung.

Nenne bei Problemen Übermittlungsmodus, Temperaturreferenz-Mitglied, Room-Assist-Aktivierung und relevante Diagnosenachweise. Ein erfolgreicher Dienstaufruf ist nicht dasselbe wie ein Gerät, das den gewünschten Zustand meldet.

Frühere Beta-Konfigurationen können eine externe Gruppenreferenz enthalten. Laden oder Importieren erhält diese, ohne automatisch ein Mitglied zu wählen oder Room Assist zu aktivieren. Der Editor kennzeichnet den Altwert und fordert vor dem Speichern einer bearbeiteten Gruppe eine Mitgliedsreferenz. Richte beim Umstellen den externen Sensor in Room Assist ein.

Raumgruppen und Versorgungsgruppen haben unterschiedliche Zwecke. Eine Raumgruppe steuert einen Raum; [Versorgungssteuerung](shared-climate-supply.de.md) bündelt Raumbedarf für eine gemeinsame Quelle. Verknüpfte Vorlagen teilen Zeitplaninhalt ohne Änderung der Raumzuständigkeit. Vorkonditionierungsabhängigkeiten koordinieren unabhängige Räume mit eigenem Lernen.
