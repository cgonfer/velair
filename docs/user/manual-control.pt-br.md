<a id="external-changes-and-manual-adjustment"></a>
# Alterações externas e Ajuste manual
<!-- velair-docs:start -->
Traduções: [Original em inglês](manual-control.md) · [Español](manual-control.es.md) · [Français](manual-control.fr.md) · [Deutsch](manual-control.de.md) · [Italiano](manual-control.it.md) · [Nederlands](manual-control.nl.md) · [Polski](manual-control.pl.md) · [Português (Brasil)](manual-control.pt-br.md) · [Português (Portugal)](manual-control.pt-pt.md) · [Русский](manual-control.ru.md) · [Status das traduções](../translation-status.md)

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

O Velair reconhece quando modo HVAC ou temperatura-alvo de uma entidade `climate.*` gerenciada muda sem corresponder a um comando enviado pelo Velair. Para cada dispositivo, você escolhe se mantém a autoridade automática ou cede ao ajuste externo pelo Ajuste manual.

Um ajuste externo pode vir de:

- cartão padrão de climatização do Home Assistant;
- termostato físico ou controle infravermelho cuja integração informa o novo estado;
- aplicativo do fabricante cuja integração atualiza o Home Assistant;
- script ou automação que chama diretamente a entidade de climatização;
- qualquer outra origem que altera a entidade sem passar pelo Velair.

O Velair chama esse estado de controle cedido de **Ajuste manual**. «Manual» descreve quem controla um dispositivo naquele momento; não afirma que uma pessoa fez a alteração.

<a id="the-two-independent-questions"></a>
## Duas questões independentes

O Velair sempre mantém estes conceitos separados:

| Conceito | Alcance | Significado |
| --- | --- | --- |
| Programação automática | Um dispositivo gerenciado | O Velair pode enviar a programação efetiva. |
| Ajuste manual | Um dispositivo gerenciado | Alvo ou modo externo tem autoridade temporária. |
| Modo **Manual** do Velair | Conjunto completo de Perfis ativos | Perfis foram selecionados diretamente, sem um Modo personalizado salvo. |
| Reforço | Um dispositivo | O Velair aplica intencionalmente um alvo temporário. |
| Pausa da zona | Um dispositivo | Motivos independentes impedem a execução da programação, podendo desligar. |
| Pausa global ou Parada | Todos | Agendador pausado ou desabilitado globalmente. |

Esses estados podem coexistir. Por exemplo, o Modo **Manual** pode selecionar o Perfil `Sleep` enquanto `climate.living_room` está em **Ajuste manual**. O Perfil mantém a autoridade sobre a configuração da programação, mas aquele dispositivo conserva o ajuste externo até terminar o Ajuste manual.

<a id="what-velair-observes"></a>
## O que o Velair observa

O Velair observa estes campos de controle nos dispositivos gerenciados:

- `hvac_mode`, representado pelo estado da entidade, incluindo `off`, `heat`, `cool` e `heat_cool`;
- `temperature` para alvo escalar;
- `target_temp_low` e `target_temp_high` para faixa nativa.

Não entra em Ajuste manual se apenas estes valores mudarem:

- `current_temperature` ou `hvac_action`;
- leituras de umidade;
- disponibilidade;
- opções de ventilador, predefinição, oscilação ou umidade-alvo;
- capacidades, como mínimo de temperatura ou modos aceitos.

Por exemplo, mudar de `cool` a `24 °C` para `cool` a `23 °C` é uma mudança detectada de alvo. O cômodo aquecer de `24 °C` a `25 °C` com alvo inalterado não é.

Somente dispositivos selecionados na configuração da integração são monitorados. Estados iniciais e transições de ou para `unknown` e `unavailable` são ignorados.

<a id="how-velair-recognizes-its-own-commands"></a>
## Como reconhece seus próprios comandos

Todos os comandos enviados passam por um adaptador interno de serviços. Antes de cada chamada do Home Assistant, o Velair registra:

- entidade gerenciada;
- campos de controle e valores esperados;
- `Context` do Home Assistant para a chamada;
- expiração breve, apenas durante a execução.

Quando a entidade muda, o Velair correlaciona cada campo alterado com essas expectativas, incluindo `target_temp_step` publicado. Faz isso por campo: se uma atualização contém temperatura controlada pelo Velair e modo HVAC sem relação, só a temperatura é classificada como originada no Velair.

Alguns dispositivos informam vários valores enquanto processam um comando. Podem voltar brevemente a um alvo antigo, publicar um intermediário ou informar modo e temperatura fora de ordem. O Velair mantém um período curto e limitado de estabilização apenas para campos que alterou, evitando que essas atualizações criem incorretamente Ajuste manual. O período não recomeça a cada resposta; é finalizado quando a sequência completa de serviços retorna. Uma alteração claramente originada por usuário do Home Assistant ou por outro script/automação identificável continua externa; alterações posteriores à estabilização são tratadas normalmente.

Quando uma atualização anônima na estabilização não pode ser distinguida da convergência do dispositivo, o Velair mantém conservadoramente o controle Automático. Isso evita transformar um comando rejeitado ou atrasado em falso Ajuste manual. O estado de estabilização só existe durante a execução e é removido ao reiniciar. Se o dispositivo ainda divergir do valor solicitado ao terminar, mantém Automático e registra um aviso de estabilização. A próxima visão atualizada do Diagnóstico mostra o aviso, com valores esperados e observados no relatório. O Velair não repete cegamente o comando nem transforma a divergência em Ajuste manual atrasado.

O registro de expectativas é limitado, expira automaticamente, nunca é persistido e não faz consultas periódicas. Uma origem não precisa preservar `Context` para permitir correlação, embora um contexto preservado torne a associação mais precisa.

Qualquer campo observado que não possa ser correlacionado a um comando do Velair é classificado como externo. Isso atribui origem, não identidade: o Velair não afirma saber se pessoa, controle remoto, automação, serviço do fabricante ou firmware causou a mudança.

<a id="choose-a-policy"></a>
## Escolher uma política

Abra **Configurações**, encontre o dispositivo e use **Ajustes externos**. A política é armazenada pelo backend por dispositivo e incluída nos dados portáteis da zona. Vale a partir da próxima mudança externa; alterá-la não modifica nem termina um Ajuste manual já ativo.

<a id="keep-automatic"></a>
### Manter automático

Valor interno: `keep_automatic`.

É o padrão, inclusive para configurações anteriores aos Ajustes externos. O Velair informa a mudança, mantém a Programação automática e resolve imediatamente a intenção atual com autoridade. Quando há uma intenção responsável pelo controle, reaplica pelo caminho normal de envio serializado. Pode ser programação Padrão ou de Perfil, Reforço, alvo de pré-condicionamento ativo, alvo do Room Assist, `off`, alvo escalar ou faixa nativa.

Pausas existentes e condições do agendador não são ignoradas. Pausa com ação `none`, pausa global, zona desabilitada, agendador parado ou ausência de alvo atual não envia nada. Uma pausa de zona ou Perfil com `turn_off` reafirma `off`.

<a id="manual-until-the-next-schedule-block"></a>
### Manual até o próximo bloco

Valor interno: `until_next_block`.

Preserva o estado externo até começar o próximo bloco efetivo do dispositivo; então volta à Programação automática e aplica a intenção com autoridade válida naquele momento.

O limite é calculado ao começar o Ajuste manual. Outro ajuste externo na mesma sessão atualiza o estado preservado, sem mover esse limite. Sem bloco efetivo futuro, não há expiração automática; use **Retomar automático** quando desejar.

O limite do próximo bloco usa o horário programado do bloco, incluindo `Off`, em vez de um início previsto de pré-condicionamento. Por exemplo, um ajuste às `18:05` com `Off` às `19:00` e aquecimento às `20:00` termina às `19:00`, mesmo que a previsão de aquecimento começasse antes.

<a id="manual-for-a-duration"></a>
### Manual por um período

Valor interno: `for_duration`.

Preserva o estado externo pelo número configurado de minutos. A duração inicial é 120 minutos e a faixa aceita vai de 1 a 10 080 minutos (sete dias). Valores salvos existentes, inclusive 60 minutos, são preservados. Cada nova mudança externa de controle detectada reinicia a duração a partir dela, usando a duração salva da sessão ativa, mesmo se Configurações mudou nesse intervalo. O evento informa a política efetiva da sessão, não o novo padrão das Configurações.

<a id="manual-until-resumed"></a>
### Manual até ser retomado

Valor interno: `until_resumed`.

Preserva o estado externo indefinidamente. O usuário ou automação precisa retomar explicitamente a Programação automática.

<a id="what-happens-when-manual-adjustment-starts"></a>
## Quando o Ajuste manual começa

Para cada mudança externa elegível com uma das três políticas manuais, o Velair faz uma transição serializada:

1. Captura modo HVAC completo e alvo escalar ou faixa nativa do evento.
2. Persiste um motivo reservado de Ajuste manual na zona.
3. Encerra Reforço ativo sem restaurá-lo ou restaurar a programação anterior.
4. Faz o Room Assist ceder, sem restaurar sua correção programada anterior.
5. Preserva ou, se necessário, reaplica o estado externo capturado.
6. Visão geral seleciona **Ajuste manual** e mantém **Agendamento automático** disponível.

A política entra em Ajuste manual somente com Programação automática global em execução, zona habilitada, Perfil ativo sem já pausá-la e nenhuma pausa independente da zona que não seja Reforço. O evento informativo `external_climate_change_detected` ainda é emitido quando essas condições impedem a entrada. Um Reforço ativo é a exceção: a mudança externa o substitui conforme abaixo.

A matriz define o resultado exato ao observar uma mudança fora do Velair com uma política que normalmente entraria em Ajuste manual:

| Estado anterior | Evento | Entra em Ajuste manual | Ação imediata |
| --- | --- | --- | --- |
| Sem pausa ou Reforço | Emitido | Sim | Preservar modo e alvo externos completos. |
| Pausa independente, ação `none` | Emitido | Não | Não enviar nada; a pausa continua cedendo o controle. |
| Pausa independente, ação `turn_off` | Emitido | Não | Reafirmar `off`; ligar externamente não contorna a pausa. |
| Pausa de Perfil ativa, inclusive `turn_off` | Emitido | Não | Não enviar nada neste caminho de detecção; não repetir a ação do Perfil só por essa observação. |

Agendador globalmente pausado ou zona desabilitada segue o mesmo padrão informativo: emite o evento, não cria Ajuste manual e não envia novo alvo por esse caminho de detecção.

Durante Ajuste manual, o Velair continua calculando a programação efetiva Padrão, de Perfil ou Modo, mas não a envia ao dispositivo. Os demais seguem normalmente.

O Velair não faz automaticamente:

- criar Reforço;
- trocar Perfil ou Modo;
- deduzir quem ajustou;
- copiar o ajuste para uma programação;
- mudar a política de outro dispositivo;
- remover pausas independentes;
- aguardar o cômodo atingir a temperatura solicitada.

<a id="what-happens-when-automatic-scheduling-resumes"></a>
## Quando a Programação automática retoma

Ajuste manual pode terminar por expiração da duração, chegada do próximo bloco, botão de Visão geral ou chamada de `velair.resume_automatic_control`.

Remove apenas seu motivo reservado de Ajuste manual. Depois resolve a intenção com autoridade naquele momento:

- programação de Perfil quando um ativo controla a zona;
- Padrão quando nenhum ativo controla ou o Perfil delega a Padrão;
- pausa de Perfil, inclusive `turn_off`;
- outra pausa independente ou estado global do agendador.

Não restaura o bloco ativo quando o Ajuste manual começou. Isso importa se Perfil, Modo, programação, pausa ou horário mudou durante o controle cedido.

Se uma pausa independente continuar, a zona permanece pausada. Se sua ação efetiva for `turn_off`, desligar continua tendo autoridade. Retomar Ajuste manual não equivale a remover todos os motivos de pausa.

<a id="resume-from-off-when-the-block-says-keep-current-mode"></a>
### Retomar de `off` com Manter o modo atual

**Manter o modo atual** significa que o bloco não fornece modo HVAC. Para um bloco com alvo de temperatura, aplica-se a regra normal de envio ao retomar:

- se ligado, manter o modo atual e aplicar o alvo se o modo o aceitar; caso contrário, falhar sem trocar modo;
- se `off`, escolher o primeiro modo compatível anunciado que não seja `off` e aplicar o alvo.

Um dispositivo apenas de aquecimento com `[off, heat]` retoma um bloco de `21 °C` como `heat`, `21 °C`; um apenas de resfriamento com `[off, cool]` retoma como `cool`, `21 °C`. Um reversível pode anunciar vários modos compatíveis; o Velair usa a ordem anunciada, sem deduzir pela estação, região ou alvo numérico. Defina modo explícito quando a escolha precisa ser determinística.

Para um bloco apenas de opções, retomar aplica só os controles selecionados. Não envia temperatura nem liga um dispositivo desligado.

<a id="complete-real-world-examples"></a>
## Exemplos completos de uso real

<a id="keep-automatic-reject-a-climate-card-setpoint-change"></a>
### Manter automático: rejeitar uma mudança de alvo no cartão

Configuração:

```text
Living-room policy: Keep automatic
Current authoritative block: heat at 21 °C
```

| Horário | Ação | Resultado |
| --- | --- | --- |
| 18:00 | Velair aplica `heat`, `21 °C`. | Programação automática |
| 18:20 | Usuário escolhe `23 °C` no cartão do Home Assistant. | Emite `external_climate_change_detected` com `policy: keep_automatic`. |
| 18:20 | Resolve o bloco ainda atual. | Reaplica `heat`, `21 °C`; não cria Ajuste manual nem `zone_control_changed`. |

A mesma regra vale para resfriamento, `off`, faixas nativas `heat_cool`, Reforço, pré-condicionamento e Room Assist: reaplica a intenção com autoridade no momento da detecção.

Os exemplos usam Celsius, mas o comportamento é idêntico em Fahrenheit.

<a id="home-assistant-card-keep-the-change-until-bedtime"></a>
### Cartão do Home Assistant: manter a mudança até dormir

Configuração:

```text
Living room policy: Manual until the next schedule block
18:00 schedule block: cool at 24 °C
22:00 schedule block: cool at 25 °C
```

Linha do tempo:

| Horário | Ação | Resultado no dispositivo | Controle do Velair |
| --- | --- | --- | --- |
| 18:00 | Aplica o bloco. | `cool`, `24 °C` | Programação automática |
| 19:15 | Usuário escolhe `22 °C` no cartão do HA. | `cool`, `22 °C` | Ajuste manual até 22:00 |
| 20:00 | Room Assist recebe nova leitura ambiente. | Ainda `22 °C`; não envia correção. | Ajuste manual |
| 22:00 | Próximo bloco efetivo começa. | Aplica `cool`, `25 °C`. | Programação automática |

`22 °C` é respeitado como instrução temporária. Não é gravado em nenhum dos blocos.

<a id="ir-remote-turn-on-an-ac-that-the-schedule-had-turned-off"></a>
### Controle infravermelho: ligar o ar-condicionado desligado pela programação

Configuração:

```text
Bedroom policy: Manual until resumed
Current authoritative block: Off
```

Linha do tempo:

| Horário | Ação | Resultado no dispositivo | Controle do Velair |
| --- | --- | --- | --- |
| 13:00 | Bloco mantém desligado. | `off` | Programação automática |
| 14:10 | Morador usa controle: `cool`, `23 °C`. | Integração informa `cool`, `23 °C`. | Ajuste manual |
| 16:00 | Plano ainda está em Desligar. | Permanece `cool`, `23 °C`. | Ajuste manual |
| 17:30 | Usuário pressiona **Retomar automático**. | Resolve o bloco Desligar ainda atual e desliga. | Programação automática |

Isso só funciona quando a integração informa a alteração do controle ao Home Assistant. Um comando infravermelho invisível ao HA não pode ser detectado.

<a id="a-60-minute-comfort-adjustment-changed-again"></a>
### Ajuste de conforto de 60 minutos, alterado novamente

Configuração: `for_duration`, 60 minutos.

| Horário | Ação | Resultado |
| --- | --- | --- |
| 09:00 | Programação aplica `heat`, `20 °C`. | Programação automática |
| 09:20 | Usuário escolhe `22 °C`. | Ajuste manual expira às 10:20. |
| 09:50 | Usuário escolhe `21 °C`. | Mantém `21 °C`; expiração recomeça para 10:50. |
| 10:50 | Nenhuma outra mudança externa. | Aplica a intenção com autoridade válida às 10:50. |

<a id="repeated-change-with-next-block-policy"></a>
### Mudança repetida com política do próximo bloco

Configuração: `until_next_block`; próximo bloco às 22:00.

| Horário | Ação | Resultado |
| --- | --- | --- |
| 19:15 | Usuário muda `24 °C` para `22 °C`. | Ajuste termina às 22:00. |
| 20:30 | Muda `22 °C` para `23 °C`. | Valor preservado passa a `23 °C`; expiração continua às 22:00. |
| 22:00 | Próximo bloco começa. | Volta a Automático e aplica o bloco. |

<a id="activate-a-profile-while-one-climate-is-manual"></a>
### Ativar um Perfil enquanto um dispositivo está manual

Configuração:

```text
Default living-room intent: cool at 24 °C
Sleep Profile living-room intent: cool at 25 °C
Manual policy: until resumed
```

| Horário | Ação | Sala | Outras zonas do Perfil |
| --- | --- | --- | --- |
| 20:00 | Usuário muda sala para `22 °C`. | Ajuste manual a `22 °C` | Seguem normalmente |
| 21:00 | Ativa `Sleep`. | Mantém `22 °C`; `Sleep` vira a configuração com autoridade. | Aplica `Sleep` imediatamente onde não há outra substituição. |
| 21:30 | Retoma a sala. | Aplica `Sleep`: `cool`, `25 °C`. | Inalteradas |

Selecionar um Modo personalizado tem o mesmo comportamento: muda o conjunto de Perfis, mas não cancela Ajuste manual da zona. Se Perfis forem selecionados diretamente, o Modo pode mostrar **Manual** enquanto a zona mostra **Ajuste manual**; os rótulos descrevem coisas diferentes.

<a id="activate-several-profiles-or-modes-while-manual"></a>
### Ativar vários Perfis ou Modos durante controle manual

Suponha um estado externo `heat`, `22 °C`. Durante controle manual, o usuário seleciona Em casa (`21 °C`), Ausente (`17 °C`) e depois Dormir (`18 °C`). O Velair preserva `22 °C` o tempo todo. Ao retomar, aplica só a intenção atual de Dormir, `18 °C`; não repete Em casa ou Ausente nem restaura o alvo Padrão antigo.

<a id="profile-pause-and-turn_off"></a>
### Pausa de Perfil e `turn_off`

Se um Perfil que pausa a zona for ativado com Ajuste manual já ativo, o estado externo permanece até o ajuste terminar. Ao retomar:

- Pausa de Perfil sem desligar não envia novo alvo; volta a Automático, mas continua sob a pausa do Perfil;
- Pausa de Perfil com `turn_off` desliga.

Se a pausa do Perfil já estava ativa antes da mudança externa, ainda emite `external_climate_change_detected`, mas não entra em Ajuste manual. Esse caminho não repete imediatamente a pausa nem sua chamada `turn_off`; apenas informa a observação. Uma mudança posterior de Perfil, aplicação explícita da programação ou outra transição do agendador resolve novamente o comportamento.

<a id="external-adjustment-during-a-boost"></a>
### Ajuste externo durante um Reforço

| Horário | Ação | Resultado |
| --- | --- | --- |
| 12:00 | Inicia Reforço `cool`, `20 °C` até 13:00. | Reforço |
| 12:20 | Usuário muda para `cool`, `23 °C`. | Encerra Reforço sem restauração; Ajuste manual preserva `23 °C`. |
| 12:45 | Usuário retoma a Programação automática. | Resolve e aplica a programação válida às 12:45. |

O Reforço antigo não retoma, e sua expiração original de 13:00 deixa de controlar o dispositivo.

<a id="room-assist-without-a-control-fight"></a>
### Room Assist sem disputa pelo controle

Suponha alvo programado de resfriamento de `24 °C`, alvo temporário do Room Assist de `26 °C` e seleção externa de `23 °C`.

O Velair captura o estado do evento antes que trabalho enfileirado do Room Assist o substitua, interrompe a assistência sem restaurar `24 °C` e preserva `23 °C`. Ao retomar, resolve a programação atual, e o Room Assist pode calcular outro alvo pelas leituras atuais.

<a id="native-heat_cool-range"></a>
### Faixa nativa `heat_cool`

```text
Scheduled range: 20–25 °C
External range: 19–24 °C
Policy: until resumed
```

Detecta `target_temp_low` e `target_temp_high`, captura todo o estado `heat_cool` e preserva `19–24 °C` durante o ajuste. Ao retomar, aplica toda a faixa do bloco atual com autoridade. Nunca a reduz a um alvo escalar.

<a id="independent-window-pause-while-manual"></a>
### Pausa independente de janela durante controle manual

Suponha controle manual a `23 °C` e uma automação de janela chamando `velair.pause_zone` com `pause_id: window` e `action: turn_off`. A ação combinada é desligar, então o dispositivo desliga. `velair.resume_automatic_control` remove apenas Ajuste manual; o motivo `window` permanece, mantendo desligado. A automação precisa remover seu próprio motivo com `velair.resume_zone`.

<a id="changing-the-policy-with-a-service"></a>
## Alterar a política por serviço

Os exemplos abaixo usam a sintaxe atual de ações do Home Assistant.

Manter automático e reaplicar a autoridade atual do Velair:

```yaml
action: velair.set_external_change_policy
data:
  entity_id: climate.living_room
  policy: keep_automatic
```

Preservar o estado externo até o próximo bloco:

```yaml
action: velair.set_external_change_policy
data:
  entity_id: climate.living_room
  policy: until_next_block
```

Preservar por 90 minutos:

```yaml
action: velair.set_external_change_policy
data:
  entity_id: climate.living_room
  policy: for_duration
  duration_minutes: 90
```

Preservar até que o controle automático seja retomado explicitamente:

```yaml
action: velair.set_external_change_policy
data:
  entity_id: climate.living_room
  policy: until_resumed
```

`duration_minutes` é usado por `for_duration`; ao selecionar outra política, o valor continua salvo como a duração configurada para a zona. Os serviços rejeitam entidades de climatização não gerenciadas, valores de política desconhecidos e durações fora do intervalo de 1 a 10 080 minutos.

Alterar essa configuração enquanto a climatização já está em controle manual afeta apenas o próximo ajuste externo, depois que a sessão atual terminar. A sessão ativa mantém sua política, duração, origem e horário de término. Use a Visão geral ou `velair.resume_automatic_control` para encerrá-la.

<a id="enter-manual-adjustment-explicitly"></a>
## Ativar o ajuste manual explicitamente

A Visão geral sempre mostra o **Controle Velair** como **Agendamento automático** ou **Ajuste manual** para cada entidade de climatização gerenciada. As duas opções permanecem visíveis em um seletor segmentado. Selecione **Ajuste manual** para capturar o modo HVAC atual e o alvo completo, seja uma temperatura única ou uma faixa. Normalmente, essa ação usa a política manual e a duração salvas em **Configurações > Ajustes externos**. Quando a política salva é **Manter automático**, essa ação explícita usa **Até ser retomado**, sem alterar a política salva para mudanças externas. Selecione **Agendamento automático** para retomar o comando que tem prioridade no Velair naquele momento. Selecionar a opção que já está ativa não produz nenhuma alteração.

Quando o Ajuste manual está ativo, a Visão geral mostra sua política de encerramento e o horário de término exatos abaixo do seletor. Ela exibe o alvo físico preservado, seja uma temperatura única ou uma faixa nativa, em vez do alvo da programação que está temporariamente sem efeito. Quando o controle manual não pode ser iniciado, sua opção permanece visível com uma explicação acessível: a climatização pode estar indisponível ou desabilitada, a Programação automática pode estar parada, um Perfil ativo pode pausar a zona ou outra pausa da zona pode deter o controle. A opção também fica desabilitada enquanto uma migração dos dados de temperatura não tiver sido concluída, pois o Velair mantém a configuração e as sessões de controle manual inalteradas até o fim da migração. Um Reforço não impede essa ação, porque o ajuste manual o substitui.

A ação equivalente também usa a política salva e aceita apenas `entity_id`:

```yaml
action: velair.enter_manual_adjustment
data:
  entity_id: climate.living_room
```

Para preservar o estado por 90 minutos, primeiro salve `for_duration` e `duration_minutes: 90` com `velair.set_external_change_policy` e depois execute essa ação. A ação explícita rejeita entidades de climatização não gerenciadas, desabilitadas, `unknown` ou `unavailable`, além daquelas bloqueadas por uma parada global, pela Pausa de um Perfil ativo ou por uma pausa independente da zona. Um Reforço ativo é substituído. Aquecimento, resfriamento, `off`, temperaturas únicas e faixas nativas `heat_cool` são capturados pelo mesmo fluxo de entrega, que processa as operações em sequência.

<a id="resume-with-a-service"></a>
## Retomar o controle por um serviço

```yaml
action: velair.resume_automatic_control
data:
  entity_id: climate.living_room
```

Essa ação é idempotente: executá-la para uma entidade gerenciada que já está em controle automático não faz nada. Ela rejeita entidades de climatização não gerenciadas.

Não use o ID de pausa interno reservado `velair.manual_adjustment` com `velair.pause_zone` ou `velair.resume_zone`. O Velair o rejeita para que um único mecanismo controle o Ajuste manual. Uma chamada genérica a `velair.resume_zone` não encerra o Ajuste manual.

<a id="automations-and-events"></a>
## Automações e eventos

Todos os eventos de execução do Velair usam `event_type: velair_event`.

<a id="observe-every-external-control-change"></a>
### Observar cada mudança externa de controle

Esse evento é emitido sempre que pelo menos um campo observado de modo ou alvo não pode ser atribuído ao Velair:

```yaml
event_type: velair_event
event_data:
  domain: velair
  event: external_climate_change_detected
  entity_id: climate.living_room
  changed_fields:
    - hvac_mode
    - temperature
  previous:
    hvac_mode: "off"
    temperature: 24
  current:
    hvac_mode: "cool"
    temperature: 23
  policy: keep_automatic
```

Em uma faixa nativa, `changed_fields`, `previous` e `current` usam `target_temp_low` e `target_temp_high` em vez de `temperature`, conforme o caso. Apenas os campos externos aparecem; um campo associado a uma ação do Velair é omitido mesmo que tenha chegado na mesma atualização de estado do Home Assistant.

Exemplo de automação de notificação:

```yaml
alias: Notify when the living-room climate changes outside Velair
triggers:
  - trigger: event
    event_type: velair_event
    event_data:
      event: external_climate_change_detected
      entity_id: climate.living_room
actions:
  - action: notify.notify
    data:
      message: >-
        Living-room climate changed outside Velair:
        {{ trigger.event.data.changed_fields | join(', ') }}.
```

<a id="observe-entry-into-or-exit-from-manual-adjustment"></a>
### Observar a entrada ou a saída do Ajuste manual

Dados enviados ao iniciar:

```yaml
event_type: velair_event
event_data:
  domain: velair
  event: zone_control_changed
  entity_id: climate.living_room
  control_mode: manual
  previous_control_mode: automatic
  policy: for_duration
  started_at: "2026-08-20T18:00:00+02:00"
  until: "2026-08-20T19:00:00+02:00"
```

Para `until_resumed`, `until` não aparece. Dados enviados ao encerrar:

```yaml
event_type: velair_event
event_data:
  domain: velair
  event: zone_control_changed
  entity_id: climate.living_room
  control_mode: automatic
  previous_control_mode: manual
  reason: resumed
```

Um encerramento automático por tempo usa `reason: expired`. O evento significa que o motivo de Ajuste manual mudou; outra pausa ainda pode impedir que a programação seja aplicada ao equipamento.

Para o contrato completo dos eventos, consulte [Eventos para automações](automation-events.pt-br.md).

<a id="restart-and-availability-behavior"></a>
## Comportamento após reinicialização e mudanças de disponibilidade

A política de cada zona e o motivo de Ajuste manual ativo são persistidos. Após reiniciar o Home Assistant:

- um Ajuste manual que ainda não terminou, ou que não tem prazo, permanece manual;
- habilitar **Aplicar programação ativo após inicialização** não ignora o Ajuste manual ativo;
- quando o horário de término persistido é atingido, o Velair remove o ajuste e determina o comando que tem prioridade naquele momento;
- a exportação portátil inclui a política, mas exclui deliberadamente o estado de execução de uma sessão de Ajuste manual.

O registro capturado do modo e do alvo externos existe apenas durante a execução: ele não é persistido nem reaplicado após uma reinicialização. Normalmente, o equipamento mantém e informa seu próprio estado manual, enquanto o motivo de Ajuste manual persistido pelo Velair continua impedindo a aplicação da programação. Se o equipamento for redefinido ou informar outro alvo durante a reinicialização, o Velair não reconstrói o registro externo anterior. Ele espera o Ajuste manual terminar ou o controle automático ser retomado e então determina o comando que tem prioridade naquele momento.

O Velair ignora transições de estado para ou de `unknown` e `unavailable`. Se uma mudança remota ocorrer enquanto a integração não consegue informar o estado da climatização e a única atualização posterior for uma transição de `unavailable` para disponível, o Velair não classifica essa recuperação como um novo ajuste externo. Depois que a climatização estiver disponível, mudanças posteriores de modo ou alvo poderão ser detectadas normalmente.

<a id="attribution-limits"></a>
## Limites da identificação de origem

A identificação da origem procura usar as informações disponíveis, pois as integrações de climatização do Home Assistant e os equipamentos informam seus estados de maneiras diferentes.

- Uma ação no equipamento ou no sistema do fabricante que nunca chega ao Home Assistant não pode ser detectada.
- Alguns equipamentos publicam o modo e o alvo em várias atualizações de estado; isso pode emitir mais de um evento de observação. As automações devem ser idempotentes.
- Uma ação externa que informa exatamente o valor de um campo ainda esperado pelo Velair pode ser identificada como uma ação do próprio Velair.
- Um equipamento que nunca informa de volta um alvo aceito do Velair pode manter essa expectativa até seu curto prazo de validade terminar.
- A recuperação da disponibilidade, por si só, é ignorada, como explicado acima.
- Mudanças apenas de ventilador, preset, oscilação, umidade ou condições ambientais não fazem parte do escopo inicial deste recurso.

Portanto, a interpretação segura de `external_climate_change_detected` é: “O Velair observou uma mudança de controle que não conseguiu atribuir a um de seus próprios comandos”, e não “O Velair comprovou que determinada pessoa alterou o termostato”.

<a id="troubleshooting-checklist"></a>
## Lista de verificação para solução de problemas

Se um Ajuste manual esperado não aparecer:

1. Confirme que a entidade de climatização é gerenciada pelo Velair.
2. Confirme que a Programação automática está ativa globalmente e que a zona está habilitada.
3. Confirme que o Perfil ativo já não pausa a zona.
4. Confirme que a origem externa altera `hvac_mode`, `temperature` ou uma faixa nativa no Home Assistant, e não apenas uma indicação no aplicativo do fabricante ou uma opção de ventilador/preset.
5. Confirme que a entidade não estava em `unknown` ou `unavailable` durante a transição.
6. Escute `velair_event` e filtre por `event: external_climate_change_detected`.
7. Consulte o Diagnóstico do Velair e os logs do Home Assistant para identificar falhas ao preservar o estado ou executar um serviço de climatização.

Se a zona retomar o controle automático, mas não aplicar a temperatura esperada, verifique o Perfil/Modo atual, a programação Padrão, os motivos de pausa independentes, o estado global do agendador e se o bloco atual está em Desligar ou Manter. A retomada sempre usa o comando que tem prioridade naquele momento, nunca um registro histórico da programação anterior.
