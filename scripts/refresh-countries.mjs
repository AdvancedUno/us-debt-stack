// Refresh data/countries.json from the IMF World Economic Outlook (DataMapper API).
// Usage: npm run countries
//
// Why a script and not a live request: the IMF API sends no CORS header, so browsers
// can't call it from GitHub Pages, and World Bank coverage of this indicator is missing
// for Japan, China and France. The saved file carries its own date and source.

import { writeFile } from 'node:fs/promises';

const API = 'https://www.imf.org/external/datamapper/api/v1';
const INDICATORS = {
  debtPctGdp: 'GGXWDG_NGDP', // general government gross debt, % of GDP
  gdpBillions: 'NGDPD', //       GDP, current prices, billions of U.S. dollars
  populationMillions: 'LP', //  population, millions
};
const COUNTRIES = {
  USA: 'United States', CHN: 'China', JPN: 'Japan', GBR: 'United Kingdom', FRA: 'France',
  ITA: 'Italy', IND: 'India', DEU: 'Germany', CAN: 'Canada', BRA: 'Brazil', KOR: 'South Korea', MEX: 'Mexico',
};
// The latest year with actual data for most countries; later years are IMF projections.
const YEAR = Number(process.argv[2] ?? new Date().getFullYear() - 1);

async function indicator(code) {
  const res = await fetch(`${API}/${code}/${Object.keys(COUNTRIES).join('/')}`, { signal: AbortSignal.timeout(60_000) });
  if (!res.ok) throw new Error(`IMF ${code}: HTTP ${res.status}`);
  const json = await res.json();
  return json.values[code];
}

const series = Object.fromEntries(
  await Promise.all(Object.entries(INDICATORS).map(async ([key, code]) => [key, await indicator(code)])),
);

const countries = Object.entries(COUNTRIES).map(([iso, name]) => {
  const pick = (key) => {
    const v = series[key]?.[iso]?.[YEAR];
    if (typeof v !== 'number') throw new Error(`Missing ${key} for ${iso} in ${YEAR}`);
    return v;
  };
  const debtPctGdp = pick('debtPctGdp');
  const gdp = pick('gdpBillions') * 1e9;
  const population = pick('populationMillions') * 1e6;
  return { iso, name, debtPctGdp, gdp, population, debt: (debtPctGdp / 100) * gdp };
});

const out = {
  savedAt: new Date().toLocaleDateString('en-CA'),
  year: YEAR,
  source: 'IMF World Economic Outlook (DataMapper): general government gross debt (GGXWDG_NGDP), GDP in current U.S. dollars (NGDPD), population (LP).',
  sourceUrl: 'https://www.imf.org/external/datamapper/GGXWDG_NGDP@WEO',
  note: 'General government debt covers all levels of government, so the U.S. figure here differs from the federal Treasury figure.',
  countries,
};
await writeFile(new URL('../data/countries.json', import.meta.url), `${JSON.stringify(out, null, 2)}\n`);
for (const c of countries) console.log(`${c.iso}  ${c.debtPctGdp.toFixed(1)}% of GDP  $${(c.debt / 1e12).toFixed(2)}T`);
