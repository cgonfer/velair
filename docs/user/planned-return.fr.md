<a id="planned-return"></a>
# Retour prévu

<!-- velair-docs:start -->
Traductions: [Original en anglais](planned-return.md) · [Español](planned-return.es.md) · [Français](planned-return.fr.md) · [Deutsch](planned-return.de.md) · [Italiano](planned-return.it.md) · [Nederlands](planned-return.nl.md) · [Polski](planned-return.pl.md) · [Português (Brasil)](planned-return.pt-br.md) · [Português (Portugal)](planned-return.pt-pt.md) · [Русский](planned-return.ru.md) · [État des traductions](../translation-status.md)

<details>
<summary>État de cette traduction</summary>

| Information | État |
| --- | --- |
| Version de référence | 1.9.0-beta.5 |
| Dernière synchronisation | 2026-10-24 |
| Révision linguistique | Traduction assistée par IA |
| Par rapport à l’original | Synchronisée avec l’original anglais. |

</details>

---
<!-- velair-docs:end -->

La configuration précédente enregistrée par Retour prévu inclut la base Mode/Profils et toutes les exceptions par zone. Un départ confirmé sélectionne la base Absence et efface les exceptions ; une arrivée terminée sélectionne la base de destination. Annuler un épisode confirmé via l’action Annuler de Retour prévu rétablit toute la sélection enregistrée, exceptions comprises, si les références restent valides. Une sélection externe de Profil/Mode annule plutôt le retour en attente et applique la sélection demandée sans rétablir la précédente. Consultez [base et exceptions de zone](climate-profiles.fr.md#a-base-with-independent-zone-exceptions).

Le retour prévu prépare le logement pour une heure d’arrivée régulière ou ponctuelle après
que les signaux d’occupation sélectionnés confirment que tout le logement est vide, ou après un
démarrage ponctuel explicite sans sources d’occupation ou avec **Appliquer le mode Absence maintenant** sélectionné. Configurez-le dans
Velair ; aucun blueprint supplémentaire ni action quotidienne n’est nécessaire pour une routine
hebdomadaire stable. La routine automatique est désactivée par défaut et fonctionne localement
dans Home Assistant. Les retours ponctuels nécessitent des modes Absence/Retour enregistrés et une
programmation automatique opérationnelle ; les sources d’occupation sont facultatives pour les
démarrages explicites. La routine hebdomadaire exige au moins une source d’occupation.

<a id="setup"></a>
## Configuration

**Absence et retour** contient les réglages partagés des retours ponctuels et de la routine hebdomadaire. La détection d’absence fonctionne pour un retour ponctuel démarré ou lorsque la routine hebdomadaire enregistrée est activée. Ces champs ne créent pas une automatisation Présence/Absence permanente séparée. Le délai mesure une absence détectée continue, pas le temps depuis l’enregistrement. Le Mode Absence s’applique normalement après confirmation du départ ; les pièces éligibles peuvent se préparer avant l’application du Mode de destination à l’arrivée.

Sans source d’occupation, démarrer un retour ponctuel applique immédiatement le Mode Absence sans utiliser le délai de confirmation. Cette exception apparaît près du délai lorsqu’aucune source n’est sélectionnée.

Les blocs de destination **Température uniquement** gardent le mode HVAC sous contrôle externe. Retour prévu n’allume pas un équipement éteint pour préparer ce bloc ; son confort à l’arrivée ne peut pas être promis tant qu’il reste éteint. Utilisez un bloc de destination **Chauffage** ou **Refroidissement** explicite si la préparation doit démarrer l’équipement. La sélection de destination à l’arrivée respecte toujours cette politique.

1. Créez les Modes Absence et Présence souhaités, ou utilisez Par défaut comme destination. Les Profils d’absence peuvent éteindre les appareils ou réduire la demande hebdomadaire.
2. Ouvrez l’onglet **Retour prévu** et ajoutez les sources d’occupation pour les départs surveillés ou hebdomadaires : capteurs binaires, input booleans, groupes ou zone Home Assistant `zone.home`. Incluez toute personne pouvant rester, y compris les invités. Home Assistant reste responsable des personnes et positions ; un helper peut combiner les règles complexes.
3. Dans **Absence et retour**, choisissez le temps d’absence continue, le Mode Absence et le Mode de destination. Le délai par défaut est de dix minutes ; le contrôle accepte minutes ou heures. L’arrivée est reconnue immédiatement. L’aide du Mode de destination explique la préparation adaptative et l’action à l’arrivée sans estimation valide.
4. Dans **Heures d’arrivée**, saisissez l’heure habituelle pour chaque jour concerné. Les arrivées hebdomadaires s’appliquent au jour où le logement devient vide. Un jour sans heure applique Absence après confirmation et rétablit la destination à la présence détectée, sans préparation anticipée. Velair prépare chaque zone avec l’horaire de destination à l’arrivée.
5. Activez le préconditionnement adaptatif pour les zones devant démarrer tôt. Les réglages et l’apprentissage local chauffage/refroidissement existants sont réutilisés.
6. Activez **Routine hebdomadaire** dans la barre d’état, puis Enregistrer. Cela active confirmation automatique d’absence, sélection du Mode Absence et **Heures d’arrivée** hebdomadaires. Saisir des heures ne suffit pas à activer la routine. Un retour ponctuel reste possible interrupteur éteint. L’interrupteur modifie le brouillon ; Annuler rétablit la valeur enregistrée. Arrêtez toute automatisation Présence/Absence sélectionnant des Modes pour ce foyer afin d’éviter des contrôleurs concurrents.

Les jours suivent la préférence **Premier jour de la semaine** enregistrée dans les paramètres
Velair. Saisissez directement une heure d’arrivée pour chaque jour. Si vous partez un jour sans
heure, Velair applique Absence après confirmation, ne programme aucune préparation anticipée et
rétablit la destination lorsque l’occupation est détectée. Le fuseau horaire Home Assistant est
affiché à côté de la routine hebdomadaire. Les changements restent dans le brouillon jusqu’à
l’enregistrement. Annuler et Enregistrer sont à droite du pied de formulaire.

Le résumé supérieur regroupe trois parties de la routine dans des conteneurs bordés distincts
correspondant aux sections de réglages, sans carte englobante ni bordure latérale commune. La
routine hebdomadaire montre le mode Absence, le délai de confirmation, la préparation adaptative
et le mode de destination dans une présentation simple ; l’interrupteur modifie son activation. Le délai
est le temps pendant lequel le logement doit rester vide, pas une estimation du temps de préparation.
La section occupation montre le résultat combiné et les nombres de sources ; développez-la pour
examiner chaque signal. Les signaux inconnus empêchent la confirmation automatique du départ et se distinguent
de la présence confirmée. La section retour rapide regroupe le départ ponctuel et les commandes
d’arrivée de l’épisode actuel. Les actions d’exécution utilisent la configuration enregistrée ;
enregistrez ou annulez donc les modifications en attente avant d’annoncer un nouveau départ.

Le formulaire regroupe sources d’occupation, délai, Mode Absence et destination dans **Absence et retour**. À grande largeur, délai et deux Modes partagent une ligne ; sur tablette le délai est au-dessus des deux Modes ; sur mobile les trois contrôles s’empilent dans cet ordre. Chacun garde son aide près de lui. **Heures d’arrivée** contient uniquement les heures par jour, leur explication et le fuseau Home Assistant. Les sources de présence utilisent
l’action Ajouter circulaire verte de l’éditeur de blocs lorsqu’une source est sélectionnée.
Ajouter et Supprimer désactivés gardent leur aspect transparent ; les actions activées fournissent
un retour visuel au survol et au focus.
La liste des sources configurées commence repliée. Son résumé montre le total et les nombres de
signaux occupés, vides et inconnus ; développez-la pour examiner ou supprimer des sources individuelles.
Sur mobile, le résumé couvre toute la ligne sélecteur/Ajouter ; icônes d’état et nombres gardent
les compteurs ensemble, avec des libellés accessibles complets.
Les compteurs sont alignés à droite du résumé. Sur mobile, la liste développée partage sa
largeur, avec Supprimer au bout de chaque ligne et plus d’espace pour noms et identifiants. Sur
ordinateur, les listes ont la même largeur que le sélecteur. Développer la liste ne modifie pas
la configuration. Les délais saisis en heures sont arrondis à la minute la plus proche ; le délai
équivalent est affiché à côté de la commande.

Les états occupés reconnus sont `on` et `home` ; les états vides sont `off` et `not_home`.
Pour la zone du domicile, zéro personne signifie vide et un nombre positif signifie occupé.
Un signal occupé suffit à rendre le logement occupé ; seule l’absence rapportée par tous les
signaux le rend vide. Si aucun signal ne rapporte de présence et qu’un est inconnu ou indisponible,
l’occupation est inconnue : les absences automatiques ne peuvent pas démarrer. Une demande explicite **Appliquer le mode Absence maintenant** peut toujours activer Absence, mais ne peut confirmer le départ tant que l’occupation reste inconnue. Un retour accepté reste
programmé. Le panneau montre le résultat combiné et chaque source.

Sélectionnez des signaux représentant l’occupation : un capteur de mouvement éteint ne signifie
pas nécessairement que personne n’est à la maison.

<a id="room-preparation"></a>
## Préparation des pièces

Développez **Préparation des pièces** sous la routine pour voir tous les équipements gérés. La liste commence repliée. Sans futur retour accepté, les nombres décrivent les capacités enregistrées : préparation anticipée, action à l’arrivée uniquement ou aucune préparation. Pour un retour accepté, le résumé partagé compte les pièces en attente, en préparation, à la cible, suspendues, indisponibles ou à l’arrivée uniquement. Il montre l’arrivée enregistrée et le premier début estimé éligible disponible ; les pièces peuvent démarrer séparément. Développer ne modifie rien et n’envoie aucune commande. La même vue s’applique aux retours hebdomadaires et ponctuels.

Chaque ligne identifie la pièce, la source de sa programmation de destination et l’état de
préparation. Un appareil absent des profils du mode de destination utilise encore sa programmation
**Par défaut** ; un comportement normal explicite utilise aussi Par défaut. Une programmation de
profil utilise le nom de ce profil. Une pause du profil de destination, une zone désactivée ou une
exécution externe est identifiée séparément au lieu d’être marquée arrivée uniquement. Sans
préconditionnement adaptatif, une pièce locale activée suit sa programmation effective à l’arrivée ;
elle n’est pas automatiquement exclue des changements de mode.

Sans retour futur, cette liste décrit les possibilités offertes par la configuration enregistrée, pas une
prédiction de démarrage anticipé. Une fois un retour accepté, elle résout chaque consigne de
destination à cette heure et montre les états en attente, en préparation, consigne atteinte,
suspendu ou indisponible avec leur raison. L’absence de données de température ou d’estimation
valide empêche la préparation anticipée ; Forçage, Réglage manuel et pauses explicites gardent
leur priorité normale. Sans **Appliquer le mode Absence maintenant**, un départ non confirmé ne peut pas apparaître en préparation.
**En préparation** décrit l’intention active de préparation de Velair, pas une confirmation que
l’appareil a reçu une commande ou fonctionne physiquement. **Consigne atteinte** correspond à une
température actuelle mesurée dans la tolérance de préparation et peut déjà être le cas avant le
départ ; cela ne démarre pas une absence et ne contourne pas la confirmation.

**Début prévu** est une estimation, pas une preuve de commande climatique ni de préparation
physique. Les consignes prennent en charge le chauffage, le refroidissement et les plages de température.
Les retours terminés, annulés et ignorés reviennent aux informations de configuration plutôt que
d’afficher des horaires de préparation obsolètes. Le diagnostic continue d’utiliser les réglages
enregistrés du backend jusqu’à la réussite d’Enregistrer, sans rappel de préparation supplémentaire.
Cette liste complète remplace l’ancienne liste de zones limitée à l’épisode.

<a id="preconditioning-dependencies"></a>
### Dépendances du préconditionnement

Le **Maître de préconditionnement** d’une pièce s’applique aussi à Retour prévu. Sa préparation attend que son propre début estimé et le début de préparation du maître sélectionné le permettent tous deux. Les deux plans appartiennent au même épisode de retour et utilisent sa configuration de destination ; une préparation hebdomadaire sans rapport ne libère pas une pièce dépendante à l’arrivée. Sans préparation éligible du maître, l’équipement dépendant attend sa cible normale d’arrivée. Consultez [Maître de préconditionnement](adaptive-preconditioning.fr.md#preconditioning-master).

<a id="one-off-return"></a>
## Retour ponctuel

Dans **Retour ponctuel**, choisissez une date et une heure futures puis **Planifier le retour** (planifier le retour).
Date et heure restent ensemble. Sur mobile, **Planifier le retour** se trouve sur la ligne suivante,
aligné au bord droit du champ d’heure ; sur les dispositions larges, l’action reste à côté des
champs. L’explication est sous les commandes.
Vous pouvez le faire avant de partir ou lorsque vous êtes déjà absent. Velair utilise les réglages
de modes et présence enregistrés. Par défaut, avec des sources d’occupation configurées, il garde la demande
en attente et applique Absence uniquement après que toutes les sources rapportent l’absence pendant
le délai de confirmation, protégeant les personnes restées chez elles.
Sans sources d’occupation enregistrées, **Planifier le retour** est votre confirmation explicite
de départ : Absence démarre immédiatement, sans délai. Velair ne déduit pas que le logement est vide
et ne détecte pas votre retour physique dans ce cas ; il prépare normalement les pièces et active
la destination à l’arrivée enregistrée. Par défaut, une source configurée inconnue/indisponible reste en attente ;
une entité manquante ne peut pas être considérée comme une liste vide de sources.

Avec des sources d’occupation enregistrées, **Appliquer le mode Absence maintenant** est une case facultative pour chaque retour ponctuel. Elle commence décochée et n’est pas un réglage enregistré de la routine. La cocher applique immédiatement le Mode Absence configuré, même si vous êtes encore chez vous. La préparation et le changement de destination à l’heure prévue deviennent immédiatement actifs. Le retour automatique par présence attend que toutes les sources signalent une absence continue pendant le délai de confirmation configuré. Une présence ou un relevé inconnu remet cette attente à zéro ; après confirmation, la présence active immédiatement la destination.

Par exemple, avec un délai de dix minutes et un retour à 18:00 :

| Heure | Observation | Résultat |
| --- | --- | --- |
| 08:00 | Planifier le retour avec Appliquer le mode Absence maintenant coché, encore chez soi. | Absence s’applique ; retour à l’heure prévue et préparation sont actifs. |
| 08:10 | Toutes les sources signalent une absence. | Début des dix minutes de confirmation. |
| 08:15 | Présence après une courte sortie. | Remise à zéro de la confirmation ; maintien d’Absence. |
| 08:30 | Toutes les sources signalent à nouveau une absence. | Début d’un nouveau délai de dix minutes. |
| 08:40 | Toutes les sources sont restées sans présence. | Activation du retour automatique par présence sans réappliquer Absence. |
| 17:00 | Une présence est détectée. | Sélection immédiate de la destination. |

La carte de retour du panneau, la carte Lovelace et le résumé de Vue d’ensemble conservent Absence ou Préparation comme état principal. Une ligne compacte distincte indique **En attente de confirmation du départ**, ou **Confirmation du départ en cours** avec son échéance. Une présence ou des relevés inconnus pendant cette attente rétablissent le message d’attente. L’occupation réelle reste visible séparément, y compris une présence pendant qu’Absence est actif. Les trois vues gardent cette ligne concise et placent les règles de confirmation dans son aide contextuelle, sans répéter l’état principal de préparation ni son icône. Ouvrir l’aide de Vue d’ensemble ne change pas de vue. Après confirmation, la ligne d’attente disparaît et l’aide explique que la présence peut désormais déclencher le retour : dans l’aide de phase principale de la carte, ou celle du début de chronologie de Vue d’ensemble. L’aide des extrémités explique leur sens sans répéter l’heure visible.

La chronologie commence à l’application d’Absence ; son aide distingue cette heure du départ physique surveillé. Ses libellés d’extrémités, marqueurs de préparation des pièces et arrivée enregistrée restent inchangés. Même si l’absence n’est jamais confirmée, la préparation programmée et le changement de destination à 18:00 ont lieu. **Annuler** reste disponible avant confirmation, tout comme la commande explicite d’arrivée de l’API. Un délai de zéro minute nécessite encore l’observation d’un logement vide. Sans source, la case est omise et le démarrage immédiat existant reste inchangé.

La date et l’heure ponctuelles remplacent l’heure hebdomadaire pour cette absence uniquement.
Cela fonctionne aussi avec la routine automatique désactivée. Vous pouvez modifier ou annuler
l’annonce en attente ; si un départ normal en attente n’est pas confirmé avant l’heure d’arrivée, elle expire sans
changer de modes. Si toutes les sources indiquent déjà une absence et qu’aucun épisode n’est actif,
planifier le retour démarre immédiatement le délai de confirmation configuré ; aucun nouveau
changement de capteur n’est nécessaire. Si une absence est déjà active, modifiez la date et l’heure
d’arrivée avec l’éditeur existant de l’épisode ; le retour devient ainsi ponctuel sans appliquer à
nouveau Absence.
Reporter une arrivée termine la préparation déjà engagée et restaure le comportement Absence actuel
jusqu’à l’heure de début de la nouvelle préparation. Forçage et dérogations manuelles restent protégés.
La consigne de destination est résolue à la date locale d’arrivée sélectionnée, y compris si la
préparation commence la veille. Soumettre le même instant ne réinitialise pas la préparation.
Les arrivées passées ou actuelles et les heures locales inexistantes lors du changement d’heure
sont rejetées ; une heure répétée utilise sa première occurrence future.

Les épisodes terminés, ignorés et annulés restent verrouillés pour la routine automatique jusqu’à
détection de l’occupation, afin qu’un logement vide ne démarre pas seul un nouveau départ hebdomadaire.
Vous pouvez choisir explicitement **Planifier le retour** après tout épisode inactif sans attendre
d’être de retour chez vous. La nouvelle demande utilise les sources et modes actuels. Avec des sources, elle
confirme à nouveau l’absence pendant le délai configuré même si tout le monde est déjà absent,
sans changer immédiatement le mode. Sans sources, l’enregistrement explicite active immédiatement
Absence. Le panneau latéral et la carte de tableau de bord affichent tous deux un nouveau formulaire
dès qu’un épisode devient inactif. Si la planification est indisponible, le formulaire reste visible
avec **Planifier le retour** désactivé et une explication des réglages enregistrés et de l’état
du planificateur requis. Un retour actif peut toujours être annulé dans cette situation.

Après confirmation du départ, utilisez **Annuler** pour arrêter le retour et restaurer les modes
et profils précédents enregistrés, ou **Modifier l’arrivée** pour actualiser sa date et son heure.
Pendant une confirmation normale d’absence, annuler laisse la sélection active inchangée, car le mode Absence
n’a pas été appliqué. Avec Absence appliquée manuellement de façon immédiate, Annuler restaure la sélection précédente même pendant la confirmation du départ surveillé. Désactiver la routine automatique ou modifier les heures hebdomadaires n’annule
pas un retour manuel. Modifier ses sources de présence ou modes invalide l’annonce précédente.
Les sélections explicites de modes/profils annulent les retours en attente et actifs. Un planificateur
arrêté n’exécute pas le retour.

La première ligne garde le titre Retour ponctuel à gauche et les indicateurs d’occupation propres
à la carte à droite. La phase actuelle est un sous-titre compact placé avec le titre, sans étiquette
ni ligne séparée. Pendant la confirmation, le titre du processus de temporisation fournit la phase
à sa place. La carte de tableau de bord regroupe les compteurs d’occupation en haut à droite si des
sources sont configurées. Sans sources, les compteurs et l’icône de délai inutilisée sont omis,
et le panneau indique **Non surveillée** plutôt qu’une occupation inconnue. L’icône de délai de
confirmation n’apparaît qu’avant confirmation d’une absence active ; elle est masquée pendant
Absence/Préparation et les erreurs actives avec départ confirmé.
Le panneau latéral ne répète pas ces indicateurs. Survolez-le pour une brève explication de cette phase.
Pendant la confirmation d’absence, une ligne discrète de temporisation explique que Velair vérifie
que le logement reste vide. **Jusqu’à** montre l’échéance de confirmation du backend à l’heure
locale de Home Assistant, avec la date si elle diffère d’aujourd’hui. Velair active le mode Absence après
confirmation uniquement si chaque source sélectionnée indique toujours une absence. C’est une
échéance, pas un compte à rebours en direct ni un départ confirmé. Le même processus apparaît
pendant la confirmation hebdomadaire avant qu’un épisode existe ; des données d’échéance manquantes
ne produisent pas d’heure inventée.
Avant confirmation, une icône d’arrivée et le libellé **Arrivée prévue** identifient le retour
enregistré avec libellé accessible et infobulle. Cette ligne est alignée avec le titre et le texte
d’état. Sa date/heure enregistrée est une étiquette compacte cliquable, sans crayon ni soulignement.
La chronologie confirmée utilise la même icône ; la date/heure d’arrivée enregistrée est une surface d’édition sombre semblable à un champ, avec la même typographie que le départ. Sélectionnez cette valeur pour ouvrir
l’éditeur intégré. Sa ligne d’actions contient un bouton bleu **Retour** avec flèche gauche à gauche
et **Modifier l’arrivée** vert à droite. Retour abandonne les modifications non enregistrées et
ferme l’éditeur sans changer le retour.
Sur un panneau latéral large, l’éditeur reste compact et aligné sur l’extrémité arrivée ; l’action
de modification reste à droite sous l’éditeur. Les écrans étroits et la carte conservent leur
disposition adaptative.
Les champs restent masqués jusqu’à demande. **Retour** restaure la dernière arrivée enregistrée
et masque les champs. Il efface l’avertissement d’arrivée et la protection de navigation ; la
configuration indépendante non enregistrée de la routine reste protégée. Rouvrir repart de l’arrivée
enregistrée. Pendant une absence confirmée, l’extrémité arrivée de la chronologie est ce même
bouton, donc aucune arrivée n’est dupliquée.
Annuler apparaît sous le contenu de l’épisode à gauche uniquement lorsque
l’éditeur est fermé. Pendant la modification, Annuler est masqué ; **Modifier l’arrivée** est à
droite et **Retour** à gauche, abandonnant localement la modification. Changer le champ ne change
pas le retour planifié tant que **Modifier l’arrivée** ne réussit pas. Une modification réussie
ferme l’éditeur et redonne le focus à l’arrivée enregistrée. Les échecs et mises à jour des capteurs
conservent le brouillon ouvert.
Un avis de modifications non enregistrées signale une modification en attente ; navigation ou
rechargement avertit avant de l’abandonner. Enregistrer la configuration de routine n’applique pas
une modification d’arrivée. Retour et Modifier l’arrivée utilisent respectivement des surfaces
pleines compactes bleues et vertes. Leurs surfaces visibles font 32 pixels de haut dans des cibles
tactiles de 44 pixels. L’annulation utilise une surface pleine rouge compacte avec icône/texte
blancs sous les données de l’épisode. Sa surface visible fait 32 pixels de haut dans une cible de
44 pixels ; survol et focus restent clairs. Les couleurs de premier plan s’adaptent au thème pour
que textes et icônes restent lisibles.
Les actions indisponibles utilisent un fond neutre et des textes/icônes atténués, avec un curseur
d’interdiction. Modifier l’arrivée devient vert lorsque l’arrivée est modifiée. La phase reste
affichée avec le titre. Annuler reste à gauche sous les données hors édition ; Modifier l’arrivée est
aligné à droite sous l’éditeur ouvert. Panneau et carte préservent ce regroupement sur mobile.
Plan return reste aligné à droite dans le nouveau formulaire.
Les actions réussies mettent à jour l’épisode sans message d’enregistrement supplémentaire.

<a id="home-assistant-actions"></a>
### Actions Home Assistant

Les automatisations, scripts et tableaux de bord peuvent annoncer un départ avec
`velair.start_planned_return`. `return_date` (`YYYY-MM-DD`) et `return_time` (24 heures `HH:MM`)
sont tous deux obligatoires. Ensemble, ils doivent identifier une arrivée future dans le fuseau
horaire Home Assistant. Le sélecteur d’heure natif peut envoyer `HH:MM:00` ; les secondes nulles
sont acceptées et normalisées à la minute. Choisissez une date future pour l’exemple suivant :

```yaml
action: velair.start_planned_return
data:
  return_date: "2026-10-09"
  return_time: "19:25"
```

Cela utilise les réglages de présence et modes enregistrés, ainsi que le même comportement de
confirmation, préparation et dérogations que **Planifier le retour**. Cela fonctionne lorsque
la routine hebdomadaire est désactivée et actualise la date et l’heure si une absence est déjà
active, sans appliquer à nouveau Absence. Les modes enregistrés et la programmation automatique
doivent être opérationnels. Les sources sont facultatives pour les retours ponctuels : une liste
enregistrée vide applique Absence immédiatement ; des sources configurées gardent les règles
normales de confirmation sauf si `apply_away_now: true` est fourni. Une arrivée passée ou à l’instant présent est rejetée sans remplacer
le retour précédent. Une heure expirée ou inexistante au changement d’heure est rejetée ; pendant
une heure répétée, Velair choisit la première occurrence encore future.

Annuler un retour en attente ou actif :

```yaml
action: velair.cancel_planned_return
data: {}
```

La même action d’annulation ferme aussi l’avis d’un épisode inactif. Elle arrête la préparation
et le retour temporisé, en conservant le verrou d’annulation automatique. Après départ confirmé,
elle restaure le mode et la sélection exacte de profils enregistrés avant le début de l’épisode.
Pendant une confirmation normale en attente, elle laisse la sélection actuelle inchangée. Avec Absence appliquée manuellement de façon immédiate, elle restaure la sélection enregistrée même avant confirmation du départ surveillé. Un nouveau **Planifier le
retour** explicite peut remplacer cet épisode inactif. Panneau et carte utilisent la même action.

<a id="cancelling-a-return-examples"></a>
## Annuler un retour : exemples

Le délai de confirmation d’absence intervient **avant** l’application du mode Absence. Annuler
pendant ce délai ne nécessite aucune restauration : le mode et les profils précédents restent
actifs. Annuler après un départ confirmé restaure la sélection enregistrée au début de l’épisode,
plutôt que d’activer immédiatement le mode Retour configuré.

Pour les exemples suivants, supposons :

- **Confort** est actif, sélectionnant les profils **Confort salon** et **Confort chambre**.
- Le mode Absence est **Absent**, le mode Retour est **Soirée** et l’arrivée est prévue à 18:00.
- Les sources rapportent un logement vide à 13:00 et le délai de confirmation est de cinq minutes.

<a id="cancel-before-confirmation-finishes"></a>
### Annuler avant la fin de la confirmation

| Heure | Ce qui se passe | Mode et profils sélectionnés |
| --- | --- | --- |
| 13:00 | Démarrer un retour. Velair vérifie que le logement reste vide jusqu’à 13:05. | Confort et ses deux profils restent actifs. |
| 13:02 | Sélectionner **Annuler** pendant la confirmation d’absence. | Confort et ses deux profils restent actifs ; Absence n’a jamais été appliqué. |

L’arrivée prévue à 18:00 est retirée. Cet épisode annulé n’active plus tard ni Absence ni Soirée.

<a id="cancel-after-departure-is-confirmed"></a>
### Annuler après confirmation du départ

Il s’agit d’un épisode distinct utilisant la même configuration initiale :

| Heure | Ce qui se passe | Mode et profils sélectionnés |
| --- | --- | --- |
| 13:00 | Démarrer un retour et commencer la confirmation. | Confort et ses deux profils restent actifs. |
| 13:05 | Toutes les sources configurées rapportent toujours l’absence. | Velair applique Absence et ses profils. |
| 13:10 | Sélectionner **Annuler**. | Velair restaure Confort et les deux profils d’origine, puis retire l’arrivée. |

Le résultat est Confort, **pas** le mode Retour Soirée configuré. Si la préparation de Soirée avait
déjà commencé, l’annulation la retire aussi et restaure la sélection d’origine. Les forçages actifs,
ajustements manuels et pauses indépendantes gardent leur priorité.

<a id="start-without-occupancy-sensors"></a>
### Démarrer sans capteurs d’occupation

Sans sources d’occupation configurées, **Planifier le retour** applique immédiatement Absence.
Il n’y a pas d’étape de confirmation de cinq minutes. Annuler ce retour actif restaure Confort
et les deux profils enregistrés juste avant son démarrage. Un capteur configuré inconnu ou
indisponible ne correspond pas à une absence de capteurs : il continue de bloquer une nouvelle
confirmation d’absence.

<a id="default-arrival-edits-and-restart"></a>
### Par défaut, modifications d’arrivée et redémarrage

Si l’épisode démarre depuis **Par défaut** sans profils actifs, annuler après confirmation du
départ revient à Par défaut sans profils actifs. Une combinaison manuelle de profils est restaurée
dans son ordre d’origine.

Modifier l’arrivée de 18:00 à 19:00 ou redémarrer Home Assistant ne remplace pas la sélection
précédente enregistrée. Annuler restaure toujours celle d’avant le début de cet épisode. Cela
ne récupère pas les anciennes températures des appareils ni leurs états HVAC : la sélection
restaurée utilise ses programmations actuelles, sous réserve des dérogations existantes.

<a id="choose-another-mode-instead-of-cancelling"></a>
### Choisir un autre mode au lieu d’annuler

Si vous sélectionnez explicitement **Eco** pendant un retour actif, cette sélection retire le
retour et conserve Eco. Velair ne restaure pas ensuite Confort lorsque l’occupation change ou que
l’avis de fin d’épisode est fermé. Cela préserve votre choix explicite ; c’est une action différente du
bouton **Annuler** de l’épisode.

<a id="distinguish-the-controls"></a>
### Distinguer les commandes

- **Annuler** dans les commandes de retour retire l’épisode comme décrit ci-dessus.
- **Retour** dans l’éditeur d’arrivée abandonne les modifications non appliquées ; le retour enregistré continue.
- Le **X** du panneau d’actions générique de la carte climatique ferme ce panneau sans annuler le retour.
- **Annuler** à côté d’**Enregistrer** dans la configuration de routine abandonne les réglages non enregistrés, sans annuler un épisode.

Pour les épisodes anciens sans sélection précédente enregistrée, ou si les profils enregistrés
ne sont plus valides, consultez [les limites de restauration](#restoration-limits).

<a id="daily-behavior"></a>
## Fonctionnement quotidien

Configurez par exemple du lundi au vendredi à 18:15. Une fois que le logement est resté vide pendant
le délai de confirmation, Velair active Absence et résout la programmation Présence à 18:15.
Chaque zone utilise sa propre estimation de préparation. Une zone nécessitant une heure peut
démarrer à 17:15 tandis qu’une zone plus rapide démarre plus tard.

La consigne est celle du bloc effectif **à l’arrivée**, y compris la continuité hebdomadaire.
Si Présence demande 17 degrés avant 18:00 puis 21 après, un retour à 18:15 prépare 21 degrés même
si la préparation commence avant 18:00. La programmation hebdomadaire n’est ni modifiée ni remplie
de blocs temporaires.

À l’heure prévue, Velair sélectionne la destination et continue sa programmation habituelle.
Un signal d’occupation précoce sélectionne immédiatement la destination une fois le départ surveillé confirmé. Une arrivée tardive ne
remet pas le logement en Absence. Pauses, Forçage, Réglage manuel, zones désactivées et planificateur
arrêté gardent leurs conditions existantes de transmission. La préparation prend en charge le chauffage, le refroidissement et les plages natives `heat_cool`. Elle vise à rapprocher la pièce de la cible sans garantir une température exacte. Les entités n’acceptant que des plages en Chauffage, Refroidissement ou Auto agissent uniquement à l’arrivée : Velair applique les deux limites à l’arrivée sans préparation anticipée ni apprentissage thermique pour cette cible. La préparation des pièces explique cette limite ; les réglages enregistrés restent disponibles pour les cibles compatibles.

<a id="preparation-and-room-assist"></a>
### Préparation et Room Assist

Le mode de destination définit la configuration nécessaire à l’arrivée. Chaque zone démarre à
sa propre heure estimée ; le mode complet est sélectionné à l’arrivée, pas au démarrage de la
première zone. Les zones qui n’ont pas encore démarré continuent de suivre la programmation Absence.

Une fois qu’une zone commence à se préparer, sa consigne temporaire d’arrivée est prioritaire
sur les blocs ultérieurs de la programmation Absence. Par exemple, avec une absence de dix heures
et un retour à 19:25 :

| Heure | Consigne pour cette pièce |
|---|---|
| 09:25, absence confirmée | Absence demande 16 degrés |
| 16:25, cette zone commence à se préparer | La programmation d’arrivée demande 21 degrés |
| 17:00, un bloc Absence demande 18 degrés | La préparation continue vers 21 degrés |
| 19:25, arrivée planifiée | Le mode de destination démarre sa programmation normale |

Un bloc de programmation Absence n’annule pas la préparation du retour de la zone. Cette priorité
s’applique aussi au refroidissement et aux plages de température.

Si Room Assist est activé, il suit la même consigne temporaire d’arrivée. Dans cet exemple, il aide
la pièce à atteindre 21 degrés plutôt que de la corriger vers la consigne Absence de 16 degrés.
La consigne envoyée à l’appareil peut différer de 21 degrés, car Room Assist compense les écarts
entre le capteur ambiant et la mesure propre de l’appareil. Les corrections en attente sont
revalidées par rapport à la consigne actuelle avant transmission.

Une modification directe de température par l’utilisateur suit la politique d’ajustement externe
de la zone. **Conserver le contrôle automatique** réapplique la consigne qui fait autorité, qui
pendant la préparation est celle de l’arrivée. Un maintien **Réglage manuel** suspend la
transmission automatique et Room Assist pour cette zone tant qu’il est actif. Forçage et pauses
explicites de zone gardent leur priorité existante ; ils n’annulent pas le retour du logement
entier. Consultez [Room Assist](room-assist.fr.md) et [Réglage manuel](manual-control.fr.md).

<a id="exceptions-and-restarts"></a>
## Exceptions et redémarrages

L’onglet Retour prévu montre ensemble le retour accepté, la préparation de chaque zone et la routine enregistrée, avec sa propre introduction et son aide contextuelle. Ouvrez-le directement avec `/velair/planned-return` ; `/velair/preconditioning` ouvre l’onglet distinct Anticipation. Les anciennes URL de sous-section ouvrent toujours leurs onglets respectifs. Modifier l’arrivée ne change que cette absence, pas la semaine enregistrée. **Annuler** retire la préparation et le changement automatique de destination. Avant confirmation d’une absence normale, la sélection active reste inchangée ; après confirmation ou application manuelle immédiate d’Absence, les Modes et Profils enregistrés avant l’épisode sont restaurés.

Une sélection explicite de mode ou profil annule le retour automatique de l’épisode. Un rapport
de présence ultérieur ou un redémarrage ne doit pas écraser cette sélection. Velair mémorise les
absences terminées ou annulées jusqu’à ce que le logement soit à nouveau occupé.

Cette sélection explicite annule également la préparation déjà en cours pour l’épisode, même si
la configuration du mode ou profil sélectionné est déjà active. Elle diffère d’un changement de
température programmé dans le mode Absence, qui n’annule pas la préparation. Ni le panneau ni la
carte ne proposent de boutons Ignorer, Je suis à la maison ou Fermer ; les commandes partagées sont
Annuler et Modifier l’arrivée. Le backend conserve des opérations distinctes pour ignorer le retour
et signaler l’arrivée aux consommateurs d’API ; leurs contrats sont documentés dans
l’[API développeur](../developer/api.md).
L’action `velair.cancel_planned_return` annule un retour en attente ou actif confirmé, ou ferme
l’avis d’un épisode inactif. L’annulation arrête la préparation et le retour temporisé et empêche
le redémarrage automatique pour cette absence. Pour un départ confirmé, elle restaure la sélection
mode/profils précédente enregistrée ; pour une confirmation normale en attente ou un avis de fin d’épisode, elle
ne change pas la sélection. Après application manuelle immédiate d’Absence, elle restaure la sélection précédente même avant confirmation du départ. Un nouveau **Planifier le retour** explicite peut encore démarrer un épisode.

<a id="restoration-limits"></a>
### Limites de restauration

Pour un retour ponctuel, Velair enregistre la sélection lorsque vous choisissez **Planifier le
retour**. Pour la routine hebdomadaire, il l’enregistre lorsque l’absence est confirmée, juste
avant d’appliquer le mode Absence.

La sélection précédente survit aux modifications d’arrivée et aux redémarrages Home Assistant.
Cela restaure la sélection de profils, pas les températures historiques ni les états des appareils ;
les profils restaurés utilisent leurs programmations actuelles et priorités de dérogations existantes.
Si le mode précédent a été supprimé ou modifié, les profils d’origine peuvent être restaurés comme
sélection manuelle. Si un profil enregistré manque, est invalide ou entre en conflit avec un autre,
l’annulation réussit quand même mais conserve la sélection actuelle et indique que la restauration
était indisponible. Les épisodes créés avant l’existence de ces métadonnées gardent la sélection
actuelle, car Velair ne peut pas déduire leur sélection précédente.

Au redémarrage, les annonces ponctuelles en attente et absences confirmées sont récupérées plutôt
que redémarrées. Une absence non confirmée recommence son délai de confirmation. Un capteur qui
signale une présence permet de mettre à jour l’absence précédente même si l’arrivée a eu lieu pendant que
Home Assistant était hors ligne. Une application manuelle immédiate d’Absence conserve son verrou de retour par présence après redémarrage : une confirmation inachevée recommence le délai complet et une présence initiale ne compte pas comme un retour. Une confirmation achevée reste acquise. L’arrivée programmée reste déterminante dans les deux cas.

<a id="limits-and-backups"></a>
## Limites et sauvegardes

- Une seule routine pour le logement entier est prise en charge. Les arrivées hebdomadaires restent
  dans la journée : un départ après l’heure du jour, ou un jour sans heure, active Absence sans
  programmer le retour du lendemain. Les retours ponctuels peuvent utiliser toute date future.
- Les calendriers, horaires tournants et routines nocturnes automatiques ne sont pas interprétés.
- Sans préconditionnement activé, mesure de température ou consigne thermique, la destination
  change toujours à l’arrivée mais cette zone ne démarre pas sa préparation en avance.
- Les transitions affectant des zones dont les programmations sont exécutées par un système externe sont rejetées avant changement
  de mode ; Velair ne reprend pas le contrôle local à leur contrôleur.
- Le blueprint générique Présence/Absence existant reste inchangé et utile à d’autres installations et actions.
- Les sauvegardes portables comprennent la configuration de routine, pas les épisodes d’occupation
  ni temporisateurs. Les routines importées restent désactivées jusqu’à activation explicite.

Consultez [Profils climatiques](climate-profiles.fr.md),
[Préconditionnement adaptatif](adaptive-preconditioning.fr.md) et
[Réglage manuel](manual-control.fr.md) pour les commandes sous-jacentes.

<a id="overview-and-diagnostics"></a>
## Vue d’ensemble et diagnostic

Vue d’ensemble affiche un résumé compact du foyer pendant un épisode hebdomadaire ou ponctuel, ou un incident. Il indique origine, état, échéance de confirmation ou arrivée prévue. Un retour accepté ajoute des compteurs d’icônes de préparation avec aide au survol, au focus clavier ou au toucher. Un départ confirmé ajoute une chronologie en lecture seule avec heures et Modes de départ/arrivée et points de préparation estimée de chaque équipement éligible, avec couleur et nom correspondants dans la légende. Chaque entrée affiche aussi le début estimé à côté du nom, sur la même ligne, au fuseau et format horaire Home Assistant ; une date ultérieure inclut la date. Les points et cercles de légende font 8 px ; un trait vertical neutre marque l’heure actuelle. La légende commence sur une ligne : les noms longs sont raccourcis visuellement et « +N équipements » développe les autres pièces dans le résumé. **Afficher moins** rétablit une ligne. Chaque pièce garde sa couleur et l’aide nom complet/début estimé au survol, au focus ou au toucher. Développer/replier ne navigue pas et ne change pas le retour. Seules les préparations adaptatives avec estimation valide sont tracées ; les pièces à l’arrivée uniquement, suspendues, déjà à la cible et indisponibles sont exclues. Les points superposés partagent un cercle divisé en secteurs colorés égaux, un par équipement. Leur aide ou celle de la légende donne les heures estimées. Ce sont des estimations actuelles, pas un historique d’activité physique. La chronologie se place à côté du résumé si possible, sinon dessous ; elle mesure l’absence écoulée, pas la progression thermique. Sélectionner le résumé hors des aides ouvre le détail dans l’onglet Retour prévu ; les aides ne naviguent pas et ne changent rien.

**Prochains événements pendant un retour actif**

Vue d’ensemble et les cartes de prochains événements montrent le prochain changement de contrôle prévu par équipement, identifié comme horaire hebdomadaire ou Retour prévu. Une action hebdomadaire avant le début de préparation reste éligible. Dès que la préparation contrôle l’équipement, sa transition suivante est l’arrivée, pas un bloc Absence sans rapport, même si la cible est déjà atteinte. Les autres équipements gardent leurs événements hebdomadaires.

Les débuts de préparation sont estimés selon les mesures actuelles. L’arrivée peut modifier température ou options HVAC, éteindre ou activer un Profil en pause ; ce n’est pas forcément une commande de température. Forçage, manuel et pauses gardent leur priorité. Les lignes suspendues expliquent le blocage et n’affichent une expiration connue que si tous les blocages en ont une ; elle ne promet pas un début de préparation. Les lignes hebdomadaires et de retour partagent nom, source courte, heures, action et mode HVAC. L’aide en fin de ligne donne phase complète, Mode d’arrivée, motif/expiration de suspension et référence hebdomadaire lorsque le retour est prioritaire ; elle s’ouvre au survol, au focus clavier ou au toucher. Pas de sous-titre d’état sous le nom. Les largeurs de colonnes sont communes et adaptées à la plus grande valeur, sans espaces fixes inutiles pour heures, actions et HVAC. Les listes étroites gardent les événements sur une ligne, avec défilement horizontal et colonne de noms fixe.

Ces prévisions ne confirment pas la transmission et ne changent pas l’exécution. Les capteurs et vues d’anticipation hebdomadaire existants gardent leur sens. Installez des versions correspondantes d’intégration et frontend pour ces prévisions effectives ; un ancien backend continue à fournir les événements hebdomadaires.

Un signal violet sur un appareil identifie l’autorité actuelle du Retour prévu. L’état de
fonctionnement existant reste visible : ce signal explique l’origine au lieu de remplacer les
états chauffage, refroidissement, pause, programmé ou préconditionnement. Les estimations de
démarrage futur sont indiquées séparément. Contrôle manuel, Forçage et pauses indépendantes gardent
leur priorité. L’attribution Absence couvre les profils Absence effectifs de l’épisode, ou Par
défaut s’il a été explicitement choisi comme mode Absence ; elle ne couvre pas un appareil non
associé conservant simplement sa programmation Par défaut. La préparation peut légitimement
utiliser le repli Par défaut de la destination lorsque le backend choisit la consigne d’arrivée
de cet appareil.

Les zones de Vue d’ensemble montrent un indicateur de retour compact avec les indicateurs Profil et confort : état de préparation et température ou plage d’arrivée si disponible. L’aide sur tout l’indicateur s’ouvre au survol, au focus clavier ou au toucher. Elle explique état, début estimé, arrivée, suspension/indisponibilité et attribution actuelle du contrôle, sans panneau multiligne supplémentaire. Une pièce suivant encore Absence peut donc montrer sa préparation future sans prétendre la contrôler déjà. Aucune estimation manquante n’est inventée ; les retours terminés, annulés et ignorés ne gardent pas d’aperçu actif. Les cartes climatiques conservent leur présentation détaillée.

Le diagnostic montre l’état actuel du logement, l’origine de contrôle par appareil et l’état
de préparation, y compris les raisons de suspension ou d’indisponibilité. La catégorie d’historique
Retour prévu enregistre les transitions acceptées significatives sans doublons dus au
rafraîchissement du panneau. Ses entrées partagent la limite existante de 100 événements et sont
effacées au redémarrage. Les préférences de catégories enregistrées sont conservées. Les rapports
téléchargés incluent ces informations et retirent les identifiants opérationnels de modes et
profils. L’intention de contrôle et la réussite de transmission restent distinctes.

<a id="dashboard-card"></a>
## Carte de tableau de bord

La carte Lovelace facultative montre les commandes compactes du Retour ponctuel. L’en-tête inclut les nombres de sources présentes, absentes et inconnues et le délai de confirmation enregistré. Un retour accepté affiche des pastilles de préparation compactes ; leurs aides au survol, au clavier et au toucher donnent nombres de pièces, arrivée et premier début estimé éligible. La chronologie du foyer utilise le graphique du panneau : typographie de dates identique, champ sombre d’arrivée modifiable, trait neutre Maintenant et points de préparation individuels éligibles. La légende commence sur une ligne, se développe avec +N et se replie avec Afficher moins. Les Modes restent sous le rail. Chaque nom et début estimé reste accessible dans les aides de points et de légende. Les aides expliquent aussi départ, icône d’arrivée, phase, compteurs de présence et délai par survol, focus clavier ou toucher. L’aide de présence liste les noms des sources correspondantes. Le champ d’arrivée reste un bouton d’édition ; son aide est sur l’icône adjacente. Configuration hebdomadaire, sources et liste complète de préparation restent dans la barre latérale. Configurez-y d’abord le foyer.

```yaml
type: custom:velair-card
view: planned-return
```

Sélectionnez **Retour prévu** dans l’éditeur visuel de carte. La carte agit sur le même épisode
enregistré que le panneau et les autres cartes. Elle prend en charge les dates et heures futures.
Les épisodes actifs proposent **Annuler** et **Modifier l’arrivée** ; Annuler arrête le retour
accepté et restaure la sélection précédente mode/profils enregistrée après application d’Absence, y compris une application manuelle immédiate ;
pendant une confirmation normale en attente, la sélection reste inchangée. Après une fin, annulation ou tout autre
épisode inactif, la carte montre un nouveau formulaire sans attendre un changement d’occupation.
Une configuration enregistrée invalide ou un planificateur arrêté désactive planification et
modifications, mais un retour actif peut toujours être annulé. Le panneau utilise les mêmes
boutons et cycle de vie ; la configuration hebdomadaire et son interrupteur y restent.
Seuls les indicateurs de sources/délai à la fin sont propres à la carte ; panneau et carte partagent
le sous-titre de phase attaché au titre, l’édition d’arrivée et la chronologie. Pendant la
confirmation, le bloc de temporisation remplace le sous-titre. Cette vue du logement n’a pas de
filtre de thermostat.

La carte **Thermostat : état et contrôle** peut exposer **Retour ponctuel** comme action rapide Velair avec Forçage et Pause. Activez-la dans l’éditeur d’actions, choisissez d’afficher son nom ou placez-la dans Plus. L’éditeur groupe Forçage, Pause et Retour ponctuel en premier même désactivés. Elle ouvre les mêmes commandes compactes dans le panneau inférieur avec un titre simple comme Forçage et Pause ; les trois formulaires utilisent les champs compacts de 38 px. Un départ actif utilise la chronologie affinée de Retour prévu : typographie départ/arrivée identique, surface d’arrivée sombre modifiable, trait neutre Maintenant et point uniquement pour l’équipement sélectionné. Le panneau omet les pastilles de préparation et montre nom et début estimé de l’équipement dans la légende. Sans estimation de préparation anticipée actuelle valide, une brève explication remplace la chronologie : action à l’arrivée uniquement, cible atteinte, suspension et motif, indisponibilité ou estimation manquante. Une autre pièce ne remplace jamais l’estimation sélectionnée. L’arrivée reste modifiable et l’annulation disponible sans chronologie. Les indicateurs de présence restent dans l’en-tête. Cette action contrôle le retour du foyer, y compris les autres équipements, pas seulement celui de la carte. Les paragraphes de compte à rebours et le panneau de premier début sont omis. La carte Retour prévu dédiée au foyer montre tous les points éligibles et garde ses pastilles et sa légende. Le X ferme sans annuler le départ ; une arrivée non enregistrée demande confirmation d’abandon et une action en cours bloque la fermeture. Les configurations existantes gardent cette action masquée. Les nouvelles cartes du sélecteur Home Assistant l’activent ; le YAML exige `type: planned-return` dans `climate_actions`.

Pendant **Absence** et **Préparation de l’arrivée**, la carte montre l’heure d’application d’Absence et l’arrivée
enregistrée avec les noms des modes Absence et Retour de l’épisode. Avec Absence manuelle immédiate, cette application peut précéder la confirmation du départ physique. Un indicateur d’heure actuelle,
identifié par son infobulle **Maintenant**, avance selon le temps UTC écoulé, y compris aux changements
d’heure, et reste dans la barre. Les extrémités incluent les dates si leurs dates calendaires
Home Assistant diffèrent. Les modifications d’arrivée non enregistrées ne changent pas cette barre.
Les départs normaux en attente et les états terminaux, ou épisodes sans horodatage d’application d’Absence, gardent un état
statique sans chronologie. Panneau et carte actualisent leur horloge locale une fois par minute
uniquement lorsqu’ils sont visibles et actifs, et immédiatement lorsqu’ils redeviennent visibles ;
ce rafraîchissement n’interroge jamais le backend.

Dans l’onglet Retour prévu, la chronologie omet les compteurs et le résumé de compte à rebours, puisque les états des pièces sont expliqués au-dessus. Les heures de départ et d’arrivée modifiable sont au-dessus du rail avec la même typographie. L’arrivée est une surface sombre de type champ ouvrant l’éditeur, sans crayon ni soulignement. Les Modes Absence et de destination sont dessous. Un trait vertical neutre Maintenant marque la fin du segment écoulé. Les équipements éligibles ont de petits points colorés et une légende correspondante affichant noms et débuts estimés, avec aides individuelles. Les points superposés partagent un cercle segmenté. La légende se développe dans le panneau sur demande et peut se replier. Les équipements suspendus, à la cible, à l’arrivée uniquement et indisponibles restent dans Préparation des pièces au-dessus, sans point inventé. La carte du foyer garde ses pastilles de préparation. La section détaillée reste au-dessus ; la chronologie ne répète pas le premier début dans un panneau supplémentaire. Changer l’arrivée enregistrée ou la destination réinitialise la légende et abandonne les estimations périmées. Modifier un brouillon ne change pas la projection enregistrée. Annulation et modification d’arrivée restent disponibles.

Les commandes du tableau de bord utilisent le même graphique. La carte du foyer garde les pastilles d’état car elle n’inclut pas toute la section de préparation. Elle garde tous les points éligibles actuels ; l’action intégrée d’une carte climatique montre uniquement sa pièce sélectionnée, avec nom et début estimé dans la légende. Les champs date/heure gardent leur taille compacte et les commandes Retour/Changer existantes. Ouvrir l’éditeur conserve la chronologie acceptée ; Retour rétablit l’arrivée enregistrée. Accepter une autre arrivée ou destination réinitialise la légende et abandonne les estimations périmées. Les pièces suspendues, prêtes, indisponibles et à l’arrivée uniquement ne reçoivent pas de point. Un point avant le départ est placé au bord ; son aide conserve l’estimation réelle. Le progrès écoulé mesure le temps vers l’arrivée, pas le progrès thermique. Sans estimation du foyer, les aides expliquent l’état connu sans laisser penser que la préparation est désactivée.
