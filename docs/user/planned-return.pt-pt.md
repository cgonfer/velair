<a id="planned-return"></a>
# Regresso planeado
<!-- velair-docs:start -->
Traduções: [Original em inglês](planned-return.md) · [Español](planned-return.es.md) · [Français](planned-return.fr.md) · [Deutsch](planned-return.de.md) · [Italiano](planned-return.it.md) · [Nederlands](planned-return.nl.md) · [Polski](planned-return.pl.md) · [Português (Brasil)](planned-return.pt-br.md) · [Português (Portugal)](planned-return.pt-pt.md) · [Русский](planned-return.ru.md) · [Estado das traduções](../translation-status.md)

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

O Regresso planeado prepara a casa para uma chegada habitual ou pontual quando os sinais de presença selecionados confirmam que a casa inteira está vazia, ou depois de um início pontual explícito quando não há fontes de presença configuradas. Configure a função no Velair: uma rotina semanal estável não exige outro blueprint nem uma ação diária. A rotina automática fica desativada por predefinição e é executada localmente no Home Assistant. Os regressos pontuais precisam de Modos de ausência e regresso guardados e da Programação automática em funcionamento; as fontes de presença são opcionais para inícios explícitos. A rotina semanal exige pelo menos uma fonte de presença.

<a id="setup"></a>
## Configuração

1. Crie os Modos desejados para ausência e presença, ou use Predefinição como destino. Os Perfis de ausência podem desligar a climatização ou utilizar programações semanais com menor exigência.
2. Abra **Pré-condicionamento**, escolha **Regresso planeado** no seletor de subsecções e adicione sinais de presença para saídas monitorizadas ou semanais. Use sensores binários, input booleans, grupos ou a zona residencial do Home Assistant (`zone.home`). Inclua sinais de qualquer pessoa que possa permanecer em casa, inclusive visitantes. O Home Assistant continua responsável por acompanhar pessoas e localizações; regras complexas ainda podem ser combinadas num auxiliar.
3. Na secção de ausência, escolha por quanto tempo a casa deve permanecer vazia e qual Modo de ausência ativar. O valor predefinido é dez minutos; o controlo compacto aceita minutos ou horas. A chegada é reconhecida imediatamente.
4. Na secção de chegada, informe o horário habitual de cada dia aplicável e selecione o Modo de destino. Dias sem horário não têm regresso automático. O Velair usa a programação do destino no horário de chegada para preparar cada zona.
5. Ative o Pré-condicionamento adaptativo para as zonas que devem começar antes. As definições existentes e a aprendizagem local de aquecimento/arrefecimento são reutilizadas.
6. Use o interruptor na barra de estado para ativar a rotina e então Guardar. O interruptor altera o rascunho; Cancelar restaura a configuração guardada. Pare qualquer automação de presença/ausência que selecione Modos para essa mesma casa, pois dois controladores entrariam em conflito.

Os dias seguem a preferência **Primeiro dia da semana** guardada nas Definições do Velair. Informe diretamente o horário de chegada de cada dia. Se sair num dia sem horário, o Velair aplica o Modo de ausência depois da confirmação, não programa preparação antecipada e restaura o destino quando deteta presença. O fuso horário do Home Assistant aparece ao lado da rotina semanal. As alterações permanecem no rascunho até serem guardadas. Cancelar e Guardar ficam à direita do rodapé da configuração.

O resumo superior agrupa três partes da rotina em contentores separados com bordas, correspondentes às secções de configuração, sem um cartão externo nem uma linha lateral partilhada. A rotina semanal mostra o Modo de ausência, o atraso de confirmação, o pré-condicionamento adaptativo e o Modo de destino num fluxo simples; o interruptor altera a configuração de ativação da rotina. O atraso é o tempo durante o qual a casa deve permanecer vazia, e não uma estimativa de preparação. A secção de presença mostra o resultado combinado e a quantidade de fontes; expanda-a para verificar cada sinal. Sinais desconhecidos impedem uma nova ausência e são diferenciados de presença confirmada. A secção de regresso rápido reúne a saída pontual e os controlos de chegada do episódio atual. As ações usam a configuração guardada; portanto, guarde ou cancele alterações de configuração pendentes antes de anunciar uma nova saída.

O formulário segue a ordem de saída e chegada: fontes de presença, atraso de ausência e Modo de ausência, depois horários semanais de chegada e Modo de destino. As fontes de presença usam a ação circular verde Adicionar do editor de blocos quando uma fonte é selecionada. Adicionar e Remover mantêm a aparência transparente quando desativados; quando ativados, apresentam uma sinalização visual ao passar o ponteiro do rato ou receber foco. A lista de fontes configuradas começa recolhida. O seu resumo mostra o total e as quantidades de sinais de presença, ausência e estado desconhecido; expanda-o para verificar ou remover fontes individuais. No telemóvel, o resumo ocupa toda a largura do seletor e da linha de Adicionar; ícones e números mantêm as contagens juntas, com rótulos acessíveis completos. Os contadores ficam alinhados à borda final do resumo. No telemóvel, a lista expandida tem a mesma largura do resumo, com Remover no fim de cada linha e mais espaço para nomes e IDs. Em computadores, as listas acompanham a largura do seletor. Expandir a lista não altera a configuração. Atrasos informados em horas são arredondados para o minuto mais próximo; o atraso equivalente aparece ao lado do controlo.

Os estados reconhecidos como presença são `on` e `home`; como ausência, `off` e `not_home`. Na zona residencial, zero pessoas significa ausência e uma contagem positiva significa presença. Qualquer sinal de presença torna a casa ocupada; ela só é considerada vazia quando todos os sinais indicam ausência. Se nenhum sinal indicar presença e algum estiver desconhecido ou indisponível, o estado de presença é desconhecido: novas ausências não podem começar. Um regresso já aceite continua programado. O painel mostra o resultado combinado e cada fonte.

Selecione sinais que representem presença: um sensor de movimento desligado não significa necessariamente que ninguém está em casa.

<a id="room-preparation"></a>
## Preparação dos ambientes

Expanda **Room preparation**, abaixo do fluxo da rotina, para ver todas as entidades de climatização geridas. A lista começa recolhida, com contagens de pré-condicionamento adaptativo, funcionamento apenas na chegada e ausência de preparação. Expandi-la não altera definições nem envia comandos de climatização. A mesma visão geral vale para regressos semanais e pontuais.

Cada linha identifica o ambiente, a origem da programação de destino e o estado da preparação. Uma entidade ausente dos Perfis do Modo de destino ainda usa a sua programação **Predefinição**; um comportamento normal explícito também usa Predefinição. Uma programação de Perfil usa o nome desse Perfil. Uma pausa do Perfil de destino, uma zona desativada ou a execução externa são identificadas separadamente, em vez de aparecerem como funcionamento apenas na chegada. Sem Pré-condicionamento adaptativo, um ambiente local ativado segue a sua programação efetiva na chegada; ele não é automaticamente excluído das mudanças de Modo.

Sem um regresso futuro, essa lista descreve o que a configuração guardada permite, e não prevê que o ambiente começará antes. Depois de um regresso ser aceite, ela determina o alvo de cada destino naquele horário de chegada e mostra os estados pendente, em preparação, alvo atingido, suspenso ou indisponível, com o motivo correspondente. A ausência de dados de temperatura ou de uma estimativa válida impede a preparação antecipada; Reforço, Ajuste manual e pausas explícitas mantêm a sua prioridade habitual. Uma saída não confirmada não pode aparecer como em preparação. **Preparing** descreve a intenção de preparação ativa do Velair, e não confirma que o equipamento recebeu um comando ou está a funcionar fisicamente. **Target reached** significa que a temperatura medida no momento está dentro da tolerância de preparação e já pode ser verdadeiro antes da saída; isso não inicia uma ausência nem ignora a confirmação.

**Planned start** é uma estimativa, não uma comprovação de comando de climatização ou de prontidão física. Os alvos aceitam aquecimento, arrefecimento e intervalos de temperatura. Regressos concluídos, cancelados e ignorados voltam a mostrar informações de configuração, em vez de horários de preparação obsoletos. O Diagnóstico continua a utilizar as definições guardadas pelo backend até que Guardar tenha sucesso, sem um lembrete adicional de preparação. Essa lista completa substitui a antiga lista de zonas limitada ao episódio.

<a id="one-off-return"></a>
## Regresso pontual

Em **One-off return**, escolha uma data e um horário futuros de chegada e selecione **Plan return**. Data e horário ficam juntos. No telemóvel, **Plan return** fica na linha seguinte, alinhado à borda direita do campo de horário; em ecrãs maiores, a ação fica ao lado dos campos. A explicação aparece abaixo dos controlos. Pode fazer isso antes de sair ou quando já estiver fora. O Velair usa as definições guardadas de Modos e presença. Com fontes de presença configuradas, ele mantém a solicitação pendente e só aplica o Modo de ausência depois de todas as fontes indicarem ausência durante o atraso de confirmação, protegendo quem permanecer em casa. Sem fontes de presença guardadas, selecionar **Plan return** confirma explicitamente a sua saída: o Modo de ausência começa imediatamente, sem atraso. Nesse caso, o Velair não deduz que a casa está vazia nem deteta o seu regresso físico; ele prepara os ambientes normalmente e ativa o destino na chegada guardada. Uma fonte configurada desconhecida/indisponível continua a exigir espera; uma entidade ausente não pode ser tratada como uma lista vazia de fontes.

A data e o horário pontuais substituem o horário semanal apenas nessa ausência. A função também funciona com a rotina automática desativada. Pode alterar ou cancelar o aviso pendente; se a saída não for confirmada antes do horário de chegada, ele expira sem mudar Modos. Se todas as fontes já indicarem ausência e não houver episódio ativo, planear o regresso inicia imediatamente o atraso de confirmação configurado; não é necessária uma nova mudança de sensor. Se uma ausência já estiver ativa, altere a data e o horário de chegada no editor do episódio existente; isso transforma o regresso numa exceção pontual sem aplicar o Modo de ausência novamente. Adiar uma chegada encerra a sua preparação anterior e restaura o comportamento atual de ausência até chegar o momento da nova preparação. Reforço e ajustes manuais continuam protegidos. O alvo do destino é determinado na data local de chegada selecionada, mesmo quando a preparação começa no dia anterior. Enviar o mesmo instante não reinicia a preparação. Chegadas passadas ou no instante atual e horários locais inexistentes por mudança de horário de verão são rejeitados; um horário repetido usa a sua primeira ocorrência futura.

Episódios concluídos, ignorados e cancelados continuam a bloquear o reinício da rotina automática até que seja detetada presença, para que uma casa vazia não inicie outra saída semanal sozinha. Pode selecionar explicitamente **Plan return** depois de qualquer episódio inativo sem esperar estar em casa. A nova solicitação usa as fontes de presença e os Modos atuais. Com fontes, ela confirma novamente a ausência pelo atraso configurado, mesmo que todos já estejam fora, sem mudar o Modo imediatamente. Sem fontes, o registo explícito ativa o Modo de ausência imediatamente. O painel lateral e o cartão do dashboard mostram um novo formulário de planeamento assim que o episódio fica inativo. Se o planeamento estiver indisponível, o formulário permanece visível com **Plan return** desativado e uma explicação das definições guardadas necessárias e do estado do agendador. Nessa situação, um regresso ativo ainda pode ser cancelado.

Depois da saída confirmada, use **Cancelar** para interromper o regresso e restaurar o Modo e os Perfis anteriores registados, ou **Alterar chegada** para atualizar a data e o horário. Durante a confirmação de ausência, cancelar mantém a seleção ativa, porque o Modo de ausência ainda não foi aplicado. Desativar a rotina automática ou editar os horários semanais não cancela um regresso manual. Alterar as suas fontes de presença ou os seus Modos invalida o aviso anterior. Seleções explícitas de Modo/Perfil cancelam regressos pendentes e ativos. Um agendador parado não executa o regresso.

A primeira linha mantém o título One-off return à esquerda e os indicadores de presença exclusivos do cartão à direita. A fase atual é um subtítulo compacto junto ao título, sem uma etiqueta ou linha separada. Durante a confirmação, o título do processo de temporização fornece a fase. O cartão do dashboard agrupa as contagens de presença no canto superior direito quando há fontes configuradas. Sem fontes, os contadores e o ícone de atraso sem uso são omitidos, e o painel lateral informa **Sem monitorização**, em vez de presença desconhecida. O ícone do atraso de confirmação aparece apenas antes da confirmação de uma ausência ativa; ele fica oculto durante Ausência/Preparação e em erros ativos com saída confirmada. O painel lateral não repete esses indicadores. Passe o ponteiro do rato para ver uma explicação breve da fase. Durante a confirmação de ausência, uma linha discreta de temporização explica que o Velair está a verificar se a casa permanece vazia. **Até** mostra o prazo de confirmação do backend no horário local do Home Assistant, incluindo a data quando for diferente de hoje. O Velair só ativa o Modo de ausência depois da confirmação se todas as fontes selecionadas ainda indicarem ausência. Trata-se de um prazo, e não de uma contagem decrescente ao vivo ou de uma saída confirmada. O mesmo processo aparece enquanto a rotina semanal confirma uma ausência antes de existir um episódio; a falta de dados de prazo não gera um horário inventado. Antes da confirmação da saída, um ícone de chegada e o rótulo **Expected arrival** identificam o regresso guardado, com rótulo acessível e dica. Essa linha fica alinhada ao título e ao texto de estado. A sua data/hora guardada aparece como uma etiqueta compacta clicável, sem lápis nem sublinhado. A linha temporal confirmada usa o mesmo ícone; apenas a data/hora guardada sublinhada e o lápis à sua esquerda formam o botão de edição. Selecione esse valor para abrir o editor de data/hora integrado. A linha de ações tem **Voltar** em azul com uma seta à esquerda e **Alterar chegada** em verde à direita. Voltar descarta as alterações de chegada não guardadas e fecha o editor sem alterar o regresso. Num painel lateral largo, o editor permanece compacto e alinhado ao ponto de chegada; a ação de alteração fica à direita abaixo dele. Ecrãs estreitos e o cartão mantêm o layout responsivo. Os campos ficam ocultos até serem solicitados. **Voltar** restaura a última chegada guardada e oculta os campos. Também remove o aviso de chegada e a proteção de navegação; alterações independentes não guardadas da configuração da rotina continuam protegidas. Reabrir o editor parte da chegada guardada. Durante uma ausência confirmada, o ponto de chegada da linha temporal é esse mesmo botão de edição, evitando duplicação. Cancelar aparece abaixo do gráfico e da legenda de preparação à esquerda, apenas enquanto o editor de chegada está fechado. Durante a edição, Cancelar fica oculto, **Alterar chegada** à direita e **Voltar** à esquerda, para descartar localmente a edição de chegada. Alterar o campo não muda o regresso planeado até que **Alterar chegada** tenha sucesso. Mudanças bem-sucedidas fecham o editor e devolvem o foco à chegada guardada. Falhas e atualizações dos sensores preservam o rascunho aberto. Um aviso de alterações não guardadas identifica a edição pendente, e navegar ou recarregar alerta antes de descartá-la. Guardar a configuração da rotina não aplica a edição de chegada. Voltar e Alterar chegada usam superfícies compactas preenchidas em azul e verde, respetivamente. As suas superfícies visíveis têm 32 pixels de altura dentro de áreas de toque de 44 pixels. O cancelamento usa uma superfície vermelha compacta com ícone/texto brancos abaixo dos dados do episódio, também com 32 pixels dentro de uma área de toque de 44 pixels; passar o rato e receber foco continuam claramente indicados. As cores de texto e ícones adaptam-se ao tema para manter a legibilidade. Ações indisponíveis usam fundo neutro e texto e ícones atenuados, com cursor de ação não permitida. Alterar chegada ganha a cor verde quando a chegada é editada. A fase permanece junto ao título. Cancelar fica à esquerda abaixo dos dados quando não há edição; Alterar chegada fica alinhado à direita abaixo do editor aberto. O painel lateral e o cartão preservam esse agrupamento no telemóvel. Plan return continua alinhado à direita no formulário de novo planeamento. Ações bem-sucedidas atualizam o episódio sem outra mensagem de confirmação de gravação.

<a id="home-assistant-actions"></a>
### Ações do Home Assistant

Automações, scripts e dashboards podem anunciar uma saída utilizando `velair.start_planned_return`. Tanto `return_date` (`YYYY-MM-DD`) quanto `return_time` (`HH:MM` em formato de 24 horas) são obrigatórios. Juntos, devem identificar uma chegada futura no fuso horário do Home Assistant. O seletor nativo de horário pode enviar `HH:MM:00`; segundos iguais a zero são aceites e normalizados para precisão de minutos. Escolha uma data futura para o exemplo a seguir:

```yaml
action: velair.start_planned_return
data:
  return_date: "2026-10-09"
  return_time: "19:25"
```

Isso usa as definições guardadas de presença e Modos, com o mesmo comportamento de confirmação, preparação e ajustes prioritários de **Plan return**. Funciona com a rotina semanal desativada e atualiza a data e o horário de chegada se uma ausência já estiver ativa, sem aplicar o Modo de ausência novamente. Os Modos guardados e a Programação automática precisam de estar operacionais. As fontes são opcionais para regressos pontuais: uma lista guardada vazia aplica o Modo de ausência imediatamente; fontes configuradas mantêm as regras normais de confirmação. Uma chegada no passado ou no instante atual é rejeitada sem substituir o regresso anterior. Um horário já passado ou inexistente por mudança de horário de verão é rejeitado; numa hora repetida, o Velair escolhe a primeira ocorrência que ainda está no futuro.

Cancelar um regresso pendente ou ativo:

```yaml
action: velair.cancel_planned_return
data: {}
```

A mesma ação de cancelamento também fecha o aviso de um episódio inativo. Ela interrompe a preparação e o regresso programado, mantendo o bloqueio de reinício automático após o cancelamento. Depois da saída confirmada, restaura o Modo e a seleção exata de Perfis guardados antes do início do episódio. Durante a confirmação de ausência, mantém a seleção atual. Um novo **Plan return** explícito pode substituir esse episódio inativo. O painel lateral e o cartão usam essa mesma ação de cancelamento.

<a id="cancelling-a-return-examples"></a>
## Cancelamento de um regresso: exemplos

O atraso de confirmação de ausência ocorre **antes** de aplicar o Modo de ausência. Cancelar durante esse atraso não exige restauração: o Modo e os Perfis anteriores ainda estão ativos. Cancelar depois da saída confirmada restaura a seleção registada no início daquele episódio, em vez de ativar imediatamente o Modo de regresso configurado.

Nos exemplos a seguir, considere:

- **Comfort** está ativo, selecionando os Perfis **Living room comfort** e **Bedroom comfort**.
- O Modo de ausência é **Away**, o Modo de regresso é **Evening** e a chegada está planeada para 18:00.
- As fontes indicam uma casa vazia às 13:00 e o atraso de confirmação é de cinco minutos.

<a id="cancel-before-confirmation-finishes"></a>
### Cancelar antes de terminar a confirmação

| Horário | O que acontece | Modo e Perfis selecionados |
| --- | --- | --- |
| 13:00 | Inicie um regresso. O Velair verifica se a casa permanece vazia até 13:05. | Comfort e os seus dois Perfis continuam ativos. |
| 13:02 | Selecione **Cancelar** enquanto a ausência ainda está a ser confirmada. | Comfort e os seus dois Perfis continuam ativos; Away nunca foi aplicado. |

A chegada planeada para 18:00 é removida. Não haverá ativação posterior de Away ou Evening por esse episódio cancelado.

<a id="cancel-after-departure-is-confirmed"></a>
### Cancelar depois da saída confirmada

Este é um episódio separado, com a mesma configuração inicial:

| Horário | O que acontece | Modo e Perfis selecionados |
| --- | --- | --- |
| 13:00 | Inicie um regresso e a confirmação. | Comfort e os seus dois Perfis continuam ativos. |
| 13:05 | Todas as fontes configuradas ainda indicam ausência. | O Velair aplica Away e os seus Perfis. |
| 13:10 | Selecione **Cancelar**. | O Velair restaura Comfort e os dois Perfis originais e então remove a chegada. |

O resultado é Comfort, **não** o Modo de regresso Evening configurado. Se a preparação para Evening já tiver começado, o cancelamento também a remove e restaura a seleção original. Reforços ativos, Ajustes manuais e pausas independentes mantêm a sua prioridade.

<a id="start-without-occupancy-sensors"></a>
### Iniciar sem sensores de presença

Sem fontes de presença configuradas, **Plan return** aplica Away imediatamente. Não há etapa de confirmação de cinco minutos. Cancelar esse regresso ativo restaura Comfort e os dois Perfis registados imediatamente antes de iniciá-lo. Um sensor configurado desconhecido ou indisponível não equivale à ausência de sensores: continua a impedir a confirmação de uma nova ausência.

<a id="default-arrival-edits-and-restart"></a>
### Predefinição, edições de chegada e reinício

Se o episódio começar em **Predefinição**, sem Perfis ativos, cancelar depois da saída confirmada regressa a Predefinição sem Perfis ativos. Uma combinação manual de Perfis é restaurada na ordem original.

Alterar a chegada de 18:00 para 19:00 ou reiniciar o Home Assistant não substitui a seleção anterior registada. Cancelar ainda restaura a seleção anterior do início desse episódio. Não recupera temperaturas ou estados HVAC anteriores do equipamento: a seleção restaurada usa as suas programações atuais, sujeitas aos ajustes prioritários existentes.

<a id="choose-another-mode-instead-of-cancelling"></a>
### Escolher outro Modo em vez de cancelar

Se selecionar explicitamente **Eco** enquanto um regresso estiver ativo, essa seleção remove o regresso e mantém Eco. O Velair não restaura Comfort depois, quando a presença mudar ou o aviso final for fechado. Isso preserva a sua escolha explícita; é uma ação diferente do botão **Cancelar** do episódio.

<a id="distinguish-the-controls"></a>
### Diferenciar os controlos

- **Cancelar** nos controlos de regresso remove o episódio como descrito acima.
- **Voltar** no editor de chegada descarta edições de chegada não aplicadas; o regresso guardado continua.
- O **X** genérico do painel de ações do cartão de climatização fecha o painel sem cancelar o regresso.
- **Cancelar**, ao lado de **Guardar** na configuração da rotina, descarta definições não guardadas, em vez de cancelar um episódio.

Para episódios antigos sem seleção anterior registada, ou se os Perfis guardados não forem mais válidos, consulte [os limites de restauração](#restoration-limits).

<a id="daily-behavior"></a>
## Funcionamento diário

Por exemplo, configure de segunda a sexta-feira às 18:15. Depois de a casa permanecer vazia pelo atraso de confirmação, o Velair ativa o Modo de ausência e determina a programação de presença às 18:15. Cada zona usa a sua própria estimativa de preparação. Uma zona que precisa de uma hora pode começar às 17:15, enquanto uma mais rápida começa depois.

O alvo é o bloco efetivo **na chegada**, incluindo a continuidade semanal. Se a programação de presença pedir 17 graus antes de 18:00 e 21 graus depois, um regresso às 18:15 prepara 21 graus mesmo que a preparação comece antes de 18:00. A programação semanal não é editada nem preenchida com blocos temporários.

No horário esperado, o Velair seleciona o destino e continua a sua programação normal. Um sinal antecipado de presença seleciona o destino imediatamente. Uma chegada atrasada não muda a casa de volta para o Modo de ausência. Pausas, Reforço, Ajuste manual, zonas desativadas e um agendador parado mantêm as suas restrições existentes de aplicação. A preparação aceita aquecimento, arrefecimento e intervalos nativos de temperatura. O seu objetivo é aproximar o ambiente do alvo; não pode garantir uma temperatura exata.

<a id="preparation-and-room-assist"></a>
### Preparação e Room Assist

O Modo de destino define a configuração necessária na chegada. Cada zona começa à sua própria hora estimado; o Modo inteiro é selecionado na chegada, e não quando a primeira zona começa a preparar-se. Zonas que ainda não começaram continuam a seguir a programação de ausência.

Depois de uma zona começar a preparar-se, o seu alvo temporário de chegada tem prioridade sobre blocos posteriores da programação de ausência. Por exemplo, em uma ausência de dez horas com regresso às 19:25:

| Horário | Alvo deste ambiente |
|---|---|
| 09:25, ausência confirmada | A programação de ausência pede 16 graus |
| 16:25, esta zona começa a preparar-se | A programação de chegada pede 21 graus |
| 17:00, um bloco de ausência pede 18 graus | A preparação continua a procurar atingir 21 graus |
| 19:25, chegada planeada | O Modo de destino começa a sua programação normal |

Um bloco da programação de ausência não cancela a preparação de regresso da zona. Essa prioridade também vale para arrefecimento e intervalos de temperatura.

Se o Room Assist estiver ativado, seguirá o mesmo alvo temporário de chegada. Neste exemplo, ajuda a divisão a chegar a 21 graus, em vez de corrigi-lo de volta para o alvo de ausência de 16 graus. O alvo enviado à entidade de climatização pode ser diferente de 21 graus porque o Room Assist compensa diferenças entre o sensor do ambiente e a leitura da própria climatização. Correções em fila são revalidadas em relação ao alvo atual antes do envio.

Uma mudança direta de temperatura feita pelo utilizador segue a política de ajustes externos da zona. **Manter automático** reaplica o alvo que tem prioridade no momento, que durante a preparação é o alvo de chegada. Um **Ajuste manual** suspende a aplicação automática e o Room Assist da zona enquanto estiver ativo. Reforço e pausas explícitas da zona mantêm a sua prioridade existente; eles não cancelam o regresso da casa inteira. Consulte [Room Assist](room-assist.pt-pt.md) e [Ajuste manual](manual-control.pt-pt.md).

<a id="exceptions-and-restarts"></a>
## Exceções e reinícios

A subsecção Regresso planeado reúne o regresso aceite, a preparação de cada zona e a rotina guardada. Abra-a diretamente em `/velair/preconditioning/planned-return`; `/velair/preconditioning/preconditioning` abre o Pré-condicionamento adaptativo, que é a subsecção predefinida do separador. Ajustar o horário de chegada altera apenas essa ausência, e não a semana guardada. **Cancelar** remove a preparação e a mudança automática para o destino. Antes da confirmação de ausência, mantém a seleção ativa; depois da confirmação, restaura o Modo e os Perfis registados antes do início desse episódio.

Uma seleção explícita de Modo ou Perfil cancela o regresso automático do episódio. Um sinal posterior de presença ou um reinício não deve substituir essa seleção. O Velair mantém o registo de ausências concluídas ou canceladas até que a casa volte a ficar ocupada.

Essa seleção explícita também cancela a preparação já em curso para o episódio, mesmo quando a configuração do Modo ou Perfil selecionado já está ativa. Isso difere de uma mudança de temperatura programada dentro do Modo de ausência, que não cancela a preparação. Nem o painel lateral nem o cartão incluem os botões Skip, I'm home ou Close; os controlos partilhados são Cancelar e Alterar chegada. O backend mantém operações separadas de ignorar e chegar para consumidores da API; os seus contratos estão documentados na [API para programadores](../developer/api.md). A ação `velair.cancel_planned_return` cancela um regresso pendente ou ativo confirmado, ou fecha o aviso de um episódio inativo. O cancelamento interrompe a preparação e o regresso programado e impede o reinício automático dessa ausência. Para uma saída confirmada, restaura a seleção anterior guardada de Modo/Perfis; para uma confirmação pendente ou aviso final, não altera a seleção. Um novo **Plan return** explícito ainda pode iniciar outro episódio.

<a id="restoration-limits"></a>
### Limites de restauração

Para um regresso pontual, o Velair regista a seleção quando escolhe **Plan return**. Para a rotina semanal, regista a seleção quando a ausência é confirmada, imediatamente antes de aplicar o Modo de ausência.

A seleção anterior é preservada após edições de chegada e reinícios do Home Assistant. Isso restaura a seleção de Perfis, e não temperaturas ou estados anteriores do equipamento; os Perfis restaurados usam as suas programações atuais e as prioridades dos ajustes existentes. Se o Modo anterior tiver sido removido ou alterado, os Perfis originais podem ser restaurados como seleção manual. Se um Perfil guardado estiver ausente, inválido ou em conflito com outro Perfil guardado, o cancelamento ainda tem sucesso, mas mantém a seleção atual e informa que a restauração ficou indisponível. Episódios criados antes da existência desses metadados de restauração mantêm a seleção atual, pois o Velair não consegue deduzir a anterior.

Após um reinício, avisos pontuais pendentes e ausências confirmadas são recuperados, em vez de começar novamente. Uma ausência não confirmada reinicia o seu atraso de confirmação. Um sensor que informa presença encerra corretamente a ausência anterior mesmo quando a chegada ocorreu com o Home Assistant offline.

<a id="limits-and-backups"></a>
## Limites e cópias de segurança

- Há suporte a uma rotina para a casa inteira. As chegadas semanais continuam a ser no mesmo dia: sair depois do horário de hoje, ou num dia sem horário, ativa o Modo de ausência sem programar o regresso de amanhã. Regressos pontuais podem utilizar qualquer data futura.
- Calendários, turnos rotativos e rotinas automáticas com chegada no dia seguinte não são interpretados.
- Sem pré-condicionamento ativado, leitura de temperatura ou alvo térmico, o destino ainda muda na chegada, mas essa zona não se prepara antes.
- Transições que afetam zonas com execução externa são rejeitadas antes da mudança de Modo; o Velair não retira o controlo local ao respetivo controlador.
- O blueprint genérico de presença/ausência existente não muda e continua útil em outras instalações e ações.
- Cópias de segurança portáteis incluem a configuração da rotina, e não episódios de presença ou temporizadores. Rotinas importadas ficam desativadas até serem ativadas explicitamente.

Consulte [Perfis climáticos](climate-profiles.pt-pt.md), [Pré-condicionamento adaptativo](adaptive-preconditioning.pt-pt.md) e [Ajuste manual](manual-control.pt-pt.md) para os controlos subjacentes.

<a id="overview-and-diagnostics"></a>
## Visão geral e Diagnóstico

A Visão geral exibe um resumo compacto da casa durante um episódio semanal ou pontual, ou quando há uma ocorrência que exige atenção. Ele identifica a origem e o estado e mostra o prazo de confirmação ou a chegada esperada, conforme o caso. Selecione o resumo para abrir os detalhes completos desta função em Pré-condicionamento.

Um sinal violeta na climatização identifica o controlo atual do Regresso planeado. O estado operacional existente continua visível: esse sinal explica a origem, em vez de substituir os estados de aquecimento, arrefecimento, pausa, programação ou pré-condicionamento. Estimativas de início futuro são identificadas separadamente. Controlo manual, Reforço e pausas independentes mantêm a sua prioridade. A identificação de ausência cobre os Perfis de ausência efetivos do episódio, ou Predefinição quando selecionado explicitamente como Modo de ausência; não cobre uma entidade não associada que apenas mantenha a sua programação Predefinição. A preparação pode legitimamente utilizar a programação Predefinição do destino quando o backend seleciona o alvo de chegada dessa entidade.

O Diagnóstico mostra o estado atual da casa, a origem do controlo e o estado de preparação de cada entidade, incluindo por que a preparação está suspensa ou indisponível. A categoria de histórico Regresso planeado regista transições aceites relevantes, sem entradas duplicadas ao atualizar o painel. As suas entradas partilham o limite existente de 100 eventos durante a execução e são apagadas no reinício. As preferências de categorias guardadas são mantidas. Relatórios descarregados incluem essas informações e removem identificadores operacionais de Modos e Perfis. A intenção de controlo e o sucesso da entrega continuam a ser informações distintas.

<a id="dashboard-card"></a>
## Cartão do dashboard

O cartão Lovelace opcional mostra os controlos compactos de One-off return. O seu cabeçalho inclui as quantidades de fontes que indicam presença, ausência e estado desconhecido e o atraso guardado de confirmação de ausência; o resumo semanal, a lista de fontes e os detalhes de preparação dos ambientes continuam no painel lateral. Configure primeiro a casa no painel lateral.

```yaml
type: custom:velair-card
view: planned-return
```

Selecione **Regresso planeado** no editor visual do cartão. O cartão atua no mesmo episódio persistido que o painel lateral e os outros cartões. Aceita datas e horários futuros de regresso. Episódios ativos oferecem **Cancelar** e **Alterar chegada**; Cancelar interrompe o regresso aceite e restaura a seleção anterior registada de Modo/Perfis depois da saída confirmada; durante a confirmação, mantém a seleção. Após a conclusão, o cancelamento ou qualquer outro episódio inativo, o cartão mostra um novo formulário de planeamento sem esperar uma mudança de presença. Configuração guardada inválida ou agendador parado desativa o planeamento e as alterações, mas um regresso ativo ainda pode ser cancelado. O painel lateral usa os mesmos botões e ciclo de vida do episódio; a configuração semanal e o seu interruptor de ativação permanecem ali. Apenas os indicadores finais de fontes/atraso são exclusivos do cartão; painel lateral e cartão partilham o subtítulo de fase junto ao título, a edição de chegada e a linha temporal. Durante a confirmação, o bloco do processo de temporização substitui o subtítulo. Essa visão da casa não tem filtro de termóstato.

O cartão **Termóstato: estado e controlo** também pode oferecer **One-off return** como ação rápida fornecida pelo Velair, junto de Reforço e Pausa. Ative-a no editor de ações do cartão, escolha se quer mostrar o seu nome ou coloque-a em Mais. O editor agrupa Reforço, Pausa e One-off return primeiro, mesmo quando desativados. A ação abre os mesmos controlos compactos no painel inferior, com um título simples como os de Reforço e Pausa. Os três formulários usam a altura compacta existente de 38 pixels nos campos. Uma saída ativa mostra a sua linha temporal e o seu editor de chegada existentes. O X do painel fecha os controlos sem cancelar a saída. Fechar com alterações de chegada não guardadas pergunta se pretende descartá-las; fechar fica bloqueado enquanto uma ação é executada. Essa ação sempre controla a casa inteira, independentemente da entidade de climatização selecionada. Definições existentes do cartão mantêm a ação oculta. Novos cartões criados pelo seletor de cartões do Home Assistant a incluem ativada; definições YAML precisam de a ativar com `type: planned-return` em `climate_actions`.

Durante **Away** e **Preparing for arrival**, o cartão mostra a saída confirmada e a chegada guardada com os nomes dos Modos de ausência e regresso do episódio. Um ponto de horário atual, identificado pela dica **Agora**, avança conforme o tempo UTC decorrido, inclusive durante mudanças de relógio, e permanece dentro da barra. Os pontos inicial e final incluem datas quando as suas datas no calendário do Home Assistant diferem. Edições de chegada não guardadas não alteram essa barra. Estados pendentes e finais, ou episódios sem horário de saída confirmada, mantêm um estado estático sem linha temporal. O painel lateral e o cartão atualizam os seus relógios locais uma vez por minuto apenas enquanto visíveis e ativos, e imediatamente ao voltar a ficar visíveis; essa atualização de exibição nunca solicita dados do backend.

Ícones de saída e chegada ficam nas extremidades da linha, com dicas nativas e rótulos acessíveis. Os horários guardados ficam próximos abaixo dos seus ícones; apenas o valor de chegada é editável. Rótulos simples de Modo abaixo dos horários identificam as definições de ausência e regresso com um ícone genérico de Modo. Nomes longos e datas de dias diferentes quebram linha dentro do painel. Cada extremidade agrupa o seu horário e o seu rótulo de Modo, logo abaixo. Campos de edição de data/hora usam o mesmo tamanho compacto dos outros formulários de ação; não aparece um botão de fechar ao lado do horário guardado. A posição de preparação é uma pequena marca na linha, com relógio e legenda explicativa abaixo dos horários. O trecho decorrido da linha, as marcas nas extremidades e o indicador Agora mostram a passagem do tempo, e não o progresso térmico. Quando não há estimativa válida para o primeiro ambiente, um pequeno botão de informação ao lado do título One-off return explica a previsão atual da chegada guardada: todos os ambientes afetados podem estar suspensos, já no alvo, excluídos ou configurados para agir apenas na chegada. Passe o ponteiro do rato ou dê foco no computador, ou toque no telemóvel. Informações ausentes ou mistas permanecem inconclusivas e não significam que a preparação antecipada está desativada. Escape ou uma interação fora fecha a ajuda.

Quando o backend tem uma estimativa adaptativa válida para a chegada guardada, a linha temporal adiciona um relógio e horário **Preparação estimada**. Ele identifica a primeira estimativa entre os ambientes elegíveis; os demais podem começar depois. A legenda suavemente colorida pode ser expandida e começa recolhida. Selecione-a para ver cada ambiente elegível e o seu início estimado, em ordem de horário. A lista usa nomes e ícones dos ambientes do Home Assistant e horário local, incluindo datas quando necessário. Ambientes suspensos, já no alvo ou que atuam apenas na chegada são excluídos. Abrir a lista não solicita dados do backend; atualizações normais preservam o seu estado, enquanto uma mudança na chegada guardada ou no episódio a fecha. Durante a edição da chegada, a legenda expansível e o controlo informativo alternativo ficam ocultos; a linha mantém a sua estimativa guardada. Voltar restaura o estado de expansão do mesmo episódio. Passe o ponteiro do rato sobre o cabeçalho para ver a explicação. Trata-se de uma estimativa de planeamento, e não de uma comprovação de que um equipamento começou a funcionar nem de uma medida de progresso térmico. Ambientes suspensos, já no alvo, indisponíveis ou que atuam apenas na chegada não fornecem essa marca. Sua posição permanece dentro da barra de saída/chegada, enquanto o rótulo mantém a estimativa real, inclusive uma data anterior.
