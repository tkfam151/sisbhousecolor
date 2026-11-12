import { useState } from 'react';
import { Archive, Trophy } from 'lucide-react';
import { HouseEmblem } from '../lib/houses.js';
import { storage } from '../lib/storage.js';
import { formatPoints, ordinal } from '../lib/utils.js';
import { Alert, SectionCard } from '../components/ui.jsx';
import Modal, { ConfirmModal } from '../components/Modal.jsx';
import { ArchiveCard } from '../public/ArchivesDrawer.jsx';

function ResetEverything({ superPassword, onReset, onAuthError }) {
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null);

  const close = () => {
    if (busy) return;
    setOpen(false);
    setTyped('');
  };

  const reset = async () => {
    setBusy(true);
    try {
      const result = await storage.superResetAll(superPassword, typed);
      setMessage({
        tone: 'success',
        text: `Everything has been reset. Deleted ${result.deleted_logs} point log${result.deleted_logs === 1 ? '' : 's'} and ${result.deleted_archives} past term${result.deleted_archives === 1 ? '' : 's'}.`,
      });
      setOpen(false);
      setTyped('');
      onReset();
    } catch (err) {
      if (!onAuthError(err)) setMessage({ tone: 'error', text: err.message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <SectionCard
      className="lg:col-span-2"
      title="Reset Everything"
      description="Deletes all points, every point log and all past terms, and unfreezes the board. Teacher accounts and the audit log are kept. This cannot be undone."
    >
      {message && (
        <Alert tone={message.tone} className="mb-3">
          {message.text}
        </Alert>
      )}
      <button
        type="button"
        className="btn-danger"
        onClick={() => {
          setMessage(null);
          setOpen(true);
        }}
      >
        Reset Everything
      </button>

      <Modal
        open={open}
        onClose={close}
        title="Reset everything?"
        tone="danger"
        labelledBy="reset-title"
        footer={
          <>
            <button type="button" className="btn-secondary" onClick={close} disabled={busy}>
              Cancel
            </button>
            <button type="button" className="btn-danger" onClick={reset} disabled={busy || typed !== 'RESET'}>
              {busy ? 'Resetting…' : 'Reset Everything'}
            </button>
          </>
        }
      >
        <p>
          All five houses go back to <strong>0 points</strong>, and <strong>every point log and every past term</strong> is permanently
          deleted.
        </p>
        <label htmlFor="reset-confirm" className="label mt-4">
          Type <strong className="text-ink">RESET</strong> to confirm
        </label>
        <input
          id="reset-confirm"
          data-autofocus
          className="input"
          autoComplete="off"
          autoCapitalize="characters"
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && typed === 'RESET' && !busy) reset();
          }}
        />
      </Modal>
    </SectionCard>
  );
}

export default function ArchivePanel({ superPassword, ranked, archives, frozen, onArchived, onAuthError }) {
  const [termName, setTermName] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null);
  const leader = ranked[0];

  const start = (event) => {
    event.preventDefault();
    setMessage(null);
    if (!termName.trim()) {
      setMessage({ tone: 'error', text: 'Please enter a term / event name.' });
      return;
    }
    setConfirming(true);
  };

  const archive = async () => {
    setBusy(true);
    try {
      const result = await storage.superArchiveTerm(superPassword, termName.trim());
      setMessage({
        tone: 'success',
        text: `"${result.term_name}" archived — champion: ${result.winner_house_name}. All houses have been reset to 0 for the new term.`,
      });
      setTermName('');
      onArchived();
    } catch (err) {
      if (!onAuthError(err)) setMessage({ tone: 'error', text: err.message });
    } finally {
      setBusy(false);
      setConfirming(false);
    }
  };

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <SectionCard
        title="Archive & Start New Term"
        icon={Archive}
        description="Saves a snapshot of the current standings and champion to Past Terms, then resets all five houses to 0."
      >
        <div className="mb-4 rounded-xl bg-neutral-50 p-3 ring-1 ring-neutral-200">
          <p className="mb-2 text-xs font-medium text-mute">Current standings (live)</p>
          <ol className="space-y-1.5">
            {ranked.map((h) => (
              <li key={h.id} className="flex items-center gap-2 text-sm">
                <span className="w-8 tabular-nums text-neutral-500">{ordinal(h.rank)}</span>
                <HouseEmblem houseId={h.id} size={22} />
                <span className="flex-1 font-semibold" style={{ color: h.text }}>
                  {h.name}
                </span>
                <span className="font-bold tabular-nums">{formatPoints(h.points)}</span>
              </li>
            ))}
          </ol>
        </div>
        <form onSubmit={start} className="space-y-3">
          <div>
            <label htmlFor="term-name" className="label">
              Term / Event Name
            </label>
            <input
              id="term-name"
              className="input"
              placeholder="e.g. Sports Day 2026"
              maxLength={120}
              value={termName}
              onChange={(e) => setTermName(e.target.value)}
            />
          </div>
          {frozen && <Alert tone="warning">Mystery Mode is ON. Archiving will automatically unfreeze the board.</Alert>}
          {message && <Alert tone={message.tone}>{message.text}</Alert>}
          <button type="submit" className="btn-danger" disabled={busy}>
            <Archive className="h-4 w-4" /> Archive & Start New Term
          </button>
        </form>
      </SectionCard>

      <SectionCard title="Past Terms" icon={Trophy} description={`${archives.length} archived term${archives.length === 1 ? '' : 's'}`}>
        {archives.length === 0 ? (
          <p className="rounded-xl bg-neutral-50 p-6 text-center text-sm text-neutral-500">No archived terms yet.</p>
        ) : (
          <div className="max-h-[36rem] space-y-3 overflow-y-auto pr-1">
            {archives.map((a) => (
              <ArchiveCard key={a.id} archive={a} />
            ))}
          </div>
        )}
      </SectionCard>

      <ResetEverything superPassword={superPassword} onReset={onArchived} onAuthError={onAuthError} />

      <ConfirmModal
        open={confirming}
        tone="danger"
        title="Archive this term?"
        confirmLabel="Archive & reset to 0"
        busy={busy}
        onCancel={() => setConfirming(false)}
        onConfirm={archive}
      >
        <p>
          <strong>“{termName.trim()}”</strong> will be saved to Past Terms with{' '}
          <strong style={{ color: leader?.text }}>{leader?.name}</strong> as champion ({formatPoints(leader?.points)} pts).
        </p>
        <p className="mt-2">All five houses will then be reset to <strong>0 points</strong>. This cannot be undone.</p>
      </ConfirmModal>
    </div>
  );
}
