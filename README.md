# Odds

Release forecasts for Jira that keep score of themselves.

Most release dates are a guess, and nobody checks afterwards whether the guess was any good. Odds gives every unreleased Jira version a probability of shipping on time, then keeps score: of its own numbers and of the forecasts people on the team make. It is for software teams and the people who plan their releases.

Built on Atlassian Forge for Codegeist 2026, category Apps for Software Teams.

## What it does

For every unreleased version with a release date, Odds shows:

- **the chance it ships on time**, from 5,000 simulations of how many issues the team actually finished per week over the last 12 weeks;
- **the open work ahead of it**, counting earlier versions the same team must finish first;
- **the date the model is 85% sure of**, and **how many issues to drop** to reach an 80% chance;
- **how well the model did on this team's own history**: it replays itself on the past 26 weeks and shows "when it said 70%, it happened 65% of the time".

People record their own forecasts on the page or in Rovo chat. When a version ships or its date passes, a **forecast ledger** scores everyone, the model included, with the Brier score, and compares each forecaster with always guessing the base rate.

## Try it (for judges)

1. Open the [installation link](https://developer.atlassian.com/console/install/e9d0f2eb-cb36-443a-a43c-3e5359d1a1c0?signature=AYABeHFjyxSXDASfrutpKiYLyLkAAAADAAdhd3Mta21zAEthcm46YXdzOmttczp1cy13ZXN0LTI6NzA5NTg3ODM1MjQzOmtleS83MDVlZDY3MC1mNTdjLTQxYjUtOWY5Yi1lM2YyZGNjMTQ2ZTcAuAECAQB4CxqLTo9l4lqXuFjNim1xJM%2Bp%2F3TVP9xHS2BrU5DRRucBL6%2BHB6IcT2W5B6PYJtfwSgAAAH4wfAYJKoZIhvcNAQcGoG8wbQIBADBoBgkqhkiG9w0BBwEwHgYJYIZIAWUDBAEuMBEEDFYEFTpntWYOhX%2BLDwIBEIA7t7oDfDaRrRCxVKZubC4B7RA97rAkfVk%2FnBHm30DkUpGgmZO5LjiMRcEQKdQr%2F8NGA4JfBbz7veBJfCoAB2F3cy1rbXMAS2Fybjphd3M6a21zOmV1LXdlc3QtMTo3MDk1ODc4MzUyNDM6a2V5LzQ2MzBjZTZiLTAwYzMtNGRlMi04NzdiLTYyN2UyMDYwZTVjYwC4AQICAHi9bVMAkme4qVQX1fQHo6ePw3H40A7cGfz7yrmSfBWMXgFFUfSUfE0TtKWq%2BEgaVIIXAAAAfjB8BgkqhkiG9w0BBwagbzBtAgEAMGgGCSqGSIb3DQEHATAeBglghkgBZQMEAS4wEQQMA8HAfzMzNyXQzYniAgEQgDsRW2ABoyiQYKniXglzhfW9UWoWrX6FhadL5gn6JMbPYOXHZa7oZ%2B4S0cAL2Sns33x%2F8xHUQye65iXv8wAHYXdzLWttcwBLYXJuOmF3czprbXM6dXMtZWFzdC0xOjcwOTU4NzgzNTI0MzprZXkvNmMxMjBiYTAtNGNkNS00OTg1LWI4MmUtNDBhMDQ5NTJjYzU3ALgBAgIAeDYASx0XCjkny4iLV6vz%2BKtEGSGT6kdt0QRpkn6D%2FlVEAbS4b6dRAYV%2FLK6Q23vA0jsAAAB%2BMHwGCSqGSIb3DQEHBqBvMG0CAQAwaAYJKoZIhvcNAQcBMB4GCWCGSAFlAwQBLjARBAxHOKip3ek9xrrZpT8CARCAO%2FH4QqO82%2FBmgzDOvCFDwMa2qz3D%2Bz473b85tV%2FO%2BOLZBDWbyywsCEuX2XEQqNiU3VnmEBFasYJJBAE8AgAAAAAMAAAQAAAAAAAAAAAAAAAAAE%2FpCFt%2FzOqiHQxwwDMtDBH%2F%2F%2F%2F%2FAAAAAQAAAAAAAAAAAAAAAQAAADLNUKKBfQI%2F05fz3rXAMcYPCOFtH5XytcSkaJTEAiq%2FXzrou7wyReYXvgtZGjHN4DdcID2Abams%2FOQltwK%2FXi3jesk%3D&product=jira), pick your Atlassian site and confirm. It installs into Jira; no configuration is needed.
2. Open any Jira software project and choose **Odds** under **Apps** in the project sidebar.
3. **New project, no history?** Odds says so and shows a clearly labelled sample team, so you can see the forecast, the replay check and the chart straight away. Your own numbers appear once issues in the project are resolved.
4. **Test the ledger in under a minute:** in the project, create a version (Releases; in a team-managed project turn on Releases first in Project settings, Features) with a release date a week from now. On the Odds page, pick that version under "Add your forecast", enter for example `70` and click **Record forecast**. It appears under "Waiting to be scored". Now release the version in Jira (Releases, then Release) and reload Odds: the forecast is scored and you appear in the ledger with your Brier score.
5. **Rovo agent:** open Rovo chat, choose the **Odds** agent and ask "Which versions in project KEY are at risk?" (use your project key). To record a forecast, say "I think VERSION in project KEY has a 60% chance to ship on time"; Rovo asks you to confirm before anything is saved. Rovo must be available on the site.

Odds only reads Jira. It never changes issues or versions.

## How the forecast works

- **Throughput, not estimates.** Odds counts issues resolved per week over the last 12 full weeks. It needs no story points.
- **Monte Carlo.** Each of 5,000 runs draws a past week at random until the open work is done. The share of runs that finish before the release date is the chance on time; partial weeks count by the part left.
- **One team, many versions.** Unreleased versions are taken in release-date order, and each one waits for the open work in the versions before it.
- **What would help.** The 85% date is the 85th percentile of the runs. "Drop N issues" is found by binary search for the smallest cut that gives at least an 80% chance.
- **Replay check.** At each of the past 26 weeks, the model forecasts the next 4 weeks from the 12 before them, then the outcome is compared. The result is a reliability table and a Brier score (0 is perfect, 0.25 is a coin flip).
- **The ledger.** A forecast is a hit if the version is released on or before the release date it was made for, and a miss once that date has passed. A person counts once per version per day, the latest entry winning. The model records its own forecast once a week, so it is scored like everyone else.

The same idea of forecasting from throughput is used by other tools. What Odds adds is that it checks itself against the team's own history and keeps score of people and the model on the same scale.

## Built on Forge

| Module | What it does |
|---|---|
| `jira:projectPage` (UI Kit) | The Odds page: headline, release table, throughput chart, replay check, ledger, forecast form |
| `rovo:agent` with three `action`s | Odds agent in Rovo chat: get-forecast, record-forecast (asks for confirmation), get-ledger |
| `rovo:mcp` | Exposes get-forecast and get-ledger as MCP tools (Preview) |
| `scheduledTrigger` (daily) | Scores due forecasts and records the model's weekly forecast |

Jira data is read through the REST API (`/rest/api/3/search/jql`, project versions); forecasts live in Forge key-value storage. Scopes: `read:jira-work`, `read:jira-user`, `storage:app`. The app makes no calls outside Atlassian.

## Limits

- It counts issues, not their size. If big and small issues are mixed differently in the future, the numbers will be off, and the replay check is how you notice.
- It assumes the next weeks look like the last 12. A holiday, a new team member or a reorganisation breaks that.
- It treats each project as one team.

## Develop

```
npm install
npm test          # model tests, no Jira needed
forge deploy
forge install     # pick a Jira site
```

The model is plain JavaScript in `src/model.js` with no Forge imports, so it is tested directly.

## Privacy

Odds stores only forecasts and the account IDs of the people who made them, in Atlassian-hosted Forge storage, and sends nothing outside Atlassian. See [PRIVACY.md](PRIVACY.md).

## How this was built

An AI model, Claude Opus 5.5 by Anthropic, running as an agent in Claude Code, proposed several app ideas. The human entrant chose this one. The agent wrote the code, tests and documents; the human ran the steps that need a person, such as installing the app in Jira and testing it there. This project is not affiliated with Anthropic or Atlassian.

## License

MIT
