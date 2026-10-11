<a id="planned-return"></a>
# Retorno planejado
<!-- velair-docs:start -->
Traduções: [Original em inglês](planned-return.md) · [Español](planned-return.es.md) · [Français](planned-return.fr.md) · [Deutsch](planned-return.de.md) · [Italiano](planned-return.it.md) · [Nederlands](planned-return.nl.md) · [Polski](planned-return.pl.md) · [Português (Brasil)](planned-return.pt-br.md) · [Português (Portugal)](planned-return.pt-pt.md) · [Русский](planned-return.ru.md) · [Status das traduções](../translation-status.md)

<details>
<summary>Status desta tradução</summary>

| Informação | Status |
| --- | --- |
| Versão de referência | 1.9.0-beta.1 |
| Última sincronização | 2026-10-11 |
| Revisão linguística | Tradução assistida por IA |
| Em relação ao original | Sincronizada com o original em inglês. |

</details>

---
<!-- velair-docs:end -->

O Retorno planejado prepara a casa para uma chegada habitual ou pontual depois que os sinais de presença selecionados confirmam que a casa inteira está vazia, ou depois de um início pontual explícito quando não há fontes de presença configuradas. Configure o recurso no Velair: uma rotina semanal estável não exige outro blueprint nem uma ação diária. A rotina automática fica desabilitada por padrão e é executada localmente no Home Assistant. Os retornos pontuais precisam de Modos de ausência e retorno salvos e da Programação automática em funcionamento; as fontes de presença são opcionais para inícios explícitos. A rotina semanal exige pelo menos uma fonte de presença.

<a id="setup"></a>
## Configuração

1. Crie os Modos desejados para ausência e presença, ou use Padrão como destino. Os Perfis de ausência podem desligar a climatização ou usar programações semanais com menor demanda.
2. Abra **Pré-condicionamento**, escolha **Retorno planejado** no seletor de subseções e adicione sinais de presença para saídas monitoradas ou semanais. Use sensores binários, input booleans, grupos ou a zona residencial do Home Assistant (`zone.home`). Inclua sinais de qualquer pessoa que possa permanecer em casa, inclusive visitantes. O Home Assistant continua responsável por acompanhar pessoas e localizações; regras complexas ainda podem ser combinadas em um helper.
3. Na seção de ausência, escolha por quanto tempo a casa deve permanecer vazia e qual Modo de ausência ativar. O padrão é dez minutos; o controle compacto aceita minutos ou horas. A chegada é reconhecida imediatamente.
4. Na seção de chegada, informe o horário habitual de cada dia aplicável e selecione o Modo de destino. Dias sem horário não têm retorno automático. O Velair usa a programação do destino no horário de chegada para preparar cada zona.
5. Habilite o Pré-condicionamento adaptativo para as zonas que devem começar antes. As configurações existentes e o aprendizado local de aquecimento/resfriamento são reutilizados.
6. Use o interruptor na barra de status para habilitar a rotina e então Salvar. O interruptor altera o rascunho; Cancelar restaura a configuração salva. Pare qualquer automação de presença/ausência que selecione Modos para essa mesma casa, pois dois controladores entrariam em conflito.

Os dias seguem a preferência **Primeiro dia da semana** salva nas Configurações do Velair. Informe diretamente o horário de chegada de cada dia. Se você sair em um dia sem horário, o Velair aplica o Modo de ausência depois da confirmação, não programa preparação antecipada e restaura o destino quando detecta presença. O fuso horário do Home Assistant aparece ao lado da rotina semanal. As alterações permanecem no rascunho até serem salvas. Cancelar e Salvar ficam à direita do rodapé da configuração.

O resumo superior agrupa três partes da rotina em contêineres separados com bordas, correspondentes às seções de configuração, sem um cartão externo nem uma linha lateral compartilhada. A rotina semanal mostra o Modo de ausência, o atraso de confirmação, a preparação adaptativa e o Modo de destino em um fluxo simples; o interruptor altera a configuração de habilitação da rotina. O atraso é o tempo durante o qual a casa deve permanecer vazia, e não uma estimativa de preparação. A seção de presença mostra o resultado combinado e a quantidade de fontes; expanda-a para verificar cada sinal. Sinais desconhecidos impedem uma nova ausência e são diferenciados de presença confirmada. A seção de retorno rápido reúne a saída pontual e os controles de chegada do episódio atual. As ações usam a configuração salva; portanto, salve ou cancele alterações de configuração pendentes antes de anunciar uma nova saída.

O formulário segue a ordem de saída e chegada: fontes de presença, atraso de ausência e Modo de ausência, depois horários semanais de chegada e Modo de destino. As fontes de presença usam a ação circular verde Adicionar do editor de blocos quando uma fonte é selecionada. Adicionar e Remover mantêm a aparência transparente quando desabilitados; quando habilitados, dão retorno visual ao passar o mouse ou receber foco. A lista de fontes configuradas começa recolhida. Seu resumo mostra o total e as quantidades de sinais de presença, ausência e estado desconhecido; expanda-o para verificar ou remover fontes individuais. No celular, o resumo ocupa toda a largura do seletor e da linha de Adicionar; ícones e números mantêm as contagens juntas, com rótulos acessíveis completos. Os contadores ficam alinhados à borda final do resumo. No celular, a lista expandida tem a mesma largura do resumo, com Remover no fim de cada linha e mais espaço para nomes e IDs. Em computadores, as listas acompanham a largura do seletor. Expandir a lista não altera a configuração. Atrasos informados em horas são arredondados para o minuto mais próximo; o atraso equivalente aparece ao lado do controle.

Os estados reconhecidos como presença são `on` e `home`; como ausência, `off` e `not_home`. Na zona residencial, zero pessoas significa ausência e uma contagem positiva significa presença. Qualquer sinal de presença torna a casa ocupada; ela só é considerada vazia quando todos os sinais indicam ausência. Se nenhum sinal indicar presença e algum estiver desconhecido ou indisponível, o estado de presença é desconhecido: novas ausências não podem começar. Um retorno já aceito continua programado. O painel mostra o resultado combinado e cada fonte.

Selecione sinais que representem presença: um sensor de movimento desligado não significa necessariamente que ninguém está em casa.

<a id="room-preparation"></a>
## Preparação dos ambientes

Expanda **Room preparation**, abaixo do fluxo da rotina, para ver todas as entidades de climatização gerenciadas. A lista começa recolhida, com contagens de preparação adaptativa, funcionamento apenas na chegada e ausência de preparação. Expandi-la não altera configurações nem envia comandos de climatização. A mesma visão geral vale para retornos semanais e pontuais.

Cada linha identifica o ambiente, a origem da programação de destino e o status da preparação. Uma entidade ausente dos Perfis do Modo de destino ainda usa sua programação **Padrão**; um comportamento normal explícito também usa Padrão. Uma programação de Perfil usa o nome desse Perfil. Uma pausa do Perfil de destino, uma zona desabilitada ou a execução externa são identificadas separadamente, em vez de aparecerem como funcionamento apenas na chegada. Sem Pré-condicionamento adaptativo, um ambiente local habilitado segue sua programação efetiva na chegada; ele não é automaticamente excluído das mudanças de Modo.

Sem um retorno futuro, essa lista descreve o que a configuração salva permite, e não prevê que o ambiente começará antes. Depois que um retorno é aceito, ela determina o alvo de cada destino naquele horário de chegada e mostra os estados pendente, em preparação, alvo atingido, suspenso ou indisponível, com o motivo correspondente. A ausência de dados de temperatura ou de uma estimativa válida impede a preparação antecipada; Reforço, Ajuste manual e pausas explícitas mantêm sua prioridade habitual. Uma saída não confirmada não pode aparecer como em preparação. **Preparing** descreve a intenção de preparação ativa do Velair, e não confirma que o equipamento recebeu um comando ou está funcionando fisicamente. **Target reached** significa que a temperatura medida no momento está dentro da tolerância de preparação e já pode ser verdadeiro antes da saída; isso não inicia uma ausência nem ignora a confirmação.

**Planned start** é uma estimativa, não uma comprovação de comando de climatização ou de prontidão física. Os alvos aceitam aquecimento, resfriamento e faixas de temperatura. Retornos concluídos, cancelados e ignorados voltam a mostrar informações de configuração, em vez de horários de preparação obsoletos. O Diagnóstico continua usando as configurações salvas pelo backend até que Salvar tenha sucesso, sem um lembrete adicional de preparação. Essa lista completa substitui a antiga lista de zonas limitada ao episódio.

<a id="one-off-return"></a>
## Retorno pontual

Em **One-off return**, escolha uma data e um horário futuros de chegada e selecione **Plan return**. Data e horário ficam juntos. No celular, **Plan return** fica na linha seguinte, alinhado à borda direita do campo de horário; em telas maiores, a ação fica ao lado dos campos. A explicação aparece abaixo dos controles. Você pode fazer isso antes de sair ou quando já estiver fora. O Velair usa as configurações salvas de Modos e presença. Com fontes de presença configuradas, ele mantém a solicitação pendente e só aplica o Modo de ausência depois que todas as fontes indicarem ausência durante o atraso de confirmação, protegendo quem permanecer em casa. Sem fontes de presença salvas, pressionar **Plan return** confirma explicitamente sua saída: o Modo de ausência começa imediatamente, sem atraso. Nesse caso, o Velair não deduz que a casa está vazia nem detecta seu retorno físico; ele prepara os ambientes normalmente e ativa o destino na chegada salva. Uma fonte configurada desconhecida/indisponível continua exigindo espera; uma entidade ausente não pode ser tratada como uma lista vazia de fontes.

A data e o horário pontuais substituem o horário semanal apenas nessa ausência. O recurso também funciona com a rotina automática desabilitada. Você pode alterar ou cancelar o aviso pendente; se a saída não for confirmada antes do horário de chegada, ele expira sem mudar Modos. Se todas as fontes já indicarem ausência e não houver episódio ativo, planejar o retorno inicia imediatamente o atraso de confirmação configurado; não é necessária uma nova mudança de sensor. Se uma ausência já estiver ativa, altere a data e o horário de chegada no editor do episódio existente; isso transforma o retorno em uma exceção pontual sem aplicar o Modo de ausência novamente. Adiar uma chegada encerra sua preparação anterior e restaura o comportamento atual de ausência até chegar o momento da nova preparação. Reforço e ajustes manuais continuam protegidos. O alvo do destino é determinado na data local de chegada selecionada, mesmo quando a preparação começa no dia anterior. Enviar o mesmo instante não reinicia a preparação. Chegadas passadas ou no instante atual e horários locais inexistentes por mudança de horário de verão são rejeitados; um horário repetido usa sua primeira ocorrência futura.

Episódios concluídos, ignorados e cancelados continuam bloqueando o reinício da rotina automática até que seja detectada presença, para que uma casa vazia não inicie outra saída semanal sozinha. Você pode selecionar explicitamente **Plan return** depois de qualquer episódio inativo sem esperar estar em casa. A nova solicitação usa as fontes de presença e os Modos atuais. Com fontes, ela confirma novamente a ausência pelo atraso configurado, mesmo que todos já estejam fora, sem mudar o Modo imediatamente. Sem fontes, o registro explícito ativa o Modo de ausência imediatamente. O painel lateral e o cartão do dashboard mostram um novo formulário de planejamento assim que o episódio fica inativo. Se o planejamento estiver indisponível, o formulário permanece visível com **Plan return** desabilitado e uma explicação das configurações salvas necessárias e do estado do agendador. Nessa situação, um retorno ativo ainda pode ser cancelado.

Depois da saída confirmada, use **Cancelar** para interromper o retorno e restaurar o Modo e os Perfis anteriores registrados, ou **Alterar chegada** para atualizar a data e o horário. Durante a confirmação de ausência, cancelar mantém a seleção ativa, porque o Modo de ausência ainda não foi aplicado. Desabilitar a rotina automática ou editar os horários semanais não cancela um retorno manual. Alterar suas fontes de presença ou seus Modos invalida o aviso anterior. Seleções explícitas de Modo/Perfil cancelam retornos pendentes e ativos. Um agendador parado não executa o retorno.

A primeira linha mantém o título One-off return à esquerda e os indicadores de presença exclusivos do cartão à direita. A fase atual é um subtítulo compacto junto ao título, sem uma etiqueta ou linha separada. Durante a confirmação, o título do processo de temporização fornece a fase. O cartão do dashboard agrupa as contagens de presença no canto superior direito quando há fontes configuradas. Sem fontes, os contadores e o ícone de atraso sem uso são omitidos, e o painel lateral informa **Sem monitoramento**, em vez de presença desconhecida. O ícone do atraso de confirmação aparece apenas antes da confirmação de uma ausência ativa; ele fica oculto durante Ausência/Preparação e em erros ativos com saída confirmada. O painel lateral não repete esses indicadores. Passe o mouse para ver uma explicação breve da fase. Durante a confirmação de ausência, uma linha discreta de temporização explica que o Velair está verificando se a casa permanece vazia. **Até** mostra o prazo de confirmação do backend no horário local do Home Assistant, incluindo a data quando for diferente de hoje. O Velair só ativa o Modo de ausência depois da confirmação se todas as fontes selecionadas ainda indicarem ausência. Trata-se de um prazo, e não de uma contagem regressiva ao vivo ou de uma saída confirmada. O mesmo processo aparece enquanto a rotina semanal confirma uma ausência antes de existir um episódio; a falta de dados de prazo não gera um horário inventado. Antes da confirmação da saída, um ícone de chegada e o rótulo **Expected arrival** identificam o retorno salvo, com rótulo acessível e dica. Essa linha fica alinhada ao título e ao texto de estado. Sua data/hora salva aparece como uma etiqueta compacta clicável, sem lápis nem sublinhado. A linha do tempo confirmada usa o mesmo ícone; apenas a data/hora salva sublinhada e o lápis à sua esquerda formam o botão de edição. Selecione esse valor para abrir o editor de data/hora embutido. A linha de ações tem **Voltar** em azul com uma seta à esquerda e **Alterar chegada** em verde à direita. Voltar descarta as alterações de chegada não salvas e fecha o editor sem alterar o retorno. Em um painel lateral largo, o editor permanece compacto e alinhado ao ponto de chegada; a ação de alteração fica à direita abaixo dele. Telas estreitas e o cartão mantêm o layout responsivo. Os campos ficam ocultos até serem solicitados. **Voltar** restaura a última chegada salva e oculta os campos. Também remove o aviso de chegada e a proteção de navegação; alterações independentes não salvas da configuração da rotina continuam protegidas. Reabrir o editor parte da chegada salva. Durante uma ausência confirmada, o ponto de chegada da linha do tempo é esse mesmo botão de edição, evitando duplicação. Cancelar aparece abaixo do gráfico e da legenda de preparação à esquerda, apenas enquanto o editor de chegada está fechado. Durante a edição, Cancelar fica oculto, **Alterar chegada** à direita e **Voltar** à esquerda, para descartar localmente a edição de chegada. Alterar o campo não muda o retorno planejado até que **Alterar chegada** tenha sucesso. Mudanças bem-sucedidas fecham o editor e devolvem o foco à chegada salva. Falhas e atualizações dos sensores preservam o rascunho aberto. Um aviso de alterações não salvas identifica a edição pendente, e navegar ou recarregar alerta antes de descartá-la. Salvar a configuração da rotina não aplica a edição de chegada. Voltar e Alterar chegada usam superfícies compactas preenchidas em azul e verde, respectivamente. Suas superfícies visíveis têm 32 pixels de altura dentro de áreas de toque de 44 pixels. O cancelamento usa uma superfície vermelha compacta com ícone/texto brancos abaixo dos dados do episódio, também com 32 pixels dentro de uma área de toque de 44 pixels; passar o mouse e receber foco continuam claramente indicados. As cores de texto e ícones se adaptam ao tema para manter a legibilidade. Ações indisponíveis usam fundo neutro e texto e ícones atenuados, com cursor de ação não permitida. Alterar chegada ganha a cor verde quando a chegada é editada. A fase permanece junto ao título. Cancelar fica à esquerda abaixo dos dados quando não há edição; Alterar chegada fica alinhado à direita abaixo do editor aberto. O painel lateral e o cartão preservam esse agrupamento no celular. Plan return continua alinhado à direita no formulário de novo planejamento. Ações bem-sucedidas atualizam o episódio sem outra mensagem de confirmação de salvamento.

<a id="home-assistant-actions"></a>
### Ações do Home Assistant

Automações, scripts e dashboards podem anunciar uma saída usando `velair.start_planned_return`. Tanto `return_date` (`YYYY-MM-DD`) quanto `return_time` (`HH:MM` em formato de 24 horas) são obrigatórios. Juntos, devem identificar uma chegada futura no fuso horário do Home Assistant. O seletor nativo de horário pode enviar `HH:MM:00`; segundos iguais a zero são aceitos e normalizados para precisão de minutos. Escolha uma data futura para o exemplo a seguir:

```yaml
action: velair.start_planned_return
data:
  return_date: "2026-10-09"
  return_time: "19:25"
```

Isso usa as configurações salvas de presença e Modos, com o mesmo comportamento de confirmação, preparação e ajustes prioritários de **Plan return**. Funciona com a rotina semanal desabilitada e atualiza a data e o horário de chegada se uma ausência já estiver ativa, sem aplicar o Modo de ausência novamente. Os Modos salvos e a Programação automática precisam estar operacionais. As fontes são opcionais para retornos pontuais: uma lista salva vazia aplica o Modo de ausência imediatamente; fontes configuradas mantêm as regras normais de confirmação. Uma chegada no passado ou no instante atual é rejeitada sem substituir o retorno anterior. Um horário já passado ou inexistente por mudança de horário de verão é rejeitado; em uma hora repetida, o Velair escolhe a primeira ocorrência que ainda está no futuro.

Cancelar um retorno pendente ou ativo:

```yaml
action: velair.cancel_planned_return
data: {}
```

A mesma ação de cancelamento também fecha o aviso de um episódio inativo. Ela interrompe a preparação e o retorno programado, mantendo o bloqueio de reinício automático após o cancelamento. Depois da saída confirmada, restaura o Modo e a seleção exata de Perfis salvos antes do início do episódio. Durante a confirmação de ausência, mantém a seleção atual. Um novo **Plan return** explícito pode substituir esse episódio inativo. O painel lateral e o cartão usam essa mesma ação de cancelamento.

<a id="cancelling-a-return-examples"></a>
## Cancelamento de um retorno: exemplos

O atraso de confirmação de ausência ocorre **antes** de aplicar o Modo de ausência. Cancelar durante esse atraso não exige restauração: o Modo e os Perfis anteriores ainda estão ativos. Cancelar depois da saída confirmada restaura a seleção registrada no início daquele episódio, em vez de ativar imediatamente o Modo de retorno configurado.

Nos exemplos a seguir, considere:

- **Comfort** está ativo, selecionando os Perfis **Living room comfort** e **Bedroom comfort**.
- O Modo de ausência é **Away**, o Modo de retorno é **Evening** e a chegada está planejada para 18:00.
- As fontes indicam uma casa vazia às 13:00 e o atraso de confirmação é de cinco minutos.

<a id="cancel-before-confirmation-finishes"></a>
### Cancelar antes de terminar a confirmação

| Horário | O que acontece | Modo e Perfis selecionados |
| --- | --- | --- |
| 13:00 | Inicie um retorno. O Velair verifica se a casa permanece vazia até 13:05. | Comfort e seus dois Perfis continuam ativos. |
| 13:02 | Selecione **Cancelar** enquanto a ausência ainda está sendo confirmada. | Comfort e seus dois Perfis continuam ativos; Away nunca foi aplicado. |

A chegada planejada para 18:00 é removida. Não haverá ativação posterior de Away ou Evening por esse episódio cancelado.

<a id="cancel-after-departure-is-confirmed"></a>
### Cancelar depois da saída confirmada

Este é um episódio separado, com a mesma configuração inicial:

| Horário | O que acontece | Modo e Perfis selecionados |
| --- | --- | --- |
| 13:00 | Inicie um retorno e a confirmação. | Comfort e seus dois Perfis continuam ativos. |
| 13:05 | Todas as fontes configuradas ainda indicam ausência. | O Velair aplica Away e seus Perfis. |
| 13:10 | Selecione **Cancelar**. | O Velair restaura Comfort e os dois Perfis originais e então remove a chegada. |

O resultado é Comfort, **não** o Modo de retorno Evening configurado. Se a preparação para Evening já tiver começado, o cancelamento também a remove e restaura a seleção original. Reforços ativos, Ajustes manuais e pausas independentes mantêm sua prioridade.

<a id="start-without-occupancy-sensors"></a>
### Iniciar sem sensores de presença

Sem fontes de presença configuradas, **Plan return** aplica Away imediatamente. Não há etapa de confirmação de cinco minutos. Cancelar esse retorno ativo restaura Comfort e os dois Perfis registrados imediatamente antes de iniciá-lo. Um sensor configurado desconhecido ou indisponível não equivale à ausência de sensores: ele continua impedindo a confirmação de uma nova ausência.

<a id="default-arrival-edits-and-restart"></a>
### Padrão, edições de chegada e reinicialização

Se o episódio começar em **Padrão**, sem Perfis ativos, cancelar depois da saída confirmada retorna a Padrão sem Perfis ativos. Uma combinação manual de Perfis é restaurada na ordem original.

Alterar a chegada de 18:00 para 19:00 ou reiniciar o Home Assistant não substitui a seleção anterior registrada. Cancelar ainda restaura a seleção de antes do início desse episódio. Não recupera temperaturas ou estados HVAC anteriores do equipamento: a seleção restaurada usa suas programações atuais, sujeitas aos ajustes prioritários existentes.

<a id="choose-another-mode-instead-of-cancelling"></a>
### Escolher outro Modo em vez de cancelar

Se você selecionar explicitamente **Eco** enquanto um retorno estiver ativo, essa seleção remove o retorno e mantém Eco. O Velair não restaura Comfort depois, quando a presença mudar ou o aviso final for fechado. Isso preserva sua escolha explícita; é uma ação diferente do botão **Cancelar** do episódio.

<a id="distinguish-the-controls"></a>
### Diferenciar os controles

- **Cancelar** nos controles de retorno remove o episódio como descrito acima.
- **Voltar** no editor de chegada descarta edições de chegada não aplicadas; o retorno salvo continua.
- O **X** genérico do painel de ações do cartão de climatização fecha o painel sem cancelar o retorno.
- **Cancelar**, ao lado de **Salvar** na configuração da rotina, descarta configurações não salvas, em vez de cancelar um episódio.

Para episódios antigos sem seleção anterior registrada, ou se os Perfis salvos não forem mais válidos, consulte [os limites de restauração](#restoration-limits).

<a id="daily-behavior"></a>
## Funcionamento diário

Por exemplo, configure de segunda a sexta-feira às 18:15. Depois que a casa permanecer vazia pelo atraso de confirmação, o Velair ativa o Modo de ausência e determina a programação de presença às 18:15. Cada zona usa sua própria estimativa de preparação. Uma zona que precisa de uma hora pode começar às 17:15, enquanto uma mais rápida começa depois.

O alvo é o bloco efetivo **na chegada**, incluindo a continuidade semanal. Se a programação de presença pedir 17 graus antes de 18:00 e 21 graus depois, um retorno às 18:15 prepara 21 graus mesmo que a preparação comece antes de 18:00. A programação semanal não é editada nem preenchida com blocos temporários.

No horário esperado, o Velair seleciona o destino e continua sua programação normal. Um sinal antecipado de presença seleciona o destino imediatamente. Uma chegada atrasada não muda a casa de volta para o Modo de ausência. Pausas, Reforço, Ajuste manual, zonas desabilitadas e um agendador parado mantêm suas restrições existentes de aplicação. A preparação aceita aquecimento, resfriamento e faixas nativas de temperatura. Seu objetivo é aproximar o ambiente do alvo; ela não pode garantir uma temperatura exata.

<a id="preparation-and-room-assist"></a>
### Preparação e Room Assist

O Modo de destino define a configuração necessária na chegada. Cada zona começa em seu próprio horário estimado; o Modo inteiro é selecionado na chegada, e não quando a primeira zona começa a se preparar. Zonas que ainda não começaram continuam seguindo a programação de ausência.

Depois que uma zona começa a se preparar, seu alvo temporário de chegada tem prioridade sobre blocos posteriores da programação de ausência. Por exemplo, em uma ausência de dez horas com retorno às 19:25:

| Horário | Alvo deste ambiente |
|---|---|
| 09:25, ausência confirmada | A programação de ausência pede 16 graus |
| 16:25, esta zona começa a se preparar | A programação de chegada pede 21 graus |
| 17:00, um bloco de ausência pede 18 graus | A preparação continua buscando 21 graus |
| 19:25, chegada planejada | O Modo de destino começa sua programação normal |

Um bloco da programação de ausência não cancela a preparação de retorno da zona. Essa prioridade também vale para resfriamento e faixas de temperatura.

Se o Room Assist estiver habilitado, seguirá o mesmo alvo temporário de chegada. Neste exemplo, ele ajuda o ambiente a chegar a 21 graus, em vez de corrigi-lo de volta para o alvo de ausência de 16 graus. O alvo enviado à entidade de climatização pode ser diferente de 21 graus porque o Room Assist compensa diferenças entre o sensor do ambiente e a leitura da própria climatização. Correções em fila são revalidadas em relação ao alvo atual antes do envio.

Uma mudança direta de temperatura feita pelo usuário segue a política de ajustes externos da zona. **Manter automático** reaplica o alvo que tem prioridade no momento, que durante a preparação é o alvo de chegada. Um **Ajuste manual** suspende a aplicação automática e o Room Assist da zona enquanto estiver ativo. Reforço e pausas explícitas da zona mantêm sua prioridade existente; eles não cancelam o retorno da casa inteira. Consulte [Room Assist](room-assist.pt-br.md) e [Ajuste manual](manual-control.pt-br.md).

<a id="exceptions-and-restarts"></a>
## Exceções e reinicializações

A subseção Retorno planejado reúne o retorno aceito, a preparação de cada zona e a rotina salva. Abra-a diretamente em `/velair/preconditioning/planned-return`; `/velair/preconditioning/preconditioning` abre o Pré-condicionamento adaptativo, que é a subseção padrão da aba. Ajustar o horário de chegada altera apenas essa ausência, e não a semana salva. **Cancelar** remove a preparação e a mudança automática para o destino. Antes da confirmação de ausência, mantém a seleção ativa; depois da confirmação, restaura o Modo e os Perfis registrados antes do início desse episódio.

Uma seleção explícita de Modo ou Perfil cancela o retorno automático do episódio. Um sinal posterior de presença ou uma reinicialização não deve substituir essa seleção. O Velair mantém o registro de ausências concluídas ou canceladas até que a casa volte a ficar ocupada.

Essa seleção explícita também cancela a preparação já em andamento para o episódio, mesmo quando a configuração do Modo ou Perfil selecionado já está ativa. Isso difere de uma mudança de temperatura programada dentro do Modo de ausência, que não cancela a preparação. Nem o painel lateral nem o cartão incluem os botões Skip, I'm home ou Close; os controles compartilhados são Cancelar e Alterar chegada. O backend mantém operações separadas de ignorar e chegar para consumidores da API; seus contratos estão documentados na [API para desenvolvedores](../developer/api.md). A ação `velair.cancel_planned_return` cancela um retorno pendente ou ativo confirmado, ou fecha o aviso de um episódio inativo. O cancelamento interrompe a preparação e o retorno programado e impede o reinício automático dessa ausência. Para uma saída confirmada, restaura a seleção anterior salva de Modo/Perfis; para uma confirmação pendente ou aviso final, não altera a seleção. Um novo **Plan return** explícito ainda pode iniciar outro episódio.

<a id="restoration-limits"></a>
### Limites de restauração

Para um retorno pontual, o Velair registra a seleção quando você escolhe **Plan return**. Para a rotina semanal, registra a seleção quando a ausência é confirmada, imediatamente antes de aplicar o Modo de ausência.

A seleção anterior é preservada após edições de chegada e reinicializações do Home Assistant. Isso restaura a seleção de Perfis, e não temperaturas ou estados anteriores do equipamento; os Perfis restaurados usam suas programações atuais e as prioridades dos ajustes existentes. Se o Modo anterior tiver sido removido ou alterado, os Perfis originais podem ser restaurados como seleção manual. Se um Perfil salvo estiver ausente, inválido ou em conflito com outro Perfil salvo, o cancelamento ainda tem sucesso, mas mantém a seleção atual e informa que a restauração ficou indisponível. Episódios criados antes da existência desses metadados de restauração mantêm a seleção atual, pois o Velair não consegue deduzir a anterior.

Após uma reinicialização, avisos pontuais pendentes e ausências confirmadas são recuperados, em vez de começar novamente. Uma ausência não confirmada reinicia seu atraso de confirmação. Um sensor que informa presença encerra corretamente a ausência anterior mesmo quando a chegada ocorreu com o Home Assistant offline.

<a id="limits-and-backups"></a>
## Limites e backups

- Há suporte a uma rotina para a casa inteira. As chegadas semanais continuam sendo no mesmo dia: sair depois do horário de hoje, ou em um dia sem horário, ativa o Modo de ausência sem programar o retorno de amanhã. Retornos pontuais podem usar qualquer data futura.
- Calendários, turnos rotativos e rotinas automáticas com chegada no dia seguinte não são interpretados.
- Sem pré-condicionamento habilitado, leitura de temperatura ou alvo térmico, o destino ainda muda na chegada, mas essa zona não se prepara antes.
- Transições que afetam zonas com execução externa são rejeitadas antes da mudança de Modo; o Velair não assume o controle local de seu controlador.
- O blueprint genérico de presença/ausência existente não muda e continua útil em outras instalações e ações.
- Backups portáteis incluem a configuração da rotina, e não episódios de presença ou temporizadores. Rotinas importadas ficam desabilitadas até serem habilitadas explicitamente.

Consulte [Perfis climáticos](climate-profiles.pt-br.md), [Pré-condicionamento adaptativo](adaptive-preconditioning.pt-br.md) e [Ajuste manual](manual-control.pt-br.md) para os controles subjacentes.

<a id="overview-and-diagnostics"></a>
## Visão geral e Diagnóstico

A Visão geral exibe um resumo compacto da casa durante um episódio semanal ou pontual, ou quando há uma ocorrência que exige atenção. Ele identifica a origem e o estado e mostra o prazo de confirmação ou a chegada esperada, conforme o caso. Selecione o resumo para abrir os detalhes completos deste recurso em Pré-condicionamento.

Um sinal violeta na climatização identifica o controle atual do Retorno planejado. O estado operacional existente continua visível: esse sinal explica a origem, em vez de substituir os estados de aquecimento, resfriamento, pausa, programação ou pré-condicionamento. Estimativas de início futuro são identificadas separadamente. Controle manual, Reforço e pausas independentes mantêm sua prioridade. A identificação de ausência cobre os Perfis de ausência efetivos do episódio, ou Padrão quando selecionado explicitamente como Modo de ausência; não cobre uma entidade não associada que apenas mantenha sua programação Padrão. A preparação pode legitimamente usar a programação Padrão do destino quando o backend seleciona o alvo de chegada dessa entidade.

O Diagnóstico mostra o estado atual da casa, a origem do controle e o status de preparação de cada entidade, incluindo por que a preparação está suspensa ou indisponível. A categoria de histórico Retorno planejado registra transições aceitas relevantes, sem entradas duplicadas ao atualizar o painel. Suas entradas compartilham o limite existente de 100 eventos durante a execução e são apagadas na reinicialização. As preferências de categorias salvas são mantidas. Relatórios baixados incluem essas informações e removem identificadores operacionais de Modos e Perfis. A intenção de controle e o sucesso da entrega continuam sendo informações distintas.

<a id="dashboard-card"></a>
## Cartão do dashboard

O cartão Lovelace opcional mostra os controles compactos de One-off return. Seu cabeçalho inclui as quantidades de fontes indicando presença, ausência e estado desconhecido e o atraso salvo de confirmação de ausência; o resumo semanal, a lista de fontes e os detalhes de preparação dos ambientes continuam no painel lateral. Configure primeiro a casa no painel lateral.

```yaml
type: custom:velair-card
view: planned-return
```

Selecione **Retorno planejado** no editor visual do cartão. O cartão atua no mesmo episódio persistido que o painel lateral e os outros cartões. Aceita datas e horários futuros de retorno. Episódios ativos oferecem **Cancelar** e **Alterar chegada**; Cancelar interrompe o retorno aceito e restaura a seleção anterior registrada de Modo/Perfis depois da saída confirmada; durante a confirmação, mantém a seleção. Após a conclusão, o cancelamento ou qualquer outro episódio inativo, o cartão mostra um novo formulário de planejamento sem esperar uma mudança de presença. Configuração salva inválida ou agendador parado desabilita o planejamento e as alterações, mas um retorno ativo ainda pode ser cancelado. O painel lateral usa os mesmos botões e ciclo de vida do episódio; a configuração semanal e seu interruptor de habilitação permanecem ali. Apenas os indicadores finais de fontes/atraso são exclusivos do cartão; painel lateral e cartão compartilham o subtítulo de fase junto ao título, a edição de chegada e a linha do tempo. Durante a confirmação, o bloco do processo de temporização substitui o subtítulo. Essa visão da casa não tem filtro de termostato.

O cartão **Termostato: status e controle** também pode oferecer **One-off return** como ação rápida fornecida pelo Velair, junto de Reforço e Pausa. Habilite-a no editor de ações do cartão, escolha se quer mostrar seu nome ou coloque-a em Mais. O editor agrupa Reforço, Pausa e One-off return primeiro, mesmo quando desabilitados. A ação abre os mesmos controles compactos no painel inferior, com um título simples como os de Reforço e Pausa. Os três formulários usam a altura compacta existente de 38 pixels nos campos. Uma saída ativa mostra sua linha do tempo e seu editor de chegada existentes. O X do painel fecha os controles sem cancelar a saída. Fechar com alterações de chegada não salvas pergunta se você quer descartá-las; fechar fica bloqueado enquanto uma ação é executada. Essa ação sempre controla a casa inteira, independentemente da entidade de climatização selecionada. Configurações existentes do cartão mantêm a ação oculta. Novos cartões criados pelo seletor de cartões do Home Assistant a incluem habilitada; configurações YAML precisam ativá-la com `type: planned-return` em `climate_actions`.

Durante **Away** e **Preparing for arrival**, o cartão mostra a saída confirmada e a chegada salva com os nomes dos Modos de ausência e retorno do episódio. Um ponto de horário atual, identificado pela dica **Agora**, avança conforme o tempo UTC decorrido, inclusive durante mudanças de relógio, e permanece dentro da barra. Os pontos inicial e final incluem datas quando suas datas no calendário do Home Assistant diferem. Edições de chegada não salvas não alteram essa barra. Estados pendentes e finais, ou episódios sem horário de saída confirmada, mantêm um status estático sem linha do tempo. O painel lateral e o cartão atualizam seus relógios locais uma vez por minuto apenas enquanto visíveis e ativos, e imediatamente ao voltar a ficar visíveis; essa atualização de exibição nunca solicita dados do backend.

Ícones de saída e chegada ficam nas extremidades da linha, com dicas nativas e rótulos acessíveis. Os horários salvos ficam próximos abaixo de seus ícones; apenas o valor de chegada é editável. Rótulos simples de Modo abaixo dos horários identificam as configurações de ausência e retorno com um ícone genérico de Modo. Nomes longos e datas de dias diferentes quebram linha dentro do painel. Cada extremidade agrupa seu horário e seu rótulo de Modo, logo abaixo. Campos de edição de data/hora usam o mesmo tamanho compacto dos outros formulários de ação; não aparece um botão de fechar ao lado do horário salvo. A posição de preparação é uma pequena marca na linha, com relógio e legenda explicativa abaixo dos horários. O trecho decorrido da linha, as marcas nas extremidades e o indicador Agora mostram a passagem do tempo, e não o progresso térmico. Quando não há estimativa válida para o primeiro ambiente, um pequeno botão de informação ao lado do título One-off return explica a previsão atual da chegada salva: todos os ambientes afetados podem estar suspensos, já no alvo, excluídos ou configurados para agir apenas na chegada. Passe o mouse ou dê foco no computador, ou toque no celular. Informações ausentes ou mistas permanecem inconclusivas e não significam que a preparação antecipada está desabilitada. Escape ou uma interação fora fecha a ajuda.

Quando o backend tem uma estimativa adaptativa válida para a chegada salva, a linha do tempo adiciona um relógio e horário **Preparação estimada**. Ele identifica a primeira estimativa entre os ambientes elegíveis; os demais podem começar depois. A legenda suavemente colorida pode ser expandida e começa recolhida. Selecione-a para ver cada ambiente elegível e seu início estimado, em ordem de horário. A lista usa nomes e ícones dos ambientes do Home Assistant e horário local, incluindo datas quando necessário. Ambientes suspensos, já no alvo ou que atuam apenas na chegada são excluídos. Abrir a lista não solicita dados do backend; atualizações normais preservam seu estado, enquanto uma mudança na chegada salva ou no episódio a fecha. Durante a edição da chegada, a legenda expansível e o controle informativo alternativo ficam ocultos; a linha mantém sua estimativa salva. Voltar restaura o estado de expansão do mesmo episódio. Passe o mouse sobre o cabeçalho para ver a explicação. Trata-se de uma estimativa de planejamento, e não de uma comprovação de que um equipamento começou a funcionar nem de uma medida de progresso térmico. Ambientes suspensos, já no alvo, indisponíveis ou que atuam apenas na chegada não fornecem essa marca. Sua posição permanece dentro da barra de saída/chegada, enquanto o rótulo mantém a estimativa real, inclusive uma data anterior.
