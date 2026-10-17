<a id="home-and-away-from-occupancy"></a>
# Presenza e assenza in base all’occupazione
<!-- velair-docs:start -->
Traduzioni: [Originale in inglese](home-away-from-occupancy.md) · [Español](home-away-from-occupancy.es.md) · [Français](home-away-from-occupancy.fr.md) · [Deutsch](home-away-from-occupancy.de.md) · [Italiano](home-away-from-occupancy.it.md) · [Nederlands](home-away-from-occupancy.nl.md) · [Polski](home-away-from-occupancy.pl.md) · [Português (Brasil)](home-away-from-occupancy.pt-br.md) · [Português (Portugal)](home-away-from-occupancy.pt-pt.md) · [Русский](home-away-from-occupancy.ru.md) · [Stato delle traduzioni](../../translation-status.md)

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

Esegui le azioni Home Assistant scelte quando un’unica entità consolidata di presenza indica che la casa è occupata o vuota. In questo modo la logica di presenza relativa a persone, ospiti ed esigenze della casa resta in Home Assistant, mentre le comuni modifiche di modalità e profili Velair sono più semplici da configurare. Una notifica differita spiega quando l’entità non permette una decisione sicura fra Presenza e Assenza.

<p>
  <a href="https://my.home-assistant.io/redirect/blueprint_import/?blueprint_url=https%3A%2F%2Fraw.githubusercontent.com%2Fcgonfer%2Fvelair%2Fmain%2Fblueprints%2Fautomation%2Fvelair%2Foccupancy_home_away.yaml"><img src="https://my.home-assistant.io/badges/blueprint_import.svg" alt="Apri Home Assistant e importa il blueprint Presenza e assenza in base all’occupazione" height="28"></a>
  <a href="https://raw.githubusercontent.com/cgonfer/velair/main/blueprints/automation/velair/occupancy_home_away.yaml"><img src="https://img.shields.io/badge/YAML_source-View-24292F?style=for-the-badge&amp;logo=github&amp;logoColor=white" alt="Consulta il sorgente YAML di Presenza e assenza in base all’occupazione"></a>
</p>

[Consulta le modifiche](../../../blueprints/changelogs/occupancy_home_away.md) · [Torna all’indice dei blueprint](../blueprints.it.md)

<a id="when-to-use-it"></a>
## Quando usarlo

Usa questo blueprint quando Home Assistant dispone già di un’entità che rappresenta se la casa è occupata. È adatto a passaggi a Presenza, Assenza o simili, nei quali le azioni finali devono essere ritardate e verificate nuovamente prima dell’esecuzione.

<a id="requirements"></a>
## Requisiti

- Blueprint versione 1.0.0 e Home Assistant 2024.6.0 o successivo.
- Un `binary_sensor` o `input_boolean` con `on`/`off`, oppure un gruppo di persone con `home`/`not_home`.
- Velair è necessario solo quando le azioni configurate usano le sue modalità, i suoi profili, le sue entità o i suoi servizi. Altrimenti il blueprint può eseguire azioni standard di Home Assistant senza Velair.

Crea in Home Assistant le regole per persone, ospiti, zone e presenza prima di selezionare qui l’entità risultante. Un gruppo di persone può rappresentare se una qualsiasi persona monitorata è `home`, mentre un sensore binario basato su template può includere anche un helper per gli ospiti o altre eccezioni domestiche. Il blueprint accetta sia `on`/`off` sia `home`/`not_home`, anziché ricreare quella decisione.

<a id="configuration"></a>
## Configurazione

- **Consolidated occupancy state:** l’unica entità che rappresenta già la presenza nell’intera casa.
- **When occupied:** una o più azioni standard di Home Assistant.
- **When empty:** una o più azioni standard di Home Assistant.
- **Occupied delay:** quanto a lungo l’entità deve restare `on` o `home`.
- **Empty delay:** quanto a lungo l’entità deve restare `off` o `not_home`.
- **Availability warning delay:** quanto a lungo deve persistere `unknown` o `unavailable` prima che Home Assistant crei una notifica diagnostica. Il valore predefinito è 5 minuti.

<a id="example"></a>
## Esempio

Per l’azione di presenza, aggiungi **Select: Select**, scegli l’entità visibile della modalità Velair proposta da Home Assistant e seleziona `Home`. Configura allo stesso modo l’azione di assenza con `Away`. Seleziona l’entità dall’interfaccia anziché presumere un identificatore specifico.

Le azioni generate equivalgono a:

```yaml
action: select.select_option
target:
  entity_id: select.velair_mode
data:
  option: Home
```

Per attivare invece direttamente un profilo:

```yaml
action: velair.activate_profile
data:
  profile_id: home
```

Usare le modalità è normalmente più chiaro per le scelte Home, Away e Vacation, perché lo stato attuale resta visibile nel selettore di modalità Velair di Home Assistant.

<a id="how-it-works"></a>
## Come funziona

I trigger degli stati di presenza (`on`/`home`) e assenza (`off`/`not_home`) usano le durate native `for` di Home Assistant: lo stato deve quindi restare continuo per l’intero ritardo. Trigger template separati rilevano uno stato `unknown`/`unavailable` prolungato e il recupero a qualsiasi stato supportato. Home Assistant crea una sola notifica persistente specifica dell’automazione dopo il ritardo di avviso, la aggiorna anziché duplicarla e la rimuove dopo il recupero. Le azioni Presenza e Assenza non vengono eseguite mentre l’entità non ha uno stato valido.

All’avvio, le verifiche di presenza, assenza e disponibilità vengono eseguite come rami interni paralleli. Ciascun ramo verifica lo stato iniziale, attende in modo interrompibile lo stato opposto fino al timeout configurato, continua solo dopo il timeout e verifica nuovamente prima di agire. La modalità parallela esterna limitata impedisce che un’attesa di disponibilità all’avvio blocchi un successivo passaggio valido di presenza. Non ci sono interrogazioni periodiche.

<a id="safety-and-precedence"></a>
## Sicurezza e priorità

Le azioni di Modalità e Profilo seguono la politica del blocco selezionato. Un blocco **Solo temperatura** aggiorna l’obiettivo senza richiedere un cambio di modalità HVAC; selezionare Presenza non accende quindi necessariamente un dispositivo spento. Scegli un blocco esplicito **Riscaldamento** o **Raffrescamento** se Presenza deve avviare il dispositivo. Le azioni climatiche dirette configurate in questo blueprint restano azioni Home Assistant esplicite; la politica del blocco non le sopprime.

Il blueprint esegue solo le azioni configurate. Le priorità esistenti di modalità, profili, incrementi e pause di Velair restano valide. Un’entità di presenza `unknown` o `unavailable` non attiva né Presenza né Assenza; l’avviso identifica l’entità e spiega che le azioni restano sospese finché non segnala uno stato supportato di presenza o assenza.

<a id="limitations"></a>
## Limiti

- Il blueprint accetta intenzionalmente un’unica entità di presenza già risolta; non combina da solo persone o regole per gli ospiti.
- I timer `for` di Home Assistant non sopravvivono a un riavvio, quindi il percorso di avvio ricomincia il ritardo configurato.
- L’ID della notifica usa l’ID dell’entità dell’automazione. Rinominare l’automazione può lasciare disponibile la notifica precedente, da rimuovere manualmente.
- L’esecuzione parallela è limitata a 20 esecuzioni e genera un avviso se una raffica anomala di eventi occupa tutti gli slot.
- Le azioni create con **Prendi il controllo** non ricevono più automaticamente gli aggiornamenti del blueprint.

<a id="troubleshooting"></a>
## Risoluzione dei problemi

- Se non viene eseguito nessuno dei due rami, verifica che l’entità selezionata segnali `on`/`home` oppure `off`/`not_home`.
- Se compare un avviso, controlla l’entità di presenza indicata e il gruppo, il template, le persone o l’helper ospiti da cui dipende.
- Se Assenza si attiva troppo rapidamente, aumenta il ritardo di assenza.
- Se non viene selezionata la modalità prevista, esegui manualmente l’azione scelta in Home Assistant e verifica il nome dell’opzione.
- Se un’azione di profilo fallisce, usa l’ID stabile del profilo invece del nome visualizzato modificabile.

<a id="updating-and-customizing"></a>
## Aggiornamento e personalizzazione

Importa nuovamente l’URL in continua evoluzione su `main` per installare un aggiornamento compatibile. Gli aggiornamenti della versione 1 conservano i nomi degli input esistenti e ogni nuovo input ha un valore predefinito, quindi non serve migrare l’automazione. Una futura versione incompatibile userà un nuovo nome file e una nuova versione principale, invece di sostituire questo URL. Velair non modifica mai le automazioni Home Assistant o `.storage` per migrare un blueprint. Usa **Prendi il controllo** solo quando l’installazione richiede una logica che non può essere espressa tramite gli input forniti; l’automazione indipendente smetterà allora di ricevere aggiornamenti del blueprint.
