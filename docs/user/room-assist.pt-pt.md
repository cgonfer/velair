<a id="room-assist"></a>
# Room Assist
<!-- velair-docs:start -->
Traduções: [Original em inglês](room-assist.md) · [Español](room-assist.es.md) · [Français](room-assist.fr.md) · [Deutsch](room-assist.de.md) · [Italiano](room-assist.it.md) · [Nederlands](room-assist.nl.md) · [Polski](room-assist.pl.md) · [Português (Brasil)](room-assist.pt-br.md) · [Português (Portugal)](room-assist.pt-pt.md) · [Русский](room-assist.ru.md) · [Estado das traduções](../translation-status.md)

<details>
<summary>Estado desta tradução</summary>

| Informação | Estado |
| --- | --- |
| Versão de referência | 1.9.3-beta.3 |
| Última sincronização | 2026-11-22 |
| Revisão linguística | Tradução assistida por IA |
| Em relação ao original | Sincronizada com o original em inglês. |

</details>

---
<!-- velair-docs:end -->

O Room Assist permite que o Velair use um sensor separado de temperatura ambiente para um dispositivo gerido, continuando a controlar a entidade real `climate.*`.

Com um bloco **Apenas temperatura**, o Room Assist fica suspenso enquanto o equipamento está desligado. Ele não liga o equipamento nem restaura um modo HVAC anterior ao remover sua correção anterior. Após uma ativação externa, pode auxiliar utilizando o modo compatível real sem solicitar mudança de modo. Atualizar a temperatura-alvo programada enquanto desligado continua dependendo da integração de climatização.

Esta função é útil para válvulas termostáticas, válvulas de radiadores, termóstatos de parede e aparelhos de ar condicionado cuja leitura integrada não representa a temperatura real da divisão. Por exemplo, uma válvula instalada junto ao radiador pode informar `22 °C` enquanto o sensor ambiente ainda informa `20.5 °C`.

Todos os cálculos usam a unidade nativa da entidade gerida no Home Assistant. Os exemplos abaixo usam Celsius para facilitar a leitura, mas os mesmos limites de histerese, correção com sinal, proteção do alvo programado, largura do intervalo, passo de temperatura e tratamento de limites físicos aplicam-se diretamente em Fahrenheit. Por exemplo, um desvio da temperatura da divisão de `4 °F` corresponde a uma correção de `4 °F`; não é tratado como temperatura absoluta nem recebe o deslocamento da conversão Celsius-Fahrenheit.

O Room Assist é local e baseado em eventos. O Velair não consulta continuamente os sensores nem envia os seus dados para fora do Home Assistant.

<a id="what-it-does"></a>
## O que faz

O Velair mantém o alvo programado como o verdadeiro alvo do utilizador, mas ajusta temporariamente o valor enviado à entidade de climatização com base no sensor separado da divisão e na leitura do próprio dispositivo.

Para um alvo único em `heat` ou `cool` fixo, uma zona morta diferente de zero cria dois limites de comutação. Com a travagem **Predefinida**, o Room Assist guarda qual é o limite para o qual se dirige e só muda de direção quando o sensor ambiente separado atinge o limite oposto. Isto cria um ciclo real de histerese baseado no sensor separado, em vez de permitir que o sensor interno inicie outro ciclo perto do alvo central. O delta máximo de assistência limita a correção com sinal calculada a partir do limite ativo. Os níveis opcionais de travagem retiram a procura com mais firmeza; **Elevada** inicia essa retirada no alvo programado, em vez de esperar pelo limite de comutação mais distante.

Alvos escalares de `auto` e `heat_cool` e intervalos nativos de `heat_cool` mantêm o seu comportamento neutro ou de margem do intervalo. O Velair não força esses modos a alternar aquecimento e arrefecimento ativos num ciclo escalar de histerese.

A entidade de climatização continua a ser o atuador. O Velair não cria uma entidade virtual nem contorna o firmware. Se o termóstato ou válvula permite associar diretamente um sensor separado, essa opção nativa continua normalmente a ser a melhor primeira escolha.

Para dois alvos em `heat` ou `cool` fixo, selecione primeiro **Alvo de referência** para o dispositivo e modo em **Definições → Dispositivos de climatização e grupos**. Escolha **Alvo inferior** ou **Alvo superior** conforme o valor realmente usado pelo equipamento nesse modo; o Velair não deduz isso da capacidade de usar faixas. A seleção é partilhada com Pré-condicionamento adaptativo.

O Room Assist usa o limite escolhido como alvo fixo de aquecimento ou arrefecimento, incluindo o ciclo de histerese escalar e a proteção do alvo programado. Desloca ambos os alvos pelo mesmo valor, preservando sua separação. Ambos os limites devem respeitar o incremento e os limites físicos do dispositivo; por isso o outro limite pode restringir a correção disponível. As informações sobre limites físicos continuam disponíveis no gráfico e em **Dados técnicos**.

Com **Não configurado**, pares em modo fixo são entregues sem alteração nem correção do Room Assist. Faixas em `auto` continuam sem assistência; bandas nativas `heat_cool` mantêm o comportamento existente. Os ajustes guardados do Room Assist são mantidos. Mudar a referência ou o modo elimina a assistência obsoleta sem restaurar um alvo corrigido antigo sobre a nova intenção.

<a id="setup"></a>
## Configuração

1. Abra o separador Room Assist.
2. Expanda o dispositivo que deseja configurar.
3. Em **Assistente de Sensor de Ambiente**, escolha **Sensor fixo** ou **Por horário**, configure a opção escolhida e guarde qualquer mudança de modalidade.
4. Habilite a assistência com sensor ambiente.
5. Ajuste a banda morta do Room Assist para os limites inferior e superior em aquecimento ou arrefecimento fixo ao redor do alvo escalar ou referência de faixa selecionada, ou a margem neutra em modos automáticos escalares e bandas nativas `heat_cool`.
6. Ajuste o delta máximo de assistência se o predefinição for pequeno ou grande demais para a divisão.
7. Opcionalmente, escolha **Travagem: Moderada** ou **Elevada** para retirar a procura com mais firmeza. Estes níveis exigem uma zona morta do Room Assist superior a zero. **Predefinida** mantém o comportamento existente.
8. Opcionalmente, ajuste a reavaliação periódica de segurança. Use `0` para desabilitá-la.

Apenas a opção selecionada é apresentada. Quando **Sensor fixo** já é a modalidade guardada, a alteração do seu sensor é guardada imediatamente. Alternar entre **Sensor fixo** e **Por horário** altera um rascunho: **Guardar** aplica a modalidade e as respetivas definições, e **Cancelar** restaura a configuração guardada. O sensor fixo e a programação guardada são mantidos ao alternar; ambos não são ativados ao mesmo tempo.


<a id="optional-braking"></a>

### Travagem opcional

A travagem altera o alvo enviado ao equipamento, mantendo a temperatura programada como o alvo real da divisão. Está disponível em **Aquecimento** e **Arrefecimento** fixos, incluindo dispositivos de dois alvos com um alvo de referência configurado. Não altera modos automáticos de alvo único nem intervalos nativos `heat_cool`.

**T** é o alvo programado, **H** a zona morta do Room Assist e **S** o incremento efetivo de alvo do equipamento:

| Travagem | Aquecimento: retirar a procura | Aquecimento: voltar a pedir calor | Arrefecimento: retirar a procura | Arrefecimento: voltar a pedir arrefecimento |
| --- | --- | --- | --- | --- |
| Predefinida | Comportamento existente | Comportamento existente | Comportamento existente | Comportamento existente |
| Moderada | A T + H | A T − H | A T − H | A T + H |
| Elevada | A T | A T − H | A T | A T + H |

Durante a retirada, **Moderada** limita o alvo de aquecimento a um máximo de **T − S**, ou o de arrefecimento a um mínimo de **T + S**. **Elevada** utiliza **dois incrementos**. Se o cálculo existente já retira mais procura, o Velair mantém esse resultado mais forte. São limites fixos enquanto a travagem está ativa: as atualizações do sensor não continuam a somar ou subtrair outro incremento.

Por exemplo, com alvo de aquecimento de `20.5 °C`, zona morta de `0.5 °C` e incremento do equipamento de `0.5 °C`:

- **Moderada** retira a procura a `21 °C`, com alvo do equipamento não superior a `20 °C`.
- **Elevada** retira a procura a `20.5 °C`, com alvo não superior a `19.5 °C`.
- Ambas voltam a pedir calor quando o sensor externo atinge `20 °C`.

Antes da retirada, o cálculo de assistência existente mantém-se inalterado. A travagem permanece ativa até atingir o limite de reativação, mesmo quando a divisão cruza o alvo central. Se a assistência começa ou recomeça com a divisão já dentro do intervalo, mantém a inicialização prudente existente sem iniciar deliberadamente um ciclo de climatização.

O estado em tempo real mostra as temperaturas efetivas de retirada e reativação. O gráfico mantém a zona morta nominal visível e distingue os limiares efetivos de travagem. A procura do fornecimento partilhado segue a mesma fase confirmada.

Escolha **Predefinida** antes de definir a zona morta como zero. O nível guardado é mantido quando o modo ou a referência de temperatura atual não permite utilizá-lo, e o estado explica por que motivo a travagem adicional está inativa. Combinações guardadas inválidas suspendem a travagem adicional em vez de alterar silenciosamente a zona morta.

Os alvos físicos mínimo e máximo podem limitar a travagem disponível. Com dois alvos, o par completo desloca-se em conjunto e qualquer limite pode restringir o deslocamento. **Dados técnicos** distingue o resultado pedido do aplicado e o gráfico identifica o limite atingido.

A travagem reduz o pedido de aquecimento ou arrefecimento; não confirma que a válvula, o compressor ou o termóstato pararam. O controlo do equipamento, os tempos mínimos de funcionamento e a inércia térmica podem continuar a causar ultrapassagens. Esta definição não aprende ciclos nem retira a procura antes do alvo programado. Valide-a com ciclos reais antes de confiar num nível para uma divisão específica.

As exportações portáveis utilizam o modelo **28** para preservar a travagem e os deslocamentos de preparação. Mantenha uma cópia de segurança da versão anterior se precisar de regressar a ela; versões antigas do Velair não podem importar o modelo 28.

<a id="optional-sensor-schedule-beta"></a>

### Programação opcional de sensores (beta)

Room Assist pode usar referências de temperatura diferentes durante a semana sem alterar as suas programações de temperatura, perfis ou modos. Escolha **Por horário** em **Assistente de Sensor de Ambiente** para as configurar. Escolha **Sensor fixo** para voltar ao sensor ambiente fixo.

Escolha uma referência predefinida e adicione períodos com dias da semana, horas de início e fim e uma referência. Guarde o rascunho completo para o aplicar; Cancelar descarta as alterações. As referências podem ser sensores de temperatura disponíveis no Home Assistant ou a temperatura própria do dispositivo de climatização. Fora dos períodos, aplica-se a referência predefinida. Os períodos podem atravessar a meia-noite e pertencem aos dias de início selecionados; as sobreposições são rejeitadas. A hora de início está incluída e a de fim está excluída. As horas seguem o fuso horário configurado no Home Assistant.

Por exemplo, escolha **Sem correção do Room Assist** como predefinição e um sensor do escritório das 08:00 às 17:00, de segunda a sexta-feira. As suas programações de temperatura de verão/inverno continuam a determinar a temperatura desejada. Durante o horário de trabalho, Room Assist calcula as correções usando o sensor do escritório. Fora desse horário, Velair envia o alvo programado normal e o termóstato regula usando a sua própria referência. Isto não altera o sensor físico que o firmware do dispositivo usa internamente.

O único interruptor do Room Assist controla se a assistência está ativa. Desligá-lo mantém ambas as configurações guardadas. Escolher **Sensor fixo** e guardar repõe o sensor ambiente fixo mantido. Se uma referência externa estiver indisponível, Velair suspende a correção e usa o alvo programado normal quando detém o controlo automático; não escolhe outra divisão silenciosamente nem reutiliza uma leitura antiga. A assistência é retomada quando essa referência volta a ser utilizável.

As mudanças de referência não retiram o controlo ao ajuste manual, ao Boost ou às pausas. Quando o controlo automático é retomado, Velair usa a referência válida nesse momento. Nos grupos de divisão, a temperatura própria do dispositivo corresponde à referência de temperatura configurada para o grupo.

**Limitação da beta:** uma referência muda exatamente à hora programada. O pré-condicionamento adaptativo não inicia um alvo antecipado que atravesse uma mudança de referência; volta a calcular após essa transição. Mudar de divisão não é um pedido para preparar a próxima divisão mais cedo. As observações de aprendizagem são associadas à sua fonte de temperatura para que um salto de leitura entre divisões não seja interpretado como aquecimento ou arrefecimento.

Todas as leituras externas selecionadas têm de estar disponíveis de forma independente no Home Assistant. Para Nest, uma configuração com a integração oficial para o termóstato e outra integração para um sensor remoto tem de ser testada na instalação. Mantenha fixa a referência própria do Nest se pretende usar a leitura do termóstato como referência estável de uma divisão. Velair não seleciona o sensor ativo interno do Nest. Um sistema HVAC partilhado continua a afetar todas as divisões que abastece; escolher uma referência não cria zonas físicas independentes.

<a id="room-groups"></a>
### Grupos de divisão

Escolha o grupo no Room Assist e use os mesmos controlos de sensor, habilitação, banda morta, correção máxima e atualização. A temperatura própria vem do membro escolhido em **Grupos de divisão → Referência de temperatura**; o sensor externo opcional é configurado aqui. Desabilitar ou limpar o Room Assist devolve a medição efetiva à temperatura desse membro.

O grupo tem uma configuração e correção partilhadas do Room Assist, não um controlador independente por membro. O Velair mantém o alvo programado da divisão e envia o comando corrigido pelo modo de envio existente: todos os membros por predefinição ou o destinatário explicitamente escolhido quando a instalação já propaga os comandos. As verificações de capacidade, incremento e limites de temperatura continuam sendo aplicadas aos destinatários reais. Os membros continuam individualmente visíveis na Visão geral.

A assistência com sensor ambiente não exige pré-condicionamento adaptativo. Pode funcionar em blocos normais e em blocos antecipados pelo pré-condicionamento.

Um bloco de temperatura com **Manter o modo atual** ainda aplica o seu alvo programado. O Room Assist usa o modo realmente ativo; se o dispositivo estiver desligado, o Velair inicia-o num modo compatível. **Manter o modo atual** não significa «manter o alvo do termóstato inalterado» num bloco de temperatura. Um bloco apenas de opções não tem alvo, pelo que o Room Assist não atua nesse bloco.

O atraso de atualização agrupa mudanças próximas do sensor ambiente ou temperatura do dispositivo antes de recalcular. O valor predefinido é `20` segundos. Defina `0` para recálculo imediato ou até `300` segundos para agrupar atualizações frequentes.

A zona morta do Room Assist é independente do delta mínimo do pré-condicionamento adaptativo. O valor predefinido é `0.3 °C` ou `1 °F`; aceita `0` para desativar e passos de `0.1` grau até `5 °C` ou `9 °F`. Guardar com o Room Assist ativo atualiza imediatamente o alvo assistido.

O gráfico em tempo real desenha a zona morta nominal como uma faixa fina com trama imediatamente acima do eixo de temperatura, com a legenda correspondente por baixo. Os limiares efetivos de paragem e retoma provêm do estado de controlo confirmado; por isso, **Elevada** pode suspender a procura no alvo enquanto toda a faixa nominal permanece visível. Nos modos automáticos escalares, a faixa representa a margem neutra. Nos intervalos nativos `heat_cool`, a trama aparece apenas nas margens externas junto ao intervalo nominal, com a legenda **Margem externa**. Com zona morta zero não se desenha uma área com trama; a legenda mostra a margem zero configurada. Estes indicadores descrevem limites configurados, não o movimento dos sensores. Ocultar `show_room_assist_deadband` num cartão Lovelace oculta em conjunto a definição, a faixa e a legenda.

Ao atualizar uma versão em que o Room Assist partilhava o delta mínimo do pré-condicionamento, o Velair copia o valor existente uma única vez para a nova zona morta. Isso preserva a largura configurada, inclusive um valor histórico fora do novo passo de entrada de 0,1 grau; `heat` e `cool` fixos passam a utilizar esse valor no ciclo descrito abaixo. Após migrar, as duas definições são independentes: mudar uma nunca muda a outra. Uma zona nova ou redefinida usa o valor predefinido correspondente à unidade indicado acima.

<a id="understanding-the-live-status"></a>
## Entender o estado em tempo real

O separador Room Assist informa o que o Velair pode fazer atualmente por dispositivo, sem que seja necessário deduzir esta informação pelo alvo do termóstato:

| Estado | Significado |
| --- | --- |
| **Não configurado** | Nenhum sensor ambiente separado foi selecionado. |
| **Desativado** | Um sensor está guardado, mas o Room Assist está desligado. |
| **Inativo** | Está ativado, mas não há bloco de temperatura ativo compatível ou cálculo utilizável. |
| **Pronto** | O Velair tem leituras e alvo necessários, mas ainda não aplicou um alvo assistido. |
| **Ajudando** | Aplicou um alvo temporário corrigido ou um intervalo deslocado. |
| **A manter** | Mantém neutro um alvo automático escalar, mantém um intervalo nativo `heat_cool` ou a proteção mantém o alvo do lado seguro. Um ciclo fixo `heat` ou `cool` pode continuar **Ajudando** ao atravessar a zona morta. |
| **Bloqueado** | Pausa, Reforço, estado Manual ou outro estado do agendador tem prioridade. |
| **Indisponível** | O dispositivo ou a capacidade necessária de alvo não pode ser usada agora. A interface mostra o motivo quando conhecido. |

Quando ativo, Visão geral resume em **Em direção ao limite inferior**, **Em direção ao limite superior**, **Ativo**, **A manter** ou **Proteção programada**, conforme o caso, mostrando valores programados e aplicados. Mínimo ou máximo do termóstato difere de proteção programada: o gráfico identifica o limite físico atingido, **Dados técnicos** distingue os valores pedidos e aplicados, e o Home Assistant recebe uma notificação persistente até resolver o limite físico.

<a id="fixed-heating-hysteresis-example"></a>
## Exemplo de histerese de aquecimento fixo

Cenário com travagem **Predefinida**:

- Bloco programado: `21 °C`, `heat`
- Zona morta Room Assist: `±0.3 °C`
- Limite inferior: `20.7 °C`
- Limite superior: `21.3 °C`
- Delta máximo de assistência: `2 °C`
- Passo do dispositivo: `0.1 °C`

O ciclo funciona passo a passo:

1. Os sensores ambiente e do dispositivo informam `21.0 °C`. Como este é um novo ciclo de aquecimento fixo dentro do intervalo, o Velair começa de forma segura **em direção ao limite inferior**.
2. O alvo ativo da histerese é `20.7 °C`. A correção é calculada dessa borda, não dos `21 °C` centrais programados:

   ```text
   correction = 20.7 - 21.0 = -0.3 °C
   climate target = 21.0 + (-0.3) = 20.7 °C
   ```

   Este alvo é intencionalmente definido para não estimular aquecimento, sujeito ao passo e limites físicos do dispositivo.
3. Se a divisão passar por `20.9 °C`, o Velair mantém a fase. Não pede aquecimento apenas por cruzar os `21 °C` centrais.
4. Quando o sensor ambiente separado atingir `20.7 °C`, o Velair muda **em direção ao limite superior**, em `21.3 °C`.
5. Suponha que a divisão esteja a `20.7 °C` e o sensor do dispositivo a `20.5 °C`. A nova correção pede aquecimento:

   ```text
   correction = 21.3 - 20.7 = +0.6 °C
   climate target = 20.5 + 0.6 = 21.1 °C
   ```

6. O Velair continua a dirigir-se para o limite superior enquanto a divisão passa por `21.0 °C`. Em `21.3 °C`, volta a dirigir-se para `20.7 °C`, aplica uma correção negativa e repete o ciclo.

O alvo visível da programação permanece `21 °C`. O alvo temporário é apenas o valor enviado ao termóstato. Se a correção calculada exceder o delta máximo, o Velair a limita antes de somar à leitura atual do dispositivo.

A fase do modo fixo existe apenas durante a execução. Um novo bloco, alvo ou modo HVAC, limpar o Room Assist ou recarregar o Velair inicia outro ciclo. Se um novo ciclo `heat` começar com a divisão dentro do intervalo, dirige-se primeiro para o limite inferior para não pedir aquecimento imediatamente.

Quando essa proteção muda o resultado, o estado em tempo real explica os dois valores. Identifica o alvo calculado e o efetivamente mantido, e Visão geral mostra o estado compacto `Proteção programada`. É um comportamento protetor normal, não erro de termóstato, portanto não cria notificação persistente. Os limites físicos continuam identificados no gráfico e em **Dados técnicos**, com a respetiva notificação separada.

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

Isso impede alvos irreais no termóstato, mantendo-o suficientemente ativo para aquecer a divisão.

<a id="fixed-cooling-hysteresis-example"></a>
## Exemplo de histerese de arrefecimento fixo

Cenário com travagem **Predefinida**:

- Bloco programado: `24 °C`, `cool`
- Zona morta Room Assist: `±0.5 °C`
- Limite inferior: `23.5 °C`
- Limite superior: `24.5 °C`
- Delta máximo de assistência: `2 °C`
- Passo do dispositivo: `0.5 °C`

O arrefecimento é simétrico, mas um novo ciclo dentro do intervalo começa de forma segura **em direção ao limite superior**, para não pedir arrefecimento imediatamente:

1. Com ambos os sensores em `24.0 °C`, a borda ativa é `24.5 °C`:

   ```text
   correction = 24.5 - 24.0 = +0.5 °C
   climate target = 24.0 + 0.5 = 24.5 °C
   ```

   Aumentar o alvo de arrefecimento fixo desencoraja o arrefecimento.
2. A fase não muda enquanto a divisão atravessa o intervalo. Quando o sensor separado atinge `24.5 °C`, o Velair passa a dirigir-se para `23.5 °C`.
3. Se a divisão estiver então a `24.5 °C` e o sensor do dispositivo informar `25.0 °C`:

   ```text
   correction = 23.5 - 24.5 = -1.0 °C
   climate target = 25.0 - 1.0 = 24.0 °C
   ```

   Isso pede arrefecimento.
4. O Velair continua a dirigir-se para a borda inferior enquanto a divisão passa por `24.0 °C`. Em `23.5 °C`, volta a dirigir-se para `24.5 °C` e repete.

Alinhamento ao passo e limites físicos continuam a aplicar-se a cada alvo temporário. O firmware continua responsável pelo ciclo real de arrefecimento.

<a id="how-legacy-inversion-and-scheduled-protection-work-together"></a>
## Como inversão histórica e proteção programada funcionam juntas

A inversão com sinal e a proteção do alvo programado resolvem partes diferentes do mesmo problema. A inversão muda a direção da correção após a temperatura do sensor ambiente separado cruzar o alvo. A proteção é o limite final de segurança quando a correção inversa ainda deixa um alvo de modo fixo no lado que exige atuação em relação à programação.

Os exemplos de arrefecimento abaixo usam programação de `22 °C`, zona morta de `0 °C`, passo de `0.5 °C` e delta máximo suficiente para não limitar o cálculo. As colunas «sem inversão» e «antes da proteção» são valores intermédios explicativos; não são modos selecionáveis do Room Assist.

| Sensor ambiente separado | Leitura do dispositivo | Sem inversão após cruzar | Resultado com sinal antes da proteção | Alvo final | Motivo |
| --- | --- | --- | --- | --- | --- |
| `24 °C` | `25.1 °C` | Não se aplica | `23.5 °C` | `23.5 °C` | A divisão ainda precisa de arrefecimento. |
| `21 °C` | `19 °C` | `19 °C` | `20 °C` | `22 °C` | A inversão aumenta o alvo, mas ainda pediria arrefecimento, então vale o limite inferior programado. |
| `21 °C` | `25 °C` | `25 °C` | `26 °C` | `26 °C` | O alvo inverso mais forte já está seguramente acima da programação, então é mantido. |

O aquecimento é simétrico. Com programação de `20 °C`, leitura ambiente separada de `21 °C` e interna de `24 °C`, o resultado com sinal é `23 °C`; a proteção aplica o teto programado de `20 °C`. Se o sensor separado informar `24 °C` e o interno `21.5 °C`, o resultado inverso mais forte é `17.5 °C`, já seguro, e permanece inalterado.

Por isso a inversão continua útil mesmo com proteção: pode avançar mais para o lado que não estimula atuação quando a leitura do dispositivo permite, enquanto a proteção cobre casos em que a leitura interna se deslocou para o lado errado.

Com zona morta diferente de zero, `heat` e `cool` fixos usam o ciclo com memória acima, em vez de mudar direção no alvo central. Zona morta `0` preserva o cálculo histórico com sinal: a correção muda de sinal ao cruzar o alvo programado, sem reter fase de histerese.

Um alvo escalar compatível `auto` ou `heat_cool` também preserva o cálculo histórico com sinal. Dentro da zona morta, usa o alvo aceite mais próximo da leitura do dispositivo, sem forçar alternância ativa de aquecimento e arrefecimento. Um dispositivo com intervalo nativo `heat_cool` mantém ambos os limites do utilizador e recebe o intervalo assistido completo descrito abaixo.

<a id="device-hysteresis-and-minimum-run-time"></a>
## Histerese do dispositivo e tempo mínimo de funcionamento

O Room Assist controla o alvo enviado pelo Home Assistant. Não substitui a histerese do firmware, proteção do compressor, tempo mínimo de funcionamento nem a decisão de quando um alvo igual à leitura significa inatividade.

Por exemplo, um ciclo de aquecimento fixo em direção ao limite inferior envia um alvo que pretende desencorajar aquecimento até o sensor separado chegar à borda. Um dispositivo com histerese interna ampla ou tempo mínimo pode ainda iniciar ou continuar a aquecer temporariamente. O Velair não deduz uma margem de paragem não documentada específica do dispositivo nem consulta `hvac_action` para mudar a fase.

A proteção programada impede que o Velair mova o alvo para além da programação enquanto o sensor interno deriva; não promete paragem imediata do HVAC. Associação nativa de sensor separado ou calibração continua a ser a melhor opção quando disponível. Use um bloco `Off` quando precisar de paragem explícita em vez de manutenção controlada pelo termóstato.

O delta máximo deve permitir a correção inversa de que o dispositivo pode precisar. O editor mantém essa orientação visível abaixo do nome da configuração. Por exemplo:

```text
Thermostat stopping gap: 2.5 °C
Maximum assist delta:    2.0 °C  -> may be insufficient
Maximum assist delta:    3.0 °C  -> permits enough inverse correction
```

Definir `3 °C` não aplica imediatamente uma correção de `3 °C`. Apenas permite atingir esse valor quando a diferença medida pelo sensor ambiente separado exigir.

Esta definição limita a correção proporcional, não o alvo final após a proteção do alvo programado. A travagem opcional reforça essa proteção com o seu limite de um ou dois incrementos; não altera o delta máximo de assistência nem aplica todo o máximo em cada atualização.

<a id="why-climate-target-can-differ-from-the-calculation"></a>
### Por que o alvo da climatização pode diferir do cálculo

**Alvo enviado** é o valor informado pela entidade enquanto o Room Assist está pronto ou bloqueado. Quando está a ajudar ou mantendo um alvo escalar aplicado, mostra o valor temporário enviado pelo Velair. Nenhum dos dois é o alvo ambiente programado ou o limite ativo da histerese. Um dispositivo aceita alvos numa grelha própria, então o Velair pode precisar alinhar o valor final ao passo efetivo publicado, último comunicado, manual ou predefinido.

Por exemplo, em arrefecimento fixo pode calcular `23.9 °C` para um dispositivo com passos de `0.5 °C`. Aplica `24.0 °C`: arredonda para cima para não arrefecer mais agressivamente que o cálculo. Aquecimento fixo arredonda para baixo; modos automáticos escalares usam o passo mais próximo. Expanda o indicador **Alvo enviado** ou abra **Dados técnicos** para consultar o valor apresentado e os elementos disponíveis sobre o cálculo, o passo efetivo e o valor aplicado. Quando o alinhamento alterou o alvo confirmado, **Dados técnicos** mostra também o valor anterior ao alinhamento ao passo. Os limites físicos mínimo e máximo e a proteção do alvo programado são comunicados separadamente, sem serem descritos como alinhamento ao passo.

<a id="heatcool-range-example"></a>
## Exemplo de intervalo Aquecer/arrefecer

O Room Assist também aceita intervalos nativos `heat_cool`. Trata os alvos inferior e superior como um intervalo único de conforto e sempre os move juntos, mantendo a distância entre eles.

Cenário:

- Intervalo programado: `19–24 °C`
- Sensor ambiente: `18 °C`
- Temperatura atual do dispositivo: `22 °C`
- Delta máximo de assistência: `2 °C`
- Passo do dispositivo: `0.5 °C`

A divisão está `1 °C` abaixo do limite de aquecimento. O Velair posiciona o limite inferior `1 °C` acima da leitura do dispositivo e move o superior pela mesma distância:

```text
applied range = 23–28 °C
```

O dispositivo lê `22 °C`, portanto está abaixo do limite inferior aplicado e pode pedir aquecimento. Se a divisão depois superar `24 °C`, o Velair usa o superior da mesma forma para pedir arrefecimento. Ao entrar pela primeira vez no intervalo programado, incluindo a zona morta configurada nas bordas, posiciona o intervalo aplicado para que a leitura do dispositivo fique dentro dele. Depois, mantém esse intervalo estável enquanto o sensor ambiente separado permanece dentro do intervalo. Não acompanha movimentos posteriores do sensor interno, pois a sua leitura pode variar quando compressor, ventoinha, válvula ou radiador estão ativos.

O intervalo aplicado é sempre alinhado ao passo e deslocado como um todo ao atingir limites físicos. O Velair nunca ajusta Mín. e Máx. independentemente.

Se um alvo escalar ou intervalo calculado ultrapassar mínimo ou máximo aceites, o Velair aplica o resultado válido mais próximo. O gráfico identifica o limite atingido; **Dados técnicos** mostra o alvo escalar ou intervalo pedido e aplicado. O Home Assistant também cria uma notificação persistente para o limite ativo; atualizações repetidas não duplicam avisos, e o Velair remove a notificação após a recuperação.

<a id="when-velair-does-nothing"></a>
## Quando o Velair não atua

O Room Assist exige um passo efetivo válido e positivo. O Velair usa primeiro `target_temp_step` publicado pelo dispositivo. Na ausência dele, o último passo válido informado pela entidade protege a mesma grelha de alvos. Depois vem o valor alternativo manual por zona mostrado nas Definições, com predefinição `1` quando não há os anteriores. Guardar o campo com o atributo ausente torna esse valor explícito a referência, limpando a observação lembrada; uma nova informação válida volta a ser lembrada. O Velair não deduz relações com outra entidade.

O Room Assist não aplica alvo assistido quando:

- não há sensor ambiente selecionado;
- a assistência está desativada;
- o agendador não está no modo automático;
- o dispositivo está pausado ou com reforço;
- não há bloco ativo de temperatura;
- o bloco ativo é `Off`;
- o sensor ambiente ou temperatura do dispositivo está indisponível ou não é numérico;
- a mudança calculada é menor que o passo de temperatura do dispositivo;
- o modo HVAC não pode ser interpretado como aquecimento ou arrefecimento.

Nesses casos, o Velair mantém ou restaura o alvo programado normal quando isso é seguro.

<a id="external-adjustments-and-manual-adjustment"></a>
## Ajustes externos e Ajuste manual

Com a política predefinida **Manter automático**, o Room Assist mantém a autoridade, e o Velair recalcula e reaplica o alvo assistido atual após detetar uma alteração externa de alvo ou modo HVAC. Com qualquer política Manual, cede intencionalmente quando a alteração coloca o dispositivo em **Ajuste manual**. O Velair captura o estado externo completo no evento de mudança do Home Assistant, remove a correção ativa sem restaurar o alvo programado e preserva o alvo escalar externo ou intervalo nativo `heat_cool`. Isso evita uma disputa imediata com um cartão de climatização, controlo remoto físico ou outro ajuste fora do Velair.

Exemplo:

```text
Scheduled cooling target: 24 °C
Room Assist temporary target: 26 °C
External adjustment: 23 °C
Result during Manual adjustment: 23 °C
```

Ao retomar a programação Automática, o Velair resolve a intenção da programação ou Perfil válida naquele momento. O Room Assist pode calcular uma nova correção pelas leituras atuais; não revive a antiga correção de `26 °C` nem a fase de histerese fixa. Recarregar o Velair ou Home Assistant causa a mesma redefinição do estado de execução: o bloco atual é resolvido novamente e uma nova fase segura é escolhida pelo modo e leitura ambiente atuais.

Uma mudança externa elegível mantém a autoridade automática ou inicia/atualiza Ajuste manual conforme a política guardada para o dispositivo. Para políticas, serviços, interações com Reforço/Perfil e limites de atribuição, consulte [Alterações externas e Ajuste manual](manual-control.pt-pt.md).

<a id="planned-return"></a>
## Regresso planeado

Durante o [Regresso planeado](planned-return.pt-pt.md), o Room Assist segue o alvo temporário de chegada de cada zona assim que ela começa a preparação. Não continua a utilizar a temperatura do Modo Ausente nem volta a ela quando um bloco da programação de ausência muda. Outras zonas continuam a seguir Ausente até a sua própria preparação começar.

Por exemplo, um alvo de ausência de 16 graus torna-se um alvo de chegada de 21 graus quando a divisão começa a preparar. O Room Assist pode ajustar o alvo físico para chegar a 21 graus no sensor ambiente. Ajuste manual e pausas explícitas suspendna sua intervenção na zona afetada. Selecionar explicitamente um Modo/Perfil cancela a preparação antecipada do episódio e mantém a seleção. O controlo **Cancelar** do regresso também remove a preparação; após saída confirmada, restaura o Modo e Perfis anteriores registados. Consulte os [Exemplos de cancelamento](planned-return.pt-pt.md#cancelling-a-return-examples).

<a id="adaptive-preconditioning"></a>
## Pré-condicionamento adaptativo

Quando o pré-condicionamento adaptativo está ativado e antecipa um bloco futuro, o Room Assist segue esse alvo até o horário de conforto programado.

Isso importa porque o horário atual ainda pode pertencer a um bloco anterior. O Velair trata o bloco antecipado já iniciado como o alvo ativo gerido, portanto o Room Assist não recalcula pelo bloco anterior.

Com a assistência ativada, o pré-condicionamento adaptativo também usa o sensor ambiente selecionado como fonte efetiva de temperatura para decisões e aprendizagem.

Os deslocamentos opcionais separados para aquecimento e arrefecimento são configurados em Pré-condicionamento. O Room Assist calcula o alvo base a partir do objetivo original da divisão; depois, o Velair aplica o extra de preparação. Os limites do dispositivo reduzem o extra; os intervalos com duas temperaturas-alvo mantêm a largura. Um deslocamento positivo configurado mantém temporariamente a direção da preparação até ao limiar original da divisão, mesmo que o extra efetivo seja zero ou o Room Assist tenha herdado uma fase sem procura. Após esse limiar ou o início programado, o extra termina e retomam-se a histerese e a travagem habituais. Os intervalos nativos `heat_cool` mantêm as limitações existentes de suporte à travagem.

O Room Assist confirma a procura efetiva de aquecimento ou arrefecimento juntamente com o alvo aplicado. Durante a preparação, inclui o pedido temporário e mantém separadamente a fase habitual de histerese. O Fornecimento de climatização partilhado segue essa procura efetiva através da integração existente do Room Assist; não acrescenta outro deslocamento, histerese ou regra de preparação. Quando o extra termina, retoma-se a procura normal do Room Assist. Um comando falhado ou substituído não confirma um novo pedido, e uma reposição falhada não pode manter uma preparação já terminada a pedir fornecimento indefinidamente. Consulte [Fornecimento de climatização partilhado](shared-climate-supply.pt-pt.md#room-assist).

O gráfico separa o objetivo nominal do alvo final com Room Assist e preparação. O indicador de extra inclui um `0` devido a limitação; **Dados técnicos** distingue a base, o extra pedido, o efetivo e o comando final. Durante a preparação, o limiar **Preparação termina** tem um botão de informação que explica a margem de chegada configurada. Um alvo de `21 °C` com margem de chegada de `0.1 °C` termina a preparação de aquecimento em `20.9 °C`; esta margem é distinta do intervalo de controlo do Room Assist. Consulte [Deslocamento temporário do alvo](adaptive-preconditioning.pt-pt.md#temporary-setpoint-offset) para exemplos de aquecimento, arrefecimento e limites físicos.

<a id="automation-events"></a>
## Eventos de automação

Os eventos de atualização também podem incluir um objeto `braking` com os níveis configurado e efetivo, a fase ativa, as temperaturas efetivas de retirada e retoma, o limite do alvo e qualquer motivo de inatividade. Estes campos adicionais descrevem a política de procura confirmada, não a atividade física do equipamento. Consulte [Atualização do Room Sensor Assist](automation-events.pt-pt.md#room-sensor-assist-updated) para um exemplo.

O Velair emite o evento habitual `velair_event` do Home Assistant.

O Room Assist emite:

- `room_sensor_assist_state_changed`: a assistência foi ativada ou desativada.
- `room_sensor_assist_updated`: o Velair aplicou um alvo temporário assistido.
- `room_sensor_assist_restored`: o Velair deixou de gerir o alvo temporário e restaurou o alvo programado normal quando possível.

Consulte [Eventos de automação](automation-events.pt-pt.md#room-sensor-assist-state-changed) para os dados completos e todos os motivos de restauração.

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

Os quatro campos de histerese são opcionais. Nos eventos de automação, aparecem para um ciclo escalar fixo `heat` ou `cool` com banda morta não nula e não aparecem na correção antiga sem banda morta, nos modos automáticos escalares nem em qualquer faixa. Faixas fixas com referência configurada mostram a fase de histerese no estado em tempo real; seus eventos de automação mantêm os pares completos de limites e `range_shift`.

Uma atualização de intervalo usa os intervalos completos, programado e aplicado, em vez de campos escalares:

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

Exemplo de acionador de automação:

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

O mesmo gráfico em tempo real é utilizado no painel lateral e nos cartões. Os indicadores compactos **Divisão**, **Alvo**, **Equipamento** e **Alvo enviado** ligam-se verticalmente às respetivas posições de temperatura. Passe o ponteiro, coloque o foco ou prima um indicador para ver os detalhes. **Normal** mostra o pedido atual e o próximo limiar; **Detalhado** acrescenta a diferença entre a divisão e o objetivo, o ajuste total e qualquer extra de preparação já incluído nesse total. As legendas das medições ficam sobre as respetivas linhas quando há espaço e por baixo delas caso contrário.

Uma seta contínua representa um pedido de aquecimento ou arrefecimento. Uma seta tracejada representa espera e aponta para o limiar de retoma. Estas setas descrevem a procura do Room Assist, não uma tendência de temperatura medida nem uma confirmação de funcionamento da válvula ou do compressor. Quando a procura aceite está indisponível, o gráfico indica a incerteza em vez de inventar um pedido ou um estado de espera.

A faixa com trama imediatamente acima do eixo mantém a banda nominal de controlo e a respetiva legenda. Uma paragem efetiva por travagem é assinalada separadamente; a faixa não implica que a procura continue para além dessa paragem. O indicador do alvo enviado só identifica travagem quando a proteção alterou efetivamente o comando aplicado. Para um intervalo nativo `heat_cool`, marcadores separados em forma de parênteses retos mostram os intervalos completos do objetivo e do alvo aplicado, com trama nas margens externas do Room Assist. Os limites físicos estão identificados.

O gráfico mostra o pedido no seu indicador de estado, as leituras nos indicadores de temperatura e o limiar de paragem ou retoma junto à seta. Quando a falta de uma leitura da divisão impede desenhar essa relação, o limiar mantém-se no indicador de estado. **Explicação** abre um contexto breve abaixo do gráfico: a diferença entre as leituras dos sensores, por que motivo um ciclo continua após atingir o alvo de conforto ou qual preparação, travagem ou limite do equipamento afeta o ajuste. Acrescenta contexto sem repetir as temperaturas, o pedido ou a ajuda da banda de controlo já apresentados. O gráfico não tem outro resumo repetido por baixo.

**Dados técnicos** reúne as etapas do alvo do equipamento, os limites de controlo e a origem e os horários na mesma área de detalhes. As leituras mantêm-se no gráfico em vez de reaparecerem noutra tabela. Valores consecutivos de cálculo, pedido, antes do alinhamento ao passo e aplicação partilham uma linha quando coincidem, mantendo o nome de cada etapa; valores diferentes continuam separados. Os comandos de intervalo e os indícios da sua referência escalar continuam distintos. Os valores de paragem e retoma não são repetidos como próximo limiar ou limite nominal idêntico, e a direção do ciclo aparece sem repetir a sua temperatura. O passo do dispositivo e as proteções ou limites físicos relevantes continuam disponíveis. O extra de preparação tem um grupo próprio, incluindo valores pedido e aplicado quando diferem e um zero devido a limitação. Origem e horários mostra a entidade do sensor e o início do bloco com data, utilizando apenas a hora como alternativa quando a data não está disponível. Os grupos dispõem-se verticalmente em painéis e cartões estreitos. Só uma vista de detalhes fica aberta de cada vez; selecione novamente o seu botão ou prima Escape para a fechar. Os botões funcionam com teclado e toque, e os detalhes ficam abaixo do gráfico sem cobrir outros controlos. Abrir ou fechar detalhes não altera o pedido de controlo. O gráfico adapta-se a colunas estreitas sem alterar a escala de temperatura nem afastar uma leitura da sua posição real.

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

Opções `show_room_assist_*` omitidas têm o valor predefinido `true`.

<a id="technical-details"></a>
## Detalhes técnicos

Detalhes para programadores sobre campos de armazenamento, estado durante a execução, cálculo do alvo assistido, restauração e eventos estão em [Funcionamento interno do Room Assist](../developer/room-assist.md).
