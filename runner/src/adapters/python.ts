import { spawn, spawnSync } from 'node:child_process';
import path from 'node:path';
import { config } from '../config';
import type { LanguageAdapter, RunRequest, RunResponse, TestResult } from '../types';

const MAX_STDIO_BYTES = 64 * 1024; // anything the learner writes straight to fd 1/2, bypassing capture
const MAX_RESULT_BYTES = 512 * 1024;

function sandboxIds(slot: number): { uid?: number; gid?: number } {
  if (!config.sandboxUidBase) return {};
  const id = config.sandboxUidBase + slot;
  return { uid: id, gid: id };
}

/** Kill every process the sandbox uid owns (catches children that escaped the process group). */
function sweep(slot: number): void {
  const { uid, gid } = sandboxIds(slot);
  if (uid === undefined) return;
  try {
    spawnSync(config.pythonBin, ['-I', '-S', '-c', 'import os,signal;os.kill(-1,signal.SIGKILL)'], {
      uid,
      gid,
      stdio: 'ignore',
      timeout: 2000,
      env: { PATH: '/usr/local/bin:/usr/bin:/bin' },
    });
  } catch {
    /* best effort */
  }
}

function decodeFloatSentinels(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(decodeFloatSentinels);
  if (value && typeof value === 'object') {
    const object = value as Record<string, unknown>;
    if (Object.keys(object).length === 1 && typeof object.$float === 'string') return Number(object.$float);
    return Object.fromEntries(Object.entries(object).map(([key, item]) => [key, decodeFloatSentinels(item)]));
  }
  return value;
}

function jsonEqual(a: unknown, b: unknown): boolean {
  if (typeof a === 'boolean' || typeof b === 'boolean') return typeof a === 'boolean' && typeof b === 'boolean' && a === b;
  if (typeof a === 'number' && typeof b === 'number') return a === b || Math.abs(a - b) <= 1e-9 * Math.max(1, Math.abs(a), Math.abs(b));
  if (Array.isArray(a) || Array.isArray(b)) return Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every((value, index) => jsonEqual(value, b[index]));
  if (a && b && typeof a === 'object' && typeof b === 'object') {
    const aKeys = Object.keys(a); const bKeys = Object.keys(b);
    return aKeys.length === bKeys.length && aKeys.every((key) => Object.hasOwn(b, key) && jsonEqual((a as Record<string, unknown>)[key], (b as Record<string, unknown>)[key]));
  }
  return a === b;
}

function outputEqual(actual: string, expected: string): boolean {
  const lines = (value: string) => value.trimEnd().split(/\r?\n/).map((line) => line.trimEnd());
  const a = lines(actual); const b = lines(expected);
  return a.length === b.length && a.every((line, index) => line === b[index]);
}

function sanitize(raw: unknown, index: number, test: RunRequest['tests'][number]): TestResult | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const rawIndex = r.index;
  if (typeof rawIndex !== 'number' || !Number.isInteger(rawIndex) || rawIndex !== index) return null;
  const clip = (v: unknown, n: number) => (typeof v === 'string' ? v.slice(0, n) : undefined);
  const passedExpected = Object.hasOwn(test, 'expected') ? jsonEqual(r.actualValue, decodeFloatSentinels(test.expected)) : true;
  const passedStdout = test.stdout !== undefined ? outputEqual(typeof r.callOutput === 'string' ? r.callOutput : '', test.stdout) : true;
  return {
    index,
    passed: r.error === undefined && passedExpected && passedStdout,
    actualValue: r.actualValue,
    callOutput: clip(r.callOutput, 20000),
    actual: clip(r.actual, 700),
    stdout: clip(r.stdout, 2000),
    error: clip(r.error, 700),
    skipped: r.skipped === true ? true : undefined,
    ms: typeof r.ms === 'number' ? Math.min(Math.max(0, Math.round(r.ms)), 60000) : undefined,
  };
}

export const pythonAdapter: LanguageAdapter = {
  language: 'python',

  run(req: RunRequest, slot: number): Promise<RunResponse> {
    return new Promise((resolve) => {
      const { uid, gid } = sandboxIds(slot);
      const env: Record<string, string> = {
        PATH: '/usr/local/bin:/usr/bin:/bin',
        LANG: 'C.UTF-8',
        PYPREP_MEM_MB: String(config.memoryLimitMb),
        PYPREP_CPU_S: String(config.cpuLimitSeconds),
        PYPREP_NPROC: String(config.processLimit),
      };
      // Keep authored answers and expected output in this trusted process. The Python harness
      // sees only test inputs and returns actual values for comparison here.
      const learnerTests = req.tests.map(({ expected: _expected, stdout: _expectedStdout, ...test }) => test);
      const child = spawn(
        config.pythonBin,
        ['-I', '-B', '-X', 'utf8', path.join(config.harnessDir, 'python_harness.py'), '--result-fd', '3'],
        {
          cwd: config.emptyDir,
          env,
          uid,
          gid,
          detached: true, // own process group so the whole tree can be killed
          stdio: ['pipe', 'pipe', 'pipe', 'pipe'],
        },
      );

      let settled = false;
      let killedFor: 'wall' | 'output' | null = null;
      let stdioBytes = 0;
      let resultBuf = '';
      let resultBytes = 0;

      const killTree = () => {
        try {
          if (child.pid) process.kill(-child.pid, 'SIGKILL');
        } catch {
          /* already gone */
        }
      };

      const finish = (exitCode: number | null, signal: NodeJS.Signals | null) => {
        if (settled) return;
        settled = true;
        clearTimeout(wall);
        killTree();
        sweep(slot);

        const results: TestResult[] = [];
        for (const line of resultBuf.split('\n')) {
          if (!line.trim()) continue;
          try {
            const raw = JSON.parse(line) as { index?: unknown };
            const index = raw.index;
            const test = typeof index === 'number' && Number.isInteger(index) ? req.tests[index] : undefined;
            const r = test ? sanitize(raw, index as number, test) : null;
            if (r && !results.some((x) => x.index === r.index)) results.push(r);
          } catch {
            /* ignore garbage lines */
          }
        }
        results.sort((a, b) => a.index - b.index);

        let status: RunResponse['status'] = 'ok';
        let message: string | undefined;
        if (killedFor === 'wall') {
          status = 'timeout';
          message = `Your program was stopped after ${config.wallLimitSeconds}s of total run time.`;
        } else if (killedFor === 'output') {
          status = 'output_limit';
          message = 'Your program wrote too much output and was stopped.';
        } else if (results.length < req.tests.length) {
          status = 'crashed';
          if (signal === 'SIGXCPU' || signal === 'SIGKILL') {
            message = 'Your program was stopped for using too much CPU time or memory.';
          } else if (signal) {
            message = `Your program was terminated by a signal (${signal}).`;
          } else {
            message = `Your program exited early (code ${exitCode}).`;
          }
        }
        // Make sure every test has a result so the API never has to guess.
        for (let i = 0; i < req.tests.length; i++) {
          if (!results.some((r) => r.index === i)) {
            results.push({ index: i, passed: false, skipped: true, error: message ?? 'Not run.' });
          }
        }
        results.sort((a, b) => a.index - b.index);
        resolve({ status, results, message });
      };

      const wall = setTimeout(() => {
        killedFor = 'wall';
        killTree();
      }, config.wallLimitSeconds * 1000);

      const onStdio = (chunk: Buffer) => {
        stdioBytes += chunk.length;
        if (stdioBytes > MAX_STDIO_BYTES && !killedFor) {
          killedFor = 'output';
          killTree();
        }
      };
      child.stdout?.on('data', onStdio);
      child.stderr?.on('data', onStdio);
      const resultStream = child.stdio[3] as NodeJS.ReadableStream | null;
      resultStream?.on('data', (chunk: Buffer) => {
        resultBytes += chunk.length;
        if (resultBytes > MAX_RESULT_BYTES) {
          if (!killedFor) killedFor = 'output';
          killTree();
          return;
        }
        resultBuf += chunk.toString('utf8');
      });
      resultStream?.on('error', () => undefined);
      child.stdin?.on('error', () => undefined);
      child.on('error', () => finish(null, null));
      // 'close' fires after stdio streams end, so every result line has been read.
      child.on('close', (code, signal) => finish(code, signal));

      child.stdin?.end(
        JSON.stringify({ code: req.code, entry: req.entry, tests: learnerTests }),
      );
    });
  },
};
