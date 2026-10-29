/**
 * Diagnosis: turn "3 of 6 tests failed" into "you are probably stuck on X".
 *
 * Questions are authored so that different tests probe different concepts (a negative-step test
 * probes `iteration-direction`, an empty-string test probes `slicing`, ...). The signal comes from
 * the *pattern* of passes and failures:
 *   - a concept whose tests all PASS is cleared, however many other tests fail;
 *   - a concept whose tests FAIL while the learner's history for it is already shaky is the prime suspect;
 *   - when everything fails, tests cannot separate the concepts, so history and prerequisites decide.
 * Runtime errors add weaker evidence (an IndexError points at indexing / off-by-one).
 */

export interface DiagnosableTest {
  tags: string[];
  passed: boolean;
  diagnosis?: string;
  error?: string;
}

export interface Suspect {
  concept: string;
  confidence: number; // 0..1, relative likelihood that this is the sticking point
  failedTests: number;
  totalTests: number;
  reasons: string[]; // authored diagnosis messages (deduplicated) that triggered
  partial: boolean; // true when other tests on the same concept passed
}

export interface DiagnosisResult {
  suspects: Suspect[];
  cleared: string[]; // concepts the learner demonstrably handled in this submission
  allFailed: boolean;
  notes: string[];
}

const ERROR_HINTS: Array<{ pattern: RegExp; concepts: string[]; note: string }> = [
  { pattern: /IndexError/, concepts: ['off-by-one', 'string-indexing', 'list-basics'], note: 'IndexError: you asked for a position that does not exist. Check the first and last valid index (0 and len-1).' },
  { pattern: /KeyError/, concepts: ['dict-basics'], note: 'KeyError: that key is not in the dictionary yet. Use .get() or check with `in` first.' },
  { pattern: /UnboundLocalError/, concepts: ['scope'], note: 'UnboundLocalError: assigning to a name inside a function makes it local for the whole function.' },
  { pattern: /RecursionError|maximum recursion/, concepts: ['recursion'], note: 'RecursionError: the recursion never reaches a base case (or the base case is wrong).' },
  { pattern: /TypeError.*(NoneType|None)/, concepts: ['return-values', 'mutability-aliasing'], note: 'You are using None as a value. Did a function forget to `return`, or did you use the result of an in-place method like list.sort()?' },
  { pattern: /Time limit/, concepts: ['while-loops', 'complexity'], note: 'Time limit: an infinite loop (the loop variable never changes) or an algorithm that is too slow for the input size.' },
  { pattern: /StopIteration/, concepts: ['iterators', 'generators'], note: 'StopIteration: the iterator was already exhausted.' },
  { pattern: /AttributeError/, concepts: ['classes-objects', 'instance-vs-class'], note: 'AttributeError: the object does not have that attribute. Was it set on self in __init__?' },
];

export function diagnose(
  tests: DiagnosableTest[],
  questionConcepts: string[],
  masteryScores: Record<string, number> = {},
  prereqs: Record<string, string[]> = {},
): DiagnosisResult {
  const notes: string[] = [];
  const stats = new Map<string, { passed: number; failed: number; reasons: Set<string> }>();
  for (const t of tests) {
    for (const c of t.tags) {
      const s = stats.get(c) ?? { passed: 0, failed: 0, reasons: new Set<string>() };
      if (t.passed) s.passed++;
      else {
        s.failed++;
        if (t.diagnosis) s.reasons.add(t.diagnosis);
      }
      stats.set(c, s);
    }
  }

  const failedTests = tests.filter((t) => !t.passed);
  const allFailed = tests.length > 0 && failedTests.length === tests.length;

  // Runtime errors: weak extra evidence, restricted to concepts this question actually covers.
  const errorBoost = new Map<string, number>();
  const seenNotes = new Set<string>();
  for (const t of failedTests) {
    if (!t.error) continue;
    for (const h of ERROR_HINTS) {
      if (!h.pattern.test(t.error)) continue;
      if (!seenNotes.has(h.note)) {
        seenNotes.add(h.note);
        notes.push(h.note);
      }
      for (const c of h.concepts) {
        if (questionConcepts.includes(c) || stats.has(c)) errorBoost.set(c, (errorBoost.get(c) ?? 0) + 0.25);
      }
    }
  }

  const suspects: Suspect[] = [];
  const cleared: string[] = [];
  for (const [concept, s] of stats) {
    const total = s.passed + s.failed;
    if (s.failed === 0) {
      cleared.push(concept);
      continue;
    }
    // Base: fraction of this concept's tests that failed. Partial failures are less alarming
    // than "every test on this concept failed".
    let weight = s.failed / total;
    if (s.passed > 0) weight *= 0.8;
    // History: a concept the learner is already shaky on is a likelier culprit.
    const m = masteryScores[concept];
    if (m !== undefined) weight *= 0.75 + (1 - m) * 0.5; // 0.75 (mastered) .. 1.25 (very weak)
    weight += errorBoost.get(concept) ?? 0;
    suspects.push({
      concept,
      confidence: weight,
      failedTests: s.failed,
      totalTests: total,
      reasons: [...s.reasons].slice(0, 3),
      partial: s.passed > 0,
    });
  }

  // When everything failed the tests cannot separate concepts: lean on prerequisites. If a
  // suspect has a prerequisite that is ALSO a suspect/weak, the prerequisite is the root cause.
  if (allFailed && suspects.length > 1) {
    notes.push(
      'Every test failed, so the tests cannot tell which skill is the problem. The ranking below uses your history and prerequisite order; fix the first one and re-run.',
    );
    const byId = new Map(suspects.map((s) => [s.concept, s]));
    for (const s of suspects) {
      for (const p of prereqs[s.concept] ?? []) {
        const ps = byId.get(p);
        if (ps) ps.confidence += 0.15 * s.confidence;
        else if (masteryScores[p] !== undefined && masteryScores[p] < 0.6) {
          suspects.push({ concept: p, confidence: 0.4 * s.confidence, failedTests: 0, totalTests: 0, reasons: [], partial: false });
          byId.set(p, suspects[suspects.length - 1]);
        }
      }
    }
  }

  suspects.sort((a, b) => b.confidence - a.confidence);
  const top = suspects[0]?.confidence ?? 0;
  const sum = suspects.reduce((acc, s) => acc + s.confidence, 0) || 1;
  for (const s of suspects) s.confidence = Math.round((s.confidence / sum) * 100) / 100;
  if (top > 0 && suspects.length > 0) {
    suspects.splice(4); // keep the top few; more than that is noise
  }

  return { suspects, cleared, allFailed, notes };
}
