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
| `js/climb.js` | Scroll → altitude → positions the stack, ground and landmark markers. |
| `js/sky.js` | Sky color by altitude. |
| `js/altimeter.js` | The fixed altimeter. |
| `js/main.js` | Loads data, fills in text, starts the climb. |

Data: [Debt to the Penny](https://fiscaldata.treasury.gov/datasets/debt-to-the-penny/),
[Historical Debt Outstanding](https://fiscaldata.treasury.gov/datasets/historical-debt-outstanding/),
World Bank [population](https://data.worldbank.org/indicator/SP.POP.TOTL?locations=US) and
[GDP](https://data.worldbank.org/indicator/NY.GDP.MKTP.CD?locations=US).
