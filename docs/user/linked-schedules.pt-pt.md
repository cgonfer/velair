<a id="block-presets-and-linked-templates"></a>
# Predefinições de blocos e modelos ligados
<!-- velair-docs:start -->
Traduções: [Original em inglês](linked-schedules.md) · [Español](linked-schedules.es.md) · [Français](linked-schedules.fr.md) · [Deutsch](linked-schedules.de.md) · [Italiano](linked-schedules.it.md) · [Nederlands](linked-schedules.nl.md) · [Polski](linked-schedules.pl.md) · [Português (Brasil)](linked-schedules.pt-br.md) · [Português (Portugal)](linked-schedules.pt-pt.md) · [Русский](linked-schedules.ru.md) · [Estado das traduções](../translation-status.md)

<details>
<summary>Estado desta tradução</summary>

| Informação | Estado |
| --- | --- |
| Versão de referência | 1.9.0-beta.5 |
| Última sincronização | 2026-10-24 |
| Revisão linguística | Tradução assistida por IA |
| Em relação ao original | Sincronizada com o original em inglês. |

</details>

---
<!-- velair-docs:end -->

O Velair pode reutilizar uma configuração de climatização através de uma **predefinição de bloco** e associar um dia a um modelo diário. Escolha **Apenas horários** para partilhar horários com definições independentes, ou **Horários e definições** para seguir o modelo completo. Predefinição e Perfis aceitam ambas as opções. Os blocos de um modelo podem utilizar definições manuais ou predefinições do Velair.

Comece por [Exemplos práticos](linked-schedule-examples.pt-pt.md) para aquecimento partilhado, Perfis sazonais, cópias independentes, conversão de ligações e edições incompatíveis.

<a id="block-presets"></a>
## Predefinições de blocos

Uma predefinição de bloco do Velair tem um nome e a mesma configuração de climatização de um bloco programado, sem o horário de início. Pode definir uma temperatura ou intervalo nativo com opções compatíveis, selecionar apenas um modo HVAC, aplicar apenas opções do dispositivo ou desligar a climatização. É diferente de `preset_mode` do dispositivo, que pode ser uma das opções configuradas nesta.

As predefinições pertencem a uma biblioteca partilhada. Cada destino é verificado em relação ao termóstato e, quando aplicável, ao controlador externo da programação. Uma opção omitida não é enviada; omitir uma configuração de ventoinha não redefine a ventoinha do termóstato.

Gira a biblioteca em **Modelos → Predefinições climáticas**. O seletor da biblioteca explica modelos diários e predefinições partilhadas. Utilize o botão de adicionar no cabeçalho da lista para criar uma predefinição. Uma biblioteca vazia mantém a mesma disposição de lista e detalhes. Selecione uma predefinição existente para examiná-la; alterações não guardadas aparecem apenas depois de mudar o nome ou as definições. A verificação opcional de compatibilidade não marca a predefinição como editada. As utilizações aparecem apenas para consulta. O editor não exige um termóstato: escolha aquecimento ou arrefecimento e opções do dispositivo. Uma verificação opcional de termóstato permite visualizar a compatibilidade sem alterar os valores partilhados. Cada uso real é validado pelo backend antes de guardar.

Os campos de alvo seguem os formatos configurados nos equipamentos geridos que oferecem o modo escolhido. Se ocorrem ambos os formatos, usa a primeira ação em **Configurações adicionais** para alternar entre uma temperatura e dois valores alvo. Se todos os destinos concordam, só esse formato é oferecido; capacidades desconhecidas ou ausência de destinos mantêm a escolha disponível. Aquecimento/Arrefecimento começa com dois valores, mas pode usar um se os destinos o suportarem. Manter e Apenas temperatura consideram todos os modos efetivos possíveis. Consulta as [definições de formato do alvo](usage.pt-pt.md#target-format-by-climate-and-mode).

Guarde a predefinição pelo ícone ao lado do nome. Editar preserva a sua posição na biblioteca, inclusive após recarregar; novas predefinições são adicionadas no fim. Campos de temperatura aceitam ponto ou vírgula decimal, como `21.5` ou `21,5`, inclusive nos dois limites de um intervalo nativo. O editor preserva o que introduz e envia valores numéricos ao visualizar ou guardar. A verificação opcional de compatibilidade mostra as definições efetivas para um termóstato selecionado, com resultado separado de sucesso ou erro. Verificar a compatibilidade não guarda a predefinição nem altera o seu estado de alterações não guardadas.

Referências a predefinições em modelos aparecem separadas das referências diretas em Predefinição e Perfis. Os indicadores de uso contam referências diretas, inclusive em modelos sem dias ligados. Termóstatos que herdam uma predefinição por um modelo completo aparecem como destinos afetados adicionais, sem contar novamente a mesma referência do modelo. As utilizações nos dispositivos são agrupadas por termóstato, com uma linha separada para Predefinição e cada Perfil.

A lista mostra um ícone de ligação ao lado de cada contagem de utilizações. Passe o ponteiro sobre o botão de eliminação desativado para saber por que uma predefinição em utilização não pode ser eliminada; desassocie os seus blocos primeiro. O indicador de uso ocupa a sua própria última linha, abaixo do resumo da configuração.

Escolha uma predefinição num bloco para manter uma referência ligada a ela. Editar a predefinição atualiza todas as referências. O bloco não pode também conter definições locais de climatização. Desassociar uma predefinição mantém a sua configuração efetiva como ajustes manuais e interrompe futuras atualizações dela nesse bloco.

Abra **Configurações adicionais** do bloco para escolher uma **Predefinição do Velair**. Isto é distinto de **Predefinição do dispositivo**, a opção nativa `preset_mode` do termóstato. O bloco mantém as suas colunas habituais de horário, modo, alvo, definições e eliminação. Definições ligadas aparecem nos controlos habituais e são apenas para leitura; o horário continua editável, a menos que o dia também tenha horários ligados.

Uma linha abaixo do bloco identifica a predefinição ligada e as suas definições adicionais. O indicador conta um item pela ligação à predefinição, mais cada opção configurada do dispositivo, sem incluir horário, modo HVAC e temperatura-alvo. Valores e adaptações de compatibilidade são fornecidos pelo backend; uma pré-visualização em carregamento ou com falha não substitui a referência guardada por ajustes manuais. Mover o início de um bloco mantém visíveis as definições efetivas; alterar o horário não exige outra pré-visualização da predefinição.

Em Configurações adicionais, escolha outra predefinição ou **Sem preset do Velair** para desassociar, preservando as definições efetivas para edição manual. Gira e edite predefinições partilhadas em **Modelos → Predefinições climáticas**. Opções do dispositivo permanecem apenas para leitura enquanto ligadas. O botão de eliminação mantém a posição habitual e continua desativado quando o bloco pertence a horários ligados de modelo.

O painel mostra primeiro o seletor de configuração, depois opções do dispositivo e, no fim, um único resumo **O que este bloco envia**. Abrange blocos manuais e predefinições efetivas, incluindo intervalos de temperatura, ações de apenas modo, apenas opções e Desligar. Também aparece quando o termóstato não tem opções adicionais. Enquanto uma pré-visualização estiver pendente ou indisponível, o resumo mostra esse estado em vez de presumir os comandos.

<a id="linked-templates"></a>
## Modelos ligados

<a id="apply-a-template-to-schedules"></a>
### Aplicar um modelo a programações

Abra **Aplicar a…** num modelo diário guardado. O painel segue **Selecionar → Revisar → Aplicar**. Guarde primeiro as edições pendentes do modelo; aplicar nunca guardada silenciosamente o modelo partilhado nem aplica uma versão não guardada.

Escolha **Predefinição** ou um Perfil existente e depois **Cópia independente**, **Apenas horários** ou **Horários e definições**. Uma cópia independente não tem associação com o modelo; referências a predefinições do Velair continuam ativas. Vínculos apenas de horários mantêm atribuições de climatização independentes. Vínculos completos seguem os horários e as definições do modelo.

Escolha uma **Organização dos dias** comum e marque os grupos necessários de cada termóstato. Dias individuais oferece sete opções; Dias úteis / Fim de semana oferece dois grupos; Todos os dias oferece a semana inteira. Mudar a organização limpa a seleção. Mudar o destino ou a forma de aplicação mantém os grupos selecionados, mas exige nova revisão. Selecione o cabeçalho de um dia para selecionar essa coluna em todos os termóstatos visíveis; selecione novamente para limpar uma coluna totalmente selecionada. Em telemóveis, a tabela tem rolagem horizontal enquanto os nomes dos termóstatos permanecem visíveis.

Apenas termóstatos com grupos selecionados adotam a organização escolhida. Dias não selecionados mantêm blocos e associações. Se a nova organização agrupar dias não selecionados com definições diferentes, Revisar avisa que eles manterão **Programações diferentes**; aceitar não iguala esses dias.

Para **Apenas horários**, selecione uma base quando um grupo de destino tiver definições guardadas diferentes. Essa escolha é temporária até Aplicar. O Velair propõe atribuições de climatização dessa base: primeiro o horário exato, depois os horários anteriores do mais próximo ao mais distante e então os seguintes. Predefinições continuam sendo referências. A revisão identifica a origem de cada proposta e permite editar definições enquanto os horários do modelo permanecem fixos. Atribuições compatíveis ausentes precisam ser preenchidas; as definições do modelo não são usadas como alternativa silenciosa. Todos os dias selecionados nesse grupo recebem as mesmas atribuições revisadas. Uma zona de Perfil sem programação própria exige atribuições manuais em vez de usar definições de Predefinição.

Revisar lista dias e associações substituídos, mudanças de organização, problemas de compatibilidade e zonas de Perfil que passarão a **Cronograma de perfil**. Voltar retorna à seleção sem guardadar. Aplicar valida e guardada toda a seleção uma vez; um destino inválido ou conflito de revisão não aplica parcialmente as outras zonas. Uma falha ao guardadar no armazenamento preserva a configuração anterior. Revise novamente após mudanças na origem ou configuração. Fechar com edições de revisão pendentes usa a proteção normal contra descarte.

Aplicar a um Perfil guardada diretamente suas programações selecionadas; não ativa o Perfil, não seleciona um Modo nem altera a seleção de base/exceções. Alterar uma programação já efetiva pode afetar a climatização. A publicação externa e as respostas físicas dos dispositivos mantêm seus limites normais de envio; uma configuração guardada coerente não representa uma resposta física simultânea.

As ligações dos modelos são apenas para leitura e agrupadas por termóstato e depois por Predefinição ou Perfil, com os dias da semana ligados listados juntos. **Dias associados** conta cada dia uma vez, independentemente da quantidade de blocos. Essas contagens aparecem em uma última linha separada abaixo da contagem de blocos de cada modelo. Cópias independentes não são contadas nem aparecem na lista. Desvincule todos os dias antes de eliminar um modelo; o botão desativado explica essa exigência.

Programações predefinidas e de Perfis podem associar cada dia da semana de um termóstato a um modelo diário. Com **Apenas horários**, configure a ação de cada horário no destino; os ajustes podem ser manuais ou utilizar uma predefinição de bloco. Destinos diferentes podem utilizar ações diferentes no mesmo horário partilhado.

Com **Horários e definições**, o modelo fornece horários e ajustes de climatização. Os seus blocos podem conter ajustes manuais ou referências ligadas a predefinições. Todos os controlos do destino são apenas para leitura e mostram valores efetivos; edite o modelo ou desvincule o dia para alterá-los. Não há substituições por bloco. Alterar definições do modelo afeta as ligações completas, enquanto ligações apenas de horários mantêm os seus próprios ajustes.

Por exemplo, um modelo Dia útil começa às 07:00 e 23:00. Predefinição pode atribuir a predefinição habitual de conforto, um Perfil Inverno pode atribuir predefinições de aquecimento e um Perfil Verão pode atribuir arrefecimento e Desligar. Mover 07:00 para 07:30 atualiza os três sem trocar as suas definições.

Horários ligados são editados no modelo, não arrastando a linha temporal do destino. Alterar temperaturas ou modos do modelo não muda os seus destinos ligados apenas pelos horários. Uma semana pode misturar dias independentes e ambos os tipos de ligação.

O seletor **Origem dos horários** escolhe uma programação independente ou modelo. Para um modelo, escolha **Apenas horários** ou **Horários e definições**. O ícone de informação explica as opções. Passar de apenas horários para completo pede confirmação antes de substituir as atribuições de climatização do dia. Passar de completo para apenas horários mantém os ajustes atuais do modelo, inclusive referências a predefinições, como atribuições independentes. **Desvincular** mantém os horários e ajustes atuais do rascunho, inclusive predefinições. Ajustes manuais passam a utilizar os valores efetivos adaptados pelo backend para o termóstato; por exemplo, um alvo partilhado de 18.3 °C torna-se 18.5 °C num dispositivo com passos de 0.5 °C. Referências a predefinições continuam ligadas, e as definições partilhadas não mudam. Passe o ponteiro, toque ou dê foco a um controlo bloqueado para saber como editar a sua configuração partilhada. Predefinição e Perfis usam os mesmos controlos de ajuda.

Alterar Origem dos horários pede confirmação antes de substituir o rascunho do dia, mesmo quando está incompleto. Ajustes em horários exatamente correspondentes são mantidos; novos horários exigem atribuições próprias. Cancelar preserva a seleção e o rascunho anteriores. Alterações só entram em vigor após guardar.

Escolher **Programação própria** pede confirmação antes de descartar edições do dia e restaura a sua programação guardada na mesma origem: Predefinição ou o Perfil selecionado. Se o dia guardado tiver horários ligados, esses horários e atribuições passam a ser um rascunho independente, mantendo referências a predefinições. Isso não recupera uma programação manual histórica. Os demais dias da semana são preservados.

**Desvincular** é diferente: preserva horários e ajustes do rascunho atual, inclusive mudanças desde o última gravação.

<a id="copy-or-link"></a>
## Copiar ou associar

- **Copiar blocos** copia horários e ajustes de um modelo, mantém referências a predefinições e adapta ajustes manuais para o destino. O resultado não acompanha o modelo.
- **Vincular horários** mantém horários conectados ao modelo e usa definições separadas em cada destino.
- **Vincular configuração completa** acompanha horários e ajustes do modelo, inclusive as suas predefinições ligadas, sem substituições locais.
- Clonar um dia copia a sua configuração, incluindo tipo de ligação, atribuições apenas de horários e referências a predefinições. Uma origem ligada cria outro dia ligado; uma independente cria outro independente. Ligações em dias de destino fora da seleção de clonagem são preservadas.
- Guardar um dia como modelo mantém os seus ajustes manuais efetivos e referências a predefinições. Não altera o modelo original nem predefinições partilhadas.
- Limpar um dia remove blocos locais e ligação de modelo sem alterar o modelo ou outros destinos.

Clonar para outro termóstato verifica a configuração copiada em relação ao destino. Ajustes partilhados incompatíveis rejeitam a clonagem, em vez de remover ligações ou substituir por ajustes manuais. A adaptação existente do passo por dispositivo e das opções adicionais continua válida. Em Predefinição, destinos selecionados são guardados juntos; uma falha deixa todos os destinos da clonagem inalterados. Mudanças pendentes do dia de origem são guardadas primeiro, como nas outras clonagens de Predefinição. Clonar um Perfil muda o seu rascunho e valida o Perfil proposto; guardar ainda confirma todo o Perfil.

Para iniciar um dia independente a partir de um ligado, use **Desvincular** após clonar e guarde. **Copiar blocos** da biblioteca de modelos continua a criar uma cópia independente.

<a id="shared-edits"></a>
## Edições partilhadas

Editar um modelo mantém a sua posição na biblioteca, inclusive após recarregar.

Adicionar um horário ao modelo propõe uma configuração para cada dia ligado apenas pelos horários, inclusive Perfis inativos e programações predefinidas ocultas por um Perfil ativo. O Velair tenta primeiro os ajustes do novo horário. Se forem incompatíveis, tenta os blocos previamente guardados do destino: um horário exatamente correspondente, blocos anteriores do mais próximo ao mais distante e depois posteriores na mesma ordem. A primeira configuração compatível é copiada. A referência de um bloco de origem a uma predefinição continua ligada a ela.

Os blocos de origem pertencem ao mesmo destino e dia da semana, com os horários anteriores à edição. Um bloco movido ou removido ainda pode fornecer os seus ajustes guardados; outro bloco recém-adicionado não pode. Os ajustes copiados são independentes dos ajustes do modelo: apenas os horários continuam ligados. Se o novo horário do modelo usa uma predefinição, uma proposta compatível mantém essa referência.

Ligações completas recebem o novo horário do modelo sem alteração e sem escolher um bloco de origem. Se os seus ajustes forem incompatíveis com qualquer destino completo, toda a gravação é rejeitada. Isso inclui Perfis inativos e programações predefinidas ocultas.

Reveja propostas em **Dias associados**, agrupadas por termóstato e Predefinição ou Perfil, com o tipo de ligação identificado. Ligações completas mostram ajustes efetivos e erros, sem editor de atribuições. Atribuições alternativas identificam a sua origem. Se não houver configuração compatível, complete o novo horário ali, com ajustes manuais ou uma predefinição do Velair. Erros da programação completa, como a grelha de horários ou limite de mudanças de um controlador externo, também precisam de ser resolvidos antes de guardar.

O controlo normal de guardar do modelo confirma o modelo e todas as atribuições juntos, sem painel adicional de confirmação. Edições incompletas ou incompatíveis permanecem rascunhos; as programações guardadas continuam em execução. Mover um horário existente mantém os ajustes dos destinos, e remover um horário remove as suas atribuições na mesma gravação.

O Velair impede eliminar uma predefinição ou modelo enquanto estiver em utilização. Uma predefinição referenciada por um modelo sem dias ligados ainda está em utilização. Substitua ou desassocie as suas utilizações primeiro. Edições conflitantes exigem atualizar a configuração; não devem atualizar parcialmente destinos ligados.

Mudanças de uma temperatura-alvo automática ativa são aplicadas após guardar. Pausas, Ajuste manual e Reforço mantêm a autoridade. Uma edição Predefinição oculta pela programação própria de um Perfil não substitui esse Perfil; voltar a Predefinição usa a configuração predefinida mais recente. Controladores externos recebem programações semanais completas com os valores efetivos, não referências, e falhas não ativam a execução local.

<a id="seasonal-automations"></a>
## Automações sazonais

Use [`velair.update_block_preset`](preset-automations.pt-pt.md) para atualizar uma predefinição partilhada por automação. Atualizações parciais preservam outros campos; a substituição explícita pode mudar a ação. As atualizações são persistentes e afetam todas as referências, com validação e autoridade normais durante a execução. O guia inclui exemplos de temperatura exterior, intervalo nativo, opções do dispositivo e desligamento/restauro.

O Home Assistant continua a decidir quando selecionar um Perfil ou Modo. Reutilizar horários de modelos e predefinições evita configuração duplicada; não acrescenta regras de temperatura exterior ou consultas periódicas ao Velair. A lógica de janelas deve utilizar pausas de zona com responsáveis independentes. Uma predefinição não adiciona uma data de regresso com antecipação nem estende automaticamente um período programado de arrefecimento.

<a id="backups-and-compatibility"></a>
## Cópias de segurança e compatibilidade

O modelo portátil 16 preserva predefinições, identidades dos horários de modelos e ambos os tipos de ligação. Exportações incluem os modelos necessários e as suas predefinições. Importações são verificadas contra toda a configuração resultante; cópias de segurança existentes sem ligações continuam utilizáveis. Ligações existentes sem tipo permanecem apenas de horários. Programações existentes não são ligadas automaticamente na atualização.

As temperaturas mantêm a unidade declarada pelo Velair e participam do processo existente de migração de unidades. Uma predefinição partilhada é adaptada por destino sem reescrever o seu valor para corresponder ao passo de um único termóstato.

As linhas temporais mostram a temperatura ou intervalo efetivo devolvido pelo backend. Um ícone de ligação identifica uma predefinição do Velair; um ícone de cópia ao lado do horário identifica horários ligados a modelo. A dica nativa do bloco inclui ação, modo, opções do dispositivo e nomes dos funções partilhados. Ajustes de predefinições pendentes ou indisponíveis são apresentados explicitamente. Blocos herdados do dia anterior descrevem a configuração e os funções do dia de origem.

Intervalos muito curtos priorizam horário e alvo sobre ícones de origem e ajustes adicionais. Os detalhes mantêm valores completos e nomes dos funções sem alterar a duração do intervalo.
