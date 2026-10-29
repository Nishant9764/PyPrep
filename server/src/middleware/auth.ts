import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { User, UserDoc } from '../models';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: UserDoc;
    }
  }
}

export function signSession(userId: string): string {
  return jwt.sign({ sub: userId }, config.jwtSecret, {
    expiresIn: `${config.jwtExpiresDays}d`,
    algorithm: 'HS256',
  });
}

export function setSessionCookie(res: Response, token: string): void {
  res.cookie(config.cookieName, token, {
    httpOnly: true,
    secure: config.cookieSecure,
    sameSite: 'lax',
    maxAge: config.jwtExpiresDays * 24 * 60 * 60 * 1000,
    path: '/',
  });
}

export function clearSessionCookie(res: Response): void {
  res.clearCookie(config.cookieName, { httpOnly: true, secure: config.cookieSecure, sameSite: 'lax', path: '/' });
}

/**
 * Authentication on EVERY request re-reads the user from the database, so an admin suspending
 * someone takes effect immediately instead of when their cookie expires.
 */
export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const token = req.cookies?.[config.cookieName];
    if (!token) {
      res.status(401).json({ error: 'Please log in.', code: 'UNAUTHENTICATED' });
      return;
    }
    let payload: jwt.JwtPayload;
    try {
      payload = jwt.verify(token, config.jwtSecret, { algorithms: ['HS256'] }) as jwt.JwtPayload;
    } catch {
      clearSessionCookie(res);
      res.status(401).json({ error: 'Your session has expired. Please log in again.', code: 'UNAUTHENTICATED' });
      return;
    }
    const user = await User.findById(payload.sub);
    if (!user) {
      clearSessionCookie(res);
      res.status(401).json({ error: 'Account not found.', code: 'UNAUTHENTICATED' });
      return;
    }
    if (user.status !== 'approved') {
      clearSessionCookie(res);
      res.status(403).json({ error: 'Your account does not currently have access.', code: user.status.toUpperCase() });
      return;
    }
    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
}

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  if (req.user?.role !== 'admin') {
    res.status(403).json({ error: 'Administrator access required.', code: 'FORBIDDEN' });
    return;
  }
  next();
}

/**
 * CSRF defence in depth on top of SameSite=Lax cookies: state-changing requests must come from
 * the configured client origin (when the browser sends an Origin header).
 */
export function originCheck(req: Request, res: Response, next: NextFunction): void {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  const origin = req.header('origin');
  if (origin && !config.clientOrigins.includes(origin)) {
    res.status(403).json({ error: 'Cross-origin request blocked.', code: 'BAD_ORIGIN' });
    return;
  }
  next();
}
