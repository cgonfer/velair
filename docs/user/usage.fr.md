<a id="usage-guide"></a>
# Guide d’utilisation

<!-- velair-docs:start -->
Traductions: [Original en anglais](usage.md) · [Español](usage.es.md) · [Français](usage.fr.md) · [Deutsch](usage.de.md) · [Italiano](usage.it.md) · [Nederlands](usage.nl.md) · [Polski](usage.pl.md) · [Português (Brasil)](usage.pt-br.md) · [Português (Portugal)](usage.pt-pt.md) · [Русский](usage.ru.md) · [État des traductions](../translation-status.md)

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

Ce guide présente Velair du point de vue d’un utilisateur de Home Assistant.

<a id="panel-navigation-and-direct-links"></a>
## Navigation du panneau et liens directs

Le panneau latéral met à jour son URL lorsque vous changez d’onglet ou passez
d’une sous-section à l’autre dans Programmes et Modèles.
Actualiser la page ou ouvrir une URL copiée rétablit cette section. Les boutons
Précédent et Suivant du navigateur suivent également cette navigation.

| Section | Chemin |
| --- | --- |
| Vue d’ensemble | `/velair` |
| Programmes : Par défaut | `/velair/schedules/default` |
| Programmes : Profils | `/velair/schedules/profiles` |
| Modes | `/velair/modes` |
| Modèles : Modèles | `/velair/templates/templates` |
| Modèles : Préréglages climatiques | `/velair/templates/presets` |
| Capteurs | `/velair/sensors` |
| Confort | `/velair/comfort` |
| Anticipation | `/velair/preconditioning` |
| Retour prévu | `/velair/planned-return` |
| Diagnostic | `/velair/diagnostics` |
| Paramètres | `/velair/settings` |

Utilisez ces chemins dans les actions de navigation des tableaux de bord Home
Assistant, ou ajoutez-les à l’adresse de votre Home Assistant pour créer un lien
complet. Ouvrir un lien sélectionne une section ; cela n’active aucun Mode et ne
modifie aucun paramètre climatique.

Par exemple, un bouton du tableau de bord peut ouvrir la bibliothèque de
préréglages climatiques :

```yaml
type: button
name: Velair climate presets
icon: mdi:thermometer-lines
tap_action:
  action: navigate
  navigation_path: /velair/templates/presets
```

Remplacez `navigation_path` par n’importe quel chemin du tableau. Cette méthode
utilise l’[action de navigation standard des tableaux de bord](https://www.home-assistant.io/dashboards/actions/)
Home Assistant. Pour un favori ou un lien depuis une autre application, utilisez
votre propre adresse Home Assistant suivie du chemin, par exemple
`https://your-home-assistant.example/velair/schedules/profiles`.

`/velair/schedules` ouvre Par défaut et `/velair/templates` ouvre Modèles.
`/velair/preconditioning` ouvre Anticipation et `/velair/planned-return` ouvre l’onglet distinct Retour prévu. Les anciens liens de sous-section ouvrent l’onglet correspondant. `/velair/overview` ouvre Vue d’ensemble et l’ancien chemin
`/velair/profiles` ouvre Modes. Une sous-section inconnue ouvre la sous-section
par défaut de son onglet ; un onglet inconnu ouvre Vue d’ensemble. Ces chemins
sont normalisés sans ajouter d’entrée dans l’historique.

Les liens ne conservent pas la sélection d’un appareil de chauffage ou de climatisation, d’un jour de
la semaine, d’un Profil, d’un modèle ou d’un préréglage. Les modifications non
enregistrées ne sont pas récupérées après une actualisation. Les confirmations
d’abandon existantes s’appliquent lorsque la navigation risque de supprimer des
modifications non enregistrées ; annuler conserve la section et l’URL actuelles.
Les cartes Lovelace facultatives conservent les URL de leurs tableaux de bord.

Lorsque le panneau latéral est ouvert, ses onglets partagent les dernières
données confirmées du backend. Après le premier chargement, changer d’onglet ne
répète pas ce chargement initial. Les mises à jour se poursuivent pendant la
navigation et les confirmations relatives aux modifications non enregistrées
restent applicables. Actualiser la page recharge les données sans récupérer les
brouillons. Les cartes Lovelace facultatives utilisent une session distincte du
panneau. Les cartes montées sur la même connexion Home Assistant partagent leur
chargement initial et leurs mises à jour en direct, tout en gardant leurs propres
commandes et modifications non enregistrées. Lovelace peut conserver des cartes
montées lorsque vous visitez une autre vue du tableau de bord, ce qui permet d’y
revenir sans les recharger. La session partagée se ferme lorsque la dernière
carte est démontée ; actualiser la page lance un nouveau chargement. Aucune
modification YAML n’est nécessaire.

<a id="help-and-documentation"></a>
## Aide et documentation

Ouvrez **Paramètres → Aide et communauté** pour consulter la documentation,
signaler un problème dans GitHub Issues ou partager questions et suggestions
dans Discussions. Utilisez l’icône d’aide près du titre d’une section ou à droite
d’un choix de sous-menu pour ouvrir une courte explication et un lien **Ouvrir le guide**. Ouvrir l’aide d’un sous-menu ne le sélectionne pas et ne modifie pas vos
changements. L’explication et le guide correspondent à ce choix, même lorsque
cette section n’est pas active. Dans Paramètres, l’icône d’aide des **Réglages
externes** propose également leur guide. Les icônes d’aide utilisent un symbole
de point d’interrogation cohérent et sont mises en évidence au survol ; les
icônes d’information continuent à fournir de brèves explications sur les champs.
Fermez la boîte de dialogue avec son bouton de fermeture, Échap ou un clic à
l’extérieur ; le focus du clavier revient à l’icône d’aide.

Les courtes explications restent disponibles dans Velair dans toutes les langues
d’interface prises en charge, y compris sans connexion Internet. Les liens des
guides utilisent votre langue Home Assistant lorsqu’une traduction est disponible
et reviennent à l’anglais pour chaque guide sans traduction. Le lien indique
**En anglais** uniquement lorsqu’il utilise ce choix de repli. Les guides traduits
affichent leur état de synchronisation avec la source et de révision linguistique,
avec un lien vers l’original anglais lorsque des changements sont en attente.
Les versions publiées ouvrent la documentation de leur tag de version
correspondant ; les versions de développement ouvrent la documentation actuelle
de `main`. Les liens vers la documentation et la communauté ouvrent GitHub dans
un nouvel onglet et nécessitent Internet uniquement lors de leur ouverture ;
ils ne téléversent automatiquement ni diagnostic ni configuration locale.

<a id="concepts"></a>
## Concepts

Velair gère les programmations des entités `climate.*` sélectionnées lors de la
configuration de l’intégration. Chaque entité sélectionnée constitue une zone
climatique gérée.

Une programmation comporte des blocs pour chaque jour de la semaine. Un bloc
commence à une heure précise et peut :

- définir une température cible, éventuellement avec un mode HVAC et les options
  prises en charge, comme le mode de ventilation, le mode prédéfini, l’oscillation,
  l’oscillation horizontale ou l’humidité cible ;
- définir une ou plusieurs options climatiques prises en charge sans envoyer de
  température cible ni modifier le mode HVAC ;
- modifier uniquement le mode HVAC et laisser l’appareil gérer la consigne ;
- éteindre l’entité climatique.

Un bloc reste actif jusqu’au début du bloc suivant dans la programmation
hebdomadaire. Cela inclut minuit et les jours vides : avant le premier bloc d’un
jour, Velair conserve le bloc le plus récent d’un jour précédent. La chronologie
affiche séparément cette période héritée pour indiquer clairement où le bloc a
été configuré à l’origine.

<a id="external-adjustments-and-manual-adjustment"></a>
## Ajustements externes et réglage manuel

Chaque zone peut choisir ce que fait Velair lorsque son mode HVAC ou sa consigne
change en dehors de Velair, par exemple depuis une carte climatique Home
Assistant, une télécommande infrarouge ou une autre automatisation. Configurez
les **Réglages externes** dans chaque ligne d’appareil de chauffage ou de climatisation géré, dans
**Paramètres** :

- **Maintenir automatique** est l’option par défaut et réapplique l’intention
  actuelle de Velair.
- **Jusqu’au prochain bloc** respecte l’ajustement jusqu’au début du prochain
  bloc effectif.
- **Pour une durée** reprend après le nombre de minutes configuré.
- **Jusqu’à la reprise** attend une action explicite.

Lorsque Velair cède la main, Vue d’ensemble sélectionne **Réglage manuel**
dans sa commande permanente Automatique/Manuel. Ce n’est pas le Mode Velair
**Manuel** : le Mode Manuel décrit la façon dont les Profils ont été sélectionnés,
tandis que le réglage manuel décrit qui contrôle actuellement un appareil.
La reprise réapplique la programmation du Profil actif, la programmation Par
défaut ou l’autre intention actuelle du planificateur. Les autres raisons de
pause indépendantes restent en vigueur.

Vue d’ensemble sélectionne **Programmation automatique** lorsque Velair contrôle
l’appareil. Sélectionnez **Réglage manuel** pour conserver l’état actuel de
l’appareil sans le modifier au préalable ; l’action utilise la politique Manuelle
déjà enregistrée dans Paramètres. Si **Maintenir automatique** est enregistré,
une action Manuelle explicite reste Manuelle jusqu’à la reprise sans modifier ce
paramètre. La même opération est disponible via `velair.enter_manual_adjustment` ;
elle capture l’état de chauffage, refroidissement, arrêt ou plage native en cours
et accepte uniquement l’identifiant de l’entité climatique.

Avec **Maintenir automatique**, Room Assist recalcule et réapplique la consigne
qui fait autorité. Avec une politique Manuelle, il cède la main sans rétablir sa
correction programmée. Les consignes scalaires et les plages natives sont prises
en charge.

Le guide complet explique les limites de détection, chaque politique, les
ajustements répétés, les Profils et Modes, la priorité du Forçage et des pauses,
le comportement au redémarrage, le YAML exact des services et événements, ainsi
que des chronologies réelles détaillées étape par étape. Consultez
[Changements externes et réglage manuel](manual-control.fr.md).

Velair calcule les événements à venir dans le backend et programme des rappels
ponctuels exacts via Home Assistant. L’interface s’abonne aux mises à jour du
backend par WebSocket ; aucune interrogation continue n’est donc nécessaire.

Pendant un épisode de Retour prévu, Vue d’ensemble affiche un résumé compact du foyer : origine hebdomadaire ou ponctuelle, processus actuel et heure de confirmation ou d’arrivée applicable. Il utilise le fond habituel des cartes du thème, une bordure violette discrète et l’icône principale de retour ; les autres icônes gardent la couleur du texte. Un retour futur accepté ajoute des compteurs de préparation avec aide au survol, au clavier et au toucher. Un départ confirmé affiche une chronologie compacte en lecture seule avec heures et Modes de départ/arrivée, à côté du résumé si la place suffit ou dessous dans un conteneur étroit. Le bouton de navigation ouvre l’onglet Retour prévu ; le résumé ne duplique pas les commandes de départ. Un incident peut rester visible même sans départ actif.

Chaque appareil concerné affiche un signal violet de Retour prévu lorsque le
backend indique que le mode Absence ou la préparation à l’arrivée fait
actuellement autorité. Son état de fonctionnement normal, son Profil et les
informations Room Assist restent visibles. Les heures de préparation futures
sont des informations prévisionnelles, pas un indicateur de contrôle actif. Le
contrôle manuel, le Forçage, les pauses indépendantes, l’arrêt de la programmation
et l’exécution externe conservent leur priorité. Un appareil qui garde simplement
la programmation Par défaut sous un Mode Absence personnalisé ne reçoit pas de
signal Absence. L’indicateur décrit l’intention de contrôle ; il ne prouve ni la
transmission réussie d’une commande ni l’atteinte de la consigne dans la pièce.

Les informations de préparation du retour sont distinctes de l’indicateur d’autorité : chaque équipement peut afficher son état en attente, en préparation, prêt, suspendu, indisponible ou à l’arrivée uniquement, son début estimé, sa cible d’arrivée et le motif pertinent même s’il suit encore Absence. Les estimations manquantes ne sont pas remplacées par des heures supposées. Les retours inactifs ne conservent pas d’aperçu futur.

Lorsqu’un appareil géré ne publie pas `target_temp_step`, sa ligne dans
**Paramètres** affiche **Pas de température**. Velair utilise `1` par défaut et
permet à l’utilisateur de renseigner le pas positif réel de l’appareil. Velair
mémorise le dernier pas valide signalé par Home Assistant, de sorte qu’une entité
qui cesse de le publier n’invalide pas les consignes décimales existantes. Un pas
actuellement publié est toujours prioritaire. Enregistrer une valeur manuelle
lorsque l’attribut est absent remplace la valeur mémorisée utilisée en repli.
Si l’entité publie de nouveau un pas, Velair mémorise cette nouvelle grille même
si la valeur manuelle de repli reste enregistrée.

La section **Diagnostic** du panneau fournit un instantané en lecture seule du
planificateur et de chaque zone, un historique limité à l’exécution actuelle et
un rapport JSON expurgé à joindre aux signalements. Elle n’ajoute pas
d’interrogation périodique et ne dépend pas de Recorder. Sur ordinateur, les
colonnes du journal peuvent être redimensionnées pour la session actuelle ; leurs
largeurs sont réinitialisées au rechargement du panneau et ne sont jamais
enregistrées. Sur mobile, les mêmes événements utilisent une disposition
adaptative compacte à la place des commandes de redimensionnement.

Diagnostic affiche également l’état du Retour prévu du foyer et la participation
effective de l’appareil sélectionné, l’estimation de préparation et toute raison
de suspension. La désactivation de la routine hebdomadaire est distincte de la
disponibilité des retours ponctuels. La catégorie d’historique **Retour prévu**
enregistre la planification acceptée, la confirmation, le départ, les changements
d’arrivée, les débuts de préparation, la fin, l’annulation et les erreurs. Elle
partage la limite existante de 100 événements et s’efface au redémarrage ; les
préférences de catégories restent enregistrées. Actualiser l’une ou l’autre vue
n’ajoute pas d’entrées. Les rapports incluent ce contexte, en supprimant les
identifiants des Modes et Profils même lorsque les identifiants d’entités sont
explicitement inclus.

<a id="home-assistant-entities"></a>
## Entités Home Assistant

Velair crée des entités Home Assistant persistantes qui complètent ses événements
d’automatisation transitoires :

- **Prochain événement programmé** est un capteur d’horodatage correspondant à
  l’action Velair en attente la plus proche. Ses attributs incluent tous les
  événements partageant cette heure, l’heure calculée d’application et l’heure
  cible d’origine lorsque le Préconditionnement adaptatif démarre un bloc en avance.
- **État du planificateur** indique si Velair est inactif, programmé, soumis à une
  dérogation ou en pause. Ses attributs comprennent le mode global et l’expiration
  de la pause. Les détails des événements à venir et des dérogations par zone
  restent dans leurs capteurs dédiés pour éviter de dupliquer l’historique Recorder.
- **État du diagnostic** est un capteur de diagnostic à états énumérés `ok`,
  `warning` et `error`. Il n’expose que des attributs compacts : état du
  planificateur, nombres de zones sans problème/avec avertissement/en erreur, nombres
  d’incidents et codes actifs. L’état de santé actuel est ainsi disponible pour
  les tableaux de bord et les automatisations déclenchées par un état, sans
  exposer le texte brut des exceptions.
- **Température cible active** est créé une fois par appareil géré. Il expose la
  consigne actuellement gérée par Velair, y compris les forçages et les blocs déjà
  démarrés par le Préconditionnement adaptatif. Son unité suit celle de l’entité
  climatique. Pour une plage native, son état scalaire est indisponible car il
  n’existe pas de valeur unique correcte ; utilisez plutôt les attributs
  `target_temp_low` et `target_temp_high`.
- **Condition environnementale** est créé une fois par appareil géré. Il expose
  des états lisibles tels que confortable, froid, humide ou chaud et humide. Il
  conserve la qualité des données et les identifiants des entités sources dans
  des attributs compacts sans copier les relevés originaux de température ou
  d’humidité.
- **Possibilité d’aération** est créé une fois par appareil géré. Il expose un
  état énuméré prudent et purement indicatif décrivant si l’air extérieur peut
  rapprocher la pièce de sa zone de Confort configurée. Il n’ouvre pas les
  fenêtres et ne contrôle pas l’appareil.
- **Qualité de l’air** est créé une fois par appareil géré et conserve
  l’évaluation indépendante du CO2 : bonne, élevée, mauvaise, indisponible ou
  non surveillée.
- **Dérogation de zone** indique si cet appareil n’a actuellement aucune
  dérogation, un forçage actif ou une pause de zone active.
- **Contrôle de zone** est créé une fois par appareil géré et indique si le
  contrôle local est `automatic`, si un réglage manuel est actif ou si un
  fournisseur de programmation externe possède l’exécution sur l’appareil. Ses
  attributs donnent le contexte actuel du planificateur, Profil, Mode et
  réglage manuel.
- **Diagnostic de transmission de zone** est créé une fois par appareil géré sous
  la forme d’un capteur de diagnostic désactivé par défaut. Il expose le dernier
  résultat de transmission des commandes climatiques de l’exécution actuelle et la dernière cible
  dont Home Assistant a accepté la séquence complète de services, sans texte
  d’erreur brut ni affirmation sur ce qu’a fait l’appareil physique.
- **Début du préconditionnement** est un capteur d’horodatage contenant le début
  calculé du prochain bloc démarrant en avance, ou de celui actuellement actif.
  Ses attributs comprennent l’heure cible programmée, l’avance, la direction,
  la source du modèle, la température cible et le mode HVAC.
- **Room Assist** expose l’état actuel de Room Assist et un contexte compact
  de consigne, sans dupliquer les relevés originaux de la pièce et de l’appareil.
- **Programmation automatique** et **Mode** sont les entités de commande
  modifiables de Velair. Désactiver Programmation automatique arrête la
  programmation indéfiniment ; l’activer reprend la programmation active.
  Sélectionner un Mode personnalisé active ses Profils associés, tandis que
  **Par défaut** efface l’ensemble actif. **Manuel** signifie qu’aucun Mode
  personnalisé ne contrôle l’ensemble des Profils actifs ; une activation
  directe mène normalement à cet état. Velair l’affiche plutôt que de le
  proposer comme action. Utilisez l’action `velair.pause` lorsqu’une pause
  temporaire avec une durée est nécessaire.

Ces entités réutilisent les instantanés du backend, utilisent des mises à jour
par dispatcher et n’interrogent pas Home Assistant périodiquement. Les événements
servent à réagir aux transitions ; les entités servent lorsqu’une automatisation
ou un tableau de bord doit consulter l’état actuel. Room Assist peut ajuster la
consigne envoyée après la cible de contrôle acceptée ; utilisez le capteur
**Room Assist** dédié pour le contexte de cet ajustement appliqué. Consultez la
[Référence des capteurs](sensors.fr.md) pour la liste complète des capteurs Velair,
leurs principaux attributs et des exemples. Consultez
[Capteurs de contrôle et de transmission de zone](zone-sensors.fr.md) pour les contrats
plus détaillés concernant le contrôle, le Confort, l’aération et la transmission.

Lorsqu’un appareil est retiré des options de l’intégration Velair, Velair supprime
ses capteurs de zone générés du registre des entités Home Assistant lors du
rechargement. Les entités globales de Velair et celles des autres intégrations
ne sont pas affectées. Ajouter de nouveau l’appareil recrée ses capteurs avec
des identifiants uniques déterministes.

Home Assistant choisit les noms traduits des entités à partir de la langue du
backend lors de leur création initiale. Changer uniquement la langue d’interface
d’un utilisateur ne renomme pas les entrées existantes du registre. Les entités
existantes peuvent être renommées manuellement dans Home Assistant sans changer
leur comportement dans Velair.

<a id="open-velair"></a>
## Ouvrir Velair

Après la configuration, Velair apparaît dans la barre latérale de Home Assistant.

Le panneau latéral est l’interface recommandée. La carte Lovelace facultative est
utile pour intégrer certains panneaux Velair dans un tableau de bord existant.

Dans les tableaux de bord de type Sections, les cartes Velair utilisent une hauteur automatique afin que les commandes développées, les zones supplémentaires et le texte sur plusieurs lignes réservent de la place au-dessus de la carte suivante. Si une carte existante chevauche encore une autre carte après la mise à jour, vérifiez son YAML dans le tableau de bord : supprimez toute valeur numérique de `grid_options.rows` ou remplacez-la par `auto`. Les options de disposition enregistrées priment sur les valeurs par défaut de la carte :

```yaml
grid_options:
  columns: 12
  rows: auto
```

La liste des prochains événements de Vue d’ensemble et les cartes du tableau de bord montrent le prochain changement de contrôle prévu pour chaque équipement, y compris préparation estimée et arrivée pendant un Retour prévu confirmé. Toutes les lignes ont la même disposition compacte nom/source/heure/action/HVAC, sans sous-titre d’état sous le nom. L’aide finale explique la phase et, si le retour est prioritaire, le Mode d’arrivée, la suspension et la référence hebdomadaire actuelle. Elle s’ouvre au survol, au focus clavier ou au toucher. Une suspension explique les conditions prioritaires sans promettre un démarrage bloqué. Les capteurs de prochain événement et les vues d’anticipation hebdomadaire gardent leur sens hebdomadaire. Ces prévisions sont informatives ; elles ne changent ni l’exécution ni la confirmation de transmission.

La vue d’ensemble des zones utilise des cartes adaptatives compactes pour
montrer ce que font Velair et l’appareil de chauffage ou de climatisation dans chaque pièce. Lorsque
l’entité rapporte `hvac_action`, le résumé utilise comme état principal son
activité réelle Chauffage, Refroidissement, Déshumidification, Ventilation,
Inactif, Arrêt, Préchauffage ou Dégivrage. Le même résumé identifie ensuite l’état
Velair — programmation, manuel, forçage, pause, préconditionnement ou automatisation
arrêtée —, le mode HVAC rapporté et les informations de temps pertinentes, sans
répéter l’activité dans un indicateur séparé. Si `hvac_action` est absent ou invalide,
Velair affiche son propre état d’exécution sans déduire ce que fait l’appareil.
Chaque carte présente d’abord le nom et l’identifiant de l’appareil, puis son
Profil actif et les signaux ordonnés Room Assist/Confort/air/données. Sur les
cartes très larges, ces signaux et le résumé compact partagent l’en-tête. Sur les
cartes étroites, y compris sur mobile et dans les dispositions Lovelace compactes,
l’identité et l’état compact restent alignés côte à côte, tandis que les signaux
de Profil/Confort occupent la ligne entière en dessous. Les pastilles Profil, retour, Room Assist et Confort/air/données partagent une typographie compacte et une disposition icône/libellé et valeur. Le retour a une nuance violette discrète ; Confort distingue toujours normal, information, avertissement et erreur. Les valeurs longues peuvent être raccourcies visuellement pour garder une hauteur compacte ; le texte complet reste dans l’aide au survol, au focus clavier ou au toucher. Le résumé utilise une icône cohérente, un texte
équilibré et une couleur discrète indiquant l’activité, sans titre fixe ni badge extérieur
décoratif. Lorsque Room Assist est actif ou en maintien, les détails sont
regroupés en Température (Appareil, puis Capteur), Consigne (Appareil, puis
Programmée) et Décalage tenant compte de la direction. Les valeurs manquantes
sont omises. Les signaux neutres restent discrets ; la couleur d’avertissement
est réservée aux conditions qui nécessitent de l’attention.

La carte Lovelace accepte les valeurs `view` suivantes :

- `climate` ;
- `overview-status` ;
- `overview-boosts` ;
- `overview-events` ;
- `overview-timeline` ;
- `overview-zones` ;
- `active-setup` ;
- `schedules` ;
- `sensors` ;
- `comfort` ;
- `preconditioning` ;
- `planned-return` ;
- `diagnostics`.

<a id="planned-return-card"></a>
### Carte Retour prévu

Ajoutez à n’importe quel tableau de bord les mêmes commandes de retour du foyer
que celles du panneau latéral :

```yaml
type: custom:velair-card
view: planned-return
```

Pour un départ normal en attente, une ligne de temporisation explique la vérification du logement vide et affiche son échéance backend à l’heure locale de Home Assistant. Le Mode Absence s’active seulement après confirmation si toutes les sources indiquent toujours une absence. Aucun compte à rebours en direct ni aucune chronologie de départ ne s’affiche avant cette confirmation. Avec **Appliquer le mode Absence maintenant**, Absence et sa chronologie démarrent immédiatement ; la confirmation du départ conditionne séparément le retour automatique par présence tandis que la préparation et l’arrivée programmées restent actives.

L’éditeur visuel de la carte appelle cette vue **Retour prévu**. Elle affiche
uniquement les commandes compactes de **Retour ponctuel**, avec les nombres de
sources occupées, absentes et inconnues en haut à droite de l’en-tête. Le délai
de confirmation de l’absence enregistré y apparaît uniquement avant une absence
active confirmée. Sans sources de présence enregistrées, ces indicateurs sont
omis : **Planifier le retour** confirme explicitement le départ et active Absence
immédiatement, sans attendre. L’arrivée enregistrée continue à contrôler la
préparation et l’activation de la destination ; Velair ne peut pas détecter une
arrivée physique sans sources. Les sources configurées inconnues ou
indisponibles gardent leur comportement d’attente normal sauf si **Appliquer le mode Absence maintenant** est sélectionné, et la routine
hebdomadaire exige des sources. Définissez une date et une heure futures de
retour avant de partir ou lorsque vous êtes déjà absent. Un épisode actif
propose uniquement **Annuler** et **Modifier l’arrivée**. Annuler arrête
l’automatisation de retour et rétablit la sélection précédente de Mode/Profils
après un départ confirmé ou une application manuelle immédiate d’Absence, même avant confirmation du départ surveillé. Une confirmation normale en attente ne change pas la
sélection. Par exemple, partez de Confort avec un délai de cinq minutes : annuler
après deux minutes laisse Confort actif ; annuler après l’application d’Absence
rétablit Confort et ses Profils d’origine. Consultez les
[exemples d’annulation](planned-return.fr.md#cancelling-a-return-examples),
y compris les démarrages sans capteur, les changements d’arrivée et les
sélections explicites de Mode. Une fois le retour terminé ou annulé, la carte
affiche un nouveau formulaire de date/heure, même si la présence du foyer
indique toujours que tout le monde est absent. **Planifier le retour** reste
visible mais désactivé lorsque la configuration enregistrée ou le planificateur
est indisponible. Le panneau latéral utilise les mêmes boutons Annuler/Modifier
l’arrivée et le même nouveau formulaire de planification. Seuls les indicateurs
de présence/délai placés en fin d’en-tête sont propres à la carte ; le panneau
conserve la configuration complète de la routine hebdomadaire, de la présence
et de la préparation. Les deux affichent un sous-titre de phase compact associé
au titre, avec une infobulle native expliquant la phase. Pendant la confirmation,
le titre du processus fournit ce contexte. Avant le départ confirmé, une icône
d’arrivée accessible et le libellé **Arrivée prévue** identifient le retour
enregistré, alignés avec le titre et l’état ; sa valeur enregistrée est une puce
compacte cliquable sans crayon ni soulignement. Le graphique confirmé utilise une surface d’arrivée sombre semblable à un champ, de même typographie que le départ, sans crayon ni soulignement. Les deux ouvrent le
même éditeur d’arrivée. Le bouton bleu **Retour**, avec une flèche gauche dans
la ligne d’actions de l’éditeur, abandonne la modification d’arrivée et ferme
l’éditeur localement en restaurant la dernière arrivée enregistrée. Son
avertissement et sa protection de navigation disparaissent ; la configuration
indépendante non enregistrée de la routine reste protégée. Une nouvelle
ouverture repart de la valeur enregistrée. Une réussite ferme l’éditeur, tandis
qu’un échec d’enregistrement ou une mise à jour en direct conserve le brouillon.
Les valeurs de départ et d’arrivée utilisent la même typographie ; Annuler est
une action compacte rouge à texte blanc sous les données de l’épisode, à gauche,
affichée uniquement lorsqu’un retour actif peut être annulé et que son éditeur
est fermé. Pendant l’édition, **Retour** ferme l’éditeur à gauche et Modifier
l’arrivée reste à droite sur un fond vert compact. Retour et Modifier l’arrivée
ont des surfaces visibles de 32 pixels dans des cibles tactiles de 44 pixels.
Les indicateurs de présence de la carte restent en haut à droite de l’en-tête ;
l’indicateur de délai disparaît après le départ confirmé.

Configurez les sources de présence, les modes, la confirmation d’absence et la
routine hebdomadaire dans l’onglet **Retour prévu** du panneau
latéral. La carte utilise cette configuration enregistrée du foyer ; elle
n’expose ni les champs de configuration ni l’interrupteur de routine
hebdomadaire. Les filtres d’affichage des thermostats ne limitent pas cette
carte du foyer. Les commandes du tableau de bord et du panneau modifient le même
épisode backend ; les brouillons d’arrivée restent locaux à chaque carte ouverte
jusqu’à leur soumission.

Pendant une absence confirmée, les heures de départ et d’arrivée modifiable sont au-dessus de la chronologie ; les Modes Absence et Retour sont dessous. Les aides du départ, de l’icône d’arrivée et des Modes expliquent leur sens au survol, au focus clavier ou au toucher. La date d’arrivée reste un bouton d’édition séparé. Un trait vertical neutre Maintenant marque le temps UTC écoulé au bout du segment coloré. Les dates apparaissent si les extrémités sont sur des jours différents dans le fuseau Home Assistant. Un brouillon d’arrivée ne déplace pas l’extrémité avant acceptation. Les états en attente et terminaux, ou l’absence de départ confirmé, n’ont pas de chronologie mobile. Une erreur active avec départ valide conserve chronologie et annulation. L’horloge locale s’actualise chaque minute uniquement quand la vue est visible et active, sans interroger Home Assistant.

Les équipements adaptatifs éligibles ont des points colorés et une légende correspondante avec noms et heures de début estimées visibles, plus une aide complète. Les points superposés partagent un cercle segmenté. Les pièces suspendues, prêtes, indisponibles ou à l’arrivée uniquement n’ont pas de point. La légende du foyer commence sur une ligne ; +N développe les autres pièces dans la carte et Afficher moins la replie. Les mises à jour ordinaires conservent l’ouverture ; un changement d’arrivée enregistrée, de destination ou d’épisode la réinitialise. Les pastilles de préparation gardent leurs nombres et détails d’arrivée/premier début dans leurs aides. Les compteurs de présence, le délai et la phase ont aussi des aides clavier et mobiles. La configuration hebdomadaire, les sources et la préparation détaillée restent dans la barre latérale. Préparation estimée et temps écoulé ne confirment ni activité HVAC physique ni progression thermique.

<a id="climate-status-and-control-card"></a>
### Carte d’état et de contrôle climatique

Utilisez `view: climate` pour une carte compacte consacrée à une entité
`climate.*` gérée par Velair. Elle suit le thème actif de Home Assistant grâce à
ses variables de couleurs et de surfaces et s’adapte aux thèmes clair et sombre
ainsi qu’aux dispositions sur mobile, tablette et ordinateur.

La carte combine la température, l’humidité, le mode HVAC et `hvac_action`
rapportés par l’appareil avec les données actuelles de contrôle et d’exécution
de Velair. Elle réutilise la même chronologie quotidienne effective, la même
icône de Profil et la même couleur de Profil que l’onglet Vue d’ensemble. Les
informations de Mode, Profil, Confort, Room Assist et préconditionnement
n’apparaissent que lorsqu’elles sont configurées et pertinentes. Un appareil
à exécution externe montre le fournisseur externe et l’état de publication à
la place des fonctions Velair uniquement locales ou des actions propres à
l’appareil. L’action facultative Retour ponctuel contrôle le foyer et reste
indépendante du responsable du contrôle de l’appareil sélectionné.

```yaml
type: custom:velair-card
view: climate
selected_entity: climate.living_room
climate_name: Living room
climate_humidity_entity: sensor.living_room_humidity
climate_outdoor_temperature_entity: sensor.outdoor_temperature
climate_window_entities:
  - binary_sensor.living_room_window
  - binary_sensor.patio_door
climate_window_display: grouped
climate_room_assist_display: both
climate_preconditioning_display: both
climate_show_control_mode: true
climate_show_target_control: true
climate_show_hvac_mode_control: true
climate_show_native_climate_link: true
climate_actions:
  - type: boost
  - type: pause
    placement: more
  - type: planned-return
    enabled: true
  - type: script
    name: Ventilate room
    script: script.ventilate_living_room
    icon: mdi:window-open-variant
    color: "#03a9f4"
    confirmation: true
    placement: auto
```

La surface de contrôle climatique combine des actions rapides ordonnées avec un
sélecteur Automatique/Manuel configurable indépendamment, utilisant le même
modèle de responsabilité du contrôle que Vue d’ensemble. Son volet inférieur
regroupe le mode HVAC, la consigne actuelle lorsque l’appareil est allumé et un
raccourci vers la boîte de dialogue native de l’appareil climatique de Home Assistant. Chaque
mode HVAC publié est affiché avec son icône. Les changements directs restent
en lecture seule lorsque Velair gère la programmation active : sélectionnez
d’abord **Manuel**, attendez la confirmation du réglage manuel, puis
utilisez les commandes de consigne et de mode. Sélectionnez **Automatique** pour
reprendre la programmation. Le Forçage, les pauses indépendantes et les états
arrêté ou indisponible bloquent l’édition directe avec une explication. La pause
interne représentant le réglage manuel lui-même ne bloque pas ces commandes.
Les zones à exécution externe gardent le raccourci Home Assistant natif ; une
action Retour ponctuel activée peut toujours ouvrir les commandes de départ du
foyer.

Les consignes scalaires et les plages natives `heat_cool` sont prises en charge.
Les changements de plage envoient ensemble les deux limites. Velair utilise
`min_temp`, `max_temp` et `hvac_modes` publiés par l’entité climatique. Les
ajustements de consigne utilisent `target_temp_step` lorsqu’il est publié. Si
cet attribut disparaît, Velair continue à utiliser le dernier pas valide
rapporté pour maintenir la validité des consignes décimales existantes. Une
valeur de repli manuelle configurée par zone dans Paramètres vient ensuite,
puis `1` si aucun pas n’a jamais été rapporté ou configuré. Velair n’invente
pas de modes HVAC.

Les cartes créées avant la liste d’actions ordonnée utilisaient
`climate_show_boost_action`, `climate_show_pause_action` et
`climate_custom_actions`. Velair continue à lire ces anciens champs, tandis que
l’éditeur visuel écrit `climate_actions` lorsque la liste d’actions change.

**Retour ponctuel** est une autre action fournie par Velair. Elle propose les
mêmes options de visibilité, de nom masqué et de placement automatique/Plus
que Forçage et Pause. L’éditeur liste d’abord les actions fournies : Forçage,
Pause, puis Retour ponctuel, y compris celles qui sont masquées. Retour ponctuel
utilise une couleur violette pour se distinguer de Pause. Son ouverture remplace
le volet de contrôle inférieur par le formulaire compact de départ ou la
chronologie et les commandes de l’épisode actuel. Fermez le volet avec son X
pour revenir aux commandes climatiques ; cette fermeture n’annule pas un
départ actif. Les changements d’arrivée non enregistrés exigent une confirmation
avant la fermeture et une action en cours doit d’abord se terminer. Les
paramètres et les effets de départ concernent tout le foyer, pas uniquement
l’appareil sélectionné.

Les volets Forçage, Pause et Retour ponctuel rejoignent la bordure et la surface
de la barre d’outils, comme les commandes normales du thermostat. Les actions
directes sans texte gardent leur largeur compacte et centrent leur icône ;
l’ouverture d’un volet ajoute de la place pour son icône de fermeture.

Les cartes existantes gardent cette action masquée tant qu’elle n’est pas
explicitement activée. Les cartes créées via le sélecteur de cartes Home
Assistant l’incluent activée dans leur liste initiale ; cela s’applique aussi
lorsque la vue de cette nouvelle carte devient `climate`. Une carte YAML sans
action `planned-return` la garde masquée. Activez-la dans l’éditeur visuel ou
ajoutez l’action de l’exemple ci-dessus.

L’éditeur conserve les actions fournies dans leur section fixe et propose des
commandes d’ordre pour les actions personnalisées. Ouvrir l’éditeur ne
réordonne pas la liste d’actions enregistrée du tableau de bord.

Par défaut, l’humidité actuelle et son raccourci d’historique utilisent les
attributs de l’entité climatique sélectionnée. Définissez
`climate_humidity_entity` pour utiliser à la place la valeur en direct et
l’historique natif Home Assistant d’un capteur d’humidité dédié. Velair ne
déduit pas cette association car les intégrations Home Assistant ne la publient
pas de façon cohérente.

La température extérieure et les entités de fenêtres constituent un contexte
facultatif du tableau de bord. Velair ne les découvre pas, ne les gère pas et
ne les automatise pas via cette carte. Les états de fenêtres sont uniquement
informatifs, y compris lorsqu’une automatisation distincte ou le
[blueprint de fenêtres](blueprints/pause-zone-for-open-windows.fr.md) Velair utilise
ces entités. Définissez `climate_window_display` sur `grouped` ou `individual` ;
l’éditeur visuel propose des cases distinctes pour le relevé extérieur et les
fenêtres et n’affiche aucune de ces sections tant qu’une entité n’est pas
sélectionnée. L’en-tête complet État actuel replie le panneau lorsqu’il est
développé. Ses relevés et son contexte compacts utilisent des puces avec retour
à la ligne plutôt qu’un défilement horizontal afin que chaque capteur activé
reste visible sur une largeur étroite. Une évaluation de Confort disponible
utilise une ligne descriptive séparée sous l’en-tête replié, avec sa condition,
son indication contextuelle de Confort, son icône et sa couleur d’état.
L’éditeur peut aussi afficher les relevés de Confort dérivés activés dans cette
ligne repliée ; sinon, ces valeurs restent dans la ligne développée. La ligne
Confort est omise lorsque l’évaluation est indisponible. La commande permettant de
développer le panneau reste fixe tandis que les puces occupent autant de lignes
compactes que nécessaire selon la largeur. Cet état de présentation reste
limité à la session active de la carte. État actuel est replié par défaut.
L’éditeur visuel peut le faire démarrer développé ; changer ce défaut n’empêche
pas de le replier ou développer manuellement pendant l’utilisation.

L’éditeur visuel suit le même ordre vertical que la carte. Il peut masquer
indépendamment la barre d’état, le nom de l’appareil, l’état de fonctionnement,
les commandes et actions individuelles du thermostat, la température actuelle,
l’humidité, le relevé extérieur, les fenêtres, le Confort, les relevés de
Confort facultatifs repliés, la chronologie, Room Assist et le préconditionnement.
Le nom de l’appareil peut également être remplacé par un libellé propre à la
carte, y compris vide, puis réinitialisé au nom affiché actuel de l’entité.
Si tous les éléments d’État actuel sont désactivés, le conteneur complet est
omis. Les valeurs de visibilité omises sont visibles par défaut pour que les
cartes existantes conservent leur présentation. Chaque relevé visible de
température actuelle ou d’humidité inclut un raccourci compact vers l’historique
natif Home Assistant de sa source configurée ; le raccourci est omis avec le
relevé. Chaque catégorie de configuration peut être repliée et les actions de
script personnalisées restent repliées jusqu’à ce qu’elles doivent être
modifiées, pour un éditeur pratique sur les écrans étroits. Sélectionner un
autre script actualise le nom de ce raccourci depuis l’entité de script ; il
peut ensuite être personnalisé à nouveau. Le raccourci d’en-tête Velair reste
toujours présent pour identifier la carte et offrir un moyen cohérent de
revenir à l’intégration. Chaque action directe peut masquer son nom visible
et se réduire à un bouton de la taille d’une icône ; son libellé accessible et
son nom complet dans le menu Plus sont conservés.

Les actions rapides partagent la première ligne de la surface de contrôle avec
le sélecteur Automatique/Manuel. Elles restent dans un groupe indépendant
aligné à l’extrémité opposée de la même ligne, quelle que soit la largeur de la
carte. Si leurs libellés dépassent l’espace disponible, chaque libellé complet
garde sa largeur naturelle et ce groupe défile horizontalement au lieu de
passer à la ligne ou d’être tronqué. Ouvrir Forçage ou Pause remplace le volet
normal du thermostat au même emplacement ; Annuler ou un second appui sur
l’action sélectionnée rétablit les commandes normales. La barre de défilement
native reste masquée. Lorsque les actions débordent, des commandes
directionnelles occupent des emplacements fixes externes et deviennent
visibles seulement lorsque d’autres actions restent hors écran, sans recouvrir
ni redimensionner la ligne ; lorsque toutes les actions tiennent, ces
emplacements disparaissent entièrement. La même ligne accepte le balayage
tactile et le glissement à la souris ou au stylet sans exécuter l’action
utilisée pour commencer un glissement. Les actions de script confirment
brièvement l’exécution acceptée ou l’échec sur le bouton lui-même, et une
action Forçage ou Pause ouverte montre une icône de fermeture.

L’en-tête climatique utilise l’action de fonctionnement actuelle comme signal
visuel principal et regroupe l’action, la source d’exécution et le mode HVAC
sous le nom de l’appareil. Une signature Velair compacte reste disponible
comme raccourci vers le panneau principal, avec le nom du projet et de
l’auteur sur deux lignes quelle que soit la largeur de la carte.

Les sections Chronologie et Room Assist réutilisent les graphiques Velair
correspondants, avec défilement horizontal sur les écrans étroits. Définissez
`climate_room_assist_display` sur `text`, `chart` ou `both` pour choisir
l’explication concise d’exécution, le graphique des températures ou les deux.
L’état Room Assist reste toujours près de son titre ; l’explication utilise
une seconde ligne lorsqu’elle est activée. Seuls les affichages contenant le
graphique peuvent être repliés ; le mode texte seul reste visible et ne propose
pas de commande trompeuse permettant de développer le panneau.

`climate_preconditioning_display` suit le même modèle `text`, `chart` ou `both`. La préparation d’un retour accepté est séparée de l’anticipation hebdomadaire, avec état de la pièce, début estimé, cible et motif pertinent. Ces détails décrivent le retour enregistré et l’intention de contrôle, pas l’activité physique. Les commandes intégrées de Retour ponctuel montrent seulement le point éligible de l’équipement sélectionné, sans pastilles de préparation, et conservent son nom et son début estimé dans la légende. Sans point actuel, une brève explication d’état/motif remplace la chronologie. L’arrivée reste modifiable et l’annulation disponible ; ces actions affectent toujours le retour du foyer. La chronologie mesure le temps vers l’arrivée, pas la progression thermique. L’en-tête du préconditionnement garde l’état programmé ou actif visible, avec une seconde ligne facultative pour cible et début calculé. Le mode graphique seul garde cet état au-dessus de l’aperçu développable. Les deux sections graphiques démarrent repliées sauf configuration contraire ; l’option d’état initial apparaît dans l’éditeur visuel uniquement si un graphique est sélectionné. Le titre de chronologie, le Profil et le Mode actifs gardent leurs options de visibilité ; les pastilles Mode/Profil ont une hauteur réduite pour la carte. L’ouverture manuelle reste locale à la session de carte.

Forçage ouvre un formulaire dans la carte pour chaque option prise en charge par
l’appareil et le service : consigne ou plage, durée, mode HVAC, ventilation,
préréglage, oscillation, oscillation horizontale et humidité. Pause permet de
choisir une durée finie ou indéfinie et de laisser l’appareil inchangé ou de
l’éteindre. La carte n’expose pas `pause_id`, réservé à l’identification des
raisons appartenant aux automatisations. Lorsqu’une pause peut avoir un autre
propriétaire ou une autre raison, la carte ouvre Velair au lieu d’effacer
implicitement ces raisons. Le contrôle manuel peut revenir à l’automatique
depuis la carte. Ces actions locales ne sont jamais montrées pour les zones
à exécution externe. Forçage et Pause/Reprendre peuvent être masqués séparément
et déplacés dans la même liste d’actions ordonnée que les raccourcis de scripts.
Leur comportement, leurs libellés, leurs icônes et leurs formulaires sont fournis
par Velair et ne sont pas personnalisables.

La liste peut aussi contenir des entités Home Assistant `script.*` choisies par
l’utilisateur. Chaque raccourci possède un nom, une icône MDI, une couleur et
une confirmation facultative propres à la carte. Velair enregistre uniquement
ces réglages de présentation dans la carte Lovelace et lance l’entité choisie
via `script.turn_on` ; le script lui-même, ses permissions et ses actions
restent gérés par Home Assistant. La carte n’accepte ni JavaScript arbitraire,
ni modèles, ni charges utiles de services, ni séquences d’actions intégrées.
Les raccourcis de scripts doivent donc pouvoir fonctionner sans champs
d’entrée obligatoires ; définissez les valeurs nécessaires dans le script
Home Assistant ou fournissez-y des valeurs par défaut. Chaque action peut
utiliser `placement: auto` ou `placement: more`. Les actions automatiques
utilisent les trois premières positions directes disponibles et débordent
dans **Plus** lorsque ces positions sont pleines. Les actions affectées à
`more` restent toujours dans ce menu, indépendamment de leur position dans
la liste ordonnée. La limite de trois positions est fixe et ne constitue pas
un autre paramètre d’affichage. **Plus** est omis s’il ne contient aucune
action ; **Ouvrir Velair** reste son dernier élément fixe et ne suffit pas à
faire apparaître le menu. Les raccourcis de scripts restent disponibles pour
les zones à exécution externe car ce sont des actions Home Assistant
indépendantes, tandis que les actions propres à Velair conservent leurs
restrictions normales de responsabilité et de disponibilité.

La fine ligne supérieure est un indicateur sémantique d’état de fonctionnement,
pas une progression. Chauffage et préchauffage utilisent une couleur chaude,
refroidissement une couleur froide, déshumidification et ventilation restent
stables, l’inactivité est une forme atténuée du mode actif, l’arrêt est neutre
et l’indisponibilité utilise un indicateur d’erreur discontinu. Le mouvement est
un bref signal de changement d’état et est désactivé lorsque la réduction
des animations est demandée. Un mode HVAC `off` est prioritaire sur une action
`idle` périmée : la carte affiche **Arrêt** avec une icône d’alimentation ;
l’inactivité alors qu’un mode actif reste sélectionné utilise une icône
neutre de thermostat et ne ressemble pas à une pause Velair.

Les cartes Lovelace par zone peuvent aussi limiter les thermostats affichés.
C’est seulement un filtre de présentation du tableau de bord ; il ne modifie
ni les programmations enregistrées ni le comportement du planificateur.
Les cartes globales comme `overview-status` et `active-setup` ne montrent pas
la sélection des thermostats ni les options de jour dans l’éditeur car elles
ne sont pas liées à un thermostat ou un éditeur de programmation particulier.

Ajoutez `view: active-setup` indépendamment de la carte d’état du planificateur.
Utilisez l’éditeur visuel ou `active_setup_controls` pour choisir si
Configuration active peut modifier `modes`, `profiles` ou `both` :

```yaml
type: custom:velair-card
view: active-setup
active_setup_controls: profiles
```

L’option vaut `both` par défaut et chaque variante montre **Base** et **Exceptions**, avec l’identité réelle Mode/Profil/Par défaut de la base et les groupes d’exceptions avec leur nombre de pièces. Base et son type partagent une petite ligne de contexte au-dessus du nom ; les noms longs se replient sur téléphone et carte étroite. La base indique combien de ses zones incluses en héritent encore ; les exceptions et les zones Par défaut hors du Profil sont exclues. Une base Par défaut inclut toutes les zones gérées. Cela décrit la couverture de sélection, pas l’activité. **Répartition du foyer**, sous la base, est initialement repliée. Sélectionnez son libellé pour révéler barre et légende ; sélectionnez à nouveau ou Échap pour replier en gardant l’en-tête en place. La barre couvre toutes les zones gérées et son libellé en donne le total. La légende utilise les couleurs de Profils, de petites icônes et une colonne de nombres à droite. Les nombres d’exceptions correspondent à la liste, y compris hors base. Les zones non couvertes sans exception forment un segment neutre Par défaut. Ce total du foyer est distinct du dénominateur de couverture de base. Sans zone gérée, aucune barre. Les Profils de base sont identifiés dans la légende développée sans liste de composants du Mode séparée. Les grandes largeurs donnent plus de place aux exceptions ; les cartes étroites gardent le résumé empilé. Cliquez n’importe où sur une ligne d’exception pour développer ses pièces dessous en gardant toutes les exceptions visibles ; cliquez à nouveau ou Échap pour replier. L’en-tête et le nombre restent en place, le contenu grandit vers le bas. Ouvrir un autre groupe ferme le précédent. Les noms de pièces sont absents du résumé compact et les longues listes défilent dans la zone développée. Ce détail est en lecture seule dans toutes les variantes ; Configuration active n’a pas de menu d’édition par zone séparé. Le contrôle réservé aux Profils garde une action de programmations Par défaut. Choisir directement un Profil remplace tous les Profils actifs et passe le Mode à Manuel. Les zones non couvertes reviennent à leurs programmations Par défaut au lieu de garder l’ancien Mode. Utilisez un Mode pour activer plusieurs Profils sans chevauchement comme base. L’icône de couches applique un Profil uniquement à ses zones configurées comme exceptions et conserve les autres sélections. Consultez [base et exceptions de zone](climate-profiles.fr.md#a-base-with-independent-zone-exceptions).

```yaml
type: custom:velair-card
view: preconditioning
entities:
  - climate.living_room
  - climate.bedroom
zone_order:
  - climate.bedroom
  - climate.living_room
```

Si `entities` est omis, les cartes par zone montrent tous les thermostats gérés
par Velair.

Pour `view: sensors`, l’éditeur peut masquer l’interrupteur marche/arrêt, le
sélecteur de capteur de pièce, la bande morte Room Assist, le décalage maximal
de l’assistance, le délai d’actualisation ou la section d’état en direct, afin
que la carte soit uniquement informative ou plus compacte.

Pour `view: comfort`, l’éditeur peut limiter la carte aux thermostats sélectionnés
et masquer indépendamment la configuration, le graphique de température,
d’humidité ou de CO2. Ces choix d’affichage concernent uniquement le tableau
de bord ; ils ne modifient ni les paramètres Confort, ni les capteurs suivis,
ni les seuils, événements ou entités Home Assistant générées.

```yaml
type: custom:velair-card
view: comfort
entities:
  - climate.living_room
show_comfort_configuration: false
show_comfort_temperature: true
show_comfort_humidity: false
show_comfort_co2: true
```

<a id="create-a-daily-schedule"></a>
## Créer une programmation quotidienne

Lorsque vous ouvrez **Programmes**, Velair sélectionne le jour local actuel.
Votre sélection est ensuite conservée lorsque vous passez entre thermostats,
programmations Par défaut et de Profil, ou données actualisées du backend.

1. Sélectionnez l’appareil à configurer.
2. Choisissez une **Répartition des jours**, puis un jour ou un groupe de jours.
3. Utilisez **Programme indépendant** pour des blocs indépendants, ou sélectionnez
   un modèle avec **Horaires uniquement** ou **Horaires et réglages**. Pour des
   blocs indépendants, poursuivez ci-dessous.
4. Ajoutez un bloc.
5. Choisissez l’heure de début.
6. Choisissez un mode HVAC ou laissez `Conserver le mode actuel`.
7. Saisissez une température cible ou une plage, ou sélectionnez des options
   climatiques sans consigne.
8. Enregistrez.

Dans Réglages supplémentaires, un **Préréglage Velair** peut fournir la
configuration climatique du bloc en laissant son heure indépendante. Les jours
liés suivent la portée choisie du modèle. Consultez les
[règles complètes](linked-schedules.fr.md) et les
[exemples pratiques pour le foyer](linked-schedule-examples.fr.md) avant de choisir
entre copie et liaison.

Après avoir choisi explicitement un mode HVAC autre que l’arrêt, utilisez le
bouton compact de thermomètre dans la cellule Consigne pour désactiver la saisie
de température. Le champ grisé montre alors un tiret et le bloc appelle seulement
le service Home Assistant `climate.set_hvac_mode` sans envoyer de consigne
scalaire ou de plage. C’est utile pour des modes comme `auto`, où l’intégration
climatique ou l’appareil peut reprendre son propre programme, mais disponible
pour chaque mode HVAC autre que l’arrêt rapporté par l’entité. Utilisez le même
bouton pour réactiver le champ ; Velair rétablit la consigne précédente du
brouillon, qui doit être valide avant l’enregistrement. Les blocs existants
conservent leur comportement actuel de consigne.

Les blocs de mode uniquement n’utilisent ni préconditionnement ni Room Assist,
car Velair n’a pas de consigne à atteindre ou ajuster. Les réglages climatiques
facultatifs sont également indisponibles pour ces blocs afin que l’action
enregistrée reste un changement de mode HVAC sans ambiguïté. Les fournisseurs
de programmation externes doivent annoncer explicitement la prise en charge
de cette action ; Velair ne la convertit jamais en bloc de température.

Pour programmer un préréglage ou une autre option sans température cible,
choisissez l’option dans les commandes supplémentaires du bloc et désactivez
le champ Consigne. Le bloc peut combiner préréglage, ventilation, oscillation,
oscillation horizontale et humidité cible. Il appelle uniquement les services
climatiques Home Assistant correspondants ; il n’envoie pas
`climate.set_temperature`, ne change pas le mode HVAC et n’allume pas un
appareil éteint. Un bloc doit contenir au moins une option prise en charge.
Les modifications directes de ces options entre les événements programmés ne
sont pas immédiatement rétablies par Velair. Les blocs d’options uniquement
n’utilisent ni préconditionnement ni Room Assist. Lorsqu’un bloc comporte
plusieurs commandes, Home Assistant reçoit des appels de services séparés en
séquence. Si un appel ultérieur échoue, les commandes précédentes peuvent avoir
déjà changé ; Velair signale l’échec de transmission.

Lorsqu’un modèle ou un Profil est appliqué à un autre appareil, Velair conserve
les options que cet appareil prend en charge. S’il n’en reste aucune dans un
bloc d’options uniquement, la programmation de destination est refusée plutôt
que d’enregistrer une action vide.

Velair utilise les capacités de l’entité climatique sélectionnée pendant
l’édition. Les modes non pris en charge ne sont pas proposés pour cet appareil
et les températures sont limitées à la plage de l’entité.

Dans un bloc de température, `Conserver le mode actuel` envoie la consigne et les
options choisies sans demander un autre mode lorsque l’appareil est allumé.
Si l’appareil est éteint, Velair le démarre dans le premier mode pris en charge
compatible avec la consigne. Un bloc Conserver peut être enregistré lorsque
l’appareil annonce au moins un mode autre que l’arrêt compatible avec son type
de consigne ; cela ne garantit pas que le mode en cours sera compatible lors
de l’exécution. Si le mode en cours ne peut pas accepter la consigne, la transmission
échoue sans passer à un autre mode. Certaines intégrations n’annoncent leur
fonction de consigne unique qu’après le démarrage d’un mode ; Velair démarre
donc le mode compatible avant d’envoyer la consigne et laisse le service Home
Assistant signaler un éventuel échec propre à l’appareil. Les plages natives
exigent toujours une prise en charge explicite des plages et Velair ne convertit
jamais une consigne unique en plage ni une plage en consigne unique.

Choisissez **Température uniquement** dans le sélecteur de mode du bloc pour mettre à jour sa cible sans demander à Velair d’allumer l’équipement ou de changer son mode HVAC. Un équipement éteint reste éteint si son intégration accepte les cibles à l’arrêt ; un équipement en marche garde son mode réel. Ce choix est distinct : **Conserver le mode actuel**, les modes explicites et les horaires enregistrés gardent leur comportement. Ces blocs ne peuvent pas inclure d’options supplémentaires comme un préréglage, car ces commandes pourraient changer l’état de fonctionnement.

Ce choix s’applique pendant tout le bloc actif : changements manuels de mode HVAC, démarrage, reprise et récupération de transmission. Changer uniquement le mode HVAC ne crée pas de réglage manuel ; changer la température suit toujours la politique externe configurée. Room Assist et la préparation anticipée ne fonctionnent pas tant que cet équipement est éteint. Ils peuvent reprendre après une mise en marche externe avec le mode actuel compatible. Un Forçage explicite reste une demande séparée pouvant allumer l’équipement.

La prise en charge dépend de l’intégration climatique. Certaines masquent ou refusent les cibles à l’arrêt, ou s’allument elles-mêmes à leur réception. Velair ne demande jamais de changement de mode ni de mise en marche de secours pour un bloc Température uniquement. Un échec est signalé ; Velair n’allume pas brièvement l’appareil pour régler la cible. Les plages natives exigent la capacité de plage correspondante. Les fournisseurs d’horaires externes doivent explicitement prendre en charge cette politique.

L’éditeur garde visibles les options choisies dans une ligne compacte. Pour
un bloc avec options climatiques, ouvrez sa commande d’options pour voir ce
qu’il enverra : la consigne éventuelle, la gestion du mode HVAC et les options
sélectionnées. L’explication précise aussi qu’une température unique n’est
pas convertie en plage. Cela fonctionne dans les programmations, Profils et
modèles. L’éditeur avertit sans bloquer l’enregistrement si un bloc précédent
du même jour sélectionne un mode susceptible de refuser le type de consigne.
Si aucun mode explicite précédent ni bloc d’arrêt ne détermine le mode, il
utilise le mode actuel de l’appareil pour cet avertissement. Le mode peut changer
avant l’exécution du bloc ; l’avertissement est donc conditionnel.

Les blocs de température contiennent une consigne unique ou une plage complète
avec limites inférieure et supérieure. L’éditeur utilise les capacités publiées
par l’entité et crée par défaut une plage dans les nouveaux blocs `heat_cool`
lorsqu’elle est prise en charge. Une plage est affichée, par exemple, comme
`20–24 °C`. Velair n’invente jamais une plage à partir d’une température et
refuse les consignes incomplètes, inversées ou incompatibles avant l’envoi.

Les plages natives sont limitées à `heat_cool` dans cette première phase.
Velair ne suppose pas que le mode `auto` d’un appareil utilise le même modèle
de limites inférieure et supérieure.

Lorsque l’appareil sélectionné expose des commandes supplémentaires, l’éditeur
les affiche également. Par exemple, un climatiseur peut exposer le mode de
ventilation, un mode prédéfini, l’oscillation, l’oscillation horizontale ou
l’humidité. Velair n’enregistre et n’envoie que les options prises en charge
par cet appareil ; les options non prises en charge sont omises plutôt
qu’envoyées aveuglément.

Si un bloc utilise `Arrêt`, les champs de consigne ne sont pas utilisés car
le bloc éteint l’entité climatique.

**Répartition des jours et modification groupée**

La programmation Par défaut de chaque équipement et celle de chaque équipement dans un Profil mémorisent leur **Répartition des jours**. Choisissez **Jours individuels**, **Semaine / Week-end** ou **Tous les jours** avant de sélectionner un onglet de jour. Les programmations existantes commencent avec Jours individuels.

Toutes les répartitions gardent les mêmes sept cellules dans l’ordre de semaine configuré. Jours individuels en sélectionne une. Semaine / Week-end sélectionne lundi à vendredi ensemble, ou samedi et dimanche, quel que soit le jour cliqué. Avec dimanche en premier, sélectionner samedi sélectionne aussi dimanche à l’autre extrémité. Tous les jours sélectionne chaque cellule. Les cellules sélectionnées adjacentes sont reliées ; les séparées restent à leur place. Cliquer une cellule du groupe déjà sélectionné conserve le brouillon.

Choisir une répartition conserve les blocs existants. Enregistrez ce choix avec la programmation Par défaut ou **Enregistrer le profil** pour un Profil. Chaque zone peut avoir une répartition différente. Les modèles journaliers restent des listes de blocs journalières.

Si les jours sélectionnés ont une configuration enregistrée identique, modifiez directement leur horaire commun. Sinon, **Horaires différents** permet d’examiner les horaires et de choisir explicitement une base. Les jours avec blocs et liens identiques partagent une alternative portant leurs jours. Chaque alternative utilise les barres compactes de Vue d’ensemble avec cible et mode dans les segments colorés, sans liste permanente dessous. L’icône d’information ouvre l’horaire complet avec heures, réglages et références au survol, au focus clavier ou au toucher ; consulter cette aide ne sélectionne pas l’alternative. Cliquez ou touchez une alternative pour la choisir comme base ; fond et bordure identifient l’unique configuration choisie. Les flèches, Espace et Entrée permettent la sélection au clavier. Les alternatives restent disponibles pour changer de base avant d’enregistrer. Avec **Tous les jours** ou **Semaine / Week-end**, choisissez et enregistrez d’abord l’alternative pour les sept jours, cinq jours de semaine ou deux jours de week-end. Sélectionner puis **Enregistrer** applique directement sans autre confirmation. L’éditeur commun s’ouvre après la réussite ; vous pouvez alors changer l’horaire partagé. Un échec conserve la sélection et la comparaison pour réessayer. Les alternatives vides montrent **Aucun bloc propre** sans répéter un nombre nul ; l’aide explique qu’elles suppriment les blocs propres des jours sélectionnés, qu’un jour vide n’est pas une commande d’arrêt et que la continuité hebdomadaire peut continuer. La disposition convient au mobile. Choisir une base n’enregistre rien. **Enregistrer** est désactivé sans base et placé sous le contenu à droite. Un résumé identifie le jour source et les jours recevant son horaire. L’enregistrement remplace les configurations du groupe et laisse les autres jours intacts. Des températures identiques n’impliquent pas une configuration identique si modèles ou préréglages diffèrent. Des libellés compacts identifient le modèle et la portée du lien, les préréglages ou l’indépendance lorsque les réglages effectifs semblent identiques. Les références complètes restent dans l’aide.

Ajouter, supprimer ou déplacer des blocs, appliquer un modèle, changer la portée du lien et dissocier affecte tous les jours sélectionnés à l’enregistrement. Les autres jours restent inchangés. **Enregistrer comme modèle** sauvegarde une liste journalière réutilisable. Copier vers d’autres équipements vise les mêmes jours de semaine sélectionnés et conserve leur propre répartition. Pour cloner entre jours, revenez à Jours individuels.

La chronologie groupée montre les blocs communs modifiés, sans sélecteur d’aperçu séparé ni segment hérité propre à un jour. Jours individuels montre toujours la continuité du jour précédent. La continuité hebdomadaire du planificateur ne change pas et les blocs hérités ne sont jamais copiés dans les blocs enregistrés. Les limites des appareils sont validées pour chaque jour concerné avant l’enregistrement complet.

Les répartitions survivent aux redémarrages Home Assistant et aux exports portables. Les anciens exports sans répartition importent avec Jours individuels. Les anciennes références de répartitions personnalisées s’ouvrent aussi ainsi, en conservant les blocs et liens de chaque jour.

<a id="timeline-editing"></a>
## Modification de la chronologie

La chronologie représente visuellement les 24 heures du jour sélectionné.

- Faites glisser un bloc pour déplacer son heure de début.
- Faites glisser le bord d’un bloc pour redimensionner l’intervalle entre deux
  blocs adjacents.
- Utilisez la liste des blocs pour les valeurs exactes d’heure, de mode et de
  température.

<a id="preconditioning"></a>
## Préconditionnement

Pour une absence pilotée par la présence avec des arrivées hebdomadaires ou
ponctuelles préconfigurées, consultez [Retour prévu](planned-return.fr.md).
Configurez la routine dans l’onglet Retour prévu
et utilisez son état en direct pour les états individuels des sources et les
changements ponctuels d’arrivée sans modifier la semaine enregistrée.
**Planifier le retour** peut attendre un départ confirmé avec une heure
ponctuelle même lorsque la routine hebdomadaire automatique est désactivée.
Sans sources de présence enregistrées, le démarrage explicite applique au
contraire Absence immédiatement ; la préparation normale et l’arrivée
enregistrée continuent à fonctionner.

Le préconditionnement permet à Velair de démarrer une consigne de confort
programmée avant l’heure visible du bloc pour un appareil géré.

Lorsqu’il est activé dans l’onglet Anticipation pour un appareil, l’heure
du bloc représente l’heure de confort souhaitée. Velair peut appliquer la
consigne plus tôt grâce à sa prédiction adaptative, tout en gardant l’heure
cible originale visible dans les événements à venir.

Si Velair recalcule alors qu’il se trouve déjà dans la fenêtre de
préconditionnement, il applique immédiatement la consigne lorsque la
température actuelle nécessite encore chauffage ou refroidissement.

L’onglet Anticipation liste les appareils gérés dans l’ordre configuré
dans Paramètres. Pour chaque appareil, il permet de :

- activer ou désactiver le préconditionnement ;
- définir une avance maximale jusqu’à 1440 minutes ;
- définir les paramètres du modèle adaptatif et l’écart minimal de température ;
- examiner séparément l’apprentissage du chauffage et du refroidissement ;
- rétablir les paramètres d’ajustement par défaut sans supprimer les échantillons ;
- réinitialiser une direction d’apprentissage sans affecter l’autre.

La configuration est regroupée en temporisation et limites, modèle
d’apprentissage, historique et contexte extérieur facultatif. Lorsque le
contexte extérieur est désactivé, son sélecteur de capteur l’est également.
Les appareils indisponibles ne peuvent pas activer le préconditionnement et
l’onglet en explique la raison.

Chaque commande d’ajustement comprend une aide contextuelle compacte. Survolez,
donnez le focus ou touchez son icône d’information pour voir l’effet d’une
augmentation, diminution ou activation du réglage sur le préconditionnement.

Le préconditionnement est adaptatif. Velair prédit chaque événement futur à
partir de l’écart actuel de température, d’abord avec un modèle initial local,
puis avec un historique local similaire après un nombre suffisant
d’observations complètes. Les prédictions historiques apprennent le potentiel
thermique par degré : de petits changements passés peuvent être extrapolés à
des écarts futurs plus grands et de grands changements passés réduits à des
écarts plus petits. Les observations plus similaires et plus récentes ont
plus d’influence.

Velair ne démarre pas en avance les blocs `Arrêt`. Si la température actuelle
est déjà suffisamment proche de la consigne, il conserve l’heure normale du bloc.

Pour les plages natives `heat_cool`, Velair utilise la limite inférieure
lorsque la pièce a besoin de chauffage et la supérieure lorsqu’elle a besoin
de refroidissement. La plage complète est toujours appliquée en avance et
l’apprentissage enregistre la limite ayant déterminé la session.

La configuration détaillée et les exemples de chauffage, refroidissement,
capteur extérieur, automatisation et Lovelace sont décrits dans
[Préconditionnement adaptatif](adaptive-preconditioning.fr.md).

Avant le démarrage anticipé, Velair écoute les changements pertinents de
température des appareils gérés avec préconditionnement activé. Par défaut,
il utilise le `current_temperature` du thermostat. Si l’assistance par capteur
de pièce est activée pour cet appareil, Velair utilise le capteur sélectionné
comme température effective pour ses décisions de préconditionnement et
l’apprentissage. Lorsque le changement de température affecte suffisamment
l’écart actuel, Velair temporise la mise à jour et recalcule localement la
prochaine action du planificateur. Les panneaux ouverts regroupent également
les changements pertinents de température intérieure ou extérieure configurée
en une seule actualisation sans interrogation continue. Si le démarrage anticipé
du même événement visible change, sa ligne est brièvement mise en évidence pour
rendre l’ajustement perceptible sans boîte de dialogue ni notification globale.

<a id="room-assist"></a>
## Room Assist

L’onglet Room Assist liste les appareils gérés dans l’ordre configuré dans
Paramètres. Pour chacun, il permet de configurer l’assistance par capteur de pièce.

Le capteur de température sélectionné est utile pour les vannes thermostatiques
ou thermostats dont le capteur intégré se trouve trop près d’un radiateur,
d’une sortie d’air ou d’une autre source locale de chaleur. Sélectionner un
capteur seul ne modifie pas le contrôle Velair. Il ne devient la température
effective de la pièce que lorsque l’assistance est activée, car Velair ajuste
alors également la consigne du thermostat pour que l’actionneur continue à
chauffer ou refroidir en fonction du relevé externe.

Les exemples détaillés de chauffage, refroidissement, automatisation et Lovelace
sont décrits dans [Room Assist](room-assist.fr.md).

L’assistance par capteur de pièce est une option avancée qui exige un capteur
de température de pièce, mais pas le Préconditionnement adaptatif. Pour un
bloc fixe `heat` ou `cool` avec une bande morte non nulle, Velair traite les
limites inférieure et supérieure comme limites de commutation. Il conserve une
phase d’exécution jusqu’à ce que le capteur externe atteigne le bord opposé,
puis inverse la phase : le chauffage fixe s’initialise prudemment vers le bord
inférieur et le refroidissement fixe vers le supérieur. Le décalage maximal
d’assistance limite la correction signée à partir du bord actuellement actif.
Une bande morte de `0` conserve la correction signée précédente autour de la
consigne centrale. Les consignes scalaires `auto` et `heat_cool` conservent ce
comportement neutre et les plages natives `heat_cool` leur bande de maintien
stable ; Velair ne force donc pas un appareil automatique à alterner activement
entre chauffage et refroidissement. La bande morte vaut par défaut `0.3 °C`
ou `1 °F`, accepte des pas de `0.1` degré de `0` à `5 °C` ou `9 °F`, et
s’applique immédiatement à l’enregistrement. Le décalage maximal vaut par
défaut `2 °C` ou `4 °F` et peut être configuré par pas de `0.1` degré jusqu’à
`10 °C` ou `18 °F`. La consigne ou plage visible de la programmation reste
inchangée et l’alignement sur le pas de température, la protection de la
programmation et les limites physiques continuent à s’appliquer. La phase est
limitée à l’exécution et repart de zéro après un changement de bloc, de
consigne ou de mode, l’effacement de Room Assist ou le rechargement de
l’intégration. Velair agit sur l’appareil via sa consigne ; il ne peut pas
contourner l’hystérésis de l’appareil, la protection du compresseur ou la durée
minimale de fonctionnement. Utilisez donc un bloc `Arrêt` lorsqu’un arrêt
explicite est nécessaire.

Velair suit l’unité de température configurée dans Home Assistant. Il n’existe
pas de paramètre Celsius ou Fahrenheit séparé. Paramètres affiche l’unité
Home Assistant en lecture seule pour vérifier le comportement actif ;
modifiez-la depuis les réglages du système d’unités de Home Assistant. Les
nouvelles programmations, modèles intégrés, seuils Confort, limites Room
Assist et valeurs par défaut du Préconditionnement adaptatif sont physiquement
équivalents dans les deux unités. Les relevés des capteurs externes sont
convertis avant d’être comparés à une consigne climatique.

Velair stocke les valeurs thermiques brutes dans l’unité enregistrée avec ses
données. Si Home Assistant change d’unité, Velair arrête la programmation et
les écritures thermiques, crée une notification persistante et propose dans
Paramètres une migration explicite de l’unité stockée vers l’unité actuelle.
Ne poursuivez que si toutes les valeurs stockées utilisent encore l’unité
source indiquée ; des valeurs déjà dans l’unité cible seraient mal converties.
Les programmations, modèles, consignes actuelles et précédentes des
dérogations, limites Confort, valeurs Room Assist, paramètres, vitesses et
observations d’apprentissage du Préconditionnement adaptatif migrent de façon
atomique.

La mise à niveau unique depuis les données des versions publiées de Velair
utilisant uniquement Celsius est différente. Si Home Assistant utilise déjà
Fahrenheit, Velair suppose sans demander que les données anciennes sont en
Celsius, garde le planificateur arrêté et dirige l’utilisateur vers
**Réinitialiser Velair**. La réinitialisation supprime l’ancienne configuration
et crée atomiquement de nouvelles valeurs Fahrenheit par défaut. Après cette
mise à niveau, les changements ultérieurs d’unité Home Assistant utilisent
la conversion explicite complète décrite ci-dessus et conservent les données.

Les exports actuels du format portable v19 conservent les valeurs brutes et
déclarent leur unité. Les anciennes versions de Velair ne peuvent pas importer
les exports v19 ; utilisez une version prenant en charge v19 pour les
restaurer. Les anciens fichiers pris en charge, notamment v4, v5, v8 et v9,
restent importables. Les imports convertissent les données thermiques
sélectionnées lorsque l’unité du fichier diffère de celle de Home Assistant.
Les anciens fichiers sans unité sont traités comme Celsius, car toutes les
versions publiées produisant ces fichiers stockaient des valeurs Celsius.
L’export reste disponible lorsque la programmation est arrêtée pour une
mise à jour d’unité ; une copie de référence peut ainsi être enregistrée
avant réinitialisation puis importée après.

Si un appareil était indisponible lors de la migration ou de l’import, Velair
vérifie ses limites et son pas effectif de température. Un `target_temp_step`
valide publié par Home Assistant est prioritaire sur le dernier pas rapporté,
puis sur la valeur de repli configurée manuellement par zone. Le panneau
avertit lorsqu’une consigne enregistrée n’est plus compatible afin de la
modifier avant de se fier à cette programmation.

La mise à niveau, la migration, les sauvegardes et la récupération complètes
sont décrites dans [Unités de température et migration](temperature-units.fr.md).

Lorsque l’assistance par capteur est activée, Room Assist montre une échelle
compacte de température en direct pendant un bloc de température géré actif.
Pour une consigne unique, elle indique la consigne programmée, le capteur de
pièce, la consigne de l’appareil et son relevé. Une bande neutre hachurée indique
les limites de bande morte. Avec `heat` ou `cool` fixe, l’état montre aussi si
le contrôle se dirige vers la limite inférieure ou supérieure ; avec les
modes automatiques scalaires, la bande reste une marge neutre. Pour une plage
native, elle s’étend de la limite basse programmée moins la bande morte à la
limite haute plus la bande morte ; des crochets séparés montrent toujours les
bandes complètes programmée et appliquée, avec un connecteur entre leurs
centres montrant le déplacement signé de toute la plage. Le capteur de pièce
et le relevé de l’appareil restent des marqueurs individuels. La légende
traduite complète reste centrée sur la bande morte représentée, même lorsque
cette bande est plus étroite que le libellé ; une bande morte nulle supprime
la surface et est indiquée explicitement. Masquer `show_room_assist_deadband`
masque ensemble son réglage, sa bande et sa légende. Ces valeurs viennent de
l’état Home Assistant et de l’état d’exécution Velair ; elles ne sont pas
enregistrées comme nouvel historique. Si aucun bloc de température géré n’est
actif, l’onglet montre un état d’attente plutôt que des valeurs fictives. Si
un capteur est sélectionné mais que l’assistance est désactivée, l’onglet
indique qu’il est enregistré mais non opérationnel.

L’assistance par capteur de pièce est pilotée par événements. Velair n’interroge
pas périodiquement les températures. Il écoute uniquement le capteur configuré
et l’entité climatique lorsque l’assistance est active, temporise les changements
selon le Délai d’actualisation par appareil, aligne les consignes temporaires
sur le pas effectif publié, mémorisé ou configuré, ignore les mouvements plus
petits que ce pas et rétablit la vraie consigne programmée lorsque le
planificateur ou une zone est en pause, qu’un forçage démarre, que le bloc
éteint l’appareil, que le capteur devient inutilisable ou que la fonction est
désactivée. Effacer cet état efface aussi la phase d’hystérésis de mode fixe.
Si le Préconditionnement adaptatif a déjà démarré un futur bloc en avance,
Room Assist suit cette consigne future jusqu’à l’heure de confort programmée
au lieu de revenir au bloc horaire précédent.

Lorsque le préconditionnement est désactivé pour un appareil, Velair n’enregistre
pas d’écouteurs de température de préconditionnement, ne programme pas de
rappels de recalcul, ne démarre pas de sessions d’apprentissage et n’enregistre
pas de nouvelles observations pour cet appareil. Les échantillons déjà appris
sont conservés et réutilisables si le préconditionnement est réactivé.

Velair conserve également un historique local compact des tentatives. Il ouvre
une session d’apprentissage lorsqu’il applique une consigne de confort
anticipée, puis stocke une observation compacte lorsque l’appareil atteint le
seuil de consigne ou lorsque l’heure de confort arrive. Les sessions interrompues
par forçages, pauses, arrêts du planificateur ou changements de programmation
sont abandonnées.

L’onglet Anticipation affiche l’apprentissage local par appareil.
Chauffage et refroidissement sont suivis séparément, et une direction non
prise en charge par l’entité est affichée comme indisponible. Dès que Velair
possède suffisamment d’observations complètes pour une direction prise en
charge, il peut utiliser l’historique local similaire plutôt que le modèle initial.

Chaque direction prise en charge possède une carte d’état compacte indiquant
si l’apprentissage est prêt, la source du modèle actif et le nombre
d’échantillons complets, partiels et invalides.

L’onglet propose aussi une réinitialisation de l’apprentissage pour chaque
direction. Elle recalibre séparément chauffage ou refroidissement à partir
de zéro en conservant programmations, paramètres et historique de l’autre direction.

L’action de restauration par appareil est distincte de cette réinitialisation.
Elle rétablit seulement les paramètres d’ajustement du Préconditionnement
adaptatif, garde l’activation actuelle, les paramètres du capteur de pièce et
tous les échantillons enregistrés de chauffage et refroidissement.

Les observations partielles ne deviennent pas de faux temps d’achèvement.
Elles servent de bornes inférieures : Velair sait que le temps nécessaire
dépassait la fenêtre de démarrage tentée. Si assez d’observations complètes
ultérieures prouvent qu’une avance moindre fonctionne, les anciennes
observations partielles cessent de pousser la prédiction vers le haut.
L’apprentissage reste ainsi prudent sans rendre permanentes les avances élevées.

Velair garde des historiques compacts séparés pour chauffage et refroidissement
afin que l’usage saisonnier d’une direction n’élimine pas l’apprentissage de l’autre.

Tous les paramètres et calculs de préconditionnement fonctionnent localement
dans Home Assistant. Velair n’envoie aucun historique climatique ni aucune
donnée de programmation à un service externe.

Les détails pour développeurs sur les états d’apprentissage local, les sorties
de l’API et les règles de prédiction sont documentés dans
[Fonctionnement interne du préconditionnement adaptatif](../developer/adaptive-preconditioning.md).

<a id="environmental-comfort"></a>
## Confort environnemental

L’onglet Confort liste les appareils gérés dans l’ordre des Paramètres. Pour
chacun, il peut surveiller température de pièce, humidité et CO2. Il peut aussi
afficher des relevés facultatifs de point de rosée, humidité absolue et Humidex,
calculés localement depuis la température et l’humidité effectives ou fournis
par un capteur Home Assistant existant.

Confort est uniquement une surveillance. Il ne change ni blocs, ni consignes,
ni modes de ventilation, ni préréglages, ni pauses. Velair décrit plutôt la
pièce avec des conditions compréhensibles comme `Froid et humide`, garde la
qualité de l’air CO2 séparée, indique si les relevés sont complets et émet
des événements d’automatisation lorsque l’évaluation change.

La température peut utiliser un capteur Confort dédié, le capteur de pièce
Room Assist lorsqu’il est configuré, ou le `current_temperature` propre à
l’entité climatique. L’humidité peut utiliser un capteur sélectionné ou le
`current_humidity` de l’entité lorsqu’il est disponible. Le CO2 est évalué
uniquement lorsqu’un capteur CO2 est sélectionné.

Le modèle Confort Simple par défaut utilise une plage rectangulaire unique
de température et d’humidité. Le mode Guidé transforme une référence
d’humidité au point médian en courbe psychrométrique dépendant de la
température. Le modèle personnalisé tenant compte de la température permet
des limites d’humidité différentes aux extrémités froide et chaude ; Velair
interpole la plage effective et affiche sa zone cible inclinée sans prétendre
à un confort universel. Les zones existantes restent sur Simple tant qu’un
changement explicite n’est pas fait.

Ces relevés supplémentaires sont désactivés par défaut et restent informatifs :
ils ne modifient ni les classifications Confort ni le comportement climatique.
Lorsque Confort est désactivé pour un appareil, Velair n’enregistre pas
d’écouteurs de ses capteurs de confort. Lorsqu’il est activé, seuls les capteurs
sélectionnés pertinents et l’entité climatique sont écoutés. Il n’existe pas
d’interrogation continue.

Confort peut également comparer la pièce à des capteurs explicites de
température extérieure et d’humidité facultative. Le bloc **Intérieur et
extérieur** montre l’écart de température, l’humidité absolue intérieure et
extérieure, et l’humidité relative qu’aurait l’air extérieur à la température
intérieure. Lorsque le backend identifie une direction utile ou un conflit,
Velair montre un message prudent d’aération ; il ne traite jamais la
comparaison comme une commande. La configuration reste dans le panneau de
réglages Confort replié et désactiver la comparaison conserve les identifiants
des capteurs choisis. Les commandes **Ventilation guidance** par appareil
permettent d’exiger des écarts de température, d’humidité projetée et de
teneur en eau de l’air plus grands ou plus petits avant d’afficher ce message ;
les marges prudentes d’origine restent les valeurs par défaut.

Les exemples détaillés de configuration, chauffage, refroidissement, CO2,
automatisation et confidentialité sont décrits dans
[Confort environnemental](comfort.fr.md).

<a id="templates"></a>
## Modèles

Les modèles sont des ensembles quotidiens réutilisables de blocs. Leurs
réglages peuvent être manuels ou utiliser des préréglages Velair partagés.
L’onglet Modèles contient aussi la bibliothèque de Préréglages climatiques ;
un préréglage Velair partage des réglages climatiques sans partager les horaires.

L’onglet Modèles permet de :

- créer un modèle ;
- renommer un modèle ;
- modifier ses blocs ;
- l’appliquer aux appareils et jours sélectionnés ;
- supprimer les modèles sans jours liés.

Dans Programmes, sélectionnez un modèle comme source d’un jour pour lier
ses horaires ou sa configuration complète. Copier un modèle reste une
opération séparée.

L’onglet Programmes peut aussi enregistrer le jour actuel comme nouveau modèle.

Lors d’une copie ou liaison à un appareil, Velair valide les modes HVAC,
types de consigne, limites de température et restrictions du fournisseur.
Les consignes hors limites et modes incompatibles sont refusés. Les réglages
manuels sont adaptés aux pas de température pris en charge ; les valeurs
des préréglages partagés sont adaptées à chaque destination sans modifier
la bibliothèque. Les réglages facultatifs non pris en charge sont filtrés,
à condition que le bloc garde une action valide.

Copier les blocs crée des horaires de modèle indépendants mais conserve les
références actives aux préréglages. Les liens **Horaires uniquement** partagent
les horaires avec des affectations climatiques indépendantes. Les liens
**Horaires et réglages** partagent le modèle complet, avec des commandes en
lecture seule à destination. Les changements de modèle valident tous les
jours liés, y compris dans les Profils inactifs. L’édition conserve la
position du modèle dans la bibliothèque.

Consultez [Préréglages climatiques et modèles liés](linked-schedules.fr.md) pour toutes
les règles et [Exemples pratiques](linked-schedule-examples.fr.md) pour les
configurations détaillées, les valeurs de repli des nouveaux blocs, les
conversions de liens, les nombres d’utilisations et le dépannage.

Les modèles peuvent inclure chaque réglage climatique facultatif disponible
parmi les appareils gérés, ce qui rend un modèle utile pour des installations
mixtes. Lorsqu’il est appliqué à un appareil précis, Velair ne conserve que les
options prises en charge. Par exemple, un modèle peut contenir
`fan_mode: quiet` pour un climatiseur, mais ce champ est supprimé automatiquement
si le même modèle est appliqué à une vanne thermostatique sans modes de ventilation.

<a id="climate-profiles"></a>
## Profils climatiques

Les profils climatiques font passer plusieurs zones entre des plans hebdomadaires
coordonnés sans écraser leurs programmations par défaut. Chaque profil peut
donner à une zone une programmation alternative, la mettre en pause, la
mettre en pause et l’éteindre, ou lui laisser sa programmation Par défaut.
Les zones omises continuent à utiliser leurs programmations par défaut.

Un Mode peut activer plusieurs Profils ensemble lorsque leurs zones configurées
ne se chevauchent pas. L’activation directe remplace l’ensemble actif par un
Profil et sélectionne Manuel. Les zones couvertes par l’ancien ensemble mais
pas par ce Profil reviennent à leurs programmations Par défaut. L’activation
applique les blocs actifs à l’heure actuelle, y compris ceux commencés un
jour précédent, et annule les Forçages des zones concernées. Les pauses globales
et par zone restent prioritaires.

Le panneau latéral utilise **Programmes** comme espace complet de
planification. Choisissez **Planifications par défaut** pour modifier le
plan hebdomadaire normal ou **Planifications des Profils** pour créer un Profil
et configurer un thermostat à la fois avec **Programmation par défaut**,
**Programmation du Profil** ou **Pause**. Les deux sources proposent la même
chronologie, les mêmes options, modèles et outils de clonage, mais leurs
sémantiques d’enregistrement restent distinctes : un jour Par défaut est
enregistré directement, tandis que les métadonnées et le comportement des
thermostats sont enregistrés atomiquement comme un Profil. Un Profil peut
toujours être activé directement depuis sa ligne. L’onglet **Modes** séparé
compose les Profils en configurations réutilisables sans dupliquer leur éditeur.
Lorsque Velair traite les zones concernées, une barre globale d’opération
montre la zone actuelle, le nombre traité et le résultat final de réussite
ou d’erreur partielle dans les onglets du panneau. Dans Lovelace, elle apparaît
uniquement dans Configuration active, où se font les activations de Modes et
Profils. Traité signifie que Home Assistant et Velair ont fini de gérer la
zone, y compris lorsqu’une pause ou dérogation rend inutile une commande
climatique. Cela ne signifie pas que la pièce a déjà atteint sa température cible.
Les résultats réussis disparaissent automatiquement après une courte
confirmation. Les résultats partiels et échoués restent visibles jusqu’à leur
fermeture. Les automatisations Home Assistant peuvent activer un Profil via
`velair.activate_profile` ou choisir une valeur configurable dans l’entité
native `select.velair_mode` de Velair.

Consultez [Profils climatiques](climate-profiles.fr.md) pour la configuration,
l’automatisation, le redémarrage, les interactions et la portabilité.

<a id="external-schedule-execution"></a>
## Exécution externe des programmations

Velair stocke normalement le plan hebdomadaire d’une zone et l’exécute via son
entité Home Assistant `climate.*`. Lorsque **Paramètres → Systèmes externes**
détecte un contrôleur compatible, une zone admissible peut déléguer l’exécution
à ce système. Velair publie alors la semaine effective complète sélectionnée
par Par défaut, un Profil ou un Mode. La zone doit d’abord avoir une
programmation effective enregistrée contenant au moins un bloc de température ;
sinon, Velair garde l’exécution locale et explique ce prérequis dans Paramètres.

Une zone gérée extérieurement reste réservée aux programmations. Velair
n’envoie pas d’actions climatiques directes pour Forçage, pause ou reprise,
réglage manuel, Room Assist ou Préconditionnement adaptatif. Le comportement
**Pause** des Profils est indisponible, tandis que **Programmation par défaut**
et **Programmation du Profil** sélectionnent la semaine publiée. Les limites
propres au contrôleur sont montrées une fois par système utilisé dans Paramètres
et sont aussi appliquées lors de l’édition des programmations compatibles.
Lorsqu’un contrôleur exige un point implicite de continuité à minuit,
l’éditeur l’inclut dans le nombre visible de changements quotidiens utilisés.

Vue d’ensemble rapporte seulement **Publication**, **Publié** ou **Échec**
après une tentative dans l’exécution actuelle de Home Assistant. **Publié**
signifie que l’intégration externe a accepté l’appel de service ; ce n’est
pas une confirmation d’application par le contrôleur physique. La zone
conserve son activité de programmation et son prochain événement normaux,
tandis qu’un indicateur **Externe** compact montre le contrôleur et la
publication. Velair n’interroge pas, ne relit pas et ne réessaie pas
automatiquement. Consultez [Exécution externe des programmations](external-systems.fr.md)
pour les systèmes pris en charge, limites, transfert de responsabilité et
état actuel de validation.

<a id="clone-schedules"></a>
## Cloner les programmations

Sous l’éditeur, Velair peut cloner le jour actuel :

- vers d’autres jours du même appareil ;
- vers le même jour sur d’autres appareils gérés.

Pour le clonage des jours, **Lun–Ven**, **Week-end**, **Tous les jours** et
**Effacer la sélection** permettent un choix rapide des destinations tout en
gardant les jours individuels disponibles. Ces raccourcis changent uniquement
les destinations sélectionnées ; **Cloner** reste explicite et le jour source
n’est jamais inclus.

Les actions de clonage enregistrent d’abord les changements en attente si
nécessaire. Elles copient la configuration source, y compris le modèle,
le type de liaison, les affectations d’horaires uniquement et les références
de préréglages. Cloner un jour indépendant supprime le lien de destination
pour ce jour ; les autres jours gardent leurs liens. Les destinations
incompatibles refusent le clonage sans modifier aucune destination choisie.
Utilisez **Délier** après clonage si le nouveau jour doit cesser de suivre son modèle.

<a id="pause-stop-and-resume"></a>
## Mettre en pause, arrêter et reprendre

Velair dispose de commandes globales du planificateur :

- **Pause** suspend l’exécution automatique pendant une durée en minutes.
- **Arrêter** suspend l’exécution automatique indéfiniment.
- **Reprendre** remet le planificateur en mode automatique.

Lorsqu’une pause temporaire est active, Vue d’ensemble montre le temps restant
et la progression.

Les durées de pause et forçage se saisissent en minutes. L’interface de service
Home Assistant autorise jusqu’à 10080 minutes, soit sept jours.

Velair prend aussi en charge les pauses par zone via services et automatisations.
Une pause de zone n’affecte qu’une entité climatique gérée. Les autres suivent
leurs programmations. À la reprise d’une zone, Velair applique la programmation
actuelle seulement si un bloc est actif pour cet appareil à cet instant ;
sinon, il laisse l’appareil inchangé.

<a id="boost"></a>
## Forçage

Le forçage s’applique par zone climatique. Il remplace temporairement la
programmation d’une entité et laisse les autres zones fonctionner normalement.

Au démarrage d’un forçage, Velair capture l’état restaurable actuel de la zone,
y compris son mode HVAC et sa consigne unique ou sa plage complète lorsque
Home Assistant les expose. Cet instantané sert uniquement à déterminer
ce qui doit se produire à la fin du forçage.

Le forçage est accessible via les services, scripts et automatisations et commandes des
tableaux de bord Home Assistant. L’éditeur principal reste concentré sur les
programmations tout en permettant des automatisations avancées comme :

- activer un forçage dans une pièce depuis un bouton ;
- activer un forçage après détection de mouvement ;
- activer un forçage depuis un assistant vocal ;
- activer un forçage avec un mode HVAC préféré.

Lorsqu’un forçage expire, Velair résout la zone concernée dans cet ordre :

1. Si un bloc actif définit explicitement un mode HVAC, Velair applique cette
   consigne programmée.
2. Si un bloc actif éteint l’appareil, Velair l’éteint.
3. Si aucun bloc n’est actif, Velair rétablit l’état capturé avant le forçage.
4. Si le bloc actif utilise `Conserver`, Velair rétablit aussi l’état capturé
   avant le forçage, car `Conserver` ne définit pas de nouveau mode HVAC à
   appliquer après la dérogation temporaire.

Un forçage ne doit donc pas amener Velair à inventer une nouvelle consigne de
chauffage ou refroidissement lorsque la programmation ne la définit pas explicitement.

<a id="startup-behavior"></a>
## Comportement au démarrage

Par défaut, Velair rétablit l’état enregistré de son planificateur après le
démarrage de Home Assistant sans forcer les appareils à une consigne programmée.

Dans Paramètres, vous pouvez activer **Appliquer la programmation active après
le démarrage**. Velair applique alors le bloc actuellement actif aux appareils
gérés après le démarrage de Home Assistant si le planificateur est automatique.
Un bloc commencé un jour précédent reste actif jusqu’au bloc hebdomadaire
suivant. Les forçages actifs sont respectés.

<a id="automation-blueprints"></a>
## Blueprints d’automatisation

Velair fournit des blueprints Home Assistant facultatifs dans sa documentation :

- basculer entre les actions Présence/Absence choisies à partir d’une entité
  de présence consolidée ;
- mettre un ou plusieurs appareils gérés en pause tant qu’une fenêtre ou porte
  sélectionnée reste ouverte ;
- choisir des Modes saisonniers ou d’autres actions une seule fois après confirmation d’une nouvelle plage saisonnière, avec notifications immédiates des relevés invalides.

Ils utilisent les événements d’état Home Assistant et des délais configurables,
pas une interrogation périodique. Le blueprint de présence peut signaler que
son groupe consolidé, capteur de modèle ou assistant reste indisponible sans
exécuter les actions Présence ni Absence. Le blueprint de fenêtres identifie
la pause qu’il crée afin qu’une fermeture ne supprime pas une pause manuelle
ou appartenant à une autre automatisation. Si un contact reste inconnu ou
indisponible, Home Assistant montre une notification de diagnostic retardée
pour l’ensemble de thermostats puis la ferme automatiquement après
récupération ; le contact concerné bloque toujours la reprise. Consultez
[Blueprints d’automatisation](blueprints.fr.md) pour la configuration, les
exemples, le démarrage et la règle d’une automatisation par zone pour les
contacts de fenêtres.

Le [blueprint saisonnier](blueprints/seasonal-climate-selection.fr.md) confirme une nouvelle plage saisonnière pendant 30 minutes par défaut. Les variations au sein de cette plage conservent l’échéance initiale ; les actions s’exécutent une seule fois par entrée dans la plage. Le démarrage
vérifie uniquement les diagnostics. Utilisez son éditeur normal d’actions
Home Assistant pour choisir les Modes Velair. Configurez un vrai Mode de
pause avec arrêt si un temps doux doit arrêter la climatisation ; des
actions vides laissent le fonctionnement actuel inchangé.

<a id="portability"></a>
## Portabilité

L’onglet Paramètres peut exporter et importer un fichier JSON versionné.

Le fichier peut contenir :

- les programmations des thermostats ;
- les modèles ;
- les préréglages climatiques partagés ;
- les paramètres du panneau ;
- l’apprentissage du préconditionnement adaptatif ;
- les définitions de profils climatiques ;
- les définitions de modes.

Les exports actuels du format 19 conservent les deux types de liaison aux modèles, les références de préréglages et les relations de Maître de préconditionnement. Les références d’exécution acceptée du maître restent locales et ne sont pas exportées. Exporter les programmations ou Profils inclut les modèles et
préréglages requis, affichés comme sections supplémentaires sélectionnées.
Les imports valident la configuration combinée, y compris les consommateurs
existants des ressources partagées remplacées. Les préréglages sont fusionnés
par clé stable : les clés correspondantes sont remplacées et les préréglages
locaux absents du fichier restent. Les sauvegardes existantes restent
importables ; les anciennes versions de Velair ne peuvent pas importer
le format 19. Consultez [l’exemple de sauvegarde](linked-schedule-examples.fr.md#back-up-the-whole-setup).

À l’import, Velair permet de choisir les sections à écraser. L’import
remplace les données sélectionnées : exportez d’abord si vous avez besoin
d’un point de récupération. Les définitions de Profils et Modes sont
portables, pas leur sélection active. Velair garde les identifiants des
Profils actifs qui existent encore et revient aux programmations par défaut
seulement s’il n’en reste aucun.

Chaque nouvel export indique son unité de température. Lors d’un import
depuis l’autre système d’unités, Velair convertit les valeurs thermiques
sélectionnées vers l’unité actuelle de Home Assistant. Les valeurs liées
à un appareil disponible sont alignées sur son pas effectif de consigne ;
les valeurs indépendantes utilisent une précision sûre si aucun pas commun
n’est disponible. La valeur manuelle de repli par zone est portable, tandis
que le dernier pas observé sur l’entité locale n’est délibérément pas exporté.
Les exports anciens sans unité enregistrée sont annoncés dans l’écran
d’import et interprétés comme Celsius.

L’apprentissage du préconditionnement adaptatif est associé par identifiant
exact d’entité climatique Home Assistant. L’apprentissage des appareils
non actuellement gérés est montré avant import et ignoré. Pour les appareils
correspondants, l’apprentissage importé remplace leur étalonnage existant.
L’apprentissage des appareils locaux absents du fichier reste inchangé.

Les valeurs de configuration du préconditionnement sont déjà incluses dans
**Programmations des thermostats**. La section séparée **Apprentissage du
préconditionnement** contient l’historique précieux d’étalonnage local.

<a id="maintenance"></a>
## Maintenance

L’onglet Paramètres affiche les informations techniques de version :

- compilation du frontend ;
- version du format d’export portable ;
- version du stockage/modèle ;
- version de l’intégration.

Il contient aussi une action de réinitialisation. Celle-ci supprime toutes
les données enregistrées de programmation Velair, y compris programmations,
modèles, préférences du panneau, forçages et pauses actifs, politiques
d’ajustements externes par appareil et réglages manuels actifs, paramètres
Confort et Room Assist, paramètres et apprentissage du Préconditionnement
adaptatif, et comportement au démarrage. Elle recrée ensuite des valeurs
par défaut adaptées à l’unité pour les appareils actuellement gérés. La
sélection distincte des catégories Diagnostic et son journal actuel ne
font pas partie de cette réinitialisation des données de programmation.
Velair demande une confirmation avant cette opération.

<a id="services"></a>
## Services

Velair expose des services Home Assistant pour les automatisations et scripts :

- `velair.set_temperature`
- `velair.set_hvac_mode`
- `velair.apply_schedule`
- `velair.boost`
- `velair.cancel_boost`
- `velair.activate_profile`
- `velair.deactivate_profile`
- `velair.enable_room_sensor_assist`
- `velair.disable_room_sensor_assist`
- `velair.pause`
- `velair.pause_zone`
- `velair.resume`
- `velair.resume_zone`
- `velair.set_external_change_policy`
- `velair.enter_manual_adjustment`
- `velair.resume_automatic_control`
- `velair.set_daily_schedule`
- `velair.copy_day_schedule`
- `velair.clear_schedule`
- `velair.update_block_preset`

Les services ciblant une entité fonctionnent uniquement avec les appareils
sélectionnés lors de la configuration. Si une entité climatique non gérée est
transmise, Velair refuse l’appel avant toute modification.

<a id="velairupdate_block_preset"></a>
### `velair.update_block_preset`

Met à jour un préréglage partagé enregistré avec sa clé stable `preset_key`.
Les mises à jour partielles conservent les champs omis ; un remplacement
explicite peut modifier son action. Les changements affectent toutes les
références et utilisent la validation normale, l’autorité des dérogations et
le recalcul du Préconditionnement. Consultez
[Automatisations de préréglages](preset-automations.fr.md) pour la référence des
champs et les exemples de température extérieure, plage, options d’appareil
et arrêt/restauration. Ce service modifie une définition partagée ; il ne
sélectionne pas un autre préréglage pour un bloc.

<a id="velairactivate_profile"></a>
### `velair.activate_profile`

Active un profil climatique enregistré et applique immédiatement le comportement
effectif actuel. Cela remplace l’ensemble complet de Profils actifs ; les zones
non couvertes par le Profil choisi reviennent à leurs programmations Par défaut.
Utilisez l’identifiant stable montré par Velair plutôt que son nom affiché
modifiable. Une activation directe met le sélecteur de Mode sur `Manual`.
Omettre `profile_id` revient encore aux programmations par défaut pour la
compatibilité ; les nouvelles automatisations devraient utiliser explicitement
`velair.deactivate_profile`.

```yaml
action: velair.activate_profile
data:
  profile_id: vacation
```

<a id="velairdeactivate_profile"></a>
### `velair.deactivate_profile`

Désactive tous les Profils actifs et remet immédiatement chaque zone à sa
programmation par défaut.

```yaml
action: velair.deactivate_profile
```

<a id="velairset_temperature"></a>
### `velair.set_temperature`

Définit une température unique ou une plage de consigne inférieure et supérieure
pour une entité climatique gérée. `hvac_mode` est facultatif.

C’est un service pratique limité à Velair, pas un remplacement de
`climate.set_temperature` de Home Assistant. Les différences sont :

- il accepte uniquement les entités climatiques gérées par Velair ;
- il valide la consigne selon les capacités et limites de température connues
  par Velair ;
- il utilise les règles de repli de mode HVAC de Velair lorsqu’un mode est
  fourni ou que l’appareil doit être allumé.

Utilisez les services climatiques natifs Home Assistant pour un contrôle
générique. Utilisez `velair.set_temperature` lorsqu’une automatisation ne
doit agir que sur les appareils gérés par Velair.

Les champs facultatifs `fan_mode`, `preset_mode`, `swing_mode`,
`swing_horizontal_mode` et `humidity` peuvent également être fournis. Velair
applique uniquement les champs pris en charge par l’appareil cible.

```yaml
action: velair.set_temperature
data:
  entity_id: climate.living_room
  temperature: 21
  hvac_mode: heat
  fan_mode: quiet
```

Pour une plage, omettez `temperature` et fournissez les deux limites :

```yaml
action: velair.set_temperature
data:
  entity_id: climate.living_room
  target_temp_low: 20
  target_temp_high: 24
  hvac_mode: heat_cool
```

`temperature` et les champs de plage sont mutuellement exclusifs. Les deux
limites de plage sont obligatoires ensemble.

<a id="velairset_hvac_mode"></a>
### `velair.set_hvac_mode`

Définit un mode HVAC annoncé autre que l’arrêt sans envoyer de température cible.
Velair accepte uniquement les appareils gérés à exécution locale, valide le
mode selon l’entité et enregistre la commande comme appartenant à Velair
afin de ne pas la confondre avec un ajustement externe.

```yaml
action: velair.set_hvac_mode
data:
  entity_id: climate.living_room
  hvac_mode: auto
```

Utilisez ce service lorsqu’une automatisation Velair doit modifier uniquement
le mode HVAC. Velair n’inclut pas de consigne scalaire ni de plage dans l’appel ;
l’intégration ou l’appareil peut néanmoins ajuster son propre état en interne
lors d’un changement de mode. Une transmission réussie désactive Room Assist
actif, car Velair ne possède plus de température cible pour cette commande.
Une transmission échouée laisse Room Assist inchangé et n’émet pas d’événement
de consigne réussie.

Utilisez le service natif `climate.set_hvac_mode` Home Assistant pour un
contrôle générique hors de Velair. Le mode `off` est délibérément refusé ;
utilisez l’action appropriée de pause, programmation ou contrôle climatique
Velair pour cette intention distincte.

<a id="velairapply_schedule"></a>
### `velair.apply_schedule`

Applique immédiatement le bloc actuellement actif. Si `entity_id` est omis,
Velair applique le bloc actif à tous les appareils gérés.

```yaml
action: velair.apply_schedule
data:
  entity_id: climate.living_room
```

<a id="velairboost"></a>
### `velair.boost`

Remplace temporairement la programmation d’une entité climatique. À l’expiration,
Velair applique la consigne explicite active lorsqu’elle existe ou rétablit
l’état capturé avant le forçage lorsqu’aucune consigne explicite n’est applicable.

```yaml
action: velair.boost
data:
  entity_id: climate.living_room
  temperature: 22
  duration_minutes: 45
  hvac_mode: heat
  fan_mode: high
```

Velair capture l’état restaurable avant d’appliquer le forçage. Un forçage est
refusé lorsque l’appareil est indisponible et que cet état ne peut pas être
capturé de façon sûre.

Un forçage de plage utilise `target_temp_low` et `target_temp_high` à la place
de `temperature`, selon les mêmes règles que `velair.set_temperature`.

<a id="velaircancel_boost"></a>
### `velair.cancel_boost`

Annule un forçage actif avant son expiration. Le retour est toujours le même
qu’à l’expiration normale : Velair applique la consigne explicite active
lorsqu’elle existe ; sinon, y compris avec un bloc `Conserver`, il rétablit
le mode HVAC et la consigne capturés avant le forçage. L’appel n’a aucun effet
si aucun forçage n’est actif.

```yaml
action: velair.cancel_boost
data:
  entity_id: climate.living_room
```

<a id="velairenable_room_sensor_assist"></a>
### `velair.enable_room_sensor_assist`

Active l’assistance par capteur de pièce pour un appareil géré. Celui-ci
doit déjà avoir un capteur de température de pièce configuré dans Room Assist.

```yaml
action: velair.enable_room_sensor_assist
data:
  entity_id: climate.living_room
```

<a id="velairdisable_room_sensor_assist"></a>
### `velair.disable_room_sensor_assist`

Désactive l’assistance par capteur de pièce pour un appareil géré. Si Velair
appliquait une consigne assistée, il rétablit la consigne programmée actuelle.

```yaml
action: velair.disable_room_sensor_assist
data:
  entity_id: climate.living_room
```

<a id="velairpause"></a>
### `velair.pause`

Met en pause l’exécution automatique des programmations. Omettez
`duration_minutes` pour l’arrêter indéfiniment.

```yaml
action: velair.pause
data:
  duration_minutes: 60
```

<a id="velairresume"></a>
### `velair.resume`

Reprend l’exécution automatique et applique la programmation actuelle.

```yaml
action: velair.resume
```

<a id="velairpause_zone"></a>
### `velair.pause_zone`

Met en pause l’exécution automatique pour une entité climatique gérée tandis que le reste de Velair continue à fonctionner. Omettez à la fois `duration_minutes` et `until_next_block` pour mettre cette zone en pause indéfiniment.

Définissez `until_next_block: true` pour terminer cette pause au début du prochain bloc de la programmation effective de la zone. Il s’agit de l’heure nominale du bloc, pas d’un début anticipé d’Anticipation. L’échéance est fixée lors de l’appel du service et survit aux redémarrages ; les modifications ultérieures de la programmation ne la déplacent pas. Cette option ne peut pas être combinée avec `duration_minutes` et l’appel échoue sans modifier la zone si aucun bloc futur n’existe. Les autres motifs de pause maintiennent la zone en pause jusqu’à leur propre fin.

```yaml
action: velair.pause_zone
data:
  entity_id: climate.guest_room
  pause_id: external_control
  action: none
  until_next_block: true
```

Le champ facultatif `action` peut valoir :

- `none` : laisser l’appareil exactement dans son état et empêcher seulement
  Velair de le modifier automatiquement ;
- `turn_off` : éteindre immédiatement l’appareil et le garder en pause.

Les automatisations peuvent aussi envoyer un `pause_id` facultatif contenant
de 1 à 128 lettres, chiffres, points, traits de soulignement, deux-points ou
tirets, commençant par une lettre ou un chiffre. Une pause identifiée ajoute
une raison sans remplacer celles ayant d’autres identifiants. Réutiliser
l’identifiant met à jour uniquement cette raison ; répéter exactement
l’appel n’a pas d’effet. Les appels sans `pause_id` gardent l’autorité manuelle
et remplacent toutes les raisons par une pause manuelle.

```yaml
action: velair.pause_zone
data:
  entity_id: climate.guest_room
  duration_minutes: 120
  action: turn_off
  pause_id: window_guard
```

<a id="velairresume_zone"></a>
### `velair.resume_zone`

Reprend l’exécution automatique pour une entité gérée. Par défaut, Velair
applique son bloc actuellement actif lorsqu’il existe. Si aucun bloc ne
s’applique à cet instant, il laisse l’appareil inchangé.

Lorsque `pause_id` est fourni, Velair supprime uniquement cette raison. Les
autres maintiennent la zone en pause et la programmation ne s’applique
qu’après la fin de la dernière raison. Utilisez `resume_all: true` pour
effacer explicitement toutes les raisons. Omettre les deux champs conserve
l’ancien comportement de reprise globale. Les champs ne peuvent pas être
combinés et `resume_all: false` sans identifiant est refusé.

Les raisons expirent indépendamment. Si l’une de celles qui restent utilise
`turn_off`, l’action effective de pause reste l’arrêt. Les forçages sont
refusés lorsqu’une zone est en pause.

```yaml
action: velair.resume_zone
data:
  entity_id: climate.guest_room
  apply_current_schedule: true
  pause_id: window_guard
```

<a id="velairset_daily_schedule"></a>
### `velair.set_daily_schedule`

Remplace la programmation d’un jour de semaine pour un appareil géré.

```yaml
action: velair.set_daily_schedule
data:
  entity_id: climate.living_room
  weekday: monday
  blocks:
    - start: "06:30"
      action: set_temperature
      temperature: 21
      hvac_mode: heat
      fan_mode: quiet
    - start: "09:00"
      action: turn_off
    - start: "18:00"
      action: set_temperature
      temperature: 20
      hvac_mode: heat
```

Les blocs peuvent inclure les valeurs facultatives `fan_mode`, `preset_mode`,
`swing_mode`, `swing_horizontal_mode` et `humidity`. Les valeurs non prises
en charge sont retirées pour l’appareil cible avant l’enregistrement ou
l’application de la programmation.

Utilisez `action: set_climate_options` avec un ou plusieurs de ces champs et
sans température ni `hvac_mode` pour appeler uniquement leurs services
Home Assistant. Par exemple :

```yaml
action: velair.set_daily_schedule
data:
  entity_id: climate.living_room
  weekday: monday
  blocks:
    - start: "06:30"
      action: set_climate_options
      preset_mode: comfort
    - start: "22:00"
      action: set_climate_options
      preset_mode: eco
      fan_mode: quiet
```

<a id="velaircopy_day_schedule"></a>
### `velair.copy_day_schedule`

Copie un jour Par défaut enregistré, y compris sa liaison de modèle et ses
références de préréglages, vers les jours choisis. Omettez `target_entity_ids`
pour copier dans l’appareil source ou fournissez cette liste pour copier
vers d’autres appareils gérés. Chaque combinaison appareil/jour est validée
et enregistrée dans une seule transaction.

```yaml
action: velair.copy_day_schedule
data:
  entity_id: climate.living_room
  source_weekday: monday
  target_weekdays:
    - tuesday
    - wednesday
    - thursday
```

Pour copier la même configuration du lundi vers d’autres thermostats :

```yaml
action: velair.copy_day_schedule
data:
  entity_id: climate.living_room
  source_weekday: monday
  target_weekdays:
    - monday
  target_entity_ids:
    - climate.study
    - climate.bedroom
```

Le service copie la dernière source enregistrée sous le verrou de configuration.
`expected_revision`, facultatif, refuse l’opération si la configuration a
changé ; le panneau fournit automatiquement sa révision actuelle. Les Profils
sont modifiés et enregistrés via leur propre processus de Profil complet.
Copier un jour indépendant enregistré supprime les liens de modèle des jours
de destination sélectionnés ; les autres jours sont conservés.

<a id="velairclear_schedule"></a>
### `velair.clear_schedule`

Efface la programmation d’un jour. Omettez `weekday` pour effacer tous les
jours de cet appareil géré.

```yaml
action: velair.clear_schedule
data:
  entity_id: climate.living_room
  weekday: sunday
```

<a id="automation-events"></a>
## Événements d’automatisation

Velair émet également des événements Home Assistant utilisables comme
déclencheurs d’automatisation. Ces événements sont transitoires ; ils ne
sont pas stockés comme configuration et ne remplacent pas les entités
de diagnostic.

Tous les événements d’exécution utilisent le même type d’événement Home Assistant :

```text
velair_event
```

Le champ `event` identifie les changements d’ensemble de Profils, de mode
du planificateur, les consignes appliquées, les plans et observations du
Préconditionnement adaptatif, les changements de Confort environnemental,
d’état et de consigne Room Assist, les forçages et les pauses de zone.

Consultez [Événements d’automatisation](automation-events.fr.md) pour les règles
exactes d’émission, la déduplication, les champs disponibles et un exemple
complet de charge utile pour chaque type d’événement.
