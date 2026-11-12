import { useMemo } from 'react';
import { HOUSES, HouseEmblem } from '../lib/houses.js';
import { CATEGORIES } from '../lib/storage.js';
import { categoryTotals, formatPoints } from '../lib/utils.js';

// Categories are encoded as opacity steps of each house's own colour, so the
// house identity is never lost; the legend + numeric table carry the exact values.
const CATEGORY_OPACITY = { Sports: 1, Academics: 0.7, Spirit: 0.45, Other: 0.22 };

export default function CategoryBreakdown({ logs }) {
  const totals = useMemo(() => categoryTotals(logs), [logs]);
  const maxPositive = Math.max(
    1,
    ...HOUSES.map((h) => CATEGORIES.reduce((sum, c) => sum + Math.max(0, totals[h.id][c]), 0)),
  );

  return (
    <section className="card p-4 sm:p-5" aria-labelledby="cat-title">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 id="cat-title" className="section-title">
          Points by category
        </h2>
        <ul className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-neutral-600" aria-label="Legend">
          {CATEGORIES.map((c) => (
            <li key={c} className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-sm bg-neutral-700" style={{ opacity: CATEGORY_OPACITY[c] }} aria-hidden="true" />
              {c}
            </li>
          ))}
        </ul>
      </div>

      <div className="space-y-3">
        {HOUSES.map((house) => {
          const row = totals[house.id];
          return (
            <div key={house.id}>
              <div className="mb-1 flex items-center justify-between gap-2 text-sm">
                <span className="flex items-center gap-2 font-semibold" style={{ color: house.text }}>
                  <HouseEmblem houseId={house.id} size={22} /> {house.name}
                </span>
                <span className="font-bold tabular-nums text-neutral-900">{formatPoints(row.total)} pts</span>
              </div>
              <div className="flex h-4 w-full gap-[2px] overflow-hidden rounded-full bg-neutral-100">
                {CATEGORIES.map((c) => {
                  const value = Math.max(0, row[c]);
                  if (!value) return null;
                  return (
                    <div
                      key={c}
                      title={`${house.name} · ${c}: ${formatPoints(row[c])} pts`}
                      className="h-full first:rounded-l-full last:rounded-r-full"
                      style={{ width: `${(value / maxPositive) * 100}%`, background: house.primary, opacity: CATEGORY_OPACITY[c] }}
                    />
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[30rem] text-sm">
          <caption className="sr-only">Points per category for each house</caption>
          <thead>
            <tr className="border-b border-neutral-200 text-left text-xs text-mute">
              <th scope="col" className="py-2 pr-2 font-semibold">House</th>
              {CATEGORIES.map((c) => (
                <th key={c} scope="col" className="px-2 py-2 text-right font-semibold">
                  {c}
                </th>
              ))}
              <th scope="col" className="py-2 pl-2 text-right font-semibold">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {HOUSES.map((house) => (
              <tr key={house.id}>
                <th scope="row" className="py-2 pr-2 text-left font-semibold text-neutral-800">
                  <span className="mr-2 inline-block h-2.5 w-2.5 rounded-full" style={{ background: house.primary }} aria-hidden="true" />
                  {house.shortName}
                </th>
                {CATEGORIES.map((c) => (
                  <td key={c} className="px-2 py-2 text-right tabular-nums text-neutral-700">
                    {formatPoints(totals[house.id][c])}
                  </td>
                ))}
                <td className="py-2 pl-2 text-right font-bold tabular-nums text-neutral-900">{formatPoints(totals[house.id].total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
