<a id="resilient-climate-delivery"></a>
# Envio resiliente de comandos de climatização
<!-- velair-docs:start -->
Traduções: [Original em inglês](resilient-climate-delivery.md) · [Español](resilient-climate-delivery.es.md) · [Français](resilient-climate-delivery.fr.md) · [Deutsch](resilient-climate-delivery.de.md) · [Italiano](resilient-climate-delivery.it.md) · [Nederlands](resilient-climate-delivery.nl.md) · [Polski](resilient-climate-delivery.pl.md) · [Português (Brasil)](resilient-climate-delivery.pt-br.md) · [Português (Portugal)](resilient-climate-delivery.pt-pt.md) · [Русский](resilient-climate-delivery.ru.md) · [Status das traduções](../translation-status.md)

<details>
<summary>Status desta tradução</summary>

| Informação | Status |
| --- | --- |
| Versão de referência | 1.9.0-beta.10 |
| Última sincronização | 2026-11-04 |
| Revisão linguística | Tradução assistida por IA |
| Em relação ao original | Sincronizada com o original em inglês. |

</details>

---
<!-- velair-docs:end -->

O Velair preserva a intenção de controle do agendador quando um termostato gerenciado está temporariamente sem conexão.

Se uma entidade ficar `unknown` ou `unavailable`, o Velair espera que o Home Assistant informe que ela está disponível novamente. Esse comportamento responde a mudanças de estado; o Velair não consulta o dispositivo periodicamente. Quando a conexão volta, ele verifica o que deve estar ativo *agora*, em vez de repetir o comando que estava vigente antes da interrupção.

Por exemplo, um Perfil de ausência pode ter solicitado 17 °C enquanto o termostato estava offline. Se o modo de presença for selecionado antes da reconexão, o Velair determina e envia a temperatura atual desse modo, não os dados antigos de 17 °C. A mesma regra se aplica a Modos, Reforço, Pausa, Room Assist e preparação antecipada pelo pré-condicionamento adaptativo.

Quando o Home Assistant rejeita uma chamada de climatização, ou a aceita mas o equipamento continua informando um alvo diferente, o Velair faz no máximo duas tentativas adicionais nesse episódio de envio. A primeira nova tentativa aguarda cerca de 2 segundos e a segunda, mais cerca de 10 segundos. Após a última tentativa aceita, o Velair concede 5 segundos para a chegada do informe do alvo. Um informe correspondente pode concluir a confirmação antes; equipamentos que informam o valor solicitado não precisam de nova tentativa.

A recuperação é independente para cada zona gerenciada. Se vários equipamentos separados mudarem de bloco ao mesmo tempo, apenas aquele cujo alvo permanecer diferente receberá uma nova tentativa. Os demais equipamentos não são atrasados nem recebem seus comandos novamente. Essas verificações usam os estados informados pelo Home Assistant e os listeners existentes de mudança de estado, sem leituras periódicas do dispositivo.

Antes de tentar novamente, o Velair verifica outra vez a intenção atual, incluindo qualquer novo bloco, Reforço ou pausa. Uma intenção mais recente ou a parada ou o descarregamento do Velair cancela o trabalho pendente obsoleto daquele equipamento. O Diagnóstico mostra se a confirmação está pendente, concluída, recuperada após uma nova tentativa ou ainda não confirmada. Uma falha silenciosa recuperada também permanece no histórico limitado de envio.

Uma transição real de indisponível para disponível mantém a recuperação de reconexão. Se uma confirmação ou recuperação já estiver pendente, o prazo original e o limite de tentativas são mantidos; um informe correspondente pode concluir a confirmação sem outro comando. Caso contrário, a reconexão inicia um novo episódio de envio para o alvo atual. Informes comuns de temperatura, umidade ou alvo não reiniciam um limite de tentativas esgotado. Um informe tardio que corresponda ao alvo solicitado elimina a divergência sem enviar outro comando.

Os ajustes manuais de temperatura são executados uma única vez. O Velair não reaplica uma temperatura manual antiga quando o equipamento se reconecta mais tarde.

Um evento do Velair que indica aplicação bem-sucedida significa que o Home Assistant aceitou toda a sequência de chamadas de climatização, incluindo o modo solicitado e as opções compatíveis. Ele não confirma que o equipamento físico atingiu a temperatura. Use o estado da entidade de climatização e o diagnóstico da integração do dispositivo para observar sua operação real.

Esse comportamento funciona com aquecimento, resfriamento, temperaturas-alvo únicas, faixas nativas `heat_cool`, desligamento e opções compatíveis de ventilação, preset, oscilação e umidade. Os blocos somente com opções adicionais usam o mesmo mecanismo de envio sem definir uma temperatura-alvo ou um modo HVAC. As chamadas de serviço são sequenciais: se uma chamada posterior falhar, uma opção anterior pode já ter sido alterada, mas o Velair não informa que o bloco inteiro foi aplicado.
