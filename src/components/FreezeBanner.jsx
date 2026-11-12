import { formatDateTime } from '../lib/utils.js';

export default function FreezeBanner({ frozenAt, tv = false }) {
  return (
    <div role="status" className={`rounded-md border-l-8 border-amber-400 bg-stone-900 text-white ${tv ? 'px-6 py-4' : 'px-4 py-3 sm:px-5'}`}>
      <p className={`font-display font-bold uppercase tracking-wide ${tv ? 'text-4xl md:text-5xl' : 'text-xl sm:text-2xl'}`}>
        MYSTERY MODE: Scores Frozen for Final Reveal!
      </p>
      {frozenAt && (
        <p className={`mt-0.5 text-white/70 ${tv ? 'text-lg' : 'text-sm'}`}>
          Scores shown as of {formatDateTime(frozenAt)}. Points are still being counted.
        </p>
      )}
    </div>
  );
}
