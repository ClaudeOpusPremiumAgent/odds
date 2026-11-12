import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  weeklyThroughput, simulateWeeks, probabilityWithin, forecastVersion, backtest, reliability,
  brier, resolveForecast, ledger, rng, cutToReach, latestPerDay, sampleTeam, _test,
} from '../src/model.js';

const { WEEK } = _test;
const NOW = Date.UTC(2026, 10, 9, 12); // a Monday is not required; weeks are counted from the epoch

function steady(perWeek, weeks, now = NOW) {
  const end = now - (now % WEEK);
  const times = [];
  for (let w = 1; w <= weeks; w++) for (let i = 0; i < perWeek; i++) times.push(end - w * WEEK + (i + 1) * 3600000);
  return times;
}

test('throughput counts each full week and ignores the current one', () => {
  const times = [...steady(3, 4), NOW - 1000];
  assert.deepEqual(weeklyThroughput(times, NOW, 4), [3, 3, 3, 3]);
});

test('steady team: 12 items at 3 a week take exactly 4 weeks', () => {
  const sims = simulateWeeks([3, 3, 3], 12, 7, 200);
  assert.ok(sims.every((w) => w === 4));
  assert.equal(probabilityWithin(sims, 4), 1);
  assert.equal(probabilityWithin(sims, 3), 0);
  assert.ok(Math.abs(probabilityWithin(sims, 3.5) - 0.5) < 1e-9, 'half of the fourth week left gives half the chance');
});

test('a team that never finishes anything gives no probability, not a confident zero', () => {
  const f = forecastVersion({ resolvedTimes: [], remaining: 5, due: NOW + 10 * WEEK, now: NOW });
  assert.equal(f.probability, null);
});

test('forecast is deterministic for the same data and seed', () => {
  const args = { resolvedTimes: steady(2, 12).concat(steady(1, 6)), remaining: 20, due: NOW + 8 * WEEK, now: NOW };
  assert.deepEqual(forecastVersion(args), forecastVersion(args));
});

test('nothing left means certain, even with zero weeks available', () => {
  const f = forecastVersion({ resolvedTimes: steady(2, 12), remaining: 0, due: NOW, now: NOW });
  assert.equal(f.probability, 1);
});

test('backtest on a stationary random team is roughly calibrated', () => {
  const rand = rng(42);
  const end = NOW - (NOW % WEEK);
  const times = [];
  for (let w = 1; w <= 60; w++) {
    const n = Math.floor(rand() * 7); // 0..6 a week
    for (let i = 0; i < n; i++) times.push(end - w * WEEK + i * 3600000);
  }
  const rows = reliability(backtest(times, NOW, { origins: 40 }));
  for (const r of rows) assert.ok(Math.abs(r.said - r.happened) < 0.2, JSON.stringify(r));
});

test('backtest catches a team that slowed down: the model was overconfident', () => {
  const end = NOW - (NOW % WEEK);
  const times = [];
  for (let w = 1; w <= 60; w++) {
    const n = w <= 20 ? 1 : 5; // recent 20 weeks much slower
    for (let i = 0; i < n; i++) times.push(end - w * WEEK + i * 3600000);
  }
  const pairs = backtest(times, NOW, { origins: 30, historyWeeks: 12, horizon: 4 });
  const said = pairs.reduce((a, x) => a + x.p, 0) / pairs.length;
  const happened = pairs.reduce((a, x) => a + x.hit, 0) / pairs.length;
  assert.ok(happened < said - 0.1, `said ${said} happened ${happened}`);
});

test('cut to reach 80%: a steady 3-a-week team with 4 weeks can take 12, so 15 needs 3 dropped', () => {
  assert.equal(cutToReach([3, 3, 3], 15, 4, 0.8, 1), 3);
  assert.equal(cutToReach([3, 3, 3], 12, 4, 0.8, 1), 0);
  assert.equal(cutToReach([3, 3, 3], 5, 0, 0.8, 1), 5, 'no time left means dropping everything');
});

test('brier: perfect is 0, coin flip on certain events is 0.25', () => {
  assert.equal(brier([{ p: 1, hit: 1 }, { p: 0, hit: 0 }]), 0);
  assert.equal(brier([{ p: 0.5, hit: 1 }, { p: 0.5, hit: 0 }]), 0.25);
});

test('forecast resolves on release by its own due date, and late release counts as a miss', () => {
  const f = { p: 0.8, due: '2026-12-01', author: 'a' };
  assert.equal(resolveForecast(f, { released: true, releaseDate: '2026-11-30' }, NOW).outcome, 1);
  assert.equal(resolveForecast(f, { released: true, releaseDate: '2026-12-05' }, NOW).outcome, 0);
  assert.equal(resolveForecast(f, { released: false }, NOW).outcome, undefined);
  assert.equal(resolveForecast(f, { released: false }, Date.parse('2026-12-03')).outcome, 0);
});

test('a resolved forecast never changes', () => {
  const f = { p: 0.8, due: '2026-12-01', author: 'a', outcome: 1 };
  assert.equal(resolveForecast(f, { released: true, releaseDate: '2027-01-01' }, NOW).outcome, 1);
});

test('ledger ranks by Brier and compares with always saying the base rate', () => {
  const fs = [
    { author: 'model', p: 0.7, outcome: 1 }, { author: 'model', p: 0.3, outcome: 0 },
    { author: 'pm', p: 0.95, outcome: 0 }, { author: 'pm', p: 0.9, outcome: 1 },
    { author: 'pm', p: 0.9, due: '2027-01-01' },
  ];
  const l = ledger(fs);
  assert.equal(l.rows[0].author, 'model');
  assert.equal(l.open, 1);
  assert.equal(l.baseRate, 0.5);
  assert.ok(l.rows.find((r) => r.author === 'pm').brier > l.rows.find((r) => r.author === 'pm').baseline);
});


test('latestPerDay keeps one forecast per person, version and day', () => {
  const t = Date.UTC(2026, 10, 10, 15, 23);
  const fs = [
    { author: 'a', versionId: '1', at: t + 60000, p: 0.8 },
    { author: 'a', versionId: '1', at: t, p: 0.9 },
    { author: 'a', versionId: '2', at: t, p: 0.5 },
    { author: 'b', versionId: '1', at: t, p: 0.4 },
    { author: 'a', versionId: '1', at: t + 86400000, p: 0.7 },
  ];
  const kept = latestPerDay(fs).map((f) => `${f.author}${f.versionId}:${f.p}`).sort();
  assert.deepEqual(kept, ['a1:0.7', 'a1:0.8', 'a2:0.5', 'b1:0.4']);
});

test('the sample team gives a real forecast and a replay check from today', () => {
  const now = Date.UTC(2027, 0, 12);
  const s = sampleTeam(now);
  const v = s.versions[0];
  const f = forecastVersion({ resolvedTimes: s.resolvedTimes, remaining: s.remaining[v.id], due: Date.parse(v.releaseDate), now });
  assert.ok(f.probability > 0 && f.probability < 1, `probability ${f.probability}`);
  assert.ok(s.versions.every((x) => Date.parse(x.releaseDate) > now));
  assert.ok(backtest(s.resolvedTimes, now, { historyWeeks: 12, horizon: 4, origins: 26 }).length > 0);
});
