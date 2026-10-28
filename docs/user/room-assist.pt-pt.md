<a id="room-assist"></a>
# Room Assist
<!-- velair-docs:start -->
Traduções: [Original em inglês](room-assist.md) · [Español](room-assist.es.md) · [Français](room-assist.fr.md) · [Deutsch](room-assist.de.md) · [Italiano](room-assist.it.md) · [Nederlands](room-assist.nl.md) · [Polski](room-assist.pl.md) · [Português (Brasil)](room-assist.pt-br.md) · [Português (Portugal)](room-assist.pt-pt.md) · [Русский](room-assist.ru.md) · [Estado das traduções](../translation-status.md)

<details>
<summary>Estado desta tradução</summary>

| Informação | Estado |
| --- | --- |
| Versão de referência | 1.9.0-beta.6 |
| Última sincronização | 2026-10-28 |
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

Para um alvo único em `heat` ou `cool` fixo, uma zona morta diferente de zero cria dois limites de comutação. O Room Assist guarda qual é o limite para o qual se dirige e só muda de direção quando o sensor ambiente separado atinge o limite oposto. Isto cria um ciclo real de histerese baseado no sensor separado, em vez de permitir que o sensor interno inicie outro ciclo perto do alvo central. O delta máximo de assistência limita a correção com sinal calculada a partir do limite ativo.

Alvos escalares de `auto` e `heat_cool` e intervalos nativos de `heat_cool` mantêm o seu comportamento neutro ou de margem do intervalo. O Velair não força esses modos a alternar aquecimento e arrefecimento ativos num ciclo escalar de histerese.

A entidade de climatização continua a ser o atuador. O Velair não cria uma entidade virtual nem contorna o firmware. Se o termóstato ou válvula permite associar diretamente um sensor separado, essa opção nativa continua normalmente a ser a melhor primeira escolha.

Para dois alvos em `heat` ou `cool` fixo, selecione primeiro **Alvo de referência** para o dispositivo e modo em **Definições → Dispositivos de climatização e grupos**. Escolha **Alvo inferior** ou **Alvo superior** conforme o valor realmente usado pelo equipamento nesse modo; o Velair não deduz isso da capacidade de usar faixas. A seleção é partilhada com Pré-condicionamento adaptativo.

O Room Assist usa o limite escolhido como alvo fixo de aquecimento ou arrefecimento, incluindo o ciclo de histerese escalar e a proteção do alvo programado. Desloca ambos os alvos pelo mesmo valor, preservando sua separação. Ambos os limites devem respeitar o incremento e os limites físicos do dispositivo; por isso o outro limite pode restringir a correção disponível. Os avisos de limitação existentes continuam valendo.

Com **Não configurado**, pares em modo fixo são entregues sem alteração nem correção do Room Assist. Faixas em `auto` continuam sem assistência; bandas nativas `heat_cool` mantêm o comportamento existente. Os ajustes guardados do Room Assist são mantidos. Mudar a referência ou o modo elimina a assistência obsoleta sem restaurar um alvo corrigido antigo sobre a nova intenção.

<a id="setup"></a>
## Configuração

1. Abra o separador Room Assist.
2. Expanda o dispositivo que deseja configurar.
3. Selecione um sensor de temperatura da divisão.
4. Habilite a assistência com sensor ambiente.
5. Ajuste a banda morta do Room Assist para os limites inferior e superior em aquecimento ou arrefecimento fixo ao redor do alvo escalar ou referência de faixa selecionada, ou a margem neutra em modos automáticos escalares e bandas nativas `heat_cool`.
6. Ajuste o delta máximo de assistência se o predefinição for pequeno ou grande demais para a divisão.
7. Opcionalmente, ajuste a reavaliação periódica de segurança. Use `0` para desabilitá-la.

Apenas selecionar um sensor ambiente guarda a escolha. O Velair só passa a utilizá-lo como temperatura ambiente efetiva quando a assistência está ativada.

<a id="room-groups"></a>
### Grupos de divisão

Escolha o grupo no Room Assist e use os mesmos controlos de sensor, habilitação, banda morta, correção máxima e atualização. A temperatura própria vem do membro escolhido em **Grupos de divisão → Referência de temperatura**; o sensor externo opcional é configurado aqui. Desabilitar ou limpar o Room Assist devolve a medição efetiva à temperatura desse membro.

O grupo tem uma configuração e correção partilhadas do Room Assist, não um controlador independente por membro. O Velair mantém o alvo programado da divisão e envia o comando corrigido pelo modo de envio existente: todos os membros por predefinição ou o destinatário explicitamente escolhido quando a instalação já propaga os comandos. As verificações de capacidade, incremento e limites de temperatura continuam sendo aplicadas aos destinatários reais. Os membros continuam individualmente visíveis na Visão geral.

A assistência com sensor ambiente não exige pré-condicionamento adaptativo. Pode funcionar em blocos normais e em blocos antecipados pelo pré-condicionamento.

Um bloco de temperatura com **Manter o modo atual** ainda aplica o seu alvo programado. O Room Assist usa o modo realmente ativo; se o dispositivo estiver desligado, o Velair inicia-o num modo compatível. **Manter o modo atual** não significa «manter o alvo do termóstato inalterado» num bloco de temperatura. Um bloco apenas de opções não tem alvo, pelo que o Room Assist não atua nesse bloco.

O atraso de atualização agrupa mudanças próximas do sensor ambiente ou temperatura do dispositivo antes de recalcular. O valor predefinido é `20` segundos. Defina `0` para recálculo imediato ou até `300` segundos para agrupar atualizações frequentes.

A zona morta do Room Assist é independente do delta mínimo do pré-condicionamento adaptativo. O valor predefinido é `0.3 °C` ou `1 °F`; aceita `0` para desativar e passos de `0.1` grau até `5 °C` ou `9 °F`. Guardar com o Room Assist ativo atualiza imediatamente o alvo assistido.

A escala em tempo real desenha a zona morta configurada como um intervalo neutro às riscas. Para um alvo único fixo, os seus extremos são os limites de comutação da histerese, e o estado identifica para qual deles o Room Assist se dirige. Em modos automáticos escalares, este permanece uma margem neutra. Para um intervalo nativo `heat_cool`, vai do limite inferior menos a zona morta ao superior mais a zona morta. A escala expande-se para manter ambas as bordas visíveis. A legenda traduzida completa permanece centrada no intervalo real, mesmo que este seja mais estreita que o texto, preservando o significado em qualquer largura do gráfico. A explicação completa também fica disponível para tecnologias assistivas e ao passar o ponteiro do rato. Com zona morta `0`, nenhuma área é desenhada e a legenda estática informa explicitamente que não há zona morta. Gráfico e legenda acompanham o valor guardado no backend; ocultar `show_room_assist_deadband` num cartão Lovelace oculta em conjunto a definição, o intervalo e a legenda.

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

Quando ativo, Visão geral resume em **Em direção ao limite inferior**, **Em direção ao limite superior**, **Ativo**, **A manter** ou **Proteção programada**, conforme o caso, mostrando valores programados e aplicados. Mínimo ou máximo do termóstato difere de proteção programada: Room Assist mostra um aviso com valores solicitados, aplicados e aceites, e o Home Assistant recebe uma notificação persistente até resolver o limite físico.

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

Quando essa proteção muda o resultado, o estado em tempo real explica os dois valores. Identifica o alvo calculado e o efetivamente mantido, e Visão geral mostra o estado compacto `Proteção programada`. É um comportamento protetor normal, não erro de termóstato, portanto não cria notificação persistente. Limites físicos continuam a utilizar o seu próprio aviso e notificação.

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

Cenário:

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

<a id="why-climate-target-can-differ-from-the-calculation"></a>
### Por que o alvo da climatização pode diferir do cálculo

**Alvo da climatização** é o valor informado pela entidade enquanto o Room Assist está pronto ou bloqueado. Quando está a ajudar ou mantendo um alvo escalar aplicado, mostra o valor temporário enviado pelo Velair. Nenhum dos dois é o alvo ambiente programado ou o limite ativo da histerese. Um dispositivo aceita alvos numa grelha própria, então o Velair pode precisar alinhar o valor final ao passo efetivo publicado, último comunicado, manual ou predefinido.

Por exemplo, em arrefecimento fixo pode calcular `23.9 °C` para um dispositivo com passos de `0.5 °C`. Aplica `24.0 °C`: arredonda para cima para não arrefecer mais agressivamente que o cálculo. Aquecimento fixo arredonda para baixo; modos automáticos escalares usam o passo mais próximo. O botão de informação junto a **Alvo da climatização** adapta a explicação ao valor mostrado e, quando o alinhamento realmente alterou o valor aplicado, mostra cálculo, passo efetivo e valor enviado. Limites físicos e proteção programada são informados separadamente, sem serem descritos como alinhamento ao passo.

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

Se um alvo escalar ou intervalo calculado ultrapassar mínimo ou máximo aceites, o Velair aplica o resultado válido mais próximo. O estado em tempo real mostra alvo solicitado, aplicado e limite atingido antes do gráfico. O Home Assistant também cria uma notificação persistente para o limite ativo; atualizações repetidas não duplicam avisos, e o Velair remove a notificação após a recuperação.

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

<a id="automation-events"></a>
## Eventos de automação

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

A escala em tempo real separa duas relações. Para alvo único, a linha superior compara o sensor ambiente ao alvo programado, e a linha inferior de controlo compara a leitura do dispositivo ao alvo da climatização. Em `heat` ou `cool` fixo, o intervalo às riscas marca os dois limites de histerese, e o estado nomeia o ativo. Em modos automáticos escalares, permanece uma margem neutra. Para um intervalo nativo, marcadores em forma de parênteses retos vermelhos e azuis identificam os intervalos completos, programado e aplicado, inclusive ambos os limites. Um único conector `Mudança de alcance` com sinal liga os seus centros, representando o movimento de todo o intervalo, não de uma borda isolada. Esses indicadores descrevem apenas o alvo enviado pelo Velair; não afirmam que termóstato, válvula ou compressor estão a aquecer ou a arrefecer ativamente.

Em colunas estreitas do painel, a escala permite deslocação horizontal para manter legíveis os marcadores de temperatura.

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
