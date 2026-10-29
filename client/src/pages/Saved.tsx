import { Link, useParams } from 'react-router-dom';
import { useApi } from '../api';
import { DifficultyChip, ErrorBox, Loading, PageHead } from '../components/ui';

interface Saved {
  questions: { slug: string; title: string; topic: string; difficulty: 'easy' | 'medium' | 'hard'; kind: string; status: string }[];
  lessons: { topic: string; slug: string; title: string; completed: boolean }[];
  interview: { item: string; completed: boolean; confidence: number | null; lastReviewedAt: string | null }[];
}

export function SavedPage() {
  const { track = 'python' } = useParams();
  const { data, error, loading, reload } = useApi<Saved>(`/tracks/${track}/progress/bookmarks`);
  const interviewSaved = data?.interview ?? [];
  return (
    <div className="page narrow">
      <PageHead title="Saved">
        <p>Lessons and problems you bookmarked to come back to.</p>
      </PageHead>
      {error && <ErrorBox error={error} retry={reload} />}
      {loading && !data && <Loading />}
      {data && data.questions.length === 0 && data.lessons.length === 0 && interviewSaved.length === 0 && (
        <div className="empty">Nothing saved yet. Use "Save for later" on a lesson or the star on a problem.</div>
      )}
      {data && data.lessons.length > 0 && (
        <section className="panel">
          <h2>Lessons</h2>
          <ul className="link-list">
            {data.lessons.map((l) => (
              <li key={`${l.topic}/${l.slug}`}><Link to={`/t/${track}/learn/${l.topic}/${l.slug}`}>{l.title}</Link> {l.completed && <span className="chip solved">Done</span>}</li>
            ))}
          </ul>
        </section>
      )}
      {data && data.questions.length > 0 && (
        <section className="panel">
          <h2>Problems</h2>
          <div className="stack-sm">
            {data.questions.map((q) => (
              <Link key={q.slug} className="q-link" to={`/t/${track}/practice/${q.slug}`}>
                <span className="grow">{q.title}</span>
                {q.status === 'solved' && <span className="chip solved">Solved</span>}
                <DifficultyChip d={q.difficulty} />
              </Link>
            ))}
          </div>
        </section>
      )}
      {interviewSaved.length > 0 && (
        <section className="panel">
          <h2>Interview Glance</h2>
          <div className="stack-sm">{interviewSaved.map((item) => <Link key={item.item} className="q-link" to={`/t/${track}/interview-glance#${item.item}`}><span className="grow">{item.item.toUpperCase().replace('-', ' · ')}</span>{item.completed && <span className="chip solved">Revised</span>}{item.confidence && <span className="chip">Confidence {item.confidence}/5</span>}{item.lastReviewedAt && <span className="small muted">{new Date(item.lastReviewedAt).toLocaleDateString()}</span>}<span className="chip">Saved</span></Link>)}</div>
        </section>
      )}
    </div>
  );
}
