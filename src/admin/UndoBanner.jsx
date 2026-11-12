import { useEffect, useState } from 'react';
import { CheckCircle2, RotateCcw, X } from 'lucide-react';
import { HouseEmblem } from '../lib/houses.js';
import { storage } from '../lib/storage.js';
import { formatPoints } from '../lib/utils.js';

/** Prominent banner with a live 60s countdown to undo the last award. */
export default function UndoBanner({ undo, auth, onDone, onAuthError }) {
  const [now, setNow] = useState(Date.now());
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null);
  const remaining = Math.max(0, Math.ceil((undo.expiresAt - now) / 1000));
  const { house, points } = undo;

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (message) {
      const t = setTimeout(onDone, message.tone === 'success' ? 4000 : 6000);
      return () => clearTimeout(t);
    }
    if (remaining <= 0 && !busy) onDone();
    return undefined;
  }, [remaining, busy, message, onDone]);

  const doUndo = async () => {
    setBusy(true);
    try {
      await storage.undoLastAward(auth, undo.logId);
      setMessage({ tone: 'success', text: `Undone — ${points > 0 ? '+' : '−'}${formatPoints(Math.abs(points))} pts removed from ${house.name}.` });
    } catch (err) {
      if (!onAuthError(err)) setMessage({ tone: 'error', text: err.message });
    } finally {
      setBusy(false);
    }
  };

  const verb = points > 0 ? 'Awarded' : 'Deducted';
  const amount = `${points > 0 ? '+' : '−'}${formatPoints(Math.abs(points))}`;
  const pct = (remaining / 60) * 100;

  return (
    <div className="relative border-t border-black/[0.06] bg-white" role="status" aria-live="polite">
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-2.5">
        <HouseEmblem houseId={house.id} size={36} className="shrink-0" />
        {message ? (
          <p className={`flex-1 text-[15px] font-medium ${message.tone === 'error' ? 'text-[#c4271d]' : 'text-ink'}`}>
            {message.tone === 'success' && <CheckCircle2 className="mr-1 inline h-4 w-4" />}
            {message.text}
          </p>
        ) : (
          <>
            <p className="min-w-0 flex-1 text-[15px] font-medium text-ink">
              {verb} {amount} pts {points > 0 ? 'to' : 'from'} {house.name}
              <span className="text-mute"> —</span>
            </p>
            <button
              type="button"
              onClick={doUndo}
              disabled={busy || remaining <= 0}
              className="btn-primary shrink-0 px-4 py-2"
              data-testid="undo-button"
            >
              <RotateCcw className="h-4 w-4" /> {busy ? 'Undoing…' : `Undo (${remaining}s)`}
            </button>
          </>
        )}
        <button type="button" onClick={onDone} className="shrink-0 rounded-full p-1.5 text-mute hover:bg-black/5 hover:text-ink" aria-label="Dismiss">
          <X className="h-4 w-4" />
        </button>
      </div>
      {!message && (
        <div className="h-0.5 bg-black/[0.04]">
          <div className="h-full transition-[width] duration-300 ease-linear" style={{ width: `${pct}%`, background: house.primary }} />
        </div>
      )}
    </div>
  );
}
