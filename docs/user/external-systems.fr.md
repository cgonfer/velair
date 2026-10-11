<a id="external-schedule-execution"></a>
# Exécution externe des programmations
<!-- velair-docs:start -->
Traductions: [Original en anglais](external-systems.md) · [Español](external-systems.es.md) · [Français](external-systems.fr.md) · [Deutsch](external-systems.de.md) · [Italiano](external-systems.it.md) · [Nederlands](external-systems.nl.md) · [Polski](external-systems.pl.md) · [Português (Brasil)](external-systems.pt-br.md) · [Português (Portugal)](external-systems.pt-pt.md) · [Русский](external-systems.ru.md) · [État des traductions](../translation-status.md)

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

Velair gère normalement le stockage des programmations et leur exécution sur les appareils. Pour les appareils compatibles, **Paramètres → Systèmes externes** permet de publier la programmation hebdomadaire effective vers un contrôleur qui l’exécute indépendamment.

Cette section apparaît lorsque Velair détecte une intégration Home Assistant prise en charge avec un appareil géré compatible, ou lorsqu’une zone est déjà contrôlée par un système externe. Avant d’activer l’exécution externe, créez et enregistrez une programmation effective contenant au moins un bloc de température pour la zone. S’il n’y a rien à publier, Velair conserve le contrôle local et explique ce prérequis dans Paramètres. Choisir le système externe pour une zone enregistre ce transfert de contrôle avant que Velair transmette la semaine complète. Un échec de transmission ne rétablit pas l’exécution locale : la zone reste externe et affiche l’erreur de publication, afin que deux planificateurs n’entrent jamais en concurrence. Après un appel de service Home Assistant réussi, Velair indique que la programmation est publiée : cela signifie que l’intégration externe a accepté la demande. Velair ne confirme pas que le contrôleur physique l’a appliquée.

L’exécution externe se limite volontairement aux programmations. Velair n’envoie aucune action climatique à une zone externe, y compris l’application au démarrage ou de la programmation actuelle, le Forçage, la pause/reprise, le réglage manuel, Room Assist ou le préconditionnement adaptatif. Les profils et modes servent uniquement à sélectionner une programmation : `normal` publie la semaine Par défaut de la zone et `schedule` publie la semaine du profil. Le comportement Pause est indisponible pour les zones externes. Sélectionner Par défaut, un profil ou un mode, ou modifier un profil actif, publie la nouvelle semaine effective complète après l’enregistrement de la sélection. Un échec de publication n’annule pas la sélection globale du profil ou du mode et n’affecte pas les zones locales. Sélectionner de nouveau Par défaut, un profil ou un mode lance également une nouvelle publication lorsque l’état d’exécution actuel est `failed` ou qu’aucune publication n’a réussi. Velair ne réessaie pas automatiquement ; cette publication résulte uniquement de la sélection explicite.

<a id="evohome-via-ramses_cc"></a>
## Evohome via ramses_cc

Le premier système pris en charge utilise le service Home Assistant `ramses_cc.set_zone_schedule`. Velair n’a aucune dépendance Python envers `ramses_cc` et communique uniquement par les services Home Assistant.

Paramètres et l’éditeur de profils déduisent ces conditions des capacités du contrôleur et les présentent une seule fois sous ce contrôleur externe, même lorsque plusieurs zones l’utilisent. Les détails du contrôleur sont repliés par défaut et peuvent être développés pour consulter ses limites.

Limites actuelles :

- programmations de chauffage avec une consigne unique par point de changement ;
- exactement sept jours de la semaine, en préservant la continuité hebdomadaire de Velair ;
- aucun bloc d’arrêt, aucune plage de température, aucun mode de refroidissement ni aucune option climatique ;
- au maximum six points de changement transmis par jour ;
- si le premier bloc commence après `00:00`, Velair insère un point de continuité à minuit ; ce changement implicite compte dans le maximum quotidien, ce qui laisse de la place pour cinq blocs modifiables ce jour-là ;
- horaires alignés sur le pas de 5 minutes du contrôleur ;
- températures converties en Celsius dans les données transmises au contrôleur.

Pour les zones exécutées en externe, les éditeurs quotidiens Par défaut et Profil affichent l’utilisation actuelle du contrôleur juste au-dessus des blocs. La première ligne indique le nombre de points de changement utilisés et le maximum ; la seconde distingue les blocs modifiables du point implicite de continuité à minuit. L’indicateur change d’apparence lorsque la limite est atteinte ou dépassée par le brouillon. Ces informations proviennent des capacités déclarées par le contrôleur sélectionné ; la validation de publication du backend reste la référence.

Vue d’ensemble conserve l’activité normale de programmation et les informations du prochain événement pour une zone externe. Un indicateur compact **Externe** nomme le contrôleur et utilise une icône d’état pour la publication en cours, acceptée, échouée ou indisponible. Son bouton d’information explique que le contrôleur exécute la chronologie prévue et que Velair n’envoie aucune action climatique à la zone. L’état du planificateur affiche aussi un avis informatif lorsqu’une ou plusieurs zones visibles utilisent l’exécution externe.

La détection nécessite le service de définition de programmation, une entrée de configuration `ramses_cc` chargée et une entité `climate` gérée qui déclare la prise en charge du chauffage et d’une consigne unique. Les métadonnées publiques des entités Home Assistant ne permettent pas de distinguer toutes les zones Evohome des autres appareils `ramses_cc`. L’appel de service constitue donc la vérification finale de compatibilité ; toute erreur reste visible comme échec de publication.

Cette intégration dispose de tests automatisés des services. Des essais réels sur une installation Evohome utilisant `ramses_cc` ont aussi confirmé la publication et la conservation des programmations hebdomadaires testées par le contrôleur. Les retours d’autres installations et combinaisons de programmations restent utiles.

La publication possède seulement trois états d’exécution : **publishing** (publication en cours), **published** (publiée) et **failed** (échec). Avant la première publication pendant l’exécution actuelle de Home Assistant, aucun état de publication n’existe. Cet état n’est pas enregistré et reste indépendant de la disponibilité actuelle du fournisseur.

Velair n’appelle pas `get_zone_schedule`, n’ajoute pas de délais, ne réessaie pas automatiquement et n’interroge pas périodiquement le contrôleur. Ces mécanismes ne lui permettraient toujours pas de confirmer, de façon indépendante du fournisseur, ce que le matériel physique exécute.
