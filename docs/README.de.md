<a id="documentation"></a>
# Dokumentation
<!-- velair-docs:start -->
Übersetzungen: [Englisches Original](README.md) · [Español](README.es.md) · [Français](README.fr.md) · [Deutsch](README.de.md) · [Italiano](README.it.md) · [Nederlands](README.nl.md) · [Polski](README.pl.md) · [Português (Brasil)](README.pt-br.md) · [Português (Portugal)](README.pt-pt.md) · [Русский](README.ru.md) · [Übersetzungsstatus](translation-status.md)

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

Die Velair-Dokumentation ist nach Zielgruppe und Thema gegliedert.

<a id="user-documentation"></a>
## Benutzerdokumentation

- [Installation](user/installation.de.md): Velair über HACS oder manuell installieren.
- [Verwendung](user/usage.de.md): Klimageräte, Zeitpläne, Vorlagen, Profile, temporäre Anpassungen, Pausen, Import/Export und Dienste konfigurieren.
- [Panelnavigation und Direktlinks](user/usage.de.md#panel-navigation-and-direct-links): Tabs und Unterbereiche verlinken, den Bereich beim Neuladen wiederherstellen und den Browserverlauf verwenden.
- [Externe Änderungen und manuelle Anpassungen](user/manual-control.de.md): festlegen, ob Velair die automatische Steuerung beibehält oder Änderungen durch HA-Karten, Fernbedienungen, Geräte und Automationen den Vorrang gibt.
- [Externe Ausführung von Zeitplänen](user/external-systems.de.md): kompatible wirksame Wochenzeitpläne einschließlich Profil- und Modusauswahl an unterstützte Regler übertragen, ohne Anbieterlogik in den Velair-Zeitplaner einzubauen.
- [Klimaprofile](user/climate-profiles.de.md): alternative Zeitpläne koordinieren und konfigurierbare Modi für Home-Assistant-Automationen bereitstellen.
- [Blockvoreinstellungen und verknüpfte Vorlagen](user/linked-schedules.de.md): Klimaeinstellungen wiederverwenden und Tageszeiten oder vollständige Tageszeitpläne zwischen Standard- und Profilzeitplänen teilen.
- [Beispiele für Voreinstellungen und Vorlagen](user/linked-schedule-examples.de.md): schrittweise Anleitungen für Haushaltskonfigurationen, saisonale Zeitpläne, Kopien, gemeinsame Änderungen und Fehlerbehebung.
- [Automationen mit Voreinstellungen](user/preset-automations.de.md): gemeinsame Zieltemperaturen und Geräteeinstellungen mit Skripten aktualisieren, einschließlich Beispielen mit Außentemperatur und ausdrücklichem Ersetzen.
- [Automationsereignisse](user/automation-events.de.md): vollständige Laufzeit-Ereignisdaten in Home-Assistant-Automationen verwenden.
- [Automations-Blueprints](user/blueprints.de.md): optionale Helfer für Anwesenheit, offene Fenster und saisonale Temperaturen importieren, die ohne regelmäßige Abfragen auskommen.
- [Saisonale Auswahl der Klimasteuerung](user/blueprints/seasonal-climate-selection.de.md): Modi oder andere Aktionen anhand stabiler Temperaturänderungen auswählen, mit sofortigen Diagnosebenachrichtigungen.
- [Adaptive Vorkonditionierung](user/adaptive-preconditioning.de.md): geplante Komforttemperaturen dank lokalen Lernens frühzeitig vorbereiten.
- [Geplante Rückkehr](user/planned-return.de.md): anwesenheitsabhängige Abwesenheit und wöchentliche oder einmalige Ankünfte konfigurieren, mit Beispielen für einen Abbruch vor und nach bestätigtem Verlassen des Zuhauses.
- [Room Assist](user/room-assist.de.md): einen separaten Raumtemperatursensor für Heizkörperthermostate, Thermostate und Klimaanlagen verwenden.
- [Versorgungssteuerung](user/shared-climate-supply.de.md): gemeinsame Heiz- oder Kühlschalter anhand des geschätzten Raumbedarfs steuern, mit Versorgungshysterese und Thermostatausnahmen.
- [Zuverlässige Übermittlung von Klimasteuerbefehlen](user/resilient-climate-delivery.de.md): verzögerte Wiederholungsversuche und das Verhalten bei Wiederverbindung eines vorübergehend nicht verfügbaren Klimageräts verstehen.
- [Umgebungskomfort](user/comfort.de.md): Temperatur, Luftfeuchtigkeit, CO2-Luftqualität und Aktualität der Messwerte anhand lokaler Raumbewertungen verstehen.
- [Temperatureinheiten und Migration](user/temperature-units.de.md): Celsius-/Fahrenheit-Standardwerte, Aktualisierungen, Migration, Import/Export und Wiederherstellung verstehen.
- [Fehlerbehebung](user/troubleshooting.de.md): häufige Probleme bei Einrichtung, Frontend-Ressourcen und Betrieb lösen.
- [Diagnose](user/diagnostics.de.md): lokaler Laufzeitzustand, begrenzter Verlauf und bereinigte Fehlerberichte.
- [Sensorreferenz](user/sensors.de.md): alle Velair-Sensoren, ihre wichtigsten Attribute und praktische Automationsbeispiele.
- [Sensoren für Zonensteuerung und Befehlsübermittlung](user/zone-sensors.de.md): Steuerungszuständigkeit je Klimagerät und Laufzeitinformationen zur Übermittlung in Dashboards und Automationen verwenden.

<a id="developer-documentation"></a>
## Entwicklerdokumentation

- [Architektur](developer/architecture.md): Modulgrenzen von Backend und Frontend, Speichermodell und Zeitplanerablauf.
- [Interna verknüpfter Zeitpläne](developer/linked-schedules.md): dynamische Blockvoreinstellungen, Verknüpfungen nur für Uhrzeiten oder vollständige Vorlagen, gemeinsame Transaktionen und aufgelöste Zeitpläne.
- [Blueprint-Pflege](developer/blueprints.md): Blueprint-YAML, Katalogeinträge, einheitliche Detailseiten, Übersetzungen und Tests ergänzen.
- [WebSocket-API](developer/api.md): API-Vertrag zwischen Frontend und Backend.
- [Interna der adaptiven Vorkonditionierung](developer/adaptive-preconditioning.md): lokale Lernzustände, Ähnlichkeitsgewichtung, Speicherung und API-Ausgabe.
- [Interna von Room Assist](developer/room-assist.md): Auswahl der Raumsensorquelle, Berechnung unterstützter Ziele, Laufzeitstatus, Wiederherstellung und Ereignisse.
- [Interna der Klimabefehlsübermittlung](developer/climate-delivery.md): ereignisgesteuerte Wiederholung, Wiederherstellung der Verfügbarkeit, Serialisierung, Generationen und Erfolgsgrenzen.
- [Interna des Umgebungskomforts](developer/comfort.md): Quellenauswahl, Zustandsbewertung, Datenqualität, Ereignisüberwachung, API-Ausgabe und Ereignisse.
- [Interna der Temperatureinheiten](developer/temperature-units.md): Speichermetadaten, Migrationsgrenzen, portable Konvertierung, Validierung und Laufzeitsicherheit.
- [Frontend](developer/frontend.md): Laufzeitelemente, Build-Befehle, Lovelace-Ressource, Übersetzungen, Oberflächenprinzipien und Frontend-Arbeitsablauf.
- [Entwicklung](developer/development.md): lokale Prüfungen, generierte Dateien, Programmierrichtlinien und Ablauf für Beiträge.
- [Manuelle Tests](developer/manual-testing.md): Prüfliste für Releases und Verhalten.

<a id="project-documentation"></a>
## Projektdokumentation

- [Screenshots](project/screenshots.md): reale Screenshots.

Zukünftige Ideen und Funktionswünsche sollten in GitHub-Issues oder Discussions verfolgt werden. So können sie mit Rückmeldungen der Community weiterentwickelt werden, ohne Zusagen zu einer Roadmap zu machen.
