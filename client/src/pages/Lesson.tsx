import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, useApi } from '../api';
import { Markdown } from '../components/Markdown';
import { LessonVisualizer } from '../components/LessonVisualizer';
import { DifficultyChip, ErrorBox, Loading } from '../components/ui';
import type { LessonPayload } from '../types';

function extractSelfChecks(body: string) {
  const section = body.split(/^## Check yourself\s*$/m)[1]?.split(/^## /m)[0] ?? '';
  return [...section.matchAll(/(?:^|\n)\s*\d+\.\s+([\s\S]*?)\n<details><summary>Answer<\/summary>([\s\S]*?)<\/details>/g)]
    .map((match, index) => ({ id: index, question: match[1].trim(), answer: match[2].trim() }));
}

export function Lesson() {
  const { track = 'python', topic = '', lesson = '' } = useParams();
  const { data, error, loading, reload } = useApi<LessonPayload>(`/tracks/${track}/lessons/${topic}/${lesson}`);
  const [state, setState] = useState({ completed: false, bookmarked: false, mastered: false, masteryScore: null as number | null });
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [quizAnswers, setQuizAnswers] = useState<Record<number, boolean>>({});
  const [revealedQuiz, setRevealedQuiz] = useState<number | null>(null);

  useEffect(() => {
    if (data) { setState(data.progress); setQuizAnswers({}); setRevealedQuiz(null); }
    window.scrollTo({ top: 0 });
  }, [data]);

  const update = async (patch: Partial<typeof state>) => {
    setBusy(true);
    setProblem(null);
    try {
      const r = await api<typeof state>(`/tracks/${track}/lessons/${topic}/${lesson}/state`, { method: 'PUT', body: patch });
      setState(r);
    } catch (e) {
      setProblem(e instanceof Error ? e.message : 'Could not save.');
    } finally {
      setBusy(false);
    }
  };

  if (error) return <div className="page"><ErrorBox error={error} retry={reload} /></div>;
  if (loading || !data) return <div className="page"><Loading lines={6} /></div>;
  const l = data.lesson;
  const checks = extractSelfChecks(l.body);
  const requiredCorrect = Math.max(1, Math.ceil(checks.length * 0.8));
  const mastered = checks.length > 0 && Object.keys(quizAnswers).length === checks.length && Object.values(quizAnswers).filter(Boolean).length >= requiredCorrect;
  const masteryScore = checks.length ? Math.round(Object.values(quizAnswers).filter(Boolean).length / checks.length * 100) : 0;

  return (
    <div className="page">
      <div className="lesson-grid">
        <article className="stack">
          <header className="page-head">
            <p className="small"><Link to={`/t/${track}/learn`}>All lessons</Link></p>
            <h1>{l.title}</h1>
            <p>{l.summary}</p>
            <p className="small muted">About {l.minutes} minutes</p>
          </header>
          <Markdown>{l.body}</Markdown>

          <LessonVisualizer lesson={`${l.title} ${l.slug}`} />

          {checks.length > 0 && <section className="panel lesson-check" aria-labelledby="lesson-check-title">
            <div className="row between"><div><span className="eyebrow">RETRIEVAL PRACTICE</span><h2 id="lesson-check-title">Check what you can explain</h2></div><span className={`chip ${mastered ? 'solved' : ''}`}>{Object.keys(quizAnswers).length}/{checks.length} reviewed</span></div>
            <p className="small muted">Answer from memory, reveal the guide answer, then grade your own understanding. You need {requiredCorrect} of {checks.length} to mark this lesson complete.</p>
            {checks.map((check) => <details className="lesson-check-item" key={check.id} open={revealedQuiz === check.id} onToggle={(event) => { if ((event.currentTarget as HTMLDetailsElement).open) setRevealedQuiz(check.id); }}>
              <summary><Markdown variant="compact">{check.question}</Markdown></summary>
              <div className="lesson-check-answer"><Markdown variant="compact">{check.answer}</Markdown>
                {quizAnswers[check.id] === undefined ? <div className="row"><button className="btn sm primary" onClick={() => setQuizAnswers((answers) => ({ ...answers, [check.id]: true }))}>I can explain this</button><button className="btn sm" onClick={() => setQuizAnswers((answers) => ({ ...answers, [check.id]: false }))}>I need to review</button></div> : <p className="small">{quizAnswers[check.id] ? 'Marked understood' : 'Marked for review'} · <button className="text-button" onClick={() => setQuizAnswers((answers) => { const next = { ...answers }; delete next[check.id]; return next; })}>Try again</button></p>}
              </div>
            </details>)}
            <p className="small" role="status">{mastered || state.mastered ? `Mastery check passed${state.masteryScore !== null ? ` (${state.masteryScore}%)` : ''}. You can mark this lesson complete.` : checks.length === Object.keys(quizAnswers).length ? 'Review the lesson and retry the questions you marked for review.' : 'Open each question, reveal the answer, and self-check before completing.'}</p>
            {Object.keys(quizAnswers).length === checks.length && state.masteryScore !== masteryScore && <button className="btn sm" disabled={busy} onClick={() => update({ masteryScore })}>Save mastery result ({masteryScore}%)</button>}
          </section>}

          <footer className="panel stack">
            {problem && <div className="alert error" role="alert">{problem}</div>}
            <div className="row">
              <button className={`btn ${state.completed ? '' : 'primary'}`} disabled={busy || (!state.completed && !mastered && !state.mastered)} onClick={() => update(state.completed ? { completed: false } : { completed: true, masteryScore: masteryScore || state.masteryScore || 0 })}>
                {state.completed ? 'Completed. Mark as not done' : 'Mark lesson complete'}
              </button>
              <button className={`btn ${state.bookmarked ? 'toggled' : ''}`} disabled={busy} aria-pressed={state.bookmarked} onClick={() => update({ bookmarked: !state.bookmarked })}>
                {state.bookmarked ? 'Saved' : 'Save for later'}
              </button>
            </div>
            <div className="row between">
              {data.prev ? <Link className="btn sm" to={`/t/${track}/learn/${data.prev.topic}/${data.prev.slug}`}>Previous: {data.prev.title}</Link> : <span />}
              {data.next ? <Link className="btn sm primary" to={`/t/${track}/learn/${data.next.topic}/${data.next.slug}`}>Next: {data.next.title}</Link> : <span />}
            </div>
          </footer>
        </article>

        <aside className="lesson-side">
          {data.practice.length > 0 && (
            <section className="panel">
              <h2>Practise this</h2>
              <ul className="link-list">
                {data.practice.map((q) => (
                  <li key={q.slug} className="row">
                    <Link className="grow" to={`/t/${track}/practice/${q.slug}`}>{q.title}</Link>
                    {q.solved ? <span className="chip solved">Solved</span> : <DifficultyChip d={q.difficulty} />}
                  </li>
                ))}
              </ul>
            </section>
          )}
          {data.concepts.length > 0 && (
            <section className="panel">
              <h2>Skills covered</h2>
              <div className="row">{data.concepts.map((c) => <span key={c.id} className="chip">{c.title}</span>)}</div>
            </section>
          )}
          <Link className="btn" to={`/t/${track}/reference/${l.topic}`}>Open the syntax reference</Link>
        </aside>
      </div>
    </div>
  );
}
