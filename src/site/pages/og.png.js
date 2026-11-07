import { config } from 'virtual:beacon';
import { ogImage } from '../../cli/og.js';

// #12303f is Pier's sidebar color from the vendored tokens.
export const GET = () => new Response(ogImage({ background: '#12303f', accent: config.accent }), { headers: { 'Content-Type': 'image/png' } });
