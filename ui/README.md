# UI

Single self-contained HTML file. Open `thailand-2030.html` in any browser — no server, no build step, no network.

## Rebuilding

`./build.sh` from the repository root. It runs four steps:

```
python3 scripts/build_ui_data.py                     # inline configs -> engine/src/gen/data.ts
npx --prefix engine esbuild engine/src/browser.ts --bundle \
  --format=iife --global-name=ENGINE --outfile=ui/engine.js
npx --prefix engine esbuild ui/src/main.js --bundle \
  --format=iife --outfile=ui/app.js
python3 scripts/bundle_ui.py                         # -> ui/thailand-2030.html
```

`engine.js`, `app.js` and `thailand-2030.html` are generated; edit `ui/src/`, `index.html` and `style.css`.

`engine/src/browser.ts` is the only browser-specific file in the engine. It swaps the Node config loaders for the generated inline data. The headless `Game` (`engine/src/game.ts`) extends the same class, so **one engine, two hosts**: a rule change in `engine.ts` shows up in both `npx tsx src/playthrough.ts` and the UI.

## The client, `ui/src/`

| Module | What it draws |
|---|---|
| `main.js` | Entry point: the End Turn button, the prologue, and the test hooks (`window.__g`, `window.__render`) |
| `core.js` | The live game `g`, DOM helpers, sparklines, meters, tiles, toasts, year-on-year growth |
| `prologue.js` | The coalition choice |
| `dashboard.js` | `render()`: the top tiles, ratings, alignment, demography; calls every panel below |
| `parliament.js` | The 500-seat hemicycle and whip |
| `map.js` | The province map (also drawn on the end screen, with the flag overlay) |
| `news.js` | News events and their options |
| `deck.js` | The policy cards, grouped by ministry |
| `constitution.js` | The constitution panel and its final summary |
| `war.js` | The Cambodian war: campaign map, strategy, fronts, new provinces |
| `endscreen.js` | The end-of-term assessment, election, ideology and achievements |
| `music.js` | The campaign song and the ending themes |

`g` is a live binding exported from `core.js` and replaced only through `setGame()`. The modules import one another freely. The cycles are safe because at import time the modules only define functions and constants. Only `music.js` and `main.js` do work when they load.
