<a id="seasonal-climate-selection"></a>
# Sélection climatique saisonnière
<!-- velair-docs:start -->
Traductions: [Original en anglais](seasonal-climate-selection.md) · [Español](seasonal-climate-selection.es.md) · [Français](seasonal-climate-selection.fr.md) · [Deutsch](seasonal-climate-selection.de.md) · [Italiano](seasonal-climate-selection.it.md) · [Nederlands](seasonal-climate-selection.nl.md) · [Polski](seasonal-climate-selection.pl.md) · [Português (Brasil)](seasonal-climate-selection.pt-br.md) · [Português (Portugal)](seasonal-climate-selection.pt-pt.md) · [Русский](seasonal-climate-selection.ru.md) · [État des traductions](../../translation-status.md)

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

Exécutez les actions de votre choix après le changement d’un capteur de température et le maintien de sa nouvelle valeur pendant un délai configurable. Sélectionnez des Modes pour l’hiver, le temps doux ou l’été sans dupliquer les programmations ni placer les règles météo dans Velair. Les relevés invalides du capteur produisent une notification Home Assistant immédiate.

<p>
  <a href="https://my.home-assistant.io/redirect/blueprint_import/?blueprint_url=https%3A%2F%2Fraw.githubusercontent.com%2Fcgonfer%2Fvelair%2Fmain%2Fblueprints%2Fautomation%2Fvelair%2Fseasonal_climate_selection.yaml"><img src="https://my.home-assistant.io/badges/blueprint_import.svg" alt="Ouvrir Home Assistant et importer le blueprint de sélection climatique saisonnière" height="28"></a>
  <a href="https://raw.githubusercontent.com/cgonfer/velair/main/blueprints/automation/velair/seasonal_climate_selection.yaml"><img src="https://img.shields.io/badge/YAML_source-View-24292F?style=for-the-badge&amp;logo=github&amp;logoColor=white" alt="Voir la source YAML de la sélection climatique saisonnière"></a>
</p>

[Voir le journal des modifications](../../../blueprints/changelogs/seasonal_climate_selection.md) · [Revenir à l’index des blueprints](../blueprints.fr.md)

<a id="when-to-use-it"></a>
## Quand l’utiliser

Utilisez ce blueprint lorsque Home Assistant expose déjà un maximum journalier prévu, une mesure extérieure ou une température moyenne sous forme d’un capteur numérique de température. Il choisit les actions à exécuter ; Velair continue de gérer les programmations, les préréglages, le préconditionnement et la transmission aux appareils.

Pour un capteur mis à jour une fois par jour, une seule mise à jour stable peut choisir la routine du jour. Pour un capteur extérieur ou moyen changeant fréquemment, choisissez le délai avec soin : chaque nouvelle valeur recommence l’attente. Un capteur mis à jour toutes les cinq minutes peut ne jamais terminer une attente de 30 minutes.

<a id="requirements"></a>
## Prérequis

- Version 1.0.0 du blueprint et Home Assistant 2024.6.0 ou ultérieur.
- Un capteur numérique de classe d’appareil température avec une unité déclarée °C ou °F.
- Velair est nécessaire uniquement pour les actions utilisant ses entités ou services. Les scripts standard et autres actions Home Assistant fonctionnent sans Velair.
- Préparez séparément le capteur de prévision si votre fournisseur météo expose des prévisions plutôt qu’un capteur numérique. Ce blueprint ne récupère pas les prévisions.

Les Modes et le sélecteur natif de Mode Velair sont disponibles dans Velair 1.6.0 ou ultérieur. Les préréglages partagés et modèles liés sont facultatifs : le sélecteur saisonnier peut aussi choisir des Modes construits à partir de programmations indépendantes.

<a id="configuration"></a>
## Configuration

| Champ | Rôle |
|---|---|
| Temperature sensor | Capteur existant à surveiller |
| Temperature unit for thresholds | °C ou °F ; les relevés du capteur sont convertis pour la comparaison |
| Winter threshold | Les valeurs sous ce seuil exécutent les actions d’hiver ; valeur par défaut 20 |
| Summer threshold | Les valeurs au-dessus de ce seuil exécutent les actions d’été ; valeur par défaut 27 |
| Winter / Mild-weather / Summer actions | Séquences d’actions Home Assistant standard ; initialement vides |
| Stability delay | Durée pendant laquelle la nouvelle température numérique doit rester inchangée ; valeur par défaut 30 minutes |
| Language for diagnostic notifications | Toute langue prise en charge par Velair pour les avertissements persistants de capteur et de configuration ; anglais par défaut |

Le seuil d’hiver doit être inférieur au seuil d’été et le délai doit être positif. Les nombres des seuils ne changent pas automatiquement lorsque vous choisissez Fahrenheit : saisissez vous-même les seuils Fahrenheit voulus.

Ces deux choix sont explicites car Home Assistant n’expose pas ses préférences globales d’unité de température ou de langue aux modèles de texte des blueprints. La langue de l’utilisateur du navigateur n’est pas non plus un réglage de l’automatisation. L’unité déclarée du capteur est lue automatiquement et convertie dans l’unité des seuils choisie ; les notifications de diagnostic utilisent la langue sélectionnée ici.

Le sélecteur de langue change uniquement le texte des notifications de diagnostic. Les libellés et descriptions du formulaire du blueprint restent en anglais ; il ne traduit pas le formulaire de configuration Home Assistant.

Une séquence d’actions vide ne fait rien. Elle n’éteint pas un équipement, ne suspend pas Velair et ne sélectionne pas Par défaut.

<a id="example"></a>
## Exemple

<a id="daily-maximum-and-three-modes"></a>
### Maximum journalier et trois Modes

Créez les Modes Invierno, Entretiempo et Verano dans Velair. Associez Invierno et Verano à leurs Profils respectifs. Configurez Entretiempo avec un Profil dont les zones concernées utilisent **Mettre en pause → Éteindre le thermostat** si le temps doux doit désactiver la climatisation.

Dans chaque séquence d’actions du blueprint, ajoutez l’action **Select: Select** de Home Assistant, choisissez l’entité Mode Velair visible et sélectionnez son option dans l’éditeur. Ne supposez pas que votre entité porte l’ID d’exemple ci-dessous.

```yaml
service: select.select_option
target:
  entity_id: select.velair_mode
data:
  option: Invierno
```

Avec les seuils 20 et 27 °C, un maximum journalier passant à 18 °C exécute les actions d’hiver après 30 minutes sans changement. Une mise à jour ultérieure à 23 °C exécute les actions de temps doux ; 30 °C exécute celles d’été. Exactement 20 ou 27 °C correspond au temps doux. Chaque valeur modifiée peut déclencher une exécution, y compris 18 → 19 °C en hiver.

<a id="shared-hours-different-indoor-temperatures"></a>
### Horaires partagés, températures intérieures différentes

Liez les programmations des Profils Invierno et Verano au même modèle journalier avec **Horaires uniquement**. Attribuez des préréglages d’hiver comme Chauffage à 21 °C et d’été comme Refroidissement à 25 °C. Déplacer la plage de 07:00 du modèle change les deux programmations ; sélectionner un Mode choisit les cibles correspondantes. Le blueprint ne modifie ni les préréglages ni le modèle. Consultez les [exemples pratiques de programmations liées](../linked-schedule-examples.fr.md).

<a id="average-temperature-and-fahrenheit"></a>
### Température moyenne et Fahrenheit

Un capteur de moyenne peut changer plusieurs fois par heure. Avec un délai de dix minutes, des mises à jour à 10:00 et 10:07 reportent la décision à 10:17, si aucune nouvelle valeur n’arrive. S’il continue de changer avant que dix minutes ne passent, aucune action saisonnière ne s’exécute.

Un capteur Fahrenheit peut utiliser des seuils Celsius car le relevé est converti. Vous pouvez aussi choisir °F et saisir des seuils tels que 68 et 80.6 °F, équivalents à 20 et 27 °C. Une valeur de 77 °F sélectionne alors les actions de temps doux.

<a id="alternative-script-or-service"></a>
### Autre script ou service

Chaque branche accepte des actions Home Assistant normales. Par exemple, exécutez un script du foyer dans la branche d’été :

```yaml
service: script.turn_on
target:
  entity_id: script.summer_climate_routine
```

L’activation directe d’un Profil est aussi possible avec `velair.activate_profile` et son ID stable. Pour modifier des réglages partagés plutôt que choisir un Mode, consultez les [automatisations de préréglages](../preset-automations.fr.md) ; tenez compte de toutes les utilisations d’un préréglage partagé avant de le changer.

<a id="how-it-works"></a>
## Fonctionnement

Un déclencheur d’état détecte une température numérique modifiée, puis l’attente native interruptible de Home Assistant vérifie qu’elle reste stable pendant le délai configuré. Un véritable changement numérique interrompt la décision en attente et recommence une nouvelle attente, y compris un retour à une valeur précédente : `21 → 22 → 21` commence un nouveau délai au dernier 21. Une mise à jour de format uniquement, comme `21` vers `21.0`, ne déclenche pas de nouvelle décision et n’interrompt pas une attente en cours. Les mises à jour d’attributs seules ne démarrent pas les actions saisonnières. Avant de commencer les actions, le blueprint vérifie de nouveau le relevé numérique actuel, son unité, les seuils, le délai et la continuité de l’attente.

Un relevé ou une unité invalide interrompt immédiatement une décision en attente, même si seul l’attribut d’unité change. Restaurer uniquement l’unité supprime le diagnostic sans sélectionner une saison ; un autre changement d’état numérique est nécessaire. Le passage d’un état numérique invalide comme `unavailable` à un nombre valide commence un nouveau délai.

Le démarrage de Home Assistant vérifie uniquement les diagnostics. Il ne choisit pas de Mode saisonnier. Les temporisations en attente ne survivent pas à un redémarrage ou au rechargement de l’automatisation ; un autre changement d’état du capteur est ensuite nécessaire. Il n’existe ni déclencheur périodique ou quotidien ni assistant conservant la dernière classification.

Si l’entité de capteur sélectionnée est initialement absente puis apparaît avec un relevé valide, ce premier relevé compte comme une récupération et commence l’attente complète de stabilité. Cela s’applique aussi lorsqu’un capteur supprimé est recréé. Il s’agit d’une transition du capteur après démarrage, pas d’une action saisonnière causée par l’événement de démarrage lui-même.

La validation du capteur s’exécute séparément de l’attente saisonnière. Une entité absente, `unknown`, `unavailable`, une valeur non finie ou non numérique, ou une unité non prise en charge crée immédiatement une notification persistante propre à l’automatisation dans la langue sélectionnée. Elle identifie l’automatisation et le capteur et explique que les actions saisonnières sont suspendues. La récupération supprime l’avertissement du capteur ; un retour à un état numérique valide commence une nouvelle attente de stabilité, tandis qu’une récupération de l’unité seule met uniquement à jour les diagnostics. Une configuration invalide utilise une notification séparée.

Par exemple, un capteur devenant indisponible à 09:00 avertit immédiatement, pas à 09:30. Son retour à 25 °C à 09:10 autorise les actions de temps doux à 09:40 si la valeur reste inchangée.

<a id="safety-and-precedence"></a>
## Sécurité et priorités

Tant que le capteur est invalide, le blueprint ne fait pas de nouvelle sélection saisonnière ; il n’éteint pas automatiquement les appareils. Le Mode précédemment sélectionné et sa programmation restent en place. Réagissez à la notification si ce comportement ne convient pas à votre logement.

Les actions configurées utilisent le fonctionnement et les traces habituels de Home Assistant. Une erreur d’action n’annule pas les actions précédentes. Le blueprint ne peut pas vérifier de façon générique qu’une action quelconque a choisi la routine voulue ou atteint un appareil physique.

Un nouveau relevé stable peut remplacer un Mode Absence choisi manuellement. Coordonnez les automatisations saisonnières et de présence plutôt que de laisser les deux sélectionner des Modes concurrents. Par exemple, un script du foyer peut choisir un Mode Absence lorsque le logement est vide et sélectionner le Mode saisonnier de présence uniquement si la présence l’autorise.

Le comportement existant des Modes et Profils Velair reste applicable, y compris la priorité des pauses et l’annulation des Forçages dans les zones concernées. Le préconditionnement se recalcule selon la programmation effective sélectionnée par l’action ; il ne peut pas anticiper un choix saisonnier avant qu’il soit effectué.

<a id="limitations"></a>
## Limites

- La stabilité concerne la valeur du capteur, pas uniquement sa classification hiver/temps doux/été. Les capteurs changeant fréquemment peuvent reporter indéfiniment l’exécution.
- Aucune action saisonnière automatique au démarrage, programmation quotidienne, interrogation périodique, temporisation en attente sauvegardée, autorisation supplémentaire à 24 °C ou extinction différée.
- Les notifications ne peuvent pas détecter un capteur qui cesse silencieusement de se mettre à jour tout en conservant un nombre valide. La surveillance de fraîcheur de la source doit être fournie séparément si nécessaire.
- Il n’y a pas d’hystérésis ; le délai de stabilité filtre les changements. Une nouvelle valeur stable dans la même classification exécute quand même sa branche.
- L’exécution parallèle est limitée. Les longues séquences d’actions utilisateur peuvent occuper les emplacements ; gardez les actions courtes ou confiez le travail à des scripts.
- Une séquence déjà commencée n’est pas annulée par un relevé ultérieur. Les vérifications protègent son démarrage, pas chaque action définie par l’utilisateur.
- Renommer l’automatisation peut laisser son ancienne notification de diagnostic à fermer manuellement. Les options de Mode renommées ou supprimées doivent être mises à jour dans les actions configurées.

<a id="troubleshooting"></a>
## Dépannage

- Si rien ne s’exécute, vérifiez que la valeur a réellement changé et est restée inchangée pendant tout le délai. Démarrer ou recharger Home Assistant ne lance pas de sélection saisonnière.
- Si un avertissement apparaît, inspectez le capteur indiqué, son état numérique et `unit_of_measurement`. Les unités inconnues ne sont jamais devinées.
- Si une temporisation ne se termine jamais, inspectez l’historique du capteur et réduisez le délai positif ou utilisez un capteur de maximum journalier.
- Si la mauvaise branche s’exécute, vérifiez l’unité de seuil choisie et les deux seuils numériques.
- Si les équipements restent allumés par temps doux, configurez un véritable Mode de pause avec extinction ; une liste d’actions vide n’est pas une commande d’arrêt.
- Si un Mode n’est pas sélectionné, testez son action manuellement et inspectez la trace de l’automatisation. Sélectionnez le nom d’option actuel dans l’éditeur Home Assistant.
- Si une URL d’import est indisponible avant publication, utilisez le fichier YAML de la copie locale pour les tests. Les liens publics fonctionnent après publication du fichier sur `main`.

<a id="updating-and-customizing"></a>
## Mise à jour et personnalisation

Importez explicitement le blueprint ; installer ou mettre à jour Velair via HACS ne l’installe pas. Réimportez la même URL évolutive de `main` pour les mises à jour compatibles. La version 1 conserve les noms des entrées ; les nouvelles entrées compatibles reçoivent des valeurs par défaut. Les changements incompatibles utilisent un nouveau nom de fichier et une nouvelle version majeure.

Home Assistant possède l’automatisation résultante. Velair ne migre ni les automatisations ni `.storage`. Utilisez **Take control** pour une autre logique, en sachant que l’automatisation indépendante cesse de recevoir les mises à jour du blueprint. Consultez le [catalogue des blueprints](../blueprints.fr.md) pour les règles communes de distribution et de mise à jour.
