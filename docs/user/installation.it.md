<a id="installation"></a>
# Installazione

<!-- velair-docs:start -->
Traduzioni: [Originale in inglese](installation.md) · [Español](installation.es.md) · [Français](installation.fr.md) · [Deutsch](installation.de.md) · [Italiano](installation.it.md) · [Nederlands](installation.nl.md) · [Polski](installation.pl.md) · [Português (Brasil)](installation.pt-br.md) · [Português (Portugal)](installation.pt-pt.md) · [Русский](installation.ru.md) · [Stato delle traduzioni](../translation-status.md)

<details>
<summary>Stato di questa traduzione</summary>

| Voce | Stato |
| --- | --- |
| Versione di riferimento | 1.9.0-beta.2 |
| Ultima sincronizzazione | 2026-10-17 |
| Revisione linguistica | Traduzione assistita dall’IA |
| Rispetto all’originale | Sincronizzata con l’originale inglese. |

</details>

---
<!-- velair-docs:end -->

Velair è disponibile nel catalogo predefinito di HACS. L’installazione manuale resta disponibile per chi non usa HACS o deve provare una build specifica.

<a id="hacs"></a>
## HACS

1. Apri HACS.
2. Cerca **Velair** fra le integrazioni disponibili.
3. Apri Velair e seleziona **Scarica**.
4. Riavvia Home Assistant.
5. Vai a **Impostazioni > Dispositivi e servizi**.
6. Aggiungi l’integrazione Velair.
7. Seleziona le entità `climate.*` che Velair può gestire.

Velair usa l’unità di temperatura scelta in Home Assistant. Una nuova installazione crea programmazioni, modelli, soglie di comfort, impostazioni di Room Assist e valori predefiniti del precondizionamento adattivo per quell’unità. L’unità viene mostrata in sola lettura nelle impostazioni di Velair e deve essere cambiata in Home Assistant, non in Velair.

Le installazioni esistenti che passano da una versione pubblicata di Velair solo Celsius potrebbero richiedere un ripristino se Home Assistant usa Fahrenheit. Prima di procedere, consulta [Unità di temperatura e migrazione](temperature-units.it.md), così da poter esportare una copia di riferimento se necessario.

<a id="manual-installation"></a>
## Installazione manuale

L’installazione manuale serve normalmente solo se non usi HACS o vuoi provare una build di GitHub Actions o GitHub Release.

Gli allegati delle versioni includono `velair-custom-component-<version>.zip`. Estrailo in modo che esista questa cartella:

```text
<home_assistant_config>/custom_components/velair
```

Se hai scaricato una copia del repository, copia:

```text
custom_components/velair
```

in:

```text
<home_assistant_config>/custom_components/velair
```

Riavvia Home Assistant e aggiungi Velair da **Impostazioni > Dispositivi e servizi**.

<a id="github-actions-artifacts"></a>
## Artefatti di GitHub Actions

Ogni esecuzione CI riuscita carica artefatti temporanei:

- `velair-custom-component`: la cartella completa `custom_components/velair` con il bundle frontend generato durante quell’esecuzione.
- `velair-lovelace-resource`: i file compilati `velair-card.js` per prove manuali avanzate della risorsa Lovelace.

Le esecuzioni delle versioni con tag allegano anche file zip alla GitHub Release. Per l’uso normale preferisci HACS; usa questi artefatti per provare un’esecuzione specifica del workflow o per un’installazione manuale.

<a id="optional-lovelace-card"></a>
## Scheda Lovelace facoltativa

Il pannello della barra laterale viene registrato automaticamente. La scheda Lovelace è facoltativa.

Aggiungi la risorsa fornita dall’integrazione:

```yaml
url: /velair_frontend/velair-card.js
type: module
```

Poi aggiungi una o più schede Velair. Ogni scheda usa gli stessi dati backend e componenti visivi del pannello della barra laterale.

```yaml
type: custom:velair-card
view: overview-status
```

Valori supportati per `view`:

- `climate`: stato e controlli per un dispositivo climatico gestito, con un’azione facoltativa di rientro occasionale per la casa accanto a incremento e pausa. Le schede esistenti mantengono nascosta l’azione; le nuove configurazioni create dal selettore delle schede la abilitano.
- `overview-status`: stato del pianificatore e controlli di pausa/arresto/ripresa.
- `overview-boosts`: incrementi attivi.
- `overview-events`: prossimi eventi.
- `overview-timeline`: cronologia della giornata.
- `overview-zones`: panoramica delle zone.
- `active-setup`: modalità e profili attuali, con controlli facoltativi.
- `schedules`: editor completo delle programmazioni.
- `sensors`: configurazione e stato in tempo reale di Room Assist.
- `comfort`: configurazione e stato del comfort ambientale.
- `preconditioning`: configurazione del precondizionamento adattivo e stato dell’apprendimento locale.
- `planned-return`: controlli compatti per il rientro occasionale, conteggio delle fonti di presenza configurate e cronologia della partenza confermata. Senza fonti di presenza salvate, Plan return applica subito Assenza; la routine settimanale automatica richiede comunque delle fonti.
- `diagnostics`: stato del funzionamento, cronologia limitata, filtri ed esportazione delle segnalazioni.

<a id="card-discovery-and-resource-troubleshooting"></a>
### Individuazione delle schede e risoluzione dei problemi delle risorse

Usa solo la risorsa modulo `/velair_frontend/velair-card.js` servita dall’integrazione. Rimuovi le risorse Velair duplicate, inclusa una vecchia `/local/velair-card.js`, quindi ricarica il browser. Gli elementi personalizzati del browser non possono essere sostituiti dopo la registrazione: una vecchia risorsa caricata per prima può lasciare il browser con un’implementazione obsoleta.

Il selettore di schede della dashboard individua Velair tramite i metadati frontend. Aggiungere manualmente `type: custom:velair-card` in YAML usa l’elemento personalizzato registrato; sono verifiche distinte. Se la scheda funziona in YAML ma non compare nel selettore, indica questa distinzione nella segnalazione.

Se l’individuazione differisce tra desktop e mobile, cerca errori JavaScript nella console per sviluppatori del browser interessato e la richiesta della risorsa nella scheda Rete. Includi versioni di Home Assistant e Velair, browser interessato, URL esatto della risorsa ed eventuali errori pertinenti. Rimuovi i dettagli privati prima di condividere i log. Il caricamento riuscito in un altro browser non dimostra la causa dell’errore nel browser interessato.

<a id="updating"></a>
## Aggiornamento

Dopo aver aggiornato Velair:

1. Riavvia Home Assistant.
2. Forza l’aggiornamento del browser o ricarica l’app companion di Home Assistant.
3. Verifica che la sezione di manutenzione nelle impostazioni mostri la versione prevista dell’integrazione.
