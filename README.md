# PyPrep

A full-stack platform for learning Python from scratch and practising interview questions. Python is the first *track*; the architecture holds more without a rebuild.

What makes it a learning tool rather than a quiz site:

* **Real lessons.** 27 lessons across seven topics, each starting from the mental model, then the syntax, then the traps, then self-check questions with collapsible answers.
* **Diagnosis, not just "wrong answer".** Every test case is tagged with the skill it probes. When a submission fails, PyPrep looks at the *pattern* of passes and failures and tells you which underlying skill is shaky: indexing, slice bounds, slice step, or loop direction, for example. After repeated misses on the same skill it sends you back to the lesson and to smaller questions on exactly that skill.
* **A model of what you know.** A per-skill mastery estimate (decayed Beta evidence, discounted when you needed hints or the solution) drives a "what to practise next" list, steps back to a shaky prerequisite instead of drilling the dependent skill, and schedules review of skills you have not touched in a while.
* **Safe code execution.** Learner code runs in a separate service with no network, its own unprivileged user per run, CPU, memory, process and file limits, and a wall-clock kill.
* **Gated access.** Signup creates a *request*. Nobody can log in until an administrator approves it.

```
Browser ──► web (nginx, React build) ──/api──► api (Express) ──► MongoDB
                                                  │
                                                  └─ unix socket ─► runner (no network, locked down)
                                                                       └─ python as uid 20000+n, rlimits, wall kill
```

## Quick start

### Option A: Docker (everything, closest to production)

```bash
cp .env.example .env
# edit .env: set JWT_SECRET, RUNNER_SECRET (random strings) and ADMIN_PASSWORD
docker compose up --build
```

Open <http://localhost:8080> and log in with `ADMIN_EMAIL` / `ADMIN_PASSWORD`. The curriculum is loaded automatically at start.

### Option B: local development (hot reload)

Requirements: Node 20+, Python 3.10+, and a MongoDB (the compose file below gives you one).

```bash
npm run setup                                   # env files + all dependencies
docker compose -f docker-compose.dev.yml up -d  # MongoDB on 127.0.0.1:27017 (or use your own)
npm run seed                                    # load /content into MongoDB
npm run dev                                     # runner + api + web with hot reload
```

Open <http://localhost:5173>. The development defaults in `server/.env` create the administrator `admin@example.com` / `ChangeMe-Admin-123`. Change them before you put this anywhere real.

> Dev mode runs the code runner as a normal process. It still applies resource limits, but it cannot drop to a separate user and does not remove loopback network access from learner code. That isolation is what the Docker setup adds. Do not expose a dev-mode runner to untrusted users.

## How to check that it actually works

Do not judge it by how the pages look. These are the four things worth checking, with how.

| Check | How |
|---|---|
| **Is the learning content deep enough?** | `npm run validate:content` checks structure and that every one of the 60 reference solutions passes its tests while every starter fails. Then read a lesson, e.g. `content/tracks/python/strings/lessons/01-indexing-and-slicing.md`, and a question file, e.g. `content/tracks/python/strings/questions.json` (every test names the skill it probes and carries a diagnosis message). |
| **Does the registration approval flow work?** | Sign up at `/signup`. Try to log in: you are refused ("waiting for approval") and no session is issued. Log in as the admin, open **Approvals**, approve. Now the user can log in. Decline shows the reason to the user; suspending locks a signed-in user out on their very next request. `npm run test:e2e` asserts all of this. |
| **Is progress saved after logout?** | Solve a question, bookmark something, complete a lesson, log out, log back in: solved count, bookmarks, lesson completion, weak spots, activity graph, revealed hints and your unsaved editor draft are all restored (all stored server-side, in MongoDB). Also asserted by `npm run test:e2e`. |
| **Is code execution safely isolated?** | `npm run test:runner` throws infinite loops, a program that swallows the timeout exception, memory bombs, a fork bomb, output floods, `sys.exit`, attempts to read the runner's secret and `/proc`, to write large files, to become root and to raise its own limits at the runner. All must be contained. Details and honest limits in [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md#security-model). |

`npm test` runs everything that does not need a database (content, typechecks, unit tests, runner isolation, client build). `npm run test:e2e` runs the 70-check API test against a running stack, including interview revision persistence and submitting every reference solution and every starter through the real runner.

## The curriculum

| Topic | Lessons | Questions |
|---|---|---|
| Fundamentals | 3 | 8 |
| Control flow | 3 | 8 |
| Strings | 3 | 10 |
| Collections | 4 | 8 |
| Functions | 4 | 8 |
| Object-oriented Python | 4 | 8 |
| Advanced Python (exceptions, generators, decorators, complexity, interview patterns, typing, testing and memory management) | 6 | 10 |

Each topic also has a syntax reference (cheat sheet). Questions come in two kinds, *practice* and *interview*, in three difficulties, each with three progressive hints, hidden edge-case tests and a worked solution that explains why, not just what.

### Interview Glance and Trace Bench

The main navigation includes **Interview Glance**, a searchable revision library with 50 Python and 50 SQL quick-revision questions. Filter by subject, topic, difficulty, experience, question type and revision status. Each expandable entry includes the original working example, expected output (or a note when SQL results depend on database rows), a plain-English explanation, edge-case cue, follow-up, practice challenge and time-saving pattern. Bookmarks, completion, confidence and last-reviewed time are saved per account in MongoDB, and marked revisions count in the activity heatmap. **Trace Bench** provides five curated, step-by-step Python dry runs; these are guided traces, not a live interpreter or a complete view of Python internals.

**The learning loop**

1. You submit. All tests run in the sandbox (visible and hidden).
2. Failures are mapped to skills. Skills whose tests passed are cleared; the ones whose tests failed are ranked using the authored diagnosis messages, runtime error types (an `IndexError` points at off-by-one, a `KeyError` at dictionaries) and your history.
3. Hints unlock one at a time; the solution unlocks only after an attempt. Both are recorded, and a pass that needed them counts for less in your mastery estimate and is shown as *assisted*.
4. After three failed attempts pointing at the same skill, PyPrep stops suggesting "try again" and sends you to the lesson and two smaller questions on that skill.
5. The dashboard turns this into "what to practise next", weak spots with your most common mistake, and a contribution-style activity graph.

## Project structure

```
pyprep/
├── README.md                    you are here
├── docker-compose.yml           full stack (mongo, runner, api, web)
├── docker-compose.dev.yml       MongoDB only, for local dev
├── .env.example                 secrets for docker compose
├── package.json                 convenience scripts (setup, dev, seed, test, ...)
├── scripts/
│   ├── setup.sh                 env files + dependencies
│   └── check-all.sh             every check that needs no database
├── docs/
│   └── ARCHITECTURE.md          design, data model, API, security model, adding a track
│
├── content/                     THE CURRICULUM: plain files, no code
│   ├── CONTENT_GUIDE.md         how to write lessons, questions and tests
│   ├── validate.py              runs every reference solution through the real harness
│   └── tracks/python/
│       ├── track.json           topics and lesson order
│       ├── concepts.json        the skill map (52 skills + prerequisites) used for diagnosis
│       └── <topic>/             fundamentals, control-flow, strings, collections,
│           ├── lessons/NN-*.md  functions, oop, advanced
│           ├── reference.md
│           └── questions.json
│
├── server/                      Node + Express + TypeScript + Mongoose
│   └── src/
│       ├── app.ts, index.ts, config.ts
│       ├── models/index.ts      User, Track, Concept, Lesson, Question, progress, mastery, activity
│       ├── middleware/auth.ts   cookie session, admin guard, CSRF origin check
│       ├── routes/              auth, admin, content, practice, progress
│       ├── services/
│       │   ├── mastery.ts       evidence model          (pure, unit tested)
│       │   ├── diagnosis.ts     which skill is failing  (pure, unit tested)
│       │   ├── recommend.ts     targeted practice       (pure, unit tested)
│       │   ├── grading.ts       runs tests, hides what must stay hidden
│       │   └── runnerClient.ts  talks to the runner (TCP or unix socket)
│       └── scripts/seed.ts      loads /content into MongoDB
│
├── runner/                      SEPARATE code-execution service
│   ├── src/                     HTTP API, slot pool, per-language adapters
│   ├── harness/python_harness.py   runs tests inside the sandbox
│   └── test/isolation.test.ts   hostile-program test suite
│
└── client/                      React + TypeScript + Vite
    └── src/
        ├── pages/               Dashboard, Learn, Lesson, Reference, PracticeList, Problem, Saved, Admin, Auth
        └── components/          CodeEditor, Heatmap, DiagnosisPanel, TestResults, Markdown, Shell
```

## Environment variables

Server (`server/.env`, see `server/.env.example`):

| Variable | Purpose |
|---|---|
| `MONGODB_URI` | MongoDB connection string |
| `JWT_SECRET` | Signs login cookies. 32+ characters; the server refuses to start in production with the placeholder |
| `JWT_EXPIRES_DAYS` | Session length (default 14) |
| `CLIENT_ORIGIN` | Allowed browser origin(s), comma separated. Used for CORS and the CSRF origin check |
| `COOKIE_SECURE` | `true` when served over HTTPS |
| `TRUST_PROXY` | `1` behind a reverse proxy, so rate limits see real client IPs |
| `ADMIN_EMAIL`, `ADMIN_USERNAME`, `ADMIN_PASSWORD` | The first administrator, created at startup. Required for the approval flow |
| `RUNNER_SECRET` | Shared secret the API sends to the runner; must equal the runner's |
| `RUNNER_URL` / `RUNNER_SOCKET` | How to reach the runner: TCP for dev, a unix socket for Docker |
| `CONTENT_DIR` | Where the curriculum lives (default `../content`) |
| `SIGNUPS_PER_HOUR`, `LOGINS_PER_15_MIN`, `RUNS_PER_MINUTE`, `SUBMITS_PER_MINUTE` | Rate limits (raise only for automated tests) |

Runner (`runner/.env`): `RUNNER_SECRET`, `RUNNER_PORT` or `RUNNER_SOCKET`, `SANDBOX_UID_BASE` (0 = no privilege drop, dev only), `MAX_CONCURRENT`, `MEMORY_LIMIT_MB`, `CPU_LIMIT_SECONDS`, `WALL_LIMIT_SECONDS`, `PROCESS_LIMIT`.

Docker compose (`.env`): `JWT_SECRET`, `RUNNER_SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_USERNAME`, `CLIENT_ORIGIN`, `WEB_PORT`, `COOKIE_SECURE`.

## Improving it

* **Add or edit content**: change files under `content/`, run `npm run validate:content`, then `npm run seed`. See [content/CONTENT_GUIDE.md](content/CONTENT_GUIDE.md).
* **Add a track** (JavaScript, SQL, ...): a content folder plus one runner adapter. See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md#adding-a-track).
* **Tune the learner model**: constants at the top of `server/src/services/mastery.ts`; behaviour is pinned by `server/test/learning.test.ts`.

## Known limits (read these)

* **The Docker setup was not executed where this was built.** The environment had no Docker daemon, so `docker-compose.yml` and the Dockerfiles were syntax-validated (`docker compose config`) but never built or run. Everything else, including the runner with its privilege drop and the whole API, was run for real. Expect to fix small things on your first `docker compose up --build`, then do a real submission through the UI. `npm run test:runner` exercises the same runner code from a checkout, but it cannot test the container-level settings (no network, dropped capabilities, read-only filesystem), so confirm those yourself, for example with `docker compose exec runner sh -c "cat /proc/net/dev"` (only a loopback interface should exist).
* **The API test ran against FerretDB**, a MongoDB-compatible server, because MongoDB itself could not be installed there. Mongoose behaves the same, but run `npm run test:e2e` once against your real MongoDB.
* **Execution results are advisory.** A determined learner can forge the harness's result channel from inside their own sandbox and mark their own tests as passed. That only fools themselves (there is no leaderboard or certificate). Do not use these scores for anything high-stakes without moving grading outside the learner's process.
* **Rate limits are in memory**, per API instance. Behind several instances, switch to a shared store (e.g. Redis).
* **No email.** Approval decisions are visible in the app, but nobody is notified by email; there is also no password reset yet.
* **The container runs Python 3.11** (Debian bookworm). Content is written for 3.10+ and validated on 3.13 here; behaviour differences are unlikely but run `validate.py` with your target version.
* The curriculum is 60 questions, enough to learn the topics but not exhaustive. Four skills (`context-managers`, `iterators`, `generators`, `two-pointers`) have only one question each, so remediation practice for them is thin; the validator lists these.
