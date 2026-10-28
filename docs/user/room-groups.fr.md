<a id="room-groups"></a>
# Groupes de pièce
<!-- velair-docs:start -->
Traductions: [Original en anglais](room-groups.md) · [Español](room-groups.es.md) · [Français](room-groups.fr.md) · [Deutsch](room-groups.de.md) · [Italiano](room-groups.it.md) · [Nederlands](room-groups.nl.md) · [Polski](room-groups.pl.md) · [Português (Brasil)](room-groups.pt-br.md) · [Português (Portugal)](room-groups.pt-pt.md) · [Русский](room-groups.ru.md) · [État des traductions](../translation-status.md)

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

Un groupe de pièce donne à plusieurs entités `climate` gérées une programmation, une affectation de Profil, un forçage, une pause et un modèle de préconditionnement adaptatif uniques. Utilisez-le lorsque les appareils contrôlent la même pièce physique. Les pièces distinctes doivent rester indépendantes, même si elles partagent un modèle quotidien ou une alimentation de chauffage ou de refroidissement.

<a id="what-a-group-shares"></a>
## Ce qu’un groupe partage

| Partagé par le groupe | Indépendant pour chaque équipement physique |
| --- | --- |
| Programmation, affectations de Modes/Profils et réglages de contrôle | Température, humidité, action HVAC et disponibilité rapportées |
| Forçages, pauses de zone et réglage manuel | Sondes, seuils et activation du suivi du Confort |
| Une décision de démarrage du préconditionnement et un modèle d’apprentissage thermique | Observations de l’appareil et preuves de transmission dans Diagnostic |
| Réglages et correction de Room Assist | Régulation interne de température de l’appareil |

Le groupe est une unité de contrôle interne à Velair, pas une nouvelle entité `climate` ou `group` de Home Assistant. Velair génère un identifiant interne stable, tel que `group.0123456789abcdef0123456789abcdef` ; renommer le groupe le conserve. Il peut apparaître dans les diagnostics, exports ou réglages techniques, mais pas dans le registre des entités ni les états des Outils de développement de Home Assistant. Ne l’utilisez pas comme cible d’un service Home Assistant `climate.*`. Velair traduit le groupe en destinataires réels des commandes.

<a id="create-a-group"></a>
## Créer un groupe

1. Ouvrez l’onglet **Groupes de pièce** et utilisez le bouton d’ajout.
2. Saisissez son nom et utilisez **Ajouter des équipements** pour sélectionner les équipements gérés de la pièce. Ajoutez-en au moins deux. Recherchez par nom ou identifiant d’entité, puis confirmez. Les équipements d’un autre groupe sont indisponibles et indiquent leur groupe.
3. Choisissez un membre dont la température ambiante rapportée représente la température propre au groupe. Cette référence n’en fait pas le propriétaire du groupe. Configurez une sonde externe facultative dans **Room Assist**, comme pour un équipement indépendant.
4. Choisissez si Velair envoie les commandes à chaque membre ou à un membre dont l’installation les transmet déjà aux autres appareils.
5. Choisissez la configuration à adopter avec **Utiliser la configuration de**. Exportez d’abord votre configuration si vous avez besoin d’une copie de récupération ; incluez **Apprentissage du préconditionnement** pour sauvegarder aussi l’étalonnage.
6. Utilisez le bouton d’enregistrement de l’en-tête pour ouvrir **Vérifier les modifications du groupe**. Rien n’est encore appliqué. Lisez les différences et l’avertissement de remise à zéro de l’apprentissage, puis choisissez **Confirmer et enregistrer** ou **Revenir à la modification**. Les erreurs de validation et d’enregistrement restent dans ce parcours pour permettre la correction du brouillon et un nouvel essai.

<a id="configuration-fields"></a>
### Champs de configuration

| Champ | Signification |
| --- | --- |
| Nom du groupe | Nom affiché obligatoire, unique parmi les groupes. |
| Membres | Équipements gérés de cette pièce. Leur ordre détermine leur affichage individuel dans la Vue d’ensemble. Un équipement ne peut appartenir à deux groupes. |
| Référence de température | La température d’un membre représente la pièce dans Velair, sans lui donner priorité sur les autres. |
| Envoi des commandes | **Tous les membres** par défaut, ou **Membre sélectionné** si l’installation transmet déjà les commandes. |
| Destinataire des commandes | Visible uniquement pour **Membre sélectionné** ; choisissez qui reçoit les commandes de Velair. |
| Utiliser la configuration de | À la création seulement : choisissez le membre dont la programmation, les Profils et les réglages de contrôle deviennent le point de départ partagé. |

La référence de température, le destinataire et la source de configuration initiale peuvent être trois membres différents.

<a id="send-commands-to-all-members-or-one-recipient"></a>
### Envoyer à tous les membres ou à un destinataire

**Tous les membres** est le mode par défaut : Velair envoie les commandes à chaque membre. **Membre sélectionné** les envoie uniquement au **Destinataire des commandes** indiqué en dessous. N’utilisez ce mode que si l’installation les transmet déjà aux autres appareils ; Velair n’effectue pas cette transmission supplémentaire.

Par exemple, une pièce peut avoir trois vannes de radiateur et un contrôleur de pièce également représenté par une entité `climate`. Si l’installation transmet ses commandes aux vannes, incluez les quatre membres, choisissez le contrôleur comme référence de température, sélectionnez **Membre sélectionné** et choisissez-le comme destinataire. Les quatre restent visibles, avec une programmation et une décision de préconditionnement uniques. Si chaque appareil nécessite une commande directe, utilisez **Tous les membres**.

Ces options sélectionnent les destinataires ; elles ne créent ni programmations ni modèles d’apprentissage indépendants pour les membres.

<a id="adopt-an-existing-configuration"></a>
### Adopter une configuration existante

L’adoption crée une configuration partagée à partir des programmations, Profils et réglages de contrôle du membre choisi. Elle remplace les configurations de contrôle indépendantes ; elle ne maintient pas des copies distinctes synchronisées et ne copie pas les réglages du micrologiciel. Chaque équipement conserve ses propres réglages, sondes et seuils de Confort, qui ne sont pas remplacés par ceux du membre choisi. Les historiques d’apprentissage existants ne sont pas fusionnés. La référence propre, le destinataire et la source initiale peuvent être différents.

Velair valide le groupe entier avant l’enregistrement. Un équipement ne peut appartenir qu’à un seul groupe. Les combinaisons incompatibles doivent être résolues avant utilisation ; le regroupement n’ajoute pas de capacités HVAC. L’Exécution externe des horaires ne peut contrôler un membre groupé en même temps que Velair. Les destinataires doivent partager des modes compatibles, des limites de température qui se recoupent et une grille de pas de température compatible. Si leurs modes HVAC actifs diffèrent, choisissez un mode explicite plutôt que de demander à Velair de conserver un mode commun.

<a id="shared-control-and-individual-observations"></a>
## Contrôle partagé et observations individuelles

Les sélecteurs de programmation, de Profils et d’autres fonctions de contrôle affichent le groupe à la place des membres. Modifiez les programmations et commandes habituelles. Le groupe stocke une configuration, pas plusieurs copies synchronisées.

Le Confort reste individuel : son panneau et ses cartes affichent chaque équipement avec ses mesures, sondes, seuils et activation du suivi. La sonde externe facultative de Room Assist du groupe ne remplace pas ces relevés, sauf si vous la sélectionnez explicitement dans le Confort du membre. Créer, modifier ou dissoudre un groupe conserve la configuration Confort de chacun. Les groupes enregistrés avant le stockage indépendant du Confort initialisent chaque membre avec une copie des réglages précédemment enregistrés pour le groupe ; ces copies sont ensuite modifiables séparément. Les anciens réglages individuels ne peuvent être récupérés automatiquement.

La **Vue d’ensemble** continue d’afficher chaque équipement physique. Son groupe identifie la programmation et l’autorité de contrôle communes, tandis que température, disponibilité et état restent individuels. Une action sur un membre s’applique à la pièce ; elle ne crée pas une programmation indépendante concurrente.

Les **Prochains événements** affichent chaque équipement, avec son groupe sous le nom, comme les lignes individuelles de la **Programme du jour**. Les membres affichent le même événement du groupe ; Velair ne crée pas de programmations ni d’événements backend distincts. Sélectionnez un nom pour ouvrir la programmation partagée au jour de l’événement, y compris la programmation propre d’un Profil s’il fournit cet événement. Retour prévu utilise la programmation du Mode de destination. Cela fonctionne aussi depuis une carte Prochains événements du tableau de bord. Un filtre sur un membre ne montre que lui ; un filtre sur un groupe montre tous ses membres.

Sélectionnez un groupe pour le modifier dans le panneau adjacent, selon la même disposition liste/détail que Modèles et Contrôle de l’alimentation. Le résumé identifie membres, source de température et destinataires, ainsi que le contrôle commun et l’état de préparation. L’action d’en-tête vérifie et enregistre ; la suppression est dans la liste et demande confirmation. L’aide explique les choix de référence, d’envoi et de configuration. La vérification indique les champs obligatoires manquants. Pendant la modification, le résumé continue de décrire le groupe enregistré jusqu’à la vérification et à l’enregistrement du brouillon.

Diagnostic distingue les preuves individuelles de l’intention commune de la pièce. Un appel de service accepté ne prouve ni mouvement de vanne ni transfert de chaleur. Avec un destinataire sélectionné, Velair ne prétend pas avoir commandé directement les autres membres.

<a id="temperature-reference-and-room-assist"></a>
## Référence de température et Room Assist

Avec la programmation normale, Velair envoie la cible commune aux destinataires configurés. Chaque appareil continue de réguler avec sa propre sonde ; choisir une référence ne change pas sa régulation interne.

La **Référence de température** fournit le relevé propre au groupe pour le préconditionnement, l’apprentissage thermique, la référence native de Room Assist, l’estimation de demande d’alimentation et le résumé. Choisissez-la parmi les membres. Configurez la sonde externe facultative dans [Room Assist](room-assist.fr.md#room-groups), pas comme une autre référence native dans l’éditeur du groupe. Lorsqu’il est activé, ce relevé externe devient la mesure effective de la pièce et Velair calcule une correction partagée. Les commandes suivent toujours **Envoi des commandes**.

Le Confort reste indépendant : activer Room Assist pour le groupe ne remplace pas les sondes ni les seuils de Confort des membres.

<a id="pauses-manual-adjustment-and-resuming"></a>
## Pauses, réglage manuel et reprise

Le groupe a une seule autorité de programmation. Une pause de zone ou un forçage demandé depuis un membre s’applique donc au groupe entier. L’onglet Groupes de pièce affiche l’état enregistré sans bouton de pause distinct. Utilisez les contrôles des membres. Reprendre cette pause partagée depuis un autre membre a la même portée. Les autres motifs indépendants de pause gardent la priorité jusqu’à leur fin ou suppression. Une Pause ou un Arrêt global continue d’affecter toutes les pièces, équipements non groupés compris.

Mettre la programmation en pause n’éteint pas nécessairement les appareils. L’action de pause choisie détermine si Velair conserve leurs états ou envoie Arrêt aux destinataires configurés du groupe.

La politique **Réglages externes** des Paramètres appartient au groupe. Un changement externe détecté de cible ou de mode HVAC d’un membre peut placer tout le groupe en **Réglage manuel**, selon les mêmes règles de programmation et pause qu’un équipement indépendant. Avec **Jusqu’au prochain bloc** :

1. Trois membres suivent une cible commune de `20 °C`.
2. Un changement externe monte l’un d’eux à `22 °C`.
3. Velair cède l’autorité de programmation pour tout le groupe en conservant les états. Il ne copie pas ce changement aux autres : ils peuvent rester à `22, 20, 20 °C`. L’installation peut toutefois propager elle-même les changements.
4. Au prochain bloc, Velair reprend le contrôle Automatique et transmet la cible commune aux destinataires. Vous pouvez reprendre Automatique plus tôt.

| Politique de réglages externes | Comportement du groupe |
| --- | --- |
| Garder automatique | Velair conserve l’autorité et réapplique l’intention effective actuelle lorsqu’elle existe. |
| Jusqu’au prochain bloc | Le réglage manuel se termine au prochain bloc applicable. Sans bloc futur, reprenez Automatique explicitement. |
| Pour une durée | Le groupe cède pour la durée configurée. Les changements externes suivants renouvellent cette durée. |
| Jusqu’à la reprise | Le groupe cède jusqu’à la reprise explicite du contrôle Automatique. |

Sélectionner explicitement Manuel utilise la politique enregistrée et conserve les états actuels des membres. Avec **Garder automatique**, ce Manuel explicite dure jusqu’à sa reprise. Room Assist cède pendant le réglage manuel.

Ce contrôle Manuel/Automatique est distinct du Mode **Manuel** utilisé pour sélectionner directement les Profils. Consultez [Changements externes et réglage manuel](manual-control.fr.md) pour les priorités et cas particuliers des blocs.

<a id="display-order"></a>
## Ordre d’affichage

Utilisez les commandes d’ordre des Paramètres pour déplacer groupes et équipements indépendants. Un nouveau groupe prend initialement la position de son premier membre. Ordonnez les membres dans le détail de l’onglet Groupes de pièce. La Vue d’ensemble développe le groupe en entrées individuelles consécutives selon cet ordre ; les sélecteurs de programmation affichent une entrée commune. Les deux ordres sont enregistrés par le backend.

La liste n’affiche que les équipements sélectionnés. Les nouveaux sont ajoutés à la fin sans changer l’ordre existant. Utilisez les flèches pour réordonner et la corbeille pour retirer un membre. Les listes longues peuvent être développées. Les changements de membres ne s’appliquent qu’après vérification et enregistrement.

<a id="learning-and-membership-changes"></a>
## Apprentissage et changements de membres

Le groupe apprend une réponse thermique, avec des historiques séparés de chauffage et de refroidissement. Sans Room Assist, sa température provient du membre choisi. Room Assist utilise sa sonde externe uniquement lorsqu’il est activé, avec les mêmes règles de contrôle, limites de correction et préparation qu’un équipement indépendant. Sélectionner une sonde n’active pas l’assistance. La retirer ou désactiver l’assistance revient à la référence du membre. Les commandes suivent le mode d’envoi du groupe, et les corrections temporaires ne changent pas la vraie cible programmée. Les historiques indépendants ne sont pas combinés. Velair stocke l’apprentissage du groupe, pas un modèle par membre. Les observations individuelles restent dans Diagnostic. La création du groupe repart de zéro sans fusionner les historiques antérieurs.

| Modification | Apprentissage ensuite |
| --- | --- |
| Renommer le groupe ou réordonner ses membres | L’apprentissage du groupe est conservé. |
| Ajouter ou retirer un membre | Le groupe restant recommence l’apprentissage car sa composition physique change. Le membre retiré commence un apprentissage indépendant à zéro. |
| Changer la référence ou la configuration d’envoi | Le groupe recommence l’apprentissage et annule l’observation active précédente. |
| Dissoudre le groupe | Chaque membre commence un apprentissage indépendant à zéro. L’historique de l’ancien groupe est supprimé. |

Retirer un membre lui donne une copie indépendante de la configuration commune. Dissoudre le groupe fait de même pour tous. Les forçages actifs, pauses et historiques thermiques ne sont pas copiés dans ces pièces indépendantes. Vérifiez programmations et Profils après ce changement de contrôle.

Par exemple, retirer un équipement d’un groupe de trois laisse deux membres avec un nouvel historique de groupe et un équipement indépendant avec un nouvel historique. Supprimer le groupe rend les trois indépendants. Aucune opération ne restaure automatiquement leurs historiques antérieurs au groupe. Gardez au moins deux membres dans un groupe enregistré ; dissolvez-le si tous doivent devenir indépendants.

<a id="before-testing-the-beta"></a>
## Avant de tester la bêta

Sauvegardez la configuration avec l’apprentissage du préconditionnement si nécessaire. Après vérification et enregistrement, contrôlez que :

- Un groupe apparaît dans Programmation, Profils, Préconditionnement et Room Assist.
- Chaque membre reste visible individuellement dans Vue d’ensemble, Prochains événements, Programme du jour, Confort et Diagnostic.
- L’envoi correspond à l’installation : commandes directes à tous ou au destinataire choisi pour transmission par l’installation.
- Modifier le Confort d’un membre laisse les autres inchangés.
- Une pause ou un réglage manuel depuis un membre s’applique à toute la pièce.
- Un redémarrage de Home Assistant conserve le groupe, l’ordre et les réglages partagés.

Pour signaler un problème, indiquez le mode d’envoi, le membre de référence, l’activation de Room Assist et les preuves pertinentes de Diagnostic. Un appel accepté ne signifie pas que l’appareil rapporte l’état demandé.

Les anciennes bêtas peuvent contenir une référence externe de groupe. Leur chargement ou import la conserve sans choisir automatiquement un membre ni activer Room Assist. L’éditeur identifie cette ancienne valeur et demande une référence de membre avant d’enregistrer un groupe modifié. Configurez la sonde externe dans Room Assist en passant à la nouvelle disposition.

Groupes de pièce et alimentations partagées répondent à des besoins différents. Le groupe contrôle une pièce ; [Contrôle de l’alimentation](shared-climate-supply.fr.md) agrège la demande pour piloter une source commune. Les modèles liés partagent le contenu de programmation sans changer l’autorité sur les pièces. Les dépendances de préconditionnement coordonnent des pièces distinctes avec un apprentissage indépendant.
