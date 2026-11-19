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
| `main.js` | Entry point: the End Turn button, the in-game Save menu, the title screen, and the test hooks (`window.__g`, `window.__render`) |
| `core.js` | The live game `g`, DOM helpers, sparklines, meters, tiles, toasts, year-on-year growth |
| `home.js` | The title screen: Continue, Play, Load (saved games and endings, and files), Achievements (the record of every finished term), Settings |
| `prologue.js` | The coalition choice |
| `dashboard.js` | `render()`: the top tiles, ratings, alignment, demography; calls every panel below |
| `parliament.js` | The 500-seat hemicycle and whip |
| `map.js` | The province map (also drawn on the end screen, with the flag overlay) |
| `news.js` | News events and their options |
| `deck.js` | The policy cards, grouped by ministry |
| `constitution.js` | The constitution panel and its final summary |
| `war.js` | The Cambodian war: campaign map, strategy, fronts, new provinces |
| `endscreen.js` | The end-of-term assessment, election, ideology and achievements; records the term and keeps the ending |
| `saves.js` | Saved games, saved endings, the achievements record, and exporting and importing them as files |
| `music.js` | The campaign song and the ending themes |

`g` is a live binding exported from `core.js` and replaced only through `setGame()`. The modules import one another freely. The cycles are safe because at import time the modules only define functions and constants. Only `music.js` and `main.js` do work when they load.

## Optional media

Two files are inlined by the build when present and are never committed (see `.gitignore`), because neither is ours to redistribute:

- `ui/assets/anthem.mp3`: the campaign song. Without it the game streams the rights holder's upload.
- `ui/assets/home.webp` (or `home.jpg`): the title-screen photograph. Without it the title screen draws the flag in CSS.

## Saves, endings and the record

A saved game is the list of moves, not a copy of the game: the coalition plus every call the UI made that changes the game (`openTurn`, `endTurn`, `playCard`, `resolveEvent`, `setDraft`, `constitutionAct`, `warOrders`). The engine's one random stream is seeded, so replaying the moves rebuilds the same game. `saves.js` records them by wrapping those methods on the live instance.

- **Autosave.** Every move is saved to the browser, so Continue on the title screen picks up where the player left off.
- **Saves.** The in-game Save menu keeps a save in the browser or exports it as a `.json` file.
- **Endings.** Every finished term is kept, and can be exported. An ending carries its moves, so on the same build it replays to the live end screen. It also carries a frozen copy of the screen: the page, every map view drawn in advance, and each map tooltip written onto its path. Once the game has changed, the frozen copy is what is shown, exactly as the player saw it. The copy kept in the browser is gzipped.
- **The record.** Every achievement any finished term in this browser has earned, with when it was first earned. Opening an exported save or ending adds its record; the record can also be exported on its own.

`build.sh` stamps `ui/engine.js` with a hash of itself (`window.TH2030_BUILD`). Saves and endings record it, and loading one from another build warns that it may replay differently.

Everything kept in the browser is in `localStorage`, which a private window or cleared site data can lose. That is why each kind can be exported to a file and opened again from Load.
