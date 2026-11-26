# Stack It

The U.S. national debt, live from the Treasury, as a stack of $100 bills you climb by scrolling.

Plain HTML, CSS and ES modules. No build step; deploys as-is to GitHub Pages.

## Run locally

ES modules need a server (opening `index.html` from disk won't load them):

```
npm run serve        # no-cache dev server; open http://localhost:8765
```

## Test

```
npm test             # node --test: scale math, API parsing, fallback, formatting
```

## Refresh the fallback data

```
npm run snapshot     # fetches all endpoints, rewrites data/snapshot.json only if every request succeeds
npm run countries    # IMF World Economic Outlook figures -> data/countries.json
```

The IMF API sends no CORS header, so browsers can't call it; country figures are saved by
script and labeled with their date on the page. Everything else is fetched live.

## Layout

| File | Role |
| --- | --- |
| `js/scale.js` | All the math: dollars ↔ meters, landmarks, detail levels, scroll ↔ altitude. No DOM. |
| `js/api.js` | Four endpoints with 5 s timeouts; each failure falls back to the snapshot on its own. No DOM. |
| `js/format.js` | `Intl` money, height, date and percent formatting. |
| `js/climb.js` | Scroll → altitude. Draws the stack, ground and flag; other modules subscribe to each frame. |
| `js/sky.js` | Sky color by altitude. |
| `js/art.js` | Engraving-style SVG drawings: landmarks, clouds, skyline, the intro bill. |
| `js/scenery.js` | Parallax clouds, skyline, stars, and Earth shrinking below you. |
| `js/landmarks.js` | Landmark drawings, height markers and the expandable fact cards. |
| `js/breakdown.js` | Hover/tap the stack: public vs. intragovernmental split. |
| `js/controls.js` | Explore dock: time travel (1790 to today) and per-person mode ($100 or $1 bills). |
| `js/ticker.js` | Estimated live total and "since you arrived", with falling bills. |
| `js/nav.js` | Section rail; keys 1–7 for the climb, 8/9/0 for the sections after it. |
| `js/guess.js` | Guess-the-height opener; your guess becomes a marker on the climb. |
| `js/elevator.js` | "Take the elevator": a guided ride that stops at each landmark. |
| `js/timelapse.js` | Play 1790 → today: the stack regrows while the camera rides its top. |
| `js/narrator.js` | The narration bar shared by the elevator and the time-lapse. |
| `js/chart.js` | Dock sparkline and the full history chart (log / linear / share of GDP). |
| `js/compare.js` | Other ways to see it (weight, length, area, counting) and the live growth pace. |
| `js/countries.js` | Twelve countries as stacks on one scale (total, per person, share of GDP). |
| `js/events.js` | Neutral historical markers for the time-lapse and chart. |
| `js/share.js` | Shareable links: `#year-1945`, `#person-100`, `#person-1`. |
| `js/altimeter.js` | The fixed altimeter. |
| `js/main.js` | Loads data, fills in text, wires the modules together. |

Data: [Debt to the Penny](https://fiscaldata.treasury.gov/datasets/debt-to-the-penny/),
[Historical Debt Outstanding](https://fiscaldata.treasury.gov/datasets/historical-debt-outstanding/),
World Bank [population](https://data.worldbank.org/indicator/SP.POP.TOTL?locations=US) and
[GDP](https://data.worldbank.org/indicator/NY.GDP.MKTP.CD?locations=US).
