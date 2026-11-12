import { HOUSES, getHouse } from './houses.js';
import { CATEGORIES } from './storage.js';

/** Merge live DB rows (points) with static house metadata, in fixed house order. */
export function mergeHouses(rows) {
  const byId = new Map((rows || []).map((row) => [row.id, row]));
  return HOUSES.map((house) => ({ ...house, points: Number(byId.get(house.id)?.points ?? 0) }));
}

/** Sort by points (desc) with fixed-order tiebreak and assign shared ranks for ties. */
export function rankHouses(houses) {
  const sorted = [...houses].sort((a, b) => b.points - a.points || a.sort_order - b.sort_order);
  let lastPoints = null;
  let lastRank = 0;
  return sorted.map((house, index) => {
    const rank = house.points === lastPoints ? lastRank : index + 1;
    lastPoints = house.points;
    lastRank = rank;
    return { ...house, rank };
  });
}

export function formatPoints(value) {
  return Number(value || 0).toLocaleString('en-US');
}

export function signed(value) {
  const n = Number(value || 0);
  return `${n > 0 ? '+' : n < 0 ? '−' : ''}${Math.abs(n).toLocaleString('en-US')}`;
}

export function ordinal(n) {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] || s[v] || s[0]}`;
}

export function formatDateTime(value) {
  if (!value) return '';
  const d = new Date(value);
  return d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

export function formatDate(value) {
  if (!value) return '';
  return new Date(value).toLocaleDateString(undefined, { dateStyle: 'medium' });
}

export function timeAgo(value, now = Date.now()) {
  if (!value) return '';
  const seconds = Math.max(0, Math.round((now - new Date(value).getTime()) / 1000));
  if (seconds < 10) return 'just now';
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d ago`;
  return formatDate(value);
}

/** Totals per house per category: { [houseId]: { Sports, Academics, Spirit, Other, total } } */
export function categoryTotals(logs) {
  const result = Object.fromEntries(
    HOUSES.map((house) => [house.id, { ...Object.fromEntries(CATEGORIES.map((c) => [c, 0])), total: 0 }]),
  );
  for (const log of logs || []) {
    const bucket = result[log.house_id];
    if (!bucket) continue;
    const category = CATEGORIES.includes(log.category) ? log.category : 'Other';
    bucket[category] += Number(log.points) || 0;
    bucket.total += Number(log.points) || 0;
  }
  return result;
}

/* ---------------------------------- CSV ---------------------------------- */

export function csvEscape(value) {
  const s = value === null || value === undefined ? '' : String(value);
  // Neutralise spreadsheet formula injection.
  const safe = /^[=+\-@\t\r]/.test(s) && !/^[+-]?\d+(\.\d+)?$/.test(s) ? `'${s}` : s;
  return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

export function localDateStamp(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function csvDateTime(value) {
  const d = new Date(value);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

export function buildLogsCsv(logs) {
  const header = ['Date/Time', 'House', 'Points', 'Category', 'Reason', 'Awarded By'];
  const rows = [...logs]
    .sort((a, b) => (a.created_at < b.created_at ? -1 : 1))
    .map((log) => [
      csvDateTime(log.created_at),
      log.house_name || getHouse(log.house_id).name,
      log.points,
      log.category,
      log.reason || '',
      log.awarded_by,
    ]);
  return [header, ...rows].map((row) => row.map(csvEscape).join(',')).join('\r\n');
}

export function downloadTextFile(filename, text, mime = 'text/csv;charset=utf-8') {
  const blob = new Blob(['﻿', text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/* ------------------------------ Bulk import ------------------------------ */

function splitCsvLine(line) {
  const out = [];
  let cur = '';
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (quoted) {
      if (ch === '"' && line[i + 1] === '"') {
        cur += '"';
        i += 1;
      } else if (ch === '"') quoted = false;
      else cur += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ',' || ch === '\t') {
      out.push(cur);
      cur = '';
    } else cur += ch;
  }
  out.push(cur);
  return out.map((s) => s.trim());
}

/**
 * Parse pasted "Full Name, username, password" lines.
 * Returns { valid: [{line, full_name, username, password}], errors: [{line, raw, message}] }.
 */
export function parseBulkTeachers(text) {
  const valid = [];
  const errors = [];
  const seen = new Map();
  const lines = String(text || '').split(/\r?\n/);
  lines.forEach((raw, index) => {
    const line = index + 1;
    const trimmed = raw.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const parts = splitCsvLine(trimmed);
    if (line === 1 && /full\s*name/i.test(parts[0] || '') && /user/i.test(parts[1] || '')) return; // header row
    if (parts.length !== 3) {
      errors.push({ line, raw: trimmed, message: `Expected 3 values (Full Name, username, password) but found ${parts.length}` });
      return;
    }
    const [fullName, usernameRaw, password] = parts;
    const username = usernameRaw.toLowerCase();
    if (!fullName) return errors.push({ line, raw: trimmed, message: 'Full name is empty' });
    if (!/^[a-z0-9._-]{3,40}$/.test(username)) {
      return errors.push({ line, raw: trimmed, message: 'Username must be 3–40 characters: letters, numbers, dot, dash or underscore' });
    }
    if (password.length < 6) return errors.push({ line, raw: trimmed, message: 'Password must be at least 6 characters' });
    if (seen.has(username)) {
      return errors.push({ line, raw: trimmed, message: `Duplicate username "${username}" (also on line ${seen.get(username)})` });
    }
    seen.set(username, line);
    valid.push({ line, full_name: fullName, username, password });
  });
  return { valid, errors };
}
