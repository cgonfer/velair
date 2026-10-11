<a id="practical-examples-presets-and-linked-templates"></a>
# Praktische Beispiele: Presets und verknüpfte Vorlagen
<!-- velair-docs:start -->
Übersetzungen: [Englisches Original](linked-schedule-examples.md) · [Español](linked-schedule-examples.es.md) · [Français](linked-schedule-examples.fr.md) · [Deutsch](linked-schedule-examples.de.md) · [Italiano](linked-schedule-examples.it.md) · [Nederlands](linked-schedule-examples.nl.md) · [Polski](linked-schedule-examples.pl.md) · [Português (Brasil)](linked-schedule-examples.pt-br.md) · [Português (Portugal)](linked-schedule-examples.pt-pt.md) · [Русский](linked-schedule-examples.ru.md) · [Übersetzungsstatus](../translation-status.md)

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

Diese Anleitung führt durch Haushaltskonfigurationen mit **Standard**, **Profilen**, Tagesvorlagen und Velair-Presets. Namen, Entitäten und Temperaturen sind Beispiele. Verwende Modi und Ziele, die deine eigenen Thermostate unterstützen. Die Temperaturen hier sind Celsiuswerte; Velair unterstützt auch Fahrenheit.

Alle Regeln findest du unter [Block-Presets und verknüpfte Vorlagen](linked-schedules.de.md).

<a id="choose-what-you-want-to-share"></a>
## Entscheiden, was gemeinsam genutzt werden soll

| Dein Ziel | Auswahl | Spätere Änderungen |
|---|---|---|
| Temperatur und Optionen zu unabhängigen Zeiten wiederverwenden | Ein Velair-Preset in jedem Block | Preset-Änderungen aktualisieren diese Blöcke; Zeiten bleiben unabhängig. |
| Mit einer Vorlage beginnen und Blöcke anpassen | Blöcke kopieren | Vorlagenänderungen aktualisieren die Kopie nicht. Kopierte Preset-Verweise bleiben dynamisch. |
| Einen konfigurierten Zeitplantag duplizieren | Kopieren | Die Kopie behält Vorlagen-Verknüpfungstyp, Zuordnungen und Preset-Verweise der Quelle. |
| Dieselben Zeiten mit unterschiedlichen Heiz- oder Kühleinstellungen verwenden | Vorlage mit **Nur Zeiten** | Vorlagenzeitänderungen aktualisieren jeden verknüpften Tag; Klimaeinstellungen bleiben unabhängig. |
| Mehrere Tage in Zeiten und Einstellungen identisch halten | Vorlage mit **Zeiten und Einstellungen** | Zeit- und Klimaänderungen folgen der Vorlage; Zielbedienelemente sind schreibgeschützt. |

Eine Vorlage ist ein Tag, kein Wochenzeitplan. Verknüpfe jeden benötigten Wochentag und jedes Thermostat ausdrücklich. Eine Woche darf unabhängige Tage und beide Verknüpfungstypen enthalten. Standard ist die normale Woche jedes Thermostats, kein gespeichertes Profil.

<a id="1-one-heating-routine-for-two-rooms"></a>
## 1. Eine Heizroutine für zwei Räume

**Ausgangslage:** Wohnzimmer und Schlafzimmer benötigen beide Komfort um 07:00 und eine Nachtabsenkung um 23:00. Beide Thermostate unterstützen Heizen und diese Ziele.

1. Öffne **Vorlagen → Klima-Presets**. Erstelle und speichere diese Presets:

   | Preset | Modus | Ziel |
   |---|---|---|
   | Heizkomfort | Heizen | 21 °C |
   | Heiznacht | Heizen | 17 °C |

2. Erstelle in der Tagesvorlagenbibliothek **Zuhause-Wochentag**. Füge 07:00 und 23:00 hinzu. Wähle in **Zusätzliche Einstellungen** jedes Blocks das entsprechende **Velair-Preset** und speichere die Vorlage.
3. Öffne **Zeitpläne → Standardzeitpläne**, wähle Wohnzimmer und Montag. Setze **Zeitplanquelle** auf **Zuhause-Wochentag**, dann unter **Verknüpfen** auf **Zeiten und Einstellungen**. Speichere den Tag.
4. Wiederhole das für das Schlafzimmer und jeden Wochentag, der dieser Routine folgen soll.

Zeit, Modus, Ziel und Geräteoptionen dieser verknüpften Tage sind schreibgeschützt. Die Zielspalte zeigt weiterhin 21 °C oder 17 °C und ersetzt das Ziel nicht durch den Preset-Namen. Herkunftskennzeichnungen und Blockdetails nennen Vorlage und Preset.

Führe nun zwei getrennte Änderungen aus:

| Gespeicherte Änderung | Ergebnis |
|---|---|
| Den 07:00-Vorlagenblock auf 07:30 verschieben | Jeder verknüpfte Tag beginnt diesen Block um 07:30. Sein Preset-Verweis bleibt unverändert. |
| Heizkomfort von 21 °C auf 21.5 °C ändern | Jeder Verweis auf dieses Preset verwendet 21.5 °C, auch über die Vorlage. Nachtziele bleiben 17 °C. |

Das Speichern der Vorlage speichert keinen unabhängig geöffneten Profilentwurf. Das Speichern eines Presets speichert keinen unabhängigen Zeitplanentwurf. Jede Ressource hat ihr eigenes Bedienelement zum Speichern.

<a id="2-winter-and-summer-with-one-set-of-times"></a>
## 2. Winter und Sommer mit gemeinsamen Zeiten

**Ausgangslage:** Eine Klimaanlage heizt im Winter und kühlt im Sommer. Der Haushaltszeitplan bleibt gleich, Ziele und Aktionen ändern sich.

Erstelle **Arbeitstag** mit Blöcken um 07:00 und 23:00. Erstelle folgende Presets und verwende **Nur Zeiten**, wenn du den Wohnzimmer-Montag in Standard und beiden Profilen verknüpfst:

| Gemeinsame Zeit | Standardzuordnung | Zuordnung Winterprofil | Zuordnung Sommerprofil |
|---|---|---|---|
| 07:00 | Normaler Komfort: Heizen, 20 °C | Winterkomfort: Heizen, 21 °C | Sommerkomfort: Kühlen, 25 °C |
| 23:00 | Manuelles Ausschalten | Winternacht: Heizen, 17 °C | Ausschalt-Preset |

Wähle zum Konfigurieren **Profilzeitpläne**, erstelle das Profil und setze das Wohnzimmer auf **Profilzeitplan**. Wähle den Wochentag, **Arbeitstag → Nur Zeiten**, und konfiguriere seine Zuordnungen. Speichere das vollständige Profil. In Standard speicherst du jeden bearbeiteten Tag separat.

Das Verschieben der morgendlichen Vorlagenzeit auf 07:30 verschiebt alle drei Zeitpläne. Eine Änderung des eigenen Vorlagenziels ändert diese Zuordnungen nicht. Bearbeiten von **Winterkomfort** beeinflusst seine Preset-Verweise einschließlich des Winterprofils, verwandelt jedoch das Sommer-Kühlziel nicht in ein Heizziel.

Das ausgewählte Profil bestimmt weiterhin die ausgeführte Woche. Home Assistant kann Winter oder Sommer mit den bestehenden Profilaktionen wählen; die Vorlage entscheidet nicht über die Saison. Nach Erstellung eines Profils mit Automations-ID `summer` wählt diese Aktion es beispielsweise aus:

```yaml
action: velair.activate_profile
data:
  profile_id: summer
```

Um zu den gespeicherten Standardzeitplänen zurückzukehren:

```yaml
action: velair.deactivate_profile
```

Verwende die im Profil angezeigte **Automations-ID**, die vom Anzeigenamen abweichen kann. Regeln für Modi und Profilaktivierung stehen unter [Klimaprofile](climate-profiles.de.md).

Für mildes Wetter kann ein lokal gesteuertes Klimagerät ein separates Profil mit **Pausieren → Klimagerät ausschalten** haben. Eine Automation kann dieses Profil wählen. Das unterscheidet sich von einem geplanten Ausschaltblock: Eine pausierte Zone folgt späteren Zeitplanblöcken nicht weiter. Bei extern gesteuerten Zonen ist Pausenverhalten nicht verfügbar; dort gelten die unterstützten Zeitplanaktionen des Anbieters.

Vorhersageschwellen, regelmäßige Außentemperaturprüfungen, Fensterbenachrichtigungen und Verzögerungen des abendlichen Ausschaltens bleiben Entscheidungen von Home-Assistant-Automationen. Presets und Verknüpfungen ergänzen diese Regeln nicht in Velair.

<a id="3-copy-a-day-then-customize-a-guest-room"></a>
## 3. Einen Tag kopieren und ein Gästezimmer anpassen

**Ausgangslage:** Das Gästezimmer soll mit Zuhause-Wochentag beginnen, Gäste möchten aber Frühstücksheizung um 08:00 statt 07:00.

Wähle unter Zeitpläne das Gästezimmer und den Wochentag. Behalte **Zeitplanquelle → Eigener Zeitplan**, wähle dann **Zuhause-Wochentag** in der separaten **Vorlagen**-Auswahl, um dessen Blöcke zu kopieren. Ändere die Morgenzeit auf 08:00 und speichere. Der Tag ist unabhängig von der Vorlage. Das spätere Verschieben von Zuhause-Wochentag auf 07:30 verschiebt den 08:00-Block im Gästezimmer nicht.

Verwendet der kopierte Block **Heizkomfort**, referenziert er dieses Preset weiterhin. Die Änderung von Heizkomfort auf 21.5 °C verändert daher auch das Gästezimmerziel. Unabhängig von einer Vorlage bedeutet nicht unabhängig von einem Preset.

Damit das Gästezimmer unabhängig von zukünftigen Preset-Änderungen bei 20 °C bleibt, öffne die zusätzlichen Blockeinstellungen, wähle **Kein Velair-Preset**, ändere das manuelle Ziel auf 20 °C und speichere. Entfernen des Presets behält zunächst seine wirksamen Einstellungen bei und leert den Block nicht.

Klonen eines Zeitplantags unterscheidet sich vom Kopieren von Blöcken aus der Vorlagenbibliothek: Es behält die Vorlagenverknüpfung des Quelltags. Klone beispielsweise einen Montag mit **Zuhause-Wochentag → Zeiten und Einstellungen** auf Dienstag. Beide folgen nun Zuhause-Wochentag; dessen Änderung von 07:00 auf 07:30 aktualisiert beide.

Bei **Nur Zeiten** behält die Kopie dieselbe Zeitverknüpfung und kopiert Zuordnungen einschließlich Presets. Danach kannst du die Dienstagszuordnungen ändern, ohne Montag zu ändern, während beide weiterhin den Vorlagenzeiten folgen.

Du kannst Montag auch auf Montag eines anderen Thermostats klonen. Bei Kompatibilität behält dieses Ziel denselben Verknüpfungstyp; andere Wochentage behalten ihre Konfiguration. Ein gemeinsames Heiz-Preset auf einem reinen Kühlgerät lehnt das Klonen ab, statt die Verknüpfung stillschweigend zu entfernen. Standard prüft alle ausgewählten Ziele gemeinsam. In Profilen aktualisiert Klonen nur den geprüften Entwurf bis zum Speichern des Profils.

Für einen unabhängigen Dienstag klone ihn und wähle vor dem Speichern **Verknüpfung lösen**. Der Tag behält aktuelle Einstellungen und dynamische Presets, folgt aber nicht mehr der Vorlage. **Blöcke kopieren** in der Vorlagenbibliothek bleibt unabhängig.

<a id="4-change-a-link-without-losing-the-wrong-draft"></a>
## 4. Eine Verknüpfung ändern und den richtigen Entwurf behalten

**Ausgangslage:** Montag ist mit Zuhause-Wochentag verknüpft. Du möchtest diesen Montag anpassen und andere verknüpfte Tage unverändert lassen.

| Auswahl | Ergebnis im Entwurf |
|---|---|
| **Zeiten und Einstellungen** zu **Nur Zeiten** ändern | Aktuelle Vorlageneinstellungen als eigene Tageszuordnungen mit Presets behalten. Zeiten folgen weiterhin der Vorlage. |
| **Nur Zeiten** zu **Zeiten und Einstellungen** ändern | Ersetzen der Tageszuordnungen durch Vorlageneinstellungen bestätigen. Abbrechen behält ursprüngliche Auswahl und Entwurf. |
| Andere Vorlage wählen | Ersetzen des Entwurfs bestätigen. Abbrechen behält aktuelle Vorlage und Einstellungen. |
| **Verknüpfung lösen** verwenden | Zeiten und Einstellungen des aktuellen Entwurfs als unabhängigen Tag mit Presets behalten. |
| **Eigener Zeitplan** wählen | Verwerfen der Tagesänderungen bestätigen und den gespeicherten Tag als unabhängigen Entwurf wiederherstellen. |

Diese Vorgänge speichern nicht automatisch. Speichere den Standardtag oder das vollständige Profil, wenn du fertig bist.

Ein konkreter Unterschied: Angenommen, der gespeicherte Montag hat einen unabhängigen 09:00-Block mit 20 °C. Du wählst eine ab 08:00 beginnende Vorlage und änderst ihre reine Zeitzuordnung auf 21 °C, ohne zu speichern:

- **Verknüpfung lösen** behält 08:00 und 21 °C im unabhängigen Entwurf.
- **Eigener Zeitplan** stellt gespeicherte 09:00 und 20 °C wieder her.

War der gespeicherte Montag selbst verknüpft, verwendet Eigener Zeitplan seine aktuellen gespeicherten Werte und macht sie unabhängig. Es stellt keinen älteren manuellen Zeitplan vor Erstellung der Verknüpfung wieder her.

Die Umwandlung eines Tages verwendet an das Thermostat angepasste Werte. Ein gemeinsames manuelles Ziel von 18.3 °C kann etwa auf einem Gerät mit 0.5-°C-Schritten als 18.5 °C erscheinen. Nach dem Lösen bleibt dieses manuelle Ziel 18.5 °C. Ein Preset-Block behält stattdessen seinen Preset-Verweis. Keiner der Vorgänge verändert die gemeinsame Bibliothek.

<a id="5-add-a-lunchtime-block-to-a-shared-template"></a>
## 5. Einen Mittagsblock zu einer gemeinsamen Vorlage hinzufügen

**Ausgangslage:** Arbeitstag hat bereits Blöcke um 07:00 und 23:00. Du fügst 12:00 mit manuellem Heizen auf 18 °C hinzu. Verschiedene Räume und Profile verwenden diese Vorlage.

<a id="a-compatible-hours-only-destination"></a>
### Kompatibles Ziel mit reiner Zeitverknüpfung

Unterstützt das Ziel Heizen mit 18 °C, schlägt Velair vor, diese Konfiguration in seine neue 12:00-Zuordnung zu kopieren. Prüfe sie unter **Verknüpfte Tage** und speichere die Vorlage.

Nur die Zeit bleibt gemeinsam. Das spätere Ändern des 12:00-Vorlagenziels auf 19 °C verändert diese reine Zeitzuordnung nicht. Referenziert der neue Block stattdessen ein kompatibles Preset, behält die Zuordnung diesen Verweis; spätere Preset-Änderungen werden weitergegeben.

<a id="an-incompatible-hours-only-destination"></a>
### Inkompatibles Ziel mit reiner Zeitverknüpfung

Angenommen, ein anderes Thermostat hat eine Mindestzieltemperatur von 19 °C. Seine vorhandene 07:00-Zuordnung verwendet das gültige Preset **Bürokomfort: Heizen, 21 °C**. Das neue 18-°C-Ziel ist inkompatibel, daher sucht Velair eine gespeicherte Zuordnung im selben Thermostattag:

1. Ein Block genau um 12:00, falls er vor dieser Änderung existierte.
2. Frühere Blöcke, beginnend mit dem nächstgelegenen.
3. Spätere Blöcke, beginnend mit dem nächstgelegenen.

Hier schlägt es Bürokomfort von 07:00 vor. Verknüpfte Tage nennt Ersatzzuordnung und Quelle. Du kannst sie akzeptieren oder vor dem Speichern eine andere gültige Zuordnung wählen. Ihr Preset bleibt dynamisch.

Inkompatible Quellzuordnungen werden übersprungen. Ein bei dieser Änderung verschobener oder gelöschter Block kann seine zuvor gespeicherte Zuordnung noch liefern; ein anderer neu hinzugefügter Block nicht. Gibt es keine gültige Quelle, zeigt Verknüpfte Tage eine ausstehende Zuordnung. Vervollständige sie manuell oder wähle ein kompatibles Preset; solange sie aussteht, wird nichts gespeichert.

<a id="a-completely-linked-destination"></a>
### Vollständig verknüpftes Ziel

Bei **Zeiten und Einstellungen** kommt der neue 12:00-Block direkt aus der Vorlage. Es gibt keinen Rückgriff auf alte Raumeinstellungen.

Ist das 18-°C-Vorlagenziel mit einem vollständigen Ziel inkompatibel, ist das gesamte Vorlagenspeichern blockiert. Ändere das Vorlagenziel auf einen von allen unterstützten Wert oder ändere das betroffene Ziel zu Nur Zeiten beziehungsweise einem unabhängigen Tag und speichere diese Änderung zuerst.

Diese Prüfung umfasst inaktive Profile und durch ein anderes aktives Profil verdeckte Standardzeitpläne. Bis zum gültigen Vorlagenspeichern behalten alle gespeicherten Ziele die bisherige Programmierung.

<a id="move-or-remove-an-existing-block"></a>
### Einen vorhandenen Block verschieben oder entfernen

Verschieben von 07:00 auf 07:30 behält die morgendliche Zuordnung jedes nur zeitlich verknüpften Ziels und ersetzt sie nicht durch das Vorlagenziel. Vollständige Ziele folgen der aktualisierten Vorlage. Entfernen eines Blocks löscht entsprechende reine Zeitzuordnungen und vollständige Vorlagenblöcke beim selben Speichern.

Ein Block hat eine stabile Kennung. Löschen und Hinzufügen eines anderen zur selben Zeit erzeugt einen neuen Block und gilt nicht als Verschieben des ursprünglichen.

<a id="6-understand-uses-before-editing-or-deleting"></a>
## 6. Verwendungen vor dem Bearbeiten oder Löschen verstehen

**Ausgangslage:** Heizkomfort wird verwendet in:

- einem Block von Zuhause-Wochentag;
- einem unabhängigen Standardblock am Freitag;
- einer reinen Zeitzuordnung eines Winterprofils.

Das Preset hat **drei direkte Verweise**. Folgen zwei weitere Tage Zuhause-Wochentag mit Zeiten und Einstellungen, übernehmen sie das Preset über die Vorlage. Sie erscheinen als zusätzliche betroffene Ziele, ohne die direkte Anzahl auf fünf zu erhöhen.

Preset-Änderungen betreffen alle Verweise und übernommenen Ziele. Vor dem Speichern müssen alle kompatibel sein. Ein durch eine Vorlage referenziertes Preset lässt sich auch dann nicht löschen, wenn die Vorlage keine verknüpften Tage hat: Entferne zuerst den Verweis in der Vorlage.

Die Vorlagenanzahl **Verknüpfte Tage** bedeutet etwas anderes. Montag und Dienstag verknüpfen erzeugt zwei verknüpfte Tage. Kopieren auf Freitag erzeugt keine Verknüpfung und erhöht die Anzahl nicht. Kopien werden nicht als Vorlagenverwendungen verfolgt.

Lösche eine Vorlage erst nach dem Lösen aller gespeicherten Tage in Standard und Profilen. Das Bearbeiten von Name, Zeiten oder Einstellungen behält ihre Bibliotheksposition bei.

<a id="7-what-happens-while-a-schedule-is-active"></a>
## 7. Was passiert bei einem aktiven Zeitplan?

Angenommen, das Wohnzimmer folgt automatisch Heizkomfort mit 21 °C. Speichern dieses Presets mit 21.5 °C aktualisiert die aktive Steuerungsabsicht. Das physische Gerät muss die Aktion weiterhin annehmen; Speichern beweist nicht, dass der Raum wärmer geworden ist.

Hat das Wohnzimmer eine temporäre Anpassung auf 23 °C, beendet Bearbeiten des Presets diese nicht. Beim Ablauf verwendet Velair die aktuelle Zeitplankonfiguration. Pausen und manuelle Anpassung behalten ebenfalls Vorrang. Profilaktivierung ist eine separate Aktion: Sie beendet temporäre Anpassungen in betroffenen Zonen, während globale und Zonenpausen weiter Vorrang haben. Siehe [Vorrangregeln für Profile](climate-profiles.de.md).

Liefert Winter seine eigene Woche, ersetzt Bearbeiten von Standard den aktiven Winterzeitplan nicht. Rückkehr zu Standard verwendet die neuesten gespeicherten Standardeinstellungen. Ein Profil mit **Standardzeitplan** übernimmt dessen Verknüpfungen und Presets, statt eine weitere Kopie zu speichern.

Ein leerer Wochentag schaltet das Klimagerät nicht stillschweigend aus. Ein Freitags-Nachtblock um 23:00 gilt über einen leeren Samstag hinweg, bis ein neuer Zeitplanblock beginnt. Füge ausdrücklich einen Ausschaltblock hinzu, wenn das beabsichtigt ist.

<a id="8-device-options-cooling-and-temperature-ranges"></a>
## 8. Geräteoptionen, Kühlen und Temperaturbereiche

**Ausgangslage:** Eine Schlafzimmer-Klimaanlage bietet das native Preset `sleep` und den Lüftermodus `quiet`. Du möchtest beides um 23:00 bei Kühlen mit 25 °C.

Erstelle **Schlafzimmer-Sommernacht** mit Kühlen, 25 °C, Geräte-Preset `sleep` und Lüftermodus `quiet`. Wähle es im 23:00-Block über zusätzliche Einstellungen. **Velair-Preset** ist die gemeinsame Velair-Konfiguration; **Geräte-Preset** ist ein Befehl darin. Die Blockzusammenfassung zeigt Ziel, Modus und beide Geräteoptionen gemeinsam.

Bei unterstützendem Ziel zählt die Einstellungsanzeige drei: eine Velair-Verknüpfung plus zwei Geräteoptionen. Temperatur und HVAC-Modus erhöhen sie nicht. Eine weggelassene Geräteoption wird nicht zurückgesetzt: Entfernen von `quiet` aus der gemeinsamen Konfiguration beendet das Senden eines Lüfterbefehls, statt einen anderen Lüfterwert zu setzen.

Erstelle für eine andere Routine **Nur leiser Lüfter** mit nur der Lüfteroption und ohne Ziel oder HVAC-Modus. Ein geplanter Verweis sendet die Lüftereinstellung, ohne HVAC-Moduswechsel anzufordern oder ein ausgeschaltetes Klimagerät einzuschalten. Es hat kein Ziel für Vorkonditionierung oder Room Assist. Auf einem Thermostat ohne Lüftersteuerung ergäbe das eine leere Aktion; daher wird es abgelehnt.

Ein Klimagerät mit nativer Heiz-/Kühlbereichsunterstützung kann stattdessen **Zuhause-Bereich** mit Heizen/Kühlen, unterem Ziel 19 °C und oberem Ziel 24 °C verwenden. Beide Grenzen erscheinen in den Zielspalten aus demselben Preset. Ändern der oberen Grenze auf 25 °C aktualisiert Verweise und behält die untere. Ein Einzelzielthermostat kann dieses Bereichs-Preset nicht verwenden. Velair erfindet weder ein Einzelziel noch eine fehlende Bereichsgrenze. Verwende für dieses Gerät ein separates kompatibles Preset.

Reine Modus-Presets wählen einen HVAC-Modus ohne Temperatur oder zusätzliche Geräteoptionen. Ein Ausschalt-Preset fordert Ausschalten an und hat kein Ziel oder zusätzliche Optionen. Diese Aktionen behalten ihre Bedeutung bei Vorlagenverweisen; gemeinsames Nutzen ergänzt keine kontinuierliche Temperatursteuerung.

<a id="troubleshooting-shared-configurations"></a>
## Fehlerbehebung bei gemeinsamen Konfigurationen

| Beobachtung | Prüfen oder tun |
|---|---|
| Eine Zeit ist gesperrt | Der Tag folgt Vorlagenzeiten. Vorlage bearbeiten oder Verknüpfung lösen. |
| Auch Modus und Ziel sind gesperrt | Der Tag folgt der vollständigen Vorlage oder der Block verwendet ein Velair-Preset. Gemeinsame Quelle bearbeiten. |
| Ein kopierter Tag ändert weiter seine Temperatur | Ein Preset-Verweis blieb erhalten. Kein Velair-Preset wählen, um den Block manuell zu machen. |
| Vorlagenänderung scheitert trotz gültigem aktivem Raum | Verknüpfte Tage auf inaktive Profile, verdeckte Standardtage und andere Thermostate prüfen. |
| Ein neuer reiner Zeitblock steht aus | Unter Verknüpfte Tage eine gültige manuelle Konfiguration oder ein Preset wählen. |
| Ein Anbieterfehler für die ganze Woche bleibt | Zeitraster, Aktionsunterstützung oder Blockgrenze des Anbieters korrigieren. Eine Quellzuordnung kann diese Grenzen nicht beheben. |
| Kompatibilitätsprüfung gelingt, Speichern scheitert | Die Prüfung testete ein Thermostat. Speichern prüft jedes tatsächliche gespeicherte Ziel. |
| Eine Löschschaltfläche ist deaktiviert | Alle gespeicherten Verweise zuerst entfernen; Vorlagen dürfen Presets ohne verknüpfte Tage referenzieren. |
| Eine andere Sitzung änderte die Konfiguration | Konfiguration aktualisieren und behaltenen Entwurf vor erneutem Versuch prüfen. |
| Eine Vorschau scheitert oder lädt noch | Entwurf behalten und erneut versuchen. Velair errät keine Einstellungen und entfernt keine Verweise, um Speichern zu ermöglichen. |

Nicht unterstützte optionale Geräteeinstellungen können aus der wirksamen Zielkonfiguration gefiltert werden. Ziele außerhalb des Bereichs und inkompatible Modi werden abgelehnt. Eine reine Optionsaktion darf nach dem Filtern nicht leer werden. Externe Regler haben zusätzliche Grenzen; Veröffentlichungsfehler führen niemals zu lokaler Klimaausführung.

<a id="back-up-the-whole-setup"></a>
## Die gesamte Konfiguration sichern

Verwende den Velair-Export statt nur einen sichtbaren aufgelösten Tag zu kopieren. Modell-16-Exporte behalten beide Verknüpfungstypen, Presets und Blockkennungen. Exportierte Zeitpläne oder Profile enthalten ihre erforderlichen Vorlagen und Presets; der Exportbildschirm zeigt automatisch ergänzte Bereiche.

Prüfe beim Import Ersetzungen vor der Bestätigung. Das Ersetzen einer gemeinsamen Ressource kann vorhandene lokale Verwendungen beeinflussen. Die kombinierte Konfiguration muss gültig sein; neue Profile werden nicht allein durch den Import aktiviert. Ältere Sicherungen bleiben importierbar, ältere Velair-Versionen können jedoch keinen Modell-16-Export importieren. Siehe [Übertragbarkeit](usage.de.md#portability).
