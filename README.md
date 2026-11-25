# Stack It

The U.S. national debt, live from the Treasury, as a stack of $100 bills you climb by scrolling.

Plain HTML, CSS and ES modules. No build step; deploys as-is to GitHub Pages.

## Run locally

ES modules need a server (opening `index.html` from disk won't load them):

```
npm run serve        # python -m http.server 8765, then open http://localhost:8765
```

## Test

```
npm test             # node --test: scale math, API parsing, fallback, formatting
```

## Refresh the fallback data

```
npm run snapshot     # fetches all endpoints, rewrites data/snapshot.json only if every request succeeds
```

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
| `js/nav.js` | Chapter rail and keys 1–7. |
| `js/altimeter.js` | The fixed altimeter. |
| `js/main.js` | Loads data, fills in text, wires the modules together. |

Data: [Debt to the Penny](https://fiscaldata.treasury.gov/datasets/debt-to-the-penny/),
[Historical Debt Outstanding](https://fiscaldata.treasury.gov/datasets/historical-debt-outstanding/),
World Bank [population](https://data.worldbank.org/indicator/SP.POP.TOTL?locations=US) and
[GDP](https://data.worldbank.org/indicator/NY.GDP.MKTP.CD?locations=US).
