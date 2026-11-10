import { kvs, WhereConditions } from '@forge/kvs';
import { versions, resolvedTimes, remainingByVersion, displayName } from './jira.js';
import { forecastVersion, backtest, reliability, brier, resolveForecast, ledger, latestPerDay } from './model.js';

const DAY = 86400000;
const HISTORY_WEEKS = 12;
const BACKTEST_WEEKS = HISTORY_WEEKS + 4 + 26;
export const MODEL = 'odds-model';

const endOfDay = (date) => Date.parse(date) + DAY - 1;
const hash = (s) => [...String(s)].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
const isoWeek = (t) => {
  const d = new Date(t);
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const start = Date.UTC(d.getUTCFullYear(), 0, 1);
  return `${d.getUTCFullYear()}-W${Math.ceil(((d - start) / DAY + 1) / 7)}`;
};

async function all(prefix) {
  const out = [];
  let cursor;
  do {
    let q = kvs.query().where('key', WhereConditions.beginsWith(prefix)).limit(20);
    if (cursor) q = q.cursor(cursor);
    const page = await q.getMany();
    out.push(...page.results);
    cursor = page.nextCursor;
  } while (cursor);
  return out;
}

// shortcut: versions before 2026-11-10 cached display names under user:*; this clears them, delete after 2026-12.
export async function dropNameCache() {
  for (const r of await all('user:')) await kvs.delete(r.key);
}

export async function remember(key) {
  await kvs.set(`proj:${key}`, { key });
}

export async function knownProjects() {
  return (await all('proj:')).map((r) => r.value.key);
}

export async function projectForecast(as, key, now = Date.now()) {
  const [vs, times, remaining] = await Promise.all([
    versions(as, key),
    resolvedTimes(as, key, BACKTEST_WEEKS),
    remainingByVersion(as, key),
  ]);
  // One team works through versions in release-date order, so a later version waits for the work before it.
  const open = vs.filter((v) => !v.released && !v.archived)
    .sort((a, b) => (a.releaseDate || '9999').localeCompare(b.releaseDate || '9999'));
  let ahead = 0;
  const rows = open.map((v) => {
    const left = remaining[v.id] || 0;
    if (!v.releaseDate) return { id: v.id, name: v.name, releaseDate: null, remaining: left, ahead: null, probability: null, reason: 'no release date' };
    ahead += left;
    const f = forecastVersion({ resolvedTimes: times, remaining: ahead, due: endOfDay(v.releaseDate), now, historyWeeks: HISTORY_WEEKS, seed: hash(v.id) });
    return { id: v.id, name: v.name, releaseDate: v.releaseDate, remaining: left, ahead, ...f };
  });
  const pairs = backtest(times, now, { historyWeeks: HISTORY_WEEKS, horizon: 4, origins: 26 });
  const first = rows.find((r) => r.samples);
  const weekStart = now - (now % (7 * DAY));
  return {
    key,
    versions: rows.map(({ samples, ...r }) => r),
    throughput: first ? first.samples : [],
    weekLabels: (first ? first.samples : []).map((_, i, a) => new Date(weekStart - (a.length - i) * 7 * DAY).toISOString().slice(5, 10)),
    calibration: { rows: reliability(pairs), brier: brier(pairs), n: pairs.length },
  };
}

export async function forecasts(key) {
  return latestPerDay((await all(`fc:${key}:`)).map((r) => ({ id: r.key, ...r.value })));
}

export async function record(as, key, versionRef, p, author, now = Date.now()) {
  const prob = Number(p) > 1 ? Number(p) / 100 : Number(p);
  if (!(prob >= 0 && prob <= 1)) throw new Error('Probability must be between 0 and 1 (or 0 and 100 as a percentage).');
  const v = (await versions(as, key)).find((x) => x.id === String(versionRef) || x.name === versionRef);
  if (!v) throw new Error(`No version "${versionRef}" in project ${key}.`);
  if (v.released || !v.releaseDate) throw new Error(`Version ${v.name} is released or has no release date, so there is nothing to forecast.`);
  const entry = { versionId: v.id, versionName: v.name, due: v.releaseDate, p: prob, author, at: now };
  await kvs.set(`fc:${key}:${now}-${hash(author + v.id + now)}`, entry);
  await remember(key);
  return entry;
}

export async function resolveAll(key, now = Date.now()) {
  const vs = new Map((await versions('app', key)).map((v) => [v.id, v]));
  let resolved = 0;
  for (const f of await forecasts(key)) {
    if (f.outcome === 0 || f.outcome === 1) continue;
    const next = resolveForecast(f, vs.get(f.versionId), now);
    if (next.outcome === 0 || next.outcome === 1) {
      const { id, ...value } = next;
      await kvs.set(id, value);
      resolved += 1;
    }
  }
  return resolved;
}

// The model enters the ledger like everyone else: one forecast per open version per week.
export async function modelSnapshot(key, now = Date.now()) {
  const week = isoWeek(now);
  const existing = new Set((await forecasts(key)).filter((f) => f.author === MODEL && isoWeek(f.at) === week).map((f) => f.versionId));
  const fc = await projectForecast('app', key, now);
  let added = 0;
  for (const v of fc.versions) {
    if (v.probability === null || existing.has(v.id)) continue;
    await kvs.set(`fc:${key}:${now}-${hash(MODEL + v.id)}`, { versionId: v.id, versionName: v.name, due: v.releaseDate, p: v.probability, author: MODEL, at: now });
    added += 1;
  }
  return added;
}

export async function ledgerFor(key) {
  const fs = await forecasts(key);
  const l = ledger(fs);
  const pending = fs.filter((f) => f.outcome !== 0 && f.outcome !== 1).sort((a, b) => b.at - a.at);
  // Names are looked up live, never stored: the app keeps only account IDs.
  const authors = [...new Set([...l.rows.map((r) => r.author), ...pending.map((f) => f.author)])];
  const names = Object.fromEntries(await Promise.all(
    authors.map(async (a) => [a, a === MODEL ? 'Odds model' : await displayName(a)]),
  ));
  return {
    ...l,
    rows: l.rows.map((r) => ({ ...r, name: names[r.author] })),
    pending: pending.map((f) => ({ name: names[f.author], version: f.versionName, p: f.p, at: f.at, due: f.due })),
  };
}
