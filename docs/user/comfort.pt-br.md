<a id="environmental-comfort"></a>
# Conforto ambiental
<!-- velair-docs:start -->
Traduções: [Original em inglês](comfort.md) · [Español](comfort.es.md) · [Français](comfort.fr.md) · [Deutsch](comfort.de.md) · [Italiano](comfort.it.md) · [Nederlands](comfort.nl.md) · [Polski](comfort.pl.md) · [Português (Brasil)](comfort.pt-br.md) · [Português (Portugal)](comfort.pt-pt.md) · [Русский](comfort.ru.md) · [Status das traduções](../translation-status.md)

<details>
<summary>Status desta tradução</summary>

| Informação | Status |
| --- | --- |
| Versão de referência | 1.9.0-beta.1 |
| Última sincronização | 2026-10-11 |
| Revisão linguística | Tradução assistida por IA |
| Em relação ao original | Sincronizada com o original em inglês. |

</details>

---
<!-- velair-docs:end -->

A faixa padrão de temperatura confortável é `20–24 °C`. Em instalações que usam Fahrenheit, a faixa padrão é `68–75 °F`, com limites arredondados sem casas decimais.

Os limites de conforto usam a unidade configurada no Home Assistant e são migrados ou importados com os demais dados térmicos salvos do Velair. Um sensor que declara a outra unidade tem sua leitura convertida antes da comparação com os limites do dispositivo gerenciado.

O conforto ambiental dá a cada dispositivo gerenciado uma descrição clara do cômodo, em vez de um nível genérico de aviso.

Monitora leituras locais de temperatura, umidade e CO2. Não altera programações nem controla dispositivos automaticamente. O Velair disponibiliza a avaliação no painel, cartões Lovelace e eventos do Home Assistant para que automações decidam como agir.

<a id="sources"></a>
## Fontes

A temperatura usa a primeira fonte disponível nesta ordem:

1. sensor de temperatura selecionado na aba Conforto;
2. sensor do Room Assist configurado para o dispositivo;
3. `current_temperature` da entidade de climatização.

A umidade usa:

1. sensor de umidade selecionado na aba Conforto;
2. atributo de umidade medida `current_humidity` do dispositivo, quando disponível. O atributo `humidity` é uma configuração de alvo, não uma leitura.

A opção padrão `Usar fonte automática` mantém esse comportamento. Selecione `Não monitore a umidade` quando a umidade não deve influenciar a condição ambiental ou qualidade dos dados da zona. A escolha salva do sensor é preservada, mas o Velair não lê nem observa esse sensor enquanto o monitoramento está desabilitado.

O CO2 só é monitorado quando há um sensor de CO2 selecionado.

O ID efetivo da entidade aparece abaixo de cada seletor. Métricas opcionais sem fonte não são tratadas como falhas.

<a id="comfort-models"></a>
## Modelos de conforto

O Velair oferece três formas de descrever a região de temperatura e umidade relativa útil ao cômodo. É um alvo configurado pelo usuário, não uma definição universal ou médica de conforto.

- **Faixas simples** é o padrão. Uma faixa de temperatura e outra de umidade formam a região retangular habitual. Configurações existentes mantêm esse comportamento.
- **Intervalo psicrométrico guiado** usa uma faixa de umidade como referência no ponto médio da faixa de temperatura. O Velair acompanha a relação física entre temperatura e umidade relativa para adaptar essa faixa automaticamente. O gráfico mostra o alvo curvo resultante, em vez de um retângulo. É uma orientação local prática, não uma norma completa de conforto fisiológico.
- **Faixas conforme a temperatura** mantém a faixa térmica, mas permite mínimos e máximos diferentes de umidade nas extremidades fria e quente. O Velair une gradualmente essas faixas, formando uma região de quatro lados inclinada, em vez de um retângulo.

Por exemplo, um cômodo com `20–24 °C` pode aceitar `40–60%` em `20 °C` e `35–50%` em `24 °C`. Em `22 °C`, a avaliação usa o ponto médio: `37.5–55%`. Abaixo ou acima da faixa de temperatura, usa a extremidade mais próxima, sem extrapolar os valores do usuário.

A faixa efetiva atual de umidade aparece abaixo do mapa. A mesma faixa calculada pelo backend orienta condição mostrada, resumo, entidade Condição ambiental, eventos, Diagnóstico e orientações externas opcionais; os clientes não calculam outra interpretação. Se a temperatura atual estiver ausente ou desatualizada, o Velair ainda pode mostrar uma leitura atual de umidade, mas não a classifica nem gera orientações de umidade até calcular a faixa efetiva.

O modo guiado exige uma fonte de umidade identificável, do dispositivo ou de um sensor selecionado do Home Assistant. A opção permanece indisponível até identificar uma. Se a fonte ficar temporariamente indisponível, o Velair mantém modelo e ajustes selecionados e aguarda dados atuais, sem trocar o modelo.

As duas faixas personalizadas de umidade das extremidades podem subir, descer ou permanecer iguais conforme a temperatura muda. O Velair não impõe uma direção porque edifícios e ocupantes diferem. O guiado é a opção compacta quando a mesma porcentagem de umidade relativa não deve ser tratada igualmente em todas as temperaturas. Use o personalizado somente quando medições do cômodo justificarem controlar as duas extremidades.

Antes de personalizar essas faixas, alterar a umidade de Faixas simples mantém ambas alinhadas a ela. Depois de personalizar uma faixa em função da temperatura, o Velair a preserva ao alternar modelos para não perder uma configuração alternativa.

<a id="additional-environmental-information"></a>
## Informações ambientais adicionais

A configuração de Conforto pode adicionar três leituras às informações existentes do dispositivo:

| Leitura | Informação acrescentada |
| --- | --- |
| **Ponto de orvalho** | Indicação compacta de quão próximo o ar está das condições de condensação. Não confirma que ela ocorrerá, pois o Velair não conhece a temperatura de paredes, janelas e outras superfícies. |
| **Umidade absoluta** | Massa de vapor de água por metro cúbico de ar, em `g/m³`. Diferentemente da umidade relativa, não é uma porcentagem do nível de saturação. O Velair não aplica uma faixa universal boa/ruim. |
| **Humidex** | Valor adicional de calor percebido, derivado de temperatura e umidade. O Velair mostra o valor, mas não transforma suas faixas publicadas em recomendações nem o usa como pontuação completa de conforto interno. |

Habilite apenas leituras úteis ao painel ou automações. Não são necessárias para a condição normal de Conforto, e todas são desabilitadas por padrão.

A visualização expandida separa informações atuais dos controles de configuração. Leituras habilitadas aparecem em um grupo compacto responsivo abaixo do mapa de temperatura/umidade e escala de CO2. Cada item contém valor atual ou estado de disponibilidade e ajuda acessível; nunca contém interruptor ou seletor de fonte. Leituras desabilitadas não deixam cartões ou espaços vazios.

Todos os controles ficam em **Configuração de conforto**, fechada por padrão para priorizar a avaliação atual. Suas seções compactas separam fontes, modelo, preferências específicas, recomendações e informações adicionais. Controles de métricas derivadas contêm apenas habilitação e seleção de fonte, sem duplicar a leitura atual. O painel continua disponível com o monitoramento desabilitado, permitindo preparar a zona antes de habilitá-la. Abrir ou fechar é uma escolha local da interface, não salva como configuração.

Cada métrica é desabilitada por padrão e tem um seletor de fonte. A primeira opção é **Calculated by Velair**; as demais são sensores compatíveis do Home Assistant, portanto uma leitura externa não exige outro controle de entidade:

- **Calculated by Velair** usa as leituras efetivas de temperatura e umidade já selecionadas para o Conforto da zona. Se a umidade não for monitorada ou uma entrada estiver indisponível, a leitura calculada é indicada como ausente.
- **Home Assistant entity** lê uma entidade `sensor.*` existente, que pode vir de Thermal Comfort, um template ou outra integração; Thermal Comfort não é obrigatório nem detectado especialmente.

Um sensor externo de ponto de orvalho deve publicar `°C` ou `°F`; o Velair mostra na unidade do dispositivo gerenciado. Um sensor de umidade absoluta deve publicar `g/m³` ou `mg/m³`; a exibição usa `g/m³`. Um sensor Humidex pode publicar a representação habitual `°C` ou `°F` de entidades de temperatura ou um valor sem unidade. O Velair normaliza para o Humidex canônico sem unidade, inclusive em instalações Fahrenheit.
Leituras válidas são normalizadas, e fontes ausentes, desatualizadas ou inválidas são informadas sem mudar a condição ambiental ou qualidade dos dados existentes. Uma métrica externa habilitada pode ser salva sem entidade selecionada; esse estado incompleto válido aparece como ausente e sobrevive à exportação/importação. Estados `unknown` e `unavailable` são ausentes; valores não numéricos, unidades incompatíveis e umidade absoluta negativa são inválidos.

Essas métricas são apenas informativas. Nunca alteram programação, modo HVAC, alvo, ajuste do Room Assist ou decisão de pré-condicionamento. Em especial, Humidex complementa temperatura e umidade reais sem substituir nenhuma, evitando contar a umidade duas vezes.

<a id="comfort-insights"></a>
## Informações contextuais de conforto

O Velair mantém a condição configurada de temperatura/umidade como resumo principal e agrupa cartões compactos de contexto acima das leituras. Explicam limites de CO2 ultrapassados, aumento significativo de Humidex e oportunidades ou contrapartidas atuais de ventilação, sem repetir a condição nem substituir o mapa ou escala de CO2.

A redação é cautelosa. Humidex aparece como informação contextual somente quando o calor percebido supera a temperatura do ar em pelo menos 1 °C. CO2 elevado ou ruim também pode acrescentar informação. Ponto de orvalho e umidade absoluta continuam sendo leituras úteis, não mensagens permanentes: seus botões explicam, respectivamente, o limite potencial de condensação em superfícies e a quantidade de vapor. A ajuda está disponível ao passar o ponteiro, pelo foco do teclado ou toque. Leituras ausentes, desatualizadas e inválidas são ignoradas. Dados externos não mudam a condição interna nem o controle da climatização.

Valores atuais aparecem na linha expandida da aba **Conforto**. A visualização Lovelace usa a mesma apresentação. Quando Conforto está habilitado em um cartão Velair de um único dispositivo, o resumo expandido inclui cada leitura derivada habilitada e atual. O editor também pode incluí-las na linha recolhida de Conforto do estado atual para uma apresentação mais densa. Leituras ausentes, desatualizadas e inválidas permanecem visíveis com seu estado, sem números antigos ou inventados. Humidex aparece junto à temperatura ambiente com comparação de direção; em Fahrenheit, apenas a diferença é escalada, sem deslocamento de 32. Deltas aparecem também na mensagem contextual usando a unidade da zona e uma casa decimal. Humidex é um índice de calor aparente sem unidade, referenciado a Celsius: não é temperatura física, e o Velair não acrescenta unidade ao seu valor.

Quando Humidex está atual, seu painel mostra uma escala compacta. Os marcadores identificam temperatura do ar e Humidex, e a faixa destacada é a temperatura configurada. O estado informa se Humidex está abaixo, dentro ou acima; não afirma que o cômodo está confortável ou perigoso. A escala se estende 5 °C abaixo e acima para manter diferenças próximas legíveis. Em Fahrenheit, rótulos absolutos são convertidos normalmente e a diferença apenas multiplicada por `9 / 5`; o número Humidex continua sem unidade. Dados ausentes ou inválidos não recebem posição inventada. Ponto de orvalho é descrito de forma neutra em relação ao ar ambiente; umidade absoluta permanece uma leitura neutra de `g/m³`. Definições ficam atrás dos botões acessíveis para manter os painéis compactos.

O resumo principal sempre começa pela Condição ambiental física, com as leituras configuradas de temperatura e umidade. Quando Humidex está habilitado e discorda da posição da temperatura do ar na faixa, um segundo indicador **Humidex** mostra se o calor percebido está abaixo, dentro ou acima da faixa configurada. A condição física permanece visível, sem ser substituída por uma interpretação derivada. O painel Humidex explica a diferença medida sem chamar o cômodo de quente, frio ou confortável. Dados derivados ausentes ou inválidos nunca mudam a condição física.

O valor compatível de Condição ambiental descrito abaixo não muda. Automações existentes podem continuar usando-o; Humidex e o resumo da faixa são contexto informativo adicional e nunca controlam a climatização.

<a id="indoor-vs-outdoor"></a>
## Ambiente interno e externo

A comparação externa opcional acrescenta contexto sem alterar a condição interna de Conforto. Habilite **Outdoor comparison** no painel recolhido **Configuração de conforto**, selecione explicitamente um sensor de temperatura externa e, se quiser, um sensor externo de umidade. Desabilitar preserva as escolhas para habilitar novamente sem reconfigurar.

O painel em tempo real fica separado do gráfico. Mostra temperaturas interna e externa e sua diferença, umidades absolutas interna e externa e a umidade relativa que o ar externo teria após atingir a temperatura interna atual, ao aquecer ou resfriar conforme necessário. As duas áreas são simétricas em telas amplas e empilhadas no celular.

Ambos os valores de umidade absoluta vêm diretamente do backend. Se um backend antigo não fornecer o valor interno, a interface o mostra como indisponível, sem reconstruir uma leitura física a partir de diferenças arredondadas.

O Velair pode mostrar uma oportunidade ou contrapartida cautelosa de ventilação fornecida pelo backend, na área compartilhada de contexto acima das leituras. Uma oportunidade apenas de temperatura informa explicitamente que o impacto na umidade está indisponível. Leituras ausentes, desatualizadas, inválidas ou não monitoradas aparecem como estados, não como valores reaproveitados ou comparações falsas.

O Velair também cria um sensor enumerado **Oportunidade de ventilação** por dispositivo. Mantém o resultado atual disponível a painéis e automações após reiniciar, sem alterar o estado compatível de Condição ambiental. Consulte [Oportunidade de ventilação](zone-sensors.pt-br.md#ventilation-opportunity).

**Ventilation guidance**, no mesmo painel de configuração, permite escolher por zona o tamanho mínimo de uma diferença útil para mostrar esse contexto:

| Configuração | Padrão | O que filtra |
| --- | --- | --- |
| Temperature difference | `1 °C` / `1.8 °F` | Pequenas diferenças entre temperaturas interna e externa. |
| Adjusted humidity difference | `5` pontos percentuais | Pequenas mudanças projetadas da umidade relativa após o ar externo atingir a temperatura interna. |
| Air-moisture difference | `1 g/m³` | Pequenas diferenças de umidade absoluta que poderiam parecer úteis apenas por causa da temperatura. |

Os controles de umidade aparecem após selecionar um sensor externo de umidade. Seus valores são preservados se o sensor ou a comparação for desabilitado. Valores menores tornam as orientações mais sensíveis; maiores exigem uma diferença mais clara. Essas margens não substituem as faixas de Conforto: o ar externo ainda deve levar o cômodo em direção à faixa relevante.

A função é visual e acionada por eventos. Não abre nem fecha janelas e não altera alvo, modo, programação, pausa ou reforço. O Velair usa apenas as entidades `sensor.*` selecionadas, sem recorrer a dados meteorológicos.

O Velair não cria três entidades intermediárias adicionais. Leituras habilitadas estão em `derived_metrics` do sensor existente **Condição ambiental**, na API de programação, Diagnóstico e evento `comfort_assessment_changed`. Isso mantém uma única fonte de referência e permite consumir os dados em painéis e automações. Consulte [Condição ambiental](zone-sensors.pt-br.md#environmental-condition) para estados, atributos, templates defensivos e orientações para escolher a entidade ou evento em automações.

<a id="environmental-conditions"></a>
## Condições ambientais

Temperatura e umidade são classificadas pelas faixas configuradas e combinadas em uma condição ambiental compatível:

| Temperatura | Umidade | Condição |
| --- | --- | --- |
| Abaixo da faixa | Abaixo da faixa | `Frio e seco` |
| Abaixo da faixa | Na faixa | `Frio` |
| Abaixo da faixa | Acima da faixa | `Frio e úmido` |
| Na faixa | Abaixo da faixa | `Ar seco` |
| Na faixa | Na faixa | `Confortável` |
| Na faixa | Acima da faixa | `Úmido` |
| Acima da faixa | Abaixo da faixa | `Quente e seco` |
| Acima da faixa | Na faixa | `Quente` |
| Acima da faixa | Acima da faixa | `Quente e úmido` |

Quando há apenas uma métrica útil, o Velair informa o que consegue estabelecer, sem afirmar conforto completo:

- `Temperatura dentro da faixa`;
- `Umidade dentro da faixa`;
- `Frio`, `Quente`, `Ar seco` ou `Úmido`.

Sem leituras ambientais úteis, mostra `Sem leituras`. Quando todas as fontes monitoradas estão desatualizadas, mostra `Leituras desatualizadas`.

<a id="air-quality"></a>
## Qualidade do ar

CO2 permanece separado de temperatura e umidade porque descreve qualidade do ar, não conforto térmico:

- `Bom ar`: abaixo do limite de atenção;
- `CO2 elevado`: igual ou acima do limite de atenção;
- `Má qualidade do ar`: igual ou acima do limite ruim;
- `CO2 indisponível`: uma fonte configurada não pode ser lida agora.

Assim, um cômodo pode mostrar `Quente e úmido` junto a `CO2 elevado`.

<a id="data-quality"></a>
## Qualidade dos dados

O Velair disponibiliza um valor de qualidade dos dados:

- `complete`: todas as métricas monitoradas têm leitura atual respaldada por um informe recente do Home Assistant;
- `unverified`: todas são utilizáveis, mas pelo menos uma não tem horário verificável de informe;
- `partial`: há uma avaliação, mas pelo menos uma leitura está ausente ou desatualizada;
- `stale`: não há leitura atual, e todas as fontes monitoradas estão desatualizadas;
- `unavailable`: nenhuma leitura atual pode ser usada por outro motivo.

O painel agrupa leituras utilizáveis cuja atualização não pode ser verificada na seção **Atualização de dados** da zona, em vez de repetir a mesma nota em cada métrica derivada. Um cartão Conforto que oculta a configuração mostra um resumo acima das leituras; o Diagnóstico também informa o contexto. A lista recolhida de zonas omite esse estado rotineiro para manter a legibilidade. É uma configuração válida de fonte automática da climatização, não um erro. Leituras ausentes ou desatualizadas ainda mostram aviso na lista.

<a id="visual-status"></a>
## Apresentação do estado

A linha recolhida mostra:

- condição ambiental;
- indicador Humidex separado somente quando temperatura e Humidex atuais ocupam partes diferentes da faixa configurada;
- indicadores opcionais de Humidex, ponto de orvalho e umidade absoluta quando o editor do cartão individual habilita leituras recolhidas extras;
- qualidade do ar quando CO2 é monitorado;
- ícone de aviso para leituras incompletas;
- interruptor de Conforto.

O estado expandido usa:

- a mesma condição ambiental física como título principal;
- mapa de temperatura/umidade quando ambas estão atuais;
- uma escala horizontal quando só temperatura ou umidade está atual;
- escala separada de CO2 quando monitorado e atual.

O mapa usa nove regiões discretas para frio, calor, secura, umidade e combinações. O alvo destacado acompanha o modelo: retângulo para Faixas simples, curva calculada pelo backend para Guiado e polígono configurado para Personalizado. Um marcador mostra a posição atual e inclui ambas as leituras no rótulo.

Em escalas de uma só métrica, a seção verde central é a faixa configurada de conforto. Rótulos mínimo e máximo se alinham ao início e fim; seções externas contextualizam leituras abaixo ou acima.

<a id="lovelace"></a>
## Lovelace

A visualização Conforto está disponível como cartão Lovelace:

```yaml
type: custom:velair-card
view: comfort
```

O cartão pode ser limitado a dispositivos gerenciados selecionados:

```yaml
type: custom:velair-card
view: comfort
entities:
  - climate.living_room
  - climate.bedroom
```

Também pode ocultar seções locais da interface quando o painel deve priorizar apenas as leituras importantes para você:

```yaml
type: custom:velair-card
view: comfort
show_comfort_configuration: false
show_comfort_temperature: true
show_comfort_humidity: false
show_comfort_co2: true
```

Opções `show_comfort_*` omitidas têm padrão `true`. Com `show_comfort_configuration` em `false`, o cartão oculta todo o painel de configuração, mas mantém as leituras derivadas habilitadas na avaliação visual.

Opções de visibilidade de temperatura, umidade e CO2 afetam somente os gráficos desse cartão. Não alteram configuração de Conforto, fontes, limites, eventos ou sensores do Home Assistant. Se temperatura e umidade estiverem visíveis, mas só houver uma leitura atual, o cartão usa a mesma escala de métrica única do painel principal.

<a id="freshness"></a>
## Atualização das leituras

`Obsoleto depois` é o tempo máximo desde que um sensor selecionado informou seu estado ao Home Assistant (`last_reported`). Repetir o mesmo valor atualiza o horário do informe e mantém a leitura atual. O Velair observa esses informes e agenda a próxima expiração para que painel, sensores e eventos possam mostrar `stale` quando o prazo termina sem novo informe.

A configuração fica em sua própria seção **Atualização de dados**, após os controles de fontes. Ela também agrupa leituras atuais com atualização não verificável, incluindo métricas derivadas habilitadas e sensores externos, sem repetir valores externos calculados. Lista fontes diretas abrangidas pelo limite, incluindo Room Assist, CO2, sensores externos ou métricas derivadas externas. Sensores externos podem mantê-la ativa mesmo se temperatura e umidade internas vierem do dispositivo; o limite não expira essas leituras do dispositivo. Pode ser definida antes de habilitar Conforto. Sem fonte direta configurada, o campo é desabilitado com explicação, preservando o valor salvo para uma futura seleção.

Atributos automáticos de temperatura e umidade de `climate.*` não têm horário independente de informe. O Velair mantém um valor válido visível e marca a atualização como `unverified`; mudar o alvo do dispositivo não verifica uma nova medição. Escolha o sensor original de temperatura ou umidade quando disponível. Se um sensor selecionado não tiver `last_reported`, seu valor válido também é `unverified`. Uma entidade `unavailable` ou `unknown` não fornece leitura utilizável, mesmo com atributos numéricos antigos.

Um informe do Home Assistant não comprova que o sensor físico mediu novamente. Uma integração que informa apenas mudanças de valor acabará marcada como desatualizada se o valor permanecer constante.

<a id="automation-event"></a>
## Evento de automação

Quando condição ambiental, qualidade do ar, qualidade dos dados, problemas dos dados ou estado semântico de uma métrica derivada habilitada muda, o Velair emite:

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

Abrir ou atualizar o painel não emite um evento de automação. Mudanças numéricas de leituras originais ou derivadas não emitem duplicatas enquanto suas classificações semânticas e disponibilidade permanecem iguais. O painel e atributos dos sensores ainda atualizam os valores mais recentes.

Use `range_status_changed: true` para reagir apenas quando o estado agregado da faixa configurada muda. Use `range_summary_changed: true` quando posições individuais ou sua relação térmica também importam. Outras mudanças de Conforto podem emitir o mesmo evento com ambos os indicadores `false`; resumos atual e anterior explicitam a transição.

Consulte [Eventos de automação](automation-events.pt-br.md#comfort-assessment-changed) para os dados completos, campos derivados exatos que participam desse estado semântico e padrão compartilhado de gatilho `velair_event`.

<a id="performance-and-privacy"></a>
## Desempenho e privacidade

Conforto é desabilitado por padrão.

Quando desabilitado para um dispositivo, o Velair não registra observadores de Conforto para ele. Habilitado, observa somente o dispositivo e sensores selecionados ou resolvidos automaticamente, incluindo fontes externas ativas de métricas derivadas. Métricas nativas reutilizam os observadores existentes de temperatura e umidade. Não há consultas periódicas contínuas.

Todas as leituras e avaliações permanecem locais no Home Assistant.
