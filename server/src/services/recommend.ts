import { isWeak, score, evidence, STRONG_THRESHOLD, WEAK_THRESHOLD } from './mastery';

export interface ConceptInfo {
  id: string;
  title: string;
  topic: string;
  lesson: string;
  prereqs: string[];
}

export interface QuestionInfo {
  slug: string;
  title: string;
  topic: string;
  difficulty: 'easy' | 'medium' | 'hard';
  kind: string;
  concepts: string[];
  order: number;
}

export interface MasteryInfo {
  concept: string;
  alpha: number;
  beta: number;
  lastPracticedAt?: Date | null;
}

export interface ProgressInfo {
  question: string;
  status: 'attempted' | 'solved';
  solvedIndependently?: boolean;
}

export interface Recommendation {
  concept: ConceptInfo;
  mastery: number;
  evidence: number;
  kind: 'weak' | 'step-back' | 'review';
  reason: string;
  /** When the weakness may come from a shaky prerequisite, that prerequisite concept. */
  rootCause?: { concept: ConceptInfo; mastery: number };
  questions: QuestionInfo[];
}

const DIFF_RANK = { easy: 0, medium: 1, hard: 2 } as const;

/** Pick the difficulty to aim at: easier when the learner is shakier. */
export function targetDifficulty(m: number): 'easy' | 'medium' | 'hard' {
  if (m < 0.45) return 'easy';
  if (m < 0.75) return 'medium';
  return 'hard';
}

function pickQuestions(
  conceptId: string,
  m: number,
  questions: QuestionInfo[],
  progress: Map<string, ProgressInfo>,
  exclude: Set<string>,
  limit = 3,
): QuestionInfo[] {
  const want = DIFF_RANK[targetDifficulty(m)];
  return questions
    .filter((q) => q.concepts.includes(conceptId) && !exclude.has(q.slug))
    .map((q) => {
      const p = progress.get(q.slug);
      // Unsolved first, then solved-with-help, then solved independently (least useful).
      const state = !p || p.status !== 'solved' ? 0 : p.solvedIndependently ? 2 : 1;
      return { q, state, gap: Math.abs(DIFF_RANK[q.difficulty] - want) };
    })
    .sort((a, b) => a.state - b.state || a.gap - b.gap || a.q.order - b.q.order)
    .slice(0, limit)
    .map((x) => x.q);
}

export function recommend(args: {
  concepts: ConceptInfo[];
  questions: QuestionInfo[];
  mastery: MasteryInfo[];
  progress: ProgressInfo[];
  now?: Date;
  limit?: number;
}): Recommendation[] {
  const now = args.now ?? new Date();
  const limit = args.limit ?? 4;
  const byId = new Map(args.concepts.map((c) => [c.id, c]));
  const mById = new Map(args.mastery.map((m) => [m.concept, m]));
  const progress = new Map(args.progress.map((p) => [p.question, p]));
  const used = new Set<string>();
  const out: Recommendation[] = [];

  const state = (id: string) => {
    const m = mById.get(id);
    return m ? { alpha: m.alpha, beta: m.beta } : { alpha: 1, beta: 1 };
  };

  // 1. Weak concepts. A weak concept whose prerequisite is ALSO weak is blamed on that prerequisite:
  //    group every weak concept under its root cause and work on the root first.
  const weak = args.mastery
    .filter((m) => byId.has(m.concept) && isWeak(state(m.concept)))
    .sort((a, b) => score(state(a.concept)) - score(state(b.concept)));

  const prereqChain = (id: string): string[] => {
    const chain: string[] = [];
    const walk = (cur: string, depth: number) => {
      if (depth > 2) return;
      for (const p of byId.get(cur)?.prereqs ?? []) {
        chain.push(p);
        walk(p, depth + 1);
      }
    };
    walk(id, 0);
    return chain;
  };
  const rootOf = (id: string): string => {
    const weakPrereqs = prereqChain(id)
      .filter((p) => mById.has(p) && isWeak(state(p)))
      .sort((a, b) => score(state(a)) - score(state(b)));
    return weakPrereqs[0] ?? id;
  };

  const groups = new Map<string, string[]>(); // root -> dependent weak concepts (excluding the root itself)
  for (const w of weak) {
    const root = rootOf(w.concept);
    const deps = groups.get(root) ?? [];
    if (root !== w.concept) deps.push(w.concept);
    groups.set(root, deps);
  }
  const roots = [...groups.keys()].sort((a, b) => score(state(a)) - score(state(b)));

  const handled = new Set<string>();
  for (const rootId of roots) {
    if (out.length >= limit) break;
    const target = byId.get(rootId)!;
    const dependents = groups.get(rootId)!.map((d) => byId.get(d)!).filter(Boolean);
    const m = score(state(rootId));
    const qs = pickQuestions(rootId, m, args.questions, progress, used);
    if (!qs.length) continue;
    qs.forEach((q) => used.add(q.slug));
    handled.add(rootId);
    dependents.forEach((d) => handled.add(d.id));
    const shown = dependents.slice(0, 2).map((d) => `"${d.title}"`);
    const names = dependents.length > 2 ? `${shown.join(', ')} and ${dependents.length - 2} other skills` : shown.join(' and ');
    out.push({
      concept: target,
      mastery: round(m),
      evidence: round(evidence(state(rootId))),
      kind: dependents.length ? 'step-back' : 'weak',
      reason: dependents.length
        ? `Your trouble with ${names} seems to trace back to "${target.title}", which also looks shaky. Strengthen that first.`
        : `Recent attempts suggest "${target.title}" needs more practice (${Math.round(m * 100)}% estimated mastery).`,
      rootCause: dependents.length ? { concept: target, mastery: round(m) } : undefined,
      questions: qs,
    });
  }

  // 2. Spaced review: concepts that looked fine but have not been touched for a while.
  if (out.length < limit) {
    const stale = args.mastery
      .filter((m) => {
        const s = state(m.concept);
        const days = m.lastPracticedAt ? (now.getTime() - new Date(m.lastPracticedAt).getTime()) / 86_400_000 : 0;
        return byId.has(m.concept) && !isWeak(s) && evidence(s) >= 1.5 && score(s) < STRONG_THRESHOLD + 0.1 && days >= 7;
      })
      .sort((a, b) => score(state(a.concept)) - score(state(b.concept)));
    for (const s of stale) {
      if (out.length >= limit) break;
      if (handled.has(s.concept)) continue;
      const concept = byId.get(s.concept)!;
      const qs = pickQuestions(concept.id, score(state(concept.id)), args.questions, progress, used, 2);
      if (!qs.length) continue;
      qs.forEach((q) => used.add(q.slug));
      handled.add(concept.id);
      out.push({
        concept,
        mastery: round(score(state(concept.id))),
        evidence: round(evidence(state(concept.id))),
        kind: 'review',
        reason: `You have not practised "${concept.title}" for a while. A quick review keeps it fresh.`,
        questions: qs,
      });
    }
  }
  return out;
}

export function nextUnsolved(questions: QuestionInfo[], progress: ProgressInfo[], topicOrder: string[]): QuestionInfo | null {
  const solved = new Set(progress.filter((p) => p.status === 'solved').map((p) => p.question));
  const order = new Map(topicOrder.map((t, i) => [t, i]));
  return (
    [...questions]
      .filter((q) => !solved.has(q.slug))
      .sort(
        (a, b) =>
          (order.get(a.topic) ?? 99) - (order.get(b.topic) ?? 99) ||
          DIFF_RANK[a.difficulty] - DIFF_RANK[b.difficulty] ||
          a.order - b.order,
      )[0] ?? null
  );
}

const round = (n: number) => Math.round(n * 100) / 100;
export { WEAK_THRESHOLD };
