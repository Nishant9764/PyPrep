import type { VisibleTest } from './types';

/** Show a JSON value the way a Python programmer would write it. Handles the {"$float": "4.0"} marker. */
export function pyRepr(v: unknown): string {
  if (v === null || v === undefined) return 'None';
  if (v === true) return 'True';
  if (v === false) return 'False';
  if (typeof v === 'number') return Number.isInteger(v) ? String(v) : String(v);
  if (typeof v === 'string') return `'${v.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n')}'`;
  if (Array.isArray(v)) return `[${v.map(pyRepr).join(', ')}]`;
  if (typeof v === 'object') {
    const o = v as Record<string, unknown>;
    const keys = Object.keys(o);
    if (keys.length === 1 && keys[0] === '$float') return String(o.$float);
    return `{${keys.map((k) => `${pyRepr(k)}: ${pyRepr(o[k])}`).join(', ')}}`;
  }
  return String(v);
}

/** One-line description of how a test calls the learner's code. */
export function describeCall(entry: string, t: VisibleTest | { args?: unknown[]; kwargs?: Record<string, unknown>; program?: string }): string {
  if (t.program) return t.program;
  const args = (t.args ?? []).map(pyRepr);
  const kwargs = Object.entries(t.kwargs ?? {}).map(([k, v]) => `${k}=${pyRepr(v)}`);
  return `${entry}(${[...args, ...kwargs].join(', ')})`;
}
