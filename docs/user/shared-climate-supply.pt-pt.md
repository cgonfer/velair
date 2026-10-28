<a id="shared-climate-supply"></a>
# Fornecimento de climatização partilhado
<!-- velair-docs:start -->
Traduções: [Original em inglês](shared-climate-supply.md) · [Español](shared-climate-supply.es.md) · [Français](shared-climate-supply.fr.md) · [Deutsch](shared-climate-supply.de.md) · [Italiano](shared-climate-supply.it.md) · [Nederlands](shared-climate-supply.nl.md) · [Polski](shared-climate-supply.pl.md) · [Português (Brasil)](shared-climate-supply.pt-br.md) · [Português (Portugal)](shared-climate-supply.pt-pt.md) · [Русский](shared-climate-supply.ru.md) · [Estado das traduções](../translation-status.md)

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

O fornecimento de climatização partilhado estima se os termóstatos associados
precisam de aquecimento ou arrefecimento e controla um `switch` comum, como um
relé de pedido à caldeira. É opcional e permanece desativado até ativares
explicitamente um fornecimento em **Controlo do fornecimento**. A estimativa não
confirma a abertura de válvulas, a circulação de água nem o aquecimento físico.

<a id="configure-a-supply"></a>
## Configurar um fornecimento

Abre **Controlo do fornecimento** no painel do Velair e escolhe **Adicionar
fornecimento**. Seleciona um elemento da lista para editar os detalhes ao lado,
ou por baixo num ecrã estreito. Sem fornecimentos, o convite inicial oferece a
mesma ação. A lista **Fornecimentos partilhados** representa circuitos de
aquecimento ou arrefecimento controlados, separados de agrupamentos gerais de
termóstatos.

Define o **Nome do fornecimento**, escolhe um interruptor existente e a
**Finalidade do fornecimento** (Aquecimento ou Arrefecimento), e seleciona os
termóstatos geridos alimentados por esse circuito. Cada interruptor só pode
pertencer a um fornecimento. Os interruptores de controlo do próprio Velair não
podem ser usados como saídas.

A finalidade descreve o que o equipamento fornece. Não altera os modos HVAC dos
termóstatos: uma fonte de aquecimento só responde à procura de calor; uma fonte
de arrefecimento só responde à procura de frio.

Cada elemento da lista identifica a finalidade, o número de termóstatos, o
interruptor escolhido e o estado guardado do controlo automático. Edita nome,
interruptor e finalidade diretamente no resumo superior, junto do controlo de
ativação e do ícone de guardar. Cada definição aparece uma única vez; não existe
uma secção separada de definições do fornecimento. **Estado do interruptor** é o
estado observado da entidade; o resumo da lista descreve a configuração guardada.
O interruptor de ativação só altera um rascunho até guardares: pode aparecer
ativado enquanto a lista ainda indica Desativado. A procura não é avaliada com
o controlo desativado ou suspenso. Os botões de informação explicam estas
diferenças, o controlo exclusivo, a finalidade e os tempos sem alongar o formulário.

Usa **Remover fornecimento**, o caixote do lixo na lista, para remover um elemento.
A remoção também só se aplica ao guardar. Expande **Opções de temporização**,
**Procura e histerese** ou **Termóstatos associados** para editar essa parte.
A ajuda ao lado do título da funcionalidade abre um resumo e este guia.
Mudar de fornecimento mantém as alterações por guardar. **Guardar fornecimentos**,
o ícone no cabeçalho dos detalhes, aplica toda a lista editada, incluindo remoções.
Continua disponível no estado vazio quando removes o último fornecimento.
Como em Modelos e Predefinições, não existe botão separado para descartar.
Ao sair do separador com alterações, é pedida confirmação para as descartar;
ao regressar, volta a lista guardada. A navegação aguarda um pedido de guardar
ou retomar em curso.

Repor todos os valores editados nos valores guardados elimina o rascunho, permitindo
novamente atualizações em direto e **Retomar controlo automático**. Alterações
guardadas chegam aos outros painéis ligados mesmo sem mudança da procura estimada.

Escolhe o modo e os valores de histerese do fornecimento. Cada termóstato herda o
modo; podes substituir apenas os valores numéricos. Na linha selecionada,
**Histerese do termóstato** permite **Usar histerese do fornecimento** ou
**Valores de histerese personalizados**. O seletor fica alinhado com a caixa e o
nome do termóstato; exceções numéricas e limites efetivos aparecem por baixo.
No modo personalizado, cada um dos dois valores pode herdar de forma independente.
São diferenças de temperatura na unidade atual do painel; mudar de unidade converte
essas diferenças sem as tratar como temperaturas absolutas.

Os campos numéricos assinalam valores inválidos durante a edição. A histerese tem
de ser finita e não negativa; uma exceção vazia herda o valor do fornecimento.
Não é possível guardar enquanto algum fornecimento tiver números inválidos;
a lista assinala o elemento a corrigir.

Guarda explicitamente para aplicar. Ativar o fornecimento dá ao Velair controlo
automático exclusivo do interruptor. Evita outras automatizações a controlar
continuamente a mesma saída.

Falhas ao guardar aparecem no cabeçalho dos detalhes, junto à ação de guardar.
Erros de configuração identificam o fornecimento, o campo e a correção; o Velair
seleciona esse fornecimento, abre a secção e assinala e foca o campo. Erros do Home
Assistant ou de ligação mantêm a explicação original, sem os atribuir a outro campo.
Os rascunhos ficam disponíveis para corrigir e tentar novamente, mesmo depois
de remover o último fornecimento.

<a id="live-status"></a>
## Estado em tempo real

Escolha **Estado em tempo real** no cabeçalho de um fornecimento guardado para abrir o monitor somente leitura. Ele usa a configuração guardada, mesmo com alterações não guardadas no editor. Fornecimentos novos precisam ser guardados antes de abrir o monitor.

O resumo mostra o estado do interruptor informado pelo Home Assistant, o número de termostatos solicitando fornecimento e o estado do controlo automático, incluindo esperas de tempo mínimo desligado ou atraso para desligar. Uma solicitação e um interruptor ligado não confirmam aquecimento, arrefecimento, abertura de válvula ou fluxo físicos.

Quando a demanda é avaliada e há leituras, cada termostato tem uma linha de temperatura com leitura atual, alvo efetivo e limites de início/parada. Uma faixa hachurada com a cor de tema do Room Assist marca o intervalo entre os limites, haja ou não solicitação. Com demanda, uma seta fina colorida vai da leitura atual ao limite de parada: laranja para aquecimento, azul para arrefecimento. Indica a direção de temperatura solicitada, não fluxo térmico nem operação física confirmada. Sem demanda, a seta desaparece e o marcador atual é neutro; a faixa estática continua visível. A temperatura aumenta da esquerda para a direita nos dois sentidos. Valores e rótulos ficam visíveis sem passar o mouse, inclusive em ecrãs móveis. Atual e alvo ficam centralizados em suas posições reais; rótulos próximos usam linhas separadas. Cada marcador agrupa a temperatura-limite e a distância com sinal ao alvo, sem tabela separada.

Os rótulos destacam o próximo limite relevante. Durante a demanda, **Para a** identifica a parada. Antes de a leitura ultrapassar o início, esse limite é simplesmente **Limite inferior** no aquecimento ou **Limite superior** no arrefecimento. Depois de entrar na faixa de retenção, **Reinicia a** identifica o limite do próximo ciclo. Sem demanda, **Inicia a** fica destacado e o outro limite usa nome neutro. Limites coincidentes compartilham um marcador. Demanda desconhecida permanece neutra, sem presumir solicitação.

Quando o Room Assist controla a demanda, o monitor identifica essa origem e usa seu sensor e limites de controlo efetivos, em vez de tratar o alvo corrigido do termostato como alvo da divisão. A pergunta compacta **Porque não é utilizada a minha histerese?** explica a prioridade do Room Assist e os ajustes guardados de fornecimento inativos. Só abre ao selecionar e mantém essa escolha durante atualizações. Instruções normais de início/parada não se repetem abaixo do gráfico; dados indisponíveis ou não avaliados continuam explicados. Por exemplo, alvo de conforto de 17 °C com limites de 16 e 18 °C significa início 1 °C abaixo e parada 1 °C acima, mesmo se a distância de início do fornecimento, não usada, for 0,2 °C. Faixas nativas do Room Assist podem usar um só limite: marcadores coincidentes não significam distância zero ao alvo de conforto. Leituras ausentes e demanda não avaliada são explícitas, sem manter uma solicitação anterior como dado atual. Termostatos desligados e fornecimentos desativados ou suspensos mantêm leituras atuais disponíveis, sem apresentar alvos ou limites não avaliados.

O monitor recebe atualizações enquanto aberto e encerra a inscrição ao fechar. Mostra as últimas leituras informadas ao Home Assistant; não aumenta a frequência de informes dos dispositivos, não simula temperaturas e não armazena histórico.

<a id="how-estimated-demand-works"></a>
## Como funciona a procura estimada

Novos fornecimentos no painel usam **Parar no alvo**, com **Histerese de ativação** de **0.3 °C** ou **0.54 °F** e **Histerese de desativação** zero. São diferenças de temperatura equivalentes; os termostatos herdam os valores do fornecimento até escolher valores próprios. Os exemplos abaixo usam valores diferentes para esclarecer cada modo.

Nos termóstatos comuns, a histerese define um limite de início e outro de paragem.
Entre eles, a procura anterior mantém-se. Todas as comparações incluem o próprio
limite. Exemplos com alvo de 22 °C:

Os valores de histerese são diferenças de temperatura em relação ao alvo. A histerese de ativação determina o início da procura. A de desativação define quanto a temperatura deve ultrapassar o alvo, no sentido do aquecimento ou arrefecimento, para terminar a procura. Parar no alvo usa zero para a desativação. Simétrica aplica o mesmo valor dos dois lados; Histerese personalizada permite ajustar ambos separadamente.

| Modo | Valores | Aquecimento: início / paragem | Arrefecimento: início / paragem |
| --- | --- | --- | --- |
| Parar no alvo (predefinido) | Histerese de ativação 0,5 °C | ≤21,5 / ≥22 °C | ≥22,5 / ≤22 °C |
| Simétrica | Histerese simétrica 0,5 °C de cada lado | ≤21,5 / ≥22,5 °C | ≥22,5 / ≤21,5 °C |
| Histerese personalizada | Histerese de ativação 0,5 °C; Histerese de desativação 0,2 °C | ≤21,5 / ≥22,2 °C | ≥22,5 / ≤21,8 °C |

O gráfico em **Procura e histerese** acompanha a edição da finalidade, modo e
distâncias. Usa um alvo de exemplo identificado, não o alvo real de um termóstato.
As temperaturas aparecem junto dos marcadores de início e fim; os segmentos ligam
cada distância de histerese ao alvo. O eixo identificado da temperatura da divisão
cresce para a direita. A nota explica que, entre início e paragem, uma procura
existente continua; sem procura anterior, não começa outra. O aquecimento solicita
fornecimento do lado frio e o arrefecimento do lado quente. O gráfico explica a
estimativa, sem simular equipamento ou atrasos. O alvo de exemplo é 22 °C ou 72 °F.
Durante valores vazios, incompletos ou inválidos, um gráfico cinzento sem leituras
mantém a altura da pré-visualização até o valor voltar a ser válido.

**Histerese de ativação** é a diferença de temperatura em relação ao alvo antes de solicitar aquecimento ou arrefecimento. **Histerese de desativação** é a diferença além do alvo antes de terminar a solicitação. **Histerese simétrica** aplica a mesma diferença de cada lado do alvo, não a largura total da faixa. **Histerese personalizada** permite definir ativação e desativação separadamente. Ambas aceitam zero; com ambas zero, exatamente no alvo significa sem demanda. Dentro da faixa após reiniciar, mudar o alvo ou a histerese, não se presume nova demanda. Trocar de modo preserva os valores personalizados de parada, que voltam a valer ao retornar à **Histerese personalizada**.

**Parar no alvo** é o ponto de partida recomendado para termóstatos comuns.
Simétrica e Personalizada são opções avançadas: o termóstato pode fechar a válvula
ou parar o compressor no alvo, antes de atingir o limite de paragem além do alvo.
A fonte partilhada pode continuar solicitada. Estas definições estimam a procura;
não alteram os limites próprios do termóstato nem forçam a circulação de calor.

Mantém separados os limites de fornecimentos de aquecimento e arrefecimento que
partilhem um termóstato de intervalo. Grandes distâncias de paragem podem conservar
procura de calor quando começa o arrefecimento, ou o contrário. Os fornecimentos
agregam de forma independente e não têm interbloqueio entre saídas opostas.
Usa interbloqueios adequados no equipamento quando necessário.

A fonte é solicitada se pelo menos um termóstato associado tiver procura válida.
Um termóstato desligado ou com direção HVAC incompatível não a solicita. Dados
indisponíveis ou em falta produzem procura desconhecida; não conservam um pedido
anterior indefinidamente. Outras divisões válidas continuam a poder solicitar.
Sem nenhuma divisão válida a solicitar, o fornecimento pede para desligar após
o atraso configurado.

São usados os alvos atuais dos termostatos, incluindo alterações manuais e alvos aplicados pelo Pré-condicionamento adaptativo ou Regresso planeado. Pausar uma programação não desativa o controlo automático do fornecimento. Uma faixa válida usa o limite inferior para aquecimento e o superior para arrefecimento por predefinição. Para uma faixa fixa de Aquecimento ou Arrefecimento com **Alvo de referência** selecionado em **Definições → Dispositivos de climatização e grupos**, o controlo do fornecimento usa o mesmo limite e a direção do modo fixo. Um alvo ambíguo não pode solicitar fornecimento.

<a id="room-assist"></a>
## Room Assist

Um painel informativo azul no início de **Procura e histerese**, antes do seletor
de modo, explica a prioridade do Room Assist e quando se aplica a histerese.

Quando o Room Assist controla o alvo ativo de uma divisão, o fornecimento segue
a sua intenção de controlo confirmada. Em aquecimento fixo, a fase `towards_upper`
solicita calor; em arrefecimento fixo, `towards_lower` solicita frio. Os seus limites
de comutação continuam a ser a referência: a histerese do fornecimento e a exceção
da divisão não são aplicadas novamente. O controlo de intervalo nativo segue a
direção confirmada. Um alvo assistido inválido ou pendente permanece desconhecido
até existir uma confirmação válida.

O alvo corrigido do termóstato não é comparado com um sensor externo da divisão.
O Room Assist pode deixar de solicitar fornecimento mesmo que o termóstato continue
a comunicar o mesmo alvo ajustado.

<a id="timing-and-manual-control"></a>
## Temporização e controlo manual

**Atraso para ligar** exige demanda estimada contínua antes de iniciar o fornecimento. Se a demanda desaparece ou fica desconhecida, a contagem reinicia. Ela pertence ao fornecimento: uma divisão pode parar de solicitar enquanto outro continua, sem reiniciar a espera. **Tempo mínimo desligado** adia o reinício após desligar. Quando surge demanda, vale a maior espera: o **tempo mínimo desligado restante** ou o **atraso para ligar completo**. Eles não são somados.

Por exemplo, com tempo mínimo desligado de 60 segundos e atraso para ligar de 20 segundos:

- Desligado há um dia: a proteção terminou; espere somente 20 segundos desde o surgimento da demanda.
- Demanda logo após desligar: espere 60 segundos, o maior dos tempos configurados.
- Demanda 50 segundos após desligar: restam 10 segundos de proteção. Espere 20 segundos desde a demanda, permitindo ligar 70 segundos após o desligamento.

A demanda deve continuar durante toda a espera. Estado em tempo real mostra o tempo restante e se a confirmação de demanda ou o tempo mínimo desligado impede o início. Zero desativa apenas a espera correspondente; a outra continua valendo.

**Atraso para desligar** exige um período contínuo sem demanda antes de desligar; a volta da demanda cancela o atraso. As três configurações aceitam segundos inteiros de 0 a 86.400 e têm predefinição zero. Não existe tempo mínimo ligado forçado que mantenha a fonte ativa depois de as válvulas poderem ter fechado.

Mudar o nome ou uma distância de paragem atualmente sem uso não reinicia o ciclo
de procura nem o atraso. Reativar um fornecimento usa a última transição comunicada
para desligado para respeitar o tempo mínimo desligado.

Desligar fora do Velair o interruptor de um fornecimento ativado suspende o controlo automático. Uma notificação persistente do Home Assistant e uma entrada em Atividade explicam que o fornecimento foi desligado fora do Velair e permanece pausado até a retomada. O motivo também aparece junto a **Retomar automático** e no Estado em tempo real. Temperaturas disponíveis continuam visíveis durante a pausa. Use **Retomar automático** para reavaliar a demanda atual; retomar não implica ligar. Um novo atraso para ligar começa quando a demanda é confirmada, e o tempo mínimo desligado continua valendo. A suspensão é guardada entre reinícios. Guardar outras alterações não a remove. Desabilitar ou excluir o fornecimento não chama o interruptor.

Ligar o interruptor fora do Velair não substitui o controlo automático. Quando
todos os termóstatos associados comunicam ausência de procura, o Velair desliga
após o atraso configurado. Se o Home Assistant confirmar que essa transição para
desligado pertence à correção do Velair, este cria uma notificação persistente e
uma entrada de Atividade associada ao interruptor. A mensagem identifica o
fornecimento, explica que a ativação externa foi corrigida por não existir procura
estimada de calor ou frio e liga a **Controlo do fornecimento** para rever ou
desativar o controlo. Não presume que a alteração foi feita por uma pessoa.

Correções repetidas para o mesmo fornecimento e interruptor são informadas no máximo uma vez a cada 15 minutos durante a execução atual da integração. Reatribuir o interruptor inicia um novo período. Cada fornecimento usa uma notificação; uma correção posterior permitida substitui a anterior. Avisos de pausa têm notificação separada e limite próprio de 15 minutos; uma correção recente não oculta uma pausa posterior. Falhas de entrega ou aceitação do serviço sem transição informada para desligado não geram aviso de sucesso.

Um desligar manual mais recente tem prioridade sobre um pedido de guardar ou
retomar em curso. Retoma explicitamente de novo se pretenderes controlo automático
após esse desligar. A suspensão mantém-se também após migração de unidades e reinício.

Um interruptor indisponível ou comando falhado é indicado no fornecimento.
As tentativas de entrega são limitadas e não se repetem a cada atualização do
sensor. A aceitação de um comando pelo Home Assistant não prova que o equipamento
físico tenha funcionado.

Fornecimentos importados ficam desativados e suspensos. Revê a saída e as divisões,
ativa, guarda e retoma explicitamente o controlo automático quando adequado.

<a id="preconditioning-master-and-performance"></a>
## Mestre do pré-condicionamento e desempenho

O [Mestre do pré-condicionamento](adaptive-preconditioning.pt-pt.md#preconditioning-master)
limita o início da preparação das divisões dependentes. O fornecimento partilhado
segue a procura das divisões. Uma instalação com caldeira controlada por válvulas
não precisa automaticamente de um mestre; o Velair não cria dependências entre
estas definições.

O controlador escuta as entidades configuradas e usa um único processo de trabalho
que agrupa eventos e, no máximo, um temporizador por fornecimento. Não faz sondagem,
não guarda amostras de temperatura e não exige um navegador aberto. Alterações
rotineiras de temperatura sem uma mudança relevante do estado de controlo não
transmitem novamente o estado completo do painel.
