import { useEffect, useState } from 'react';
import { Crown, Maximize, Minimize, X } from 'lucide-react';
import { HouseEmblem } from '../lib/houses.js';
import FreezeBanner from '../components/FreezeBanner.jsx';
import ModeBadge from '../components/ModeBadge.jsx';
import { formatPoints, ordinal } from '../lib/utils.js';

function useClock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000 * 15);
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

  return (
    <div className="tv-bg flex min-h-screen flex-col gap-4 p-4 text-white md:h-screen md:gap-5 md:overflow-hidden md:p-6 xl:p-8">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-display text-4xl leading-none tracking-wider md:text-6xl">SISB House Points</p>
          <p className="mt-1 text-base text-white/60 md:text-xl">
            {now.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })} ·{' '}
            {now.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ModeBadge status={status} dark />
          <button type="button" onClick={toggleFullscreen} className="btn rounded-xl bg-white/10 text-white ring-1 ring-white/20 hover:bg-white/20">
            {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
            <span className="hidden sm:inline">{isFullscreen ? 'Exit full screen' : 'Full screen'}</span>
          </button>
          <button type="button" onClick={onExit} className="btn rounded-xl bg-white/10 text-white ring-1 ring-white/20 hover:bg-white/20">
            <X className="h-4 w-4" /> <span className="hidden sm:inline">Exit TV mode</span>
          </button>
        </div>
      </header>

      {frozen && <FreezeBanner frozenAt={frozenAt} tv />}

      <ol className="grid flex-1 grid-cols-1 gap-4 sm:grid-cols-2 md:min-h-0 md:grid-cols-5 md:gap-5" aria-label="House standings">
        {ranked.map((house) => {
          const pct = max > 0 ? Math.max(4, (house.points / max) * 100) : 4;
          const leader = house.rank === 1 && house.points > 0;
          return (
            <li
              key={house.id}
              className="relative flex min-h-[16rem] flex-col items-center overflow-hidden rounded-3xl border-4 bg-slate-900/80 p-4 text-center shadow-2xl md:min-h-0"
              style={{ borderColor: house.primary, boxShadow: leader ? `0 0 60px -5px ${house.primary}` : undefined }}
            >
              {/* score meter fill */}
              <div
                className="absolute inset-x-0 bottom-0 transition-[height] duration-1000 ease-out"
                style={{ height: `${pct}%`, background: `linear-gradient(180deg, ${house.primary}cc, ${house.dark}ee)` }}
                aria-hidden="true"
              />
              <div className="relative z-10 flex w-full items-center justify-between">
                <span
                  className="rounded-xl px-3 py-1 font-display text-3xl leading-none text-white xl:text-4xl"
                  style={{ background: house.primary }}
                >
                  {ordinal(house.rank)}
                </span>
                {leader && <Crown className="h-10 w-10 text-yellow-300 drop-shadow-[0_0_12px_rgba(253,224,71,0.8)] xl:h-12 xl:w-12" aria-label="Leader" />}
              </div>
              <div className="relative z-10 flex flex-1 flex-col items-center justify-center gap-2 py-2">
                <HouseEmblem houseId={house.id} size={220} className="h-28 w-28 drop-shadow-2xl md:h-auto md:max-h-[26vh] md:w-full md:max-w-[220px]" />
                <h2 className="font-display text-3xl leading-none tracking-wide text-white drop-shadow md:text-4xl xl:text-5xl">{house.name}</h2>
              </div>
              <p
                className="relative z-10 font-display text-7xl leading-none tabular-nums text-white drop-shadow-[0_4px_12px_rgba(0,0,0,0.6)] md:text-[clamp(3.5rem,6.5vw,9rem)]"
                aria-label={`${house.points} points`}
              >
                {formatPoints(house.points)}
              </p>
              <p className="relative z-10 text-lg font-semibold uppercase tracking-[0.3em] text-white/80">points</p>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
