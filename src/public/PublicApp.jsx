import { useCallback, useEffect, useRef, useState } from 'react';
import { Archive, Lock, MonitorPlay, RefreshCw, Trophy } from 'lucide-react';
import { useLeaderboard } from '../hooks/useLeaderboard.js';
import { getHouse, HouseEmblem } from '../lib/houses.js';
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
          text: `Scores revealed! ${leader.name} lead with ${formatPoints(leader.points)} pts!`,
          sub: 'Mystery Mode is over — these are the real standings.',
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
            <p className="font-semibold text-slate-900">Couldn’t load the leaderboard</p>
            <p className="mt-1 text-sm text-slate-600">{board.error.message}</p>
            <button type="button" className="btn-primary mt-4" onClick={board.refresh}>
              <RefreshCw className="h-4 w-4" /> Try again
            </button>
          </div>
        ) : (
          <p className="animate-pulse text-lg font-semibold">Loading leaderboard…</p>
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
      <header className="bg-slate-900 text-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:py-5">
          <div className="flex items-center gap-3">
            <div className="flex -space-x-2" aria-hidden="true">
              {board.houses.map((h) => (
                <HouseEmblem key={h.id} houseId={h.id} size={32} className="rounded-full ring-2 ring-slate-900" />
              ))}
            </div>
            <div>
              <h1 className="font-display text-3xl leading-none tracking-wide sm:text-4xl">SISB House Leaderboard</h1>
              <p className="text-xs text-white/60 sm:text-sm">Live house color points</p>
            </div>
          </div>
          <nav className="flex flex-wrap items-center gap-2" aria-label="Leaderboard actions">
            <button type="button" onClick={enterTv} className="btn bg-white text-slate-900 hover:bg-slate-100">
              <MonitorPlay className="h-4 w-4" /> TV / Projector Mode
            </button>
            <button type="button" onClick={() => setArchivesOpen(true)} className="btn bg-white/10 text-white ring-1 ring-white/20 hover:bg-white/20">
              <Archive className="h-4 w-4" /> Past Terms
            </button>
            <a href="./admin/" className="btn bg-white/10 text-white ring-1 ring-white/20 hover:bg-white/20">
              <Lock className="h-4 w-4" /> Staff Login
            </a>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-5 px-4 py-5 sm:py-6">
        {board.frozen && <FreezeBanner frozenAt={board.frozenAt} />}

        {hasLeader && !board.frozen && (
          <div
            className="flex items-center gap-3 rounded-2xl px-4 py-3 text-white shadow"
            style={{ background: `linear-gradient(90deg, ${leader.primary}, ${leader.dark})` }}
          >
            <Trophy className="h-6 w-6 shrink-0 text-yellow-300" aria-hidden="true" />
            <p className="text-sm font-semibold sm:text-base">
              {leader.name} lead by {formatPoints(leader.points - board.ranked[1].points)} pts!
            </p>
          </div>
        )}

        <div className="grid gap-5 lg:grid-cols-5">
          <section className="lg:col-span-3" aria-labelledby="standings-title">
            <h2 id="standings-title" className="sr-only">
              Standings
            </h2>
            <HouseStandings ranked={board.ranked} />
          </section>
          <div className="lg:col-span-2">
            <ActivityFeed logs={board.logs} />
          </div>
        </div>

        <ProgressionChart logs={board.logs} />
        <CategoryBreakdown logs={board.logs} />
      </main>

      <footer className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 pb-8 pt-2 text-xs text-slate-500">
        <p>© {new Date().getFullYear()} SISB · House Color Leaderboard</p>
        <ModeBadge status={board.status} />
      </footer>

      <ArchivesDrawer open={archivesOpen} onClose={() => setArchivesOpen(false)} archives={board.archives} />
      <AwardToast toast={toast} />
    </div>
  );
}
