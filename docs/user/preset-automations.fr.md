<a id="update-shared-presets-from-automations"></a>
# Mettre à jour les préréglages partagés depuis des automatisations
<!-- velair-docs:start -->
Traductions: [Original en anglais](preset-automations.md) · [Español](preset-automations.es.md) · [Français](preset-automations.fr.md) · [Deutsch](preset-automations.de.md) · [Italiano](preset-automations.it.md) · [Nederlands](preset-automations.nl.md) · [Polski](preset-automations.pl.md) · [Português (Brasil)](preset-automations.pt-br.md) · [Português (Portugal)](preset-automations.pt-pt.md) · [Русский](preset-automations.ru.md) · [État des traductions](../translation-status.md)

<details>
<summary>État de cette traduction</summary>

| Information | État |
| --- | --- |
| Version de référence | 1.9.0-beta.4 |
| Dernière synchronisation | 2026-10-21 |
| Révision linguistique | Traduction assistée par IA |
| Par rapport à l’original | Synchronisée avec l’original anglais. |

</details>

---
<!-- velair-docs:end -->

Utilisez `velair.update_block_preset` pour modifier un préréglage Velair enregistré depuis une automatisation ou un script Home Assistant. Cela modifie durablement la définition partagée : chaque bloc qui la référence reçoit la nouvelle configuration, y compris les blocs de modèles et les jours suivant la configuration complète de ces modèles.

Cela ne sélectionne pas un autre préréglage pour un bloc et n’active pas de Profil. Utilisez les Profils ou les Modes si l’automatisation doit choisir une autre routine.

<a id="find-the-identifier"></a>
## Trouver l’identifiant

Ouvrez **Modèles → Préréglages climatiques**, sélectionnez un préréglage enregistré et copiez son **ID d’automatisation**. Utilisez cette valeur comme `preset_key` ; renommer le préréglage ne change pas son identifiant. Les exemples ci-dessous utilisent des identifiants illustratifs. Remplacez-les par vos propres valeurs copiées.

<a id="update-or-replace"></a>
## Mettre à jour ou remplacer

L’opération par défaut `operation: update` change uniquement les champs envoyés et conserve l’action et les autres réglages du préréglage. N’envoyez pas `action` avec cette opération.

`operation: replace` remplace toute la configuration climatique. Envoyez `action` et tous les réglages qui doivent rester. Cela permet de passer d’une action de température à une action de mode uniquement, de réglages supplémentaires uniquement ou d’arrêt. Le nom, l’identifiant et la position du préréglage dans la bibliothèque restent inchangés.

| Champ | Signification |
|---|---|
| `preset_key` | Identifiant obligatoire d’un préréglage Velair existant. |
| `operation` | `update` (par défaut) ou `replace`. |
| `action` | Obligatoire pour `replace`, interdit pour `update`. Utilisez `set_temperature`, `set_hvac_mode`, `set_climate_options` ou `turn_off`. |
| `temperature` | Température cible unique, dans l’unité de température déclarée de Velair. |
| `target_temp_low`, `target_temp_high` | Cible sous forme de plage native ; envoyez toujours les deux limites ensemble. |
| `hvac_mode` | Mode HVAC, selon les règles de l’action sélectionnée. |
| `fan_mode`, `preset_mode`, `swing_mode`, `swing_horizontal_mode`, `humidity` | Réglages facultatifs d’appareil, selon les règles de l’action sélectionnée. |
| `clear_fields` | Uniquement pour `update` : liste de paramètres climatiques à retirer. |

Envoyer une cible scalaire retire une plage précédente ; envoyer une plage complète retire une cible scalaire précédente. N’envoyez jamais les deux dans un même appel. Retirer une cible obligatoire ou le dernier réglage d’un préréglage composé uniquement d’options est invalide. Utilisez `replace` pour changer l’action elle-même.

Omettre un champ dans `update` le conserve. Les chaînes vides et `null` ne sont pas des instructions de suppression ; utilisez `clear_fields`. Un champ ne peut pas être défini et retiré dans le même appel. Retirer un réglage d’appareil arrête l’envoi de cette commande ; cela ne réinitialise pas ce réglage sur le thermostat.

Le formulaire standard d’action de Home Assistant définit les changements à effectuer à chaque exécution de l’automatisation. Il ne charge pas les valeurs actuelles du préréglage dans le formulaire. Les paramètres moins courants sont regroupés dans des sections repliées.

<a id="example-adjust-heating-comfort-to-outdoor-temperature"></a>
## Exemple : adapter le confort de chauffage à la température extérieure

**Situation :** le salon et le bureau utilisent tous deux le préréglage Velair **Confort chauffage**, configuré sur Chauffage à 21 °C avec ventilation silencieuse. Vous voulez 21 °C par temps froid et 19 °C par temps plus doux, tout en conservant le mode et les réglages de ventilation.

Cette automatisation évalue la situation au démarrage de Home Assistant et lors des changements du capteur extérieur. Sous 10 °C, elle fixe 21 °C ; au-dessus de 12 °C, elle fixe 19 °C. Entre ces seuils, elle conserve la cible précédente. L’écart évite des basculements répétés autour d’un seuil unique. Si le capteur est indisponible, elle ne change rien.

```yaml
alias: Velair heating comfort by outdoor temperature
triggers:
  - trigger: homeassistant
    event: start
  - trigger: state
    entity_id: sensor.outdoor_temperature
conditions:
  - condition: template
    value_template: "{{ is_number(states('sensor.outdoor_temperature')) }}"
actions:
  - choose:
      - conditions:
          - condition: numeric_state
            entity_id: sensor.outdoor_temperature
            below: 10
        sequence:
          - action: velair.update_block_preset
            data:
              preset_key: preset_heating_comfort
              temperature: 21
      - conditions:
          - condition: numeric_state
            entity_id: sensor.outdoor_temperature
            above: 12
        sequence:
          - action: velair.update_block_preset
            data:
              preset_key: preset_heating_comfort
              temperature: 19
mode: queued
max: 10
```

L’exemple suppose que Velair et le capteur extérieur utilisent °C. Pour Fahrenheit, choisissez des seuils et cibles équivalents dans les unités appropriées. Le service ne convertit jamais la valeur du capteur extérieur pour cette automatisation.

Les deux pièces conservent leurs propres programmations. Si Confort chauffage est actif et que Velair contrôle automatiquement l’équipement, sa cible change après enregistrement. Si son prochain bloc est futur, Velair recalcule les événements programmés et le plan de préconditionnement. Les appels répétés avec une configuration inchangée n’écrivent pas dans le stockage et n’envoient pas de commandes.

<a id="example-update-a-native-range"></a>
## Exemple : mettre à jour une plage native

**Situation :** un thermostat prenant en charge les plages Chaud/froid utilise **Plage maison**. Modifiez sa cible à 19–25 °C en conservant son mode et ses options d’appareil :

```yaml
action: velair.update_block_preset
data:
  preset_key: preset_home_range
  target_temp_low: 19
  target_temp_high: 25
```

Envoyez les deux limites même si une seule change. Un thermostat limité à une cible scalaire ne peut pas utiliser ce préréglage. Velair ne déduit ni une cible scalaire compatible ni une limite de plage manquante.

<a id="example-change-or-remove-a-device-setting"></a>
## Exemple : changer ou retirer un réglage d’appareil

Pour modifier uniquement le réglage de ventilation tout en conservant la température et le mode HVAC :

```yaml
action: velair.update_block_preset
data:
  preset_key: preset_heating_comfort
  fan_mode: auto
```

Pour cesser d’inclure une commande de ventilation dans ce préréglage :

```yaml
action: velair.update_block_preset
data:
  preset_key: preset_heating_comfort
  clear_fields:
    - fan_mode
```

`preset_mode` désigne un **préréglage d’appareil**, tel que `eco` ou `sleep`. C’est un paramètre du préréglage Velair, pas l’identifiant d’un autre préréglage Velair.

<a id="example-replace-with-off-and-restore-explicitly"></a>
## Exemple : remplacer par un arrêt et restaurer explicitement

Remplacez la configuration d’un préréglage enregistré par un arrêt :

```yaml
action: velair.update_block_preset
data:
  preset_key: preset_heating_comfort
  operation: replace
  action: turn_off
```

Pour restaurer Chauffage à 21 °C avec ventilation silencieuse, remplacez-la explicitement une nouvelle fois :

```yaml
action: velair.update_block_preset
data:
  preset_key: preset_heating_comfort
  operation: replace
  action: set_temperature
  temperature: 21
  hvac_mode: heat
  fan_mode: quiet
```

Il n’y a ni expiration temporisée ni restauration automatique. L’arrêt affecte toutes les références enregistrées à ce préréglage. Pour une fenêtre ouverte ou une suspension temporaire par pièce, préférez une [pause de zone](usage.fr.md#services) avec son propre identifiant, qui laisse le préréglage partagé inchangé.

<a id="validation-and-runtime-behavior"></a>
## Validation et comportement à l’exécution

- Velair valide toutes les utilisations enregistrées, y compris les Profils inactifs et les programmations par défaut masquées par un Profil. Une utilisation incompatible rejette toute la mise à jour ; rien n’est enregistré partiellement.
- Les réglages facultatifs pris en charge peuvent être filtrés par thermostat selon les règles d’adaptation existantes. Les limites de température, la compatibilité des actions et les restrictions des contrôleurs externes restent applicables.
- Le Forçage, la Pause, le réglage manuel et l’Arrêt conservent leur priorité. Mettre à jour un préréglage ne les annule pas. À la reprise du contrôle automatique, Velair utilise les derniers réglages enregistrés.
- Un changement automatique actif s’applique après enregistrement ; un changement uniquement futur n’envoie pas inutilement de commande maintenant. Le préconditionnement et Room Assist sont recalculés lorsque leur cible ou source change. Les actions de mode uniquement, d’options uniquement et d’arrêt n’acquièrent pas d’anticipation de température.
- Les contrôleurs externes reçoivent des programmations hebdomadaires complètes mises à jour lorsque leurs programmations effectives changent. Un échec de publication n’active pas l’exécution locale.
- Les identifiants inconnus, les combinaisons invalides, les utilisations incompatibles et une migration d’unité de température en attente produisent des erreurs. Les échecs de transmission aux appareils après persistance n’annulent pas le préréglage enregistré.

Les seuils environnementaux, l’hystérésis, l’interprétation des prévisions et le moment de restaurer un réglage relèvent des automatisations Home Assistant. Le service ne crée aucune règle météo ni interrogation périodique dans Velair. Le [blueprint de sélection climatique saisonnière](blueprints/seasonal-climate-selection.fr.md) peut sélectionner des Modes ou exécuter ces services une seule fois après que la température est restée dans une nouvelle plage saisonnière pendant le délai configuré. Choisissez les Modes lorsque l’hiver et l’été doivent conserver des définitions de préréglages distinctes ; mettre à jour un préréglage change toutes ses utilisations.

Consultez [Préréglages de blocs et modèles liés](linked-schedules.fr.md) pour la portée des ressources partagées et les [exemples pratiques](linked-schedule-examples.fr.md) pour des configurations complètes du foyer.
