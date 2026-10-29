import { Types } from 'mongoose';
import { ActivityDay, Concept, Mastery } from '../models';
import { MasteryState, collectEvidence, score, update } from './mastery';

/** Mongo map keys cannot contain "." or start with "$"; swap in look-alike characters and reverse on read. */
export const encodeKey = (s: string) => s.replace(/\./g, '\uFF0E').replace(/\$/g, '\uFF04');
export const decodeKey = (s: string) => s.replace(/\uFF0E/g, '.').replace(/\uFF04/g, '$');

export async function bumpActivity(
  user: Types.ObjectId,
  track: string,
  date: string,
  inc: { submissions?: number; solves?: number; lessons?: number; revisions?: number },
): Promise<void> {
  await ActivityDay.updateOne({ user, track, date }, { $inc: inc }, { upsert: true });
}

/** Apply one submission's evidence to the learner's concept mastery documents. */
export async function recordEvidence(
  user: Types.ObjectId,
  track: string,
  tests: Array<{ tags: string[]; passed: boolean; diagnosis?: string }>,
  assisted: boolean,
): Promise<void> {
  const evidence = collectEvidence(tests);
  if (!evidence.length) return;
  const docs = await Mastery.find({ user, track, concept: { $in: evidence.map((e) => e.concept) } });
  const byConcept = new Map(docs.map((d) => [d.concept, d]));
  const now = new Date();
  for (const e of evidence) {
    const doc = byConcept.get(e.concept) ?? new Mastery({ user, track, concept: e.concept });
    const next: MasteryState = update({ alpha: doc.alpha, beta: doc.beta }, e, { assisted });
    doc.alpha = next.alpha;
    doc.beta = next.beta;
    doc.attempts += 1;
    doc.lastPracticedAt = now;
    if (e.failed > 0) {
      doc.failures += 1;
      doc.lastFailedAt = now;
      for (const t of tests) {
        if (!t.passed && t.diagnosis && t.tags.includes(e.concept)) {
          const key = encodeKey(t.diagnosis.slice(0, 200));
          doc.misconceptions.set(key, (doc.misconceptions.get(key) ?? 0) + 1);
        }
      }
    }
    await doc.save();
  }
}

export async function masteryScores(user: Types.ObjectId, track: string): Promise<Record<string, number>> {
  const docs = await Mastery.find({ user, track });
  return Object.fromEntries(docs.map((d) => [d.concept, score({ alpha: d.alpha, beta: d.beta })]));
}

export async function prereqMap(track: string): Promise<Record<string, string[]>> {
  const concepts = await Concept.find({ track }).lean();
  return Object.fromEntries(concepts.map((c) => [c.id, c.prereqs ?? []]));
}

/** Current and longest streak of consecutive active days, given sorted-or-unsorted YYYY-MM-DD strings. */
export function streaks(dates: string[], today: string): { current: number; longest: number } {
  const set = new Set(dates);
  const toDay = (s: string) => Math.floor(Date.parse(s + 'T00:00:00Z') / 86_400_000);
  const days = [...set].map(toDay).sort((a, b) => a - b);
  let longest = 0;
  let run = 0;
  let prev = -Infinity;
  for (const d of days) {
    run = d === prev + 1 ? run + 1 : 1;
    longest = Math.max(longest, run);
    prev = d;
  }
  // Current streak ends today, or yesterday (the day is not over yet, so the streak is still alive).
  let cur = 0;
  let d = toDay(today);
  if (!set.has(today)) d -= 1;
  const daySet = new Set(days);
  while (daySet.has(d)) {
    cur++;
    d--;
  }
  return { current: cur, longest };
}
