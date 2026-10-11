<a id="temperature-units-and-migration"></a>
# Unités de température et migration
<!-- velair-docs:start -->
Traductions: [Original en anglais](temperature-units.md) · [Español](temperature-units.es.md) · [Français](temperature-units.fr.md) · [Deutsch](temperature-units.de.md) · [Italiano](temperature-units.it.md) · [Nederlands](temperature-units.nl.md) · [Polski](temperature-units.pl.md) · [Português (Brasil)](temperature-units.pt-br.md) · [Português (Portugal)](temperature-units.pt-pt.md) · [Русский](temperature-units.ru.md) · [État des traductions](../translation-status.md)

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

Velair prend en charge Celsius et Fahrenheit en suivant l’unité de température configurée dans Home Assistant. Il ne propose pas de sélecteur d’unité distinct. L’unité détectée apparaît en lecture seule dans **Paramètres > Unité de température** ; modifiez-la dans les réglages du système d’unités de Home Assistant.

<a id="new-installations-and-resets"></a>
## Nouvelles installations et réinitialisations

Lors de la première configuration, Velair crée les programmations, les modèles intégrés, les seuils de confort, les limites Room Assist et les réglages de préconditionnement adaptatif dans l’unité détectée dans Home Assistant. Réinitialiser Velair recrée ces valeurs par défaut dans l’unité actuellement détectée.

Les consignes sont validées par rapport au minimum, au maximum et au pas effectif de température de chaque appareil géré. Velair utilise directement `target_temp_step` lorsque Home Assistant le fournit. Sinon, Paramètres affiche la valeur de repli effective : le dernier pas valide signalé par cette entité, la valeur manuelle enregistrée pour la zone, ou `1` si aucune des deux n’existe. Vous pouvez définir le pas réel de l’appareil. L’enregistrer lorsque l’attribut est absent efface la valeur observée mémorisée, sans changer les règles des programmations. Un nouveau pas valide signalé devient prioritaire et est de nouveau mémorisé ; une entité incohérente ne peut donc pas invalider les programmations décimales existantes simplement en omettant cet attribut.

La grille des consignes valides commence à la température minimale publiée par l’appareil, et non à zéro. Cela préserve ses consignes réelles en Celsius comme en Fahrenheit, y compris lorsque son minimum n’est pas un multiple exact de son pas.

<a id="existing-stored-data"></a>
## Données déjà enregistrées

Velair stocke la configuration thermique dans l’unité enregistrée avec les données. Il ne réinterprète pas silencieusement les nombres stockés lorsque l’unité de Home Assistant change.

Lorsque les données stockées indiquent déjà une unité et que Home Assistant signale ensuite l’autre unité, Velair :

1. arrête la programmation automatique et les écritures de valeurs thermiques ;
2. conserve l’état de récupération actif de Room Assist tout en arrêtant ses écouteurs ;
3. crée une notification persistante Home Assistant ;
4. affiche les unités source et cible dans Paramètres ;
5. propose une migration explicite de toutes les données thermiques enregistrées.

N’exécutez cette migration que si chaque valeur stockée utilise encore l’unité source affichée. L’opération convertit les programmations, modèles, consignes actuelles et précédentes des dérogations, valeurs de repli du pas de consigne, seuils de confort, réglages Room Assist, configuration du préconditionnement adaptatif, derniers pas de consigne signalés, vitesses et observations d’apprentissage. Les consignes liées à un appareil connu sont alignées sur son pas effectif lorsqu’il est disponible. Les autres valeurs modifiables converties utilisent une précision sûre plutôt qu’un pas d’appareil inventé.

Le planificateur reprend uniquement après l’enregistrement réussi des données converties et la restauration de l’état d’exécution. Après une opération réussie, Room Assist restaure la consigne programmée convertie et efface son état de récupération enregistré. Si les données ont été enregistrées mais que la récupération à l’exécution échoue, Velair reste arrêté et indique qu’il faut recharger l’intégration ou redémarrer Home Assistant.

<a id="upgrading-published-celsius-only-data"></a>
## Mise à niveau des données publiées limitées au Celsius

Les versions publiées de Velair avant l’ajout des métadonnées d’unité considéraient les valeurs thermiques stockées comme des degrés Celsius. Velair suppose donc que les anciennes données sans unité sont en Celsius.

- Si Home Assistant utilise Celsius, Velair peut continuer avec ces valeurs et enregistrer les métadonnées d’unité.
- Si Home Assistant utilise Fahrenheit, Velair ne cherche pas à deviner si certaines valeurs ont été modifiées manuellement. Il arrête le planificateur et demande de **Réinitialiser Velair**, ce qui remplace les anciennes données par de nouvelles valeurs Fahrenheit par défaut.

L’export reste disponible pendant l’attente de cette réinitialisation ; vous pouvez ainsi conserver une copie de référence avant d’effacer les anciennes programmations et les réglages.

<a id="export-and-import"></a>
## Export et import

Les exports actuels comprennent un champ `temperature_unit`. Lorsqu’un fichier importé utilise l’autre unité, Velair convertit les sections thermiques sélectionnées vers l’unité actuelle de Home Assistant avant de les stocker.

Les anciennes sauvegardes sans `temperature_unit` sont acceptées et considérées comme Celsius. L’écran d’import affiche cette hypothèse avant l’import. Sur une installation en Fahrenheit, ces anciennes valeurs sont automatiquement converties en Fahrenheit.

L’import remplace toujours les sections sélectionnées : les programmations, modèles, réglages ou données d’apprentissage correspondants sont écrasés. Exportez d’abord la configuration actuelle si vous pouvez avoir besoin d’un point de restauration.

La valeur manuelle de repli du pas de consigne par zone est incluse dans les données portables et convertie comme un écart de température lorsque les unités diffèrent. Le dernier pas observé sur une entité climatique locale constitue un contexte interne de l’appareil et n’est pas exporté.

<a id="temporarily-unavailable-climates"></a>
## Appareils temporairement indisponibles

Un appareil peut ne pas publier sa plage ou son pas de consigne lorsqu’il est indisponible. Velair peut tout de même migrer ou importer les données enregistrées, puis valide les programmations lorsque l’appareil publie de nouveau ses capacités. Une programmation incompatible est signalée dans le panneau et doit être corrigée avant de pouvoir s’y fier.

<a id="what-velair-converts"></a>
## Ce que Velair convertit

La configuration stockée et les données de sauvegarde importées sont converties uniquement lors d’une migration ou d’un import explicite. Les mesures et consignes actuelles des appareils appartiennent déjà à Home Assistant et ne sont pas converties de nouveau. Les mesures des capteurs indépendants de la pièce ou des capteurs extérieurs sont converties seulement au moment de la comparaison, lorsque leur unité déclarée diffère de celle de l’appareil géré.
