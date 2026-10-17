<a id="climate-profiles"></a>
# Klimaprofile
<!-- velair-docs:start -->
Übersetzungen: [Englisches Original](climate-profiles.md) · [Español](climate-profiles.es.md) · [Français](climate-profiles.fr.md) · [Deutsch](climate-profiles.de.md) · [Italiano](climate-profiles.it.md) · [Nederlands](climate-profiles.nl.md) · [Polski](climate-profiles.pl.md) · [Português (Brasil)](climate-profiles.pt-br.md) · [Português (Portugal)](climate-profiles.pt-pt.md) · [Русский](climate-profiles.ru.md) · [Übersetzungsstatus](../translation-status.md)

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

Mit Klimaprofilen kann Velair mehrere Klimazonen zwischen abgestimmten Wochenplänen wechseln lassen, ohne deren Standardzeitpläne zu ersetzen. Home Assistant bleibt die Entscheidungsebene: Anwesenheit, Fenster, Jahreszeiten, Auswahlelemente, Sensoren oder andere Automationen entscheiden, wann ein Profil wechselt. Velair speichert, wendet an und zeigt das resultierende Klimaverhalten.

Ein **Profil** definiert eine alternative Klimaroutine für seine konfigurierten Zonen. Ein **Modus** wählt ein oder mehrere nicht überlappende Profile als **Basis** des Haushalts. Anschließend kannst du Profile als **Zonenausnahmen** anwenden, auch nur einen Teil eines Mehrzonenprofils, ohne andere Räume zu ändern. Lege eine Basis fest, wenn die ganze Konfiguration wechseln soll; Ausnahmen dienen unabhängigen Routinen.

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

Jede Profilzeile hält ihre Aktionen in einer eigenen rechten Spalte: als Basis festlegen, als Zonenausnahme anwenden und löschen. Auch bei geringer Breite bleiben sie neben dem Namen. Die Schaltflächen sind transparent und haben Abstand zum Rand; aktive Zustände verwenden Symbol und Farbe. Unter der Beschreibung stehen kompakte **Basis**-/ **Ausnahme**-Kennzeichnungen für aktuelle Verwendungen. Unbenutzte Profile haben keine Kennzeichnung. Die Basisaktion bleibt neutral, bis das Profil zur Basis gehört. Reine Ausnahmen heben die Ebenenaktion hervor. Eine vollständig übersteuerte Basis behält ihre Basisidentität. Dies beschreibt die gespeicherte Auswahl, nicht laufende Geräte. Die Zeile öffnet den Editor; Aktivierung und Ausnahmen ändern dessen Auswahl nicht. Wird das bearbeitete Profil nach Bestätigung gelöscht, wird sein Editor geleert.

Jede Zone mit **Profilzeitplan** speichert eine eigene **Tagesaufteilung**: **Einzelne Tage**, **Wochentage / Wochenende** oder **Alle Tage**. Die sieben Tageszellen behalten ihre Positionen; die Aufteilung wählt einen Tag, Wochentage/Wochenende oder die ganze Woche gemeinsam. Die Bearbeitung verändert diese Tage im Profilentwurf; **Profil speichern** speichert das ganze Profil. Bei Unterschieden prüfe die Varianten und wähle ausdrücklich eine Grundlage. Andere Tage bleiben unverändert. Aufteilung und Zeitplanentwurf bleiben bei einem vorübergehenden Verhaltenswechsel erhalten.

Benachbarte gewählte Zellen sind optisch verbunden; die Zeitleiste zeigt gemeinsame Blöcke. Unterschiedliche Konfigurationen erscheinen als kompakte Alternativen mit Übersichts-Zeitleisten und Sollwert-/Modusbeschriftungen. Identische Tage bilden eine Variante. Es gibt keine dauerhafte Blockliste darunter. Das Infosymbol zeigt bei Hover, Tastaturfokus oder Tippen alle Zeiten und Einstellungen, ohne die Grundlage zu wählen. Klicke oder tippe eine Variante; Hintergrund und Rahmen markieren genau eine Auswahl. Alle Varianten bleiben bis zum Speichern sichtbar. Pfeiltasten, Leertaste und Eingabe unterstützen die Auswahl.

Bei **Alle Tage** und **Wochentage / Wochenende** wähle eine Variante und speichere zuerst das Profil, bevor der gemeinsame Blockeditor verfügbar wird. Es gibt keine zusätzliche Ersetzungsbestätigung. Betroffen sind sieben Tage, fünf Wochentage oder zwei Wochenendtage; andere bleiben erhalten. Fehler beim Speichern erhalten die Auswahl. Änderungen gemeinsamer Blöcke werden danach normal mit dem Profil gespeichert. Eine gemischte Gruppe benötigt vor **Profil speichern** eine gewählte Grundlage. Zusammenfassungen neben Speichern nennen Quelle, Zone und Zieltage. Profil speichern umfasst auch andere ausstehende Profiländerungen. Visuell gleiche Varianten unterscheiden Vorlagen-/Preset-Abhängigkeiten durch kompakte Beschriftungen. Leere Varianten zeigen **Keine eigenen Blöcke**. Ihre Hilfe erklärt das Entfernen eigener Blöcke; ein leerer Tag ist kein Ausschaltbefehl. Siehe [Tagesaufteilungen und Gruppenbearbeitung](usage.de.md#create-a-daily-schedule).

Wähle für jedes verwaltete Klimagerät ein Verhalten:

- **Nimmt nicht teil**: dieses Profil beansprucht die Zone nicht.
- **Standardzeitplan**: weiterhin den normalen Wochenzeitplan der Zone verwenden.
- **Profilzeitplan**: einen vollständigen Wochenzeitplan aus dem Profil verwenden.
- **Pausieren** mit **Thermostat unverändert lassen**: geplante Änderungen stoppen und den aktuellen Gerätezustand beibehalten.
- **Pausieren** mit **Klimagerät ausschalten**: geplante Änderungen stoppen und das Gerät ausschalten.

**Standardzeitplan** beansprucht die Zone ausdrücklich, auch bei der Überlappungsprüfung. Eine Zone mit **Nimmt nicht teil** erbt die Basis oder Standard, wenn kein Basisprofil sie umfasst. Vorlagen können weiterhin als unabhängige Blöcke kopiert, nur mit ihren Zeiten und unabhängigen Klimaeinstellungen verknüpft oder vollständig schreibgeschützt übernommen werden. Vorlagen und eigene Blöcke können gemeinsame Velair-Presets referenzieren. Siehe [Block-Presets und verknüpfte Vorlagen](linked-schedules.de.md) und das [Winter-/Sommerbeispiel](linked-schedule-examples.de.md#2-winter-and-summer-with-one-set-of-times). Tagesklonen erhält Verknüpfungstyp, Zuordnungen reiner Zeitverknüpfungen und Preset-Verweise. Kopien auf andere Thermostate werden vor Entwurfsänderung geprüft; andere Tage behalten ihre Verknüpfungen. Löse die Verknüpfung, wenn der neue Tag unabhängig sein soll.

Für eine extern gesteuerte Zone wählen Profile und Modi die wirksame vollständige Woche, die Velair veröffentlicht, statt direkte `climate.*`-Aktionen auszulösen. **Standardzeitplan** veröffentlicht die normale Woche, **Profilzeitplan** die Profilwoche. **Pausieren** ist bei extern verwalteten Zonen nicht verfügbar. Der Profileditor berücksichtigt Reglerfähigkeiten als zusätzliche Validierung. Ein Veröffentlichungsfehler macht die gespeicherte Profil- oder Modusauswahl nicht rückgängig und betrifft keine lokal ausgeführten Zonen. Aktuelle Reglergrenzen und Bedeutung der Veröffentlichung stehen unter [Externe Zeitplanausführung](external-systems.de.md).

**Als Vorlage speichern** speichert aus dem bearbeiteten Profilzeitplan nur eine wiederverwendbare Vorlage über das Backend und lässt den ungespeicherten Profilentwurf unverändert. Für Kopien auf andere Klimageräte wähle sie im Klonbereich **Andere Thermostate** und dann **Kopieren**. Seine Beschriftung folgt der Aufteilung: ein Tag, Montag–Freitag, Samstag–Sonntag oder Alle Tage. Die Bestätigung nennt Ziele, ausgewählte Tage und Standard-/Pausenzonen, die zu **Profilzeitplan** wechseln. Nur entsprechende Wochentage werden ersetzt; andere gemerkte Tage und die Zielaufteilung bleiben erhalten. Die Kopie bleibt Profilentwurf. Tagesweises Klonen ist nur bei **Einzelne Tage** verfügbar. Gruppeneditoren lassen diesen Bereich und den Aufteilungswechsel-Kurzbefehl weg; verwende die normale **Tagesaufteilung**. Standard- und Profileditoren verwenden denselben ausgewählten Gruppenbereich für Kopien auf andere Thermostate. Velair prüft Zieltyp, HVAC-Modus, Grenzen und Temperaturschritt aller Ziele, bevor der Entwurf geändert wird. Nicht unterstützte Optionen werden je Ziel entfernt. Bleibt ein reiner Optionsblock ohne unterstützte Option oder ist Ziel/Modus inkompatibel, bleibt der gesamte Entwurf unverändert. Klone werden erst mit dem Profil dauerhaft gespeichert.

Jeder Profiltag verwendet denselben bearbeitbaren Zeitverlauf wie Standardzeitpläne und Vorlagen, einschließlich Ziehen und Größenänderung zum Anpassen der Blockzeiten. Zeitplanblöcke haben eine Startzeit, aber keine separate Endzeit. Der letzte Block gilt deshalb über Mitternacht und leere Wochentage hinweg, bis ein weiterer beginnt. Der Zeitverlauf zeigt den übernommenen Tagesanteil als unterscheidbares, nicht bearbeitbares Segment und nennt den Wochentag, an dem der Block tatsächlich konfiguriert ist.

Solange ein Profil zur Bearbeitung geöffnet bleibt, behält ein vorübergehender Wechsel einer Zone von **Profilzeitplan** zu **Standardzeitplan** oder **Pausieren** deren Wochenentwurf. Erneute Auswahl von **Profilzeitplan** stellt die ungespeicherten Blöcke wieder her. Speichern mit Standard oder Pause speichert nur das gewählte Verhalten, nicht den verborgenen Zeitplanentwurf. Die Thermostatauswahl zeigt Anzeigenamen, der aktive Editor zusätzlich die Entitäts-ID. Profilmetadaten und Zeitpläne werden weiterhin gemeinsam als ein atomarer Vorgang gespeichert; ein Thermostatwechsel speichert keinen Teilentwurf.

Mehrere Profile können gemeinsam eine von einem Modus koordinierte Basis bilden. Ihre Zonen dürfen sich nicht überlappen. Ausnahmen können einzelne Zonen der Basis ersetzen: Jedes Klimagerät hat weiterhin genau eine wirksame Routine. Zeitplanblöcke werden nicht vermischt und frühere Ausnahmen bilden keinen Prioritätsstapel.

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

Verwende die Wiedergabe-Schaltfläche einer Profilzeile unter **Zeitpläne > Profilzeitpläne** oder **Aktive Konfiguration** in Übersicht und Modi. Die Karte trennt **Basis** und **Ausnahmen** und zeigt, ob die Basis von einem Modus, einem Profil, mehreren Profilen oder Standard stammt. Unter **Ändern** wählst du einen Modus oder die Gruppe **Profile**. Eine Profilzeile legt das Profil als vollständige Basis fest; das Ebenensymbol daneben wendet nur seine konfigurierten Zonen als Ausnahmen an. Direkte Profilauswahl ersetzt den aktiven Basissatz durch dieses Profil und setzt den nativen Modus auf **Manuell**. **Standard** bedeutet keine alternativen Basisprofile. Die Aktivierung ist auch über die Profilzeile oder <code>velair.activate_profile</code> möglich. Velair wendet den derzeit gültigen Block sofort an, einschließlich Wochenkontinuität aus einem früheren Tag.

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

Der Modus-Tab zeigt gewählte Basis und Zonenausnahmen in **Aktive Konfiguration**. Die gruppierte Auswahl führt zuerst Standard und eigene Modi, dann getrennte Basis- und Ausnahmeaktionen für Profile auf. Manuell bleibt ein Zustand der nativen Home-Assistant-Auswahl und ist kein Basisname im Panel. Ein Modus aktiviert seine zugeordneten Profile; direkte Profilauswahl ersetzt den Basissatz durch dieses Profil und setzt die native Auswahl auf **Manuell**. Moduszeilen zeigen Symbole und Farben ihrer Profile, damit beide bei gleichen Namen unterscheidbar bleiben. Integrierte Zeilen erklären kurz ihren Zweck.

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

<a id="a-base-with-independent-zone-exceptions"></a>
## Eine Basis mit unabhängigen Zonenausnahmen

Ein Profil kann mehrere Räume umfassen. Als Ausnahme ersetzt es nur die Routine seiner ausdrücklich konfigurierten Räume. Andere Räume und die Profildefinition bleiben unverändert. Jeder Raum verwendet eine vollständige Wochenroutine; Blöcke mehrerer Profile werden nie gemischt.

Beispiel: **Winter** umfasst Büro, Wohnzimmer und Schlafzimmer. **Telearbeit** umfasst Büro und Wohnzimmer, **Gäste** Wohnzimmer und Gästezimmer:

| Änderung | Büro | Wohnzimmer | Schlafzimmer | Gästezimmer |
| --- | --- | --- | --- | --- |
| Basis Winter wählen | Winter | Winter | Winter | Standard |
| Telearbeit anwenden | Telearbeit | Telearbeit | Winter | Standard |
| Später Gäste anwenden | Telearbeit | Gäste | Winter | Gäste |
| Wohnzimmer zur Basis zurückführen | Telearbeit | Winter | Winter | Gäste |

Die Rückkehr des Wohnzimmers zur Basis stellt Telearbeit nicht wieder her; Ausnahmen haben keinen Verlaufsstapel. Ausdrücklich Standard zu wählen verwendet dagegen den regulären Zonenzeitplan, auch wenn die Basis dort eine andere Routine vorsieht.

Verwende **Als Ausnahme anwenden** in Aktive Konfiguration oder eine Automation:

```yaml
action: velair.apply_profiles
data:
  profile_ids: [remote_work]
```

Eine Anfrage darf mehrere Profile nur bei unterschiedlichen Zonen anwenden. [remote_work, guests] wird vollständig abgelehnt, weil beide das Wohnzimmer umfassen. Eine spätere separate Gäste-Anfrage ersetzt bewusst dessen Ausnahme und erhält das Büro.

Für nur einen Raum eines Mehrzonenprofils:

```yaml
action: velair.set_zone_profile
data:
  entity_id: climate.office
  profile_id: remote_work
```

Das Profil muss diesen verwalteten Raum ausdrücklich enthalten. <code>profile_id: null</code> erzwingt Standard. Entferne die Ausnahme, um die aktuelle Basis zu erben:

```yaml
action: velair.clear_profile_overrides
data:
  entity_id: [climate.office, climate.living_room]
```

Ersetze die ganze Basis und entferne alle Ausnahmen ohne einen Modus:

```yaml
action: velair.activate_profiles
data:
  profile_ids: [winter_office, winter_bedrooms]
```

Basisprofile dürfen sich nicht überlappen. Eine leere Aktivierungsliste wählt Standard; leere Anwenden-/Löschen-Listen bewirken nichts. Neue Aktionen verlangen ihre Felder: Weglassen bedeutet niemals „alle Räume“ oder „Standard“.

Aktive Konfiguration zeigt **Basis** und Typ über dem Namen, in zwei kompakten Ebenen auf Telefonen und schmalen Karten. Lange Namen umbrechen. Die Abdeckung zählt die von der Basis umfassten verwalteten Zonen, die sie weiterhin erben. Ausnahmen, einschließlich ausdrücklichem Standard oder demselben Profil, werden nicht gezählt. Zonen außerhalb einer Profilbasis verwenden Standard und zählen nicht zu dieser Basis. Eine Standardbasis umfasst alle verwalteten Zonen. Dies beschreibt Auswahlzuständigkeit, keine Geräteaktivität. Eine leere Basis ist von einer vollständig durch Ausnahmen ersetzten Basis unterscheidbar.

**Verteilung im Haushalt** unter der Basiszusammenfassung ist anfangs geschlossen. Öffne die Beschriftung für den 6-Pixel-Balken und seine vollständige Legende; erneute Auswahl oder Escape schließt beides. Die Überschrift bleibt stehen, während der Inhalt mit kurzer, bei reduzierter Bewegung angepasster Animation nach unten wächst. Der Balken umfasst alle verwalteten Zonen in Profilfarben, die Beschriftung nennt die Haushaltsgesamtzahl unabhängig von der Basisabdeckung. Ausnahmesegmente umfassen auch Zonen außerhalb der Basis und stimmen mit der Ausnahmeliste überein. Nicht abgedeckte Zonen ohne Ausnahme bilden ein neutrales Standardsegment. Die kompakte Legende verwendet 14-Pixel-Profilsymbole, Namen und Herkunft sowie rechtsbündige Zählwerte. Ausdrückliche Standardausnahmen sind ebenfalls neutral. Basis, Ausnahme und Ersatz bleiben bei gleichen Farben unterscheidbar. Die Basisabdeckung erscheint separat und nur einmal. Eine leere Profilbasis kann einen Haushaltsbalken mit Standardzonen haben; ohne verwaltete Zonen entfällt er. Beteiligte Basisprofile stehen in der ausgeklappten Legende; Modusbasen wiederholen darüber keine Komponentenliste.

Auf Desktop nimmt die Basis weniger Breite als Ausnahmen ein; ihr Symbol bleibt oben mit Name und Typ ausgerichtet. Die Ausnahmenüberschrift verwendet wie die Profilaktionen das Ebenensymbol. **Ausnahmen** listet Profile samt Zonenzahl, ausdrückliche Standardausnahmen als eigene Gruppe. Raumnamen bleiben zunächst verborgen. Die ganze Ausnahmezeile öffnet ihre Räume darunter und erhält die anderen Ausnahmen. Erneute Auswahl oder Escape schließt, eine andere Gruppe schließt die vorherige. Kurze Übergänge beachten reduzierte Bewegung. Zeile und Zählwert bleiben an Ort und Stelle; Details wachsen nach unten und schieben folgende Zeilen. Lange Raumlisten scrollen intern. Eine unveränderte Basis zeigt **Keine Ausnahmen**, die Basis bleibt auch bei vollständiger Übersteuerung sichtbar. Es gibt keinen separaten Zoneneditor in Aktive Konfiguration; verwende dokumentierte Zonenaktionen.

Die native Modusauswahl zeigt bei Ausnahmen Manual. Nach Entfernen aller Ausnahmen kehrt der ursprüngliche Modusname zurück, sofern er noch existiert. Eigener Modus, Standard, einzelnes Profil oder vollständige Profilliste ersetzen ausdrücklich die Basis und löschen Ausnahmen. Die native Option Manual löst nur die Modusverknüpfung und erhält Basis und Ausnahmen.

Bearbeiten eines Basismodus erhält seine Ausnahmen. Profilumbenennungen und -änderungen behalten lebende Verweise; Zeitplanänderungen wirken auf nutzende Räume. Hinzufügen eines Raums zum Profil erweitert keine zuvor auf andere Räume angewendete Ausnahme. Entferne eine Ausnahme, bevor du den referenzierten Raum aus ihrem Profil entfernst. Profillöschung oder Import ohne dieses Profil entfernt seine Ausnahmen und führt die Räume zur verbleibenden Basis oder Standard zurück.

Home Assistant entscheidet weiterhin über Saison, Anwesenheit und persönliche Routine. Ein Saisonmodus ist eine vollständige Auswahl, keine zusätzliche Ebene über Raumausnahmen. Berechne relevante Raumauswahlen nach Saisonwechsel erneut. Aktionen für verschiedene Räume lassen sich kombinieren; konkurrierende Aktionen desselben Raums werden der Reihe nach angenommen. Eine vollständige Basisauswahl kann alle ersetzen.

Alle ausdrücklichen Auswahlaktionen, auch wiederholte, brechen eine ausstehende Rückkehr nach Hause ab. Leere Anwenden-/Löschen-Listen nicht. Der Abbruch kann Vorbereitung anderswo im Haus beeinflussen. Er wird getrennt von der folgenden Auswahl gespeichert: Schlägt deren Speichern fehl, kann die vorherige Auswahl bei bereits abgebrochener Rückkehr bestehen bleiben. Ungültige Anfragen brechen sie nie ab.

Auswahländerungen werden gemeinsam gespeichert, Geräte können sie jedoch zu unterschiedlichen Zeiten anwenden oder einzelne Fehler melden. Pausen und Übertragungsbeschränkungen behalten Vorrang. Ändert sich nur die Zuordnung bei gleicher wirksamer Routine, wird weder eine temporäre Anpassung beendet noch ein doppelter Klimabefehl gesendet. Extern ausgeführte Räume veröffentlichen ihre wirksame Woche mit den bestehenden Anbietergrenzen. Profile heben keine gemeinsamen Gerätebeschränkungen auf.

Basis und Ausnahmen überstehen Neustarts. Portable Exporte enthalten Definitionen, nicht diese aktive Auswahl; ein Import aktiviert keine neuen Profile.

<a id="seasonal-selection"></a>
## Saisonale Auswahl

Der [Blueprint für saisonale Klimasteuerung](blueprints/seasonal-climate-selection.de.md) kann nach einer stabilen Änderung anhand eines Tagesmaximums oder eines anderen Temperatursensors einen Modus wählen. Verknüpfe Winter- und Sommerprofile mit denselben Vorlagenzeiten und gib ihnen unterschiedliche Presets. Konfiguriere für mildes Wetter ein Profil mit Pause und Ausschalten, wenn keine Klimatisierung gewünscht ist. Koordiniere diese Automation mit Anwesenheitsregeln: Ein weiterer stabiler Wert kann einen manuell gewählten Abwesenheitsmodus ersetzen.

Blöcke mit **Nur Temperatur** behalten ihre Richtlinie in Profilen, Presets, Vorlagen und verknüpften Vorlagenbindungen. Profil- oder Modusaktivierung aktualisiert ihren Sollwert ohne HVAC-Moduswechsel und schaltet ein ausgeschaltetes Klimagerät nicht ein. Die Integration muss Sollwerte im ausgeschalteten Zustand akzeptieren.

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
