import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useApi } from '../api';
import { DifficultyChip, ErrorBox, Loading, PageHead, StatusChip } from '../components/ui';
import type { QuestionRow, TrackOverview } from '../types';

export function PracticeList() {
  const { track = 'python' } = useParams();
  const [params, setParams] = useSearchParams();
  const overview = useApi<TrackOverview>(`/tracks/${track}`);
  const qs = new URLSearchParams();
  for (const k of ['topic', 'difficulty', 'kind', 'status', 'bookmarked']) {
    const v = params.get(k);
    if (v) qs.set(k, v);
  }
  const { data, error, loading, reload } = useApi<{ questions: QuestionRow[] }>(`/tracks/${track}/questions?${qs}`);

  const setFilter = (k: string, v: string) => {
    const next = new URLSearchParams(params);
    if (v) next.set(k, v);
    else next.delete(k);
    setParams(next, { replace: true });
  };
  const topicTitle = new Map(overview.data?.topics.map((t) => [t.slug, t.title]));
  const groups = new Map<string, QuestionRow[]>();
  data?.questions.forEach((q) => groups.set(q.topic, [...(groups.get(q.topic) ?? []), q]));

  const select = (id: string, label: string, options: [string, string][]) => (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <select id={id} className="input" value={params.get(id) ?? ''} onChange={(e) => setFilter(id, e.target.value)}>
        <option value="">All</option>
        {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
    </div>
  );

  return (
    <div className="page">
      <PageHead title="Practice">
        <p>Every problem has visible examples, hidden tests, three hints and a worked solution. Interview problems are phrased the way they come up in screens.</p>
      </PageHead>
      <div className="filters" role="search" aria-label="Filter questions">
        {select('topic', 'Topic', (overview.data?.topics ?? []).map((t) => [t.slug, t.title]))}
        {select('difficulty', 'Difficulty', [['easy', 'Easy'], ['medium', 'Medium'], ['hard', 'Hard']])}
        {select('kind', 'Type', [['practice', 'Practice'], ['interview', 'Interview']])}
        {select('status', 'Status', [['unsolved', 'Not started'], ['attempted', 'In progress'], ['solved', 'Solved']])}
        {select('bookmarked', 'Saved', [['true', 'Saved only']])}
      </div>
      {error && <ErrorBox error={error} retry={reload} />}
      {loading && !data && <Loading lines={6} />}
      {data && data.questions.length === 0 && <div className="empty">No questions match these filters. Clear a filter to see more.</div>}
      {[...groups.entries()].map(([topic, qs2]) => (
        <section key={topic} className="panel q-list" aria-label={topicTitle.get(topic) ?? topic}>
          <div className="topic-head">{topicTitle.get(topic) ?? topic}</div>
          {qs2.map((q) => (
            <Link key={q.slug} className="q-row" to={`/t/${track}/practice/${q.slug}`}>
              <div className="stack-sm">
                <strong>{q.title}{q.bookmarked && <span className="sr-only"> (saved)</span>}</strong>
                <span className="small muted">About {q.estimatedMinutes} min</span>
              </div>
              <div className="meta">
                {q.bookmarked && <span className="chip" aria-hidden="true">Saved</span>}
                {q.kind === 'interview' && <span className="chip interview">Interview</span>}
                <StatusChip s={q.status} />
                <DifficultyChip d={q.difficulty} />
              </div>
            </Link>
          ))}
        </section>
      ))}
    </div>
  );
}
