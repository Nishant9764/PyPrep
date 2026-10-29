import { Router } from 'express';
import { z } from 'zod';
import { ActivityDay, Attempt, Concept, InterviewProgress, Lesson, LessonProgress, Mastery, MockScore, Question, QuestionProgress, Track } from '../models';
import { requireAuth } from '../middleware/auth';
import { HttpError, localDate, wrap } from '../utils/http';
import { evidence, isWeak, score } from '../services/mastery';
import { nextUnsolved, recommend } from '../services/recommend';
import { bumpActivity, decodeKey, streaks } from '../services/learnerState';

export const progressRouter = Router();
progressRouter.use(requireAuth);

const round = (n: number, d = 2) => Math.round(n * 10 ** d) / 10 ** d;

async function trackOr404(slug: string) {
  const t = await Track.findOne({ slug }).lean();
  if (!t) throw new HttpError(404, 'Track not found.');
  return t;
}

/** Contribution-style graph data: one row per active local day. */
progressRouter.get(
  '/:track/progress/activity',
  wrap(async (req, res) => {
    const days = z.coerce.number().int().min(7).max(400).default(371).parse(req.query.days);
    const from = new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10);
    const rows = await ActivityDay.find({ user: req.user!._id, track: req.params.track, date: { $gte: from } })
      .sort({ date: 1 })
      .lean();
    res.json({
      days: rows.map((r) => ({
        date: r.date,
        submissions: r.submissions,
        solves: r.solves,
        lessons: r.lessons,
        revisions: r.revisions ?? 0,
        // Solves and completed lessons carry extra weight; each recorded revision also counts.
        count: r.submissions + r.solves * 2 + r.lessons * 2 + (r.revisions ?? 0),
      })),
      today: localDate(req),
    });
  }),
);

progressRouter.get('/:track/progress/mock-scores', wrap(async (req, res) => {
  const rows = await MockScore.find({ user: req.user!._id, track: req.params.track }).sort({ createdAt: -1 }).limit(20).lean();
  res.json({ scores: rows.map((row) => ({ id: String(row._id), mode: row.mode, score: row.score, correct: row.correct, total: row.total, at: row.createdAt })) });
}));

progressRouter.post('/:track/progress/mock-scores', wrap(async (req, res) => {
  await trackOr404(req.params.track);
  const body = z.object({ mode: z.enum(['coding', 'predict']), correct: z.number().int().min(0).max(100), total: z.number().int().min(1).max(100) }).parse(req.body);
  if (body.correct > body.total) throw new HttpError(400, 'Correct count cannot exceed total.');
  const row = await MockScore.create({ user: req.user!._id, track: req.params.track, mode: body.mode, correct: body.correct, total: body.total, score: Math.round(body.correct / body.total * 100) });
  res.status(201).json({ id: String(row._id), mode: row.mode, score: row.score, correct: row.correct, total: row.total, at: row.createdAt });
}));

progressRouter.get(
  '/:track/progress/summary',
  wrap(async (req, res) => {
    const track = await trackOr404(req.params.track);
    const user = req.user!._id;
    const [questions, qp, lessons, lp, mastery, concepts, activity, recent, interviewProgress, attemptMetrics] = await Promise.all([
      Question.find({ track: track.slug }).select('slug title topic difficulty kind concepts order').lean(),
      QuestionProgress.find({ user, track: track.slug }).lean(),
      Lesson.find({ track: track.slug }).select('topic slug minutes').lean(),
      LessonProgress.find({ user, track: track.slug }).lean(),
      Mastery.find({ user, track: track.slug }).lean(),
      Concept.find({ track: track.slug }).lean(),
      ActivityDay.find({ user, track: track.slug }).select('date submissions solves lessons revisions').lean(),
      Attempt.find({ user, track: track.slug }).sort({ createdAt: -1 }).limit(8).select('question passed passedCount total createdAt').lean(),
      InterviewProgress.find({ user, track: track.slug }).lean(),
      Attempt.aggregate([{ $match: { user, track: track.slug } }, { $facet: {
        totals: [{ $group: { _id: null, attempts: { $sum: 1 }, passed: { $sum: { $cond: ['$passed', 1, 0] } }, timeSpentMs: { $sum: { $ifNull: ['$timeSpentMs', 0] } } } }],
        first: [{ $sort: { createdAt: 1 } }, { $group: { _id: '$question', passed: { $first: '$passed' } } }],
      } }]),
    ]);
    const qById = new Map(questions.map((q) => [q.slug, q]));
    const solved = qp.filter((p) => p.status === 'solved');
    const attempted = qp.filter((p) => p.status === 'attempted');
    const conceptById = new Map(concepts.map((c) => [c.id, c]));
    const aggregate = attemptMetrics[0] ?? { totals: [], first: [] };
    const attemptTotals = aggregate.totals[0] ?? { attempts: 0, passed: 0, timeSpentMs: 0 };

    const topics = track.topics.map((t) => {
      const tq = questions.filter((q) => q.topic === t.slug);
      const tConcepts = concepts.filter((c) => c.topic === t.slug).map((c) => c.id);
      const ms = mastery.filter((m) => tConcepts.includes(m.concept) && evidence(m) >= 1);
      return {
        slug: t.slug,
        title: t.title,
        icon: t.icon,
        questionsTotal: tq.length,
        solved: tq.filter((q) => solved.some((p) => p.question === q.slug)).length,
        lessonsTotal: t.lessons.length,
        lessonsDone: lp.filter((l) => l.topic === t.slug && l.completed).length,
        lessonsMastered: lp.filter((l) => l.topic === t.slug && !!l.masteredAt).length,
        // Average mastery over concepts with evidence; null = "not enough data yet".
        mastery: ms.length ? round(ms.reduce((a, m) => a + score(m), 0) / ms.length) : null,
        weakConcepts: ms.filter((m) => isWeak(m)).length,
      };
    });

    const weak = mastery
      .filter((m) => conceptById.has(m.concept) && isWeak(m))
      .sort((a, b) => score(a) - score(b))
      .slice(0, 6)
      .map((m) => {
        const c = conceptById.get(m.concept)!;
        const top = [...(m.misconceptions instanceof Map ? m.misconceptions : new Map(Object.entries(m.misconceptions ?? {})))]
          .sort((a, b) => (b[1] as number) - (a[1] as number))[0];
        return {
          concept: c.id,
          title: c.title,
          topic: c.topic,
          lesson: c.lesson,
          mastery: round(score(m)),
          evidence: round(evidence(m), 1),
          failures: m.failures,
          lastFailedAt: m.lastFailedAt,
          commonMistake: top ? { message: decodeKey(top[0]), times: top[1] } : null,
        };
      });

    const today = localDate(req);
    const dates = activity.filter((a) => a.submissions + a.solves + a.lessons + (a.revisions ?? 0) > 0).map((a) => a.date);
    const byDifficulty = { easy: 0, medium: 0, hard: 0 } as Record<string, number>;
    const totalByDifficulty = { easy: 0, medium: 0, hard: 0 } as Record<string, number>;
    for (const q of questions) if (q.difficulty) totalByDifficulty[q.difficulty]++;
    for (const p of solved) {
      const q = qById.get(p.question);
      if (q?.difficulty) byDifficulty[q.difficulty]++;
    }
    const masteryById = new Map(mastery.map((m) => [m.concept, m]));
    const skillMastery = concepts.map((concept) => {
      const m = masteryById.get(concept.id);
      const lastPracticedAt = m?.lastPracticedAt ?? null;
      const reviewDueAt = lastPracticedAt ? new Date(new Date(lastPracticedAt).getTime() + 7 * 86_400_000) : null;
      return { id: concept.id, title: concept.title ?? concept.id, topic: concept.topic, lesson: concept.lesson, mastery: m ? round(score(m)) : null, evidence: m ? round(evidence(m), 1) : 0, lastPracticedAt, reviewDueAt, overdue: !!reviewDueAt && reviewDueAt.getTime() < Date.now() };
    });
    const solvedRatio = (kind: 'easy' | 'medium' | 'hard') => totalByDifficulty[kind] ? byDifficulty[kind] / totalByDifficulty[kind] : 0;
    const lessonRatio = lessons.length ? lp.filter((l) => !!l.masteredAt).length / lessons.length : 0;
    const assessedSkills = skillMastery.filter((c) => c.evidence >= 1);
    const strongSkills = assessedSkills.length ? assessedSkills.filter((c) => (c.mastery ?? 0) >= 0.7).length / assessedSkills.length : 0;
    const readiness = [
      { level: 'Beginner', score: round(0.6 * solvedRatio('easy') + 0.4 * lessonRatio), basis: [{ label: 'Easy practice solved', value: byDifficulty.easy, total: totalByDifficulty.easy, weight: 60 }, { label: 'Lessons mastered', value: lp.filter((l) => !!l.masteredAt).length, total: lessons.length, weight: 40 }] },
      { level: 'Internship', score: round(0.3 * solvedRatio('easy') + 0.4 * solvedRatio('medium') + 0.3 * strongSkills), basis: [{ label: 'Easy practice solved', value: byDifficulty.easy, total: totalByDifficulty.easy, weight: 30 }, { label: 'Medium practice solved', value: byDifficulty.medium, total: totalByDifficulty.medium, weight: 40 }, { label: 'Assessed skills at 70%+ mastery', value: assessedSkills.filter((c) => (c.mastery ?? 0) >= 0.7).length, total: assessedSkills.length, weight: 30 }] },
      { level: 'Junior Python', score: round(0.2 * solvedRatio('easy') + 0.35 * solvedRatio('medium') + 0.25 * solvedRatio('hard') + 0.2 * strongSkills), basis: [{ label: 'Easy practice solved', value: byDifficulty.easy, total: totalByDifficulty.easy, weight: 20 }, { label: 'Medium practice solved', value: byDifficulty.medium, total: totalByDifficulty.medium, weight: 35 }, { label: 'Hard practice solved', value: byDifficulty.hard, total: totalByDifficulty.hard, weight: 25 }, { label: 'Assessed skills at 70%+ mastery', value: assessedSkills.filter((c) => (c.mastery ?? 0) >= 0.7).length, total: assessedSkills.length, weight: 20 }] },
    ];
    const next = nextUnsolved(
      questions.map((q) => ({ slug: q.slug, title: q.title!, topic: q.topic, difficulty: q.difficulty!, kind: q.kind!, concepts: q.concepts as string[], order: q.order ?? 0 })),
      qp.map((p) => ({ question: p.question, status: p.status as 'attempted' | 'solved' })),
      track.topics.map((t) => t.slug as string),
    );

    res.json({
      totals: {
        questions: questions.length,
        solved: solved.length,
        attempted: attempted.length,
        solvedIndependently: solved.filter((p) => p.solvedIndependently).length,
        lessons: lessons.length,
        lessonsDone: lp.filter((l) => l.completed).length,
        lessonsMastered: lp.filter((l) => !!l.masteredAt).length,
        accuracy: attemptTotals.attempts ? round(attemptTotals.passed / attemptTotals.attempts) : null,
        firstAttemptSuccess: aggregate.first.length ? round(aggregate.first.filter((a: any) => a.passed).length / aggregate.first.length) : null,
        timeLearningMinutesEstimated: lp.filter((l) => l.completed).reduce((total, l) => total + (lessons.find((item) => item.topic === l.topic && item.slug === l.lesson)?.minutes ?? 0), 0),
        timeSolvingMinutes: Math.round((attemptTotals.timeSpentMs ?? 0) / 60_000),
        bookmarks: qp.filter((p) => p.bookmarked).length + lp.filter((l) => l.bookmarked).length + interviewProgress.filter((p) => p.bookmarked).length,
        submissions: activity.reduce((a, d) => a + d.submissions, 0),
        activeDays: dates.length,
      },
      streak: streaks(dates, today),
      byDifficulty,
      topics,
      skillMastery,
      readiness,
      readinessNote: 'Evidence-based study estimate, not a hiring prediction. Scores use only the displayed practice, lesson, and skill assessments; missing evidence contributes zero.',
      weakConcepts: weak,
      recent: recent.map((a) => ({
        question: a.question,
        title: qById.get(a.question)?.title ?? a.question,
        passed: a.passed,
        passedCount: a.passedCount,
        total: a.total,
        at: a.createdAt,
      })),
      next: next && { slug: next.slug, title: next.title, topic: next.topic, difficulty: next.difficulty },
    });
  }),
);

progressRouter.get(
  '/:track/progress/mastery',
  wrap(async (req, res) => {
    const [concepts, mastery] = await Promise.all([
      Concept.find({ track: req.params.track }).lean(),
      Mastery.find({ user: req.user!._id, track: req.params.track }).lean(),
    ]);
    const m = new Map(mastery.map((x) => [x.concept, x]));
    res.json({
      concepts: concepts.map((c) => {
        const x = m.get(c.id);
        return {
          id: c.id,
          title: c.title,
          topic: c.topic,
          lesson: c.lesson,
          prereqs: c.prereqs,
          mastery: x ? round(score(x)) : null,
          evidence: x ? round(evidence(x), 1) : 0,
          weak: x ? isWeak(x) : false,
          attempts: x?.attempts ?? 0,
          lastPracticedAt: x?.lastPracticedAt ?? null,
        };
      }),
    });
  }),
);

/** Targeted practice: what to work on next and why (weak concepts, shaky prerequisites, spaced review). */
progressRouter.get(
  '/:track/progress/recommendations',
  wrap(async (req, res) => {
    const track = await trackOr404(req.params.track);
    const user = req.user!._id;
    const [concepts, questions, mastery, qp] = await Promise.all([
      Concept.find({ track: track.slug }).lean(),
      Question.find({ track: track.slug }).select('slug title topic difficulty kind concepts order').lean(),
      Mastery.find({ user, track: track.slug }).lean(),
      QuestionProgress.find({ user, track: track.slug }).lean(),
    ]);
    const recs = recommend({
      concepts: concepts.map((c) => ({ id: c.id, title: c.title ?? c.id, topic: c.topic ?? '', lesson: c.lesson ?? '', prereqs: c.prereqs ?? [] })),
      questions: questions.map((q) => ({ slug: q.slug, title: q.title ?? q.slug, topic: q.topic, difficulty: q.difficulty!, kind: q.kind ?? 'practice', concepts: q.concepts as string[], order: q.order ?? 0 })),
      mastery: mastery.map((m) => ({ concept: m.concept, alpha: m.alpha, beta: m.beta, lastPracticedAt: m.lastPracticedAt })),
      progress: qp.map((p) => ({ question: p.question, status: p.status as 'attempted' | 'solved', solvedIndependently: p.solvedIndependently })),
    });
    res.json({
      recommendations: recs.map((r) => ({
        kind: r.kind,
        reason: r.reason,
        mastery: r.mastery,
        evidence: r.evidence,
        concept: { id: r.concept.id, title: r.concept.title, topic: r.concept.topic, lesson: r.concept.lesson },
        rootCause: r.rootCause && { id: r.rootCause.concept.id, title: r.rootCause.concept.title, mastery: r.rootCause.mastery },
        questions: r.questions.map((q) => ({ slug: q.slug, title: q.title, difficulty: q.difficulty, topic: q.topic })),
      })),
    });
  }),
);

progressRouter.get(
  '/:track/progress/bookmarks',
  wrap(async (req, res) => {
    const user = req.user!._id;
    const track = await trackOr404(req.params.track);
    const [qp, lp, ip] = await Promise.all([
      QuestionProgress.find({ user, track: track.slug, bookmarked: true }).sort({ bookmarkedAt: -1 }).lean(),
      LessonProgress.find({ user, track: track.slug, bookmarked: true }).sort({ bookmarkedAt: -1 }).lean(),
      InterviewProgress.find({ user, track: track.slug, bookmarked: true }).sort({ updatedAt: -1 }).lean(),
    ]);
    const questions = await Question.find({ track: track.slug, slug: { $in: qp.map((p) => p.question) } })
      .select('slug title topic difficulty kind')
      .lean();
    const lessons = await Lesson.find({ track: track.slug, $or: lp.map((l) => ({ topic: l.topic, slug: l.lesson })) })
      .select('topic slug title')
      .lean();
    const qm = new Map(questions.map((q) => [q.slug, q]));
    res.json({
      questions: qp.flatMap((p) => {
        const q = qm.get(p.question);
        return q ? [{ slug: q.slug, title: q.title, topic: q.topic, difficulty: q.difficulty, kind: q.kind, status: p.status }] : [];
      }),
      lessons: lp.flatMap((l) => {
        const m = lessons.find((x) => x.topic === l.topic && x.slug === l.lesson);
        return m ? [{ topic: m.topic, slug: m.slug, title: m.title, completed: l.completed }] : [];
      }),
      interview: ip.map((p) => ({ item: p.item, completed: p.completed, confidence: p.confidence, lastReviewedAt: p.lastReviewedAt ?? null })),
    });
  }),
);

/** Review state for the interview glance library, kept per user and track. */
progressRouter.get(
  '/:track/progress/interview',
  wrap(async (req, res) => {
    await trackOr404(req.params.track);
    const rows = await InterviewProgress.find({ user: req.user!._id, track: req.params.track }).lean();
    res.json({ items: rows.map((r) => ({ item: r.item, completed: r.completed, bookmarked: r.bookmarked, confidence: r.confidence, lastReviewedAt: r.lastReviewedAt ?? null, draft: r.draft ?? null })) });
  }),
);

const interviewStateBody = z.object({
  completed: z.boolean().optional(),
  bookmarked: z.boolean().optional(),
  confidence: z.number().int().min(1).max(5).nullable().optional(),
  reviewed: z.boolean().optional(),
  draft: z.string().max(20000).optional(),
});

progressRouter.put(
  '/:track/progress/interview/:item',
  wrap(async (req, res) => {
    if (!/^(?:python-(?:0[1-9]|[1-6]\d|7[0-9])|sql-(?:0[1-9]|[1-4]\d|50))$/.test(req.params.item)) throw new HttpError(404, 'Interview item not found.');
    await trackOr404(req.params.track);
    const body = interviewStateBody.parse(req.body);
    const user = req.user!._id;
    const filter = { user, track: req.params.track, item: req.params.item };
    const set: Record<string, unknown> = {};
    if (body.completed !== undefined) set.completed = body.completed;
    if (body.bookmarked !== undefined) set.bookmarked = body.bookmarked;
    if (body.confidence !== undefined) set.confidence = body.confidence;
    if (body.draft !== undefined) set.draft = body.draft;
    if (body.reviewed) set.lastReviewedAt = new Date();
    const row = await InterviewProgress.findOneAndUpdate(filter, { $set: set }, { upsert: true, new: true });
    if (body.reviewed) await bumpActivity(user, req.params.track, localDate(req), { revisions: 1 });
    res.json({ item: row.item, completed: row.completed, bookmarked: row.bookmarked, confidence: row.confidence, lastReviewedAt: row.lastReviewedAt ?? null, draft: row.draft ?? null });
  }),
);

const lessonBody = z.object({ completed: z.boolean().optional(), bookmarked: z.boolean().optional(), masteryScore: z.number().int().min(0).max(100).optional() });

progressRouter.put(
  '/:track/lessons/:topic/:lesson/state',
  wrap(async (req, res) => {
    const { track, topic, lesson } = req.params;
    const exists = await Lesson.exists({ track, topic, slug: lesson });
    if (!exists) throw new HttpError(404, 'Lesson not found.');
    const body = lessonBody.parse(req.body);
    const user = req.user!._id;
    const current = await LessonProgress.findOne({ user, track, topic, lesson });
    const score = body.masteryScore ?? current?.masteryScore ?? 0;
    if (body.completed === true && !current?.completed && score < 80) {
      throw new HttpError(400, 'Pass the lesson mastery check before marking it complete.', 'MASTERY_CHECK_REQUIRED');
    }
    const set: Record<string, unknown> = {};
    if (body.completed !== undefined) {
      set.completed = body.completed;
      set.completedAt = body.completed ? new Date() : undefined;
      if (body.completed) set.everCompleted = true;
    }
    if (body.masteryScore !== undefined) {
      set.masteryScore = body.masteryScore;
      if (body.masteryScore >= 80) set.masteredAt = new Date();
      else set.masteredAt = undefined;
    }
    if (body.bookmarked !== undefined) {
      set.bookmarked = body.bookmarked;
      set.bookmarkedAt = body.bookmarked ? new Date() : undefined;
    }
    const doc = await LessonProgress.findOneAndUpdate({ user, track, topic, lesson }, { $set: set }, { upsert: true, new: true });
    // Activity only the first time a lesson is ever completed, so toggling cannot inflate the graph.
    if (body.completed && !current?.everCompleted) await bumpActivity(user, track, localDate(req), { lessons: 1 });
    res.json({ completed: !!doc.completed, bookmarked: !!doc.bookmarked, mastered: !!doc.masteredAt, masteryScore: doc.masteryScore ?? null });
  }),
);
