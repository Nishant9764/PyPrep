import { describeCall, pyRepr } from '../pyrepr';
import type { TestResult } from '../types';

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <>
      <span>{label}</span>
      <div>{children}</div>
    </>
  );
}

export function TestResults({ tests, entry }: { tests: TestResult[]; entry: string }) {
  let hiddenNo = 0;
  return (
    <div className="stack-sm">
      {tests.map((t) => {
        const cls = t.skipped ? 'skip' : t.passed ? 'pass' : 'fail';
        const label = t.hidden
          ? `Hidden test ${++hiddenNo}`
          : describeCall(entry, { args: t.args, kwargs: t.kwargs, program: t.program });
        return (
          <details key={`${t.hidden ? 'h' : 'v'}${t.index}`} className={`test ${cls}`} open={!t.passed && !t.hidden && !t.skipped}>
            <summary>
              <span className="chip" style={{ minWidth: '4.2rem', justifyContent: 'center' }}>
                {t.skipped ? 'Not run' : t.passed ? 'Passed' : 'Failed'}
              </span>
              <code>{label.length > 90 ? label.slice(0, 90) + '…' : label}</code>
            </summary>
            <div className="kv">
              {!t.hidden && t.note && <Row label="About">{t.note}</Row>}
              {!t.hidden && t.stdin !== undefined && <Row label="Input"><pre>{t.stdin}</pre></Row>}
              {!t.hidden && t.expectedStdout !== undefined && <Row label="Expected output"><pre>{t.expectedStdout}</pre></Row>}
              {!t.hidden && t.expected !== undefined && <Row label="Expected"><code>{pyRepr(t.expected)}</code></Row>}
              {!t.hidden && t.expectedStdout === undefined && t.actual !== undefined && !t.error && (
                <Row label="Your result"><code>{t.actual}</code></Row>
              )}
              {!t.hidden && t.expectedStdout !== undefined && t.stdout !== undefined && <Row label="Your output"><pre>{t.stdout}</pre></Row>}
              {!t.hidden && t.expectedStdout === undefined && t.stdout && <Row label="You printed"><pre>{t.stdout}</pre></Row>}
              {t.error && <Row label="Error"><code>{t.error}</code></Row>}
              {t.hidden && !t.passed && !t.skipped && (
                <Row label="Hidden test">Its input is not shown. Think about edge cases: empty input, one item, repeated values, negatives.</Row>
              )}
              {t.diagnosis && !t.passed && <Row label="Likely cause"><span>{t.diagnosis}</span></Row>}
            </div>
          </details>
        );
      })}
    </div>
  );
}
