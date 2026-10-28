<a id="adaptive-preconditioning"></a>
# Precondizionamento adattivo

<!-- velair-docs:start -->
Traduzioni: [Originale in inglese](adaptive-preconditioning.md) · [Español](adaptive-preconditioning.es.md) · [Français](adaptive-preconditioning.fr.md) · [Deutsch](adaptive-preconditioning.de.md) · [Italiano](adaptive-preconditioning.it.md) · [Nederlands](adaptive-preconditioning.nl.md) · [Polski](adaptive-preconditioning.pl.md) · [Português (Brasil)](adaptive-preconditioning.pt-br.md) · [Português (Portugal)](adaptive-preconditioning.pt-pt.md) · [Русский](adaptive-preconditioning.ru.md) · [Stato delle traduzioni](../translation-status.md)

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

Il precondizionamento adattivo permette a Velair di avviare il riscaldamento o il raffrescamento prima di un blocco programmato, così la stanza è più vicina alla temperatura obiettivo quando il blocco inizia.

Un blocco **Solo temperatura** non autorizza un cambio di modalità HVAC. Finché il dispositivo è spento, Velair non avvia la preparazione anticipata né raccoglie campioni di apprendimento termico per quell’obiettivo. Un’accensione esterna consente di ricalcolare la preparazione usando la modalità reale compatibile. Questa opzione non può promettere comfort all’ora del blocco mentre il dispositivo resta spento.

Per esempio, un blocco alle `07:00` con `21 °C` significa «essere vicini a `21 °C` alle `07:00`», non «iniziare a passare a `21 °C` alle `07:00`».

Il precondizionamento adattivo viene eseguito localmente in Home Assistant. Velair salva impostazioni e campioni di apprendimento nell’archivio di Home Assistant e non invia mai la cronologia delle temperature, le osservazioni o i dati di calibrazione a un controller esterno. Le zone delegate tramite l’esecuzione esterna della programmazione non usano il precondizionamento adattivo; viene pubblicata solo la loro programmazione settimanale effettiva.

<a id="setup"></a>
## Configurazione

La scheda Precondizionamento contiene impostazioni adattive e apprendimento per ogni dispositivo indipendente o gruppo stanza. I membri raggruppati compaiono qui come una sola stanza. Ritorno programmato ha una scheda dedicata a presenza, arrivi settimanali e assenza attuale. Entrambe includono introduzione e aiuto contestuale. I percorsi diretti sono `/velair/preconditioning` e `/velair/planned-return`. I vecchi collegamenti aprono ancora la scheda corrispondente. Vedi [Ritorno programmato](planned-return.it.md).

1. Apri la scheda Precondizionamento.
2. Espandi il dispositivo o gruppo da configurare.
3. Abilita il precondizionamento.
4. Mantieni le impostazioni predefinite salvo un motivo specifico per cambiarle.
5. Seleziona facoltativamente un sensore esterno.

Il precondizionamento si configura per dispositivo indipendente o gruppo stanza. Gli apprendimenti di riscaldamento e raffrescamento sono separati: i campioni di una direzione non sostituiscono quelli dell’altra.

Un [gruppo stanza](room-groups.it.md#learning-and-membership-changes) salva un modello termico e decide un solo avvio; i membri non apprendono né si preparano indipendentemente. Il riferimento fornisce la misura nativa, oppure un sensore Room Assist abilitato fornisce la misura effettiva della stanza. Rimuovere un membro azzera l’apprendimento di quel membro e del gruppo restante. Sciogliere il gruppo avvia storici indipendenti per tutti; quelli precedenti non vengono divisi né ripristinati. Rinominare o riordinare conserva l’apprendimento.

Sono supportati gli intervalli nativi `heat_cool`. Sotto l’obiettivo inferiore di più del Delta minimo di temperatura, Velair calcola da quel limite e applica in anticipo l’intero intervallo per riscaldare. Sopra l’obiettivo superiore di più di quel delta, calcola dal limite superiore per raffrescare. Dentro l’intervallo o le bande morte dei limiti mantiene l’orario normale. Velair invia sempre entrambi i limiti, senza ridurre l’intervallo a una sola temperatura.

Per due setpoint in `heat` o `cool` fisso, seleziona **Setpoint di riferimento** per dispositivo e modalità in **Impostazioni → Dispositivi e gruppi**. Scegli il limite realmente usato: **Setpoint inferiore** o **Setpoint superiore**. Room Assist condivide questa impostazione. Preparazione e apprendimento usano solo quel limite come obiettivo di riscaldamento o raffrescamento secondo la modalità, anche se scegli il limite superiore per scaldare o quello inferiore per raffrescare. Velair anticipa la coppia nominale completa, anche per Ritorno programmato; non invia mai solo il limite scelto.

Con **Non configurato**, le coppie in modalità fissa mantengono l’orario e non producono campioni termici. Ritorno programmato le applica all’arrivo senza anticipo. Gli intervalli `auto` conservano questa limitazione perché scegliere un limite non definisce il comportamento di riscaldamento o raffrescamento. Il comportamento nativo `heat_cool` non cambia. Cambiare riferimento invalida le osservazioni iniziate con l’interpretazione precedente.

Quando espandi un dispositivo climatico, ogni modalità supportata mostra una scheda di previsione in tempo reale. Usa gli stessi dati backend del prossimo evento della panoramica, gestendo in modo coerente pause, incrementi, modalità non supportate e blocchi che non possono essere precondizionati. Quando esiste un blocco futuro corrispondente, la scheda mostra l’orario di avvio calcolato, l’orario obiettivo, l’anticipo, temperatura e modalità programmate e se Velair usa il modello iniziale o una cronologia locale simile.

La preparazione del Ritorno programmato è distinta dall’anticipo dell’orario settimanale. Per un ritorno futuro accettato, le informazioni del dispositivo mostrano stato del ritorno, inizio stimato, obiettivo di arrivo ed eventuali motivi di sospensione o indisponibilità. Panoramica, Ritorno programmato e schede climatiche usano gli stessi dati backend; non è un altro evento settimanale. Una stanza può ancora seguire Assenza pur mostrando una stima futura. **Preparazione** descrive l’intento di controllo di Velair, senza confermare la ricezione di un comando né il riscaldamento o raffrescamento fisico. La sequenza temporale misura il tempo trascorso verso l’arrivo salvato, non una percentuale di progresso termico. Consulta [Preparazione delle stanze](planned-return.it.md#room-preparation) per gli stati.

Per verificare un calcolo specifico, apri **Dettagli del calcolo** nella scheda della previsione in tempo reale. Questa sezione facoltativa mostra i valori backend usati per la previsione, compresi numero di campioni, stima dalle osservazioni completate, limite inferiore delle osservazioni parziali, stima combinata, arrotondamento e anticipo finale. È nascosta per impostazione predefinita per mantenere semplice la vista normale.

<a id="preconditioning-master"></a>
## Master del precondizionamento

Lascia **Master del precondizionamento** su **Indipendente** per mantenere il comportamento esistente. Per far dipendere la preparazione anticipata di un dispositivo da un altro, seleziona quel dispositivo gestito nelle impostazioni della stanza dipendente. Seleziona di nuovo **Indipendente** per scollegarli. L’impostazione si applica alla programmazione effettiva della stanza, inclusi Profili, eccezioni di zona e Ritorno programmato; non sostituisce temperature o blocchi.

Un master può servire più stanze dipendenti. Una stanza non può dipendere da sé stessa. Catene e cicli non sono supportati: un dipendente non può essere anche un master.

Velair sceglie il blocco del master con l’orario obiettivo più vicino a quello del blocco dipendente. A parità di distanza sceglie il precedente. Gli orari obiettivo possono essere diversi. Il dipendente inizia al più tardo fra il proprio avvio previsto e l’avvio della preparazione di quel blocco del master:

| Avvio autonomo della stanza | Avvio del master | Obiettivo della stanza | Avvio effettivo |
| --- | --- | --- | --- |
| 17:40 | 17:55 | 18:45 | 17:55 |
| 18:10 | 17:55 | 18:45 | 18:10 |
| 17:40 | Nessuna preparazione anticipata | 18:45 | Blocco normale alle 18:45 |
| 17:40 | 19:00 | 18:45 | Blocco normale alle 18:45 |

Se il blocco selezionato del master non può prepararsi in anticipo, Velair non lo sostituisce con un altro. Una preparazione di riscaldamento non può sbloccarne una di raffrescamento, né viceversa. Pause, modifiche temporanee, verifiche di disponibilità e limiti massimi di anticipo restano validi. Un master non disponibile o disabilitato resta configurato; la stanza dipendente non diventa automaticamente indipendente.

**Inizio minimo (min)** continua a escludere previsioni autonome troppo brevi. L’attesa del master, come l’invio tardivo di un comando, può ridurre la finestra reale. L’apprendimento usa il tempo rimasto, senza inventare un avvio precedente o spostare l’obiettivo programmato.

L’avvio mostrato è una previsione. Durante l’esecuzione, il comando di preparazione corrispondente del master deve essere accettato prima che il dipendente possa iniziare. Questo non conferma lo stato del relè della caldaia, il flusso d’acqua o il riscaldamento/raffrescamento effettivo. Velair non alza la temperatura del master per richiedere calore per altre stanze. Il blocco normale continua ad applicarsi al proprio orario.

L’apprendimento inizia quando il dipendente avvia realmente la preparazione vincolata, usando la temperatura in quel momento e il tempo fino al proprio blocco. Raggiungimento anticipato, osservazioni parziali e campioni non validi mantengono le regole esistenti. Il successivo completamento del master non ferma una preparazione già in corso nel dipendente. Collegare o scollegare non cancella i campioni salvati.

Apri **Dettagli del calcolo** per vedere stima autonoma, master selezionato e avvio effettivo. Diagnostica mostra il motivo della dipendenza accanto alle informazioni esistenti di preparazione e apprendimento. I riferimenti salvati agli avvii dei comandi permettono continuità operativa dopo un riavvio; un’osservazione di apprendimento interrotta non riprende e questi riferimenti tecnici sono esclusi dalle esportazioni portabili.

<a id="understanding-learning-activity"></a>
## Comprendere l’attività di apprendimento

Ogni direzione supportata può mostrare una breve spiegazione accanto ai dati di apprendimento: Velair sta osservando una transizione, ne attende una adatta oppure non può osservarla per un motivo noto. Descrive l’apprendimento, senza confermare che il dispositivo stia fisicamente riscaldando o raffrescando. Una transizione passata riporta esplicitamente data e ora e non è presentata come attività attuale.

Usa l’azione **Diagnostica** accanto alla spiegazione per aprire quel dispositivo e la sua cronologia di Precondizionamento, senza filtri di data che nascondano voci precedenti. La sezione delle funzioni esistente mostra l’attività attuale e l’ultima transizione conservata. Espandi i dettagli per esaminare temperature, soglie configurate e durate disponibili per quella decisione. Consulta [Informazioni sull’apprendimento](diagnostics.it.md#learning-evidence).

Un numero di campioni invariato non dimostra un guasto. Una transizione può non fornire una differenza di temperatura utilizzabile, un’osservazione può essere ancora in corso oppure il risultato può essere parziale o non valido. Le spiegazioni usano solo informazioni registrate da Velair; non deducono il funzionamento della caldaia o la disponibilità di calore condiviso. Stato dell’apprendimento e previsione del prossimo blocco restano distinti: una stanza può avere poca cronologia e non richiedere comunque un anticipo per un obiettivo specifico.

<a id="how-it-starts"></a>
## Come viene avviato

Velair calcola la differenza di temperatura attuale per il prossimo blocco di temperatura programmato.

Per un intervallo `heat_cool`, «temperatura obiettivo» qui sotto indica il limite inferiore durante il riscaldamento e quello superiore durante il raffrescamento.

Per un intervallo fisso `heat` o `cool`, indica il limite di riferimento selezionato, con la direzione determinata dalla modalità fissa.

Per il riscaldamento:

```text
delta = target temperature - current temperature
```

Per il raffrescamento:

```text
delta = current temperature - target temperature
```

Se la differenza è inferiore al delta minimo di temperatura, Velair mantiene l’orario normale del blocco e non anticipa l’avvio.

<a id="schedule-boundaries-and-other-climates"></a>
## Limiti del programma e altri climatizzatori

Un avvio anticipato settimanale non può raggiungere né oltrepassare il blocco effettivo immediatamente precedente del programma dello stesso climatizzatore, incluso un blocco `Off`. Se la finestra calcolata raggiunge o supera quel limite, Velair mantiene il normale orario di comfort. Per esempio, con `Off` alle `19:00` e `heat` alle `20:00`, un avvio calcolato alle `18:00` viene escluso: `Off` si applica alle `19:00` e il riscaldamento inizia alle `20:00`. Un blocco `Off` alle `22:00` della sera precedente non impedisce un avvio alle `05:35` per le `07:00` senza blocchi intermedi. La regola vale anche per il raffrescamento e gli intervalli nativi `heat_cool`; non modifica le previsioni di arrivo del rientro pianificato.

Un climatizzatore già in precondizionamento non ritarda i blocchi o gli avvii anticipati degli altri climatizzatori. Se l’elaborazione di un’azione supera un’altra transizione, Velair determina l’obiettivo attualmente autorizzato del climatizzatore interessato invece di ripetere comandi obsoleti. Pause, Incremento, regolazione manuale, zone disabilitate ed esecuzione esterna del programma continuano a determinare se un obiettivo può essere inviato. Questo recupero si applica mentre il pianificatore è in funzione; il comportamento configurato di applicazione all’avvio resta invariato.

<a id="initial-model-example"></a>
## Esempio con il modello iniziale

Quando la cronologia locale non è sufficiente, Velair usa il modello iniziale:

```text
lead = Minimum start + Initial model min/degree * temperature delta
```

Situazione:

- Blocco programmato: `21 °C`, `heat`, orario obiettivo `07:00`
- Temperatura ambiente: `18 °C`
- Anticipo minimo: `10 min`
- Modello iniziale: `25 min/°C` o l’equivalente `13.89 min/°F`
- Anticipo massimo: `24 h`

Calcolo:

```text
delta = 21 - 18 = 3 °C
lead = 10 + 25 * 3 = 85 min
start = 07:00 - 85 min = 05:35
```

Velair applica l’obiettivo programmato alle `05:35` e mantiene `07:00` come orario di comfort visibile.

<a id="heating-with-learned-history"></a>
## Riscaldamento con cronologia appresa

Dopo un numero sufficiente di osservazioni riuscite, Velair può usare una cronologia locale simile invece del modello iniziale.

Situazione:

- Blocco programmato: `21 °C`, `heat`, orario obiettivo `07:00`
- Temperatura ambiente attuale: `18.5 °C`
- Delta attuale: `2.5 °C`
- Osservazioni completate simili:

```text
A: 2.0 °C in 50 min -> 25.0 min/°C
B: 2.4 °C in 72 min -> 30.0 min/°C
C: 2.8 °C in 84 min -> 30.0 min/°C
D: 2.1 °C in 63 min -> 30.0 min/°C
E: 2.6 °C in 91 min -> 35.0 min/°C
```

Con il percentile di comfort impostato a `80`, Velair sceglie un valore prudente fra i campioni completati simili. In questo esempio è `35.0 min/°C`.

```text
lead = 2.5 * 35 = 87.5 min
```

Velair arrotonda l’anticipo finale per eccesso al minuto successivo supportato dal pianificatore, invece di arrotondarlo al di sotto del valore calcolato.

```text
87.5 min -> 90 min
start = 07:00 - 90 min = 05:30
```

<a id="cooling-example"></a>
## Esempio di raffrescamento

Situazione:

- Blocco programmato: `23 °C`, `cool`, orario obiettivo `22:00`
- Temperatura ambiente: `27 °C`
- Anticipo minimo: `10 min`
- Modello iniziale: `25 min/°C`
- Anticipo massimo: `24 h`

Calcolo:

```text
delta = 27 - 23 = 4 °C
lead = 10 + 25 * 4 = 110 min
start = 22:00 - 110 min = 20:10
```

Se in seguito il dispositivo dispone di abbastanza osservazioni di raffrescamento, Velair usa solo la cronologia del raffrescamento. La cronologia del riscaldamento non viene mescolata con quella del raffrescamento, perché la stessa stanza e lo stesso dispositivo possono riscaldare e raffrescare a velocità diverse.

<a id="partial-and-invalid-observations"></a>
## Osservazioni parziali e non valide

Velair salva osservazioni locali compatte dopo i tentativi di precondizionamento.

Le osservazioni completate sono esempi utili in cui la stanza ha raggiunto in tempo la soglia obiettivo.

Le osservazioni parziali indicano che Velair ha anticipato l’avvio ma la stanza non ha raggiunto la soglia obiettivo entro l’orario di comfort programmato. Costituiscono limiti inferiori: Velair sa che serviva più tempo, ma non inventa un orario di completamento fittizio.

Le osservazioni non valide vengono conservate solo per la diagnostica e non alimentano il modello. Fra gli esempi ci sono delta molto piccoli, durate impossibili, sessioni interrotte, temperature mancanti, incrementi, pause o cambiamenti di stato del pianificatore.

Se alle vecchie osservazioni parziali seguono abbastanza osservazioni completate che dimostrano il raggiungimento affidabile dell’obiettivo, quelle vecchie osservazioni parziali smettono di aumentare forzatamente la previsione.

<a id="outdoor-temperature-sensor"></a>
## Sensore di temperatura esterna

Il sensore di temperatura esterna è facoltativo.

Se configurato, Velair ne salva il valore come contesto locale delle osservazioni e in seguito confronta le condizioni attuali con osservazioni passate simili. Non chiama servizi meteorologici, non richiede internet e non applica un offset fisso al modello iniziale.

Se il sensore esterno non è disponibile quando viene salvato un campione, Velair salva semplicemente l’osservazione senza quel contesto.

<a id="room-assist-interaction"></a>
## Interazione con Room Assist

Per impostazione predefinita, il precondizionamento adattivo usa `current_temperature` dell’entità climatica.

Se l’assistenza con sensore ambiente è abilitata per quel dispositivo ed è selezionato un sensore ambiente, il precondizionamento adattivo usa quel sensore come temperatura ambiente effettiva per decisioni e apprendimento.

Questo è utile per valvole termostatiche o termostati il cui sensore integrato è troppo vicino a un radiatore, una bocchetta d’aria o un’altra fonte di calore locale. Consulta [Room Assist](room-assist.it.md) per il comportamento dal lato dell’attuatore.

<a id="automation-events"></a>
## Eventi per le automazioni

Velair usa tre eventi `velair_event` per questo ciclo di funzionamento:

- `preconditioning_plan_updated` quando compare o cambia un piano calcolato;
- `preconditioning_plan_cancelled` quando un piano pubblicato non è più applicabile;
- `preconditioning_observation_recorded` dopo il salvataggio di un campione di apprendimento.

Consulta [Eventi per le automazioni](automation-events.it.md#preconditioning-plan-updated) per le regole precise di emissione e gli esempi completi dei dati.

Esempio di trigger di automazione:

```yaml
trigger:
  - platform: event
    event_type: velair_event
    event_data:
      event: preconditioning_plan_updated
      entity_id: climate.living_room
```

<a id="when-velair-does-nothing"></a>
## Quando Velair non interviene

Il precondizionamento adattivo non anticipa l’avvio quando:

- il precondizionamento è disabilitato per quel dispositivo;
- il pianificatore non è in modalità automatica;
- la zona è in pausa o ha un incremento attivo;
- il prossimo blocco è `Off`;
- il dispositivo non supporta la direzione necessaria di riscaldamento o raffrescamento;
- la differenza di temperatura è inferiore al delta minimo;
- la temperatura richiesta non è disponibile o non è numerica.

<a id="lovelace"></a>
## Lovelace

La vista di precondizionamento è disponibile come scheda Lovelace:

```yaml
type: custom:velair-card
view: preconditioning
entities:
  - climate.living_room
```

La scheda Lovelace usa la stessa configurazione backend del pannello principale di Velair.

<a id="technical-details"></a>
## Dettagli tecnici

I dettagli per gli sviluppatori sull’archiviazione, sull’algoritmo di apprendimento, sulla gestione delle osservazioni parziali, sulla ponderazione per somiglianza e sui dati API sono documentati in [Dettagli del precondizionamento adattivo](../developer/adaptive-preconditioning.md).
