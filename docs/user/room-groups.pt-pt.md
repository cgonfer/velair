<a id="room-groups"></a>
# Grupos de divisão
<!-- velair-docs:start -->
Traduções: [Original em inglês](room-groups.md) · [Español](room-groups.es.md) · [Français](room-groups.fr.md) · [Deutsch](room-groups.de.md) · [Italiano](room-groups.it.md) · [Nederlands](room-groups.nl.md) · [Polski](room-groups.pl.md) · [Português (Brasil)](room-groups.pt-br.md) · [Português (Portugal)](room-groups.pt-pt.md) · [Русский](room-groups.ru.md) · [Estado das traduções](../translation-status.md)

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

Um grupo de divisão dá a várias entidades `climate` geridas uma única programação, atribuição de Perfil, reforço, pausa e modelo de Pré-condicionamento adaptativo. Use um grupo quando os dispositivos controlam a mesma divisão física. Divisões separadas devem permanecer independentes, mesmo quando partilham um modelo diário ou um fornecimento de aquecimento/arrefecimento.

<a id="what-a-group-shares"></a>
## O que um grupo partilha

| Partilhado pelo grupo de divisão | Independente para cada dispositivo físico |
| --- | --- |
| Programação, atribuições de Modos/Perfis e ajustes de controlo | Temperatura, humidade, ação HVAC e disponibilidade informadas |
| Reforços, pausas de zona e Ajuste manual | Sensores, limites e interruptor de monitorização de Conforto |
| Uma decisão de início do pré-condicionamento e um modelo de aprendizagem térmica | Observações do dispositivo e evidências de entrega no Diagnóstico |
| Configuração e correção do Room Assist | Regulação interna de temperatura do próprio dispositivo |

O grupo é uma unidade de controlo interna do Velair. Não é uma nova entidade `climate` ou `group` do Home Assistant. O Velair gera um identificador interno estável, como `group.0123456789abcdef0123456789abcdef`; renomear o grupo mantém esse identificador. Ele pode aparecer no diagnóstico, nas exportações ou em configurações técnicas, mas não no registo de entidades nem nos estados das Ferramentas de programador do Home Assistant. Não o use como alvo de um serviço `climate.*` do Home Assistant. O Velair resolve o grupo para os seus destinatários reais de comandos.

<a id="create-a-group"></a>
## Criar um grupo

1. Abra o separador **Grupos de divisão** e use o botão de adicionar.
2. Informe o nome e use **Adicionar dispositivos de climatização** para selecionar os dispositivos geridos da divisão. Adicione pelo menos dois. Pesquise por nome ou ID da entidade e confirme a seleção. Dispositivos atribuídos a outro grupo ficam indisponíveis e identificam seu grupo.
3. Escolha um membro cuja temperatura ambiente informada represente a temperatura própria do grupo. Essa referência não torna o dispositivo dono do grupo. Configure um sensor externo opcional no **Room Assist**, como num dispositivo independente.
4. Escolha se o Velair envia comandos a todos os membros ou a um membro selecionado cuja instalação já propaga os comandos aos restantes dispositivos.
5. Escolha a configuração existente a adotar em **Usar configuração de**. Exporte a configuração atual antes se precisar de uma cópia de recuperação; inclua **Aprendizagem do pré-condicionamento** para também preservar a calibração.
6. Use o botão de guardar do cabeçalho para abrir **Rever alterações do grupo**. Nada foi aplicado ainda. Leia as diferenças de configuração e o aviso de reinício da aprendizagem; escolha **Confirmar e guardar** ou **Voltar à edição**. Erros de validação e de gravação permanecem no fluxo de revisão para corrigir o rascunho e tentar novamente.

<a id="configuration-fields"></a>
### Campos de configuração

| Campo | Significado |
| --- | --- |
| Nome do grupo | Nome de apresentação obrigatório e único entre os grupos. |
| Membros | Dispositivos geridos nesta divisão. A ordem controla sua apresentação individual na Visão geral. Um dispositivo não pode pertencer a dois grupos. |
| Referência de temperatura | A temperatura informada por um membro representa a divisão no Velair. Isso não dá prioridade a esse membro. |
| Envio de comandos | **Todos os membros** por predefinição, ou **Membro selecionado** se a instalação já propaga os comandos. |
| Destinatário dos comandos | Aparece apenas com **Membro selecionado**; escolha quem recebe os comandos do Velair. |
| Usar configuração de | Apenas na criação: escolha o membro cuja programação, configuração de Perfis e ajustes de controlo serão o ponto de partida partilhado. |

A referência de temperatura, o destinatário dos comandos e a origem da configuração inicial podem ser três membros diferentes.

<a id="send-commands-to-all-members-or-one-recipient"></a>
### Enviar comandos a todos ou a um destinatário

**Todos os membros** é o modo predefinido: o Velair envia comandos a cada membro. **Membro selecionado** envia comandos somente ao **Destinatário dos comandos** indicado abaixo. Use esse modo apenas quando a instalação já propaga esses comandos aos outros dispositivos; o Velair não faz essa propagação adicional.

Por exemplo, uma divisão pode ter três válvulas de radiador e um controlador ambiente que também aparece como entidade `climate`. Se a instalação propaga os comandos desse controlador às válvulas, inclua os quatro membros, escolha o controlador como referência de temperatura, selecione **Membro selecionado** e indique-o como destinatário. Os quatro continuam visíveis, com uma programação e uma decisão de pré-condicionamento. Se cada dispositivo precisa de comando direto, use **Todos os membros**.

Essas opções selecionam os destinatários dos comandos; nenhuma cria programações ou modelos de aprendizagem independentes para os membros.

<a id="adopt-an-existing-configuration"></a>
### Adotar uma configuração existente

A adoção cria uma única configuração partilhada do Velair a partir das programações, Perfis e ajustes de controlo do membro selecionado. Substitui a configuração de controlo independente dos membros; não mantém cópias separadas sincronizadas nem copia ajustes de firmware. Cada dispositivo físico mantém os seus próprios ajustes, sensores e limites de Conforto; eles não são substituídos pelos do membro selecionado. Os históricos de aprendizagem não são combinados. A referência nativa do grupo, o destinatário e a origem da configuração inicial podem ser membros diferentes.

O Velair valida o grupo completo antes de guardar. Um dispositivo só pode pertencer a um grupo. Combinações incompatíveis precisam ser resolvidas antes do uso; agrupar não acrescenta capacidades HVAC ao dispositivo. Um membro agrupado não pode ser controlado simultaneamente pela execução externa de programação e pelo Velair. Os destinatários devem partilhar modos compatíveis, limites de temperatura sobrepostos e uma grelha de incrementos de temperatura compatível. Quando os seus modos HVAC ativos diferirem, selecione um modo explícito em vez de pedir ao Velair que preserve um modo comum.

<a id="shared-control-and-individual-observations"></a>
## Controlo partilhado e observações individuais

Programações, Perfis e outros seletores de controlo da divisão mostram o grupo em vez dos membros individuais. Edite a programação e os recursos existentes normalmente. O grupo armazena uma configuração, em vez de cópias sincronizadas separadas.

Conforto permanece individual: o painel e os cartões mostram cada dispositivo físico com suas próprias medições, sensores, limites e interruptor de monitorização. Um sensor externo opcional do Room Assist do grupo não substitui essas leituras, a menos que o utilizador o selecione explicitamente nos ajustes de Conforto de um membro. Criar, editar ou desfazer um grupo preserva a configuração de Conforto de cada membro. Grupos guardados antes do armazenamento independente de Conforto inicializam cada membro com os ajustes de Conforto anteriormente guardados no grupo; cada cópia pode então ser editada separadamente. Ajustes individuais anteriores não podem ser recuperados automaticamente.

A **Visão geral** continua a mostrar cada dispositivo físico. Seu grupo identifica a programação e a autoridade de controlo partilhadas, enquanto temperatura, disponibilidade e estado permanecem individuais. Uma ação de controlo sobre um membro aplica-se à divisão; não cria uma programação independente concorrente.

**Próximos eventos** mostra cada dispositivo físico com o grupo abaixo do nome, como nas linhas individuais da **Linha do tempo de hoje**. Os membros mostram o mesmo evento autoritativo do grupo; o Velair não cria programações ou eventos de backend separados. Selecione o nome de um dispositivo para abrir a programação partilhada do grupo no dia do evento, incluindo a programação própria de um Perfil quando ele fornece o evento. Regresso planeado usa a programação do Modo de destino. Isso também funciona num cartão Próximos eventos no painel de controlo. Um cartão filtrado por um membro mostra apenas ele; um filtro por grupo mostra todos os membros.

Selecione um grupo na lista para editá-lo no painel de detalhes ao lado, com a mesma organização de lista/detalhes de Modelos e Controlo do fornecimento. O resumo identifica membros, fonte de temperatura e destinatários, além do estado partilhado de controlo e preparação. A ação do cabeçalho revê e guarda as alterações; a remoção está na lista e exige confirmação. A ajuda explica as escolhas de referência, envio e configuração. Se faltarem informações obrigatórias, a revisão identifica os campos a completar. Durante a edição, o resumo de estado continua descrevendo o grupo guardado até que as alterações revistas sejam guardadas. O Diagnóstico separa evidências de cada dispositivo da intenção comum da divisão. Chamadas bem-sucedidas de serviços do Home Assistant não comprovam movimento de válvula ou fluxo térmico. Quando os comandos são enviados a um membro selecionado, o Velair não afirma ter comandado diretamente os demais.

<a id="temperature-reference-and-room-assist"></a>
## Referência de temperatura e Room Assist

Na programação normal, o Velair envia o alvo partilhado aos destinatários configurados. Cada dispositivo continua regulando internamente com o seu próprio sensor; escolher uma referência de temperatura do grupo não altera a regulação do firmware.

**Referência de temperatura** fornece a leitura nativa do grupo para pré-condicionamento, aprendizagem térmica, base nativa do Room Assist, estimativa de procura de fornecimento e resumo do grupo. Escolha um dos membros. Configure um sensor ambiente externo opcional no [Room Assist](room-assist.pt-pt.md#room-groups), não como outra referência nativa no editor. Quando o Room Assist está ativado, essa leitura externa torna-se a medição efetiva da divisão e o Velair calcula uma correção partilhada. Os comandos continuam a seguir **Envio de comandos**.

Conforto permanece independente: ativar o Room Assist do grupo não substitui sensores ou limites de Conforto de cada membro.

<a id="pauses-manual-adjustment-and-resuming"></a>
## Pausas, Ajuste manual e retomada

Um grupo tem uma única autoridade de programação. Uma pausa de zona ou reforço solicitado por qualquer membro pertence, portanto, ao grupo inteiro. O separador Grupos de divisão mostra o estado guardado e não tem botão próprio de pausa. Use os controlos existentes dos membros. Retomar a mesma pausa partilhada por outro membro tem o mesmo alcance. Outros motivos independentes de pausa continuam a ter prioridade até terminar ou ser removidos. Uma Pausa ou Parada global continua afetando todas as divisões, inclusive dispositivos não agrupados.

Pausar a programação não implica desligar os dispositivos. A ação de pausa escolhida decide se o Velair preserva os estados atuais ou envia Desligado aos destinatários configurados do grupo.

A política de **Ajustes externos** em Definições pertence ao grupo. Uma mudança externa detectada no alvo ou modo HVAC de um membro pode colocar todo o grupo em **Ajuste manual**, seguindo as mesmas regras de programação e pausa de um dispositivo independente. Com **Até ao próximo bloco**:

1. Três membros seguem o alvo partilhado de `20 °C`.
2. Uma alteração externa aumenta um membro para `22 °C`.
3. O Velair cede a autoridade de programação de todo o grupo, preservando os estados. Não copia a alteração aos outros: eles podem permanecer em `22, 20, 20 °C`. A própria instalação ainda pode propagar alterações.
4. No próximo bloco, o Velair volta ao controlo Automático e envia o alvo partilhado aos destinatários configurados. É possível retomar Automático antes.

| Política de ajustes externos | Comportamento do grupo |
| --- | --- |
| Manter automático | O Velair mantém a autoridade e reaplica a intenção efetiva atual quando ela existe. |
| Até ao próximo bloco | O Ajuste manual termina no próximo bloco aplicável. Sem bloco futuro, retome Automático explicitamente. |
| Por um período | O grupo cede pelo tempo configurado. Novas mudanças externas renovam esse tempo. |
| Até ser retomado | O grupo cede até que o utilizador retome explicitamente o controlo Automático. |

Selecionar Manual explicitamente usa a política guardada do grupo e preserva os estados atuais. Se a política for **Manter automático**, Manual explícito dura até que o utilizador retome o controlo. O Room Assist cede durante o Ajuste manual.

Esse controlo Manual/Automático é separado do nome de Modo **Manual**, usado ao escolher Perfis diretamente. Consulte [Alterações externas e Ajuste manual](manual-control.pt-pt.md) para prioridades e comportamento especial dos blocos.

<a id="display-order"></a>
## Ordem de apresentação

Use os controlos de ordenação existentes em Definições para mover grupos e dispositivos independentes. Um grupo novo assume inicialmente a posição de o seu primeiro membro na ordem atual. Ordene os membros no painel de detalhes do separador Grupos de divisão. A Visão geral expande o grupo em entradas individuais consecutivas nessa ordem; os seletores de programação mostram uma entrada do grupo. Ambas as ordens são guardadas pelo backend.

A lista mostra apenas os membros selecionados. Novas seleções são acrescentadas ao final sem mudar a ordem existente. Use as setas para ordenar e o controlo de remoção para retirar um membro. Listas longas podem ser expandidas para mostrar todos. Mudanças de composição só se aplicam depois de rever e guardar o grupo.

<a id="learning-and-membership-changes"></a>
## Aprendizagem e mudanças de composição

O grupo aprende uma única resposta térmica, com históricos separados de aquecimento e arrefecimento. Com Room Assist desativado, a temperatura própria vem do membro selecionado. O Room Assist usa o sensor externo configurado somente quando ativado, seguindo as mesmas regras de controlo, limites de correção e preparação de um dispositivo independente. Selecionar um sensor não ativa a assistência. Limpar ou desativar o Room Assist devolve a medição à referência de temperatura do membro. Os comandos continuam a seguir o modo de envio, e o alvo real da programação não é alterado pelas correções temporárias do Room Assist. Históricos independentes existentes não são combinados. O Velair armazena aprendizagem para o grupo, não um modelo por membro. Observações individuais continuam disponíveis no Diagnóstico. A criação do grupo começa do zero, sem combinar históricos independentes anteriores.

| Alteração | Aprendizagem depois |
| --- | --- |
| Renomear o grupo ou reordenar membros | A aprendizagem do grupo é mantida. |
| Adicionar ou remover um membro | O grupo restante reinicia a aprendizagem, pois a sua composição física mudou. O membro removido começa aprendizagem independente do zero. |
| Alterar a referência de temperatura ou o envio de comandos | O grupo reinicia a aprendizagem e cancela a observação ativa anterior. |
| Desfazer o grupo | Cada membro começa aprendizagem independente do zero. O histórico do antigo grupo é removido. |

Remover um membro dá a ele uma cópia independente da configuração comum. Desfazer um grupo faz o mesmo para todos os membros. Reforços, pausas e histórico térmico ativos não são copiados para essas divisões independentes. Reveja programações e Perfis após mudar a autoridade de controlo.

Por exemplo, remover um dispositivo de um grupo de três deixa dois membros com um novo histórico do grupo e um dispositivo independente com um novo histórico. Excluir o grupo torna os três independentes. Nenhuma operação recupera automaticamente os históricos anteriores ao grupo. No editor, mantenha pelo menos dois membros em um grupo guardado; desfaça-o se todos devem se tornar independentes.

<a id="before-testing-the-beta"></a>
## Antes de testar a beta

Crie uma cópia de segurança da configuração e inclua a aprendizagem do pré-condicionamento se precisar da aprendizagem. Após rever e guardar um grupo, confira:

- Um grupo aparece em programação, Perfis, Pré-condicionamento e Room Assist.
- Cada membro continua visível individualmente em Visão geral, Próximos eventos, Linha do tempo de hoje, Conforto e Diagnóstico.
- O envio corresponde à instalação: todos recebem comandos diretos ou o destinatário selecionado os recebe e a instalação os propaga.
- Alterar os ajustes de Conforto de um membro não altera os demais.
- Uma pausa ou Ajuste manual a partir de um membro tem alcance partilhado da divisão.
- Recarregar o Home Assistant preserva o grupo, a ordem dos membros e a configuração partilhada.

Ao relatar um problema, inclua o modo de envio, o membro de referência de temperatura, se o Room Assist está ativado e as evidências relevantes do Diagnóstico. Uma chamada de serviço bem-sucedida não equivale ao dispositivo informar o estado solicitado.

Definições de betas anteriores podem conter uma referência externa de grupo. Carregá-las ou importá-las preserva a referência, sem escolher automaticamente um membro nem ativar Room Assist. O editor identifica esse valor legado e pede uma referência de membro antes de guardar um grupo editado. Configure o sensor externo no Room Assist ao mudar para a nova organização.

Grupos de divisão e grupos de fornecimento partilhado têm finalidades diferentes. Um grupo de divisão controla uma divisão; [Controlo do fornecimento](shared-climate-supply.pt-pt.md) agrega a procura de divisões para operar uma fonte comum. Modelos vinculados partilham o conteúdo de programação sem mudar a autoridade da divisão. Dependências de pré-condicionamento coordenam divisões separadas mantendo sua aprendizagem independente.
