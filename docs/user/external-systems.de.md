<a id="external-schedule-execution"></a>
# Externe Ausführung von Zeitplänen
<!-- velair-docs:start -->
Übersetzungen: [Englisches Original](external-systems.md) · [Español](external-systems.es.md) · [Français](external-systems.fr.md) · [Deutsch](external-systems.de.md) · [Italiano](external-systems.it.md) · [Nederlands](external-systems.nl.md) · [Polski](external-systems.pl.md) · [Português (Brasil)](external-systems.pt-br.md) · [Português (Portugal)](external-systems.pt-pt.md) · [Русский](external-systems.ru.md) · [Übersetzungsstatus](../translation-status.md)

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

Normalerweise verwaltet Velair sowohl die gespeicherten Zeitpläne als auch die Klimasteuerung. Bei kompatiblen Klimageräten kann **Einstellungen → Externe Systeme** stattdessen den wirksamen Wochenzeitplan an einen Regler übertragen, der ihn eigenständig ausführt.

Der Bereich erscheint, wenn Velair eine unterstützte Home-Assistant-Integration mit einem kompatiblen verwalteten Klimagerät erkennt oder wenn eine Zone bereits extern gesteuert wird. Erstelle und speichere vor dem Aktivieren der externen Ausführung einen wirksamen Zeitplan mit mindestens einem Temperaturblock für die Zone. Gibt es nichts zu übertragen, behält Velair die lokale Steuerung bei und erklärt in den Einstellungen, welche Voraussetzung fehlt. Wähle das externe System für eine Zone aus, damit die externe Zuständigkeit gespeichert wird, bevor Velair die vollständige Woche hochlädt. Ein fehlgeschlagener Upload stellt die lokale Ausführung nicht wieder her: Die Zone bleibt extern und zeigt den Übertragungsfehler an, damit niemals zwei Zeitplaner miteinander konkurrieren. Nach einem erfolgreichen Home-Assistant-Dienstaufruf meldet Velair den Zeitplan als veröffentlicht. Das bedeutet, dass die externe Integration die Anfrage angenommen hat. Velair behauptet nicht, dass der physische Regler sie bereits angewendet hat.

Die externe Ausführung ist bewusst auf Zeitpläne beschränkt. Velair sendet keine Klimasteueraktionen an eine externe Zone. Das umfasst die Übermittlung beim Start und für den aktuellen Zeitplan, temporäre Anpassung, Pausieren/Fortsetzen, manuelle Anpassungen, Room Assist und adaptive Vorkonditionierung. Profile und Modi werden nur zur Zeitplanauswahl unterstützt: `normal` veröffentlicht die Standardwoche der Zone und `schedule` die Profilwoche. Das Pausenverhalten ist für externe Zonen nicht verfügbar. Die Auswahl von Standard, eines Profils oder eines Modus sowie das Bearbeiten eines aktiven Profils veröffentlicht nach dem Speichern der Auswahl die neue wirksame vollständige Woche. Ein Übertragungsfehler macht die globale Profil- oder Modusauswahl nicht rückgängig und beeinträchtigt keine lokalen Zonen.

Wird Standard, ein Profil oder ein Modus erneut gewählt, startet außerdem eine neue Übertragung, wenn der aktuelle Laufzeitzustand `failed` ist oder noch keine erfolgreiche Übertragung vorliegt. Velair wiederholt die Übertragung nicht automatisch; nur die ausdrückliche Auswahl löst sie aus.

<a id="evohome-via-ramses_cc"></a>
## Evohome über ramses_cc

Das erste unterstützte System verwendet den Home-Assistant-Dienst `ramses_cc.set_zone_schedule`. Velair hat keine Python-Abhängigkeit von `ramses_cc` und kommuniziert ausschließlich über Home-Assistant-Dienste.

Die Einstellungen und der Profileditor leiten die folgenden Bedingungen aus den Fähigkeiten des Reglers ab und führen sie einmal unter dem externen Regler auf, auch wenn mehrere Zonen ihn verwenden. Die Reglerdetails sind standardmäßig eingeklappt und lassen sich bei Bedarf zur Prüfung der Grenzen öffnen.

Aktuelle Grenzen:

- Heizzeitpläne mit einer einzelnen Zieltemperatur pro Schaltpunkt;
- genau sieben Wochentage unter Beibehaltung der durchgängigen Wochenplanung von Velair;
- keine Ausschaltblöcke, Temperaturbereiche, Kühlmodi oder Klimaoptionen;
- höchstens sechs aus dem Zeitplan abgeleitete Schaltpunkte pro Tag;
- beginnt der erste Block nach `00:00`, fügt Velair einen Schaltpunkt für die Fortführung um Mitternacht hinzu. Dieser implizite Wechsel zählt zum Tagesmaximum, sodass an diesem Tag Platz für fünf bearbeitbare Blöcke bleibt;
- Uhrzeiten im 5-Minuten-Raster des Reglers;
- Temperaturen werden für die an den Regler gesendeten Daten in Celsius konvertiert.

Für extern ausgeführte Zonen zeigen die Tageseditoren für Standard und Profile direkt über den Blöcken die aktuelle Auslastung des Reglers. Die erste Zeile nennt die verwendeten und maximalen Schaltpunkte; die zweite unterscheidet bearbeitbare Zeitplanblöcke vom impliziten Mitternachts-Schaltpunkt. Die Anzeige ändert ihr Aussehen beim Erreichen der Grenze und bei Überschreitung im Entwurf. Sie wird aus den angegebenen Fähigkeiten des ausgewählten Reglers abgeleitet; verbindlich bleibt die Prüfung der Übertragung im Backend.

Die Übersicht behält die normale Zeitplanaktivität und Informationen zum nächsten Ereignis für eine externe Zone bei. Eine kompakte Anzeige **Extern** nennt den Regler und verwendet ein Statussymbol für Übertragung, Annahme, Fehler oder Nichtverfügbarkeit. Ihre Infoschaltfläche erklärt, dass der Regler den geplanten Ablauf ausführt und Velair keine Klimasteueraktionen an die Zone sendet. Der Zeitplanerstatus enthält ebenfalls einen Hinweis, wenn eine oder mehrere sichtbare Zonen die externe Ausführung verwenden.

Die Erkennung setzt den Dienst zum Setzen des Zeitplans, einen geladenen `ramses_cc`-Konfigurationseintrag und eine verwaltete `climate`-Entität voraus, die Heizen und einzelne Zieltemperaturen unterstützt. Die öffentlichen Entitätsmetadaten von Home Assistant unterscheiden nicht jede Evohome-Zone von anderen `ramses_cc`-Klimageräten. Der Dienstaufruf ist deshalb die abschließende Kompatibilitätsprüfung. Ein Fehler bleibt als sichtbarer Übertragungsfehler erhalten.

Dieser Integrationsweg ist durch automatisierte Diensttests abgedeckt. Tests mit einer realen Evohome-Installation unter `ramses_cc` haben außerdem die Übertragung und Speicherung auf dem Regler für die getesteten Wochenzeitpläne bestätigt. Rückmeldungen von weiteren Installationen und Zeitplankombinationen bleiben hilfreich.

Für die Veröffentlichung gibt es nur drei Laufzeitzustände: **publishing**, **published** und **failed**. Vor der ersten Veröffentlichung in der aktuellen Home-Assistant-Laufzeit existiert kein Veröffentlichungszustand. Er wird nicht dauerhaft gespeichert und ist unabhängig davon, ob der Anbieter momentan verfügbar ist.

Velair ruft `get_zone_schedule` nicht auf, fügt keine Verzögerungen hinzu, wiederholt keine Übertragungen automatisch und fragt den Regler nicht regelmäßig ab. Auch diese Mechanismen würden keine anbieterneutrale Aussage darüber ermöglichen, was die physische Hardware tatsächlich ausführt.
