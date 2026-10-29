import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { Attempt, Concept, Question, QuestionDoc, QuestionProgress, Track } from '../models';
import { requireAuth } from '../middleware/auth';
import { config } from '../config';
import { HttpError, localDate, wrap } from '../utils/http';
import { grade, toPublicTest } from '../services/grading';
import { diagnose } from '../services/diagnosis';
import { bumpActivity, masteryScores, prereqMap, recordEvidence } from '../services/learnerState';
import { runCode } from '../services/runnerClient';

export const practiceRouter = Router();
practiceRouter.use(requireAuth);

const perUser = (limit: number, windowMs: number, what: string) =>
  rateLimit({
    windowMs,
    limit,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => String(req.user?._id ?? req.ip),
    message: { error: `Slow down a little: too many ${what}. Try again in a moment.`, code: 'RATE_LIMIT' },
  });
const runLimiter = perUser(config.runsPerMinute, 60_000, 'runs');
const submitLimiter = perUser(config.submitsPerMinute, 60_000, 'submissions');

const codeSchema = z.object({ code: z.string().max(20000) });
const interviewCodeSchema = z.object({ code: z.string().max(20000), stdin: z.string().max(20000).optional() });

async function runInterviewCode(trackSlug: string, item: string, code: string, stdin: string) {
  if (!/^(?:python-(?:0[1-9]|[1-6]\d|7[0-9])|sql-(?:0[1-9]|[1-4]\d|50)|cookbook-[a-z0-9-]{1,40})$/.test(item)) throw new HttpError(404, 'Interview item not found.');
  const track = await Track.findOne({ slug: trackSlug }).lean();
  if (!track) throw new HttpError(404, 'Track not found.');
  if (track.language !== 'python') throw new HttpError(400, 'The interview scratch editor currently runs Python code only.');
  const result = await runCode({ language: track.language, code, entry: '', tests: [{ program: 'result = None', expected: null, stdin }] });
  return { status: result.status, message: result.message, stdout: result.results[0]?.stdout ?? '', error: result.results[0]?.error };
}

async function load(trackSlug: string, slug: string) {
  const [track, question] = await Promise.all([
    Track.findOne({ slug: trackSlug }).lean(),
    Question.findOne({ track: trackSlug, slug }),
  ]);
  if (!track || !question) throw new HttpError(404, 'Question not found.');
  return { track, question: question as QuestionDoc };
}

async function progressFor(userId: any, track: string, slug: string) {
  return (
    (await QuestionProgress.findOne({ user: userId, track, question: slug })) ??
    new QuestionProgress({ user: userId, track, question: slug, status: 'unsolved', attempts: 0 })
  );
}

const base = '/:track/questions/:slug';

/** Interview scratchpad run: executes the learner's script in the same isolated runner as practice. */
practiceRouter.post(
  '/:track/interview/:item/run',
  runLimiter,
  wrap(async (req, res) => {
    const { code, stdin = '' } = interviewCodeSchema.parse(req.body);
    res.json(await runInterviewCode(req.params.track, req.params.item, code, stdin));
  }),
);

/** Run against the VISIBLE tests only. Nothing is recorded: this is a scratchpad run. */
practiceRouter.post(
  `${base}/run`,
  runLimiter,
  wrap(async (req, res) => {
    const { code } = codeSchema.parse(req.body);
    const { track, question } = await load(req.params.track, req.params.slug);
    const outcome = await grade(question, track.language, code, 'visible');
    res.json({
      status: outcome.status,
      message: outcome.message,
      tests: outcome.tests.map(toPublicTest),
      passedCount: outcome.tests.filter((t) => t.passed).length,
      total: outcome.tests.length,
    });
  }),
);

/** Full grading (visible + hidden). Records the attempt, updates mastery, activity and progress. */
practiceRouter.post(
  `${base}/submit`,
  submitLimiter,
  wrap(async (req, res) => {
    const { code } = codeSchema.parse(req.body);
    const user = req.user!;
    const { track, question } = await load(req.params.track, req.params.slug);
    const outcome = await grade(question, track.language, code, 'all');
    // A crashed/unavailable run says nothing about the learner's skill: do not record it.
    const runnerFault = outcome.tests.every((t) => t.skipped);

    const passedCount = outcome.tests.filter((t) => t.passed).length;
    const total = outcome.tests.length;
    const allPassed = passedCount === total;

    const progress = await progressFor(user._id, track.slug, question.slug);
    const [scoresBefore, prereqs, concepts] = await Promise.all([
      masteryScores(user._id, track.slug),
      prereqMap(track.slug),
      Concept.find({ track: track.slug }).lean(),
    ]);
    const conceptById = new Map(concepts.map((c) => [c.id, c]));

    const diagnosis = allPassed
      ? null
      : diagnose(
          outcome.tests.map((t) => ({ tags: t.tags, passed: t.passed, diagnosis: t.diagnosis, error: t.error })),
          question.concepts,
          scoresBefore,
          prereqs,
        );

    const assisted = progress.hintsRevealed >= 2 || progress.solutionViewed;
    const firstSolve = allPassed && progress.status !== 'solved';

    if (!runnerFault) {
      await recordEvidence(user._id, track.slug, outcome.tests, assisted);
      progress.attempts += 1;
      progress.lastAttemptAt = new Date();
      progress.bestPassed = Math.max(progress.bestPassed, passedCount);
      progress.total = total;
      progress.draft = code;
      if (progress.status === 'unsolved') progress.status = 'attempted';
      if (firstSolve) {
        progress.status = 'solved';
        progress.firstSolvedAt = new Date();
        progress.solvedIndependently = !progress.solutionViewed;
      }
      await progress.save();
      await Attempt.create({
        user: user._id,
        track: track.slug,
        question: question.slug,
        code,
        passed: allPassed,
        passedCount,
        total,
        hintsUsed: progress.hintsRevealed,
        suspects: diagnosis?.suspects.slice(0, 3).map((s) => ({ concept: s.concept, confidence: s.confidence })) ?? [],
      });
      await bumpActivity(user._id, track.slug, localDate(req), { submissions: 1, solves: firstSolve ? 1 : 0 });
    }

    // Stuck detection: several failed attempts in a row pointing at the same concept.
    let stuck: null | { concept: string; title: string; lesson?: { topic: string; slug: string }; practice: unknown[] } = null;
    if (!allPassed && !runnerFault && diagnosis?.suspects.length) {
      const recent = await Attempt.find({ user: user._id, track: track.slug, question: question.slug })
        .sort({ createdAt: -1 })
        .limit(3)
        .lean();
      const topOf = (a: (typeof recent)[number]) => a.suspects?.[0]?.concept;
      if (recent.length >= 3 && recent.every((a) => !a.passed) && topOf(recent[0]) && recent.every((a) => topOf(a) === topOf(recent[0]))) {
        const c = conceptById.get(topOf(recent[0])!);
        if (c) {
          const solvedSet = new Set(
            (await QuestionProgress.find({ user: user._id, track: track.slug, status: 'solved' }).lean()).map((p) => p.question),
          );
          const easier = await Question.find({ track: track.slug, concepts: c.id, slug: { $ne: question.slug } })
            .select('slug title difficulty')
            .lean();
          const rank = { easy: 0, medium: 1, hard: 2 } as const;
          stuck = {
            concept: c.id,
            title: c.title ?? c.id,
            lesson: c.lesson ? { topic: c.topic!, slug: c.lesson } : undefined,
            practice: easier
              .filter((q) => !solvedSet.has(q.slug))
              .sort((a, b) => rank[a.difficulty!] - rank[b.difficulty!])
              .slice(0, 2)
              .map((q) => ({ slug: q.slug, title: q.title, difficulty: q.difficulty })),
          };
        }
      }
    }

    res.json({
      passed: allPassed,
      runnerFault,
      status: outcome.status,
      message: outcome.message,
      passedCount,
      total,
      firstSolve,
      tests: outcome.tests.map(toPublicTest),
      diagnosis: diagnosis && {
        allFailed: diagnosis.allFailed,
        notes: diagnosis.notes,
        cleared: diagnosis.cleared.map((id) => ({ id, title: conceptById.get(id)?.title ?? id })),
        suspects: diagnosis.suspects.map((s) => {
          const c = conceptById.get(s.concept);
          return {
            concept: s.concept,
            title: c?.title ?? s.concept,
            description: c?.description,
            confidence: s.confidence,
            partial: s.partial,
            failedTests: s.failedTests,
            totalTests: s.totalTests,
            reasons: s.reasons,
            lesson: c?.lesson ? { topic: c.topic, slug: c.lesson } : undefined,
          };
        }),
      },
      stuck,
      progress: {
        status: progress.status,
        attempts: progress.attempts,
        solvedIndependently: progress.solvedIndependently,
        solutionViewed: progress.solutionViewed,
      },
    });
  }),
);

/** Hints unlock one at a time, and are recorded: needing hints lowers how much a pass counts. */
practiceRouter.post(
  `${base}/hint`,
  wrap(async (req, res) => {
    const { track, question } = await load(req.params.track, req.params.slug);
    const progress = await progressFor(req.user!._id, track.slug, question.slug);
    const next = progress.hintsRevealed;
    if (next >= question.hints.length) throw new HttpError(400, 'You have already seen every hint.', 'NO_MORE_HINTS');
    if (next >= 1 && progress.attempts < 1 && !progress.solutionViewed) {
      throw new HttpError(403, 'Submit an attempt first: the next hint will make more sense once you have something to compare against.', 'TRY_FIRST');
    }
    progress.hintsRevealed = next + 1;
    await progress.save();
    res.json({ index: next, hint: question.hints[next], hintsRevealed: next + 1, hintCount: question.hints.length });
  }),
);

practiceRouter.post(
  `${base}/solution`,
  wrap(async (req, res) => {
    const { track, question } = await load(req.params.track, req.params.slug);
    const progress = await progressFor(req.user!._id, track.slug, question.slug);
    if (progress.attempts < 1 && progress.status !== 'solved') {
      throw new HttpError(403, 'Submit at least one attempt before looking at the solution. Struggling first is how it sticks.', 'TRY_FIRST');
    }
    progress.solutionViewed = true;
    await progress.save();
    res.json({ solution: question.solution });
  }),
);

practiceRouter.put(
  `${base}/draft`,
  wrap(async (req, res) => {
    const { code } = codeSchema.parse(req.body);
    const { track, question } = await load(req.params.track, req.params.slug);
    await QuestionProgress.updateOne(
      { user: req.user!._id, track: track.slug, question: question.slug },
      { $set: { draft: code }, $setOnInsert: { status: 'unsolved', attempts: 0 } },
      { upsert: true },
    );
    res.json({ ok: true });
  }),
);

for (const [method, value] of [['put', true], ['delete', false]] as const) {
  practiceRouter[method](
    `${base}/bookmark`,
    wrap(async (req, res) => {
      const { track, question } = await load(req.params.track, req.params.slug);
      await QuestionProgress.updateOne(
        { user: req.user!._id, track: track.slug, question: question.slug },
        { $set: { bookmarked: value, bookmarkedAt: value ? new Date() : undefined }, $setOnInsert: { status: 'unsolved', attempts: 0 } },
        { upsert: true },
      );
      res.json({ bookmarked: value });
    }),
  );
}

practiceRouter.get(
  `${base}/attempts`,
  wrap(async (req, res) => {
    const attempts = await Attempt.find({ user: req.user!._id, track: req.params.track, question: req.params.slug })
      .sort({ createdAt: -1 })
      .limit(10)
      .select('code passed passedCount total createdAt hintsUsed')
      .lean();
    res.json({ attempts });
  }),
);
