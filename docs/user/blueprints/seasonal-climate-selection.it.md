<a id="seasonal-climate-selection"></a>
# Selezione climatica stagionale
<!-- velair-docs:start -->
Traduzioni: [Originale in inglese](seasonal-climate-selection.md) · [Español](seasonal-climate-selection.es.md) · [Français](seasonal-climate-selection.fr.md) · [Deutsch](seasonal-climate-selection.de.md) · [Italiano](seasonal-climate-selection.it.md) · [Nederlands](seasonal-climate-selection.nl.md) · [Polski](seasonal-climate-selection.pl.md) · [Português (Brasil)](seasonal-climate-selection.pt-br.md) · [Português (Portugal)](seasonal-climate-selection.pt-pt.md) · [Русский](seasonal-climate-selection.ru.md) · [Stato delle traduzioni](../../translation-status.md)

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

Esegui le azioni scelte dopo che un sensore di temperatura cambia e mantiene il nuovo valore per un ritardo configurabile. Seleziona modalità per inverno, clima mite o estate senza duplicare le programmazioni né inserire regole meteorologiche in Velair. Le letture del sensore non valide producono una notifica immediata di Home Assistant.

<p>
  <a href="https://my.home-assistant.io/redirect/blueprint_import/?blueprint_url=https%3A%2F%2Fraw.githubusercontent.com%2Fcgonfer%2Fvelair%2Fmain%2Fblueprints%2Fautomation%2Fvelair%2Fseasonal_climate_selection.yaml"><img src="https://my.home-assistant.io/badges/blueprint_import.svg" alt="Apri Home Assistant e importa il blueprint della selezione climatica stagionale" height="28"></a>
  <a href="https://raw.githubusercontent.com/cgonfer/velair/main/blueprints/automation/velair/seasonal_climate_selection.yaml"><img src="https://img.shields.io/badge/YAML_source-View-24292F?style=for-the-badge&amp;logo=github&amp;logoColor=white" alt="Consulta il sorgente YAML della selezione climatica stagionale"></a>
</p>

[Consulta le modifiche](../../../blueprints/changelogs/seasonal_climate_selection.md) · [Torna all’indice dei blueprint](../blueprints.it.md)

<a id="when-to-use-it"></a>
## Quando usarlo

Usa questo blueprint quando Home Assistant espone già il massimo previsto giornaliero, una misura esterna o una temperatura media come un unico sensore numerico di temperatura. Sceglie le azioni da eseguire; Velair continua a gestire programmazioni, preset, precondizionamento e invio ai dispositivi.

Per un sensore aggiornato una volta al giorno, un solo aggiornamento stabile può scegliere la routine della giornata. Per un sensore esterno o medio che cambia spesso, scegli con attenzione il ritardo: ogni nuovo valore riavvia l’attesa. Un sensore aggiornato ogni cinque minuti potrebbe non completare mai un’attesa di 30 minuti.

<a id="requirements"></a>
## Requisiti

- Blueprint versione 1.0.0 e Home Assistant 2024.6.0 o successivo.
- Un sensore numerico con classe del dispositivo temperatura e unità dichiarata °C o °F.
- Velair serve solo per azioni che usano le sue entità o i suoi servizi. Script standard e altre azioni Home Assistant funzionano senza Velair.
- Prepara separatamente il sensore delle previsioni se il fornitore meteorologico espone previsioni invece di un sensore numerico. Questo blueprint non recupera previsioni.

Le modalità e il selettore nativo della modalità Velair sono disponibili in Velair 1.6.0 o successivo. Preset condivisi e modelli collegati sono facoltativi: il selettore stagionale può anche scegliere modalità costruite da programmazioni indipendenti.

<a id="configuration"></a>
## Configurazione

| Campo | Scopo |
|---|---|
| Temperature sensor | Il sensore esistente da osservare |
| Temperature unit for thresholds | °C o °F; le letture del sensore vengono convertite per il confronto |
| Winter threshold | I valori sotto questa soglia eseguono le azioni invernali; valore predefinito 20 |
| Summer threshold | I valori sopra questa soglia eseguono le azioni estive; valore predefinito 27 |
| Winter / Mild-weather / Summer actions | Sequenze standard di azioni Home Assistant; inizialmente vuote |
| Stability delay | Quanto a lungo la nuova temperatura numerica deve restare invariata; valore predefinito 30 minuti |
| Language for diagnostic notifications | Qualsiasi lingua supportata da Velair per gli avvisi persistenti sul sensore e sulla configurazione; inglese per impostazione predefinita |

La soglia invernale deve essere inferiore a quella estiva e il ritardo deve essere positivo. I numeri delle soglie non cambiano automaticamente scegliendo Fahrenheit: inserisci personalmente le soglie Fahrenheit desiderate.

Queste due scelte sono esplicite perché Home Assistant non espone ai template dei blueprint le preferenze globali di unità di temperatura o lingua. Neppure la lingua dell’utente del browser è un’impostazione dell’automazione. L’unità dichiarata dal sensore viene letta automaticamente e convertita nell’unità scelta per le soglie; le notifiche diagnostiche usano la lingua selezionata qui.

Il selettore della lingua cambia solo il testo delle notifiche diagnostiche. Le etichette e le descrizioni del modulo del blueprint restano in inglese; non traduce il modulo di configurazione di Home Assistant.

Una sequenza di azioni vuota non fa nulla. Non spegne un dispositivo climatico, non sospende Velair e non seleziona la configurazione predefinita.

<a id="example"></a>
## Esempio

<a id="daily-maximum-and-three-modes"></a>
### Massimo giornaliero e tre modalità

Crea in Velair le modalità Invierno, Entretiempo e Verano. Associa Invierno e Verano ai rispettivi profili. Configura Entretiempo con un profilo le cui zone pertinenti usino **Pausa → Spegni il dispositivo climatico** se il clima mite deve disabilitare la climatizzazione.

In ogni sequenza di azioni del blueprint, aggiungi l’azione **Select: Select** di Home Assistant, scegli l’entità visibile della modalità Velair e seleziona la sua opzione nell’editor. Non presumere che la tua entità abbia l’ID dell’esempio qui sotto.

```yaml
service: select.select_option
target:
  entity_id: select.velair_mode
data:
  option: Invierno
```

Con soglie di 20 e 27 °C, un massimo giornaliero che cambia a 18 °C esegue le azioni invernali dopo 30 minuti senza variazioni. Un successivo aggiornamento a 23 °C esegue le azioni per il clima mite; 30 °C esegue quelle estive. Esattamente 20 o 27 °C appartengono al clima mite. Ogni valore modificato può provocare un’esecuzione, compreso 18 → 19 °C all’interno dell’inverno.

<a id="shared-hours-different-indoor-temperatures"></a>
### Orari condivisi, temperature interne diverse

Collega le programmazioni dei profili Invierno e Verano allo stesso modello giornaliero usando **Solo orari**. Assegna preset invernali come Heat a 21 °C e preset estivi come Cool a 25 °C. Spostare la fascia delle 07:00 nel modello cambia entrambe le programmazioni; selezionare una modalità sceglie gli obiettivi corrispondenti. Il blueprint non modifica i preset o il modello. Consulta gli [esempi pratici di programmazioni collegate](../linked-schedule-examples.it.md).

<a id="average-temperature-and-fahrenheit"></a>
### Temperatura media e Fahrenheit

Un sensore medio può cambiare più volte all’ora. Con un ritardo di dieci minuti, aggiornamenti alle 10:00 e 10:07 rinviano la decisione alle 10:17, purché non arrivi un nuovo valore. Se continua a cambiare prima che passino dieci minuti, non vengono eseguite azioni stagionali.

Un sensore Fahrenheit può usare soglie Celsius perché la lettura viene convertita. In alternativa, seleziona °F e inserisci soglie come 68 e 80.6 °F, equivalenti a 20 e 27 °C. Un valore di 77 °F seleziona allora le azioni per il clima mite.

<a id="alternative-script-or-service"></a>
### Script o servizio alternativo

Ogni ramo accetta normali azioni Home Assistant. Per esempio, esegui uno script domestico nel ramo estivo:

```yaml
service: script.turn_on
target:
  entity_id: script.summer_climate_routine
```

È possibile anche attivare direttamente un profilo con `velair.activate_profile` e il suo ID stabile. Per modificare impostazioni condivise invece di scegliere una modalità, consulta [Automazioni con preset](../preset-automations.it.md); considera tutti gli utilizzi di un preset condiviso prima di modificarlo.

<a id="how-it-works"></a>
## Come funziona

Un trigger di stato rileva una temperatura numerica modificata, poi l’attesa nativa interrompibile di Home Assistant verifica che resti stabile per il ritardo configurato. Una variazione numerica effettiva interrompe la decisione in attesa e avvia una nuova attesa, anche quando torna a un valore precedente: `21 → 22 → 21` avvia un nuovo ritardo all’ultimo 21. Un aggiornamento di solo formato, come da `21` a `21.0`, non avvia un’altra decisione e non interrompe quella già in attesa. Gli aggiornamenti dei soli attributi non avviano azioni stagionali. Prima delle azioni, il blueprint verifica nuovamente la lettura numerica attuale, l’unità, le soglie, il ritardo e la continuità dell’attesa.

Una lettura o un’unità non valida interrompe subito una decisione in attesa, anche se cambia solo l’attributo dell’unità. Ripristinare solo l’unità rimuove la diagnostica ma non seleziona una stagione; serve un altro cambiamento numerico dello stato. Il recupero da uno stato numerico non valido, come `unavailable`, a un numero valido avvia un nuovo ritardo.

L’avvio di Home Assistant verifica solo la diagnostica. Non sceglie una modalità stagionale. I timer in attesa non sopravvivono a un riavvio o al ricaricamento dell’automazione; in seguito serve un nuovo cambiamento di stato del sensore. Non esiste un trigger periodico o giornaliero né un helper che conservi l’ultima classificazione.

Se l’entità del sensore selezionato inizialmente manca e compare poi con una lettura valida, quella prima lettura conta come recupero e avvia l’intera attesa di stabilità. Lo stesso vale quando viene ricreato un sensore rimosso. Si tratta di una transizione del sensore dopo l’avvio, non di un’azione stagionale causata dall’evento di avvio stesso.

La validazione del sensore viene eseguita separatamente dall’attesa stagionale. Un’entità assente, `unknown`, `unavailable`, un valore non finito o non numerico oppure un’unità non supportata crea immediatamente una sola notifica persistente specifica dell’automazione nella lingua selezionata. L’avviso identifica automazione e sensore e spiega che le azioni stagionali sono sospese. Il recupero rimuove l’avviso del sensore; il recupero a uno stato numerico valido avvia una nuova attesa di stabilità, mentre quello della sola unità aggiorna solo la diagnostica. Una configurazione non valida usa una notifica separata.

Per esempio, un sensore che diventa non disponibile alle 09:00 avvisa subito, non alle 09:30. Il recupero a 25 °C alle 09:10 permette le azioni per il clima mite alle 09:40 se il valore resta invariato.

<a id="safety-and-precedence"></a>
## Sicurezza e priorità

Selezionare una Modalità o un Profilo Velair usa le politiche dei suoi blocchi. **Solo temperatura** aggiorna l’obiettivo senza richiedere cambi di modalità HVAC; usa blocchi espliciti **Riscaldamento** o **Raffrescamento** se la selezione di una stagione deve avviare il dispositivo. La politica non sopprime le azioni HVAC dirette configurate nel blueprint.

Mentre il sensore non è valido, il blueprint non effettua nuove selezioni stagionali; non spegne automaticamente i dispositivi. La modalità precedentemente selezionata e la sua programmazione restano in vigore. Intervieni in risposta alla notifica se quel comportamento non è adatto alla tua casa.

Le azioni configurate seguono il comportamento e le tracce normali di Home Assistant. Un errore in un’azione non annulla le azioni precedenti. Il blueprint non può verificare genericamente che un’azione arbitraria abbia selezionato la routine prevista o raggiunto un dispositivo fisico.

Una nuova lettura stabile può sostituire una modalità Assenza selezionata manualmente. Coordina le automazioni stagionali e di presenza anziché lasciare che entrambe scelgano modalità in conflitto. Per esempio, uno script domestico può scegliere una modalità Assenza quando non c’è nessuno in casa e selezionare la modalità stagionale di presenza solo quando la presenza lo permette.

Restano validi i comportamenti esistenti di modalità e profili Velair, compresi la priorità delle pause e l’annullamento degli incrementi nelle zone interessate. Il precondizionamento viene ricalcolato dalla programmazione effettiva selezionata dall’azione; non può anticipare una scelta stagionale prima che venga effettuata.

<a id="limitations"></a>
## Limiti

- La stabilità riguarda il valore del sensore, non solo la classificazione inverno/clima mite/estate. I sensori che cambiano spesso possono rinviare indefinitamente l’esecuzione.
- Nessuna azione stagionale automatica all’avvio, programmazione giornaliera, interrogazione periodica, timer in attesa salvato, condizione aggiuntiva di consenso a 24 °C o spegnimento differito.
- Le notifiche non possono rilevare un sensore che smette silenziosamente di aggiornarsi mantenendo un numero valido. Se necessario, il monitoraggio dell’aggiornamento della fonte deve essere fornito separatamente.
- Non c’è isteresi: il ritardo di stabilità filtra i cambiamenti. Un nuovo valore stabile nella stessa classificazione esegue comunque il proprio ramo.
- L’esecuzione parallela è limitata. Sequenze lunghe di azioni utente possono occupare gli slot; mantieni brevi le azioni o delega il lavoro agli script.
- Una sequenza già iniziata non viene annullata da una lettura successiva. Le verifiche proteggono l’avvio, non ogni azione definita dall’utente.
- Rinominare l’automazione può lasciare la vecchia notifica diagnostica da rimuovere manualmente. Le opzioni di modalità rinominate o eliminate devono essere aggiornate nelle azioni configurate.

<a id="troubleshooting"></a>
## Risoluzione dei problemi

- Se non viene eseguito nulla, verifica che il valore sia realmente cambiato e sia rimasto invariato per l’intero ritardo. Avviare o ricaricare Home Assistant non avvia una selezione stagionale.
- Se compare un avviso, controlla il sensore indicato, lo stato numerico e `unit_of_measurement`. Le unità sconosciute non vengono mai dedotte.
- Se un timer non termina mai, controlla la cronologia del sensore e riduci il ritardo positivo o usa un sensore del massimo giornaliero.
- Se viene eseguito il ramo sbagliato, verifica l’unità selezionata per le soglie ed entrambe le soglie numeriche.
- Se il clima mite lascia gli apparecchi in funzione, configura una vera modalità di pausa e spegnimento; un elenco di azioni vuoto non è un comando di spegnimento.
- Se una modalità non viene selezionata, prova manualmente la sua azione e controlla la traccia dell’automazione. Seleziona il nome attuale dell’opzione nell’editor Home Assistant.
- Se un URL di importazione non è disponibile prima della pubblicazione, usa il file YAML della copia locale per le prove. I collegamenti pubblici funzionano quando il file viene pubblicato su `main`.

<a id="updating-and-customizing"></a>
## Aggiornamento e personalizzazione

Importa esplicitamente il blueprint; installare o aggiornare Velair tramite HACS non lo installa. Importa nuovamente lo stesso URL in continua evoluzione su `main` per aggiornamenti compatibili. La versione 1 conserva i nomi degli input; i nuovi input compatibili ricevono valori predefiniti. Le modifiche incompatibili usano un nuovo nome file e una nuova versione principale.

Home Assistant gestisce l’automazione risultante. Velair non migra automazioni o `.storage`. Usa **Prendi il controllo** per una logica diversa, sapendo che l’automazione indipendente smetterà di ricevere aggiornamenti del blueprint. Consulta il [catalogo dei blueprint](../blueprints.it.md) per le regole condivise di distribuzione e aggiornamento.
