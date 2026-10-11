<a id="environmental-comfort"></a>
# Conforto ambiental
<!-- velair-docs:start -->
Traduções: [Original em inglês](comfort.md) · [Español](comfort.es.md) · [Français](comfort.fr.md) · [Deutsch](comfort.de.md) · [Italiano](comfort.it.md) · [Nederlands](comfort.nl.md) · [Polski](comfort.pl.md) · [Português (Brasil)](comfort.pt-br.md) · [Português (Portugal)](comfort.pt-pt.md) · [Русский](comfort.ru.md) · [Estado das traduções](../translation-status.md)

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

O intervalo predefinido de temperatura confortável é `20–24 °C`. Em instalações que usam Fahrenheit, o intervalo predefinido é `68–75 °F`, com limites arredondados sem casas decimais.

Os limites de conforto usam a unidade configurada no Home Assistant e são migrados ou importados com os demais dados térmicos guardados do Velair. Um sensor que declara a outra unidade tem a sua leitura convertida antes da comparação com os limites do dispositivo gerido.

O conforto ambiental dá a cada dispositivo gerido uma descrição clara da divisão, em vez de um nível genérico de aviso.

Monitoriza leituras locais de temperatura, humidade e CO2. Não altera programações nem controla dispositivos automaticamente. O Velair disponibiliza a avaliação no painel, cartões Lovelace e eventos do Home Assistant para que automações decidam como agir.

<a id="sources"></a>
## Fontes

A temperatura usa a primeira fonte disponível nesta ordem:

1. sensor de temperatura selecionado no separador Conforto;
2. sensor do Room Assist configurado para o dispositivo;
3. `current_temperature` da entidade de climatização.

A humidade usa:

1. sensor de humidade selecionado no separador Conforto;
2. atributo de humidade medida `current_humidity` do dispositivo, quando disponível. O atributo `humidity` é uma configuração de alvo, não uma leitura.

A opção predefinida `Usar fonte automática` mantém esse comportamento. Selecione `Não monitorize a humidade` quando a humidade não deve influenciar a condição ambiental ou qualidade dos dados da zona. A escolha guardada do sensor é preservada, mas o Velair não lê nem observa esse sensor enquanto a monitorização está desativada.

O CO2 só é monitorizado quando há um sensor de CO2 selecionado.

O ID efetivo da entidade aparece abaixo de cada seletor. Métricas opcionais sem fonte não são tratadas como falhas.

<a id="comfort-models"></a>
## Modelos de conforto

O Velair oferece três formas de descrever a região de temperatura e humidade relativa útil à divisão. É um alvo configurado pelo utilizador, não uma definição universal ou médica de conforto.

- **Intervalos simples** é o valor predefinido. Um intervalo de temperatura e outro de humidade formam a região retangular habitual. Definições existentes mantêm esse comportamento.
- **Intervalo psicrométrico guiado** usa um intervalo de humidade como referência no ponto médio do intervalo de temperatura. O Velair acompanha a relação física entre temperatura e humidade relativa para adaptar esse intervalo automaticamente. O gráfico mostra o alvo curvo resultante, em vez de um retângulo. É uma orientação local prática, não uma norma completa de conforto fisiológico.
- **Intervalos conforme a temperatura** mantém o intervalo térmico, mas permite mínimos e máximos diferentes de humidade nas extremidades fria e quente. O Velair une gradualmente esses intervalos, formando uma região de quatro lados inclinada, em vez de um retângulo.

Por exemplo, uma divisão com `20–24 °C` pode aceitar `40–60%` em `20 °C` e `35–50%` em `24 °C`. Em `22 °C`, a avaliação usa o ponto médio: `37.5–55%`. Abaixo ou acima do intervalo de temperatura, usa a extremidade mais próxima, sem extrapolar os valores do utilizador.

O intervalo efetivo atual de humidade aparece abaixo do mapa. O mesmo intervalo calculado pelo backend orienta condição mostrada, resumo, entidade Condição ambiental, eventos, Diagnóstico e orientações externas opcionais; os clientes não calculam outra interpretação. Se a temperatura atual estiver ausente ou desatualizada, o Velair ainda pode mostrar uma leitura atual de humidade, mas não a classifica nem gera orientações de humidade até calcular o intervalo efetivo.

O modo guiado exige uma fonte de humidade identificável, do dispositivo ou de um sensor selecionado do Home Assistant. A opção permanece indisponível até identificar uma. Se a fonte ficar temporariamente indisponível, o Velair mantém modelo e ajustes selecionados e aguarda dados atuais, sem trocar o modelo.

Os dois intervalos personalizados de humidade das extremidades podem subir, descer ou permanecer iguais conforme a temperatura muda. O Velair não impõe uma direção porque edifícios e ocupantes diferem. O guiado é a opção compacta quando a mesma percentagem de humidade relativa não deve ser tratada igualmente em todas as temperaturas. Utilize o personalizado apenas quando medições da divisão justificarem controlar as duas extremidades.

Antes de personalizar esses intervalos, alterar a humidade de Intervalos simples mantém ambos alinhados com esse intervalo. Depois de personalizar um intervalo em função da temperatura, o Velair preserva-o ao alternar modelos para não perder uma configuração alternativa.

<a id="additional-environmental-information"></a>
## Informações ambientais adicionais

A configuração de Conforto pode adicionar três leituras às informações existentes do dispositivo:

| Leitura | Informação acrescentada |
| --- | --- |
| **Ponto de orvalho** | Indicação compacta de quão próximo o ar está das condições de condensação. Não confirma que ela ocorrerá, pois o Velair não conhece a temperatura de paredes, janelas e outras superfícies. |
| **Humidade absoluta** | Massa de vapor de água por metro cúbico de ar, em `g/m³`. Diferentemente da humidade relativa, não é uma percentagem do nível de saturação. O Velair não aplica um intervalo universal bom/mau. |
| **Humidex** | Valor adicional de calor percebido, derivado de temperatura e humidade. O Velair mostra o valor, mas não transforma os seus intervalos publicados em recomendações nem o usa como pontuação completa de conforto interno. |

Ative apenas leituras úteis ao painel ou automações. Não são necessárias para a condição normal de Conforto, e todas são desativadas por predefinição.

A visualização expandida separa informações atuais dos controlos de configuração. Leituras ativadas aparecem num grupo compacto responsivo abaixo do mapa de temperatura/humidade e escala de CO2. Cada item contém valor atual ou estado de disponibilidade e ajuda acessível; nunca contém interruptor ou seletor de fonte. Leituras desativadas não deixam cartões ou espaços vazios.

Todos os controlos ficam em **Configuração de conforto**, fechada por predefinição para priorizar a avaliação atual. Suas secções compactas separam fontes, modelo, preferências específicas, recomendações e informações adicionais. Controlos de métricas derivadas contêm apenas ativação e seleção de fonte, sem duplicar a leitura atual. O painel continua disponível com a monitorização desativada, permitindo preparar a zona antes de a ativar. Abrir ou fechar é uma escolha local da interface, não guardada como configuração.

Cada métrica é desativada por predefinição e tem um seletor de fonte. A primeira opção é **Calculated by Velair**; as demais são sensores compatíveis do Home Assistant, portanto uma leitura externa não exige outro controlo de entidade:

- **Calculated by Velair** usa as leituras efetivas de temperatura e humidade já selecionadas para o Conforto da zona. Se a humidade não for monitorizada ou uma entrada estiver indisponível, a leitura calculada é indicada como ausente.
- **Home Assistant entity** lê uma entidade `sensor.*` existente, que pode vir de Thermal Comfort, um template ou outra integração; Thermal Comfort não é obrigatório nem detetado especialmente.

Um sensor independente de ponto de orvalho deve publicar `°C` ou `°F`; o Velair mostra na unidade do dispositivo gerido. Um sensor de humidade absoluta deve publicar `g/m³` ou `mg/m³`; a exibição usa `g/m³`. Um sensor Humidex pode publicar a representação habitual `°C` ou `°F` de entidades de temperatura ou um valor sem unidade. O Velair normaliza para o Humidex canónico sem unidade, inclusive em instalações Fahrenheit.
Leituras válidas são normalizadas, e fontes ausentes, desatualizadas ou inválidas são informadas sem mudar a condição ambiental ou qualidade dos dados existentes. Uma métrica externa ativada pode ser guardada sem entidade selecionada; esse estado incompleto válido aparece como ausente e sobrevive à exportação/importação. Estados `unknown` e `unavailable` são ausentes; valores não numéricos, unidades incompatíveis e humidade absoluta negativa são inválidos.

Essas métricas são apenas informativas. Nunca alteram programação, modo HVAC, alvo, ajuste do Room Assist ou decisão de pré-condicionamento. Em especial, Humidex complementa temperatura e humidade reais sem substituir nenhuma, evitando contar a humidade duas vezes.

<a id="comfort-insights"></a>
## Informações contextuais de conforto

O Velair mantém a condição configurada de temperatura/humidade como resumo principal e agrupa cartões compactos de contexto acima das leituras. Explicam limites de CO2 ultrapassados, aumento significativo de Humidex e oportunidades ou contrapartidas atuais de ventilação, sem repetir a condição nem substituir o mapa ou escala de CO2.

A redação é cautelosa. Humidex aparece como informação contextual apenas quando o calor percebido supera a temperatura do ar em pelo menos 1 °C. CO2 elevado ou má qualidade do ar também pode acrescentar informação. Ponto de orvalho e humidade absoluta continuam a ser leituras úteis, não mensagens permanentes: os seus botões explicam, respetivamente, o limite potencial de condensação em superfícies e a quantidade de vapor. A ajuda está disponível ao passar o ponteiro, pelo foco do teclado ou toque. Leituras ausentes, desatualizadas e inválidas são ignoradas. Dados externos não mudam a condição interna nem o controlo da climatização.

Valores atuais aparecem na linha expandida do separador **Conforto**. A visualização Lovelace usa a mesma apresentação. Quando Conforto está ativado num cartão Velair de um único dispositivo, o resumo expandido inclui cada leitura derivada ativada e atual. O editor também pode incluí-las na linha recolhida de Conforto do estado atual para uma apresentação mais densa. Leituras ausentes, desatualizadas e inválidas permanecem visíveis com o seu estado, sem números antigos ou inventados. Humidex aparece junto à temperatura ambiente com comparação de direção; em Fahrenheit, apenas a diferença é escalada, sem deslocamento de 32. Deltas aparecem também na mensagem contextual a utilizar a unidade da zona e uma casa decimal. Humidex é um índice de calor aparente sem unidade, referenciado a Celsius: não é temperatura física, e o Velair não acrescenta unidade ao seu valor.

Quando Humidex está atual, o seu painel mostra uma escala compacta. Os marcadores identificam temperatura do ar e Humidex, e o intervalo destacado é o intervalo de temperatura configurado. O estado informa se Humidex está abaixo, dentro ou acima; não afirma que a divisão está confortável ou representa um perigo. A escala estende-se 5 °C abaixo e acima para manter diferenças próximas legíveis. Em Fahrenheit, rótulos absolutos são convertidos normalmente e a diferença apenas multiplicada por `9 / 5`; o número Humidex continua sem unidade. Dados ausentes ou inválidos não recebem posição inventada. Ponto de orvalho é descrito de forma neutra em relação ao ar ambiente; humidade absoluta permanece uma leitura neutra de `g/m³`. Definições ficam atrás dos botões acessíveis para manter os painéis compactos.

O resumo principal sempre começa pela Condição ambiental física, com as leituras configuradas de temperatura e humidade. Quando Humidex está ativado e discorda da posição da temperatura do ar no intervalo, um segundo indicador **Humidex** mostra se o calor percebido está abaixo, dentro ou acima do intervalo configurado. A condição física permanece visível, sem ser substituída por uma interpretação derivada. O painel Humidex explica a diferença medida sem chamar a divisão quente, fria ou confortável. Dados derivados ausentes ou inválidos nunca mudam a condição física.

O valor compatível de Condição ambiental descrito abaixo não muda. Automações existentes podem continuar a utilizá-lo; Humidex e o resumo do intervalo são contexto informativo adicional e nunca controlam a climatização.

<a id="indoor-vs-outdoor"></a>
## Ambiente interno e externo

A comparação externa opcional acrescenta contexto sem alterar a condição interna de Conforto. Ative **Indoor vs outdoor** no painel recolhido **Configuração de conforto**, selecione explicitamente um sensor de temperatura exterior e, se quiser, um sensor exterior de humidade. Desativar preserva as escolhas para ativar novamente sem reconfigurar.

O painel em tempo real fica separado do gráfico. Mostra temperaturas interna e externa e a sua diferença, humidades absolutas interna e externa e a humidade relativa que o ar externo teria após atingir a temperatura interna atual, ao aquecer ou arrefecer conforme necessário. As duas áreas são simétricas em ecrãs largos e empilhadas no telemóvel.

Ambos os valores de humidade absoluta vêm diretamente do backend. Se um backend antigo não fornecer o valor interno, a interface o mostra como indisponível, sem reconstruir uma leitura física a partir de diferenças arredondadas.

O Velair pode mostrar uma oportunidade ou contrapartida cautelosa de ventilação fornecida pelo backend, na área partilhada de contexto acima das leituras. Uma oportunidade apenas de temperatura informa explicitamente que o impacto na humidade está indisponível. Leituras ausentes, desatualizadas, inválidas ou não monitorizadas aparecem como estados, não como valores reaproveitados ou comparações falsas.

O Velair também cria um sensor enumerado **Oportunidade de ventilação** por dispositivo. Mantém o resultado atual disponível a painéis e automações após reiniciar, sem alterar o estado compatível de Condição ambiental. Consulte [Oportunidade de ventilação](zone-sensors.pt-pt.md#ventilation-opportunity).

**Ventilation guidance**, no mesmo painel de configuração, permite escolher por zona o tamanho mínimo de uma diferença útil para mostrar esse contexto:

| Configuração | Predefinição | O que filtra |
| --- | --- | --- |
| Temperature difference | `1 °C` / `1.8 °F` | Pequenas diferenças entre temperaturas interna e externa. |
| Adjusted humidity difference | `5` pontos percentuais | Pequenas mudanças projetadas da humidade relativa após o ar externo atingir a temperatura interna. |
| Air-moisture difference | `1 g/m³` | Pequenas diferenças de humidade absoluta que poderiam parecer úteis apenas por causa da temperatura. |

Os controlos de humidade aparecem após selecionar um sensor exterior de humidade. Os seus valores são preservados se o sensor ou a comparação for desativado. Valores menores tornam as orientações mais sensíveis; maiores exigem uma diferença mais clara. Essas margens não substituem os intervalos de Conforto: o ar externo ainda deve levar a divisão em direção ao intervalo relevante.

A função é visual e baseada em eventos. Não abre nem fecha janelas e não altera alvo, modo, programação, pausa ou reforço. O Velair usa apenas as entidades `sensor.*` selecionadas, sem recorrer a dados meteorológicos.

O Velair não cria três entidades intermédias adicionais. Leituras ativadas estão em `derived_metrics` do sensor existente **Condição ambiental**, na API de programação, Diagnóstico e evento `comfort_assessment_changed`. Isto mantém uma única fonte de referência e permite consumir os dados em painéis e automações. Consulte [Condição ambiental](zone-sensors.pt-pt.md#environmental-condition) para estados, atributos, templates defensivos e orientações para escolher a entidade ou evento em automações.

<a id="environmental-conditions"></a>
## Condições ambientais

Temperatura e humidade são classificadas pelos intervalos configurados e combinadas numa condição ambiental compatível:

| Temperatura | Humidade | Condição |
| --- | --- | --- |
| Abaixo do intervalo | Abaixo do intervalo | `Frio e seco` |
| Abaixo do intervalo | No intervalo | `Frio` |
| Abaixo do intervalo | Acima do intervalo | `Frio e húmido` |
| No intervalo | Abaixo do intervalo | `Ar seco` |
| No intervalo | No intervalo | `Confortável` |
| No intervalo | Acima do intervalo | `Húmido` |
| Acima do intervalo | Abaixo do intervalo | `Quente e seco` |
| Acima do intervalo | No intervalo | `Quente` |
| Acima do intervalo | Acima do intervalo | `Quente e húmido` |

Quando há apenas uma métrica útil, o Velair informa o que consegue estabelecer, sem afirmar conforto completo:

- `Temperatura dentro da gama`;
- `Humidade dentro da faixa`;
- `Frio`, `Quente`, `Ar seco` ou `Húmido`.

Sem leituras ambientais úteis, mostra `Sem leituras`. Quando todas as fontes monitorizadas estão desatualizadas, mostra `Leituras desatualizadas`.

<a id="air-quality"></a>
## Qualidade do ar

CO2 permanece separado de temperatura e humidade porque descreve qualidade do ar, não conforto térmico:

- `Bom ar`: abaixo do limite de atenção;
- `CO2 elevado`: igual ou acima do limite de atenção;
- `Má qualidade do ar`: igual ou acima do limite de má qualidade;
- `CO2 indisponível`: uma fonte configurada não pode ser lida agora.

Assim, uma divisão pode mostrar `Quente e húmido` junto a `CO2 elevado`.

<a id="data-quality"></a>
## Qualidade dos dados

O Velair disponibiliza um valor de qualidade dos dados:

- `complete`: todas as métricas monitorizadas têm leitura atual confirmada por uma comunicação recente do Home Assistant;
- `unverified`: todas são utilizáveis, mas pelo menos uma não tem momento de comunicação verificável;
- `partial`: há uma avaliação, mas pelo menos uma leitura está ausente ou desatualizada;
- `stale`: não há leitura atual, e todas as fontes monitorizadas estão desatualizadas;
- `unavailable`: nenhuma leitura atual pode ser usada por outro motivo.

O painel agrupa leituras utilizáveis cuja atualização não pode ser verificada na secção **Atualização de dados** da zona, em vez de repetir a mesma nota em cada métrica derivada. Um cartão Conforto que oculta a configuração mostra um resumo acima das leituras; o Diagnóstico também informa o contexto. A lista recolhida de zonas omite esse estado rotineiro para manter a legibilidade. É uma configuração válida de fonte automática da climatização, não um erro. Leituras ausentes ou desatualizadas ainda mostram aviso na lista.

<a id="visual-status"></a>
## Apresentação do estado

A linha recolhida mostra:

- condição ambiental;
- indicador Humidex separado apenas quando temperatura e Humidex atuais ocupam partes diferentes do intervalo configurado;
- indicadores opcionais de Humidex, ponto de orvalho e humidade absoluta quando o editor do cartão individual ativa leituras recolhidas extras;
- qualidade do ar quando CO2 é monitorizado;
- ícone de aviso para leituras incompletas;
- interruptor de Conforto.

O estado expandido usa:

- a mesma condição ambiental física como título principal;
- mapa de temperatura/humidade quando ambas estão atuais;
- uma escala horizontal quando só temperatura ou humidade está atual;
- escala separada de CO2 quando monitorizado e atual.

O mapa usa nove regiões discretas para frio, calor, secura, humidade e combinações. O alvo destacado acompanha o modelo: retângulo para Intervalos simples, curva calculada pelo backend para Guiado e polígono configurado para Personalizado. Um marcador mostra a posição atual e inclui ambas as leituras no rótulo.

Em escalas de uma só métrica, a secção verde central é o intervalo configurado de conforto. Rótulos mínimo e máximo alinham-se ao início e fim; secções externas contextualizam leituras abaixo ou acima.

<a id="lovelace"></a>
## Lovelace

A visualização Conforto está disponível como cartão Lovelace:

```yaml
type: custom:velair-card
view: comfort
```

O cartão pode ser limitado a dispositivos geridos selecionados:

```yaml
type: custom:velair-card
view: comfort
entities:
  - climate.living_room
  - climate.bedroom
```

Também pode ocultar secções locais da interface quando o painel deve priorizar apenas as leituras que lhe interessam:

```yaml
type: custom:velair-card
view: comfort
show_comfort_configuration: false
show_comfort_temperature: true
show_comfort_humidity: false
show_comfort_co2: true
```

Opções `show_comfort_*` omitidas têm o valor predefinido `true`. Com `show_comfort_configuration` em `false`, o cartão oculta todo o painel de configuração, mas mantém as leituras derivadas ativadas na avaliação visual.

Opções de visibilidade de temperatura, humidade e CO2 afetam apenas os gráficos desse cartão. Não alteram configuração de Conforto, fontes, limites, eventos ou sensores do Home Assistant. Se temperatura e humidade estiverem visíveis, mas só houver uma leitura atual, o cartão usa a mesma escala de métrica única do painel principal.

<a id="freshness"></a>
## Atualização das leituras

`Obsoleto depois` é o tempo máximo desde que um sensor selecionado comunicou o seu estado ao Home Assistant (`last_reported`). Repetir o mesmo valor atualiza o momento da comunicação e mantém a leitura atual. O Velair observa essas comunicações e agenda a próxima expiração para que painel, sensores e eventos possam mostrar `stale` quando o prazo termina sem nova comunicação.

A configuração fica na sua própria secção **Atualização de dados**, após os controlos de fontes. Esta também agrupa leituras atuais com atualização não verificável, incluindo métricas derivadas ativadas e sensores externos, sem repetir valores externos calculados. Lista fontes diretas abrangidas pelo limite, incluindo Room Assist, CO2, sensores externos ou métricas derivadas externas. Sensores externos podem mantê-la ativa mesmo se temperatura e humidade internas vierem do dispositivo; o limite não expira essas leituras do dispositivo. Pode ser definida antes de ativar Conforto. Sem fonte direta configurada, o campo é desativado com explicação, preservando o valor guardado para uma futura seleção.

Atributos automáticos de temperatura e humidade de `climate.*` não têm momento de comunicação independente. O Velair mantém um valor válido visível e marca a atualização como `unverified`; mudar o alvo do dispositivo não verifica uma nova medição. Escolha o sensor original de temperatura ou humidade quando disponível. Se um sensor selecionado não tiver `last_reported`, o seu valor válido também é `unverified`. Uma entidade `unavailable` ou `unknown` não fornece leitura utilizável, mesmo com atributos numéricos antigos.

Uma comunicação do Home Assistant não comprova que o sensor físico mediu novamente. Uma integração que informa apenas mudanças de valor acabará marcada como desatualizada se o valor permanecer constante.

<a id="automation-event"></a>
## Evento de automação

Quando condição ambiental, qualidade do ar, qualidade dos dados, problemas dos dados ou estado semântico de uma métrica derivada ativada muda, o Velair emite:

```yaml
event_type: velair_event
event_data:
  event: comfort_assessment_changed
```

Exemplo de dados enviados:

```json
{
  "domain": "velair",
  "event": "comfort_assessment_changed",
  "entity_id": "climate.living_room",
  "condition": "cold_and_humid",
  "air_quality": "elevated",
  "data_quality": "complete",
  "data_issues": [],
  "range_summary": {
    "status": "outside_range",
    "thermal_relation": "not_evaluated",
    "positions": {
      "temperature": "below",
      "humidity": "above",
      "humidex": null
    }
  },
  "previous_range_summary": {
    "status": "within_range",
    "thermal_relation": "not_evaluated",
    "positions": {
      "temperature": "within",
      "humidity": "within",
      "humidex": null
    }
  },
  "range_summary_changed": true,
  "range_status_changed": true,
  "temperature": {
    "metric": "temperature",
    "availability": "current",
    "freshness": "reported",
    "condition": "cold",
    "source": "sensor",
    "entity_id": "sensor.living_room_temperature",
    "value": 18.7,
    "min": 20.0,
    "max": 24.0
  },
  "humidity": {
    "metric": "humidity",
    "availability": "current",
    "freshness": "reported",
    "condition": "humid",
    "source": "sensor",
    "entity_id": "sensor.living_room_humidity",
    "value": 68,
    "min": 40,
    "max": 60
  },
  "co2": {
    "metric": "co2",
    "availability": "current",
    "freshness": "reported",
    "condition": "elevated",
    "source": "sensor",
    "entity_id": "sensor.living_room_co2",
    "value": 1200,
    "attention": 1000,
    "max": 1500
  },
  "derived_metrics": {
    "dew_point": {
      "metric": "dew_point",
      "availability": "current",
      "freshness": "reported",
      "source": "velair",
      "entity_id": null,
      "value": 12.9,
      "unit": "°C",
      "issues": [],
      "input_entity_ids": [
        "sensor.living_room_temperature",
        "sensor.living_room_humidity"
      ]
    }
  }
}
```

Exemplo de automação:

```yaml
automation:
  - alias: "Velair poor air quality"
    triggers:
      - trigger: event
        event_type: velair_event
        event_data:
          event: comfort_assessment_changed
          air_quality: poor
    actions:
      - action: notify.mobile_app_phone
        data:
          message: >
            Poor air quality in {{ trigger.event.data.entity_id }}:
            {{ trigger.event.data.co2.value | round(0) }} ppm
```

Abrir ou atualizar o painel não emite um evento de automação. Mudanças numéricas de leituras originais ou derivadas não emitem duplicados enquanto as suas classificações semânticas e disponibilidade permanecem iguais. O painel e atributos dos sensores ainda atualizam os valores mais recentes.

Use `range_status_changed: true` para reagir apenas quando o estado agregado do intervalo configurado muda. Use `range_summary_changed: true` quando posições individuais ou a sua relação térmica também importam. Outras mudanças de Conforto podem emitir o mesmo evento com ambos os indicadores `false`; resumos atual e anterior explicitam a transição.

Consulte [Eventos de automação](automation-events.pt-pt.md#comfort-assessment-changed) para os dados completos, campos derivados exatos que participam desse estado semântico e formato partilhado de acionador `velair_event`.

<a id="performance-and-privacy"></a>
## Desempenho e privacidade

Conforto é desativado por predefinição.

Quando desativado para um dispositivo, o Velair não regista observadores de Conforto para esse dispositivo. Quando ativado, observa apenas o dispositivo e sensores selecionados ou resolvidos automaticamente, incluindo fontes externas ativas de métricas derivadas. Métricas nativas reutilizam os observadores existentes de temperatura e humidade. Não há consultas periódicas contínuas.

Todas as leituras e avaliações permanecem locais no Home Assistant.
