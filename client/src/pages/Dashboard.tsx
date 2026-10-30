import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, useApi } from '../api';
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
  const mockScores = useApi<{ scores: { id: string; mode: 'coding' | 'predict'; score: number; correct: number; total: number; at: string }[] }>(`/tracks/${track}/progress/mock-scores`);
  const preferences = useApi<{ weeklyLearningGoal: number }>('/auth/preferences');
  const [weeklyTarget, setWeeklyTarget] = useState(5);
  const [preferenceError, setPreferenceError] = useState('');
  useEffect(() => { if (preferences.data) setWeeklyTarget(preferences.data.weeklyLearningGoal); }, [preferences.data]);
  const s = summary.data;
  const weekSessions = useMemo(() => {
    if (!activity.data) return 0;
    const today = Date.parse(`${activity.data.today}T00:00:00Z`);
    return activity.data.days.filter((day) => Date.parse(`${day.date}T00:00:00Z`) >= today - 6 * 86_400_000).reduce((total, day) => total + day.submissions + day.lessons, 0);
  }, [activity.data]);
  const weakestSkills = s?.skillMastery.filter((item) => item.evidence > 0 && item.mastery !== null).sort((a, b) => (a.mastery ?? 1) - (b.mastery ?? 1)).slice(0, 5) ?? [];
  const overdueSkills = s?.skillMastery.filter((item) => item.overdue).sort((a, b) => Date.parse(a.reviewDueAt ?? '') - Date.parse(b.reviewDueAt ?? '')).slice(0, 5) ?? [];

  async function updateWeeklyTarget(value: number) {
    const previous = weeklyTarget;
    setWeeklyTarget(value);
    setPreferenceError('');
    try {
      const saved = await api<{ weeklyLearningGoal: number }>('/auth/preferences', { method: 'PUT', body: { weeklyLearningGoal: value } });
      setWeeklyTarget(saved.weeklyLearningGoal);
    } catch (error) {
      setWeeklyTarget(previous);
      setPreferenceError(error instanceof Error ? error.message : 'Could not save your learning goal.');
    }
  }

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
        <section className="dash-hero" aria-label="At a glance">
          <div className="dash-hero-copy"><span className="eyebrow">YOUR PYTHON LEARNING STUDIO</span><h2>Progress you can act on.</h2><p>Build fundamentals, revisit fading skills, and practise toward your next interview level.</p></div>
          <div className="facts">
            <div className="fact"><b>{s.totals.solved}</b><span>problems solved</span></div>
            <div className="fact"><b>{s.totals.accuracy === null ? '—' : `${Math.round(s.totals.accuracy * 100)}%`}</b><span>submission accuracy</span></div>
            <div className="fact"><b>{s.totals.firstAttemptSuccess === null ? '—' : `${Math.round(s.totals.firstAttemptSuccess * 100)}%`}</b><span>first attempt success</span></div>
            <div className="fact"><b>{s.totals.lessonsMastered}/{s.totals.lessons}</b><span>lessons mastered</span></div>
            <div className="fact"><b>{s.streak.current} days</b><span>current streak · best {s.streak.longest}</span></div>
          </div>
        </section>
      )}

      {s && <section className="dash-grid dash-overview">
        <article className="panel dash-card weekly-card"><div className="row between"><div><span className="eyebrow">WEEKLY MOMENTUM</span><h2>Your learning goal</h2></div><span className="chip">{Math.min(weekSessions, weeklyTarget)}/{weeklyTarget}</span></div><div className="goal-track"><span style={{ width: `${Math.min(100, weekSessions / weeklyTarget * 100)}%` }} /></div><p className="small muted">{weekSessions} practice submissions and lesson completions in the last 7 days. Your goal is saved to your account across devices.</p><label className="field"><span>Weekly activity target</span><select className="input" disabled={preferences.loading} value={weeklyTarget} onChange={(event) => void updateWeeklyTarget(Number(event.target.value))}>{[3, 5, 7, 10, 14].map((goal) => <option key={goal} value={goal}>{goal} learning actions</option>)}</select></label>{preferenceError && <p className="small alert error" role="alert">{preferenceError}</p>}<p className="small">Streak: <strong>{s.streak.current} days</strong> · Keep a small daily practice session going.</p></article>
        <article className="panel dash-card time-card"><span className="eyebrow">TIME INVESTED</span><h2>Learning vs solving</h2><div className="time-split"><div><strong>{s.totals.timeLearningMinutesActive}m</strong><span>lesson time in visible tabs</span></div><div><strong>{s.totals.timeSolvingMinutes}m</strong><span>recorded problem time</span></div><div><strong>{s.totals.timeLearningMinutesEstimated}m</strong><span>planned lesson time completed</span></div></div><p className="small muted">Lesson and problem focus time pauses when a tab is hidden. Planned lesson minutes are a separate curriculum estimate. Older problem records may include hidden-tab time.</p></article>
      </section>}

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

      {s && <section className="dash-grid">
        <section className="panel dash-card" aria-labelledby="skill-h"><div className="row between"><div><span className="eyebrow">MASTERY MAP</span><h2 id="skill-h">Mastery by topic &amp; skill</h2></div><Link className="small" to={`/t/${track}/learn`}>Continue learning →</Link></div><div className="mastery-map">{s.topics.map((topic) => { const topicSkills = s.skillMastery.filter((skill) => skill.topic === topic.slug); return <div className="mastery-topic" key={topic.slug}><div className="row between"><Link to={`/t/${track}/practice?topic=${topic.slug}`}>{topic.icon} {topic.title}</Link><span className="small">{topic.mastery === null ? 'Not enough data' : `${Math.round(topic.mastery * 100)}%`}</span></div><div className="goal-track"><span style={{ width: `${topic.mastery === null ? 0 : topic.mastery * 100}%` }} /></div><small className="muted">{topic.lessonsMastered}/{topic.lessonsTotal} lessons mastered · {topic.solved}/{topic.questionsTotal} problems solved</small><details className="topic-skills"><summary>{topicSkills.length} skill concepts</summary><div>{topicSkills.map((skill) => <div className="row between" key={skill.id}><Link to={`/t/${track}/learn/${skill.topic}/${skill.lesson}`}>{skill.title}</Link><span className="small">{skill.mastery === null ? 'Not assessed' : `${Math.round(skill.mastery * 100)}%`}</span></div>)}</div></details></div>; })}</div></section>
        <section className="panel dash-card" aria-labelledby="ready-h"><span className="eyebrow">INTERVIEW PREPARATION</span><h2 id="ready-h">Readiness estimates</h2><p className="small muted">These estimates are based on your tracked practice and lesson evidence; they are not hiring predictions.</p><div className="readiness-list">{s.readiness.map((item) => <details className="readiness-row" key={item.level}><summary><span>{item.level}</span><strong>{Math.round(item.score * 100)}%</strong></summary><div><p className="small">Weighted evidence used:</p><ul>{item.basis.map((part) => <li key={part.label}>{part.label}: {part.value}/{part.total} · {part.weight}% weight</li>)}</ul></div></details>)}</div><p className="tiny muted">{s.readinessNote}</p></section>
      </section>}

      {s && <section className="dash-grid">
        <section className="panel dash-card" aria-labelledby="weakest-h"><div className="row between"><div><span className="eyebrow">FOCUS SKILLS</span><h2 id="weakest-h">Weakest assessed skills</h2></div></div>{weakestSkills.length ? <div className="skill-list">{weakestSkills.map((skill) => <div className="row between" key={skill.id}><Link to={`/t/${track}/learn/${skill.topic}/${skill.lesson}`}>{skill.title}</Link><span className="chip">{Math.round((skill.mastery ?? 0) * 100)}% · {skill.evidence} evidence</span></div>)}</div> : <p className="muted">Complete a few practice submissions to build a skill mastery estimate.</p>}<div className="next-action"><strong>Recommended next action</strong>{recs.data?.recommendations[0] ? <p><Link to={`/t/${track}/learn/${recs.data.recommendations[0].concept.topic}/${recs.data.recommendations[0].concept.lesson}`}>{recs.data.recommendations[0].concept.title}</Link> — {recs.data.recommendations[0].reason}</p> : s.next ? <p><Link to={`/t/${track}/practice/${s.next.slug}`}>{s.next.title}</Link> · {s.next.difficulty}</p> : <p>No unsolved practice remains in this track.</p>}</div></section>
        <section className="panel dash-card" aria-labelledby="review-h"><span className="eyebrow">SPACED REVIEW</span><h2 id="review-h">Concepts due to revisit</h2>{overdueSkills.length ? <ul className="due-list">{overdueSkills.map((skill) => <li key={skill.id}><Link to={`/t/${track}/learn/${skill.topic}/${skill.lesson}`}>{skill.title}</Link><span className="small muted">Due {skill.reviewDueAt ? new Date(skill.reviewDueAt).toLocaleDateString() : ''}</span></li>)}</ul> : <p className="muted">No concepts are past their current 7-day review interval.</p>}</section>
      </section>}

      <section className="dash-grid">
        <section className="panel dash-card" aria-labelledby="mock-score-h"><span className="eyebrow">MOCK INTERVIEW HISTORY</span><h2 id="mock-score-h">Recent practice scores</h2>{mockScores.data?.scores.length ? <div className="score-history">{mockScores.data.scores.slice(0, 8).map((score) => <div className="row between" key={score.id}><div><strong>{score.mode === 'coding' ? 'Coding sample run' : 'Output prediction'}</strong><small className="muted">{new Date(score.at).toLocaleString()}</small></div><span className="chip">{score.score}% · {score.correct}/{score.total}</span></div>)}</div> : <p className="muted">Finish a coding or output-prediction mock round to start a score history. Scores are sample checks, not a complete interview rating.</p>}</section>
        <section className="panel dash-card" aria-labelledby="actions-h"><span className="eyebrow">YOUR NEXT MOVE</span><h2 id="actions-h">Make the next session count</h2><p>Prioritize the first recommendation, then re-test one overdue skill. Small, spaced reviews provide better evidence than another long skim.</p>{recs.data?.recommendations[0] && <Link className="btn primary" to={`/t/${track}/learn/${recs.data.recommendations[0].concept.topic}/${recs.data.recommendations[0].concept.lesson}`}>Review {recs.data.recommendations[0].concept.title}</Link>}</section>
      </section>

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
