import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api';
import { CodeEditor } from '../components/CodeEditor';
import { PageHead } from '../components/ui';
import questions from '../data/interviewGuideQuestions.json';
import { interviewCookbook } from '../data/interviewCookbook';

type GuideQuestion = (typeof questions)[number];
interface RunResult { status: string; stdout: string; error?: string; message?: string }

export function InterviewGuide() {
  const { track = 'python' } = useParams();
  const [search, setSearch] = useState('');
  const [subject, setSubject] = useState('Python');
  const [section, setSection] = useState('');
  const [difficulty, setDifficulty] = useState('');
  const [kind, setKind] = useState('');
  const [limit, setLimit] = useState(40);
  const [quick, setQuick] = useState(false);
  const [exampleId, setExampleId] = useState(interviewCookbook[0].id);
  const [code, setCode] = useState(interviewCookbook[0].code);
  const [stdin, setStdin] = useState('');
  const [result, setResult] = useState<RunResult | null>(null);
  const [running, setRunning] = useState(false);
  const [runError, setRunError] = useState('');
  const example = interviewCookbook.find((item) => item.id === exampleId) ?? interviewCookbook[0];
  const subjects = [...new Set(questions.map((item) => item.subject))];
  const sections = [...new Set(questions.filter((item) => !subject || item.subject === subject).map((item) => item.section))];
  const filtered = useMemo(() => questions.filter((item) => {
    const text = `${item.question} ${item.answer} ${item.section} ${item.subject}`.toLowerCase();
    return (!search || text.includes(search.toLowerCase())) && (!subject || item.subject === subject) &&
      (!section || item.section === section) && (!difficulty || item.difficulty === difficulty) && (!kind || item.kind === kind);
  }), [search, subject, section, difficulty, kind]);
  const visible = filtered.slice(0, limit);
  const groups = new Map<string, GuideQuestion[]>();
  visible.forEach((item) => groups.set(item.section, [...(groups.get(item.section) ?? []), item]));

  const select = (label: string, value: string, set: (value: string) => void, options: string[]) => (
    <label className="field guide-filter"><span>{label}</span><select className="input" value={value} onChange={(event) => { set(event.target.value); setLimit(40); }}>
      <option value="">All</option>{options.map((option) => <option key={option} value={option}>{option}</option>)}
    </select></label>
  );

  async function runExample() {
    setRunning(true); setRunError(''); setResult(null);
    try {
      const output = await api<RunResult>(`/tracks/${track}/interview/${example.id}/run`, { method: 'POST', body: { code, stdin } });
      setResult(output);
    } catch (error) {
      setRunError(error instanceof Error ? error.message : 'Could not reach the isolated Python runner.');
    } finally { setRunning(false); }
  }

  return <div className="page">
    <PageHead title="Complete Interview Guide">
      <p>409 concise questions and answer notes drawn from the supplied guide. The guide’s algorithm and data-structure problem section is omitted; this library focuses on Python, SQL, systems, software engineering, output tracing, and project discussions.</p>
      <div className="row"><Link className="btn" to={`/t/${track}/interview-glance`}>Python Coding Glance</Link><Link className="btn primary" to={`/t/${track}/mock-interview`}>Start a Mock Interview</Link><Link className="btn" to={`/t/${track}/trace-bench`}>Trace Bench</Link><span className="chip">{questions.length} questions</span></div>
    </PageHead>

    <section className="panel guide-intro">
      <div><span className="eyebrow">HOW TO ANSWER</span><h2>Define it, demonstrate it, name the trade-off.</h2></div>
      <ol><li>Give the direct definition or behavior.</li><li>Use a small example or trace a concrete input.</li><li>State the relevant edge case, limitation, or implementation detail.</li><li>For code, explain the simple approach, its complexity, and a clearer or faster alternative.</li></ol>
      <p className="small muted">Answers are concise study notes authored for this library; use the links and examples to deepen anything you want to explain in more detail.</p>
    </section>

    <section className="panel code-clinic">
      <div className="row between"><div><span className="eyebrow">CODE CLINIC</span><h2>Read, edit, run, compare</h2><p className="small muted">Runnable Python snippets from the guide execute in the isolated runner. SQL remains a reference example because there is no SQL database attached.</p></div><span className="chip">{interviewCookbook.length} examples</span></div>
      <div className="filters guide-filters">
        <label className="field clinic-select"><span>Example</span><select className="input" value={exampleId} onChange={(event) => { const next = interviewCookbook.find((item) => item.id === event.target.value)!; setExampleId(next.id); setCode(next.code); setResult(null); }}>
          {interviewCookbook.map((item) => <option key={item.id} value={item.id}>{item.title} · {item.language.toUpperCase()}</option>)}
        </select></label>
        <span className="chip">{example.topic}</span>
      </div>
      <p>{example.explanation}</p>
      {example.language === 'python' ? <>
        <CodeEditor ariaLabel="Code Clinic Python editor" value={code} onChange={setCode} onRun={() => void runExample()} onSubmit={() => void runExample()} />
        <label className="field"><span>Standard input (optional)</span><textarea className="input scratch-input" value={stdin} onChange={(event) => setStdin(event.target.value)} /></label>
        <div className="row"><button className="btn primary" disabled={running} onClick={() => void runExample()}>{running ? 'Running in sandbox…' : 'Run Python example'}</button>{example.expected && <span className="small muted">Sample output: <code>{example.expected.trimEnd()}</code></span>}</div>
        {runError && <div className="alert error" role="alert">{runError}</div>}
        {result && <div className={`alert ${result.error ? 'error' : 'info'}`}><strong>{result.error ? 'Execution stopped' : 'Execution output'}</strong>{result.error ? result.error : <><pre className="glance-output">{result.stdout || '(no output)'}</pre><p className="small">{result.status !== 'ok' ? result.message : example.expected ? result.stdout.trimEnd() === example.expected.trimEnd() ? 'Output matches the sample.' : 'Output differs from the sample; inspect your changes and input.' : 'The code ran in the isolated Python runner.'}</p></>}</div>}
      </> : <div className="alert info"><strong>SQL reference snippet</strong><pre className="glance-code">{code}</pre><p>Run this against a real test database using your driver’s placeholder syntax.</p></div>}
    </section>

    <div className="row between"><div><h2>Questions</h2><p className="small muted">Showing {visible.length} of {filtered.length} matches.</p></div><button className="btn sm" aria-pressed={quick} onClick={() => setQuick(!quick)}>{quick ? 'Quick answers: on' : 'Quick answers: off'}</button></div>
    <div className="filters guide-filters" role="search" aria-label="Filter interview guide questions">
      <label className="field glance-search"><span>Search</span><input className="input" type="search" placeholder="Search questions and answers…" value={search} onChange={(event) => { setSearch(event.target.value); setLimit(40); }} /></label>
      {select('Area', subject, (value) => { setSubject(value); setSection(''); }, subjects)}
      {select('Topic', section, setSection, sections)}
      {select('Level', difficulty, setDifficulty, ['beginner', 'intermediate', 'advanced'])}
      {select('Question type', kind, setKind, ['concept', 'output-trace', 'project'])}
    </div>

    {filtered.length === 0 && <div className="empty">No guide questions match these filters.</div>}
    <div className="guide-groups">{[...groups.entries()].map(([topic, items]) => <section className="panel guide-group" key={topic}>
      <div className="guide-group-head"><h2>{topic}</h2><span className="chip">{filtered.filter((item) => item.section === topic).length}</span></div>
      <div className="guide-question-list">{items.map((item) => <details className="guide-question" key={item.id}>
        <summary><span className="guide-q-number">{String(item.sectionNumber).padStart(2, '0')}.{item.number}</span><span className="grow">{item.question}</span><span className="chip">{item.difficulty}</span></summary>
        <div className="guide-answer"><strong>{quick ? 'Quick answer' : 'Interview answer'}</strong><p>{item.answer}</p>{!quick && <p className="small muted">Support the core idea with one example and an edge case or trade-off.</p>}</div>
      </details>)}</div>
    </section>)}</div>
    {visible.length < filtered.length && <button className="btn" onClick={() => setLimit((current) => current + 40)}>Load 40 more questions</button>}
  </div>;
}
