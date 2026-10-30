import { Link, useParams } from 'react-router-dom';
import { useApi } from '../api';
import { ErrorBox, Loading, PageHead, ProgressBar } from '../components/ui';
import type { TrackOverview } from '../types';

export function Learn() {
  const { track = 'python' } = useParams();
  const { data, error, loading, reload } = useApi<TrackOverview>(`/tracks/${track}`);
  const orderedLessons = data?.topics.flatMap((topic) => topic.lessons.map((lesson) => ({ topic, lesson }))) ?? [];
  const nextLesson = orderedLessons.find(({ lesson }) => !lesson.completed) ?? orderedLessons[0];
  const completedLessons = orderedLessons.filter(({ lesson }) => lesson.completed).length;
  return (
    <div className="page">
      <PageHead title={data ? `Learn ${data.track.title}` : 'Learn'}>
        {data && <p>{data.track.description}</p>}
      </PageHead>
      {error && <ErrorBox error={error} retry={reload} />}
      {loading && !data && <Loading lines={5} />}
      {data && nextLesson && <section className="panel learn-path" aria-labelledby="learn-path-title">
        <div className="learn-path-copy"><span className="eyebrow">YOUR LEARNING PATH</span><h2 id="learn-path-title">{completedLessons ? 'Pick up your next lesson' : 'Start with the foundations'}</h2><p>{completedLessons} of {orderedLessons.length} lessons complete · Follow the course order and practise each concept as you go.</p></div>
        <div className="learn-path-action"><div><span className="small muted">{nextLesson.topic.title}</span><strong>{nextLesson.lesson.title}</strong><span className="small muted">{nextLesson.lesson.minutes ?? 15} min · {nextLesson.lesson.mastered ? 'Mastered' : nextLesson.lesson.completed ? 'Completed' : 'Next in sequence'}</span></div><Link className="btn primary" to={`/t/${track}/learn/${nextLesson.topic.slug}/${nextLesson.lesson.slug}`}>{nextLesson.lesson.completed ? 'Review lesson' : completedLessons ? 'Continue learning' : 'Start learning'}</Link></div>
      </section>}
      <div className="grid-2">
        {data?.topics.map((t) => {
          const done = t.lessons.filter((l) => l.completed).length;
          const mastered = t.lessons.filter((l) => l.mastered).length;
          return (
            <section key={t.slug} className="panel topic-card" aria-labelledby={`t-${t.slug}`}>
              <div className="topic-title">
                <span className="topic-icon" aria-hidden="true">{t.icon}</span>
                <h2 id={`t-${t.slug}`}>{t.title}</h2>
              </div>
              <p className="muted">{t.description}</p>
              <ProgressBar value={mastered} max={t.lessons.length} label={`${t.title}: ${mastered} of ${t.lessons.length} lessons mastered`} />
              <p className="small muted">{done} complete · {mastered} mastered of {t.lessons.length}</p>
              <div>
                {t.lessons.map((l) => (
                  <Link key={l.slug} className="lesson-row" to={`/t/${track}/learn/${t.slug}/${l.slug}`}>
                    <span className={`check ${l.completed ? 'done' : ''}`} aria-hidden="true">{l.mastered ? '★' : l.completed ? '✓' : ''}</span>
                    <span className="grow">
                      {l.title}
                      <span className="sr-only">{l.mastered ? ' (mastered)' : l.completed ? ' (completed)' : ''}</span>
                    </span>
                    {l.minutes ? <span className="small muted">{l.minutes} min</span> : null}
                    {!l.completed && t.lessons.find((candidate) => !candidate.completed)?.slug === l.slug && <span className="chip">Next</span>}
                  </Link>
                ))}
              </div>
              <div className="row">
                <Link className="btn sm" to={`/t/${track}/reference/${t.slug}`}>Syntax reference</Link>
                <Link className="btn sm" to={`/t/${track}/practice?topic=${t.slug}`}>
                  Practice ({t.solvedCount}/{t.questionCount})
                </Link>
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
