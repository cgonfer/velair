<a id="climate-profiles"></a>
# Profils climatiques
<!-- velair-docs:start -->
Traductions: [Original en anglais](climate-profiles.md) · [Español](climate-profiles.es.md) · [Français](climate-profiles.fr.md) · [Deutsch](climate-profiles.de.md) · [Italiano](climate-profiles.it.md) · [Nederlands](climate-profiles.nl.md) · [Polski](climate-profiles.pl.md) · [Português (Brasil)](climate-profiles.pt-br.md) · [Português (Portugal)](climate-profiles.pt-pt.md) · [Русский](climate-profiles.ru.md) · [État des traductions](../translation-status.md)

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

Les profils climatiques permettent à Velair de faire passer plusieurs zones climatiques d’un programme hebdomadaire coordonné à un autre sans remplacer leurs programmations par défaut. Home Assistant reste responsable des décisions : la présence, les fenêtres, les saisons, les sélecteurs, les capteurs ou d’autres automatisations décident quand changer de profil, tandis que Velair enregistre, applique et affiche le comportement climatique obtenu.

Un **Profil** définit une routine climatique alternative pour les zones qu’il configure. Un **Mode** active ensemble un ou plusieurs Profils sans zones communes, pour représenter un seul état du foyer. Activez directement un Profil lorsque cette seule routine suffit ; utilisez un Mode lorsque plusieurs espaces doivent changer ensemble.

Par exemple : Présence, Absence, Vacances, Été, Invités ou Nuit. Les profils prennent aussi en charge les installations dont les programmes de chauffage et de refroidissement utilisent des heures, des températures cibles et des modes HVAC différents.

<a id="default"></a>
## Par défaut

`Default` est la sélection intégrée et correspond toujours aux programmations hebdomadaires configurées dans l’onglet Programmes. Ce n’est pas un profil enregistré : il ne peut donc être ni renommé ni supprimé.

L’activation d’un autre profil n’écrase jamais ces programmations. Revenir à Par défaut applique immédiatement le bloc par défaut actif à cet instant.

<a id="configure-a-profile"></a>
## Configurer un Profil

Ouvrez **Programmes**, choisissez **Planifications des Profils** et utilisez le bouton d’ajout pour créer un Profil vide. Sélectionnez-le dans la liste pour modifier sa couleur, son icône, son nom, sa description et le comportement des thermostats. L’espace de travail du Profil affiche un thermostat à la fois pour que l’éditeur complet reste utilisable sur ordinateur, tablette et mobile.

Le nom du profil se modifie dans le titre, à côté de l’icône de crayon. Son ID d’automatisation stable apparaît directement sous le nom et dans la liste des profils, afin de pouvoir le copier dans les services, scripts et automatisations sans le confondre avec le nom d’affichage modifiable.

Les icônes utilisent des clés Material Design Icons telles que `mdi:briefcase-outline`. L’éditeur affiche un aperçu dans la couleur choisie pour le profil, propose un lien vers le catalogue Material Design Icons avec recherche et signale les clés qui ne respectent pas le format `mdi:icon-name` attendu. Les descriptions sont limitées à 500 caractères et l’éditeur indique le nombre de caractères restants. Velair attribue une couleur stable aux profils nouveaux et existants ; vous pouvez la modifier avec le sélecteur de couleur ou une valeur `#RRGGBB` modifiable. Les valeurs invalides sont signalées et ne peuvent pas être enregistrées. La couleur est incluse dans les exports portables. La sélection intégrée Par défaut conserve sa couleur fixe.

Pour chaque équipement climatique géré, choisissez un comportement :

- **Planification par défaut** : continuer à utiliser la programmation hebdomadaire habituelle de cette zone.
- **Planification du Profil** : utiliser une programmation hebdomadaire complète enregistrée dans le Profil.
- **Mettre en pause** avec **Ne pas modifier le thermostat** : arrêter les changements programmés et laisser l’équipement dans son état actuel.
- **Mettre en pause** avec **Éteindre le thermostat** : arrêter les changements programmés et éteindre l’équipement.

Les zones non configurées dans un profil continuent à utiliser leurs programmations par défaut. Les modèles peuvent toujours être copiés sous forme de blocs indépendants. Un jour de la programmation par défaut ou d’un Profil peut aussi lier uniquement ses horaires à un modèle en conservant ses propres réglages climatiques, ou suivre le modèle complet avec toutes ses commandes en lecture seule. Les modèles et les blocs indépendants peuvent référencer des préréglages Velair partagés. Consultez [Préréglages de blocs et modèles liés](linked-schedules.fr.md) pour les règles de propagation, de dissociation, de compatibilité et de modification partagée, et [l’exemple Hiver/Été](linked-schedule-examples.fr.md#2-winter-and-summer-with-one-set-of-times) pour partager les mêmes horaires avec des réglages climatiques différents. Copier un jour conserve le type de lien au modèle, les affectations des liens horaires uniquement et les références aux préréglages de blocs. La copie vers un autre thermostat valide le Profil proposé avant de modifier le brouillon ; les autres jours de destination conservent leurs liens existants. Utilisez Dissocier après la copie si le nouveau jour doit être indépendant du modèle.

Pour une zone déléguée à un contrôleur externe, les Profils et les Modes choisissent la semaine complète effective que Velair publie, plutôt que de provoquer des actions directes sur `climate.*`. **Planification par défaut** publie la semaine habituelle et **Planification du Profil** publie la semaine du Profil. Le comportement **Mettre en pause** n’est pas disponible pour une zone gérée en externe. L’éditeur du Profil ajoute les capacités du contrôleur à la validation ; un échec de publication n’annule pas la sélection enregistrée du Profil ou du Mode et n’affecte pas les zones exécutées localement. Consultez [Exécution externe des programmations](external-systems.fr.md) pour les limites actuelles des contrôleurs et le fonctionnement de la publication.

Depuis un jour modifié du Profil, **Enregistrer comme modèle** enregistre uniquement un modèle réutilisable via le backend et laisse le brouillon du Profil non enregistré inchangé. Pour réutiliser le jour sur d’autres équipements climatiques gérés, sélectionnez-les dans le panneau **Copier ce jour vers / Autres thermostats**, puis choisissez **Copier**. La confirmation récapitule les équipements sélectionnés et indique les zones en Par défaut ou en Pause qui passeront à **Planification du Profil**. La copie remplace uniquement le même jour de la semaine, conserve tous les autres jours mémorisés et reste dans le brouillon du Profil. Velair valide le type de cible, le mode HVAC, les limites de température et le pas de température pour chaque équipement sélectionné avant de modifier le brouillon. Il retire les commandes facultatives non prises en charge par chaque destination. Si un bloc composé uniquement d’options n’a plus aucune commande prise en charge, ou si une cible ou un mode est incompatible, le brouillon reste entièrement inchangé. Les jours copiés ne sont persistés qu’à l’enregistrement du Profil.

Chaque jour du profil utilise la même chronologie modifiable que les programmations par défaut et les modèles, avec glissement et redimensionnement pour ajuster les horaires. Les blocs ont une heure de début sans heure de fin distincte : le dernier bloc se poursuit au-delà de minuit et pendant les jours vides jusqu’au début d’un autre bloc. La chronologie représente la partie héritée du jour par un segment distinct non modifiable et indique le jour où ce bloc est réellement configuré. Tant qu’un Profil reste ouvert dans l’éditeur, faire passer temporairement une zone de **Planification du Profil** à **Planification par défaut** ou **Mettre en pause** conserve sa programmation hebdomadaire dans le brouillon. Choisir de nouveau **Planification du Profil** restaure ces blocs non enregistrés. Enregistrer le Profil avec Par défaut ou Pause ne conserve toutefois que ce comportement sélectionné ; la programmation masquée du brouillon n’est pas persistée. Le sélecteur de thermostat affiche les noms conviviaux et l’éditeur actif montre aussi l’ID de l’entité. Les métadonnées et programmations du Profil sont toujours enregistrées ensemble, de façon atomique ; changer de thermostat sélectionné n’enregistre pas un brouillon partiel.

Plusieurs profils peuvent être actifs ensemble lorsqu’un Mode les coordonne. Leurs zones configurées ne doivent pas se chevaucher : chaque équipement climatique géré est toujours contrôlé par au plus un profil. Les zones qui n’appartiennent à aucun profil actif continuent à utiliser leur programmation par défaut.

<a id="worked-example-an-away-mode"></a>
## Exemple détaillé : un Mode Absence

Supposons que les équipements des pièces de vie et des chambres nécessitent des comportements différents lorsque le logement est vide :

1. Créez un Profil nommé **Absence · Pièces de vie**. Donnez au salon et à la cuisine des programmations alternatives avec des températures cibles adaptées à l’installation, qu’elle chauffe, refroidisse ou permette les deux.
2. Créez un Profil nommé **Absence · Chambres**. Configurez les chambres avec une autre programmation, **Mettre en pause**, ou une pause avec extinction.
3. N’incluez pas les zones non concernées dans ces Profils. Elles continueront à utiliser leurs programmations par défaut.
4. Ouvrez **Modes**, choisissez **Nouveau mode**, nommez-le **Away**, sélectionnez les deux Profils et enregistrez.
5. Dans **Configuration active**, choisissez **Modifier**, puis **Away**. Velair applique les deux Profils comme une seule sélection atomique.

Cette configuration est valide car les deux Profils configurent des zones différentes. S’ils configuraient le même équipement, Velair rejetterait le Mode et demanderait de supprimer ce chevauchement.

Une automatisation Home Assistant peut sélectionner le même Mode :

```yaml
alias: Use Away climate mode
triggers:
  - trigger: state
    entity_id: person.resident
    to: "not_home"
actions:
  - action: select.select_option
    target:
      entity_id: select.velair_mode
    data:
      option: Away
```

Une autre automatisation peut rétablir la programmation habituelle de chaque zone :

```yaml
alias: Restore default climate schedules
triggers:
  - trigger: state
    entity_id: person.resident
    to: "home"
actions:
  - action: select.select_option
    target:
      entity_id: select.velair_mode
    data:
      option: Default
```

Remplacez l’entité de personne et les noms visibles des Modes par ceux de votre installation Home Assistant. Si un Mode est renommé, mettez à jour les automatisations qui sélectionnent son option visible.

<a id="activate-a-profile"></a>
## Activer un Profil

Utilisez le bouton de lecture sur une ligne de Profil dans **Programmes > Planifications des Profils** pour l’activer directement, ou la carte commune **Configuration active** dans Vue d’ensemble ou en haut de **Modes**. Elle montre ensemble le Mode actuel et les Profils qu’il applique. Sélectionnez **Modifier** pour choisir un Mode ou utilisez le groupe séparé **Activer un profil manuellement**. Choisir directement un Profil remplace l’ensemble actif par ce seul Profil et fait passer le Mode à **Manuel** ; **Par défaut** signifie qu’aucun Profil alternatif n’est actif. Les Profils peuvent aussi être activés depuis leur ligne, depuis Configuration active ou avec l’action `velair.activate_profile`. Velair applique le bloc actif à l’heure actuelle sans attendre la prochaine transition programmée. Cela inclut le dernier bloc d’un jour précédent si aucun nouveau bloc n’a encore commencé aujourd’hui.

L’activation directe n’ajoute jamais un Profil à l’ensemble existant, même si leurs zones ne se chevaucheraient pas. Les zones contrôlées par le précédent Mode ou ensemble de Profils et absentes du Profil nouvellement activé reviennent immédiatement à leur programmation par défaut ; elles ne conservent pas la configuration précédente. Créez un Mode associant tous les Profils nécessaires sans chevauchement pour les activer ensemble.

L’activation annule les Forçages actifs dans les zones dont le comportement effectif du profil change. Une pause globale ou par zone existante reste prioritaire ; Velair enregistre le nouveau profil et l’applique lorsque le planificateur ou la zone reprend.

Vue d’ensemble utilise la programmation effective de chaque zone dans la chronologie du jour et les prochains événements. Les zones modifiées par le profil actif affichent une étiquette compacte et colorée avec l’icône et le nom du Profil ; l’état temporaire de Forçage ou de Pause reste visuellement prioritaire jusqu’à sa fin. Les confirmations d’enregistrement, d’activation et de suppression d’un Profil utilisent la notification temporaire standard de Velair avec bouton de fermeture et barre de compte à rebours.

Les changements de Mode et activations de Profil affichent aussi une bande d’opération globale pendant le traitement des zones concernées. Elle reste visible lors d’un changement d’onglet du panneau. Dans Lovelace, elle apparaît uniquement dans la carte Configuration active, où s’effectuent ces activations. Le compteur indique les zones que Velair a fini de traiter, y compris celles dont la pause ou la dérogation actuelle ne nécessite aucune commande climatique ; il n’affirme pas qu’une pièce physique a déjà atteint sa cible. L’état final distingue une réussite complète d’une transition terminée avec une ou plusieurs erreurs de zone. Les résultats réussis disparaissent automatiquement après une courte confirmation ; les résultats partiels ou échoués restent disponibles jusqu’à leur fermeture, y compris en changeant d’onglet.

Les automatisations et scripts peuvent utiliser :

```yaml
action: velair.activate_profile
data:
  profile_id: vacation
```

Dans l’éditeur visuel des automatisations de Home Assistant, ajoutez une action et recherchez **Velair: Activate climate profile**. Cette action d’intégration est distincte des actions de commutateur et de sélecteur proposées en filtrant par appareil Velair. Saisissez l’**ID d’automatisation** du Profil, affiché sous son nom dans Velair.

Utilisez le service explicite de désactivation pour revenir aux programmations par défaut :

```yaml
action: velair.deactivate_profile
```

Omettre `profile_id` dans `velair.activate_profile` reste pris en charge pour compatibilité. Les identifiants des profils restent stables même si leur nom visible change. Une activation directe depuis le panneau ou le service règle le sélecteur natif de Mode sur `Manual`, même si le même profil était déjà actif.

<a id="modes"></a>
## Modes

Un profil ne contient pas de conditions arbitraires. Home Assistant reste responsable des décisions. Velair possède une entité native `select.velair_mode` : les valeurs utilisées par les automatisations peuvent ainsi être gérées depuis l’onglet Modes sans créer un autre assistant Home Assistant.

Deux valeurs intégrées existent toujours et ne peuvent être ni renommées ni supprimées :

- **Par défaut** désactive les profils et rétablit la programmation par défaut de chaque zone.
- **Manuel** signifie qu’aucun Mode personnalisé ne contrôle actuellement l’ensemble des Profils actifs. Une activation directe de Profil entre normalement dans cet état. Il apparaît comme état actuel, mais pas comme action dans le sélecteur Velair. Sélectionnez **Par défaut** ou un Mode personnalisé pour le quitter. L’entité native Home Assistant conserve son option Manual pour compatibilité ; la sélectionner conserve les Profils actifs, mais les détache de leur Mode personnalisé.

Créez des valeurs personnalisées telles qu’Absence, Vacances ou Présence et associez chacune à un ou plusieurs Profils climatiques enregistrés. Dans **Modes**, choisissez **Nouveau mode**, saisissez le nom d’option que Home Assistant affichera, sélectionnez un ou plusieurs Profils sans zones communes et enregistrez. Sélectionner une valeur personnalisée active l’ensemble complet de façon atomique. Les Profils d’un même Mode doivent configurer des zones différentes : Velair rejette les chevauchements plutôt que d’appliquer une priorité implicite. Plusieurs Modes peuvent toutefois référencer le même profil. Les noms sont débarrassés des espaces en début et fin, limités à 255 caractères, uniques sans distinction de casse et ne peuvent utiliser ni les noms intégrés ni les états réservés `unknown` et `unavailable` de Home Assistant.

L’onglet Modes affiche le Mode actif et les Profils climatiques appliqués dans une seule carte **Configuration active**. Son sélecteur groupé présente d’abord Par défaut et les Modes personnalisés, puis séparément l’activation directe des Profils. Manuel reste visible comme état, mais n’est pas sélectionnable dans ce sélecteur. Choisir un Mode active tous ses Profils associés ; choisir directement un Profil remplace l’ensemble actif par ce seul Profil et règle le Mode sur **Manuel**. Les lignes des Modes montrent les icônes et couleurs des Profils associés pour distinguer Modes et Profils même lorsqu’ils portent le même nom. Les lignes intégrées expliquent brièvement quand elles s’appliquent.

Dans les automatisations, utilisez l’action standard de sélection de Home Assistant :

```yaml
action: select.select_option
target:
  entity_id: select.velair_mode
data:
  option: Vacation
```

Les identifiants de Mode restent stables lorsque leur nom visible change : la sélection actuelle survit donc au renommage. Le nom d’option visible est cependant l’état de l’entité Home Assistant ; les automatisations qui référencent une option renommée ou supprimée doivent être mises à jour.

Modifier les associations du Mode actuellement sélectionné active son nouvel ensemble de profils en une seule modification atomique. Supprimer le Mode sélectionné laisse ses profils actifs en place et règle le sélecteur sur **Manuel**. Supprimer un profil supprime aussi les Modes qui lui sont associés et retire uniquement ce profil de l’ensemble actif ; Velair revient à **Par défaut** lorsque l’ensemble devient vide.

<a id="seasonal-selection"></a>
## Sélection saisonnière

Le [blueprint de sélection climatique saisonnière](blueprints/seasonal-climate-selection.fr.md) peut choisir un Mode à partir d’un maximum journalier ou d’un autre capteur de température après un changement stable. Liez les Profils d’hiver et d’été aux horaires du même modèle et attribuez-leur des préréglages différents. Configurez un Profil de temps doux avec pause et extinction lorsqu’aucune climatisation n’est souhaitée. Coordonnez cette automatisation avec les règles de présence : un autre relevé stable peut remplacer un Mode Absence choisi manuellement.

<a id="interactions"></a>
## Interactions

- Les pauses globales et par zone sont prioritaires sur un changement de profil.
- Les Forçages des zones concernées sont annulés lors de l’activation d’un profil.
- Le préconditionnement adaptatif recalcule sa préparation selon la programmation effective du profil.
- Room Assist suit la cible de la programmation effective du profil.
- Le Confort environnemental reste uniquement une surveillance et n’est pas modifié.
- Le chauffage, le refroidissement, le mode chaud/froid, les blocs d’arrêt et les commandes climatiques facultatives prises en charge fonctionnent comme dans les programmations par défaut.

<a id="restart-and-portability"></a>
## Redémarrage et portabilité

L’ensemble des profils actifs, les Modes personnalisés et l’identifiant du Mode sélectionné sont enregistrés dans le backend Velair. Après un redémarrage de Home Assistant, l’entité native de sélection est reconstruite à partir de cet état ; elle n’active pas de profil de façon indépendante. Le réglage existant **Appliquer le programme actif au démarrage** contrôle uniquement l’envoi immédiat par Velair de la cible effective actuelle aux équipements. S’il est désactivé, Velair conserve le profil et calcule les événements futurs sans changer l’état des équipements au démarrage. S’il est activé, une programmation de profil applique son bloc actuel, le comportement `Pause and turn off` (pause avec extinction) éteint la zone et une simple `Pause` la laisse inchangée. Les Forçages actifs, les pauses et une pause globale du planificateur conservent leur priorité habituelle.

Les exports portables V5 peuvent inclure les définitions des profils et des Modes dans des sections séparées. Ils n’incluent jamais l’intention du profil actif ou du Mode sélectionné : l’import ne peut donc pas activer implicitement un autre profil. Importer uniquement les profils retire les Modes dont les profils associés n’existent plus. Importer les Modes valide chaque association et rejette les chevauchements de zones configurées.

Dans **Réglages > Portabilité**, sélectionnez **Profils climatiques** et **Modes** pour l’export. À l’import, vérifiez et sélectionnez les deux sections avant de confirmer. Les définitions sélectionnées sont écrasées, mais l’ensemble des Profils actuellement actifs et la sélection du Mode ne sont jamais importés.

Chaque Mode associe un ou plusieurs Profils dont les zones configurées ne se chevauchent pas. L’ensemble complet s’active de façon atomique ; l’activation directe d’un Profil remplace l’ensemble par ce seul Profil et sélectionne Manuel.
