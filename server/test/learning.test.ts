import { describe, expect, it } from 'vitest';
import { collectEvidence, isWeak, score, update, evidence } from '../src/services/mastery';
import { diagnose } from '../src/services/diagnosis';
import { recommend, targetDifficulty } from '../src/services/recommend';
import { streaks } from '../src/services/learnerState';
import { encodeIntegralFloats } from '../src/utils/floats';

describe('mastery', () => {
  const prior = { alpha: 1, beta: 1 };

  it('starts at 0.5 with no evidence, and is not "weak" without data', () => {
    expect(score(prior)).toBe(0.5);
    expect(evidence(prior)).toBe(0);
    expect(isWeak(prior)).toBe(false);
  });

  it('passes raise the score and failures lower it', () => {
    expect(score(update(prior, { passed: 3, failed: 0 }))).toBeGreaterThan(0.7);
    expect(score(update(prior, { passed: 0, failed: 3 }))).toBeLessThan(0.3);
  });

  it('repeated failures make a concept weak', () => {
    let s = prior;
    for (let i = 0; i < 3; i++) s = update(s, { passed: 0, failed: 2 });
    expect(isWeak(s)).toBe(true);
  });

  it('recent behaviour outweighs old: failing then succeeding recovers', () => {
    let s = update(prior, { passed: 0, failed: 3 });
    for (let i = 0; i < 6; i++) s = update(s, { passed: 3, failed: 0 });
    expect(score(s)).toBeGreaterThan(0.75);
    expect(isWeak(s)).toBe(false);
  });

  it('a pass that needed the solution counts for less', () => {
    const independent = update(prior, { passed: 3, failed: 0 });
    const assisted = update(prior, { passed: 3, failed: 0 }, { assisted: true });
    expect(score(assisted)).toBeLessThan(score(independent));
  });

  it('collects evidence per concept from tagged tests', () => {
    const e = collectEvidence([
      { tags: ['a', 'b'], passed: true },
      { tags: ['a'], passed: false },
    ]);
    expect(e.find((x) => x.concept === 'a')).toEqual({ concept: 'a', passed: 1, failed: 1 });
    expect(e.find((x) => x.concept === 'b')).toEqual({ concept: 'b', passed: 1, failed: 0 });
  });
});

describe('diagnosis: telling WHICH skill is the problem', () => {
  it('returns nothing when every test passes', () => {
    const d = diagnose([{ tags: ['slice-step'], passed: true }], ['slice-step']);
    expect(d.suspects).toHaveLength(0);
    expect(d.cleared).toContain('slice-step');
  });

  it('blames the concept whose tests fail and clears the ones that pass', () => {
    // "every other character from the end": plain index test passes, bounds pass, negative-step test fails
    const d = diagnose(
      [
        { tags: ['string-indexing'], passed: true },
        { tags: ['slicing'], passed: true },
        { tags: ['slice-step'], passed: false, diagnosis: 'A negative step walks right-to-left and flips the default start and stop.' },
        { tags: ['iteration-direction'], passed: true },
      ],
      ['string-indexing', 'slicing', 'slice-step', 'iteration-direction'],
    );
    expect(d.suspects[0].concept).toBe('slice-step');
    expect(d.suspects[0].reasons[0]).toMatch(/negative step/);
    expect(d.cleared).toEqual(expect.arrayContaining(['string-indexing', 'slicing', 'iteration-direction']));
    expect(d.suspects.map((s) => s.concept)).not.toContain('string-indexing');
  });

  it('distinguishes direction from indexing for a loop-based reversal', () => {
    const d = diagnose(
      [
        { tags: ['for-loops'], passed: true },
        { tags: ['iteration-direction'], passed: false },
        { tags: ['iteration-direction'], passed: false },
        { tags: ['off-by-one'], passed: true },
      ],
      ['for-loops', 'iteration-direction', 'off-by-one'],
    );
    expect(d.suspects[0].concept).toBe('iteration-direction');
    expect(d.cleared).toContain('off-by-one');
  });

  it('uses the learner history to break ties between equally failing concepts', () => {
    const tests = [
      { tags: ['slice-step'], passed: false },
      { tags: ['iteration-direction'], passed: false },
      { tags: ['slicing'], passed: true },
    ];
    const d = diagnose(tests, ['slice-step', 'iteration-direction', 'slicing'], { 'slice-step': 0.9, 'iteration-direction': 0.2 });
    expect(d.suspects[0].concept).toBe('iteration-direction');
  });

  it('when everything fails it says so and favours a weak prerequisite', () => {
    const d = diagnose(
      [
        { tags: ['slice-step'], passed: false },
        { tags: ['slicing'], passed: false },
      ],
      ['slice-step', 'slicing'],
      { slicing: 0.3 },
      { 'slice-step': ['slicing'] },
    );
    expect(d.allFailed).toBe(true);
    expect(d.notes.join(' ')).toMatch(/cannot tell which skill/);
    expect(d.suspects[0].concept).toBe('slicing');
  });

  it('turns an IndexError into evidence for off-by-one / indexing', () => {
    const d = diagnose(
      [
        { tags: ['off-by-one'], passed: false, error: 'IndexError: list index out of range (line 4)' },
        { tags: ['accumulator-pattern'], passed: false },
      ],
      ['off-by-one', 'accumulator-pattern'],
    );
    expect(d.suspects[0].concept).toBe('off-by-one');
    expect(d.notes.join(' ')).toMatch(/IndexError/);
  });

  it('confidences are normalised', () => {
    const d = diagnose(
      [
        { tags: ['a'], passed: false },
        { tags: ['b'], passed: false },
        { tags: ['c'], passed: true },
      ],
      ['a', 'b', 'c'],
    );
    const sum = d.suspects.reduce((x, s) => x + s.confidence, 0);
    expect(sum).toBeGreaterThan(0.97);
    expect(sum).toBeLessThan(1.03);
  });
});

describe('recommendations: targeted practice', () => {
  const concepts = [
    { id: 'slicing', title: 'Slicing', topic: 'strings', lesson: 'indexing-and-slicing', prereqs: ['string-indexing'] },
    { id: 'string-indexing', title: 'Indexing', topic: 'strings', lesson: 'indexing-and-slicing', prereqs: [] },
    { id: 'slice-step', title: 'Slice step', topic: 'strings', lesson: 'indexing-and-slicing', prereqs: ['slicing'] },
  ];
  const q = (slug: string, difficulty: 'easy' | 'medium' | 'hard', cs: string[], order = 0) => ({
    slug, title: slug, topic: 'strings', difficulty, kind: 'practice', concepts: cs, order,
  });
  const questions = [
    q('idx-easy', 'easy', ['string-indexing'], 0),
    q('slice-easy', 'easy', ['slicing'], 1),
    q('slice-hard', 'hard', ['slicing'], 2),
    q('step-med', 'medium', ['slice-step'], 3),
  ];
  const weakState = { alpha: 1.5, beta: 4 }; // ~27%
  const okState = { alpha: 4, beta: 1.2 };

  it('recommends nothing for a brand-new learner', () => {
    expect(recommend({ concepts, questions, mastery: [], progress: [] })).toEqual([]);
  });

  it('picks an easier question for a shakier concept', () => {
    expect(targetDifficulty(0.3)).toBe('easy');
    expect(targetDifficulty(0.6)).toBe('medium');
    expect(targetDifficulty(0.9)).toBe('hard');
    const recs = recommend({ concepts, questions, mastery: [{ concept: 'slicing', ...weakState }], progress: [] });
    expect(recs[0].concept.id).toBe('slicing');
    expect(recs[0].questions[0].slug).toBe('slice-easy');
  });

  it('steps back to a weak prerequisite instead of drilling the dependent concept', () => {
    const recs = recommend({
      concepts,
      questions,
      mastery: [
        { concept: 'slice-step', ...weakState },
        { concept: 'slicing', alpha: 1.3, beta: 4.5 },
        { concept: 'string-indexing', ...okState },
      ],
      progress: [],
    });
    expect(recs[0].kind).toBe('step-back');
    expect(recs[0].concept.id).toBe('slicing');
    expect(recs[0].rootCause?.concept.id).toBe('slicing');
    expect(recs[0].reason).toMatch(/Strengthen that first/);
  });

  it('prefers questions the learner has not solved yet', () => {
    const recs = recommend({
      concepts,
      questions,
      mastery: [{ concept: 'slicing', ...weakState }],
      progress: [{ question: 'slice-easy', status: 'solved', solvedIndependently: true }],
    });
    expect(recs[0].questions[0].slug).toBe('slice-hard');
  });

  it('suggests spaced review for stale, decent-but-not-mastered concepts', () => {
    const old = new Date(Date.now() - 20 * 86_400_000);
    const recs = recommend({
      concepts,
      questions,
      mastery: [{ concept: 'string-indexing', alpha: 3, beta: 1.6, lastPracticedAt: old }],
      progress: [],
    });
    expect(recs[0]?.kind).toBe('review');
  });
});

describe('streaks', () => {
  it('counts consecutive days ending today', () => {
    expect(streaks(['2026-10-25', '2026-10-26', '2026-10-27'], '2026-10-27')).toEqual({ current: 3, longest: 3 });
  });
  it('keeps the streak alive if today is not over yet', () => {
    expect(streaks(['2026-10-25', '2026-10-26'], '2026-10-27').current).toBe(2);
  });
  it('breaks after a missed day, but remembers the longest run', () => {
    const r = streaks(['2026-10-01', '2026-10-02', '2026-10-03', '2026-10-20'], '2026-10-27');
    expect(r).toEqual({ current: 0, longest: 3 });
  });
});

describe('integral float protection', () => {
  it('keeps 4.0 distinguishable from 4 across JSON in Node', () => {
    const raw = '{"args":[4.0,4,-2.0,1.5,1e3,"a 3.0 in text"],"s":"x\\"3.0"}';
    const parsed = JSON.parse(encodeIntegralFloats(raw));
    expect(parsed.args[0]).toEqual({ $float: '4.0' });
    expect(parsed.args[1]).toBe(4);
    expect(parsed.args[2]).toEqual({ $float: '-2.0' });
    expect(parsed.args[3]).toBe(1.5);
    expect(parsed.args[4]).toEqual({ $float: '1e3' });
    expect(parsed.args[5]).toBe('a 3.0 in text');
  });
});
