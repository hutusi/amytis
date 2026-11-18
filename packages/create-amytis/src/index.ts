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
          const hint = res.statusCode === 403 || res.statusCode === 429
            ? " (usually its hourly limit for requests without a token; try again later)"
            : "";
          reject(new Error(`GitHub API returned ${res.statusCode} for ${url}${hint}`));
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

const REPO = "hutusi/amytis";

// The tag that a /releases/latest redirect points at, e.g.
// https://github.com/hutusi/amytis/releases/tag/v2.0.1 gives "v2.0.1". Null
// for anything else, such as the /releases page a repo without releases
// redirects to. The tag ends up in a URL and a file name, so only plain tag
// characters pass.
export function tagFromReleaseUrl(location: string): string | null {
  const match = /\/releases\/tag\/([A-Za-z0-9._-]+)\/?$/.exec(location);
  return match && !match[1].startsWith(".") ? match[1] : null;
}

function fetchRedirect(url: string): Promise<string | null> {
  return new Promise((resolve, reject) => {
    https
      .get(url, { headers: { "User-Agent": "create-amytis-cli" } }, (res) => {
        res.resume();
        const status = res.statusCode ?? 0;
        resolve(status >= 300 && status < 400 ? res.headers.location ?? null : null);
      })
      .on("error", reject);
  });
}

// github.com redirects /releases/latest to the latest release's tag page, so
// the tag can be read without the REST API. The API allows 60 requests an
// hour without a token, shared by everyone behind one IP address (an office,
// a school, a CI runner), so it is only the fallback.
async function getLatestReleaseTag(): Promise<string> {
  try {
    const location = await fetchRedirect(`https://github.com/${REPO}/releases/latest`);
    const tag = location ? tagFromReleaseUrl(location) : null;
    if (tag) return tag;
  } catch {
    // Fall back to the API.
  }
  const release = await fetchJson(`https://api.github.com/repos/${REPO}/releases/latest`);
  const tag = typeof release["tag_name"] === "string" ? tagFromReleaseUrl(`/releases/tag/${release["tag_name"]}`) : null;
  if (!tag) throw new Error("Could not determine latest release tag");
  return tag;
}

export function getArchiveMetadata(tag: string, platform: NodeJS.Platform = process.platform): {
  url: string;
  filename: string;
  kind: "zip" | "tar.gz";
} {
  if (platform === "win32") {
    return {
      url: `https://github.com/${REPO}/archive/refs/tags/${tag}.zip`,
      filename: `amytis-${tag}.zip`,
      kind: "zip",
    };
  }

  return {
    url: `https://github.com/${REPO}/archive/refs/tags/${tag}.tar.gz`,
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

// What only the Amytis repo itself uses: its tests check the demo site's
// content and two-language config, so they fail in a new site; its workflows
// run them and publish the amytis package; packages/ is this CLI's source;
// TODO.md is the project's roadmap.
const ENGINE_ONLY_PATHS = [".github", ".entire", "packages", "tests", "src/test-utils", "playwright.config.ts", "TODO.md"];
const TEST_FILE = /\.test\.tsx?$/;

function removeTestFiles(dir: string): number {
  let count = 0;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) count += removeTestFiles(full);
    else if (TEST_FILE.test(entry.name)) {
      fs.unlinkSync(full);
      count++;
    }
  }
  return count;
}

// Removes the engine's own tests, CI and tooling. Returns what was removed.
export function removeEngineFiles(projectDir: string): string[] {
  const removed: string[] = [];
  for (const rel of ENGINE_ONLY_PATHS) {
    const target = path.join(projectDir, rel);
    if (!fs.existsSync(target)) continue;
    const isDir = fs.statSync(target).isDirectory();
    fs.rmSync(target, { recursive: true, force: true });
    removed.push(isDir ? `${rel}/` : rel);
  }
  const srcDir = path.join(projectDir, "src");
  const testFiles = fs.existsSync(srcDir) ? removeTestFiles(srcDir) : 0;
  if (testFiles > 0) removed.push(`src/**/*.test.ts(x) (${testFiles} files)`);
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

  // The engine's tests aren't part of a new site (removeEngineFiles), so
  // neither are the scripts that run them.
  const scripts = pkg["scripts"] as Record<string, string> | undefined;
  if (scripts) {
    for (const name of Object.keys(scripts)) {
      if (name === "test" || name.startsWith("test:")) delete scripts[name];
    }
    if (scripts["validate"]) {
      scripts["validate"] = scripts["validate"]
        .split("&&")
        .map((step) => step.trim())
        .filter((step) => !/^bun run test(:|\s|$)/.test(step))
        .join(" && ");
    }
  }

  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n", "utf8");
}

// Everything that turns the downloaded release into a new site, after the
// download and the prompts. CI's "Starter site" job runs this on a checkout
// and builds the result, so it stays buildable.
export function setUpNewSite(
  projectDir: string,
  site: { projectName: string; title: string; description: string },
): { starter: boolean; localeTrees: string[]; engineFiles: string[] } {
  const starter = applyStarterConfig(projectDir);
  const localeTrees = starter ? removeLocaleTrees(projectDir) : [];
  const engineFiles = removeEngineFiles(projectDir);
  patchSiteConfig(projectDir, site.title, site.description);
  patchPackageJson(projectDir, site.projectName);
  return { starter, localeTrees, engineFiles };
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

  // 2. Find the latest release
  console.log("\nFetching latest Amytis release...");
  const tag = await getLatestReleaseTag();
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

  // 7. Start from the starter config, remove what only the Amytis repo uses,
  // and patch site.config.ts and package.json
  console.log("\nSetting up the site...");
  const setup = setUpNewSite(targetDir, { projectName, title: siteTitle, description: siteDescription });
  if (!setup.starter) {
    console.warn("  Warning: site.config.example.ts not found, keeping the release's site.config.ts");
  }
  if (setup.localeTrees.length > 0) {
    console.log(`  Removed the demo's translations: ${setup.localeTrees.join(", ")}`);
  }
  if (setup.engineFiles.length > 0) {
    console.log(`  Removed the Amytis repo's own tests and CI: ${setup.engineFiles.join(", ")}`);
  }

  // 8. Run bun install
  console.log("Installing dependencies (bun install)...");
  execSync("bun install", { cwd: targetDir, stdio: "inherit" });

  // 9. Success message
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
