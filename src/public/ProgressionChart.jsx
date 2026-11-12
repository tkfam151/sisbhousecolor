import { useEffect, useMemo, useRef, useState } from 'react';
import { HOUSES } from '../lib/houses.js';
import { formatPoints, signed } from '../lib/utils.js';

const MAX_DAYS = 21;
const MAX_ENTRIES = 40;
const DAY_MS = 86_400_000;

function dayKey(date) {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Build cumulative series: { labels: string[], details: (string|null)[], values: { [houseId]: number[] } } */
function buildSeries(logs, mode) {
  const asc = [...logs].sort((a, b) => (a.created_at < b.created_at ? -1 : a.created_at > b.created_at ? 1 : 0));
  const totals = Object.fromEntries(HOUSES.map((h) => [h.id, 0]));
  const values = Object.fromEntries(HOUSES.map((h) => [h.id, []]));
  const labels = [];
  const details = [];
  const pushPoint = (label, detail) => {
    labels.push(label);
    details.push(detail);
    HOUSES.forEach((h) => values[h.id].push(totals[h.id]));
  };
  const apply = (log) => {
    if (log.house_id in totals) totals[log.house_id] += Number(log.points) || 0;
  };

  if (asc.length === 0) return { labels, details, values };

  if (mode === 'entries') {
    const windowStart = Math.max(0, asc.length - MAX_ENTRIES);
    asc.slice(0, windowStart).forEach(apply);
    pushPoint(windowStart === 0 ? 'Start' : `#${windowStart}`, windowStart === 0 ? 'Start of term' : `Before entry #${windowStart + 1}`);
    asc.slice(windowStart).forEach((log, i) => {
      apply(log);
      const n = windowStart + i + 1;
      pushPoint(`#${n}`, `#${n}: ${signed(log.points)} ${log.house_name}${log.reason ? ` — ${log.reason}` : ''}`);
    });
    return { labels, details, values };
  }

  // By day: from the first activity day (or MAX_DAYS ago) through today.
  const today = startOfDay(new Date());
  const firstDay = startOfDay(asc[0].created_at);
  const windowStartDay = new Date(Math.max(firstDay.getTime(), today.getTime() - (MAX_DAYS - 1) * DAY_MS));
  const byDay = new Map();
  for (const log of asc) {
    if (new Date(log.created_at) < windowStartDay) apply(log);
    else {
      const key = dayKey(log.created_at);
      if (!byDay.has(key)) byDay.set(key, []);
      byDay.get(key).push(log);
    }
  }
  pushPoint('Start', windowStartDay.getTime() === firstDay.getTime() ? 'Start of term' : 'Earlier');
  for (let t = windowStartDay.getTime(); t <= today.getTime(); t += DAY_MS) {
    const d = startOfDay(new Date(t + DAY_MS / 2)); // DST-safe
    const key = dayKey(d);
    (byDay.get(key) || []).forEach(apply);
    pushPoint(
      d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      d.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' }),
    );
  }
  return { labels, details, values };
}

function niceTicks(min, max, count = 5) {
  if (min === max) {
    max = min + 10;
  }
  const span = max - min;
  const rough = span / count;
  const mag = 10 ** Math.floor(Math.log10(rough));
  const norm = rough / mag;
  const step = (norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 2.5 ? 2.5 : norm <= 5 ? 5 : 10) * mag;
  const lo = Math.floor(min / step) * step;
  const hi = Math.ceil(max / step) * step;
  const ticks = [];
  for (let v = lo; v <= hi + step / 2; v += step) ticks.push(Math.round(v * 100) / 100);
  return { lo, hi, ticks };
}

function Marker({ shape, x, y, color }) {
  const s = 5;
  const common = { fill: color, stroke: '#FFFFFF', strokeWidth: 2 };
  switch (shape) {
    case 'square':
      return <rect x={x - s} y={y - s} width={s * 2} height={s * 2} rx={1.5} {...common} />;
    case 'triangle':
      return <path d={`M${x} ${y - s - 1} L${x + s + 1} ${y + s} L${x - s - 1} ${y + s} Z`} {...common} />;
    case 'diamond':
      return <path d={`M${x} ${y - s - 1.5} L${x + s + 1.5} ${y} L${x} ${y + s + 1.5} L${x - s - 1.5} ${y} Z`} {...common} />;
    case 'cross':
      return (
        <path
          d={`M${x - 2} ${y - 6} h4 v4 h4 v4 h-4 v4 h-4 v-4 h-4 v-4 h4 Z`}
          {...common}
          strokeWidth={1.5}
        />
      );
    default:
      return <circle cx={x} cy={y} r={s} {...common} />;
  }
}

function useWidth() {
  const ref = useRef(null);
  const [width, setWidth] = useState(640);
  useEffect(() => {
    if (!ref.current) return undefined;
    const ro = new ResizeObserver(([entry]) => setWidth(Math.max(280, Math.floor(entry.contentRect.width))));
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);
  return [ref, width];
}

export default function ProgressionChart({ logs }) {
  const [mode, setMode] = useState('days');
  const [hover, setHover] = useState(null);
  const [wrapRef, width] = useWidth();
  const data = useMemo(() => buildSeries(logs, mode), [logs, mode]);

  const height = width < 480 ? 240 : 300;
  const margin = { top: 16, right: width < 480 ? 70 : 96, bottom: 30, left: 48 };
  const innerW = width - margin.left - margin.right;
  const innerH = height - margin.top - margin.bottom;
  const n = data.labels.length;

  const all = HOUSES.flatMap((h) => data.values[h.id]);
  const { lo, hi, ticks } = niceTicks(Math.min(0, ...all), Math.max(0, ...all));
  const x = (i) => margin.left + (n <= 1 ? innerW / 2 : (i / (n - 1)) * innerW);
  const y = (v) => margin.top + innerH - ((v - lo) / (hi - lo || 1)) * innerH;

  // Direct end labels with simple collision avoidance.
  const endLabels = useMemo(() => {
    if (n === 0) return [];
    const items = HOUSES.map((h) => ({ house: h, value: data.values[h.id][n - 1], y: y(data.values[h.id][n - 1]) })).sort(
      (a, b) => a.y - b.y,
    );
    const gap = 15;
    const top = margin.top;
    const bottom = margin.top + innerH + 4;
    // push down, clamp to the bottom, push back up, clamp to the top
    for (let i = 1; i < items.length; i += 1) {
      if (items[i].y - items[i - 1].y < gap) items[i].y = items[i - 1].y + gap;
    }
    if (items.length && items[items.length - 1].y > bottom) items[items.length - 1].y = bottom;
    for (let i = items.length - 2; i >= 0; i -= 1) {
      if (items[i + 1].y - items[i].y < gap) items[i].y = items[i + 1].y - gap;
    }
    if (items.length && items[0].y < top) {
      const shift = top - items[0].y;
      items.forEach((it) => (it.y += shift));
    }
    return items;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, n, lo, hi, innerH]);

  const labelEvery = Math.max(1, Math.ceil(n / Math.max(2, Math.floor(innerW / 64))));

  const onMove = (event) => {
    if (n === 0) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const px = event.clientX - rect.left;
    const i = n <= 1 ? 0 : Math.round(((px - margin.left) / innerW) * (n - 1));
    setHover(Math.min(n - 1, Math.max(0, i)));
  };

  const hoverItems =
    hover === null
      ? []
      : HOUSES.map((h) => ({ house: h, value: data.values[h.id][hover] })).sort((a, b) => b.value - a.value);

  return (
    <section className="card p-4 sm:p-5" aria-labelledby="chart-title">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 id="chart-title" className="section-title">
          Points over time
        </h2>
        <div className="inline-flex rounded-xl bg-neutral-100 p-1 text-sm" role="group" aria-label="Chart range">
          {[
            ['days', `By day`],
            ['entries', `Last ${MAX_ENTRIES} awards`],
          ].map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setMode(key)}
              aria-pressed={mode === key}
              className={`rounded-lg px-3 py-1.5 font-semibold transition ${
                mode === key ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-800'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <ul className="mb-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-neutral-600" aria-label="Legend">
        {HOUSES.map((h) => (
          <li key={h.id} className="flex items-center gap-1.5">
            <svg width="26" height="12" aria-hidden="true">
              <line x1="1" y1="6" x2="25" y2="6" stroke={h.primary} strokeWidth="2" strokeDasharray={h.dash || undefined} />
              <Marker shape={h.marker} x={13} y={6} color={h.primary} />
            </svg>
            {h.name}
          </li>
        ))}
      </ul>

      <div ref={wrapRef} className="relative w-full">
        {n === 0 ? (
          <div className="flex h-60 items-center justify-center rounded-xl bg-neutral-50 text-sm text-neutral-500">
            The chart will appear once points are awarded this term.
          </div>
        ) : (
          <>
            <svg
              width={width}
              height={height}
              className="block touch-none select-none"
              role="img"
              aria-label="Cumulative points per house over time"
              onPointerMove={onMove}
              onPointerDown={onMove}
              onPointerLeave={() => setHover(null)}
            >
              {ticks.map((t) => (
                <g key={t}>
                  <line x1={margin.left} x2={margin.left + innerW} y1={y(t)} y2={y(t)} stroke={t === 0 ? '#94A3B8' : '#E2E8F0'} strokeWidth={1} />
                  <text x={margin.left - 8} y={y(t)} dy="0.32em" textAnchor="end" className="fill-neutral-500 text-[11px] tabular-nums">
                    {formatPoints(t)}
                  </text>
                </g>
              ))}
              {data.labels.map((label, i) =>
                i % labelEvery === 0 || i === n - 1 ? (
                  <text key={`x${i}`} x={x(i)} y={height - 8} textAnchor="middle" className="fill-neutral-500 text-[11px]">
                    {label}
                  </text>
                ) : null,
              )}
              {hover !== null && (
                <line x1={x(hover)} x2={x(hover)} y1={margin.top} y2={margin.top + innerH} stroke="#64748B" strokeWidth={1} strokeDasharray="3 3" />
              )}
              {HOUSES.map((h) => {
                const vals = data.values[h.id];
                const d = vals.map((v, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(' ');
                return (
                  <g key={h.id}>
                    <path d={d} fill="none" stroke="#FFFFFF" strokeWidth={4} strokeLinejoin="round" strokeLinecap="round" />
                    <path
                      d={d}
                      fill="none"
                      stroke={h.primary}
                      strokeWidth={2}
                      strokeDasharray={h.dash || undefined}
                      strokeLinejoin="round"
                      strokeLinecap="round"
                    />
                    <Marker shape={h.marker} x={x(n - 1)} y={y(vals[n - 1])} color={h.primary} />
                    {hover !== null && <Marker shape={h.marker} x={x(hover)} y={y(vals[hover])} color={h.primary} />}
                  </g>
                );
              })}
              {endLabels.map((it) => (
                <text key={it.house.id} x={x(n - 1) + 10} y={it.y} dy="0.32em" className="fill-neutral-700 text-[11px] font-semibold">
                  {width < 480 ? it.house.shortName.slice(0, 4) : it.house.shortName} {formatPoints(it.value)}
                </text>
              ))}
            </svg>

            {hover !== null && (
              <div
                className="pointer-events-none absolute top-2 z-10 w-56 rounded-xl bg-white/95 p-3 text-xs shadow-xl ring-1 ring-neutral-200 backdrop-blur"
                style={{
                  left: Math.min(Math.max(8, x(hover) + 12), width - 232),
                }}
              >
                <p className="mb-1.5 font-semibold text-neutral-900">{data.details[hover] || data.labels[hover]}</p>
                <ul className="space-y-1">
                  {hoverItems.map(({ house, value }) => (
                    <li key={house.id} className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-1.5 text-neutral-700">
                        <svg width="12" height="12" aria-hidden="true">
                          <Marker shape={house.marker} x={6} y={6} color={house.primary} />
                        </svg>
                        {house.shortName}
                      </span>
                      <span className="font-semibold tabular-nums text-neutral-900">{formatPoints(value)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}
