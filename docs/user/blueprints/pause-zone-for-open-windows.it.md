<a id="pause-a-zone-while-windows-are-open"></a>
# Mettere una zona in pausa con le finestre aperte
<!-- velair-docs:start -->
Traduzioni: [Originale in inglese](pause-zone-for-open-windows.md) · [Español](pause-zone-for-open-windows.es.md) · [Français](pause-zone-for-open-windows.fr.md) · [Deutsch](pause-zone-for-open-windows.de.md) · [Italiano](pause-zone-for-open-windows.it.md) · [Nederlands](pause-zone-for-open-windows.nl.md) · [Polski](pause-zone-for-open-windows.pl.md) · [Português (Brasil)](pause-zone-for-open-windows.pt-br.md) · [Português (Portugal)](pause-zone-for-open-windows.pt-pt.md) · [Русский](pause-zone-for-open-windows.ru.md) · [Stato delle traduzioni](../../translation-status.md)

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

Metti in pausa uno o più dispositivi climatici gestiti da Velair quando una delle finestre o porte selezionate resta aperta, poi riprendi le programmazioni solo quando tutti i contatti sono confermati chiusi e ogni pausa attiva appartiene ancora a questa automazione. Home Assistant avvisa quando un contatto non disponibile impedisce una ripresa sicura.

<p>
  <a href="https://my.home-assistant.io/redirect/blueprint_import/?blueprint_url=https%3A%2F%2Fraw.githubusercontent.com%2Fcgonfer%2Fvelair%2Fmain%2Fblueprints%2Fautomation%2Fvelair%2Fwindow_pause.yaml"><img src="https://my.home-assistant.io/badges/blueprint_import.svg" alt="Apri Home Assistant e importa il blueprint per mettere una zona in pausa con le finestre aperte" height="28"></a>
  <a href="https://raw.githubusercontent.com/cgonfer/velair/main/blueprints/automation/velair/window_pause.yaml"><img src="https://img.shields.io/badge/YAML_source-View-24292F?style=for-the-badge&amp;logo=github&amp;logoColor=white" alt="Consulta il sorgente YAML per mettere una zona in pausa con le finestre aperte"></a>
</p>

[Consulta le modifiche](../../../blueprints/changelogs/window_pause.md) · [Torna all’indice dei blueprint](../blueprints.it.md)

Domande, note sulle prove e riscontri costruttivi sono benvenuti nell’[argomento ufficiale del blueprint sul forum della comunità Home Assistant](https://community.home-assistant.io/t/velair-blueprint-pause-a-zone-while-windows-are-open/1021389).

<a id="when-to-use-it"></a>
## Quando usarlo

Usa questo blueprint quando aprire una finestra o una porta deve impedire temporaneamente a Velair di modificare uno o più dispositivi climatici che condividono le stesse aperture. È utile per impianti di riscaldamento e raffrescamento e può lasciare ogni dispositivo nello stato attuale oppure spegnerli durante la pausa.

<a id="requirements"></a>
## Requisiti

- Blueprint versione 1.0.0, Velair 1.6.0 o successivo e Home Assistant 2024.6.0 o successivo. Velair 1.6.0 fornisce i motivi di pausa simultanei con identificatore usati da questo blueprint.
- Una o più entità climatiche già gestite da Velair.
- Una o più entità `binary_sensor` con classe del dispositivo `window`, `door` o `opening`.
- Per ogni contatto selezionato, `on` deve significare aperto e `off` chiuso.

<a id="configuration"></a>
## Configurazione

- **Managed thermostats:** tutti i dispositivi gestiti da Velair da mettere in pausa e riprendere insieme.
- **Windows and doors:** ogni apertura che influisce su questa zona.
- **Climate action while paused:** mantenere lo stato attuale oppure spegnere il dispositivo.
- **Pause ID:** identificatore stabile del responsabile della pausa. Mantieni il valore predefinito per una sola automazione, oppure usa un ID diverso per ogni automazione separata che controlla lo stesso termostato.
- **Open delay:** quanto a lungo almeno un’apertura deve restare aperta prima della pausa.
- **Close delay:** quanto a lungo tutte le aperture devono restare chiuse prima della ripresa.
- **Availability warning delay:** quanto a lungo un contatto deve restare `unknown` o `unavailable` prima di mostrare una notifica Home Assistant. Il valore predefinito è 5 minuti.

<a id="example"></a>
## Esempio

Per un dispositivo climatico in soggiorno con due finestre:

```text
Managed thermostats:
  - climate.living_room
  - climate.living_room_radiator
Windows and doors:
  - binary_sensor.living_room_left_window
  - binary_sensor.living_room_right_window
Climate action while paused: Turn off
Open delay: 2 minutes
Close delay: 30 seconds
Availability warning delay: 5 minutes
```

Se una delle finestre resta aperta per due minuti, il blueprint mette in pausa entrambi i dispositivi climatici del soggiorno e li spegne. Dopo la chiusura dell’ultima finestra, quando entrambi i contatti restano chiusi per 30 secondi, riprende ogni programmazione attiva.

<a id="how-it-works"></a>
## Come funziona

Home Assistant osserva tre condizioni aggregate: almeno un contatto aperto, tutti i contatti chiusi e almeno un contatto `unknown` o `unavailable`. Ogni condizione usa un trigger template nativo con la propria durata `for`. Se la condizione aggregata diventa falsa prima della fine della durata, Home Assistant azzera il timer e non esegue azioni. Quando il timer termina, l’azione breve verifica nuovamente l’intero insieme dei contatti prima di mettere in pausa, riprendere o creare un avviso.

Il controllo dell’apertura, quello della chiusura e la diagnostica della disponibilità usano trigger indipendenti basati su eventi. Un contatto aperto può quindi mettere in pausa la zona dopo il ritardo di apertura anche se un altro contatto selezionato non è disponibile. Il contatto non disponibile continua a impedire che la condizione di completa chiusura diventi vera e permetta la ripresa.

Se un contatto resta `unknown` o `unavailable` per il ritardo di avviso configurato, Home Assistant crea una sola notifica persistente per l’intero insieme di termostati. Elenca sia i contatti interessati sia i termostati selezionati e spiega perché non vengono ripresi. Lo stato viene verificato nuovamente dopo il ritardo: un’esecuzione precedente termina quindi prima di creare la notifica se tutti i contatti sono tornati disponibili. Un trigger di recupero aggregato rimuove l’avviso. L’ID deterministico della notifica fa sì che le esecuzioni successive aggiornino lo stesso avviso anziché creare duplicati.

Dopo l’avvio di Home Assistant, un’esecuzione di riallineamento esegue le tre verifiche come rami interni paralleli. Ogni ramo verifica prima la propria condizione aggregata, attende la condizione opposta fino alla durata configurata e si arresta subito se la condizione opposta compare. Il ramo di apertura può quindi mettere in pausa i dispositivi anche mentre quello della disponibilità è in attesa. Interviene solo quando l’attesa scade e una verifica aggregata finale è ancora positiva. Home Assistant non può ricostruire da quanto tempo una condizione fosse vera prima dell’avvio, quindi questi timer interrompibili ricominciano da zero. Il funzionamento normale usa poi i timer continui dei trigger template descritti sopra. Non ci sono interrogazioni periodiche.

Le esecuzioni dell’automazione possono sovrapporsi, quindi un evento `opened_due` non viene bloccato mentre il ramo di disponibilità all’avvio attende. Quell’attesa occupa solo uno degli slot paralleli limitati. Le azioni convergono in modo sicuro perché ogni iterazione per dispositivo verifica nuovamente lo stato aggregato attuale dei contatti, Velair serializza le modifiche delle sostituzioni per dispositivo e un trigger aggregato opposto applica la decisione successiva di pausa o ripresa quando cambiano le condizioni.

<a id="safety-and-precedence"></a>
## Sicurezza e priorità

Quando il blocco attivo usa **Solo temperatura**, la ripresa dopo la chiusura delle finestre riapplica l’obiettivo senza richiedere cambi di modalità HVAC. Se il blueprint ha spento il dispositivo, resta spento; usa una modalità esplicita in un blocco successivo o accendilo manualmente quando necessario. **Mantieni modalità attuale** conserva il comportamento di riavvio esistente. Questa è la politica del blocco attivo, non un nuovo parametro del blueprint, e non richiede di importarlo nuovamente.

Il blueprint crea ogni pausa con il **Pause ID** configurato. Il valore predefinito è `velair_window_guard`; Velair conserva separatamente questa attribuzione per ogni termostato selezionato.

- Non sostituisce una pausa manuale o una pausa di un’altra automazione.
- Chiudere tutte le finestre riprende solo le pause con lo stesso ID.
- Una pausa o una ripresa manuale in Velair mantiene la precedenza.
- Script e automazioni esistenti senza `pause_id` conservano il comportamento precedente.
- I contatti `unknown` e `unavailable` non vengono mai considerati chiusi in sicurezza.
- Gli avvisi di disponibilità non aggirano né cambiano il responsabile della pausa. Spiegano solo perché una ripresa sicura non può avvenire.

Ogni dispositivo riceve una chiamata individuale al servizio e lo stato aggregato pertinente dei contatti viene verificato nuovamente subito prima di ogni chiamata. Un errore di servizio Home Assistant viene registrato nella traccia dell’automazione, ma `continue_on_error` permette al blueprint di proseguire con i dispositivi rimanenti. Le modifiche di incremento, pausa, ripresa e scadenza restano serializzate separatamente per ogni zona climatica.

<a id="limitations"></a>
## Limiti

- Preferisci un’unica automazione che contenga tutte le aperture rilevanti per lo stesso insieme di termostati.
- Se automazioni separate per le finestre devono controllare lo stesso termostato, assegna a ciascuna un **Pause ID** stabile diverso. Creano così motivi di pausa indipendenti e ogni automazione può rimuovere solo il proprio.
- Il blueprint non può interpretare in modo affidabile modifiche effettuate con un telecomando a infrarossi se l’integrazione climatica sottostante non le comunica a Home Assistant.
- I timer interrompibili di riallineamento all’avvio ricominciano da zero, perché Home Assistant non può recuperare la cronologia dei timer prima del riavvio.
- Le notifiche dipendono dall’integrazione integrata `persistent_notification` di Home Assistant.
- L’ID della notifica usa l’ID dell’entità dell’automazione Home Assistant, mantenendolo breve e indipendente dalla selezione o dall’ordine dei termostati. Rinominare l’automazione può lasciare disponibile la notifica precedente, da rimuovere manualmente.
- Possono sovrapporsi fino a 50 esecuzioni. Home Assistant emette un avviso se una raffica anomala di eventi occupa quegli slot; le normali esecuzioni attivate dalle condizioni restano brevi.

<a id="troubleshooting"></a>
## Risoluzione dei problemi

- Se la zona non va mai in pausa, verifica che almeno un contatto selezionato segnali `on` quando è aperto e resti aperto più a lungo del ritardo di apertura.
- Se la zona non riprende, verifica che ogni contatto selezionato segnali `off`. Dopo il ritardo di avviso, la notifica persistente elenca i contatti che segnalano ancora `unknown` o `unavailable`.
- Se un avviso resta dopo il recupero, verifica che il contatto abbia prodotto un nuovo evento di stato. Ricaricare o eseguire l’automazione rivaluta anche l’intero insieme e rimuove un avviso non più attuale.
- Se un servizio segnala un’entità non gestita, aggiungi quel dispositivo a Velair. Gli errori di servizio Home Assistant non impediscono di elaborare i dispositivi rimanenti; controlla la traccia dell’automazione per identificare i singoli errori.
- Se chiudere le finestre lascia la zona in pausa, verifica se la pausa attiva è stata creata manualmente o da un’altra automazione. Il blueprint la lascia intenzionalmente invariata.
- Se più automazioni controllano lo stesso dispositivo, raggruppa le loro aperture oppure verifica che ciascuna usi un **Pause ID** stabile diverso.

<a id="updating-and-customizing"></a>
## Aggiornamento e personalizzazione

Importa nuovamente l’URL in continua evoluzione su `main` per installare un aggiornamento compatibile. Gli aggiornamenti della versione 1 conservano i nomi degli input esistenti e ogni nuovo input ha un valore predefinito, quindi non serve migrare l’automazione. Una futura versione incompatibile userà un nuovo nome file e una nuova versione principale invece di sostituire questo URL. Velair non modifica mai le automazioni Home Assistant o `.storage` per migrare un blueprint. Usa **Prendi il controllo** solo quando l’installazione richiede un comportamento personalizzato oltre ai contatti, alle azioni e ai ritardi forniti; l’automazione indipendente smetterà allora di ricevere aggiornamenti del blueprint.
