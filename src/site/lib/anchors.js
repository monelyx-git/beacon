/** Appends a "#" link to every h2-h4 that has an id. Escaped heading text inside code never matches. */
export const anchorHeadings = (html, label) =>
  html.replace(/<h([2-4])(\s[^>]*\bid="([^"]+)"[^>]*)>([\s\S]*?)<\/h\1>/g, (_, level, attrs, id, inner) =>
    `<h${level}${attrs}>${inner}<a class="anchor" href="#${id}" aria-label="${label}" data-pagefind-ignore>#</a></h${level}>`);
