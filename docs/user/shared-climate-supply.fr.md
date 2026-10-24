<a id="shared-climate-supply"></a>
# Alimentation climatique partagée
<!-- velair-docs:start -->
Traductions: [Original en anglais](shared-climate-supply.md) · [Español](shared-climate-supply.es.md) · [Français](shared-climate-supply.fr.md) · [Deutsch](shared-climate-supply.de.md) · [Italiano](shared-climate-supply.it.md) · [Nederlands](shared-climate-supply.nl.md) · [Polski](shared-climate-supply.pl.md) · [Português (Brasil)](shared-climate-supply.pt-br.md) · [Português (Portugal)](shared-climate-supply.pt-pt.md) · [Русский](shared-climate-supply.ru.md) · [État des traductions](../translation-status.md)

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

L’alimentation climatique partagée estime si les thermostats associés ont besoin de chauffage ou de refroidissement et commande un `switch` commun, par exemple un relais de demande de chaudière. Elle est facultative et désactivée tant que vous n’activez pas explicitement une alimentation dans **Contrôle de l’alimentation**. L’estimation ne confirme ni l’ouverture des vannes, ni le débit d’eau, ni le chauffage physique.

<a id="configure-a-supply"></a>
## Configurer une alimentation

Ouvrez **Contrôle de l’alimentation** dans le panneau Velair et choisissez **Ajouter une alimentation**. Sélectionnez une entrée pour modifier ses détails à côté de la liste, ou dessous sur un écran étroit. Si aucune alimentation n’existe, l’invite propose **Ajouter une alimentation**. La liste **Alimentations partagées** contient des circuits de chauffage ou de refroidissement commandés ; elle est distincte du regroupement général des thermostats.

Renseignez le **Nom de l’alimentation**, choisissez un interrupteur existant, sa **Fonction de l’alimentation** (Chauffage ou Refroidissement), puis les thermostats gérés desservis par le circuit. Chaque interrupteur ne peut appartenir qu’à une alimentation. Les interrupteurs de commande propres à Velair ne peuvent pas servir de sorties.

La fonction décrit ce que fournit l’équipement partagé. Elle ne modifie pas les modes HVAC des thermostats : une source de chauffage répond uniquement à la demande de chaleur, une source de refroidissement uniquement à celle de froid.

Chaque entrée indique la fonction, le nombre de thermostats, l’interrupteur choisi et l’état enregistré de la commande automatique. Modifiez le nom, l’interrupteur et la fonction directement dans le résumé supérieur, à côté de la commande d’activation et de l’icône d’enregistrement. Chaque réglage n’apparaît qu’une fois ; il n’y a pas de section séparée de réglages de l’alimentation. **État de l’interrupteur** correspond à l’état observé de l’entité ; le résumé de commande dans la liste décrit les réglages enregistrés. Le bouton d’activation modifie un brouillon jusqu’à l’enregistrement : il peut donc être activé sans enregistrement alors que l’état enregistré indique Désactivé. La demande n’est pas évaluée lorsque la commande est désactivée ou suspendue. Les boutons d’information expliquent ces distinctions, le contrôle exclusif, la fonction et la temporisation sans développer le formulaire principal.

Utilisez **Supprimer l’alimentation** (la corbeille) dans son entrée ; la suppression reste un brouillon jusqu’à l’enregistrement des alimentations. Développez **Options de temporisation**, **Demande et hystérésis** ou **Thermostats associés** pour modifier cette partie. L’aide à côté du titre ouvre un résumé et ce guide. Passer d’une alimentation à une autre conserve les modifications non enregistrées. **Enregistrer les alimentations**, l’icône dans l’en-tête du détail, applique toute la liste modifiée, suppressions comprises. Elle reste disponible dans l’état vide après suppression de la dernière alimentation. Comme dans Modèles et Préréglages, aucun bouton distinct ne permet d’abandonner les modifications. Quitter l’onglet avec des modifications demande si vous souhaitez les abandonner ; revenir restaure ensuite la liste enregistrée. La navigation attend la fin d’un enregistrement ou d’une demande de reprise.

Rétablir toutes les valeurs enregistrées efface le brouillon : les mises à jour de configuration en direct et **Reprendre la commande automatique** redeviennent disponibles. Les modifications enregistrées atteignent les autres panneaux connectés même si la demande estimée ne change pas.

Choisissez le comportement d’hystérésis et ses valeurs. Chaque thermostat associé hérite du comportement ; ses valeurs numériques peuvent être remplacées sans configurer un autre comportement. Dans chaque ligne sélectionnée, **Hystérésis du thermostat** permet de choisir **Utiliser l’hystérésis de l’alimentation** ou **Valeurs d’hystérésis personnalisées**. Le sélecteur est aligné avec la case et le nom du thermostat ; les exceptions et limites effectives apparaissent dessous. En mode Personnalisé, les deux valeurs peuvent être héritées indépendamment. Ce sont des différences de température dans l’unité actuelle du panneau ; un changement d’unité les convertit sans les traiter comme des températures absolues.

Les champs numériques signalent les valeurs invalides pendant la saisie. L’hystérésis doit être finie et non négative ; une exception vide hérite de la valeur de l’alimentation. L’enregistrement est indisponible tant qu’une alimentation contient des nombres invalides ; la liste identifie celle à corriger.

Enregistrez explicitement pour appliquer la configuration. Activer une alimentation donne à Velair le contrôle automatique exclusif de son interrupteur. Évitez qu’une autre automatisation commande continuellement la même sortie.

Les échecs d’enregistrement apparaissent dans l’en-tête du détail, à côté de l’action d’enregistrement. Les erreurs de configuration identifient l’alimentation, le champ et la correction ; Velair sélectionne l’alimentation, ouvre la section concernée, marque le champ et lui donne le focus. Les erreurs Home Assistant ou de connexion conservent leur explication d’origine sans être attribuées à un champ sans rapport. Les brouillons restent disponibles pour corriger et réessayer, même après suppression de la dernière alimentation.

<a id="how-estimated-demand-works"></a>
## Fonctionnement de la demande estimée

Les nouvelles alimentations créées dans le panneau utilisent **Arrêt à la cible**, une distance de démarrage de **0.3 °C** ou **0.54 °F** et une distance d’arrêt nulle. Ces différences sont équivalentes ; les exceptions héritent des valeurs de l’alimentation sauf si vous choisissez des valeurs personnalisées. Les exemples suivants utilisent d’autres distances pour illustrer chaque comportement.

Pour les thermostats ordinaires, l’hystérésis définit un seuil de démarrage et un seuil d’arrêt. Entre les deux, la demande précédente est conservée. Toutes les comparaisons incluent le seuil lui-même. Ces exemples utilisent une cible de 22 °C :

| Comportement | Valeurs | Chauffage : démarrage / arrêt | Refroidissement : démarrage / arrêt |
| --- | --- | --- | --- |
| Arrêt à la cible (par défaut) | Démarrage 0.5 °C | ≤21.5 / ≥22 °C | ≥22.5 / ≤22 °C |
| Symétrique | Distance 0.5 °C | ≤21.5 / ≥22.5 °C | ≥22.5 / ≤21.5 °C |
| Personnalisé | Démarrage 0.5 °C ; arrêt 0.2 °C | ≤21.5 / ≥22.2 °C | ≥22.5 / ≤21.8 °C |

Le diagramme de **Demande et hystérésis** évolue lorsque vous modifiez la fonction, le comportement ou les distances. Il utilise une cible d’exemple identifiée, pas la cible actuelle d’un thermostat. Les températures figurent à côté des repères de démarrage et d’arrêt ; des cotations relient chaque distance à la cible d’exemple. L’axe identifié de température ambiante augmente vers la droite. La note inférieure explique qu’entre démarrage et arrêt une demande existante continue ; sinon, aucune ne commence. Entre les limites, la demande précédente est conservée. Le chauffage demande l’alimentation du côté froid, le refroidissement du côté chaud. Le diagramme explique la demande estimée sans simuler l’équipement ni les délais. Sa cible d’exemple est 22 °C ou 72 °F. Si un nombre est vide, incomplet ou invalide pendant la saisie, un diagramme gris sans températures conserve la hauteur de l’aperçu jusqu’à ce qu’il redevienne valide.

La distance de démarrage s’éloigne de la cible jusqu’au besoin de chaleur ou de froid. La distance d’arrêt dépasse la cible dans le sens du chauffage ou du refroidissement. Les deux acceptent zéro ; avec les deux à zéro, la cible exacte signifie aucune demande. Dans la bande après redémarrage, changement de cible ou d’hystérésis, aucune nouvelle demande n’est supposée. Changer de comportement conserve la distance d’arrêt personnalisée saisie, qui s’applique de nouveau en revenant à Personnalisé.

**Arrêt à la cible** est le point de départ recommandé pour les thermostats ordinaires. Symétrique et Personnalisé sont des choix avancés : le thermostat peut fermer sa vanne ou arrêter son compresseur à la cible avant que la pièce n’atteigne le seuil d’arrêt au-delà de celle-ci. La source partagée pourrait rester demandée. Ces réglages estiment la demande ; ils ne changent pas les limites propres au thermostat et ne forcent pas le débit de chaleur.

Gardez séparés les seuils des alimentations en chauffage et en refroidissement partageant un thermostat à plage. De grandes distances d’arrêt peuvent maintenir une demande de chauffage alors que le refroidissement commence, ou inversement. Les alimentations agrègent la demande indépendamment ; elles ne fournissent aucun interverrouillage entre sorties opposées. Utilisez des interverrouillages d’équipement appropriés si nécessaire.

La source est demandée dès qu’au moins un thermostat associé présente une demande valide. Un thermostat éteint ou une direction HVAC incompatible ne demande aucune alimentation. Les températures absentes ou indisponibles produisent une demande inconnue ; elles ne conservent pas indéfiniment une ancienne demande. Les autres pièces valides peuvent toujours demander l’alimentation. Sans pièce ayant une demande valide, l’arrêt est demandé après le délai configuré.

Les cibles actuelles sont utilisées, y compris les modifications manuelles et les cibles appliquées par l’anticipation adaptative du confort ou Retour prévu. Mettre une programmation en pause ne désactive pas la commande d’alimentation. Une plage valide utilise sa limite inférieure pour chauffer et sa limite supérieure pour refroidir ; une cible ambiguë ne peut pas demander l’alimentation.

<a id="room-assist"></a>
## Room Assist

Un panneau d’information bleu en tête de **Demande et hystérésis**, avant le sélecteur, explique la priorité de Room Assist et quand l’hystérésis de l’alimentation s’applique.

Lorsque Room Assist contrôle la cible active d’une pièce, l’alimentation suit son intention de commande confirmée. En chauffage fixe, sa phase `towards_upper` demande de la chaleur ; en refroidissement fixe, `towards_lower` demande du froid. Ses limites de commutation restent prioritaires : l’hystérésis de l’alimentation et l’exception de la pièce ne s’appliquent pas une seconde fois. Le contrôle de plage native suit sa direction confirmée. Une cible assistée invalide ou en attente reste inconnue jusqu’à une confirmation valide.

La cible corrigée du thermostat n’est pas comparée à un capteur externe de la pièce. Room Assist peut cesser de demander l’alimentation alors que le thermostat affiche encore la même cible ajustée.

<a id="timing-and-manual-control"></a>
## Temporisation et commande manuelle

**Durée minimale d’arrêt** retarde un nouveau démarrage après l’arrêt de l’interrupteur. **Délai d’arrêt** exige une période continue sans demande avant l’arrêt ; le retour de la demande annule ce délai. Les deux acceptent des secondes entières de 0 à 86 400 et valent zéro par défaut. Aucune durée minimale de marche forcée ne maintient la source active alors que les vannes pourraient être fermées.

Renommer une alimentation ou modifier une distance d’arrêt actuellement inutilisée ne redémarre ni son cycle de demande ni son délai d’arrêt. Réactiver une alimentation utilise la dernière transition d’arrêt signalée par l’interrupteur pour respecter la durée minimale d’arrêt.

Éteindre hors de Velair l’interrupteur d’une alimentation activée suspend la commande automatique. Utilisez **Reprendre la commande automatique** pour la rétablir. La suspension est enregistrée et persiste après redémarrage. Enregistrer d’autres modifications ne la supprime pas. Désactiver ou supprimer une alimentation demande l’arrêt de sa sortie précédemment contrôlée.

Allumer l’interrupteur hors de Velair ne remplace pas la commande automatique. Si tous les thermostats associés ne signalent aucune demande, Velair l’éteint après le délai configuré. Si Home Assistant confirme que cette transition d’arrêt appartient à la correction de Velair, celui-ci crée une notification persistante et une entrée Activité associée à l’interrupteur. Le message nomme l’alimentation, explique qu’une activation externe a été corrigée parce que la commande automatique n’avait aucune demande estimée de chauffage ou de refroidissement et fournit un lien vers **Contrôle de l’alimentation** pour vérifier ou désactiver la commande. Il ne suppose pas qu’une personne a provoqué le changement.

Les corrections répétées pour la même alimentation et le même interrupteur sont signalées au maximum une fois toutes les 15 minutes pendant l’exécution actuelle de l’intégration. Réaffecter l’interrupteur ouvre une nouvelle période. Chaque alimentation utilise une seule notification : un avis ultérieur autorisé remplace le précédent. Les échecs de transmission ou l’acceptation d’un service sans transition d’arrêt correspondante ne produisent pas d’avis de réussite. Une demande inconnue n’est pas présentée comme une absence confirmée de demande. Une intégration d’interrupteur qui ne conserve pas le contexte de commande ne permet pas l’attribution nécessaire à cet avis. Ces règles ne modifient pas la commande et ne nécessitent aucun sondage. Les échecs des notifications ou d’Activité n’interrompent pas la commande ; Activité nécessite l’intégration activité/logbook de Home Assistant.

Un arrêt manuel plus récent prime sur un enregistrement ou une reprise déjà en cours. Reprenez explicitement de nouveau si vous souhaitez la commande automatique après cet arrêt. La suspension manuelle reste également enregistrée pendant une migration des unités et un redémarrage.

Un interrupteur indisponible ou une commande échouée apparaît dans l’alimentation. Les tentatives de transmission sont limitées et ne se répètent pas à chaque mise à jour d’un capteur. L’acceptation d’une commande par Home Assistant ne prouve pas le fonctionnement physique de l’équipement.

Les alimentations importées sont désactivées et suspendues. Vérifiez la sortie et les pièces, activez l’alimentation, enregistrez puis reprenez explicitement la commande automatique lorsque cela convient.

<a id="preconditioning-master-and-performance"></a>
## Maître de préconditionnement et performances

Le [Maître de préconditionnement](adaptive-preconditioning.fr.md#preconditioning-master) contraint le début de préparation des pièces dépendantes. L’alimentation partagée suit au contraire la demande des pièces. Une chaudière commandée par des TRV ne nécessite pas automatiquement un maître ; Velair ne crée pas de dépendances entre ces réglages.

Le contrôleur écoute les entités configurées et utilise un seul traitement regroupant les mises à jour et au maximum une minuterie par alimentation. Il ne sonde pas, n’enregistre pas d’échantillons de température et ne nécessite pas de navigateur ouvert. Les changements courants de température sans changement significatif de l’état de commande ne diffusent pas de nouvel instantané complet du panneau.
