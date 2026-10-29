# PyPrep content guide

Everything the app teaches lives in this folder as plain files. The backend seeder
(`npm run seed` in `server/`) loads them into MongoDB. Nothing about a track is hard-coded
in application code, so adding a new track (JavaScript, SQL, …) means adding a folder here.

```
content/
  tracks/
    <track-slug>/
      track.json            # track + ordered topics + ordered lesson slugs
      concepts.json         # the concept map used for diagnosis (see below)
      <topic-slug>/
        lessons/NN-<lesson-slug>.md
        reference.md        # syntax reference / cheat sheet for the topic
        questions.json      # practice + interview questions
  validate.py               # run: python3 content/validate.py
```

## Lessons: `lessons/NN-<slug>.md`

`NN` is a two-digit order prefix (`01-`, `02-` …). The slug is the rest of the file name and
must match the slug in `track.json`.

Front matter (YAML):

```yaml
---
title: Indexing and Slicing
summary: One sentence that says what the learner will be able to do afterwards.
minutes: 15
concepts: [string-indexing, slicing, slice-step]   # concept ids from concepts.json
---
```

Body requirements (this is a *teaching* text, not documentation):

* 900–1,600 words. Start from zero: assume the reader has never seen the idea.
* Required `##` sections, in this order:
  1. `## Why this matters`
  2. `## The mental model` (a picture in words or ASCII; explain what Python is actually doing)
  3. two to four concept sections with runnable examples. Show the code **and** the output
     (`# -> value` comments). Build from the simplest case to a realistic one.
  4. `## Common mistakes (and how to spot them)`: concrete wrong code, the symptom the learner
     will see, and why it happens. Name the underlying *misconception*.
  5. `## Check yourself`: 4–5 questions. Put each answer in a collapsible block:
     `<details><summary>Answer</summary>…</details>` (raw HTML is enabled).
  6. `## Key takeaways`: 4–6 bullets.
* Use fenced blocks with the `python` language tag. Never use placeholder text ("TODO", "lorem",
  "coming soon").
* Explain *why*, not only *what*. Where a newcomer gets stuck (e.g. direction of a negative step,
  exclusive end bounds), spend a full paragraph and an example that makes the confusion visible.
* Python 3.10+ semantics. Be accurate; run any code you are unsure about.

## References: `reference.md`

A scannable syntax cheat sheet for the topic (≥ 150 words): tables and short snippets, grouped
by task. Front matter needs only `title:` (for example `title: Strings: syntax reference`).

## Questions: `questions.json`

A JSON array. Each element:

```jsonc
{
  "slug": "reverse-string",                 // unique within the track, kebab-case
  "title": "Reverse a String",
  "difficulty": "easy",                     // easy | medium | hard
  "kind": "practice",                       // practice | interview
  "concepts": ["slice-step", "iteration-direction"],   // ids from concepts.json
  "estimatedMinutes": 5,
  "prompt": "Markdown. State the task, input/output contract, constraints and 1–2 examples.",
  "entry": "reverse_string",                // function the learner must define
  "starterCode": "def reverse_string(s):\n    # your code here\n    pass\n",
  "hints": [                                // exactly 3, increasingly specific, never the full answer in 1 or 2
    "Think about which end of the string you need to start from.",
    "Both a loop that walks backwards and a slice can do this. Which direction does a negative step move?",
    "s[::-1] reads the whole string with a step of -1, or use range(len(s) - 1, -1, -1)."
  ],
  "solution": {
    "code": "def reverse_string(s):\n    return s[::-1]\n",
    "explanation": "Markdown. Explain WHY it works, name the idea, mention alternatives and complexity."
  },
  "tests": [
    { "args": ["abc"], "expected": "cba", "tags": ["slice-step"], "note": "basic" },
    { "args": [""], "expected": "", "tags": ["slicing"], "hidden": true,
      "diagnosis": "Empty input should return an empty string, so make sure your loop/slice handles length 0." }
  ]
}
```

### Test rules

* `tags` is **required** on every test: one or more concept ids that this test *probes*. This is
  how PyPrep decides which concept to blame when a test fails, so choose carefully. Different tests in
  the same question should probe different concepts or sub-skills whenever that is natural (for
  example a test with a negative step probes `iteration-direction`, a test with the last element
  probes `off-by-one`). Tags must be a subset of the question's `concepts`... plus up to one
  prerequisite concept when truly relevant.
* `diagnosis` (optional but strongly encouraged on hidden and edge-case tests): one sentence
  shown to the learner **when that test fails**. It must name the likely misconception, not just
  restate the failure. Good: "Your loop stops one element early. `range(n)` excludes `n`." Bad: "Wrong answer."
* `hidden: true` tests are not shown in the UI before submit. Provide ≥ 2 visible and ≥ 2 hidden
  tests per question, and cover edge cases (empty input, single element, duplicates, negatives…).
* Test kinds
  * **function call**: `args` (list), optional `kwargs` (object), `expected` (JSON value).
  * **in place**: add `"inPlace": true`; the first argument after the call is compared to `expected`.
  * **printed output**: `stdout` (string) compared line by line (trailing whitespace ignored). May be
    combined with `expected`. Optional `stdin` feeds `input()`.
  * **program** (for classes and multi-step behaviour): `"program": "s = Stack()\ns.push(1)\nresult = s.pop()"`
    is executed in the same namespace as the learner's code; the value of `result` is compared to
    `expected`.
* `expected` must be plain JSON. Tuples come back as lists and sets as sorted lists, so write the
  expected value that way (ask for `sorted(...)` lists in the prompt when order is not defined).
  Dict keys must be strings in the expected value (Python int keys serialise as strings).
* Everything is deterministic. No randomness, time, or network.
* Each test has 2 seconds. Keep inputs small enough for a correct but plain solution; for `hard`
  questions include one larger hidden test that punishes an O(n²) or exponential approach.

### Quality bar for questions

* Start with **8–12 questions per topic**, then add more where the topic contains more distinct skills
  or where learner data shows recurring gaps. Include approachable, intermediate, and challenging
  work; at least 2 should use `kind: "interview"` with realistic framing.
* Together, questions must exercise **every concept of the topic** and important foundational
  concepts at least twice at different difficulty levels, so remediation has a meaningful next step.
* Starter code must **fail** the tests (so it is a real starting point) and must be syntactically valid.
* The reference `solution.code` must pass every test. `python3 content/validate.py` checks this using the
  same harness that grades learners.
* The solution explanation should teach: the idea, why it works, one alternative, the complexity for
  interview questions, and the typical mistake it avoids.
* Do not copy questions from copyrighted books or paid sites. Write original problems (classic
  problem *ideas* such as FizzBuzz, two-sum, balanced brackets are fine with original wording and tests).

## Concepts: `concepts.json`

The concept map is the backbone of diagnosis and targeted practice:

```json
{ "id": "slice-step", "title": "Slice step and reversal", "topic": "strings",
  "lesson": "indexing-and-slicing", "prereqs": ["slicing", "iteration-direction"],
  "description": "…" }
```

`lesson` is the lesson slug (within the concept's topic) PyPrep sends a struggling learner to.
`prereqs` lets the recommender step back when a prerequisite is also weak.

## Validate

```
python3 content/validate.py            # everything
python3 content/validate.py strings    # one topic
```
