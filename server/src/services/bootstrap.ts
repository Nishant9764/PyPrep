import bcrypt from 'bcryptjs';
import { config } from '../config';
import { User } from '../models';
import { BCRYPT_COST } from '../routes/auth';

/**
 * Makes sure the configured administrator exists, so the approval workflow always has someone
 * who can approve. Runs at every start; it never overwrites an existing admin's password.
 */
export async function ensureAdmin(): Promise<void> {
  const { email, username, password } = config.admin;
  if (!email || !password) {
    const admins = await User.countDocuments({ role: 'admin' });
    if (!admins) {
      console.warn('WARNING: no administrator exists and ADMIN_EMAIL / ADMIN_PASSWORD are not set. Nobody can approve signups.');
    }
    return;
  }
  if (password.length < 10) throw new Error('ADMIN_PASSWORD must be at least 10 characters');
  const existing = await User.findOne({ email });
  if (existing) {
    if (existing.role !== 'admin' || existing.status !== 'approved') {
      existing.role = 'admin';
      existing.status = 'approved';
      await existing.save();
      console.log(`Promoted ${email} to administrator`);
    }
    return;
  }
  await User.create({
    username,
    usernameLower: username.toLowerCase(),
    email,
    passwordHash: await bcrypt.hash(password, BCRYPT_COST),
    role: 'admin',
    status: 'approved',
    history: [{ action: 'bootstrap', at: new Date() }],
  });
  console.log(`Created administrator ${email}`);
}
