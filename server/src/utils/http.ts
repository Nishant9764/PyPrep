import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { ZodError } from 'zod';

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
    public code?: string,
  ) {
    super(message);
  }
}

/** Lets route handlers be async without try/catch boilerplate. */
export const wrap =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>): RequestHandler =>
  (req, res, next) => {
    fn(req, res, next).catch(next);
  };

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof HttpError) {
    res.status(err.status).json({ error: err.message, code: err.code });
    return;
  }
  if (err instanceof ZodError) {
    const first = err.issues[0];
    res.status(400).json({
      error: first ? `${first.path.join('.') || 'request'}: ${first.message}` : 'Invalid request',
      code: 'VALIDATION',
      issues: err.issues.slice(0, 5).map((i) => ({ path: i.path.join('.'), message: i.message })),
    });
    return;
  }
  if (err instanceof SyntaxError && 'body' in (err as object)) {
    res.status(400).json({ error: 'Malformed JSON body', code: 'VALIDATION' });
    return;
  }
  console.error(err);
  res.status(500).json({ error: 'Something went wrong on our side.', code: 'INTERNAL' });
}

/** Local calendar date (YYYY-MM-DD) for a learner, from the browser's timezone offset header. */
export function localDate(req: Request, at: Date = new Date()): string {
  const raw = Number(req.header('x-tz-offset'));
  // JS getTimezoneOffset(): minutes BEHIND UTC (India = -330). We receive it as-is.
  const offsetMin = Number.isFinite(raw) && Math.abs(raw) <= 14 * 60 ? raw : 0;
  const shifted = new Date(at.getTime() - offsetMin * 60_000);
  return shifted.toISOString().slice(0, 10);
}
