// Turning a downloaded Amytis release into a new site.

import * as fs from "fs";
import * as path from "path";

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

// Patches the top-level title, description and footer of a site.config.ts
// source. Each is either a plain string (the starter config) or an { en, zh }
// map (a multi-language config); the `^  ` anchor skips nested fields such as
// the hero's title.
export function patchSiteConfigSource(src: string, title: string, description: string): string {
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

  return src;
}

export function patchSiteConfig(projectDir: string, title: string, description: string): void {
  const configPath = path.join(projectDir, "site.config.ts");
  if (!fs.existsSync(configPath)) {
    console.warn("  Warning: site.config.ts not found, skipping patch");
    return;
  }
  const src = fs.readFileSync(configPath, "utf8");
  fs.writeFileSync(configPath, patchSiteConfigSource(src, title, description), "utf8");
}

// The release's package.json as a new site gets it. Returns a new object.
export function toSitePackage(pkg: Record<string, unknown>, projectName: string): Record<string, unknown> {
  const site: Record<string, unknown> = structuredClone(pkg);

  site["name"] = projectName;
  site["private"] = true;
  delete site["repository"];
  delete site["bugs"];
  delete site["homepage"];

  // The engine's tests aren't part of a new site (removeEngineFiles), so
  // neither are the scripts that run them.
  const scripts = site["scripts"] as Record<string, string> | undefined;
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

  return site;
}

export function patchPackageJson(projectDir: string, projectName: string): void {
  const pkgPath = path.join(projectDir, "package.json");
  if (!fs.existsSync(pkgPath)) {
    console.warn("  Warning: package.json not found, skipping patch");
    return;
  }
  const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8")) as Record<string, unknown>;
  fs.writeFileSync(pkgPath, JSON.stringify(toSitePackage(pkg, projectName), null, 2) + "\n", "utf8");
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
