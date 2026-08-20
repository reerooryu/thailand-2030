# UI

Single self-contained HTML file. Open `thailand-2030.html` in any browser — no server, no build step, no network.

## Rebuilding

```
python3 scripts/build_ui_data.py                     # inline configs -> engine/src/gen/data.ts
cd engine && npx esbuild src/browser.ts --bundle \
  --format=iife --global-name=ENGINE --minify --outfile=../ui/engine.js
cd .. && python3 scripts/bundle_ui.py                # -> ui/thailand-2030.html
```

`engine/src/browser.ts` is the only browser-specific file: it swaps the four
Node config loaders for the generated inline data and re-exports the same game
class the headless harnesses use. **One engine, two hosts** — a rule change in
`engine.ts` shows up in both `npx tsx src/playthrough.ts` and the UI.

Source files (`index.html`, `style.css`, `app.js`) are kept unbundled for editing.
