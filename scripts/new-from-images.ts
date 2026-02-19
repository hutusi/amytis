import fs from 'fs';
import path from 'path';

const args = process.argv.slice(2);

// Parse arguments
const folderPath = args.find(arg => !arg.startsWith('--'));
const titleArgIndex = args.indexOf('--title');
const title = titleArgIndex > -1 ? args[titleArgIndex + 1] : '';
const sortArg = args.indexOf('--sort');
const sortOrder = sortArg > -1 ? args[sortArg + 1] : 'name'; // name, date, or none
const copyImages = !args.includes('--no-copy');

// Supported image extensions
const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.avif'];

function isImageFile(filename: string): boolean {
  const ext = path.extname(filename).toLowerCase();
  return IMAGE_EXTENSIONS.includes(ext);
}

function getImageFiles(dir: string, sort: string): string[] {
  const files = fs.readdirSync(dir)
    .filter(f => {
      const filePath = path.join(dir, f);
      return fs.statSync(filePath).isFile() && isImageFile(f);
    });

  switch (sort) {
    case 'name':
      return files.sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
    case 'date':
      return files.sort((a, b) => {
        const statA = fs.statSync(path.join(dir, a));
        const statB = fs.statSync(path.join(dir, b));
        return statA.mtimeMs - statB.mtimeMs;
      });
    case 'none':
    default:
      return files;
  }
}

if (!folderPath) {
  console.error('Please provide an image folder path.');
  console.error('Usage: bun run new-from-images <folder> [--title "Post Title"] [--sort name|date|none] [--no-copy]');
  console.error('');
  console.error('Options:');
  console.error('  --title     Custom title for the post (default: folder name)');
  console.error('  --sort      Sort images by: name (default), date, or none');
  console.error('  --no-copy   Reference images in place instead of copying');
  process.exit(1);
}

if (!fs.existsSync(folderPath) || !fs.statSync(folderPath).isDirectory()) {
  console.error(`Error: "${folderPath}" is not a valid directory.`);
  process.exit(1);
}

// Get image files
const imageFiles = getImageFiles(folderPath, sortOrder);

if (imageFiles.length === 0) {
  console.error(`Error: No image files found in "${folderPath}".`);
  console.error(`Supported formats: ${IMAGE_EXTENSIONS.join(', ')}`);
  process.exit(1);
}

console.log(`Found ${imageFiles.length} image(s) in folder.`);

// Generate slug from title or folder name
const folderName = path.basename(folderPath);
const postTitle = title || folderName.replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
const slug = (title || folderName)
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

// Copy or reference images
const images: { filename: string; relativePath: string }[] = [];

for (const file of imageFiles) {
  const srcPath = path.join(folderPath, file);

  if (copyImages) {
    const destPath = path.join(imagesDir, file);
    fs.copyFileSync(srcPath, destPath);
    images.push({ filename: file, relativePath: `./images/${file}` });
    console.log(`  Copied: ${file}`);
  } else {
    // Use absolute path from project root
    const absoluteSrcPath = path.resolve(srcPath);
    const relativePath = path.relative(dirPath, absoluteSrcPath);
    images.push({ filename: file, relativePath });
    console.log(`  Referenced: ${file}`);
  }
}

// Generate markdown content
const imageMarkdown = images
  .map((img, index) => `![Image ${index + 1}](${img.relativePath})`)
  .join('\n\n');

const content = `---
title: "${postTitle}"
date: "${date}"
excerpt: "A collection of ${images.length} images."
category: "Gallery"
tags: ["images", "gallery"]
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

console.log(`\nCreated new post from images:`);
console.log(`  Post: ${targetPath}`);
console.log(`  Images: ${images.length} file(s)${copyImages ? ' (copied)' : ' (referenced)'}`);
console.log(`\nYou can edit the post at: ${dirPath}`);
