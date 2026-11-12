import { useEffect, useRef, useState } from 'react';
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
  return (
    <li className="flex items-center gap-3 border-b border-stone-200 bg-white py-3 pl-0 pr-4 last:border-b-0 sm:gap-4">
      <span className="w-2 self-stretch" style={{ background: house.primary }} aria-hidden="true" />
      <span className="w-10 shrink-0 text-center font-display text-2xl font-bold text-stone-400 sm:w-12 sm:text-3xl" aria-label={`Rank ${house.rank}`}>
        {ordinal(house.rank)}
      </span>
      <HouseEmblem houseId={house.id} size={64} className="h-12 w-12 sm:h-16 sm:w-16" />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <h3 className="truncate font-display text-xl font-bold uppercase tracking-wide sm:text-2xl" style={{ color: house.text }}>
            {house.name}
          </h3>
          <p key={pop} className={`font-display text-3xl font-bold leading-none tabular-nums text-stone-900 sm:text-5xl ${pop ? 'animate-pop' : ''}`}>
            {formatPoints(house.points)}
            <span className="ml-1 font-sans text-xs font-medium text-stone-500 sm:text-sm">pts</span>
          </p>
        </div>
        <div className="mt-2 h-2 w-full bg-stone-100" aria-hidden="true">
          <div className="h-full transition-[width] duration-700 ease-out" style={{ width: `${pct}%`, background: house.primary }} />
        </div>
      </div>
    </li>
  );
}

export default function HouseStandings({ ranked }) {
  const max = Math.max(0, ...ranked.map((h) => h.points));
  return (
    <ol className="card overflow-hidden" aria-label="House standings">
      {ranked.map((house) => (
        <StandingRow key={house.id} house={house} max={max} />
      ))}
    </ol>
  );
}
