<a id="update-shared-presets-from-automations"></a>
# Atualizar predefinições partilhadas a partir de automações
<!-- velair-docs:start -->
Traduções: [Original em inglês](preset-automations.md) · [Español](preset-automations.es.md) · [Français](preset-automations.fr.md) · [Deutsch](preset-automations.de.md) · [Italiano](preset-automations.it.md) · [Nederlands](preset-automations.nl.md) · [Polski](preset-automations.pl.md) · [Português (Brasil)](preset-automations.pt-br.md) · [Português (Portugal)](preset-automations.pt-pt.md) · [Русский](preset-automations.ru.md) · [Estado das traduções](../translation-status.md)

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

Utilize `velair.update_block_preset` para alterar uma predefinição guardada do Velair a partir de uma automação ou script do Home Assistant. Esta operação altera permanentemente a definição partilhada: todos os blocos que a referenciam recebem a nova configuração, incluindo blocos de modelos e dias que seguem a configuração completa desses modelos.

Não seleciona outra predefinição para um bloco nem ativa um Perfil. Utilize Perfis ou Modos quando a automação deve escolher uma rotina diferente.

<a id="find-the-identifier"></a>
## Encontrar o identificador

Abra **Modelos → Predefinições climáticas**, selecione uma predefinição guardada e copie o respetivo **ID de automação**. Utilize esse valor como `preset_key`; mudar o nome da predefinição não altera o identificador. Os exemplos seguintes utilizam identificadores ilustrativos. Substitua-os pelos valores que copiou.

<a id="update-or-replace"></a>
## Atualizar ou substituir

A operação predefinida `operation: update` altera apenas os campos enviados e preserva a ação da predefinição e as restantes definições. Não envie `action` nesta operação.

`operation: replace` substitui toda a configuração de climatização. Envie `action` e todas as definições que pretende manter. Esta operação permite alternar entre uma ação de temperatura, apenas de modo, apenas de definições adicionais e Desligar. O nome, o identificador e a posição da predefinição na biblioteca permanecem inalterados.

| Campo | Significado |
|---|---|
| `preset_key` | Identificador obrigatório de uma predefinição existente do Velair. |
| `operation` | `update` (predefinida) ou `replace`. |
| `action` | Obrigatório para `replace`, proibido para `update`. Utilize `set_temperature`, `set_hvac_mode`, `set_climate_options` ou `turn_off`. |
| `temperature` | Temperatura-alvo única, na unidade declarada pelo Velair. |
| `target_temp_low`, `target_temp_high` | Intervalo nativo de temperaturas-alvo; envie sempre ambos os limites em conjunto. |
| `hvac_mode` | Modo HVAC, sujeito às regras da ação selecionada. |
| `fan_mode`, `preset_mode`, `swing_mode`, `swing_horizontal_mode`, `humidity` | Definições opcionais do dispositivo, sujeitas às regras da ação selecionada. |
| `clear_fields` | Apenas para `update`: lista de parâmetros de climatização a remover. |

Enviar uma temperatura-alvo única remove um intervalo anterior; enviar um intervalo completo remove uma temperatura-alvo única anterior. Nunca envie ambos na mesma chamada. Remover uma temperatura-alvo obrigatória ou a última definição de uma predefinição apenas com opções é inválido. Utilize `replace` para alterar a própria ação.

Omitir um campo em `update` preserva-o. Cadeias vazias e `null` não são instruções para remover uma definição; utilize `clear_fields`. Um campo não pode ser definido e removido na mesma chamada. Remover uma definição do dispositivo deixa de enviar esse comando; não repõe essa definição no termóstato.

O formulário normal de ações do Home Assistant define as alterações a efetuar sempre que a automação é executada. Não carrega os valores atuais da predefinição para o formulário. Os parâmetros menos utilizados estão agrupados em secções recolhidas.

<a id="example-adjust-heating-comfort-to-outdoor-temperature"></a>
## Exemplo: ajustar o conforto de aquecimento à temperatura exterior

**Situação:** a sala e o escritório utilizam a predefinição **Heating comfort** do Velair, configurada para aquecimento a 21 °C com ventilação silenciosa. Pretende 21 °C quando está frio e 19 °C com tempo mais ameno, mantendo o modo e as definições da ventoinha.

Esta automação avalia a situação no arranque do Home Assistant e nas alterações do sensor exterior. Abaixo de 10 °C, define 21 °C; acima de 12 °C, define 19 °C. Entre esses limiares, mantém a temperatura-alvo anterior. A diferença evita alternâncias repetidas em torno de um único limiar. Se o sensor estiver indisponível, não faz alterações.

```yaml
alias: Velair heating comfort by outdoor temperature
triggers:
  - trigger: homeassistant
    event: start
  - trigger: state
    entity_id: sensor.outdoor_temperature
conditions:
  - condition: template
    value_template: "{{ is_number(states('sensor.outdoor_temperature')) }}"
actions:
  - choose:
      - conditions:
          - condition: numeric_state
            entity_id: sensor.outdoor_temperature
            below: 10
        sequence:
          - action: velair.update_block_preset
            data:
              preset_key: preset_heating_comfort
              temperature: 21
      - conditions:
          - condition: numeric_state
            entity_id: sensor.outdoor_temperature
            above: 12
        sequence:
          - action: velair.update_block_preset
            data:
              preset_key: preset_heating_comfort
              temperature: 19
mode: queued
max: 10
```

O exemplo pressupõe que o Velair e o sensor exterior utilizam °C. Para Fahrenheit, escolha limiares e temperaturas-alvo equivalentes nas unidades adequadas. O serviço nunca converte o valor do sensor exterior para esta automação.

As duas divisões mantêm as próprias programações. Se Heating comfort estiver ativa e o Velair tiver controlo automático, a temperatura-alvo muda depois de guardar. Se o próximo bloco estiver no futuro, o Velair recalcula os eventos programados e o plano de Pré-condicionamento. Chamadas repetidas com a configuração inalterada não escrevem no armazenamento nem enviam comandos.

<a id="example-update-a-native-range"></a>
## Exemplo: atualizar um intervalo nativo

**Situação:** um termóstato que suporta intervalos de aquecimento/arrefecimento utiliza **Home range**. Altere o intervalo para 19–25 °C, preservando o modo e as opções do dispositivo:

```yaml
action: velair.update_block_preset
data:
  preset_key: preset_home_range
  target_temp_low: 19
  target_temp_high: 25
```

Envie ambos os limites mesmo que só um mude. Um termóstato que suporta apenas uma temperatura-alvo não pode utilizar esta predefinição. O Velair não deduz uma temperatura única compatível nem um limite do intervalo em falta.

<a id="example-change-or-remove-a-device-setting"></a>
## Exemplo: alterar ou remover uma definição do dispositivo

Para alterar apenas a definição da ventoinha, preservando a temperatura e o modo HVAC:

```yaml
action: velair.update_block_preset
data:
  preset_key: preset_heating_comfort
  fan_mode: auto
```

Para deixar de incluir um comando de ventoinha nessa predefinição:

```yaml
action: velair.update_block_preset
data:
  preset_key: preset_heating_comfort
  clear_fields:
    - fan_mode
```

`preset_mode` refere-se a uma **predefinição do dispositivo**, como `eco` ou `sleep`. É um parâmetro dentro da predefinição do Velair, não o identificador de outra predefinição do Velair.

<a id="example-replace-with-off-and-restore-explicitly"></a>
## Exemplo: substituir por Desligar e restaurar explicitamente

Substitua a configuração de uma predefinição guardada por Desligar:

```yaml
action: velair.update_block_preset
data:
  preset_key: preset_heating_comfort
  operation: replace
  action: turn_off
```

Para restaurar o aquecimento a 21 °C com ventilação silenciosa, substitua-a novamente de forma explícita:

```yaml
action: velair.update_block_preset
data:
  preset_key: preset_heating_comfort
  operation: replace
  action: set_temperature
  temperature: 21
  hvac_mode: heat
  fan_mode: quiet
```

Não há expiração temporizada nem restauro automático. Desligar afeta todas as referências guardadas a esta predefinição. Para uma janela aberta ou uma suspensão temporária por divisão, prefira uma [pausa de zona](usage.pt-pt.md#services) com identificação do responsável, que deixa a predefinição partilhada inalterada.

<a id="validation-and-runtime-behavior"></a>
## Validação e comportamento durante a execução

- O Velair valida todas as utilizações guardadas, incluindo Perfis inativos e programações predefinidas ocultadas por um Perfil. Uma utilização incompatível rejeita toda a atualização; nada é guardado parcialmente.
- As definições opcionais suportadas podem ser filtradas por termóstato através das regras de adaptação existentes. Continuam a aplicar-se os limites de temperatura, a compatibilidade da ação e as restrições dos controladores externos.
- Reforço, Pausa, Ajuste manual e Paragem mantêm a sua prioridade. Atualizar uma predefinição não os cancela. Ao retomar o controlo automático, o Velair utiliza as últimas definições guardadas.
- Uma alteração automática ativa aplica-se depois de guardar; uma alteração apenas futura não envia desnecessariamente um comando agora. O Pré-condicionamento e o Room Assist são ajustados quando a temperatura-alvo ou a fonte muda. As ações apenas de modo, apenas com opções e Desligar não passam a antecipar a temperatura.
- Os controladores externos recebem programações semanais completas atualizadas com os valores efetivos quando as respetivas programações efetivas mudam. Uma falha de publicação não ativa a execução local.
- Identificadores desconhecidos, combinações inválidas, utilizações incompatíveis e uma migração pendente de unidades de temperatura produzem erros. As falhas de envio ao dispositivo após guardar não desfazem a predefinição guardada.

Os limiares ambientais, a histerese, a interpretação da previsão e a decisão de quando restaurar uma definição pertencem às automações do Home Assistant. O serviço não cria regras meteorológicas nem consultas periódicas dentro do Velair. O [blueprint de seleção sazonal da climatização](blueprints/seasonal-climate-selection.pt-pt.md) pode selecionar Modos ou executar estes serviços depois de uma temperatura permanecer estável durante um atraso configurado. Escolha Modos quando inverno e verão devem manter definições de predefinições separadas; atualizar uma predefinição altera todas suas utilizações.

Consulte [Predefinições de blocos e modelos ligados](linked-schedules.pt-pt.md) para o âmbito dos funções partilhados e [Exemplos práticos](linked-schedule-examples.pt-pt.md) para configurações completas da casa.
