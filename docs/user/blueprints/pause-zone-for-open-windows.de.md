<a id="pause-a-zone-while-windows-are-open"></a>
# Zone bei offenen Fenstern pausieren
<!-- velair-docs:start -->
Übersetzungen: [Englisches Original](pause-zone-for-open-windows.md) · [Español](pause-zone-for-open-windows.es.md) · [Français](pause-zone-for-open-windows.fr.md) · [Deutsch](pause-zone-for-open-windows.de.md) · [Italiano](pause-zone-for-open-windows.it.md) · [Nederlands](pause-zone-for-open-windows.nl.md) · [Polski](pause-zone-for-open-windows.pl.md) · [Português (Brasil)](pause-zone-for-open-windows.pt-br.md) · [Português (Portugal)](pause-zone-for-open-windows.pt-pt.md) · [Русский](pause-zone-for-open-windows.ru.md) · [Übersetzungsstatus](../../translation-status.md)

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

Pausiere ein oder mehrere von Velair verwaltete Klimageräte, wenn mindestens ein ausgewähltes Fenster oder eine Tür offen bleibt. Ihre Zeitpläne werden erst fortgesetzt, wenn jeder Kontakt bestätigt geschlossen ist und jede aktive Pause weiterhin dieser Automation gehört. Home Assistant warnt, wenn ein nicht verfügbarer Kontakt ein sicheres Fortsetzen verhindert.

<p>
  <a href="https://my.home-assistant.io/redirect/blueprint_import/?blueprint_url=https%3A%2F%2Fraw.githubusercontent.com%2Fcgonfer%2Fvelair%2Fmain%2Fblueprints%2Fautomation%2Fvelair%2Fwindow_pause.yaml"><img src="https://my.home-assistant.io/badges/blueprint_import.svg" alt="Home Assistant öffnen und den Blueprint zum Pausieren einer Zone bei offenen Fenstern importieren" height="28"></a>
  <a href="https://raw.githubusercontent.com/cgonfer/velair/main/blueprints/automation/velair/window_pause.yaml"><img src="https://img.shields.io/badge/YAML_source-View-24292F?style=for-the-badge&amp;logo=github&amp;logoColor=white" alt="YAML-Quelldatei zum Pausieren einer Zone bei offenen Fenstern öffnen"></a>
</p>

[Änderungsverlauf](../../../blueprints/changelogs/window_pause.md) · [Zurück zum Blueprint-Index](../blueprints.de.md)

Fragen, Testergebnisse und konstruktive Rückmeldungen sind im [offiziellen Blueprint-Thema im Home-Assistant-Community-Forum](https://community.home-assistant.io/t/velair-blueprint-pause-a-zone-while-windows-are-open/1021389) willkommen.

<a id="when-to-use-it"></a>
## Wann der Blueprint sinnvoll ist

Verwende diesen Blueprint, wenn das Öffnen eines Fensters oder einer Tür Velair vorübergehend daran hindern soll, ein oder mehrere Klimageräte zu verändern, die dieselben Öffnungen betreffen. Er eignet sich für Heiz- und Kühlsysteme und kann die Klimageräte entweder in ihrem aktuellen Zustand belassen oder während der Pause ausschalten.

<a id="requirements"></a>
## Voraussetzungen

- Blueprint-Version 1.0.0, Velair ab 1.6.0 und Home Assistant ab 2024.6.0. Velair 1.6.0 stellt die unabhängigen, gleichzeitig aktiven Pausengründe mit eigener Zuordnung bereit, die dieser Blueprint verwendet.
- Ein oder mehrere bereits von Velair verwaltete Klimageräte.
- Eine oder mehrere `binary_sensor`-Entitäten mit Geräteklasse `window`, `door` oder `opening`.
- Bei jedem gewählten Kontakt muss `on` offen und `off` geschlossen bedeuten.

<a id="configuration"></a>
## Konfiguration

- **Managed thermostats:** alle von Velair verwalteten Klimageräte, die gemeinsam pausiert und fortgesetzt werden sollen.
- **Windows and doors:** jede Öffnung, die diese Zone betrifft.
- **Climate action while paused:** aktuellen Zustand beibehalten oder Klimagerät ausschalten.
- **Pause ID:** eine stabile Zuständigkeitskennung. Behalte für eine Automation den Standardwert oder verwende für jede separate Automation, die dasselbe Thermostat steuert, eine andere ID.
- **Open delay:** wie lange mindestens eine Öffnung offen bleiben muss, bevor pausiert wird.
- **Close delay:** wie lange alle Öffnungen geschlossen bleiben müssen, bevor fortgesetzt wird.
- **Availability warning delay:** wie lange ein Kontakt `unknown` oder `unavailable` bleiben muss, bevor eine Home-Assistant-Benachrichtigung erscheint. Der Standard beträgt 5 Minuten.

<a id="example"></a>
## Beispiel

Für ein Wohnzimmer mit zwei Fenstern:

```text
Managed thermostats:
  - climate.living_room
  - climate.living_room_radiator
Windows and doors:
  - binary_sensor.living_room_left_window
  - binary_sensor.living_room_right_window
Climate action while paused: Turn off
Open delay: 2 minutes
Close delay: 30 seconds
Availability warning delay: 5 minutes
```

Bleibt eines der Fenster zwei Minuten offen, pausiert der Blueprint beide Wohnzimmer-Klimageräte und schaltet sie aus. Nach dem Schließen des letzten Fensters und 30 Sekunden mit beiden Kontakten geschlossen setzt er jeden aktiven Zeitplan fort.

<a id="how-it-works"></a>
## Funktionsweise

Home Assistant beobachtet drei zusammengefasste Bedingungen: mindestens ein Kontakt ist offen, alle Kontakte sind geschlossen und mindestens ein Kontakt ist `unknown` oder `unavailable`. Jede verwendet einen nativen Template-Auslöser mit ihrer konfigurierten `for`-Dauer. Wird die zusammengefasste Bedingung vor Ablauf falsch, setzt Home Assistant ihren Timer zurück und führt keine Aktion aus. Nach Ablauf eines Timers prüft die kurze Aktion den gesamten Kontaktsatz erneut, bevor sie pausieren, fortsetzen oder warnen kann.

Öffnungssteuerung, Schließungssteuerung und Verfügbarkeitsdiagnose verwenden unabhängige ereignisgesteuerte Auslöser. Ein offener Kontakt kann daher nach der Öffnungsverzögerung pausieren, auch wenn ein anderer gewählter Kontakt nicht verfügbar ist. Der nicht verfügbare Kontakt verhindert weiterhin, dass „alle geschlossen“ wahr wird und die Zone fortgesetzt wird.

Bleibt ein Kontakt für die Warnverzögerung `unknown` oder `unavailable`, erstellt Home Assistant eine dauerhafte Benachrichtigung für den vollständigen Thermostatsatz. Sie nennt betroffene Kontakte und ausgewählte Thermostate und erklärt, warum sie nicht fortgesetzt werden. Der Zustand wird nach der Verzögerung erneut geprüft. Sind alle Kontakte wiederhergestellt, endet ein älterer Lauf daher vor der Erstellung der Benachrichtigung. Ein zusammengefasster Wiederherstellungsauslöser entfernt die Warnung. Die deterministische Benachrichtigungs-ID sorgt dafür, dass spätere Läufe dieselbe Warnung aktualisieren statt Duplikate zu erzeugen.

Nach dem Home-Assistant-Start führt ein Abgleichslauf die drei Prüfungen als interne parallele Zweige aus. Jeder prüft zuerst seine zusammengefasste Bedingung, wartet bis zur konfigurierten Dauer auf die Gegenbedingung und endet sofort, wenn diese eintritt. Der Öffnungszweig kann daher Klimageräte pausieren, während der Verfügbarkeitszweig noch wartet. Er handelt nur nach Ablauf der Wartezeit und erneuter erfolgreicher Gesamtprüfung. Home Assistant kann nicht rekonstruieren, wie lange eine Bedingung vor dem Start galt. Diese unterbrechbaren Starttimer beginnen daher wieder bei null. Der normale Betrieb verwendet anschließend die oben beschriebenen durchgängigen Template-Auslösertimer. Es gibt keine regelmäßigen Abfragen.

Automationsläufe können sich überlappen. Ein `opened_due`-Ereignis wird deshalb nicht blockiert, während der Verfügbarkeitszweig beim Start wartet. Diese Wartezeit belegt nur einen der begrenzten Parallelplätze. Die Aktionen gelangen sicher zum aktuellen Zustand: Jeder Klimagerätedurchlauf prüft den zusammengefassten Kontaktzustand erneut, Velair führt Übersteuerungsänderungen je Klimagerät nacheinander aus, und bei geänderten Bedingungen setzt ein entgegengesetzter Gesamtauslöser die spätere Pausen- oder Fortsetzungsentscheidung um.

<a id="safety-and-precedence"></a>
## Sicherheit und Vorrang

Der Blueprint erstellt jede Pause mit der konfigurierten **Pause ID**. Der Standard ist `velair_window_guard`; Velair speichert diese Zuständigkeit unabhängig für jedes ausgewählte Thermostat.

- Er ersetzt keine manuelle Pause und keine Pause einer anderen Automation.
- Das Schließen aller Fenster beendet nur Pausen mit derselben ID.
- Manuelles Pausieren oder Fortsetzen in Velair behält Vorrang.
- Bestehende Skripte und Automationen ohne `pause_id` behalten ihr bisheriges Verhalten.
- Kontakte mit `unknown` und `unavailable` gelten niemals als sicher geschlossen.
- Verfügbarkeitswarnungen umgehen oder verändern die Pausenzuständigkeit nicht. Sie erklären nur, warum ein sicheres Fortsetzen nicht möglich ist.

Jedes Klimagerät erhält einen einzelnen Dienstaufruf, unmittelbar davor wird der relevante zusammengefasste Kontaktzustand erneut geprüft. Ein Home-Assistant-Dienstfehler wird in der Automationsspur gespeichert. Mit `continue_on_error` fährt der Blueprint trotzdem bei den übrigen Klimageräten fort. Änderungen von temporären Anpassungen, Pause, Fortsetzen und Ablauf werden weiterhin unabhängig je Klimazone nacheinander ausgeführt.

<a id="limitations"></a>
## Grenzen

- Verwende vorzugsweise eine Automation mit allen relevanten Öffnungen für denselben Thermostatsatz.
- Müssen separate Fensterautomationen dasselbe Thermostat steuern, gib jeder eine andere stabile **Pause ID**. Sie erzeugen dann unabhängige Pausengründe, und jede kann nur ihren eigenen entfernen.
- Der Blueprint kann Änderungen einer Infrarotfernbedienung nicht zuverlässig auswerten, wenn die zugrunde liegende Klimaintegration sie nicht an Home Assistant meldet.
- Die unterbrechbaren Timer zum Startabgleich beginnen bei null, da Home Assistant keinen Timerverlauf vor dem Neustart wiederherstellen kann.
- Benachrichtigungen hängen von der integrierten Home-Assistant-Integration `persistent_notification` ab.
- Die Benachrichtigungs-ID verwendet die Entitäts-ID der Home-Assistant-Automation und bleibt dadurch kurz und unabhängig von Auswahl oder Reihenfolge der Thermostate. Nach einem Umbenennen kann die alte Benachrichtigung für manuelles Entfernen bestehen bleiben.
- Bis zu 50 Läufe dürfen sich überlappen. Home Assistant warnt, wenn eine ungewöhnliche Ereignisflut alle Plätze belegt; normale bedingungsgesteuerte Läufe bleiben kurz.

<a id="troubleshooting"></a>
## Fehlerbehebung

- Pausiert die Zone nie, prüfe, ob mindestens ein gewählter Kontakt bei offenem Fenster `on` meldet und länger als die Öffnungsverzögerung offen bleibt.
- Wird die Zone nicht fortgesetzt, prüfe, ob alle gewählten Kontakte `off` melden. Nach der Verfügbarkeitswarnverzögerung nennt die dauerhafte Benachrichtigung Kontakte, die weiterhin `unknown` oder `unavailable` melden.
- Bleibt eine Warnung nach Wiederherstellung erhalten, prüfe, ob der Kontakt ein neues Zustandsereignis erzeugt hat. Neuladen oder Ausführen der Automation bewertet ebenfalls den vollständigen Satz neu und entfernt eine veraltete Warnung.
- Meldet ein Dienst eine nicht verwaltete Entität, füge das Klimagerät Velair hinzu. Home-Assistant-Dienstfehler stoppen die übrigen Klimageräte nicht. Prüfe die Automationsspur, um einzelne Fehler zu finden.
- Bleibt die Zone nach dem Fensterschließen pausiert, prüfe, ob die aktive Pause manuell oder von einer anderen Automation erstellt wurde. Der Blueprint lässt sie bewusst unverändert.
- Steuern mehrere Automationen dasselbe Klimagerät, fasse ihre Öffnungen zusammen oder prüfe, ob jede eine andere stabile **Pause ID** verwendet.

<a id="updating-and-customizing"></a>
## Aktualisieren und anpassen

Importiere die fortlaufende `main`-URL erneut, um eine kompatible Aktualisierung zu installieren. Aktualisierungen von Version 1 behalten Eingabenamen bei; neue Eingaben haben einen Standardwert, sodass keine Automationsmigration nötig ist. Eine zukünftige inkompatible Version verwendet einen neuen Dateinamen und eine neue Hauptversion, statt diese URL zu ersetzen. Velair bearbeitet zur Blueprint-Migration niemals Home-Assistant-Automationen oder `.storage`. Verwende **Kontrolle übernehmen** nur, wenn deine Installation Verhalten über die angebotenen Kontakte, Aktionen und Verzögerungen hinaus benötigt. Die unabhängige Automation erhält dann keine Blueprint-Aktualisierungen mehr.
