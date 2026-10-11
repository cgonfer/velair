<a id="zone-control-and-delivery-sensors"></a>
# Sensores de controlo e envio por zona
<!-- velair-docs:start -->
Traduções: [Original em inglês](zone-sensors.md) · [Español](zone-sensors.es.md) · [Français](zone-sensors.fr.md) · [Deutsch](zone-sensors.de.md) · [Italiano](zone-sensors.it.md) · [Nederlands](zone-sensors.nl.md) · [Polski](zone-sensors.pl.md) · [Português (Brasil)](zone-sensors.pt-br.md) · [Português (Portugal)](zone-sensors.pt-pt.md) · [Русский](zone-sensors.ru.md) · [Estado das traduções](../translation-status.md)

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

O Velair cria dois sensores de contexto para cada entidade `climate.*` gerida:

- **Controlo** informa quem controla a zona agora e qual configuração do Velair se aplica.
- **Diagnóstico de entrega** informa o que aconteceu na tentativa mais recente de enviar um alvo pelo Home Assistant.

Eles descrevem camadas diferentes. Uma zona pode estar em controlo automático enquanto o último envio ficou indisponível ou falhou; nenhum substitui o outro.

O sensor separado **Condição ambiental** disponibiliza `derived_metrics` ativados e a lista ordenada `insights`, apenas durante a execução, quando Conforto está ativado. As informações contêm `code`, `kind`, `tone` e `metrics` de apoio; são apenas informativas e nunca executam ações. Consulte [Conforto ambiental](comfort.pt-pt.md#comfort-insights). Com comparação externa opcional, o mesmo sensor também disponibiliza `outdoor`, com leituras de origem, humidades absolutas interna e externa explícitas, qualidade independente e oportunidade ou contrapartida semântica de ventilação. O Velair não cria entidades intermédias para leituras individuais. Cria um sensor enumerado separado **Oportunidade de ventilação** para o resumo de automação calculado pelo backend descrito abaixo.

<a id="environmental-condition"></a>
## Condição ambiental

**Condição ambiental** fornece o estado atual para automações de Conforto. É ativado por predefinição para cada dispositivo e atualizado pela mesma avaliação do backend usada no painel. Consultá-lo não faz uma nova consulta ao sensor nem executa uma ação de climatização.

O seu estado nativo mantém a classificação física compatível de temperatura e humidade:

| Estado | Significado |
| --- | --- |
| `monitoring_off` | Monitorização de Conforto desativada para o dispositivo. |
| `no_readings` | Nenhuma leitura monitorizada utilizável disponível. |
| `temperature_comfortable` | Só a temperatura pode ser avaliada e está no intervalo configurado. |
| `humidity_comfortable` | Só a humidade pode ser avaliada e está no intervalo configurado. |
| `comfortable` | Ambas estão nos respetivos intervalos. |
| `cold` / `hot` | Temperatura abaixo ou acima do intervalo. |
| `dry` / `humid` | Humidade abaixo ou acima do intervalo. |
| `cold_and_dry` / `cold_and_humid` | Ambas são utilizáveis, e a temperatura está abaixo do intervalo. |
| `hot_and_dry` / `hot_and_humid` | Ambas são utilizáveis, e a temperatura está acima do intervalo. |

Esses valores continuam compatíveis com automações existentes. Descrevem os intervalos físicos configurados, não uma afirmação médica ou universal sobre conforto pessoal.

<a id="environmental-condition-attributes"></a>
### Atributos da condição ambiental

| Atributo | Significado |
| --- | --- |
| `data_quality` | `complete`, `unverified`, `partial`, `stale` ou `unavailable` para leituras internas monitorizadas. `unverified` significa que as leituras são utilizáveis, mas pelo menos uma não tem um registo verificável de quando foi comunicada. |
| `data_issues` | Códigos estáveis de dados internos ausentes, desatualizados ou inválidos. Omitido quando vazio. |
| `range_summary` | Resumo factual do intervalo configurado, com comparação opcional com Humidex. |
| `ventilation_opportunity` | Estado atual de ventilação do backend, alcance da avaliação, efeitos, impedimentos e motivo. |
| `comfort_zone` | Geometria selecionada simples, guiada ou personalizada por temperatura e intervalo de humidade efetivo na temperatura atual. |
| `temperature_source` | ID da fonte atual de temperatura interna, quando disponível. |
| `humidity_source` | ID da fonte atual de humidade interna, quando disponível. |
| `derived_metrics` | Dados ativados de Humidex, ponto de orvalho e humidade absoluta. Métricas não monitorizadas são omitidas. |
| `outdoor` | Comparação interna/externa opcional, limites efetivos das orientações, qualidade dos dados, leituras e oportunidade ou contrapartida semântica. |
| `insights` | Códigos informativos ordenados com `code`, `kind`, `tone` e `metrics`. Omitido quando vazio. |

`derived_metrics` e `outdoor` são omitidos quando as suas funções não estão ativadas. Se leituras ativadas estão ausentes, desatualizadas ou inválidas, os seus dados continuam presentes com `availability` e contexto do problema, evitando que automações reutilizem valores antigos. `insights` é omitido quando a lista atual está vazia. Temperatura e humidade internas brutas permanecem nas entidades de origem. CO2 é classificado pelo sensor separado **Qualidade do ar**.

Para modelo guiado ou personalizado por temperatura, `comfort_zone.effective_humidity_range` é `null` quando a temperatura atual não é utilizável. A humidade pode permanecer visível, mas não tem condição e não deve ser tratada como dentro ou fora de um intervalo presumido.

`range_summary` contém:

```yaml
status: within_range | outside_range | mixed | unavailable
thermal_relation: aligned | mixed | not_evaluated | unavailable
positions:
  temperature: below | within | above | null
  humidity: below | within | above | null
  humidex: below | within | above | null
```

Por exemplo, este template deteta indicadores térmicos divergentes sem interpretar um rótulo traduzido:

```yaml
{% set summary =
   state_attr('sensor.velair_environmental_condition_living_room',
              'range_summary') %}
{{ summary is mapping and summary.get('thermal_relation') == 'mixed' }}
```

Esta condição verifica se o Humidex ativado está atual e acima do intervalo térmico configurado:

```yaml
{% set metrics =
   state_attr('sensor.velair_environmental_condition_living_room',
              'derived_metrics') or {} %}
{% set humidex = metrics.get('humidex', {}) %}
{{ humidex.get('availability') == 'current'
   and humidex.get('temperature_range_position') == 'above' }}
```

Esta condição usa um código de informação contextual do backend e permanece válida ao mudar o idioma da interface:

```yaml
{% set insights =
   state_attr('sensor.velair_environmental_condition_living_room',
              'insights') or [] %}
{{ insights
   | selectattr('code', 'eq', 'ventilation_may_help_cool')
   | list | count > 0 }}
```

Para a comparação externa opcional, verifique a disponibilidade antes de utilizar um número:

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

Use esta entidade quando precisar do estado atual, inclusive após reiniciar o Home Assistant. Um acionador normal de estado pode reagir a uma classificação física compatível:

```yaml
triggers:
  - trigger: state
    entity_id: sensor.velair_environmental_condition_living_room
    to: hot_and_humid
```

Use `comfort_assessment_changed` quando precisar de saber o que mudou. `previous_range_summary`, `range_summary_changed` e `range_status_changed` distinguem uma transição de intervalo de outra atualização de Conforto. Consulte [Mudança da avaliação de conforto](automation-events.pt-pt.md#comfort-assessment-changed) para dados completos e automação pronta para copiar.

<a id="ventilation-opportunity"></a>
## Oportunidade de ventilação

O sensor por zona **Oportunidade de ventilação** é baseado em eventos e apenas informativo:

| Estado | Significado |
| --- | --- |
| `unavailable` | Conforto, comparação externa ou uma leitura necessária configurada não pode ser avaliada agora. |
| `no_opportunity` | O ar externo não ultrapassa os limites configurados numa direção útil. |
| `may_help` | O ar externo aproxima a divisão do Conforto, mas não é possível confirmar que alcança toda a região configurada. |
| `comfort_possible` | Temperatura externa está no intervalo e, quando a humidade é monitorizada, ela está no intervalo de Conforto avaliado nessa temperatura exterior. |
| `trade_off` | Uma melhora útil em uma dimensão monitorizada piora outra de forma conhecida. |
| `already_comfortable` | A condição ambiental física já está confortável. |

`comfort_possible` é uma projeção ambiental conservadora, não promessa sobre abrir uma janela. O Velair não conhece fluxo de ar, vento, chuva, poluentes externos, ganho solar, massa térmica ou por quanto tempo a janela fica aberta. Nunca abre janelas nem altera o controlo da climatização.

Atributos incluem `evaluation_scope`, `potential_effects`, `blocked_by`, `reason`, `data_quality` e `data_issues` externos e IDs das fontes externas configuradas. Se a humidade interna é monitorizada, mas a externa foi omitida, a temperatura pode produzir `may_help`, nunca `comfort_possible`. Se a monitorização de humidade estiver deliberadamente desativada, `comfort_possible` apenas por temperatura é válido.

`reason` é um código estável legível por máquina. Os seus valores são: `monitoring_off`, `outdoor_comparison_disabled`, `indoor_temperature_unavailable`, `indoor_humidity_unavailable`, `outdoor_temperature_unavailable`, `outdoor_humidity_unavailable`, `already_comfortable`, `known_trade_off`, `no_useful_difference`, `outdoor_conditions_within_comfort`, `outdoor_humidity_not_configured` e `moves_toward_comfort`.

Para um dispositivo como `climate.living_room`, uma nova entrada no registo normalmente usa um ID como:

```text
sensor.velair_ventilation_opportunity_living_room
sensor.velair_control_living_room
sensor.velair_delivery_diagnostics_living_room
```

São IDs sugeridos, não uma API permanente. O Home Assistant pode acrescentar um sufixo para evitar conflitos, e utilizadores podem renomear entidades. Selecione pelos IDs reais do seu registo. O nome mostrado usa o nome amigável do dispositivo; o ID sugerido usa o identificador de objeto da entidade. Nome e área do dispositivo de serviços do Velair não fazem parte dele.

<a id="zone-control"></a>
## Controlo da zona

**Controlo** é ativado por predefinição e reconstruído pelo agendador após cada reinício. O estado identifica o responsável atual pelo controlo:

| Estado | Significado |
| --- | --- |
| `automatic` | O Velair controla localmente. Inclui programação, inatividade, pausa, paragem, Reforço e pré-condicionamento adaptativo. Use `runtime_state` para distinguir. |
| `manual` | O Velair cedeu ao Ajuste manual, explicitamente ou após uma mudança externa detetada. Difere do Modo **Manual**, que descreve a seleção de Perfis. |
| `external` | Um fornecedor externo compatível executa fisicamente a programação. Mudar por cartão, controlo remoto ou outra automação não produz esse estado; quando o Velair cede a essa mudança, o estado é `manual`. |

O sensor permanece disponível durante uma migração necessária de unidade porque a informação de responsabilidade pelo controlo não é um valor de temperatura.

<a id="zone-control-attributes"></a>
### Atributos do controlo da zona

| Atributo | Valores ou significado |
| --- | --- |
| `runtime_state` | `idle`, `scheduled`, `preconditioning`, `boost`, `paused`, `stopped`, `externally_managed`, `temperature_migration_required` ou alternativa defensiva `unknown`. |
| `schedule_source` | `default` para Predefinição, `profile` para programação efetiva de Perfil ou `profile_pause` quando o Perfil pausa a zona. |
| `profile_id` / `profile_name` | ID estável e nome do Perfil responsável, quando aplicável. |
| `mode_id` / `mode_name` | ID estável e nome do Modo selecionado, quando personalizado. |
| `manual_source` | Só em `manual`: `explicit` para seleção direta, `external_change` para mudança externa detetada no dispositivo ou alternativa defensiva `other`. |
| `manual_started_at` | Horário de início do Ajuste manual atual. |
| `manual_until` | Expiração planeada, se prevista pela política; pode estar ausente em ajuste sem prazo. |
| `manual_policy` | Só em `manual`: `until_next_block`, `for_duration`, `until_resumed` ou alternativa defensiva `unknown`. |

Atributos opcionais são omitidos quando não se aplicam. Por exemplo, uma entidade `automatic` não tem `manual_source` ou `manual_until`.

Estado de controlo e estado de execução são separados intencionalmente. Por exemplo:

- `automatic` com `runtime_state: paused` significa que o Velair ainda controla, mas uma pausa impede a execução normal;
- `automatic` com `runtime_state: boost` significa que controla o Reforço temporário;
- `external` com `runtime_state: externally_managed` significa que o fornecedor configurado, em vez do envio local do Velair, é responsável pela execução física.

<a id="zone-delivery-diagnostics"></a>
## Diagnóstico de entrega da zona

**Diagnóstico de entrega** é uma entidade de diagnóstico desativada por predefinição. Ative apenas quando um painel ou automação precisar da última evidência local de envio:

1. Abra **Definições > Dispositivos e serviços > Entidades** no Home Assistant.
2. Procure **Diagnóstico de entrega** e o nome do dispositivo gerido.
3. Abra as definições da entidade e ative-a.

O sensor é baseado em eventos, sem consultas periódicas. O seu estado descreve o último resultado observado desde que a integração iniciou:

| Estado | Quando ocorre |
| --- | --- |
| `idle` | Nenhum resultado registado desde iniciar ou limpar as evidências. |
| `success` | O Home Assistant aceitou toda a sequência de serviços. `retry_count` distingue tentativa inicial e repetição. |
| `failed` | O Home Assistant rejeitou uma chamada. Trabalho do agendador normalmente segue para recuperação limitada; uma ação única sem resiliência pode permanecer falha sem repetir. |
| `retrying` | O Velair iniciou uma tentativa limitada após falha recuperável; pode ser breve. |
| `exhausted` | A tentativa inicial do agendador e ambas as repetições adiadas falharam. |
| `invalid_intent` | Na recuperação ou reenvio, a intenção atual não pôde ser resolvida para um envio válido. Erros normais de validação de serviços/configuração são rejeitados antes deste estado. |
| `cancelled` | Trabalho ativo ou adiado foi substituído por nova intenção, invalidado explicitamente ou interrompido ainda pendente. Pode ser breve se outro começa imediatamente. |
| `unavailable` | O dispositivo estava ausente, `unknown` ou `unavailable`, então não houve chamada de serviço. Intenções elegíveis do agendador são resolvidas novamente ao recuperar disponibilidade. |

A própria entidade permanece disponível para tornar `unavailable` observável. Também permanece durante migração necessária da unidade; a evidência térmica mantém a unidade capturada com o alvo aceite.

O Velair faz atualmente no máximo duas repetições adiadas, após aproximadamente 2 e 10 segundos. Esses tempos são comportamento de recuperação, não um contrato recomendado para automações; reaja aos estados, sem depender de atrasos exatos.

<a id="delivery-diagnostic-attributes"></a>
### Atributos do diagnóstico de entrega

| Atributo | Significado |
| --- | --- |
| `updated_at` | Horário da última mudança; ausente no `idle` inicial. |
| `retry_count` | Número da tentativa representada pelo estado terminal ou de repetição: `0` inicial, depois `1` ou `2`. Cancelar volta a `0`. |
| `last_error_at` | Horário do último resultado `failed`, `exhausted` ou `invalid_intent`. |
| `last_error_code` | `failed`, `exhausted`, `invalid_intent` ou alternativa defensiva `unknown_delivery_status`. Nunca expõe texto bruto de exceções. |
| `last_accepted_at` | Horário da última sequência completa de controlo aceite. |
| `last_accepted_source` | `automatic`, `manual`, `boost` ou `automatic_reassertion`. |
| `last_accepted_action` | `set_temperature`, `set_hvac_mode`, `turn_off` ou alternativa defensiva `other`. |
| `last_accepted_hvac_mode` | Modo incluído no alvo aceite, quando aplicável. |
| `last_accepted_temperature_unit` | Unidade registada com um alvo escalar ou intervalo. |
| `last_accepted_temperature` | Alvo escalar aceite, quando aplicável. |
| `last_accepted_target_temp_low` / `last_accepted_target_temp_high` | Limites aceites do intervalo nativo, quando aplicável. |

Chamadas por `velair.set_temperature` e `velair.set_hvac_mode` são informadas com `last_accepted_source: manual`. Uma chamada bem-sucedida apenas de modo tem `last_accepted_action: set_hvac_mode` e modo HVAC; atributos de temperatura permanecem ausentes ou `null`.

Campos de último erro e última aceitação são históricos independentes. Um `success` posterior muda o estado, mas não apaga `last_error_*`. Uma falha posterior também não apaga o último alvo aceite. Verifique os horários para compará-los em uma automação.

`success` significa que o Home Assistant aceitou os serviços; não confirma transporte, atividade do equipamento nem que a divisão atingiu o alvo. Use a entidade de climatização e integração do dispositivo para o estado físico. O Room Assist pode depois ajustar o alvo enviado e tem o seu próprio sensor para isso. Publicação externa também tem estado separado e não é representada por este sensor de envio local.

Todas as evidências existem apenas durante a execução. Voltam a `idle` após reiniciar a integração ou Home Assistant e também são apagadas por uma redefinição bem-sucedida de dados. Não são restauradas do Recorder ou armazenamento do Velair.

<a id="automation-examples"></a>
## Exemplos de automação

A automação abaixo notifica apenas após esgotar as tentativas limitadas. Substitua o ID de exemplo pelo do seu registo:

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

Esta condição por template verifica se o Velair tem controlo automático atual e um bloco programado ativo:

```yaml
condition: template
value_template: >-
  {{ is_state('sensor.velair_control_living_room', 'automatic')
     and state_attr('sensor.velair_control_living_room', 'runtime_state')
         == 'scheduled' }}
```

Use **Controlo** para a responsabilidade atual e contexto do agendador, **Diagnóstico de entrega** para o último resultado de serviços e `climate.living_room` para o estado informado pelo dispositivo.
