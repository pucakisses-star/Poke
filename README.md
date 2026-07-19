# PokéPicker — Find your favorite Pokémon

A zero-dependency static website that helps you discover your favorite Pokémon.
Two Pokémon face off; click the one you like more. Winners advance round after
round — bracket style — until a single champion remains: your favorite.

## Run it

No build step, no server-side code. Either:

- open `index.html` directly in a browser, or
- serve the folder: `python3 -m http.server 8000` and visit
  <http://localhost:8000>, or
- host it on any static host (GitHub Pages works out of the box).

An internet connection is needed at runtime only for the Pokémon artwork,
which loads from the [PokéAPI sprites CDN](https://github.com/PokeAPI/sprites).

## Features

- **All 1025 Pokémon** (Generations I–IX), with names and types baked into
  `data.js` — no API calls for data at runtime.
- **Pick your pool**: filter by generation and choose a bracket size
  (8 / 16 / 32 / 64 / 128 / everyone). Non-power-of-two pools are handled
  with byes.
- **Undo** any pick (button, or `Z` / `Backspace`), keyboard picking with
  `←` / `→`, and a progress bar showing picks remaining.
- **Champion screen** with confetti, the runner-up, and the semifinalists.
- Type-colored cards, official artwork with sprite fallback, responsive
  layout, and `prefers-reduced-motion` support.

## Files

| File | Purpose |
| --- | --- |
| `index.html` | Page structure (start, battle, and champion screens) |
| `styles.css` | All styling |
| `app.js` | Bracket logic, rendering, undo history, confetti |
| `data.js` | Generated roster: `{id, name, types}` for all 1025 species |
| `tools/gen_data.py` | Regenerates `data.js` from PokéAPI |

## Regenerating the roster

When a new generation drops:

```sh
python3 tools/gen_data.py
```

(Requires internet access; the script fetches the species list and the 18
type rosters from PokéAPI, then rewrites `data.js`.)

## Credits

Pokémon names, types, and artwork courtesy of [PokéAPI](https://pokeapi.co).
This is a fan project; Pokémon is © Nintendo / Creatures Inc. / GAME FREAK inc.

## Also in this repo: the Elon Musk Fact Machine

An unrelated second mini-site lives in [`fact-machine/`](fact-machine/): a
random-fact page serving **301 documented, unflattering Elon Musk facts**
(court rulings, regulator findings and attributed investigative reporting),
with interactive canvas background effects — exploding rockets, a combusting
Cybertruck, a plummeting $44B bird, deorbiting satellites and "shatterproof"
glass cracks (click the page background to trigger one; add
`?fx=rocket|truck|bird|sat|crack` to force a specific effect).

Open `fact-machine/index.html` directly, or visit `/fact-machine/` when the
repo is hosted as a static site. Facts live in `fact-machine/facts.js`; all
on-page counts update automatically when facts are added.
