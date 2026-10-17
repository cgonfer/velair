<a id="block-presets-and-linked-templates"></a>
# Préréglages de blocs et modèles liés

<!-- velair-docs:start -->
Traductions: [Original en anglais](linked-schedules.md) · [Español](linked-schedules.es.md) · [Français](linked-schedules.fr.md) · [Deutsch](linked-schedules.de.md) · [Italiano](linked-schedules.it.md) · [Nederlands](linked-schedules.nl.md) · [Polski](linked-schedules.pl.md) · [Português (Brasil)](linked-schedules.pt-br.md) · [Português (Portugal)](linked-schedules.pt-pt.md) · [Русский](linked-schedules.ru.md) · [État des traductions](../translation-status.md)

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

Velair peut réutiliser une configuration climatique à l’aide d’un **préréglage de bloc** et lier un jour à un modèle journalier. Choisissez **Horaires uniquement** pour partager les horaires avec des réglages climatiques indépendants, ou **Horaires et réglages** pour suivre le modèle complet. Les programmations par défaut et les Profils permettent les deux choix. Les blocs d’un modèle peuvent utiliser des réglages manuels ou des préréglages Velair.

Commencez par les [exemples pratiques](linked-schedule-examples.fr.md) pour le chauffage partagé, les Profils saisonniers, les copies indépendantes, les conversions de liens et les modifications incompatibles.

<a id="block-presets"></a>
## Préréglages de blocs

Un préréglage de bloc Velair possède un nom et la même configuration climatique qu’un bloc horaire, sans son heure de début. Il peut définir une température ou une plage native avec les options prises en charge, choisir uniquement un mode HVAC, appliquer uniquement des options climatiques ou éteindre l’équipement. Un préréglage Velair est différent du `preset_mode` d’un appareil, qui peut être une de ses options configurées.

Les préréglages appartiennent à une bibliothèque partagée. Chaque destination est vérifiée par rapport à son thermostat et, le cas échéant, à son contrôleur de programmation externe. Une option omise n’est pas envoyée ; omettre un réglage de ventilation ne réinitialise pas le ventilateur du thermostat.

Gérez la bibliothèque partagée dans **Modèles → Préréglages climatiques**. Le sélecteur de bibliothèque explique les modèles journaliers et les préréglages climatiques partagés. Utilisez le bouton d’ajout du titre de la liste pour créer un préréglage. Une bibliothèque vide conserve la même disposition de liste et de détails. Sélectionnez un préréglage existant pour l’inspecter ; les changements non enregistrés n’apparaissent qu’après modification de son nom ou de ses réglages climatiques. Le contrôle de compatibilité facultatif ne le marque pas comme modifié. Ses utilisations sont affichées en lecture seule. L’éditeur ne nécessite pas de thermostat : choisissez le chauffage ou le refroidissement, une cible unique ou une plage, et des réglages facultatifs d’appareil. Un contrôle facultatif sur un thermostat prévisualise la compatibilité sans changer les valeurs partagées. Chaque utilisation réelle est validée par le backend avant l’enregistrement.

Enregistrez un préréglage avec l’icône à côté de son nom. Le modifier conserve sa position dans la bibliothèque, y compris après rechargement ; les nouveaux préréglages sont ajoutés à la fin. Les champs de température acceptent un point ou une virgule décimale (par exemple `21.5` ou `21,5`), y compris pour les deux limites d’une plage native. L’éditeur conserve votre saisie pendant que vous tapez et envoie des valeurs numériques pour la prévisualisation ou l’enregistrement. Le contrôle de compatibilité facultatif montre les réglages effectifs pour un thermostat choisi, avec un résultat distinct de réussite ou d’erreur. Vérifier la compatibilité n’enregistre pas le préréglage et ne change pas son statut non enregistré.

Les références aux préréglages dans les modèles apparaissent séparément des références directes dans les programmations par défaut et les Profils. Les pastilles d’utilisation comptent les références directes, y compris celles de modèles sans jours liés. Les thermostats qui héritent d’un préréglage via un modèle complet sont présentés comme destinations supplémentaires concernées, sans recompter la même référence du modèle. Les utilisations par appareil sont regroupées par thermostat, avec une ligne séparée pour Par défaut et chaque Profil.

La liste affiche une icône de lien à côté de chaque compteur d’utilisation. Survolez le bouton de suppression désactivé pour comprendre pourquoi un préréglage utilisé ne peut pas être supprimé ; dissociez d’abord ses blocs. La pastille d’utilisation de chaque préréglage occupe sa propre dernière ligne, sous le résumé de configuration.

Choisissez un préréglage dans un bloc horaire pour conserver une référence active vers celui-ci. Modifier le préréglage met à jour toutes ses références. Le bloc ne peut pas contenir simultanément des réglages climatiques locaux. Dissocier un préréglage conserve sa configuration effective comme réglages manuels et arrête ses futures mises à jour pour ce bloc.

Ouvrez les **Réglages supplémentaires** d’un bloc pour choisir un **Préréglage Velair**. Celui-ci est distinct du **Préréglage de l’appareil**, l’option native `preset_mode` du thermostat. Le bloc conserve ses colonnes habituelles d’heure, de mode, de cible, de réglages et de suppression. Les réglages climatiques liés apparaissent dans leurs commandes habituelles en lecture seule ; l’heure reste modifiable sauf si le jour possède aussi des horaires liés.

Une ligne sous le bloc identifie le préréglage lié et ses réglages supplémentaires. Le badge des réglages compte un élément pour le lien au préréglage Velair, plus chaque option d’appareil configurée, à l’exclusion de l’heure, du mode HVAC et de la température cible. Les valeurs et adaptations de compatibilité viennent du backend ; une prévisualisation en cours ou échouée ne remplace pas la référence enregistrée par des réglages manuels. Déplacer l’heure de début d’un bloc conserve visibles les réglages résolus du préréglage ; le changement d’heure ne nécessite pas de nouvelle prévisualisation.

Dans Réglages supplémentaires, choisissez un autre préréglage Velair ou **Aucun preset Velair** pour le dissocier en conservant ses réglages effectifs pour les modifier manuellement. Gérez et modifiez les préréglages partagés dans **Modèles → Préréglages climatiques**. Les options d’appareil restent en lecture seule tant que le lien existe. Le bouton de suppression garde sa place habituelle et reste désactivé si le bloc appartient aux horaires d’un modèle lié.

Le panneau montre d’abord le sélecteur de configuration, puis les options d’appareil et, à la fin, un seul résumé **Ce qu'envoie ce bloc**. Ce résumé couvre les blocs manuels et les préréglages Velair résolus, dont les plages de températures, les actions de mode uniquement, d’options uniquement et d’arrêt. Il apparaît aussi quand le thermostat n’a aucune option d’appareil supplémentaire. Lorsqu’une prévisualisation de préréglage est en attente ou indisponible, le résumé indique cet état au lieu de deviner les commandes.

<a id="linked-templates"></a>
## Modèles liés

<a id="apply-a-template-to-schedules"></a>
### Appliquer un modèle à des horaires

Ouvrez **Appliquer à…** sur un modèle journalier enregistré. Le panneau suit **Sélectionner → Vérifier → Appliquer**. Enregistrez d’abord les modifications du modèle ; l’application n’enregistre jamais silencieusement le modèle partagé et n’utilise pas une version non enregistrée.

Choisissez **Par défaut** ou un Profil existant, puis **Copie indépendante**, **Horaires uniquement** ou **Horaires et réglages**. Une copie indépendante n’a pas de lien de modèle ; les références aux préréglages Velair restent actives. Les liens d’horaires uniquement conservent des réglages climatiques indépendants. Les liens complets suivent les horaires et les réglages du modèle.

Choisissez une **Répartition des jours** commune et cochez les groupes voulus pour chaque thermostat. Jours individuels propose sept choix ; Semaine / Week-end, deux groupes ; Tous les jours, la semaine entière. Changer la répartition efface la sélection. Changer la destination ou le type d’application conserve les groupes sélectionnés mais impose une nouvelle vérification. Sélectionnez l’en-tête d’un jour pour cocher cette colonne pour tous les thermostats visibles ; sélectionnez-le à nouveau pour vider une colonne entièrement cochée. Sur téléphone, le tableau défile horizontalement en gardant les noms des thermostats visibles.

Seuls les thermostats avec des groupes sélectionnés adoptent la répartition choisie. Les jours non sélectionnés gardent leurs blocs et liens. Si la nouvelle répartition regroupe des jours non sélectionnés dont les configurations diffèrent, la vérification avertit qu’ils garderont **Horaires différents** ; accepter ne les rend pas identiques.

Pour **Horaires uniquement**, choisissez une base si un groupe de destination a des configurations enregistrées différentes. Ce choix reste temporaire jusqu’à Appliquer. Velair propose les réglages de cette base : heure exacte d’abord, puis heures précédentes de la plus proche à la plus éloignée, puis heures suivantes. Les préréglages restent des références. La vérification identifie l’origine de chaque proposition et permet de modifier les réglages, tandis que les heures du modèle restent fixes. Il faut compléter les réglages compatibles manquants ; ceux du modèle ne servent jamais de recours silencieux. Tous les jours sélectionnés du groupe reçoivent les mêmes réglages vérifiés. Une zone de Profil sans horaire propre exige des réglages manuels au lieu d’emprunter ceux de Par défaut.

La vérification liste les jours et liens remplacés, les changements de répartition, les incompatibilités et les zones de Profil passant à **Planification du Profil**. Revenir à la sélection n’enregistre rien. Appliquer valide et enregistre toute la sélection en une fois ; une destination invalide ou un conflit de révision n’applique pas partiellement les autres zones. Un échec d’enregistrement conserve la configuration précédente. Vérifiez à nouveau après un changement de source ou de configuration. Fermer avec des modifications de vérification en attente utilise la protection normale contre l’abandon.

Appliquer à un Profil enregistre directement ses horaires sélectionnés ; cela n’active pas le Profil, ne sélectionne pas de Mode et ne change pas la base ou les exceptions. Modifier un horaire effectif peut affecter le contrôle climatique. La publication externe et les réponses physiques des appareils gardent leurs limites normales ; une configuration enregistrée cohérente n’est pas une réponse physique simultanée.

Les liens aux modèles sont en lecture seule et regroupés par thermostat, puis par Par défaut ou Profil, avec les jours de semaine liés rassemblés. **Jours liés** compte un jour lié, quel que soit le nombre de blocs du modèle. La liste affiche ces compteurs dans une dernière ligne séparée sous le nombre de blocs de chaque modèle. Les copies indépendantes ne sont pas comptées et n’apparaissent pas dans cette liste. Dissociez tous les jours avant de supprimer un modèle ; le bouton de suppression désactivé explique cette exigence.

Les programmations par défaut et de Profil peuvent lier chaque jour de semaine de chaque thermostat à un modèle journalier. Avec **Horaires uniquement**, configurez l’action climatique de chaque plage à sa destination ; les réglages peuvent être manuels ou utiliser un préréglage de bloc. Les destinations peuvent utiliser des actions différentes à la même heure partagée.

Avec **Horaires et réglages**, le modèle fournit les horaires et les réglages climatiques. Ses blocs peuvent contenir des réglages manuels ou des références actives aux préréglages. Toutes les commandes de destination sont en lecture seule et montrent leurs valeurs effectives ; modifiez le modèle ou dissociez le jour pour les changer. Il n’y a pas de dérogation par bloc. Changer les réglages d’un modèle affecte ses liens complets, tandis que les liens aux horaires uniquement conservent leurs propres réglages climatiques.

Par exemple, un modèle Jour ouvré commence à 07:00 et à 23:00. Par défaut peut affecter son préréglage de confort habituel, un Profil Hiver des préréglages de chauffage et un Profil Été le refroidissement et l’arrêt. Déplacer 07:00 à 07:30 met à jour les trois programmations sans échanger leurs configurations.

Les horaires liés se modifient dans le modèle, pas en faisant glisser la chronologie d’une destination. Modifier les températures ou les modes du modèle ne change pas ses destinations liées aux horaires uniquement. Une semaine peut mélanger des jours indépendants et les deux types de liens.

Le sélecteur **Source des horaires** choisit une programmation indépendante ou un modèle. Pour un modèle, choisissez **Horaires uniquement** ou **Horaires et réglages**. L’icône d’information explique les choix. Passer des horaires uniquement au lien complet demande confirmation avant de remplacer les affectations climatiques du jour. Passer du lien complet aux horaires uniquement conserve les réglages actuels du modèle, y compris les références aux préréglages, comme affectations indépendantes. **Dissocier** conserve les horaires et configurations actuels du brouillon, y compris les préréglages. Les réglages manuels deviennent les valeurs effectives adaptées par le backend à ce thermostat ; par exemple, une cible partagée de 18.3 °C devient 18.5 °C sur un appareil avec un pas de 0.5 °C. Les références aux préréglages restent actives et les définitions partagées sont inchangées. Survolez, touchez ou placez le focus sur une commande verrouillée pour voir comment modifier sa configuration partagée. Par défaut et les Profils utilisent les mêmes commandes d’aide.

Changer le sélecteur Source des horaires demande confirmation avant de remplacer le brouillon du jour, même si ses réglages sont incomplets. Les réglages aux heures exactement correspondantes sont conservés ; les nouveaux horaires nécessitent leurs propres affectations. Annuler conserve la sélection et le brouillon précédents. Les modifications prennent effet uniquement après enregistrement.

Choisir **Programme indépendant** demande confirmation avant d’abandonner les modifications de ce jour et restaure sa programmation enregistrée dans la même source : Par défaut ou le Profil sélectionné. Si le jour enregistré possède des horaires liés, ces horaires et affectations deviennent un brouillon indépendant en conservant les références aux préréglages. Cela ne récupère pas une ancienne programmation manuelle. Les autres jours sont préservés.

**Dissocier** est différent : il conserve les horaires et réglages actuels du brouillon, y compris les modifications depuis le dernier enregistrement.

<a id="copy-or-link"></a>
## Copier ou lier

- **Copier les blocs** copie les horaires et réglages climatiques d’un modèle, conserve les références aux préréglages et adapte les réglages manuels à la destination. Le résultat ne suit pas le modèle.
- **Lier les horaires** conserve les horaires liés au modèle avec des réglages climatiques séparés dans chaque destination.
- **Lier la configuration complète** suit les horaires et réglages climatiques du modèle, y compris ses préréglages actifs, sans dérogations locales.
- Copier un jour de programmation copie sa configuration, y compris le type de lien au modèle, les affectations des horaires uniquement et les références aux préréglages. Une source liée crée un autre jour lié ; une source indépendante crée un autre jour indépendant. Les liens des jours de destination hors de la sélection de copie sont préservés.
- Enregistrer un jour comme modèle conserve ses réglages manuels effectifs et ses références aux préréglages. Cela ne modifie ni le modèle d’origine ni les préréglages partagés.
- Vider un jour supprime ses blocs locaux et son lien au modèle, sans changer le modèle ou les autres destinations.

Copier vers un autre thermostat vérifie la configuration copiée par rapport à cette destination. Des réglages partagés incompatibles entraînent le rejet de la copie plutôt que la suppression du lien ou leur remplacement par des réglages manuels. L’ajustement existant au pas de chaque appareil et l’adaptation des options restent applicables. Dans Par défaut, les destinations sélectionnées sont enregistrées ensemble ; une destination en échec laisse toutes les destinations de copie inchangées. Les changements en attente du jour source sont enregistrés d’abord, comme pour les autres copies dans Par défaut. La copie dans un Profil modifie son brouillon et valide le Profil proposé ; l’enregistrement conserve toujours le Profil entier.

Pour créer un jour indépendant à partir d’un jour lié, utilisez **Dissocier** après la copie et enregistrez. **Copier les blocs** depuis la bibliothèque de modèles reste une copie indépendante.

<a id="shared-edits"></a>
## Modifications partagées

Modifier un modèle conserve sa position dans la bibliothèque, y compris après rechargement.

Ajouter une plage au modèle propose une configuration pour chaque jour lié aux horaires uniquement, y compris les Profils inactifs et les programmations par défaut masquées par un Profil actif. Velair essaie d’abord les réglages climatiques de la nouvelle plage. S’ils sont incompatibles, il essaie les blocs précédemment enregistrés de cette destination : une correspondance exacte d’heure, les blocs antérieurs du plus proche au plus éloigné, puis les blocs suivants dans le même ordre. La première configuration compatible est copiée. La référence au préréglage Velair d’un bloc donneur reste liée à ce préréglage.

Les donneurs appartiennent à la même destination et au même jour, avec leurs heures avant modification. Un bloc déplacé ou supprimé peut encore fournir ses réglages enregistrés ; un autre bloc nouvellement ajouté ne le peut pas. Les réglages copiés sont indépendants des réglages climatiques du modèle : seuls les horaires restent liés. Si la nouvelle plage du modèle utilise un préréglage, une proposition compatible conserve cette référence.

Les liens complets reçoivent la nouvelle plage du modèle telle quelle, sans sélection de donneur. Si ses réglages sont incompatibles avec une destination complète, l’enregistrement entier est rejeté. Cela inclut les Profils inactifs et les programmations par défaut masquées.

Vérifiez les propositions dans **Jours liés**, regroupées par thermostat et Par défaut ou Profil, avec indication du type de lien. Les liens complets montrent les réglages effectifs et erreurs sans éditeur d’affectation. Les affectations de remplacement indiquent leur source. Si aucune configuration compatible n’existe, complétez la nouvelle plage à cet endroit avec des réglages manuels ou un préréglage Velair. Les erreurs concernant la programmation entière, comme la grille horaire ou la limite de changements d’un contrôleur externe, doivent aussi être résolues avant enregistrement.

La commande normale d’enregistrement du modèle enregistre ensemble le modèle et toutes les affectations, sans panneau de confirmation séparé. Les modifications incomplètes ou incompatibles restent des brouillons ; les programmations enregistrées continuent de fonctionner. Déplacer une plage existante conserve ses réglages de destination ; supprimer une plage supprime ses affectations lors du même enregistrement.

Velair empêche la suppression d’un préréglage ou modèle tant qu’il est utilisé. Un préréglage référencé par un modèle inutilisé reste utilisé. Remplacez ou dissociez d’abord ses utilisations. Des modifications en conflit nécessitent de recharger la configuration ; elles ne doivent pas mettre à jour partiellement les destinations liées.

Les changements d’une cible automatique active s’appliquent après enregistrement. Les pauses, le réglage manuel et le Forçage restent prioritaires. Une modification de Par défaut masquée par la programmation propre d’un Profil ne remplace pas ce Profil ; revenir à Par défaut utilise sa dernière configuration. Les contrôleurs externes reçoivent des programmations hebdomadaires complètes, pas des références, et les échecs n’activent pas l’exécution locale.

<a id="seasonal-automations"></a>
## Automatisations saisonnières

Utilisez [`velair.update_block_preset`](preset-automations.fr.md) pour mettre à jour un préréglage partagé depuis une automatisation. Les mises à jour partielles conservent les autres champs ; un remplacement explicite peut changer l’action. Les mises à jour sont persistantes et affectent toutes les références, avec la validation et les priorités d’exécution habituelles. Le guide inclut des exemples de température extérieure, de plage native, d’options d’appareil et d’arrêt/restauration.

Home Assistant décide toujours quand sélectionner un Profil ou Mode. Réutiliser les horaires des modèles et les préréglages évite les configurations dupliquées ; cela n’ajoute aucune règle de température extérieure ni interrogation périodique à Velair. La logique de fenêtres doit utiliser des pauses de zone dont chaque automatisation possède son propre identifiant. Un préréglage n’ajoute pas de date de retour tenant compte de l’anticipation et ne prolonge pas automatiquement une période de refroidissement programmée.

<a id="backups-and-compatibility"></a>
## Sauvegardes et compatibilité

Le modèle portable 16 conserve les préréglages, l’identité des plages des modèles et les deux types de liens. Les exports incluent les modèles requis et leurs préréglages. Les imports sont vérifiés par rapport à la configuration résultante complète ; les sauvegardes existantes sans liens restent utilisables. Les liens existants sans type restent des liens aux horaires uniquement. Les programmations existantes ne sont pas liées automatiquement lors d’une mise à niveau.

Les températures conservent l’unité de température déclarée dans Velair et participent au processus existant de migration des unités. Un préréglage partagé est adapté à chaque destination sans réécrire sa valeur pour correspondre au pas de température d’un seul thermostat.

Les chronologies des programmations montrent la température ou plage effective renvoyée par le backend. Une icône de lien marque un préréglage Velair ; une icône de copie à côté de l’heure marque les horaires liés à un modèle. L’infobulle native du bloc contient son action, son mode, ses options d’appareil et les noms des ressources partagées. Les réglages de préréglages en attente ou indisponibles sont indiqués explicitement. Les blocs hérités décrivent la configuration et les ressources de leur jour source.

Les intervalles très courts privilégient l’heure et la cible par rapport aux icônes d’origine et aux réglages supplémentaires. Leurs détails conservent les valeurs complètes et les noms des ressources sans modifier la durée de l’intervalle.
