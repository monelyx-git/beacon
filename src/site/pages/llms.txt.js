import { config, pages, locales } from 'virtual:beacon';
import { llmsTxt } from '../../cli/llms.js';

export const GET = () => new Response(llmsTxt(config, pages, locales), { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
