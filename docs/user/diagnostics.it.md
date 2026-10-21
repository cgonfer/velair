<a id="diagnostics"></a>
# Diagnostica
<!-- velair-docs:start -->
Traduzioni: [Originale in inglese](diagnostics.md) · [Español](diagnostics.es.md) · [Français](diagnostics.fr.md) · [Deutsch](diagnostics.de.md) · [Italiano](diagnostics.it.md) · [Nederlands](diagnostics.nl.md) · [Polski](diagnostics.pl.md) · [Português (Brasil)](diagnostics.pt-br.md) · [Português (Portugal)](diagnostics.pt-pt.md) · [Русский](diagnostics.ru.md) · [Stato delle traduzioni](../translation-status.md)

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

La sezione **Diagnostica** offre una vista locale in sola lettura di ciò che Velair può verificare, senza richiedere Recorder di Home Assistant o servizi esterni.

Mostra lo stato attuale del pianificatore e una striscia orizzontale compatta dei dispositivi climatici gestiti nell’ordine configurato dei termostati. Selezionare un dispositivo apre un unico pannello dettagliato a tutta larghezza sotto la striscia. Il pannello raggruppa ogni informazione una sola volta sotto stato e invio, configurazione attiva, funzioni e dispositivo e sensori. Include:

- disponibilità e capacità HVAC/temperatura dichiarate;
- problemi di configurazione rilevati quando Velair dispone di prove dirette;
- modalità e profili effettivi, intento di esecuzione calcolato, incrementi e pause;
- ultimo obiettivo di controllo accettato da Home Assistant, errore di invio e stato limitato dei nuovi tentativi;
- Room Assist, precondizionamento adattivo, Comfort e sensori esplicitamente associati.

Le chiamate riuscite a `velair.set_hvac_mode` compaiono come invio manuale accettato di sola modalità. Includono la modalità HVAC scelta senza inventare una temperatura. Gli errori di validazione non sostituiscono le informazioni accettate precedenti e gli errori di invio fisico non pubblicano un evento di obiettivo riuscito.

Velair non deduce una causa quando le informazioni disponibili dimostrano solo un sintomo, come un’entità non disponibile. Le informazioni sulla batteria vengono omesse se Velair non può stabilire un’associazione affidabile; la prima versione non tenta associazioni euristiche dei dispositivi.

Per Comfort, la diagnostica include la fonte salvata di ogni lettura derivata abilitata, l’input effettivo o l’entità esterna, la disponibilità attuale e codici stabili per dati mancanti, non aggiornati, non validi o non verificati. Punto di rugiada, umidità assoluta e Humidex restano osservativi: la loro presenza in un rapporto non significa che abbiano influenzato la programmazione o il controllo climatico. Gli stessi dati abilitati sono esposti nell’attributo `derived_metrics` del sensore di zona **Condizione ambientale**; Velair non crea entità proxy separate. Le letture attuali includono `freshness: reported` oppure `unverified`; quest’ultimo resta visibile con un’etichetta informativa ed è riconducibile alla fonte. Quando è abilitato il confronto esterno, lo stesso rapporto Comfort contiene anche disponibilità esplicita dei sensori, qualità indipendente dei dati esterni, confronto normalizzato, umidità assoluta interna/esterna esplicita e qualsiasi codice di opportunità o compromesso. Il blocco `guidance_thresholds` registra la sensibilità effettiva per zona usata per la conclusione, aiutando a distinguere un problema del sensore da indicazioni volutamente più rigorose. Questi valori restano osservativi e non indicano che Velair abbia aperto una finestra o cambiato HVAC. La diagnostica include anche `comfort_zone`: geometria configurata semplice, guidata o personalizzata dipendente dalla temperatura e intervallo di umidità effettivo alla temperatura attuale. Un intervallo effettivo `null` spiega perché una lettura attuale di umidità non è stata classificata quando la temperatura non era disponibile; non viene sostituito con un valore alternativo ipotizzato.

La valutazione in tempo reale include `range_summary` attuale. Le voci conservate di `comfort_assessment_changed` mantengono anche `previous_range_summary` e i flag `range_summary_changed` e `range_status_changed`, così un rapporto scaricato può mostrare se l’evento rappresentava una transizione dell’intervallo configurato o un’altra modifica Comfort. Questi campi contengono solo codici semantici stabili, non il contesto grezzo degli eventi Home Assistant.

<a id="learning-evidence"></a>
## Informazioni sull’apprendimento

La sezione della funzione Precondizionamento distingue l’attività di riscaldamento e raffrescamento. Mostra se un’osservazione è in corso o Velair attende una transizione adatta e, se disponibile, l’ultima transizione di apprendimento conservata. I dettagli espandibili contengono solo le informazioni pertinenti a quella decisione: per esempio temperature iniziale e obiettivo, delta minimo di temperatura, durata osservata e anticipo massimo configurato.

La cronologia di Precondizionamento include avvii, interruzioni e risultati delle osservazioni, oltre alle transizioni reali che non hanno permesso di avviarne una. I risultati distinguono osservazioni complete, parziali e non valide. Per queste ultime possono indicare una differenza di temperatura troppo piccola, una durata troppo breve o una durata oltre il massimo configurato. Le osservazioni precedenti possono mantenere il motivo generico di superamento dei limiti; Velair non assegna retroattivamente una causa più precisa.

Ricalcolare ripetutamente previsioni future non crea voci di apprendimento. L’ultima transizione segue le stesse impostazioni di conservazione e lo stesso limite globale della cronologia. Disabilitare la cronologia di Precondizionamento o cancellare la cronologia elimina queste informazioni storiche; non ferma l’apprendimento e non cancella i campioni salvati. Dopo un riavvio non vengono ripristinate attività e cronologia di esecuzione precedenti. Senza informazioni disponibili, Diagnostica non inventa motivi per contatori invariati né deduce se la caldaia fosse in funzione.

<a id="preconditioning-dependency-evidence"></a>
### Informazioni sulla dipendenza del precondizionamento

Per una stanza con **Master del precondizionamento** configurato, esamina i dettagli della dipendenza accanto alle informazioni di preparazione esistenti. Distinguono la stima autonoma, transizione e avvio selezionati del master e l’avvio effettivo o il motivo che impedisce la preparazione. Un comando accettato da Home Assistant dimostra un’azione di Velair, non misura il relè della caldaia. L’osservazione di apprendimento continua a descrivere temperatura e tempo trascorso della stanza dipendente.

Quando sono disponibili informazioni, la spiegazione distingue la disponibilità in Home Assistant da programmazione o Precondizionamento disabilitati, Profilo in pausa, modifica temporanea attiva, master non idoneo o transizione mancante. La stessa spiegazione compare nelle schede e in Diagnostica. Un dispositivo non disponibile può avere ancora una previsione calcolata se un altro sensore configurato fornisce la temperatura ambiente; la previsione non conferma che il dispositivo possa ricevere un comando o fornire riscaldamento o raffrescamento.

<a id="runtime-history-and-privacy"></a>
## Cronologia di esecuzione e privacy

La diagnostica conserva al massimo 100 eventi rilevanti in un’unica cronologia globale. La sezione **Impostazioni cronologia** permette di conservare separatamente attività di controllo e programmazione, Room Assist, precondizionamento, Comfort, invio dei comandi climatici ed eventi di disponibilità. I nuovi tipi di evento Velair non ancora classificati vengono conservati sotto controllo e programmazioni anziché scartati silenziosamente. Anche le regolazioni esterne e le transizioni fra controllo automatico e manuale restano in questa categoria. Le voci mostrano solo modalità HVAC o obiettivo singolo/intervallo modificato, criterio effettivo delle modifiche esterne e qualsiasi motivo di scadenza o ripresa; non vengono conservati attributi climatici arbitrari o identificatori Context di Home Assistant. Tutte le categorie sono abilitate per impostazione predefinita. Le scelte vengono salvate localmente dal backend; disabilitare una categoria rimuove immediatamente gli eventi già conservati. **Cancella cronologia** rimuove tutti gli eventi senza cambiare le informazioni attuali su stato, invio o configurazione.

Il registro di esecuzione può essere filtrato localmente senza cambiare ciò che Velair conserva. Scegli qualsiasi combinazione della fonte di sistema Velair e dei dispositivi gestiti, oppure l’opzione principale **Tutti**; poi puoi restringere l’elenco per categoria e intervallo inclusivo di date Da/A. **Cancella filtri** ripristina l’intera cronologia conservata. Una cronologia vuota viene mostrata diversamente da una combinazione di filtri senza corrispondenze. I filtri sono stato temporaneo dell’interfaccia e non vengono salvati.

Su desktop, le colonne del registro possono essere ridimensionate trascinando i separatori o usando la tastiera quando un separatore ha il focus. I tasti freccia ridimensionano a piccoli passi, Maiusc+Freccia usa passi maggiori, Home/Fine raggiungono i limiti consentiti e un doppio clic ripristina la larghezza predefinita. Le larghezze sono temporanee e non vengono salvate. Su mobile, ora, dispositivo, tipo e messaggio compaiono su quattro righe separate. Una riga può scorrere orizzontalmente quando un valore non entra senza andare a capo.

Vengono salvate solo le scelte delle categorie. La cronologia degli eventi esiste solo in memoria, viene cancellata al riavvio dell’integrazione o di Home Assistant e non usa Recorder. Viene alimentata da eventi Velair esistenti, cambiamenti di disponibilità ed esiti dell’invio, quindi non aggiunge interrogazioni periodiche.

**Scarica rapporto** apre le opzioni di privacy prima di creare JSON adatto a una segnalazione. Gli ID delle entità climatiche gestite sono sostituiti per impostazione predefinita da alias stabili; puoi conservare gli ID originali per un’ispezione locale. Gli identificatori di profilo, modalità e pausa vengono sempre rimossi. Chiudere il pannello o completare un download ripristina il valore predefinito più sicuro. Il download standard della diagnostica della voce di configurazione Home Assistant usa sempre l’istantanea con dati sensibili rimossi. La sezione di esportazione del rapporto è nascosta nei layout da telefono perché i download non sono affidabili nella webview dell’app companion. Apri Velair da un browser su tablet o desktop quando devi scaricare un rapporto. Controlla ogni rapporto prima di pubblicarlo. Anche gli ID dei sensori associati vengono sostituiti; la vista locale in tempo reale li mantiene visibili perché sono utili per verificare la configurazione.

La vista locale Diagnostica usa i nomi descrittivi Home Assistant dei dispositivi nei filtri, ma il pannello dettagliato mostra intenzionalmente gli ID locali per verificare la configurazione. Con l’opzione di privacy predefinita abilitata, i rapporti scaricati sostituiscono sia gli ID strutturati sia quelli incorporati nel testo degli errori conservati con alias deterministici come `climate_unit_1` e `associated_entity_1`. I riferimenti ripetuti mantengono lo stesso alias, preservando le relazioni senza esporre gli ID locali originali. Se scegli esplicitamente di mantenere gli ID originali, quegli identificatori locali restano nel rapporto; quelli di profili, modalità e pause vengono comunque rimossi. Controlla ogni rapporto prima di condividerlo.

La diagnostica non contiene controlli del pianificatore, nuovi tentativi, annullamento delle modifiche o controlli climatici. Le impostazioni continuano a contenere configurazione e manutenzione; i dettagli di capacità e stato dei dispositivi appartengono ora alla diagnostica.

Ogni dispositivo gestito segnala anche informazioni di assestamento dei comandi presenti solo in esecuzione. Mentre un comando Velair recente si stabilizza, Diagnostica elenca i campi di controllo interessati nell’istantanea. Se il dispositivo non converge entro il termine limitato, la successiva istantanea aggiornata lo segnala con un avviso `command_settling_mismatch`. Espandi l’avviso nel pannello Diagnostica del dispositivo selezionato per confrontare il valore atteso di ogni campo con quello riportato dal termostato. Le temperature includono l’unità del dispositivo, le modalità HVAC usano le etichette normali e i valori mancanti sono indicati esplicitamente. Il confronto usa i dati registrati, non la programmazione attuale o una nuova lettura. Il rapporto scaricato conserva anche il blocco `command_settling`. Sono informazioni per risolvere problemi: Diagnostica non riprova il comando, non cambia il dispositivo e non crea una regolazione manuale. Le informazioni vengono cancellate da un nuovo comando per quel campo o da un riavvio.

<a id="automating-diagnostic-health"></a>
## Automatizzare il monitoraggio diagnostico

Velair crea un’entità **Stato della diagnostica** con stati `ok`, `warning` ed `error`. Viene aggiornata dalla stessa istantanea backend di questa vista e non effettua interrogazioni periodiche. Gli attributi compatti includono stato del pianificatore, conteggi dei dispositivi, conteggi dei problemi e codici stabili; non includono errori grezzi o identificatori operativi.

Usa un trigger di stato quando l’automazione ha bisogno solo dello stato complessivo attuale. Usa l’evento `diagnostic_issue_changed` quando deve reagire al rilevamento o alla risoluzione di un singolo problema mentre altri restano attivi. Consulta [Eventi per le automazioni](automation-events.it.md#diagnostic-issue-changed) per dati ed esempi dell’evento.

Ogni dispositivo gestito ha anche un sensore **Diagnostica consegna**, disabilitato per impostazione predefinita. Espone lo stesso stato di invio presente solo in esecuzione e l’ultimo obiettivo di controllo accettato usati dalla diagnostica, senza testo grezzo degli errori. Un obiettivo accettato significa che Home Assistant ha accettato la relativa sequenza di servizi Velair; non dimostra lo stato del dispositivo o del trasporto. Room Assist può successivamente correggere l’obiettivo inviato e ne espone il contesto nel proprio sensore. Le informazioni di invio non vengono mai ripristinate dopo un riavvio e vengono cancellate da un ripristino riuscito dei dati Velair. Consulta [Sensori di controllo della zona e invio dei comandi](zone-sensors.it.md#zone-delivery-diagnostics) per il contratto completo di stati e attributi, i passaggi di abilitazione e gli esempi di automazione.
