import path from 'path';
import { ensureDir, exitIfExists, extPair, writeContentFile } from './lib/content-file';

const args = process.argv.slice(2);
const useMdx = args.includes('--mdx');
// --folder writes DD/index.md instead of DD.md, so files can sit next to the
// entry: images, or a slide deck from `bun run new-slides`.
const useFolder = args.includes('--folder');

// Flows are keyed by *local* date parts (not the UTC isoDateStamp helper).
const now = new Date();
const year = String(now.getFullYear());
const month = String(now.getMonth() + 1).padStart(2, '0');
const day = String(now.getDate()).padStart(2, '0');

// Flows default to .md; --mdx flips the pair.
const { ext, altExt } = extPair(!useMdx);
const dirPath = path.join(process.cwd(), 'content', 'flows', year, month);
const folderPath = path.join(dirPath, day);
const targetPath = useFolder ? path.join(folderPath, `index${ext}`) : path.join(dirPath, `${day}${ext}`);

// A day has one flow, in any of its four forms (DD.md, DD.mdx, DD/index.md,
// DD/index.mdx); a second one would claim the same URL.
for (const existing of [`${day}${ext}`, `${day}${altExt}`, `${day}/index${ext}`, `${day}/index${altExt}`]) {
  exitIfExists(path.join(dirPath, existing), 'flow');
}

// Create parent directories if needed
ensureDir(path.dirname(targetPath));

const content = `---
# title: ""
tags: []
---

`;

writeContentFile(targetPath, content, 'flow');
if (useFolder) {
  console.log(`Add slides with: bun run new-slides <export-folder | deck.pdf> --into ${path.relative(process.cwd(), folderPath)}/`);
}
