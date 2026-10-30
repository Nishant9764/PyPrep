#!/usr/bin/env python3
"""
PyPrep Python test harness.

Reads ONE JSON document from stdin:
    {"code": "<learner source>", "entry": "func_name", "tests": [ ... ]}
and writes one JSON line per test result to a result sink
(file descriptor 3 by default, or --result-file PATH for local tooling).

Test shapes (all optional keys noted):
    {"args": [...], "kwargs": {...}, "stdin": "text", "inPlace": bool}
    {"program": "<python source that sets `result`>"}

Design notes
- The harness runs INSIDE a locked-down container with OS-level limits applied by the
  runner (prlimit, no network, read-only fs). It is not itself a sandbox.
- Hidden-test data arrives over stdin and is never written to disk, so learner code
  cannot open() it.
- The learner's code is re-executed per test so state never leaks between tests.
- This process returns actual values and printed output only. Expected answers stay in the
  trusted runner, which compares the observations after the harness exits.
- Timeouts raise a BaseException subclass so `except Exception:` cannot swallow them.
"""
import sys, json, io, os, copy, signal, time, fcntl

PER_TEST_SECONDS = 2.0
MAX_TIMEOUTS = 2
MAX_CAPTURE = 20000
MAX_REPR = 600


class _Timeout(BaseException):
    pass


def _on_alarm(signum, frame):
    raise _Timeout()


class Capped(io.StringIO):
    """StringIO that stops growing past MAX_CAPTURE characters (protects memory)."""

    def __init__(self):
        super().__init__()
        self._n = 0
        self.truncated = False

    def write(self, s):
        if self._n >= MAX_CAPTURE:
            self.truncated = True
            return len(s)
        room = MAX_CAPTURE - self._n
        if len(s) > room:
            s = s[:room]
            self.truncated = True
        self._n += len(s)
        return super().write(s)


def _json_default(o):
    if isinstance(o, (set, frozenset)):
        try:
            return sorted(o)
        except TypeError:
            return sorted(o, key=repr)
    return repr(o)


def norm(v):
    """Normalise a Python value into what json.loads(json.dumps(v)) would give."""
    try:
        return json.loads(json.dumps(v, default=_json_default))
    except Exception:
        return repr(v)


def short(v):
    s = repr(v)
    return s if len(s) <= MAX_REPR else s[:MAX_REPR] + "…"


def fmt_error(exc):
    if isinstance(exc, _Timeout):
        return "Time limit exceeded (%ss). Check for an infinite loop or a very slow algorithm." % PER_TEST_SECONDS
    if isinstance(exc, SystemExit):
        return "Your code called exit()/sys.exit(); remove it so your function can return."
    line = None
    tb = exc.__traceback__
    while tb is not None:
        if tb.tb_frame.f_code.co_filename == "<solution>":
            line = tb.tb_lineno
        tb = tb.tb_next
    if isinstance(exc, SyntaxError):
        if exc.filename == "<solution>":
            line = exc.lineno
        msg = "SyntaxError: %s" % (exc.msg,)
    elif isinstance(exc, MemoryError):
        msg = "MemoryError: your program used too much memory"
    else:
        msg = "%s: %s" % (type(exc).__name__, exc)
    if line:
        msg += " (line %d)" % line
    return msg[:MAX_REPR]


def run_test(code, entry, test, index):
    res = {"index": index, "passed": False}
    mod_buf, call_buf = Capped(), Capped()
    ns = {"__name__": "__main__"}
    old = (sys.stdout, sys.stderr, sys.stdin)
    started = time.perf_counter()
    try:
        signal.setitimer(signal.ITIMER_REAL, PER_TEST_SECONDS)
        try:
            sys.stdin = io.StringIO(test.get("stdin", "") or "")
            sys.stdout = sys.stderr = mod_buf
            exec(compile(code, "<solution>", "exec"), ns)
            sys.stdout = sys.stderr = call_buf
            if "program" in test:
                exec(compile(test["program"], "<test>", "exec"), ns)
                actual = ns.get("result")
            else:
                fn = ns.get(entry)
                if not callable(fn):
                    raise NameError("Your code must define a function named `%s`." % entry)
                args = copy.deepcopy(test.get("args", []))
                kwargs = copy.deepcopy(test.get("kwargs", {}))
                actual = fn(*args, **kwargs)
                if test.get("inPlace"):
                    actual = args[0]
            # Expected answers stay in the trusted Node runner. This process receives
            # only inputs and returns observations for the adapter to compare.
            res["actualValue"] = norm(actual)
            res["callOutput"] = call_buf.getvalue()
            res["actual"] = short(actual)
            res["passed"] = True
        finally:
            signal.setitimer(signal.ITIMER_REAL, 0)
            sys.stdout, sys.stderr, sys.stdin = old
    except BaseException as exc:  # noqa: BLE001 - learner code may raise anything
        signal.setitimer(signal.ITIMER_REAL, 0)
        sys.stdout, sys.stderr, sys.stdin = old
        res["passed"] = False
        res["error"] = fmt_error(exc)
    out = mod_buf.getvalue() + call_buf.getvalue()
    if out:
        res["stdout"] = out[:2000]
    res["ms"] = int((time.perf_counter() - started) * 1000)
    return res


def _decode(obj):
    """JSON has one number type, and Node (which sits between the content files and this harness)
    cannot tell 4.0 from 4. The seed script therefore ships integral floats as {"$float": "4.0"}."""
    if len(obj) == 1 and "$float" in obj:
        return float(obj["$float"])
    return obj


def apply_limits():
    """Lower OS resource limits for THIS process (and so for the learner code it runs).

    Values come from the runner via environment variables and are removed from os.environ
    straight afterwards. Hard limits can only be lowered by an unprivileged process, so
    learner code cannot raise them again.
    """
    try:
        import resource
    except ImportError:  # non-POSIX: nothing to do
        return
    def getint(name):
        v = os.environ.pop(name, None)
        return int(v) if v and v.isdigit() else None
    mem, cpu, nproc = getint("PYPREP_MEM_MB"), getint("PYPREP_CPU_S"), getint("PYPREP_NPROC")
    def lim(res, soft, hard=None):
        try:
            resource.setrlimit(res, (soft, soft if hard is None else hard))
        except (ValueError, OSError):
            pass
    if mem:
        lim(resource.RLIMIT_AS, mem * 1024 * 1024)
    if cpu:
        lim(resource.RLIMIT_CPU, cpu, cpu + 1)
    if nproc:
        lim(resource.RLIMIT_NPROC, nproc)
    lim(resource.RLIMIT_FSIZE, 1024 * 1024)
    lim(resource.RLIMIT_CORE, 0)
    lim(resource.RLIMIT_NOFILE, 128)


def main():
    argv = sys.argv[1:]
    result_file = None
    result_fd = 3
    i = 0
    while i < len(argv):
        if argv[i] == "--result-file":
            result_file = argv[i + 1]
            i += 2
        elif argv[i] == "--result-fd":
            result_fd = int(argv[i + 1])
            i += 2
        else:
            i += 1

    spec = json.loads(sys.stdin.read(), object_hook=_decode)
    if result_file:
        sink = open(result_file, "w")
    else:
        # Move the result pipe to a high descriptor and close fd 3 so learner code is
        # less likely to stumble on it. (It can still be found deliberately; a learner
        # who forges their own result only fools themselves: scores are advisory.)
        high = fcntl.fcntl(result_fd, fcntl.F_DUPFD, 100)
        os.close(result_fd)
        sink = os.fdopen(high, "w")

    apply_limits()
    signal.signal(signal.SIGALRM, _on_alarm)
    # One JSON object per line, flushed after every test, so a run that is killed part-way
    # through (overall wall-clock limit, OOM) still yields the results produced so far.
    timeouts = 0
    for idx, t in enumerate(spec.get("tests", [])):
        if timeouts >= MAX_TIMEOUTS:
            r = {"index": idx, "passed": False, "skipped": True,
                 "error": "Not run: your code timed out on earlier tests."}
        else:
            r = run_test(spec["code"], spec.get("entry", ""), t, idx)
            if r.get("error", "").startswith("Time limit exceeded"):
                timeouts += 1
        sink.write(json.dumps(r) + "\n")
        sink.flush()


if __name__ == "__main__":
    main()
