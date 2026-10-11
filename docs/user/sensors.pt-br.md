<a id="velair-sensor-reference"></a>
# Referência dos sensores do Velair
<!-- velair-docs:start -->
Traduções: [Original em inglês](sensors.md) · [Español](sensors.es.md) · [Français](sensors.fr.md) · [Deutsch](sensors.de.md) · [Italiano](sensors.it.md) · [Nederlands](sensors.nl.md) · [Polski](sensors.pl.md) · [Português (Brasil)](sensors.pt-br.md) · [Português (Portugal)](sensors.pt-pt.md) · [Русский](sensors.ru.md) · [Status das traduções](../translation-status.md)

<details>
<summary>Status desta tradução</summary>

| Informação | Status |
| --- | --- |
| Versão de referência | 1.9.0-beta.1 |
| Última sincronização | 2026-10-11 |
| Revisão linguística | Tradução assistida por IA |
| Em relação ao original | Sincronizada com o original em inglês. |

</details>

---
<!-- velair-docs:end -->

O Velair cria entidades do Home Assistant para que painéis e automações consultem o contexto atual de agendamento, conforto, envio de comandos e cada dispositivo sem abrir o painel do Velair.

Os IDs apresentados são exemplos. O Home Assistant pode acrescentar sufixos ou permitir renomear entidades, portanto use os IDs reais do seu registro.

<a id="quick-guide"></a>
## Guia rápido

| Entidade | Criada para | Uso principal |
| --- | --- | --- |
| **Próximo evento agendado** | Integração Velair | Mostrar a próxima ação planejada. |
| **Status do agendador** | Integração Velair | Conferir se o agendamento está inativo, programado, pausado ou sob ajuste temporário. |
| **Status de diagnóstico** | Integração Velair | Alertar sobre a integridade durante a execução. |
| **Temperatura-alvo ativa** | Cada dispositivo gerenciado | Mostrar o alvo atual controlado pelo Velair. |
| **Condição ambiental** | Cada dispositivo gerenciado | Consultar Conforto, qualidade dos dados, métricas derivadas e contexto externo. |
| **Oportunidade de ventilação** | Cada dispositivo gerenciado | Mostrar ou automatizar oportunidades cautelosas de abrir janelas. |
| **Qualidade do ar** | Cada dispositivo gerenciado | Mostrar a avaliação de CO2 separada do conforto térmico. |
| **Ajuste temporário** | Cada dispositivo gerenciado | Mostrar Reforço ou pausa ativos. |
| **Controle** | Cada dispositivo gerenciado | Saber quem controla: Velair, Ajuste manual ou execução externa. |
| **Diagnóstico de entrega** | Cada dispositivo gerenciado, desabilitada por padrão | Depurar ou automatizar pelo último resultado local de envio. |
| **Início do pré-condicionamento** | Cada dispositivo gerenciado | Mostrar quando o pré-condicionamento adaptativo pretende antecipar o início. |
| **Room Assist** | Cada dispositivo gerenciado | Mostrar o estado de execução e contexto do alvo aplicado. |

O Velair também cria entidades graváveis como **Programação automática** e **Modo**. São controles, não sensores; consulte o [guia de uso](usage.pt-br.md#home-assistant-entities).

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
| `entity_id` | Entidade do primeiro evento neste horário. |
| `action` | `set_temperature`, `set_hvac_mode` ou `turn_off`. |
| `hvac_mode` | Modo HVAC planejado, quando aplicável. |
| `temperature` | Alvo escalar, quando aplicável. |
| `target_temp_low` / `target_temp_high` | Faixa-alvo, quando aplicável. |
| `weekday` / `start` | Origem do bloco programado. |
| `when` | Horário real de aplicação. |
| `target_when` | Horário original de conforto quando há início antecipado. |
| `event_count` | Quantidade de eventos com o mesmo horário de aplicação. |
| `events` | Lista serializada de todos os eventos com esse horário. |

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
| `global_mode` | Modo global atual do agendador. |
| `paused_started_at` | Início da pausa global, quando aplicável. |
| `paused_until` | Expiração planejada da pausa global, quando aplicável. |

<a id="diagnostics-status"></a>
### Status de diagnóstico

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
| `scheduler_mode` / `scheduler_status` | Contexto compacto do agendador. |
| `units_ok` / `units_warning` / `units_error` | Contagens de integridade por dispositivo. |
| `issue_count` | Total de problemas ativos durante a execução. |
| `warning_count` / `error_count` | Contagens por gravidade. |
| `issue_codes` | Códigos estáveis apropriados para automações. |

Exemplo de gatilho:

```yaml
triggers:
  - trigger: state
    entity_id: sensor.velair_diagnostics_status
    to: error
```

<a id="per-climate-sensors"></a>
## Sensores por dispositivo

Para um dispositivo gerenciado como `climate.living_room`, o Home Assistant normalmente cria IDs relacionados, como `sensor.velair_control_living_room`. Use os IDs reais do registro em painéis e automações.

<a id="zone-active-target-temperature"></a>
### Temperatura-alvo ativa da zona

Atributos principais:

| Atributo | Significado |
| --- | --- |
| `action` | Ação do alvo ativo do Velair. |
| `hvac_mode` | Modo selecionado pelo bloco ou ajuste temporário ativo. |
| `temperature` | Alvo escalar ativo. |
| `target_temp_low` / `target_temp_high` | Faixa-alvo ativa para modos nativos de faixa. |
| `weekday` / `start` | Origem do bloco ativo na programação. |
| `when` | Horário de aplicação do alvo ativo. |
| `target_when` | Horário de conforto quando o pré-condicionamento antecipou a aplicação. |

Para faixas nativas, o estado do sensor fica indisponível porque não há um valor escalar único correto. Leia `target_temp_low` e `target_temp_high`.

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
| `data_issues` | Códigos estáveis de leituras ausentes, desatualizadas, inválidas ou utilizáveis com atualização não verificável. |
| `range_summary` | Resultado atual da faixa de Conforto e comparação com Humidex. |
| `ventilation_opportunity` | Dados completos da oportunidade de ventilação. |
| `comfort_zone` | Modelo selecionado e faixa efetiva de umidade. |
| `temperature_source` / `humidity_source` | Entidades de origem das leituras internas. |
| `derived_metrics` | Dados de Humidex, ponto de orvalho e umidade absoluta habilitados. |
| `outdoor` | Comparação interna/externa opcional. |
| `insights` | Informações contextuais ordenadas, apenas informativas, com códigos estáveis. |

Exemplo:

```yaml
{% set insights =
   state_attr('sensor.velair_climate_living_room_environmental_condition',
              'insights') or [] %}
{{ insights
   | selectattr('code', 'eq', 'ventilation_may_help_cool')
   | list | count > 0 }}
```

Consulte [Conforto ambiental](comfort.pt-br.md) e [Sensores de controle e envio por zona](zone-sensors.pt-br.md#environmental-condition) para os dados completos de Conforto.

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
| `evaluation_scope` | Se foram avaliadas temperatura, umidade ou ambas. |
| `reason` | Código estável de motivo, legível por máquina. |
| `data_quality` / `data_issues` | Qualidade da comparação externa. |
| `outdoor_temperature_source` | Entidade de temperatura externa. |
| `outdoor_humidity_source` | Entidade de umidade externa, quando configurada. |
| `potential_effects` | Efeitos esperados do ar externo. |
| `blocked_by` | Condições que impedem uma conclusão mais forte de oportunidade. |

Exemplo:

```yaml
{{ is_state('sensor.velair_ventilation_opportunity_living_room',
            'comfort_possible') }}
```

Este sensor é apenas informativo. O Velair nunca abre janelas nem altera o controle da climatização com base nele.

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
| `co2_source` | Sensor usado na avaliação. |

<a id="zone-override-state"></a>
### Estado do ajuste temporário da zona

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
| `until` | Expiração planejada, quando aplicável. |
| `action` | Ação do ajuste temporário, quando aplicável. |
| `pause_id` | Identificador ativo de uma pausa única. |
| `pause_count` / `pause_ids` | Contexto compacto de múltiplas pausas. |
| `manual` | Se a pausa é um Ajuste manual. |

Use este sensor para Reforço e pausa. Use **Controle** para saber quem controla: automático, manual ou externo.

<a id="zone-control"></a>
### Controle da zona

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
| `profile_id` / `profile_name` | Perfil efetivo responsável pela zona, quando aplicável. |
| `mode_id` / `mode_name` | Modo selecionado, quando aplicável. |
| `manual_source` | `explicit`, `external_change` ou `other`, somente em controle manual. |
| `manual_started_at` | Início do Ajuste manual. |
| `manual_until` | Expiração planejada do Ajuste manual, quando aplicável. |
| `manual_policy` | `until_next_block`, `for_duration` ou `until_resumed`. |

Exemplo:

```yaml
{{ is_state('sensor.velair_control_living_room', 'automatic')
   and state_attr('sensor.velair_control_living_room', 'runtime_state')
       == 'scheduled' }}
```

<a id="zone-delivery-diagnostics"></a>
### Diagnóstico de entrega da zona

Esta entidade de diagnóstico é desabilitada por padrão. Habilite-a no registro de entidades do Home Assistant quando um painel ou automação precisar de evidências de envio durante a execução.

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
| `last_accepted_at` | Última aceitação de uma sequência completa de serviços pelo Home Assistant. |
| `last_accepted_source` | `automatic`, `manual`, `boost` ou `automatic_reassertion`. |
| `last_accepted_action` | `set_temperature`, `set_hvac_mode`, `turn_off` ou `other`. |
| `last_accepted_hvac_mode` | Modo HVAC aceito pelo Home Assistant. |
| `last_accepted_temperature_unit` | Unidade capturada com o alvo aceito. |
| `last_accepted_temperature` | Alvo escalar aceito, quando aplicável. |
| `last_accepted_target_temp_low` / `last_accepted_target_temp_high` | Faixa-alvo aceita, quando aplicável. |

Exemplo:

```yaml
triggers:
  - trigger: state
    entity_id: sensor.velair_delivery_diagnostics_living_room
    to: exhausted
```

`success` significa que o Home Assistant aceitou a sequência de serviços. Não comprova que o dispositivo físico atingiu o alvo.

<a id="zone-preconditioning-start"></a>
### Início do pré-condicionamento da zona

Atributos principais:

| Atributo | Significado |
| --- | --- |
| `status` | `planned` ou `active`. |
| `scheduled_for` | Horário original de conforto do bloco. |
| `lead_minutes` | Minutos de antecipação do início. |
| `direction` | Direção de aquecimento ou resfriamento. |
| `target_kind` / `target_boundary` | Contexto de previsão escalar ou pelo limite da faixa. |
| `boundary_temperature` | Limite usado na previsão. |
| `model_source` | Fonte da previsão selecionada. |
| `target_temperature` | Alvo escalar, quando aplicável. |
| `target_temp_low` / `target_temp_high` | Faixa-alvo, quando aplicável. |
| `hvac_mode` | Modo HVAC usado no evento de pré-condicionamento. |

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
| `room_temperature_entity_id` | Fonte do sensor ambiente. |
| `target_temperature` | Alvo visível da programação ou ajuste temporário. |
| `applied_temperature` | Alvo aplicado pelo Room Assist. |
| `applied_offset` | Correção atualmente aplicada. |
| `calculated_temperature` | Alvo calculado antes dos limites. |
| `assist_delta` | Delta ativo de assistência quando maior que zero. |
| `scheduled_target_guard` | Proteção contra mudanças inseguras do alvo. |
| `hysteresis_phase` / `hysteresis_target` | Fase durante a execução da faixa de manutenção. |
| `deadband_low` / `deadband_high` | Faixa efetiva de manutenção. |
| `target_temp_low` / `target_temp_high` | Faixa nativa visível. |
| `applied_target_temp_low` / `applied_target_temp_high` | Faixa nativa enviada após a assistência. |
| `climate_target_temp_low` / `climate_target_temp_high` | Faixa nativa informada pelo dispositivo em tempo real. |
| `range_shift` | Deslocamento atual da faixa, quando aplicável. |
| `direction` | Direção de aquecimento ou resfriamento. |
| `hvac_mode` | Modo HVAC envolvido no alvo assistido. |
| `active_from` / `target_when` | Contexto de horários do bloco assistido. |

<a id="choosing-the-right-surface"></a>
## Escolher a informação adequada

| Pergunta | Use |
| --- | --- |
| O que o Velair planeja fazer a seguir? | **Próximo evento agendado** |
| Está globalmente pausado ou programado? | **Status do agendador** |
| Está funcionando sem problemas? | **Status de diagnóstico** |
| Qual alvo está sob controle do Velair agora? | **Temperatura-alvo ativa** |
| O cômodo está confortável ou com leituras ausentes/desatualizadas? | **Condição ambiental** |
| O ar externo poderia ajudar? | **Oportunidade de ventilação** |
| O CO2 está bom ou ruim? | **Qualidade do ar** |
| O dispositivo está com reforço ou pausa? | **Ajuste temporário** |
| Quem controla o dispositivo agora? | **Controle** |
| O Home Assistant aceitou o último comando? | **Diagnóstico de entrega** |
| Quando o pré-condicionamento começará? | **Início do pré-condicionamento** |
| O que o Room Assist está aplicando? | **Room Assist** |

Eventos são melhores quando uma automação precisa reagir a uma transição e saber o que mudou. Sensores são melhores quando painéis ou automações precisam do estado atual, inclusive após reiniciar.
