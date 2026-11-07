import { THEME_KEY } from './theme-script.js';

/** Flips the theme class and remembers the choice; blocked storage only loses persistence. Returns true when dark. */
export function toggleTheme(doc, storage) {
  const dark = !doc.documentElement.classList.contains('dark');
  doc.documentElement.classList.toggle('dark', dark);
  try { storage.setItem(THEME_KEY, dark ? 'dark' : 'light'); } catch { /* choice lasts for this page only */ }
  return dark;
}
