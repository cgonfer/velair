<a id="usage-guide"></a>
# Guia de uso
<!-- velair-docs:start -->
Traduções: [Original em inglês](usage.md) · [Español](usage.es.md) · [Français](usage.fr.md) · [Deutsch](usage.de.md) · [Italiano](usage.it.md) · [Nederlands](usage.nl.md) · [Polski](usage.pl.md) · [Português (Brasil)](usage.pt-br.md) · [Português (Portugal)](usage.pt-pt.md) · [Русский](usage.ru.md) · [Status das traduções](../translation-status.md)

<details>
<summary>Status desta tradução</summary>

| Informação | Status |
| --- | --- |
| Versão de referência | 1.9.0-beta.4 |
| Última sincronização | 2026-10-21 |
| Revisão linguística | Tradução assistida por IA |
| Em relação ao original | Sincronizada com o original em inglês. |

</details>

---
<!-- velair-docs:end -->

Este guia explica o Velair do ponto de vista de quem usa o Home Assistant.

<a id="panel-navigation-and-direct-links"></a>
## Navegação do painel e links diretos

O painel da barra lateral atualiza sua URL quando você muda de aba ou alterna entre as subseções de Programações e Modelos. Atualizar a página ou abrir uma URL copiada restaura essa seção. Os botões Voltar e Avançar do navegador também acompanham essa navegação.

| Seção | Caminho |
| --- | --- |
| Visão geral | `/velair` |
| Programações: Padrão | `/velair/schedules/default` |
| Programações: Perfis | `/velair/schedules/profiles` |
| Modos | `/velair/modes` |
| Modelos: Modelos | `/velair/templates/templates` |
| Modelos: Predefinições climáticas | `/velair/templates/presets` |
| Sensores | `/velair/sensors` |
| Conforto | `/velair/comfort` |
| Pré-condicionamento | `/velair/preconditioning` |
| Retorno planejado | `/velair/planned-return` |
| Diagnóstico | `/velair/diagnostics` |
| Configurações | `/velair/settings` |

Use esses caminhos em ações de navegação dos painéis do Home Assistant ou acrescente-os ao endereço do seu Home Assistant para criar um link completo. Abrir um link seleciona uma seção; não ativa um modo nem altera as configurações de climatização.

Por exemplo, um botão do painel pode abrir a biblioteca de predefinições climáticas:

```yaml
type: button
name: Velair climate presets
icon: mdi:thermometer-lines
tap_action:
  action: navigate
  navigation_path: /velair/templates/presets
```

Altere `navigation_path` para qualquer caminho da tabela. Isso usa a [ação de navegação de painel](https://www.home-assistant.io/dashboards/actions/) padrão do Home Assistant. Para um favorito ou um link em outro aplicativo, use o endereço do seu Home Assistant seguido do caminho, por exemplo, `https://your-home-assistant.example/velair/schedules/profiles`.

`/velair/schedules` abre Padrão e `/velair/templates` abre Modelos. `/velair/preconditioning` abre Pré-condicionamento adaptativo e `/velair/planned-return` abre Retorno planejado. Os antigos caminhos `/velair/preconditioning/preconditioning` e `/velair/preconditioning/planned-return` continuam abrindo suas abas correspondentes. `/velair/overview` abre Visão geral, e o caminho antigo `/velair/profiles` abre Modos. Uma subseção desconhecida abre a subseção padrão da aba; uma aba desconhecida abre Visão geral. Esses caminhos são normalizados sem adicionar uma entrada ao histórico.

Os links não preservam a seleção de um termostato, dia da semana, perfil, modelo ou preset específico. Alterações não salvas não são recuperadas após atualizar a página. As confirmações de descarte existentes continuam sendo usadas quando a navegação descartaria alterações não salvas; cancelar mantém a seção e a URL atuais. Os cartões Lovelace opcionais mantêm as URLs dos seus painéis.

Enquanto o painel da barra lateral está aberto, suas abas compartilham os últimos dados confirmados pelo backend. Após o primeiro carregamento, mudar de aba não repete essa carga inicial. As atualizações continuam durante a navegação, e as confirmações existentes de alterações não salvas continuam valendo. Atualizar a página carrega os dados novamente e não recupera rascunhos. Os cartões Lovelace opcionais usam uma sessão separada da sessão do painel. Cartões montados na mesma conexão do Home Assistant compartilham o carregamento inicial e as atualizações em tempo real, mas mantêm seus próprios controles e alterações não salvas. O Lovelace pode manter cartões montados quando você visita outra visualização do painel, permitindo voltar sem carregá-los novamente. A sessão compartilhada termina quando o último cartão é desmontado; atualizar a página inicia uma nova carga. Não é necessário alterar o YAML.

<a id="help-and-documentation"></a>
## Ajuda e documentação

Abra **Configurações → Ajuda e comunidade** para consultar a documentação, relatar um problema no GitHub Issues ou compartilhar perguntas e sugestões em Discussions. Use o ícone de ajuda ao lado do título de uma seção ou à direita de uma opção de submenu para abrir uma explicação breve e o link **Abrir guia**. Abrir a ajuda de uma opção de submenu não a seleciona nem altera suas edições. A explicação e o guia correspondem àquela opção, mesmo quando ela não é a seção ativa. Em Configurações, o ícone de ajuda de **Ajustes externos** também oferece seu guia. Os ícones de ajuda usam o mesmo símbolo de interrogação e ganham destaque ao passar o mouse; os ícones de informação continuam oferecendo explicações breves sobre os campos. Feche a janela de ajuda com seu botão de fechar, Escape ou um clique fora dela; o foco do teclado volta ao ícone de ajuda.

As explicações breves continuam disponíveis dentro do Velair em todos os idiomas de interface suportados, inclusive sem conexão com a Internet. Os links dos guias usam o idioma do seu Home Assistant quando há uma tradução disponível e recorrem ao inglês individualmente para cada guia. O link só mostra **Em inglês** quando o inglês é usado por falta de tradução no seu idioma. Os guias traduzidos mostram o estado de sincronização com o original e de revisão linguística, com um link para o original em inglês quando há alterações pendentes. Builds de versões publicadas abrem a documentação da tag correspondente à versão; builds de desenvolvimento abrem a documentação atual de `main`. Os links de documentação e comunidade abrem o GitHub em uma nova aba e só precisam de acesso à Internet quando são abertos; eles não enviam diagnósticos nem configurações locais automaticamente.

<a id="concepts"></a>
## Conceitos

O Velair gerencia programações para as entidades `climate.*` selecionadas na configuração da integração. Cada entidade selecionada é uma zona de climatização gerenciada.

Uma programação é formada por blocos distribuídos pelos dias da semana. Um bloco começa em um horário específico e pode:

- definir uma temperatura-alvo, opcionalmente com um modo HVAC e opções de climatização suportadas, como modo de ventilação, modo preset, oscilação, oscilação horizontal ou umidade-alvo;
- definir uma ou mais opções de climatização suportadas sem enviar uma temperatura-alvo nem alterar o modo HVAC;
- alterar apenas o modo HVAC e deixar a temperatura-alvo sob o controle do aparelho;
- desligar a entidade de climatização.

Um bloco permanece ativo até o início do próximo bloco da programação semanal. Isso inclui a meia-noite e os dias sem blocos: antes do primeiro bloco de um dia, o Velair mantém o bloco mais recente de um dia anterior. A linha do tempo mostra esse período herdado separadamente, deixando claro onde o bloco foi configurado originalmente.

<a id="external-adjustments-and-manual-adjustment"></a>
## Ajustes externos e ajuste manual

Cada zona pode escolher o que o Velair faz quando seu modo HVAC ou temperatura de ajuste muda fora do Velair, por exemplo, por um cartão de climatização do Home Assistant, um controle remoto infravermelho ou outra automação. Configure **Ajustes externos** na linha de cada termostato gerenciado em **Configurações**:

- **Manter automático** é o padrão e reaplica a intenção de controle atual do Velair.
- **Até o próximo bloco** respeita o ajuste até começar o próximo bloco efetivo.
- **Por um período** retoma após o número de minutos configurado.
- **Até ser retomado** aguarda uma ação explícita.

Enquanto o Velair cede o controle, Visão geral seleciona **Ajuste manual** no controle permanente Automático/Manual. Isso não é o modo **Manual** do Velair: o modo Manual descreve como os perfis foram selecionados, enquanto Ajuste manual descreve quem controla um termostato naquele momento. Retomar reaplica a programação do perfil ativo, a programação Padrão ou outra intenção de controle atual do agendador. Outros motivos independentes de pausa continuam valendo.

Visão geral seleciona **Agendamento automático** enquanto o Velair controla o termostato. Selecione **Ajuste manual** para manter o estado atual sem precisar alterar o aparelho primeiro; isso usa a política manual já salva em Configurações. Se **Manter automático** estiver salvo, uma ação manual explícita mantém o controle manual até a retomada, sem alterar essa configuração. A mesma operação está disponível em `velair.enter_manual_adjustment`; ela captura o estado atual de aquecimento, resfriamento, desligado ou faixa nativa e aceita apenas o ID da entidade de climatização.

Com **Manter automático**, o Room Assist recalcula e reaplica a temperatura-alvo pela qual é responsável. Com uma política manual, ele cede o controle sem restaurar sua correção programada. São suportadas tanto temperaturas únicas quanto faixas nativas.

O guia completo explica os limites de detecção, cada política, ajustes repetidos, perfis e modos, prioridade de reforços e pausas, comportamento após reinicialização, YAML exato de serviços/eventos e exemplos cronológicos passo a passo. Consulte [Alterações externas e ajuste manual](manual-control.pt-br.md).

O Velair calcula os próximos eventos no backend e agenda callbacks únicos no momento exato pelo Home Assistant. O frontend recebe atualizações do backend por WebSocket, sem precisar de consultas contínuas.

Durante um episódio de Retorno planejado, Visão geral mostra um resumo compacto da casa com a origem semanal ou pontual, o processo atual e o horário aplicável de confirmação ou chegada. Usa o fundo habitual de cartão do tema, com borda violeta discreta e ícone principal de retorno; outros ícones mantêm a cor do texto ao redor. Um retorno futuro aceito adiciona contagens de preparação como ícones com ajuda por mouse, teclado e toque. Saídas confirmadas mostram uma linha do tempo compacta somente de leitura com horários e Modos de saída/chegada, ao lado do resumo quando há espaço ou abaixo em contêineres estreitos. Seu botão de navegação abre a aba Retorno planejado; o resumo não duplica os controles de saída. Uma ocorrência pode permanecer visível mesmo sem saída em andamento.

Cada termostato afetado mostra um indicador violeta de Retorno planejado quando o backend informa que a configuração de ausência ou a preparação para a chegada controla a zona naquele momento. Seu estado normal de funcionamento, perfil e informações do Room Assist continuam visíveis. Horários futuros de preparação são previsões, não um sinal de controle ativo. Controle manual, reforços, pausas independentes, programação interrompida e execução externa mantêm sua prioridade. Um termostato que apenas mantém a programação Padrão em um modo de ausência personalizado não recebe um indicador de ausência. O indicador descreve a intenção de controle; não comprova que um comando foi entregue com sucesso nem que o cômodo atingiu a temperatura-alvo.

As informações de preparação são separadas desse indicador de autoridade: cada equipamento pode mostrar seu estado de espera, preparação, alvo atingido, suspensão, indisponibilidade ou ação apenas na chegada, início estimado, alvo de chegada e motivo relevante mesmo quando ainda segue Ausente. Estimativas ausentes não são substituídas por horários inventados. Retornos inativos não mantêm uma prévia futura de preparação.

Quando um termostato gerenciado não publica `target_temp_step`, sua linha em **Configurações** mostra **Etapa** (incremento de temperatura). O Velair usa `1` por padrão e permite informar o incremento positivo real do aparelho. Ele memoriza o último incremento válido informado pelo Home Assistant, para que uma entidade que deixe de publicá-lo não invalide temperaturas-alvo decimais existentes. Um incremento publicado no momento sempre tem prioridade. Salvar um valor manual enquanto o atributo está ausente substitui o valor memorizado como alternativa. Se a entidade voltar a publicar um incremento, o Velair memoriza essa nova escala, embora a alternativa manual continue armazenada.

A seção **Diagnóstico** do painel fornece uma visão somente de leitura do agendador e de cada zona, um histórico limitado à execução atual e um relatório JSON com dados sensíveis removidos para anexar a relatos de problemas. Não adiciona consultas periódicas nem depende do Recorder. No computador, as colunas do registro de execução podem ser redimensionadas durante a sessão atual; suas larguras voltam ao padrão quando o painel é recarregado e nunca são persistidas. No celular, os mesmos eventos usam um layout compacto e responsivo em vez dos controles de redimensionamento.

Diagnóstico também mostra o estado do retorno planejado da residência e a participação efetiva do termostato selecionado, sua estimativa de preparação e eventuais motivos de suspensão. Uma rotina semanal desativada é independente da disponibilidade de retornos pontuais. A categoria **Retorno planejado** do histórico registra planejamento aceito, confirmação, saída, ajustes de chegada, inícios de preparação, conclusão, cancelamento e erros. Ela compartilha o limite existente de 100 eventos e é limpa ao reiniciar; as preferências de categorias continuam salvas. Atualizar qualquer uma das visualizações não adiciona entradas ao histórico. Os relatórios incluem esse contexto, removendo identificadores de modos e perfis mesmo quando IDs de entidades são incluídos explicitamente.

<a id="home-assistant-entities"></a>
## Entidades do Home Assistant

O Velair cria entidades persistentes no Home Assistant que complementam seus eventos de automação transitórios:

- **Próximo evento agendado** é um sensor de data e hora da primeira ação pendente do Velair. Seus atributos incluem todos os eventos no mesmo horário, o horário calculado de aplicação e o horário-alvo original quando o pré-condicionamento adaptativo inicia um bloco antecipadamente.
- **Status do agendador** descreve se o Velair está ocioso, programado, sob uma sobreposição ou pausado. Seus atributos incluem o modo global e o vencimento da pausa. Detalhes de eventos futuros e sobreposições por zona continuam em seus sensores dedicados para evitar duplicar o histórico do Recorder.
- **Status de diagnóstico** é um sensor de diagnóstico enumerado com os estados `ok`, `warning` e `error`. Ele expõe apenas atributos compactos: estado do agendador, contagens de unidades saudáveis/com aviso/com erro, contagens de problemas e códigos de problemas ativos. Assim, a situação atual fica disponível para painéis e automações acionadas por estado sem expor o texto bruto das exceções.
- **Temperatura-alvo ativa** é criada para cada termostato gerenciado. Ela expõe a temperatura-alvo que o Velair gerencia no momento, incluindo reforços e blocos já iniciados pelo pré-condicionamento adaptativo. Sua unidade acompanha a entidade de climatização. Para uma faixa nativa, seu estado numérico único fica indisponível, pois não existe um único valor correto; use os atributos `target_temp_low` e `target_temp_high`.
- **Condição ambiental** é criada para cada termostato gerenciado. Ela expõe estados legíveis como confortável, frio, úmido ou quente e úmido. Mantém a qualidade dos dados e os IDs das entidades de origem como atributos compactos, sem copiar as leituras originais de temperatura ou umidade.
- **Oportunidade de ventilação** é criada para cada termostato gerenciado. Expõe uma avaliação enumerada, conservadora e observacional de se o ar externo pode aproximar o cômodo da zona de conforto configurada. Não abre janelas nem controla a climatização.
- **Qualidade do ar** é criada para cada termostato gerenciado e mantém a avaliação independente de CO2: boa, elevada, ruim, indisponível ou não monitorada.
- **Ajuste temporário** mostra se o termostato está sem sobreposição, com um reforço ativo ou com uma pausa de zona ativa.
- **Controle** é criado para cada termostato gerenciado e expõe se o controle local é `automatic`, se há um ajuste manual ativo ou se um provedor externo de programações é responsável pela execução física. Seus atributos fornecem o contexto atual do agendador, perfil, modo e ajuste manual.
- **Diagnóstico de entrega** é criado para cada termostato gerenciado como sensor de diagnóstico desativado por padrão. Ele expõe o resultado mais recente da entrega de comandos de climatização na execução atual e a última temperatura-alvo cuja sequência completa de serviços foi aceita pelo Home Assistant, sem texto bruto de erros nem afirmações sobre o que o aparelho físico fez.
- **Início do pré-condicionamento** é um sensor de data e hora com o início calculado do próximo bloco antecipado ou do bloco antecipado ativo. Seus atributos incluem horário-alvo programado, antecedência, direção, origem do modelo, temperatura-alvo e modo HVAC.
- **Room Assist** expõe seu estado de execução atual e um contexto compacto da temperatura-alvo, sem duplicar as leituras originais do cômodo e do termostato.
- **Programação automática** e **Modo** são as entidades de controle editáveis do Velair. Desativar Programação automática interrompe a programação indefinidamente; ativá-la retoma a programação ativa. Selecionar um modo personalizado ativa seus perfis associados, enquanto **Padrão** limpa o conjunto ativo. **Manual** significa que nenhum modo personalizado controla o conjunto de perfis ativos; a ativação direta normalmente leva a esse estado. O Velair o mostra, em vez de oferecê-lo como ação. Use a ação `velair.pause` quando precisar de uma pausa temporária com duração definida.

Essas entidades reutilizam os dados do backend, recebem atualizações via dispatcher e não consultam o Home Assistant periodicamente. Os eventos são úteis para reagir a transições; as entidades são úteis quando uma automação ou um painel precisa consultar o estado atual. O Room Assist pode ajustar a temperatura-alvo enviada após a aceitação da temperatura de controle; use o sensor dedicado **Room Assist** para obter o contexto desse ajuste aplicado. Consulte [Referência dos sensores](sensors.pt-br.md) para a lista completa dos sensores do Velair, seus principais atributos e exemplos. Consulte [Sensores de controle e entrega da zona](zone-sensors.pt-br.md) para os detalhes dos contratos de controle, conforto, ventilação e entrega.

Quando um termostato é removido das opções da integração Velair, seus sensores de zona gerados são removidos do registro de entidades do Home Assistant ao recarregar. As entidades globais do Velair e as entidades de outras integrações não são afetadas. Adicionar o termostato novamente recria seus sensores com IDs únicos determinísticos.

O Home Assistant escolhe nomes de entidades traduzidos usando o idioma do backend quando a entidade é criada pela primeira vez. Alterar apenas o idioma da interface de um usuário não renomeia entradas existentes no registro. As entidades existentes podem ser renomeadas manualmente pelo Home Assistant sem alterar seu comportamento no Velair.

<a id="open-velair"></a>
## Abrir o Velair

Após a configuração, o Velair aparece na barra lateral do Home Assistant.

O painel da barra lateral é a interface recomendada. O cartão Lovelace opcional é útil para incorporar painéis específicos do Velair a um painel existente.

Nos painéis do tipo Seções, os cartões do Velair usam altura automática para que controles expandidos, zonas adicionais e texto em várias linhas reservem espaço acima do próximo cartão. Se um cartão existente continuar sobrepondo outro após a atualização, verifique seu YAML no painel: remova um valor numérico de `grid_options.rows` ou altere-o para `auto`. As opções de layout salvas têm prioridade sobre os padrões do cartão:

```yaml
grid_options:
  columns: 12
  rows: auto
```

A lista de próximos eventos de Visão geral e os cartões de próximos eventos do dashboard mostram a próxima mudança de controle projetada para cada equipamento gerenciado, incluindo preparação estimada e transições de chegada durante um Retorno planejado confirmado. Todas as linhas compartilham um layout compacto de nome/origem/horário/ação/HVAC, sem subtítulo de estado abaixo do nome. A ajuda informativa final explica a fase e, quando o retorno tem prioridade, mostra o Modo de chegada, detalhes de suspensão e referência semanal atual. A ajuda abre por mouse, foco ou toque. Suspensões explicam bloqueios de maior prioridade em vez de prometer um início bloqueado. Sensores existentes de próximo evento e vistas dedicadas de antecipação semanal mantêm seu significado semanal. Essa previsão é informativa; não muda a execução do agendador nem confirma o envio aos dispositivos.

A visão geral das zonas usa cartões compactos e responsivos para mostrar o que o Velair e o equipamento fazem agora em cada ambiente. Quando a entidade informa `hvac_action`, o resumo usa seu valor atual de aquecimento, resfriamento, desumidificação, ventilação, ocioso, desligado, pré-aquecimento ou descongelamento como estado principal. O mesmo resumo identifica então o estado do Velair — programado, manual, reforço, pausa, pré-condicionamento ou automação desligada —, modo HVAC informado e horários relevantes, sem repetir a atividade em outro indicador. Se `hvac_action` estiver ausente ou inválido, mostra o próprio estado de execução sem deduzir o que o aparelho faz. Cada cartão apresenta primeiro nome e ID da entidade, seguidos de Perfil ativo e indicadores de Room Assist/Conforto/ar/dados, nessa ordem. Em cartões muito largos, esses indicadores e o resumo compacto compartilham o cabeçalho. Em cartões estreitos, incluindo celular e Lovelace compacto, identidade e estado compacto continuam lado a lado, e indicadores de Perfil/Conforto ocupam toda a linha abaixo. Etiquetas de Perfil, retorno, Room Assist e Conforto/ar/dados compartilham tipografia compacta e uma divisão entre ícone/rótulo e valor. Retorno usa roxo discreto; destaques de Conforto continuam distinguindo normal, informação, aviso e erro. Valores longos podem ser encurtados visualmente para preservar a altura compacta; o texto completo permanece disponível por ajuda de mouse, foco ou toque. O resumo usa ícone consistente, texto equilibrado e destaque discreto de atividade, sem título fixo ou selo decorativo externo. Quando Room Assist está ativo ou mantendo a temperatura, os detalhes se agrupam em Temperatura (termostato e depois sensor), Ponto de ajuste (termostato e depois programação) e Desvio, considerando a direção. Valores ausentes são omitidos. Indicadores neutros são discretos; a cor de aviso é reservada para condições que exigem atenção.

O cartão Lovelace suporta os seguintes valores de `view`:

- `climate`;
- `overview-status`;
- `overview-boosts`;
- `overview-events`;
- `overview-timeline`;
- `overview-zones`;
- `active-setup`;
- `schedules`;
- `sensors`;
- `comfort`;
- `preconditioning`;
- `planned-return`;
- `diagnostics`.

<a id="planned-return-card"></a>
### Cartão de retorno planejado

Adicione a qualquer painel os mesmos controles de retorno da residência usados na barra lateral:

```yaml
type: custom:velair-card
view: planned-return
```

Para uma saída normal pendente, uma linha de temporizador explica a verificação de casa vazia e mostra o prazo definido pelo backend no horário local do Home Assistant. O modo de ausência só é ativado após a confirmação, se todas as fontes ainda indicarem ausência. Não há contagem regressiva em tempo real nem linha do tempo da saída antes da confirmação. Com **Aplicar modo Ausente agora**, Ausente e sua linha do tempo começam imediatamente; a confirmação da saída limita separadamente o retorno automático por presença, enquanto a preparação e a chegada programadas permanecem ativas.

O editor visual do cartão chama essa visualização de **Retorno planejado**. Ela mostra apenas os controles compactos de **Retorno pontual** (retorno pontual), com as contagens de fontes ocupadas, vazias e desconhecidas no canto superior direito do cabeçalho. O atraso salvo de confirmação de ausência aparece ali apenas antes de uma ausência ativa confirmada. Sem fontes de ocupação salvas, esses indicadores são omitidos: **Planejar retorno** (planejar retorno) confirma explicitamente a saída e ativa a ausência imediatamente, sem espera. A chegada salva continua controlando a preparação e a ativação da configuração de destino; o Velair não consegue detectar a chegada física sem fontes. Fontes configuradas desconhecidas/indisponíveis mantêm sua espera normal, a menos que **Aplicar modo Ausente agora** esteja selecionado, e a rotina semanal exige fontes. Defina uma data e um horário futuros de retorno antes de sair ou enquanto estiver fora. Um episódio ativo oferece apenas **Cancelar** e **Alterar chegada**. Cancelar interrompe a automação de retorno e restaura a seleção anterior de modo/perfis após a saída confirmada ou uma aplicação manual imediata de Ausente, mesmo antes da confirmação da saída monitorada. Uma confirmação normal pendente não altera a seleção. Por exemplo, partindo de Conforto com um atraso de cinco minutos: cancelar após dois minutos mantém Conforto ativo; cancelar depois de aplicar Ausente restaura Conforto e seus perfis originais. Consulte os [exemplos de cancelamento](planned-return.pt-br.md#cancelling-a-return-examples), incluindo inícios sem sensores, edições de chegada e seleções explícitas de modo. Após a conclusão ou o cancelamento do retorno, o cartão mostra um novo formulário de data/hora, mesmo que a presença da residência ainda indique que todos estão fora. **Planejar retorno** permanece visível, mas desativado quando a configuração salva ou o agendador está indisponível. A barra lateral usa os mesmos botões Cancelar/Alterar chegada e o novo formulário de planejamento. Apenas os indicadores finais de ocupação/atraso são específicos do cartão; a barra lateral mantém a configuração completa de semana, presença e preparação. Ambas as interfaces mostram um subtítulo compacto da fase junto ao título, com ajuda contextual que explica a fase. Durante a confirmação, o título do processo fornece esse contexto. Antes da saída confirmada, um ícone de chegada acessível e o rótulo **Chegada prevista** (chegada prevista) identificam o retorno salvo, alinhados com o título/estado; seu valor salvo é um marcador compacto clicável, sem lápis nem sublinhado. O gráfico confirmado usa uma superfície de chegada escura semelhante a um campo, com a mesma tipografia da saída, sem lápis nem sublinhado. Ambos abrem o mesmo editor de chegada. O botão azul **Voltar**, com seta à esquerda na linha de ações do editor, descarta a edição de chegada e o fecha localmente, restaurando a última chegada salva. Seu aviso e a proteção de navegação são limpos; configurações independentes não salvas da rotina continuam protegidas. Reabrir começa pelo valor salvo. O sucesso fecha o editor, enquanto falhas ao salvar e atualizações em tempo real preservam o rascunho. Os valores de saída e chegada usam a mesma tipografia; Cancelar é uma ação compacta vermelha com texto branco, abaixo dos dados do episódio à esquerda, exibida apenas quando o retorno ativo pode ser cancelado e seu editor está fechado. Durante a edição, **Voltar** fecha o editor à esquerda e Alterar chegada permanece à direita, com uma superfície verde compacta. Voltar e Alterar chegada têm superfícies visíveis de 32 pixels dentro de áreas de toque de 44 pixels. Os indicadores de ocupação do cartão permanecem no canto superior direito do cabeçalho; o indicador de atraso desaparece após a saída confirmada.

Configure fontes de ocupação, modos, confirmação de ausência e rotina semanal na aba **Retorno planejado** na barra lateral. O cartão usa essa configuração salva da residência; não expõe campos de configuração nem o interruptor da rotina semanal. Filtros de exibição de termostatos não limitam esse cartão da residência. Os controles do painel e da barra lateral atualizam o mesmo episódio no backend; rascunhos de chegada permanecem locais em cada cartão aberto até serem enviados.

Durante uma ausência confirmada, os horários de saída salva e chegada editável ficam acima da linha do tempo; os rótulos dos Modos de ausência e retorno ficam abaixo. Ajudas da saída, ícone de chegada e Modos explicam o significado por mouse, foco ou toque. A data de chegada permanece um botão separado de edição. Uma marca vertical neutra Agora indica o tempo UTC decorrido e se alinha ao fim da linha colorida. Datas aparecem quando as extremidades correspondem a dias diferentes no fuso do Home Assistant. Editar um rascunho de chegada não move a extremidade até a aceitação. Estados pendentes e finais ou falta de saída confirmada não têm linha do tempo em movimento. Um episódio ativo com erro e dados válidos de saída mantém linha do tempo e cancelamento. O relógio local atualiza uma vez por minuto enquanto visível e ativo; não consulta o Home Assistant periodicamente.

Equipamentos adaptativos elegíveis têm pontos coloridos individuais de preparação e ajudas correspondentes de nome/início estimado. Pontos sobrepostos compartilham um círculo segmentado. Ambientes suspensos, já no alvo, indisponíveis e apenas de chegada não recebem pontos. A legenda do cartão da casa começa em uma linha; +N expande outros ambientes dentro do cartão, e Mostrar menos recolhe. Atualizações normais preservam a expansão; mudar chegada salva, destino ou episódio a redefine. Etiquetas de preparação da casa mantêm contagens e detalhes de chegada/primeiro início nas ajudas contextuais. Contadores de presença, atraso e fase atual também têm ajuda por teclado e celular. Configuração semanal, lista de fontes e detalhes completos de preparação permanecem na barra lateral. Preparação estimada e tempo decorrido não confirmam operação física HVAC nem progresso térmico.

<a id="climate-status-and-control-card"></a>
### Cartão de status e controle do termostato

Use `view: climate` para um cartão compacto dedicado a uma entidade `climate.*` gerenciada pelo Velair. Ele acompanha o tema ativo do Home Assistant usando suas variáveis de cores e superfícies e se adapta a layouts claros, escuros, móveis, de tablet e de computador.

O cartão combina temperatura, umidade, modo HVAC e `hvac_action` informados pelo aparelho com os dados atuais de controle e execução do Velair. Ele reutiliza a mesma linha do tempo diária efetiva, o ícone e a cor do perfil da aba Visão geral. Informações de modo, perfil, conforto, Room Assist e pré-condicionamento aparecem apenas quando estão configuradas e são relevantes. Um termostato com execução externa mostra o provedor externo e o estado de publicação em vez de funções locais do Velair ou ações específicas do termostato. A ação opcional de retorno pontual controla a residência e independe de quem controla o termostato selecionado.

```yaml
type: custom:velair-card
view: climate
selected_entity: climate.living_room
climate_name: Living room
climate_humidity_entity: sensor.living_room_humidity
climate_outdoor_temperature_entity: sensor.outdoor_temperature
climate_window_entities:
  - binary_sensor.living_room_window
  - binary_sensor.patio_door
climate_window_display: grouped
climate_room_assist_display: both
climate_preconditioning_display: both
climate_show_control_mode: true
climate_show_target_control: true
climate_show_hvac_mode_control: true
climate_show_native_climate_link: true
climate_actions:
  - type: boost
  - type: pause
    placement: more
  - type: planned-return
    enabled: true
  - type: script
    name: Ventilate room
    script: script.ventilate_living_room
    icon: mdi:window-open-variant
    color: "#03a9f4"
    confirmation: true
    placement: auto
```

A área de controle de climatização combina ações rápidas ordenadas com o seletor Automático/Manual, configurável separadamente, usando o mesmo modelo de controle de Visão geral. A área inferior reúne o modo HVAC, a temperatura-alvo atual quando o termostato está ligado e um atalho para a janela nativa de climatização do Home Assistant. Cada modo HVAC publicado aparece com seu ícone. Alterações diretas ficam somente de leitura enquanto o Velair controla a programação ativa: selecione **Manual** primeiro, espere o ajuste manual ser confirmado e então use os controles de temperatura e modo. Selecione **Automático** para retomar a programação. Reforços, pausas independentes e estados interrompidos ou indisponíveis bloqueiam a edição direta com uma explicação. A pausa interna que representa o próprio ajuste manual não bloqueia esses controles. Zonas com execução externa mantêm o atalho nativo do Home Assistant; uma ação de retorno pontual ativada ainda pode abrir os controles de saída da residência.

São suportadas temperaturas únicas e faixas nativas `heat_cool`. Alterações de faixa enviam os dois limites juntos. O Velair usa `min_temp`, `max_temp` e `hvac_modes` publicados pela entidade de climatização. Ajustes de temperatura usam `target_temp_step` quando publicado. Se o atributo desaparecer, o Velair continua usando o último incremento válido informado, mantendo válidas as temperaturas decimais existentes. Em seguida vem a alternativa manual por zona configurada em Configurações e, por último, `1` quando nenhum incremento foi informado ou configurado. Ele não inventa modos HVAC.

Cartões criados antes da lista ordenada de ações usavam `climate_show_boost_action`, `climate_show_pause_action` e `climate_custom_actions`. O Velair continua lendo esses campos antigos, enquanto o editor visual grava `climate_actions` quando a lista de ações muda.

**Retorno pontual** é outra ação fornecida pelo Velair. Ela suporta as mesmas opções de visibilidade, nome oculto e posicionamento automático/no menu Mais que Reforço e Pausa. O editor lista primeiro as ações fornecidas: Reforço, Pausa e depois retorno pontual, incluindo ações ocultas. O retorno pontual usa um destaque violeta para diferenciá-lo da pausa. Abri-lo substitui a área inferior de controle pelo formulário compacto de saída ou pela linha do tempo e pelos controles do episódio atual. Feche a área com seu X para voltar aos controles do termostato; fechá-la não cancela uma saída ativa. Edições de chegada não salvas exigem confirmação antes de fechar, e uma ação pendente precisa terminar primeiro. As configurações e os efeitos da saída valem para toda a residência, não apenas para o termostato selecionado.

As áreas de Reforço, Pausa e retorno pontual se unem à borda e à superfície da barra de ferramentas, como os controles normais do termostato. Ações diretas que usam apenas ícones mantêm a largura compacta e o ícone centralizado; abrir uma área adiciona espaço para seu ícone de fechar.

Cartões existentes mantêm essa ação oculta, salvo se for ativada explicitamente. Cartões criados pelo seletor de cartões do Home Assistant a incluem ativada na lista inicial de ações; isso também se aplica ao mudar a visualização desse novo cartão para `climate`. Um cartão YAML sem a ação `planned-return` a mantém oculta. Ative-a no editor visual ou adicione a ação mostrada acima.

O editor mantém as ações fornecidas em sua seção fixa e oferece controles de ordenação para ações personalizadas. Abrir o editor não reordena a lista de ações salva no painel.

Por padrão, a umidade atual e seu atalho de histórico usam os atributos da entidade de climatização selecionada. Defina `climate_humidity_entity` para usar o valor atual e o histórico nativo do Home Assistant de um sensor de umidade dedicado. O Velair não deduz essa relação, pois as integrações do Home Assistant não a publicam de forma consistente.

A temperatura externa e as entidades de janelas são contexto opcional do painel. O Velair não as descobre, gerencia ou automatiza por meio desse cartão. Os estados de janelas são apenas informativos, inclusive quando uma automação separada ou o [blueprint de janelas](blueprints/pause-zone-for-open-windows.pt-br.md) do Velair usa essas entidades. Defina `climate_window_display` como `grouped` ou `individual`; o editor visual oferece caixas de seleção separadas para a leitura externa e as janelas e não mostra nenhuma dessas seções até que uma entidade seja selecionada. Todo o título Estado atual recolhe o painel quando ele está expandido. Suas leituras e contexto compactos usam marcadores que quebram linha, em vez de rolagem horizontal, para que todos os sensores ativados continuem visíveis em larguras estreitas. Uma avaliação de conforto disponível usa uma linha descritiva separada abaixo do título recolhido, com a condição, uma observação contextual de conforto, ícone e destaque do estado. O editor também pode mostrar leituras derivadas de conforto ativadas nessa linha recolhida; caso contrário, esses valores ficam na linha expandida. A linha de conforto é omitida quando a avaliação está indisponível. O controle de expansão permanece fixo enquanto os marcadores usam quantas linhas compactas a largura disponível exigir. Esse estado de apresentação é mantido apenas durante a sessão ativa do cartão. Estado atual começa recolhido por padrão. O editor visual pode fazê-lo começar expandido; alterar esse padrão não impede recolher ou expandir manualmente durante o uso.

O editor visual segue a mesma ordem de cima para baixo do cartão. Ele pode ocultar separadamente a barra de estado, o nome do termostato, o estado de funcionamento, controles e ações individuais do termostato, temperatura atual, umidade, leitura externa, janelas, conforto, leituras opcionais de conforto recolhidas, linha do tempo, Room Assist e pré-condicionamento. O nome do termostato também pode ser substituído por um rótulo independente e local do cartão, inclusive vazio, e restaurado para o nome amigável atual da entidade. Se todos os itens de Estado atual forem desativados, seu contêiner inteiro é omitido. Valores de visibilidade ausentes são considerados visíveis para que cartões existentes mantenham sua apresentação. Cada leitura visível de temperatura atual ou umidade inclui um atalho compacto para o histórico nativo do Home Assistant da fonte configurada; o atalho é omitido junto com sua leitura. Cada categoria de configuração pode ser recolhida, e ações individuais de scripts personalizados ficam recolhidas até precisarem de edição, tornando o editor prático em telas estreitas. Selecionar outro script atualiza o nome do atalho a partir da entidade do script; depois ele pode ser personalizado novamente. O atalho do Velair no cabeçalho está sempre presente para identificar o cartão e oferecer um caminho consistente de volta à integração. Toda ação direta pode ocultar seu nome visível e virar um botão do tamanho de um ícone; seu rótulo acessível e o nome completo no menu Mais são preservados.

As ações rápidas compartilham a linha superior da área de controle com o seletor Automático/Manual. Elas ficam em um grupo independente alinhado à extremidade oposta da mesma linha em qualquer largura de cartão. Se seus rótulos ultrapassarem o espaço disponível, cada rótulo completo mantém sua largura natural e o grupo rola horizontalmente, sem quebrar linha nem cortar texto. Abrir Reforço ou Pausa substitui a área normal do termostato no mesmo lugar; Cancelar ou pressionar novamente a ação selecionada volta aos controles normais. A barra de rolagem nativa permanece oculta. Quando há ações fora da tela, controles direcionais ocupam espaços fixos externos e ficam visíveis apenas enquanto houver mais ações escondidas, sem cobrir nem redimensionar a linha de ações; quando todas cabem, esses espaços são removidos por completo. A mesma linha aceita deslizar com toque e arrastar com mouse ou caneta sem executar a ação usada para iniciar o arrasto. Ações de scripts confirmam brevemente a execução aceita ou a falha no próprio botão, e uma ação de Reforço ou Pausa aberta mostra um ícone de fechar.

O cabeçalho do termostato usa a atividade atual como principal indicação visual e reúne a atividade, a origem da execução e o modo HVAC abaixo do nome. Uma assinatura compacta do Velair permanece disponível como atalho para o painel principal, mantendo o nome do projeto e o autor em duas linhas em qualquer largura de cartão.

As seções de linha do tempo e Room Assist reutilizam os gráficos correspondentes do Velair, incluindo rolagem horizontal em telas estreitas. Defina `climate_room_assist_display` como `text`, `chart` ou `both` para escolher se aparece a explicação breve de execução, o gráfico de temperatura ou ambos. O estado do Room Assist sempre permanece junto ao título, enquanto a explicação usa uma segunda linha quando ativada. Apenas visualizações com gráfico podem ser recolhidas; o modo somente texto permanece visível e não tem um controle de expansão enganoso.

`climate_preconditioning_display` segue o mesmo modelo `text`, `chart` ou `both`. A preparação de retorno aceita é identificada separadamente da antecipação semanal, com estado do ambiente, início estimado, alvo de chegada e motivo relevante. Esses detalhes descrevem o retorno salvo e a intenção atual de controle; não confirmam a operação física. Controles embutidos de Retorno pontual mostram apenas o ponto de preparação elegível do equipamento selecionado, sem etiquetas de preparação; sua legenda mostra nome e início estimado. Sem ponto atual disponível, uma explicação breve de estado/motivo substitui a linha do tempo. A chegada salva continua editável e o cancelamento disponível; essas ações ainda afetam o retorno da casa inteira. A linha do tempo mede tempo até a chegada, não progresso térmico. Seu título mantém visível o estado programado ou ativo, e a segunda linha opcional identifica a temperatura-alvo e o início calculado. O modo somente gráfico mantém apenas esse estado acima da prévia expansível. Ambas as seções gráficas começam recolhidas, salvo configuração diferente, e a opção de estado inicial aparece no editor visual apenas quando um gráfico é selecionado. O título da linha do tempo, o perfil ativo e o modo ativo mantêm suas próprias opções de visibilidade; os marcadores de modo e perfil usam uma altura reduzida específica do cartão. O estado de expansão manual permanece local à sessão ativa do cartão.

Reforço abre um formulário no cartão com todas as opções suportadas pelo termostato e pelo serviço: temperatura-alvo ou faixa, duração, modo HVAC, ventilação, preset, oscilação, oscilação horizontal e umidade. Pausa permite escolher uma duração finita ou indefinida e se o termostato deve permanecer como está ou ser desligado. O cartão não expõe `pause_id`, reservado para identificar motivos de pausa pertencentes a automações. Quando uma pausa pode ter outro responsável ou motivo, o cartão abre o Velair em vez de limpar motivos implicitamente. O controle manual pode voltar ao automático pelo cartão. Essas ações locais nunca aparecem em zonas com execução externa. Reforço e Pausa/Retomar podem ser ocultados separadamente e movidos na mesma lista ordenada de ações que os atalhos de scripts. Seu comportamento, rótulos, ícones e formulários são fornecidos pelo Velair e não podem ser personalizados.

A lista de ações também pode conter entidades `script.*` do Home Assistant selecionadas pelo usuário. Cada atalho tem um nome local ao cartão, ícone MDI, cor e confirmação opcional. O Velair armazena apenas essas configurações de apresentação no cartão Lovelace e executa a entidade selecionada por `script.turn_on`; o script, suas permissões e suas ações continuam sob responsabilidade do Home Assistant. O cartão não aceita JavaScript arbitrário, templates, dados de serviços nem sequências de ações incorporadas. Por isso, atalhos de scripts precisam funcionar sem campos de entrada obrigatórios; defina os valores necessários no script do Home Assistant ou forneça valores padrão nele. Cada ação pode usar `placement: auto` ou `placement: more`. Ações automáticas usam as três primeiras posições diretas disponíveis e passam para **Mais** quando essas posições estão ocupadas. Ações atribuídas a `more` sempre ficam nesse menu, independentemente de sua posição na lista ordenada. O limite de três posições é fixo, não uma configuração extra de exibição. **Mais** é omitido quando não contém ações; **Abrir Velair** permanece como item final fixo e não faz o menu aparecer sozinho. Atalhos de scripts continuam disponíveis em zonas com execução externa, pois são ações independentes do Home Assistant, enquanto ações exclusivas do Velair mantêm suas restrições normais de controle e disponibilidade.

A linha fina no topo indica o estado de funcionamento, não o progresso. Aquecimento e pré-aquecimento usam um destaque quente; resfriamento, um destaque frio; desumidificação e ventilação permanecem estáveis; o estado ocioso é uma versão atenuada do modo ativo; desligado é neutro; e indisponível usa um tratamento de erro interrompido. O movimento é uma indicação breve de mudança de estado e é desativado quando a redução de movimento é solicitada. O modo HVAC `off` tem prioridade sobre uma atividade `idle` desatualizada, de modo que o cartão mostra **Desligado** com um ícone de energia; ocioso com um modo ativo ainda selecionado usa um ícone neutro de termostato e não se parece com uma pausa do Velair.

Cartões Lovelace por zona também podem limitar os termostatos exibidos. Isso é apenas um filtro de exibição do painel; não altera as programações armazenadas nem o comportamento do agendador. Cartões globais como `overview-status` e `active-setup` não mostram seleção de termostato nem opções de dia da semana no editor, pois não estão associados a um termostato ou editor de programação específico.

Adicione `view: active-setup` independentemente do cartão de status do agendador. Use o editor visual ou `active_setup_controls` para escolher se Configuração ativa pode alterar `modes`, `profiles` ou `both`:

```yaml
type: custom:velair-card
view: active-setup
active_setup_controls: profiles
```

A opção tem `both` como padrão, e todas as variantes mostram **Base** e **Exceções**, com a identidade real de Modo/Perfil/Padrão da base e grupos de exceções com suas quantidades de ambientes. Base e tipo compartilham uma pequena linha de contexto acima do nome; nomes longos quebram a linha em celulares e cartões estreitos. A base também mostra quantas zonas incluídas ainda a herdam; exceções são excluídas, assim como zonas que usam Padrão fora do escopo do Perfil. Bases Padrão incluem todas as zonas gerenciadas. Isso é cobertura da seleção, não atividade dos dispositivos. A seção **Distribuição da casa** abaixo do resumo começa recolhida. Selecione o rótulo para mostrar barra e legenda juntas; selecione novamente ou pressione Escape para recolher, mantendo o cabeçalho. A barra cobre todas as zonas gerenciadas, com rótulo informando o total. A legenda compacta usa cores dos Perfis, ícones menores e uma coluna de contagem alinhada à direita. Contagens de exceções correspondem à lista, inclusive zonas fora da base. Zonas não cobertas e sem exceções formam um segmento Padrão neutro. O total da casa é separado do denominador de cobertura da base. Sem zonas gerenciadas, não há barra. Perfis de base são identificados na legenda expandida sem lista separada de componentes do Modo. Layouts largos dão mais espaço às exceções, e cartões estreitos mantêm o resumo empilhado.

Selecione qualquer ponto da linha de uma exceção para expandir seus ambientes abaixo, mantendo todas as exceções visíveis. Selecione novamente ou pressione Escape para recolher; cabeçalho e contagem mantêm a posição enquanto o conteúdo cresce para baixo. Abrir outro grupo fecha o anterior. Nomes de ambientes não aparecem no resumo compacto, e listas longas têm rolagem interna na área expandida. Esse detalhe é somente de leitura em todas as variantes; Configuração ativa não tem menu separado de edição por zona. O controle apenas de Perfis mantém a ação de programações Padrão. Selecionar um Perfil diretamente substitui todos os Perfis ativos anteriores e muda o Modo para Manual. Zonas que deixam de ser cobertas voltam às programações Padrão em vez de manter a configuração do Modo anterior. Use um Modo para ativar juntos vários Perfis sem sobreposição como base. O ícone compacto de camadas aplica um Perfil apenas às suas zonas configuradas como exceções, preservando as outras seleções. Consulte [base e exceções por zona](climate-profiles.pt-br.md#a-base-with-independent-zone-exceptions).

```yaml
type: custom:velair-card
view: preconditioning
entities:
  - climate.living_room
  - climate.bedroom
zone_order:
  - climate.bedroom
  - climate.living_room
```

Se `entities` for omitido, os cartões por zona mostram todos os termostatos gerenciados pelo Velair.

Para `view: sensors`, o editor do cartão pode ocultar o interruptor de ativação, o seletor de sensor do cômodo, a zona morta do Room Assist, o desvio máximo de assistência, o atraso de atualização ou a seção de estado em tempo real, permitindo um cartão somente de exibição ou mais compacto.

Para `view: comfort`, o editor do cartão pode limitar a exibição a termostatos selecionados e ocultar separadamente a seção de configuração e os gráficos de temperatura, umidade ou CO2. São apenas escolhas de exibição no painel; não alteram configurações de conforto, sensores monitorados, limites, eventos nem entidades geradas no Home Assistant.

```yaml
type: custom:velair-card
view: comfort
entities:
  - climate.living_room
show_comfort_configuration: false
show_comfort_temperature: true
show_comfort_humidity: false
show_comfort_co2: true
```

<a id="create-a-daily-schedule"></a>
## Criar uma programação diária

Ao entrar em **Programações**, o Velair abre o dia da semana atual no horário local. Sua seleção é mantida ao alternar entre termostatos, programações Padrão e de perfis ou dados atualizados do backend.

1. Selecione o termostato que deseja configurar.
2. Escolha uma **Organização dos dias** e selecione um dia ou grupo de dias.
3. Use **Programação própria** para blocos independentes ou selecione um modelo com **Somente horários** ou **Horários e configurações**. Para blocos independentes, continue abaixo.
4. Adicione um bloco.
5. Escolha o horário de início.
6. Escolha um modo HVAC ou deixe `Manter o modo atual`.
7. Insira uma temperatura-alvo ou faixa, ou selecione opções de climatização sem temperatura-alvo.
8. Salve.

Em Configurações adicionais, um **Predefinição do Velair** pode fornecer a configuração de climatização do bloco mantendo seu horário independente. Dias vinculados seguem o escopo de vínculo escolhido para o modelo. Consulte [as regras completas](linked-schedules.pt-br.md) e [exemplos práticos para a residência](linked-schedule-examples.pt-br.md) antes de escolher entre copiar e vincular.

Após selecionar explicitamente um modo HVAC diferente de desligado, use o botão compacto de termômetro na célula Temperatura-alvo para desativar sua entrada de temperatura. O campo cinza mostra então um traço, e o bloco chama apenas o serviço `climate.set_hvac_mode` do Home Assistant sem enviar uma temperatura única ou faixa. Isso é útil para modos como `auto`, nos quais a integração ou o aparelho pode retomar sua própria programação, mas está disponível para todo modo HVAC diferente de desligado informado pela entidade. Use o mesmo botão para reativar o campo; o Velair restaura a temperatura-alvo anterior do rascunho, que precisa ser válida antes de salvar a programação. Blocos existentes mantêm seu comportamento atual de temperatura-alvo.

Blocos somente de modo não executam pré-condicionamento nem Room Assist, pois o Velair não tem uma temperatura-alvo a atingir ou ajustar. Configurações opcionais de climatização também ficam indisponíveis nesses blocos, para que a ação persistida seja uma única mudança inequívoca de modo HVAC. Provedores externos de programações precisam declarar suporte explícito a essa ação; o Velair nunca a converte em um bloco de temperatura.

Para programar um preset ou outra opção de climatização sem temperatura-alvo, escolha a opção nos controles adicionais do bloco e desative o campo de temperatura-alvo. O bloco pode combinar preset, ventilação, oscilação, oscilação horizontal e umidade-alvo. Ele chama apenas os serviços de climatização correspondentes do Home Assistant; não envia `climate.set_temperature`, não altera o modo HVAC nem liga um termostato desligado. Um bloco precisa conter pelo menos uma opção suportada. Alterações feitas diretamente nessas opções entre eventos programados não são restauradas imediatamente pelo Velair. Blocos somente de opções não executam pré-condicionamento nem Room Assist. Quando um bloco tem vários controles, o Home Assistant recebe chamadas de serviços separadas em sequência. Se uma chamada posterior falhar, controles anteriores já podem ter mudado; o Velair informa a falha de entrega.

Quando um modelo ou perfil é aplicado a outro termostato, o Velair mantém as opções suportadas por esse termostato. Se não restar nenhuma opção em um bloco somente de opções, a programação de destino é rejeitada em vez de armazenar uma ação vazia.

O Velair usa os recursos da entidade de climatização selecionada ao editar uma programação. Modos não suportados não são oferecidos, e as temperaturas ficam limitadas à faixa da entidade.

Em um bloco de temperatura, `Manter o modo atual` envia a temperatura-alvo e as opções de climatização selecionadas sem pedir outro modo enquanto o termostato está ligado. Se estiver desligado, o Velair o inicia no primeiro modo suportado compatível com a temperatura-alvo. Um bloco com Manter pode ser salvo quando o termostato declara ao menos um modo diferente de desligado compatível com o tipo de temperatura-alvo; isso não garante que o modo em uso será compatível quando o bloco executar. Se o modo em uso não aceitar a temperatura-alvo, a entrega falha sem mudar para outro modo. Algumas integrações só declaram suporte a uma temperatura única após iniciar um modo; por isso, o Velair inicia o modo compatível antes de enviar a temperatura e deixa o serviço do Home Assistant informar eventuais falhas específicas do aparelho. Faixas nativas continuam exigindo suporte explícito a faixas, e o Velair nunca converte uma temperatura única em faixa nem uma faixa em temperatura única.

Escolha **Somente temperatura** no seletor de modo do bloco para atualizar a temperatura-alvo sem pedir ao Velair para ligar o equipamento ou mudar o modo HVAC. Um equipamento desligado permanece desligado quando sua integração aceita alvos enquanto desligado; um equipamento ligado mantém seu modo real. É uma opção separada: **Manter modo atual**, modos explícitos e programações salvas mantêm seu comportamento. Blocos apenas de temperatura não podem incluir opções extras como predefinições, pois esses comandos podem mudar o estado operacional.

Essa escolha vale durante todo o bloco ativo, incluindo mudanças manuais de modo HVAC, inicialização, retomada e recuperação de envio. Mudar apenas o modo HVAC não inicia um Ajuste manual; mudar a temperatura continua seguindo a política configurada de mudanças externas. Room Assist e preparação antecipada não funcionam enquanto esse equipamento está desligado. Podem retomar após uma ativação externa, usando o modo compatível atual. Um Reforço explícito continua sendo uma solicitação separada que pode ligar o equipamento.

O suporte depende da integração de climatização. Algumas ocultam ou rejeitam alvos enquanto desligadas, ou ligam internamente ao recebê-los. O Velair não envia mudança de modo ou comando para ligar como alternativa em um bloco apenas de temperatura. Uma atualização falha é informada; o Velair não liga brevemente o dispositivo para ajustar o alvo. Faixas nativas exigem a capacidade de faixa correspondente. Provedores externos de programação precisam oferecer suporte explícito a essa política.

O editor mantém as opções de climatização selecionadas visíveis em uma linha compacta. Para um bloco com essas opções, abra seu controle de opções para ver o que será enviado: temperatura-alvo, se houver, como o modo HVAC é tratado e as opções selecionadas. A explicação também esclarece que uma temperatura única não é convertida em faixa. Isso funciona em programações, perfis e modelos. O editor avisa, sem impedir salvar, se um bloco anterior no mesmo dia seleciona um modo que talvez não aceite o tipo de temperatura-alvo. Quando nenhum modo explícito anterior ou bloco de desligamento determina o modo, ele usa o modo atual do termostato para essa indicação. O modo pode mudar antes da execução do bloco; portanto, o aviso é condicional.

Blocos de temperatura contêm uma temperatura-alvo única ou uma faixa completa com limites inferior e superior. O editor usa os recursos publicados pela entidade de climatização e configura novos blocos `heat_cool` com uma faixa por padrão, quando suportada. Uma faixa aparece, por exemplo, como `20–24 °C`. O Velair nunca inventa uma faixa a partir de uma temperatura única e rejeita temperaturas-alvo incompletas, invertidas ou incompatíveis antes de enviar um comando.

As faixas nativas ficam limitadas a `heat_cool` nesta primeira fase. O Velair não presume que o modo `auto` de um aparelho use o mesmo modelo de limites inferior e superior.

Quando o termostato selecionado expõe controles extras, o editor do bloco também os mostra. Por exemplo, um ar-condicionado pode oferecer ventilação, preset, oscilação, oscilação horizontal ou umidade. O Velair só armazena e envia opções suportadas pelo termostato selecionado; opções não suportadas são omitidas em vez de enviadas sem validação.

Se um bloco usa `Desligado`, os campos de temperatura-alvo não são usados, pois o bloco desliga a entidade de climatização.

**Organização dos dias e edição de vários dias**

A programação Padrão de cada equipamento e cada programação de equipamento dentro de um Perfil lembra sua própria **Organização dos dias**. Escolha **Dias individuais**, **Dias úteis / Fim de semana** ou **Todos os dias** antes de selecionar uma aba de dia. Programações existentes começam com Dias individuais.

Todas as organizações mantêm as mesmas sete células na ordem semanal configurada. Dias individuais seleciona uma célula. Dias úteis / Fim de semana seleciona segunda a sexta juntas ou sábado e domingo juntos, conforme o dia clicado. Com domingo primeiro, selecionar sábado também seleciona domingo na outra extremidade. Todos os dias seleciona cada célula, independentemente da clicada. Células selecionadas adjacentes se conectam visualmente; as separadas mantêm a posição. Clicar em uma célula do grupo já selecionado preserva o rascunho.

Selecionar uma divisão preserva os blocos existentes. Salve a seleção com a programação Padrão ou use **Salvar perfil** para um Perfil. Cada zona pode usar uma divisão diferente. Modelos diários continuam sendo listas diárias de blocos.

Quando os dias selecionados têm configurações salvas idênticas, edite diretamente sua programação comum. Se diferem, **Programações diferentes** permite examinar as programações e escolher explicitamente uma base. Dias com blocos e vínculos idênticos compartilham uma alternativa, com os rótulos dos dias visíveis. Cada alternativa usa barras compactas da Visão geral, com rótulos de alvo e modo dentro dos segmentos coloridos e sem lista permanente de blocos abaixo. O ícone de informações abre a programação completa, incluindo horários, configurações e referências, por mouse, foco ou toque. Examinar as informações não seleciona a alternativa. Clique ou toque em uma alternativa para selecioná-la como base; fundo e borda identificam a única configuração selecionada. Use setas, Espaço ou Enter pelo teclado. As alternativas permanecem disponíveis para escolher outra base antes de salvar. Com **Todos os dias** ou **Dias úteis / Fim de semana**, selecione uma alternativa e salve-a primeiro para o grupo: sete dias, cinco dias úteis ou dois dias de fim de semana. Selecionar e pressionar **Salvar** aplica diretamente, sem outra confirmação de substituição. O editor comum abre apenas após salvar com sucesso; depois, você pode mudar a programação compartilhada. Uma falha preserva seleção e comparação para tentar novamente. Alternativas vazias mostram **Sem blocos próprios**, sem repetir a contagem zero. A ajuda explica que aplicá-las remove blocos próprios dos dias selecionados; um dia vazio não é um comando de desligamento e a continuidade semanal pode continuar valendo. O layout cabe em larguras móveis.

Escolher uma base não salva nada. **Salvar** fica desabilitado até selecionar uma base e aparece abaixo do conteúdo, à direita. Um resumo ao lado identifica o dia de origem escolhido e os dias que receberão a programação. Salvar substitui os dias do grupo pela configuração escolhida, sem mudar outros dias. Temperaturas visualmente iguais não significam configurações idênticas quando vínculos com modelos ou referências a predefinições diferem. Quando alternativas parecem iguais por terem configurações efetivas correspondentes, rótulos compactos de dependência identificam modelo e escopo do vínculo, nomes de predefinições ou configuração independente. Detalhes completos das referências continuam disponíveis pelo ícone de informações.

Adicionar, remover ou mover blocos, aplicar um modelo, mudar o escopo do vínculo e desvincular afetam todos os dias selecionados ao salvar. Outros dias não mudam. **Salvar como modelo** salva uma lista diária reutilizável. Copiar para outros equipamentos usa os mesmos dias selecionados e mantém a organização dos dias do destino. Para clonar entre dias, volte a Dias individuais.

A linha do tempo agrupada mostra os blocos comuns em edição, sem seletor separado de prévia de dia nem segmento herdado específico de um dia. Dias individuais continua mostrando continuidade do dia anterior. A continuidade semanal do agendador não muda e blocos herdados nunca são copiados para os salvos. Limites do equipamento são validados para cada dia afetado antes de salvar o conjunto completo.

A organização dos dias sobrevive a reinicializações do Home Assistant e exportações portáteis. Exportações antigas sem organização são importadas com Dias individuais. Referências anteriores a organizações personalizadas também abrem como Dias individuais, preservando todos os blocos e vínculos de cada dia.

<a id="timeline-editing"></a>
## Edição da linha do tempo

A linha do tempo é uma representação visual de 24 horas do dia selecionado.

- Arraste um bloco para mudar seu horário de início.
- Arraste a borda de um bloco para ajustar o intervalo entre blocos adjacentes.
- Use a lista de blocos para valores exatos de horário, modo e temperatura.

<a id="preconditioning"></a>
## Pré-condicionamento

Para ausências detectadas por ocupação com chegadas semanais ou pontuais pré-configuradas, consulte [Retorno planejado](planned-return.pt-br.md). Configure a rotina na aba Retorno planejado e use seu estado em tempo real para consultar fontes individuais e alterar chegadas pontuais sem editar a semana salva. **Planejar retorno** pode aguardar a saída confirmada com um horário pontual mesmo quando a rotina semanal automática está desativada. Sem fontes de ocupação salvas, o início explícito aplica imediatamente a configuração de ausência; a preparação normal e a chegada salva continuam funcionando.

O pré-condicionamento permite que o Velair comece a aplicar uma temperatura de conforto programada antes do horário visível do bloco para um termostato gerenciado.

Quando ativado para um termostato na aba Pré-condicionamento, o horário do bloco representa o momento em que se deseja atingir o conforto. O Velair pode aplicar a temperatura-alvo antes, usando sua previsão adaptativa, mantendo o horário-alvo original visível nos próximos eventos.

Se o Velair recalcula quando já está dentro da janela de pré-condicionamento, aplica a temperatura-alvo imediatamente se a temperatura atual ainda precisar de aquecimento ou resfriamento.

A aba Pré-condicionamento lista os termostatos gerenciados na ordem configurada em Configurações. Para cada termostato, ela permite:

- ativar ou desativar o pré-condicionamento;
- definir uma antecedência máxima de até 1440 minutos;
- definir os parâmetros do modelo adaptativo e a diferença mínima de temperatura;
- consultar separadamente o aprendizado de aquecimento e resfriamento;
- restaurar os parâmetros de ajuste aos padrões sem apagar amostras de aprendizado;
- redefinir o aprendizado de uma direção sem afetar a outra.

A configuração é agrupada em horários e limites, modelo de aprendizado, histórico e contexto externo opcional. Quando o contexto externo é desativado, seu seletor de sensor também é desativado. Termostatos indisponíveis não podem ativar o pré-condicionamento, e a aba explica o motivo.

Cada controle de ajuste inclui uma ajuda contextual compacta. Passe o mouse, dê foco ou toque no ícone de informação para ver como aumentar, diminuir ou ativar essa configuração afeta o pré-condicionamento.

O pré-condicionamento é adaptativo. O Velair prevê cada evento futuro a partir da diferença atual de temperatura, primeiro com um modelo inicial local e depois com histórico local semelhante, quando há observações completas suficientes. As previsões históricas aprendem o potencial térmico por grau, permitindo ajustar pequenas mudanças passadas de temperatura a diferenças futuras maiores e mudanças passadas grandes a diferenças menores. Observações mais semelhantes e mais recentes têm maior influência.

O Velair não antecipa blocos `Desligado`. Se a temperatura atual já estiver suficientemente próxima da temperatura-alvo, ele mantém o horário normal do bloco.

Para faixas nativas `heat_cool`, o Velair usa o limite inferior quando o cômodo precisa de aquecimento e o superior quando precisa de resfriamento. A faixa completa ainda é aplicada antecipadamente, e o aprendizado registra qual limite orientou a sessão.

Exemplos detalhados de configuração, aquecimento, resfriamento, sensor externo, automação e Lovelace estão em [Pré-condicionamento adaptativo](adaptive-preconditioning.pt-br.md).

Antes de um início antecipado, o Velair acompanha mudanças relevantes de temperatura nos termostatos gerenciados com pré-condicionamento ativado. Por padrão, usa `current_temperature` do próprio termostato. Se a assistência por sensor do cômodo estiver ativada, o Velair usa o sensor selecionado como temperatura efetiva do cômodo nas decisões de pré-condicionamento e no aprendizado. Quando a temperatura muda o suficiente para afetar a diferença atual, o Velair agrupa mudanças rápidas e recalcula localmente a próxima ação do agendador. Painéis abertos também agrupam mudanças relevantes de temperatura interna ou da temperatura externa configurada em uma única atualização, sem consultas contínuas. Se o início antecipado do mesmo evento visível mudar, sua linha recebe um destaque breve para tornar o ajuste perceptível sem janela ou notificação global.

<a id="room-assist"></a>
## Room Assist

A aba Room Assist lista os termostatos gerenciados na ordem configurada em Configurações. Para cada um, permite configurar a assistência por sensor do cômodo.

O sensor de temperatura do cômodo selecionado é útil para válvulas termostáticas ou termostatos cujo sensor embutido fica muito próximo de um radiador, saída de ar ou outra fonte local de calor. Selecionar um sensor por si só não altera o controle do Velair. Ele se torna a temperatura efetiva do cômodo apenas quando a assistência por sensor é ativada, pois o Velair também ajusta a temperatura-alvo do termostato para que o atuador continue aquecendo ou resfriando em direção à leitura do sensor separado do cômodo.

Exemplos detalhados de aquecimento, resfriamento, automação e Lovelace estão em [Room Assist](room-assist.pt-br.md).

A assistência por sensor do cômodo é uma opção avançada que exige um sensor de temperatura no cômodo, mas não exige pré-condicionamento adaptativo. Para um bloco de modo fixo `heat` ou `cool` com zona morta diferente de zero, o Velair trata os limites inferior e superior da zona morta como limites de comutação. Ele mantém uma fase de execução até o sensor separado atingir a borda oposta e então inverte: aquecimento fixo começa de forma segura em direção ao limite inferior e resfriamento fixo em direção ao superior. O desvio máximo de assistência limita a correção com sinal a partir da borda ativa. Uma zona morta de `0` preserva a correção anterior com sinal em torno da temperatura-alvo central. Temperaturas únicas em `auto` e `heat_cool` mantêm esse comportamento neutro, e faixas nativas `heat_cool` mantêm sua banda estável de manutenção; assim, o Velair não força uma unidade automática a alternar ativamente entre aquecimento e resfriamento. A zona morta tem padrão de `0.3 °C` ou `1 °F`, aceita incrementos de `0.1` grau de `0` até `5 °C` ou `9 °F` e é aplicada imediatamente ao salvar. O desvio máximo de assistência tem padrão de `2 °C` ou `4 °F` e pode ser configurado em incrementos de `0.1` grau até `10 °C` ou `18 °F`. A temperatura-alvo ou faixa visível da programação permanece inalterada, e continuam valendo o alinhamento ao incremento de temperatura, a proteção programada e os limites físicos do termostato. A fase existe apenas na execução atual e recomeça após mudança de bloco, temperatura-alvo ou modo, limpeza do Room Assist ou recarga da integração. O Velair influencia a unidade por meio da temperatura-alvo; não pode substituir a histerese do aparelho, a proteção do compressor ou o tempo mínimo de funcionamento. Use um bloco `Desligado` quando precisar de um desligamento explícito.

O Velair segue a unidade de temperatura configurada no Home Assistant. Não há uma configuração separada de Celsius ou Fahrenheit. Configurações mostra essa unidade do Home Assistant como valor somente de leitura para verificar o comportamento ativo; altere-a nas configurações do sistema de unidades do Home Assistant. Novas programações, modelos integrados, limites de conforto, limites do Room Assist e padrões do pré-condicionamento adaptativo são fisicamente equivalentes nas duas unidades. Leituras de sensores de temperatura separados são convertidas antes de compará-las com a temperatura-alvo do termostato.

O Velair armazena valores térmicos sem conversão, na unidade registrada com seus dados. Se o Home Assistant mudar de unidade, o Velair interrompe a programação e as gravações térmicas, cria uma notificação persistente e oferece uma migração explícita da unidade armazenada para a unidade atual do Home Assistant em Configurações. Continue apenas quando todos os valores armazenados ainda usarem a unidade de origem exibida; valores já na unidade de destino seriam convertidos incorretamente. Programações, modelos, temperaturas-alvo de sobreposições ativas e anteriores, limites de conforto, valores do Room Assist, configurações, taxas e observações de aprendizado do pré-condicionamento adaptativo migram atomicamente.

A atualização única de dados publicados do Velair que usavam apenas Celsius é diferente. Se o Home Assistant já usa Fahrenheit, o Velair assume que os dados antigos estão em Celsius sem perguntar, mantém o agendador interrompido e direciona o usuário a **Redefinir Velair**. A redefinição descarta a configuração antiga e cria atomicamente novos padrões Fahrenheit. Após essa atualização, mudanças futuras de unidade no Home Assistant usam a conversão explícita completa descrita acima e preservam os dados.

Exportações atuais do modelo portátil v19 preservam os valores sem conversão e declaram sua unidade. Versões anteriores do Velair não conseguem importar exportações v19; use uma versão com suporte a v19 para restaurá-las. Arquivos antigos suportados, incluindo v4, v5, v8 e v9, continuam podendo ser importados. Importações convertem os dados térmicos selecionados quando a unidade do arquivo difere da unidade atual do Home Assistant. Arquivos antigos sem unidade são tratados como Celsius, pois todas as versões publicadas do Velair que os produziram armazenavam valores em Celsius. A exportação continua disponível enquanto a programação está interrompida por uma atualização de unidade, permitindo salvar uma cópia de referência antes da redefinição e importá-la depois.

Se um termostato estava indisponível durante a migração ou importação, o Velair verifica seus limites e seu incremento efetivo de temperatura. Um `target_temp_step` válido publicado pelo Home Assistant tem prioridade sobre o último incremento informado e depois sobre a alternativa manual por zona. O painel avisa quando uma temperatura-alvo armazenada já não é compatível, para que seja editada antes de depender dessa programação.

O comportamento completo de atualização, migração, backup e recuperação está em [Unidades de temperatura e migração](temperature-units.pt-br.md).

Quando a assistência por sensor do cômodo está ativada, a aba Room Assist mostra uma escala compacta de temperatura em tempo real enquanto um bloco de temperatura gerenciado está ativo. Para uma temperatura única, ela marca a temperatura-alvo programada, o sensor do cômodo, a temperatura-alvo do termostato e a leitura do termostato. Uma faixa neutra listrada marca os limites inferior e superior da zona morta. Com `heat` ou `cool` fixo, o estado também mostra se o controle está em direção ao limite inferior ou superior; com modos automáticos de temperatura única, a banda permanece uma margem neutra. Para uma faixa nativa, ela vai do limite inferior programado menos a zona morta até o limite superior programado mais a zona morta; marcadores separados continuam mostrando as faixas completas programada e aplicada, com uma ligação entre seus centros indicando o movimento com sinal de toda a faixa. O sensor do cômodo e as leituras do termostato continuam como marcadores individuais. A legenda traduzida completa fica centralizada na faixa de zona morta representada, mesmo quando a faixa é mais estreita que o rótulo; uma zona morta zero remove a superfície e é indicada explicitamente. Ocultar `show_room_assist_deadband` oculta conjuntamente sua configuração, faixa e legenda. Esses valores são derivados dos estados do Home Assistant e da execução do Velair; não são persistidos como um novo histórico. Se não há bloco de temperatura gerenciado ativo, a aba mostra um estado de espera em vez de valores fictícios. Se um sensor está selecionado, mas a assistência está desligada, a aba mostra que o sensor está salvo, mas não está em operação.

A assistência por sensor do cômodo funciona por eventos. O Velair não consulta temperaturas periodicamente. Ele acompanha apenas o sensor do cômodo e a entidade de climatização configurados enquanto a assistência está ativa, agrupa mudanças com o atraso de atualização por termostato, alinha temperaturas-alvo temporárias ao incremento efetivo publicado, informado anteriormente ou configurado, ignora movimentos menores que esse incremento e restaura a temperatura-alvo real da programação quando o agendador é pausado ou uma zona é pausada, um reforço começa, o bloco desliga, o sensor deixa de ser utilizável ou o recurso é desativado. Limpar esse estado de execução também limpa qualquer fase de histerese de modo fixo. Se o pré-condicionamento adaptativo já iniciou um bloco futuro antecipadamente, a assistência acompanha essa temperatura-alvo futura até o horário de conforto programado, em vez de voltar ao bloco anterior.

Quando o pré-condicionamento está desativado para um termostato, o Velair não registra listeners de temperatura de pré-condicionamento, não agenda callbacks de recálculo, não inicia sessões de aprendizado nem salva novas observações para ele. Amostras aprendidas anteriormente são preservadas e podem ser reutilizadas se o pré-condicionamento for reativado.

O Velair também mantém um histórico local compacto de aprendizado das tentativas de pré-condicionamento. Ele abre uma sessão de aprendizado na execução ao aplicar uma temperatura de conforto antecipada e armazena uma observação compacta quando o termostato atinge o limite da temperatura-alvo ou quando chega o horário de conforto. Sessões interrompidas por reforços, pausas, interrupções do agendador ou alterações de programação são descartadas.

A aba Pré-condicionamento mostra o estado de aprendizado local por termostato. Aquecimento e resfriamento são acompanhados separadamente, e uma direção não suportada pela entidade aparece como indisponível. Quando o Velair tem observações completas suficientes para uma direção suportada, pode usar histórico local semelhante em vez do modelo inicial.

Cada direção suportada tem um cartão compacto de status mostrando se o aprendizado está pronto, qual origem de modelo está ativa e as contagens de amostras completas, parciais e inválidas.

A aba também oferece uma ação de redefinir o aprendizado para cada direção suportada. Isso recalibra aquecimento ou resfriamento do zero de forma independente, mantendo programações, configurações de pré-condicionamento e o histórico de aprendizado da outra direção.

A ação de restaurar por termostato é separada da redefinição do aprendizado. Ela restaura apenas os parâmetros de ajuste do pré-condicionamento adaptativo, mantém o estado atual de ativação, preserva as configurações do sensor do cômodo e todas as amostras armazenadas de aquecimento e resfriamento.

Observações parciais não viram tempos fictícios de conclusão. Elas funcionam como limites mínimos: o Velair sabe que o tempo necessário foi maior que a janela de antecipação tentada. Se observações completas posteriores suficientes comprovarem que uma antecedência menor funciona, observações parciais antigas deixam de forçar a previsão para cima. Isso mantém o aprendizado conservador sem tornar permanentes as antecedências altas.

O Velair mantém históricos compactos separados de aquecimento e resfriamento para que o uso sazonal em uma direção não elimine o aprendizado da outra.

Todas as configurações e cálculos de pré-condicionamento são executados localmente no Home Assistant. O Velair não envia histórico de climatização nem dados de programação a serviços externos.

Detalhes voltados a desenvolvedores sobre estados de aprendizado local, saída da API e regras de previsão estão em [Funcionamento interno do pré-condicionamento adaptativo](../developer/adaptive-preconditioning.md).

<a id="environmental-comfort"></a>
## Conforto ambiental

A aba Conforto lista os termostatos gerenciados na ordem configurada em Configurações. Para cada um, pode monitorar temperatura do cômodo, umidade e CO2. Também pode mostrar leituras opcionais de ponto de orvalho, umidade absoluta e Humidex, calculadas localmente a partir da temperatura e umidade efetivas ou fornecidas por um sensor existente do Home Assistant.

Conforto apenas monitora. Não altera blocos de programação, temperaturas-alvo, modos de ventilação, presets nem pausas. Em vez disso, o Velair descreve o cômodo com condições compreensíveis como `Frio e úmido`, mantém a qualidade do ar por CO2 separada, indica se as leituras estão completas e emite eventos de automação quando essa avaliação muda.

A temperatura pode usar um sensor dedicado de Conforto, o sensor de temperatura do cômodo do Room Assist quando configurado ou `current_temperature` da própria entidade de climatização. A umidade pode usar um sensor selecionado ou `current_humidity` da entidade quando disponível. CO2 só é avaliado quando um sensor de CO2 é selecionado.

O modelo padrão de conforto simples usa uma faixa retangular única de temperatura e umidade. O modo guiado transforma uma referência de umidade no ponto médio em uma curva psicrométrica que depende da temperatura. O modelo personalizado com variação por temperatura permite limites de umidade diferentes nas extremidades mais fria e mais quente; o Velair interpola a faixa efetiva e mostra sua área-alvo inclinada sem afirmar que ela represente conforto universal. Zonas existentes permanecem no modelo simples até que ele seja alterado explicitamente.

Essas leituras adicionais estão desativadas por padrão e são apenas informativas: não alteram classificações de conforto nem o comportamento da climatização. Quando Conforto está desativado para um termostato, o Velair não registra listeners de seus sensores de conforto. Quando ativado, acompanha apenas os sensores selecionados relevantes e a entidade de climatização. Não há consultas contínuas.

Conforto também pode comparar o cômodo com sensores explícitos de temperatura externa e, opcionalmente, umidade externa. O bloco **Indoor vs outdoor** (interior e exterior) mostra a diferença de temperatura, a umidade absoluta interna e externa e a umidade relativa que o ar externo teria à temperatura interna. Quando o backend identifica uma direção útil ou um conflito, o Velair mostra uma única mensagem cautelosa sobre ventilação; nunca trata a comparação como um comando. A configuração fica dentro do painel recolhido de Conforto, e desativar a comparação preserva os IDs dos sensores selecionados. Os controles de **Ventilation guidance** (orientação de ventilação) por termostato permitem exigir diferenças maiores ou menores de temperatura, umidade projetada e conteúdo de umidade do ar antes de a mensagem aparecer; as margens cautelosas originais continuam como padrão.

Exemplos detalhados de configuração, aquecimento, resfriamento, CO2, automação e privacidade estão em [Conforto ambiental](comfort.pt-br.md).

<a id="templates"></a>
## Modelos

Modelos são conjuntos diários reutilizáveis de blocos. Suas configurações podem ser manuais ou usar presets compartilhados do Velair. A aba Modelos também contém a biblioteca de predefinições climáticas; um preset do Velair compartilha configurações de climatização sem compartilhar horários dos blocos.

A aba Modelos permite:

- criar um modelo;
- renomear um modelo;
- editar seus blocos;
- aplicar um modelo a termostatos e dias da semana selecionados;
- excluir modelos que não tenham dias vinculados.

Em Programações, selecione um modelo como origem de um dia para vincular seus horários ou a configuração completa. Copiar um modelo continua sendo uma operação separada.

A aba Programações também pode salvar o dia atual como um novo modelo.

Ao copiar ou vincular um modelo a um termostato, o Velair valida modos HVAC, tipos de temperatura-alvo, limites de temperatura e restrições do provedor. Temperaturas fora da faixa e modos incompatíveis são rejeitados. Configurações manuais são adaptadas aos incrementos de temperatura suportados; valores de presets compartilhados são adaptados a cada destino sem alterar a biblioteca. Configurações opcionais não suportadas são filtradas, desde que o bloco ainda tenha uma ação válida.

Copiar blocos cria horários independentes do modelo, mas mantém referências ativas aos presets. Vínculos de **Somente horários** compartilham horários com atribuições independentes de climatização. Vínculos de **Horários e configurações** compartilham o modelo completo, com controles somente de leitura no destino. Alterações no modelo validam todos os dias vinculados, incluindo perfis inativos. A edição preserva a posição do modelo na biblioteca.

Consulte [Presets de blocos e modelos vinculados](linked-schedules.pt-br.md) para todas as regras e [Exemplos práticos](linked-schedule-examples.pt-br.md) para configurações completas, alternativas para novos blocos, conversões de vínculo, contagens de uso e solução de problemas.

Modelos podem incluir todas as configurações opcionais disponíveis nos termostatos gerenciados. Isso torna um modelo útil em instalações com aparelhos diferentes. Ao aplicá-lo a um termostato específico, o Velair mantém apenas as opções que ele suporta. Por exemplo, um modelo pode conter `fan_mode: quiet` para um ar-condicionado, mas esse campo é removido automaticamente ao aplicar o mesmo modelo a uma válvula termostática que não oferece modos de ventilação.

<a id="climate-profiles"></a>
## Perfis de climatização

Perfis de climatização alternam várias zonas entre planos semanais coordenados sem sobrescrever suas programações padrão. Cada perfil pode fornecer a uma zona uma programação semanal alternativa, pausá-la, pausá-la e desligá-la ou mantê-la na programação Padrão. Zonas omitidas de um perfil continuam usando suas programações padrão.

Um modo pode ativar vários perfis juntos quando suas zonas configuradas não se sobrepõem. A ativação direta substitui o conjunto ativo por um único perfil e seleciona Manual. Zonas cobertas pelo conjunto ativo anterior, mas não por esse perfil, voltam às programações Padrão. A ativação aplica os blocos ativos no horário atual, incluindo blocos iniciados em dias anteriores, e cancela reforços nas zonas afetadas. Pausas globais e por zona mantêm prioridade.

A barra lateral usa **Programações** como área completa de planejamento. Escolha **Programações padrão** para editar o plano semanal normal ou **Programações de perfil** para criar um perfil e configurar um termostato por vez com **Programação padrão**, **Cronograma de perfil** ou **Pausa**. Ambas as origens expõem a mesma linha do tempo, opções de blocos, modelos e ferramentas de clonagem, mas mantêm seus comportamentos próprios ao salvar: um dia Padrão é salvo diretamente, enquanto os metadados e o comportamento dos termostatos de um perfil são salvos atomicamente como um único perfil. Um perfil ainda pode ser ativado diretamente em sua linha. A aba separada **Modos** combina perfis em configurações reutilizáveis e não duplica seu editor de programações. Enquanto o Velair processa as zonas afetadas, uma faixa global de operação mostra a zona atual, a contagem processada e o resultado final de sucesso ou erro parcial nas abas do painel. No Lovelace, ela aparece apenas no cartão Configuração ativa, onde são feitas as ativações de modos e perfis. Processado significa que Home Assistant e Velair terminaram de tratar aquela zona, inclusive quando uma pausa ou sobreposição dispensa um comando de climatização. Não significa que o cômodo já atingiu sua temperatura-alvo. Resultados bem-sucedidos desaparecem automaticamente após um breve período de confirmação. Resultados parciais e falhas continuam visíveis até serem dispensados. Automações do Home Assistant podem ativar um perfil por `velair.activate_profile` ou selecionar um valor configurável da entidade nativa `select.velair_mode` do Velair.

Consulte [Perfis de climatização](climate-profiles.pt-br.md) para detalhes de configuração, automação, reinicialização, interações e portabilidade.

<a id="external-schedule-execution"></a>
## Execução externa de programações

Normalmente, o Velair armazena o plano semanal de uma zona e o executa pela entidade `climate.*` do Home Assistant. Quando **Configurações → Sistemas externos** detecta um controlador compatível, uma zona elegível pode delegar a execução a esse sistema. O Velair então publica a semana efetiva completa selecionada por Padrão, um perfil ou um modo. A zona precisa ter primeiro uma programação efetiva salva com ao menos um bloco de temperatura; caso contrário, o Velair mantém a execução local e explica o pré-requisito em Configurações.

Uma zona gerenciada externamente fica limitada à programação. O Velair não envia ações diretas de climatização para reforço, pausa ou retomada, ajuste manual, Room Assist ou pré-condicionamento adaptativo. O comportamento **Pausa** de perfis fica indisponível, enquanto **Programação padrão** e **Cronograma de perfil** selecionam a semana publicada. Limites específicos do controlador aparecem uma vez por sistema em uso em Configurações e também são aplicados ao editar programações Padrão e de perfis compatíveis. Quando um controlador exige um ponto implícito de continuidade à meia-noite, o editor o inclui na contagem visível de pontos de mudança do dia.

Visão geral informa apenas os estados de publicação — publicando, publicado ou falha — após uma tentativa na execução atual do Home Assistant. Publicado significa que a integração externa aceitou a chamada de serviço; não confirma que o controlador físico aplicou a programação. A zona mantém sua atividade normal de programação e próximo evento, enquanto um indicador compacto **Externo** mostra o controlador e o estado de publicação. O Velair não consulta periodicamente, não lê o resultado de volta nem tenta novamente de forma automática. Consulte [Execução externa de programações](external-systems.pt-br.md) para sistemas suportados, limites, transferência de controle e estado atual de validação.

<a id="clone-schedules"></a>
## Clonar programações

Abaixo do editor, o Velair pode clonar o dia atual:

- para outros dias da semana no mesmo termostato;
- para o mesmo dia da semana em outros termostatos gerenciados.

Para clonagem entre dias, **Seg–Sex**, **Fim de semana**, **Todos os dias** e **Limpar seleção** oferecem seleção rápida dos destinos, mantendo os dias individuais disponíveis. Esses atalhos só alteram os destinos selecionados; **Clonar** continua sendo uma ação explícita, e o dia de origem nunca é incluído.

As ações de clonagem salvam primeiro alterações pendentes quando necessário. Elas copiam a configuração de origem, incluindo modelo, tipo de vínculo, atribuições de somente horários e referências de presets. Clonar um dia independente remove o vínculo do destino naquele dia; outros dias mantêm seus vínculos. Destinos incompatíveis rejeitam a clonagem sem alterar nenhum destino selecionado. Use **Desvincular** após clonar quando o novo dia precisar deixar de acompanhar seu modelo.

<a id="pause-stop-and-resume"></a>
## Pausar, interromper e retomar

O Velair tem controles globais do agendador:

- **Pausa** suspende a execução automática de programações por uma duração em minutos.
- **Parar** suspende a execução automática de programações indefinidamente.
- **Retomar** devolve o agendador ao modo automático.

Quando uma pausa temporária está ativa, Visão geral mostra o tempo restante e o progresso.

Durações de pausa e reforço são informadas em minutos. A interface de serviços do Home Assistant aceita valores até 10 080 minutos, equivalentes a sete dias.

O Velair também suporta pausas por zona via serviços e automações. Uma pausa de zona afeta apenas uma entidade de climatização gerenciada. Os outros termostatos continuam seguindo suas programações. Ao retomar uma zona, o Velair aplica a programação atual apenas se houver um bloco ativo para aquele termostato no momento; caso contrário, não altera o termostato.

<a id="boost"></a>
## Reforço

O reforço é aplicado por zona de climatização. Ele substitui temporariamente a programação de uma entidade e deixa as outras zonas funcionando normalmente.

Quando um reforço começa, o Velair captura o estado atual restaurável do termostato daquela zona, incluindo modo HVAC e temperatura única ou faixa completa, quando o Home Assistant os expõe. Essa captura é usada apenas para decidir o que deve acontecer quando o reforço termina.

O reforço está disponível por serviços, scripts, automações e controles de painel do Home Assistant. Isso mantém o editor principal focado na programação, permitindo automações avançadas como:

- aplicar um reforço a um cômodo por um botão;
- aplicar um reforço após detectar movimento;
- aplicar um reforço por um assistente de voz;
- aplicar um reforço com um modo HVAC preferido.

Quando um reforço termina, o Velair resolve a zona afetada nesta ordem:

1. Se há um bloco ativo de programação com modo HVAC explícito, o Velair aplica a temperatura-alvo programada.
2. Se há um bloco ativo que desliga o termostato, o Velair o desliga.
3. Se não há bloco ativo, o Velair restaura o estado capturado antes do reforço.
4. Se o bloco ativo usa `Keep`, o Velair também restaura o estado capturado antes do reforço, pois `Keep` não define um novo modo HVAC a aplicar após a sobreposição temporária.

Isso significa que um reforço não deve levar o Velair a inventar uma nova temperatura-alvo de aquecimento ou resfriamento quando a programação atual não a define explicitamente.

<a id="startup-behavior"></a>
## Comportamento ao iniciar

Por padrão, o Velair restaura o estado armazenado do agendador após iniciar o Home Assistant, mas não força os aparelhos de climatização a uma temperatura-alvo da programação.

Em Configurações, você pode ativar **Aplicar programação ativo após inicialização**. Quando ativado, o Velair aplica o bloco atualmente ativo aos termostatos gerenciados após iniciar o Home Assistant, desde que o agendador esteja em modo automático. Um bloco iniciado em um dia anterior continua contando como bloco ativo até o início do próximo bloco semanal. Reforços ativos são respeitados.

<a id="automation-blueprints"></a>
## Blueprints de automação

O Velair fornece blueprints opcionais do Home Assistant por meio de sua documentação:

- alternar entre ações escolhidas de Em casa/Ausente a partir de uma entidade consolidada de ocupação;
- pausar um ou mais termostatos gerenciados enquanto qualquer janela ou porta selecionada estiver aberta;
- selecionar modos sazonais ou outras ações uma única vez após a confirmação de uma nova faixa sazonal, com notificações imediatas para leituras inválidas.

Eles usam eventos de estado do Home Assistant e atrasos configuráveis, não consultas periódicas. O blueprint de ocupação pode informar quando seu grupo consolidado, sensor template ou auxiliar permanece indisponível, sem executar ações de Em casa ou Ausente. O blueprint de janelas identifica a pausa que cria, para que fechar uma janela não remova uma pausa manual nem uma pausa de outra automação. Se um contato permanecer desconhecido ou indisponível, o Home Assistant mostra uma notificação de diagnóstico após um atraso para o conjunto de termostatos e a dispensa automaticamente após a recuperação; o contato afetado ainda impede a retomada. Consulte [Blueprints de automação](blueprints.pt-br.md) para configuração, exemplos, comportamento ao iniciar e a regra de uma automação por zona para contatos de janelas.

O [blueprint sazonal](blueprints/seasonal-climate-selection.pt-br.md) confirma uma nova faixa sazonal durante 30 minutos por padrão. As mudanças dentro dessa faixa mantêm o prazo original; as ações são executadas uma vez por entrada na faixa. Ao iniciar, verifica apenas o diagnóstico. Use seu editor normal de ações do Home Assistant para selecionar modos do Velair. Configure um modo real de pausa e desligamento se o clima ameno deve interromper a climatização; ações vazias mantêm a operação atual inalterada.

<a id="portability"></a>
## Portabilidade

A aba Configurações pode exportar e importar um arquivo JSON com versão.

O arquivo pode conter:

- programações dos termostatos;
- modelos;
- presets compartilhados de blocos;
- configurações do painel;
- aprendizado do pré-condicionamento adaptativo;
- definições de perfis de climatização;
- definições de modos.

O modelo atual 19 preserva os dois tipos de vínculo de modelos, as referências de presets e as relações de Mestre do pré-condicionamento. As referências aceitas de execução do mestre permanecem locais e não são exportadas. Exportar programações ou Perfis inclui os modelos e presets necessários, mostrados como seções adicionais selecionadas. As importações validam a configuração combinada, incluindo consumidores existentes de recursos compartilhados substituídos. Os presets são mesclados pela chave estável: chaves correspondentes são substituídas, enquanto presets locais ausentes do arquivo permanecem. Backups existentes continuam importáveis; versões antigas do Velair não podem importar arquivos do modelo 19. Consulte [o exemplo de backup](linked-schedule-examples.pt-br.md#back-up-the-whole-setup).

Ao importar, o Velair permite escolher quais seções sobrescrever. A importação substitui os dados selecionados; exporte antes se precisar de um ponto de recuperação. Definições de perfis e modos são portáteis, mas sua seleção ativa não é. O Velair mantém IDs de perfis ativos que ainda existam e volta às programações padrão apenas quando nenhum deles permanece.

Toda nova exportação registra sua unidade de temperatura. Ao importar um arquivo de outro sistema de unidades, o Velair converte os valores térmicos selecionados para a unidade atual do Home Assistant. Valores associados a um termostato disponível são alinhados ao incremento efetivo de temperatura; valores independentes usam uma precisão segura quando não existe um incremento comum de aparelho disponível. A alternativa manual por zona é portátil, enquanto o último incremento observado de uma entidade local é intencionalmente omitido da exportação. Exportações antigas sem unidade registrada são indicadas na tela de importação e interpretadas como Celsius.

O aprendizado do pré-condicionamento adaptativo é associado pelo ID exato da entidade de climatização do Home Assistant. O aprendizado de termostatos não gerenciados no momento é mostrado antes da importação e ignorado. Para termostatos correspondentes, o aprendizado importado substitui sua calibração existente. O aprendizado de termostatos locais ausentes do arquivo permanece inalterado.

Os valores de configuração do pré-condicionamento já estão incluídos em **Programações dos termostatos**. A seção separada **Aprendizado do pré-condicionamento** contém o histórico de calibração local acumulado com o uso.

<a id="maintenance"></a>
## Manutenção

A aba Configurações mostra informações técnicas de versão:

- build do frontend;
- versão do modelo de exportação portátil;
- versão do armazenamento/modelo;
- versão da integração.

Ela também inclui uma ação de redefinição. Redefinir apaga todos os dados armazenados de programação do Velair, incluindo programações, modelos, preferências do painel, reforços e pausas ativos, políticas de ajustes externos por termostato e ajustes manuais ativos, configurações de conforto e Room Assist, configurações e aprendizado do pré-condicionamento adaptativo e comportamento ao iniciar. Em seguida, recria padrões na unidade correta para os termostatos gerenciados no momento. A seleção separada de categorias de Diagnóstico e seu registro de execução atual não fazem parte dessa redefinição de dados de programação. O Velair pede confirmação antes de executar isso.

<a id="services"></a>
## Serviços

O Velair expõe serviços do Home Assistant para automações e scripts:

- `velair.set_temperature`
- `velair.set_hvac_mode`
- `velair.apply_schedule`
- `velair.boost`
- `velair.cancel_boost`
- `velair.activate_profile`
- `velair.deactivate_profile`
- `velair.enable_room_sensor_assist`
- `velair.disable_room_sensor_assist`
- `velair.pause`
- `velair.pause_zone`
- `velair.resume`
- `velair.resume_zone`
- `velair.set_external_change_policy`
- `velair.enter_manual_adjustment`
- `velair.resume_automatic_control`
- `velair.set_daily_schedule`
- `velair.copy_day_schedule`
- `velair.clear_schedule`
- `velair.update_block_preset`

Serviços que têm uma entidade como destino só funcionam com termostatos selecionados na configuração. Se uma entidade não gerenciada for informada, o Velair rejeita a chamada antes de alterar qualquer coisa.

<a id="velairupdate_block_preset"></a>
### `velair.update_block_preset`

Atualize um preset compartilhado salvo usando sua `preset_key` estável. Atualizações parciais preservam campos omitidos; a substituição explícita pode alterar sua ação. As mudanças afetam todas as referências e usam a validação normal, as prioridades de sobreposição e o recálculo de pré-condicionamento. Consulte [Automações de presets](preset-automations.pt-br.md) para a referência de campos e exemplos de temperatura externa, faixas, opções de aparelhos e desligar/restaurar. Esse serviço altera uma definição compartilhada; não seleciona outro preset para um bloco.

<a id="velairactivate_profile"></a>
### `velair.activate_profile`

Ative um perfil de climatização armazenado e aplique imediatamente o comportamento efetivo atual. Isso substitui o conjunto inteiro de perfis ativos; zonas não cobertas pelo perfil selecionado voltam às programações Padrão. Use o ID estável do perfil mostrado pelo Velair, não seu nome de exibição editável. Uma ativação direta define o seletor de modo como `Manual`. Omitir `profile_id` ainda retorna às programações padrão por compatibilidade; novas automações devem usar explicitamente `velair.deactivate_profile`.

```yaml
action: velair.activate_profile
data:
  profile_id: vacation
```

<a id="velairdeactivate_profile"></a>
### `velair.deactivate_profile`

Desative todos os perfis ativos e retorne imediatamente cada zona à sua programação padrão.

```yaml
action: velair.deactivate_profile
```

<a id="velairset_temperature"></a>
### `velair.set_temperature`

Defina uma entidade de climatização gerenciada para uma temperatura única ou uma faixa com limites inferior e superior. `hvac_mode` é opcional.

Esse é um serviço de conveniência restrito ao Velair, não um substituto de `climate.set_temperature` do Home Assistant. As diferenças são:

- aceita apenas entidades de climatização gerenciadas pelo Velair;
- valida a temperatura-alvo de acordo com os recursos e limites de temperatura conhecidos pelo Velair;
- usa as regras do Velair para escolha de modo HVAC quando um modo é informado ou quando o termostato precisa ser ligado.

Use os serviços nativos de climatização do Home Assistant para controle genérico. Use `velair.set_temperature` quando uma automação precisar agir apenas sobre termostatos gerenciados pelo Velair.

Os campos opcionais `fan_mode`, `preset_mode`, `swing_mode`, `swing_horizontal_mode` e `humidity` também podem ser informados. O Velair aplica apenas os campos suportados pelo termostato de destino.

```yaml
action: velair.set_temperature
data:
  entity_id: climate.living_room
  temperature: 21
  hvac_mode: heat
  fan_mode: quiet
```

Para uma faixa, omita `temperature` e informe os dois limites:

```yaml
action: velair.set_temperature
data:
  entity_id: climate.living_room
  target_temp_low: 20
  target_temp_high: 24
  hvac_mode: heat_cool
```

`temperature` e os campos de faixa são mutuamente exclusivos. Os dois limites da faixa precisam ser informados juntos.

<a id="velairset_hvac_mode"></a>
### `velair.set_hvac_mode`

Defina um modo HVAC declarado diferente de desligado sem enviar uma temperatura-alvo. O Velair aceita apenas termostatos gerenciados com execução local, valida o modo de acordo com a entidade e registra o comando como ação do Velair para que ele não seja confundido com um ajuste externo.

```yaml
action: velair.set_hvac_mode
data:
  entity_id: climate.living_room
  hvac_mode: auto
```

Use esse serviço quando uma automação do Velair precisar alterar apenas o modo HVAC. O Velair não inclui temperatura única nem faixa na chamada; a integração ou o aparelho ainda pode ajustar seu próprio estado internamente quando o modo muda. Uma entrega bem-sucedida desativa o Room Assist ativo, pois o Velair deixa de controlar uma temperatura-alvo para aquele comando. Uma falha de entrega mantém o Room Assist inalterado e não emite evento de temperatura-alvo aplicada com sucesso.

Use `climate.set_hvac_mode` nativo do Home Assistant para controle genérico fora do Velair. O modo `off` é rejeitado intencionalmente; use a pausa, programação ou ação de climatização adequada do Velair para essa intenção distinta.

<a id="velairapply_schedule"></a>
### `velair.apply_schedule`

Aplique imediatamente o bloco de programação ativo no momento. Se `entity_id` for omitido, o Velair aplica o bloco ativo a todos os termostatos gerenciados.

```yaml
action: velair.apply_schedule
data:
  entity_id: climate.living_room
```

<a id="velairboost"></a>
### `velair.boost`

Substitua temporariamente o controle de uma entidade de climatização. Quando o reforço termina, o Velair aplica a temperatura-alvo explícita da programação ativa, se houver, ou restaura o estado capturado antes do reforço quando não há temperatura-alvo explícita a aplicar.

```yaml
action: velair.boost
data:
  entity_id: climate.living_room
  temperature: 22
  duration_minutes: 45
  hvac_mode: heat
  fan_mode: high
```

O Velair captura o estado restaurável do termostato antes de aplicar o reforço. Um reforço é rejeitado quando o termostato está indisponível e esse estado não pode ser capturado com segurança.

Um reforço com faixa usa `target_temp_low` e `target_temp_high` no lugar de `temperature`, seguindo as mesmas regras de `velair.set_temperature`.

<a id="velaircancel_boost"></a>
### `velair.cancel_boost`

Cancele antecipadamente um reforço ativo. Isso sempre usa o mesmo comportamento da expiração normal: o Velair aplica a temperatura-alvo explícita da programação ativa, se houver; caso contrário, inclusive com um bloco `Keep`, restaura o modo HVAC e a temperatura-alvo capturados antes do reforço. A chamada não tem efeito quando não há reforço ativo.

```yaml
action: velair.cancel_boost
data:
  entity_id: climate.living_room
```

<a id="velairenable_room_sensor_assist"></a>
### `velair.enable_room_sensor_assist`

Ative a assistência por sensor do cômodo para um termostato gerenciado. O termostato já precisa ter um sensor de temperatura do cômodo configurado na aba Room Assist.

```yaml
action: velair.enable_room_sensor_assist
data:
  entity_id: climate.living_room
```

<a id="velairdisable_room_sensor_assist"></a>
### `velair.disable_room_sensor_assist`

Desative a assistência por sensor do cômodo para um termostato gerenciado. Se o Velair estava aplicando uma temperatura-alvo assistida, ele restaura a temperatura-alvo atual da programação.

```yaml
action: velair.disable_room_sensor_assist
data:
  entity_id: climate.living_room
```

<a id="velairpause"></a>
### `velair.pause`

Pause a execução automática de programações. Omita `duration_minutes` para interromper a execução automática indefinidamente.

```yaml
action: velair.pause
data:
  duration_minutes: 60
```

<a id="velairresume"></a>
### `velair.resume`

Retome a execução automática de programações e aplique a programação atual.

```yaml
action: velair.resume
```

<a id="velairpause_zone"></a>
### `velair.pause_zone`

Pause a execução automática de programações para uma entidade de climatização gerenciada, enquanto o restante do Velair continua funcionando. Omita tanto `duration_minutes` quanto `until_next_block` para pausar essa zona indefinidamente.

Defina `until_next_block: true` para encerrar esta pausa no início do próximo bloco da programação efetiva da zona. É usado o horário nominal do bloco, não o início antecipado do Pré-condicionamento adaptativo. O término é fixado quando o serviço é chamado e sobrevive a reinícios; edições posteriores da programação não o alteram. A opção não pode ser combinada com `duration_minutes`, e a chamada falha sem alterar a zona se não existir bloco futuro. Outros motivos de pausa continuam mantendo a zona pausada até também terminarem.

```yaml
action: velair.pause_zone
data:
  entity_id: climate.guest_room
  pause_id: external_control
  action: none
  until_next_block: true
```

O campo opcional `action` pode ser:

- `none`: manter o termostato exatamente como está e apenas impedir que o Velair o altere automaticamente;
- `turn_off`: desligar o termostato imediatamente e mantê-lo pausado.

Automações também podem enviar um `pause_id` opcional contendo de 1 a 128 letras, números, pontos, sublinhados, dois-pontos ou hífens, começando com uma letra ou número. Uma pausa identificada adiciona um motivo sem substituir motivos com outros IDs. Reutilizar o ID atualiza apenas esse motivo; repetir exatamente a chamada não tem efeito. Chamadas sem `pause_id` mantêm a autoridade manual e substituem todos os motivos por uma única pausa manual.

```yaml
action: velair.pause_zone
data:
  entity_id: climate.guest_room
  duration_minutes: 120
  action: turn_off
  pause_id: window_guard
```

<a id="velairresume_zone"></a>
### `velair.resume_zone`

Retome a execução automática de programações para uma entidade de climatização gerenciada. Por padrão, o Velair aplica o bloco ativo no momento para esse termostato, se houver. Se nenhum bloco se aplicar naquele momento, ele não altera o termostato.

Quando `pause_id` é informado, o Velair remove apenas esse motivo. Outros motivos mantêm a zona pausada, e a programação só é aplicada após o fim do último motivo. Use `resume_all: true` para limpar explicitamente todos os motivos. Omitir os dois campos mantém o comportamento antigo de retomar todos. Os campos não podem ser combinados, e `resume_all: false` sem um ID é rejeitado.

Motivos expiram de forma independente. Se algum motivo restante usa `turn_off`, a ação efetiva da pausa continua sendo desligado. Reforços são rejeitados enquanto a zona está pausada.

```yaml
action: velair.resume_zone
data:
  entity_id: climate.guest_room
  apply_current_schedule: true
  pause_id: window_guard
```

<a id="velairset_daily_schedule"></a>
### `velair.set_daily_schedule`

Substitua a programação de um dia da semana para um termostato gerenciado.

```yaml
action: velair.set_daily_schedule
data:
  entity_id: climate.living_room
  weekday: monday
  blocks:
    - start: "06:30"
      action: set_temperature
      temperature: 21
      hvac_mode: heat
      fan_mode: quiet
    - start: "09:00"
      action: turn_off
    - start: "18:00"
      action: set_temperature
      temperature: 20
      hvac_mode: heat
```

Blocos de programação podem incluir valores opcionais de `fan_mode`, `preset_mode`, `swing_mode`, `swing_horizontal_mode` e `humidity`. Valores não suportados são removidos para o termostato de destino antes de armazenar ou aplicar a programação.

Use `action: set_climate_options` com um ou mais desses campos e sem temperatura nem `hvac_mode` para chamar apenas seus serviços do Home Assistant. Por exemplo:

```yaml
action: velair.set_daily_schedule
data:
  entity_id: climate.living_room
  weekday: monday
  blocks:
    - start: "06:30"
      action: set_climate_options
      preset_mode: comfort
    - start: "22:00"
      action: set_climate_options
      preset_mode: eco
      fan_mode: quiet
```

<a id="velaircopy_day_schedule"></a>
### `velair.copy_day_schedule`

Copie um dia Padrão salvo, incluindo seu vínculo de modelo e referências de presets, para dias da semana selecionados. Omita `target_entity_ids` para copiar dentro do termostato de origem ou informe essa lista para copiar a outros termostatos gerenciados. Cada combinação selecionada de termostato/dia da semana é validada e salva em uma única transação.

```yaml
action: velair.copy_day_schedule
data:
  entity_id: climate.living_room
  source_weekday: monday
  target_weekdays:
    - tuesday
    - wednesday
    - thursday
```

Para copiar a mesma configuração de segunda-feira a outros termostatos:

```yaml
action: velair.copy_day_schedule
data:
  entity_id: climate.living_room
  source_weekday: monday
  target_weekdays:
    - monday
  target_entity_ids:
    - climate.study
    - climate.bedroom
```

O serviço copia a última origem salva sob o bloqueio de configuração. O campo opcional `expected_revision` rejeita a operação se a configuração tiver mudado; o painel fornece sua revisão atual automaticamente. Perfis são editados e salvos por seu próprio fluxo de perfil completo. Copiar um dia independente salvo remove os vínculos de modelo dos dias de destino selecionados; outros dias são mantidos.

<a id="velairclear_schedule"></a>
### `velair.clear_schedule`

Limpe a programação de um dia da semana. Omita `weekday` para limpar todos os dias desse termostato gerenciado.

```yaml
action: velair.clear_schedule
data:
  entity_id: climate.living_room
  weekday: sunday
```

<a id="automation-events"></a>
## Eventos de automação

O Velair também dispara eventos do Home Assistant que podem ser usados como gatilhos de automação. Esses eventos são transitórios; não são armazenados como configuração nem substituem as entidades de diagnóstico.

Todos os eventos de execução usam o mesmo tipo de evento do Home Assistant:

```text
velair_event
```

O campo `event` dos dados identifica mudanças do conjunto de perfis, mudanças do modo do agendador, temperaturas-alvo aplicadas, planos e observações do pré-condicionamento adaptativo, mudanças de conforto ambiental, mudanças de estado e temperatura-alvo do Room Assist, reforços e pausas de zona.

Consulte [Eventos de automação](automation-events.pt-br.md) para as regras exatas de emissão, comportamento de eliminação de duplicatas, campos disponíveis e um exemplo completo dos dados de cada tipo de evento.
