<a id="resilient-climate-delivery"></a>
# Zuverlässige Übermittlung von Klimasteuerbefehlen
<!-- velair-docs:start -->
Übersetzungen: [Englisches Original](resilient-climate-delivery.md) · [Español](resilient-climate-delivery.es.md) · [Français](resilient-climate-delivery.fr.md) · [Deutsch](resilient-climate-delivery.de.md) · [Italiano](resilient-climate-delivery.it.md) · [Nederlands](resilient-climate-delivery.nl.md) · [Polski](resilient-climate-delivery.pl.md) · [Português (Brasil)](resilient-climate-delivery.pt-br.md) · [Português (Portugal)](resilient-climate-delivery.pt-pt.md) · [Русский](resilient-climate-delivery.ru.md) · [Übersetzungsstatus](../translation-status.md)

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

Velair bewahrt die aktuelle Steuerungsabsicht des Zeitplaners, wenn sich ein verwaltetes Thermostat vorübergehend neu verbindet.

Wechselt eine Entität zu `unknown` oder `unavailable`, wartet Velair, bis Home Assistant sie wieder als verfügbar meldet. Zustandsänderungen lösen dieses Verhalten aus; Velair fragt das Gerät nicht regelmäßig ab. Nach der Wiederverbindung prüft Velair, was *jetzt* gelten soll. Der vor dem Ausfall gültige Befehl wird nicht einfach erneut gesendet.

Ein Beispiel: Ein Abwesenheitsprofil hat 17 °C angefordert, während ein Thermostat offline war. Wird vor der Wiederverbindung der Zuhause-Modus gewählt, ermittelt und übermittelt Velair die aktuelle Zuhause-Zieltemperatur statt des veralteten Befehls für 17 °C. Dasselbe gilt für Modi, temporäre Anpassung, Pause, Room Assist und die frühzeitige adaptive Vorkonditionierung.

Lehnt Home Assistant einen Klimasteueraufruf ausdrücklich ab, unternimmt Velair höchstens zwei weitere Versuche: nach ungefähr 2 Sekunden und 10 Sekunden. Eine neuere Steuerungsabsicht oder das Stoppen beziehungsweise Entladen von Velair verwirft ausstehende Aufgaben für dieses Klimagerät.

Manuelle Temperaturaktionen werden nur einmal ausgeführt. Velair wendet eine alte manuelle Zieltemperatur nach der Wiederverbindung des Geräts nicht nachträglich an.

Ein Velair-Ereignis über eine angewendete Aktion bedeutet, dass Home Assistant die vollständige Folge der Klimasteueraufrufe einschließlich des angeforderten Modus und der unterstützten Optionen angenommen hat. Es bestätigt nicht, dass das physische Gerät die Temperatur erreicht hat. Den tatsächlichen Betrieb kannst du über den Zustand der Klimaentität und die Diagnose der Geräteintegration beobachten.

Dieses Verhalten unterstützt Heizen, Kühlen, einzelne Zieltemperaturen, native `heat_cool`-Bereiche, Ausschaltaktionen sowie unterstützte Optionen für Lüfter, Voreinstellung, Schwenkfunktion und Luftfeuchtigkeit. Blöcke, die nur Optionen ändern, verwenden dieselbe Übermittlungsgrenze, ohne eine Zieltemperatur oder einen HVAC-Modus zu setzen. Ihre Dienstaufrufe werden nacheinander ausgeführt: Scheitert ein späterer Aufruf, kann eine frühere Option bereits geändert worden sein. Velair meldet den vollständigen Block dann jedoch nicht als angewendet.
