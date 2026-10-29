import { NavLink, Outlet, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../auth';
import { api, useApi } from '../api';
import { applyTheme, getTheme, ThemeChoice } from '../theme';
import type { TrackSummary } from '../types';
import { BrandMark } from './ui';
import { useState } from 'react';

export const DEFAULT_TRACK = 'python';

export function Shell() {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const { track = DEFAULT_TRACK } = useParams();
  const tracks = useApi<{ tracks: TrackSummary[] }>('/tracks');
  const [theme, setTheme] = useState<ThemeChoice>(getTheme());
  const base = `/t/${track}`;

  const cycleTheme = () => {
    const next: ThemeChoice = theme === 'system' ? 'light' : theme === 'light' ? 'dark' : 'system';
    applyTheme(next);
    setTheme(next);
  };

  return (
    <div className="shell">
      <aside className="rail">
        <NavLink to={base} className="brand" aria-label="PyPrep home">
          <BrandMark />
          PyPrep
        </NavLink>

        {tracks.data && tracks.data.tracks.length > 1 && (
          <div className="field">
            <label htmlFor="track-pick" className="sr-only">
              Track
            </label>
            <select id="track-pick" className="input" value={track} onChange={(e) => nav(`/t/${e.target.value}`)}>
              {tracks.data.tracks.map((t) => (
                <option key={t.slug} value={t.slug}>
                  {t.title}
                </option>
              ))}
            </select>
          </div>
        )}

        <nav className="rail-nav" aria-label="Main">
          <NavLink to={base} end>
            Dashboard
          </NavLink>
          <NavLink to={`${base}/learn`}>Learn</NavLink>
          <NavLink to={`${base}/practice`}>Practice</NavLink>
          <NavLink to={`${base}/interview-glance`}>Interview Glance</NavLink>
          <NavLink to={`${base}/interview-guide`}>Interview Guide</NavLink>
          <NavLink to={`${base}/mock-interview`}>Mock Interview</NavLink>
          <NavLink to={`${base}/saved`}>Saved</NavLink>
          {user?.role === 'admin' && <NavLink to="/admin">Approvals</NavLink>}
        </nav>

        <div className="rail-foot">
          <div className="who">
            <strong>{user?.username}</strong>
            <small>{user?.role === 'admin' ? 'Administrator' : 'Learner'}</small>
          </div>
          <div className="row">
            <button className="btn sm" onClick={cycleTheme} aria-label={`Colour theme: ${theme}. Click to change.`}>
              Theme: {theme}
            </button>
            <button
              className="btn sm ghost"
              onClick={async () => {
                await logout();
                nav('/login');
              }}
            >
              Log out
            </button>
            <button className="btn sm ghost" title="Revoke all active sessions for this account" onClick={async () => { if (!window.confirm('Sign out this account on every device?')) return; await api('/auth/logout-all', { method: 'POST', body: {} }); nav('/login'); }}>
              Sign out all devices
            </button>
          </div>
        </div>
      </aside>
      <main className="main">
        <Outlet />
      </main>
    </div>
  );
}
