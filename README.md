# Odds

Release forecasts for Jira that keep score of themselves.

Odds is a Jira app built on Atlassian Forge for Codegeist 2026. For every unreleased version it shows:

- the chance the version ships by its release date, from 5,000 simulations of how many issues the team actually finished per week over the last 12 weeks;
- the open work ahead of it, counting earlier versions the same team must finish first;
- the date the model is 85% sure of, and how many issues to drop to reach an 80% chance;
- how well the model did when replayed on this team's own history ("when it said 70%, it happened 65% of the time").

People can record their own forecasts too. When a version ships or its date passes, a ledger scores everyone, the model included, with the Brier score and compares each forecaster with always guessing the base rate.

## Where it appears

- **Project page** in Jira: the forecast, the replay check, the ledger and a form to add a forecast.
- **Rovo agent "Odds"**: ask whether a version will ship, state your own chance (it asks you to confirm before recording), or ask who forecasts best.
- **MCP tools** `get-forecast` and `get-ledger` for other AI clients.
- **Daily job**: scores forecasts that are due and records the model's own forecast once a week.

## Install

1. Open the [installation link](https://developer.atlassian.com/console/install/e9d0f2eb-cb36-443a-a43c-3e5359d1a1c0?signature=AYABeHFjyxSXDASfrutpKiYLyLkAAAADAAdhd3Mta21zAEthcm46YXdzOmttczp1cy13ZXN0LTI6NzA5NTg3ODM1MjQzOmtleS83MDVlZDY3MC1mNTdjLTQxYjUtOWY5Yi1lM2YyZGNjMTQ2ZTcAuAECAQB4CxqLTo9l4lqXuFjNim1xJM%2Bp%2F3TVP9xHS2BrU5DRRucBL6%2BHB6IcT2W5B6PYJtfwSgAAAH4wfAYJKoZIhvcNAQcGoG8wbQIBADBoBgkqhkiG9w0BBwEwHgYJYIZIAWUDBAEuMBEEDFYEFTpntWYOhX%2BLDwIBEIA7t7oDfDaRrRCxVKZubC4B7RA97rAkfVk%2FnBHm30DkUpGgmZO5LjiMRcEQKdQr%2F8NGA4JfBbz7veBJfCoAB2F3cy1rbXMAS2Fybjphd3M6a21zOmV1LXdlc3QtMTo3MDk1ODc4MzUyNDM6a2V5LzQ2MzBjZTZiLTAwYzMtNGRlMi04NzdiLTYyN2UyMDYwZTVjYwC4AQICAHi9bVMAkme4qVQX1fQHo6ePw3H40A7cGfz7yrmSfBWMXgFFUfSUfE0TtKWq%2BEgaVIIXAAAAfjB8BgkqhkiG9w0BBwagbzBtAgEAMGgGCSqGSIb3DQEHATAeBglghkgBZQMEAS4wEQQMA8HAfzMzNyXQzYniAgEQgDsRW2ABoyiQYKniXglzhfW9UWoWrX6FhadL5gn6JMbPYOXHZa7oZ%2B4S0cAL2Sns33x%2F8xHUQye65iXv8wAHYXdzLWttcwBLYXJuOmF3czprbXM6dXMtZWFzdC0xOjcwOTU4NzgzNTI0MzprZXkvNmMxMjBiYTAtNGNkNS00OTg1LWI4MmUtNDBhMDQ5NTJjYzU3ALgBAgIAeDYASx0XCjkny4iLV6vz%2BKtEGSGT6kdt0QRpkn6D%2FlVEAbS4b6dRAYV%2FLK6Q23vA0jsAAAB%2BMHwGCSqGSIb3DQEHBqBvMG0CAQAwaAYJKoZIhvcNAQcBMB4GCWCGSAFlAwQBLjARBAxHOKip3ek9xrrZpT8CARCAO%2FH4QqO82%2FBmgzDOvCFDwMa2qz3D%2Bz473b85tV%2FO%2BOLZBDWbyywsCEuX2XEQqNiU3VnmEBFasYJJBAE8AgAAAAAMAAAQAAAAAAAAAAAAAAAAAE%2FpCFt%2FzOqiHQxwwDMtDBH%2F%2F%2F%2F%2FAAAAAQAAAAAAAAAAAAAAAQAAADLNUKKBfQI%2F05fz3rXAMcYPCOFtH5XytcSkaJTEAiq%2FXzrou7wyReYXvgtZGjHN4DdcID2Abams%2FOQltwK%2FXi3jesk%3D&product=jira), pick your Atlassian site and confirm. It installs into Jira.
2. Open any Jira project with unreleased versions that have release dates, then choose **Apps → Odds** in the project sidebar.
3. For the agent, open Rovo chat and choose **Odds**. Rovo must be available on the site.

Odds simulates from the issues resolved in the last 12 weeks, so a project with a few months of history gives the most useful numbers. If nothing was resolved in that window, it says so instead of guessing.

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
