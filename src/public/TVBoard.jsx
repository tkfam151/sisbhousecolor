import { useEffect, useState } from 'react';
import { Maximize, Minimize, X } from 'lucide-react';
import { HouseEmblem } from '../lib/houses.js';
import FreezeBanner from '../components/FreezeBanner.jsx';
import ModeBadge from '../components/ModeBadge.jsx';
import { formatPoints, ordinal } from '../lib/utils.js';

function useClock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 15_000);
    return () => clearInterval(id);
  }, []);
  return now;
}

export default function TVBoard({ ranked, frozen, frozenAt, status, onExit }) {
  const now = useClock();
  const [isFullscreen, setIsFullscreen] = useState(Boolean(document.fullscreenElement));
  const max = Math.max(0, ...ranked.map((h) => h.points));

  useEffect(() => {
    const onChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
    const onKey = (e) => {
      if (e.key === 'Escape' && !document.fullscreenElement) onExit();
    };
    document.addEventListener('fullscreenchange', onChange);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('fullscreenchange', onChange);
      document.removeEventListener('keydown', onKey);
    };
  }, [onExit]);

  const toggleFullscreen = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
    } catch {
      /* fullscreen not permitted — ignore */
    }
  };

  const ctrl = 'btn border border-white/20 px-3 py-2 text-white/80 hover:bg-white/10 hover:text-white';

  return (
    <div className="tv-bg flex min-h-screen flex-col gap-4 p-4 text-white md:h-screen md:gap-5 md:overflow-hidden md:p-6 xl:p-8">
      <header className="flex flex-wrap items-end justify-between gap-3 border-b border-white/15 pb-3">
        <div>
          <p className="font-display text-4xl font-extrabold uppercase leading-none tracking-wide md:text-6xl">SISB House Points</p>
          <p className="mt-1 text-base text-white/50 md:text-xl">
            {now.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })},{' '}
            {now.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ModeBadge status={status} dark className="mr-2" />
          <button type="button" onClick={toggleFullscreen} className={ctrl}>
            {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
            <span className="hidden sm:inline">{isFullscreen ? 'Exit full screen' : 'Full screen'}</span>
          </button>
          <button type="button" onClick={onExit} className={ctrl}>
            <X className="h-4 w-4" /> <span className="hidden sm:inline">Exit</span>
          </button>
        </div>
      </header>

      {frozen && <FreezeBanner frozenAt={frozenAt} tv />}

      <ol className="grid flex-1 grid-cols-1 gap-4 sm:grid-cols-2 md:min-h-0 md:grid-cols-5" aria-label="House standings">
        {ranked.map((house) => {
          const pct = max > 0 ? Math.max(3, (house.points / max) * 100) : 3;
          return (
            <li key={house.id} className="relative flex min-h-[16rem] flex-col items-center overflow-hidden rounded-md bg-[#181c23] text-center md:min-h-0">
              <div className="absolute inset-x-0 bottom-0 opacity-90 transition-[height] duration-1000 ease-out" style={{ height: `${pct}%`, background: house.primary }} aria-hidden="true" />
              <div className="relative z-10 w-full py-2 font-display text-3xl font-extrabold uppercase xl:text-4xl" style={{ background: house.primary }}>
                {ordinal(house.rank)}
              </div>
              <div className="relative z-10 flex flex-1 flex-col items-center justify-center gap-3 px-3 py-3">
                <HouseEmblem houseId={house.id} size={220} className="h-28 w-28 md:h-auto md:max-h-[26vh] md:w-full md:max-w-[220px]" />
                <h2 className="font-display text-3xl font-bold uppercase leading-none tracking-wide md:text-4xl xl:text-5xl">{house.name}</h2>
              </div>
              <p className="relative z-10 font-display text-7xl font-extrabold leading-none tabular-nums md:text-[clamp(3.5rem,6.5vw,9rem)]" aria-label={`${house.points} points`}>
                {formatPoints(house.points)}
              </p>
              <p className="relative z-10 pb-4 text-lg font-semibold uppercase tracking-[0.2em] text-white/80">points</p>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
