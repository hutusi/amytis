import { describe, expect, test } from 'bun:test';
import { resolveCodeGroupIcon } from './code-group-icons';

describe('resolveCodeGroupIcon', () => {
  test('exact-label matches for package managers', () => {
    expect(resolveCodeGroupIcon('npm')).toBe('npm');
    expect(resolveCodeGroupIcon('yarn')).toBe('yarn');
    expect(resolveCodeGroupIcon('pnpm')).toBe('pnpm');
    expect(resolveCodeGroupIcon('bun')).toBe('bun');
    expect(resolveCodeGroupIcon('deno')).toBe('deno');
  });

  test('exact-label matches are case-insensitive and trim whitespace', () => {
    expect(resolveCodeGroupIcon('NPM')).toBe('npm');
    expect(resolveCodeGroupIcon('  Yarn  ')).toBe('yarn');
  });

  test('exact-label matches for tools', () => {
    expect(resolveCodeGroupIcon('docker')).toBe('docker');
    expect(resolveCodeGroupIcon('vite')).toBe('vite');
    expect(resolveCodeGroupIcon('next.js')).toBe('nextjs');
    expect(resolveCodeGroupIcon('nodejs')).toBe('node');
    expect(resolveCodeGroupIcon('tailwindcss')).toBe('tailwind');
  });

  test('filename matches win over extension matches', () => {
    // tsconfig.json maps to typescript via the filename table; otherwise
    // its `.json` extension would route it to the json icon.
    expect(resolveCodeGroupIcon('tsconfig.json')).toBe('typescript');
    expect(resolveCodeGroupIcon('package.json')).toBe('node');
    expect(resolveCodeGroupIcon('Dockerfile')).toBe('docker');
    expect(resolveCodeGroupIcon('vite.config.ts')).toBe('vite');
    expect(resolveCodeGroupIcon('next.config.mjs')).toBe('nextjs');
    expect(resolveCodeGroupIcon('tailwind.config.js')).toBe('tailwind');
  });

  test('filename match strips directory paths', () => {
    expect(resolveCodeGroupIcon('src/app/Dockerfile')).toBe('docker');
    expect(resolveCodeGroupIcon('apps/web/package.json')).toBe('node');
  });

  test('extension match for arbitrary file paths', () => {
    expect(resolveCodeGroupIcon('foo.ts')).toBe('typescript');
    expect(resolveCodeGroupIcon('src/index.tsx')).toBe('typescript');
    expect(resolveCodeGroupIcon('hello.py')).toBe('python');
    expect(resolveCodeGroupIcon('main.rs')).toBe('rust');
    expect(resolveCodeGroupIcon('config.yml')).toBe('yaml');
    expect(resolveCodeGroupIcon('README.md')).toBe('markdown');
    expect(resolveCodeGroupIcon('install.sh')).toBe('bash');
  });

  test('language-name aliases resolve to a canonical icon key', () => {
    expect(resolveCodeGroupIcon('TypeScript')).toBe('typescript');
    expect(resolveCodeGroupIcon('ts')).toBe('typescript');
    expect(resolveCodeGroupIcon('Python')).toBe('python');
    expect(resolveCodeGroupIcon('Go')).toBe('go');
    expect(resolveCodeGroupIcon('golang')).toBe('go');
    expect(resolveCodeGroupIcon('c++')).toBe('cpp');
  });

  test('returns null for labels that do not match any rule', () => {
    expect(resolveCodeGroupIcon('mystery')).toBeNull();
    expect(resolveCodeGroupIcon('totally-fake-name')).toBeNull();
    expect(resolveCodeGroupIcon('')).toBeNull();
    expect(resolveCodeGroupIcon('   ')).toBeNull();
  });

  test('does not match Object.prototype keys via the `in` operator', () => {
    // `'constructor' in {}` is true because of the prototype chain; using
    // Object.hasOwn (instead of `in`) prevents the resolver from returning
    // prototype values for crafted labels.
    expect(resolveCodeGroupIcon('constructor')).toBeNull();
    expect(resolveCodeGroupIcon('toString')).toBeNull();
    expect(resolveCodeGroupIcon('hasOwnProperty')).toBeNull();
    expect(resolveCodeGroupIcon('valueOf')).toBeNull();
    expect(resolveCodeGroupIcon('__proto__')).toBeNull();
  });
});
