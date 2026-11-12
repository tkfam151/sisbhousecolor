import { HouseEmblem } from '../lib/houses.js';

/** Announcement shown when a new award arrives (auto-dismissed by the parent). */
export default function AwardToast({ toast, tv = false }) {
  if (!toast) return null;
  const { house, text, sub } = toast;
  return (
    <div
      key={toast.id}
      role="status"
      aria-live="polite"
      className={`pointer-events-none fixed left-1/2 z-[60] w-[min(92vw,56rem)] animate-toast-in ${tv ? 'top-8' : 'top-4'}`}
    >
      <div className="flex items-center gap-4 overflow-hidden rounded-md bg-white shadow-xl" style={{ borderLeft: `12px solid ${house.primary}` }}>
        <HouseEmblem houseId={house.id} size={tv ? 120 : 64} className="my-3 shrink-0" />
        <div className="min-w-0 py-3 pr-4">
          <p className={`font-display font-bold uppercase leading-tight ${tv ? 'text-5xl md:text-6xl' : 'text-2xl sm:text-3xl'}`} style={{ color: house.text }}>
            {text}
          </p>
          {sub && <p className={`mt-1 truncate text-stone-600 ${tv ? 'text-2xl' : 'text-sm sm:text-base'}`}>{sub}</p>}
        </div>
      </div>
    </div>
  );
}
