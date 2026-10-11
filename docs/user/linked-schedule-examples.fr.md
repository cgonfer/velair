<a id="practical-examples-presets-and-linked-templates"></a>
# Exemples pratiques : préréglages et modèles liés
<!-- velair-docs:start -->
Traductions: [Original en anglais](linked-schedule-examples.md) · [Español](linked-schedule-examples.es.md) · [Français](linked-schedule-examples.fr.md) · [Deutsch](linked-schedule-examples.de.md) · [Italiano](linked-schedule-examples.it.md) · [Nederlands](linked-schedule-examples.nl.md) · [Polski](linked-schedule-examples.pl.md) · [Português (Brasil)](linked-schedule-examples.pt-br.md) · [Português (Portugal)](linked-schedule-examples.pt-pt.md) · [Русский](linked-schedule-examples.ru.md) · [État des traductions](../translation-status.md)

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

Ce guide présente des configurations du foyer utilisant **Par défaut**, les **Profils**, les modèles journaliers et les préréglages Velair. Les noms, entités et températures sont des exemples : utilisez les modes et cibles pris en charge par vos propres thermostats. Les températures sont ici en Celsius ; Velair prend aussi en charge Fahrenheit.

Pour les règles complètes, consultez [Préréglages de blocs et modèles liés](linked-schedules.fr.md).

<a id="choose-what-you-want-to-share"></a>
## Choisir ce que vous voulez partager

| Votre objectif | Choisissez | Modifications ultérieures |
|---|---|---|
| Réutiliser une température et des options à des heures indépendantes | Un préréglage Velair dans chaque bloc | Modifier le préréglage met à jour ces blocs ; leurs horaires restent indépendants. |
| Partir d’un modèle et personnaliser ses blocs | Copier les blocs | Les modifications du modèle ne mettent pas la copie à jour. Les références copiées aux préréglages restent actives. |
| Dupliquer un jour de programmation configuré | Copier | La copie conserve le type de lien au modèle, les affectations et les références aux préréglages de la source. |
| Utiliser les mêmes horaires avec des réglages de chauffage ou de refroidissement différents | Un modèle avec **Horaires uniquement** | Les changements d’horaires du modèle mettent à jour chaque jour lié ; les réglages climatiques restent indépendants. |
| Garder plusieurs jours identiques en horaires et réglages | Un modèle avec **Horaires et réglages** | Les changements d’horaires et de réglages suivent le modèle ; les commandes de destination sont en lecture seule. |

Un modèle représente un jour, pas une semaine. Liez explicitement chaque jour de semaine et thermostat requis. Une semaine peut contenir des jours indépendants et les deux types de liens. Par défaut est la semaine habituelle de chaque thermostat ; ce n’est pas un Profil enregistré.

<a id="1-one-heating-routine-for-two-rooms"></a>
## 1. Une routine de chauffage pour deux pièces

**Situation :** le salon et la chambre ont tous deux besoin de confort à 07:00 et d’une température réduite la nuit à 23:00. Les deux thermostats prennent en charge le chauffage et ces cibles.

1. Ouvrez **Modèles → Préréglages climatiques**. Créez et enregistrez ces préréglages :

   | Préréglage | Mode | Cible |
   |---|---|---|
   | Confort chauffage | Chauffage | 21 °C |
   | Nuit chauffage | Chauffage | 17 °C |

2. Dans la bibliothèque de modèles journaliers, créez **Semaine à la maison**. Ajoutez 07:00 et 23:00. Dans les **Réglages supplémentaires** de chaque bloc, choisissez le **Préréglage Velair** correspondant et enregistrez le modèle.
3. Ouvrez **Programmes → Planifications par défaut**, sélectionnez le salon et lundi. Réglez **Source des horaires** sur **Semaine à la maison**, puis choisissez **Horaires et réglages** dans **Lier**. Enregistrez ce jour.
4. Répétez pour la chambre et chaque jour de semaine qui doit suivre cette routine.

L’heure, le mode, la cible et les options d’appareil sont en lecture seule dans ces jours liés. La colonne de cible montre toujours 21 °C ou 17 °C ; elle ne remplace pas la cible par le nom du préréglage. Les indicateurs d’origine et détails du bloc identifient le modèle et le préréglage.

Effectuez maintenant deux changements séparés :

| Changement enregistré | Résultat |
|---|---|
| Déplacer le bloc de 07:00 du modèle à 07:30 | Chaque jour lié commence ce bloc à 07:30. Sa référence au préréglage reste inchangée. |
| Passer Confort chauffage de 21 °C à 21.5 °C | Chaque référence utilise 21.5 °C, y compris via le modèle. Les cibles nocturnes restent à 17 °C. |

Enregistrer le modèle n’enregistre pas aussi un brouillon de Profil ouvert sans rapport. Enregistrer un préréglage n’enregistre pas un brouillon de programmation sans rapport. Chaque ressource possède sa propre commande d’enregistrement.

<a id="2-winter-and-summer-with-one-set-of-times"></a>
## 2. Hiver et été avec les mêmes horaires

**Situation :** un climatiseur chauffe en hiver et refroidit en été. Les horaires du foyer restent les mêmes, mais les cibles et actions changent.

Créez **Jour ouvré** avec des blocs à 07:00 et 23:00. Créez les préréglages suivants et utilisez **Horaires uniquement** pour lier le lundi du salon dans Par défaut et dans les deux Profils :

| Heure partagée | Affectation Par défaut | Affectation du Profil Hiver | Affectation du Profil Été |
|---|---|---|---|
| 07:00 | Confort habituel : Chauffage, 20 °C | Confort hiver : Chauffage, 21 °C | Confort été : Refroidissement, 25 °C |
| 23:00 | Arrêt manuel | Nuit hiver : Chauffage, 17 °C | Préréglage d’arrêt |

Pour configurer un Profil, sélectionnez **Planifications des Profils**, créez le Profil et réglez le salon sur **Planification du Profil**. Sélectionnez le jour, choisissez **Jour ouvré → Horaires uniquement** et configurez ses affectations. Enregistrez le Profil complet. Dans Par défaut, enregistrez chaque jour modifié séparément.

Déplacer l’heure du matin du modèle à 07:30 déplace les trois programmations. Changer la cible propre au modèle ne change pas ces affectations. Modifier **Confort hiver** affecte ses références, y compris le Profil Hiver, mais ne transforme pas la cible de refroidissement d’Été en cible de chauffage.

Le Profil sélectionné détermine toujours quelle semaine s’exécute. Home Assistant peut sélectionner Hiver ou Été avec les actions de Profil existantes ; le modèle ne décide pas de la saison. Par exemple, après création d’un Profil avec l’ID d’automatisation `summer`, cette action le sélectionne :

```yaml
action: velair.activate_profile
data:
  profile_id: summer
```

Pour revenir aux programmations par défaut enregistrées :

```yaml
action: velair.deactivate_profile
```

Utilisez l’**ID d’automatisation** affiché dans votre Profil, qui peut différer de son nom d’affichage. Consultez [Profils climatiques](climate-profiles.fr.md) pour les Modes et règles d’activation des profils.

Pour le temps doux, un équipement contrôlé localement peut avoir un Profil distinct avec le comportement **Mettre en pause → Éteindre le thermostat**. Une automatisation peut sélectionner ce Profil. Cela diffère d’un bloc d’arrêt programmé : une zone en pause ne reprend pas le suivi des blocs suivants. Le comportement de pause est indisponible pour les zones contrôlées en externe ; les actions de programmation prises en charge par leur fournisseur s’appliquent.

Les seuils de prévision, les vérifications périodiques de température extérieure, les notifications de fenêtre et le report de l’extinction du soir restent des décisions des automatisations Home Assistant. Les préréglages et liens n’ajoutent pas ces règles à Velair.

<a id="3-copy-a-day-then-customize-a-guest-room"></a>
## 3. Copier un jour puis personnaliser une chambre d’amis

**Situation :** la chambre d’amis doit partir de Semaine à la maison, mais les invités veulent chauffer pour le petit-déjeuner à 08:00 plutôt qu’à 07:00.

Dans Programmes, sélectionnez la chambre d’amis et le jour. Conservez **Source des horaires → Programme indépendant**, puis choisissez **Semaine à la maison** dans le sélecteur séparé **Modèles** pour copier ses blocs. Déplacez l’heure du matin à 08:00 et enregistrez. Le jour est indépendant du modèle. Déplacer ensuite Semaine à la maison à 07:30 ne déplace pas le bloc de 08:00 de la chambre d’amis.

Si le bloc copié utilise **Confort chauffage**, il référence toujours ce préréglage. Passer Confort chauffage à 21.5 °C change donc aussi la cible de la chambre d’amis. Être indépendant d’un modèle ne signifie pas être indépendant d’un préréglage.

Pour garder la chambre d’amis à 20 °C quelles que soient les futures modifications du préréglage, ouvrez les Réglages supplémentaires du bloc, choisissez **Aucun preset Velair**, puis réglez la cible manuelle à 20 °C et enregistrez. Retirer le préréglage conserve d’abord ses réglages effectifs ; cela ne vide pas le bloc.

Copier un jour de programmation diffère de copier des blocs depuis la bibliothèque de modèles : la première opération conserve le lien au modèle du jour source. Par exemple, copiez vers mardi un lundi suivant **Semaine à la maison → Horaires et réglages**. Les deux jours suivent désormais Semaine à la maison ; déplacer son début de 07:00 à 07:30 met les deux à jour.

Avec **Horaires uniquement**, la copie conserve le même lien aux horaires uniquement et copie les affectations, y compris les préréglages. Vous pouvez ensuite modifier les affectations du mardi sans changer celles du lundi, tandis que les deux jours suivent les horaires du modèle.

Vous pouvez aussi copier lundi vers lundi sur un autre thermostat. La destination conserve le même type de lien s’il est compatible ; ses autres jours gardent leur configuration existante. Si un préréglage partagé de Chauffage ne peut pas être utilisé par un appareil limité au refroidissement, la copie est rejetée plutôt que de supprimer silencieusement le lien. Par défaut valide toutes les destinations sélectionnées ensemble. Dans les Profils, la copie ne met à jour que le brouillon validé jusqu’à l’enregistrement du Profil.

Pour un mardi indépendant, copiez-le puis choisissez **Dissocier** avant l’enregistrement. Le jour conserve ses réglages actuels et ses références actives aux préréglages, mais cesse de suivre le modèle. L’opération **Copier les blocs** de la bibliothèque de modèles reste indépendante.

<a id="4-change-a-link-without-losing-the-wrong-draft"></a>
## 4. Changer un lien en conservant le bon brouillon

**Situation :** lundi est lié à Semaine à la maison. Vous voulez personnaliser ce lundi en laissant les autres jours liés inchangés.

| Choix | Résultat dans le brouillon |
|---|---|
| Passer d’**Horaires et réglages** à **Horaires uniquement** | Conserver les réglages actuels du modèle comme affectations propres à ce jour, en gardant les préréglages. Les horaires suivent toujours le modèle. |
| Passer d’**Horaires uniquement** à **Horaires et réglages** | Confirmer le remplacement des affectations du jour par les réglages du modèle. Annuler conserve la sélection et le brouillon d’origine. |
| Choisir un autre modèle | Confirmer le remplacement du brouillon. Annuler conserve le modèle et les réglages actuels. |
| Utiliser **Dissocier** | Conserver les horaires et réglages actuels du brouillon comme jour indépendant, en gardant les préréglages. |
| Choisir **Programme indépendant** | Confirmer l’abandon des modifications de ce jour et restaurer son jour enregistré comme brouillon indépendant. |

Ces opérations n’enregistrent pas automatiquement. Enregistrez le jour Par défaut ou le Profil complet lorsque vous êtes prêt.

Pour illustrer la différence, supposons que le lundi enregistré possède un bloc indépendant à 09:00 et 20 °C. Vous sélectionnez un modèle commençant à 08:00 et ajustez son affectation d’horaires uniquement à 21 °C sans enregistrer :

- **Dissocier** conserve 08:00 et 21 °C dans le brouillon indépendant.
- **Programme indépendant** restaure les valeurs enregistrées de 09:00 et 20 °C.

Si le lundi enregistré était lui-même lié, Programme indépendant utilise les valeurs actuelles de ce jour lié enregistré et les rend indépendantes. Cela ne récupère pas une ancienne programmation manuelle antérieure à la création du lien.

Matérialiser un jour utilise les valeurs adaptées à son thermostat. Par exemple, une cible manuelle partagée de 18.3 °C peut apparaître comme 18.5 °C sur un appareil avec un pas de 0.5 °C. Après Dissocier, cette cible manuelle reste à 18.5 °C. Un bloc utilisant un préréglage conserve plutôt sa référence au préréglage. Aucune de ces opérations ne change la bibliothèque partagée.

<a id="5-add-a-lunchtime-block-to-a-shared-template"></a>
## 5. Ajouter un bloc à midi à un modèle partagé

**Situation :** Jour ouvré possède déjà des blocs à 07:00 et 23:00. Vous ajoutez 12:00 avec Chauffage manuel, 18 °C. Plusieurs pièces et Profils utilisent ce modèle.

<a id="a-compatible-hours-only-destination"></a>
### Une destination compatible liée aux horaires uniquement

Si la destination prend en charge Chauffage à 18 °C, Velair propose de copier cette configuration dans sa nouvelle affectation de 12:00. Vérifiez-la dans **Jours liés** et enregistrez le modèle.

Seule l’heure reste partagée. Modifier ensuite la cible de 12:00 du modèle à 19 °C ne change pas cette affectation. Si le nouveau bloc référence plutôt un préréglage compatible, l’affectation conserve cette référence ; les modifications ultérieures de ce préréglage continuent de se propager.

<a id="an-incompatible-hours-only-destination"></a>
### Une destination incompatible liée aux horaires uniquement

Supposons qu’un autre thermostat ait une cible minimale de 19 °C. Son affectation existante de 07:00 utilise le préréglage valide **Confort bureau : Chauffage, 21 °C**. La nouvelle cible de 18 °C est incompatible ; Velair cherche donc une affectation enregistrée dans le même jour de ce thermostat :

1. Un bloc à exactement 12:00, s’il existait avant cette modification.
2. Les blocs précédents, en commençant par le plus proche.
3. Les blocs suivants, en commençant par le plus proche.

Il propose ici Confort bureau depuis 07:00. Jours liés indique ce remplacement et sa source. Vous pouvez l’accepter ou choisir une autre affectation valide avant l’enregistrement. Son préréglage reste lié.

Un donneur incompatible est ignoré. Un bloc déplacé ou supprimé dans cette modification peut encore donner son affectation précédemment enregistrée ; un autre bloc nouvellement ajouté ne le peut pas. Si aucun donneur valide n’existe, Jours liés affiche une affectation en attente. Complétez-la manuellement ou choisissez un préréglage compatible ; rien n’est enregistré tant qu’elle reste en attente.

<a id="a-completely-linked-destination"></a>
### Une destination entièrement liée

Avec **Horaires et réglages**, le nouveau bloc de 12:00 vient directement du modèle. Il n’y a pas de remplacement par les anciens réglages d’une pièce.

Si la cible de 18 °C du modèle est incompatible avec une destination complète, l’enregistrement du modèle entier est bloqué. Changez sa cible pour une valeur prise en charge par toutes ces destinations, ou faites passer la destination concernée à Horaires uniquement ou à un jour indépendant et enregistrez d’abord ce changement.

Cette vérification inclut les Profils inactifs et les programmations par défaut masquées par un autre Profil actif. Jusqu’à l’aboutissement d’un enregistrement valide du modèle, toutes les destinations enregistrées conservent leur programmation précédente.

<a id="move-or-remove-an-existing-block"></a>
### Déplacer ou supprimer un bloc existant

Déplacer 07:00 à 07:30 conserve l’affectation du matin de chaque destination liée aux horaires uniquement ; cela ne la remplace pas par la cible du modèle. Les destinations complètes suivent le modèle mis à jour. Supprimer un bloc retire les affectations correspondantes des horaires uniquement et le bloc correspondant du lien complet dans le même enregistrement.

Un bloc possède une identité stable. Le supprimer puis en ajouter un autre à la même heure crée un nouveau bloc ; cela n’est pas traité comme le déplacement du bloc d’origine.

<a id="6-understand-uses-before-editing-or-deleting"></a>
## 6. Comprendre les utilisations avant modification ou suppression

**Situation :** le préréglage Confort chauffage est sélectionné dans :

- Un bloc de Semaine à la maison.
- Un bloc indépendant Par défaut le vendredi.
- Une affectation d’horaires uniquement dans un Profil Hiver.

Le préréglage possède **trois références directes**. Si deux jours supplémentaires utilisent Semaine à la maison avec Horaires et réglages, ils héritent du préréglage via le modèle. Ils apparaissent comme destinations supplémentaires concernées sans faire passer le nombre de références directes à cinq.

Modifier le préréglage affecte toutes ces références et destinations héritées. Elles doivent toutes être compatibles avant l’enregistrement. Un préréglage référencé par un modèle ne peut pas être supprimé même si ce modèle n’a aucun jour lié : retirez d’abord la référence dans le modèle.

Le compteur **Jours liés** d’un modèle signifie autre chose. Lier lundi et mardi crée deux jours liés. Le copier dans vendredi ne crée aucun lien et n’augmente pas ce compteur. Les copies ne sont pas suivies comme utilisations du modèle.

Supprimez un modèle uniquement après dissociation de tous ses jours enregistrés dans Par défaut et les Profils. Modifier son nom, ses heures ou ses réglages conserve sa position dans la bibliothèque.

<a id="7-what-happens-while-a-schedule-is-active"></a>
## 7. Que se passe-t-il pendant une programmation active ?

Supposons que le salon suive automatiquement Confort chauffage à 21 °C. Enregistrer ce préréglage à 21.5 °C met à jour l’intention active. L’appareil physique doit encore accepter l’action ; l’enregistrement ne prouve pas que la pièce s’est réchauffée.

Si le salon a un Forçage à 23 °C, modifier le préréglage ne l’annule pas. À son expiration, Velair utilise la configuration actuelle de la programmation. Les pauses et le réglage manuel conservent aussi leur priorité. Activer un Profil est une action distincte : elle annule les Forçages des zones concernées, tandis que les pauses globales et par zone restent prioritaires. Consultez les [règles de priorité des Profils](climate-profiles.fr.md).

Si Hiver fournit sa propre semaine, modifier Par défaut ne remplace pas la programmation active d’Hiver. Revenir à Par défaut utilise ses derniers réglages enregistrés. Un Profil configuré pour utiliser **Planification par défaut** hérite des liens et préréglages de Par défaut plutôt que d’en enregistrer une autre copie.

Un jour vide n’éteint pas implicitement l’équipement. Un bloc nocturne du vendredi à 23:00 se poursuit pendant un samedi vide jusqu’au début d’un autre bloc programmé. Ajoutez un bloc d’arrêt explicite si c’est l’action souhaitée.

<a id="8-device-options-cooling-and-temperature-ranges"></a>
## 8. Options d’appareil, refroidissement et plages de températures

**Situation :** un climatiseur de chambre propose un préréglage natif `sleep` et un réglage de ventilation `quiet`. Vous voulez les deux à 23:00 avec refroidissement à 25 °C.

Créez un préréglage Velair nommé **Nuit d’été chambre** avec Refroidissement, 25 °C, Préréglage de l’appareil `sleep` et Mode du ventilateur `quiet`. Sélectionnez-le dans le bloc de 23:00 de la chambre via Réglages supplémentaires. **Préréglage Velair** est la configuration partagée Velair ; **Préréglage de l’appareil** est une commande dans cette configuration. Le résumé du bloc affiche ensemble la cible, le mode et les deux options d’appareil.

Pour une destination prenant ces options en charge, le badge des réglages compte trois éléments : un lien Velair et deux options d’appareil. La température et le mode HVAC ne s’ajoutent pas au badge. Une option d’appareil omise n’est pas réinitialisée : retirer `quiet` de la configuration partagée arrête l’envoi d’une commande de ventilation au lieu de régler le ventilateur sur une autre valeur.

Pour une autre routine, créez **Ventilation silencieuse uniquement** avec la seule option de ventilation et sans cible ni mode HVAC. Une référence programmée envoie le réglage de ventilation sans demander de changement de mode HVAC ni allumer un équipement éteint. Elle ne possède aucune cible pour le préconditionnement ou Room Assist. Copiée vers un thermostat sans contrôle de ventilation, elle deviendrait une action vide et serait rejetée.

Un équipement prenant nativement en charge une plage chaud/froid peut plutôt utiliser un préréglage nommé **Plage maison** avec Chaud/froid, cible basse 19 °C et cible haute 24 °C. Les deux limites apparaissent dans les colonnes de cible du bloc et viennent du même préréglage. Passer la limite haute à 25 °C met à jour ses références en conservant la limite basse. Un thermostat à cible unique ne peut pas utiliser ce préréglage de plage ; Velair n’invente pas de cible scalaire ni de limite de plage manquante. Utilisez un autre préréglage compatible pour cet appareil.

Les préréglages de mode uniquement choisissent un mode HVAC sans température ni options d’appareil supplémentaires. Un préréglage d’arrêt demande l’extinction et n’a ni cible ni options supplémentaires. Ces actions conservent leur fonctionnement existant lorsqu’elles sont référencées via un modèle ; les partager n’ajoute pas de contrôle continu de température.

<a id="troubleshooting-shared-configurations"></a>
## Dépanner les configurations partagées

| Ce que vous voyez | Vérification ou action |
|---|---|
| Une heure est verrouillée | Le jour suit les horaires du modèle. Modifiez le modèle ou utilisez Dissocier. |
| Le mode et la cible sont aussi verrouillés | Le jour suit le modèle complet ou le bloc utilise un préréglage Velair. Modifiez sa source partagée. |
| Un jour copié change encore de température | Il a conservé une référence à un préréglage. Choisissez Aucun preset Velair pour rendre ce bloc manuel. |
| Une modification de modèle échoue alors que la pièce active semble valide | Vérifiez Jours liés pour les Profils inactifs, les jours Par défaut masqués et les autres thermostats. |
| Une nouvelle plage liée aux horaires uniquement est en attente | Choisissez une configuration manuelle ou un préréglage valide dans Jours liés. |
| Une erreur du fournisseur concernant la semaine entière persiste | Résolvez sa grille horaire, la prise en charge des actions ou la limite de blocs. Choisir un donneur ne corrige pas ces restrictions. |
| Le contrôle de compatibilité réussit mais l’enregistrement échoue | Le contrôle a testé un thermostat. L’enregistrement valide chaque destination réellement enregistrée. |
| Un bouton de suppression est désactivé | Retirez d’abord toutes les références enregistrées ; les modèles peuvent référencer des préréglages sans jours liés. |
| Une autre session a modifié la configuration | Rechargez la configuration et vérifiez le brouillon conservé avant de réessayer. |
| Une prévisualisation échoue ou charge encore | Conservez le brouillon et réessayez. Velair ne devine pas les réglages et ne retire pas de références pour permettre l’enregistrement. |

Les réglages facultatifs d’appareil non pris en charge par une destination peuvent être filtrés de sa configuration effective. Les cibles hors limites et les modes incompatibles sont rejetés. Une action composée uniquement d’options ne peut pas devenir vide après filtrage. Les contrôleurs externes imposent des restrictions supplémentaires ; publier une programmation ne se rabat jamais sur l’exécution climatique locale.

<a id="back-up-the-whole-setup"></a>
## Sauvegarder la configuration entière

Utilisez l’export de Velair plutôt que de copier seulement un jour résolu visible. Les exports de modèle 16 conservent les deux types de liens, les préréglages et l’identité des blocs. Exporter les programmations ou Profils inclut les modèles et préréglages dont ils dépendent ; l’écran d’export montre les sections ajoutées automatiquement.

À l’import, inspectez les remplacements avant de confirmer. Remplacer une ressource partagée peut aussi affecter ses utilisations locales existantes. La configuration combinée doit être valide ; les nouveaux Profils ne sont pas activés simplement parce qu’ils sont importés. Les anciennes sauvegardes restent importables, tandis que les anciennes versions de Velair ne peuvent pas importer un export de modèle 16. Consultez [Portabilité](usage.fr.md#portability).
