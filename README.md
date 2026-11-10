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

Installation link: coming with the Codegeist submission.

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
