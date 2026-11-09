# Quality checks and release evidence

Velair combines fast unit tests with selected browser journeys in a disposable
Home Assistant instance. The browser and load harness uses synthetic entities;
it never needs access to a household installation.

## Current rollout

New PR checks start in **observation**. Their reports can show failures even when
the observation gate is green. Read the reported execution outcome separately
from the workflow conclusion. Existing unit, build, HACS and Hassfest checks
remain in force. Release publication requires successful package and committed
integration journeys from the beginning.

Performance measurements are informational. Visual captures are labelled
`capture-unreviewed` until approved reference images exist. A captured image is
not a passed visual comparison. Missing reports and incomplete load are never
converted into passed test results.

CI selects browser/load and website checks from the changed files. If the base
commit is unavailable, for example after amending and force-pushing a commit,
or Git cannot compare the revisions, CI requests all runtime and website checks
and explains the fallback in the Actions summary. Unknown history never justifies
omitting checks.

Reviewed Linux references are included. The `visual.mode` policy now defaults to
`compare`, independently of the PR blocking rollout, which remains `observe`.
Local, PR, release and scheduled runs use that policy unless an explicit
capture/compare/off override is selected. Calibration always compares. Approved
reference images do not establish that calibration or a long workload has passed.

## Run the same checks locally

Requirements: Docker with Linux containers, Python 3.13, Node 24 and the frontend
dependencies. Docker must be running and accessible to the current user.

```powershell
cd frontend
npm.cmd ci
npm.cmd run build
cd ..
$qualityOutput = Join-Path ([System.IO.Path]::GetTempPath()) ("velair-quality-" + [guid]::NewGuid())
python scripts/quality/run.py --component custom_components/velair --output $qualityOutput --suite smoke
```

The runner installs the specified integration into a fresh HA configuration,
creates a temporary user through onboarding, adds Velair through its config flow,
and prepares profiles and schedules through the existing WebSocket API. It then
runs browser journeys and load measurement, collects a bounded report and stops
the container in a `finally` block. Inspect the exit code before opening the report.

HA configuration and browser authentication are separate from public output.
Delete the task output after inspection. If the process is forcibly interrupted,
use `python scripts/quality/ha.py stop --state-file <private-state-file>` for that
invocation; the command verifies its ownership marker before removing resources.
Never remove unrelated containers or configurations as part of cleanup.

The runner starts the pinned Playwright Linux/amd64 image from `environment.json`
as a temporary browser server, both locally and in GitHub. Chromium, operating
system libraries and fonts therefore come from the same immutable image. The
Node/Python test driver stays on the host, preserving real HA restart checks.
The server is bound to a random loopback-only port, has no host mounts or Docker
socket, and is removed after execution. Playwright exposes only host loopback
connections so the remote browser can reach its disposable HA instance. Docker
downloads the fixed image and the exact matching Playwright package when needed.
The setup and load runners use this same connection; neither silently launches
a native browser during a normal quality run.

Performance still depends on the host hardware and workload. Linux-rendered local
screenshots can be compared, but local timing/resource measurements are not
interchangeable with GitHub measurements. Host and renderer identities remain in
the measurement fingerprint.

## Scenarios and measurements

The small installation contains heating, cooling and range climates, associated
sensors, five lights, five switches and three covers. The large installation
contains thirty climates and ten entities in each unrelated device category.
Both contain deterministic schedules and two profiles.

The workload covers idle, unrelated household activity, combined climate activity
and UI actions under load. Extended runs add bursts, recovery and a thirty-minute
soak. The generator records requested/completed actions and observed state changes.
An unsuccessful action or insufficient observed changes invalidates its scenario.
Workload rates describe test inputs, not a supported maximum installation size.

The short suite includes these core control and editing journeys:

- One real HA timer transition shared by heating, cooling and range climates,
  followed by a scheduled off transition. The case checks live targets and
  successful-delivery events; it does not invoke the scheduler timer directly.
- Manual control retains its target after an automatic intention changes.
  Resuming Automatic respects an independent named pause; ending only that pause
  applies the current schedule.
- A stale revision save is rejected without losing its draft or partially
  changing stored schedules, followed by deliberate recovery and a valid save.
- Schedule controls use ordinary pointer/touch actions, including scrolling to
  Save and returning to the editor after closing help. Range edits preserve both
  bounds and an untouched block.
- A profile contains a real zone schedule, reaches the climate when activated,
  keeps its content and selection after reload, and returns to the base target.
- Combined/sustained activity holds an unsaved draft until an actual climate
  update reaches the editor, then verifies that draft and stored data survived.
  This deliberate hold is outside the measured edit/save latency.

Timer, manual-ownership and revision-conflict cases run once on desktop because
their contracts do not depend on viewport size. Schedule interaction and profile
journeys run on desktop, mobile and tablet. Tests restore the public configuration
they modify and operate only on the disposable fixtures.

Reports add `actionEvidenceVersion: 2` for these stronger checks. Version-1
reports keep their earlier scope: saving one temperature, creating/selecting a
profile and editing during activity are not retrospectively treated as evidence
of the new assertions. Current browser cases use distinct variants; the activity
case also requires an observed draft-preservation marker. Aggregated installation
paths retain their own action-evidence version, and differing scopes are not
pooled as repeated measurements.

Functional browser checks report outcomes and case coverage, not performance
distributions. Their full test durations remain in Playwright diagnostics and
are excluded from quality statistics and baseline comparisons, including older
reports that recorded them.

The shared metric definitions in `scripts/quality/metrics.json` determine how
HTML, Markdown and load diagnostics interpret each measurement:

| Measurement | Reported meaning |
| --- | --- |
| Navigation, edit/save and device service timings | One reading is an observed value; repeated operations show count, median and observed range. p95 appears only with at least 100 operation samples. |
| Page heap, whole-HA CPU/memory and event-loop delay | Sampled resource/responsiveness readings, with median and observed range; no operation percentiles. |
| Browser main-thread task time | Time spent on tasks between approximately one-second polls; not click latency or a CPU percentage. |
| Component updates, requests, long-task count/duration | Direct totals per execution; repeated runs retain separate totals, without median or p95. |
| Heap after activity and recovery | Separate point readings in MiB; no percentiles or automatic memory-leak claim. |

Unavailable statistics are not rendered as permanent empty columns. Missing
expected measurements remain explicit; statistics from failed scenarios are
excluded. Empty timing arrays for scenarios without UI interactions are not
missing user-operation tests. Unknown historical metrics remain in raw JSON,
without inferred meaning or baseline comparisons. Comparisons use supported
timing/resource measurements only; counters and snapshots are not compared as
distributions. Metric-definition changes invalidate the measurement fingerprint.

Browser update and long-task totals cover warm-up and activity. Request totals
also include recovery, but exclude the test harness's separate API connection. These totals do not
represent measurement-window rates. Container CPU and memory describe all of
HA. They do not independently attribute cost to Velair. Browser measurements and
targeted diagnostics help investigate differences; profiling and DEBUG timing are
separate diagnostic tools because they can affect measured cost.

The environment fingerprint includes HA image, Playwright version, OS/runner,
fixture size, scenario definitions and measurement settings. Changes invalidate
cross-environment comparisons. Backend time remains real; changing the browser's
clock does not change scheduler time.

## Comparisons and extended execution

```powershell
python scripts/quality/run.py --component custom_components/velair --output $qualityOutput --suite extended --size large
python scripts/quality/run.py --component custom_components/velair --baseline-component <baseline-integration-directory> --output $qualityOutput --suite smoke
```

Paired execution runs both integrations three times, alternating their order, with
the same current harness and a fresh HA instance for every execution. Use separate
output directories for separate invocations. CI also provides manual baseline/ref
selection; no comparison is claimed if an earlier release cannot run the scenario.

PR checks target ten to fifteen additional minutes. Extensive comparisons and
soak runs belong in manual, nightly or release checks. Before installing dependencies
or starting HA, scheduled runs check whether the relevant source and environment
already have a completed successful measurement. Documentation prose and regenerated
bundle timestamps do not invalidate that measurement. Product source, dependencies,
fixtures, visual references and measurement tooling do; runner and runtime versions
are also part of the identity. Documentation availability changes still count because
that mapping is compiled into the frontend.

The extended job allows up to 150 minutes when it also performs six sequential
paired smoke executions after the full workload. This is an orchestration budget;
individual test limits, retries and workload durations are unchanged.

A weekly compatibility run resolves the latest stable HA image digest without
pulling the full image first. It measures the candidate only when that code/image/
environment combination still needs validation. Its evidence remains separate from
the fixed measurement environment. Changing the fixed version requires a reviewed
source change and fresh visual/calibration evidence.

Actions always explains whether it ran or omitted the measurement. A small
90-day receipt identifies real measurements; a green omitted run never becomes
measurement evidence or a comparison baseline. Failed, cancelled or incomplete
matching attempts are retried on the next schedule. Missing, expired, malformed or
unavailable history causes a new measurement rather than an assumed pass.
Manually dispatched runs always execute, even when matching evidence exists.

## Visual references and calibration

For the first GitHub activation, push the reviewed changes and inspect the PR's
Actions results. The trusted PR-comment publisher and the manual/scheduled
extended workflow must first exist on the repository's default branch. Therefore
their initial activation requires integration into `main`; creating a tag is not
required. Keep observation mode during that integration. Afterward, run the
calibration batch and the full extended workload separately, review their actual
results, and only then decide whether to enable the required quality gate.

Browser journeys use normal pointer interactions, mobile/tablet/desktop sizes and
selected light/dark screenshots. Do not force clicks to make an obscured control
pass. Only known volatile text can be masked; controls must remain visible.

The selected visual case uses a versioned **rendering-only fixture**: the real HA
shell and installed Velair components render a fixed Monday, six daily blocks,
heating/cooling/range values and next events. Only that page's selected WebSocket
messages receive these inputs. Its browser clock is fixed; Home Assistant's clock
and scheduler are never patched. This makes layout comparisons independent of
wall-clock dates and earlier functional cases. Authentication and HA shell traffic
still reach real HA. Functional, restart, editing and performance journeys do not
install this fixture and continue exercising actual backend responses and timers.
No controls or timestamps are hidden in the selected screenshots. Visual evidence
validates rendering, and is not additional proof of automatic schedule execution.
The fixture, browser image, screenshot options and reviewed PNGs are included in
the evidence identity. Snapshot names identify Linux even with a Windows driver.

Capture and review references in the same pinned Linux environment as CI. Commit
reviewed references with the change; never update them automatically during CI.
Use `--visual compare` to fail on absent or changed references. `--visual capture`
collects evidence without asserting a comparison. Raw authenticated traces are
not public evidence because they can contain credentials; this harness keeps
browser tracing disabled.

For deliberate local candidate creation, use a new output directory:

```powershell
python scripts/quality/visual.py --component custom_components/velair --output <new-absolute-task-directory>
```

This starts owned HA and the same pinned Linux renderer, records 18 images under
`candidates/`, and compares two fresh browser runs against those temporary images
to check repeatability. These comparisons are diagnostics against **unapproved
candidates**. The manifest stays `pending`, `localOnly` and `calibrationExcluded`;
no quality/calibration report is produced and live references are not changed.
The helper refuses recording in GitHub Actions and removes its owned containers
and private authentication afterward. Review all images before deliberately
copying approved PNGs into `frontend/e2e/visual.spec.mjs-snapshots/`. Ordinary CI
comparison refuses absent references rather than creating them implicitly.

The calibration suite exercises deliberate overlay, overflow, persistence,
duplicate-request and delay faults. Verify the detector rejects each fault. After
reviewed Linux references have been committed, select **Extended quality → Run
workflow → suite: calibration** in Actions. This deliberately runs ten consecutive
fresh small-profile HA instances on one runner with visual comparison enabled.
It bypasses scheduled reuse and stops on the first failure, missing comparison or
changed environment/component; it never retries a failed batch into green.
Calibration does not satisfy the nightly long-workload requirement.

The same batch can be executed locally in the matching environment:

```powershell
python scripts/quality/calibrate.py --component custom_components/velair --output $qualityOutput
```

Each repetition retains its own report. The batch summary records eligibility for
independent review; it does not approve references or enable required checks.
Previously collected runs can also be assessed together:

```powershell
python scripts/quality/report.py --inputs <run-directories> --output $qualityOutput --calibration
```

The calibration report records eligibility for independent review. It does not
change branch rules automatically. After review, switch the rollout policy and
require the `Quality gate` check in repository branch settings. Performance
thresholds remain informational until a separately reviewed calibration establishes
their variability and intended limits. Do not suppress flaky tests with retries.

## Evidence in PRs, releases and the website

Each PR has one updated quality comment tied to its head commit and workflow
attempt. A trusted publisher validates workflow provenance and ignores stale
executions. It never executes code from a downloaded report. Detailed short-lived
artifacts are linked from the Actions run; reports remain explicit about omitted
or failed scenarios.

The comment starts with a short action summary, visual-review state and one run
link. Failed, partially checked or missing expected conditions remain visible;
healthy descriptions and variant/screen tables live in one disclosure. Editing a
Monday temperature does not claim coverage of the entire schedule editor. The
restart action runs on desktop only. Failed cases can identify a catalogue-approved
stage without publishing exception or authentication data. Complete descriptions,
coverage, conditions and measurements remain available when expanded. The comment
persists when artifacts expire. A successful observation gate cannot hide a failed
action or reported execution.

`scripts/quality/actions.json` is the trusted source for action IDs, precise scope,
variants, planned screen sizes and stage names. Browser declarations carry stable
action/variant annotations; approved `test.step` IDs identify a failed stage when
available. Keep historical scope stable: use a new action ID, or an explicitly
versioned variant and description, when a journey gains stronger assertions.
`actions.py` interprets one execution for both the website and the PR publisher.
The publisher invokes that checked-out script with bounded JSON input; downloaded
reports supply results, never executable code or public descriptions. Version-1
reports support optional action metadata; exact known historical titles still map
conservatively, while unknown results remain unclassified in technical details.
Repeated executions retain consistent identities, and missing or failed repeats
cannot become a fully checked action.

Release execution preserves the committed integration for HACS-path testing,
builds and packages once, and tests the extracted component ZIP separately.
The Lovelace ZIP must contain the same JavaScript and source map as the tested
component. Publication checks asset SHA-256 values, uploads into a draft, verifies
the uploaded assets and only then publishes. A different asset cannot replace an
already published file on a rerun.

Each release retains `quality-report.json` and `quality-report.md` as assets.
The static Quality page is regenerated from those public assets, with stable and
beta versions separated. Versions without reports show that absence; no historical
test results are inferred. A failed Pages refresh can be retried independently.

Release pages start with a compact overview and closed action rows containing
names and results. A first failure or partial case is visible without expansion;
opening an action reveals its scope, variants and screens. An action-results ring
and operation timing bars are visible on arrival; diagnostic graphs remain behind
a disclosure. These charts time
switching Overview/Schedules and editing
and confirming one saved temperature during household activity. Both require
valid activity counters and actual navigation/save evidence. Background device
activity is a condition, not a user action; visual capture remains separate from
approved comparison. Resource charts, service-response distributions and raw
tables are available in keyboard-accessible disclosures. Release-package and
HACS-installation executions stay separate. Charts give units and sample counts;
p95 is available only for eligible operation timings with 100 samples. JavaScript page memory is distinct from
whole-HA CPU/memory. Paired comparisons require recorded comparable measurements;
no time-series curve is inferred without timestamps. Charts work without JavaScript
and share the website theme and navigation. Raw JSON and Markdown remain available
from releases. No additional commit or nightly history is stored for the website.
The top action count requires each action to pass in every recorded execution;
it does not count the package and HACS copies as different product actions.
Additional installation-path details are collapsed by default, but their summaries
expose failed executions or checks needing attention. Conditions, visual-review
detail and evidence limits are expandable; critical states are never hidden by
those controls. Disclosures remain accessible with the keyboard.

No report establishes compatibility with every physical climate device, theme,
companion app or hardware platform. The recorded scenarios and limitations define
the evidence available for each version.
