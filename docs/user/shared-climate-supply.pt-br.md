<a id="shared-climate-supply"></a>
# Fornecimento de climatização compartilhado
<!-- velair-docs:start -->
Traduções: [Original em inglês](shared-climate-supply.md) · [Español](shared-climate-supply.es.md) · [Français](shared-climate-supply.fr.md) · [Deutsch](shared-climate-supply.de.md) · [Italiano](shared-climate-supply.it.md) · [Nederlands](shared-climate-supply.nl.md) · [Polski](shared-climate-supply.pl.md) · [Português (Brasil)](shared-climate-supply.pt-br.md) · [Português (Portugal)](shared-climate-supply.pt-pt.md) · [Русский](shared-climate-supply.ru.md) · [Status das traduções](../translation-status.md)

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

<a id="how-estimated-demand-works"></a>
## Como funciona a demanda estimada

Novos fornecimentos no painel usam **Parar no alvo**, com distância de início
de **0,3 °C** ou **0,54 °F** e distância de parada zero. São diferenças de
temperatura equivalentes. As exceções por termostato herdam estes valores até
escolher valores personalizados. Os exemplos seguintes usam distâncias diferentes
para distinguir os modos.

Nos termostatos comuns, a histerese define um limite de início e outro de parada.
Entre eles, a demanda anterior mantém-se. Todas as comparações incluem o próprio
limite. Exemplos com alvo de 22 °C:

| Modo | Valores | Aquecimento: início / parada | Resfriamento: início / parada |
| --- | --- | --- | --- |
| Parar no alvo (predefinido) | Início 0,5 °C | ≤21,5 / ≥22 °C | ≥22,5 / ≤22 °C |
| Simétrica | Distância 0,5 °C | ≤21,5 / ≥22,5 °C | ≥22,5 / ≤21,5 °C |
| Personalizada | Início 0,5 °C; parada 0,2 °C | ≤21,5 / ≥22,2 °C | ≥22,5 / ≤21,8 °C |

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

A distância de início afasta-se do alvo antes de ser necessário aquecer ou
resfriar. A distância de parada ultrapassa o alvo na direção do aquecimento ou
resfriamento. Ambas aceitam zero; com as duas a zero, no alvo exato não há demanda.
Dentro da banda após um reinício, alteração de alvo ou da histerese, não se presume
nova demanda. Mudar de modo conserva os valores de parada personalizados, que
voltam a aplicar-se quando você volta ao modo personalizado.

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

São usados os alvos atuais, incluindo alterações manuais e alvos aplicados pelo
Pré-condicionamento adaptativo ou Retorno planejado. Pausar uma programação não
desativa o controle do fornecimento. Um intervalo válido usa o limite inferior
para aquecimento e o superior para resfriamento; um alvo ambíguo não solicita.

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

**Tempo mínimo desligado** adia uma nova partida após desligar o interruptor.
**Atraso ao desligar** exige um período contínuo sem demanda antes de desligar;
o retorno da demanda cancela-o. Ambos aceitam segundos inteiros de 0 a 86 400,
com zero por padrão. Não há um período mínimo ligado que mantenha a fonte
ativa quando as válvulas já possam estar fechadas.

Mudar o nome ou uma distância de parada atualmente sem uso não reinicia o ciclo
de demanda nem o atraso. Reativar um fornecimento usa a última transição comunicada
para desligado para respeitar o tempo mínimo desligado.

Desligar fora do Velair o interruptor de um fornecimento ativado suspende o
controle automático. Use **Retomar controle automático**. A suspensão persiste após
reinícios; salvar outras alterações não a elimina. Desativar ou remover um
fornecimento solicita que a saída anteriormente controlada seja desligada.

Ligar o interruptor fora do Velair não substitui o controle automático. Quando
todos os termostatos associados comunicam ausência de demanda, o Velair desliga
após o atraso configurado. Se o Home Assistant confirmar que essa transição para
desligado pertence à correção do Velair, este cria uma notificação persistente e
uma entrada de Atividade associada ao interruptor. A mensagem identifica o
fornecimento, explica que a ativação externa foi corrigida por não existir demanda
estimada de calor ou frio e inclui um link para **Controle do fornecimento** para revisar ou
desativar o controle. Não presume que a alteração foi feita por uma pessoa.

Correções repetidas do mesmo fornecimento e interruptor são comunicadas no máximo
uma vez a cada 15 minutos durante a execução atual da integração. Mudar de
interruptor inicia um novo período de aviso. Cada fornecimento usa uma notificação;
um aviso posterior permitido substitui o anterior. Falhas de entrega ou aceitação
do serviço sem uma transição correspondente para desligado não produzem aviso de
sucesso. Demanda desconhecida não é comunicada como ausência confirmada de demanda.
Uma integração de interruptor que não conserve o contexto do comando não permite
a atribuição necessária. Estas regras não alteram o controle nem exigem consulta periódica.
Falhas nas notificações ou na Atividade não interrompem o controle; a Atividade
exige a integração de atividade/registro do Home Assistant.

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
