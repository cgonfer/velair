<a id="room-assist"></a>
# Room Assist
<!-- velair-docs:start -->
Traduzioni: [Originale in inglese](room-assist.md) · [Español](room-assist.es.md) · [Français](room-assist.fr.md) · [Deutsch](room-assist.de.md) · [Italiano](room-assist.it.md) · [Nederlands](room-assist.nl.md) · [Polski](room-assist.pl.md) · [Português (Brasil)](room-assist.pt-br.md) · [Português (Portugal)](room-assist.pt-pt.md) · [Русский](room-assist.ru.md) · [Stato delle traduzioni](../translation-status.md)

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

Room Assist permette a Velair di usare un sensore separato di temperatura ambiente per un dispositivo gestito, continuando a controllare la vera entità `climate.*`.

È utile per valvole termostatiche, valvole dei radiatori, termostati a parete o climatizzatori la cui lettura integrata non rappresenta la temperatura reale della stanza. Per esempio, una valvola accanto al radiatore può segnalare `22 °C` mentre il sensore ambiente segnala ancora `20.5 °C`.

Tutti i calcoli usano l’unità nativa Home Assistant dell’entità gestita. Gli esempi usano Celsius per leggibilità, ma gli stessi limiti di isteresi, correzione con segno, protezione dell’obiettivo programmato, ampiezza dell’intervallo, passo e limiti fisici si applicano direttamente in Fahrenheit. Per esempio, un errore ambiente di `4 °F` è una correzione di `4 °F`: non viene trattato come temperatura assoluta e non riceve l’offset Celsius-Fahrenheit.

Room Assist è locale e basato su eventi. Velair non interroga continuamente i sensori e non invia dati fuori da Home Assistant.

<a id="what-it-does"></a>
## Cosa fa

Velair mantiene l’obiettivo programmato come vero obiettivo dell’utente, ma corregge temporaneamente quello inviato all’entità climatica usando il sensore ambiente separato e la lettura del dispositivo.

Per un obiettivo singolo in `heat` o `cool` fisso, una fascia di tolleranza diversa da zero crea due limiti di commutazione. Room Assist ricorda verso quale limite si sta dirigendo e cambia direzione solo quando il sensore ambiente separato raggiunge il limite opposto. Questo crea un vero ciclo di isteresi del sensore ambiente separato, anziché permettere al sensore interno di avviare un nuovo ciclo vicino all’obiettivo centrale. Il delta massimo di assistenza limita la correzione con segno calcolata dal limite attivo.

Gli obiettivi singoli `auto` e `heat_cool` e gli intervalli nativi `heat_cool` mantengono il comportamento neutro o di margine dell’intervallo. Velair non forza queste modalità ad alternare attivamente riscaldamento e raffrescamento attraverso un ciclo di isteresi a obiettivo singolo.

L’entità climatica resta l’attuatore. Velair non crea un’entità climatica virtuale e non aggira il firmware. Se termostato o valvola permettono il collegamento diretto di un sensore ambiente separato, questa opzione nativa del dispositivo resta normalmente la scelta preferibile.

<a id="setup"></a>
## Configurazione

1. Apri la scheda Room Assist.
2. Espandi il dispositivo da configurare.
3. Seleziona un sensore di temperatura ambiente.
4. Abilita l’assistenza con sensore ambiente.
5. Regola **Banda morta di Room Assist**, cioè la fascia di tolleranza, per impostare i limiti inferiori e superiori di commutazione nel riscaldamento o raffrescamento fisso, o il margine neutro per modalità automatiche e intervalli nativi.
6. Regola **Delta assistenza massimo** se il valore predefinito è troppo piccolo per la stanza o inferiore alla differenza di obiettivo necessaria al termostato per interrompere riscaldamento o raffrescamento.
7. Regola **Ritardo aggiornamento** se gli aggiornamenti del sensore sembrano troppo lenti o troppo frequenti.

Selezionare solo un sensore ne salva soltanto la scelta. Velair lo usa come temperatura ambiente effettiva solo quando l’assistenza è abilitata.

L’assistenza con sensore ambiente non richiede il precondizionamento adattivo. Può operare sui normali blocchi e su quelli avviati anticipatamente dal precondizionamento adattivo.

Un blocco di temperatura con **Mantieni la modalità corrente** applica comunque il proprio obiettivo. Room Assist usa la modalità realmente attiva; se il dispositivo è spento, Velair lo avvia in una modalità compatibile supportata. **Mantieni la modalità corrente** non significa «mantieni invariato l’obiettivo del termostato» per un blocco di temperatura. Un blocco di sole opzioni non ha obiettivo, quindi Room Assist non interviene.

Il ritardo di aggiornamento è il debounce applicato dopo una variazione del sensore ambiente o della temperatura del dispositivo. Il valore predefinito è `20` secondi. Imposta `0` per il ricalcolo immediato o fino a `300` secondi per raggruppare aggiornamenti frequenti.

La fascia di tolleranza Room Assist è indipendente dal delta minimo del precondizionamento adattivo. Il valore predefinito è `0.3 °C` o `1 °F`, accetta `0` per disabilitarla ed è configurabile a passi di `0.1` gradi fino a `5 °C` o `9 °F`. Salvarla durante l’assistenza aggiorna subito l’obiettivo assistito.

La scala in tempo reale disegna la tolleranza configurata come fascia neutra a righe. Per un obiettivo singolo fisso, i due estremi sono i limiti di commutazione dell’isteresi e lo stato identifica il limite verso cui si dirige Room Assist. Per modalità automatiche singole, la fascia resta un margine neutro. Per un intervallo nativo `heat_cool`, va dal limite inferiore meno la tolleranza a quello superiore più la tolleranza. La scala si espande per mantenere visibili entrambi gli estremi. La legenda tradotta completa resta centrata sull’intervallo reale anche se più stretta del testo, così il significato non cambia con la larghezza del grafico. La spiegazione completa resta disponibile alle tecnologie assistive e al passaggio del puntatore. Con tolleranza `0` non viene disegnata una superficie e la legenda dichiara esplicitamente l’assenza di tolleranza. Grafico e legenda seguono il valore salvato dal backend; nascondere `show_room_assist_deadband` in una scheda Lovelace nasconde insieme impostazione, fascia e legenda.

Aggiornando da una versione in cui Room Assist condivideva il delta minimo del precondizionamento adattivo, Velair copia una volta il valore esistente nella nuova tolleranza Room Assist. Preserva l’ampiezza già configurata, incluso un valore storico non allineato al nuovo passo di input di 0,1 gradi; `heat` e `cool` fissi usano poi quel valore nel ciclo di isteresi descritto sotto. Dopo la migrazione le impostazioni sono indipendenti: modificarne una non cambia l’altra. Una zona nuova o ripristinata usa il valore predefinito legato all’unità indicato sopra.

<a id="understanding-the-live-status"></a>
## Comprendere lo stato in tempo reale

La scheda Room Assist indica cosa può fare attualmente Velair per ogni dispositivo, anziché richiedere di dedurlo dall’obiettivo del termostato:

| Stato | Significato |
| --- | --- |
| **Non configurato** | Nessun sensore ambiente separato selezionato. |
| **Disabilitato** | È salvato un sensore ambiente, ma Room Assist è spento. |
| **Inattivo** | È abilitato, ma non c’è un blocco di temperatura compatibile attivo o un calcolo utilizzabile. |
| **Pronto** | Velair ha letture e obiettivo necessari, ma non ha ancora applicato un obiettivo assistito. |
| **Assistenza attiva** | Velair ha applicato un obiettivo temporaneo corretto o un intervallo spostato. |
| **Mantenimento** | Room Assist mantiene neutro un obiettivo singolo automatico, mantiene un intervallo nativo o la protezione mantiene l’obiettivo sul lato sicuro. Un ciclo fisso `heat` o `cool` può restare in **Assistenza attiva** attraversando la fascia di tolleranza. |
| **Bloccato** | Pausa, incremento, stato manuale o altro stato del pianificatore ha la priorità. |
| **Non disponibile** | Il dispositivo o la capacità richiesta dell’obiettivo non è utilizzabile al momento. L’interfaccia mostra il motivo quando noto. |

Quando Room Assist è attivo, la panoramica sintetizza in **Verso il limite inferiore**, **Verso il limite superiore**, **Attivo**, **Mantenimento** o **Protezione programmata**, secondo il caso, mostrando valori programmati e applicati. Il minimo o massimo del termostato è diverso dalla protezione programmata: la scheda Room Assist mostra un avviso con valori richiesti, applicati e supportati, e Home Assistant riceve una sola notifica persistente finché quel limite fisico non si risolve.

<a id="fixed-heating-hysteresis-example"></a>
## Esempio di isteresi nel riscaldamento fisso

Situazione:

- Blocco programmato: `21 °C`, `heat`
- Tolleranza Room Assist: `±0.3 °C`
- Limite inferiore: `20.7 °C`
- Limite superiore: `21.3 °C`
- Delta massimo di assistenza: `2 °C`
- Passo di temperatura del dispositivo: `0.1 °C`

Il ciclo procede così:

1. Sensore ambiente e dispositivo segnalano entrambi `21.0 °C`. Essendo un nuovo ciclo di riscaldamento fisso dentro la fascia, Velair avvia il ciclo in modo sicuro **verso il limite inferiore**.
2. L’obiettivo attivo dell’isteresi è `20.7 °C`. La correzione viene calcolata da quel limite, non dall’obiettivo centrale programmato di `21 °C`:

   ```text
   correction = 20.7 - 21.0 = -0.3 °C
   climate target = 21.0 + (-0.3) = 20.7 °C
   ```

   È un obiettivo volutamente senza richiesta di riscaldamento, soggetto a passo e limiti fisici del dispositivo.
3. Se la stanza passa per `20.9 °C`, Velair resta nella stessa fase. Non richiede calore solo perché ha attraversato l’obiettivo centrale di `21 °C`.
4. Quando il sensore ambiente rileva `20.7 °C`, Velair passa **verso il limite superiore** a `21.3 °C`.
5. Supponiamo che la stanza sia a `20.7 °C` e il sensore del dispositivo a `20.5 °C`. La nuova correzione richiede calore:

   ```text
   correction = 21.3 - 20.7 = +0.6 °C
   climate target = 20.5 + 0.6 = 21.1 °C
   ```

6. Velair continua a mirare al limite superiore mentre la stanza passa per `21.0 °C`. A `21.3 °C` torna verso `20.7 °C`, applica una correzione negativa e ripete il ciclo.

L’obiettivo visibile della programmazione resta `21 °C`. Quello temporaneo è solo il valore inviato al termostato. Se la correzione supera il delta massimo di assistenza, Velair la limita prima di aggiungerla alla lettura attuale del dispositivo.

La fase della modalità fissa esiste solo in esecuzione. Un nuovo blocco, obiettivo o modalità HVAC, la cancellazione di Room Assist o il ricaricamento di Velair avvia un nuovo ciclo. Un nuovo ciclo `heat` dentro la fascia parte verso il limite inferiore per non richiedere subito calore.

Quando questa protezione cambia il risultato, lo stato Room Assist spiega entrambi i valori. Identifica l’obiettivo calcolato e quello realmente mantenuto da Velair, mentre la panoramica mostra lo stato compatto `Protezione programmata`. È normale protezione, non un errore del termostato, quindi non genera una notifica persistente. I limiti fisici continuano a usare avviso e notifica separati.

Il dispositivo resta responsabile di protezione del compressore, tempi minimi di funzionamento e risposta fisica. Il ciclo di isteresi offre una strategia di obiettivi più robusta, ma non garantisce il momento esatto del cambio di stato di relè, valvola o compressore.

<a id="heating-with-a-capped-delta"></a>
## Riscaldamento con delta limitato

Situazione:

- Blocco programmato: `25 °C`, `heat`
- Sensore ambiente: `18 °C`
- Temperatura attuale del dispositivo: `17.1 °C`
- Tolleranza Room Assist: `0 °C` (correzione precedente con segno)
- Delta massimo di assistenza: `5 °C`

La differenza reale della stanza è grande:

```text
25 - 18 = 7 °C
```

Velair limita il delta di assistenza al valore configurato:

```text
assist delta = 5 °C
climate target = 17.1 + 5 = 22.1 °C
```

Con un passo di `0.5 °C`, l’obiettivo di riscaldamento viene arrotondato per difetto a `22 °C`.

Questo impedisce di inviare obiettivi irrealistici mantenendo il termostato sufficientemente attivo per riscaldare la stanza.

<a id="fixed-cooling-hysteresis-example"></a>
## Esempio di isteresi nel raffrescamento fisso

Situazione:

- Blocco programmato: `24 °C`, `cool`
- Tolleranza Room Assist: `±0.5 °C`
- Limite inferiore: `23.5 °C`
- Limite superiore: `24.5 °C`
- Delta massimo di assistenza: `2 °C`
- Passo di temperatura del dispositivo: `0.5 °C`

Il raffrescamento è simmetrico, ma un nuovo ciclo dentro la fascia inizia in modo sicuro **verso il limite superiore**, per non richiedere subito raffrescamento:

1. Con entrambi i sensori a `24.0 °C`, il limite attivo è `24.5 °C`:

   ```text
   correction = 24.5 - 24.0 = +0.5 °C
   climate target = 24.0 + 0.5 = 24.5 °C
   ```

   Alzare l’obiettivo del raffrescamento fisso scoraggia il raffrescamento.
2. La fase resta invariata mentre la stanza attraversa la fascia. Quando il sensore ambiente separato raggiunge `24.5 °C`, Velair passa verso `23.5 °C`.
3. Se la stanza è poi a `24.5 °C` e il dispositivo segnala `25.0 °C`:

   ```text
   correction = 23.5 - 24.5 = -1.0 °C
   climate target = 25.0 - 1.0 = 24.0 °C
   ```

   Questo richiede raffrescamento.
4. Velair continua a mirare al limite inferiore mentre la stanza passa per `24.0 °C`. A `23.5 °C` torna verso `24.5 °C` e ripete.

Allineamento al passo e limiti fisici si applicano ancora a ogni obiettivo temporaneo. Il firmware gestisce sempre il ciclo effettivo di raffrescamento.

<a id="how-legacy-inversion-and-scheduled-protection-work-together"></a>
## Come interagiscono l’inversione precedente e la protezione programmata

L’inversione con segno e la protezione dell’obiettivo programmato risolvono due aspetti dello stesso problema. L’inversione cambia la direzione della correzione quando la temperatura ambiente supera l’obiettivo. La protezione programmata è il limite finale di sicurezza quando quella correzione inversa lascia ancora un obiettivo fisso sul lato che richiede attività termica rispetto alla programmazione.

Gli esempi seguenti usano una programmazione di raffrescamento a `22 °C`, tolleranza `0 °C`, passo `0.5 °C` e delta massimo abbastanza grande da non limitare il calcolo. Le colonne «senza inversione» e «prima della protezione» sono valori intermedi esplicativi, non modalità Room Assist selezionabili.

| Sensore ambiente | Lettura del dispositivo | Senza inversione dopo il superamento | Risultato con segno prima della protezione | Obiettivo finale | Motivo |
| --- | --- | --- | --- | --- | --- |
| `24 °C` | `25.1 °C` | Non applicabile | `23.5 °C` | `23.5 °C` | La stanza richiede ancora raffrescamento. |
| `21 °C` | `19 °C` | `19 °C` | `20 °C` | `22 °C` | L’inversione alza l’obiettivo, ma richiederebbe ancora raffrescamento: si applica il limite inferiore programmato. |
| `21 °C` | `25 °C` | `25 °C` | `26 °C` | `26 °C` | L’obiettivo inverso più forte è già in sicurezza sopra la programmazione, quindi viene conservato. |

Il riscaldamento è simmetrico. Con una programmazione a `20 °C`, lettura esterna `21 °C` e interna `24 °C`, il risultato con segno è `23 °C`; la protezione applica invece il limite superiore programmato `20 °C`. Se la temperatura ambiente è a `24 °C` e la lettura interna a `21.5 °C`, il risultato inverso più forte è `17.5 °C`, già sicuro e invariato.

Per questo l’inversione resta utile insieme alla protezione: può spostarsi più lontano sul lato senza richiesta termica quando la lettura del dispositivo lo permette, mentre la protezione copre i casi in cui la lettura interna si è spostata dal lato sbagliato.

Con tolleranza diversa da zero, `heat` e `cool` fissi usano il ciclo con memoria descritto sopra anziché cambiare direzione sull’obiettivo centrale. Tolleranza `0` conserva il calcolo precedente con segno: la correzione cambia segno attraversando l’obiettivo programmato e non conserva una fase di isteresi.

Anche un obiettivo singolo compatibile `auto` o `heat_cool` conserva il calcolo precedente con segno. Dentro la tolleranza Velair usa l’obiettivo supportato più vicino alla lettura del dispositivo, anziché forzare alternanza attiva di riscaldamento e raffrescamento. Un dispositivo nativo `heat_cool` mantiene entrambi i limiti dell’utente e riceve l’intero intervallo assistito descritto sotto.

<a id="device-hysteresis-and-minimum-run-time"></a>
## Isteresi del dispositivo e tempo minimo di funzionamento

Room Assist controlla l’obiettivo inviato tramite Home Assistant. Non può sostituire isteresi del firmware, protezione del compressore, tempo minimo di funzionamento o decisione su quando un obiettivo uguale venga considerato inattivo.

Per esempio, un ciclo di riscaldamento fisso verso il limite inferiore invia un obiettivo per scoraggiare il riscaldamento finché il sensore ambiente separato raggiunge quel limite. Un dispositivo con ampia isteresi interna o tempo minimo può comunque iniziare o continuare temporaneamente a riscaldare. Velair non deduce un margine di arresto specifico non documentato né esamina `hvac_action` per cambiare fase.

La protezione programmata impedisce a Velair di spostare l’obiettivo oltre la programmazione dell’utente mentre il sensore interno deriva; non promette un arresto HVAC immediato. Collegamento nativo di un sensore ambiente separato o calibrazione restano migliori quando disponibili. Usa un blocco `Off` quando serve un arresto esplicito invece del mantenimento gestito dal termostato.

Il delta massimo deve essere abbastanza grande da permettere la correzione inversa necessaria al dispositivo. L’editor mantiene questa indicazione visibile sotto il nome dell’impostazione per non perderla durante la configurazione. Per esempio:

```text
Thermostat stopping gap: 2.5 °C
Maximum assist delta:    2.0 °C  -> may be insufficient
Maximum assist delta:    3.0 °C  -> permits enough inverse correction
```

Impostare `3 °C` non applica subito una correzione di `3 °C`. Permette soltanto a Room Assist di raggiungerla quando la differenza esterna lo richiede.

<a id="why-climate-target-can-differ-from-the-calculation"></a>
### Perché l’obiettivo del dispositivo può differire dal calcolo

**Obiettivo del dispositivo** è il valore attualmente comunicato dall’entità quando Room Assist è pronto o bloccato. Durante l’assistenza o il mantenimento di un obiettivo singolo applicato, mostra invece il valore temporaneo inviato da Velair. Nessuno dei due è l’obiettivo ambiente programmato o il limite attivo dell’isteresi. Il dispositivo accetta obiettivi su una propria griglia, quindi Velair può allineare il valore finale al passo effettivo pubblicato, ultimo comunicato, manuale o predefinito.

Per esempio, nel raffrescamento fisso può calcolare `23.9 °C` per un dispositivo con passi `0.5 °C`. Applica `24.0 °C`: il raffrescamento viene allineato per eccesso per non essere più aggressivo del calcolo. Il riscaldamento fisso si allinea per difetto, le modalità automatiche singole al passo più vicino. Il pulsante informazioni accanto a **Obiettivo del dispositivo** adatta la spiegazione al valore mostrato e, quando l’allineamento ha effettivamente cambiato il valore confermato, mostra calcolo, passo effettivo e valore applicato. Limiti fisici e protezione programmata sono segnalati separatamente, non come allineamento al passo.

<a id="heatcool-range-example"></a>
## Esempio di intervallo Heat/Cool

Room Assist supporta anche intervalli nativi `heat_cool`. Tratta limiti inferiori e superiori come un’unica fascia di comfort e li sposta sempre insieme, senza cambiarne la distanza.

Situazione:

- Intervallo programmato: `19–24 °C`
- Sensore ambiente: `18 °C`
- Temperatura attuale del dispositivo: `22 °C`
- Delta massimo di assistenza: `2 °C`
- Passo di temperatura del dispositivo: `0.5 °C`

La stanza è `1 °C` sotto il limite di riscaldamento. Velair posiziona il limite inferiore `1 °C` sopra la lettura del dispositivo e sposta di altrettanto il superiore:

```text
applied range = 23–28 °C
```

Il dispositivo legge `22 °C`, quindi è sotto il limite inferiore applicato e può richiedere calore. Se la stanza sale poi sopra `24 °C`, Velair usa allo stesso modo il superiore per richiedere raffrescamento. Quando la stanza entra per la prima volta nella fascia programmata, compresa la tolleranza intorno ai limiti, Velair posiziona la fascia applicata per includere la lettura del dispositivo. Mantiene poi stabile quella fascia finché la temperatura ambiente resta dentro. Non insegue le successive variazioni del sensore interno, che può cambiare quando sono attivi compressore, ventilatore, valvola o radiatore.

L’intervallo applicato è sempre allineato al passo e spostato nel suo insieme quando raggiunge i limiti fisici. Velair non regola mai Min e Max separatamente.

Se un obiettivo singolo o intervallo calcolato supera minimo o massimo supportati, Velair applica il risultato valido più vicino. Lo stato mostra prima del grafico obiettivo richiesto, applicato e limite raggiunto. Home Assistant crea inoltre una sola notifica persistente per il limite attivo; aggiornamenti ripetuti non creano duplicati e Velair la rimuove dopo il recupero.

<a id="when-velair-does-nothing"></a>
## Quando Velair non interviene

Room Assist richiede un passo effettivo positivo valido. Usa prima `target_temp_step` pubblicato dal dispositivo gestito. Se manca, l’ultimo passo valido comunicato dall’entità protegge la stessa griglia. Segue il valore alternativo manuale per zona nelle impostazioni, predefinito a `1` se entrambi mancano. Salvare il campo mentre l’attributo manca rende prioritario quel valore esplicito cancellando l’osservazione memorizzata; una segnalazione valida successiva viene ricordata nuovamente. Velair non deduce relazioni con altre entità.

Room Assist non applica un obiettivo assistito quando:

- nessun sensore ambiente è selezionato;
- l’assistenza con sensore ambiente è disabilitata;
- il pianificatore non è automatico;
- il dispositivo è in pausa o con incremento;
- non c’è un blocco di temperatura attivo;
- il blocco è `Off`;
- temperatura del sensore o del dispositivo manca o non è numerica;
- la variazione calcolata è inferiore al passo dell’entità;
- la modalità HVAC non è interpretabile come riscaldamento o raffrescamento.

In questi casi Velair mantiene o ripristina l’obiettivo normale programmato dove è sicuro.

<a id="external-adjustments-and-manual-adjustment"></a>
## Regolazioni esterne e regolazione manuale

Con il criterio predefinito **Mantieni l'automatico**, Room Assist resta prioritario e Velair ricalcola e riapplica l’obiettivo assistito attuale dopo una modifica esterna rilevata di obiettivo o modalità HVAC. Con qualsiasi criterio manuale, Room Assist cede intenzionalmente il controllo quando la modifica porta il dispositivo in **Regolazione manuale**. Velair acquisisce lo stato esterno completo dall’evento Home Assistant, cancella la correzione attiva senza ripristinare l’obiettivo programmato e conserva l’obiettivo esterno singolo o intervallo nativo `heat_cool`. Impedisce così a Room Assist di contrastare subito una regolazione da scheda, telecomando o altra origine non-Velair.

Esempio:

```text
Scheduled cooling target: 24 °C
Room Assist temporary target: 26 °C
External adjustment: 23 °C
Result during Manual adjustment: 23 °C
```

Alla ripresa automatica, Velair risolve l’intento della programmazione o del profilo valido in quel momento. Room Assist può calcolare una nuova correzione dalle letture attuali; non recupera la vecchia correzione `26 °C` o la fase di isteresi. Ricaricare Velair o Home Assistant produce lo stesso azzeramento solo di esecuzione: il blocco attuale viene risolto nuovamente e si sceglie una nuova fase sicura da modalità e lettura ambiente attuali.

Una modifica esterna idonea mantiene il controllo automatico oppure entra/aggiorna la regolazione manuale secondo il criterio salvato del dispositivo. Per criteri, servizi, interazioni con incrementi/profili e limiti di attribuzione, consulta [Modifiche esterne e regolazione manuale](manual-control.it.md).

<a id="planned-return"></a>
## Rientro pianificato

Durante il [Rientro pianificato](planned-return.it.md), Room Assist segue l’obiettivo temporaneo di arrivo di ogni zona appena inizia la preparazione. Non continua a usare la temperatura della modalità Assenza e non vi ritorna quando cambia un suo blocco. Le altre zone seguono Assenza fino all’inizio della propria preparazione.

Per esempio, un obiettivo Assenza di 16 gradi diventa un obiettivo di arrivo di 21 gradi quando quella stanza inizia a prepararsi. Room Assist può regolare la temperatura fisica impostata per raggiungere 21 gradi sul sensore ambiente. Regolazione manuale e pause esplicite sospendono l’intervento nella zona. Una selezione esplicita di modalità/profilo annulla la preparazione anticipata dell’episodio e mantiene la selezione. Anche **Annulla** del rientro rimuove la preparazione; dopo la partenza confermata ripristina modalità e profili precedenti registrati. Consulta gli [esempi di annullamento](planned-return.it.md#cancelling-a-return-examples).

<a id="adaptive-preconditioning"></a>
## Precondizionamento adattivo

Quando il precondizionamento adattivo è abilitato e anticipa un blocco futuro, Room Assist segue quell’obiettivo fino all’orario di comfort programmato.

È importante perché l’ora attuale può ancora appartenere a un blocco precedente. Velair considera il blocco di precondizionamento già avviato come obiettivo gestito attivo, evitando che Room Assist ricalcoli sul vecchio blocco.

Quando l’assistenza con sensore ambiente è abilitata, anche il precondizionamento adattivo usa il sensore selezionato come fonte effettiva per decisioni e apprendimento.

<a id="automation-events"></a>
## Eventi per le automazioni

Velair emette l’evento standard Home Assistant `velair_event`.

Room Assist emette:

- `room_sensor_assist_state_changed`: Room Assist è stato abilitato o disabilitato.
- `room_sensor_assist_updated`: Velair ha applicato un obiettivo climatico temporaneo assistito.
- `room_sensor_assist_restored`: Velair ha smesso di gestirlo e ha ripristinato dove possibile l’obiettivo programmato normale.

Consulta [Eventi per le automazioni](automation-events.it.md#room-sensor-assist-state-changed) per i dati completi e tutti i motivi di ripristino.

Esempio di dati dell’evento:

```yaml
event: room_sensor_assist_updated
entity_id: climate.living_room
room_temperature_entity_id: sensor.living_room_temperature
target_temperature: 21
applied_temperature: 20
room_temperature: 18
climate_temperature: 17.1
assist_delta: 3.3
applied_offset: 2.9
direction: heat
hvac_mode: heat
hysteresis_phase: towards_upper
hysteresis_target: 21.3
deadband_low: 20.7
deadband_high: 21.3
reason: current_schedule
```

I quattro campi di isteresi sono facoltativi. Compaiono per un ciclo singolo fisso `heat` o `cool` con tolleranza diversa da zero e sono assenti per la correzione precedente senza tolleranza, modalità automatiche singole e intervalli nativi.

Un aggiornamento a intervallo usa le fasce complete programmate e applicate anziché campi di obiettivo singolo:

```yaml
event: room_sensor_assist_updated
entity_id: climate.living_room
room_temperature_entity_id: sensor.living_room_temperature
target_temp_low: 19
target_temp_high: 24
applied_target_temp_low: 23
applied_target_temp_high: 28
room_temperature: 18
climate_temperature: 22
assist_delta: 1
range_shift: 4
direction: heat
hvac_mode: heat_cool
reason: current_schedule
```

Esempio di trigger:

```yaml
trigger:
  - platform: event
    event_type: velair_event
    event_data:
      event: room_sensor_assist_updated
      entity_id: climate.living_room
```

Room Assist può essere controllato dalle automazioni anche con:

- `velair.enable_room_sensor_assist`
- `velair.disable_room_sensor_assist`

<a id="lovelace"></a>
## Lovelace

La vista Room Assist è disponibile come scheda Lovelace:

```yaml
type: custom:velair-card
view: sensors
entities:
  - climate.living_room
```

La scala in tempo reale separa due relazioni. Per un obiettivo singolo, la riga superiore confronta sensore ambiente e obiettivo programmato; quella inferiore confronta lettura e obiettivo del dispositivo. In `heat` o `cool` fisso, la fascia a righe indica entrambi i limiti di isteresi e lo stato nomina quello attivo. Nelle modalità automatiche singole resta un margine neutro. Per un intervallo nativo, parentesi rosse e blu identificano le fasce complete programmate e applicate, con entrambi i limiti. Un unico collegamento con segno **Spostamento intervallo** unisce i centri, rappresentando il movimento dell’intera fascia anziché un solo limite. Questi indicatori descrivono solo l’obiettivo inviato da Velair; non affermano che termostato, valvola o compressore stiano realmente riscaldando o raffrescando.

Nelle colonne strette della dashboard, la scala scorre orizzontalmente per mantenere leggibili i marcatori di temperatura.

La scheda Lovelace Room Assist può nascondere singole parti per una vista compatta dedicata alla dashboard:

```yaml
type: custom:velair-card
view: sensors
entities:
  - climate.living_room
show_room_assist_switch: false
show_room_assist_sensor: false
show_room_assist_deadband: false
show_room_assist_max_delta: false
show_room_assist_debounce: false
show_room_assist_live_status: true
```

Le opzioni `show_room_assist_*` omesse sono `true` per impostazione predefinita.

<a id="technical-details"></a>
## Dettagli tecnici

I dettagli per gli sviluppatori su campi di archiviazione, stato di esecuzione, calcolo dell’obiettivo assistito, ripristino ed eventi sono documentati in [Dettagli di Room Assist](../developer/room-assist.md).
