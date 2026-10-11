<a id="automation-blueprints"></a>
# Blueprints d’automatisation
<!-- velair-docs:start -->
Traductions: [Original en anglais](blueprints.md) · [Español](blueprints.es.md) · [Français](blueprints.fr.md) · [Deutsch](blueprints.de.md) · [Italiano](blueprints.it.md) · [Nederlands](blueprints.nl.md) · [Polski](blueprints.pl.md) · [Português (Brasil)](blueprints.pt-br.md) · [Português (Portugal)](blueprints.pt-pt.md) · [Русский](blueprints.ru.md) · [État des traductions](../translation-status.md)

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

Velair laisse la présence, les portes, les invités et les conditions propres au logement dans Home Assistant plutôt que de créer un second moteur d’automatisation. Ces blueprints facultatifs offrent des points de départ guidés pour les cas courants, tout en restant entièrement locaux et pilotés par événements.

Importer un blueprint ne modifie pas Velair en soi. Home Assistant ajoute d’abord le blueprint réutilisable ; vous créez et configurez ensuite une automatisation à partir de celui-ci. Les automatisations existantes peuvent recevoir les mises à jour du blueprint en le réimportant, ou vous pouvez utiliser **Prendre le contrôle** pour transformer une automatisation en automatisation Home Assistant indépendante.

Les paquets d’intégration HACS ne copient pas automatiquement les blueprints d’automatisation dans le répertoire des blueprints de Home Assistant. Utilisez les liens d’import ci-dessous.

<a id="available-blueprints"></a>
## Blueprints disponibles

Les blueprints sont présentés dans l’ordre alphabétique de leurs noms anglais.

- [Présence et absence selon l’occupation](#home-and-away-from-occupancy)
- [Mettre une zone en pause tant que les fenêtres sont ouvertes](#pause-a-zone-while-windows-are-open)
- [Sélection climatique saisonnière](#seasonal-climate-selection)

<hr>

<a id="home-and-away-from-occupancy"></a>
### Présence et absence selon l’occupation

Exécutez les actions Home Assistant de votre choix lorsqu’une entité d’occupation consolidée indique une présence ou une absence. Ces actions peuvent sélectionner un mode Velair, activer un profil ou coordonner Velair avec le reste du logement. Une notification différée signale que les données d’occupation deviennent indisponibles.

**Version :** 1.0.0 · **Nécessite :** Home Assistant 2024.6.0+

<p>
  <a href="blueprints/home-away-from-occupancy.fr.md"><img src="https://img.shields.io/badge/Documentation-View-24292F?style=for-the-badge&amp;logo=github&amp;logoColor=white" alt="Consulter la documentation Présence et absence selon l’occupation"></a>
  <a href="https://my.home-assistant.io/redirect/blueprint_import/?blueprint_url=https%3A%2F%2Fraw.githubusercontent.com%2Fcgonfer%2Fvelair%2Fmain%2Fblueprints%2Fautomation%2Fvelair%2Foccupancy_home_away.yaml"><img src="https://my.home-assistant.io/badges/blueprint_import.svg" alt="Ouvrir Home Assistant et importer le blueprint Présence et absence selon l’occupation" height="28"></a>
</p>

<hr>

<a id="pause-a-zone-while-windows-are-open"></a>
### Mettre une zone en pause tant que les fenêtres sont ouvertes

Mettez en pause un ou plusieurs appareils gérés par Velair tant qu’une fenêtre ou une porte sélectionnée reste ouverte, puis reprenez leurs programmations uniquement lorsque l’automatisation contrôle encore la pause active. Une notification Home Assistant différée identifie les contacts indisponibles et les thermostats concernés.

**Version :** 1.0.0 · **Nécessite :** Home Assistant 2024.6.0+ et Velair 1.6.0+

<p>
  <a href="blueprints/pause-zone-for-open-windows.fr.md"><img src="https://img.shields.io/badge/Documentation-View-24292F?style=for-the-badge&amp;logo=github&amp;logoColor=white" alt="Consulter la documentation Mettre une zone en pause tant que les fenêtres sont ouvertes"></a>
  <a href="https://my.home-assistant.io/redirect/blueprint_import/?blueprint_url=https%3A%2F%2Fraw.githubusercontent.com%2Fcgonfer%2Fvelair%2Fmain%2Fblueprints%2Fautomation%2Fvelair%2Fwindow_pause.yaml"><img src="https://my.home-assistant.io/badges/blueprint_import.svg" alt="Ouvrir Home Assistant et importer le blueprint de pause lorsque les fenêtres sont ouvertes" height="28"></a>
</p>

<hr>

<a id="seasonal-climate-selection"></a>
### Sélection climatique saisonnière

Exécutez des actions configurables pour l’hiver, le temps doux ou l’été après qu’une valeur modifiée d’un capteur de température est restée stable pendant un délai positif, initialement 30 minutes. Utilisez l’éditeur d’actions standard pour choisir des modes Velair ou d’autres actions Home Assistant. Les mesures invalides génèrent une notification immédiate ; le démarrage vérifie les diagnostics sans choisir de saison.

Les notifications de diagnostic prennent en charge les mêmes langues que Velair ; leur langue se sélectionne explicitement dans le blueprint.

**Version :** 1.0.0 · **Nécessite :** Home Assistant 2024.6.0+ · **Catégorie :** Température / automatisation saisonnière

<p>
  <a href="blueprints/seasonal-climate-selection.fr.md"><img src="https://img.shields.io/badge/Documentation-View-24292F?style=for-the-badge&amp;logo=github&amp;logoColor=white" alt="Consulter la documentation Sélection climatique saisonnière"></a>
  <a href="https://my.home-assistant.io/redirect/blueprint_import/?blueprint_url=https%3A%2F%2Fraw.githubusercontent.com%2Fcgonfer%2Fvelair%2Fmain%2Fblueprints%2Fautomation%2Fvelair%2Fseasonal_climate_selection.yaml"><img src="https://my.home-assistant.io/badges/blueprint_import.svg" alt="Ouvrir Home Assistant et importer le blueprint Sélection climatique saisonnière" height="28"></a>
  <a href="https://raw.githubusercontent.com/cgonfer/velair/main/blueprints/automation/velair/seasonal_climate_selection.yaml"><img src="https://img.shields.io/badge/YAML_source-View-24292F?style=for-the-badge&amp;logo=github&amp;logoColor=white" alt="Consulter le fichier YAML de Sélection climatique saisonnière"></a>
</p>

<hr>

<a id="shared-behavior"></a>
## Fonctionnement commun

- Les blueprints réagissent aux événements d’état et de démarrage Home Assistant ; ils n’effectuent pas d’interrogation périodique.
- Les délais configurables filtrent les changements d’état brefs.
- Les états `unknown` et `unavailable` sont traités avec prudence.
- Le blueprint d’occupation signale les problèmes persistants de disponibilité de l’occupation et ferme l’avertissement après le rétablissement.
- Le blueprint de fenêtres signale les problèmes persistants de disponibilité des contacts sans retarder le contrôle des contacts qui fonctionnent encore.
- Le blueprint saisonnier signale immédiatement les mesures de température invalides et ne sélectionne jamais de saison au démarrage.
- La configuration des blueprints reste dans Home Assistant, et non dans le stockage Velair.
- Réimporter la même URL met à jour le blueprint utilisé par les automatisations existantes.

Chaque page de blueprint décrit ses propres prérequis, sa configuration, un exemple, ses précautions de fonctionnement, ses limites et les étapes de dépannage.

<a id="versions-and-updates"></a>
## Versions et mises à jour

Les blueprints possèdent leurs propres versions sémantiques, indépendamment de l’intégration Velair. Les liens d’import suivent volontairement la version évolutive de `main`. Réimportez la même URL pour obtenir une mise à jour compatible d’une automatisation existante. Home Assistant ne met pas automatiquement à jour les blueprints importés.

Les mises à jour de la version 1 conservent les noms des entrées existantes ; toute nouvelle entrée possède une valeur par défaut. Une modification incompatible est publiée sous un nouveau nom de fichier et une nouvelle version majeure, en laissant l’URL existante disponible. Velair n’inspecte ni ne migre les automatisations Home Assistant ou les données `.storage`. **Prendre le contrôle** rend une automatisation indépendante, mais elle cesse alors de recevoir les futures mises à jour du blueprint.
