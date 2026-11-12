import { useEffect, useState } from 'react';
import { Activity } from 'lucide-react';
import { HouseEmblem, getHouse } from '../lib/houses.js';
import { signed, timeAgo, formatDateTime } from '../lib/utils.js';

export function useNow(intervalMs = 15_000) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

export default function ActivityFeed({ logs, limit = 12 }) {
  const now = useNow();
  const items = logs.slice(0, limit);
  return (
    <section className="card p-4 sm:p-5" aria-labelledby="feed-title">
      <h2 id="feed-title" className="mb-3 flex items-center gap-2 text-lg font-bold text-slate-900">
        <Activity className="h-5 w-5 text-slate-500" aria-hidden="true" /> Latest Points
      </h2>
      {items.length === 0 ? (
        <p className="rounded-xl bg-slate-50 p-4 text-center text-sm text-slate-500">No points awarded yet this term.</p>
      ) : (
        <ul className="divide-y divide-slate-100">
          {items.map((log) => {
            const house = getHouse(log.house_id);
            return (
              <li key={log.id} className="flex items-start gap-3 py-2.5">
                <HouseEmblem houseId={house.id} size={36} className="mt-0.5 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm leading-snug text-slate-800">
                    <span className={`font-bold tabular-nums ${log.points < 0 ? 'text-red-700' : 'text-slate-900'}`}>{signed(log.points)}</span>{' '}
                    <span className="font-semibold" style={{ color: house.text }}>
                      {log.house_name || house.name}
                    </span>
                    {log.reason ? <span className="text-slate-600"> — {log.reason}</span> : null}
                  </p>
                  <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-slate-500">
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 font-medium text-slate-600">{log.category}</span>
                    <span>by {log.awarded_by}</span>
                    <time dateTime={log.created_at} title={formatDateTime(log.created_at)}>
                      {timeAgo(log.created_at, now)}
                    </time>
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
