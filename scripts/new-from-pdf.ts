import fs from 'fs';
import path from 'path';
import { pdf } from 'pdf-to-img';

const args = process.argv.slice(2);

// Parse arguments
const pdfPath = args.find(arg => arg.endsWith('.pdf') || (!arg.startsWith('--') && args.indexOf(arg) === 0));
const titleArgIndex = args.indexOf('--title');
const title = titleArgIndex > -1 ? args[titleArgIndex + 1] : '';
const scaleArg = args.indexOf('--scale');
const scale = scaleArg > -1 ? parseFloat(args[scaleArg + 1]) || 2.0 : 2.0;

if (!pdfPath || !fs.existsSync(pdfPath)) {
  console.error('Please provide a valid PDF file path.');
  console.error('Usage: bun run new-from-pdf <pdf-file> [--title "Post Title"] [--scale 2.0]');
  console.error('');
  console.error('Options:');
  console.error('  --title    Custom title for the post (default: PDF filename)');
  console.error('  --scale    Image scale factor (default: 2.0 for good quality)');
  process.exit(1);
}

// Generate slug from title or filename
const pdfBasename = path.basename(pdfPath, '.pdf');
const postTitle = title || pdfBasename.replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
const slug = (title || pdfBasename)
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/(^-|-$)+/g, '');

const date = new Date().toISOString().split('T')[0];
const dirName = `${date}-${slug}`;
const dirPath = path.join(process.cwd(), 'content', 'posts', dirName);
const imagesDir = path.join(dirPath, 'images');

// Check if post already exists
if (fs.existsSync(dirPath)) {
  console.error(`Error: Post already exists at ${dirPath}`);
  process.exit(1);
}

// Create directories
fs.mkdirSync(imagesDir, { recursive: true });
console.log(`Created directory: ${dirPath}`);

// Convert PDF to images
console.log(`Converting PDF (scale: ${scale})...`);

const images: string[] = [];
let pageNum = 0;

try {
  const pdfDocument = await pdf(pdfPath, { scale });

  for await (const image of pdfDocument) {
    pageNum++;
    const filename = `page-${String(pageNum).padStart(3, '0')}.png`;
    const imagePath = path.join(imagesDir, filename);

    fs.writeFileSync(imagePath, image);
    images.push(filename);
    console.log(`  Generated: ${filename}`);
  }
} catch (error) {
  const errorMessage = error instanceof Error ? error.message : String(error);
  console.error(`Error converting PDF: ${errorMessage}`);
  fs.rmSync(dirPath, { recursive: true });
  process.exit(1);
}

if (images.length === 0) {
  console.error('Error: No images were generated from the PDF.');
  fs.rmSync(dirPath, { recursive: true });
  process.exit(1);
}

// Generate markdown content
const imageMarkdown = images
  .map((img, index) => `![Page ${index + 1}](./images/${img})`)
  .join('\n\n');

const content = `---
title: "${postTitle}"
date: "${date}"
excerpt: "Content extracted from PDF document."
category: "Document"
tags: ["pdf", "document"]
authors: ["Amytis"]
layout: "post"
draft: false
latex: false
---

${imageMarkdown}
`;

// Write markdown file
const targetPath = path.join(dirPath, 'index.mdx');
fs.writeFileSync(targetPath, content);

console.log(`\nCreated new post from PDF:`);
console.log(`  Post: ${targetPath}`);
console.log(`  Images: ${images.length} page(s)`);
console.log(`\nYou can edit the post at: ${dirPath}`);
