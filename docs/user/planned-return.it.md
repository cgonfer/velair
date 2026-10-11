<a id="planned-return"></a>
# Rientro pianificato
<!-- velair-docs:start -->
Traduzioni: [Originale in inglese](planned-return.md) · [Español](planned-return.es.md) · [Français](planned-return.fr.md) · [Deutsch](planned-return.de.md) · [Italiano](planned-return.it.md) · [Nederlands](planned-return.nl.md) · [Polski](planned-return.pl.md) · [Português (Brasil)](planned-return.pt-br.md) · [Português (Portugal)](planned-return.pt-pt.md) · [Русский](planned-return.ru.md) · [Stato delle traduzioni](../translation-status.md)

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

Rientro pianificato prepara la casa per un arrivo abituale o occasionale dopo che i segnali di presenza selezionati hanno confermato che l’abitazione è vuota, oppure dopo un avvio occasionale esplicito senza fonti di presenza configurate. Si configura in Velair: una routine settimanale stabile non richiede blueprint aggiuntivi o azioni giornaliere. La routine automatica è disabilitata per impostazione predefinita e funziona localmente in Home Assistant. I rientri occasionali richiedono Modalità Assenza/Rientro salvate e programmazione automatica operativa; le fonti di presenza sono facoltative per gli avvii espliciti. La routine settimanale richiede almeno una fonte di presenza.

<a id="setup"></a>
## Configurazione

1. Crea le Modalità desiderate per Assenza e Casa oppure usa Default come destinazione. I Profili Assenza possono spegnere i dispositivi o usare programmazioni settimanali meno impegnative.
2. Apri **Precondizionamento**, scegli **Ritorno programmato** nel selettore delle sottosezioni e aggiungi segnali di presenza per le partenze monitorate o settimanali. Usa sensori binari, input boolean, gruppi o la zona casa Home Assistant (`zone.home`). Includi chiunque possa restare in casa, ospiti compresi. Home Assistant resta responsabile del rilevamento di persone e posizioni; puoi comunque combinare regole complesse in un helper.
3. Nella sezione assenza, scegli per quanto tempo la casa deve restare vuota e quale Modalità Assenza attivare. Il valore predefinito è dieci minuti; il controllo compatto accetta minuti o ore. L’arrivo viene riconosciuto immediatamente.
4. Nella sezione arrivo, inserisci l’orario abituale per ciascun giorno pertinente e seleziona la Modalità di destinazione. I giorni senza orario non hanno un rientro automatico. Velair usa la programmazione della destinazione all’arrivo per preparare ogni zona.
5. Abilita il precondizionamento adattivo per le zone che devono partire in anticipo. Vengono riutilizzate le impostazioni esistenti e l’apprendimento locale di riscaldamento e raffrescamento.
6. Abilita la routine con l’interruttore della barra di stato, poi salva. L’interruttore modifica la bozza; Annulla ripristina l’impostazione salvata. Ferma eventuali automazioni Casa/Assenza che selezionano Modalità per la stessa abitazione: due controller entrerebbero in conflitto.

I giorni seguono la preferenza **Primo giorno della settimana** salvata in Impostazioni Velair. Inserisci direttamente l’orario di arrivo per ogni giorno. Se esci in un giorno senza orario, Velair applica Assenza dopo la conferma, non pianifica la preparazione anticipata e ripristina la destinazione al rilevamento della presenza. Il fuso orario Home Assistant compare accanto alla routine settimanale. Le modifiche restano nella bozza fino al salvataggio. Annulla e Salva sono a destra nel piè di pagina della configurazione.

Il riepilogo superiore separa le tre parti della routine in contenitori con bordo corrispondenti alle sezioni delle impostazioni, senza una scheda esterna o un bordo laterale condiviso. La routine settimanale mostra Modalità Assenza, ritardo di conferma, preparazione adattiva e Modalità di destinazione come flusso semplice; l’interruttore modifica l’abilitazione della routine. Il ritardo è il tempo durante il quale la casa deve restare vuota, non una stima del tempo di preparazione. La sezione presenza mostra il risultato combinato e i conteggi delle fonti; espandila per esaminare ogni segnale. I segnali sconosciuti impediscono una nuova assenza e sono distinti dalla presenza confermata. La sezione di rientro rapido riunisce la partenza occasionale e i controlli dell’arrivo dell’episodio attuale. Le azioni di esecuzione usano la configurazione salvata: salva o annulla le modifiche pendenti prima di annunciare una nuova partenza.

Il modulo segue l’ordine di partenza e arrivo: fonti di presenza, ritardo di assenza e Modalità Assenza, poi orari settimanali e Modalità di destinazione. Le fonti usano il pulsante circolare verde Aggiungi dell’editor dei blocchi quando una fonte è selezionata. Aggiungi e Rimuovi disabilitati mantengono l’aspetto trasparente; quelli abilitati reagiscono al puntatore e al focus.
L’elenco configurato inizialmente è chiuso. Il riepilogo mostra totale e conteggi dei segnali di presenza, assenza e stato sconosciuto; espandilo per esaminare o rimuovere le singole fonti. Su mobile il riepilogo occupa tutta la larghezza del selettore e della riga Aggiungi; icone e numeri mantengono uniti i conteggi, con etichette accessibili complete. I contatori sono allineati al bordo finale del riepilogo. Su mobile l’elenco aperto ne condivide la larghezza, con Rimuovi alla fine di ogni riga e più spazio per nomi e ID. Su desktop gli elenchi seguono la larghezza del selettore. L’apertura non modifica la configurazione. I ritardi inseriti in ore vengono arrotondati al minuto più vicino; il ritardo equivalente compare accanto al controllo.

Gli stati riconosciuti di presenza sono `on` e `home`; quelli di assenza sono `off` e `not_home`. Per la zona casa, zero persone significa vuota e un conteggio positivo significa occupata. Qualsiasi segnale di presenza rende la casa occupata; soltanto l’assenza segnalata da tutte le fonti la rende vuota. Se nessun segnale indica presenza e uno è sconosciuto o non disponibile, la presenza complessiva è sconosciuta e non possono iniziare nuove assenze. Un rientro già accettato resta pianificato. Il pannello mostra risultato combinato e singole fonti.

Seleziona segnali che rappresentino la presenza: un sensore di movimento spento non significa necessariamente che non ci sia nessuno in casa.

<a id="room-preparation"></a>
## Preparazione delle stanze

Espandi **Room preparation** sotto il flusso della routine per vedere tutti i dispositivi gestiti. L’elenco parte chiuso e mostra conteggi per preparazione adattiva, funzionamento soltanto all’arrivo e nessuna preparazione. Aprirlo non cambia impostazioni né invia comandi climatici. La stessa panoramica vale per rientri settimanali e occasionali.

Ogni riga identifica stanza, origine della programmazione di destinazione e stato della preparazione. Un dispositivo assente dai Profili della Modalità di destinazione usa comunque la programmazione predefinita (**Predefinito**); anche un comportamento normale esplicito usa Default. Una programmazione di Profilo mostra il nome di quel Profilo. Una pausa di Profilo nella destinazione, una zona disabilitata o un’esecuzione esterna sono identificate separatamente, anziché come funzionamento soltanto all’arrivo. Senza precondizionamento adattivo, una stanza locale abilitata segue la propria programmazione effettiva all’arrivo: non viene esclusa automaticamente dai cambi di Modalità.

Senza un rientro futuro, l’elenco descrive le capacità della configurazione salvata, non prevede che la stanza partirà in anticipo. Dopo l’accettazione di un rientro, determina ogni obiettivo di destinazione per quell’orario e mostra stato in attesa, preparazione, obiettivo raggiunto, sospensione o indisponibilità con il motivo pertinente. L’assenza di dati di temperatura o di una stima valida impedisce la preparazione anticipata; Incremento, regolazione manuale e pause esplicite conservano la normale priorità. Una partenza non confermata non può apparire in preparazione. **Preparing** descrive l’intenzione attiva di Velair, non conferma la ricezione di un comando o il funzionamento fisico del dispositivo. **Target reached** indica una temperatura attualmente misurata entro la tolleranza di preparazione; può essere vero già prima della partenza e non avvia un’assenza né evita la conferma.

**Planned start** è una stima, non una prova di invio del comando o di preparazione fisica. Gli obiettivi supportano riscaldamento, raffrescamento e intervalli di temperatura. Rientri completati, annullati o saltati tornano alle informazioni di configurazione senza mostrare vecchi orari di preparazione. Diagnostica continua a usare le impostazioni salvate dal backend finché il salvataggio non riesce, senza un ulteriore promemoria di preparazione. Questo elenco completo sostituisce il precedente elenco di zone limitato all’episodio.

<a id="one-off-return"></a>
## Rientro occasionale

In **One-off return**, scegli una data e un orario futuri e premi **Plan return**. Data e ora sono affiancate. Su mobile, Plan return è sulla riga successiva, allineato al bordo destro dell’ora; sui layout più ampi resta accanto ai campi. La spiegazione è sotto i controlli. Puoi farlo prima di uscire o mentre sei già fuori. Velair usa le impostazioni salvate di Modalità e presenza. Con fonti di presenza configurate mantiene la richiesta pendente e applica Assenza soltanto dopo che tutte hanno segnalato assenza per il ritardo di conferma, proteggendo chi resta in casa. Senza fonti salvate, premere Plan return costituisce la conferma esplicita della partenza: Assenza parte subito, senza ritardo. In questo caso Velair non deduce che la casa sia vuota né rileva il rientro fisico; prepara normalmente le stanze e attiva la destinazione all’arrivo salvato. Una fonte configurata sconosciuta o non disponibile continua ad attendere: un’entità mancante non può essere trattata come un elenco vuoto.

Data e ora occasionali sostituiscono l’orario settimanale soltanto per questa assenza e funzionano anche con la routine automatica disabilitata. Puoi modificare o annullare l’avviso pendente; se la partenza non viene confermata entro l’arrivo, scade senza cambiare Modalità. Se tutte le fonti indicano già assenza e non esiste un episodio attivo, pianificare il rientro avvia subito il ritardo configurato, senza richiedere un nuovo evento dei sensori. Se un’assenza è già attiva, modifica data e ora con il suo editor: il rientro diventa un’eccezione occasionale senza applicare nuovamente Assenza. Posticipare l’arrivo termina la preparazione precedente e ripristina il comportamento Assenza attuale fino al nuovo momento di preparazione. Incrementi e sostituzioni manuali restano protetti. L’obiettivo viene determinato sulla data locale selezionata, anche quando la preparazione comincia il giorno prima. Inviare lo stesso istante non azzera la preparazione. Arrivi passati o attuali e orari locali inesistenti al cambio dell’ora vengono rifiutati; un orario ripetuto usa la prima occorrenza futura.

Gli episodi completati, saltati e annullati restano bloccati per la routine automatica finché non viene rilevata presenza, evitando che la casa vuota avvii da sola un’altra partenza settimanale. Puoi scegliere esplicitamente **Plan return** dopo qualsiasi episodio inattivo senza attendere di tornare a casa. La nuova richiesta usa fonti e Modalità attuali. Con fonti, conferma nuovamente l’assenza per il ritardo configurato anche se tutti sono già fuori, senza cambiare subito Modalità. Senza fonti, la registrazione esplicita attiva Assenza immediatamente. Pannello e scheda mostrano un nuovo modulo appena l’episodio diventa inattivo. Se la pianificazione non è disponibile, il modulo resta visibile con Plan return disabilitato e una spiegazione delle impostazioni salvate e dello stato del pianificatore necessari. In quella situazione puoi comunque annullare un rientro attivo.

Dopo la partenza confermata, usa **Annulla** per fermare il rientro e ripristinare Modalità e Profili precedenti registrati, oppure **Modifica arrivo** per aggiornarne data e ora. Durante la conferma, l’annullamento lascia invariata la selezione perché Assenza non è ancora stata applicata. Disabilitare la routine automatica o modificare gli orari settimanali non annulla un rientro manuale. Modificarne fonti di presenza o Modalità invalida l’avviso precedente. Le selezioni esplicite di Modalità/Profili annullano rientri pendenti e attivi. Un pianificatore fermo non esegue il rientro.

La prima riga mantiene il titolo Rientro occasionale a sinistra e gli indicatori di presenza, esclusivi della scheda, a destra. La fase attuale è un sottotitolo compatto associato al titolo, senza etichetta o riga separata. Durante la conferma la fase viene indicata invece dall’intestazione del processo temporizzato. La scheda dashboard raggruppa i conteggi in alto a destra quando esistono fonti. Senza fonti, contatori e icona del ritardo non usata sono omessi e il pannello mostra **Non monitorata** anziché presenza sconosciuta. L’icona del ritardo compare soltanto prima della conferma di un’assenza attiva; è nascosta durante Assenza/Preparazione e negli errori attivi con partenza confermata. Il pannello non ripete quegli indicatori. Passa il puntatore per una breve spiegazione della fase.
Durante la conferma, una riga discreta del timer spiega che Velair controlla se la casa rimane vuota. **Fino alle** mostra la scadenza di conferma del backend nell’ora locale Home Assistant, inclusa la data se diversa da oggi. Velair attiva Assenza dopo la conferma soltanto se tutte le fonti indicano ancora assenza. È una scadenza, non un conto alla rovescia in tempo reale o una partenza confermata. Lo stesso processo compare mentre la routine settimanale conferma l’assenza prima che esista un episodio; dati mancanti non generano orari inventati.
Prima della conferma, un’icona di arrivo e **Expected arrival** identificano il rientro salvato con etichetta accessibile e suggerimento. La riga è allineata al titolo e allo stato. Data e ora salvate sono un elemento cliccabile compatto, senza matita o sottolineatura. La sequenza temporale confermata usa la stessa icona; soltanto data/ora sottolineate e matita a sinistra costituiscono il pulsante di modifica. Seleziona quel valore per aprire l’editor in linea. La riga delle azioni ha **Indietro**, blu con freccia a sinistra, e **Modifica arrivo**, verde a destra. Indietro scarta le modifiche non salvate e chiude l’editor senza cambiare il rientro.
Su un pannello ampio, l’editor resta compatto e allineato all’estremità di arrivo; l’azione di modifica resta a destra sotto l’editor. Schermi stretti e scheda mantengono il layout adattivo. I campi restano nascosti finché non richiesti. Indietro ripristina l’ultimo arrivo salvato e nasconde i campi, eliminando avviso e protezione della navigazione per l’arrivo; la configurazione indipendente non salvata della routine resta protetta. Riaprire riparte dall’arrivo salvato. Durante un’assenza confermata, l’estremità di arrivo della sequenza è lo stesso pulsante di modifica, senza duplicazioni.
Annulla compare a sinistra sotto il grafico e la didascalia di preparazione soltanto con editor chiuso. Durante la modifica è nascosto, Modifica arrivo resta a destra e Indietro a sinistra scarta localmente la modifica. Cambiare un campo non modifica il rientro finché Modifica arrivo non riesce. Le modifiche riuscite chiudono l’editor e riportano il focus all’arrivo salvato; errori e aggiornamenti dei sensori conservano la bozza aperta. Un avviso identifica le modifiche pendenti; navigare o ricaricare richiede conferma prima di scartarle. Salvare la configurazione della routine non applica una modifica all’arrivo.
Indietro e Modifica arrivo hanno superfici compatte blu e verdi rispettivamente, alte 32 pixel dentro aree tattili di 44 pixel. L’annullamento usa una superficie compatta rossa con icona e testo bianchi sotto i dati dell’episodio, anch’essa alta 32 pixel dentro un’area di 44 pixel; puntatore e focus rimangono chiari. I colori di testo e icone si adattano al tema per restare leggibili. Le azioni non disponibili hanno sfondo neutro, testo e icone attenuati e cursore di divieto. Modifica arrivo diventa verde quando l’arrivo viene modificato. La fase rimane associata al titolo. Annulla resta a sinistra sotto i dati quando non si modifica; Modifica arrivo è allineato a destra sotto l’editor aperto. Pannello e scheda conservano questo raggruppamento su mobile. Plan return resta a destra nel nuovo modulo. Le azioni riuscite aggiornano l’episodio senza un messaggio aggiuntivo di salvataggio.

<a id="home-assistant-actions"></a>
### Azioni Home Assistant

Automazioni, script e dashboard possono annunciare una partenza con `velair.start_planned_return`. Sono richiesti sia `return_date` (`YYYY-MM-DD`) sia `return_time` (24 ore, `HH:MM`), che insieme devono identificare un arrivo futuro nel fuso orario Home Assistant. Il selettore nativo può inviare `HH:MM:00`; i secondi zero sono accettati e normalizzati alla precisione del minuto. Scegli una data futura per l’esempio seguente:

```yaml
action: velair.start_planned_return
data:
  return_date: "2026-10-09"
  return_time: "19:25"
```

L’azione usa le impostazioni salvate di presenza e Modalità e lo stesso comportamento di conferma, preparazione e sostituzione di **Plan return**. Funziona con la routine settimanale disabilitata e aggiorna data e ora se l’assenza è già attiva, senza riapplicare Assenza. Modalità salvate e programmazione automatica devono essere operative. Le fonti sono facoltative per i rientri occasionali: un elenco salvato vuoto applica subito Assenza, mentre le fonti configurate mantengono le normali regole di conferma. Un arrivo passato o attuale viene rifiutato senza sostituire il precedente. Un orario scaduto o inesistente al cambio dell’ora viene rifiutato; durante un’ora ripetuta Velair sceglie la prima occorrenza ancora futura.

Annulla un rientro pendente o attivo:

```yaml
action: velair.cancel_planned_return
data: {}
```

La stessa azione chiude anche l’avviso di un episodio inattivo. Ferma preparazione e rientro temporizzato e mantiene il blocco dell’annullamento automatico. Dopo una partenza confermata ripristina la Modalità e la selezione esatta dei Profili salvate prima dell’episodio. Durante la conferma lascia invariata la selezione. Un nuovo **Plan return** esplicito può sostituire l’episodio inattivo. Pannello e scheda usano la stessa azione di annullamento.

<a id="cancelling-a-return-examples"></a>
## Annullamento del rientro: esempi

Il ritardo di conferma avviene **prima** dell’applicazione della Modalità Assenza. Annullare durante il ritardo non richiede un ripristino: Modalità e Profili precedenti sono ancora attivi. Dopo la partenza confermata, l’annullamento ripristina la selezione registrata all’inizio dell’episodio anziché attivare subito la Modalità Rientro configurata.

Per gli esempi seguenti, supponiamo che:

- **Comfort** sia attiva e selezioni i Profili **Living room comfort** e **Bedroom comfort**;
- la Modalità Assenza sia **Away**, quella Rientro **Evening** e l’arrivo sia previsto alle 18:00;
- le fonti segnalino casa vuota alle 13:00 e il ritardo sia di cinque minuti.

<a id="cancel-before-confirmation-finishes"></a>
### Annullare prima del termine della conferma

| Ora | Cosa succede | Modalità e Profili selezionati |
| --- | --- | --- |
| 13:00 | Avvia un rientro. Velair controlla che la casa resti vuota fino alle 13:05. | Comfort e i suoi due Profili restano attivi. |
| 13:02 | Seleziona **Annulla** durante la conferma. | Comfort e i due Profili restano attivi; Away non è mai stata applicata. |

L’arrivo previsto delle 18:00 viene ritirato. L’episodio annullato non attiverà in seguito Away o Evening.

<a id="cancel-after-departure-is-confirmed"></a>
### Annullare dopo la conferma della partenza

È un episodio distinto con la stessa configurazione iniziale:

| Ora | Cosa succede | Modalità e Profili selezionati |
| --- | --- | --- |
| 13:00 | Avvia un rientro e inizia la conferma. | Comfort e i due Profili restano attivi. |
| 13:05 | Tutte le fonti configurate indicano ancora assenza. | Velair applica Away e i suoi Profili. |
| 13:10 | Seleziona **Annulla**. | Velair ripristina Comfort e i due Profili originali, poi ritira l’arrivo. |

Il risultato è Comfort, **non** la Modalità Rientro Evening configurata. Se la preparazione per Evening era già iniziata, l’annullamento la rimuove e ripristina la selezione originale. Incrementi, regolazioni manuali e pause indipendenti attivi mantengono la priorità.

<a id="start-without-occupancy-sensors"></a>
### Avviare senza sensori di presenza

Senza fonti configurate, **Plan return** applica Away subito, senza la fase di conferma di cinque minuti. Annullare quel rientro attivo ripristina Comfort e i due Profili registrati immediatamente prima dell’avvio. Un sensore configurato sconosciuto o non disponibile non equivale all’assenza di sensori: continua a impedire una nuova conferma dell’assenza.

<a id="default-arrival-edits-and-restart"></a>
### Default, modifiche all’arrivo e riavvio

Se l’episodio parte da **Predefinito** senza Profili attivi, annullare dopo la partenza confermata torna a Default senza Profili attivi. Una combinazione manuale di Profili viene ripristinata nell’ordine originale.

Spostare l’arrivo dalle 18:00 alle 19:00 o riavviare Home Assistant non sostituisce la selezione precedente registrata. L’annullamento ripristina comunque quella precedente all’episodio. Non recupera temperature o stati HVAC passati dei dispositivi: la selezione ripristinata usa le proprie programmazioni attuali, nel rispetto delle sostituzioni esistenti.

<a id="choose-another-mode-instead-of-cancelling"></a>
### Scegliere un’altra Modalità invece di annullare

Se selezioni esplicitamente **Eco** durante un rientro attivo, la scelta ritira il rientro e mantiene Eco. Velair non ripristina Comfort in seguito al cambio di presenza o alla chiusura dell’avviso finale. Questo preserva la scelta esplicita; è un’azione diversa dal pulsante **Annulla** dell’episodio.

<a id="distinguish-the-controls"></a>
### Distinguere i controlli

- **Annulla** nei controlli del rientro ritira l’episodio come descritto sopra.
- **Indietro** nell’editor dell’arrivo scarta le modifiche non applicate; il rientro salvato continua.
- **X** nel pannello delle azioni della scheda climatica generica chiude il pannello senza annullare il rientro.
- **Annulla** accanto a **Salva** nella configurazione della routine scarta le impostazioni non salvate, senza annullare un episodio.

Per gli episodi precedenti privi di selezione registrata o per Profili salvati non più validi, consulta [i limiti del ripristino](#restoration-limits).

<a id="daily-behavior"></a>
## Comportamento quotidiano

Per esempio, configura dal lunedì al venerdì alle 18:15. Dopo che la casa è rimasta vuota per il ritardo di conferma, Velair attiva Assenza e determina la programmazione Casa alle 18:15. Ogni zona usa la propria stima di preparazione: una che richiede un’ora può partire alle 17:15, mentre una più rapida parte dopo.

L’obiettivo è il blocco effettivo **all’arrivo**, inclusa la continuità settimanale. Se Casa richiede 17 gradi prima delle 18:00 e 21 dopo, un rientro alle 18:15 prepara 21 gradi anche se la preparazione inizia prima delle 18:00. La settimana non viene modificata né riempita di blocchi temporanei.

All’orario previsto Velair seleziona la destinazione e prosegue la normale programmazione. Una presenza rilevata in anticipo seleziona subito la destinazione; un arrivo in ritardo non riporta la casa ad Assenza. Pause, Incremento, regolazione manuale, zone disabilitate e pianificatore fermo mantengono i vincoli di invio esistenti. La preparazione supporta riscaldamento, raffrescamento e intervalli nativi. Mira ad avvicinare la stanza all’obiettivo, senza garantire una temperatura esatta.

<a id="preparation-and-room-assist"></a>
### Preparazione e Room Assist

La Modalità di destinazione definisce la configurazione necessaria all’arrivo. Ogni zona parte al proprio orario stimato; l’intera Modalità viene selezionata all’arrivo, non quando la prima stanza comincia a prepararsi. Le zone non ancora partite continuano a seguire Assenza.

Quando una zona comincia a prepararsi, il suo obiettivo temporaneo di arrivo ha priorità sui blocchi successivi di Assenza. Per esempio, con dieci ore di assenza e rientro alle 19:25:

| Ora | Obiettivo della stanza |
|---|---|
| 09:25, assenza confermata | Assenza richiede 16 gradi |
| 16:25, inizia la preparazione della zona | La programmazione di arrivo richiede 21 gradi |
| 17:00, un blocco Assenza richiede 18 gradi | La preparazione continua verso 21 gradi |
| 19:25, arrivo previsto | La Modalità di destinazione avvia la normale programmazione |

Un blocco Assenza non annulla la preparazione del rientro della zona. Questa priorità vale anche per raffrescamento e intervalli di temperatura.

Se Room Assist è abilitato, segue lo stesso obiettivo temporaneo. Nell’esempio aiuta la stanza a raggiungere 21 gradi, senza riportarla all’obiettivo Assenza di 16. Il setpoint inviato al dispositivo può differire da 21 gradi perché Room Assist compensa la differenza tra sensore ambiente e lettura del dispositivo. Le correzioni in coda vengono nuovamente verificate rispetto all’obiettivo attuale prima dell’invio.

Una modifica diretta della temperatura segue il criterio della zona per le regolazioni esterne. **Mantieni l'automatico** riapplica l’obiettivo attualmente prioritario, che durante la preparazione è quello di arrivo. Una **Regolazione manuale** sospende invio automatico e Room Assist della zona finché è attiva. Incrementi e pause esplicite mantengono la priorità esistente e non annullano l’intero rientro dell’abitazione. Consulta [Room Assist](room-assist.it.md) e [Regolazione manuale](manual-control.it.md).

<a id="exceptions-and-restarts"></a>
## Eccezioni e riavvii

La sottosezione Rientro pianificato mostra insieme il rientro accettato, la preparazione di ogni zona e la routine salvata. Aprila direttamente con `/velair/preconditioning/planned-return`; `/velair/preconditioning/preconditioning` apre il precondizionamento adattivo, sottosezione predefinita della scheda. Modificare l’orario cambia soltanto questa assenza, non la settimana salvata. **Annulla** rimuove preparazione e cambio automatico di destinazione. Prima della conferma lascia la selezione invariata; dopo, ripristina Modalità e Profili registrati prima dell’episodio.

Una selezione esplicita di Modalità o Profilo annulla il rientro automatico dell’episodio. Un successivo segnale di presenza o un riavvio non deve sovrascrivere quella scelta. Velair ricorda le assenze completate o annullate finché la casa non torna occupata.

La scelta esplicita annulla anche la preparazione già in corso, persino quando la configurazione selezionata è già attiva. È diversa da una variazione di temperatura programmata dentro Assenza, che non annulla la preparazione. Pannello e scheda non includono pulsanti Salta, Sono a casa o Chiudi: i controlli condivisi sono Annulla e Modifica arrivo. Il backend conserva operazioni distinte di salto e arrivo per i consumatori API, descritte nell’[API per sviluppatori](../developer/api.md). L’azione `velair.cancel_planned_return` annulla un rientro pendente o confermato attivo oppure chiude l’avviso di un episodio inattivo. Ferma preparazione e rientro temporizzato e impedisce il riavvio automatico per quell’assenza. Con partenza confermata ripristina la selezione precedente salvata; con conferma pendente o avviso finale non cambia la selezione. Un nuovo **Plan return** esplicito può comunque avviare un episodio.

<a id="restoration-limits"></a>
### Limiti del ripristino

Per un rientro occasionale, Velair registra la selezione quando scegli **Plan return**. Per la routine settimanale, la registra alla conferma dell’assenza, subito prima di applicare Assenza.

La selezione precedente sopravvive alle modifiche dell’arrivo e ai riavvii Home Assistant. Ripristina la selezione dei Profili, non temperature storiche o stati dei dispositivi; i Profili ripristinati usano programmazioni attuali e priorità esistenti. Se la Modalità precedente è stata rimossa o modificata, i Profili originali possono essere ripristinati come selezione manuale. Se un Profilo salvato è mancante, non valido o in conflitto con un altro, l’annullamento riesce comunque ma conserva la selezione attuale e segnala l’indisponibilità del ripristino. Gli episodi creati prima di questi metadati conservano la selezione attuale perché Velair non può dedurne quella precedente.

Al riavvio, gli avvisi occasionali pendenti e le assenze confermate vengono recuperati anziché ricominciare. Un’assenza non confermata riavvia il ritardo. Un sensore che segnala presenza riconcilia l’assenza precedente anche se l’arrivo è avvenuto mentre Home Assistant era offline.

<a id="limits-and-backups"></a>
## Limiti e backup

- È supportata una sola routine per l’intera abitazione. Gli arrivi settimanali restano nello stesso giorno: partire dopo l’orario odierno o in un giorno senza orario attiva Assenza senza pianificare il rientro di domani. I rientri occasionali possono usare qualsiasi data futura.
- Calendari, turni variabili e routine notturne automatiche non vengono interpretati.
- Senza precondizionamento abilitato, lettura di temperatura o obiettivo termico, la destinazione cambia comunque all’arrivo ma la zona non viene preparata in anticipo.
- Le transizioni che coinvolgono zone con esecuzione esterna vengono rifiutate prima di cambiare Modalità; Velair non sottrae il controllo al relativo controller.
- Il blueprint generico Casa/Assenza esistente resta invariato e utile per altri impianti e azioni.
- I backup portabili includono la configurazione della routine, non episodi di presenza o timer. Le routine importate restano disabilitate finché non vengono abilitate esplicitamente.

Consulta [Profili climatici](climate-profiles.it.md), [Precondizionamento adattivo](adaptive-preconditioning.it.md) e [Regolazione manuale](manual-control.it.md) per i controlli sottostanti.

<a id="overview-and-diagnostics"></a>
## Panoramica e diagnostica

Panoramica mostra un riepilogo compatto dell’abitazione durante un episodio settimanale o occasionale o quando un problema richiede attenzione. Identifica origine e stato e mostra la scadenza di conferma o l’arrivo previsto quando pertinente. Selezionalo per aprire il dettaglio completo in Precondizionamento.

Un segnale viola sul dispositivo identifica il controllo attuale di Rientro pianificato. Lo stato operativo esistente resta visibile: il segnale spiega l’origine senza sostituire riscaldamento, raffrescamento, pausa, programmazione o precondizionamento. Le stime degli avvii futuri sono indicate separatamente. Controllo manuale, Incremento e pause indipendenti mantengono la priorità. L’attribuzione Assenza copre i Profili effettivi dell’episodio o Default quando scelto esplicitamente come Modalità Assenza; non copre un dispositivo non assegnato che conserva semplicemente la programmazione predefinita. La preparazione può legittimamente usare il ripiego Default della destinazione quando il backend seleziona l’obiettivo di arrivo di quel dispositivo.

Diagnostica mostra lo stato attuale dell’abitazione, l’origine del controllo per dispositivo e la preparazione, inclusi i motivi di sospensione o indisponibilità. La categoria di cronologia Rientro pianificato registra transizioni accettate significative senza duplicati causati dagli aggiornamenti del pannello. Condivide il limite esistente di 100 eventi di esecuzione ed è cancellata al riavvio; le preferenze salvate delle categorie rimangono. I rapporti scaricati includono queste informazioni e rimuovono gli identificatori operativi di Modalità e Profili. Intenzione di controllo e successo dell’invio restano distinti.

<a id="dashboard-card"></a>
## Scheda dashboard

La scheda Lovelace facoltativa mostra i controlli compatti del rientro occasionale. L’intestazione include conteggi delle fonti di presenza, assenza e stato sconosciuto e il ritardo salvato; riepilogo settimanale, elenco fonti e dettaglio delle stanze restano nel pannello laterale. Configura prima l’abitazione nel pannello.

```yaml
type: custom:velair-card
view: planned-return
```

Seleziona **Ritorno programmato** nell’editor visivo della scheda. La scheda agisce sullo stesso episodio persistente del pannello e delle altre schede e supporta date e ore future. Gli episodi attivi offrono **Annulla** e **Modifica arrivo**: Annulla ferma il rientro accettato e, dopo la partenza confermata, ripristina la selezione precedente registrata; durante la conferma la lascia invariata. Dopo completamento, annullamento o altro episodio inattivo, la scheda mostra un nuovo modulo senza attendere cambi di presenza. Configurazione salvata non valida o pianificatore fermo disabilitano pianificazione e modifiche, ma un rientro attivo può comunque essere annullato. Il pannello usa gli stessi pulsanti e ciclo di vita; configurazione settimanale e interruttore restano lì. Soltanto gli indicatori finali delle fonti e del ritardo sono esclusivi della scheda; pannello e scheda condividono sottotitolo associato al titolo, modifica dell’arrivo e sequenza temporale. Durante la conferma il processo temporizzato sostituisce il sottotitolo. Questa vista dell’abitazione non ha un filtro per termostato.

La scheda **Termostato: stato e controllo** può offrire anche **One-off return** come azione rapida Velair accanto a Incremento e Pausa. Abilitala nell’editor delle azioni, scegli se mostrarne il nome oppure inseriscila in Altro. L’editor raggruppa prima Incremento, Pausa e Rientro occasionale anche quando disabilitati. L’azione apre gli stessi controlli compatti nel pannello inferiore, con intestazione semplice come Incremento e Pausa. I tre moduli usano l’altezza compatta esistente di 38 pixel. Una partenza attiva mostra sequenza ed editor esistenti. La X chiude senza annullare la partenza. Chiudere con modifiche non salvate richiede conferma per scartarle; la chiusura è bloccata mentre un’azione è in corso. L’azione controlla sempre l’abitazione, indipendentemente dal dispositivo selezionato. Le configurazioni esistenti la mantengono nascosta. Le nuove schede create dal selettore Home Assistant la includono abilitata; le configurazioni YAML devono abilitarla con `type: planned-return` in `climate_actions`.

Durante **Away** e **Preparing for arrival**, la scheda mostra partenza confermata e arrivo salvato con i nomi delle Modalità dell’episodio. Un punto dell’ora attuale, identificato dal suggerimento **Adesso**, avanza in base al tempo UTC trascorso, anche ai cambi dell’ora, e resta dentro la barra. Gli estremi includono le date quando quelle del calendario Home Assistant sono diverse. Le modifiche non salvate all’arrivo non cambiano la barra. Stati pendenti o finali, o episodi senza istante di partenza confermata, mantengono uno stato statico senza sequenza. Pannello e scheda aggiornano gli orologi locali una volta al minuto soltanto mentre sono visibili e attivi e immediatamente quando tornano visibili; questo aggiornamento grafico non richiede dati al backend.

Le icone di partenza e arrivo affiancano la barra con suggerimenti nativi ed etichette accessibili. Gli orari salvati compaiono subito sotto gli estremi; soltanto l’arrivo è modificabile. Etichette semplici delle Modalità sotto gli orari identificano le configurazioni Assenza e Rientro con un’icona generica. Nomi lunghi e date su più giorni vanno a capo dentro il pannello. Ogni estremo raggruppa ora e Modalità, con il nome appena sotto. I campi di modifica condividono le dimensioni compatte degli altri moduli e non compare un pulsante di chiusura accanto all’ora salvata. La posizione di preparazione è una piccola tacca con orologio e spiegazione sotto gli orari. Parte trascorsa, tacche degli estremi e indicatore Adesso mostrano il tempo, non l’avanzamento termico. Senza una prima stima valida, un piccolo pulsante informativo accanto al titolo spiega l’anteprima dell’arrivo salvato: tutte le stanze interessate potrebbero essere sospese, già all’obiettivo, escluse o impostate per agire soltanto all’arrivo. Usa puntatore o focus su desktop e un tocco su mobile. Informazioni mancanti o miste restano inconcludenti e non implicano che la preparazione anticipata sia disabilitata. Esc o un’interazione esterna chiudono la guida.

Quando il backend ha una stima adattiva valida per l’arrivo salvato, la sequenza aggiunge un indicatore con orologio **Preparazione stimata** e l’orario. Identifica la prima stima di una stanza idonea; le altre possono partire dopo. La didascalia leggermente colorata è espandibile e inizialmente chiusa: selezionala per vedere ogni stanza idonea con l’avvio stimato, in ordine di tempo. L’elenco usa nomi, icone e ora locale Home Assistant, con date quando necessarie. Stanze sospese, già all’obiettivo o operative soltanto all’arrivo sono escluse. Aprire l’elenco non richiede dati al backend; gli aggiornamenti normali conservano lo stato, mentre un cambio di arrivo salvato o episodio lo chiude. Durante la modifica dell’arrivo, riquadro e controllo informativo di ripiego sono nascosti; la barra mantiene la stima salvata. Indietro ripristina lo stato di apertura dello stesso episodio. Passa il puntatore sull’intestazione per la spiegazione. È una stima di pianificazione, non una prova dell’avvio del dispositivo o una misura dell’avanzamento termico. Stanze sospese, già all’obiettivo, non disponibili o operative soltanto all’arrivo non forniscono questo indicatore. La posizione resta nella barra partenza/arrivo mentre l’etichetta mantiene la stima reale, inclusa un’eventuale data precedente.
