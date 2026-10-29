import { Router } from 'express';
import { isValidObjectId } from 'mongoose';
import { z } from 'zod';
import { User, USER_STATUSES } from '../models';
import { requireAdmin, requireAuth } from '../middleware/auth';
import { HttpError, wrap } from '../utils/http';

export const adminRouter = Router();
adminRouter.use(requireAuth, requireAdmin);

function present(u: any) {
  return {
    id: String(u._id),
    username: u.username,
    email: u.email,
    role: u.role,
    status: u.status,
    signupNote: u.signupNote,
    decisionReason: u.decisionReason,
    decidedAt: u.decidedAt,
    createdAt: u.createdAt,
    lastLoginAt: u.lastLoginAt,
    history: u.history,
  };
}

adminRouter.get(
  '/stats',
  wrap(async (_req, res) => {
    const rows = await User.aggregate([{ $group: { _id: '$status', n: { $sum: 1 } } }]);
    const counts: Record<string, number> = Object.fromEntries(USER_STATUSES.map((s) => [s, 0]));
    for (const r of rows) counts[r._id] = r.n;
    res.json({ counts });
  }),
);

const listSchema = z.object({
  status: z.enum(USER_STATUSES).optional(),
  q: z.string().trim().max(60).optional(),
});

adminRouter.get(
  '/users',
  wrap(async (req, res) => {
    const { status, q } = listSchema.parse(req.query);
    const filter: Record<string, unknown> = {};
    if (status) filter.status = status;
    if (q) {
      const rx = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      filter.$or = [{ username: rx }, { email: rx }];
    }
    const users = await User.find(filter).sort({ createdAt: -1 }).limit(200).lean();
    res.json({ users: users.map(present) });
  }),
);

const decisionSchema = z.object({ reason: z.string().trim().max(500).optional() });

type Action = 'approve' | 'reject' | 'suspend' | 'reinstate';
const TRANSITIONS: Record<Action, { from: string[]; to: 'approved' | 'rejected' | 'suspended' }> = {
  approve: { from: ['pending', 'rejected'], to: 'approved' },
  reject: { from: ['pending'], to: 'rejected' },
  suspend: { from: ['approved'], to: 'suspended' },
  reinstate: { from: ['suspended'], to: 'approved' },
};

for (const action of Object.keys(TRANSITIONS) as Action[]) {
  adminRouter.post(
    `/users/:id/${action}`,
    wrap(async (req, res) => {
      const id = req.params.id;
      if (!isValidObjectId(id)) throw new HttpError(400, 'Invalid user id.');
      const { reason } = decisionSchema.parse(req.body ?? {});
      const target = await User.findById(id);
      if (!target) throw new HttpError(404, 'User not found.');
      if (String(target._id) === String(req.user!._id)) throw new HttpError(400, 'You cannot change your own account status.');
      if (target.role === 'admin') throw new HttpError(400, 'Administrator accounts cannot be changed here.');
      const t = TRANSITIONS[action];
      if (!t.from.includes(target.status)) {
        throw new HttpError(409, `Cannot ${action} a user whose status is "${target.status}".`, 'BAD_TRANSITION');
      }
      target.status = t.to;
      target.decidedAt = new Date();
      target.decidedBy = req.user!._id;
      target.decisionReason = action === 'approve' || action === 'reinstate' ? undefined : reason;
      target.history.push({ action, by: req.user!._id, at: new Date(), reason });
      await target.save();
      res.json({ user: present(target.toObject()) });
    }),
  );
}
