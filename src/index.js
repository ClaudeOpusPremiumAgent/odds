import Resolver from '@forge/resolver';
import { projectForecast, record, ledgerFor, resolveAll, modelSnapshot, remember, knownProjects, dropNameCache } from './service.js';

const pct = (p) => (p === null || p === undefined ? 'n/a' : `${Math.round(p * 100)}%`);
const keyOf = (payload) => String(payload.projectKey || payload.context?.jira?.projectKey || '').trim().toUpperCase();

const resolver = new Resolver();

resolver.define('load', async ({ context }) => {
  const key = context.extension.project.key;
  await Promise.all([remember(key), dropNameCache()]);
  await resolveAll(key);
  const [forecast, ledger] = await Promise.all([projectForecast('user', key), ledgerFor(key)]);
  return { forecast, ledger };
});

resolver.define('record', async ({ payload, context }) => {
  const key = context.extension.project.key;
  return record('user', key, payload.versionId, payload.probability, context.accountId);
});

export const handler = resolver.getDefinitions();

export async function getForecast(payload) {
  const key = keyOf(payload);
  if (!key) return 'Tell me which Jira project to look at (its key).';
  const fc = await projectForecast('user', key);
  const wanted = payload.versionName ? fc.versions.filter((v) => v.name === payload.versionName) : fc.versions;
  const cal = fc.calibration.rows.map((r) => `when it said ${pct(r.said)}, it happened ${pct(r.happened)} (${r.n} checks)`);
  return {
    project: key,
    sampleTeam: fc.sample ? 'This project has no finished work in the last 12 weeks, so these numbers are for a made-up sample team, not this project.' : undefined,
    versions: wanted.map((v) => ({
      version: v.name,
      releaseDate: v.releaseDate,
      openIssues: v.remaining,
      openIssuesIncludingEarlierVersions: v.ahead,
      chanceOnTime: pct(v.probability),
      likelyFinishWeeks: v.p50Weeks,
      safeFinishWeeks: v.p85Weeks,
      eightyFivePercentSureBy: v.sure85Date,
      issuesToDropFor80PercentChance: v.cutFor80,
      note: v.reason || null,
    })),
    weeklyThroughputLast12Weeks: fc.throughput,
    modelBacktestOnThisTeam: cal.length ? cal : 'not enough history to check the model',
  };
}

export async function recordForecast(payload, context) {
  const key = keyOf(payload);
  const author = context?.accountId || payload.context?.accountId;
  if (!author) return 'I could not tell who is making this forecast, so I did not record it.';
  const e = await record('user', key, payload.versionName, payload.probability, author);
  return `Recorded: ${pct(e.p)} that ${e.versionName} ships by ${e.due}. It will be scored when the version is released or the date passes.`;
}

export async function getLedger(payload) {
  const key = keyOf(payload);
  const l = await ledgerFor(key);
  if (!l.rows.length) return `No forecasts on ${key} have been resolved yet (${l.open} still open).`;
  return {
    project: key,
    resolvedBaseRate: pct(l.baseRate),
    openForecasts: l.open,
    forecasters: l.rows.map((r) => ({
      name: r.name,
      resolvedForecasts: r.n,
      brier: r.brier.toFixed(3),
      brierIfAlwaysBaseRate: r.baseline.toFixed(3),
      averageSaid: pct(r.meanSaid),
      actuallyHappened: pct(r.meanHappened),
    })),
    howToRead: 'Lower Brier is better. A forecaster beats the base rate only if their Brier is below brierIfAlwaysBaseRate.',
  };
}

export async function daily() {
  await dropNameCache();
  for (const key of await knownProjects()) {
    try {
      await resolveAll(key);
      await modelSnapshot(key);
    } catch (e) {
      console.error(`daily ${key}: ${e.message}`);
    }
  }
}
