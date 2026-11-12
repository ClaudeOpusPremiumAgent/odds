import React, { useEffect, useState } from 'react';
import ForgeReconciler, {
  BarChart, Button, DynamicTable, Form, FormFooter, Heading, Label, Lozenge, SectionMessage,
  Select, Stack, Text, Textfield, useForm,
} from '@forge/react';
import { invoke } from '@forge/bridge';

const pct = (p) => (p === null || p === undefined ? '–' : `${Math.round(p * 100)}%`);
const tone = (p) => (p === null ? 'default' : p >= 0.8 ? 'success' : p >= 0.5 ? 'moved' : 'removed');
const table = (head, rows) => ({
  head: { cells: head.map((h, i) => ({ key: String(i), content: h })) },
  rows: rows.map((r, i) => ({ key: String(i), cells: r.map((c, j) => ({ key: String(j), content: c })) })),
});

const App = () => {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [saved, setSaved] = useState(null);
  const { handleSubmit, register, getFieldId } = useForm();
  const [version, setVersion] = useState(null);

  const load = () => invoke('load').then(setData).catch((e) => setError(e.message));
  useEffect(() => { load(); }, []);

  if (error) return <SectionMessage appearance="error"><Text>{error}</Text></SectionMessage>;
  if (!data) return <Text>Simulating your release dates…</Text>;

  const { forecast, ledger } = data;
  const submit = async (form) => {
    if (!version) return setSaved('Pick a version first.');
    try {
      const e = await invoke('record', { versionId: version.value, probability: form.probability });
      setSaved(`Recorded ${pct(e.p)} for ${e.versionName}. It will be scored when the version ships or ${e.due} passes.`);
      load();
    } catch (err) {
      setSaved(err.message);
    }
  };

  const next = forecast.versions.find((v) => v.probability !== null);
  const worst = [...forecast.calibration.rows].sort((a, b) => Math.abs(b.said - b.happened) - Math.abs(a.said - a.happened))[0];
  const verdict = !worst ? null : Math.abs(worst.said - worst.happened) < 0.1
    ? 'Its stated chances have matched what happened within 10 points.'
    : `Biggest gap: when it said ${pct(worst.said)}, it happened ${pct(worst.happened)}, so read its ${worst.said > worst.happened ? 'high' : 'low'} numbers with care.`;

  return (
    <Stack space="space.300">
      {forecast.sample && (
        <SectionMessage appearance="information" title="You are looking at a sample team">
          <Text>This project has no issues finished in the last 12 weeks, so Odds shows a made-up team to show how it works. Your own numbers appear as soon as issues here are resolved.</Text>
        </SectionMessage>
      )}
      {next && (
        <SectionMessage appearance={next.probability >= 0.8 ? 'success' : next.probability >= 0.5 ? 'warning' : 'error'} title={`${next.name} has a ${pct(next.probability)} chance of shipping by ${next.releaseDate}`}>
          <Text>{next.cutFor80 ? `To get to 80%, drop ${next.cutFor80} of the ${next.ahead} open issues ahead of it, or plan for ${next.sure85Date}, the date this team is 85% likely to make.` : 'It is on track at 80% or better.'}</Text>
        </SectionMessage>
      )}
      <Text>Each unreleased version gets the chance it ships by its release date, simulated 5,000 times from how many issues this team actually finished per week over the last 12 weeks. Versions share one team, so each one waits for the open work in earlier versions. Forecasts from people and from the model are scored when versions ship.</Text>

      <Heading as="h3">Release odds</Heading>
      <DynamicTable {...table(['Version', 'Release date', 'Open issues', 'Incl. earlier versions', 'Chance on time', '85% sure by', 'To reach 80%'],
        forecast.versions.map((v) => [
          v.name, v.releaseDate || 'no date', String(v.remaining), v.ahead === null ? '–' : String(v.ahead),
          v.probability === null ? <Text>{v.reason || '–'}</Text> : <Lozenge appearance={tone(v.probability)}>{pct(v.probability)}</Lozenge>,
          v.sure85Date || '–',
          v.cutFor80 === undefined ? '–' : v.cutFor80 === 0 ? 'on track' : v.cutFor80 >= v.ahead ? 'move the date' : `drop ${v.cutFor80} issues`,
        ]))} />

      <Heading as="h3">Issues finished per week (week starting)</Heading>
      <BarChart data={forecast.throughput.map((n, i) => [forecast.weekLabels[i], n])} xAccessor={0} yAccessor={1} />

      <Heading as="h3">Has this model been right for this team?</Heading>
      {forecast.calibration.rows.length ? (
        <Stack space="space.100">
          <DynamicTable {...table(['Model said', 'Happened', 'Checks'], forecast.calibration.rows.map((r) => [pct(r.said), pct(r.happened), String(r.n)]))} />
          <Text>Replayed on the last 26 weeks of this project: each week, the model forecast the next 4 weeks from the 12 before. {verdict} Brier score {forecast.calibration.brier.toFixed(3)} (0 is perfect, 0.25 is a coin flip).</Text>
        </Stack>
      ) : <Text>Not enough finished work yet to check the model on this team.</Text>}

      <Heading as="h3">Forecast ledger</Heading>
      {ledger.rows.length ? (
        <DynamicTable {...table(['Forecaster', 'Resolved', 'Brier', 'Base-rate Brier', 'Said on average', 'Happened'],
          ledger.rows.map((r) => [r.name, String(r.n), r.brier.toFixed(3), r.baseline === null ? '–' : r.baseline.toFixed(3), pct(r.meanSaid), pct(r.meanHappened)]))} />
      ) : <Text>No forecasts resolved yet. {ledger.open} open.</Text>}
      {ledger.pending.length > 0 && (
        <DynamicTable {...table(['Waiting to be scored', 'Version', 'Said', 'Recorded', 'Scored after'],
          ledger.pending.map((f) => [f.name, f.version, pct(f.p), new Date(f.at).toISOString().slice(0, 16).replace('T', ' '), f.due]))} />
      )}

      <Heading as="h3">Add your forecast</Heading>
      {forecast.recordable.length ? (
      <Form onSubmit={handleSubmit(submit)}>
        <Label labelFor="odds-version">Version</Label>
        <Select inputId="odds-version" options={forecast.recordable.map((v) => ({ label: `${v.name} (${v.releaseDate})`, value: v.id }))} onChange={setVersion} />
        <Label labelFor={getFieldId('probability')}>Your chance it ships by its release date, in %</Label>
        <Textfield {...register('probability', { required: true })} />
        <FormFooter><Button appearance="primary" type="submit">Record forecast</Button></FormFooter>
      </Form>
      ) : <Text>To add a forecast, create a version with a release date on this project's Releases page in Jira. In a team-managed space, turn on Releases first in Space settings, Features.</Text>}
      {saved && <SectionMessage><Text>{saved}</Text></SectionMessage>}
    </Stack>
  );
};

ForgeReconciler.render(<React.StrictMode><App /></React.StrictMode>);
