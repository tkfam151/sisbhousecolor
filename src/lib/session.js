/**
 * Admin-page session persisted in sessionStorage so a refresh keeps the user
 * logged in (until "Log Out" or the tab is closed). The password is kept so that
 * every RPC can re-verify the caller server-side — nothing is trusted client-side.
 */
const KEY = 'sisb-house-leaderboard:session:v1';

export function loadSession() {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    const session = JSON.parse(raw);
    return session && session.role && session.password ? session : null;
  } catch {
    return null;
  }
}

export function saveSession(session) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(session));
  } catch {
    /* private mode — session simply won't survive a refresh */
  }
}

export function clearSession() {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}

/** Credentials object passed as `p_auth` to the RPCs. */
export function toAuth(session) {
  return { role: session.role, username: session.username || null, password: session.password };
}

export function headerLabel(session) {
  if (session.role === 'super_admin') return 'Super Admin (sisbadmin)';
  if (session.role === 'general_admin') return 'General Admin';
  return session.display_name;
}
