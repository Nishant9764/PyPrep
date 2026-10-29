/**
 * Knowledge tracing, kept deliberately simple and explainable.
 *
 * Each (learner, concept) pair holds a Beta(alpha, beta) belief about "can this learner apply
 * this concept?". Every graded test that probes the concept is evidence:
 *   - pass  -> alpha grows,   fail -> beta grows
 *   - old evidence decays, so recent behaviour counts more than what happened a month ago
 *   - a pass that needed the solution or two+ hints counts for less ("assisted")
 * score = alpha / (alpha + beta). With no evidence the score is 0.5 and `evidence` is 0, so the
 * UI can show "not enough data" rather than inventing a number.
 */

export interface MasteryState {
  alpha: number;
  beta: number;
}

export interface ConceptEvidence {
  concept: string;
  passed: number; // tests probing this concept that passed in this submission
  failed: number; // tests probing this concept that failed in this submission
}

export const PRIOR: MasteryState = { alpha: 1, beta: 1 };
export const DECAY = 0.9; // applied to accumulated evidence on every update of that concept
export const ASSISTED_PASS_WEIGHT = 0.5;
export const WEAK_THRESHOLD = 0.6;
export const STRONG_THRESHOLD = 0.8;
export const MIN_EVIDENCE_FOR_WEAK = 1.5;

export const score = (s: MasteryState): number => s.alpha / (s.alpha + s.beta);
export const evidence = (s: MasteryState): number => s.alpha + s.beta - 2;

export function isWeak(s: MasteryState): boolean {
  return evidence(s) >= MIN_EVIDENCE_FOR_WEAK && score(s) < WEAK_THRESHOLD;
}

export function update(
  prev: MasteryState,
  e: Pick<ConceptEvidence, 'passed' | 'failed'>,
  opts: { assisted?: boolean } = {},
): MasteryState {
  const n = e.passed + e.failed;
  if (n === 0) return prev;
  // Evidence from a single submission is capped so that one big test file cannot dominate.
  const weight = Math.min(n, 3) / n;
  const passW = e.passed * weight * (opts.assisted ? ASSISTED_PASS_WEIGHT : 1);
  const failW = e.failed * weight * 1.25; // a failure is slightly more informative than a pass
  return {
    alpha: PRIOR.alpha + (prev.alpha - PRIOR.alpha) * DECAY + passW,
    beta: PRIOR.beta + (prev.beta - PRIOR.beta) * DECAY + failW,
  };
}

/** Group per-test outcomes into per-concept evidence for one submission. */
export function collectEvidence(
  tests: Array<{ tags: string[]; passed: boolean }>,
): ConceptEvidence[] {
  const map = new Map<string, ConceptEvidence>();
  for (const t of tests) {
    for (const concept of t.tags) {
      const e = map.get(concept) ?? { concept, passed: 0, failed: 0 };
      if (t.passed) e.passed++;
      else e.failed++;
      map.set(concept, e);
    }
  }
  return [...map.values()];
}
