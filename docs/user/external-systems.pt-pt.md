<a id="external-schedule-execution"></a>
# Execução externa de programações
<!-- velair-docs:start -->
Traduções: [Original em inglês](external-systems.md) · [Español](external-systems.es.md) · [Français](external-systems.fr.md) · [Deutsch](external-systems.de.md) · [Italiano](external-systems.it.md) · [Nederlands](external-systems.nl.md) · [Polski](external-systems.pl.md) · [Português (Brasil)](external-systems.pt-br.md) · [Português (Portugal)](external-systems.pt-pt.md) · [Русский](external-systems.ru.md) · [Estado das traduções](../translation-status.md)

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

Normalmente, o Velair é responsável tanto pelo armazenamento das programações como pela execução dos comandos de climatização. Para equipamentos compatíveis, **Definições → Sistemas externos** permite publicar a programação semanal efetiva num controlador que a executa de forma independente.

A secção aparece quando o Velair deteta uma integração compatível do Home Assistant com um equipamento gerido compatível, ou quando alguma zona já está sob controlo externo. Antes de ativar a execução externa, crie e guarde uma programação efetiva com pelo menos um bloco de temperatura para a zona. Se não houver nada para publicar, o Velair mantém o controlo local e explica nas Definições o requisito em falta. Ao escolher o sistema externo de uma zona, o Velair guarda a transferência de controlo antes de enviar a semana completa. Uma falha no envio não restaura a execução local: a zona permanece externa e mostra o erro de publicação, impedindo que dois agendadores concorram. Após uma chamada de serviço bem-sucedida no Home Assistant, o Velair indica que a programação foi publicada. Isto significa que a integração externa aceitou o pedido; não confirma que o controlador físico a aplicou.

A execução externa limita-se às programações. O Velair não envia nenhuma ação de climatização a uma zona externa, incluindo a aplicação no arranque ou da programação atual, Reforço, pausa e retoma, Ajuste manual, Room Assist ou pré-condicionamento adaptativo. Os Perfis e Modos servem apenas para selecionar a programação: `normal` publica a semana predefinida da zona e `schedule` publica a semana do Perfil. O comportamento de Pausa não está disponível para zonas externas. Selecionar a programação predefinida, um Perfil ou um Modo, ou editar um Perfil ativo, publica a nova semana efetiva completa depois de guardar a seleção. Uma falha de publicação não desfaz a seleção global de Perfil ou Modo e não afeta as zonas locais.

Selecionar novamente a programação predefinida, um Perfil ou um Modo também inicia uma nova publicação quando o estado atual de execução é `failed` ou ainda não houve uma publicação bem-sucedida. O Velair não repete a tentativa automaticamente: essa publicação ocorre apenas devido à seleção explícita.

<a id="evohome-via-ramses_cc"></a>
## Evohome através de ramses_cc

O primeiro sistema compatível usa o serviço `ramses_cc.set_zone_schedule` do Home Assistant. O Velair não tem dependência Python de `ramses_cc` e comunica apenas através de serviços do Home Assistant.

As Definições e o editor de Perfis obtêm estas condições a partir das capacidades do controlador e apresentam-nas uma única vez no respetivo painel, mesmo quando várias zonas o utilizam. Os detalhes do controlador ficam recolhidos por predefinição e podem ser expandidos para consultar os limites.

Limites atuais:

- programações de aquecimento com uma temperatura-alvo única por ponto de mudança;
- exatamente sete dias da semana, preservando a continuidade semanal do Velair;
- sem blocos de desligamento, intervalos de temperatura, modos de arrefecimento ou opções de climatização;
- no máximo seis pontos de mudança por dia na programação enviada;
- quando o primeiro bloco começa depois de `00:00`, o Velair insere um ponto à meia-noite para manter a continuidade; esta mudança implícita conta para o máximo diário, deixando espaço para cinco blocos editáveis nesse dia;
- horários na grelha de 5 minutos do controlador;
- temperaturas convertidas para Celsius nos dados enviados ao controlador.

Nas zonas com execução externa, os editores de dia das programações predefinidas e de Perfil mostram a utilização atual das capacidades do controlador imediatamente acima dos blocos. A primeira linha indica os pontos de mudança utilizados e o máximo; a segunda distingue os blocos editáveis do ponto implícito de continuidade à meia-noite. O indicador muda de aparência ao atingir o limite e quando o rascunho o ultrapassa. Estes dados são derivados das capacidades declaradas pelo controlador selecionado; a validação definitiva da publicação continua no backend.

A **Visão geral** mantém as informações normais sobre a programação ativa e o próximo evento de uma zona externa. Um indicador compacto **Externo** identifica o controlador e usa um ícone para os estados de publicação, aceitação, falha ou indisponibilidade. O botão de informação explica que o controlador executa a linha temporal planeada e que o Velair não envia ações de climatização à zona. O estado do agendador também apresenta um aviso informativo quando alguma zona visível utiliza execução externa.

A deteção requer o serviço de definição de programação, uma entrada de configuração de `ramses_cc` carregada e uma entidade `climate` gerida que declare suporte a aquecimento e temperatura-alvo única. Os metadados públicos de entidades do Home Assistant não distinguem todas as zonas Evohome das restantes entidades de climatização de `ramses_cc`. Assim, a chamada de serviço é a verificação final de compatibilidade, e um erro permanece visível como falha de publicação.

Este caminho de integração conta com testes automatizados de serviço. Testes reais numa instalação Evohome com `ramses_cc` também confirmaram a publicação e a retenção pelo controlador das programações semanais testadas. O feedback de mais instalações e combinações de programação continua a ser útil.

A publicação tem apenas três estados durante a execução: **publishing**, **published** e **failed**. Antes da primeira publicação na sessão atual do Home Assistant, não há estado de publicação. Este estado não é persistido e é independente da disponibilidade atual do fornecedor.

O Velair não chama `get_zone_schedule`, não adiciona atrasos, não repete tentativas automaticamente e não faz consultas periódicas. Estes mecanismos continuariam sem permitir afirmar, de forma independente do fornecedor, o que o equipamento físico está a executar.
