#!/usr/bin/env python3
"""Validate PyPrep content: structure, concept references, and every question's tests.

Each question's reference solution is run through the SAME harness the runner uses for
learners (runner/harness/python_harness.py). The starter code must fail at least one test.

Usage: python3 content/validate.py [topic-slug ...]
"""
import json, os, re, subprocess, sys, tempfile, pathlib

ROOT = pathlib.Path(__file__).resolve().parent
HARNESS = ROOT.parent / "runner" / "harness" / "python_harness.py"
TRACKS = ROOT / "tracks"

errors, warnings = [], []


def err(msg):
    errors.append(msg)


def warn(msg):
    warnings.append(msg)


def run_harness(code, entry, tests):
    with tempfile.NamedTemporaryFile("r", suffix=".json", delete=False) as tf:
        out_path = tf.name
    try:
        spec = json.dumps({"code": code, "entry": entry, "tests": tests})
        p = subprocess.run(
            [sys.executable, "-I", "-B", str(HARNESS), "--result-file", out_path],
            input=spec.encode(), capture_output=True, timeout=120,
        )
        if p.returncode != 0:
            return None, p.stderr.decode(errors="replace")[-500:]
        with open(out_path) as f:
            return [json.loads(line) for line in f if line.strip()], ""
    except subprocess.TimeoutExpired:
        return None, "harness timed out"
    finally:
        os.unlink(out_path)


FM = re.compile(r"\A---\n(.*?)\n---\n(.*)\Z", re.S)


def parse_frontmatter(text):
    m = FM.match(text)
    if not m:
        return None, text
    meta = {}
    for line in m.group(1).splitlines():
        if ":" not in line:
            continue
        k, v = line.split(":", 1)
        v = v.strip()
        if v.startswith("[") and v.endswith("]"):
            v = [x.strip() for x in v[1:-1].split(",") if x.strip()]
        meta[k.strip()] = v
    return meta, m.group(2)


def words(s):
    return len(re.findall(r"\w+", s))


def main():
    only = set(sys.argv[1:])
    for track_dir in sorted(p for p in TRACKS.iterdir() if p.is_dir()):
        track = json.loads((track_dir / "track.json").read_text())
        concepts = json.loads((track_dir / "concepts.json").read_text())
        cids = {c["id"] for c in concepts}
        if len(cids) != len(concepts):
            err("duplicate concept ids")
        topic_lessons = {t["slug"]: [l["slug"] for l in t["lessons"]] for t in track["topics"]}
        for c in concepts:
            if c["topic"] not in topic_lessons:
                err(f"concept {c['id']}: unknown topic {c['topic']}")
            elif c["lesson"] not in topic_lessons[c["topic"]]:
                err(f"concept {c['id']}: unknown lesson {c['lesson']} in topic {c['topic']}")
            for p in c.get("prereqs", []):
                if p not in cids:
                    err(f"concept {c['id']}: unknown prereq {p}")

        covered = {}
        total_q = total_l = 0
        for topic in track["topics"]:
            ts = topic["slug"]
            if only and ts not in only:
                continue
            tdir = track_dir / ts
            if not tdir.is_dir():
                err(f"[{ts}] topic folder missing")
                continue
            # lessons
            for i, lesson in enumerate(topic["lessons"], start=1):
                f = tdir / "lessons" / f"{i:02d}-{lesson['slug']}.md"
                if not f.exists():
                    err(f"[{ts}] missing lesson file {f.name}")
                    continue
                meta, body = parse_frontmatter(f.read_text())
                if meta is None:
                    err(f"[{ts}/{f.name}] missing front matter")
                    continue
                for key in ("title", "summary", "minutes", "concepts"):
                    if key not in meta:
                        err(f"[{ts}/{f.name}] front matter missing '{key}'")
                for c in meta.get("concepts", []) if isinstance(meta.get("concepts"), list) else []:
                    if c not in cids:
                        err(f"[{ts}/{f.name}] unknown concept {c}")
                n = words(body)
                if n < 800:
                    err(f"[{ts}/{f.name}] only {n} words (need >= 800)")
                for h in ("## Why this matters", "## The mental model", "## Common mistakes", "## Check yourself", "## Key takeaways"):
                    if h not in body:
                        err(f"[{ts}/{f.name}] missing section '{h}'")
                if re.search(r"TODO|lorem ipsum|coming soon", body, re.I):
                    err(f"[{ts}/{f.name}] contains placeholder text")
                total_l += 1
            # reference
            ref = tdir / "reference.md"
            if not ref.exists():
                err(f"[{ts}] missing reference.md")
            else:
                meta, body = parse_frontmatter(ref.read_text())
                if meta is None or "title" not in meta:
                    err(f"[{ts}/reference.md] needs front matter with title")
                if words(body) < 150:
                    err(f"[{ts}/reference.md] too short")
            # questions
            qf = tdir / "questions.json"
            if not qf.exists():
                err(f"[{ts}] missing questions.json")
                continue
            try:
                questions = json.loads(qf.read_text())
            except json.JSONDecodeError as e:
                err(f"[{ts}] questions.json invalid JSON: {e}")
                continue
            if not (6 <= len(questions) <= 16):
                warn(f"[{ts}] has {len(questions)} questions (target 8-16, scaled to topic coverage)")
            slugs = set()
            counts = {"easy": 0, "medium": 0, "hard": 0}
            interview = 0
            for q in questions:
                tag = f"[{ts}/{q.get('slug', '?')}]"
                for key in ("slug", "title", "difficulty", "kind", "concepts", "prompt", "entry", "starterCode", "hints", "solution", "tests"):
                    if key not in q:
                        err(f"{tag} missing '{key}'")
                if "slug" not in q or "tests" not in q or "solution" not in q:
                    continue
                if q["slug"] in slugs:
                    err(f"{tag} duplicate slug")
                slugs.add(q["slug"])
                if q["difficulty"] not in counts:
                    err(f"{tag} bad difficulty")
                else:
                    counts[q["difficulty"]] += 1
                if q["kind"] not in ("practice", "interview"):
                    err(f"{tag} bad kind")
                interview += q["kind"] == "interview"
                if len(q["hints"]) != 3:
                    err(f"{tag} needs exactly 3 hints")
                for c in q["concepts"]:
                    if c not in cids:
                        err(f"{tag} unknown concept {c}")
                    covered.setdefault(c, []).append((ts, q["slug"], q["difficulty"]))
                if not isinstance(q["solution"], dict) or "code" not in q["solution"] or "explanation" not in q["solution"]:
                    err(f"{tag} solution needs code + explanation")
                    continue
                if len(q["solution"]["explanation"]) < 150:
                    warn(f"{tag} solution explanation is short")
                tests = q["tests"]
                hidden = sum(1 for t in tests if t.get("hidden"))
                if hidden < 2 or len(tests) - hidden < 2:
                    err(f"{tag} needs >=2 visible and >=2 hidden tests")
                for i, t in enumerate(tests):
                    if not t.get("tags"):
                        err(f"{tag} test {i} has no tags")
                    for c in t.get("tags", []):
                        if c not in cids:
                            err(f"{tag} test {i} unknown tag {c}")
                    if "expected" not in t and "stdout" not in t:
                        err(f"{tag} test {i} needs expected or stdout")
                    if "args" not in t and "program" not in t:
                        err(f"{tag} test {i} needs args or program")
                # reference solution must pass everything
                results, problem = run_harness(q["solution"]["code"], q["entry"], tests)
                if results is None:
                    err(f"{tag} harness failure: {problem}")
                else:
                    for t, r in zip(tests, results):
                        if not r["passed"]:
                            err(f"{tag} reference solution FAILS test {r['index']} args={t.get('args', t.get('program'))!r}: actual={r.get('actual')} error={r.get('error')}")
                # starter must fail something
                results, problem = run_harness(q["starterCode"], q["entry"], tests)
                if results is None:
                    err(f"{tag} starter harness failure: {problem}")
                elif all(r["passed"] for r in results):
                    err(f"{tag} starterCode already passes every test")
                total_q += 1
            if counts["easy"] < 2 or counts["medium"] < 2:
                warn(f"[{ts}] difficulty spread {counts}")
            if interview < 2:
                warn(f"[{ts}] only {interview} interview-style questions")

        if not only:
            for c in concepts:
                if c["id"] not in covered:
                    warn(f"concept '{c['id']}' has no questions")
                elif len(covered[c["id"]]) < 2 and c["id"] not in ("type-hints", "modules-testing"):
                    warn(f"concept '{c['id']}' has only one question (remediation needs 2+)")
        print(f"track {track['slug']}: {total_l} lessons, {total_q} questions checked")

    for w in warnings:
        print("WARN ", w)
    for e in errors:
        print("ERROR", e)
    print(f"\n{len(errors)} error(s), {len(warnings)} warning(s)")
    sys.exit(1 if errors else 0)


if __name__ == "__main__":
    main()
