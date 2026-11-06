# Resilient Climate Delivery
<!-- velair-docs:start -->
Translations: [English original](resilient-climate-delivery.md) · [Español](resilient-climate-delivery.es.md) · [Français](resilient-climate-delivery.fr.md) · [Deutsch](resilient-climate-delivery.de.md) · [Italiano](resilient-climate-delivery.it.md) · [Nederlands](resilient-climate-delivery.nl.md) · [Polski](resilient-climate-delivery.pl.md) · [Português (Brasil)](resilient-climate-delivery.pt-br.md) · [Português (Portugal)](resilient-climate-delivery.pt-pt.md) · [Русский](resilient-climate-delivery.ru.md) · [Translation status](../translation-status.md)

---
<!-- velair-docs:end -->

Velair keeps scheduler-owned climate intent safe when a managed thermostat is
temporarily reconnecting.

If an entity becomes `unknown` or `unavailable`, Velair waits for Home Assistant
to report it available again. This is driven by state changes; Velair does not
poll the device. When it reconnects, Velair checks what should be active *now*.
It does not replay the command that happened to be current before the outage.

For example, suppose an Away Profile requested 17 °C while a thermostat was
offline. If Home mode is selected before it reconnects, Velair resolves and
delivers the current Home target, not the obsolete 17 °C payload. The same rule
applies to Modes, Boost, Pause, Room Assist, and early Adaptive Preconditioning.

When Home Assistant rejects a climate call, or accepts it but the climate keeps
reporting a different target, Velair makes at most two additional attempts in
that delivery episode. The first retry waits about 2 seconds and the second about
10 further seconds. After the last accepted attempt, Velair allows 5 seconds
for the target report to arrive. A matching report can complete confirmation
earlier; climates that report the requested value need no retry.

Recovery is independent for each managed zone. If several separate climates
change blocks at the same time, only the one whose target remains different is
retried. The other climates are not delayed or sent their commands again. These
checks use Home Assistant's reported states and existing state-change listeners,
without periodic reads from the device.

Before retrying, Velair checks the current intention again, including any new
block, Boost or pause. A newer intention or stopping/unloading Velair cancels
obsolete pending work for that climate. Diagnostics shows whether confirmation
is pending, completed, recovered after a retry, or still unconfirmed. A recovered
silent failure also remains in the bounded delivery history.

A genuine transition from unavailable to available retains reconnection recovery. If confirmation or recovery is already pending, it keeps the original deadline and retry budget; a matching report can complete confirmation without another command. Otherwise reconnection starts a fresh delivery episode for the current target. Ordinary temperature, humidity or target reports do not restart an exhausted retry budget. A late report matching the requested target clears the discrepancy without sending another command.

Manual temperature actions are one-shot. Velair does not make an old manual
target appear later after the device reconnects.

An applied Velair event means Home Assistant accepted the complete climate call
sequence, including requested mode and supported options. It does not confirm
that the physical equipment has reached the temperature. Use the climate
entity's state and the device integration's diagnostics to observe physical
operation.

This behavior works for heating, cooling, scalar targets, native `heat_cool`
ranges, turn-off actions, and supported fan, preset, swing, and humidity
options. Option-only blocks use the same delivery boundary without setting a
target or HVAC mode. Their service calls run sequentially: if a later call
fails, an earlier option may already have changed, but Velair does not report
the complete block as applied.
