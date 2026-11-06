<a id="resilient-climate-delivery"></a>
# Transmission résiliente des commandes climatiques
<!-- velair-docs:start -->
Traductions: [Original en anglais](resilient-climate-delivery.md) · [Español](resilient-climate-delivery.es.md) · [Français](resilient-climate-delivery.fr.md) · [Deutsch](resilient-climate-delivery.de.md) · [Italiano](resilient-climate-delivery.it.md) · [Nederlands](resilient-climate-delivery.nl.md) · [Polski](resilient-climate-delivery.pl.md) · [Português (Brasil)](resilient-climate-delivery.pt-br.md) · [Português (Portugal)](resilient-climate-delivery.pt-pt.md) · [Русский](resilient-climate-delivery.ru.md) · [État des traductions](../translation-status.md)

<details>
<summary>État de cette traduction</summary>

| Information | État |
| --- | --- |
| Version de référence | 1.9.0-beta.10 |
| Dernière synchronisation | 2026-11-04 |
| Révision linguistique | Traduction assistée par IA |
| Par rapport à l’original | Synchronisée avec l’original anglais. |

</details>

---
<!-- velair-docs:end -->

Velair préserve les consignes du planificateur pendant la reconnexion d’un thermostat géré temporairement indisponible.

Si une entité devient `unknown` ou `unavailable`, Velair attend que Home Assistant la signale de nouveau disponible. Ce fonctionnement repose sur les changements d’état ; Velair n’interroge pas périodiquement l’appareil. À la reconnexion, il vérifie ce qui doit être actif *maintenant*, sans rejouer la commande en vigueur avant la coupure.

Supposons qu’un profil Absence ait demandé 17 °C pendant qu’un thermostat était hors ligne. Si le mode Présence est sélectionné avant sa reconnexion, Velair détermine et transmet la consigne Présence actuelle, au lieu de l’ancienne commande à 17 °C. La même règle s’applique aux modes, au Forçage, à la Pause, à Room Assist et au préconditionnement adaptatif anticipé.

Lorsque Home Assistant refuse un appel climatique, ou l’accepte mais que l’équipement continue à signaler une consigne différente, Velair effectue au maximum deux tentatives supplémentaires au cours de cet épisode de transmission. La première attend environ 2 secondes, puis la seconde environ 10 secondes supplémentaires. Après la dernière tentative acceptée, Velair attend 5 secondes pour recevoir le signalement de la consigne. Un signalement conforme peut terminer la confirmation plus tôt ; les équipements qui signalent la valeur demandée n’ont pas besoin de nouvelle tentative.

Le rétablissement est indépendant pour chaque zone gérée. Si plusieurs équipements distincts changent de bloc ensemble, seul celui dont la consigne reste différente reçoit une nouvelle tentative. Les autres ne sont ni retardés ni commandés à nouveau. Ces vérifications utilisent les états signalés par Home Assistant et les écouteurs de changements d’état existants, sans interrogation périodique de l’appareil.

Avant de réessayer, Velair vérifie à nouveau la consigne actuelle, y compris tout nouveau bloc, Forçage ou pause. Une consigne plus récente, l’arrêt ou le déchargement de Velair annule les opérations obsolètes en attente pour cet équipement. Diagnostic indique si la confirmation est en attente, obtenue, rétablie après une nouvelle tentative ou toujours absente. Un échec silencieux corrigé reste également dans l’historique de transmission limité.

Un véritable passage d’indisponible à disponible conserve le rétablissement après reconnexion. Si une confirmation ou un rétablissement est déjà en attente, l’échéance initiale et le budget de tentatives sont conservés ; un signalement conforme peut terminer la confirmation sans commande supplémentaire. Sinon, la reconnexion démarre un nouvel épisode de transmission pour la consigne actuelle. Les signalements ordinaires de température, d’humidité ou de consigne ne réinitialisent pas un budget de tentatives épuisé. Un signalement tardif correspondant à la consigne demandée supprime l’écart sans envoyer de commande supplémentaire.

Les actions manuelles de température sont exécutées une seule fois. Velair ne réapplique pas une ancienne consigne manuelle après la reconnexion de l’appareil.

Un événement Velair indiquant une application signifie que Home Assistant a accepté toute la séquence d’appels climatiques, y compris le mode demandé et les options prises en charge. Cela ne confirme pas que l’appareil physique a atteint la température. Consultez l’état de l’entité climatique et le diagnostic de son intégration pour observer son fonctionnement réel.

Ce comportement s’applique au chauffage, au refroidissement, aux consignes uniques, aux plages natives `heat_cool`, aux actions d’arrêt et aux options prises en charge de ventilation, de préréglage, d’oscillation et d’humidité. Les blocs contenant uniquement des options suivent les mêmes règles de transmission, sans définir de consigne ni de mode HVAC. Leurs appels de services sont séquentiels : si un appel ultérieur échoue, une option précédente peut déjà avoir changé, mais Velair ne signale pas que le bloc complet a été appliqué.
