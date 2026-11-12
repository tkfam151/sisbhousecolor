import { useMemo, useState } from 'react';
import { Download, ListOrdered, Search, Trash2 } from 'lucide-react';
import { HOUSES, HouseEmblem, getHouse } from '../lib/houses.js';
import { CATEGORIES, storage } from '../lib/storage.js';
import { buildLogsCsv, downloadTextFile, formatDateTime, formatPoints, localDateStamp, signed } from '../lib/utils.js';
import { Alert, SectionCard } from '../components/ui.jsx';
import { ConfirmModal } from '../components/Modal.jsx';

const PAGE = 50;

export default function LogsPanel({ auth, logs, onAuthError }) {
  const [houseFilter, setHouseFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [query, setQuery] = useState('');
  const [limit, setLimit] = useState(PAGE);
  const [toDelete, setToDelete] = useState(null);
  const [busy, setBusy] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [message, setMessage] = useState(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return logs.filter(
      (log) =>
        (!houseFilter || log.house_id === houseFilter) &&
        (!categoryFilter || log.category === categoryFilter) &&
        (!q || `${log.reason || ''} ${log.awarded_by} ${log.house_name}`.toLowerCase().includes(q)),
    );
  }, [logs, houseFilter, categoryFilter, query]);

  const exportCsv = async () => {
    setExporting(true);
    setMessage(null);
    try {
      const all = await storage.getPointLogs();
      downloadTextFile(`sisb-house-points-${localDateStamp()}.csv`, buildLogsCsv(all));
      setMessage({ tone: 'success', text: `Exported ${formatPoints(all.length)} log entries.` });
    } catch (err) {
      setMessage({ tone: 'error', text: err.message });
    } finally {
      setExporting(false);
    }
  };

  const confirmDelete = async () => {
    setBusy(true);
    try {
      await storage.adminDeleteLog(auth, toDelete.id);
      setMessage({ tone: 'success', text: `Deleted ${signed(toDelete.points)} pts for ${toDelete.house_name}. House total adjusted.` });
      setToDelete(null);
    } catch (err) {
      if (!onAuthError(err)) setMessage({ tone: 'error', text: err.message });
      setToDelete(null);
    } finally {
      setBusy(false);
    }
  };

  return (
    <SectionCard
      title="Point Logs (current term)"
      icon={ListOrdered}
      description="Delete erroneous entries — the house total is reversed automatically and the deletion is audited."
      actions={
        <button type="button" className="btn-primary" onClick={exportCsv} disabled={exporting}>
          <Download className="h-4 w-4" /> {exporting ? 'Exporting…' : 'Export Logs to CSV'}
        </button>
      }
    >
      <div className="mb-4 grid gap-2 sm:grid-cols-3">
        <label className="relative">
          <span className="sr-only">Search</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
          <input className="input pl-9" placeholder="Search reason or teacher…" value={query} onChange={(e) => setQuery(e.target.value)} />
        </label>
        <select className="input" value={houseFilter} onChange={(e) => setHouseFilter(e.target.value)} aria-label="Filter by house">
          <option value="">All houses</option>
          {HOUSES.map((h) => (
            <option key={h.id} value={h.id}>
              {h.name}
            </option>
          ))}
        </select>
        <select className="input" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} aria-label="Filter by category">
          <option value="">All categories</option>
          {CATEGORIES.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
      </div>

      {message && (
        <Alert tone={message.tone} className="mb-4">
          {message.text}
        </Alert>
      )}

      {filtered.length === 0 ? (
        <p className="rounded-xl bg-neutral-50 p-6 text-center text-sm text-neutral-500">No log entries match.</p>
      ) : (
        <>
          <div className="-mx-4 overflow-x-auto sm:mx-0">
            <table className="w-full min-w-[44rem] text-sm">
              <thead>
                <tr className="border-b border-neutral-200 text-left text-xs text-mute">
                  <th className="px-3 py-2 font-semibold">Date/Time</th>
                  <th className="px-3 py-2 font-semibold">House</th>
                  <th className="px-3 py-2 text-right font-semibold">Points</th>
                  <th className="px-3 py-2 font-semibold">Category</th>
                  <th className="px-3 py-2 font-semibold">Reason</th>
                  <th className="px-3 py-2 font-semibold">Awarded By</th>
                  <th className="px-3 py-2">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {filtered.slice(0, limit).map((log) => {
                  const h = getHouse(log.house_id);
                  return (
                    <tr key={log.id} className="hover:bg-neutral-50">
                      <td className="whitespace-nowrap px-3 py-2 text-neutral-600">{formatDateTime(log.created_at)}</td>
                      <td className="px-3 py-2">
                        <span className="flex items-center gap-2 font-semibold" style={{ color: h.text }}>
                          <HouseEmblem houseId={h.id} size={22} /> {log.house_name}
                        </span>
                      </td>
                      <td className={`px-3 py-2 text-right font-bold tabular-nums ${log.points < 0 ? 'text-red-700' : 'text-neutral-900'}`}>
                        {signed(log.points)}
                      </td>
                      <td className="px-3 py-2 text-neutral-600">{log.category}</td>
                      <td className="max-w-[16rem] truncate px-3 py-2 text-neutral-700" title={log.reason || ''}>
                        {log.reason || <span className="text-neutral-400">—</span>}
                      </td>
                      <td className="px-3 py-2 text-neutral-700">{log.awarded_by}</td>
                      <td className="px-3 py-2 text-right">
                        <button
                          type="button"
                          className="btn-ghost px-2 py-1.5 text-red-600 hover:bg-red-50 hover:text-red-700"
                          onClick={() => setToDelete(log)}
                          aria-label={`Delete ${signed(log.points)} points for ${log.house_name}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="mt-3 flex items-center justify-between text-sm text-neutral-500">
            <span>
              Showing {formatPoints(Math.min(limit, filtered.length))} of {formatPoints(filtered.length)}
            </span>
            {filtered.length > limit && (
              <button type="button" className="btn-secondary" onClick={() => setLimit((n) => n + PAGE)}>
                Show more
              </button>
            )}
          </div>
        </>
      )}

      <ConfirmModal
        open={Boolean(toDelete)}
        tone="danger"
        title="Delete this log entry?"
        confirmLabel="Delete entry"
        busy={busy}
        onCancel={() => setToDelete(null)}
        onConfirm={confirmDelete}
      >
        {toDelete && (
          <p>
            This removes <strong>{signed(toDelete.points)} pts</strong> for <strong>{toDelete.house_name}</strong> ({toDelete.category}
            {toDelete.reason ? ` — ${toDelete.reason}` : ''}) awarded by {toDelete.awarded_by}, and adjusts the house total. This
            action is recorded in the audit log.
          </p>
        )}
      </ConfirmModal>
    </SectionCard>
  );
}
