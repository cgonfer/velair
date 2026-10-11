<a id="climate-profiles"></a>
# Profili climatici
<!-- velair-docs:start -->
Traduzioni: [Originale in inglese](climate-profiles.md) · [Español](climate-profiles.es.md) · [Français](climate-profiles.fr.md) · [Deutsch](climate-profiles.de.md) · [Italiano](climate-profiles.it.md) · [Nederlands](climate-profiles.nl.md) · [Polski](climate-profiles.pl.md) · [Português (Brasil)](climate-profiles.pt-br.md) · [Português (Portugal)](climate-profiles.pt-pt.md) · [Русский](climate-profiles.ru.md) · [Stato delle traduzioni](../translation-status.md)

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

I profili climatici permettono a Velair di passare fra piani settimanali coordinati per più zone senza sostituire le programmazioni predefinite. Home Assistant resta il livello decisionale: presenza, finestre, stagioni, selettori, sensori o altre automazioni decidono quando cambiare profilo, mentre Velair salva, applica e mostra il comportamento climatico risultante.

Un **Profilo** definisce una routine climatica alternativa per le zone configurate. Una **Modalità** attiva insieme uno o più profili senza sovrapposizioni come unico stato della casa. Attiva direttamente un profilo se serve solo quella routine; usa una modalità se più aree devono cambiare insieme.

Fra gli esempi ci sono Presenza, Assenza, Vacanza, Estate, Ospiti e Notte. I profili supportano anche installazioni con orari dei blocchi, obiettivi e modalità HVAC differenti per riscaldamento e raffrescamento.

<a id="default"></a>
## Configurazione predefinita

`Default` è la selezione integrata e indica sempre le programmazioni settimanali configurate nella scheda Programmazioni. Non è un profilo salvato, quindi non può essere rinominato o eliminato.

Attivare un altro profilo non sovrascrive mai quelle programmazioni. Tornare a Default applica immediatamente il blocco predefinito attivo in quel momento.

<a id="configure-a-profile"></a>
## Configurare un profilo

Apri **Programmazioni**, scegli **Programmazioni dei profili** e usa il pulsante di aggiunta per creare un profilo vuoto. Selezionalo dall’elenco per modificarne colore, icona, nome, descrizione e comportamento dei termostati. L’area di lavoro del profilo mostra un termostato selezionato alla volta per mantenere utilizzabile l’editor completo su desktop, tablet e mobile. Il nome si modifica nell’intestazione, accanto alla matita. L’ID stabile per le automazioni compare sotto il nome e nell’elenco dei profili, così puoi copiarlo in servizi, script e automazioni senza confonderlo con il nome visualizzato modificabile. Le icone usano chiavi Material Design Icons come `mdi:briefcase-outline`; l’editor mostra un’anteprima nel colore scelto, collega il catalogo ricercabile Material Design Icons e segnala chiavi prive del formato previsto `mdi:icon-name`. Le descrizioni sono limitate a 500 caratteri e l’editor mostra il conteggio rimanente. Velair assegna un colore stabile ai profili nuovi ed esistenti; puoi cambiarlo tramite selettore o valore modificabile `#RRGGBB`. I valori non validi sono evidenziati e non salvabili. Il colore è incluso nelle esportazioni portabili. La selezione integrata Default mantiene il colore fisso. Per ogni dispositivo gestito, scegli un comportamento:

- **Programmazione predefinita**: continuare a usare la normale programmazione settimanale della zona.
- **Programmazione del profilo**: usare una programmazione settimanale completa salvata nel profilo.
- **Pausa** con **Lascia il termostato invariato**: interrompere le modifiche programmate lasciando il dispositivo com’è.
- **Pausa** con **Spegni il dispositivo climatico**: interrompere le modifiche programmate e spegnere il dispositivo.

Le zone non configurate in un profilo continuano con la programmazione predefinita. I modelli possono ancora essere copiati come blocchi indipendenti, oppure un giorno predefinito o di profilo può collegare solo gli orari a un modello mantenendo impostazioni proprie, o seguire l’intero modello con tutti i controlli in sola lettura. Modelli e blocchi indipendenti possono fare riferimento a preset Velair condivisi. Consulta [Preset dei blocchi e modelli collegati](linked-schedules.it.md) per propagazione, scollegamento, compatibilità e modifiche condivise, e [l’esempio Inverno/Estate](linked-schedule-examples.it.md#2-winter-and-summer-with-one-set-of-times) per impostazioni diverse con gli stessi orari. Clonare un giorno conserva tipo di collegamento al modello, assegnazioni dei soli orari e riferimenti ai preset. Clonare su un altro termostato verifica il profilo proposto prima di applicare la bozza; gli altri giorni di destinazione mantengono i collegamenti esistenti. Usa Scollega dopo la clonazione se il nuovo giorno deve essere indipendente dal modello.

Per una zona delegata a un controller esterno, profili e modalità selezionano l’intera settimana effettiva pubblicata da Velair anziché provocare azioni dirette `climate.*`. **Programmazione predefinita** pubblica la settimana normale e **Programmazione del profilo** quella del profilo. **Pausa** non è disponibile per una zona gestita esternamente. L’editor dei profili usa le capacità del controller come validazione aggiuntiva; un errore di pubblicazione non annulla la selezione salvata di profilo o modalità né influisce sulle zone locali. Consulta [Esecuzione esterna della programmazione](external-systems.it.md) per i limiti attuali del controller e il significato della pubblicazione.

Da un giorno modificato della programmazione del profilo, **Salva come modello** salva tramite backend solo un modello riutilizzabile e lascia invariata la bozza del profilo non salvata. Per riutilizzare il giorno in altri dispositivi gestiti, selezionali in **Clona giorno in / Altri termostati** e scegli **Clona**. La conferma riepiloga i dispositivi selezionati e identifica le zone Default o Pausa che passeranno a **Programmazione del profilo**. La clonazione sostituisce solo lo stesso giorno della settimana, conserva tutti gli altri giorni memorizzati e resta parte della bozza del profilo. Velair verifica tipo di obiettivo, modalità HVAC, limiti e passo di temperatura per ogni dispositivo prima di cambiare la bozza. Rimuove i controlli facoltativi non supportati da ciascuna destinazione. Se un blocco di sole opzioni non ha più controlli supportati, oppure obiettivo o modalità sono incompatibili, la bozza non cambia affatto. I giorni clonati vengono salvati in modo persistente solo salvando il profilo.

Ogni giorno del profilo usa la stessa sequenza temporale modificabile di programmazioni predefinite e modelli, con trascinamento e ridimensionamento degli orari. I blocchi hanno un inizio ma non una fine separata: l’ultimo continua oltre mezzanotte e nei giorni vuoti finché non inizia un altro blocco. La sequenza rappresenta la parte ereditata del giorno con un segmento distinto non modificabile e identifica il giorno in cui il blocco è realmente configurato. Mentre il profilo resta aperto, passare temporaneamente una zona da **Programmazione del profilo** a **Programmazione predefinita** o **Pausa** conserva la bozza settimanale. Tornare a **Programmazione del profilo** ripristina quei blocchi non salvati. Salvare il profilo con Default o Pausa conserva solo il comportamento selezionato; la programmazione nascosta della bozza non viene salvata. Il selettore mostra nomi descrittivi e l’editor attivo anche l’ID dell’entità. Metadati e programmazioni vengono salvati insieme come unico profilo atomico; cambiare termostato selezionato non salva una bozza parziale.

Più profili possono essere attivi insieme quando una modalità li coordina. Le zone configurate non devono sovrapporsi: ogni dispositivo gestito ha al massimo un profilo che ne controlla il comportamento effettivo. Le zone non assegnate a un profilo attivo continuano con la programmazione predefinita.

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

Usa il pulsante di riproduzione nella riga di un profilo in **Programmazioni > Programmazioni dei profili** per attivarlo direttamente, oppure la scheda condivisa **Configurazione attiva** nella panoramica o sopra **Modalità**. Mostra la modalità attuale e i profili applicati come un’unica relazione. Scegli **Cambia** per selezionare una modalità oppure usa il gruppo separato **Attiva manualmente un profilo**. Una scelta diretta sostituisce l’insieme attivo con quel profilo e cambia la modalità in **Manuale**, mentre **Predefinito** indica nessun profilo alternativo attivo. I profili si possono attivare anche dalla loro riga, dalla configurazione attiva o con `velair.activate_profile`. Velair applica il blocco attivo all’ora attuale anziché attendere il prossimo confine programmato, incluso l’ultimo blocco di un giorno precedente quando nel giorno attuale non ne è ancora iniziato uno nuovo.

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

La scheda Modalità mostra insieme modalità attiva e profili applicati in una sola scheda **Configurazione attiva**. Il suo unico selettore raggruppato elenca prima Default e modalità personalizzate, con attivazione diretta dei profili separata. Manuale resta visibile come stato ma non selezionabile qui. Selezionare una modalità attiva tutti i profili associati, mentre selezionare direttamente un profilo sostituisce l’insieme attivo con quel solo profilo e cambia la modalità in **Manuale**. Le righe delle modalità mostrano icone e colori dei profili associati, mantenendo distinguibili modalità e profili anche con lo stesso nome. Le righe integrate spiegano brevemente quando si applicano.

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

<a id="seasonal-selection"></a>
## Selezione stagionale

Il [blueprint di selezione climatica stagionale](blueprints/seasonal-climate-selection.it.md) può scegliere una modalità da un massimo giornaliero o un altro sensore di temperatura dopo una variazione stabile. Collega profili Inverno ed Estate agli stessi orari di un modello assegnando preset differenti. Configura un profilo per il clima mite con pausa e spegnimento quando non serve climatizzazione. Coordina l’automazione con le regole di presenza: un’altra lettura stabile può sostituire una modalità Assenza scelta manualmente.

<a id="interactions"></a>
## Interazioni

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
