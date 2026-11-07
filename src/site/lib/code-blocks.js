/** Wraps Shiki blocks with a copy button; a single delegated script (copy.js) handles clicks. */
export const wrapCodeBlocks = (html) =>
  html.replace(/<pre class="astro-code[\s\S]*?<\/pre>/g, (pre) =>
    `<div class="code-block">${pre}<button type="button" class="copy" aria-live="polite">Copy</button></div>`);
