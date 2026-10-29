import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, useApi } from '../api';
import { Markdown } from '../components/Markdown';
import { DifficultyChip, ErrorBox, Loading } from '../components/ui';
import type { LessonPayload } from '../types';

export function Lesson() {
  const { track = 'python', topic = '', lesson = '' } = useParams();
  const { data, error, loading, reload } = useApi<LessonPayload>(`/tracks/${track}/lessons/${topic}/${lesson}`);
  const [state, setState] = useState({ completed: false, bookmarked: false });
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  useEffect(() => {
    if (data) setState(data.progress);
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

          <footer className="panel stack">
            {problem && <div className="alert error" role="alert">{problem}</div>}
            <div className="row">
              <button className={`btn ${state.completed ? '' : 'primary'}`} disabled={busy} onClick={() => update({ completed: !state.completed })}>
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
