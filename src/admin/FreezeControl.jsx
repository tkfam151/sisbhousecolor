import { useState } from 'react';
import { storage } from '../lib/storage.js';
import { formatDateTime } from '../lib/utils.js';
import { Alert, Toggle } from '../components/ui.jsx';

export default function FreezeControl({ auth, frozen, frozenAt, onAuthError, onChanged }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const toggle = async (next) => {
    setBusy(true);
    setError(null);
    try {
      await storage.adminToggleFreeze(auth, next);
      onChanged?.();
    } catch (err) {
      if (!onAuthError(err)) setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className={`card ${frozen ? 'ring-2 ring-[#FF9500]/60' : ''}`}>
      <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <div>
          <h2 className="section-title">Mystery / Freeze Mode</h2>
          <p className={`mt-0.5 text-sm text-mute`}>
            {frozen
              ? `On. Public screens show scores from ${formatDateTime(frozenAt)}. New points stay hidden until you turn this off.`
              : 'Off. Turn on to freeze the public scores before a big reveal.'}
          </p>
        </div>
        <div className="shrink-0">
          <Toggle
            id="freeze-toggle"
            size="lg"
            onClass="bg-[#FF9500]"
            checked={frozen}
            disabled={busy}
            onChange={toggle}
            label={busy ? 'Saving…' : frozen ? 'Frozen' : 'Live'}
          />
        </div>
      </div>
      {error && (
        <div className="px-4 pb-4 sm:px-5">
          <Alert tone="error">{error}</Alert>
        </div>
      )}
    </section>
  );
}
