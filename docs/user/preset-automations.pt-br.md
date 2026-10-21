<a id="update-shared-presets-from-automations"></a>
# Atualizar predefinições compartilhadas por automações
<!-- velair-docs:start -->
Traduções: [Original em inglês](preset-automations.md) · [Español](preset-automations.es.md) · [Français](preset-automations.fr.md) · [Deutsch](preset-automations.de.md) · [Italiano](preset-automations.it.md) · [Nederlands](preset-automations.nl.md) · [Polski](preset-automations.pl.md) · [Português (Brasil)](preset-automations.pt-br.md) · [Português (Portugal)](preset-automations.pt-pt.md) · [Русский](preset-automations.ru.md) · [Status das traduções](../translation-status.md)

<details>
<summary>Status desta tradução</summary>

| Informação | Status |
| --- | --- |
| Versão de referência | 1.9.0-beta.4 |
| Última sincronização | 2026-10-21 |
| Revisão linguística | Tradução assistida por IA |
| Em relação ao original | Sincronizada com o original em inglês. |

</details>

---
<!-- velair-docs:end -->

Use `velair.update_block_preset` para alterar uma predefinição salva do Velair por uma automação ou script do Home Assistant. Isso edita permanentemente a definição compartilhada: todos os blocos que fazem referência a ela recebem a nova configuração, incluindo blocos de modelos e dias que seguem a configuração completa desses modelos.

Isso não seleciona outra predefinição para um bloco nem ativa um Perfil. Use Perfis ou Modos quando a automação deve escolher uma rotina diferente.

<a id="find-the-identifier"></a>
## Encontrar o identificador

Abra **Modelos → Predefinições climáticas**, selecione uma predefinição salva e copie seu **ID de automação**. Use esse valor em `preset_key`; renomear a predefinição não altera seu identificador. Os exemplos abaixo usam identificadores ilustrativos. Substitua-os pelos valores que você copiou.

<a id="update-or-replace"></a>
## Atualizar ou substituir

O padrão `operation: update` altera apenas os campos enviados e preserva a ação e as demais configurações da predefinição. Não envie `action` nessa operação.

`operation: replace` substitui toda a configuração de climatização. Envie `action` e todas as configurações que devem permanecer. É assim que se alterna entre uma ação de temperatura, apenas modo, apenas configurações adicionais e Desligar. Nome, identificador e posição da predefinição na biblioteca permanecem iguais.

| Campo | Significado |
|---|---|
| `preset_key` | Identificador obrigatório de uma predefinição existente do Velair. |
| `operation` | `update` (padrão) ou `replace`. |
| `action` | Obrigatório para `replace`, proibido para `update`. Use `set_temperature`, `set_hvac_mode`, `set_climate_options` ou `turn_off`. |
| `temperature` | Temperatura-alvo única, na unidade declarada pelo Velair. |
| `target_temp_low`, `target_temp_high` | Faixa-alvo nativa; sempre envie os dois limites juntos. |
| `hvac_mode` | Modo HVAC, sujeito às regras da ação selecionada. |
| `fan_mode`, `preset_mode`, `swing_mode`, `swing_horizontal_mode`, `humidity` | Configurações opcionais do dispositivo, sujeitas às regras da ação selecionada. |
| `clear_fields` | Apenas para `update`: lista de parâmetros de climatização a remover. |

Enviar um alvo escalar remove uma faixa anterior; enviar uma faixa completa remove um alvo escalar anterior. Nunca envie ambos na mesma chamada. É inválido remover uma temperatura-alvo obrigatória ou a última configuração de uma predefinição que só contém opções. Use `replace` para mudar a própria ação.

Omitir um campo em `update` o preserva. Strings vazias e `null` não são instruções de remoção; use `clear_fields`. Um campo não pode ser definido e removido na mesma chamada. Remover uma configuração do dispositivo faz com que esse comando deixe de ser enviado; não redefine a configuração no termostato.

O formulário padrão de ações do Home Assistant define as alterações a fazer cada vez que a automação executa. Não carrega os valores atuais da predefinição no formulário. Parâmetros menos usados ficam agrupados em seções recolhidas.

<a id="example-adjust-heating-comfort-to-outdoor-temperature"></a>
## Exemplo: ajustar o conforto de aquecimento à temperatura externa

**Situação:** Sala e Escritório usam a predefinição do Velair **Conforto de aquecimento**, configurada para aquecer a 21 °C com ventilador silencioso. Você quer 21 °C quando está frio e 19 °C com tempo mais ameno, mantendo as configurações de modo e ventilador.

Esta automação avalia a situação na inicialização do Home Assistant e nas mudanças do sensor externo. Abaixo de 10 °C, define 21 °C; acima de 12 °C, define 19 °C. Entre esses limites, mantém a temperatura-alvo anterior. O intervalo evita alternâncias repetidas em torno de um único limite. Se o sensor estiver indisponível, não altera nada.

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

O exemplo pressupõe que o Velair e o sensor externo usam °C. Para Fahrenheit, escolha limites e temperaturas-alvo equivalentes nas unidades apropriadas. O serviço nunca converte o valor do sensor externo para esta automação.

Os dois cômodos mantêm suas próprias programações. Se Conforto de aquecimento estiver ativo e o Velair tiver controle automático, a temperatura-alvo muda após salvar. Se o próximo bloco for futuro, o Velair recalcula os eventos programados e o plano de Pré-condicionamento. Chamadas repetidas sem mudança de configuração não gravam no armazenamento nem enviam comandos.

<a id="example-update-a-native-range"></a>
## Exemplo: atualizar uma faixa nativa

**Situação:** um termostato compatível com faixas Aquecer/resfriar usa **Faixa em casa**. Altere a faixa-alvo para 19–25 °C, preservando o modo e as opções do dispositivo:

```yaml
action: velair.update_block_preset
data:
  preset_key: preset_home_range
  target_temp_low: 19
  target_temp_high: 25
```

Envie os dois limites mesmo se só um mudar. Um termostato que aceita apenas temperatura única não pode usar essa predefinição. O Velair não deduz um alvo escalar compatível nem um limite ausente.

<a id="example-change-or-remove-a-device-setting"></a>
## Exemplo: alterar ou remover uma configuração do dispositivo

Para alterar apenas a configuração do ventilador, preservando a temperatura e o modo HVAC:

```yaml
action: velair.update_block_preset
data:
  preset_key: preset_heating_comfort
  fan_mode: auto
```

Para deixar de incluir um comando de ventilador nessa predefinição:

```yaml
action: velair.update_block_preset
data:
  preset_key: preset_heating_comfort
  clear_fields:
    - fan_mode
```

`preset_mode` se refere a uma **predefinição do dispositivo**, como `eco` ou `sleep`. É um parâmetro dentro da predefinição do Velair, não o identificador de outra predefinição do Velair.

<a id="example-replace-with-off-and-restore-explicitly"></a>
## Exemplo: substituir por Desligar e restaurar explicitamente

Substitua a configuração de uma predefinição salva por Desligar:

```yaml
action: velair.update_block_preset
data:
  preset_key: preset_heating_comfort
  operation: replace
  action: turn_off
```

Para restaurar aquecimento a 21 °C com ventilador silencioso, substitua novamente de forma explícita:

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

Não há expiração temporizada nem restauração automática. Desligar afeta todas as referências salvas dessa predefinição. Para uma janela aberta ou suspensão temporária por cômodo, prefira uma [pausa da zona](usage.pt-br.md#services) com responsabilidade identificada, que preserva a predefinição compartilhada.

<a id="validation-and-runtime-behavior"></a>
## Validação e comportamento durante a execução

- O Velair valida todos os usos salvos, incluindo Perfis inativos e programações Padrão ocultas por um Perfil. Um uso incompatível rejeita toda a atualização; nada é salvo parcialmente.
- Configurações opcionais compatíveis podem ser filtradas por termostato pelas regras existentes de adaptação. Limites de temperatura, compatibilidade da ação e restrições do controlador externo continuam valendo.
- Reforço, Pausa, Ajuste manual e Parada mantêm sua autoridade. Atualizar uma predefinição não os cancela. Ao retomar o controle automático, o Velair usa as configurações salvas mais recentes.
- Uma alteração automática ativa é aplicada após salvar; uma alteração apenas futura não envia um comando desnecessário agora. Pré-condicionamento e Room Assist são reconciliados quando seu alvo ou fonte muda. Ações de apenas modo, apenas opções e Desligar não ganham antecipação de temperatura.
- Controladores externos recebem programações semanais completas atualizadas, com os valores efetivos, quando suas programações efetivas mudam. Uma falha de publicação não habilita a execução local.
- Identificadores desconhecidos, combinações inválidas, usos incompatíveis e migração pendente da unidade de temperatura produzem erros. Falhas no envio aos dispositivos após persistir não desfazem a predefinição salva.

Limites ambientais, histerese, interpretação da previsão e o momento de restaurar uma configuração pertencem às automações do Home Assistant. O serviço não cria regras meteorológicas nem consultas periódicas no Velair. O [blueprint de seleção sazonal da climatização](blueprints/seasonal-climate-selection.pt-br.md) pode selecionar Modos ou executar esses serviços uma única vez depois que a temperatura permanecer em uma nova faixa sazonal por um atraso configurado. Escolha Modos quando inverno e verão devem manter definições separadas de predefinições; atualizar uma predefinição altera todos os seus usos.

Consulte [Predefinições de blocos e modelos vinculados](linked-schedules.pt-br.md) para o alcance dos recursos compartilhados e [Exemplos práticos](linked-schedule-examples.pt-br.md) para configurações domésticas completas.
