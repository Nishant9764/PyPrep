import { Schema, model, Types, InferSchemaType, HydratedDocument } from 'mongoose';

/* ----------------------------------------------------------------------------------------
 * Users and approval workflow
 * -------------------------------------------------------------------------------------- */
export const USER_STATUSES = ['pending', 'approved', 'rejected', 'suspended'] as const;
export type UserStatus = (typeof USER_STATUSES)[number];

const userSchema = new Schema(
  {
    username: { type: String, required: true, trim: true, minlength: 3, maxlength: 24 },
    usernameLower: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
    status: { type: String, enum: USER_STATUSES, default: 'pending', index: true },
    signupNote: { type: String, maxlength: 500 },
    decisionReason: { type: String, maxlength: 500 },
    decidedAt: Date,
    decidedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    history: [
      {
        _id: false,
        action: { type: String, required: true },
        by: { type: Schema.Types.ObjectId, ref: 'User' },
        at: { type: Date, default: Date.now },
        reason: String,
      },
    ],
    lastLoginAt: Date,
  },
  { timestamps: true },
);
export type UserDoc = HydratedDocument<InferSchemaType<typeof userSchema>>;
export const User = model('User', userSchema);

/* ----------------------------------------------------------------------------------------
 * Curriculum (loaded from /content by the seed script). Every collection is keyed by track so
 * further tracks (JavaScript, SQL, ...) live alongside Python without schema changes.
 * -------------------------------------------------------------------------------------- */
const trackSchema = new Schema({
  slug: { type: String, required: true, unique: true },
  title: { type: String, required: true },
  language: { type: String, required: true }, // runner adapter id, e.g. "python"
  description: String,
  topics: [
    {
      _id: false,
      slug: String,
      title: String,
      icon: String,
      description: String,
      lessons: [{ _id: false, slug: String, title: String }],
    },
  ],
});
export const Track = model('Track', trackSchema);

const conceptSchema = new Schema({
  track: { type: String, required: true },
  id: { type: String, required: true },
  title: String,
  topic: String,
  lesson: String,
  prereqs: [String],
  description: String,
});
conceptSchema.index({ track: 1, id: 1 }, { unique: true });
export const Concept = model('Concept', conceptSchema);

const lessonSchema = new Schema({
  track: { type: String, required: true },
  topic: { type: String, required: true },
  slug: { type: String, required: true },
  order: Number,
  title: String,
  summary: String,
  minutes: Number,
  concepts: [String],
  body: String,
});
lessonSchema.index({ track: 1, topic: 1, slug: 1 }, { unique: true });
export const Lesson = model('Lesson', lessonSchema);

const referenceSchema = new Schema({
  track: { type: String, required: true },
  topic: { type: String, required: true },
  title: String,
  body: String,
});
referenceSchema.index({ track: 1, topic: 1 }, { unique: true });
export const Reference = model('Reference', referenceSchema);

const questionSchema = new Schema({
  track: { type: String, required: true },
  topic: { type: String, required: true },
  order: Number,
  slug: { type: String, required: true },
  title: String,
  difficulty: { type: String, enum: ['easy', 'medium', 'hard'] },
  kind: { type: String, enum: ['practice', 'interview'] },
  concepts: [String],
  estimatedMinutes: Number,
  prompt: String,
  entry: String,
  starterCode: String,
  hints: [String],
  solution: { code: String, explanation: String },
  /** Authored tests as a JSON string: opaque to the database, so nested arrays and odd keys are always safe. */
  testsJson: { type: String, required: true },
});
questionSchema.index({ track: 1, slug: 1 }, { unique: true });
questionSchema.index({ track: 1, concepts: 1 });
export type QuestionDoc = HydratedDocument<InferSchemaType<typeof questionSchema>>;
export const Question = model('Question', questionSchema);

export function parseTests(q: { testsJson?: string | null }): any[] {
  return JSON.parse(q.testsJson ?? '[]');
}

/* ----------------------------------------------------------------------------------------
 * Learner state
 * -------------------------------------------------------------------------------------- */
const questionProgressSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    track: { type: String, required: true },
    question: { type: String, required: true }, // question slug
    status: { type: String, enum: ['unsolved', 'attempted', 'solved'], default: 'unsolved' },
    attempts: { type: Number, default: 0 },
    firstSolvedAt: Date,
    lastAttemptAt: Date,
    bestPassed: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
    hintsRevealed: { type: Number, default: 0 },
    solutionViewed: { type: Boolean, default: false },
    /** True when solved without revealing the solution. Hints are tracked separately. */
    solvedIndependently: { type: Boolean, default: false },
    bookmarked: { type: Boolean, default: false },
    bookmarkedAt: Date,
    draft: { type: String, maxlength: 20000 },
  },
  { timestamps: true },
);
questionProgressSchema.index({ user: 1, track: 1, question: 1 }, { unique: true });
export type QuestionProgressDoc = HydratedDocument<InferSchemaType<typeof questionProgressSchema>>;
export const QuestionProgress = model('QuestionProgress', questionProgressSchema);

const lessonProgressSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    track: { type: String, required: true },
    topic: { type: String, required: true },
    lesson: { type: String, required: true },
    completed: { type: Boolean, default: false },
    masteryScore: { type: Number, min: 0, max: 100, default: null },
    masteredAt: Date,
    /** Never reset: activity credit for a lesson is given once, however often it is toggled. */
    everCompleted: { type: Boolean, default: false },
    completedAt: Date,
    bookmarked: { type: Boolean, default: false },
    bookmarkedAt: Date,
  },
  { timestamps: true },
);
lessonProgressSchema.index({ user: 1, track: 1, topic: 1, lesson: 1 }, { unique: true });
export const LessonProgress = model('LessonProgress', lessonProgressSchema);

/** Learner-owned review state for the bundled Python and SQL interview glance library. */
const interviewProgressSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  track: { type: String, required: true },
  item: { type: String, required: true },
  completed: { type: Boolean, default: false },
  bookmarked: { type: Boolean, default: false },
  confidence: { type: Number, min: 1, max: 5, default: null },
  lastReviewedAt: Date,
  draft: { type: String, maxlength: 20000 },
}, { timestamps: true });
interviewProgressSchema.index({ user: 1, track: 1, item: 1 }, { unique: true });
export const InterviewProgress = model('InterviewProgress', interviewProgressSchema);

const attemptSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  track: { type: String, required: true },
  question: { type: String, required: true },
  code: { type: String, maxlength: 20000 },
  passed: Boolean,
  passedCount: Number,
  total: Number,
  hintsUsed: Number,
  timeSpentMs: { type: Number, min: 0, max: 21_600_000 },
  suspects: [{ _id: false, concept: String, confidence: Number }],
  createdAt: { type: Date, default: Date.now },
});
attemptSchema.index({ user: 1, track: 1, question: 1, createdAt: -1 });
export const Attempt = model('Attempt', attemptSchema);

/**
 * Per-concept knowledge estimate: a decayed Beta(alpha, beta) distribution. See services/mastery.ts.
 * `misconceptions` counts how often each authored diagnosis message was triggered.
 */
const masterySchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  track: { type: String, required: true },
  concept: { type: String, required: true },
  alpha: { type: Number, default: 1 },
  beta: { type: Number, default: 1 },
  attempts: { type: Number, default: 0 },
  failures: { type: Number, default: 0 },
  lastPracticedAt: Date,
  lastFailedAt: Date,
  misconceptions: { type: Map, of: Number, default: {} },
});
masterySchema.index({ user: 1, track: 1, concept: 1 }, { unique: true });
export type MasteryDoc = HydratedDocument<InferSchemaType<typeof masterySchema>>;
export const Mastery = model('Mastery', masterySchema);

/** One row per user per local calendar day: powers the contribution-style graph. */
const activitySchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  track: { type: String, required: true },
  date: { type: String, required: true }, // YYYY-MM-DD in the learner's own timezone
  submissions: { type: Number, default: 0 },
  solves: { type: Number, default: 0 },
  lessons: { type: Number, default: 0 },
  revisions: { type: Number, default: 0 },
});
activitySchema.index({ user: 1, track: 1, date: 1 }, { unique: true });
export const ActivityDay = model('ActivityDay', activitySchema);

export { Types };
