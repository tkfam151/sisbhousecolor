import { formatDateTime } from '../lib/utils.js';

export default function FreezeBanner({ frozenAt, tv = false }) {
  return (
    <div role="status" className={`rounded-card bg-white text-center shadow-card ring-2 ring-[#FF9500]/60 ${tv ? 'px-6 py-5' : 'px-5 py-4'}`}>
      <p className={`font-display font-semibold tracking-tight text-ink ${tv ? 'text-3xl md:text-5xl' : 'text-xl sm:text-2xl'}`}>
        MYSTERY MODE: Scores Frozen for Final Reveal!
      </p>
      {frozenAt && (
        <p className={`mt-1 text-mute ${tv ? 'text-lg' : 'text-sm'}`}>
          Showing scores from {formatDateTime(frozenAt)}. Points are still being counted.
        </p>
      )}
    </div>
  );
}
