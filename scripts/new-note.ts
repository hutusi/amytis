import path from 'path';
import { slugifyCjk } from './lib/slug';
import { ensureDir, exitIfExists, extPair, isoDateStamp, writeContentFile } from './lib/content-file';

const args = process.argv.slice(2);
const titleArg = args.filter(arg => !arg.startsWith('--'))[0];
const useMd = args.includes('--md');

if (!titleArg) {
  console.error('Usage: bun run new-note "Note Title"');
  process.exit(1);
}

const slug = slugifyCjk(titleArg);

const dateStr = isoDateStamp();
const { ext, altExt } = extPair(useMd);

const notesDir = path.join(process.cwd(), 'content', 'notes');
const targetPath = path.join(notesDir, `${slug}${ext}`);
const altPath = path.join(notesDir, `${slug}${altExt}`);

exitIfExists(targetPath, 'note');
exitIfExists(altPath, 'note');

ensureDir(notesDir);

const content = `---
title: "${titleArg}"
date: "${dateStr}"
tags: []
aliases: []
---

`;

writeContentFile(targetPath, content, 'note');
