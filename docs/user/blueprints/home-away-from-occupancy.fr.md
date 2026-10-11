<a id="home-and-away-from-occupancy"></a>
# Présence et absence selon l’occupation
<!-- velair-docs:start -->
Traductions: [Original en anglais](home-away-from-occupancy.md) · [Español](home-away-from-occupancy.es.md) · [Français](home-away-from-occupancy.fr.md) · [Deutsch](home-away-from-occupancy.de.md) · [Italiano](home-away-from-occupancy.it.md) · [Nederlands](home-away-from-occupancy.nl.md) · [Polski](home-away-from-occupancy.pl.md) · [Português (Brasil)](home-away-from-occupancy.pt-br.md) · [Português (Portugal)](home-away-from-occupancy.pt-pt.md) · [Русский](home-away-from-occupancy.ru.md) · [État des traductions](../../translation-status.md)

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

Exécutez les actions Home Assistant de votre choix lorsqu’une entité unique regroupant l’occupation du foyer indique qu’il est occupé ou vide. La logique de présence propre aux personnes, aux invités et au foyer reste ainsi dans Home Assistant, tout en simplifiant la configuration des changements courants de Mode et de Profil Velair. Une notification différée explique quand l’entité ne permet pas de prendre une décision fiable de présence ou d’absence.

<p>
  <a href="https://my.home-assistant.io/redirect/blueprint_import/?blueprint_url=https%3A%2F%2Fraw.githubusercontent.com%2Fcgonfer%2Fvelair%2Fmain%2Fblueprints%2Fautomation%2Fvelair%2Foccupancy_home_away.yaml"><img src="https://my.home-assistant.io/badges/blueprint_import.svg" alt="Ouvrir Home Assistant et importer le blueprint Présence et absence selon l’occupation" height="28"></a>
  <a href="https://raw.githubusercontent.com/cgonfer/velair/main/blueprints/automation/velair/occupancy_home_away.yaml"><img src="https://img.shields.io/badge/YAML_source-View-24292F?style=for-the-badge&amp;logo=github&amp;logoColor=white" alt="Voir la source YAML de Présence et absence selon l’occupation"></a>
</p>

[Voir le journal des modifications](../../../blueprints/changelogs/occupancy_home_away.md) · [Revenir à l’index des blueprints](../blueprints.fr.md)

<a id="when-to-use-it"></a>
## Quand l’utiliser

Utilisez ce blueprint lorsque Home Assistant possède déjà une entité représentant l’occupation du logement. Il convient aux changements de présence, d’absence ou similaires pour lesquels les actions finales doivent être retardées et vérifiées de nouveau avant exécution.

<a id="requirements"></a>
## Prérequis

- Version 1.0.0 du blueprint et Home Assistant 2024.6.0 ou ultérieur.
- Un `binary_sensor` ou `input_boolean` avec `on`/`off`, ou un groupe de personnes avec `home`/`not_home`.
- Velair est requis uniquement lorsque les actions configurées utilisent ses Modes, Profils, entités ou services. Sinon, le blueprint peut exécuter des actions Home Assistant standard sans Velair.

Construisez les règles de personnes, d’invités, de zones et de présence dans Home Assistant avant de sélectionner ici l’entité résultante. Un groupe de personnes peut représenter la présence à `home` d’au moins une personne suivie ; un capteur binaire basé sur un modèle de texte peut aussi intégrer un assistant pour les invités ou d’autres exceptions du foyer. Le blueprint accepte `on`/`off` et `home`/`not_home` plutôt que de recréer cette décision.

<a id="configuration"></a>
## Configuration

- **Consolidated occupancy state** : l’entité unique qui représente déjà l’occupation de tout le logement.
- **When occupied** : une ou plusieurs actions Home Assistant standard.
- **When empty** : une ou plusieurs actions Home Assistant standard.
- **Occupied delay** : durée pendant laquelle l’entité doit rester `on` ou `home`.
- **Empty delay** : durée pendant laquelle l’entité doit rester `off` ou `not_home`.
- **Availability warning delay** : durée pendant laquelle `unknown` ou `unavailable` doit persister avant que Home Assistant crée une notification de diagnostic. La valeur par défaut est de 5 minutes.

<a id="example"></a>
## Exemple

Pour l’action de présence, ajoutez **Select: Select**, choisissez l’entité Mode Velair visible proposée par Home Assistant et sélectionnez `Home`. Configurez l’action d’absence de la même manière avec `Away`. Sélectionnez l’entité dans l’interface plutôt que de supposer un ID particulier.

Les actions générées équivalent à :

```yaml
action: select.select_option
target:
  entity_id: select.velair_mode
data:
  option: Home
```

Pour activer plutôt un Profil directement :

```yaml
action: velair.activate_profile
data:
  profile_id: home
```

Les Modes sont généralement plus clairs pour les choix Présence, Absence et Vacances, car l’état actuel reste visible via le sélecteur de Mode Velair de Home Assistant.

<a id="how-it-works"></a>
## Fonctionnement

Les déclencheurs des états occupé (`on`/`home`) et vide (`off`/`not_home`) utilisent les durées natives `for` de Home Assistant : l’état doit donc rester continu pendant tout le délai. Des déclencheurs de disponibilité distincts, basés sur des modèles de texte, détectent un état `unknown`/`unavailable` prolongé et le retour à un état pris en charge. Home Assistant crée une notification persistante propre à l’automatisation après le délai d’avertissement, la met à jour au lieu de la dupliquer et la supprime après récupération. Les actions de présence et d’absence ne s’exécutent pas si l’entité n’a pas d’état valide.

Au démarrage, les vérifications d’occupation, d’absence et de disponibilité s’exécutent dans des branches internes parallèles. Chacune vérifie son état initial, attend de manière interruptible l’état opposé jusqu’au délai configuré, continue uniquement après expiration du délai et vérifie de nouveau avant d’agir. Le mode parallèle limité de l’automatisation empêche une attente de disponibilité au démarrage de bloquer une transition ultérieure valide d’occupation. Il n’y a pas d’interrogation périodique.

<a id="safety-and-precedence"></a>
## Sécurité et priorités

Le blueprint exécute uniquement les actions que vous configurez. Les priorités existantes de Velair pour les Modes, Profils, Forçages et pauses continuent de s’appliquer. Une entité d’occupation `unknown` ou `unavailable` n’active ni Présence ni Absence ; l’avertissement identifie l’entité et explique que les actions restent suspendues jusqu’à ce qu’elle signale un état d’occupation ou d’absence pris en charge.

<a id="limitations"></a>
## Limites

- Le blueprint accepte volontairement une seule entité d’occupation déjà consolidée ; il ne combine pas lui-même les personnes ou les règles d’invités.
- Les temporisations `for` de Home Assistant ne survivent pas au redémarrage ; le chemin de démarrage recommence donc le délai configuré.
- L’ID de notification utilise l’ID d’entité de l’automatisation. Renommer celle-ci peut laisser son ancienne notification à fermer manuellement.
- L’exécution parallèle est limitée à 20 exécutions et avertit si une rafale anormale d’événements remplit tous les emplacements.
- Les actions créées avec **Take control** ne reçoivent plus automatiquement les mises à jour du blueprint.

<a id="troubleshooting"></a>
## Dépannage

- Si aucune branche ne s’exécute, vérifiez que l’entité sélectionnée indique `on`/`home` ou `off`/`not_home`.
- Si un avertissement apparaît, inspectez l’entité d’occupation indiquée et son groupe source, son modèle de texte, ses personnes ou son assistant d’invités.
- Si Absence s’active trop vite, augmentez le délai d’absence.
- Si le Mode attendu n’est pas sélectionné, exécutez manuellement l’action choisie dans Home Assistant et vérifiez le nom de l’option.
- Si une action de Profil échoue, utilisez l’ID stable du Profil plutôt que son nom d’affichage modifiable.

<a id="updating-and-customizing"></a>
## Mise à jour et personnalisation

Réimportez l’URL évolutive de `main` pour installer une mise à jour compatible. Les mises à jour de version 1 conservent les noms des entrées existantes et toute nouvelle entrée possède une valeur par défaut : aucune migration d’automatisation n’est nécessaire. Une future version incompatible utilisera un nouveau nom de fichier et une nouvelle version majeure au lieu de remplacer cette URL. Velair ne modifie jamais les automatisations Home Assistant ni `.storage` pour migrer un blueprint. Utilisez **Take control** uniquement si l’installation nécessite une logique impossible à exprimer avec les entrées proposées ; l’automatisation indépendante cesse alors de recevoir les mises à jour du blueprint.
