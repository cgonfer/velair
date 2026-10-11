<a id="automation-events"></a>
# Événements d’automatisation
<!-- velair-docs:start -->
Traductions: [Original en anglais](automation-events.md) · [Español](automation-events.es.md) · [Français](automation-events.fr.md) · [Deutsch](automation-events.de.md) · [Italiano](automation-events.it.md) · [Nederlands](automation-events.nl.md) · [Polski](automation-events.pl.md) · [Português (Brasil)](automation-events.pt-br.md) · [Português (Portugal)](automation-events.pt-pt.md) · [Русский](automation-events.ru.md) · [État des traductions](../translation-status.md)

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

Velair émet des événements Home Assistant bruts et transitoires pour les changements à l’exécution. Les données brutes du bus d’événements existent uniquement pendant leur transmission par Home Assistant ; Velair ne fournit ni archive d’événements ni API de relecture. Ouvrir ou actualiser le panneau n’émet pas ces événements.

Le Diagnostic est distinct. Pour les catégories activées, il peut conserver un résumé expurgé d’événements sélectionnés dans un historique en mémoire limité à 100 entrées. Cet historique est effacé au redémarrage de Velair ou de Home Assistant, ne constitue pas un historique Recorder et ne modifie ni ne prolonge la durée de vie de l’événement d’automatisation d’origine.

Tous les événements utilisent :

```yaml
event_type: velair_event
```

Filtrez `event_data.event` et, pour les événements de zone, `event_data.entity_id` :

```yaml
triggers:
  - trigger: event
    event_type: velair_event
    event_data:
      event: climate_target_applied
      entity_id: climate.living_room
```

Chaque ensemble de données contient `domain: velair` et l’un des noms d’événement ci-dessous.

<a id="external-climate-change-detected"></a>
## Modification externe de la climatisation détectée

`external_climate_change_detected` est émis lorsqu’un appareil géré change de mode HVAC ou de consigne sans que ce changement puisse être attribué à une action Velair. Il s’agit d’une observation : « extérieur à Velair » ne signifie pas nécessairement une personne, car une télécommande ou une autre automatisation peut être à l’origine du changement.

La détection couvre `hvac_mode`, la consigne unique `temperature` et les limites natives `target_temp_low`/`target_temp_high`. Les mesures environnementales et les options de ventilation, préréglage, oscillation ou humidité ne produisent pas cet événement. Les transitions vers ou depuis `unknown` et `unavailable` sont ignorées. Consultez [Modifications externes et réglage manuel](manual-control.fr.md) pour le modèle d’attribution, ses limites, les politiques et les chronologies complètes.

```yaml
domain: velair
event: external_climate_change_detected
entity_id: climate.living_room
changed_fields: [hvac_mode, temperature]
previous:
  hvac_mode: "off"
  temperature: 24
current:
  hvac_mode: "cool"
  temperature: 23
policy: keep_automatic
```

`policy` est la politique régissant le changement. Pendant un réglage manuel actif, elle reste celle de la session même si le choix par défaut de Paramètres a changé entre-temps. `keep_automatic` signifie que Velair n’a pas créé de réglage manuel et a plutôt réévalué sa consigne actuelle faisant autorité. Cette détection n’a donc pas d’événement d’entrée `zone_control_changed` correspondant.

`zone_control_changed` est émis lorsque la zone entre en réglage manuel ou revient au contrôle automatique. Son `control_mode` est `manual` ou `automatic`, volontairement distinct du mode Velair Manuel.

```yaml
domain: velair
event: zone_control_changed
entity_id: climate.living_room
control_mode: manual
previous_control_mode: automatic
policy: for_duration
source: external_change
duration_minutes: 60
started_at: "2026-08-20T18:00:00+02:00"
until: "2026-08-20T19:00:00+02:00"
```

`source` vaut `external_change` lorsqu’un réglage externe crée la session et `explicit` lorsque le panneau ou `velair.enter_manual_adjustment` capture l’état en direct de l’appareil. `duration_minutes` apparaît uniquement pour `for_duration`.

Une entrée `until_resumed` omet `until`. La sortie automatique contient `reason: expired` ; une sortie explicite contient `reason: resumed`. Quitter le réglage manuel ne supprime aucune raison indépendante de pause qui pourrait encore empêcher l’application physique de la programmation.

Les actions de service équivalentes sont :

```yaml
action: velair.set_external_change_policy
data:
  entity_id: climate.living_room
  policy: for_duration
  duration_minutes: 60
```

```yaml
action: velair.resume_automatic_control
data:
  entity_id: climate.living_room
```

<a id="diagnostic-issue-changed"></a>
## Problème de diagnostic modifié

`diagnostic_issue_changed` est émis lorsqu’un problème de diagnostic vérifiable est détecté ou résolu. Velair prend les problèmes présents au démarrage comme référence ; redémarrer Home Assistant n’émet donc pas une rafale de problèmes déjà actifs. Les problèmes inchangés ne sont pas émis en double.

Un problème est identifié par `code`, un éventuel `entity_id` d’appareil géré et un éventuel `purpose` de capteur. Les données ne contiennent aucun message d’exception brut, identifiant de profil/mode/pause ni cause supposée. `change` vaut `detected` ou `resolved` ; `severity` vaut `warning` ou `error`.

```yaml
domain: velair
event: diagnostic_issue_changed
change: detected
severity: error
code: delivery_exhausted
entity_id: climate.living_room
```

Par exemple, notifier chaque nouvelle erreur détectée par Velair :

```yaml
alias: Notify about new Velair errors
triggers:
  - trigger: event
    event_type: velair_event
    event_data:
      event: diagnostic_issue_changed
      change: detected
      severity: error
actions:
  - action: notify.notify
    data:
      message: "Velair detected an error. Open Diagnostics for details."
```

Pour l’état global, utilisez plutôt le capteur **État du diagnostic**. Son identifiant peut être changé dans Home Assistant ; sélectionnez-le donc dans l’éditeur d’automatisation :

```yaml
triggers:
  - trigger: state
    entity_id: sensor.velair_diagnostics_status
    to: "error"
```

<a id="profile-changed"></a>
## Profils modifiés

`profile_changed` est émis après l’enregistrement d’un ensemble différent de profils climatiques ou des programmations Par défaut. Sélectionner directement le même ensemble actif peut faire passer l’entité native de mode à Manuel, sans émettre `profile_changed`, puisque les profils effectifs n’ont pas changé.

```yaml
domain: velair
event: profile_changed
profile_ids:
  - away
  - bedrooms
previous_profile_ids: []
source: select
```

`source` identifie l’origine de la sélection effective. Les valeurs publiques sont `panel`, `service` et `select` ; les opérations internes du cycle de fonctionnement peuvent publier une valeur plus précise comme `profile_deleted` ou `mode_updated`. Les listes ordonnées d’identifiants décrivent les ensembles actifs complets nouveau et précédent. Une liste `profile_ids` vide représente Par défaut.

Cette automatisation réagit, par exemple, lorsque le profil d’identifiant `away` entre dans l’ensemble actif :

```yaml
alias: Notify when Away profile becomes active
triggers:
  - trigger: event
    event_type: velair_event
    event_data:
      event: profile_changed
conditions:
  - condition: template
    value_template: "{{ 'away' in trigger.event.data.profile_ids }}"
actions:
  - action: notify.notify
    data:
      message: Away profile is active
```

Pour réagir au retour aux programmations Par défaut, utilisez une condition de modèle vérifiant `trigger.event.data.profile_ids == []`.

<a id="scheduler-mode-changed"></a>
## Mode du planificateur modifié

`scheduler_mode_changed` est émis lorsque le mode global ou l’expiration de pause change, y compris à l’expiration automatique. Répéter le même mode et la même échéance ne l’émet pas.

```yaml
domain: velair
event: scheduler_mode_changed
mode: paused
previous_mode: auto
paused_until: "2026-07-09T18:30:00+02:00"
paused_started_at: "2026-07-09T17:00:00+02:00"
```

<a id="climate-target-applied"></a>
## Consigne climatique appliquée

`climate_target_applied` est émis après l’application par Velair d’une consigne programmée, d’une action de mode uniquement, d’options uniquement, d’arrêt, d’une programmation restaurée ou de démarrage, ou d’un appel à `velair.set_temperature` / `velair.set_hvac_mode`. Les réglages facultatifs non pris en charge sont omis.

```yaml
domain: velair
event: climate_target_applied
entity_id: climate.bedroom
action: set_temperature
temperature: 23
hvac_mode: cool
fan_mode: low
preset_mode: sleep
swing_mode: off
swing_horizontal_mode: center
humidity: 50
weekday: thursday
start: "22:30"
target_when: "2026-07-09T22:30:00+02:00"
source: scheduled_event
```

Les valeurs courantes de `source` sont `scheduled_event`, `current_schedule`, `schedule_saved`, `scheduler_resumed`, `startup`, `service_set_temperature`, `service_set_hvac_mode`, `boost_ended`, `zone_paused`, `zone_resumed` et `zone_pause_expired`.

Pour une plage cible, `temperature` est omis et l’événement contient les deux limites :

```yaml
target_temp_low: 20
target_temp_high: 24
hvac_mode: heat_cool
```

Pour un bloc de mode uniquement, `action` vaut `set_hvac_mode`, `hvac_mode` est le mode appliqué et tous les champs de température cible sont omis. Les automatisations peuvent ainsi distinguer un transfert de mode d’un changement de consigne. `velair.set_hvac_mode` utilise la même structure avec `source: service_set_hvac_mode`, sans les champs propres à la programmation `weekday` ou `start`.

Pour un bloc d’options uniquement, `action` vaut `set_climate_options`. L’événement contient les champs facultatifs appliqués, comme `preset_mode` ou `fan_mode`, sans consignes de température ni `hvac_mode`. Ces blocs n’allument pas un appareil éteint.

<a id="preconditioning-plan-updated"></a>
## Plan de préconditionnement actualisé

`preconditioning_plan_updated` est émis lorsqu’un nouveau plan de démarrage anticipé est publié ou que l’une de ses entrées de calcul ou l’un de ses résultats change. Les recalculs identiques ne sont pas émis en double. La planification au démarrage peut émettre cet événement ; un calcul effectué seulement pour répondre au panneau ne l’émet pas.

```yaml
domain: velair
event: preconditioning_plan_updated
entity_id: climate.living_room
scheduled_when: "2026-01-15T07:00:00+01:00"
preconditioning_when: "2026-01-15T05:35:00+01:00"
lead_minutes: 85
direction: heat
target_kind: scalar
target_boundary: temperature
boundary_temperature: 21
target_temperature: 21
current_temperature: 17.8
temperature_delta: 3.2
hvac_mode: heat
preset_mode: comfort
model_source: history
complete_sample_count: 12
partial_sample_count: 3
invalid_sample_count: 1
similar_sample_count: 8
comfort_percentile: 90
used_outdoor_temperature: true
outdoor_temperature: -1.5
weekday: thursday
start: "07:00"
preconditioning_diagnostics:
  direction: heat
  target_kind: scalar
  target_boundary: temperature
  boundary_temperature: 21
  current_temperature: 17.8
  delta_temperature: 3.2
  complete_sample_count: 12
  partial_sample_count: 3
  invalid_sample_count: 1
  similar_sample_count: 8
  comfort_percentile: 90
  complete_rate_minutes_per_degree: 23.4
  complete_estimate_minutes: 74.88
  partial_floor_minutes: 82
  combined_estimate_minutes: 82
  rounded_estimate_minutes: 85
  final_lead_minutes: 85
  limited_by_min_start: false
  limited_by_max_lead: false
  source: history
  used_outdoor_temperature: true
  initial_model_lead_minutes: 110
```

Pour un plan de plage native, `target_temperature` vaut `null` et les données contiennent la paire complète `target_temp_low` et `target_temp_high`. `target_kind` vaut `range`, `target_boundary` vaut `low` ou `high`, et `boundary_temperature` est la limite effective unique utilisée par la prévision. `temperature_delta` est mesuré par rapport à cette limite. Les plans à consigne unique gardent `target_kind: scalar` et `target_boundary: temperature`.

Une prévision de chauffage pour une plage `20–24 °C` contient, par exemple :

```yaml
direction: heat
target_kind: range
target_boundary: low
boundary_temperature: 20
target_temperature: null
target_temp_low: 20
target_temp_high: 24
current_temperature: 18
temperature_delta: 2
hvac_mode: heat_cool
```

<a id="preconditioning-plan-cancelled"></a>
## Plan de préconditionnement annulé

`preconditioning_plan_cancelled` est émis une fois lorsqu’un plan publié n’existe plus, par exemple après modification de programmation, diminution de l’écart thermique, désactivation du préconditionnement ou sortie du mode automatique. Il reprend le dernier plan publié afin qu’une automatisation puisse identifier ce qui a été annulé.

```yaml
domain: velair
event: preconditioning_plan_cancelled
entity_id: climate.living_room
scheduled_when: "2026-01-15T07:00:00+01:00"
preconditioning_when: "2026-01-15T05:35:00+01:00"
lead_minutes: 85
direction: heat
target_kind: scalar
target_boundary: temperature
boundary_temperature: 21
target_temperature: 21
current_temperature: 17.8
temperature_delta: 3.2
hvac_mode: heat
preset_mode: comfort
model_source: history
complete_sample_count: 12
partial_sample_count: 3
invalid_sample_count: 1
similar_sample_count: 8
comfort_percentile: 90
used_outdoor_temperature: true
outdoor_temperature: -1.5
weekday: thursday
start: "07:00"
preconditioning_diagnostics:
  direction: heat
  target_kind: scalar
  target_boundary: temperature
  boundary_temperature: 21
  current_temperature: 17.8
  delta_temperature: 3.2
  complete_sample_count: 12
  partial_sample_count: 3
  invalid_sample_count: 1
  similar_sample_count: 8
  comfort_percentile: 90
  complete_rate_minutes_per_degree: 23.4
  complete_estimate_minutes: 74.88
  partial_floor_minutes: 82
  combined_estimate_minutes: 82
  rounded_estimate_minutes: 85
  final_lead_minutes: 85
  limited_by_min_start: false
  limited_by_max_lead: false
  source: history
  used_outdoor_temperature: true
  initial_model_lead_minutes: 110
reason: no_longer_planned
```

`reason` vaut `no_longer_planned` si le recalcul supprime un plan et `scheduler_not_auto` lors d’une pause ou d’un arrêt de la programmation automatique.

<a id="preconditioning-observation-recorded"></a>
## Observation de préconditionnement enregistrée

`preconditioning_observation_recorded` est émis après validation d’une observation d’apprentissage, limitation de l’historique à la taille configurée et enregistrement durable. `quality` peut valoir `complete`, `partial` ou `invalid`.

```yaml
domain: velair
event: preconditioning_observation_recorded
entity_id: climate.living_room
direction: heat
created_at: "2026-01-15T06:52:00+01:00"
scheduled_time: "2026-01-15T07:00:00+01:00"
start_time: "2026-01-15T05:35:00+01:00"
target_temp: 21
initial_temp: 17.8
observed_temp: 20.8
outdoor_temp_start: -2.1
outdoor_temp_target: -1.5
temperature_source: room_sensor
room_temperature_entity_id: sensor.living_room_temperature
delta_t: 3.2
startup_minutes: 85
reached: true
minutes_to_reach: 77
quality: complete
stored_sample_count: 16
```

Une observation invalide comprend également `invalid_reason`.

<a id="comfort-assessment-changed"></a>
## Évaluation du confort modifiée

`comfort_assessment_changed` est émis lorsque `condition`, `air_quality`, `data_quality`, `data_issues` ou l’état sémantique d’une mesure dérivée activée change. Cet état comprend disponibilité, source, entité, unité, problèmes et condition. Les variations numériques des mesures de base ou dérivées actualisent toujours l’interface et les attributs des capteurs sans émettre un autre événement. Le bus d’événements n’est donc pas saturé.

```yaml
domain: velair
event: comfort_assessment_changed
entity_id: climate.office
condition: hot_and_humid
air_quality: elevated
data_quality: complete
data_issues: []
range_summary:
  status: mixed
  thermal_relation: mixed
  positions:
    temperature: above
    humidity: above
    humidex: within
previous_range_summary:
  status: outside_range
  thermal_relation: aligned
  positions:
    temperature: above
    humidity: above
    humidex: above
range_summary_changed: true
range_status_changed: true
temperature:
  metric: temperature
  availability: current
  freshness: reported
  condition: hot
  source: sensor
  entity_id: sensor.office_temperature
  value: 27.1
  min: 20
  max: 24
humidity:
  metric: humidity
  availability: current
  freshness: reported
  condition: humid
  source: sensor
  entity_id: sensor.office_humidity
  value: 67
  min: 40
  max: 60
comfort_zone:
  model: temperature_aware
  temperature_min: 20
  temperature_max: 24
  points:
    - temperature: 20
      humidity_min: 40
      humidity_max: 60
    - temperature: 24
      humidity_min: 35
      humidity_max: 50
  effective_humidity_range:
    temperature: 27.1
    minimum: 35
    maximum: 50
co2:
  metric: co2
  availability: current
  condition: elevated
  source: sensor
  entity_id: sensor.office_co2
  value: 1180
  attention: 1000
  max: 1500
derived_metrics:
  humidex:
    metric: humidex
    availability: current
    condition: null
    source: velair
    entity_id: null
    value: 23.8
    unit: null
    temperature_range_position: within
    issues: []
    input_entity_ids:
      - sensor.office_temperature
      - sensor.office_humidity
  dew_point:
    metric: dew_point
    availability: current
    condition: null
    source: velair
    entity_id: null
    value: 15.1
    unit: °C
    issues: []
    input_entity_ids:
      - sensor.office_temperature
      - sensor.office_humidity
outdoor:
  enabled: true
  data_quality: complete
  data_issues: []
  temperature:
    metric: outdoor_temperature
    availability: current
    source: sensor
    entity_id: sensor.outdoor_temperature
    value: 18
    unit: °C
  humidity:
    metric: outdoor_humidity
    availability: current
    source: sensor
    entity_id: sensor.outdoor_humidity
    value: 55
    unit: "%"
  indoor_absolute_humidity:
    metric: indoor_absolute_humidity
    availability: current
    source: velair
    entity_id: null
    value: 12.7
    unit: g/m³
    input_entity_ids:
      - sensor.office_temperature
      - sensor.office_humidity
  absolute_humidity:
    metric: outdoor_absolute_humidity
    availability: current
    source: velair
    entity_id: null
    value: 8.5
    unit: g/m³
    input_entity_ids:
      - sensor.outdoor_temperature
      - sensor.outdoor_humidity
  guidance_thresholds:
    temperature_delta: 1
    temperature_unit: °C
    humidity_delta_percentage_points: 5
    absolute_humidity_delta_g_m3: 1
  comparison:
    temperature:
      availability: current
      delta: -9.1
      effect: cooler
      potential: cooling
      blocked_by: []
    humidity:
      availability: current
      absolute_humidity_delta: -4.2
      equivalent_indoor_relative_humidity: 43
      equivalent_indoor_relative_humidity_delta: -24
      effect: drier
      potential: drying
      blocked_by: []
insights:
  - code: co2_elevated
    kind: context
    tone: attention
    metrics:
      - co2
  - code: ventilation_may_help_cool
    kind: context
    tone: cool
    metrics:
      - temperature
      - outdoor
ventilation_opportunity:
  state: comfort_possible
  evaluation_scope: temperature_and_humidity
  potential_effects:
    - cooling
    - drying
  blocked_by: []
  reason: outdoor_conditions_within_comfort
```

Les champs de plage servent aux automatisations simples sans remplacer le champ physique `condition` compatible avec les automatisations existantes.

Pour les modèles d’état actuel et les déclencheurs d’état, consultez le [contrat complet de l’entité Conditions ambiantes](zone-sensors.fr.md#environmental-condition). Utilisez cet événement si la valeur précédente ou la transition exacte compte.

| `status` | Signification |
| --- | --- |
| `within_range` | Chaque valeur surveillée utilisable est dans sa plage configurée. |
| `outside_range` | Au moins une valeur surveillée utilisable est hors de sa plage, avec température et Humidex alignés lorsqu’ils sont tous deux activés. |
| `mixed` | Température et Humidex actuels occupent des positions différentes dans la plage. |
| `unavailable` | Une valeur surveillée nécessaire ou l’Humidex activé ne peut pas être évalué actuellement. |

| `thermal_relation` | Signification |
| --- | --- |
| `aligned` | Température et Humidex actuels occupent la même position. |
| `mixed` | Température et Humidex actuels occupent des positions différentes. |
| `not_evaluated` | L’Humidex est désactivé. |
| `unavailable` | La température ou l’Humidex activé ne peut pas être évalué actuellement. |

Chaque entrée de `positions` vaut `below`, `within`, `above` ou `null`. L’événement inclut aussi le résumé précédent complet. `range_summary_changed` indique tout changement d’état, de relation thermique ou de position ; `range_status_changed` indique seulement un changement global de `status`. Les deux indicateurs valent `false` si une autre partie de l’évaluation Confort a causé l’événement.

`comfort_zone` utilise l’unité de l’appareil géré. Sa plage effective est celle utilisée pour la condition d’humidité et les conseils extérieurs. Avec le modèle Guidé ou personnalisé selon la température, elle vaut `null` si la température ne peut pas être évaluée ; les automatisations ne doivent donc pas substituer les anciennes limites fixes d’humidité. Les variations numériques normales de cette plage actualisent attributs et API sans événement, sauf changement d’un résultat sémantique documenté. L’événement comprend aussi `ventilation_opportunity` actuel. Les changements de son état, sa portée, ses effets, ses facteurs bloquants ou sa raison sont sémantiques ; les variations numériques extérieures laissant ces champs inchangés n’émettent pas d’autre événement.

Cette automatisation réagit seulement lorsqu’une zone sort de ses plages configurées :

```yaml
automation:
  - alias: "Velair office outside configured ranges"
    triggers:
      - trigger: event
        event_type: velair_event
        event_data:
          domain: velair
          event: comfort_assessment_changed
          entity_id: climate.office
    conditions:
      - condition: template
        value_template: >-
          {{ trigger.event.data.range_status_changed
             and trigger.event.data.range_summary.status == 'outside_range' }}
    actions:
      - action: notify.notify
        data:
          message: "The office moved outside its configured Comfort ranges."
```

`insights` est une interprétation ordonnée des données intérieures actuelles, disponible uniquement pendant l’exécution. Ses champs sont des identifiants stables plutôt que du texte traduit. Un changement sémantique de ces informations peut émettre l’événement ; les mesures périmées, manquantes ou invalides ne produisent pas d’information contextuelle. Les données contiennent la liste actuelle complète, y compris `insights: []` lorsque la dernière information disparaît. Le champ `condition` existant reste le résumé de l’évaluation et n’est pas dupliqué comme information contextuelle.

Si la comparaison extérieure est activée, l’événement contient le sous-arbre `outdoor` complet. Sa qualité et ses problèmes ne modifient jamais les valeurs intérieures `data_quality` ou `data_issues`. Les événements réagissent aux changements de disponibilité, de qualité, de `effect`, `potential`, `blocked_by` ou de liste d’informations contextuelles ; les variations numériques ordinaires conservant le même résultat sémantique n’émettent pas d’autre événement. `guidance_thresholds` indique la sensibilité effective par zone utilisée pour ce résultat. Modifier un seuil sans changer le résultat actualise l’état actuel, sans événement.

Les données des mesures actuelles comprennent `freshness: reported | unverified`. La qualité intérieure ou extérieure `data_quality` peut être `unverified` si toutes les mesures sont utilisables, mais qu’au moins une n’a pas d’horodatage de mise à jour vérifiable. Les capteurs directs peuvent devenir périmés à leur échéance sans changement de valeur d’état. Le sous-arbre fournit explicitement l’humidité absolue intérieure ; les consommateurs ne doivent pas la reconstruire depuis des écarts arrondis. Les codes d’aération décrivent seulement une opportunité ou un compromis, sans signifier que Velair a ouvert une fenêtre ou modifié l’appareil.

Seules les données de la mesure dérivée Humidex comprennent `temperature_range_position`. Ce champ y est toujours présent et vaut `below`, `within`, `above` ou `null` ; passer entre ces valeurs peut émettre l’événement. Il s’agit d’une comparaison informative avec la plage de température configurée, et non d’un verdict de confort ou d’une commande climatique.

<a id="room-sensor-assist-state-changed"></a>
## Activation de l’assistance par capteur ambiant modifiée

`room_sensor_assist_state_changed` est émis lorsque Room Assist est activé ou désactivé via le panneau, la carte Lovelace, l’API ou un service. Répéter le même état ne l’émet pas.

```yaml
domain: velair
event: room_sensor_assist_state_changed
entity_id: climate.living_room
enabled: true
previous_enabled: false
room_temperature_entity_id: sensor.living_room_temperature
deadband: 0.3
max_delta: 3
debounce_seconds: 20
```

<a id="room-sensor-assist-updated"></a>
## Assistance par capteur ambiant actualisée

`room_sensor_assist_updated` est émis seulement après l’envoi d’une consigne temporaire modifiée à l’appareil. Les variations inférieures au pas de consigne ne l’émettent pas.

```yaml
domain: velair
event: room_sensor_assist_updated
entity_id: climate.living_room
room_temperature_entity_id: sensor.living_room_temperature
target_temperature: 21
applied_temperature: 23.5
room_temperature: 18
climate_temperature: 20.5
assist_delta: 3
applied_offset: 3
direction: heat
hvac_mode: heat
hysteresis_phase: towards_upper
hysteresis_target: 21.3
deadband_low: 20.7
deadband_high: 21.3
reason: scheduled_event
```

Pour une consigne unique fixe `heat` ou `cool` avec bande morte non nulle, les quatre champs d’hystérésis identifient la phase d’exécution appliquée, son bord actif et toute la bande de commutation. Ils sont omis sans bande morte, pour les modes automatiques à consigne unique et les plages natives. La phase reste inchangée lorsque la pièce traverse la consigne centrale et s’inverse seulement après que le capteur externe atteint le bord opposé.

Lorsque la consigne programmée protège un résultat de chauffage ou de refroidissement fixe, la mise à jour à consigne unique ajoute deux champs facultatifs :

```yaml
target_temperature: 22
calculated_temperature: 20
applied_temperature: 22
scheduled_target_guard: cooling_floor
direction: cool
```

`calculated_temperature` est la consigne prise en charge avant protection de programmation. Les automatisations existantes restent compatibles : ces champs sont ajoutés et omis lorsque la protection n’est pas active.

Pour une plage native, les champs de consigne unique sont omis et les deux bandes complètes sont indiquées :

```yaml
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
```

<a id="room-sensor-assist-restored"></a>
## Assistance par capteur ambiant restaurée

`room_sensor_assist_restored` est émis lorsque Room Assist cesse de gérer sa consigne temporaire et restaure la consigne programmée normale lorsque c’est possible. Pour un cycle fixe de chauffage ou refroidissement, atteindre le bord actif de la bande morte reste dans `room_sensor_assist_updated` : cela inverse la phase et peut changer la valeur signée de `applied_offset`. La consigne programmée reste la limite de sécurité pendant la phase sans demande, même si la mesure interne dérive. Si l’arrondi au pas rend inutile une nouvelle commande au thermostat, la phase change toujours dans l’état en direct, mais sans événement de mise à jour, comme décrit plus haut. `reason` explique une transition émise.

```yaml
domain: velair
event: room_sensor_assist_restored
entity_id: climate.living_room
room_temperature_entity_id: sensor.living_room_temperature
target_temperature: 21
applied_temperature: 21
room_temperature: 21.1
climate_temperature: 20.5
assist_delta: 0
applied_offset: 0
direction: heat
hvac_mode: heat
reason: assist_disabled
```

Les autres raisons comprennent `assist_disabled`, `boost_started`, `manual_target`, `missing_temperature`, `no_active_target`, `not_auto`, `schedule_changed`, `schedule_cleared`, `scheduler_mode_changed`, `scheduler_stopped`, `settings_updated`, `turn_off`, `unsupported_mode`, `zone_paused` et `zone_unavailable`. `unsupported_temperature_range` reste possible pour une ancienne consigne unique impossible à appliquer lorsque le mode effectif exige une plage native ; les blocs de plage valides sont pris en charge.

<a id="boost-started"></a>
## Forçage démarré

`boost_started` est émis après l’application et l’enregistrement de la consigne de forçage et de sa dérogation. Remplacer un forçage actif émet un nouvel événement `boost_started`.

Les forçages de plage utilisent `target_temp_low` et `target_temp_high` au lieu de `temperature`. Les données de restauration conservent le même type de consigne.

```yaml
domain: velair
event: boost_started
entity_id: climate.bedroom
temperature: 22
hvac_mode: cool
fan_mode: high
preset_mode: comfort
swing_mode: vertical
swing_horizontal_mode: wide
humidity: 48
started_at: "2026-07-09T14:00:00+02:00"
until: "2026-07-09T15:30:00+02:00"
```

<a id="boost-ended"></a>
## Forçage terminé

`boost_ended` est émis à l’expiration ou à l’annulation d’un forçage. `reason` vaut `expired` ou `manual`. `restoration` décrit l’état que Velair applique ensuite.

```yaml
domain: velair
event: boost_ended
entity_id: climate.bedroom
temperature: 22
hvac_mode: cool
fan_mode: high
preset_mode: comfort
swing_mode: vertical
swing_horizontal_mode: wide
humidity: 48
started_at: "2026-07-09T14:00:00+02:00"
until: "2026-07-09T15:30:00+02:00"
reason: manual
restoration:
  type: schedule
  source: boost_ended
  target:
    action: set_temperature
    temperature: 24
    hvac_mode: cool
    fan_mode: low
    preset_mode: sleep
    swing_mode: off
    swing_horizontal_mode: center
    humidity: 50
    weekday: thursday
    start: "15:00"
```

`restoration.type` peut valoir `schedule`, `previous_state` ou `none`. Une restauration programmée émet aussi `climate_target_applied` avec `source: boost_ended`.

<a id="zone-paused"></a>
## Zone mise en pause

`zone_paused` est émis lorsqu’une zone gérée passe de zéro raison à une raison. Si `action` vaut `turn_off`, `climate_target_applied` est émis d’abord pour cet arrêt.

```yaml
domain: velair
event: zone_paused
entity_id: climate.guest_room
started_at: "2026-07-09T12:00:00+02:00"
until: "2026-07-12T18:00:00+02:00"
action: turn_off
pause_id: velair_window_guard
```

`zone_pause_added`, `zone_pause_updated` et `zone_pause_removed` décrivent les changements individuels de raison et incluent `pause_id` lorsqu’elle est identifiée. Répéter exactement une action identifiée n’émet aucun événement. Les anciennes raisons et les raisons manuelles omettent l’identifiant.

```yaml
domain: velair
event: zone_pause_added
entity_id: climate.guest_room
started_at: "2026-07-09T12:00:00+02:00"
until: null
action: turn_off
pause_id: velair_window_guard
```

```yaml
domain: velair
event: zone_pause_updated
entity_id: climate.guest_room
started_at: "2026-07-09T12:00:00+02:00"
until: "2026-07-09T18:00:00+02:00"
action: turn_off
pause_id: velair_window_guard
```

```yaml
domain: velair
event: zone_pause_removed
entity_id: climate.guest_room
started_at: "2026-07-09T12:00:00+02:00"
until: "2026-07-09T18:00:00+02:00"
action: turn_off
pause_id: velair_window_guard
reason: expired
```

<a id="zone-resumed"></a>
## Zone relancée

`zone_resumed` est émis uniquement lorsque la dernière raison est supprimée manuellement ou expire. Si la programmation actuelle est réappliquée, un événement ultérieur `climate_target_applied` décrit cette consigne.

```yaml
domain: velair
event: zone_resumed
entity_id: climate.guest_room
started_at: "2026-07-09T12:00:00+02:00"
until: "2026-07-12T18:00:00+02:00"
action: turn_off
pause_id: velair_window_guard
reason: expired
```

<a id="operations-without-runtime-events"></a>
## Opérations sans événements d’exécution

Créer des modèles, changer les préférences du panneau, importer des données et réinitialiser les réglages modifient la configuration sans émettre d’événements d’automatisation à l’exécution. Les modifications de programmation n’ont pas d’événement de configuration dédié, mais peuvent produire des événements d’annulation ou de mise à jour de plan, ou `climate_target_applied` lorsqu’elles changent la consigne active.

<a id="delivery-meaning"></a>
## Ce que signifie une transmission

Un événement d’application est émis seulement après l’acceptation par Home Assistant de la séquence complète d’appels de mode, de consigne et d’options prises en charge pour l’intention actuelle de Velair. Les tentatives échouées ou remplacées par une intention plus récente ne l’émettent pas. L’événement confirme l’acceptation de la commande, sans affirmer que l’appareil physique a déjà atteint la température ou l’état HVAC demandé.
