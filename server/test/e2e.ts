/**
 * Start the API with SUBMITS_PER_MINUTE=1000 so the bulk check at the end is not rate limited.
 * End-to-end test against a RUNNING stack (MongoDB + runner + API, with the curriculum seeded).
 *   API_URL=http://localhost:4000 ADMIN_EMAIL=... ADMIN_PASSWORD=... npm run e2e
 *
 * It exercises the things worth checking in this app: the approval workflow, session handling,
 * hidden-test and solution confidentiality, real grading through the isolated runner, targeted
 * diagnosis, progress persistence across logout/login, and every reference solution in the curriculum.
 */
const API = process.env.API_URL ?? 'http://localhost:4000';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'admin@example.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? 'ChangeMe-Admin-123';
const ORIGIN = process.env.CLIENT_ORIGIN ?? 'http://localhost:5173';
const TRACK = 'python';
const TZ = '-330'; // India, to exercise local-date handling

let failures = 0;
let total = 0;
function check(name: string, ok: boolean, detail?: unknown) {
  total++;
  if (ok) console.log(`  PASS  ${name}`);
  else {
    failures++;
    console.log(`  FAIL  ${name}${detail !== undefined ? '  -> ' + JSON.stringify(detail).slice(0, 500) : ''}`);
  }
}

class Client {
  cookie = '';
  async call(method: string, path: string, body?: unknown, extra: Record<string, string> = {}) {
    const res = await fetch(API + path, {
      method,
      headers: {
        'content-type': 'application/json',
        origin: ORIGIN,
        'x-tz-offset': TZ,
        ...(this.cookie ? { cookie: this.cookie } : {}),
        ...extra,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const set = res.headers.get('set-cookie');
    if (set) {
      const pair = set.split(';')[0];
      this.cookie = pair.endsWith('=') ? '' : pair;
    }
    let json: any = null;
    try {
      json = await res.json();
    } catch {
      /* no body */
    }
    return { status: res.status, body: json };
  }
}

const suffix = Date.now().toString(36);
const learner = { username: `learner_${suffix}`, email: `learner_${suffix}@example.com`, password: 'a-long-password-1' };
const rejected = { username: `nope_${suffix}`, email: `nope_${suffix}@example.com`, password: 'a-long-password-2' };

async function main() {
  const admin = new Client();
  const user = new Client();
  const other = new Client();

  console.log('\n== Registration and approval ==');
  let r = await user.call('POST', '/api/auth/signup', learner);
  check('signup is accepted as a request (202)', r.status === 202, r);
  r = await user.call('GET', '/api/auth/me');
  check('signup does NOT log the user in', r.status === 401, r);
  r = await user.call('POST', '/api/auth/login', { email: learner.email, password: learner.password });
  check('login before approval is refused (PENDING)', r.status === 403 && r.body.code === 'PENDING', r);
  check('no session cookie was issued while pending', user.cookie === '');
  r = await user.call('POST', '/api/auth/login', { email: learner.email, password: 'wrong-password-123' });
  check('wrong password gives a generic 401 (does not reveal status)', r.status === 401 && r.body.code === 'BAD_CREDENTIALS', r);
  r = await user.call('POST', '/api/auth/signup', { ...learner, username: 'someone_else' });
  check('duplicate email gets the same 202 (no account enumeration)', r.status === 202, r);
  r = await user.call('POST', '/api/auth/signup', { ...learner, email: 'x@example.com' });
  check('duplicate username is rejected (409)', r.status === 409, r);
  r = await user.call('POST', '/api/auth/signup', { username: 'ab', email: 'bad', password: 'short' });
  check('weak/invalid signup data is rejected (400)', r.status === 400, r);

  r = await admin.call('POST', '/api/auth/login', { email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
  check('admin can log in', r.status === 200 && r.body.user.role === 'admin', r);
  r = await user.call('GET', '/api/admin/users?status=pending');
  check('anonymous cannot reach admin API', r.status === 401, r);

  r = await admin.call('GET', '/api/admin/users?status=pending');
  const pending = r.body.users.find((u: any) => u.email === learner.email);
  check('admin sees the pending request', !!pending && pending.status === 'pending', r.body);
  check('admin list never exposes password hashes', !JSON.stringify(r.body).includes('passwordHash'));

  r = await admin.call('POST', `/api/admin/users/${pending.id}/approve`, {});
  check('admin approves the request', r.status === 200 && r.body.user.status === 'approved', r);
  r = await admin.call('POST', `/api/admin/users/${pending.id}/approve`, {});
  check('approving twice is a conflict (409)', r.status === 409, r);

  r = await user.call('POST', '/api/auth/login', { email: learner.email, password: learner.password });
  check('approved user can now log in', r.status === 200 && r.body.user.status === 'approved', r);
  r = await user.call('GET', '/api/auth/me');
  check('session works (/me)', r.status === 200 && r.body.user.email === learner.email, r);
  r = await user.call('GET', '/api/admin/users');
  check('normal user is forbidden from the admin API (403)', r.status === 403, r);
  r = await user.call('POST', `/api/admin/users/${pending.id}/suspend`, {});
  check('normal user cannot approve/suspend anyone (403)', r.status === 403, r);

  // Rejection flow
  await other.call('POST', '/api/auth/signup', rejected);
  r = await admin.call('GET', `/api/admin/users?status=pending&q=${rejected.username}`);
  const rej = r.body.users[0];
  r = await admin.call('POST', `/api/admin/users/${rej.id}/reject`, { reason: 'Not part of the cohort' });
  check('admin can reject with a reason', r.status === 200 && r.body.user.status === 'rejected', r);
  r = await other.call('POST', '/api/auth/login', { email: rejected.email, password: rejected.password });
  check('rejected user cannot log in and sees the reason', r.status === 403 && r.body.code === 'REJECTED' && /cohort/.test(r.body.error), r);

  // CSRF / origin
  r = await user.call('POST', '/api/auth/logout', {}, { origin: 'http://evil.example' });
  check('state-changing request from a foreign origin is blocked', r.status === 403 && r.body.code === 'BAD_ORIGIN', r);

  console.log('\n== Content and confidentiality ==');
  r = await user.call('GET', `/api/tracks/${TRACK}`);
  check('track overview lists 7 topics', r.status === 200 && r.body.topics.length === 7, r.body?.topics?.length);
  const lessonCount = r.body.topics.reduce((n: number, t: any) => n + t.lessons.length, 0);
  check('overview includes all lessons', lessonCount >= 26, lessonCount);
  const t0 = r.body.topics[0];
  r = await user.call('GET', `/api/tracks/${TRACK}/lessons/${t0.slug}/${t0.lessons[0].slug}`);
  check('a lesson loads with a real body', r.status === 200 && r.body.lesson.body.length > 3000, r.body?.lesson?.body?.length);
  r = await user.call('GET', `/api/tracks/${TRACK}/topics/strings/reference`);
  check('topic reference loads', r.status === 200 && r.body.reference.body.length > 300, r.status);

  r = await user.call('GET', `/api/tracks/${TRACK}/questions`);
  const all: any[] = r.body.questions;
  check('question list returns all questions (>= 56)', all.length >= 56, all.length);
  const q = all.find((x) => x.topic === 'strings') ?? all[0];
  r = await user.call('GET', `/api/tracks/${TRACK}/questions/${q.slug}`);
  const pub = r.body;
  const raw = JSON.stringify(pub);
  check('question payload hides the solution', pub.progress.solution === null && !raw.includes('"explanation"'));
  check('question payload shows only visible tests', pub.question.visibleTests.length >= 2 && pub.question.hiddenTestCount >= 2);
  check('question payload exposes no hints up front', pub.question.hints.length === 0 && pub.question.hintCount === 3);
  check('question payload has no test tags/diagnosis strings', !raw.includes('"diagnosis"') && !raw.includes('"tags"'));

  console.log('\n== Practice: grading, diagnosis, hints, solution ==');
  // Need the authored question to know a wrong answer: use starter code (should fail).
  const starter = pub.question.starterCode as string;
  r = await user.call('POST', `/api/tracks/${TRACK}/questions/${q.slug}/run`, { code: starter });
  check('run (visible tests) works through the runner', r.status === 200 && r.body.tests.length === pub.question.visibleTests.length, r);
  check('run does not leak hidden tests', r.body.tests.every((t: any) => !t.hidden));
  r = await user.call('POST', `/api/tracks/${TRACK}/questions/${q.slug}/solution`);
  check('solution is locked before any attempt (TRY_FIRST)', r.status === 403 && r.body.code === 'TRY_FIRST', r);
  r = await user.call('POST', `/api/tracks/${TRACK}/questions/${q.slug}/hint`);
  check('first hint is available immediately', r.status === 200 && r.body.index === 0 && typeof r.body.hint === 'string', r);
  r = await user.call('POST', `/api/tracks/${TRACK}/questions/${q.slug}/hint`);
  check('second hint requires an attempt first', r.status === 403 && r.body.code === 'TRY_FIRST', r);

  r = await user.call('POST', `/api/tracks/${TRACK}/questions/${q.slug}/submit`, { code: starter });
  check('failing submission is graded, not passed', r.status === 200 && r.body.passed === false, r);
  const sub = r.body;
  check('failing submission includes a diagnosis with suspects', !!sub.diagnosis && sub.diagnosis.suspects.length >= 1, sub.diagnosis);
  const hiddenRes = sub.tests.filter((t: any) => t.hidden);
  check('hidden test results expose no inputs or expected values', hiddenRes.length >= 2 && hiddenRes.every((t: any) => t.args === undefined && t.expected === undefined && t.actual === undefined), hiddenRes[0]);

  r = await user.call('POST', `/api/tracks/${TRACK}/questions/${q.slug}/hint`);
  check('second hint unlocks after an attempt', r.status === 200 && r.body.index === 1, r);

  r = await user.call('POST', `/api/tracks/${TRACK}/questions/${q.slug}/solution`);
  check('solution unlocks after an attempt', r.status === 200 && r.body.solution.code.length > 10, r);
  const solutionCode = r.body.solution.code as string;
  r = await user.call('POST', `/api/tracks/${TRACK}/questions/${q.slug}/submit`, { code: solutionCode });
  check('correct solution passes all tests, first solve flagged', r.status === 200 && r.body.passed === true && r.body.firstSolve === true, r.body);
  check('solving after viewing the solution is recorded as NOT independent', r.body.progress.solvedIndependently === false, r.body.progress);

  console.log('\n== Targeted diagnosis on a loop-direction problem ==');
  // Find an iteration-direction question and submit a plausible wrong answer repeatedly.
  const dirQ = all.find((x) => x.concepts.includes('iteration-direction') && x.topic === 'control-flow') ?? all.find((x) => x.concepts.includes('iteration-direction'));
  r = await user.call('GET', `/api/tracks/${TRACK}/questions/${dirQ.slug}`);
  const dirStarter = r.body.question.starterCode;
  let last: any = null;
  for (let i = 0; i < 3; i++) {
    r = await user.call('POST', `/api/tracks/${TRACK}/questions/${dirQ.slug}/submit`, { code: dirStarter + `\n# attempt ${i}\n` });
    last = r.body;
  }
  check('three failed attempts are recorded', last.progress.attempts === 3, last.progress);
  check('repeated failure on one concept triggers "stuck" guidance with a lesson link', !!last.stuck && !!last.stuck.lesson, last.stuck);
  r = await user.call('GET', `/api/tracks/${TRACK}/progress/mastery`);
  const weakNow = r.body.concepts.filter((c: any) => c.weak);
  check('weak concepts are detected from the failures', weakNow.length >= 1, weakNow.map((c: any) => c.id));
  r = await user.call('GET', `/api/tracks/${TRACK}/progress/recommendations`);
  check('recommendations point at weak concepts with unsolved questions', r.body.recommendations.length >= 1 && r.body.recommendations[0].questions.length >= 1, r.body);
  console.log('       first recommendation:', r.body.recommendations[0]?.reason);

  console.log('\n== Bookmarks, lessons, activity ==');
  r = await user.call('GET', `/api/tracks/${TRACK}/progress/interview`);
  check('interview review state starts empty for a new learner', r.status === 200 && r.body.items.length === 0, r.body);
  r = await user.call('PUT', `/api/tracks/${TRACK}/progress/interview/python-01`, { bookmarked: true, completed: true, confidence: 4, reviewed: true });
  check('interview question bookmark, completion and confidence are saved', r.status === 200 && r.body.bookmarked && r.body.completed && r.body.confidence === 4 && !!r.body.lastReviewedAt, r.body);
  r = await user.call('PUT', `/api/tracks/${TRACK}/progress/interview/python-51`, { bookmarked: true });
  check('unknown interview question IDs are rejected', r.status === 404, r);
  r = await user.call('PUT', `/api/tracks/${TRACK}/questions/${dirQ.slug}/bookmark`);
  check('question can be bookmarked', r.status === 200 && r.body.bookmarked === true, r);
  r = await user.call('PUT', `/api/tracks/${TRACK}/lessons/${t0.slug}/${t0.lessons[0].slug}/state`, { completed: true, bookmarked: true });
  check('lesson can be completed and bookmarked', r.status === 200 && r.body.completed && r.body.bookmarked, r);
  r = await user.call('PUT', `/api/tracks/${TRACK}/lessons/${t0.slug}/${t0.lessons[0].slug}/state`, { completed: false });
  r = await user.call('PUT', `/api/tracks/${TRACK}/lessons/${t0.slug}/${t0.lessons[0].slug}/state`, { completed: true });
  r = await user.call('GET', `/api/tracks/${TRACK}/progress/activity`);
  const today = r.body.days.find((d: any) => d.date === r.body.today);
  check('activity graph counts submissions, solves, lessons and interview revisions', !!today && today.submissions === 5 && today.solves === 1 && today.lessons === 1 && today.revisions === 1, today);
  r = await user.call('PUT', `/api/tracks/${TRACK}/questions/${q.slug}/draft`, { code: '# my draft\n' });
  check('draft autosave works', r.status === 200, r);

  console.log('\n== Progress survives logout ==');
  const before = (await user.call('GET', `/api/tracks/${TRACK}/progress/summary`)).body;
  r = await user.call('POST', '/api/auth/logout', {});
  r = await user.call('GET', `/api/tracks/${TRACK}/progress/summary`);
  check('after logout the API is closed again (401)', r.status === 401, r.status);
  r = await user.call('POST', '/api/auth/login', { email: learner.email, password: learner.password });
  const after = (await user.call('GET', `/api/tracks/${TRACK}/progress/summary`)).body;
  check('solved count persists after logging back in', after.totals.solved === 1 && after.totals.solved === before.totals.solved, after.totals);
  check('bookmarks persist across lessons, practice and interview revision', after.totals.bookmarks === 3, after.totals);
  check('lesson completion persists', after.totals.lessonsDone === 1, after.totals);
  check('weak concepts persist', after.weakConcepts.length >= 1, after.weakConcepts);
  check('streak counts today', after.streak.current >= 1, after.streak);
  r = await user.call('GET', `/api/tracks/${TRACK}/progress/interview`);
  const review = r.body.items.find((item: any) => item.item === 'python-01');
  check('interview bookmarks, confidence and revision timestamp persist after logout/login', r.status === 200 && review?.bookmarked && review?.completed && review?.confidence === 4 && !!review?.lastReviewedAt, review);
  r = await user.call('GET', `/api/tracks/${TRACK}/questions/${q.slug}`);
  check('saved draft is restored', r.body.progress.draft !== null, r.body.progress.draft);
  check('revealed hints are remembered', r.body.question.hints.length === 2, r.body.question.hints);
  r = await user.call('GET', `/api/tracks/${TRACK}/progress/bookmarks`);
  check('bookmark list includes the question, lesson and interview item', r.body.questions.length === 1 && r.body.lessons.length === 1 && r.body.interview.length === 1, r.body);

  console.log('\n== Admin can suspend: takes effect immediately ==');
  r = await admin.call('POST', `/api/admin/users/${pending.id}/suspend`, { reason: 'test' });
  check('admin suspends the learner', r.status === 200 && r.body.user.status === 'suspended', r);
  r = await user.call('GET', `/api/tracks/${TRACK}/progress/summary`);
  check('suspended user is locked out on the very next request (session not yet expired)', r.status === 403, r);
  r = await admin.call('POST', `/api/admin/users/${pending.id}/reinstate`, {});
  check('admin can reinstate', r.status === 200 && r.body.user.status === 'approved', r);
  r = await admin.call('POST', `/api/admin/users/${(await admin.call('GET', '/api/auth/me')).body.user.id}/suspend`, {});
  check('admin cannot suspend themselves', r.status === 400, r);

  console.log('\n== Every reference solution passes, every starter fails (via the API + runner) ==');
  const tester = new Client();
  const email = `bulk_${suffix}@example.com`;
  await tester.call('POST', '/api/auth/signup', { username: `bulk_${suffix}`, email, password: 'a-long-password-3' });
  const list = (await admin.call('GET', `/api/admin/users?status=pending&q=bulk_${suffix}`)).body.users[0];
  await admin.call('POST', `/api/admin/users/${list.id}/approve`, {});
  await tester.call('POST', '/api/auth/login', { email, password: 'a-long-password-3' });
  let okCount = 0;
  const bad: string[] = [];
  for (const item of all) {
    // reveal requires an attempt, so submit the starter first (also checks that starters fail)
    const detail = (await tester.call('GET', `/api/tracks/${TRACK}/questions/${item.slug}`)).body;
    const s = await tester.call('POST', `/api/tracks/${TRACK}/questions/${item.slug}/submit`, { code: detail.question.starterCode });
    if (s.body.passed) bad.push(`${item.slug}: starter passes`);
    const sol = (await tester.call('POST', `/api/tracks/${TRACK}/questions/${item.slug}/solution`)).body.solution;
    const g = await tester.call('POST', `/api/tracks/${TRACK}/questions/${item.slug}/submit`, { code: sol.code });
    if (g.body.passed) okCount++;
    else bad.push(`${item.slug}: ${g.body.passedCount}/${g.body.total}`);
  }
  check(`all ${all.length} reference solutions pass through the API`, okCount === all.length, bad);
  check('no starter code passes', !bad.some((b) => b.includes('starter')), bad);
  const sum = (await tester.call('GET', `/api/tracks/${TRACK}/progress/summary`)).body;
  check('summary totals match', sum.totals.solved === all.length && sum.totals.solvedIndependently === 0, sum.totals);

  console.log(`\n${total - failures}/${total} checks passed.`);
}

main()
  .catch((e) => {
    console.error(e);
    failures++;
  })
  .finally(() => process.exit(failures ? 1 : 0));
