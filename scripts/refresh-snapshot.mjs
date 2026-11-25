// Refresh data/snapshot.json from the live APIs.
// Usage: npm run snapshot   (or: node scripts/refresh-snapshot.mjs)
// Writes nothing if any endpoint fails, so the last good snapshot is never overwritten with gaps.

import { writeFile } from 'node:fs/promises';
import { fetchLive } from '../js/api.js';

const { data, errors } = await fetchLive({ timeoutMs: 20_000 });
const failed = Object.keys(errors);
if (failed.length) {
  for (const key of failed) console.error(`${key}: ${errors[key].message}`);
  console.error('Snapshot not updated.');
  process.exit(1);
}

const snapshot = {
  savedAt: new Date().toLocaleDateString('en-CA'), // local YYYY-MM-DD
  note: 'Fallback data for Stack It. Regenerate with `npm run snapshot`.',
  data,
};
const target = new URL('../data/snapshot.json', import.meta.url);
await writeFile(target, `${JSON.stringify(snapshot, null, 2)}\n`);
console.log(`Saved snapshot: debt ${data.debt.total} on ${data.debt.date}, ${data.history.length} history rows.`);
