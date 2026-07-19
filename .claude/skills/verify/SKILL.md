---
name: verify
description: Serve and drive PokéPicker in headless Chromium to verify the bracket flow end to end.
---

# Verifying PokéPicker

Static site, no build step. Serve the repo root and drive the real UI.

## Launch

- Serve: `python3 -m http.server 8123` from the repo root.
- Playwright isn't a repo dependency; `npm install playwright` in a scratch
  dir and launch with `executablePath: "/opt/pw-browsers/chromium"`
  (pre-installed — never run `playwright install`).

## Flows worth driving

- Start screen: 9 gen chips; "None" must disable Start; size buttons update
  the summary (bracket of N → N−1 picks).
- Bracket of 8: "Quarterfinals" → champion after 7 picks; stats line reads
  "Decided in 7 picks from a bracket of 8."
- Odd pool (Gen I + Everyone = 151): a full run must end at exactly
  "150 picks from a bracket of 151" — this exercises the bye path hard.
- Undo (button + `Z`), rapid double-click during the 420 ms pick lock
  (must advance exactly one match), restart confirm dialog, 375 px viewport
  (no horizontal overflow).
- Champion screen: podium = runner-up + the previous round's losers.

## Driving picks reliably

A pick locks input for ~420 ms. After clicking `#card-a`, poll until
`#match-label` text changes or `#screen-winner` loses `.hidden`, then click
again. Don't sleep a fixed interval and count clicks — attempts during the
lock are silently ignored.

## Gotchas in the remote (proxied) environment

- The egress proxy resets post-quantum TLS ClientHellos. Chromium therefore
  cannot load the sprite CDN (`net::ERR_CONNECTION_RESET` for
  raw.githubusercontent.com) even though `curl` succeeds. For screenshots
  with artwork, intercept `https://raw.githubusercontent.com/**` via
  `context.route` and fulfill from curl-downloaded files. Don't chase
  browser TLS switches — `--disable-features=...` and the
  PostQuantumKeyAgreementEnabled policy both failed to take here.
- Pass `proxy: { server: process.env.HTTPS_PROXY, bypass: "localhost,127.0.0.1" }`
  to `chromium.launch` so the local server is reached directly.
