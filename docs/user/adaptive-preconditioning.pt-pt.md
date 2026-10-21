<a id="adaptive-preconditioning"></a>
# Pré-condicionamento adaptativo
<!-- velair-docs:start -->
Traduções: [Original em inglês](adaptive-preconditioning.md) · [Español](adaptive-preconditioning.es.md) · [Français](adaptive-preconditioning.fr.md) · [Deutsch](adaptive-preconditioning.de.md) · [Italiano](adaptive-preconditioning.it.md) · [Nederlands](adaptive-preconditioning.nl.md) · [Polski](adaptive-preconditioning.pl.md) · [Português (Brasil)](adaptive-preconditioning.pt-br.md) · [Português (Portugal)](adaptive-preconditioning.pt-pt.md) · [Русский](adaptive-preconditioning.ru.md) · [Estado das traduções](../translation-status.md)

<details>
<summary>Estado desta tradução</summary>

| Informação | Estado |
| --- | --- |
| Versão de referência | 1.9.0-beta.3 |
| Última sincronização | 2026-10-21 |
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

O separador Pré-condicionamento contém definições adaptativas e aprendizagem por equipamento. Regresso planeado tem o seu próprio separador para ocupação, chegadas semanais e ausência atual. Ambas incluem uma introdução e ajuda contextual. Os caminhos diretos são `/velair/preconditioning` e `/velair/planned-return`. Ligações antigas de subseções continuam abrindo o separador correspondente. Consulta [Regresso planeado](planned-return.pt-pt.md).

1. Abra o separador Pré-condicionamento.
2. Expanda o dispositivo de climatização que deseja configurar.
3. Ative o pré-condicionamento.
4. Mantenha as definições predefinidas do modelo, a menos que tenha um motivo específico para ajustá-las.
5. Opcionalmente, selecione um sensor de temperatura exterior.

O pré-condicionamento é configurado por dispositivo. A aprendizagem de aquecimento e arrefecimento é acompanhada separadamente: as amostras de arrefecimento não substituem as de aquecimento, nem o contrário.

Os intervalos nativos de `heat_cool` são compatíveis. Se a temperatura da divisão estiver abaixo do limite inferior por uma diferença maior que o delta mínimo de temperatura, o Velair calcula a previsão a partir desse limite e inicia antecipadamente o intervalo completo para aquecer. Se estiver acima do limite superior por uma diferença maior que esse delta, calcula a previsão a partir do limite superior e inicia o intervalo completo para arrefecer. Leituras dentro do intervalo ou das zonas de tolerância dos limites mantêm o horário normal. O Velair sempre envia os dois limites; nunca reduz um intervalo a uma única temperatura.

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
