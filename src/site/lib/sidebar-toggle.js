import { SIDEBAR_KEY } from './theme-script.js';

/** Flips the sidebar class and remembers the choice; blocked storage only loses persistence. Returns true when hidden. */
export function toggleSidebar(doc, storage) {
  const hidden = !doc.documentElement.classList.contains('sidebar-hidden');
  doc.documentElement.classList.toggle('sidebar-hidden', hidden);
  doc.querySelector?.('.sidebar-toggle')?.setAttribute('aria-expanded', String(!hidden));
  try { storage.setItem(SIDEBAR_KEY, hidden ? 'hidden' : 'visible'); } catch { /* choice lasts for this page only */ }
  return hidden;
}

/** True for a plain `[` pressed outside text fields. */
export const isSidebarShortcut = (e) =>
  e.key === '[' && !e.metaKey && !e.ctrlKey && !e.altKey && !e.target?.closest?.('input, textarea, select, [contenteditable]');
