<a id="automation-blueprints"></a>
# Automations-Blueprints
<!-- velair-docs:start -->
Übersetzungen: [Englisches Original](blueprints.md) · [Español](blueprints.es.md) · [Français](blueprints.fr.md) · [Deutsch](blueprints.de.md) · [Italiano](blueprints.it.md) · [Nederlands](blueprints.nl.md) · [Polski](blueprints.pl.md) · [Português (Brasil)](blueprints.pt-br.md) · [Português (Portugal)](blueprints.pt-pt.md) · [Русский](blueprints.ru.md) · [Übersetzungsstatus](../translation-status.md)

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

Velair belässt Anwesenheit, Türen, Gäste und haushaltsspezifische Bedingungen in Home Assistant, statt eine zweite Automationsplattform aufzubauen. Diese optionalen Blueprints bieten geführte Ausgangspunkte für häufige Fälle und bleiben dabei vollständig lokal und ereignisgesteuert.

Der Import eines Blueprints verändert Velair nicht von selbst. Home Assistant fügt zunächst den wiederverwendbaren Blueprint hinzu; anschließend erstellst und konfigurierst du daraus eine Automation. Bestehende Automationen erhalten Blueprint-Aktualisierungen durch erneuten Import. Alternativ kannst du mit **Kontrolle übernehmen** daraus eine unabhängige Home-Assistant-Automation machen.

HACS-Integrationspakete kopieren Automations-Blueprints nicht automatisch in das Blueprint-Verzeichnis von Home Assistant. Verwende die folgenden Importlinks.

<a id="available-blueprints"></a>
## Verfügbare Blueprints

Die Blueprints sind nach ihren englischen Namen alphabetisch aufgeführt.

- [Zuhause und Abwesend anhand der Anwesenheit](#home-and-away-from-occupancy)
- [Zone bei offenen Fenstern pausieren](#pause-a-zone-while-windows-are-open)
- [Saisonale Auswahl der Klimasteuerung](#seasonal-climate-selection)

<hr>

<a id="home-and-away-from-occupancy"></a>
### Zuhause und Abwesend anhand der Anwesenheit

Führe gewählte Home-Assistant-Aktionen aus, wenn eine zusammengefasste Anwesenheitsentität zu „anwesend“ oder „abwesend“ wechselt. Die Aktionen können einen Velair-Modus wählen, ein Profil aktivieren oder Velair mit dem übrigen Zuhause koordinieren. Eine verzögerte Benachrichtigung meldet, wenn die Anwesenheitsinformation nicht verfügbar ist.

**Version:** 1.0.0 · **Voraussetzung:** Home Assistant 2024.6.0+

<p>
  <a href="blueprints/home-away-from-occupancy.de.md"><img src="https://img.shields.io/badge/Documentation-View-24292F?style=for-the-badge&amp;logo=github&amp;logoColor=white" alt="Dokumentation für Zuhause und Abwesend anhand der Anwesenheit öffnen"></a>
  <a href="https://my.home-assistant.io/redirect/blueprint_import/?blueprint_url=https%3A%2F%2Fraw.githubusercontent.com%2Fcgonfer%2Fvelair%2Fmain%2Fblueprints%2Fautomation%2Fvelair%2Foccupancy_home_away.yaml"><img src="https://my.home-assistant.io/badges/blueprint_import.svg" alt="Home Assistant öffnen und den Blueprint für Zuhause und Abwesend anhand der Anwesenheit importieren" height="28"></a>
</p>

<hr>

<a id="pause-a-zone-while-windows-are-open"></a>
### Zone bei offenen Fenstern pausieren

Pausiere ein oder mehrere von Velair verwaltete Klimageräte, solange mindestens ein ausgewähltes Fenster oder eine Tür offen ist. Setze ihre Zeitpläne anschließend nur dort fort, wo die Automation weiterhin für die aktive Pause zuständig ist. Eine verzögerte Home-Assistant-Benachrichtigung nennt nicht verfügbare Kontakte und betroffene Thermostate.

**Version:** 1.0.0 · **Voraussetzung:** Home Assistant 2024.6.0+ und Velair 1.6.0+

<p>
  <a href="blueprints/pause-zone-for-open-windows.de.md"><img src="https://img.shields.io/badge/Documentation-View-24292F?style=for-the-badge&amp;logo=github&amp;logoColor=white" alt="Dokumentation für das Pausieren einer Zone bei offenen Fenstern öffnen"></a>
  <a href="https://my.home-assistant.io/redirect/blueprint_import/?blueprint_url=https%3A%2F%2Fraw.githubusercontent.com%2Fcgonfer%2Fvelair%2Fmain%2Fblueprints%2Fautomation%2Fvelair%2Fwindow_pause.yaml"><img src="https://my.home-assistant.io/badges/blueprint_import.svg" alt="Home Assistant öffnen und den Blueprint zum Pausieren einer Zone bei offenen Fenstern importieren" height="28"></a>
</p>

<hr>

<a id="seasonal-climate-selection"></a>
### Saisonale Auswahl der Klimasteuerung

Führe konfigurierbare Aktionen für Winter, mildes Wetter oder Sommer aus, nachdem ein geänderter Temperatursensorwert für eine positive Verzögerungsdauer stabil geblieben ist; anfangs sind das 30 Minuten. Im normalen Aktionseditor wählst du Velair-Modi oder andere Home-Assistant-Aktionen. Ungültige Messwerte erzeugen sofort eine Benachrichtigung; beim Start wird die Diagnose geprüft, ohne eine Saison auszuwählen.

Diagnosebenachrichtigungen unterstützen dieselben Sprachen wie Velair. Die Sprache wird im Blueprint ausdrücklich gewählt.

**Version:** 1.0.0 · **Voraussetzung:** Home Assistant 2024.6.0+ · **Kategorie:** Temperatur / saisonale Automation

<p>
  <a href="blueprints/seasonal-climate-selection.de.md"><img src="https://img.shields.io/badge/Documentation-View-24292F?style=for-the-badge&amp;logo=github&amp;logoColor=white" alt="Dokumentation für die saisonale Auswahl der Klimasteuerung öffnen"></a>
  <a href="https://my.home-assistant.io/redirect/blueprint_import/?blueprint_url=https%3A%2F%2Fraw.githubusercontent.com%2Fcgonfer%2Fvelair%2Fmain%2Fblueprints%2Fautomation%2Fvelair%2Fseasonal_climate_selection.yaml"><img src="https://my.home-assistant.io/badges/blueprint_import.svg" alt="Home Assistant öffnen und den Blueprint für die saisonale Auswahl der Klimasteuerung importieren" height="28"></a>
  <a href="https://raw.githubusercontent.com/cgonfer/velair/main/blueprints/automation/velair/seasonal_climate_selection.yaml"><img src="https://img.shields.io/badge/YAML_source-View-24292F?style=for-the-badge&amp;logo=github&amp;logoColor=white" alt="YAML-Quelldatei für die saisonale Auswahl der Klimasteuerung öffnen"></a>
</p>

<hr>

<a id="shared-behavior"></a>
## Gemeinsames Verhalten

- Blueprints reagieren auf Zustands- und Startereignisse von Home Assistant; sie fragen nicht regelmäßig ab.
- Konfigurierbare Verzögerungen filtern kurze Zustandsänderungen.
- Zustände `unknown` und `unavailable` werden vorsichtig behandelt.
- Der Anwesenheits-Blueprint meldet anhaltende Verfügbarkeitsprobleme der Anwesenheitsinformation und entfernt die Warnung nach der Wiederherstellung.
- Der Fenster-Blueprint meldet anhaltende Verfügbarkeitsprobleme von Kontakten, ohne die Steuerung weiterhin funktionierender Kontakte zu verzögern.
- Der saisonale Blueprint meldet ungültige Temperaturmesswerte sofort und wählt beim Start niemals eine Saison.
- Die Blueprint-Konfiguration bleibt in Home Assistant und wird nicht in Velair gespeichert.
- Ein erneuter Import derselben URL aktualisiert den Blueprint, den bestehende Automationen verwenden.

Jede Blueprint-Seite beschreibt ihre Voraussetzungen, Konfiguration, ein Beispiel, Sicherheitsverhalten, Grenzen und Schritte zur Fehlerbehebung.

<a id="versions-and-updates"></a>
## Versionen und Aktualisierungen

Blueprints haben eigene semantische Versionen, unabhängig von der Velair-Integration. Die Importlinks folgen bewusst der fortlaufenden Version auf `main`. Importiere dieselbe URL erneut, wenn du eine kompatible Aktualisierung für eine bestehende Automation möchtest. Home Assistant aktualisiert importierte Blueprints nicht automatisch.

Aktualisierungen innerhalb von Version 1 behalten bestehende Eingabenamen bei; neue Eingaben erhalten einen Standardwert. Eine inkompatible Änderung wird unter einem neuen Dateinamen und einer neuen Hauptversion veröffentlicht, während die bisherige URL verfügbar bleibt. Velair untersucht oder migriert weder Home-Assistant-Automationen noch `.storage`-Daten. **Kontrolle übernehmen** macht eine Automation unabhängig, beendet aber auch den Bezug späterer Blueprint-Aktualisierungen.
