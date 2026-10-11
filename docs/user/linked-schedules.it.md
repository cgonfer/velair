<a id="block-presets-and-linked-templates"></a>
# Preset dei blocchi e modelli collegati
<!-- velair-docs:start -->
Traduzioni: [Originale in inglese](linked-schedules.md) · [Español](linked-schedules.es.md) · [Français](linked-schedules.fr.md) · [Deutsch](linked-schedules.de.md) · [Italiano](linked-schedules.it.md) · [Nederlands](linked-schedules.nl.md) · [Polski](linked-schedules.pl.md) · [Português (Brasil)](linked-schedules.pt-br.md) · [Português (Portugal)](linked-schedules.pt-pt.md) · [Русский](linked-schedules.ru.md) · [Stato delle traduzioni](../translation-status.md)

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

Velair può riutilizzare una configurazione climatica tramite un **preset del blocco** e collegare un giorno a un modello giornaliero. Scegli **Solo orari** per condividere gli orari con impostazioni climatiche indipendenti, oppure **Orari e impostazioni** per seguire il modello completo. La programmazione predefinita e i profili supportano entrambe le scelte. I blocchi di un modello possono usare impostazioni manuali o preset Velair.

Inizia dagli [Esempi pratici](linked-schedule-examples.it.md) per riscaldamento condiviso, profili stagionali, copie indipendenti, conversioni dei collegamenti e modifiche incompatibili.

<a id="block-presets"></a>
## Preset dei blocchi

Un preset del blocco Velair ha un nome e la stessa configurazione climatica di un blocco della programmazione, senza l’orario iniziale. Può impostare una temperatura o un intervallo nativo con opzioni supportate, selezionare solo una modalità HVAC, applicare solo opzioni climatiche oppure spegnere il dispositivo. Un preset Velair è diverso da `preset_mode` del dispositivo, che può essere una delle sue opzioni configurate.

I preset appartengono a una libreria condivisa. Ogni destinazione viene verificata rispetto al termostato e, quando applicabile, al controller esterno della programmazione. Un’opzione omessa non viene inviata; omettere la ventilazione non ripristina la ventilazione del termostato.

Gestisci la libreria condivisa in **Modelli → Preset climatici**. Il selettore della libreria spiega sia i modelli giornalieri sia i preset climatici condivisi. Usa il pulsante di aggiunta nell’intestazione dell’elenco per creare un preset. Una libreria vuota mantiene lo stesso layout di elenco e dettagli. Seleziona un preset esistente per esaminarlo; le modifiche non salvate compaiono solo dopo averne cambiato nome o impostazioni climatiche. La verifica facoltativa della compatibilità non lo contrassegna come modificato. Gli utilizzi sono informazioni in sola lettura. L’editor non richiede un termostato: scegli impostazioni di riscaldamento o raffrescamento, un obiettivo singolo o un intervallo e impostazioni facoltative del dispositivo. Una verifica facoltativa con un termostato anticipa la compatibilità senza cambiare i valori condivisi. Ogni utilizzo effettivo viene verificato dal backend prima del salvataggio.

Salva un preset con l’icona accanto al nome. La modifica ne conserva la posizione nella libreria, anche dopo il ricaricamento; i nuovi preset vengono aggiunti in fondo. I campi di temperatura accettano punto o virgola decimale (per esempio `21.5` o `21,5`), compresi entrambi i limiti di un intervallo nativo. L’editor conserva ciò che scrivi e invia valori numerici all’anteprima o al salvataggio. La verifica facoltativa della compatibilità mostra le impostazioni effettive per un termostato selezionato, con un risultato separato di successo o errore. Verificare la compatibilità non salva il preset né cambia lo stato delle modifiche non salvate.

I riferimenti ai preset nei modelli compaiono separatamente da quelli diretti nella programmazione predefinita e nei profili. Gli indicatori di utilizzo contano i riferimenti diretti, inclusi quelli in modelli privi di giorni collegati. I termostati che ereditano un preset tramite un modello completo compaiono come destinazioni ulteriormente interessate, senza contare di nuovo lo stesso riferimento del modello. Gli utilizzi dei dispositivi sono raggruppati per termostato, con una riga separata per la programmazione predefinita e ciascun profilo.

L’elenco mostra un’icona di collegamento accanto a ogni conteggio degli utilizzi. Passa il puntatore sul pulsante di eliminazione disabilitato per capire perché non si può eliminare un preset in uso; prima scollega i blocchi. L’indicatore degli utilizzi di ogni preset occupa un’ultima riga dedicata, sotto il riepilogo della configurazione.

Scegli un preset in un blocco per conservarne un riferimento dinamico. Modificare il preset aggiorna ogni riferimento. Il blocco non può contenere anche impostazioni climatiche locali. Scollegare un preset mantiene la configurazione effettiva come impostazioni manuali e interrompe gli aggiornamenti futuri del preset per quel blocco.

Apri **Impostazioni aggiuntive** di un blocco per scegliere un **Preset Velair**. È separato da **Preset del dispositivo**, l’opzione nativa `preset_mode` del termostato. Il blocco mantiene le normali colonne di orario, modalità, obiettivo, impostazioni ed eliminazione. Le impostazioni climatiche collegate compaiono nei controlli abituali e sono in sola lettura; l’orario resta modificabile salvo che anche il giorno abbia orari collegati.

Una riga sotto il blocco identifica il preset collegato e le impostazioni aggiuntive. Il contatore delle impostazioni conta uno per il collegamento al preset Velair più ogni opzione del dispositivo configurata, escludendo orario, modalità HVAC e obiettivo di temperatura. Valori e adattamenti di compatibilità provengono dal backend; anteprime in caricamento o fallite non sostituiscono il riferimento salvato con impostazioni manuali. Spostare l’orario iniziale mantiene visibili le impostazioni risolte del preset; cambiare l’orario non richiede un’altra anteprima del preset.

Nelle impostazioni aggiuntive, scegli un altro preset Velair oppure **Nessun preset Velair** per scollegarlo mantenendo le impostazioni effettive modificabili manualmente. Gestisci e modifica i preset condivisi in **Modelli → Preset climatici**. Le opzioni del dispositivo restano in sola lettura durante il collegamento. Il pulsante di eliminazione conserva la posizione abituale e resta disabilitato quando il blocco appartiene agli orari collegati di un modello.

Il pannello mostra prima il selettore della configurazione, poi le opzioni del dispositivo e infine un solo riepilogo **Cosa invia questo blocco**. Il riepilogo comprende blocchi manuali e preset Velair risolti, inclusi intervalli di temperatura, azioni di sola modalità, sole opzioni e Off. Compare anche quando il termostato non ha opzioni aggiuntive. Mentre l’anteprima del preset è in attesa o indisponibile, il riepilogo mostra quello stato anziché ipotizzare i comandi.

<a id="linked-templates"></a>
## Modelli collegati

I collegamenti dei modelli sono in sola lettura e raggruppati per termostato, poi per programmazione predefinita o profilo, con i giorni collegati elencati insieme. **Giorni collegati** conta un giorno collegato, indipendentemente dal numero di blocchi del modello. L’elenco mostra questi conteggi in un’ultima riga separata sotto il numero di blocchi di ogni modello. Le copie indipendenti non vengono contate e non compaiono nell’elenco. Scollega tutti i giorni prima di eliminare un modello; il pulsante disabilitato spiega questo requisito.

Le programmazioni predefinite e dei profili possono collegare ciascun giorno della settimana di ogni termostato a un modello giornaliero. Con **Solo orari**, configura l’azione climatica di ogni fascia nella destinazione; le impostazioni possono essere manuali o usare un preset del blocco. Destinazioni diverse possono usare azioni diverse alla stessa ora condivisa.

Con **Orari e impostazioni**, il modello fornisce sia orari sia impostazioni climatiche. I suoi blocchi possono contenere impostazioni manuali o riferimenti dinamici ai preset. Tutti i controlli della destinazione sono in sola lettura e mostrano i valori effettivi; modifica il modello o scollega il giorno per cambiarli. Non ci sono sostituzioni locali per blocco. Cambiare le impostazioni del modello influisce sui collegamenti completi, mentre quelli dei soli orari mantengono le proprie impostazioni climatiche.

Per esempio, un modello Giorno lavorativo inizia alle 07:00 e 23:00. La programmazione predefinita può assegnare il suo normale preset di comfort, un profilo Inverno preset di riscaldamento e un profilo Estate raffrescamento e Off. Spostare le 07:00 alle 07:30 aggiorna tutti e tre senza scambiarne le configurazioni.

Gli orari collegati si modificano nel modello, non trascinando la sequenza della destinazione. Cambiare temperature o modalità del modello non cambia le destinazioni collegate solo per gli orari. Una settimana può mescolare giorni indipendenti ed entrambi i tipi di collegamento.

Il selettore **Origine programmazione** sceglie una programmazione indipendente o un modello. Per un modello, scegli **Solo orari** oppure **Orari e impostazioni**. L’icona informazioni spiega le scelte. Passare dai soli orari alla configurazione completa chiede conferma prima di sostituire le assegnazioni climatiche del giorno. Passare dalla configurazione completa ai soli orari mantiene le impostazioni attuali del modello, inclusi i riferimenti ai preset, come assegnazioni indipendenti. **Scollega** conserva gli orari e le configurazioni attuali della bozza, compresi i preset. Le impostazioni manuali diventano i valori effettivi adattati dal backend al termostato; per esempio un obiettivo condiviso di 18.3 °C diventa 18.5 °C su un dispositivo con passi di 0.5 °C. I riferimenti ai preset restano dinamici e le definizioni condivise non cambiano. Passa il puntatore, tocca o porta il focus su un controllo bloccato per vedere come modificare la sua configurazione condivisa. La programmazione predefinita e i profili usano gli stessi controlli di aiuto.

Cambiare il selettore dell’origine chiede conferma prima di sostituire la bozza del giorno, anche se le impostazioni sono incomplete. Le impostazioni a orari esattamente corrispondenti vengono mantenute; i nuovi orari richiedono proprie assegnazioni. Annullare mantiene selezione e bozza precedenti. Le modifiche hanno effetto solo dopo il salvataggio.

Scegliere **Programmazione propria** chiede conferma prima di scartare le modifiche del giorno e ripristina la programmazione salvata nella stessa origine: predefinita o del profilo selezionato. Se il giorno salvato ha orari collegati, quegli orari e assegnazioni diventano una bozza indipendente mantenendo i riferimenti ai preset. Non recupera una programmazione manuale storica. Gli altri giorni vengono conservati.

**Scollega** è diverso: conserva orari e impostazioni della bozza attuale, comprese le modifiche successive all’ultimo salvataggio.

<a id="copy-or-link"></a>
## Copiare o collegare

- **Copia blocchi** copia orari e impostazioni climatiche del modello, conservando i riferimenti ai preset e adattando le impostazioni manuali alla destinazione. Il risultato non segue il modello.
- **Collega orari** mantiene gli orari collegati al modello e usa impostazioni climatiche separate in ogni destinazione.
- **Collega configurazione completa** segue orari e impostazioni del modello, inclusi i preset dinamici, senza sostituzioni locali.
- Clonare un giorno della programmazione ne copia la configurazione, compresi tipo di collegamento al modello, assegnazioni dei soli orari e riferimenti ai preset. Un’origine collegata crea un altro giorno collegato; un’origine indipendente un altro giorno indipendente. I collegamenti dei giorni di destinazione fuori dalla selezione di clonazione vengono conservati.
- Salvare un giorno come modello mantiene impostazioni manuali effettive e riferimenti ai preset. Non cambia il modello originale o i preset condivisi.
- Svuotare un giorno rimuove i suoi blocchi locali e il collegamento al modello, senza cambiare il modello o le altre destinazioni.

Clonare su un altro termostato verifica la configurazione copiata rispetto alla destinazione. Impostazioni condivise incompatibili rifiutano la clonazione anziché rimuovere il collegamento o sostituirlo con impostazioni manuali. Restano validi l’adattamento del passo per dispositivo e delle impostazioni facoltative. Nella programmazione predefinita, le destinazioni selezionate vengono salvate insieme; una destinazione non valida lascia tutte le destinazioni invariate. Le modifiche in attesa del giorno di origine vengono salvate prima, come nelle altre azioni di clonazione predefinite. La clonazione di un profilo modifica la bozza e verifica il profilo proposto; il salvataggio conferma comunque l’intero profilo.

Per iniziare un giorno indipendente da uno collegato, usa **Scollega** dopo la clonazione e salva. **Copia blocchi** dalla libreria dei modelli resta una copia indipendente.

<a id="shared-edits"></a>
## Modifiche condivise

Modificare un modello ne mantiene la posizione nella libreria, anche dopo il ricaricamento.

Aggiungere una fascia al modello propone una configurazione per ogni giorno collegato solo per gli orari, compresi profili inattivi e programmazioni predefinite nascoste da un profilo attivo. Velair prova prima le impostazioni climatiche della nuova fascia. Se sono incompatibili, prova i blocchi salvati precedentemente in quella destinazione: corrispondenza esatta di orario, blocchi precedenti dal più vicino al più lontano e poi successivi dal più vicino al più lontano. Viene copiata la prima configurazione compatibile. Il riferimento a un preset Velair del blocco di origine resta collegato a quel preset.

I blocchi da cui copiare appartengono alla stessa destinazione e allo stesso giorno, usando gli orari precedenti alla modifica. Un blocco spostato o rimosso può ancora fornire le proprie impostazioni salvate; un altro blocco appena aggiunto non può. Le impostazioni copiate sono indipendenti da quelle climatiche del modello: restano collegati solo gli orari. Se la nuova fascia del modello usa un preset, una proposta compatibile conserva quel riferimento.

I collegamenti completi ricevono invariata la nuova fascia del modello, senza scegliere un blocco da cui copiare. Se le impostazioni sono incompatibili con una qualsiasi destinazione completa, viene rifiutato l’intero salvataggio. Sono inclusi profili inattivi e programmazioni predefinite nascoste.

Controlla le proposte in **Giorni collegati**, raggruppate per termostato e programmazione predefinita o profilo, con indicazione del tipo di collegamento. I collegamenti completi mostrano impostazioni effettive ed errori senza un editor delle assegnazioni. Le assegnazioni alternative identificano l’origine. Se non esiste una configurazione compatibile, completa lì la nuova fascia usando impostazioni manuali o un preset Velair. Prima del salvataggio vanno risolti anche gli errori dell’intera programmazione, come griglia degli orari o limite di variazioni di un controller esterno.

Il normale controllo di salvataggio del modello conferma insieme modello e tutte le assegnazioni, senza un pannello di conferma separato. Modifiche incomplete o incompatibili restano bozze; le programmazioni salvate continuano a funzionare. Spostare una fascia esistente conserva le sue impostazioni di destinazione e rimuoverla elimina le assegnazioni nello stesso salvataggio.

Velair impedisce di eliminare un preset o un modello in uso. Un preset richiamato da un modello inutilizzato è comunque in uso. Prima sostituisci o scollega gli utilizzi. Modifiche in conflitto richiedono di aggiornare la configurazione; non devono aggiornare parzialmente le destinazioni collegate.

Le modifiche di un obiettivo automatico attivo si applicano dopo il salvataggio. Pause, regolazione manuale e incremento mantengono la priorità. Una modifica predefinita nascosta dalla programmazione propria di un profilo non sostituisce quel profilo; tornare alla configurazione predefinita usa l’ultima versione. I controller esterni ricevono programmazioni settimanali complete, non riferimenti, e gli errori non abilitano l’esecuzione locale.

<a id="seasonal-automations"></a>
## Automazioni stagionali

Usa [`velair.update_block_preset`](preset-automations.it.md) per aggiornare un preset condiviso da un’automazione. Gli aggiornamenti parziali mantengono gli altri campi; una sostituzione esplicita può cambiare l’azione. Gli aggiornamenti sono persistenti e influenzano ogni riferimento, con la normale validazione e priorità di esecuzione. La guida include esempi per temperatura esterna, intervallo nativo, opzioni del dispositivo e Off/ripristino.

Home Assistant decide ancora quando selezionare un profilo o una modalità. Riutilizzare orari dei modelli e preset evita configurazioni duplicate; non aggiunge regole sulla temperatura esterna o interrogazioni periodiche a Velair. La logica delle finestre dovrebbe usare pause di zona con responsabilità indipendente. Un preset non aggiunge una data di rientro con anticipazione né estende automaticamente un periodo di raffrescamento programmato.

<a id="backups-and-compatibility"></a>
## Backup e compatibilità

Il modello portabile 16 conserva preset, identità delle fasce dei modelli ed entrambi i tipi di collegamento. Le esportazioni includono i modelli necessari e i loro preset. Le importazioni vengono verificate rispetto all’intera configurazione risultante; i backup esistenti senza collegamenti restano utilizzabili. I collegamenti esistenti privi di tipo restano collegamenti dei soli orari. Le programmazioni esistenti non vengono collegate automaticamente durante l’aggiornamento.

Le temperature mantengono l’unità dichiarata di Velair e partecipano al processo esistente di migrazione delle unità. Un preset condiviso viene adattato per destinazione senza riscriverne il valore per adeguarlo al passo di un solo termostato.

Le sequenze delle programmazioni mostrano la temperatura o l’intervallo effettivo restituito dal backend. Un’icona di collegamento indica un preset Velair; un’icona di copia accanto all’orario indica orari collegati a un modello. Il tooltip nativo del blocco include azione, modalità, opzioni del dispositivo e nomi delle risorse condivise. Le impostazioni del preset in attesa o indisponibili vengono mostrate esplicitamente. I blocchi riportati dal giorno precedente descrivono configurazione e risorse del giorno di origine.

Gli intervalli molto brevi danno priorità a orario e obiettivo rispetto alle icone di origine e alle impostazioni aggiuntive. I dettagli mantengono valori e nomi completi delle risorse senza cambiare la durata dell’intervallo.
