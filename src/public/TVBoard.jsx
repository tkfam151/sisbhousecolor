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

  const ctrl = 'btn-secondary px-4 py-2 text-[13px]';

  return (
    <div className="flex min-h-screen flex-col gap-5 bg-paper p-5 text-ink md:h-screen md:gap-6 md:overflow-hidden md:p-8 xl:p-10">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-display text-4xl font-bold tracking-tight md:text-6xl">House Points</p>
          <p className="mt-1 text-base text-mute md:text-xl">
            {now.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })} ·{' '}
            {now.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ModeBadge status={status} className="mr-2" />
          <button type="button" onClick={toggleFullscreen} className={ctrl}>
            {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
            <span className="hidden sm:inline">{isFullscreen ? 'Exit Full Screen' : 'Full Screen'}</span>
          </button>
          <button type="button" onClick={onExit} className={ctrl}>
            <X className="h-4 w-4" /> <span className="hidden sm:inline">Done</span>
          </button>
        </div>
      </header>

      {frozen && <FreezeBanner frozenAt={frozenAt} tv />}

      <ol className="grid flex-1 grid-cols-1 gap-4 sm:grid-cols-2 md:min-h-0 md:grid-cols-5 md:gap-5" aria-label="House standings">
        {ranked.map((house) => {
          const pct = max > 0 ? Math.max(0, (house.points / max) * 100) : 0;
          return (
            <li key={house.id} className="flex min-h-[18rem] flex-col items-center rounded-[28px] bg-white px-5 shadow-card pb-6 pt-5 text-center md:min-h-0">
              <span className="text-xl font-medium text-mute md:text-2xl">{ordinal(house.rank)}</span>
              <div className="flex flex-1 flex-col items-center justify-center gap-4 py-3">
                <HouseEmblem houseId={house.id} size={220} className="h-28 w-28 md:h-auto md:max-h-[24vh] md:w-full md:max-w-[200px]" />
                <h2 className="font-display text-2xl font-semibold tracking-tight md:text-3xl xl:text-4xl">{house.name}</h2>
              </div>
              <p className="font-display text-7xl font-bold leading-none tracking-tight tabular-nums md:text-[clamp(3.5rem,6vw,8rem)]" aria-label={`${house.points} points`}>
                {formatPoints(house.points)}
              </p>
              <p className="mt-1 text-lg text-mute">points</p>
              <div className="mt-5 h-1.5 w-full overflow-hidden rounded-full bg-black/[0.06]" aria-hidden="true">
                <div className="h-full rounded-full transition-[width] duration-1000 ease-out" style={{ width: `${pct}%`, background: house.primary }} />
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
