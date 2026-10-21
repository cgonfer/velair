<a id="planned-return"></a>
# Rientro pianificato

<!-- velair-docs:start -->
Traduzioni: [Originale in inglese](planned-return.md) · [Español](planned-return.es.md) · [Français](planned-return.fr.md) · [Deutsch](planned-return.de.md) · [Italiano](planned-return.it.md) · [Nederlands](planned-return.nl.md) · [Polski](planned-return.pl.md) · [Português (Brasil)](planned-return.pt-br.md) · [Português (Portugal)](planned-return.pt-pt.md) · [Русский](planned-return.ru.md) · [Stato delle traduzioni](../translation-status.md)

<details>
<summary>Stato di questa traduzione</summary>

| Voce | Stato |
| --- | --- |
| Versione di riferimento | 1.9.0-beta.3 |
| Ultima sincronizzazione | 2026-10-21 |
| Revisione linguistica | Traduzione assistita dall’IA |
| Rispetto all’originale | Sincronizzata con l’originale inglese. |

</details>

---
<!-- velair-docs:end -->

La configurazione precedente registrata da Ritorno programmato include la base Modalità/Profili e tutte le eccezioni per zona. Una partenza confermata seleziona la base Assenza e cancella le eccezioni; un arrivo completato seleziona la base di destinazione. Annullare un episodio confermato tramite Annulla di Ritorno programmato ripristina l’intera selezione salvata, comprese le eccezioni, se i riferimenti restano validi. Una selezione esterna di Profilo/Modalità annulla invece il ritorno in sospeso e applica la selezione richiesta senza ripristinare la precedente. Consulta [base ed eccezioni di zona](climate-profiles.it.md#a-base-with-independent-zone-exceptions).

Rientro pianificato prepara la casa per un arrivo abituale o occasionale dopo che i segnali di presenza selezionati hanno confermato che l’abitazione è vuota, oppure dopo un avvio occasionale esplicito senza fonti di presenza o con **Applica subito la modalità Assenza** selezionato. Si configura in Velair: una routine settimanale stabile non richiede blueprint aggiuntivi o azioni giornaliere. La routine automatica è disabilitata per impostazione predefinita e funziona localmente in Home Assistant. I rientri occasionali richiedono Modalità Assenza/Rientro salvate e programmazione automatica operativa; le fonti di presenza sono facoltative per gli avvii espliciti. La routine settimanale richiede almeno una fonte di presenza.

<a id="setup"></a>
## Configurazione

**Assenza e ritorno** contiene le impostazioni condivise dei ritorni singoli e della routine settimanale. Il rilevamento dell’assenza opera per un ritorno singolo avviato o quando la routine settimanale salvata è attiva. Questi campi non definiscono un’automazione Presenza/Assenza separata sempre attiva. Il tempo di conferma misura l’assenza rilevata continua, non il tempo dal salvataggio. La Modalità Assenza normalmente si applica dopo la conferma; le stanze idonee possono prepararsi prima che la destinazione venga applicata all’arrivo.

Senza fonti di presenza, avviare un ritorno singolo applica subito Assenza senza usare il ritardo di conferma. L’eccezione compare accanto al ritardo quando non sono selezionate fonti.

I blocchi di destinazione **Solo temperatura** mantengono il controllo esterno della modalità HVAC. Ritorno programmato non accende un dispositivo spento per prepararli; non può promettere comfort all’arrivo mentre resta spento. Usa un blocco di destinazione esplicito **Riscaldamento** o **Raffrescamento** se la preparazione deve avviare il dispositivo. La selezione della destinazione all’arrivo rispetta ancora la politica.

1. Crea le Modalità Assenza e Presenza desiderate, o usa Predefinito come destinazione. I Profili di assenza possono spegnere i dispositivi o ridurre la richiesta settimanale.
2. Apri la scheda **Ritorno programmato** e aggiungi fonti di presenza per partenze monitorate o settimanali: sensori binari, input boolean, gruppi o zona Home Assistant `zone.home`. Includi chiunque possa restare, ospiti compresi. Home Assistant resta responsabile di persone e posizioni; un helper può combinare regole complesse.
3. In **Assenza e ritorno**, scegli durata dell’assenza continua, Modalità Assenza e destinazione. Il ritardo predefinito è dieci minuti; il controllo accetta minuti o ore. L’arrivo è riconosciuto subito. La guida della destinazione spiega preparazione adattiva e funzionamento all’arrivo senza stima valida.
4. In **Orari di arrivo**, inserisci l’ora abituale dei giorni pertinenti. Gli arrivi settimanali riguardano il giorno in cui la casa diventa vuota. I giorni senza ora applicano Assenza dopo la conferma e ripristinano la destinazione al rilevamento della presenza, senza preparazione anticipata. Velair prepara ogni zona con l’orario della destinazione all’arrivo.
5. Attiva il precondizionamento adattivo nelle zone che devono partire prima. Le impostazioni e l’apprendimento locale di riscaldamento/raffrescamento esistenti vengono riutilizzati.
6. Attiva **Routine settimanale** nella barra di stato, poi Salva. Questo abilita conferma automatica dell’assenza, selezione di Assenza e **Orari di arrivo** settimanali. Inserire orari non attiva da solo la routine. I ritorni singoli restano disponibili con interruttore spento. L’interruttore modifica la bozza; Annulla ripristina il salvato. Ferma altre automazioni Presenza/Assenza che selezionano Modalità per la stessa casa per evitare controllori concorrenti.

I giorni seguono la preferenza **Primo giorno della settimana** salvata in Impostazioni Velair. Inserisci direttamente l’orario di arrivo per ogni giorno. Se esci in un giorno senza orario, Velair applica Assenza dopo la conferma, non pianifica la preparazione anticipata e ripristina la destinazione al rilevamento della presenza. Il fuso orario Home Assistant compare accanto alla routine settimanale. Le modifiche restano nella bozza fino al salvataggio. Annulla e Salva sono a destra nel piè di pagina della configurazione.

Il riepilogo superiore separa le tre parti della routine in contenitori con bordo corrispondenti alle sezioni delle impostazioni, senza una scheda esterna o un bordo laterale condiviso. La routine settimanale mostra Modalità Assenza, ritardo di conferma, preparazione adattiva e Modalità di destinazione come flusso semplice; l’interruttore modifica l’abilitazione della routine. Il ritardo è il tempo durante il quale la casa deve restare vuota, non una stima del tempo di preparazione. La sezione presenza mostra il risultato combinato e i conteggi delle fonti; espandila per esaminare ogni segnale. I segnali sconosciuti impediscono la conferma automatica della partenza e sono distinti dalla presenza confermata. La sezione di rientro rapido riunisce la partenza occasionale e i controlli dell’arrivo dell’episodio attuale. Le azioni di esecuzione usano la configurazione salvata: salva o annulla le modifiche pendenti prima di annunciare una nuova partenza.

Il modulo raggruppa fonti di presenza, ritardo, Modalità Assenza e destinazione in **Assenza e ritorno**. A larghezze ampie ritardo e due Modalità condividono una riga; su tablet il ritardo è sopra le due Modalità; su mobile i tre controlli si impilano in questo ordine. Ognuno conserva la propria guida accanto. **Orari di arrivo** contiene solo ore per giorno, spiegazione e fuso Home Assistant. Le fonti usano il pulsante circolare verde Aggiungi dell’editor dei blocchi quando una fonte è selezionata. Aggiungi e Rimuovi disabilitati mantengono l’aspetto trasparente; quelli abilitati reagiscono al puntatore e al focus.
L’elenco configurato inizialmente è chiuso. Il riepilogo mostra totale e conteggi dei segnali di presenza, assenza e stato sconosciuto; espandilo per esaminare o rimuovere le singole fonti. Su mobile il riepilogo occupa tutta la larghezza del selettore e della riga Aggiungi; icone e numeri mantengono uniti i conteggi, con etichette accessibili complete. I contatori sono allineati al bordo finale del riepilogo. Su mobile l’elenco aperto ne condivide la larghezza, con Rimuovi alla fine di ogni riga e più spazio per nomi e ID. Su desktop gli elenchi seguono la larghezza del selettore. L’apertura non modifica la configurazione. I ritardi inseriti in ore vengono arrotondati al minuto più vicino; il ritardo equivalente compare accanto al controllo.

Gli stati riconosciuti di presenza sono `on` e `home`; quelli di assenza sono `off` e `not_home`. Per la zona casa, zero persone significa vuota e un conteggio positivo significa occupata. Qualsiasi segnale di presenza rende la casa occupata; soltanto l’assenza segnalata da tutte le fonti la rende vuota. Se nessun segnale indica presenza e uno è sconosciuto o non disponibile, la presenza complessiva è sconosciuta e non possono iniziare assenze automatiche. Una richiesta esplicita **Applica subito la modalità Assenza** può comunque attivare Assenza, ma non confermare la partenza mentre la presenza è sconosciuta. Un rientro già accettato resta pianificato. Il pannello mostra risultato combinato e singole fonti.

Seleziona segnali che rappresentino la presenza: un sensore di movimento spento non significa necessariamente che non ci sia nessuno in casa.

<a id="room-preparation"></a>
## Preparazione delle stanze

Espandi **Preparazione delle stanze** sotto la routine per vedere tutti i dispositivi gestiti. L’elenco parte chiuso. Senza un ritorno futuro accettato, i conteggi descrivono le capacità salvate: preparazione anticipata, azione solo all’arrivo o nessuna preparazione. Per un ritorno accettato, il riepilogo condiviso conta stanze in attesa, in preparazione, all’obiettivo, sospese, non disponibili o solo all’arrivo. Mostra l’arrivo salvato e il primo inizio stimato idoneo disponibile; le stanze possono iniziare in momenti diversi. Espandere non modifica nulla e non invia comandi. La stessa vista vale per ritorni settimanali e singoli.

Ogni riga identifica stanza, origine della programmazione di destinazione e stato della preparazione. Un dispositivo assente dai Profili della Modalità di destinazione usa comunque la programmazione predefinita (**Predefinito**); anche un comportamento normale esplicito usa Default. Una programmazione di Profilo mostra il nome di quel Profilo. Una pausa di Profilo nella destinazione, una zona disabilitata o un’esecuzione esterna sono identificate separatamente, anziché come funzionamento soltanto all’arrivo. Senza precondizionamento adattivo, una stanza locale abilitata segue la propria programmazione effettiva all’arrivo: non viene esclusa automaticamente dai cambi di Modalità.

Senza un rientro futuro, l’elenco descrive le capacità della configurazione salvata, non prevede che la stanza partirà in anticipo. Dopo l’accettazione di un rientro, determina ogni obiettivo di destinazione per quell’orario e mostra stato in attesa, preparazione, obiettivo raggiunto, sospensione o indisponibilità con il motivo pertinente. L’assenza di dati di temperatura o di una stima valida impedisce la preparazione anticipata; Incremento, regolazione manuale e pause esplicite conservano la normale priorità. Senza **Applica subito la modalità Assenza**, una partenza non confermata non può apparire in preparazione. **Preparazione in corso** descrive l’intenzione attiva di Velair, non conferma la ricezione di un comando o il funzionamento fisico del dispositivo. **Obiettivo raggiunto** indica una temperatura attualmente misurata entro la tolleranza di preparazione; può essere vero già prima della partenza e non avvia un’assenza né evita la conferma.

**Planned start** è una stima, non una prova di invio del comando o di preparazione fisica. Gli obiettivi supportano riscaldamento, raffrescamento e intervalli di temperatura. Rientri completati, annullati o saltati tornano alle informazioni di configurazione senza mostrare vecchi orari di preparazione. Diagnostica continua a usare le impostazioni salvate dal backend finché il salvataggio non riesce, senza un ulteriore promemoria di preparazione. Questo elenco completo sostituisce il precedente elenco di zone limitato all’episodio.

<a id="preconditioning-dependencies"></a>
### Dipendenze del precondizionamento

Il **Master del precondizionamento** di una stanza si applica anche a Ritorno programmato. La preparazione attende che sia il proprio avvio stimato sia l’avvio di preparazione del master selezionato la consentano. Entrambi i piani appartengono allo stesso episodio e usano la sua destinazione; una preparazione settimanale non correlata non sblocca una stanza dipendente per l’arrivo. Senza preparazione idonea del master, il dipendente attende il normale obiettivo di arrivo. Consulta [Master del precondizionamento](adaptive-preconditioning.it.md#preconditioning-master).

<a id="one-off-return"></a>
## Rientro occasionale

In **Ritorno singolo**, scegli una data e un orario futuri e premi **Pianifica il ritorno**. Data e ora sono affiancate. Su mobile, Pianifica il ritorno è sulla riga successiva, allineato al bordo destro dell’ora; sui layout più ampi resta accanto ai campi. La spiegazione è sotto i controlli. Puoi farlo prima di uscire o mentre sei già fuori. Velair usa le impostazioni salvate di Modalità e presenza. Per impostazione predefinita, con fonti di presenza configurate mantiene la richiesta pendente e applica Assenza soltanto dopo che tutte hanno segnalato assenza per il ritardo di conferma, proteggendo chi resta in casa. Senza fonti salvate, premere Pianifica il ritorno costituisce la conferma esplicita della partenza: Assenza parte subito, senza ritardo. In questo caso Velair non deduce che la casa sia vuota né rileva il rientro fisico; prepara normalmente le stanze e attiva la destinazione all’arrivo salvato. Per impostazione predefinita, una fonte configurata sconosciuta o non disponibile continua ad attendere: un’entità mancante non può essere trattata come un elenco vuoto.

Con fonti di presenza salvate, **Applica subito la modalità Assenza** è una casella facoltativa per ogni ritorno singolo. Inizia deselezionata e non viene salvata come impostazione della routine. Selezionandola, applichi subito Assenza anche se sei ancora in casa; preparazione e cambio di destinazione all’ora scelta sono subito attivi. Il ritorno automatico tramite presenza resta bloccato finché tutte le fonti non segnalano assenza continua per il tempo di conferma configurato. Presenza o una lettura sconosciuta fanno ripartire l’attesa; dopo la conferma, la presenza attiva subito la destinazione.

Per esempio, con dieci minuti di ritardo e ritorno alle 18:00:

| Ora | Osservazione | Risultato |
| --- | --- | --- |
| 08:00 | Pianifica il ritorno con Applica subito la modalità Assenza selezionato mentre sei in casa. | Assenza si applica; ritorno temporizzato e preparazione sono attivi. |
| 08:10 | Tutte le fonti indicano assenza. | Inizia la conferma di dieci minuti. |
| 08:15 | Presenza dopo una breve uscita. | Azzera la conferma; mantieni Assenza. |
| 08:30 | Tutte le fonti indicano nuovamente assenza. | Inizia un nuovo periodo di dieci minuti. |
| 08:40 | Tutte le fonti sono rimaste assenti. | Abilita il ritorno tramite presenza senza riapplicare Assenza. |
| 17:00 | Viene rilevata presenza. | Seleziona subito la destinazione. |

La scheda di ritorno del pannello, quella Lovelace e il riepilogo Panoramica mantengono Assenza o Preparazione come stato principale. Una riga separata compatta mostra **In attesa di confermare la partenza** o **Conferma della partenza in corso** con la scadenza. Presenza o letture sconosciute ripristinano il messaggio di attesa. La presenza reale resta visibile separatamente, anche mentre Assenza è attiva. Le tre viste spiegano le regole nell’aiuto contestuale senza ripetere stato principale o icona; aprire l’aiuto in Panoramica non cambia pagina. Dopo la conferma la riga scompare e la guida della fase nella scheda, o quella dell’inizio della sequenza in Panoramica, spiega che la presenza può attivare il ritorno. Le guide degli estremi ne spiegano il significato senza ripetere l’orario visibile.

La sequenza inizia quando si applica Assenza; l’aiuto distingue questo momento dalla partenza fisica monitorata. Etichette, indicatori di preparazione e arrivo salvato restano invariati. Se l’assenza non viene mai confermata, preparazione e cambio di destinazione delle 18:00 avvengono comunque. **Annulla** e il comando API esplicito di arrivo restano disponibili prima della conferma. Anche un ritardo di zero minuti richiede che si osservi la casa vuota. Senza fonti, la casella non compare e l’avvio immediato esistente resta invariato.

Data e ora occasionali sostituiscono l’orario settimanale soltanto per questa assenza e funzionano anche con la routine automatica disabilitata. Puoi modificare o annullare l’avviso pendente; se una normale partenza pendente non viene confermata entro l’arrivo, scade senza cambiare Modalità. Se tutte le fonti indicano già assenza e non esiste un episodio attivo, pianificare il rientro avvia subito il ritardo configurato, senza richiedere un nuovo evento dei sensori. Se un’assenza è già attiva, modifica data e ora con il suo editor: il rientro diventa un’eccezione occasionale senza applicare nuovamente Assenza. Posticipare l’arrivo termina la preparazione precedente e ripristina il comportamento Assenza attuale fino al nuovo momento di preparazione. Incrementi e sostituzioni manuali restano protetti. L’obiettivo viene determinato sulla data locale selezionata, anche quando la preparazione comincia il giorno prima. Inviare lo stesso istante non azzera la preparazione. Arrivi passati o attuali e orari locali inesistenti al cambio dell’ora vengono rifiutati; un orario ripetuto usa la prima occorrenza futura.

Gli episodi completati, saltati e annullati restano bloccati per la routine automatica finché non viene rilevata presenza, evitando che la casa vuota avvii da sola un’altra partenza settimanale. Puoi scegliere esplicitamente **Pianifica il ritorno** dopo qualsiasi episodio inattivo senza attendere di tornare a casa. La nuova richiesta usa fonti e Modalità attuali. Con fonti, conferma nuovamente l’assenza per il ritardo configurato anche se tutti sono già fuori, senza cambiare subito Modalità. Senza fonti, la registrazione esplicita attiva Assenza immediatamente. Pannello e scheda mostrano un nuovo modulo appena l’episodio diventa inattivo. Se la pianificazione non è disponibile, il modulo resta visibile con Pianifica il ritorno disabilitato e una spiegazione delle impostazioni salvate e dello stato del pianificatore necessari. In quella situazione puoi comunque annullare un rientro attivo.

Dopo la partenza confermata, usa **Annulla** per fermare il rientro e ripristinare Modalità e Profili precedenti registrati, oppure **Modifica arrivo** per aggiornarne data e ora. Durante la conferma, l’annullamento lascia invariata la selezione perché Assenza non è ancora stata applicata. Per un’Assenza manuale immediata, Annulla ripristina la selezione precedente anche mentre la partenza monitorata è ancora in conferma. Disabilitare la routine automatica o modificare gli orari settimanali non annulla un rientro manuale. Modificarne fonti di presenza o Modalità invalida l’avviso precedente. Le selezioni esplicite di Modalità/Profili annullano rientri pendenti e attivi. Un pianificatore fermo non esegue il rientro.

La prima riga mantiene il titolo Rientro occasionale a sinistra e gli indicatori di presenza, esclusivi della scheda, a destra. La fase attuale è un sottotitolo compatto associato al titolo, senza etichetta o riga separata. Durante la conferma la fase viene indicata invece dall’intestazione del processo temporizzato. La scheda dashboard raggruppa i conteggi in alto a destra quando esistono fonti. Senza fonti, contatori e icona del ritardo non usata sono omessi e il pannello mostra **Non monitorata** anziché presenza sconosciuta. L’icona del ritardo compare soltanto prima della conferma di un’assenza attiva; è nascosta durante Assenza/Preparazione e negli errori attivi con partenza confermata. Il pannello non ripete quegli indicatori. Passa il puntatore per una breve spiegazione della fase.
Durante la conferma, una riga discreta del timer spiega che Velair controlla se la casa rimane vuota. **Fino alle** mostra la scadenza di conferma del backend nell’ora locale Home Assistant, inclusa la data se diversa da oggi. Velair attiva Assenza dopo la conferma soltanto se tutte le fonti indicano ancora assenza. È una scadenza, non un conto alla rovescia in tempo reale o una partenza confermata. Lo stesso processo compare mentre la routine settimanale conferma l’assenza prima che esista un episodio; dati mancanti non generano orari inventati.
Prima della conferma, un’icona di arrivo e **Arrivo previsto** identificano il rientro salvato con etichetta accessibile e suggerimento. La riga è allineata al titolo e allo stato. Data e ora salvate sono un elemento cliccabile compatto, senza matita o sottolineatura. La sequenza confermata usa la stessa icona; data/ora di arrivo salvate sono una superficie di modifica scura simile a un campo, con la stessa tipografia della partenza. Seleziona quel valore per aprire l’editor in linea. La riga delle azioni ha **Indietro**, blu con freccia a sinistra, e **Modifica arrivo**, verde a destra. Indietro scarta le modifiche non salvate e chiude l’editor senza cambiare il rientro.
Su un pannello ampio, l’editor resta compatto e allineato all’estremità di arrivo; l’azione di modifica resta a destra sotto l’editor. Schermi stretti e scheda mantengono il layout adattivo. I campi restano nascosti finché non richiesti. Indietro ripristina l’ultimo arrivo salvato e nasconde i campi, eliminando avviso e protezione della navigazione per l’arrivo; la configurazione indipendente non salvata della routine resta protetta. Riaprire riparte dall’arrivo salvato. Durante un’assenza confermata, l’estremità di arrivo della sequenza è lo stesso pulsante di modifica, senza duplicazioni.
Annulla compare a sinistra sotto il contenuto dell’episodio soltanto con editor chiuso. Durante la modifica è nascosto, Modifica arrivo resta a destra e Indietro a sinistra scarta localmente la modifica. Cambiare un campo non modifica il rientro finché Modifica arrivo non riesce. Le modifiche riuscite chiudono l’editor e riportano il focus all’arrivo salvato; errori e aggiornamenti dei sensori conservano la bozza aperta. Un avviso identifica le modifiche pendenti; navigare o ricaricare richiede conferma prima di scartarle. Salvare la configurazione della routine non applica una modifica all’arrivo.
Indietro e Modifica arrivo hanno superfici compatte blu e verdi rispettivamente, alte 32 pixel dentro aree tattili di 44 pixel. L’annullamento usa una superficie compatta rossa con icona e testo bianchi sotto i dati dell’episodio, anch’essa alta 32 pixel dentro un’area di 44 pixel; puntatore e focus rimangono chiari. I colori di testo e icone si adattano al tema per restare leggibili. Le azioni non disponibili hanno sfondo neutro, testo e icone attenuati e cursore di divieto. Modifica arrivo diventa verde quando l’arrivo viene modificato. La fase rimane associata al titolo. Annulla resta a sinistra sotto i dati quando non si modifica; Modifica arrivo è allineato a destra sotto l’editor aperto. Pannello e scheda conservano questo raggruppamento su mobile. Pianifica il ritorno resta a destra nel nuovo modulo. Le azioni riuscite aggiornano l’episodio senza un messaggio aggiuntivo di salvataggio.

<a id="home-assistant-actions"></a>
### Azioni Home Assistant

Automazioni, script e dashboard possono annunciare una partenza con `velair.start_planned_return`. Sono richiesti sia `return_date` (`YYYY-MM-DD`) sia `return_time` (24 ore, `HH:MM`), che insieme devono identificare un arrivo futuro nel fuso orario Home Assistant. Il selettore nativo può inviare `HH:MM:00`; i secondi zero sono accettati e normalizzati alla precisione del minuto. Scegli una data futura per l’esempio seguente:

```yaml
action: velair.start_planned_return
data:
  return_date: "2026-10-09"
  return_time: "19:25"
```

L’azione usa le impostazioni salvate di presenza e Modalità e lo stesso comportamento di conferma, preparazione e sostituzione di **Pianifica il ritorno**. Funziona con la routine settimanale disabilitata e aggiorna data e ora se l’assenza è già attiva, senza riapplicare Assenza. Modalità salvate e programmazione automatica devono essere operative. Le fonti sono facoltative per i rientri occasionali: un elenco salvato vuoto applica subito Assenza, mentre le fonti configurate mantengono le normali regole di conferma, salvo invio di `apply_away_now: true`. Un arrivo passato o attuale viene rifiutato senza sostituire il precedente. Un orario scaduto o inesistente al cambio dell’ora viene rifiutato; durante un’ora ripetuta Velair sceglie la prima occorrenza ancora futura.

Annulla un rientro pendente o attivo:

```yaml
action: velair.cancel_planned_return
data: {}
```

La stessa azione chiude anche l’avviso di un episodio inattivo. Ferma preparazione e rientro temporizzato e mantiene il blocco dell’annullamento automatico. Dopo una partenza confermata ripristina la Modalità e la selezione esatta dei Profili salvate prima dell’episodio. Durante una normale conferma pendente lascia invariata la selezione. Per un’Assenza manuale immediata ripristina la selezione salvata anche prima della conferma della partenza monitorata. Un nuovo **Pianifica il ritorno** esplicito può sostituire l’episodio inattivo. Pannello e scheda usano la stessa azione di annullamento.

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

Senza fonti configurate, **Pianifica il ritorno** applica Away subito, senza la fase di conferma di cinque minuti. Annullare quel rientro attivo ripristina Comfort e i due Profili registrati immediatamente prima dell’avvio. Un sensore configurato sconosciuto o non disponibile non equivale all’assenza di sensori: continua a impedire una nuova conferma dell’assenza.

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

All’orario previsto Velair seleziona la destinazione e prosegue la normale programmazione. Una presenza rilevata in anticipo seleziona subito la destinazione dopo che la partenza monitorata è stata confermata; un arrivo in ritardo non riporta la casa ad Assenza. Pause, Incremento, regolazione manuale, zone disabilitate e pianificatore fermo mantengono i vincoli di invio esistenti. La preparazione supporta riscaldamento, raffrescamento e intervalli nativi. Mira ad avvicinare la stanza all’obiettivo, senza garantire una temperatura esatta.

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

La scheda **Ritorno programmato** mostra insieme ritorno accettato, preparazione di ogni zona e routine salvata, con introduzione e aiuti contestuali. Aprila con `/velair/planned-return`; `/velair/preconditioning` apre la scheda separata Precondizionamento. I vecchi URL delle sottosezioni aprono ancora la scheda corrispondente. Modificare l’orario cambia solo questa assenza, non la settimana salvata. **Annulla** rimuove preparazione e cambio automatico della destinazione. Prima della normale conferma dell’assenza lascia la selezione invariata; dopo la conferma o un’Assenza manuale immediata ripristina Modalità e Profili registrati prima dell’episodio.

Una selezione esplicita di Modalità o Profilo annulla il rientro automatico dell’episodio. Un successivo segnale di presenza o un riavvio non deve sovrascrivere quella scelta. Velair ricorda le assenze completate o annullate finché la casa non torna occupata.

La scelta esplicita annulla anche la preparazione già in corso, persino quando la configurazione selezionata è già attiva. È diversa da una variazione di temperatura programmata dentro Assenza, che non annulla la preparazione. Pannello e scheda non includono pulsanti Salta, Sono a casa o Chiudi: i controlli condivisi sono Annulla e Modifica arrivo. Il backend conserva operazioni distinte di salto e arrivo per i consumatori API, descritte nell’[API per sviluppatori](../developer/api.md). L’azione `velair.cancel_planned_return` annulla un rientro pendente o confermato attivo oppure chiude l’avviso di un episodio inattivo. Ferma preparazione e rientro temporizzato e impedisce il riavvio automatico per quell’assenza. Dopo Assenza, anche manuale immediata, ripristina la selezione precedente salvata; con normale conferma pendente o avviso finale non cambia la selezione. Un nuovo **Pianifica il ritorno** esplicito può comunque avviare un episodio.

<a id="restoration-limits"></a>
### Limiti del ripristino

Per un rientro occasionale, Velair registra la selezione quando scegli **Pianifica il ritorno**. Per la routine settimanale, la registra alla conferma dell’assenza, subito prima di applicare Assenza.

La selezione precedente sopravvive alle modifiche dell’arrivo e ai riavvii Home Assistant. Ripristina la selezione dei Profili, non temperature storiche o stati dei dispositivi; i Profili ripristinati usano programmazioni attuali e priorità esistenti. Se la Modalità precedente è stata rimossa o modificata, i Profili originali possono essere ripristinati come selezione manuale. Se un Profilo salvato è mancante, non valido o in conflitto con un altro, l’annullamento riesce comunque ma conserva la selezione attuale e segnala l’indisponibilità del ripristino. Gli episodi creati prima di questi metadati conservano la selezione attuale perché Velair non può dedurne quella precedente.

Al riavvio, gli avvisi occasionali pendenti e le assenze confermate vengono recuperati anziché ricominciare. Un’assenza non confermata riavvia il ritardo. Un sensore che segnala presenza riconcilia l’assenza precedente anche se l’arrivo è avvenuto mentre Home Assistant era offline. Un’Assenza manuale immediata conserva al riavvio il blocco del ritorno tramite presenza: una conferma incompleta ricomincia con l’intero ritardo e la presenza iniziale non può contare come ritorno. Una conferma completata resta completata. In entrambi i casi l’arrivo programmato resta vincolante.

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

La Panoramica mostra un riepilogo compatto della casa durante episodi settimanali o singoli o problemi. Indica origine, stato, scadenza di conferma o arrivo previsto. Un ritorno accettato aggiunge contatori a icone della preparazione con guide al passaggio del mouse, al focus da tastiera o al tocco. Una partenza confermata aggiunge una sequenza in sola lettura con orari e Modalità di partenza/arrivo e punti di preparazione stimata per ogni dispositivo idoneo, con colore e nome corrispondenti nella legenda. Ogni voce mostra anche l’inizio stimato accanto al nome, sulla stessa riga nel fuso e formato orario Home Assistant; una data successiva include la data. Punti e cerchi della legenda misurano 8 px; un segno verticale neutro indica l’ora attuale. La legenda parte su una riga: i nomi lunghi sono abbreviati visivamente e «+N dispositivi» espande le altre stanze nel riepilogo. **Mostra meno** ripristina una riga. Ogni stanza conserva colore e guida nome completo/inizio stimato al passaggio del mouse, al focus o al tocco. Espandere o chiudere non naviga né cambia il ritorno. Sono tracciate solo preparazioni adattive con stima valida; stanze solo all’arrivo, sospese, già all’obiettivo e non disponibili sono escluse. I punti sovrapposti condividono un cerchio diviso in settori colorati uguali, uno per dispositivo. Le guide di punti e legenda mostrano gli orari stimati. Sono stime attuali, non una cronologia di attività fisica. La sequenza si pone accanto al riepilogo se possibile, altrimenti sotto; misura assenza trascorsa, non progresso termico. Selezionare il riepilogo fuori dalle guide apre il dettaglio nella scheda Ritorno programmato; le guide non navigano né cambiano il ritorno.

**Prossimi eventi durante un ritorno attivo**

Panoramica e schede dei prossimi eventi mostrano il prossimo cambiamento di controllo previsto per dispositivo, identificando la fonte come orario settimanale o Ritorno programmato. Un’azione settimanale prima dell’inizio della preparazione resta idonea. Quando la preparazione controlla il dispositivo, la transizione successiva è l’arrivo anziché un blocco Assenza non pertinente, anche se l’obiettivo è già raggiunto. Gli altri dispositivi mantengono gli eventi settimanali.

Gli inizi di preparazione sono stimati sulle misure attuali. L’arrivo può cambiare temperatura o opzioni HVAC, spegnere o attivare un Profilo in pausa; non è necessariamente un comando di temperatura. Incremento, manuale e pause mantengono la priorità. Le righe sospese spiegano il blocco e mostrano una scadenza nota solo se tutti i blocchi ne hanno una; non promette un avvio. Righe settimanali e di ritorno condividono nome, fonte breve, orari, azione e modalità HVAC. La guida finale fornisce fase completa, Modalità di arrivo, motivo/scadenza della sospensione e riferimento settimanale quando il ritorno ha priorità; si apre al passaggio del mouse, al focus da tastiera o al tocco. Nessun sottotitolo di stato sotto il nome. Le larghezze delle colonne sono condivise e adatte al valore più ampio, evitando spazi fissi inutili per orari, azioni e HVAC. Gli elenchi stretti mantengono eventi su una riga con scorrimento orizzontale e colonna dei nomi fissa.

Le previsioni non confermano l’invio né cambiano l’esecuzione. Sensori e viste di anticipo settimanale esistenti mantengono il significato. Installa versioni corrispondenti di integrazione e frontend per queste previsioni effettive; un backend precedente continua a fornire eventi settimanali.

Un segnale viola sul dispositivo identifica il controllo attuale di Rientro pianificato. Lo stato operativo esistente resta visibile: il segnale spiega l’origine senza sostituire riscaldamento, raffrescamento, pausa, programmazione o precondizionamento. Le stime degli avvii futuri sono indicate separatamente. Controllo manuale, Incremento e pause indipendenti mantengono la priorità. L’attribuzione Assenza copre i Profili effettivi dell’episodio o Default quando scelto esplicitamente come Modalità Assenza; non copre un dispositivo non assegnato che conserva semplicemente la programmazione predefinita. La preparazione può legittimamente usare il ripiego Default della destinazione quando il backend seleziona l’obiettivo di arrivo di quel dispositivo.

Le zone della Panoramica mostrano un indicatore compatto di ritorno accanto a Profilo e comfort: stato di preparazione e temperatura o intervallo di arrivo se disponibile. La guida sull’intero indicatore si apre al passaggio del mouse, al focus da tastiera o al tocco. Spiega stato, inizio stimato, arrivo, sospensione/indisponibilità e attribuzione attuale del controllo, senza pannello aggiuntivo su più righe. Una stanza che segue ancora Assenza può mostrare la preparazione futura senza affermare di controllarla già. Non vengono inventate stime mancanti; ritorni completati, annullati e saltati non mantengono anteprime attive. Le schede climatiche conservano la presentazione dettagliata.

Diagnostica mostra lo stato attuale dell’abitazione, l’origine del controllo per dispositivo e la preparazione, inclusi i motivi di sospensione o indisponibilità. La categoria di cronologia Rientro pianificato registra transizioni accettate significative senza duplicati causati dagli aggiornamenti del pannello. Condivide il limite esistente di 100 eventi di esecuzione ed è cancellata al riavvio; le preferenze salvate delle categorie rimangono. I rapporti scaricati includono queste informazioni e rimuovono gli identificatori operativi di Modalità e Profili. Intenzione di controllo e successo dell’invio restano distinti.

<a id="dashboard-card"></a>
## Scheda dashboard

La scheda Lovelace facoltativa mostra i controlli compatti del Ritorno singolo. L’intestazione include conteggi delle fonti presenti, assenti e sconosciute e ritardo di conferma salvato. Un ritorno accettato mostra etichette di preparazione compatte; le guide al passaggio del mouse, da tastiera e al tocco forniscono conteggi delle stanze, arrivo e primo inizio stimato idoneo. La sequenza della casa usa il grafico del pannello: stessa tipografia delle date, campo scuro di arrivo modificabile, segno neutro Adesso e punti individuali di preparazione idonei. La legenda parte su una riga, si espande con +N e si chiude con Mostra meno. Le Modalità restano sotto la barra. Nome e inizio stimato restano accessibili nelle guide di punti e legenda. Le guide spiegano anche partenza, icona di arrivo, fase, contatori di presenza e ritardo tramite mouse, focus da tastiera o tocco. La guida della presenza elenca i nomi delle fonti corrispondenti. Il campo di arrivo resta un pulsante di modifica; la guida è sull’icona adiacente. Configurazione settimanale, fonti e lista completa di preparazione restano nella barra laterale. Configura prima lì la casa.

```yaml
type: custom:velair-card
view: planned-return
```

Seleziona **Ritorno programmato** nell’editor visivo della scheda. La scheda agisce sullo stesso episodio persistente del pannello e delle altre schede e supporta date e ore future. Gli episodi attivi offrono **Annulla** e **Modifica arrivo**: Annulla ferma il rientro accettato e, dopo la partenza confermata, ripristina la selezione precedente registrata; durante una normale conferma pendente la lascia invariata, mentre dopo Assenza manuale immediata ripristina la selezione precedente anche prima della conferma. Dopo completamento, annullamento o altro episodio inattivo, la scheda mostra un nuovo modulo senza attendere cambi di presenza. Configurazione salvata non valida o pianificatore fermo disabilitano pianificazione e modifiche, ma un rientro attivo può comunque essere annullato. Il pannello usa gli stessi pulsanti e ciclo di vita; configurazione settimanale e interruttore restano lì. Soltanto gli indicatori finali delle fonti e del ritardo sono esclusivi della scheda; pannello e scheda condividono sottotitolo associato al titolo, modifica dell’arrivo e sequenza temporale. Durante la conferma il processo temporizzato sostituisce il sottotitolo. Questa vista dell’abitazione non ha un filtro per termostato.

La scheda **Termostato: stato e controllo** può esporre **Ritorno singolo** come azione rapida Velair accanto a Incremento e Pausa. Attivala nell’editor delle azioni, scegli di mostrare il nome o spostala in Altro. L’editor raggruppa prima Incremento, Pausa e Ritorno singolo anche se disattivati. Apre gli stessi controlli compatti nel pannello inferiore con titolo semplice come Incremento e Pausa; i tre moduli usano campi compatti da 38 px. Una partenza attiva usa la sequenza migliorata di Ritorno programmato: stessa tipografia partenza/arrivo, superficie scura di arrivo modificabile, segno neutro Adesso e punto solo del dispositivo selezionato. Il pannello omette le etichette di preparazione e mostra nome e inizio stimato del dispositivo nella legenda. Senza una stima attuale valida della preparazione anticipata, una breve spiegazione sostituisce la sequenza: solo all’arrivo, obiettivo raggiunto, sospensione e motivo, indisponibilità o stima mancante. La stima di un’altra stanza non sostituisce mai quella selezionata. L’arrivo resta modificabile e l’annullamento disponibile senza sequenza. Gli indicatori di presenza restano nell’intestazione. L’azione controlla il ritorno della casa, compresi gli altri dispositivi, non solo quello della scheda. Paragrafi ripetuti del conto alla rovescia e riquadro del primo inizio sono omessi. La scheda dedicata alla casa mostra tutti i punti idonei e conserva etichette e legenda. La X chiude senza annullare la partenza; un arrivo non salvato richiede conferma per scartarlo e un’azione in corso blocca la chiusura. Le configurazioni esistenti mantengono nascosta l’azione. Le nuove schede dal selettore Home Assistant la attivano; YAML richiede `type: planned-return` in `climate_actions`.

Durante **Assenza** e **Preparazione in corso**, la scheda mostra l’ora di applicazione di Assenza e l’arrivo salvato con i nomi delle Modalità Assenza e Ritorno dell’episodio. Con Assenza manuale immediata, l’applicazione può precedere la conferma della partenza fisica. L’indicatore dell’ora attuale, identificato dall’aiuto **Adesso**, avanza in base al tempo UTC trascorso, anche ai cambi dell’ora, e resta nella barra. Gli estremi includono le date se i giorni del calendario Home Assistant sono diversi. Le modifiche non salvate all’arrivo non cambiano la barra. Normali partenze pendenti, stati finali o episodi senza istante di applicazione di Assenza mantengono uno stato statico senza sequenza. Pannello e scheda aggiornano gli orologi locali una volta al minuto solo mentre sono visibili e attivi e subito quando tornano visibili; questo aggiornamento grafico non richiede dati al backend.

Nella scheda Ritorno programmato la sequenza omette contatori e riepilogo del conto alla rovescia, perché gli stati delle stanze sono spiegati sopra. Orari di partenza e arrivo modificabile sono sopra la barra con la stessa tipografia. L’arrivo è una superficie scura simile a un campo che apre l’editor, senza matita né sottolineatura. Modalità Assenza e destinazione sono sotto. Un segno verticale neutro Adesso indica la fine del segmento trascorso. I dispositivi idonei hanno piccoli punti colorati e una legenda corrispondente con nomi e inizi stimati, oltre alle guide individuali. I punti sovrapposti condividono un cerchio segmentato. La legenda si espande nel pannello su richiesta e può richiudersi. I dispositivi sospesi, all’obiettivo, solo all’arrivo e non disponibili restano in Preparazione delle stanze sopra, senza punti inventati. La scheda della casa conserva le etichette di preparazione. La sezione dettagliata resta sopra; la sequenza non ripete il primo inizio in un riquadro aggiuntivo. Cambiare arrivo salvato o destinazione azzera la legenda e scarta le stime obsolete. Modificare una bozza non cambia la proiezione salvata. Annullamento e modifica dell’arrivo restano disponibili.

I controlli della dashboard usano lo stesso grafico. La scheda della casa conserva le etichette di stato perché non include l’intera sezione di preparazione. Mantiene tutti i punti idonei attuali; l’azione integrata di una scheda climatica mostra solo la stanza selezionata, con nome e inizio stimato nella legenda. I campi data/ora conservano dimensioni compatte e controlli Indietro/Modifica esistenti. Aprire l’editor conserva la sequenza accettata; Indietro ripristina l’arrivo salvato. Accettare un altro arrivo o destinazione azzera la legenda e scarta le stime obsolete. Stanze sospese, pronte, non disponibili e solo all’arrivo non ricevono punti. Un punto prima della partenza è posto al bordo; la guida conserva la stima reale. Il progresso trascorso misura il tempo verso l’arrivo, non quello termico. Senza stima della casa, le guide spiegano lo stato noto senza suggerire che la preparazione sia disattivata.
