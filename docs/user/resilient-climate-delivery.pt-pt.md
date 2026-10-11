<a id="resilient-climate-delivery"></a>
# Envio resiliente de comandos de climatização
<!-- velair-docs:start -->
Traduções: [Original em inglês](resilient-climate-delivery.md) · [Español](resilient-climate-delivery.es.md) · [Français](resilient-climate-delivery.fr.md) · [Deutsch](resilient-climate-delivery.de.md) · [Italiano](resilient-climate-delivery.it.md) · [Nederlands](resilient-climate-delivery.nl.md) · [Polski](resilient-climate-delivery.pl.md) · [Português (Brasil)](resilient-climate-delivery.pt-br.md) · [Português (Portugal)](resilient-climate-delivery.pt-pt.md) · [Русский](resilient-climate-delivery.ru.md) · [Estado das traduções](../translation-status.md)

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

O Velair preserva a intenção de controlo do agendador quando um termóstato gerido está temporariamente sem ligação.

Se uma entidade ficar `unknown` ou `unavailable`, o Velair espera que o Home Assistant indique que está novamente disponível. Este comportamento responde a alterações de estado; o Velair não consulta o dispositivo periodicamente. Quando a ligação é restabelecida, verifica o que deve estar ativo *agora*, em vez de repetir o comando que estava em vigor antes da interrupção.

Por exemplo, um Perfil de ausência pode ter solicitado 17 °C enquanto o termóstato estava indisponível. Se o modo de presença for selecionado antes de a ligação ser restabelecida, o Velair determina e envia a temperatura atual desse modo, não os dados antigos de 17 °C. A mesma regra aplica-se a Modos, Reforço, Pausa, Room Assist e preparação antecipada pelo pré-condicionamento adaptativo.

Quando o Home Assistant rejeita explicitamente uma chamada de climatização, o Velair faz, no máximo, duas tentativas adicionais: após cerca de 2 segundos e 10 segundos. Novas instruções de controlo, a paragem do Velair ou a desativação da integração cancelam as operações pendentes desse equipamento.

Os ajustes manuais de temperatura são executados uma única vez. O Velair não volta a aplicar uma temperatura manual antiga quando o equipamento restabelece a ligação mais tarde.

Um evento do Velair que indica uma aplicação bem-sucedida significa que o Home Assistant aceitou toda a sequência de chamadas de climatização, incluindo o modo solicitado e as opções compatíveis. Não confirma que o equipamento físico atingiu a temperatura. Utilize o estado da entidade de climatização e o diagnóstico da integração do dispositivo para observar o seu funcionamento real.

Este comportamento funciona com aquecimento, arrefecimento, temperaturas-alvo únicas, intervalos nativos `heat_cool`, desligamento e opções compatíveis de ventilação, predefinição, oscilação e humidade. Os blocos apenas com opções adicionais usam o mesmo mecanismo de envio sem definir uma temperatura-alvo ou um modo HVAC. As chamadas de serviço são sequenciais: se uma chamada posterior falhar, uma opção anterior pode já ter sido alterada, mas o Velair não indica que o bloco inteiro foi aplicado.
