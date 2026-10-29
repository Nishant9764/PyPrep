import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, useApi } from '../api';
import { ErrorBox, Loading, PageHead } from '../components/ui';
import questions from '../data/interviewQuestions.json';

type InterviewQuestion = (typeof questions)[number];
interface ReviewState {
  item: string;
  completed: boolean;
  bookmarked: boolean;
  confidence: number | null;
  lastReviewedAt: string | null;
}

export function InterviewGlance() {
  const { track = 'python' } = useParams();
  const { data, error, loading, reload, setData } = useApi<{ items: ReviewState[] }>(`/tracks/${track}/progress/interview`);
  const [area, setArea] = useState<'Python' | 'SQL'>('Python');
  const [search, setSearch] = useState('');
  const [topic, setTopic] = useState('');
  const [difficulty, setDifficulty] = useState('');
  const [experience, setExperience] = useState('');
  const [kind, setKind] = useState('');
  const [status, setStatus] = useState('');
  const [quick, setQuick] = useState(false);
  const [saveError, setSaveError] = useState('');
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

  const select = (label: string, value: string, set: (value: string) => void, options: string[]) => (
    <label className="field glance-filter"><span>{label}</span><select className="input" value={value} onChange={(event) => set(event.target.value)}>
      <option value="">All</option>{options.map((option) => <option key={option} value={option}>{option}</option>)}
    </select></label>
  );

  return <div className="page">
    <PageHead title="Interview Glance">
      <p>100 compact Python and SQL interview patterns with working solutions, expected results, edge cases, and a quick explanation you can say aloud.</p>
      <div className="row"><Link className="btn primary" to={`/t/${track}/trace-bench`}>Open Trace Bench</Link><span className="small muted">Guided dry runs for loops, strings, collections, and common patterns.</span></div>
    </PageHead>

    <section className="glance-banner panel">
      <div><span className="eyebrow">LAST-MINUTE REVISION</span><h2>Remember the pattern. Explain the trade-off.</h2><p>Filter the bank, reveal full solutions when you need them, and mark confidence so your next revision is focused.</p></div>
      <div className="facts"><div className="fact"><b>{questions.filter((q) => q.area === area).length}</b><span>{area} questions</span></div><div className="fact"><b>{(data?.items ?? []).filter((i) => questions.some((q) => q.area === area && q.id === i.item && i.completed)).length}</b><span>revised</span></div></div>
    </section>

    <div className="tabs" role="tablist" aria-label="Interview subject">
      {(['Python', 'SQL'] as const).map((subject) => <button key={subject} className="tab" role="tab" aria-selected={area === subject} onClick={() => { setArea(subject); setTopic(''); setKind(''); }}>{subject} <span className="chip">50</span></button>)}
      <button className="btn sm glance-mode" aria-pressed={quick} onClick={() => setQuick(!quick)}>{quick ? 'Quick glance: on' : 'Quick glance: off'}</button>
    </div>

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
        return <article className="glance-card panel" id={q.id} key={q.id}>
          <div className="glance-card-head"><div className="glance-title"><span className="glance-number">{String(q.number).padStart(2, '0')}</span><div><h2>{q.title}</h2><p className="small muted">{q.topic} · {q.pattern}</p></div></div><div className="glance-tags"><span className={`chip ${q.difficulty}`}>{q.difficulty}</span><span className="chip">{q.experience}</span><span className="chip">{q.minutes} min</span>{p?.completed && <span className="chip solved">Revised</span>}</div></div>
          {quick && <p className="glance-answer"><strong>Quick answer:</strong> {q.answer}</p>}
          <details className="glance-details"><summary>{quick ? 'Open worked answer and interview notes' : 'Show concise answer, full code, and interview notes'}</summary>
            <div className="glance-detail-grid">
              <section><h3>Interview answer</h3><p>{q.answer}</p><h3>How to walk through it</h3><ol>{q.steps.map((step, i) => <li key={i}>{step}</li>)}</ol></section>
              <section><h3>Full solution</h3><pre className="glance-code"><code>{q.code}</code></pre><h3>Expected output</h3><pre className="glance-output">{q.expectedOutput}</pre></section>
              <section><h3>Edge case to mention</h3><p>{q.edgeCase}</p><h3>Time-saving cue</h3><p>{q.timeSaver}</p></section>
              <section><h3>Follow-up</h3><p>{q.followUp}</p><h3>Try this next</h3><p>{q.challenge}</p></section>
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
