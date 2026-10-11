<a id="adaptive-preconditioning"></a>
# Pré-condicionamento adaptativo
<!-- velair-docs:start -->
Traduções: [Original em inglês](adaptive-preconditioning.md) · [Español](adaptive-preconditioning.es.md) · [Français](adaptive-preconditioning.fr.md) · [Deutsch](adaptive-preconditioning.de.md) · [Italiano](adaptive-preconditioning.it.md) · [Nederlands](adaptive-preconditioning.nl.md) · [Polski](adaptive-preconditioning.pl.md) · [Português (Brasil)](adaptive-preconditioning.pt-br.md) · [Português (Portugal)](adaptive-preconditioning.pt-pt.md) · [Русский](adaptive-preconditioning.ru.md) · [Estado das traduções](../translation-status.md)

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

O pré-condicionamento adaptativo permite que o Velair inicie o aquecimento ou arrefecimento antes de um bloco programado, para que a divisão esteja mais próxima da temperatura-alvo quando o bloco começar.

Por exemplo, um bloco às `07:00` com `21 °C` significa «estar próximo de `21 °C` às `07:00`», e não «começar a ajustar para `21 °C` às `07:00`».

O pré-condicionamento adaptativo funciona localmente no Home Assistant. O Velair mantém as suas definições e amostras de aprendizagem no armazenamento do Home Assistant e nunca envia o histórico de temperatura, observações ou dados de calibração a um controlador externo. As zonas delegadas através da execução externa de programações não utilizam pré-condicionamento adaptativo; apenas a sua programação semanal efetiva é publicada.

<a id="setup"></a>
## Configuração

O separador Pré-condicionamento oferece duas ferramentas no seletor de subsecções. O pré-condicionamento adaptativo abre por predefinição; escolha Regresso planeado para configurar a ocupação e as chegadas semanais e gerir a ausência atual. Os caminhos diretos no painel são `/velair/preconditioning/preconditioning` e `/velair/preconditioning/planned-return`. Consulte [Regresso planeado](planned-return.pt-pt.md).

1. Abra o separador Pré-condicionamento.
2. Expanda o dispositivo de climatização que deseja configurar.
3. Ative o pré-condicionamento.
4. Mantenha as definições predefinidas do modelo, a menos que tenha um motivo específico para ajustá-las.
5. Opcionalmente, selecione um sensor de temperatura exterior.

O pré-condicionamento é configurado por dispositivo. A aprendizagem de aquecimento e arrefecimento é acompanhada separadamente: as amostras de arrefecimento não substituem as de aquecimento, nem o contrário.

Os intervalos nativos de `heat_cool` são compatíveis. Se a temperatura da divisão estiver abaixo do limite inferior por uma diferença maior que o delta mínimo de temperatura, o Velair calcula a previsão a partir desse limite e inicia antecipadamente o intervalo completo para aquecer. Se estiver acima do limite superior por uma diferença maior que esse delta, calcula a previsão a partir do limite superior e inicia o intervalo completo para arrefecer. Leituras dentro do intervalo ou das zonas de tolerância dos limites mantêm o horário normal. O Velair sempre envia os dois limites; nunca reduz um intervalo a uma única temperatura.

Ao expandir um dispositivo, cada modo compatível mostra um cartão de previsão em tempo real. Este utiliza os mesmos dados de próximos eventos do backend que o separador Visão geral, mantendo o tratamento consistente de pausas, reforços, modos incompatíveis e blocos que não permitem pré-condicionamento. Quando existe um bloco futuro correspondente, o cartão mostra o início calculado, o horário-alvo, a antecedência, a temperatura e o modo programados e se o Velair está a utilizar o modelo inicial ou um histórico local semelhante.

Para conferir um cálculo específico, abra **Detalhes do cálculo** no cartão de previsão. Essa secção opcional mostra os valores do backend usados na previsão, incluindo a contagem de amostras, a estimativa das observações completas, o limite inferior das parciais, a estimativa combinada, o arredondamento e a antecedência final. Ela fica oculta por predefinição para manter a visão habitual simples.

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
