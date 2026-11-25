import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fetchJSON, loadData, parseDebtRow, parseHistory, parseWorldBank, requestUrls } from '../js/api.js';
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

test('formatting', () => {
  assert.equal(formatUSDCompact(40.7e12), '$40.7T');
  assert.equal(formatHeight(0.00010922), '0.11 mm');
  assert.equal(formatHeight(0.13), '13.0 cm');
  assert.equal(formatHeight(1.75), '1.75 m');
  assert.equal(formatHeight(8849), '8,849 m');
  assert.equal(formatHeight(44_482_416), '44,482 km');
});
