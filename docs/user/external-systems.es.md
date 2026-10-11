<a id="external-schedule-execution"></a>

# Ejecución externa de horarios
<!-- velair-docs:start -->
Traducciones: [Original en inglés](external-systems.md) · [Español](external-systems.es.md) · [Français](external-systems.fr.md) · [Deutsch](external-systems.de.md) · [Italiano](external-systems.it.md) · [Nederlands](external-systems.nl.md) · [Polski](external-systems.pl.md) · [Português (Brasil)](external-systems.pt-br.md) · [Português (Portugal)](external-systems.pt-pt.md) · [Русский](external-systems.ru.md) · [Estado de las traducciones](../translation-status.md)

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

Velair suele encargarse tanto de guardar los horarios como de ejecutar las acciones de climatización. Para equipos compatibles, **Ajustes → Sistemas externos** permite publicar el horario semanal efectivo en un controlador que lo ejecuta de forma independiente.

La sección aparece cuando Velair detecta una integración de Home Assistant compatible con un equipo gestionado adecuado, o cuando una zona ya tiene un controlador externo. Antes de activar la ejecución externa, crea y guarda un horario efectivo con al menos un bloque de temperatura para la zona. Si no hay nada que publicar, Velair mantiene el control local y explica el requisito pendiente en Ajustes. Selecciona el sistema externo de una zona para guardar la delegación del control antes de que Velair envíe la semana completa. Si el envío falla, no se restaura la ejecución local: la zona sigue siendo externa y muestra el error de publicación, para evitar que compitan dos programadores. Tras una llamada correcta al servicio de Home Assistant, Velair informa de que el horario se ha publicado: significa que la integración externa aceptó la solicitud. No confirma que el controlador físico lo haya aplicado.

La ejecución externa se limita a los horarios. Velair no envía acciones de climatización a una zona externa, incluida la aplicación del horario al iniciar o del horario actual, Refuerzo, pausa/reanudación, ajuste manual, Room Assist o preacondicionamiento adaptativo. Los Perfiles y Modos solo permiten seleccionar horarios: `normal` publica la semana Predeterminada de la zona y `schedule` la semana del Perfil. El comportamiento de pausa no está disponible para zonas externas. Seleccionar Predeterminado, un Perfil o un Modo, o editar un Perfil activo, publica la nueva semana efectiva completa después de guardar la selección. Un fallo de publicación no deshace la selección global de Perfil o Modo ni afecta a las zonas locales. Volver a seleccionar Predeterminado, un Perfil o un Modo también inicia una nueva publicación cuando el estado actual de ejecución es `failed` o no hay ninguna publicación correcta. Velair no reintenta automáticamente; esta publicación solo se debe a la selección explícita.

<a id="evohome-via-ramses_cc"></a>

## Evohome mediante ramses_cc

El primer sistema compatible utiliza el servicio de Home Assistant `ramses_cc.set_zone_schedule`. Velair no tiene una dependencia de Python con `ramses_cc` y se comunica únicamente mediante servicios de Home Assistant.

Ajustes y el editor de Perfiles obtienen estas condiciones de las capacidades del controlador y las muestran una sola vez bajo el controlador externo, aunque varias zonas lo utilicen. Los detalles del controlador están contraídos por defecto y pueden expandirse para revisar los límites. Límites actuales:

- horarios de calefacción con una temperatura objetivo única por punto de cambio;
- exactamente siete días de la semana, conservando la continuidad semanal de Velair;
- sin bloques de apagado, intervalos de temperatura, modos de refrigeración ni opciones de climatización;
- como máximo seis puntos de cambio resultantes por día;
- cuando el primer bloque comienza después de `00:00`, Velair inserta un punto de continuidad a medianoche; ese cambio implícito cuenta para el máximo diario y deja espacio para cinco bloques editables ese día;
- horas ajustadas a los intervalos de 5 minutos del controlador;
- las temperaturas se convierten a Celsius para los datos enviados al controlador.

En zonas con ejecución externa, los editores diarios Predeterminado y de Perfiles muestran el uso actual del controlador justo encima de los bloques. La primera línea indica los puntos de cambio utilizados y el máximo; la segunda distingue los bloques editables del punto implícito de continuidad a medianoche. El indicador cambia de aspecto al alcanzar el límite y cuando el borrador lo supera. Se calcula a partir de las capacidades declaradas del controlador seleccionado; la validación de publicación del backend sigue siendo la que determina qué se admite.

Resumen conserva la actividad habitual del horario y la información del próximo evento de una zona externa. Un indicador compacto **Externo** identifica el controlador y utiliza un icono para los estados de publicación en curso, aceptada, fallida o no disponible. Su botón de información explica que el controlador ejecuta la programación y que Velair no envía acciones de climatización a la zona. El estado del programador también muestra un aviso informativo cuando una o varias zonas visibles utilizan ejecución externa.

La detección requiere el servicio de configuración del horario, una entrada de configuración `ramses_cc` cargada y una entidad `climate` gestionada que declare compatibilidad con calefacción y temperatura objetivo única. Los metadatos públicos de Home Assistant no distinguen todas las zonas Evohome de los demás equipos `ramses_cc`. Por eso, la llamada al servicio es la comprobación final de compatibilidad y cualquier error se mantiene visible como fallo de publicación.

Esta vía de integración dispone de pruebas automatizadas de servicios. Las pruebas reales en una instalación Evohome con `ramses_cc` también han confirmado la publicación y conservación en el controlador de los horarios semanales probados. Siguen siendo útiles los comentarios de otras instalaciones y combinaciones de horarios.

La publicación solo tiene tres estados durante la ejecución: **publishing** (publicando), **published** (publicado) y **failed** (fallido). Antes de la primera publicación en la ejecución actual de Home Assistant no hay estado de publicación. El estado no se guarda y es independiente de la disponibilidad actual del proveedor.

Velair no llama a `get_zone_schedule`, no añade retardos ni reintenta automáticamente, y no realiza sondeo continuo. Esos mecanismos tampoco permitirían confirmar, de forma neutral respecto al proveedor, qué está ejecutando el equipo físico.
