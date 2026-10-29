import { Link, useParams } from 'react-router-dom';
import { useApi } from '../api';
import { useAuth } from '../auth';
import { Heatmap } from '../components/Heatmap';
import { DifficultyChip, ErrorBox, Loading, PageHead, ProgressBar } from '../components/ui';
import type { ActivityDay, Recommendation, Summary } from '../types';

export function Dashboard() {
  const { track = 'python' } = useParams();
  const { user } = useAuth();
  const summary = useApi<Summary>(`/tracks/${track}/progress/summary`);
  const recs = useApi<{ recommendations: Recommendation[] }>(`/tracks/${track}/progress/recommendations`);
  const activity = useApi<{ days: ActivityDay[]; today: string }>(`/tracks/${track}/progress/activity`);
  const s = summary.data;

  return (
    <div className="page">
      <PageHead title={`Hello, ${user?.username}`}>
        {s && (
          <p>
            {s.totals.solved === 0
              ? 'Start with a lesson or jump straight into a problem. Everything you do is saved to your account.'
              : `You have solved ${s.totals.solved} of ${s.totals.questions} questions, completed ${s.totals.lessonsDone} lessons, and mastered ${s.totals.lessonsMastered}.`}
          </p>
        )}
      </PageHead>

      {summary.error && <ErrorBox error={summary.error} retry={summary.reload} />}
      {summary.loading && !s && <Loading lines={4} />}

      {s && (
        <section className="panel" aria-label="At a glance">
          <div className="facts">
            <div className="fact"><b>{s.totals.solved}</b><span>questions solved</span></div>
            <div className="fact"><b>{s.totals.lessonsMastered}/{s.totals.lessons}</b><span>lessons mastered</span></div>
            <div className="fact"><b>{s.totals.solvedIndependently}</b><span>solved without the solution</span></div>
            <div className="fact"><b>{s.streak.current}</b><span>day streak (best {s.streak.longest})</span></div>
            <div className="fact"><b>{s.totals.submissions}</b><span>submissions</span></div>
            <div className="fact"><b>{s.totals.bookmarks}</b><span>saved</span></div>
          </div>
        </section>
      )}

      <section className="stack" aria-labelledby="next-h">
        <h2 id="next-h">What to practise next</h2>
        {recs.loading && !recs.data && <Loading lines={2} />}
        {recs.data && recs.data.recommendations.length === 0 && (
          <div className="panel">
            <p>
              No weak spots yet. PyPrep needs a few submissions to see patterns, and it will point at the exact skill that keeps going wrong.
            </p>
            {s?.next && (
              <p style={{ marginTop: '0.75rem' }}>
                Good place to start: <Link to={`/t/${track}/practice/${s.next.slug}`}>{s.next.title}</Link> <DifficultyChip d={s.next.difficulty} />
              </p>
            )}
          </div>
        )}
        {recs.data?.recommendations.map((r) => (
          <div key={r.concept.id} className="panel focus stack">
            <div className="row between">
              <h3>
                <span className={r.kind === 'review' ? '' : 'mark'}>{r.concept.title}</span>
              </h3>
              <span className="chip">{r.kind === 'step-back' ? 'Back to basics' : r.kind === 'review' ? 'Review' : 'Needs work'}</span>
            </div>
            <p>{r.reason}</p>
            <div className="row">
              <Link className="btn sm" to={`/t/${track}/learn/${r.concept.topic}/${r.concept.lesson}`}>
                Read the lesson
              </Link>
            </div>
            <div className="stack-sm">
              {r.questions.map((q) => (
                <Link key={q.slug} className="q-link" to={`/t/${track}/practice/${q.slug}`}>
                  <span className="grow">{q.title}</span>
                  <DifficultyChip d={q.difficulty} />
                </Link>
              ))}
            </div>
          </div>
        ))}
      </section>

      <section className="panel" aria-labelledby="act-h">
        <h2 id="act-h">Activity</h2>
        {activity.loading && !activity.data && <Loading lines={5} />}
        {activity.data && <Heatmap days={activity.data.days} today={activity.data.today} />}
      </section>

      {s && (
        <div className="grid-2">
          <section className="panel" aria-labelledby="topics-h">
            <h2 id="topics-h">Topics</h2>
            <div>
              {s.topics.map((t) => (
                <div key={t.slug} className="topic-row">
                  <Link to={`/t/${track}/practice?topic=${t.slug}`}>
                    {t.icon} {t.title}
                  </Link>
                  <ProgressBar value={t.solved} max={t.questionsTotal} label={`${t.title}: ${t.solved} of ${t.questionsTotal} solved`} />
                  <span className="small muted">
                    {t.solved}/{t.questionsTotal}
                  </span>
                </div>
              ))}
            </div>
          </section>

          <section className="panel" aria-labelledby="weak-h">
            <h2 id="weak-h">Weak spots</h2>
            {s.weakConcepts.length === 0 ? (
              <p className="muted">Nothing flagged. Keep submitting solutions: a skill shows up here after repeated misses.</p>
            ) : (
              <div className="stack">
                {s.weakConcepts.map((w) => (
                  <div key={w.concept} className="stack-sm">
                    <div className="row between">
                      <strong className="mark">{w.title}</strong>
                      <span className="small muted">about {Math.round(w.mastery * 100)}% secure</span>
                    </div>
                    {w.commonMistake && <p className="small">Most common slip: {w.commonMistake.message}</p>}
                    <Link className="small" to={`/t/${track}/learn/${w.topic}/${w.lesson}`}>
                      Review the lesson
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}

      {s && s.recent.length > 0 && (
        <section className="panel" aria-labelledby="recent-h">
          <h2 id="recent-h">Recent submissions</h2>
          <table className="table">
            <thead>
              <tr>
                <th>Question</th>
                <th>Result</th>
                <th>When</th>
              </tr>
            </thead>
            <tbody>
              {s.recent.map((r, i) => (
                <tr key={i}>
                  <td><Link to={`/t/${track}/practice/${r.question}`}>{r.title}</Link></td>
                  <td>{r.passed ? <span className="chip solved">All {r.total} passed</span> : <span className="chip">{r.passedCount} of {r.total} passed</span>}</td>
                  <td className="muted small">{new Date(r.at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
}
