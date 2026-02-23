import fs from 'fs';
import path from 'path';

const args = process.argv.slice(2);
const titleArg = args.filter(arg => !arg.startsWith('--'))[0];
const useMd = args.includes('--md');

if (!titleArg) {
  console.error('Usage: bun run new-note "Note Title"');
  process.exit(1);
}

// Slugify title
const slug = titleArg
  .toLowerCase()
  .replace(/[^a-z0-9\u4e00-\u9fff]+/g, '-')
  .replace(/^-|-$/g, '');

const now = new Date();
const dateStr = now.toISOString().split('T')[0];
const ext = useMd ? '.md' : '.mdx';

const notesDir = path.join(process.cwd(), 'content', 'notes');
const targetPath = path.join(notesDir, `${slug}${ext}`);

const altExt = useMd ? '.mdx' : '.md';
const altPath = path.join(notesDir, `${slug}${altExt}`);

if (fs.existsSync(targetPath)) {
  console.error(`Error: Note already exists at ${targetPath}`);
  process.exit(1);
}

if (fs.existsSync(altPath)) {
  console.error(`Error: Note already exists at ${altPath}`);
  process.exit(1);
}

if (!fs.existsSync(notesDir)) {
  fs.mkdirSync(notesDir, { recursive: true });
}

const content = `---
title: "${titleArg}"
date: "${dateStr}"
tags: []
aliases: []
---

`;

fs.writeFileSync(targetPath, content);
console.log(`Created new note: ${targetPath}`);
