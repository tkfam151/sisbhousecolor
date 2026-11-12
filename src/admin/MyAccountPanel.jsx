import { useState } from 'react';
import { KeyRound } from 'lucide-react';
import { storage } from '../lib/storage.js';
import { Alert, PasswordInput, SectionCard } from '../components/ui.jsx';

export default function MyAccountPanel({ session, onSessionUpdate }) {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null);

  const submit = async (event) => {
    event.preventDefault();
    setMessage(null);
    if (next.length < 6) return setMessage({ tone: 'error', text: 'New password must be at least 6 characters.' });
    if (next !== confirm) return setMessage({ tone: 'error', text: 'New passwords do not match.' });
    if (next === current) return setMessage({ tone: 'error', text: 'New password must be different from the current one.' });
    setBusy(true);
    try {
      await storage.teacherChangeOwnPassword(session.teacher_id, current, next);
      onSessionUpdate({ ...session, password: next });
      setCurrent('');
      setNext('');
      setConfirm('');
      setMessage({ tone: 'success', text: 'Your password has been changed.' });
    } catch (err) {
      setMessage({ tone: 'error', text: err.message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <SectionCard title="Change My Password" icon={KeyRound} description="Choose a new password for your teacher account." className="max-w-xl">
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label htmlFor="cur-pw" className="label">
            Current password
          </label>
          <PasswordInput id="cur-pw" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} />
        </div>
        <div>
          <label htmlFor="new-pw" className="label">
            New password
          </label>
          <PasswordInput id="new-pw" value={next} onChange={(e) => setNext(e.target.value)} minLength={6} />
        </div>
        <div>
          <label htmlFor="confirm-pw" className="label">
            Confirm new password
          </label>
          <PasswordInput id="confirm-pw" value={confirm} onChange={(e) => setConfirm(e.target.value)} minLength={6} />
        </div>
        {message && <Alert tone={message.tone}>{message.text}</Alert>}
        <button type="submit" className="btn-primary" disabled={busy || !current || !next}>
          {busy ? 'Saving…' : 'Change password'}
        </button>
      </form>
    </SectionCard>
  );
}
