import { useMemo } from 'react';
import type { ActivityDay } from '../types';

const CELL = 12;
const GAP = 3;
const LEFT = 28;
const TOP = 18;
const WEEKS = 53;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const parse = (s: string) => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
};
const fmt = (d: Date) => d.toISOString().slice(0, 10);

export function level(count: number): 0 | 1 | 2 | 3 | 4 {
  if (count <= 0) return 0;
  if (count <= 2) return 1;
  if (count <= 5) return 2;
  if (count <= 9) return 3;
  return 4;
}

/** A contribution-style graph: one square per day, the last 53 weeks, shaded by how much you did. */
export function Heatmap({ days, today }: { days: ActivityDay[]; today: string }) {
  const { cells, months, totalActive, totalSolves } = useMemo(() => {
    const byDate = new Map(days.map((d) => [d.date, d]));
    const end = parse(today);
    // Columns are weeks starting Sunday; the last column holds today.
    const start = new Date(end);
    start.setUTCDate(start.getUTCDate() - end.getUTCDay() - (WEEKS - 1) * 7);
    const cells: { x: number; y: number; date: string; day?: ActivityDay; future: boolean }[] = [];
    const months: { x: number; label: string }[] = [];
    let lastMonth = -1;
    let lastLabelWeek = -10;
    for (let w = 0; w < WEEKS; w++) {
      for (let dow = 0; dow < 7; dow++) {
        const d = new Date(start);
        d.setUTCDate(start.getUTCDate() + w * 7 + dow);
        const key = fmt(d);
        if (dow === 0 && d.getUTCMonth() !== lastMonth) {
          lastMonth = d.getUTCMonth();
          // skip a label that would collide with the previous one (partial first month)
          if (!months.length || w - lastLabelWeek >= 3) {
            months.push({ x: LEFT + w * (CELL + GAP), label: MONTHS[lastMonth] });
            lastLabelWeek = w;
          }
        }
        cells.push({ x: LEFT + w * (CELL + GAP), y: TOP + dow * (CELL + GAP), date: key, day: byDate.get(key), future: key > today });
      }
    }
    return {
      cells,
      months,
      totalActive: days.filter((d) => d.count > 0).length,
      totalSolves: days.reduce((n, d) => n + d.solves, 0),
    };
  }, [days, today]);

  const width = LEFT + WEEKS * (CELL + GAP);
  const height = TOP + 7 * (CELL + GAP);

  return (
    <div>
      <div className="heat-wrap">
        <svg
          className="heat"
          width={width}
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          role="img"
          aria-label={`Activity over the last year: ${totalActive} active days and ${totalSolves} questions solved.`}
        >
          {months.map((m, i) => (
            <text key={i} x={m.x} y={10}>
              {m.label}
            </text>
          ))}
          {['Mon', 'Wed', 'Fri'].map((l, i) => (
            <text key={l} x={0} y={TOP + (i * 2 + 1) * (CELL + GAP) + CELL - 2}>
              {l}
            </text>
          ))}
          {cells.map((c) =>
            c.future ? null : (
              <rect key={c.date} className="cell" x={c.x} y={c.y} width={CELL} height={CELL} fill={`var(--heat-${level(c.day?.count ?? 0)})`}>
                <title>
                  {c.day && c.day.count > 0
                    ? `${c.date}: ${c.day.submissions} submission${c.day.submissions === 1 ? '' : 's'}, ${c.day.solves} solved, ${c.day.lessons} lesson${c.day.lessons === 1 ? '' : 's'}, ${c.day.revisions} interview revision${c.day.revisions === 1 ? '' : 's'}`
                    : `${c.date}: no activity`}
                </title>
              </rect>
            ),
          )}
        </svg>
      </div>
      <div className="row between" style={{ marginTop: '0.5rem' }}>
        <span className="small muted">
          {totalActive} active day{totalActive === 1 ? '' : 's'} in the last year
        </span>
        <div className="heat-legend" aria-hidden="true">
          Less
          {[0, 1, 2, 3, 4].map((l) => (
            <i key={l} style={{ background: `var(--heat-${l})` }} />
          ))}
          More
        </div>
      </div>
    </div>
  );
}
