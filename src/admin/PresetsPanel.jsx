import { useState } from 'react';
import { ChevronDown, ChevronUp, Pencil, Plus, Trash2 } from 'lucide-react';
import { CATEGORIES, MAX_ABS_POINTS, storage } from '../lib/storage.js';
import { Alert, SectionCard } from '../components/ui.jsx';
import { ConfirmModal } from '../components/Modal.jsx';

function PresetForm({ initial, submitLabel, busy, onSubmit, onCancel }) {
  const [label, setLabel] = useState(initial?.label || '');
  const [points, setPoints] = useState(initial ? String(initial.points) : '');
  const [category, setCategory] = useState(initial?.category || 'Sports');
  const [error, setError] = useState(null);

  const submit = (event) => {
    event.preventDefault();
    const n = Number(points);
    if (!label.trim()) return setError('Give the preset a name.');
    if (!Number.isInteger(n) || n < 1 || n > MAX_ABS_POINTS) return setError(`Points must be a whole number from 1 to ${MAX_ABS_POINTS}.`);
    setError(null);
    onSubmit({ label: label.trim(), points: n, category });
  };

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-[1fr_7rem_10rem]">
        <div>
          <label className="label" htmlFor={`pl-${initial?.id || 'new'}`}>
            Name
          </label>
          <input
            id={`pl-${initial?.id || 'new'}`}
            className="input"
            maxLength={60}
            placeholder="e.g. Quiz Winner"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
          />
        </div>
        <div>
          <label className="label" htmlFor={`pp-${initial?.id || 'new'}`}>
            Points
          </label>
          <input
            id={`pp-${initial?.id || 'new'}`}
            className="input tabular-nums"
            type="number"
            inputMode="numeric"
            min="1"
            placeholder="10"
            value={points}
            onChange={(e) => setPoints(e.target.value.replace(/[^\d]/g, ''))}
          />
        </div>
        <div>
          <label className="label" htmlFor={`pc-${initial?.id || 'new'}`}>
            Category
          </label>
          <select id={`pc-${initial?.id || 'new'}`} className="input" value={category} onChange={(e) => setCategory(e.target.value)}>
            {CATEGORIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </div>
      </div>
      {error && <Alert tone="error">{error}</Alert>}
      <div className="flex gap-2">
        <button type="submit" className="btn-primary" disabled={busy}>
          {busy ? 'Saving…' : submitLabel}
        </button>
        {onCancel && (
          <button type="button" className="btn-secondary" onClick={onCancel} disabled={busy}>
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}

export default function PresetsPanel({ auth, presets, onChanged, onAuthError }) {
  const [editingId, setEditingId] = useState(null);
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState(false);
  const [toDelete, setToDelete] = useState(null);
  const [message, setMessage] = useState(null);

  const call = async (fn, successText) => {
    setBusy(true);
    setMessage(null);
    try {
      await fn();
      if (successText) setMessage({ tone: 'success', text: successText });
      onChanged?.();
      return true;
    } catch (err) {
      if (!onAuthError(err)) setMessage({ tone: 'error', text: err.message });
      return false;
    } finally {
      setBusy(false);
    }
  };

  return (
    <SectionCard
      title="Award Presets"
      description="One-tap buttons shown to everyone on the Award Points form. Changes appear for all teachers straight away."
      actions={
        !adding && (
          <button type="button" className="btn-primary" onClick={() => { setAdding(true); setEditingId(null); setMessage(null); }}>
            <Plus className="h-4 w-4" /> Add Preset
          </button>
        )
      }
    >
      {message && (
        <Alert tone={message.tone} className="mb-4">
          {message.text}
        </Alert>
      )}

      {adding && (
        <div className="mb-5 rounded-2xl bg-paper p-4">
          <p className="mb-3 text-[15px] font-semibold text-ink">New preset</p>
          <PresetForm
            submitLabel="Add Preset"
            busy={busy}
            onCancel={() => setAdding(false)}
            onSubmit={async (v) => {
              const ok = await call(() => storage.adminSavePreset(auth, null, v.label, v.points, v.category), `Added "${v.label}".`);
              if (ok) setAdding(false);
            }}
          />
        </div>
      )}

      {presets.length === 0 ? (
        <p className="rounded-2xl bg-paper p-6 text-center text-sm text-mute">No presets yet. Add one to give teachers a one-tap shortcut.</p>
      ) : (
        <ul className="divide-y divide-black/[0.06]">
          {presets.map((preset, index) => (
            <li key={preset.id} className="py-3">
              {editingId === preset.id ? (
                <PresetForm
                  initial={preset}
                  submitLabel="Save"
                  busy={busy}
                  onCancel={() => setEditingId(null)}
                  onSubmit={async (v) => {
                    const ok = await call(() => storage.adminSavePreset(auth, preset.id, v.label, v.points, v.category), `Saved "${v.label}".`);
                    if (ok) setEditingId(null);
                  }}
                />
              ) : (
                <div className="flex items-center gap-3">
                  <div className="flex flex-col">
                    <button
                      type="button"
                      className="rounded-full p-1 text-mute hover:bg-black/5 hover:text-ink disabled:opacity-30"
                      disabled={busy || index === 0}
                      onClick={() => call(() => storage.adminMovePreset(auth, preset.id, -1))}
                      aria-label={`Move ${preset.label} up`}
                    >
                      <ChevronUp className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      className="rounded-full p-1 text-mute hover:bg-black/5 hover:text-ink disabled:opacity-30"
                      disabled={busy || index === presets.length - 1}
                      onClick={() => call(() => storage.adminMovePreset(auth, preset.id, 1))}
                      aria-label={`Move ${preset.label} down`}
                    >
                      <ChevronDown className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[17px] font-medium text-ink">{preset.label}</p>
                    <p className="text-[13px] text-mute">
                      +{preset.points} points · {preset.category}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="btn-secondary px-3.5 py-2 text-[13px]"
                    disabled={busy}
                    onClick={() => { setEditingId(preset.id); setAdding(false); setMessage(null); }}
                  >
                    <Pencil className="h-3.5 w-3.5" /> Edit
                  </button>
                  <button
                    type="button"
                    className="rounded-full p-2 text-[#FF3B30] hover:bg-[#FF3B30]/10"
                    disabled={busy}
                    onClick={() => setToDelete(preset)}
                    aria-label={`Delete ${preset.label}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      <ConfirmModal
        open={Boolean(toDelete)}
        tone="danger"
        title="Delete this preset?"
        confirmLabel="Delete"
        busy={busy}
        onCancel={() => setToDelete(null)}
        onConfirm={async () => {
          const p = toDelete;
          await call(() => storage.adminDeletePreset(auth, p.id), `Deleted "${p.label}".`);
          setToDelete(null);
        }}
      >
        {toDelete && (
          <p>
            “{toDelete.label}” (+{toDelete.points} · {toDelete.category}) will be removed from the Award Points form. Points already awarded are not
            affected.
          </p>
        )}
      </ConfirmModal>
    </SectionCard>
  );
}
