# Engine

Semi-structural macro engine for Thailand 2030. Pure, deterministic, headless.

```
npx tsx src/backtest.ts    # conditional backtest, 129 quarters
npx tsx src/calibrate.ts   # bounded Nelder-Mead fit of unidentified parameters
npx tsc --noEmit -p .      # typecheck (strict)
```

`step()` in `src/engine.ts` is the whole model: `(state, prev, lag4, exog, policy, params) -> state`.
No I/O, no randomness, no mutation. Identical inputs give identical output.

**Before changing parameters, read `../BACKTEST.md`.** Several coefficients are pinned
at economic sign bounds rather than estimated, because the data cannot identify them
(`../MODEL.md` §1). `PROVENANCE` in `src/params.ts` records which is which.
