<a id="resilient-climate-delivery"></a>
# Envio resiliente de comandos de climatização
<!-- velair-docs:start -->
Traduções: [Original em inglês](resilient-climate-delivery.md) · [Español](resilient-climate-delivery.es.md) · [Français](resilient-climate-delivery.fr.md) · [Deutsch](resilient-climate-delivery.de.md) · [Italiano](resilient-climate-delivery.it.md) · [Nederlands](resilient-climate-delivery.nl.md) · [Polski](resilient-climate-delivery.pl.md) · [Português (Brasil)](resilient-climate-delivery.pt-br.md) · [Português (Portugal)](resilient-climate-delivery.pt-pt.md) · [Русский](resilient-climate-delivery.ru.md) · [Estado das traduções](../translation-status.md)

<details>
<summary>Estado desta tradução</summary>

| Informação | Estado |
| --- | --- |
| Versão de referência | 1.9.0-beta.10 |
| Última sincronização | 2026-11-04 |
| Revisão linguística | Tradução assistida por IA |
| Em relação ao original | Sincronizada com o original em inglês. |

</details>

---
<!-- velair-docs:end -->

O Velair preserva a intenção de controlo do agendador quando um termóstato gerido está temporariamente sem ligação.

Se uma entidade ficar `unknown` ou `unavailable`, o Velair espera que o Home Assistant indique que está novamente disponível. Este comportamento responde a alterações de estado; o Velair não consulta o dispositivo periodicamente. Quando a ligação é restabelecida, verifica o que deve estar ativo *agora*, em vez de repetir o comando que estava em vigor antes da interrupção.

Por exemplo, um Perfil de ausência pode ter solicitado 17 °C enquanto o termóstato estava indisponível. Se o modo de presença for selecionado antes de a ligação ser restabelecida, o Velair determina e envia a temperatura atual desse modo, não os dados antigos de 17 °C. A mesma regra aplica-se a Modos, Reforço, Pausa, Room Assist e preparação antecipada pelo pré-condicionamento adaptativo.

Quando o Home Assistant rejeita uma chamada de climatização, ou a aceita mas o equipamento continua a comunicar um alvo diferente, o Velair faz, no máximo, duas tentativas adicionais nesse episódio de envio. A primeira nova tentativa aguarda cerca de 2 segundos e a segunda, mais cerca de 10 segundos. Após a última tentativa aceite, o Velair concede 5 segundos para chegar a comunicação do alvo. Uma comunicação correspondente pode concluir a confirmação mais cedo; os equipamentos que comunicam o valor solicitado não precisam de nova tentativa.

A recuperação é independente para cada zona gerida. Se vários equipamentos separados mudarem de bloco ao mesmo tempo, apenas aquele cujo alvo permanecer diferente receberá uma nova tentativa. Os restantes equipamentos não são atrasados nem recebem novamente os seus comandos. Estas verificações utilizam os estados comunicados pelo Home Assistant e os listeners existentes de alteração de estado, sem leituras periódicas do dispositivo.

Antes de tentar novamente, o Velair verifica de novo a intenção atual, incluindo qualquer novo bloco, Reforço ou pausa. Uma intenção mais recente, a paragem do Velair ou a desativação da integração cancela o trabalho pendente obsoleto desse equipamento. O Diagnóstico mostra se a confirmação está pendente, concluída, recuperada após uma nova tentativa ou ainda não confirmada. Uma falha silenciosa recuperada também permanece no histórico limitado de envio.

Uma transição real de indisponível para disponível conserva a recuperação de ligação. Se já existir uma confirmação ou recuperação pendente, são mantidos o prazo original e o limite de tentativas; uma comunicação correspondente pode concluir a confirmação sem outro comando. Caso contrário, o restabelecimento da ligação inicia um novo episódio de envio para o alvo atual. As comunicações normais de temperatura, humidade ou alvo não reiniciam um limite de tentativas esgotado. Uma comunicação tardia que corresponda ao alvo solicitado elimina a divergência sem enviar outro comando.

Os ajustes manuais de temperatura são executados uma única vez. O Velair não volta a aplicar uma temperatura manual antiga quando o equipamento restabelece a ligação mais tarde.

Um evento do Velair que indica uma aplicação bem-sucedida significa que o Home Assistant aceitou toda a sequência de chamadas de climatização, incluindo o modo solicitado e as opções compatíveis. Não confirma que o equipamento físico atingiu a temperatura. Utilize o estado da entidade de climatização e o diagnóstico da integração do dispositivo para observar o seu funcionamento real.

Este comportamento funciona com aquecimento, arrefecimento, temperaturas-alvo únicas, intervalos nativos `heat_cool`, desligamento e opções compatíveis de ventilação, predefinição, oscilação e humidade. Os blocos apenas com opções adicionais usam o mesmo mecanismo de envio sem definir uma temperatura-alvo ou um modo HVAC. As chamadas de serviço são sequenciais: se uma chamada posterior falhar, uma opção anterior pode já ter sido alterada, mas o Velair não indica que o bloco inteiro foi aplicado.
