import { useEffect } from 'react';
import { Trophy, X } from 'lucide-react';
import { HouseEmblem, getHouse } from '../lib/houses.js';
import { formatDate, formatPoints, ordinal } from '../lib/utils.js';

export function ArchiveCard({ archive }) {
  const champion = getHouse(archive.winner_house_id);
  const standings = Array.isArray(archive.standings) ? archive.standings : [];
  const max = Math.max(1, ...standings.map((s) => Number(s.points) || 0));
  return (
    <article className="overflow-hidden rounded-md border border-stone-300 bg-white">
      <header className="flex items-center gap-3 border-b border-stone-200 p-4" style={{ borderTop: `6px solid ${champion.primary}` }}>
        <HouseEmblem houseId={champion.id} size={52} className="shrink-0" />
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-base font-bold text-stone-900">{archive.term_name}</h3>
          <p className="text-xs text-stone-500">Archived {formatDate(archive.archived_at)}</p>
        </div>
        <span
          className="inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold text-white shadow"
          style={{ background: champion.primary }}
        >
          <Trophy className="h-3.5 w-3.5" aria-hidden="true" /> {archive.winner_house_name}
        </span>
      </header>
      <ol className="space-y-1.5 px-4 pb-4 pt-2">
        {standings.map((s) => {
          const house = getHouse(s.house_id);
          return (
            <li key={s.house_id} className="flex items-center gap-2 text-sm">
              <span className="w-8 shrink-0 font-semibold tabular-nums text-stone-500">{ordinal(s.rank)}</span>
              <span className="w-28 shrink-0 truncate font-medium text-stone-800">{s.house_name}</span>
              <span className="h-2 flex-1 overflow-hidden rounded-full bg-stone-100" aria-hidden="true">
                <span
                  className="block h-full rounded-full"
                  style={{ width: `${Math.max(0, (Number(s.points) / max) * 100)}%`, background: house.primary }}
                />
              </span>
              <span className="w-16 shrink-0 text-right font-bold tabular-nums text-stone-900">{formatPoints(s.points)}</span>
            </li>
          );
        })}
      </ol>
    </article>
  );
}

export default function ArchivesDrawer({ open, onClose, archives }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-labelledby="archives-title">
      <div className="absolute inset-0 animate-fade-in bg-stone-900/50 backdrop-blur-sm" onClick={onClose} />
      <aside className="absolute inset-y-0 right-0 flex w-full max-w-md animate-slide-in-right flex-col bg-stone-50 shadow-2xl">
        <div className="flex items-center justify-between border-b border-stone-200 bg-white px-5 py-4">
          <h2 id="archives-title" className="section-title">
            Past terms
          </h2>
          <button type="button" className="btn-ghost p-2" onClick={onClose} aria-label="Close past terms" autoFocus>
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 space-y-4 overflow-y-auto p-4">
          {archives.length === 0 ? (
            <p className="rounded-md bg-white p-6 text-center text-sm text-stone-500 ring-1 ring-stone-200">
              No archived terms yet. When a term or event ends, the Super Admin archives it here.
            </p>
          ) : (
            archives.map((archive) => <ArchiveCard key={archive.id} archive={archive} />)
          )}
        </div>
      </aside>
    </div>
  );
}
