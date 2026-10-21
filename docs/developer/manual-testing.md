# Manual Testing

## Shared Command Button Sizing

1. Compare Active setup's Change summary with ordinary text/icon commands in
   Schedules, Profiles/Modes, Templates, Settings and Diagnostics, including
   dialog Save/Cancel and colored success/warning/danger actions. Single-line
   commands should use the same compact border-box sizing without stretching
   vertically to match adjacent content.
2. Check the compact variant, disabled state, keyboard focus and native summary
   menu Enter/Space/Escape behavior. Confirm no action behavior changed.
3. Repeat at 320px phone and tablet widths with long labels and icon/text
   combinations. Labels must remain usable and commands may grow to fit wrapped
   text. Existing full-width mobile footer layouts should remain intact.
4. On coarse-pointer devices, check comfortable 44px command targets, including
   compact variants. Distinct icon-only controls and contextual action layouts
   retain their own sizing conventions.

## Base Profiles And Zone Exceptions

1. Select a multizone Winter Mode. Apply a Profile to two of its rooms and verify
   that the other rooms retain the base. Apply another Profile in a later action
   and verify only shared rooms are replaced.
2. Submit those overlapping Profiles together: the action must fail without
   changing any room or cancelling Return home.
3. Set one room to Default, then return it to base. Verify these are distinct
   choices and no previous exception reappears.
4. Clear all exceptions: the original base Mode label returns. Select another
   Mode or activate a base Profile: all exceptions disappear.
5. Edit Profile schedules and a selected base Mode, restart HA, and check that
   persisted exceptions retain their room scopes. Attempt to remove a referenced
   Profile room before clearing its exception: saving must fail clearly.
6. Run two room automations concurrently and repeat with heat/cool equipment,
   an unavailable device, Boost, window Pause and an externally executed zone.
   Unrelated rooms and external publication attempts must remain unaffected.
7. Start and cancel Return home from a base with exceptions; cancellation that
   restores the previous setup must restore all exceptions. Verify external
   selection cancels the return, including its documented global preparation effect.
8. At phone, tablet and desktop widths, and in a narrow card on a desktop, check
   Base/Exceptions attribution. Cover Mode, one Profile, multiple Profiles and
   Default bases, with and without exceptions and with a fully replaced base.
   Check inherited base coverage against managed zones: same-Profile and null
   exceptions reduce it; Default fallback outside a Profile base does not add
   to its scope. Distinguish an empty scope from a fully overridden one. Check
   base Profile icons/colors and names in the legend, without a redundant Mode
   component list. On desktop, Base uses less width than Exceptions.
   Household distribution starts collapsed and contains both bar and legend.
   Verify toggle, Escape/focus, stable header coordinates, reduced motion,
   collapsed accessibility/focus exclusion and no HA mutation requests in all
   control scopes. Open content refreshes with data; zero managed zones resets
   expansion. Counts align at the right, while long names wrap independently
   beside 14px icons and remain legible at mobile widths.
   The compact 6px distribution bar beneath the base summary must use actual Profile
   colors/icons and labeled counts. Cover all managed zones, keep same-Profile
   base/exception origins distinct, and use neutral Default for uncovered zones
   and explicit Default exceptions. Its total is the managed-zone count and its
   exception counts match the list, including zones outside the base. Ignore
   stale unmanaged references. Check empty base scopes with managed zones and
   zero managed entities (no bar). No duplicate fully-overridden note should
   appear. Base icon stays aligned to its header even with a long legend;
   the Exceptions heading has the layers icon. Repeat at narrow mobile widths.
   Exception groups must include only explicit overrides, with accurate room
   counts and a separate Default group. Room names stay hidden until a count is
   selected; expand that group beneath its row, preserving the other rows.
   Check compact secondary zone names aligned beneath the Profile, one zone per
   line, no bullet indentation and uniform compact spacing between Profile
   groups. The count's touch target must not push zone names away from the
   Profile name; extra panel height must not stretch exception rows apart.
   Check normal heading-to-content spacing and compact desktop exception rows;
   coarse-pointer devices retain comfortable touch targets. Closed counts align
   with their Profile names.
   Leave the pointer over a count and expand/collapse repeatedly at that same
   position. Header/count coordinates must stay fixed; only content below
   should move. Repeat with a long Profile name and with reduced motion.
   Check chevron/expanded state, gentle animation, reduced-motion behavior,
   a long list's scroll and collapse with the same count or Escape. Opening
   another group closes the previous one. Confirm collapsed lists have no
   keyboard stops or accessible contents and Escape returns focus to the count.
   Confirm data updates refresh names/counts, and a
   removed group does not leave stale detail visible. Verify no inspection action
   sends a mutation request. Check Base and type share a context row above the name,
   long names wrap, no horizontal overflow appears, and the chooser remains
   reachable by touch and keyboard. No per-zone editing disclosure is present.

## Temperature-only block ownership

Use a managed heating climate and a managed cooling climate. For off-state
testing, use an integration known to accept target updates while off, such as
Better Thermostat. Observe Home Assistant service traces as well as entity state.

1. Create a temperature block and select **Temperature only**. Save and reload.
   Confirm the selection and target survive; repeat through a Profile, shared
   preset, full template, hours-only binding, and export/import.
2. Apply while off. Expect only `climate.set_temperature`, no `turn_on` or
   `set_hvac_mode`. Turn on externally; change between compatible heat/cool
   modes; expect the actual mode to remain externally selected.
3. Under every external-change policy, turn off and on from a Home Assistant
   card. Expect no Manual adjustment solely for HVAC changes. If the integration
   hides/restores target attributes with that transition, they must not be
   interpreted as a separate manual setpoint. Change a finite target separately
   and verify the configured target-change policy still applies.
4. Enable Room Assist and advance preparation. Turn off during assistance or
   preparation. Expect no stale mode restoration, new preparation, or thermal
   learning while off. Turn on again and verify current authority is resolved.
5. Use the window blueprint with **Turn off**. Open then close the contacts.
   Resume must update the temperature without starting the climate. Repeat with
   two independent pause IDs: removing the first must not resume the schedule.
   Repeat with an ordinary Keep block and verify its existing restart behavior.
6. Use occupancy/seasonal actions to select a Profile containing this policy.
   It must preserve off. A separate direct HVAC action and an explicit-mode
   destination block must still work normally.
7. Disconnect/reconnect with a delivery pending, change the active block or
   Profile before recovery, and confirm recovery uses the current policy.
   Exercise explicit Boost, expiry, pause/resume, and Home Assistant restart.
8. Test a target capability hidden while off: Temperature only reports failure
   without activation, while the legacy Keep and explicit-mode compatibility
   paths continue to work. Test a native range with advertised range capability
   separately; never convert scalar and range targets.
9. On phone/tablet layouts, confirm the mode choice, explanatory text, range
   controls, preset library, and summary labels remain usable. Verify optional
   device controls cannot be combined with Temperature only.

An accepted service call is not proof of physical state. Record any integration
that wakes internally on a target update; Velair cannot guarantee its behavior.

## Day layouts and grouped schedules

### Template library application

1. On a saved template, open Apply to. Check initial Default, Independent copy,
   Individual days and no selected destinations. Unsaved template edits must be
   saved before Review. Template selection/navigation protects edited review data.
2. Select Default or an existing Profile. Try seven individual choices, weekday
   and weekend groups, and the full week. Destination/layout changes clear
   selections; changing copy/link mode preserves them and invalidates review.
3. Review overwrites, layout changes, Profile behavior conversions and mixed
   unselected groups. Back must not save. Accepting a mixed-group warning must
   preserve its days. Applying to an inactive Profile must not activate it.
4. With Times only, choose an explicit base for different configurations. Check
   exact/nearest preceding/following proposals and preserved preset references.
   Missing compatible assignments require editing, with template times locked.
   Every selected group receives one reviewed binding set. No Profile own
   schedule means manual completion, not silent borrowing from Default/template.
5. Check Independent copy and Times and settings propagation after later template
   edits. Change configuration/template while Review is open: stale results must
   not enable Apply or replace newer input. Reject an incompatible target in a
   multi-zone request and simulate storage failure; nothing may be partially saved.
6. Test at 320/375px phone, tablet and desktop widths with long names, light/dark
   themes and keyboard navigation. Group choices and review editors remain usable
   without horizontal table scrolling. Test heating, cooling, unavailable/off
   devices and external schedule limits. Preview has no runtime effects; Apply
   retains normal Boost/pause priorities and external delivery semantics.

### Schedule editor grouping

1. On a Default zone, select weekdays/weekend, save, reload, and verify the same
   seven cells as Individual days. Selecting Tuesday selects all five weekdays;
   selecting Saturday selects both weekend days. All days selects all seven.
   With Sunday first, Sunday and Saturday are both active at opposite ends.
   Only physically adjacent active cells connect, with no change in cell positions.
   At normal and fractional browser zoom, joined cells have flat top/bottom
   edges without protruding seams. Check weekday/weekend and all-days layouts
   on mobile and desktop; focus outlines and unsaved dots remain visible.
2. Assign a different predefined layout to a zone inside a Profile. Save the
   Profile and verify each zone independently retains its selected layout.
3. Verify there are exactly three layout choices and no create/manage/delete
   layout controls. Changing the layout preserves saved blocks and issues no
   climate actions. On an empty schedule, layout/day navigation has no discard prompt.
4. In Weekdays / Weekend, start with different Monday and Tuesday configurations.
   Inspect both, choose Tuesday as the base, and verify that editing remains hidden
   until Save succeeds. Only the five weekdays should change. Repeat with mixed
   Saturday/Sunday schedules: save only those two days and retain the weekend
   selection after success, even when weekdays have different configurations.
   Repeat with inline presets and hours/full template links.
   In All days, selection also leaves the block/template/copy editor hidden.
   Save must apply the explicitly selected alternative without another confirmation.
   Only after successfully saving the selected group should the common editor open.
   A failed or revision-conflicted save retains the selection and
   comparison without exposing the editor. Repeat for Default and Profiles.
   In a Profile with pending All days and Weekdays / Weekend replacements, Save
   commits the complete candidate without a redundant replacement confirmation.
5. Verify grouped timelines show common configured blocks without a representative
   selector or day-specific carry-over. Individual-day timelines retain weekly
   continuity. Save as template and verify one daily list is created.
6. While a draft is dirty, change its saved layout in another browser session.
   Verify the draft survives and saving requires resolving the conflict. Verify
   revision conflicts, incompatible modes/ranges and controller day limits never
   produce partial grouped saves.
7. Grouped editors omit the day-to-day clone panel, its helper and any shortcut
   to Individual days, in both Default and Profiles. The regular Day layout
   selector remains available. Cross-thermostat clone labels identify Monday–Friday,
   Saturday–Sunday or All days; Profile confirmation identifies the same scope.
   Copy a grouped schedule to another managed zone. Verify the same weekdays
   change while its existing layout and other weekdays remain intact. Verify
   day-to-day cloning remains available in Individual days.
8. Export/import zones and Profiles with each predefined layout. Import an older
   file containing custom layouts and verify individual-day presentation without
   losing blocks, presets or links. Restart HA and verify saved predefined selections.
9. Check selector, fixed weekday cells, mixed-day inspection and editor at 320px, 440px,
   tablet and desktop widths, with keyboard navigation and light/dark HA themes.
   Use seven different schedules and long template names. Open the information icon and
   verify wrapped summaries and no horizontal overflow. With no selected base,
   Save must be disabled. Select an alternative by tapping anywhere on its
   configuration, verify the selected background/border, then select another: only
   the second stays selected and its blocks become the common draft. Repeat
   with arrow keys, Space and Enter. Opening schedule information must not change selection.
   After saving a Weekdays / Weekend base, edit the common schedule, cancel
   navigation to another group and verify those edits survive. While a save is
   pending, day/group, zone and layout navigation must not replace its draft.
   Save is separated from the content and right-aligned. Verify the
   Overview's compact track height, rounded surfaces and inline target/mode
   labels in both themes. No permanent block list or expanded disclosure should
   appear below candidates. Compare equal-width Overview and candidate tracks
   using identical blocks. Candidate blocks must have no
   drag/resize handles or independent keyboard tab stops. On touch and keyboard,
   inspect all times/options/references, close the popup with Escape or outside
   interaction, and verify that selection and Save state remain unchanged.
   Verify visible colored weekday chips and a single information icon with no separate
   check/radio marker. Hovering a selected row must preserve its selected fill.
   Check narrow blocks, 23:59 starts, unknown references and scalar/range/option-only configurations.
   After selecting a base, check the Save summary identifies its source day and
   every destination day, including Sunday-first weekend ordering. Profile
   summaries must describe the visible selection without implying that unrelated
   pending Profile edits will be excluded from Save profile.
   Empty alternatives show No own blocks once, with no zero-block count. Their
   information explains removal of own blocks and continuing weekly continuity,
   without implying an off action. Visually matching alternatives with different
   template scopes or preset references show compact dependency labels, using
   names when available; full references remain in information. Check wrapping
   at 320px and preserve single selection and keyboard operation.
   In All days, also compare five identical weekdays with two empty weekend days: there
   should be two alternatives, with all member days identified. Equal resolved
   temperatures with different template/preset references must remain separate.
   Verify compact read-only previews for heating, cooling, ranges, off and
   options-only blocks; empty days must not imply a climate-off action.

Use this checklist before publishing a release or after changing scheduler behavior.

## Schedule Save Latency

Enable DEBUG logging for `custom_components.velair.save_timing` temporarily and
reproduce a slow Default schedule save. Disable it after collecting the sample.
`Schedule save timing` summaries contain an opaque trace identifier, operation,
elapsed milliseconds, phase durations and call counts; they exclude schedule
payloads, entity names, temperatures and exception text.

- Compare `daily`/`grouped` total time with `mutation` and `response`.
- Inspect `configuration_lock_wait`, `zone_lock_wait`, `validation`, `storage`,
  `reconcile`, `room_assist`, `climate_apply`, `external_publish`, `reschedule`
  and `notify` to locate backend work.
- `future_events` and `next_action` include call counts that expose repeated
  calculation. Durations are inclusive: phases can overlap and must not be summed.
- Independent `response` traces also cover subscription responses constructed
  outside a save request. A returned handler may have sent a validation error;
  `outcome=returned` is not confirmation that configuration was saved.
- Repeat a current-intent change and a change that preserves current intent,
  using heating and cooling. A different weekday can still own the active target
  through weekly continuity. Compare local and external execution where applicable.

These timings start when the backend handler runs and end after its result is
queued. Network delivery, earlier event-loop queueing and browser rendering are
outside that total. If the UI is slow while backend timings are short, inspect
the browser's WebSocket request/result and subsequent rendering separately.

## Scheduler Transition Regressions

Use explicit HVAC modes and inspect actual climate service calls as well as the
next-event display. Repeat applicable scenarios for heating, cooling and native
`heat_cool` ranges; verify both range limits are preserved.

1. Set climate A to start early at `03:45` for `05:30` comfort. Give climate B
   an early start at `04:15` and a normal block at `05:00`. Verify both B actions
   occur on time while A's comfort target remains visible. Repeat with B's
   preconditioning disabled and with simultaneous transitions across zones.
2. In one zone, set `Off` at `19:00` and heating at `20:00`, with a thermal
   prediction of `18:00`. Verify the early start is suppressed, `Off` applies
   at `19:00` and heating at `20:00`. Repeat with a preceding temperature or
   option-only block. Check an `Off` block at `22:00` the previous evening does
   not prevent a `05:35` early start for `07:00` without an intervening block.
3. Enter `until_next_block` Manual adjustment at `18:05` in the preceding
   scenario. Verify its deadline is `19:00`, then `Off` is authoritative.
   Repeat without the intervening `Off`: the deadline is the nominal comfort
   time, not its predicted early start. Repeat with Default and Profile schedules.
4. Delay A's `19:30` climate service until `19:32`; give B a block at `19:31`.
   Verify B receives its currently valid target after the delay. Cross several
   B transitions and verify only the current intent is applied, rather than
   every missed intermediate order. Delay the callback itself as a separate case.
5. During that delay, edit a schedule or Profile, activate a pause, Boost or
   Manual adjustment, disable a zone, or delegate it to External schedule
   execution. Verify current authority is resolved before delivery and no stale
   schedule target bypasses those changes. Edit a schedule during an active early
   window and verify superseded preconditioning targets are not restored.
6. Repeat boundary cases across midnight, the weekly wrap and Home Assistant's
   configured DST changes. Restart with active-schedule application enabled and
   disabled; verify each retains its documented behavior without replaying
   historical transitions. Verify Planned Return arrival prediction and delivery
   remain independent of the weekly overlap restriction.

## Preparation

- Use a non-critical Home Assistant instance.
- Choose safe `climate.*` entities.
- Avoid hardware where unexpected temperature changes would cause discomfort or waste energy.
- Keep Home Assistant logs open.

## Install

Install through the default HACS store or copy:

```text
custom_components/velair
```

to:

```text
<home_assistant_config>/custom_components/velair
```

Restart Home Assistant.

## Panel Navigation And Direct Links

Run these checks on desktop, mobile, tablet, and the Home Assistant Companion
app, with English and Spanish selected. These are validation steps, not a claim
that live-device testing has already been completed.

1. Open every canonical path in the
   [route table](../user/usage.md#panel-navigation-and-direct-links), refresh it,
   and copy it into another browser session. Confirm the same tab and subsection
   load, including Profiles and Climate presets when backend loading is slow.
2. Switch tabs and subsections. Confirm the URL follows the accepted selection,
   and selecting the current destination does not add a history entry. Use Back
   and Forward to revisit both tabs and subsections.
3. Try the bare Schedules/Templates paths, Overview and legacy Profiles aliases,
   an unknown tab, and an unknown subsection. Confirm the documented fallback
   and canonical URL without an extra history entry.
4. Edit an unsaved Default or Profile schedule. Navigate away, cancel, and
   confirm the draft, section, and URL remain. Repeat with browser Back twice,
   then accept and use Forward. Confirm one prompt per attempt and that no
   previous destination disappears from history. Check tab changes with dirty
   templates and presets too; subsection switches retain existing draft behavior.
5. Open a section using the dashboard-button example in the Usage Guide, then
   repeat Back/Forward with a dirty draft. Follow the existing resource-usage
   and Edit preset shortcuts; verify the matching subsection and that cancelled
   navigation does not open the pending resource.
6. Leave Velair for another Home Assistant page while its panel remains mounted.
   Confirm it does not redirect back to Velair. Use optional Lovelace cards and
   confirm their local view changes do not overwrite the dashboard URL.
7. Confirm opening any route does not activate a Mode, write configuration, or
   change a climate. Refreshing restores the section only, not an individual
   climate/day/resource selection or an unsaved draft.

## Panel Data Session

Run on desktop, mobile, tablet, and Companion. These are checks to perform on a
live instance, not a record of completed device testing.

1. Enter Velair with a slow connection. Confirm the initial loading indicator
   still works. After data arrives, visit every tab, including Diagnostics,
   and use Back/Forward. There should be one schedule subscription for the
   mounted panel, with no new `velair/get_schedule` request caused solely by a
   tab or subsection switch. Feature-specific requests remain valid.
2. Edit Default schedules, Profiles, templates, presets, and Planned Return.
   Receive an external update while editing; confirm the draft remains intact.
   Cancel navigation and confirm draft, URL, and screen stay together. Accept
   navigation and confirm the established discard behavior.
3. Save a change, then immediately switch tabs and return. Repeat with import,
   reset, Mode/override actions, and nested Profile/preset/Planned Return editors.
   Confirm the next tab uses the confirmed state, including runtime updates
   that do not change the configuration revision.
4. Disconnect and reconnect Home Assistant without leaving the panel. Repeat
   with a replaced connection. Confirm current data is recovered, unsaved
   drafts survive, and delayed old requests or callbacks cannot overwrite it.
5. Enter and leave Diagnostics while receiving diagnostic messages. Confirm
   its separate subscription closes when the view is removed and its overlay
   does not replace the shared schedule snapshot.
6. Leave Velair until Home Assistant unmounts the panel. Confirm its schedule
   subscription closes, including when subscription setup is still pending.
   Reopen Velair and confirm a fresh session starts. Browser backgrounding
   alone need not unmount the panel.
7. Open Lovelace cards with the panel closed. Confirm their loading, updates,
   drafts, and cleanup still work independently and keep the dashboard URL.

## Lovelace Data Session

Run these scenarios on desktop, mobile, tablet, and Companion. Synthetic browser
checks do not replace live Home Assistant lifecycle validation.

1. Compare a fresh page load with one Climate card, two cards (Climate and
   Planned Return), and six cards (Active setup, Events, Preconditioning,
   Sensors, Comfort, and Climate). Check one `velair/get_schedule` request and
   one `velair/subscribe_updates` subscription for all mounted cards on the
   same connection. The subscription's initial snapshot remains expected.
2. Visit a different Lovelace view and return without refreshing. Cards that
   Home Assistant retains mounted should keep receiving data and reuse the
   session. Hide/show cards, then remove them; the last actual unmount should
   close the subscription. Reopening after all cards unmount starts a new load.
3. Use different entity filters, climate selections, weekday starts, and zone
   orders. Confirm each card retains its configuration and draft. Receive an
   external change during editing, save from another card, and cancel a discard
   confirmation. No unrelated draft should reset and the dashboard URL should
   remain unchanged. Repeat with heating and cooling schedules.
4. Change an indoor/outdoor sensor relevant to multiple cards. Confirm their
   refresh requests are grouped and the eventual snapshot includes the current
   state. Repeat while a previous request is still pending.
5. Disconnect/reconnect Home Assistant, replace a card's connection, and remove
   all cards while setup or a save is pending. Confirm stale callbacks cannot
   replace newer data and a late subscription handle is released. Cards on
   different connections must have different sessions.
6. Open the sidebar panel alongside cards retained by Lovelace. Confirm the
   panel keeps its own session and closing either set of owners does not stop
   the other. Diagnostics remains view-local; save/conflict errors and unsaved
   Planned Return edits must survive unrelated runtime updates.

## Climate Card Editor And Actions

Header checks:

- Verify the header with and without a reported `hvac_action`. When it is
  absent, the HVAC mode must appear only once and must not be presented as an
  active heating or cooling action.
- Check heating, cooling, idle, off, unavailable, and externally managed zones.
- Force an `off` entity with a stale `hvac_action: idle`; confirm the header uses
  the power icon and Off, does not repeat Off, and does not look paused. With an
  active Heat or Cool mode and `hvac_action: idle`, confirm the neutral thermostat
  icon and attenuated mode-colored line are used.
- Confirm the top line uses warm heating/preheating, blue cooling, steady
  drying/fan, neutral off, and an interrupted unavailable treatment. It must not
  imply progress or change for Boost, Pause, or external ownership. Enable
  reduced motion and confirm its sweep is disabled.
- At card widths around 380 px, confirm that the Velair shortcut keeps its
  slightly enlarged logo beside the two-line `Velair` / `by cgonfer` signature
  without overlapping a long climate name or losing its keyboard focus
  indication and touch target.
- Toggle the climate name and operating state independently; hidden items must
  not reserve empty header space, while the fixed Velair signature remains.

1. Add a `view: climate` card, select a climate, and confirm its friendly name
   initially fills the custom-name field.
2. Delete the complete name and confirm it stays empty after every editor
   refresh. Enter another label, reopen the editor, and confirm the exact value
   remains selected. Use Reset and confirm the current entity friendly name is
   restored.
3. Confirm Room Assist display, default presentation, and graph settings are
   grouped in one editor section. Confirm the corresponding preconditioning
   settings are grouped in their own section.
4. Reorder Boost, Pause/Resume, and scripts in the single action list. Confirm
   every row keeps its move controls first, then its icon and name, with delete
   available only for script shortcuts and the disclosure control last. Hide
   each Velair action independently and confirm it is identified as supplied and
   not customizable. Confirm external and unavailable zones never expose
   Velair-only actions, while later eligible scripts move up without leaving gaps.
5. Add at least five existing `script.*` entities. Configure distinct names, MDI
   icons, colors, order, and confirmation values. Reopen the editor and confirm
   every value and the selected climate are preserved. Confirm the editor states
   that the direct-action limit is three, does not expose a limit setting, and
   explains Automatic and More menu placement for every action.
6. Open **More** near each viewport edge on desktop and mobile. Confirm the menu
   stays fully visible, prefers opening below, opens above when required, and
   scrolls internally when its contents cannot fit.
7. Run an unconfirmed shortcut and confirm Home Assistant receives only
   `script.turn_on` with its selected `entity_id`. Cancel a confirmed shortcut
   and confirm no service call occurs; accept it and confirm exactly one call.
8. Remove or disable a configured script and confirm its shortcut is visibly
   unavailable and cannot run. Confirm arbitrary services, payloads, templates,
   and JavaScript cannot be configured through the editor.
9. Confirm the first three eligible actions using Automatic placement are direct
   and **More** contains automatically overflowing and explicitly delegated
   actions in their configured relative order, followed by **Open Velair**.
   Delegate one of three actions and confirm **More** appears; return it to
   Automatic and confirm **More** disappears. Delegate every action and confirm
   the card shows only the icon-only **More** button. Confirm the actions share
   the top of the climate control surface with Automatic/Manual as two separate
   islands aligned to opposite ends. At narrow widths, confirm both remain in one
   row and only the actions island gains horizontal scrolling, without exposing
   more than three direct actions plus **More**.
   Give a direct action a long visible name and confirm its button grows enough
   to show the complete name on one line; the actions island must scroll instead
   of truncating or wrapping the label. Confirm hidden-name actions remain compact.
   Confirm the native scrollbar remains hidden, the left and right indicators
   appear only while content remains in that direction, stay outside the
   scrollable action row, and keep their fixed outer slots when hidden so no
   indicator changes the toolbar width or height. Swipe the row on touch and
   drag it with a primary mouse or pen pointer. A drag must not execute the
   action beneath it, while a normal click must still work.
10. Open Boost and Pause. Confirm each form replaces the normal HVAC mode,
    target, and Home Assistant pane without moving to another section. Close it
    with Cancel and by pressing its selected action again, and confirm applying
    either action returns to the normal controls. Confirm the selected action
    includes a close icon. Run successful and failing custom scripts and confirm
    the direct action briefly shows distinct progress, success, and error feedback.
11. Hide every thermostat control while keeping actions visible, then hide the
    actions too. Confirm the actions-only surface remains complete and that no
    empty control container remains when every internal item is hidden.
12. In Manual adjustment, change the target repeatedly with the decrement and
    increment buttons. Confirm the Automatic/Manual selector remains visually
    stable while each Home Assistant service call is pending. Confirm the same
    for the complete lower surface: HVAC mode icon and label, selector accent,
    target value, and `−`/`+` controls must not dim, flatten, or flash while the
    request is in flight.
13. Set Current state's default presentation to collapsed and reload the card.
    Confirm temperature, humidity, outdoor context, non-zero window states, and
    Comfort appear as compact theme-safe items only when their expanded
    counterparts are enabled. The compact sensor items must wrap onto as many
    rows as the available width requires; they must not scroll horizontally or
    expose directional controls. Confirm an available Comfort assessment appears
    as a separate descriptive row below the collapsed heading, with its icon,
    condition, air-quality context, and accent. Confirm that an unavailable
    assessment is omitted without leaving an empty row and that the expand
    control remains visible. Expand it again, click outside the chevron on
    several points of the complete heading to collapse it, and confirm both
    transitions are smooth; repeat at mobile width and with reduced motion.
    Change the configured default to expanded, reload, and confirm the initial
    presentation changes without preventing later manual collapse or expansion.
14. Repeat in Home Assistant light and dark themes, with keyboard focus and
    Escape, and with an externally executed zone. Custom scripts may remain
    available externally, but Boost and Pause/Resume must not appear.

## Setup Flow

1. Go to **Settings > Devices & services**.
2. Add Velair.
3. Select one or more `climate.*` entities.
4. Confirm setup completes without log errors.
5. Confirm Velair appears in the sidebar.
6. Open Velair Settings and confirm the read-only temperature unit matches Home
   Assistant's configured unit system.

## Legacy Temperature Migration

1. Load published unitless v1.1 storage under Fahrenheit and confirm it is
   treated as Celsius without automatic conversion.
2. Confirm no climate action is applied,
   the scheduler status is `temperature_migration_required`, and Home Assistant
   creates one persistent Velair notification.
3. Confirm services, normal configuration writes, and import are rejected, while
   export remains available as a reference backup and Reset Velair is offered.
4. Reset and confirm fresh schedules, templates, Comfort, Room Assist, and
   Adaptive Preconditioning defaults are valid Fahrenheit values.
5. Confirm the notification is dismissed and scheduling resumes only after the
   reset payload is stored and runtime cleanup succeeds.

## Home Assistant Unit Change

1. Start with runtime-unit storage whose declared unit matches Home Assistant,
   then change Home Assistant to the other temperature unit.
2. Confirm scheduling and thermal writes stop, export remains available, and
   Settings shows the stored source and current target units.
3. Leave the action untouched and confirm Velair does not convert or resume
   automatically.
4. Run the explicit migration and confirm schedules, templates, overrides,
   Comfort, Room Assist, Adaptive Preconditioning settings, rates, and learning
   remain physically equivalent.
5. Confirm known climate targets align to the exact published target step. Test
   an unavailable climate and confirm incompatible schedules are reported after
   its capabilities return.
6. Repeat the same migration id and confirm it is a no-op. Repeat with a stale
   revision and confirm it is rejected.
7. Simulate a storage failure and confirm original runtime values remain intact.
   Simulate a post-persist runtime failure and confirm Velair stays stopped with
   recovery guidance until the integration reloads or Home Assistant restarts.

## Portable Temperature Data

1. Export in Celsius and Fahrenheit and confirm portable model v19 records the
   effective `temperature_unit`.
2. Import each newly exported portable v19 file back into the same installation
   and confirm the frontend accepts it and the selected sections round-trip.
3. Import a portable v10 file into the opposite unit and confirm selected
   thermal sections convert. Confirm its Comfort derived-metric and outdoor-
   comparison configuration is retained without importing runtime readings.
   Older supported files, including v8 and v9, must remain compatible.
4. Import a unitless legacy backup and confirm the UI warns that Celsius is
   assumed before the backend converts it when required.
5. Confirm known climate targets use exact published steps. For an entity that
   omits its step, configure the per-zone fallback and confirm migration and
   import align its values to that grid.

## Options Flow

1. Open Velair integration options.
2. Add or remove a climate entity.
3. Toggle startup behavior.
4. Save.
5. Confirm the integration reloads.
6. Confirm removed climates are no longer managed.

## Entities

The integration should create scheduler status/control entities. Exact entity IDs may differ if Home Assistant adds suffixes.

Expected entity types include:

- one Automatic scheduling switch and one Mode select entity;
- one next scheduled event sensor;
- one scheduler status sensor;
- one active target temperature sensor per managed climate;
- environmental condition and air-quality sensors per managed climate;
- zone override, Zone control, preconditioning start, and Room Assist state
  sensors per managed climate;
- one disabled-by-default Zone delivery diagnostics sensor per managed climate.

Confirm that:

- active target sensors use each climate entity's temperature unit;
- their names use the climate friendly name;
- an active target started early by Adaptive Preconditioning exposes both
  `when` and `target_when`;
- comfort and air-quality states remain independent and do not copy raw source
  readings;
- optional features expose clear inactive states when they are disabled or not
  configured;
- Zone control reports `automatic`, `manual`, or `external` while keeping
  pause, Boost, preconditioning, and scheduler activity in `runtime_state`;
- during a required temperature migration, Zone control remains available and
  reports `runtime_state: temperature_migration_required` without projecting a
  stale scheduled or idle state;
- after one accepted scalar, range, and `turn_off` delivery, the enabled Zone
  delivery diagnostics sensor exposes only the applicable target fields,
  recorded temperature unit, timestamps, retry count, and stable error codes;
  it must not expose raw error text or imply device confirmation;
- after reloading the integration, Zone control is reconstructed while Zone
  delivery diagnostics returns to `idle` without a last accepted target;
- turning Automatic scheduling off stops indefinitely and turning it on resumes
  the current schedule;
- removing a climate through the integration options removes its generated zone
  sensors after the integration reloads, without removing global Velair
  entities or entities from other integrations;
- scheduler status values are translated in every supported frontend and backend language;
- changing only a user profile language does not rename existing entities,
  because Home Assistant stores their original names at entity creation.

## Services

Confirm these services are available in Developer Tools > Actions:

- `velair.set_temperature`
- `velair.set_hvac_mode`
- `velair.apply_schedule`
- `velair.boost`
- `velair.pause`
- `velair.pause_zone`
- `velair.resume`
- `velair.resume_zone`
- `velair.set_daily_schedule`
- `velair.copy_day_schedule`
- `velair.clear_schedule`
- `velair.activate_profile`
- `velair.deactivate_profile`

Services with `entity_id` must reject climates that were not selected during setup.

For `velair.set_hvac_mode`, test one supported heating mode and one supported
cooling mode. Confirm the action changes only HVAC mode, preserves the device
target, emits `climate_target_applied` with `source: service_set_hvac_mode`, and
does not enter Manual adjustment. Also confirm `off`, an unadvertised mode, an
externally executed zone, and an unmanaged climate are rejected. Make the
underlying climate call fail while Room Assist is active and confirm no success
event is emitted and Room Assist remains active. Start from `off` on a climate
that restores its previous target when enabled, call the service, and confirm
the restored target is treated as part of Velair's mode change rather than an
external adjustment.

## Climate Profiles Smoke Test

1. Open **Schedules** and switch between **Default schedules** and **Profile
   schedules**. Confirm the current local weekday is selected on entry, remains
   selected while navigating within the workspace, and Lovelace
   `view: schedules` remains Default-only.
2. Edit a Default day, then try to change thermostat, weekday, schedule source,
   and top-level tab. Cancel each prompt and confirm the draft remains exactly
   unchanged. Repeat and accept each prompt; confirm the stored destination is
   loaded and the discarded draft does not return after a WebSocket update.
3. In **Profile schedules**, create a Profile with a name, icon, and description.
   Confirm each row has a right-side vertical action column ordered set as base,
   apply as exception, and delete. No action wraps below the identity, including
   on 320px phones and with long names. Check transparent backgrounds, spacing
   from the right edge, focus, disabled states and comfortable touch targets.
   Base-only, exception-only, both and unused Profiles have distinct indicators;
   descriptions remain visible in every state, followed by separate Base and
   Exception chips only for the roles in use. An unused base action is neutral.
   Usage chips have subtle role colors and no icons. Click row padding and empty
   space beside/below the text: each opens the editor, as does keyboard activation
   of the identity button. Action buttons and their icons perform only their own
   action, including when disabled; they must not select the Profile for editing.
   exception-only use must not mark the base action. Fully overridden bases
   remain marked as base, and partial exception use still marks the layers action.
   Activating/applying must not change the editing selection; confirming deletion
   of the edited Profile clears its editor. Check normal library
   and the Profile schedule selector; Template and Mode rows retain their layout.
4. Give one zone an alternate heat or cool schedule, pause a second zone, and
   leave a third zone on its default schedule.
5. Copy template blocks into one profile day, edit the draft, and confirm the
   template itself is unchanged.
6. Confirm Default and Profile weekly editors present the same sequence:
   weekday, timeline, template, blocks, save actions, cloning to days, and
   cloning to thermostats. Exercise scalar targets, heat/cool ranges, Off
   blocks, and supported fan, preset, swing, horizontal swing, and humidity
   options. Save once and confirm all Profile metadata and thermostat schedules
   are sent as one Profile operation.
7. Enter an invalid target in a non-selected thermostat. Confirm its selector
   is marked as invalid, the visible message names that thermostat/day/block,
   and Save Profile is disabled with an explanation.
8. Start Boost on an affected zone, activate the profile from **Modes**, and confirm Boost is
   cancelled and the block valid at the current time is applied immediately.
9. Confirm the omitted zone continues its default schedule.
10. Activate the profile while Global Pause and then Zone Pause are active;
   confirm selection persists without overriding either pause and applies after
   resume.
11. Select Default from Overview and through
   `velair.deactivate_profile`. Confirm an empty `profile_id` on
   `velair.activate_profile` remains a compatibility alias.
12. Restart Home Assistant with startup application disabled and enabled. In both
   cases confirm the selection persists; only the enabled case should force the
   current target during startup.
13. Export and import the `profiles` and `modes` sections and confirm
   definitions move without activating an imported profile. If the replacement
   omits the active profile, confirm Velair returns to default schedules.
14. Repeat the editor and active selector checks at desktop, tablet, and mobile
    widths in every supported language. At a typical 390 px mobile width,
    confirm each schedule block keeps time, mode, target, options, and delete
    controls in one compact row without horizontal overflow. At exceptionally
    narrow widths, confirm the fallback layout remains readable and usable.
    For every supported non-off HVAC mode, disable the Target input with its
    compact thermometer button and confirm the grey field shows a dash without
    adding a column or depending on visible explanatory text. Enable it again,
    confirm the previous draft target returns, and verify Save requires that
    restored target to be valid. In Keep current mode, choose a preset and
    disable Target; confirm the grey input shows a dash, the preset remains
    editable, and the saved block shows the preset without a temperature.
    Repeat with multiple options, a heat climate, a cool climate, and Spanish.
    Confirm choosing an explicit HVAC mode prevents turning this into an
    options-only block. Apply the preset-only block to a climate that derives
    its own target: Velair must send only `climate.set_preset_mode`, keep an off
    climate off, and avoid reapplying when the derived target changes. For a Keep
    block with a target, confirm the row retains only the compact selected-option
    summary. Open its options panel and confirm the command preview lists the
    temperature, mode behavior, and selected controls; switching to an
    options-only block must remove the target from that preview. Check the
    absence of a separate block-help button in Default schedules, Profiles,
    and templates. The explanation belongs inside the options panel.
    Put a scalar target after an explicit `heat_cool` range
    block: the editor must warn without disabling Save. Check the equivalent
    live-mode warning when no earlier block selects a mode; switch to a
    compatible range or disable the target and confirm the warning clears.
    Repeat with a range after `heat` and `cool`, and review the preview and
    warning in Spanish, on 320–340 px mobile widths, and with keyboard, touch,
    and screen-reader navigation. The options panel must remain within the viewport.
15. Listen for `velair_event` and confirm profile activation, return to Default,
    and deletion of the active profile emit `profile_changed` with the expected
    `profile_ids` and `previous_profile_ids`. Re-selecting the current set must
    not emit a duplicate event.
16. In **Modes**, create two custom Modes and map them to stored Profiles.
    Confirm each mode row shows every mapped Profile icon and exact color, and
    that Default and Manual have short explanatory descriptions.
17. In both Overview and Modes, confirm the shared **Active setup** card
    shows the base identity and type, plus compact exception counts when present. Open
    its single chooser and confirm Default and custom Modes appear separately
    from direct Profile activation. Confirm Manual remains a native selector
    state and is never offered as a chooser action. A Mode must
    activate its mapped set, while a direct Profile selection must replace it
    with one Profile and switch the Mode to Manual. Confirm explanatory text
    inside the chooser can be clicked without closing or crashing the browser.
    Confirm the chooser closes after selection, with Escape, and when clicking
    outside it. Repeat at desktop and mobile widths.
    Confirm `Default` and `Manual` cannot be renamed or deleted.
18. Select each custom value through `select.velair_mode` and confirm its
    mapped Profiles change once. For compatibility, select Manual through the
    native entity and confirm the current set remains active; select Default
    and confirm it is emptied.
19. Change Profile through **Modes** and through `velair.activate_profile`; confirm
    the native selector reports Manual, including direct reactivation of the
    already active profile without repeating climate calls or events.
    Confirm this direct selection replaces every other active Profile instead
    of extending the set.
20. Rename a selected Mode and confirm selection survives without reapplying
    Profiles. Remap it and confirm the new set applies atomically. Delete it and
    confirm the previous set remains active under Manual.
21. Add one `overview-status` Lovelace card and confirm that it contains only
    scheduler state and pause/stop/resume controls. Add three independent
    `active-setup` cards with
    `active_setup_controls` set to `modes`, `profiles`, and `both`. Confirm each
    chooser exposes only the requested actions, all three keep the current Mode
    and applied Profiles visible, and Profiles-only still provides Default.
22. Create two Profiles that configure different zones and map both to one Mode.
    Confirm both timelines, next events, and zone labels use their controlling
    Profile. Then attempt to select two Profiles that configure the same zone
    and confirm the editor and backend reject the conflict.
23. Restart with a custom mode selected and test both values of **Apply active
    schedule after startup**. The profile and mode must remain selected in both
    cases, but climate commands must only be sent when the setting is enabled.
24. Confirm duplicate, reserved, empty, over-255-character, control-character,
    and orphan profile mappings are rejected. Confirm portable V4 data without
    Modes remains importable.

## External Schedule Execution Smoke Test

Use a test Home Assistant instance with simulated provider services unless real
hardware testing was intentionally arranged. Do not use private production
entity names or data in screenshots.

1. Start without a supported provider. Confirm Settings offers no external
   execution choice and local zones retain the normal Velair controls.
2. Register the simulated `ramses_cc.set_zone_schedule` service and a compatible
   scalar heating climate. Confirm the provider appears only for eligible zones
   and its conditions are listed once below all zone selectors.
3. Select external execution and capture the service call. Confirm ownership is
   saved before one complete seven-day schedule is published, with no direct
   `climate.*` service call.
4. Select Default, activate a Profile schedule, and activate a Mode containing
   that Profile. Confirm each explicit selection publishes the corresponding
   effective full week. A Profile using Default behavior must publish the
   zone's Default week; Pause behavior must be rejected for the external zone.
5. Edit the active Profile and confirm the updated effective week is published.
   Confirm unrelated local zones continue normally and are not blocked by the
   external provider call.
6. Verify the 5-minute grid, scalar heating target, six-switchpoint daily limit,
   and implicit midnight switchpoint validation. Confirm turn-off, ranges,
   cooling, and climate option fields are rejected before publication.
7. Exercise Publishing, Published, and Failed. Confirm Published appears only
   after the provider service returns without error, Failed does not restore
   local ownership, and no polling, readback, delay, or automatic retry occurs.
8. While external ownership is active, attempt Boost, pause/resume, Manual
   adjustment, Room Assist, and Adaptive Preconditioning. Confirm every path is
   unavailable and no `climate.*` action is issued.
9. Return the zone to local execution. Confirm external publication state is
   cleared and normal local scheduling resumes only after the ownership change.
10. Repeat Settings and Overview checks at desktop, tablet, and mobile widths in
    English and Spanish. Confirm one controller used by several zones is still
    rendered once and that publication wording never claims hardware delivery.

## Scheduler Smoke Test

1. Create one block for today a few minutes in the future.
2. Save the day.
3. Confirm the next event appears.
4. Wait for the scheduled minute.
5. Confirm the climate entity receives the expected temperature and HVAC mode.
6. Pause for one minute.
7. Confirm the scheduler resumes automatically.
8. Trigger a short boost.
9. Confirm the affected climate shows the boost and returns to the explicit active schedule block after expiration.
10. Trigger a short boost while the zone has no active block and confirm the previous climate state is restored after expiration.
11. Trigger a short boost while the active block uses `Keep` and confirm the previous climate state is restored after expiration.
12. Pause one zone with `velair.pause_zone` and confirm other zones keep scheduling normally.
13. Resume the paused zone and confirm Velair applies its active block only when one exists.

## Manual Adjustment Smoke Test

Use at least one scalar heat or cool climate and, when available, one native
`heat_cool` climate. Listen to `velair_event` while testing.

1. Leave the default policy at **Keep automatic**. Change the scalar target
   through the standard Home Assistant climate card. Confirm one
   `external_climate_change_detected` payload identifies `temperature` and
   `policy: keep_automatic`, Overview remains Automatic, no
   `zone_control_changed` event is emitted, and Velair reapplies the current
   authoritative target. Repeat with heat, cool, off, a native range, Room
   Assist, preconditioning, and a Boost.
2. Still using **Keep automatic**, repeat while a zone pause uses `none` and
   `turn_off`, while a Profile pause uses each action, while globally paused,
   disabled, stopped, and with no active target. Confirm only an authoritative
   `turn_off` is physically reapplied; all yield/no-target gates send nothing.
3. In **Settings**, select **Until resumed** for the climate. Change HVAC mode and target externally.
   Confirm Overview shows **Manual adjustment**, the external mode and target
   remain applied, and `zone_control_changed` contains `control_mode: manual`.
4. With Room Assist applying a visibly different temporary target, make another
   external target change. Confirm Room Assist yields without briefly restoring
   either its assisted target or the scheduled target.
5. Select **Automatic scheduling**. Confirm the Manual selection disappears,
   the event contains `control_mode: automatic` and `reason: resumed`, and the
   schedule intent valid now is applied.
6. Select **Manual for a duration**, use a short safe duration, and make two
   external changes. Confirm the second change restarts the expiry and the
   current authoritative intent applies only after the new expiry.
7. Select **Until next block**. Make two adjustments before
   the same next block. Confirm the preserved target changes but the displayed
   expiry remains the real block boundary. Confirm that block applies at its
   scheduled time.
8. Enter Manual adjustment, then activate a Profile or Mode with a different
   target. Confirm other affected zones change immediately while this zone
   retains its external state. Resume and confirm only the currently active
   Profile/Mode intent applies.
9. Repeat with a Profile that pauses the zone without turn-off and one with
   `turn_off`. Confirm the pause behavior wins when Manual adjustment ends.
10. Start a Boost, then change the climate externally. Confirm the Boost ends
   without restoring its previous state, Manual adjustment preserves the new
   external state, and the old Boost expiry does not act later.
11. On a native range climate, change `20–25 °C` to `19–24 °C`. Confirm both
    boundaries are reported and preserved, and resume restores the complete
    currently authoritative range.
12. Add an identified `pause_zone` reason with `action: turn_off` while Manual
    adjustment is active. Confirm off wins. Resume automatic control and confirm
    only the Manual reason is removed; the independent pause still keeps the
    climate off.
13. Restart Home Assistant with an unexpired Manual adjustment and test both
    values of **Apply active schedule after startup**. Confirm Manual adjustment
    survives and startup application does not bypass it. Confirm its later
    expiry applies current intent.
14. Make the climate unavailable, change the underlying device if possible,
    and restore availability. Confirm availability recovery alone does not enter
    Manual adjustment. Make a later available-state target change and confirm it
    is detected.
15. Change only `current_temperature`, `hvac_action`, fan, preset, swing, or
    humidity. Confirm none enters Manual adjustment.
16. Call `velair.set_external_change_policy`,
    `velair.enter_manual_adjustment`, and `velair.resume_automatic_control` for
    a managed and unmanaged climate.
    Confirm the managed operation succeeds and the unmanaged target is rejected.
17. While already manual, change Settings from `until_resumed` to
    `for_duration`, then to `keep_automatic`. Confirm the active session and
    expiry do not change; the new default is used only after resuming and a
    later external adjustment.
18. With **Keep automatic** saved, select **Manual adjustment** explicitly in
    Overview. Confirm it starts an `until_resumed` session without changing the
    saved setting. Resume it and confirm the setting still says **Keep automatic**.
19. Save each of the three Manual policies in turn. From Automatic scheduling,
    select **Manual adjustment** in Overview. Verify
    both segmented options remain visible, the active option is a no-op, the
    saved policy is used, busy state is per climate, policy detail appears below
    the selector, and heating, cooling, off, and native ranges are preserved.
20. In Settings, verify **External adjustments** has four compact choices with
    **Keep automatic** first and selected by default,
    shows duration inline when space allows, and exposes its explanation through
    the shared inline tooltip. Confirm it opens on hover, keyboard focus, or tap;
    remains hoverable; toggles on repeated tap/click; closes with Escape or when
    focus leaves; and stays within every viewport edge. On mobile, confirm it is
    shown as a fixed bottom band without horizontal overflow.
21. With a temperature-data migration pending, confirm **Manual adjustment**
    is disabled with an explanation. Confirm the policy, explicit
    entry, and resume services are rejected; an observed external change does
    not create a Manual adjustment or log a monitor failure; and an active
    Manual adjustment remains intact.
22. In the single-climate card, confirm its compact Automatic/Manual selector
    starts and resumes Manual adjustment like the Overview selector. Controls
    must be read-only in Automatic and enabled only after the backend confirms
    Manual. Confirm this remains independent of the quick-actions section.
    Enable **One-off return** in the action editor and verify its order, hidden
    name, and automatic/More placement match Boost and Pause. Existing omitted
    and explicit action lists must keep it hidden; a fresh card-picker stub
    must enable it. Open the action and verify the shared compact planning form,
    confirmation process, active timeline, arrival editor, cancellation and
    terminal planning form. Close using X, including from More; closing must
    not cancel the episode. Busy actions block closing, and unsaved arrival
    edits require discard confirmation. Switching panes must not bypass that
    guard. Repeat with an unavailable, manual, paused and externally executed
    selected climate: the household action remains accessible. Check EN/ES,
    light/dark, mobile/tablet widths, multiple cards and live episode updates.
    Confirm the editor always lists Boost, Pause and One-off return first,
    including disabled actions, and that the new checkbox reads **Show One-off
    return** / **Mostrar regreso puntual**. Editing must target the correct
    stored action when the display order differs; opening the editor must not
    reorder saved actions. Reorder custom scripts and verify their mapping.
    Check all direct hidden-name icons are centered without reserved space for
    the hidden X, and remain centered as a pair when a pane opens. One-off return
    must use a violet accent distinct from Pause in direct actions, More and the
    editor. Open Boost, Pause and One-off return with either/both toolbar islands
    visible; their outer borders must join the toolbar without a gap or inset
    card. The standalone return card and sidebar must keep their own borders.
23. Repeat with scalar heat, scalar cool, and native `heat_cool`. Confirm the
    card follows the entity's effective step and limits, sends both range
    boundaries, offers only published HVAC modes, and does not optimistically
    change displayed values before Home Assistant updates the entity. Remove
    `target_temp_step` and confirm Settings exposes a fallback of `1`; change it
    to `0.5` and confirm schedule inputs and card buttons use that increment.
24. With Automatic scheduling active, use a climate that publishes delayed or
    out-of-order command echoes. Apply a scheduled target and reproduce both
    `expected -> old/intermediate -> expected` and
    `old/intermediate -> expected`. Confirm no
    `external_climate_change_detected` or Manual adjustment is created during
    the bounded settling period. Repeat with Room Assist using different
    scheduled and effective targets, then with **Keep automatic**, and confirm
    there is no reapply loop. During the same period, change an unrelated
    control field and make an explicit user-originated Home Assistant target
    change; confirm those remain external. Finally, wait beyond the settling
    deadline and confirm a later target change is detected normally. Simulate
    a service handler that completes slowly and confirm the full settling
    budget remains after the logical mode-and-target sequence finishes. Leave
    the entity at a value different from the requested target until the
    deadline and confirm Diagnostics reports `command_settling_mismatch` with
    expected and observed values without entering Manual or retrying blindly.
    Restore a published step and confirm it takes priority while the configured
    fallback is hidden and retained. Remove the attribute again and confirm the
    last reported step remains effective, including after reload, so existing
    decimal schedules remain valid. While the attribute is missing, save a
    different manual value and confirm it clears the remembered step without
    changing schedule rules. Restore another valid published value, remove it,
    and confirm that newer observation is remembered. In Manual adjustment, confirm the enabled
    HVAC selector has a subtle theme-safe surface and distinct hover, keyboard
    focus, and open states without visually dominating the target controls.
24. Confirm that the exclusive `velair.manual_adjustment` pause permits direct
    editing while Manual adjustment owns the climate. Add a second pause reason
    and confirm editing becomes unavailable. Also confirm Boost, any independent
    pause, stopped, unavailable, and external ownership prevent direct editing.
    External ownership must retain only **Open in Home
    Assistant**. Disable each Thermostat controls option in the card editor and
    verify the strip collapses cleanly on desktop, tablet, and mobile in light
    and dark themes. While the entity is `off`, confirm the shared surface keeps
    only the HVAC selector and Home Assistant icon; target values and `−`/`+`
    must not be rendered.

## Room Assist Smoke Test

Prefer a simulated or template-backed climate so its internal temperature can
be changed independently from the external room sensor.

1. Configure a fixed `21 °C` `heat` block with a `0.3 °C` deadband, a
   `0.1 °C` target step, and a Maximum assist delta large enough not to cap the
   test. Select an independently controllable external sensor and enable Room
   Assist.
2. Start with the external sensor inside `20.7–21.3 °C`. Confirm the fresh
   phase is `towards_lower`, its target is `20.7 °C`, the status names that
   limit, and the applied target uses the signed error from `20.7 °C` rather
   than from the central schedule.
3. Lower the external sensor through `21.0 °C` without reaching `20.7 °C`.
   Confirm the phase remains `towards_lower`. At `20.7 °C`, confirm it changes
   once to `towards_upper`, targets `21.3 °C`, and requests heat.
4. Raise the sensor through `21.0 °C`. Confirm it remains `towards_upper` until
   `21.3 °C`, then changes once back to `towards_lower`. Repeated updates at an
   edge must not oscillate the phase.
5. Repeat symmetrically with a fixed `24 °C` `cool` block and a `0.5 °C`
   deadband. Confirm a fresh in-band cycle initializes `towards_upper`, changes
   to `towards_lower` only at `24.5 °C`, and changes back only at `23.5 °C`.
6. Set Maximum assist delta below the room-to-active-edge error in each fixed
   direction. Confirm the signed correction is capped relative to the active
   edge, then aligned to the native target step and physical limits.
7. While a fixed-mode phase is active, change the block start, scheduled
   target, HVAC mode, or selected sensor. Confirm the old phase is not retained
   for the new runtime identity. Change only the deadband and confirm the phase
   is retained with recalculated limits, switching immediately only if the
   current room reading has reached the new active edge. Also clear/disable Room Assist,
   reload the integration, and restart Home Assistant; each fresh eligible
   cycle must initialize safely from the current fixed mode and room reading.
8. Enter Manual adjustment while hysteresis is active. Confirm Room Assist
   yields and does not restore its temporary target. Resume Automatic control
   and confirm current intent is resolved with a fresh phase rather than the
   phase from before Manual adjustment. With **Keep automatic**, confirm an
   external target change is corrected and runtime control remains eligible;
   it must not preserve the external target as Velair intent.
9. Set the deadband to `0` for fixed heat and cool. Confirm no
   `hysteresis_phase`, `hysteresis_target`, `deadband_low`, or `deadband_high`
   is reported and the legacy signed correction reverses around the central
   target.
10. Test scalar `auto` and scalar `heat_cool` with a non-zero deadband. Confirm
    they retain neutral in-band correction and do not enter a fixed hysteresis
    phase or actively alternate modes.
11. For a native `heat_cool` range, place the external room inside the
    scheduled band and note the first applied holding range. Move only the
    climate entity's internal reading and confirm the complete applied range
    remains unchanged.
12. Move the external room below the native range's lower boundary and then
    above its upper boundary. Confirm Room Assist resumes boundary-based
    calculations, preserves range width, and never reports a scalar hysteresis
    phase.
13. Change the active block or range target while holding. Confirm the previous
    scalar target, phase, or range is not reused for the new block.
14. While fixed heat is travelling towards its lower edge, change only
    `hvac_action`. Confirm the phase does not change: Velair controls the
    setpoint but does not infer device hysteresis or promise an exact relay,
    valve, or compressor transition.
15. Repeat a non-driving fixed scalar case and confirm the scheduled heating
    ceiling or cooling floor applies without being reported as a physical
    thermostat limit. Then force a real minimum or maximum limit and confirm
    the separate warning and persistent notification.
16. Repeat the fixed heating and cooling cycles in Fahrenheit, including both
    edge transitions and Maximum assist delta capping. Confirm all four
    hysteresis values and the graph remain in Fahrenheit and differences are
    not converted as absolute Celsius temperatures.
17. Configure a Fahrenheit `68–75 °F` native range with a `1 °F` target step. Confirm Room Assist preserves the `7 °F` width, the graph and any physical-limit warning remain in Fahrenheit, and Maximum assist delta is treated as a temperature difference rather than an absolute Celsius conversion.
18. In Celsius, verify Room Assist deadband appears immediately before Maximum
    assist delta, both fields display `°C`, and the deadband accepts `0`, `0.1`,
    and `5` but does not save negatives, letters, non-finite values, values above
    `5`, or values between 0.1-degree steps. Repeat in Fahrenheit with `°F`, the
    `1 °F` default, and the `0–9 °F` range. Confirm changing either deadband does
    not change Adaptive Preconditioning's Minimum delta.
19. Upgrade stored and portable pre-v8 data in both unit systems with no
    `room_sensor_assist_deadband`. Confirm Velair copies the legacy
    `minimum_delta_temperature` once before unit conversion. Confirm an existing
    `0.35` value remains `0.35`, while a new or reset climate receives `0.3 °C`
    or `1 °F`.
20. Use a scalar target whose Room Assist result falls between two published
    climate steps. Confirm **Climate target** keeps its compact label and its
    information button describes the currently reported climate setpoint in
    Ready or Blocked and the temporary setpoint sent by Velair in Assisting or
    Holding, never the room target. Confirm the same help then shows the exact
    pre-step result, target step, and applied setpoint. Repeat with an exact-step
    result, a scheduled-target guard, and a physical min/max clamp; the base
    explanation must remain, while step detail appears only for genuine step
    alignment. Repeat in fixed heat, fixed cool, scalar automatic mode, and
    Fahrenheit, then confirm native ranges retain their Range shift help. Change
    the published target step so a new aligned result differs by less than one
    step and no service call is sent; confirm no step explanation is combined
    with the retained target.

## Adaptive Preconditioning Smoke Test

For Planned Return, additionally confirm:

1. Configure several occupancy sources, including `zone.home` and a guest helper,
   Away/Destination Modes and today's
   future arrival; enable preparation for one heating and one cooling zone.
2. Send empty, then occupied before absence confirmation. No Away change occurs.
3. Confirm empty long enough. Away applies once and the target resolved at arrival
   determines each zone's preparation, including ranges and cross-day continuity.
4. Restart before preparation, during preparation, and after expected arrival
   while still empty. No duplicate Away action or next-day return is created.
5. Change the arrival time, skip an episode, and select a Mode/Profile explicitly
   (including the current one). Restart and arrive; cancelled intent stays cancelled.
6. Verify early arrival, late arrival, an unscheduled day, unknown occupancy,
   sensor rebinding, Boost, window/manual pauses and a stopped scheduler.
7. With configured occupancy and a ten-minute delay, plan a one-off return with
   Apply Away mode now selected while home. Away and preparation must start
   immediately. A five-minute exit and presence must reset confirmation without
   selecting the destination. A later full ten-minute absence enables presence
   arrival. Unknown readings reset the wait. Verify timed arrival and explicit
   arrive/cancel before confirmation, and reload both pending and confirmed
   episodes. Unchecked requests and source-free starts retain their behavior.
   In Overview, the Lovelace return card and the return tab, verify that Away or
   Preparing stays primary while departure confirmation has its own compact
   waiting/deadline line and contextual help. A short exit resets the line; full
   confirmation removes it. Confirm that reported presence remains visible,
   Overview help does not navigate, and the timeline help explains Away
   application time separately from monitored departure. Check tooltip cleanup
   on confirmation, navigation and card removal, including the embedded action.
8. At phone/tablet widths in English and Spanish, open the Planned return tab,
   save a week, edit and clear individual arrival times, review
   preparation and use all episode controls. Check the introduction and contextual
   help in both the Preconditioning and Planned return tabs. Open each tab directly by
   URL, refresh and use Back/Forward. Reject a navigation with an unsaved draft
   and confirm the current tab, URL and draft remain intact. Verify that the old
   Preconditioning subsection URLs open the corresponding tabs. Settings and
   Overview must not contain the moved Planned Return controls.
   Set First weekday to Sunday, then Wednesday: verify display order and edits
   still address the intended weekdays. Confirm entity and Mode selectors
   use Velair's styled dropdowns with icons and titles, and Cancel/Save stay at the
   right of the footer without overflowing on phones.
   Verify contextual descriptions appear in the relevant sections, the time zone
   is shown inside Weekly arrival times, and no copy controls or day-selection
   checkboxes remain.
8. Export/import the routine with its Mode/Profile dependencies. No episode is
   exported and the imported routine stays disabled until explicitly enabled.
   Import a model 15 routine with the legacy single sensor and confirm migration.
9. Disable the weekly routine and use Plan return with a future date and time.
   Occupied or unknown sources must keep the request pending; all absent sources
   must apply Away once after confirmation. Change/cancel the pending request,
   test expiration during confirmation, then repeat from an active absence.
   Repeat with all sources already absent and no active episode: confirmation
   starts without another sensor event. Verify the One-off return title, compact
   date/time/action controls and explanation below; on mobile, Plan return
   sits below the fields with its right edge aligned to the time field; occupancy chevrons point down when
   collapsed and up when expanded.
10. Restart while armed, away, preparing and fulfilled with automation disabled.
    Editing weekly times or toggling automation preserves manual requests; source
    or Mode changes invalidate them. Manual Mode/Profile selections cancel them.
    Completed/cancelled absences must not reapply Away upon re-enabling while away.
    After cancellation caused by source/Mode edits or explicit Mode selection,
    plan a new return without waiting for the old arrival time. Verify current
    settings are used, the cancelled arrival is hidden, and no Mode changes until
    the full new absence delay passes. Repeat after restart, with occupied and
    unknown sources, and with the weekly routine disabled. Fulfilled/skipped
    episodes must also offer a fresh explicit departure while still away.
    With missing sources or stopped scheduling, verify the fresh form remains
    visible with Plan disabled and an explanation. An active pending/away/error
    episode must still allow Cancel. Pending confirmation leaves selection unchanged;
    confirmed departure restores the recorded previous Mode/Profile selection. Restart
    while away with weekly scheduling enabled: no repeated Away action.
    Restore valid settings and plan a new return; detect occupancy to clear the
    retained automatic latch.
    Expand Room preparation beneath the routine flow. Check every managed climate
    appears once, including Default fallback, explicit normal behavior, Profile
    schedules/pauses, disabled and externally executed zones. With no future return,
    show configuration capability without target/time claims. During weekly and
    one-off returns check arrival targets, different planned starts, pending before
    confirmed absence, heating/cooling/range target reached, missing temperatures
    or estimates and Boost/manual/pause suspension. Expanding must not mark drafts
    dirty or send commands. Edit the destination without saving: diagnostics must
    still describe saved settings without an extra reminder. Check vertical row
    alignment and sensor state labels ending before the disclosure arrow.
    Check collapsed summary, keyboard access, long room names,
    mobile/tablet, EN/ES and absence of the older duplicate zone list.
11. In the status bar, toggle the automatic routine with the keyboard and on
    mobile. Confirm this edits the draft, Save persists it, and Cancel restores
    the saved setting. Confirm status and occupancy remain understandable without
    relying on color, and presence add/remove icon buttons have accessible labels.
    Confirm add/remove icons retain their semantic color without a background at
    rest and show hover/focus feedback. Read the form in order: occupancy sources,
    compact absence delay and Away Mode, then arrival times and destination Mode.
    Verify the configured source list starts collapsed, and its summary counts
    occupied, empty and unknown sources separately. Expand it with the keyboard:
    the list must align with the source selector and opening it must not mark the
    form as edited. Add/remove a source and verify counts follow the draft; Cancel
    restores the saved sources.
    Verify expanded rows have balanced icon insets and the source-summary header
    has a thin separator only while expanded.
    Occupancy counters must use the same presence/absence/unknown order in both
    summaries, and runtime sensor rows must share the configured list's spacing.
    Check the add button's hover with an eligible
    source selected, and confirm both action icons match the block editor.
    The destination description must use the section's available width even
    when the destination selector is narrower.
    Verify the weekly summary spans its own row and shows Away Mode, absence
    confirmation delay, adaptive preparation and destination without a redundant
    enabled/disabled text. Each summary block uses the normal settings-container
    border and radius, with no shared side rule, enclosing card or outer padding.
    Occupancy counts and its disclosure belong to one
    section: its source list starts collapsed and stays neutral even when the
    occupied header is tinted. Unknown signals must not be labelled occupied.
    Confirm the separate quick-return section groups departure, pending and
    active episode controls, preparation details and relevant messages. Verify
    there is only one arrival editor through each phase.
    Pending/active episodes must not repeat the feature title or arrival time.
    Show phase as a compact subtitle attached to the title, with a localized
    native tooltip explaining each active state. During confirmation the process
    block supplies that context instead, without a repeated subtitle. An accessible arrival icon and Expected arrival text identify the saved return;
    keep the label outside the edit target. Pending saved values use a compact
    chip without pencil/underline; confirmed values keep the pencil/underline.
    Both use a keyboard-accessible 44 px button. By default inputs and Change are hidden; activating that target
    reveals the inline editor without changing the saved return. Test pending
    and no-departure episodes with a standalone target, and confirmed episodes
    where the timeline arrival endpoint is the sole target.
    Back uses its compact blue fill and Change its compact green fill. Cancel uses a compact red fill with white icon/text
    below the episode data and visible hover/focus feedback. Check
    text contrast against both light and dark backgrounds; disabled controls
    retain the distinct neutral palette and not-allowed cursor. Cancel must remain
    left below the data only with the editor closed; Change arrival is right-aligned
    below the open editor, where Cancel is completely hidden. Verify this in pending, away, preparing and active-error states, including
    mobile wrapping in both languages. Inactive terminals show a fresh form;
    Plan return stays on the right. Panel and card must offer the same actions,
    without Skip, I'm home or Close.
    With the arrival unchanged, Change arrival must be disabled with a neutral
    background, muted text/icons and a not-allowed cursor. Hover must not restore
    its accent color. Edit the date or time and verify the action gains color;
    restore the saved value and verify it returns to the neutral disabled style.
    Check disabled controls in both light and dark themes, including busy actions.
    Edit an arrival without applying it: verify the unsaved notice and navigation
    protection, preservation during routine Save, and cleanup after a successful
    arrival change or episode cancellation. Returning the input to its saved value
    must clear the arrival warning. Failed actions must keep the edit and warning.
    Switch the delay between minutes and hours without changing its saved duration;
    edit it in hours, Save, reload, and confirm the effective duration remains the
    same. Cancel must restore the saved delay and Modes. Check the inline controls
    wrap naturally without stretching the number input across half the screen.
12. From Home Assistant actions or an automation, call
    `velair.start_planned_return` with `return_date: "2026-10-10"` and
    `return_time: "19:25"`, choosing a future date/time in Home Assistant's time zone. With the routine disabled, confirm the
    notice still waits for whole-home absence. Cancel it with
    `velair.cancel_planned_return`; no Mode change should occur. Repeat while
    already away and confirm Away is not applied twice. Cancel after confirmed
    departure and verify the original Mode and ordered Profile selection return;
    repeat after arrival edits and a restart, during preparation, without
    sensors, and with Boost or independent pauses. Default restores an empty
    Profile selection. Terminal acknowledgement must not restore again. Delete
    a saved Profile: cancellation must still succeed with a restoration warning.
    Inject a failed save: neither selection nor cancellation may commit. Invalid or elapsed times,
    stopped scheduling and incompatible external transitions must report errors.

Check the mobile configured-source summary against the full selector/Add row: its
left and right edges must match, and total, occupied and empty counts must share
one line in EN/ES. Include 24 sources and unknown states. Compact state numbers
retain accessible descriptions and align to the summary's trailing edge; the
mobile expanded list uses the full summary width, with Remove at the row end.
Desktop retains full state labels and its original summary width.

13. Plan tomorrow's return with a clock time earlier than the current clock time;
    then plan a return across a month/year boundary. Reject past dates and today's
    elapsed time, including a time that passes while the form remains open.
    Change both date and time while pending and already away; navigation/reload
    must warn about unsaved edits to either field. Test mobile/tablet wrapping.
14. Give the destination different targets before and after local midnight and
    on different weekdays. Verify preparation selects the target at the HA-local
    arrival, even with the browser in a different zone. Restart across midnight
    while waiting, away and preparing. Test early presence and manual cancellation.
    Postpone an already-preparing return by days: Away targets must resume until
    the new preparation is due, while Boost, manual adjustments and pauses remain.
15. In a DST-observing HA time zone, reject nonexistent arrival wall times. For
    repeated wall times choose the earliest future occurrence consistently in
    panel and service. Verify preparation crossing the clock change measures lead
    in elapsed minutes for heating, cooling and ranges, preserving overrides.

Prefer a non-critical test climate. Do not use real heating or cooling hardware when an unexpected target change would waste energy or create discomfort.

For seasonal testing, use a simulated or template-backed climate in Home Assistant. Add that test climate to Velair, set `hvac_modes` to the direction you need to test, and control the reported `current_temperature` from a helper or test sensor. This lets you simulate a cold room in summer or a warm room in winter without turning on real equipment.

Heat-only example:

1. Use a test climate that reports `hvac_modes: ["off", "heat"]`.
2. Enable preconditioning for that climate in the Velair Preconditioning tab.
3. Create a heat block for today, such as `21 °C` with mode `heat`, far enough in the future for the initial model lead.
4. Set the test climate `current_temperature` below the target, such as `18 °C`.
5. Confirm Next events shows an early start and a later target time.
6. Before the early start, raise `current_temperature` enough to reduce the delta. Without refreshing the browser, confirm Next events recalculates to a later early start or the normal block time and briefly highlights the changed row when it is visible.
7. At or after the early start, simulate warming by increasing `current_temperature` toward the target threshold.
8. Confirm the Preconditioning tab shows heat learning samples increasing and the model source moving from initial model to similar history after enough complete samples exist.
9. Confirm cooling is shown as not supported for that heat-only climate.
10. Disable outdoor context and confirm its sensor selector is disabled and displays the disabled state.
11. Make the test climate unavailable and confirm the enable switch explains why it is disabled on desktop and mobile widths.
12. Change several tuning values, restore defaults, and confirm the enabled state and learning sample counts are unchanged.

If you only need to verify next-event scheduling, Home Assistant Developer Tools > States can temporarily change the displayed `current_temperature` for a climate state. This is useful for checking whether Velair calculates an early start, but it is not a complete learning test because Velair may still call services on the real climate entity when the event is due.

## Master-dependent Preconditioning

1. Leave two managed climates independent and compare their starts, actions and
   learning with the existing behavior. Test heating and cooling separately.
2. Link a dependent to a master, reload, then unlink it. Verify settings persist
   and saved learning is retained. Reject self-reference, unmanaged sources,
   cycles and chains through the API as well as the selector.
3. With a dependent target at 18:45, check own/master starts of 17:40/17:55
   (effective 17:55) and 18:10/17:55 (effective 18:10). Without master anticipation,
   or with master start at 19:00, verify no early dependent action and a normal
   18:45 block. Do not borrow another master's block when the closest is ineligible.
4. Use different target times and several master blocks. Check closest target
   selection, including an equal-distance tie resolved to the earlier block.
   Repeat across midnight and daylight-saving transitions.
5. Delay or fail the master's delivery. The dependent must wait for accepted
   execution; unrelated rooms must continue. Test equal-time ordering with the
   dependent listed first in configuration and retry after a temporary failure.
6. Let the master reach temperature or pass its own target before the dependent's
   start. Its accepted occurrence must remain usable. Pause or disable the master
   before acceptance, replace its schedule/Profile/return episode, or unlink the
   relationship: stale evidence must not release pending preparation.
7. After the dependent has started, let the master finish or change. Do not cut
   the dependent's observation short. Check its actual initial temperature and
   remaining duration, completed/partial/invalid results, and normal block deadline.
8. Repeat with Default, Profile base, zone exceptions, native temperature ranges,
   Temperature only blocks, Room Assist and Planned Return. A Heat master must
   not release Cool; an arrival must not reuse another episode or weekly action.
9. Restart between master and dependent starts. Check bounded command-start
   continuity without restoring an old learning timer. Expired or context-mismatched
   references must be discarded and excluded from portable export.
10. Export/import relationships, including older independent models and partial
    imports against existing local rooms. Reject an invalid resulting graph
    atomically. Simulate persistence failure and verify configuration rollback.
11. Compare prediction, Calculation details, Overview, climate card, return card,
    Diagnostics and existing sensor attributes. Blocked preparation must retain
    its reason without inventing an early `target_when` or a new HA entity.
12. At 320, 390, 768, 1024 and 1440 px in light/dark themes, check long room names,
    wrapped reasons, 44 px controls, keyboard operation and missing optional fields
    from older payloads. Confirm forecast queries do not append history entries.

## Learning Activity And Diagnostics Smoke Test

1. Use simulated heat and cool climates with preconditioning enabled. Confirm
   existing labels, sample counts and prediction details remain unchanged, with
   at most one additional contextual explanation per direction.
2. Execute an early transition, leave its observation running, then simulate a
   reached target, an unreached target and an interruption in separate cycles.
   Confirm the activity changes and Diagnostics records one final result per
   cycle, without duplicate result events.
3. Execute a transition with too little temperature difference and one with an
   unavailable temperature. Confirm the explanation matches the known evidence.
   Refresh and recalculate future predictions repeatedly; no new learning
   history entries should appear from those calculations alone.
4. Open Diagnostics from the learning explanation with unrelated source and date
   filters previously selected. Confirm the requested climate is selected,
   category is Preconditioning and both date filters are cleared. Declining a
   pending-changes navigation confirmation must preserve the current editor.
5. Expand the latest learning transition evidence. Check temperatures, units,
   configured thresholds and durations against the simulated cycle. A previous
   transition must be dated and never described as the current observation.
6. Disable Preconditioning history, then enable it and clear history. Confirm
   historical evidence disappears while current activity and stored sample
   counts remain valid. Restart and confirm old runtime observations/history
   are absent; older backend payloads must simply omit the new explanation.
7. At 320, 390, 768, 1024 and 1440 px, check light/dark themes, long text,
   keyboard access, wrapping and 44 px action targets. No explanation may depend
   on hover; learning details must remain readable without a wide table.

## Environmental Comfort Smoke Test

1. Open the Comfort tab.
2. Enable Comfort for one managed climate.
3. Select a temperature sensor, or leave it automatic and confirm Velair uses the Room Assist room sensor or the climate `current_temperature`.
4. Set a temperature range that contains the current value and confirm the condition reports that temperature is in range.
5. Move the test sensor below and above the range and confirm the condition changes to Cold and Hot.
6. Add a humidity sensor or use a climate that reports `current_humidity`; verify all nine temperature/humidity combinations and the two-dimensional map.
7. Select `Do not monitor humidity` and confirm the humidity thresholds disappear, the condition uses temperature only, and humidity changes no longer refresh the assessment.
8. Restore automatic humidity and confirm the saved or automatic source is used again.
9. Remove one current environmental reading and confirm the UI switches to a single scale with partial data instead of claiming full comfort.
10. Add a CO2 sensor and confirm Good air, CO2 elevated, and Poor air quality remain separate from the environmental condition.
11. Make every monitored reading unavailable or stale and confirm No readings or Readings outdated is shown.
12. Disable Comfort for that climate and confirm changing those sensors no longer emits comfort events.
13. Enable dew point, absolute humidity, and Humidex with **Calculated by Velair**. Confirm they use the effective Comfort temperature and humidity, display dew point in the zone temperature unit, absolute humidity in `g/m³`, and Humidex without a unit.
14. Disable humidity monitoring and confirm all three Velair-calculated readings become missing without changing the established Comfort `data_quality` or `data_issues` contract.
15. Use each metric's single source selector for **Calculated by Velair** and
    compatible Home Assistant sensors. Confirm switching back retains the
    previous entity, a missing retained entity remains visible, and an external
    source without an entity shows a disabled placeholder without auto-saving.
    Verify all documented units are normalized.
16. Test an empty external selection, `unknown`, `unavailable`, stale, non-numeric, incompatible-unit, and negative absolute-humidity source. Confirm the derived payload reports missing, stale, or invalid and never reuses an old value.
17. In a Fahrenheit Home Assistant installation, confirm native calculations still match their Celsius equivalents, dew point is displayed in Fahrenheit, absolute humidity remains `g/m³`, and Humidex remains unitless.
18. Confirm enabled readings appear in the panel, card, Environmental condition
    attributes, Diagnostics, and API. Confirm no per-metric proxy entities are
    created.
19. Change only a derived numeric value while availability and source validity remain unchanged. Confirm the UI and sensor attribute refresh without a duplicate `comfort_assessment_changed` event; then change availability and confirm one event is emitted.
20. Export and import the zone with mixed Velair and external sources. Confirm
    current model v11 preserves `enabled`, `source`, and retained `entity_id`,
    but exports no calculated values or runtime availability. Import a legacy v9
    backup and confirm its derived-metric configuration receives the disabled
    outdoor-comparison defaults.
21. Verify elevated/poor CO2 follows configured thresholds and unusable metrics create no insight. Confirm Humidex appears only with a Celsius-normalized margin of at least 1 °C. Confirm dew point and absolute humidity remain values without permanent insight cards, and that their information help opens by hover and keyboard focus without crossing the viewport on mobile or desktop. Check the compact climate card shows only the first prioritized contextual insight.
22. In the derived panels, confirm Humidex shows a directional room-temperature comparison (including an equivalent Fahrenheit delta without a 32-degree offset), dew point says how far it is above or below room air without claiming risk, and absolute humidity shows only its neutral `g/m³` value. Make a reading missing, stale, or invalid and confirm its relationship disappears.
23. Enable outdoor comparison, select explicit outdoor temperature and humidity
    sensors, and confirm both selectors retain and display the selected entities
    after a Velair reload and after a Home Assistant restart. Disable the
    comparison and confirm the retained selections return when it is enabled
    again.
24. With current indoor and outdoor readings, confirm **Indoor vs outdoor** shows
    the normalized indoor and outdoor temperatures, indoor and outdoor absolute
    humidity, and adjusted outdoor humidity at the indoor temperature. Confirm
    the same values and source IDs appear in the schedule API, Diagnostics, the
    Environmental condition sensor attributes, and the Comfort event payload.
25. Exercise a useful heating case, a useful cooling case, a useful moisture
    case, and a case where one dimension would improve while another would get
    worse. Confirm Velair uses cautious opportunity or trade-off language and
    never presents opening a window as a command or changes the climate.
26. Remove the optional outdoor humidity selection. Confirm temperature
    comparison remains available, moisture comparison becomes unavailable, and
    no humidity opportunity is produced. Restore it and confirm the complete
    comparison returns without changing the indoor Comfort quality.
27. Make one configured outdoor source missing, stale, invalid, and current in
    turn while the other remains current. Confirm outdoor `data_quality` becomes
    `partial` where applicable, each comparison dimension reports its own
    availability, and no conclusion uses an old or unusable value. Then make all
    configured outdoor inputs stale or unavailable and confirm the outdoor block
    reports that state without altering indoor `data_quality` or `data_issues`.
28. Repeat the complete outdoor comparison in Fahrenheit with physically
    equivalent inputs. Confirm temperatures and temperature differences use
    Fahrenheit, absolute humidity remains `g/m³`, adjusted humidity remains a
    percentage, and opportunity thresholds remain physically equivalent to the
    Celsius case.
29. Establish a stable current assessment, open the event listener for
    `velair_event` filtered by `event: comfort_assessment_changed`, and note
    its `range_summary`. Confirm the summary contains `status`, `thermal_relation`, and nullable `temperature`,
    `humidity`, and `humidex` positions using only the documented stable values.
30. Move one reading across a configured boundary. Confirm the event contains
    the complete new `range_summary`, the previous complete summary in
    `previous_range_summary`, `range_summary_changed: true`, and
    `range_status_changed: true` only when the aggregate status also changes.
31. Create a transition where temperature and Humidex move between aligned and
    mixed positions without changing the aggregate status. Confirm
    `range_summary_changed` is true and `range_status_changed` is false. Change
    only CO2, an insight, or outdoor semantics and confirm both flags are false.
32. Make a required physical reading or enabled Humidex missing, stale, or
    invalid. Confirm `range_summary.status` and the relevant thermal relation or
    positions become unavailable without changing the backward-compatible
    `condition` contract.
33. Reload Velair and restart Home Assistant while the sensors already represent
    an established non-default range summary. Confirm the first reconstructed
    snapshot becomes the baseline and emits no false transition event. A later
    real semantic change must emit exactly one event with the restored baseline
    as `previous_range_summary`.
34. In **Ventilation guidance**, change each per-climate margin and reload the
    panel and Home Assistant. Confirm the values persist, appear under
    `outdoor.guidance_thresholds` in the schedule API, Diagnostics, Environmental
    condition attributes, and Comfort events, and alter opportunities only when
    the configured margin is crossed. Removing the outdoor humidity sensor must
    hide its two controls without deleting their values. Repeat in Fahrenheit:
    the temperature default must be `1.8 °F`, while percentage points and
    `g/m³` remain unchanged. Editing a threshold without changing the semantic
    result must not emit an event.

35. Leave the Comfort model on **Simple** and confirm the established rectangle,
    humidity condition, outdoor guidance, and existing zone configuration are
    unchanged.
36. Select **Guided psychrometric range** with a humidity source configured.
    Confirm only one reference humidity range is requested, the map becomes a
    smooth curved target, and the reference equals the effective range at the
    midpoint temperature. Remove humidity monitoring and confirm the model is
    changed atomically rather than leaving invalid configuration.
37. Make the configured humidity sensor temporarily unavailable. Confirm Guided
    remains selected and stored while humidity-dependent status waits for data.
38. Confirm collapsed and expanded headings keep the physical condition. Create
    mixed temperature/Humidex positions and confirm a second Humidex chip
    appears in both headings, then disappears when positions align. Enable the
    single-climate card option for extra collapsed Comfort readings and confirm
    Humidex, dew point, and absolute humidity chips appear only while that
    dashboard option is enabled.
39. Exercise every **Ventilation opportunity** state. Confirm attributes match
    the API, Diagnostics, Environmental condition attribute, and event. Without
    optional outdoor humidity, monitored humidity limits the result to
    `may_help`; deliberately disabled humidity permits temperature-only
    `comfort_possible`. Unusable configured dependencies produce
    `unavailable`.
    Restore the sensor and confirm evaluation resumes. Repeat in Fahrenheit.
40. Select **Custom range by temperature**. Configure different humidity ranges at the
    displayed minimum and maximum temperatures and confirm the map becomes a
    four-sided sloped target. At both endpoints and one midpoint, verify the
    shown effective range, humidity condition, `range_summary`, Environmental
    condition attributes, Diagnostics, API, and event payload all agree.
41. Move temperature below and above the configured interval. Confirm the
    nearest endpoint range is used without extrapolation. Repeat with the two
    endpoint ranges rising, falling, and equal to ensure no direction is
    imposed.
42. Make temperature missing or stale while humidity remains current. Confirm
    humidity stays visible but has no condition, the effective range is absent,
    the summary is unavailable, and no humidity ventilation opportunity is
    produced. Restore temperature and confirm evaluation returns.
43. Reload Velair and Home Assistant, export/import portable model v19, and
    confirm the selected model and both endpoint ranges survive. Import a v10
    payload and confirm it uses the Simple model. In Fahrenheit, confirm endpoint
    temperature labels and exported thermal values use Fahrenheit while the
    humidity percentages remain unchanged.

## Automation Event Smoke Test

1. Create a temporary automation with an event trigger for `velair_event` filtered by `event: scheduler_mode_changed`.
2. Pause and resume Velair.
3. Confirm the automation fires and receives the expected `mode` and `previous_mode` event data.
4. Create a temporary automation with an event trigger for `velair_event` filtered by `event: climate_target_applied`.
5. Apply a schedule block and confirm the automation receives `entity_id`, `action`, `temperature`, `hvac_mode`, and `source`.
6. Create a temporary automation with an event trigger for `velair_event` filtered by `event: zone_paused`.
7. Pause one zone and confirm the automation receives `entity_id`, `until`, and `action`.
8. Enable preconditioning for one climate with a future heat or cool block and listen for `event: preconditioning_plan_updated`.
9. Confirm its payload includes the original and calculated start times, lead, direction, temperatures, and model source.
10. Refresh Overview and confirm the unchanged plan does not emit another event.
11. Disable preconditioning and confirm one `preconditioning_plan_cancelled` event contains the last plan and a cancellation reason.
12. Complete or expire a preconditioning session and confirm `preconditioning_observation_recorded` reports the final quality and stored sample count.
13. Enable and disable Room Assist and confirm `room_sensor_assist_state_changed` only fires when enablement actually changes.
14. Start and cancel a boost and confirm `boost_ended` contains `reason: manual` and the selected `restoration`.
15. Enable Comfort for one climate and listen for `event: comfort_assessment_changed`.
16. Move a tracked temperature, humidity, or CO2 sensor across a configured threshold and confirm the event includes `entity_id`, `condition`, `air_quality`, `data_quality`, `data_issues`, and metric payloads.

## Frontend Smoke Test

1. Open the sidebar panel.
2. With the initial schedule response completing in under 300 ms, confirm no
   loading message flashes. Throttle the response beyond 300 ms and confirm a
   small local Velair icon with a static **Loading...** label appears inline,
   without a floating notice or animation. Existing content must remain visible
   during later refreshes.
3. Confirm the Overview, Schedules, Modes, Templates, Room Assist, Comfort,
   Preconditioning, Diagnostics, and Settings tabs render in that order.
   Confirm existing links and Lovelace `view` values still open the same named
   views.
4. Confirm Preconditioning lists climates in the order configured in Settings and contains no general Settings sections.
5. Confirm mobile and desktop layouts do not overflow.
6. Add, edit, drag, resize, and delete blocks.
7. Save a schedule.
8. Clone the schedule to other days.
9. Clone the schedule to another managed climate.
10. Create, rename, edit, apply, and delete a template.
11. Export data on desktop.
12. Import selected sections.
13. Confirm import warns that selected data will be overwritten.
14. Open Diagnostics and confirm its managed-climate status shows the climate
    capabilities and current runtime health. Confirm Settings contains no
    diagnostics workspace.
15. Confirm Reset Velair asks for confirmation and restores defaults.
16. Trigger two validation errors in quick succession. Confirm the notices stack
    without overlapping, the older notice moves up smoothly, both remain
    readable at desktop and mobile widths, and each leaves with a short fade.
17. In Overview, confirm every managed climate always shows both compact
    **Automatic scheduling** and **Manual adjustment** segments, with icons and
    a theme-safe selected state. Hover each enabled segment and verify visible
    affordance; keyboard focus, click/tap, busy state, and the active no-op must
    remain usable without nested or double borders.
18. Resize Overview through `743`, `742`, and `741` pixels. Confirm the Zone
    overview information container neither gains an isolated right gap nor
    jumps horizontally at the breakpoint, and remains correctly aligned at
    wider desktop and narrower phone widths.
19. Add an active Boost to Today's timeline and shrink the viewport until its
    block becomes narrow. Confirm the moving Boost highlight is clipped to that
    block at every width and never begins or paints outside it. Enter Manual
    adjustment and confirm the timeline pause marker also identifies Manual
    control without requiring two separate space-consuming icons.

## Diagnostics Smoke Test

### Planned Return visibility

1. Exercise a weekly departure and a one-off departure, including a sensorless
   one-off start. Check Overview origin, process, confirmation deadline and arrival
   time. Opening the summary navigates to Planned Return without changing the
   episode. An inactive routine without an incidence adds no Overview summary.
2. Compare confirmed Away scheduling, an explicit Default Away Mode, unmapped
   Default fallback under a custom Away Mode, and Away Profiles using pause/off.
   Only actual backend-owned participation gets a violet signal. Preserve the
   climate's normal operating state and Profile information.
3. Check future, due, reached, suspended and unavailable preparation with heating,
   cooling and native ranges. Ordinary preconditioning at the same timestamp must
   not become Planned Return. Manual, Boost, independent pauses, stopped/global
   paused scheduling and external execution retain their priority.
4. In Diagnostics, inspect the household section and selected climate's current
   intent, estimate, suspension reason and delivery evidence. Weekly disabled
   must not imply one-off returns are unavailable. Repeat after arrival changes,
   cancellation, completion, configuration changes and restart.
5. Filter the Planned Return history category and exercise every transition.
   Reject a save and repeat refreshes/retries: no false accepted transition or
   duplicate start/error entries may appear. Disable collection and confirm its
   preference persists while raw automation events remain available. Exceed 100
   retained events and verify the common limit; restart clears history.
6. Export both default and raw-entity reports. New household/per-zone/history
   context must be present, with Mode/Profile operational IDs removed in both
   variants. Check EN/ES, long labels, light/dark and mobile/tablet. Existing
   standalone return cards and the full Planned Return panel remain unchanged.

### General diagnostics

1. Open Diagnostics and confirm it loads without polling, reports the current
   scheduler and each managed climate, and updates after a real runtime change.
2. Enable and disable each history category. Confirm the selection survives a
   Velair reload, disabled categories immediately disappear from the current
   log, current health remains available, and newly disabled events are not
   retained.
3. Generate more than 100 eligible events and confirm only the newest 100 are
   kept. Restart Velair or Home Assistant and confirm history is empty while the
   saved category selection remains.
4. Apply schedule, Profile, Mode, Boost, pause, external-adjustment, Automatic/
   Manual-control, Room Assist, Preconditioning, Comfort, failed delivery, and
   unavailable/available transitions. Confirm each retained row uses the
   expected category, event label, reason, climate, and timestamp.
5. Resize log columns on desktop and confirm widths last only for the open panel
   session. At mobile width, confirm the compact event layout has no horizontal
   overflow and does not expose column resize controls.
6. Clear history and confirm the rows disappear while current health and enabled
   categories do not change.
7. Download the default report and confirm climate and associated sensor IDs are
   replaced by stable aliases and Profile, Mode, and pause IDs are absent. Then
   explicitly export with entity IDs, confirm the warning is visible, verify
   operational IDs remain removed, and review the JSON before sharing.
8. Listen for raw `velair_event` events while recording is enabled and disabled.
   Confirm category retention does not suppress or replay automation events and
   that opening or refreshing Diagnostics emits no duplicate runtime events.

## Startup Behavior

1. Enable startup apply behavior.
2. Restart Home Assistant.
3. Confirm active schedules apply in automatic mode.
4. Disable startup apply behavior.
5. Restart Home Assistant.
6. Confirm Velair restores state without forcing climate targets.

## Seasonal Blueprint Checks

1. Import `seasonal_climate_selection.yaml` into a non-critical Home Assistant instance. Check its three sections on desktop and mobile; choose Modes using the standard action editor without typing Profile IDs.
2. Use a test temperature sensor and shorten the positive delay. Enter winter at 18 °C, mild weather at 23 °C, and summer at 30 °C; verify the corresponding action runs only after the entire confirmation delay in that range. Check exactly 20 and 27 °C belong to mild weather.
3. Change the value repeatedly within a pending range. Verify `21 → 22 → 21` and `21 → 21.0` keep the original deadline and actions run once per range entry. After confirmation, same-range and attribute-only updates must not repeat actions. Leave the range briefly and return; verify a full new delay, even if the intervening range never executed.
   An invalid unit must cancel confirmation. Restoring a valid unit alone dismisses the warning and starts a full new confirmation; actions may run after that wait, even for the previously selected range.
4. Set the sensor unavailable during a pending wait. Confirm the persistent notification appears immediately in English and Spanish, does not duplicate, and no stale seasonal action runs. Restore a valid reading and verify a full new confirmation delay, including when startup initially had an invalid reading.
5. Test a Fahrenheit reading with Celsius thresholds, then configure Fahrenheit thresholds explicitly. Test unsupported or missing units and invalid thresholds/delay.
6. Restart Home Assistant with valid and invalid readings. Confirm valid startup selects nothing, invalid startup warns, and pending delays are not recovered after restart or automation reload.
7. Verify an empty mild-weather action list leaves the current routine unchanged. Then configure a real pause-and-off Mode and check it stops the selected zones.
8. Test a manual Away selection followed by a newly confirmed seasonal range; confirm the configured action can replace it, as documented. Updates within the already confirmed range must not replace Away. Inspect normal traces for a failing user action.
9. Re-import from the stable URL once published. Confirm HACS integration installation alone does not import the blueprint and **Take control** creates an independent automation.

## Release UI Checks

1. Run `npm.cmd run build:release`.
2. Confirm the Settings maintenance section shows `v<version>`.
3. Confirm Settings maintenance shows the same integration version.
4. Run the normal development build again if you are returning to local development.

## Planned Return Dashboard Card

1. Add `type: custom:velair-card`, `view: planned-return` to a dashboard. Select
   Planned return in the visual editor in English and Spanish; confirm there
   is no thermostat filter or weekly configuration form/switch.
2. Check 360 px, tablet and desktop card widths. Confirm the card contains only
   One-off return, with header counts and confirmation delay; verify the full
   sidebar still has weekly, occupancy and preparation panels. Plan a future
   return before leaving and while already away.
3. Edit the arrival while a backend state update arrives; confirm the draft is
   preserved. Submit it and check the sidebar and a second card show the same
   episode while each card keeps its own unsubmitted draft.
4. Test pending and active Cancel and Change arrival in the card; it must not
   show Skip, I'm home or Close. Verify Cancel stays left below the episode data only when not editing, and Change arrival
   right. Fulfil a return while occupancy remains away and immediately plan a
   new one. Check cancelled/skipped/error inactive episodes also show the fresh
   planning form. Invalid configuration keeps this form visible with Plan
   disabled, while Cancel remains available on an active errored episode.
   Confirm the sidebar uses identical Cancel/Change and terminal planning actions.
   Only the card shows trailing source/delay indicators; both surfaces show the timeline;
   the sidebar retains the full weekly, presence and preparation configuration.
5. Navigate away and back and replace/reconnect the WebSocket connection. Verify
   one shared schedule subscription per Home Assistant connection for mounted
   Lovelace cards, with the sidebar's session separate. Confirm cleanup when
   the final card detaches and that no old subscription callback or delayed
   load overwrites current data.
6. Confirm no timeline appears before absence is confirmed or in terminal/error
   states. During Away/Preparing, verify departure and saved arrival Mode/time
   endpoints, Now position, multi-day dates and DST elapsed-time calculations.
   Edit the arrival and verify the timeline stays on the saved value until accepted.
7. Hide the dashboard tab during an active episode and resume it later. Verify
   the marker immediately catches up, ticks only once per minute while visible,
   and makes no API request. Remove/remount the card and check timer cleanup.

## Return Arrival Disclosure And Estimated Preparation

1. At 344/360 px, tablet and desktop widths in EN/ES and light/dark themes, check
   the compact title-attached state subtitle and localized native tooltip (or
   the sole confirmation process block during that phase),
   long Mode names, card counts at the top right of the header, underlined arrival value target,
   non-clickable accessible pending arrival icon and label aligned to title/state
   text, pending compact chip without pencil/underline, and confirmed rail arrival
   icon/pencil with 44 px touch targets. The default active panel has no visible inputs.
2. Open the arrival editor by keyboard, edit its date/time and push a sensor update.
   Keep the draft and navigation guard. Fail an adjustment and retain the editor;
   succeed and verify it closes with focus restored to the saved arrival trigger.
3. Check backend arrival-context adaptive pending/preparing zone estimates. Show
   only the earliest valid estimate for the exact saved arrival. Configuration,
   stale, invalid, suspended, reached, unavailable and arrival-only data must not
   create a marker; never use a runtime-zone fallback.
4. Put Now and the estimate near each other and near either endpoint. Their labels
   must not collide: Now has no visible text label, the estimate tick stays on the rail with a separate
   caption. An estimate before departure clamps its position without changing its
   displayed actual date/time. Respect HA's 12/24-hour setting everywhere.
5. Confirm visible minute ticks and hidden-tab cleanup/resume in both sidebar and
   card without API polling. Pending/terminal/error states have no moving timeline.

6. Compare departure/arrival value font, weight, line height and vertical alignment;
   action icons flank the rail and Mode labels wrap below the saved times. Confirm the compact
   Cancel action remains left below episode data when not editing, is hidden while
   editing, and Change remains right in the editor. Measure normal/hover text contrast with dark/light theme error colors,
   and check focus/disabled affordances with the compact red fill and white foreground.


### Local arrival editor and estimate fallback

1. On the sidebar and Planned return card, open an active arrival editor. Blue Back/Volver
   with a left arrow appears on the left of its action row and green Change arrival
   on the right. Back has a localized Discard arrival changes and close editor title/accessible label
   and is absent from the saved-time row. Close it with keyboard and touch; focus returns to the saved value.
   Check subtle editor/control transitions and no animation with reduced motion.
2. Edit date/time, use Back, then push occupancy updates. Clear the arrival
   warning and arrival-only navigation/reload guard; reopen the latest saved value. Local close
   makes no backend request and does not cancel the return. A successful change
   still closes the editor and clears only the accepted arrival draft.
3. With no marker, check a current matching arrival preview: all reached, all
   suspended (including arrival-only rooms), all arrival-only and all excluded
   rows have accurate summaries. Missing, stale, malformed or mixed preview data
   gives a neutral no-active-estimate message, never a claim that preparation is
   disabled. Open the information button immediately beside the One-off return title by hover/focus
   and mobile tap. No fallback help row or reserved space remains above the rail.
   Check its 44 px target and open help remain contained on mobile with long titles;
   keep the interactive helper outside the progressbar and aria-hidden dot. Check its
   accessible name, expanded/controls state, Escape/outside closing, and cleanup
   on backend updates or detach. Keep a valid estimated-start caption visible.
4. Check the elapsed gradient rail, endpoint ticks, Now halo and separate estimated
   preparation indicator at 344/360/768/1024 px in light/dark themes. Draft edits
   must not move the saved timeline or estimate. Endpoint/estimate labels and the Now tooltip
   remain legible near either end; the rail does not imply thermal progress.


### Wide sidebar arrival editor

1. Open the active return editor in the sidebar at 768/1024 px and wider. The
   date/time fields form a bounded group aligned to the arrival endpoint on the
   right; neither field stretches across half the whole panel. Cancel remains left below episode data only when not editing and Change arrival
   below the editor on the right, with visible separation. Do not repeat the
   card-only source/delay strip above existing occupancy/routine information.
2. Repeat at 344/360 px and on the card. Preserve the existing responsive field
   layout, shared timeline and local Back behavior. Dirty configuration and arrival
   drafts remain independent: changing arrival uses saved backend settings and
   leaves the unsaved configuration intact.


### Absence confirmation process

1. On card and sidebar, transition from Armed to Confirming absence. Show the
   timer process row above arrival controls, with a prominent backend deadline
   directly after the process heading, wrapping in the same text column when needed,
   and conditional explanation; omit the old repeated deadline footer. Do not
   create a countdown or departure timeline before confirmation.
2. Check Home Assistant time zone and both 12/24-hour formats. Show the date when
   confirmation ends on a different local day. Missing, invalid or timezone-naive
   deadlines show the explanation without a fabricated time.
3. Check automatic weekly confirmation with no episode yet: retain the new-plan
   form and show the process. Confirming-to-Away removes the process and reveals
   the existing saved departure timeline. Armed and active Error retain their
   valid controls without a misleading confirmation deadline.
4. At 344/360/768/1024 px in English/Spanish, ensure the unbordered process row
   wraps comfortably, preserves arrival drafts and serves as the sole confirmation
   phase explanation without duplicating current occupancy information.


### Return header and icon alignment

1. On sidebar and card, verify the first row has title left and card-only indicators
   right. Compact Cancel belongs below the data on the left, only for an active
   episode with cancellation capability and a closed arrival editor. Active errors
   and stopped/invalid settings must not hide an available Cancel. Busy disables
   it; unavailable cancellation and inactive terminal states omit it entirely.
2. The phase subtitle stays attached to the title without a detached background
   chip; confirmation uses only the process heading. Only the card adds a single
   top-right source strip in the header, with delay only before a
   confirmed active absence. Check 344/360 px and Spanish long states:
   subtitle text and large counts wrap within their groups without overflowing
   or repeating phase information.
3. No header Cancel, duplicate Cancel or empty action footer remains. Open the editor:
   Change arrival appears at its right edge and retains busy/dirty guards. Local
   close and successful adjustment remove that footer.
4. Check icon/text vertical centering in title, Cancel, subtitle, counters, endpoint
   labels, arrival value/pencil, Back, preparation captions and Change action. Keep
   44 px touch targets, readable quiet colors, keyboard focus and theme contrast.


### Rail endpoint and compact cancellation layout

1. At 344/360/768/1024 px on card and sidebar, check departure/arrival action
   icons flank the elapsed rail. Native tooltips and role/labels describe them;
   keep these semantic icons outside the progressbar accessibility subtree.
   Saved times appear only once, below the rail, aligned left/right and contained
   for cross-day dates and 12/24-hour formats.
2. Away/Return Mode names use plain icon-and-text labels below saved times,
   without background, border or padding. Long names wrap; labels are not clickable. Do not
   repeat the former action-label/time/Mode columns above the graph.
3. Keep the Now point on the elapsed rail, its localized native tooltip and the preparation
   tick on the rail with its clock caption below the times, with enough separation from endpoint icons and saved times.
   Test both points near 0/100%, and preserve backend-only marker/fallback rules.
4. The footer Cancel has a 32 px visible red surface with white icon/text, within
   a 44 px hit area. Measure normal/hover contrast in dark/light themes; busy is
   distinctly neutral and not allowed. Arrival pencil/Back/draft/focus semantics,
   pending confirmation process and no-fake-departure states are unchanged.


### Tight endpoint spacing and contextual phase

1. Check sidebar/card at 344/360/768/1024 px, long Mode names and multi-day dates.
   Mode labels follow the left/right endpoint edges; endpoint times sit within
   a modest rail-to-time gap and a smaller time-to-Mode gap. Center time text
   in its 44 px touch area; each endpoint independently follows wrapped text.
   Arrival pencil and editor Back remain vertically centered; wrapped dates stay inside their column.
2. The active phase is a small title subtitle, not a detached background chip.
   During confirming absence, only the existing timer process block supplies
   phase context and native help. Card counts stay grouped at the top right of the header;
   the sidebar does not duplicate it. Active errors keep available Cancel.
3. Put Now and preparation at 0/100%. Now has no visible text label or empty upper row when an estimate exists. Mode labels
   appear below saved times. The backend preparation position is a small rail tick;
   its role/title/aria stay accessible outside the progressbar. The full clock
   caption remains below times in a softly blue-tinted rounded container; check
   readable contrast and centered icon/text wrapping without clock/time overlap.


### Contextual card indicators and endpoint hierarchy

1. On the card, source counts sit at the top right of the header. The sidebar has no duplicate card strip because it retains the
   occupancy section. Keep the delay icon for idle/armed/confirming and errors
   before departure; hide it for active Away/Preparing and active errors with a
   departure timestamp. An inactive historical departure must not hide it.
2. At 344/360/768/1024 px, check the tighter endpoint icon/time layout without
   overlapping edit targets. Below times, Mode labels align to the same left/right outer
   endpoint edges. Long names/dates wrap inside columns; the hierarchy reads as
   icon, time, Mode. No visible Now label competes with the Mode labels.
3. Confirm Cancel capability/busy guards, editor Back and saved-arrival draft
   semantics are unchanged. Check Now/preparation at 0/100%; backend tick and
   estimate caption remain contained with no thermal progress implication.


### Proportional endpoint data and editor-only close

1. Compare visible rail-to-time and time-to-Mode gaps independently at each
   endpoint in EN/ES, 12/24-hour time, same/multi-day dates and long Mode names.
   The Mode label should sit closer to its time than the time sits to the rail; use the departure text span and arrival
   value span rather than their 44 px control boxes when measuring. Keep Mode
   labels below their own time values, without a shared row forcing extra gaps.
2. Card-only sensors/delay are at the header’s top right. Their existing delay
   phase visibility is unchanged; the main panel has no duplicate card strip.
3. Cancel is left below all episode data/preparation caption only while the
   editor is closed and cancellation is available. Opening hides Cancel entirely;
   Change appears right. Blue Back with a left arrow appears left in the editor action row, closes
   the editor and discards arrival edits, then restores Cancel. Independent
   unsaved configuration and its navigation guard remain.
4. Push an active error with can_start=false while editing. Back remains usable;
   closing restores enabled Cancel and focuses it if the saved-time trigger is
   disabled. Check hover/focus/disabled colors and reduced-motion transitions.


### Back action and closer Mode labels

1. Verify plain Mode icon/text labels stay close below their own saved time,
   without chip background, border or padding and without overlapping edit targets. Check wrapped
   dates/long Mode names independently on both endpoints in card and sidebar.
2. Open the editor: there is no × or other close control beside the time. The
   action row shows blue Back/Volver with left arrow on the left and Change
   arrival on the right, separated clearly. Back has a localized explicit editor
   close title/aria label and is disabled only while busy.
3. Back discards the arrival edit locally without a backend request, clears its
   warning and arrival-only navigation guard, and restores Cancel. Reopening
   uses the latest saved arrival, including a push during the exit animation.
   Failed-adjustment errors clear locally; backend status errors remain visible. Failed adjustment and sensor updates preserve the editor.
   Active error/config blocked still allows Back, then focuses restored Cancel.
4. Keep subtle editor/Back entry and exit transitions, respect reduced motion,
   and maintain readable blue Back/green Change normal and hover colors, with
   neutral disabled surfaces. Both use 32 px visible faces and 44 px targets.

### Per-room estimated preparation disclosure

1. In the card and sidebar, verify the blue estimated-start callout starts
   collapsed. Its full header is keyboard/touch accessible with expanded/controls
   state, down/up chevron and a light divider above the expanded list.
2. Show room names/icons and right-aligned estimated starts in chronological
   order. Test long names, cross-day estimates, HA time zone and 12/24-hour time
   at 344/360/768/1024 px. A predeparture estimate retains its actual timestamp.
3. Include only adaptive pending/preparing rows from the current saved-arrival
   preview. Retained times on suspended/reached/unavailable or arrival-only rows
   must not appear. The earliest row and rail marker use the same eligibility.
4. Opening makes no API request. Source pushes and minute updates preserve the
   open list; changed saved arrival, episode or no eligible rows close it.
   Weekly Room preparation expansion remains independent. Back still discards
   arrival edits and does not change the saved estimate.

5. Open the arrival editor: the estimated-start disclosure and fallback helper
   disappear from the DOM, while the saved timeline/tick stay unchanged. Opening
   dismisses any visible help and its listeners. Failed adjustments keep them
   hidden. Back restores same-episode expansion and Cancel; a saved arrival change
   resets the disclosure. Check the visible Cancel surface sits about 12 px below
   the blue callout at mobile/tablet/desktop widths.

### Explicit one-off return without occupancy sources

1. Save no occupancy sources with the weekly routine disabled and valid Modes.
   In card/sidebar, Plan return remains available when backend can_start permits.
   Help explicitly states that pressing it applies Away immediately, without an
   absence timer. Do not show zero sensor counters or an irrelevant delay icon;
   sidebar occupancy says Not monitored rather than treating the home as empty.
   Its explanation aligns with the heading's text column and wraps within the
   container padding on mobile and desktop.
2. Start a future return: verify immediate persisted Away and confirmed departure,
   normal per-room preparation and destination at arrival. Restart, adjust and
   Cancel retain existing behavior. No presence-triggered arrival is available.
3. A nonempty saved list with unavailable/unknown sources remains monitored and
   waits normally; missing configured entities cannot be treated as sensorless.
   Unsaved source edits must not change runtime guidance or eligibility. Weekly
   routine configuration still requires a valid nonempty source list.

### Compact title and phase with preparation help

Check the fallback information icon stays beside the title without pushing the
phase subtitle down. The title/phase gap stays small while the graph retains
breathing room. The help reserves its own column and keeps a 44 px target;
wrapped title and phase text must not overlap it at 360 px with long EN/ES text
and source counts. Verify keyboard/tap help and viewport popup placement remain
unchanged, with no transformed ancestor.
