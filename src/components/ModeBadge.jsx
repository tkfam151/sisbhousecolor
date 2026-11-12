import { Database, HardDrive } from 'lucide-react';
import { MODE } from '../lib/storage.js';

/** Small badge showing whether we're on Supabase Realtime or the localStorage fallback. */
export default function ModeBadge({ status, dark = false, className = '' }) {
  let dot = 'bg-slate-400';
  let label = 'Connecting to Supabase…';
  let Icon = Database;
  let title = 'Connected to Supabase';
  if (MODE === 'local') {
    dot = 'bg-amber-500';
    label = 'Offline mode · localStorage';
    Icon = HardDrive;
    title = 'No Supabase credentials configured — data is stored only in this browser.';
  } else if (status === undefined) {
    dot = 'bg-emerald-500';
    label = 'Online · Supabase';
  } else if (status === 'live') {
    dot = 'bg-emerald-500';
    label = 'Live · Supabase Realtime';
  } else if (status === 'error' || status === 'offline') {
    dot = 'bg-red-500';
    label = 'Supabase · reconnecting';
  }
  return (
    <span
      title={title}
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
        dark ? 'bg-white/10 text-white/80 ring-1 ring-white/15' : 'bg-white text-slate-600 ring-1 ring-slate-200'
      } ${className}`}
    >
      <span className="relative flex h-2 w-2">
        {MODE === 'supabase' && status === 'live' && (
          <span className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-60 ${dot}`} />
        )}
        <span className={`relative inline-flex h-2 w-2 rounded-full ${dot}`} />
      </span>
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      {label}
    </span>
  );
}
