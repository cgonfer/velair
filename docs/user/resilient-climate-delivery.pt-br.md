<a id="resilient-climate-delivery"></a>
# Envio resiliente de comandos de climatização
<!-- velair-docs:start -->
Traduções: [Original em inglês](resilient-climate-delivery.md) · [Español](resilient-climate-delivery.es.md) · [Français](resilient-climate-delivery.fr.md) · [Deutsch](resilient-climate-delivery.de.md) · [Italiano](resilient-climate-delivery.it.md) · [Nederlands](resilient-climate-delivery.nl.md) · [Polski](resilient-climate-delivery.pl.md) · [Português (Brasil)](resilient-climate-delivery.pt-br.md) · [Português (Portugal)](resilient-climate-delivery.pt-pt.md) · [Русский](resilient-climate-delivery.ru.md) · [Status das traduções](../translation-status.md)

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

O Velair preserva a intenção de controle do agendador quando um termostato gerenciado está temporariamente sem conexão.

Se uma entidade ficar `unknown` ou `unavailable`, o Velair espera que o Home Assistant informe que ela está disponível novamente. Esse comportamento responde a mudanças de estado; o Velair não consulta o dispositivo periodicamente. Quando a conexão volta, ele verifica o que deve estar ativo *agora*, em vez de repetir o comando que estava vigente antes da interrupção.

Por exemplo, um Perfil de ausência pode ter solicitado 17 °C enquanto o termostato estava offline. Se o modo de presença for selecionado antes da reconexão, o Velair determina e envia a temperatura atual desse modo, não os dados antigos de 17 °C. A mesma regra se aplica a Modos, Reforço, Pausa, Room Assist e preparação antecipada pelo pré-condicionamento adaptativo.

Quando o Home Assistant rejeita explicitamente uma chamada de climatização, o Velair faz no máximo duas tentativas adicionais: após cerca de 2 segundos e 10 segundos. Novas instruções de controle, a parada do Velair ou a desativação da integração cancelam as operações pendentes daquele equipamento.

Os ajustes manuais de temperatura são executados uma única vez. O Velair não reaplica uma temperatura manual antiga quando o equipamento se reconecta mais tarde.

Um evento do Velair que indica aplicação bem-sucedida significa que o Home Assistant aceitou toda a sequência de chamadas de climatização, incluindo o modo solicitado e as opções compatíveis. Ele não confirma que o equipamento físico atingiu a temperatura. Use o estado da entidade de climatização e o diagnóstico da integração do dispositivo para observar sua operação real.

Esse comportamento funciona com aquecimento, resfriamento, temperaturas-alvo únicas, faixas nativas `heat_cool`, desligamento e opções compatíveis de ventilação, preset, oscilação e umidade. Os blocos somente com opções adicionais usam o mesmo mecanismo de envio sem definir uma temperatura-alvo ou um modo HVAC. As chamadas de serviço são sequenciais: se uma chamada posterior falhar, uma opção anterior pode já ter sido alterada, mas o Velair não informa que o bloco inteiro foi aplicado.
