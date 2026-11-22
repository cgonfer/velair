<a id="adaptive-preconditioning"></a>
# Pré-condicionamento adaptativo
<!-- velair-docs:start -->
Traduções: [Original em inglês](adaptive-preconditioning.md) · [Español](adaptive-preconditioning.es.md) · [Français](adaptive-preconditioning.fr.md) · [Deutsch](adaptive-preconditioning.de.md) · [Italiano](adaptive-preconditioning.it.md) · [Nederlands](adaptive-preconditioning.nl.md) · [Polski](adaptive-preconditioning.pl.md) · [Português (Brasil)](adaptive-preconditioning.pt-br.md) · [Português (Portugal)](adaptive-preconditioning.pt-pt.md) · [Русский](adaptive-preconditioning.ru.md) · [Estado das traduções](../translation-status.md)

<details>
<summary>Estado desta tradução</summary>

| Informação | Estado |
| --- | --- |
| Versão de referência | 1.9.3-dev.20261120233407 |
| Última sincronização | 2026-11-21 |
| Revisão linguística | Tradução assistida por IA |
| Em relação ao original | Sincronizada com o original em inglês. |

</details>

---
<!-- velair-docs:end -->

O pré-condicionamento adaptativo permite que o Velair inicie o aquecimento ou arrefecimento antes de um bloco programado, para que a divisão esteja mais próxima da temperatura-alvo quando o bloco começar.

Um bloco **Apenas temperatura** não autoriza mudança de modo HVAC. Enquanto o equipamento está desligado, o Velair não inicia preparação antecipada nem coleta amostras de aprendizagem térmica para esse alvo. Ligá-lo externamente permite recalcular a preparação utilizando o modo compatível real. Essa opção não pode prometer conforto no horário do bloco enquanto o equipamento permanecer desligado.

Por exemplo, um bloco às `07:00` com `21 °C` significa «estar próximo de `21 °C` às `07:00`», e não «começar a ajustar para `21 °C` às `07:00`».

O pré-condicionamento adaptativo funciona localmente no Home Assistant. O Velair mantém as suas definições e amostras de aprendizagem no armazenamento do Home Assistant e nunca envia o histórico de temperatura, observações ou dados de calibração a um controlador externo. As zonas delegadas através da execução externa de programações não utilizam pré-condicionamento adaptativo; apenas a sua programação semanal efetiva é publicada.

<a id="setup"></a>
## Configuração

O separador Pré-condicionamento contém definições adaptativas e aprendizagem para cada dispositivo independente ou grupo de divisão. Os membros agrupados aparecem aqui como uma divisão. Regresso planeado tem o seu próprio separador para ocupação, chegadas semanais e ausência atual. Ambas incluem uma introdução e ajuda contextual. Os caminhos diretos são `/velair/preconditioning` e `/velair/planned-return`. Ligações antigas de subsecções continuam abrindo o separador correspondente. Consulta [Regresso planeado](planned-return.pt-pt.md).

1. Abra o separador Pré-condicionamento.
2. Expanda o dispositivo ou grupo de divisão que deseja configurar.
3. Ative o pré-condicionamento.
4. Mantenha as definições predefinidas do modelo, a menos que tenha um motivo específico para ajustá-las.
5. Opcionalmente, selecione um sensor de temperatura exterior.

O pré-condicionamento é configurado por dispositivo independente ou grupo de divisão. A aprendizagem de aquecimento e arrefecimento é acompanhada separadamente: as amostras de arrefecimento não substituem as de aquecimento, nem o contrário.

Um [grupo de divisão](room-groups.pt-pt.md#learning-and-membership-changes) armazena um modelo térmico e toma uma decisão de início; seus membros não aprendem nem se preparam independentemente. A referência de temperatura fornece a medição nativa, ou um sensor ativado do Room Assist fornece a medição efetiva. Remover um membro reinicia a aprendizagem dele e do grupo restante. Desfazer o grupo inicia históricos independentes para todos; os antigos não são repartidos nem recuperados. Renomear ou reordenar membros mantém a aprendizagem.

Os intervalos nativos de `heat_cool` são compatíveis. Se a temperatura da divisão estiver abaixo do limite inferior por uma diferença maior que o delta mínimo de temperatura, o Velair calcula a previsão a partir desse limite e inicia antecipadamente o intervalo completo para aquecer. Se estiver acima do limite superior por uma diferença maior que esse delta, calcula a previsão a partir do limite superior e inicia o intervalo completo para arrefecer. Leituras dentro do intervalo ou das zonas de tolerância dos limites mantêm o horário normal. O Velair sempre envia os dois limites; nunca reduz um intervalo a uma única temperatura.

Para dois alvos em `heat` ou `cool` fixo, selecione **Alvo de referência** para o dispositivo e modo em **Definições → Dispositivos de climatização e grupos**. Escolha o limite que o equipamento realmente usa: **Alvo inferior** ou **Alvo superior**. A seleção é partilhada com Room Assist. A preparação e a aprendizagem de aquecimento usam somente o limite selecionado como alvo de aquecimento; arrefecimento o usa como alvo de arrefecimento. A direção vem do modo, mesmo se for o limite superior em aquecimento ou inferior em arrefecimento. O Velair antecipa o par nominal completo, inclusive no Regresso planeado; nunca envia apenas o limite escolhido.

Com **Não configurado**, pares em modo fixo mantêm o horário programado e não produzem amostras de aprendizagem térmica. Regresso planeado os aplica na chegada, sem preparação antecipada. Faixas em `auto` mantêm essa limitação, pois escolher um limite não estabelece o comportamento de aquecimento ou arrefecimento. O comportamento nativo de `heat_cool` não muda. Alterar a referência invalida observações de aprendizagem iniciadas com a interpretação anterior.

<a id="temporary-setpoint-offset"></a>
## Deslocamento temporário do alvo

**Deslocamento no aquecimento** e **Deslocamento no arrefecimento** acrescentam esforço opcional ao atuador durante a preparação antecipada. Ambos começam em `0`, mantendo o comportamento existente. Escolha cada valor de acordo com o passo efetivo de temperatura do equipamento, até `5 °C` (`9 °F`). O maior valor selecionável é o maior passo compatível dentro desse limite. São diferenças de temperatura: um deslocamento de `2 °C` no aquecimento soma dois graus; no arrefecimento, subtrai dois graus.

O alvo programado da divisão e o objetivo da aprendizagem não mudam. Por exemplo, preparar um bloco de aquecimento de `21 °C` com deslocamento de `2 °C` envia temporariamente `23 °C`. Preparar um bloco de arrefecimento de `24 °C` com deslocamento de `1.5 °C` envia `22.5 °C`. Com delta mínimo de temperatura de `0.1 °C`, estas preparações terminam em `20.9 °C` e `24.1 °C`, respetivamente. O deslocamento também é removido quando o bloco começa. O Velair concilia então a programação atual, o Room Assist e os outros controlos ativos através dos mecanismos existentes de envio e recuperação.

Para um alvo com dois limites, ambos se deslocam pela mesma distância. Um intervalo de aquecimento de `20–24 °C` com deslocamento pedido de `3 °C` e máximo físico de `25 °C` torna-se `21–25 °C`: mantém quatro graus de largura e o deslocamento efetivo diminui para `1 °C`. O arrefecimento faz o equivalente no mínimo físico. O extra efetivo é arredondado para baixo para um passo de diferença compatível e nunca excede o pedido. Sem espaço disponível, um deslocamento positivo configurado pode aplicar `0 °C`; a preparação mantém a sua direção até atingir o limiar original de temperatura da divisão.

Alterar o deslocamento configurado de uma direção reinicia apenas a aprendizagem dessa direção. As regras de previsão, seleção de amostras e validade das observações não mudam. As sessões cujo deslocamento efetivo varia devido aos limites do dispositivo ou ao Room Assist continuam elegíveis segundo essas regras. Repor as predefinições de pré-condicionamento coloca ambos os deslocamentos a zero, reinicia apenas as direções cujo valor mudou e preserva as definições separadas do Room Assist, incluindo a travagem.

Se o dispositivo comunicar outro passo posteriormente, o Velair mantém o pedido guardado e reduz apenas o extra aplicado para um passo compatível. A conversão de unidade preserva a diferença física e não reinicia a aprendizagem. O modelo portátil `28` identifica a aprendizagem exportada com o deslocamento configurado de cada direção; a importação exige uma configuração resultante correspondente. A aprendizagem antiga é tratada como tendo deslocamento zero. Uma importação apenas de configuração que altere um deslocamento reinicia a aprendizagem local mantida dessa direção.

O painel mantém **Alvo programado** e o valor atribuído ao Velair no alvo original. O marcador existente **Alvo aplicado** mostra o comando final. Um indicador de deslocamento ativo mostra o extra efetivo com sinal, incluindo zero devido a limitação; os detalhes explicam o alvo original, a base do Room Assist, o extra pedido, o efetivo, o comando final e qualquer limitação do dispositivo.

<a id="after-reaching-the-target"></a>
## Após atingir o alvo

Quando uma preparação antecipada aceite atinge o limiar de chegada antes do início do bloco, o Velair mantém o alvo original desse bloco até ao horário programado. O deslocamento temporário termina na chegada. Isto também funciona com deslocamento zero, sem Room Assist e quando a observação é demasiado curta para gerar uma amostra de aprendizagem.

Por exemplo, o bloco atual é `20 °C` e a preparação para um bloco futuro de `21 °C` termina em `20.9 °C`. Visão geral mantém **Alvo** em `21 °C`, sem voltar a `20 °C` quando a observação termina. Com deslocamento de aquecimento de `2 °C`, o comando temporário de `23 °C` regressa ao nominal de `21 °C`. Se **Aplicado** também for `21 °C`, o valor duplicado fica oculto como habitualmente. No arrefecimento, um alvo futuro de `24 °C` atingido em `24.1 °C` mantém o nominal de `24 °C` após terminar o comando temporário de `22 °C`. O Room Assist pode aplicar a sua correção ou travagem habitual em relação a esse alvo nominal.

O Velair guarda localmente esta preparação concluída e valida a programação e o contexto de controlo correspondentes após reiniciar. **Aplicar programação ativo após arranque** continua a decidir se será enviado um comando:

| Opção de inicialização | Preparação concluída válida antes do bloco |
| --- | --- |
| Ativada | Aplicar o alvo nominal recuperado, como `21 °C`, pelo envio normal. Não repor o deslocamento de preparação. |
| Desativada | Recuperar o nominal de `21 °C` para o painel e a intenção atual, sem enviar alvo, modo ou outras opções do bloco devido a esta recuperação. Mostrar separadamente o alvo realmente aplicado se for diferente. |

A recuperação não reabre a aprendizagem nem reativa o extra se a temperatura da divisão variar enquanto o Home Assistant estiver indisponível. Exige uma conclusão guardada com sucesso; um alvo comunicado pelo dispositivo não prova, por si só, que a preparação terminou. Uma falha ao guardar não garante continuidade após reiniciar. Pausas, Ajuste manual, substituições, preparação desativada e alterações à programação ou à responsabilidade de controlo continuam a ter prioridade. Alterar o alvo de referência, os membros do grupo ou o Modo ativo também invalida uma conclusão guardada quando o contexto preparado já não corresponde. No horário nominal do bloco, a programação normal assume o controlo.

Sem confirmação de preparação antecipada concluída, a distinção existente permanece: **Alvo** `20 °C` e **Aplicado** `21 °C` podem representar valores diferentes da programação e do dispositivo. Ativar apenas o pré-condicionamento não muda esta distinção.

<a id="live-predictions"></a>
## Previsões em tempo real

Ao expandir um dispositivo, cada modo compatível mostra um cartão de previsão em tempo real. Este utiliza os mesmos dados de próximos eventos do backend que o separador Visão geral, mantendo o tratamento consistente de pausas, reforços, modos incompatíveis e blocos que não permitem pré-condicionamento. Quando existe um bloco futuro correspondente, o cartão mostra o início calculado, o horário-alvo, a antecedência, a temperatura e o modo programados e se o Velair está a utilizar o modelo inicial ou um histórico local semelhante.

A preparação do Regresso planeado é identificada separadamente da antecipação semanal. Para um regresso futuro aceite, as informações do equipamento mostram seu estado de regresso, início estimado, temperatura-alvo de chegada e motivos de suspensão ou indisponibilidade. Visão geral, Regresso planeado e cartões de climatização usam as mesmas informações de regresso do backend; não é outro evento semanal. Um ambiente ainda pode seguir Ausente enquanto mostra uma estimativa futura de regresso. **A preparar** descreve a intenção de controlo do Velair, não a confirmação de que um dispositivo recebeu um comando ou está fisicamente aquecendo ou arrefecendo. A linha do tempo do regresso mostra o tempo decorrido até a chegada guardada, não uma porcentagem de progresso térmico. Consulte [Preparação dos ambientes](planned-return.pt-pt.md#room-preparation) para os estados.

Para conferir um cálculo específico, abra **Detalhes do cálculo** no cartão de previsão. Essa secção opcional mostra os valores do backend usados na previsão, incluindo a contagem de amostras, a estimativa das observações completas, o limite inferior das parciais, a estimativa combinada, o arredondamento e a antecedência final. Ela fica oculta por predefinição para manter a visão habitual simples.

<a id="preconditioning-master"></a>
## Mestre do pré-condicionamento

Mantém **Mestre do pré-condicionamento** em **Independente** para conservar o comportamento existente. Para fazer a preparação antecipada de um equipamento depender de outro, seleciona esse equipamento gerido nas definições da divisão dependente. Seleciona **Independente** novamente para desfazer o vínculo. Isso se aplica à programação efetiva da divisão, incluindo Perfis, exceções por zona e Regresso planeado. Não substitui as suas temperaturas nem os seus blocos.

Um mestre pode atender várias divisões dependentes. Uma divisão não pode depender de si mesma, e cadeias ou ciclos não são permitidos: um dependente não pode também ser mestre.

O Velair escolhe o bloco do mestre cujo horário-alvo está mais próximo do horário-alvo do bloco dependente. Em caso de empate, usa o bloco anterior. Os horários-alvo não precisam ser iguais. O dependente começa no mais tardio entre seu próprio início previsto e o início de preparação desse bloco do mestre:

| Início próprio da divisão | Início do mestre | Alvo da divisão | Início efetivo |
| --- | --- | --- | --- |
| 17:40 | 17:55 | 18:45 | 17:55 |
| 18:10 | 17:55 | 18:45 | 18:10 |
| 17:40 | Sem preparação antecipada | 18:45 | Bloco normal às 18:45 |
| 17:40 | 19:00 | 18:45 | Bloco normal às 18:45 |

Se o bloco selecionado do mestre não puder se preparar antecipadamente, o Velair não o substitui por outro bloco. Uma preparação de aquecimento não libera uma de arrefecimento, nem o contrário. Pausas, substituições, verificações de disponibilidade e limites máximos de antecedência continuam valendo. Um mestre indisponível ou desativado continua configurado; o dependente não se torna independente silenciosamente.

**Início mínimo (min)** continua a excluir previsões independentes curtas. A espera pelo mestre, assim como um comando entregue com atraso, pode deixar uma janela real menor. A aprendizagem usa essa janela restante, sem inventar um início anterior nem mover o alvo programado.

O início exibido é uma previsão. Na execução, o comando de preparação correspondente do mestre precisa ser aceito antes que um dependente possa começar. Isso não confirma o relé da caldeira, o fluxo de água nem o aquecimento/arrefecimento real. O Velair não aumenta a temperatura do mestre para pedir calor em nome de outras divisões. O bloco normal programado continua sendo executado no seu próprio horário.

A aprendizagem começa quando o dependente inicia efetivamente sua preparação limitada, utilizando a temperatura nesse momento e o tempo restante até ao seu próprio bloco. Atingir o alvo antecipadamente, observações parciais e amostras inválidas mantêm suas regras existentes. O término posterior do mestre não interrompe uma preparação já iniciada no dependente. Vincular ou desvincular não apaga amostras de aprendizagem guardadas.

Abre **Detalhes do cálculo** para ver a estimativa independente, o mestre selecionado e o início efetivo. O Diagnóstico mostra o motivo da dependência junto às evidências de preparação e aprendizagem da divisão. Referências guardadas de início de comandos permitem continuidade operacional após reinício; uma observação de aprendizagem interrompida não é retomada, e essas referências técnicas não entram nas exportações portáteis.

<a id="understanding-learning-activity"></a>
## Compreender a atividade de aprendizagem

Cada direção compatível pode mostrar uma explicação breve junto às informações de aprendizagem existentes: o Velair está a observar uma transição, a aguardar uma transição adequada ou não pode observar por um motivo conhecido. Isso descreve a aprendizagem, não confirma que o equipamento esteja fisicamente a aquecer ou a arrefecer. Uma transição anterior tem data explícita e não é apresentada como atividade atual.

Usa a ação **Diagnóstico** ao lado da explicação para abrir esse equipamento e seu histórico de Pré-condicionamento, sem um filtro de data a ocultar registos anteriores. A secção de funções existente mostra a atividade atual e a última transição de aprendizagem mantida. Expande os detalhes para inspecionar as temperaturas, os limites configurados e as durações disponíveis para essa decisão. Consulta [Evidências de aprendizagem](diagnostics.pt-pt.md#learning-evidence).

Uma contagem de amostras inalterada não comprova falha. Uma transição pode não fornecer uma diferença de temperatura utilizável, uma observação pode ainda estar em curso ou seu resultado pode ser parcial ou inválido. As explicações usam somente evidências registadas pelo Velair; não deduzem o funcionamento da caldeira nem um fornecimento partilhado de calor. O estado da aprendizagem e a previsão do próximo bloco continuam separados: uma divisão pode ter pouco histórico aprendido e, mesmo assim, não precisar de início antecipado para um alvo específico.

<a id="how-it-starts"></a>
## Como o início é determinado

O Velair calcula a diferença atual de temperatura para o próximo bloco de temperatura programado.

Para um intervalo `heat_cool`, «temperatura-alvo» abaixo significa o limite inferior durante o aquecimento e o superior durante o arrefecimento.

Para uma faixa fixa em `heat` ou `cool`, a temperatura-alvo significa o limite de referência selecionado, com a direção determinada pelo modo fixo.

Para aquecimento:

```text
delta = target temperature - current temperature
```

Para arrefecimento:

```text
delta = current temperature - target temperature
```

Se a diferença for menor que o delta mínimo de temperatura, o Velair mantém o horário normal do bloco e não antecipa o início.

<a id="schedule-boundaries-and-other-climates"></a>

## Limites da programação e outros equipamentos

Um início antecipado semanal não pode alcançar nem atravessar o bloco efetivo imediatamente anterior da programação do mesmo equipamento, incluindo um bloco `Off`. Se a janela calculada alcançar ou atravessar esse limite, o Velair mantém a hora normal de conforto. Por exemplo, com `Off` às `19:00` e `heat` às `20:00`, um início calculado às `18:00` é suprimido: `Off` é aplicado às `19:00` e o aquecimento começa às `20:00`. Um bloco `Off` às `22:00` da noite anterior não impede um início às `05:35` para as `07:00` sem blocos intermédios. A regra também se aplica ao arrefecimento e aos intervalos nativos `heat_cool`; não altera as previsões de chegada do regresso planeado.

Um equipamento já em pré-condicionamento não atrasa blocos nem inícios antecipados de outros equipamentos. Se o processamento de uma ação ultrapassar outra transição, o Velair determina o objetivo atualmente autorizado do equipamento afetado em vez de repetir comandos obsoletos. Pausas, reforços, ajuste manual, zonas desativadas e execução externa da programação continuam a determinar se um objetivo pode ser enviado. Esta recuperação aplica-se enquanto o programador está em funcionamento; o comportamento configurado de aplicação no arranque mantém-se inalterado.

<a id="initial-model-example"></a>
## Exemplo com o modelo inicial

Quando não há histórico local suficiente, o Velair usa o modelo inicial:

```text
lead = Minimum start + Initial model min/degree * temperature delta
```

Cenário:

- Bloco programado: `21 °C`, `heat`, horário-alvo `07:00`
- Temperatura ambiente: `18 °C`
- Início mínimo: `10 min`
- Modelo inicial: `25 min/°C` ou o equivalente `13.89 min/°F`
- Início máximo: `24 h`

Cálculo:

```text
delta = 21 - 18 = 3 °C
lead = 10 + 25 * 3 = 85 min
start = 07:00 - 85 min = 05:35
```

O Velair aplica a temperatura-alvo programada às `05:35` e mantém `07:00` como o horário visível desejado para o conforto.

<a id="heating-with-learned-history"></a>
## Aquecimento com histórico de aprendizagem

Após observações bem-sucedidas suficientes, o Velair pode utilizar um histórico local semelhante em vez do modelo inicial.

Cenário:

- Bloco programado: `21 °C`, `heat`, horário-alvo `07:00`
- Temperatura ambiente atual: `18.5 °C`
- Diferença atual: `2.5 °C`
- Observações completas semelhantes:

```text
A: 2.0 °C in 50 min -> 25.0 min/°C
B: 2.4 °C in 72 min -> 30.0 min/°C
C: 2.8 °C in 84 min -> 30.0 min/°C
D: 2.1 °C in 63 min -> 30.0 min/°C
E: 2.6 °C in 91 min -> 35.0 min/°C
```

Com o percentil de conforto definido em `80`, o Velair escolhe um valor conservador entre as amostras completas semelhantes. Neste exemplo, é `35.0 min/°C`.

```text
lead = 2.5 * 35 = 87.5 min
```

O Velair arredonda a antecedência final para cima, até ao próximo minuto compatível com o agendador, em vez de arredondar abaixo do valor calculado.

```text
87.5 min -> 90 min
start = 07:00 - 90 min = 05:30
```

<a id="cooling-example"></a>
## Exemplo de arrefecimento

Cenário:

- Bloco programado: `23 °C`, `cool`, horário-alvo `22:00`
- Temperatura ambiente: `27 °C`
- Início mínimo: `10 min`
- Modelo inicial: `25 min/°C`
- Início máximo: `24 h`

Cálculo:

```text
delta = 27 - 23 = 4 °C
lead = 10 + 25 * 4 = 110 min
start = 22:00 - 110 min = 20:10
```

Se o dispositivo acumular observações suficientes de arrefecimento, o Velair utilizará apenas esse histórico. O histórico de aquecimento não é misturado com o de arrefecimento, pois a mesma divisão e o mesmo dispositivo podem aquecer e arrefecer a ritmos diferentes.

<a id="partial-and-invalid-observations"></a>
## Observações parciais e inválidas

O Velair armazena observações locais compactas após as tentativas de pré-condicionamento.

Observações completas são exemplos úteis em que a divisão atingiu o limite da temperatura-alvo a tempo.

Observações parciais indicam que o Velair começou antecipadamente, mas a divisão não atingiu o limite da temperatura-alvo até o horário de conforto programado. Elas funcionam como limites inferiores: o Velair sabe que era necessário mais tempo, mas não inventa um horário de conclusão.

Observações inválidas são mantidas apenas para diagnóstico e não orientam o modelo. Exemplos incluem diferenças mínimas, durações impossíveis, sessões interrompidas, temperaturas ausentes, reforços, pausas ou mudanças de estado do agendador.

Se observações parciais antigas forem seguidas por observações completas suficientes que comprovem que a divisão agora atinge a temperatura-alvo de forma fiável, as parciais antigas deixam de aumentar a previsão.

<a id="outdoor-temperature-sensor"></a>
## Sensor de temperatura exterior

O sensor de temperatura exterior é opcional.

Se configurado, o Velair armazena o seu valor como contexto local das observações e depois compara as condições atuais com observações anteriores semelhantes. Não consulta serviços meteorológicos, não exige internet e não aplica uma correção fixa ao modelo inicial.

Se o sensor exterior estiver indisponível ao guardar uma amostra, o Velair simplesmente armazena a observação sem esse contexto.

<a id="room-assist-interaction"></a>
## Interação com o Room Assist

Por predefinição, o pré-condicionamento adaptativo usa `current_temperature` da entidade de climatização.

Se a assistência com sensor ambiente estiver ativada para o dispositivo e houver um sensor ambiente selecionado, o pré-condicionamento adaptativo usa esse sensor como temperatura ambiente efetiva para as decisões e a aprendizagem.

Durante a preparação, o Room Assist calcula primeiro o seu alvo base válido habitual; o deslocamento temporário é acrescentado depois. Por exemplo, um alvo nominal de aquecimento de `21 °C`, uma base do Room Assist de `22 °C` e um deslocamento de `2 °C` enviam `24 °C`, se o dispositivo o permitir. O Room Assist nunca usa esse comando temporário como objetivo de aprendizagem da divisão. Um deslocamento positivo configurado mantém temporariamente a direção de preparação ativa, mesmo que o Room Assist tenha herdado uma fase de histerese sem procura. Ao atingir o limiar original de preparação, voltam a aplicar-se a histerese normal e o nível de travagem escolhido. Esta prioridade também se aplica quando os limites físicos reduzem o extra efetivo a zero; configurar zero mantém o comportamento existente.

Isso é útil para válvulas termostáticas ou termóstatos cujo sensor integrado está muito perto de um radiador, saída de ar ou outra fonte local de calor. Consulte [Room Assist](room-assist.pt-pt.md) para entender o comportamento do atuador.

<a id="automation-events"></a>
## Eventos de automação

O Velair usa três eventos `velair_event` neste ciclo:

- `preconditioning_plan_updated` quando um plano calculado surge ou muda;
- `preconditioning_plan_cancelled` quando um plano publicado deixa de se aplicar;
- `preconditioning_observation_recorded` após guardar uma amostra de aprendizagem.

Consulte [Eventos de automação](automation-events.pt-pt.md#preconditioning-plan-updated) para as regras exatas de emissão e exemplos completos dos dados enviados.

Exemplo de acionador de automação:

```yaml
trigger:
  - platform: event
    event_type: velair_event
    event_data:
      event: preconditioning_plan_updated
      entity_id: climate.living_room
```

<a id="when-velair-does-nothing"></a>
## Quando o Velair não atua

O pré-condicionamento adaptativo não antecipa o início quando:

- está desativado para o dispositivo;
- o agendador não está no modo automático;
- a zona está pausada ou com reforço;
- o próximo bloco é `Off`;
- o dispositivo não aceita a direção necessária de aquecimento ou arrefecimento;
- a diferença de temperatura é menor que o delta mínimo de temperatura;
- a temperatura necessária está indisponível ou não é numérica.

<a id="lovelace"></a>
## Lovelace

A visualização de Pré-condicionamento está disponível como cartão Lovelace:

```yaml
type: custom:velair-card
view: preconditioning
entities:
  - climate.living_room
```

O cartão Lovelace usa a mesma configuração do backend que o painel principal do Velair.

<a id="technical-details"></a>
## Detalhes técnicos

Detalhes para programadores sobre armazenamento, algoritmo de aprendizagem, tratamento de observações parciais, ponderação por semelhança e saída da API estão em [Funcionamento interno do pré-condicionamento adaptativo](../developer/adaptive-preconditioning.md).
