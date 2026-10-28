# Room groups
<!-- velair-docs:start -->
Translations: [English original](room-groups.md) · [Español](room-groups.es.md) · [Français](room-groups.fr.md) · [Deutsch](room-groups.de.md) · [Italiano](room-groups.it.md) · [Nederlands](room-groups.nl.md) · [Polski](room-groups.pl.md) · [Português (Brasil)](room-groups.pt-br.md) · [Português (Portugal)](room-groups.pt-pt.md) · [Русский](room-groups.ru.md) · [Translation status](../translation-status.md)

---
<!-- velair-docs:end -->

A room group gives several managed `climate` entities one schedule, Profile
assignment, boost, pause and Adaptive Preconditioning model. Use a group when the
devices control the same physical room. Separate rooms should remain independent,
even when they share a daily template or heating/cooling supply.

## What a group shares

| Shared by the room group | Independent for each physical climate |
| --- | --- |
| Schedule, Modes/Profile assignments and control settings | Reported temperature, humidity, HVAC action and availability |
| Boosts, zone pauses and Manual adjustment | Comfort sensors, thresholds and monitoring switch |
| One preconditioning start decision and thermal learning model | Device observations and delivery evidence in Diagnostics |
| Room Assist settings and correction | The device's own internal temperature regulation |

The group is a control unit inside Velair. It is not a new Home Assistant
`climate` or `group` entity. Velair generates a stable internal identifier such
as `group.0123456789abcdef0123456789abcdef`; renaming the group keeps that
identifier. It may appear in diagnostics, exports or technical settings, but it
does not appear in Home Assistant's entity registry or Developer Tools states.
Do not use it as the target of a Home Assistant `climate.*` service. Velair
resolves the group to its real command destinations.

## Create a group

1. Open the **Room groups** tab and use the add button.
2. Enter its name and use **Add climates** to select the managed climates that
   belong to the room. Add at least two climates. Search by name or entity ID,
   then confirm the selection.
   Climates assigned to another group are unavailable and identify their group.
3. Choose a member whose reported room temperature represents the group's own
   temperature. This reference does not make that device the group's owner.
   Configure an optional external temperature sensor in **Room Assist**, as for
   an independent climate.
4. Choose whether Velair sends commands to every member or to a selected member
   whose installation already propagates commands to the other devices.
5. Choose which existing member configuration to adopt with **Use configuration
   from**. Export your current configuration first if you need a recovery copy;
   include **Preconditioning learning** if you also want to back up calibration.
6. Use the header save button to open **Review group changes**. No changes have
   been applied yet. Read the configuration differences and learning-reset notice,
   then choose **Confirm and save** or **Back to editing**. Validation and save
   errors stay in the review flow so you can correct the draft and retry.

### Configuration fields

| Field | Meaning |
| --- | --- |
| Group name | Required display name. It must be unique among groups. |
| Members | Managed climates in this room. Their order controls their individual appearance in Overview. A climate cannot belong to two groups. |
| Temperature reference | One member's reported temperature represents the room inside Velair. This does not give that member priority over the others. |
| Command delivery | **All members** by default, or **Selected member** when the installation already propagates commands. |
| Command recipient | Shown only for **Selected member**; choose the member that receives Velair's commands. |
| Use configuration from | Creation only: choose the member whose existing schedule, Profile configuration and control settings become the shared starting point. |

The temperature reference, command recipient and initial configuration source
can be three different members.

### Send commands to all members or one recipient

**All members** is the default command-delivery mode: Velair sends commands to
every member. **Selected member** sends commands only to the nested **Command
recipient**. Use that mode only when the installation already propagates those
commands to the other devices; Velair does not perform that extra propagation.

For example, a room may have three radiator valves plus a room controller that
also appears as a `climate` entity. If the installation propagates commands from
that controller to the valves, include all four members, select the controller
as the temperature reference, choose **Selected member**, and select it as the
command recipient. All four remain visible, with one schedule and one
preconditioning decision. If each device needs a direct command, use **All
members** instead.

These options select the command destinations; neither creates independent
schedules or learning models for the members.

### Adopt an existing configuration

Adoption creates one shared Velair configuration from the selected member's
schedules, Profiles and control settings. It replaces the members' independent
control configuration; it does not maintain separate synchronized copies or copy
device firmware settings. Each physical climate keeps its own Comfort settings,
sensors and thresholds; these are not replaced by the selected member's settings. Existing learning histories are not merged. The group's native
reference, command recipient and initial configuration source can be different
members.

Velair validates the complete group before saving. A climate can belong to only
one group. Unsupported combinations must be resolved before the group can be
used; grouping does not add HVAC capabilities to a device. External schedule
execution cannot own a grouped member at the same time as Velair.
Command destinations must share supported modes, overlapping temperature limits
and a compatible temperature step grid. When their active HVAC modes differ,
select an explicit mode instead of asking Velair to preserve a shared mode.

## Shared control and individual observations

Schedules, Profiles and other room-control selectors show the group instead of
its individual members. Edit the existing schedule and feature controls as usual.
The group stores one configuration, rather than separate synchronized copies.

Comfort remains individual: its panel and cards show each physical climate with
its own measurements, sensors, thresholds and monitoring switch. An optional
external Room Assist sensor for the group does not replace those readings unless
you explicitly select that sensor in a member's Comfort settings. Creating,
editing or dissolving a group preserves each member's Comfort configuration.
Groups saved before independent Comfort storage was available initialize each
member from the group's previously saved Comfort settings; each copy can then be
edited independently. Earlier individual settings cannot be recovered automatically.

**Overview** continues to show each physical climate. Its group identifies the
shared schedule and control authority, while its temperature, availability and
device state remain individual. A control action on a grouped member applies to
the room; it cannot create a competing independent schedule.

**Next events** shows each physical climate, with its group identified below the
name, matching the individual rows in **Today's timeline**. Members display the
same authoritative group event; Velair does not create separate schedules or
backend events for them. Select a climate name to open its group's shared
schedule on the event's weekday, including a Profile's own schedule when it
provides the event. Planned Return uses the destination mode's programming.
This also works from a dashboard Next events card. A card filtered to one member shows only that member; a group filter shows
all its members.

Select a group in the list to edit it in the adjacent detail panel, using the
same list/detail layout as Templates and Supply control. Its summary identifies
members, temperature source and command destinations, together with shared
control and preparation status. The header action reviews and saves changes;
removal is available from the group list and requires confirmation.
Field help explains the reference, delivery and configuration choices. If required
information is missing, reviewing changes identifies the fields to complete.
While editing, the status summary continues to describe the saved group until
the reviewed changes are saved.
Diagnostics keeps device-level evidence separate from the room's common intent.
Successful Home Assistant service calls do not prove valve movement or heat flow.
When commands are sent to a selected member, Velair does not claim it directly
commanded the other members.

## Temperature reference and Room Assist

With normal scheduling, Velair sends the shared target to the configured
recipients. Each device still regulates internally using its own sensor; choosing
a group temperature reference does not change the device's firmware regulation.

**Temperature reference** supplies the group's native reading for preconditioning,
thermal learning, Room Assist's native baseline, supply-demand estimation and
the group summary. Choose it from the group's members. Configure an optional
external room sensor in [Room Assist](room-assist.md#room-groups), not as another
native reference in the group editor. When Room Assist is enabled, that external
reading becomes the effective room measurement and Velair computes one shared
correction. Commands still use **Command delivery**.

Comfort remains independent: enabling group Room Assist does not replace each
member's Comfort sensors or thresholds.

## Pauses, Manual adjustment and resuming

A group has one scheduling authority. A Velair zone pause or boost requested
through any member therefore applies to the group, not just that device. The
Room groups tab shows the saved control state; it has no separate pause button.
Use the existing member controls. Resuming that same shared pause from another
member has the same scope. Other independent pause reasons still take priority
until they end or are removed. A global Pause or Stop continues to affect all
rooms, including ungrouped climates.

Pausing scheduling does not necessarily turn the devices off. The selected pause
action decides whether Velair preserves the current device states or sends Off
to the group's configured command destinations.

The **External adjustments** policy in Settings belongs to the group. A detected
external target or HVAC-mode change on one member can place the whole group in
**Manual adjustment**, subject to the same scheduler and pause rules as an
independent climate. With **Until next block**:

1. Three members are following a shared target of `20 °C`.
2. An external change raises one member to `22 °C`.
3. Velair yields scheduling authority for the whole group, preserving the member
   states. It does not copy that external change to the other devices: they can
   remain at `22, 20, 20 °C`. The installation itself may still propagate changes.
4. At the next block, Velair returns to Automatic control and delivers the shared
   target to the configured destinations. You can resume Automatic earlier.

| External adjustments policy | Group behavior |
| --- | --- |
| Keep automatic | Velair retains scheduling authority and reapplies the current effective intent when one exists. |
| Until next block | Manual adjustment ends at the next applicable block. Without a future block, resume Automatic explicitly. |
| For a duration | The group yields for the configured duration. Further external changes renew that duration. |
| Until resumed | The group yields until you explicitly resume Automatic control. |

Explicitly selecting Manual uses the group's saved policy and preserves current
member states. If that policy is **Keep automatic**, explicit Manual instead
lasts until you resume it. Room Assist yields during Manual adjustment.

This Manual/Automatic control is separate from the **Manual** Mode label used
when choosing Profiles directly. See [External changes and Manual
adjustment](manual-control.md) for policy priorities and special block behavior.

## Display order

Use the existing ordering controls in Settings to move groups and independent
climates. A new group initially takes the position of its earliest member.
Order members inside the group's detail panel in the Room groups tab. Overview expands the group into
individual consecutive entries in that order; scheduling selectors show one
entry for the same group. Both orders are saved by the backend.

The member list shows only selected climates. New selections are appended without
changing the existing order. Use the arrow controls to reorder members and the
remove control to remove one. Longer lists can be expanded to show all members.
Membership edits are applied only after reviewing and saving the group.

## Learning and membership changes

The group learns one thermal response, with separate heating and cooling histories.
With Room Assist disabled, its own temperature comes from the selected member.
Room Assist uses its configured external sensor only when enabled, following the
same control, correction limits and preparation rules as an independent climate.
Selecting a sensor alone does not enable assistance. Clearing or disabling it
returns the group to its member temperature reference. Commands still follow the
group's delivery mode, and the real scheduled target remains unchanged by temporary
Room Assist corrections. Existing independent histories are not combined.
Velair stores learning for the group, not a separate model for each member.
Individual device observations remain available in Diagnostics. Group creation
starts fresh; it does not merge previous independent learning histories.

| Change | Learning afterward |
| --- | --- |
| Rename the group or reorder its members | The group's learning is retained. |
| Add or remove a member | The remaining group restarts learning because its physical composition changed. A removed member starts independent learning from zero. |
| Change the temperature reference or command-delivery configuration | The group restarts learning and cancels the previous active observation. |
| Dissolve the group | Each member starts independent learning from zero. The former group history is removed. |

Removing a member gives it an independent copy of the common configuration.
Dissolving a group does the same for all members. Active boosts, pauses and thermal
history are not copied into these independent rooms. Review the resulting
schedules and Profiles after changing ownership.

For example, removing one climate from a three-member group leaves two members
with a new group learning history and one independent climate with a new history.
Deleting the group makes all three independent. Neither operation restores their
older pre-group histories automatically. In the editor, keep at least two members
in a saved group; dissolve it if the devices should all become independent.

## Before testing the beta

Back up the configuration and include preconditioning learning if you need it.
After reviewing and saving a group, check:

- One group appears in scheduling, Profiles, Preconditioning and Room Assist.
- Every member remains visible individually in Overview, Next events, Today's
  timeline, Comfort and Diagnostics.
- Command delivery matches the installation: all members receive direct commands,
  or the selected recipient receives them and the installation propagates them.
- Changing a member's Comfort settings leaves the others unchanged.
- A pause or Manual adjustment from a member has shared room scope.
- Reloading Home Assistant preserves the group, member order and shared setup.

When reporting a problem, include the delivery mode, temperature-reference member,
whether Room Assist is enabled, and the relevant Diagnostics evidence. A service
call succeeding is different from a device reporting the requested state.

Earlier beta configurations may contain an external group reference. Loading or
importing them preserves that reference without automatically choosing a member or
enabling Room Assist. The group editor identifies that legacy value and asks for a
member reference before saving an edited group. Configure the external sensor in
Room Assist when switching to the new arrangement.

Room groups and shared supply groups serve different purposes. A room group owns
one room's control; [Supply control](shared-climate-supply.md) aggregates demand
from rooms to operate a common source. Linked templates share schedule content
without changing room ownership. Preconditioning dependencies coordinate separate
rooms while keeping their learning independent.
