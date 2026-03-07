import { describe, test, expect, beforeAll, afterAll } from 'bun:test';
import { spawnSync } from 'bun';
import fs from 'fs';
import path from 'path';

const SCRIPT_PATH = 'scripts/import-obsidian.ts';

// Test vault lives under tests/tooling so it stays out of imports/ tracking
const VAULT_DIR = path.join('tests', 'tooling', '__temp_obsidian_vault');

// Output paths — use year 2099 to avoid colliding with real content
const FLOW_PATH  = path.join('content', 'flows', '2099', '12', '31.md');
const FLOW_DIR   = path.join('content', 'flows', '2099');
const NOTE_PATH  = path.join('content', 'notes', 'my-important-note.md');

describe('Tooling: import-obsidian', () => {
  beforeAll(() => {
    // Daily note inside a journals/ subfolder (to test recursive scan)
    fs.mkdirSync(path.join(VAULT_DIR, 'journals'), { recursive: true });
    fs.writeFileSync(
      path.join(VAULT_DIR, 'journals', '2099-12-31.md'),
      '---\ntags: [existing-tag]\n---\n\nHello #world.\n\nSee [[My Important Note]].\n',
    );

    // Regular note at vault root with a wikilink that has an explicit label
    fs.writeFileSync(
      path.join(VAULT_DIR, 'My Important Note.md'),
      'A note. See also [[Other Note|click here]].\n',
    );
  });

  afterAll(() => {
    fs.rmSync(VAULT_DIR, { recursive: true, force: true });
    if (fs.existsSync(FLOW_DIR)) fs.rmSync(FLOW_DIR, { recursive: true, force: true });
    if (fs.existsSync(NOTE_PATH)) fs.unlinkSync(NOTE_PATH);
  });

  test('--dry-run previews both types without writing any files', () => {
    const result = spawnSync(['bun', SCRIPT_PATH, '--vault', VAULT_DIR, '--dry-run', '--all']);
    expect(result.exitCode).toBe(0);
    const out = result.stdout.toString();
    expect(out).toContain('[flow]');
    expect(out).toContain('[note]');
    expect(fs.existsSync(FLOW_PATH)).toBe(false);
    expect(fs.existsSync(NOTE_PATH)).toBe(false);
  });

  test('YYYY-MM-DD.md is imported as flow with extracted tags and transformed wikilinks', () => {
    const result = spawnSync(['bun', SCRIPT_PATH, '--vault', VAULT_DIR, '--flows-only', '--all']);
    expect(result.exitCode).toBe(0);
    expect(fs.existsSync(FLOW_PATH)).toBe(true);

    const content = fs.readFileSync(FLOW_PATH, 'utf-8');
    // Both frontmatter tag and inline #tag appear in output
    expect(content).toContain('"existing-tag"');
    expect(content).toContain('"world"');
    // Inline tag removed from body
    expect(content).not.toMatch(/#world\b/);
    // Wikilink target slugified
    expect(content).toContain('[[my-important-note]]');
    expect(content).not.toContain('[[My Important Note]]');
  });

  test('regular .md is imported as note with slugified filename and title', () => {
    const result = spawnSync(['bun', SCRIPT_PATH, '--vault', VAULT_DIR, '--notes-only', '--all']);
    expect(result.exitCode).toBe(0);
    expect(fs.existsSync(NOTE_PATH)).toBe(true);

    const content = fs.readFileSync(NOTE_PATH, 'utf-8');
    expect(content).toContain('title: "My Important Note"');
    // Wikilink target slugified; explicit label preserved
    expect(content).toContain('[[other-note|click here]]');
  });

  test('scans vault subdirectories recursively', () => {
    // Flow came from journals/2099-12-31.md (a subfolder) — confirms recursive scan
    expect(fs.existsSync(FLOW_PATH)).toBe(true);
  });

  test('--all flag bypasses import history and reprocesses files', () => {
    // Run once to populate .imported history
    spawnSync(['bun', SCRIPT_PATH, '--vault', VAULT_DIR, '--flows-only']);
    // Run again without --all — nothing new to import
    const noAllResult = spawnSync(['bun', SCRIPT_PATH, '--vault', VAULT_DIR, '--flows-only']);
    expect(noAllResult.stdout.toString()).toContain('Nothing new to import');
    // Run with --all — history is bypassed so files are found again
    const result = spawnSync(['bun', SCRIPT_PATH, '--vault', VAULT_DIR, '--flows-only', '--all']);
    expect(result.exitCode).toBe(0);
    expect(result.stdout.toString()).toContain('Found');
  });

  test('fails gracefully when vault directory does not exist', () => {
    const result = spawnSync(['bun', SCRIPT_PATH, '--vault', '/nonexistent/vault/path']);
    expect(result.exitCode).not.toBe(0);
  });
});
