import { useMemo, useState } from 'react';
import { Check, Minus, Plus, Send, Sparkles } from 'lucide-react';
import { HOUSES, HouseEmblem, getHouse } from '../lib/houses.js';
import { CATEGORIES, MAX_ABS_POINTS, storage } from '../lib/storage.js';
import { formatPoints, signed, timeAgo } from '../lib/utils.js';
import { Alert, SectionCard } from '../components/ui.jsx';
import { ConfirmModal } from '../components/Modal.jsx';

export const PRESETS = [
  { label: '1st Place', points: 50, category: 'Sports' },
  { label: '2nd Place', points: 30, category: 'Sports' },
  { label: '3rd Place', points: 20, category: 'Sports' },
  { label: 'Academic Excellence', points: 15, category: 'Academics' },
  { label: 'Sportsmanship', points: 10, category: 'Spirit' },
  { label: 'House Spirit', points: 5, category: 'Spirit' },
];

const LARGE_ENTRY = 999;

export default function AwardPanel({ auth, role, houses, logs, onAwarded, onAuthError }) {
  const isAdmin = role === 'super_admin' || role === 'general_admin';
  const [houseId, setHouseId] = useState('');
  const [direction, setDirection] = useState('award'); // admins can switch to 'deduct'
  const [points, setPoints] = useState('');
  const [category, setCategory] = useState('Spirit');
  const [reason, setReason] = useState('');
  const [activePreset, setActivePreset] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [confirming, setConfirming] = useState(null);

  const house = houseId ? getHouse(houseId) : null;
  const pointsByHouse = useMemo(() => Object.fromEntries(houses.map((h) => [h.id, h.points])), [houses]);
  const myRecent = useMemo(() => logs.slice(0, 6), [logs]);

  const applyPreset = (preset) => {
    setDirection('award');
    setPoints(String(preset.points));
    setCategory(preset.category);
    setReason(preset.label);
    setActivePreset(preset.label);
    setError(null);
  };

  const signedValue = () => {
    const n = Number(points);
    return direction === 'deduct' ? -n : n;
  };

  const validate = () => {
    if (!houseId) return 'Please choose a house.';
    const n = Number(points);
    if (points === '' || !Number.isFinite(n) || !Number.isInteger(n) || n <= 0) return 'Enter a whole number of points greater than 0.';
    if (n > MAX_ABS_POINTS) return `Points must be ${formatPoints(MAX_ABS_POINTS)} or fewer.`;
    if (!CATEGORIES.includes(category)) return 'Choose a category.';
    if (reason.length > 300) return 'Reason must be 300 characters or fewer.';
    return null;
  };

  const submitAward = async (value) => {
    setBusy(true);
    setError(null);
    try {
      const result = await storage.awardPoints(auth, houseId, value, category, reason.trim());
      onAwarded(result, getHouse(houseId), value);
      setPoints('');
      setReason('');
      setActivePreset(null);
      setDirection('award');
    } catch (err) {
      if (!onAuthError(err)) setError(err.message);
    } finally {
      setBusy(false);
      setConfirming(null);
    }
  };

  const onSubmit = (event) => {
    event.preventDefault();
    const problem = validate();
    if (problem) {
      setError(problem);
      return;
    }
    const value = signedValue();
    if (Math.abs(Number(value)) > LARGE_ENTRY) {
      setConfirming(value);
      return;
    }
    submitAward(value);
  };

  const step = (delta) => {
    const n = Math.max(0, (Number(points) || 0) + delta);
    setPoints(n ? String(n) : '');
    setActivePreset(null);
  };

  const preview = Number(points) > 0 && house ? signedValue() : null;

  return (
    <div className="grid gap-5 lg:grid-cols-3">
      <SectionCard
        className="lg:col-span-2"
        title="Award Points"
        icon={Sparkles}
        description={
          isAdmin
            ? 'Admins can also deduct points.'
            : 'Your name is saved with every award.'
        }
      >
        <form onSubmit={onSubmit} className="space-y-5" noValidate>
          <fieldset>
            <legend className="label">1. House</legend>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-5">
              {HOUSES.map((h) => {
                const selected = h.id === houseId;
                return (
                  <button
                    key={h.id}
                    type="button"
                    onClick={() => {
                      setHouseId(h.id);
                      setError(null);
                    }}
                    aria-pressed={selected}
                    className={`relative flex flex-col items-center gap-1 rounded-lg border-2 p-2.5 text-center transition active:scale-[0.98] ${
                      selected ? '' : 'border-stone-200 bg-white hover:border-stone-400'
                    }`}
                    style={selected ? { borderColor: h.primary, background: h.light } : undefined}
                  >
                    {selected && (
                      <span className="absolute right-1.5 top-1.5 rounded-full p-0.5 text-white" style={{ background: h.primary }}>
                        <Check className="h-3 w-3" />
                      </span>
                    )}
                    <HouseEmblem houseId={h.id} size={52} />
                    <span className="text-sm font-bold leading-tight" style={{ color: h.text }}>
                      {h.name}
                    </span>
                    <span className="text-xs tabular-nums text-stone-500">{formatPoints(pointsByHouse[h.id] ?? 0)} pts</span>
                  </button>
                );
              })}
            </div>
          </fieldset>

          <fieldset>
            <legend className="label">2. Quick presets</legend>
            <div className="flex flex-wrap gap-2">
              {PRESETS.map((preset) => {
                const active = activePreset === preset.label;
                return (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => applyPreset(preset)}
                    aria-pressed={active}
                    className={`rounded-md px-3 py-2 text-sm font-semibold ring-1 transition active:scale-95 ${
                      active ? 'bg-navy text-white ring-navy' : 'bg-white text-stone-700 ring-stone-300 hover:bg-stone-50'
                    }`}
                  >
                    {preset.label} (+{preset.points} · {preset.category})
                  </button>
                );
              })}
            </div>
          </fieldset>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="points" className="label">
                3. Points
              </label>
              {isAdmin && (
                <div className="mb-2 inline-flex rounded-md bg-stone-100 p-1 text-sm" role="group" aria-label="Award or deduct">
                  {[
                    ['award', 'Award (+)'],
                    ['deduct', 'Deduct (−)'],
                  ].map(([key, label]) => (
                    <button
                      key={key}
                      type="button"
                      aria-pressed={direction === key}
                      onClick={() => {
                        setDirection(key);
                        setActivePreset(null);
                      }}
                      className={`rounded-lg px-3 py-1.5 font-semibold transition ${
                        direction === key
                          ? key === 'deduct'
                            ? 'bg-red-600 text-white shadow'
                            : 'bg-white text-stone-900 shadow-sm'
                          : 'text-stone-500 hover:text-stone-800'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              )}
              <div className="flex items-stretch gap-2">
                <button type="button" className="btn-secondary px-3" onClick={() => step(-5)} aria-label="Decrease by 5">
                  <Minus className="h-4 w-4" />
                </button>
                <input
                  id="points"
                  className="input text-center text-lg font-bold tabular-nums"
                  type="number"
                  inputMode="numeric"
                  min="1"
                  step="1"
                  placeholder="0"
                  value={points}
                  onChange={(e) => {
                    setPoints(e.target.value.replace(/[^\d]/g, ''));
                    setActivePreset(null);
                  }}
                />
                <button type="button" className="btn-secondary px-3" onClick={() => step(5)} aria-label="Increase by 5">
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </div>

            <fieldset>
              <legend className="label">4. Category</legend>
              <div className="grid grid-cols-2 gap-2">
                {CATEGORIES.map((c) => (
                  <button
                    key={c}
                    type="button"
                    aria-pressed={category === c}
                    onClick={() => setCategory(c)}
                    className={`rounded-md px-3 py-2.5 text-sm font-semibold ring-1 transition ${
                      category === c ? 'bg-navy text-white ring-navy' : 'bg-white text-stone-700 ring-stone-300 hover:bg-stone-50'
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </fieldset>
          </div>

          <div>
            <label htmlFor="reason" className="label">
              5. Reason <span className="font-normal text-stone-400">(optional)</span>
            </label>
            <input
              id="reason"
              className="input"
              maxLength={300}
              placeholder="e.g. Won the relay race"
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                setActivePreset(null);
              }}
            />
          </div>

          {error && <Alert tone="error">{error}</Alert>}

          <button
            type="submit"
            disabled={busy}
            className="btn w-full py-4 text-base text-white disabled:opacity-60"
            style={{ background: house ? (preview < 0 ? '#B91C1C' : house.primary) : '#14213D' }}
          >
            <Send className="h-5 w-5" />
            {busy
              ? 'Saving…'
              : preview !== null
                ? `${preview < 0 ? 'Deduct' : 'Award'} ${signed(preview)} pts ${preview < 0 ? 'from' : 'to'} ${house.name}`
                : 'Award Points'}
          </button>
        </form>
      </SectionCard>

      <SectionCard title="Recent awards" description={auth.role === 'teacher' ? 'Latest points across all houses.' : 'Latest entries on the board.'}>
        {myRecent.length === 0 ? (
          <p className="rounded-md bg-stone-50 p-4 text-center text-sm text-stone-500">Nothing yet this term.</p>
        ) : (
          <ul className="divide-y divide-stone-100">
            {myRecent.map((log) => {
              const h = getHouse(log.house_id);
              return (
                <li key={log.id} className="flex items-center gap-3 py-2">
                  <HouseEmblem houseId={h.id} size={30} className="shrink-0" />
                  <div className="min-w-0 flex-1 text-sm">
                    <p className="truncate">
                      <span className={`font-bold ${log.points < 0 ? 'text-red-700' : ''}`}>{signed(log.points)}</span>{' '}
                      <span style={{ color: h.text }} className="font-semibold">
                        {h.shortName}
                      </span>{' '}
                      <span className="text-stone-500">{log.reason || log.category}</span>
                    </p>
                    <p className="truncate text-xs text-stone-400">
                      {log.awarded_by} · {timeAgo(log.created_at)}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </SectionCard>

      <ConfirmModal
        open={confirming !== null}
        title="Confirm Large Point Entry"
        confirmLabel={`Yes, ${confirming < 0 ? 'Deduct' : 'Award'} ${formatPoints(Math.abs(confirming || 0))} Points`}
        onCancel={() => setConfirming(null)}
        onConfirm={() => submitAward(confirming)}
        busy={busy}
      >
        <p className="text-base">
          You are about to {confirming < 0 ? 'deduct' : 'award'} <strong>{formatPoints(Math.abs(confirming || 0))}</strong> points{' '}
          {confirming < 0 ? 'from' : 'to'} <strong style={{ color: house?.text }}>{house?.name}</strong>. Please confirm this is not a typo.
        </p>
      </ConfirmModal>
    </div>
  );
}
