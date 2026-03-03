#!/usr/bin/env node

import * as fs from "fs";
import * as path from "path";
import * as https from "https";
import * as readline from "readline";
import { execSync } from "child_process";

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

function extractTarball(tarPath: string, outDir: string): void {
  // Extract into a temp dir, then move the inner folder out
  const tmpDir = `${outDir}.__tmp__`;
  fs.mkdirSync(tmpDir, { recursive: true });
  execSync(`tar xzf "${tarPath}" -C "${tmpDir}"`);

  // The tarball unpacks to a single top-level dir like "amytis-1.2.0/"
  const entries = fs.readdirSync(tmpDir);
  if (entries.length !== 1) {
    throw new Error(`Unexpected tarball structure: ${entries.join(", ")}`);
  }
  const innerDir = path.join(tmpDir, entries[0]);
  fs.renameSync(innerDir, outDir);
  fs.rmdirSync(tmpDir);
  fs.unlinkSync(tarPath);
}

// ---------------------------------------------------------------------------
// Patch helpers
// ---------------------------------------------------------------------------

function escapeTemplateLiteral(str: string): string {
  return str.replace(/\\/g, "\\\\").replace(/`/g, "\\`").replace(/\$\{/g, "\\${");
}

export function patchSiteConfig(projectDir: string, title: string, description: string): void {
  const configPath = path.join(projectDir, "site.config.ts");
  if (!fs.existsSync(configPath)) {
    console.warn("  Warning: site.config.ts not found, skipping patch");
    return;
  }

  let src = fs.readFileSync(configPath, "utf8");

  // title: { en: "...", zh: "..." }
  src = src.replace(
    /title:\s*\{\s*en:\s*"[^"]*",\s*zh:\s*"[^"]*"\s*\}/,
    `title: { en: ${JSON.stringify(title)}, zh: ${JSON.stringify(title)} }`
  );

  // description: { en: "...", zh: "..." }
  src = src.replace(
    /description:\s*\{\s*en:\s*"[^"]*",\s*zh:\s*"[^"]*"\s*\}/,
    `description: { en: ${JSON.stringify(description)}, zh: ${JSON.stringify(description)} }`
  );

  // footerText — replace "Amytis" occurrences in template literals with project title
  const safeTitle = escapeTemplateLiteral(title);
  src = src.replace(
    /footerText:\s*\{\s*en:\s*`[^`]*`,\s*zh:\s*`[^`]*`\s*\}/,
    `footerText: { en: \`© \${new Date().getFullYear()} ${safeTitle}. All rights reserved.\`, zh: \`© \${new Date().getFullYear()} ${safeTitle}. 保留所有权利。\` }`
  );

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
  const tarUrl = `https://github.com/hutusi/amytis/archive/refs/tags/${tag}.tar.gz`;
  const tarDest = path.join(process.cwd(), `amytis-${tag}.tar.gz`);
  console.log("Downloading tarball...");
  await downloadFile(tarUrl, tarDest);

  // 4. Extract
  console.log("Extracting...");
  extractTarball(tarDest, targetDir);
  console.log(`  Scaffolded: ${targetDir}`);

  // 5-6. Prompt for site metadata
  const siteTitle = await prompt("\nSite title", projectName);
  const siteDescription = await prompt(
    "Site description",
    "My digital garden"
  );

  // 7. Patch site.config.ts
  console.log("\nPatching site.config.ts...");
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
