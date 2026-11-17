---
name: odds
description: Answer "will this Jira version ship on time?" with calibrated odds from the Odds Forge app over MCP. Use when someone asks about release dates, versions at risk, what to cut, or how good a team's forecasts have been.
---

# Odds: release odds from Jira

Odds runs a Monte Carlo simulation on how many issues a Jira project actually finished per week. It also keeps a ledger that scores people's forecasts and the model's own. This skill calls its two MCP tools and explains what they return.

## Setup

1. Install the Odds Forge app on your Atlassian site.
2. A site admin opens Atlassian Administration > Apps > Sites > *your site* > Connected apps > Odds and turns on **Expose tools to MCP-compatible apps**.
3. Add the remote MCP server `https://mcp.atlassian.com/forge/e9d0f2eb-cb36-443a-a43c-3e5359d1a1c0` to your client, then approve the Atlassian consent screen for your site. For example, in Claude Code:
   `claude mcp add --transport http odds https://mcp.atlassian.com/forge/e9d0f2eb-cb36-443a-a43c-3e5359d1a1c0`, then `/mcp` and choose Authenticate.

## Tools

- `get-forecast` takes `projectKey` (required) and `versionName` (optional). For each unreleased version it returns:
  - `chanceOnTime`;
  - `openIssues`, and `openIssuesIncludingEarlierVersions`, because one team works through versions in release-date order;
  - `eightyFivePercentSureBy`;
  - `issuesToDropFor80PercentChance`;
  - `weeklyThroughputLast12Weeks`;
  - `modelBacktestOnThisTeam`, which says how often things happened when the model, replayed on this team's last 26 weeks, gave each chance.
- `get-ledger` takes `projectKey`. It returns each forecaster's Brier score and the Brier score of always saying the base rate.

## How to answer

- Lead with the chance on time for the version the user cares about, then the open work ahead of it.
- Then give the date the model is 85% sure of, and the cut that would reach 80%.
- Then say how far to trust the numbers, in the form "when it said 70%, it happened 65% of the time".
- If the result has `sampleTeam`, say first that the numbers are for a made-up sample team because the project has no finished work in the last 12 weeks.
- Never invent a number the tools did not return. If a version has no release date or no open issues, report the tool's `note`.
- In the ledger, lower Brier is better. A forecaster adds value only if their Brier is below the base-rate one. While every resolved forecast has had the same outcome, the base-rate score is not shown, because it would be hindsight.
- The tools only read. To record a forecast, use the Odds page in Jira or the Odds agent in Rovo chat; both ask for confirmation first.
