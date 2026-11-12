import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Archive,
  ExternalLink,
  KeyRound,
  ListOrdered,
  LogOut,
  MonitorPlay,
  ScrollText,
  ShieldCheck,
  Sparkles,
  Users,
} from 'lucide-react';
import { useLeaderboard } from '../hooks/useLeaderboard.js';
import { storage, isAuthError } from '../lib/storage.js';
import { headerLabel, toAuth } from '../lib/session.js';
import ModeBadge from '../components/ModeBadge.jsx';
import { Alert } from '../components/ui.jsx';
import AwardPanel from './AwardPanel.jsx';
import UndoBanner from './UndoBanner.jsx';
import FreezeControl from './FreezeControl.jsx';
import LogsPanel from './LogsPanel.jsx';
import TeachersPanel from './TeachersPanel.jsx';
import SecurityPanel from './SecurityPanel.jsx';
import ArchivePanel from './ArchivePanel.jsx';
import AuditPanel from './AuditPanel.jsx';
import MyAccountPanel from './MyAccountPanel.jsx';

const ROLE_CHIP = {
  super_admin: ['Super Admin', 'bg-violet-100 text-violet-800 ring-violet-200'],
  general_admin: ['General Admin', 'bg-sky-100 text-sky-800 ring-sky-200'],
  teacher: ['Teacher', 'bg-emerald-100 text-emerald-800 ring-emerald-200'],
};

export default function Dashboard({ session, onLogout, onSessionUpdate }) {
  const isSuper = session.role === 'super_admin';
  const isAdmin = isSuper || session.role === 'general_admin';
  const isTeacher = session.role === 'teacher';

  const board = useLeaderboard({ respectFreeze: false });
  const auth = useMemo(() => toAuth(session), [session]);
  const [undo, setUndo] = useState(null);
  const [superData, setSuperData] = useState(null);
  const [superError, setSuperError] = useState(null);

  const tabs = useMemo(() => {
    const list = [{ id: 'award', label: 'Award Points', icon: Sparkles }];
    if (isAdmin) list.push({ id: 'logs', label: 'Point Logs', icon: ListOrdered });
    if (isSuper) {
      list.push(
        { id: 'teachers', label: 'Teachers', icon: Users },
        { id: 'security', label: 'Security', icon: KeyRound },
        { id: 'archive', label: 'Archive Term', icon: Archive },
        { id: 'audit', label: 'Audit Log', icon: ScrollText },
      );
    }
    if (isTeacher && board.allowTeacherPasswordChange) list.push({ id: 'account', label: 'Change My Password', icon: KeyRound });
    return list;
  }, [isAdmin, isSuper, isTeacher, board.allowTeacherPasswordChange]);

  const [tab, setTab] = useState('award');
  const activeTab = tabs.some((t) => t.id === tab) ? tab : 'award';

  /** Returns true if the error was an auth failure (and the user was logged out). */
  const handleAuthError = useCallback(
    (err) => {
      if (isAuthError(err)) {
        onLogout('Your login is no longer valid (password changed or account deactivated). Please log in again.');
        return true;
      }
      return false;
    },
    [onLogout],
  );

  const reloadSuper = useCallback(async () => {
    if (!isSuper) return;
    try {
      const data = await storage.superGetDashboard(session.password);
      setSuperData(data);
      setSuperError(null);
    } catch (err) {
      if (!handleAuthError(err)) setSuperError(err.message);
    }
  }, [isSuper, session.password, handleAuthError]);

  useEffect(() => {
    reloadSuper();
  }, [reloadSuper]);

  // Keep the audit log fresh when anything changes on the board.
  const superTimer = useRef(null);
  useEffect(() => {
    if (!isSuper) return undefined;
    const unsubscribe = storage.subscribe(() => {
      clearTimeout(superTimer.current);
      superTimer.current = setTimeout(reloadSuper, 400);
    });
    return () => {
      clearTimeout(superTimer.current);
      unsubscribe();
    };
  }, [isSuper, reloadSuper]);

  const onAwarded = useCallback((result, house, points) => {
    setUndo({
      logId: result.log_id,
      house,
      points,
      expiresAt: Date.now() + 60_000,
      key: result.log_id,
    });
  }, []);

  const [chipLabel, chipClass] = ROLE_CHIP[session.role] || ROLE_CHIP.teacher;

  return (
    <div className="min-h-screen pb-16">
      <header className="sticky top-0 z-30 bg-slate-900 text-white shadow-lg">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-widest text-white/50">House Points Admin</p>
            <p className="truncate text-base font-bold sm:text-lg" data-testid="logged-in-as">
              Logged in as: {headerLabel(session)}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className={`hidden rounded-full px-2.5 py-1 text-xs font-bold ring-1 sm:inline-flex ${chipClass}`}>{chipLabel}</span>
            <ModeBadge status={board.status} dark />
            <a href="../" target="_blank" rel="noreferrer" className="btn bg-white/10 px-3 py-2 text-white ring-1 ring-white/20 hover:bg-white/20">
              <ExternalLink className="h-4 w-4" /> <span className="hidden sm:inline">Leaderboard</span>
            </a>
            <a href="../?tv=1" target="_blank" rel="noreferrer" className="btn bg-white/10 px-3 py-2 text-white ring-1 ring-white/20 hover:bg-white/20">
              <MonitorPlay className="h-4 w-4" /> <span className="hidden sm:inline">TV Mode</span>
            </a>
            <button type="button" onClick={() => onLogout()} className="btn bg-white px-3 py-2 text-slate-900 hover:bg-slate-100">
              <LogOut className="h-4 w-4" /> Log Out
            </button>
          </div>
        </div>
        {undo && (
          <UndoBanner
            key={undo.key}
            undo={undo}
            auth={auth}
            onDone={() => setUndo(null)}
            onAuthError={handleAuthError}
          />
        )}
      </header>

      <main className="mx-auto max-w-6xl space-y-5 px-4 py-5">
        {board.error && <Alert tone="error">Could not load live data: {board.error.message}</Alert>}

        {isAdmin && (
          <FreezeControl
            auth={auth}
            frozen={board.isFrozenServer}
            frozenAt={board.serverFrozenAt}
            onAuthError={handleAuthError}
            onChanged={board.refresh}
          />
        )}

        {tabs.length > 1 && (
          <nav className="-mx-4 overflow-x-auto px-4" aria-label="Dashboard sections">
            <div className="flex w-max gap-1 rounded-2xl bg-white p-1 shadow-sm ring-1 ring-slate-200" role="tablist">
              {tabs.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={activeTab === id}
                  onClick={() => setTab(id)}
                  className={`flex items-center gap-2 whitespace-nowrap rounded-xl px-3.5 py-2 text-sm font-semibold transition ${
                    activeTab === id ? 'bg-slate-900 text-white shadow' : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <Icon className="h-4 w-4" aria-hidden="true" /> {label}
                </button>
              ))}
            </div>
          </nav>
        )}

        {superError && isSuper && <Alert tone="error">{superError}</Alert>}

        {activeTab === 'award' && (
          <AwardPanel
            auth={auth}
            role={session.role}
            houses={board.houses}
            logs={board.logs}
            onAwarded={onAwarded}
            onAuthError={handleAuthError}
          />
        )}
        {activeTab === 'logs' && isAdmin && <LogsPanel auth={auth} logs={board.logs} onAuthError={handleAuthError} />}
        {activeTab === 'teachers' && isSuper && (
          <TeachersPanel
            superPassword={session.password}
            teachers={superData?.teachers || []}
            loading={!superData}
            reload={reloadSuper}
            onAuthError={handleAuthError}
          />
        )}
        {activeTab === 'security' && isSuper && (
          <SecurityPanel
            superPassword={session.password}
            allowTeacherPasswordChange={Boolean(superData?.allow_teacher_password_change ?? board.allowTeacherPasswordChange)}
            reload={reloadSuper}
            onAuthError={handleAuthError}
          />
        )}
        {activeTab === 'archive' && isSuper && (
          <ArchivePanel
            superPassword={session.password}
            ranked={board.ranked}
            archives={board.archives}
            frozen={board.isFrozenServer}
            onArchived={() => {
              board.refresh();
              reloadSuper();
            }}
            onAuthError={handleAuthError}
          />
        )}
        {activeTab === 'audit' && isSuper && (
          <AuditPanel logs={superData?.audit_logs || []} loading={!superData} reload={reloadSuper} />
        )}
        {activeTab === 'account' && isTeacher && (
          <MyAccountPanel session={session} onSessionUpdate={onSessionUpdate} />
        )}
      </main>
    </div>
  );
}
