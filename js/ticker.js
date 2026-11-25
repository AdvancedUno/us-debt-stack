// Stack It: the live estimate and "since you arrived".
// Debt to the Penny updates once per business day, so "now" is an estimate:
// the official figure plus the average growth rate times the time since that record.

import { formatUSD } from './format.js';

const DROP_EVERY = 100_000; // one falling bill per $100,000 of growth (about one a second)

export function createTicker({ valueEl, arrivedEl, elapsedEl, pileEl, debt, recordDate, ratePerSecond, reducedMotion }) {
  // The record is the total at the end of its day (Eastern time).
  const recordEnd = Date.parse(`${recordDate}T23:59:59-05:00`);
  const arrivedAt = Date.now();
  let dropped = 0;
  let pileHeight = 0;

  function dropBill() {
    pileHeight = Math.min(22, pileHeight + 1);
    pileEl.style.setProperty('--pile', `${pileHeight}px`);
    if (reducedMotion()) return;
    const bill = document.createElement('span');
    bill.className = 'drop';
    bill.style.setProperty('--tilt', `${(Math.random() * 30 - 15).toFixed(0)}deg`);
    bill.addEventListener('animationend', () => bill.remove(), { once: true });
    pileEl.append(bill);
  }

  function tick() {
    const now = Date.now();
    valueEl.textContent = formatUSD(debt + ratePerSecond * Math.max(0, now - recordEnd) / 1000);
    const seconds = (now - arrivedAt) / 1000;
    const grown = ratePerSecond * seconds;
    arrivedEl.textContent = `+${formatUSD(grown)}`;
    const s = Math.floor(seconds);
    elapsedEl.textContent = `in ${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
    const due = Math.floor(grown / DROP_EVERY);
    // After a hidden tab, don't rain hundreds of bills at once.
    if (due - dropped > 3) dropped = due - 1;
    while (dropped < due) {
      dropped += 1;
      dropBill();
    }
  }

  tick();
  setInterval(tick, 100);
}
