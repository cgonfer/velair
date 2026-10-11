<a id="resilient-climate-delivery"></a>
# Transmission résiliente des commandes climatiques
<!-- velair-docs:start -->
Traductions: [Original en anglais](resilient-climate-delivery.md) · [Español](resilient-climate-delivery.es.md) · [Français](resilient-climate-delivery.fr.md) · [Deutsch](resilient-climate-delivery.de.md) · [Italiano](resilient-climate-delivery.it.md) · [Nederlands](resilient-climate-delivery.nl.md) · [Polski](resilient-climate-delivery.pl.md) · [Português (Brasil)](resilient-climate-delivery.pt-br.md) · [Português (Portugal)](resilient-climate-delivery.pt-pt.md) · [Русский](resilient-climate-delivery.ru.md) · [État des traductions](../translation-status.md)

<details>
<summary>État de cette traduction</summary>

| Information | État |
| --- | --- |
| Version de référence | 1.9.0-beta.1 |
| Dernière synchronisation | 2026-10-11 |
| Révision linguistique | Traduction assistée par IA |
| Par rapport à l’original | Synchronisée avec l’original anglais. |

</details>

---
<!-- velair-docs:end -->

Velair préserve les consignes du planificateur pendant la reconnexion d’un thermostat géré temporairement indisponible.

Si une entité devient `unknown` ou `unavailable`, Velair attend que Home Assistant la signale de nouveau disponible. Ce fonctionnement repose sur les changements d’état ; Velair n’interroge pas périodiquement l’appareil. À la reconnexion, il vérifie ce qui doit être actif *maintenant*, sans rejouer la commande en vigueur avant la coupure.

Supposons qu’un profil Absence ait demandé 17 °C pendant qu’un thermostat était hors ligne. Si le mode Présence est sélectionné avant sa reconnexion, Velair détermine et transmet la consigne Présence actuelle, au lieu de l’ancienne commande à 17 °C. La même règle s’applique aux modes, au Forçage, à la Pause, à Room Assist et au préconditionnement adaptatif anticipé.

Lorsque Home Assistant refuse explicitement un appel climatique, Velair effectue au maximum deux tentatives supplémentaires : après environ 2 secondes et 10 secondes. Une consigne plus récente, l’arrêt ou le déchargement de Velair annule les opérations en attente pour cet appareil.

Les actions manuelles de température sont exécutées une seule fois. Velair ne réapplique pas une ancienne consigne manuelle après la reconnexion de l’appareil.

Un événement Velair indiquant une application signifie que Home Assistant a accepté toute la séquence d’appels climatiques, y compris le mode demandé et les options prises en charge. Cela ne confirme pas que l’appareil physique a atteint la température. Consultez l’état de l’entité climatique et le diagnostic de son intégration pour observer son fonctionnement réel.

Ce comportement s’applique au chauffage, au refroidissement, aux consignes uniques, aux plages natives `heat_cool`, aux actions d’arrêt et aux options prises en charge de ventilation, de préréglage, d’oscillation et d’humidité. Les blocs contenant uniquement des options suivent les mêmes règles de transmission, sans définir de consigne ni de mode HVAC. Leurs appels de services sont séquentiels : si un appel ultérieur échoue, une option précédente peut déjà avoir changé, mais Velair ne signale pas que le bloc complet a été appliqué.
