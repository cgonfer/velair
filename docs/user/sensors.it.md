<a id="velair-sensor-reference"></a>
# Riferimento dei sensori Velair
<!-- velair-docs:start -->
Traduzioni: [Originale in inglese](sensors.md) · [Español](sensors.es.md) · [Français](sensors.fr.md) · [Deutsch](sensors.de.md) · [Italiano](sensors.it.md) · [Nederlands](sensors.nl.md) · [Polski](sensors.pl.md) · [Português (Brasil)](sensors.pt-br.md) · [Português (Portugal)](sensors.pt-pt.md) · [Русский](sensors.ru.md) · [Stato delle traduzioni](../translation-status.md)

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

Velair crea entità Home Assistant affinché dashboard e automazioni possano leggere il contesto attuale di pianificatore, comfort, invio dei comandi e singoli dispositivi senza aprire il pannello Velair.

Gli ID delle entità qui mostrati sono esempi. Home Assistant può aggiungere suffissi o permettere di rinominare le entità: usa gli ID effettivi del tuo registro.

<a id="quick-guide"></a>
## Guida rapida

| Entità | Creata per | Uso principale |
| --- | --- | --- |
| **Prossimo evento programmato** | Integrazione Velair | Mostrare la prossima azione pianificata. |
| **Stato della programmazione** | Integrazione Velair | Verificare se la programmazione è inattiva, pianificata, in pausa o sostituita. |
| **Stato della diagnostica** | Integrazione Velair | Avvisare sullo stato del funzionamento di Velair. |
| **Temperatura obiettivo attiva** | Ogni dispositivo gestito | Mostrare l’obiettivo attualmente controllato da Velair. |
| **Condizione ambientale** | Ogni dispositivo gestito | Leggere stato Comfort, qualità dei dati, misure derivate e contesto esterno. |
| **Opportunità di ventilazione** | Ogni dispositivo gestito | Automatizzare o mostrare opportunità prudenti di apertura delle finestre. |
| **Qualità dell’aria** | Ogni dispositivo gestito | Mostrare la valutazione CO2 separatamente dal comfort termico. |
| **Sostituzione della zona** | Ogni dispositivo gestito | Mostrare incrementi o pause attivi. |
| **Controllo della zona** | Ogni dispositivo gestito | Sapere chi controlla il dispositivo: Velair, regolazione manuale o esecuzione esterna. |
| **Diagnostica consegna** | Ogni dispositivo gestito, disabilitata per impostazione predefinita | Analizzare o automatizzare in base all’ultimo esito locale di invio. |
| **Avvio del precondizionamento** | Ogni dispositivo gestito | Mostrare quando il precondizionamento adattivo prevede di anticipare l’avvio. |
| **Room Assist** | Ogni dispositivo gestito | Mostrare stato di Room Assist e contesto dell’obiettivo applicato. |

Velair crea anche entità modificabili come **Programmazione automatica** e **Modalità**. Sono controlli, non sensori; consulta la [guida all’uso](usage.it.md#home-assistant-entities).

<a id="global-sensors"></a>
## Sensori globali

<a id="next-climate-event"></a>
### Prossimo evento climatico

Esempio di ID dell’entità:

```text
sensor.velair_next_scheduled_event
```

Attributi principali:

| Attributo | Significato |
| --- | --- |
| `entity_id` | Entità climatica del primo evento a quest’ora. |
| `action` | `set_temperature`, `set_hvac_mode` o `turn_off`. |
| `hvac_mode` | Modalità HVAC prevista da Velair, quando applicabile. |
| `temperature` | Obiettivo singolo, quando applicabile. |
| `target_temp_low` / `target_temp_high` | Obiettivo a intervallo, quando applicabile. |
| `weekday` / `start` | Origine del blocco della programmazione. |
| `when` | Orario effettivo di applicazione. |
| `target_when` | Orario originale di comfort quando il precondizionamento anticipa l’avvio. |
| `event_count` | Numero di eventi con lo stesso orario di applicazione. |
| `events` | Elenco serializzato di tutti gli eventi con lo stesso orario. |

Esempio:

```yaml
{{ state_attr('sensor.velair_next_scheduled_event', 'action') == 'turn_off' }}
```

<a id="current-schedule-state"></a>
### Stato attuale della programmazione

Esempio di ID dell’entità:

```text
sensor.velair_current_schedule_state
```

Stati:

```text
paused
override_active
scheduled
idle
temperature_migration_required
```

Attributi principali:

| Attributo | Significato |
| --- | --- |
| `global_mode` | Modalità globale attuale del pianificatore. |
| `paused_started_at` | Inizio della pausa globale, quando applicabile. |
| `paused_until` | Scadenza prevista della pausa globale, quando applicabile. |

<a id="diagnostics-status"></a>
### Stato della diagnostica

Esempio di ID dell’entità:

```text
sensor.velair_diagnostics_status
```

Stati:

```text
ok
warning
error
```

Attributi principali:

| Attributo | Significato |
| --- | --- |
| `scheduler_mode` / `scheduler_status` | Contesto compatto del pianificatore. |
| `units_ok` / `units_warning` / `units_error` | Conteggi di stato per dispositivo. |
| `issue_count` | Totale dei problemi attivi in esecuzione. |
| `warning_count` / `error_count` | Conteggi per gravità dei problemi attivi. |
| `issue_codes` | Codici stabili dei problemi, adatti alle automazioni. |

Esempio di trigger:

```yaml
triggers:
  - trigger: state
    entity_id: sensor.velair_diagnostics_status
    to: error
```

<a id="per-climate-sensors"></a>
## Sensori per dispositivo climatico

Per un dispositivo gestito come `climate.living_room`, Home Assistant crea normalmente ID associati come `sensor.velair_control_living_room`. Usa gli ID reali del registro in dashboard e automazioni.

<a id="zone-active-target-temperature"></a>
### Temperatura obiettivo attiva della zona

Attributi principali:

| Attributo | Significato |
| --- | --- |
| `action` | Azione dell’obiettivo Velair attivo. |
| `hvac_mode` | Modalità HVAC scelta dal blocco attivo o dalla sostituzione. |
| `temperature` | Obiettivo singolo attivo. |
| `target_temp_low` / `target_temp_high` | Obiettivo a intervallo attivo per modalità native a intervallo. |
| `weekday` / `start` | Origine nella programmazione del blocco attivo. |
| `when` | Orario di applicazione dell’obiettivo attivo. |
| `target_when` | Orario di comfort quando il precondizionamento ha anticipato l’applicazione. |

Per gli obiettivi a intervallo nativo, lo stato del sensore non è disponibile perché non esiste un singolo valore corretto. Leggi invece `target_temp_low` e `target_temp_high`.

<a id="zone-environmental-condition"></a>
### Condizione ambientale della zona

Stati:

```text
monitoring_off
no_readings
temperature_comfortable
humidity_comfortable
comfortable
cold
hot
dry
humid
cold_and_dry
cold_and_humid
hot_and_dry
hot_and_humid
```

Attributi principali:

| Attributo | Significato |
| --- | --- |
| `data_quality` | `complete`, `unverified`, `partial`, `stale` o `unavailable`. |
| `data_issues` | Codici stabili per letture mancanti, non aggiornate, non valide oppure utilizzabili ma con aggiornamento non verificabile. |
| `range_summary` | Risultato attuale dell’intervallo Comfort e confronto con Humidex. |
| `ventilation_opportunity` | Dati completi dell’opportunità di ventilazione. |
| `comfort_zone` | Modello Comfort scelto e intervallo effettivo di umidità. |
| `temperature_source` / `humidity_source` | Entità di origine delle letture interne. |
| `derived_metrics` | Dati abilitati di Humidex, punto di rugiada e umidità assoluta. |
| `outdoor` | Confronto facoltativo fra interno ed esterno. |
| `insights` | Indicazioni osservative ordinate con codici stabili. |

Esempio:

```yaml
{% set insights =
   state_attr('sensor.velair_climate_living_room_environmental_condition',
              'insights') or [] %}
{{ insights
   | selectattr('code', 'eq', 'ventilation_may_help_cool')
   | list | count > 0 }}
```

Consulta [Comfort ambientale](comfort.it.md) e [Sensori di controllo della zona e invio dei comandi](zone-sensors.it.md#environmental-condition) per tutti i dati Comfort.

<a id="zone-ventilation-opportunity"></a>
### Opportunità di ventilazione della zona

Stati:

```text
unavailable
no_opportunity
may_help
comfort_possible
trade_off
already_comfortable
```

Attributi principali:

| Attributo | Significato |
| --- | --- |
| `evaluation_scope` | Se Velair ha valutato temperatura, umidità o entrambe. |
| `reason` | Codice stabile del motivo, leggibile automaticamente. |
| `data_quality` / `data_issues` | Qualità del confronto esterno. |
| `outdoor_temperature_source` | Entità di origine della temperatura esterna. |
| `outdoor_humidity_source` | Entità di origine dell’umidità esterna, se configurata. |
| `potential_effects` | Effetti che Velair prevede possa avere l’aria esterna. |
| `blocked_by` | Condizioni che impediscono un risultato di opportunità più forte. |

Esempio:

```yaml
{{ is_state('sensor.velair_ventilation_opportunity_living_room',
            'comfort_possible') }}
```

Questo sensore è osservativo. Velair non apre mai finestre né cambia il controllo climatico in base al suo valore.

<a id="zone-air-quality"></a>
### Qualità dell’aria della zona

Stati:

```text
not_monitored
unavailable
good
elevated
poor
```

Attributi principali:

| Attributo | Significato |
| --- | --- |
| `availability` | Disponibilità della lettura CO2 attuale. |
| `co2_source` | Sensore CO2 usato per la valutazione. |

<a id="zone-override-state"></a>
### Stato della sostituzione della zona

Stati:

```text
none
boost
paused
disabled
```

Attributi principali:

| Attributo | Significato |
| --- | --- |
| `started_at` | Inizio della sostituzione attiva. |
| `until` | Scadenza prevista della sostituzione, quando applicabile. |
| `action` | Azione della sostituzione, quando applicabile. |
| `pause_id` | Identificatore della pausa attiva per una sola pausa. |
| `pause_count` / `pause_ids` | Contesto compatto di più pause. |
| `manual` | Se la pausa è una regolazione manuale. |

Usa questo sensore per lo stato di incremento e pausa. Usa **Controllo della zona** per sapere chi controlla il dispositivo, ad esempio automatico, manuale o esterno.

<a id="zone-control"></a>
### Controllo della zona

Stati:

```text
automatic
manual
external
```

Attributi principali:

| Attributo | Significato |
| --- | --- |
| `runtime_state` | `idle`, `scheduled`, `preconditioning`, `boost`, `paused`, `stopped`, `externally_managed` o `temperature_migration_required`. |
| `schedule_source` | `default`, `profile` o `profile_pause`. |
| `profile_id` / `profile_name` | Profilo effettivo responsabile della zona, quando applicabile. |
| `mode_id` / `mode_name` | Modalità selezionata, quando applicabile. |
| `manual_source` | `explicit`, `external_change` o `other`, solo durante il controllo manuale. |
| `manual_started_at` | Inizio della regolazione manuale. |
| `manual_until` | Scadenza prevista della regolazione manuale, quando applicabile. |
| `manual_policy` | `until_next_block`, `for_duration` o `until_resumed`. |

Esempio:

```yaml
{{ is_state('sensor.velair_control_living_room', 'automatic')
   and state_attr('sensor.velair_control_living_room', 'runtime_state')
       == 'scheduled' }}
```

<a id="zone-delivery-diagnostics"></a>
### Diagnostica di invio della zona

Questa entità diagnostica è disabilitata per impostazione predefinita. Abilitala nel registro delle entità Home Assistant quando una dashboard o un’automazione necessita di informazioni sull’invio dei comandi in esecuzione.

Stati:

```text
idle
success
failed
retrying
exhausted
invalid_intent
cancelled
unavailable
```

Attributi principali:

| Attributo | Significato |
| --- | --- |
| `updated_at` | Ultimo aggiornamento dello stato di invio. |
| `retry_count` | Tentativo rappresentato dallo stato attuale. |
| `last_error_at` / `last_error_code` | Ultimo errore di invio con dati sensibili rimossi. |
| `last_accepted_at` | Ultima accettazione Home Assistant di una sequenza completa di servizi Velair. |
| `last_accepted_source` | `automatic`, `manual`, `boost` o `automatic_reassertion`. |
| `last_accepted_action` | `set_temperature`, `set_hvac_mode`, `turn_off` o `other`. |
| `last_accepted_hvac_mode` | Modalità HVAC accettata da Home Assistant. |
| `last_accepted_temperature_unit` | Unità acquisita con l’obiettivo accettato. |
| `last_accepted_temperature` | Obiettivo singolo accettato, quando applicabile. |
| `last_accepted_target_temp_low` / `last_accepted_target_temp_high` | Obiettivo a intervallo accettato, quando applicabile. |

Esempio:

```yaml
triggers:
  - trigger: state
    entity_id: sensor.velair_delivery_diagnostics_living_room
    to: exhausted
```

`success` significa che Home Assistant ha accettato la sequenza di servizi. Non dimostra che il dispositivo fisico abbia raggiunto l’obiettivo.

<a id="zone-preconditioning-start"></a>
### Avvio del precondizionamento della zona

Attributi principali:

| Attributo | Significato |
| --- | --- |
| `status` | `planned` o `active`. |
| `scheduled_for` | Orario originale di comfort del blocco. |
| `lead_minutes` | Minuti di anticipo dell’avvio. |
| `direction` | Direzione di riscaldamento o raffrescamento. |
| `target_kind` / `target_boundary` | Contesto della previsione singola o sul limite dell’intervallo. |
| `boundary_temperature` | Limite usato dalla previsione. |
| `model_source` | Origine della previsione scelta da Velair. |
| `target_temperature` | Obiettivo singolo, quando applicabile. |
| `target_temp_low` / `target_temp_high` | Obiettivo a intervallo, quando applicabile. |
| `hvac_mode` | Modalità HVAC usata dall’evento di precondizionamento. |

<a id="zone-room-assist-state"></a>
### Stato Room Assist della zona

Stati:

```text
unavailable
not_configured
disabled
blocked
idle
holding
assisting
ready
```

Attributi principali:

| Attributo | Significato |
| --- | --- |
| `room_temperature_entity_id` | Fonte del sensore ambiente. |
| `target_temperature` | Obiettivo visibile della programmazione o sostituzione. |
| `applied_temperature` | Obiettivo applicato da Room Assist al dispositivo. |
| `applied_offset` | Offset attualmente applicato. |
| `calculated_temperature` | Obiettivo calcolato prima dei limiti. |
| `assist_delta` | Delta di assistenza attivo quando maggiore di zero. |
| `scheduled_target_guard` | Protezione che impedisce modifiche non sicure dell’obiettivo. |
| `hysteresis_phase` / `hysteresis_target` | Fase di esecuzione della fascia di mantenimento. |
| `deadband_low` / `deadband_high` | Fascia di mantenimento effettiva. |
| `target_temp_low` / `target_temp_high` | Obiettivo a intervallo nativo visibile. |
| `applied_target_temp_low` / `applied_target_temp_high` | Intervallo nativo inviato dopo l’assistenza. |
| `climate_target_temp_low` / `climate_target_temp_high` | Intervallo nativo comunicato attualmente dal dispositivo. |
| `range_shift` | Spostamento attuale dell’intervallo, quando applicabile. |
| `direction` | Direzione di riscaldamento o raffrescamento. |
| `hvac_mode` | Modalità HVAC coinvolta nell’obiettivo assistito. |
| `active_from` / `target_when` | Contesto temporale del blocco assistito. |

<a id="choosing-the-right-surface"></a>
## Scegliere lo strumento adatto

| Domanda | Usa |
| --- | --- |
| Cosa pianifica Velair come prossima azione? | **Prossimo evento programmato** |
| Velair è globalmente in pausa o programmato? | **Stato della programmazione** |
| Velair funziona correttamente? | **Stato della diagnostica** |
| Quale obiettivo controlla Velair adesso? | **Temperatura obiettivo attiva** |
| La stanza è confortevole, ha dati non aggiornati o letture mancanti? | **Condizione ambientale** |
| L’aria esterna potrebbe aiutare? | **Opportunità di ventilazione** |
| La CO2 è buona o scarsa? | **Qualità dell’aria** |
| Il dispositivo ha un incremento o una pausa? | **Sostituzione della zona** |
| Chi controlla questo dispositivo adesso? | **Controllo della zona** |
| Home Assistant ha accettato l’ultimo comando Velair? | **Diagnostica consegna** |
| Quando partirà il precondizionamento? | **Avvio del precondizionamento** |
| Cosa sta applicando Room Assist? | **Room Assist** |

Gli eventi sono preferibili quando un’automazione deve reagire a una transizione e sapere cosa è cambiato. I sensori sono preferibili quando una dashboard o un’automazione necessita dello stato attuale, anche dopo un riavvio.
