// Stack It: shareable links. The explore state lives in the URL hash:
//   #year-1945     the stack as it was at the end of fiscal year 1945
//   #person-100    one person's share in $100 bills (#person-1 for $1 bills)
// Today's whole-country stack is the plain URL. No DOM here, so it's testable in Node.

const YEAR = /^#year-(\d{4})$/;
const PERSON = /^#person-(100|1)$/;

/** Parse a location.hash into an explore state, or null if it isn't one. */
export function parseHash(hash) {
  const y = YEAR.exec(hash);
  if (y) return { mode: 'nation', year: Number(y[1]) };
  const p = PERSON.exec(hash);
  if (p) return { mode: 'person', denomination: Number(p[1]) };
  return null;
}

/** The hash for an explore state ('' for today's whole-country stack). */
export function hashFor({ mode, year, denomination }) {
  if (mode === 'person') return `#person-${denomination}`;
  return year == null ? '' : `#year-${year}`;
}

/** True if a hash is one of ours (so it's safe to replace). */
export const isStateHash = (hash) => YEAR.test(hash) || PERSON.test(hash);
