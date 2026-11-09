# Screenshot Assets

These screenshots show a fictional English household in real Home Assistant,
using virtual devices and Home Assistant's dark theme. The same scenes are
captured at desktop, tablet and mobile widths.

Velair computes the displayed states through its normal runtime. Learning
observations are synthetic; external-publication scenes use a test-only
controller transport and do not verify physical equipment or RF delivery.
See the [public screenshot workflow](../../scripts/screenshots/README.md) for
generation, review and local installation.

Use the sections below to move from room setup and reusable schedules to comfort, preparation and delivery. Each feature keeps its three viewport captures together.

## Control and room setup

### Overview

See scheduler status, upcoming events, today's timeline and current zone conditions at a glance.

**Desktop**

![Velair overview desktop](../../screenshots/overview-desktop.png)

| Tablet | Mobile |
| --- | --- |
| ![Velair overview tablet](../../screenshots/overview-tablet.png) | ![Velair overview mobile](../../screenshots/overview-mobile.png) |

### Room groups

Combine Living Room and Dining Room into one Downstairs zone, with a shared room reading and explicit delivery to both climates. Configure the control unit before assigning its schedules. See the [Room groups guide](../user/room-groups.md).

**Desktop**

![Velair room groups desktop](../../screenshots/room-groups-desktop.png)

| Tablet | Mobile |
| --- | --- |
| ![Velair room groups tablet](../../screenshots/room-groups-tablet.png) | ![Velair room groups mobile](../../screenshots/room-groups-mobile.png) |

### Climate status and control card

Use one Lovelace card to control a managed climate and review Velair context, Comfort, Room Assist, Preconditioning, actions and today's timeline.

**Desktop**

![Velair single-climate card desktop](../../screenshots/climate-card-desktop.png)

| Tablet | Mobile |
| --- | --- |
| ![Velair single-climate card tablet](../../screenshots/climate-card-tablet.png) | ![Velair single-climate card mobile](../../screenshots/climate-card-mobile.png) |

## Scheduling and reusable resources

### Schedule workspace

Use one full-size workspace for both the normal weekly plan and reusable Profile schedules.

#### Default schedules

**Desktop**

![Velair default schedules desktop](../../screenshots/schedules-desktop.png)

| Tablet | Mobile |
| --- | --- |
| ![Velair default schedules tablet](../../screenshots/schedules-tablet.png) | ![Velair default schedules mobile](../../screenshots/schedules-mobile.png) |

#### Profile schedules

**Desktop**

![Velair profile schedules desktop](../../screenshots/profiles-desktop.png)

| Tablet | Mobile |
| --- | --- |
| ![Velair profile schedules tablet](../../screenshots/profiles-tablet.png) | ![Velair profile schedules mobile](../../screenshots/profiles-mobile.png) |

### Climate presets

Reuse the same climate action in several schedule blocks. The Bedroom comfort preset keeps its native heating/cooling range together, while linked usages show where an edit will apply. Daily templates below reuse whole days instead. See [block presets and linked templates](../user/linked-schedules.md).

**Desktop**

![Velair climate presets desktop](../../screenshots/presets-desktop.png)

| Tablet | Mobile |
| --- | --- |
| ![Velair climate presets tablet](../../screenshots/presets-tablet.png) | ![Velair climate presets mobile](../../screenshots/presets-mobile.png) |

### Templates

Create reusable daily schedules and apply them where they are needed.

**Desktop**

![Velair templates desktop](../../screenshots/templates-desktop.png)

| Tablet | Mobile |
| --- | --- |
| ![Velair templates tablet](../../screenshots/templates-tablet.png) | ![Velair templates mobile](../../screenshots/templates-mobile.png) |

### Modes

Compose one or more non-overlapping Profiles and choose which setup currently controls the home.

#### Modes

**Desktop**

![Velair modes desktop](../../screenshots/modes-desktop.png)

| Tablet | Mobile |
| --- | --- |
| ![Velair modes tablet](../../screenshots/modes-tablet.png) | ![Velair modes mobile](../../screenshots/modes-mobile.png) |

#### Change active setup

Switch between the Default schedule, a Mode or a Profile from one place.

**Desktop**

![Velair change active setup desktop](../../screenshots/active-setup-change-desktop.png)

| Tablet | Mobile |
| --- | --- |
| ![Velair change active setup tablet](../../screenshots/active-setup-change-tablet.png) | ![Velair change active setup mobile](../../screenshots/active-setup-change-mobile.png) |

## Comfort and preparation

### Comfort

Review the guided psychrometric comfort range, CO₂ air quality, Humidex, dew point and absolute humidity using local sensor readings.

**Desktop**

![Velair comfort desktop](../../screenshots/comfort-desktop.png)

| Tablet | Mobile |
| --- | --- |
| ![Velair comfort tablet](../../screenshots/comfort-tablet.png) | ![Velair comfort mobile](../../screenshots/comfort-mobile.png) |

### Room Assist

Compare the scheduled target, deadband limits, external room sensor, climate reading and target applied to the thermostat.

In the app, narrow graphs scroll horizontally to reveal all markers. A static
mobile capture shows the initial graph viewport.

#### Assisting

In fixed heating or cooling, Room Assist keeps driving towards the active deadband edge until that edge is reached.

**Desktop**

![Velair assisting desktop](../../screenshots/room-assist-desktop-1.png)

| Tablet | Mobile |
| --- | --- |
| ![Velair assisting tablet](../../screenshots/room-assist-tablet-1.png) | ![Velair assisting mobile](../../screenshots/room-assist-mobile-1.png) |

#### Holding

Automatic modes and native ranges keep their neutral deadband behavior when the room is already inside the configured margin.

**Desktop**

![Velair holding desktop](../../screenshots/room-assist-desktop-2.png)

| Tablet | Mobile |
| --- | --- |
| ![Velair holding tablet](../../screenshots/room-assist-tablet-2.png) | ![Velair holding mobile](../../screenshots/room-assist-mobile-2.png) |

### Adaptive Preconditioning

Follow local learning progress and understand when Velair plans to start before a scheduled block.

**Desktop**

![Velair adaptive preconditioning desktop](../../screenshots/preconditioning-desktop.png)

| Tablet | Mobile |
| --- | --- |
| ![Velair adaptive preconditioning tablet](../../screenshots/preconditioning-tablet.png) | ![Velair adaptive preconditioning mobile](../../screenshots/preconditioning-mobile.png) |

### Planned Return

Use the Away setup while the home is empty, then prepare eligible rooms for a one-off arrival. The live return status connects the destination setup, arrival timeline and current room preparation. See the [Planned Return guide](../user/planned-return.md).

**Desktop**

![Velair planned return desktop](../../screenshots/planned-return-desktop.png)

| Tablet | Mobile |
| --- | --- |
| ![Velair planned return tablet](../../screenshots/planned-return-tablet.png) | ![Velair planned return mobile](../../screenshots/planned-return-mobile.png) |

## Delivery and shared equipment

### Supply control

Coordinate a shared heating supply from the estimated demand of its associated zones. The live overview shows the observed switch state, demand, timing and each zone's contribution, so the supply decision can be inspected directly. See the [shared climate supply guide](../user/shared-climate-supply.md).

**Desktop**

![Velair supply control live overview desktop](../../screenshots/supply-control-desktop.png)

| Tablet | Mobile |
| --- | --- |
| ![Velair supply control live overview tablet](../../screenshots/supply-control-tablet.png) | ![Velair supply control live overview mobile](../../screenshots/supply-control-mobile.png) |

### External execution

Inspect compatible-system discovery and real backend publication states through a test-only integration, without connecting physical hardware.

#### Compatible system available

The test integration exposes Guest Room as a compatible heating zone, with the local and external execution choices detected by Velair.

**Desktop**

![Velair compatible system available desktop](../../screenshots/external-settings-desktop.png)

| Tablet | Mobile |
| --- | --- |
| ![Velair compatible system available tablet](../../screenshots/external-settings-tablet.png) | ![Velair compatible system available mobile](../../screenshots/external-settings-mobile.png) |

#### Publishing

Velair is sending the effective Workday Profile schedule to the external integration.

**Desktop**

![Velair publishing desktop](../../screenshots/external-publishing-desktop.png)

| Tablet | Mobile |
| --- | --- |
| ![Velair publishing tablet](../../screenshots/external-publishing-tablet.png) | ![Velair publishing mobile](../../screenshots/external-publishing-mobile.png) |

#### Published

The external integration accepted the effective Workday Profile schedule; this does not verify the physical controller.

**Desktop**

![Velair published desktop](../../screenshots/external-published-desktop.png)

| Tablet | Mobile |
| --- | --- |
| ![Velair published tablet](../../screenshots/external-published-tablet.png) | ![Velair published mobile](../../screenshots/external-published-mobile.png) |

#### Publication failed

The external provider returned an error; Velair keeps local actions inactive for the externally managed climate.

**Desktop**

![Velair publication failed desktop](../../screenshots/external-error-desktop.png)

| Tablet | Mobile |
| --- | --- |
| ![Velair publication failed tablet](../../screenshots/external-error-tablet.png) | ![Velair publication failed mobile](../../screenshots/external-error-mobile.png) |

## Diagnostics and settings

### Diagnostics

Review scheduler health, managed climate state, delivery failures and a bounded local runtime history.

#### Healthy system

Start with a concise health summary, then inspect the effective setup and runtime evidence for each climate.

**Desktop**

![Velair healthy system desktop](../../screenshots/diagnostics-healthy-desktop.png)

| Tablet | Mobile |
| --- | --- |
| ![Velair healthy system tablet](../../screenshots/diagnostics-healthy-tablet.png) | ![Velair healthy system mobile](../../screenshots/diagnostics-healthy-mobile.png) |

<a id="errors-detected"></a>

#### Issues detected

See an unavailable managed climate and its backend recovery status without relying exclusively on logs.

**Desktop**

![Velair issues detected desktop](../../screenshots/diagnostics-errors-desktop.png)

| Tablet | Mobile |
| --- | --- |
| ![Velair issues detected tablet](../../screenshots/diagnostics-errors-tablet.png) | ![Velair issues detected mobile](../../screenshots/diagnostics-errors-mobile.png) |

### Settings

Set temperature units, the first weekday, startup behavior, external execution
and the order of climates and room groups.

**Desktop**

![Velair settings desktop](../../screenshots/settings-desktop.png)

| Tablet | Mobile |
| --- | --- |
| ![Velair settings tablet](../../screenshots/settings-tablet.png) | ![Velair settings mobile](../../screenshots/settings-mobile.png) |
