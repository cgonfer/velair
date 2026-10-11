<a id="external-changes-and-manual-adjustment"></a>
# Alterações externas e Ajuste manual
<!-- velair-docs:start -->
Traduções: [Original em inglês](manual-control.md) · [Español](manual-control.es.md) · [Français](manual-control.fr.md) · [Deutsch](manual-control.de.md) · [Italiano](manual-control.it.md) · [Nederlands](manual-control.nl.md) · [Polski](manual-control.pl.md) · [Português (Brasil)](manual-control.pt-br.md) · [Português (Portugal)](manual-control.pt-pt.md) · [Русский](manual-control.ru.md) · [Estado das traduções](../translation-status.md)

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

O Velair reconhece quando o modo HVAC ou temperatura-alvo de uma entidade `climate.*` gerida muda sem corresponder a um comando enviado pelo Velair. Para cada dispositivo, escolhe se mantém a autoridade automática ou cede ao ajuste externo pelo Ajuste manual.

Um ajuste externo pode vir de:

- cartão normal de climatização do Home Assistant;
- termóstato físico ou controlo infravermelho cuja integração informa o novo estado;
- aplicação do fabricante cuja integração atualiza o Home Assistant;
- script ou automação que chama diretamente a entidade de climatização;
- qualquer outra origem que altera a entidade sem passar pelo Velair.

O Velair chama esse estado de controlo cedido de **Ajuste manual**. «Manual» descreve quem controla um dispositivo naquele momento; não afirma que uma pessoa fez a alteração.

<a id="the-two-independent-questions"></a>
## Duas questões independentes

O Velair sempre mantém estes conceitos separados:

| Conceito | Alcance | Significado |
| --- | --- | --- |
| Programação automática | Um dispositivo gerido | O Velair pode enviar a programação efetiva. |
| Ajuste manual | Um dispositivo gerido | Alvo ou modo externo tem autoridade temporária. |
| Modo **Manual** do Velair | Conjunto completo de Perfis ativos | Perfis foram selecionados diretamente, sem um Modo personalizado guardado. |
| Reforço | Um dispositivo | O Velair aplica intencionalmente um alvo temporário. |
| Pausa da zona | Um dispositivo | Motivos independentes impedem a execução da programação, podendo desligar. |
| Pausa global ou Paragem | Todos | Agendador pausado ou desativado globalmente. |

Esses estados podem coexistir. Por exemplo, o Modo **Manual** pode selecionar o Perfil `Sleep` enquanto `climate.living_room` está em **Ajuste manual**. O Perfil mantém a autoridade sobre a configuração da programação, mas aquele dispositivo conserva o ajuste externo até terminar o Ajuste manual.

<a id="what-velair-observes"></a>
## O que o Velair observa

O Velair observa estes campos de controlo nos dispositivos geridos:

- `hvac_mode`, representado pelo estado da entidade, incluindo `off`, `heat`, `cool` e `heat_cool`;
- `temperature` para alvo escalar;
- `target_temp_low` e `target_temp_high` para intervalo nativo.

Não entra em Ajuste manual se apenas estes valores mudarem:

- `current_temperature` ou `hvac_action`;
- leituras de humidade;
- disponibilidade;
- opções de ventoinha, predefinição, oscilação ou humidade-alvo;
- capacidades, como mínimo de temperatura ou modos aceites.

Por exemplo, mudar de `cool` a `24 °C` para `cool` a `23 °C` é uma mudança detetada de alvo. A divisão aquecer de `24 °C` a `25 °C` com alvo inalterado não é.

Apenas dispositivos selecionados na configuração da integração são monitorizados. Estados iniciais e transições de ou para `unknown` e `unavailable` são ignorados.

<a id="how-velair-recognizes-its-own-commands"></a>
## Como reconhece os seus próprios comandos

Todos os comandos enviados passam por um adaptador interno de serviços. Antes de cada chamada do Home Assistant, o Velair regista:

- entidade gerida;
- campos de controlo e valores esperados;
- `Context` do Home Assistant para a chamada;
- expiração breve, apenas durante a execução.

Quando a entidade muda, o Velair correlaciona cada campo alterado com essas expectativas, incluindo `target_temp_step` publicado. Faz isso por campo: se uma atualização contém temperatura controlada pelo Velair e modo HVAC sem relação, só a temperatura é classificada como originada no Velair.

Alguns dispositivos informam vários valores enquanto processam um comando. Podem voltar brevemente a um alvo antigo, publicar um intermédio ou informar modo e temperatura fora de ordem. O Velair mantém um período curto e limitado de estabilização apenas para campos que alterou, evitando que essas atualizações criem incorretamente Ajuste manual. O período não recomeça a cada resposta; é finalizado quando a sequência completa de serviços retorna. Uma alteração claramente originada por utilizador do Home Assistant ou por outro script/automação identificável continua externa; alterações posteriores à estabilização são tratadas normalmente.

Quando uma atualização anónima na estabilização não pode ser distinguida da convergência do dispositivo, o Velair mantém conservadoramente o controlo Automático. Isso evita transformar um comando rejeitado ou atrasado em falso Ajuste manual. O estado de estabilização só existe durante a execução e é removido ao reiniciar. Se o dispositivo ainda divergir do valor solicitado ao terminar, mantém Automático e regista um aviso de estabilização. A próxima visão atualizada do Diagnóstico mostra o aviso, com valores esperados e observados no relatório. O Velair não repete cegamente o comando nem transforma a divergência em Ajuste manual atrasado.

O registo de expectativas é limitado, expira automaticamente, nunca é persistido e não faz consultas periódicas. Uma origem não precisa de preservar `Context` para permitir correlação, embora um contexto preservado torne a associação mais precisa.

Qualquer campo observado que não possa ser correlacionado a um comando do Velair é classificado como externo. Isso atribui origem, não identidade: o Velair não afirma saber se pessoa, controlo remoto, automação, serviço do fabricante ou firmware causou a mudança.

<a id="choose-a-policy"></a>
## Escolher uma política

Abra **Definições**, encontre o dispositivo e use **Ajustes externos**. A política é armazenada pelo backend por dispositivo e incluída nos dados portáteis da zona. Vale a partir da próxima mudança externa; alterá-la não modifica nem termina um Ajuste manual já ativo.

<a id="keep-automatic"></a>
### Manter automático

Valor interno: `keep_automatic`.

É a opção predefinida, inclusive para definições anteriores aos Ajustes externos. O Velair informa a mudança, mantém a Programação automática e resolve imediatamente a intenção atual com autoridade. Quando há uma intenção responsável pelo controlo, reaplica pelo caminho normal de envio serializado. Pode ser programação Predefinição ou de Perfil, Reforço, alvo de pré-condicionamento ativo, alvo do Room Assist, `off`, alvo escalar ou intervalo nativo.

Pausas existentes e condições do agendador não são ignoradas. Pausa com ação `none`, pausa global, zona desativada, agendador parado ou ausência de alvo atual não envia nada. Uma pausa de zona ou Perfil com `turn_off` reafirma `off`.

<a id="manual-until-the-next-schedule-block"></a>
### Manual até ao próximo bloco

Valor interno: `until_next_block`.

Preserva o estado externo até começar o próximo bloco efetivo do dispositivo; então volta à Programação automática e aplica a intenção com autoridade válida naquele momento.

O limite é calculado ao começar o Ajuste manual. Outro ajuste externo na mesma sessão atualiza o estado preservado, sem mover esse limite. Sem bloco efetivo futuro, não há expiração automática; use **Retomar automático** quando desejar.

O limite do próximo bloco utiliza a hora programada do bloco, incluindo `Off`, em vez de um início previsto de pré-condicionamento. Por exemplo, um ajuste às `18:05` com `Off` às `19:00` e aquecimento às `20:00` termina às `19:00`, mesmo que a previsão de aquecimento começasse mais cedo.

<a id="manual-for-a-duration"></a>
### Manual por um período

Valor interno: `for_duration`.

Preserva o estado externo pelo número configurado de minutos. A duração inicial é 120 minutos e o intervalo permitido vai de 1 a 10 080 minutos (sete dias). Valores guardados existentes, inclusive 60 minutos, são preservados. Cada nova mudança externa de controlo detetada reinicia a duração a partir dela, a utilizar a duração guardada da sessão ativa, mesmo se Definições mudou nesse intervalo. O evento informa a política efetiva da sessão, não o novo valor predefinido das Definições.

<a id="manual-until-resumed"></a>
### Manual até ser retomado

Valor interno: `until_resumed`.

Preserva o estado externo indefinidamente. O utilizador ou automação precisa de retomar explicitamente a Programação automática.

<a id="what-happens-when-manual-adjustment-starts"></a>
## Quando o Ajuste manual começa

Para cada mudança externa elegível com uma das três políticas manuais, o Velair faz uma transição serializada:

1. Captura modo HVAC completo e alvo escalar ou intervalo nativo do evento.
2. Persiste um motivo reservado de Ajuste manual na zona.
3. Encerra Reforço ativo sem restaurá-lo ou restaurar a programação anterior.
4. Faz o Room Assist ceder, sem restaurar a sua correção programada anterior.
5. Preserva ou, se necessário, reaplica o estado externo capturado.
6. Visão geral seleciona **Ajuste manual** e mantém **Programação automática** disponível.

A política entra em Ajuste manual apenas com Programação automática global em execução, zona ativada, Perfil ativo sem já pausá-la e nenhuma pausa independente da zona que não seja Reforço. O evento informativo `external_climate_change_detected` ainda é emitido quando essas condições impedem a entrada. Um Reforço ativo é a exceção: a mudança externa o substitui conforme abaixo.

A matriz define o resultado exato ao observar uma mudança fora do Velair com uma política que normalmente entraria em Ajuste manual:

| Estado anterior | Evento | Entra em Ajuste manual | Ação imediata |
| --- | --- | --- | --- |
| Sem pausa ou Reforço | Emitido | Sim | Preservar modo e alvo externos completos. |
| Pausa independente, ação `none` | Emitido | Não | Não enviar nada; a pausa continua a ceder o controlo. |
| Pausa independente, ação `turn_off` | Emitido | Não | Reafirmar `off`; ligar externamente não contorna a pausa. |
| Pausa de Perfil ativa, inclusive `turn_off` | Emitido | Não | Não enviar nada neste caminho de deteção; não repetir a ação do Perfil só por essa observação. |

Agendador globalmente pausado ou zona desativada segue o mesmo comportamento informativo: emite o evento, não cria Ajuste manual e não envia novo alvo por esse caminho de deteção.

Durante Ajuste manual, o Velair continua a calcular a programação efetiva Predefinição, de Perfil ou Modo, mas não a envia ao dispositivo. Os demais seguem normalmente.

O Velair não faz automaticamente:

- criar Reforço;
- trocar Perfil ou Modo;
- deduzir quem ajustou;
- copiar o ajuste para uma programação;
- mudar a política de outro dispositivo;
- remover pausas independentes;
- aguardar a divisão atingir a temperatura solicitada.

<a id="what-happens-when-automatic-scheduling-resumes"></a>
## Quando a Programação automática retoma

Ajuste manual pode terminar por expiração da duração, chegada do próximo bloco, botão de Visão geral ou chamada de `velair.resume_automatic_control`.

Remove apenas o seu motivo reservado de Ajuste manual. Depois resolve a intenção com autoridade naquele momento:

- programação de Perfil quando um ativo controla a zona;
- Predefinição quando nenhum ativo controla ou o Perfil delega a Predefinição;
- pausa de Perfil, inclusive `turn_off`;
- outra pausa independente ou estado global do agendador.

Não restaura o bloco ativo quando o Ajuste manual começou. Isso importa se Perfil, Modo, programação, pausa ou horário mudou durante o controlo cedido.

Se uma pausa independente continuar, a zona permanece pausada. Se a sua ação efetiva for `turn_off`, desligar continua a ter autoridade. Retomar Ajuste manual não equivale a remover todos os motivos de pausa.

<a id="resume-from-off-when-the-block-says-keep-current-mode"></a>
### Retomar de `off` com Manter o modo atual

**Manter o modo atual** significa que o bloco não fornece modo HVAC. Para um bloco com alvo de temperatura, aplica-se a regra normal de envio ao retomar:

- se ligado, manter o modo atual e aplicar o alvo se o modo o aceitar; caso contrário, falhar sem trocar modo;
- se `off`, escolher o primeiro modo compatível anunciado que não seja `off` e aplicar o alvo.

Um dispositivo apenas de aquecimento com `[off, heat]` retoma um bloco de `21 °C` como `heat`, `21 °C`; um apenas de arrefecimento com `[off, cool]` retoma como `cool`, `21 °C`. Um reversível pode anunciar vários modos compatíveis; o Velair usa a ordem anunciada, sem deduzir pela estação, região ou alvo numérico. Defina modo explícito quando a escolha precisa de ser determinística.

Para um bloco apenas de opções, retomar aplica só os controlos selecionados. Não envia temperatura nem liga um dispositivo desligado.

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
| 18:20 | Utilizador escolhe `23 °C` no cartão do Home Assistant. | Emite `external_climate_change_detected` com `policy: keep_automatic`. |
| 18:20 | Resolve o bloco ainda atual. | Reaplica `heat`, `21 °C`; não cria Ajuste manual nem `zone_control_changed`. |

A mesma regra vale para arrefecimento, `off`, intervalos nativos `heat_cool`, Reforço, pré-condicionamento e Room Assist: reaplica a intenção com autoridade no momento da deteção.

Os exemplos usam Celsius, mas o comportamento é idêntico em Fahrenheit.

<a id="home-assistant-card-keep-the-change-until-bedtime"></a>
### Cartão do Home Assistant: manter a mudança até dormir

Configuração:

```text
Living room policy: Manual until the next schedule block
18:00 schedule block: cool at 24 °C
22:00 schedule block: cool at 25 °C
```

Linha temporal:

| Horário | Ação | Resultado no dispositivo | Controlo do Velair |
| --- | --- | --- | --- |
| 18:00 | Aplica o bloco. | `cool`, `24 °C` | Programação automática |
| 19:15 | Utilizador escolhe `22 °C` no cartão do HA. | `cool`, `22 °C` | Ajuste manual até 22:00 |
| 20:00 | Room Assist recebe nova leitura ambiente. | Ainda `22 °C`; não envia correção. | Ajuste manual |
| 22:00 | Próximo bloco efetivo começa. | Aplica `cool`, `25 °C`. | Programação automática |

`22 °C` é respeitado como instrução temporária. Não é gravado em nenhum dos blocos.

<a id="ir-remote-turn-on-an-ac-that-the-schedule-had-turned-off"></a>
### Controlo infravermelho: ligar o aparelho de ar condicionado desligado pela programação

Configuração:

```text
Bedroom policy: Manual until resumed
Current authoritative block: Off
```

Linha temporal:

| Horário | Ação | Resultado no dispositivo | Controlo do Velair |
| --- | --- | --- | --- |
| 13:00 | Bloco mantém desligado. | `off` | Programação automática |
| 14:10 | Morador usa controlo: `cool`, `23 °C`. | Integração informa `cool`, `23 °C`. | Ajuste manual |
| 16:00 | Plano ainda está em Desligar. | Permanece `cool`, `23 °C`. | Ajuste manual |
| 17:30 | Utilizador pressiona **Retomar automático**. | Resolve o bloco Desligar ainda atual e desliga. | Programação automática |

Isso só funciona quando a integração informa a alteração do controlo ao Home Assistant. Um comando infravermelho invisível ao HA não pode ser detetado.

<a id="a-60-minute-comfort-adjustment-changed-again"></a>
### Ajuste de conforto de 60 minutos, alterado novamente

Configuração: `for_duration`, 60 minutos.

| Horário | Ação | Resultado |
| --- | --- | --- |
| 09:00 | Programação aplica `heat`, `20 °C`. | Programação automática |
| 09:20 | Utilizador escolhe `22 °C`. | Ajuste manual expira às 10:20. |
| 09:50 | Utilizador escolhe `21 °C`. | Mantém `21 °C`; expiração recomeça para 10:50. |
| 10:50 | Nenhuma outra mudança externa. | Aplica a intenção com autoridade válida às 10:50. |

<a id="repeated-change-with-next-block-policy"></a>
### Mudança repetida com política do próximo bloco

Configuração: `until_next_block`; próximo bloco às 22:00.

| Horário | Ação | Resultado |
| --- | --- | --- |
| 19:15 | Utilizador muda `24 °C` para `22 °C`. | Ajuste termina às 22:00. |
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
| 20:00 | Utilizador muda sala para `22 °C`. | Ajuste manual a `22 °C` | Seguem normalmente |
| 21:00 | Ativa `Sleep`. | Mantém `22 °C`; `Sleep` passa a ser a configuração com autoridade. | Aplica `Sleep` imediatamente onde não há outra substituição. |
| 21:30 | Retoma a sala. | Aplica `Sleep`: `cool`, `25 °C`. | Inalteradas |

Selecionar um Modo personalizado tem o mesmo comportamento: muda o conjunto de Perfis, mas não cancela Ajuste manual da zona. Se Perfis forem selecionados diretamente, o Modo pode mostrar **Manual** enquanto a zona mostra **Ajuste manual**; os rótulos descrevem coisas diferentes.

<a id="activate-several-profiles-or-modes-while-manual"></a>
### Ativar vários Perfis ou Modos durante controlo manual

Suponha um estado externo `heat`, `22 °C`. Durante controlo manual, o utilizador seleciona Em casa (`21 °C`), Ausente (`17 °C`) e depois Dormir (`18 °C`). O Velair preserva `22 °C` o tempo todo. Ao retomar, aplica só a intenção atual de Dormir, `18 °C`; não repete Em casa ou Ausente nem restaura o alvo Predefinição antigo.

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
| 12:20 | Utilizador muda para `cool`, `23 °C`. | Encerra Reforço sem restauração; Ajuste manual preserva `23 °C`. |
| 12:45 | Utilizador retoma a Programação automática. | Resolve e aplica a programação válida às 12:45. |

O Reforço antigo não retoma, e sua expiração original de 13:00 deixa de controlar o dispositivo.

<a id="room-assist-without-a-control-fight"></a>
### Room Assist sem disputa pelo controlo

Suponha alvo programado de arrefecimento de `24 °C`, alvo temporário do Room Assist de `26 °C` e seleção externa de `23 °C`.

O Velair captura o estado do evento antes que trabalho enfileirado do Room Assist o substitua, interrompe a assistência sem restaurar `24 °C` e preserva `23 °C`. Ao retomar, resolve a programação atual, e o Room Assist pode calcular outro alvo pelas leituras atuais.

<a id="native-heat_cool-range"></a>
### Intervalo nativo `heat_cool`

```text
Scheduled range: 20–25 °C
External range: 19–24 °C
Policy: until resumed
```

Deteta `target_temp_low` e `target_temp_high`, captura todo o estado `heat_cool` e preserva `19–24 °C` durante o ajuste. Ao retomar, aplica todo o intervalo do bloco atual com autoridade. Nunca o reduz a um alvo escalar.

<a id="independent-window-pause-while-manual"></a>
### Pausa independente de janela durante controlo manual

Suponha controlo manual a `23 °C` e uma automação de janela que chama `velair.pause_zone` com `pause_id: window` e `action: turn_off`. A ação combinada é desligar, então o dispositivo desliga. `velair.resume_automatic_control` remove apenas Ajuste manual; o motivo `window` permanece, mantendo desligado. A automação precisa de remover o seu próprio motivo com `velair.resume_zone`.

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

Preservar o estado externo até ao próximo bloco:

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

Preservar até que o controlo automático seja retomado explicitamente:

```yaml
action: velair.set_external_change_policy
data:
  entity_id: climate.living_room
  policy: until_resumed
```

`duration_minutes` é usado por `for_duration`; ao selecionar outra política, o valor continua guardado como a duração configurada para a zona. Os serviços rejeitam entidades de climatização não geridas, valores de política desconhecidos e durações fora do intervalo de 1 a 10 080 minutos.

Alterar essa configuração enquanto a climatização já está em controlo manual afeta apenas o próximo ajuste externo, depois que a sessão atual terminar. A sessão ativa mantém sua política, duração, origem e hora de fim. Use a Visão geral ou `velair.resume_automatic_control` para encerrá-la.

<a id="enter-manual-adjustment-explicitly"></a>
## Ativar o ajuste manual explicitamente

A Visão geral sempre mostra o **Controlo Velair** como **Programação automática** ou **Ajuste manual** para cada entidade de climatização gerida. As duas opções permanecem visíveis em um seletor segmentado. Selecione **Ajuste manual** para capturar o modo HVAC atual e o alvo completo, seja uma temperatura única ou um intervalo. Normalmente, essa ação usa a política manual e a duração guardadas em **Definições > Ajustes externos**. Quando a política guardada é **Manter automático**, essa ação explícita usa **Até ser retomado**, sem alterar a política guardada para mudanças externas. Selecione **Programação automática** para retomar o comando que tem prioridade no Velair naquele momento. Selecionar a opção que já está ativa não produz nenhuma alteração.

Quando o Ajuste manual está ativo, a Visão geral mostra sua política de encerramento e a hora de fim exatas abaixo do seletor. Ela exibe o alvo físico preservado, seja uma temperatura única ou um intervalo nativo, em vez do alvo da programação que está temporariamente sem efeito. Quando o controlo manual não pode ser iniciado, sua opção permanece visível com uma explicação acessível: a climatização pode estar indisponível ou desativada, a Programação automática pode estar parada, um Perfil ativo pode pausar a zona ou outra pausa da zona pode deter o controlo. A opção também fica desativada enquanto uma migração dos dados de temperatura não tiver sido concluída, pois o Velair mantém a configuração e as sessões de controlo manual inalteradas até o fim da migração. Um Reforço não impede essa ação, porque o ajuste manual o substitui.

A ação equivalente também usa a política guardada e aceita apenas `entity_id`:

```yaml
action: velair.enter_manual_adjustment
data:
  entity_id: climate.living_room
```

Para preservar o estado por 90 minutos, primeiro guarde `for_duration` e `duration_minutes: 90` com `velair.set_external_change_policy` e depois execute essa ação. A ação explícita rejeita entidades de climatização não geridas, desativadas, `unknown` ou `unavailable`, além daquelas bloqueadas por uma paragem global, pela Pausa de um Perfil ativo ou por uma pausa independente da zona. Um Reforço ativo é substituído. Aquecimento, arrefecimento, `off`, temperaturas únicas e intervalos nativos `heat_cool` são capturados pelo mesmo fluxo de entrega, que processa as operações em sequência.

<a id="resume-with-a-service"></a>
## Retomar o controlo por um serviço

```yaml
action: velair.resume_automatic_control
data:
  entity_id: climate.living_room
```

Essa ação é idempotente: executá-la para uma entidade gerida que já está em controlo automático não faz nada. Ela rejeita entidades de climatização não geridas.

Não use o ID de pausa interno reservado `velair.manual_adjustment` com `velair.pause_zone` ou `velair.resume_zone`. O Velair o rejeita para que um único mecanismo de controlo o Ajuste manual. Uma chamada genérica a `velair.resume_zone` não encerra o Ajuste manual.

<a id="automations-and-events"></a>
## Automações e eventos

Todos os eventos de execução do Velair usam `event_type: velair_event`.

<a id="observe-every-external-control-change"></a>
### Observar cada mudança externa de controlo

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

Num intervalo nativo, `changed_fields`, `previous` e `current` usam `target_temp_low` e `target_temp_high` em vez de `temperature`, conforme o caso. Apenas os campos externos aparecem; um campo associado a uma ação do Velair é omitido mesmo que tenha chegado na mesma atualização de estado do Home Assistant.

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

Para o contrato completo dos eventos, consulte [Eventos para automações](automation-events.pt-pt.md).

<a id="restart-and-availability-behavior"></a>
## Comportamento após reinício e mudanças de disponibilidade

A política de cada zona e o motivo de Ajuste manual ativo são persistidos. Após reiniciar o Home Assistant:

- um Ajuste manual que ainda não terminou, ou que não tem prazo, permanece manual;
- ativar **Aplicar programação ativo após arranque** não ignora o Ajuste manual ativo;
- quando a hora de fim persistida é atingida, o Velair remove o ajuste e determina o comando que tem prioridade naquele momento;
- a exportação portátil inclui a política, mas exclui deliberadamente o estado de execução de uma sessão de Ajuste manual.

O registo capturado do modo e do alvo externos existe apenas durante a execução: ele não é persistido nem reaplicado após um reinício. Normalmente, o equipamento mantém e informa o seu próprio estado manual, enquanto o motivo de Ajuste manual persistido pelo Velair continua a impedir a aplicação da programação. Se o equipamento for redefinido ou informar outro alvo durante o reinício, o Velair não reconstrói o registo externo anterior. Ele espera o Ajuste manual terminar ou o controlo automático ser retomado e então determina o comando que tem prioridade naquele momento.

O Velair ignora transições de estado para ou de `unknown` e `unavailable`. Se uma mudança remota ocorrer enquanto a integração não consegue informar o estado da climatização e a única atualização posterior for uma transição de `unavailable` para disponível, o Velair não classifica essa recuperação como um novo ajuste externo. Depois de a climatização estar disponível, mudanças posteriores de modo ou alvo poderão ser detetadas normalmente.

<a id="attribution-limits"></a>
## Limites da identificação de origem

A identificação da origem procura utilizar as informações disponíveis, pois as integrações de climatização do Home Assistant e os equipamentos informam os seus estados de maneiras diferentes.

- Uma ação no equipamento ou no sistema do fabricante que nunca chega ao Home Assistant não pode ser detetada.
- Alguns equipamentos publicam o modo e o alvo em várias atualizações de estado; isso pode emitir mais de um evento de observação. As automações devem ser idempotentes.
- Uma ação externa que informa exatamente o valor de um campo ainda esperado pelo Velair pode ser identificada como uma ação do próprio Velair.
- Um equipamento que nunca informa de volta um alvo aceite do Velair pode manter essa expectativa até o seu curto prazo de validade terminar.
- A recuperação da disponibilidade, por si só, é ignorada, como explicado acima.
- Mudanças apenas de ventoinha, predefinição, oscilação, humidade ou condições ambientais não fazem parte do âmbito inicial desta função.

Portanto, a interpretação segura de `external_climate_change_detected` é: “O Velair observou uma mudança de controlo que não conseguiu atribuir a um dos seus próprios comandos”, e não “O Velair comprovou que determinada pessoa alterou o termóstato”.

<a id="troubleshooting-checklist"></a>
## Lista de verificação para resolução de problemas

Se um Ajuste manual esperado não aparecer:

1. Confirme que a entidade de climatização é gerida pelo Velair.
2. Confirme que a Programação automática está ativa globalmente e que a zona está ativada.
3. Confirme que o Perfil ativo já não pausa a zona.
4. Confirme que a origem externa altera `hvac_mode`, `temperature` ou um intervalo nativo no Home Assistant, e não apenas uma indicação na aplicação do fabricante ou uma opção de ventoinha/predefinição.
5. Confirme que a entidade não estava em `unknown` ou `unavailable` durante a transição.
6. Escute `velair_event` e filtre por `event: external_climate_change_detected`.
7. Consulte o Diagnóstico do Velair e os registos do Home Assistant para identificar falhas ao preservar o estado ou executar um serviço de climatização.

Se a zona retomar o controlo automático, mas não aplicar a temperatura esperada, verifique o Perfil/Modo atual, a programação Predefinição, os motivos de pausa independentes, o estado global do agendador e se o bloco atual está em Desligar ou Manter. A retoma sempre usa o comando que tem prioridade naquele momento, nunca um registo histórico da programação anterior.
