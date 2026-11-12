import { useState } from 'react';
import { KeyRound, ShieldCheck } from 'lucide-react';
import { storage } from '../lib/storage.js';
import { Alert, PasswordInput, SectionCard, Toggle } from '../components/ui.jsx';

export default function SecurityPanel({ superPassword, allowTeacherPasswordChange, reload, onAuthError }) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [toggleBusy, setToggleBusy] = useState(false);
  const [message, setMessage] = useState(null);
  const [toggleMessage, setToggleMessage] = useState(null);

  const changeGeneral = async (event) => {
    event.preventDefault();
    setMessage(null);
    if (password.length < 6) return setMessage({ tone: 'error', text: 'Password must be at least 6 characters.' });
    if (password !== confirm) return setMessage({ tone: 'error', text: 'Passwords do not match.' });
    setBusy(true);
    try {
      await storage.superUpdateSecurity(superPassword, password, null);
      setPassword('');
      setConfirm('');
      setMessage({ tone: 'success', text: 'General Admin password updated. Anyone logged in with the old password will be signed out on their next action.' });
      reload();
    } catch (err) {
      if (!onAuthError(err)) setMessage({ tone: 'error', text: err.message });
    } finally {
      setBusy(false);
    }
  };

  const toggleSelfChange = async (next) => {
    setToggleBusy(true);
    setToggleMessage(null);
    try {
      await storage.superUpdateSecurity(superPassword, null, next);
      setToggleMessage({ tone: 'success', text: `Teachers ${next ? 'can now' : 'can no longer'} change their own passwords.` });
      reload();
    } catch (err) {
      if (!onAuthError(err)) setToggleMessage({ tone: 'error', text: err.message });
    } finally {
      setToggleBusy(false);
    }
  };

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <SectionCard
        title="Change General Admin Password"
        icon={KeyRound}
        description="The shared password for General Admins (default: sisbhousecolor2026)."
      >
        <form onSubmit={changeGeneral} className="space-y-3">
          <div>
            <label htmlFor="ga-pw" className="label">
              New General Admin password
            </label>
            <PasswordInput id="ga-pw" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <div>
            <label htmlFor="ga-pw2" className="label">
              Confirm new password
            </label>
            <PasswordInput id="ga-pw2" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
          </div>
          {message && <Alert tone={message.tone}>{message.text}</Alert>}
          <button type="submit" className="btn-primary" disabled={busy || !password}>
            {busy ? 'Saving…' : 'Update General Admin password'}
          </button>
        </form>
      </SectionCard>

      <SectionCard title="Teacher Self-Service" icon={ShieldCheck} description="Control whether teachers may change their own passwords.">
        <div className="rounded-xl bg-slate-50 p-4 ring-1 ring-slate-200">
          <Toggle
            id="teacher-self-change"
            checked={allowTeacherPasswordChange}
            disabled={toggleBusy}
            onChange={toggleSelfChange}
            label="Allow teachers to change their own password"
            description='When on, teachers see a "Change My Password" section after logging in.'
          />
        </div>
        {toggleMessage && (
          <Alert tone={toggleMessage.tone} className="mt-3">
            {toggleMessage.text}
          </Alert>
        )}
        <Alert tone="info" className="mt-4">
          The Super Admin password (<code>sisbadmin</code>) is stored as a bcrypt hash in the database and can only be changed from the Supabase SQL
          Editor — see the README.
        </Alert>
      </SectionCard>
    </div>
  );
}
