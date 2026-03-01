import { spawnSync } from 'child_process';
import fs from 'fs';

// ─── Argument parsing ─────────────────────────────────────────────────────────

function flag(name: string): string | undefined {
  const idx = process.argv.indexOf(`--${name}`);
  if (idx === -1) return undefined;
  const value = process.argv[idx + 1];
  // Treat missing or another flag as absent
  return value && !value.startsWith('--') ? value : undefined;
}

// Flags take priority over .env / .env.local values (loaded automatically by Bun)
const host     = flag('host')     ?? process.env.DEPLOY_HOST;
const user     = flag('user')     ?? process.env.DEPLOY_USER;
const password = flag('password') ?? process.env.DEPLOY_PASSWORD;
const path     = flag('path')     ?? process.env.DEPLOY_PATH ?? '/var/www/html';

// ─── Validation ───────────────────────────────────────────────────────────────

const missing = (['host', 'user', 'password'] as const).filter(k => !({ host, user, password }[k]));
if (missing.length > 0) {
  console.error(`Missing required value(s): ${missing.map(k => `--${k}`).join(', ')}`);
  console.error('');
  console.error('Provide them as flags or set in .env.local:');
  console.error('  DEPLOY_HOST=<ip>');
  console.error('  DEPLOY_USER=<user>');
  console.error('  DEPLOY_PASSWORD=<password>');
  console.error('  DEPLOY_PATH=<remote-path>   (optional, default: /var/www/html)');
  console.error('');
  console.error('Usage: bun run deploy [--host <ip>] [--user <user>] [--password <pass>] [--path <path>]');
  process.exit(1);
}

if (!fs.existsSync('out')) {
  console.error('Error: out/ directory not found. Run `bun run build` first.');
  process.exit(1);
}

const check = spawnSync('which', ['sshpass']);
if (check.status !== 0) {
  console.error('Error: sshpass not found. Install it first:');
  console.error('  macOS: brew install hudochenkov/sshpass/sshpass');
  console.error('  Linux: apt install sshpass');
  process.exit(1);
}

// ─── Deploy ───────────────────────────────────────────────────────────────────

const destination = `${user}@${host}:${path}/`;
console.log(`Deploying out/ → ${destination}`);

const rsync = spawnSync(
  'sshpass',
  ['-p', password!, 'rsync', '-avz', '--delete', '-e', 'ssh -o StrictHostKeyChecking=accept-new', 'out/', destination],
  { stdio: 'inherit' }
);

if (rsync.status !== 0) {
  console.error('\nDeploy failed.');
  process.exit(rsync.status ?? 1);
}

console.log('\nReloading nginx...');

const reload = spawnSync(
  'sshpass',
  ['-p', password!, 'ssh', '-o', 'StrictHostKeyChecking=accept-new', `${user}@${host}`, 'nginx -s reload'],
  { stdio: 'inherit' }
);

if (reload.status !== 0) {
  console.warn('Warning: nginx reload failed (site was still deployed).');
}

console.log('Done.');
