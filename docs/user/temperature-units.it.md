<a id="temperature-units-and-migration"></a>
# Unità di temperatura e migrazione
<!-- velair-docs:start -->
Traduzioni: [Originale in inglese](temperature-units.md) · [Español](temperature-units.es.md) · [Français](temperature-units.fr.md) · [Deutsch](temperature-units.de.md) · [Italiano](temperature-units.it.md) · [Nederlands](temperature-units.nl.md) · [Polski](temperature-units.pl.md) · [Português (Brasil)](temperature-units.pt-br.md) · [Português (Portugal)](temperature-units.pt-pt.md) · [Русский](temperature-units.ru.md) · [Stato delle traduzioni](../translation-status.md)

<details>
<summary>Stato di questa traduzione</summary>

| Voce | Stato |
| --- | --- |
| Versione di riferimento | 1.9.0-beta.1 |
| Ultima sincronizzazione | 2026-10-11 |
| Revisione linguistica | Traduzione assistita dall’IA |
| Rispetto all’originale | Sincronizzata con l’originale inglese. |

</details>

---
<!-- velair-docs:end -->

Velair supporta Celsius e Fahrenheit seguendo l’unità di temperatura configurata in Home Assistant. Non offre un selettore di unità separato. L’unità rilevata compare in sola lettura in **Impostazioni > Unità di temperatura**; per cambiarla, usa le impostazioni del sistema di unità di Home Assistant.

<a id="new-installations-and-resets"></a>
## Nuove installazioni e ripristini

Alla prima configurazione, Velair crea programmazioni, modelli integrati, soglie di comfort, limiti di Room Assist e impostazioni del precondizionamento adattivo nell’unità rilevata da Home Assistant. Il ripristino di Velair ricrea questi valori predefiniti per l’unità attualmente rilevata.

Gli obiettivi climatici vengono verificati rispetto al minimo, al massimo e al passo di temperatura effettivo di ogni dispositivo gestito. Velair usa direttamente `target_temp_step` quando Home Assistant lo fornisce. In caso contrario, le impostazioni mostrano il valore alternativo effettivo: l’ultimo passo valido comunicato dall’entità, il valore manuale salvato per la zona, oppure `1` se nessuno dei due esiste. È possibile impostarlo sull’incremento reale del dispositivo. Salvarlo mentre l’attributo manca cancella l’osservazione memorizzata senza cambiare le regole della programmazione. Una successiva segnalazione valida torna a essere la fonte di riferimento e viene memorizzata nuovamente: un’entità incoerente non può quindi invalidare programmazioni decimali esistenti semplicemente omettendo l’attributo.

La griglia degli obiettivi validi parte dalla temperatura minima dichiarata dal dispositivo climatico, non da zero. Questo preserva i valori reali impostabili sia in Celsius sia in Fahrenheit, anche quando il minimo non è un multiplo esatto del passo.

<a id="existing-stored-data"></a>
## Dati già memorizzati

Velair memorizza la configurazione termica nell’unità registrata con i dati. Non reinterpreta silenziosamente i numeri salvati quando cambia l’unità di Home Assistant.

Quando i dati salvati dichiarano già un’unità e Home Assistant successivamente segnala l’altra, Velair:

1. interrompe la programmazione automatica e le scritture termiche;
2. conserva lo stato di recupero attivo di Room Assist, interrompendone i listener;
3. crea una notifica persistente in Home Assistant;
4. mostra nelle impostazioni di Velair le unità di origine e di destinazione;
5. offre una migrazione esplicita di tutti i dati termici memorizzati.

Esegui la migrazione solo quando tutti i valori salvati usano ancora l’unità di origine indicata. L’operazione converte programmazioni, modelli, obiettivi delle sostituzioni attive e precedenti, valori alternativi del passo di temperatura, soglie di comfort, impostazioni di Room Assist, configurazione del precondizionamento adattivo, ultimi passi comunicati, velocità termiche e osservazioni di apprendimento. Gli obiettivi legati a un dispositivo noto vengono allineati al suo passo effettivo quando disponibile. Gli altri valori modificabili convertiti usano una precisione sicura senza inventare un passo del dispositivo.

Il pianificatore riprende solo dopo il salvataggio riuscito dei dati convertiti e il ripristino dello stato di esecuzione. Dopo un’operazione riuscita, Room Assist ripristina l’obiettivo programmato convertito e cancella lo stato di recupero salvato. Se i dati sono stati salvati ma il recupero in esecuzione fallisce, Velair resta arrestato e segnala che occorre ricaricare l’integrazione o riavviare Home Assistant.

<a id="upgrading-published-celsius-only-data"></a>
## Aggiornamento dei dati pubblicati solo in Celsius

Le versioni pubblicate di Velair precedenti ai metadati dell’unità interpretavano i valori termici salvati come Celsius. Velair considera quindi Celsius i vecchi dati privi di unità.

- Se Home Assistant usa Celsius, Velair può continuare con quei valori e registrare i metadati dell’unità.
- Se Home Assistant usa Fahrenheit, Velair non prova a indovinare se i singoli valori siano stati modificati manualmente. Arresta il pianificatore e richiede **Reimposta Velair**, che sostituisce i dati precedenti con nuovi valori predefiniti Fahrenheit.

L’esportazione resta disponibile mentre il ripristino è in attesa, così puoi conservare una copia di riferimento prima di cancellare le vecchie programmazioni e impostazioni.

<a id="export-and-import"></a>
## Esportazione e importazione

Le esportazioni attuali includono un campo `temperature_unit`. Quando un file importato usa l’altra unità, Velair converte le sezioni termiche selezionate nell’unità attuale di Home Assistant prima di salvarle.

I vecchi backup senza `temperature_unit` vengono accettati e interpretati come Celsius. La schermata di importazione mostra questa assunzione prima dell’importazione. Su un’installazione Fahrenheit, tali valori precedenti vengono convertiti automaticamente in Fahrenheit.

L’importazione resta distruttiva per le sezioni selezionate: programmazioni, modelli, impostazioni o dati di apprendimento corrispondenti vengono sovrascritti. Esporta prima la configurazione attuale se potresti aver bisogno di un punto di ripristino.

Il valore alternativo manuale del passo di temperatura per zona è incluso nei dati portabili della zona e viene convertito come differenza di temperatura quando le unità sono diverse. L’ultimo passo osservato da un’entità climatica locale è un’informazione interna sul dispositivo e non viene esportato.

<a id="temporarily-unavailable-climates"></a>
## Dispositivi climatici temporaneamente non disponibili

Un dispositivo climatico potrebbe non esporre il proprio intervallo o passo di temperatura mentre non è disponibile. Velair può comunque migrare o importare i dati salvati e poi verificare le programmazioni quando il dispositivo pubblica nuovamente le proprie capacità. Una programmazione incompatibile viene identificata nel pannello e deve essere corretta prima di poterci fare affidamento.

<a id="what-velair-converts"></a>
## Cosa converte Velair

La configurazione salvata e i dati di backup importati vengono convertiti solo durante una migrazione o un’importazione esplicita. Le letture e gli obiettivi climatici in tempo reale appartengono già a Home Assistant e non vengono convertiti nuovamente. Le letture dei sensori ambiente o esterni vengono convertite solo al momento del confronto, quando l’unità dichiarata è diversa da quella del dispositivo climatico gestito.
