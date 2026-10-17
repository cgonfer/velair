<a id="pause-a-zone-while-windows-are-open"></a>
# Mettre une zone en pause tant que les fenêtres sont ouvertes
<!-- velair-docs:start -->
Traductions: [Original en anglais](pause-zone-for-open-windows.md) · [Español](pause-zone-for-open-windows.es.md) · [Français](pause-zone-for-open-windows.fr.md) · [Deutsch](pause-zone-for-open-windows.de.md) · [Italiano](pause-zone-for-open-windows.it.md) · [Nederlands](pause-zone-for-open-windows.nl.md) · [Polski](pause-zone-for-open-windows.pl.md) · [Português (Brasil)](pause-zone-for-open-windows.pt-br.md) · [Português (Portugal)](pause-zone-for-open-windows.pt-pt.md) · [Русский](pause-zone-for-open-windows.ru.md) · [État des traductions](../../translation-status.md)

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

Mettez en pause un ou plusieurs équipements climatiques gérés par Velair lorsqu’une fenêtre ou porte sélectionnée reste ouverte, puis reprenez leurs programmations uniquement lorsque tous les contacts sont confirmés fermés et que chaque pause active appartient encore à cette automatisation. Home Assistant avertit lorsqu’un contact indisponible empêche une reprise sûre.

<p>
  <a href="https://my.home-assistant.io/redirect/blueprint_import/?blueprint_url=https%3A%2F%2Fraw.githubusercontent.com%2Fcgonfer%2Fvelair%2Fmain%2Fblueprints%2Fautomation%2Fvelair%2Fwindow_pause.yaml"><img src="https://my.home-assistant.io/badges/blueprint_import.svg" alt="Ouvrir Home Assistant et importer le blueprint de pause pendant l’ouverture des fenêtres" height="28"></a>
  <a href="https://raw.githubusercontent.com/cgonfer/velair/main/blueprints/automation/velair/window_pause.yaml"><img src="https://img.shields.io/badge/YAML_source-View-24292F?style=for-the-badge&amp;logo=github&amp;logoColor=white" alt="Voir la source YAML de la pause pendant l’ouverture des fenêtres"></a>
</p>

[Voir le journal des modifications](../../../blueprints/changelogs/window_pause.md) · [Revenir à l’index des blueprints](../blueprints.fr.md)

Les questions, notes de test et retours constructifs sont les bienvenus dans le [sujet officiel du blueprint sur le forum de la communauté Home Assistant](https://community.home-assistant.io/t/velair-blueprint-pause-a-zone-while-windows-are-open/1021389).

<a id="when-to-use-it"></a>
## Quand l’utiliser

Utilisez ce blueprint lorsque l’ouverture d’une fenêtre ou porte doit empêcher temporairement Velair de modifier un ou plusieurs équipements partageant ces ouvertures. Il convient au chauffage et au refroidissement, et peut laisser chaque équipement dans son état actuel ou l’éteindre pendant la pause.

<a id="requirements"></a>
## Prérequis

- Version 1.0.0 du blueprint, Velair 1.6.0 ou ultérieur et Home Assistant 2024.6.0 ou ultérieur. Velair 1.6.0 fournit les motifs de pause simultanés avec identifiant de propriétaire utilisés par ce blueprint.
- Un ou plusieurs équipements climatiques déjà gérés par Velair.
- Une ou plusieurs entités `binary_sensor` avec la classe d’appareil `window`, `door` ou `opening`.
- `on` doit signifier ouvert et `off` fermé pour chaque contact sélectionné.

<a id="configuration"></a>
## Configuration

- **Managed thermostats** : tous les équipements gérés par Velair à mettre en pause et à reprendre ensemble.
- **Windows and doors** : chaque ouverture affectant cette zone.
- **Climate action while paused** : conserver l’état actuel ou éteindre l’équipement.
- **Pause ID** : identifiant stable du propriétaire de la pause. Conservez la valeur par défaut pour une automatisation ou utilisez un ID différent pour chaque automatisation distincte ciblant le même thermostat.
- **Open delay** : durée pendant laquelle au moins une ouverture doit rester ouverte avant la pause.
- **Close delay** : durée pendant laquelle toutes les ouvertures doivent rester fermées avant la reprise.
- **Availability warning delay** : durée pendant laquelle un contact doit rester `unknown` ou `unavailable` avant l’affichage d’une notification Home Assistant. La valeur par défaut est de 5 minutes.

<a id="example"></a>
## Exemple

Pour un équipement de salon avec deux fenêtres :

```text
Managed thermostats:
  - climate.living_room
  - climate.living_room_radiator
Windows and doors:
  - binary_sensor.living_room_left_window
  - binary_sensor.living_room_right_window
Climate action while paused: Turn off
Open delay: 2 minutes
Close delay: 30 seconds
Availability warning delay: 5 minutes
```

Si l’une des fenêtres reste ouverte pendant deux minutes, le blueprint met les deux équipements du salon en pause et les éteint. Après fermeture de la dernière fenêtre et maintien des deux contacts fermés pendant 30 secondes, il reprend chaque programmation active.

<a id="how-it-works"></a>
## Fonctionnement

Home Assistant observe trois conditions agrégées : au moins un contact ouvert, tous les contacts fermés et au moins un contact `unknown` ou `unavailable`. Chaque condition utilise un déclencheur natif basé sur un modèle de texte avec sa durée `for` configurée. Si la condition agrégée devient fausse avant la fin du délai, Home Assistant réinitialise sa temporisation et aucune action ne s’exécute. À l’expiration, l’action courte vérifie de nouveau tout l’ensemble des contacts avant de mettre en pause, de reprendre ou de créer un avertissement.

Le contrôle à l’ouverture, le contrôle à la fermeture et le diagnostic de disponibilité utilisent des déclencheurs indépendants réagissant aux événements. Un contact ouvert peut donc mettre la zone en pause après le délai d’ouverture même si un autre contact sélectionné est indisponible. Le contact indisponible empêche toujours la condition de fermeture complète de devenir vraie et de reprendre la zone.

Si un contact reste `unknown` ou `unavailable` pendant le délai d’avertissement configuré, Home Assistant crée une notification persistante pour l’ensemble des thermostats. Elle liste les contacts concernés et les thermostats sélectionnés et explique pourquoi ils ne reprennent pas. L’état est vérifié de nouveau après le délai : une ancienne exécution s’arrête avant la création de notification si tous les contacts sont rétablis. Un déclencheur agrégé de récupération supprime l’avertissement. L’ID déterministe de notification fait que les exécutions ultérieures mettent à jour le même avertissement au lieu de créer des doublons.

Après le démarrage de Home Assistant, une exécution de réconciliation effectue les trois vérifications dans des branches internes parallèles. Chaque branche vérifie d’abord sa condition agrégée, attend la condition opposée au plus pendant le délai configuré et s’arrête immédiatement si cette condition opposée apparaît. La branche d’ouverture peut ainsi mettre les équipements en pause pendant que la branche de disponibilité attend. Elle agit uniquement à l’expiration de l’attente et si une dernière vérification agrégée réussit encore. Home Assistant ne peut pas reconstruire depuis combien de temps une condition était vraie avant le démarrage ; ces temporisations interruptibles recommencent donc à zéro. Le fonctionnement normal utilise ensuite les temporisations continues des déclencheurs décrites ci-dessus. Il n’y a pas d’interrogation périodique.

Les exécutions d’automatisation peuvent se chevaucher : un événement `opened_due` n’est donc pas bloqué pendant l’attente de la branche de disponibilité au démarrage. Cette attente n’occupe qu’un emplacement parallèle parmi le nombre limité. Les actions convergent de façon sûre car chaque itération climatique revalide l’état agrégé actuel des contacts, Velair sérialise les modifications de dérogation par équipement et un déclencheur agrégé opposé applique la décision ultérieure de pause ou de reprise lorsque les conditions changent.

<a id="safety-and-precedence"></a>
## Sécurité et priorités

Lorsque le bloc actif utilise **Température uniquement**, la reprise après fermeture des fenêtres réapplique sa cible sans demander de changement de mode HVAC. Si le blueprint a éteint l’équipement, celui-ci reste éteint ; utilisez un mode explicite dans un bloc ultérieur ou allumez-le manuellement si nécessaire. **Conserver le mode actuel** garde son comportement de redémarrage existant. Il s’agit de la politique du bloc actif, pas d’un nouveau paramètre du blueprint ; aucune réimportation n’est nécessaire.

Le blueprint crée chaque pause avec le **Pause ID** configuré. Sa valeur par défaut est `velair_window_guard` ; Velair persiste ce propriétaire indépendamment pour chaque thermostat sélectionné.

- Il ne remplace pas une pause manuelle ou appartenant à une autre automatisation.
- La fermeture de toutes les fenêtres entraîne uniquement la reprise des pauses portant le même ID.
- Une pause ou reprise manuelle dans Velair reste prioritaire.
- Les scripts et automatisations existants sans `pause_id` conservent leur comportement précédent.
- Les contacts `unknown` et `unavailable` ne sont jamais considérés comme sûrement fermés.
- Les avertissements de disponibilité ne contournent ni ne changent le propriétaire des pauses. Ils expliquent uniquement pourquoi une reprise sûre est impossible.

Chaque équipement reçoit un appel de service individuel et l’état agrégé pertinent des contacts est vérifié de nouveau immédiatement avant chaque appel. Une erreur de service Home Assistant est enregistrée dans la trace de l’automatisation, mais `continue_on_error` permet au blueprint de continuer avec les équipements restants. Les changements de Forçage, de pause, de reprise et d’expiration restent sérialisés indépendamment par zone climatique.

<a id="limitations"></a>
## Limites

- Préférez une seule automatisation contenant toutes les ouvertures pertinentes pour le même ensemble de thermostats.
- Si des automatisations de fenêtres séparées doivent cibler le même thermostat, donnez à chacune un **Pause ID** stable différent. Elles créent alors des motifs de pause indépendants, et chaque automatisation peut retirer uniquement son propre motif.
- Le blueprint ne peut pas interpréter de façon fiable les changements effectués avec une télécommande infrarouge si l’intégration climatique sous-jacente ne les rapporte pas à Home Assistant.
- Les temporisations interruptibles de réconciliation au démarrage recommencent à zéro car Home Assistant ne peut pas récupérer leur historique antérieur au redémarrage.
- Les notifications dépendent de l’intégration native `persistent_notification` de Home Assistant.
- L’ID de notification utilise l’ID d’entité de l’automatisation Home Assistant pour rester court et indépendant de la sélection ou de l’ordre des thermostats. Renommer l’automatisation peut laisser son ancienne notification à fermer manuellement.
- Jusqu’à 50 exécutions peuvent se chevaucher. Home Assistant émet un avertissement si une rafale anormale d’événements remplit ces emplacements ; les exécutions normales déclenchées par les conditions restent courtes.

<a id="troubleshooting"></a>
## Dépannage

- Si la zone ne se met jamais en pause, vérifiez qu’au moins un contact sélectionné indique `on` lorsqu’il est ouvert et reste ouvert plus longtemps que le délai d’ouverture.
- Si la zone ne reprend pas, vérifiez que chaque contact sélectionné indique `off`. Après le délai d’avertissement de disponibilité, la notification persistante liste ceux qui indiquent encore `unknown` ou `unavailable`.
- Si un avertissement reste après récupération, vérifiez que le contact a produit un nouvel événement d’état. Recharger ou exécuter l’automatisation réévalue aussi l’ensemble complet et supprime un avertissement périmé.
- Si un service signale une entité non gérée, ajoutez cet équipement à Velair. Les erreurs de service Home Assistant n’arrêtent pas les équipements restants ; inspectez la trace pour identifier les échecs individuels.
- Si la fermeture des fenêtres laisse la zone en pause, vérifiez si la pause active a été créée manuellement ou par une autre automatisation. Le blueprint la laisse volontairement inchangée.
- Si plusieurs automatisations ciblent le même équipement, regroupez leurs ouvertures ou vérifiez que chacune utilise un **Pause ID** stable différent.

<a id="updating-and-customizing"></a>
## Mise à jour et personnalisation

Réimportez l’URL évolutive de `main` pour installer une mise à jour compatible. Les mises à jour de version 1 conservent les noms des entrées existantes et toute nouvelle entrée possède une valeur par défaut : aucune migration d’automatisation n’est nécessaire. Une future version incompatible utilisera un nouveau nom de fichier et une nouvelle version majeure au lieu de remplacer cette URL. Velair ne modifie jamais les automatisations Home Assistant ni `.storage` pour migrer un blueprint. Utilisez **Take control** uniquement si l’installation nécessite un comportement personnalisé dépassant les contacts, actions et délais proposés ; l’automatisation indépendante cesse alors de recevoir les mises à jour du blueprint.
