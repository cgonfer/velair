<a id="external-schedule-execution"></a>
# Esecuzione esterna della programmazione
<!-- velair-docs:start -->
Traduzioni: [Originale in inglese](external-systems.md) · [Español](external-systems.es.md) · [Français](external-systems.fr.md) · [Deutsch](external-systems.de.md) · [Italiano](external-systems.it.md) · [Nederlands](external-systems.nl.md) · [Polski](external-systems.pl.md) · [Português (Brasil)](external-systems.pt-br.md) · [Português (Portugal)](external-systems.pt-pt.md) · [Русский](external-systems.ru.md) · [Stato delle traduzioni](../translation-status.md)

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

Normalmente Velair gestisce sia l’archiviazione della programmazione sia l’esecuzione dei comandi climatici. Per dispositivi compatibili, **Impostazioni → Sistemi esterni** può invece pubblicare la programmazione settimanale effettiva su un controller che la esegue autonomamente.

La sezione compare quando Velair rileva un’integrazione Home Assistant supportata con un dispositivo gestito compatibile, oppure quando una zona ha già un responsabile esterno. Prima di abilitare l’esecuzione esterna, crea e salva per la zona una programmazione effettiva con almeno un blocco di temperatura. Se non c’è nulla da pubblicare, Velair mantiene il controllo locale e spiega nelle impostazioni il prerequisito mancante. Scegli il sistema esterno per una zona: il controllo esterno viene salvato prima che Velair carichi l’intera settimana. Un caricamento fallito non ripristina l’esecuzione locale: la zona resta esterna e mostra l’errore di pubblicazione, evitando che due pianificatori entrino in conflitto. Dopo una chiamata al servizio Home Assistant riuscita, Velair segnala la programmazione come pubblicata: significa che l’integrazione esterna ha accettato la richiesta. Velair non afferma che il controller fisico l’abbia applicata.

L’esecuzione esterna riguarda intenzionalmente solo la programmazione. Velair non invia alcuna azione climatica a una zona esterna, compresi l’applicazione all’avvio o della programmazione attuale, incremento, pausa/ripresa, regolazione manuale, Room Assist o precondizionamento adattivo. Profili e modalità sono supportati solo come selezione della programmazione: `normal` pubblica la settimana predefinita della zona e `schedule` quella del profilo. Il comportamento di pausa non è disponibile per le zone esterne. Selezionare la configurazione predefinita, un profilo o una modalità, oppure modificare un profilo attivo, pubblica la nuova settimana effettiva completa dopo il salvataggio della selezione. Un errore di pubblicazione non annulla la selezione globale del profilo o della modalità e non influisce sulle zone locali. Selezionare nuovamente la configurazione predefinita, un profilo o una modalità avvia inoltre una nuova pubblicazione quando lo stato di esecuzione attuale è `failed` o non esiste una pubblicazione riuscita. Velair non riprova automaticamente: questa pubblicazione è causata solo dalla selezione esplicita.

<a id="evohome-via-ramses_cc"></a>
## Evohome tramite ramses_cc

Il primo sistema supportato usa il servizio Home Assistant `ramses_cc.set_zone_schedule`. Velair non ha dipendenze Python da `ramses_cc` e comunica esclusivamente tramite i servizi di Home Assistant.

Le impostazioni e l’editor dei profili ricavano queste condizioni dalle capacità del controller e le elencano una sola volta sotto il controller esterno, anche se lo usano più zone. I dettagli del controller sono chiusi per impostazione predefinita e possono essere espansi quando occorre controllare i limiti.
Limiti attuali:

- programmazioni di riscaldamento con una sola temperatura obiettivo per punto di commutazione;
- esattamente sette giorni della settimana, preservando la continuità settimanale di Velair;
- nessun blocco di spegnimento, intervallo di temperatura, modalità di raffrescamento o opzione climatica;
- al massimo sei punti di commutazione risultanti dalla conversione al giorno;
- quando il primo blocco inizia dopo `00:00`, Velair inserisce un punto di continuità a mezzanotte: questa variazione implicita conta nel massimo giornaliero, lasciando spazio per cinque blocchi modificabili quel giorno;
- orari sulla griglia di 5 minuti del controller;
- temperature convertite in Celsius per i dati inviati al controller.

Per le zone eseguite esternamente, gli editor giornalieri predefiniti e dei profili mostrano l’utilizzo attuale del controller direttamente sopra i blocchi. La prima riga indica i punti di commutazione usati e il massimo; la seconda distingue i blocchi modificabili dal punto implicito di continuità a mezzanotte. L’indicatore cambia aspetto al limite e quando la bozza lo supera. I dati derivano dalle capacità dichiarate dal controller selezionato; la validazione della pubblicazione nel backend resta la verifica decisiva.

La panoramica conserva la normale attività della programmazione e le informazioni sul prossimo evento per una zona esterna. Un indicatore compatto **Esterno** nomina il controller e usa un’icona di stato per pubblicazione in corso, richiesta accettata, errore o indisponibilità. Il pulsante informazioni spiega che il controller esegue la sequenza pianificata e che Velair non invia azioni climatiche alla zona. Anche lo stato del pianificatore mostra un avviso informativo quando una o più zone visibili usano l’esecuzione esterna.

Il rilevamento richiede il servizio di impostazione della programmazione, una voce di configurazione `ramses_cc` caricata e un’entità `climate` gestita che dichiari supporto per riscaldamento e temperatura singola. I metadati pubblici delle entità Home Assistant non distinguono ogni zona Evohome da tutti gli altri dispositivi climatici `ramses_cc`. La chiamata al servizio costituisce quindi la verifica finale di compatibilità, e un errore resta visibile come errore di pubblicazione.

Questo percorso di integrazione dispone di test automatici dei servizi. Prove reali su un’installazione Evohome con `ramses_cc` hanno anche confermato la pubblicazione e la conservazione nel controller delle programmazioni settimanali provate. Restano utili riscontri da altre installazioni e combinazioni di programmazioni.

La pubblicazione ha solo tre stati di esecuzione: **publishing**, **published** e **failed**. Prima della prima pubblicazione nell’esecuzione attuale di Home Assistant non esiste uno stato di pubblicazione. Lo stato non viene salvato in modo persistente ed è indipendente dalla disponibilità attuale del fornitore.

Velair non chiama `get_zone_schedule`, non aggiunge ritardi, non riprova automaticamente e non interroga periodicamente il sistema. Questi meccanismi non permetterebbero comunque di affermare, in modo indipendente dal fornitore, cosa stia eseguendo l’hardware fisico.
