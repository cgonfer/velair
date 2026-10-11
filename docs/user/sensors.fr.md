<a id="velair-sensor-reference"></a>
# Référence des capteurs Velair
<!-- velair-docs:start -->
Traductions: [Original en anglais](sensors.md) · [Español](sensors.es.md) · [Français](sensors.fr.md) · [Deutsch](sensors.de.md) · [Italiano](sensors.it.md) · [Nederlands](sensors.nl.md) · [Polski](sensors.pl.md) · [Português (Brasil)](sensors.pt-br.md) · [Português (Portugal)](sensors.pt-pt.md) · [Русский](sensors.ru.md) · [État des traductions](../translation-status.md)

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

Velair crée des entités Home Assistant pour que les tableaux de bord et automatisations puissent lire le contexte actuel du planificateur, du confort, de la transmission des commandes et de chaque équipement climatique sans ouvrir le panneau Velair.

Les ID d’entité indiqués ici sont des exemples. Home Assistant peut ajouter des suffixes ou permettre de renommer les entités : utilisez donc les ID réels de votre registre d’entités.

<a id="quick-guide"></a>
## Guide rapide

| Entité | Créée pour | Usage conseillé |
| --- | --- | --- |
| **Prochain événement programmé** | Intégration Velair | Afficher la prochaine action prévue par Velair. |
| **État du programmateur** | Intégration Velair | Vérifier si la programmation est inactive, programmée, en pause ou sous dérogation. |
| **État du diagnostic** | Intégration Velair | Alerter sur le bon fonctionnement de Velair à l’exécution. |
| **Température cible active** | Chaque équipement climatique géré | Afficher la cible actuelle contrôlée par Velair. |
| **Conditions ambiantes** | Chaque équipement climatique géré | Lire l’état du Confort, la qualité des données, les mesures dérivées et le contexte extérieur. |
| **Possibilité de ventilation** | Chaque équipement climatique géré | Automatiser ou afficher des possibilités prudentes d’ouverture des fenêtres. |
| **Qualité de l’air** | Chaque équipement climatique géré | Afficher l’évaluation du CO2 indépendamment du Confort thermique. |
| **Dérogation de zone** | Chaque équipement climatique géré | Afficher les Forçages ou pauses actifs. |
| **Contrôle de zone** | Chaque équipement climatique géré | Savoir qui contrôle l’équipement : Velair, un réglage manuel ou l’exécution externe. |
| **Diagnostic de livraison de zone** | Chaque équipement climatique géré, désactivé par défaut | Dépanner ou automatiser selon le dernier résultat de transmission locale. |
| **Début du préconditionnement** | Chaque équipement climatique géré | Afficher quand le préconditionnement adaptatif prévoit de commencer en avance. |
| **Room Assist** | Chaque équipement climatique géré | Afficher l’état d’exécution de Room Assist et le contexte de la cible appliquée. |

Velair crée aussi des entités modifiables telles que **Programmation automatique** et **Mode**. Ce sont des commandes plutôt que des capteurs ; consultez le [guide d’utilisation](usage.fr.md#home-assistant-entities).

<a id="global-sensors"></a>
## Capteurs globaux

<a id="next-climate-event"></a>
### Prochain événement climatique

Exemple d’ID d’entité :

```text
sensor.velair_next_scheduled_event
```

Attributs principaux :

| Attribut | Signification |
| --- | --- |
| `entity_id` | Entité climatique du premier événement à cette heure. |
| `action` | `set_temperature`, `set_hvac_mode` ou `turn_off`. |
| `hvac_mode` | Mode HVAC prévu par Velair, lorsqu’il s’applique. |
| `temperature` | Cible scalaire, lorsqu’elle s’applique. |
| `target_temp_low` / `target_temp_high` | Cible sous forme de plage, lorsqu’elle s’applique. |
| `weekday` / `start` | Source du bloc horaire. |
| `when` | Heure réelle d’application. |
| `target_when` | Heure de confort initialement prévue lorsque le préconditionnement démarre en avance. |
| `event_count` | Nombre d’événements partageant la même heure d’application. |
| `events` | Liste sérialisée de tous les événements partageant la même heure d’application. |

Exemple :

```yaml
{{ state_attr('sensor.velair_next_scheduled_event', 'action') == 'turn_off' }}
```

<a id="current-schedule-state"></a>
### État actuel de la programmation

Exemple d’ID d’entité :

```text
sensor.velair_current_schedule_state
```

États :

```text
paused
override_active
scheduled
idle
temperature_migration_required
```

Attributs principaux :

| Attribut | Signification |
| --- | --- |
| `global_mode` | Mode global actuel du planificateur. |
| `paused_started_at` | Début de la pause globale, le cas échéant. |
| `paused_until` | Expiration prévue de la pause globale, le cas échéant. |

<a id="diagnostics-status"></a>
### État du diagnostic

Exemple d’ID d’entité :

```text
sensor.velair_diagnostics_status
```

États :

```text
ok
warning
error
```

Attributs principaux :

| Attribut | Signification |
| --- | --- |
| `scheduler_mode` / `scheduler_status` | Contexte compact du planificateur. |
| `units_ok` / `units_warning` / `units_error` | Nombre d’équipements selon leur état de fonctionnement. |
| `issue_count` | Nombre total de problèmes actifs à l’exécution. |
| `warning_count` / `error_count` | Nombre de problèmes actifs par gravité. |
| `issue_codes` | Codes stables des problèmes, adaptés aux automatisations. |

Exemple de déclencheur :

```yaml
triggers:
  - trigger: state
    entity_id: sensor.velair_diagnostics_status
    to: error
```

<a id="per-climate-sensors"></a>
## Capteurs par équipement climatique

Pour un équipement géré tel que `climate.living_room`, Home Assistant crée normalement des ID liés tels que `sensor.velair_control_living_room`. Utilisez les ID réels de votre registre dans les tableaux de bord et automatisations.

<a id="zone-active-target-temperature"></a>
### Température cible active de la zone

Attributs principaux :

| Attribut | Signification |
| --- | --- |
| `action` | Action de la cible Velair active. |
| `hvac_mode` | Mode HVAC choisi par le bloc ou la dérogation active. |
| `temperature` | Cible scalaire active. |
| `target_temp_low` / `target_temp_high` | Plage cible active pour les modes à plage native. |
| `weekday` / `start` | Source programmée du bloc actif. |
| `when` | Heure d’application de la cible active. |
| `target_when` | Heure cible de confort lorsque le préconditionnement a avancé l’application. |

Pour les cibles sous forme de plage native, l’état du capteur est indisponible car il n’existe pas de valeur scalaire unique correcte. Lisez plutôt `target_temp_low` et `target_temp_high`.

<a id="zone-environmental-condition"></a>
### Conditions ambiantes de la zone

États :

```text
monitoring_off
no_readings
temperature_comfortable
humidity_comfortable
comfortable
cold
hot
dry
humid
cold_and_dry
cold_and_humid
hot_and_dry
hot_and_humid
```

Attributs principaux :

| Attribut | Signification |
| --- | --- |
| `data_quality` | `complete`, `unverified`, `partial`, `stale` ou `unavailable`. |
| `data_issues` | Codes stables des relevés manquants, périmés, invalides ou utilisables sans fraîcheur vérifiée. |
| `range_summary` | Résultat actuel des plages de Confort et mise en relation avec Humidex. |
| `ventilation_opportunity` | Données complètes sur la possibilité de ventilation. |
| `comfort_zone` | Modèle de Confort choisi et plage d’humidité effective. |
| `temperature_source` / `humidity_source` | Entités sources des relevés intérieurs. |
| `derived_metrics` | Données activées d’Humidex, de point de rosée et d’humidité absolue. |
| `outdoor` | Comparaison facultative entre intérieur et extérieur. |
| `insights` | Observations ordonnées avec codes stables. |

Exemple :

```yaml
{% set insights =
   state_attr('sensor.velair_climate_living_room_environmental_condition',
              'insights') or [] %}
{{ insights
   | selectattr('code', 'eq', 'ventilation_may_help_cool')
   | list | count > 0 }}
```

Consultez [Confort environnemental](comfort.fr.md) et [Capteurs de contrôle et de transmission des zones](zone-sensors.fr.md#environmental-condition) pour les données complètes du Confort.

<a id="zone-ventilation-opportunity"></a>
### Possibilité de ventilation de la zone

États :

```text
unavailable
no_opportunity
may_help
comfort_possible
trade_off
already_comfortable
```

Attributs principaux :

| Attribut | Signification |
| --- | --- |
| `evaluation_scope` | Indique si Velair a évalué la température, l’humidité ou les deux. |
| `reason` | Code de raison stable exploitable automatiquement. |
| `data_quality` / `data_issues` | Qualité de la comparaison avec l’extérieur. |
| `outdoor_temperature_source` | Entité source de température extérieure. |
| `outdoor_humidity_source` | Entité source d’humidité extérieure, si configurée. |
| `potential_effects` | Effets possibles de l’air extérieur estimés par Velair. |
| `blocked_by` | Conditions empêchant un résultat de possibilité plus affirmatif. |

Exemple :

```yaml
{{ is_state('sensor.velair_ventilation_opportunity_living_room',
            'comfort_possible') }}
```

Ce capteur est uniquement observationnel. Velair n’ouvre jamais de fenêtres et ne change pas le contrôle climatique selon ce capteur.

<a id="zone-air-quality"></a>
### Qualité de l’air de la zone

États :

```text
not_monitored
unavailable
good
elevated
poor
```

Attributs principaux :

| Attribut | Signification |
| --- | --- |
| `availability` | Disponibilité actuelle du relevé de CO2. |
| `co2_source` | Capteur de CO2 utilisé pour l’évaluation. |

<a id="zone-override-state"></a>
### État de dérogation de la zone

États :

```text
none
boost
paused
disabled
```

Attributs principaux :

| Attribut | Signification |
| --- | --- |
| `started_at` | Début de la dérogation active. |
| `until` | Expiration prévue de la dérogation, le cas échéant. |
| `action` | Action de dérogation, le cas échéant. |
| `pause_id` | Identifiant de la pause active lorsqu’il n’y en a qu’une. |
| `pause_count` / `pause_ids` | Contexte compact des pauses multiples. |
| `manual` | Indique si la pause est un réglage manuel. |

Utilisez ce capteur pour l’état du Forçage et des pauses. Utilisez **Contrôle de zone** pour savoir qui contrôle l’équipement, automatiquement, manuellement ou en externe.

<a id="zone-control"></a>
### Contrôle de zone

États :

```text
automatic
manual
external
```

Attributs principaux :

| Attribut | Signification |
| --- | --- |
| `runtime_state` | `idle`, `scheduled`, `preconditioning`, `boost`, `paused`, `stopped`, `externally_managed` ou `temperature_migration_required`. |
| `schedule_source` | `default`, `profile` ou `profile_pause`. |
| `profile_id` / `profile_name` | Profil effectif contrôlant la zone, le cas échéant. |
| `mode_id` / `mode_name` | Mode sélectionné, le cas échéant. |
| `manual_source` | `explicit`, `external_change` ou `other`, uniquement en contrôle manuel. |
| `manual_started_at` | Début du réglage manuel. |
| `manual_until` | Expiration prévue du réglage manuel, le cas échéant. |
| `manual_policy` | `until_next_block`, `for_duration` ou `until_resumed`. |

Exemple :

```yaml
{{ is_state('sensor.velair_control_living_room', 'automatic')
   and state_attr('sensor.velair_control_living_room', 'runtime_state')
       == 'scheduled' }}
```

<a id="zone-delivery-diagnostics"></a>
### Diagnostic de livraison de zone

Cette entité de diagnostic est désactivée par défaut. Activez-la depuis le registre d’entités de Home Assistant lorsqu’un tableau de bord ou une automatisation a besoin de preuves de transmission des commandes à l’exécution.

États :

```text
idle
success
failed
retrying
exhausted
invalid_intent
cancelled
unavailable
```

Attributs principaux :

| Attribut | Signification |
| --- | --- |
| `updated_at` | Dernière mise à jour de l’état de transmission. |
| `retry_count` | Tentative représentée par l’état actuel. |
| `last_error_at` / `last_error_code` | Dernière erreur de transmission expurgée des détails sensibles. |
| `last_accepted_at` | Dernière acceptation par Home Assistant d’une séquence complète de services Velair. |
| `last_accepted_source` | `automatic`, `manual`, `boost` ou `automatic_reassertion`. |
| `last_accepted_action` | `set_temperature`, `set_hvac_mode`, `turn_off` ou `other`. |
| `last_accepted_hvac_mode` | Mode HVAC accepté par Home Assistant. |
| `last_accepted_temperature_unit` | Unité enregistrée avec la cible acceptée. |
| `last_accepted_temperature` | Cible scalaire acceptée, le cas échéant. |
| `last_accepted_target_temp_low` / `last_accepted_target_temp_high` | Plage cible acceptée, le cas échéant. |

Exemple :

```yaml
triggers:
  - trigger: state
    entity_id: sensor.velair_delivery_diagnostics_living_room
    to: exhausted
```

`success` signifie que Home Assistant a accepté la séquence de services. Cela ne prouve pas que l’appareil physique a atteint la cible.

<a id="zone-preconditioning-start"></a>
### Début du préconditionnement de la zone

Attributs principaux :

| Attribut | Signification |
| --- | --- |
| `status` | `planned` ou `active`. |
| `scheduled_for` | Heure de confort initiale du bloc. |
| `lead_minutes` | Nombre de minutes d’avance donné au début par Velair. |
| `direction` | Sens de chauffage ou de refroidissement. |
| `target_kind` / `target_boundary` | Contexte de prédiction d’une cible scalaire ou d’une limite de plage. |
| `boundary_temperature` | Limite utilisée pour la prédiction. |
| `model_source` | Source de prédiction choisie par Velair. |
| `target_temperature` | Cible scalaire, le cas échéant. |
| `target_temp_low` / `target_temp_high` | Plage cible, le cas échéant. |
| `hvac_mode` | Mode HVAC utilisé par l’événement de préconditionnement. |

<a id="zone-room-assist-state"></a>
### État Room Assist de la zone

États :

```text
unavailable
not_configured
disabled
blocked
idle
holding
assisting
ready
```

Attributs principaux :

| Attribut | Signification |
| --- | --- |
| `room_temperature_entity_id` | Capteur source de la pièce. |
| `target_temperature` | Cible visible de la programmation ou de la dérogation. |
| `applied_temperature` | Cible appliquée par Room Assist à l’équipement. |
| `applied_offset` | Décalage actuellement appliqué. |
| `calculated_temperature` | Cible calculée avant application des limites. |
| `assist_delta` | Écart d’assistance actif lorsqu’il est supérieur à zéro. |
| `scheduled_target_guard` | Protection empêchant les changements de cible dangereux. |
| `hysteresis_phase` / `hysteresis_target` | Phase d’exécution de la bande de maintien. |
| `deadband_low` / `deadband_high` | Bande de maintien effective. |
| `target_temp_low` / `target_temp_high` | Plage cible native visible. |
| `applied_target_temp_low` / `applied_target_temp_high` | Plage native envoyée après assistance. |
| `climate_target_temp_low` / `climate_target_temp_high` | Plage native actuellement rapportée par l’équipement. |
| `range_shift` | Décalage actuel de la plage, le cas échéant. |
| `direction` | Sens de chauffage ou de refroidissement. |
| `hvac_mode` | Mode HVAC concerné par la cible assistée. |
| `active_from` / `target_when` | Contexte temporel du bloc assisté. |

<a id="choosing-the-right-surface"></a>
## Choisir la bonne source d’information

| Question | Utilisez |
| --- | --- |
| Que prévoit Velair ensuite ? | **Prochain événement programmé** |
| Velair est-il globalement en pause ou programmé ? | **État du programmateur** |
| Velair fonctionne-t-il correctement ? | **État du diagnostic** |
| Quelle cible Velair contrôle-t-il actuellement ? | **Température cible active** |
| La pièce est-elle confortable, ou les relevés sont-ils périmés ou manquants ? | **Conditions ambiantes** |
| L’air extérieur pourrait-il aider ? | **Possibilité de ventilation** |
| Le niveau de CO2 est-il bon ou mauvais ? | **Qualité de l’air** |
| Cet équipement est-il sous Forçage ou en pause ? | **Dérogation de zone** |
| Qui contrôle cet équipement actuellement ? | **Contrôle de zone** |
| Home Assistant a-t-il accepté la dernière commande Velair ? | **Diagnostic de livraison de zone** |
| Quand commencera le préconditionnement ? | **Début du préconditionnement** |
| Qu’applique Room Assist ? | **Room Assist** |

Les événements conviennent mieux lorsqu’une automatisation doit réagir à une transition et savoir ce qui a changé. Les capteurs conviennent mieux lorsqu’un tableau de bord ou une automatisation a besoin de l’état actuel, y compris après un redémarrage.
