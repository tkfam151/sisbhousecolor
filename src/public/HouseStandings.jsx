import { useEffect, useRef, useState } from 'react';
import { Crown } from 'lucide-react';
import { HouseEmblem } from '../lib/houses.js';
import { formatPoints, ordinal } from '../lib/utils.js';

function usePop(value) {
  const prev = useRef(value);
  const [pop, setPop] = useState(0);
  useEffect(() => {
    if (prev.current !== value) {
      prev.current = value;
      setPop((n) => n + 1);
    }
  }, [value]);
  return pop;
}

function StandingRow({ house, max }) {
  const pop = usePop(house.points);
  const pct = max > 0 ? Math.max(0, (house.points / max) * 100) : 0;
  const leader = house.rank === 1 && house.points > 0;
  return (
    <li
      className="relative flex items-center gap-3 overflow-hidden rounded-2xl border-2 bg-white p-3 shadow-sm transition sm:gap-4 sm:p-4"
      style={{ borderColor: leader ? house.primary : house.border, background: `linear-gradient(90deg, ${house.light}, #fff 70%)` }}
    >
      <div
        className="flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-xl text-white shadow sm:h-12 sm:w-12"
        style={{ background: house.primary }}
        aria-label={`Rank ${house.rank}`}
      >
        {leader ? <Crown className="h-4 w-4 sm:h-5 sm:w-5" aria-hidden="true" /> : null}
        <span className={`font-display leading-none ${leader ? 'text-lg sm:text-xl' : 'text-2xl sm:text-3xl'}`}>{ordinal(house.rank)}</span>
      </div>
      <HouseEmblem houseId={house.id} size={64} className="h-12 w-12 shrink-0 drop-shadow sm:h-16 sm:w-16" />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <h3 className="truncate text-base font-extrabold sm:text-xl" style={{ color: house.text }}>
            {house.name}
          </h3>
          <p key={pop} className={`font-display text-3xl leading-none tabular-nums text-slate-900 sm:text-5xl ${pop ? 'animate-pop' : ''}`}>
            {formatPoints(house.points)}
            <span className="ml-1 font-sans text-xs font-semibold text-slate-500 sm:text-sm">pts</span>
          </p>
        </div>
        <div className="mt-2 h-3 w-full overflow-hidden rounded-full bg-slate-100 sm:h-4" aria-hidden="true">
          <div
            className="h-full rounded-full transition-[width] duration-700 ease-out"
            style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${house.border}, ${house.primary})` }}
          />
        </div>
      </div>
    </li>
  );
}

export default function HouseStandings({ ranked }) {
  const max = Math.max(0, ...ranked.map((h) => h.points));
  return (
    <ol className="space-y-3" aria-label="House standings">
      {ranked.map((house) => (
        <StandingRow key={house.id} house={house} max={max} />
      ))}
    </ol>
  );
}
