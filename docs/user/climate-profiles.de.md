<a id="climate-profiles"></a>
# Klimaprofile
<!-- velair-docs:start -->
Übersetzungen: [Englisches Original](climate-profiles.md) · [Español](climate-profiles.es.md) · [Français](climate-profiles.fr.md) · [Deutsch](climate-profiles.de.md) · [Italiano](climate-profiles.it.md) · [Nederlands](climate-profiles.nl.md) · [Polski](climate-profiles.pl.md) · [Português (Brasil)](climate-profiles.pt-br.md) · [Português (Portugal)](climate-profiles.pt-pt.md) · [Русский](climate-profiles.ru.md) · [Übersetzungsstatus](../translation-status.md)

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

Mit Klimaprofilen kann Velair mehrere Klimazonen zwischen abgestimmten Wochenplänen wechseln lassen, ohne deren Standardzeitpläne zu ersetzen. Home Assistant bleibt die Entscheidungsebene: Anwesenheit, Fenster, Jahreszeiten, Auswahlelemente, Sensoren oder andere Automationen entscheiden, wann ein Profil wechselt. Velair speichert, wendet an und zeigt das resultierende Klimaverhalten.

Ein **Profil** definiert eine alternative Klimaroutine für seine konfigurierten Zonen. Ein **Modus** aktiviert ein oder mehrere Profile ohne überlappende Zonen gemeinsam als einen Haushaltszustand. Aktiviere ein Profil direkt, wenn nur diese Routine benötigt wird. Verwende einen Modus, wenn mehrere Bereiche gemeinsam wechseln sollen.

Beispiele sind Zuhause, Abwesend, Urlaub, Sommer, Gäste oder Schlafen. Profile unterstützen auch Installationen, deren Heiz- und Kühlzeitpläne unterschiedliche Blockzeiten, Ziele und HVAC-Modi verwenden.

<a id="default"></a>
## Standard

`Default` ist die integrierte Auswahl und bezeichnet immer die im Tab „Zeitpläne“ konfigurierten Wochenzeitpläne. Es ist kein gespeichertes Profil und lässt sich daher weder umbenennen noch löschen.

Das Aktivieren eines anderen Profils überschreibt diese Zeitpläne niemals. Die Rückkehr zu Standard wendet sofort den dann aktiven Standardblock an.

<a id="configure-a-profile"></a>
## Ein Profil konfigurieren

Öffne **Zeitpläne**, wähle **Profilzeitpläne** und erstelle mit der Hinzufügen-Schaltfläche ein leeres Profil. Wähle es in der Liste, um Farbe, Symbol, Name, Beschreibung und Thermostatverhalten zu bearbeiten. Der Profilbereich zeigt jeweils ein ausgewähltes Thermostat, damit der vollständige Editor auf Desktop, Tablet und Mobilgerät nutzbar bleibt.

Den Profilnamen bearbeitest du in der Überschrift neben dem Stiftsymbol. Seine stabile Automations-ID erscheint direkt darunter und in der Profilliste. Sie lässt sich in Dienste, Skripte und Automationen kopieren, ohne sie mit dem bearbeitbaren Anzeigenamen zu verwechseln.

Symbole verwenden Material-Design-Icons-Schlüssel wie `mdi:briefcase-outline`. Der Editor zeigt eine Vorschau in der Profilfarbe, verlinkt den durchsuchbaren Material-Design-Icons-Katalog und meldet Schlüssel außerhalb des erwarteten Formats `mdi:icon-name`. Beschreibungen sind auf 500 Zeichen begrenzt; der Editor zeigt die verbleibende Anzahl. Velair weist neuen und bestehenden Profilen eine stabile Farbe zu, die sich mit Farbauswahl oder einem bearbeitbaren Wert `#RRGGBB` ändern lässt. Ungültige Werte werden markiert und können nicht gespeichert werden. Die Farbe ist in portablen Exporten enthalten. Die integrierte Standardauswahl behält ihre feste Farbe.

Wähle für jedes verwaltete Klimagerät ein Verhalten:

- **Standardzeitplan**: weiterhin den normalen Wochenzeitplan der Zone verwenden.
- **Profilzeitplan**: einen vollständigen Wochenzeitplan aus dem Profil verwenden.
- **Pausieren** mit **Thermostat unverändert lassen**: geplante Änderungen stoppen und den aktuellen Gerätezustand beibehalten.
- **Pausieren** mit **Klimagerät ausschalten**: geplante Änderungen stoppen und das Gerät ausschalten.

Nicht im Profil konfigurierte Zonen verwenden weiter ihre Standardzeitpläne. Vorlagen lassen sich weiterhin als unabhängige Blöcke kopieren. Ein Standard- oder Profilwochentag kann auch nur seine Zeiten mit einer Vorlage verknüpfen und eigene Klimaeinstellungen behalten oder der vollständigen Vorlage mit schreibgeschützten Bedienelementen folgen. Vorlagen und unabhängige Blöcke können gemeinsame Velair-Presets referenzieren. Regeln zur Weitergabe von Änderungen, zum Lösen, zur Kompatibilität und zu gemeinsamen Änderungen findest du unter [Block-Presets und verknüpfte Vorlagen](linked-schedules.de.md). Das [Winter-/Sommerbeispiel](linked-schedule-examples.de.md#2-winter-and-summer-with-one-set-of-times) zeigt unterschiedliche Klimaeinstellungen bei gleichen Zeiten. Klonen eines Tages behält Vorlagen-Verknüpfungstyp, Zuordnungen reiner Zeitverknüpfungen und Block-Preset-Verweise. Klonen auf ein anderes Thermostat prüft das vorgeschlagene Profil vor der Entwurfsänderung; andere Zieltage behalten ihre Verknüpfungen. Löse nach dem Klonen die Verknüpfung, wenn der neue Tag unabhängig sein soll.

Für eine extern gesteuerte Zone wählen Profile und Modi die wirksame vollständige Woche, die Velair veröffentlicht, statt direkte `climate.*`-Aktionen auszulösen. **Standardzeitplan** veröffentlicht die normale Woche, **Profilzeitplan** die Profilwoche. **Pausieren** ist bei extern verwalteten Zonen nicht verfügbar. Der Profileditor berücksichtigt Reglerfähigkeiten als zusätzliche Validierung. Ein Veröffentlichungsfehler macht die gespeicherte Profil- oder Modusauswahl nicht rückgängig und betrifft keine lokal ausgeführten Zonen. Aktuelle Reglergrenzen und Bedeutung der Veröffentlichung stehen unter [Externe Zeitplanausführung](external-systems.de.md).

**Als Vorlage speichern** speichert aus einem bearbeiteten Profilzeitplantag nur eine wiederverwendbare Vorlage über das Backend und lässt den ungespeicherten Profilentwurf unverändert. Um den Tag auf anderen verwalteten Klimageräten zu verwenden, wähle sie unter **Tag kopieren nach / Andere Thermostate** und dann **Kopieren**. Die Bestätigung fasst gewählte Klimageräte zusammen und nennt Standard- oder Pausenzonen, die zu **Profilzeitplan** wechseln. Kopieren ersetzt nur den entsprechenden Wochentag, behält alle anderen gemerkten Tage und bleibt Teil des Profilentwurfs. Velair prüft Zieltyp, HVAC-Modus, Temperaturgrenzen und Temperaturschritt für jedes Ziel vor der Entwurfsänderung. Nicht unterstützte optionale Bedienelemente werden je Ziel entfernt. Bleibt bei einem reinen Optionsblock kein unterstütztes Bedienelement übrig oder ist ein Ziel beziehungsweise Modus inkompatibel, wird der Entwurf überhaupt nicht geändert. Kopierte Tage werden erst beim Speichern des Profils dauerhaft gespeichert.

Jeder Profiltag verwendet denselben bearbeitbaren Zeitverlauf wie Standardzeitpläne und Vorlagen, einschließlich Ziehen und Größenänderung zum Anpassen der Blockzeiten. Zeitplanblöcke haben eine Startzeit, aber keine separate Endzeit. Der letzte Block gilt deshalb über Mitternacht und leere Wochentage hinweg, bis ein weiterer beginnt. Der Zeitverlauf zeigt den übernommenen Tagesanteil als unterscheidbares, nicht bearbeitbares Segment und nennt den Wochentag, an dem der Block tatsächlich konfiguriert ist.

Solange ein Profil zur Bearbeitung geöffnet bleibt, behält ein vorübergehender Wechsel einer Zone von **Profilzeitplan** zu **Standardzeitplan** oder **Pausieren** deren Wochenentwurf. Erneute Auswahl von **Profilzeitplan** stellt die ungespeicherten Blöcke wieder her. Speichern mit Standard oder Pause speichert nur das gewählte Verhalten, nicht den verborgenen Zeitplanentwurf. Die Thermostatauswahl zeigt Anzeigenamen, der aktive Editor zusätzlich die Entitäts-ID. Profilmetadaten und Zeitpläne werden weiterhin gemeinsam als ein atomarer Vorgang gespeichert; ein Thermostatwechsel speichert keinen Teilentwurf.

Mehrere Profile können gleichzeitig aktiv sein, wenn ein Modus sie koordiniert. Ihre konfigurierten Zonen dürfen sich nicht überschneiden: Jedes verwaltete Klimagerät hat höchstens ein Profil für sein wirksames Verhalten. Zonen außerhalb aller aktiven Profile verwenden weiter ihren Standardzeitplan.

<a id="worked-example-an-away-mode"></a>
## Beispiel: Ein Abwesenheitsmodus

Angenommen, Wohn- und Schlafzimmergeräte sollen bei leerem Zuhause unterschiedliche Einstellungen verwenden:

1. Erstelle ein Profil **Abwesend · Wohnbereiche**. Gib Wohnzimmer und Küche alternative Zeitpläne mit zur Installation passenden Zielen, unabhängig davon, ob sie heizt, kühlt oder beides unterstützt.
2. Erstelle **Abwesend · Schlafzimmer**. Konfiguriere die Schlafzimmer mit einem anderen alternativen Zeitplan, **Pausieren** oder **Pausieren und ausschalten**.
3. Lass unveränderte Zonen außerhalb beider Profile. Sie verwenden weiter ihre Standardzeitpläne.
4. Öffne **Modi**, wähle **Neuer Modus**, nenne ihn **Away**, wähle beide Profile und speichere.
5. Wähle in **Aktive Konfiguration** zuerst **Ändern** und dann **Away**. Velair wendet beide Profile in einer atomaren Auswahl an.

Diese Zusammenstellung ist gültig, weil beide Profile unterschiedliche Zonen konfigurieren. Würden beide dasselbe Klimagerät konfigurieren, würde Velair den Modus ablehnen und verlangen, die Überlappung zu entfernen.

Derselbe Modus lässt sich aus einer Home-Assistant-Automation auswählen:

```yaml
alias: Use Away climate mode
triggers:
  - trigger: state
    entity_id: person.resident
    to: "not_home"
actions:
  - action: select.select_option
    target:
      entity_id: select.velair_mode
    data:
      option: Away
```

Eine weitere Automation kann die normalen Zeitpläne aller Zonen wiederherstellen:

```yaml
alias: Restore default climate schedules
triggers:
  - trigger: state
    entity_id: person.resident
    to: "home"
actions:
  - action: select.select_option
    target:
      entity_id: select.velair_mode
    data:
      option: Default
```

Ersetze Personenentität und sichtbare Modusnamen durch die deiner Home-Assistant-Installation. Wird ein Modus umbenannt, aktualisiere Automationen, die seine sichtbare Option wählen.

<a id="activate-a-profile"></a>
## Ein Profil aktivieren

Verwende die Wiedergabe-Schaltfläche in einer Profilzeile unter **Zeitpläne > Profilzeitpläne** zur direkten Aktivierung oder die gemeinsame Karte **Aktive Konfiguration** in der Übersicht beziehungsweise oben in **Modi**. Sie zeigt aktuellen Modus und angewendete Profile als zusammengehörige Konfiguration. Wähle **Ändern**, um einen Modus zu wählen, oder die separate Gruppe **Profil manuell aktivieren**. Eine direkte Profilauswahl ersetzt den aktiven Satz durch dieses Profil und wechselt den Modus zu **Manuell**. **Standard** bedeutet, dass kein alternatives Profil aktiv ist. Profile lassen sich außerdem direkt aus ihrer Zeile, der aktiven Konfiguration oder über `velair.activate_profile` aktivieren. Velair wendet den aktuell gültigen Block an, statt bis zur nächsten Zeitplangrenze zu warten. Das umfasst den letzten Block eines früheren Tages, wenn heute noch kein neuer begonnen hat.

Eine direkte Aktivierung fügt niemals ein Profil zum bisherigen Satz hinzu, auch nicht bei überschneidungsfreien Zonen. Zonen des vorherigen Modus oder Profilsatzes, die im neuen Profil fehlen, kehren sofort zu ihren Standardzeitplänen zurück. Sie behalten nicht die vorherige Konfiguration. Erstelle einen Modus mit allen erforderlichen überschneidungsfreien Profilen, wenn diese gemeinsam aktiviert werden sollen.

Aktivieren beendet temporäre Anpassungen in Zonen, deren wirksames Profilverhalten sich ändert. Eine bestehende globale oder zonenbezogene Pause behält Vorrang. Velair merkt das neue Profil und wendet es beim Fortsetzen des Zeitplaners oder der Zone an.

Die Übersicht verwendet in heutigem Zeitverlauf und nächsten Ereignissen den wirksamen Zeitplan jeder Zone. Durch das aktive Profil geänderte Zonen zeigen eine kompakte farbige Profilkennzeichnung mit Symbol und Namen; temporäre Anpassung oder Pause bleibt visuell maßgeblich, bis sie endet. Bestätigungen für Speichern, Aktivieren und Löschen verwenden die normale vorübergehende Velair-Benachrichtigung mit Schließen-Schaltfläche und Zeitbalken.

Moduswechsel und Profilaktivierungen zeigen außerdem einen globalen Vorgangsbalken während der Verarbeitung betroffener Zonen. Er bleibt beim Wechsel zwischen Paneltabs sichtbar. In Lovelace erscheint er nur in der Karte für die aktive Konfiguration, wo diese Aktionen ausgeführt werden. Der Zähler nennt von Velair fertig verarbeitete Zonen, einschließlich Zonen, deren Pause oder Übersteuerung keinen Klimabefehl benötigt. Er behauptet nicht, dass ein physischer Raum sein Ziel schon erreicht hat. Der Endzustand unterscheidet vollständigen Erfolg von einem abgeschlossenen Übergang mit einem oder mehreren Zonenfehlern. Erfolgreiche Ergebnisse verschwinden nach kurzer Bestätigungszeit automatisch. Teilweise und fehlgeschlagene Ergebnisse bleiben bis zum Schließen verfügbar, auch beim Tabwechsel.

Automationen und Skripte können verwenden:

```yaml
action: velair.activate_profile
data:
  profile_id: vacation
```

Füge im visuellen Home-Assistant-Automationseditor eine Aktion hinzu und suche nach **Velair: Klimaprofil aktivieren**. Diese Integrationsaktion ist getrennt von Schalter- und Auswahlelementaktionen bei Filterung nach dem Velair-Gerät. Trage die **Automations-ID** des Profils ein, die unter seinem Namen in Velair steht.

Verwende den ausdrücklichen Deaktivierungsdienst, um zu Standardzeitplänen zurückzukehren:

```yaml
action: velair.deactivate_profile
```

Weglassen von `profile_id` bei `velair.activate_profile` bleibt aus Kompatibilitätsgründen unterstützt. Profilkennungen sind stabil, auch wenn der sichtbare Name geändert wird. Direkte Aktivierung aus Panel oder Dienst setzt die native Modusauswahl auf `Manual`, auch wenn dasselbe Profil bereits aktiv war.

<a id="modes"></a>
## Modi

Ein Profil enthält keine beliebigen Bedingungen. Home Assistant bleibt die Entscheidungsebene. Velair stellt eine native Entität `select.velair_mode` bereit, damit Automationswerte im Modus-Tab verwaltet werden können, ohne einen weiteren Home-Assistant-Helfer zu erstellen.

Zwei integrierte Werte existieren immer und lassen sich weder umbenennen noch löschen:

- **Standard** deaktiviert Profile und stellt den Standardzeitplan jeder Zone wieder her.
- **Manuell** bedeutet, dass kein benutzerdefinierter Modus den aktiven Profilsatz steuert. Eine direkte Profilaktivierung führt normalerweise dorthin. Es wird als aktueller Zustand angezeigt, ist aber keine Aktion in der Velair-Auswahl. Wähle Standard oder einen eigenen Modus, um ihn zu verlassen. Die native Home-Assistant-Entität behält ihre Manual-Option zur Kompatibilität: Ihre Auswahl behält aktive Profile bei, löst sie aber von ihrem benutzerdefinierten Modus.

Erstelle eigene Werte wie Away, Vacation oder Home und ordne jedem ein oder mehrere gespeicherte Klimaprofile zu. Wähle in **Modi** **Neuer Modus**, trage den in Home Assistant sichtbaren Optionsnamen ein, wähle mindestens ein überschneidungsfreies Profil und speichere. Die Auswahl eines eigenen Werts aktiviert den vollständigen Satz atomar. Profile desselben Modus müssen verschiedene Zonen konfigurieren. Velair lehnt Überlappungen ab, statt einen stillschweigenden Vorrang anzuwenden. Mehrere Modi dürfen weiterhin dasselbe Profil referenzieren. Namen werden von Rand-Leerzeichen bereinigt, auf 255 Zeichen begrenzt und ohne Beachtung der Groß-/Kleinschreibung eindeutig gehalten. Weder integrierte Namen noch die reservierten Home-Assistant-Zustände `unknown` und `unavailable` sind zulässig.

Der Modus-Tab zeigt aktiven Modus und angewendete Klimaprofile gemeinsam in einer Karte **Aktive Konfiguration**. Eine gruppierte Auswahl führt zuerst Standard und eigene Modi auf, dann separat direkte Profilaktivierung. Manuell bleibt als Zustand sichtbar, lässt sich dort aber nicht auswählen. Eine Modusauswahl aktiviert alle zugeordneten Profile; direkte Profilauswahl ersetzt den Satz durch ein einzelnes Profil und wechselt zu **Manuell**. Moduszeilen zeigen Symbole und Farben der zugeordneten Profile, damit Modi und Profile auch bei gleichem Namen unterscheidbar bleiben. Die integrierten Zeilen erklären kurz, wann sie gelten.

Verwende in Automationen die normale Home-Assistant-Auswahlaktion:

```yaml
action: select.select_option
target:
  entity_id: select.velair_mode
data:
  option: Vacation
```

Moduskennungen bleiben beim Umbenennen sichtbarer Namen stabil, sodass die aktuelle Auswahl erhalten bleibt. Der sichtbare Optionsname ist jedoch der Home-Assistant-Entitätszustand. Automationen mit umbenannten oder gelöschten Optionen müssen deshalb aktualisiert werden.

Eine neue Zuordnung des aktuell gewählten Modus aktiviert den neuen Profilsatz atomar. Löschen des gewählten Modus behält dessen aktive Profile und setzt die Auswahl auf **Manuell**. Löschen eines Profils entfernt auch die damit verbundenen Modi und nur dieses Profil aus dem aktiven Satz. Wird der Satz leer, kehrt Velair zu **Standard** zurück.

<a id="seasonal-selection"></a>
## Saisonale Auswahl

Der [Blueprint für saisonale Klimasteuerung](blueprints/seasonal-climate-selection.de.md) kann nach einer stabilen Änderung anhand eines Tagesmaximums oder eines anderen Temperatursensors einen Modus wählen. Verknüpfe Winter- und Sommerprofile mit denselben Vorlagenzeiten und gib ihnen unterschiedliche Presets. Konfiguriere für mildes Wetter ein Profil mit Pause und Ausschalten, wenn keine Klimatisierung gewünscht ist. Koordiniere diese Automation mit Anwesenheitsregeln: Ein weiterer stabiler Wert kann einen manuell gewählten Abwesenheitsmodus ersetzen.

<a id="interactions"></a>
## Zusammenspiel mit anderen Funktionen

- Globale und zonenbezogene Pausen haben Vorrang vor Profilwechseln.
- Temporäre Anpassungen in betroffenen Zonen werden beim Aktivieren eines Profils beendet.
- Adaptive Vorkonditionierung wird anhand des wirksamen Profilzeitplans neu berechnet.
- Room Assist folgt dem Ziel des wirksamen Profilzeitplans.
- Umgebungskomfort bleibt reine Überwachung und wird nicht verändert.
- Heizen, Kühlen, Heiz-/Kühlbereiche, Ausschaltblöcke und unterstützte optionale Klimabedienelemente funktionieren wie in Standardzeitplänen.

<a id="restart-and-portability"></a>
## Neustart und Übertragbarkeit

Aktiver Profilsatz, eigene Modi und die gewählte Moduskennung werden im Velair-Backend gespeichert. Nach einem Home-Assistant-Neustart wird die native Auswahlentität daraus wiederhergestellt; sie aktiviert kein Profil eigenständig. Die bestehende Einstellung **Aktiven Zeitplan nach dem Start anwenden** steuert nur, ob Velair das aktuelle wirksame Ziel sofort an Klimageräte sendet. Bei deaktivierter Einstellung behält Velair das Profil und berechnet zukünftige Ereignisse, ohne beim Start Gerätezustände zu ändern. Bei aktivierter Einstellung wendet ein Profilzeitplan den aktuellen Block an, `Pause and turn off` schaltet die Zone aus und reines `Pause` lässt sie unverändert. Aktive temporäre Anpassungen, Zonenpausen und eine globale Zeitplanerpause behalten ihren normalen Vorrang.

Portable V5-Exporte können Profil- und Modusdefinitionen als separate Bereiche enthalten. Die aktive Profil- oder Modusauswahl ist niemals enthalten; ein Import kann daher kein anderes Profil stillschweigend aktivieren. Reiner Profilimport entfernt Modi, deren zugeordnete Profile nicht mehr existieren. Modusimport prüft jede Zuordnung und lehnt überlappende konfigurierte Zonen ab.

Wähle beim Export unter **Einstellungen > Übertragbarkeit** **Klimaprofile** und **Modi**. Prüfe und wähle beim Import beide Bereiche vor der Bestätigung. Die ausgewählten Definitionen werden überschrieben; aktiver Profilsatz und Modusauswahl werden jedoch niemals importiert.

Jeder Modus ordnet ein oder mehrere Profile mit überschneidungsfreien konfigurierten Zonen zu. Der vollständige Satz wird atomar aktiviert; direkte Profilaktivierung ersetzt ihn durch ein einzelnes Profil und wählt Manuell.
