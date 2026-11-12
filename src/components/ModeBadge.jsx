import { MODE } from '../lib/storage.js';

/** Small status line: live Supabase connection or offline localStorage mode. */
export default function ModeBadge({ status, dark = false, className = '' }) {
  let dot = 'bg-stone-400';
  let label = 'Connecting…';
  let title = 'Connected to Supabase';
  if (MODE === 'local') {
    dot = 'bg-amber-500';
    label = 'Offline mode (saved in this browser only)';
    title = 'No Supabase credentials configured — data is stored only in this browser.';
  } else if (status === undefined || status === 'live') {
    dot = 'bg-emerald-500';
    label = status === 'live' ? 'Live' : 'Online';
  } else if (status === 'error' || status === 'offline') {
    dot = 'bg-red-500';
    label = 'Reconnecting…';
  }
  return (
    <span title={title} className={`inline-flex items-center gap-1.5 text-xs font-medium ${dark ? 'text-white/70' : 'text-stone-500'} ${className}`}>
      <span className={`inline-block h-2 w-2 rounded-full ${dot}`} aria-hidden="true" />
      {label}
    </span>
  );
}
