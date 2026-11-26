import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fetchJSON, loadData, parseDebtRow, parseHistory, parseWorldBank, requestUrls, streamData } from '../js/api.js';
import { formatHeight, formatUSDCompact } from '../js/format.js';

const PENNY = {
  data: [{
    record_date: '2026-11-23',
    debt_held_public_amt: '32902453860814.01',
    intragov_hold_amt: '7824900469105.52',
    tot_pub_debt_out_amt: '40727354329919.53',
  }],
};

test('parseDebtRow turns Treasury strings into numbers', () => {
  const row = parseDebtRow(PENNY);
  assert.equal(row.date, '2026-11-23');
  assert.equal(row.total, 40727354329919.53);
  assert.equal(row.public + row.intragov, row.total);
  assert.throws(() => parseDebtRow({ data: [] }), /no rows/);
  assert.throws(() => parseDebtRow({ data: [{ ...PENNY.data[0], tot_pub_debt_out_amt: 'null' }] }), /not a number/);
});

test('parseHistory keeps one row per fiscal year, oldest first', () => {
  const rows = parseHistory({
    data: [
      { record_date: '1791-01-01', record_fiscal_year: '1791', debt_outstanding_amt: '75463476.52' },
      { record_date: '1790-01-01', record_fiscal_year: '1790', debt_outstanding_amt: '71060508.50' },
      { record_date: '1791-06-30', record_fiscal_year: '1791', debt_outstanding_amt: '76000000.00' },
    ],
  });
  assert.deepEqual(rows.map((r) => r.year), [1790, 1791]);
  assert.equal(rows[1].total, 76000000);
});

test('parseWorldBank drops empty years and sorts oldest first', () => {
  const series = parseWorldBank([{}, [
    { date: '2025', value: 341784857 },
    { date: '2026', value: null },
    { date: '2024', value: 340003797 },
  ]]);
  assert.deepEqual(series.map((s) => s.year), [2024, 2025]);
  assert.throws(() => parseWorldBank([{ message: 'error' }]), /no rows/);
});

test('year-ago query asks for the first record 365 days back', () => {
  const urls = requestUrls(new Date('2026-11-24T12:00:00Z'));
  assert.match(decodeURIComponent(urls.yearAgo), /filter=record_date:gte:2025-11-24/);
  assert.match(decodeURIComponent(urls.debt), /sort=-record_date&page\[size\]=1/);
});

test('fetchJSON aborts after the timeout', async () => {
  const hang = (_url, { signal }) => new Promise((_, reject) => signal.addEventListener('abort', () => reject(signal.reason)));
  await assert.rejects(fetchJSON('https://example.test', { timeoutMs: 20, fetchImpl: hang }), /Timed out/);
});

test('loadData fills only the failed pieces from the snapshot', async () => {
  const snapshot = { savedAt: '2026-11-24', data: { population: { year: 2024, value: 1 } } };
  const fake = async (url) => {
    if (url.includes('snapshot')) return { ok: true, json: async () => snapshot };
    if (url.includes('SP.POP')) return { ok: false, status: 503 };
    if (url.includes('worldbank')) return { ok: true, json: async () => [{}, [{ date: '2025', value: 30e12 }]] };
    if (url.includes('debt_outstanding')) return { ok: true, json: async () => ({ data: [{ record_date: '2026-09-30', record_fiscal_year: '2026', debt_outstanding_amt: '1' }] }) };
    return { ok: true, json: async () => PENNY };
  };
  const data = await loadData({ fetchImpl: fake, snapshotUrl: 'snapshot.json' });
  assert.equal(data.origin.population, 'snapshot');
  assert.equal(data.origin.debt, 'live');
  assert.equal(data.population.value, 1);
  assert.equal(data.snapshotDate, '2026-11-24');
});

// --- streamData: first paint fast, then live upgrades --------------------------------

const SNAPSHOT = {
  savedAt: '2026-11-24',
  data: {
    debt: { date: '2026-11-22', total: 1, public: 1, intragov: 0 },
    yearAgo: { date: '2025-11-22', total: 1, public: 1, intragov: 0 },
    history: [{ year: 1790, date: '1790-01-01', total: 1 }],
    population: { year: 2024, value: 1 },
    gdp: [{ year: 2024, value: 1 }],
  },
};
const WB = [{}, [{ date: '2025', value: 9 }]];
const HISTORY = { data: [{ record_date: '2026-09-30', record_fiscal_year: '2026', debt_outstanding_amt: '5' }] };

/** A fake fetch: per-endpoint delay in ms (or 'fail'), resolving like Response. */
function fakeFetch(delays = {}) {
  const route = (url) => {
    if (url.includes('snapshot')) return ['snapshot', SNAPSHOT];
    if (url.includes('SP.POP')) return ['population', WB];
    if (url.includes('worldbank')) return ['gdp', WB];
    if (url.includes('debt_outstanding')) return ['history', HISTORY];
    if (url.includes('gte')) return ['yearAgo', PENNY];
    return ['debt', PENNY];
  };
  return (url, { signal } = {}) => {
    const [key, body] = route(url);
    const delay = delays[key] ?? 0;
    return new Promise((resolve, reject) => {
      if (delay === 'fail') return reject(new TypeError(`Failed to fetch ${key}`));
      const t = setTimeout(() => resolve({ ok: true, json: async () => body }), delay);
      signal?.addEventListener('abort', () => { clearTimeout(t); reject(signal.reason); });
    });
  };
}

async function collect(delays, opts = {}) {
  const updates = [];
  await streamData({
    fetchImpl: fakeFetch(delays),
    snapshotUrl: 'snapshot.json',
    firstPaintMs: 40,
    batchMs: 5,
    onUpdate: (d) => updates.push(d),
    ...opts,
  });
  return updates;
}

test('streamData: all live within the deadline paints once, all live', async () => {
  const updates = await collect({});
  assert.equal(updates.length, 1);
  assert.ok(Object.values(updates[0].origin).every((o) => o === 'live'));
  assert.equal(updates[0].snapshotDate, null);
});

test('streamData: a slow endpoint paints saved data first, then upgrades', async () => {
  const updates = await collect({ debt: 120 });
  assert.equal(updates.length, 2);
  assert.equal(updates[0].origin.debt, 'snapshot');
  assert.equal(updates[0].debt.total, 1);
  assert.equal(updates[0].origin.population, 'live');
  assert.equal(updates.at(-1).origin.debt, 'live');
  assert.equal(updates.at(-1).debt.total, 40727354329919.53);
});

test('streamData: a failed endpoint keeps saved data for that piece only', async () => {
  const updates = await collect({ history: 'fail' });
  const last = updates.at(-1);
  assert.equal(last.origin.history, 'snapshot');
  assert.equal(last.origin.debt, 'live');
  assert.equal(last.snapshotDate, '2026-11-24');
});

test('streamData: a hanging endpoint is cut off by the long timeout', async () => {
  const updates = await collect({ gdp: 10_000 }, { timeoutMs: 150 });
  assert.equal(updates.at(-1).origin.gdp, 'snapshot');
});

test('streamData: rejects when there is nothing to show', async () => {
  await assert.rejects(
    collect({ snapshot: 'fail', debt: 'fail' }),
    /No data/,
  );
});

test('formatting', () => {
  assert.equal(formatUSDCompact(40.7e12), '$40.7T');
  assert.equal(formatHeight(0.00010922), '0.11 mm');
  assert.equal(formatHeight(0.13), '13.0 cm');
  assert.equal(formatHeight(1.75), '1.75 m');
  assert.equal(formatHeight(8849), '8,849 m');
  assert.equal(formatHeight(44_482_416), '44,482 km');
});
