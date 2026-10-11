<a id="climate-profiles"></a>
# Perfis climáticos
<!-- velair-docs:start -->
Traduções: [Original em inglês](climate-profiles.md) · [Español](climate-profiles.es.md) · [Français](climate-profiles.fr.md) · [Deutsch](climate-profiles.de.md) · [Italiano](climate-profiles.it.md) · [Nederlands](climate-profiles.nl.md) · [Polski](climate-profiles.pl.md) · [Português (Brasil)](climate-profiles.pt-br.md) · [Português (Portugal)](climate-profiles.pt-pt.md) · [Русский](climate-profiles.ru.md) · [Estado das traduções](../translation-status.md)

<details>
<summary>Estado desta tradução</summary>

| Informação | Estado |
| --- | --- |
| Versão de referência | 1.9.0-beta.1 |
| Última sincronização | 2026-10-11 |
| Revisão linguística | Tradução assistida por IA |
| Em relação ao original | Sincronizada com o original em inglês. |

</details>

---
<!-- velair-docs:end -->

Perfis climáticos permitem que o Velair alterne várias zonas entre planos semanais coordenados sem substituir as suas programações predefinidas. O Home Assistant continua a decidir quando mudar um perfil: presença, janelas, estações, seletores, sensores ou outras automações tomam a decisão, enquanto o Velair armazena, aplica e mostra o comportamento de climatização resultante.

Um **Perfil** define uma rotina alternativa de climatização para as suas zonas configuradas. Um **Modo** ativa em conjunto um ou mais Perfis sem sobreposição, como um único estado da casa. Ative diretamente um Perfil quando precisar apenas daquela rotina; use um Modo quando várias áreas devem mudar juntas.

Exemplos incluem Em casa, Ausente, Férias, Verão, Visitante e Dormir. Os Perfis também suportam instalações com horários, temperaturas-alvo e modos HVAC diferentes para aquecimento e arrefecimento.

<a id="default"></a>
## Predefinição

`Default` é a seleção integrada e sempre significa as programações semanais configuradas no separador Programações. Não é um perfil armazenado, portanto não pode ser renomeado nem eliminado.

Ativar outro perfil nunca substitui essas programações. Voltar a Predefinição aplica imediatamente o bloco predefinido ativo naquele momento.

<a id="configure-a-profile"></a>
## Configurar um Perfil

Abra **Programações**, escolha **Programações de perfil** e utilize o botão de adicionar para criar um Perfil vazio. Selecione-o na lista para editar cor, ícone, nome, descrição e comportamento dos termóstatos. A área de edição mostra um termóstato por vez para manter o editor completo utilizável em computador, tablet e telemóvel. O nome é editado no cabeçalho, junto ao lápis. O seu ID estável de automação aparece logo abaixo e na lista de perfis, para ser copiado em serviços, scripts e automações sem o confundir com o nome apresentado editável.
Ícones usam chaves Material Design Icons como `mdi:briefcase-outline`; o editor mostra uma pré-visualização com a cor do perfil, um ligação para o catálogo pesquisável de ícones e avisos para chaves fora do formato `mdi:icon-name`. Descrições têm limite de 500 caracteres, com contagem restante. O Velair atribui uma cor estável a perfis novos e existentes; ela pode ser alterada pelo seletor de cores ou valor editável `#RRGGBB`. Valores inválidos são destacados e não podem ser guardados. A cor é incluída nas exportações portáteis. A seleção integrada Predefinição mantém a sua cor fixa. Para cada dispositivo gerido, escolha um comportamento:

- **Programação padrão**: continuar a utilizar a programação semanal habitual da zona.
- **Cronograma de perfil**: utilizar uma programação semanal completa armazenada no Perfil.
- **Pausa** com **Manter a climatização sem alterações**: interromper alterações programadas e manter o dispositivo como está.
- **Pausa** com **Desligar a climatização**: interromper alterações programadas e desligar o dispositivo.

Zonas não configuradas no perfil continuam a utilizar as suas programações predefinidas. Modelos podem ser copiados como blocos independentes; um dia de Predefinição ou Perfil também pode associar apenas horários a um modelo e manter os seus próprios ajustes, ou seguir o modelo completo com todos os controlos apenas para leitura. Modelos e blocos independentes podem fazer referência a predefinições partilhadas do Velair. Consulte [Predefinições de blocos e modelos ligados](linked-schedules.pt-pt.md) para regras de propagação, desvinculação, compatibilidade e edição partilhada, e [o exemplo Inverno/Verão](linked-schedule-examples.pt-pt.md#2-winter-and-summer-with-one-set-of-times) para definições diferentes com os mesmos horários. Clonar um dia preserva tipo de ligação, atribuições apenas de horários e referências a predefinições. Clonar para outro termóstato valida o Perfil proposto antes de aplicar o rascunho; outros dias de destino mantêm as suas ligações. Use Desassociar após clonar se o novo dia deve ser independente do modelo.

Para uma zona delegada a um controlador externo, Perfis e Modos selecionam a semana completa efetiva que o Velair publica, em vez de gerar ações diretas `climate.*`. **Programação padrão** publica a semana habitual, e **Cronograma de perfil** publica a semana do Perfil. **Pausa** não está disponível para zonas geridas externamente. O editor aplica as capacidades do controlador como validação adicional; uma falha de publicação não desfaz a seleção guardada de Perfil ou Modo nem afeta zonas com execução local. Consulte [Execução externa da programação](external-systems.pt-pt.md) para os limites atuais e a semântica de publicação.

Em um dia editado do Perfil, **Guardar como modelo** armazena apenas um modelo reutilizável pelo backend, preservando o rascunho não guardado do Perfil. Para reutilizar o dia noutros dispositivos geridos, selecione-os em **Clonar dia para / Outros termóstatos** e escolha **Clonar**. A confirmação resume os dispositivos selecionados e identifica zonas Predefinição ou Pausa que passarão a **Cronograma de perfil**. Clonar substitui apenas o mesmo dia da semana, preserva todos os demais dias lembrados e continua a fazer parte do rascunho. O Velair valida tipo de alvo, modo HVAC, limites e passo de temperatura em cada dispositivo antes de mudar o rascunho. Remove controlos opcionais incompatíveis com cada destino. Se um bloco apenas de opções ficar sem controlos compatíveis ou se um alvo ou modo for incompatível, nada do rascunho muda. Dias clonados só são guardados ao guardar o Perfil.

Cada dia do perfil usa a mesma linha temporal editável de programações predefinidas e modelos, incluindo arrastar e redimensionar horários. Blocos têm início, mas não um fim separado: o último continua após a meia-noite e em dias vazios até começar outro bloco. A linha temporal representa a parte herdada com um segmento distinto e não editável, identificando o dia em que o bloco realmente está configurado. Enquanto o Perfil permanece aberto, mudar temporariamente uma zona de **Cronograma de perfil** para **Programação padrão** ou **Pausa** preserva o seu rascunho semanal. Selecionar **Cronograma de perfil** novamente restaura esses blocos não guardados. Guardar com Predefinição ou Pausa ainda armazena apenas o comportamento selecionado; o rascunho oculto da programação não é persistido. O seletor mostra nomes amigáveis, e o editor ativo também mostra o ID da entidade. Metadados e programações continuam a ser guardados juntos como um único Perfil atómico; trocar o termóstato selecionado não guarda um rascunho parcial.

Vários perfis podem ficar ativos juntos quando coordenados por um Modo. As suas zonas configuradas não podem sobrepor-se: cada dispositivo gerido tem no máximo um perfil a controlar o seu comportamento efetivo. Zonas sem um perfil ativo responsável continuam a utilizar a programação predefinida.

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

Utilize o botão de reprodução na linha de um Perfil em **Programações > Programações de perfil** para ativação direta, ou o cartão partilhado **Configuração ativa** em Visão geral ou no topo de **Modos**. Ele mostra o Modo atual e os Perfis aplicados como uma relação única. Selecione **Mudar** para escolher um Modo, ou utilize o grupo separado **Ativar um Perfil manualmente**. Escolher diretamente um Perfil substitui o conjunto ativo por ele e muda o Modo para **Manual**; **Predefinição** significa que nenhum Perfil alternativo está ativo. Perfis também podem ser ativados na própria linha, na Configuração ativa ou pela ação `velair.activate_profile`. O Velair aplica o bloco ativo agora, sem aguardar o próximo limite programado. Isso inclui o último bloco de um dia anterior quando nenhum bloco novo começou no dia atual.

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

No editor visual de automações do Home Assistant, adicione uma ação e procure **Velair: Activate climate profile**. Essa ação da integração é separada das ações de switch e select mostradas ao filtrar pelo dispositivo Velair. Informe o **ID de automação** do Perfil, mostrado abaixo do seu nome no Velair.

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

O separador Modos mostra o Modo ativo e Perfis aplicados juntos em um cartão **Configuração ativa**. Seu seletor agrupado lista primeiro Predefinição e Modos personalizados, com ativação direta de Perfis separada. Manual continua visível como estado, mas não pode ser selecionado ali. Selecionar um Modo ativa todos os Perfis associados; selecionar diretamente um Perfil substitui o conjunto por esse único Perfil e muda o Modo para **Manual**. Linhas de Modos mostram ícones e cores dos Perfis associados para distingui-los mesmo com o mesmo nome. As linhas integradas incluem uma explicação breve de quando se aplicam.

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

<a id="seasonal-selection"></a>
## Seleção sazonal

O [blueprint de seleção sazonal da climatização](blueprints/seasonal-climate-selection.pt-pt.md) pode escolher um Modo por uma máxima diária ou outro sensor após uma mudança estável. Ligue Perfis de inverno e verão aos horários do mesmo modelo e atribua predefinições diferentes. Configure um Perfil de tempo ameno com pausa e desligamento quando não quiser climatização. Coordene essa automação com regras de presença: outra leitura estável pode substituir um Modo Ausente selecionado manualmente.

<a id="interactions"></a>
## Interações

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
