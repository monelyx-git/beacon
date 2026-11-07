import { readdir, readFile } from 'node:fs/promises';
import { basename, extname, join, relative, sep } from 'node:path';

/** @typedef {{slug: string, file: string, title: string, description?: string, order?: number}} Page */
/** @typedef {{label: string, href?: string, children: NavNode[], order: number}} NavNode */

const humanize = (s) => {
  const t = s.replace(/[-_]+/g, ' ').trim().toLowerCase();
  return t.charAt(0).toUpperCase() + t.slice(1);
};

const slugSegment = (s) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

// shortcut: frontmatter supports flat `key: value` lines only, upgrade if nested YAML is needed.
function parseFrontmatter(src) {
  const m = src.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!m) return { data: {}, body: src };
  const data = {};
  for (const line of m[1].split(/\r?\n/)) {
    const kv = line.match(/^([A-Za-z_-]+):\s*(.*)$/);
    if (kv) data[kv[1]] = kv[2].replace(/^["']|["']$/g, '');
  }
  return { data, body: src.slice(m[0].length) };
}

function firstHeading(body) {
  let fence = false;
  for (const line of body.split(/\r?\n/)) {
    if (/^\s*(```|~~~)/.test(line)) fence = !fence;
    const m = !fence && line.match(/^# +(.+?)\s*#*\s*$/);
    if (m) return m[1];
  }
}

const NOT_PROSE = /^(#|\||>|<|[-*+] |\d+\. |!\[|:::|import |export )/;

// Plain text of the first prose paragraph, for pages without a frontmatter description.
function firstParagraph(body) {
  let fence = false, block = [];
  const lines = [...body.split(/\r?\n/), ''];
  for (const line of lines) {
    if (/^\s*(```|~~~)/.test(line)) { fence = !fence; block = ['<skip>']; continue; }
    if (fence) continue;
    if (line.trim()) { block.push(line.trim()); continue; }
    if (block.length && !NOT_PROSE.test(block[0]) && block[0] !== '<skip>') {
      const text = block.join(' ')
        .replace(/!\[[^\]]*\]\([^)]*\)/g, '').replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
        .replace(/[`*]|__/g, '').replace(/\s+/g, ' ').trim();
      return text.length <= 160 ? text : `${text.slice(0, 159).replace(/\s+\S*$/, '')}…`;
    }
    block = [];
  }
}

async function walk(dir) {
  const out = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    if (e.name.startsWith('.') || e.name === 'node_modules') continue;
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...(await walk(p)));
    else if (/\.mdx?$/.test(e.name)) out.push(p);
  }
  return out;
}

/** @param {string} dir @returns {Promise<Page[]>} */
export async function scanContent(dir) {
  let files = [];
  try { files = await walk(dir); } catch { /* reported below */ }
  if (!files.length) throw new Error(`content directory is empty or missing: ${dir}`);

  const seen = new Map();
  const pages = [];
  for (const file of files.sort()) {
    const rel = relative(dir, file).split(sep);
    const stem = basename(rel.pop(), extname(file));
    const segs = [...rel, ...(stem === 'index' ? [] : [stem])].map(slugSegment).filter(Boolean);
    const slug = segs.join('/');
    if (seen.has(slug)) throw new Error(`slug collision on "/${slug}": ${seen.get(slug)} and ${file}`);
    seen.set(slug, file);

    const { data, body } = parseFrontmatter(await readFile(file, 'utf8'));
    const order = data.order !== undefined && !Number.isNaN(Number(data.order)) ? Number(data.order) : undefined;
    pages.push({
      slug, file,
      title: data.title || firstHeading(body) || humanize(slug ? slug.split('/').pop() : 'Home'),
      ...((data.description || firstParagraph(body)) ? { description: data.description || firstParagraph(body) } : {}),
      ...(order !== undefined ? { order } : {}),
    });
  }
  return pages;
}

const href = (slug) => (slug ? `/${slug}/` : '/');
const rank = (n) => n.order ?? Infinity;
const byOrder = (a, b) => rank(a) - rank(b) || a.label.localeCompare(b.label);

/** @param {Page[]} pages @returns {NavNode[]} */
export function buildNav(pages) {
  const root = { children: new Map() };
  for (const p of pages) {
    const isIndex = p.file.replace(/\.mdx?$/, '').endsWith(`${sep}index`) && p.slug !== '';
    const segs = p.slug ? p.slug.split('/') : [''];
    let node = root;
    for (const seg of isIndex ? segs : segs.slice(0, -1)) {
      if (!node.children.has(seg)) node.children.set(seg, { label: humanize(seg), children: new Map() });
      node = node.children.get(seg);
    }
    const target = isIndex ? node : { label: p.title, children: new Map() };
    Object.assign(target, { label: p.title, href: href(p.slug), order: p.order });
    if (!isIndex) node.children.set(segs.at(-1), target);
  }
  const finish = (node) => ({
    label: node.label, ...(node.href ? { href: node.href } : {}), order: node.order,
    children: [...node.children.values()].map(finish).sort(byOrder),
  });
  const top = finish(root).children;
  // The root index page leads the sidebar.
  const home = top.findIndex((n) => n.href === '/');
  if (home > 0) top.unshift(...top.splice(home, 1));
  return top;
}
