import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { storage } from '../lib/storage.js';
import { mergeHouses, rankHouses } from '../lib/utils.js';

const POLL_MS = 30_000;

/**
 * Loads the public leaderboard state, the current term's point logs and the
 * archive list; keeps them fresh via Realtime / storage events (+ a slow poll as
 * a safety net).
 *
 * @param {{ respectFreeze?: boolean, onNewAward?: (log: object) => void }} options
 *   respectFreeze — when true (public screens) frozen snapshot scores are shown
 *   and logs created after `frozen_at` are hidden.
 */
export function useLeaderboard({ respectFreeze = true, onNewAward } = {}) {
  const [publicState, setPublicState] = useState(null);
  const [logs, setLogs] = useState([]);
  const [archives, setArchives] = useState([]);
  const [status, setStatus] = useState('connecting');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const onNewAwardRef = useRef(onNewAward);
  onNewAwardRef.current = onNewAward;

  const loadSeq = useRef(0);
  const load = useCallback(async () => {
    const seq = ++loadSeq.current;
    try {
      const [state, archiveRows] = await Promise.all([storage.getPublicState(), storage.getArchives()]);
      const since = archiveRows[0]?.archived_at || null; // current term = since last archive
      const logRows = await storage.getPointLogs({ since });
      if (seq !== loadSeq.current) return; // a newer load superseded this one
      setPublicState(state);
      setArchives(archiveRows);
      setLogs(logRows);
      setError(null);
    } catch (err) {
      if (seq === loadSeq.current) setError(err);
    } finally {
      if (seq === loadSeq.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    let timer = null;
    const schedule = () => {
      clearTimeout(timer);
      timer = setTimeout(load, 120);
    };
    const unsubscribe = storage.subscribe((event) => {
      if (event.type === 'insert_log' && event.log) onNewAwardRef.current?.(event.log);
      schedule();
    }, setStatus);
    const poll = setInterval(load, POLL_MS);
    const onVisible = () => {
      if (document.visibilityState === 'visible') load();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearTimeout(timer);
      clearInterval(poll);
      document.removeEventListener('visibilitychange', onVisible);
      unsubscribe();
    };
  }, [load]);

  const derived = useMemo(() => {
    const snapshot = publicState?.frozen_snapshot;
    const frozen = Boolean(respectFreeze && publicState?.freeze_leaderboard && snapshot);
    const frozenAt = frozen ? snapshot.frozen_at : null;
    const frozenMs = frozenAt ? new Date(frozenAt).getTime() : null;
    const houses = mergeHouses(frozen ? snapshot.houses : publicState?.houses);
    const visibleLogs = frozenMs === null ? logs : logs.filter((log) => new Date(log.created_at).getTime() <= frozenMs);
    return {
      frozen,
      frozenAt,
      isFrozenServer: Boolean(publicState?.freeze_leaderboard),
      serverFrozenAt: publicState?.freeze_leaderboard ? publicState?.frozen_snapshot?.frozen_at || null : null,
      houses,
      ranked: rankHouses(houses),
      logs: visibleLogs,
      allowTeacherPasswordChange: Boolean(publicState?.allow_teacher_password_change),
    };
  }, [publicState, logs, respectFreeze]);

  return { ...derived, archives, status, error, loading, refresh: load, ready: Boolean(publicState) };
}
