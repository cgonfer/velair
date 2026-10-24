<a id="external-changes-and-manual-adjustment"></a>
# Externe Änderungen und manuelle Anpassungen
<!-- velair-docs:start -->
Übersetzungen: [Englisches Original](manual-control.md) · [Español](manual-control.es.md) · [Français](manual-control.fr.md) · [Deutsch](manual-control.de.md) · [Italiano](manual-control.it.md) · [Nederlands](manual-control.nl.md) · [Polski](manual-control.pl.md) · [Português (Brasil)](manual-control.pt-br.md) · [Português (Portugal)](manual-control.pt-pt.md) · [Русский](manual-control.ru.md) · [Übersetzungsstatus](../translation-status.md)

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

Velair erkennt, wenn sich HVAC-Modus oder Zieltemperatur einer verwalteten `climate.*`-Entität ändern, ohne einem von Velair gesendeten Befehl zu entsprechen. Für jedes Gerät entscheidest du, ob Velair die automatische Steuerung beibehält oder dieser externen Änderung durch eine manuelle Anpassung Vorrang gibt.

Eine externe Anpassung kann stammen von:

- der normalen Home-Assistant-Klimakarte;
- einem physischen Thermostat oder einer IR-Fernbedienung, deren Integration den neuen Zustand meldet;
- einer Herstelleranwendung, deren Integration Home Assistant aktualisiert;
- einem Skript oder einer Automation mit direktem Aufruf der Klimaentität;
- jeder anderen Quelle, die die Entität außerhalb von Velair verändert.

Velair nennt den abgegebenen Steuerungszustand **Manuelle Anpassung**. „Manuell“ beschreibt, wer gerade ein Klimagerät steuert, und behauptet nicht, dass ein Mensch die Änderung vorgenommen hat.

<a id="the-two-independent-questions"></a>
## Zwei unabhängige Fragen

Velair trennt diese Begriffe immer:

| Begriff | Geltungsbereich | Bedeutung |
| --- | --- | --- |
| Automatische Zeitplanung | Ein verwaltetes Klimagerät | Velair darf den wirksamen Zeitplan dieses Geräts übermitteln. |
| Manuelle Anpassung | Ein verwaltetes Klimagerät | Ein externer Sollwert oder HVAC-Modus hat vorübergehend Vorrang. |
| Velair-Modus **Manuell** | Der gesamte aktive Profilsatz | Profile wurden direkt statt über einen eigenen gespeicherten Modus gewählt. |
| Temporäre Anpassung | Ein Klimagerät | Velair wendet bewusst ein vorübergehendes Ziel an. |
| Zonenpause | Ein Klimagerät | Ein oder mehrere unabhängige Gründe verhindern die Zeitplanübermittlung, optional mit Ausschalten. |
| Globale Pause oder Stopp | Alle Klimageräte | Der Zeitplaner ist global pausiert oder deaktiviert. |

Diese Zustände können gleichzeitig bestehen. Beispielsweise kann der Velair-Modus **Manuell** das Profil `Sleep` wählen, während `climate.living_room` eine **Manuelle Anpassung** hat. Das Profil bleibt maßgebliche Zeitplankonfiguration, aber dieses Gerät behält seine externe Einstellung bis zum Ende der manuellen Anpassung.

<a id="what-velair-observes"></a>
## Was Velair beobachtet

Velair beobachtet folgende Steuerungsfelder verwalteter Klimageräte:

- `hvac_mode`, dargestellt durch den Entitätszustand, einschließlich `off`, `heat`, `cool`, `auto` und `heat_cool`;
- `temperature` für ein Einzelziel;
- `target_temp_low` und `target_temp_high` für ein natives Bereichsziel.

Alleinige Änderungen dieser Werte beginnen keine manuelle Anpassung:

- `current_temperature` oder `hvac_action`;
- Luftfeuchtigkeitsmesswerte;
- Verfügbarkeit;
- Lüfter-, Preset-, Schwenk- oder Zielluftfeuchtigkeitsoptionen;
- Fähigkeitsattribute wie Mindesttemperatur oder unterstützte Modi.

Ein Wechsel von `cool` mit `24 °C` zu `cool` mit `23 °C` ist beispielsweise eine erkannte Zieländerung. Ein wärmer werdender Raum von `24 °C` auf `25 °C` bei unverändertem Ziel ist keine.

Nur in der Velair-Einrichtung gewählte Klimageräte werden überwacht. Anfangszustände beim Start und Übergänge von oder zu `unknown` oder `unavailable` werden ignoriert.

<a id="how-velair-recognizes-its-own-commands"></a>
## Wie Velair eigene Befehle erkennt

Alle Velair-Klimabefehle laufen durch einen internen Dienstadapter. Vor jedem Home-Assistant-Dienstaufruf vermerkt Velair:

- die verwaltete Entität;
- erwartete Steuerungsfelder und Werte;
- einen Home-Assistant-`Context` für den Dienstaufruf;
- einen kurzen, nur zur Laufzeit gültigen Ablaufzeitpunkt.

Bei einer Entitätsänderung gleicht Velair jedes geänderte Feld mit diesen Erwartungen ab, einschließlich veröffentlichtem `target_temp_step`. Das erfolgt je Feld: Enthält ein Update eine Velair-Temperatur und einen unabhängigen HVAC-Modus, wird nur die Temperatur Velair zugeordnet.

Manche Geräte melden beim Verarbeiten eines Befehls mehrere Werte. Sie kehren kurz zu einem alten Ziel zurück, veröffentlichen Zwischenziele oder melden Modus und Temperatur in anderer Reihenfolge. Velair hält für die von ihm geänderten Felder eine kurze begrenzte Stabilisierungsphase, damit solche Geräteupdates keine falsche manuelle Anpassung erzeugen. Ein Echo startet sie nicht neu; sie wird beim Rückkehren der vollständigen Home-Assistant-Dienstfolge abschließend festgelegt. Eindeutig benutzerinitiierte Home-Assistant-Änderungen oder Änderungen eines anderen erkennbaren Skripts beziehungsweise einer Automation bleiben extern. Änderungen nach der Stabilisierung werden normal behandelt.

Lässt sich ein anonymes Update während der Stabilisierung nicht zuverlässig von der Geräteangleichung unterscheiden, behält Velair vorsichtig die automatische Steuerung. So wird ein abgelehnter oder verzögerter Velair-Befehl nicht zur falschen manuellen Anpassung. Dieser Zustand existiert nur zur Laufzeit und wird beim Neustart gelöscht. Weicht das Gerät nach Ablauf noch vom angeforderten Wert ab, bleibt die automatische Steuerung bestehen und Velair vermerkt eine Laufzeitwarnung zur Befehlsstabilisierung. Die nächste aktuelle Diagnose-Momentaufnahme zeigt sie; der Bericht enthält erwartete und beobachtete Werte. Velair wiederholt den Befehl nicht blind und macht daraus keine verspätete manuelle Anpassung.

Die Erwartungsliste ist begrenzt, läuft automatisch ab, wird nie dauerhaft gespeichert und fragt nicht regelmäßig ab. Quellen müssen den Home-Assistant-`Context` für einen Abgleich nicht erhalten, auch wenn er die Zuordnung präziser macht.

Ein beobachtetes Steuerungsfeld ohne Zuordnung zu einem Velair-Befehl gilt als Nicht-Velair. Das ist eine Zuordnung, keine Identität: Velair behauptet nicht zu wissen, ob Mensch, Fernbedienung, Automation, Herstellerdienst oder Gerätefirmware die Änderung verursacht hat.

<a id="choose-a-policy"></a>
## Eine Richtlinie wählen

Öffne **Einstellungen**, suche das verwaltete Klimagerät und verwende **Externe Anpassungen**. Das Backend speichert die Richtlinie je Gerät; sie ist in portablen Velair-Zonendaten enthalten. Sie gilt ab der nächsten externen Änderung und verändert oder beendet keine bereits aktive manuelle Anpassung.

<a id="keep-automatic"></a>
### Automatisch beibehalten

Interner Wert: `keep_automatic`.

Das ist der Standard, auch für ältere Konfigurationen vor Einführung externer Anpassungen. Velair meldet die Änderung, belässt automatische Zeitplanung und ermittelt sofort die aktuelle maßgebliche Steuerungsabsicht. Ist eine Absicht zuständig, wird sie über den normalen seriellen Übertragungsweg erneut angewendet: Standard- oder Profilzeitplan, temporäre Anpassung, aktives Vorkonditionierungsziel, Room-Assist-Ziel, `off`, Einzel- oder natives Bereichsziel.

Bestehende Pausen und Zeitplanerbedingungen werden nicht umgangen. Pause mit `none`, globale Pause, deaktivierte Zone, gestoppter Zeitplaner oder fehlendes aktuelles Ziel senden nichts. Eine Zonen- oder Profilpause mit `turn_off` setzt `off` erneut durch.

<a id="manual-until-the-next-schedule-block"></a>
### Manuell bis zum nächsten Zeitplanblock

Interner Wert: `until_next_block`.

Velair behält den externen Zustand bis zum nächsten wirksamen Block des Geräts. Dann kehrt es zur automatischen Zeitplanung zurück und wendet die dann gültige maßgebliche Absicht an.

Die Grenze wird beim Beginn der manuellen Anpassung berechnet. Weitere externe Änderungen in derselben Sitzung aktualisieren den beibehaltenen Gerätezustand, verschieben die Grenze aber nicht. Ohne zukünftigen wirksamen Block gibt es keinen automatischen Ablauf; verwende bei Bedarf **Automatische Zeitplanung fortsetzen**.

Die Grenze zum nächsten Block verwendet dessen geplante Uhrzeit einschließlich `Off`, nicht einen prognostizierten Vorkonditionierungsstart. Eine Anpassung um `18:05` bei `Off` um `19:00` und Heizen um `20:00` endet beispielsweise um `19:00`, auch wenn die Heizprognose früher beginnen würde.

<a id="manual-for-a-duration"></a>
### Manuell für eine bestimmte Dauer

Interner Wert: `for_duration`.

Velair behält den externen Zustand für die konfigurierte Minutenzahl. Anfangs sind es 120 Minuten; zulässig sind 1 bis 10 080 Minuten, also sieben Tage. Bestehende gespeicherte Werte einschließlich 60 Minuten bleiben erhalten. Jede neue erkannte externe Steuerungsänderung startet die Dauer ab dieser Änderung neu, mit der gespeicherten Dauer der aktiven Sitzung, auch wenn sich inzwischen die Einstellungen geändert haben. Das zugehörige externe Änderungsereignis meldet diese wirksame Sitzungsrichtlinie, nicht den neueren Einstellungsstandard.

<a id="manual-until-resumed"></a>
### Manuell bis zum Fortsetzen

Interner Wert: `until_resumed`.

Velair behält den externen Zustand unbegrenzt. Benutzer oder Automation müssen die automatische Zeitplanung ausdrücklich fortsetzen.

<a id="what-happens-when-manual-adjustment-starts"></a>
## Beim Beginn einer manuellen Anpassung

Bei jeder geeigneten externen Anpassung mit einer der drei manuellen Richtlinien führt Velair einen seriellen Übergang aus:

1. Vollständigen HVAC-Modus und Einzelziel oder nativen Bereich aus dem Zustandsereignis erfassen.
2. Einen reservierten Grund für die manuelle Anpassung der Zone dauerhaft speichern.
3. Eine aktive temporäre Anpassung ohne Wiederherstellen ihres Ziels oder des bisherigen Zeitplans beenden.
4. Room Assist ohne Wiederherstellen seiner vorherigen Zeitplankorrektur nachgeben lassen.
5. Den erfassten externen Zustand erhalten oder nötigenfalls erneut anwenden.
6. In der Übersicht **Manuelle Anpassung** wählen und **Automatische Zeitplanung** verfügbar halten.

Eine manuelle Anpassung beginnt nur bei global laufender automatischer Zeitplanung, aktivierter Zone, keinem bereits pausierenden aktiven Profil und keiner unabhängigen Zonenpause außer einer temporären Anpassung. Das Beobachtungsereignis `external_climate_change_detected` wird auch dann gesendet, wenn diese Bedingungen den Eintritt verhindern. Eine aktive temporäre Anpassung ist die Ausnahme: Die externe Änderung ersetzt sie wie unten beschrieben.

Diese Tabelle zeigt das genaue Ergebnis einer Nicht-Velair-Steuerungsänderung bei einer ansonsten manuell werdenden Richtlinie:

| Zustand vor externer Änderung | Ereignis | Manuelle Anpassung beginnen | Sofortige Geräteaktion |
| --- | --- | --- | --- |
| Keine Pause oder temporäre Anpassung | Gesendet | Ja | Vollständigen externen Modus und Ziel erhalten. |
| Unabhängige Zonenpause mit `none` | Gesendet | Nein | Nichts senden; die bestehende Pause gibt weiter die Steuerung ab. |
| Unabhängige Zonenpause mit `turn_off` | Gesendet | Nein | `off` erneut durchsetzen; externes Einschalten umgeht die Pause nicht. |
| Aktive Profilpause einschließlich `turn_off` | Gesendet | Nein | In diesem Erkennungsweg nichts senden; Profilaktion nicht allein aufgrund der Beobachtung erneut ausführen. |

Ein global pausierter Zeitplaner oder eine deaktivierte Zone folgt demselben Beobachtungsmuster: Änderungsereignis senden, keine manuelle Anpassung erstellen und in diesem Erkennungsweg kein neues Zeitplanziel senden.

Während einer manuellen Anpassung berechnet Velair weiterhin den wirksamen Standard-, Profil- oder Moduszeitplan, übermittelt ihn aber nicht an dieses Gerät. Andere verwaltete Geräte arbeiten normal weiter.

Velair führt nicht automatisch folgende Aktionen aus:

- eine temporäre Anpassung erstellen;
- Profil oder Velair-Modus wechseln;
- den Urheber ableiten;
- die Änderung in einen Zeitplan kopieren;
- die Richtlinie eines anderen Geräts ändern;
- unabhängige Zonenpausen entfernen;
- auf das Erreichen der angeforderten Raumtemperatur warten.

<a id="what-happens-when-automatic-scheduling-resumes"></a>
## Beim Fortsetzen automatischer Zeitplanung

Eine manuelle Anpassung endet durch Ablauf ihrer Dauer, Erreichen der nächsten Blockgrenze, die Übersichtsschaltfläche oder `velair.resume_automatic_control`.

Velair entfernt nur den reservierten manuellen Anpassungsgrund und ermittelt die dann maßgebliche Absicht:

- Profilzeitplan, wenn ein aktives Profil die Zone steuert;
- Standardzeitplan, wenn kein aktives Profil zuständig ist oder das Profil die Zone an Standard abgibt;
- Profilpause einschließlich `turn_off`;
- andere unabhängige Pause oder globaler Zeitplanerzustand.

Velair stellt nicht den Block vom Beginn der manuellen Anpassung wieder her. Das ist wichtig, wenn sich inzwischen Profil, Modus, Zeitplan, Pause oder Uhrzeit geändert haben.

Besteht eine unabhängige Zonenpause weiterhin, bleibt die Zone pausiert. Ist ihre wirksame Aktion `turn_off`, behält Ausschalten Vorrang. Das Fortsetzen nach manueller Anpassung ist deshalb nicht dasselbe wie das Entfernen aller Zonenpausengründe.

**Nur Temperatur** ist eine separate Blockauswahl. Während dieses Blocks bleibt ein externer HVAC-Moduswechsel unter externer Kontrolle und erzeugt allein keine Manuelle Anpassung. Externe Solltemperaturänderungen folgen weiterhin deiner konfigurierten Richtlinie. Eine Pause oder Manuelle Anpassung stoppt weiterhin die Zeitplanübertragung; beim Fortsetzen wird der aktuelle Block angewendet, ohne ein ausgeschaltetes Klimagerät einzuschalten. Das gilt auch, wenn eine Fensterautomation die Zone fortsetzt. Eine ausdrückliche temporäre Anpassung oder ein späterer Block mit explizitem HVAC-Modus kann es weiterhin einschalten.

<a id="resume-from-off-when-the-block-says-keep-current-mode"></a>
### Aus `off` fortsetzen bei „Aktuellen Modus beibehalten“

**Aktuellen Modus beibehalten** bedeutet, dass der Block keinen HVAC-Modus vorgibt. Bei einem Temperaturziel folgt Velair beim Fortsetzen der normalen Übertragungsregel:

- Ist das Gerät an, behalte den aktuellen Modus und wende das Ziel an, wenn dieser es akzeptiert. Andernfalls scheitert die Übertragung ohne Moduswechsel.
- Ist es `off`, wähle den ersten kompatiblen angebotenen Modus außer `off` und wende dann das Blockziel an.

Ein reines Heizgerät mit `[off, heat]` setzt einen Keep-Modusblock mit `21 °C` als `heat`, `21 °C` fort. Ein reines Kühlgerät mit `[off, cool]` setzt als `cool`, `21 °C` fort. Ein umschaltbares Gerät kann mehrere kompatible Modi anbieten; Velair verwendet deren gemeldete Reihenfolge und leitet Heizen oder Kühlen nicht aus Jahreszeit, Standort oder Zahlenziel ab. Gib einen ausdrücklichen Blockmodus vor, wenn die Auswahl eindeutig sein muss.

Bei einem reinen Optionsblock werden nur gewählte Klimaoptionen angewendet. Er sendet keine Temperatur und schaltet ein ausgeschaltetes Gerät nicht ein.

Bei Entitäten, die nur Bereiche akzeptieren, sind die gemeldeten Modi `heat`, `cool`, `auto` und `heat_cool` kompatible Betriebsmodi. Beibehalten aus Aus verwendet den ersten dieser Modi in der gemeldeten Reihenfolge. Entitäten mit beiden Formaten verwenden ihre gespeicherte [Modusrichtlinie für Sollwertformate](usage.de.md#target-format-by-climate-and-mode); beim Fortsetzen eines kompatiblen Bereichs aus Aus bleibt `heat_cool` bevorzugt. Nur Temperatur darf beide Grenzen bei ausgeschaltetem Gerät schreiben, wenn Bereichsunterstützung und ein kompatibler Modus gemeldet sind; es schaltet das Gerät dafür niemals ein.

<a id="complete-real-world-examples"></a>
## Vollständige Praxisbeispiele

<a id="keep-automatic-reject-a-climate-card-setpoint-change"></a>
### Automatisch beibehalten: Zieländerung einer Klimakarte zurückweisen

Konfiguration:

```text
Living-room policy: Keep automatic
Current authoritative block: heat at 21 °C
```

| Zeit | Aktion | Ergebnis |
| --- | --- | --- |
| 18:00 | Velair wendet `heat`, `21 °C` an. | Automatische Zeitplanung |
| 18:20 | Ein Benutzer wählt `23 °C` in der Klimakarte. | Velair sendet `external_climate_change_detected` mit `policy: keep_automatic`. |
| 18:20 | Velair ermittelt den weiterhin aktuellen Block. | `heat`, `21 °C` wird erneut angewendet; keine manuelle Anpassung und kein `zone_control_changed`. |

Dasselbe gilt für Kühlen, `off`, native `heat_cool`-Bereiche, temporäre Anpassung, Vorkonditionierung und Room Assist: Erneut angewendet wird die zum Erkennungszeitpunkt maßgebliche Absicht. Die Celsiusbeispiele verhalten sich in Fahrenheit identisch.

<a id="home-assistant-card-keep-the-change-until-bedtime"></a>
### Home-Assistant-Karte: Änderung bis zur Schlafenszeit behalten

Konfiguration:

```text
Living room policy: Manual until the next schedule block
18:00 schedule block: cool at 24 °C
22:00 schedule block: cool at 25 °C
```

Zeitverlauf:

| Zeit | Aktion | Gerätezustand | Velair-Steuerung |
| --- | --- | --- | --- |
| 18:00 | Velair wendet den Block an. | `cool`, `24 °C` | Automatisch |
| 19:15 | Benutzer wählt `22 °C` in der HA-Klimakarte. | `cool`, `22 °C` | Manuelle Anpassung bis 22:00 |
| 20:00 | Room Assist erhält neuen Raumwert. | Weiter `22 °C`; keine unterstützte Korrektur. | Manuelle Anpassung |
| 22:00 | Nächster wirksamer Block beginnt. | Velair wendet `cool`, `25 °C` an. | Automatisch |

`22 °C` wird als vorübergehende Anweisung respektiert und in keinen Zeitplanblock geschrieben.

<a id="ir-remote-turn-on-an-ac-that-the-schedule-had-turned-off"></a>
### IR-Fernbedienung: Eine vom Zeitplan ausgeschaltete Klimaanlage einschalten

Konfiguration:

```text
Bedroom policy: Manual until resumed
Current authoritative block: Off
```

Zeitverlauf:

| Zeit | Aktion | Gerätezustand | Velair-Steuerung |
| --- | --- | --- | --- |
| 13:00 | Velairs Block hält das Gerät aus. | `off` | Automatisch |
| 14:10 | Ein Haushaltsmitglied wählt per IR `cool`, `23 °C`. | Die Geräteintegration meldet `cool`, `23 °C`. | Manuelle Anpassung |
| 16:00 | Der Zeitplan bleibt Ausschalten. | Das Gerät bleibt `cool`, `23 °C`. | Manuelle Anpassung |
| 17:30 | Benutzer wählt **Automatische Zeitplanung fortsetzen**. | Velair ermittelt den noch aktuellen Ausschaltblock und schaltet aus. | Automatisch |

Das funktioniert nur, wenn die Integration die Fernbedienungsänderung an Home Assistant meldet. Unsichtbare IR-Befehle können nicht erkannt werden.

<a id="a-60-minute-comfort-adjustment-changed-again"></a>
### Eine 60-minütige Komfortanpassung erneut ändern

Konfiguration: `for_duration`, 60 Minuten.

| Zeit | Aktion | Ergebnis |
| --- | --- | --- |
| 09:00 | Zeitplan wendet `heat`, `20 °C` an. | Automatisch |
| 09:20 | Benutzer wählt `22 °C`. | Manuelle Anpassung läuft um 10:20 ab. |
| 09:50 | Benutzer wählt `21 °C`. | Gerät bleibt bei `21 °C`; Ablauf beginnt neu bis 10:50. |
| 10:50 | Keine weitere externe Änderung. | Velair wendet die um 10:50 maßgebliche Absicht an. |

<a id="repeated-change-with-next-block-policy"></a>
### Wiederholte Änderung bis zum nächsten Block

Konfiguration: `until_next_block`; nächster Block um 22:00.

| Zeit | Aktion | Ergebnis |
| --- | --- | --- |
| 19:15 | Benutzer ändert `24 °C` zu `22 °C`. | Manuelle Anpassung endet um 22:00. |
| 20:30 | Benutzer ändert `22 °C` zu `23 °C`. | Beibehaltener Wert wird `23 °C`; Ablauf bleibt 22:00. |
| 22:00 | Nächster Block beginnt. | Velair kehrt zur Automatik zurück und wendet ihn an. |

<a id="activate-a-profile-while-one-climate-is-manual"></a>
### Ein Profil aktivieren bei einem manuell gesteuerten Gerät

Konfiguration:

```text
Default living-room intent: cool at 24 °C
Sleep Profile living-room intent: cool at 25 °C
Manual policy: until resumed
```

| Zeit | Aktion | Wohnzimmer | Andere Profilzonen |
| --- | --- | --- | --- |
| 20:00 | Benutzer setzt Wohnzimmer auf `22 °C`. | Manuelle Anpassung bei `22 °C` | Normal weiter |
| 21:00 | Benutzer aktiviert `Sleep`. | Bleibt `22 °C`; `Sleep` wird maßgebliche Konfiguration. | `Sleep` gilt sofort, sofern nicht anderweitig übersteuert. |
| 21:30 | Benutzer setzt Wohnzimmer fort. | Velair wendet `Sleep`: `cool`, `25 °C` an. | Unverändert |

Eigene Velair-Modi verhalten sich genauso: Sie können den aktiven Profilsatz ändern, beenden aber keine manuelle Zonenanpassung. Bei direkter Profilauswahl kann der Velair-Modus **Manuell** anzeigen, während die Zone **Manuelle Anpassung** zeigt; diese Begriffe bedeuten Unterschiedliches.

<a id="activate-several-profiles-or-modes-while-manual"></a>
### Mehrere Profile oder Modi während manueller Steuerung aktivieren

Angenommen, extern gilt `heat`, `22 °C`. Der Benutzer wählt währenddessen Home (`21 °C`), Away (`17 °C`), dann Sleep (`18 °C`). Velair behält durchgehend `22 °C`. Beim Fortsetzen wird nur das aktuelle Sleep-Ziel `18 °C` angewendet, weder Home/Away erneut ausgeführt noch das alte Standardziel wiederhergestellt.

<a id="profile-pause-and-turn_off"></a>
### Profilpause und `turn_off`

Wird ein pausierendes Profil während einer aktiven manuellen Anpassung aktiviert, bleibt der externe Zustand bis zu deren Ende erhalten. Beim Fortsetzen:

- Profilpause ohne Ausschalten sendet kein neues Ziel; die Zone kehrt zur automatischen Zuständigkeit zurück, unterliegt aber weiter der Profilpause.
- Profilpause mit `turn_off` schaltet das Gerät aus.

War die Profilpause bereits vor der externen Änderung aktiv, sendet Velair `external_climate_change_detected`, beginnt aber keine manuelle Anpassung. Dieser Erkennungsweg führt weder Profilpause noch `turn_off` sofort erneut aus, sondern meldet nur die Beobachtung. Ein späterer Profilwechsel, ausdrückliche Zeitplananwendung oder anderer Zeitplanerübergang ermittelt das Profilverhalten erneut.

<a id="external-adjustment-during-a-boost"></a>
### Externe Änderung während einer temporären Anpassung

| Zeit | Aktion | Ergebnis |
| --- | --- | --- |
| 12:00 | Velair startet temporär `cool`, `20 °C` bis 13:00. | Temporäre Anpassung |
| 12:20 | Benutzer setzt `cool`, `23 °C`. | Temporäre Anpassung endet ohne Wiederherstellung; manuelle Anpassung behält `23 °C`. |
| 12:45 | Benutzer setzt automatische Zeitplanung fort. | Velair ermittelt und wendet den um 12:45 gültigen Zeitplan an. |

Die alte temporäre Anpassung wird nicht fortgesetzt; ihr ursprünglicher Ablauf um 13:00 steuert das Gerät nicht mehr.

<a id="room-assist-without-a-control-fight"></a>
### Room Assist ohne konkurrierende Steuerung

Angenommen, das geplante Kühlziel ist `24 °C`, Room Assist wendete vorübergehend `26 °C` an und der Benutzer wählt extern `23 °C`.

Velair erfasst den Ereigniszustand, bevor wartende Room-Assist-Arbeit ihn ersetzen kann, beendet Room Assist ohne Wiederherstellen von `24 °C` und behält `23 °C`. Beim Fortsetzen ermittelt Velair den aktuellen Zeitplan; Room Assist darf aus aktuellen Messwerten ein neues unterstütztes Ziel berechnen.

<a id="native-heat_cool-range"></a>
### Nativer `heat_cool`-Bereich

```text
Scheduled range: 20–25 °C
External range: 19–24 °C
Policy: until resumed
```

Velair erkennt `target_temp_low` und `target_temp_high`, erfasst den vollständigen `heat_cool`-Zustand und behält während der manuellen Anpassung `19–24 °C`. Beim Fortsetzen wird der vollständige Bereich des aktuellen maßgeblichen Blocks angewendet. Der Bereich wird niemals auf ein Einzelziel reduziert.

Dieselbe Erfassung und Wiederherstellung des vollständigen Paars gilt für reine Bereichsentitäten in Heizen, Kühlen und Auto. Ein verbliebenes Attribut `temperature` ersetzt ihre beiden Grenzen nicht. Ist das beobachtete Paar unvollständig oder ungültig, erfindet Velair aus diesem Einzelattribut kein wiederherstellbares Ziel.

<a id="independent-window-pause-while-manual"></a>
### Unabhängige Fensterpause während manueller Steuerung

Angenommen, ein Gerät wird manuell mit `23 °C` gesteuert, dann ruft eine Fensterautomation `velair.pause_zone` mit `pause_id: window` und `action: turn_off` auf. Die kombinierte Pausenaktion ist Ausschalten, also geht das Gerät aus. `velair.resume_automatic_control` entfernt nur die manuelle Anpassung. Der Grund `window` bleibt bestehen und das Gerät aus. Die Fensterautomation muss ihren Grund selbst mit `velair.resume_zone` entfernen.

<a id="changing-the-policy-with-a-service"></a>
## Die Richtlinie über einen Dienst ändern

Alle folgenden Beispiele verwenden die aktuelle Aktionssyntax von Home Assistant.

Velair automatisch lassen und aktuelle Steuerungsabsicht erneut anwenden:

```yaml
action: velair.set_external_change_policy
data:
  entity_id: climate.living_room
  policy: keep_automatic
```

Externen Zustand bis zum nächsten Block behalten:

```yaml
action: velair.set_external_change_policy
data:
  entity_id: climate.living_room
  policy: until_next_block
```

Für 90 Minuten behalten:

```yaml
action: velair.set_external_change_policy
data:
  entity_id: climate.living_room
  policy: for_duration
  duration_minutes: 90
```

Bis zum ausdrücklichen Fortsetzen behalten:

```yaml
action: velair.set_external_change_policy
data:
  entity_id: climate.living_room
  policy: until_resumed
```

`duration_minutes` gilt für `for_duration`; bei anderer Richtlinie bleibt es als Zonendauereinstellung gespeichert. Dienste lehnen nicht verwaltete Entitäten, unbekannte Richtlinien und Dauern außerhalb von 1–10 080 Minuten ab.

Eine Einstellungsänderung bei bereits manueller Steuerung gilt nur für die nächste externe Anpassung nach dieser Sitzung. Die aktive Sitzung behält Richtlinie, Dauer, Quelle und Ablauf. Beende sie über Übersicht oder `velair.resume_automatic_control`.

<a id="enter-manual-adjustment-explicitly"></a>
## Manuelle Anpassung ausdrücklich beginnen

Die Übersicht zeigt je Gerät **Velair-Steuerung** als **Automatische Zeitplanung** oder **Manuelle Anpassung**. Beide bleiben in einer segmentierten Auswahl sichtbar. Wähle Manuelle Anpassung, um aktuellen HVAC-Modus und vollständiges Einzel- oder Bereichsziel zu erfassen. Normalerweise gelten gespeicherte manuelle Richtlinie und Dauer aus **Einstellungen > Externe Anpassungen**. Ist **Automatisch beibehalten** gespeichert, verwendet diese ausdrückliche Aktion **Manuell bis zum Fortsetzen**, ohne die gespeicherte externe Richtlinie zu ändern. Wähle automatische Zeitplanung zum Fortsetzen der aktuellen maßgeblichen Absicht. Die bereits aktive Auswahl bewirkt nichts.

Bei aktiver manueller Anpassung zeigt die Übersicht die genaue Ausstiegsrichtlinie und Ablaufzeit darunter sowie das gehaltene physische Einzel- oder Bereichsziel statt des ruhenden Zeitplanziels. Kann manuell nicht starten, bleibt das Segment mit zugänglicher Erklärung sichtbar: Gerät nicht verfügbar oder deaktiviert, Automatik gestoppt, aktive Profilpause oder andere zuständige Zonenpause. Es ist auch bei ausstehender Temperatureinheitenmigration deaktiviert, da manuelle Konfiguration und Sitzungen bis zum Abschluss unveränderlich bleiben. Eine temporäre Anpassung blockiert nicht, da sie ersetzt wird.

Die entsprechende Aktion verwendet ebenfalls die gespeicherte Richtlinie und akzeptiert nur `entity_id`:

```yaml
action: velair.enter_manual_adjustment
data:
  entity_id: climate.living_room
```

Für 90 Minuten speichere zunächst `for_duration` und `duration_minutes: 90` mit `velair.set_external_change_policy`, dann rufe diese Aktion auf. Sie lehnt nicht verwaltete, deaktivierte, `unknown`- oder `unavailable`-Geräte sowie Geräte mit globalem Stopp, aktiver Profilpause oder unabhängiger Zonenpause ab. Aktive temporäre Anpassungen werden ersetzt. Heizen, Kühlen, `off`, Einzelziele und native `heat_cool`-Bereiche werden über denselben seriellen Weg erfasst.

<a id="resume-with-a-service"></a>
## Über einen Dienst fortsetzen

```yaml
action: velair.resume_automatic_control
data:
  entity_id: climate.living_room
```

Diese Aktion ist idempotent: Bei einem bereits automatisch gesteuerten verwalteten Gerät tut sie nichts. Nicht verwaltete Entitäten werden abgelehnt.

Verwende die reservierte interne Pausen-ID `velair.manual_adjustment` nicht mit `velair.pause_zone` oder `velair.resume_zone`. Velair lehnt sie ab, damit ein maßgeblicher Mechanismus die manuelle Anpassung verwaltet. Ein allgemeines `velair.resume_zone` entfernt sie nicht.

<a id="automations-and-events"></a>
## Automationen und Ereignisse

Alle Velair-Laufzeitereignisse verwenden `event_type: velair_event`.

<a id="observe-every-external-control-change"></a>
### Jede externe Steuerungsänderung beobachten

Dieses Ereignis wird gesendet, sobald mindestens ein beobachtetes Modus- oder Zielfeld nicht Velair zugeordnet werden kann:

```yaml
event_type: velair_event
event_data:
  domain: velair
  event: external_climate_change_detected
  entity_id: climate.living_room
  changed_fields:
    - hvac_mode
    - temperature
  previous:
    hvac_mode: "off"
    temperature: 24
  current:
    hvac_mode: "cool"
    temperature: 23
  policy: keep_automatic
```

Bei nativem Bereich verwenden `changed_fields`, `previous` und `current` gegebenenfalls `target_temp_low` und `target_temp_high` statt `temperature`. Nur externe Felder erscheinen; ein mit Velair korreliertes Feld fehlt auch dann, wenn es im selben Home-Assistant-Update eintraf.

Beispiel für eine Benachrichtigungsautomation:

```yaml
alias: Notify when the living-room climate changes outside Velair
triggers:
  - trigger: event
    event_type: velair_event
    event_data:
      event: external_climate_change_detected
      entity_id: climate.living_room
actions:
  - action: notify.notify
    data:
      message: >-
        Living-room climate changed outside Velair:
        {{ trigger.event.data.changed_fields | join(', ') }}.
```

<a id="observe-entry-into-or-exit-from-manual-adjustment"></a>
### Beginn und Ende einer manuellen Anpassung beobachten

Daten beim Beginn:

```yaml
event_type: velair_event
event_data:
  domain: velair
  event: zone_control_changed
  entity_id: climate.living_room
  control_mode: manual
  previous_control_mode: automatic
  policy: for_duration
  started_at: "2026-08-20T18:00:00+02:00"
  until: "2026-08-20T19:00:00+02:00"
```

Bei `until_resumed` fehlt `until`. Daten beim Ende:

```yaml
event_type: velair_event
event_data:
  domain: velair
  event: zone_control_changed
  entity_id: climate.living_room
  control_mode: automatic
  previous_control_mode: manual
  reason: resumed
```

Automatischer Ablauf verwendet `reason: expired`. Das Ereignis bedeutet, dass sich der manuelle Anpassungsgrund geändert hat; eine andere Pause kann die tatsächliche Zeitplanübermittlung weiterhin verhindern.

Den vollständigen Ereignisvertrag beschreiben [Automationsereignisse](automation-events.de.md).

<a id="restart-and-availability-behavior"></a>
## Verhalten bei Neustart und Verfügbarkeit

Zonenrichtlinie und aktiver manueller Anpassungsgrund werden dauerhaft gespeichert. Nach einem Home-Assistant-Neustart:

- bleibt eine nicht abgelaufene oder unbegrenzte manuelle Anpassung manuell;
- umgeht **Aktiven Zeitplan nach dem Start anwenden** sie nicht;
- entfernt Velair sie bei gespeichertem Ablauf und ermittelt die aktuelle maßgebliche Absicht;
- enthält der portable Export die Richtlinie, aber bewusst keinen aktiven manuellen Laufzeitzustand.

Die erfasste externe Modus-/Zielmomentaufnahme existiert nur zur Laufzeit und wird nach Neustart weder gespeichert noch erneut ausgeführt. Normalerweise behält und meldet das physische Gerät seinen eigenen manuellen Zustand; der gespeicherte Anpassungsgrund verhindert weiterhin Zeitplanübermittlung. Setzt sich das Gerät beim Neustart zurück oder meldet ein anderes Ziel, rekonstruiert Velair die alte externe Momentaufnahme nicht. Es wartet auf Ablauf oder Fortsetzen und ermittelt dann die aktuelle Absicht.

Übergänge von oder zu `unknown` und `unavailable` werden ignoriert. Erfolgt eine Fernbedienungsänderung ohne meldende Integration und kommt später nur ein Übergang von `unavailable` zu verfügbar, gilt diese Wiederherstellung nicht als neue externe Anpassung. Nach Wiederverfügbarkeit werden spätere Modus- oder Zieländerungen normal erkannt.

<a id="attribution-limits"></a>
## Grenzen der Zuordnung

Die Zuordnung erfolgt bewusst nach bestem verfügbarem Wissen, da Integrationen und physische Geräte Zustände unterschiedlich melden.

- Physische oder herstellerseitige Aktionen, die Home Assistant nie erreichen, sind nicht erkennbar.
- Manche Geräte melden Modus und Ziel in mehreren Updates; mehrere Beobachtungsereignisse sind möglich. Automationen sollten idempotent sein.
- Eine Nicht-Velair-Aktion mit genau demselben Wert eines noch gültigen erwarteten Felds kann Velair zugeordnet werden.
- Ohne Geräteecho eines angenommenen Ziels bleibt dessen Erwartung bis zum kurzen Ablauf erhalten.
- Verfügbarkeitswiederherstellung selbst wird wie oben beschrieben ignoriert.
- Lüfter-, Preset-, Schwenk-, Luftfeuchtigkeits- und reine Umgebungsänderungen liegen außerhalb des ersten Funktionsvertrags.

Die sichere Interpretation von `external_climate_change_detected` lautet daher: „Velair beobachtete eine Steuerungsänderung, die keinem eigenen Befehl zugeordnet werden konnte“, nicht „Velair bewies, dass diese bestimmte Person das Thermostat änderte“.

<a id="troubleshooting-checklist"></a>
## Prüfliste zur Fehlerbehebung

Fehlt eine erwartete manuelle Anpassung:

1. Prüfe, ob das Gerät von Velair verwaltet wird.
2. Prüfe globale automatische Zeitplanung und aktivierte Zone.
3. Prüfe, ob das aktive Profil die Zone nicht bereits pausiert.
4. Prüfe, ob die externe Quelle `hvac_mode`, `temperature` oder einen nativen Bereich in Home Assistant ändert, nicht nur Herstelleranzeige oder Lüfter-/Preset-Option.
5. Prüfe, ob die Entität beim Übergang nicht `unknown` oder `unavailable` war.
6. Lausche auf `velair_event` und filtere `event: external_climate_change_detected`.
7. Prüfe Velair-Diagnose und Home-Assistant-Protokolle auf Fehler beim Zustandserhalt oder Klimadienstaufruf.

Wird die Zone fortgesetzt, ohne die erwartete Temperatur anzuwenden, prüfe aktuelle Profile/Modi, Standardzeitplan, unabhängige Pausengründe, globalen Zeitplanerzustand und ob der aktuelle Block Off oder Keep ist. Fortsetzen verwendet immer die aktuelle maßgebliche Absicht, niemals eine historische Momentaufnahme des alten Zeitplans.
