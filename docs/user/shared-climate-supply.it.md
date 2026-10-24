<a id="shared-climate-supply"></a>
# Alimentazione climatica condivisa
<!-- velair-docs:start -->
Traduzioni: [Originale in inglese](shared-climate-supply.md) · [Español](shared-climate-supply.es.md) · [Français](shared-climate-supply.fr.md) · [Deutsch](shared-climate-supply.de.md) · [Italiano](shared-climate-supply.it.md) · [Nederlands](shared-climate-supply.nl.md) · [Polski](shared-climate-supply.pl.md) · [Português (Brasil)](shared-climate-supply.pt-br.md) · [Português (Portugal)](shared-climate-supply.pt-pt.md) · [Русский](shared-climate-supply.ru.md) · [Stato delle traduzioni](../translation-status.md)

<details>
<summary>Stato di questa traduzione</summary>

| Voce | Stato |
| --- | --- |
| Versione di riferimento | 1.9.0-beta.5 |
| Ultima sincronizzazione | 2026-10-24 |
| Revisione linguistica | Traduzione assistita dall’IA |
| Rispetto all’originale | Sincronizzata con l’originale inglese. |

</details>

---
<!-- velair-docs:end -->

L’alimentazione climatica condivisa stima se i termostati associati richiedono riscaldamento o raffrescamento e controlla uno `switch` comune, ad esempio un relè di richiesta della caldaia. È facoltativa e resta disabilitata finché non abiliti esplicitamente un’alimentazione in **Controllo alimentazione**. La stima non conferma l’apertura delle valvole, il flusso dell’acqua o il riscaldamento fisico.

<a id="configure-a-supply"></a>
## Configurare un’alimentazione

Apri **Controllo alimentazione** nel pannello Velair e scegli **Aggiungi alimentazione**. Seleziona una voce per modificarne i dettagli accanto all’elenco, oppure sotto su schermi stretti. Se non esistono alimentazioni, lo stato vuoto propone **Aggiungi alimentazione**. L’elenco **Alimentazioni condivise** contiene circuiti controllati di riscaldamento o raffrescamento; è separato dal raggruppamento generale dei termostati.

Imposta il **Nome dell’alimentazione**, scegli un interruttore esistente, seleziona la **Funzione dell’alimentazione** (Riscaldamento o Raffrescamento) e i termostati gestiti serviti dal circuito. Ogni interruttore può appartenere a una sola alimentazione. Gli interruttori di controllo propri di Velair non possono essere usati come uscite.

La funzione descrive cosa fornisce l’apparecchio condiviso. Non cambia le modalità HVAC dei termostati: una fonte di riscaldamento risponde solo alla richiesta di calore, una di raffrescamento solo alla richiesta di freddo.

Ogni voce mostra funzione, numero di termostati, interruttore selezionato e stato salvato del controllo automatico. Modifica nome, interruttore e funzione direttamente nel riepilogo superiore, accanto all’abilitazione e all’icona di salvataggio. Ogni impostazione compare una sola volta; non esiste una sezione separata delle impostazioni dell’alimentazione. **Stato dell’interruttore** è lo stato osservato dell’entità; il riepilogo del controllo nell’elenco descrive la configurazione salvata. L’abilitazione modifica una bozza fino al salvataggio: può quindi essere attiva senza salvataggio mentre lo stato salvato indica Disabilitato. La richiesta non viene valutata quando il controllo è disabilitato o sospeso. I pulsanti informativi spiegano queste differenze, il controllo esclusivo, la funzione e la temporizzazione senza ampliare il modulo principale.

Usa **Elimina alimentazione** (il cestino) nella sua voce dell’elenco; la rimozione resta una bozza finché non salvi le alimentazioni. Espandi **Opzioni di temporizzazione**, **Richiesta e isteresi** o **Termostati associati** per modificare quella parte. L’aiuto accanto al titolo apre un riepilogo e questa guida. Passare tra alimentazioni conserva le modifiche non salvate. **Salva alimentazioni**, l’icona nell’intestazione dei dettagli, applica l’intero elenco modificato, incluse le rimozioni. Resta disponibile nello stato vuoto dopo aver rimosso l’ultima alimentazione. Come in Modelli e Preimpostazioni, non c’è un pulsante separato per scartare le modifiche. Uscire dalla scheda con modifiche richiede se scartarle; tornando si ripristina l’elenco salvato. La navigazione attende la conclusione di salvataggi o richieste di ripresa.

Riportare tutti i valori modificati ai valori salvati elimina la bozza, rendendo nuovamente disponibili gli aggiornamenti di configurazione in tempo reale e **Riprendi controllo automatico**. Le modifiche salvate raggiungono gli altri pannelli connessi anche se la richiesta stimata non cambia.

Scegli il comportamento dell’isteresi e i suoi valori. Ogni termostato associato eredita il comportamento; puoi sostituirne i valori numerici senza configurare un altro comportamento. Nella riga di ogni termostato selezionato, **Isteresi del termostato** permette di scegliere **Usa isteresi dell’alimentazione** o **Valori di isteresi personalizzati**. Il selettore si allinea alla casella e al nome; eccezioni e limiti effettivi compaiono sotto. Nel comportamento Personalizzata, i due valori possono essere ereditati indipendentemente. Sono differenze di temperatura nell’unità attuale del pannello; cambiare unità le converte senza trattarle come temperature assolute.

I campi numerici segnalano i valori non validi durante la modifica. L’isteresi deve essere finita e non negativa; un’eccezione vuota eredita il valore dell’alimentazione. Il salvataggio non è disponibile finché un’alimentazione contiene numeri non validi e l’elenco indica quella da correggere.

Salva esplicitamente per applicare la configurazione. Abilitare l’alimentazione dà a Velair il controllo automatico esclusivo dell’interruttore scelto. Evita che un’altra automazione controlli continuamente la stessa uscita.

Gli errori di salvataggio compaiono nell’intestazione dei dettagli, accanto all’azione di salvataggio. Gli errori di configurazione identificano alimentazione, campo e correzione; Velair seleziona l’alimentazione, apre la sezione interessata, evidenzia il campo e gli assegna il focus. Gli errori di Home Assistant o connessione mantengono la spiegazione originale senza attribuirla a un campo estraneo. Le bozze restano disponibili per correggere e riprovare, anche dopo la rimozione dell’ultima alimentazione.

<a id="how-estimated-demand-works"></a>
## Come funziona la richiesta stimata

Le nuove alimentazioni create nel pannello usano **Arresto all’obiettivo**, una distanza di avvio di **0.3 °C** o **0.54 °F** e una distanza di arresto pari a zero. Sono differenze equivalenti; le eccezioni ereditano i valori dell’alimentazione salvo la scelta di valori personalizzati. Gli esempi seguenti usano distanze diverse per illustrare ogni comportamento.

Per i termostati ordinari, l’isteresi definisce una soglia di avvio e una di arresto. Tra le due si conserva la richiesta precedente. Tutti i confronti includono la soglia stessa. Questi esempi usano un obiettivo di 22 °C:

| Comportamento | Valori | Riscaldamento: avvio / arresto | Raffrescamento: avvio / arresto |
| --- | --- | --- | --- |
| Arresto all’obiettivo (predefinito) | Avvio 0.5 °C | ≤21.5 / ≥22 °C | ≥22.5 / ≤22 °C |
| Simmetrica | Distanza 0.5 °C | ≤21.5 / ≥22.5 °C | ≥22.5 / ≤21.5 °C |
| Personalizzata | Avvio 0.5 °C; arresto 0.2 °C | ≤21.5 / ≥22.2 °C | ≥22.5 / ≤21.8 °C |

Il diagramma in **Richiesta e isteresi** si aggiorna modificando funzione, comportamento o distanze. Usa un obiettivo di esempio identificato, non quello attuale di un termostato. Le temperature sono accanto ai marcatori di avvio e arresto; le quote collegano ogni distanza all’obiettivo di esempio. L’asse identificato della temperatura ambiente cresce verso destra. La nota inferiore spiega che tra avvio e arresto una richiesta esistente continua; altrimenti non ne inizia alcuna. Entro i limiti si mantiene la richiesta precedente. Il riscaldamento richiede l’alimentazione sul lato freddo, il raffrescamento su quello caldo. Il diagramma spiega la richiesta stimata senza simulare apparecchi o ritardi. L’obiettivo di esempio è 22 °C o 72 °F. Se un numero è vuoto, incompleto o non valido durante la modifica, un diagramma grigio senza temperature conserva l’altezza dell’anteprima finché il valore non torna valido.

La distanza di avvio si misura allontanandosi dall’obiettivo fino al bisogno di calore o freddo. La distanza di arresto si estende oltre l’obiettivo nella direzione del riscaldamento o raffrescamento. Entrambe accettano zero; con entrambe a zero, all’obiettivo esatto non c’è richiesta. Nella banda dopo un riavvio, un cambio di obiettivo o di isteresi, non si presume una nuova richiesta. Cambiare comportamento conserva la distanza di arresto personalizzata inserita, che si applica di nuovo tornando a Personalizzata.

**Arresto all’obiettivo** è il punto di partenza consigliato per termostati ordinari. Simmetrica e Personalizzata sono scelte avanzate: il termostato può chiudere la valvola o fermare il compressore all’obiettivo prima che la stanza raggiunga la soglia di arresto oltre l’obiettivo. La fonte condivisa potrebbe restare richiesta. Queste impostazioni stimano la richiesta; non cambiano i limiti propri del termostato e non forzano il flusso di calore.

Mantieni separate le soglie di alimentazioni di riscaldamento e raffrescamento che condividono un termostato a intervallo. Distanze di arresto grandi possono mantenere la richiesta di calore mentre inizia quella di freddo, o viceversa. Le alimentazioni aggregano le richieste indipendentemente; non offrono un interblocco tra uscite opposte. Usa interblocchi dell’apparecchio adeguati quando necessario.

La fonte viene richiesta quando almeno un termostato associato ha una richiesta valida. Un termostato spento o una direzione HVAC incompatibile non richiede alimentazione. Dati di temperatura assenti o non disponibili generano richiesta sconosciuta; non mantengono una vecchia richiesta indefinitamente. Le altre stanze valide possono ancora richiedere alimentazione. Senza stanze con richiesta valida, viene richiesto lo spegnimento dopo il ritardo configurato.

Si usano gli obiettivi attuali, incluse le modifiche manuali e quelli applicati dal Precondizionamento adattivo o dal Ritorno programmato. Mettere in pausa una programmazione non disabilita il controllo dell’alimentazione. Un intervallo valido usa il limite inferiore per il riscaldamento e quello superiore per il raffrescamento; un obiettivo ambiguo non può richiedere alimentazione.

<a id="room-assist"></a>
## Room Assist

Un pannello informativo blu all’inizio di **Richiesta e isteresi**, prima del selettore, spiega la priorità di Room Assist e quando si applica l’isteresi dell’alimentazione.

Quando Room Assist controlla l’obiettivo attivo di una stanza, l’alimentazione segue il suo intento di controllo confermato. Con riscaldamento fisso, la fase `towards_upper` richiede calore; con raffrescamento fisso, `towards_lower` richiede freddo. I suoi limiti di commutazione restano autorevoli: l’isteresi dell’alimentazione e l’eccezione della stanza non vengono applicate una seconda volta. Il controllo nativo a intervallo segue la direzione confermata. Un obiettivo assistito non valido o in attesa resta sconosciuto fino a una conferma valida.

L’obiettivo corretto del termostato non viene confrontato con un sensore ambiente esterno. Room Assist può smettere di richiedere alimentazione mentre il termostato segnala ancora lo stesso obiettivo corretto.

<a id="timing-and-manual-control"></a>
## Temporizzazione e controllo manuale

**Tempo minimo di spegnimento** ritarda un nuovo avvio dopo lo spegnimento dell’interruttore. **Ritardo di spegnimento** richiede un periodo continuo senza richiesta prima di spegnere; il ritorno della richiesta annulla il ritardo. Entrambi accettano secondi interi da 0 a 86 400 e valgono zero per impostazione predefinita. Non viene forzato un tempo minimo di accensione che mantenga la fonte attiva quando le valvole potrebbero essere chiuse.

Rinominare un’alimentazione o modificare una distanza di arresto attualmente inutilizzata non riavvia il ciclo di richiesta o il ritardo di spegnimento. Riabilitare un’alimentazione usa l’ultima transizione di spegnimento segnalata per rispettare il tempo minimo di spegnimento.

Spegnere fuori da Velair l’interruttore di un’alimentazione abilitata sospende il controllo automatico. Usa **Riprendi controllo automatico** per ripristinarlo. La sospensione viene salvata e sopravvive ai riavvii. Salvare altre modifiche non la cancella. Disabilitare o rimuovere un’alimentazione richiede lo spegnimento della sua uscita precedentemente controllata.

Accendere l’interruttore fuori da Velair non sostituisce il controllo automatico. Quando tutti i termostati associati segnalano assenza di richiesta, Velair lo spegne dopo il ritardo configurato. Se Home Assistant conferma che la transizione di spegnimento appartiene alla correzione di Velair, viene creata una notifica persistente e una voce Attività associata all’interruttore. Il messaggio identifica l’alimentazione, spiega che un’attivazione esterna è stata corretta perché il controllo automatico non aveva richiesta stimata di riscaldamento o raffrescamento e collega a **Controllo alimentazione** per verificare o disabilitare il controllo. Non presume che il cambiamento sia stato causato da una persona.

Le correzioni ripetute per la stessa alimentazione e interruttore vengono segnalate al massimo una volta ogni 15 minuti durante l’esecuzione attuale dell’integrazione. Riassegnare l’interruttore avvia un nuovo periodo. Ogni alimentazione usa una sola notifica: un successivo avviso consentito sostituisce il precedente. Gli errori di invio o l’accettazione del servizio senza una corrispondente transizione di spegnimento non producono un avviso di successo. La richiesta sconosciuta non viene segnalata come assenza confermata di richiesta. Un’integrazione dell’interruttore che non conserva il contesto del comando non consente l’attribuzione necessaria per l’avviso. Queste regole non cambiano il controllo né richiedono polling. Gli errori di notifica o Attività non interrompono il controllo; Attività richiede l’integrazione attività/logbook di Home Assistant.

Uno spegnimento manuale più recente ha la precedenza su un salvataggio o una ripresa già in corso. Riprendi di nuovo esplicitamente se vuoi il controllo automatico dopo quello spegnimento. La sospensione manuale resta salvata anche durante la migrazione delle unità di temperatura e il riavvio.

Un interruttore non disponibile o un comando fallito viene mostrato nell’alimentazione. I tentativi di invio sono limitati e non si ripetono a ogni aggiornamento del sensore. L’accettazione di un comando da parte di Home Assistant non dimostra il funzionamento fisico dell’apparecchio.

Le alimentazioni importate sono disabilitate e sospese. Verifica uscita e stanze, abilita l’alimentazione, salva e riprendi esplicitamente il controllo automatico quando opportuno.

<a id="preconditioning-master-and-performance"></a>
## Master del precondizionamento e prestazioni

Il [Master del precondizionamento](adaptive-preconditioning.it.md#preconditioning-master) vincola l’inizio della preparazione delle stanze dipendenti. L’alimentazione condivisa segue invece la richiesta delle stanze. Una caldaia controllata da TRV non richiede automaticamente un master; Velair non crea dipendenze tra queste impostazioni.

Il controllore ascolta le entità configurate e usa un solo processo che raggruppa gli aggiornamenti e al massimo un timer per alimentazione. Non esegue polling, non salva campioni di temperatura e non richiede un browser aperto. I normali cambiamenti di temperatura senza un cambiamento significativo dello stato di controllo non diffondono una nuova istantanea completa del pannello.
