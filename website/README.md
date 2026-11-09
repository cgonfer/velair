# Velair website

This directory contains the static public website deployed through GitHub
Pages. It is intentionally independent from the Home Assistant frontend and
from development-only screenshot fixtures.

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
  in real Home Assistant with the same fictional English household and virtual
  devices. `capture-manifest.json` records their source bundle, pinned environment
  and image hashes. No private installation data is used.

## Updating screenshots

Website and documentation captures share the
[public screenshot workflow](../scripts/screenshots/README.md). The website
collection is the default; `--collection documentation` regenerates the gallery's
66 dark-theme desktop/tablet/mobile images separately, preserving these 22
website assets.

Install the normal `frontend/` dependencies and start Docker. Build the intended
Velair bundle before capturing; for release screenshots use `npm.cmd run build:release`
from `frontend/`. From the repository root, generate candidates into an empty,
task-specific temporary directory:

```powershell
python scripts/screenshots/generate.py --output "$env:TEMP\velair-website-candidates"
```

The generator reuses the disposable HA and pinned Linux browser infrastructure.
It configures a household through real HA/Velair APIs, then captures exactly the
eleven images referenced by `public/index.html`, in both themes. It does not
intercept browser API responses, change the production integration, or update
quality-test references.

The capture tour shows the desktop Overview timeline and room Comfort readings,
full phone Overview context, varied schedule blocks, Modes and external
publication. Native crops focus the schedule on its timeline and block editor,
Room Assist on its runtime graph, preconditioning on learning and prediction,
and Planned Return on occupancy and preparation status rather than setup forms.
The homepage pairs the Overview with a compact, static phone preview,
gives schedules and Modes the most space, then groups adaptive features, reusable
resources and advanced connections. Screenshot links open a theme-matched native
dialog for detail, with keyboard dismissal and focus restoration; without JavaScript
they open the image directly. The page has no nested phone scrolling.
Dedicated scenes show Room groups, the Climate preset library,
Supply control's live overview and Planned Return; each image illustrates the
feature described beside it rather than adding another generic panel view.

The household includes heating, cooling and ranges, Comfort readings, a room
group, shared supply, distinct Profile icons, presets, a Boost, a readable pause,
active Room Assist, preconditioning learning and a planned arrival. Historical
learning samples are intentionally synthetic and imported
through the portable-data API. The external-publication scene uses the real
Velair adapter with a test-only controller service; it is not proof of physical
RF or equipment delivery. Runtime decisions and publication status come from
the installed backend. Browser and HA clocks stay aligned.

Review the generated `index.html` gallery and all twenty-two images. Install that
exact reviewed set without rerunning Docker:

```powershell
python scripts/screenshots/generate.py --output "$env:TEMP\velair-website-candidates" --install-candidates
```

Installation validates the complete pairs, hashes, language and current bundle.
The optional `--update-website` flag combines generation and local replacement
when a separate candidate review is not needed. Neither command deploys or publishes.
Preview both website themes and responsive layouts before committing. Remove
the task's candidate directory afterward; the generator stops its owned HA and
browser containers, retaining recovery handles only if teardown cannot finish.

The standalone frontend demo is retired; both public collections use the shared
real-HA generator.

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
