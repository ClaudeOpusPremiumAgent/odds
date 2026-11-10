import api, { route } from '@forge/api';

// User-triggered reads run as the user, so nobody sees a project through the app that Jira hides from them.
// The daily trigger has no user and runs as the app.
function client(as) {
  return as === 'app' ? api.asApp() : api.asUser();
}

async function call(as, path, options = {}) {
  for (let attempt = 0; attempt < 4; attempt++) {
    const res = await client(as).requestJira(path, { headers: { Accept: 'application/json', 'Content-Type': 'application/json' }, ...options });
    if (res.status === 429) {
      const wait = Number(res.headers.get('Retry-After') || 2) * 1000 + Math.random() * 500;
      await new Promise((r) => setTimeout(r, Math.min(wait, 10000)));
      continue;
    }
    if (!res.ok) throw new Error(`Jira answered ${res.status} for ${path}`);
    return res.json();
  }
  throw new Error('Jira kept rate-limiting the request');
}

export function versions(as, key) {
  return call(as, route`/rest/api/3/project/${key}/versions`);
}

async function search(as, jql, fields) {
  const issues = [];
  let nextPageToken;
  do {
    const page = await call(as, route`/rest/api/3/search/jql`, {
      method: 'POST',
      body: JSON.stringify({ jql, fields, maxResults: 100, nextPageToken }),
    });
    issues.push(...(page.issues || []));
    nextPageToken = page.nextPageToken;
  } while (nextPageToken && issues.length < 5000);
  return issues;
}

const quoted = (key) => `"${String(key).replace(/["\\]/g, '')}"`;

export async function resolvedTimes(as, key, weeks) {
  const issues = await search(as, `project = ${quoted(key)} AND resolved >= -${weeks}w`, ['resolutiondate']);
  return issues.map((i) => Date.parse(i.fields.resolutiondate)).filter(Number.isFinite);
}

// Open issues per unreleased version id.
export async function remainingByVersion(as, key) {
  const issues = await search(as, `project = ${quoted(key)} AND statusCategory != Done AND fixVersion in unreleasedVersions()`, ['fixVersions']);
  const counts = {};
  for (const i of issues) for (const v of i.fields.fixVersions || []) counts[v.id] = (counts[v.id] || 0) + 1;
  return counts;
}

export async function displayName(accountId) {
  try {
    const u = await call('app', route`/rest/api/3/user?accountId=${accountId}`);
    return u.displayName || accountId;
  } catch {
    return accountId;
  }
}
