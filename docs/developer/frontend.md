# Frontend

Velair ships a Home Assistant sidebar panel and an optional Lovelace card. Both are built from the same TypeScript/Lit bundle and consume the same backend WebSocket API.

## Shared Command Button Sizing

Text command buttons share sizing through `base-styles.ts`, including native
buttons and summary-based actions such as Active setup's Change menu. Use
border-box sizing so padding and borders are included in the minimum height:
38px normally and 34px for the compact variant, with 44px targets on devices
with coarse pointers. Inherited typography and an explicit line height keep
icon/text alignment consistent. Heights remain content-driven so long labels
can grow instead of clipping. Context-specific width and color treatments
remain local; avoid extra minimum heights on individual command actions.

## Runtime Elements


- `velair-sidebar-panel`: sidebar panel element registered by Home Assistant.
- `velair-panel-card`: internal card element used only by the sidebar panel.
- `velair-card`: optional Lovelace card.
- `velair-card-editor`: optional Lovelace card editor.

The sidebar panel renders `velair-panel-card` with the active panel view. It uses the same class and composition path as `velair-card`, but a distinct custom-element name prevents an older cached Lovelace resource from blocking a newer sidebar implementation.

The sidebar **Schedules** view is the canonical planning workspace. Its local
source selector composes either the existing Default schedule adapter or the
Profile draft editor. Default schedules continue to use per-day backend writes;
Profile schedules keep a complete temporary Profile draft and persist it through
the Profile API as one atomic value. The selector is deliberately absent from
the Lovelace `schedules` card, whose established meaning remains the Default
schedule editor. The canonical panel view for composition is `modes`; the
legacy `profiles` route is normalized to `modes` for cached links.

## Panel Routing

The sidebar routes tabs and the Schedules (`default`, `profiles`) and Templates
(`templates`, `presets`) subsections. The
[Usage Guide](../user/usage.md#panel-navigation-and-direct-links) is the public
route reference, including aliases, fallbacks, and a dashboard-link example.

- `domain/panel-routes.ts` defines `PanelDestination` and `PanelSubsection`,
  normalizes destinations with `panelDestination`, parses paths with
  `parsePanelPath`, and generates canonical paths with `panelPath`.
- `views/panel.ts` owns the Home Assistant `route` property and the window's
  `location-changed` and `popstate` subscriptions. It initializes from the
  incoming route and follows the current URL thereafter, ignoring stale route
  replays and navigation outside the panel prefix. Subscriptions are removed
  when the panel disconnects.
- The panel passes `.subsection` to `velair-panel-card`. The child exposes
  `selectPanelSubsection(subsection)` with a boolean acceptance result and emits
  the bubbling, composed `velair-subsection-changed` event with the accepted
  `PanelSubsection` as its detail. Initial selection works before backend data
  arrives. Existing resource-usage and preset jumps select the matching route
  only after the navigation guard accepts.

Accepted destination changes push one history entry; repeated selections add
none. Canonicalization replaces the current entry. Replaced entries retain
Home Assistant's history metadata; new entries carry `from` with the previous
URL rather than inheriting root or dialog state. The panel tracks its history
position with `velairPosition` and reverses rejected Back/Forward movements
between tracked entries without adding another entry. For older entries without
a tracked position, it restores the visible destination by replacing the
current URL. Home Assistant navigation actions into the panel also receive a
tracked position. Unknown tab names are handled by `parsePanelPath`.

Switching subsections keeps the card instance and its existing draft behavior.
Switching tabs recreates the card only after any discard confirmation accepts.
Cancelled navigation preserves the draft, visible section, and URL. The URL
contains no draft contents, selected resource IDs, or climate commands; there
are no backend API or storage changes. Lovelace components do not own these
global listeners and retain their dashboard URLs.

Automated coverage lives in `tests/domain/panel-routes.test.ts` and
`tests/views/panel-routing.test.ts`, alongside existing preset-navigation
regressions. Live validation is described in the
[manual testing checklist](manual-testing.md#panel-navigation-and-direct-links).

## Panel Data Session

The sidebar panel owns one temporary schedule-data session for its mounted
lifetime. `controllers/panel-schedule-session.ts` retains the latest backend
snapshot and owns the schedule request and update subscription. Switching tabs
reuses that snapshot and subscription; it does not restart the initial load.
The first entry still needs backend data, and reconnecting resynchronizes it.
The session is disposed when Home Assistant disconnects the panel element,
not merely when the browser window loses focus.

The panel still keys its child by tab. Editors therefore retain their existing
discard confirmations and cleanup, while subsection changes preserve the
child instance. Shared snapshots contain confirmed backend state, never local
drafts. Incoming updates use the existing draft-preserving application path;
an explicit save's draft reset applies only to the originating editor.
Mutation responses and explicit refreshes feed the same session so later tabs
do not reopen an older snapshot. Pending responses from a previous session or
connection are ignored. A newer accepted update supersedes an outstanding
refresh; configuration revision alone cannot order runtime-only updates or
configuration resets.

Diagnostics keeps its own view-local subscription and diagnostic overlay.
Optional Lovelace cards share a separate session with other mounted cards on the
same Home Assistant connection; they do not consume the panel session.
Persisted configuration, scheduler
behavior, and backend APIs are unchanged. The session adds no polling and does
not persist data across page refreshes.

See the [session checks](manual-testing.md#panel-data-session) for live
reconnection, mutation, and draft scenarios. Automated regressions are in
`tests/controllers/panel-schedule-session.test.ts` and
`tests/components/panel-session.test.ts`, alongside the route/history and
diagnostics lifecycle tests.

## Lovelace Data Session

Mounted Velair cards on the same Home Assistant connection share one temporary
backend snapshot, initial schedule request, and schedule-update subscription.
The initial subscription also sends a snapshot; this change deduplicates work
between cards without changing that backend protocol. A single card still needs
an initial load. Sessions are not shared between devices or browser tabs.

`controllers/lovelace-schedule-sessions.ts` uses the actual incoming connection
as its registry key and a set of card
instances as owners. Registering or removing an owner is idempotent. A card
joins on connection and leaves on disconnection; changing its HA connection
releases the previous session and joins the new one. The last owner closes the
subscription and releases the session, including subscription setup that
finishes late. Lovelace can retain cards in hidden views: those mounted cards
remain owners and continue receiving updates. Visibility alone does not close
the session, and no data is stored across page refreshes.

Known session connection facades are resolved to their original connection
before registration and connection comparison. Reassigning a card's exposed
`hass` object therefore cannot accidentally create another session.

Each card retains its own configuration, entity filters, selected climate,
drafts, confirmation dialogs, errors, and diagnostic overlay. Filters affect
presentation, not the shared backend snapshot. Confirmed API mutation responses
update the session for all owners, while forced draft resets stay local to the
originating card. Refreshes from multiple owners are grouped to avoid repeated
requests for the same input change. Reconnection and stale-response guards use
the same schedule-session machinery as the panel. No polling or frontend
configuration persistence is added.

See the [Lovelace session checklist](manual-testing.md#lovelace-data-session)
for real Home Assistant lifecycle and multi-card scenarios. Automated coverage
is in `tests/components/lovelace-session.test.ts` and the shared session,
panel-session, and controller action tests.

## Source Of Truth

The TypeScript source is under:

```text
frontend/src/
```

Generated bundles are:

```text
frontend/dist/velair-card.js
custom_components/velair/frontend/velair-card.js
```

Do not edit generated JavaScript files by hand.

## Build Commands

Install dependencies once:

```powershell
cd frontend
npm install
```

Development build:

```powershell
npx.cmd tsc --noEmit
npm.cmd run build
```

Release build:

```powershell
npm.cmd run build:release
```

The normal build shows `Build <timestamp>` in the Settings maintenance section. The release build shows `v<manifest version>`, using `custom_components/velair/manifest.json`.

The build copies the integration-served bundle to:

```text
custom_components/velair/frontend/velair-card.js
```

This bundle must be committed for HACS users.

## Optional Lovelace Resource

Use the integration-served resource:

```yaml
url: /velair_frontend/velair-card.js
type: module
```

Velair serves this resource with `no-store` response headers. The sidebar adds its own automatic build identifier and uses isolated internal element names, so users must not append manual build identifiers or edit the Lovelace resource between releases.

Then add one or more Velair cards. The card does not carry an independent UI; it selects one panel view fragment and renders it with the same data model as the sidebar panel.

```yaml
type: custom:velair-card
view: overview-status
```

Cards can use an optional `entities` list to show only selected Velair-managed climates in that dashboard card. This is local Lovelace configuration only; it does not persist through Velair storage and does not change scheduler behavior. Per-climate views, lists, copy targets, template apply targets, next events, boosts, timelines, settings rows, and preconditioning rows use the filtered list. Global views such as `overview-status` and `active-setup` do not use an entity filter.

Template Apply to uses temporary selection/review state for one Default or
Profile context, one copy/link mode and a built-in layout. Only the backend
preview chooses compatible donor proposals and validates the complete candidate.
Review editors reuse block controls with fixed template times. Base selection
and assignment edits do not persist until the atomic application command.
Source, configuration revision or selection changes invalidate previews;
out-of-order requests cannot replace newer review input. Dirty review data
participates in the existing navigation/discard protection. The frontend never
implements template application with sequential daily or Profile saves.

The independent `active-setup` card accepts a local `active_setup_controls`
presentation option:

```yaml
type: custom:velair-card
view: active-setup
active_setup_controls: both
```

Valid values are `modes`, `profiles`, and `both`; omission and invalid values
fall back to `both`. This setting filters only the available Active setup
actions. The shared **Base** and **Exceptions** summary always remains visible, and
no value is persisted through Velair storage. Profiles-only cards retain a
Default action because direct Profile activation replaces the complete active
set. Each Profile choice also offers a compact layers action that applies its
configured rooms as exceptions without replacing the base.

Profile library rows use two columns: editable identity and a dedicated vertical
action rail, ordered base activation, exception application, then deletion.
Transparent icon buttons retain an inset from the row edge and never wrap into
the identity column. Base and exception indicators derive independently from
structured base IDs and managed zone overrides, with legacy base-ID fallback.
Same-Profile base/exception references highlight both actions; fully overridden
bases retain their base indicator. The effective Profile union must not drive
the base button. Editing selection is separate from usage state and actions
must not select another editor. Deleting the edited Profile still clears its
editor after confirmation. Keep the row-specific layout scoped to Profiles.

The overview contains no per-zone editing disclosure. Exception count buttons
toggle a read-only region beneath the selected group, preserving all exception
rows. A chevron and `aria-expanded` expose the disclosure state. A short CSS
transition respects reduced-motion preferences. Only one group opens at a time;
the same button or Escape closes it, with Escape restoring trigger focus.
Collapsed regions are excluded from keyboard and accessibility navigation;
removing the selected group through a backend update closes its stale detail.
Long detail lists scroll within a bounded area. These inspection controls are
available in every scope and never call a mutation API. The mutation handler
continues to reject Profile exception actions in Mode-only scope.

The `activeSetupSummary` domain helper derives the persisted base identity and
groups explicit `zone_profile_overrides` by Profile ID or null. It does not infer
the base from the native select's Manual state or group the union of effective
Profile IDs as exceptions. Explicit Default and explicit Profile-normal behavior
retain separate provenance. Mode, Profile, multiple Profiles and Default bases
remain identifiable even when their rooms are fully replaced. The renderer
shares existing icons, accents and theme variables. The base label, name and
type use two compact levels: Base and type above the wrapping name.
Base coverage intersects the union of base Profile zone keys with the unique
managed entities; Default bases include all managed entities. Explicit Default
entries within a base Profile participate in its scope. Any own override key,
including null or the same Profile, excludes that zone from inherited coverage.
Fallback Default outside a Profile base never increases its coverage. Empty
scope and fully overridden scope have distinct presentation. Base Profiles are
identified in the distribution legend; remove the redundant Mode component list.
Distribution segments partition all unique managed entities by base, exception
or fallback Default origin and Profile identity. They retain separate origins
even for the same Profile. The distribution total is the managed-zone count,
not the base coverage denominator. Exception segments and the Exceptions list
use that same managed scope, ignoring stale unmanaged references. Segment counts
sum to the household total and omit zero counts. Reuse Profile accents and icons,
neutral Default and a text legend so color is not the only identifier. Render
the 6px bar and entire legend inside a disclosure within the base summary,
below its own coverage count, closed initially. Its stable button shows the
household total and a chevron; `aria-expanded`, `aria-controls`, hidden/inert
collapsed content and Escape/focus restoration mirror exception inspection.
Expansion grows downwards, with reduced-motion-aware transition. This local
presentation state is not persisted and never invokes a mutation API. Live data
updates refresh open content; removing all segments resets it to closed.
The legend uses 14px icons, 12px text and separate right-aligned counts; names
wrap within their own column. Rounded ends and thin separators remain.
The global scope is unchanged by this placement. An empty base still has a
bar when managed entities exist; zero managed entities render no bar. Keep one
base coverage summary and no duplicate masked note. Align the base icon to the
top of its header and use a layers icon on the Exceptions heading.
Desktop uses one third of the summary for Base and two thirds for Exceptions;
the Exceptions heading uses the standard compact content spacing. Exception
counts use dense desktop rows and larger touch targets on coarse-pointer devices.
The header grid placement does not depend on expansion state. Details expand
below the fixed header, leaving the triggering button's coordinates unchanged
and pushing later groups down.
Media and container queries keep the
summary, chooser and detail controls accessible in narrow cards.

```yaml
type: custom:velair-card
view: overview-events
entities:
  - climate.living_room
  - climate.bedroom
zone_order:
  - climate.bedroom
  - climate.living_room
```

The Room Assist card (`view: sensors`) can also hide individual UI sections with local Lovelace-only booleans:

```yaml
type: custom:velair-card
view: sensors
show_room_assist_switch: false
show_room_assist_sensor: false
show_room_assist_deadband: false
show_room_assist_max_delta: false
show_room_assist_debounce: false
show_room_assist_live_status: true
```

Omitted `show_room_assist_*` values default to `true`.

The Room Assist live scale derives its displayed deadband from the saved
`room_sensor_assist_deadband` value. A scalar target expands by the deadband on
both sides. For fixed `heat` or `cool`, those edges are runtime-hysteresis
limits and the live status can use `hysteresis_phase` and `hysteresis_target`
to identify the active journey. The corresponding edge receives a restrained
accent line, the block summary names the active limit, and Overview exposes the
same phase in its Room Assist signal. For scalar automatic modes the band remains a
neutral margin. A native range expands beyond both scheduled boundaries. Those
endpoints participate in the scale bounds so the striped band is never
clipped. The non-zero legend uses the actual deadband range as its coordinate
track and positions the complete translated label at its horizontal midpoint.
The range allows that label to remain visible when the represented band is
narrower than the text, without changing the band width or introducing scroll
listeners, observers, or Lit state. The striped surface is centered on the
main scale line with a visible gap before the lower relationship line. A
zero value keeps a static explicit legend without drawing a surface and fixed
scalar control falls back to the legacy signed calculation.
`show_room_assist_deadband: false` hides the configuration row, visualization,
and legend as one display option. This is derived UI only and must not create
frontend persistence.

The Comfort card (`view: comfort`) uses the same thermostat filtering and can
hide its configuration or each live graph independently:

```yaml
type: custom:velair-card
view: comfort
entities:
  - climate.living_room
show_comfort_configuration: false
show_comfort_temperature: true
show_comfort_humidity: false
show_comfort_co2: true
```

Omitted `show_comfort_*` values default to `true`. These values are Lovelace
display options only; they must not be persisted through Velair storage and must
not change backend Comfort listeners, thresholds, events, or generated sensors.

Supported Lovelace `view` values:

- `climate`
- `overview-status`
- `overview-boosts`
- `overview-events`
- `overview-timeline`
- `overview-zones`
- `active-setup`
- `schedules`
- `sensors`
- `comfort`
- `preconditioning`
- `planned-return`

Do not keep an old `/local/velair-card.js` resource active while testing an installed or HACS-style build. Browser custom elements cannot be redefined in place, so a second resource URL can still register obsolete elements before Velair's canonical module loads.

## Architecture Reference

The frontend module map, dependency direction, and schedule save flow are documented in [Architecture](architecture.md). Keep that page as the source of truth for long-lived boundaries.

This page focuses on frontend-specific operational guidance: runtime elements, build behavior, Lovelace resource usage, where to place changes, translations, UI principles, and frontend checks.

## Where To Put New Code

- Add a new WebSocket call in `api/client.ts`.
- Add pure calculations in `domain/`.
- Add action/event handling in `controllers/`.
- Add layout and Lit templates in `views/`.
- Add state or lifecycle integration in `components/velair-card-element.ts` only when the state belongs to the element itself.
- Add CSS in the closest `styles/*-styles.ts` file, and only touch `card-styles.ts` when composing a new style module.
- Add source strings to `translations/en.ts` and empty entries to `translations/template.ts`. During development, translations may be deferred; omitted strings use the tested English fallback. Review all supported languages before preparing a release.

## Translations

Frontend translations live in:

```text
frontend/src/velair/translations/
```

- `en.ts` is the source language and defines the complete key set.
- Non-English dictionaries may contain only reviewed keys. Missing keys fall back to English, including while new English copy is being developed.
- `template.ts` contains the same keys with empty string values and can be copied when adding a new language.
- `index.ts` automatically builds the language map from every translation file in this folder.
- `types.ts` defines the translation dictionary shape from `en.ts`.

The file name must use the lowercase Home Assistant language code. Use an underscore in TypeScript file and export names for regional BCP 47 variants; the loader exposes it as a hyphenated language tag at runtime.

| Language | File | Export |
| --- | --- | --- |
| German | `de.ts` | `de` |
| Spanish | `es.ts` | `es` |
| French | `fr.ts` | `fr` |
| Italian | `it.ts` | `it` |
| Dutch | `nl.ts` | `nl` |
| Polish | `pl.ts` | `pl` |
| Brazilian Portuguese | `pt_br.ts` | `pt_br` |
| European Portuguese | `pt_pt.ts` | `pt_pt` |
| Russian | `ru.ts` | `ru` |

For example, to add German:

1. Copy the template:

   ```powershell
   Copy-Item frontend/src/velair/translations/template.ts frontend/src/velair/translations/de.ts
   ```

2. Open `frontend/src/velair/translations/de.ts`.
3. Rename the exported constant from `translationTemplate` to `de`:

   ```ts
   import type { PartialTranslationDictionary } from "./types";

   export const de = {
     // same keys as the template, translated values filled in
   } as const satisfies PartialTranslationDictionary;
   ```

4. Include only reviewed values and omit pending keys instead of leaving empty strings or copying English to claim coverage. Keep included keys unchanged. Translate from the key and UI meaning, not from the English sentence in isolation.
5. Run the checks:

   ```powershell
   cd frontend
   npm.cmd run test
   npx.cmd tsc --noEmit
   npm.cmd run build
   cd ..
   python -m unittest discover -s tests
   ```

No manual registration is needed. The frontend build scans `frontend/src/velair/translations/*.ts`, ignores `index.ts`, `template.ts`, and `types.ts`, and uses each remaining file name as the Home Assistant language code. The exported constant must match the file name. For example, `pt_br.ts` exports `pt_br` and is registered as `pt-br`.

Development tests validate every included key, nonempty value, placeholders, encoding, and reserved identifiers; omitted keys are rendered from `en.ts`. English remains complete and the template must have matching keys with empty values. Prefer an English fallback over publishing a translation whose technical meaning has not been reviewed.

Before preparing any release, including a beta, run this read-only audit from `frontend` with an explicitly selected published tag:

```powershell
npm.cmd run translations:check -- --base v<previous-published-version>
```

The audit discovers all frontend and integration language catalogs, checks missing/extra keys, empty values and placeholders, and compares English text with that tag. Changes to English are candidates for semantic review in every affected language, even if the translated value also changed. Identical English and translated values are not automatically errors: technical names may legitimately match. The integration uses `translations/en.json` as its canonical English catalog.

Exit codes are `0` for no structural, coverage or review findings, `1` for missing coverage or semantic review candidates, and `2` for invalid input, malformed catalogs, extra keys, empty values, placeholder errors or canonical-source/template mismatches. A tag is required; the command does not infer a stable/beta baseline and never writes catalogs. An unchanged English baseline does not prove translation quality.

Present missing translations and review candidates by language and ask the maintainer whether to complete them or continue with an explicit release exception. Wait for that decision. Re-run the audit after authorized translation work; document accepted coverage/review exceptions. Technical failures (exit `2`) must be corrected before release and cannot be waived as translation deferral.

Every included string must be reviewed in its Velair context. In particular,
check whether a value is a button action, state, field label, sentence, HVAC
mode, schedule concept, or diagnostic reason. Ambiguous English words such as
`Apply`, `Current`, `Cool`, `Heat`, `Holding`, `On`, `Publishing`, `Saving`,
`Swing`, `Target`, and `Time` must use the natural term for that exact UI role.
An automated translation may be used only as a draft and is not considered
reviewed until its meaning, tone, placeholders, and surrounding terminology
have been checked against the interface.

Keep product and technical identifiers stable when translating. In particular,
do not translate `Velair`, `Home Assistant`, `Room Assist`, entity IDs, service
names, attribute names, raw HVAC mode identifiers, or placeholders such as `{entity}`.
Labels such as Profile, Mode, Boost, Comfort, and Preconditioning may use the
established term for the target language when that is clearer to its users.

The frontend language detector normalizes hyphens, underscores, and letter case. It prefers exact regional matches before falling back to a base language. For example, `pt-BR` and `pt_BR` select Brazilian Portuguese, while Home Assistant's standard `pt` code, plus the accepted `pt-PT` and `pt_PT` aliases, select European Portuguese. Base languages such as `de` still match `de-DE`, `de-AT`, and `de-CH`.

If a language needs custom matching beyond a simple prefix, update `languageFromHass` in `frontend/src/velair/i18n.ts`.

These frontend dictionaries only translate the Velair panel, Lovelace card, and card editor. Home Assistant integration strings such as config flow, services, selectors, and system dialogs live separately under:

```text
custom_components/velair/translations/
```

When adding a full project language, add both:

- `frontend/src/velair/translations/<language>.ts` for the Velair UI bundle;
- `custom_components/velair/translations/<language>.json` for Home Assistant integration strings. These filenames use Home Assistant's BCP 47 language tags, such as `pt-BR.json` for Brazilian Portuguese and `pt.json` for European Portuguese.

## UI Principles

- Use Home Assistant components where practical.
- Use Home Assistant theme variables.
- Keep the sidebar panel as the primary app experience.
- Keep the Lovelace card optional and lightweight.
- Avoid frontend-only persistence for configuration.
- Keep mobile and tablet layouts first-class.
- Avoid hidden behavior that only works on desktop.
- Make destructive actions explicit and confirm them.

## Test Expectations

After every frontend change:

```powershell
cd frontend
npm.cmd run test
npx.cmd tsc --noEmit
npm.cmd run build
cd ..
python -m unittest discover -s tests
```

Frontend unit tests live under `frontend/tests/` and run with Vitest. Prefer these tests for behavior in pure TypeScript modules: schedule events, timeline projection, formatting, validation, derived overview data, controller workflows, portability helpers, and other logic that does not need a browser.

Use jsdom-based tests in `frontend/tests/components/` for lightweight component smoke coverage such as custom-element registration and basic panel rendering. Keep these tests focused; use real browser checks only for responsive layout, pointer behavior, and Home Assistant shell interactions that jsdom cannot model.

Python frontend tests live under `tests/frontend/`. They cover Home Assistant panel registration and a small number of temporary source/bundle contracts. Do not add new string-existence tests when a Vitest behavior test or a browser-level regression would describe the behavior more directly.
