<a id="resilient-climate-delivery"></a>
# Zuverlässige Übermittlung von Klimasteuerbefehlen
<!-- velair-docs:start -->
Übersetzungen: [Englisches Original](resilient-climate-delivery.md) · [Español](resilient-climate-delivery.es.md) · [Français](resilient-climate-delivery.fr.md) · [Deutsch](resilient-climate-delivery.de.md) · [Italiano](resilient-climate-delivery.it.md) · [Nederlands](resilient-climate-delivery.nl.md) · [Polski](resilient-climate-delivery.pl.md) · [Português (Brasil)](resilient-climate-delivery.pt-br.md) · [Português (Portugal)](resilient-climate-delivery.pt-pt.md) · [Русский](resilient-climate-delivery.ru.md) · [Übersetzungsstatus](../translation-status.md)

<details>
<summary>Status dieser Übersetzung</summary>

| Angabe | Status |
| --- | --- |
| Referenzversion | 1.9.0-beta.10 |
| Letzte Synchronisierung | 2026-11-04 |
| Sprachliche Prüfung | KI-gestützte Übersetzung |
| Vergleich mit dem Original | Mit dem englischen Original synchronisiert. |

</details>

---
<!-- velair-docs:end -->

Velair bewahrt die aktuelle Steuerungsabsicht des Zeitplaners, wenn sich ein verwaltetes Thermostat vorübergehend neu verbindet.

Wechselt eine Entität zu `unknown` oder `unavailable`, wartet Velair, bis Home Assistant sie wieder als verfügbar meldet. Zustandsänderungen lösen dieses Verhalten aus; Velair fragt das Gerät nicht regelmäßig ab. Nach der Wiederverbindung prüft Velair, was *jetzt* gelten soll. Der vor dem Ausfall gültige Befehl wird nicht einfach erneut gesendet.

Ein Beispiel: Ein Abwesenheitsprofil hat 17 °C angefordert, während ein Thermostat offline war. Wird vor der Wiederverbindung der Zuhause-Modus gewählt, ermittelt und übermittelt Velair die aktuelle Zuhause-Zieltemperatur statt des veralteten Befehls für 17 °C. Dasselbe gilt für Modi, temporäre Anpassung, Pause, Room Assist und die frühzeitige adaptive Vorkonditionierung.

Lehnt Home Assistant einen Klimasteueraufruf ab oder nimmt ihn an, während das Klimagerät weiterhin einen anderen Zielwert meldet, unternimmt Velair in diesem Übermittlungsvorgang höchstens zwei weitere Versuche. Der erste wartet ungefähr 2 Sekunden, der zweite weitere ungefähr 10 Sekunden. Nach dem letzten angenommenen Versuch wartet Velair 5 Sekunden auf die Zielwertmeldung. Eine übereinstimmende Meldung kann die Bestätigung früher abschließen; Geräte, die den angeforderten Wert melden, benötigen keine Wiederholung.

Die Wiederherstellung erfolgt unabhängig für jede verwaltete Zone. Wechseln mehrere separate Klimageräte gleichzeitig den Block, erhält nur das Gerät mit weiterhin abweichendem Zielwert eine Wiederholung. Die anderen Geräte werden weder aufgehalten noch erneut angesteuert. Die Prüfungen verwenden die von Home Assistant gemeldeten Zustände und vorhandene Listener für Zustandsänderungen, ohne das Gerät regelmäßig abzufragen.

Vor jeder Wiederholung prüft Velair die aktuelle Steuerungsabsicht erneut, einschließlich eines neuen Blocks, einer temporären Anpassung oder Pause. Eine neuere Absicht oder das Stoppen beziehungsweise Entladen von Velair verwirft veraltete ausstehende Aufgaben für dieses Klimagerät. Die Diagnose zeigt, ob die Bestätigung aussteht, vorliegt, nach einer Wiederholung wiederhergestellt wurde oder weiterhin fehlt. Ein behobener stiller Fehler bleibt ebenfalls im begrenzten Übermittlungsverlauf erhalten.

Ein tatsächlicher Wechsel von nicht verfügbar zu verfügbar behält die Wiederherstellung nach Wiederverbindung bei. Steht eine Bestätigung oder Wiederherstellung bereits aus, bleiben der ursprüngliche Ablaufzeitpunkt und das Wiederholungsbudget erhalten; eine übereinstimmende Meldung kann die Bestätigung ohne einen weiteren Befehl abschließen. Andernfalls beginnt die Wiederverbindung einen neuen Übermittlungsvorgang für den aktuellen Zielwert. Normale Temperatur-, Luftfeuchtigkeits- oder Zielwertmeldungen setzen ein ausgeschöpftes Wiederholungsbudget nicht zurück. Eine verspätete Meldung, die dem angeforderten Zielwert entspricht, hebt die Abweichung auf, ohne einen weiteren Befehl zu senden.

Manuelle Temperaturaktionen werden nur einmal ausgeführt. Velair wendet eine alte manuelle Zieltemperatur nach der Wiederverbindung des Geräts nicht nachträglich an.

Ein Velair-Ereignis über eine angewendete Aktion bedeutet, dass Home Assistant die vollständige Folge der Klimasteueraufrufe einschließlich des angeforderten Modus und der unterstützten Optionen angenommen hat. Es bestätigt nicht, dass das physische Gerät die Temperatur erreicht hat. Den tatsächlichen Betrieb kannst du über den Zustand der Klimaentität und die Diagnose der Geräteintegration beobachten.

Dieses Verhalten unterstützt Heizen, Kühlen, einzelne Zieltemperaturen, native `heat_cool`-Bereiche, Ausschaltaktionen sowie unterstützte Optionen für Lüfter, Voreinstellung, Schwenkfunktion und Luftfeuchtigkeit. Blöcke, die nur Optionen ändern, verwenden dieselbe Übermittlungsgrenze, ohne eine Zieltemperatur oder einen HVAC-Modus zu setzen. Ihre Dienstaufrufe werden nacheinander ausgeführt: Scheitert ein späterer Aufruf, kann eine frühere Option bereits geändert worden sein. Velair meldet den vollständigen Block dann jedoch nicht als angewendet.
