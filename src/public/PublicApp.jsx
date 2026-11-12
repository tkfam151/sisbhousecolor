import { useCallback, useEffect, useRef, useState } from 'react';
import { MonitorPlay, RefreshCw } from 'lucide-react';
import { useLeaderboard } from '../hooks/useLeaderboard.js';
import { getHouse } from '../lib/houses.js';
import { fireHouseConfetti } from '../lib/celebrate.js';
import { formatPoints } from '../lib/utils.js';
import ModeBadge from '../components/ModeBadge.jsx';
import FreezeBanner from '../components/FreezeBanner.jsx';
import AwardToast from '../components/AwardToast.jsx';
import HouseStandings from './HouseStandings.jsx';
import ActivityFeed from './ActivityFeed.jsx';
import CategoryBreakdown from './CategoryBreakdown.jsx';
import ProgressionChart from './ProgressionChart.jsx';
import ArchivesDrawer from './ArchivesDrawer.jsx';
import TVBoard from './TVBoard.jsx';

const TOAST_MS = 6000;

function readTvParam() {
  return new URLSearchParams(window.location.search).get('tv') === '1';
}

function setTvParam(on) {
  const url = new URL(window.location.href);
  if (on) url.searchParams.set('tv', '1');
  else url.searchParams.delete('tv');
  window.history.replaceState(null, '', url);
}

export default function PublicApp() {
  const [tv, setTv] = useState(readTvParam);
  const [archivesOpen, setArchivesOpen] = useState(false);
  const [toast, setToast] = useState(null);
  const frozenRef = useRef(false);
  const seenLogIds = useRef(new Set());

  const showToast = useCallback((next) => setToast({ ...next, id: `${Date.now()}-${Math.random()}` }), []);

  const handleNewAward = useCallback(
    (log) => {
      if (frozenRef.current || !log || seenLogIds.current.has(log.id)) return;
      seenLogIds.current.add(log.id);
      const points = Number(log.points);
      if (!(points > 0)) return; // deductions update the board quietly
      const house = getHouse(log.house_id);
      fireHouseConfetti(house);
      showToast({
        house,
        text: `+${formatPoints(points)} pts to ${house.name} from ${log.awarded_by}!`,
        sub: [log.category, log.reason].filter(Boolean).join(' · '),
      });
    },
    [showToast],
  );

  const board = useLeaderboard({ respectFreeze: true, onNewAward: handleNewAward });
  frozenRef.current = board.frozen;

  // Big reveal: when Mystery Mode switches off, celebrate the leader.
  const wasFrozen = useRef(null);
  useEffect(() => {
    if (!board.ready) return;
    if (wasFrozen.current === true && !board.frozen) {
      const leader = board.ranked[0];
      if (leader) {
        fireHouseConfetti(leader, { big: true });
        showToast({
          house: leader,
          text: `${leader.name} lead with ${formatPoints(leader.points)} pts!`,
          sub: 'Scores revealed. These are the real standings.',
        });
      }
    }
    wasFrozen.current = board.frozen;
  }, [board.frozen, board.ready, board.ranked, showToast]);

  useEffect(() => {
    if (!toast) return undefined;
    const t = setTimeout(() => setToast(null), TOAST_MS);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    const onPop = () => setTv(readTvParam());
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const enterTv = () => {
    setTvParam(true);
    setTv(true);
    window.scrollTo(0, 0);
  };
  const exitTv = useCallback(() => {
    setTvParam(false);
    setTv(false);
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
  }, []);

  useEffect(() => {
    document.title = tv ? 'SISB House Points — TV Mode' : 'SISB House Leaderboard';
  }, [tv]);

  if (!board.ready) {
    return (
      <div className={`flex min-h-screen items-center justify-center ${tv ? 'tv-bg text-white' : ''}`}>
        {board.error ? (
          <div className="card mx-4 max-w-md p-6 text-center">
            <p className="font-semibold text-stone-900">Couldn’t load the leaderboard</p>
            <p className="mt-1 text-sm text-stone-600">{board.error.message}</p>
            <button type="button" className="btn-primary mt-4" onClick={board.refresh}>
              <RefreshCw className="h-4 w-4" /> Try again
            </button>
          </div>
        ) : (
          <p className="text-lg font-semibold">Loading…</p>
        )}
      </div>
    );
  }

  if (tv) {
    return (
      <>
        <TVBoard ranked={board.ranked} frozen={board.frozen} frozenAt={board.frozenAt} status={board.status} onExit={exitTv} />
        <AwardToast toast={toast} tv />
      </>
    );
  }

  const leader = board.ranked[0];
  const hasLeader = leader && leader.points > 0 && board.ranked[1]?.points !== leader.points;

  return (
    <div className="min-h-screen">
      <header className="bg-navy text-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-4">
          <div>
            <h1 className="font-display text-3xl font-extrabold uppercase leading-none tracking-wide sm:text-4xl">SISB House Points</h1>
            <p className="mt-0.5 text-sm text-white/60">Red Leopards · Orange Tigers · Yellow Cheetahs · Green Panthers · Blue Lynxes</p>
          </div>
          <nav className="flex flex-wrap items-center gap-1 text-sm font-semibold" aria-label="Leaderboard actions">
            <button type="button" onClick={enterTv} className="btn bg-white px-3 py-2 text-navy hover:bg-stone-100">
              <MonitorPlay className="h-4 w-4" /> TV / Projector Mode
            </button>
            <button type="button" onClick={() => setArchivesOpen(true)} className="btn px-3 py-2 text-white/80 hover:bg-white/10 hover:text-white">
              Past Terms
            </button>
            <a href="./admin/" className="btn px-3 py-2 text-white/80 hover:bg-white/10 hover:text-white">
              Staff Login
            </a>
          </nav>
        </div>
        <div className="flex h-1.5" aria-hidden="true">
          {board.houses.map((h) => (
            <span key={h.id} className="flex-1" style={{ background: h.primary }} />
          ))}
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-6 px-4 py-6">
        {board.frozen && <FreezeBanner frozenAt={board.frozenAt} />}

        <div className="grid gap-5 lg:grid-cols-5">
          <section className="lg:col-span-3" aria-labelledby="standings-title">
            <div className="mb-2 flex items-baseline justify-between gap-2">
              <h2 id="standings-title" className="section-title">
                Standings
              </h2>
              {hasLeader && !board.frozen && (
                <p className="text-sm text-stone-600">
                  {leader.name} ahead by {formatPoints(leader.points - board.ranked[1].points)}
                </p>
              )}
            </div>
            <HouseStandings ranked={board.ranked} />
          </section>
          <div className="lg:col-span-2">
            <ActivityFeed logs={board.logs} />
          </div>
        </div>

        <ProgressionChart logs={board.logs} />
        <CategoryBreakdown logs={board.logs} />
      </main>

      <footer className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 pb-8 pt-2 text-xs text-stone-500">
        <p>SISB House Color Points</p>
        <ModeBadge status={board.status} />
      </footer>

      <ArchivesDrawer open={archivesOpen} onClose={() => setArchivesOpen(false)} archives={board.archives} />
      <AwardToast toast={toast} />
    </div>
  );
}
