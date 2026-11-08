# Velair website

This directory contains the static public website deployed through GitHub
Pages. It is intentionally independent from the Home Assistant frontend and
from the ignored local Screenshot Lab.

## Structure

- `public/` is the complete deployable Pages artifact.
- `public/quality/` contains the public quality methodology and generated release
  evidence. The Pages workflow populates it from published release report assets;
  it does not publish daily development results or authenticated browser traces.
- Release reports explain named Velair actions, what is checked, results and
  per-variant screen coverage. Their wording and interpretation are shared with
  PR comments through `scripts/quality/actions.json` and `actions.py`.
  Action timings are separate from background conditions, visual review and
  technical measurements. Package/HACS executions stay separate; charts and
  disclosures work without JavaScript. Missing or failed evidence stays explicit.
  Reports open with an action-results ring and operation timing bars. The ring
  counts each action once and requires success in every recorded execution for
  green; timings belong to the first execution, identified in the caption.
  Green/red action containers also include status text; incomplete and missing
  evidence have distinct states. Check counts, scope, coverage and diagnostic
  charts remain in details. Failures and checks needing attention stay visible.
  Measurement details distinguish operation timings, resource readings and
  per-execution totals/snapshots. Functional test durations stay in Playwright
  diagnostics. Percentiles appear only for eligible operation timings with enough
  samples; HTML and Markdown share the metric definitions in `metrics.json`.
  Versioned action scope keeps older reports honest when journeys are strengthened.
  Runtime-only scheduler/control checks identify HA API scope rather than claiming
  desktop screen coverage.
- The homepage is the source for the generated Quality header and footer.
  Both use `theme-init.js` before rendering and `app.js` for the shared theme
  preference, responsive navigation and keyboard behavior. Keep website copy
  neutral or in the maintainer's singular voice.
- `public/assets/screenshots/light/` and `dark/` contain matching captures made
  from the same deterministic English demo data.

## Updating screenshots

1. From `frontend/demo/`, optionally run `npm.cmd run capture` to review the
   dark collection without changing public assets.
2. Run `npm.cmd run capture:publish`. It regenerates both themes and copies the
   selected matching pairs into these website asset directories automatically.
3. Review `frontend/demo/captures/index.html` and
   `frontend/demo/captures-light/index.html`.
4. Preview both website themes locally and verify the desktop and mobile layouts.

The public website must never depend on or publish `frontend/demo/`. The demo
remains a local development tool and is ignored by Git.

## Local preview

Serve `website/public/` with any static HTTP server. Opening `index.html`
directly also works, although a server gives behavior closer to GitHub Pages.

After generating Quality, browser regression checks cover cross-page theme
persistence, system preference, blocked storage, multiple tabs, keyboard navigation
and responsive layouts:

```powershell
python scripts/quality/site.py --output website/public/quality --empty
node --test tests/website/theme.test.mjs
```

These checks use the pinned frontend Playwright dependency and Chromium. They
start and stop their own local server and browser; no HA instance is needed.
Before the first run, install dependencies with `npm ci` and the browser with
`npx playwright install chromium`, both from `frontend/`.

## Deployment

The workflow at `.github/workflows/pages.yml` publishes only `website/public`
after a website change reaches `main`, and can also be started manually.

Before its first run, open the repository's **Settings > Pages** page and set
**Source** to **GitHub Actions**. This one-time repository setting is required
by GitHub before `actions/configure-pages` can prepare the deployment. Later
website changes deploy automatically through the same workflow.
