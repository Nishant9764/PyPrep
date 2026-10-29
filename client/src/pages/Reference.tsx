import { Link, useParams } from 'react-router-dom';
import { useApi } from '../api';
import { Markdown } from '../components/Markdown';
import { ErrorBox, Loading, PageHead } from '../components/ui';

export function Reference() {
  const { track = 'python', topic = '' } = useParams();
  const { data, error, loading, reload } = useApi<{ reference: { title: string; body: string } }>(`/tracks/${track}/topics/${topic}/reference`);
  return (
    <div className="page">
      <p className="small"><Link to={`/t/${track}/learn`}>All lessons</Link></p>
      {error && <ErrorBox error={error} retry={reload} />}
      {loading && !data && <Loading lines={6} />}
      {data && (
        <>
          <PageHead title={data.reference.title}>
            <p>A quick lookup for syntax. If an idea is unfamiliar, the lessons explain it from scratch.</p>
          </PageHead>
          <Markdown variant="compact">{data.reference.body}</Markdown>
        </>
      )}
    </div>
  );
}
