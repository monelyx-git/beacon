import { mdPath } from './content.js';

const item = (config, p) =>
  `- [${p.title.replace(/[[\]]/g, '\\$&')}](${config.site}/${mdPath(p.slug)})${p.description ? `: ${p.description}` : ''}`;

/** llms.txt: the site title and a link (with description) to every page's Markdown, grouped by language when there are several. */
export function llmsTxt(config, pages, locales) {
  const lists = locales.map((code) => {
    const lines = pages.filter((p) => p.locale === code).map((p) => item(config, p)).join('\n');
    return locales.length > 1 ? `## ${code}\n\n${lines}` : lines;
  });
  return `# ${config.title}\n\n${lists.join('\n\n')}\n`;
}
