# ReelLab

ReelLab is a lightweight **Reel Experiment Engine**: instead of inventing a single score, it turns the inputs you provide into concrete, testable experiments.

## MVP

Flow: **Analyze → Hypothesis → Experiment → Publish → Measure → Learn**

- Static site; no required backend.
- Video metadata is inspected in the browser.
- User videos are not uploaded or stored by ReelLab.
- No Instagram API or OAuth is required for the MVP.
- Reel URLs are validated for shape only; the MVP intentionally does not download Reel media from Instagram.
- No paid AI/API dependency is required.
- User-controlled text is rendered safely with DOM `textContent`.

## What it checks

- Video duration and aspect ratio when a video is supplied.
- Caption length.
- CTA presence.
- Goal-specific next experiment.
- Three hook variants to test.
- Missing/invalid input and common edge cases.

## Privacy and limitations

This MVP does not claim to predict virality or guarantee performance. Recommendations are heuristic and depend on the information supplied by the user. For reliable video analysis, upload the video file; a URL alone is not fetched from Instagram.

## Run locally

Open `index.html` in a modern browser. No build step is required.

## CI/CD

Every push to `main` runs the smoke test and the GitHub Pages deployment workflow. The smoke test validates required files, JavaScript syntax, and core HTML/CSS markers.

## Roadmap

1. More browser-side signal extraction.
2. Experiment history stored locally on-device.
3. Optional integrations only after the core experience is stable.
4. Optional server/API features must remain non-essential to the core MVP.
