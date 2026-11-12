/**
 * Unified data layer.
 *
 * - When VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set, every call goes to
 *   Supabase (public SELECTs + SECURITY DEFINER RPCs) and live updates arrive over
 *   Supabase Realtime (`house-leaderboard` channel).
 * - Otherwise a complete localStorage implementation mirrors every RPC (including
 *   salted SHA-256 password hashing via SubtleCrypto, the 60-second undo window,
 *   freeze snapshots, term archives and the audit log) and broadcasts changes to
 *   other tabs through `storage` events.
 *
 * Every function returns a Promise and throws an Error with a human-readable
 * message on failure. Errors caused by bad / stale credentials carry
 * `error.code === 'AUTH_FAILED'`.
 */
import { createClient } from '@supabase/supabase-js';
import { HOUSES, HOUSE_BY_ID } from './houses.js';

const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL || '').trim();
const SUPABASE_ANON_KEY = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();

export const MODE = SUPABASE_URL && SUPABASE_ANON_KEY ? 'supabase' : 'local';
export const CATEGORIES = ['Sports', 'Academics', 'Spirit', 'Other'];
export const UNDO_WINDOW_MS = 60_000;
export const MAX_ABS_POINTS = 100_000;

export const ROLE_LABELS = {
  super_admin: 'Super Admin (sisbadmin)',
  general_admin: 'General Admin',
};

const AUTH_ERROR_PATTERN = /invalid credentials|deactivated|not authori[sz]ed|super admin password/i;

function makeError(message, code) {
  const error = new Error(message || 'Something went wrong. Please try again.');
  if (code) error.code = code;
  else if (AUTH_ERROR_PATTERN.test(error.message)) error.code = 'AUTH_FAILED';
  return error;
}

/* ========================================================================== */
/*  Supabase backend                                                          */
/* ========================================================================== */

function createSupabaseBackend() {
  const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    realtime: { params: { eventsPerSecond: 20 } },
  });

  async function rpc(fn, args = {}) {
    const { data, error } = await client.rpc(fn, args);
    if (error) throw makeError(error.message || error.details || error.hint);
    return data;
  }

  async function select(table, build) {
    const { data, error } = await build(client.from(table));
    if (error) throw makeError(error.message);
    return data;
  }

  // One shared realtime channel for the whole page, fanned out to listeners.
  const listeners = new Set();
  const statusListeners = new Set();
  let channel = null;
  let status = 'connecting';

  function setStatus(next) {
    status = next;
    statusListeners.forEach((fn) => fn(status));
  }

  function emit(event) {
    listeners.forEach((fn) => {
      try {
        fn(event);
      } catch (err) {
        console.error(err);
      }
    });
  }

  function ensureChannel() {
    if (channel) return;
    channel = client
      .channel('house-leaderboard')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'houses' }, () =>
        emit({ type: 'change', table: 'houses' }),
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'point_logs' }, (payload) => {
        if (payload.eventType === 'INSERT') emit({ type: 'insert_log', log: payload.new });
        else emit({ type: 'change', table: 'point_logs' });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'term_archives' }, () =>
        emit({ type: 'change', table: 'term_archives' }),
      )
      .subscribe((s) => {
        if (s === 'SUBSCRIBED') {
          setStatus('live');
          emit({ type: 'change', table: '*' }); // resync after (re)connect
        } else if (s === 'CHANNEL_ERROR' || s === 'TIMED_OUT') setStatus('error');
        else if (s === 'CLOSED') setStatus('offline');
        else setStatus('connecting');
      });
  }

  return {
    async getPublicState() {
      return rpc('get_public_state');
    },

    async getPointLogs({ since = null, limit = 50_000 } = {}) {
      const pageSize = 1000;
      const all = [];
      for (let from = 0; from < limit; from += pageSize) {
        const rows = await select('point_logs', (q) => {
          let query = q
            .select('*')
            .order('created_at', { ascending: false })
            .order('id', { ascending: false })
            .range(from, from + pageSize - 1);
          if (since) query = query.gt('created_at', since);
          return query;
        });
        all.push(...rows);
        if (rows.length < pageSize) break;
      }
      return all;
    },

    async getArchives() {
      return select('term_archives', (q) => q.select('*').order('archived_at', { ascending: false }));
    },

    verifyLogin: (loginType, username, password) =>
      rpc('verify_login', { p_login_type: loginType, p_username: username || null, p_password: password }),

    awardPoints: (auth, houseId, points, category, reason) =>
      rpc('award_points', {
        p_auth: auth,
        p_house_id: houseId,
        p_points: points,
        p_category: category,
        p_reason: reason || null,
      }),

    undoLastAward: (auth, logId) => rpc('undo_last_award', { p_auth: auth, p_log_id: logId }),

    adminDeleteLog: (auth, logId) => rpc('admin_delete_log', { p_auth: auth, p_log_id: logId }),

    adminToggleFreeze: (auth, freeze) => rpc('admin_toggle_freeze', { p_auth: auth, p_freeze: freeze }),

    superGetDashboard: (superPassword) =>
      rpc('super_admin_get_dashboard_data', { p_super_password: superPassword }),

    superCreateTeacher: (superPassword, fullName, username, password) =>
      rpc('super_admin_create_teacher', {
        p_super_password: superPassword,
        p_full_name: fullName,
        p_username: username,
        p_password: password,
      }),

    superBulkCreateTeachers: (superPassword, teachers) =>
      rpc('super_admin_bulk_create_teachers', { p_super_password: superPassword, p_teachers: teachers }),

    superManageTeacher: (superPassword, teacherId, active, newPassword) =>
      rpc('super_admin_manage_teacher', {
        p_super_password: superPassword,
        p_teacher_id: teacherId,
        p_active: active,
        p_new_password: newPassword || null,
      }),

    superUpdateSecurity: (superPassword, newGeneralPassword, allowTeacherSelfChange) =>
      rpc('super_admin_update_security', {
        p_super_password: superPassword,
        p_new_general_password: newGeneralPassword || null,
        p_allow_teacher_self_change: allowTeacherSelfChange,
      }),

    superArchiveTerm: (superPassword, termName) =>
      rpc('super_admin_archive_term', { p_super_password: superPassword, p_term_name: termName }),

    superResetAll: (superPassword, confirm) =>
      rpc('super_admin_reset_all', { p_super_password: superPassword, p_confirm: confirm }),

    teacherChangeOwnPassword: (teacherId, oldPassword, newPassword) =>
      rpc('teacher_change_own_password', {
        p_teacher_id: teacherId,
        p_old_password: oldPassword,
        p_new_password: newPassword,
      }),

    subscribe(onEvent, onStatus) {
      listeners.add(onEvent);
      if (onStatus) {
        statusListeners.add(onStatus);
        onStatus(status);
      }
      ensureChannel();
      return () => {
        listeners.delete(onEvent);
        if (onStatus) statusListeners.delete(onStatus);
        if (listeners.size === 0 && channel) {
          client.removeChannel(channel);
          channel = null;
          status = 'connecting';
        }
      };
    },
  };
}

/* ========================================================================== */
/*  localStorage backend                                                      */
/* ========================================================================== */

const DB_KEY = 'sisb-house-leaderboard:db:v1';
const EVENT_KEY = 'sisb-house-leaderboard:event:v1';
const LOCAL_EVENT = 'sisb-house-leaderboard:local-event';

const DEFAULT_SUPER_PASSWORD = 'sisbadmin';
const DEFAULT_GENERAL_PASSWORD = 'sisbhousecolor2026';
const USERNAME_RE = /^[a-z0-9._-]{3,40}$/;
const MIN_PASSWORD = 6;

function uuid() {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function toHex(buffer) {
  return [...new Uint8Array(buffer)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function sha256Hex(text) {
  if (!globalThis.crypto?.subtle) {
    throw makeError(
      'Offline mode needs a secure context (https:// or http://localhost) for password hashing.',
      'NO_CRYPTO',
    );
  }
  return toHex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text)));
}

async function hashPassword(password) {
  const saltBytes = new Uint8Array(16);
  crypto.getRandomValues(saltBytes);
  const salt = toHex(saltBytes);
  return `sha256$${salt}$${await sha256Hex(`${salt}:${password}`)}`;
}

async function verifyPassword(password, stored) {
  if (!stored || typeof password !== 'string' || password === '') return false;
  const [alg, salt, digest] = stored.split('$');
  if (alg !== 'sha256' || !salt || !digest) return false;
  return (await sha256Hex(`${salt}:${password}`)) === digest;
}

function nowIso() {
  return new Date().toISOString();
}

function createLocalBackend() {
  function readDb() {
    try {
      const raw = localStorage.getItem(DB_KEY);
      if (!raw) return null;
      const db = JSON.parse(raw);
      return db && db.version === 1 ? db : null;
    } catch {
      return null;
    }
  }

  function writeDb(db) {
    try {
      localStorage.setItem(DB_KEY, JSON.stringify(db));
    } catch (err) {
      throw makeError(`Could not save to browser storage: ${err.message}`);
    }
  }

  async function createDefaultDb() {
    return {
      version: 1,
      houses: HOUSES.map((house) => ({
        id: house.id,
        name: house.name,
        color: house.primary,
        sort_order: house.sort_order,
        points: 0,
      })),
      app_config: {
        id: 1,
        general_admin_hash: await hashPassword(DEFAULT_GENERAL_PASSWORD),
        super_admin_hash: await hashPassword(DEFAULT_SUPER_PASSWORD),
        allow_teacher_password_change: false,
        freeze_leaderboard: false,
        frozen_snapshot: null,
        updated_at: nowIso(),
      },
      teachers: [],
      point_logs: [],
      term_archives: [],
      audit_logs: [],
    };
  }

  async function ensureDb() {
    let db = readDb();
    if (!db) {
      db = await createDefaultDb();
      // Another tab may have initialised meanwhile — prefer what is stored.
      const existing = readDb();
      if (existing) return existing;
      writeDb(db);
    }
    // Self-heal: make sure all five houses exist.
    for (const house of HOUSES) {
      if (!db.houses.some((row) => row.id === house.id)) {
        db.houses.push({ id: house.id, name: house.name, color: house.primary, sort_order: house.sort_order, points: 0 });
      }
    }
    return db;
  }

  // Serialise all operations in this tab so concurrent async calls never clobber each other.
  let queue = Promise.resolve();
  function run(fn) {
    const result = queue.then(async () => fn(await ensureDb()));
    queue = result.catch(() => {});
    return result;
  }

  function broadcast(event) {
    const payload = { ...event, nonce: uuid(), at: Date.now() };
    try {
      localStorage.setItem(EVENT_KEY, JSON.stringify(payload));
    } catch {
      /* ignore quota errors for the event channel */
    }
    window.dispatchEvent(new CustomEvent(LOCAL_EVENT, { detail: payload }));
  }

  function commit(db, events = [{ type: 'change', table: '*' }]) {
    writeDb(db);
    // Defer so the caller receives its result before listeners refetch.
    setTimeout(() => events.forEach(broadcast), 0);
  }

  function audit(db, actor, actionType, details) {
    db.audit_logs.push({ id: uuid(), actor, action_type: actionType, details, created_at: nowIso() });
  }

  function sortedHouses(db) {
    return [...db.houses].sort((a, b) => a.sort_order - b.sort_order).map((row) => ({ ...row }));
  }

  async function resolveAuth(db, auth) {
    const role = auth?.role || '';
    const password = auth?.password || '';
    if (!password) throw makeError('Invalid credentials', 'AUTH_FAILED');
    const cfg = db.app_config;
    if (role === 'super_admin' && (await verifyPassword(password, cfg.super_admin_hash))) {
      return { role, display_name: ROLE_LABELS.super_admin, teacher_id: null, actor_key: 'super_admin' };
    }
    if (role === 'general_admin' && (await verifyPassword(password, cfg.general_admin_hash))) {
      return { role, display_name: ROLE_LABELS.general_admin, teacher_id: null, actor_key: 'general_admin' };
    }
    if (role === 'teacher') {
      const username = String(auth?.username || '').trim().toLowerCase();
      const teacher = db.teachers.find((t) => t.username === username);
      if (teacher && teacher.active && (await verifyPassword(password, teacher.password_hash))) {
        return {
          role,
          display_name: teacher.full_name,
          teacher_id: teacher.id,
          actor_key: `teacher:${teacher.id}`,
        };
      }
    }
    throw makeError('Invalid credentials or account deactivated. Please log in again.', 'AUTH_FAILED');
  }

  async function requireAdmin(db, auth) {
    const who = await resolveAuth(db, auth);
    if (who.role !== 'super_admin' && who.role !== 'general_admin') {
      throw makeError('Not authorized: admin access required', 'AUTH_FAILED');
    }
    return who;
  }

  async function requireSuper(db, superPassword) {
    if (!(await verifyPassword(superPassword || '', db.app_config.super_admin_hash))) {
      throw makeError('Invalid Super Admin password', 'AUTH_FAILED');
    }
  }

  function validateNewTeacher(db, fullName, username, password) {
    const name = String(fullName || '').trim();
    const user = String(username || '').trim().toLowerCase();
    const pass = String(password || '');
    if (!name) return { error: 'Full name is required' };
    if (name.length > 120) return { error: 'Full name is too long (max 120 characters)' };
    if (!USERNAME_RE.test(user)) {
      return { error: 'Username must be 3–40 characters: letters, numbers, dot, dash or underscore' };
    }
    if (pass.length < MIN_PASSWORD) return { error: `Password must be at least ${MIN_PASSWORD} characters` };
    if (db.teachers.some((t) => t.username === user)) return { error: `Username "${user}" already exists` };
    return { name, user, pass };
  }

  function publicTeacher(t) {
    return { id: t.id, full_name: t.full_name, username: t.username, active: t.active, created_at: t.created_at };
  }

  function computeStandings(db) {
    return sortedHouses(db)
      .sort((a, b) => b.points - a.points || a.sort_order - b.sort_order)
      .map((row, index) => ({
        rank: index + 1,
        house_id: row.id,
        house_name: row.name,
        color: row.color,
        points: row.points,
      }));
  }

  const api = {
    async getPublicState() {
      return run(async (db) => ({
        houses: sortedHouses(db),
        freeze_leaderboard: db.app_config.freeze_leaderboard,
        frozen_snapshot: db.app_config.frozen_snapshot,
        allow_teacher_password_change: db.app_config.allow_teacher_password_change,
      }));
    },

    async getPointLogs({ since = null, limit = 50_000 } = {}) {
      return run(async (db) => {
        const sinceMs = since ? new Date(since).getTime() : null;
        return db.point_logs
          .filter((log) => sinceMs === null || new Date(log.created_at).getTime() > sinceMs)
          .sort((a, b) => (a.created_at < b.created_at ? 1 : a.created_at > b.created_at ? -1 : 0))
          .slice(0, limit)
          .map((log) => ({ ...log }));
      });
    },

    async getArchives() {
      return run(async (db) =>
        [...db.term_archives].sort((a, b) => (a.archived_at < b.archived_at ? 1 : -1)).map((a) => ({ ...a })),
      );
    },

    async verifyLogin(loginType, username, password) {
      return run(async (db) => {
        const pw = String(password || '');
        const base = { allow_teacher_password_change: db.app_config.allow_teacher_password_change };
        if (!pw) return { ...base, success: false, error: 'Please enter a password' };
        if (loginType === 'admin') {
          if (await verifyPassword(pw, db.app_config.super_admin_hash)) {
            audit(db, ROLE_LABELS.super_admin, 'LOGIN', 'Super Admin logged in');
            commit(db, []);
            return { ...base, success: true, role: 'super_admin', display_name: ROLE_LABELS.super_admin, teacher_id: null };
          }
          if (await verifyPassword(pw, db.app_config.general_admin_hash)) {
            audit(db, ROLE_LABELS.general_admin, 'LOGIN', 'General Admin logged in');
            commit(db, []);
            return { ...base, success: true, role: 'general_admin', display_name: ROLE_LABELS.general_admin, teacher_id: null };
          }
          return { ...base, success: false, error: 'Incorrect admin password' };
        }
        if (loginType === 'teacher') {
          const user = String(username || '').trim().toLowerCase();
          const teacher = db.teachers.find((t) => t.username === user);
          if (!teacher || !(await verifyPassword(pw, teacher.password_hash))) {
            return { ...base, success: false, error: 'Incorrect username or password' };
          }
          if (!teacher.active) {
            return { ...base, success: false, error: 'This account has been deactivated. Please contact the Super Admin.' };
          }
          audit(db, teacher.full_name, 'LOGIN', `Teacher "${teacher.username}" logged in`);
          commit(db, []);
          return { ...base, success: true, role: 'teacher', display_name: teacher.full_name, teacher_id: teacher.id };
        }
        return { ...base, success: false, error: 'Unknown login type' };
      });
    },

    async awardPoints(auth, houseId, points, category, reason) {
      return run(async (db) => {
        const who = await resolveAuth(db, auth);
        const pts = Number(points);
        if (!Number.isInteger(pts) || pts === 0) throw makeError('Points must be a non-zero whole number');
        if (Math.abs(pts) > MAX_ABS_POINTS) throw makeError(`Points must be between -${MAX_ABS_POINTS} and ${MAX_ABS_POINTS}`);
        if (who.role === 'teacher' && pts <= 0) throw makeError('Teachers can only award positive points');
        const cat = String(category || '').trim() || 'Spirit';
        if (!CATEGORIES.includes(cat)) throw makeError(`Invalid category "${cat}"`);
        const cleanReason = String(reason || '').trim().slice(0, 300) || null;
        const house = db.houses.find((row) => row.id === houseId);
        if (!house) throw makeError('Unknown house');
        house.points += pts;
        const log = {
          id: uuid(),
          house_id: house.id,
          house_name: house.name,
          points: pts,
          category: cat,
          reason: cleanReason,
          awarded_by: who.display_name,
          actor_key: who.actor_key,
          created_at: nowIso(),
        };
        db.point_logs.push(log);
        if (pts < 0) {
          audit(db, who.display_name, 'POINTS_DEDUCTED', `Deducted ${Math.abs(pts)} pts from ${house.name} (${cat}${cleanReason ? `: ${cleanReason}` : ''})`);
        }
        commit(db, [{ type: 'insert_log', log: { ...log } }]);
        return { log_id: log.id, created_at: log.created_at, house_name: house.name, points: pts, house_points: house.points };
      });
    },

    async undoLastAward(auth, logId) {
      return run(async (db) => {
        const who = await resolveAuth(db, auth);
        const index = db.point_logs.findIndex((log) => log.id === logId);
        if (index < 0) throw makeError('That award was not found — it may already have been undone or deleted.');
        const log = db.point_logs[index];
        if (log.actor_key !== who.actor_key) throw makeError('You can only undo your own awards');
        if (new Date(log.created_at).getTime() <= Date.now() - UNDO_WINDOW_MS) {
          throw makeError('The 60-second undo window has expired. Ask an admin to delete the entry.');
        }
        db.point_logs.splice(index, 1);
        const house = db.houses.find((row) => row.id === log.house_id);
        if (house) house.points -= log.points;
        audit(db, who.display_name, 'UNDO_AWARD', `Undid ${log.points > 0 ? '+' : ''}${log.points} pts for ${log.house_name} (${log.category}${log.reason ? `: ${log.reason}` : ''})`);
        commit(db);
        return { success: true, house_name: log.house_name, points: log.points };
      });
    },

    async adminDeleteLog(auth, logId) {
      return run(async (db) => {
        const who = await requireAdmin(db, auth);
        const index = db.point_logs.findIndex((log) => log.id === logId);
        if (index < 0) throw makeError('Log entry not found — it may already have been deleted.');
        const log = db.point_logs[index];
        db.point_logs.splice(index, 1);
        const house = db.houses.find((row) => row.id === log.house_id);
        if (house) house.points -= log.points;
        audit(
          db,
          who.display_name,
          'DELETE_LOG',
          `Deleted ${log.points > 0 ? '+' : ''}${log.points} pts for ${log.house_name} (${log.category}${log.reason ? `: ${log.reason}` : ''}) awarded by ${log.awarded_by} at ${log.created_at}`,
        );
        commit(db);
        return { success: true, house_name: log.house_name, points: log.points };
      });
    },

    async adminToggleFreeze(auth, freeze) {
      return run(async (db) => {
        const who = await requireAdmin(db, auth);
        const cfg = db.app_config;
        if (freeze) {
          if (!cfg.freeze_leaderboard || !cfg.frozen_snapshot) {
            cfg.frozen_snapshot = {
              frozen_at: nowIso(),
              houses: sortedHouses(db).map(({ id, name, color, sort_order, points }) => ({ id, name, color, sort_order, points })),
            };
          }
          cfg.freeze_leaderboard = true;
        } else {
          cfg.freeze_leaderboard = false;
          cfg.frozen_snapshot = null;
        }
        cfg.updated_at = nowIso();
        audit(db, who.display_name, freeze ? 'FREEZE_ON' : 'FREEZE_OFF', freeze ? 'Mystery / Freeze Mode enabled — public scores frozen' : 'Mystery / Freeze Mode disabled — scores revealed');
        commit(db);
        return { freeze_leaderboard: cfg.freeze_leaderboard, frozen_snapshot: cfg.frozen_snapshot };
      });
    },

    async superGetDashboard(superPassword) {
      return run(async (db) => {
        await requireSuper(db, superPassword);
        return {
          teachers: [...db.teachers].sort((a, b) => a.full_name.localeCompare(b.full_name)).map(publicTeacher),
          audit_logs: [...db.audit_logs].sort((a, b) => (a.created_at < b.created_at ? 1 : -1)).slice(0, 1000),
          allow_teacher_password_change: db.app_config.allow_teacher_password_change,
          freeze_leaderboard: db.app_config.freeze_leaderboard,
        };
      });
    },

    async superCreateTeacher(superPassword, fullName, username, password) {
      return run(async (db) => {
        await requireSuper(db, superPassword);
        const v = validateNewTeacher(db, fullName, username, password);
        if (v.error) throw makeError(v.error);
        const teacher = {
          id: uuid(),
          full_name: v.name,
          username: v.user,
          password_hash: await hashPassword(v.pass),
          active: true,
          created_at: nowIso(),
        };
        db.teachers.push(teacher);
        audit(db, ROLE_LABELS.super_admin, 'TEACHER_CREATED', `Created teacher "${teacher.full_name}" (${teacher.username})`);
        commit(db);
        return publicTeacher(teacher);
      });
    },

    async superBulkCreateTeachers(superPassword, teachers) {
      return run(async (db) => {
        await requireSuper(db, superPassword);
        if (!Array.isArray(teachers) || teachers.length === 0) throw makeError('No teachers to import');
        if (teachers.length > 500) throw makeError('Please import at most 500 teachers at a time');
        const results = [];
        let created = 0;
        for (let i = 0; i < teachers.length; i += 1) {
          const row = teachers[i] || {};
          const line = row.line ?? i + 1;
          const v = validateNewTeacher(db, row.full_name, row.username, row.password);
          if (v.error) {
            results.push({ line, username: String(row.username || '').trim().toLowerCase(), full_name: row.full_name || '', status: 'error', message: v.error });
            continue;
          }
          const teacher = {
            id: uuid(),
            full_name: v.name,
            username: v.user,
            password_hash: await hashPassword(v.pass),
            active: true,
            created_at: nowIso(),
          };
          db.teachers.push(teacher);
          created += 1;
          results.push({ line, username: teacher.username, full_name: teacher.full_name, status: 'created', message: 'Created' });
        }
        audit(db, ROLE_LABELS.super_admin, 'TEACHERS_BULK_IMPORT', `Bulk import: ${created} created, ${results.length - created} failed`);
        commit(db);
        return { created, failed: results.length - created, results };
      });
    },

    async superManageTeacher(superPassword, teacherId, active, newPassword) {
      return run(async (db) => {
        await requireSuper(db, superPassword);
        const teacher = db.teachers.find((t) => t.id === teacherId);
        if (!teacher) throw makeError('Teacher not found');
        const changes = [];
        if (typeof active === 'boolean' && active !== teacher.active) {
          teacher.active = active;
          changes.push(active ? 'activated' : 'deactivated');
        }
        if (newPassword) {
          if (String(newPassword).length < MIN_PASSWORD) throw makeError(`Password must be at least ${MIN_PASSWORD} characters`);
          teacher.password_hash = await hashPassword(String(newPassword));
          changes.push('password reset');
        }
        if (changes.length === 0) return publicTeacher(teacher);
        audit(db, ROLE_LABELS.super_admin, 'TEACHER_UPDATED', `Teacher "${teacher.full_name}" (${teacher.username}): ${changes.join(', ')}`);
        commit(db);
        return publicTeacher(teacher);
      });
    },

    async superUpdateSecurity(superPassword, newGeneralPassword, allowTeacherSelfChange) {
      return run(async (db) => {
        await requireSuper(db, superPassword);
        const cfg = db.app_config;
        const changes = [];
        if (newGeneralPassword) {
          const pw = String(newGeneralPassword);
          if (pw.length < MIN_PASSWORD) throw makeError(`General Admin password must be at least ${MIN_PASSWORD} characters`);
          if (await verifyPassword(pw, cfg.super_admin_hash)) throw makeError('General Admin password must differ from the Super Admin password');
          cfg.general_admin_hash = await hashPassword(pw);
          changes.push('General Admin password changed');
        }
        if (typeof allowTeacherSelfChange === 'boolean' && allowTeacherSelfChange !== cfg.allow_teacher_password_change) {
          cfg.allow_teacher_password_change = allowTeacherSelfChange;
          changes.push(`Teacher self-password change ${allowTeacherSelfChange ? 'enabled' : 'disabled'}`);
        }
        if (changes.length) {
          cfg.updated_at = nowIso();
          audit(db, ROLE_LABELS.super_admin, 'SECURITY_UPDATED', changes.join('; '));
          commit(db);
        }
        return { success: true, allow_teacher_password_change: cfg.allow_teacher_password_change, changes };
      });
    },

    async superArchiveTerm(superPassword, termName) {
      return run(async (db) => {
        await requireSuper(db, superPassword);
        const name = String(termName || '').trim();
        if (!name) throw makeError('Term / event name is required');
        if (name.length > 120) throw makeError('Term name is too long (max 120 characters)');
        const standings = computeStandings(db);
        const winner = standings[0];
        const archive = {
          id: uuid(),
          term_name: name,
          winner_house_id: winner.house_id,
          winner_house_name: winner.house_name,
          standings,
          archived_by: ROLE_LABELS.super_admin,
          archived_at: nowIso(),
        };
        db.term_archives.push(archive);
        db.houses.forEach((row) => {
          row.points = 0;
        });
        db.app_config.freeze_leaderboard = false;
        db.app_config.frozen_snapshot = null;
        db.app_config.updated_at = nowIso();
        audit(
          db,
          ROLE_LABELS.super_admin,
          'TERM_ARCHIVED',
          `Archived "${name}" — champion ${winner.house_name} (${winner.points} pts). Standings: ${standings.map((s) => `${s.house_name} ${s.points}`).join(', ')}. All houses reset to 0.`,
        );
        commit(db);
        return archive;
      });
    },

    async superResetAll(superPassword, confirm) {
      return run(async (db) => {
        await requireSuper(db, superPassword);
        if (confirm !== 'RESET') throw makeError('Type RESET to confirm');
        const deletedLogs = db.point_logs.length;
        const deletedArchives = db.term_archives.length;
        db.point_logs = [];
        db.term_archives = [];
        db.houses.forEach((row) => {
          row.points = 0;
        });
        db.app_config.freeze_leaderboard = false;
        db.app_config.frozen_snapshot = null;
        db.app_config.updated_at = nowIso();
        audit(
          db,
          ROLE_LABELS.super_admin,
          'FULL_RESET',
          `Reset everything: deleted ${deletedLogs} point logs and ${deletedArchives} archived terms; all houses set to 0.`,
        );
        commit(db);
        return { success: true, deleted_logs: deletedLogs, deleted_archives: deletedArchives };
      });
    },

    async teacherChangeOwnPassword(teacherId, oldPassword, newPassword) {
      return run(async (db) => {
        if (!db.app_config.allow_teacher_password_change) {
          throw makeError('Password self-service is currently disabled by the Super Admin');
        }
        const teacher = db.teachers.find((t) => t.id === teacherId);
        if (!teacher || !teacher.active || !(await verifyPassword(oldPassword || '', teacher.password_hash))) {
          throw makeError('Current password is incorrect');
        }
        if (String(newPassword || '').length < MIN_PASSWORD) throw makeError(`New password must be at least ${MIN_PASSWORD} characters`);
        teacher.password_hash = await hashPassword(String(newPassword));
        audit(db, teacher.full_name, 'PASSWORD_CHANGED', `Teacher "${teacher.username}" changed their own password`);
        commit(db, []);
        return { success: true };
      });
    },

    subscribe(onEvent, onStatus) {
      const handle = (payload) => {
        if (!payload) return;
        onEvent({ type: payload.type, table: payload.table, log: payload.log });
      };
      const onStorage = (event) => {
        if (event.key === EVENT_KEY && event.newValue) {
          try {
            handle(JSON.parse(event.newValue));
          } catch {
            /* ignore malformed */
          }
        } else if (event.key === DB_KEY || event.key === null) {
          onEvent({ type: 'change', table: '*' });
        }
      };
      const onLocal = (event) => handle(event.detail);
      window.addEventListener('storage', onStorage);
      window.addEventListener(LOCAL_EVENT, onLocal);
      onStatus?.('local');
      return () => {
        window.removeEventListener('storage', onStorage);
        window.removeEventListener(LOCAL_EVENT, onLocal);
      };
    },
  };

  return api;
}

/* ========================================================================== */

export const storage = MODE === 'supabase' ? createSupabaseBackend() : createLocalBackend();

export function isAuthError(error) {
  return error?.code === 'AUTH_FAILED';
}

/** Ensure a house id from the database maps to known metadata. */
export function knownHouse(id) {
  return Boolean(HOUSE_BY_ID[id]);
}
