# Frontend

Velair ships a Home Assistant sidebar panel and an optional Lovelace card. Both are built from the same TypeScript/Lit bundle and consume the same backend WebSocket API.

## Runtime Elements

- `velair-main-panel`: sidebar panel element registered by Home Assistant.
- `velair-card`: optional Lovelace card.
- `velair-card-editor`: optional Lovelace card editor.

The sidebar panel renders the shared `velair-card` element with the active panel view. This keeps the sidebar panel and optional Lovelace cards on the same composition path while avoiding unused private custom-element aliases.

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

Then add one or more Velair cards. The card does not carry an independent UI; it selects one panel view fragment and renders it with the same data model as the sidebar panel.

```yaml
type: custom:velair-card
view: overview-status
```

Supported Lovelace `view` values:

- `overview-status`
- `overview-boosts`
- `overview-events`
- `overview-timeline`
- `overview-zones`
- `schedules`

Do not keep an old `/local/velair-card.js` resource active while testing an installed or HACS-style build. Browser custom elements cannot be redefined in place, so stale local resources can keep old code loaded until the page is fully reloaded.

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
- Add translations in `translations/en.ts`, `translations/es.ts`, and `translations/template.ts`.

## Translations

Frontend translations live in:

```text
frontend/src/velair/translations/
```

- `en.ts` is the source language and defines the complete key set.
- `es.ts` must satisfy the same key set.
- `template.ts` contains the same keys with empty string values and can be copied when adding a new language.
- `index.ts` automatically builds the language map from every translation file in this folder.
- `types.ts` defines the translation dictionary shape from `en.ts`.

The file name must be the Home Assistant language code in lowercase. Use ISO-style short codes such as:

| Language | File | Export |
| --- | --- | --- |
| German | `de.ts` | `de` |
| French | `fr.ts` | `fr` |
| Italian | `it.ts` | `it` |
| Portuguese | `pt.ts` | `pt` |

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

4. Fill every value. Keep all keys unchanged.
5. Run the checks:

   ```powershell
   cd frontend
   npx.cmd tsc --noEmit
   npm.cmd run build
   cd ..
   python -m unittest discover -s tests
   ```

No manual registration is needed. The frontend build scans `frontend/src/velair/translations/*.ts`, ignores `index.ts`, `template.ts`, and `types.ts`, and uses each remaining file name as the Home Assistant language code. The exported constant must match the file name.

The frontend language detector matches exact language codes and regional variants by prefix. For example, adding `de` also matches `de-DE`, `de-AT`, and `de-CH`. No extra detection code is needed for normal language codes.

If a language needs custom matching beyond a simple prefix, update `languageFromHass` in `frontend/src/velair/i18n.ts`.

These frontend dictionaries only translate the Velair panel, Lovelace card, and card editor. Home Assistant integration strings such as config flow, services, selectors, and system dialogs live separately under:

```text
custom_components/velair/translations/
```

When adding a full project language, add both:

- `frontend/src/velair/translations/<language>.ts` for the Velair UI bundle;
- `custom_components/velair/translations/<language>.json` for Home Assistant integration strings.

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
