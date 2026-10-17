<a id="climate-profiles"></a>
# Perfis climáticos
<!-- velair-docs:start -->
Traduções: [Original em inglês](climate-profiles.md) · [Español](climate-profiles.es.md) · [Français](climate-profiles.fr.md) · [Deutsch](climate-profiles.de.md) · [Italiano](climate-profiles.it.md) · [Nederlands](climate-profiles.nl.md) · [Polski](climate-profiles.pl.md) · [Português (Brasil)](climate-profiles.pt-br.md) · [Português (Portugal)](climate-profiles.pt-pt.md) · [Русский](climate-profiles.ru.md) · [Estado das traduções](../translation-status.md)

<details>
<summary>Estado desta tradução</summary>

| Informação | Estado |
| --- | --- |
| Versão de referência | 1.9.0-beta.2 |
| Última sincronização | 2026-10-17 |
| Revisão linguística | Tradução assistida por IA |
| Em relação ao original | Sincronizada com o original em inglês. |

</details>

---
<!-- velair-docs:end -->

Perfis climáticos permitem que o Velair alterne várias zonas entre planos semanais coordenados sem substituir as suas programações predefinidas. O Home Assistant continua a decidir quando mudar um perfil: presença, janelas, estações, seletores, sensores ou outras automações tomam a decisão, enquanto o Velair armazena, aplica e mostra o comportamento de climatização resultante.

Um **Perfil** define uma rotina alternativa de climatização para suas zonas configuradas. Um **Modo** seleciona um ou mais Perfis sem sobreposição como **base** da casa. O utilizador pode aplicar Perfis como **exceções por zona**, incluindo apenas parte de um Perfil de várias zonas, sem mudar outros ambientes. Estabeleça uma base para mudar toda a configuração; aplique exceções para rotinas independentes.

Exemplos incluem Em casa, Ausente, Férias, Verão, Visitante e Dormir. Os Perfis também suportam instalações com horários, temperaturas-alvo e modos HVAC diferentes para aquecimento e arrefecimento.

<a id="default"></a>
## Predefinição

`Default` é a seleção integrada e sempre significa as programações semanais configuradas no separador Programações. Não é um perfil armazenado, portanto não pode ser renomeado nem eliminado.

Ativar outro perfil nunca substitui essas programações. Voltar a Predefinição aplica imediatamente o bloco predefinido ativo naquele momento.

<a id="configure-a-profile"></a>
## Configurar um Perfil

Abra **Programações**, escolha **Programações de perfil** e utilize o botão de adicionar para criar um Perfil vazio. Selecione-o na lista para editar cor, ícone, nome, descrição e comportamento dos termóstatos. A área de edição mostra um termóstato por vez para manter o editor completo utilizável em computador, tablet e telemóvel. O nome é editado no cabeçalho, junto ao lápis. O seu ID estável de automação aparece logo abaixo e na lista de perfis, para ser copiado em serviços, scripts e automações sem o confundir com o nome apresentado editável.
Ícones usam chaves Material Design Icons como `mdi:briefcase-outline`; o editor mostra uma pré-visualização com a cor do perfil, um ligação para o catálogo pesquisável de ícones e avisos para chaves fora do formato `mdi:icon-name`. Descrições têm limite de 500 caracteres, com contagem restante. O Velair atribui uma cor estável a perfis novos e existentes; ela pode ser alterada pelo seletor de cores ou valor editável `#RRGGBB`. Valores inválidos são destacados e não podem ser guardados. A cor é incluída nas exportações portáteis. A seleção integrada Predefinição mantém a sua cor fixa.

Cada linha de Perfil mantém as ações numa coluna separada à direita: definir como base, aplicar como exceção por zona e eliminir. Em larguras estreitas, elas permanecem ao lado do nome, sem passar para baixo. Os botões têm fundo transparente e espaço até a borda; estados ativos usam ícone e cor. A descrição permanece visível, com etiquetas compactas **Base** e **Exceção** abaixo para seus usos atuais. Perfis não usados não mostram essas etiquetas; a ação de base permanece neutra até o Perfil pertencer à base. Um Perfil usado apenas como exceção destaca sua ação de camadas, não a ação de base. Uma base totalmente substituída por exceções mantém sua identidade. Esses estados descrevem a seleção guardada, não se um termóstato está funcionando. Selecionar a linha abre o editor; ações de ativação e exceção não mudam a seleção de edição. Confirmar a eliminsão do Perfil editado limpa o editor.

Para cada equipamento gerido, escolha um comportamento:

- **Não participa**: este Perfil não inclui a zona.
- **Programação padrão**: continuar a utilizar a programação semanal habitual da zona.
- **Cronograma de perfil**: utilizar uma programação semanal completa armazenada no Perfil.
- **Pausa** com **Manter a climatização sem alterações**: interromper alterações programadas e manter o dispositivo como está.
- **Pausa** com **Desligar a climatização**: interromper alterações programadas e desligar o dispositivo.

Cada zona com **Cronograma de perfil** também armazena sua própria **Organização dos dias**. Selecione Dias individuais, Dias úteis / Fim de semana ou Todos os dias antes de escolher um dia. As sete células mantêm as posições; a organização seleciona um dia, dias úteis/fim de semana ou a semana inteira em conjunto. Editar o grupo selecionado atualiza esses dias no rascunho do Perfil; **Guardar perfil** persiste o Perfil completo. Quando os dias diferem, examine-os e escolha explicitamente uma base antes de substituir suas definições. Os demais dias permanecem inalterados. A organização é lembrada junto ao rascunho da programação ao mudar temporariamente o comportamento da zona. Células selecionadas contíguas se conectam visualmente e a linha do tempo mostra os blocos comuns. Diferenças aparecem como alternativas visuais compactas: definições de dias idênticas são agrupadas, com barras de linha do tempo apenas de leitura iguais às da Visão geral e rótulos de alvo/modo. Não há uma lista permanente de blocos abaixo; o ícone de informações abre todos os horários e ajustes ao passar o rato, receber foco ou tocar, sem selecionar a base. Clique ou toque numa alternativa para selecionar uma única base, identificada por fundo e borda. As alternativas continuam visíveis para permitir mudar a base antes de guardadar. Em **Todos os dias** e **Dias úteis / Fim de semana**, selecione a programação e use **Guardar perfil** antes de abrir o editor de blocos comuns, sem confirmação adicional de substituição. O grupo contém sete dias, cinco dias úteis ou dois dias de fim de semana; os outros mantêm suas programações. Uma falha ao guardadar preserva a alternativa selecionada. Depois, alterações dos blocos comuns podem ser guardadas normalmente com o Perfil. Setas, Espaço e Enter permitem seleção pelo teclado. Um grupo misto precisa de uma base selecionada antes de ativar **Guardar perfil**. Veja os resumos ao lado de Guardar para cada origem, zona e dias de destino. Guardar perfil também inclui outras alterações pendentes do Perfil. Alternativas visualmente iguais identificam dependências diferentes de modelos ou predefinições com rótulos compactos. Alternativas vazias mostram **Sem blocos próprios**; suas informações explicam que aplicá-las remove blocos próprios; um dia vazio não é um comando de desligamento. Consulte [Organização dos dias e edição de vários dias](usage.pt-pt.md#create-a-daily-schedule) para edição agrupada, dias mistos e portabilidade.

Programação padrão inclui explicitamente a zona, inclusive para validar sobreposição. Uma zona que não participa herda a base ou Predefinição quando nenhum Perfil de base a inclui. Modelos podem ser copiados como blocos independentes; um dia de Predefinição ou Perfil também pode associar apenas horários a um modelo e manter os seus próprios ajustes, ou seguir o modelo completo com todos os controlos apenas para leitura. Modelos e blocos independentes podem fazer referência a predefinições partilhadas do Velair. Consulte [Predefinições de blocos e modelos ligados](linked-schedules.pt-pt.md) para regras de propagação, desvinculação, compatibilidade e edição partilhada, e [o exemplo Inverno/Verão](linked-schedule-examples.pt-pt.md#2-winter-and-summer-with-one-set-of-times) para definições diferentes com os mesmos horários. Clonar um dia preserva tipo de ligação, atribuições apenas de horários e referências a predefinições. Clonar para outro termóstato valida o Perfil proposto antes de aplicar o rascunho; outros dias de destino mantêm as suas ligações. Use Desassociar após clonar se o novo dia deve ser independente do modelo.

Para uma zona delegada a um controlador externo, Perfis e Modos selecionam a semana completa efetiva que o Velair publica, em vez de gerar ações diretas `climate.*`. **Programação padrão** publica a semana habitual, e **Cronograma de perfil** publica a semana do Perfil. **Pausa** não está disponível para zonas geridas externamente. O editor aplica as capacidades do controlador como validação adicional; uma falha de publicação não desfaz a seleção guardada de Perfil ou Modo nem afeta zonas com execução local. Consulte [Execução externa da programação](external-systems.pt-pt.md) para os limites atuais e a semântica de publicação.

Num dia editado da programação do Perfil, **Guardar como modelo** armazena apenas um modelo reutilizável pelo backend e preserva o rascunho não guardado do Perfil. Para reutilizar a seleção em outros equipamentos geridos, selecione-os no painel de clonagem **Outros termóstatos** e escolha **Clonar**. O rótulo acompanha a organização selecionada: um dia, segunda–sexta, sábado–domingo ou Todos os dias. A confirmação resume os equipamentos selecionados, identifica zonas Predefinição ou Pausa que passarão a **Cronograma de perfil** e lista os dias selecionados. Clonar substitui apenas esses mesmos dias da semana, preserva todos os outros dias lembrados e a organização dos dias do destino, e continua fazendo parte do rascunho do Perfil. A clonagem entre dias só está disponível em **Dias individuais**. Editores agrupados omitem esse painel e o atalho de mudança de organização; use o seletor normal **Organização dos dias**. Editores de Predefinição e Perfil usam o mesmo escopo do grupo selecionado para cópias a outros termóstatos. O Velair valida tipo de alvo, modo HVAC, limites e passo de temperatura em cada equipamento antes de mudar o rascunho. Remove controlos opcionais incompatíveis com cada destino. Se um bloco apenas de opções ficar sem controlos compatíveis ou se um alvo ou modo for incompatível, nada do rascunho muda. Dias clonados só são persistidos ao guardadar o Perfil.

Cada dia do perfil usa a mesma linha temporal editável de programações predefinidas e modelos, incluindo arrastar e redimensionar horários. Blocos têm início, mas não um fim separado: o último continua após a meia-noite e em dias vazios até começar outro bloco. A linha temporal representa a parte herdada com um segmento distinto e não editável, identificando o dia em que o bloco realmente está configurado. Enquanto o Perfil permanece aberto, mudar temporariamente uma zona de **Cronograma de perfil** para **Programação padrão** ou **Pausa** preserva o seu rascunho semanal. Selecionar **Cronograma de perfil** novamente restaura esses blocos não guardados. Guardar com Predefinição ou Pausa ainda armazena apenas o comportamento selecionado; o rascunho oculto da programação não é persistido. O seletor mostra nomes amigáveis, e o editor ativo também mostra o ID da entidade. Metadados e programações continuam a ser guardados juntos como um único Perfil atómico; trocar o termóstato selecionado não guarda um rascunho parcial.

Vários Perfis podem formar uma base quando coordenados por um Modo. Suas zonas configuradas não podem se sobrepor. Exceções podem substituir zonas individuais dessa base: cada equipamento gerido continua com exatamente uma rotina efetiva. Não há mistura de blocos de programação nem pilha de prioridade de exceções anteriores.

<a id="worked-example-an-away-mode"></a>
## Exemplo completo: um Modo Ausente

Suponha que a casa tenha dispositivos nas áreas de convivência e nos quartos que precisam de se comportar de forma diferente quando ninguém está em casa:

1. Crie um Perfil chamado **Ausente · Áreas de convivência**. Dê à sala e cozinha programações alternativas com alvos apropriados à instalação, seja de aquecimento, arrefecimento ou ambos.
2. Crie um Perfil chamado **Ausente · Quartos**. Configure os quartos com outra programação alternativa, **Pausa** ou **Pausar e desligar**.
3. Deixe zonas não afetadas fora dos dois Perfis. Elas continuarão a utilizar as suas programações predefinidas.
4. Abra **Modos**, escolha **Novo modo**, dê o nome **Away**, selecione os dois Perfis e guarde.
5. Em **Configuração ativa**, escolha **Mudar** e depois **Away**. O Velair aplica os dois Perfis como uma única seleção atómica.

Essa organização é válida porque os dois Perfis configuram zonas diferentes. Se ambos configurassem o mesmo dispositivo, o Velair rejeitaria o Modo e pediria a remoção da sobreposição.

O mesmo Modo pode ser selecionado por uma automação do Home Assistant:

```yaml
alias: Use Away climate mode
triggers:
  - trigger: state
    entity_id: person.resident
    to: "not_home"
actions:
  - action: select.select_option
    target:
      entity_id: select.velair_mode
    data:
      option: Away
```

Outra automação pode restaurar a programação habitual de todas as zonas:

```yaml
alias: Restore default climate schedules
triggers:
  - trigger: state
    entity_id: person.resident
    to: "home"
actions:
  - action: select.select_option
    target:
      entity_id: select.velair_mode
    data:
      option: Default
```

Substitua a entidade de pessoa e os nomes visíveis de Modos pelos usados na sua instalação. Se renomear um Modo, atualize automações que selecionam a sua opção visível.

<a id="activate-a-profile"></a>
## Ativar um Perfil

Utilize o botão de reprodução na linha de um Perfil em **Programações > Programações de perfil** para ativação direta, ou o cartão partilhado **Configuração ativa** em Visão geral ou no topo de **Modos**. Ele separa **Base** de **Exceções**, identificando se a base vem de um Modo, um Perfil, vários Perfis ou Predefinição. Selecione **Mudar** para escolher um Modo ou use o grupo separado **Perfis**. Selecionar a linha de um Perfil estabelece-o como base completa; o ícone compacto de camadas ao lado aplica apenas suas zonas configuradas como exceções. Escolher diretamente um Perfil substitui o conjunto ativo por ele e muda o Modo para **Manual**; **Predefinição** significa que nenhum Perfil alternativo está ativo. Perfis também podem ser ativados na própria linha, na Configuração ativa ou pela ação `velair.activate_profile`. O Velair aplica o bloco ativo agora, sem aguardar o próximo limite programado. Isso inclui o último bloco de um dia anterior quando nenhum bloco novo começou no dia atual.

Ativar diretamente nunca adiciona um Perfil ao conjunto existente, mesmo sem sobreposição de zonas. Zonas controladas pelo Modo ou conjunto anterior, mas ausentes do novo Perfil, voltam imediatamente às as suas programações predefinidas; não mantêm a configuração anterior. Crie um Modo que associe todos os Perfis necessários sem sobreposição para ativá-los juntos.

A ativação cancela Reforços ativos nas zonas cujo comportamento efetivo do perfil muda. Uma pausa global ou por zona existente mantém o controlo; o Velair regista o novo perfil e aplica-o quando o agendador ou zona retoma.

Visão geral usa a programação efetiva de cada zona na linha temporal de hoje e nos próximos eventos. Zonas alteradas pelo perfil ativo mostram uma etiqueta compacta colorida, com ícone e nome do Perfil, enquanto Reforço ou Pausa temporários mantêm a prioridade visual até terminar. Confirmações de guardar, ativar e eliminar Perfis usam a notificação temporária normal do Velair, com botão de fechar e barra de contagem decrescente.

Mudanças de Modo e ativações de Perfil também mostram uma barra global de operação enquanto o Velair processa as zonas afetadas. Esta permanece visível ao navegar entre separadores. No Lovelace, aparece apenas no cartão Configuração ativa, onde as ativações são feitas. O contador informa zonas que o Velair terminou de processar, inclusive aquelas cuja pausa ou substituição atual dispensa um comando; não afirma que a divisão já atingiu a temperatura-alvo. O resultado distingue sucesso completo de uma transição concluída com erros em uma ou mais zonas. Resultados bem-sucedidos desaparecem após uma breve confirmação; parciais e falhados permanecem até serem fechados, inclusive ao navegar entre separadores.

Automações e scripts podem utilizar:

```yaml
action: velair.activate_profile
data:
  profile_id: vacation
```

No editor visual de automações do Home Assistant, adicione uma ação e procure **Velair: Ativar perfil climático**. Essa ação da integração é separada das ações de switch e select mostradas ao filtrar pelo dispositivo Velair. Informe o **ID de automação** do Perfil, mostrado abaixo do seu nome no Velair.

Utilize o serviço explícito de desativação para voltar às programações predefinidas:

```yaml
action: velair.deactivate_profile
```

Omitir `profile_id` em `velair.activate_profile` continua compatível. Identificadores de Perfil são estáveis mesmo se o nome visível mudar. Ativar diretamente pelo painel ou serviço define o seletor nativo de Modo como `Manual`, inclusive se o mesmo perfil já estiver ativo.

<a id="modes"></a>
## Modos

Um perfil não contém condições arbitrárias. O Home Assistant continua a decidir. O Velair oferece a entidade nativa `select.velair_mode` para gerir os valores usados em automações pelo separador Modos, sem criar outro auxiliar do Home Assistant.

Dois valores integrados sempre existem e não podem ser renomeados ou eliminados:

- **Predefinição** desativa perfis e restaura a programação predefinida de cada zona.
- **Manual** significa que nenhum Modo personalizado controla atualmente o conjunto de Perfis ativos. A ativação direta costuma entrar nesse estado. Ele aparece como estado atual, mas não como ação no seletor do Velair. Selecione **Predefinição** ou um Modo personalizado para sair dele. A entidade nativa do Home Assistant mantém a opção Manual por compatibilidade; selecioná-la mantém os Perfis ativos, mas os desvincula do seu Modo personalizado.

Crie valores personalizados como Ausente, Férias ou Em casa e associe cada um a um ou mais Perfis climáticos guardados. Em **Modos**, escolha **Novo modo**, introduza o nome da opção que o Home Assistant mostrará, selecione Perfis sem sobreposição e guarde. Selecionar um valor personalizado ativa todo o conjunto de forma atómica. Perfis do mesmo Modo precisam de configurar zonas diferentes; o Velair rejeita sobreposições em vez de aplicar uma prioridade implícita. Vários Modos podem fazer referência ao mesmo perfil. Nomes têm espaços nas extremidades removidos, limite de 255 caracteres e precisam de ser únicos sem distinguir maiúsculas e minúsculas. Não podem utilizar nomes integrados nem os estados reservados `unknown` e `unavailable` do Home Assistant.

A aba Modos mostra a base selecionada e suas exceções por zona num cartão **Configuração ativa**. O seletor agrupado lista primeiro Predefinição e Modos personalizados, com ações separadas de base e exceção para Perfis. Manual continua sendo um estado da entidade select nativa do Home Assistant, em vez do nome da base no painel. Selecionar um Modo ativa todos os Perfis associados; selecionar diretamente um Perfil substitui o conjunto ativo por esse único Perfil e muda o Modo para **Manual**. As linhas de Modo mostram ícones e cores dos Perfis associados, mantendo Modos e Perfis distintos mesmo quando partilham um nome. As linhas integradas incluem uma breve explicação de quando são aplicadas.

Use a ação normal de seleção do Home Assistant em automações:

```yaml
action: select.select_option
target:
  entity_id: select.velair_mode
data:
  option: Vacation
```

Identificadores de Modo são estáveis quando os seus nomes visíveis mudam, portanto a seleção atual sobrevive à renomeação. Contudo, o nome visível da opção é o estado da entidade do Home Assistant; automações que usam uma opção renomeada ou eliminada precisam de ser atualizadas.

Reassociar o Modo selecionado ativa o seu novo conjunto de Perfis em uma única mudança atómica. Eliminar o Modo selecionado mantém os seus Perfis ativos e muda o seletor para **Manual**. Eliminar um Perfil também remove os Modos associados a ele e remove apenas esse Perfil do conjunto ativo; o Velair volta a **Predefinição** quando o conjunto fica vazio.

<a id="a-base-with-independent-zone-exceptions"></a>
## Uma base com exceções independentes por zona

Um Perfil pode incluir vários ambientes. Aplicá-lo como exceção substitui a rotina apenas nos ambientes explicitamente configurados; não muda outros ambientes nem reescreve o Perfil. Cada ambiente usa uma rotina semanal completa, nunca uma mistura de blocos de vários Perfis.

Por exemplo, a base **Inverno** inclui escritório, sala e quarto. **Teletrabalho** inclui escritório e sala; **Visitas** inclui sala e quarto de hóspedes:

| Mudança | Escritório | Sala | Quarto | Quarto de hóspedes |
| --- | --- | --- | --- | --- |
| Selecionar a base Inverno | Inverno | Inverno | Inverno | Predefinição |
| Aplicar Teletrabalho | Teletrabalho | Teletrabalho | Inverno | Predefinição |
| Aplicar Visitas depois | Teletrabalho | Visitas | Inverno | Visitas |
| Restaurar a sala à base | Teletrabalho | Inverno | Inverno | Visitas |

Restaurar a sala à base não recupera Teletrabalho. Exceções não têm pilha de histórico. Escolher Predefinição explicitamente é diferente: usa a programação habitual da zona mesmo quando a base inclui outra rotina para ela.

Use **Aplicar como exceção** em Configuração ativa ou uma automação:

```yaml
action: velair.apply_profiles
data:
  profile_ids: [remote_work]
```

Uma solicitação só pode aplicar vários Perfis se incluírem zonas diferentes. Por exemplo, `[remote_work, guests]` é rejeitado por completo porque ambos incluem a sala. Aplicar Visitas numa solicitação posterior substitui intencionalmente a exceção dessa sala e preserva o escritório.

Para aplicar apenas um ambiente de um Perfil de várias zonas:

```yaml
action: velair.set_zone_profile
data:
  entity_id: climate.office
  profile_id: remote_work
```

O Perfil precisa incluir explicitamente esse ambiente gerido. Use `profile_id: null` para impor Predefinição. Para remover uma exceção e herdar a base atual:

```yaml
action: velair.clear_profile_overrides
data:
  entity_id: [climate.office, climate.living_room]
```

Para substituir toda a base e remover cada exceção sem criar um Modo:

```yaml
action: velair.activate_profiles
data:
  profile_ids: [winter_office, winter_bedrooms]
```

Perfis de base não podem se sobrepor. Uma lista vazia de ativação seleciona Predefinição; listas vazias de aplicação ou limpeza não fazem nada. As novas ações exigem seus campos: um valor omitido nunca significa "todos os ambientes" nem "Predefinição".

Configuração ativa mostra **Base** e seu tipo juntos acima do nome, em dois níveis compactos em telemóveis e cartões estreitos. Nomes longos quebram a linha quando necessário. Uma linha de cobertura mostra quantas zonas geridas incluídas na base ainda a herdam. Exceções, inclusive Predefinição explícito ou o mesmo Perfil, são excluídas dessa contagem. Zonas fora de uma base de Perfil usam Predefinição e não são contadas como parte da base. Uma base Predefinição inclui todas as zonas geridas. Isso descreve a atribuição da seleção, não se os dispositivos estão funcionando. Uma base sem zonas se distingue de uma totalmente substituída por exceções.

Abaixo do resumo de cobertura da base, **Distribuição da casa** começa recolhida. Seu rótulo informa o total da casa, independentemente da quantidade de zonas incluídas na base. Selecione-o para mostrar a barra de 6px e toda a legenda; selecione novamente ou pressione Escape para recolher. O cabeçalho mantém a posição enquanto o conteúdo se expande para baixo, com uma transição curta que respeita a preferência por movimento reduzido. A barra representa todas as zonas geridas utilizando as cores dos Perfis.

Segmentos de exceção incluem zonas fora da base; por isso, suas contagens coincidem com a lista de Exceções. Zonas fora da base sem exceção têm um segmento Predefinição neutro separado. Uma legenda compacta usa ícones de Perfil de 14px, nomes e origem, com as contagens numa coluna separada alinhada à direita. Exceções Predefinição explícitas também usam cor neutra. Referências de base, exceção e alternativa permanecem distintas mesmo quando as cores coincidem. A própria contagem de cobertura da base fica separada e aparece uma vez. Uma base de Perfil vazia ainda pode ter uma barra da casa com zonas Predefinição; sem zonas geridas, não há barra. Esses números descrevem a atribuição da seleção, não o estado físico dos dispositivos.

Os Perfis de base participantes são identificados na legenda expandida; bases de Modo não repetem uma lista separada de componentes acima. No computador, a base ocupa menos largura que as exceções. Seu ícone fica alinhado ao topo do nome e do tipo. O título Exceções usa o ícone de camadas para identificar o mesmo conceito das ações de exceção dos Perfis.

**Exceções** lista cada Perfil e um botão com sua quantidade de zonas; exceções Predefinição explícitas têm seu próprio grupo. Os nomes dos ambientes ficam ocultos até serem solicitados. Selecione qualquer ponto de uma linha de exceção para expandir os ambientes do grupo abaixo dela sem substituir as outras exceções. Selecione novamente ou pressione Escape para recolher; abrir outro grupo fecha o anterior. A expansão tem transição curta e respeita a preferência por movimento reduzido. A linha selecionada e a contagem mantêm a posição; detalhes crescem para baixo e empurram as linhas seguintes, permitindo recolher pelo mesmo botão. Listas longas têm rolagem interna em vez de preencher a Visão geral.

Uma base sem alterações mostra **Sem exceções**. Ela permanece visível mesmo quando todos os ambientes foram substituídos. Configuração ativa não tem uma área separada de edição por zona; use as ações de zona documentadas para mudanças específicas. A entidade select nativa de Modo mostra Manual enquanto houver exceções. Remover todas as exceções restaura o rótulo do Modo original se ele ainda existir. Selecionar um Modo personalizado ou Predefinição, ativar um único Perfil ou ativar uma lista completa substitui explicitamente a base e remove exceções. A opção nativa Manual apenas libera a associação ao Modo de base, mantendo base e exceções.

Editar um Modo de base preserva suas exceções. Renomear ou editar um Perfil mantém as referências ativas: programações alteradas afetam os ambientes que as usam. Adicionar um ambiente a um Perfil não expande uma exceção aplicada anteriormente a outros ambientes. Remova uma exceção antes de editar seu Perfil para remover o ambiente referenciado. Eliminar um Perfil, ou importar definições que o removam, remove suas exceções e devolve esses ambientes à base restante ou a Predefinição.

O Home Assistant continua decidindo a combinação de estação, presença e rotina pessoal. Um Modo sazonal é uma seleção completa, não uma camada extra sobre as exceções por ambiente. Recalcule as seleções relevantes após mudar de estação. Ações para ambientes diferentes se combinam com segurança; ações concorrentes para o mesmo ambiente são aceitas em ordem. Uma seleção completa de base pode substituir todas elas.

Todas as ações explícitas de seleção cancelam um Regresso para casa pendente, inclusive uma seleção repetida. Listas vazias de aplicação/limpeza não cancelam. O cancelamento pode afetar a preparação em outras partes da casa. Ele é guardado separadamente da seleção posterior: se esta falhar ao guardadar, a seleção anterior pode permanecer com o Regresso para casa já cancelado. Solicitações inválidas nunca o cancelam.

Mudanças de seleção são persistidas juntas, mas os dispositivos podem aplicá-las em momentos diferentes ou informar falhas individuais. Pausas e restrições de envio existentes mantêm o controlo. Uma mudança apenas de atribuição da seleção não cancela Reforço nem envia ações duplicadas quando a rotina efetiva permanece igual. Ambientes com execução externa publicam sua semana efetiva com as restrições existentes do provedor. Perfis não eliminam limitações de equipamentos partilhados.

A intenção completa de base e exceções sobrevive à reinicialização. Exportações portáteis contêm definições, não essa intenção ativa; importar nunca ativa Perfis novos.

<a id="seasonal-selection"></a>
## Seleção sazonal

O [blueprint de seleção sazonal da climatização](blueprints/seasonal-climate-selection.pt-pt.md) pode escolher um Modo por uma máxima diária ou outro sensor após uma mudança estável. Ligue Perfis de inverno e verão aos horários do mesmo modelo e atribua predefinições diferentes. Configure um Perfil de tempo ameno com pausa e desligamento quando não quiser climatização. Coordene essa automação com regras de presença: outra leitura estável pode substituir um Modo Ausente selecionado manualmente.

<a id="interactions"></a>
## Interações

- Blocos **Apenas temperatura** mantêm sua política em Perfis, predefinições reutilizáveis, modelos e associações de modelos. Ativar um Perfil ou Modo com esse bloco atualiza a temperatura-alvo sem solicitar mudança de modo HVAC. Não liga um equipamento desligado; a integração precisa aceitar alvos enquanto desligado.
- Pausas globais e por zona têm prioridade sobre uma mudança de perfil.
- Reforços nas zonas afetadas são cancelados ao ativar um perfil.
- O pré-condicionamento adaptativo recalcula para a programação efetiva do perfil.
- O Room Assist segue a temperatura-alvo dessa programação.
- O conforto ambiental continua apenas em monitorização e não é alterado.
- Aquecimento, arrefecimento, aquecer/arrefecer, blocos Desligar e controlos opcionais compatíveis funcionam como nas programações predefinidas.

<a id="restart-and-portability"></a>
## Reinício e portabilidade

O conjunto ativo de Perfis, Modos personalizados e identificador do Modo selecionado são armazenados no backend do Velair. Após reiniciar o Home Assistant, a entidade nativa de seleção é reconstruída desse estado; não ativa um perfil por si só. A configuração existente **Aplicar programação ativo após arranque** controla apenas se o Velair envia imediatamente o alvo efetivo atual aos dispositivos. Desativada, mantém o perfil e calcula eventos futuros sem mudar o dispositivo no arranque. Ativada, a programação do perfil aplica o bloco atual, `Pause and turn off` desliga a zona e `Pause` a mantém inalterada. Reforços ativos, pausas e pausa global mantêm a sua prioridade habitual.

Exportações portáteis V5 podem incluir definições de Perfis e Modos em secções separadas. Nunca incluem o perfil ativo nem a intenção do Modo selecionado, portanto importar não ativa implicitamente outro perfil. Importar apenas Perfis remove Modos cujos Perfis associados deixaram de existir. Importar Modos valida todas as associações e rejeita sobreposição de zonas configuradas.

Em **Definições > Portabilidade**, selecione **Perfis climáticos** e **Modos** ao exportar. Ao importar, reveja e selecione ambas as secções antes de confirmar. As definições selecionadas são substituídas, mas o conjunto atualmente ativo de Perfis e a seleção de Modo nunca são importados.

Cada Modo é associado a um ou mais Perfis com zonas configuradas sem sobreposição. O conjunto completo é ativado de forma atómica; ativar diretamente um Perfil substitui o conjunto por esse único Perfil e seleciona Manual.
