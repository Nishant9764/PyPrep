import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, ApiError, useApi } from '../api';
import { CodeEditor } from '../components/CodeEditor';
import { DiagnosisPanel } from '../components/DiagnosisPanel';
import { Markdown } from '../components/Markdown';
import { TestResults } from '../components/TestResults';
import { DifficultyChip, ErrorBox, Loading, StatusChip } from '../components/ui';
import { describeCall, pyRepr } from '../pyrepr';
import type { QuestionPayload, RunResult, SubmitResult } from '../types';

type Tab = 'problem' | 'hints' | 'solution' | 'history';
interface Attempt {
  _id: string;
  code: string;
  passed: boolean;
  passedCount: number;
  total: number;
  createdAt: string;
  hintsUsed: number;
}

export function Problem() {
  const { slug = '' } = useParams();
  return <ProblemInner key={slug} slug={slug} />;
}

function ProblemInner({ slug }: { slug: string }) {
  const { track = 'python' } = useParams();
  const base = `/tracks/${track}/questions/${slug}`;
  const { data, error, loading, reload, setData } = useApi<QuestionPayload>(base);

  const [code, setCode] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('problem');
  const [busy, setBusy] = useState<null | 'run' | 'submit'>(null);
  const [run, setRun] = useState<RunResult | null>(null);
  const [submit, setSubmit] = useState<SubmitResult | null>(null);
  const [message, setMessage] = useState<{ kind: 'error' | 'info'; text: string } | null>(null);
  const [confirmSolution, setConfirmSolution] = useState(false);
  const [attempts, setAttempts] = useState<Attempt[] | null>(null);
  const [saved, setSaved] = useState<'idle' | 'saving' | 'saved'>('idle');
  const lastSaved = useRef<string | null>(null);

  // Initialise the editor from the saved draft (or the starter code) once the question has loaded.
  useEffect(() => {
    if (data && code === null) {
      const initial = data.progress.draft ?? data.question.starterCode;
      setCode(initial);
      lastSaved.current = initial;
    }
  }, [data, code]);

  // Autosave the draft shortly after the learner stops typing.
  useEffect(() => {
    if (code === null || code === lastSaved.current) return;
    setSaved('saving');
    const t = setTimeout(async () => {
      try {
        await api(`${base}/draft`, { method: 'PUT', body: { code } });
        lastSaved.current = code;
        setSaved('saved');
      } catch {
        setSaved('idle');
      }
    }, 1500);
    return () => clearTimeout(t);
  }, [code, base]);

  const fail = (e: unknown) => setMessage({ kind: 'error', text: e instanceof ApiError ? e.message : 'Something went wrong.' });

  const doRun = async () => {
    if (code === null || busy) return;
    setBusy('run');
    setMessage(null);
    try {
      setRun(await api<RunResult>(`${base}/run`, { method: 'POST', body: { code } }));
      setSubmit(null);
    } catch (e) {
      fail(e);
    } finally {
      setBusy(null);
    }
  };

  const doSubmit = async () => {
    if (code === null || busy) return;
    setBusy('submit');
    setMessage(null);
    try {
      const r = await api<SubmitResult>(`${base}/submit`, { method: 'POST', body: { code } });
      setSubmit(r);
      setRun(null);
      lastSaved.current = code;
      setData((d) => (d ? { ...d, progress: { ...d.progress, status: r.progress.status, attempts: r.progress.attempts, solvedIndependently: r.progress.solvedIndependently } } : d));
      setAttempts(null);
    } catch (e) {
      fail(e);
    } finally {
      setBusy(null);
    }
  };

  // Stable handlers for the editor's keyboard shortcuts.
  const runRef = useRef(doRun);
  const submitRef = useRef(doSubmit);
  runRef.current = doRun;
  submitRef.current = doSubmit;
  const onRun = useCallback(() => void runRef.current(), []);
  const onSubmit = useCallback(() => void submitRef.current(), []);

  const revealHint = async () => {
    setMessage(null);
    try {
      const r = await api<{ index: number; hint: string; hintsRevealed: number }>(`${base}/hint`, { method: 'POST', body: {} });
      setData((d) => (d ? { ...d, question: { ...d.question, hints: [...d.question.hints, r.hint] }, progress: { ...d.progress, hintsRevealed: r.hintsRevealed } } : d));
    } catch (e) {
      fail(e);
    }
  };

  const revealSolution = async () => {
    setMessage(null);
    try {
      const r = await api<{ solution: { code: string; explanation: string } }>(`${base}/solution`, { method: 'POST', body: {} });
      setData((d) => (d ? { ...d, progress: { ...d.progress, solution: r.solution, solutionViewed: true } } : d));
      setConfirmSolution(false);
    } catch (e) {
      setConfirmSolution(false);
      fail(e);
    }
  };

  const toggleBookmark = async () => {
    if (!data) return;
    const on = !data.progress.bookmarked;
    try {
      await api(`${base}/bookmark`, { method: on ? 'PUT' : 'DELETE' });
      setData({ ...data, progress: { ...data.progress, bookmarked: on } });
    } catch (e) {
      fail(e);
    }
  };

  const openTab = async (t: Tab) => {
    setTab(t);
    if (t === 'history' && attempts === null) {
      try {
        setAttempts((await api<{ attempts: Attempt[] }>(`${base}/attempts`)).attempts);
      } catch (e) {
        fail(e);
      }
    }
  };

  if (error) return <div className="page"><ErrorBox error={error} retry={reload} /></div>;
  if (loading || !data || code === null) return <div className="page"><Loading lines={6} /></div>;

  const { question: q, progress: p } = data;
  const result = submit ?? run;

  return (
    <div className="page workspace">
      <div className="row between">
        <div className="stack-sm">
          <p className="small"><Link to={`/t/${track}/practice?topic=${q.topic}`}>Back to the list</Link></p>
          <div className="row">
            <h1 style={{ fontSize: '1.7rem' }}>{q.title}</h1>
            <DifficultyChip d={q.difficulty} />
            {q.kind === 'interview' && <span className="chip interview">Interview</span>}
            <StatusChip s={p.status} />
          </div>
        </div>
        <button className={`btn ${p.bookmarked ? 'toggled' : ''}`} aria-pressed={p.bookmarked} onClick={toggleBookmark}>
          {p.bookmarked ? 'Saved' : 'Save'}
        </button>
      </div>

      <div className="split">
        {/* ---------------- left: problem, hints, solution, history ---------------- */}
        <section className="pane" aria-label="Problem">
          <div className="tabs" role="tablist" aria-label="Problem sections" style={{ padding: '0 0.5rem' }}>
            {(['problem', 'hints', 'solution', 'history'] as Tab[]).map((t) => (
              <button key={t} role="tab" className="tab" aria-selected={tab === t} onClick={() => void openTab(t)}>
                {t === 'problem' ? 'Problem' : t === 'hints' ? `Hints (${p.hintsRevealed}/${q.hintCount})` : t === 'solution' ? 'Solution' : 'My attempts'}
              </button>
            ))}
          </div>
          <div className="pane-body stack" role="tabpanel">
            {tab === 'problem' && (
              <>
                <Markdown variant="compact">{q.prompt}</Markdown>
                <div className="stack-sm">
                  <h3>Examples your code is checked against</h3>
                  {q.visibleTests.map((t, i) => (
                    <div key={i} className="test pass" style={{ borderLeftColor: 'var(--accent)' }}>
                      <div className="kv" style={{ marginTop: 0 }}>
                        <span>{t.program ? 'Run' : 'Call'}</span>
                        <div><code>{describeCall(q.entry, t)}</code></div>
                        {t.stdin !== undefined && (<><span>Input</span><div><pre>{t.stdin}</pre></div></>)}
                        {t.stdout !== undefined && (<><span>Prints</span><div><pre>{t.stdout}</pre></div></>)}
                        {t.expected !== undefined && (<><span>Returns</span><div><code>{pyRepr(t.expected)}</code></div></>)}
                      </div>
                    </div>
                  ))}
                  <p className="small muted">
                    {q.hiddenTestCount} more hidden tests check edge cases when you submit. They are what catches a solution that only works for the examples.
                  </p>
                </div>
                <div className="stack-sm">
                  <h3>Skills this practises</h3>
                  <div className="row">
                    {q.concepts.map((c) => (
                      <Link key={c.id} className="chip" to={`/t/${track}/learn/${c.topic}/${c.lesson}`} title="Open the lesson">{c.title}</Link>
                    ))}
                  </div>
                </div>
              </>
            )}

            {tab === 'hints' && (
              <>
                <p className="muted">Hints get more specific one at a time. Needing hints is fine; they are remembered so your progress reflects how independently you solved it.</p>
                {q.hints.map((h, i) => (
                  <div key={i} className="hint-card">
                    <b>Hint {i + 1}.</b> {h}
                  </div>
                ))}
                {p.hintsRevealed < q.hintCount ? (
                  <button className="btn" onClick={revealHint}>
                    {p.hintsRevealed === 0 ? 'Show the first hint' : `Show hint ${p.hintsRevealed + 1} of ${q.hintCount}`}
                  </button>
                ) : (
                  <p className="small muted">That is every hint. Next step is the solution tab, after an attempt.</p>
                )}
              </>
            )}

            {tab === 'solution' &&
              (p.solution ? (
                <>
                  <div className="alert info">
                    <strong>Read it, then close it and write it from memory</strong>
                    Solutions you reveal count as assisted in your progress, which is how PyPrep tells "I understood this" from "I looked it up".
                  </div>
                  <pre className="solution-code"><code>{p.solution.code}</code></pre>
                  <Markdown variant="compact">{p.solution.explanation}</Markdown>
                  <div className="row">
                    <button className="btn sm" onClick={() => { setCode(p.solution!.code); setTab('problem'); }}>
                      Copy the solution into the editor
                    </button>
                  </div>
                </>
              ) : (
                <div className="stack">
                  <p>
                    The solution unlocks once you have submitted at least one attempt. Struggling with the problem first is what makes the explanation stick.
                  </p>
                  {p.attempts < 1 ? (
                    <div className="alert">Submit an attempt first ({p.attempts} so far).</div>
                  ) : confirmSolution ? (
                    <div className="alert">
                      <strong>Reveal the solution?</strong>
                      It will be recorded as assisted. Have you tried the hints?
                      <div className="row" style={{ marginTop: '0.6rem' }}>
                        <button className="btn primary sm" onClick={revealSolution}>Yes, show it</button>
                        <button className="btn sm" onClick={() => setConfirmSolution(false)}>Not yet</button>
                      </div>
                    </div>
                  ) : (
                    <button className="btn" onClick={() => setConfirmSolution(true)}>Show the solution</button>
                  )}
                </div>
              ))}

            {tab === 'history' && (
              <>
                {attempts === null && <Loading />}
                {attempts?.length === 0 && <div className="empty">No submissions yet.</div>}
                {attempts?.map((a) => (
                  <div key={a._id} className="row between q-link" style={{ cursor: 'default' }}>
                    <div className="stack-sm">
                      <strong>{a.passed ? 'All tests passed' : `${a.passedCount} of ${a.total} tests passed`}</strong>
                      <span className="small muted">{new Date(a.createdAt).toLocaleString()}{a.hintsUsed ? `, ${a.hintsUsed} hint${a.hintsUsed > 1 ? 's' : ''} used` : ''}</span>
                    </div>
                    <button className="btn sm" onClick={() => { setCode(a.code); }}>Load into editor</button>
                  </div>
                ))}
              </>
            )}
          </div>
        </section>

        {/* ---------------- right: editor and results ---------------- */}
        <section className="pane editor-pane" aria-label="Code editor">
          <div className="editor-bar">
            <button className="btn" onClick={onRun} disabled={!!busy}>{busy === 'run' ? 'Running…' : 'Run examples'}</button>
            <button className="btn primary" onClick={onSubmit} disabled={!!busy}>{busy === 'submit' ? 'Checking…' : 'Submit'}</button>
            <button className="btn ghost sm" onClick={() => { if (window.confirm('Replace your code with the starter code?')) setCode(q.starterCode); }}>Reset</button>
            <span className="small muted grow" style={{ textAlign: 'right' }} aria-live="polite">
              {saved === 'saving' ? 'Saving draft…' : saved === 'saved' ? 'Draft saved' : ''}
            </span>
          </div>
          <CodeEditor value={code} onChange={setCode} onRun={onRun} onSubmit={onSubmit} />
          <div className="editor-bar small muted">
            <span><kbd>Ctrl</kbd>+<kbd>Enter</kbd> run examples</span>
            <span><kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>Enter</kbd> submit</span>
          </div>

          <div className="results" aria-live="polite">
            {message && <div className={`alert ${message.kind}`} role="alert">{message.text}</div>}

            {submit?.passed && (
              <div className="alert ok confetti" role="status">
                <strong>{submit.firstSolve ? 'Solved' : 'All tests pass'}</strong>
                {submit.firstSolve
                  ? p.solutionViewed
                    ? 'Nice. You looked at the solution first, so this counts as assisted. Try writing it again tomorrow without looking.'
                    : q.hintCount > 0 && p.hintsRevealed > 0
                      ? `Solved with ${p.hintsRevealed} hint${p.hintsRevealed > 1 ? 's' : ''}.`
                      : 'Solved without help.'
                  : 'Still correct.'}
                <div className="row" style={{ marginTop: '0.6rem' }}>
                  <Link className="btn sm primary" to={`/t/${track}/practice?topic=${q.topic}&status=unsolved`}>Next unsolved in this topic</Link>
                  <Link className="btn sm" to={`/t/${track}`}>Dashboard</Link>
                </div>
              </div>
            )}

            {submit?.runnerFault && (
              <div className="alert error" role="alert">
                <strong>The code runner had a problem</strong>
                {submit.message ?? 'This attempt was not counted. Please try again.'}
              </div>
            )}

            {result && !submit?.runnerFault && (
              <>
                <div className={`verdict ${result.passedCount === result.total ? 'pass' : 'fail'}`}>
                  <span className="dot" />
                  {submit ? 'Submission: ' : 'Examples: '}
                  {result.passedCount} of {result.total} tests passed
                </div>
                {result.message && <div className="alert">{result.message}</div>}
                <TestResults tests={result.tests} entry={q.entry} />
              </>
            )}

            {submit && !submit.passed && !submit.runnerFault && <DiagnosisPanel result={submit} track={track} />}

            {!result && !message && (
              <p className="muted small">
                Run checks the visible examples only. Submit runs every test, including the hidden ones, and records your progress.
              </p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
