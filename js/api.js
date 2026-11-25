// Stack It: data loading.
// Four keyless endpoints (U.S. Treasury Fiscal Data, World Bank). Each request has its
// own timeout; any that fails falls back to data/snapshot.json on its own.
// No DOM code here, so scripts/refresh-snapshot.mjs can reuse it in Node.

const TREASURY = 'https://api.fiscaldata.treasury.gov/services/api/fiscal_service/v2/accounting/od';
const WORLD_BANK = 'https://api.worldbank.org/v2/country/USA/indicator';

export const SOURCE_LINKS = Object.freeze({
  debt: 'https://fiscaldata.treasury.gov/datasets/debt-to-the-penny/',
  history: 'https://fiscaldata.treasury.gov/datasets/historical-debt-outstanding/',
  population: 'https://data.worldbank.org/indicator/SP.POP.TOTL?locations=US',
  gdp: 'https://data.worldbank.org/indicator/NY.GDP.MKTP.CD?locations=US',
});

const treasuryUrl = (dataset, params) => `${TREASURY}/${dataset}?${new URLSearchParams(params)}`;
const isoDate = (d) => d.toISOString().slice(0, 10);

/** Request URLs. `today` is injectable so the year-ago query can be tested. */
export function requestUrls(today = new Date()) {
  const yearAgo = new Date(today);
  yearAgo.setUTCDate(yearAgo.getUTCDate() - 365);
  return {
    debt: treasuryUrl('debt_to_penny', { sort: '-record_date', 'page[size]': 1 }),
    yearAgo: treasuryUrl('debt_to_penny', {
      filter: `record_date:gte:${isoDate(yearAgo)}`,
      sort: 'record_date',
      'page[size]': 1,
    }),
    history: treasuryUrl('debt_outstanding', {
      fields: 'record_date,record_fiscal_year,debt_outstanding_amt',
      sort: 'record_date',
      'page[size]': 10000,
    }),
    population: `${WORLD_BANK}/SP.POP.TOTL?format=json&mrv=1`,
    gdp: `${WORLD_BANK}/NY.GDP.MKTP.CD?format=json&date=1960:2100&per_page=200`,
  };
}

/** fetch() + JSON with a hard timeout. */
export async function fetchJSON(url, { timeoutMs = 5000, fetchImpl = globalThis.fetch } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(new Error(`Timed out after ${timeoutMs} ms: ${url}`)), timeoutMs);
  try {
    const res = await fetchImpl(url, { signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

// Treasury sends amounts as strings, e.g. "40727354329919.53".
function toNumber(value, label) {
  const n = typeof value === 'number' ? value : Number.parseFloat(value);
  if (!Number.isFinite(n)) throw new Error(`${label}: not a number (${value})`);
  return n;
}

export function parseDebtRow(json) {
  const row = json?.data?.[0];
  if (!row) throw new Error('Debt to the Penny: no rows');
  return {
    date: row.record_date,
    total: toNumber(row.tot_pub_debt_out_amt, 'tot_pub_debt_out_amt'),
    public: toNumber(row.debt_held_public_amt, 'debt_held_public_amt'),
    intragov: toNumber(row.intragov_hold_amt, 'intragov_hold_amt'),
  };
}

/** One row per fiscal year (the last record wins if a year appears twice), oldest first. */
export function parseHistory(json) {
  const rows = json?.data;
  if (!rows?.length) throw new Error('Historical Debt Outstanding: no rows');
  const byYear = new Map();
  for (const r of rows) {
    const year = Number(r.record_fiscal_year ?? r.record_date.slice(0, 4));
    byYear.set(year, { year, date: r.record_date, total: toNumber(r.debt_outstanding_amt, 'debt_outstanding_amt') });
  }
  return [...byYear.values()].sort((a, b) => a.year - b.year);
}

/** World Bank series, non-empty values only, oldest first. */
export function parseWorldBank(json) {
  const rows = Array.isArray(json) ? json[1] : null;
  if (!rows?.length) throw new Error('World Bank: no rows');
  const series = rows
    .filter((r) => r.value != null)
    .map((r) => ({ year: Number(r.date), value: toNumber(r.value, r.indicator?.id ?? 'value') }))
    .sort((a, b) => a.year - b.year);
  if (!series.length) throw new Error('World Bank: only empty values');
  return series;
}

const PARSERS = {
  debt: parseDebtRow,
  yearAgo: parseDebtRow,
  history: parseHistory,
  population: (json) => parseWorldBank(json).at(-1),
  gdp: parseWorldBank,
};
export const DATA_KEYS = Object.freeze(Object.keys(PARSERS));

/** Fetch every endpoint in parallel. Returns what succeeded and what failed. */
export async function fetchLive({ today, ...opts } = {}) {
  const urls = requestUrls(today);
  const results = await Promise.allSettled(
    DATA_KEYS.map(async (key) => PARSERS[key](await fetchJSON(urls[key], opts))),
  );
  const data = {};
  const errors = {};
  results.forEach((r, i) => {
    if (r.status === 'fulfilled') data[DATA_KEYS[i]] = r.value;
    else errors[DATA_KEYS[i]] = r.reason;
  });
  return { data, errors };
}

/**
 * Live data, with each failed piece filled in from the snapshot.
 * `origin[key]` is 'live' or 'snapshot'; `snapshotDate` is set when any piece is saved data.
 * Throws only if a request fails and the snapshot can't be loaded either.
 */
export async function loadData({ snapshotUrl = './data/snapshot.json', ...opts } = {}) {
  const { data, errors } = await fetchLive(opts);
  const missing = Object.keys(errors);
  const origin = Object.fromEntries(DATA_KEYS.map((k) => [k, k in data ? 'live' : 'snapshot']));
  let snapshotDate = null;

  if (missing.length) {
    for (const key of missing) console.warn(`[stack-it] ${key}: using saved data.`, errors[key]);
    const snapshot = await fetchJSON(snapshotUrl, opts);
    for (const key of missing) data[key] = snapshot.data[key];
    snapshotDate = snapshot.savedAt;
  }
  return { ...data, origin, snapshotDate };
}
