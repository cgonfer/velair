<a id="zone-control-and-delivery-sensors"></a>
# Capteurs de contrôle et de transmission des zones
<!-- velair-docs:start -->
Traductions: [Original en anglais](zone-sensors.md) · [Español](zone-sensors.es.md) · [Français](zone-sensors.fr.md) · [Deutsch](zone-sensors.de.md) · [Italiano](zone-sensors.it.md) · [Nederlands](zone-sensors.nl.md) · [Polski](zone-sensors.pl.md) · [Português (Brasil)](zone-sensors.pt-br.md) · [Português (Portugal)](zone-sensors.pt-pt.md) · [Русский](zone-sensors.ru.md) · [État des traductions](../translation-status.md)

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

Velair crée deux capteurs de contexte pour chaque entité `climate.*` gérée :

- **Contrôle de zone** indique qui contrôle actuellement la zone et quelle configuration Velair s’applique.
- **Diagnostic de livraison de zone** indique le résultat de la dernière tentative de Velair pour transmettre une cible climatique via Home Assistant.

Ils décrivent des couches différentes. Une zone peut être contrôlée automatiquement alors que sa dernière transmission est indisponible ou a échoué ; ne considérez donc aucun des deux capteurs comme un substitut à l’autre.

Le capteur distinct **Conditions ambiantes** expose les `derived_metrics` activées et la liste ordonnée `insights`, présente uniquement à l’exécution, lorsque le Confort est activé. Les observations contiennent `code`, `kind`, `tone` et les `metrics` qui les étayent ; elles sont observationnelles et n’exécutent jamais d’actions climatiques. Consultez [Confort environnemental](comfort.fr.md#comfort-insights). Lorsque la comparaison extérieure facultative est activée, ce même capteur expose aussi le sous-arbre `outdoor`. Il contient les relevés sources, les humidités absolues intérieure et extérieure explicites, une qualité indépendante et une possibilité de ventilation ou un compromis interprétés par Velair. Velair ne crée pas d’entités intermédiaires pour chaque relevé. Il crée cependant un capteur distinct à états énumérés **Possibilité de ventilation** pour le résumé d’automatisation géré par le backend décrit ci-dessous.

<a id="environmental-condition"></a>
## Conditions ambiantes

Le capteur **Conditions ambiantes** fournit l’état actuel aux automatisations du Confort. Il est activé par défaut pour chaque équipement climatique géré et se met à jour à partir de la même évaluation du backend que le panneau Velair. Le lire n’interroge pas un capteur et n’exécute aucune action climatique.

Son état natif conserve la classification physique compatible de température et d’humidité :

| État | Signification |
| --- | --- |
| `monitoring_off` | La surveillance du Confort est désactivée pour cet équipement. |
| `no_readings` | Aucun relevé surveillé utilisable n’est actuellement disponible. |
| `temperature_comfortable` | Seule la température peut être évaluée et elle est dans sa plage configurée. |
| `humidity_comfortable` | Seule l’humidité peut être évaluée et elle est dans sa plage configurée. |
| `comfortable` | La température et l’humidité sont toutes deux dans leurs plages configurées. |
| `cold` / `hot` | La température est sous ou au-dessus de sa plage configurée. |
| `dry` / `humid` | L’humidité est sous ou au-dessus de sa plage configurée. |
| `cold_and_dry` / `cold_and_humid` | Les deux relevés sont utilisables et la température est sous sa plage. |
| `hot_and_dry` / `hot_and_humid` | Les deux relevés sont utilisables et la température est au-dessus de sa plage. |

Ces valeurs restent compatibles avec les automatisations existantes. Elles décrivent les plages physiques configurées ; elles ne constituent pas un avis médical ou universel sur le confort personnel.

<a id="environmental-condition-attributes"></a>
### Attributs des conditions ambiantes

| Attribut | Signification |
| --- | --- |
| `data_quality` | `complete`, `unverified`, `partial`, `stale` ou `unavailable` pour les relevés intérieurs surveillés. `unverified` signifie que les relevés sont utilisables, mais qu’au moins un ne dispose pas d’un horodatage vérifiable indiquant quand il a été communiqué. |
| `data_issues` | Codes stables expliquant les données intérieures manquantes, périmées ou invalides. Omis si vide. |
| `range_summary` | Résumé factuel des plages configurées, avec mise en relation facultative avec Humidex. |
| `ventilation_opportunity` | État actuel de ventilation géré par le backend, avec portée, effets, obstacles et raison. |
| `comfort_zone` | Géométrie cible Simple, Guidée ou personnalisée tenant compte de la température, et plage d’humidité effective à la température actuelle. |
| `temperature_source` | ID de l’entité actuellement utilisée pour la température intérieure, si disponible. |
| `humidity_source` | ID de l’entité actuellement utilisée pour l’humidité intérieure, si disponible. |
| `derived_metrics` | Données activées d’Humidex, de point de rosée et d’humidité absolue. Les mesures non surveillées sont omises. |
| `outdoor` | Comparaison facultative entre intérieur et extérieur, seuils effectifs de conseil, qualité des données, relevés et possibilité ou compromis interprétés par Velair. |
| `insights` | Codes d’observation ordonnés avec `code`, `kind`, `tone` et les `metrics` qui les étayent. Omis si vide. |

`derived_metrics` et `outdoor` sont omis lorsque leur fonction respective n’est pas activée. Quand les relevés activés sont manquants, périmés ou invalides, leurs données restent présentes avec `availability` et le contexte des problèmes afin que les automatisations ne réutilisent pas une ancienne valeur. `insights` est omis si sa liste actuelle est vide. La température et l’humidité intérieures brutes restent sur leurs entités sources. La classification du CO2 est exposée par le capteur distinct **Qualité de l’air**.

Pour un modèle Guidé ou personnalisé tenant compte de la température, `comfort_zone.effective_humidity_range` vaut `null` lorsque la température actuelle est inutilisable. Le relevé d’humidité peut alors rester visible, mais n’a aucune classification et ne doit pas être considéré comme intérieur ou extérieur à une plage supposée.

`range_summary` contient :

```yaml
status: within_range | outside_range | mixed | unavailable
thermal_relation: aligned | mixed | not_evaluated | unavailable
positions:
  temperature: below | within | above | null
  humidity: below | within | above | null
  humidex: below | within | above | null
```

Par exemple, ce modèle de texte détecte des indicateurs thermiques divergents sans analyser un libellé d’affichage traduit :

```yaml
{% set summary =
   state_attr('sensor.velair_environmental_condition_living_room',
              'range_summary') %}
{{ summary is mapping and summary.get('thermal_relation') == 'mixed' }}
```

Cette condition vérifie que le relevé Humidex activé est actuel et supérieur à la plage de température configurée :

```yaml
{% set metrics =
   state_attr('sensor.velair_environmental_condition_living_room',
              'derived_metrics') or {} %}
{% set humidex = metrics.get('humidex', {}) %}
{{ humidex.get('availability') == 'current'
   and humidex.get('temperature_range_position') == 'above' }}
```

Cette condition utilise un code d’observation géré par le backend. Elle reste valide lorsque la langue d’affichage change :

```yaml
{% set insights =
   state_attr('sensor.velair_environmental_condition_living_room',
              'insights') or [] %}
{{ insights
   | selectattr('code', 'eq', 'ventilation_may_help_cool')
   | list | count > 0 }}
```

Pour la comparaison extérieure facultative, vérifiez la disponibilité avant d’utiliser une valeur numérique :

```yaml
{% set outdoor =
   state_attr('sensor.velair_environmental_condition_living_room',
              'outdoor') or {} %}
{% set comparison = outdoor.get('comparison', {}) %}
{% set thresholds = outdoor.get('guidance_thresholds', {}) %}
{% set temperature = comparison.get('temperature', {}) %}
{{ temperature.get('availability') == 'current'
   and temperature.get('potential') == 'cooling'
   and thresholds.get('temperature_delta') is number }}
```

<a id="entity-or-event"></a>
### Entité ou événement ?

Utilisez cette entité lorsqu’une automatisation a besoin de l’état actuel, y compris après un redémarrage de Home Assistant. Un déclencheur normal d’état peut réagir à une classification physique compatible :

```yaml
triggers:
  - trigger: state
    entity_id: sensor.velair_environmental_condition_living_room
    to: hot_and_humid
```

Utilisez `comfort_assessment_changed` lorsque l’automatisation doit savoir ce qui a changé. Ses champs `previous_range_summary`, `range_summary_changed` et `range_status_changed` distinguent une transition de plage d’une mise à jour du Confort sans rapport. Consultez [Changement de l’évaluation du Confort](automation-events.fr.md#comfort-assessment-changed) pour les données complètes et une automatisation prête à copier.

<a id="ventilation-opportunity"></a>
## Possibilité de ventilation

Le capteur **Possibilité de ventilation** de chaque zone réagit aux événements et reste observationnel :

| État | Signification |
| --- | --- |
| `unavailable` | Le Confort, la comparaison extérieure ou un relevé requis configuré ne peut pas être évalué actuellement. |
| `no_opportunity` | L’air extérieur ne franchit pas les seuils configurés dans une direction utile. |
| `may_help` | L’air extérieur rapproche la pièce du Confort, mais Velair ne peut pas établir qu’il atteint toute la zone configurée. |
| `comfort_possible` | La température extérieure est dans la plage et, si l’humidité est surveillée, l’humidité extérieure est dans la bande de Confort évaluée à cette température extérieure. |
| `trade_off` | Un changement utile dans une dimension surveillée s’accompagne d’une dégradation connue dans une autre. |
| `already_comfortable` | Les conditions ambiantes physiques sont déjà confortables. |

`comfort_possible` est une projection environnementale prudente, pas une promesse liée à l’ouverture d’une fenêtre. Velair ne peut pas connaître le débit d’air, le vent, la pluie, les polluants extérieurs, les apports solaires, l’inertie thermique de la pièce ou la durée d’ouverture. Il n’ouvre jamais de fenêtre et ne change pas le contrôle climatique.

Les attributs incluent `evaluation_scope`, `potential_effects`, `blocked_by`, `reason`, les `data_quality` et `data_issues` extérieurs et les ID des sources extérieures configurées. Si l’humidité intérieure est surveillée mais que l’humidité extérieure est omise, la température peut produire `may_help`, mais jamais `comfort_possible`. Si la surveillance de l’humidité est délibérément désactivée, un résultat `comfort_possible` basé uniquement sur la température est valide.

`reason` est un code stable exploitable automatiquement. Ses valeurs sont : `monitoring_off`, `outdoor_comparison_disabled`, `indoor_temperature_unavailable`, `indoor_humidity_unavailable`, `outdoor_temperature_unavailable`, `outdoor_humidity_unavailable`, `already_comfortable`, `known_trade_off`, `no_useful_difference`, `outdoor_conditions_within_comfort`, `outdoor_humidity_not_configured` et `moves_toward_comfort`.

Pour un équipement tel que `climate.living_room`, une nouvelle entrée du registre utilise normalement un ID d’entité tel que :

```text
sensor.velair_ventilation_opportunity_living_room
sensor.velair_control_living_room
sensor.velair_delivery_diagnostics_living_room
```

Ce sont des ID d’entité suggérés, pas une API permanente. Home Assistant peut ajouter un suffixe pour éviter une collision et les utilisateurs peuvent renommer une entité. Sélectionnez les entités avec leurs ID réels dans votre registre Home Assistant. Le nom affiché utilise le nom convivial de l’équipement géré ; l’ID suggéré utilise l’identifiant d’objet de l’entité climatique. Le nom de l’appareil de service Velair et sa zone Home Assistant ne font pas partie de cet ID suggéré.

<a id="zone-control"></a>
## Contrôle de zone

**Contrôle de zone** est activé par défaut et reconstruit à partir du planificateur après chaque redémarrage. Son état identifie qui détient le contrôle actuel :

| État | Signification |
| --- | --- |
| `automatic` | Velair détient le contrôle local. Cela inclut les états programmé, inactif, en pause, arrêté, Forçage et préconditionnement adaptatif. Utilisez `runtime_state` pour les distinguer. |
| `manual` | Velair a cédé cet équipement à un réglage manuel, explicitement ou après détection d’un changement externe. Cela diffère du Mode Velair **Manuel**, qui décrit la sélection des Profils. |
| `external` | Un fournisseur de programmation externe pris en charge contrôle l’exécution physique de cette zone. Un changement depuis une carte de thermostat, une télécommande ou une autre automatisation ne produit pas cet état ; lorsque Velair cède à un tel changement, l’état est `manual`. |

Le capteur reste disponible pendant une migration requise d’unité de température, car son information de contrôle n’est pas une valeur de température.

<a id="zone-control-attributes"></a>
### Attributs du contrôle de zone

| Attribut | Valeurs ou signification |
| --- | --- |
| `runtime_state` | `idle`, `scheduled`, `preconditioning`, `boost`, `paused`, `stopped`, `externally_managed`, `temperature_migration_required` ou la valeur de repli défensive `unknown`. |
| `schedule_source` | `default` pour la programmation par défaut de la zone, `profile` pour une programmation effective de Profil ou `profile_pause` lorsque le Profil effectif met la zone en pause. |
| `profile_id` / `profile_name` | ID stable et nom affiché du Profil contrôlant la zone, le cas échéant. |
| `mode_id` / `mode_name` | ID stable et nom affiché du Mode sélectionné, lorsqu’un Mode personnalisé s’applique. |
| `manual_source` | Présent uniquement dans `manual` : `explicit` si le réglage manuel a été sélectionné directement, `external_change` si Velair a cédé à un modification détectée de la climatisation, ou la valeur de repli défensive `other`. |
| `manual_started_at` | Horodatage du début du réglage manuel actuel. |
| `manual_until` | Expiration prévue lorsque la politique manuelle sélectionnée en définit une. Peut être absent pour un réglage sans limite de durée. |
| `manual_policy` | Présent uniquement dans `manual` : `until_next_block`, `for_duration`, `until_resumed` ou la valeur de repli défensive `unknown`. |

Les attributs facultatifs sont omis lorsqu’ils ne s’appliquent pas. Par exemple, une entité `automatic` n’a ni `manual_source` ni `manual_until`.

L’état de contrôle et l’état d’exécution sont volontairement séparés. Par exemple :

- `automatic` avec `runtime_state: paused` signifie que Velair contrôle toujours la zone, mais qu’une pause empêche actuellement l’exécution normale de la programmation ;
- `automatic` avec `runtime_state: boost` signifie que Velair contrôle le Forçage temporaire ;
- `external` avec `runtime_state: externally_managed` signifie que le fournisseur externe configuré détient l’exécution physique, plutôt que la transmission locale des commandes climatiques de Velair.

<a id="zone-delivery-diagnostics"></a>
## Diagnostic de livraison de zone

**Diagnostic de livraison de zone** est une entité de diagnostic désactivée par défaut. Activez-la uniquement lorsqu’un tableau de bord ou une automatisation a besoin des dernières preuves de transmission locale :

1. Ouvrez **Paramètres > Appareils et services > Entités** dans Home Assistant.
2. Recherchez le nom de l’équipement géré suivi de **Diagnostic de livraison**.
3. Ouvrez les réglages de l’entité et activez-la.

Le capteur réagit aux événements sans interrogation périodique. Son état décrit le dernier résultat de transmission observé depuis le démarrage de l’intégration :

| État | Quand il se produit |
| --- | --- |
| `idle` | Aucun résultat de transmission n’a été enregistré depuis le démarrage ou depuis l’effacement des preuves de transmission à l’exécution. |
| `success` | Home Assistant a accepté la séquence complète de services climatiques Velair. `retry_count` indique s’il s’agissait de la tentative initiale ou d’une nouvelle tentative. |
| `failed` | Home Assistant a rejeté un appel de service climatique. Les opérations du planificateur passent normalement à une récupération limitée ; une action ponctuelle sans mécanisme de reprise peut rester en échec sans nouvelle tentative. |
| `retrying` | Velair a commencé une de ses tentatives de reprise limitées après un échec récupérable. Cet état peut être bref. |
| `exhausted` | La tentative initiale du planificateur et les deux nouvelles tentatives différées ont échoué. |
| `invalid_intent` | Pendant une reprise ou une nouvelle transmission, Velair n’a plus pu résoudre l’intention actuelle en transmission valide. Les erreurs normales de validation des services et configurations sont rejetées avant d’atteindre cet état. |
| `cancelled` | Une opération de transmission active ou différée a été remplacée par une intention plus récente, explicitement invalidée ou arrêtée alors qu’elle était encore en attente. Cet état peut être bref si une nouvelle opération commence immédiatement. |
| `unavailable` | L’équipement géré était absent, `unknown` ou `unavailable` ; Velair n’a donc pas effectué l’appel de service climatique. Une intention admissible du planificateur est résolue de nouveau lorsque l’entité devient disponible. |

L’entité de diagnostic elle-même reste disponible afin que `unavailable` puisse être un état observable. Elle reste aussi disponible pendant une migration requise d’unité de température ; les preuves de température enregistrées conservent l’unité capturée avec la cible acceptée.

Velair effectue actuellement au plus deux nouvelles tentatives différées, après environ 2 et 10 secondes. Ces délais constituent un comportement de récupération, pas un contrat d’automatisation conseillé ; les automatisations doivent réagir aux états plutôt que dépendre des délais exacts.

<a id="delivery-diagnostic-attributes"></a>
### Attributs du diagnostic de transmission

| Attribut | Signification |
| --- | --- |
| `updated_at` | Horodatage de la dernière mise à jour de l’état de transmission. Absent de l’état initial `idle`. |
| `retry_count` | Numéro de la tentative représentée par l’état actuel terminal ou de reprise : `0` pour la tentative initiale, puis `1` ou `2` pour les reprises. L’annulation le remet à `0`. |
| `last_error_at` | Horodatage du dernier résultat enregistré `failed`, `exhausted` ou `invalid_intent`. |
| `last_error_code` | `failed`, `exhausted`, `invalid_intent` ou la valeur de repli défensive `unknown_delivery_status`. Le texte brut des exceptions n’est jamais exposé. |
| `last_accepted_at` | Horodatage auquel Home Assistant a accepté la séquence complète de contrôle Velair la plus récente. |
| `last_accepted_source` | `automatic`, `manual`, `boost` ou `automatic_reassertion`. |
| `last_accepted_action` | `set_temperature`, `set_hvac_mode`, `turn_off` ou la valeur de repli défensive `other`. |
| `last_accepted_hvac_mode` | Mode HVAC inclus dans la cible acceptée, le cas échéant. |
| `last_accepted_temperature_unit` | Unité de température enregistrée avec une cible scalaire ou une plage. |
| `last_accepted_temperature` | Cible scalaire acceptée, le cas échéant. |
| `last_accepted_target_temp_low` / `last_accepted_target_temp_high` | Cibles basse et haute acceptées d’une plage native, le cas échéant. |

Les appels via `velair.set_temperature` et `velair.set_hvac_mode` sont tous deux signalés avec `last_accepted_source: manual`. Un appel réussi de mode uniquement possède `last_accepted_action: set_hvac_mode` et un mode HVAC, tandis que tous les attributs de cible de température restent absents ou `null`.

Les champs de dernière erreur et de dernière acceptation sont des historiques indépendants. Un `success` ultérieur change l’état actuel sans effacer les valeurs `last_error_*` précédentes. De même, un échec ultérieur n’efface pas la dernière cible acceptée. Vérifiez les horodatages lorsqu’une automatisation doit les comparer.

`success` signifie que Home Assistant a accepté les appels de service ; il ne confirme pas leur acheminement, l’activité de l’équipement ni l’atteinte de la cible dans la pièce. Utilisez l’entité climatique et son intégration pour l’état physique. Room Assist peut ensuite modifier la cible envoyée au thermostat et possède son propre capteur pour cet ajustement appliqué. La publication de programmations externes a aussi un statut séparé dans Velair et n’est pas représentée par ce capteur de transmission locale.

Toutes les preuves de transmission existent uniquement à l’exécution. Elles reviennent à `idle` après redémarrage de l’intégration Velair ou de Home Assistant ; une réinitialisation réussie des données Velair les efface aussi. Elles ne sont restaurées ni depuis Recorder ni depuis le stockage Velair.

<a id="automation-examples"></a>
## Exemples d’automatisation

L’automatisation suivante avertit uniquement après épuisement des tentatives limitées de Velair. Remplacez l’ID d’entité d’exemple par celui de votre registre :

```yaml
alias: Velair living room delivery exhausted
triggers:
  - trigger: state
    entity_id: sensor.velair_delivery_diagnostics_living_room
    to: exhausted
actions:
  - action: persistent_notification.create
    data:
      title: Velair delivery problem
      message: >-
        The living room target could not be delivered after
        {{ trigger.to_state.attributes.retry_count }} retries.
```

Cette condition de modèle de texte vérifie que Velair détient actuellement le contrôle automatique et qu’un bloc programmé est actif :

```yaml
condition: template
value_template: >-
  {{ is_state('sensor.velair_control_living_room', 'automatic')
     and state_attr('sensor.velair_control_living_room', 'runtime_state')
         == 'scheduled' }}
```

Utilisez **Contrôle de zone** pour le contrôle actuel et le contexte du planificateur. Utilisez **Diagnostic de livraison de zone** pour le dernier résultat de transmission par services. Utilisez `climate.living_room` pour l’état de l’appareil.
