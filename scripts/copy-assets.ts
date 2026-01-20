import fs from 'fs';
import path from 'path';
import { siteConfig } from '../site.config';

const srcDir = path.join(process.cwd(), 'content', 'posts');
const destDir = path.join(process.cwd(), 'public', 'posts');

function copyRecursive(src: string, dest: string) {
  if (!fs.existsSync(src)) return;
  
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyRecursive(srcPath, destPath);
    } else {
      // Copy all files except markdown source
      if (!entry.name.endsWith('.md') && !entry.name.endsWith('.mdx')) {
        fs.copyFileSync(srcPath, destPath);
        console.log(`Copied: ${entry.name} -> ${destPath}`);
      }
    }
  }
}

function processPosts() {
  if (!fs.existsSync(srcDir)) return;

  const entries = fs.readdirSync(srcDir, { withFileTypes: true });

  entries.forEach((entry) => {
    if (entry.isDirectory()) {
      const originalName = entry.name;
      let targetName = originalName;

      const dateRegex = /^(\d{4}-\d{2}-\d{2})-(.*)$/;
      const match = originalName.match(dateRegex);

      if (match && !siteConfig.includeDateInUrl) {
        targetName = match[2];
      }

      const srcPostDir = path.join(srcDir, originalName);
      const destPostDir = path.join(destDir, targetName);

      console.log(`Processing ${originalName} -> ${targetName}`);
      copyRecursive(srcPostDir, destPostDir);
    }
  });
}

console.log('Copying assets from content/posts to public/posts...');
processPosts();
console.log('Assets copied successfully.');