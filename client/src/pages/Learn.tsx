import { Link, useParams } from 'react-router-dom';
import { useApi } from '../api';
import { ErrorBox, Loading, PageHead, ProgressBar } from '../components/ui';
import type { TrackOverview } from '../types';

export function Learn() {
  const { track = 'python' } = useParams();
  const { data, error, loading, reload } = useApi<TrackOverview>(`/tracks/${track}`);
  return (
    <div className="page">
      <PageHead title={data ? `Learn ${data.track.title}` : 'Learn'}>
        {data && <p>{data.track.description}</p>}
      </PageHead>
      {error && <ErrorBox error={error} retry={reload} />}
      {loading && !data && <Loading lines={5} />}
      <div className="grid-2">
        {data?.topics.map((t) => {
          const done = t.lessons.filter((l) => l.completed).length;
          return (
            <section key={t.slug} className="panel topic-card" aria-labelledby={`t-${t.slug}`}>
              <div className="topic-title">
                <span className="topic-icon" aria-hidden="true">{t.icon}</span>
                <h2 id={`t-${t.slug}`}>{t.title}</h2>
              </div>
              <p className="muted">{t.description}</p>
              <ProgressBar value={done} max={t.lessons.length} label={`${t.title}: ${done} of ${t.lessons.length} lessons done`} />
              <div>
                {t.lessons.map((l) => (
                  <Link key={l.slug} className="lesson-row" to={`/t/${track}/learn/${t.slug}/${l.slug}`}>
                    <span className={`check ${l.completed ? 'done' : ''}`} aria-hidden="true">{l.completed ? '✓' : ''}</span>
                    <span className="grow">
                      {l.title}
                      <span className="sr-only">{l.completed ? ' (completed)' : ''}</span>
                    </span>
                    {l.minutes ? <span className="small muted">{l.minutes} min</span> : null}
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
