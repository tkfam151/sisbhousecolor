import { createElement as h } from 'react';
import redLeopards from '../assets/emblems/red-leopards.png';
import orangeTigers from '../assets/emblems/orange-tigers.png';
import yellowCheetahs from '../assets/emblems/yellow-cheetahs.png';
import greenPanthers from '../assets/emblems/green-panthers.png';
import blueLynxes from '../assets/emblems/blue-lynxes.png';

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
/*  House emblems (the school's official mascot artwork)                       */
/* -------------------------------------------------------------------------- */

const EMBLEM_SRC = {
  'red-leopards': redLeopards,
  'orange-tigers': orangeTigers,
  'yellow-cheetahs': yellowCheetahs,
  'green-panthers': greenPanthers,
  'blue-lynxes': blueLynxes,
};

/**
 * Round badge showing a house's mascot.
 *
 * @param {{ houseId: string, size?: number, className?: string, title?: string }} props
 */
export function HouseEmblem({ houseId, size = 48, className = '', title }) {
  const house = getHouse(houseId);
  const src = EMBLEM_SRC[house.id];
  const label = title || `${house.name} emblem`;
  if (!src) {
    return h('span', {
      role: 'img',
      'aria-label': label,
      className: `inline-block aspect-square shrink-0 rounded-full ${className}`,
      style: { width: size, height: size, background: house.primary },
    });
  }
  return h('img', {
    src,
    alt: label,
    width: size,
    height: size,
    draggable: false,
    decoding: 'async',
    className: `inline-block aspect-square shrink-0 select-none rounded-full object-contain ${className}`,
  });
}
