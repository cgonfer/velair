<a id="external-changes-and-manual-adjustment"></a>
# Modifications externes et réglage manuel
<!-- velair-docs:start -->
Traductions: [Original en anglais](manual-control.md) · [Español](manual-control.es.md) · [Français](manual-control.fr.md) · [Deutsch](manual-control.de.md) · [Italiano](manual-control.it.md) · [Nederlands](manual-control.nl.md) · [Polski](manual-control.pl.md) · [Português (Brasil)](manual-control.pt-br.md) · [Português (Portugal)](manual-control.pt-pt.md) · [Русский](manual-control.ru.md) · [État des traductions](../translation-status.md)

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

Velair peut reconnaître les changements de mode HVAC ou de température cible d’une entité `climate.*` gérée qui ne correspondent pas à une commande envoyée par Velair. Pour chaque appareil, vous choisissez si Velair conserve le contrôle automatique ou cède la main par le réglage manuel.

Une modification externe peut provenir :

- de la carte climatique standard Home Assistant ;
- d’un thermostat physique ou d’une télécommande infrarouge dont l’intégration signale le nouvel état ;
- d’une application du fabricant dont l’intégration met Home Assistant à jour ;
- d’un script ou d’une automatisation Home Assistant appelant directement l’entité climatique ;
- de toute autre source modifiant l’entité sans passer par Velair.

Velair nomme cet état **Réglage manuel**. « Manuel » décrit qui contrôle actuellement un appareil ; cela ne prouve pas qu’une personne a effectué le changement.

<a id="the-two-independent-questions"></a>
## Deux questions indépendantes

Velair distingue toujours ces concepts :

| Concept | Portée | Signification |
| --- | --- | --- |
| Programmation automatique | Un appareil géré | Velair peut appliquer sa programmation effective. |
| Réglage manuel | Un appareil géré | Une consigne ou un mode HVAC externe fait temporairement autorité. |
| Mode Velair **Manuel** | Tout l’ensemble des profils actifs | Les profils ont été sélectionnés directement, sans mode personnalisé enregistré. |
| Forçage | Un appareil | Velair applique volontairement une consigne temporaire. |
| Pause de zone | Un appareil | Des raisons indépendantes empêchent l’application de la programmation, éventuellement en éteignant l’appareil. |
| Pause ou arrêt global | Tous les appareils | Le planificateur est globalement en pause ou désactivé. |

Ces états peuvent coexister. Le mode Velair **Manuel** peut sélectionner le profil `Sleep` tandis que `climate.living_room` est en **Réglage manuel**. Le profil reste la configuration de programmation de référence, mais cet appareil conserve son réglage externe jusqu’à la fin du réglage manuel.

<a id="what-velair-observes"></a>
## Ce que Velair observe

Velair observe ces champs de contrôle des appareils gérés :

- `hvac_mode`, représenté par l’état de l’entité, notamment `off`, `heat`, `cool` et `heat_cool` ;
- `temperature` pour une consigne unique ;
- `target_temp_low` et `target_temp_high` pour une plage native.

Velair n’active pas le réglage manuel lorsque seules ces valeurs changent :

- `current_temperature` ou `hvac_action` ;
- les mesures d’humidité ;
- la disponibilité ;
- les options de ventilation, de préréglage, d’oscillation ou d’humidité cible ;
- les capacités, comme la température minimale ou les modes pris en charge.

Passer un thermostat de `cool` à `24 °C` vers `cool` à `23 °C` est un changement de consigne détecté. Une pièce passant de `24 °C` à `25 °C` sans changement de consigne n’en est pas un.

Seuls les appareils sélectionnés dans la configuration de l’intégration sont surveillés. Les états initiaux au démarrage et les transitions vers ou depuis `unknown` ou `unavailable` sont ignorés.

<a id="how-velair-recognizes-its-own-commands"></a>
## Comment Velair reconnaît ses propres commandes

Toutes les commandes climatiques de Velair passent par un adaptateur interne unique. Avant chaque appel de service Home Assistant, Velair enregistre :

- l’entité gérée ;
- les champs de contrôle et valeurs attendues ;
- un `Context` Home Assistant pour l’appel ;
- une courte échéance, conservée uniquement pendant l’exécution.

Lorsque l’entité change, Velair rapproche chaque champ modifié des valeurs attendues, en tenant compte du `target_temp_step` publié. Ce rapprochement se fait par champ : si une mise à jour contient une température Velair et un mode HVAC sans rapport, seule la température est attribuée à Velair.

Certains appareils signalent plusieurs valeurs pendant le traitement d’une commande : ancienne consigne rétablie brièvement, valeur intermédiaire, mode et température signalés dans un autre ordre. Velair conserve une courte période de stabilisation limitée aux champs qu’il a modifiés pour éviter de créer à tort un réglage manuel. Cette période ne redémarre pas à chaque retour d’état ; elle est fixée définitivement à la fin de la séquence complète de services Home Assistant. Une modification clairement issue d’un utilisateur ou d’un autre script ou d’une automatisation identifiable reste externe. Les changements après stabilisation sont traités normalement.

Si une mise à jour anonyme pendant la stabilisation ne peut pas être distinguée avec fiabilité de la réponse progressive de l’appareil, Velair conserve prudemment le contrôle automatique. Une commande refusée ou retardée ne devient donc pas un faux réglage manuel. Cet état existe uniquement pendant l’exécution et est effacé au redémarrage.

Si l’appareil diffère encore de la valeur demandée en fin de stabilisation, Velair conserve le contrôle automatique et enregistre un avertissement de stabilisation pour l’exécution actuelle. Le prochain instantané à jour du Diagnostic l’expose ; son rapport comprend les valeurs attendues et observées. Velair ne réessaie pas aveuglément la commande et ne transforme pas l’écart en réglage manuel différé.

Le registre des valeurs attendues est limité, expire automatiquement, n’est jamais enregistré durablement et n’effectue aucune interrogation périodique. Une source n’a pas besoin de conserver le `Context` Home Assistant pour permettre le rapprochement, même si un contexte conservé le rend plus précis.

Tout champ observé non rapproché d’une commande Velair est classé comme extérieur à Velair. Cela attribue la commande sans identifier son auteur : Velair ne prétend pas savoir si elle provient d’une personne, d’une télécommande, d’une automatisation, d’un service du fabricant ou du micrologiciel.

<a id="choose-a-policy"></a>
## Choisir une politique

Ouvrez **Paramètres**, trouvez l’appareil géré et utilisez **Réglages externes**. Le backend enregistre sa politique et l’inclut dans les données portables de zone. Elle s’applique dès le prochain changement externe ; la modifier n’altère ni ne termine un réglage manuel déjà actif.

<a id="keep-automatic"></a>
### Maintenir automatique

Valeur interne : `keep_automatic`.

C’est le choix par défaut, y compris pour les configurations antérieures aux réglages externes. Velair signale la modification, conserve la programmation automatique et recalcule immédiatement la consigne actuelle faisant autorité. Si une consigne contrôle l’appareil, il la réapplique par le processus normal de transmission séquentielle : programmation Par défaut ou de profil, forçage, préconditionnement actif, Room Assist, `off`, température unique ou plage native.

Les pauses et conditions du planificateur ne sont pas contournées. Une pause `none`, une pause globale, une zone désactivée, un planificateur arrêté ou l’absence de consigne actuelle n’envoie rien. Une pause de zone ou de profil `turn_off` réaffirme `off`.

<a id="manual-until-the-next-schedule-block"></a>
### Manuel jusqu’au prochain bloc programmé

Valeur interne : `until_next_block`.

Velair conserve l’état externe jusqu’au début du prochain bloc effectif de l’appareil, puis reprend l’automatique et applique la consigne faisant autorité à cet instant.

L’échéance est calculée au début du réglage manuel. Un autre changement externe pendant cette session actualise l’état conservé sans déplacer l’échéance. Sans futur bloc effectif, il n’y a pas d’expiration automatique ; utilisez **Programmation automatique** pour reprendre.

La limite du prochain bloc utilise son heure programmée, y compris pour `Off`, plutôt qu’un démarrage anticipé prévu. Par exemple, un réglage à `18:05` avec `Off` à `19:00` et le chauffage à `20:00` se termine à `19:00`, même si la prévision de chauffage commencerait plus tôt.

<a id="manual-for-a-duration"></a>
### Manuel pour une durée

Valeur interne : `for_duration`.

Velair conserve l’état externe pendant le nombre de minutes configuré. La durée initiale est de 120 minutes ; la plage autorisée va de 1 à 10 080 minutes, soit sept jours. Les valeurs déjà enregistrées, y compris 60 minutes, sont conservées. Chaque nouveau changement externe détecté redémarre la durée à partir du changement, avec la durée enregistrée de la session active, même si Paramètres a changé entre-temps. L’événement correspondant indique la politique effective de session, et non le nouveau choix par défaut de Paramètres.

<a id="manual-until-resumed"></a>
### Manuel jusqu’à la reprise

Valeur interne : `until_resumed`.

Velair conserve l’état externe indéfiniment. L’utilisateur ou une automatisation doit explicitement reprendre la programmation automatique.

<a id="what-happens-when-manual-adjustment-starts"></a>
## Ce qui se passe au début du réglage manuel

Pour chaque changement externe admissible avec l’une des trois politiques manuelles, Velair effectue une seule transition séquentielle :

1. Il capture le mode HVAC complet et la consigne unique ou la plage native depuis l’événement d’état.
2. Il enregistre une raison réservée de réglage manuel pour la zone.
3. Il termine tout forçage actif sans restaurer le forçage ni l’ancienne programmation.
4. Il fait céder la main à Room Assist sans restaurer sa correction précédente.
5. Il conserve ou réapplique si nécessaire l’état externe capturé.
6. Vue d’ensemble sélectionne **Réglage manuel** et garde **Programmation automatique** disponible.

La politique active le réglage manuel uniquement si l’automatique globale fonctionne, si la zone est activée, si le profil actif ne la met pas déjà en pause et si aucune pause de zone indépendante autre qu’un forçage n’est active. L’événement d’observation `external_climate_change_detected` est quand même émis si ces conditions empêchent l’activation. Un forçage actif est l’exception : le changement externe le remplace comme décrit ci-dessous.

Voici le résultat exact d’un changement de contrôle extérieur à Velair observé avec une politique qui activerait normalement le réglage manuel :

| État avant le changement externe | Événement | Réglage manuel activé | Action climatique immédiate |
| --- | --- | --- | --- |
| Aucune pause ni aucun forçage | Émis | Oui | Conserver le mode et la consigne externes complets. |
| Pause indépendante, action `none` | Émis | Non | Ne rien envoyer ; la pause existante continue de céder le contrôle. |
| Pause indépendante, action `turn_off` | Émis | Non | Réaffirmer `off` ; l’allumage externe ne contourne pas la pause. |
| Pause du profil actif, y compris son `turn_off` | Émis | Non | Ne rien envoyer dans ce processus ; ne pas rejouer l’action du profil uniquement à cause de l’observation. |

Un planificateur globalement en pause ou une zone désactivée suit la même règle : émettre l’événement externe, ne pas créer de réglage manuel et ne pas envoyer de nouvelle consigne programmée par ce processus de détection.

Pendant le réglage manuel, Velair calcule toujours la programmation effective Par défaut, de profil ou de mode, sans l’appliquer à cet appareil. Les autres appareils continuent normalement.

Velair ne fait pas automatiquement les choses suivantes :

- créer un forçage ;
- changer de profil ou de mode ;
- déduire qui a effectué le réglage ;
- copier le réglage dans une programmation ;
- modifier la politique d’un autre appareil ;
- supprimer des pauses indépendantes ;
- attendre que la pièce atteigne la température demandée.

<a id="what-happens-when-automatic-scheduling-resumes"></a>
## Ce qui se passe à la reprise automatique

Le réglage manuel peut se terminer à l’expiration, au prochain bloc, par le bouton de Vue d’ensemble ou par `velair.resume_automatic_control`.

Velair supprime uniquement sa raison réservée de réglage manuel, puis détermine la consigne faisant autorité à cet instant :

- la programmation d’un profil actif contrôlant la zone ;
- la programmation Par défaut si aucun profil actif ne la contrôle ou si le profil la délègue à Par défaut ;
- une pause de profil, y compris `turn_off` ;
- toute autre pause indépendante ou tout état global du planificateur.

Velair ne restaure pas le bloc actif au début du réglage manuel. Cela compte si un profil, un mode, une programmation, une pause ou l’heure a changé pendant que Velair cédait la main.

Une pause indépendante existante maintient la zone en pause. Si son action effective est `turn_off`, l’arrêt reste prioritaire. Reprendre après un réglage manuel n’équivaut donc pas à reprendre toutes les raisons de pause d’une zone.

<a id="resume-from-off-when-the-block-says-keep-current-mode"></a>
### Reprendre depuis `off` quand le bloc conserve le mode actuel

**Conserver le mode actuel** signifie que le bloc ne fournit pas de mode HVAC. Pour un bloc avec température cible, la règle normale de transmission s’applique à la reprise :

- appareil déjà allumé : conserver son mode et appliquer la consigne s’il l’accepte ; sinon, échouer sans changer de mode ;
- appareil `off` : choisir le premier mode compatible déclaré qui n’est pas `off`, puis appliquer la consigne du bloc.

Un appareil de chauffage seul déclarant `[off, heat]` reprend un bloc actif conservant le mode à `21 °C` en `heat`, `21 °C`. Un appareil de refroidissement seul déclarant `[off, cool]` reprend en `cool`, `21 °C`. Un appareil réversible peut déclarer plusieurs modes compatibles ; Velair respecte leur ordre sans déduire chauffage ou refroidissement de la saison, du lieu ou de la valeur cible. Définissez un mode HVAC explicite si ce choix doit être déterministe.

Un bloc d’options uniquement applique seulement les commandes sélectionnées. Il n’envoie pas de température et n’allume pas un appareil éteint.

<a id="complete-real-world-examples"></a>
## Exemples pratiques complets

<a id="keep-automatic-reject-a-climate-card-setpoint-change"></a>
### Maintenir automatique : refuser un changement de consigne depuis une carte climatique

Configuration :

```text
Living-room policy: Keep automatic
Current authoritative block: heat at 21 °C
```

| Heure | Action | Résultat |
| --- | --- | --- |
| 18:00 | Velair applique `heat`, `21 °C`. | Programmation automatique |
| 18:20 | Un utilisateur sélectionne `23 °C` dans la carte climatique Home Assistant. | Velair émet `external_climate_change_detected` avec `policy: keep_automatic`. |
| 18:20 | Velair recalcule le bloc toujours actif. | `heat`, `21 °C` est réappliqué ; aucun réglage manuel ni événement `zone_control_changed` n’est créé. |

La même règle s’applique au refroidissement, à `off`, aux plages natives `heat_cool`, au forçage, au préconditionnement et à Room Assist : Velair réapplique la consigne faisant autorité à la détection.

Les exemples utilisent Celsius, mais le comportement est identique en Fahrenheit.

<a id="home-assistant-card-keep-the-change-until-bedtime"></a>
### Carte Home Assistant : conserver le changement jusqu’au coucher

Configuration :

```text
Living room policy: Manual until the next schedule block
18:00 schedule block: cool at 24 °C
22:00 schedule block: cool at 25 °C
```

Chronologie :

| Heure | Action | Résultat sur l’appareil | Contrôle Velair |
| --- | --- | --- | --- |
| 18:00 | Velair applique le bloc. | `cool`, `24 °C` | Programmation automatique |
| 19:15 | L’utilisateur sélectionne `22 °C` sur la carte climatique HA. | `cool`, `22 °C` | Réglage manuel jusqu’à 22:00 |
| 20:00 | Room Assist reçoit une nouvelle mesure de pièce. | Toujours `22 °C` ; aucune correction assistée envoyée. | Réglage manuel |
| 22:00 | Le prochain bloc effectif commence. | Velair applique `cool`, `25 °C`. | Programmation automatique |

`22 °C` est respecté comme instruction temporaire, sans être écrit dans les blocs.

<a id="ir-remote-turn-on-an-ac-that-the-schedule-had-turned-off"></a>
### Télécommande infrarouge : allumer un climatiseur éteint par la programmation

Configuration :

```text
Bedroom policy: Manual until resumed
Current authoritative block: Off
```

Chronologie :

| Heure | Action | Résultat sur l’appareil | Contrôle Velair |
| --- | --- | --- | --- |
| 13:00 | Le bloc Velair laisse l’appareil éteint. | `off` | Programmation automatique |
| 14:10 | Un membre du foyer utilise la télécommande infrarouge : `cool`, `23 °C`. | L’intégration signale `cool`, `23 °C`. | Réglage manuel |
| 16:00 | La programmation prévoit toujours l’arrêt. | L’appareil reste `cool`, `23 °C`. | Réglage manuel |
| 17:30 | L’utilisateur sélectionne **Programmation automatique**. | Velair résout le bloc Arrêt toujours actif et éteint l’appareil. | Programmation automatique |

Cela nécessite que l’intégration signale le changement de télécommande à Home Assistant. Une commande infrarouge invisible dans Home Assistant ne peut pas être détectée.

<a id="a-60-minute-comfort-adjustment-changed-again"></a>
### Un réglage de confort de 60 minutes, modifié de nouveau

Configuration : `for_duration`, 60 minutes.

| Heure | Action | Résultat |
| --- | --- | --- |
| 09:00 | La programmation applique `heat`, `20 °C`. | Programmation automatique |
| 09:20 | L’utilisateur sélectionne `22 °C`. | Le réglage manuel expire à 10:20. |
| 09:50 | L’utilisateur sélectionne `21 °C`. | L’appareil reste à `21 °C` ; l’expiration est reportée à 10:50. |
| 10:50 | Aucun autre changement externe n’a eu lieu. | Velair applique la consigne faisant autorité à 10:50. |

<a id="repeated-change-with-next-block-policy"></a>
### Changements répétés avec la politique du prochain bloc

Configuration : `until_next_block` ; prochain bloc à 22:00.

| Heure | Action | Résultat |
| --- | --- | --- |
| 19:15 | L’utilisateur passe de `24 °C` à `22 °C`. | Le réglage manuel finit à 22:00. |
| 20:30 | L’utilisateur passe de `22 °C` à `23 °C`. | La valeur conservée devient `23 °C` ; l’expiration reste 22:00. |
| 22:00 | Le prochain bloc commence. | Velair reprend l’automatique et applique ce bloc. |

<a id="activate-a-profile-while-one-climate-is-manual"></a>
### Activer un profil pendant qu’un appareil est en manuel

Configuration :

```text
Default living-room intent: cool at 24 °C
Sleep Profile living-room intent: cool at 25 °C
Manual policy: until resumed
```

| Heure | Action | Salon | Autres zones du profil |
| --- | --- | --- | --- |
| 20:00 | L’utilisateur règle le salon à `22 °C`. | Réglage manuel à `22 °C` | Continuent normalement |
| 21:00 | L’utilisateur active `Sleep`. | Reste à `22 °C` ; `Sleep` devient la configuration de référence. | `Sleep` s’applique immédiatement en l’absence d’autre dérogation. |
| 21:30 | L’utilisateur reprend l’automatique du salon. | Velair applique `Sleep` : `cool`, `25 °C`. | Inchangées |

Un mode personnalisé fonctionne de même : il peut changer les profils actifs sans annuler le réglage manuel d’une zone. Avec une sélection directe des profils, le mode Velair peut afficher **Manuel** tandis que la zone affiche **Réglage manuel** ; les libellés décrivent des choses différentes.

<a id="activate-several-profiles-or-modes-while-manual"></a>
### Activer plusieurs profils ou modes pendant le réglage manuel

Supposons un état externe `heat`, `22 °C`. Pendant le maintien manuel, l’utilisateur sélectionne Présence (`21 °C`), Absence (`17 °C`), puis Sommeil (`18 °C`). Velair conserve `22 °C` tout du long. À la reprise, il applique seulement la consigne Sommeil actuelle de `18 °C`, sans rejouer Présence ou Absence ni restaurer l’ancienne consigne Par défaut.

<a id="profile-pause-and-turn_off"></a>
### Pause de profil et `turn_off`

Si un profil mettant la zone en pause est activé pendant un réglage manuel, l’état externe reste en place jusqu’à sa fin. À la reprise :

- une pause de profil sans arrêt n’envoie aucune nouvelle consigne ; la zone revient en automatique sous l’effet de la pause du profil ;
- une pause de profil `turn_off` éteint l’appareil.

Si la pause de profil précède le changement externe, Velair émet toujours `external_climate_change_detected` sans activer le réglage manuel. La détection ne rejoue pas immédiatement la pause ni son appel `turn_off` ; elle signale seulement l’observation. Un changement de profil ultérieur, une application explicite de programmation ou une autre transition du planificateur réévalue le comportement du profil.

<a id="external-adjustment-during-a-boost"></a>
### Modification externe pendant un forçage

| Heure | Action | Résultat |
| --- | --- | --- |
| 12:00 | Velair démarre un forçage en `cool`, `20 °C` jusqu’à 13:00. | Forçage |
| 12:20 | L’utilisateur passe à `cool`, `23 °C`. | Le forçage finit sans restauration ; le réglage manuel conserve `23 °C`. |
| 12:45 | L’utilisateur reprend l’automatique. | Velair applique la programmation valable à 12:45. |

L’ancien forçage ne reprend pas et son expiration initiale à 13:00 ne contrôle plus l’appareil.

<a id="room-assist-without-a-control-fight"></a>
### Room Assist sans conflit de contrôle

Supposons une consigne de refroidissement programmée à `24 °C`, une consigne temporaire Room Assist à `26 °C` et un choix externe de `23 °C`.

Velair capture l’état avant que les opérations Room Assist en attente puissent le remplacer, arrête Room Assist pour la zone sans restaurer `24 °C` et conserve `23 °C`. À la reprise automatique, Velair réévalue la programmation actuelle et Room Assist peut calculer une nouvelle consigne assistée à partir des mesures actuelles.

<a id="native-heat_cool-range"></a>
### Plage native `heat_cool`

```text
Scheduled range: 20–25 °C
External range: 19–24 °C
Policy: until resumed
```

Velair détecte `target_temp_low` et `target_temp_high`, capture l’état `heat_cool` complet et conserve `19–24 °C` pendant le réglage manuel. À la reprise, il applique la plage complète du bloc faisant actuellement autorité, sans la réduire à une consigne unique.

<a id="independent-window-pause-while-manual"></a>
### Pause indépendante pour une fenêtre pendant le réglage manuel

Supposons un appareil en manuel à `23 °C`, puis un appel d’automatisation de fenêtre à `velair.pause_zone` avec `pause_id: window` et `action: turn_off`. L’action combinée est l’arrêt ; l’appareil s’éteint. `velair.resume_automatic_control` supprime uniquement le réglage manuel ; la raison `window` reste active et l’appareil éteint. L’automatisation doit supprimer sa propre raison avec `velair.resume_zone`.

<a id="changing-the-policy-with-a-service"></a>
## Modifier la politique avec un service

Tous les exemples ci-dessous utilisent la syntaxe actuelle des actions Home Assistant.

Conserver l’automatique Velair et réappliquer sa consigne actuelle :

```yaml
action: velair.set_external_change_policy
data:
  entity_id: climate.living_room
  policy: keep_automatic
```

Conserver l’état externe jusqu’au prochain bloc :

```yaml
action: velair.set_external_change_policy
data:
  entity_id: climate.living_room
  policy: until_next_block
```

Le conserver pendant 90 minutes :

```yaml
action: velair.set_external_change_policy
data:
  entity_id: climate.living_room
  policy: for_duration
  duration_minutes: 90
```

Le conserver jusqu’à une reprise explicite :

```yaml
action: velair.set_external_change_policy
data:
  entity_id: climate.living_room
  policy: until_resumed
```

`duration_minutes` est utilisé par `for_duration` et reste enregistré comme durée de la zone si une autre politique est choisie. Les services refusent les entités non gérées, les politiques inconnues et les durées hors de la plage 1–10 080.

Modifier ce réglage pendant une session manuelle affecte seulement le prochain changement externe après cette session. La session active conserve sa politique, sa durée, son origine et son expiration. Utilisez Vue d’ensemble ou `velair.resume_automatic_control` pour la terminer.

<a id="enter-manual-adjustment-explicitly"></a>
## Activer explicitement le réglage manuel

Vue d’ensemble affiche toujours **Contrôle Velair** comme **Programmation automatique** ou **Réglage manuel** pour chaque appareil géré. Les deux choix restent visibles dans une commande segmentée. **Réglage manuel** capture le mode HVAC en direct et la consigne unique ou la plage complète, avec normalement la politique manuelle et la durée de **Paramètres > Réglages externes**. Si **Maintenir automatique** est enregistré, cette action explicite utilise **Jusqu’à la reprise** sans modifier la politique enregistrée. **Programmation automatique** reprend la consigne actuelle faisant autorité. Sélectionner le choix déjà actif n’a aucun effet.

Pendant le réglage manuel, Vue d’ensemble affiche sa politique exacte de fin et son expiration sous le sélecteur, et présente la consigne physique maintenue ou la plage native plutôt que la consigne programmée en attente. Si le manuel ne peut pas démarrer, son segment reste visible avec une explication accessible : appareil indisponible ou désactivé, programmation automatique arrêtée, profil actif mettant la zone en pause ou autre pause contrôlant la zone. Il reste aussi désactivé tant qu’une migration thermique est non résolue, car la configuration et les sessions manuelles restent immuables jusqu’à sa fin. Un forçage ne bloque pas cette action : le maintien manuel le remplace.

L’action équivalente utilise la politique enregistrée et accepte seulement `entity_id` :

```yaml
action: velair.enter_manual_adjustment
data:
  entity_id: climate.living_room
```

Pour un maintien de 90 minutes, enregistrez d’abord `for_duration` et `duration_minutes: 90` avec `velair.set_external_change_policy`, puis appelez cette action. Elle refuse les appareils non gérés, désactivés, `unknown` ou `unavailable`, et ceux bloqués par un arrêt global, une pause de profil active ou une pause indépendante. Un forçage actif est remplacé. Chauffage, refroidissement, `off`, consignes uniques et plages natives `heat_cool` sont capturés par le même processus séquentiel de transmission.

<a id="resume-with-a-service"></a>
## Reprendre avec un service

```yaml
action: velair.resume_automatic_control
data:
  entity_id: climate.living_room
```

Cette action est idempotente : l’appeler pour un appareil géré déjà en automatique ne fait rien. Elle refuse les entités non gérées.

N’utilisez pas l’identifiant interne réservé `velair.manual_adjustment` avec `velair.pause_zone` ou `velair.resume_zone`. Velair le refuse afin qu’un seul mécanisme de référence contrôle le réglage manuel. Un appel générique à `velair.resume_zone` ne le supprime pas.

<a id="automations-and-events"></a>
## Automatisations et événements

Tous les événements d’exécution utilisent `event_type: velair_event`.

<a id="observe-every-external-control-change"></a>
### Observer chaque changement externe de contrôle

Cet événement est émis si au moins un champ de mode ou de consigne observé ne peut pas être attribué à Velair :

```yaml
event_type: velair_event
event_data:
  domain: velair
  event: external_climate_change_detected
  entity_id: climate.living_room
  changed_fields:
    - hvac_mode
    - temperature
  previous:
    hvac_mode: "off"
    temperature: 24
  current:
    hvac_mode: "cool"
    temperature: 23
  policy: keep_automatic
```

Pour une plage native, `changed_fields`, `previous` et `current` utilisent `target_temp_low` et `target_temp_high` au lieu de `temperature`, selon le cas. Seuls les champs externes apparaissent ; les champs rapprochés d’une action Velair sont omis même s’ils arrivent dans la même mise à jour Home Assistant.

Exemple d’automatisation de notification :

```yaml
alias: Notify when the living-room climate changes outside Velair
triggers:
  - trigger: event
    event_type: velair_event
    event_data:
      event: external_climate_change_detected
      entity_id: climate.living_room
actions:
  - action: notify.notify
    data:
      message: >-
        Living-room climate changed outside Velair:
        {{ trigger.event.data.changed_fields | join(', ') }}.
```

<a id="observe-entry-into-or-exit-from-manual-adjustment"></a>
### Observer l’entrée ou la sortie du réglage manuel

Données d’entrée :

```yaml
event_type: velair_event
event_data:
  domain: velair
  event: zone_control_changed
  entity_id: climate.living_room
  control_mode: manual
  previous_control_mode: automatic
  policy: for_duration
  started_at: "2026-08-20T18:00:00+02:00"
  until: "2026-08-20T19:00:00+02:00"
```

Pour `until_resumed`, `until` est absent. Données de sortie :

```yaml
event_type: velair_event
event_data:
  domain: velair
  event: zone_control_changed
  entity_id: climate.living_room
  control_mode: automatic
  previous_control_mode: manual
  reason: resumed
```

L’expiration automatique utilise `reason: expired`. L’événement indique que la raison de réglage manuel a changé ; une autre pause peut encore empêcher l’application physique de la programmation.

Consultez [Événements d’automatisation](automation-events.fr.md) pour le contrat complet.

<a id="restart-and-availability-behavior"></a>
## Redémarrage et disponibilité

La politique par zone et une raison active de réglage manuel sont enregistrées durablement. Après redémarrage Home Assistant :

- un réglage manuel non expiré ou indéfini reste manuel ;
- **Appliquer la programmation active après le démarrage** ne le contourne pas ;
- à l’expiration enregistrée, Velair supprime la raison et détermine la consigne actuelle faisant autorité ;
- l’export portable inclut la politique, mais exclut volontairement l’état d’exécution du réglage manuel.

L’instantané externe mode/consigne existe seulement pendant l’exécution ; il n’est ni enregistré durablement ni rejoué après redémarrage. Normalement, l’appareil conserve et signale son état manuel tandis que la raison enregistrée par Velair empêche l’application de la programmation. Si l’appareil se réinitialise ou signale une autre consigne pendant le redémarrage, Velair ne reconstruit pas l’ancien instantané ; il attend l’expiration ou la reprise, puis détermine la consigne actuelle faisant autorité.

Velair ignore les transitions vers ou depuis `unknown` et `unavailable`. Si une modification distante survient sans que l’intégration puisse signaler l’appareil, et que la seule mise à jour ultérieure passe de `unavailable` à disponible, ce rétablissement n’est pas classé comme nouveau réglage externe. Les changements ultérieurs de mode ou de consigne sont détectables normalement une fois l’appareil disponible.

<a id="attribution-limits"></a>
## Limites d’attribution

L’attribution reste volontairement approximative : les intégrations Home Assistant et les appareils signalent leur état différemment.

- Une action physique ou chez le fournisseur n’arrivant jamais dans Home Assistant ne peut pas être détectée.
- Certains appareils publient mode et consigne dans plusieurs mises à jour, ce qui peut émettre plusieurs événements d’observation. Les automatisations doivent être idempotentes.
- Une action extérieure à Velair signalant exactement la valeur d’un champ Velair attendu encore valide peut être attribuée à Velair.
- Un appareil qui ne confirme jamais une consigne acceptée peut laisser la valeur attendue active jusqu’à sa courte échéance.
- Le rétablissement de disponibilité est ignoré, comme décrit plus haut.
- Les changements de ventilation, préréglage, oscillation, humidité et les seuls changements environnementaux sont hors du premier contrat de cette fonction.

L’interprétation prudente de `external_climate_change_detected` est : « Velair a observé un changement de contrôle non attribuable à ses propres commandes », et non « Velair a prouvé que cette personne identifiée a modifié le thermostat ».

<a id="troubleshooting-checklist"></a>
## Liste de vérification pour le dépannage

Si un réglage manuel attendu n’apparaît pas :

1. Vérifiez que l’appareil est géré par Velair.
2. Vérifiez que l’automatique globale et la zone sont actives.
3. Vérifiez que le profil actif ne met pas déjà la zone en pause.
4. Vérifiez que la source externe change `hvac_mode`, `temperature` ou une plage native dans Home Assistant, pas seulement l’affichage du fabricant ou une option ventilation/préréglage.
5. Vérifiez que l’entité n’était pas `unknown` ou `unavailable` pendant la transition.
6. Écoutez `velair_event` avec le filtre `event: external_climate_change_detected`.
7. Consultez le Diagnostic et les journaux Home Assistant pour un échec de conservation d’état ou d’appel de service climatique.

Si la zone reprend sans appliquer la température attendue, examinez le profil/mode actuel, la programmation Par défaut, les pauses indépendantes, l’état global du planificateur et si le bloc actuel est Arrêt ou Conserver. La reprise utilise toujours la consigne actuelle faisant autorité, jamais un instantané historique de l’ancienne programmation.
