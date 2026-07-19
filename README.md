# 📉 Elon Musk Fact Machine — Critical Edition

A tiny website that serves up a random, unflattering-but-documented Elon Musk fact every time you click (or press <kbd>space</kbd>).

## Features

- **41 documented low points** across categories — Broken Promises, Courts & Regulators, Workplace, Twitter / X, Tesla, SpaceX, Politics, Personal — drawn from court rulings, regulator findings and investigative reporting. Allegations are attributed to their sources and denials are noted; everything is accurate as reported through early 2026.
- **No repeats** until you've seen every fact (shuffle-bag randomizer)
- **Copy button** to grab the current fact, plus <kbd>space</kbd> / <kbd>N</kbd> keyboard shortcuts
- Animated twinkling starfield with the occasional shooting star (disabled automatically for users who prefer reduced motion)
- Single self-contained `index.html` — no build step, no dependencies, no network requests

## Run it

Open `index.html` in any browser. That's it.

Or serve it locally:

```bash
python3 -m http.server 8000
# then visit http://localhost:8000
```

## Deploy

Works out of the box on GitHub Pages: **Settings → Pages → Deploy from a branch**, pick this branch and `/ (root)`.

---

*An unofficial project. Not affiliated with Elon Musk, Tesla, SpaceX or X Corp. (Obviously.)*
