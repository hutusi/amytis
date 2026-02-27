import fs from 'fs';
import path from 'path';

// Usage (auto-scan — recommended):
//   bun run new-flow-from-chat                         # import all new files in imports/chats/
//   bun run new-flow-from-chat --all                   # re-import every file (ignore history)
//   bun run new-flow-from-chat --dry-run               # preview without writing
//   bun run new-flow-from-chat --author "Alice"        # only include Alice's messages
//   bun run new-flow-from-chat --append                # append to existing flow files
//   bun run new-flow-from-chat --timestamp             # include timestamps (default: excluded)
//
// Usage (explicit file):
//   bun run new-flow-from-chat <file>                  # process one specific file
//
// Import history is tracked in imports/chats/.imported (one filename per line).
// That file is gitignored along with the rest of imports/.
//
// Input format (one message block per entry):
//   username YYYY-MM-DD HH:mm:ss
//   message line 1
//   message line 2
//   ...
//
// Output: content/flows/YYYY/MM/DD.md  (one file per calendar day)

const CHATS_DIR = path.join(process.cwd(), 'imports', 'chats');
const IMPORTED_RECORD = path.join(CHATS_DIR, '.imported');

// ── Arg parsing ────────────────────────────────────────────────────────────

const args = process.argv.slice(2);

// Collect positional args, skipping values that follow named flags
const positional: string[] = [];
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--author') { i++; continue; }
  if (!args[i].startsWith('--')) positional.push(args[i]);
}

const explicitFile      = positional[0] ?? null;
const authorIdx         = args.indexOf('--author');
const filterAuthor      = authorIdx > -1 ? args[authorIdx + 1] : null;
const dryRun            = args.includes('--dry-run');
const appendMode        = args.includes('--append');
const reimportAll       = args.includes('--all');
const includeTimestamp  = args.includes('--timestamp');

// ── Types ──────────────────────────────────────────────────────────────────

interface Message {
  username: string;
  date: string;   // YYYY-MM-DD
  time: string;   // HH:mm:ss
  lines: string[];
}

// ── Parser ─────────────────────────────────────────────────────────────────

// Matches: "username YYYY-MM-DD HH:mm:ss" (username may contain spaces)
const HEADER_RE = /^(.+?)\s+(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2}:\d{2})$/;

function parseChat(raw: string): Message[] {
  const messages: Message[] = [];
  let current: Message | null = null;

  for (const rawLine of raw.split('\n')) {
    const line = rawLine.replace(/\r$/, ''); // strip Windows line endings
    const match = line.match(HEADER_RE);
    if (match) {
      if (current) messages.push(current);
      current = { username: match[1].trim(), date: match[2], time: match[3], lines: [] };
    } else if (current) {
      current.lines.push(line);
    }
    // Lines before the first header are silently ignored
  }

  if (current) messages.push(current);
  return messages;
}

// ── Rendering ─────────────────────────────────────────────────────────────

function renderBlock(msg: Message, showUsername: boolean, showTime: boolean): string {
  const content = msg.lines.join('\n').trimEnd();
  if (!content.trim()) return ''; // skip empty messages

  const metaParts: string[] = [];
  if (showUsername) metaParts.push(`— ${msg.username}`);
  if (showTime) metaParts.push(msg.time);

  if (metaParts.length === 0) return content;
  return `${content}\n\n_${metaParts.join(' · ')}_`;
}

function renderFlow(messages: Message[], showUsername: boolean, showTime: boolean): string {
  const blocks = messages.map(m => renderBlock(m, showUsername, showTime)).filter(Boolean);
  return `---\ntags: []\n---\n\n${blocks.join('\n\n---\n\n')}\n`;
}

// ── Import tracking ────────────────────────────────────────────────────────

function loadImported(): Set<string> {
  if (!fs.existsSync(IMPORTED_RECORD)) return new Set();
  return new Set(
    fs.readFileSync(IMPORTED_RECORD, 'utf8')
      .split('\n').map(l => l.trim()).filter(Boolean),
  );
}

function markImported(filename: string): void {
  fs.appendFileSync(IMPORTED_RECORD, filename + '\n');
}

// ── File discovery ─────────────────────────────────────────────────────────

function findPendingFiles(): string[] {
  if (!fs.existsSync(CHATS_DIR)) {
    console.error(`Directory not found: ${CHATS_DIR}`);
    console.error('Create it (or run: mkdir -p imports/chats) and drop chat export files there.');
    process.exit(1);
  }
  const imported = reimportAll ? new Set<string>() : loadImported();
  return fs.readdirSync(CHATS_DIR)
    .filter(name => !name.startsWith('.') && /\.(txt|log)$/i.test(name))
    .filter(name => !imported.has(name))
    .sort()
    .map(name => path.join(CHATS_DIR, name));
}

// ── Process one file ───────────────────────────────────────────────────────

function processFile(filePath: string): boolean {
  const raw = fs.readFileSync(filePath, 'utf8');
  const allMessages = parseChat(raw);

  if (allMessages.length === 0) {
    console.log(`  ⚠  no messages found — check the file format`);
    return false;
  }

  const messages = filterAuthor
    ? allMessages.filter(m => m.username.toLowerCase() === filterAuthor.toLowerCase())
    : allMessages;

  if (messages.length === 0) {
    console.log(`  ⚠  no messages from "${filterAuthor}" found`);
    return false;
  }

  const byDate = new Map<string, Message[]>();
  for (const msg of messages) {
    const list = byDate.get(msg.date) ?? [];
    list.push(msg);
    byDate.set(msg.date, list);
  }

  const showUsername = filterAuthor === null;
  const showTime = includeTimestamp;
  const flowsDir = path.join(process.cwd(), 'content', 'flows');
  let created = 0, appended = 0, skipped = 0;

  for (const [date, dayMsgs] of [...byDate.entries()].sort()) {
    const [year, month, day] = date.split('-');
    const dirPath = path.join(flowsDir, year, month);
    const mdPath  = path.join(dirPath, `${day}.md`);
    const mdxPath = path.join(dirPath, `${day}.mdx`);
    const existing = fs.existsSync(mdPath) ? mdPath : fs.existsSync(mdxPath) ? mdxPath : null;
    const flowContent = renderFlow(dayMsgs, showUsername, showTime);

    if (dryRun) {
      const label = `${date} (${dayMsgs.length} msg${dayMsgs.length === 1 ? '' : 's'})`;
      console.log(`    ── ${label} → ${path.relative(process.cwd(), mdPath)}`);
      console.log(flowContent);
      continue;
    }

    if (existing && !appendMode) {
      console.log(`    ⚠  ${date}: flow already exists — skipped (use --append to add)`);
      skipped++;
      continue;
    }

    if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });

    if (existing) {
      const blocks = flowContent.replace(/^---[\s\S]*?---\n\n/, '').trimEnd();
      fs.appendFileSync(existing, `\n\n---\n\n${blocks}\n`);
      console.log(`    +  ${date}: appended ${dayMsgs.length} msg${dayMsgs.length === 1 ? '' : 's'} → ${path.basename(existing)}`);
      appended++;
    } else {
      fs.writeFileSync(mdPath, flowContent);
      console.log(`    ✓  ${date}: ${path.relative(process.cwd(), mdPath)} (${dayMsgs.length} msg${dayMsgs.length === 1 ? '' : 's'})`);
      created++;
    }
  }

  const parts: string[] = [];
  if (created  > 0) parts.push(`${created} created`);
  if (appended > 0) parts.push(`${appended} appended`);
  if (skipped  > 0) parts.push(`${skipped} skipped`);
  const summary = dryRun ? 'dry run' : (parts.join(', ') || 'nothing to do');
  console.log(`    → ${summary} · ${messages.length} msg${messages.length === 1 ? '' : 's'} across ${byDate.size} day${byDate.size === 1 ? '' : 's'}`);

  return true;
}

// ── Main ───────────────────────────────────────────────────────────────────

if (explicitFile) {
  if (!fs.existsSync(explicitFile)) {
    console.error(`Error: "${explicitFile}" not found.`);
    process.exit(1);
  }
  console.log(`Processing: ${explicitFile}${dryRun ? ' (dry run)' : ''}`);
  processFile(explicitFile);
} else {
  const pending = findPendingFiles();

  if (pending.length === 0) {
    const hint = reimportAll ? '' : ' (run with --all to re-import everything)';
    console.log(`Nothing new to import in imports/chats/${hint}.`);
    process.exit(0);
  }

  const modeLabel = dryRun ? ' (dry run)' : reimportAll ? ' (--all)' : '';
  console.log(`Found ${pending.length} file${pending.length === 1 ? '' : 's'} to import${modeLabel}:`);

  for (const filePath of pending) {
    console.log(`\n  ${path.basename(filePath)}`);
    const ok = processFile(filePath);
    if (!dryRun && ok) markImported(path.basename(filePath));
  }

  if (!dryRun) {
    console.log(`\nDone. Import history saved to ${path.relative(process.cwd(), IMPORTED_RECORD)}.`);
  }
}
