<a id="room-assist"></a>
# Room Assist
<!-- velair-docs:start -->
Traduções: [Original em inglês](room-assist.md) · [Español](room-assist.es.md) · [Français](room-assist.fr.md) · [Deutsch](room-assist.de.md) · [Italiano](room-assist.it.md) · [Nederlands](room-assist.nl.md) · [Polski](room-assist.pl.md) · [Português (Brasil)](room-assist.pt-br.md) · [Português (Portugal)](room-assist.pt-pt.md) · [Русский](room-assist.ru.md) · [Status das traduções](../translation-status.md)

<details>
<summary>Status desta tradução</summary>

| Informação | Status |
| --- | --- |
| Versão de referência | 1.9.0-beta.2 |
| Última sincronização | 2026-10-17 |
| Revisão linguística | Tradução assistida por IA |
| Em relação ao original | Sincronizada com o original em inglês. |

</details>

---
<!-- velair-docs:end -->

O Room Assist permite que o Velair use um sensor separado de temperatura ambiente para um dispositivo gerenciado, continuando a controlar a entidade real `climate.*`.

Com um bloco **Somente temperatura**, o Room Assist fica suspenso enquanto o equipamento está desligado. Ele não liga o equipamento nem restaura um modo HVAC anterior ao remover sua correção anterior. Após uma ativação externa, pode auxiliar usando o modo compatível real sem solicitar mudança de modo. Atualizar a temperatura-alvo programada enquanto desligado continua dependendo da integração de climatização.

Isso é útil para válvulas termostáticas, válvulas de radiadores, termostatos de parede e aparelhos de ar-condicionado cuja leitura integrada não representa a temperatura real do cômodo. Por exemplo, uma válvula instalada junto ao radiador pode informar `22 °C` enquanto o sensor ambiente ainda informa `20.5 °C`.

Todos os cálculos usam a unidade nativa da entidade gerenciada no Home Assistant. Os exemplos abaixo usam Celsius para facilitar a leitura, mas os mesmos limites de histerese, correção com sinal, proteção do alvo programado, largura da faixa, passo de temperatura e tratamento de limites físicos se aplicam diretamente em Fahrenheit. Por exemplo, uma diferença de temperatura no cômodo de `4 °F` corresponde a uma correção de `4 °F`; não é tratado como temperatura absoluta nem recebe o deslocamento da conversão Celsius-Fahrenheit.

O Room Assist é local e acionado por eventos. O Velair não consulta continuamente os sensores nem envia seus dados para fora do Home Assistant.

<a id="what-it-does"></a>
## O que faz

O Velair mantém o alvo programado como o verdadeiro alvo do usuário, mas ajusta temporariamente o valor enviado à entidade de climatização usando o sensor ambiente separado e a leitura do próprio dispositivo.

Para um alvo único em `heat` ou `cool` fixo, uma zona morta diferente de zero cria dois limites de comutação. O Room Assist lembra qual limite está buscando e só muda de direção quando o sensor ambiente separado atinge o limite oposto. Isso cria um ciclo real de histerese baseado no sensor separado, em vez de permitir que o sensor interno inicie outro ciclo perto do alvo central. O delta máximo de assistência limita a correção com sinal calculada a partir do limite ativo.

Alvos escalares de `auto` e `heat_cool` e faixas nativas de `heat_cool` mantêm seu comportamento neutro ou de margem da faixa. O Velair não força esses modos a alternar aquecimento e resfriamento ativos em um ciclo escalar de histerese.

A entidade de climatização continua sendo o atuador. O Velair não cria uma entidade virtual nem contorna o firmware. Se o termostato ou válvula aceita vincular diretamente um sensor separado, essa opção nativa costuma continuar sendo a melhor primeira escolha.

<a id="setup"></a>
## Configuração

1. Abra a aba Room Assist.
2. Expanda o dispositivo que deseja configurar.
3. Selecione um sensor de temperatura ambiente.
4. Habilite **Assistente de Sensor de Ambiente**.
5. Ajuste **Zona morta Room Assist** para definir os limites inferior e superior de comutação em aquecimento ou resfriamento fixo, ou a margem neutra em modos automáticos e faixas nativas.
6. Ajuste **Delta de assistência máxima** se o padrão for pequeno demais para o cômodo ou menor que a diferença de alvo que o termostato precisa para interromper aquecimento ou resfriamento.
7. Ajuste **Atraso de atualização** se os sensores parecerem lentos demais ou gerarem atualizações excessivas.

Apenas selecionar um sensor ambiente salva a escolha. O Velair só passa a usá-lo como temperatura ambiente efetiva quando a assistência está habilitada.

A assistência com sensor ambiente não exige pré-condicionamento adaptativo. Pode funcionar em blocos normais e em blocos antecipados pelo pré-condicionamento.

Um bloco de temperatura com **Manter o modo atual** ainda aplica seu alvo programado. O Room Assist usa o modo realmente ativo; se o dispositivo estiver desligado, o Velair o inicia em um modo compatível. **Manter o modo atual** não significa «manter o alvo do termostato inalterado» em um bloco de temperatura. Um bloco apenas de opções não tem alvo, então o Room Assist não atua nele.

O atraso de atualização agrupa mudanças próximas do sensor ambiente ou temperatura do dispositivo antes de recalcular. O padrão é `20` segundos. Defina `0` para recálculo imediato ou até `300` segundos para agrupar atualizações frequentes.

A zona morta do Room Assist é independente do delta mínimo do pré-condicionamento adaptativo. O padrão é `0.3 °C` ou `1 °F`; aceita `0` para desabilitar e passos de `0.1` grau até `5 °C` ou `9 °F`. Salvar com o Room Assist ativo atualiza imediatamente o alvo assistido.

A escala em tempo real desenha a zona morta configurada como uma faixa neutra listrada. Para um alvo único fixo, suas bordas são os limites de comutação da histerese, e o estado identifica qual o Room Assist busca. Em modos automáticos escalares, ela permanece uma margem neutra. Para uma faixa nativa `heat_cool`, vai do limite inferior menos a zona morta ao superior mais a zona morta. A escala se expande para manter ambas as bordas visíveis. A legenda traduzida completa permanece centralizada na faixa real, mesmo se ela for mais estreita que o texto, preservando o significado em qualquer largura do gráfico. A explicação completa também fica disponível para tecnologias assistivas e ao passar o ponteiro. Com zona morta `0`, nenhuma área é desenhada e a legenda estática informa explicitamente que não há zona morta. Gráfico e legenda acompanham o valor salvo no backend; ocultar `show_room_assist_deadband` em um cartão Lovelace oculta juntos configuração, faixa e legenda.

Ao atualizar uma versão em que o Room Assist compartilhava o delta mínimo do pré-condicionamento, o Velair copia o valor existente uma única vez para a nova zona morta. Isso preserva a largura configurada, inclusive um valor histórico fora do novo passo de entrada de 0,1 grau; `heat` e `cool` fixos passam a usar esse valor no ciclo descrito abaixo. Após migrar, as duas configurações são independentes: mudar uma nunca muda a outra. Uma zona nova ou redefinida usa o padrão correspondente à unidade indicado acima.

<a id="understanding-the-live-status"></a>
## Entender o estado em tempo real

A aba Room Assist informa o que o Velair pode fazer atualmente por dispositivo, sem exigir que você deduza isso pelo alvo do termostato:

| Estado | Significado |
| --- | --- |
| **Não configurado** | Nenhum sensor ambiente separado foi selecionado. |
| **Desabilitado** | Um sensor está salvo, mas o Room Assist está desligado. |
| **Inativo** | Está habilitado, mas não há bloco de temperatura ativo compatível ou cálculo utilizável. |
| **Pronto** | O Velair tem leituras e alvo necessários, mas ainda não aplicou um alvo assistido. |
| **Ajudando** | Aplicou um alvo temporário corrigido ou uma faixa deslocada. |
| **Mantendo** | Mantém neutro um alvo automático escalar, mantém uma faixa nativa ou a proteção mantém o alvo do lado seguro. Um ciclo fixo `heat` ou `cool` pode continuar **Ajudando** ao atravessar a zona morta. |
| **Bloqueado** | Pausa, Reforço, estado Manual ou outro estado do agendador tem prioridade. |
| **Indisponível** | O dispositivo ou a capacidade necessária de alvo não pode ser usada agora. A interface mostra o motivo quando conhecido. |

Quando ativo, Visão geral resume em **Em direção ao limite inferior**, **Em direção ao limite superior**, **Ativo**, **Mantendo** ou **Proteção agendada**, conforme o caso, mostrando valores programados e aplicados. Mínimo ou máximo do termostato difere de proteção programada: Room Assist mostra um aviso com valores solicitados, aplicados e aceitos, e o Home Assistant recebe uma notificação persistente até resolver o limite físico.

<a id="fixed-heating-hysteresis-example"></a>
## Exemplo de histerese de aquecimento fixo

Cenário:

- Bloco programado: `21 °C`, `heat`
- Zona morta Room Assist: `±0.3 °C`
- Limite inferior: `20.7 °C`
- Limite superior: `21.3 °C`
- Delta máximo de assistência: `2 °C`
- Passo do dispositivo: `0.1 °C`

O ciclo funciona passo a passo:

1. Os sensores ambiente e do dispositivo informam `21.0 °C`. Como este é um novo ciclo de aquecimento fixo dentro da faixa, o Velair começa de forma segura **em direção ao limite inferior**.
2. O alvo ativo da histerese é `20.7 °C`. A correção é calculada dessa borda, não dos `21 °C` centrais programados:

   ```text
   correction = 20.7 - 21.0 = -0.3 °C
   climate target = 21.0 + (-0.3) = 20.7 °C
   ```

   Esse alvo é intencionalmente definido para não estimular aquecimento, sujeito ao passo e limites físicos do dispositivo.
3. Se o cômodo passar por `20.9 °C`, o Velair mantém a fase. Não pede aquecimento apenas por cruzar os `21 °C` centrais.
4. Quando o sensor ambiente separado atingir `20.7 °C`, o Velair muda **em direção ao limite superior**, em `21.3 °C`.
5. Suponha que o cômodo esteja a `20.7 °C` e o sensor do dispositivo a `20.5 °C`. A nova correção pede aquecimento:

   ```text
   correction = 21.3 - 20.7 = +0.6 °C
   climate target = 20.5 + 0.6 = 21.1 °C
   ```

6. O Velair continua buscando o limite superior enquanto o cômodo passa por `21.0 °C`. Em `21.3 °C`, volta a buscar `20.7 °C`, aplica uma correção negativa e repete o ciclo.

O alvo visível da programação permanece `21 °C`. O alvo temporário é apenas o valor enviado ao termostato. Se a correção calculada exceder o delta máximo, o Velair a limita antes de somar à leitura atual do dispositivo.

A fase do modo fixo existe apenas durante a execução. Um novo bloco, alvo ou modo HVAC, limpar o Room Assist ou recarregar o Velair inicia outro ciclo. Se um novo ciclo `heat` começar com o cômodo dentro da faixa, busca primeiro o limite inferior para não pedir aquecimento imediatamente.

Quando essa proteção muda o resultado, o estado em tempo real explica os dois valores. Identifica o alvo calculado e o efetivamente mantido, e Visão geral mostra o estado compacto `Proteção agendada`. É um comportamento protetor normal, não erro de termostato, portanto não cria notificação persistente. Limites físicos continuam usando seu próprio aviso e notificação.

O dispositivo continua responsável pela proteção do compressor, tempos mínimos de funcionamento e resposta física. O ciclo de histerese dá ao Velair uma estratégia mais robusta de temperatura-alvo, mas não garante o momento exato em que relé, válvula ou compressor muda de estado.

<a id="heating-with-a-capped-delta"></a>
## Aquecimento com delta limitado

Cenário:

- Bloco programado: `25 °C`, `heat`
- Sensor ambiente: `18 °C`
- Temperatura atual do dispositivo: `17.1 °C`
- Zona morta Room Assist: `0 °C` (correção histórica com sinal)
- Delta máximo de assistência: `5 °C`

A diferença real de temperatura ambiente é grande:

```text
25 - 18 = 7 °C
```

O Velair limita o delta de assistência ao valor configurado:

```text
assist delta = 5 °C
climate target = 17.1 + 5 = 22.1 °C
```

Com passo de `0.5 °C`, o alvo de aquecimento é arredondado para baixo, para `22 °C`.

Isso impede alvos irreais no termostato, mantendo-o suficientemente ativo para aquecer o cômodo.

<a id="fixed-cooling-hysteresis-example"></a>
## Exemplo de histerese de resfriamento fixo

Cenário:

- Bloco programado: `24 °C`, `cool`
- Zona morta Room Assist: `±0.5 °C`
- Limite inferior: `23.5 °C`
- Limite superior: `24.5 °C`
- Delta máximo de assistência: `2 °C`
- Passo do dispositivo: `0.5 °C`

O resfriamento é simétrico, mas um novo ciclo dentro da faixa começa de forma segura **em direção ao limite superior**, para não pedir resfriamento imediatamente:

1. Com ambos os sensores em `24.0 °C`, a borda ativa é `24.5 °C`:

   ```text
   correction = 24.5 - 24.0 = +0.5 °C
   climate target = 24.0 + 0.5 = 24.5 °C
   ```

   Aumentar o alvo de resfriamento fixo desestimula o resfriamento.
2. A fase não muda enquanto o cômodo atravessa a faixa. Quando o sensor separado atinge `24.5 °C`, o Velair passa a buscar `23.5 °C`.
3. Se o cômodo estiver então a `24.5 °C` e o sensor do dispositivo informar `25.0 °C`:

   ```text
   correction = 23.5 - 24.5 = -1.0 °C
   climate target = 25.0 - 1.0 = 24.0 °C
   ```

   Isso pede resfriamento.
4. O Velair continua buscando a borda inferior enquanto o cômodo passa por `24.0 °C`. Em `23.5 °C`, volta a buscar `24.5 °C` e repete.

Alinhamento ao passo e limites físicos continuam valendo para todo alvo temporário. O firmware continua responsável pelo ciclo real de resfriamento.

<a id="how-legacy-inversion-and-scheduled-protection-work-together"></a>
## Como inversão histórica e proteção programada funcionam juntas

A inversão com sinal e a proteção do alvo programado resolvem partes diferentes do mesmo problema. A inversão muda a direção da correção após a temperatura do sensor ambiente separado cruzar o alvo. A proteção é o limite final de segurança quando a correção inversa ainda deixa um alvo de modo fixo no lado que exige atuação em relação à programação.

Os exemplos de resfriamento abaixo usam programação de `22 °C`, zona morta de `0 °C`, passo de `0.5 °C` e delta máximo suficiente para não limitar o cálculo. As colunas «sem inversão» e «antes da proteção» são valores intermediários explicativos; não são modos selecionáveis do Room Assist.

| Sensor ambiente separado | Leitura do dispositivo | Sem inversão após cruzar | Resultado com sinal antes da proteção | Alvo final | Motivo |
| --- | --- | --- | --- | --- | --- |
| `24 °C` | `25.1 °C` | Não se aplica | `23.5 °C` | `23.5 °C` | O cômodo ainda precisa resfriar. |
| `21 °C` | `19 °C` | `19 °C` | `20 °C` | `22 °C` | A inversão aumenta o alvo, mas ainda pediria resfriamento, então vale o limite inferior programado. |
| `21 °C` | `25 °C` | `25 °C` | `26 °C` | `26 °C` | O alvo inverso mais forte já está seguramente acima da programação, então é mantido. |

O aquecimento é simétrico. Com programação de `20 °C`, leitura ambiente separada de `21 °C` e interna de `24 °C`, o resultado com sinal é `23 °C`; a proteção aplica o teto programado de `20 °C`. Se o sensor separado informar `24 °C` e o interno `21.5 °C`, o resultado inverso mais forte é `17.5 °C`, já seguro, e permanece inalterado.

Por isso a inversão continua útil mesmo com proteção: pode avançar mais para o lado que não estimula atuação quando a leitura do dispositivo permite, enquanto a proteção cobre casos em que a leitura interna se deslocou para o lado errado.

Com zona morta diferente de zero, `heat` e `cool` fixos usam o ciclo com memória acima, em vez de mudar direção no alvo central. Zona morta `0` preserva o cálculo histórico com sinal: a correção muda de sinal ao cruzar o alvo programado, sem reter fase de histerese.

Um alvo escalar compatível `auto` ou `heat_cool` também preserva o cálculo histórico com sinal. Dentro da zona morta, usa o alvo aceito mais próximo da leitura do dispositivo, sem forçar alternância ativa de aquecimento e resfriamento. Um dispositivo com faixa nativa `heat_cool` mantém ambos os limites do usuário e recebe a faixa assistida completa descrita abaixo.

<a id="device-hysteresis-and-minimum-run-time"></a>
## Histerese do dispositivo e tempo mínimo de funcionamento

O Room Assist controla o alvo enviado pelo Home Assistant. Não substitui a histerese do firmware, proteção do compressor, tempo mínimo de funcionamento nem a decisão de quando um alvo igual à leitura significa inatividade.

Por exemplo, um ciclo de aquecimento fixo em direção ao limite inferior envia um alvo que pretende desestimular aquecimento até o sensor separado chegar à borda. Um dispositivo com histerese interna ampla ou tempo mínimo pode ainda iniciar ou continuar aquecendo temporariamente. O Velair não deduz uma margem de parada não documentada específica do dispositivo nem consulta `hvac_action` para mudar a fase.

A proteção programada impede que o Velair mova o alvo para além da programação enquanto a leitura do sensor interno se desloca; não promete parada imediata do HVAC. Vinculação nativa de sensor separado ou calibração continua sendo a melhor opção quando disponível. Use um bloco `Off` quando precisar de parada explícita em vez de manutenção controlada pelo termostato.

O delta máximo deve permitir a correção inversa de que o dispositivo pode precisar. O editor mantém essa orientação visível abaixo do nome da configuração. Por exemplo:

```text
Thermostat stopping gap: 2.5 °C
Maximum assist delta:    2.0 °C  -> may be insufficient
Maximum assist delta:    3.0 °C  -> permits enough inverse correction
```

Definir `3 °C` não aplica imediatamente uma correção de `3 °C`. Apenas permite atingir esse valor quando a diferença medida pelo sensor ambiente separado exigir.

<a id="why-climate-target-can-differ-from-the-calculation"></a>
### Por que o alvo da climatização pode diferir do cálculo

**Alvo da climatização** é o valor informado pela entidade enquanto o Room Assist está pronto ou bloqueado. Quando está ajudando ou mantendo um alvo escalar aplicado, mostra o valor temporário enviado pelo Velair. Nenhum dos dois é o alvo ambiente programado ou o limite ativo da histerese. Um dispositivo aceita alvos em uma grade própria, então o Velair pode precisar alinhar o valor final ao passo efetivo publicado, último informado, manual ou padrão.

Por exemplo, em resfriamento fixo pode calcular `23.9 °C` para um dispositivo com passos de `0.5 °C`. Aplica `24.0 °C`: arredonda para cima para não resfriar mais agressivamente que o cálculo. Aquecimento fixo arredonda para baixo; modos automáticos escalares usam o passo mais próximo. O botão de informação junto a **Alvo da climatização** adapta a explicação ao valor mostrado e, quando o alinhamento realmente alterou o valor aplicado, mostra cálculo, passo efetivo e valor enviado. Limites físicos e proteção programada são informados separadamente, sem serem descritos como alinhamento ao passo.

<a id="heatcool-range-example"></a>
## Exemplo de faixa Aquecer/resfriar

O Room Assist também aceita faixas nativas `heat_cool`. Trata os alvos inferior e superior como uma faixa única de conforto e sempre os move juntos, mantendo a distância entre eles.

Cenário:

- Faixa programada: `19–24 °C`
- Sensor ambiente: `18 °C`
- Temperatura atual do dispositivo: `22 °C`
- Delta máximo de assistência: `2 °C`
- Passo do dispositivo: `0.5 °C`

O cômodo está `1 °C` abaixo do limite de aquecimento. O Velair posiciona o limite inferior `1 °C` acima da leitura do dispositivo e move o superior pela mesma distância:

```text
applied range = 23–28 °C
```

O dispositivo lê `22 °C`, portanto está abaixo do limite inferior aplicado e pode pedir aquecimento. Se o cômodo depois superar `24 °C`, o Velair usa o superior da mesma forma para pedir resfriamento. Ao entrar pela primeira vez na faixa programada, incluindo a zona morta configurada nas bordas, posiciona a faixa aplicada para que a leitura do dispositivo fique dentro dela. Depois, mantém essa faixa estável enquanto o sensor ambiente separado permanece dentro da faixa. Não acompanha movimentos posteriores do sensor interno, pois sua leitura pode variar quando compressor, ventilador, válvula ou radiador estão ativos.

A faixa aplicada sempre é alinhada ao passo e deslocada inteira ao atingir limites físicos. O Velair nunca ajusta Mín. e Máx. independentemente.

Se um alvo escalar ou faixa calculado ultrapassar mínimo ou máximo aceitos, o Velair aplica o resultado válido mais próximo. O estado em tempo real mostra alvo solicitado, aplicado e limite atingido antes do gráfico. O Home Assistant também cria uma notificação persistente para o limite ativo; atualizações repetidas não duplicam avisos, e o Velair remove a notificação após a recuperação.

<a id="when-velair-does-nothing"></a>
## Quando o Velair não atua

O Room Assist exige um passo efetivo válido e positivo. O Velair usa primeiro `target_temp_step` publicado pelo dispositivo. Na ausência dele, o último passo válido informado pela entidade protege a mesma grade de alvos. Depois vem o valor alternativo manual por zona mostrado nas Configurações, com padrão `1` quando não há os anteriores. Salvar o campo com o atributo ausente torna esse valor explícito a referência, limpando a observação lembrada; uma nova informação válida volta a ser lembrada. O Velair não deduz relações com outra entidade.

O Room Assist não aplica alvo assistido quando:

- não há sensor ambiente selecionado;
- a assistência está desabilitada;
- o agendador não está no modo automático;
- o dispositivo está pausado ou com reforço;
- não há bloco ativo de temperatura;
- o bloco ativo é `Off`;
- o sensor ambiente ou temperatura do dispositivo está indisponível ou não é numérico;
- a mudança calculada é menor que o passo de temperatura do dispositivo;
- o modo HVAC não pode ser interpretado como aquecimento ou resfriamento.

Nesses casos, o Velair mantém ou restaura o alvo programado normal quando isso é seguro.

<a id="external-adjustments-and-manual-adjustment"></a>
## Ajustes externos e Ajuste manual

Com a política padrão **Manter automático**, o Room Assist mantém a autoridade, e o Velair recalcula e reaplica o alvo assistido atual após detectar uma alteração externa de alvo ou modo HVAC. Com qualquer política Manual, cede intencionalmente quando a alteração coloca o dispositivo em **Ajuste manual**. O Velair captura o estado externo completo no evento de mudança do Home Assistant, remove a correção ativa sem restaurar o alvo programado e preserva o alvo escalar externo ou faixa nativa `heat_cool`. Isso evita uma disputa imediata com um cartão de climatização, controle remoto físico ou outro ajuste fora do Velair.

Exemplo:

```text
Scheduled cooling target: 24 °C
Room Assist temporary target: 26 °C
External adjustment: 23 °C
Result during Manual adjustment: 23 °C
```

Ao retomar a programação Automática, o Velair resolve a intenção da programação ou Perfil válida naquele momento. O Room Assist pode calcular uma nova correção pelas leituras atuais; não revive a antiga correção de `26 °C` nem a fase de histerese fixa. Recarregar o Velair ou Home Assistant causa a mesma redefinição do estado de execução: o bloco atual é resolvido novamente e uma nova fase segura é escolhida pelo modo e leitura ambiente atuais.

Uma mudança externa elegível mantém a autoridade automática ou inicia/atualiza Ajuste manual conforme a política salva para o dispositivo. Para políticas, serviços, interações com Reforço/Perfil e limites de atribuição, consulte [Alterações externas e Ajuste manual](manual-control.pt-br.md).

<a id="planned-return"></a>
## Retorno planejado

Durante o [Retorno planejado](planned-return.pt-br.md), o Room Assist segue o alvo temporário de chegada de cada zona assim que ela começa a preparação. Não continua usando a temperatura do Modo Ausente nem volta a ela quando um bloco da programação de ausência muda. Outras zonas continuam seguindo Ausente até sua própria preparação começar.

Por exemplo, um alvo de ausência de 16 graus se torna um alvo de chegada de 21 graus quando o cômodo começa a preparar. O Room Assist pode ajustar o alvo físico para chegar a 21 graus no sensor ambiente. Ajuste manual e pausas explícitas suspendem sua intervenção na zona afetada. Selecionar explicitamente um Modo/Perfil cancela a preparação antecipada do episódio e mantém a seleção. O controle **Cancelar** do retorno também remove a preparação; após saída confirmada, restaura o Modo e Perfis anteriores registrados. Consulte os [Exemplos de cancelamento](planned-return.pt-br.md#cancelling-a-return-examples).

<a id="adaptive-preconditioning"></a>
## Pré-condicionamento adaptativo

Quando o pré-condicionamento adaptativo está habilitado e antecipa um bloco futuro, o Room Assist segue esse alvo até o horário de conforto programado.

Isso importa porque o horário atual ainda pode pertencer a um bloco anterior. O Velair trata o bloco antecipado já iniciado como o alvo ativo gerenciado, portanto o Room Assist não recalcula pelo bloco anterior.

Com a assistência habilitada, o pré-condicionamento adaptativo também usa o sensor ambiente selecionado como fonte efetiva de temperatura para decisões e aprendizado.

<a id="automation-events"></a>
## Eventos de automação

O Velair emite o evento padrão `velair_event` do Home Assistant.

O Room Assist emite:

- `room_sensor_assist_state_changed`: a assistência foi habilitada ou desabilitada.
- `room_sensor_assist_updated`: o Velair aplicou um alvo temporário assistido.
- `room_sensor_assist_restored`: o Velair deixou de gerenciar o alvo temporário e restaurou o alvo programado normal quando possível.

Consulte [Eventos de automação](automation-events.pt-br.md#room-sensor-assist-state-changed) para os dados completos e todos os motivos de restauração.

Exemplo de dados do evento:

```yaml
event: room_sensor_assist_updated
entity_id: climate.living_room
room_temperature_entity_id: sensor.living_room_temperature
target_temperature: 21
applied_temperature: 20
room_temperature: 18
climate_temperature: 17.1
assist_delta: 3.3
applied_offset: 2.9
direction: heat
hvac_mode: heat
hysteresis_phase: towards_upper
hysteresis_target: 21.3
deadband_low: 20.7
deadband_high: 21.3
reason: current_schedule
```

Os quatro campos de histerese são opcionais. Aparecem em um ciclo escalar fixo `heat` ou `cool` com zona morta diferente de zero e não aparecem na correção histórica sem zona morta, modos automáticos escalares e faixas nativas.

Uma atualização de faixa usa as faixas completas programada e aplicada, em vez de campos escalares:

```yaml
event: room_sensor_assist_updated
entity_id: climate.living_room
room_temperature_entity_id: sensor.living_room_temperature
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
reason: current_schedule
```

Exemplo de gatilho de automação:

```yaml
trigger:
  - platform: event
    event_type: velair_event
    event_data:
      event: room_sensor_assist_updated
      entity_id: climate.living_room
```

O Room Assist também pode ser controlado por automações com:

- `velair.enable_room_sensor_assist`
- `velair.disable_room_sensor_assist`

<a id="lovelace"></a>
## Lovelace

A visualização do Room Assist está disponível como cartão Lovelace:

```yaml
type: custom:velair-card
view: sensors
entities:
  - climate.living_room
```

A escala em tempo real separa duas relações. Para alvo único, a linha superior compara o sensor ambiente ao alvo programado, e a linha inferior de controle compara a leitura do dispositivo ao alvo da climatização. Em `heat` ou `cool` fixo, a faixa listrada marca os dois limites de histerese, e o estado nomeia o ativo. Em modos automáticos escalares, permanece uma margem neutra. Para uma faixa nativa, colchetes vermelhos e azuis identificam as faixas completas programada e aplicada, inclusive ambos os limites. Um único conector `Mudança de faixa` com sinal liga seus centros, representando o movimento de toda a faixa, não de uma borda isolada. Esses indicadores descrevem apenas o alvo enviado pelo Velair; não afirmam que termostato, válvula ou compressor estão aquecendo ou resfriando ativamente.

Em colunas estreitas do painel, a escala permite rolagem horizontal para manter legíveis os marcadores de temperatura.

O cartão Lovelace do Room Assist pode ocultar partes individuais para uma visualização compacta apenas no painel:

```yaml
type: custom:velair-card
view: sensors
entities:
  - climate.living_room
show_room_assist_switch: false
show_room_assist_sensor: false
show_room_assist_deadband: false
show_room_assist_max_delta: false
show_room_assist_debounce: false
show_room_assist_live_status: true
```

Opções `show_room_assist_*` omitidas têm padrão `true`.

<a id="technical-details"></a>
## Detalhes técnicos

Detalhes para desenvolvedores sobre campos de armazenamento, estado durante a execução, cálculo do alvo assistido, restauração e eventos estão em [Funcionamento interno do Room Assist](../developer/room-assist.md).
