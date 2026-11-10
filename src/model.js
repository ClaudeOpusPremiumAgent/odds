// Pure forecasting and scoring logic. No Forge or Jira imports, so it runs under plain `node --test`.

const DAY = 86400000;
const WEEK = 7 * DAY;

// Deterministic PRNG so a forecast does not change between page loads with the same data.
export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Items finished in each of the last `weeks` full weeks before `now`, oldest first.
export function weeklyThroughput(resolvedTimes, now, weeks) {
  const counts = new Array(weeks).fill(0);
  const end = now - (now % WEEK);
  for (const t of resolvedTimes) {
    const back = Math.floor((end - t) / WEEK);
    if (t < end && back < weeks) counts[weeks - 1 - back] += 1;
  }
  return counts;
}

// Weeks needed to finish `remaining` items, resampling past weekly throughput. Capped at `cap`.
export function simulateWeeks(samples, remaining, seed, runs = 5000, cap = 104) {
  if (remaining <= 0) return new Array(runs).fill(0);
  const rand = rng(seed);
  const out = new Array(runs);
  for (let r = 0; r < runs; r++) {
    let left = remaining;
    let w = 0;
    while (left > 0 && w < cap) {
      left -= samples[Math.floor(rand() * samples.length)];
      w += 1;
    }
    out[r] = left > 0 ? Infinity : w;
  }
  return out;
}

// weeksAvailable may be fractional: a run that needs the next whole week counts by the part of it left.
export function probabilityWithin(weeksNeeded, weeksAvailable) {
  if (!weeksNeeded.length) return null;
  const whole = Math.floor(weeksAvailable);
  const part = weeksAvailable - whole;
  let hit = 0;
  for (const w of weeksNeeded) hit += w <= whole ? 1 : w === whole + 1 ? part : 0;
  return hit / weeksNeeded.length;
}

export function quantile(values, q) {
  const s = [...values].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor(q * s.length))];
}

// Fewest items to drop so the chance of finishing in time reaches `target` (an empty scope always makes it).
export function cutToReach(samples, remaining, weeksAvailable, target, seed) {
  const chance = (n) => probabilityWithin(simulateWeeks(samples, n, seed, 2000), weeksAvailable);
  if (chance(remaining) >= target) return 0;
  let lo = 0;
  let hi = remaining; // chance(remaining - hi) >= target, chance(remaining - lo) < target
  while (hi - lo > 1) {
    const mid = Math.floor((lo + hi) / 2);
    if (chance(remaining - mid) >= target) hi = mid;
    else lo = mid;
  }
  return hi;
}

// Forecast for one version: chance to finish `remaining` items in the weeks left before `due`.
export function forecastVersion({ resolvedTimes, remaining, due, now, historyWeeks = 12, seed = 1 }) {
  const samples = weeklyThroughput(resolvedTimes, now, historyWeeks);
  const total = samples.reduce((a, b) => a + b, 0);
  if (total === 0) return { probability: null, reason: 'no finished work in the history window' };
  const weeksAvailable = Math.max(0, (due - now) / WEEK);
  const sims = simulateWeeks(samples, remaining, seed);
  const p85Weeks = quantile(sims, 0.85);
  return {
    probability: probabilityWithin(sims, weeksAvailable),
    weeksAvailable,
    p50Weeks: quantile(sims, 0.5),
    p85Weeks,
    sure85Date: Number.isFinite(p85Weeks) ? new Date(now - (now % WEEK) + (p85Weeks + 1) * WEEK).toISOString().slice(0, 10) : null,
    cutFor80: cutToReach(samples, remaining, weeksAvailable, 0.8, seed),
    samples,
  };
}

// Rolling-origin backtest on the team's own history: at each past week, forecast the chance that
// throughput over the next `horizon` weeks reaches thresholds set at the model's own quantiles,
// then check what happened. Returns [{p, hit}] pairs for a reliability table.
export function backtest(resolvedTimes, now, { horizon = 4, historyWeeks = 12, origins = 26, levels = [0.1, 0.3, 0.5, 0.7, 0.9] } = {}) {
  const totalWeeks = historyWeeks + horizon + origins;
  const counts = weeklyThroughput(resolvedTimes, now, totalWeeks);
  const pairs = [];
  for (let o = 0; o < origins; o++) {
    const start = o;
    const history = counts.slice(start, start + historyWeeks);
    const future = counts.slice(start + historyWeeks, start + historyWeeks + horizon);
    if (future.length < horizon || history.every((c) => c === 0)) continue;
    const actual = future.reduce((a, b) => a + b, 0);
    const rand = rng(1000 + o);
    const sums = [];
    for (let r = 0; r < 2000; r++) {
      let s = 0;
      for (let h = 0; h < horizon; h++) s += history[Math.floor(rand() * history.length)];
      sums.push(s);
    }
    for (const level of levels) {
      // threshold the model gives `level` chance to reach
      const threshold = quantile(sums, 1 - level);
      const p = sums.filter((s) => s >= threshold).length / sums.length;
      pairs.push({ p, hit: actual >= threshold ? 1 : 0 });
    }
  }
  return pairs;
}

export function reliability(pairs, bins = [0, 0.2, 0.4, 0.6, 0.8, 1.0001]) {
  const rows = [];
  for (let i = 0; i < bins.length - 1; i++) {
    const inBin = pairs.filter((x) => x.p >= bins[i] && x.p < bins[i + 1]);
    if (!inBin.length) continue;
    const mean = (k) => inBin.reduce((a, x) => a + x[k], 0) / inBin.length;
    rows.push({ from: bins[i], to: Math.min(1, bins[i + 1]), n: inBin.length, said: mean('p'), happened: mean('hit') });
  }
  return rows;
}

export function brier(pairs) {
  if (!pairs.length) return null;
  return pairs.reduce((a, x) => a + (x.p - x.hit) ** 2, 0) / pairs.length;
}

// A forecast resolves when its version is released (on time if released by the due date it was
// made against) or when that date has passed without a release.
export function resolveForecast(forecast, version, now) {
  if (forecast.outcome !== undefined && forecast.outcome !== null) return forecast;
  const due = Date.parse(forecast.due);
  if (version && version.released && version.releaseDate) {
    const released = Date.parse(version.releaseDate);
    return { ...forecast, outcome: released <= due ? 1 : 0, resolvedAt: now };
  }
  if (now > due + DAY) return { ...forecast, outcome: 0, resolvedAt: now };
  return forecast;
}

// Per-forecaster Brier, and the same forecaster's score against always saying the base rate.
export function ledger(forecasts) {
  const done = forecasts.filter((f) => f.outcome === 0 || f.outcome === 1);
  const baseRate = done.length ? done.reduce((a, f) => a + f.outcome, 0) / done.length : null;
  const by = new Map();
  for (const f of done) {
    if (!by.has(f.author)) by.set(f.author, []);
    by.get(f.author).push({ p: f.p, hit: f.outcome });
  }
  const rows = [...by.entries()].map(([author, pairs]) => ({
    author,
    n: pairs.length,
    brier: brier(pairs),
    baseline: brier(pairs.map((x) => ({ p: baseRate, hit: x.hit }))),
    meanSaid: pairs.reduce((a, x) => a + x.p, 0) / pairs.length,
    meanHappened: pairs.reduce((a, x) => a + x.hit, 0) / pairs.length,
  }));
  rows.sort((a, b) => a.brier - b.brier);
  return { baseRate, rows, open: forecasts.length - done.length };
}

// A person counts once per version per day: repeated clicks or a same-day change of mind keep only the latest.
export function latestPerDay(forecasts) {
  const latest = new Map();
  for (const f of [...forecasts].sort((a, b) => a.at - b.at)) {
    latest.set(`${f.author}|${f.versionId}|${new Date(f.at).toISOString().slice(0, 10)}`, f);
  }
  return [...latest.values()];
}

export const _test = { WEEK, DAY };
