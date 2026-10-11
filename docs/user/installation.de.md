<a id="installation"></a>
# Installation
<!-- velair-docs:start -->
Übersetzungen: [Englisches Original](installation.md) · [Español](installation.es.md) · [Français](installation.fr.md) · [Deutsch](installation.de.md) · [Italiano](installation.it.md) · [Nederlands](installation.nl.md) · [Polski](installation.pl.md) · [Português (Brasil)](installation.pt-br.md) · [Português (Portugal)](installation.pt-pt.md) · [Русский](installation.ru.md) · [Übersetzungsstatus](../translation-status.md)

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

Velair ist im regulären HACS-Katalog verfügbar. Eine manuelle Installation bleibt für alle möglich, die HACS nicht verwenden oder einen bestimmten Build testen möchten.

<a id="hacs"></a>
## HACS

1. Öffne HACS.
2. Suche in den verfügbaren Integrationen nach **Velair**.
3. Öffne Velair und wähle **Herunterladen**.
4. Starte Home Assistant neu.
5. Öffne **Einstellungen > Geräte & Dienste**.
6. Füge die Velair-Integration hinzu.
7. Wähle die `climate.*`-Entitäten aus, die Velair verwalten darf.

Velair verwendet die in Home Assistant gewählte Temperatureinheit. Eine neue Installation erstellt Zeitpläne, Vorlagen, Komfortgrenzwerte, Room-Assist-Einstellungen und Standardwerte für die adaptive Vorkonditionierung in dieser Einheit. Sie wird in den Velair-Einstellungen schreibgeschützt angezeigt und muss in Home Assistant geändert werden, nicht in Velair.

Bestehende Installationen, die von einer veröffentlichten Version mit ausschließlicher Celsius-Unterstützung von Velair aktualisiert werden, müssen bei Verwendung von Fahrenheit in Home Assistant möglicherweise zurückgesetzt werden. Lies vorher [Temperatureinheiten und Migration](temperature-units.de.md), damit du bei Bedarf zuerst eine Kopie als Referenz exportieren kannst.

<a id="manual-installation"></a>
## Manuelle Installation

Eine manuelle Installation ist normalerweise nur erforderlich, wenn du HACS nicht verwendest oder einen Build aus GitHub Actions oder einem GitHub Release testen möchtest.

Zu den Release-Dateien gehört `velair-custom-component-<version>.zip`. Entpacke sie so, dass folgender Ordner existiert:

```text
<home_assistant_config>/custom_components/velair
```

Bei einem ausgecheckten Repository kopierst du:

```text
custom_components/velair
```

nach:

```text
<home_assistant_config>/custom_components/velair
```

Starte Home Assistant neu und füge Velair unter **Einstellungen > Geräte & Dienste** hinzu.

<a id="github-actions-artifacts"></a>
## Artefakte aus GitHub Actions

Jeder erfolgreiche CI-Lauf lädt vorübergehend verfügbare Artefakte hoch:

- `velair-custom-component`: der vollständige Ordner `custom_components/velair` mit dem in diesem Lauf generierten Frontend-Bundle.
- `velair-lovelace-resource`: die kompilierten `velair-card.js`-Dateien für fortgeschrittene manuelle Tests der Lovelace-Ressource.

Release-Läufe mit Tag hängen außerdem ZIP-Dateien an das GitHub Release an. Verwende im Normalfall HACS; die Artefakte sind für Tests eines bestimmten Workflow-Laufs oder eine manuelle Installation gedacht.

<a id="optional-lovelace-card"></a>
## Optionale Lovelace-Karte

Das Seitenleisten-Panel wird automatisch registriert. Die Lovelace-Karte ist optional.

Füge die von der Integration bereitgestellte Ressource hinzu:

```yaml
url: /velair_frontend/velair-card.js
type: module
```

Füge anschließend eine oder mehrere Velair-Karten hinzu. Jede Karte verwendet dieselben Backend-Daten und visuellen Komponenten wie das Seitenleisten-Panel.

```yaml
type: custom:velair-card
view: overview-status
```

Unterstützte Werte für `view`:

- `climate`: Status und Bedienelemente für ein verwaltetes Klimagerät, optional mit einer Aktion für die einmalige Rückkehr des Haushalts neben temporärer Anpassung und Pause. Auf bestehenden Karten bleibt diese Aktion ausgeblendet; neue Konfigurationen aus der Kartenauswahl aktivieren sie.
- `overview-status`: Zeitplanerzustand und Bedienelemente für Pause/Stopp/Fortsetzen.
- `overview-boosts`: aktive temporäre Anpassungen.
- `overview-events`: nächste Ereignisse.
- `overview-timeline`: heutiger Zeitverlauf.
- `overview-zones`: Zonenübersicht.
- `active-setup`: aktueller Modus und Profile, mit optionalen Bedienelementen.
- `schedules`: vollständiger Zeitplaneditor.
- `sensors`: Room-Assist-Konfiguration und aktueller Status.
- `comfort`: Konfiguration und Status des Umgebungskomforts.
- `preconditioning`: Konfiguration der adaptiven Vorkonditionierung und Status des lokalen Lernens.
- `planned-return`: kompakte Bedienelemente für eine einmalige Rückkehr, Anzahl der konfigurierten Anwesenheitsquellen und ein Zeitverlauf ab bestätigter Abreise. Ohne gespeicherte Anwesenheitsquellen aktiviert **Plan return** sofort die Abwesenheitskonfiguration; die automatische Wochenroutine benötigt weiterhin Quellen.
- `diagnostics`: Laufzeitzustand, begrenzter Verlauf, Filter und Export von Fehlerberichten.

<a id="updating"></a>
## Aktualisieren

Nach einer Velair-Aktualisierung:

1. Starte Home Assistant neu.
2. Lade den Browser ohne Cache neu oder lade die Home-Assistant-Companion-App neu.
3. Prüfe, ob der Wartungsbereich in den Einstellungen die erwartete Integrationsversion anzeigt.
