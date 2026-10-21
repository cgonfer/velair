<a id="diagnostics"></a>
# Diagnostic
<!-- velair-docs:start -->
Traductions: [Original en anglais](diagnostics.md) · [Español](diagnostics.es.md) · [Français](diagnostics.fr.md) · [Deutsch](diagnostics.de.md) · [Italiano](diagnostics.it.md) · [Nederlands](diagnostics.nl.md) · [Polski](diagnostics.pl.md) · [Português (Brasil)](diagnostics.pt-br.md) · [Português (Portugal)](diagnostics.pt-pt.md) · [Русский](diagnostics.ru.md) · [État des traductions](../translation-status.md)

<details>
<summary>État de cette traduction</summary>

| Information | État |
| --- | --- |
| Version de référence | 1.9.0-beta.3 |
| Dernière synchronisation | 2026-10-21 |
| Révision linguistique | Traduction assistée par IA |
| Par rapport à l’original | Synchronisée avec l’original anglais. |

</details>

---
<!-- velair-docs:end -->

La section **Diagnostic** offre une vue locale en lecture seule de ce que Velair peut
vérifier sans nécessiter Home Assistant Recorder ni services externes.

Elle affiche l’état actuel du planificateur et une bande horizontale compacte des
appareils de chauffage ou de climatisation gérés, dans l’ordre configuré pour les thermostats. Sélectionner un appareil
ouvre un seul panneau de détails sur toute la largeur sous cette bande.
Le panneau regroupe chaque information une seule fois, dans les rubriques état et transmission,
configuration active, fonctions, puis appareil et capteurs. Il inclut :

- la disponibilité et les capacités HVAC/température déclarées ;
- les problèmes de configuration détectés lorsque Velair dispose de preuves directes ;
- le mode et les profils effectifs, l’intention de commande calculée, les forçages et pauses ;
- la dernière consigne de contrôle acceptée par Home Assistant, l’erreur de transmission et
  l’état des nouvelles tentatives, dont le nombre est limité ;
- Room Assist, le préconditionnement adaptatif, le confort et les capteurs
  explicitement associés.

Les appels réussis à `velair.set_hvac_mode` apparaissent comme une commande manuelle acceptée
ne portant que sur le mode. Ils comprennent le mode HVAC choisi, sans température
inventée. Les échecs de validation ne remplacent pas la précédente preuve d’acceptation, et
les échecs de transmission physique ne publient pas d’événement de consigne réussi.

Velair ne déduit pas une cause lorsque les informations disponibles prouvent uniquement un symptôme,
comme une entité indisponible.
Les informations de batterie sont omises si Velair ne peut pas établir une association fiable ;
la première version ne tente pas de rapprochement heuristique entre appareils.

Pour le confort, le diagnostic comprend la source enregistrée de chaque mesure dérivée activée,
l’entrée effective ou l’entité externe, sa disponibilité actuelle et des codes de problème stables
pour les données manquantes, périmées, invalides ou non vérifiées. Le point de rosée, l’humidité
absolue et l’Humidex restent ici des observations : leur présence dans un rapport ne signifie
pas qu’ils ont influencé la programmation ou le contrôle climatique. Les mêmes charges utiles
activées sont exposées dans l’attribut `derived_metrics` du capteur de zone **Conditions
environnementales** ; Velair ne crée pas d’entités proxy séparées pour elles. Les mesures actuelles
incluent `freshness: reported` ou `unverified` ; ce dernier état reste visible avec un libellé
informatif et peut être relié à sa source.
Lorsque la comparaison extérieure est activée, le même rapport de confort contient également la
disponibilité explicite de ses capteurs, la qualité indépendante des données extérieures, la
comparaison normalisée, l’humidité absolue intérieure/extérieure explicite et tout code
d’opportunité ou de compromis. Le bloc `guidance_thresholds` enregistre la sensibilité effective
par zone utilisée pour cette conclusion, ce qui aide à distinguer un problème de capteur d’un
conseil volontairement plus strict. Ces valeurs restent purement informatives et ne signifient pas
que Velair a ouvert une fenêtre ou modifié le HVAC.
Le diagnostic comprend aussi `comfort_zone` : la géométrie Simple, Guidée ou personnalisée tenant
compte de la température, et la plage d’humidité effective à la température actuelle. Une plage
effective `null` explique pourquoi une mesure d’humidité à jour n’a pas été classée lorsque la
température était indisponible ; elle n’est pas remplacée par une valeur de repli supposée.

L’évaluation en direct comprend le `range_summary` actuel. Les entrées
`comfort_assessment_changed` conservées gardent également `previous_range_summary` et les
indicateurs `range_summary_changed` et `range_status_changed`, afin qu’un rapport téléchargé
puisse montrer si l’événement correspondait à une transition de plage configurée ou à un autre
changement de confort. Ces champs ne contiennent que des codes sémantiques stables, pas le
contexte brut des événements Home Assistant.

<a id="learning-evidence"></a>
## Preuves d’apprentissage

La section existante de la fonction Anticipation sépare l’activité de chauffage et de refroidissement. Elle indique si une observation est en cours ou si Velair attend une transition adaptée, et présente la dernière transition d’apprentissage conservée lorsqu’elle existe. Ses détails dépliables contiennent uniquement les preuves utiles à cette décision, comme les températures initiale et cible, l’écart minimal de température, la durée observée et le démarrage maximal configuré.

L’historique d’Anticipation comprend les débuts, interruptions et résultats d’observation ainsi que les transitions réelles n’ayant pas permis d’en démarrer une. Les résultats distinguent les observations complètes, partielles et invalides. Les observations invalides peuvent préciser un écart de température insuffisant, une durée trop courte ou une durée dépassant le maximum configuré. D’anciennes observations enregistrées peuvent conserver le motif moins précis de dépassement des limites. Velair ne leur attribue pas rétroactivement une cause plus précise.

Les calculs répétés de prévisions futures ne créent pas d’entrées d’apprentissage. La dernière transition suit les mêmes réglages de conservation et la même limite globale d’historique que la chronologie. Désactiver l’historique d’Anticipation ou vider l’historique supprime ces preuves historiques ; cela n’arrête pas l’apprentissage et n’efface pas les échantillons enregistrés. Après un redémarrage, l’activité d’exécution précédente et l’historique ne sont pas restaurés. Sans preuve disponible, Diagnostic n’invente pas de motif pour des compteurs inchangés et ne déduit pas si une chaudière fonctionnait.

<a id="preconditioning-dependency-evidence"></a>
### Preuves de dépendance du préconditionnement

Pour une pièce avec un **Maître de préconditionnement** configuré, consultez les détails de dépendance près des informations de préparation existantes. Ils distinguent l’estimation indépendante de la pièce, la transition et le début sélectionnés du maître, et le début effectif ou le motif empêchant la préparation. Une commande acceptée par Home Assistant prouve l’action de Velair, sans mesurer le relais de la chaudière. L’observation d’apprentissage décrit toujours la température et le temps écoulé propres à la pièce dépendante.

Lorsque des preuves sont disponibles, l’explication distingue la disponibilité dans Home Assistant d’une programmation ou d’un préconditionnement désactivés, d’un Profil en pause, d’une dérogation active, d’un maître non éligible ou d’une transition manquante. La même explication apparaît dans les cartes et Diagnostic. Un équipement indisponible peut encore avoir une prévision calculée si un autre capteur configuré fournit sa température ambiante ; cette prévision ne confirme pas que l’appareil puisse recevoir une commande ou fournir du chauffage ou du refroidissement.

<a id="runtime-history-and-privacy"></a>
## Historique d’exécution et confidentialité

Le diagnostic conserve au maximum 100 événements pertinents dans une chronologie globale unique.
La section **Réglages de l’historique** permet de conserver indépendamment l’activité de
contrôle et de programmation, Room Assist, le préconditionnement, le confort, la transmission
climatique et les événements de disponibilité. Les nouveaux types d’événements Velair non encore
classés sont conservés sous contrôle et programmations plutôt que supprimés silencieusement.
Les ajustements externes et transitions entre contrôle automatique et manuel restent aussi dans
cette catégorie. Leurs entrées affichent uniquement le mode HVAC ou la consigne simple/plage
modifiés, la politique effective de changements externes et toute expiration ou raison de reprise ;
les attributs climatiques arbitraires et identifiants de contexte Home Assistant ne sont pas conservés.
Toutes les catégories sont activées par défaut. Ces choix sont enregistrés localement par le backend ;
désactiver une catégorie supprime immédiatement ses événements déjà conservés.
**Effacer l’historique** supprime tous les événements conservés sans modifier les preuves actuelles
d’état, de transmission ou de configuration.

Le journal d’exécution peut être filtré localement sans modifier ce que Velair conserve.
Choisissez une combinaison quelconque de la source système Velair et des appareils de chauffage ou de climatisation gérés,
ou utilisez l’option générale **Tous les thermostats + Velair** ; vous pouvez ensuite réduire la liste par catégorie et par une
plage de dates Du/Au incluant ses deux bornes. **Effacer les filtres** rétablit toute la chronologie conservée.
Un historique vide est présenté différemment d’une combinaison de filtres sans résultat.
Ces filtres font partie de l’état temporaire de l’interface et ne sont pas enregistrés.

Sur ordinateur, les colonnes du journal peuvent être redimensionnées en faisant glisser leurs séparateurs
ou avec le clavier lorsqu’un séparateur a le focus. Les flèches redimensionnent par petits pas,
Maj+Flèche utilise des pas plus grands, Début/Fin permet d’atteindre les limites autorisées et un double-clic
rétablit la largeur par défaut. Les largeurs sont temporaires et ne sont pas enregistrées. Sur mobile,
l’heure, l’appareil de chauffage ou de climatisation, le type et le message apparaissent sur quatre lignes séparées.
Une ligne peut défiler horizontalement lorsqu’une valeur ne tient pas sans retour à la ligne.

Seuls les choix de catégories sont enregistrés. L’historique existe uniquement en mémoire, est effacé
lorsque l’intégration ou Home Assistant redémarre et n’utilise pas Recorder. Il est alimenté par les
événements Velair existants, les changements de disponibilité et les résultats de transmission ;
il n’ajoute donc aucune interrogation périodique.

**Télécharger le rapport** ouvre des options de confidentialité avant de créer un rapport JSON à joindre à un
signalement de problème. Les identifiants d’entités climatiques gérées sont remplacés par des alias stables par défaut ;
vous pouvez conserver les identifiants bruts pour une inspection locale. Les identifiants de profils,
modes et pauses sont toujours supprimés. Fermer le panneau ou terminer un téléchargement rétablit
le réglage par défaut le plus protecteur. Le téléchargement standard du diagnostic de l’entrée de
configuration Home Assistant utilise toujours l’instantané expurgé.
La section d’exportation est masquée sur les écrans de téléphone, car les téléchargements ne sont pas
fiables dans la webview de l’application compagnon Home Assistant. Ouvrez Velair depuis une tablette
ou un navigateur d’ordinateur lorsque vous devez télécharger un rapport.
Relisez tout rapport avant de le publier. Les identifiants des capteurs associés sont également
remplacés ; la vue locale en direct les conserve car ils sont utiles pour vérifier la configuration.

La vue locale de diagnostic utilise les noms affichés des appareils Home Assistant pour
les filtres, mais son panneau de détails affiche volontairement les identifiants locaux afin que
l’utilisateur puisse vérifier la configuration. Lorsque l’option de confidentialité par défaut est
activée, les rapports téléchargés remplacent aussi bien les identifiants structurés que ceux inclus
dans le texte des erreurs conservées par des alias déterministes tels que `climate_unit_1` et
`associated_entity_1`. Les références répétées gardent le même alias pour préserver les relations
utiles sans exposer les identifiants locaux d’origine. Si vous choisissez explicitement de conserver
les identifiants bruts, ils restent dans le rapport ; ceux des profils, modes et pauses sont toujours
supprimés. Relisez chaque rapport avant de le partager.

Le diagnostic ne possède aucune commande du planificateur, de nouvelle tentative, de restauration ni
de contrôle climatique. Les paramètres continuent de contenir les actions de configuration et de
maintenance ; les détails des capacités et de l’état des appareils appartiennent désormais au diagnostic.

Chaque appareil géré fournit également des informations sur la stabilisation des commandes, disponibles uniquement pendant
l’exécution. Pendant qu’une commande Velair récente se stabilise, le diagnostic liste les champs de
contrôle concernés dans son instantané d’exécution. Si l’appareil n’a pas atteint l’état attendu avant l’échéance prévue,
le prochain instantané à jour marque l’appareil avec l’avertissement `command_settling_mismatch`.
Développez cet avertissement dans le panneau Diagnostic de l’équipement sélectionné pour comparer la valeur attendue de chaque champ concerné à celle signalée par le thermostat. Les températures incluent l’unité de l’équipement, les modes HVAC utilisent leurs libellés habituels et les valeurs manquantes sont explicitement identifiées. Cette vue utilise la comparaison enregistrée, pas la programmation actuelle ni un nouveau relevé. Le rapport téléchargé conserve également le bloc `command_settling`. Ces informations servent au dépannage : le diagnostic ne réessaie pas la commande, ne modifie pas
l’appareil et ne crée pas de réglage manuel. Elles sont effacées par une commande plus récente
pour ce champ ou par un redémarrage.

<a id="automating-diagnostic-health"></a>
## Automatiser le suivi du diagnostic

Velair crée une entité **État du diagnostic** dont les états sont `ok`, `warning` et `error`.
Elle est mise à jour à partir du même instantané backend que cette vue et ne fait aucune interrogation
périodique. Ses attributs compacts comprennent l’état du planificateur, le nombre d’appareils,
le nombre de problèmes et leurs codes stables ; les erreurs brutes et identifiants opérationnels
ne sont pas inclus.

Utilisez un déclencheur d’état si une automatisation n’a besoin que de l’état global actuel.
Utilisez l’événement `diagnostic_issue_changed` si elle doit réagir à la détection ou résolution
d’un problème alors que d’autres restent actifs. Consultez
[Événements d’automatisation](automation-events.fr.md#diagnostic-issue-changed) pour la charge utile
de l’événement et des exemples.

Chaque appareil géré possède aussi un capteur **Diagnostic de transmission de la zone**, désactivé
par défaut. Il expose le même état de transmission limité à l’exécution et la dernière consigne
de contrôle acceptée utilisés par le diagnostic, sans texte d’erreur brut. Une consigne acceptée
signifie que Home Assistant a accepté la séquence de services correspondante de Velair ; cela
n’établit pas l’état de l’appareil ou de la liaison utilisée pour transmettre les commandes. Room Assist peut ensuite ajuster la consigne
envoyée et expose ce contexte via son propre capteur. Les preuves de transmission ne sont jamais
restaurées après un redémarrage et sont effacées par une réinitialisation réussie des données Velair.
Consultez [Capteurs de contrôle et de transmission des zones](zone-sensors.fr.md#zone-delivery-diagnostics)
pour le contrat complet des états et attributs, les étapes d’activation et les exemples d’automatisation.
