<a id="resilient-climate-delivery"></a>

# Entrega resiliente de órdenes de climatización
<!-- velair-docs:start -->
Traducciones: [Original en inglés](resilient-climate-delivery.md) · [Español](resilient-climate-delivery.es.md) · [Français](resilient-climate-delivery.fr.md) · [Deutsch](resilient-climate-delivery.de.md) · [Italiano](resilient-climate-delivery.it.md) · [Nederlands](resilient-climate-delivery.nl.md) · [Polski](resilient-climate-delivery.pl.md) · [Português (Brasil)](resilient-climate-delivery.pt-br.md) · [Português (Portugal)](resilient-climate-delivery.pt-pt.md) · [Русский](resilient-climate-delivery.ru.md) · [Estado de las traducciones](../translation-status.md)

<details>
<summary>Estado de esta traducción</summary>

| Dato | Estado |
| --- | --- |
| Versión de referencia | 1.9.0-beta.1 |
| Última sincronización | 2026-10-11 |
| Revisión lingüística | Traducción asistida por IA |
| Respecto al original | Sin cambios pendientes respecto al original inglés. |

</details>

---
<!-- velair-docs:end -->

Velair conserva la intención de control del programador cuando un termostato gestionado está reconectándose temporalmente.

Si una entidad pasa a `unknown` o `unavailable`, Velair espera a que Home Assistant vuelva a indicar que está disponible. Se basa en cambios de estado; no consulta periódicamente el dispositivo. Cuando se reconecta, Velair comprueba qué debe estar activo *ahora*. No repite la orden que estaba vigente antes de la desconexión.

Por ejemplo, supón que un Perfil Ausente solicitaba 17 °C mientras un termostato estaba desconectado. Si se selecciona el Modo En casa antes de que se reconecte, Velair calcula y envía el objetivo actual de En casa, no los datos obsoletos de 17 °C. La misma regla se aplica a Modos, Refuerzo, Pausa, Room Assist y al inicio anticipado del Preacondicionamiento adaptativo.

Cuando Home Assistant rechaza explícitamente una llamada de climatización, Velair realiza como máximo dos intentos adicionales: aproximadamente después de 2 segundos y de 10 segundos. Velair cancela el trabajo pendiente para ese equipo cuando existe una intención más reciente o cuando se detiene o descarga la integración.

Las acciones manuales de temperatura se ejecutan una sola vez. Velair no aplica posteriormente un objetivo manual antiguo cuando el dispositivo se reconecta.

Un evento de aplicación de Velair significa que Home Assistant aceptó la secuencia completa de llamadas de climatización, incluido el modo solicitado y las opciones compatibles. No confirma que el equipo físico haya alcanzado la temperatura. Utiliza el estado de la entidad de climatización y el diagnóstico de la integración del dispositivo para observar su funcionamiento físico.

Este comportamiento admite calefacción, refrigeración, temperaturas objetivo únicas, intervalos nativos `heat_cool`, acciones de apagado y opciones compatibles de ventilador, preset, oscilación y humedad. Los bloques de solo opciones utilizan el mismo criterio de entrega sin establecer un objetivo ni un modo HVAC. Sus llamadas de servicio se ejecutan en secuencia: si falla una llamada posterior, una opción anterior puede haber cambiado ya, pero Velair no informa de que el bloque completo se haya aplicado.
