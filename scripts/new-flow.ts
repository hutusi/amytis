import fs from 'fs';
import path from 'path';

const args = process.argv.slice(2);
const title = args.filter(arg => !arg.startsWith('--'))[0];
const useMdx = args.includes('--mdx');

const now = new Date();
const year = String(now.getFullYear());
const month = String(now.getMonth() + 1).padStart(2, '0');
const day = String(now.getDate()).padStart(2, '0');
const dateStr = `${year}-${month}-${day}`;

const ext = useMdx ? '.mdx' : '.md';
const dirPath = path.join(process.cwd(), 'content', 'flows', year, month);
const targetPath = path.join(dirPath, `${day}${ext}`);

// Check if today's flow already exists (either .md or .mdx)
const altExt = useMdx ? '.md' : '.mdx';
const altPath = path.join(dirPath, `${day}${altExt}`);

if (fs.existsSync(targetPath)) {
  console.error(`Error: Flow already exists at ${targetPath}`);
  process.exit(1);
}

if (fs.existsSync(altPath)) {
  console.error(`Error: Flow already exists at ${altPath}`);
  process.exit(1);
}

// Create parent directories if needed
if (!fs.existsSync(dirPath)) {
  fs.mkdirSync(dirPath, { recursive: true });
}

const flowTitle = title || dateStr;

const content = `---
title: "${flowTitle}"
tags: []
---

`;

fs.writeFileSync(targetPath, content);
console.log(`Created new flow: ${targetPath}`);
