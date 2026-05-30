/**
 * Maps a code-group tab label to an icon key. The key drives a CSS rule in
 * globals.css that paints the icon via .cg-tab[data-cg-icon="<key>"]::before.
 *
 * Match cascade (first hit wins):
 *   1. exact label match  ("npm", "yarn", "vite", "deno")
 *   2. filename match     ("package.json", "vite.config.ts", "Dockerfile")
 *   3. extension match    ("foo.ts" → typescript, "x.yml" → yaml)
 *   4. language alias     ("ts" → typescript, "py" → python)
 *
 * Returns null when nothing matches — caller renders the tab without an icon.
 */

const EXACT: Record<string, string> = {
  npm: 'npm',
  yarn: 'yarn',
  pnpm: 'pnpm',
  bun: 'bun',
  deno: 'deno',
  vite: 'vite',
  docker: 'docker',
  node: 'node',
  nodejs: 'node',
  'node.js': 'node',
  react: 'react',
  vue: 'vue',
  nextjs: 'nextjs',
  'next.js': 'nextjs',
  next: 'nextjs',
  tailwind: 'tailwind',
  tailwindcss: 'tailwind',
};

const FILENAMES: Record<string, string> = {
  'package.json': 'node',
  'package-lock.json': 'npm',
  'yarn.lock': 'yarn',
  'pnpm-lock.yaml': 'pnpm',
  'bun.lockb': 'bun',
  'tsconfig.json': 'typescript',
  'jsconfig.json': 'javascript',
  dockerfile: 'docker',
  '.dockerignore': 'docker',
  'docker-compose.yml': 'docker',
  'docker-compose.yaml': 'docker',
  'vite.config.ts': 'vite',
  'vite.config.js': 'vite',
  'vite.config.mts': 'vite',
  'vite.config.mjs': 'vite',
  'next.config.ts': 'nextjs',
  'next.config.js': 'nextjs',
  'next.config.mjs': 'nextjs',
  'tailwind.config.ts': 'tailwind',
  'tailwind.config.js': 'tailwind',
};

const EXTENSIONS: Record<string, string> = {
  ts: 'typescript',
  tsx: 'typescript',
  cts: 'typescript',
  mts: 'typescript',
  js: 'javascript',
  jsx: 'javascript',
  cjs: 'javascript',
  mjs: 'javascript',
  py: 'python',
  rs: 'rust',
  go: 'go',
  java: 'java',
  rb: 'ruby',
  php: 'php',
  c: 'c',
  h: 'c',
  cpp: 'cpp',
  cc: 'cpp',
  cxx: 'cpp',
  hpp: 'cpp',
  html: 'html',
  htm: 'html',
  css: 'css',
  scss: 'css',
  sass: 'css',
  json: 'json',
  yml: 'yaml',
  yaml: 'yaml',
  md: 'markdown',
  mdx: 'markdown',
  sh: 'bash',
  bash: 'bash',
  zsh: 'bash',
  vue: 'vue',
};

const LANGUAGE_ALIASES: Record<string, string> = {
  typescript: 'typescript',
  ts: 'typescript',
  javascript: 'javascript',
  js: 'javascript',
  python: 'python',
  py: 'python',
  rust: 'rust',
  rs: 'rust',
  go: 'go',
  golang: 'go',
  java: 'java',
  ruby: 'ruby',
  rb: 'ruby',
  php: 'php',
  c: 'c',
  cpp: 'cpp',
  'c++': 'cpp',
  cxx: 'cpp',
  html: 'html',
  css: 'css',
  json: 'json',
  yaml: 'yaml',
  yml: 'yaml',
  markdown: 'markdown',
  md: 'markdown',
  bash: 'bash',
  sh: 'bash',
  shell: 'bash',
  zsh: 'bash',
};

export function resolveCodeGroupIcon(label: string): string | null {
  const trimmed = label.trim().toLowerCase();
  if (!trimmed) return null;

  // Use Object.hasOwn instead of the `in` operator so we don't accidentally
  // return prototype-chain values (e.g. `constructor`, `toString`) for crafted
  // labels — `'constructor' in EXACT` would otherwise be `true`.
  if (Object.hasOwn(EXACT, trimmed)) return EXACT[trimmed];

  // Filename lookup uses the basename (strip any path prefix).
  const basename = trimmed.includes('/') ? trimmed.slice(trimmed.lastIndexOf('/') + 1) : trimmed;
  if (Object.hasOwn(FILENAMES, basename)) return FILENAMES[basename];

  // Extension fallback — take the portion after the LAST dot in the basename.
  const dot = basename.lastIndexOf('.');
  if (dot >= 0 && dot < basename.length - 1) {
    const ext = basename.slice(dot + 1);
    if (Object.hasOwn(EXTENSIONS, ext)) return EXTENSIONS[ext];
  }

  if (Object.hasOwn(LANGUAGE_ALIASES, trimmed)) return LANGUAGE_ALIASES[trimmed];
  return null;
}
