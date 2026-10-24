<a id="external-changes-and-manual-adjustment"></a>
# Modifiche esterne e regolazione manuale
<!-- velair-docs:start -->
Traduzioni: [Originale in inglese](manual-control.md) · [Español](manual-control.es.md) · [Français](manual-control.fr.md) · [Deutsch](manual-control.de.md) · [Italiano](manual-control.it.md) · [Nederlands](manual-control.nl.md) · [Polski](manual-control.pl.md) · [Português (Brasil)](manual-control.pt-br.md) · [Português (Portugal)](manual-control.pt-pt.md) · [Русский](manual-control.ru.md) · [Stato delle traduzioni](../translation-status.md)

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

Velair può riconoscere quando la modalità HVAC o la temperatura obiettivo di un’entità `climate.*` gestita cambia senza corrispondere a un comando climatico inviato da Velair. Per ogni dispositivo scegli se mantenere il controllo automatico o cederlo a quella modifica esterna tramite la regolazione manuale.

Una regolazione esterna può provenire da:

- la scheda climatica standard di Home Assistant;
- un termostato fisico o telecomando IR la cui integrazione comunica il nuovo stato;
- un’applicazione del produttore la cui integrazione aggiorna Home Assistant;
- uno script o un’automazione Home Assistant che chiama direttamente l’entità climatica;
- qualsiasi altra fonte che cambia l’entità senza passare da Velair.

Velair chiama lo stato di controllo ceduto **Regolazione manuale**. «Manuale» descrive chi controlla attualmente un dispositivo; non afferma che una persona abbia effettuato la modifica.

<a id="the-two-independent-questions"></a>
## Due domande indipendenti

Velair mantiene sempre separati questi concetti:

| Concetto | Ambito | Significato |
| --- | --- | --- |
| Programmazione automatica | Un dispositivo gestito | Velair può applicare la programmazione effettiva per questo dispositivo. |
| Regolazione manuale | Un dispositivo gestito | Una temperatura impostata o modalità HVAC esterna ha temporaneamente la precedenza. |
| Modalità Velair **Manuale** | L’intero insieme dei profili attivi | I profili sono stati scelti direttamente anziché attraverso una modalità personalizzata salvata. |
| Incremento | Un dispositivo | Velair applica intenzionalmente un obiettivo temporaneo. |
| Pausa di zona | Un dispositivo | Uno o più motivi indipendenti impediscono l’applicazione della programmazione, eventualmente spegnendo il dispositivo. |
| Pausa globale o arresto | Tutti i dispositivi | Il pianificatore è in pausa o disabilitato globalmente. |

Questi stati possono coesistere. Per esempio, la modalità Velair **Manuale** può selezionare il profilo `Sleep` mentre `climate.living_room` è in **Regolazione manuale**. Il profilo resta la configurazione di riferimento della programmazione, ma quel singolo dispositivo conserva l’impostazione esterna fino alla fine della regolazione manuale.

<a id="what-velair-observes"></a>
## Cosa osserva Velair

Velair osserva questi campi di controllo sui dispositivi gestiti:

- `hvac_mode`, rappresentato dallo stato dell’entità climatica, inclusi `off`, `heat`, `cool`, `auto` e `heat_cool`;
- `temperature` per un obiettivo singolo;
- `target_temp_low` e `target_temp_high` per un intervallo nativo.

Velair non entra in regolazione manuale se cambiano solo i seguenti valori:

- `current_temperature` o `hvac_action`;
- letture di umidità;
- disponibilità;
- opzioni di ventilazione, preset, oscillazione o umidità obiettivo;
- attributi delle capacità, come temperatura minima o modalità supportate.

Per esempio, passare un termostato da `cool` a `24 °C` a `cool` a `23 °C` è una modifica rilevata dell’obiettivo. Una stanza che si riscalda da `24 °C` a `25 °C` con obiettivo invariato non lo è.

Vengono monitorati solo i dispositivi selezionati nella configurazione dell’integrazione Velair. Gli stati iniziali all’avvio e le transizioni da o verso `unknown` o `unavailable` sono ignorati.

<a id="how-velair-recognizes-its-own-commands"></a>
## Come Velair riconosce i propri comandi

Tutti i comandi climatici di Velair passano da un unico adattatore interno dei servizi climatici. Prima di ogni chiamata al servizio Home Assistant, Velair registra:

- l’entità gestita;
- i campi di controllo e i valori attesi;
- un `Context` Home Assistant della chiamata;
- una breve scadenza presente solo in esecuzione.

Quando l’entità cambia, Velair correla ogni campo modificato con quelle aspettative, includendo `target_temp_step` dichiarato dal dispositivo. Lo fa per campo: se un aggiornamento contiene una temperatura di Velair e una modalità HVAC non correlata, solo la temperatura viene classificata come appartenente a Velair.

Alcuni dispositivi comunicano più valori elaborando un comando. Possono tornare brevemente a un vecchio obiettivo, pubblicarne uno intermedio o comunicare modalità e temperatura fuori ordine. Velair conserva un breve periodo limitato di assestamento solo per i campi modificati, così quegli aggiornamenti non creano erroneamente una regolazione manuale. Il periodo non ricomincia all’arrivo di una conferma; viene finalizzato quando termina l’intera sequenza di servizi Home Assistant. Una modifica chiaramente originata da un utente Home Assistant, o da un altro script o automazione identificabile, resta esterna; le modifiche dopo l’assestamento vengono gestite normalmente.

Quando un aggiornamento anonimo durante l’assestamento non può essere distinto affidabilmente dalla convergenza del dispositivo, Velair mantiene prudentemente il controllo automatico. Evita così di trasformare un proprio comando rifiutato o ritardato in una falsa regolazione manuale. L’assestamento esiste solo in esecuzione ed è cancellato al riavvio. Se il dispositivo differisce ancora dal valore richiesto alla fine dell’assestamento, Velair mantiene il controllo automatico e registra un avviso di assestamento. La successiva istantanea aggiornata di Diagnostica espone l’avviso; il rapporto include valori attesi e osservati. Velair non riprova ciecamente il comando né trasforma la discordanza in una regolazione manuale differita.

Il registro delle aspettative è limitato, scade automaticamente, non viene mai salvato e non interroga periodicamente i dispositivi. Una fonte non deve necessariamente conservare il `Context` Home Assistant per permettere la correlazione, anche se conservarlo rende più precisa la ricerca delle corrispondenze.

Qualsiasi campo di controllo osservato non correlabile a un comando Velair è classificato come non-Velair. È attribuzione, non identità: Velair non afferma di sapere se la causa sia una persona, un telecomando, un’automazione, un servizio del produttore o il firmware.

<a id="choose-a-policy"></a>
## Scegliere un criterio

Apri **Impostazioni**, trova il dispositivo gestito e usa **Modifiche esterne**. Il criterio è salvato dal backend per quel dispositivo ed è incluso nei dati portabili della zona. Si applica dalla prossima modifica esterna; cambiarlo non modifica né termina una regolazione manuale già attiva.

<a id="keep-automatic"></a>
### Mantieni automatico

Valore interno: `keep_automatic`.

È il valore predefinito, anche per le configurazioni precedenti alle regolazioni esterne. Velair segnala la modifica esterna, mantiene la programmazione automatica e ricalcola subito l’intento di controllo attuale. Quando un intento controlla il dispositivo, lo riapplica tramite il normale percorso serializzato di invio. Può essere una programmazione Default o di profilo, un incremento, un obiettivo attivo di precondizionamento, Room Assist, `off`, un obiettivo singolo o un intervallo nativo.

Pause e condizioni di abilitazione del pianificatore non vengono aggirate. Una pausa con azione `none`, una pausa globale, una zona disabilitata, un pianificatore arrestato o l’assenza di un obiettivo attuale non inviano nulla. Una pausa di zona o di profilo con `turn_off` riafferma `off`.

<a id="manual-until-the-next-schedule-block"></a>
### Manuale fino al prossimo blocco

Valore interno: `until_next_block`.

Velair conserva lo stato esterno fino all’inizio del prossimo blocco effettivo per quel dispositivo, poi torna alla programmazione automatica e applica l’intento di controllo valido in quel momento.

Il confine viene calcolato all’inizio della regolazione manuale. Un’altra modifica esterna nella stessa sessione aggiorna lo stato conservato ma non sposta il confine. Se non esiste un blocco effettivo futuro, non c’è scadenza automatica; usa **Riprendi automatico** quando vuoi.

Il limite del prossimo blocco usa l’orario programmato del blocco, incluso `Off`, anziché un avvio previsto di precondizionamento. Per esempio, una regolazione alle `18:05` con `Off` alle `19:00` e riscaldamento alle `20:00` termina alle `19:00`, anche se la previsione del riscaldamento inizierebbe prima.

<a id="manual-for-a-duration"></a>
### Manuale per una durata

Valore interno: `for_duration`.

Velair conserva lo stato esterno per il numero di minuti configurato. La durata iniziale è 120 minuti e l’intervallo consentito va da 1 a 10 080 minuti (sette giorni). I valori già salvati, inclusi 60 minuti, restano invariati. Ogni nuova modifica esterna rilevata riavvia la durata da quella modifica usando la durata salvata della sessione attiva, anche se nel frattempo le impostazioni sono cambiate. L’evento associato segnala il criterio effettivo della sessione, non il valore predefinito più recente.

<a id="manual-until-resumed"></a>
### Manuale fino alla ripresa

Valore interno: `until_resumed`.

Velair conserva lo stato esterno senza scadenza. L’utente o un’automazione deve riprendere esplicitamente la programmazione automatica.

<a id="what-happens-when-manual-adjustment-starts"></a>
## Cosa succede all’avvio della regolazione manuale

Per ogni modifica esterna idonea che usa uno dei tre criteri manuali, Velair esegue una sola transizione serializzata:

1. Acquisisce modalità HVAC completa e obiettivo singolo o intervallo nativo dall’evento di cambio di stato.
2. Salva un motivo riservato di regolazione manuale per la zona.
3. Termina qualsiasi incremento attivo senza ripristinare l’incremento o la programmazione precedente.
4. Fa cedere il controllo a Room Assist senza ripristinarne la correzione programmata precedente.
5. Conserva, o se necessario riapplica, lo stato esterno acquisito.
6. La panoramica seleziona **Regolazione manuale** e mantiene disponibile **Programmazione automatica**.

Il criterio entra in regolazione manuale solo mentre la programmazione automatica globale è attiva, la zona è abilitata, il profilo attivo non la sta già mettendo in pausa e non esiste una pausa di zona indipendente diversa dall’incremento. L’evento osservativo `external_climate_change_detected` viene comunque emesso quando queste condizioni impediscono l’ingresso. Un incremento attivo è l’eccezione: la modifica esterna lo sostituisce come descritto sotto.

La matrice seguente descrive il risultato esatto quando si osserva una modifica non-Velair con un criterio che altrimenti entrerebbe in regolazione manuale:

| Stato precedente | Evento | Entra in regolazione manuale | Azione climatica immediata |
| --- | --- | --- | --- |
| Nessuna pausa o incremento | Emesso | Sì | Conservare modalità e obiettivo esterni completi. |
| Pausa di zona indipendente, azione `none` | Emesso | No | Non inviare nulla; la pausa continua a lasciare il controllo. |
| Pausa di zona indipendente, azione `turn_off` | Emesso | No | Riaffermare `off`; l’accensione esterna non può aggirare la pausa. |
| Pausa di profilo attiva, incluso `turn_off` | Emesso | No | Non inviare nulla in questo percorso di rilevamento; non ripetere l’azione del profilo solo per l’osservazione. |

Un pianificatore globalmente in pausa o una zona disabilitata segue lo stesso schema osservativo: emette l’evento esterno, non crea una regolazione manuale e non invia un nuovo obiettivo della programmazione da questo percorso di rilevamento.

Durante la regolazione manuale, Velair continua a calcolare la programmazione effettiva Default, di profilo o di modalità, ma non la invia a quel dispositivo. Gli altri dispositivi gestiti continuano normalmente.

Velair non effettua automaticamente queste operazioni:

- creare un incremento;
- cambiare profilo o modalità Velair;
- dedurre chi ha effettuato la regolazione;
- copiare la regolazione nella programmazione;
- cambiare il criterio di un altro dispositivo;
- rimuovere pause di zona indipendenti;
- attendere che la stanza raggiunga la temperatura richiesta.

<a id="what-happens-when-automatic-scheduling-resumes"></a>
## Cosa succede alla ripresa della programmazione automatica

La regolazione manuale può terminare per scadenza della durata, arrivo del prossimo blocco, pressione del pulsante della panoramica o chiamata a `velair.resume_automatic_control`.

Velair rimuove solo il proprio motivo riservato di regolazione manuale. Poi risolve l’intento di controllo valido in quel momento:

- una programmazione di profilo quando un profilo attivo controlla la zona;
- la programmazione Default quando nessun profilo attivo la controlla o il profilo delega la zona a Default;
- una pausa di profilo, compresa `turn_off`;
- qualsiasi altra pausa indipendente o stato globale del pianificatore.

Velair non ripristina il blocco attivo all’inizio della regolazione manuale. La distinzione conta quando profilo, modalità, programmazione, pausa o orario sono cambiati durante la cessione del controllo.

Se esiste ancora una pausa indipendente, la zona resta in pausa. Se la sua azione effettiva è `turn_off`, lo spegnimento resta prioritario. Terminare la regolazione manuale non equivale quindi a rimuovere ogni motivo di pausa.

<a id="resume-from-off-when-the-block-says-keep-current-mode"></a>
### Ripresa da `off` quando il blocco mantiene la modalità attuale

**Solo temperatura** è una scelta distinta per il blocco. Durante questo blocco, un cambio esterno di modalità HVAC resta sotto controllo esterno e da solo non crea una regolazione manuale. Le modifiche esterne della temperatura obiettivo seguono ancora la politica configurata. Una pausa o una regolazione manuale interrompe comunque l’invio dell’orario; la ripresa applica il blocco attuale senza accendere un dispositivo spento. Questo vale anche quando un’automazione per le finestre riprende la zona. Un Incremento esplicito o un blocco successivo con modalità HVAC esplicita può comunque accenderlo.

**Mantieni la modalità corrente** significa che il blocco non fornisce una modalità HVAC. Per un blocco con temperatura obiettivo, alla ripresa Velair segue la normale regola di invio:

- se il dispositivo è già acceso, mantiene la modalità attuale e applica l’obiettivo se è accettato da quella modalità; altrimenti l’invio fallisce senza cambiare modalità;
- se è `off`, sceglie la prima modalità compatibile supportata dichiarata diversa da `off`, poi applica l’obiettivo.

Per un dispositivo solo riscaldamento che dichiara `[off, heat]`, un blocco che mantiene la modalità a `21 °C` riprende come `heat`, `21 °C`. Per uno solo raffrescamento con `[off, cool]`, riprende come `cool`, `21 °C`. Un dispositivo reversibile può dichiarare più modalità compatibili; Velair usa l’ordine dichiarato e non deduce riscaldamento o raffrescamento da stagione, geografia o obiettivo numerico. Imposta una modalità HVAC esplicita nel blocco quando la scelta deve essere deterministica.

Per un’entità che accetta solo intervalli, le modalità operative compatibili sono le modalità `heat`, `cool`, `auto` e `heat_cool` dichiarate. Mantieni da Spento usa la prima nell’ordine dichiarato. Le entità che supportano entrambi i formati usano la [politica salvata del formato per modalità](usage.it.md#target-format-by-climate-and-mode) per determinare le modalità compatibili, mantenendo la preferenza per `heat_cool` quando riprendono un intervallo compatibile da Spento. Solo temperatura può scrivere entrambi i limiti a dispositivo spento se sono dichiarati supporto agli intervalli e una modalità compatibile; non lo attiva mai per permettere la scrittura.

Per un blocco di sole opzioni, la ripresa applica solo i controlli climatici selezionati. Non invia una temperatura né accende un dispositivo spento.

<a id="complete-real-world-examples"></a>
## Esempi completi di uso reale

<a id="keep-automatic-reject-a-climate-card-setpoint-change"></a>
### Mantieni automatico: rifiutare una modifica dalla scheda climatica

Configurazione:

```text
Living-room policy: Keep automatic
Current authoritative block: heat at 21 °C
```

| Ora | Azione | Risultato |
| --- | --- | --- |
| 18:00 | Velair applica `heat`, `21 °C`. | Programmazione automatica |
| 18:20 | Un utente seleziona `23 °C` nella scheda climatica Home Assistant. | Velair emette `external_climate_change_detected` con `policy: keep_automatic`. |
| 18:20 | Velair risolve il blocco ancora attuale. | Riapplica `heat`, `21 °C`; non crea regolazione manuale né `zone_control_changed`. |

La stessa regola vale per raffrescamento, `off`, intervalli nativi `heat_cool`, incremento, precondizionamento e Room Assist: Velair riapplica l’intento prioritario al momento del rilevamento.

Gli esempi usano Celsius, ma il comportamento è identico in Fahrenheit.

<a id="home-assistant-card-keep-the-change-until-bedtime"></a>
### Scheda Home Assistant: conservare la modifica fino alla notte

Configurazione:

```text
Living room policy: Manual until the next schedule block
18:00 schedule block: cool at 24 °C
22:00 schedule block: cool at 25 °C
```

Sequenza:

| Ora | Azione | Risultato sul dispositivo | Controllo Velair |
| --- | --- | --- | --- |
| 18:00 | Velair applica il blocco. | `cool`, `24 °C` | Programmazione automatica |
| 19:15 | Un utente seleziona `22 °C` nella scheda HA. | `cool`, `22 °C` | Regolazione manuale fino alle 22:00 |
| 20:00 | Room Assist riceve una nuova lettura ambiente. | Ancora `22 °C`; nessuna correzione assistita. | Regolazione manuale |
| 22:00 | Inizia il prossimo blocco effettivo. | Velair applica `cool`, `25 °C`. | Programmazione automatica |

`22 °C` viene rispettato come istruzione temporanea. Non viene scritto in nessuno dei blocchi.

<a id="ir-remote-turn-on-an-ac-that-the-schedule-had-turned-off"></a>
### Telecomando IR: accendere un climatizzatore spento dalla programmazione

Configurazione:

```text
Bedroom policy: Manual until resumed
Current authoritative block: Off
```

Sequenza:

| Ora | Azione | Risultato sul dispositivo | Controllo Velair |
| --- | --- | --- | --- |
| 13:00 | Il blocco Velair tiene spenta l’unità. | `off` | Programmazione automatica |
| 14:10 | Una persona usa il telecomando: `cool`, `23 °C`. | L’integrazione comunica `cool`, `23 °C`. | Regolazione manuale |
| 16:00 | Il piano programmato è ancora Off. | Resta `cool`, `23 °C`. | Regolazione manuale |
| 17:30 | L’utente preme **Riprendi automatico**. | Velair risolve il blocco Off ancora attuale e spegne l’unità. | Programmazione automatica |

Funziona solo se l’integrazione comunica a Home Assistant la modifica del telecomando. Un comando IR invisibile a Home Assistant non può essere rilevato.

<a id="a-60-minute-comfort-adjustment-changed-again"></a>
### Una regolazione di comfort di 60 minuti, modificata di nuovo

Configurazione: `for_duration`, 60 minuti.

| Ora | Azione | Risultato |
| --- | --- | --- |
| 09:00 | La programmazione applica `heat`, `20 °C`. | Programmazione automatica |
| 09:20 | L’utente sceglie `22 °C`. | La regolazione manuale scade alle 10:20. |
| 09:50 | L’utente sceglie `21 °C`. | Il dispositivo resta a `21 °C`; la scadenza riparte alle 10:50. |
| 10:50 | Nessun’altra modifica esterna. | Velair applica l’intento prioritario valido alle 10:50. |

<a id="repeated-change-with-next-block-policy"></a>
### Modifica ripetuta con il criterio del prossimo blocco

Configurazione: `until_next_block`; prossimo blocco alle 22:00.

| Ora | Azione | Risultato |
| --- | --- | --- |
| 19:15 | L’utente cambia `24 °C` in `22 °C`. | La regolazione manuale termina alle 22:00. |
| 20:30 | L’utente cambia `22 °C` in `23 °C`. | Il valore conservato diventa `23 °C`; la scadenza resta 22:00. |
| 22:00 | Inizia il prossimo blocco. | Velair torna automatico e applica il blocco. |

<a id="activate-a-profile-while-one-climate-is-manual"></a>
### Attivare un profilo mentre un dispositivo è manuale

Configurazione:

```text
Default living-room intent: cool at 24 °C
Sleep Profile living-room intent: cool at 25 °C
Manual policy: until resumed
```

| Ora | Azione | Soggiorno | Altre zone del profilo |
| --- | --- | --- | --- |
| 20:00 | L’utente imposta il soggiorno a `22 °C`. | Regolazione manuale a `22 °C` | Continuano normalmente |
| 21:00 | L’utente attiva `Sleep`. | Resta `22 °C`; `Sleep` diventa la configurazione di riferimento. | `Sleep` si applica subito dove non ci sono altre sostituzioni. |
| 21:30 | L’utente riprende il soggiorno. | Velair applica `Sleep`: `cool`, `25 °C`. | Invariate |

Selezionare una modalità Velair personalizzata funziona allo stesso modo: può cambiare l’insieme dei profili attivi ma non annulla la regolazione manuale della zona. Se selezioni direttamente i profili, la modalità può mostrare **Manuale** mentre la zona mostra **Regolazione manuale**: le etichette descrivono cose diverse.

<a id="activate-several-profiles-or-modes-while-manual"></a>
### Attivare più profili o modalità durante il controllo manuale

Supponiamo che lo stato esterno sia `heat`, `22 °C`. Mentre resta manuale, l’utente sceglie Home (`21 °C`), Away (`17 °C`) e poi Sleep (`18 °C`). Velair conserva sempre `22 °C`. Alla ripresa applica solo l’intento attuale Sleep a `18 °C`; non ripete Home o Away e non ripristina il vecchio obiettivo Default.

<a id="profile-pause-and-turn_off"></a>
### Pausa di profilo e `turn_off`

Se un profilo che mette in pausa la zona viene attivato mentre la regolazione manuale è già attiva, lo stato esterno resta fino alla sua fine. Alla ripresa:

- una pausa di profilo senza spegnimento non invia un nuovo obiettivo; la zona torna al controllo automatico ma resta governata dalla pausa del profilo;
- una pausa di profilo con `turn_off` spegne il dispositivo.

Se la pausa del profilo era già attiva prima della modifica esterna, Velair emette comunque `external_climate_change_detected` ma non entra in regolazione manuale. Quel percorso non ripete subito la pausa del profilo o la chiamata `turn_off`; segnala solo l’osservazione. Una modifica successiva del profilo, un’applicazione esplicita della programmazione o un’altra transizione del pianificatore risolve nuovamente il comportamento del profilo.

<a id="external-adjustment-during-a-boost"></a>
### Regolazione esterna durante un incremento

| Ora | Azione | Risultato |
| --- | --- | --- |
| 12:00 | Velair avvia un incremento `cool`, `20 °C` fino alle 13:00. | Incremento |
| 12:20 | L’utente cambia il dispositivo in `cool`, `23 °C`. | L’incremento termina senza ripristino; la regolazione manuale conserva `23 °C`. |
| 12:45 | L’utente riprende la programmazione automatica. | Velair risolve e applica la programmazione valida alle 12:45. |

Il vecchio incremento non riprende e la sua scadenza originale delle 13:00 non controlla più il dispositivo.

<a id="room-assist-without-a-control-fight"></a>
### Room Assist senza conflitti di controllo

Supponiamo che l’obiettivo di raffrescamento programmato sia `24 °C`, Room Assist abbia applicato temporaneamente `26 °C` e l’utente selezioni esternamente `23 °C`.

Velair acquisisce lo stato dell’evento prima che il lavoro Room Assist in coda possa sostituirlo, interrompe Room Assist per la zona senza ripristinare `24 °C` e conserva `23 °C`. Alla ripresa automatica, risolve la programmazione attuale e Room Assist può calcolare un nuovo obiettivo assistito dalle letture attuali.

<a id="native-heat_cool-range"></a>
### Intervallo nativo `heat_cool`

```text
Scheduled range: 20–25 °C
External range: 19–24 °C
Policy: until resumed
```

Velair rileva `target_temp_low` e `target_temp_high`, acquisisce lo stato completo `heat_cool` e conserva `19–24 °C` durante la regolazione manuale. Alla ripresa applica l’intero intervallo del blocco prioritario attuale. Non riduce mai l’intervallo a un obiettivo singolo.

La stessa acquisizione e ripristino della coppia completa si applica alle entità che accettano solo intervalli in Caldo, Freddo e Auto. Un attributo residuo `temperature` non sostituisce i due limiti. Se la coppia osservata è incompleta o non valida, Velair non inventa un obiettivo ripristinabile da quell’attributo scalare.

<a id="independent-window-pause-while-manual"></a>
### Pausa indipendente delle finestre durante il controllo manuale

Supponiamo che un dispositivo sia manuale a `23 °C`, poi un’automazione delle finestre chiami `velair.pause_zone` con `pause_id: window` e `action: turn_off`. L’azione combinata della pausa è spegnimento, quindi il dispositivo si spegne. Chiamare `velair.resume_automatic_control` rimuove solo la regolazione manuale; il motivo `window` resta e il dispositivo rimane spento. L’automazione deve rimuovere il proprio motivo con `velair.resume_zone`.

<a id="changing-the-policy-with-a-service"></a>
## Cambiare il criterio tramite un servizio

Tutti gli esempi seguenti usano la sintassi attuale delle azioni Home Assistant.

Mantenere Velair automatico e riapplicare il suo controllo attuale:

```yaml
action: velair.set_external_change_policy
data:
  entity_id: climate.living_room
  policy: keep_automatic
```

Conservare lo stato esterno fino al prossimo blocco:

```yaml
action: velair.set_external_change_policy
data:
  entity_id: climate.living_room
  policy: until_next_block
```

Conservarlo per 90 minuti:

```yaml
action: velair.set_external_change_policy
data:
  entity_id: climate.living_room
  policy: for_duration
  duration_minutes: 90
```

Conservarlo fino alla ripresa esplicita:

```yaml
action: velair.set_external_change_policy
data:
  entity_id: climate.living_room
  policy: until_resumed
```

`duration_minutes` viene usato da `for_duration`; resta salvato come durata della zona quando si seleziona un altro criterio. I servizi rifiutano entità non gestite, criteri sconosciuti e durate fuori da 1–10 080 minuti.

Cambiare questa impostazione mentre il dispositivo è già manuale influisce solo sulla prossima modifica esterna successiva alla sessione. La sessione attiva conserva criterio, durata, fonte e scadenza. Usa la panoramica o `velair.resume_automatic_control` per terminarla.

<a id="enter-manual-adjustment-explicitly"></a>
## Entrare esplicitamente in regolazione manuale

La panoramica mostra sempre **Controllo Velair** come **Programmazione automatica** o **Regolazione manuale** per ogni dispositivo gestito. Entrambe le scelte restano visibili in un controllo segmentato. Seleziona **Regolazione manuale** per acquisire modalità HVAC attuale e obiettivo singolo o intervallo completo. Normalmente usa criterio manuale e durata salvati in **Impostazioni > Modifiche esterne**. Se è salvato **Mantieni l'automatico**, questa azione esplicita usa **Manuale fino alla ripresa** senza cambiare il criterio esterno salvato. Seleziona **Programmazione automatica** per riprendere l’intento attuale di Velair. Selezionare la scelta già attiva non fa nulla.

Durante la regolazione manuale, la panoramica mostra criterio esatto di uscita e scadenza sotto il selettore e rappresenta l’obiettivo fisico singolo o intervallo mantenuto, non quello latente della programmazione. Quando Manuale non può iniziare, il segmento resta visibile con una spiegazione accessibile: dispositivo non disponibile o disabilitato, programmazione automatica arrestata, profilo attivo che mette in pausa o altra pausa di zona responsabile. È disabilitato anche durante una migrazione irrisolta dei dati termici, perché Velair mantiene immutabili configurazione e sessioni manuali fino alla fine della migrazione. Un incremento non blocca l’azione, perché viene sostituito dal mantenimento manuale.

L’azione equivalente usa anch’essa il criterio salvato e accetta solo `entity_id`:

```yaml
action: velair.enter_manual_adjustment
data:
  entity_id: climate.living_room
```

Per creare un mantenimento di 90 minuti, salva prima `for_duration` e `duration_minutes: 90` con `velair.set_external_change_policy`, poi chiama questa azione. Rifiuta dispositivi non gestiti, disabilitati, `unknown` o `unavailable` e quelli bloccati da arresto globale, pausa di profilo attiva o pausa indipendente. Un incremento attivo viene sostituito. Riscaldamento, raffrescamento, `off`, obiettivi singoli e intervalli nativi `heat_cool` vengono acquisiti attraverso lo stesso percorso serializzato.

<a id="resume-with-a-service"></a>
## Riprendere tramite un servizio

```yaml
action: velair.resume_automatic_control
data:
  entity_id: climate.living_room
```

Questa azione è idempotente: chiamarla per un dispositivo gestito già automatico non fa nulla. Rifiuta le entità non gestite.

Non usare l’ID interno riservato `velair.manual_adjustment` con `velair.pause_zone` o `velair.resume_zone`. Velair lo rifiuta affinché un unico meccanismo gestisca la regolazione manuale. Un generico `velair.resume_zone` non cancella la regolazione manuale.

<a id="automations-and-events"></a>
## Automazioni ed eventi

Tutti gli eventi Velair di esecuzione usano `event_type: velair_event`.

<a id="observe-every-external-control-change"></a>
### Osservare ogni modifica esterna dei controlli

Questo evento viene emesso quando almeno un campo osservato di modalità o obiettivo non può essere attribuito a Velair:

```yaml
event_type: velair_event
event_data:
  domain: velair
  event: external_climate_change_detected
  entity_id: climate.living_room
  changed_fields:
    - hvac_mode
    - temperature
  previous:
    hvac_mode: "off"
    temperature: 24
  current:
    hvac_mode: "cool"
    temperature: 23
  policy: keep_automatic
```

Per un intervallo nativo, `changed_fields`, `previous` e `current` usano `target_temp_low` e `target_temp_high` anziché `temperature`, quando applicabile. Compaiono solo i campi esterni; un campo correlato a un’azione Velair è omesso anche se arriva nello stesso aggiornamento di stato Home Assistant.

Esempio di automazione di notifica:

```yaml
alias: Notify when the living-room climate changes outside Velair
triggers:
  - trigger: event
    event_type: velair_event
    event_data:
      event: external_climate_change_detected
      entity_id: climate.living_room
actions:
  - action: notify.notify
    data:
      message: >-
        Living-room climate changed outside Velair:
        {{ trigger.event.data.changed_fields | join(', ') }}.
```

<a id="observe-entry-into-or-exit-from-manual-adjustment"></a>
### Osservare ingresso e uscita dalla regolazione manuale

Dati di ingresso:

```yaml
event_type: velair_event
event_data:
  domain: velair
  event: zone_control_changed
  entity_id: climate.living_room
  control_mode: manual
  previous_control_mode: automatic
  policy: for_duration
  started_at: "2026-08-20T18:00:00+02:00"
  until: "2026-08-20T19:00:00+02:00"
```

Per `until_resumed`, `until` è assente. Dati di uscita:

```yaml
event_type: velair_event
event_data:
  domain: velair
  event: zone_control_changed
  entity_id: climate.living_room
  control_mode: automatic
  previous_control_mode: manual
  reason: resumed
```

Una scadenza automatica usa `reason: expired`. L’evento significa che il motivo di regolazione manuale è cambiato; un’altra pausa può ancora impedire l’applicazione fisica della programmazione.

Per il contratto completo degli eventi, consulta [Eventi per le automazioni](automation-events.it.md).

<a id="restart-and-availability-behavior"></a>
## Comportamento al riavvio e variazioni di disponibilità

Il criterio della zona e il motivo attivo di regolazione manuale vengono salvati. Dopo un riavvio Home Assistant:

- una regolazione manuale non scaduta o senza termine resta manuale;
- abilitare **Applica la programmazione attiva dopo l’avvio** non aggira la regolazione manuale attiva;
- raggiunta la scadenza salvata, Velair la rimuove e risolve l’intento attuale;
- l’esportazione portabile include il criterio ma esclude intenzionalmente lo stato in tempo reale della regolazione manuale.

L’istantanea acquisita della modalità/obiettivo esterni esiste solo in esecuzione e non viene salvata o ripetuta dopo un riavvio. Normalmente il dispositivo fisico conserva e comunica il proprio stato manuale, mentre il motivo persistente di Velair continua a impedire l’applicazione della programmazione. Se il dispositivo si ripristina o comunica un obiettivo diverso durante il riavvio, Velair non ricostruisce la vecchia istantanea esterna; attende scadenza o ripresa della regolazione manuale, poi risolve l’intento attuale.

Velair ignora le transizioni da o verso `unknown` e `unavailable`. Se una modifica da telecomando avviene mentre l’integrazione non può comunicare lo stato e l’unico aggiornamento successivo è una transizione da `unavailable` a disponibile, Velair non classifica quel recupero come nuova regolazione esterna. Una volta disponibile, rileva normalmente le successive modifiche di modalità o obiettivo.

<a id="attribution-limits"></a>
## Limiti dell’attribuzione

L’attribuzione cerca intenzionalmente di essere il più affidabile possibile, perché integrazioni climatiche Home Assistant e dispositivi fisici comunicano lo stato in modi diversi.

- Un’azione fisica o del produttore che non raggiunge Home Assistant non è rilevabile.
- Alcuni dispositivi pubblicano modalità e obiettivo in più aggiornamenti; possono emettere più eventi osservativi. Le automazioni devono essere idempotenti.
- Un’azione non-Velair che comunica esattamente il valore di un campo atteso ancora valido può essere correlata a Velair.
- Un dispositivo che non conferma mai un obiettivo Velair accettato può lasciare l’aspettativa attiva fino alla breve scadenza.
- Il recupero della disponibilità stesso viene ignorato, come descritto sopra.
- Le modifiche di ventilazione, preset, oscillazione, umidità e sole letture ambientali sono fuori dal primo contratto della funzione.

L’interpretazione sicura di `external_climate_change_detected` è quindi: «Velair ha osservato una modifica dei controlli che non ha potuto attribuire ai propri comandi», non «Velair ha dimostrato che questa persona identificata ha cambiato il termostato».

<a id="troubleshooting-checklist"></a>
## Lista di verifica per risolvere problemi

Se una regolazione manuale prevista non compare:

1. Verifica che il dispositivo sia gestito da Velair.
2. Verifica che la programmazione automatica sia globalmente attiva e la zona abilitata.
3. Verifica che il profilo attivo non metta già in pausa la zona.
4. Verifica che la fonte esterna cambi `hvac_mode`, `temperature` o un intervallo nativo in Home Assistant, non solo il display del produttore o un’opzione di ventilazione/preset.
5. Verifica che l’entità non fosse `unknown` o `unavailable` durante la transizione.
6. Ascolta `velair_event` e filtra `event: external_climate_change_detected`.
7. Controlla Diagnostica Velair e registri Home Assistant per errori di conservazione dello stato o chiamate climatiche.

Se la zona riprende senza applicare la temperatura prevista, controlla profilo/modalità attuale, programmazione Default, motivi di pausa indipendenti, stato globale del pianificatore e se il blocco attuale è Off o Keep. La ripresa usa sempre l’intento prioritario attuale, mai un’istantanea storica della vecchia programmazione.
