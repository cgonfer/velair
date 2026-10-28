<a id="troubleshooting"></a>
# Risoluzione dei problemi
<!-- velair-docs:start -->
Traduzioni: [Originale in inglese](troubleshooting.md) · [Español](troubleshooting.es.md) · [Français](troubleshooting.fr.md) · [Deutsch](troubleshooting.de.md) · [Italiano](troubleshooting.it.md) · [Nederlands](troubleshooting.nl.md) · [Polski](troubleshooting.pl.md) · [Português (Brasil)](troubleshooting.pt-br.md) · [Português (Portugal)](troubleshooting.pt-pt.md) · [Русский](troubleshooting.ru.md) · [Stato delle traduzioni](../translation-status.md)

<details>
<summary>Stato di questa traduzione</summary>

| Voce | Stato |
| --- | --- |
| Versione di riferimento | 1.9.0-beta.6 |
| Ultima sincronizzazione | 2026-10-28 |
| Revisione linguistica | Traduzione assistita dall’IA |
| Rispetto all’originale | Sincronizzata con l’originale inglese. |

</details>

---
<!-- velair-docs:end -->

<a id="a-lovelace-card-shows-configuration-error"></a>
## Una scheda Lovelace mostra un errore di configurazione

Verifica che Velair sia installato e configurato prima del caricamento della scheda. Se le risorse sono gestite nell’interfaccia di Home Assistant, Velair registra e aggiorna il modulo automaticamente. L’installazione normale non richiede aggiunte manuali di risorse.

Se l’errore persiste:

1. Verifica la risorsa `/velair_frontend/velair-card.js` di tipo **Modulo JavaScript**. Il parametro automatico `?v=...` è previsto per risorse gestite dall’interfaccia; non rimuoverlo né modificarlo.
2. Cerca risorse vecchie o duplicate come `/local/velair-card.js`. Velair migra e consolida automaticamente questi percorsi locali esatti nella gestione dall’interfaccia. Altri percorsi e URL esterni richiedono una verifica manuale.
3. Riavvia Home Assistant dopo l’aggiornamento.
4. Ricarica browser o app companion e apri direttamente la dashboard senza visitare prima Velair nella barra laterale.

Per risorse gestite in YAML, aggiungi manualmente il modulo con l’URL stabile senza parametri ed elimina lì voci vecchie o duplicate. Scrivere una scheda o dashboard in YAML non significa gestire le risorse in YAML. Vedi [Installazione](installation.it.md#resources-managed-in-yaml). Controlla i registri di Home Assistant per errori di registrazione o avvisi YAML; Velair non crea notifiche persistenti per questi controlli.

Se la registrazione automatica fallisce, aggiungi la risorsa da **Impostazioni > Dashboard > Risorse** come **Modulo JavaScript**:

```yaml
url: /velair_frontend/velair-card.js
type: module
```

La console o il pannello di rete del browser indica se la richiesta del modulo è fallita. Includi l’errore completo quando segnali un problema riproducibile.

<a id="velair-does-not-appear-in-the-sidebar"></a>
## Velair non compare nella barra laterale

Riavvia Home Assistant dopo l’installazione o l’aggiornamento dell’integrazione. Il pannello della barra laterale viene registrato durante la configurazione dell’integrazione.

Se l’integrazione è stata appena aggiornata, forza l’aggiornamento del browser o ricarica l’app companion di Home Assistant.

<a id="the-lovelace-card-shows-old-ui"></a>
## La scheda Lovelace mostra la vecchia interfaccia

Riavvia prima Home Assistant e ricarica browser o app interessati. Velair aggiorna automaticamente le risorse gestite dall’interfaccia, migrando `/local/velair-card.js` e consolidando i duplicati riconosciuti. Controlla i registri in caso di errore. Altri percorsi e URL esterni richiedono una verifica manuale.

Velair serve la risorsa con intestazioni senza cache. Per la gestione dall’interfaccia mantiene automaticamente `?v=...` e usa lo stesso URL con versione per barra laterale e schede. L’URL stabile `/velair_frontend/velair-card.js` resta valido per configurazione manuale e YAML. Non aggiungere identificativi di build né modificare i parametri di versione tra le versioni.

Un aggiornamento richiede normalmente solo il riavvio di Home Assistant e il ricaricamento di browser o app. Se il backend riporta la nuova versione ma la vecchia resta visibile, forza il ricaricamento o svuota la cache del sito prima di segnalare il problema.

<a id="a-climate-entity-is-missing"></a>
## Manca un’entità climatica

Apri le opzioni dell’integrazione Velair e verifica che l’entità sia selezionata. Velair gestisce solo le entità `climate.*` configurate nell’integrazione.

Se l’entità non esiste più in Home Assistant, Velair mostrerà il problema verificato in **Diagnostica**.

<a id="a-mode-is-not-available"></a>
## Una modalità non è disponibile

Velair legge le modalità HVAC supportate dall’entità climatica. Se una modalità non compare, l’entità non la dichiara supportata.

Quando applica modelli o clona programmazioni, Velair rifiuta le modalità non supportate con un errore chiaro. Cambia il blocco in `Keep` o seleziona una modalità supportata dal dispositivo di destinazione.

<a id="temperature-is-adjusted-when-applying-templates"></a>
## La temperatura viene adattata quando si applicano i modelli

Quando applichi un modello, Velair verifica le impostazioni climatiche risultanti rispetto al termostato di destinazione. Velair rifiuta prima le temperature inferiori al minimo o superiori al massimo del termostato. I valori entro questi limiti possono poi essere arrotondati al passo di temperatura supportato, anche vicino a un limite dell’intervallo. Questa verifica si applica anche ai preset condivisi e ai modelli collegati: una configurazione condivisa incompatibile impedisce il salvataggio dell’operazione interessata. Modifica la temperatura oppure scegli una destinazione compatibile prima di riprovare.

<a id="export-does-not-download-on-mobile"></a>
## L’esportazione non viene scaricata su mobile

Per ora l’esportazione viene mostrata intenzionalmente solo su desktop, perché le app companion mobili gestiscono i download in modo incoerente. L’importazione resta disponibile sia su desktop sia su mobile.

<a id="scheduler-does-not-apply-after-restart"></a>
## Il pianificatore non applica la programmazione dopo un riavvio

Per impostazione predefinita, Velair ripristina lo stato senza imporre comandi ai dispositivi climatici dopo l’avvio di Home Assistant.

Abilita **Applica la programmazione attiva dopo l’avvio** nelle impostazioni se vuoi che Velair applichi la programmazione attiva dopo un riavvio.

<a id="reset-to-defaults"></a>
## Ripristino dei valori predefiniti

Usa **Impostazioni > Manutenzione > Reimposta Velair**. Questo cancella tutti i dati salvati di Velair, comprese programmazioni, modelli, preferenze del pannello, incrementi e pause attivi, impostazioni di comfort e Room Assist, impostazioni e apprendimento del precondizionamento adattivo e comportamento all’avvio. Ricrea poi i valori predefiniti, nell’unità corretta, per i dispositivi climatici attualmente gestiti.

Esporta prima i dati esistenti se potresti doverli recuperare.

<a id="temperature-unit-requires-attention"></a>
## L’unità di temperatura richiede attenzione

Velair legge l’unità di temperatura da Home Assistant. Se le impostazioni segnalano che l’unità salvata e quella di Home Assistant sono diverse, la programmazione automatica e le scritture termiche restano ferme per evitare di applicare un vecchio obiettivo con un significato errato.

- Se Velair offre una migrazione delle temperature salvate, verifica che tutti i valori usino ancora l’unità di origine indicata, poi esegui la migrazione una volta. Non intervenire mantiene semplicemente arrestata la programmazione: Velair non converte mai i dati in modo silenzioso.
- Se l’aggiornamento di dati precedenti pubblicati in Celsius richiede un ripristino, esporta prima una copia di riferimento se utile, poi usa **Reimposta Velair** per creare i valori predefiniti nell’unità attuale di Home Assistant.
- Se un ripristino, una migrazione o un’importazione è stato salvato ma il recupero in esecuzione è fallito, ricarica l’integrazione Velair o riavvia Home Assistant. Velair resta intenzionalmente arrestato fino al recupero.

Se una programmazione viene segnalata come incompatibile dopo che un dispositivo torna disponibile, confronta l’obiettivo con l’intervallo dichiarato dall’entità e il passo di temperatura effettivo. Quando manca `target_temp_step`, configura il passo reale del dispositivo nella sua riga delle impostazioni. Il campo mostra l’ultimo passo valido memorizzato da Velair, poi un valore alternativo manuale salvato, oppure `1` se nessuno dei due esiste. Salvare un valore manuale mentre l’attributo manca sostituisce l’osservazione memorizzata. Il valore manuale viene ignorato, ma conservato, ogni volta che Home Assistant pubblica un passo valido.

I vecchi backup senza un’unità registrata vengono accettati come Celsius. La schermata di importazione mostra questa assunzione e converte i valori termici selezionati quando l’unità attuale di Home Assistant è Fahrenheit.

Consulta [Unità di temperatura e migrazione](temperature-units.it.md) per la guida completa alle decisioni e al comportamento dei backup.
