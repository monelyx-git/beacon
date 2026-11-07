#!/usr/bin/env node
import { resolve } from 'node:path';
import { build } from '../src/cli/build.js';
import { dev } from '../src/cli/dev.js';

const [command, ...args] = process.argv.slice(2);
const rootFlag = args.indexOf('--root');
const root = resolve(rootFlag >= 0 ? args[rootFlag + 1] : '.');

try {
  if (command === 'build') {
    const { pages, outDir } = await build(root);
    console.log(`beacon: built ${pages} pages into ${outDir}`);
  } else if (command === 'dev') {
    const portFlag = args.indexOf('--port');
    const server = await dev(root, portFlag >= 0 ? { port: Number(args[portFlag + 1]) } : {});
    console.log(`beacon: dev server at ${server.url} (Ctrl+C to stop)`);
    process.on('SIGINT', () => server.stop().then(() => process.exit(0)));
  } else {
    throw new Error(`usage: beacon <build|dev> [--root <dir>] [--port <n>]${command ? ` (unknown command "${command}")` : ''}`);
  }
} catch (err) {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
}
