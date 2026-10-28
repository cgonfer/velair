<a id="room-groups"></a>
# Grupos de cômodo
<!-- velair-docs:start -->
Traduções: [Original em inglês](room-groups.md) · [Español](room-groups.es.md) · [Français](room-groups.fr.md) · [Deutsch](room-groups.de.md) · [Italiano](room-groups.it.md) · [Nederlands](room-groups.nl.md) · [Polski](room-groups.pl.md) · [Português (Brasil)](room-groups.pt-br.md) · [Português (Portugal)](room-groups.pt-pt.md) · [Русский](room-groups.ru.md) · [Status das traduções](../translation-status.md)

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

Um grupo de cômodo dá a várias entidades `climate` gerenciadas uma única programação, atribuição de Perfil, reforço, pausa e modelo de Pré-condicionamento adaptativo. Use um grupo quando os dispositivos controlam o mesmo cômodo físico. Cômodos separados devem permanecer independentes, mesmo quando compartilham um modelo diário ou um fornecimento de aquecimento/resfriamento.

<a id="what-a-group-shares"></a>
## O que um grupo compartilha

| Compartilhado pelo grupo de cômodo | Independente para cada dispositivo físico |
| --- | --- |
| Programação, atribuições de Modos/Perfis e ajustes de controle | Temperatura, umidade, ação HVAC e disponibilidade informadas |
| Reforços, pausas de zona e Ajuste manual | Sensores, limites e interruptor de monitoramento de Conforto |
| Uma decisão de início do pré-condicionamento e um modelo de aprendizado térmico | Observações do dispositivo e evidências de entrega no Diagnóstico |
| Configuração e correção do Room Assist | Regulação interna de temperatura do próprio dispositivo |

O grupo é uma unidade de controle interna do Velair. Não é uma nova entidade `climate` ou `group` do Home Assistant. O Velair gera um identificador interno estável, como `group.0123456789abcdef0123456789abcdef`; renomear o grupo mantém esse identificador. Ele pode aparecer no diagnóstico, nas exportações ou em configurações técnicas, mas não no registro de entidades nem nos estados das Ferramentas do desenvolvedor do Home Assistant. Não o use como alvo de um serviço `climate.*` do Home Assistant. O Velair resolve o grupo para seus destinatários reais de comandos.

<a id="create-a-group"></a>
## Criar um grupo

1. Abra a aba **Grupos de cômodo** e use o botão de adicionar.
2. Informe o nome e use **Adicionar dispositivos de climatização** para selecionar os dispositivos gerenciados do cômodo. Adicione pelo menos dois. Busque por nome ou ID da entidade e confirme a seleção. Dispositivos atribuídos a outro grupo ficam indisponíveis e identificam seu grupo.
3. Escolha um membro cuja temperatura ambiente informada represente a temperatura própria do grupo. Essa referência não torna o dispositivo dono do grupo. Configure um sensor externo opcional no **Room Assist**, como em um dispositivo independente.
4. Escolha se o Velair envia comandos a todos os membros ou a um membro selecionado cuja instalação já propaga os comandos aos demais dispositivos.
5. Escolha a configuração existente a adotar em **Usar configuração de**. Exporte a configuração atual antes se precisar de uma cópia de recuperação; inclua **Aprendizado do pré-condicionamento** para também preservar a calibração.
6. Use o botão de salvar do cabeçalho para abrir **Revisar alterações do grupo**. Nada foi aplicado ainda. Leia as diferenças de configuração e o aviso de reinício do aprendizado; escolha **Confirmar e salvar** ou **Voltar à edição**. Erros de validação e de gravação permanecem no fluxo de revisão para corrigir o rascunho e tentar novamente.

<a id="configuration-fields"></a>
### Campos de configuração

| Campo | Significado |
| --- | --- |
| Nome do grupo | Nome de exibição obrigatório e único entre os grupos. |
| Membros | Dispositivos gerenciados neste cômodo. A ordem controla sua exibição individual na Visão geral. Um dispositivo não pode pertencer a dois grupos. |
| Referência de temperatura | A temperatura informada por um membro representa o cômodo no Velair. Isso não dá prioridade a esse membro. |
| Envio de comandos | **Todos os membros** por padrão, ou **Membro selecionado** se a instalação já propaga os comandos. |
| Destinatário dos comandos | Aparece apenas com **Membro selecionado**; escolha quem recebe os comandos do Velair. |
| Usar configuração de | Apenas na criação: escolha o membro cuja programação, configuração de Perfis e ajustes de controle serão o ponto de partida compartilhado. |

A referência de temperatura, o destinatário dos comandos e a origem da configuração inicial podem ser três membros diferentes.

<a id="send-commands-to-all-members-or-one-recipient"></a>
### Enviar comandos a todos ou a um destinatário

**Todos os membros** é o modo padrão: o Velair envia comandos a cada membro. **Membro selecionado** envia comandos somente ao **Destinatário dos comandos** indicado abaixo. Use esse modo apenas quando a instalação já propaga esses comandos aos outros dispositivos; o Velair não faz essa propagação adicional.

Por exemplo, um cômodo pode ter três válvulas de radiador e um controlador ambiente que também aparece como entidade `climate`. Se a instalação propaga os comandos desse controlador às válvulas, inclua os quatro membros, escolha o controlador como referência de temperatura, selecione **Membro selecionado** e indique-o como destinatário. Os quatro continuam visíveis, com uma programação e uma decisão de pré-condicionamento. Se cada dispositivo precisa de comando direto, use **Todos os membros**.

Essas opções selecionam os destinatários dos comandos; nenhuma cria programações ou modelos de aprendizado independentes para os membros.

<a id="adopt-an-existing-configuration"></a>
### Adotar uma configuração existente

A adoção cria uma única configuração compartilhada do Velair a partir das programações, Perfis e ajustes de controle do membro selecionado. Substitui a configuração de controle independente dos membros; não mantém cópias separadas sincronizadas nem copia ajustes de firmware. Cada dispositivo físico mantém seus próprios ajustes, sensores e limites de Conforto; eles não são substituídos pelos do membro selecionado. Os históricos de aprendizado não são mesclados. A referência nativa do grupo, o destinatário e a origem da configuração inicial podem ser membros diferentes.

O Velair valida o grupo completo antes de salvar. Um dispositivo só pode pertencer a um grupo. Combinações incompatíveis precisam ser resolvidas antes do uso; agrupar não acrescenta capacidades HVAC ao dispositivo. Um membro agrupado não pode ser controlado simultaneamente pela execução externa de programação e pelo Velair. Os destinatários devem compartilhar modos compatíveis, limites de temperatura sobrepostos e uma grade de incrementos de temperatura compatível. Quando seus modos HVAC ativos diferirem, selecione um modo explícito em vez de pedir ao Velair que preserve um modo comum.

<a id="shared-control-and-individual-observations"></a>
## Controle compartilhado e observações individuais

Programações, Perfis e outros seletores de controle do cômodo mostram o grupo em vez dos membros individuais. Edite a programação e os recursos existentes normalmente. O grupo armazena uma configuração, em vez de cópias sincronizadas separadas.

Conforto permanece individual: o painel e os cartões mostram cada dispositivo físico com suas próprias medições, sensores, limites e interruptor de monitoramento. Um sensor externo opcional do Room Assist do grupo não substitui essas leituras, a menos que você o selecione explicitamente nos ajustes de Conforto de um membro. Criar, editar ou desfazer um grupo preserva a configuração de Conforto de cada membro. Grupos salvos antes do armazenamento independente de Conforto inicializam cada membro com os ajustes de Conforto anteriormente salvos no grupo; cada cópia pode então ser editada separadamente. Ajustes individuais anteriores não podem ser recuperados automaticamente.

A **Visão geral** continua mostrando cada dispositivo físico. Seu grupo identifica a programação e a autoridade de controle compartilhadas, enquanto temperatura, disponibilidade e estado permanecem individuais. Uma ação de controle sobre um membro aplica-se ao cômodo; não cria uma programação independente concorrente.

**Próximos eventos** mostra cada dispositivo físico com o grupo abaixo do nome, como nas linhas individuais da **Linha do tempo de hoje**. Os membros mostram o mesmo evento autoritativo do grupo; o Velair não cria programações ou eventos de backend separados. Selecione o nome de um dispositivo para abrir a programação compartilhada do grupo no dia do evento, incluindo a programação própria de um Perfil quando ele fornece o evento. Retorno planejado usa a programação do Modo de destino. Isso também funciona em um cartão Próximos eventos no dashboard. Um cartão filtrado por um membro mostra apenas ele; um filtro por grupo mostra todos os membros.

Selecione um grupo na lista para editá-lo no painel de detalhes ao lado, com a mesma organização de lista/detalhes de Modelos e Controle do fornecimento. O resumo identifica membros, fonte de temperatura e destinatários, além do estado compartilhado de controle e preparação. A ação do cabeçalho revisa e salva alterações; a remoção está na lista e exige confirmação. A ajuda explica as escolhas de referência, envio e configuração. Se faltarem informações obrigatórias, a revisão identifica os campos a completar. Durante a edição, o resumo de estado continua descrevendo o grupo salvo até que as alterações revisadas sejam salvas. O Diagnóstico separa evidências de cada dispositivo da intenção comum do cômodo. Chamadas bem-sucedidas de serviços do Home Assistant não comprovam movimento de válvula ou fluxo térmico. Quando os comandos são enviados a um membro selecionado, o Velair não afirma ter comandado diretamente os demais.

<a id="temperature-reference-and-room-assist"></a>
## Referência de temperatura e Room Assist

Na programação normal, o Velair envia o alvo compartilhado aos destinatários configurados. Cada dispositivo continua regulando internamente com seu próprio sensor; escolher uma referência de temperatura do grupo não altera a regulação do firmware.

**Referência de temperatura** fornece a leitura nativa do grupo para pré-condicionamento, aprendizado térmico, base nativa do Room Assist, estimativa de demanda de fornecimento e resumo do grupo. Escolha um dos membros. Configure um sensor ambiente externo opcional no [Room Assist](room-assist.pt-br.md#room-groups), não como outra referência nativa no editor. Quando o Room Assist está habilitado, essa leitura externa torna-se a medição efetiva do cômodo e o Velair calcula uma correção compartilhada. Os comandos continuam seguindo **Envio de comandos**.

Conforto permanece independente: habilitar o Room Assist do grupo não substitui sensores ou limites de Conforto de cada membro.

<a id="pauses-manual-adjustment-and-resuming"></a>
## Pausas, Ajuste manual e retomada

Um grupo tem uma única autoridade de programação. Uma pausa de zona ou reforço solicitado por qualquer membro pertence, portanto, ao grupo inteiro. A aba Grupos de cômodo mostra o estado salvo e não tem botão próprio de pausa. Use os controles existentes dos membros. Retomar a mesma pausa compartilhada por outro membro tem o mesmo alcance. Outros motivos independentes de pausa continuam tendo prioridade até terminar ou ser removidos. Uma Pausa ou Parada global continua afetando todos os cômodos, inclusive dispositivos não agrupados.

Pausar a programação não implica desligar os dispositivos. A ação de pausa escolhida decide se o Velair preserva os estados atuais ou envia Desligado aos destinatários configurados do grupo.

A política de **Ajustes externos** em Configurações pertence ao grupo. Uma mudança externa detectada no alvo ou modo HVAC de um membro pode colocar todo o grupo em **Ajuste manual**, seguindo as mesmas regras de programação e pausa de um dispositivo independente. Com **Até o próximo bloco**:

1. Três membros seguem o alvo compartilhado de `20 °C`.
2. Uma alteração externa aumenta um membro para `22 °C`.
3. O Velair cede a autoridade de programação de todo o grupo, preservando os estados. Não copia a alteração aos outros: eles podem permanecer em `22, 20, 20 °C`. A própria instalação ainda pode propagar alterações.
4. No próximo bloco, o Velair volta ao controle Automático e envia o alvo compartilhado aos destinatários configurados. É possível retomar Automático antes.

| Política de ajustes externos | Comportamento do grupo |
| --- | --- |
| Manter automático | O Velair mantém a autoridade e reaplica a intenção efetiva atual quando ela existe. |
| Até o próximo bloco | O Ajuste manual termina no próximo bloco aplicável. Sem bloco futuro, retome Automático explicitamente. |
| Por uma duração | O grupo cede pelo tempo configurado. Novas mudanças externas renovam esse tempo. |
| Até retomar | O grupo cede até você retomar explicitamente o controle Automático. |

Selecionar Manual explicitamente usa a política salva do grupo e preserva os estados atuais. Se a política for **Manter automático**, Manual explícito dura até você retomá-lo. O Room Assist cede durante o Ajuste manual.

Esse controle Manual/Automático é separado do nome de Modo **Manual**, usado ao escolher Perfis diretamente. Consulte [Alterações externas e Ajuste manual](manual-control.pt-br.md) para prioridades e comportamento especial dos blocos.

<a id="display-order"></a>
## Ordem de exibição

Use os controles de ordenação existentes em Configurações para mover grupos e dispositivos independentes. Um grupo novo assume inicialmente a posição de seu primeiro membro na ordem atual. Ordene os membros no painel de detalhes da aba Grupos de cômodo. A Visão geral expande o grupo em entradas individuais consecutivas nessa ordem; os seletores de programação mostram uma entrada do grupo. Ambas as ordens são salvas pelo backend.

A lista mostra apenas os membros selecionados. Novas seleções são acrescentadas ao final sem mudar a ordem existente. Use as setas para ordenar e o controle de remoção para retirar um membro. Listas longas podem ser expandidas para mostrar todos. Mudanças de composição só se aplicam depois de revisar e salvar o grupo.

<a id="learning-and-membership-changes"></a>
## Aprendizado e mudanças de composição

O grupo aprende uma única resposta térmica, com históricos separados de aquecimento e resfriamento. Com Room Assist desabilitado, a temperatura própria vem do membro selecionado. O Room Assist usa o sensor externo configurado somente quando habilitado, seguindo as mesmas regras de controle, limites de correção e preparação de um dispositivo independente. Selecionar um sensor não habilita a assistência. Limpar ou desabilitar o Room Assist devolve a medição à referência de temperatura do membro. Os comandos continuam seguindo o modo de envio, e o alvo real da programação não é alterado pelas correções temporárias do Room Assist. Históricos independentes existentes não são combinados. O Velair armazena aprendizado para o grupo, não um modelo por membro. Observações individuais continuam disponíveis no Diagnóstico. A criação do grupo começa do zero, sem mesclar históricos independentes anteriores.

| Alteração | Aprendizado depois |
| --- | --- |
| Renomear o grupo ou reordenar membros | O aprendizado do grupo é mantido. |
| Adicionar ou remover um membro | O grupo restante reinicia o aprendizado, pois sua composição física mudou. O membro removido começa aprendizado independente do zero. |
| Alterar a referência de temperatura ou o envio de comandos | O grupo reinicia o aprendizado e cancela a observação ativa anterior. |
| Desfazer o grupo | Cada membro começa aprendizado independente do zero. O histórico do antigo grupo é removido. |

Remover um membro dá a ele uma cópia independente da configuração comum. Desfazer um grupo faz o mesmo para todos. Reforços, pausas e histórico térmico ativos não são copiados para esses cômodos independentes. Revise programações e Perfis após mudar a autoridade de controle.

Por exemplo, remover um dispositivo de um grupo de três deixa dois membros com um novo histórico do grupo e um dispositivo independente com um novo histórico. Excluir o grupo torna os três independentes. Nenhuma operação recupera automaticamente os históricos anteriores ao grupo. No editor, mantenha pelo menos dois membros em um grupo salvo; desfaça-o se todos devem se tornar independentes.

<a id="before-testing-the-beta"></a>
## Antes de testar a beta

Faça backup da configuração e inclua o aprendizado do pré-condicionamento se precisar dele. Após revisar e salvar um grupo, confira:

- Um grupo aparece em programação, Perfis, Pré-condicionamento e Room Assist.
- Cada membro continua visível individualmente em Visão geral, Próximos eventos, Linha do tempo de hoje, Conforto e Diagnóstico.
- O envio corresponde à instalação: todos recebem comandos diretos ou o destinatário selecionado os recebe e a instalação os propaga.
- Alterar os ajustes de Conforto de um membro não altera os demais.
- Uma pausa ou Ajuste manual a partir de um membro tem alcance de cômodo compartilhado.
- Recarregar o Home Assistant preserva o grupo, a ordem dos membros e a configuração compartilhada.

Ao relatar um problema, inclua o modo de envio, o membro de referência de temperatura, se o Room Assist está habilitado e as evidências relevantes do Diagnóstico. Uma chamada de serviço bem-sucedida não equivale ao dispositivo informar o estado solicitado.

Configurações de betas anteriores podem conter uma referência externa de grupo. Carregá-las ou importá-las preserva a referência, sem escolher automaticamente um membro nem habilitar Room Assist. O editor identifica esse valor legado e pede uma referência de membro antes de salvar um grupo editado. Configure o sensor externo no Room Assist ao mudar para a nova organização.

Grupos de cômodo e grupos de fornecimento compartilhado têm finalidades diferentes. Um grupo de cômodo controla um cômodo; [Controle do fornecimento](shared-climate-supply.pt-br.md) agrega a demanda de cômodos para operar uma fonte comum. Modelos vinculados compartilham o conteúdo de programação sem mudar a autoridade do cômodo. Dependências de pré-condicionamento coordenam cômodos separados mantendo seu aprendizado independente.
