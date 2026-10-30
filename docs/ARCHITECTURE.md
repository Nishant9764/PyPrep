# PyPrep architecture

## Design goals

1. **Teach, don't just grade.** Every question is a probe of specific skills; the platform's job is to work out which skill is the problem and respond to *that*.
2. **Content is data.** The curriculum is plain files. Adding a lesson, a question or a whole track touches no application code.
3. **Execution is a separate, hostile-by-default service.** The API never runs learner code.
4. **Access is gated.** Accounts exist only after an administrator approves them.

## Services

| Service | Tech | Responsibility |
|---|---|---|
| `client` | React 18, TypeScript, Vite, CodeMirror 6 | UI. Same-origin `/api` calls with an httpOnly cookie |
| `server` | Node, Express, TypeScript, Mongoose | Auth, approvals, content API, grading orchestration, progress, mastery, recommendations |
| `runner` | Node + Python harness | Executes learner code and returns per-test results |
| MongoDB | | All persistent state |

The API talks to the runner over TCP (dev) or a unix socket on a shared volume (Docker, where the runner container has `network_mode: none`).

## Data model

Curriculum collections (all keyed by `track`):

* `tracks`: `{slug, title, language, topics[{slug, title, lessons[]}]}`. `language` selects the runner adapter.
* `concepts`: the skill map. `{track, id, title, topic, lesson, prereqs[]}`. 52 skills for Python.
* `lessons`, `references`: markdown bodies with front matter.
* `questions`: prompt, starter code, hints, solution, and `testsJson`, a JSON string of the authored tests (opaque to the database, so nested arrays and odd keys are always safe).

Learner collections (keyed by `user` + `track`):

* `users`: status `pending | approved | rejected | suspended`, role, and an audit `history` of decisions.
* `questionprogresses`: status, attempts, hints revealed, solution viewed, solved independently, bookmark, editor draft.
* `lessonprogresses`: completed (+ an `everCompleted` flag so toggling cannot inflate activity), bookmark.
* `attempts`: every submission (code, passed/total, top suspects).
* `masteries`: per-skill evidence (`alpha`, `beta`), failures, last practised, counts of each authored misconception hit.
* `activitydays`: one row per local calendar day, which feeds the contribution graph.
* `interviewprogresses`: per-user, per-track bookmarks, completion, confidence and last-reviewed time for the Interview Glance library.

## Registration and approval

```
signup ──► user{status: pending}            (no session issued)
login while pending ──► 403 PENDING          (only after the password is verified)
admin approves ──► status: approved          login now works
admin declines (reason) ──► rejected         login shows the reason
admin suspends ──► suspended                 effective on the very next request
```

* Every authenticated request re-reads the user, so a suspension does not wait for a cookie to expire.
* Signup answers identically whether or not the email already exists (no account enumeration). Login uses a dummy bcrypt comparison for unknown emails so timing does not leak either.
* The first administrator comes from `ADMIN_*` environment variables at startup and cannot be changed through the UI. Admins cannot suspend themselves or each other.
* Sessions are a signed JWT in an httpOnly, SameSite=Lax cookie. State-changing requests are additionally checked against `CLIENT_ORIGIN`.

## Grading and what the browser may see

`POST /tracks/:track/questions/:slug/run` runs only visible tests and records nothing. `.../submit` runs all tests, records the attempt and updates mastery.

The API strips authoring metadata before calling the runner (`tags`, `diagnosis`, `hidden`, `note` never leave the server), and strips it again before replying:

* Hidden tests return only pass/fail, the authored diagnosis on failure, and an error *type*. Never their input, expected value or the learner's output on them.
* The solution is returned only after the learner asks for it, which requires at least one submission.
* Hints are returned one at a time; revealed hints are persisted.

Whole-number floats (`4.0`) are protected through JavaScript's single number type: the seed script rewrites them to `{"$float": "4.0"}` and the Python harness turns them back (`server/src/utils/floats.ts`). A bug of exactly this kind was found by the end-to-end test.

## The learning engine

All three pieces are pure functions in `server/src/services`, covered by `server/test/learning.test.ts`.

### Mastery (`mastery.ts`)

Each (learner, skill) holds a Beta(alpha, beta) belief. Every graded test tagged with that skill is evidence: a pass raises `alpha`, a failure raises `beta` (slightly more). Old evidence decays by 10% per update, so recovery is possible. A pass that needed two or more hints or the solution counts half. `score = alpha / (alpha + beta)`; with no evidence the score is 0.5 and the UI says "not enough data". A skill is *weak* when there is enough evidence and the score is below 0.6.

### Diagnosis (`diagnosis.ts`)

Questions are authored so different tests probe different skills. For one submission:

1. A skill whose tests all passed is **cleared**, however many other tests failed.
2. A skill with failing tests is a **suspect**, weighted by the fraction of its tests that failed (less if some passed) and by the learner's history on it.
3. Runtime errors add weaker evidence (`IndexError` → off-by-one/indexing, `KeyError` → dictionaries, `RecursionError` → recursion...).
4. If *everything* fails, the tests cannot separate the skills; the result says so and ranks by history and prerequisites instead of pretending to know.
5. After three consecutive failed attempts with the same top suspect, the API returns a `stuck` object: the lesson plus two easier unsolved questions on that skill.

### Recommendations (`recommend.ts`)

* Weak skills are grouped by **root cause**: if "slice step" is weak and its prerequisite "slicing bounds" is also weak, the recommendation is slicing bounds and says why.
* Questions are chosen unsolved-first, then solved-with-help, with difficulty matched to the skill's mastery (easier when shakier).
* If nothing is weak, skills that were decent but have not been practised for a week are offered for review; otherwise the next unsolved question in curriculum order.

## Security model

### Runner isolation (defence in depth)

| Layer | What it does |
|---|---|
| Separate service | Learner code never runs in the API process, so it cannot touch the database credentials, sessions or secrets |
| Network | Docker: `network_mode: none`, API connects via unix socket (`root:2000`, mode `0660`). Learner code has no network, not even to other containers |
| Unprivileged user | Each execution runs as `uid 20000 + slot` with a separate gid, so it cannot read the runner's `/proc/<pid>/environ` or files, or signal other jobs |
| Resource limits | `RLIMIT_AS` (memory), `RLIMIT_CPU`, `RLIMIT_NPROC` (fork bombs), `RLIMIT_FSIZE`, `RLIMIT_NOFILE`, `RLIMIT_CORE=0`, applied inside the harness before learner code is read; hard limits cannot be raised by an unprivileged process |
| Wall-clock kill | Whole process group killed after `WALL_LIMIT_SECONDS`; per-test 2 s alarm raises a `BaseException` so `except Exception` cannot swallow it |
| Cleanup | After every job all processes owned by that sandbox uid are killed, catching children that escaped the process group |
| Output limits | Captured output is capped in the harness, raw stdout/stderr/result channel are byte-capped in the runner |
| Container | Read-only filesystem, `cap_drop: ALL` (only SETUID, SETGID, CHOWN), `no-new-privileges`, pid/memory/cpu limits, noexec tmpfs |
| Request validation | Strict schema, size limits, shared-secret bearer token (constant-time compare), bounded queue with `503` when busy |
| Hidden test answers | Kept in the trusted runner process. The Python harness receives test inputs and contracts with expected values removed, then returns actual values for trusted comparison. Hidden inputs must still be supplied to learner code to run the test; they are never written to disk. |

`runner/test/isolation.test.ts` attacks each of these. It passes 23 checks.

### Honest limits

* A determined learner can forge the value returned by their own program or hardcode guessed cases. Expected answers no longer enter the learner harness, but this is still a practice runner, not a cheating-proof certification system. Scores are advisory.
* A kernel or container-runtime escape is outside what this design defends against. For a public deployment add a stronger boundary (gVisor `runsc`, Firecracker, or a per-execution throwaway container) and keep the runner host separate from anything valuable.
* In non-Docker development the sandbox user can still reach loopback services.

### Web app

Passwords: bcrypt (cost 12), 10 to 72 characters. Helmet headers. Rate limits on signup, login, run and submit. Input validated with zod on every route. Markdown is rendered through `rehype-sanitize` (only `<details>`/`<summary>` added to the default allow-list). Mongo queries are built from validated fields; regular-expression search input is escaped.

## Adding a track

Say you want JavaScript.

1. **Content.** Create `content/tracks/javascript/` with `track.json` (set `"language": "javascript"`), `concepts.json`, and the topic folders. Same file shapes as Python; see `content/CONTENT_GUIDE.md`.
2. **Runner adapter.** Implement `LanguageAdapter` (`runner/src/types.ts`): `run(request, slot)` returns per-test results. Mirror `runner/src/adapters/python.ts`: spawn the interpreter as `uid base+slot`, apply limits, feed it the spec on stdin, read result lines from fd 3. Write a harness like `harness/python_harness.py` for the language. Register it in `runner/src/index.ts`.
3. **Seed.** `npm run seed`. The API, the diagnosis, the dashboard and the track switcher in the UI pick it up. There is no per-track code in the server or client.
4. **Editor syntax highlighting.** Add the CodeMirror language package for it in `client/src/components/CodeEditor.tsx` (choose by `question.language`).

Concept ids are per-track, so mastery, weak spots and the activity graph are separate for each track automatically.

## API overview

All routes are under `/api` and, except signup/login, require a session.

```
POST   /auth/signup | /auth/login | /auth/logout        GET /auth/me
GET    /admin/stats | /admin/users?status=&q=
POST   /admin/users/:id/(approve|reject|suspend|reinstate)

GET    /tracks                                           track list
GET    /tracks/:t                                        topics + lessons + your progress
GET    /tracks/:t/concepts
GET    /tracks/:t/lessons/:topic/:lesson                 lesson, related practice, prev/next
GET    /tracks/:t/topics/:topic/reference
GET    /tracks/:t/questions?topic&difficulty&kind&status&bookmarked
GET    /tracks/:t/questions/:slug                        public view (no hidden tests, no solution)
POST   /tracks/:t/questions/:slug/run | /submit | /hint | /solution
PUT    /tracks/:t/questions/:slug/draft | /bookmark      DELETE .../bookmark
GET    /tracks/:t/questions/:slug/attempts
PUT    /tracks/:t/lessons/:topic/:lesson/state           {completed?, bookmarked?}
GET    /tracks/:t/progress/(summary|activity|mastery|recommendations|bookmarks)
GET    /tracks/:t/progress/interview
PUT    /tracks/:t/progress/interview/:item
```

Interview prep is split across structured banks: `client/src/data/interviewQuestions.json` (79 Python and 50 SQL entries), `client/src/data/interviewGuideQuestions.json` (409 non-DSA prompts from the supplied guide), `client/src/data/interviewCookbook.ts` (10 runnable examples), and `client/src/data/mockInterviewData.ts` (timed coding prompts, output prediction and project/behavioral prompts). Review progress alone is stored per learner in MongoDB. The Trace Bench uses curated walkthroughs from `client/src/data/traceScenarios.ts` and labels them as guided dry runs rather than full interpreter traces.
