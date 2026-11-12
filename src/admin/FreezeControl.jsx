import { useState } from 'react';
import { Eye, Snowflake } from 'lucide-react';
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
    <section
      className={`overflow-hidden rounded-2xl shadow-sm ring-1 transition ${
        frozen ? 'frozen-stripes bg-gradient-to-r from-indigo-700 via-violet-700 to-fuchsia-700 text-white ring-violet-400' : 'bg-white ring-slate-200'
      }`}
    >
      <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <div className="flex items-start gap-3">
          <span className={`rounded-xl p-2.5 ${frozen ? 'bg-white/15' : 'bg-violet-100 text-violet-700'}`}>
            {frozen ? <Snowflake className="h-6 w-6" /> : <Eye className="h-6 w-6" />}
          </span>
          <div>
            <h2 className={`text-lg font-bold ${frozen ? 'text-white' : 'text-slate-900'}`}>Mystery / Freeze Mode</h2>
            <p className={`text-sm ${frozen ? 'text-white/85' : 'text-slate-500'}`}>
              {frozen
                ? `ON — public screens show scores frozen at ${formatDateTime(frozenAt)}. Points you award now stay hidden until the reveal.`
                : 'OFF — public screens show live scores. Turn on to freeze the public board for a big reveal.'}
            </p>
          </div>
        </div>
        <div className={`shrink-0 rounded-xl px-3 py-2 ${frozen ? 'bg-white/10' : 'bg-slate-50'}`}>
          <Toggle
            id="freeze-toggle"
            size="lg"
            checked={frozen}
            disabled={busy}
            onChange={toggle}
            label={<span className={frozen ? 'text-white' : ''}>{busy ? 'Saving…' : frozen ? 'Frozen' : 'Live'}</span>}
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
