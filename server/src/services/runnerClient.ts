import http from 'node:http';
import { config } from '../config';
import { HttpError } from '../utils/http';

export interface RunnerTestResult {
  index: number;
  passed: boolean;
  actual?: string;
  stdout?: string;
  error?: string;
  skipped?: boolean;
  ms?: number;
}

export interface RunnerResponse {
  status: 'ok' | 'timeout' | 'crashed' | 'output_limit';
  results: RunnerTestResult[];
  message?: string;
}

/**
 * Talks to the separate runner service over TCP (local dev) or a unix socket (Docker, where the
 * runner container has no network at all). Learner code never executes in this process.
 */
export function runCode(payload: {
  language: string;
  code: string;
  entry: string;
  tests: unknown[];
}): Promise<RunnerResponse> {
  const body = JSON.stringify(payload);
  const headers = {
    'content-type': 'application/json',
    'content-length': Buffer.byteLength(body),
    authorization: `Bearer ${config.runner.secret}`,
  };
  const target = config.runner.socket
    ? { socketPath: config.runner.socket, path: '/run' }
    : (() => {
        const u = new URL('/run', config.runner.url);
        return { hostname: u.hostname, port: u.port, path: u.pathname };
      })();

  return new Promise((resolve, reject) => {
    const req = http.request({ method: 'POST', headers, timeout: config.runner.timeoutMs, ...target }, (res) => {
      let data = '';
      res.setEncoding('utf8');
      res.on('data', (c) => {
        data += c;
        if (data.length > 2_000_000) req.destroy(new Error('runner response too large'));
      });
      res.on('end', () => {
        if (res.statusCode === 503) return reject(new HttpError(503, 'The code runner is busy. Please try again in a moment.', 'RUNNER_BUSY'));
        if (res.statusCode !== 200) {
          console.error('runner returned', res.statusCode, data.slice(0, 300));
          return reject(new HttpError(502, 'The code runner rejected the request.', 'RUNNER_ERROR'));
        }
        try {
          resolve(JSON.parse(data));
        } catch {
          reject(new HttpError(502, 'The code runner returned an invalid response.', 'RUNNER_ERROR'));
        }
      });
    });
    req.on('timeout', () => req.destroy(new Error('runner timeout')));
    req.on('error', (e) => {
      console.error('runner unreachable:', e.message);
      reject(new HttpError(503, 'The code runner is not available right now.', 'RUNNER_DOWN'));
    });
    req.end(body);
  });
}

export async function runnerHealthy(): Promise<boolean> {
  return new Promise((resolve) => {
    const target = config.runner.socket
      ? { socketPath: config.runner.socket, path: '/health' }
      : (() => {
          const u = new URL('/health', config.runner.url);
          return { hostname: u.hostname, port: u.port, path: u.pathname };
        })();
    const req = http.request({ method: 'GET', timeout: 2000, ...target }, (res) => {
      res.resume();
      resolve(res.statusCode === 200);
    });
    req.on('error', () => resolve(false));
    req.on('timeout', () => {
      req.destroy();
      resolve(false);
    });
    req.end();
  });
}
