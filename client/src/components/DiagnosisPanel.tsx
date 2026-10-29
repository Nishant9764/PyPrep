import { Link } from 'react-router-dom';
import type { SubmitResult } from '../types';
import { DifficultyChip } from './ui';

/**
 * The centrepiece of the learning loop: not just "wrong", but which underlying skill the pattern of
 * passes and failures points to, why, where to review it and what to practise next.
 */
export function DiagnosisPanel({ result, track }: { result: SubmitResult; track: string }) {
  const d = result.diagnosis;
  if (!d || (!d.suspects.length && !d.notes.length)) return null;
  const top = d.suspects[0];
  return (
    <section className="diag" aria-labelledby="diag-title">
      <div className="stack-sm">
        <h3 id="diag-title">Where this is going wrong</h3>
        {top && !d.allFailed && (
          <p>
            Your results point most strongly at <span className="mark">{top.title}</span>.
            {d.cleared.length > 0 && ' The other skills this question tests held up.'}
          </p>
        )}
        {top && d.allFailed && (
          <p>
            Nothing passed yet, so this run cannot single out one skill. Going by your history and what builds on what, check{' '}
            <span className="mark">{top.title}</span> first.
          </p>
        )}
      </div>

      {d.suspects.map((s, i) => (
        <div key={s.concept} className="suspect">
          <div className="row between">
            <strong>{i === 0 ? <span className="mark">{s.title}</span> : s.title}</strong>
            <span className="small muted">
              {s.totalTests > 0
                ? `${s.failedTests} of ${s.totalTests} related test${s.totalTests === 1 ? '' : 's'} failed${s.partial ? ' (some passed)' : ''}`
                : 'underlying skill'}
            </span>
          </div>
          <div className="bar mark-bar" role="img" aria-label={`${Math.round(s.confidence * 100)}% likelihood`}>
            <span style={{ width: `${Math.round(s.confidence * 100)}%` }} />
          </div>
          {s.description && <p className="small muted">{s.description}</p>}
          {s.reasons.length > 0 && (
            <ul className="small">
              {s.reasons.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
          )}
          {s.lesson && (
            <p className="small">
              <Link to={`/t/${track}/learn/${s.lesson.topic}/${s.lesson.slug}`}>Review the lesson on this</Link>
            </p>
          )}
        </div>
      ))}

      {d.notes.filter((n) => !(d.allFailed && n.startsWith('Every test failed'))).map((n) => (
        <p key={n} className="small">
          {n}
        </p>
      ))}

      {d.cleared.length > 0 && (
        <div className="cleared small">
          <span>You handled:</span>
          {d.cleared.map((c) => (
            <span key={c.id} className="chip">
              {c.title}
            </span>
          ))}
        </div>
      )}

      {result.stuck && (
        <div className="alert info" role="status">
          <strong>Same sticking point three times in a row</strong>
          Instead of another attempt at this question, step back to <b>{result.stuck.title}</b>.
          {result.stuck.lesson && (
            <>
              {' '}
              <Link to={`/t/${track}/learn/${result.stuck.lesson.topic}/${result.stuck.lesson.slug}`}>Re-read the lesson</Link>, then try a smaller question:
            </>
          )}
          {result.stuck.practice.length > 0 && (
            <div className="stack-sm" style={{ marginTop: '0.6rem' }}>
              {result.stuck.practice.map((p) => (
                <Link key={p.slug} className="q-link" to={`/t/${track}/practice/${p.slug}`}>
                  <span className="grow">{p.title}</span>
                  <DifficultyChip d={p.difficulty} />
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
