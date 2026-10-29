export type Difficulty = 'easy' | 'medium' | 'hard';
export type QStatus = 'unsolved' | 'attempted' | 'solved';

export interface User {
  id: string;
  username: string;
  email: string;
  role: 'user' | 'admin';
  status: 'pending' | 'approved' | 'rejected' | 'suspended';
}

export interface TrackSummary {
  slug: string;
  title: string;
  language: string;
  description: string;
  topicCount: number;
  questionCount: number;
}

export interface LessonRef {
  slug: string;
  title: string;
  summary?: string;
  minutes?: number;
  completed: boolean;
  bookmarked: boolean;
}

export interface TopicOverview {
  slug: string;
  title: string;
  icon: string;
  description: string;
  questionCount: number;
  solvedCount: number;
  attemptedCount: number;
  lessons: LessonRef[];
}

export interface TrackOverview {
  track: { slug: string; title: string; language: string; description: string };
  topics: TopicOverview[];
}

export interface LessonPayload {
  lesson: { topic: string; slug: string; title: string; summary: string; minutes: number; body: string };
  concepts: { id: string; title: string }[];
  practice: { slug: string; title: string; difficulty: Difficulty; kind: string; solved: boolean }[];
  prev: { topic: string; slug: string; title: string } | null;
  next: { topic: string; slug: string; title: string } | null;
  progress: { completed: boolean; bookmarked: boolean };
}

export interface QuestionRow {
  slug: string;
  topic: string;
  title: string;
  difficulty: Difficulty;
  kind: 'practice' | 'interview';
  concepts: string[];
  estimatedMinutes: number;
  status: QStatus;
  bookmarked: boolean;
}

export interface VisibleTest {
  args?: unknown[];
  kwargs?: Record<string, unknown>;
  expected?: unknown;
  stdout?: string;
  stdin?: string;
  program?: string;
  inPlace?: boolean;
  note?: string;
}

export interface QuestionPayload {
  question: {
    slug: string;
    topic: string;
    title: string;
    difficulty: Difficulty;
    kind: string;
    estimatedMinutes: number;
    prompt: string;
    entry: string;
    language: string;
    starterCode: string;
    visibleTests: VisibleTest[];
    hiddenTestCount: number;
    hintCount: number;
    hints: string[];
    concepts: { id: string; title: string; topic: string; lesson: string }[];
  };
  progress: {
    status: QStatus;
    attempts: number;
    bookmarked: boolean;
    hintsRevealed: number;
    solutionViewed: boolean;
    solvedIndependently: boolean;
    draft: string | null;
    solution: { code: string; explanation: string } | null;
  };
}

export interface TestResult {
  index: number;
  hidden?: boolean;
  passed: boolean;
  skipped?: boolean;
  diagnosis?: string;
  error?: string;
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

export interface Suspect {
  concept: string;
  title: string;
  description?: string;
  confidence: number;
  partial: boolean;
  failedTests: number;
  totalTests: number;
  reasons: string[];
  lesson?: { topic: string; slug: string };
}

export interface RunResult {
  status: string;
  message?: string;
  tests: TestResult[];
  passedCount: number;
  total: number;
}

export interface SubmitResult extends RunResult {
  passed: boolean;
  runnerFault: boolean;
  firstSolve: boolean;
  diagnosis: null | {
    allFailed: boolean;
    notes: string[];
    cleared: { id: string; title: string }[];
    suspects: Suspect[];
  };
  stuck: null | {
    concept: string;
    title: string;
    lesson?: { topic: string; slug: string };
    practice: { slug: string; title: string; difficulty: Difficulty }[];
  };
  progress: { status: QStatus; attempts: number; solvedIndependently: boolean; solutionViewed: boolean };
}

export interface Summary {
  totals: {
    questions: number;
    solved: number;
    attempted: number;
    solvedIndependently: number;
    lessons: number;
    lessonsDone: number;
    bookmarks: number;
    submissions: number;
    activeDays: number;
  };
  streak: { current: number; longest: number };
  byDifficulty: Record<Difficulty, number>;
  topics: {
    slug: string;
    title: string;
    icon: string;
    questionsTotal: number;
    solved: number;
    lessonsTotal: number;
    lessonsDone: number;
    mastery: number | null;
    weakConcepts: number;
  }[];
  weakConcepts: {
    concept: string;
    title: string;
    topic: string;
    lesson: string;
    mastery: number;
    evidence: number;
    failures: number;
    commonMistake: { message: string; times: number } | null;
  }[];
  recent: { question: string; title: string; passed: boolean; passedCount: number; total: number; at: string }[];
  next: { slug: string; title: string; topic: string; difficulty: Difficulty } | null;
}

export interface Recommendation {
  kind: 'weak' | 'step-back' | 'review';
  reason: string;
  mastery: number;
  concept: { id: string; title: string; topic: string; lesson: string };
  rootCause?: { id: string; title: string; mastery: number };
  questions: { slug: string; title: string; difficulty: Difficulty; topic: string }[];
}

export interface ActivityDay {
  date: string;
  submissions: number;
  solves: number;
  lessons: number;
  revisions: number;
  count: number;
}

export interface AdminUser {
  id: string;
  username: string;
  email: string;
  role: string;
  status: User['status'];
  signupNote?: string;
  decisionReason?: string;
  createdAt: string;
  lastLoginAt?: string;
  decidedAt?: string;
}
