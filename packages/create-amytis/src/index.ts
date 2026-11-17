#!/usr/bin/env node

import * as fs from "fs";
import * as path from "path";
import * as https from "https";
import * as readline from "readline";
import { execFileSync, execSync } from "child_process";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function prompt(question: string, defaultVal: string = ""): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  const display = defaultVal ? `${question} (${defaultVal}): ` : `${question}: `;
  return new Promise((resolve) => {
    rl.question(display, (answer) => {
      rl.close();
      resolve(answer.trim() || defaultVal);
    });
  });
}

function fetchJson(url: string): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    https
      .get(url, { headers: { "User-Agent": "create-amytis-cli" } }, (res) => {
        if (res.statusCode === 301 || res.statusCode === 302) {
          fetchJson(res.headers.location!).then(resolve).catch(reject);
          return;
        }
        if (res.statusCode !== 200) {
          reject(new Error(`GitHub API returned ${res.statusCode} for ${url}`));
          return;
        }
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          try {
            resolve(JSON.parse(data) as Record<string, unknown>);
          } catch {
            reject(new Error("Failed to parse GitHub API response"));
          }
        });
      })
      .on("error", reject);
  });
}

function downloadFile(url: string, dest: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const doGet = (targetUrl: string) => {
      https
        .get(targetUrl, { headers: { "User-Agent": "create-amytis-cli" } }, (res) => {
          if (res.statusCode === 301 || res.statusCode === 302) {
            doGet(res.headers.location!);
            return;
          }
          if (res.statusCode !== 200) {
            reject(new Error(`Download failed with status ${res.statusCode}`));
            return;
          }
          const file = fs.createWriteStream(dest);
          res.pipe(file);
          file.on("finish", () => file.close(() => resolve()));
          file.on("error", (err) => {
            fs.unlink(dest, () => {});
            reject(err);
          });
        })
        .on("error", reject);
    };
    doGet(url);
  });
}

export function getArchiveMetadata(tag: string, platform: NodeJS.Platform = process.platform): {
  url: string;
  filename: string;
  kind: "zip" | "tar.gz";
} {
  if (platform === "win32") {
    return {
      url: `https://github.com/hutusi/amytis/archive/refs/tags/${tag}.zip`,
      filename: `amytis-${tag}.zip`,
      kind: "zip",
    };
  }

  return {
    url: `https://github.com/hutusi/amytis/archive/refs/tags/${tag}.tar.gz`,
    filename: `amytis-${tag}.tar.gz`,
    kind: "tar.gz",
  };
}

export function buildExtractCommand(
  archivePath: string,
  tmpDir: string,
  kind: "zip" | "tar.gz",
  platform: NodeJS.Platform = process.platform,
): { command: string; args: string[] } {
  if (kind === "zip") {
    if (platform !== "win32") {
      throw new Error("ZIP extraction is only supported on Windows in create-amytis");
    }

    return {
      command: "powershell.exe",
      args: [
        "-NoProfile",
        "-NonInteractive",
        "-ExecutionPolicy",
        "Bypass",
        "-Command",
        "Expand-Archive",
        "-LiteralPath",
        archivePath,
        "-DestinationPath",
        tmpDir,
        "-Force",
      ],
    };
  }

  return {
    command: "tar",
    args: ["xzf", archivePath, "-C", tmpDir],
  };
}

function extractArchive(archivePath: string, outDir: string, kind: "zip" | "tar.gz", platform: NodeJS.Platform = process.platform): void {
  // Extract into a temp dir, then move the inner folder out
  const tmpDir = `${outDir}.__tmp__`;
  fs.mkdirSync(tmpDir, { recursive: true });
  const { command, args } = buildExtractCommand(archivePath, tmpDir, kind, platform);
  execFileSync(command, args, { stdio: "inherit" });

  // The tarball unpacks to a single top-level dir like "amytis-1.2.0/"
  const entries = fs.readdirSync(tmpDir);
  if (entries.length !== 1) {
    throw new Error(`Unexpected tarball structure: ${entries.join(", ")}`);
  }
  const innerDir = path.join(tmpDir, entries[0]);
  fs.renameSync(innerDir, outDir);
  fs.rmdirSync(tmpDir);
  fs.unlinkSync(archivePath);
}

// ---------------------------------------------------------------------------
// Patch helpers
// ---------------------------------------------------------------------------

function escapeTemplateLiteral(str: string): string {
  return str.replace(/\\/g, "\\\\").replace(/`/g, "\\`").replace(/\$\{/g, "\\${");
}

// Replace the first of `shapes` whose pattern matches `src`, failing loudly
// when none does: a silent miss means the downloaded site.config.ts shape
// drifted from what this CLI knows how to patch, and the user would get an
// unpatched site with no hint why.
function patchField(src: string, shapes: Array<[RegExp, string]>, field: string): string {
  for (const [pattern, replacement] of shapes) {
    // Function replacer: a plain-string replacement would give `$&`/`$$`/`` $` ``
    // in user-supplied titles special String.replace semantics and corrupt the
    // generated config.
    if (pattern.test(src)) return src.replace(pattern, () => replacement);
  }
  throw new Error(
    `create-amytis is out of sync with the downloaded site.config.ts: ` +
    `could not find the "${field}" field to patch. Edit site.config.ts manually, ` +
    `and please report this at https://github.com/hutusi/amytis/issues`
  );
}

// New sites start from the single-language starter, not from the demo site's
// own config (its author's links, domain and two-language setup). Returns
// whether a starter was found.
export function applyStarterConfig(projectDir: string): boolean {
  const starterPath = path.join(projectDir, "site.config.example.ts");
  if (!fs.existsSync(starterPath)) return false;
  fs.copyFileSync(starterPath, path.join(projectDir, "site.config.ts"));
  return true;
}

// Same shape test the build applies to directories under content/
// (src/lib/content/io.ts): a locale-shaped directory must be a configured
// locale, or the build fails.
const LOCALE_DIR_SHAPE = /^[a-z]{2}(-[A-Z]{2})?$/;

// The starter config is single-language, so the demo site's translations
// (content/zh/ and the like) would fail its build. Returns what was removed.
export function removeLocaleTrees(projectDir: string): string[] {
  const contentDir = path.join(projectDir, "content");
  if (!fs.existsSync(contentDir)) return [];
  const removed: string[] = [];
  for (const entry of fs.readdirSync(contentDir, { withFileTypes: true })) {
    if (!entry.isDirectory() || !LOCALE_DIR_SHAPE.test(entry.name)) continue;
    fs.rmSync(path.join(contentDir, entry.name), { recursive: true, force: true });
    removed.push(`content/${entry.name}/`);
  }
  return removed;
}

// Patches the top-level title, description and footer. Each is either a plain
// string (the starter config) or an { en, zh } map (a multi-language config);
// the `^  ` anchor skips nested fields such as the hero's title.
export function patchSiteConfig(projectDir: string, title: string, description: string): void {
  const configPath = path.join(projectDir, "site.config.ts");
  if (!fs.existsSync(configPath)) {
    console.warn("  Warning: site.config.ts not found, skipping patch");
    return;
  }

  let src = fs.readFileSync(configPath, "utf8");
  const quotedTitle = JSON.stringify(title);
  const quotedDescription = JSON.stringify(description);
  const safeTitle = escapeTemplateLiteral(title);

  src = patchField(src, [
    [/^ {2}title:\s*\{\s*en:\s*"[^"]*",\s*zh:\s*"[^"]*"\s*\}/m, `  title: { en: ${quotedTitle}, zh: ${quotedTitle} }`],
    [/^ {2}title:\s*"[^"]*"/m, `  title: ${quotedTitle}`],
  ], "title");

  src = patchField(src, [
    [/^ {2}description:\s*\{\s*en:\s*"[^"]*",\s*zh:\s*"[^"]*"\s*\}/m, `  description: { en: ${quotedDescription}, zh: ${quotedDescription} }`],
    [/^ {2}description:\s*"[^"]*"/m, `  description: ${quotedDescription}`],
  ], "description");

  src = patchField(src, [
    [
      /^ {2}footerText:\s*\{\s*en:\s*`[^`]*`,\s*zh:\s*`[^`]*`\s*\}/m,
      `  footerText: { en: \`© \${new Date().getFullYear()} ${safeTitle}. All rights reserved.\`, zh: \`© \${new Date().getFullYear()} ${safeTitle}. 保留所有权利。\` }`,
    ],
    [/^ {2}footerText:\s*`[^`]*`/m, `  footerText: \`© \${new Date().getFullYear()} ${safeTitle}. All rights reserved.\``],
  ], "footerText");

  fs.writeFileSync(configPath, src, "utf8");
}

export function patchPackageJson(projectDir: string, projectName: string): void {
  const pkgPath = path.join(projectDir, "package.json");
  if (!fs.existsSync(pkgPath)) {
    console.warn("  Warning: package.json not found, skipping patch");
    return;
  }

  const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8")) as Record<string, unknown>;

  pkg["name"] = projectName;
  pkg["private"] = true;
  delete pkg["repository"];
  delete pkg["bugs"];
  delete pkg["homepage"];

  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n", "utf8");
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  console.log("\nCreate Amytis — scaffold a new digital garden\n");

  // 1. Project name
  let projectName = process.argv[2] ?? "";
  if (!projectName) {
    projectName = await prompt("Project name", "my-blog");
  }

  const targetDir = path.resolve(process.cwd(), projectName);
  if (fs.existsSync(targetDir)) {
    console.error(`Error: directory "${projectName}" already exists.`);
    process.exit(1);
  }

  // 2. Fetch latest release tag
  console.log("\nFetching latest Amytis release...");
  const release = await fetchJson(
    "https://api.github.com/repos/hutusi/amytis/releases/latest"
  );
  const tag = release["tag_name"] as string;
  if (!tag) throw new Error("Could not determine latest release tag");
  console.log(`  Found: ${tag}`);

  // 3. Download tarball
  const archive = getArchiveMetadata(tag);
  const archiveDest = path.join(process.cwd(), archive.filename);
  console.log("Downloading tarball...");
  await downloadFile(archive.url, archiveDest);

  // 4. Extract
  console.log("Extracting...");
  extractArchive(archiveDest, targetDir, archive.kind);
  console.log(`  Scaffolded: ${targetDir}`);

  // 5-6. Prompt for site metadata
  const siteTitle = await prompt("\nSite title", projectName);
  const siteDescription = await prompt(
    "Site description",
    "My digital garden"
  );

  // 7. Start from the starter config and patch it
  console.log("\nPatching site.config.ts...");
  if (applyStarterConfig(targetDir)) {
    const removed = removeLocaleTrees(targetDir);
    if (removed.length > 0) console.log(`  Removed the demo's translations: ${removed.join(", ")}`);
  } else {
    console.warn("  Warning: site.config.example.ts not found, keeping the release's site.config.ts");
  }
  patchSiteConfig(targetDir, siteTitle, siteDescription);

  // 8. Patch package.json
  console.log("Patching package.json...");
  patchPackageJson(targetDir, projectName);

  // 9. Run bun install
  console.log("Installing dependencies (bun install)...");
  execSync("bun install", { cwd: targetDir, stdio: "inherit" });

  // 10. Success message
  console.log(`
Done! Your new Amytis site is ready.

  cd ${projectName}
  bun dev          # start the dev server at http://localhost:3000
  bun run build    # production build

Edit site.config.ts to customise navigation, themes, and more.
Happy gardening!
`);
}

if (import.meta.main) {
  main().catch((err) => {
    console.error("\nError:", (err as Error).message);
    process.exit(1);
  });
}
