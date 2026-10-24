# Shared climate supply
<!-- velair-docs:start -->
Translations: [English original](shared-climate-supply.md) · [Español](shared-climate-supply.es.md) · [Français](shared-climate-supply.fr.md) · [Deutsch](shared-climate-supply.de.md) · [Italiano](shared-climate-supply.it.md) · [Nederlands](shared-climate-supply.nl.md) · [Polski](shared-climate-supply.pl.md) · [Português (Brasil)](shared-climate-supply.pt-br.md) · [Português (Portugal)](shared-climate-supply.pt-pt.md) · [Русский](shared-climate-supply.ru.md) · [Translation status](../translation-status.md)

---
<!-- velair-docs:end -->

Shared climate supply estimates whether associated thermostats need heating or
cooling and controls one shared `switch`, such as a boiler request relay. It is
optional and disabled until you explicitly enable a supply in **Supply control**.
The estimate does not confirm valve opening, water flow, or physical heating.

## Configure a supply

Open **Supply control** in the Velair panel and choose **Add supply**. The list shows your
supplies; select one to edit its details beside the list, or below it on a narrow
screen. When no supplies exist, the empty prompt offers **Add supply**.
The **Shared supplies** list contains controlled heating or cooling circuits; it
is separate from general thermostat grouping.

Set **Supply name**, choose
an existing supply switch, select its **Supply purpose** (Heating or Cooling), and select the managed
thermostats supplied by that circuit. Each switch can belong to only one supply.
Velair's own control switches cannot be supply outputs.

Supply purpose describes what the shared equipment provides. It does not change
the thermostats' HVAC modes: a heating source responds only to heating demand,
and a cooling source responds only to cooling demand.

Each list entry identifies the supply purpose, thermostat count, selected switch
and saved automatic-control status. Edit the supply name, supply switch and supply
purpose directly in the top summary, alongside the enable control and save icon.
Each setting appears once; there is no separate Supply settings section. **Switch state**
is the observed entity state; the list's control summary describes the saved setup.
The toggle edits a draft until you save, so an unsaved enabled toggle can coexist
with a saved Disabled status. Demand is not evaluated while control is disabled
or suspended. Information buttons explain these distinctions, switch ownership,
supply purpose and timing without expanding the main form.

Use **Remove supply** (the trash button) in its
list entry; removal remains a draft until you save the supplies. Expand
**Timing options**, **Demand and hysteresis**, or **Associated thermostats** to edit
that part. The help icon beside the feature title opens a summary and this guide.
Switching between supplies retains their unsaved edits. **Save supplies**, the save icon in the detail
header, applies the complete edited list, including removals. It remains available
in the empty state when the last supply has been removed. As in Templates and
Presets, there is no separate Discard button. Leaving the tab with unsaved changes
asks whether to discard them; returning then restores the saved list. Navigation
waits while a save or resume request is in progress.

Returning every edited value to its saved value clears the draft, so live
configuration updates and **Resume automatic control** become available again.
Saved edits reach other connected panels even when the estimated demand does
not change.

Choose the supply's hysteresis mode and values. Each associated thermostat inherits
the mode; you can override its numeric values without configuring another mode.
In each selected thermostat row, **Thermostat hysteresis** chooses **Use supply
hysteresis** or **Custom hysteresis values**. The selector aligns with the
thermostat checkbox/name; numeric exceptions and effective limits appear below.
In Custom mode, each of the two values can inherit independently. Values are temperature
differences in the panel's current temperature unit; changing units converts
these differences without treating them as absolute temperatures.

Numeric fields report invalid values as you edit. Hysteresis values must be
finite and non-negative; leaving a thermostat exception empty inherits the
supply value. Saving is unavailable while any supply has invalid numbers, and
the list marks the supply that needs attention.

Save explicitly to apply the configuration. Enabling the supply gives Velair
exclusive automatic control of its selected switch. Avoid having another
automation continuously control the same output.

Save failures appear in the detail header beside the save action. Configuration
errors identify the affected supply, field and correction; Velair selects that
supply and opens the relevant section. The field is marked and receives focus.
Home Assistant or connection errors retain their original explanation without
assigning them to an unrelated field. Drafts remain available for correction
and retry, including after removing the final supply.

## How estimated demand works

New supplies created in the panel use **Stop at target**, with a start distance
of **0.3 °C** or **0.54 °F** and a zero stop distance. These are equivalent
temperature differences; thermostat overrides inherit the supply values unless
you choose custom values. The examples below use different distances to show
each mode clearly.

For ordinary thermostats, hysteresis defines a start threshold and a stop
threshold. Between them, previous demand is retained. All comparisons include
the threshold itself. These examples use a 22 °C target:

| Mode | Values | Heating: start / stop | Cooling: start / stop |
| --- | --- | --- | --- |
| Stop at target (default) | Start distance 0.5 °C | ≤21.5 / ≥22 °C | ≥22.5 / ≤22 °C |
| Symmetric | Distance 0.5 °C | ≤21.5 / ≥22.5 °C | ≥22.5 / ≤21.5 °C |
| Custom | Start 0.5 °C; stop 0.2 °C | ≤21.5 / ≥22.2 °C | ≥22.5 / ≤21.8 °C |

The temperature diagram in **Demand and hysteresis** updates as you edit the
supply's purpose, mode or distances. It uses a labelled example target rather than
a thermostat's live target. Temperatures appear beside their start and stop
markers; brackets link each hysteresis distance to the example target.
The labelled room-temperature axis increases to the right. The note below explains
that an existing request continues between start and stop; otherwise none starts.
Between the limits, the previous demand is retained. Heating requests supply on the
colder side, while cooling requests it on the warmer side. The diagram explains
estimated demand, without simulating equipment operation or timing delays.
Its example target is 22 °C or 72 °F. If a numeric value is empty, incomplete or
invalid while editing, a grey diagram without temperature readings preserves
the preview's height until the value is valid again.

Start distance is measured away from the target before heating or cooling is
needed. Stop distance extends beyond the target in the direction of heating or
cooling. Both accept zero; with both zero, exactly at target means no demand.
Inside the band after a restart, target change or hysteresis configuration change,
no new demand is assumed. Switching modes preserves previously entered custom
stop values, which apply again when you return to Custom mode.

**Stop at target** is the recommended starting point for ordinary thermostats.
Symmetric and Custom are advanced choices: a thermostat may close its valve or
stop its compressor at the target before the room reaches a beyond-target stop
threshold. The shared source could then remain requested. These settings estimate
demand; they do not change the thermostat's own switching limits or force heat flow.

Keep separate heating and cooling supplies' thresholds apart when they share a
range thermostat. Large stop distances can retain a heating request while cooling
starts, or vice versa. Shared supplies aggregate independently; they do not provide an
interlock between opposing outputs. Use suitable equipment interlocks where needed.

The source is requested when at least one associated thermostat has valid demand.
An off thermostat or incompatible HVAC direction does not request supply.
Unavailable or missing temperature data is shown as unknown demand; it does not
retain an earlier request indefinitely. Other valid rooms can still request supply.
With no valid requesting room, the supply requests off after its configured delay.

Current thermostat targets are used, including manual changes and targets applied
by Adaptive Preconditioning or Planned Return. Pausing a schedule does not disable
automatic supply control. A valid temperature range uses its lower bound for
heating and upper bound for cooling; an ambiguous target cannot request supply.

## Room Assist

A blue information panel at the top of **Demand and hysteresis**, before the mode
selector, explains Room Assist's priority and when the supply hysteresis applies.

When Room Assist owns a room's active target, shared supply follows its committed
control intent. For fixed heating, Room Assist's `towards_upper` phase requests
heat; for fixed cooling, `towards_lower` requests cooling. Its existing switching
limits remain authoritative, so the supply's hysteresis and room override are not
applied a second time. Native range control follows its committed direction.
An invalid or pending assisted target is unknown until a valid commit is available.

The corrected thermostat target is not compared against an external room sensor.
Room Assist can stop requesting supply even while the thermostat still reports
the same adjusted target.

## Timing and manual control

**Minimum time off** delays a new start after the switch turns off. **Switch-off
delay** requires a continuous period without demand before switching off; returning
demand cancels that delay. Both accept whole seconds from 0 to 86,400 and default
to zero. There is no forced
minimum on period keeping the source active after valves may have closed.

Renaming a supply or editing a currently unused stop distance does not restart
its demand cycle or switch-off delay. Re-enabling a supply uses the switch's
latest reported off transition to enforce its minimum time off.

Turning an enabled supply's switch off outside Velair suspends automatic
control. Use **Resume automatic control** to resume it. The suspension is saved
across restarts. Saving other supply changes does not clear it. Disabling or
removing a supply requests off for its previously controlled output.

Turning the switch on outside Velair does not override automatic control. When
all associated thermostats report no demand, Velair still turns it off after
the configured switch-off delay. If Home Assistant confirms that this off
transition belongs to Velair's correction, Velair creates a persistent
notification and an Activity entry associated with the switch. The message names
the supply, explains that an external activation was corrected because automatic
control had no estimated heating or cooling demand, and links to **Supply control**
to review or disable that control. It does not assume a person caused the change.

Repeated corrections for the same supply and switch are reported at most once
every 15 minutes during the current integration run. Reassigning the switch starts
a new reporting period. Each supply uses one notification, so a later allowed
notice replaces its previous notice. Delivery failures or service acceptance
without a matching reported off transition do not produce a success notice.
Unknown thermostat demand is not reported as confirmed zero demand. A switch
integration that does not preserve the command context cannot provide the
attribution needed for this notice. These reporting rules do not change supply
control or require polling. Notification and Activity failures do not interrupt
control; Activity requires Home Assistant's activity/logbook integration.

A newer manual switch-off takes precedence over a save or resume already in
progress. Resume again explicitly if you want automatic control after that
switch-off. Manual suspension also remains saved across temperature-unit
migration and restart.

An unavailable switch or failed command is displayed in the supply. Delivery
attempts are bounded and do not repeat on every sensor update. Home Assistant
accepting a command does not prove that the physical equipment operated.

Imported supplies are disabled and suspended. Review the output and rooms, enable
the supply, save it, and explicitly resume automatic control when appropriate.

## Preconditioning master and performance

The [Preconditioning master](adaptive-preconditioning.md#preconditioning-master)
constrains dependent rooms' preparation start. Shared supply instead follows room
demand. A TRV-controlled boiler installation does not automatically need a master;
Velair does not create dependencies between these settings.

The controller listens to configured entities and uses one coalescing worker and
at most one timer per supply. It does not poll, save temperature samples, or require
an open browser. Routine temperature changes without a meaningful control-state
change do not broadcast a new full panel snapshot.
