<a id="troubleshooting"></a>
# Fehlerbehebung
<!-- velair-docs:start -->
Übersetzungen: [Englisches Original](troubleshooting.md) · [Español](troubleshooting.es.md) · [Français](troubleshooting.fr.md) · [Deutsch](troubleshooting.de.md) · [Italiano](troubleshooting.it.md) · [Nederlands](troubleshooting.nl.md) · [Polski](troubleshooting.pl.md) · [Português (Brasil)](troubleshooting.pt-br.md) · [Português (Portugal)](troubleshooting.pt-pt.md) · [Русский](troubleshooting.ru.md) · [Übersetzungsstatus](../translation-status.md)

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

<a id="a-lovelace-card-shows-configuration-error"></a>
## Eine Lovelace-Karte zeigt einen Konfigurationsfehler

Prüfe, ob Velair installiert und konfiguriert ist, bevor das Dashboard die Karte lädt. Die Integration stellt ihre Frontend-Ressource früh beim Start von Home Assistant bereit, damit Karten bei normalen Neustarts nicht auf das Modul warten müssen.

Bleibt der Fehler bestehen:

1. Prüfe, ob die Dashboard-Ressourcen-URL genau `/velair_frontend/velair-card.js` lautet und ihr Typ **JavaScript-Modul** ist.
2. Entferne doppelte oder alte Ressourcen wie `/local/velair-card.js`.
3. Starte Home Assistant nach einer Aktualisierung der Integration neu.
4. Lade den Browser oder die Home-Assistant-Companion-App neu.

Die Browserkonsole oder der Netzwerkbereich sollte anzeigen, ob die Modulanfrage fehlgeschlagen ist. Füge den vollständigen Fehler bei der Meldung eines reproduzierbaren Problems hinzu.

<a id="velair-does-not-appear-in-the-sidebar"></a>
## Velair erscheint nicht in der Seitenleiste

Starte Home Assistant nach der Installation oder Aktualisierung der Integration neu. Das Seitenleisten-Panel wird während der Einrichtung der Integration registriert.

Wurde die Integration gerade aktualisiert, lade den Browser ohne Cache neu oder lade die Home-Assistant-Companion-App neu.

<a id="the-lovelace-card-shows-old-ui"></a>
## Die Lovelace-Karte zeigt eine alte Oberfläche

Prüfe die Dashboard-Ressourcen. Entferne alte Entwicklungsressourcen wie:

```yaml
url: /local/velair-card.js
type: module
```

Verwende stattdessen die von der Integration bereitgestellte Ressource:

```yaml
url: /velair_frontend/velair-card.js
type: module
```

Velair liefert diese Ressource mit Headern aus, die eine Cache-Speicherung verhindern. Die Seitenleiste verwendet eine automatisch versionierte URL und isolierte interne Elemente, damit eine ältere zwischengespeicherte Lovelace-Karte eine Panelaktualisierung nicht blockiert. Nach einer Integrationsaktualisierung reichen normalerweise ein Neustart von Home Assistant und ein Neuladen des Browsers oder der Companion-App. Meldet das Backend die neue Version, während weiterhin die alte Oberfläche erscheint, lade ohne Cache neu oder lösche den Website-Cache, bevor du das Problem meldest. Zwischen Releases musst du weder Build-Kennungen hinzufügen noch die Ressourcen-URL bearbeiten.

<a id="a-climate-entity-is-missing"></a>
## Eine Klimaentität fehlt

Öffne die Optionen der Velair-Integration und prüfe, ob die Entität ausgewählt ist. Velair verwaltet nur `climate.*`-Entitäten, die in der Integration konfiguriert sind.

Existiert die Entität nicht mehr in Home Assistant, zeigt Velair das bestätigte Problem unter **Diagnose** an.

<a id="a-mode-is-not-available"></a>
## Ein Modus ist nicht verfügbar

Velair liest die unterstützten HVAC-Modi aus der Klimaentität. Fehlt ein Modus, meldet die Entität ihn nicht als unterstützt.

Beim Anwenden von Vorlagen oder Klonen von Zeitplänen lehnt Velair nicht unterstützte Modi mit einer klaren Fehlermeldung ab. Ändere den Block zu `Keep` oder wähle einen Modus, den das Zielgerät unterstützt.

<a id="temperature-is-adjusted-when-applying-templates"></a>
## Temperaturen werden beim Anwenden von Vorlagen angepasst

Beim Anwenden einer Vorlage prüft Velair deren effektive Klimaeinstellungen anhand des Zielthermostats. Zuerst lehnt Velair Temperaturen außerhalb des vom Thermostat angegebenen Minimums und Maximums ab. Werte innerhalb dieser Grenzen können anschließend auf die unterstützte Temperaturschrittweite gerundet werden, auch nahe einer Bereichsgrenze. Diese Prüfung gilt auch für gemeinsame Presets und verknüpfte Vorlagen: Eine inkompatible gemeinsame Konfiguration verhindert, dass der betroffene Vorgang gespeichert wird. Passe die Temperatur an oder wähle ein kompatibles Zielgerät, bevor du es erneut versuchst.

<a id="export-does-not-download-on-mobile"></a>
## Der Export wird auf Mobilgeräten nicht heruntergeladen

Der Export wird derzeit bewusst nur auf Desktopgeräten angezeigt, da mobile Companion-Apps Downloads uneinheitlich behandeln. Der Import bleibt auf Desktop- und Mobilgeräten verfügbar.

<a id="scheduler-does-not-apply-after-restart"></a>
## Der Zeitplaner wendet den Zeitplan nach einem Neustart nicht an

Standardmäßig stellt Velair nach dem Start von Home Assistant den Zustand wieder her, ohne Befehle an Klimageräte zu erzwingen.

Aktiviere in den Einstellungen **Aktiven Zeitplan nach dem Start anwenden**, wenn Velair den aktiven Zeitplan nach einem Neustart anwenden soll.

<a id="reset-to-defaults"></a>
## Auf Standardwerte zurücksetzen

Verwende **Einstellungen > Wartung > Velair zurücksetzen**. Dadurch werden alle gespeicherten Velair-Daten gelöscht: Zeitpläne, Vorlagen, Panelpräferenzen, aktive temporäre Anpassungen und Pausen, Komfort- und Room-Assist-Einstellungen, Einstellungen und Lerndaten der adaptiven Vorkonditionierung sowie das Startverhalten. Anschließend werden für die aktuell verwalteten Klimageräte Standardwerte in der passenden Einheit neu erstellt.

Exportiere die Daten vorher, wenn du sie später wiederherstellen möchtest.

<a id="temperature-unit-requires-attention"></a>
## Die Temperatureinheit muss geprüft werden

Velair liest die Temperatureinheit aus Home Assistant. Melden die Einstellungen unterschiedliche Einheiten für die gespeicherten Daten und Home Assistant, bleiben automatische Zeitplanung und temperaturbezogene Schreibvorgänge angehalten. So wird kein alter Zielwert mit falscher Bedeutung angewendet.

- Bietet Velair eine Migration gespeicherter Temperaturen an, prüfe, ob alle gespeicherten Werte weiterhin die angezeigte Ausgangseinheit verwenden, und führe die Migration einmal aus. Ohne Migration bleibt die Zeitplanung einfach angehalten; Velair konvertiert die Daten niemals stillschweigend.
- Erfordert die Aktualisierung veröffentlichter älterer Celsius-Daten ein Zurücksetzen, exportiere bei Bedarf zuerst eine Kopie als Referenz. Verwende dann **Velair zurücksetzen**, um Standardwerte in der aktuellen Home-Assistant-Einheit zu erstellen.
- Wurden Zurücksetzen, Migration oder Import gespeichert, ist aber die Laufzeitwiederherstellung fehlgeschlagen, lade die Velair-Integration neu oder starte Home Assistant neu. Velair bleibt bis zur Wiederherstellung bewusst angehalten.

Wird ein Zeitplan nach der Wiederverfügbarkeit eines Klimageräts als inkompatibel markiert, prüfe dessen Zieltemperatur anhand des gemeldeten Bereichs und des wirksamen Temperaturschritts. Fehlt `target_temp_step`, konfiguriere die tatsächliche Geräteschrittweite in der Einstellungszeile dieses Klimageräts. Das Feld zeigt den letzten gültigen Schritt, den Velair gespeichert hat, danach einen gespeicherten manuellen Ersatzwert oder `1`, wenn keiner davon vorliegt. Speichern eines manuellen Werts bei fehlendem Attribut ersetzt die gemerkte Meldung. Der manuelle Wert wird ignoriert, bleibt jedoch gespeichert, solange Home Assistant einen gültigen Schritt meldet.

Ältere Sicherungen ohne vermerkte Einheit werden als Celsius akzeptiert. Der Importbildschirm zeigt diese Annahme und konvertiert ausgewählte temperaturbezogene Werte, wenn Home Assistant aktuell Fahrenheit verwendet.

Die vollständige Entscheidungshilfe und das Verhalten von Sicherungen findest du unter [Temperatureinheiten und Migration](temperature-units.de.md).
