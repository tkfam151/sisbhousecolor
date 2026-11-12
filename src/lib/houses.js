import { createElement as h, useId } from 'react';

/**
 * The five SISB houses in fixed metadata order.
 * `sort_order` mirrors the `houses.sort_order` column in Supabase.
 */
export const HOUSES = [
  {
    id: 'red-leopards',
    name: 'Red Leopards',
    shortName: 'Leopards',
    animal: 'leopard',
    sort_order: 1,
    primary: '#DC2626',
    light: '#FEF2F2',
    border: '#FCA5A5',
    dark: '#7F1D1D',
    text: '#991B1B',
    marker: 'circle',
    dash: '',
  },
  {
    id: 'orange-tigers',
    name: 'Orange Tigers',
    shortName: 'Tigers',
    animal: 'tiger',
    sort_order: 2,
    primary: '#EA580C',
    light: '#FFF7ED',
    border: '#FDBA74',
    dark: '#7C2D12',
    text: '#9A3412',
    marker: 'square',
    dash: '8 4',
  },
  {
    id: 'yellow-cheetahs',
    name: 'Yellow Cheetahs',
    shortName: 'Cheetahs',
    animal: 'cheetah',
    sort_order: 3,
    primary: '#CA8A04',
    accent: '#EAB308',
    light: '#FEFCE8',
    border: '#FDE047',
    dark: '#713F12',
    text: '#854D0E',
    marker: 'triangle',
    dash: '2 4',
  },
  {
    id: 'green-panthers',
    name: 'Green Panthers',
    shortName: 'Panthers',
    animal: 'panther',
    sort_order: 4,
    primary: '#16A34A',
    light: '#F0FDF4',
    border: '#86EFAC',
    dark: '#14532D',
    text: '#166534',
    marker: 'diamond',
    dash: '12 4 2 4',
  },
  {
    id: 'blue-lynxes',
    name: 'Blue Lynxes',
    shortName: 'Lynxes',
    animal: 'lynx',
    sort_order: 5,
    primary: '#2563EB',
    light: '#EFF6FF',
    border: '#93C5FD',
    dark: '#1E3A8A',
    text: '#1E40AF',
    marker: 'cross',
    dash: '6 3 1 3',
  },
];

export const HOUSE_IDS = HOUSES.map((house) => house.id);

export const HOUSE_BY_ID = Object.fromEntries(HOUSES.map((house) => [house.id, house]));

/** Returns metadata for a house id, or a neutral placeholder for unknown ids. */
export function getHouse(id) {
  return (
    HOUSE_BY_ID[id] || {
      id,
      name: id || 'Unknown House',
      shortName: id || 'Unknown',
      animal: 'leopard',
      sort_order: 99,
      primary: '#64748B',
      light: '#F8FAFC',
      border: '#CBD5E1',
      dark: '#1E293B',
      text: '#334155',
      marker: 'circle',
      dash: '',
    }
  );
}

/** Second colour used for confetti / gradients. */
export function houseAccent(house) {
  return house.accent || house.border;
}

/* -------------------------------------------------------------------------- */
/*  Inline SVG big-cat emblems                                                 */
/* -------------------------------------------------------------------------- */

// Per-animal palette for the face itself (badge background uses house colours).
const FACE = {
  leopard: { head: '#FFFFFF', muzzle: '#FEE2E2', ear: '#FECACA', mark: '#7F1D1D', eye: '#FBBF24', nose: '#1F2937' },
  tiger: { head: '#FB923C', muzzle: '#FFFFFF', ear: '#FED7AA', mark: '#1C1917', eye: '#FDE047', nose: '#1C1917' },
  cheetah: { head: '#FACC15', muzzle: '#FFFBEB', ear: '#FEF08A', mark: '#1C1917', eye: '#F59E0B', nose: '#1C1917' },
  panther: { head: '#0B2A17', muzzle: '#14532D', ear: '#166534', mark: '#052E16', eye: '#4ADE80', nose: '#020617' },
  lynx: { head: '#FFFFFF', muzzle: '#DBEAFE', ear: '#BFDBFE', mark: '#1E3A8A', eye: '#38BDF8', nose: '#1E293B' },
};

const HEAD_PATH =
  'M50 24 C66 24 80 32 82 48 C84 62 74 76 62 84 Q50 90 38 84 C26 76 16 62 18 48 C20 32 34 24 50 24Z';
const MUZZLE_PATH = 'M36 58 Q50 50 64 58 Q68 72 50 82 Q32 72 36 58Z';

function mirror(d, key, props) {
  return [
    h('path', { key: `${key}-l`, d, ...props }),
    h('path', { key: `${key}-r`, d, transform: 'translate(100 0) scale(-1 1)', ...props }),
  ];
}

function ears(face, animal, houseDark) {
  const outer = animal === 'lynx' ? 'M20 42 L25 8 L44 28Z' : 'M20 42 L26 14 L44 28Z';
  const inner = animal === 'lynx' ? 'M25 36 L27 16 L38 29Z' : 'M25 36 L28 21 L38 29Z';
  const parts = [
    ...mirror(outer, 'ear-o', { fill: face.head, stroke: houseDark, strokeWidth: 2, strokeLinejoin: 'round' }),
    ...mirror(inner, 'ear-i', { fill: face.ear }),
  ];
  if (animal === 'lynx') {
    parts.push(
      ...mirror('M25 9 L22 0 M25 9 L27 1', 'tuft', {
        stroke: face.mark,
        strokeWidth: 2.4,
        strokeLinecap: 'round',
        fill: 'none',
      }),
    );
  }
  return parts;
}

function ruff(face, houseDark) {
  // Lynx cheek ruff — jagged fur behind the jaw.
  return mirror('M22 56 L8 60 L19 64 L9 72 L23 72 L17 82 L31 78 L30 86 L40 82Z', 'ruff', {
    fill: face.head,
    stroke: houseDark,
    strokeWidth: 2,
    strokeLinejoin: 'round',
  });
}

function eyes(face) {
  return [
    // fierce brow ridge
    ...mirror('M24 42 L45 46 L44 49 L25 46Z', 'brow', { fill: face.mark, opacity: 0.85 }),
    ...mirror('M27 50 Q35 45 44 50 Q36 55 27 50Z', 'eye', { fill: face.eye, stroke: '#0F172A', strokeWidth: 1.4 }),
    ...mirror('M35.5 46.8 L37 50 L35.5 53.2 L34 50Z', 'pupil', { fill: '#0F172A' }),
  ];
}

function noseAndMouth(face, animal) {
  const parts = [
    h('path', { key: 'nose', d: 'M44 58 L56 58 Q56 62 50 66 Q44 62 44 58Z', fill: face.nose }),
    h('path', {
      key: 'mouth',
      d: 'M50 66 L50 70 M41 70 Q46 75 50 70 Q54 75 59 70',
      stroke: animal === 'panther' ? '#4ADE80' : face.nose,
      strokeWidth: 2,
      strokeLinecap: 'round',
      fill: 'none',
    }),
  ];
  if (animal === 'panther') {
    // Sabre fangs
    parts.push(
      h('path', { key: 'fang-l', d: 'M42 70 L45.5 90 L48.5 71Z', fill: '#F8FAFC', stroke: '#052E16', strokeWidth: 1 }),
      h('path', { key: 'fang-r', d: 'M51.5 71 L54.5 90 L58 70Z', fill: '#F8FAFC', stroke: '#052E16', strokeWidth: 1 }),
    );
  } else {
    parts.push(
      ...mirror('M43 70 L44.5 76 L46 71Z', 'fang', { fill: '#FFFFFF', stroke: face.nose, strokeWidth: 0.8 }),
    );
  }
  // whisker dots
  parts.push(
    ...[0, 1, 2].flatMap((i) =>
      mirror(`M${39 - i * 3} ${63 + i * 2.5} m-1 0 a1 1 0 1 0 2 0 a1 1 0 1 0 -2 0`, `wd${i}`, {
        fill: animal === 'panther' ? '#86EFAC' : face.nose,
        opacity: 0.7,
      }),
    ),
  );
  return parts;
}

function markings(face, animal) {
  const m = face.mark;
  switch (animal) {
    case 'leopard': {
      const rosettes = [
        [50, 32, 3.2],
        [41, 36, 2.6],
        [59, 36, 2.6],
        [26, 58, 2.6],
        [74, 58, 2.6],
        [29, 67, 2.2],
        [71, 67, 2.2],
        [24, 50, 2],
        [76, 50, 2],
      ];
      return rosettes.map(([cx, cy, r], i) =>
        h('circle', {
          key: `ros${i}`,
          cx,
          cy,
          r,
          fill: 'none',
          stroke: m,
          strokeWidth: 1.8,
          strokeDasharray: `${r * 1.6} ${r * 0.9}`,
        }),
      );
    }
    case 'tiger':
      return [
        h('path', { key: 'fore', d: 'M50 25 L45 38 L50 35 L55 38Z', fill: m }),
        ...mirror('M40 28 L43 38 L37 31Z', 'fs', { fill: m }),
        ...mirror('M18 45 L33 48 L20 51Z', 's1', { fill: m }),
        ...mirror('M19 56 L32 57 L22 61Z', 's2', { fill: m }),
        ...mirror('M24 66 L35 64 L28 70Z', 's3', { fill: m }),
      ];
    case 'cheetah':
      return [
        ...mirror('M30 52 Q33 63 40 72', 'tear', { stroke: m, strokeWidth: 3, strokeLinecap: 'round', fill: 'none' }),
        ...[
          [44, 32],
          [50, 30],
          [56, 32],
          [47, 37],
          [53, 37],
          [24, 46],
          [22, 58],
          [26, 66],
        ].flatMap(([x, y], i) => [
          h('circle', { key: `sp${i}l`, cx: x, cy: y, r: 1.6, fill: m }),
          h('circle', { key: `sp${i}r`, cx: 100 - x, cy: y, r: 1.6, fill: m }),
        ]),
      ];
    case 'panther':
      return [
        h('path', {
          key: 'sheen',
          d: 'M36 30 Q50 25 64 30',
          stroke: '#22C55E',
          strokeWidth: 2,
          strokeLinecap: 'round',
          fill: 'none',
          opacity: 0.8,
        }),
      ];
    case 'lynx':
      return [
        ...mirror('M44 28 L46 38', 'ls1', { stroke: m, strokeWidth: 2, strokeLinecap: 'round' }),
        h('path', { key: 'ls0', d: 'M50 26 L50 37', stroke: m, strokeWidth: 2, strokeLinecap: 'round' }),
        ...mirror('M26 55 L33 57 M27 61 L34 61', 'ls2', { stroke: m, strokeWidth: 1.8, strokeLinecap: 'round' }),
      ];
    default:
      return [];
  }
}

/**
 * Sharp inline SVG big-cat badge for a house.
 *
 * @param {{ houseId: string, size?: number|string, className?: string, title?: string, plain?: boolean }} props
 */
export function HouseEmblem({ houseId, size = 48, className = '', title, plain = false }) {
  const house = getHouse(houseId);
  const face = FACE[house.animal] || FACE.leopard;
  const uid = useId().replace(/:/g, '');
  const gradId = `hb-${uid}`;
  const shineId = `hs-${uid}`;
  const label = title || `${house.name} emblem`;

  const children = [];
  children.push(h('title', { key: 'title' }, label));
  children.push(
    h(
      'defs',
      { key: 'defs' },
      h(
        'linearGradient',
        { id: gradId, x1: '0', y1: '0', x2: '1', y2: '1' },
        h('stop', { offset: '0%', stopColor: house.accent || house.primary }),
        h('stop', { offset: '100%', stopColor: house.dark }),
      ),
      h(
        'radialGradient',
        { id: shineId, cx: '30%', cy: '20%', r: '70%' },
        h('stop', { offset: '0%', stopColor: '#FFFFFF', stopOpacity: 0.45 }),
        h('stop', { offset: '100%', stopColor: '#FFFFFF', stopOpacity: 0 }),
      ),
    ),
  );
  if (!plain) {
    children.push(
      h('circle', { key: 'badge', cx: 50, cy: 50, r: 49, fill: `url(#${gradId})` }),
      h('circle', { key: 'shine', cx: 50, cy: 50, r: 49, fill: `url(#${shineId})` }),
      h('circle', {
        key: 'ring',
        cx: 50,
        cy: 50,
        r: 45.5,
        fill: 'none',
        stroke: '#FFFFFF',
        strokeOpacity: 0.55,
        strokeWidth: 1.5,
      }),
    );
  }
  const g = [];
  if (house.animal === 'lynx') g.push(...ruff(face, house.dark));
  g.push(...ears(face, house.animal, house.dark));
  g.push(
    h('path', {
      key: 'head',
      d: HEAD_PATH,
      fill: face.head,
      stroke: house.animal === 'panther' ? '#22C55E' : house.dark,
      strokeWidth: 2.2,
      strokeLinejoin: 'round',
    }),
  );
  g.push(h('path', { key: 'muzzle', d: MUZZLE_PATH, fill: face.muzzle }));
  g.push(...markings(face, house.animal));
  g.push(...eyes(face));
  g.push(...noseAndMouth(face, house.animal));
  children.push(h('g', { key: 'face', transform: plain ? undefined : 'translate(6 5) scale(0.88)' }, ...g));

  return h(
    'svg',
    {
      viewBox: '0 0 100 100',
      width: size,
      height: size,
      role: 'img',
      'aria-label': label,
      className,
      xmlns: 'http://www.w3.org/2000/svg',
    },
    ...children,
  );
}
