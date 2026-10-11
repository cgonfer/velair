<a id="zone-control-and-delivery-sensors"></a>
# Sensores de controle e envio por zona
<!-- velair-docs:start -->
Traduções: [Original em inglês](zone-sensors.md) · [Español](zone-sensors.es.md) · [Français](zone-sensors.fr.md) · [Deutsch](zone-sensors.de.md) · [Italiano](zone-sensors.it.md) · [Nederlands](zone-sensors.nl.md) · [Polski](zone-sensors.pl.md) · [Português (Brasil)](zone-sensors.pt-br.md) · [Português (Portugal)](zone-sensors.pt-pt.md) · [Русский](zone-sensors.ru.md) · [Status das traduções](../translation-status.md)

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

O Velair cria dois sensores de contexto para cada entidade `climate.*` gerenciada:

- **Controle** informa quem controla a zona agora e qual configuração do Velair se aplica.
- **Diagnóstico de entrega** informa o que aconteceu na tentativa mais recente de enviar um alvo pelo Home Assistant.

Eles descrevem camadas diferentes. Uma zona pode estar em controle automático enquanto o último envio ficou indisponível ou falhou; nenhum substitui o outro.

O sensor separado **Condição ambiental** disponibiliza `derived_metrics` habilitados e a lista ordenada `insights`, apenas durante a execução, quando Conforto está habilitado. As informações contêm `code`, `kind`, `tone` e `metrics` de apoio; são apenas informativas e nunca executam ações. Consulte [Conforto ambiental](comfort.pt-br.md#comfort-insights). Com comparação externa opcional, o mesmo sensor também disponibiliza `outdoor`, com leituras de origem, umidades absolutas interna e externa explícitas, qualidade independente e oportunidade ou contrapartida semântica de ventilação. O Velair não cria entidades intermediárias para leituras individuais. Cria um sensor enumerado separado **Oportunidade de ventilação** para o resumo de automação calculado pelo backend descrito abaixo.

<a id="environmental-condition"></a>
## Condição ambiental

**Condição ambiental** fornece o estado atual para automações de Conforto. É habilitado por padrão para cada dispositivo e atualizado pela mesma avaliação do backend usada no painel. Consultá-lo não faz uma nova consulta ao sensor nem executa uma ação de climatização.

Seu estado nativo mantém a classificação física compatível de temperatura e umidade:

| Estado | Significado |
| --- | --- |
| `monitoring_off` | Monitoramento de Conforto desabilitado para o dispositivo. |
| `no_readings` | Nenhuma leitura monitorada utilizável disponível. |
| `temperature_comfortable` | Só a temperatura pode ser avaliada e está na faixa configurada. |
| `humidity_comfortable` | Só a umidade pode ser avaliada e está na faixa configurada. |
| `comfortable` | Ambas estão nas respectivas faixas. |
| `cold` / `hot` | Temperatura abaixo ou acima da faixa. |
| `dry` / `humid` | Umidade abaixo ou acima da faixa. |
| `cold_and_dry` / `cold_and_humid` | Ambas são utilizáveis, e a temperatura está abaixo da faixa. |
| `hot_and_dry` / `hot_and_humid` | Ambas são utilizáveis, e a temperatura está acima da faixa. |

Esses valores continuam compatíveis com automações existentes. Descrevem as faixas físicas configuradas, não uma afirmação médica ou universal sobre conforto pessoal.

<a id="environmental-condition-attributes"></a>
### Atributos da condição ambiental

| Atributo | Significado |
| --- | --- |
| `data_quality` | `complete`, `unverified`, `partial`, `stale` ou `unavailable` para leituras internas monitoradas. `unverified` significa que as leituras são utilizáveis, mas pelo menos uma não tem um registro verificável de quando foi informada. |
| `data_issues` | Códigos estáveis de dados internos ausentes, desatualizados ou inválidos. Omitido quando vazio. |
| `range_summary` | Resumo factual da faixa configurada, com comparação opcional com Humidex. |
| `ventilation_opportunity` | Estado atual de ventilação do backend, alcance da avaliação, efeitos, impedimentos e motivo. |
| `comfort_zone` | Geometria selecionada simples, guiada ou personalizada por temperatura e faixa de umidade efetiva na temperatura atual. |
| `temperature_source` | ID da fonte atual de temperatura interna, quando disponível. |
| `humidity_source` | ID da fonte atual de umidade interna, quando disponível. |
| `derived_metrics` | Dados habilitados de Humidex, ponto de orvalho e umidade absoluta. Métricas não monitoradas são omitidas. |
| `outdoor` | Comparação interna/externa opcional, limites efetivos das orientações, qualidade dos dados, leituras e oportunidade ou contrapartida semântica. |
| `insights` | Códigos informativos ordenados com `code`, `kind`, `tone` e `metrics`. Omitido quando vazio. |

`derived_metrics` e `outdoor` são omitidos quando suas funções não estão habilitadas. Se leituras habilitadas estão ausentes, desatualizadas ou inválidas, seus dados continuam presentes com `availability` e contexto do problema, evitando que automações reutilizem valores antigos. `insights` é omitido quando a lista atual está vazia. Temperatura e umidade internas brutas permanecem nas entidades de origem. CO2 é classificado pelo sensor separado **Qualidade do ar**.

Para modelo guiado ou personalizado por temperatura, `comfort_zone.effective_humidity_range` é `null` quando a temperatura atual não é utilizável. A umidade pode permanecer visível, mas não tem condição e não deve ser tratada como dentro ou fora de uma faixa presumida.

`range_summary` contém:

```yaml
status: within_range | outside_range | mixed | unavailable
thermal_relation: aligned | mixed | not_evaluated | unavailable
positions:
  temperature: below | within | above | null
  humidity: below | within | above | null
  humidex: below | within | above | null
```

Por exemplo, este template detecta indicadores térmicos divergentes sem interpretar um rótulo traduzido:

```yaml
{% set summary =
   state_attr('sensor.velair_environmental_condition_living_room',
              'range_summary') %}
{{ summary is mapping and summary.get('thermal_relation') == 'mixed' }}
```

Esta condição verifica se o Humidex habilitado está atual e acima da faixa térmica configurada:

```yaml
{% set metrics =
   state_attr('sensor.velair_environmental_condition_living_room',
              'derived_metrics') or {} %}
{% set humidex = metrics.get('humidex', {}) %}
{{ humidex.get('availability') == 'current'
   and humidex.get('temperature_range_position') == 'above' }}
```

Esta condição usa um código de informação contextual do backend e permanece válida ao mudar o idioma de exibição:

```yaml
{% set insights =
   state_attr('sensor.velair_environmental_condition_living_room',
              'insights') or [] %}
{{ insights
   | selectattr('code', 'eq', 'ventilation_may_help_cool')
   | list | count > 0 }}
```

Para a comparação externa opcional, confira a disponibilidade antes de usar um número:

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
### Entidade ou evento?

Use esta entidade quando precisar do estado atual, inclusive após reiniciar o Home Assistant. Um gatilho normal de estado pode reagir a uma classificação física compatível:

```yaml
triggers:
  - trigger: state
    entity_id: sensor.velair_environmental_condition_living_room
    to: hot_and_humid
```

Use `comfort_assessment_changed` quando precisar saber o que mudou. `previous_range_summary`, `range_summary_changed` e `range_status_changed` distinguem uma transição de faixa de outra atualização de Conforto. Consulte [Mudança da avaliação de conforto](automation-events.pt-br.md#comfort-assessment-changed) para dados completos e automação pronta para copiar.

<a id="ventilation-opportunity"></a>
## Oportunidade de ventilação

O sensor por zona **Oportunidade de ventilação** é acionado por eventos e apenas informativo:

| Estado | Significado |
| --- | --- |
| `unavailable` | Conforto, comparação externa ou uma leitura necessária configurada não pode ser avaliada agora. |
| `no_opportunity` | O ar externo não ultrapassa os limites configurados em uma direção útil. |
| `may_help` | O ar externo aproxima o cômodo do Conforto, mas não é possível confirmar que alcança toda a região configurada. |
| `comfort_possible` | Temperatura externa está na faixa e, quando a umidade é monitorada, ela está na faixa de Conforto avaliada nessa temperatura externa. |
| `trade_off` | Uma melhora útil em uma dimensão monitorada piora outra de forma conhecida. |
| `already_comfortable` | A condição ambiental física já está confortável. |

`comfort_possible` é uma projeção ambiental conservadora, não promessa sobre abrir uma janela. O Velair não conhece fluxo de ar, vento, chuva, poluentes externos, ganho solar, massa térmica ou por quanto tempo a janela fica aberta. Nunca abre janelas nem altera o controle da climatização.

Atributos incluem `evaluation_scope`, `potential_effects`, `blocked_by`, `reason`, `data_quality` e `data_issues` externos e IDs das fontes externas configuradas. Se a umidade interna é monitorada, mas a externa foi omitida, a temperatura pode produzir `may_help`, nunca `comfort_possible`. Se o monitoramento de umidade estiver deliberadamente desabilitado, `comfort_possible` apenas por temperatura é válido.

`reason` é um código estável legível por máquina. Seus valores são: `monitoring_off`, `outdoor_comparison_disabled`, `indoor_temperature_unavailable`, `indoor_humidity_unavailable`, `outdoor_temperature_unavailable`, `outdoor_humidity_unavailable`, `already_comfortable`, `known_trade_off`, `no_useful_difference`, `outdoor_conditions_within_comfort`, `outdoor_humidity_not_configured` e `moves_toward_comfort`.

Para um dispositivo como `climate.living_room`, uma nova entrada no registro normalmente usa um ID como:

```text
sensor.velair_ventilation_opportunity_living_room
sensor.velair_control_living_room
sensor.velair_delivery_diagnostics_living_room
```

São IDs sugeridos, não uma API permanente. O Home Assistant pode acrescentar um sufixo para evitar conflitos, e usuários podem renomear entidades. Selecione pelos IDs reais do seu registro. O nome mostrado usa o nome amigável do dispositivo; o ID sugerido usa o identificador de objeto da entidade. Nome e área do dispositivo de serviços do Velair não fazem parte dele.

<a id="zone-control"></a>
## Controle da zona

**Controle** é habilitado por padrão e reconstruído pelo agendador após cada reinicialização. O estado identifica o responsável atual pelo controle:

| Estado | Significado |
| --- | --- |
| `automatic` | O Velair controla localmente. Inclui programação, inatividade, pausa, parada, Reforço e pré-condicionamento adaptativo. Use `runtime_state` para distinguir. |
| `manual` | O Velair cedeu ao Ajuste manual, explicitamente ou após uma mudança externa detectada. Difere do Modo **Manual**, que descreve a seleção de Perfis. |
| `external` | Um provedor externo compatível executa fisicamente a programação. Mudar por cartão, controle remoto ou outra automação não produz esse estado; quando o Velair cede a essa mudança, o estado é `manual`. |

O sensor permanece disponível durante uma migração necessária de unidade porque a informação de responsabilidade pelo controle não é um valor de temperatura.

<a id="zone-control-attributes"></a>
### Atributos do controle da zona

| Atributo | Valores ou significado |
| --- | --- |
| `runtime_state` | `idle`, `scheduled`, `preconditioning`, `boost`, `paused`, `stopped`, `externally_managed`, `temperature_migration_required` ou alternativa defensiva `unknown`. |
| `schedule_source` | `default` para Padrão, `profile` para programação efetiva de Perfil ou `profile_pause` quando o Perfil pausa a zona. |
| `profile_id` / `profile_name` | ID estável e nome do Perfil responsável, quando aplicável. |
| `mode_id` / `mode_name` | ID estável e nome do Modo selecionado, quando personalizado. |
| `manual_source` | Só em `manual`: `explicit` para seleção direta, `external_change` para mudança externa detectada no dispositivo ou alternativa defensiva `other`. |
| `manual_started_at` | Horário de início do Ajuste manual atual. |
| `manual_until` | Expiração planejada, se prevista pela política; pode estar ausente em ajuste sem prazo. |
| `manual_policy` | Só em `manual`: `until_next_block`, `for_duration`, `until_resumed` ou alternativa defensiva `unknown`. |

Atributos opcionais são omitidos quando não se aplicam. Por exemplo, uma entidade `automatic` não tem `manual_source` ou `manual_until`.

Estado de controle e estado de execução são separados intencionalmente. Por exemplo:

- `automatic` com `runtime_state: paused` significa que o Velair ainda controla, mas uma pausa impede a execução normal;
- `automatic` com `runtime_state: boost` significa que controla o Reforço temporário;
- `external` com `runtime_state: externally_managed` significa que o provedor configurado, em vez do envio local do Velair, é responsável pela execução física.

<a id="zone-delivery-diagnostics"></a>
## Diagnóstico de entrega da zona

**Diagnóstico de entrega** é uma entidade de diagnóstico desabilitada por padrão. Habilite somente quando um painel ou automação precisar da última evidência local de envio:

1. Abra **Configurações > Dispositivos e serviços > Entidades** no Home Assistant.
2. Procure **Diagnóstico de entrega** e o nome do dispositivo gerenciado.
3. Abra as configurações da entidade e habilite-a.

O sensor é acionado por eventos, sem consultas periódicas. Seu estado descreve o último resultado observado desde que a integração iniciou:

| Estado | Quando ocorre |
| --- | --- |
| `idle` | Nenhum resultado registrado desde iniciar ou limpar as evidências. |
| `success` | O Home Assistant aceitou toda a sequência de serviços. `retry_count` distingue tentativa inicial e repetição. |
| `failed` | O Home Assistant rejeitou uma chamada. Trabalho do agendador normalmente segue para recuperação limitada; uma ação única sem resiliência pode permanecer falha sem repetir. |
| `retrying` | O Velair iniciou uma tentativa limitada após falha recuperável; pode ser breve. |
| `exhausted` | A tentativa inicial do agendador e ambas as repetições adiadas falharam. |
| `invalid_intent` | Na recuperação ou reenvio, a intenção atual não pôde ser resolvida para um envio válido. Erros normais de validação de serviços/configuração são rejeitados antes deste estado. |
| `cancelled` | Trabalho ativo ou adiado foi substituído por nova intenção, invalidado explicitamente ou interrompido ainda pendente. Pode ser breve se outro começa imediatamente. |
| `unavailable` | O dispositivo estava ausente, `unknown` ou `unavailable`, então não houve chamada de serviço. Intenções elegíveis do agendador são resolvidas novamente ao recuperar disponibilidade. |

A própria entidade permanece disponível para tornar `unavailable` observável. Também permanece durante migração necessária da unidade; a evidência térmica mantém a unidade capturada com o alvo aceito.

O Velair faz atualmente no máximo duas repetições adiadas, após aproximadamente 2 e 10 segundos. Esses tempos são comportamento de recuperação, não um contrato recomendado para automações; reaja aos estados, sem depender de atrasos exatos.

<a id="delivery-diagnostic-attributes"></a>
### Atributos do diagnóstico de entrega

| Atributo | Significado |
| --- | --- |
| `updated_at` | Horário da última mudança; ausente no `idle` inicial. |
| `retry_count` | Número da tentativa representada pelo estado terminal ou de repetição: `0` inicial, depois `1` ou `2`. Cancelar volta a `0`. |
| `last_error_at` | Horário do último resultado `failed`, `exhausted` ou `invalid_intent`. |
| `last_error_code` | `failed`, `exhausted`, `invalid_intent` ou alternativa defensiva `unknown_delivery_status`. Nunca expõe texto bruto de exceções. |
| `last_accepted_at` | Horário da última sequência completa de controle aceita. |
| `last_accepted_source` | `automatic`, `manual`, `boost` ou `automatic_reassertion`. |
| `last_accepted_action` | `set_temperature`, `set_hvac_mode`, `turn_off` ou alternativa defensiva `other`. |
| `last_accepted_hvac_mode` | Modo incluído no alvo aceito, quando aplicável. |
| `last_accepted_temperature_unit` | Unidade registrada com um alvo escalar ou faixa. |
| `last_accepted_temperature` | Alvo escalar aceito, quando aplicável. |
| `last_accepted_target_temp_low` / `last_accepted_target_temp_high` | Limites aceitos da faixa nativa, quando aplicável. |

Chamadas por `velair.set_temperature` e `velair.set_hvac_mode` são informadas com `last_accepted_source: manual`. Uma chamada bem-sucedida apenas de modo tem `last_accepted_action: set_hvac_mode` e modo HVAC; atributos de temperatura permanecem ausentes ou `null`.

Campos de último erro e última aceitação são históricos independentes. Um `success` posterior muda o estado, mas não apaga `last_error_*`. Uma falha posterior também não apaga o último alvo aceito. Confira os horários para compará-los em uma automação.

`success` significa que o Home Assistant aceitou os serviços; não confirma transporte, atividade do equipamento nem que o cômodo atingiu o alvo. Use a entidade de climatização e integração do dispositivo para o estado físico. O Room Assist pode depois ajustar o alvo enviado e tem seu próprio sensor para isso. Publicação externa também tem estado separado e não é representada por este sensor de envio local.

Todas as evidências existem apenas durante a execução. Voltam a `idle` após reiniciar a integração ou Home Assistant e também são apagadas por uma redefinição bem-sucedida de dados. Não são restauradas do Recorder ou armazenamento do Velair.

<a id="automation-examples"></a>
## Exemplos de automação

A automação abaixo notifica somente após esgotar as tentativas limitadas. Substitua o ID de exemplo pelo do seu registro:

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

Esta condição por template verifica se o Velair tem controle automático atual e um bloco programado ativo:

```yaml
condition: template
value_template: >-
  {{ is_state('sensor.velair_control_living_room', 'automatic')
     and state_attr('sensor.velair_control_living_room', 'runtime_state')
         == 'scheduled' }}
```

Use **Controle** para a responsabilidade atual e contexto do agendador, **Diagnóstico de entrega** para o último resultado de serviços e `climate.living_room` para o estado informado pelo dispositivo.
