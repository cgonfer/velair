<a id="installation"></a>
# Installation

<!-- velair-docs:start -->
Traductions: [Original en anglais](installation.md) · [Español](installation.es.md) · [Français](installation.fr.md) · [Deutsch](installation.de.md) · [Italiano](installation.it.md) · [Nederlands](installation.nl.md) · [Polski](installation.pl.md) · [Português (Brasil)](installation.pt-br.md) · [Português (Portugal)](installation.pt-pt.md) · [Русский](installation.ru.md) · [État des traductions](../translation-status.md)

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

Velair est disponible dans le catalogue HACS par défaut. L’installation manuelle reste
possible pour les utilisateurs qui n’utilisent pas HACS ou souhaitent tester une compilation particulière.

<a id="hacs"></a>
## HACS

1. Ouvrez HACS.
2. Recherchez **Velair** dans les intégrations disponibles.
3. Ouvrez Velair et sélectionnez **Télécharger**.
4. Redémarrez Home Assistant.
5. Accédez à **Paramètres > Appareils et services**.
6. Ajoutez l’intégration Velair.
7. Sélectionnez les entités `climate.*` que Velair peut gérer.

Velair utilise l’unité de température sélectionnée dans Home Assistant. Une nouvelle installation
crée les programmations, modèles, seuils de confort, réglages Room Assist et valeurs par défaut du
préconditionnement adaptatif pour cette unité. L’unité est affichée en lecture seule dans les
paramètres de Velair et doit être modifiée dans Home Assistant, pas dans Velair.

Les installations existantes provenant d’une version publiée de Velair limitée au Celsius
peuvent nécessiter une réinitialisation lorsque Home Assistant utilise le Fahrenheit. Consultez
[Unités de température et migration](temperature-units.fr.md) avant de continuer afin de pouvoir
exporter d’abord une copie de référence si nécessaire.

<a id="manual-installation"></a>
## Installation manuelle

L’installation manuelle n’est normalement nécessaire que si vous n’utilisez pas HACS ou souhaitez tester une compilation provenant de GitHub Actions ou de GitHub Release.

Les fichiers de version incluent `velair-custom-component-<version>.zip`. Extrayez-le pour obtenir ce dossier :

```text
<home_assistant_config>/custom_components/velair
```

Pour une copie du dépôt, copiez :

```text
custom_components/velair
```

vers :

```text
<home_assistant_config>/custom_components/velair
```

Redémarrez Home Assistant et ajoutez Velair depuis **Paramètres > Appareils et services**.

<a id="github-actions-artifacts"></a>
## Artefacts GitHub Actions

Chaque exécution réussie de l’intégration continue publie des artefacts temporaires :

- `velair-custom-component` : le dossier `custom_components/velair` complet, avec le bundle frontend généré par cette exécution.
- `velair-lovelace-resource` : les fichiers `velair-card.js` compilés pour les tests manuels avancés de la ressource Lovelace.

Les exécutions correspondant à une version publiée joignent également des fichiers ZIP à la GitHub Release. Privilégiez HACS pour une utilisation normale ; utilisez ces artefacts pour tester une exécution précise du workflow ou installer manuellement.

<a id="optional-lovelace-card"></a>
## Carte Lovelace facultative

Le panneau de la barre latérale est enregistré automatiquement. La carte Lovelace est facultative. Si les ressources des tableaux de bord sont gérées dans l’interface de Home Assistant, Velair enregistre automatiquement son module JavaScript à la configuration de l’intégration, y compris après mise à jour d’une installation existante. Vous pouvez le vérifier dans **Paramètres > Tableaux de bord > Ressources** (menu à trois points). Aucun ajout manuel de ressource n’est nécessaire dans ce mode ; ajoutez directement vos cartes.

L’URL est `/velair_frontend/velair-card.js?v=...`. Velair actualise le paramètre de version lorsque le bundle installé change ; ne le modifiez pas manuellement. Après installation ou mise à jour, redémarrez Home Assistant et rechargez le navigateur ou l’application compagnon. Les cartes doivent fonctionner en ouvrant directement le tableau de bord, sans passer d’abord par Velair dans la barre latérale.

Ajoutez une ou plusieurs cartes Velair. Elles utilisent les mêmes données backend et composants visuels que le panneau latéral.

```yaml
type: custom:velair-card
view: overview-status
```

Valeurs `view` prises en charge :

- `climate` : état et commandes d’un appareil de chauffage ou de climatisation géré, avec une action facultative de retour ponctuel du logement à côté de Forçage et Pause. Les cartes existantes conservent cette action masquée ; les configurations des nouvelles cartes créées avec le sélecteur l’activent.
- `overview-status` : état du planificateur et commandes de pause/arrêt/reprise.
- `overview-boosts` : forçages actifs.
- `overview-events` : prochains événements.
- `overview-timeline` : chronologie du jour.
- `overview-zones` : vue d’ensemble des zones.
- `active-setup` : mode et profils actuels, avec commandes facultatives.
- `schedules` : éditeur complet de programmation.
- `sensors` : configuration Room Assist et état en direct.
- `comfort` : configuration et état du confort environnemental.
- `preconditioning` : configuration du préconditionnement adaptatif et état de l’apprentissage local.
- `planned-return` : commandes compactes de retour ponctuel, compteurs des sources d’occupation configurées et chronologie du départ confirmé. Sans sources d’occupation enregistrées, Plan return applique immédiatement le mode absence ; la routine hebdomadaire automatique nécessite toujours des sources.
- `diagnostics` : état du fonctionnement, historique limité, filtres et export de rapports de problème.

<a id="resources-managed-in-yaml"></a>
### Ressources gérées en YAML

Si votre configuration utilise `lovelace.resource_mode: yaml`, Velair vous laisse gérer la liste des ressources. Ajoutez ceci à votre configuration `lovelace` existante :

```yaml
lovelace:
  resource_mode: yaml
  resources:
    - url: /velair_frontend/velair-card.js
      type: module
```

L’URL stable sans paramètre de version reste prise en charge ; aucune valeur de version n’est à maintenir en YAML. Conservez vos autres ressources. Écrire une carte ou un tableau de bord en YAML ne sélectionne pas à lui seul la gestion des ressources en YAML.

<a id="card-discovery-and-resource-troubleshooting"></a>
### Découverte des cartes et dépannage des ressources

Utilisez uniquement le module `/velair_frontend/velair-card.js` servi par l’intégration, avec son paramètre automatique de version pour les ressources gérées dans l’interface. Velair migre l’ancienne entrée exacte `/local/velair-card.js` et consolide les doublons de ces deux chemins locaux. Les autres chemins et URL externes restent inchangés. Pour les ressources YAML, supprimez vous-même les anciennes entrées ou doublons, redémarrez Home Assistant et rechargez le navigateur. Les éléments personnalisés ne peuvent être remplacés après enregistrement ; une ancienne ressource chargée en premier peut laisser une carte obsolète.

Si une ressource nécessite une intervention en mode YAML ou si l’enregistrement automatique échoue, consultez les instructions de Velair dans les journaux de Home Assistant. Ces contrôles ne créent pas de notifications persistantes.

Le sélecteur de cartes du tableau de bord découvre Velair via les métadonnées frontend. Ajouter manuellement `type: custom:velair-card` en YAML utilise l’élément personnalisé enregistré ; ce sont deux vérifications distinctes. Si la carte fonctionne en YAML mais n’apparaît pas dans le sélecteur, précisez cette distinction dans le signalement.

Si la découverte diffère entre ordinateur et mobile, recherchez les erreurs JavaScript dans la console de développement du navigateur concerné et la requête de ressource dans son onglet Réseau. Indiquez les versions de Home Assistant et Velair, le navigateur concerné, l’URL exacte de ressource et les erreurs pertinentes. Retirez les informations privées avant de partager les journaux. Un chargement réussi dans un autre navigateur n’établit pas la cause de l’échec dans le navigateur concerné.

<a id="updating"></a>
## Mise à jour

Après avoir mis à jour Velair :

1. Redémarrez Home Assistant.
2. Effectuez une actualisation complète du navigateur ou rechargez l’application compagnon Home Assistant.
3. Vérifiez que la section de maintenance des paramètres affiche la version attendue de l’intégration.
