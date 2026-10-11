<a id="documentation"></a>
# Documentation
<!-- velair-docs:start -->
Traductions: [Original en anglais](README.md) · [Español](README.es.md) · [Français](README.fr.md) · [Deutsch](README.de.md) · [Italiano](README.it.md) · [Nederlands](README.nl.md) · [Polski](README.pl.md) · [Português (Brasil)](README.pt-br.md) · [Português (Portugal)](README.pt-pt.md) · [Русский](README.ru.md) · [État des traductions](translation-status.md)

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

La documentation de Velair est organisée par public et par sujet.

<a id="user-documentation"></a>
## Documentation utilisateur

- [Installation](user/installation.fr.md) : installer Velair avec HACS ou manuellement.
- [Utilisation](user/usage.fr.md) : configurer les appareils de chauffage ou de climatisation, programmations, modèles, profils, forçages, pauses, importations/exportations et services.
- [Navigation du panneau et liens directs](user/usage.fr.md#panel-navigation-and-direct-links) : créer des liens vers les onglets et sous-sections, retrouver la section après une actualisation et utiliser l’historique du navigateur.
- [Modifications externes et réglage manuel](user/manual-control.fr.md) : choisir si Velair conserve le contrôle automatique ou laisse la priorité aux modifications provenant des cartes HA, télécommandes, appareils et automatisations.
- [Exécution externe des programmations](user/external-systems.fr.md) : publier des programmations hebdomadaires effectives compatibles, y compris la sélection des profils et modes, vers des contrôleurs pris en charge sans mélanger la logique des fournisseurs au planificateur de Velair.
- [Profils climatiques](user/climate-profiles.fr.md) : coordonner des programmations alternatives et exposer des modes configurables aux automatisations Home Assistant.
- [Préréglages climatiques et modèles liés](user/linked-schedules.fr.md) : réutiliser les réglages climatiques et partager les horaires quotidiens ou les programmations quotidiennes complètes entre les programmations par défaut et celles des profils.
- [Exemples de préréglages et modèles](user/linked-schedule-examples.fr.md) : configurations de logement pas à pas, programmations saisonnières, copies, modifications partagées et dépannage.
- [Automatisations des préréglages](user/preset-automations.fr.md) : actualiser les consignes partagées et les réglages des appareils depuis des scripts, avec des exemples basés sur la température extérieure et le remplacement explicite.
- [Événements d’automatisation](user/automation-events.fr.md) : utiliser le contenu complet des événements d’exécution dans les automatisations Home Assistant.
- [Blueprints d’automatisation](user/blueprints.fr.md) : importer des outils facultatifs pour l’occupation, les fenêtres ouvertes et les températures saisonnières, sans interrogation périodique.
- [Sélection climatique saisonnière](user/blueprints/seasonal-climate-selection.fr.md) : sélectionner des modes ou d’autres actions à partir de changements de température stables, avec des notifications de diagnostic immédiates.
- [Préconditionnement adaptatif](user/adaptive-preconditioning.fr.md) : anticiper les consignes de confort programmées grâce à l’apprentissage local.
- [Retour prévu](user/planned-return.fr.md) : configurer l’absence pilotée par l’occupation et les arrivées hebdomadaires ou ponctuelles, avec des exemples d’annulation avant et après confirmation du départ.
- [Room Assist](user/room-assist.fr.md) : utiliser un capteur de température ambiante distinct pour les têtes thermostatiques, thermostats et climatiseurs.
- [Transmission climatique résiliente](user/resilient-climate-delivery.fr.md) : comprendre les tentatives différées et le comportement de reconnexion lorsqu’un appareil de chauffage ou de climatisation est temporairement indisponible.
- [Confort environnemental](user/comfort.fr.md) : comprendre la température, l’humidité, la qualité de l’air liée au CO2 et la fraîcheur des mesures grâce aux évaluations locales des pièces.
- [Unités de température et migration](user/temperature-units.fr.md) : comprendre les valeurs par défaut Celsius/Fahrenheit, mises à niveau, migrations, importations/exportations et récupération.
- [Dépannage](user/troubleshooting.fr.md) : problèmes courants de configuration, de ressource frontend et d’exécution.
- [Diagnostic](user/diagnostics.fr.md) : état local du fonctionnement, historique limité et rapports de problème expurgés.
- [Référence des capteurs](user/sensors.fr.md) : consulter tous les capteurs Velair, leurs principaux attributs et des exemples pratiques d’automatisation.
- [Capteurs de contrôle et de transmission des zones](user/zone-sensors.fr.md) : utiliser le contexte de contrôle par appareil de chauffage ou de climatisation et les éléments de preuve de transmission à l’exécution dans les tableaux de bord et automatisations.

<a id="developer-documentation"></a>
## Documentation développeur

- [Architecture](developer/architecture.md) : limites des modules backend et frontend, modèle de persistance et fonctionnement du planificateur.
- [Fonctionnement interne des programmations liées](developer/linked-schedules.md) : préréglages climatiques dynamiques, liens de modèles pour les horaires seuls ou les réglages complets, transactions partagées et programmations résolues.
- [Maintenance des blueprints](developer/blueprints.md) : ajouter le YAML des blueprints, les entrées du catalogue, des pages détaillées cohérentes, des traductions et des tests.
- [API WebSocket](developer/api.md) : contrat d’API entre frontend et backend.
- [Fonctionnement interne du préconditionnement adaptatif](developer/adaptive-preconditioning.md) : états d’apprentissage local, pondération par similarité, stockage et sortie API.
- [Fonctionnement interne de Room Assist](developer/room-assist.md) : choix du capteur ambiant, calcul de la consigne assistée, état d’exécution, restauration et événements.
- [Fonctionnement interne de la transmission des commandes climatiques](developer/climate-delivery.md) : nouvelles tentatives événementielles, rétablissement de la disponibilité, sérialisation, générations et limites de la réussite.
- [Fonctionnement interne du confort environnemental](developer/comfort.md) : choix des sources, évaluation des conditions, qualité des données, écouteurs, sortie API et événements.
- [Fonctionnement interne des unités de température](developer/temperature-units.md) : métadonnées de stockage, limites de migration, conversion portable, validation et sécurité à l’exécution.
- [Frontend](developer/frontend.md) : éléments d’exécution frontend, commandes de build, ressource Lovelace, traductions, principes d’interface et processus de travail frontend.
- [Développement](developer/development.md) : vérifications locales, fichiers générés, règles de codage et processus de contribution.
- [Tests manuels](developer/manual-testing.md) : liste de vérification des versions et du comportement.

<a id="project-documentation"></a>
## Documentation du projet

- [Captures d’écran](project/screenshots.md) : captures réelles.

Les idées futures et demandes de fonctionnalités doivent être suivies dans les issues ou discussions GitHub afin de pouvoir évoluer avec les retours de la communauté, sans créer de promesses de feuille de route.
