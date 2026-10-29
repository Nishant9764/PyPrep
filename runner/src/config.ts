import 'dotenv/config';

function int(name: string, def: number): number {
  const v = process.env[name];
  if (v === undefined || v === '') return def;
  const n = Number(v);
  if (!Number.isInteger(n) || n < 0) throw new Error(`${name} must be a non-negative integer`);
  return n;
}

const secret = process.env.RUNNER_SECRET ?? '';
if (secret.length < 16) {
  throw new Error('RUNNER_SECRET must be set to a random string of at least 16 characters');
}

export const config = {
  secret,
  port: process.env.RUNNER_PORT ? int('RUNNER_PORT', 5001) : undefined,
  socket: process.env.RUNNER_SOCKET || undefined,
  socketGid: process.env.RUNNER_SOCKET_GID ? int('RUNNER_SOCKET_GID', 0) : undefined,
  /** 0 = do not drop privileges (dev only). Otherwise learner code runs as uid base+slot. */
  sandboxUidBase: int('SANDBOX_UID_BASE', 0),
  maxConcurrent: Math.max(1, int('MAX_CONCURRENT', 4)),
  maxQueue: int('MAX_QUEUE', 40),
  memoryLimitMb: int('MEMORY_LIMIT_MB', 256),
  cpuLimitSeconds: int('CPU_LIMIT_SECONDS', 8),
  wallLimitSeconds: int('WALL_LIMIT_SECONDS', 10),
  processLimit: int('PROCESS_LIMIT', 32),
  pythonBin: process.env.PYTHON_BIN || 'python3',
  harnessDir: process.env.HARNESS_DIR || require('node:path').resolve(__dirname, '../harness'),
  emptyDir: process.env.SANDBOX_CWD || '/',
  maxCodeChars: 20000,
  maxTests: 40,
};
