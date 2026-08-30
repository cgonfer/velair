# Frontend

Velair ships a Home Assistant sidebar panel and an optional Lovelace card. Both are built from the same TypeScript/Lit bundle and consume the same backend WebSocket API.

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

The independent `active-setup` card accepts a local `active_setup_controls`
presentation option:

```yaml
type: custom:velair-card
view: active-setup
active_setup_controls: both
```

Valid values are `modes`, `profiles`, and `both`; omission and invalid values
fall back to `both`. This setting filters only the available Active setup
actions. The current Mode and active Profile summary always remain visible, and
no value is persisted through Velair storage. Profiles-only cards retain a
Default action because direct Profile activation replaces the complete active
set; composing several non-overlapping Profiles remains a Mode responsibility.

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
- Add source strings to `translations/en.ts` and `translations/template.ts`, then update every complete language. Reviewed community languages may omit uncertain strings and use the tested English fallback.

## Translations

Frontend translations live in:

```text
frontend/src/velair/translations/
```

- `en.ts` is the source language and defines the complete key set.
- `de.ts`, `es.ts`, `fr.ts`, `it.ts`, `nl.ts`, `pl.ts`, `pt_br.ts`, `pt_pt.ts`, and `ru.ts` satisfy the complete source key set.
- A future staged community translation may contain only reviewed keys. Missing keys fall back to English.
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
   import type { TranslationDictionary } from "./types";

   export const de = {
     // same keys as the template, translated values filled in
   } as const satisfies TranslationDictionary;
   ```

4. Fill every value for a complete translation, or include only reviewed values for a staged community translation. Keep all included keys unchanged. Translate from the key and the UI meaning, not from the English sentence in isolation.
5. Run the checks:

   ```powershell
   cd frontend
   npx.cmd tsc --noEmit
   npm.cmd run build
   cd ..
   python -m unittest discover -s tests
   ```

No manual registration is needed. The frontend build scans `frontend/src/velair/translations/*.ts`, ignores `index.ts`, `template.ts`, and `types.ts`, and uses each remaining file name as the Home Assistant language code. The exported constant must match the file name. For example, `pt_br.ts` exports `pt_br` and is registered as `pt-br`.

Complete translations are checked against every English key and placeholder. Staged community translations are checked as a strict subset: every included key must exist in English and use the same placeholders, while omitted keys are rendered from `en.ts`. Prefer an English fallback over publishing a translation whose technical meaning has not been reviewed.

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
