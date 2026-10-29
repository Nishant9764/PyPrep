import bcrypt from 'bcryptjs';
import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { config } from '../config';
import { User, UserDoc } from '../models';
import { clearSessionCookie, requireAuth, setSessionCookie, signSession } from '../middleware/auth';
import { HttpError, wrap } from '../utils/http';

export const BCRYPT_COST = 12;
// Compared against when the email is unknown so response time does not reveal which emails exist.
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', BCRYPT_COST);

const signupSchema = z.object({
  username: z
    .string()
    .trim()
    .min(3)
    .max(24)
    .regex(/^[A-Za-z0-9_]+$/, 'only letters, numbers and underscores'),
  email: z.string().trim().toLowerCase().email().max(254),
  // bcrypt only uses the first 72 bytes, so longer passwords would silently be truncated.
  password: z.string().min(10, 'at least 10 characters').max(72, 'at most 72 characters'),
  note: z.string().trim().max(500).optional(),
});

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  password: z.string().min(1).max(200),
});

export function publicUser(u: UserDoc) {
  return {
    id: String(u._id),
    username: u.username,
    email: u.email,
    role: u.role,
    status: u.status,
    createdAt: u.createdAt,
  };
}

const signupLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: config.signupsPerHour,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many signup attempts from this address. Try again later.', code: 'RATE_LIMIT' },
});
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: config.loginsPer15Min,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts. Try again in a few minutes.', code: 'RATE_LIMIT' },
});

export const authRouter = Router();

/**
 * Signup creates a PENDING account only. No session is issued and nothing is accessible until an
 * administrator approves it.
 */
authRouter.post(
  '/signup',
  signupLimiter,
  wrap(async (req, res) => {
    const data = signupSchema.parse(req.body);
    const usernameLower = data.username.toLowerCase();

    const byUsername = await User.findOne({ usernameLower });
    if (byUsername) throw new HttpError(409, 'That username is taken.', 'USERNAME_TAKEN');

    const byEmail = await User.findOne({ email: data.email });
    // Same response whether or not the email is already registered: signup must not be an oracle
    // for "who has an account". (The existing account's owner is not notified or changed.)
    if (!byEmail) {
      try {
        await User.create({
          username: data.username,
          usernameLower,
          email: data.email,
          passwordHash: await bcrypt.hash(data.password, BCRYPT_COST),
          signupNote: data.note,
          status: 'pending',
          role: 'user',
          history: [{ action: 'requested', at: new Date() }],
        });
      } catch (e: any) {
        if (e?.code === 11000) throw new HttpError(409, 'That username or email is already in use.', 'DUPLICATE');
        throw e;
      }
    }
    res.status(202).json({
      message: 'Your access request has been submitted. An administrator will review it. You can log in once it is approved.',
    });
  }),
);

authRouter.post(
  '/login',
  loginLimiter,
  wrap(async (req, res) => {
    const { email, password } = loginSchema.parse(req.body);
    const user = await User.findOne({ email });
    const ok = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);
    if (!user || !ok) throw new HttpError(401, 'Incorrect email or password.', 'BAD_CREDENTIALS');

    // Status is only revealed AFTER the password is proven correct.
    if (user.status === 'pending') {
      throw new HttpError(403, 'Your access request is still waiting for administrator approval.', 'PENDING');
    }
    if (user.status === 'rejected') {
      throw new HttpError(
        403,
        user.decisionReason ? `Your access request was declined: ${user.decisionReason}` : 'Your access request was declined.',
        'REJECTED',
      );
    }
    if (user.status === 'suspended') {
      throw new HttpError(403, 'Your account has been suspended. Contact an administrator.', 'SUSPENDED');
    }

    user.lastLoginAt = new Date();
    await user.save();
    setSessionCookie(res, signSession(String(user._id)));
    res.json({ user: publicUser(user) });
  }),
);

authRouter.post('/logout', (_req, res) => {
  clearSessionCookie(res);
  res.json({ ok: true });
});

authRouter.get(
  '/me',
  requireAuth,
  wrap(async (req, res) => {
    res.json({ user: publicUser(req.user!) });
  }),
);
