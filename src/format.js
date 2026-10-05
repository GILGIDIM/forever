import { REGION_BY_ID, RULESET_BY_ID, PROFESSION_CAP, LEVEL_CAP } from '../shared/gameData.js';

export const poolLabel = (p) => `${REGION_BY_ID[p.region]?.name ?? p.region} ${RULESET_BY_ID[p.ruleset]?.name ?? p.ruleset}`;

// Red -> amber -> green as a value approaches its cap (your sheet's RAG).
export function ragClass(value, cap) {
  const r = value / cap;
  if (r >= 0.75) return 'rag-g';
  if (r >= 0.3) return 'rag-a';
  return 'rag-r';
}
export const skillRag = (v) => ragClass(v, PROFESSION_CAP);
export const levelRag = (v) => ragClass(v, LEVEL_CAP);

export const fullName = (c) => [c.forename, c.surname].filter(Boolean).join(' ');

export function newId() {
  return crypto.randomUUID ? crypto.randomUUID() : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function timeAgo(iso) {
  if (!iso) return null;
  const s = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.round(s / 60)} min ago`;
  if (s < 86400) return `${Math.round(s / 3600)} h ago`;
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}
