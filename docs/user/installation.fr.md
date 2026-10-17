<a id="installation"></a>
# Installation

<!-- velair-docs:start -->
Traductions: [Original en anglais](installation.md) · [Español](installation.es.md) · [Français](installation.fr.md) · [Deutsch](installation.de.md) · [Italiano](installation.it.md) · [Nederlands](installation.nl.md) · [Polski](installation.pl.md) · [Português (Brasil)](installation.pt-br.md) · [Português (Portugal)](installation.pt-pt.md) · [Русский](installation.ru.md) · [État des traductions](../translation-status.md)

<details>
<summary>État de cette traduction</summary>

| Information | État |
| --- | --- |
| Version de référence | 1.9.0-beta.2 |
| Dernière synchronisation | 2026-10-17 |
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

Le panneau latéral est enregistré automatiquement. La carte Lovelace est facultative.

Ajoutez la ressource servie par l’intégration :

```yaml
url: /velair_frontend/velair-card.js
type: module
```

Ajoutez ensuite une ou plusieurs cartes Velair. Chaque carte utilise les mêmes données backend et composants visuels que le panneau latéral.

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

<a id="card-discovery-and-resource-troubleshooting"></a>
### Découverte des cartes et dépannage des ressources

Utilisez uniquement la ressource module `/velair_frontend/velair-card.js` fournie par l’intégration. Supprimez les ressources Velair en double, y compris une ancienne `/local/velair-card.js`, puis rechargez le navigateur. Les éléments personnalisés du navigateur ne peuvent pas être remplacés après leur enregistrement : une ancienne ressource chargée en premier peut laisser ce navigateur utiliser une implémentation obsolète.

Le sélecteur de cartes du tableau de bord découvre Velair via les métadonnées frontend. Ajouter manuellement `type: custom:velair-card` en YAML utilise l’élément personnalisé enregistré ; ce sont deux vérifications distinctes. Si la carte fonctionne en YAML mais n’apparaît pas dans le sélecteur, précisez cette distinction dans le signalement.

Si la découverte diffère entre ordinateur et mobile, recherchez les erreurs JavaScript dans la console de développement du navigateur concerné et la requête de ressource dans son onglet Réseau. Indiquez les versions de Home Assistant et Velair, le navigateur concerné, l’URL exacte de ressource et les erreurs pertinentes. Retirez les informations privées avant de partager les journaux. Un chargement réussi dans un autre navigateur n’établit pas la cause de l’échec dans le navigateur concerné.

<a id="updating"></a>
## Mise à jour

Après avoir mis à jour Velair :

1. Redémarrez Home Assistant.
2. Effectuez une actualisation complète du navigateur ou rechargez l’application compagnon Home Assistant.
3. Vérifiez que la section de maintenance des paramètres affiche la version attendue de l’intégration.
