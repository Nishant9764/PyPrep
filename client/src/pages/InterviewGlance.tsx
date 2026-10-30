import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, useApi } from '../api';
import { CodeEditor } from '../components/CodeEditor';
import { ErrorBox, Loading, PageHead } from '../components/ui';
import questions from '../data/interviewQuestions.json';

type InterviewQuestion = (typeof questions)[number];
interface CodeApproach { name: string; code: string; tradeoff: string; complexity: string }
interface ReviewState {
  item: string;
  completed: boolean;
  bookmarked: boolean;
  confidence: number | null;
  lastReviewedAt: string | null;
  draft: string | null;
}
interface RunFeedback { status: string; stdout: string; error?: string; message?: string }

export function InterviewGlance() {
  const { track = 'python' } = useParams();
  const { data, error, loading, reload, setData } = useApi<{ items: ReviewState[] }>(`/tracks/${track}/progress/interview`);
  const [area, setArea] = useState<'Python' | 'SQL'>('Python');
  const [showSql, setShowSql] = useState(false);
  const [search, setSearch] = useState('');
  const [topic, setTopic] = useState('');
  const [difficulty, setDifficulty] = useState('');
  const [experience, setExperience] = useState('');
  const [kind, setKind] = useState('');
  const [status, setStatus] = useState('');
  const [quick, setQuick] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [approachIndexes, setApproachIndexes] = useState<Record<string, number>>({});
  const [openQuestions, setOpenQuestions] = useState<Set<string>>(() => new Set());
  const [inputs, setInputs] = useState<Record<string, string>>({});
  const [runs, setRuns] = useState<Record<string, RunFeedback>>({});
  const [running, setRunning] = useState<string | null>(null);
  const progress = useMemo(() => new Map((data?.items ?? []).map((item) => [item.item, item])), [data]);
  const topics = [...new Set(questions.filter((q) => q.area === area).map((q) => q.topic))];
  const filtered = questions.filter((q) => {
    if (q.area !== area) return false;
    const p = progress.get(q.id);
    const text = `${q.title} ${q.pattern} ${q.topic} ${q.code}`.toLowerCase();
    return (!search || text.includes(search.toLowerCase())) && (!topic || q.topic === topic) &&
      (!difficulty || q.difficulty === difficulty) && (!experience || q.experience === experience) &&
      (!kind || q.kind === kind) && (!status || (status === 'saved' ? p?.bookmarked : status === 'revised' ? p?.completed : !p?.completed));
  });

  async function update(item: InterviewQuestion, changes: Partial<ReviewState> & { reviewed?: boolean }) {
    setSaveError('');
    try {
      const saved = await api<ReviewState>(`/tracks/${track}/progress/interview/${item.id}`, { method: 'PUT', body: changes });
      setData((current) => ({ items: [...(current?.items ?? []).filter((row) => row.item !== item.id), saved] }));
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Could not save revision progress.');
    }
  }

  async function execute(item: InterviewQuestion, submit: boolean) {
    const code = drafts[item.id] ?? progress.get(item.id)?.draft ?? item.code;
    setRunning(item.id); setSaveError('');
    try {
      const result = await api<RunFeedback>(`/tracks/${track}/interview/${item.id}/run`, { method: 'POST', body: { code, stdin: inputs[item.id] ?? '' } });
      setRuns((current) => ({ ...current, [item.id]: result }));
      if (submit) await update(item, { draft: code, completed: true, reviewed: true });
    } catch (e) {
      setRuns((current) => ({ ...current, [item.id]: { status: 'error', stdout: '', error: e instanceof Error ? e.message : 'Could not reach the isolated runner.' } }));
    } finally { setRunning(null); }
  }

  const select = (label: string, value: string, set: (value: string) => void, options: string[]) => (
    <label className="field glance-filter"><span>{label}</span><select className="input" value={value} onChange={(event) => set(event.target.value)}>
      <option value="">All</option>{options.map((option) => <option key={option} value={option}>{option}</option>)}
    </select></label>
  );

  return <div className="page">
    <PageHead title="Interview Glance">
      <p>Python coding questions with working solutions, expected results, edge cases, and quick explanations you can say aloud. SQL revision is available as an optional section.</p>
      <div className="row"><Link className="btn primary" to={`/t/${track}/mock-interview`}>Start a Mock Interview</Link><Link className="btn" to={`/t/${track}/trace-bench`}>Open Trace Bench</Link><Link className="btn" to={`/t/${track}/interview-guide`}>Complete Interview Guide</Link><span className="small muted">Guided dry runs and 400+ questions from the supplied guide.</span></div>
    </PageHead>

    <section className="glance-banner panel">
      <div><span className="eyebrow">LAST-MINUTE REVISION</span><h2>Remember the pattern. Explain the trade-off.</h2><p>Filter the bank, reveal full solutions when you need them, and mark confidence so your next revision is focused.</p></div>
      <div className="facts"><div className="fact"><b>{questions.filter((q) => q.area === area).length}</b><span>{area} questions</span></div><div className="fact"><b>{(data?.items ?? []).filter((i) => questions.some((q) => q.area === area && q.id === i.item && i.completed)).length}</b><span>revised</span></div></div>
    </section>

    <div className="row between glance-subject"><div className="row"><span className="chip solved">Python · {questions.filter((q) => q.area === 'Python').length}</span>{area === 'SQL' && <button className="btn sm" onClick={() => { setArea('Python'); setShowSql(false); setTopic(''); setKind(''); }}>Back to Python</button>}</div><button className="btn sm glance-mode" aria-pressed={quick} onClick={() => setQuick(!quick)}>{quick ? 'Quick glance: on' : 'Quick glance: off'}</button></div>
    <section className="panel optional-sql"><div className="row between"><div><span className="eyebrow">OPTIONAL REVISION</span><h2>SQL interview questions</h2><p className="small muted">A separate 50-question reference bank. Python remains the main preparation path.</p></div><button className="btn" aria-expanded={showSql} onClick={() => { const next = !showSql; setShowSql(next); setArea(next ? 'SQL' : 'Python'); setTopic(''); setKind(''); }}>{showSql ? 'Hide SQL section' : 'Open SQL revision · 50 questions'}</button></div></section>

    <div className="filters glance-filters" role="search" aria-label="Filter interview questions">
      <label className="field glance-search"><span>Search</span><input className="input" type="search" placeholder="Question, method, keyword…" value={search} onChange={(e) => setSearch(e.target.value)} /></label>
      {select('Topic', topic, setTopic, topics)}
      {select('Difficulty', difficulty, setDifficulty, ['easy', 'medium', 'hard'])}
      {select('Experience', experience, setExperience, [...new Set(questions.filter((q) => q.area === area).map((q) => q.experience))])}
      {select('Question type', kind, setKind, [...new Set(questions.filter((q) => q.area === area).map((q) => q.kind))])}
      {select('Revision status', status, setStatus, ['revised', 'saved', 'not revised'])}
    </div>

    {error && <ErrorBox error={error} retry={reload} />}{saveError && <div className="alert error" role="alert">{saveError}</div>}
    {loading && !data && <Loading lines={5} />}
    {!loading && filtered.length === 0 && <div className="empty">No {area} questions match these filters. Try clearing a filter or search term.</div>}
    <div className="glance-list">
      {filtered.map((q) => {
        const p = progress.get(q.id);
        const approaches = ('approaches' in q ? q.approaches : []) as CodeApproach[];
        const approach = approaches[approachIndexes[q.id] ?? 0];
        return <article className="glance-card panel" id={q.id} key={q.id}>
          <div className="glance-card-head"><div className="glance-title"><span className="glance-number">{String(q.number).padStart(2, '0')}</span><div><h2>{q.title}</h2><p className="small muted">{q.topic} · {q.pattern}</p></div></div><div className="glance-tags"><span className={`chip ${q.difficulty}`}>{q.difficulty}</span><span className="chip">{q.experience}</span><span className="chip">{q.minutes} min</span>{p?.completed && <span className="chip solved">Revised</span>}</div></div>
          {quick && <p className="glance-answer"><strong>Quick answer:</strong> {q.answer}</p>}
          <details className="glance-details" onToggle={(event) => { const isOpen = event.currentTarget.open; setOpenQuestions((current) => { const next = new Set(current); if (isOpen) next.add(q.id); else next.delete(q.id); return next; }); }}><summary>{quick ? 'Open worked answer and interview notes' : 'Show concise answer, full code, and interview notes'}</summary>
            <div className="glance-detail-grid">
              <section><h3>Interview answer</h3><p>{q.answer}</p><h3>How to walk through it</h3><ol>{q.steps.map((step, i) => <li key={i}>{step}</li>)}</ol></section>
              <section><h3>Full solution</h3>{approaches.length > 1 && <div className="approach-tabs" role="tablist" aria-label={`Approaches for ${q.title}`}>{approaches.map((option, i) => <button key={option.name} className="btn sm" role="tab" aria-selected={(approachIndexes[q.id] ?? 0) === i} onClick={() => { setApproachIndexes((current) => ({ ...current, [q.id]: i })); setDrafts((current) => p?.draft || current[q.id] ? current : ({ ...current, [q.id]: option.code })); }}>{option.name}</button>)}</div>}{approach && <p className="small muted approach-note">{approach.tradeoff} · {approach.complexity}</p>}<pre className="glance-code"><code>{approach?.code ?? q.code}</code></pre><h3>Expected output</h3><pre className="glance-output">{q.expectedOutput}</pre></section>
              <section><h3>Edge case to mention</h3><p>{q.edgeCase}</p><h3>Time-saving cue</h3><p>{q.timeSaver}</p></section>
              <section><h3>Follow-up</h3><p>{q.followUp}</p><h3>Try this next</h3><p>{q.challenge}</p></section>
              {q.area === 'Python' && <section className="glance-practice"><h3>Practice in the editor</h3><p className="small muted">Edit the sample or write your own solution. Code runs in PyPrep’s isolated Python runner.</p>
                {openQuestions.has(q.id) && <CodeEditor ariaLabel={`Python practice editor for ${q.title}`} value={drafts[q.id] ?? p?.draft ?? approach?.code ?? q.code} onChange={(value) => setDrafts((current) => ({ ...current, [q.id]: value }))} onRun={() => void execute(q, false)} onSubmit={() => void execute(q, true)} />}
                <label className="field"><span>Standard input (optional)</span><textarea className="input scratch-input" aria-label={`Standard input for ${q.title}`} value={inputs[q.id] ?? ''} onChange={(e) => setInputs((current) => ({ ...current, [q.id]: e.target.value }))} /></label>
                <div className="row"><button className="btn sm" disabled={running !== null} onClick={() => void execute(q, false)}>{running === q.id ? 'Running…' : 'Run code'}</button><button className="btn sm primary" disabled={running !== null} onClick={() => void execute(q, true)}>{running === q.id ? 'Submitting…' : 'Submit for self-review'}</button></div>
                {runs[q.id] && <div className={`alert ${runs[q.id].error ? 'error' : 'info'}`}><strong>{runs[q.id].error ? 'Run stopped' : 'Run output'}</strong>{runs[q.id].error ? runs[q.id].error : <><pre className="glance-output">{runs[q.id].stdout || '(no output)'}</pre><p className="small">{runs[q.id].status === 'ok' && (runs[q.id].stdout.trimEnd() === q.expectedOutput.trimEnd() ? 'Output matches the sample.' : 'Compare your output with the sample above; your input may differ.')}</p></>}</div>}
              </section>}
              {q.area === 'SQL' && <section><h3>Practice note</h3><p>SQL runs against a database schema and dialect; this sheet has no live database attached. Use the query as a model and adapt table and column names to the interviewer’s schema.</p></section>}
            </div>
          </details>
          <div className="glance-actions">
            <button className={`btn sm ${p?.bookmarked ? 'toggled' : ''}`} aria-pressed={!!p?.bookmarked} onClick={() => void update(q, { bookmarked: !p?.bookmarked })}>{p?.bookmarked ? '★ Saved' : '☆ Save'}</button>
            <button className={`btn sm ${p?.completed ? 'toggled' : ''}`} aria-pressed={!!p?.completed} onClick={() => void update(q, { completed: !p?.completed, reviewed: !p?.completed })}>{p?.completed ? 'Revised ✓' : 'Mark revised'}</button>
            <label className="confidence-control small">Confidence <select className="input" aria-label={`Confidence for ${q.title}`} value={p?.confidence ?? ''} onChange={(e) => void update(q, { confidence: e.target.value ? Number(e.target.value) : null, reviewed: true })}><option value="">Not rated</option>{[1,2,3,4,5].map((n) => <option key={n} value={n}>{n} / 5</option>)}</select></label>
            {p?.lastReviewedAt && <span className="small muted">Last revised {new Date(p.lastReviewedAt).toLocaleDateString()}</span>}
          </div>
        </article>;
      })}
    </div>
    <section className="panel glance-cheats"><div><span className="eyebrow">FAST RECALL</span><h2>{area} time-savers</h2></div>{area === 'Python' ? <div className="cheat-grid">
      <div><code>s[::-1]</code><span>Reverse a sequence</span></div><div><code>dict.fromkeys(items)</code><span>Deduplicate and keep order</span></div><div><code>counts[x] = counts.get(x, 0) + 1</code><span>Count frequencies</span></div><div><code>enumerate(items)</code><span>Values with their indexes</span></div><div><code>zip(a, b)</code><span>Walk sequences together</span></div><div><code>sorted(set(values))</code><span>Distinct sorted values</span></div><div><code>any(...) / all(...)</code><span>Check a condition across items</span></div><div><code>a, b = b, a</code><span>Swap without a temporary</span></div>
    </div> : <div className="cheat-grid"><div><code>WHERE</code><span>Filters rows before grouping</span></div><div><code>HAVING</code><span>Filters groups after aggregation</span></div><div><code>IS NULL</code><span>Tests missing values; never use = NULL</span></div><div><code>DENSE_RANK()</code><span>Rank distinct values without gaps</span></div><div><code>ROW_NUMBER()</code><span>Assign a unique sequence number</span></div><div><code>NOT EXISTS</code><span>Find rows with no related match</span></div><div><code>CASE WHEN</code><span>Build conditional categories</span></div><div><code>PARTITION BY</code><span>Calculate a window within each group</span></div></div>}</section>
  </div>;
}
