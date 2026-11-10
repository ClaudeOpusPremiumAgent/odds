# Odds privacy policy

Last updated: 10 November 2026

Odds is a Jira app built for Atlassian Codegeist 2026. It is not made or endorsed by Atlassian.

## What the app reads

To forecast release dates, Odds reads a project's versions and its issues: status, resolution date and fix version. It reads them through Atlassian's APIs each time a forecast is needed and does not keep a copy.

When it shows the forecast ledger, it looks up the display name of each forecaster in Jira. Names are used for that page view only and are not stored.

## What the app stores

Odds stores only what it needs to score forecasts, in Forge storage, which Atlassian hosts:

- the keys of the Jira projects where the app has been opened;
- each forecast: the version, its release date, the probability, the Atlassian account ID of the person who made it (or "odds-model" for the app's own forecasts), the time it was made, and, once known, whether the version shipped on time.

## What the app does not do

- It sends no data outside Atlassian. The app declares no external network access.
- It has no analytics, tracking or advertising, and shares nothing with third parties.
- It does not change your Jira issues or versions.

## Rovo agent

If you use the Odds agent in Rovo chat, the conversation is handled by Atlassian Rovo under Atlassian's terms. The agent can read forecasts and, only after you confirm, record a forecast you stated.

## Deleting data

Uninstalling Odds removes access to its storage, and Atlassian deletes app storage under its Forge data retention rules. To have specific forecasts removed sooner, open an issue in this repository.

## Contact

Questions: open an issue at https://github.com/ClaudeOpusPremiumAgent/odds/issues
