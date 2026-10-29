import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api';
import { CodeEditor } from '../components/CodeEditor';
import { PageHead } from '../components/ui';
import { conversationPrompts, createCodingRound, createPredictionRound, shuffledDeck, type MockCodingPrompt } from '../data/mockInterviewData';

type Mode = 'coding' | 'predict' | 'conversation';
interface RunResult { status: string; stdout: string; error?: string; message?: string }
const ROUND_LENGTH = 20 * 60;

export function MockInterview() {
  const { track = 'python' } = useParams();
  const [mode, setMode] = useState<Mode>('coding');
  const [round, setRound] = useState<MockCodingPrompt[]>([]);
  const [index, setIndex] = useState(0);
  const [started, setStarted] = useState(false);
  const [finished, setFinished] = useState(false);
  const [timeExpired, setTimeExpired] = useState(false);
  const [seconds, setSeconds] = useState(ROUND_LENGTH);
  const [code, setCode] = useState('');
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [run, setRun] = useState<RunResult | null>(null);
  const [running, setRunning] = useState(false);
  const [runError, setRunError] = useState('');
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [predictionIndex, setPredictionIndex] = useState(0);
  const [prediction, setPrediction] = useState('');
  const [revealed, setRevealed] = useState(false);
  const [conversationIndex, setConversationIndex] = useState(0);
  const [conversationDeck, setConversationDeck] = useState(() => shuffledDeck(conversationPrompts));
  const [predictionDeck, setPredictionDeck] = useState(() => createPredictionRound());
  const [conversationNotes, setConversationNotes] = useState<Record<number, string>>({});
  const [followUpLevel, setFollowUpLevel] = useState(0);
  const [followUpFeedback, setFollowUpFeedback] = useState('');
  const [followUpAnswer, setFollowUpAnswer] = useState('');
  const [followUpPrompt, setFollowUpPrompt] = useState('');
  const current = round[index];
  const currentPrediction = predictionDeck[predictionIndex];
  const currentConversation = conversationDeck[conversationIndex];

  useEffect(() => {
    if (!started || finished) return;
    const timer = window.setInterval(() => setSeconds((currentSeconds) => Math.max(0, currentSeconds - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [started, finished]);

  useEffect(() => {
    if (started && seconds === 0 && !finished) { setTimeExpired(true); setFinished(true); }
  }, [started, seconds, finished]);

  function startRound() {
    const chosen = createCodingRound(5);
    setRound(chosen); setIndex(0); setCode(chosen[0]?.starter ?? ''); setDrafts(chosen[0] ? { [chosen[0].id]: chosen[0].starter } : {}); setSeconds(ROUND_LENGTH);
    setRun(null); setRunError(''); setNotes({}); setFinished(false); setTimeExpired(false); setStarted(true);
  }

  function reviewAnswer(answer: string, level: number) {
    const text = answer.trim();
    const checks = [
      { label: 'a concrete example', test: /\b(example|project|once|when|built|bug|feature)\b/i },
      { label: 'your specific actions', test: /\b(I|my|implemented|tested|measured|changed|debugged|chose)\b/i },
      { label: 'the outcome or evidence', test: /\b(result|impact|improved|reduced|increased|because|learned|trade-?off)\b/i },
    ];
    const missing = checks.filter((check) => !check.test.test(text)).map((check) => check.label);
    const feedback = text.length < 45
      ? 'Add a little more detail so the interviewer can evaluate your reasoning.'
      : missing.length
        ? `Good start. Strengthen it with ${missing.join(' and ')}.`
        : 'Good coverage. Be ready to defend the choices with evidence and a specific edge case.';
    setFollowUpFeedback(feedback);
    setFollowUpLevel(level + 1);
    setFollowUpAnswer('');
    const anchor = text.split(/[.!?\n]/)[0].split(/\s+/).slice(0, 10).join(' ');
    const context = anchor ? `You mentioned “${anchor}…”. ` : '';
    const adaptive = level === 0 && missing.includes('a concrete example')
      ? 'What is one specific project moment that shows this?'
      : level === 0 && missing.includes('your specific actions')
        ? 'What did you personally do, step by step, and what was owned by the rest of the team?'
        : level === 0 && missing.includes('the outcome or evidence')
          ? 'What changed as a result, and what evidence supports that outcome?'
          : level <= 1
            ? 'What evidence would convince a skeptical teammate that this was the right choice?'
            : level === 2
              ? 'What alternative did you consider, and which trade-off made you choose this approach?'
              : 'If the constraints doubled or changed, what would you change first and how would you limit the risk?';
    setFollowUpPrompt(`${context}${adaptive}`);
  }

  async function runCode() {
    if (!current) return;
    setRunning(true); setRun(null); setRunError('');
    try {
      const result = await api<RunResult>(`/tracks/${track}/interview/cookbook-mock-${current.id}/run`, { method: 'POST', body: { code } });
      setRun(result);
    } catch (error) {
      setRunError(error instanceof Error ? error.message : 'Could not reach the isolated Python runner.');
    } finally { setRunning(false); }
  }

  function nextCodingQuestion() {
    if (index + 1 >= round.length) { setFinished(true); return; }
    const next = index + 1;
    setIndex(next); setCode(drafts[round[next].id] ?? round[next].starter); setRun(null); setRunError('');
  }

  const time = `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;

  return <div className="page">
    <PageHead title="Mock Interview">
      <p>Practise writing code, predicting output, and explaining your project under interview-style prompts. Your answers stay in this browser session.</p>
      <div className="row"><Link className="btn" to={`/t/${track}/interview-glance`}>Coding Glance</Link><Link className="btn" to={`/t/${track}/interview-guide`}>Interview Guide</Link><Link className="btn" to={`/t/${track}/trace-bench`}>Trace Bench</Link></div>
    </PageHead>

    <div className="tabs" role="tablist" aria-label="Mock interview practice mode">
      <button className="tab" role="tab" aria-selected={mode === 'coding'} onClick={() => setMode('coding')}>Timed coding round</button>
      <button className="tab" role="tab" aria-selected={mode === 'predict'} onClick={() => setMode('predict')}>Predict the output</button>
      <button className="tab" role="tab" aria-selected={mode === 'conversation'} onClick={() => setMode('conversation')}>Project &amp; behavioral</button>
    </div>

    {mode === 'coding' && <>
      {!started && <section className="panel mock-card"><span className="eyebrow">20 MINUTES · 5 PROMPTS</span><h2>Write first. Explain your choices.</h2><p>Each prompt includes a small sample case. Run your code to compare its printed result; this checks that sample only, not hidden cases.</p><button className="btn primary" onClick={startRound}>Start coding round</button></section>}
      {started && !finished && current && <section className="panel mock-card">
        <div className="row between"><div><span className="eyebrow">CODING ROUND · QUESTION {index + 1} OF {round.length}</span><h2>{current.title}</h2></div><span className={`chip ${seconds < 120 ? 'hard' : ''}`} aria-live="polite">Time {time}</span></div>
        <p>{current.prompt}</p><p className="small muted">Sample: expected printed output is <code>{current.expected}</code></p>
        <CodeEditor ariaLabel={`Mock interview editor for ${current.title}`} value={code} onChange={(value) => { setCode(value); setDrafts((currentDrafts) => ({ ...currentDrafts, [current.id]: value })); }} onRun={() => void runCode()} onSubmit={() => void runCode()} />
        <div className="row"><button className="btn primary" disabled={running} onClick={() => void runCode()}>{running ? 'Running…' : 'Run sample'}</button><button className="btn" onClick={nextCodingQuestion}>{index + 1 === round.length ? 'Finish round' : 'Next prompt'}</button></div>
        {runError && <div className="alert error" role="alert">{runError}</div>}
        {run && <div className={`alert ${run.error ? 'error' : 'info'}`}><strong>{run.error ? 'Execution stopped' : 'Sample run'}</strong>{run.error ? run.error : <><pre className="glance-output">{run.stdout || '(no output)'}</pre><p className="small">{run.status !== 'ok' ? run.message : run.stdout.trimEnd() === current.expected ? 'Matches this sample. Check the rubric and edge cases before moving on.' : 'Does not match the sample yet; inspect the output and revise.'}</p></>}</div>}
        <label className="field"><span>Explain your approach aloud (notes)</span><textarea className="input" value={notes[current.id] ?? ''} onChange={(event) => setNotes((value) => ({ ...value, [current.id]: event.target.value }))} placeholder="State assumptions, approach, edge cases, and complexity…" /></label>
        <details><summary>Self-review rubric</summary><ul>{current.rubric.map((item) => <li key={item}>{item}</li>)}</ul><pre className="glance-code"><code>{current.solution}</code></pre></details>
      </section>}
      {started && finished && <section className="panel mock-card"><span className="eyebrow">{timeExpired ? 'TIME IS UP' : 'ROUND COMPLETE'}</span><h2>{timeExpired ? `You reached prompt ${index + 1} of ${round.length}.` : `You completed ${round.length} prompts.`}</h2><p>Review your code, notes, and rubric before starting another round.</p><div className="mock-review">{round.map((item) => <details key={item.id}><summary>{item.title}</summary><pre className="glance-code"><code>{drafts[item.id] ?? item.starter}</code></pre><p><strong>Your explanation notes:</strong> {notes[item.id] || 'No notes saved.'}</p><ul>{item.rubric.map((line) => <li key={line}>{line}</li>)}</ul><details><summary>Reference solution</summary><pre className="glance-code"><code>{item.solution}</code></pre></details></details>)}</div><button className="btn primary" onClick={startRound}>Start another round</button></section>}
    </>}

    {mode === 'predict' && currentPrediction && <section className="panel mock-card">
      <div className="row between"><div><span className="eyebrow">OUTPUT PREDICTION · {predictionIndex + 1} OF {predictionDeck.length}</span><h2>{currentPrediction.title}</h2></div><span className="chip">Fresh values each round</span></div>
      <pre className="glance-code"><code>{currentPrediction.code}</code></pre>
      <label className="field"><span>Your predicted output</span><textarea className="input scratch-input" value={prediction} onChange={(event) => setPrediction(event.target.value)} placeholder="Write each printed line in order…" /></label>
      {!revealed ? <button className="btn primary" onClick={() => setRevealed(true)}>Reveal and compare</button> : <div className="alert info"><strong>{prediction.trimEnd().replace(/\r\n/g, '\n') === currentPrediction.output.trimEnd() ? 'Your prediction matches' : 'Compare your prediction'}</strong><pre className="glance-output">{currentPrediction.output}</pre><p>{currentPrediction.explanation}</p></div>}
      <button className="btn" onClick={() => { if (predictionIndex + 1 >= predictionDeck.length) { setPredictionDeck(createPredictionRound()); setPredictionIndex(0); } else setPredictionIndex((i) => i + 1); setPrediction(''); setRevealed(false); }}>Next fresh prediction</button>
    </section>}

    {mode === 'conversation' && currentConversation && <section className="panel mock-card">
      <div className="row between"><div><span className="eyebrow">PROJECT &amp; BEHAVIORAL · {conversationIndex + 1} OF {conversationDeck.length}</span><h2>Answer in your own words</h2></div><span className="chip">Adaptive follow-up · level {followUpLevel + 1}</span></div>
      <h3>{currentConversation.question}</h3>
      <p className="small muted">Try a spoken answer first. Use the text box to jot down the main points, not a memorized script.</p>
      <label className="field"><span>Your notes</span><textarea className="input mock-notes" value={conversationNotes[conversationIndex] ?? ''} onChange={(event) => setConversationNotes((current) => ({ ...current, [conversationIndex]: event.target.value }))} placeholder="Situation, your role, actions, result, lesson…" /></label>
      <button className="btn" onClick={() => reviewAnswer(conversationNotes[conversationIndex] ?? '', 0)}>Get a tailored follow-up</button>
      {followUpLevel > 0 && <div className="panel followup-panel"><span className="eyebrow">FOLLOW-UP {followUpLevel} · ADAPTIVE</span><h3>{followUpPrompt}</h3><label className="field"><span>Your follow-up answer</span><textarea className="input mock-notes" value={followUpAnswer} onChange={(event) => setFollowUpAnswer(event.target.value)} placeholder="Answer with evidence, trade-offs, and specifics…" /></label><button className="btn primary" onClick={() => reviewAnswer(followUpAnswer, followUpLevel)}>Probe deeper</button>{followUpFeedback && <p className="small" role="status">{followUpFeedback}</p>}</div>}
      <details><summary>What a strong answer should cover</summary><p>{currentConversation.framework}</p></details>
      <div className="row"><button className="btn" disabled={conversationIndex === 0} onClick={() => setConversationIndex((i) => i - 1)}>Previous</button><button className="btn" onClick={() => { if (conversationIndex + 1 >= conversationDeck.length) { setConversationDeck(shuffledDeck(conversationPrompts)); setConversationIndex(0); } else setConversationIndex((i) => i + 1); setFollowUpLevel(0); setFollowUpFeedback(''); setFollowUpPrompt(''); }}>Next prompt</button></div>
    </section>}
  </div>;
}
