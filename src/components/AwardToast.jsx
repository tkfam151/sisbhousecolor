import { HouseEmblem } from '../lib/houses.js';

/** Notification-style announcement for a new award (auto-dismissed by the parent). */
export default function AwardToast({ toast, tv = false }) {
  if (!toast) return null;
  const { house, text, sub } = toast;
  return (
    <div
      key={toast.id}
      role="status"
      aria-live="polite"
      className={`pointer-events-none fixed left-1/2 z-[60] w-[min(92vw,52rem)] animate-toast-in ${tv ? 'top-8' : 'top-20'}`}
    >
      <div className={`glass flex items-center gap-4 rounded-[26px] shadow-float ring-1 ring-black/5 ${tv ? 'p-5' : 'p-3.5'}`}>
        <HouseEmblem houseId={house.id} size={tv ? 112 : 56} className="shrink-0" />
        <div className="min-w-0">
          <p className={`font-display font-semibold leading-tight tracking-tight text-ink ${tv ? 'text-4xl md:text-5xl' : 'text-lg sm:text-xl'}`}>{text}</p>
          {sub && <p className={`mt-0.5 truncate text-mute ${tv ? 'text-2xl' : 'text-sm sm:text-[15px]'}`}>{sub}</p>}
        </div>
        <span className={`ml-auto mr-1 shrink-0 rounded-full ${tv ? 'h-4 w-4' : 'h-2.5 w-2.5'}`} style={{ background: house.primary }} aria-hidden="true" />
      </div>
    </div>
  );
}
