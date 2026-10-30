/**
 * Isolation tests: start the runner and throw hostile programs at it.
 *   npm test            (from runner/)
 *
 * Run as root with SANDBOX_UID_BASE set (done automatically below when possible) to also
 * exercise the privilege-drop path. In Docker these same tests are what you want to re-run
 * with `docker compose exec runner npm test` after changing limits.
 */
import { spawn, ChildProcess } from 'node:child_process';
import path from 'node:path';

const PORT = 5099;
const SECRET = 'test-secret-0123456789abcdef';
const BASE = `http://127.0.0.1:${PORT}`;
const isRoot = typeof process.getuid === 'function' && process.getuid() === 0;
const linuxRlimits = process.platform === 'linux';

let server: ChildProcess;
let failures = 0;

async function run(code: string, tests: unknown[] = [{ args: [], expected: 1 }], entry = 'f') {
  const t0 = Date.now();
  const res = await fetch(`${BASE}/run`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${SECRET}` },
    body: JSON.stringify({ language: 'python', code, entry, tests }),
  });
  const body: any = await res.json();
  return { status: res.status, body, ms: Date.now() - t0 };
}

function check(name: string, ok: boolean, detail?: unknown) {
  if (ok) console.log(`  PASS  ${name}`);
  else {
    failures++;
    console.log(`  FAIL  ${name}`, detail !== undefined ? JSON.stringify(detail).slice(0, 400) : '');
  }
}

async function waitForServer() {
  for (let i = 0; i < 50; i++) {
    try {
      const r = await fetch(`${BASE}/health`);
      if (r.ok) return;
    } catch {
      /* not up yet */
    }
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error('runner did not start');
}

async function main() {
  // Load TypeScript through Node's loader instead of the tsx CLI. The CLI opens
  // a temporary IPC socket, which is denied in some restricted CI environments.
  server = spawn(process.execPath, ['--import', 'tsx', path.join(__dirname, '../src/index.ts')], {
    env: {
      ...process.env,
      RUNNER_SECRET: SECRET,
      RUNNER_PORT: String(PORT),
      SANDBOX_UID_BASE: isRoot ? '20000' : '0',
      WALL_LIMIT_SECONDS: '6',
      PROCESS_LIMIT: '32',
      MEMORY_LIMIT_MB: '256',
      HARNESS_DIR: path.join(__dirname, '../harness'),
    },
    stdio: 'inherit',
  });
  await waitForServer();
  console.log(`runner up (privilege drop ${isRoot ? 'ON, uid 20000+slot' : 'OFF (not root)'})\n`);

  // --- correctness -------------------------------------------------------------------------
  let r = await run('def f():\n    return 1\n');
  check('correct solution passes', r.body.results?.[0]?.passed === true, r.body);

  r = await run('def f(:\n  pass');
  check('syntax error reported with line', /SyntaxError/.test(r.body.results?.[0]?.error ?? ''), r.body);

  r = await run('def f():\n    return 2\n');
  check('wrong answer fails, shows actual', r.body.results[0].passed === false && r.body.results[0].actual === '2', r.body);

  r = await run('def f():\n    print("hello")\n    return 1\n', [{ args: [], expected: 1, stdout: 'hello' }]);
  check('stdout comparison works', r.body.results[0].passed === true, r.body);

  // --- denial of service ---------------------------------------------------------------------
  r = await run('def f():\n    while True: pass\n');
  check('infinite loop is stopped with a clear message', /Time limit/.test(r.body.results[0].error ?? ''), r.body);

  r = await run(
    'def f():\n    while True:\n        try:\n            while True: pass\n        except BaseException:\n            pass\n',
    [{ args: [], expected: 1 }, { args: [], expected: 1 }, { args: [], expected: 1 }, { args: [], expected: 1 }],
  );
  check(
    'code that swallows the timeout exception is still killed within the wall limit',
    r.ms < 9000 && r.body.results.every((x: any) => x.passed === false),
    { ms: r.ms, status: r.body.status },
  );

  if (linuxRlimits) {
    r = await run('def f():\n    x = []\n    while True:\n        x.append("a" * 10**6)\n');
    check('memory bomb is contained (MemoryError, no host impact)', /MemoryError|too much memory/.test(JSON.stringify(r.body)), r.body);

    r = await run('def f():\n    x = "a" * (10**9)\n    return 1\n');
    check('single huge allocation fails', r.body.results[0].passed === false, r.body);
  } else {
    console.log('  SKIP  RLIMIT_AS memory checks (Linux-only; verify in Linux CI/container)');
  }

  r = await run(
    'import os\ndef f():\n    n = 0\n    try:\n        while True:\n            if os.fork() == 0:\n                while True: pass\n            n += 1\n    except OSError as e:\n        return -n\n',
  );
  if (isRoot) {
    check('fork bomb is limited by RLIMIT_NPROC', r.ms < 9000 && r.body.results[0].passed === false, { ms: r.ms, body: r.body });
  } else {
    console.log('  SKIP  fork bomb (needs root to switch to a sandbox uid; covered by docker pids_limit)');
  }
  // After a fork bomb the runner must still be healthy and orphans swept
  r = await run('def f():\n    return 1\n');
  check('runner healthy after fork bomb', r.body.results?.[0]?.passed === true, r.body);

  r = await run('import os\ndef f():\n    while True:\n        os.write(1, b"x" * 65536)\n');
  check('output flood is stopped', r.ms < 9000 && r.body.results[0].passed === false, { ms: r.ms, body: r.body });

  r = await run('def f():\n    print("y" * 10**7)\n    return 1\n');
  check('huge print is truncated, not buffered whole', r.body.results[0].stdout === undefined || r.body.results[0].stdout.length <= 2000, r.body);

  r = await run('import sys\ndef f():\n    sys.exit(0)\n');
  check('sys.exit cannot end grading early', r.body.results[0].passed === false && /exit/.test(r.body.results[0].error ?? ''), r.body);

  // --- confidentiality / integrity ------------------------------------------------------------
  r = await run('import os\ndef f():\n    return os.environ.get("RUNNER_SECRET", "none")\n', [{ args: [], expected: 'none' }]);
  check('environment does not contain the runner secret', r.body.results[0].passed === true, r.body);

  r = await run(
    'def f():\n    try:\n        return open("/proc/%d/environ" % __import__("os").getppid()).read()[:40]\n    except Exception as e:\n        return "denied"\n',
    [{ args: [], expected: 'denied' }],
  );
  if (isRoot) check("cannot read the runner process's /proc/<pid>/environ", r.body.results[0].passed === true, r.body);
  else console.log('  SKIP  /proc environ (same uid without privilege drop in dev mode)');

  r = await run(
    'def f():\n    try:\n        open("/tmp/pyprep_pwn.txt", "w").write("x" * 5000000)\n        return "wrote"\n    except Exception as e:\n        return "blocked"\n',
    [{ args: [], expected: 'blocked' }],
  );
  check('large file write is blocked (RLIMIT_FSIZE / permissions)', r.body.results[0].passed === true, r.body);

  r = await run(
    'import os\ndef f():\n    try:\n        os.setuid(0)\n        return "root"\n    except Exception:\n        return "no"\n',
    [{ args: [], expected: 'no' }],
  );
  check('learner code cannot become root', r.body.results[0].passed === true, r.body);

  r = await run(
    'import resource\ndef f():\n    try:\n        resource.setrlimit(resource.RLIMIT_AS, (resource.RLIM_INFINITY, resource.RLIM_INFINITY))\n        return "raised"\n    except Exception:\n        return "locked"\n',
    [{ args: [], expected: 'locked' }],
  );
  if (isRoot) check('cannot raise hard resource limits', r.body.results[0].passed === true, r.body);
  else console.log('  SKIP  raise hard limit (harness runs as same user; soft/hard lowered for non-root)');

  r = await run(
    'def f():\n    import socket\n    s = socket.socket()\n    s.settimeout(1)\n    try:\n        s.connect(("127.0.0.1", %d))\n        s.sendall(b"GET /health HTTP/1.0\\r\\n\\r\\n")\n        return "reached" if s.recv(100) else "no"\n    except Exception:\n        return "no"\n'.replace('%d', String(PORT)),
    [{ args: [], expected: 'no' }],
  );
  console.log(
    `  INFO  loopback reachable from sandbox: ${r.body.results[0].passed ? 'no' : 'YES (expected in non-Docker dev; Docker uses network_mode: none)'}`,
  );

  // --- API hygiene ---------------------------------------------------------------------------
  const noAuth = await fetch(`${BASE}/run`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' });
  check('requests without the secret are rejected', noAuth.status === 401);

  const bad = await fetch(`${BASE}/run`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${SECRET}` },
    body: JSON.stringify({ language: 'python', code: 'x', tests: [{ evil: 1 }] }),
  });
  check('unknown test fields are rejected (strict schema)', bad.status === 400);

  const unsupported = await run('x=1');
  const un = await fetch(`${BASE}/run`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${SECRET}` },
    body: JSON.stringify({ language: 'cobol', code: 'x', entry: 'f', tests: [{ args: [] }] }),
  });
  check('unsupported language is rejected', un.status === 400 && unsupported.status === 200);

  // --- concurrency ---------------------------------------------------------------------------
  const t0 = Date.now();
  const many = await Promise.all(
    Array.from({ length: 8 }, (_, i) => run(`def f():\n    return ${i === 3 ? 1 : 1}\n`)),
  );
  check('8 concurrent jobs all complete correctly', many.every((m) => m.body.results?.[0]?.passed === true), many.map((m) => m.status));
  console.log(`  INFO  8 concurrent trivial jobs took ${Date.now() - t0}ms`);

  console.log(failures === 0 ? '\nAll isolation checks passed.' : `\n${failures} check(s) FAILED.`);
}

main()
  .catch((e) => {
    console.error(e);
    failures++;
  })
  .finally(() => {
    server?.kill('SIGTERM');
    process.exit(failures ? 1 : 0);
  });
