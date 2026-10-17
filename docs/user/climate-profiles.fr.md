<a id="climate-profiles"></a>
# Profils climatiques

<!-- velair-docs:start -->
Traductions: [Original en anglais](climate-profiles.md) · [Español](climate-profiles.es.md) · [Français](climate-profiles.fr.md) · [Deutsch](climate-profiles.de.md) · [Italiano](climate-profiles.it.md) · [Nederlands](climate-profiles.nl.md) · [Polski](climate-profiles.pl.md) · [Português (Brasil)](climate-profiles.pt-br.md) · [Português (Portugal)](climate-profiles.pt-pt.md) · [Русский](climate-profiles.ru.md) · [État des traductions](../translation-status.md)

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

Les profils climatiques permettent à Velair de faire passer plusieurs zones climatiques d’un programme hebdomadaire coordonné à un autre sans remplacer leurs programmations par défaut. Home Assistant reste responsable des décisions : la présence, les fenêtres, les saisons, les sélecteurs, les capteurs ou d’autres automatisations décident quand changer de profil, tandis que Velair enregistre, applique et affiche le comportement climatique obtenu.

Un **Profil** définit une routine climatique alternative pour ses zones configurées. Un **Mode** sélectionne un ou plusieurs Profils sans chevauchement comme **base** du foyer. Vous pouvez ensuite appliquer des Profils comme **exceptions de zone**, y compris à une partie d’un Profil multizone, sans changer les autres pièces. Établissez une base pour changer toute la configuration ; appliquez des exceptions pour des routines indépendantes.

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

Chaque ligne de Profil garde ses actions dans une colonne à droite : définir comme base, appliquer comme exception de zone, puis supprimer. Elles restent à côté du nom même à faible largeur. Les boutons ont un fond transparent et de l’espace au bord ; l’icône et la couleur indiquent l’état actif. La description reste visible, avec des pastilles compactes **Base** et **Exception** dessous pour les usages actuels. Les Profils inutilisés n’ont pas de pastille et l’action de base reste neutre tant que le Profil n’appartient pas à la base. Un Profil utilisé uniquement comme exception met en valeur son action de couches, pas celle de base. Une base entièrement remplacée garde son identité de base. Ces états décrivent la sélection enregistrée, pas l’activité du thermostat. Sélectionner la ligne ouvre l’éditeur ; les actions de base et d’exception ne changent pas la sélection d’édition. Confirmer la suppression du Profil en cours d’édition vide son éditeur.

Pour chaque équipement climatique géré, choisissez un comportement :

- **Ne participe pas** : ce Profil ne prend pas en charge la zone.
- **Planification par défaut** : continuer à utiliser la programmation hebdomadaire habituelle de cette zone.
- **Planification du Profil** : utiliser une programmation hebdomadaire complète enregistrée dans le Profil.
- **Mettre en pause** avec **Ne pas modifier le thermostat** : arrêter les changements programmés et laisser l’équipement dans son état actuel.
- **Mettre en pause** avec **Éteindre le thermostat** : arrêter les changements programmés et éteindre l’équipement.

Chaque zone en **Planification du Profil** garde sa **Répartition des jours**. Choisissez Jours individuels, Semaine / Week-end ou Tous les jours avant de choisir un jour. Les sept cellules gardent leurs positions ; la répartition sélectionne un jour, les jours de semaine/le week-end ou toute la semaine ensemble. Modifier le groupe met à jour ces jours dans le brouillon ; **Enregistrer le profil** enregistre le Profil complet. Si les jours diffèrent, examinez-les et choisissez explicitement une base avant de remplacer leurs configurations. Les autres jours restent inchangés. La répartition est conservée avec le brouillon lors d’un changement temporaire de comportement d’une zone. Les cellules sélectionnées contiguës sont reliées visuellement et la chronologie montre les blocs communs. Les différences apparaissent comme des alternatives visuelles compactes : les configurations identiques sont regroupées, avec les barres chronologiques en lecture seule de Vue d’ensemble et les libellés de cible/mode. Aucun inventaire permanent de blocs dessous ; l’icône d’information ouvre tous les horaires et réglages au survol, au focus clavier ou au toucher, sans sélectionner la base. Cliquez ou touchez une alternative pour choisir une seule base, identifiée par son fond et sa bordure. Les alternatives restent visibles pour changer de base avant d’enregistrer. Avec **Tous les jours** ou **Semaine / Week-end**, choisissez l’horaire et utilisez **Enregistrer le profil** avant d’accéder à l’éditeur commun, sans autre confirmation de remplacement. Le groupe contient sept jours, cinq jours de semaine ou deux jours de week-end ; les autres jours conservent leurs horaires. Un échec conserve l’alternative sélectionnée. Les blocs communs peuvent ensuite être modifiés et enregistrés avec le Profil. Les flèches, Espace et Entrée permettent la sélection au clavier. Un groupe mixte exige une base avant d’activer **Enregistrer le profil**. Les résumés près d’Enregistrer indiquent chaque source, zone et jours de destination. L’enregistrement inclut aussi les autres modifications du Profil en attente. Les alternatives visuellement identiques identifient leurs dépendances différentes aux modèles/préréglages par des libellés compacts. Les alternatives vides affichent **Aucun bloc propre** ; leur aide explique que l’application supprime les blocs propres et qu’un jour vide n’est pas une commande d’arrêt. Consultez [Répartition des jours et modification groupée](usage.fr.md#create-a-daily-schedule) pour les groupes, jours différents et portabilité.

La planification par défaut inclut explicitement la zone, y compris pour valider les chevauchements. Une zone qui ne participe pas hérite de la base, ou de Par défaut si aucun Profil de base ne l’inclut. Les modèles peuvent toujours être copiés sous forme de blocs indépendants. Un jour de la programmation par défaut ou d’un Profil peut aussi lier uniquement ses horaires à un modèle en conservant ses propres réglages climatiques, ou suivre le modèle complet avec toutes ses commandes en lecture seule. Les modèles et les blocs indépendants peuvent référencer des préréglages Velair partagés. Consultez [Préréglages de blocs et modèles liés](linked-schedules.fr.md) pour les règles de propagation, de dissociation, de compatibilité et de modification partagée, et [l’exemple Hiver/Été](linked-schedule-examples.fr.md#2-winter-and-summer-with-one-set-of-times) pour partager les mêmes horaires avec des réglages climatiques différents. Copier un jour conserve le type de lien au modèle, les affectations des liens horaires uniquement et les références aux préréglages de blocs. La copie vers un autre thermostat valide le Profil proposé avant de modifier le brouillon ; les autres jours de destination conservent leurs liens existants. Utilisez Dissocier après la copie si le nouveau jour doit être indépendant du modèle.

Pour une zone déléguée à un contrôleur externe, les Profils et les Modes choisissent la semaine complète effective que Velair publie, plutôt que de provoquer des actions directes sur `climate.*`. **Planification par défaut** publie la semaine habituelle et **Planification du Profil** publie la semaine du Profil. Le comportement **Mettre en pause** n’est pas disponible pour une zone gérée en externe. L’éditeur du Profil ajoute les capacités du contrôleur à la validation ; un échec de publication n’annule pas la sélection enregistrée du Profil ou du Mode et n’affecte pas les zones exécutées localement. Consultez [Exécution externe des programmations](external-systems.fr.md) pour les limites actuelles des contrôleurs et le fonctionnement de la publication.

Depuis un jour modifié du Profil, **Enregistrer comme modèle** enregistre uniquement un modèle réutilisable via le backend et laisse le brouillon du Profil inchangé. Pour réutiliser la sélection dans d’autres équipements gérés, sélectionnez-les dans **Autres thermostats**, puis choisissez **Cloner**. Son libellé suit la répartition : un jour, lundi–vendredi, samedi–dimanche ou tous les jours. La confirmation résume les équipements, liste les jours et identifie les zones Par défaut/Pause passant à **Planification du Profil**. Le clonage remplace uniquement les jours correspondants, conserve tous les autres jours et la répartition de destination, et reste dans le brouillon du Profil. Le clonage d’un jour vers un autre est disponible uniquement avec **Jours individuels**. Les éditeurs groupés omettent ce panneau et le raccourci de répartition ; utilisez le sélecteur **Répartition des jours** normal. Les éditeurs Par défaut et Profil utilisent le même groupe sélectionné pour copier vers d’autres thermostats. Velair valide le type de cible, le mode HVAC, les limites et le pas de température de chaque destination avant de changer le brouillon. Les options non prises en charge sont retirées. Si un bloc d’options n’a plus de contrôles compatibles, ou si une cible ou un mode est incompatible, aucune modification du brouillon n’est appliquée. Les jours clonés deviennent persistants uniquement en enregistrant le Profil.

Chaque jour du profil utilise la même chronologie modifiable que les programmations par défaut et les modèles, avec glissement et redimensionnement pour ajuster les horaires. Les blocs ont une heure de début sans heure de fin distincte : le dernier bloc se poursuit au-delà de minuit et pendant les jours vides jusqu’au début d’un autre bloc. La chronologie représente la partie héritée du jour par un segment distinct non modifiable et indique le jour où ce bloc est réellement configuré. Tant qu’un Profil reste ouvert dans l’éditeur, faire passer temporairement une zone de **Planification du Profil** à **Planification par défaut** ou **Mettre en pause** conserve sa programmation hebdomadaire dans le brouillon. Choisir de nouveau **Planification du Profil** restaure ces blocs non enregistrés. Enregistrer le Profil avec Par défaut ou Pause ne conserve toutefois que ce comportement sélectionné ; la programmation masquée du brouillon n’est pas persistée. Le sélecteur de thermostat affiche les noms conviviaux et l’éditeur actif montre aussi l’ID de l’entité. Les métadonnées et programmations du Profil sont toujours enregistrées ensemble, de façon atomique ; changer de thermostat sélectionné n’enregistre pas un brouillon partiel.

Plusieurs Profils peuvent former une base lorsqu’un Mode les coordonne. Leurs zones ne doivent pas se chevaucher. Les exceptions peuvent remplacer des zones individuelles de cette base : chaque équipement géré a toujours exactement une routine effective. Les blocs ne sont pas fusionnés et les anciennes exceptions ne forment pas une pile de priorités.

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

Utilisez le bouton de lecture d’un Profil dans **Programmes > Planifications des Profils** pour l’activer directement, ou **Configuration active** dans Vue d’ensemble ou en haut de **Modes**. La carte sépare **Base** et **Exceptions** et indique si la base vient d’un Mode, d’un Profil, de plusieurs Profils ou de Par défaut. Choisissez **Changer** pour sélectionner un Mode ou le groupe **Profils**. Sélectionner une ligne de Profil l’établit comme base complète ; l’icône de couches applique uniquement ses zones configurées comme exceptions. Un choix direct remplace l’ensemble actif par ce Profil et passe le Mode à **Manuel** ; **Par défaut** signifie qu’aucun Profil alternatif n’est actif. L’activation est aussi possible depuis la ligne, Configuration active ou `velair.activate_profile`. Velair applique le bloc actuellement actif, y compris le dernier d’un jour précédent si aucun nouveau bloc n’a commencé aujourd’hui, sans attendre la prochaine transition.

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

L’onglet Modes affiche la base sélectionnée et ses exceptions dans **Configuration active**. Le sélecteur groupé liste Par défaut et les Modes personnalisés en premier, avec les actions de base et d’exception des Profils séparées. Manuel reste un état du sélecteur Home Assistant natif, pas le nom de base du panneau. Sélectionner un Mode active ses Profils associés ; sélectionner directement un Profil remplace l’ensemble actif par ce seul Profil et passe le Mode à **Manuel**. Les lignes de Mode montrent les icônes et couleurs des Profils associés pour les distinguer même avec le même nom. Les lignes intégrées expliquent brièvement quand elles s’appliquent.

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

<a id="a-base-with-independent-zone-exceptions"></a>
## Une base avec des exceptions de zone indépendantes

Un Profil peut inclure plusieurs pièces. L’appliquer comme exception remplace la routine uniquement dans ses pièces explicitement configurées ; cela ne change pas les autres pièces et ne réécrit pas le Profil. Chaque pièce utilise une routine hebdomadaire complète, jamais un mélange de blocs de plusieurs Profils.

Par exemple, une base **Hiver** couvre bureau, salon et chambre. **Télétravail** inclut bureau et salon ; **Invités** inclut salon et chambre d’amis :

| Changement | Bureau | Salon | Chambre | Chambre d’amis |
| --- | --- | --- | --- | --- |
| Sélectionner la base Hiver | Hiver | Hiver | Hiver | Par défaut |
| Appliquer Télétravail | Télétravail | Télétravail | Hiver | Par défaut |
| Appliquer ensuite Invités | Télétravail | Invités | Hiver | Invités |
| Rétablir la base du salon | Télétravail | Hiver | Hiver | Invités |

Rétablir la base du salon ne réactive pas Télétravail : les exceptions n’ont pas de pile d’historique. Choisir explicitement Par défaut est différent : cela utilise l’horaire normal de la zone même si la base contient une autre routine.

Utilisez **Appliquer comme exception** dans Configuration active ou une automatisation :

```yaml
action: velair.apply_profiles
data:
  profile_ids: [remote_work]
```

Une demande ne peut appliquer plusieurs Profils que s’ils incluent des zones différentes. `[remote_work, guests]` est rejeté entièrement car les deux incluent le salon. Appliquer Invités plus tard remplace intentionnellement l’exception du salon et conserve celle du bureau.

Pour appliquer une seule pièce d’un Profil multizone :

```yaml
action: velair.set_zone_profile
data:
  entity_id: climate.office
  profile_id: remote_work
```

Le Profil doit explicitement inclure cette pièce gérée. Utilisez `profile_id: null` pour imposer Par défaut. Pour retirer une exception et hériter de la base actuelle :

```yaml
action: velair.clear_profile_overrides
data:
  entity_id: [climate.office, climate.living_room]
```

Pour remplacer toute la base et retirer toutes les exceptions sans créer de Mode :

```yaml
action: velair.activate_profiles
data:
  profile_ids: [winter_office, winter_bedrooms]
```

Les Profils de base ne doivent pas se chevaucher. Une liste d’activation vide sélectionne Par défaut ; des listes d’application ou d’effacement vides ne font rien. Les nouvelles actions exigent leurs champs : une valeur omise ne signifie jamais « toutes les pièces » ni « Par défaut ».

Configuration active affiche **Base** et son type au-dessus du nom, sur deux niveaux compacts sur téléphone et carte étroite. Les noms longs se replient. Une ligne de couverture indique combien de zones incluses héritent encore de la base. Les exceptions, y compris Par défaut explicite ou le même Profil, sont exclues. Les zones hors d’une base Profil utilisent Par défaut et ne comptent pas dans cette base ; une base Par défaut inclut toutes les zones gérées. Cela décrit l’attribution de sélection, pas l’activité des appareils. Une base sans zone se distingue d’une base entièrement remplacée. Sous la couverture de base, **Répartition du foyer** est repliée initialement. Son libellé indique le total du foyer indépendamment des zones de base. Sélectionnez-le pour révéler la barre de 6 px et toute la légende ; sélectionnez à nouveau ou appuyez sur Échap pour replier. L’en-tête reste en place, le contenu s’étend vers le bas avec une courte transition respectant les préférences de réduction du mouvement. La barre représente toutes les zones gérées avec les couleurs des Profils. Les segments d’exceptions incluent les zones hors base et correspondent aux nombres de la liste. Les zones hors base sans exception ont un segment neutre Par défaut séparé. La légende compacte utilise des icônes de Profil de 14 px, les noms et l’origine, avec les nombres dans une colonne alignée à droite. Les exceptions Par défaut explicites sont aussi neutres. Base, exception et recours restent distincts même avec la même couleur. La couverture propre de la base reste séparée et n’apparaît qu’une fois. Une base Profil vide peut avoir une barre avec des zones Par défaut ; sans zone gérée, aucune barre. Ces nombres décrivent l’attribution, pas l’état physique. Les Profils de base participants apparaissent dans la légende développée ; une base Mode ne répète pas une liste de composants au-dessus. Sur ordinateur, la base occupe moins de largeur que les exceptions ; son icône est alignée en haut du nom et du type. Le titre Exceptions utilise l’icône de couches, comme les actions d’exception. **Exceptions** liste chaque Profil avec un bouton de nombre de zones ; les exceptions Par défaut explicites ont leur groupe. Les noms de pièces restent cachés jusqu’à ouverture. Cliquez n’importe où sur une ligne d’exception pour développer ses pièces dessous sans remplacer les autres exceptions. Cliquez à nouveau ou appuyez sur Échap pour replier ; ouvrir un autre groupe ferme le précédent. La courte transition respecte la réduction du mouvement. La ligne et son nombre restent en place ; les détails poussent les lignes suivantes vers le bas, permettant de refermer avec le même bouton. Les longues listes défilent dans la zone développée. Une base sans modification affiche **Aucune exception** et reste visible même si toutes ses pièces sont remplacées. Configuration active n’a pas d’espace d’édition par zone séparé ; utilisez les actions documentées pour les modifications ciblées. Le sélecteur Mode natif affiche Manuel tant que des exceptions existent. Les effacer toutes rétablit le libellé d’origine du Mode s’il existe encore. Choisir un Mode personnalisé, Par défaut, un seul Profil ou une liste complète remplace explicitement la base et efface les exceptions. L’option native Manuel libère uniquement l’association au Mode et conserve base et exceptions.

Modifier un Mode de base conserve ses exceptions. Renommer ou modifier un Profil garde les références actives : les horaires modifiés affectent les pièces qui les utilisent. Ajouter une pièce à un Profil n’étend pas une exception déjà appliquée ailleurs. Retirez une exception avant de supprimer de son Profil la pièce référencée. Supprimer un Profil, ou importer des définitions le supprimant, retire ses exceptions et ramène les pièces à la base restante ou à Par défaut.

Home Assistant décide toujours de la combinaison saison, présence et routine personnelle. Un Mode saisonnier est une sélection complète, pas une couche au-dessus des exceptions. Recalculez les sélections de pièces après un changement de saison. Les actions sur des pièces différentes se composent ; celles visant la même pièce sont acceptées dans l’ordre. Une sélection de base complète peut toutes les remplacer.

Toutes les actions explicites de sélection annulent un Retour prévu en attente, même une sélection répétée. Les listes d’application/effacement vides ne le font pas. L’annulation peut affecter la préparation ailleurs dans la maison. Elle est enregistrée séparément de la sélection suivante : si cette dernière échoue, l’ancienne sélection peut subsister avec le Retour prévu déjà annulé. Les demandes invalides ne l’annulent jamais.

Les changements de sélection sont enregistrés ensemble, mais les appareils peuvent les appliquer à des moments différents ou signaler des échecs individuels. Les pauses et restrictions de transmission restent prioritaires. Un simple changement d’attribution n’annule pas le Forçage et n’envoie pas d’actions climatiques en double si la routine effective est inchangée. Les pièces à exécution externe publient leur semaine effective selon les restrictions du fournisseur. Les Profils ne suppriment pas les contraintes d’équipements partagés.

L’intention complète de base et d’exceptions survit au redémarrage. Les exports portables contiennent les définitions, pas cette intention active ; un import n’active jamais de nouveaux Profils.

<a id="seasonal-selection"></a>
## Sélection saisonnière

Le [blueprint de sélection climatique saisonnière](blueprints/seasonal-climate-selection.fr.md) peut choisir un Mode à partir d’un maximum journalier ou d’un autre capteur de température après un changement stable. Liez les Profils d’hiver et d’été aux horaires du même modèle et attribuez-leur des préréglages différents. Configurez un Profil de temps doux avec pause et extinction lorsqu’aucune climatisation n’est souhaitée. Coordonnez cette automatisation avec les règles de présence : un autre relevé stable peut remplacer un Mode Absence choisi manuellement.

<a id="interactions"></a>
## Interactions

- Les blocs **Température uniquement** gardent leur politique dans les Profils, préréglages, modèles et liens de modèles. Activer un Profil ou un Mode avec ce bloc met à jour sa cible sans demander de changement de mode HVAC et sans allumer un équipement éteint ; l’intégration doit accepter les cibles à l’arrêt.
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
