import { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { HOUSES, HouseEmblem } from '../lib/houses.js';
import { storage } from '../lib/storage.js';
import { Alert } from '../components/ui.jsx';
import ModeBadge from '../components/ModeBadge.jsx';

export default function LoginPage({ onLogin, notice }) {
  const [tab, setTab] = useState('teacher');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const switchTab = (next) => {
    setTab(next);
    setError(null);
    setPassword('');
  };

  const submit = async (event) => {
    event.preventDefault();
    setError(null);
    if (tab === 'teacher' && !username.trim()) return setError('Please enter your username.');
    if (!password) return setError('Please enter your password.');
    setBusy(true);
    try {
      const result = await storage.verifyLogin(tab, tab === 'teacher' ? username.trim().toLowerCase() : null, password);
      if (!result?.success) {
        setError(result?.error || 'Login failed.');
        return;
      }
      onLogin({
        role: result.role,
        display_name: result.display_name,
        teacher_id: result.teacher_id || null,
        username: result.role === 'teacher' ? username.trim().toLowerCase() : null,
        password,
        allow_teacher_password_change: Boolean(result.allow_teacher_password_change),
        logged_in_at: new Date().toISOString(),
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-navy px-4 py-8">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center">
        <div className="mb-6 text-center text-white">
          <div className="mb-5 flex justify-center gap-2" aria-hidden="true">
            {HOUSES.map((h) => (
              <HouseEmblem key={h.id} houseId={h.id} size={52} />
            ))}
          </div>
          <h1 className="font-display text-4xl font-extrabold uppercase tracking-wide">Staff Login</h1>
          <p className="mt-1 text-sm text-white/60">SISB House Points</p>
        </div>

        <div className="card overflow-hidden">
          <div className="grid grid-cols-2 border-b border-stone-200" role="tablist" aria-label="Login type">
            {[
              ['teacher', 'Teacher Login'],
              ['admin', 'Admin Login'],
            ].map(([key, label]) => (
              <button
                key={key}
                type="button"
                role="tab"
                id={`tab-${key}`}
                aria-selected={tab === key}
                aria-controls="login-panel"
                onClick={() => switchTab(key)}
                className={`flex items-center justify-center gap-2 px-4 py-3.5 text-sm font-semibold transition ${
                  tab === key ? 'border-b-2 border-navy bg-white text-navy' : 'bg-stone-50 text-stone-500 hover:text-stone-800'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <form id="login-panel" role="tabpanel" aria-labelledby={`tab-${tab}`} onSubmit={submit} className="space-y-4 p-5 sm:p-6">
            {notice && <Alert tone="warning">{notice}</Alert>}
            {tab === 'teacher' ? (
              <div>
                <label htmlFor="username" className="label">
                  Username
                </label>
                <input
                  id="username"
                  className="input"
                  autoComplete="username"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. tonkla"
                  autoFocus
                />
              </div>
            ) : (
              <p className="text-sm text-stone-500">
                Enter the Super Admin or General Admin password.
              </p>
            )}
            <div>
              <label htmlFor="password" className="label">
                Password
              </label>
              <input
                id="password"
                type="password"
                className="input"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoFocus={tab === 'admin'}
              />
            </div>
            {error && <Alert tone="error">{error}</Alert>}
            <button type="submit" className="btn-primary w-full py-3 text-base" disabled={busy}>
              {busy ? 'Checking…' : tab === 'teacher' ? 'Log in as Teacher' : 'Log in as Admin'}
            </button>
          </form>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <a href="../" className="inline-flex items-center gap-1.5 text-sm font-medium text-white/70 hover:text-white">
            <ArrowLeft className="h-4 w-4" /> Back to leaderboard
          </a>
          <ModeBadge dark />
        </div>
      </div>
    </div>
  );
}
