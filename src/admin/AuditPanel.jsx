import { useMemo, useState } from 'react';
import { RefreshCw, ScrollText, Search } from 'lucide-react';
import { formatDateTime } from '../lib/utils.js';
import { SectionCard } from '../components/ui.jsx';

const ACTION_STYLES = {
  LOGIN: 'bg-neutral-100 text-neutral-700',
  DELETE_LOG: 'bg-red-100 text-red-800',
  UNDO_AWARD: 'bg-amber-100 text-amber-800',
  POINTS_DEDUCTED: 'bg-orange-100 text-orange-800',
  FREEZE_ON: 'bg-violet-100 text-violet-800',
  FREEZE_OFF: 'bg-violet-100 text-violet-800',
  TERM_ARCHIVED: 'bg-blue-100 text-blue-800',
  SECURITY_UPDATED: 'bg-fuchsia-100 text-fuchsia-800',
  PASSWORD_CHANGED: 'bg-fuchsia-100 text-fuchsia-800',
  TEACHER_CREATED: 'bg-emerald-100 text-emerald-800',
  TEACHERS_BULK_IMPORT: 'bg-emerald-100 text-emerald-800',
  TEACHER_UPDATED: 'bg-teal-100 text-teal-800',
};

export default function AuditPanel({ logs, loading, reload }) {
  const [query, setQuery] = useState('');
  const [action, setAction] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const actions = useMemo(() => [...new Set(logs.map((l) => l.action_type))].sort(), [logs]);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return logs.filter(
      (l) => (!action || l.action_type === action) && (!q || `${l.actor} ${l.details} ${l.action_type}`.toLowerCase().includes(q)),
    );
  }, [logs, query, action]);

  return (
    <SectionCard
      title="Security & Edit Audit Log"
      icon={ScrollText}
      description="Append-only record of logins, deletions, undos, freeze changes, account changes and term archives (latest 1,000)."
      actions={
        <button
          type="button"
          className="btn-secondary"
          disabled={refreshing}
          onClick={async () => {
            setRefreshing(true);
            await reload();
            setRefreshing(false);
          }}
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} /> Refresh
        </button>
      }
    >
      <div className="mb-4 grid gap-2 sm:grid-cols-2">
        <label className="relative">
          <span className="sr-only">Search audit log</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
          <input className="input pl-9" placeholder="Search actor or details…" value={query} onChange={(e) => setQuery(e.target.value)} />
        </label>
        <select className="input" value={action} onChange={(e) => setAction(e.target.value)} aria-label="Filter by action">
          <option value="">All actions</option>
          {actions.map((a) => (
            <option key={a}>{a}</option>
          ))}
        </select>
      </div>
      {loading ? (
        <p className="animate-pulse text-sm text-neutral-500">Loading audit log…</p>
      ) : filtered.length === 0 ? (
        <p className="rounded-xl bg-neutral-50 p-6 text-center text-sm text-neutral-500">No audit entries.</p>
      ) : (
        <div className="-mx-4 max-h-[40rem] overflow-auto sm:mx-0">
          <table className="w-full min-w-[44rem] text-sm">
            <thead className="sticky top-0 bg-white">
              <tr className="border-b border-neutral-200 text-left text-xs text-mute">
                <th className="px-3 py-2 font-semibold">Timestamp</th>
                <th className="px-3 py-2 font-semibold">Actor</th>
                <th className="px-3 py-2 font-semibold">Action</th>
                <th className="px-3 py-2 font-semibold">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {filtered.map((l) => (
                <tr key={l.id} className="align-top">
                  <td className="whitespace-nowrap px-3 py-2 text-neutral-600">{formatDateTime(l.created_at)}</td>
                  <td className="whitespace-nowrap px-3 py-2 font-medium text-neutral-800">{l.actor}</td>
                  <td className="px-3 py-2">
                    <span className={`inline-flex rounded-xl px-2 py-0.5 font-mono text-xs font-semibold ${ACTION_STYLES[l.action_type] || 'bg-neutral-100 text-neutral-700'}`}>
                      {l.action_type}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-neutral-700">{l.details}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </SectionCard>
  );
}
