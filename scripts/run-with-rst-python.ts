import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';

const [command, ...args] = Bun.argv.slice(2);

if (!command) {
  console.error('Missing command to run.');
  process.exit(1);
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
