<a id="room-assist"></a>
# Room Assist
<!-- velair-docs:start -->
Traduções: [Original em inglês](room-assist.md) · [Español](room-assist.es.md) · [Français](room-assist.fr.md) · [Deutsch](room-assist.de.md) · [Italiano](room-assist.it.md) · [Nederlands](room-assist.nl.md) · [Polski](room-assist.pl.md) · [Português (Brasil)](room-assist.pt-br.md) · [Português (Portugal)](room-assist.pt-pt.md) · [Русский](room-assist.ru.md) · [Status das traduções](../translation-status.md)

<details>
<summary>Status desta tradução</summary>

| Informação | Status |
| --- | --- |
| Versão de referência | 1.9.3-beta.5 |
| Última sincronização | 2026-11-25 |
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

Para um alvo único em `heat` ou `cool` fixo, uma zona morta diferente de zero cria dois limites de comutação. Com a frenagem **Padrão**, o Room Assist lembra qual limite está buscando e só muda de direção quando o sensor ambiente separado atinge o limite oposto. Isso cria um ciclo real de histerese baseado no sensor separado, em vez de permitir que o sensor interno inicie outro ciclo perto do alvo central. O delta máximo de assistência limita a correção com sinal calculada a partir do limite ativo. Os níveis opcionais de frenagem retiram a demanda com mais firmeza; **Alta** inicia essa retirada no alvo programado, em vez de esperar pelo limite de comutação mais distante.

Alvos escalares de `auto` e `heat_cool` e faixas nativas de `heat_cool` mantêm seu comportamento neutro ou de margem da faixa. O Velair não força esses modos a alternar aquecimento e resfriamento ativos em um ciclo escalar de histerese.

A entidade de climatização continua sendo o atuador. O Velair não cria uma entidade virtual nem contorna o firmware. Se o termostato ou válvula aceita vincular diretamente um sensor separado, essa opção nativa costuma continuar sendo a melhor primeira escolha.

Para dois alvos em `heat` ou `cool` fixo, selecione primeiro **Alvo de referência** para o dispositivo e modo em **Configurações → Dispositivos de climatização e grupos**. Escolha **Alvo inferior** ou **Alvo superior** conforme o valor realmente usado pelo equipamento nesse modo; o Velair não deduz isso da capacidade de usar faixas. A seleção é compartilhada com Pré-condicionamento adaptativo.

O Room Assist usa o limite escolhido como alvo fixo de aquecimento ou resfriamento, incluindo o ciclo de histerese escalar e a proteção do alvo programado. Desloca ambos os alvos pelo mesmo valor, preservando sua separação. Ambos os limites devem respeitar o incremento e os limites físicos do dispositivo; por isso o outro limite pode restringir a correção disponível. As informações sobre limites físicos continuam disponíveis no gráfico e em **Dados técnicos**.

Com **Não configurado**, pares em modo fixo são entregues sem alteração nem correção do Room Assist. Faixas em `auto` continuam sem assistência; bandas nativas `heat_cool` mantêm o comportamento existente. Os ajustes salvos do Room Assist são mantidos. Mudar a referência ou o modo elimina a assistência obsoleta sem restaurar um alvo corrigido antigo sobre a nova intenção.

<a id="setup"></a>
## Configuração

1. Abra a aba Room Assist.
2. Expanda o dispositivo que deseja configurar.
3. Em **Assistente de Sensor de Ambiente**, escolha **Sensor fixo** ou **Por horário**, configure a opção escolhida e salve qualquer mudança de modalidade.
4. Habilite a assistência com sensor ambiente.
5. Ajuste a banda morta do Room Assist para os limites inferior e superior em aquecimento ou resfriamento fixo ao redor do alvo escalar ou referência de faixa selecionada, ou a margem neutra em modos automáticos escalares e bandas nativas `heat_cool`.
6. Ajuste o Delta de assistência máxima se o padrão for pequeno demais para o cômodo ou menor que a diferença de temperatura definida de que o termostato precisa para interromper o aquecimento ou a refrigeração.
7. Opcionalmente, escolha **Frenagem: Moderada** ou **Alta** para retirar a demanda com mais firmeza. Esses níveis exigem uma zona morta do Room Assist maior que zero. **Padrão** mantém o comportamento existente.
8. Opcionalmente, defina **Margem mínima de controle** se correções pequenas não fizerem o termostato responder. Aumente primeiro o Delta de assistência máxima, se necessário; a margem não pode ultrapassá-lo. Deixe a margem em `0` para manter o comportamento atual.
9. Ajuste o atraso de atualização se as atualizações do sensor parecerem lentas ou frequentes demais.

Apenas a opção selecionada é mostrada. Quando **Sensor fixo** já é a modalidade salva, a alteração do seu sensor é salva imediatamente. Alternar entre **Sensor fixo** e **Por horário** muda um rascunho: **Salvar** aplica a modalidade e suas configurações, e **Cancelar** restaura a configuração salva. O sensor fixo e a programação salva são mantidos ao alternar; os dois não são ativados ao mesmo tempo.


<a id="optional-braking"></a>

### Frenagem opcional

A frenagem altera o alvo enviado ao equipamento, mantendo a temperatura programada como o alvo real do cômodo. Está disponível em **Aquecimento** e **Refrigeração** fixos, incluindo dispositivos de dois alvos com um alvo de referência configurado. Não altera modos automáticos de alvo único nem faixas nativas `heat_cool`.

**T** é o alvo programado, **H** a zona morta do Room Assist e **S** o incremento efetivo de alvo do equipamento:

| Frenagem | Aquecimento: retirar demanda | Aquecimento: solicitar calor novamente | Refrigeração: retirar demanda | Refrigeração: solicitar refrigeração novamente |
| --- | --- | --- | --- | --- |
| Padrão | Comportamento existente | Comportamento existente | Comportamento existente | Comportamento existente |
| Moderada | Em T + H | Em T − H | Em T − H | Em T + H |
| Alta | Em T | Em T − H | Em T | Em T + H |

Durante a retirada, **Moderada** limita o alvo de aquecimento a no máximo **T − S**, ou o de refrigeração a no mínimo **T + S**. **Alta** usa **dois incrementos** por padrão. Se o cálculo existente já retira mais demanda, o Velair mantém esse resultado mais forte. São limites fixos enquanto a frenagem está ativa: atualizações do sensor não continuam somando ou subtraindo mais um incremento.

Para alterar a intensidade da frenagem Alta em uma zona, abra **Configurações → Dispositivos de climatização e grupos** e ajuste **Passos da frenagem Alta** para esse dispositivo ou grupo. O ajuste aceita números inteiros de `2` a `10` e mostra a diferença de temperatura equivalente usando o passo efetivo da temperatura definida do equipamento e a unidade atual. Ele é salvo de forma independente para cada zona e se aplica somente quando **Alta** está selecionada no Room Assist. **Padrão** e **Moderada** não usam esse ajuste.

Por exemplo, `3` passos de `0.5 °C` cada equivalem a uma diferença de `1.5 °C`. Três passos de `1 °F` cada equivalem a `3 °F`. A quantidade de passos não é uma temperatura e não muda na conversão entre Celsius e Fahrenheit; a diferença equivalente acompanha o passo efetivo do equipamento. O Room Assist mantém o seletor existente e mostra a quantidade configurada e a diferença equivalente.

Por exemplo, com alvo de aquecimento de `20.5 °C`, zona morta de `0.5 °C` e incremento do equipamento de `0.5 °C`:

- **Moderada** retira demanda em `21 °C`, com alvo do equipamento não superior a `20 °C`.
- **Alta**, com os dois passos padrão, retira demanda em `20.5 °C`, com alvo não superior a `19.5 °C`.
- Com **Passos da frenagem Alta** em `3`, Alta continua retirando demanda em `20.5 °C`, mas o alvo do equipamento não ultrapassa `19 °C`.
- Ambas solicitam calor novamente quando o sensor externo atinge `20 °C`.

Alterar a quantidade de passos de Alta muda o limite da temperatura definida, sem alterar a temperatura de retirada ou reativação. Na refrigeração, o limite correspondente fica acima do alvo programado, em vez de abaixo dele. O ajuste é fixo e não aumenta progressivamente enquanto a temperatura do cômodo permanece fora da faixa.

Antes da retirada, o cálculo de assistência existente permanece inalterado. A frenagem continua ativa até atingir o limite de reativação, mesmo quando o cômodo cruza o alvo central. Se a assistência inicia ou reinicia com o cômodo já dentro da faixa, mantém a inicialização prudente existente sem iniciar deliberadamente um ciclo de climatização.

O estado em tempo real mostra as temperaturas efetivas de retirada e reativação. O gráfico mantém a zona morta nominal visível e diferencia os limites efetivos de frenagem. A demanda do fornecimento compartilhado segue a mesma fase confirmada.

Escolha **Padrão** antes de definir a zona morta como zero. O nível salvo é mantido quando o modo ou a referência de temperatura atual não permite usá-lo, e o estado explica por que a frenagem adicional está inativa. Combinações salvas inválidas suspendem a frenagem adicional em vez de alterar silenciosamente a zona morta.

Os alvos físicos mínimo e máximo podem limitar a frenagem disponível. Com dois alvos, o par completo se move junto e qualquer limite pode restringir o deslocamento. **Dados técnicos** distingue o resultado solicitado do aplicado e o gráfico identifica o limite atingido.

A frenagem reduz a solicitação de aquecimento ou refrigeração; não confirma que válvula, compressor ou termostato pararam. O controle do equipamento, os tempos mínimos de funcionamento e a inércia térmica ainda podem causar ultrapassagem. Este ajuste não aprende ciclos nem retira demanda antes do alvo programado. Valide-o com ciclos reais antes de confiar em um nível para um cômodo específico.

As exportações portáveis usam o modelo **30** para preservar a quantidade de passos da frenagem Alta, o nível de frenagem, os deslocamentos de preparação e a margem mínima de controle. Importações antigas compatíveis sem uma quantidade de passos de Alta usam `2`. Mantenha um backup da versão anterior se precisar voltar a ela; versões antigas do Velair não podem importar o modelo 30.

<a id="minimum-control-margin"></a>
### Margem mínima de controle

Alguns termostatos precisam de uma diferença considerável entre a temperatura
interna e a temperatura definida solicitada antes de responder. Um sensor montado
no radiador pode indicar vários graus acima do cômodo enquanto o sensor ambiente
externo ainda solicita calor. **Margem mínima de controle** solicita pelo menos
essa diferença durante uma correção aplicável do Room Assist. É opcional e seu
valor padrão é `0`.

Esses ajustes têm funções diferentes:

| Ajuste | Função |
| --- | --- |
| Zona morta Room Assist | Determina a banda de comutação ou neutra do sensor ambiente externo. |
| Margem mínima de controle | Reforça uma correção aplicável em relação à leitura interna do termostato. |
| Delta de assistência máxima | Limita essa correção; aumentar apenas o máximo não solicita uma correção maior. |
| Frenagem | Altera os limiares de retirada de demanda e acrescenta proteção do alvo programado. |

A margem aceita `0–10 °C` (`0–18 °F`) e não pode ultrapassar o Delta de
assistência máxima. Se os ajustes entrarem em conflito, o Velair pede que você
aumente primeiro o máximo ou reduza a margem. Nenhum dos valores é alterado
automaticamente. Os incrementos do campo seguem o passo efetivo de temperatura
definida do equipamento.

Por exemplo, configure um alvo de aquecimento de `19.5 °C`, zona morta de
`±0.3 °C`, frenagem **Padrão** e margem e máximo em `10 °C`. Com leitura
interna de `21.5 °C` e passo de temperatura definido compatível de `0.5 °C`:

| Sensor ambiente externo | Fase do Room Assist | Temperatura definida solicitada ao equipamento |
| --- | --- | --- |
| Em ou abaixo de `19.2 °C` | Solicitar calor em direção a `19.8 °C` | `31.5 °C`: leitura interna + 10 |
| Subindo pela banda | Continuar solicitando calor | Leitura interna atual + 10 |
| Atinge `19.8 °C` | Retirar calor até `19.2 °C` | `11.5 °C`: leitura interna − 10 |

A leitura interna pode mudar, então as solicitações seguintes usam seu valor
atual. O alvo ambiente continua em `19.5 °C`; as temperaturas elevadas ou baixas
definidas no equipamento não ampliam a banda de conforto do cômodo. A frenagem
Moderada ou Alta conserva seus próprios limiares de parada e retomada e mantém
um resultado de retirada que já seja mais forte.

A refrigeração fixa funciona no sentido oposto. Para alvo de `24 °C`, zona
morta de `±0.3 °C`, leitura interna de `26 °C` e margem/máximo de `10 °C`,
o Room Assist solicita `16 °C` enquanto é necessário refrigerar e solicita
`36 °C` quando o cômodo atinge `23.7 °C`, antes de aplicar os limites do
dispositivo. A refrigeração é retomada em `24.3 °C`. Com zona morta zero e
sem fase retida, somente correções diferentes de zero são reforçadas; na
igualdade, o resultado permanece neutro.

Modos automáticos escalares e faixas nativas de **Aquecimento/Refrigeração**
reforçam apenas solicitações ativas de aquecimento ou refrigeração. Dentro da
banda neutra do cômodo, mantêm o comportamento de manutenção existente. Reduzir
muito a temperatura definida para interromper o aquecimento poderia iniciar a
refrigeração em um dispositivo bidirecional. Nas faixas nativas, ambos os
limites se movem juntos e conservam a separação original. Pares em modo fixo
usam sua temperatura de referência configurada; configurações de faixa sem
suporte continuam sem suporte.

Os passos e limites físicos do dispositivo podem impedir a margem solicitada.
Por exemplo, com leitura interna de `21.7 °C`, margem/máximo de `10 °C` e
grade de `0.5 °C`, não existe um ponto da grade exatamente `10 °C` distante.
O Velair escolhe uma correção válida dentro do máximo quando possível e informa
que o passo limita a margem. Com duas temperaturas definidas, preservar a largura
da faixa pode restringir ainda mais o movimento. A explicação ao vivo e os
**Dados técnicos** identificam uma margem ativa ou limitada.

A proteção do alvo programado, a frenagem e os deslocamentos temporários de
preparação podem gerar um deslocamento final maior que o Delta de assistência
máxima. Esse ajuste limita a correção do Room Assist, não cada proteção ou
extra temporário aplicado depois. Durante a preparação, a margem segue a
direção de preparação atual antes de acrescentar o extra.

Este recurso solicita uma diferença de temperatura definida. Não confirma
abertura física da válvula, operação do compressor ou parada imediata. Use a
menor margem que funcione no seu equipamento e verifique ciclos reais completos
de aquecimento ou refrigeração.

<a id="optional-sensor-schedule-beta"></a>

### Programação opcional de sensores (beta)

Room Assist pode usar referências de temperatura diferentes durante a semana sem alterar suas programações de temperatura, perfis ou modos. Escolha **Por horário** em **Assistente de Sensor de Ambiente** para configurá-las. Escolha **Sensor fixo** para voltar ao sensor ambiente fixo.

Escolha uma referência padrão e adicione períodos com dias da semana, horários de início e fim e uma referência. Salve o rascunho completo para aplicá-lo; Cancelar descarta as alterações. As referências podem ser sensores de temperatura disponíveis no Home Assistant ou a temperatura própria do dispositivo de climatização. Fora dos períodos, aplica-se a referência padrão. Os períodos podem atravessar a meia-noite e pertencem aos dias de início selecionados; sobreposições são rejeitadas. O horário de início está incluído e o de fim está excluído. Os horários seguem o fuso configurado no Home Assistant.

Por exemplo, escolha **Sem correção do Room Assist** como padrão e um sensor do escritório das 08:00 às 17:00, de segunda a sexta. Suas programações de temperatura de verão/inverno continuam determinando a temperatura desejada. Durante o expediente, Room Assist calcula as correções usando o sensor do escritório. Fora desse horário, Velair envia o alvo programado normal e o termostato regula usando sua própria referência. Isso não muda qual sensor físico o firmware do dispositivo usa internamente.

O único interruptor do Room Assist controla se a assistência está ativa. Desligá-lo mantém as duas configurações salvas. Escolher **Sensor fixo** e salvar restaura o sensor ambiente fixo mantido. Se uma referência externa estiver indisponível, Velair suspende a correção e usa o alvo programado normal quando detém o controle automático; não escolhe outro cômodo silenciosamente nem reutiliza uma leitura antiga. A assistência é retomada quando essa referência volta a ser utilizável.

As mudanças de referência não retiram o controle do ajuste manual, do Boost ou das pausas. Quando o controle automático é retomado, Velair usa a referência válida naquele momento. Nos grupos de cômodo, a temperatura própria do dispositivo corresponde à referência de temperatura configurada para o grupo.

**Limitação da beta:** uma referência muda exatamente no horário programado. O pré-condicionamento adaptativo não inicia um alvo antecipado que atravesse uma mudança de referência; ele recalcula após essa transição. Trocar de cômodo não é uma solicitação para preparar o próximo cômodo antes. As observações de aprendizado são associadas à sua fonte de temperatura para que um salto de leitura entre cômodos não seja interpretado como aquecimento ou resfriamento.

Todas as leituras externas selecionadas precisam estar disponíveis de forma independente no Home Assistant. Para Nest, uma configuração com a integração oficial para o termostato e outra integração para um sensor remoto precisa ser testada na instalação. Mantenha fixa a referência própria do Nest se pretende usar a leitura do termostato como referência estável de um cômodo. Velair não seleciona o sensor ativo interno do Nest. Um sistema HVAC compartilhado continua afetando todos os cômodos atendidos; escolher uma referência não cria zonas físicas independentes.

<a id="room-groups"></a>
### Grupos de cômodo

Escolha o grupo no Room Assist e use os mesmos controles de sensor, habilitação, banda morta, correção máxima e atualização. A temperatura própria vem do membro escolhido em **Grupos de cômodo → Referência de temperatura**; o sensor externo opcional é configurado aqui. Desabilitar ou limpar o Room Assist devolve a medição efetiva à temperatura desse membro.

O grupo tem uma configuração e correção compartilhadas do Room Assist, não um controlador independente por membro. O Velair mantém o alvo programado do cômodo e envia o comando corrigido pelo modo de envio existente: todos os membros por padrão ou o destinatário explicitamente escolhido quando a instalação já propaga os comandos. As verificações de capacidade, incremento e limites de temperatura continuam sendo aplicadas aos destinatários reais. Os membros continuam individualmente visíveis na Visão geral.

A assistência com sensor ambiente não exige pré-condicionamento adaptativo. Pode funcionar em blocos normais e em blocos antecipados pelo pré-condicionamento.

Um bloco de temperatura com **Manter o modo atual** ainda aplica seu alvo programado. O Room Assist usa o modo realmente ativo; se o dispositivo estiver desligado, o Velair o inicia em um modo compatível. **Manter o modo atual** não significa «manter o alvo do termostato inalterado» em um bloco de temperatura. Um bloco apenas de opções não tem alvo, então o Room Assist não atua nele.

O atraso de atualização agrupa mudanças próximas do sensor ambiente ou temperatura do dispositivo antes de recalcular. O padrão é `20` segundos. Defina `0` para recálculo imediato ou até `300` segundos para agrupar atualizações frequentes.

A zona morta do Room Assist é independente do delta mínimo do pré-condicionamento adaptativo. O padrão é `0.3 °C` ou `1 °F`; aceita `0` para desabilitar e passos de `0.1` grau até `5 °C` ou `9 °F`. Salvar com o Room Assist ativo atualiza imediatamente o alvo assistido.

O gráfico em tempo real desenha a zona morta nominal como uma faixa fina hachurada logo acima do eixo de temperatura, com legenda correspondente abaixo. Os limites efetivos de parada e retomada vêm do estado de controle confirmado; por isso **Alta** pode retirar a demanda no alvo enquanto toda a faixa nominal continua visível. Em modos automáticos escalares, a faixa representa a margem neutra. Faixas nativas `heat_cool` recebem hachura apenas nas margens externas junto à faixa nominal, com a legenda **Margem externa**. Uma zona morta zero não desenha área hachurada; a legenda mostra a margem zero configurada. Esses indicadores descrevem limites configurados, não movimento dos sensores. Ocultar `show_room_assist_deadband` em um cartão Lovelace oculta juntos a configuração, a faixa e a legenda.

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
| **Mantendo** | Mantém neutro um alvo automático escalar, mantém uma faixa nativa `heat_cool` ou a proteção mantém o alvo do lado seguro. Um ciclo fixo `heat` ou `cool` pode continuar **Ajudando** ao atravessar a zona morta. |
| **Bloqueado** | Pausa, Reforço, estado Manual ou outro estado do agendador tem prioridade. |
| **Indisponível** | O dispositivo ou a capacidade necessária de alvo não pode ser usada agora. A interface mostra o motivo quando conhecido. |

Quando ativo, Visão geral resume em **Em direção ao limite inferior**, **Em direção ao limite superior**, **Ativo**, **Mantendo** ou **Proteção agendada**, conforme o caso, mostrando valores programados e aplicados. Mínimo ou máximo do termostato difere de proteção programada: o gráfico identifica o limite físico atingido, **Dados técnicos** separa os valores solicitados e aplicados, e o Home Assistant recebe uma notificação persistente até resolver o limite físico.

<a id="fixed-heating-hysteresis-example"></a>
## Exemplo de histerese de aquecimento fixo

Cenário com frenagem **Padrão**:

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

Quando essa proteção muda o resultado, o estado em tempo real explica os dois valores. Identifica o alvo calculado e o efetivamente mantido, e Visão geral mostra o estado compacto `Proteção agendada`. É um comportamento protetor normal, não erro de termostato, portanto não cria notificação persistente. Os limites físicos continuam identificados no gráfico e em **Dados técnicos**, com sua notificação separada.

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

Cenário com frenagem **Padrão**:

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

Com a Margem mínima de controle em `0`, definir `3 °C` não aplica imediatamente uma correção de `3 °C`. Apenas permite atingir esse valor quando a diferença medida pelo sensor ambiente separado exigir.

Este ajuste limita a correção proporcional, não o alvo final após a proteção do alvo programado. A frenagem opcional reforça essa proteção com seu limite de um ou dois incrementos; não altera o delta máximo de assistência nem aplica todo o máximo em cada atualização. Uma [Margem mínima de controle](#minimum-control-margin) diferente de zero pode solicitar uma correção maior mesmo quando a diferença de temperatura externa é pequena.

<a id="why-climate-target-can-differ-from-the-calculation"></a>
### Por que o alvo da climatização pode diferir do cálculo

**Alvo enviado** é o valor informado pela entidade enquanto o Room Assist está pronto ou bloqueado. Quando está ajudando ou mantendo um alvo escalar aplicado, mostra o valor temporário enviado pelo Velair. Nenhum dos dois é o alvo ambiente programado ou o limite ativo da histerese. Um dispositivo aceita alvos em uma grade própria, então o Velair pode precisar alinhar o valor final ao passo efetivo publicado, último informado, manual ou padrão.

Por exemplo, em resfriamento fixo pode calcular `23.9 °C` para um dispositivo com passos de `0.5 °C`. Aplica `24.0 °C`: arredonda para cima para não resfriar mais agressivamente que o cálculo. Aquecimento fixo arredonda para baixo; modos automáticos escalares usam o passo mais próximo. Expanda o indicador **Alvo enviado** ou abra **Dados técnicos** para conferir o valor mostrado e as evidências disponíveis de cálculo, passo efetivo e valor aplicado. Quando o alinhamento alterou o alvo confirmado, **Dados técnicos** também mostra o valor anterior ao alinhamento ao passo. Os limites físicos mínimo e máximo e a proteção do alvo programado são informados separadamente, sem serem descritos como alinhamento ao passo.

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

Se um alvo escalar ou faixa calculado ultrapassar mínimo ou máximo aceitos, o Velair aplica o resultado válido mais próximo. O gráfico identifica o limite atingido; **Dados técnicos** mostra o alvo escalar ou faixa solicitado e aplicado. O Home Assistant também cria uma notificação persistente para o limite ativo; atualizações repetidas não duplicam avisos, e o Velair remove a notificação após a recuperação.

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

Deslocamentos opcionais separados para aquecimento e resfriamento são configurados em Pré-condicionamento. O Room Assist calcula seu alvo base a partir do objetivo original do cômodo; depois o Velair aplica o extra de preparação. Os limites do dispositivo reduzem o extra; faixas com dois limites mantêm sua largura. Um deslocamento positivo configurado mantém temporariamente a direção da preparação até o limite original de temperatura do cômodo, mesmo se o extra efetivo for zero ou o Room Assist herdou uma fase sem demanda. Após esse limite ou o início programado, o extra termina e a histerese e a frenagem habituais voltam a valer. As faixas nativas `heat_cool` mantêm suas limitações existentes de suporte à frenagem.

O Room Assist confirma sua demanda efetiva de aquecimento ou resfriamento junto com o alvo aplicado. Durante a preparação, inclui a solicitação temporária e mantém separadamente sua fase habitual de histerese. O Fornecimento de climatização compartilhado segue essa demanda efetiva pela integração existente do Room Assist; não acrescenta outro deslocamento, histerese ou regra de preparação. Quando o extra termina, a demanda normal do Room Assist retorna. Um comando que falhou ou foi substituído não confirma uma nova solicitação, e uma restauração malsucedida não pode manter a preparação encerrada solicitando fornecimento indefinidamente. Consulte [Fornecimento de climatização compartilhado](shared-climate-supply.pt-br.md#room-assist).

O gráfico separa o objetivo nominal do alvo final com Room Assist e preparação. Seu indicador de extra inclui um `0` por limitação; **Dados técnicos** separa a base, o extra solicitado, o efetivo e o comando final. Durante a preparação, o limite **Preparação termina** tem um botão de informação que explica a margem de chegada configurada. Um alvo de `21 °C` com margem de chegada de `0.1 °C` termina a preparação de aquecimento em `20.9 °C`; essa margem é separada da faixa de controle do Room Assist. Consulte [Deslocamento temporário do alvo](adaptive-preconditioning.pt-br.md#temporary-setpoint-offset) para exemplos de aquecimento, resfriamento e limites físicos.

<a id="automation-events"></a>
## Eventos de automação

Os eventos de atualização também podem incluir um objeto `braking` com os níveis configurado e efetivo, a fase ativa, as temperaturas efetivas de retirada e retomada, o limite do alvo e qualquer motivo de inatividade. Esses campos adicionais descrevem a política de demanda confirmada, não a atividade física do equipamento. Veja [Atualização do Room Sensor Assist](automation-events.pt-br.md#room-sensor-assist-updated) para um exemplo.

O Velair emite o evento padrão `velair_event` do Home Assistant.

O Room Assist emite:

- `room_sensor_assist_state_changed`: a assistência foi habilitada ou desabilitada.
- `room_sensor_assist_updated`: o Velair aplicou um alvo temporário assistido.
- `room_sensor_assist_restored`: o Velair deixou de gerenciar o alvo temporário e restauraçãou o alvo programado normal quando possível.

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

Os quatro campos de histerese são opcionais. Nos eventos de automação, aparecem para um ciclo escalar fixo `heat` ou `cool` com banda morta não nula e não aparecem na correção antiga sem banda morta, nos modos automáticos escalares nem em qualquer faixa. Faixas fixas com referência configurada mostram a fase de histerese no estado ao vivo; seus eventos de automação mantêm os pares completos de limites e `range_shift`.

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

O mesmo gráfico em tempo real é usado no painel lateral e nos cartões. Indicadores compactos **Cômodo**, **Alvo**, **Equipamento** e **Alvo enviado** se conectam verticalmente às respectivas posições de temperatura. Passe o ponteiro, dê foco ou pressione um indicador para ver detalhes. **Normal** mostra a solicitação atual e o próximo limite; **Detalhado** acrescenta a diferença entre cômodo e objetivo, o ajuste total e qualquer extra de preparação já incluído nesse total. As legendas das medições ficam sobre suas linhas quando há espaço e abaixo delas caso contrário.

Uma seta contínua representa aquecimento ou resfriamento solicitado. Uma seta tracejada representa espera e aponta para o limite de retomada. Essas setas descrevem a demanda do Room Assist, não uma tendência medida de temperatura nem prova de funcionamento de válvula ou compressor. Quando a demanda aceita está indisponível, o gráfico informa a incerteza em vez de inventar uma solicitação ou um estado de espera.

A faixa hachurada logo acima do eixo mantém a banda nominal de controle e sua legenda. Uma parada efetiva por frenagem é marcada separadamente; a faixa não implica que a demanda continue além dela. O indicador de alvo enviado só identifica frenagem quando sua proteção realmente mudou o comando aplicado. Para uma faixa nativa `heat_cool`, colchetes separados mostram as faixas completas do objetivo e do alvo aplicado, com hachura nas margens externas do Room Assist. Os limites físicos são identificados.

O gráfico mostra a solicitação em seu indicador de estado, as leituras nos indicadores de temperatura e o limite de parada ou retomada ao lado da seta. Quando a ausência de uma leitura do cômodo impede desenhar essa relação, o limite permanece no indicador de estado. **Explicação** abre um contexto breve abaixo do gráfico: a diferença entre as leituras dos sensores, por que um ciclo continua após atingir o alvo de conforto ou qual preparação, frenagem ou limite do equipamento afeta o ajuste. Acrescenta contexto sem repetir as temperaturas, a solicitação ou a ajuda da banda de controle já mostradas. O gráfico não tem outro resumo repetido abaixo dele.

**Dados técnicos** reúne as etapas do alvo do equipamento, os limites de controle e a origem e os horários na mesma área de detalhes. As leituras permanecem no gráfico em vez de reaparecerem em outra tabela. Valores consecutivos de cálculo, solicitação, antes do alinhamento ao passo e aplicação compartilham uma linha quando coincidem, mantendo o nome de cada etapa; valores diferentes permanecem separados. Os comandos de faixa e as evidências de sua referência escalar continuam distintos. Os valores de parada e retomada não são repetidos como próximo limite ou limite nominal idêntico, e a direção do ciclo aparece sem repetir sua temperatura. O incremento do dispositivo e as proteções ou limites físicos relevantes continuam disponíveis. O extra de preparação tem um grupo próprio, incluindo valores solicitado e aplicado quando diferem e um zero devido a limitação. Origem e horários mostra a entidade do sensor e o início do bloco com data, usando apenas o horário como alternativa quando a data não está disponível. Os grupos se empilham em painéis e cartões estreitos. Apenas uma visualização de detalhes fica aberta por vez; selecione seu botão novamente ou pressione Escape para fechá-la. Os botões funcionam com teclado e toque, e os detalhes ficam abaixo do gráfico sem cobrir outros controles. Abrir ou fechar detalhes não altera a solicitação de controle. O gráfico se adapta a colunas estreitas sem mudar a escala de temperatura nem deslocar uma leitura de sua posição real.

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
