# Data sources and terms

The MIT licence in `LICENSE` covers the code, the game content and the
documentation. **It does not cover the statistics.** The files in this
directory, and the JSON derived from them in `config/`, are third-party data
redistributed here for reproducibility. Copyright in them belongs to the
agencies that published them, and each agency sets its own terms.

Nothing here is an official publication of any of these institutions, none of
them has reviewed or endorsed this project, and the derived series in `config/`
have been cleaned, chained and reshaped by the builders in `scripts/` — so any
error in them is this repository's, not the source's.

## Sources

| Source | Used for | In repo |
|---|---|---|
| **Office of the National Economic and Social Development Council (NESDC)**, Thailand — quarterly national accounts, 1993Q1–2026Q2 | The entire real block: GDP and its expenditure components, deflators, investment, the capital stock | `data/nesdc-Q2-2026/`, `config/nesdc_quarterly.json` |
| **Trade Policy and Strategy Office (TPSO)**, Ministry of Commerce, Thailand — consumer price index, 189 categories, 487 months 1986–2026 | Headline and core inflation, the energy pass-through | `data/CPI-G_Report.xlsx`, `config/cpi.json` |
| **Bank of Thailand (BOT)** — MPC decisions and policy rate history, 190 meetings 2000–2026 | The monetary block and the real rate | `data/table-mpc-2026-3.xlsx`, `config/policy_rate.json` |
| **Bank for International Settlements (BIS)** — credit to the non-financial sector, 1991Q4–2025Q4 | Household debt and private credit | `config/financial.json` |
| **International Monetary Fund (IMF)** — World Economic Outlook, 40 series, 1980–2031 | Fiscal and debt series, PPP, population, and the 2030 scoring baseline of USD 9,092 | `data/dataset_*_IMF.RES_WEO_*.csv`, `config/imf_weo_thailand.json` |
| **Federal Reserve Bank of Dallas** — index of global real economic activity | The export block's demand driver, alongside US real imports | `config/world_demand.json` |
| **Stock Exchange of Thailand (SET)** — index history | The SET level the game starts from and tracks | `config/set_history.json` |
| **Election Commission of Thailand (ECT)** — February 2026 general election result | The 500-seat House, party vote shares, and the 2030 seat projection's calibration | `config/parties.json` |

## What the terms require

The obligations are broadly the same across all eight and none of them is
onerous, but they are obligations rather than courtesies:

- **Cite the agency as the source** wherever its statistics are reproduced. That
  is what this file is for; keep it with the data if you fork the repository.
- **Do not imply endorsement or affiliation.** None of these institutions is
  connected to this project. The counterfactual scenarios the game generates are
  emphatically not theirs.
- **No warranty passes through.** The agencies disclaim accuracy, completeness
  and fitness for purpose, and so does this repository — see the MIT text.
- **Commercial reuse is where the terms actually diverge.** The BIS, for
  instance, permits redistribution but not in a way that results in additional
  charges to users of a commercial product. If you intend to sell something
  built on this, read each source's terms rather than relying on this summary.

Primary terms, which supersede anything written here:

- BIS — <https://www.bis.org/terms_statistics.htm>
- IMF — <https://www.imf.org/en/about/copyright-and-terms>
- BOT — <https://www.bot.or.th>
- NESDC — <https://www.nesdc.go.th>
- TPSO — <https://www.tpso.go.th>
- Dallas Fed — <https://www.dallasfed.org>
- SET — <https://www.set.or.th>
- ECT — <https://www.ect.go.th>

## Not in this repository

The 2023 Bhumjaithai campaign song, which the build inlines as the soundtrack if
you place an mp3 at `ui/assets/anthem.mp3`. It is a third-party recording and is
excluded by `.gitignore`; the build detects its absence and omits the music
player. Everything else works identically without it.
