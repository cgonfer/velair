# Public screenshot workflow

One generator captures the website and documentation in real, disposable Home
Assistant, using the pinned Docker browser and the current Velair bundle.
Configuration goes through Home Assistant and Velair APIs; the installed backend
computes the displayed status. Browser responses and clocks are not replaced.

## Collections

| Collection | Required assets | Local destination |
| --- | --- | --- |
| `website` (default) | Eleven scenes in light and dark, 22 PNGs | `website/public/assets/screenshots/` |
| `documentation` | Twenty-two scenes at desktop, tablet and mobile widths, 66 dark-theme PNGs | `screenshots/` |

The homepage and [documentation gallery](../../docs/project/screenshots.md) are
the image contracts. The generator rejects missing or unused plan entries.
Each collection has its own reviewed candidates and provenance manifest.
Installing documentation never replaces website images, and vice versa.

## Tooling boundaries

```text
scripts/screenshots/
  browser/                     Capture drivers and native framing
  fixtures/ha_components/      Capture-specific virtual HA devices
  generate.py                  Shared generator and candidate installer
  scenario.py                  Common fictional household
  documentation_scenario.py    Documentation-only runtime conditions
  capture-plan.json            Website scenes
  documentation-plan.json      Documentation scenes
tests/screenshots/             Python and browser capture regressions
tests/website/                 Website theme and navigation tests
```

No capture driver or fixture is part of `frontend/src/` or the integration's
release package. The browser drivers reuse `frontend/e2e/` helpers and resolve
the pinned Playwright package from `frontend/package.json`; install dependencies
only in `frontend/`. The common disposable HA harness stays in `scripts/quality/`.
Final PNGs and provenance manifests stay in their existing public destinations.

## Generate and review

Start Docker and install the normal frontend dependencies. Build the intended
manifest-version bundle before capturing; from the repository root:

```powershell
npm.cmd --prefix frontend run build:release
```

Choose an empty, task-specific temporary output directory. Generate the website
pair collection with the default command or explicit `--collection website`:

```powershell
python scripts/screenshots/generate.py --output "$env:TEMP\velair-website-candidates"
```

Generate the documentation collection separately:

```powershell
python scripts/screenshots/generate.py --collection documentation --output "$env:TEMP\velair-documentation-candidates"
```

Open the generated `index.html` and inspect every image. Check the intended
runtime state, readable content, complete focused crops, responsive layout and
English labels. Website candidates include both themes; documentation keeps the
gallery's existing dark-theme presentation and all three viewport sizes.

The household is fictional and its devices are virtual. Historical learning
observations are synthetic and imported through the portable-data API. The
documentation's unavailable-climate and external-publication scenes exercise
normal backend behavior through fixture entities and a test-only controller
transport. Controller acceptance is not evidence of physical equipment or RF
delivery. No private Home Assistant installation is used.

## Install the reviewed collection

Install the exact reviewed candidates without rerunning the environment:

```powershell
python scripts/screenshots/generate.py --output "$env:TEMP\velair-website-candidates" --install-candidates
python scripts/screenshots/generate.py --collection documentation --output "$env:TEMP\velair-documentation-candidates" --install-candidates
```

Installation validates the collection, current bundle/version, language, exact
file set, image hashes and actual PNG dimensions before replacing any assets.
It preserves unrelated images. Manifests record the pinned environment, source
bundle, viewport sizes and fictional-data provenance.

`--update-assets` combines generation and local installation when separate
candidate review is not needed. The older `--update-website` flag remains a
website-only alias. Neither operation commits, deploys or publishes anything.

Remove the task's candidate directory after review and installation. The
generator stops its owned HA/browser containers and removes authentication and
configuration, retaining recovery handles only if teardown cannot finish.

## Capture scope and checks

Both collections share `scenario.py` and the real-HA lifecycle. Documentation
adds a native panel dashboard, a cooling room with sensor and window entities,
guided psychrometric Comfort with CO₂ and derived metrics, Holding state and
ordered publication/error phases through `documentation_scenario.py`. Room groups,
Climate presets and live Supply control use the same real household; Planned
Return runs last so its Away/arrival episode cannot alter earlier captures.
Its collection plan preserves the gallery's
existing image paths. Website composition uses focused native rectangles and a
compact mobile preview; full images can be opened from the homepage.

The standalone frontend demo is retired. These collections do not depend on a
simulated HA shell or separately maintained frontend fixtures. Quality-test
reference screenshots remain a separate contract and are not replaced.

From the repository root, run the focused workflow checks:

```powershell
python -m unittest discover -s tests/screenshots -t .
node --test tests/screenshots/*.test.mjs
```

Also run the applicable repository checks and visually review new candidates.
The native scroll and preset-layout regressions use the local Playwright
Chromium installation. The preset check renders the current integration bundle,
so build it first. CI runs these browser regressions after the frontend build;
website theme and navigation checks run separately.
The website's responsive/theme/viewer checks are documented in
[`website/README.md`](../../website/README.md).
