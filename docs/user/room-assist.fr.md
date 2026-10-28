<a id="room-assist"></a>
# Room Assist

<!-- velair-docs:start -->
Traductions: [Original en anglais](room-assist.md) · [Español](room-assist.es.md) · [Français](room-assist.fr.md) · [Deutsch](room-assist.de.md) · [Italiano](room-assist.it.md) · [Nederlands](room-assist.nl.md) · [Polski](room-assist.pl.md) · [Português (Brasil)](room-assist.pt-br.md) · [Português (Portugal)](room-assist.pt-pt.md) · [Русский](room-assist.ru.md) · [État des traductions](../translation-status.md)

<details>
<summary>État de cette traduction</summary>

| Information | État |
| --- | --- |
| Version de référence | 1.9.0-beta.6 |
| Dernière synchronisation | 2026-10-28 |
| Révision linguistique | Traduction assistée par IA |
| Par rapport à l’original | Synchronisée avec l’original anglais. |

</details>

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

Pour une consigne unique en `heat` ou `cool` fixe, une bande morte non nulle crée deux limites de commutation. Room Assist mémorise la limite visée et change de direction seulement lorsque le capteur externe atteint la limite opposée. Cela crée un véritable cycle d’hystérésis avec le capteur externe, plutôt que de laisser le capteur interne relancer un cycle près de la consigne centrale. Le décalage maximal d’assistance limite la correction signée calculée depuis la limite active.

Les consignes uniques `auto` et `heat_cool`, ainsi que les plages natives `heat_cool`, conservent leur comportement neutre ou leurs marges de plage. Velair ne force pas ces modes à alterner entre chauffage et refroidissement actifs selon un cycle d’hystérésis à consigne unique.

L’entité climatique reste l’actionneur. Velair ne crée pas d’entité climatique virtuelle et ne contourne pas le micrologiciel. Si votre thermostat ou votre tête thermostatique permet d’associer directement un capteur externe, cette option native reste généralement le meilleur premier choix.

Pour deux consignes en `heat` ou `cool` fixe, sélectionnez d’abord **Consigne de référence** pour cet équipement et ce mode dans **Paramètres → Équipements et groupes**. Choisissez **Consigne basse** ou **Consigne haute** selon la valeur réellement utilisée ; Velair ne la déduit pas de la capacité à gérer des plages. Le préconditionnement adaptatif partage ce choix.

Room Assist utilise la limite choisie comme cible fixe de chauffage ou de refroidissement, avec le cycle d’hystérésis à cible unique et la protection de la cible programmée. Il déplace les deux consignes du même écart, conservant leur séparation. Les deux limites doivent respecter le pas et les limites physiques de l’équipement ; l’autre limite peut donc restreindre la correction disponible. Les avertissements existants restent applicables.

Avec **Non configurée**, les paires en mode fixe sont envoyées sans modification ni correction Room Assist. Les plages `auto` restent incompatibles avec l’assistance ; les bandes natives `heat_cool` conservent leur comportement. Les réglages enregistrés restent conservés. Changer de référence ou de mode efface l’assistance obsolète sans rétablir une ancienne cible corrigée sur la nouvelle intention.

<a id="setup"></a>
## Configuration

1. Ouvrez l’onglet Room Assist.
2. Développez l’appareil à configurer.
3. Sélectionnez un capteur de température ambiante.
4. Activez **Assistance du capteur ambiant**.
5. Réglez la bande morte de Room Assist pour définir les limites basse et haute du chauffage ou refroidissement fixe autour de la cible unique ou de la référence de plage choisie, ou la marge neutre des modes automatiques à cible unique et des bandes natives `heat_cool`.
6. Ajustez **Écart d’assistance maximal** si la valeur par défaut est trop faible pour la pièce ou inférieure à l’écart de consigne dont le thermostat peut avoir besoin pour arrêter de chauffer ou refroidir.
7. Ajustez **Délai d’actualisation** si les mises à jour semblent trop lentes ou trop fréquentes.

Sélectionner un capteur seul l’enregistre simplement. Velair l’utilise comme température effective de la pièce uniquement lorsque l’assistance est activée.

<a id="room-groups"></a>
### Groupes de pièce

Choisissez le groupe dans Room Assist et utilisez les mêmes contrôles de sonde, activation, bande morte, correction maximale et actualisation. Sa température propre vient du membre choisi dans **Groupes de pièce → Référence de température** ; la sonde externe facultative se configure ici. Désactiver ou retirer Room Assist ramène la mesure effective à ce membre.

Le groupe a une configuration et une correction partagées, pas un contrôleur indépendant par membre. Velair conserve la cible programmée et envoie la commande assistée selon le mode d’envoi du groupe : tous les membres par défaut, ou le destinataire explicite lorsque l’installation transmet déjà les commandes. Les contrôles de capacités, pas et limites s’appliquent aux destinataires réels. Les membres restent visibles individuellement dans la Vue d’ensemble.

L’assistance par capteur ambiant ne nécessite pas le préconditionnement adaptatif. Elle fonctionne sur les blocs programmés normaux et ceux que le préconditionnement adaptatif a démarrés en avance.

Un bloc de température réglé sur **Conserver le mode actuel** applique toujours sa consigne programmée. Room Assist utilise le mode réel de l’appareil ; s’il est éteint, Velair le démarre dans un mode compatible pris en charge. Pour un bloc de température, **Conserver le mode actuel** ne signifie pas « laisser la consigne du thermostat inchangée ». Un bloc d’options uniquement n’a pas de consigne ; Room Assist ne s’y applique donc pas.

Le délai d’actualisation est la temporisation de regroupement après un changement du capteur ambiant ou de la température de l’appareil. Il vaut `20` secondes par défaut. Réglez-le à `0` pour recalculer immédiatement, ou jusqu’à `300` secondes pour regrouper des mises à jour fréquentes.

La bande morte Room Assist est indépendante de l’écart minimal du préconditionnement adaptatif. Elle vaut `0.3 °C` ou `1 °F` par défaut, accepte `0` pour la désactiver et se règle par pas de `0.1` degré jusqu’à `5 °C` ou `9 °F`. L’enregistrer pendant que Room Assist est actif actualise immédiatement la consigne assistée.

L’échelle de température en direct dessine la bande morte comme une bande neutre hachurée. Pour une consigne unique fixe, ses bords sont les limites de commutation ; l’état indique celle que Room Assist vise. Pour les modes automatiques à consigne unique, elle reste une marge neutre. Pour une plage native `heat_cool`, elle va de la limite basse moins la bande morte à la limite haute plus la bande morte. L’échelle s’élargit pour garder les deux bords visibles. La légende traduite complète reste centrée sur la bande réelle, même lorsque celle-ci est plus étroite que son texte : le sens ne dépend pas de la largeur du graphique. L’explication complète reste accessible aux technologies d’assistance et au survol. Avec une bande morte de `0`, aucune surface n’est dessinée et la légende statique indique explicitement son absence. Le graphique et sa légende utilisent la valeur backend enregistrée ; masquer `show_room_assist_deadband` dans une carte Lovelace Room Assist masque ensemble le réglage, la bande et la légende.

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

Lorsque Room Assist est actif, Vue d’ensemble résume ces informations par une direction vers la limite basse ou haute, un état actif, de maintien ou de protection de programmation, selon le cas, avec les valeurs programmées et appliquées. Un minimum ou maximum du thermostat diffère de la protection de programmation : l’onglet affiche un avertissement avec les valeurs demandées, appliquées et prises en charge, et Home Assistant reçoit une seule notification persistante jusqu’à la fin de cette limitation physique.

<a id="fixed-heating-hysteresis-example"></a>
## Exemple d’hystérésis en chauffage fixe

Scénario :

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

Lorsque cette protection modifie le résultat, l’état en direct explique les deux valeurs : consigne calculée et consigne réellement conservée par Velair. Vue d’ensemble affiche un état compact de protection de programmation. C’est un comportement protecteur normal, pas une erreur de thermostat ; aucune notification persistante n’est créée. Les limites physiques du thermostat conservent leur avertissement et notification distincts.

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

Scénario :

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

Régler `3 °C` n’applique pas immédiatement une correction de `3 °C`. Cela autorise seulement Room Assist à l’atteindre lorsque l’écart externe le nécessite.

<a id="why-climate-target-can-differ-from-the-calculation"></a>
### Pourquoi la consigne de l’appareil peut différer du calcul

La **Consigne du thermostat** est celle que l’entité signale lorsque Room Assist est prêt ou bloqué. Pendant une correction active ou le maintien d’une consigne unique appliquée, elle montre plutôt la consigne temporaire envoyée par Velair. Aucune des deux n’est la consigne ambiante programmée ou la limite d’hystérésis active. L’appareil accepte des consignes sur sa propre grille ; Velair peut devoir aligner la valeur finale sur son pas effectif publié, dernier signalé, manuel ou par défaut.

En refroidissement fixe, Room Assist peut calculer `23.9 °C` pour un appareil acceptant des pas de `0.5 °C`. Velair applique `24.0 °C` : l’arrondi vers le haut évite un refroidissement plus fort que le calcul. Le chauffage fixe est arrondi vers le bas, tandis que les modes automatiques à consigne unique utilisent le pas le plus proche. Le bouton d’information près de la consigne de l’appareil adapte son explication à la valeur affichée et, si l’alignement a réellement modifié la consigne appliquée, présente le calcul, le pas effectif et la valeur appliquée. Les limites physiques et la protection de programmation sont signalées séparément, sans être décrites comme un alignement au pas.

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

Si une consigne unique ou une plage calculée dépasse le minimum ou maximum pris en charge, Velair applique le résultat valide le plus proche. L’état en direct affiche la consigne demandée, celle appliquée et la limite atteinte avant le graphique. Home Assistant crée aussi une seule notification persistante pour cette limite ; les mises à jour répétées n’en créent pas de nouvelles, et Velair la ferme après rétablissement.

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

<a id="automation-events"></a>
## Événements d’automatisation

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

L’échelle en direct distingue deux relations. Pour une consigne unique, la ligne supérieure compare le capteur ambiant à la consigne programmée ; la ligne inférieure compare la mesure interne à la consigne de l’appareil. En `heat` ou `cool` fixe, la bande hachurée indique les deux limites d’hystérésis et l’état nomme la limite active. Pour les modes automatiques à consigne unique, elle reste une marge neutre. Pour une plage native, des crochets rouges et bleus identifient les bandes programmée et appliquée complètes, avec leurs deux limites. Un connecteur signé de décalage de plage relie leurs centres pour représenter le déplacement de toute la bande, et non d’une limite seule. Ces indicateurs décrivent seulement la consigne envoyée par Velair ; ils ne confirment pas une activité réelle de chauffage ou refroidissement du thermostat, de la vanne ou du compresseur.

Dans les colonnes étroites du tableau de bord, l’échelle défile horizontalement pour garder les marqueurs lisibles.

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
