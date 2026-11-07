import { config } from 'virtual:beacon';

export const GET = () => new Response(`User-agent: *\nAllow: /\n\nSitemap: ${config.site}/sitemap.xml\n`, { headers: { 'Content-Type': 'text/plain' } });
