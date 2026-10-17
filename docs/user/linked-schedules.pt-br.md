<a id="block-presets-and-linked-templates"></a>
# Predefinições de blocos e modelos vinculados
<!-- velair-docs:start -->
Traduções: [Original em inglês](linked-schedules.md) · [Español](linked-schedules.es.md) · [Français](linked-schedules.fr.md) · [Deutsch](linked-schedules.de.md) · [Italiano](linked-schedules.it.md) · [Nederlands](linked-schedules.nl.md) · [Polski](linked-schedules.pl.md) · [Português (Brasil)](linked-schedules.pt-br.md) · [Português (Portugal)](linked-schedules.pt-pt.md) · [Русский](linked-schedules.ru.md) · [Status das traduções](../translation-status.md)

<details>
<summary>Status desta tradução</summary>

| Informação | Status |
| --- | --- |
| Versão de referência | 1.9.0-beta.2 |
| Última sincronização | 2026-10-17 |
| Revisão linguística | Tradução assistida por IA |
| Em relação ao original | Sincronizada com o original em inglês. |

</details>

---
<!-- velair-docs:end -->

O Velair pode reutilizar uma configuração de climatização por meio de uma **predefinição de bloco** e vincular um dia a um modelo diário. Escolha **Somente horários** para compartilhar horários com configurações independentes, ou **Horários e configurações** para seguir o modelo completo. Padrão e Perfis aceitam ambas as opções. Os blocos de um modelo podem usar configurações manuais ou predefinições do Velair.

Comece por [Exemplos práticos](linked-schedule-examples.pt-br.md) para aquecimento compartilhado, Perfis sazonais, cópias independentes, conversão de vínculos e edições incompatíveis.

<a id="block-presets"></a>
## Predefinições de blocos

Uma predefinição de bloco do Velair tem um nome e a mesma configuração de climatização de um bloco programado, sem seu horário de início. Pode definir uma temperatura ou faixa nativa com opções compatíveis, selecionar apenas um modo HVAC, aplicar apenas opções do dispositivo ou desligar a climatização. Ela é diferente de `preset_mode` do dispositivo, que pode ser uma das opções configuradas nela.

As predefinições pertencem a uma biblioteca compartilhada. Cada destino é verificado em relação ao termostato e, quando aplicável, ao controlador externo da programação. Uma opção omitida não é enviada; omitir uma configuração de ventilador não redefine o ventilador do termostato.

Gerencie a biblioteca em **Modelos → Predefinições climáticas**. O seletor da biblioteca explica modelos diários e predefinições compartilhadas. Use o botão de adicionar no cabeçalho da lista para criar uma predefinição. Uma biblioteca vazia mantém o mesmo layout de lista e detalhes. Selecione uma predefinição existente para examiná-la; alterações não salvas aparecem apenas depois de mudar o nome ou as configurações. A verificação opcional de compatibilidade não marca a predefinição como editada. Os usos aparecem apenas para consulta. O editor não exige um termostato: escolha aquecimento ou resfriamento, temperatura única ou faixa e opções do dispositivo. Uma verificação opcional de termostato permite visualizar a compatibilidade sem alterar os valores compartilhados. Cada uso real é validado pelo backend antes de salvar.

Salve a predefinição pelo ícone ao lado do nome. Editar preserva sua posição na biblioteca, inclusive após recarregar; novas predefinições são adicionadas ao final. Campos de temperatura aceitam ponto ou vírgula decimal, como `21.5` ou `21,5`, inclusive nos dois limites de uma faixa nativa. O editor preserva o que você digita e envia valores numéricos ao visualizar ou salvar. A verificação opcional de compatibilidade mostra as configurações efetivas para um termostato selecionado, com resultado separado de sucesso ou erro. Verificar a compatibilidade não salva a predefinição nem altera seu estado de alterações não salvas.

Referências a predefinições em modelos aparecem separadas das referências diretas em Padrão e Perfis. Os indicadores de uso contam referências diretas, inclusive em modelos sem dias vinculados. Termostatos que herdam uma predefinição por um modelo completo aparecem como destinos afetados adicionais, sem contar novamente a mesma referência do modelo. Os usos nos dispositivos são agrupados por termostato, com uma linha separada para Padrão e cada Perfil.

A lista mostra um ícone de vínculo ao lado de cada contagem de usos. Passe o ponteiro sobre o botão de exclusão desabilitado para saber por que uma predefinição em uso não pode ser excluída; desvincule seus blocos primeiro. O indicador de uso ocupa sua própria última linha, abaixo do resumo da configuração.

Escolha uma predefinição em um bloco para manter uma referência vinculada a ela. Editar a predefinição atualiza todas as referências. O bloco não pode também conter configurações locais de climatização. Desvincular uma predefinição mantém sua configuração efetiva como ajustes manuais e interrompe futuras atualizações dela nesse bloco.

Abra **Configurações adicionais** do bloco para escolher uma **Predefinição do Velair**. Isso é separado de **Predefinição do dispositivo**, a opção nativa `preset_mode` do termostato. O bloco mantém suas colunas habituais de horário, modo, alvo, configurações e exclusão. Configurações vinculadas aparecem nos controles habituais e são somente leitura; o horário continua editável, a menos que o dia também tenha horários vinculados.

Uma linha abaixo do bloco identifica a predefinição vinculada e suas configurações adicionais. O indicador conta um item pelo vínculo à predefinição, mais cada opção configurada do dispositivo, sem incluir horário, modo HVAC e temperatura-alvo. Valores e adaptações de compatibilidade vêm do backend; uma prévia carregando ou com falha não substitui a referência salva por ajustes manuais. Mover o início de um bloco mantém visíveis as configurações resolvidas; alterar o horário não exige outra prévia da predefinição.

Em Configurações adicionais, escolha outra predefinição ou **Sem preset do Velair** para desvincular, preservando as configurações efetivas para edição manual. Gerencie e edite predefinições compartilhadas em **Modelos → Predefinições climáticas**. Opções do dispositivo permanecem somente leitura enquanto vinculadas. O botão de exclusão mantém a posição habitual e continua desabilitado quando o bloco pertence a horários vinculados de modelo.

O painel mostra primeiro o seletor de configuração, depois opções do dispositivo e, ao final, um único resumo **O que este bloco envia**. Ele abrange blocos manuais e predefinições resolvidas, incluindo faixas de temperatura, ações de apenas modo, apenas opções e Desligar. Também aparece quando o termostato não tem opções adicionais. Enquanto uma prévia estiver pendente ou indisponível, o resumo mostra esse estado em vez de presumir os comandos.

<a id="linked-templates"></a>
## Modelos vinculados

<a id="apply-a-template-to-schedules"></a>
### Aplicar um modelo a programações

Abra **Aplicar a…** em um modelo diário salvo. O painel segue **Selecionar → Revisar → Aplicar**. Salve primeiro as edições pendentes do modelo; aplicar nunca salva silenciosamente o modelo compartilhado nem aplica uma versão não salva.

Escolha **Padrão** ou um Perfil existente e depois **Cópia independente**, **Somente horários** ou **Horários e configurações**. Uma cópia independente não tem vínculo com o modelo; referências a predefinições do Velair continuam ativas. Vínculos apenas de horários mantêm atribuições de climatização independentes. Vínculos completos seguem os horários e as configurações do modelo.

Escolha uma **Organização dos dias** comum e marque os grupos necessários de cada termostato. Dias individuais oferece sete opções; Dias úteis / Fim de semana oferece dois grupos; Todos os dias oferece a semana inteira. Mudar a organização limpa a seleção. Mudar o destino ou a forma de aplicação mantém os grupos selecionados, mas exige nova revisão. Selecione o cabeçalho de um dia para selecionar essa coluna em todos os termostatos visíveis; selecione novamente para limpar uma coluna totalmente selecionada. Em celulares, a tabela tem rolagem horizontal enquanto os nomes dos termostatos permanecem visíveis.

Apenas termostatos com grupos selecionados adotam a organização escolhida. Dias não selecionados mantêm blocos e vínculos. Se a nova organização agrupar dias não selecionados com configurações diferentes, Revisar avisa que eles manterão **Programações diferentes**; aceitar não iguala esses dias.

Para **Somente horários**, selecione uma base quando um grupo de destino tiver configurações salvas diferentes. Essa escolha é temporária até Aplicar. O Velair propõe atribuições de climatização dessa base: primeiro o horário exato, depois os horários anteriores do mais próximo ao mais distante e então os seguintes. Predefinições continuam sendo referências. A revisão identifica a origem de cada proposta e permite editar configurações enquanto os horários do modelo permanecem fixos. Atribuições compatíveis ausentes precisam ser preenchidas; as configurações do modelo não são usadas como alternativa silenciosa. Todos os dias selecionados nesse grupo recebem as mesmas atribuições revisadas. Uma zona de Perfil sem programação própria exige atribuições manuais em vez de usar configurações de Padrão.

Revisar lista dias e vínculos substituídos, mudanças de organização, problemas de compatibilidade e zonas de Perfil que passarão a **Cronograma de perfil**. Voltar retorna à seleção sem salvar. Aplicar valida e salva toda a seleção uma vez; um destino inválido ou conflito de revisão não aplica parcialmente as outras zonas. Uma falha ao salvar no armazenamento preserva a configuração anterior. Revise novamente após mudanças na origem ou configuração. Fechar com edições de revisão pendentes usa a proteção normal contra descarte.

Aplicar a um Perfil salva diretamente suas programações selecionadas; não ativa o Perfil, não seleciona um Modo nem altera a seleção de base/exceções. Alterar uma programação já efetiva pode afetar a climatização. A publicação externa e as respostas físicas dos dispositivos mantêm seus limites normais de envio; uma configuração salva coerente não representa uma resposta física simultânea.

Os vínculos dos modelos são somente leitura e agrupados por termostato e depois por Padrão ou Perfil, com os dias da semana vinculados listados juntos. **Dias vinculados** conta cada dia uma vez, independentemente da quantidade de blocos. Essas contagens aparecem em uma última linha separada abaixo da contagem de blocos de cada modelo. Cópias independentes não são contadas nem aparecem na lista. Desvincule todos os dias antes de excluir um modelo; o botão desabilitado explica essa exigência.

Programações Padrão e de Perfis podem vincular cada dia da semana de um termostato a um modelo diário. Com **Somente horários**, configure a ação de cada horário no destino; os ajustes podem ser manuais ou usar uma predefinição de bloco. Destinos diferentes podem usar ações diferentes no mesmo horário compartilhado.

Com **Horários e configurações**, o modelo fornece horários e ajustes de climatização. Seus blocos podem conter ajustes manuais ou referências vinculadas a predefinições. Todos os controles do destino são somente leitura e mostram valores efetivos; edite o modelo ou desvincule o dia para alterá-los. Não há substituições por bloco. Alterar configurações do modelo afeta os vínculos completos, enquanto vínculos apenas de horários mantêm seus próprios ajustes.

Por exemplo, um modelo Dia útil começa às 07:00 e 23:00. Padrão pode atribuir a predefinição habitual de conforto, um Perfil Inverno pode atribuir predefinições de aquecimento e um Perfil Verão pode atribuir resfriamento e Desligar. Mover 07:00 para 07:30 atualiza os três sem trocar suas configurações.

Horários vinculados são editados no modelo, não arrastando a linha do tempo do destino. Alterar temperaturas ou modos do modelo não muda seus destinos vinculados apenas pelos horários. Uma semana pode misturar dias independentes e ambos os tipos de vínculo.

O seletor **Origem dos horários** escolhe uma programação independente ou modelo. Para um modelo, escolha **Somente horários** ou **Horários e configurações**. O ícone de informação explica as opções. Passar de apenas horários para completo pede confirmação antes de substituir as atribuições de climatização do dia. Passar de completo para apenas horários mantém os ajustes atuais do modelo, inclusive referências a predefinições, como atribuições independentes. **Desvincular** mantém os horários e ajustes atuais do rascunho, inclusive predefinições. Ajustes manuais passam a usar os valores efetivos adaptados pelo backend para o termostato; por exemplo, um alvo compartilhado de 18.3 °C torna-se 18.5 °C em um dispositivo com passos de 0.5 °C. Referências a predefinições continuam vinculadas, e as definições compartilhadas não mudam. Passe o ponteiro, toque ou dê foco a um controle bloqueado para saber como editar sua configuração compartilhada. Padrão e Perfis usam os mesmos controles de ajuda.

Alterar Origem dos horários pede confirmação antes de substituir o rascunho do dia, mesmo quando está incompleto. Ajustes em horários exatamente correspondentes são mantidos; novos horários exigem atribuições próprias. Cancelar preserva a seleção e o rascunho anteriores. Alterações só entram em vigor após salvar.

Escolher **Programação própria** pede confirmação antes de descartar edições do dia e restaura sua programação salva na mesma origem: Padrão ou o Perfil selecionado. Se o dia salvo tiver horários vinculados, esses horários e atribuições viram um rascunho independente, mantendo referências a predefinições. Isso não recupera uma programação manual histórica. Os demais dias da semana são preservados.

**Desvincular** é diferente: preserva horários e ajustes do rascunho atual, inclusive mudanças desde o último salvamento.

<a id="copy-or-link"></a>
## Copiar ou vincular

- **Copiar blocos** copia horários e ajustes de um modelo, mantém referências a predefinições e adapta ajustes manuais para o destino. O resultado não acompanha o modelo.
- **Vincular horários** mantém horários conectados ao modelo e usa configurações separadas em cada destino.
- **Vincular configuração completa** acompanha horários e ajustes do modelo, inclusive suas predefinições vinculadas, sem substituições locais.
- Clonar um dia copia sua configuração, incluindo tipo de vínculo, atribuições apenas de horários e referências a predefinições. Uma origem vinculada cria outro dia vinculado; uma independente cria outro independente. Vínculos em dias de destino fora da seleção de clonagem são preservados.
- Salvar um dia como modelo mantém seus ajustes manuais efetivos e referências a predefinições. Não altera o modelo original nem predefinições compartilhadas.
- Limpar um dia remove blocos locais e vínculo de modelo sem alterar o modelo ou outros destinos.

Clonar para outro termostato verifica a configuração copiada em relação ao destino. Ajustes compartilhados incompatíveis rejeitam a clonagem, em vez de remover vínculos ou substituir por ajustes manuais. A adaptação existente do passo por dispositivo e das opções adicionais continua válida. Em Padrão, destinos selecionados são salvos juntos; uma falha deixa todos os destinos da clonagem inalterados. Mudanças pendentes do dia de origem são salvas primeiro, como nas outras clonagens de Padrão. Clonar um Perfil muda seu rascunho e valida o Perfil proposto; salvar ainda confirma todo o Perfil.

Para iniciar um dia independente a partir de um vinculado, use **Desvincular** após clonar e salve. **Copiar blocos** da biblioteca de modelos continua criando uma cópia independente.

<a id="shared-edits"></a>
## Edições compartilhadas

Editar um modelo mantém sua posição na biblioteca, inclusive após recarregar.

Adicionar um horário ao modelo propõe uma configuração para cada dia vinculado apenas pelos horários, inclusive Perfis inativos e programações Padrão ocultas por um Perfil ativo. O Velair tenta primeiro os ajustes do novo horário. Se forem incompatíveis, tenta os blocos previamente salvos do destino: um horário exatamente correspondente, blocos anteriores do mais próximo ao mais distante e depois posteriores na mesma ordem. A primeira configuração compatível é copiada. A referência de um bloco de origem a uma predefinição continua vinculada a ela.

Os blocos de origem pertencem ao mesmo destino e dia da semana, usando os horários anteriores à edição. Um bloco movido ou removido ainda pode fornecer seus ajustes salvos; outro bloco recém-adicionado não pode. Os ajustes copiados são independentes dos ajustes do modelo: apenas os horários continuam vinculados. Se o novo horário do modelo usa uma predefinição, uma proposta compatível mantém essa referência.

Vínculos completos recebem o novo horário do modelo sem alteração e sem escolher um bloco de origem. Se seus ajustes forem incompatíveis com qualquer destino completo, todo o salvamento é rejeitado. Isso inclui Perfis inativos e programações Padrão ocultas.

Revise propostas em **Dias vinculados**, agrupadas por termostato e Padrão ou Perfil, com o tipo de vínculo identificado. Vínculos completos mostram ajustes efetivos e erros, sem editor de atribuições. Atribuições alternativas identificam sua origem. Se não houver configuração compatível, complete o novo horário ali, com ajustes manuais ou uma predefinição do Velair. Erros da programação inteira, como a grade de horários ou limite de mudanças de um controlador externo, também precisam ser resolvidos antes de salvar.

O controle normal de salvar do modelo confirma o modelo e todas as atribuições juntos, sem painel adicional de confirmação. Edições incompletas ou incompatíveis permanecem rascunhos; as programações salvas continuam executando. Mover um horário existente mantém os ajustes dos destinos, e remover um horário remove suas atribuições no mesmo salvamento.

O Velair impede excluir uma predefinição ou modelo enquanto estiver em uso. Uma predefinição referenciada por um modelo sem dias vinculados ainda está em uso. Substitua ou desvincule seus usos primeiro. Edições conflitantes exigem atualizar a configuração; não devem atualizar parcialmente destinos vinculados.

Mudanças de uma temperatura-alvo automática ativa são aplicadas após salvar. Pausas, Ajuste manual e Reforço mantêm a autoridade. Uma edição Padrão oculta pela programação própria de um Perfil não substitui esse Perfil; voltar a Padrão usa a configuração Padrão mais recente. Controladores externos recebem programações semanais completas com os valores efetivos, não referências, e falhas não habilitam a execução local.

<a id="seasonal-automations"></a>
## Automações sazonais

Use [`velair.update_block_preset`](preset-automations.pt-br.md) para atualizar uma predefinição compartilhada por automação. Atualizações parciais preservam outros campos; a substituição explícita pode mudar a ação. As atualizações são persistentes e afetam todas as referências, com validação e autoridade normais durante a execução. O guia inclui exemplos de temperatura externa, faixa nativa, opções do dispositivo e desligamento/restauração.

O Home Assistant continua decidindo quando selecionar um Perfil ou Modo. Reutilizar horários de modelos e predefinições evita configuração duplicada; não acrescenta regras de temperatura externa ou consultas periódicas ao Velair. A lógica de janelas deve usar pausas de zona com responsáveis independentes. Uma predefinição não adiciona uma data de retorno com antecipação nem estende automaticamente um período programado de resfriamento.

<a id="backups-and-compatibility"></a>
## Backups e compatibilidade

O modelo portátil 16 preserva predefinições, identidades dos horários de modelos e ambos os tipos de vínculo. Exportações incluem os modelos necessários e suas predefinições. Importações são verificadas contra toda a configuração resultante; backups existentes sem vínculos continuam utilizáveis. Vínculos existentes sem tipo permanecem apenas de horários. Programações existentes não são vinculadas automaticamente na atualização.

As temperaturas mantêm a unidade declarada pelo Velair e participam do processo existente de migração de unidades. Uma predefinição compartilhada é adaptada por destino sem reescrever seu valor para corresponder ao passo de um único termostato.

As linhas do tempo mostram a temperatura ou faixa efetiva retornada pelo backend. Um ícone de vínculo identifica uma predefinição do Velair; um ícone de cópia ao lado do horário identifica horários vinculados a modelo. A dica nativa do bloco inclui ação, modo, opções do dispositivo e nomes dos recursos compartilhados. Ajustes de predefinições pendentes ou indisponíveis são apresentados explicitamente. Blocos herdados do dia anterior descrevem a configuração e os recursos de seu dia de origem.

Intervalos muito curtos priorizam horário e alvo sobre ícones de origem e ajustes adicionais. Os detalhes mantêm valores completos e nomes dos recursos sem alterar a duração do intervalo.
