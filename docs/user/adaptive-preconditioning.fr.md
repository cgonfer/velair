<a id="adaptive-preconditioning"></a>
# Préconditionnement adaptatif
<!-- velair-docs:start -->
Traductions: [Original en anglais](adaptive-preconditioning.md) · [Español](adaptive-preconditioning.es.md) · [Français](adaptive-preconditioning.fr.md) · [Deutsch](adaptive-preconditioning.de.md) · [Italiano](adaptive-preconditioning.it.md) · [Nederlands](adaptive-preconditioning.nl.md) · [Polski](adaptive-preconditioning.pl.md) · [Português (Brasil)](adaptive-preconditioning.pt-br.md) · [Português (Portugal)](adaptive-preconditioning.pt-pt.md) · [Русский](adaptive-preconditioning.ru.md) · [État des traductions](../translation-status.md)

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

Le préconditionnement adaptatif permet à Velair de démarrer le chauffage ou le refroidissement avant un bloc programmé, afin que la pièce soit plus proche de la température cible lorsque le bloc commence.

Par exemple, un bloc programmé à `07:00` avec `21 °C` signifie « être proche de `21 °C` à `07:00` », et non « commencer à passer à `21 °C` à `07:00` ».

Le préconditionnement adaptatif fonctionne localement dans Home Assistant. Velair stocke ses réglages et échantillons d’apprentissage dans le stockage Home Assistant et n’envoie jamais son historique de température, ses observations ou ses données d’étalonnage à un contrôleur externe. Les zones déléguées à un système d’exécution externe des programmations n’utilisent pas cette fonction ; seule leur programmation hebdomadaire effective est publiée.

<a id="setup"></a>
## Configuration

L’onglet **Anticipation** propose deux outils dans son sélecteur de sous-section. **Anticipation adaptative du confort** s’ouvre par défaut ; choisissez **Retour prévu** pour configurer l’occupation et les arrivées hebdomadaires, et gérer l’absence actuelle. Leurs chemins directs dans le panneau sont `/velair/preconditioning/preconditioning` et `/velair/preconditioning/planned-return`. Consultez [Retour prévu](planned-return.fr.md).

1. Ouvrez l’onglet **Anticipation**.
2. Développez l’appareil à configurer.
3. Activez le préconditionnement.
4. Conservez les réglages du modèle par défaut, sauf raison précise de les ajuster.
5. Sélectionnez éventuellement un capteur de température extérieure.

Le préconditionnement se configure par appareil. L’apprentissage du chauffage et du refroidissement est suivi séparément : les échantillons de refroidissement ne remplacent pas ceux du chauffage, et inversement.

Les plages natives `heat_cool` sont prises en charge. Si la pièce est plus froide que la limite basse et que l’écart dépasse l’écart minimal de température, Velair calcule sa prévision à partir de cette limite et applique la plage complète en avance pour chauffer. Si la pièce est plus chaude que la limite haute et que l’écart dépasse ce seuil, il utilise la limite haute et applique la plage complète en avance pour refroidir. Les mesures dans la plage ou dans les bandes mortes autour de ses limites conservent l’horaire normal. Velair envoie toujours les deux limites ; il ne réduit jamais une plage à une seule température.

Lorsque l’appareil est développé, chaque mode pris en charge affiche une carte de prévision en direct. Elle utilise les mêmes données backend du prochain événement que Vue d’ensemble ; les pauses, forçages, modes non pris en charge et blocs ne pouvant pas démarrer en avance sont donc traités de façon cohérente. Lorsqu’un futur bloc correspondant existe, la carte affiche l’heure de début calculée, l’heure cible, l’avance, la température et le mode programmés, ainsi que le choix du modèle initial ou d’un historique local similaire.

Pour vérifier un calcul précis, ouvrez **Détails du calcul** dans la carte de prévision en direct. Cette section facultative présente les valeurs backend utilisées : nombres d’échantillons, estimation issue des observations complètes, borne inférieure issue des observations partielles, estimation combinée, arrondi et avance finale. Elle est masquée par défaut pour garder la vue normale simple.

<a id="how-it-starts"></a>
## Comment le démarrage est déterminé

Velair calcule l’écart actuel de température pour le prochain bloc de température programmé.

Pour une plage `heat_cool`, « température cible » désigne ci-dessous la limite basse en chauffage et la limite haute en refroidissement.

Pour le chauffage :

```text
delta = target temperature - current temperature
```

Pour le refroidissement :

```text
delta = current temperature - target temperature
```

Si l’écart est inférieur à l’écart minimal de température, Velair conserve l’horaire normal du bloc et ne démarre pas en avance.

<a id="schedule-boundaries-and-other-climates"></a>

## Limites du programme et autres équipements

Un démarrage anticipé hebdomadaire ne doit pas atteindre ni franchir le bloc effectif immédiatement précédent du programme du même équipement, y compris un bloc `Off`. Si la fenêtre calculée atteint ou franchit cette limite, Velair conserve l’heure normale de confort. Par exemple, avec `Off` à `19:00` et `heat` à `20:00`, un démarrage calculé à `18:00` est supprimé : `Off` s’applique à `19:00` et le chauffage commence à `20:00`. Un bloc `Off` à `22:00` la veille n’empêche pas un démarrage à `05:35` pour `07:00` sans bloc intermédiaire. Cette règle s’applique aussi au refroidissement et aux plages natives `heat_cool` ; elle ne modifie pas les prévisions d’arrivée de Retour prévu.

Un équipement déjà en préconditionnement ne retarde pas les blocs ni les démarrages anticipés des autres équipements. Si le traitement d’une action franchit une autre transition, Velair détermine la cible actuellement autorisée pour l’équipement concerné au lieu de rejouer des commandes obsolètes. Les pauses, les forçages, le réglage manuel, les zones désactivées et l’exécution externe du programme déterminent toujours si une cible peut être transmise. Cette récupération s’applique pendant le fonctionnement du planificateur ; le comportement configuré d’application au démarrage reste inchangé.

<a id="initial-model-example"></a>
## Exemple du modèle initial

Lorsque l’historique local est insuffisant, Velair utilise le modèle initial :

```text
lead = Minimum start + Initial model min/degree * temperature delta
```

Scénario :

- Bloc programmé : `21 °C`, `heat`, heure cible `07:00`
- Température de la pièce : `18 °C`
- Avance minimale : `10 min`
- Modèle initial : `25 min/°C` ou son équivalent `13.89 min/°F`
- Avance maximale : `24 h`

Calcul :

```text
delta = 21 - 18 = 3 °C
lead = 10 + 25 * 3 = 85 min
start = 07:00 - 85 min = 05:35
```

Velair applique la consigne programmée à `05:35` et conserve `07:00` comme heure cible de confort visible.

<a id="heating-with-learned-history"></a>
## Chauffage à partir de l’historique d’apprentissage

Après suffisamment d’observations réussies, Velair peut utiliser un historique local similaire plutôt que le modèle initial.

Scénario :

- Bloc programmé : `21 °C`, `heat`, heure cible `07:00`
- Température actuelle de la pièce : `18.5 °C`
- Écart actuel : `2.5 °C`
- Observations complètes similaires :

```text
A: 2.0 °C in 50 min -> 25.0 min/°C
B: 2.4 °C in 72 min -> 30.0 min/°C
C: 2.8 °C in 84 min -> 30.0 min/°C
D: 2.1 °C in 63 min -> 30.0 min/°C
E: 2.6 °C in 91 min -> 35.0 min/°C
```

Avec le percentile de confort réglé à `80`, Velair choisit une valeur prudente parmi les échantillons complets similaires. Dans cet exemple, il s’agit de `35.0 min/°C`.

```text
lead = 2.5 * 35 = 87.5 min
```

Velair arrondit l’avance finale vers le haut à la prochaine minute prise en charge par le planificateur, plutôt qu’en dessous de la valeur calculée.

```text
87.5 min -> 90 min
start = 07:00 - 90 min = 05:30
```

<a id="cooling-example"></a>
## Exemple de refroidissement

Scénario :

- Bloc programmé : `23 °C`, `cool`, heure cible `22:00`
- Température de la pièce : `27 °C`
- Avance minimale : `10 min`
- Modèle initial : `25 min/°C`
- Avance maximale : `24 h`

Calcul :

```text
delta = 27 - 23 = 4 °C
lead = 10 + 25 * 4 = 110 min
start = 22:00 - 110 min = 20:10
```

Si l’appareil dispose ensuite d’assez d’observations de refroidissement, Velair utilise uniquement cet historique. L’historique de chauffage n’est pas mélangé à celui du refroidissement, car une même pièce et un même appareil peuvent chauffer et refroidir à des vitesses différentes.

<a id="partial-and-invalid-observations"></a>
## Observations partielles et invalides

Velair stocke des observations locales compactes après les tentatives de préconditionnement.

Les observations complètes sont des exemples utiles où la pièce a atteint le seuil de consigne à temps.

Les observations partielles signifient que Velair a démarré en avance, mais que la pièce n’a pas atteint le seuil de consigne à l’heure de confort programmée. Elles servent de bornes inférieures : Velair sait qu’il fallait davantage de temps, sans inventer une durée d’achèvement.

Les observations invalides sont conservées seulement pour le diagnostic et n’alimentent pas le modèle. Il peut s’agir d’écarts minuscules, de durées impossibles, de sessions interrompues, de températures manquantes, de forçages, de pauses ou de changements d’état du planificateur.

Si des observations partielles anciennes sont suivies d’assez d’observations complètes montrant que la pièce atteint désormais la consigne de façon fiable, ces anciennes observations partielles cessent de pousser la prévision vers le haut.

<a id="outdoor-temperature-sensor"></a>
## Capteur de température extérieure

Le capteur de température extérieure est facultatif.

S’il est configuré, Velair enregistre sa valeur comme contexte local des observations, puis compare les conditions actuelles à des observations passées similaires. Il ne consulte pas de service météo, ne nécessite pas Internet et n’applique pas de décalage fixe au modèle initial.

Si le capteur extérieur est indisponible lors de l’enregistrement d’un échantillon, Velair enregistre simplement l’observation sans ce contexte.

<a id="room-assist-interaction"></a>
## Interaction avec Room Assist

Par défaut, le préconditionnement adaptatif utilise `current_temperature` de l’entité climatique.

Si l’assistance par capteur ambiant est activée pour cet appareil et qu’un capteur de pièce est sélectionné, le préconditionnement adaptatif utilise ce capteur comme température effective de la pièce pour ses décisions et son apprentissage.

C’est utile pour les têtes thermostatiques ou thermostats dont le capteur intégré se trouve trop près d’un radiateur, d’une sortie d’air ou d’une autre source locale de chaleur. Consultez [Room Assist](room-assist.fr.md) pour le fonctionnement côté actionneur.

<a id="automation-events"></a>
## Événements d’automatisation

Velair utilise trois événements `velair_event` pour ce cycle de fonctionnement :

- `preconditioning_plan_updated` lorsqu’un plan calculé apparaît ou change ;
- `preconditioning_plan_cancelled` lorsqu’un plan publié ne s’applique plus ;
- `preconditioning_observation_recorded` après l’enregistrement d’un échantillon d’apprentissage.

Consultez [Événements d’automatisation](automation-events.fr.md#preconditioning-plan-updated) pour les règles précises d’émission et les exemples complets de données.

Exemple de déclencheur d’automatisation :

```yaml
trigger:
  - platform: event
    event_type: velair_event
    event_data:
      event: preconditioning_plan_updated
      entity_id: climate.living_room
```

<a id="when-velair-does-nothing"></a>
## Quand Velair n’intervient pas

Le préconditionnement adaptatif ne démarre pas en avance lorsque :

- le préconditionnement est désactivé pour cet appareil ;
- le planificateur n’est pas en mode automatique ;
- la zone est en pause ou en forçage ;
- le prochain bloc est `Off` ;
- l’appareil ne prend pas en charge la direction de chauffage ou de refroidissement nécessaire ;
- l’écart de température est inférieur à l’écart minimal de température ;
- la température nécessaire est indisponible ou non numérique.

<a id="lovelace"></a>
## Lovelace

La vue Anticipation est disponible comme carte Lovelace :

```yaml
type: custom:velair-card
view: preconditioning
entities:
  - climate.living_room
```

La carte Lovelace utilise la même configuration backend que le panneau principal Velair.

<a id="technical-details"></a>
## Détails techniques

Les détails destinés aux développeurs sur le stockage, l’algorithme d’apprentissage, les observations partielles, la pondération par similarité et la sortie API sont documentés dans [Fonctionnement interne du préconditionnement adaptatif](../developer/adaptive-preconditioning.md).
