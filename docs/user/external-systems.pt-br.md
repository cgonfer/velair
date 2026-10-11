<a id="external-schedule-execution"></a>
# Execução externa de programações
<!-- velair-docs:start -->
Traduções: [Original em inglês](external-systems.md) · [Español](external-systems.es.md) · [Français](external-systems.fr.md) · [Deutsch](external-systems.de.md) · [Italiano](external-systems.it.md) · [Nederlands](external-systems.nl.md) · [Polski](external-systems.pl.md) · [Português (Brasil)](external-systems.pt-br.md) · [Português (Portugal)](external-systems.pt-pt.md) · [Русский](external-systems.ru.md) · [Status das traduções](../translation-status.md)

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

Normalmente, o Velair é responsável tanto pelo armazenamento das programações quanto pela execução dos comandos de climatização. Para equipamentos compatíveis, **Configurações → Sistemas externos** permite publicar a programação semanal efetiva em um controlador que a executa de forma independente.

A seção aparece quando o Velair detecta uma integração compatível do Home Assistant com um equipamento gerenciado compatível, ou quando alguma zona já está sob controle externo. Antes de ativar a execução externa, crie e salve uma programação efetiva com pelo menos um bloco de temperatura para a zona. Se não houver nada para publicar, o Velair mantém o controle local e explica nas Configurações o requisito que falta. Ao escolher o sistema externo de uma zona, o Velair salva a transferência de controle antes de enviar a semana completa. Uma falha no envio não restaura a execução local: a zona permanece externa e mostra o erro de publicação, impedindo que dois agendadores concorram. Após uma chamada de serviço bem-sucedida no Home Assistant, o Velair informa que a programação foi publicada. Isso significa que a integração externa aceitou a solicitação; não confirma que o controlador físico a aplicou.

A execução externa se limita às programações. O Velair não envia nenhuma ação de climatização a uma zona externa, incluindo aplicação na inicialização ou da programação atual, Reforço, pausa e retomada, Ajuste manual, Room Assist ou pré-condicionamento adaptativo. Perfis e Modos servem apenas para selecionar a programação: `normal` publica a semana padrão da zona e `schedule` publica a semana do Perfil. O comportamento de Pausa não está disponível para zonas externas. Selecionar a programação padrão, um Perfil ou um Modo, ou editar um Perfil ativo, publica a nova semana efetiva completa depois que a seleção é salva. Uma falha de publicação não desfaz a seleção global de Perfil ou Modo e não afeta as zonas locais.

Selecionar novamente a programação padrão, um Perfil ou um Modo também inicia uma nova publicação quando o estado atual de execução é `failed` ou ainda não houve uma publicação bem-sucedida. O Velair não repete a tentativa automaticamente: essa publicação ocorre somente devido à seleção explícita.

<a id="evohome-via-ramses_cc"></a>
## Evohome por meio de ramses_cc

O primeiro sistema compatível usa o serviço `ramses_cc.set_zone_schedule` do Home Assistant. O Velair não tem dependência Python de `ramses_cc` e se comunica apenas por serviços do Home Assistant.

As Configurações e o editor de Perfis obtêm essas condições a partir das capacidades do controlador e as exibem uma única vez no seu painel, mesmo quando várias zonas o utilizam. Os detalhes do controlador ficam recolhidos por padrão e podem ser expandidos para consultar os limites.

Limites atuais:

- programações de aquecimento com uma temperatura-alvo única por ponto de mudança;
- exatamente sete dias da semana, preservando a continuidade semanal do Velair;
- sem blocos de desligamento, faixas de temperatura, modos de resfriamento ou opções de climatização;
- no máximo seis pontos de mudança por dia na programação enviada;
- quando o primeiro bloco começa depois de `00:00`, o Velair insere um ponto à meia-noite para manter a continuidade; essa mudança implícita conta no máximo diário, deixando espaço para cinco blocos editáveis naquele dia;
- horários na grade de 5 minutos do controlador;
- temperaturas convertidas para Celsius nos dados enviados ao controlador.

Nas zonas com execução externa, os editores de dia das programações padrão e de Perfil mostram o uso atual das capacidades do controlador logo acima dos blocos. A primeira linha informa os pontos de mudança usados e o máximo; a segunda distingue os blocos editáveis do ponto implícito de continuidade à meia-noite. O indicador muda de aparência ao atingir o limite e quando o rascunho o ultrapassa. Esses dados são derivados das capacidades declaradas pelo controlador selecionado; a validação definitiva da publicação continua no backend.

A **Visão geral** mantém as informações normais sobre a programação ativa e o próximo evento de uma zona externa. Um indicador compacto **Externo** identifica o controlador e usa um ícone para os estados de publicação, aceitação, falha ou indisponibilidade. O botão de informação explica que o controlador executa a linha do tempo planejada e que o Velair não envia ações de climatização à zona. O estado do agendador também mostra um aviso informativo quando alguma zona visível utiliza execução externa.

A detecção requer o serviço de definição de programação, uma entrada de configuração de `ramses_cc` carregada e uma entidade `climate` gerenciada que declare suporte a aquecimento e temperatura-alvo única. Os metadados públicos de entidades do Home Assistant não distinguem todas as zonas Evohome das demais entidades de climatização de `ramses_cc`. Assim, a chamada de serviço é a verificação final de compatibilidade, e um erro permanece visível como falha de publicação.

Esse caminho de integração conta com testes automatizados de serviço. Testes reais em uma instalação Evohome com `ramses_cc` também confirmaram a publicação e a retenção pelo controlador das programações semanais testadas. O feedback de mais instalações e combinações de programação continua sendo útil.

A publicação tem apenas três estados durante a execução: **publishing**, **published** e **failed**. Antes da primeira publicação na sessão atual do Home Assistant, não há estado de publicação. Esse estado não é persistido e independe da disponibilidade atual do provedor.

O Velair não chama `get_zone_schedule`, não adiciona atrasos, não repete tentativas automaticamente e não faz consultas periódicas. Esses mecanismos ainda não permitiriam afirmar, de forma independente do fornecedor, o que o equipamento físico está executando.
