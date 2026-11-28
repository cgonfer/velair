<a id="room-assist"></a>
# Room Assist

<!-- velair-docs:start -->
Traductions: [Original en anglais](room-assist.md) · [Español](room-assist.es.md) · [Français](room-assist.fr.md) · [Deutsch](room-assist.de.md) · [Italiano](room-assist.it.md) · [Nederlands](room-assist.nl.md) · [Polski](room-assist.pl.md) · [Português (Brasil)](room-assist.pt-br.md) · [Português (Portugal)](room-assist.pt-pt.md) · [Русский](room-assist.ru.md) · [État des traductions](../translation-status.md)

<details>
<summary>État de cette traduction</summary>

| Information | État |
| --- | --- |
| Version de référence | 1.9.3-beta.5 |
| Dernière synchronisation | 2026-11-25 |
| Révision linguistique | Traduction assistée par IA |
| Par rapport à l’original | Modifications en attente |

</details>

> L’original a changé ; cette traduction peut être obsolète. [Original en anglais](room-assist.md)

---
<!-- velair-docs:end -->

Room Assist permet à Velair d’utiliser un capteur de température ambiante distinct pour un appareil géré, tout en contrôlant l’entité réelle `climate.*`.

Avec un bloc **Température uniquement**, Room Assist est suspendu lorsque l’équipement est éteint. Il ne l’allume pas et ne rétablit pas un ancien mode HVAC en effaçant sa correction précédente. Après une mise en marche externe, il peut assister avec le mode réel compatible sans demander de changement de mode. La mise à jour de la cible programmée à l’arrêt dépend toujours de l’intégration climatique.

C’est utile pour les têtes thermostatiques, vannes de radiateur, thermostats muraux ou climatiseurs dont la mesure intégrée ne représente pas la température réelle de la pièce. Par exemple, une tête montée près d’un radiateur peut signaler `22 °C` alors que le capteur ambiant indique encore `20.5 °C`.

Tous les calculs utilisent l’unité native Home Assistant de l’entité climatique gérée. Les exemples utilisent Celsius pour être lisibles, mais les mêmes limites d’hystérésis, corrections signées, protections de la consigne programmée, largeurs de plage, pas de consigne et limites physiques s’appliquent directement en Fahrenheit. Un écart ambiant de `4 °F` correspond par exemple à une correction de `4 °F` ; il n’est pas traité comme une température absolue ni augmenté du décalage Celsius/Fahrenheit.

Room Assist fonctionne localement et par événements. Velair n’interroge pas continuellement les capteurs et n’envoie pas leurs données hors de Home Assistant.

<a id="what-it-does"></a>
## Ce que fait Room Assist

Velair conserve la consigne programmée comme véritable objectif de l’utilisateur, mais ajuste temporairement la consigne envoyée à l’entité à partir du capteur ambiant externe et de la mesure propre de l’appareil.

Pour une consigne unique en `heat` ou `cool` fixe, une bande morte non nulle crée deux limites de commutation. Avec le freinage **Par défaut**, Room Assist mémorise la limite visée et change de direction seulement lorsque le capteur externe atteint la limite opposée. Cela crée un véritable cycle d’hystérésis avec le capteur externe, plutôt que de laisser le capteur interne relancer un cycle près de la consigne centrale. Le décalage maximal d’assistance limite la correction signée calculée depuis la limite active. Les niveaux facultatifs de freinage retirent la demande plus fermement ; **Élevé** commence ce retrait à la cible programmée plutôt qu’à la limite de commutation éloignée.

Les consignes uniques `auto` et `heat_cool`, ainsi que les plages natives `heat_cool`, conservent leur comportement neutre ou leurs marges de plage. Velair ne force pas ces modes à alterner entre chauffage et refroidissement actifs selon un cycle d’hystérésis à consigne unique.

L’entité climatique reste l’actionneur. Velair ne crée pas d’entité climatique virtuelle et ne contourne pas le micrologiciel. Si votre thermostat ou votre tête thermostatique permet d’associer directement un capteur externe, cette option native reste généralement le meilleur premier choix.

Pour deux consignes en `heat` ou `cool` fixe, sélectionnez d’abord **Consigne de référence** pour cet équipement et ce mode dans **Paramètres → Équipements et groupes**. Choisissez **Consigne basse** ou **Consigne haute** selon la valeur réellement utilisée ; Velair ne la déduit pas de la capacité à gérer des plages. Le préconditionnement adaptatif partage ce choix.

Room Assist utilise la limite choisie comme cible fixe de chauffage ou de refroidissement, avec le cycle d’hystérésis à cible unique et la protection de la cible programmée. Il déplace les deux consignes du même écart, conservant leur séparation. Les deux limites doivent respecter le pas et les limites physiques de l’équipement ; l’autre limite peut donc restreindre la correction disponible. Les informations sur les limites physiques restent disponibles dans le graphique et **Données techniques**.

Avec **Non configurée**, les paires en mode fixe sont envoyées sans modification ni correction Room Assist. Les plages `auto` restent incompatibles avec l’assistance ; les bandes natives `heat_cool` conservent leur comportement. Les réglages enregistrés restent conservés. Changer de référence ou de mode efface l’assistance obsolète sans rétablir une ancienne cible corrigée sur la nouvelle intention.

<a id="setup"></a>
## Configuration

1. Ouvrez l’onglet Room Assist.
2. Développez l’appareil à configurer.
3. Dans **Assistance du capteur ambiant**, choisissez **Capteur fixe** ou **Selon les horaires**, configurez l’option choisie et enregistrez tout changement de mode.
4. Activez **Assistance du capteur ambiant**.
5. Réglez la bande morte de Room Assist pour définir les limites basse et haute du chauffage ou refroidissement fixe autour de la cible unique ou de la référence de plage choisie, ou la marge neutre des modes automatiques à cible unique et des bandes natives `heat_cool`.
6. Ajustez **Écart d’assistance maximal** si la valeur par défaut est trop faible pour la pièce ou inférieure à l’écart de consigne dont le thermostat peut avoir besoin pour arrêter de chauffer ou refroidir.
7. Choisissez éventuellement **Freinage : Modéré** ou **Élevé** pour retirer la demande plus fermement. Ces niveaux nécessitent une bande morte Room Assist supérieure à zéro. **Par défaut** conserve le fonctionnement existant.
8. Configurez éventuellement **Marge minimale de commande** si les petites corrections ne font pas réagir le thermostat. Augmentez d’abord l’Écart d’assistance maximal si nécessaire ; la marge ne peut pas le dépasser. Laissez-la à `0` pour conserver le comportement existant.
9. Ajustez **Délai d’actualisation** si les mises à jour semblent trop lentes ou trop fréquentes.

Seule l’option sélectionnée est affichée. Lorsque **Capteur fixe** est déjà le mode enregistré, changer son capteur est enregistré immédiatement. Passer de **Capteur fixe** à **Selon les horaires**, ou inversement, modifie un brouillon : **Enregistrer** applique le mode et ses réglages, et **Annuler** rétablit la configuration enregistrée. Le capteur fixe et la programmation enregistrée sont conservés lors du changement ; les deux ne sont pas activés en même temps.


<a id="optional-braking"></a>

### Freinage facultatif

Le freinage modifie la consigne envoyée à l’équipement tout en conservant la température programmée comme véritable objectif de la pièce. Il est disponible en **Chauffage** et **Refroidissement** fixes, y compris pour les appareils à deux consignes avec une consigne de référence configurée. Il ne modifie pas les modes automatiques à consigne unique ni les bandes natives `heat_cool`.

**T** est la cible programmée, **H** la bande morte Room Assist et **S** le pas effectif de consigne de l’équipement :

| Freinage | Chauffage : retirer la demande | Chauffage : redemander du chauffage | Refroidissement : retirer la demande | Refroidissement : redemander du refroidissement |
| --- | --- | --- | --- | --- |
| Par défaut | Fonctionnement existant | Fonctionnement existant | Fonctionnement existant | Fonctionnement existant |
| Modéré | À T + H | À T − H | À T − H | À T + H |
| Élevé | À T | À T − H | À T | À T + H |

Pendant le retrait, **Modéré** limite la consigne de chauffage à **T − S** au maximum ou celle de refroidissement à **T + S** au minimum. **Élevé** utilise **deux pas** par défaut. Si le calcul existant retire déjà davantage de demande, Velair conserve ce résultat plus fort. Ces limites restent fixes pendant le freinage : les mises à jour du capteur n’ajoutent ni ne retranchent un pas supplémentaire à chaque fois.

Pour modifier l’intensité du freinage Élevé dans une zone, ouvrez **Réglages → Équipements et groupes** et définissez **Pas de freinage Élevé** pour cet équipement ou groupe. Ce réglage accepte des nombres entiers de `2` à `10` et affiche l’écart de température équivalent selon le pas effectif de consigne de l’appareil et son unité actuelle. Il est enregistré indépendamment pour chaque zone et s’applique uniquement lorsque **Élevé** est sélectionné dans Room Assist. **Par défaut** et **Modéré** n’utilisent pas ce réglage.

Par exemple, `3` pas de `0.5 °C` représentent un écart de `1.5 °C`. Trois pas de `1 °F` représentent un écart de `3 °F`. Le nombre de pas n’est pas une température et ne change pas lors d’une conversion Celsius/Fahrenheit ; l’écart équivalent suit le pas effectif de l’appareil. Room Assist conserve son sélecteur et affiche le nombre de pas configuré et l’écart équivalent.

Par exemple, avec une cible de chauffage de `20.5 °C`, une bande morte de `0.5 °C` et un pas de l’équipement de `0.5 °C` :

- **Modéré** retire la demande à `21 °C`, avec une consigne de l’équipement ne dépassant pas `20 °C`.
- **Élevé**, avec ses deux pas par défaut, retire la demande à `20.5 °C`, avec une consigne ne dépassant pas `19.5 °C`.
- Avec **Pas de freinage Élevé** réglé sur `3`, Élevé retire toujours la demande à `20.5 °C`, mais la consigne de l’appareil ne dépasse pas `19 °C`.
- Les deux redemandent du chauffage lorsque le capteur externe atteint `20 °C`.

Modifier le nombre de pas du freinage Élevé change la limite de consigne, pas les températures de retrait ou de réactivation. En refroidissement, la limite correspondante se situe au-dessus de la cible programmée plutôt qu’en dessous. Cet ajustement est fixe : il n’augmente pas progressivement tant que la pièce reste hors de la bande.

Avant le retrait, le calcul d’assistance existant reste inchangé. Le freinage reste actif jusqu’à la limite de réactivation, même lorsque la pièce traverse la cible centrale. Si l’assistance démarre ou redémarre dans la bande, elle conserve l’initialisation prudente existante sans lancer délibérément un cycle de chauffage ou refroidissement.

L’état en direct indique les températures effectives de retrait et de réactivation. Le graphique conserve la bande morte nominale et distingue les seuils effectifs de freinage. La demande de l’alimentation partagée suit la même phase confirmée.

Choisissez **Par défaut** avant de régler la bande morte à zéro. Le niveau enregistré est conservé lorsque le mode ou la référence de température ne permet pas de l’utiliser ; l’état explique pourquoi le freinage supplémentaire est inactif. Une combinaison enregistrée invalide suspend ce freinage sans modifier discrètement la bande morte.

Les consignes physiques minimale et maximale peuvent limiter le freinage disponible. Avec deux consignes, toute la paire se déplace ensemble et chaque limite peut restreindre le décalage. **Données techniques** distingue le résultat demandé du résultat appliqué et le graphique identifie la limite atteinte.

Le freinage réduit la demande de chauffage ou refroidissement ; il ne confirme pas l’arrêt de la vanne, du compresseur ou du thermostat. Le contrôle de l’équipement, ses durées minimales de fonctionnement et l’inertie thermique peuvent toujours provoquer un dépassement. Ce réglage n’apprend pas les cycles et ne retire pas la demande avant la cible programmée. Validez-le avec des cycles réels avant de vous fier à un niveau pour une pièce donnée.

Les exports portables utilisent le modèle **30** pour conserver le nombre de pas du freinage Élevé, le niveau de freinage, les décalages de préparation et la marge minimale de commande. Les imports anciens compatibles sans nombre de pas Élevé utilisent `2`. Gardez une sauvegarde de la version précédente pour un éventuel retour en arrière ; les anciennes versions de Velair ne peuvent pas importer les exports du modèle 30.

<a id="minimum-control-margin"></a>

### Marge minimale de commande

Certains thermostats ont besoin d’un écart important entre leur température interne et la consigne demandée avant de réagir. Un capteur fixé au radiateur peut mesurer plusieurs degrés de plus que la pièce alors que le capteur externe demande encore du chauffage. **Marge minimale de commande** demande au moins cet écart pendant une correction Room Assist à laquelle elle peut s’appliquer. Elle est facultative et vaut `0` par défaut.

Ces réglages ont des fonctions différentes :

| Réglage | Fonction |
| --- | --- |
| Zone morte de Room Assist | Détermine la bande de commutation ou neutre du capteur externe de la pièce. |
| Marge minimale de commande | Renforce une correction applicable par rapport à la mesure interne du thermostat. |
| Écart d’assistance maximal | Plafonne cette correction ; augmenter seulement le maximum ne demande pas une correction plus forte. |
| Freinage | Modifie les seuils de retrait de la demande et ajoute une protection de la consigne programmée. |

La marge accepte `0–10 °C` (`0–18 °F`) et ne peut pas dépasser l’Écart d’assistance maximal. Si les réglages sont incompatibles, Velair demande d’augmenter d’abord le maximum ou de réduire la marge. Il ne modifie aucun des deux automatiquement. Les incréments du champ suivent le pas effectif de consigne de l’appareil.

Par exemple, configurez une cible de chauffage de `19.5 °C`, une zone morte de `±0.3 °C`, le freinage **Par défaut**, et la marge ainsi que le maximum à `10 °C`. Avec une mesure interne de `21.5 °C` et un pas de consigne compatible de `0.5 °C` :

| Capteur externe de la pièce | Phase Room Assist | Consigne demandée à l’appareil |
| --- | --- | --- |
| À `19.2 °C` ou en dessous | Demander du chauffage vers `19.8 °C` | `31.5 °C` : mesure interne + 10 |
| Monte à travers la bande | Continuer à demander du chauffage | Mesure interne actuelle + 10 |
| Atteint `19.8 °C` | Retirer la demande de chauffage jusqu’à `19.2 °C` | `11.5 °C` : mesure interne − 10 |

La mesure interne peut varier ; les demandes suivantes utilisent donc sa valeur actuelle. La cible de la pièce reste `19.5 °C` ; les grandes variations de consigne de l’appareil n’élargissent pas sa bande de confort. Le freinage Modéré ou Élevé conserve ses propres seuils d’arrêt et de reprise et maintient un résultat existant qui retire davantage de demande.

Le refroidissement fixe fonctionne en sens inverse. Pour une cible de `24 °C`, une zone morte de `±0.3 °C`, une mesure interne de `26 °C` et une marge/un maximum de `10 °C`, Room Assist demande `16 °C` tant que le refroidissement est nécessaire et `36 °C` lorsque la pièce atteint `23.7 °C`, avant d’appliquer les limites de l’appareil. Le refroidissement reprend à `24.3 °C`. Avec une zone morte nulle et aucune phase conservée, seules les corrections non nulles sont renforcées ; l’égalité reste neutre.

Les modes automatiques à consigne unique et les plages natives **Chauffage/climatisation** renforcent uniquement les demandes actives de chauffage ou de refroidissement. Dans la bande neutre de la pièce, ils conservent le maintien existant. Abaisser fortement une consigne pour arrêter le chauffage pourrait sinon déclencher le refroidissement sur un appareil bidirectionnel. Pour les plages natives, les deux limites se déplacent ensemble et gardent leur séparation d’origine. Les paires en mode fixe utilisent leur consigne de référence configurée ; les configurations de plage non prises en charge restent non prises en charge.

Le pas et les limites physiques peuvent empêcher d’atteindre la marge demandée. Par exemple, avec une mesure interne de `21.7 °C`, une marge/un maximum de `10 °C` et une grille de `0.5 °C`, aucun point valide ne se trouve exactement à `10 °C` d’écart. Velair choisit une correction valide dans le maximum lorsque c’est possible et indique que le pas limite la marge. Avec deux consignes, préserver la largeur de la plage peut encore restreindre le déplacement. L’explication en direct et les **Données techniques** indiquent une marge active ou limitée.

La protection de la consigne programmée, le freinage et les décalages temporaires de préparation peuvent produire un déplacement final supérieur à l’Écart d’assistance maximal. Ce réglage limite la correction Room Assist, et non chaque protection ou supplément temporaire appliqué ensuite. Pendant la préparation, la marge suit sa direction actuelle avant l’ajout du supplément.

Cette fonction demande un écart de consigne. Elle ne confirme ni l’ouverture physique de la vanne, ni le fonctionnement du compresseur, ni un arrêt immédiat. Utilisez la plus petite marge efficace pour votre équipement et vérifiez des cycles réels complets de chauffage ou de refroidissement.

<a id="optional-sensor-schedule-beta"></a>

### Programmation facultative des capteurs (bêta)

Room Assist peut suivre différentes références de température au cours de la semaine sans modifier vos programmations de température, profils ou modes. Choisissez **Selon les horaires** dans **Assistance du capteur ambiant** pour les configurer. Choisissez **Capteur fixe** pour revenir au capteur ambiant fixe.

Choisissez une référence par défaut et ajoutez des périodes avec les jours de la semaine, les heures de début et de fin et une référence. Enregistrez le brouillon complet pour l’appliquer ; Annuler abandonne vos modifications. Les références peuvent être des capteurs de température disponibles dans Home Assistant ou la température propre de l’appareil. En dehors des périodes, la référence par défaut s’applique. Les périodes peuvent traverser minuit et sont rattachées aux jours de début sélectionnés ; les chevauchements sont refusés. L’heure de début est incluse et l’heure de fin est exclue. Les heures suivent le fuseau horaire configuré dans Home Assistant.

Par exemple, choisissez **Sans correction Room Assist** par défaut et un capteur du bureau de 08:00 à 17:00, du lundi au vendredi. Vos programmations de température été/hiver continuent de déterminer la température souhaitée. Pendant les heures de travail, Room Assist calcule les corrections à partir du capteur du bureau. Sinon, Velair envoie la consigne programmée normale et le thermostat régule à partir de sa propre référence. Cela ne change pas le capteur physique utilisé en interne par le micrologiciel de l’appareil.

L’unique interrupteur de Room Assist détermine si l’assistance est activée. Le désactiver conserve les deux configurations enregistrées. Choisir **Capteur fixe** et enregistrer rétablit le capteur ambiant fixe conservé. Si une référence externe est indisponible, Velair suspend sa correction et utilise la consigne programmée normale lorsqu’il détient le contrôle automatique ; il ne choisit pas discrètement une autre pièce et ne réutilise pas une ancienne mesure. L’assistance reprend lorsque cette référence redevient utilisable.

Les changements de référence ne prennent pas la priorité sur l’ajustement manuel, le forçage ou les pauses. Lorsque le contrôle automatique reprend, Velair utilise la référence valable à ce moment-là. Pour les groupes de pièce, la température propre de l’appareil correspond à la référence de température configurée du groupe.

**Limitation de la bêta :** une référence change exactement à l’heure programmée. Le préconditionnement adaptatif ne démarre pas de cible anticipée à travers un changement de référence ; il recalcule après cette transition. Changer de pièce ne demande pas de préparer la suivante en avance. Les observations d’apprentissage sont associées à leur source de température afin qu’un saut de mesure entre pièces ne soit pas interprété comme du chauffage ou du refroidissement.

Toutes les mesures externes sélectionnées doivent être disponibles indépendamment dans Home Assistant. Pour Nest, une configuration utilisant l’intégration officielle pour le thermostat et une autre intégration pour un capteur distant doit être testée dans l’installation. Laissez la référence propre de Nest fixe si vous souhaitez utiliser la mesure du thermostat comme référence stable d’une pièce. Velair ne sélectionne pas le capteur actif interne de Nest. Un système HVAC partagé continue d’affecter toutes les pièces qu’il dessert ; choisir une référence ne crée pas de zones physiques indépendantes.

<a id="room-groups"></a>
### Groupes de pièce

Choisissez le groupe dans Room Assist et utilisez les mêmes contrôles de sonde, activation, bande morte, correction maximale et actualisation. Sa température propre vient du membre choisi dans **Groupes de pièce → Référence de température** ; la sonde externe facultative se configure ici. Désactiver ou retirer Room Assist ramène la mesure effective à ce membre.

Le groupe a une configuration et une correction partagées, pas un contrôleur indépendant par membre. Velair conserve la cible programmée et envoie la commande assistée selon le mode d’envoi du groupe : tous les membres par défaut, ou le destinataire explicite lorsque l’installation transmet déjà les commandes. Les contrôles de capacités, pas et limites s’appliquent aux destinataires réels. Les membres restent visibles individuellement dans la Vue d’ensemble.

L’assistance par capteur ambiant ne nécessite pas le préconditionnement adaptatif. Elle fonctionne sur les blocs programmés normaux et ceux que le préconditionnement adaptatif a démarrés en avance.

Un bloc de température réglé sur **Conserver le mode actuel** applique toujours sa consigne programmée. Room Assist utilise le mode réel de l’appareil ; s’il est éteint, Velair le démarre dans un mode compatible pris en charge. Pour un bloc de température, **Conserver le mode actuel** ne signifie pas « laisser la consigne du thermostat inchangée ». Un bloc d’options uniquement n’a pas de consigne ; Room Assist ne s’y applique donc pas.

Le délai d’actualisation est la temporisation de regroupement après un changement du capteur ambiant ou de la température de l’appareil. Il vaut `20` secondes par défaut. Réglez-le à `0` pour recalculer immédiatement, ou jusqu’à `300` secondes pour regrouper des mises à jour fréquentes.

La bande morte Room Assist est indépendante de l’écart minimal du préconditionnement adaptatif. Elle vaut `0.3 °C` ou `1 °F` par défaut, accepte `0` pour la désactiver et se règle par pas de `0.1` degré jusqu’à `5 °C` ou `9 °F`. L’enregistrer pendant que Room Assist est actif actualise immédiatement la consigne assistée.

Le graphique en direct dessine la bande morte nominale sous forme d'une fine bande hachurée immédiatement au-dessus de l'axe de température, avec une légende correspondante dessous. Les seuils effectifs d'arrêt et de reprise viennent de l'état de contrôle confirmé : **Élevé** peut donc arrêter la demande à la cible tout en gardant la bande nominale entière visible. Pour les modes automatiques à consigne unique, cette bande représente la marge neutre. Les plages natives `heat_cool` ne hachurent que les marges extérieures à côté de la bande nominale, avec une légende **Marge extérieure**. Une bande morte nulle ne dessine aucune zone hachurée ; la légende affiche la marge nulle configurée. Ces indicateurs décrivent des limites configurées, pas l'évolution du capteur. Masquer `show_room_assist_deadband` dans une carte Lovelace Room Assist masque ensemble le réglage, la bande et la légende.

Lors d’une mise à niveau depuis une version où Room Assist partageait l’écart minimal du préconditionnement adaptatif, Velair copie une fois la valeur existante dans la nouvelle bande morte Room Assist. Cela préserve la largeur configurée, y compris une ancienne valeur non alignée sur le nouveau pas de saisie de 0.1 degré ; les modes fixes `heat` et `cool` utilisent ensuite cette valeur pour le cycle décrit ci-dessous.

Après migration, les deux réglages sont indépendants : modifier l’un ne modifie jamais l’autre. Une zone nouvellement configurée ou réinitialisée utilise la valeur par défaut adaptée à l’unité décrite ci-dessus.

<a id="understanding-the-live-status"></a>
## Comprendre l’état en direct

L’onglet Room Assist indique ce que Velair peut faire pour chaque appareil géré, sans devoir le déduire de la consigne du thermostat :

| État | Signification |
| --- | --- |
| **Non configuré** | Aucun capteur ambiant externe sélectionné. |
| **Désactivé** | Un capteur est enregistré, mais Room Assist est désactivé. |
| **En attente** | Room Assist est activé, mais sans bloc de température compatible actif ou sans calcul utilisable. |
| **Prêt** | Velair dispose des mesures et de la consigne nécessaires, mais n’a pas encore appliqué de consigne assistée. |
| **Correction active** | Velair a appliqué une consigne corrigée temporaire ou une plage décalée. |
| **Maintien** | Room Assist maintient une consigne automatique neutre, une plage native `heat_cool` ou une consigne du côté sûr grâce à la protection de programmation. Un cycle fixe `heat` ou `cool` peut rester en **Correction active** pendant la traversée de la bande morte. |
| **Bloqué** | Une pause, un forçage, un état manuel ou un autre état du planificateur a priorité. |
| **Indisponible** | L’appareil ou la capacité de consigne nécessaire ne peut pas être utilisé. L’interface affiche la raison lorsqu’elle est connue. |

Lorsque Room Assist est actif, Vue d’ensemble résume ces informations par une direction vers la limite basse ou haute, un état actif, de maintien ou de protection de programmation, selon le cas, avec les valeurs programmées et appliquées. Un minimum ou maximum du thermostat diffère de la protection de programmation : le graphique identifie la limite physique atteinte, **Données techniques** sépare les valeurs demandées et appliquées, et Home Assistant reçoit une seule notification persistante jusqu’à la fin de cette limitation physique.

<a id="fixed-heating-hysteresis-example"></a>
## Exemple d’hystérésis en chauffage fixe

Scénario avec le freinage **Par défaut** :

- Bloc programmé : `21 °C`, `heat`
- Bande morte Room Assist : `±0.3 °C`
- Limite basse : `20.7 °C`
- Limite haute : `21.3 °C`
- Décalage maximal d’assistance : `2 °C`
- Pas de température de l’appareil : `0.1 °C`

Le cycle fonctionne ainsi :

1. Les capteurs ambiant et de l’appareil indiquent `21.0 °C`. Ce nouveau cycle de chauffage fixe commence dans la bande ; Velair l’initialise prudemment **vers la limite basse**.
2. La cible d’hystérésis active est `20.7 °C`. La correction est calculée depuis ce bord, et non la consigne centrale programmée de `21 °C` :

   ```text
   correction = 20.7 - 21.0 = -0.3 °C
   climate target = 21.0 + (-0.3) = 20.7 °C
   ```

   Cette consigne vise volontairement à ne pas demander de chauffage, sous réserve du pas et des limites physiques de l’appareil.
3. Si la pièce passe par `20.9 °C`, Velair conserve la même phase. Traverser la consigne centrale de `21 °C` ne suffit pas à demander du chauffage.
4. Lorsque le capteur externe atteint `20.7 °C`, Velair passe **vers la limite haute** à `21.3 °C`.
5. Supposons une température ambiante de `20.7 °C` et une mesure interne de `20.5 °C`. La nouvelle correction demande du chauffage :

   ```text
   correction = 21.3 - 20.7 = +0.6 °C
   climate target = 20.5 + 0.6 = 21.1 °C
   ```

6. Velair continue de viser la limite haute lorsque la pièce passe par `21.0 °C`. À `21.3 °C`, il revient vers `20.7 °C`, applique une correction négative et répète le cycle.

La consigne visible reste `21 °C`. La consigne temporaire est seulement la valeur envoyée au thermostat. Si la correction dépasse le décalage maximal d’assistance, Velair la limite avant de l’ajouter à la mesure actuelle de l’appareil.

La phase du mode fixe existe seulement pendant l’exécution. Un nouveau bloc, une nouvelle consigne ou un nouveau mode HVAC, l’effacement de Room Assist ou le rechargement de Velair relance un cycle. Si un nouveau cycle `heat` commence dans la bande, il vise la limite basse pour ne pas demander immédiatement du chauffage.

Lorsque cette protection modifie le résultat, l’état en direct explique les deux valeurs : consigne calculée et consigne réellement conservée par Velair. Vue d’ensemble affiche un état compact de protection de programmation. C’est un comportement protecteur normal, pas une erreur de thermostat ; aucune notification persistante n’est créée. Les limites physiques du thermostat restent identifiées dans le graphique et **Données techniques**, avec leur notification distincte.

L’appareil reste responsable de la protection du compresseur, des durées minimales de fonctionnement et de sa réponse physique. Le cycle donne à Velair une stratégie de consigne plus robuste, sans garantir l’instant exact où le relais, la vanne ou le compresseur change d’état.

<a id="heating-with-a-capped-delta"></a>
## Chauffage avec un écart limité

Scénario :

- Bloc programmé : `25 °C`, `heat`
- Capteur ambiant : `18 °C`
- Température actuelle de l’appareil : `17.1 °C`
- Bande morte Room Assist : `0 °C` (ancienne correction signée)
- Décalage maximal d’assistance : `5 °C`

L’écart réel de la pièce est important :

```text
25 - 18 = 7 °C
```

Velair limite l’écart d’assistance à la valeur configurée :

```text
assist delta = 5 °C
climate target = 17.1 + 5 = 22.1 °C
```

Avec un pas de `0.5 °C`, la consigne de chauffage est arrondie vers le bas à `22 °C`.

Cela évite d’envoyer des consignes irréalistes au thermostat tout en le maintenant suffisamment ouvert pour chauffer la pièce.

<a id="fixed-cooling-hysteresis-example"></a>
## Exemple d’hystérésis en refroidissement fixe

Scénario avec le freinage **Par défaut** :

- Bloc programmé : `24 °C`, `cool`
- Bande morte Room Assist : `±0.5 °C`
- Limite basse : `23.5 °C`
- Limite haute : `24.5 °C`
- Décalage maximal d’assistance : `2 °C`
- Pas de température de l’appareil : `0.5 °C`

Le refroidissement est symétrique, mais un nouveau cycle dans la bande commence prudemment **vers la limite haute**, sans demander immédiatement du refroidissement :

1. Avec les deux capteurs à `24.0 °C`, le bord actif est `24.5 °C` :

   ```text
   correction = 24.5 - 24.0 = +0.5 °C
   climate target = 24.0 + 0.5 = 24.5 °C
   ```

   Augmenter la consigne en refroidissement fixe réduit la demande de refroidissement.
2. La phase reste inchangée pendant la traversée de la bande. Lorsque le capteur externe atteint `24.5 °C`, Velair passe vers `23.5 °C`.
3. Si la pièce est alors à `24.5 °C` et le capteur interne à `25.0 °C` :

   ```text
   correction = 23.5 - 24.5 = -1.0 °C
   climate target = 25.0 - 1.0 = 24.0 °C
   ```

   Cela demande du refroidissement.
4. Velair continue de viser le bord bas lorsque la pièce passe par `24.0 °C`. À `23.5 °C`, il revient vers `24.5 °C` et répète le cycle.

L’alignement au pas et les limites physiques s’appliquent à chaque consigne temporaire. Le micrologiciel reste responsable du cycle réel de refroidissement.

<a id="how-legacy-inversion-and-scheduled-protection-work-together"></a>
## Comment l’ancienne inversion et la protection de programmation se complètent

L’inversion signée et la protection de la consigne programmée répondent à deux aspects du même problème. L’inversion change le sens de la correction après que la pièce dépasse la consigne. La protection constitue la limite finale de sécurité si cette correction inverse laisse encore une consigne de mode fixe du côté qui demande un fonctionnement.

Les exemples suivants utilisent une programmation de refroidissement à `22 °C`, une bande morte de `0 °C`, un pas de `0.5 °C` et un décalage maximal assez grand pour ne pas limiter le calcul. Les colonnes « sans inversion » et « avant protection » sont des valeurs intermédiaires explicatives, pas des modes Room Assist sélectionnables.

| Température du capteur ambiant | Mesure de l’appareil | Sans inversion après dépassement | Résultat signé avant protection | Consigne finale | Raison |
| --- | --- | --- | --- | --- | --- |
| `24 °C` | `25.1 °C` | Sans objet | `23.5 °C` | `23.5 °C` | La pièce nécessite encore du refroidissement. |
| `21 °C` | `19 °C` | `19 °C` | `20 °C` | `22 °C` | L’inversion augmente la consigne, mais demanderait encore du refroidissement ; le plancher programmé s’applique. |
| `21 °C` | `25 °C` | `25 °C` | `26 °C` | `26 °C` | La consigne inverse plus forte est déjà au-dessus de la programmation, du côté sûr ; elle est conservée. |

Le chauffage est symétrique. Avec une programmation à `20 °C`, une mesure externe de `21 °C` et interne de `24 °C`, le résultat signé est `23 °C` ; la protection applique plutôt le plafond programmé de `20 °C`. Si la pièce est à `24 °C` et la mesure interne à `21.5 °C`, le résultat inverse plus fort de `17.5 °C` est déjà sûr et reste inchangé.

L’inversion reste donc utile avec la protection : elle peut aller plus loin du côté ne demandant pas de fonctionnement si la mesure de l’appareil le permet, tandis que la protection couvre les cas où cette mesure a dérivé du mauvais côté.

Avec une bande morte non nulle, `heat` et `cool` fixes utilisent le cycle qui mémorise sa phase, décrit plus haut, plutôt que de changer de direction à la consigne centrale. Une bande morte de `0` conserve l’ancien calcul signé : la correction change de signe au franchissement de la consigne et aucune phase d’hystérésis n’est conservée.

Une consigne unique compatible `auto` ou `heat_cool` conserve aussi l’ancien calcul signé. Dans sa bande morte, Velair utilise la consigne prise en charge la plus proche de la mesure interne plutôt que de forcer une alternance active chauffage/refroidissement. Un appareil à plage native `heat_cool` conserve les deux limites de l’utilisateur et reçoit la plage assistée complète décrite ci-dessous.

<a id="device-hysteresis-and-minimum-run-time"></a>
## Hystérésis de l’appareil et durée minimale de fonctionnement

Room Assist contrôle la consigne envoyée via Home Assistant. Il ne remplace pas l’hystérésis du micrologiciel, la protection du compresseur, la durée minimale de fonctionnement ni la décision de considérer une consigne égale comme inactive.

Un cycle de chauffage fixe allant vers sa limite basse envoie, par exemple, une consigne visant à réduire la demande jusqu’à ce que le capteur externe atteigne ce bord. Un appareil avec une large hystérésis interne ou une durée minimale peut encore démarrer ou continuer temporairement à chauffer. Velair ne déduit pas de marge d’arrêt non documentée propre à l’appareil et n’inspecte pas `hvac_action` pour changer de phase.

La protection évite de faire passer la consigne de l’autre côté de la programmation lorsque le capteur interne dérive ; elle ne promet pas un arrêt HVAC immédiat. L’association native d’un capteur externe ou l’étalonnage reste préférable lorsqu’il est disponible. Utilisez un bloc `Off` pour un arrêt explicite plutôt qu’un maintien décidé par le thermostat.

Le décalage maximal d’assistance doit permettre la correction inverse dont l’appareil peut avoir besoin. L’éditeur garde cette indication visible sous le nom du réglage pour qu’elle soit prise en compte. Par exemple :

```text
Thermostat stopping gap: 2.5 °C
Maximum assist delta:    2.0 °C  -> may be insufficient
Maximum assist delta:    3.0 °C  -> permits enough inverse correction
```

Avec Marge minimale de commande à `0`, régler `3 °C` n’applique pas immédiatement une correction de `3 °C`. Cela autorise seulement Room Assist à l’atteindre lorsque l’écart externe le nécessite.

Ce réglage limite la correction proportionnelle, pas la consigne finale après protection de la cible programmée. Le freinage facultatif renforce cette protection avec sa limite d’un ou deux pas ; il ne modifie pas l’Écart d’assistance maximal et n’applique pas tout le maximum à chaque mise à jour. Une [Marge minimale de commande](#minimum-control-margin) non nulle peut demander une correction plus forte même lorsque l’écart de température externe est faible.

<a id="why-climate-target-can-differ-from-the-calculation"></a>
### Pourquoi la consigne de l’appareil peut différer du calcul

La **Consigne** est celle que l’entité signale lorsque Room Assist est prêt ou bloqué. Pendant une correction active ou le maintien d’une consigne unique appliquée, elle montre plutôt la consigne temporaire envoyée par Velair. Aucune des deux n’est la consigne ambiante programmée ou la limite d’hystérésis active. L’appareil accepte des consignes sur sa propre grille ; Velair peut devoir aligner la valeur finale sur son pas effectif publié, dernier signalé, manuel ou par défaut.

En refroidissement fixe, Room Assist peut calculer `23.9 °C` pour un appareil acceptant des pas de `0.5 °C`. Velair applique `24.0 °C` : l'arrondi vers le haut évite un refroidissement plus fort que le calcul. Le chauffage fixe est arrondi vers le bas, tandis que les modes automatiques à consigne unique utilisent le pas le plus proche. Développez la pastille **Consigne** ou ouvrez **Données techniques** pour examiner la valeur affichée et toute information disponible sur le calcul, le pas effectif et la valeur appliquée. Lorsque l'alignement a modifié la consigne confirmée, **Données techniques** montre aussi la valeur avant alignement au pas. Les limites physiques minimale ou maximale et la protection de la cible programmée sont signalées séparément, sans être décrites comme un alignement au pas.

<a id="heatcool-range-example"></a>
## Exemple de plage chauffage/refroidissement

Room Assist prend aussi en charge les plages natives `heat_cool`. Il traite les limites basse et haute comme une seule bande de confort et les déplace toujours ensemble ; leur écart ne change donc jamais.

Scénario :

- Plage programmée : `19–24 °C`
- Capteur ambiant : `18 °C`
- Température actuelle de l’appareil : `22 °C`
- Décalage maximal d’assistance : `2 °C`
- Pas de température de l’appareil : `0.5 °C`

La pièce est `1 °C` sous la limite de chauffage. Velair place la limite basse `1 °C` au-dessus de la mesure interne et déplace la limite haute du même montant :

```text
applied range = 23–28 °C
```

L’appareil mesure `22 °C`, donc sous la limite basse appliquée, et peut demander du chauffage. Si la pièce dépasse ensuite `24 °C`, Velair utilise de même la limite haute pour demander du refroidissement. Lorsque la pièce entre pour la première fois dans la bande programmée, y compris la bande morte autour des limites, Velair place la bande appliquée autour de la mesure interne. Il conserve ensuite cette bande de maintien stable tant que la pièce externe reste dans la bande. Il ne suit pas les déplacements ultérieurs du capteur interne, qui peuvent eux-mêmes résulter de l’activité d’un compresseur, ventilateur, vanne ou radiateur.

La plage appliquée est toujours alignée sur le pas de l’appareil et déplacée dans son ensemble lorsque les limites physiques sont atteintes. Velair n’ajuste jamais Min et Max indépendamment.

Si une consigne unique ou une plage calculée dépasse le minimum ou maximum pris en charge, Velair applique le résultat valide le plus proche. Le graphique identifie la limite atteinte ; **Données techniques** présente la consigne unique ou la plage demandée et appliquée. Home Assistant crée aussi une seule notification persistante pour cette limite ; les mises à jour répétées n’en créent pas de nouvelles, et Velair la ferme après rétablissement.

<a id="when-velair-does-nothing"></a>
## Quand Velair n’intervient pas

Room Assist nécessite un pas effectif de consigne valide et positif. Il utilise d’abord `target_temp_step` publié. Si celui-ci manque, le dernier pas valide signalé par l’entité préserve la même grille. La valeur manuelle de repli par zone affichée dans Paramètres vient ensuite et vaut `1` si aucune valeur n’existe. Enregistrer ce champ quand l’attribut manque rend la valeur explicite prioritaire en effaçant l’observation mémorisée ; un nouveau pas valide signalé est de nouveau mémorisé. Velair ne déduit pas d’association avec une autre entité.

Room Assist n’applique pas de consigne assistée lorsque :

- aucun capteur ambiant n’est sélectionné ;
- l’assistance est désactivée ;
- le planificateur n’est pas en automatique ;
- l’appareil est en pause ou en forçage ;
- aucun bloc de température n’est actif ;
- le bloc actif est `Off` ;
- la température ambiante ou interne est indisponible ou non numérique ;
- le changement calculé est inférieur au pas de température de l’entité ;
- le mode HVAC ne peut pas être interprété comme chauffage ou refroidissement.

Dans ces cas, Velair conserve ou restaure la consigne normale programmée lorsque cela est sûr.

<a id="external-adjustments-and-manual-adjustment"></a>
## Modifications externes et réglage manuel

Avec la politique par défaut **Maintenir automatique**, Room Assist conserve le contrôle ; Velair recalcule et réapplique sa consigne assistée après un changement externe détecté de consigne ou de mode HVAC. Avec une politique manuelle, Room Assist cède volontairement la main si le changement place l’appareil en **Réglage manuel**. Velair capture l’état externe complet depuis l’événement Home Assistant, efface la correction Room Assist sans restaurer la consigne programmée et conserve la consigne externe unique ou la plage native `heat_cool`. Cela empêche un conflit immédiat avec une carte climatique, une télécommande ou un autre réglage extérieur à Velair.

Exemple :

```text
Scheduled cooling target: 24 °C
Room Assist temporary target: 26 °C
External adjustment: 23 °C
Result during Manual adjustment: 23 °C
```

À la reprise automatique, Velair détermine la consigne de programmation ou de profil valable à cet instant. Room Assist peut calculer une nouvelle correction à partir des mesures actuelles ; il ne réactive pas l’ancienne correction de `26 °C` ni la phase d’hystérésis précédente. Recharger Velair ou Home Assistant réinitialise de même cet état limité à l’exécution : le bloc actuel est réévalué et une nouvelle phase prudente choisie selon le mode et la mesure ambiante actuels.

Un changement externe admissible conserve le contrôle automatique ou active/actualise le réglage manuel selon la politique de l’appareil. Consultez [Modifications externes et réglage manuel](manual-control.fr.md) pour les politiques, services, interactions avec forçages/profils et limites d’attribution.

<a id="planned-return"></a>
## Retour prévu

Pendant un [Retour prévu](planned-return.fr.md), Room Assist suit la consigne temporaire d’arrivée de chaque zone dès le début de sa préparation. Il ne conserve pas la température du mode Absence et n’y revient pas lorsqu’un bloc Absence change. Les autres zones suivent Absence jusqu’à leur propre préparation.

Une consigne Absence de 16 degrés devient par exemple une consigne d’arrivée de 21 degrés au début de la préparation de la pièce. Room Assist peut ajuster la consigne physique pour atteindre 21 degrés sur le capteur ambiant. Le réglage manuel et les pauses explicites suspendent son intervention pour la zone concernée. Une sélection explicite de mode/profil annule la préparation anticipée de l’épisode et conserve cette sélection. L’action **Annuler ce retour** supprime également la préparation ; après départ confirmé, elle restaure le mode et les profils précédents enregistrés. Consultez les [exemples d’annulation](planned-return.fr.md#cancelling-a-return-examples).

<a id="adaptive-preconditioning"></a>
## Préconditionnement adaptatif

Lorsque le préconditionnement adaptatif est activé et démarre un futur bloc en avance, Room Assist suit cette future consigne jusqu’à l’heure de confort programmée.

C’est important car l’heure actuelle peut encore correspondre à un ancien bloc. Velair considère le bloc anticipé déjà démarré comme consigne gérée active ; Room Assist ne recalcule donc pas à partir du bloc précédent.

Lorsque l’assistance par capteur ambiant est activée, le préconditionnement adaptatif utilise aussi ce capteur comme source effective de température pour ses décisions et son apprentissage.

Les décalages facultatifs distincts de chauffage et de refroidissement se configurent dans Anticipation. Room Assist calcule sa cible de base à partir de l'objectif initial de la pièce, puis Velair applique le supplément de préparation. Les limites de l'appareil réduisent ce supplément ; les bandes à deux consignes gardent leur largeur. Un décalage positif configuré maintient temporairement la direction de préparation jusqu'au seuil initial de la pièce, même si le supplément effectif est nul ou si Room Assist a hérité d'une phase sans demande. Après ce seuil ou le début programmé, le supplément cesse et l'hystérésis et le freinage ordinaires reprennent. Les plages natives `heat_cool` gardent leurs limites existantes de prise en charge du freinage.

Room Assist confirme sa demande effective de chauffage ou de refroidissement avec la cible appliquée. Pendant la préparation, cela inclut la demande temporaire tout en conservant séparément sa phase d'hystérésis ordinaire. L'alimentation climatique partagée suit cette demande effective par son intégration Room Assist existante ; elle n'ajoute ni décalage, ni hystérésis, ni règle de préparation. À la fin du supplément, la demande ordinaire de Room Assist reprend. Une commande échouée ou remplacée ne confirme pas une nouvelle demande, et un échec de restauration ne peut laisser la préparation retirée demander l'alimentation indéfiniment. Consultez [Alimentation climatique partagée](shared-climate-supply.fr.md#room-assist).

Le graphique distingue l'objectif nominal de la consigne finale Room Assist plus préparation. Son badge de supplément inclut un `0` limité ; **Données techniques** sépare la base, le supplément demandé, le supplément effectif et la commande finale. Pendant la préparation, le seuil **Fin de préparation** dispose d'un bouton d'information expliquant la marge d'arrivée configurée. Une cible de `21 °C` avec une marge d'arrivée de `0.1 °C` termine la préparation de chauffage à `20.9 °C` ; cette marge est distincte de la bande de régulation Room Assist. Consultez [Décalage temporaire de consigne](adaptive-preconditioning.fr.md#temporary-setpoint-offset) pour les exemples de chauffage, de refroidissement et de limites physiques.

<a id="automation-events"></a>
## Événements d’automatisation

Les événements de mise à jour peuvent aussi inclure un objet `braking` indiquant les niveaux configuré et effectif, la phase active, les températures effectives de retrait et de reprise, la limite de consigne et une éventuelle raison d’inactivité. Ces champs supplémentaires décrivent la politique de demande confirmée, pas l’activité physique de l’équipement. Voir [Mise à jour de Room Sensor Assist](automation-events.fr.md#room-sensor-assist-updated) pour un exemple.

Velair émet l’événement Home Assistant standard `velair_event`.

Room Assist émet :

- `room_sensor_assist_state_changed` : Room Assist a été activé ou désactivé.
- `room_sensor_assist_updated` : Velair a appliqué une consigne climatique assistée temporaire.
- `room_sensor_assist_restored` : Velair a cessé de gérer la consigne assistée et restauré la consigne normale lorsque possible.

Consultez [Événements d’automatisation](automation-events.fr.md#room-sensor-assist-state-changed) pour les données complètes et toutes les raisons de restauration.

Exemple de données d’événement :

```yaml
event: room_sensor_assist_updated
entity_id: climate.living_room
room_temperature_entity_id: sensor.living_room_temperature
target_temperature: 21
applied_temperature: 20
room_temperature: 18
climate_temperature: 17.1
assist_delta: 3.3
applied_offset: 2.9
direction: heat
hvac_mode: heat
hysteresis_phase: towards_upper
hysteresis_target: 21.3
deadband_low: 20.7
deadband_high: 21.3
reason: current_schedule
```

Les quatre champs d’hystérésis sont facultatifs. Dans les événements d’automatisation, ils apparaissent pour un cycle fixe à cible unique `heat` ou `cool` avec une bande morte non nulle ; ils sont absents pour l’ancienne correction à bande morte nulle, les modes automatiques à cible unique et toutes les plages. Les plages fixes avec référence configurée exposent leur phase d’hystérésis dans l’état en direct ; leurs événements conservent les paires complètes de limites et `range_shift`.

Une mise à jour de plage utilise les bandes programmées et appliquées complètes plutôt que les champs de consigne unique :

```yaml
event: room_sensor_assist_updated
entity_id: climate.living_room
room_temperature_entity_id: sensor.living_room_temperature
target_temp_low: 19
target_temp_high: 24
applied_target_temp_low: 23
applied_target_temp_high: 28
room_temperature: 18
climate_temperature: 22
assist_delta: 1
range_shift: 4
direction: heat
hvac_mode: heat_cool
reason: current_schedule
```

Exemple de déclencheur d’automatisation :

```yaml
trigger:
  - platform: event
    event_type: velair_event
    event_data:
      event: room_sensor_assist_updated
      entity_id: climate.living_room
```

Room Assist peut aussi être contrôlé par les automatisations avec :

- `velair.enable_room_sensor_assist`
- `velair.disable_room_sensor_assist`

<a id="lovelace"></a>
## Lovelace

La vue Room Assist est disponible comme carte Lovelace :

```yaml
type: custom:velair-card
view: sensors
entities:
  - climate.living_room
```

Le même graphique en direct est utilisé dans le panneau latéral et les cartes. Les pastilles compactes **Pièce**, **Cible**, **Appareil** et **Consigne** sont reliées verticalement à leurs positions de température. Survolez, sélectionnez au clavier ou appuyez sur une pastille pour ses détails. **Normal** montre la demande actuelle et le prochain seuil ; **Détaillé** ajoute l'écart pièce-objectif, l'ajustement total et tout supplément de préparation déjà inclus dans ce total. Les libellés de mesure figurent sur leurs lignes si l'espace le permet, sinon dessous.

Une flèche pleine représente le chauffage ou le refroidissement demandé. Une flèche en pointillés représente l'attente et pointe vers le seuil de reprise. Ces flèches décrivent la demande de Room Assist, pas une tendance de température mesurée ni la preuve qu'une vanne ou un compresseur fonctionne. Si la demande acceptée est indisponible, le graphique indique cette incertitude au lieu d'inventer une demande ou un état d'attente.

La bande hachurée immédiatement au-dessus de l'axe conserve la bande de régulation nominale et sa légende. Un arrêt effectif par freinage est marqué séparément ; la bande n'implique pas que la demande continue au-delà de cet arrêt. La pastille de consigne identifie le freinage uniquement lorsque sa protection a réellement changé la commande appliquée. Pour une plage native `heat_cool`, des crochets distincts montrent les bandes complètes de l'objectif et de la consigne appliquée, avec des hachures aux marges extérieures Room Assist. Les limites physiques sont identifiées.

Le graphique présente la demande dans son badge d’état, les mesures dans les pastilles de température et le seuil d’arrêt ou de reprise à côté de la flèche. Si la mesure de la pièce manque et empêche de dessiner cette relation, le seuil reste dans le badge d’état. **Explication** ouvre un court contexte sous le graphique : l’écart entre les mesures, la raison pour laquelle un cycle continue après avoir atteint la cible de confort, ou la préparation, le freinage ou la limite de l’appareil qui influe sur le réglage. Ce contexte ne répète ni les températures affichées, ni la demande, ni l’aide sur la bande de régulation. Aucun résumé distinct n’est répété sous le graphique.

**Données techniques** regroupe les étapes de la consigne de l’appareil, les limites de régulation et l’origine et les horaires dans la même zone de détail. Les mesures restent dans le graphique au lieu d’être répétées dans un second tableau. Les valeurs consécutives calculée, demandée, avant alignement au pas et appliquée partagent une ligne lorsqu’elles sont identiques, avec le nom de chaque étape ; les valeurs différentes restent séparées. Les commandes de plage et les informations sur leur consigne de référence unique restent distinctes. Les valeurs d’arrêt et de reprise ne sont pas répétées comme prochain seuil ou limite nominale identique ; le sens du cycle est indiqué sans répéter sa température. Le pas de l’appareil et les protections ou limites physiques pertinentes restent disponibles. Le supplément de préparation possède son propre groupe, avec les valeurs demandée et appliquée lorsqu’elles diffèrent, y compris un zéro limité. Origine et horaires indique l’entité du capteur et le début du bloc avec la date ; à défaut de date, seule l’heure est utilisée. Les groupes s’empilent dans les panneaux et cartes étroits. Une seule vue de détail peut être ouverte à la fois ; sélectionnez de nouveau son bouton ou appuyez sur Échap pour la fermer. Les boutons fonctionnent au clavier et au toucher, et le détail reste sous le graphique sans couvrir d’autres commandes. Ouvrir ou fermer un détail ne modifie pas la demande de régulation. Le graphique s’adapte aux colonnes étroites sans modifier l’échelle de température ni éloigner une mesure de sa position réelle.

La carte Lovelace Room Assist peut masquer des éléments pour une vue compacte réservée au tableau de bord :

```yaml
type: custom:velair-card
view: sensors
entities:
  - climate.living_room
show_room_assist_switch: false
show_room_assist_sensor: false
show_room_assist_deadband: false
show_room_assist_max_delta: false
show_room_assist_debounce: false
show_room_assist_live_status: true
```

Les options `show_room_assist_*` omises valent `true` par défaut.

<a id="technical-details"></a>
## Détails techniques

Les détails destinés aux développeurs sur les champs stockés, l’état d’exécution, le calcul des consignes assistées, la restauration et les événements sont documentés dans [Fonctionnement interne de Room Assist](../developer/room-assist.md).
