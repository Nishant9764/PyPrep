import { Router } from 'express';
import { z } from 'zod';
import { Concept, Lesson, LessonProgress, Question, QuestionProgress, Reference, Track, parseTests } from '../models';
import { requireAuth } from '../middleware/auth';
import { HttpError, wrap } from '../utils/http';

export const contentRouter = Router();
contentRouter.use(requireAuth);

async function getTrack(slug: string) {
  const track = await Track.findOne({ slug }).lean();
  if (!track) throw new HttpError(404, 'Track not found.');
  return track;
}

/** Strip everything about hidden tests and all authoring metadata before it reaches a browser. */
function publicVisibleTests(tests: any[]) {
  return tests
    .filter((t) => !t.hidden)
    .map((t) => ({
      args: t.args,
      kwargs: t.kwargs,
      expected: t.expected,
      stdout: t.stdout,
      stdin: t.stdin,
      program: t.program,
      inPlace: t.inPlace,
      note: t.note,
    }));
}

contentRouter.get(
  '/',
  wrap(async (_req, res) => {
    const tracks = await Track.find().lean();
    const counts = await Question.aggregate([{ $group: { _id: '$track', n: { $sum: 1 } } }]);
    const n = new Map(counts.map((c) => [c._id, c.n]));
    res.json({
      tracks: tracks.map((t) => ({
        slug: t.slug,
        title: t.title,
        language: t.language,
        description: t.description,
        topicCount: t.topics.length,
        questionCount: n.get(t.slug) ?? 0,
      })),
    });
  }),
);

/** Track overview: topics, lessons and the learner's progress on each, in one request. */
contentRouter.get(
  '/:track',
  wrap(async (req, res) => {
    const track = await getTrack(req.params.track);
    const user = req.user!._id;
    const [lessonMeta, questions, lp, qp] = await Promise.all([
      Lesson.find({ track: track.slug }).select('topic slug title summary minutes concepts order').lean(),
      Question.find({ track: track.slug }).select('topic slug').lean(),
      LessonProgress.find({ user, track: track.slug }).lean(),
      QuestionProgress.find({ user, track: track.slug }).lean(),
    ]);
    const done = new Set(lp.filter((l) => l.completed).map((l) => `${l.topic}/${l.lesson}`));
    const marked = new Set(lp.filter((l) => l.bookmarked).map((l) => `${l.topic}/${l.lesson}`));
    const mastered = new Set(lp.filter((l) => !!l.masteredAt).map((l) => `${l.topic}/${l.lesson}`));
    const solved = new Set(qp.filter((q) => q.status === 'solved').map((q) => q.question));
    const attempted = new Set(qp.map((q) => q.question));
    const meta = new Map(lessonMeta.map((l) => [`${l.topic}/${l.slug}`, l]));

    res.json({
      track: { slug: track.slug, title: track.title, language: track.language, description: track.description },
      topics: track.topics.map((t) => {
        const tq = questions.filter((q) => q.topic === t.slug);
        return {
          slug: t.slug,
          title: t.title,
          icon: t.icon,
          description: t.description,
          questionCount: tq.length,
          solvedCount: tq.filter((q) => solved.has(q.slug)).length,
          attemptedCount: tq.filter((q) => attempted.has(q.slug)).length,
          lessons: t.lessons.map((l) => {
            const m = meta.get(`${t.slug}/${l.slug}`);
            return {
              slug: l.slug,
              title: l.title,
              summary: m?.summary,
              minutes: m?.minutes,
              completed: done.has(`${t.slug}/${l.slug}`),
              mastered: mastered.has(`${t.slug}/${l.slug}`),
              bookmarked: marked.has(`${t.slug}/${l.slug}`),
            };
          }),
        };
      }),
    });
  }),
);

contentRouter.get(
  '/:track/concepts',
  wrap(async (req, res) => {
    const concepts = await Concept.find({ track: req.params.track }).lean();
    res.json({
      concepts: concepts.map((c) => ({ id: c.id, title: c.title, topic: c.topic, lesson: c.lesson, prereqs: c.prereqs, description: c.description })),
    });
  }),
);

contentRouter.get(
  '/:track/topics/:topic/reference',
  wrap(async (req, res) => {
    const ref = await Reference.findOne({ track: req.params.track, topic: req.params.topic }).lean();
    if (!ref) throw new HttpError(404, 'Reference not found.');
    res.json({ reference: { topic: ref.topic, title: ref.title, body: ref.body } });
  }),
);

contentRouter.get(
  '/:track/lessons/:topic/:lesson',
  wrap(async (req, res) => {
    const { track: trackSlug, topic, lesson: slug } = req.params;
    const track = await getTrack(trackSlug);
    const lesson = await Lesson.findOne({ track: trackSlug, topic, slug }).lean();
    if (!lesson) throw new HttpError(404, 'Lesson not found.');

    // Previous / next across the whole track, in curriculum order.
    const flat = track.topics.flatMap((t) => t.lessons.map((l) => ({ topic: t.slug, slug: l.slug, title: l.title })));
    const i = flat.findIndex((l) => l.topic === topic && l.slug === slug);

    const [progress, concepts, related, qp] = await Promise.all([
      LessonProgress.findOne({ user: req.user!._id, track: trackSlug, topic, lesson: slug }).lean(),
      Concept.find({ track: trackSlug, id: { $in: lesson.concepts } }).lean(),
      Question.find({ track: trackSlug, concepts: { $in: lesson.concepts } })
        .select('slug title difficulty kind topic concepts')
        .lean(),
      QuestionProgress.find({ user: req.user!._id, track: trackSlug }).lean(),
    ]);
    const solved = new Set(qp.filter((q) => q.status === 'solved').map((q) => q.question));
    const rank = { easy: 0, medium: 1, hard: 2 } as const;
    const practice = related
      .filter((q) => lesson.concepts.some((c) => q.concepts.includes(c)))
      .sort((a, b) => Number(solved.has(a.slug)) - Number(solved.has(b.slug)) || rank[a.difficulty!] - rank[b.difficulty!])
      .slice(0, 6)
      .map((q) => ({ slug: q.slug, title: q.title, difficulty: q.difficulty, kind: q.kind, solved: solved.has(q.slug) }));

    res.json({
      lesson: { topic, slug, title: lesson.title, summary: lesson.summary, minutes: lesson.minutes, body: lesson.body },
      concepts: concepts.map((c) => ({ id: c.id, title: c.title })),
      practice,
      prev: i > 0 ? flat[i - 1] : null,
      next: i >= 0 && i < flat.length - 1 ? flat[i + 1] : null,
      progress: { completed: !!progress?.completed, bookmarked: !!progress?.bookmarked, mastered: !!progress?.masteredAt, masteryScore: progress?.masteryScore ?? null },
    });
  }),
);

const listSchema = z.object({
  topic: z.string().max(40).optional(),
  difficulty: z.enum(['easy', 'medium', 'hard']).optional(),
  kind: z.enum(['practice', 'interview']).optional(),
  concept: z.string().max(60).optional(),
  status: z.enum(['unsolved', 'attempted', 'solved']).optional(),
  bookmarked: z.enum(['true', 'false']).optional(),
  q: z.string().trim().max(60).optional(),
});

contentRouter.get(
  '/:track/questions',
  wrap(async (req, res) => {
    const f = listSchema.parse(req.query);
    const filter: Record<string, unknown> = { track: req.params.track };
    if (f.topic) filter.topic = f.topic;
    if (f.difficulty) filter.difficulty = f.difficulty;
    if (f.kind) filter.kind = f.kind;
    if (f.concept) filter.concepts = f.concept;
    if (f.q) filter.title = new RegExp(f.q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    const [track, questions, qp] = await Promise.all([
      getTrack(req.params.track),
      Question.find(filter).select('topic slug order title difficulty kind concepts estimatedMinutes').lean(),
      QuestionProgress.find({ user: req.user!._id, track: req.params.track }).lean(),
    ]);
    const prog = new Map(qp.map((p) => [p.question, p]));
    const topicOrder = new Map(track.topics.map((t, i) => [t.slug, i]));
    let rows = questions.map((q) => {
      const p = prog.get(q.slug);
      return {
        slug: q.slug,
        topic: q.topic,
        title: q.title,
        difficulty: q.difficulty,
        kind: q.kind,
        concepts: q.concepts,
        estimatedMinutes: q.estimatedMinutes,
        status: (p?.status ?? 'unsolved') as 'unsolved' | 'attempted' | 'solved',
        bookmarked: !!p?.bookmarked,
        order: q.order ?? 0,
      };
    });
    if (f.status) rows = rows.filter((r) => r.status === f.status);
    if (f.bookmarked) rows = rows.filter((r) => r.bookmarked === (f.bookmarked === 'true'));
    rows.sort((a, b) => (topicOrder.get(a.topic) ?? 99) - (topicOrder.get(b.topic) ?? 99) || a.order - b.order);
    res.json({ questions: rows });
  }),
);

contentRouter.get(
  '/:track/questions/:slug',
  wrap(async (req, res) => {
    const q = await Question.findOne({ track: req.params.track, slug: req.params.slug }).lean();
    if (!q) throw new HttpError(404, 'Question not found.');
    const [p, concepts, track] = await Promise.all([
      QuestionProgress.findOne({ user: req.user!._id, track: req.params.track, question: q.slug }).lean(),
      Concept.find({ track: req.params.track, id: { $in: q.concepts } }).lean(),
      getTrack(req.params.track),
    ]);
    const tests = parseTests(q);
    const revealed = Math.min(p?.hintsRevealed ?? 0, q.hints.length);
    res.json({
      question: {
        slug: q.slug,
        topic: q.topic,
        title: q.title,
        difficulty: q.difficulty,
        kind: q.kind,
        estimatedMinutes: q.estimatedMinutes,
        prompt: q.prompt,
        entry: q.entry,
        language: track.language,
        starterCode: q.starterCode,
        visibleTests: publicVisibleTests(tests),
        hiddenTestCount: tests.filter((t) => t.hidden).length,
        hintCount: q.hints.length,
        hints: q.hints.slice(0, revealed), // only hints the learner has already unlocked
        concepts: concepts.map((c) => ({ id: c.id, title: c.title, topic: c.topic, lesson: c.lesson })),
      },
      progress: {
        status: p?.status ?? 'unsolved',
        attempts: p?.attempts ?? 0,
        bookmarked: !!p?.bookmarked,
        hintsRevealed: revealed,
        solutionViewed: !!p?.solutionViewed,
        solvedIndependently: !!p?.solvedIndependently,
        draft: p?.draft ?? null,
        // The solution is only included once the learner has asked for it.
        solution: p?.solutionViewed ? q.solution : null,
      },
    });
  }),
);
