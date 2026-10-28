<a id="room-groups"></a>
# Gruppi stanza
<!-- velair-docs:start -->
Traduzioni: [Originale in inglese](room-groups.md) · [Español](room-groups.es.md) · [Français](room-groups.fr.md) · [Deutsch](room-groups.de.md) · [Italiano](room-groups.it.md) · [Nederlands](room-groups.nl.md) · [Polski](room-groups.pl.md) · [Português (Brasil)](room-groups.pt-br.md) · [Português (Portugal)](room-groups.pt-pt.md) · [Русский](room-groups.ru.md) · [Stato delle traduzioni](../translation-status.md)

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

Un gruppo stanza assegna a più entità `climate` gestite un’unica programmazione, assegnazione di Profilo, boost, pausa e modello di Precondizionamento adattivo. Usalo quando i dispositivi controllano la stessa stanza fisica. Le stanze diverse devono restare indipendenti, anche se condividono un modello giornaliero o un’alimentazione di riscaldamento o raffrescamento.

<a id="what-a-group-shares"></a>
## Cosa condivide un gruppo

| Condiviso dal gruppo | Indipendente per ogni dispositivo fisico |
| --- | --- |
| Programmazione, assegnazioni di Modalità/Profili e impostazioni di controllo | Temperatura, umidità, azione HVAC e disponibilità riportate |
| Boost, pause di zona e regolazione manuale | Sensori, soglie e interruttore di monitoraggio del Comfort |
| Una decisione di avvio del precondizionamento e un modello di apprendimento termico | Osservazioni del dispositivo e prove di invio nella Diagnostica |
| Impostazioni e correzione di Room Assist | Regolazione interna della temperatura del dispositivo |

Il gruppo è un’unità di controllo interna a Velair, non una nuova entità `climate` o `group` di Home Assistant. Velair genera un identificativo interno stabile come `group.0123456789abcdef0123456789abcdef`; rinominare il gruppo lo conserva. Può comparire in diagnostica, esportazioni o impostazioni tecniche, ma non nel registro delle entità né negli stati degli Strumenti per sviluppatori di Home Assistant. Non usarlo come destinazione di un servizio `climate.*` di Home Assistant. Velair risolve il gruppo nei destinatari reali dei comandi.

<a id="create-a-group"></a>
## Creare un gruppo

1. Apri la scheda **Gruppi stanza** e usa il pulsante di aggiunta.
2. Inserisci il nome e usa **Aggiungi dispositivi** per selezionare i dispositivi gestiti della stanza. Aggiungine almeno due. Cerca per nome o ID entità e conferma. I dispositivi di un altro gruppo non sono disponibili e indicano il gruppo di appartenenza.
3. Scegli un membro la cui temperatura ambiente riportata rappresenti la temperatura propria del gruppo. Questo riferimento non rende il dispositivo proprietario del gruppo. Configura un sensore esterno facoltativo in **Room Assist**, come per un dispositivo indipendente.
4. Scegli se Velair invia comandi a tutti i membri o a uno il cui impianto li propaga già agli altri dispositivi.
5. Scegli la configurazione da adottare con **Usa la configurazione di**. Esporta prima la configurazione attuale se ti serve una copia di ripristino; includi **Apprendimento del precondizionamento** per salvare anche la calibrazione.
6. Usa il pulsante di salvataggio nell’intestazione per aprire **Controlla le modifiche del gruppo**. Nulla è ancora applicato. Leggi le differenze e l’avviso di azzeramento dell’apprendimento, poi scegli **Conferma e salva** o **Torna alla modifica**. Gli errori di validazione e salvataggio restano nel flusso di revisione per correggere la bozza e riprovare.

<a id="configuration-fields"></a>
### Campi di configurazione

| Campo | Significato |
| --- | --- |
| Nome del gruppo | Nome visualizzato obbligatorio, univoco tra i gruppi. |
| Membri | Dispositivi gestiti della stanza. Il loro ordine determina la visualizzazione individuale nella Panoramica. Un dispositivo non può appartenere a due gruppi. |
| Riferimento di temperatura | La temperatura riportata da un membro rappresenta la stanza in Velair, senza dargli priorità sugli altri. |
| Invio dei comandi | **Tutti i membri** per impostazione predefinita, oppure **Membro selezionato** se l’impianto propaga già i comandi. |
| Destinatario dei comandi | Visibile solo per **Membro selezionato**; scegli chi riceve i comandi di Velair. |
| Usa la configurazione di | Solo alla creazione: scegli il membro la cui programmazione, configurazione dei Profili e impostazioni di controllo diventano il punto di partenza condiviso. |

Riferimento di temperatura, destinatario e origine della configurazione iniziale possono essere tre membri diversi.

<a id="send-commands-to-all-members-or-one-recipient"></a>
### Inviare a tutti i membri o a un destinatario

**Tutti i membri** è la modalità predefinita: Velair invia comandi a ogni membro. **Membro selezionato** li invia solo al **Destinatario dei comandi** indicato sotto. Usa questa modalità solo se l’impianto propaga già i comandi agli altri dispositivi; Velair non esegue tale propagazione aggiuntiva.

Ad esempio, una stanza può avere tre valvole per radiatori e un controllore ambiente che compare anche come entità `climate`. Se l’impianto propaga i suoi comandi alle valvole, includi tutti e quattro, scegli il controllore come riferimento, seleziona **Membro selezionato** e usalo come destinatario. Tutti restano visibili, con una sola programmazione e decisione di precondizionamento. Se ogni dispositivo richiede un comando diretto, usa **Tutti i membri**.

Queste opzioni selezionano i destinatari; non creano programmazioni o modelli di apprendimento indipendenti per i membri.

<a id="adopt-an-existing-configuration"></a>
### Adottare una configurazione esistente

L’adozione crea una configurazione condivisa dalle programmazioni, dai Profili e dalle impostazioni di controllo del membro scelto. Sostituisce le configurazioni di controllo indipendenti; non mantiene copie separate sincronizzate né copia le impostazioni del firmware. Ogni dispositivo conserva impostazioni, sensori e soglie di Comfort propri, non sostituiti da quelli del membro scelto. Gli storici di apprendimento esistenti non vengono uniti. Riferimento nativo, destinatario e origine iniziale possono essere diversi.

Velair valida l’intero gruppo prima del salvataggio. Un dispositivo può appartenere a un solo gruppo. Le combinazioni incompatibili vanno risolte prima dell’uso; il raggruppamento non aggiunge capacità HVAC. L’Esecuzione esterna della programmazione non può controllare un membro raggruppato insieme a Velair. I destinatari devono condividere modalità compatibili, limiti di temperatura sovrapposti e una griglia di passi compatibile. Se le modalità HVAC attive differiscono, scegli una modalità esplicita invece di chiedere a Velair di mantenere una modalità comune.

<a id="shared-control-and-individual-observations"></a>
## Controllo condiviso e osservazioni individuali

I selettori di programmazione, Profili e altre funzioni di controllo mostrano il gruppo al posto dei membri. Modifica la programmazione e i controlli abituali. Il gruppo salva una configurazione, non copie separate sincronizzate.

Il Comfort resta individuale: pannello e schede mostrano ogni dispositivo con misure, sensori, soglie e interruttore di monitoraggio propri. Il sensore esterno facoltativo di Room Assist del gruppo non sostituisce queste letture, salvo selezionarlo esplicitamente nel Comfort di quel membro. Creare, modificare o sciogliere un gruppo conserva il Comfort di ciascun membro. I gruppi salvati prima dell’archiviazione indipendente del Comfort inizializzano ogni membro con una copia delle impostazioni precedentemente salvate del gruppo; ogni copia è poi modificabile separatamente. Non è possibile recuperare automaticamente le precedenti impostazioni individuali.

La **Panoramica** continua a mostrare ogni dispositivo fisico. Il gruppo identifica programmazione e controllo comuni, mentre temperatura, disponibilità e stato restano individuali. Un’azione di controllo su un membro si applica alla stanza; non crea una programmazione indipendente in conflitto.

I **Prossimi eventi** mostrano ogni dispositivo con il gruppo sotto il nome, come le righe individuali della **Cronologia di oggi**. I membri mostrano lo stesso evento autorevole del gruppo; Velair non crea programmazioni o eventi backend separati. Seleziona un nome per aprire la programmazione condivisa nel giorno dell’evento, inclusa la programmazione propria di un Profilo se genera l’evento. Ritorno programmato usa la programmazione della Modalità di destinazione. Funziona anche dalla scheda Prossimi eventi di una dashboard. Un filtro su un membro mostra solo quel membro; un filtro sul gruppo mostra tutti i membri.

Seleziona un gruppo per modificarlo nel pannello adiacente, con la stessa disposizione elenco/dettaglio di Modelli e Controllo alimentazione. Il riepilogo identifica membri, origine della temperatura e destinatari, oltre al controllo condiviso e allo stato di preparazione. L’azione nell’intestazione revisiona e salva; l’eliminazione è nell’elenco e richiede conferma. L’aiuto spiega riferimento, invio e configurazione. La revisione identifica i campi obbligatori mancanti. Durante la modifica il riepilogo continua a descrivere il gruppo salvato fino alla revisione e al salvataggio della bozza.

La Diagnostica distingue le prove individuali dall’intento comune della stanza. Una chiamata di servizio accettata non dimostra movimento delle valvole o flusso di calore. Con un destinatario selezionato, Velair non afferma di aver comandato direttamente gli altri membri.

<a id="temperature-reference-and-room-assist"></a>
## Riferimento di temperatura e Room Assist

Con la programmazione normale, Velair invia l’obiettivo condiviso ai destinatari configurati. Ogni dispositivo continua a regolare internamente con il proprio sensore; scegliere un riferimento non cambia la regolazione del firmware.

Il **Riferimento di temperatura** fornisce la lettura nativa del gruppo per precondizionamento, apprendimento termico, riferimento nativo di Room Assist, stima della richiesta di alimentazione e riepilogo. Sceglilo tra i membri. Configura il sensore esterno facoltativo in [Room Assist](room-assist.it.md#room-groups), non come ulteriore riferimento nativo nell’editor del gruppo. Quando Room Assist è abilitato, la lettura esterna diventa la misura effettiva della stanza e Velair calcola una correzione condivisa. I comandi seguono **Invio dei comandi**.

Il Comfort resta indipendente: abilitare Room Assist per il gruppo non sostituisce sensori o soglie di Comfort dei membri.

<a id="pauses-manual-adjustment-and-resuming"></a>
## Pause, regolazione manuale e ripresa

Il gruppo ha un’unica autorità di programmazione. Una pausa di zona o un boost richiesto da qualsiasi membro si applica quindi all’intero gruppo. La scheda Gruppi stanza mostra lo stato salvato senza un pulsante di pausa separato. Usa i controlli dei membri. Riprendere la stessa pausa condivisa da un altro membro ha lo stesso ambito. Altri motivi indipendenti di pausa mantengono la priorità finché terminano o vengono rimossi. Una Pausa o un Arresto globale continua a interessare tutte le stanze, dispositivi non raggruppati compresi.

Mettere in pausa la programmazione non spegne necessariamente i dispositivi. L’azione scelta decide se Velair conserva gli stati attuali o invia Spegni ai destinatari configurati del gruppo.

La politica **Regolazioni esterne** nelle Impostazioni appartiene al gruppo. Un cambiamento esterno rilevato dell’obiettivo o della modalità HVAC di un membro può mettere tutto il gruppo in **Regolazione manuale**, secondo le stesse regole di programmazione e pausa di un dispositivo indipendente. Con **Fino al prossimo blocco**:

1. Tre membri seguono un obiettivo condiviso di `20 °C`.
2. Un cambiamento esterno porta un membro a `22 °C`.
3. Velair cede l’autorità di programmazione per tutto il gruppo, conservando gli stati. Non copia il cambiamento agli altri: possono restare a `22, 20, 20 °C`. L’impianto potrebbe comunque propagare i cambiamenti.
4. Al prossimo blocco, Velair torna al controllo Automatico e invia l’obiettivo condiviso ai destinatari. Puoi riprendere Automatico prima.

| Politica delle regolazioni esterne | Comportamento del gruppo |
| --- | --- |
| Mantieni automatico | Velair conserva l’autorità e riapplica l’intento effettivo attuale quando esiste. |
| Fino al prossimo blocco | La regolazione manuale termina al prossimo blocco applicabile. Senza blocchi futuri, riprendi Automatico esplicitamente. |
| Per una durata | Il gruppo cede per il tempo configurato. Ulteriori cambiamenti esterni rinnovano la durata. |
| Fino alla ripresa | Il gruppo cede fino alla ripresa esplicita del controllo Automatico. |

Selezionare Manuale esplicitamente usa la politica salvata e conserva gli stati attuali. Con **Mantieni automatico**, il Manuale esplicito dura invece fino alla ripresa. Room Assist cede durante la regolazione manuale.

Questo controllo Manuale/Automatico è distinto dalla Modalità **Manuale** usata per scegliere direttamente i Profili. Vedi [Cambiamenti esterni e regolazione manuale](manual-control.it.md) per priorità e casi particolari dei blocchi.

<a id="display-order"></a>
## Ordine di visualizzazione

Usa i controlli di ordinamento nelle Impostazioni per spostare gruppi e dispositivi indipendenti. Un nuovo gruppo prende inizialmente la posizione del primo membro. Ordina i membri nel dettaglio della scheda Gruppi stanza. La Panoramica espande il gruppo in voci individuali consecutive in quell’ordine; i selettori di programmazione mostrano una sola voce per il gruppo. Entrambi gli ordini sono salvati dal backend.

L’elenco mostra solo i membri selezionati. I nuovi vengono aggiunti in fondo senza cambiare l’ordine esistente. Usa le frecce per riordinare e il cestino per rimuovere un membro. Gli elenchi lunghi possono essere espansi. Le modifiche ai membri si applicano solo dopo revisione e salvataggio.

<a id="learning-and-membership-changes"></a>
## Apprendimento e cambiamenti dei membri

Il gruppo apprende una risposta termica con storici separati di riscaldamento e raffrescamento. Senza Room Assist, la temperatura proviene dal membro scelto. Room Assist usa il sensore esterno solo quando è abilitato, con le stesse regole di controllo, limiti di correzione e preparazione di un dispositivo indipendente. Selezionare un sensore non abilita l’assistenza. Rimuoverlo o disabilitarla riporta la misura al riferimento del membro. I comandi seguono la modalità di invio del gruppo, e le correzioni temporanee non cambiano il vero obiettivo programmato. Gli storici indipendenti esistenti non vengono uniti. Velair salva l’apprendimento per il gruppo, non un modello separato per ogni membro. Le osservazioni individuali restano in Diagnostica. La creazione riparte da zero senza unire gli storici precedenti.

| Modifica | Apprendimento successivo |
| --- | --- |
| Rinominare il gruppo o riordinare i membri | L’apprendimento del gruppo viene conservato. |
| Aggiungere o rimuovere un membro | Il gruppo restante ricomincia l’apprendimento perché cambia la composizione fisica. Il membro rimosso inizia l’apprendimento indipendente da zero. |
| Cambiare riferimento o configurazione di invio | Il gruppo ricomincia l’apprendimento e annulla la precedente osservazione attiva. |
| Sciogliere il gruppo | Ogni membro inizia l’apprendimento indipendente da zero. Lo storico del precedente gruppo viene eliminato. |

Rimuovere un membro gli assegna una copia indipendente della configurazione comune. Sciogliere il gruppo fa lo stesso per tutti. Boost attivi, pause e storico termico non vengono copiati nelle stanze indipendenti. Controlla programmazioni e Profili dopo il cambio dell’unità di controllo.

Ad esempio, rimuovere un dispositivo da un gruppo di tre lascia due membri con un nuovo storico del gruppo e un dispositivo indipendente con un nuovo storico. Eliminare il gruppo rende tutti indipendenti. Nessuna operazione ripristina automaticamente gli storici precedenti al gruppo. Mantieni almeno due membri in un gruppo salvato; scioglilo se tutti devono diventare indipendenti.

<a id="before-testing-the-beta"></a>
## Prima di provare la beta

Salva una copia della configurazione includendo l’apprendimento se necessario. Dopo revisione e salvataggio, verifica che:

- Un gruppo compaia in Programmazione, Profili, Precondizionamento e Room Assist.
- Ogni membro resti visibile individualmente in Panoramica, Prossimi eventi, Cronologia di oggi, Comfort e Diagnostica.
- L’invio corrisponda all’impianto: comandi diretti a tutti oppure al destinatario scelto che l’impianto propaga agli altri.
- Modificare il Comfort di un membro lasci invariati gli altri.
- Una pausa o regolazione manuale da un membro riguardi l’intera stanza.
- Riavviare Home Assistant conservi gruppo, ordine e configurazione condivisa.

Per segnalare un problema, indica modalità di invio, membro di riferimento, abilitazione di Room Assist e prove pertinenti della Diagnostica. Una chiamata accettata è diversa da un dispositivo che riporta lo stato richiesto.

Le beta precedenti possono contenere un riferimento esterno del gruppo. Caricarle o importarle conserva tale riferimento senza scegliere automaticamente un membro né abilitare Room Assist. L’editor identifica il valore precedente e richiede un riferimento a un membro prima di salvare un gruppo modificato. Configura il sensore esterno in Room Assist passando alla nuova disposizione.

Gruppi stanza e alimentazioni condivise hanno scopi diversi. Il gruppo controlla una stanza; [Controllo alimentazione](shared-climate-supply.it.md) aggrega le richieste per azionare una fonte comune. I modelli collegati condividono il contenuto della programmazione senza cambiare l’autorità sulla stanza. Le dipendenze di precondizionamento coordinano stanze separate mantenendo l’apprendimento indipendente.
