import { useCallback, useState } from 'react';
import { clearSession, loadSession, saveSession } from '../lib/session.js';
import LoginPage from './LoginPage.jsx';
import Dashboard from './Dashboard.jsx';

export default function AdminApp() {
  const [session, setSession] = useState(loadSession);
  const [notice, setNotice] = useState(null);

  const handleLogin = useCallback((next) => {
    saveSession(next);
    setNotice(null);
    setSession(next);
  }, []);

  const handleLogout = useCallback((message) => {
    clearSession();
    setSession(null);
    setNotice(typeof message === 'string' ? message : null);
  }, []);

  const handleSessionUpdate = useCallback((next) => {
    saveSession(next);
    setSession(next);
  }, []);

  if (!session) return <LoginPage onLogin={handleLogin} notice={notice} />;
  return <Dashboard session={session} onLogout={handleLogout} onSessionUpdate={handleSessionUpdate} />;
}
