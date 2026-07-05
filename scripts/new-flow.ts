import path from 'path';
import { ensureDir, exitIfExists, extPair, writeContentFile } from './lib/content-file';

const args = process.argv.slice(2);
const useMdx = args.includes('--mdx');

// Flows are keyed by *local* date parts (not the UTC isoDateStamp helper).
const now = new Date();
const year = String(now.getFullYear());
const month = String(now.getMonth() + 1).padStart(2, '0');
const day = String(now.getDate()).padStart(2, '0');

// Flows default to .md; --mdx flips the pair.
const { ext, altExt } = extPair(!useMdx);
const dirPath = path.join(process.cwd(), 'content', 'flows', year, month);
const targetPath = path.join(dirPath, `${day}${ext}`);

// Check if today's flow already exists (either .md or .mdx)
const altPath = path.join(dirPath, `${day}${altExt}`);

exitIfExists(targetPath, 'flow');
exitIfExists(altPath, 'flow');

// Create parent directories if needed
ensureDir(dirPath);

const content = `---
# title: ""
tags: []
---

`;

writeContentFile(targetPath, content, 'flow');
