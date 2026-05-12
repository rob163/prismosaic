# Prismosaic

Prismosaic is a browser-only mosaic generator for turning personal photos into
color-shifted still images and short looping videos.

The demo is intentionally self-contained:

- No backend.
- No image upload to a server.
- No build step required.
- Works on GitHub Pages.

All image processing happens locally in the user's browser with Canvas.

## Run Locally

From this directory:

```bash
python3 -m http.server 8080
```

Then open:

```text
http://localhost:8080
```

From the parent repository:

```bash
.venv/bin/python -m http.server 8080
```

Then open:

```text
http://localhost:8080/prismosaic/
```

Use only one of those URL patterns. If the server is started from inside
`prismosaic/`, open `/`. If the server is started from the parent repository,
open `/prismosaic/`.

## Publish on GitHub Pages

Prismosaic is ready to publish as a standalone repository.

1. Create a new public GitHub repository.
2. Copy the contents of this `prismosaic/` directory into the repository root.
3. Push to the `main` branch.
4. In the repository settings, open **Pages**.
5. Set **Build and deployment** to **GitHub Actions**.
6. The included workflow at `.github/workflows/pages.yml` will publish the site.

The live demo URL will be:

```text
https://<username>.github.io/<repo-name>/
```

This directory also includes `.nojekyll` so GitHub Pages serves the static files
directly without running Jekyll.

## Features

- Upload one to three images.
- Normalize images of different dimensions into a selected social output ratio.
- Generate a color-deflected tile mosaic.
- Preview a static composition or an animated loop.
- Download a PNG still.
- Download a WebM loop.

## Configuration

Most editable defaults live in:

```text
src/config.js
```

That file defines:

- `OUTPUT_PRESETS` — export canvas sizes.
- `COLOR_PRESETS` — color-deflection palettes.
- `DEFAULT_SETTINGS` — initial UI values.
- `CONTROL_CONFIG` — slider ranges and steps.

The web app does not depend on Python for image processing. Python is only used
as a convenient local static file server during development.

## Output Ratios

- Square: 1080 x 1080
- Portrait: 1080 x 1350
- Story/Reel: 1080 x 1920
- Landscape: 1920 x 1080

## Notes

WebM export uses `MediaRecorder` and `canvas.captureStream()`, so support depends
on the browser. Chromium-based browsers currently provide the most reliable
experience.
