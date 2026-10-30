import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
import express, { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
import { config } from './config';
import { pythonAdapter } from './adapters/python';
import { SlotPool } from './queue';
import type { LanguageAdapter } from './types';

/** Register new languages here. The rest of the platform only knows the language string. */
const adapters = new Map<string, LanguageAdapter>([[pythonAdapter.language, pythonAdapter]]);

const pool = new SlotPool(config.maxConcurrent, config.maxQueue);

const testSchema = z
  .object({
    args: z.array(z.unknown()).max(20).optional(),
    kwargs: z.record(z.unknown()).optional(),
    expected: z.unknown().optional(),
    stdout: z.string().max(20000).optional(),
    stdin: z.string().max(20000).optional(),
    inPlace: z.boolean().optional(),
    program: z.string().max(10000).optional(),
  })
  .strict()
  .refine((test) => Object.hasOwn(test, 'expected') || test.stdout !== undefined, 'Each test must assert an expected value or printed output.');

const bodySchema = z.object({
  language: z.string().max(32),
  code: z.string().max(config.maxCodeChars),
  entry: z.string().max(100).default(''),
  tests: z.array(testSchema).min(1).max(config.maxTests),
});

function constantTimeEqual(a: string, b: string): boolean {
  const ha = crypto.createHash('sha256').update(a).digest();
  const hb = crypto.createHash('sha256').update(b).digest();
  return crypto.timingSafeEqual(ha, hb);
}

const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '1mb' }));

function auth(req: Request, res: Response, next: NextFunction) {
  const header = req.header('authorization') ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!constantTimeEqual(token, config.secret)) {
    res.status(401).json({ error: 'unauthorized' });
    return;
  }
  next();
}

app.get('/health', (_req, res) => {
  res.json({ ok: true, languages: [...adapters.keys()], queued: pool.queued });
});

app.post('/run', auth, async (req, res) => {
  const parsed = bodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'invalid request', details: parsed.error.issues.slice(0, 5) });
    return;
  }
  const adapter = adapters.get(parsed.data.language);
  if (!adapter) {
    res.status(400).json({ error: `unsupported language: ${parsed.data.language}` });
    return;
  }
  try {
    const result = await pool.withSlot((slot) => adapter.run(parsed.data, slot));
    res.json({ ...result, limits: { wallSeconds: config.wallLimitSeconds, cpuSeconds: config.cpuLimitSeconds, memoryMb: config.memoryLimitMb } });
  } catch (err) {
    if (err instanceof Error && err.message === 'busy') {
      res.status(503).json({ error: 'The code runner is busy. Please try again in a few seconds.' });
      return;
    }
    console.error('runner error', err);
    res.status(500).json({ error: 'runner failure' });
  }
});

app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof SyntaxError) {
    res.status(400).json({ error: 'invalid json' });
    return;
  }
  console.error(err);
  res.status(500).json({ error: 'runner failure' });
});

/**
 * Fail fast, with a useful message, if the unprivileged sandbox user cannot actually run the
 * harness (the usual cause: the project sits in a directory only the owner can read).
 */
function selfCheck(): void {
  if (!config.sandboxUidBase) return;
  const harness = path.join(config.harnessDir, 'python_harness.py');
  const id = config.sandboxUidBase;
  const r = spawnSync(config.pythonBin, ['-I', '-c', 'import sys; open(sys.argv[1]).read(); print("ok")', harness], {
    uid: id,
    gid: id,
    cwd: config.emptyDir,
    env: { PATH: '/usr/local/bin:/usr/bin:/bin' },
    encoding: 'utf8',
    timeout: 5000,
  });
  if (r.status !== 0 || !r.stdout.includes('ok')) {
    console.error(
      `Sandbox self-check FAILED: the unprivileged sandbox user (uid ${id}) cannot read the harness at\n  ${harness}\n` +
        `${(r.stderr || r.error?.message || '').toString().trim()}\n` +
        `Fix: make the project world-readable (chmod -R a+rX <project dir>, and its parent directories must be traversable),\n` +
        `or set SANDBOX_UID_BASE=0 to run without the privilege drop (development only).`,
    );
    process.exit(1);
  }
}

function main() {
  selfCheck();
  if (config.socket) {
    try {
      fs.unlinkSync(config.socket);
    } catch {
      /* no stale socket */
    }
    const server = app.listen(config.socket, () => {
      try {
        // Only root (the runner) and the shared group may connect. Sandboxed learner code runs
        // as a different, unprivileged uid and therefore cannot reach this socket.
        if (config.socketGid !== undefined) fs.chownSync(config.socket!, 0, config.socketGid);
        fs.chmodSync(config.socket!, 0o660);
      } catch (e) {
        console.error('could not set socket permissions', e);
        process.exit(1);
      }
      console.log(`runner listening on unix socket ${config.socket}`);
    });
    server.on('error', (e) => {
      console.error(e);
      process.exit(1);
    });
  } else {
    const port = config.port ?? 5001;
    // Loopback only unless a socket is used; in Docker the socket is the supported path.
    app.listen(port, process.env.RUNNER_HOST || '127.0.0.1', () => console.log(`runner listening on :${port}`));
  }
  console.log(
    `limits: mem=${config.memoryLimitMb}MB cpu=${config.cpuLimitSeconds}s wall=${config.wallLimitSeconds}s ` +
      `nproc=${config.processLimit} concurrent=${config.maxConcurrent} sandboxUidBase=${config.sandboxUidBase || 'off'}`,
  );
}

main();
