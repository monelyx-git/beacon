import { config, pages } from 'virtual:beacon';

export const GET = () => {
  const urls = pages.map((p) => `  <url><loc>${config.site}${p.slug ? `/${p.slug}/` : '/'}</loc></url>`).join('\n');
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
  return new Response(xml, { headers: { 'Content-Type': 'application/xml' } });
};
