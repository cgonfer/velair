<a id="environmental-comfort"></a>
# Confort environnemental
<!-- velair-docs:start -->
Traductions: [Original en anglais](comfort.md) · [Español](comfort.es.md) · [Français](comfort.fr.md) · [Deutsch](comfort.de.md) · [Italiano](comfort.it.md) · [Nederlands](comfort.nl.md) · [Polski](comfort.pl.md) · [Português (Brasil)](comfort.pt-br.md) · [Português (Portugal)](comfort.pt-pt.md) · [Русский](comfort.ru.md) · [État des traductions](../translation-status.md)

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

La plage de température confortable par défaut est `20–24 °C`. Si Home Assistant utilise
les degrés Fahrenheit, elle est de `68–75 °F`, avec des limites arrondies sans décimales.

Les seuils de confort utilisent l’unité de température configurée dans Home Assistant et sont
migrés ou importés avec les autres données thermiques stockées par Velair. Un capteur de température
qui déclare l’autre unité est converti avant comparaison de sa mesure avec les seuils de confort
de l’appareil de chauffage ou de climatisation géré.

Le confort environnemental fournit, pour chaque appareil géré, une description claire des conditions de la pièce,
plutôt qu’un niveau d’avertissement générique.

Il surveille les mesures locales de température, d’humidité et de CO2 disponibles. Il ne modifie
pas les programmations et ne contrôle pas les appareils automatiquement. Velair expose l’évaluation
dans le panneau, les cartes Lovelace et les événements Home Assistant, afin que les automatisations
puissent décider de la suite.

<a id="sources"></a>
## Sources

La température utilise la première source disponible dans cet ordre :

1. le capteur de température sélectionné dans l’onglet Confort ;
2. le capteur Room Assist configuré pour cet appareil ;
3. l’attribut `current_temperature` de l’entité climatique.

L’humidité utilise :

1. le capteur d’humidité sélectionné dans l’onglet Confort ;
2. l’attribut mesuré `current_humidity` de l’entité climatique, lorsqu’il est disponible. L’attribut `humidity` est une consigne, pas une mesure.

L’option par défaut `Utiliser la source automatique` conserve ce comportement automatique.
Sélectionnez `Ne pas surveiller l’humidité` si l’humidité ne doit pas influencer les conditions
environnementales ou la qualité des données de cet appareil. Le capteur enregistré est conservé,
mais Velair ne le lit pas et ne l’écoute pas lorsque la surveillance de l’humidité est désactivée.

Le CO2 n’est surveillé que lorsqu’un capteur de CO2 est sélectionné.

L’identifiant d’entité effectif apparaît sous chaque sélecteur. Les mesures facultatives sans
source ne sont pas considérées comme des défaillances.

<a id="comfort-models"></a>
## Modèles de confort

Velair propose trois façons de décrire la zone de température et d’humidité relative utile pour
une pièce. Il s’agit d’une cible configurée par l’utilisateur, pas d’une définition universelle
ou médicale du confort.

- **Simple** est le modèle par défaut. Une plage de température et une plage d’humidité forment
  la zone cible rectangulaire habituelle. Les configurations existantes conservent ce comportement.
- **Plage psychrométrique guidée** utilise une plage d’humidité comme référence au milieu de la
  plage de température configurée. Velair suit la relation physique entre température et humidité
  relative pour adapter automatiquement cette plage. Le graphique montre la zone cible courbe
  résultante plutôt qu’un rectangle. C’est un conseil local pratique, pas une norme complète de
  confort physiologique.
- **Plage personnalisée selon la température** conserve la même plage de température mais permet
  à l’humidité d’utiliser des minima et maxima différents à ses extrémités froide et chaude.
  Velair relie progressivement ces deux plages d’humidité ; la zone cible devient donc une forme
  inclinée à quatre côtés plutôt qu’un rectangle.

Par exemple, une pièce configurée pour `20–24 °C` peut accepter `40–60%` à `20 °C` et `35–50%`
à `24 °C`. À `22 °C`, Velair évalue l’humidité au point médian : `37.5–55%`. En dessous ou au-dessus
de l’intervalle de température configuré, il utilise l’extrémité la plus proche au lieu d’extrapoler
au-delà des valeurs de l’utilisateur.

La plage d’humidité effective actuelle apparaît sous la carte. La même plage calculée par le backend
pilote la condition affichée, le résumé de plage, l’entité Conditions ambiantes, les événements,
le diagnostic et les conseils extérieurs facultatifs ; les clients ne calculent pas une seconde
interprétation. Si la température actuelle est manquante ou périmée, Velair peut toujours afficher
une mesure d’humidité à jour, mais ne la classe pas et ne produit pas de conseil d’humidité tant que
la plage effective ne peut pas être calculée.

Le mode Guidé nécessite une source d’humidité identifiable par Velair, soit dans l’appareil géré,
soit dans un capteur Home Assistant sélectionné. L’option reste indisponible tant qu’une source
n’est pas identifiée. Si cette source devient temporairement indisponible, Velair conserve le
modèle et les réglages sélectionnés, et attend des données actuelles au lieu de changer de modèle.

Les deux plages d’humidité personnalisées des extrémités peuvent augmenter, diminuer ou rester
égales lorsque la température change. Velair n’impose pas de direction, car les bâtiments et les
occupants diffèrent. Guidé est le choix compact lorsqu’un même pourcentage d’humidité relative ne
doit pas être traité de manière identique à toutes les températures. Utilisez Personnalisé uniquement
si le comportement mesuré de la pièce justifie clairement le contrôle des deux extrémités.

Avant la personnalisation de ces plages, modifier la plage d’humidité Simple maintient les deux
extrémités alignées sur elle. Lorsqu’une plage tenant compte de la température a été personnalisée,
Velair la conserve lors des changements de modèle afin de ne pas perdre une configuration alternative.

<a id="additional-environmental-information"></a>
## Informations environnementales supplémentaires

La configuration Confort peut ajouter trois mesures facultatives aux informations dont Velair
dispose déjà pour un appareil géré :

| Mesure | Ce qu’elle apporte dans Velair |
| --- | --- |
| **Point de rosée** | Une indication compacte de la proximité de l’air avec les conditions de condensation. Il ne démontre pas que de la condensation se produira, car Velair ne connaît pas la température des murs, fenêtres ou autres surfaces. |
| **Humidité absolue** | La masse de vapeur d’eau par mètre cube d’air, affichée en `g/m³`. Contrairement à l’humidité relative, elle n’est pas exprimée en pourcentage du niveau de saturation de l’air. Velair ne lui applique pas de plage universelle bonne/mauvaise. |
| **Humidex** | Une valeur supplémentaire de chaleur ressentie dérivée de la température et de l’humidité. Velair affiche cette valeur mais ne transforme pas ses catégories publiées en recommandations et ne l’utilise pas comme score complet de confort intérieur. |

Activez uniquement les mesures utiles à votre tableau de bord ou à vos automatisations. Elles
ne sont pas nécessaires aux conditions de confort normales et sont toutes désactivées par défaut.

La vue détaillée de l’appareil sépare les informations actuelles des commandes de configuration.
Les mesures activées apparaissent dans un groupe compact adaptatif directement sous la carte
température/humidité et l’échelle de CO2. Chaque élément contient sa valeur actuelle ou son état
de disponibilité ainsi qu’une aide informative accessible ; il ne contient jamais d’interrupteur
ni de sélecteur de source. Les mesures désactivées ne laissent ni carte vide ni emplacement vide.

Toutes les commandes de configuration sont regroupées dans le panneau **Configuration du confort**, fermé
par défaut pour garder l’évaluation actuelle au premier plan. Ses sections compactes séparent
les sources de données, le modèle de confort, les préférences propres au modèle, les recommandations
et les informations environnementales supplémentaires. Les commandes des mesures dérivées ne
contiennent que leur interrupteur d’activation et leur sélecteur de source, sans dupliquer la
mesure actuelle. Le panneau de configuration reste disponible lorsque la surveillance du confort
est désactivée, afin de préparer un appareil avant activation. Ouvrir ou fermer ce panneau est
un choix local de l’interface, non enregistré comme configuration.

Chaque mesure est désactivée par défaut et possède un sélecteur de source. Sa première option est
**Calculé par Velair** ; les autres sont des capteurs Home Assistant compatibles, afin qu’une
mesure externe ne nécessite pas un second sélecteur d’entité :

- **Calculé par Velair** utilise les mesures effectives de température et d’humidité du confort
  déjà sélectionnées pour cet appareil. Si l’humidité n’est pas surveillée ou si l’une des entrées
  est indisponible, la mesure calculée est signalée comme manquante.
- **Entité Home Assistant** lit une entité `sensor.*` existante. Elle peut provenir de Thermal
  Comfort, d’un modèle ou d’une autre intégration ; Thermal Comfort n’est ni requis ni détecté
  de manière particulière.

Un capteur externe de point de rosée doit publier `°C` ou `°F`. Velair l’affiche dans l’unité de
température de l’appareil géré. Un capteur d’humidité absolue doit publier `g/m³` ou `mg/m³` ;
Velair affiche `g/m³`. Un capteur Humidex peut publier la représentation courante `°C` ou `°F`
utilisée par les entités de classe température, ou une valeur sans unité. Velair le normalise
vers la valeur Humidex canonique sans unité, y compris dans les installations en Fahrenheit.
Velair normalise les mesures valides et signale les sources manquantes, périmées ou invalides
sans changer les conditions environnementales ou l’évaluation de la qualité des données existante.
Une mesure externe activée peut être enregistrée sans entité encore sélectionnée ; cette configuration
incomplète reste valide, est signalée comme manquante et est conservée lors de l’export/import.
Les états Home Assistant `unknown` et `unavailable` sont manquants, tandis que les valeurs non
numériques, unités incompatibles et humidités absolues négatives sont invalides.

Ces mesures servent uniquement à informer. Elles ne modifient jamais une programmation, un mode HVAC,
une consigne, un ajustement Room Assist ou une décision de préconditionnement. En particulier,
l’Humidex complète les mesures réelles de température et d’humidité au lieu de les remplacer,
évitant de compter deux fois l’humidité.

<a id="comfort-insights"></a>
## Informations contextuelles sur le confort

Velair conserve les conditions de température/humidité configurées comme résumé principal et
regroupe des cartes de contexte compactes au-dessus des mesures. Elles expliquent les franchissements
de seuils CO2, une hausse significative de l’Humidex et toute opportunité ou compromis d’aération
actuel, sans répéter la condition ni remplacer la carte ou l’échelle de CO2.

Les formulations restent prudentes. L’Humidex n’apparaît comme information contextuelle que si
la chaleur ressentie dépasse la température de l’air d’au moins 1 °C. Un CO2 élevé ou mauvais
peut également ajouter une information. Le point de rosée et l’humidité absolue restent des mesures
utiles plutôt que des messages permanents : leur bouton d’information explique respectivement
le seuil potentiel de condensation en surface et la quantité de vapeur d’eau.
L’aide est disponible au survol du pointeur, au focus clavier ou par toucher sur écran tactile.
Les mesures manquantes, périmées et invalides sont ignorées. Les données extérieures ne changent
pas les conditions intérieures ni le contrôle climatique.

Les valeurs actuelles apparaissent dans la ligne détaillée de l’appareil de l’onglet **Confort**.
La vue Confort Lovelace utilise la même présentation. Quand le confort est activé dans une carte
Velair pour un seul appareil, le résumé Confort détaillé inclut chaque mesure dérivée activée et
actuelle. L’éditeur de carte peut aussi inclure ces mesures dans la ligne Confort de l’état actuel
replié lorsqu’un tableau de bord nécessite des informations plus denses.
Les mesures manquantes, périmées et invalides restent visibles dans la vue Confort avec leur
état, au lieu d’afficher une valeur périmée ou inventée. L’Humidex est affiché à côté de la température
ambiante avec une comparaison directionnelle ; en Fahrenheit, seule la différence est mise à
l’échelle et n’est donc jamais décalée de 32.
Les écarts apparaissent aussi dans le message contextuel Humidex, avec l’unité de la zone et une
décimale. L’Humidex lui-même est un indice de chaleur apparente sans unité, référencé au Celsius :
ce n’est pas une température physique et Velair n’ajoute pas d’unité à sa valeur.

Quand l’Humidex est actuel, son panneau affiche aussi une échelle de comparaison compacte. Les
deux marqueurs identifient la température de l’air ambiant et l’Humidex, tandis que la bande
mise en évidence représente la plage de température configurée pour cet appareil. L’état indique
si l’Humidex est en dessous, dans ou au-dessus de cette plage ; il n’affirme pas que la pièce est
confortable ou dangereuse. L’échelle s’étend de 5 °C sous et au-dessus de la plage configurée afin
que les écarts proches restent lisibles. En Fahrenheit, les libellés absolus de l’échelle sont
convertis normalement tandis que la différence est uniquement multipliée par `9 / 5` ; la valeur
Humidex reste sans unité. Les données manquantes ou invalides n’affichent aucune position inventée.
Le point de rosée est décrit de manière neutre comme supérieur ou inférieur à l’air ambiant.
L’humidité absolue reste une mesure neutre en `g/m³`. Leurs définitions restent dans les aides accessibles par les
boutons d’information pour garder les panneaux compacts.

Le résumé principal commence toujours par les conditions environnementales physiques utilisant
les mesures de température et d’humidité configurées. Quand l’Humidex est activé et que sa position
dans la plage de température ambiante diffère, une seconde étiquette **Humidex** indique si la
chaleur ressentie est en dessous, dans ou au-dessus de la plage de température configurée. Cela
préserve la condition physique au lieu de la remplacer par une interprétation dérivée. Le panneau
Humidex explique la différence mesurée sans qualifier la pièce de chaude, froide ou confortable.
Les données dérivées manquantes ou invalides ne changent jamais la condition physique.

La valeur des Conditions ambiantes utilisée par les automatisations existantes décrite ci-dessous ne change pas.
Les automatisations existantes peuvent continuer à l’utiliser ; l’Humidex et le résumé de plage
sont un contexte purement informatif supplémentaire et ne contrôlent jamais l’appareil de chauffage ou de climatisation.

<a id="indoor-vs-outdoor"></a>
## Intérieur et extérieur

La comparaison facultative avec l’extérieur ajoute du contexte sans changer les conditions de confort
intérieures. Activez **Indoor vs outdoor** (comparaison intérieur/extérieur) dans le panneau replié **Configuration du confort**,
sélectionnez un capteur explicite de température extérieure et, éventuellement, un capteur
extérieur d’humidité. Désactiver la comparaison conserve ces choix de capteurs pour la réactiver
sans reconfiguration.

Le panneau d’état en direct reste séparé du graphique. Il montre les températures intérieure et extérieure
avec leur différence, les humidités absolues intérieure et extérieure et l’humidité relative qu’aurait
l’air extérieur après avoir atteint la température intérieure actuelle. Les deux zones sont
symétriques sur les écrans larges et superposées sur mobile.

Les deux valeurs d’humidité absolue viennent directement du backend. Si un backend plus ancien ne
fournit pas la valeur intérieure, l’interface la présente comme indisponible plutôt que de reconstruire
une mesure physique à partir de différences arrondies.

Velair peut afficher une opportunité ou un compromis d’aération prudent, fourni par le backend,
dans la zone commune d’informations contextuelles au-dessus des mesures. Une opportunité basée
uniquement sur la température indique explicitement que l’effet sur l’humidité est indisponible.
Les mesures manquantes, périmées, invalides ou non surveillées apparaissent sous forme d’états,
pas de valeurs réutilisées ni de fausses comparaisons.

Velair crée aussi un capteur à états énumérés **Opportunité d’aération** par appareil géré. Il conserve le
résultat actuel accessible aux tableaux de bord et automatisations après redémarrage sans modifier
l’état compatible des Conditions ambiantes.
Consultez [Opportunité d’aération](zone-sensors.fr.md#ventilation-opportunity).

**Ventilation guidance** (conseils d’aération), dans le même panneau de configuration, permet à chaque appareil de choisir
la différence utile minimale avant que Velair affiche ce contexte :

| Réglage | Valeur par défaut | Ce qu’il filtre |
| --- | --- | --- |
| Différence de température | `1 °C` / `1.8 °F` | Petites différences de température entre intérieur et extérieur. |
| Différence d’humidité ajustée | `5` points de pourcentage | Petits changements projetés d’humidité relative après que l’air extérieur atteint la température intérieure. |
| Différence de teneur en eau de l’air | `1 g/m³` | Petites différences d’humidité absolue qui pourraient autrement sembler utiles à cause de la température seule. |

Les commandes d’humidité apparaissent après sélection d’un capteur d’humidité extérieur.
Leurs valeurs sont conservées si ce capteur ou la comparaison est ensuite désactivé.
Des valeurs plus faibles rendent les conseils plus sensibles ; des valeurs plus élevées exigent
une différence plus nette. Ces marges ne remplacent pas les plages de confort configurées : l’air
extérieur doit toujours rapprocher la pièce de la plage concernée.

Cette fonction est visuelle et événementielle. Elle n’ouvre ni ne ferme les fenêtres et ne modifie
pas la consigne, le mode, la programmation, la pause ou le forçage d’un appareil. Velair utilise
uniquement les entités `sensor.*` sélectionnées, sans repli sur les données météo.

Velair ne crée pas trois entités de capteur proxy supplémentaires. Les mesures activées sont
accessibles dans l’attribut `derived_metrics` du capteur existant de zone **Conditions ambiantes**,
dans l’API des programmations, le diagnostic et l’événement `comfort_assessment_changed`. Cela conserve
une seule source de référence tout en permettant aux tableaux de bord et automatisations de consommer
les données. Consultez [Conditions ambiantes](zone-sensors.fr.md#environmental-condition) pour
les états complets, les attributs, les modèles défensifs et les conseils pour choisir entre l’entité
et l’événement dans une automatisation.

<a id="environmental-conditions"></a>
## Conditions ambiantes

La température et l’humidité sont classées selon les plages configurées et combinées en une
condition environnementale compatible unique :

| Température | Humidité | Condition |
| --- | --- | --- |
| Sous la plage | Sous la plage | `Froid et sec` |
| Sous la plage | Dans la plage | `Froid` |
| Sous la plage | Au-dessus de la plage | `Froid et humide` |
| Dans la plage | Sous la plage | `Air sec` |
| Dans la plage | Dans la plage | `Confortable` |
| Dans la plage | Au-dessus de la plage | `Humide` |
| Au-dessus de la plage | Sous la plage | `Chaud et sec` |
| Au-dessus de la plage | Dans la plage | `Chaud` |
| Au-dessus de la plage | Au-dessus de la plage | `Chaud et humide` |

Lorsqu’une seule mesure utile est disponible, Velair indique ce qu’il peut établir sans affirmer que toutes les conditions de confort sont réunies :

- `Température dans la plage` ;
- `Humidité dans la plage` ;
- `Froid`, `Chaud`, `Air sec` ou `Humide`.

Si aucune mesure environnementale utile n’existe, la condition est affichée comme `Aucune mesure`.
Quand toutes les sources surveillées sont périmées, elle est affichée comme `Mesures obsolètes`.

<a id="air-quality"></a>
## Qualité de l’air

Le CO2 reste séparé de la température et de l’humidité, car il décrit la qualité de l’air plutôt
que le confort thermique :

- `Bon air` : sous le seuil d’attention ;
- `CO2 élevé` : au seuil d’attention ou au-dessus ;
- `Mauvaise qualité de l’air` : au seuil de mauvaise qualité ou au-dessus ;
- `CO2 indisponible` : une source CO2 configurée ne peut pas être lue actuellement.

Une pièce peut donc afficher, par exemple, `Chaud et humide` avec `CO2 élevé`.

<a id="data-quality"></a>
## Qualité des données

Velair expose une valeur de qualité des données :

- `complete` : chaque mesure surveillée est actuelle et confirmée par une mise à jour récente de l’état dans Home Assistant ;
- `unverified` : chaque mesure surveillée est utilisable, mais au moins une n’a pas d’horodatage de mise à jour vérifiable ;
- `partial` : une évaluation est disponible, mais au moins une mesure surveillée manque ou est périmée ;
- `stale` : aucune mesure actuelle n’existe et toutes les sources surveillées sont périmées ;
- `unavailable` : aucune mesure actuelle n’est utilisable pour une autre raison.

Le panneau regroupe les mesures utilisables dont la fraîcheur ne peut être vérifiée dans la section
**Fraîcheur des données** de la zone, au lieu de répéter la même note à côté de chaque mesure dérivée.
Une carte Confort Lovelace qui masque la configuration montre un résumé au-dessus des mesures ;
le diagnostic expose aussi le contexte de fraîcheur. La liste repliée des zones omet cet état
courant pour rester lisible. C’est une configuration automatique valide avec l’appareil comme source,
pas une erreur de configuration. Les mesures manquantes ou périmées affichent toujours un
avertissement dans la liste des zones.

<a id="visual-status"></a>
## État visuel

La ligne repliée de l’appareil affiche :

- les conditions environnementales ;
- une étiquette Humidex distincte uniquement si la température actuelle et l’Humidex occupent
  différentes parties de la plage configurée ;
- des étiquettes facultatives de mesures dérivées pour l’Humidex, le point de rosée et l’humidité
  absolue lorsque l’éditeur de carte pour un seul appareil active des mesures repliées supplémentaires ;
- la qualité de l’air si le CO2 est surveillé ;
- une icône d’avertissement si les mesures sont incomplètes ;
- l’interrupteur marche/arrêt du confort.

L’état détaillé en direct utilise :

- les mêmes conditions environnementales physiques comme titre principal ;
- une carte température/humidité si les deux mesures sont actuelles ;
- une seule échelle horizontale si seule la température ou l’humidité est actuelle ;
- une échelle CO2 séparée si le CO2 est surveillé et actuel.

La carte température/humidité utilise neuf régions discrètes pour les conditions froides, chaudes,
sèches, humides et combinées. Sa cible mise en évidence suit toujours le modèle sélectionné :
un rectangle pour Simple, une courbe calculée par le backend pour Guidé et le polygone configuré
pour Personnalisé. Un petit marqueur montre la position actuelle et son libellé contient les deux mesures.

Sur les échelles à une seule mesure, la partie verte centrale est la plage de confort configurée.
Ses libellés minimum et maximum sont alignés sur le début et la fin de cette section ; les sections
extérieures donnent du contexte pour les mesures sous ou au-dessus de la plage.

<a id="lovelace"></a>
## Lovelace

La vue Confort est disponible comme carte Lovelace :

```yaml
type: custom:velair-card
view: comfort
```

La carte peut être limitée aux appareils gérés sélectionnés :

```yaml
type: custom:velair-card
view: comfort
entities:
  - climate.living_room
  - climate.bedroom
```

Elle peut également masquer des sections locales de l’interface lorsqu’un tableau de bord doit
se concentrer uniquement sur les mesures qui vous intéressent :

```yaml
type: custom:velair-card
view: comfort
show_comfort_configuration: false
show_comfort_temperature: true
show_comfort_humidity: false
show_comfort_co2: true
```

Les options `show_comfort_*` omises valent `true` par défaut. Lorsque
`show_comfort_configuration` vaut `false`, la carte masque tout le panneau de configuration mais
conserve les mesures dérivées activées dans l’évaluation visuelle.

Les options de visibilité température, humidité et CO2 n’affectent que les graphiques affichés
dans cette carte Lovelace. Elles ne changent pas la configuration Confort, le choix des sources,
les seuils, les événements d’automatisation ni les capteurs Home Assistant. Si température et humidité
sont visibles mais qu’une seule mesure actuelle existe, la carte utilise la même échelle à une
mesure que le panneau principal Velair.

<a id="freshness"></a>
## Fraîcheur

**Obsolète après** est la durée maximale depuis la dernière mise à jour d’état envoyée à
Home Assistant par un capteur sélectionné (`last_reported`). Répéter la même valeur actualise l’horodatage du rapport et garde
la mesure actuelle. Velair écoute ces rapports et programme la prochaine expiration, afin que le
panneau, les capteurs et les événements puissent afficher `stale` lorsque l’échéance passe sans
nouveau rapport.

Le réglage se trouve dans sa propre section **Fraîcheur des données**, après les commandes de sources.
Cette section regroupe aussi les mesures actuelles dont la fraîcheur n’est pas vérifiable, y compris
les mesures dérivées activées et les capteurs extérieurs, sans répéter les valeurs extérieures calculées.
Elle liste les sources directes couvertes par la limite, notamment Room Assist, CO2, les capteurs
extérieurs ou les capteurs externes de mesures dérivées. Les capteurs extérieurs peuvent la garder
active même si température et humidité intérieures proviennent toutes deux de l’appareil ; ce délai
ne rend pas périmées les mesures de l’appareil. Vous pouvez la régler avant d’activer le confort. Si aucune
source directe n’est configurée, le champ est désactivé avec une explication ; sa valeur enregistrée
est conservée pour une sélection future de capteur.

Les attributs automatiques de température et d’humidité de `climate.*` n’ont pas d’horodatage de
rapport indépendant. Velair garde une valeur valide visible et marque sa fraîcheur `unverified` ;
les changements de consigne ne vérifient pas une nouvelle mesure. Choisissez le capteur de température
ou d’humidité d’origine lorsqu’il est disponible. Si un capteur sélectionné n’a pas de `last_reported`,
sa valeur valide est aussi `unverified`. Une entité `unavailable` ou `unknown` ne peut pas fournir
une mesure utilisable, même si d’anciens attributs numériques subsistent.

Un rapport Home Assistant ne prouve pas que le capteur physique a mesuré à nouveau. Une intégration
qui ne signale que les changements de valeur finira par fournir une mesure considérée comme périmée lorsque sa
valeur reste constante.

<a id="automation-event"></a>
## Événement d’automatisation

Lorsque les conditions environnementales, la qualité de l’air, la qualité des données, les problèmes
de données ou l’état sémantique d’une mesure dérivée activée changent, Velair émet :

```yaml
event_type: velair_event
event_data:
  event: comfort_assessment_changed
```

Exemple de charge utile :

```json
{
  "domain": "velair",
  "event": "comfort_assessment_changed",
  "entity_id": "climate.living_room",
  "condition": "cold_and_humid",
  "air_quality": "elevated",
  "data_quality": "complete",
  "data_issues": [],
  "range_summary": {
    "status": "outside_range",
    "thermal_relation": "not_evaluated",
    "positions": {
      "temperature": "below",
      "humidity": "above",
      "humidex": null
    }
  },
  "previous_range_summary": {
    "status": "within_range",
    "thermal_relation": "not_evaluated",
    "positions": {
      "temperature": "within",
      "humidity": "within",
      "humidex": null
    }
  },
  "range_summary_changed": true,
  "range_status_changed": true,
  "temperature": {
    "metric": "temperature",
    "availability": "current",
    "freshness": "reported",
    "condition": "cold",
    "source": "sensor",
    "entity_id": "sensor.living_room_temperature",
    "value": 18.7,
    "min": 20.0,
    "max": 24.0
  },
  "humidity": {
    "metric": "humidity",
    "availability": "current",
    "freshness": "reported",
    "condition": "humid",
    "source": "sensor",
    "entity_id": "sensor.living_room_humidity",
    "value": 68,
    "min": 40,
    "max": 60
  },
  "co2": {
    "metric": "co2",
    "availability": "current",
    "freshness": "reported",
    "condition": "elevated",
    "source": "sensor",
    "entity_id": "sensor.living_room_co2",
    "value": 1200,
    "attention": 1000,
    "max": 1500
  },
  "derived_metrics": {
    "dew_point": {
      "metric": "dew_point",
      "availability": "current",
      "freshness": "reported",
      "source": "velair",
      "entity_id": null,
      "value": 12.9,
      "unit": "°C",
      "issues": [],
      "input_entity_ids": [
        "sensor.living_room_temperature",
        "sensor.living_room_humidity"
      ]
    }
  }
}
```

Exemple d’automatisation :

```yaml
automation:
  - alias: "Velair poor air quality"
    triggers:
      - trigger: event
        event_type: velair_event
        event_data:
          event: comfort_assessment_changed
          air_quality: poor
    actions:
      - action: notify.mobile_app_phone
        data:
          message: >
            Poor air quality in {{ trigger.event.data.entity_id }}:
            {{ trigger.event.data.co2.value | round(0) }} ppm
```

Ouvrir ou rafraîchir le panneau n’émet pas d’événement d’automatisation. Les variations numériques
des mesures d’origine ou dérivées n’émettent pas de doublons tant que leurs classifications
sémantiques et leur disponibilité restent inchangées. Le panneau et les attributs des capteurs
Home Assistant sont toujours actualisés avec les dernières valeurs.

Utilisez `range_status_changed: true` lorsqu’une automatisation doit réagir uniquement au changement
de l’état global de la plage configurée. Utilisez `range_summary_changed: true` si les changements
de positions individuelles ou de leur relation thermique importent aussi. D’autres changements de
confort peuvent émettre le même événement avec les deux indicateurs à `false` ; les résumés actuel
et précédent rendent cette transition explicite.

Consultez [Événements d’automatisation](automation-events.fr.md#comfort-assessment-changed) pour une
charge utile complète, les champs dérivés exacts qui participent à cet état sémantique et le modèle
commun de déclencheur `velair_event`.

<a id="performance-and-privacy"></a>
## Performances et confidentialité

Le confort est désactivé par défaut.

Lorsqu’il est désactivé pour un appareil, Velair n’enregistre aucun écouteur Confort pour cet appareil.
Lorsqu’il est activé, il écoute uniquement l’appareil géré et les entités de capteurs sélectionnées
ou résolues automatiquement, y compris les sources externes actives de mesures dérivées. Les mesures
dérivées natives réutilisent les écouteurs existants de température et d’humidité. Il n’y a aucune
interrogation périodique continue.

Toutes les mesures et évaluations restent locales dans Home Assistant.
