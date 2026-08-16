# Velair website

This directory contains the static public website deployed through GitHub
Pages. It is intentionally independent from the Home Assistant frontend and
from the ignored local Screenshot Lab.

## Structure

- `public/` is the complete deployable Pages artifact.
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

## Deployment

The workflow at `.github/workflows/pages.yml` publishes only `website/public`
after a website change reaches `main`, and can also be started manually.

Before its first run, open the repository's **Settings > Pages** page and set
**Source** to **GitHub Actions**. This one-time repository setting is required
by GitHub before `actions/configure-pages` can prepare the deployment. Later
website changes deploy automatically through the same workflow.
