<a id="usage-guide"></a>
# Guida all’uso
<!-- velair-docs:start -->
Traduzioni: [Originale in inglese](usage.md) · [Español](usage.es.md) · [Français](usage.fr.md) · [Deutsch](usage.de.md) · [Italiano](usage.it.md) · [Nederlands](usage.nl.md) · [Polski](usage.pl.md) · [Português (Brasil)](usage.pt-br.md) · [Português (Portugal)](usage.pt-pt.md) · [Русский](usage.ru.md) · [Stato delle traduzioni](../translation-status.md)

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

Questa guida spiega Velair dal punto di vista di un utente Home Assistant.

<a id="panel-navigation-and-direct-links"></a>
## Navigazione del pannello e collegamenti diretti

Il pannello della barra laterale aggiorna l’URL quando cambi scheda o passi fra le sottosezioni di Programmazioni, Modelli e Precondizionamento. Aggiornare la pagina o aprire un URL copiato ripristina quella sezione. Anche Indietro e Avanti del browser seguono la navigazione.

| Sezione | Percorso |
| --- | --- |
| Panoramica | `/velair` |
| Programmazioni: Default | `/velair/schedules/default` |
| Programmazioni: Profili | `/velair/schedules/profiles` |
| Modalità | `/velair/modes` |
| Modelli: Modelli | `/velair/templates/templates` |
| Modelli: Preset climatici | `/velair/templates/presets` |
| Sensori | `/velair/sensors` |
| Comfort | `/velair/comfort` |
| Precondizionamento: Adattivo | `/velair/preconditioning/preconditioning` |
| Precondizionamento: Rientro pianificato | `/velair/preconditioning/planned-return` |
| Diagnostica | `/velair/diagnostics` |
| Impostazioni | `/velair/settings` |

Usa questi percorsi nelle azioni di navigazione delle dashboard Home Assistant oppure aggiungili al tuo indirizzo Home Assistant per creare un collegamento completo. Aprire un collegamento seleziona una sezione; non attiva una modalità né cambia impostazioni climatiche.

Per esempio, un pulsante della dashboard può aprire la libreria dei preset climatici:

```yaml
type: button
name: Velair climate presets
icon: mdi:thermometer-lines
tap_action:
  action: navigate
  navigation_path: /velair/templates/presets
```

Cambia `navigation_path` con un qualsiasi percorso della tabella. Usa l’[azione standard di navigazione delle dashboard](https://www.home-assistant.io/dashboards/actions/) di Home Assistant. Per un segnalibro o un collegamento da un’altra applicazione, usa il tuo indirizzo Home Assistant seguito dal percorso, per esempio `https://your-home-assistant.example/velair/schedules/profiles`.

`/velair/schedules` apre Default e `/velair/templates` apre Modelli. `/velair/preconditioning` apre il precondizionamento adattivo. Il selettore delle sottosezioni passa fra preparazione adattiva della programmazione e rientro pianificato. `/velair/overview` apre la panoramica e il vecchio percorso `/velair/profiles` apre Modalità. Una sottosezione sconosciuta apre quella predefinita della scheda; una scheda sconosciuta apre la panoramica. I percorsi vengono normalizzati senza aggiungere una voce alla cronologia.

I collegamenti non conservano la selezione di singoli dispositivi, giorni, profili, modelli o preset. Le modifiche non salvate non vengono recuperate dopo un aggiornamento. Le conferme esistenti si applicano quando la navigazione scarterebbe modifiche; annullare mantiene sezione e URL attuali. Le schede Lovelace facoltative mantengono gli URL delle loro dashboard.

Mentre il pannello laterale è aperto, le schede condividono gli ultimi dati confermati del backend. Dopo il primo caricamento, cambiare scheda non ripete il caricamento iniziale. Gli aggiornamenti continuano durante la navigazione e restano valide le conferme delle modifiche non salvate. Aggiornare la pagina ricarica i dati e non recupera le bozze. Le schede Lovelace usano una sessione separata dal pannello. Quelle montate sulla stessa connessione Home Assistant condividono caricamento iniziale e aggiornamenti in tempo reale, mantenendo controlli e modifiche propri. Lovelace può mantenerle montate passando a un’altra vista della dashboard, permettendo di tornare senza ricaricarle. La sessione condivisa si chiude quando viene smontata l’ultima scheda; aggiornare la pagina avvia un nuovo caricamento. Non servono modifiche YAML.

<a id="help-and-documentation"></a>
## Aiuto e documentazione

Apri **Impostazioni → Aiuto e comunità** per consultare la documentazione, segnalare problemi in GitHub Issues o condividere domande e suggerimenti in Discussions. Usa l’icona di aiuto accanto a un’intestazione o a destra di una scelta del sottomenu per aprire una breve spiegazione e **Apri la guida**. Aprire l’aiuto di un sottomenu non lo seleziona né cambia le modifiche. Spiegazione e guida corrispondono alla scelta, anche se non è la sezione attiva. Nelle impostazioni, anche l’aiuto di **Modifiche esterne** offre la guida. Le icone di aiuto usano lo stesso punto interrogativo e si evidenziano al passaggio del puntatore; quelle informative continuano a dare brevi spiegazioni dei campi. Chiudi il dialogo con il pulsante, Escape o un clic all’esterno; il focus torna all’icona di aiuto.

Le brevi spiegazioni restano disponibili in Velair in tutte le lingue supportate dell’interfaccia, anche senza connessione internet. I collegamenti usano la lingua Home Assistant quando esiste una traduzione, altrimenti l’inglese per quella guida. Il collegamento mostra **In inglese** solo quando manca la traduzione nella tua lingua. Le guide tradotte mostrano sincronizzazione con la fonte e stato della revisione linguistica, con un collegamento all’originale inglese quando ci sono modifiche in attesa. Le build delle versioni pubblicate aprono la documentazione del tag corrispondente; quelle di sviluppo aprono quella attuale su `main`. I collegamenti alla documentazione e alla comunità aprono GitHub in una nuova scheda e richiedono internet solo all’apertura; non caricano automaticamente diagnostica o configurazione locale.

<a id="concepts"></a>
## Concetti

Velair gestisce le programmazioni delle entità `climate.*` selezionate durante la configurazione dell’integrazione. Ogni entità selezionata è una zona climatica gestita.

Una programmazione è composta da blocchi per giorno della settimana. Un blocco inizia a un’ora specifica e può:

- impostare una temperatura obiettivo, eventualmente con modalità HVAC e opzioni supportate come ventilazione, preset, oscillazione, oscillazione orizzontale o umidità obiettivo;
- impostare una o più opzioni supportate senza inviare una temperatura o cambiare modalità HVAC;
- cambiare solo modalità HVAC lasciando l’obiettivo al controllo del dispositivo;
- spegnere l’entità climatica.

Un blocco resta attivo fino all’inizio del prossimo nella settimana. Include mezzanotte e giorni vuoti: prima del primo blocco di un giorno, Velair mantiene il più recente di un giorno precedente. La sequenza mostra separatamente questo periodo ereditato, chiarendo dove il blocco è stato configurato.

<a id="external-adjustments-and-manual-adjustment"></a>
## Regolazioni esterne e regolazione manuale

Ogni zona può scegliere cosa fa Velair quando modalità HVAC o obiettivo cambiano esternamente, per esempio da scheda Home Assistant, telecomando IR o altra automazione. Configura **Modifiche esterne** nella riga di ogni dispositivo gestito in **Impostazioni**:

- **Mantieni l'automatico** è il valore predefinito e riapplica l’intento attuale di Velair.
- **Fino al prossimo blocco** rispetta la regolazione fino all’inizio del prossimo blocco effettivo.
- **Per una durata** riprende dopo i minuti configurati.
- **Fino alla ripresa** attende un’azione esplicita.

Durante la cessione del controllo, la panoramica seleziona **Regolazione manuale** nel controllo permanente Automatico/Manuale. Non è la modalità Velair **Manuale**: quella descrive come sono stati scelti i profili, mentre la regolazione manuale indica chi controlla un dispositivo. La ripresa riapplica la programmazione del profilo attivo, Default o altro intento attuale. Gli altri motivi indipendenti di pausa restano validi.

La panoramica seleziona **Programmazione automatica** mentre Velair controlla il dispositivo. Seleziona **Regolazione manuale** per mantenerne lo stato attuale senza modificarlo prima; usa il criterio manuale già salvato. Con **Mantieni l'automatico** salvato, un’azione manuale esplicita resta manuale fino alla ripresa senza cambiare quell’impostazione. La stessa operazione è disponibile come `velair.enter_manual_adjustment`; acquisisce lo stato attuale di riscaldamento, raffrescamento, spento o intervallo nativo e accetta solo l’ID del dispositivo.

Con **Mantieni l'automatico**, Room Assist ricalcola e riapplica il proprio obiettivo prioritario. Con un criterio manuale cede il controllo senza ripristinare la correzione programmata. Sono supportati obiettivi singoli e intervalli nativi.

La guida completa spiega limiti di rilevamento, tutti i criteri, regolazioni ripetute, profili e modalità, priorità di incrementi e pause, riavvii, YAML esatto di servizi/eventi e sequenze reali passo passo. Consulta [Modifiche esterne e regolazione manuale](manual-control.it.md).

Velair calcola gli eventi futuri nel backend e programma callback precisi eseguiti una volta tramite Home Assistant. Il frontend si iscrive agli aggiornamenti tramite WebSocket, senza interrogazioni periodiche continue.

Durante un episodio di rientro pianificato, la panoramica mostra un riepilogo compatto della casa con origine settimanale o occasionale, processo attuale e ora pertinente di conferma o arrivo. Selezionalo per aprire il rientro pianificato in Precondizionamento; non duplica i controlli della partenza. Un problema può restare visibile anche senza una partenza in corso.

Ogni dispositivo interessato mostra un segnale viola di rientro pianificato quando il backend indica controllo attuale di Assenza o preparazione all’arrivo. Stato normale, profilo e Room Assist restano visibili. Gli orari di preparazione futuri sono informazioni previsionali, non un segnale di controllo attivo. Manuale, incremento, pause indipendenti, arresto ed esecuzione esterna mantengono la priorità. Un dispositivo che mantiene semplicemente Default in una modalità Assenza personalizzata non riceve il segnale Assenza. L’indicatore descrive l’intento, non costituisce una prova di comando consegnato o obiettivo raggiunto.

Quando un dispositivo non pubblica `target_temp_step`, la riga in **Impostazioni** mostra **Passo di temperatura**. Velair usa `1` per impostazione predefinita e permette di fornire il passo reale positivo. Ricorda l’ultimo passo valido Home Assistant, così la scomparsa dell’attributo non invalida obiettivi decimali esistenti. Un passo pubblicato attuale ha sempre priorità. Salvare un valore manuale mentre manca l’attributo sostituisce quello ricordato come alternativa. Se l’entità pubblica poi nuovamente un passo, Velair ricorda la nuova griglia anche se conserva il valore manuale.

**Diagnostica** offre un’istantanea in sola lettura del pianificatore e delle zone, una cronologia limitata solo di esecuzione e un rapporto JSON con dati sensibili rimossi per le segnalazioni. Non aggiunge interrogazioni periodiche e non dipende da Recorder. Su desktop le colonne del registro sono ridimensionabili per la sessione; si azzerano al ricaricamento e non vengono salvate. Su mobile gli stessi eventi usano un layout compatto adattabile.

La diagnostica mostra anche stato del rientro domestico, partecipazione effettiva del dispositivo selezionato, stima della preparazione e motivi di sospensione. La disabilitazione della routine settimanale è separata dalla disponibilità dei rientri occasionali. La categoria **Rientro pianificato** registra pianificazione accettata, conferma, partenza, cambi di arrivo, avvii della preparazione, completamento, annullamento ed errori. Condivide il limite di 100 eventi e si azzera al riavvio; le preferenze delle categorie restano salvate. Aggiornare le viste non aggiunge voci. I rapporti includono il contesto, rimuovendo identificatori di modalità e profili anche quando si includono esplicitamente gli ID delle entità.

<a id="home-assistant-entities"></a>
## Entità Home Assistant

Velair crea entità persistenti Home Assistant che completano i suoi eventi transitori:

- **Prossimo evento programmato** è un sensore timestamp della prima azione in attesa. Gli attributi includono tutti gli eventi alla stessa ora, l’applicazione calcolata e l’orario originale quando il precondizionamento anticipa il blocco.
- **Stato della programmazione** descrive inattività, programmazione, sostituzione o pausa. Gli attributi includono modalità globale e scadenza della pausa; eventi futuri e sostituzioni di zona restano nei sensori dedicati evitando duplicazioni nella cronologia Recorder.
- **Stato della diagnostica** è un sensore enumerato diagnostico con `ok`, `warning` ed `error`. Espone solo attributi compatti: stato del pianificatore, conteggi dei dispositivi sani/con avvisi/con errori, conteggi e codici dei problemi attivi. Rende disponibile lo stato attuale senza testo grezzo delle eccezioni.
- Il sensore **Temperatura obiettivo attiva** viene creato per ogni dispositivo e mostra l’obiettivo gestito, compresi incrementi e blocchi anticipati. L’unità segue l’entità climatica. Per intervalli nativi lo stato singolo è indisponibile perché non esiste un unico valore corretto; usa gli attributi `target_temp_low` e `target_temp_high`.
- Il sensore **Condizione ambientale** viene creato per dispositivo e mostra stati leggibili come confortevole, freddo, umido o caldo e umido. Mantiene qualità dei dati e ID delle fonti come attributi compatti senza copiare letture originali di temperatura o umidità.
- Il sensore **Opportunità di ventilazione** viene creato per dispositivo. Espone una classificazione prudente osservativa sull’utilità dell’aria esterna per avvicinare la stanza alla zona Comfort configurata. Non apre finestre né controlla il dispositivo.
- Il sensore **Qualità dell’aria** viene creato per dispositivo e mantiene la valutazione CO2 indipendente: buona, elevata, scarsa, non disponibile o non monitorata.
- **Sostituzione della zona** mostra nessuna sostituzione, incremento attivo o pausa attiva.
- **Controllo della zona** viene creato per dispositivo e indica controllo locale `automatic`, regolazione manuale attiva o fornitore esterno responsabile dell’esecuzione fisica. Gli attributi forniscono contesto di pianificatore, profilo, modalità e regolazione manuale.
- **Diagnostica consegna** è un sensore diagnostico per dispositivo, disabilitato per impostazione predefinita. Espone l’ultimo esito solo di esecuzione e l’ultimo obiettivo la cui sequenza completa è stata accettata, senza errori grezzi o affermazioni sul comportamento fisico.
- **Avvio del precondizionamento** è un sensore timestamp dell’avvio calcolato del prossimo blocco anticipato o di quello attivo. Include orario di comfort, anticipo, direzione, origine del modello, obiettivo e modalità HVAC.
- **Room Assist** espone lo stato attuale e il contesto compatto dell’obiettivo senza duplicare letture originali di stanza e dispositivo.
- **Programmazione automatica** e **Modalità** sono entità di controllo modificabili. Spegnere la programmazione automatica la arresta senza termine; accenderla riprende la programmazione attiva. Una modalità personalizzata attiva i profili associati, **Predefinito** azzera l’insieme. **Manuale** significa che nessuna modalità personalizzata controlla l’insieme: normalmente segue un’attivazione diretta. Velair lo mostra come stato anziché azione. Usa `velair.pause` per una pausa temporanea con durata.

Queste entità riutilizzano istantanee backend, ricevono aggiornamenti dal dispatcher e non interrogano periodicamente Home Assistant. Gli eventi servono per reagire a transizioni; le entità per conoscere lo stato attuale. Room Assist può correggere l’obiettivo dopo quello accettato; usa il sensore dedicato per il contesto della correzione applicata. Consulta [Riferimento dei sensori](sensors.it.md) per elenco completo, attributi ed esempi e [Sensori di controllo della zona e invio dei comandi](zone-sensors.it.md) per i contratti più dettagliati su controllo, Comfort, ventilazione e invio.

Rimuovendo un dispositivo dalle opzioni Velair, i suoi sensori generati vengono rimossi dal registro Home Assistant al ricaricamento. Le entità globali e quelle di altre integrazioni non sono interessate. Aggiungerlo di nuovo ricrea i sensori con ID univoci deterministici.

Home Assistant sceglie i nomi tradotti delle entità dalla lingua backend alla prima creazione. Cambiare solo la lingua dell’interfaccia di un utente non rinomina le voci esistenti. Puoi rinominarle manualmente in Home Assistant senza cambiarne il comportamento Velair.

<a id="open-velair"></a>
## Aprire Velair

Dopo la configurazione, Velair compare nella barra laterale di Home Assistant.

Il pannello laterale è l’interfaccia consigliata. La scheda Lovelace facoltativa serve per incorporare pannelli Velair specifici in una dashboard esistente.

L’elenco dei prossimi eventi nella panoramica mostra quello pianificato successivo per ogni dispositivo, inclusi gli anticipi del precondizionamento. Serve alla visibilità dell’utente; internamente Velair programma comunque la prima azione dovuta.

La panoramica delle zone usa schede compatte adattabili per mostrare cosa stanno facendo Velair e il dispositivo in ogni stanza. Quando l’entità comunica `hvac_action`, il riepilogo usa Riscaldamento, Raffrescamento, Deumidificazione, Ventilazione, Inattivo, Spento, Preriscaldamento o Sbrinamento come stato principale. Identifica poi stato Velair programmato, manuale, incremento, pausa, precondizionamento o automazione disattivata, modalità HVAC comunicata e tempi pertinenti senza ripetere l’attività in un altro segnale. Se `hvac_action` manca o non è valido, mostra solo lo stato di esecuzione Velair senza dedurre l’attività fisica. Ogni scheda presenta prima nome e ID, poi profilo attivo e segnali ordinati Room Assist/Comfort/aria/dati. A larghezze molto ampie condividono l’intestazione col riepilogo; nelle schede strette, mobile e Lovelace compatto, identità e stato restano affiancati e i segnali completi occupano la riga sottostante, senza ridurne o troncarne il significato. Il riepilogo usa icona coerente, testo equilibrato e accento discreto, senza intestazione fissa o badge decorativo. Con Room Assist attivo o in mantenimento, i dettagli sono raggruppati come Temperatura (dispositivo, sensore), Obiettivo (dispositivo, programmato) e Offset orientato alla direzione. Valori mancanti sono omessi. I segnali neutri restano discreti; il colore di avviso è riservato a condizioni da controllare.

La scheda Lovelace supporta questi valori `view`:

- `climate`;
- `overview-status`;
- `overview-boosts`;
- `overview-events`;
- `overview-timeline`;
- `overview-zones`;
- `active-setup`;
- `schedules`;
- `sensors`;
- `comfort`;
- `preconditioning`;
- `planned-return`;
- `diagnostics`.

<a id="planned-return-card"></a>
### Scheda del rientro pianificato

Aggiungi a una dashboard gli stessi controlli di rientro domestico della barra laterale:

```yaml
type: custom:velair-card
view: planned-return
```

Durante la conferma dell’assenza, una riga del timer spiega la verifica della casa vuota e mostra il termine backend nell’ora locale Home Assistant. Assenza si attiva solo dopo la conferma se tutte le fonti indicano ancora assenza. Prima della conferma non c’è un conto alla rovescia aggiornato in tempo reale o cronologia della partenza.

L’editor visivo chiama la vista **Ritorno programmato**. Mostra solo i controlli compatti del **One-off return**, con conteggi delle fonti di presenza, assenza e sconosciute in alto a destra. Il ritardo salvato di conferma compare solo prima di un’assenza attiva confermata. Senza fonti salvate, gli indicatori sono omessi: **Plan return** conferma esplicitamente la partenza e attiva subito Assenza. L’arrivo salvato controlla ancora preparazione e destinazione; Velair non rileva l’arrivo fisico senza fonti. Quelle configurate sconosciute/non disponibili mantengono l’attesa normale, e la routine settimanale richiede fonti. Imposta data e ora future prima di uscire o quando sei già fuori. Un episodio attivo offre solo **Annulla** e **Modifica arrivo**. Annullare interrompe il rientro e ripristina modalità/profili precedenti dopo partenza confermata; durante la conferma non cambia selezione. Per esempio, partendo da Comfort con ritardo di cinque minuti: annullare dopo due lascia Comfort, annullare dopo Assenza ripristina Comfort e i profili originali. Consulta gli [esempi di annullamento](planned-return.it.md#cancelling-a-return-examples), inclusi avvii senza sensori, modifiche di arrivo e selezioni esplicite. Finito o annullato il rientro, compare un nuovo modulo data/ora anche se tutti risultano ancora assenti. **Plan return** resta visibile ma disabilitato se configurazione o pianificatore non sono disponibili. La barra laterale usa gli stessi pulsanti e nuovo modulo. Solo indicatori finali di presenza/ritardo sono specifici della scheda; la barra laterale conserva configurazione completa settimanale, presenza e preparazione. Entrambe mostrano una fase compatta sotto il titolo con tooltip esplicativo; durante la conferma il titolo del processo fornisce il contesto. Prima della partenza confermata, un’icona accessibile e **Expected arrival** identificano il ritorno salvato, allineati a titolo/stato; il valore è un indicatore cliccabile senza matita o sottolineatura. Il grafico confermato usa invece data/ora sottolineata con matita iniziale. Entrambi aprono lo stesso editor. **Indietro**, blu con freccia, scarta la modifica locale e chiude ripristinando l’arrivo salvato. Avviso e protezione di navigazione si cancellano; la configurazione della routine non salvata resta protetta. Riaprire parte dal salvato; il successo chiude, errori e aggiornamenti mantengono la bozza. Orari di partenza e arrivo usano la stessa tipografia; Annulla è rosso pieno compatto con testo bianco sotto i dati a sinistra, solo con ritorno annullabile ed editor chiuso. Modificando, **Indietro** è a sinistra e Modifica arrivo verde a destra. Entrambi hanno superfici visibili di 32 pixel entro aree tattili di 44. I contatori restano in alto a destra; il ritardo scompare dopo la partenza confermata.

Configura fonti di presenza, modalità, conferma dell’assenza e routine settimanale in **Precondizionamento > Ritorno programmato** nella barra laterale. La scheda usa quella configurazione salvata; non espone campi di configurazione o interruttore settimanale. I filtri dei termostati non limitano la scheda domestica. Dashboard e barra laterale aggiornano lo stesso episodio backend; le bozze di arrivo restano locali a ogni scheda fino all’invio.

Durante un’assenza confermata, le icone di partenza/arrivo affiancano la linea temporale. Gli orari salvati sono subito sotto; l’arrivo mantiene la matita. Indietro chiude l’editor dalla riga delle azioni; non c’è chiusura accanto all’ora. Etichette semplici con icona identificano modalità Assenza/Rientro sotto gli orari senza ripetizioni. La linea mostra partenza reale confermata e ritorno salvato, con i nomi delle modalità. Il punto attuale ha tooltip localizzato **Adesso** e segna il tempo UTC trascorso fra estremi, limitato alla barra. Le date compaiono se partenza e arrivo sono in giorni diversi nel fuso Home Assistant. Modificare l’arrivo non sposta l’estremo fino all’accettazione backend. Rientri in attesa, completati, annullati, saltati o in errore non hanno barra mobile. L’orologio locale si aggiorna ogni minuto solo mentre scheda o pannello attivi sono visibili, senza interrogare Home Assistant. La linea colorata rappresenta tempo, non progresso termico. Se manca una prima stima affidabile, un pulsante informazioni vicino al titolo spiega stanze sospese, già all’obiettivo, solo all’arrivo o escluse quando l’anteprima è concorde; dati mancanti o misti restano inconcludenti. Passaggio/focus su desktop o tocco su mobile aprono l’aiuto; Escape o interazione esterna lo chiudono. Una stima backend può aggiungere il marcatore di preparazione stimata della prima stanza idonea. La didascalia blu discreta si espande in elenco di stanze e avvii ordinati, inizialmente chiuso: ciascuna può iniziare separatamente. Aggiornamenti ordinari lo mantengono aperto, un nuovo arrivo salvato o episodio lo chiude. L’editor nasconde didascalia e aiuto alternativo conservando la stima salvata; Indietro ripristina l’apertura dello stesso episodio. È una stima consultiva, non attività HVAC o progresso termico. Riepilogo settimanale, fonti e dettagli di preparazione restano nel pannello laterale.

<a id="climate-status-and-control-card"></a>
### Scheda di stato e controllo climatico

Usa `view: climate` per una scheda compatta dedicata a un’entità `climate.*` gestita. Segue il tema Home Assistant tramite variabili di colori e superfici e si adatta a chiaro, scuro, mobile, tablet e desktop.

La scheda combina temperatura, umidità, modalità HVAC e `hvac_action` comunicati con dati attuali di controllo ed esecuzione Velair. Riutilizza sequenza giornaliera effettiva, icona e colore del profilo della panoramica. Modalità, profilo, Comfort, Room Assist e precondizionamento compaiono solo se configurati e pertinenti. Un dispositivo eseguito esternamente mostra fornitore e pubblicazione anziché funzioni locali o azioni specifiche. L’azione facoltativa di rientro occasionale controlla la casa ed è indipendente dal responsabile del dispositivo selezionato.

```yaml
type: custom:velair-card
view: climate
selected_entity: climate.living_room
climate_name: Living room
climate_humidity_entity: sensor.living_room_humidity
climate_outdoor_temperature_entity: sensor.outdoor_temperature
climate_window_entities:
  - binary_sensor.living_room_window
  - binary_sensor.patio_door
climate_window_display: grouped
climate_room_assist_display: both
climate_preconditioning_display: both
climate_show_control_mode: true
climate_show_target_control: true
climate_show_hvac_mode_control: true
climate_show_native_climate_link: true
climate_actions:
  - type: boost
  - type: pause
    placement: more
  - type: planned-return
    enabled: true
  - type: script
    name: Ventilate room
    script: script.ventilate_living_room
    icon: mdi:window-open-variant
    color: "#03a9f4"
    confirmation: true
    placement: auto
```

L’area di controllo combina azioni rapide ordinate col selettore Automatico/Manuale configurabile indipendentemente, usando lo stesso modello della panoramica. Il pannello inferiore raggruppa modalità HVAC, obiettivo attuale quando acceso e scorciatoia al dialogo nativo. Ogni modalità pubblicata ha un’icona. Le modifiche dirette restano in sola lettura mentre Velair gestisce la programmazione: scegli prima **Manuale**, attendi la conferma della regolazione manuale, poi usa obiettivo e modalità. **Automatico** riprende la programmazione. Incremento, pause indipendenti, arresto e indisponibilità bloccano la modifica con spiegazione. La pausa interna della regolazione manuale non blocca questi controlli. Le zone esterne mantengono la scorciatoia nativa; un rientro occasionale abilitato può ancora aprire i controlli domestici.

Sono supportati obiettivi singoli e intervalli nativi `heat_cool`; le modifiche inviano entrambi i limiti insieme. Velair usa `min_temp`, `max_temp` e `hvac_modes` pubblicati. Le regolazioni usano `target_temp_step` se pubblicato, altrimenti l’ultimo passo valido comunicato per preservare obiettivi decimali. Segue l’alternativa manuale nelle impostazioni, poi `1` se nessun passo è stato mai comunicato o configurato. Non inventa modalità HVAC.

Le schede create prima dell’elenco ordinato usavano `climate_show_boost_action`, `climate_show_pause_action` e `climate_custom_actions`. Velair continua a leggerli, mentre l’editor visivo scrive `climate_actions` quando cambia l’elenco.

**One-off return** è un’altra azione fornita da Velair. Supporta le stesse opzioni di visibilità, nome nascosto e posizionamento automatico/Altro di incremento e pausa. L’editor elenca prima incremento, pausa e rientro occasionale, anche se nascosti. Il rientro usa un accento viola per distinguersi dalla pausa. Aprirlo sostituisce il pannello inferiore con modulo compatto di partenza o cronologia e controlli dell’episodio attuale. La X torna ai controlli climatici senza annullare la partenza. Modifiche di arrivo non salvate richiedono conferma di chiusura e un’azione in corso deve finire prima. Impostazioni ed effetti riguardano l’intera casa, non solo il dispositivo selezionato.

I pannelli incremento, pausa e rientro occasionale si uniscono a bordo e superficie della barra, come i controlli normali. Le azioni di sola icona mantengono larghezza compatta e centratura; aprire un pannello aggiunge spazio per l’icona di chiusura.

Le schede esistenti mantengono nascosta l’azione salvo abilitazione esplicita. Quelle create dal selettore Home Assistant la includono abilitata inizialmente, anche passando poi a `climate`. Una scheda YAML senza azione `planned-return` la mantiene nascosta. Abilitala nell’editor o aggiungi l’azione mostrata sopra.

L’editor mantiene le azioni fornite nella sezione fissa e offre ordinamento per quelle personalizzate. Aprirlo non riordina l’elenco salvato della dashboard.

Per impostazione predefinita, umidità attuale e scorciatoia cronologia usano gli attributi dell’entità climatica selezionata. Imposta `climate_humidity_entity` per usare invece valore attuale e cronologia nativa di un sensore dedicato. Velair non deduce la relazione perché le integrazioni non la pubblicano coerentemente.

Entità di temperatura esterna e finestre sono contesto facoltativo della dashboard. Velair non le rileva, gestisce o automatizza tramite la scheda. Gli stati delle finestre sono solo informativi, anche se usati da un’altra automazione o dal [blueprint finestre](blueprints/pause-zone-for-open-windows.it.md). Imposta `climate_window_display` su `grouped` o `individual`; l’editor offre caselle separate per lettura esterna e finestre, non mostrando le sezioni finché non scegli un’entità. L’intera intestazione dello stato attuale comprime il pannello aperto. Letture e contesto usano indicatori che vanno a capo anziché scorrere, mantenendo visibili tutti i sensori alle larghezze ridotte. Una valutazione Comfort disponibile usa una riga descrittiva separata sotto l’intestazione compressa con condizione, indicazione contestuale, icona e accento. L’editor può mostrarvi anche letture derivate abilitate; altrimenti restano nella riga espansa. La riga Comfort è omessa se non disponibile. Il controllo di espansione resta fisso mentre gli indicatori occupano le righe necessarie. Lo stato visivo vale solo per la sessione attiva della scheda. Stato attuale parte chiuso, ma l’editor può farlo partire aperto; il valore iniziale non impedisce apertura/chiusura manuale.

L’editor segue lo stesso ordine verticale della scheda. Può nascondere indipendentemente barra di stato, nome, stato operativo, singoli controlli e azioni, temperatura, umidità, lettura esterna, finestre, Comfort, letture Comfort compresse facoltative, sequenza, Room Assist e precondizionamento. Il nome può essere sostituito con un’etichetta locale, anche vuota, e ripristinato al nome descrittivo attuale. Se tutti gli elementi dello stato attuale sono disabilitati, l’intero contenitore è omesso. Le opzioni di visibilità omesse restano visibili per preservare le schede esistenti. Ogni lettura di temperatura o umidità visibile include la scorciatoia compatta alla cronologia nativa della fonte; ometterla omette anche la scorciatoia. Ogni categoria è richiudibile e i singoli script personalizzati restano chiusi finché non serve modificarli, mantenendo l’editor pratico su schermi stretti. Cambiare script aggiorna il nome dall’entità, poi di nuovo personalizzabile. La scorciatoia dell’intestazione Velair resta sempre presente per identificare la scheda e tornare all’integrazione. Ogni azione diretta può nascondere il nome riducendosi all’icona; etichetta accessibile e nome completo in Altro sono conservati.

Le azioni rapide condividono la riga superiore col selettore Automatico/Manuale. Restano in un gruppo indipendente all’estremo opposto a ogni larghezza. Se i nomi superano lo spazio, mantengono la larghezza naturale e il gruppo scorre orizzontalmente senza troncarli o mandarli a capo. Aprire incremento o pausa sostituisce in posizione il pannello normale; Annulla o una seconda pressione torna ai controlli. La barra di scorrimento nativa è nascosta. In caso di overflow, controlli direzionali occupano spazi esterni fissi e compaiono solo se restano azioni fuori schermo, senza coprire o ridimensionare la riga; se entrano tutte gli spazi scompaiono. La riga permette scorrimento tattile e trascinamento mouse/penna senza eseguire l’azione da cui parte il trascinamento. Gli script confermano brevemente accettazione o errore sul pulsante e incremento/pausa aperti mostrano la chiusura.

L’intestazione usa l’attività operativa attuale come segnale principale e raggruppa azione, origine dell’esecuzione e modalità HVAC sotto il nome. Una firma Velair compatta resta la scorciatoia al pannello, mantenendo nome del progetto e autore su due righe a ogni larghezza.

Sequenza e Room Assist riutilizzano i grafici Velair, incluso lo scorrimento su schermi stretti. Imposta `climate_room_assist_display` su `text`, `chart` o `both` per mostrare spiegazione concisa, grafico o entrambi. Lo stato resta vicino al titolo e la spiegazione usa una seconda riga se abilitata. Solo le viste col grafico si comprimono; quella solo testo resta visibile senza un controllo ingannevole di espansione.

`climate_preconditioning_display` segue lo stesso modello `text`, `chart` o `both`. Il titolo mantiene lo stato programmato o attivo e la seconda riga facoltativa identifica obiettivo e avvio calcolato. Il solo grafico mantiene soltanto lo stato sopra l’anteprima espandibile. Entrambe le sezioni grafiche partono chiuse salvo configurazione diversa; l’opzione iniziale compare nell’editor solo con un grafico selezionato. Titolo della sequenza, profilo e modalità attivi hanno visibilità indipendente; gli indicatori di modalità/profilo usano altezza ridotta specifica della scheda. L’espansione manuale resta locale alla sessione.

Incremento apre un modulo interno per tutte le opzioni supportate: obiettivo o intervallo, durata, modalità HVAC, ventilazione, preset, oscillazione, oscillazione orizzontale e umidità. Pausa permette durata finita o senza termine e mantenimento o spegnimento del dispositivo. La scheda non espone `pause_id`, riservato alle automazioni. Se la pausa può avere un altro responsabile o motivo, apre Velair anziché cancellare implicitamente i motivi. Il manuale può tornare automatico dalla scheda. Queste azioni locali non compaiono per zone esterne. Incremento e Pausa/Ripresa sono nascondibili indipendentemente e spostabili nell’elenco insieme agli script. Comportamento, etichette, icone e moduli sono forniti da Velair e non personalizzabili.

L’elenco può contenere anche entità `script.*` scelte dall’utente. Ogni scorciatoia ha nome locale, icona MDI, colore e conferma facoltativa. Velair salva solo presentazione nella scheda Lovelace ed esegue l’entità tramite `script.turn_on`; script, permessi e azioni restano gestiti da Home Assistant. Non accetta JavaScript arbitrario, template, dati di servizi o sequenze incorporate. Gli script devono quindi funzionare senza campi obbligatori; definisci valori necessari o predefiniti nello script stesso. Ogni azione usa `placement: auto` o `placement: more`. Le automatiche occupano le prime tre posizioni dirette disponibili e vanno in **Altro** quando piene. Quelle assegnate a `more` restano sempre nel menu indipendentemente dall’ordine. Il limite di tre è fisso. **Altro** è omesso senza azioni; **Apri Velair** resta la voce finale fissa ma non fa apparire da sola il menu. Gli script restano disponibili per zone esterne perché indipendenti, mentre le azioni Velair mantengono vincoli di controllo e disponibilità.

La linea sottile superiore è un indicatore semantico dello stato operativo, non progresso. Riscaldamento/preriscaldamento usano accento caldo, raffrescamento freddo, deumidificazione e ventilazione restano fermi, inattività è attenuata nella modalità attiva, spento neutro e indisponibilità un segnale di errore interrotto. L’animazione è un breve segnale del cambio di stato, disabilitato con movimento ridotto. `off` HVAC ha priorità su un vecchio `idle`, mostrando **Spento** con icona di alimentazione; inattività con modalità selezionata usa termostato neutro e non sembra una pausa Velair.

Le schede Lovelace per zona possono limitare i termostati visualizzati. È solo un filtro della dashboard, non cambia dati salvati o pianificatore. Le schede globali `overview-status` e `active-setup` non offrono selezione termostato o giorno perché non legate a uno specifico dispositivo o editor.

Aggiungi `view: active-setup` separatamente dalla scheda stato del pianificatore. Usa l’editor o `active_setup_controls` per scegliere controlli `modes`, `profiles` o `both`:

```yaml
type: custom:velair-card
view: active-setup
active_setup_controls: profiles
```

Il valore predefinito è `both` e ogni variante mostra comunque modalità e profili attuali. Il controllo solo profili mantiene l’azione delle programmazioni Default. Scegliere direttamente un profilo sostituisce tutti quelli precedenti e cambia la modalità in Manuale. Le zone non più coperte tornano a Default anziché conservare la configurazione precedente. Usa una modalità per attivare insieme più profili senza sovrapposizioni.

```yaml
type: custom:velair-card
view: preconditioning
entities:
  - climate.living_room
  - climate.bedroom
zone_order:
  - climate.bedroom
  - climate.living_room
```

Se `entities` è omesso, le schede per zona mostrano tutti i termostati gestiti.

Per `view: sensors`, l’editor può nascondere interruttore, selettore del sensore ambiente, tolleranza Room Assist, delta massimo, ritardo o stato in tempo reale per una vista solo informativa o compatta.

Per `view: comfort`, l’editor può limitare i termostati e nascondere indipendentemente configurazione e grafici di temperatura, umidità o CO2. Sono scelte visive solo della dashboard: non cambiano impostazioni Comfort, sensori, soglie, eventi o entità generate.

```yaml
type: custom:velair-card
view: comfort
entities:
  - climate.living_room
show_comfort_configuration: false
show_comfort_temperature: true
show_comfort_humidity: false
show_comfort_co2: true
```

<a id="create-a-daily-schedule"></a>
## Creare una programmazione giornaliera

Entrando in **Programmazioni**, Velair apre il giorno locale attuale. La selezione viene poi mantenuta passando fra termostati, programmazioni Default e di profilo o dati backend aggiornati.

1. Seleziona il dispositivo da configurare.
2. Seleziona il giorno.
3. Usa **Programmazione propria** per blocchi indipendenti oppure un modello con **Solo orari** o **Orari e impostazioni**. Per blocchi indipendenti continua sotto.
4. Aggiungi un blocco.
5. Scegli l’ora iniziale.
6. Scegli una modalità HVAC o lascia `Mantieni la modalità corrente`.
7. Inserisci temperatura o intervallo oppure opzioni climatiche senza obiettivo.
8. Salva.

Nelle impostazioni aggiuntive, un **Preset Velair** può fornire la configurazione climatica mantenendo l’orario indipendente. I giorni collegati seguono l’ambito del modello scelto. Consulta [regole complete](linked-schedules.it.md) ed [esempi domestici](linked-schedule-examples.it.md) prima di scegliere copia o collegamento.

Dopo una modalità HVAC esplicita non-off, usa il termometro compatto nella cella Obiettivo per disabilitare l’input di temperatura. Il campo grigio mostra un trattino e il blocco chiama solo `climate.set_hvac_mode` senza obiettivo singolo o intervallo. È utile per `auto`, dove integrazione o dispositivo possono riprendere il proprio programma, ma disponibile per ogni modalità non-off dichiarata. Lo stesso pulsante riabilita l’input ripristinando l’obiettivo precedente della bozza, che deve essere valido prima del salvataggio. I blocchi esistenti mantengono il comportamento attuale.

I blocchi di sola modalità non eseguono precondizionamento o Room Assist, non avendo obiettivo da raggiungere o correggere. Non permettono neppure impostazioni facoltative, affinché l’azione salvata sia un cambio HVAC univoco. I fornitori esterni devono dichiarare esplicitamente supporto; Velair non li converte mai in blocchi di temperatura.

Per programmare un preset o un’altra opzione senza obiettivo, scegli l’opzione nei controlli aggiuntivi e disabilita l’input Obiettivo. Puoi combinare preset, ventilazione, oscillazione, oscillazione orizzontale e umidità obiettivo. Chiama solo i servizi climatici corrispondenti; non invia `climate.set_temperature`, non cambia HVAC e non accende un dispositivo spento. Serve almeno un’opzione supportata. Modifiche dirette a quelle opzioni fra eventi non vengono ripristinate subito. I blocchi non eseguono precondizionamento o Room Assist. Più controlli ricevono chiamate separate in sequenza: se una successiva fallisce, quelli precedenti potrebbero essere già cambiati; Velair segnala l’invio fallito.

Applicando un modello o profilo a un altro dispositivo, Velair conserva le opzioni supportate. Se un blocco di sole opzioni resta vuoto, rifiuta la programmazione di destinazione anziché salvare un’azione vuota.

Velair usa le capacità dell’entità selezionata nell’editor. Le modalità non supportate non sono offerte e le temperature sono limitate all’intervallo del dispositivo.

Nei blocchi di temperatura, `Mantieni la modalità corrente` invia l’obiettivo e le eventuali opzioni selezionate senza richiedere un’altra modalità quando il dispositivo è acceso. Se è spento, Velair lo avvia nella prima modalità supportata compatibile con l’obiettivo. Il blocco può essere salvato se il dispositivo dichiara almeno una modalità diversa da Off compatibile con il tipo di obiettivo: questo non garantisce che la modalità in esecuzione sia compatibile al momento dell’applicazione. In caso di incompatibilità, l’invio fallisce senza cambiare modalità. Alcune integrazioni dichiarano il supporto per un singolo obiettivo soltanto dopo l’avvio di una modalità; Velair avvia quindi la modalità compatibile prima di inviare l’obiettivo e lascia che il servizio Home Assistant segnali eventuali errori specifici del dispositivo. Gli intervalli nativi richiedono comunque un supporto esplicito. Velair non converte mai un singolo obiettivo in un intervallo o viceversa.

L’editor mantiene visibili le opzioni climatiche selezionate in una riga compatta. Apri il controllo delle opzioni del blocco per vedere cosa invierà: l’eventuale obiettivo, la gestione della modalità HVAC e le opzioni selezionate. La spiegazione chiarisce anche che una singola temperatura non viene trasformata in un intervallo. Questo comportamento vale per programmazioni, Profili e modelli. L’editor mostra un avviso, senza impedire il salvataggio, se un blocco precedente dello stesso giorno seleziona una modalità che potrebbe non accettare quel tipo di obiettivo. Se nessun blocco precedente con modalità esplicita o spegnimento determina la modalità, l’indicazione si basa su quella attuale del dispositivo. La modalità può cambiare prima dell’esecuzione del blocco, quindi l’avviso è condizionale.

I blocchi di temperatura contengono una singola temperatura obiettivo oppure un intervallo completo con limite inferiore e superiore. L’editor usa le funzionalità dichiarate dall’entità climatica e, quando sono supportati, propone un intervallo per i nuovi blocchi `heat_cool`. Un intervallo viene visualizzato, ad esempio, come `20–24 °C`. Velair non inventa un intervallo a partire da una singola temperatura e rifiuta obiettivi incompleti, invertiti o incompatibili prima di inviare un comando.

In questa prima fase gli intervalli nativi sono limitati a `heat_cool`. Velair non presume che la modalità `auto` di un dispositivo usi lo stesso modello con limite inferiore e superiore.

Quando il dispositivo selezionato espone controlli aggiuntivi, l’editor del blocco li mostra. Per esempio, un condizionatore può offrire modalità ventilatore, preset, oscillazione, oscillazione orizzontale o umidità. Velair memorizza e invia soltanto le opzioni supportate dal dispositivo selezionato; quelle non supportate vengono omesse.

Se un blocco usa `Off`, i campi obiettivo non vengono usati perché il blocco spegne l’entità climatica.

<a id="timeline-editing"></a>
## Modifica della sequenza temporale

La sequenza temporale rappresenta visivamente le 24 ore del giorno selezionato.

- Trascina un blocco per spostarne l’ora di inizio.
- Trascina il bordo di un blocco per ridimensionare l’intervallo tra blocchi adiacenti.
- Usa l’elenco dei blocchi per impostare con precisione ora, modalità e temperatura.

<a id="preconditioning"></a>
## Precondizionamento

Per gestire l’assenza in base alla presenza e agli arrivi settimanali o occasionali, consulta [Rientro pianificato](planned-return.it.md). Configura la routine nella sottosezione Rientro pianificato di Precondizionamento e usa lo stato in tempo reale per vedere le singole fonti di presenza e modificare un arrivo occasionale senza cambiare la settimana salvata. **Plan return** può attendere una partenza confermata con un orario occasionale anche quando la routine settimanale automatica è disabilitata. Senza fonti di presenza salvate, l’avvio esplicito applica invece subito la configurazione Assenza; la normale preparazione e l’arrivo salvato vengono comunque eseguiti.

Il precondizionamento permette a Velair di avviare un obiettivo di comfort programmato prima dell’ora visibile del blocco, per un dispositivo climatico gestito.

Quando è abilitato per un dispositivo nella scheda Precondizionamento, l’ora del blocco rappresenta il momento desiderato per il comfort. Velair può applicare l’obiettivo prima, usando la previsione adattiva, mentre l’ora originale rimane visibile negli eventi futuri.

Se Velair ricalcola quando si trova già nella finestra di precondizionamento, applica subito l’obiettivo se la temperatura attuale richiede ancora riscaldamento o raffrescamento.

La scheda Precondizionamento elenca i dispositivi gestiti nell’ordine configurato in Impostazioni. Per ciascuno permette di:

- abilitare o disabilitare il precondizionamento;
- impostare un anticipo massimo, fino a 1440 minuti;
- configurare i parametri del modello adattivo e la differenza minima di temperatura;
- esaminare separatamente l’apprendimento del riscaldamento e del raffrescamento;
- ripristinare i parametri di regolazione predefiniti senza cancellare i campioni di apprendimento;
- azzerare l’apprendimento di una direzione senza influire sull’altra.

La configurazione è suddivisa in tempi e limiti, modello di apprendimento, cronologia e contesto esterno facoltativo. Quando il contesto esterno è disabilitato, anche il selettore del sensore è disabilitato. I dispositivi non disponibili non possono abilitare il precondizionamento e la scheda ne spiega il motivo.

Ogni controllo di regolazione include una breve guida contestuale. Passa il puntatore sull’icona informativa, raggiungila con il focus o toccala per vedere come l’aumento, la riduzione o l’attivazione dell’impostazione influenzano il precondizionamento.

Il precondizionamento è adattivo. Velair prevede ciascun evento futuro dalla differenza di temperatura attuale, inizialmente con un modello locale e poi, quando dispone di osservazioni complete sufficienti, con dati locali simili. Le previsioni basate sulla cronologia apprendono il potenziale termico per grado: piccole variazioni passate possono essere scalate per differenze future maggiori e grandi variazioni per differenze minori. Le osservazioni più simili e più recenti hanno maggiore influenza.

Velair non anticipa i blocchi `Off`. Se la temperatura attuale è già abbastanza vicina all’obiettivo, mantiene l’ora normale del blocco.

Per gli intervalli nativi `heat_cool`, Velair usa il limite inferiore quando la stanza richiede riscaldamento e quello superiore quando richiede raffrescamento. Viene comunque applicato in anticipo l’intero intervallo e l’apprendimento registra quale limite ha guidato la sessione.

Configurazione dettagliata ed esempi di riscaldamento, raffrescamento, sensore esterno, automazioni e Lovelace sono descritti in [Precondizionamento adattivo](adaptive-preconditioning.it.md).

Prima dell’avvio anticipato, Velair ascolta le variazioni di temperatura rilevanti dei dispositivi gestiti con precondizionamento abilitato. Per impostazione predefinita usa `current_temperature` del termostato. Se Room Sensor Assist è abilitato per quel dispositivo, usa il sensore ambiente selezionato come temperatura effettiva della stanza per le decisioni e l’apprendimento. Quando la variazione è sufficiente a incidere sulla differenza attuale, Velair raggruppa gli aggiornamenti e ricalcola localmente la prossima azione del pianificatore. Anche i pannelli aperti raggruppano le variazioni rilevanti della temperatura interna o esterna configurata in un unico aggiornamento, senza interrogazioni continue. Se cambia l’avvio anticipato dello stesso evento visibile, la sua riga viene evidenziata brevemente per rendere percepibile la modifica senza finestre di dialogo o notifiche globali.

<a id="room-assist"></a>
## Room Assist

La scheda Room Assist elenca i dispositivi gestiti nell’ordine configurato in Impostazioni. Per ciascuno permette di configurare Room Sensor Assist.

Il sensore ambiente selezionato è utile per valvole termostatiche o termostati il cui sensore integrato è troppo vicino a un radiatore, a un’uscita d’aria o a un’altra fonte locale di calore. Selezionarlo da solo non modifica il controllo di Velair. Diventa la temperatura ambiente effettiva soltanto quando Room Sensor Assist è abilitato: in quel caso Velair regola anche l’obiettivo del termostato affinché il dispositivo possa continuare a riscaldare o raffrescare in base alla lettura esterna della stanza.

Gli esempi dettagliati di riscaldamento, raffrescamento, automazioni e Lovelace sono descritti in [Room Assist](room-assist.it.md).

Room Sensor Assist è un’opzione avanzata che richiede un sensore di temperatura ambiente, ma non il precondizionamento adattivo. Per un blocco fisso `heat` o `cool` con fascia di tolleranza diversa da zero, Velair tratta i due bordi della fascia come soglie di commutazione. Mantiene una fase di esecuzione finché il sensore esterno raggiunge il bordo opposto, poi la inverte: il riscaldamento fisso si inizializza prudentemente verso il limite inferiore e il raffrescamento verso quello superiore. La correzione massima di assistenza limita la correzione con segno rispetto al bordo attivo. Con una fascia di tolleranza di `0` resta il comportamento precedente, con correzione intorno all’obiettivo centrale. Gli obiettivi scalari `auto` e `heat_cool` mantengono questo comportamento neutro; gli intervalli nativi `heat_cool` mantengono una fascia stabile di mantenimento, senza costringere un’unità automatica ad alternare attivamente riscaldamento e raffrescamento. La fascia di tolleranza predefinita è `0.3 °C` o `1 °F`, supporta incrementi di `0.1` gradi da `0` a `5 °C` o `9 °F` e si applica subito al salvataggio. La correzione massima predefinita è `2 °C` o `4 °F`, configurabile con incrementi di `0.1` gradi fino a `10 °C` o `18 °F`. L’obiettivo o l’intervallo visibile della programmazione rimane invariato; continuano ad applicarsi l’allineamento al passo di temperatura, la protezione programmata e i limiti fisici del dispositivo. La fase esiste soltanto durante l’esecuzione e riparte dopo una modifica di blocco, obiettivo o modalità, la cancellazione dello stato Room Assist o il ricaricamento dell’integrazione. Velair agisce sull’obiettivo del dispositivo: non può ignorare l’isteresi, la protezione del compressore o il tempo minimo di funzionamento del dispositivo. Usa quindi un blocco `Off` quando serve uno spegnimento esplicito.

Velair segue l’unità di temperatura configurata in Home Assistant, senza un’impostazione Celsius o Fahrenheit separata. Impostazioni mostra l’unità Home Assistant in sola lettura per consentire di verificare il comportamento attivo; la modifica va effettuata nelle impostazioni del sistema di unità di Home Assistant. Nuove programmazioni, modelli integrati, soglie Comfort, limiti Room Assist e impostazioni predefinite del precondizionamento adattivo sono fisicamente equivalenti nelle due unità. Le letture dei sensori di temperatura esterni vengono convertite prima del confronto con l’obiettivo climatico.

Velair memorizza i valori termici nell’unità registrata insieme ai dati. Se Home Assistant cambia unità, interrompe la programmazione e le scritture termiche, crea una notifica persistente e propone in Impostazioni una migrazione esplicita dall’unità memorizzata a quella attuale. Continua soltanto se tutti i valori salvati sono ancora nell’unità di origine indicata: i valori già nell’unità di destinazione verrebbero convertiti in modo errato. Programmazioni, modelli, obiettivi delle sostituzioni attuali e precedenti, limiti Comfort, valori Room Assist, impostazioni, velocità termiche e osservazioni del precondizionamento adattivo vengono migrati atomicamente.

L’aggiornamento una tantum dai dati delle versioni pubblicate di Velair che supportavano soltanto Celsius è diverso. Se Home Assistant usa già Fahrenheit, Velair considera quei dati in Celsius senza chiedere conferma, mantiene fermo il pianificatore e indirizza l’utente a **Reimposta Velair**. Il ripristino elimina la configurazione precedente e crea atomicamente nuove impostazioni Fahrenheit. Dopo questo aggiornamento, i successivi cambi di unità Home Assistant usano la conversione esplicita completa descritta sopra, preservando i dati.

Le esportazioni attuali nel formato portabile v16 conservano i valori originali e ne dichiarano l’unità. Le versioni precedenti di Velair non possono importare esportazioni v16: per ripristinarle usa una versione compatibile. I file precedenti supportati, tra cui v4, v5, v8 e v9, restano importabili. L’importazione converte i dati termici selezionati quando l’unità del file differisce da quella attuale di Home Assistant. I vecchi file senza unità vengono considerati in Celsius, perché tutte le versioni pubblicate di Velair che li producevano memorizzavano valori Celsius. L’esportazione rimane disponibile mentre la programmazione è ferma per un aggiornamento dell’unità, permettendo di salvare una copia di riferimento prima del ripristino e importarla in seguito.

Se un dispositivo non era disponibile durante la migrazione o l’importazione, Velair ne verifica i limiti e il passo di temperatura effettivo. Un `target_temp_step` valido pubblicato da Home Assistant ha priorità sull’ultimo passo segnalato e poi sul valore di ripiego configurato manualmente per la zona. Il pannello avvisa quando un obiettivo salvato non è più compatibile, affinché possa essere corretto prima di fare affidamento sulla programmazione.

Il comportamento completo di aggiornamento, migrazione, backup e recupero è descritto in [Unità di temperatura e migrazione](temperature-units.it.md).

Quando Room Sensor Assist è abilitato, la scheda Room Assist mostra una scala compatta della temperatura in tempo reale mentre è attivo un blocco di temperatura gestito. Per un singolo obiettivo indica l’obiettivo programmato, il sensore ambiente, l’obiettivo del dispositivo e la lettura del termostato. Una banda tratteggiata neutra indica i limiti della fascia di tolleranza. Con `heat` o `cool` fissi, lo stato mostra anche se il controllo procede verso il limite inferiore o superiore; nelle modalità automatiche scalari la banda rimane un margine neutro. Per un intervallo nativo si estende dal limite inferiore programmato meno la fascia di tolleranza al limite superiore più la fascia di tolleranza; due parentesi distinte mostrano comunque gli intervalli completi programmato e applicato, con un collegamento tra i rispettivi centri che indica lo spostamento con segno dell’intero intervallo. Sensore ambiente e lettura climatica restano indicatori individuali. La legenda tradotta completa rimane centrata sull’intervallo della fascia di tolleranza, anche quando è più stretto dell’etichetta; una fascia di tolleranza zero rimuove la superficie e viene indicata esplicitamente. Nascondere `show_room_assist_deadband` nasconde insieme impostazione, banda e legenda. Questi valori derivano dallo stato Home Assistant e dallo stato di esecuzione Velair e non vengono salvati come nuova cronologia. Se non è attivo un blocco di temperatura gestito, la scheda mostra uno stato di attesa anziché valori segnaposto. Se un sensore è selezionato ma Assist è disabilitato, indica che il sensore è salvato ma non operativo.

Room Sensor Assist reagisce agli eventi e non interroga periodicamente le temperature. Ascolta soltanto il sensore ambiente configurato e l’entità climatica mentre l’assistenza è attiva, raggruppa le variazioni usando il ritardo di aggiornamento per dispositivo, allinea gli obiettivi temporanei al passo effettivo pubblicato, all’ultimo segnalato o a quello configurato, ignora movimenti inferiori al passo e ripristina l’obiettivo programmato reale quando il pianificatore o la zona vengono messi in pausa, inizia un incremento, il blocco spegne il dispositivo, il sensore diventa inutilizzabile o la funzione viene disabilitata. La cancellazione dello stato di esecuzione elimina anche la fase di isteresi della modalità fissa. Se il precondizionamento adattivo ha già avviato un blocco futuro in anticipo, Room Sensor Assist segue quell’obiettivo fino all’ora di comfort programmata, senza tornare al blocco precedente.

Quando il precondizionamento viene disabilitato per un dispositivo, Velair non registra ascoltatori della temperatura dedicati, non pianifica ricalcoli, non avvia sessioni di apprendimento e non salva nuove osservazioni per quel dispositivo. I campioni già appresi vengono conservati e possono essere riutilizzati se il precondizionamento viene riabilitato.

Velair conserva inoltre una cronologia locale compatta dei tentativi di precondizionamento. Apre una sessione di apprendimento durante l’applicazione anticipata dell’obiettivo di comfort e salva un’osservazione compatta quando il dispositivo raggiunge la soglia obiettivo o arriva l’ora di comfort. Le sessioni interrotte da incrementi, pause, arresti del pianificatore o modifiche della programmazione vengono scartate.

La scheda Precondizionamento mostra lo stato di apprendimento locale per dispositivo. Riscaldamento e raffrescamento sono registrati separatamente e una direzione non supportata dall’entità climatica appare non disponibile. Quando Velair dispone di osservazioni complete sufficienti per una direzione supportata, può usare dati locali simili al posto del modello iniziale.

Ogni direzione supportata ha una scheda di stato compatta che indica se l’apprendimento è pronto, quale fonte del modello è attiva e il numero di campioni completi, parziali e non validi.

La scheda offre anche un’azione di azzeramento dell’apprendimento per ogni direzione supportata. Ricalibra da zero riscaldamento o raffrescamento separatamente, conservando programmazioni, impostazioni di precondizionamento e cronologia dell’altra direzione.

Il ripristino per dispositivo è distinto dall’azzeramento dell’apprendimento. Ripristina soltanto i parametri di regolazione del precondizionamento adattivo, conserva lo stato di abilitazione attuale, le impostazioni del sensore ambiente e tutti i campioni salvati di riscaldamento e raffrescamento.

Le osservazioni parziali non diventano falsi tempi di completamento. Costituiscono limiti inferiori: Velair sa che il tempo necessario era superiore alla finestra di anticipo tentata. Se osservazioni complete successive sufficienti dimostrano che funziona un anticipo minore, quelle parziali più vecchie smettono di spingere la previsione verso l’alto. L’apprendimento rimane così prudente senza rendere permanenti gli anticipi elevati.

Velair conserva cronologie compatte separate per riscaldamento e raffrescamento, affinché l’uso stagionale di una direzione non elimini l’apprendimento dell’altra.

Tutte le impostazioni e i calcoli del precondizionamento vengono eseguiti localmente in Home Assistant. Velair non invia cronologia climatica o dati delle programmazioni a servizi esterni.

I dettagli tecnici sugli stati di apprendimento locale, sull’output API e sulle regole di previsione sono descritti in [Interni del precondizionamento adattivo](../developer/adaptive-preconditioning.md).

<a id="environmental-comfort"></a>
## Comfort ambientale

La scheda Comfort elenca i dispositivi gestiti nell’ordine configurato in Impostazioni. Per ciascuno può monitorare temperatura ambiente, umidità e CO2. Può anche mostrare letture facoltative di punto di rugiada, umidità assoluta e Humidex, calcolate localmente dalla temperatura e dall’umidità effettive oppure fornite da un sensore Home Assistant esistente.

Comfort svolge soltanto monitoraggio. Non modifica blocchi, obiettivi climatici, modalità ventilatore, preset o pause. Descrive invece la stanza con condizioni comprensibili, come `Freddo e umido`, mantiene separata la qualità dell’aria CO2, indica se le letture sono complete ed emette eventi per le automazioni quando cambia la valutazione.

La temperatura può provenire da un sensore dedicato Comfort, dal sensore ambiente Room Assist quando configurato o da `current_temperature` dell’entità climatica. L’umidità può usare un sensore selezionato o `current_humidity` dell’entità quando disponibile. La CO2 viene valutata soltanto se è selezionato un sensore CO2.

Il modello Comfort Semplice predefinito usa un unico intervallo rettangolare di temperatura e umidità. Il modello guidato trasforma un riferimento di umidità al punto medio in una curva psicrometrica dipendente dalla temperatura. Il modello personalizzato in funzione della temperatura permette limiti di umidità diversi agli estremi di temperatura più freddo e più caldo: Velair interpola l’intervallo effettivo e mostra la sua area obiettivo inclinata, senza affermare che rappresenti un comfort universale. Le zone esistenti rimangono sul modello Semplice finché non viene modificato esplicitamente.

Queste letture aggiuntive sono disabilitate per impostazione predefinita e rimangono informative: non cambiano la classificazione Comfort o il comportamento climatico. Quando Comfort è disabilitato per un dispositivo, Velair non registra ascoltatori dei sensori Comfort per quel dispositivo. Quando è abilitato, ascolta soltanto i sensori selezionati pertinenti e l’entità climatica. Non ci sono interrogazioni continue.

Comfort può anche confrontare la stanza con sensori esterni espliciti di temperatura e, facoltativamente, umidità. Il blocco **Indoor vs outdoor** mostra la differenza di temperatura, l’umidità assoluta interna ed esterna e l’umidità relativa che l’aria esterna avrebbe alla temperatura interna. Quando il backend individua una direzione utile o un conflitto, Velair mostra un suggerimento prudente di ventilazione; il confronto non viene mai trattato come un comando. La configurazione è contenuta nel pannello Comfort richiudibile e disabilitare il confronto conserva gli ID dei sensori selezionati. I controlli **Ventilation guidance** per dispositivo permettono di richiedere differenze maggiori o minori di temperatura, umidità prevista e contenuto d’acqua nell’aria prima di mostrare il messaggio; i margini prudenti originali restano predefiniti.

Configurazione dettagliata ed esempi di riscaldamento, raffrescamento, CO2, automazioni e privacy sono descritti in [Comfort ambientale](comfort.it.md).

<a id="templates"></a>
## Modelli

I modelli sono insiemi giornalieri di blocchi riutilizzabili. Le impostazioni possono essere manuali o usare preset condivisi Velair. La scheda Modelli contiene anche la libreria dei preset climatici: un preset Velair condivide le impostazioni climatiche senza condividere gli orari dei blocchi.

La scheda Modelli permette di:

- creare un nuovo modello;
- rinominare un modello;
- modificarne i blocchi;
- applicarlo a dispositivi e giorni della settimana selezionati;
- eliminare i modelli privi di giorni collegati.

In Programmazioni, seleziona un modello come origine di un giorno per collegarne gli orari o la configurazione completa. La copia di un modello rimane un’operazione separata.

La scheda Programmazioni può anche salvare il giorno attuale come nuovo modello.

Quando copia o collega un modello a un dispositivo, Velair ne verifica modalità HVAC, tipi di obiettivo, limiti di temperatura e restrizioni del fornitore. Obiettivi fuori limite e modalità incompatibili vengono rifiutati. Le impostazioni manuali vengono adattate ai passi di temperatura supportati; i valori dei preset condivisi vengono adattati a ogni destinazione senza modificare la libreria. Le impostazioni facoltative non supportate vengono filtrate purché il blocco conservi un’azione valida.

Copiare i blocchi crea orari indipendenti, ma mantiene i riferimenti attivi ai preset. I collegamenti **Solo orari** condividono gli orari con assegnazioni climatiche indipendenti. I collegamenti **Orari e impostazioni** condividono l’intero modello e rendono i controlli della destinazione di sola lettura. Le modifiche al modello verificano tutti i giorni collegati, compresi i Profili inattivi. La modifica ne mantiene la posizione nella libreria.

Consulta [Preset dei blocchi e modelli collegati](linked-schedules.it.md) per tutte le regole e [Esempi pratici](linked-schedule-examples.it.md) per configurazioni complete, valori di ripiego dei nuovi blocchi, conversioni dei collegamenti, conteggi degli utilizzi e risoluzione dei problemi.

I modelli possono includere ogni impostazione climatica facoltativa disponibile tra i dispositivi gestiti, risultando utili anche negli impianti misti. Quando un modello viene applicato a un dispositivo specifico, Velair conserva soltanto le opzioni supportate. Per esempio, un modello può contenere `fan_mode: quiet` per un condizionatore, ma quel campo viene eliminato automaticamente se applicato a una valvola termostatica che non espone modalità ventilatore.

<a id="climate-profiles"></a>
## Profili climatici

I Profili climatici permettono di passare tra piani settimanali coordinati per più zone senza sovrascriverne le programmazioni predefinite. Ogni Profilo può assegnare a una zona una programmazione alternativa, metterla in pausa, metterla in pausa e spegnerla oppure mantenerne la programmazione predefinita. Le zone omesse continuano a usare le programmazioni predefinite.

Una Modalità può attivare più Profili insieme quando le zone configurate non si sovrappongono. L’attivazione diretta sostituisce l’insieme attivo con un solo Profilo e seleziona Manuale. Le zone presenti nell’insieme precedente ma non in quel Profilo tornano alle programmazioni predefinite. L’attivazione applica i blocchi attivi all’ora attuale, compresi quelli iniziati in un giorno precedente, e annulla gli incrementi nelle zone interessate. Le pause globali e per zona mantengono la priorità.

Il pannello laterale usa **Programmazioni** come spazio completo di pianificazione. Scegli **Programmazioni predefinite** per modificare la settimana normale oppure **Programmazioni del profilo** per creare un Profilo e configurare un termostato alla volta con **Programmazione predefinita**, **Programmazione del profilo** o **Pausa**. Entrambe le origini offrono la stessa sequenza temporale, opzioni dei blocchi, modelli e strumenti di clonazione, ma il salvataggio conserva una distinzione: un giorno predefinito viene salvato direttamente, mentre metadati e comportamento dei termostati del Profilo vengono salvati atomicamente come un unico Profilo. Puoi comunque attivare un Profilo dalla sua riga. La scheda separata **Modalità** combina i Profili in configurazioni riutilizzabili senza duplicarne l’editor.
Mentre Velair elabora le zone interessate, una barra globale mostra zona attuale, conteggio elaborato e risultato finale positivo o con errori parziali in tutte le schede. In Lovelace compare soltanto nella scheda Configurazione attiva, dove si attivano Modalità e Profili. Elaborato significa che Home Assistant e Velair hanno terminato la gestione della zona, inclusi i casi in cui una pausa o una sostituzione non richiedono comandi climatici; non significa che la stanza abbia già raggiunto la temperatura obiettivo.
I risultati positivi scompaiono automaticamente dopo un breve periodo di conferma. Quelli parziali o falliti restano visibili finché non vengono chiusi. Le automazioni Home Assistant possono attivare un Profilo con `velair.activate_profile` o selezionare un valore configurabile nell’entità nativa `select.velair_mode`.

Consulta [Profili climatici](climate-profiles.it.md) per configurazione, automazioni, riavvio, interazioni e portabilità.

<a id="external-schedule-execution"></a>
## Esecuzione esterna della programmazione

Normalmente Velair memorizza la settimana di una zona e la esegue tramite la sua entità Home Assistant `climate.*`. Quando **Impostazioni → Sistemi esterni** rileva un controller compatibile, una zona idonea può delegargli l’esecuzione. Velair pubblica quindi l’intera settimana effettiva selezionata dalla programmazione predefinita, da un Profilo o da una Modalità. La zona deve prima avere una programmazione effettiva salvata con almeno un blocco di temperatura; altrimenti Velair mantiene l’esecuzione locale e spiega il requisito in Impostazioni.

Una zona gestita esternamente resta limitata alla programmazione. Velair non invia azioni climatiche dirette per incrementi, pausa o ripresa, regolazione manuale, Room Assist o precondizionamento adattivo. Il comportamento **Pausa** del Profilo non è disponibile, mentre **Programmazione predefinita** e **Programmazione del profilo** selezionano la settimana da pubblicare. I limiti specifici del controller vengono mostrati una volta per ciascun sistema in uso in Impostazioni e applicati anche durante la modifica delle programmazioni predefinite e dei Profili compatibili. Se il controller richiede un punto implicito di continuità a mezzanotte, l’editor lo include nel conteggio visibile dei punti di commutazione giornalieri.

Dopo un tentativo nell’esecuzione corrente di Home Assistant, Panoramica mostra soltanto **Pubblicazione**, **Published** o **Fallito**. **Published** significa che l’integrazione esterna ha accettato la chiamata al servizio; non conferma che il controller fisico abbia applicato la programmazione. La zona conserva l’attività normale e il prossimo evento, mentre un indicatore compatto **Esterno** mostra controller e stato di pubblicazione. Velair non effettua interrogazioni, riletture o nuovi tentativi automatici. Consulta [Esecuzione esterna della programmazione](external-systems.it.md) per sistemi supportati, limiti, passaggio di controllo e stato attuale della verifica.

<a id="clone-schedules"></a>
## Clonazione delle programmazioni

Sotto l’editor, Velair può clonare il giorno attuale:

- su altri giorni della settimana dello stesso dispositivo;
- sullo stesso giorno della settimana di altri dispositivi gestiti.

Per la clonazione tra giorni, **Lun-ven**, **Fine settimana**, **Tutti i giorni** e **Cancella selezione** permettono una selezione rapida delle destinazioni, mantenendo disponibili i singoli giorni. Queste scorciatoie cambiano soltanto le destinazioni selezionate: **Clona** rimane un’azione esplicita e il giorno di origine non è mai incluso.

Le azioni di clonazione salvano prima le modifiche in sospeso quando necessario. Copiano la configurazione di origine, inclusi modello, tipo di collegamento, assegnazioni per i collegamenti dei soli orari e riferimenti ai preset. Clonare un giorno indipendente rimuove il collegamento di quel giorno nella destinazione; gli altri giorni mantengono i loro collegamenti. Le destinazioni incompatibili fanno rifiutare la clonazione senza modificare alcuna destinazione selezionata. Usa **Scollega** dopo la clonazione se il nuovo giorno non deve più seguire il modello.

<a id="pause-stop-and-resume"></a>
## Pausa, arresto e ripresa

Velair dispone di controlli globali del pianificatore:

- **Pausa** sospende l’esecuzione automatica per una durata in minuti.
- **Arresta** sospende l’esecuzione automatica a tempo indeterminato.
- **Riprendi** riporta il pianificatore alla modalità automatica.

Durante una pausa temporanea, Panoramica mostra il tempo rimanente e l’avanzamento.

La durata delle pause e degli incrementi viene inserita in minuti. L’interfaccia dei servizi Home Assistant permette valori fino a 10 080 minuti, pari a sette giorni.

Velair supporta anche la pausa per zona tramite servizi e automazioni. Una pausa di zona riguarda soltanto un’entità climatica gestita; gli altri dispositivi continuano a seguire le proprie programmazioni. Alla ripresa di una zona, Velair applica la programmazione attuale soltanto se in quel momento esiste un blocco attivo per il dispositivo; altrimenti non lo modifica.

<a id="boost"></a>
## Incremento

L’incremento agisce su una singola zona climatica. Sostituisce temporaneamente la programmazione di un’entità e lascia funzionare normalmente le altre zone.

All’avvio di un incremento, Velair acquisisce lo stato climatico ripristinabile della zona, inclusi modalità HVAC e singolo obiettivo o intervallo completo quando Home Assistant li espone. Questa istantanea serve soltanto a decidere cosa fare al termine dell’incremento.

L’incremento è disponibile tramite servizi Home Assistant, script, automazioni e controlli della dashboard. L’editor principale rimane così concentrato sulla programmazione, mentre sono possibili automazioni avanzate, per esempio:

- avviare un incremento per una stanza da un pulsante;
- avviarlo dopo un movimento;
- avviarlo da un assistente vocale;
- usare una modalità HVAC preferita durante l’incremento.

Alla scadenza, Velair gestisce la zona in questo ordine:

1. Se esiste un blocco attivo con modalità HVAC esplicita, applica il relativo obiettivo programmato.
2. Se il blocco attivo spegne il dispositivo, lo spegne.
3. Se non esiste un blocco attivo, ripristina lo stato acquisito prima dell’incremento.
4. Se il blocco attivo usa `Keep`, ripristina ugualmente lo stato precedente, perché `Keep` non definisce una nuova modalità HVAC da applicare dopo la sostituzione temporanea.

Un incremento non deve quindi indurre Velair a inventare un nuovo obiettivo di riscaldamento o raffrescamento quando la programmazione attuale non ne definisce esplicitamente uno.

<a id="startup-behavior"></a>
## Comportamento all’avvio

Per impostazione predefinita, dopo l’avvio di Home Assistant Velair ripristina lo stato memorizzato del pianificatore, ma non forza i dispositivi a un obiettivo programmato.

In Impostazioni puoi abilitare **Applica la programmazione attiva dopo l'avvio**. Quando è attivo, dopo l’avvio di Home Assistant Velair applica ai dispositivi gestiti il blocco attuale, purché il pianificatore sia in modalità automatica. Un blocco iniziato in un giorno precedente resta attivo fino all’inizio del successivo blocco settimanale. Gli incrementi attivi vengono rispettati.

<a id="automation-blueprints"></a>
## Blueprint per automazioni

Velair fornisce blueprint Home Assistant facoltativi tramite la documentazione:

- passare tra azioni Casa/Assenza scelte usando un’unica entità consolidata di presenza;
- mettere in pausa uno o più dispositivi gestiti mentre una finestra o una porta selezionata rimane aperta;
- selezionare Modalità stagionali o altre azioni dopo che una temperatura modificata è rimasta stabile, con notifiche immediate per letture non valide.

Usano eventi di stato Home Assistant e ritardi configurabili, senza interrogazioni periodiche. Il blueprint di presenza può segnalare quando il gruppo consolidato, il sensore template o l’helper resta non disponibile, senza eseguire azioni Casa o Assenza. Quello delle finestre identifica la pausa che crea, affinché la chiusura non rimuova una pausa manuale o di un’altra automazione. Se un contatto resta sconosciuto o non disponibile, Home Assistant mostra una notifica diagnostica ritardata per l’insieme dei termostati e la chiude automaticamente dopo il recupero; il contatto interessato continua comunque a impedire la ripresa. Consulta [Blueprint per automazioni](blueprints.it.md) per configurazione, esempi, comportamento all’avvio e regola di un’automazione per zona per i contatti delle finestre.

Il [blueprint stagionale](blueprints/seasonal-climate-selection.it.md) attende per impostazione predefinita 30 minuti dopo ogni variazione di temperatura; letture che cambiano continuamente possono rimandare le azioni a tempo indeterminato. All’avvio controlla soltanto la diagnostica. Usa il normale editor delle azioni Home Assistant per selezionare le Modalità Velair. Configura una vera Modalità con pausa e spegnimento se il clima mite deve fermare la climatizzazione: le azioni vuote lasciano invariato il funzionamento attuale.

<a id="portability"></a>
## Portabilità

La scheda Impostazioni permette di esportare e importare un file JSON versionato.

Il file può contenere:

- programmazioni dei termostati;
- modelli;
- preset condivisi dei blocchi;
- impostazioni del pannello;
- apprendimento del precondizionamento adattivo;
- definizioni dei Profili climatici;
- definizioni delle Modalità.

Il modello 16 conserva entrambi i tipi di collegamento ai modelli e i riferimenti ai preset. Esportare programmazioni o Profili include i modelli e i preset necessari, mostrati come sezioni selezionate aggiuntive. Le importazioni verificano la configurazione combinata, inclusi gli utilizzatori già presenti delle risorse condivise sostituite. I preset vengono uniti per chiave stabile: quelli con chiave corrispondente vengono sostituiti, mentre i preset locali assenti dal file rimangono. I backup esistenti restano importabili; le versioni precedenti di Velair non possono importare file modello 16. Consulta [l’esempio di backup](linked-schedule-examples.it.md#back-up-the-whole-setup).

Durante l’importazione puoi scegliere le sezioni da sovrascrivere. L’importazione sostituisce i dati selezionati: esporta prima se ti serve un punto di recupero. Le definizioni di Profili e Modalità sono portabili, la loro selezione attiva no. Velair mantiene gli ID dei Profili attivi ancora esistenti e torna alle programmazioni predefinite soltanto quando non ne rimane nessuno.

Ogni nuova esportazione registra l’unità di temperatura. Importando un file dell’altro sistema di unità, Velair converte i valori termici selezionati nell’unità Home Assistant attuale. I valori associati a un dispositivo disponibile vengono allineati al suo passo obiettivo effettivo; quelli indipendenti usano una precisione prudente quando non è disponibile un passo comune dei dispositivi. Il valore manuale di ripiego per zona è portabile, mentre l’ultimo passo osservato su un’entità locale non viene esportato. I file precedenti senza unità registrata vengono segnalati nella schermata di importazione e interpretati come Celsius.

L’apprendimento del precondizionamento adattivo viene associato tramite l’ID esatto dell’entità climatica Home Assistant. Quello dei dispositivi attualmente non gestiti viene mostrato prima dell’importazione e ignorato. Per i dispositivi corrispondenti, i dati importati sostituiscono la calibrazione esistente. L’apprendimento dei dispositivi locali assenti dal file resta invariato.

I valori di configurazione del precondizionamento sono già inclusi in **Programmazioni dei termostati**. La sezione separata **Apprendimento del precondizionamento** contiene la cronologia della calibrazione locale, che richiede tempo per essere acquisita.

<a id="maintenance"></a>
## Manutenzione

La scheda Impostazioni mostra le informazioni tecniche di versione:

- build del frontend;
- versione del modello di esportazione portabile;
- versione del modello di archiviazione;
- versione dell’integrazione.

Include anche un’azione di ripristino. Elimina tutti i dati delle programmazioni Velair: programmazioni, modelli, preferenze del pannello, incrementi e pause attivi, criteri per regolazioni esterne e regolazioni manuali attive per dispositivo, impostazioni Comfort e Room Assist, impostazioni e apprendimento del precondizionamento adattivo e comportamento all’avvio. Ricrea poi valori predefiniti adeguati all’unità per i dispositivi attualmente gestiti. La selezione separata delle categorie Diagnostica e il registro di esecuzione corrente non fanno parte di questo ripristino dei dati. Velair chiede conferma prima di procedere.

<a id="services"></a>
## Servizi

Velair espone servizi Home Assistant per automazioni e script:

- `velair.set_temperature`
- `velair.set_hvac_mode`
- `velair.apply_schedule`
- `velair.boost`
- `velair.cancel_boost`
- `velair.activate_profile`
- `velair.deactivate_profile`
- `velair.enable_room_sensor_assist`
- `velair.disable_room_sensor_assist`
- `velair.pause`
- `velair.pause_zone`
- `velair.resume`
- `velair.resume_zone`
- `velair.set_external_change_policy`
- `velair.enter_manual_adjustment`
- `velair.resume_automatic_control`
- `velair.set_daily_schedule`
- `velair.copy_day_schedule`
- `velair.clear_schedule`
- `velair.update_block_preset`

I servizi che indirizzano un’entità funzionano soltanto con i dispositivi selezionati durante la configurazione. Se viene fornita un’entità non gestita, Velair rifiuta la chiamata prima di modificare qualsiasi cosa.

<a id="velairupdate_block_preset"></a>
### `velair.update_block_preset`

Aggiorna un preset condiviso salvato usando il suo `preset_key` stabile. Gli aggiornamenti parziali conservano i campi omessi; una sostituzione esplicita può cambiarne l’azione. Le modifiche interessano ogni riferimento e usano le normali verifiche, priorità delle sostituzioni e ricalcoli di Precondizionamento. Consulta [Automazioni dei preset](preset-automations.it.md) per i campi e gli esempi con temperatura esterna, intervalli, opzioni del dispositivo e spegnimento/ripristino. Il servizio modifica una definizione condivisa: non seleziona un altro preset per un blocco.

<a id="velairactivate_profile"></a>
### `velair.activate_profile`

Attiva un Profilo climatico salvato e applica subito il comportamento effettivo attuale. Sostituisce l’intero insieme di Profili attivi; le zone non coperte tornano alle programmazioni predefinite. Usa l’ID stabile mostrato da Velair anziché il nome modificabile. L’attivazione diretta imposta il selettore Modalità su `Manual`. Omettere `profile_id` riporta ancora alle programmazioni predefinite per compatibilità; le nuove automazioni dovrebbero usare esplicitamente `velair.deactivate_profile`.

```yaml
action: velair.activate_profile
data:
  profile_id: vacation
```

<a id="velairdeactivate_profile"></a>
### `velair.deactivate_profile`

Disattiva tutti i Profili attivi e riporta immediatamente ogni zona alla programmazione predefinita.

```yaml
action: velair.deactivate_profile
```

<a id="velairset_temperature"></a>
### `velair.set_temperature`

Imposta per un’entità climatica gestita una singola temperatura o un intervallo con limite inferiore e superiore. `hvac_mode` è facoltativo.

È un servizio di utilità limitato a Velair, non una sostituzione di `climate.set_temperature` di Home Assistant. Le differenze sono:

- accetta soltanto entità gestite da Velair;
- verifica l’obiettivo rispetto a funzionalità e limiti di temperatura conosciuti da Velair;
- usa le regole Velair per la scelta della modalità HVAC quando ne viene fornita una o quando il dispositivo deve essere acceso.

Usa i servizi climatici nativi Home Assistant per il controllo generico. Usa `velair.set_temperature` quando un’automazione deve agire soltanto su dispositivi gestiti da Velair.

Puoi fornire anche i campi facoltativi `fan_mode`, `preset_mode`, `swing_mode`, `swing_horizontal_mode` e `humidity`. Velair applica soltanto quelli supportati dal dispositivo di destinazione.

```yaml
action: velair.set_temperature
data:
  entity_id: climate.living_room
  temperature: 21
  hvac_mode: heat
  fan_mode: quiet
```

Per un intervallo, ometti `temperature` e fornisci entrambi i limiti:

```yaml
action: velair.set_temperature
data:
  entity_id: climate.living_room
  target_temp_low: 20
  target_temp_high: 24
  hvac_mode: heat_cool
```

`temperature` e i campi dell’intervallo si escludono a vicenda. I due limiti sono richiesti insieme.

<a id="velairset_hvac_mode"></a>
### `velair.set_hvac_mode`

Imposta una modalità HVAC dichiarata diversa da Off senza inviare una temperatura obiettivo. Velair accetta soltanto dispositivi gestiti con esecuzione locale, verifica la modalità rispetto all’entità e registra il comando come azione propria, affinché non venga scambiato per una regolazione esterna.

```yaml
action: velair.set_hvac_mode
data:
  entity_id: climate.living_room
  hvac_mode: auto
```

Usa questo servizio quando un’automazione Velair deve cambiare soltanto la modalità HVAC. Velair non include nella chiamata un singolo obiettivo o un intervallo; l’integrazione o il dispositivo possono comunque modificare internamente il proprio stato al cambio di modalità. Un invio riuscito disabilita Room Assist attivo, perché Velair non controlla più una temperatura obiettivo per quel comando. Un invio fallito lascia Room Assist invariato e non emette un evento di obiettivo applicato.

Usa il servizio nativo `climate.set_hvac_mode` di Home Assistant per il controllo generico esterno a Velair. La modalità `off` viene intenzionalmente rifiutata: per quello scopo distinto usa l’azione Velair appropriata di pausa, programmazione o controllo climatico.

<a id="velairapply_schedule"></a>
### `velair.apply_schedule`

Applica immediatamente il blocco attualmente attivo. Se `entity_id` viene omesso, applica il blocco attivo a tutti i dispositivi gestiti.

```yaml
action: velair.apply_schedule
data:
  entity_id: climate.living_room
```

<a id="velairboost"></a>
### `velair.boost`

Sostituisce temporaneamente il controllo di un’entità climatica. Alla scadenza, Velair applica l’obiettivo programmato esplicito attivo se presente, oppure ripristina lo stato acquisito prima dell’incremento se non esiste un obiettivo esplicito da applicare.

```yaml
action: velair.boost
data:
  entity_id: climate.living_room
  temperature: 22
  duration_minutes: 45
  hvac_mode: heat
  fan_mode: high
```

Velair acquisisce lo stato ripristinabile prima di applicare l’incremento. Lo rifiuta quando il dispositivo non è disponibile e lo stato non può essere acquisito in sicurezza.

Un incremento con intervallo usa `target_temp_low` e `target_temp_high` al posto di `temperature`, seguendo le stesse regole di `velair.set_temperature`.

<a id="velaircancel_boost"></a>
### `velair.cancel_boost`

Annulla in anticipo un incremento attivo. Usa sempre lo stesso comportamento di ripresa della scadenza normale: applica l’obiettivo programmato esplicito attivo se presente; altrimenti, anche con un blocco `Keep`, ripristina modalità HVAC e obiettivo acquisiti prima dell’incremento. Non ha effetto se non è attivo un incremento.

```yaml
action: velair.cancel_boost
data:
  entity_id: climate.living_room
```

<a id="velairenable_room_sensor_assist"></a>
### `velair.enable_room_sensor_assist`

Abilita Room Sensor Assist per un dispositivo gestito. Deve già avere un sensore di temperatura ambiente configurato nella scheda Room Assist.

```yaml
action: velair.enable_room_sensor_assist
data:
  entity_id: climate.living_room
```

<a id="velairdisable_room_sensor_assist"></a>
### `velair.disable_room_sensor_assist`

Disabilita Room Sensor Assist per un dispositivo gestito. Se Velair stava applicando un obiettivo corretto dall’assistenza, ripristina quello programmato attuale.

```yaml
action: velair.disable_room_sensor_assist
data:
  entity_id: climate.living_room
```

<a id="velairpause"></a>
### `velair.pause`

Sospende l’esecuzione automatica della programmazione. Ometti `duration_minutes` per fermarla a tempo indeterminato.

```yaml
action: velair.pause
data:
  duration_minutes: 60
```

<a id="velairresume"></a>
### `velair.resume`

Riprende l’esecuzione automatica e applica la programmazione attuale.

```yaml
action: velair.resume
```

<a id="velairpause_zone"></a>
### `velair.pause_zone`

Sospende l’esecuzione automatica per un’entità climatica gestita mentre il resto di Velair continua a funzionare. Ometti `duration_minutes` per una pausa a tempo indeterminato.

Il campo facoltativo `action` può essere:

- `none`: lascia il dispositivo esattamente com’è e impedisce soltanto a Velair di modificarlo automaticamente;
- `turn_off`: spegne subito il dispositivo e lo mantiene in pausa.

Le automazioni possono anche inviare un `pause_id` facoltativo di 1–128 lettere, numeri, punti, trattini bassi, due punti o trattini, con una lettera o un numero iniziale. Una pausa identificata aggiunge un motivo senza sostituire quelli con altri ID. Riutilizzare l’ID aggiorna soltanto quel motivo; ripetere esattamente la stessa richiesta non ha effetto. Le chiamate senza `pause_id` conservano la priorità manuale e sostituiscono tutti i motivi con un’unica pausa manuale.

```yaml
action: velair.pause_zone
data:
  entity_id: climate.guest_room
  duration_minutes: 120
  action: turn_off
  pause_id: window_guard
```

<a id="velairresume_zone"></a>
### `velair.resume_zone`

Riprende l’esecuzione automatica per un’entità climatica gestita. Per impostazione predefinita applica il blocco attivo per quel dispositivo se presente; altrimenti lo lascia invariato.

Con `pause_id`, Velair rimuove soltanto quel motivo. Gli altri mantengono la zona in pausa e la programmazione viene applicata soltanto al termine dell’ultimo motivo. Usa `resume_all: true` per rimuoverli tutti esplicitamente. Omettere entrambi i campi conserva il precedente comportamento di ripresa completa. I campi non possono essere combinati e `resume_all: false` senza ID viene rifiutato.

I motivi scadono indipendentemente. Se uno di quelli rimasti usa `turn_off`, l’azione effettiva della pausa mantiene lo spegnimento. Gli incrementi vengono rifiutati mentre una zona è in pausa.

```yaml
action: velair.resume_zone
data:
  entity_id: climate.guest_room
  apply_current_schedule: true
  pause_id: window_guard
```

<a id="velairset_daily_schedule"></a>
### `velair.set_daily_schedule`

Sostituisce la programmazione di un giorno della settimana per un dispositivo gestito.

```yaml
action: velair.set_daily_schedule
data:
  entity_id: climate.living_room
  weekday: monday
  blocks:
    - start: "06:30"
      action: set_temperature
      temperature: 21
      hvac_mode: heat
      fan_mode: quiet
    - start: "09:00"
      action: turn_off
    - start: "18:00"
      action: set_temperature
      temperature: 20
      hvac_mode: heat
```

I blocchi possono includere valori facoltativi `fan_mode`, `preset_mode`, `swing_mode`, `swing_horizontal_mode` e `humidity`. Quelli non supportati vengono rimossi per il dispositivo di destinazione prima del salvataggio o dell’applicazione.

Usa `action: set_climate_options` con uno o più di questi campi e senza temperatura o `hvac_mode` per chiamare soltanto i rispettivi servizi Home Assistant. Per esempio:

```yaml
action: velair.set_daily_schedule
data:
  entity_id: climate.living_room
  weekday: monday
  blocks:
    - start: "06:30"
      action: set_climate_options
      preset_mode: comfort
    - start: "22:00"
      action: set_climate_options
      preset_mode: eco
      fan_mode: quiet
```

<a id="velaircopy_day_schedule"></a>
### `velair.copy_day_schedule`

Copia un giorno predefinito salvato, inclusi collegamento al modello e riferimenti ai preset, su giorni selezionati. Ometti `target_entity_ids` per copiare all’interno del dispositivo di origine oppure fornisci quell’elenco per copiare su altri dispositivi gestiti. Ogni combinazione dispositivo/giorno selezionata viene verificata e salvata in un’unica transazione.

```yaml
action: velair.copy_day_schedule
data:
  entity_id: climate.living_room
  source_weekday: monday
  target_weekdays:
    - tuesday
    - wednesday
    - thursday
```

Per copiare la stessa configurazione del lunedì su altri termostati:

```yaml
action: velair.copy_day_schedule
data:
  entity_id: climate.living_room
  source_weekday: monday
  target_weekdays:
    - monday
  target_entity_ids:
    - climate.study
    - climate.bedroom
```

Il servizio copia l’origine salvata più recente con il blocco della configurazione acquisito. `expected_revision` facoltativo rifiuta l’operazione se la configurazione è cambiata; il pannello fornisce automaticamente la propria revisione corrente. I Profili si modificano e si salvano tramite il flusso che li gestisce nella loro interezza. Copiare un giorno indipendente salvato rimuove i collegamenti dei giorni di destinazione selezionati; gli altri giorni vengono conservati.

<a id="velairclear_schedule"></a>
### `velair.clear_schedule`

Cancella la programmazione di un giorno. Ometti `weekday` per cancellare tutti i giorni del dispositivo gestito.

```yaml
action: velair.clear_schedule
data:
  entity_id: climate.living_room
  weekday: sunday
```

<a id="automation-events"></a>
## Eventi per automazioni

Velair emette anche eventi Home Assistant utilizzabili come trigger delle automazioni. Sono transitori: non vengono salvati come configurazione e non sostituiscono le entità diagnostiche.

Tutti gli eventi di esecuzione usano lo stesso tipo di evento Home Assistant:

```text
velair_event
```

Il campo `event` del payload identifica cambi dell’insieme dei Profili, cambi della modalità del pianificatore, obiettivi applicati, piani e osservazioni del precondizionamento adattivo, variazioni del Comfort ambientale, cambi di stato e obiettivo Room Assist, incrementi e pause di zona.

Consulta [Eventi per automazioni](automation-events.it.md) per regole esatte di emissione, eliminazione dei duplicati, campi disponibili e un payload completo di esempio per ciascun tipo di evento.
