<a id="automation-events"></a>
# Eventi per le automazioni
<!-- velair-docs:start -->
Traduzioni: [Originale in inglese](automation-events.md) · [Español](automation-events.es.md) · [Français](automation-events.fr.md) · [Deutsch](automation-events.de.md) · [Italiano](automation-events.it.md) · [Nederlands](automation-events.nl.md) · [Polski](automation-events.pl.md) · [Português (Brasil)](automation-events.pt-br.md) · [Português (Portugal)](automation-events.pt-pt.md) · [Русский](automation-events.ru.md) · [Stato delle traduzioni](../translation-status.md)

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

Velair emette eventi Home Assistant grezzi e transitori per i cambiamenti durante l’esecuzione. I dati grezzi sul bus degli eventi esistono solo mentre Home Assistant li consegna; Velair non offre un archivio degli eventi o un’API per riprodurli. Aprire o aggiornare il pannello Velair non emette questi eventi.

La diagnostica è separata. Per le categorie abilitate può conservare un riepilogo con dati sensibili rimossi di alcuni eventi, in una cronologia limitata in memoria di al massimo 100 voci. La cronologia viene cancellata ogni volta che Velair o Home Assistant si riavvia, non è la cronologia Recorder e non cambia né estende la durata dell’evento originale di automazione.

Tutti gli eventi usano:

```yaml
event_type: velair_event
```

Filtra `event_data.event` e, per gli eventi di zona, `event_data.entity_id`:

```yaml
triggers:
  - trigger: event
    event_type: velair_event
    event_data:
      event: climate_target_applied
      entity_id: climate.living_room
```

Ogni insieme di dati contiene `domain: velair` e uno dei nomi di evento qui sotto.

<a id="external-climate-change-detected"></a>
## Rilevamento di una modifica esterna del dispositivo climatico

`external_climate_change_detected` viene emesso quando un dispositivo gestito cambia modalità HVAC o temperatura impostata e la modifica non può essere attribuita a un’azione climatica Velair. È osservativo: `non-Velair` non significa necessariamente una persona, perché l’origine potrebbe essere un telecomando o un’altra automazione.

Il rilevamento comprende `hvac_mode`, `temperature` singola e `target_temp_low`/`target_temp_high` nativi. Le letture ambientali e le opzioni di ventilazione, preset, oscillazione o umidità non producono questo evento. Le transizioni da o verso `unknown` e `unavailable` vengono ignorate. Consulta [Modifiche esterne e regolazione manuale](manual-control.it.md) per modello di attribuzione, limiti, criteri e sequenze complete.

```yaml
domain: velair
event: external_climate_change_detected
entity_id: climate.living_room
changed_fields: [hvac_mode, temperature]
previous:
  hvac_mode: "off"
  temperature: 24
current:
  hvac_mode: "cool"
  temperature: 23
policy: keep_automatic
```

`policy` è il criterio che governa la modifica. Durante una regolazione manuale attiva resta quello della sessione anche se nel frattempo è cambiato il valore predefinito futuro nelle impostazioni. `keep_automatic` significa che Velair non ha creato una regolazione manuale e ha invece ricalcolato il proprio controllo attuale. Quel rilevamento non ha quindi un corrispondente evento di ingresso `zone_control_changed`.

`zone_control_changed` viene emesso quando la zona entra in regolazione manuale o torna al controllo automatico. Il suo `control_mode` è `manual` o `automatic` ed è volutamente separato dalla modalità Manual di Velair.

```yaml
domain: velair
event: zone_control_changed
entity_id: climate.living_room
control_mode: manual
previous_control_mode: automatic
policy: for_duration
source: external_change
duration_minutes: 60
started_at: "2026-08-20T18:00:00+02:00"
until: "2026-08-20T19:00:00+02:00"
```

`source` è `external_change` quando una regolazione esterna ha creato la sessione ed `explicit` quando il pannello o `velair.enter_manual_adjustment` ha acquisito lo stato attuale del dispositivo. `duration_minutes` è presente solo per `for_duration`.

Un ingresso `until_resumed` omette `until`. I dati di uscita automatica contengono `reason: expired`; un’uscita esplicita contiene `reason: resumed`. Uscire dalla regolazione manuale non rimuove motivi di pausa indipendenti che potrebbero ancora bloccare l’applicazione fisica della programmazione.

Le azioni di servizio equivalenti sono:

```yaml
action: velair.set_external_change_policy
data:
  entity_id: climate.living_room
  policy: for_duration
  duration_minutes: 60
```

```yaml
action: velair.resume_automatic_control
data:
  entity_id: climate.living_room
```

<a id="diagnostic-issue-changed"></a>
## Modifica di un problema diagnostico

`diagnostic_issue_changed` viene emesso quando un problema diagnostico verificabile viene rilevato o risolto. Velair considera i problemi presenti all’avvio come stato iniziale, quindi riavviare Home Assistant non emette una raffica di problemi già attivi. I problemi invariati non vengono duplicati.

L’identità del problema è composta da `code`, un `entity_id` facoltativo del dispositivo gestito e un `purpose` facoltativo del sensore. I dati non contengono messaggi grezzi di eccezione, identificatori di profilo/modalità/pausa o cause dedotte. `change` è `detected` o `resolved`; `severity` è `warning` o `error`.

```yaml
domain: velair
event: diagnostic_issue_changed
change: detected
severity: error
code: delivery_exhausted
entity_id: climate.living_room
```

Per esempio, invia una notifica ogni volta che Velair rileva un nuovo errore:

```yaml
alias: Notify about new Velair errors
triggers:
  - trigger: event
    event_type: velair_event
    event_data:
      event: diagnostic_issue_changed
      change: detected
      severity: error
actions:
  - action: notify.notify
    data:
      message: "Velair detected an error. Open Diagnostics for details."
```

Per lo stato complessivo, usa invece il sensore **Stato della diagnostica**. Il suo ID può essere cambiato in Home Assistant, quindi selezionalo nell’editor dell’automazione:

```yaml
triggers:
  - trigger: state
    entity_id: sensor.velair_diagnostics_status
    to: "error"
```

<a id="profile-changed"></a>
## Cambio dei profili

`profile_changed` viene emesso dopo il salvataggio persistente di un insieme diverso di profili climatici o delle programmazioni Default. Selezionare direttamente lo stesso insieme attivo può spostare l’entità nativa della modalità su Manual, ma non emette `profile_changed` perché i profili effettivi non sono cambiati.

```yaml
domain: velair
event: profile_changed
profile_ids:
  - away
  - bedrooms
previous_profile_ids: []
source: select
```

`source` identifica l’origine della selezione effettiva. I valori pubblici sono `panel`, `service` e `select`; le operazioni interne del ciclo di vita possono pubblicare valori più specifici come `profile_deleted` o `mode_updated`. Gli elenchi ordinati degli ID descrivono gli interi insiemi attuale e precedente. Un elenco `profile_ids` vuoto rappresenta Default.

Per esempio, questa automazione reagisce quando il profilo con ID `away` entra nell’insieme attivo:

```yaml
alias: Notify when Away profile becomes active
triggers:
  - trigger: event
    event_type: velair_event
    event_data:
      event: profile_changed
conditions:
  - condition: template
    value_template: "{{ 'away' in trigger.event.data.profile_ids }}"
actions:
  - action: notify.notify
    data:
      message: Away profile is active
```

Per reagire al ritorno alle programmazioni Default, usa una condizione template che controlli `trigger.event.data.profile_ids == []`.

<a id="scheduler-mode-changed"></a>
## Cambio della modalità del pianificatore

`scheduler_mode_changed` viene emesso quando cambia la modalità globale o la scadenza della pausa, compresa la scadenza automatica. Ripetere la stessa modalità e scadenza non lo emette.

```yaml
domain: velair
event: scheduler_mode_changed
mode: paused
previous_mode: auto
paused_until: "2026-07-09T18:30:00+02:00"
paused_started_at: "2026-07-09T17:00:00+02:00"
```

<a id="climate-target-applied"></a>
## Applicazione dell’obiettivo climatico

`climate_target_applied` viene emesso dopo che Velair applica un obiettivo programmato, un’azione di sola modalità, sole opzioni, spegnimento, programmazione ripristinata, programmazione all’avvio o una chiamata a `velair.set_temperature` / `velair.set_hvac_mode`. Le impostazioni facoltative non supportate vengono omesse.

```yaml
domain: velair
event: climate_target_applied
entity_id: climate.bedroom
action: set_temperature
temperature: 23
hvac_mode: cool
fan_mode: low
preset_mode: sleep
swing_mode: off
swing_horizontal_mode: center
humidity: 50
weekday: thursday
start: "22:30"
target_when: "2026-07-09T22:30:00+02:00"
source: scheduled_event
```

I valori comuni di `source` sono `scheduled_event`, `current_schedule`, `schedule_saved`, `scheduler_resumed`, `startup`, `service_set_temperature`, `service_set_hvac_mode`, `boost_ended`, `zone_paused`, `zone_resumed` e `zone_pause_expired`.

Per un obiettivo a intervallo, `temperature` è omessa e l’evento contiene entrambi i limiti:

```yaml
target_temp_low: 20
target_temp_high: 24
hvac_mode: heat_cool
```

Per un blocco di sola modalità, `action` è `set_hvac_mode`, `hvac_mode` è la modalità applicata e tutti i campi degli obiettivi di temperatura sono omessi. Le automazioni possono così distinguere un passaggio di modalità da un cambio di obiettivo. La stessa struttura viene usata da `velair.set_hvac_mode`, con `source: service_set_hvac_mode` e senza i campi `weekday` o `start` specifici della programmazione.

Per un blocco di sole opzioni, `action` è `set_climate_options`. L’evento include i campi facoltativi applicati, come `preset_mode` o `fan_mode`, e omette obiettivi di temperatura e `hvac_mode`. Questi blocchi non accendono un dispositivo spento.

<a id="preconditioning-plan-updated"></a>
## Aggiornamento del piano di precondizionamento

`preconditioning_plan_updated` viene emesso quando viene pubblicato un nuovo piano di avvio anticipato o cambia un input o un risultato del calcolo. Ricalcoli identici non vengono duplicati. La pianificazione all’avvio può emettere questo evento; calcolare dati solo per una risposta al pannello non lo emette.

```yaml
domain: velair
event: preconditioning_plan_updated
entity_id: climate.living_room
scheduled_when: "2026-01-15T07:00:00+01:00"
preconditioning_when: "2026-01-15T05:35:00+01:00"
lead_minutes: 85
direction: heat
target_kind: scalar
target_boundary: temperature
boundary_temperature: 21
target_temperature: 21
current_temperature: 17.8
temperature_delta: 3.2
hvac_mode: heat
preset_mode: comfort
model_source: history
complete_sample_count: 12
partial_sample_count: 3
invalid_sample_count: 1
similar_sample_count: 8
comfort_percentile: 90
used_outdoor_temperature: true
outdoor_temperature: -1.5
weekday: thursday
start: "07:00"
preconditioning_diagnostics:
  direction: heat
  target_kind: scalar
  target_boundary: temperature
  boundary_temperature: 21
  current_temperature: 17.8
  delta_temperature: 3.2
  complete_sample_count: 12
  partial_sample_count: 3
  invalid_sample_count: 1
  similar_sample_count: 8
  comfort_percentile: 90
  complete_rate_minutes_per_degree: 23.4
  complete_estimate_minutes: 74.88
  partial_floor_minutes: 82
  combined_estimate_minutes: 82
  rounded_estimate_minutes: 85
  final_lead_minutes: 85
  limited_by_min_start: false
  limited_by_max_lead: false
  source: history
  used_outdoor_temperature: true
  initial_model_lead_minutes: 110
```

Per un piano a intervallo nativo, `target_temperature` è `null` e i dati includono la coppia completa `target_temp_low` e `target_temp_high`. `target_kind` è `range`, `target_boundary` è `low` o `high` e `boundary_temperature` è il singolo limite effettivo usato dal predittore. `temperature_delta` viene misurato rispetto a quel limite. I piani singoli mantengono `target_kind: scalar` e `target_boundary: temperature`.

Per esempio, una previsione di riscaldamento per un intervallo `20–24 °C` include:

```yaml
direction: heat
target_kind: range
target_boundary: low
boundary_temperature: 20
target_temperature: null
target_temp_low: 20
target_temp_high: 24
current_temperature: 18
temperature_delta: 2
hvac_mode: heat_cool
```

<a id="preconditioning-plan-cancelled"></a>
## Annullamento del piano di precondizionamento

`preconditioning_plan_cancelled` viene emesso una volta quando un piano già pubblicato non esiste più, per esempio dopo una modifica della programmazione, una differenza di temperatura minore, la disabilitazione del precondizionamento o l’uscita dalla modalità automatica. Ripete l’ultimo piano pubblicato per permettere all’automazione di identificare cosa è stato annullato.

```yaml
domain: velair
event: preconditioning_plan_cancelled
entity_id: climate.living_room
scheduled_when: "2026-01-15T07:00:00+01:00"
preconditioning_when: "2026-01-15T05:35:00+01:00"
lead_minutes: 85
direction: heat
target_kind: scalar
target_boundary: temperature
boundary_temperature: 21
target_temperature: 21
current_temperature: 17.8
temperature_delta: 3.2
hvac_mode: heat
preset_mode: comfort
model_source: history
complete_sample_count: 12
partial_sample_count: 3
invalid_sample_count: 1
similar_sample_count: 8
comfort_percentile: 90
used_outdoor_temperature: true
outdoor_temperature: -1.5
weekday: thursday
start: "07:00"
preconditioning_diagnostics:
  direction: heat
  target_kind: scalar
  target_boundary: temperature
  boundary_temperature: 21
  current_temperature: 17.8
  delta_temperature: 3.2
  complete_sample_count: 12
  partial_sample_count: 3
  invalid_sample_count: 1
  similar_sample_count: 8
  comfort_percentile: 90
  complete_rate_minutes_per_degree: 23.4
  complete_estimate_minutes: 74.88
  partial_floor_minutes: 82
  combined_estimate_minutes: 82
  rounded_estimate_minutes: 85
  final_lead_minutes: 85
  limited_by_min_start: false
  limited_by_max_lead: false
  source: history
  used_outdoor_temperature: true
  initial_model_lead_minutes: 110
reason: no_longer_planned
```

`reason` è `no_longer_planned` quando il ricalcolo rimuove un piano e `scheduler_not_auto` quando la programmazione automatica viene messa in pausa o arrestata.

<a id="preconditioning-observation-recorded"></a>
## Registrazione di un’osservazione di precondizionamento

`preconditioning_observation_recorded` viene emesso dopo che un’osservazione di apprendimento è stata verificata, ridotta alla dimensione di cronologia configurata e salvata. `quality` può essere `complete`, `partial` o `invalid`.

```yaml
domain: velair
event: preconditioning_observation_recorded
entity_id: climate.living_room
direction: heat
created_at: "2026-01-15T06:52:00+01:00"
scheduled_time: "2026-01-15T07:00:00+01:00"
start_time: "2026-01-15T05:35:00+01:00"
target_temp: 21
initial_temp: 17.8
observed_temp: 20.8
outdoor_temp_start: -2.1
outdoor_temp_target: -1.5
temperature_source: room_sensor
room_temperature_entity_id: sensor.living_room_temperature
delta_t: 3.2
startup_minutes: 85
reached: true
minutes_to_reach: 77
quality: complete
stored_sample_count: 16
```

Un’osservazione non valida include anche `invalid_reason`.

<a id="comfort-assessment-changed"></a>
## Cambio della valutazione di comfort

`comfort_assessment_changed` viene emesso quando cambia `condition`, `air_quality`, `data_quality`, `data_issues` o lo stato semantico di una misura derivata abilitata. Lo stato semantico comprende disponibilità, fonte, entità, unità, problemi e condizione. Le variazioni numeriche nelle letture di base o derivate aggiornano comunque l’interfaccia e gli attributi dei sensori senza emettere un altro evento. Questo evita di sovraccaricare il bus degli eventi.

```yaml
domain: velair
event: comfort_assessment_changed
entity_id: climate.office
condition: hot_and_humid
air_quality: elevated
data_quality: complete
data_issues: []
range_summary:
  status: mixed
  thermal_relation: mixed
  positions:
    temperature: above
    humidity: above
    humidex: within
previous_range_summary:
  status: outside_range
  thermal_relation: aligned
  positions:
    temperature: above
    humidity: above
    humidex: above
range_summary_changed: true
range_status_changed: true
temperature:
  metric: temperature
  availability: current
  freshness: reported
  condition: hot
  source: sensor
  entity_id: sensor.office_temperature
  value: 27.1
  min: 20
  max: 24
humidity:
  metric: humidity
  availability: current
  freshness: reported
  condition: humid
  source: sensor
  entity_id: sensor.office_humidity
  value: 67
  min: 40
  max: 60
comfort_zone:
  model: temperature_aware
  temperature_min: 20
  temperature_max: 24
  points:
    - temperature: 20
      humidity_min: 40
      humidity_max: 60
    - temperature: 24
      humidity_min: 35
      humidity_max: 50
  effective_humidity_range:
    temperature: 27.1
    minimum: 35
    maximum: 50
co2:
  metric: co2
  availability: current
  condition: elevated
  source: sensor
  entity_id: sensor.office_co2
  value: 1180
  attention: 1000
  max: 1500
derived_metrics:
  humidex:
    metric: humidex
    availability: current
    condition: null
    source: velair
    entity_id: null
    value: 23.8
    unit: null
    temperature_range_position: within
    issues: []
    input_entity_ids:
      - sensor.office_temperature
      - sensor.office_humidity
  dew_point:
    metric: dew_point
    availability: current
    condition: null
    source: velair
    entity_id: null
    value: 15.1
    unit: °C
    issues: []
    input_entity_ids:
      - sensor.office_temperature
      - sensor.office_humidity
outdoor:
  enabled: true
  data_quality: complete
  data_issues: []
  temperature:
    metric: outdoor_temperature
    availability: current
    source: sensor
    entity_id: sensor.outdoor_temperature
    value: 18
    unit: °C
  humidity:
    metric: outdoor_humidity
    availability: current
    source: sensor
    entity_id: sensor.outdoor_humidity
    value: 55
    unit: "%"
  indoor_absolute_humidity:
    metric: indoor_absolute_humidity
    availability: current
    source: velair
    entity_id: null
    value: 12.7
    unit: g/m³
    input_entity_ids:
      - sensor.office_temperature
      - sensor.office_humidity
  absolute_humidity:
    metric: outdoor_absolute_humidity
    availability: current
    source: velair
    entity_id: null
    value: 8.5
    unit: g/m³
    input_entity_ids:
      - sensor.outdoor_temperature
      - sensor.outdoor_humidity
  guidance_thresholds:
    temperature_delta: 1
    temperature_unit: °C
    humidity_delta_percentage_points: 5
    absolute_humidity_delta_g_m3: 1
  comparison:
    temperature:
      availability: current
      delta: -9.1
      effect: cooler
      potential: cooling
      blocked_by: []
    humidity:
      availability: current
      absolute_humidity_delta: -4.2
      equivalent_indoor_relative_humidity: 43
      equivalent_indoor_relative_humidity_delta: -24
      effect: drier
      potential: drying
      blocked_by: []
insights:
  - code: co2_elevated
    kind: context
    tone: attention
    metrics:
      - co2
  - code: ventilation_may_help_cool
    kind: context
    tone: cool
    metrics:
      - temperature
      - outdoor
ventilation_opportunity:
  state: comfort_possible
  evaluation_scope: temperature_and_humidity
  potential_effects:
    - cooling
    - drying
  blocked_by: []
  reason: outdoor_conditions_within_comfort
```

I campi dell’intervallo sono destinati ad automazioni semplici senza sostituire il campo fisico compatibile `condition`:

Per template di stato attuale e trigger di stato, consulta il [contratto completo dell’entità Condizione ambientale](zone-sensors.it.md#environmental-condition). Usa questo evento quando conta il valore precedente o la transizione precisa.

| `status` | Significato |
| --- | --- |
| `within_range` | Ogni valore monitorato utilizzabile è nel proprio intervallo configurato. |
| `outside_range` | Almeno un valore monitorato utilizzabile è fuori dall’intervallo, con temperatura e Humidex allineati quando entrambi sono abilitati. |
| `mixed` | Temperatura attuale e Humidex occupano posizioni diverse rispetto all’intervallo. |
| `unavailable` | Un valore monitorato necessario, o Humidex abilitato, non può essere valutato al momento. |

| `thermal_relation` | Significato |
| --- | --- |
| `aligned` | Temperatura attuale e Humidex hanno la stessa posizione. |
| `mixed` | Temperatura attuale e Humidex hanno posizioni diverse. |
| `not_evaluated` | Humidex è disabilitato. |
| `unavailable` | Temperatura o Humidex abilitato non possono essere valutati al momento. |

Ogni voce di `positions` è `below`, `within`, `above` o `null`. L’evento include anche l’intero riepilogo precedente. `range_summary_changed` segnala qualsiasi cambio di stato, relazione termica o posizione; `range_status_changed` segnala solo un cambio dello `status` complessivo. Entrambi i flag sono `false` quando l’evento è causato da un’altra parte della valutazione Comfort.

`comfort_zone` usa l’unità del dispositivo gestito. Il suo intervallo effettivo è lo stesso usato dalla condizione di umidità e dalle indicazioni esterne. Nel modello guidato o personalizzato dipendente dalla temperatura è `null` quando la temperatura non è valutabile, quindi le automazioni non devono sostituirlo con i vecchi limiti fissi di umidità. Le normali variazioni numeriche dell’intervallo aggiornano attributi dell’entità e API senza eventi, salvo che cambi anche un risultato semantico documentato. L’evento contiene inoltre `ventilation_opportunity` attuale. Le variazioni di stato, ambito, effetti, impedimenti o motivo sono semantiche; variazioni numeriche esterne che lasciano invariati quei campi non emettono altri eventi.

Per esempio, questa automazione reagisce solo quando una zona passa da dentro a fuori dai propri intervalli configurati:

```yaml
automation:
  - alias: "Velair office outside configured ranges"
    triggers:
      - trigger: event
        event_type: velair_event
        event_data:
          domain: velair
          event: comfort_assessment_changed
          entity_id: climate.office
    conditions:
      - condition: template
        value_template: >-
          {{ trigger.event.data.range_status_changed
             and trigger.event.data.range_summary.status == 'outside_range' }}
    actions:
      - action: notify.notify
        data:
          message: "The office moved outside its configured Comfort ranges."
```

`insights` è un’interpretazione ordinata dei dati interni attuali, disponibile solo in esecuzione. I suoi campi sono identificatori stabili invece di testo localizzato. Un cambio semantico delle indicazioni può emettere questo evento; letture non aggiornate, mancanti o non valide non producono indicazioni. I dati contengono l’intero elenco attuale, incluso `insights: []` quando scompare l’ultima indicazione contestuale. Il campo esistente `condition` resta il riepilogo della valutazione e non viene duplicato come indicazione.

Quando è abilitato il confronto esterno, l’evento contiene anche l’intero sottoalbero `outdoor`. Qualità e problemi propri non cambiano mai `data_quality` o `data_issues` interni. Gli eventi reagiscono a variazioni di disponibilità, qualità, `effect`, `potential`, `blocked_by` o elenco delle indicazioni; normali variazioni numeriche nello stesso risultato semantico non emettono altri eventi. `guidance_thresholds` indica la sensibilità effettiva per zona usata per il risultato. Modificare una soglia senza cambiare il risultato semantico aggiorna lo stato attuale ma non emette eventi. Le misure attuali includono `freshness: reported | unverified`. La qualità `data_quality` interna o esterna può essere `unverified` quando tutte le letture sono utilizzabili ma almeno una non ha un orario di segnalazione verificabile. I sensori diretti possono diventare non aggiornati alla scadenza del tempo massimo dall’ultima segnalazione senza cambiare valore. Il sottoalbero fornisce esplicitamente l’umidità assoluta interna: i client non devono ricostruirla da differenze arrotondate. I codici di ventilazione descrivono solo un’opportunità o un compromesso. Non significano che Velair abbia aperto una finestra o cambiato il dispositivo climatico.

Solo i dati derivati Humidex includono `temperature_range_position`. Il campo è sempre presente lì ed è `below`, `within`, `above` o `null`; passare fra questi valori può emettere l’evento. È un confronto osservativo con l’intervallo di temperatura configurato, non un giudizio di comfort né un’istruzione di controllo climatico.

<a id="room-sensor-assist-state-changed"></a>
## Cambio dello stato di assistenza con sensore ambiente

`room_sensor_assist_state_changed` viene emesso quando Room Assist viene abilitato o disabilitato tramite pannello, scheda Lovelace, API o servizio. Ripetere lo stesso stato non lo emette.

```yaml
domain: velair
event: room_sensor_assist_state_changed
entity_id: climate.living_room
enabled: true
previous_enabled: false
room_temperature_entity_id: sensor.living_room_temperature
deadband: 0.3
max_delta: 3
debounce_seconds: 20
```

<a id="room-sensor-assist-updated"></a>
## Aggiornamento dell’assistenza con sensore ambiente

`room_sensor_assist_updated` viene emesso solo dopo che Room Assist invia un obiettivo temporaneo modificato al dispositivo. Variazioni inferiori al passo di temperatura non lo emettono.

```yaml
domain: velair
event: room_sensor_assist_updated
entity_id: climate.living_room
room_temperature_entity_id: sensor.living_room_temperature
target_temperature: 21
applied_temperature: 23.5
room_temperature: 18
climate_temperature: 20.5
assist_delta: 3
applied_offset: 3
direction: heat
hvac_mode: heat
hysteresis_phase: towards_upper
hysteresis_target: 21.3
deadband_low: 20.7
deadband_high: 21.3
reason: scheduled_event
```

Per un obiettivo singolo fisso `heat` o `cool` con fascia di tolleranza diversa da zero, i quattro campi di isteresi identificano la fase di esecuzione confermata, il limite attivo e l’intera fascia di commutazione. Sono omessi per tolleranza zero, modalità automatiche a obiettivo singolo e intervalli nativi. La fase resta invariata mentre la stanza attraversa il centro programmato e si inverte solo quando il sensore esterno raggiunge il limite opposto.

Quando l’obiettivo programmato protegge un risultato fisso di riscaldamento o raffrescamento, l’aggiornamento singolo aggiunge due campi facoltativi:

```yaml
target_temperature: 22
calculated_temperature: 20
applied_temperature: 22
scheduled_target_guard: cooling_floor
direction: cool
```

`calculated_temperature` è l’obiettivo supportato prima della protezione programmata. Le automazioni esistenti restano compatibili perché i campi sono aggiuntivi e omessi quando la protezione non è attiva.

Per un intervallo nativo, i campi dell’obiettivo singolo sono omessi e vengono indicate entrambe le fasce complete:

```yaml
target_temp_low: 19
target_temp_high: 24
applied_target_temp_low: 23
applied_target_temp_high: 28
room_temperature: 18
climate_temperature: 22
assist_delta: 1
range_shift: 4
direction: heat
hvac_mode: heat_cool
```

<a id="room-sensor-assist-restored"></a>
## Ripristino dell’assistenza con sensore ambiente

`room_sensor_assist_restored` viene emesso quando Room Assist smette di gestire l’obiettivo temporaneo e ripristina, dove possibile, quello programmato normale. Per un ciclo fisso di riscaldamento o raffrescamento, raggiungere il limite attivo della fascia di tolleranza resta parte di `room_sensor_assist_updated`: inverte la fase di isteresi e può cambiare `applied_offset` con segno. L’obiettivo programmato resta il limite di sicurezza nella fase senza richiesta termica anche se la lettura del dispositivo stesso subisce uno scostamento. Se l’arrotondamento al passo rende inutile un nuovo comando, la fase cambia comunque nello stato in tempo reale ma non viene emesso un aggiornamento, come descritto sopra. `reason` spiega una transizione emessa.

```yaml
domain: velair
event: room_sensor_assist_restored
entity_id: climate.living_room
room_temperature_entity_id: sensor.living_room_temperature
target_temperature: 21
applied_temperature: 21
room_temperature: 21.1
climate_temperature: 20.5
assist_delta: 0
applied_offset: 0
direction: heat
hvac_mode: heat
reason: assist_disabled
```

Altri motivi includono `assist_disabled`, `boost_started`, `manual_target`, `missing_temperature`, `no_active_target`, `not_auto`, `schedule_changed`, `schedule_cleared`, `scheduler_mode_changed`, `scheduler_stopped`, `settings_updated`, `turn_off`, `unsupported_mode`, `zone_paused` e `zone_unavailable`. `unsupported_temperature_range` resta possibile per un vecchio obiettivo singolo non applicabile quando la modalità effettiva richiede un intervallo nativo; i blocchi validi a intervallo sono supportati.

<a id="boost-started"></a>
## Avvio di un incremento

`boost_started` viene emesso dopo l’applicazione e il salvataggio dell’obiettivo e della sostituzione dell’incremento. Sostituire un incremento attivo emette un altro `boost_started`.

Gli incrementi a intervallo usano `target_temp_low` e `target_temp_high` invece di `temperature`. I dati di ripristino mantengono la stessa forma dell’obiettivo.

```yaml
domain: velair
event: boost_started
entity_id: climate.bedroom
temperature: 22
hvac_mode: cool
fan_mode: high
preset_mode: comfort
swing_mode: vertical
swing_horizontal_mode: wide
humidity: 48
started_at: "2026-07-09T14:00:00+02:00"
until: "2026-07-09T15:30:00+02:00"
```

<a id="boost-ended"></a>
## Fine di un incremento

`boost_ended` viene emesso quando un incremento scade o viene annullato. `reason` è `expired` o `manual`. `restoration` descrive lo stato che Velair applica poi.

```yaml
domain: velair
event: boost_ended
entity_id: climate.bedroom
temperature: 22
hvac_mode: cool
fan_mode: high
preset_mode: comfort
swing_mode: vertical
swing_horizontal_mode: wide
humidity: 48
started_at: "2026-07-09T14:00:00+02:00"
until: "2026-07-09T15:30:00+02:00"
reason: manual
restoration:
  type: schedule
  source: boost_ended
  target:
    action: set_temperature
    temperature: 24
    hvac_mode: cool
    fan_mode: low
    preset_mode: sleep
    swing_mode: off
    swing_horizontal_mode: center
    humidity: 50
    weekday: thursday
    start: "15:00"
```

`restoration.type` può essere `schedule`, `previous_state` o `none`. Un ripristino programmato emette anche `climate_target_applied` con `source: boost_ended`.

<a id="zone-paused"></a>
## Pausa della zona

`zone_paused` viene emesso quando una zona gestita passa da zero motivi di pausa a uno. Se `action` è `turn_off`, viene prima emesso `climate_target_applied` per lo spegnimento.

```yaml
domain: velair
event: zone_paused
entity_id: climate.guest_room
started_at: "2026-07-09T12:00:00+02:00"
until: "2026-07-12T18:00:00+02:00"
action: turn_off
pause_id: velair_window_guard
```

`zone_pause_added`, `zone_pause_updated` e `zone_pause_removed` descrivono le modifiche dei singoli motivi e includono `pause_id` quando identificati. Ripetere esattamente un’operazione identificata non emette eventi. I motivi precedenti e manuali omettono l’ID.

```yaml
domain: velair
event: zone_pause_added
entity_id: climate.guest_room
started_at: "2026-07-09T12:00:00+02:00"
until: null
action: turn_off
pause_id: velair_window_guard
```

```yaml
domain: velair
event: zone_pause_updated
entity_id: climate.guest_room
started_at: "2026-07-09T12:00:00+02:00"
until: "2026-07-09T18:00:00+02:00"
action: turn_off
pause_id: velair_window_guard
```

```yaml
domain: velair
event: zone_pause_removed
entity_id: climate.guest_room
started_at: "2026-07-09T12:00:00+02:00"
until: "2026-07-09T18:00:00+02:00"
action: turn_off
pause_id: velair_window_guard
reason: expired
```

<a id="zone-resumed"></a>
## Ripresa della zona

`zone_resumed` viene emesso solo quando l’ultimo motivo viene rimosso manualmente o scade. Quando la programmazione attuale viene riapplicata, un successivo `climate_target_applied` descrive quell’obiettivo.

```yaml
domain: velair
event: zone_resumed
entity_id: climate.guest_room
started_at: "2026-07-09T12:00:00+02:00"
until: "2026-07-12T18:00:00+02:00"
action: turn_off
pause_id: velair_window_guard
reason: expired
```

<a id="operations-without-runtime-events"></a>
## Operazioni senza eventi di esecuzione

Creare modelli, cambiare preferenze del pannello, importare dati e ripristinare impostazioni aggiorna la configurazione ma non emette eventi di automazione in esecuzione. Le modifiche della programmazione non hanno un evento di configurazione dedicato, ma possono produrre annullamenti/aggiornamenti del piano o `climate_target_applied` quando cambiano l’obiettivo attualmente attivo.

<a id="delivery-meaning"></a>
## Significato dell’invio

Un evento di applicazione viene emesso solo dopo che Home Assistant accetta l’intera sequenza di chiamate di modalità, obiettivo e opzioni supportate per l’intento attuale di Velair. Tentativi falliti o superati non lo emettono. L’evento conferma l’accettazione del comando, non che l’apparecchiatura fisica abbia già raggiunto la temperatura o lo stato HVAC richiesto.
