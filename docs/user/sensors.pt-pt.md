<a id="velair-sensor-reference"></a>
# Referência dos sensores do Velair
<!-- velair-docs:start -->
Traduções: [Original em inglês](sensors.md) · [Español](sensors.es.md) · [Français](sensors.fr.md) · [Deutsch](sensors.de.md) · [Italiano](sensors.it.md) · [Nederlands](sensors.nl.md) · [Polski](sensors.pl.md) · [Português (Brasil)](sensors.pt-br.md) · [Português (Portugal)](sensors.pt-pt.md) · [Русский](sensors.ru.md) · [Estado das traduções](../translation-status.md)

<details>
<summary>Estado desta tradução</summary>

| Informação | Estado |
| --- | --- |
| Versão de referência | 1.9.0-beta.1 |
| Última sincronização | 2026-10-11 |
| Revisão linguística | Tradução assistida por IA |
| Em relação ao original | Sincronizada com o original em inglês. |

</details>

---
<!-- velair-docs:end -->

O Velair cria entidades no Home Assistant para que os painéis e as automações possam consultar o estado atual do programador, do conforto, do envio de comandos e de cada equipamento sem abrir o painel do Velair.

As IDs de entidades apresentadas são exemplos. O Home Assistant pode acrescentar sufixos ou permitir mudar os nomes das entidades; utilize as IDs reais do seu registo de entidades.

<a id="quick-guide"></a>
## Guia rápido

| Entidade | Criada para | Utilização principal |
| --- | --- | --- |
| **Próximo evento agendado** | Integração Velair | Mostrar a próxima ação planeada do Velair. |
| **Estado do agendador** | Integração Velair | Verificar se a programação está inativa, programada, pausada ou com uma substituição temporária. |
| **Estado de diagnóstico** | Integração Velair | Alertar para problemas de funcionamento do Velair. |
| **Temperatura-alvo ativa** | Cada equipamento gerido | Mostrar a temperatura-alvo atualmente sob controlo do Velair. |
| **Condição ambiental** | Cada equipamento gerido | Consultar o estado do Conforto, a qualidade dos dados, as métricas derivadas e o contexto exterior. |
| **Oportunidade de ventilação** | Cada equipamento gerido | Automatizar ou apresentar sugestões prudentes de abertura de janelas. |
| **Qualidade do ar** | Cada equipamento gerido | Mostrar a avaliação de CO2 independentemente do Conforto térmico. |
| **Ajuste temporário** | Cada equipamento gerido | Mostrar Reforços ou pausas ativos. |
| **Controlo** | Cada equipamento gerido | Saber quem controla o equipamento: Velair, Ajuste manual ou execução externa. |
| **Diagnóstico de entrega** | Cada equipamento gerido, desativado por predefinição | Analisar ou automatizar o último resultado de envio local. |
| **Início do pré-condicionamento** | Cada equipamento gerido | Mostrar quando o Pré-condicionamento adaptativo prevê começar antecipadamente. |
| **Room Assist** | Cada equipamento gerido | Mostrar o estado do Room Assist e o contexto da temperatura-alvo aplicada. |

O Velair também cria entidades que permitem alterações, como **Programação automática** e **Modo**. São controlos, não sensores; consulte o [guia de utilização](usage.pt-pt.md#home-assistant-entities).

<a id="global-sensors"></a>
## Sensores globais

<a id="next-climate-event"></a>
### Próximo evento de climatização

Exemplo de ID de entidade:

```text
sensor.velair_next_scheduled_event
```

Atributos principais:

| Atributo | Significado |
| --- | --- |
| `entity_id` | Entidade de climatização do primeiro evento nesta hora. |
| `action` | `set_temperature`, `set_hvac_mode` ou `turn_off`. |
| `hvac_mode` | Modo HVAC que o Velair prevê utilizar, quando aplicável. |
| `temperature` | Temperatura-alvo única, quando aplicável. |
| `target_temp_low` / `target_temp_high` | Intervalo de temperaturas-alvo, quando aplicável. |
| `weekday` / `start` | Origem do bloco da programação. |
| `when` | Hora efetiva de aplicação. |
| `target_when` | Hora original de conforto quando o pré-condicionamento começa antecipadamente. |
| `event_count` | Número de eventos com a mesma hora de aplicação. |
| `events` | Lista serializada de todos os eventos com a mesma hora de aplicação. |

Exemplo:

```yaml
{{ state_attr('sensor.velair_next_scheduled_event', 'action') == 'turn_off' }}
```

<a id="current-schedule-state"></a>
### Estado atual da programação

Exemplo de ID de entidade:

```text
sensor.velair_current_schedule_state
```

Estados:

```text
paused
override_active
scheduled
idle
temperature_migration_required
```

Atributos principais:

| Atributo | Significado |
| --- | --- |
| `global_mode` | Modo global atual do programador. |
| `paused_started_at` | Início da pausa global, quando aplicável. |
| `paused_until` | Expiração prevista da pausa global, quando aplicável. |

<a id="diagnostics-status"></a>
### Estado de diagnóstico

Exemplo de ID de entidade:

```text
sensor.velair_diagnostics_status
```

Estados:

```text
ok
warning
error
```

Atributos principais:

| Atributo | Significado |
| --- | --- |
| `scheduler_mode` / `scheduler_status` | Contexto compacto do programador. |
| `units_ok` / `units_warning` / `units_error` | Contagens do estado de funcionamento por equipamento. |
| `issue_count` | Total de problemas de execução ativos. |
| `warning_count` / `error_count` | Contagens dos problemas ativos por gravidade. |
| `issue_codes` | Códigos de problema estáveis adequados para automações. |

Exemplo de acionador:

```yaml
triggers:
  - trigger: state
    entity_id: sensor.velair_diagnostics_status
    to: error
```

<a id="per-climate-sensors"></a>
## Sensores por equipamento

Para um equipamento gerido como `climate.living_room`, o Home Assistant normalmente cria IDs de entidades relacionadas, como `sensor.velair_control_living_room`. Utilize as IDs reais do registo em painéis e automações.

<a id="zone-active-target-temperature"></a>
### Temperatura-alvo ativa da zona

Atributos principais:

| Atributo | Significado |
| --- | --- |
| `action` | Ação da temperatura-alvo ativa do Velair. |
| `hvac_mode` | Modo HVAC selecionado pelo bloco ou substituição temporária ativos. |
| `temperature` | Temperatura-alvo única ativa. |
| `target_temp_low` / `target_temp_high` | Intervalo ativo para modos com intervalo nativo. |
| `weekday` / `start` | Origem do bloco ativo na programação. |
| `when` | Hora de aplicação da temperatura-alvo ativa. |
| `target_when` | Hora de conforto quando o pré-condicionamento antecipou a aplicação. |

Para intervalos nativos, o estado do sensor fica indisponível porque não existe um único valor correto. Consulte antes `target_temp_low` e `target_temp_high`.

<a id="zone-environmental-condition"></a>
### Condição ambiental da zona

Estados:

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

Atributos principais:

| Atributo | Significado |
| --- | --- |
| `data_quality` | `complete`, `unverified`, `partial`, `stale` ou `unavailable`. |
| `data_issues` | Códigos estáveis para leituras em falta, desatualizadas, inválidas ou utilizáveis mas de atualidade não verificada. |
| `range_summary` | Resultado atual dos intervalos de Conforto e conciliação com o Humidex. |
| `ventilation_opportunity` | Dados completos da oportunidade de ventilação. |
| `comfort_zone` | Modelo de Conforto selecionado e intervalo efetivo de humidade. |
| `temperature_source` / `humidity_source` | Entidades de origem das leituras interiores. |
| `derived_metrics` | Dados ativados de Humidex, ponto de orvalho e humidade absoluta. |
| `outdoor` | Comparação opcional entre interior e exterior. |
| `insights` | Observações ordenadas com códigos estáveis. |

Exemplo:

```yaml
{% set insights =
   state_attr('sensor.velair_climate_living_room_environmental_condition',
              'insights') or [] %}
{{ insights
   | selectattr('code', 'eq', 'ventilation_may_help_cool')
   | list | count > 0 }}
```

Consulte [Conforto ambiental](comfort.pt-pt.md) e [Sensores de controlo e envio por zona](zone-sensors.pt-pt.md#environmental-condition) para os dados completos do Conforto.

<a id="zone-ventilation-opportunity"></a>
### Oportunidade de ventilação da zona

Estados:

```text
unavailable
no_opportunity
may_help
comfort_possible
trade_off
already_comfortable
```

Atributos principais:

| Atributo | Significado |
| --- | --- |
| `evaluation_scope` | Se o Velair avaliou a temperatura, a humidade ou ambas. |
| `reason` | Código de motivo estável legível por máquinas. |
| `data_quality` / `data_issues` | Qualidade da comparação com o exterior. |
| `outdoor_temperature_source` | Entidade de origem da temperatura exterior. |
| `outdoor_humidity_source` | Entidade de origem da humidade exterior, quando configurada. |
| `potential_effects` | Efeitos que o Velair prevê que o ar exterior possa ter. |
| `blocked_by` | Condições que impedem um resultado mais favorável de oportunidade. |

Exemplo:

```yaml
{{ is_state('sensor.velair_ventilation_opportunity_living_room',
            'comfort_possible') }}
```

Este sensor é apenas informativo. O Velair nunca abre janelas nem altera o controlo da climatização com base nele.

<a id="zone-air-quality"></a>
### Qualidade do ar da zona

Estados:

```text
not_monitored
unavailable
good
elevated
poor
```

Atributos principais:

| Atributo | Significado |
| --- | --- |
| `availability` | Disponibilidade atual da leitura de CO2. |
| `co2_source` | Sensor de CO2 utilizado na avaliação. |

<a id="zone-override-state"></a>
### Estado de ajuste temporário da zona

Estados:

```text
none
boost
paused
disabled
```

Atributos principais:

| Atributo | Significado |
| --- | --- |
| `started_at` | Início do ajuste temporário ativo. |
| `until` | Expiração prevista do ajuste temporário, quando aplicável. |
| `action` | Ação do ajuste temporário, quando aplicável. |
| `pause_id` | Identificador da pausa ativa, quando existe apenas uma pausa. |
| `pause_count` / `pause_ids` | Contexto compacto de várias pausas. |
| `manual` | Se a pausa é um Ajuste manual. |

Utilize este sensor para o estado de Reforço e pausa. Utilize **Controlo** para a responsabilidade pelo controlo, como automático, manual ou externo.

<a id="zone-control"></a>
### Controlo da zona

Estados:

```text
automatic
manual
external
```

Atributos principais:

| Atributo | Significado |
| --- | --- |
| `runtime_state` | `idle`, `scheduled`, `preconditioning`, `boost`, `paused`, `stopped`, `externally_managed` ou `temperature_migration_required`. |
| `schedule_source` | `default`, `profile` ou `profile_pause`. |
| `profile_id` / `profile_name` | Perfil efetivamente responsável pela zona, quando aplicável. |
| `mode_id` / `mode_name` | Modo selecionado, quando aplicável. |
| `manual_source` | `explicit`, `external_change` ou `other`, apenas em controlo manual. |
| `manual_started_at` | Início do Ajuste manual. |
| `manual_until` | Expiração prevista do Ajuste manual, quando aplicável. |
| `manual_policy` | `until_next_block`, `for_duration` ou `until_resumed`. |

Exemplo:

```yaml
{{ is_state('sensor.velair_control_living_room', 'automatic')
   and state_attr('sensor.velair_control_living_room', 'runtime_state')
       == 'scheduled' }}
```

<a id="zone-delivery-diagnostics"></a>
### Diagnóstico de entrega da zona

Esta entidade de diagnóstico está desativada por predefinição. Ative-a no registo de entidades do Home Assistant quando um painel ou automação precisar de evidências de envio durante a execução.

Estados:

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

Atributos principais:

| Atributo | Significado |
| --- | --- |
| `updated_at` | Última atualização do estado de envio. |
| `retry_count` | Tentativa representada pelo estado atual. |
| `last_error_at` / `last_error_code` | Último erro de envio com dados sensíveis removidos. |
| `last_accepted_at` | Última vez em que o Home Assistant aceitou uma sequência completa de serviços do Velair. |
| `last_accepted_source` | `automatic`, `manual`, `boost` ou `automatic_reassertion`. |
| `last_accepted_action` | `set_temperature`, `set_hvac_mode`, `turn_off` ou `other`. |
| `last_accepted_hvac_mode` | Modo HVAC aceite pelo Home Assistant. |
| `last_accepted_temperature_unit` | Unidade registada com a temperatura-alvo aceite. |
| `last_accepted_temperature` | Temperatura-alvo única aceite, quando aplicável. |
| `last_accepted_target_temp_low` / `last_accepted_target_temp_high` | Intervalo de temperaturas-alvo aceite, quando aplicável. |

Exemplo:

```yaml
triggers:
  - trigger: state
    entity_id: sensor.velair_delivery_diagnostics_living_room
    to: exhausted
```

`success` significa que o Home Assistant aceitou a sequência de serviços. Não comprova que o dispositivo físico atingiu a temperatura-alvo.

<a id="zone-preconditioning-start"></a>
### Início do pré-condicionamento da zona

Atributos principais:

| Atributo | Significado |
| --- | --- |
| `estado` | `planned` ou `active`. |
| `scheduled_for` | Hora original de conforto do bloco. |
| `lead_minutes` | Minutos pelos quais o Velair antecipou o início. |
| `direction` | Direção de aquecimento ou arrefecimento. |
| `target_kind` / `target_boundary` | Contexto da previsão para temperatura única ou limite de intervalo. |
| `boundary_temperature` | Limite utilizado na previsão. |
| `model_source` | Fonte da previsão selecionada pelo Velair. |
| `target_temperature` | Temperatura-alvo única, quando aplicável. |
| `target_temp_low` / `target_temp_high` | Intervalo de temperaturas-alvo, quando aplicável. |
| `hvac_mode` | Modo HVAC utilizado no evento de pré-condicionamento. |

<a id="zone-room-assist-state"></a>
### Estado do Room Assist da zona

Estados:

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

Atributos principais:

| Atributo | Significado |
| --- | --- |
| `room_temperature_entity_id` | Fonte do sensor da divisão. |
| `target_temperature` | Temperatura-alvo visível da programação ou ajuste temporário. |
| `applied_temperature` | Temperatura-alvo que o Room Assist aplicou ao equipamento. |
| `applied_offset` | Correção atualmente aplicada. |
| `calculated_temperature` | Temperatura-alvo calculada antes dos limites. |
| `assist_delta` | Diferença de assistência ativa, quando superior a zero. |
| `scheduled_target_guard` | Proteção que impede alterações inseguras da temperatura-alvo. |
| `hysteresis_phase` / `hysteresis_target` | Fase de execução da banda de manutenção. |
| `deadband_low` / `deadband_high` | Banda efetiva de manutenção. |
| `target_temp_low` / `target_temp_high` | Intervalo nativo visível de temperaturas-alvo. |
| `applied_target_temp_low` / `applied_target_temp_high` | Intervalo nativo enviado após a assistência. |
| `climate_target_temp_low` / `climate_target_temp_high` | Intervalo nativo atual comunicado pelo equipamento. |
| `range_shift` | Deslocamento atual do intervalo, quando aplicável. |
| `direction` | Direção de aquecimento ou arrefecimento. |
| `hvac_mode` | Modo HVAC envolvido na temperatura-alvo assistida. |
| `active_from` / `target_when` | Contexto temporal do bloco assistido. |

<a id="choosing-the-right-surface"></a>
## Escolher a fonte certa

| Pergunta | Utilize |
| --- | --- |
| O que o Velair está a planear a seguir? | **Próximo evento agendado** |
| O Velair está globalmente pausado ou programado? | **Estado do agendador** |
| O Velair está a funcionar corretamente? | **Estado de diagnóstico** |
| Que temperatura-alvo está sob controlo do Velair agora? | **Temperatura-alvo ativa** |
| A divisão está confortável, com dados desatualizados ou sem leituras? | **Condição ambiental** |
| O ar exterior poderia ajudar? | **Oportunidade de ventilação** |
| O nível de CO2 é bom ou mau? | **Qualidade do ar** |
| Este equipamento tem um Reforço ou pausa ativos? | **Ajuste temporário** |
| Quem controla este equipamento agora? | **Controlo** |
| O Home Assistant aceitou o último comando do Velair? | **Diagnóstico de entrega** |
| Quando começará o pré-condicionamento? | **Início do pré-condicionamento** |
| O que está o Room Assist a aplicar? | **Room Assist** |

Os eventos são mais adequados quando uma automação precisa de reagir a uma transição e saber o que mudou. Os sensores são mais adequados quando um painel ou automação precisa do estado atual, incluindo após um reinício.
