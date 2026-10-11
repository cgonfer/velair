<a id="zone-control-and-delivery-sensors"></a>
# Sensori di controllo della zona e invio dei comandi
<!-- velair-docs:start -->
Traduzioni: [Originale in inglese](zone-sensors.md) · [Español](zone-sensors.es.md) · [Français](zone-sensors.fr.md) · [Deutsch](zone-sensors.de.md) · [Italiano](zone-sensors.it.md) · [Nederlands](zone-sensors.nl.md) · [Polski](zone-sensors.pl.md) · [Português (Brasil)](zone-sensors.pt-br.md) · [Português (Portugal)](zone-sensors.pt-pt.md) · [Русский](zone-sensors.ru.md) · [Stato delle traduzioni](../translation-status.md)

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

Velair crea due sensori di contesto per ogni entità `climate.*` gestita:

- **Controllo della zona** indica chi controlla attualmente la zona e quale configurazione Velair si applica.
- **Diagnostica consegna** indica cosa è successo durante l’ultimo tentativo di Velair di inviare un obiettivo climatico tramite Home Assistant.

Descrivono livelli diversi. Una zona può essere sotto controllo automatico mentre l’ultimo invio è indisponibile o fallito: non usare un sensore come sostituto dell’altro.

Il sensore separato **Condizione ambientale** espone `derived_metrics` abilitati e l’elenco ordinato `insights`, disponibile solo in esecuzione, quando Comfort è abilitato. Le indicazioni contengono `code`, `kind`, `tone` e `metrics` di supporto; sono osservative e non eseguono mai azioni climatiche. Consulta [Comfort ambientale](comfort.it.md#comfort-insights). Quando il confronto esterno facoltativo è abilitato, lo stesso sensore espone anche il sottoalbero `outdoor`, con letture di origine, umidità assoluta interna ed esterna esplicita, qualità indipendente e opportunità o compromesso semantico di ventilazione. Velair non crea entità proxy per le singole letture. Crea invece un sensore enumerato separato **Opportunità di ventilazione** per il riepilogo delle automazioni gestito dal backend descritto sotto.

<a id="environmental-condition"></a>
## Condizione ambientale

Il sensore **Condizione ambientale** fornisce lo stato attuale per le automazioni Comfort. È abilitato per impostazione predefinita per ogni dispositivo gestito e viene aggiornato dalla stessa valutazione backend del pannello Velair. Leggerlo non interroga un sensore né esegue un’azione climatica.

Il suo stato nativo mantiene la classificazione fisica compatibile di temperatura e umidità:

| Stato | Significato |
| --- | --- |
| `monitoring_off` | Il monitoraggio Comfort è disabilitato per questo dispositivo. |
| `no_readings` | Nessuna lettura monitorata utilizzabile è disponibile al momento. |
| `temperature_comfortable` | Solo la temperatura è valutabile ed è nel proprio intervallo configurato. |
| `humidity_comfortable` | Solo l’umidità è valutabile ed è nel proprio intervallo configurato. |
| `comfortable` | Temperatura e umidità sono entrambe nei propri intervalli configurati. |
| `cold` / `hot` | La temperatura è sotto o sopra il proprio intervallo. |
| `dry` / `humid` | L’umidità è sotto o sopra il proprio intervallo. |
| `cold_and_dry` / `cold_and_humid` | Entrambe le letture sono utilizzabili e la temperatura è sotto l’intervallo. |
| `hot_and_dry` / `hot_and_humid` | Entrambe le letture sono utilizzabili e la temperatura è sopra l’intervallo. |

Questi valori restano compatibili con le automazioni esistenti. Descrivono gli intervalli fisici configurati; non sono un’affermazione medica o universale sul comfort personale.

<a id="environmental-condition-attributes"></a>
### Attributi della condizione ambientale

| Attributo | Significato |
| --- | --- |
| `data_quality` | `complete`, `unverified`, `partial`, `stale` o `unavailable` per le letture interne monitorate. `unverified` indica che le letture sono utilizzabili, ma almeno una non ha un orario di segnalazione verificabile. |
| `data_issues` | Codici stabili che spiegano dati interni mancanti, non aggiornati o non validi. Omesso se vuoto. |
| `range_summary` | Riepilogo fattuale dell’intervallo configurato, incluso il confronto facoltativo con Humidex. |
| `ventilation_opportunity` | Stato, ambito, effetti, impedimenti e motivo attuali della ventilazione, gestiti dal backend. |
| `comfort_zone` | Geometria obiettivo semplice, guidata o personalizzata dipendente dalla temperatura e intervallo effettivo dell’umidità alla temperatura attuale. |
| `temperature_source` | ID dell’entità attualmente usata per la temperatura interna, se disponibile. |
| `humidity_source` | ID dell’entità attualmente usata per l’umidità interna, se disponibile. |
| `derived_metrics` | Dati abilitati di Humidex, punto di rugiada e umidità assoluta. Le misure non monitorate sono omesse. |
| `outdoor` | Confronto facoltativo interno/esterno, soglie effettive delle indicazioni, qualità dei dati, letture e opportunità o compromesso semantico. |
| `insights` | Codici osservativi ordinati con `code`, `kind`, `tone` e `metrics` di supporto. Omesso se vuoto. |

`derived_metrics` e `outdoor` sono omessi quando le rispettive funzioni non sono abilitate. Quando le letture abilitate mancano, non sono aggiornate o non sono valide, i loro dati restano presenti con `availability` e contesto dei problemi per impedire alle automazioni di riutilizzare un vecchio valore. `insights` è omesso se l’elenco attuale è vuoto. Temperatura e umidità interne grezze restano sulle entità di origine. La classificazione CO2 è esposta dal sensore separato **Qualità dell’aria**.

Per un modello guidato o personalizzato dipendente dalla temperatura, `comfort_zone.effective_humidity_range` è `null` quando la temperatura attuale non è utilizzabile. In quello stato la lettura di umidità può restare visibile, ma non ha una condizione e non va considerata dentro o fuori da un intervallo ipotizzato.

`range_summary` contiene:

```yaml
status: within_range | outside_range | mixed | unavailable
thermal_relation: aligned | mixed | not_evaluated | unavailable
positions:
  temperature: below | within | above | null
  humidity: below | within | above | null
  humidex: below | within | above | null
```

Per esempio, questo template rileva indicatori termici discordanti senza interpretare un’etichetta tradotta:

```yaml
{% set summary =
   state_attr('sensor.velair_environmental_condition_living_room',
              'range_summary') %}
{{ summary is mapping and summary.get('thermal_relation') == 'mixed' }}
```

Questa condizione verifica se la lettura Humidex abilitata è attuale e sopra l’intervallo di temperatura configurato:

```yaml
{% set metrics =
   state_attr('sensor.velair_environmental_condition_living_room',
              'derived_metrics') or {} %}
{% set humidex = metrics.get('humidex', {}) %}
{{ humidex.get('availability') == 'current'
   and humidex.get('temperature_range_position') == 'above' }}
```

Questa condizione usa un codice delle indicazioni gestito dal backend. Resta valida quando cambia la lingua visualizzata:

```yaml
{% set insights =
   state_attr('sensor.velair_environmental_condition_living_room',
              'insights') or [] %}
{{ insights
   | selectattr('code', 'eq', 'ventilation_may_help_cool')
   | list | count > 0 }}
```

Per il confronto esterno facoltativo, controlla la disponibilità prima di usare un valore numerico:

```yaml
{% set outdoor =
   state_attr('sensor.velair_environmental_condition_living_room',
              'outdoor') or {} %}
{% set comparison = outdoor.get('comparison', {}) %}
{% set thresholds = outdoor.get('guidance_thresholds', {}) %}
{% set temperature = comparison.get('temperature', {}) %}
{{ temperature.get('availability') == 'current'
   and temperature.get('potential') == 'cooling'
   and thresholds.get('temperature_delta') is number }}
```

<a id="entity-or-event"></a>
### Entità o evento?

Usa questa entità quando un’automazione necessita dello stato attuale, anche dopo un riavvio di Home Assistant. Un normale trigger di stato può reagire a una classificazione fisica compatibile:

```yaml
triggers:
  - trigger: state
    entity_id: sensor.velair_environmental_condition_living_room
    to: hot_and_humid
```

Usa `comfort_assessment_changed` quando l’automazione deve sapere cosa è cambiato. I campi `previous_range_summary`, `range_summary_changed` e `range_status_changed` distinguono una transizione dell’intervallo da un aggiornamento Comfort non correlato. Consulta [Cambio della valutazione di comfort](automation-events.it.md#comfort-assessment-changed) per i dati completi e un’automazione pronta da copiare.

<a id="ventilation-opportunity"></a>
## Opportunità di ventilazione

Il sensore **Opportunità di ventilazione** per zona è basato su eventi e osservativo:

| Stato | Significato |
| --- | --- |
| `unavailable` | Comfort, confronto esterno o una lettura necessaria configurata non possono essere valutati al momento. |
| `no_opportunity` | L’aria esterna non supera le soglie configurate in una direzione utile. |
| `may_help` | L’aria esterna avvicina la stanza al comfort, ma Velair non può stabilire che raggiunga l’intera zona configurata. |
| `comfort_possible` | La temperatura esterna è nell’intervallo e, quando l’umidità è monitorata, quella esterna è nella fascia Comfort valutata a quella temperatura esterna. |
| `trade_off` | Una variazione utile in una dimensione monitorata comporta un peggioramento noto in un’altra. |
| `already_comfortable` | La condizione ambientale fisica è già confortevole. |

`comfort_possible` è una proiezione ambientale prudente, non una promessa sull’apertura di una finestra. Velair non può conoscere flusso d’aria, vento, pioggia, inquinanti esterni, apporti solari, massa termica della stanza o durata dell’apertura. Non apre mai finestre né cambia il controllo climatico.

Gli attributi includono `evaluation_scope`, `potential_effects`, `blocked_by`, `reason`, `data_quality` e `data_issues` esterni e gli ID delle fonti esterne configurate. Se l’umidità interna è monitorata ma quella esterna è omessa, la temperatura può produrre `may_help`, ma mai `comfort_possible`. Se il monitoraggio dell’umidità è intenzionalmente disabilitato, un risultato `comfort_possible` basato solo sulla temperatura è valido.

`reason` è un codice stabile leggibile automaticamente. I valori sono: `monitoring_off`, `outdoor_comparison_disabled`, `indoor_temperature_unavailable`, `indoor_humidity_unavailable`, `outdoor_temperature_unavailable`, `outdoor_humidity_unavailable`, `already_comfortable`, `known_trade_off`, `no_useful_difference`, `outdoor_conditions_within_comfort`, `outdoor_humidity_not_configured` e `moves_toward_comfort`.

Per un dispositivo come `climate.living_room`, una nuova voce del registro userà normalmente un ID simile a:

```text
sensor.velair_ventilation_opportunity_living_room
sensor.velair_control_living_room
sensor.velair_delivery_diagnostics_living_room
```

Sono ID suggeriti, non un’API permanente. Home Assistant può aggiungere un suffisso per evitare conflitti e gli utenti possono rinominare un’entità. Seleziona le entità tramite i loro ID effettivi nel registro Home Assistant. Il nome visualizzato usa il nome descrittivo del dispositivo gestito, mentre l’ID suggerito usa l’object ID dell’entità climatica. Il nome del dispositivo di servizio Velair e la sua area non fanno parte dell’ID suggerito.

<a id="zone-control"></a>
## Controllo della zona

**Controllo della zona** è abilitato per impostazione predefinita e viene ricostruito dal pianificatore dopo ogni riavvio. Lo stato identifica chi controlla attualmente il dispositivo:

| Stato | Significato |
| --- | --- |
| `automatic` | Velair gestisce il controllo locale, compresi gli stati programmato, inattivo, pausa, arresto, incremento e precondizionamento adattivo. Usa `runtime_state` per distinguerli. |
| `manual` | Velair ha ceduto il dispositivo a una regolazione manuale, esplicita o successiva a una modifica esterna rilevata. È diverso dalla modalità **Manuale** di Velair, che descrive la selezione dei profili. |
| `external` | Un fornitore supportato della programmazione esterna gestisce l’esecuzione fisica per la zona. Una modifica da scheda climatica, telecomando o altra automazione non produce questo stato; quando Velair cede il controllo a tale modifica, lo stato è `manual`. |

Il sensore resta disponibile durante una migrazione obbligatoria dell’unità di temperatura perché le informazioni sul controllo non sono valori di temperatura.

<a id="zone-control-attributes"></a>
### Attributi del controllo della zona

| Attributo | Valori o significato |
| --- | --- |
| `runtime_state` | `idle`, `scheduled`, `preconditioning`, `boost`, `paused`, `stopped`, `externally_managed`, `temperature_migration_required` o valore alternativo difensivo `unknown`. |
| `schedule_source` | `default` per la programmazione Default della zona, `profile` per quella effettiva del profilo, oppure `profile_pause` quando il profilo effettivo mette in pausa la zona. |
| `profile_id` / `profile_name` | ID stabile e nome visualizzato del profilo responsabile della zona, quando applicabile. |
| `mode_id` / `mode_name` | ID stabile e nome visualizzato della modalità selezionata, quando si applica una modalità personalizzata. |
| `manual_source` | Presente solo in `manual`: `explicit` per una regolazione manuale scelta direttamente, `external_change` quando Velair ha ceduto il controllo a una modifica rilevata, oppure valore alternativo difensivo `other`. |
| `manual_started_at` | Data e ora di avvio della regolazione manuale attuale. |
| `manual_until` | Scadenza prevista quando il criterio manuale ne ha una. Può mancare per una regolazione senza termine. |
| `manual_policy` | Presente solo in `manual`: `until_next_block`, `for_duration`, `until_resumed` o valore alternativo difensivo `unknown`. |

Gli attributi facoltativi sono omessi se non applicabili. Per esempio, un’entità `automatic` non ha `manual_source` o `manual_until`.

Stato di controllo e stato di esecuzione sono intenzionalmente separati. Per esempio:

- `automatic` con `runtime_state: paused` significa che Velair controlla ancora la zona ma una pausa impedisce l’esecuzione normale della programmazione;
- `automatic` con `runtime_state: boost` significa che Velair controlla l’incremento temporaneo;
- `external` con `runtime_state: externally_managed` significa che il fornitore esterno configurato, anziché l’invio locale di Velair, gestisce l’esecuzione fisica.

<a id="zone-delivery-diagnostics"></a>
## Diagnostica di invio della zona

**Diagnostica consegna** è un’entità diagnostica disabilitata per impostazione predefinita. Abilitala solo quando una dashboard o un’automazione necessita delle ultime informazioni locali di invio:

1. Apri **Impostazioni > Dispositivi e servizi > Entità** in Home Assistant.
2. Cerca il nome del dispositivo gestito seguito da **Diagnostica consegna**.
3. Apri le impostazioni dell’entità e abilitala.

Il sensore è basato su eventi e non interroga periodicamente i dispositivi. Il suo stato descrive l’ultimo esito di invio osservato dall’avvio dell’integrazione:

| Stato | Quando si verifica |
| --- | --- |
| `idle` | Nessun esito registrato dall’avvio o dalla cancellazione delle informazioni di invio in esecuzione. |
| `success` | Home Assistant ha accettato l’intera sequenza di servizi climatici Velair. `retry_count` indica se al primo tentativo o a un successivo. |
| `failed` | Home Assistant ha rifiutato una chiamata climatica. Le operazioni del pianificatore procedono normalmente al recupero limitato; un’azione singola senza recupero può restare fallita senza nuovi tentativi. |
| `retrying` | Velair ha iniziato uno dei tentativi limitati dopo un errore recuperabile. Lo stato può essere breve. |
| `exhausted` | Il tentativo iniziale del pianificatore ed entrambi quelli differiti sono falliti. |
| `invalid_intent` | Durante il recupero o il nuovo invio, Velair non ha più potuto risolvere l’intento attuale in un invio valido. I normali errori di validazione dei servizi e della configurazione vengono rifiutati prima di questo stato. |
| `cancelled` | Un nuovo intento ha superato il lavoro di invio attivo o differito, oppure il lavoro è stato invalidato esplicitamente o arrestato mentre era in attesa. Può essere breve se inizia subito un nuovo lavoro. |
| `unavailable` | Il dispositivo gestito mancava, era `unknown` o `unavailable`, quindi Velair non ha chiamato il servizio climatico. L’intento idoneo del pianificatore viene risolto nuovamente quando l’entità torna disponibile. |

L’entità diagnostica stessa resta disponibile, rendendo osservabile lo stato `unavailable`. Resta disponibile anche durante una migrazione obbligatoria dell’unità; le informazioni termiche registrate mantengono l’unità acquisita con l’obiettivo accettato.

Velair attualmente effettua al massimo due tentativi differiti, dopo circa 2 e 10 secondi. Questi tempi descrivono il recupero, non un contratto consigliato per le automazioni: reagisci agli stati anziché dipendere da ritardi esatti.

<a id="delivery-diagnostic-attributes"></a>
### Attributi della diagnostica di invio

| Attributo | Significato |
| --- | --- |
| `updated_at` | Data e ora dell’ultimo aggiornamento dello stato di invio. Assente nello stato iniziale `idle`. |
| `retry_count` | Numero del tentativo rappresentato dallo stato finale o di nuovo tentativo attuale: `0` per quello iniziale, poi `1` o `2`. L’annullamento lo azzera a `0`. |
| `last_error_at` | Data e ora dell’ultimo esito registrato `failed`, `exhausted` o `invalid_intent`. |
| `last_error_code` | `failed`, `exhausted`, `invalid_intent` o valore alternativo difensivo `unknown_delivery_status`. Il testo grezzo dell’eccezione non viene mai esposto. |
| `last_accepted_at` | Data e ora dell’ultima sequenza completa di controllo Velair accettata da Home Assistant. |
| `last_accepted_source` | `automatic`, `manual`, `boost` o `automatic_reassertion`. |
| `last_accepted_action` | `set_temperature`, `set_hvac_mode`, `turn_off` o valore alternativo difensivo `other`. |
| `last_accepted_hvac_mode` | Modalità HVAC inclusa nell’obiettivo accettato, quando applicabile. |
| `last_accepted_temperature_unit` | Unità registrata con un obiettivo singolo o a intervallo. |
| `last_accepted_temperature` | Obiettivo singolo accettato, quando applicabile. |
| `last_accepted_target_temp_low` / `last_accepted_target_temp_high` | Limiti inferiore e superiore accettati per un intervallo nativo, quando applicabile. |

Le chiamate tramite `velair.set_temperature` e `velair.set_hvac_mode` vengono entrambe indicate con `last_accepted_source: manual`. Una chiamata riuscita di sola modalità ha `last_accepted_action: set_hvac_mode` e una modalità HVAC, mentre tutti gli attributi degli obiettivi termici restano assenti o `null`.

I campi dell’ultimo errore e dell’ultima accettazione sono cronologie indipendenti. Un `success` successivo cambia lo stato attuale ma non cancella i valori `last_error_*` precedenti. Analogamente, un errore successivo non cancella l’ultimo obiettivo accettato. Controlla gli orari quando un’automazione deve confrontarli.

`success` significa che Home Assistant ha accettato le chiamate ai servizi; non conferma trasporto, attività dell’apparecchiatura o raggiungimento dell’obiettivo nella stanza. Usa l’entità climatica e la sua integrazione per lo stato fisico. Room Assist può poi cambiare l’obiettivo inviato e ha un proprio sensore per la regolazione applicata. Anche la pubblicazione esterna della programmazione ha uno stato separato in Velair e non è rappresentata da questo sensore locale di invio.

Tutte le informazioni di invio esistono solo in esecuzione. Tornano a `idle` al riavvio dell’integrazione o di Home Assistant e vengono cancellate anche da un ripristino riuscito dei dati Velair. Non vengono recuperate da Recorder o dall’archivio Velair.

<a id="automation-examples"></a>
## Esempi di automazione

L’automazione seguente notifica solo quando Velair ha esaurito i tentativi limitati. Sostituisci l’ID di esempio con quello del tuo registro:

```yaml
alias: Velair living room delivery exhausted
triggers:
  - trigger: state
    entity_id: sensor.velair_delivery_diagnostics_living_room
    to: exhausted
actions:
  - action: persistent_notification.create
    data:
      title: Velair delivery problem
      message: >-
        The living room target could not be delivered after
        {{ trigger.to_state.attributes.retry_count }} retries.
```

Questa condizione template verifica che Velair controlli attualmente la zona in automatico e abbia un blocco programmato attivo:

```yaml
condition: template
value_template: >-
  {{ is_state('sensor.velair_control_living_room', 'automatic')
     and state_attr('sensor.velair_control_living_room', 'runtime_state')
         == 'scheduled' }}
```

Usa **Controllo della zona** per il responsabile attuale e il contesto del pianificatore. Usa **Diagnostica consegna** per l’ultimo esito dei servizi. Usa `climate.living_room` per lo stato dichiarato dal dispositivo.
