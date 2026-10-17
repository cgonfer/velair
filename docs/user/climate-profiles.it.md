<a id="climate-profiles"></a>
# Profili climatici

<!-- velair-docs:start -->
Traduzioni: [Originale in inglese](climate-profiles.md) · [Español](climate-profiles.es.md) · [Français](climate-profiles.fr.md) · [Deutsch](climate-profiles.de.md) · [Italiano](climate-profiles.it.md) · [Nederlands](climate-profiles.nl.md) · [Polski](climate-profiles.pl.md) · [Português (Brasil)](climate-profiles.pt-br.md) · [Português (Portugal)](climate-profiles.pt-pt.md) · [Русский](climate-profiles.ru.md) · [Stato delle traduzioni](../translation-status.md)

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

I profili climatici permettono a Velair di passare fra piani settimanali coordinati per più zone senza sostituire le programmazioni predefinite. Home Assistant resta il livello decisionale: presenza, finestre, stagioni, selettori, sensori o altre automazioni decidono quando cambiare profilo, mentre Velair salva, applica e mostra il comportamento climatico risultante.

Un **Profilo** definisce una routine climatica alternativa per le zone configurate. Una **Modalità** seleziona uno o più Profili senza sovrapposizioni come **base** della casa. Puoi poi applicare Profili come **eccezioni di zona**, anche solo a una parte di un Profilo multizona, senza cambiare le altre stanze. Imposta una base per cambiare l’intera configurazione; applica eccezioni per routine indipendenti.

Fra gli esempi ci sono Presenza, Assenza, Vacanza, Estate, Ospiti e Notte. I profili supportano anche installazioni con orari dei blocchi, obiettivi e modalità HVAC differenti per riscaldamento e raffrescamento.

<a id="default"></a>
## Configurazione predefinita

`Default` è la selezione integrata e indica sempre le programmazioni settimanali configurate nella scheda Programmazioni. Non è un profilo salvato, quindi non può essere rinominato o eliminato.

Attivare un altro profilo non sovrascrive mai quelle programmazioni. Tornare a Default applica immediatamente il blocco predefinito attivo in quel momento.

<a id="configure-a-profile"></a>
## Configurare un profilo

Apri **Programmazioni**, scegli **Programmazioni dei profili** e usa il pulsante di aggiunta per creare un profilo vuoto. Selezionalo dall’elenco per modificarne colore, icona, nome, descrizione e comportamento dei termostati. L’area di lavoro del profilo mostra un termostato selezionato alla volta per mantenere utilizzabile l’editor completo su desktop, tablet e mobile. Il nome si modifica nell’intestazione, accanto alla matita. L’ID stabile per le automazioni compare sotto il nome e nell’elenco dei profili, così puoi copiarlo in servizi, script e automazioni senza confonderlo con il nome visualizzato modificabile. Le icone usano chiavi Material Design Icons come `mdi:briefcase-outline`; l’editor mostra un’anteprima nel colore scelto, collega il catalogo ricercabile Material Design Icons e segnala chiavi prive del formato previsto `mdi:icon-name`. Le descrizioni sono limitate a 500 caratteri e l’editor mostra il conteggio rimanente. Velair assegna un colore stabile ai profili nuovi ed esistenti; puoi cambiarlo tramite selettore o valore modificabile `#RRGGBB`. I valori non validi sono evidenziati e non salvabili. Il colore è incluso nelle esportazioni portabili. La selezione integrata Default mantiene il colore fisso.

Ogni riga di Profilo conserva le azioni in una colonna a destra: imposta come base, applica come eccezione di zona, poi elimina. Restano accanto al nome anche a larghezze ridotte. I pulsanti hanno sfondo trasparente e spazio dal bordo; icona e colore indicano gli stati attivi. La descrizione resta visibile, con etichette compatte **Base** ed **Eccezione** sotto per gli usi attuali. I Profili inutilizzati non mostrano etichette e l’azione di base resta neutra finché il Profilo non appartiene alla base. Un Profilo usato solo come eccezione evidenzia l’azione dei livelli, non quella di base. Una base completamente sostituita conserva l’identità di base. Questi stati descrivono la selezione salvata, non l’attività del termostato. Selezionare la riga apre l’editor; le azioni di base ed eccezione non cambiano la selezione di modifica. Confermare l’eliminazione del Profilo modificato svuota il suo editor.

Per ogni dispositivo gestito, scegli un comportamento:

- **Non partecipa**: questo Profilo non include la zona.
- **Programmazione predefinita**: continuare a usare la normale programmazione settimanale della zona.
- **Programmazione del profilo**: usare una programmazione settimanale completa salvata nel profilo.
- **Pausa** con **Lascia il termostato invariato**: interrompere le modifiche programmate lasciando il dispositivo com’è.
- **Pausa** con **Spegni il dispositivo climatico**: interrompere le modifiche programmate e spegnere il dispositivo.

Ogni zona con **Programmazione del profilo** conserva la propria **Suddivisione dei giorni**. Scegli Giorni singoli, Feriali / Fine settimana o Tutti i giorni prima di scegliere un giorno. Le sette celle mantengono le posizioni; la suddivisione seleziona un giorno, feriali/fine settimana o l’intera settimana insieme. Modificare il gruppo aggiorna quei giorni nella bozza; **Salva profilo** salva il Profilo completo. Se i giorni differiscono, esaminali e scegli esplicitamente una base prima di sostituirne le configurazioni. Gli altri giorni restano invariati. La suddivisione viene ricordata con la bozza quando cambi temporaneamente il comportamento di una zona. Le celle selezionate contigue sono unite visivamente e la sequenza mostra i blocchi comuni. Le differenze compaiono come alternative visive compatte: configurazioni identiche sono raggruppate con le barre temporali compatte in sola lettura della Panoramica e le etichette obiettivo/modalità. Non c’è un elenco permanente dei blocchi sotto; l’icona informativa apre tutti gli orari e le impostazioni al passaggio del mouse, al focus da tastiera o al tocco, senza scegliere la base. Fai clic o tocca un’alternativa per scegliere una sola base, identificata da sfondo e bordo. Le alternative restano disponibili per cambiare base prima di salvare. Con **Tutti i giorni** o **Feriali / Fine settimana**, scegli l’orario e usa **Salva profilo** prima che l’editor comune diventi disponibile, senza un’ulteriore conferma di sostituzione. Il gruppo contiene sette giorni, cinque feriali o due del fine settimana; gli altri mantengono i loro orari. Un errore conserva l’alternativa selezionata. I blocchi comuni possono poi essere modificati e salvati con il Profilo. Frecce, Spazio e Invio consentono la selezione da tastiera. Un gruppo misto richiede una base prima che **Salva profilo** sia disponibile. I riepiloghi accanto a Salva identificano fonte, zona e giorni di destinazione. Il salvataggio include anche le altre modifiche al Profilo in sospeso. Alternative visivamente uguali identificano dipendenze diverse da modelli/preset con etichette compatte. Le alternative vuote mostrano **Nessun blocco proprio**; la relativa guida spiega che applicarle rimuove i blocchi propri e che un giorno vuoto non è un comando di spegnimento. Consulta [Suddivisione e modifica di più giorni](usage.it.md#create-a-daily-schedule) per gruppi, giorni misti e portabilità.

La programmazione predefinita include esplicitamente la zona, anche per validare le sovrapposizioni. Una zona che non partecipa eredita la base, o Predefinito se nessun Profilo di base la include. I modelli possono ancora essere copiati come blocchi indipendenti, oppure un giorno predefinito o di profilo può collegare solo gli orari a un modello mantenendo impostazioni proprie, o seguire l’intero modello con tutti i controlli in sola lettura. Modelli e blocchi indipendenti possono fare riferimento a preset Velair condivisi. Consulta [Preset dei blocchi e modelli collegati](linked-schedules.it.md) per propagazione, scollegamento, compatibilità e modifiche condivise, e [l’esempio Inverno/Estate](linked-schedule-examples.it.md#2-winter-and-summer-with-one-set-of-times) per impostazioni diverse con gli stessi orari. Clonare un giorno conserva tipo di collegamento al modello, assegnazioni dei soli orari e riferimenti ai preset. Clonare su un altro termostato verifica il profilo proposto prima di applicare la bozza; gli altri giorni di destinazione mantengono i collegamenti esistenti. Usa Scollega dopo la clonazione se il nuovo giorno deve essere indipendente dal modello.

Per una zona delegata a un controller esterno, profili e modalità selezionano l’intera settimana effettiva pubblicata da Velair anziché provocare azioni dirette `climate.*`. **Programmazione predefinita** pubblica la settimana normale e **Programmazione del profilo** quella del profilo. **Pausa** non è disponibile per una zona gestita esternamente. L’editor dei profili usa le capacità del controller come validazione aggiuntiva; un errore di pubblicazione non annulla la selezione salvata di profilo o modalità né influisce sulle zone locali. Consulta [Esecuzione esterna della programmazione](external-systems.it.md) per i limiti attuali del controller e il significato della pubblicazione.

Da un giorno modificato del Profilo, **Salva come modello** salva tramite backend solo un modello riutilizzabile e lascia invariata la bozza del Profilo. Per riutilizzare la selezione in altri dispositivi gestiti, selezionali in **Altri termostati** e scegli **Clona**. L’etichetta segue la suddivisione: un giorno, lunedì–venerdì, sabato–domenica o tutti i giorni. La conferma riepiloga dispositivi e giorni e identifica le zone Predefinito/Pausa che passeranno a **Programmazione del profilo**. La clonazione sostituisce solo quei giorni corrispondenti, conserva tutti gli altri giorni e la suddivisione della destinazione e resta nella bozza del Profilo. La clonazione da un giorno all’altro è disponibile solo con **Giorni singoli**. Gli editor raggruppati omettono quel pannello e la scorciatoia di suddivisione; usa il normale selettore **Suddivisione dei giorni**. Gli editor Predefinito e Profilo usano lo stesso gruppo selezionato per le copie ad altri termostati. Velair valida tipo di obiettivo, modalità HVAC, limiti e passo di temperatura per ogni destinazione prima di cambiare la bozza. Rimuove le opzioni non supportate. Se un blocco di sole opzioni non ha più controlli compatibili o un obiettivo o una modalità sono incompatibili, nessuna modifica della bozza viene applicata. I giorni clonati diventano persistenti solo salvando il Profilo.

Ogni giorno del profilo usa la stessa sequenza temporale modificabile di programmazioni predefinite e modelli, con trascinamento e ridimensionamento degli orari. I blocchi hanno un inizio ma non una fine separata: l’ultimo continua oltre mezzanotte e nei giorni vuoti finché non inizia un altro blocco. La sequenza rappresenta la parte ereditata del giorno con un segmento distinto non modificabile e identifica il giorno in cui il blocco è realmente configurato. Mentre il profilo resta aperto, passare temporaneamente una zona da **Programmazione del profilo** a **Programmazione predefinita** o **Pausa** conserva la bozza settimanale. Tornare a **Programmazione del profilo** ripristina quei blocchi non salvati. Salvare il profilo con Default o Pausa conserva solo il comportamento selezionato; la programmazione nascosta della bozza non viene salvata. Il selettore mostra nomi descrittivi e l’editor attivo anche l’ID dell’entità. Metadati e programmazioni vengono salvati insieme come unico profilo atomico; cambiare termostato selezionato non salva una bozza parziale.

Più Profili possono formare una base quando una Modalità li coordina. Le loro zone non devono sovrapporsi. Le eccezioni possono sostituire singole zone della base: ogni dispositivo gestito ha sempre esattamente una routine effettiva. Non si fondono blocchi e le eccezioni precedenti non formano una pila di priorità.

<a id="worked-example-an-away-mode"></a>
## Esempio completo: una modalità Assenza

Supponiamo che soggiorno e camere richiedano comportamenti differenti quando nessuno è in casa:

1. Crea un profilo **Assenza · Zona giorno**. Assegna a soggiorno e cucina programmazioni alternative con obiettivi adatti all’installazione, sia che riscaldi, raffreschi o supporti entrambi.
2. Crea un profilo **Assenza · Camere**. Configura le camere con un’altra programmazione alternativa, **Pausa** o **Pausa e spegni**.
3. Escludi da entrambi i profili le zone non interessate. Continueranno a usare le programmazioni predefinite.
4. Apri **Modalità**, scegli **Nuova modalità**, chiamala **Assenza**, seleziona entrambi i profili e salva.
5. In **Configurazione attiva**, scegli **Cambia**, poi **Assenza**. Velair applica i due profili come selezione atomica.

Questa configurazione è valida perché i due profili configurano zone diverse. Se configurassero lo stesso dispositivo, Velair rifiuterebbe la modalità chiedendo di rimuovere la sovrapposizione.

La stessa modalità può essere selezionata da un’automazione Home Assistant:

```yaml
alias: Use Away climate mode
triggers:
  - trigger: state
    entity_id: person.resident
    to: "not_home"
actions:
  - action: select.select_option
    target:
      entity_id: select.velair_mode
    data:
      option: Away
```

Un’altra automazione può ripristinare la normale programmazione di ogni zona:

```yaml
alias: Restore default climate schedules
triggers:
  - trigger: state
    entity_id: person.resident
    to: "home"
actions:
  - action: select.select_option
    target:
      entity_id: select.velair_mode
    data:
      option: Default
```

Sostituisci l’entità persona e i nomi visibili delle modalità con quelli dell’installazione Home Assistant. Se rinomini una modalità, aggiorna le automazioni che selezionano la sua opzione visibile.

<a id="activate-a-profile"></a>
## Attivare un profilo

Usa il pulsante di riproduzione di un Profilo in **Programmazioni > Programmazioni dei profili** per attivarlo direttamente, o **Configurazione attiva** nella Panoramica o sopra **Modalità**. La scheda separa **Base** ed **Eccezioni** e identifica se la base proviene da una Modalità, un Profilo, più Profili o Predefinito. Scegli **Cambia** per selezionare una Modalità o il gruppo **Profili**. Selezionare una riga di Profilo lo imposta come base completa; l’icona dei livelli applica solo le zone configurate come eccezioni. Una scelta diretta sostituisce l’insieme attivo con quel Profilo e imposta la Modalità su **Manuale**; **Predefinito** indica nessun Profilo alternativo attivo. L’attivazione è disponibile anche dalla riga, da Configurazione attiva o da `velair.activate_profile`. Velair applica il blocco attualmente attivo, incluso l’ultimo del giorno precedente se oggi non è ancora iniziato un nuovo blocco, senza attendere la prossima transizione.

L’attivazione diretta non aggiunge mai un profilo all’insieme esistente, anche senza sovrapposizioni. Le zone controllate dalla modalità o dall’insieme precedente ma escluse dal nuovo profilo tornano immediatamente alla programmazione predefinita; non mantengono la configurazione precedente. Crea una modalità che associ tutti i profili necessari senza sovrapposizioni quando devono essere attivati insieme.

L’attivazione annulla gli incrementi attivi nelle zone il cui comportamento effettivo cambia. Una pausa globale o di zona esistente resta prioritaria; Velair registra il nuovo profilo e lo applica quando il pianificatore o la zona riprende.

La panoramica usa la programmazione effettiva di ogni zona nella sequenza di oggi e nei prossimi eventi. Le zone modificate dal profilo attivo mostrano un’etichetta compatta colorata con icona e nome del profilo, mentre lo stato temporaneo di incremento o pausa resta visivamente prioritario fino alla fine. Le conferme di salvataggio, attivazione ed eliminazione usano la notifica temporanea standard di Velair con pulsante di chiusura e barra di durata.

I cambiamenti di modalità e le attivazioni dei profili mostrano anche una barra globale dell’operazione mentre Velair elabora le zone interessate. Resta visibile passando fra le schede. In Lovelace compare solo nella scheda Configurazione attiva, dove si eseguono queste attivazioni. Il contatore indica le zone che Velair ha finito di elaborare, comprese quelle la cui pausa o sostituzione attuale non richiede comandi climatici; non afferma che una stanza fisica abbia già raggiunto l’obiettivo. Lo stato finale distingue il successo completo da una transizione conclusa con errori in una o più zone. I risultati riusciti scompaiono dopo una breve conferma; quelli parziali o falliti restano fino alla chiusura, anche passando fra schede.

Automazioni e script possono usare:

```yaml
action: velair.activate_profile
data:
  profile_id: vacation
```

Nell’editor visivo delle automazioni Home Assistant, aggiungi un’azione e cerca **Velair: Attiva profilo climatico**. Questa azione dell’integrazione è separata dalle azioni switch e select mostrate filtrando per il dispositivo Velair. Inserisci l’**Identificatore per automazioni** del profilo, mostrato sotto il nome in Velair.

Usa il servizio esplicito di disattivazione per tornare alle programmazioni predefinite:

```yaml
action: velair.deactivate_profile
```

Omettere `profile_id` da `velair.activate_profile` resta supportato per compatibilità. Gli identificatori dei profili sono stabili anche se cambia il nome visibile. Un’attivazione diretta dal pannello o dal servizio imposta il selettore nativo della modalità su `Manual`, anche se lo stesso profilo era già attivo.

<a id="modes"></a>
## Modalità

Un profilo non contiene condizioni arbitrarie. Home Assistant resta il livello decisionale. Velair gestisce un’entità nativa `select.velair_mode`, così i valori usati dalle automazioni possono essere gestiti nella scheda Modalità senza creare un altro helper Home Assistant.

Due valori integrati esistono sempre e non si possono rinominare o eliminare:

- **Predefinito** disattiva i profili e ripristina la programmazione predefinita di ogni zona.
- **Manuale** significa che nessuna modalità personalizzata controlla attualmente l’insieme dei profili attivi. L’attivazione diretta di un profilo normalmente entra in questo stato. Compare come stato attuale ma non come azione nel selettore Velair. Scegli **Predefinito** o una modalità personalizzata per uscirne. L’entità nativa Home Assistant conserva l’opzione Manual per compatibilità; selezionarla mantiene i profili attivi ma li separa dalla modalità personalizzata.

Crea valori personalizzati come Assenza, Vacanza o Presenza e associa ciascuno a uno o più profili climatici salvati. In **Modalità**, scegli **Nuova modalità**, inserisci il nome dell’opzione che Home Assistant mostrerà, seleziona uno o più profili senza sovrapposizioni e salva. Selezionare un valore personalizzato attiva atomicamente l’intero insieme. I profili della stessa modalità devono configurare zone diverse; Velair rifiuta sovrapposizioni invece di applicare una priorità implicita. Più modalità possono comunque fare riferimento a lo stesso profilo. I nomi vengono privati degli spazi iniziali e finali, sono limitati a 255 caratteri, unici senza distinguere maiuscole e minuscole e non possono usare i nomi integrati o gli stati riservati `unknown` e `unavailable` di Home Assistant.

La scheda Modalità mostra la base selezionata e le sue eccezioni in **Configurazione attiva**. Il selettore raggruppato elenca prima Predefinito e le Modalità personalizzate, con azioni separate di base ed eccezione dei Profili. Manuale resta uno stato del selettore Home Assistant nativo, non il nome della base nel pannello. Selezionare una Modalità attiva i Profili associati; selezionare direttamente un Profilo sostituisce l’insieme attivo con quel solo Profilo e imposta la Modalità su **Manuale**. Le righe mostrano icone e colori dei Profili associati per distinguerli anche con lo stesso nome. Le righe integrate spiegano brevemente quando si applicano.

Usa l’azione standard select di Home Assistant nelle automazioni:

```yaml
action: select.select_option
target:
  entity_id: select.velair_mode
data:
  option: Vacation
```

Gli identificatori delle modalità restano stabili quando cambia il nome visibile, quindi la selezione attuale sopravvive alla rinomina. Il nome visibile dell’opzione è però lo stato dell’entità Home Assistant: le automazioni che fanno riferimento a un’opzione rinominata o eliminata devono essere aggiornate.

Riassegnare la modalità selezionata attiva il nuovo insieme di profili come modifica atomica. Eliminare la modalità selezionata lascia attivi i profili e cambia il selettore in **Manuale**. Eliminare un profilo rimuove anche le modalità associate e solo quel profilo dall’insieme attivo; Velair torna a **Predefinito** quando l’insieme diventa vuoto.

<a id="a-base-with-independent-zone-exceptions"></a>
## Una base con eccezioni di zona indipendenti

Un Profilo può includere più stanze. Applicarlo come eccezione sostituisce la routine solo nelle stanze esplicitamente configurate; non modifica le altre né riscrive il Profilo. Ogni stanza usa una routine settimanale completa, mai blocchi mescolati da più Profili.

Per esempio, una base **Inverno** copre ufficio, soggiorno e camera. **Telelavoro** include ufficio e soggiorno; **Ospiti** include soggiorno e camera degli ospiti:

| Modifica | Ufficio | Soggiorno | Camera | Camera degli ospiti |
| --- | --- | --- | --- | --- |
| Seleziona base Inverno | Inverno | Inverno | Inverno | Predefinito |
| Applica Telelavoro | Telelavoro | Telelavoro | Inverno | Predefinito |
| Applica Ospiti dopo | Telelavoro | Ospiti | Inverno | Ospiti |
| Ripristina la base nel soggiorno | Telelavoro | Inverno | Inverno | Ospiti |

Ripristinare la base del soggiorno non riattiva Telelavoro: le eccezioni non hanno una pila di cronologia. Scegliere esplicitamente Predefinito è diverso: usa l’orario normale della zona anche se la base include un’altra routine.

Usa **Applica come eccezione** in Configurazione attiva o un’automazione:

```yaml
action: velair.apply_profiles
data:
  profile_ids: [remote_work]
```

Una richiesta può applicare più Profili solo se includono zone diverse. `[remote_work, guests]` viene rifiutato interamente perché entrambi includono il soggiorno. Applicare Ospiti in una richiesta successiva sostituisce intenzionalmente l’eccezione del soggiorno e conserva l’ufficio.

Per applicare una sola stanza di un Profilo multizona:

```yaml
action: velair.set_zone_profile
data:
  entity_id: climate.office
  profile_id: remote_work
```

Il Profilo deve includere esplicitamente quella stanza gestita. Usa `profile_id: null` per imporre Predefinito. Per rimuovere un’eccezione ed ereditare la base attuale:

```yaml
action: velair.clear_profile_overrides
data:
  entity_id: [climate.office, climate.living_room]
```

Per sostituire tutta la base e rimuovere ogni eccezione senza creare una Modalità:

```yaml
action: velair.activate_profiles
data:
  profile_ids: [winter_office, winter_bedrooms]
```

I Profili di base non devono sovrapporsi. Un elenco di attivazione vuoto seleziona Predefinito; elenchi di applicazione o rimozione vuoti non fanno nulla. Le nuove azioni richiedono i propri campi: un valore omesso non significa mai «tutte le stanze» o «Predefinito».

Configurazione attiva mostra **Base** e il suo tipo sopra il nome, su due livelli compatti su telefoni e schede strette. I nomi lunghi vanno a capo. Una riga di copertura indica quante zone incluse ereditano ancora la base. Le eccezioni, incluso Predefinito esplicito o lo stesso Profilo, sono escluse. Le zone esterne a una base Profilo usano Predefinito e non contano nella base; una base Predefinita include tutte le zone gestite. Sono attribuzioni di selezione, non attività dei dispositivi. Una base senza zone si distingue da una interamente sostituita. Sotto la copertura della base, **Distribuzione della casa** è inizialmente chiusa. L’etichetta indica il totale della casa indipendentemente dalle zone di base. Selezionala per mostrare la barra di 6 px e l’intera legenda; selezionala di nuovo o premi Esc per chiudere. L’intestazione resta ferma mentre il contenuto si espande verso il basso con una breve transizione che rispetta il movimento ridotto. La barra rappresenta tutte le zone gestite usando i colori dei Profili. I segmenti delle eccezioni includono le zone esterne alla base e corrispondono ai conteggi dell’elenco. Le zone esterne senza eccezioni hanno un segmento neutro Predefinito separato. La legenda compatta usa icone di Profilo da 14 px, nomi e origine, con conteggi in una colonna allineata a destra. Anche le eccezioni esplicite Predefinito sono neutre. Base, eccezione e ripiego restano distinti anche con lo stesso colore. La copertura propria della base resta separata e compare una sola volta. Una base Profilo vuota può avere una barra con zone Predefinite; senza zone gestite non c’è barra. Questi numeri descrivono l’attribuzione, non lo stato fisico. I Profili di base partecipanti compaiono nella legenda espansa; le basi Modalità non ripetono un elenco separato di componenti sopra. Su desktop la base occupa meno spazio delle eccezioni; l’icona è allineata in alto a nome e tipo. Il titolo Eccezioni usa l’icona dei livelli, come le azioni di eccezione. **Eccezioni** elenca ogni Profilo con un pulsante del numero di zone; le eccezioni esplicite Predefinito hanno un gruppo proprio. I nomi delle stanze restano nascosti fino all’apertura. Seleziona un punto qualsiasi della riga per espanderne le stanze sotto senza sostituire le altre eccezioni. Selezionala di nuovo o premi Esc per chiudere; aprire un altro gruppo chiude il precedente. La breve transizione rispetta il movimento ridotto. Riga e conteggio restano in posizione; i dettagli spingono in basso le righe successive, consentendo di chiudere con lo stesso pulsante. Gli elenchi lunghi scorrono nell’area espansa. Una base invariata mostra **Nessuna eccezione** e resta visibile anche se tutte le stanze sono sostituite. Configurazione attiva non ha un’area separata di modifica per zona; usa le azioni documentate per modifiche mirate. Il selettore Modalità nativo mostra Manuale finché esistono eccezioni. Rimuoverle tutte ripristina l’etichetta originale della Modalità se esiste ancora. Scegliere una Modalità personalizzata, Predefinito, un singolo Profilo o un elenco completo sostituisce esplicitamente la base ed elimina le eccezioni. L’opzione nativa Manuale rilascia solo l’associazione alla Modalità conservando base ed eccezioni.

Modificare una Modalità di base conserva le eccezioni. Rinominare o modificare un Profilo mantiene i riferimenti attivi: gli orari cambiati influenzano le stanze che li usano. Aggiungere una stanza a un Profilo non estende un’eccezione già applicata altrove. Rimuovi un’eccezione prima di eliminare dal Profilo la stanza referenziata. Eliminare un Profilo, o importare definizioni che lo rimuovono, elimina le sue eccezioni e riporta le stanze alla base rimanente o a Predefinito.

Home Assistant decide ancora la combinazione di stagione, presenza e routine personale. Una Modalità stagionale è una selezione completa, non un livello aggiunto sopra le eccezioni. Ricalcola le selezioni delle stanze dopo un cambio di stagione. Le azioni su stanze diverse si compongono; quelle sulla stessa stanza vengono accettate in ordine. Una selezione completa della base può sostituirle tutte.

Tutte le azioni esplicite di selezione annullano un Ritorno programmato in sospeso, anche se ripetute. Gli elenchi vuoti di applicazione/rimozione non lo fanno. L’annullamento può influire sulla preparazione altrove nella casa. È salvato separatamente dalla selezione successiva: se quest’ultima fallisce, la selezione precedente può restare con il Ritorno programmato già annullato. Richieste non valide non lo annullano mai.

Le modifiche alla selezione vengono salvate insieme, ma i dispositivi possono applicarle in momenti diversi o segnalare errori individuali. Pause e restrizioni di invio restano prioritarie. Un cambiamento della sola attribuzione non annulla Incremento né invia azioni duplicate se la routine effettiva è invariata. Le stanze con esecuzione esterna pubblicano la settimana effettiva secondo le restrizioni del fornitore. I Profili non eliminano i vincoli delle apparecchiature condivise.

L’intento completo di base ed eccezioni sopravvive al riavvio. Le esportazioni portabili contengono definizioni, non questo intento attivo; l’importazione non attiva mai nuovi Profili.

<a id="seasonal-selection"></a>
## Selezione stagionale

Il [blueprint di selezione climatica stagionale](blueprints/seasonal-climate-selection.it.md) può scegliere una modalità da un massimo giornaliero o un altro sensore di temperatura dopo una variazione stabile. Collega profili Inverno ed Estate agli stessi orari di un modello assegnando preset differenti. Configura un profilo per il clima mite con pausa e spegnimento quando non serve climatizzazione. Coordina l’automazione con le regole di presenza: un’altra lettura stabile può sostituire una modalità Assenza scelta manualmente.

<a id="interactions"></a>
## Interazioni

- I blocchi **Solo temperatura** conservano la politica in Profili, preset, modelli e collegamenti ai modelli. Attivare un Profilo o una Modalità con questo blocco aggiorna l’obiettivo senza richiedere cambi di modalità HVAC né accendere un dispositivo spento; l’integrazione deve accettare obiettivi da spento.
- Le pause globali e di zona hanno priorità sui cambiamenti di profilo.
- Gli incrementi nelle zone interessate vengono annullati quando si attiva un profilo.
- Il precondizionamento adattivo viene ricalcolato sulla programmazione effettiva del profilo.
- Room Assist segue l’obiettivo della programmazione effettiva del profilo.
- Il comfort ambientale resta solo monitoraggio e non cambia.
- Riscaldamento, raffrescamento, heat/cool, blocchi Off e controlli climatici facoltativi supportati funzionano come nelle programmazioni predefinite.

<a id="restart-and-portability"></a>
## Riavvio e portabilità

L’insieme dei profili attivi, le modalità personalizzate e l’identificatore della modalità selezionata sono salvati nel backend Velair. Dopo un riavvio Home Assistant, l’entità select nativa viene ricostruita da quello stato; non attiva autonomamente un profilo. L’impostazione esistente **Applica la programmazione attiva dopo l’avvio** controlla solo se Velair invia immediatamente l’obiettivo effettivo ai dispositivi. Se disabilitata, conserva il profilo e calcola gli eventi futuri senza cambiare lo stato dei dispositivi all’avvio. Se abilitata, una programmazione di profilo applica il blocco attuale, `Pause and turn off` spegne la zona e `Pause` semplice la lascia invariata. Incrementi, pause e pausa globale del pianificatore mantengono la priorità normale.

Le esportazioni portabili V5 possono includere definizioni di profili e modalità come sezioni separate. Non includono mai il profilo attivo o l’intento della modalità selezionata, quindi l’importazione non può attivare implicitamente un altro profilo. Importare solo profili rimuove le modalità i cui profili associati non esistono più. Importare modalità verifica ogni associazione e rifiuta zone configurate sovrapposte.

In **Impostazioni > Portabilità**, seleziona **Profili climatici** e **Modalità** per esportare. All’importazione, controlla e seleziona entrambe le sezioni prima di confermare. Le definizioni selezionate vengono sovrascritte, ma l’insieme dei profili attivi e la modalità selezionata non vengono mai importati.

Ogni modalità associa uno o più profili con zone configurate senza sovrapposizioni. L’insieme completo si attiva atomicamente, mentre l’attivazione diretta di un profilo sostituisce l’insieme con un solo profilo e seleziona Manuale.
