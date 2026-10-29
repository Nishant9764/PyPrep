import 'dotenv/config';
import path from 'node:path';

const isProd = process.env.NODE_ENV === 'production';

function str(name: string, fallback?: string): string {
  const v = process.env[name] ?? fallback;
  if (v === undefined || v === '') throw new Error(`Missing required environment variable ${name} (see server/.env.example)`);
  return v;
}

function bool(name: string, fallback: boolean): boolean {
  const v = process.env[name];
  if (v === undefined || v === '') return fallback;
  return ['1', 'true', 'yes'].includes(v.toLowerCase());
}

const DEV_SECRET = 'dev-only-insecure-secret-change-me-please-0123456789';
const jwtSecret = str('JWT_SECRET', isProd ? undefined : DEV_SECRET);
if (jwtSecret.length < 32) throw new Error('JWT_SECRET must be at least 32 characters');
if (isProd && jwtSecret === DEV_SECRET) throw new Error('JWT_SECRET is still the development placeholder');

// One or more allowed browser origins, comma separated (development: both loopback spellings).
const clientOrigins = str('CLIENT_ORIGIN', 'http://localhost:5173,http://127.0.0.1:5173')
  .split(',')
  .map((o) => o.trim().replace(/\/$/, ''))
  .filter(Boolean);

export const config = {
  isProd,
  port: Number(process.env.PORT ?? 4000),
  mongoUri: str('MONGODB_URI', 'mongodb://127.0.0.1:27017/pyprep'),
  jwtSecret,
  jwtExpiresDays: Number(process.env.JWT_EXPIRES_DAYS ?? 14),
  cookieName: 'pyprep_session',
  cookieSecure: bool('COOKIE_SECURE', clientOrigins[0].startsWith('https://')),
  clientOrigins,
  trustProxy: process.env.TRUST_PROXY && process.env.TRUST_PROXY !== '0' ? Number(process.env.TRUST_PROXY) || 1 : 0,
  admin: {
    email: process.env.ADMIN_EMAIL?.trim().toLowerCase(),
    username: process.env.ADMIN_USERNAME?.trim() || 'admin',
    password: process.env.ADMIN_PASSWORD,
  },
  runner: {
    url: process.env.RUNNER_URL || 'http://127.0.0.1:5001',
    socket: process.env.RUNNER_SOCKET || undefined,
    secret: str('RUNNER_SECRET', isProd ? undefined : 'dev-runner-secret-0123456789'),
    timeoutMs: 20000,
  },
  contentDir: path.resolve(process.env.CONTENT_DIR || path.join(__dirname, '../../content')),
  /** Practice limits */
  maxCodeChars: 20000,
  runsPerMinute: Number(process.env.RUNS_PER_MINUTE ?? 40),
  submitsPerMinute: Number(process.env.SUBMITS_PER_MINUTE ?? 25),
  signupsPerHour: Number(process.env.SIGNUPS_PER_HOUR ?? 10),
  loginsPer15Min: Number(process.env.LOGINS_PER_15_MIN ?? 20),
};
