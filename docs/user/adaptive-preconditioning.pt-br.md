<a id="adaptive-preconditioning"></a>
# Pré-condicionamento adaptativo
<!-- velair-docs:start -->
Traduções: [Original em inglês](adaptive-preconditioning.md) · [Español](adaptive-preconditioning.es.md) · [Français](adaptive-preconditioning.fr.md) · [Deutsch](adaptive-preconditioning.de.md) · [Italiano](adaptive-preconditioning.it.md) · [Nederlands](adaptive-preconditioning.nl.md) · [Polski](adaptive-preconditioning.pl.md) · [Português (Brasil)](adaptive-preconditioning.pt-br.md) · [Português (Portugal)](adaptive-preconditioning.pt-pt.md) · [Русский](adaptive-preconditioning.ru.md) · [Status das traduções](../translation-status.md)

<details>
<summary>Status desta tradução</summary>

| Informação | Status |
| --- | --- |
| Versão de referência | 1.9.0-beta.5 |
| Última sincronização | 2026-10-24 |
| Revisão linguística | Tradução assistida por IA |
| Em relação ao original | Sincronizada com o original em inglês. |

</details>

---
<!-- velair-docs:end -->

O pré-condicionamento adaptativo permite que o Velair inicie o aquecimento ou resfriamento antes de um bloco programado, para que o cômodo esteja mais próximo da temperatura-alvo quando o bloco começar.

Um bloco **Somente temperatura** não autoriza mudança de modo HVAC. Enquanto o equipamento está desligado, o Velair não inicia preparação antecipada nem coleta amostras de aprendizado térmico para esse alvo. Ligá-lo externamente permite recalcular a preparação usando o modo compatível real. Essa opção não pode prometer conforto no horário do bloco enquanto o equipamento permanecer desligado.

Por exemplo, um bloco às `07:00` com `21 °C` significa «estar próximo de `21 °C` às `07:00`», e não «começar a ajustar para `21 °C` às `07:00`».

O pré-condicionamento adaptativo funciona localmente no Home Assistant. O Velair mantém suas configurações e amostras de aprendizado no armazenamento do Home Assistant e nunca envia o histórico de temperatura, observações ou dados de calibração a um controlador externo. Zonas delegadas pela execução externa da programação não usam pré-condicionamento adaptativo; apenas sua programação semanal efetiva é publicada.

<a id="setup"></a>
## Configuração

A aba Pré-condicionamento contém configurações adaptativas e aprendizado por equipamento. Retorno planejado tem sua própria aba para ocupação, chegadas semanais e ausência atual. Ambas incluem uma introdução e ajuda contextual. Os caminhos diretos são `/velair/preconditioning` e `/velair/planned-return`. Links antigos de subseções continuam abrindo a aba correspondente. Consulte [Retorno planejado](planned-return.pt-br.md).

1. Abra a aba Pré-condicionamento.
2. Expanda o dispositivo de climatização que deseja configurar.
3. Habilite o pré-condicionamento.
4. Mantenha as configurações padrão do modelo, a menos que tenha um motivo específico para ajustá-las.
5. Opcionalmente, selecione um sensor de temperatura externa.

O pré-condicionamento é configurado por dispositivo. O aprendizado de aquecimento e resfriamento é acompanhado separadamente: amostras de resfriamento não substituem as de aquecimento, nem o contrário.

As faixas nativas de `heat_cool` são compatíveis. Se a temperatura do cômodo estiver abaixo do limite inferior por uma diferença maior que o delta mínimo de temperatura, o Velair calcula a previsão a partir desse limite e inicia antecipadamente a faixa completa para aquecer. Se estiver acima do limite superior por uma diferença maior que esse delta, calcula a previsão a partir do limite superior e inicia a faixa completa para resfriar. Leituras dentro da faixa ou das zonas de tolerância dos limites mantêm o horário normal. O Velair sempre envia os dois limites; nunca reduz uma faixa a uma única temperatura.

Ao expandir um dispositivo, cada modo compatível mostra um cartão de previsão em tempo real. Ele usa os mesmos dados de próximos eventos do backend que a aba Visão geral, mantendo o tratamento consistente de pausas, reforços, modos incompatíveis e blocos que não permitem pré-condicionamento. Quando existe um bloco futuro correspondente, o cartão mostra o início calculado, o horário-alvo, a antecedência, a temperatura e o modo programados e se o Velair está usando o modelo inicial ou um histórico local semelhante.

A preparação do Retorno planejado é identificada separadamente da antecipação semanal. Para um retorno futuro aceito, as informações do equipamento mostram seu estado de retorno, início estimado, temperatura-alvo de chegada e motivos de suspensão ou indisponibilidade. Visão geral, Retorno planejado e cartões de climatização usam as mesmas informações de retorno do backend; não é outro evento semanal. Um ambiente ainda pode seguir Ausente enquanto mostra uma estimativa futura de retorno. **Preparando** descreve a intenção de controle do Velair, não a confirmação de que um dispositivo recebeu um comando ou está fisicamente aquecendo ou resfriando. A linha do tempo do retorno mostra o tempo decorrido até a chegada salva, não uma porcentagem de progresso térmico. Consulte [Preparação dos ambientes](planned-return.pt-br.md#room-preparation) para os estados.

Para conferir um cálculo específico, abra **Detalhes do cálculo** no cartão de previsão. Essa seção opcional mostra os valores do backend usados na previsão, incluindo a contagem de amostras, a estimativa das observações completas, o limite inferior das parciais, a estimativa combinada, o arredondamento e a antecedência final. Ela fica oculta por padrão para manter a visão habitual simples.

Uma entidade pode exigir ambos os limites em Aquecimento, Resfriamento ou Auto sem suportar `heat_cool`. O Velair programa e entrega esses alvos, mas não antecipa o início nem recolhe amostras de aprendizado térmica para eles. A vista de preparação explica que esta funcionalidade exige Aquecimento/Resfriamento para intervalos. O par programado permanece inalterado e o Retorno planejado aplica-o na chegada, sem preparação antecipada. Ativar o pré-condicionamento não elimina esta limitação.

<a id="preconditioning-master"></a>
## Mestre do pré-condicionamento

Mantenha **Mestre do pré-condicionamento** em **Independente** para conservar o comportamento existente. Para fazer a preparação antecipada de um equipamento depender de outro, selecione esse equipamento gerenciado nas configurações do cômodo dependente. Selecione **Independente** novamente para desfazer o vínculo. Isso se aplica à programação efetiva do cômodo, incluindo Perfis, exceções por zona e Retorno planejado. Não substitui suas temperaturas nem seus blocos.

Um mestre pode atender vários cômodos dependentes. Um cômodo não pode depender de si mesmo, e cadeias ou ciclos não são permitidos: um dependente não pode também ser mestre.

O Velair escolhe o bloco do mestre cujo horário-alvo está mais próximo do horário-alvo do bloco dependente. Em caso de empate, usa o bloco anterior. Os horários-alvo não precisam ser iguais. O dependente começa no mais tardio entre seu próprio início previsto e o início de preparação desse bloco do mestre:

| Início próprio do cômodo | Início do mestre | Alvo do cômodo | Início efetivo |
| --- | --- | --- | --- |
| 17:40 | 17:55 | 18:45 | 17:55 |
| 18:10 | 17:55 | 18:45 | 18:10 |
| 17:40 | Sem preparação antecipada | 18:45 | Bloco normal às 18:45 |
| 17:40 | 19:00 | 18:45 | Bloco normal às 18:45 |

Se o bloco selecionado do mestre não puder se preparar antecipadamente, o Velair não o substitui por outro bloco. Uma preparação de aquecimento não libera uma de resfriamento, nem o contrário. Pausas, substituições, verificações de disponibilidade e limites máximos de antecedência continuam valendo. Um mestre indisponível ou desabilitado continua configurado; o dependente não se torna independente silenciosamente.

**Início mínimo (min)** continua excluindo previsões independentes curtas. A espera pelo mestre, assim como um comando entregue com atraso, pode deixar uma janela real menor. O aprendizado usa essa janela restante, sem inventar um início anterior nem mover o alvo programado.

O início exibido é uma previsão. Na execução, o comando de preparação correspondente do mestre precisa ser aceito antes que um dependente possa começar. Isso não confirma o relé da caldeira, o fluxo de água nem o aquecimento/resfriamento real. O Velair não aumenta a temperatura do mestre para pedir calor em nome de outros cômodos. O bloco normal programado continua sendo executado no seu próprio horário.

O aprendizado começa quando o dependente inicia efetivamente sua preparação limitada, usando a temperatura naquele momento e o tempo restante até seu próprio bloco. Atingir o alvo antecipadamente, observações parciais e amostras inválidas mantêm suas regras existentes. O término posterior do mestre não interrompe uma preparação já iniciada no dependente. Vincular ou desvincular não apaga amostras de aprendizado salvas.

Abra **Detalhes do cálculo** para ver a estimativa independente, o mestre selecionado e o início efetivo. O Diagnóstico mostra o motivo da dependência junto às evidências de preparação e aprendizado do cômodo. Referências salvas de início de comandos permitem continuidade operacional após reinício; uma observação de aprendizado interrompida não é retomada, e essas referências técnicas não entram nas exportações portáteis.

<a id="understanding-learning-activity"></a>
## Entendendo a atividade de aprendizado

Cada direção compatível pode mostrar uma explicação breve junto às informações de aprendizado existentes: o Velair está observando uma transição, aguardando uma transição adequada ou não pode observar por um motivo conhecido. Isso descreve o aprendizado, não confirma que o equipamento esteja fisicamente aquecendo ou resfriando. Uma transição anterior tem data explícita e não é apresentada como atividade atual.

Use a ação **Diagnóstico** ao lado da explicação para abrir esse equipamento e seu histórico de Pré-condicionamento, sem um filtro de data ocultando registros anteriores. A seção de funções existente mostra a atividade atual e a última transição de aprendizado mantida. Expanda os detalhes para inspecionar as temperaturas, os limites configurados e as durações disponíveis para essa decisão. Consulte [Evidências de aprendizado](diagnostics.pt-br.md#learning-evidence).

Uma contagem de amostras inalterada não comprova falha. Uma transição pode não fornecer uma diferença de temperatura utilizável, uma observação pode ainda estar em andamento ou seu resultado pode ser parcial ou inválido. As explicações usam somente evidências registradas pelo Velair; não deduzem o funcionamento da caldeira nem um fornecimento compartilhado de calor. O estado do aprendizado e a previsão do próximo bloco continuam separados: um cômodo pode ter pouco histórico aprendido e, mesmo assim, não precisar de início antecipado para um alvo específico.

<a id="how-it-starts"></a>
## Como o início é determinado

O Velair calcula a diferença atual de temperatura para o próximo bloco de temperatura programado.

Para uma faixa `heat_cool`, «temperatura-alvo» abaixo significa o limite inferior durante o aquecimento e o superior durante o resfriamento.

Para aquecimento:

```text
delta = target temperature - current temperature
```

Para resfriamento:

```text
delta = current temperature - target temperature
```

Se a diferença for menor que o delta mínimo de temperatura, o Velair mantém o horário normal do bloco e não antecipa o início.

<a id="schedule-boundaries-and-other-climates"></a>

## Limites da programação e outros equipamentos

Um início antecipado semanal não pode alcançar nem atravessar o bloco efetivo imediatamente anterior da programação do mesmo equipamento, incluindo um bloco `Off`. Se a janela calculada alcançar ou atravessar esse limite, o Velair mantém o horário normal de conforto. Por exemplo, com `Off` às `19:00` e `heat` às `20:00`, um início calculado às `18:00` é suprimido: `Off` é aplicado às `19:00` e o aquecimento começa às `20:00`. Um bloco `Off` às `22:00` da noite anterior não impede um início às `05:35` para as `07:00` sem blocos intermediários. A regra também vale para resfriamento e intervalos nativos `heat_cool`; não altera as previsões de chegada do retorno planejado.

Um equipamento que já está em pré-condicionamento não atrasa blocos nem inícios antecipados de outros equipamentos. Se o processamento de uma ação ultrapassar outra transição, o Velair determina o alvo atualmente autorizado do equipamento afetado, em vez de repetir comandos obsoletos. Pausas, reforços, ajuste manual, zonas desativadas e execução externa da programação continuam determinando se um alvo pode ser enviado. Essa recuperação se aplica enquanto o agendador está em funcionamento; o comportamento configurado de aplicação na inicialização permanece igual.

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
## Aquecimento com histórico de aprendizado

Após observações bem-sucedidas suficientes, o Velair pode usar um histórico local semelhante em vez do modelo inicial.

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

O Velair arredonda a antecedência final para cima, até o próximo minuto compatível com o agendador, em vez de arredondar abaixo do valor calculado.

```text
87.5 min -> 90 min
start = 07:00 - 90 min = 05:30
```

<a id="cooling-example"></a>
## Exemplo de resfriamento

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

Se o dispositivo acumular observações suficientes de resfriamento, o Velair usará apenas esse histórico. O histórico de aquecimento não é misturado ao de resfriamento, pois o mesmo cômodo e dispositivo podem aquecer e resfriar em ritmos diferentes.

<a id="partial-and-invalid-observations"></a>
## Observações parciais e inválidas

O Velair armazena observações locais compactas após as tentativas de pré-condicionamento.

Observações completas são exemplos úteis em que o cômodo atingiu o limite da temperatura-alvo a tempo.

Observações parciais indicam que o Velair começou antecipadamente, mas o cômodo não atingiu o limite da temperatura-alvo até o horário de conforto programado. Elas funcionam como limites inferiores: o Velair sabe que era necessário mais tempo, mas não inventa um horário de conclusão.

Observações inválidas são mantidas apenas para diagnóstico e não orientam o modelo. Exemplos incluem diferenças mínimas, durações impossíveis, sessões interrompidas, temperaturas ausentes, reforços, pausas ou mudanças de estado do agendador.

Se observações parciais antigas forem seguidas por observações completas suficientes que comprovem que o cômodo agora atinge a temperatura-alvo de forma confiável, as parciais antigas deixam de aumentar a previsão.

<a id="outdoor-temperature-sensor"></a>
## Sensor de temperatura externa

O sensor de temperatura externa é opcional.

Se configurado, o Velair armazena seu valor como contexto local das observações e depois compara as condições atuais com observações anteriores semelhantes. Não consulta serviços meteorológicos, não exige internet e não aplica uma correção fixa ao modelo inicial.

Se o sensor externo estiver indisponível ao salvar uma amostra, o Velair simplesmente armazena a observação sem esse contexto.

<a id="room-assist-interaction"></a>
## Interação com o Room Assist

Por padrão, o pré-condicionamento adaptativo usa `current_temperature` da entidade de climatização.

Se a assistência com sensor ambiente estiver habilitada para o dispositivo e houver um sensor ambiente selecionado, o pré-condicionamento adaptativo usa esse sensor como temperatura ambiente efetiva para as decisões e o aprendizado.

Isso é útil para válvulas termostáticas ou termostatos cujo sensor integrado está muito perto de um radiador, saída de ar ou outra fonte local de calor. Consulte [Room Assist](room-assist.pt-br.md) para entender o comportamento do atuador.

<a id="automation-events"></a>
## Eventos de automação

O Velair usa três eventos `velair_event` neste ciclo:

- `preconditioning_plan_updated` quando um plano calculado surge ou muda;
- `preconditioning_plan_cancelled` quando um plano publicado deixa de se aplicar;
- `preconditioning_observation_recorded` após salvar uma amostra de aprendizado.

Consulte [Eventos de automação](automation-events.pt-br.md#preconditioning-plan-updated) para as regras exatas de emissão e exemplos completos dos dados enviados.

Exemplo de gatilho de automação:

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

- está desabilitado para o dispositivo;
- o agendador não está no modo automático;
- a zona está pausada ou com reforço;
- o próximo bloco é `Off`;
- o dispositivo não aceita a direção necessária de aquecimento ou resfriamento;
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

Detalhes para desenvolvedores sobre armazenamento, algoritmo de aprendizado, tratamento de observações parciais, ponderação por similaridade e saída da API estão em [Funcionamento interno do pré-condicionamento adaptativo](../developer/adaptive-preconditioning.md).
