<a id="practical-examples-presets-and-linked-templates"></a>
# Esempi pratici: preset e modelli collegati
<!-- velair-docs:start -->
Traduzioni: [Originale in inglese](linked-schedule-examples.md) · [Español](linked-schedule-examples.es.md) · [Français](linked-schedule-examples.fr.md) · [Deutsch](linked-schedule-examples.de.md) · [Italiano](linked-schedule-examples.it.md) · [Nederlands](linked-schedule-examples.nl.md) · [Polski](linked-schedule-examples.pl.md) · [Português (Brasil)](linked-schedule-examples.pt-br.md) · [Português (Portugal)](linked-schedule-examples.pt-pt.md) · [Русский](linked-schedule-examples.ru.md) · [Stato delle traduzioni](../translation-status.md)

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

Questa guida illustra configurazioni domestiche con **Predefinito**, **Profili**, modelli giornalieri e preset Velair. Nomi, entità e temperature sono esempi: usa modalità e obiettivi supportati dai tuoi termostati. Qui le temperature sono in Celsius; Velair supporta anche Fahrenheit.

Per le regole complete, consulta [Preset dei blocchi e modelli collegati](linked-schedules.it.md).

<a id="choose-what-you-want-to-share"></a>
## Scegliere cosa condividere

| Obiettivo | Scelta | Modifiche successive |
|---|---|---|
| Riutilizzare temperatura e opzioni a orari indipendenti | Un preset Velair in ogni blocco | Modificare il preset aggiorna quei blocchi; gli orari restano indipendenti. |
| Partire da un modello e personalizzare i blocchi | Copia blocchi | Le modifiche del modello non aggiornano la copia. I riferimenti ai preset copiati restano dinamici. |
| Duplicare un giorno configurato | Clona | La copia mantiene tipo di collegamento al modello, assegnazioni e riferimenti ai preset dell’origine. |
| Usare gli stessi orari con impostazioni diverse di riscaldamento o raffrescamento | Un modello con **Solo orari** | Le modifiche degli orari aggiornano ogni giorno collegato; le impostazioni climatiche restano indipendenti. |
| Mantenere identici orari e impostazioni di più giorni | Un modello con **Orari e impostazioni** | Orari e impostazioni seguono il modello; i controlli della destinazione sono in sola lettura. |

Un modello è un giorno, non un calendario settimanale. Collega esplicitamente ogni giorno e termostato necessario. Una settimana può contenere giorni indipendenti ed entrambi i tipi di collegamento. Default è la settimana normale di ogni termostato, non un profilo salvato.

<a id="1-one-heating-routine-for-two-rooms"></a>
## 1. Una routine di riscaldamento per due stanze

**Situazione:** soggiorno e camera richiedono entrambi comfort alle 07:00 e una riduzione notturna alle 23:00. Entrambi i termostati supportano riscaldamento e questi obiettivi.

1. Apri **Modelli → Preset climatici**. Crea e salva questi preset:

   | Preset | Modalità | Obiettivo |
   |---|---|---|
   | Comfort riscaldamento | Heat | 21 °C |
   | Notte riscaldamento | Heat | 17 °C |

2. Nella libreria dei modelli giornalieri, crea **Giorno feriale casa**. Aggiungi 07:00 e 23:00. Nelle **Impostazioni aggiuntive** di ogni blocco scegli il **Preset Velair** corrispondente e salva il modello.
3. Apri **Programmazioni → Programmazioni predefinite**, seleziona soggiorno e lunedì. Imposta **Origine programmazione** su **Giorno feriale casa**, poi scegli **Orari e impostazioni** in **Collegamento**. Salva il giorno.
4. Ripeti per la camera e per ogni giorno che deve seguire questa routine.

Orario, modalità, obiettivo e opzioni del dispositivo sono in sola lettura nei giorni collegati. La colonna obiettivo mostra ancora 21 °C o 17 °C; non sostituisce l’obiettivo con il nome del preset. Gli indicatori di origine e i dettagli del blocco identificano modello e preset.

Ora effettua due modifiche separate:

| Modifica salvata | Risultato |
|---|---|
| Spostare il blocco delle 07:00 del modello alle 07:30 | Ogni giorno collegato avvia quel blocco alle 07:30. Il riferimento al preset resta invariato. |
| Cambiare Comfort riscaldamento da 21 °C a 21.5 °C | Ogni riferimento al preset usa 21.5 °C, anche tramite il modello. Gli obiettivi notturni restano 17 °C. |

Salvare il modello non salva anche una bozza di profilo aperta non correlata. Salvare un preset non salva una bozza di programmazione non correlata. Ogni risorsa ha il proprio controllo di salvataggio.

<a id="2-winter-and-summer-with-one-set-of-times"></a>
## 2. Inverno ed estate con gli stessi orari

**Situazione:** un climatizzatore riscalda in inverno e raffresca in estate. Gli orari della casa restano gli stessi, ma obiettivi e azioni cambiano.

Crea **Giorno lavorativo** con blocchi alle 07:00 e 23:00. Crea questi preset e usa **Solo orari** collegando il lunedì del soggiorno in Default e nei due profili:

| Orario condiviso | Assegnazione Default | Assegnazione profilo Inverno | Assegnazione profilo Estate |
|---|---|---|---|
| 07:00 | Comfort abituale: Heat, 20 °C | Comfort inverno: Heat, 21 °C | Comfort estate: Cool, 25 °C |
| 23:00 | Off manuale | Notte inverno: Heat, 17 °C | Preset Off |

Per configurare un profilo, seleziona **Programmazioni dei profili**, crea il profilo e imposta il soggiorno su **Programmazione del profilo**. Seleziona il giorno, scegli **Giorno lavorativo → Solo orari** e configura le assegnazioni. Salva l’intero profilo. In Default, salva separatamente ogni giorno modificato.

Spostare l’orario mattutino del modello alle 07:30 sposta tutte e tre le programmazioni. Cambiare l’obiettivo proprio del modello non cambia queste assegnazioni. Modificare **Comfort inverno** influisce sui riferimenti a quel preset, incluso il profilo Inverno, ma non trasforma l’obiettivo di raffrescamento estivo in uno di riscaldamento.

Il profilo selezionato determina ancora quale settimana viene eseguita. Home Assistant può selezionare Inverno o Estate con le azioni esistenti dei profili; il modello non decide la stagione. Per esempio, dopo aver creato un profilo con identificatore per automazioni `summer`, questa azione lo seleziona:

```yaml
action: velair.activate_profile
data:
  profile_id: summer
```

Per tornare alle programmazioni Default salvate:

```yaml
action: velair.deactivate_profile
```

Usa l’**Identificatore per automazioni** mostrato nel profilo, che può essere diverso dal nome visualizzato. Consulta [Profili climatici](climate-profiles.it.md) per modalità e regole di attivazione.

Per il clima mite, un dispositivo controllato localmente può avere un profilo separato con comportamento **Pausa → Spegni il dispositivo climatico**. Un’automazione può selezionarlo. È diverso da un blocco Off programmato: una zona in pausa non riprende a seguire i blocchi successivi. La pausa non è disponibile per le zone controllate esternamente; si applicano le azioni supportate dalla programmazione del loro fornitore.

Soglie delle previsioni, verifiche periodiche della temperatura esterna, notifiche delle finestre e ritardi dello spegnimento serale restano decisioni delle automazioni Home Assistant. Preset e collegamenti non aggiungono queste regole a Velair.

<a id="3-copy-a-day-then-customize-a-guest-room"></a>
## 3. Copiare un giorno e personalizzare la camera degli ospiti

**Situazione:** la camera degli ospiti deve partire da Giorno feriale casa, ma gli ospiti desiderano il riscaldamento per la colazione alle 08:00 anziché alle 07:00.

In Programmazioni, seleziona camera degli ospiti e giorno. Mantieni **Origine programmazione → Programmazione propria**, poi scegli **Giorno feriale casa** nel selettore separato **Modelli** per copiarne i blocchi. Cambia l’orario mattutino alle 08:00 e salva. Il giorno è indipendente dal modello. Spostare in seguito Giorno feriale casa alle 07:30 non sposta il blocco delle 08:00 della camera.

Se il blocco copiato usa **Comfort riscaldamento**, continua a fare riferimento a quel preset. Modificare Comfort riscaldamento a 21.5 °C cambia quindi anche l’obiettivo della camera degli ospiti. Essere indipendenti dal modello non significa esserlo dal preset.

Per mantenere la camera a 20 °C indipendentemente dalle future modifiche del preset, apri le impostazioni aggiuntive del blocco, scegli **Nessun preset Velair**, poi imposta manualmente 20 °C e salva. Rimuovere prima il preset conserva le impostazioni effettive; non svuota il blocco.

Clonare un giorno è diverso dal copiare i blocchi dalla libreria: conserva il collegamento del giorno di origine al modello. Per esempio, clona a martedì un lunedì che segue **Giorno feriale casa → Orari e impostazioni**. Entrambi seguono ora Giorno feriale casa; spostarne l’inizio dalle 07:00 alle 07:30 aggiorna entrambi.

Con **Solo orari**, la copia conserva lo stesso collegamento dei soli orari e copia le assegnazioni, compresi i preset. Puoi poi modificare le assegnazioni del martedì senza cambiare quelle del lunedì, mentre entrambi continuano a seguire gli orari del modello.

Puoi anche clonare lunedì su lunedì di un altro termostato. La destinazione conserva lo stesso tipo di collegamento se compatibile; gli altri giorni mantengono la configurazione esistente. Se un preset Heat condiviso non è utilizzabile da un’unità solo raffrescamento, la clonazione viene rifiutata anziché eliminare silenziosamente il collegamento. Default verifica insieme tutte le destinazioni. Nei profili, la clonazione aggiorna solo la bozza verificata finché non salvi il profilo.

Per un martedì indipendente, clonalo e scegli **Scollega** prima di salvare. Il giorno conserva impostazioni attuali e preset dinamici ma smette di seguire il modello. **Copia blocchi** della libreria resta una copia indipendente.

<a id="4-change-a-link-without-losing-the-wrong-draft"></a>
## 4. Cambiare un collegamento senza perdere la bozza desiderata

**Situazione:** lunedì è collegato a Giorno feriale casa. Vuoi personalizzare questo lunedì lasciando invariati gli altri giorni collegati.

| Scelta | Risultato nella bozza |
|---|---|
| Passare da **Orari e impostazioni** a **Solo orari** | Conservare le impostazioni attuali del modello come assegnazioni proprie del giorno, compresi i preset. Gli orari seguono ancora il modello. |
| Passare da **Solo orari** a **Orari e impostazioni** | Confermare la sostituzione delle assegnazioni con le impostazioni del modello. Annullare conserva selezione e bozza originali. |
| Scegliere un altro modello | Confermare la sostituzione della bozza. Annullare mantiene modello e impostazioni attuali. |
| Usare **Scollega** | Conservare orari e impostazioni attuali della bozza come giorno indipendente, mantenendo i preset. |
| Scegliere **Programmazione propria** | Confermare lo scarto delle modifiche del giorno e ripristinare il giorno salvato come bozza indipendente. |

Queste operazioni non salvano automaticamente. Salva il giorno Default o l’intero profilo quando sei pronto.

Per una differenza concreta, supponiamo che il lunedì salvato abbia un blocco indipendente alle 09:00 a 20 °C. Selezioni un modello che inizia alle 08:00 e modifichi la sua assegnazione dei soli orari a 21 °C senza salvare:

- **Scollega** conserva 08:00 e 21 °C nella bozza indipendente.
- **Programmazione propria** ripristina 09:00 e 20 °C salvati.

Se il lunedì salvato era già collegato, Programmazione propria usa i valori attuali di quel giorno salvato e li rende indipendenti. Non recupera una vecchia programmazione manuale precedente alla creazione del collegamento.

Rendere indipendente un giorno usa valori adattati al suo termostato. Per esempio, un obiettivo manuale condiviso di 18.3 °C può comparire come 18.5 °C su un dispositivo con passi di 0.5 °C. Dopo Scollega, l’obiettivo manuale resta 18.5 °C. Un blocco con preset mantiene invece il riferimento al preset. Nessuna operazione cambia la libreria condivisa.

<a id="5-add-a-lunchtime-block-to-a-shared-template"></a>
## 5. Aggiungere un blocco di mezzogiorno a un modello condiviso

**Situazione:** Giorno lavorativo ha già blocchi alle 07:00 e 23:00. Aggiungi 12:00 con Heat manuale a 18 °C. Stanze e profili diversi usano questo modello.

<a id="a-compatible-hours-only-destination"></a>
### Una destinazione compatibile dei soli orari

Se la destinazione supporta Heat a 18 °C, Velair propone di copiare quella configurazione nella nuova assegnazione delle 12:00. Controllala in **Giorni collegati** e salva il modello.

Resta condiviso solo l’orario. Cambiare in seguito l’obiettivo del modello delle 12:00 a 19 °C non modifica questa assegnazione dei soli orari. Se invece il nuovo blocco richiama un preset compatibile, l’assegnazione conserva quel riferimento e le successive modifiche del preset continuano a propagarsi.

<a id="an-incompatible-hours-only-destination"></a>
### Una destinazione incompatibile dei soli orari

Supponiamo che un altro termostato abbia un minimo di 19 °C. La sua assegnazione esistente delle 07:00 usa il preset valido **Comfort ufficio: Heat, 21 °C**. Il nuovo obiettivo di 18 °C è incompatibile, quindi Velair cerca un’assegnazione salvata nel giorno di quello stesso termostato:

1. Un blocco esattamente alle 12:00, se esisteva prima della modifica.
2. Blocchi precedenti, partendo dal più vicino.
3. Blocchi successivi, partendo dal più vicino.

Qui propone Comfort ufficio dalle 07:00. Giorni collegati identifica la scelta alternativa e la sua origine. Puoi accettarla o scegliere un’altra assegnazione valida prima di salvare. Il preset resta dinamico.

Un blocco di origine incompatibile viene saltato. Un blocco spostato o eliminato in questa modifica può ancora fornire l’assegnazione salvata precedente; un altro appena aggiunto non può. Se non esiste un’origine valida, Giorni collegati mostra un’assegnazione in attesa. Completala manualmente o scegli un preset compatibile; nulla viene salvato mentre è in attesa.

<a id="a-completely-linked-destination"></a>
### Una destinazione completamente collegata

Per **Orari e impostazioni**, il nuovo blocco delle 12:00 proviene direttamente dal modello. Non si ricorre alle vecchie impostazioni della stanza.

Se l’obiettivo di 18 °C del modello è incompatibile con una qualsiasi destinazione completa, l’intero salvataggio è bloccato. Cambia l’obiettivo con uno supportato da tutte quelle destinazioni, oppure cambia prima la destinazione interessata in Solo orari o giorno indipendente e salva.

La verifica include profili inattivi e programmazioni Default nascoste da un altro profilo attivo. Fino al completamento di un salvataggio valido del modello, tutte le destinazioni salvate mantengono la programmazione precedente.

<a id="move-or-remove-an-existing-block"></a>
### Spostare o rimuovere un blocco esistente

Spostare 07:00 a 07:30 conserva l’assegnazione mattutina di ogni destinazione dei soli orari; non la sostituisce con l’obiettivo del modello. Le destinazioni complete seguono il modello aggiornato. Rimuovere un blocco elimina nello stesso salvataggio le assegnazioni corrispondenti dei soli orari e il blocco del collegamento completo.

Un blocco ha un’identità stabile. Eliminarlo e aggiungerne un altro allo stesso orario crea un nuovo blocco; non viene trattato come spostamento dell’originale.

<a id="6-understand-uses-before-editing-or-deleting"></a>
## 6. Comprendere gli utilizzi prima di modificare o eliminare

**Situazione:** il preset Comfort riscaldamento è selezionato in:

- Un blocco di Giorno feriale casa.
- Un blocco Default indipendente del venerdì.
- Un’assegnazione dei soli orari in un profilo Inverno.

Il preset ha **tre riferimenti diretti**. Se altri due giorni usano Giorno feriale casa con Orari e impostazioni, ne ereditano il preset tramite il modello. Compaiono come destinazioni ulteriormente interessate, senza portare il conteggio dei riferimenti diretti a cinque.

Modificare il preset influisce su tutti quei riferimenti e sulle destinazioni che lo ereditano. Devono essere tutti compatibili prima di poter salvare. Un preset richiamato da un modello non può essere eliminato anche se quel modello non ha giorni collegati: prima rimuovi il riferimento nel modello.

Il conteggio **Giorni collegati** di un modello significa altro. Collegare lunedì e martedì crea due giorni collegati. Copiarlo in venerdì non crea un collegamento e non aumenta quel conteggio. Le copie non sono tracciate come utilizzi del modello.

Elimina un modello solo dopo aver scollegato tutti i suoi giorni salvati in Default e nei profili. Modificarne nome, orari o impostazioni ne mantiene la posizione nella libreria.

<a id="7-what-happens-while-a-schedule-is-active"></a>
## 7. Cosa succede mentre una programmazione è attiva?

Supponiamo che il soggiorno segua automaticamente Comfort riscaldamento a 21 °C. Salvare il preset a 21.5 °C aggiorna l’intento attivo. Il dispositivo fisico deve ancora accettare l’azione; il salvataggio non dimostra che la stanza si sia riscaldata.

Se il soggiorno ha un incremento a 23 °C, modificare il preset non lo annulla. Alla scadenza, Velair usa la configurazione attuale della programmazione. Anche pause e regolazione manuale mantengono la priorità. Attivare un profilo è un’azione separata: annulla gli incrementi nelle zone interessate, mentre pause globali e di zona restano prioritarie. Consulta [Regole di controllo dei profili](climate-profiles.it.md).

Se Inverno fornisce una settimana propria, modificare Default non sostituisce la programmazione attiva di Inverno. Tornare a Default usa le ultime impostazioni salvate. Un profilo configurato su **Programmazione predefinita** eredita collegamenti e preset Default invece di salvarne un’altra copia.

Un giorno vuoto non spegne implicitamente il dispositivo. Un blocco notturno del venerdì alle 23:00 continua in un sabato vuoto fino all’avvio di un altro blocco. Aggiungi un blocco Off esplicito se è l’azione desiderata.

<a id="8-device-options-cooling-and-temperature-ranges"></a>
## 8. Opzioni del dispositivo, raffrescamento e intervalli di temperatura

**Situazione:** un climatizzatore della camera espone un preset nativo `sleep` e una ventilazione `quiet`. Vuoi entrambi alle 23:00 con raffrescamento a 25 °C.

Crea un preset Velair **Notte estiva camera** con Cool, 25 °C, preset del dispositivo `sleep` e modalità ventilazione `quiet`. Selezionalo nel blocco delle 23:00 tramite le impostazioni aggiuntive. **Preset Velair** è la configurazione condivisa di Velair; **Preset del dispositivo** è un comando al suo interno. Il riepilogo mostra insieme obiettivo, modalità ed entrambe le opzioni.

In una destinazione che supporta quelle opzioni, il contatore delle impostazioni indica tre: un collegamento Velair più due opzioni. Temperatura e modalità HVAC non aumentano il contatore. Un’opzione omessa non viene ripristinata: rimuovere `quiet` dalla configurazione condivisa interrompe l’invio del comando di ventilazione anziché impostare un altro valore.

Per un’altra routine, crea **Solo ventilazione silenziosa** con la sola opzione di ventilazione e senza obiettivo o modalità HVAC. Un riferimento programmato invia la ventilazione senza richiedere un cambio di modalità HVAC o accendere un dispositivo spento. Non ha obiettivo per precondizionamento o Room Assist. Copiarlo su un termostato senza controllo della ventilazione produrrebbe un’azione vuota, quindi viene rifiutato.

Un dispositivo con supporto nativo degli intervalli Heat/cool può invece usare **Intervallo casa** con Heat/cool, limite inferiore 19 °C e superiore 24 °C. Entrambi compaiono nelle colonne obiettivo e provengono dallo stesso preset. Cambiare il superiore a 25 °C aggiorna i riferimenti conservando l’inferiore. Un termostato a obiettivo singolo non può usare questo preset; Velair non inventa una temperatura singola né un limite mancante. Usa un preset compatibile separato.

I preset di sola modalità selezionano una modalità HVAC senza temperatura o opzioni aggiuntive. Un preset Off richiede lo spegnimento e non ha obiettivo o opzioni extra. Queste azioni mantengono il significato esistente tramite un modello; condividerle non aggiunge controllo continuo della temperatura.

<a id="troubleshooting-shared-configurations"></a>
## Risolvere problemi delle configurazioni condivise

| Cosa vedi | Cosa verificare o fare |
|---|---|
| Un orario è bloccato | Il giorno segue gli orari del modello. Modifica il modello o usa Scollega. |
| Anche modalità e obiettivo sono bloccati | Il giorno segue l’intero modello oppure il blocco usa un preset Velair. Modifica l’origine condivisa. |
| Un giorno copiato cambia ancora temperatura | Ha conservato un riferimento al preset. Scegli Nessun preset Velair per rendere manuale quel blocco. |
| La modifica di un modello fallisce anche se la stanza attiva sembra valida | Controlla Giorni collegati per profili inattivi, giorni Default nascosti e altri termostati. |
| Una nuova fascia dei soli orari è in attesa | Scegli una configurazione manuale o un preset valido in Giorni collegati. |
| Resta un errore del fornitore relativo all’intera settimana | Risolvi griglia degli orari, supporto dell’azione o limite dei blocchi. Scegliere un blocco da cui copiare non risolve questi vincoli. |
| La verifica di compatibilità riesce ma il salvataggio fallisce | La verifica provava un termostato. Il salvataggio verifica tutte le destinazioni effettivamente salvate. |
| Un pulsante di eliminazione è disabilitato | Rimuovi prima tutti i riferimenti salvati; i modelli possono fare riferimento a preset senza giorni collegati. |
| Un’altra sessione ha cambiato la configurazione | Aggiorna la configurazione e controlla la bozza conservata prima di riprovare. |
| Un’anteprima fallisce o è ancora in caricamento | Mantieni la bozza e riprova. Velair non ipotizza impostazioni o rimuove riferimenti per consentire il salvataggio. |

Le impostazioni facoltative non supportate da una destinazione possono essere filtrate dalla configurazione effettiva. Obiettivi fuori intervallo e modalità incompatibili vengono rifiutati. Un’azione di sole opzioni non può diventare vuota dopo il filtro. I controller esterni impongono ulteriori vincoli; pubblicare una programmazione non ripiega mai sull’esecuzione climatica locale.

<a id="back-up-the-whole-setup"></a>
## Eseguire il backup dell’intera configurazione

Usa l’esportazione Velair anziché copiare solo un giorno risolto visibile. Le esportazioni modello 16 conservano entrambi i tipi di collegamento, preset e identità dei blocchi. Esportare programmazioni o profili include i modelli e i preset da cui dipendono; la schermata mostra le sezioni aggiunte automaticamente.

All’importazione, controlla le sostituzioni prima di confermare. Sostituire una risorsa condivisa può interessare anche utilizzi locali esistenti. La configurazione combinata deve essere valida; nuovi profili non vengono attivati solo perché importati. I backup precedenti restano importabili, mentre versioni Velair precedenti non possono importare un’esportazione modello 16. Consulta [Portabilità](usage.it.md#portability).
