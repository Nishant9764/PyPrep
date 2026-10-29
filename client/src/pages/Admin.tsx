import { useState } from 'react';
import { api, ApiError, useApi } from '../api';
import { ErrorBox, Loading, PageHead } from '../components/ui';
import type { AdminUser, User } from '../types';

type Status = User['status'];
const TABS: { key: Status; label: string }[] = [
  { key: 'pending', label: 'Waiting for approval' },
  { key: 'approved', label: 'Approved' },
  { key: 'rejected', label: 'Declined' },
  { key: 'suspended', label: 'Suspended' },
];

export function Admin() {
  const [tab, setTab] = useState<Status>('pending');
  const [q, setQ] = useState('');
  const stats = useApi<{ counts: Record<Status, number> }>('/admin/stats');
  const list = useApi<{ users: AdminUser[] }>(`/admin/users?status=${tab}${q ? `&q=${encodeURIComponent(q)}` : ''}`);
  const [rejecting, setRejecting] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const act = async (u: AdminUser, action: 'approve' | 'reject' | 'suspend' | 'reinstate', why?: string) => {
    setBusy(u.id);
    setError(null);
    try {
      await api(`/admin/users/${u.id}/${action}`, { method: 'POST', body: why ? { reason: why } : {} });
      setRejecting(null);
      setReason('');
      await Promise.all([list.reload(), stats.reload()]);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Action failed.');
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="page">
      <PageHead title="Account approvals">
        <p>New signups cannot log in until you approve them. Suspending someone locks them out immediately, even if they are signed in.</p>
      </PageHead>

      <div className="tabs" role="tablist">
        {TABS.map((t) => (
          <button key={t.key} role="tab" className="tab" aria-selected={tab === t.key} onClick={() => setTab(t.key)}>
            {t.label}{stats.data ? ` (${stats.data.counts[t.key] ?? 0})` : ''}
          </button>
        ))}
      </div>
      <div className="field" style={{ maxWidth: 320 }}>
        <label htmlFor="admin-q">Search by name or email</label>
        <input id="admin-q" className="input" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      {error && <div className="alert error" role="alert">{error}</div>}
      {list.error && <ErrorBox error={list.error} retry={list.reload} />}
      {list.loading && !list.data && <Loading />}
      {list.data && list.data.users.length === 0 && (
        <div className="empty">{tab === 'pending' ? 'No requests are waiting. New signups show up here.' : 'Nobody here.'}</div>
      )}

      {list.data && list.data.users.length > 0 && (
        <section className="panel" style={{ padding: 0, overflowX: 'auto' }}>
          <table className="table">
            <thead>
              <tr><th>Person</th><th>Requested</th><th>Message</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {list.data.users.map((u) => (
                <tr key={u.id}>
                  <td>
                    <strong>{u.username}</strong>
                    {u.role === 'admin' && <span className="chip" style={{ marginLeft: 6 }}>admin</span>}
                    <div className="small muted">{u.email}</div>
                  </td>
                  <td className="small">
                    {new Date(u.createdAt).toLocaleString()}
                    {u.lastLoginAt && <div className="muted">Last login {new Date(u.lastLoginAt).toLocaleDateString()}</div>}
                  </td>
                  <td className="small">
                    {u.signupNote || <span className="muted">None</span>}
                    {u.decisionReason && <div className="muted">Reason given: {u.decisionReason}</div>}
                  </td>
                  <td>
                    {u.role === 'admin' ? (
                      <span className="muted small">Managed in the server settings</span>
                    ) : rejecting === u.id ? (
                      <div className="stack-sm" style={{ minWidth: 220 }}>
                        <label className="small" htmlFor={`why-${u.id}`}>Reason (shown to them)</label>
                        <input id={`why-${u.id}`} className="input" value={reason} onChange={(e) => setReason(e.target.value)} maxLength={500} />
                        <div className="row">
                          <button className="btn danger sm" disabled={busy === u.id} onClick={() => act(u, 'reject', reason || undefined)}>Decline request</button>
                          <button className="btn sm" onClick={() => setRejecting(null)}>Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <div className="row">
                        {(u.status === 'pending' || u.status === 'rejected') && <button className="btn primary sm" disabled={busy === u.id} onClick={() => act(u, 'approve')}>Approve</button>}
                        {u.status === 'pending' && <button className="btn sm" onClick={() => { setRejecting(u.id); setReason(''); }}>Decline</button>}
                        {u.status === 'approved' && <button className="btn danger sm" disabled={busy === u.id} onClick={() => act(u, 'suspend')}>Suspend</button>}
                        {u.status === 'suspended' && <button className="btn sm" disabled={busy === u.id} onClick={() => act(u, 'reinstate')}>Reinstate</button>}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
}
