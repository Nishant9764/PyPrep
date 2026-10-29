import { config } from '../config';
import { QuestionDoc, parseTests } from '../models';
import { runCode, RunnerResponse } from './runnerClient';
import { HttpError } from '../utils/http';

interface AuthoredTest {
  args?: unknown[];
  kwargs?: Record<string, unknown>;
  expected?: unknown;
  stdout?: string;
  stdin?: string;
  inPlace?: boolean;
  program?: string;
  tags?: string[];
  hidden?: boolean;
  diagnosis?: string;
  note?: string;
}

export interface GradedTest {
  index: number; // index into the question's test list
  hidden: boolean;
  tags: string[];
  passed: boolean;
  diagnosis?: string;
  error?: string;
  skipped?: boolean;
  ms?: number;
  // Visible tests only:
  args?: unknown[];
  kwargs?: Record<string, unknown>;
  expected?: unknown;
  expectedStdout?: string;
  stdin?: string;
  program?: string;
  actual?: string;
  stdout?: string;
  note?: string;
}

export interface GradeOutcome {
  status: RunnerResponse['status'];
  message?: string;
  tests: GradedTest[]; // internal: carries tags for hidden tests as well
  limits?: RunnerResponse['limits'];
}

/** Only the fields the runner understands: authoring metadata (tags, diagnosis, hidden) stays here. */
function toRunnerTest(t: AuthoredTest) {
  const out: Record<string, unknown> = {};
  for (const k of ['args', 'kwargs', 'expected', 'stdout', 'stdin', 'inPlace', 'program'] as const) {
    if (t[k] !== undefined) out[k] = t[k];
  }
  return out;
}

export async function grade(
  question: QuestionDoc,
  language: string,
  code: string,
  scope: 'visible' | 'all',
): Promise<GradeOutcome> {
  if (code.length > config.maxCodeChars) throw new HttpError(413, `Code is too long (max ${config.maxCodeChars} characters).`);
  const all = parseTests(question) as AuthoredTest[];
  const selected = all.map((t, index) => ({ t, index })).filter(({ t }) => scope === 'all' || !t.hidden);
  const res = await runCode({
    language,
    code,
    entry: question.entry ?? '',
    tests: selected.map(({ t }) => toRunnerTest(t)),
  });

  const tests: GradedTest[] = selected.map(({ t, index }, i) => {
    const r = res.results.find((x) => x.index === i) ?? { index: i, passed: false, error: 'No result.' };
    const hidden = !!t.hidden;
    const g: GradedTest = {
      index,
      hidden,
      tags: t.tags ?? [],
      passed: !!r.passed,
      skipped: r.skipped,
      ms: r.ms,
      error: r.error,
      diagnosis: !r.passed ? t.diagnosis : undefined,
    };
    if (!hidden) {
      g.args = t.args;
      g.kwargs = t.kwargs;
      g.expected = t.expected;
      g.expectedStdout = t.stdout;
      g.stdin = t.stdin;
      g.program = t.program;
      g.actual = r.actual;
      g.stdout = r.stdout;
      g.note = t.note;
    }
    return g;
  });
  return { status: res.status, message: res.message, tests, limits: res.limits };
}

/**
 * What the browser may see. Hidden tests reveal only pass/fail, the authored diagnosis on failure
 * and a generic error type: never their inputs, expected values or the learner's output on them.
 */
export function toPublicTest(t: GradedTest) {
  if (t.hidden) {
    return {
      index: t.index,
      hidden: true,
      passed: t.passed,
      skipped: t.skipped,
      diagnosis: t.passed ? undefined : t.diagnosis,
      error: t.passed ? undefined : (t.error ?? '').split(':')[0].slice(0, 80) || undefined,
    };
  }
  const { tags: _tags, ...rest } = t;
  return rest;
}
