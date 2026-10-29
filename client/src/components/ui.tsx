import type { ReactNode } from 'react';
import type { ApiError } from '../api';
import type { Difficulty, QStatus } from '../types';

export function DifficultyChip({ d }: { d: Difficulty }) {
  return <span className={`chip ${d}`}>{d}</span>;
}

export function StatusChip({ s }: { s: QStatus }) {
  if (s === 'unsolved') return null;
  return <span className={`chip ${s}`}>{s === 'solved' ? 'Solved' : 'In progress'}</span>;
}

export function ProgressBar({ value, max, label, tone }: { value: number; max: number; label: string; tone?: 'mark' }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div
      className={`bar ${tone === 'mark' ? 'mark-bar' : ''}`}
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={value}
    >
      <span style={{ width: `${pct}%` }} />
    </div>
  );
}

export function Loading({ lines = 3 }: { lines?: number }) {
  return (
    <div className="stack-sm" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading</span>
      {Array.from({ length: lines }, (_, i) => (
        <div key={i} className="skeleton" style={{ width: `${90 - i * 12}%` }} />
      ))}
    </div>
  );
}

export function ErrorBox({ error, retry }: { error: ApiError | Error | string; retry?: () => void }) {
  const msg = typeof error === 'string' ? error : error.message;
  return (
    <div className="alert error" role="alert">
      <strong>Could not load this</strong>
      {msg}
      {retry && (
        <div style={{ marginTop: '0.6rem' }}>
          <button className="btn sm" onClick={retry}>
            Try again
          </button>
        </div>
      )}
    </div>
  );
}

export function PageHead({ title, children }: { title: ReactNode; children?: ReactNode }) {
  return (
    <header className="page-head">
      <h1>{title}</h1>
      {children}
    </header>
  );
}

export function BrandMark() {
  return (
    <svg className="brand-mark" viewBox="0 0 32 32" aria-hidden="true">
      <rect width="32" height="32" rx="8" fill="var(--accent)" />
      <path d="M10 23V9h7.5a4.5 4.5 0 010 9H10" fill="none" stroke="#ffd84d" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
