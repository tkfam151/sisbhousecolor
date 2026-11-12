import { Snowflake } from 'lucide-react';
import { formatDateTime } from '../lib/utils.js';

export default function FreezeBanner({ frozenAt, tv = false }) {
  return (
    <div
      role="status"
      className={`frozen-stripes animate-stripes relative overflow-hidden bg-gradient-to-r from-indigo-700 via-violet-700 to-fuchsia-700 text-white shadow-lg ${
        tv ? 'rounded-2xl px-6 py-4' : 'rounded-2xl px-4 py-3 sm:px-6'
      }`}
    >
      <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-center">
        <Snowflake className={`${tv ? 'h-9 w-9' : 'h-6 w-6'} shrink-0 animate-spin [animation-duration:6s]`} aria-hidden="true" />
        <p className={`font-display tracking-wide ${tv ? 'text-4xl md:text-5xl' : 'text-2xl sm:text-3xl'}`}>
          MYSTERY MODE: Scores Frozen for Final Reveal!
        </p>
        <Snowflake className={`${tv ? 'h-9 w-9' : 'h-6 w-6'} shrink-0 animate-spin [animation-duration:6s]`} aria-hidden="true" />
      </div>
      {frozenAt && (
        <p className={`mt-0.5 text-center text-white/80 ${tv ? 'text-lg' : 'text-xs sm:text-sm'}`}>
          Showing standings as of {formatDateTime(frozenAt)} — points are still being counted behind the scenes.
        </p>
      )}
    </div>
  );
}
