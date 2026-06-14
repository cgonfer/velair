# Development

This guide covers local development for Velair.

## Requirements

- Home Assistant development or test instance.
- Python compatible with the Home Assistant version you target.
- Node.js and npm for the frontend build.

## Backend Checks

Run from the repository root:

```powershell
python -m unittest discover -s tests
```

Backend tests are split by responsibility under `tests/backend/`:

- `helpers.py` provides Home Assistant stubs and scheduler fixtures.
- `test_models.py` covers storage/model normalization.
- `test_scheduler_application.py` covers scheduler services, overrides, portability, and climate application behavior.
- `test_next_events.py` covers next-event calculations.
- `test_templates.py` covers default and stored template behavior.

When deeper Home Assistant coverage is needed, prefer Home Assistant-style tests that interact through public integration boundaries: config entry setup, service calls, entity states, registries, and events. Avoid asserting against private implementation details unless the test is deliberately documenting a narrow internal contract.

## Frontend Checks

Run from `frontend`:

```powershell
npm.cmd run test
npx.cmd tsc --noEmit
npm.cmd run build
```

Frontend behavior tests live under `frontend/tests/` and run with Vitest. Use them for pure TypeScript logic such as schedule calculations, timeline projection, formatting, validation, derived view data, and controller workflows.

The `frontend/tests/components/` folder contains lightweight jsdom smoke tests for frontend entrypoint registration. These tests are not a full browser replacement, but they catch broken custom-element registration and basic panel rendering before manual Home Assistant testing.

Python frontend tests live under `tests/frontend/`. They cover Home Assistant panel registration and a limited set of temporary source/bundle contracts that do not yet have TypeScript or browser coverage. New frontend behavior should normally be covered with Vitest first.

The normal build generates a development build identifier for the Settings maintenance section. For release packaging:

```powershell
npm.cmd run build:release
```

Release builds show the integration version from `custom_components/velair/manifest.json`.

## Generated Files

Do not edit generated JavaScript files by hand:

```text
frontend/dist/velair-card.js
frontend/dist/velair-card.js.map
custom_components/velair/frontend/velair-card.js
custom_components/velair/frontend/velair-card.js.map
```

The integration-served bundle under `custom_components/velair/frontend/` must be generated before publishing a release because HACS users need a ready-to-load frontend.

## Coding Guidelines

- Keep Home Assistant runtime code asynchronous.
- Do not add continuous polling when callbacks or timers can solve the problem.
- Validate climate targets against configured entities before applying any action.
- Preserve heating and cooling support.
- Keep frontend configuration persisted through the backend, not browser storage.
- Keep user-facing strings translated in English and Spanish.
- Prefer small modules with focused responsibilities.
- Add or update tests when changing behavior.

## Frontend Change Workflow

When changing the frontend, start from the user workflow and follow the responsibility boundaries. The canonical frontend module map and dependency direction live in [Architecture](architecture.md); detailed frontend build and translation notes live in [Frontend](frontend.md).

1. Update `views/` when the change is mostly layout or visible UI.
2. Update `controllers/` when the change handles user actions, draft state, validation, or derived view data.
3. Update `domain/` when the change is a pure calculation or transformation.
4. Update `api/client.ts` when the change needs a backend WebSocket command.
5. Update `components/velair-card-element.ts` only for element-owned state, lifecycle, API client creation, or top-level wiring.
6. Update `styles/` for CSS and `translations/` for user-facing text.

Example: adding a new action to the Schedules tab usually touches:

```text
views/schedule-view.ts
controllers/schedule-actions.ts
api/client.ts
custom_components/velair/api.py
tests/
translations/
```

It should not require browser storage. If data must survive reloads or different devices, it belongs in backend storage.

## Manual Test Instance

Use a non-critical Home Assistant instance and safe climate entities. Do not test against hardware where an unexpected temperature change would create discomfort or waste energy.

See [manual-testing.md](manual-testing.md) for the full checklist.

## Release Checklist

1. Update `custom_components/velair/manifest.json` version.
2. Update `frontend/package.json` version if needed.
3. Run backend tests.
4. Run frontend unit tests.
5. Run TypeScript check.
6. Run `npm.cmd run build:release`.
7. Verify the generated integration bundle is updated.
8. Update documentation and screenshots.
9. Create and push a matching release tag, such as `v1.0.0`.
10. Confirm the GitHub Release workflow attaches:
    - `velair-custom-component-<version>.zip`
    - `velair-lovelace-resource-<version>.zip`

## GitHub Actions

CI runs on pushes to `main` and pull requests. It executes backend tests, frontend tests, TypeScript checks, and a frontend build. Successful frontend jobs upload short-lived artifacts so maintainers can test the exact bundle produced by a pipeline:

- `velair-custom-component`: complete integration folder for copying to Home Assistant `custom_components`.
- `velair-lovelace-resource`: compiled frontend resource files for advanced manual Lovelace testing.

The release workflow runs manually or when pushing a `v*` tag. It validates that the tag matches the integration version, builds the release frontend bundle, packages installable zips, uploads them as workflow artifacts, and attaches them to the GitHub Release when the workflow was triggered by a tag.
