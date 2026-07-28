# Documentation

Velair documentation is grouped by audience and topic.

## User Documentation

- [Installation](user/installation.md): install Velair through HACS or manually.
- [Usage](user/usage.md): configure climates, schedules, templates, profiles, boosts, pauses, import/export, and services.
- [Climate Profiles](user/climate-profiles.md): coordinate alternate schedules and expose configurable Modes to Home Assistant automations.
- [Automation Events](user/automation-events.md): use complete runtime event payloads in Home Assistant automations.
- [Adaptive Preconditioning](user/adaptive-preconditioning.md): start scheduled comfort targets early with local learning.
- [Room Assist](user/room-assist.md): use a separate room temperature sensor for TRVs, thermostats, and AC units.
- [Environmental Comfort](user/comfort.md): understand temperature, humidity, CO2 air quality, and reading freshness through local room assessments.
- [Temperature Units and Migration](user/temperature-units.md): understand Celsius/Fahrenheit defaults, upgrades, migration, import/export, and recovery.
- [Troubleshooting](user/troubleshooting.md): common setup, frontend resource, and runtime issues.

## Developer Documentation

- [Architecture](developer/architecture.md): backend and frontend module boundaries, persistence model and scheduler flow.
- [WebSocket API](developer/api.md): frontend/backend API contract.
- [Adaptive preconditioning internals](developer/adaptive-preconditioning.md): local learning states, similarity weighting, storage, and API output.
- [Room Assist internals](developer/room-assist.md): room sensor source selection, assisted target calculation, runtime status, restoration, and events.
- [Environmental Comfort internals](developer/comfort.md): source selection, condition assessment, data quality, listeners, API output, and events.
- [Temperature unit internals](developer/temperature-units.md): storage metadata, migration boundaries, portable conversion, validation, and runtime safety.
- [Frontend](developer/frontend.md): frontend runtime elements, build commands, Lovelace resource, translations, UI principles, and frontend workflow.
- [Development](developer/development.md): local checks, generated files, coding guidelines, and contribution workflow.
- [Manual testing](developer/manual-testing.md): release and behavior verification checklist.

## Project Documentation

- [Screenshots](project/screenshots.md): real screenshots.

Future ideas and feature requests should be tracked through GitHub issues or discussions so they can evolve with community feedback without creating roadmap promises.
