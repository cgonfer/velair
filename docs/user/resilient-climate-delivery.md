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

## Confirming delivery

Some gateways accept a climate call and then silently drop it: Home Assistant
reports success, but the entity state never changes. A Midea CCM15 bridge
exposing several indoor units drops `set_temperature` calls when its zones are
written back to back, and local Daikin integrations have shown the same
symptom. Velair does not add blind fixed delays for every installation.
Instead, **Confirm delivery** is an opt-in, per-climate readback check that
only acts on evidence from the climate entity itself.

Enable it in **Settings** for a climate. After Home Assistant accepts the
complete call sequence, Velair watches that entity's state changes until it
converges or the **Timeout** (5–120 seconds, default 25) expires. This is
event-driven; nothing is polled.

A delivery converges when:

- the reported HVAC mode equals the requested mode, or is any mode other than
  `off` when the block kept the current mode;
- the reported target temperature, or both ends of a native range, is within
  half of the entity's `target_temp_step` of the value Velair sent (so 24.4 °C
  matches a 24.5 °C request with a 0.5 ° step, but 24.0 °C does not match
  25.0 °C);
- a turn-off delivery is confirmed when the entity reports `off`.

When Room Assist is adjusting the same block, the check uses the assisted
temperature that was actually sent.

If the entity does not converge before the timeout, Velair resolves the
current authoritative intent again, exactly as it does after a reconnection,
and sends it as the next attempt. A block, Profile, Boost, or pause that
changed meanwhile is what gets re-sent; the original payload is never
replayed. This repeats up to **Attempts** (1–5, default 3). After the last
attempt the delivery is marked **unconfirmed**. A newer Velair intention or
stopping Velair cancels a pending confirmation.

Confirmation is additional evidence and does not change the meaning of
`climate_target_applied`: that event is still emitted when Home Assistant
accepts the call sequence. The separate `delivery_outcome` event, the
per-climate outcome in Diagnostics, and the `unconfirmed_deliveries` attribute
of the Diagnostics status sensor report what the entity reported afterwards.
See [Automation events](automation-events.md#delivery-outcome) and
[Diagnostics](diagnostics.md#automating-diagnostic-health).

**Delivery stagger** is a separate global setting (0–30 seconds, default 0).
When it is greater than zero, Velair starts physical call sequences to
different climates at least that many seconds apart, across the whole
integration. Zero keeps the current behavior with no cross-climate pacing.
Pacing a CCM15 bridge about 3 seconds apart is enough to stop it from dropping
zones. A delivery that is superseded while waiting for its turn is dropped
without being sent.

Leave both options at their defaults unless a device demonstrably drops
accepted commands.
