<a id="environmental-comfort"></a>
# Comfort ambientale
<!-- velair-docs:start -->
Traduzioni: [Originale in inglese](comfort.md) · [Español](comfort.es.md) · [Français](comfort.fr.md) · [Deutsch](comfort.de.md) · [Italiano](comfort.it.md) · [Nederlands](comfort.nl.md) · [Polski](comfort.pl.md) · [Português (Brasil)](comfort.pt-br.md) · [Português (Portugal)](comfort.pt-pt.md) · [Русский](comfort.ru.md) · [Stato delle traduzioni](../translation-status.md)

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

L’intervallo predefinito di temperatura confortevole è `20–24 °C`. Se l’installazione usa Fahrenheit, l’intervallo predefinito è `68–75 °F`, con limiti arrotondati a valori senza decimali.

Il Comfort resta indipendente per ogni dispositivo fisico di un gruppo stanza. Ogni membro ha interruttore di monitoraggio, sensori e soglie propri e mostra la propria valutazione. Il raggruppamento condivide programmazione e controllo della stanza senza sostituire le impostazioni di Comfort.

Le soglie di comfort usano l’unità di temperatura configurata in Home Assistant e vengono migrate o importate insieme agli altri dati termici salvati di Velair. Un sensore che dichiara l’altra unità viene convertito prima di confrontarne la lettura con le soglie di comfort del dispositivo climatico gestito.

Il comfort ambientale offre per ogni dispositivo gestito una descrizione comprensibile della stanza, invece di un livello di avviso generico.

Monitora letture di temperatura, umidità e CO2 disponibili localmente. Non modifica le programmazioni e non controlla automaticamente i dispositivi. Velair espone la valutazione nel pannello, nelle schede Lovelace e negli eventi Home Assistant, così le automazioni possono decidere come intervenire.

<a id="sources"></a>
## Fonti

La temperatura usa la prima fonte disponibile in quest’ordine:

1. il sensore di temperatura selezionato nella scheda Comfort;
2. il sensore Room Assist configurato per quel dispositivo;
3. `current_temperature` dell’entità climatica.

Per i dispositivi raggruppati, la temperatura automatica usa `current_temperature` del membro fisico; il sensore Room Assist del gruppo non viene ereditato. Se necessario, seleziona esplicitamente un sensore esterno nel Comfort del membro.

L’umidità usa:

1. il sensore di umidità selezionato nella scheda Comfort;
2. l’attributo misurato `current_humidity` dell’entità climatica, quando disponibile. L’attributo `humidity` è un’impostazione obiettivo, non una lettura.

L’opzione predefinita `Utilizza la sorgente automatica` mantiene questo comportamento automatico. Seleziona `Non monitorare l'umidità` quando l’umidità non deve influenzare la condizione ambientale o la qualità dei dati del dispositivo. La selezione salvata del sensore viene conservata, ma Velair non lo legge né ne ascolta gli eventi mentre il monitoraggio dell’umidità è disabilitato.

La CO2 viene monitorata solo quando è selezionato un sensore CO2.

L’ID dell’entità effettiva compare sotto ogni selettore. Le misure facoltative senza una fonte non vengono considerate errori.

<a id="comfort-models"></a>
## Modelli di comfort

Velair offre tre modi per descrivere l’area di temperatura e umidità relativa utile per una stanza. È un obiettivo configurato dall’utente, non una definizione universale o medica di comfort.

- **Intervalli semplici** è il valore predefinito. Un intervallo di temperatura e uno di umidità formano la consueta area obiettivo rettangolare. Le configurazioni esistenti mantengono invariato questo comportamento.
- **Intervallo psicrometrico guidato** usa un intervallo di umidità come riferimento al punto medio dell’intervallo di temperatura configurato. Velair segue la relazione fisica fra temperatura e umidità relativa per adattare automaticamente quell’intervallo. Il grafico mostra l’obiettivo curvo risultante invece di un rettangolo. È un’indicazione pratica locale, non uno standard fisiologico completo di comfort.
- **Intervalli in base alla temperatura** mantiene lo stesso intervallo di temperatura ma permette valori minimi e massimi di umidità diversi ai suoi estremi più freddo e più caldo. Velair unisce gradualmente quei due intervalli di umidità, trasformando l’area obiettivo in un quadrilatero inclinato anziché un rettangolo.

Per esempio, una stanza configurata per `20–24 °C` può accettare `40–60%` a `20 °C` e `35–50%` a `24 °C`. A `22 °C`, Velair valuta l’umidità rispetto al punto medio: `37.5–55%`. Sotto o sopra l’intervallo di temperatura configurato usa l’estremo più vicino, senza estrapolare oltre i valori dell’utente.

L’intervallo di umidità effettivo attuale compare sotto la mappa. Lo stesso intervallo calcolato dal backend determina condizione visualizzata, riepilogo dell’intervallo, entità della condizione ambientale, eventi, diagnostica e indicazioni esterne facoltative; i client non calcolano una seconda interpretazione. Se la temperatura attuale manca o non è aggiornata, Velair può ancora mostrare una lettura attuale dell’umidità ma non la classifica né produce indicazioni sull’umidità finché non può calcolare l’intervallo effettivo.

La modalità guidata richiede una fonte di umidità identificabile da Velair, dal dispositivo gestito oppure da un sensore Home Assistant selezionato. L’opzione resta indisponibile finché non ne viene identificata una. Se quella fonte non è temporaneamente disponibile, Velair conserva il modello e le impostazioni selezionati e attende dati attuali invece di cambiare modello.

I due intervalli personalizzati di umidità agli estremi possono aumentare, diminuire o restare uguali al cambiare della temperatura. Velair non impone una direzione perché edifici e occupanti sono diversi. Il modello guidato è la scelta compatta quando la stessa percentuale di umidità relativa non va trattata allo stesso modo a ogni temperatura. Usa quello personalizzato solo quando il comportamento misurato della stanza offre un motivo chiaro per controllare entrambi gli estremi.

Prima di personalizzare gli intervalli agli estremi, cambiare l’intervallo di umidità del modello Semplice li mantiene entrambi allineati. Una volta personalizzato un intervallo dipendente dalla temperatura, Velair lo conserva passando fra i modelli, così non perdi una configurazione alternativa.

<a id="additional-environmental-information"></a>
## Informazioni ambientali aggiuntive

La configurazione di comfort può aggiungere facoltativamente tre letture alle informazioni che Velair possiede già per un dispositivo gestito:

| Lettura | Cosa aggiunge in Velair |
| --- | --- |
| **Punto di rugiada** | Un’indicazione compatta di quanto l’aria sia vicina alle condizioni di condensazione. Non stabilisce che si formerà condensa, perché Velair non conosce la temperatura di pareti, finestre o altre superfici. |
| **Umidità assoluta** | La massa di vapore acqueo per metro cubo d’aria, mostrata in `g/m³`. A differenza dell’umidità relativa, non è espressa come percentuale della saturazione dell’aria. Velair non vi applica un intervallo universale buono/cattivo. |
| **Humidex** | Un valore aggiuntivo di calore percepito, derivato da temperatura e umidità. Velair mostra il valore ma non trasforma le sue fasce pubblicate in raccomandazioni e non lo usa come punteggio completo del comfort interno. |

Abilita solo le letture utili alla dashboard o alle automazioni. Non sono necessarie per la normale condizione di comfort e sono tutte disabilitate per impostazione predefinita.

La vista espansa del dispositivo separa le informazioni attuali dai controlli di configurazione. Le letture abilitate compaiono in un gruppo compatto e adattabile direttamente sotto la mappa temperatura/umidità e la scala CO2. Ogni elemento contiene il valore attuale o lo stato di disponibilità e un aiuto informativo accessibile; non contiene mai un interruttore o un selettore di fonte. Le letture disabilitate non lasciano schede visive o spazi della griglia vuoti.

Tutti i controlli sono raggruppati in **Configurazione comfort**, chiusa per impostazione predefinita per mettere in primo piano la valutazione attuale. Le sezioni compatte separano fonti dei dati, modello di comfort, preferenze del modello, raccomandazioni e informazioni ambientali aggiuntive. I controlli delle misure derivate contengono solo l’interruttore di abilitazione e la scelta della fonte, non una lettura attuale duplicata. Il pannello di configurazione resta disponibile quando il monitoraggio Comfort è disabilitato, così puoi preparare un dispositivo prima di abilitarlo. Aprirlo o chiuderlo è una scelta locale dell’interfaccia e non viene salvata nella configurazione.

Ogni misura è disabilitata per impostazione predefinita e ha un solo selettore della fonte. La prima opzione è **Calculated by Velair**; le altre sono sensori Home Assistant compatibili, quindi una lettura esterna non richiede un secondo controllo dell’entità:

- **Calculated by Velair** usa le letture effettive di temperatura e umidità del comfort già scelte per quel dispositivo. Se l’umidità non è monitorata o manca uno degli input, la lettura calcolata viene segnalata come mancante.
- **Home Assistant entity** legge un’entità `sensor.*` esistente. Può provenire da Thermal Comfort, da un template o da un’altra integrazione; Thermal Comfort non è richiesto né rilevato in modo speciale.

Un sensore esterno di punto di rugiada deve pubblicare `°C` o `°F`. Velair lo mostra nell’unità di temperatura del dispositivo gestito. Un sensore di umidità assoluta deve pubblicare `g/m³` o `mg/m³`; Velair mostra `g/m³`. Un sensore Humidex può pubblicare la comune rappresentazione `°C` o `°F` usata dalle entità di classe temperatura, oppure un valore senza unità. Velair lo normalizza al valore Humidex canonico senza unità, anche nelle installazioni Fahrenheit. Velair normalizza le letture valide e segnala fonti mancanti, non aggiornate o non valide senza cambiare la condizione ambientale o la qualità dei dati esistenti. Una misura esterna abilitata può essere salvata senza avere ancora selezionato un’entità; questo stato incompleto valido viene segnalato come mancante e sopravvive a esportazione/importazione. Gli stati Home Assistant `unknown` e `unavailable` sono mancanti, mentre valori non numerici, unità incompatibili e umidità assoluta negativa non sono validi.

Queste misure sono osservative. Non cambiano mai programmazione, modalità HVAC, obiettivo, regolazione Room Assist o decisione di precondizionamento. In particolare, Humidex integra le letture reali di temperatura e umidità senza sostituirle, evitando di contare due volte l’umidità.

<a id="comfort-insights"></a>
## Indicazioni di comfort

Velair mantiene la condizione configurata di temperatura/umidità come riepilogo principale e raggruppa schede compatte di contesto sopra le letture. Spiegano superamenti delle soglie CO2, un aumento significativo di Humidex e qualsiasi opportunità o compromesso attuale di ventilazione, senza ripetere la condizione né sostituire la mappa o la scala CO2.

La formulazione è prudente. Humidex compare come indicazione solo quando il calore percepito supera la temperatura dell’aria di almeno 1 °C. Anche CO2 elevata o scarsa qualità dell’aria possono aggiungere un’indicazione. Punto di rugiada e umidità assoluta restano letture utili invece di messaggi permanenti: i pulsanti informazioni spiegano rispettivamente la soglia potenziale di condensazione sulle superfici e la quantità di vapore acqueo. L’aiuto è disponibile passando il puntatore, tramite focus da tastiera o tocco sugli schermi tattili. Le letture mancanti, non aggiornate e non valide vengono ignorate. I dati esterni non cambiano la condizione interna o il controllo climatico.

I valori attuali compaiono nella riga espansa del dispositivo nella scheda **Comfort**. La vista Lovelace Comfort usa la stessa presentazione. Quando Comfort è abilitato in una scheda Velair per un solo dispositivo, il riepilogo espanso include ogni lettura derivata abilitata e attuale. L’editor della scheda può includere quelle letture anche nella riga Comfort compressa dello stato attuale quando serve più densità di informazioni. Le letture mancanti, non aggiornate e non valide restano visibili nella vista Comfort con il loro stato, anziché mostrare numeri vecchi o inventati. Humidex viene mostrato accanto alla temperatura ambiente con un confronto direzionale; in Fahrenheit viene scalata solo la differenza, senza mai aggiungere 32. Le differenze compaiono anche nel messaggio Humidex contestuale, nell’unità della zona e con una cifra decimale. Humidex stesso è un indice di calore apparente senza unità, con riferimento Celsius: non è una temperatura fisica e Velair non aggiunge un’unità al suo valore.

Quando Humidex è attuale, il suo pannello mostra anche una scala di confronto compatta. I due marcatori identificano temperatura dell’aria della stanza e Humidex, mentre la fascia evidenziata è l’intervallo di temperatura configurato per quel dispositivo. Lo stato indica se Humidex è sotto, dentro o sopra quell’intervallo; non afferma che la stanza sia confortevole o pericolosa. La scala si estende di 5 °C sotto e sopra l’intervallo configurato per rendere leggibili le differenze vicine. In Fahrenheit, le etichette assolute della scala vengono convertite normalmente mentre la differenza viene solo moltiplicata per `9 / 5`; il numero Humidex resta senza unità. Dati mancanti o non validi non mostrano posizioni inventate. Il punto di rugiada viene descritto in modo neutro come superiore o inferiore all’aria della stanza. L’umidità assoluta resta una lettura neutra in `g/m³`. Le definizioni restano nei pulsanti informazioni accessibili per mantenere compatti i pannelli.

Il riepilogo principale inizia sempre dalla condizione ambientale fisica, usando le letture configurate di temperatura e umidità. Quando Humidex è abilitato e occupa una posizione diversa dalla temperatura dell’aria rispetto all’intervallo, un secondo indicatore **Humidex** mostra se il calore percepito è sotto, dentro o sopra l’intervallo configurato. La condizione fisica resta così visibile invece di essere sostituita da un’interpretazione derivata. Il pannello Humidex spiega la differenza misurata senza definire la stanza calda, fredda o confortevole. Dati derivati mancanti o non validi non cambiano mai la condizione fisica.

Il valore compatibile della condizione ambientale descritto sotto non cambia. Le automazioni esistenti possono continuare a usarlo; Humidex e il riepilogo dell’intervallo aggiungono contesto osservativo e non controllano mai il dispositivo climatico.

<a id="indoor-vs-outdoor"></a>
## Interno ed esterno

Il confronto esterno facoltativo aggiunge contesto senza cambiare la condizione Comfort interna. Abilita **Indoor vs outdoor** (confronto interno/esterno) nel pannello chiuso **Configurazione comfort**, seleziona esplicitamente un sensore di temperatura esterna e, se vuoi, un sensore di umidità esterna. Disattivare il confronto conserva le scelte dei sensori per poterlo riabilitare senza riconfigurare.

Il pannello dello stato resta separato dal grafico. Mostra temperatura interna ed esterna con la differenza, umidità assoluta interna ed esterna e l’umidità relativa che l’aria esterna avrebbe dopo aver raggiunto la temperatura interna attuale. Le due aree sono simmetriche su schermi più larghi e disposte una sotto l’altra su mobile.

Entrambi i valori di umidità assoluta provengono direttamente dal backend. Se un backend precedente non fornisce il valore interno, l’interfaccia lo mostra come non disponibile invece di ricostruire una lettura fisica da differenze arrotondate.

Velair può mostrare una sola opportunità o un solo compromesso di ventilazione prudente, fornito dal backend, nell’area condivisa delle indicazioni sopra le letture. Un’opportunità basata solo sulla temperatura indica esplicitamente che l’effetto sull’umidità non è disponibile. Le letture mancanti, non aggiornate, non valide e non monitorate compaiono come stati anziché valori riutilizzati o confronti falsi.

Velair crea inoltre un sensore enumerato **Opportunità di ventilazione** per ciascun dispositivo gestito. Mantiene disponibile il risultato attuale per dashboard e automazioni dopo il riavvio senza cambiare lo stato compatibile della condizione ambientale. Consulta [Opportunità di ventilazione](zone-sensors.it.md#ventilation-opportunity).

**Ventilation guidance**, nello stesso pannello di configurazione, permette di scegliere per ogni dispositivo quanto debba essere grande una differenza utile prima che Velair mostri quel contesto:

| Impostazione | Valore predefinito | Cosa filtra |
| --- | --- | --- |
| Differenza di temperatura | `1 °C` / `1.8 °F` | Piccole differenze di temperatura fra interno ed esterno. |
| Differenza di umidità corretta | `5` punti percentuali | Piccole variazioni previste dell’umidità relativa dopo che l’aria esterna raggiunge la temperatura interna. |
| Differenza di vapore nell’aria | `1 g/m³` | Piccole differenze di umidità assoluta che potrebbero altrimenti sembrare utili per effetto della sola temperatura. |

I controlli dell’umidità compaiono dopo la selezione di un sensore di umidità esterna. I valori vengono conservati se il sensore o il confronto viene poi disabilitato. Valori inferiori rendono le indicazioni più sensibili; valori superiori richiedono una differenza più evidente. Questi margini non sostituiscono gli intervalli di comfort configurati: l’aria esterna deve comunque portare la stanza verso l’intervallo pertinente.

Questa funzione è visiva e basata su eventi. Non apre o chiude finestre e non cambia obiettivo, modalità, programmazione, pausa o incremento del dispositivo climatico. Velair usa solo le entità `sensor.*` selezionate e non ricorre ai dati meteorologici come alternativa.

Velair non crea tre entità sensore proxy aggiuntive. Le letture abilitate sono disponibili nell’attributo `derived_metrics` del sensore esistente di zona **Condizione ambientale**, nell’API delle programmazioni, nella diagnostica e nell’evento `comfort_assessment_changed`. Mantiene così un’unica fonte di riferimento, consentendo comunque a dashboard e automazioni di usare i dati. Consulta [Condizione ambientale](zone-sensors.it.md#environmental-condition) per stati completi, attributi, template difensivi e indicazioni su quando scegliere l’entità o l’evento per un’automazione.

<a id="environmental-conditions"></a>
## Condizioni ambientali

Temperatura e umidità vengono classificate rispetto agli intervalli configurati e combinate in un’unica condizione ambientale compatibile:

| Temperatura | Umidità | Condizione |
| --- | --- | --- |
| Sotto l’intervallo | Sotto l’intervallo | `Freddo e secco` |
| Sotto l’intervallo | Nell’intervallo | `Freddo` |
| Sotto l’intervallo | Sopra l’intervallo | `Freddo e umido` |
| Nell’intervallo | Sotto l’intervallo | `Aria secca` |
| Nell’intervallo | Nell’intervallo | `Confortevole` |
| Nell’intervallo | Sopra l’intervallo | `Umido` |
| Sopra l’intervallo | Sotto l’intervallo | `Caldo e secco` |
| Sopra l’intervallo | Nell’intervallo | `Caldo` |
| Sopra l’intervallo | Sopra l’intervallo | `Caldo e umido` |

Quando è disponibile una sola misura utile, Velair segnala ciò che può stabilire senza affermare un comfort completo:

- `Temperatura nell'intervallo`;
- `Umidità nell'intervallo`;
- `Freddo`, `Caldo`, `Aria secca` o `Umido`.

Se non esiste alcuna lettura ambientale utile, la condizione viene mostrata come `Nessuna lettura`. Quando tutte le fonti monitorate non sono aggiornate, viene mostrata come `Letture obsolete`.

<a id="air-quality"></a>
## Qualità dell’aria

La CO2 resta separata da temperatura e umidità perché descrive la qualità dell’aria invece del comfort termico:

- `Buona aria`: sotto la soglia di attenzione;
- `CO2 elevata`: alla soglia di attenzione o sopra di essa;
- `Scarsa qualità dell'aria`: alla soglia di qualità scarsa o sopra di essa;
- `CO2 non disponibile`: una fonte CO2 configurata non può essere letta al momento.

Una stanza può quindi mostrare, per esempio, `Caldo e umido` insieme a `CO2 elevata`.

<a id="data-quality"></a>
## Qualità dei dati

Velair espone un unico valore di qualità dei dati:

- `complete`: ogni misura monitorata ha una lettura attuale supportata da una segnalazione recente di Home Assistant;
- `unverified`: ogni misura monitorata è utilizzabile, ma almeno una lettura non ha un orario di segnalazione verificabile;
- `partial`: è disponibile una valutazione, ma almeno una lettura monitorata manca o non è aggiornata;
- `stale`: non esiste una lettura attuale e tutte le fonti monitorate non sono aggiornate;
- `unavailable`: nessuna lettura attuale è utilizzabile per un altro motivo.

La scheda Comfort raggruppa le letture utilizzabili con aggiornamento non verificabile accanto ai selettori dei sensori in **Configurazione → Fonti dei dati**. Una spiegazione discreta identifica le letture interessate e chiarisce che un’ora di misurazione sconosciuta non significa valori errati o stanza non confortevole. Panoramica e schede Lovelace omettono questo stato ordinario; Diagnostica conserva il contesto tecnico dell’aggiornamento. È una configurazione automatica valida con fonte dal dispositivo, non un errore. Le letture mancanti o scadute mostrano ancora un avviso nell’elenco delle zone.

<a id="visual-status"></a>
## Stato visivo

La riga compressa del dispositivo mostra:

- la condizione ambientale;
- un indicatore Humidex separato solo quando temperatura attuale e Humidex occupano parti diverse dell’intervallo configurato;
- indicatori facoltativi delle letture derivate per Humidex, punto di rugiada e umidità assoluta quando l’editor della scheda per un solo dispositivo abilita letture aggiuntive compresse;
- la qualità dell’aria quando la CO2 è monitorata;
- un’icona di avviso quando le letture sono incomplete;
- l’interruttore di attivazione di Comfort.

Lo stato espanso in tempo reale usa:

- la stessa condizione ambientale fisica come intestazione principale;
- una mappa temperatura/umidità quando entrambe le letture sono attuali;
- una sola scala orizzontale quando è attuale solo temperatura o umidità;
- una scala CO2 separata quando la CO2 è monitorata e attuale.

La mappa temperatura/umidità usa nove regioni discrete per freddo, caldo, secco, umido e condizioni combinate. L’obiettivo evidenziato segue sempre il modello scelto: rettangolo per Semplice, curva calcolata dal backend per Guidato e poligono configurato per Personalizzato. Un piccolo marcatore mostra la posizione attuale e la sua etichetta contiene entrambe le letture.

Nelle scale a misura singola, la sezione verde centrale è l’intervallo di comfort configurato. Le etichette di minimo e massimo sono allineate all’inizio e alla fine della sezione; quelle esterne contestualizzano le letture sotto o sopra l’intervallo.

<a id="lovelace"></a>
## Lovelace

La vista Comfort è disponibile come scheda Lovelace:

```yaml
type: custom:velair-card
view: comfort
```

La scheda può essere limitata ai dispositivi gestiti selezionati:

```yaml
type: custom:velair-card
view: comfort
entities:
  - climate.living_room
  - climate.bedroom
```

Può anche nascondere sezioni locali dell’interfaccia quando la dashboard deve concentrarsi solo sulle letture di interesse:

```yaml
type: custom:velair-card
view: comfort
show_comfort_configuration: false
show_comfort_temperature: true
show_comfort_humidity: false
show_comfort_co2: true
```

Le opzioni `show_comfort_*` omesse sono `true` per impostazione predefinita. Quando `show_comfort_configuration` è `false`, la scheda nasconde l’intero pannello di configurazione ma mantiene le letture derivate abilitate nella valutazione visiva.

Le opzioni di visibilità di temperatura, umidità e CO2 influiscono solo sui grafici mostrati in quella scheda Lovelace. Non cambiano configurazione Comfort, scelta delle fonti, soglie, eventi di automazione o sensori Home Assistant. Se temperatura e umidità sono entrambe visibili ma esiste una sola lettura attuale, la scheda usa la stessa scala a misura singola del pannello principale di Velair.

<a id="freshness"></a>
## Aggiornamento delle letture

`Considera obsoleto dopo` è il tempo massimo da quando un sensore selezionato ha comunicato l’ultimo stato a Home Assistant (`last_reported`). Ripetere lo stesso valore aggiorna l’orario della segnalazione e mantiene attuale la lettura. Velair ascolta quelle segnalazioni e pianifica la scadenza successiva, così pannello, sensori ed eventi possono mostrare `stale` quando il termine passa senza una nuova segnalazione.

L’impostazione resta nella propria sezione **Freschezza dei dati**, dopo i controlli delle fonti. Elenca le fonti dirette coperte dal limite, inclusi Room Assist, CO2, sensori esterni o metriche derivate esterne. La spiegazione delle letture con aggiornamento non verificabile appare accanto ai selettori dei sensori, incluse metriche derivate abilitate e letture esterne. I sensori esterni possono mantenere attivo il limite anche se temperatura e umidità interne provengono dal dispositivo; il limite non fa scadere queste letture. Puoi impostarlo prima di abilitare Comfort. Senza una fonte diretta configurata, il campo è disabilitato con una spiegazione; il valore salvato resta per una futura selezione.

Gli attributi automatici di temperatura e umidità `climate.*` non hanno un orario di segnalazione indipendente. Velair mantiene visibile un valore valido e ne indica l’aggiornamento come `unverified`; cambiare l’obiettivo climatico non verifica una nuova misura. Scegli il sensore originale di temperatura o umidità quando disponibile. Se un sensore selezionato non ha `last_reported`, anche il suo valore valido è `unverified`. Un’entità `unavailable` o `unknown` non può fornire una lettura utilizzabile, anche se conserva vecchi attributi numerici.

Una segnalazione Home Assistant non dimostra che il sensore fisico abbia effettuato un nuovo campionamento. Un’integrazione che comunica solo variazioni del valore verrà prima o poi segnalata come non aggiornata quando il valore resta costante.

<a id="automation-event"></a>
## Evento per le automazioni

Quando cambia lo stato semantico della condizione ambientale, della qualità dell’aria, della qualità dei dati, dei problemi dei dati o di una misura derivata abilitata, Velair emette:

```yaml
event_type: velair_event
event_data:
  event: comfort_assessment_changed
```

Esempio di dati dell’evento:

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

Esempio di automazione:

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

Aprire o aggiornare il pannello non emette un evento di automazione. Le variazioni numeriche nelle letture originali o derivate non emettono duplicati finché classificazioni semantiche e disponibilità restano invariate. Il pannello e gli attributi dei sensori Home Assistant si aggiornano comunque con gli ultimi valori.

Usa `range_status_changed: true` quando un’automazione deve reagire solo ai cambiamenti dello stato complessivo dell’intervallo configurato. Usa `range_summary_changed: true` quando contano anche le variazioni delle singole posizioni o della loro relazione termica. Altri cambiamenti Comfort possono emettere lo stesso evento con entrambi i flag a `false`; i riepiloghi attuale e precedente rendono esplicita la transizione.

Consulta [Eventi per le automazioni](automation-events.it.md#comfort-assessment-changed) per dati completi, campi derivati precisi che partecipano a quello stato semantico e schema condiviso del trigger `velair_event`.

<a id="performance-and-privacy"></a>
## Prestazioni e privacy

Comfort è disabilitato per impostazione predefinita.

Quando è disabilitato per un dispositivo, Velair non registra listener Comfort per quel dispositivo. Quando è abilitato, ascolta solo il dispositivo gestito e le entità sensore selezionate o risolte automaticamente, incluse le fonti esterne attive delle misure derivate. Le misure derivate native riutilizzano i listener esistenti di temperatura e umidità. Non ci sono interrogazioni periodiche continue.

Tutte le letture e le valutazioni restano locali all’interno di Home Assistant.
