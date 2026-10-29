import { FormEvent, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { api, ApiError } from '../api';
import { useAuth } from '../auth';
import { BrandMark } from '../components/ui';

function Side() {
  return (
    <div className="auth-side">
      <div className="brand">
        <BrandMark />
        PyPrep
      </div>
      <h1>Learn Python properly, then prove it.</h1>
      <ul>
        <li>Lessons that explain what Python is doing, not just which syntax to type.</li>
        <li>Practice problems with hidden tests, so a solution that only works for the examples gets caught.</li>
        <li>When a test fails, PyPrep works out which underlying skill is shaky and gives you targeted practice on that.</li>
      </ul>
      <pre className="snippet" aria-hidden="true">
        {`word = "workbook"
word[::-1]   # 'koobkrow'
word[1:5:-1] # ''  ... why?`}
      </pre>
    </div>
  );
}

export function Login() {
  const { user, login } = useAuth();
  const nav = useNavigate();
  const loc = useLocation() as { state?: { from?: string } };
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<ApiError | null>(null);
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to={loc.state?.from ?? '/'} replace />;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await login(email, password);
      nav(loc.state?.from ?? '/', { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err : new ApiError(0, 'Something went wrong.'));
    } finally {
      setBusy(false);
    }
  };

  const waiting = error?.code === 'PENDING';
  return (
    <div className="auth-wrap">
      <Side />
      <div className="auth-form">
        <form className="auth-card" onSubmit={submit} noValidate>
          <h2>Log in</h2>
          {error && (
            <div className={`alert ${waiting ? 'info' : 'error'}`} role="alert">
              <strong>{waiting ? 'Waiting for approval' : error.code === 'REJECTED' || error.code === 'SUSPENDED' ? 'No access' : 'Could not log in'}</strong>
              {error.message}
            </div>
          )}
          <div className="field">
            <label htmlFor="email">Email</label>
            <input id="email" className="input" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="password">Password</label>
            <input id="password" className="input" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <button className="btn primary" disabled={busy || !email || !password}>
            {busy ? 'Logging in…' : 'Log in'}
          </button>
          <p className="small muted">
            New here? <Link to="/signup">Request access</Link>. An administrator approves every account.
          </p>
        </form>
      </div>
    </div>
  );
}

export function Signup() {
  const { user } = useAuth();
  const [form, setForm] = useState({ username: '', email: '', password: '', note: '' });
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  if (user) return <Navigate to="/" replace />;

  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api('/auth/signup', { method: 'POST', body: { ...form, note: form.note || undefined } });
      setDone(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-wrap">
      <Side />
      <div className="auth-form">
        {done ? (
          <div className="auth-card">
            <h2>Request submitted</h2>
            <div className="alert ok" role="status">
              <strong>An administrator will review it</strong>
              You cannot log in until your request is approved. Come back and log in with {form.email} once it has been.
            </div>
            <Link className="btn" to="/login">
              Go to log in
            </Link>
          </div>
        ) : (
          <form className="auth-card" onSubmit={submit}>
            <h2>Request access</h2>
            {error && (
              <div className="alert error" role="alert">
                <strong>Check the form</strong>
                {error}
              </div>
            )}
            <div className="field">
              <label htmlFor="username">Username</label>
              <input id="username" className="input" required minLength={3} maxLength={24} pattern="[A-Za-z0-9_]+" autoComplete="username" value={form.username} onChange={set('username')} />
              <span className="hint">3 to 24 letters, numbers or underscores.</span>
            </div>
            <div className="field">
              <label htmlFor="s-email">Email</label>
              <input id="s-email" className="input" type="email" required autoComplete="email" value={form.email} onChange={set('email')} />
            </div>
            <div className="field">
              <label htmlFor="s-password">Password</label>
              <input id="s-password" className="input" type="password" required minLength={10} maxLength={72} autoComplete="new-password" value={form.password} onChange={set('password')} />
              <span className="hint">At least 10 characters.</span>
            </div>
            <div className="field">
              <label htmlFor="note">Message to the administrator (optional)</label>
              <textarea id="note" className="input" maxLength={500} value={form.note} onChange={set('note')} />
            </div>
            <button className="btn primary" disabled={busy}>
              {busy ? 'Sending…' : 'Send request'}
            </button>
            <p className="small muted">
              Already approved? <Link to="/login">Log in</Link>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
