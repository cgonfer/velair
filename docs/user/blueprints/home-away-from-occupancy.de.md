<a id="home-and-away-from-occupancy"></a>
# Zuhause und Abwesend anhand der Anwesenheit
<!-- velair-docs:start -->
Übersetzungen: [Englisches Original](home-away-from-occupancy.md) · [Español](home-away-from-occupancy.es.md) · [Français](home-away-from-occupancy.fr.md) · [Deutsch](home-away-from-occupancy.de.md) · [Italiano](home-away-from-occupancy.it.md) · [Nederlands](home-away-from-occupancy.nl.md) · [Polski](home-away-from-occupancy.pl.md) · [Português (Brasil)](home-away-from-occupancy.pt-br.md) · [Português (Portugal)](home-away-from-occupancy.pt-pt.md) · [Русский](home-away-from-occupancy.ru.md) · [Übersetzungsstatus](../../translation-status.md)

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

Führe gewählte Home-Assistant-Aktionen aus, wenn eine zusammengefasste Anwesenheitsentität zu „anwesend“ oder „abwesend“ wechselt. Regeln für Personen, Gäste und haushaltsspezifische Anwesenheit bleiben dabei in Home Assistant, während sich häufige Velair-Modus- und Profilwechsel einfacher konfigurieren lassen. Eine verzögerte Benachrichtigung erklärt, wenn die Entität keine sichere Entscheidung zwischen Zuhause und Abwesend ermöglicht.

<p>
  <a href="https://my.home-assistant.io/redirect/blueprint_import/?blueprint_url=https%3A%2F%2Fraw.githubusercontent.com%2Fcgonfer%2Fvelair%2Fmain%2Fblueprints%2Fautomation%2Fvelair%2Foccupancy_home_away.yaml"><img src="https://my.home-assistant.io/badges/blueprint_import.svg" alt="Home Assistant öffnen und den Blueprint für Zuhause und Abwesend anhand der Anwesenheit importieren" height="28"></a>
  <a href="https://raw.githubusercontent.com/cgonfer/velair/main/blueprints/automation/velair/occupancy_home_away.yaml"><img src="https://img.shields.io/badge/YAML_source-View-24292F?style=for-the-badge&amp;logo=github&amp;logoColor=white" alt="YAML-Quelldatei für Zuhause und Abwesend anhand der Anwesenheit öffnen"></a>
</p>

[Änderungsverlauf](../../../blueprints/changelogs/occupancy_home_away.md) · [Zurück zum Blueprint-Index](../blueprints.de.md)

<a id="when-to-use-it"></a>
## Wann der Blueprint sinnvoll ist

Verwende diesen Blueprint, wenn Home Assistant bereits eine Entität hat, die die Anwesenheit im gesamten Zuhause darstellt. Er eignet sich für Zuhause-, Abwesend- oder ähnliche Wechsel, bei denen die abschließenden Aktionen verzögert und vor der Ausführung erneut geprüft werden sollen.

<a id="requirements"></a>
## Voraussetzungen

- Blueprint-Version 1.0.0 und Home Assistant ab 2024.6.0.
- Ein `binary_sensor` oder `input_boolean` mit `on`/`off` oder eine Personengruppe mit `home`/`not_home`.
- Velair wird nur benötigt, wenn deine konfigurierten Aktionen dessen Modi, Profile, Entitäten oder Dienste verwenden. Ansonsten kann der Blueprint normale Home-Assistant-Aktionen ohne Velair ausführen.

Erstelle Personen-, Gäste-, Zonen- und Anwesenheitsregeln in Home Assistant, bevor du die daraus resultierende Entität hier auswählst. Eine Personengruppe kann darstellen, ob eine verfolgte Person `home` ist; ein Template-Binärsensor kann zusätzlich einen Gästehelfer oder andere Haushaltsausnahmen einbeziehen. Der Blueprint akzeptiert `on`/`off` und `home`/`not_home`, statt diese Entscheidung selbst nachzubauen.

<a id="configuration"></a>
## Konfiguration

- **Consolidated occupancy state:** die einzelne Entität, die bereits die Anwesenheit im gesamten Zuhause darstellt.
- **When occupied:** eine oder mehrere normale Home-Assistant-Aktionen.
- **When empty:** eine oder mehrere normale Home-Assistant-Aktionen.
- **Occupied delay:** wie lange die Entität `on` oder `home` bleiben muss.
- **Empty delay:** wie lange die Entität `off` oder `not_home` bleiben muss.
- **Availability warning delay:** wie lange `unknown` oder `unavailable` anhalten muss, bevor Home Assistant eine Diagnosebenachrichtigung erstellt. Der Standard beträgt 5 Minuten.

<a id="example"></a>
## Beispiel

Füge für die Anwesenheitsaktion **Select: Select** hinzu, wähle die sichtbare Velair-Modusentität, die Home Assistant anbietet, und wähle `Home`. Konfiguriere die Abwesenheitsaktion genauso mit `Away`. Wähle die Entität über die Oberfläche, statt eine bestimmte Entitäts-ID vorauszusetzen.

Die erzeugten Aktionen entsprechen:

```yaml
action: select.select_option
target:
  entity_id: select.velair_mode
data:
  option: Home
```

Um stattdessen ein Profil direkt zu aktivieren:

```yaml
action: velair.activate_profile
data:
  profile_id: home
```

Modi sind für Zuhause-, Abwesend- und Urlaubsoptionen meist verständlicher, da der aktuelle Zustand über die Velair-Modusauswahl in Home Assistant sichtbar bleibt.

<a id="how-it-works"></a>
## Funktionsweise

Die Zustandsauslöser für Anwesenheit (`on`/`home`) und Abwesenheit (`off`/`not_home`) verwenden die nativen `for`-Zeitdauern von Home Assistant. Der Zustand muss deshalb über die gesamte Verzögerung ununterbrochen bestehen bleiben. Separate Template-Auslöser zur Verfügbarkeit erkennen anhaltende Zustände `unknown`/`unavailable` und die Rückkehr zu einem unterstützten Zustand. Home Assistant erstellt nach der Warnverzögerung eine dauerhafte Benachrichtigung für die Automation, aktualisiert sie statt Duplikate zu erzeugen und entfernt sie nach der Wiederherstellung. Zuhause- und Abwesenheitsaktionen laufen nicht, solange die Entität keinen gültigen Zustand liefert.

Beim Start laufen Prüfungen für Anwesenheit, Abwesenheit und Verfügbarkeit als interne parallele Zweige. Jeder prüft seinen Ausgangszustand, wartet bis zum konfigurierten Zeitlimit unterbrechbar auf den entgegengesetzten Zustand, fährt nur nach Ablauf fort und prüft vor der Aktion erneut. Der begrenzte äußere Parallelmodus verhindert, dass eine Verfügbarkeitswartezeit beim Start einen späteren gültigen Anwesenheitswechsel blockiert. Es gibt keine regelmäßigen Abfragen.

<a id="safety-and-precedence"></a>
## Sicherheit und Vorrang

Der Blueprint führt nur deine konfigurierten Aktionen aus. Die bestehenden Vorrangregeln von Velair für Modi, Profile, temporäre Anpassungen und Pausen gelten weiterhin. Eine Anwesenheitsentität mit `unknown` oder `unavailable` aktiviert weder Zuhause noch Abwesend. Die Warnung nennt die Entität und erklärt, dass die Aktionen ausgesetzt bleiben, bis ein unterstützter Anwesenheits- oder Abwesenheitszustand gemeldet wird.

<a id="limitations"></a>
## Grenzen

- Der Blueprint akzeptiert bewusst eine bereits ausgewertete Anwesenheitsentität; er kombiniert Personen- oder Gästeregeln nicht selbst.
- Die `for`-Timer von Home Assistant überstehen keinen Neustart. Der Startablauf beginnt die konfigurierte Verzögerung daher erneut.
- Die Benachrichtigungs-ID verwendet die Entitäts-ID der Automation. Nach dem Umbenennen kann die alte Benachrichtigung bestehen bleiben und muss manuell entfernt werden.
- Die parallele Ausführung ist auf 20 Läufe begrenzt und warnt, falls eine ungewöhnliche Ereignisflut alle Plätze belegt.
- Mit **Kontrolle übernehmen** verselbstständigte Aktionen erhalten nicht länger automatisch Blueprint-Aktualisierungen.

<a id="troubleshooting"></a>
## Fehlerbehebung

- Läuft keiner der Zweige, prüfe, ob die gewählte Entität `on`/`home` oder `off`/`not_home` meldet.
- Erscheint eine Warnung, prüfe die genannte Anwesenheitsentität sowie ihre Quellgruppe, Vorlage, Personen oder den Gästehelfer.
- Wird Abwesend zu schnell aktiviert, erhöhe die Abwesenheitsverzögerung.
- Wird der erwartete Modus nicht gewählt, führe die ausgewählte Aktion in Home Assistant manuell aus und prüfe den Optionsnamen.
- Scheitert eine Profilaktion, verwende die stabile Profil-ID statt des bearbeitbaren Anzeigenamens.

<a id="updating-and-customizing"></a>
## Aktualisieren und anpassen

Importiere die fortlaufende `main`-URL erneut, um eine kompatible Aktualisierung zu installieren. Aktualisierungen der Version 1 behalten Eingabenamen bei; neue Eingaben haben einen Standardwert, sodass keine Automationsmigration nötig ist. Eine zukünftige inkompatible Version verwendet einen neuen Dateinamen und eine neue Hauptversion, statt diese URL zu ersetzen. Velair bearbeitet zur Blueprint-Migration niemals Home-Assistant-Automationen oder `.storage`. Verwende **Kontrolle übernehmen** nur, wenn deine Installation Logik benötigt, die sich mit den angebotenen Eingaben nicht ausdrücken lässt. Die unabhängige Automation erhält dann keine Blueprint-Aktualisierungen mehr.
