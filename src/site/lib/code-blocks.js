import { STRINGS } from './strings.js';

const en = STRINGS.en;

/**
 * Wraps Shiki blocks with a copy button; a single delegated script (copy.js) handles clicks.
 * Non-English labels ride on data attributes so copy.js stays free of dictionaries.
 */
export const wrapCodeBlocks = (html, s = en) => {
  const labels = s.copy === en.copy && s.copied === en.copied && s.copyFailed === en.copyFailed ? '' : ` data-copy="${s.copy}" data-copied="${s.copied}" data-failed="${s.copyFailed}"`;
  return html.replace(/<pre class="astro-code[\s\S]*?<\/pre>/g, (pre) =>
    `<div class="code-block">${pre}<button type="button" class="copy" aria-live="polite" data-pagefind-ignore${labels}>${s.copy}</button></div>`);
};
