<a id="shared-climate-supply"></a>
# Fornecimento de climatização compartilhado
<!-- velair-docs:start -->
Traduções: [Original em inglês](shared-climate-supply.md) · [Español](shared-climate-supply.es.md) · [Français](shared-climate-supply.fr.md) · [Deutsch](shared-climate-supply.de.md) · [Italiano](shared-climate-supply.it.md) · [Nederlands](shared-climate-supply.nl.md) · [Polski](shared-climate-supply.pl.md) · [Português (Brasil)](shared-climate-supply.pt-br.md) · [Português (Portugal)](shared-climate-supply.pt-pt.md) · [Русский](shared-climate-supply.ru.md) · [Status das traduções](../translation-status.md)

<details>
<summary>Status desta tradução</summary>

| Informação | Status |
| --- | --- |
| Versão de referência | 1.9.0-beta.6 |
| Última sincronização | 2026-10-28 |
| Revisão linguística | Tradução assistida por IA |
| Em relação ao original | Sincronizada com o original em inglês. |

</details>

---
<!-- velair-docs:end -->

O fornecimento de climatização compartilhado estima se os termostatos associados
precisam de aquecimento ou resfriamento e controla um `switch` comum, como um
relé de pedido à caldeira. É opcional e permanece desativado até ativar
explicitamente um fornecimento em **Controle do fornecimento**. A estimativa não
confirma a abertura de válvulas, a circulação de água nem o aquecimento físico.

<a id="configure-a-supply"></a>
## Configurar um fornecimento

Abra **Controle do fornecimento** no painel do Velair e escolhe **Adicionar
fornecimento**. Selecione um elemento da lista para editar os detalhes ao lado,
ou abaixo em uma tela estreita. Sem fornecimentos, o convite inicial oferece a
mesma ação. A lista **Fornecimentos compartilhados** representa circuitos de
aquecimento ou resfriamento controlados, separados de agrupamentos gerais de
termostatos.

Defina o **Nome do fornecimento**, escolhe um interruptor existente e a
**Finalidade do fornecimento** (Aquecimento ou Resfriamento), e seleciona os
termostatos gerenciados alimentados por esse circuito. Cada interruptor só pode
pertencer a um fornecimento. Os interruptores de controle do próprio Velair não
podem ser usados como saídas.

A finalidade descreve o que o equipamento fornece. Não altera os modos HVAC dos
termostatos: uma fonte de aquecimento só responde à demanda de calor; uma fonte
de resfriamento só responde à demanda de frio.

Cada elemento da lista identifica a finalidade, o número de termostatos, o
interruptor escolhido e o estado salvo do controle automático. Edite nome,
interruptor e finalidade diretamente no resumo superior, junto do controle de
ativação e do ícone de salvar. Cada configuração aparece uma única vez; não existe
uma seção separada de configurações do fornecimento. **Estado do interruptor** é o
estado observado da entidade; o resumo da lista descreve a configuração salva.
O interruptor de ativação só altera um rascunho até salvar: pode aparecer
ativado enquanto a lista ainda indica Desativado. A demanda não é avaliada com
o controle desativado ou suspenso. Os botões de informação explicam estas
diferenças, o controle exclusivo, a finalidade e os tempos sem alongar o formulário.

Use **Remover fornecimento**, o ícone de lixeira na lista, para remover um elemento.
A remoção também só se aplica ao salvar. Expanda **Opções de temporização**,
**Demanda e histerese** ou **Termostatos associados** para editar essa parte.
A ajuda ao lado do título da funcionalidade abre um resumo e este guia.
Mudar de fornecimento mantém as alterações não salvas. **Salvar fornecimentos**,
o ícone no cabeçalho dos detalhes, aplica toda a lista editada, incluindo remoções.
Continua disponível no estado vazio quando você remove o último fornecimento.
Como em Modelos e Predefinições, não existe botão separado para descartar.
Ao sair da aba com alterações, é pedida confirmação para descartá-las;
ao voltar, volta a lista salva. A navegação aguarda um pedido de salvar
ou retomar em curso.

Restaurar todos os valores editados nos valores salvos elimina o rascunho, permitindo
novamente atualizações em tempo real e **Retomar controle automático**. Alterações
salvas chegam aos outros painéis ligados mesmo sem mudança da demanda estimada.

Escolha o modo e os valores de histerese do fornecimento. Cada termostato herda o
modo; você pode substituir apenas os valores numéricos. Na linha selecionada,
**Histerese do termostato** permite **Usar histerese do fornecimento** ou
**Valores de histerese personalizados**. O seletor fica alinhado com a caixa e o
nome do termostato; exceções numéricas e limites efetivos aparecem abaixo.
No modo personalizado, cada um dos dois valores pode herdar de forma independente.
São diferenças de temperatura na unidade atual do painel; mudar de unidade converte
essas diferenças sem tratá-las como temperaturas absolutas.

Os campos numéricos assinalam valores inválidos durante a edição. A histerese tem
de ser finita e não negativa; uma exceção vazia herda o valor do fornecimento.
Não é possível salvar enquanto algum fornecimento tiver números inválidos;
a lista assinala o elemento a corrigir.

Salve explicitamente para aplicar. Ativar o fornecimento dá ao Velair controle
automático exclusivo do interruptor. Evite outras automatizações a controlar
continuamente a mesma saída.

Falhas ao salvar aparecem no cabeçalho dos detalhes, junto à ação de salvar.
Erros de configuração identificam o fornecimento, o campo e a correção; o Velair
seleciona esse fornecimento, abre a seção e assinala e coloca o foco no campo. Erros do Home
Assistant ou de ligação mantêm a explicação original, sem atribuí-los a outro campo.
Os rascunhos ficam disponíveis para corrigir e tentar novamente, mesmo depois
de remover o último fornecimento.

<a id="live-status"></a>
## Estado ao vivo

Escolha **Estado ao vivo** no cabeçalho de um fornecimento salvo para abrir o monitor somente leitura. Ele usa a configuração salva, mesmo com alterações não salvas no editor. Fornecimentos novos precisam ser salvos antes de abrir o monitor.

O resumo mostra o estado do interruptor informado pelo Home Assistant, o número de termostatos solicitando fornecimento e o estado do controle automático, incluindo esperas de tempo mínimo desligado ou atraso para desligar. Uma solicitação e um interruptor ligado não confirmam aquecimento, resfriamento, abertura de válvula ou fluxo físicos.

Quando a demanda é avaliada e há leituras, cada termostato tem uma linha de temperatura com leitura atual, alvo efetivo e limites de início/parada. Uma faixa hachurada com a cor de tema do Room Assist marca o intervalo entre os limites, haja ou não solicitação. Com demanda, uma seta fina colorida vai da leitura atual ao limite de parada: laranja para aquecimento, azul para resfriamento. Indica a direção de temperatura solicitada, não fluxo térmico nem operação física confirmada. Sem demanda, a seta desaparece e o marcador atual é neutro; a faixa estática continua visível. A temperatura aumenta da esquerda para a direita nos dois sentidos. Valores e rótulos ficam visíveis sem passar o mouse, inclusive em telas móveis. Atual e alvo ficam centralizados em suas posições reais; rótulos próximos usam linhas separadas. Cada marcador agrupa a temperatura-limite e a distância com sinal ao alvo, sem tabela separada.

Os rótulos destacam o próximo limite relevante. Durante a demanda, **Para em** identifica a parada. Antes de a leitura ultrapassar o início, esse limite é simplesmente **Limite inferior** no aquecimento ou **Limite superior** no resfriamento. Depois de entrar na faixa de retenção, **Reinicia em** identifica o limite do próximo ciclo. Sem demanda, **Inicia em** fica destacado e o outro limite usa nome neutro. Limites coincidentes compartilham um marcador. Demanda desconhecida permanece neutra, sem presumir solicitação.

Quando o Room Assist controla a demanda, o monitor identifica essa origem e usa seu sensor e limites de controle efetivos, em vez de tratar o alvo corrigido do termostato como alvo do cômodo. A pergunta compacta **Por que minha histerese não é usada?** explica a prioridade do Room Assist e os ajustes salvos de fornecimento inativos. Só abre ao selecionar e mantém essa escolha durante atualizações. Instruções normais de início/parada não se repetem abaixo do gráfico; dados indisponíveis ou não avaliados continuam explicados. Por exemplo, alvo de conforto de 17 °C com limites de 16 e 18 °C significa início 1 °C abaixo e parada 1 °C acima, mesmo se a distância de início do fornecimento, não usada, for 0,2 °C. Faixas nativas do Room Assist podem usar um só limite: marcadores coincidentes não significam distância zero ao alvo de conforto. Leituras ausentes e demanda não avaliada são explícitas, sem manter uma solicitação anterior como dado atual. Termostatos desligados e fornecimentos desabilitados ou suspensos mantêm leituras atuais disponíveis, sem apresentar alvos ou limites não avaliados.

O monitor recebe atualizações enquanto aberto e encerra a inscrição ao fechar. Mostra as últimas leituras informadas ao Home Assistant; não aumenta a frequência de informes dos dispositivos, não simula temperaturas e não armazena histórico.

<a id="how-estimated-demand-works"></a>
## Como funciona a demanda estimada

Novos fornecimentos no painel usam **Parar no alvo**, com **Histerese de ativação** de **0.3 °C** ou **0.54 °F** e **Histerese de desativação** zero. São diferenças de temperatura equivalentes; os termostatos herdam os valores do fornecimento até escolher valores próprios. Os exemplos abaixo usam valores diferentes para esclarecer cada modo.

Nos termostatos comuns, a histerese define um limite de início e outro de parada.
Entre eles, a demanda anterior mantém-se. Todas as comparações incluem o próprio
limite. Exemplos com alvo de 22 °C:

Os valores de histerese são diferenças de temperatura em relação ao alvo. A histerese de ativação determina o início da demanda. A de desativação define quanto a temperatura deve ultrapassar o alvo, no sentido do aquecimento ou resfriamento, para encerrar a demanda. Parar no alvo usa zero para a desativação. Simétrica aplica o mesmo valor dos dois lados; Histerese personalizada permite ajustar ambos separadamente.

| Modo | Valores | Aquecimento: início / parada | Resfriamento: início / parada |
| --- | --- | --- | --- |
| Parar no alvo (predefinido) | Histerese de ativação 0,5 °C | ≤21,5 / ≥22 °C | ≥22,5 / ≤22 °C |
| Simétrica | Histerese simétrica 0,5 °C de cada lado | ≤21,5 / ≥22,5 °C | ≥22,5 / ≤21,5 °C |
| Histerese personalizada | Histerese de ativação 0,5 °C; Histerese de desativação 0,2 °C | ≤21,5 / ≥22,2 °C | ≥22,5 / ≤21,8 °C |

O gráfico em **Demanda e histerese** acompanha a edição da finalidade, modo e
distâncias. Usa um alvo de exemplo identificado, não o alvo real de um termostato.
As temperaturas aparecem junto dos marcadores de início e fim; os segmentos ligam
cada distância de histerese ao alvo. O eixo identificado da temperatura do cômodo
cresce para a direita. A nota explica que, entre início e parada, uma demanda
existente continua; sem demanda anterior, não começa outra. O aquecimento solicita
fornecimento do lado frio e o resfriamento do lado quente. O gráfico explica a
estimativa, sem simular equipamento ou atrasos. O alvo de exemplo é 22 °C ou 72 °F.
Durante valores vazios, incompletos ou inválidos, um gráfico cinzento sem leituras
mantém a altura da prévia até o valor voltar a ser válido.

**Histerese de ativação** é a diferença de temperatura em relação ao alvo antes de solicitar aquecimento ou resfriamento. **Histerese de desativação** é a diferença além do alvo antes de terminar a solicitação. **Histerese simétrica** aplica a mesma diferença de cada lado do alvo, não a largura total da faixa. **Histerese personalizada** permite definir ativação e desativação separadamente. Ambas aceitam zero; com ambas zero, exatamente no alvo significa sem demanda. Dentro da faixa após reiniciar, mudar o alvo ou a histerese, não se presume nova demanda. Trocar de modo preserva os valores personalizados de parada, que voltam a valer ao retornar à **Histerese personalizada**.

**Parar no alvo** é o ponto de partida recomendado para termostatos comuns.
Simétrica e Personalizada são opções avançadas: o termostato pode fechar a válvula
ou parar o compressor no alvo, antes de atingir o limite de parada além do alvo.
A fonte compartilhada pode continuar solicitada. Estas configurações estimam a demanda;
não alteram os limites próprios do termostato nem forçam a circulação de calor.

Mantenha separados os limites de fornecimentos de aquecimento e resfriamento que
compartilhem um termostato de intervalo. Grandes distâncias de parada podem conservar
demanda de calor quando começa o resfriamento, ou o contrário. Os fornecimentos
agregam de forma independente e não têm interbloqueio entre saídas opostas.
Use interbloqueios adequados no equipamento quando necessário.

A fonte é solicitada se pelo menos um termostato associado tiver demanda válida.
Um termostato desligado ou com direção HVAC incompatível não a solicita. Dados
indisponíveis ou em falta produzem demanda desconhecida; não preservam um pedido
anterior indefinidamente. Outros cômodos válidos continuam a poder solicitar.
Sem nenhum cômodo válido solicitando, o fornecimento pede para desligar após
o atraso configurado.

São usados os alvos atuais dos termostatos, incluindo alterações manuais e alvos aplicados pelo Pré-condicionamento adaptativo ou Retorno planejado. Pausar uma programação não desativa o controle automático do fornecimento. Uma faixa válida usa o limite inferior para aquecimento e o superior para resfriamento por padrão. Para uma faixa fixa de Aquecimento ou Resfriamento com **Alvo de referência** selecionado em **Configurações → Dispositivos de climatização e grupos**, o controle do fornecimento usa o mesmo limite e a direção do modo fixo. Um alvo ambíguo não pode solicitar fornecimento.

<a id="room-assist"></a>
## Room Assist

Um painel informativo azul no início de **Demanda e histerese**, antes do seletor
de modo, explica a prioridade do Room Assist e quando se aplica a histerese.

Quando o Room Assist controla o alvo ativo de um cômodo, o fornecimento segue
sua intenção de controle confirmada. Em aquecimento fixo, a fase `towards_upper`
solicita calor; em resfriamento fixo, `towards_lower` solicita frio. Seus limites
de comutação continuam a ser a referência: a histerese do fornecimento e a exceção
do cômodo não são aplicadas novamente. O controle de intervalo nativo segue a
direção confirmada. Um alvo assistido inválido ou pendente permanece desconhecido
até existir uma confirmação válida.

O alvo corrigido do termostato não é comparado com um sensor externo do cômodo.
O Room Assist pode deixar de solicitar fornecimento mesmo que o termostato continue
informando o mesmo alvo ajustado.

<a id="timing-and-manual-control"></a>
## Temporização e controle manual

**Atraso para ligar** exige demanda estimada contínua antes de iniciar o fornecimento. Se a demanda desaparece ou fica desconhecida, a contagem reinicia. Ela pertence ao fornecimento: um cômodo pode parar de solicitar enquanto outro continua, sem reiniciar a espera. **Tempo mínimo desligado** adia o reinício após desligar. Quando surge demanda, vale a maior espera: o **tempo mínimo desligado restante** ou o **atraso para ligar completo**. Eles não são somados.

Por exemplo, com tempo mínimo desligado de 60 segundos e atraso para ligar de 20 segundos:

- Desligado há um dia: a proteção terminou; espere somente 20 segundos desde o surgimento da demanda.
- Demanda logo após desligar: espere 60 segundos, o maior dos tempos configurados.
- Demanda 50 segundos após desligar: restam 10 segundos de proteção. Espere 20 segundos desde a demanda, permitindo ligar 70 segundos após o desligamento.

A demanda deve continuar durante toda a espera. Estado ao vivo mostra o tempo restante e se a confirmação de demanda ou o tempo mínimo desligado impede o início. Zero desativa apenas a espera correspondente; a outra continua valendo.

**Atraso para desligar** exige um período contínuo sem demanda antes de desligar; a volta da demanda cancela o atraso. As três configurações aceitam segundos inteiros de 0 a 86.400 e têm padrão zero. Não existe tempo mínimo ligado forçado que mantenha a fonte ativa depois de as válvulas poderem ter fechado.

Mudar o nome ou uma distância de parada atualmente sem uso não reinicia o ciclo
de demanda nem o atraso. Reativar um fornecimento usa a última transição comunicada
para desligado para respeitar o tempo mínimo desligado.

Desligar fora do Velair o interruptor de um fornecimento habilitado suspende o controle automático. Uma notificação persistente do Home Assistant e uma entrada em Atividade explicam que o fornecimento foi desligado fora do Velair e permanece pausado até a retomada. O motivo também aparece junto a **Retomar automático** e no Estado ao vivo. Temperaturas disponíveis continuam visíveis durante a pausa. Use **Retomar automático** para reavaliar a demanda atual; retomar não implica ligar. Um novo atraso para ligar começa quando a demanda é confirmada, e o tempo mínimo desligado continua valendo. A suspensão é salva entre reinícios. Salvar outras alterações não a remove. Desabilitar ou excluir o fornecimento não chama o interruptor.

Ligar o interruptor fora do Velair não substitui o controle automático. Quando
todos os termostatos associados comunicam ausência de demanda, o Velair desliga
após o atraso configurado. Se o Home Assistant confirmar que essa transição para
desligado pertence à correção do Velair, este cria uma notificação persistente e
uma entrada de Atividade associada ao interruptor. A mensagem identifica o
fornecimento, explica que a ativação externa foi corrigida por não existir demanda
estimada de calor ou frio e inclui um link para **Controle do fornecimento** para revisar ou
desativar o controle. Não presume que a alteração foi feita por uma pessoa.

Correções repetidas para o mesmo fornecimento e interruptor são informadas no máximo uma vez a cada 15 minutos durante a execução atual da integração. Reatribuir o interruptor inicia um novo período. Cada fornecimento usa uma notificação; uma correção posterior permitida substitui a anterior. Avisos de pausa têm notificação separada e limite próprio de 15 minutos; uma correção recente não oculta uma pausa posterior. Falhas de entrega ou aceitação do serviço sem transição informada para desligado não geram aviso de sucesso.

Um desligar manual mais recente tem prioridade sobre um pedido de salvar ou
retomar em curso. Retome explicitamente de novo se você quiser controle automático
após esse desligar. A suspensão mantém-se também após migração de unidades e reinício.

Um interruptor indisponível ou comando falhado é indicado no fornecimento.
As tentativas de entrega são limitadas e não se repetem a cada atualização do
sensor. A aceitação de um comando pelo Home Assistant não prova que o equipamento
físico tenha funcionado.

Fornecimentos importados ficam desativados e suspensos. Revise a saída e os cômodos,
ative, salve e retome explicitamente o controle automático quando adequado.

<a id="preconditioning-master-and-performance"></a>
## Mestre do pré-condicionamento e desempenho

O [Mestre do pré-condicionamento](adaptive-preconditioning.pt-br.md#preconditioning-master)
limita o início da preparação dos cômodos dependentes. O fornecimento compartilhado
segue a demanda dos cômodos. Uma instalação com caldeira controlada por válvulas
não precisa automaticamente de um mestre; o Velair não cria dependências entre
estas configurações.

O controlador escuta as entidades configuradas e usa um único processo de trabalho
que agrupa eventos e, no máximo, um temporizador por fornecimento. Não faz consulta periódica,
não salva amostras de temperatura e não exige um navegador aberto. Alterações
rotineiras de temperatura sem uma mudança relevante do estado de controle não
transmitem novamente o estado completo do painel.
