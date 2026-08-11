# Resilient Climate Delivery

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

When Home Assistant explicitly rejects a climate call, Velair makes at most two
additional attempts: after about 2 seconds and 10 seconds. A newer intention or
stopping/unloading Velair cancels pending work for that climate.

Manual temperature actions are one-shot. Velair does not make an old manual
target appear later after the device reconnects.

An applied Velair event means Home Assistant accepted the complete climate call
sequence, including requested mode and supported options. It does not confirm
that the physical equipment has reached the temperature. Use the climate
entity's state and the device integration's diagnostics to observe physical
operation.

This behavior works for heating, cooling, scalar targets, native `heat_cool`
ranges, turn-off actions, and supported fan, preset, swing, and humidity
options.
