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
    <li className="flex items-center gap-4 px-5 py-4">
      <span className="w-9 shrink-0 text-[15px] font-medium text-mute" aria-label={`Rank ${house.rank}`}>
        {ordinal(house.rank)}
      </span>
      <HouseEmblem houseId={house.id} size={56} className="h-12 w-12 sm:h-14 sm:w-14" />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="truncate text-[17px] font-semibold tracking-tight text-ink sm:text-xl">{house.name}</h3>
          <p key={pop} className={`font-display text-3xl font-semibold leading-none tracking-tight tabular-nums text-ink sm:text-4xl ${pop ? 'animate-pop' : ''}`}>
            {formatPoints(house.points)}
          </p>
        </div>
        <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-black/[0.06]" aria-hidden="true">
          <div className="h-full rounded-full transition-[width] duration-700 ease-out" style={{ width: `${pct}%`, background: house.primary }} />
        </div>
      </div>
    </li>
  );
}

export default function HouseStandings({ ranked }) {
  const max = Math.max(0, ...ranked.map((h) => h.points));
  return (
    <ol className="card divide-y divide-black/[0.06] overflow-hidden" aria-label="House standings">
      {ranked.map((house) => (
        <StandingRow key={house.id} house={house} max={max} />
      ))}
    </ol>
  );
}
