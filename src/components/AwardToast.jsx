import { HouseEmblem } from '../lib/houses.js';

/** Large animated toast announcing a new award (auto-dismissed by the parent). */
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
      <div
        className="flex items-center gap-4 rounded-3xl border-4 bg-white/95 p-3 shadow-2xl backdrop-blur sm:p-4"
        style={{ borderColor: house.primary, boxShadow: `0 20px 60px -10px ${house.primary}88` }}
      >
        <HouseEmblem houseId={house.id} size={tv ? 112 : 64} className="shrink-0 drop-shadow-lg" />
        <div className="min-w-0">
          <p
            className={`font-display leading-none tracking-wide ${tv ? 'text-5xl md:text-6xl' : 'text-2xl sm:text-4xl'}`}
            style={{ color: house.text }}
          >
            {text}
          </p>
          {sub && <p className={`mt-1 truncate text-slate-600 ${tv ? 'text-2xl' : 'text-sm sm:text-base'}`}>{sub}</p>}
        </div>
      </div>
    </div>
  );
}
