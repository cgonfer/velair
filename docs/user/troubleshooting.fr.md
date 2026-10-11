<a id="troubleshooting"></a>
# Dépannage
<!-- velair-docs:start -->
Traductions: [Original en anglais](troubleshooting.md) · [Español](troubleshooting.es.md) · [Français](troubleshooting.fr.md) · [Deutsch](troubleshooting.de.md) · [Italiano](troubleshooting.it.md) · [Nederlands](troubleshooting.nl.md) · [Polski](troubleshooting.pl.md) · [Português (Brasil)](troubleshooting.pt-br.md) · [Português (Portugal)](troubleshooting.pt-pt.md) · [Русский](troubleshooting.ru.md) · [État des traductions](../translation-status.md)

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

<a id="a-lovelace-card-shows-configuration-error"></a>
## Une carte Lovelace affiche une erreur de configuration

Vérifiez que Velair est installé et configuré avant que le tableau de bord charge la carte. L’intégration expose sa ressource frontend tôt pendant le démarrage de Home Assistant afin qu’un redémarrage normal ne laisse pas les cartes attendre le module.

Si l’erreur persiste :

1. Vérifiez que l’URL de la ressource du tableau de bord est exactement `/velair_frontend/velair-card.js` et que son type est **Module JavaScript**.
2. Supprimez les ressources anciennes ou en double, telles que `/local/velair-card.js`.
3. Redémarrez Home Assistant après la mise à jour de l’intégration.
4. Rechargez le navigateur ou l’application compagnon Home Assistant.

La console du navigateur ou son panneau réseau devrait indiquer si la demande du module a échoué. Joignez l’erreur complète lorsque vous signalez un problème reproductible.

<a id="velair-does-not-appear-in-the-sidebar"></a>
## Velair n’apparaît pas dans la barre latérale

Redémarrez Home Assistant après l’installation ou la mise à jour de l’intégration. Le panneau de la barre latérale est enregistré lors de la configuration de l’intégration.

Si l’intégration vient d’être mise à jour, effectuez une actualisation complète du navigateur ou rechargez l’application compagnon Home Assistant.

<a id="the-lovelace-card-shows-old-ui"></a>
## La carte Lovelace affiche l’ancienne interface

Vérifiez les ressources du tableau de bord. Supprimez les anciennes ressources de développement telles que :

```yaml
url: /local/velair-card.js
type: module
```

Utilisez plutôt la ressource servie par l’intégration :

```yaml
url: /velair_frontend/velair-card.js
type: module
```

Velair sert cette ressource avec des en-têtes empêchant sa mise en cache. La barre latérale utilise une URL automatiquement versionnée et des éléments internes isolés ; une ancienne carte Lovelace en cache ne peut donc pas bloquer la mise à jour du panneau. Une mise à jour de l’intégration nécessite normalement seulement un redémarrage de Home Assistant et une actualisation du navigateur ou de l’application compagnon. Si le backend indique la nouvelle version mais que l’ancienne interface reste visible, effectuez une actualisation complète ou effacez le cache du site avant de signaler le problème. Les utilisateurs ne doivent pas ajouter d’identifiants de compilation ni modifier l’URL de la ressource entre les versions.

<a id="a-climate-entity-is-missing"></a>
## Une entité climatique manque

Ouvrez les options de l’intégration Velair et vérifiez que l’entité est sélectionnée. Velair gère uniquement les entités `climate.*` configurées dans l’intégration.

Si l’entité n’existe plus dans Home Assistant, Velair indique ce problème vérifié dans **Diagnostic**.

<a id="a-mode-is-not-available"></a>
## Un mode n’est pas disponible

Velair lit les modes HVAC pris en charge depuis l’entité climatique. Si un mode n’apparaît pas, l’entité ne le déclare pas comme pris en charge.

Lors de l’application de modèles ou du clonage de programmations, Velair refuse les modes non pris en charge avec une erreur claire. Passez le bloc à `Keep` ou sélectionnez un mode pris en charge par l’appareil cible.

<a id="temperature-is-adjusted-when-applying-templates"></a>
## La température change lors de l’application d’un modèle

Lors de l’application d’un modèle, Velair vérifie ses réglages climatiques effectifs par rapport au thermostat de destination. Velair rejette d’abord les températures inférieures au minimum ou supérieures au maximum du thermostat. Les valeurs comprises dans ces limites peuvent ensuite être arrondies au pas de température pris en charge, y compris près d’une limite de plage. Cette vérification s’applique aussi aux préréglages partagés et aux modèles liés : une configuration partagée incompatible empêche l’enregistrement de l’opération concernée. Ajustez la température ou choisissez une destination compatible avant de réessayer.

<a id="export-does-not-download-on-mobile"></a>
## L’export ne se télécharge pas sur mobile

Pour l’instant, l’export est volontairement affiché uniquement sur ordinateur, car les applications compagnon mobiles ne gèrent pas les téléchargements de façon uniforme. L’import reste disponible sur ordinateur et sur mobile.

<a id="scheduler-does-not-apply-after-restart"></a>
## Le planificateur n’applique pas la programmation après un redémarrage

Par défaut, Velair restaure son état sans imposer de consigne aux appareils après le démarrage de Home Assistant.

Activez **Appliquer la programmation active après le démarrage** dans Paramètres si vous souhaitez que Velair applique la programmation active après un redémarrage.

<a id="reset-to-defaults"></a>
## Rétablir les valeurs par défaut

Utilisez **Paramètres > Maintenance > Réinitialiser Velair**. Cette action efface toutes les données Velair stockées : programmations, modèles, préférences du panneau, forçages et pauses actifs, réglages Confort et Room Assist, réglages et apprentissage du préconditionnement adaptatif et comportement au démarrage. Elle recrée ensuite des valeurs par défaut adaptées à l’unité pour les appareils actuellement gérés.

Exportez d’abord les données si vous pouvez avoir besoin de les récupérer.

<a id="temperature-unit-requires-attention"></a>
## L’unité de température nécessite votre attention

Velair lit l’unité de température depuis Home Assistant. Si Paramètres indique que l’unité stockée diffère de celle de Home Assistant, la programmation automatique et les écritures de valeurs thermiques restent arrêtées pour empêcher l’application d’une ancienne consigne avec une mauvaise interprétation.

- Si Velair propose une migration des températures stockées, vérifiez que toutes les valeurs utilisent encore l’unité source affichée, puis exécutez la migration une fois. Ne rien faire maintient simplement la programmation arrêtée ; Velair ne convertit jamais les données silencieusement.
- Si une mise à niveau d’anciennes données publiées en Celsius nécessite une réinitialisation, exportez d’abord une copie de référence si elle peut être utile, puis utilisez **Réinitialiser Velair** pour créer des valeurs par défaut dans l’unité actuelle de Home Assistant.
- Si une réinitialisation, une migration ou un import a été enregistré mais que la récupération à l’exécution a échoué, rechargez l’intégration Velair ou redémarrez Home Assistant. Velair reste volontairement arrêté jusqu’à la récupération.

Si une programmation est signalée comme incompatible après le retour d’un appareil, vérifiez la consigne par rapport à sa plage déclarée et à son pas effectif de température. Lorsque `target_temp_step` manque, configurez le pas réel de l’appareil dans sa ligne de Paramètres. Le champ affiche le dernier pas valide mémorisé par Velair, puis une valeur manuelle de repli enregistrée, ou `1` si aucune n’existe. Enregistrer une valeur manuelle lorsque l’attribut manque remplace l’observation mémorisée. La valeur manuelle est ignorée, mais conservée, lorsque Home Assistant publie un pas valide.

Les anciennes sauvegardes sans unité enregistrée sont acceptées comme Celsius. L’écran d’import indique cette hypothèse et convertit les valeurs thermiques sélectionnées lorsque l’unité actuelle de Home Assistant est Fahrenheit.

Consultez [Unités de température et migration](temperature-units.fr.md) pour le guide complet des choix et le fonctionnement des sauvegardes.
