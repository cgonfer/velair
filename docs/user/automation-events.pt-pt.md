<a id="automation-events"></a>
# Eventos para automações
<!-- velair-docs:start -->
Traduções: [Original em inglês](automation-events.md) · [Español](automation-events.es.md) · [Français](automation-events.fr.md) · [Deutsch](automation-events.de.md) · [Italiano](automation-events.it.md) · [Nederlands](automation-events.nl.md) · [Polski](automation-events.pl.md) · [Português (Brasil)](automation-events.pt-br.md) · [Português (Portugal)](automation-events.pt-pt.md) · [Русский](automation-events.ru.md) · [Estado das traduções](../translation-status.md)

<details>
<summary>Estado desta tradução</summary>

| Informação | Estado |
| --- | --- |
| Versão de referência | 1.9.0-beta.2 |
| Última sincronização | 2026-10-17 |
| Revisão linguística | Tradução assistida por IA |
| Em relação ao original | Sincronizada com o original em inglês. |

</details>

---
<!-- velair-docs:end -->

O Velair emite eventos brutos e transitórios do Home Assistant para mudanças durante a execução. Os dados brutos no barramento de eventos existem apenas enquanto o Home Assistant os entrega; o Velair não oferece um ficheiro de eventos nem uma API de reprodução. Abrir ou atualizar o painel do Velair não emite esses eventos.

O Diagnóstico é separado. Para categorias ativadas, ele pode manter um resumo sanitizado de eventos selecionados num histórico em memória limitado a 100 entradas. Esse histórico é apagado sempre que o Velair ou o Home Assistant reinicia, não é o histórico do Recorder e não altera nem prolonga a existência do evento original de automação.

Todos os eventos usam:

```yaml
event_type: velair_event
```

Filtre `event_data.event` e, para eventos de zona, `event_data.entity_id`:

```yaml
triggers:
  - trigger: event
    event_type: velair_event
    event_data:
      event: climate_target_applied
      entity_id: climate.living_room
```

Todos os dados enviados contêm `domain: velair` e um dos nomes de evento abaixo.

<a id="external-climate-change-detected"></a>
## Mudança externa de controlo da climatização detetada

`external_climate_change_detected` é emitido quando uma entidade de climatização gerida muda de modo HVAC ou temperatura-alvo e a mudança não pode ser atribuída a uma ação de climatização do Velair. O evento é uma observação: `non-Velair` não significa necessariamente uma pessoa, pois a origem pode ser um controlo remoto ou outra automação.

A deteção cobre `hvac_mode`, a temperatura única `temperature` e o intervalo nativo `target_temp_low`/`target_temp_high`. Leituras ambientais e opções de ventoinha, predefinição, oscilação ou humidade não produzem esse evento. Transições para ou de `unknown` e `unavailable` são ignoradas. Consulte [Mudanças externas e Ajuste manual](manual-control.pt-pt.md) para o modelo de identificação de origem, os limites, as políticas e os exemplos completos de sequência temporal.

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

`policy` é a política que rege a mudança. Durante um Ajuste manual ativo, ela continua a ser a política daquela sessão, mesmo que o valor predefinido para sessões futuras tenha sido alterado nas Definições. `keep_automatic` significa que o Velair não criou um Ajuste manual e, em vez disso, voltou a determinar o comando que tem prioridade. Portanto, essa deteção não tem um evento correspondente de entrada `zone_control_changed`.

`zone_control_changed` é emitido quando a zona entra em Ajuste manual ou retorna ao controlo automático. O seu `control_mode` é `manual` ou `automatic` e é deliberadamente separado do Modo Manual do Velair.

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

`source` é `external_change` quando um ajuste externo criou a sessão e `explicit` quando o painel ou `velair.enter_manual_adjustment` capturou o estado atual da climatização. `duration_minutes` aparece apenas para `for_duration`.

Uma entrada `until_resumed` omite `until`. Os dados do encerramento automático contêm `reason: expired`; um encerramento explícito contém `reason: resumed`. Sair do Ajuste manual não remove motivos de pausa independentes que ainda possam impedir a aplicação da programação ao equipamento.

As ações de serviço equivalentes são:

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
## Ocorrência de diagnóstico alterada

`diagnostic_issue_changed` é emitido quando uma ocorrência de diagnóstico verificável é detetada ou resolvida. O Velair usa as ocorrências presentes na inicialização como referência, para que reiniciar o Home Assistant não gere uma sequência de eventos de ocorrências já ativas. Ocorrências que não mudam não são duplicadas.

A identidade da ocorrência consiste em `code`, um `entity_id` opcional de climatização gerida e um `purpose` opcional de sensor. Os dados não contêm mensagem bruta de exceção, identificador de Perfil/Modo/pausa nem causa deduzida. `change` é `detected` ou `resolved`; `severity` é `warning` ou `error`.

```yaml
domain: velair
event: diagnostic_issue_changed
change: detected
severity: error
code: delivery_exhausted
entity_id: climate.living_room
```

Por exemplo, notifique sempre que o Velair detetar um novo erro:

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

Para avaliar o estado geral, use o sensor **Estado de diagnóstico**. O seu ID de entidade pode ser alterado no Home Assistant; portanto, selecione-o no editor de automações:

```yaml
triggers:
  - trigger: state
    entity_id: sensor.velair_diagnostics_status
    to: "error"
```

<a id="profile-changed"></a>
## Perfis alterados

`profile_changed` é emitido depois que um conjunto de base diferente de Perfis climáticos, ou programações de base Predefinição, é persistido. Selecionar diretamente o mesmo conjunto ativo pode mudar a entidade nativa de Modo para Manual, mas não emite `profile_changed`, pois os perfis efetivos não mudaram.

```yaml
domain: velair
event: profile_changed
profile_ids:
  - away
  - bedrooms
previous_profile_ids: []
source: select
```

`source` identifica a origem da seleção efetiva. Os valores públicos são `panel`, `service` e `select`; operações internas do ciclo de vida podem publicar um valor mais específico, como `profile_deleted` ou `mode_updated`.

As listas ordenadas de IDs descrevem os conjuntos de base novo e anterior. Uma lista `profile_ids` vazia representa uma base Predefinição; exceções por zona ainda podem existir. Este evento de compatibilidade não informa mudanças apenas de exceções. Use `selection_changed` para a seleção completa e a atribuição efetiva dos ambientes.

Por exemplo, esta automação reage quando o Perfil com ID `away` passa a fazer parte do conjunto ativo:

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

Para reagir quando a base volta às programações Predefinição, use uma condição de modelo que verifique `trigger.event.data.profile_ids == []`. Confira a seleção completa para distinguir uma base Predefinição com exceções de Predefinição em todos os ambientes.

<a id="profile-selection-changed"></a>
## Seleção de Perfis alterada

`selection_changed` informa mudanças na base, na sua associação ao Modo ou nas exceções por zona após a persistência. Usa o mesmo envelope `velair_event`:

```yaml
domain: velair
event: selection_changed
selection:
  base_profile_ids: [winter]
  base_mode_id: winter-mode
  zone_profile_overrides:
    climate.office: remote_work
    climate.guest_room: null
previous_selection:
  base_profile_ids: [winter]
  base_mode_id: winter-mode
  zone_profile_overrides: {}
effective_zone_profiles:
  climate.office: remote_work
  climate.living_room: winter
  climate.guest_room: null
source: service
```

Uma exceção ausente herda a base; uma entrada presente com null usa Predefinição explicitamente. A atribuição efetiva descreve cada ambiente, incluindo Perfis aplicados parcialmente. Não comprova o envio físico bem-sucedido ao dispositivo. Uma seleção inalterada não emite evento duplicado. Editar programações referenciadas pode mudar a climatização sem alterar IDs de seleção; as atualizações de programação mantêm suas notificações normais de API.

<a id="scheduler-mode-changed"></a>
## Modo do agendador alterado

`scheduler_mode_changed` é emitido quando o modo global ou a hora de fim da pausa muda, inclusive por encerramento automático. Repetir o mesmo modo e hora de fim não o emite.

```yaml
domain: velair
event: scheduler_mode_changed
mode: paused
previous_mode: auto
paused_until: "2026-07-09T18:30:00+02:00"
paused_started_at: "2026-07-09T17:00:00+02:00"
```

<a id="climate-target-applied"></a>
## Alvo de climatização aplicado

`climate_target_applied` é emitido quando o Velair aplica um alvo programado, uma ação apenas de modo, apenas de opções ou de desligamento, uma programação restaurada ou de inicialização, ou uma chamada de serviço `velair.set_temperature` / `velair.set_hvac_mode`. Definições opcionais não suportadas são omitidas.

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

Valores comuns de `source` são `scheduled_event`, `current_schedule`, `schedule_saved`, `scheduler_resumed`, `startup`, `service_set_temperature`, `service_set_hvac_mode`, `boost_ended`, `zone_paused`, `zone_resumed` e `zone_pause_expired`.

Para um alvo de intervalo, `temperature` é omitido e o evento contém os dois limites:

```yaml
target_temp_low: 20
target_temp_high: 24
hvac_mode: heat_cool
```

Para um bloco apenas de modo, `action` é `set_hvac_mode`, `hvac_mode` é o modo aplicado pelo Velair e todos os campos de temperatura-alvo são omitidos. Isso permite que automações diferenciem uma mudança de modo de uma mudança de alvo. A mesma estrutura de dados é usada por `velair.set_hvac_mode`, com `source: service_set_hvac_mode` e sem os campos exclusivos de programação `weekday` ou `start`.

Para um bloco apenas de opções, `action` é `set_climate_options`. O evento inclui os campos opcionais aplicados, como `preset_mode` ou `fan_mode`, e omite alvos de temperatura e `hvac_mode`. Esses blocos não ligam uma entidade de climatização que está desligada.

<a id="preconditioning-plan-updated"></a>
## Plano de pré-condicionamento atualizado

`preconditioning_plan_updated` é emitido quando um novo plano de início antecipado é publicado ou quando alguma entrada ou resultado de cálculo muda. Recálculos idênticos não são duplicados. O planeamento durante a inicialização pode emitir esse evento; calcular dados apenas para responder ao painel não o emite.

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

Para um plano de intervalo nativo, `target_temperature` é `null` e os dados incluem o par completo `target_temp_low` e `target_temp_high`. `target_kind` é `range`, `target_boundary` é `low` ou `high` e `boundary_temperature` é o único limite efetivo usado pelo preditor. `temperature_delta` é medido em relação a esse limite. Planos de temperatura única mantêm `target_kind: scalar` e `target_boundary: temperature`.

Por exemplo, uma previsão de aquecimento para um intervalo de `20–24 °C` inclui:

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
## Plano de pré-condicionamento cancelado

`preconditioning_plan_cancelled` é emitido uma vez quando um plano publicado anteriormente deixa de existir, por exemplo, após editar a programação, diminuir a diferença de temperatura, desativar o pré-condicionamento ou sair do modo automático. Ele repete o último plano publicado para que uma automação identifique o que foi cancelado.

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

`reason` é `no_longer_planned` quando um recálculo remove um plano e `scheduler_not_auto` ao pausar ou parar a programação automática.

<a id="preconditioning-observation-recorded"></a>
## Observação de pré-condicionamento registada

`preconditioning_observation_recorded` é emitido quando uma observação de aprendizagem é validada, o histórico é limitado ao tamanho configurado e os dados são persistidos. `quality` pode ser `complete`, `partial` ou `invalid`.

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

Uma observação inválida também inclui `invalid_reason`.

<a id="comfort-assessment-changed"></a>
## Avaliação de conforto alterada

`comfort_assessment_changed` é emitido quando muda `condition`, `air_quality`, `data_quality`, `data_issues` ou o estado semântico de uma métrica derivada ativada. O estado semântico inclui disponibilidade, origem, entidade, unidade, ocorrências e condição. Variações numéricas nas leituras básicas ou derivadas continuam a atualizar a interface do Velair e os atributos dos sensores sem emitir outro evento de automação. Isso evita excesso de eventos no barramento.

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

Os campos de intervalo destinam-se a automações simples sem substituir o campo físico compatível `condition`:

Para templates de estado atual e acionadores de estado, consulte o [contrato completo da entidade Condição ambiental](zone-sensors.pt-pt.md#environmental-condition). Use esse evento quando o valor anterior ou a transição exata forem importantes.

| `status` | Significado |
| --- | --- |
| `within_range` | Todos os valores monitorizados utilizáveis estão dentro dos seus intervalos configurados. |
| `outside_range` | Pelo menos um valor monitorizado utilizável está fora do seu intervalo configurado, com temperatura e Humidex alinhados quando ambos estão ativados. |
| `mixed` | A temperatura atual e o Humidex estão em posições diferentes em relação aos intervalos. |
| `unavailable` | Um valor monitorizado obrigatório, ou o Humidex ativado, não pode ser avaliado no momento. |

| `thermal_relation` | Significado |
| --- | --- |
| `aligned` | A temperatura atual e o Humidex estão na mesma posição. |
| `mixed` | A temperatura atual e o Humidex estão em posições diferentes. |
| `not_evaluated` | O Humidex está desativado. |
| `unavailable` | Não é possível avaliar a temperatura ou o Humidex ativado neste momento. |

Cada entrada em `positions` é `below`, `within`, `above` ou `null`. O evento também inclui o resumo anterior completo. `range_summary_changed` informa qualquer mudança de estado, relação térmica ou posição; `range_status_changed` informa apenas uma mudança do `status` agregado. Ambos são `false` quando outra parte da avaliação de Conforto causou o evento.

`comfort_zone` usa a unidade de temperatura da entidade de climatização gerida. O seu intervalo efetivo é o mesmo usado pela condição de humidade e pelas orientações de ventilação. No modelo guiado ou personalizado conforme a temperatura, o intervalo é `null` quando a temperatura não pode ser avaliada; portanto, as automações não devem substituí-lo pelos antigos limites fixos de humidade. Variações numéricas normais desse intervalo atualizam os atributos da entidade e a API sem emitir um evento, a menos que um resultado semântico documentado também mude. O evento também inclui a `ventilation_opportunity` atual. Alterações no seu estado, âmbito, efeitos, bloqueios ou motivo são semânticas; variações numéricas externas que mantêm esses campos iguais não emitem outro evento.

Por exemplo, esta automação reage apenas quando uma zona passa a ficar fora dos seus intervalos configurados:

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

`insights` é uma interpretação ordenada dos dados internos atuais, disponível apenas durante a execução. Os seus campos são identificadores estáveis, e não texto traduzido. Uma mudança semântica nessa interpretação pode emitir o evento; leituras desatualizadas, ausentes ou inválidas não produzem uma interpretação. Os dados contêm a lista atual completa, incluindo `insights: []` quando a última interpretação contextual desaparece. O campo existente `condition` continua a ser o resumo da avaliação e não é duplicado como uma interpretação contextual.

Quando a comparação externa está ativada, esse evento também contém toda a subárvore `outdoor`. A sua qualidade e as suas ocorrências próprias nunca alteram os campos internos `data_quality` ou `data_issues`. Os eventos reagem a mudanças de disponibilidade, qualidade, `effect`, `potential`, `blocked_by` ou na lista de interpretações; variações numéricas normais dentro do mesmo resultado semântico não emitem outro evento. `guidance_thresholds` informa a sensibilidade efetiva de cada zona usada para chegar ao resultado. Editar um limite sem mudar o resultado semântico atualiza o estado atual, mas não emite evento. Os dados atuais das métricas incluem `freshness: reported | unverified`. O `data_quality` interno ou externo pode ser `unverified` quando todas as leituras são utilizáveis, mas pelo menos uma não tem horário de atualização verificável. Sensores diretos podem ficar desatualizados no prazo de atualização sem que o seu valor de estado mude. A subárvore fornece explicitamente a humidade absoluta interna; consumidores não devem reconstruí-la a partir de diferenças arredondadas. Os códigos de ventilação descrevem apenas uma oportunidade ou uma compensação entre benefícios e efeitos desfavoráveis. Eles não significam que o Velair abriu uma janela ou alterou a climatização.

Apenas os dados derivados do Humidex incluem `temperature_range_position`. O campo sempre aparece neles e é `below`, `within`, `above` ou `null`; transições entre esses valores podem emitir o evento. O campo é uma comparação observacional com o intervalo de temperatura configurado, e não uma conclusão sobre conforto nem uma instrução de controlo da climatização.

<a id="room-sensor-assist-state-changed"></a>
## Estado de ativação do Room Assist alterado

`room_sensor_assist_state_changed` é emitido quando o Room Assist é ativado ou desativado pelo painel, cartão Lovelace, API ou serviço. Repetir o mesmo estado não o emite.

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
## Room Assist atualizado

`room_sensor_assist_updated` é emitido apenas quando o Room Assist envia um alvo temporário diferente à climatização. Variações menores que o passo de temperatura-alvo da entidade não o emitem.

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

Para um alvo fixo de temperatura única em `heat` ou `cool` com zona morta diferente de zero, os quatro campos de histerese identificam a fase efetivamente ativa, o seu limite ativo e todo o intervalo de comutação. Eles são omitidos com zona morta zero, em modos automáticos de temperatura única e em intervalos nativos. A fase permanece igual enquanto o ambiente cruza o centro programado e só se inverte depois de o sensor separado da divisão atingir o limite oposto.

Quando o alvo programado protege um resultado fixo de aquecimento ou arrefecimento, a atualização de temperatura única adiciona dois campos opcionais:

```yaml
target_temperature: 22
calculated_temperature: 20
applied_temperature: 22
scheduled_target_guard: cooling_floor
direction: cool
```

`calculated_temperature` é o alvo suportado antes da proteção do alvo programado. Automações existentes continuam compatíveis, porque os campos são adicionais e são omitidos quando a proteção não está ativa.

Para um intervalo nativo, os campos de alvo único são omitidos e os dois intervalos completos são apresentados:

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
## Alvo normal restaurado pelo Room Assist

`room_sensor_assist_restored` é emitido quando o Room Assist deixa de gerir o seu alvo temporário e restaura o alvo programado normal quando possível. Em um ciclo fixo de aquecimento ou arrefecimento, atingir o limite ativo da zona morta continua a fazer parte de `room_sensor_assist_updated`; isso inverte a fase de histerese e pode alterar o sinal de `applied_offset`. O alvo programado permanece como limite de segurança na fase que não procura aquecer ou arrefecer ativamente, mesmo que a leitura da própria entidade de climatização se desloque. Se o arredondamento pelo passo de alvo tornar desnecessário um novo comando ao termóstato, a fase ainda muda no estado ao vivo, mas nenhum evento de atualização é emitido, como descrito acima. `reason` explica uma transição emitida.

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

Outros motivos incluem `assist_disabled`, `boost_started`, `manual_target`, `missing_temperature`, `no_active_target`, `not_auto`, `schedule_changed`, `schedule_cleared`, `scheduler_mode_changed`, `scheduler_stopped`, `settings_updated`, `turn_off`, `unsupported_mode`, `zone_paused` e `zone_unavailable`. `unsupported_temperature_range` ainda é possível para um alvo único antigo que não pode ser aplicado enquanto o modo efetivo de climatização exige um intervalo nativo; blocos de intervalo válidos são suportados.

<a id="boost-started"></a>
## Reforço iniciado

`boost_started` é emitido depois de um alvo de Reforço e o respetivo ajuste temporário serem aplicados e persistidos. Substituir um Reforço ativo emite outro `boost_started`.

Reforços de intervalo usam `target_temp_low` e `target_temp_high` em vez de `temperature`. Os seus dados de restauração preservam a mesma forma de alvo.

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
## Reforço encerrado

`boost_ended` é emitido quando um Reforço expira ou é cancelado. `reason` é `expired` ou `manual`. `restoration` descreve o estado que o Velair aplica em seguida.

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

`restoration.type` pode ser `schedule`, `previous_state` ou `none`. Uma restauração programada também emite `climate_target_applied` com `source: boost_ended`.

<a id="zone-paused"></a>
## Zona pausada

`zone_paused` é emitido quando uma zona gerida passa de nenhum motivo de pausa para um. Se `action` for `turn_off`, `climate_target_applied` é emitido primeiro para esse desligamento.

```yaml
domain: velair
event: zone_paused
entity_id: climate.guest_room
started_at: "2026-07-09T12:00:00+02:00"
until: "2026-07-12T18:00:00+02:00"
action: turn_off
pause_id: velair_window_guard
```

`zone_pause_added`, `zone_pause_updated` e `zone_pause_removed` descrevem mudanças em motivos individuais e incluem `pause_id` quando há identificação. Repetir exatamente uma solicitação identificada não emite evento. Motivos antigos e manuais omitem o ID.

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
## Zona retomada

`zone_resumed` é emitido apenas quando o último motivo é removido manualmente ou expira. Quando a programação atual é reaplicada, um evento posterior `climate_target_applied` descreve esse alvo.

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
## Operações sem eventos de execução

Criar modelos, alterar preferências do painel, importar dados e redefinir definições atualiza a configuração, mas não emite eventos de execução para automações. Edições de programação não têm um evento próprio de configuração, embora possam produzir eventos de cancelamento/atualização de plano ou `climate_target_applied` quando alteram o alvo ativo naquele momento.

<a id="delivery-meaning"></a>
## Significado da entrega

Um evento de aplicação só é emitido depois de o Home Assistant aceitar toda a sequência de chamadas de modo, alvo e opções suportadas para o comando atual do Velair. Tentativas que falham ou são substituídas não o emitem. O evento confirma a aceitação do comando, e não que o equipamento já atingiu a temperatura ou o estado HVAC solicitado.
