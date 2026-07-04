import fs from 'fs';
import path from 'path';
import { slugifyAscii } from './lib/slug';
import { ensureDir, exitIfExists, extPair, isoDateStamp, writeContentFile } from './lib/content-file';

const args = process.argv.slice(2);
const valuedFlags = ['--template', '--prefix', '--series'];
const title = args.filter(arg => !arg.startsWith('--') && !valuedFlags.includes(args[args.indexOf(arg) - 1]))[0];
const templateArgIndex = args.indexOf('--template');
const templateName = templateArgIndex > -1 ? args[templateArgIndex + 1] : 'default';
const prefixArgIndex = args.indexOf('--prefix');
const prefix = prefixArgIndex > -1 ? args[prefixArgIndex + 1] : '';
const seriesArgIndex = args.indexOf('--series');
const series = seriesArgIndex > -1 ? args[seriesArgIndex + 1] : '';
const useFolder = args.includes('--folder');
const useMd = args.includes('--md');

if (!title) {
  console.error('Please provide a post title.');
  console.error('Usage: bun new <title> [--template <name>] [--prefix <name>] [--series <slug>] [--folder] [--md]');
  process.exit(1);
}

const slug = slugifyAscii(title);

const date = isoDateStamp();
const { ext } = extPair(useMd);
const prefixedSlug = prefix ? `${prefix}-${slug}` : slug;
let targetPath = '';

if (series) {
  // Series posts go into content/series/<slug>/ without date prefix
  const seriesDir = path.join(process.cwd(), 'content', 'series', series);
  if (!fs.existsSync(seriesDir)) {
    console.error(`Error: Series directory "${series}" does not exist at ${seriesDir}`);
    process.exit(1);
  }
  if (useFolder) {
    const dirPath = path.join(seriesDir, prefixedSlug);
    ensureDir(dirPath);
    fs.mkdirSync(path.join(dirPath, 'images'), { recursive: true });
    targetPath = path.join(dirPath, `index${ext}`);
  } else {
    targetPath = path.join(seriesDir, `${prefixedSlug}${ext}`);
  }
} else if (useFolder) {
  const dirName = `${date}-${prefixedSlug}`;
  const dirPath = path.join(process.cwd(), 'content', 'posts', dirName);
  ensureDir(dirPath);
  fs.mkdirSync(path.join(dirPath, 'images'), { recursive: true });
  targetPath = path.join(dirPath, `index${ext}`);
} else {
  const filename = `${date}-${prefixedSlug}${ext}`;
  targetPath = path.join(process.cwd(), 'content', 'posts', filename);
}

const templatePath = path.join(process.cwd(), 'templates', `${templateName}${ext}`);
// Fallback to .mdx template if .md specific template doesn't exist
const fallbackTemplatePath = path.join(process.cwd(), 'templates', `${templateName}.mdx`);

let content = '';

if (fs.existsSync(templatePath)) {
  content = fs.readFileSync(templatePath, 'utf8');
} else if (fs.existsSync(fallbackTemplatePath)) {
  content = fs.readFileSync(fallbackTemplatePath, 'utf8');
} else {
  // Fallback default template if file not found
  content = `---
title: "{{title}}"
date: "{{date}}"
excerpt: ""
category: "Uncategorized"
tags: []
authors: ["Amytis"]
layout: "post"
draft: false
latex: false
---

Write your content here...
`;
}

content = content.replace(/{{title}}/g, title).replace(/{{date}}/g, date);

exitIfExists(targetPath, 'post');

writeContentFile(targetPath, content, 'post');
