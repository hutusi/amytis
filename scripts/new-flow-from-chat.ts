import fs from 'fs';
import path from 'path';

// Usage:
//   bun run new-flow-from-chat <file>
//   bun run new-flow-from-chat <file> --author "Alice"   # only Alice's messages
//   bun run new-flow-from-chat <file> --dry-run           # preview without writing
//   bun run new-flow-from-chat <file> --append            # append to existing flow files
//
// Expected input format (one message block per entry):
//   username YYYY-MM-DD HH:mm:ss
//   message line 1
//   message line 2
//   ...
//
// One flow file is created per calendar day found in the chat export.
// Output path: content/flows/YYYY/MM/DD.md

const args = process.argv.slice(2);
const filePath = args.find(a => !a.startsWith('--'));
const authorIdx = args.indexOf('--author');
const filterAuthor = authorIdx > -1 ? args[authorIdx + 1] : null;
const dryRun = args.includes('--dry-run');
const appendMode = args.includes('--append');

if (!filePath) {
  console.error('Usage: bun run new-flow-from-chat <file> [options]');
  console.error('');
  console.error('Options:');
  console.error('  --author <name>  Only include messages from this author');
  console.error('  --dry-run        Preview output without writing files');
  console.error('  --append         Append to existing flow files instead of skipping');
  process.exit(1);
}

if (!fs.existsSync(filePath)) {
  console.error(`Error: "${filePath}" not found.`);
  process.exit(1);
}

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

function renderBlock(msg: Message, showUsername: boolean): string {
  const content = msg.lines.join('\n').trimEnd();
  if (!content.trim()) return ''; // skip empty messages
  const header = showUsername
    ? `**${msg.username}** · ${msg.time}`
    : `_${msg.time}_`;
  return `${header}\n\n${content}`;
}

function renderFlow(messages: Message[], showUsername: boolean): string {
  const blocks = messages.map(m => renderBlock(m, showUsername)).filter(Boolean);
  return `---\ntags: []\n---\n\n${blocks.join('\n\n---\n\n')}\n`;
}

// ── Main ───────────────────────────────────────────────────────────────────

const raw = fs.readFileSync(filePath, 'utf8');
const allMessages = parseChat(raw);

if (allMessages.length === 0) {
  console.error('No messages found. Expected format:');
  console.error('  username YYYY-MM-DD HH:mm:ss');
  console.error('  message content...');
  process.exit(1);
}

const messages = filterAuthor
  ? allMessages.filter(m => m.username.toLowerCase() === filterAuthor.toLowerCase())
  : allMessages;

if (messages.length === 0) {
  console.error(`No messages from "${filterAuthor}" found.`);
  process.exit(1);
}

// Group by date, preserving per-day order
const byDate = new Map<string, Message[]>();
for (const msg of messages) {
  const list = byDate.get(msg.date) ?? [];
  list.push(msg);
  byDate.set(msg.date, list);
}

// When filtering to one author the username is redundant; show only the time
const showUsername = filterAuthor === null;

const flowsDir = path.join(process.cwd(), 'content', 'flows');
let created = 0, appended = 0, skipped = 0;

console.log(
  `Parsed ${allMessages.length} message${allMessages.length === 1 ? '' : 's'} ` +
  `across ${byDate.size} day${byDate.size === 1 ? '' : 's'}` +
  (filterAuthor ? ` (filtered to "${filterAuthor}")` : '') + '.',
);
if (dryRun) console.log('Dry run — no files will be written.\n');

for (const [date, dayMsgs] of [...byDate.entries()].sort()) {
  const [year, month, day] = date.split('-');
  const dirPath = path.join(flowsDir, year, month);
  const mdPath  = path.join(dirPath, `${day}.md`);
  const mdxPath = path.join(dirPath, `${day}.mdx`);
  const existing = fs.existsSync(mdPath) ? mdPath : fs.existsSync(mdxPath) ? mdxPath : null;
  const flowContent = renderFlow(dayMsgs, showUsername);

  if (dryRun) {
    const label = `${date} (${dayMsgs.length} message${dayMsgs.length === 1 ? '' : 's'})`;
    console.log(`── ${label} → ${mdPath}`);
    console.log(flowContent);
    continue;
  }

  if (existing && !appendMode) {
    console.log(`  ⚠  ${date}: skipped — ${existing} already exists (use --append to add)`);
    skipped++;
    continue;
  }

  if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });

  if (existing) {
    // Strip frontmatter from new content, append only the message blocks
    const blocks = flowContent.replace(/^---[\s\S]*?---\n\n/, '').trimEnd();
    fs.appendFileSync(existing, `\n\n---\n\n${blocks}\n`);
    console.log(`  +  ${date}: appended ${dayMsgs.length} message${dayMsgs.length === 1 ? '' : 's'} → ${existing}`);
    appended++;
  } else {
    fs.writeFileSync(mdPath, flowContent);
    console.log(`  ✓  ${date}: created ${mdPath} (${dayMsgs.length} message${dayMsgs.length === 1 ? '' : 's'})`);
    created++;
  }
}

if (!dryRun) {
  const parts: string[] = [];
  if (created  > 0) parts.push(`${created} created`);
  if (appended > 0) parts.push(`${appended} appended`);
  if (skipped  > 0) parts.push(`${skipped} skipped`);
  console.log(`\nDone: ${parts.join(', ')}.`);
}
