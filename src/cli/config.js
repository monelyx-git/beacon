import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { parseLocales } from './locales.js';

/** @typedef {{site: string, title: string, accent: string, logo?: string, favicon?: string, locales?: string[], collapsibleSidebar?: true, editUrl?: string}} BeaconConfig */

export const DEFAULT_ACCENT = '#d2441c';
// Theme backgrounds from the vendored Pier tokens (light, dark).
const BACKGROUNDS = ['#f3f5f4', '#0b151c'];
const MIN_CONTRAST = 3;
const FILES = ['beacon.config.js', 'beacon.config.mjs', 'beacon.config.json'];

function luminance(hex) {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

async function readRaw(root) {
  const file = FILES.find((f) => existsSync(join(root, f)));
  if (!file) throw new Error(`beacon.config: no beacon.config.(js|mjs|json) found in ${root}`);
  const path = join(root, file);
  if (file.endsWith('.json')) return JSON.parse(await readFile(path, 'utf8'));
  return (await import(pathToFileURL(path).href)).default;
}

/** @param {string} root @returns {Promise<BeaconConfig>} */
export async function loadConfig(root) {
  const raw = (await readRaw(root)) ?? {};
  if (!raw.site) throw new Error('beacon.config: "site" is required');
  let url;
  try { url = new URL(raw.site); } catch { /* handled below */ }
  if (!url || !/^https?:$/.test(url.protocol)) throw new Error('beacon.config: "site" must be an absolute http(s) URL');

  const accent = (raw.accent ?? DEFAULT_ACCENT).toLowerCase();
  if (!/^#[0-9a-f]{6}$/.test(accent)) throw new Error('beacon.config: "accent" must be a #rrggbb color');
  const low = BACKGROUNDS.find((bg) => contrast(accent, bg) < MIN_CONTRAST);
  if (low) throw new Error(`beacon.config: "accent" ${accent} has contrast below ${MIN_CONTRAST}:1 against ${low}`);

  const locales = raw.locales === undefined ? undefined : parseLocales(raw.locales);

  if (raw.collapsibleSidebar !== undefined && typeof raw.collapsibleSidebar !== 'boolean') throw new Error('beacon.config: "collapsibleSidebar" must be true or false');
  if (raw.editUrl !== undefined && !/^https?:\/\//.test(raw.editUrl)) throw new Error('beacon.config: "editUrl" must be an absolute http(s) URL');

  return { site: raw.site.replace(/\/+$/, ''), title: raw.title ?? 'Docs', accent, ...(raw.logo ? { logo: raw.logo } : {}), ...(raw.favicon ? { favicon: raw.favicon } : {}), ...(locales ? { locales } : {}), ...(raw.editUrl ? { editUrl: raw.editUrl } : {}), ...(raw.collapsibleSidebar ? { collapsibleSidebar: true } : {}) };
}
