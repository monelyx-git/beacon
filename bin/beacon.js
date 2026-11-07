#!/usr/bin/env node
import { resolve } from 'node:path';
import { build } from '../src/cli/build.js';

const [command, ...args] = process.argv.slice(2);
const rootFlag = args.indexOf('--root');
const root = resolve(rootFlag >= 0 ? args[rootFlag + 1] : '.');

try {
  if (command !== 'build') throw new Error(`usage: beacon build [--root <dir>]${command ? ` (unknown command "${command}")` : ''}`);
  const { pages, outDir } = await build(root);
  console.log(`beacon: built ${pages} pages into ${outDir}`);
} catch (err) {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
}
