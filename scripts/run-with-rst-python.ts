import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';

const [command, ...args] = process.argv.slice(2);

if (!command) {
  console.error('Missing command to run.');
  process.exit(1);
}

// On Windows, Turbopack has module-resolution bugs that don't occur on
// macOS/Linux — `next build` fails to resolve `shiki` (ESM) and `postcss` (the
// CommonJS dep `sanitize-html` requires). Fall back to the Webpack bundler,
// which resolves them correctly. macOS / Linux / CI keep Turbopack. Only the
// `build` command is affected — `next dev` stays on Turbopack.
if (
  process.platform === 'win32' &&
  command === 'next' &&
  args[0] === 'build' &&
  !args.includes('--webpack') &&
  !args.includes('--turbopack') &&
  !args.includes('--turbo')
) {
  args.push('--webpack');
}

const env = { ...process.env };
if (!env.AMYTIS_RST_PYTHON) {
  const localPython = path.join(
    process.cwd(),
    '.venv-rst',
    process.platform === 'win32' ? 'Scripts' : 'bin',
    process.platform === 'win32' ? 'python.exe' : 'python',
  );
  if (fs.existsSync(localPython)) {
    env.AMYTIS_RST_PYTHON = localPython;
  }
}

const child = spawn(command, args, {
  stdio: 'inherit',
  env,
  shell: process.platform === 'win32',
});

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 1);
});

child.on('error', (error) => {
  console.error(error.message);
  process.exit(1);
});
