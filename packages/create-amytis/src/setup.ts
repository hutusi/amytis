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

// A new site's content: a welcome post and the pages the nav and footer link
// to. It ships in the release next to this CLI's source, so it always matches
// the engine release it is built with.
export const STARTER_CONTENT = "packages/create-amytis/starter/content";

// New sites start from the starter content, not from the demo site's (its
// posts, series, books, flows, notes and translations). Returns whether the
// release had a starter; releases before it keep their demo content.
export function applyStarterContent(projectDir: string): boolean {
  const starterDir = path.join(projectDir, ...STARTER_CONTENT.split("/"));
  if (!fs.existsSync(starterDir)) return false;
  const contentDir = path.join(projectDir, "content");
  fs.rmSync(contentDir, { recursive: true, force: true });
  fs.cpSync(starterDir, contentDir, { recursive: true });
  return true;
}

// What the starter config and content use from public/images/: the author
// avatar in site.config.example.ts.
export const STARTER_IMAGES = new Set(["avatar.jpg"]);
// The image optimizer's cache of hashes; the build writes it again.
const IMAGE_HASHES = "public/next-image-export-optimizer-hashes.json";

// Removes the demo content's images, which the starter content doesn't use,
// and the optimizer's cache of their hashes. Returns what was removed.
export function pruneDemoImages(projectDir: string): string[] {
  const removed: string[] = [];
  const imagesDir = path.join(projectDir, "public", "images");
  if (fs.existsSync(imagesDir)) {
    for (const entry of fs.readdirSync(imagesDir, { withFileTypes: true })) {
      if (STARTER_IMAGES.has(entry.name)) continue;
      fs.rmSync(path.join(imagesDir, entry.name), { recursive: true, force: true });
      removed.push(`public/images/${entry.name}${entry.isDirectory() ? "/" : ""}`);
    }
  }
  const hashes = path.join(projectDir, ...IMAGE_HASHES.split("/"));
  if (fs.existsSync(hashes)) {
    fs.rmSync(hashes);
    removed.push(IMAGE_HASHES);
  }
  return removed;
}

// Same shape test the build applies to directories under content/
// (src/lib/content/io.ts): a locale-shaped directory must be a configured
// locale, or the build fails.
const LOCALE_DIR_SHAPE = /^[a-z]{2}(-[A-Z]{2})?$/;

// The starter config is single-language, so the demo site's translations
// (content/zh/ and the like) would fail its build. Only needed for a release
// without starter content. Returns what was removed.
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
// TODO.md is the project's roadmap. The agent docs (CLAUDE.md, AGENTS.md,
// GEMINI.md, .claude/) guide work on the engine itself, its tests and
// releases, and would mislead an assistant working on a site.
const ENGINE_ONLY_PATHS = [
  ".github",
  ".entire",
  ".claude",
  "packages",
  "tests",
  "src/test-utils",
  "playwright.config.ts",
  "TODO.md",
  "CLAUDE.md",
  "AGENTS.md",
  "GEMINI.md",
];
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

// Whether removeEngineFiles removes the file at this relative path (with /
// separators). An upgrade leaves these out of the release it upgrades to.
export function isEngineOnlyPath(rel: string): boolean {
  return ENGINE_ONLY_PATHS.some((p) => rel === p || rel.startsWith(`${p}/`)) ||
    (rel.startsWith("src/") && TEST_FILE.test(rel));
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
  // A whole string or template literal, escaped quotes included: stopping at
  // the first quote would leave the rest of the old value behind. An escape
  // can also be a backslash at the end of a line, which continues the string.
  const str = String.raw`"(?:[^"\\]|\\[\s\S])*"`;
  const tpl = "`(?:[^`\\\\]|\\\\[\\s\\S])*`";
  const field = (name: string, literal: string) => [
    new RegExp(String.raw`^ {2}${name}:\s*\{\s*en:\s*${literal},\s*zh:\s*${literal}\s*\}`, "m"),
    new RegExp(String.raw`^ {2}${name}:\s*${literal}`, "m"),
  ];

  const [titleMap, titlePlain] = field("title", str);
  src = patchField(src, [
    [titleMap, `  title: { en: ${quotedTitle}, zh: ${quotedTitle} }`],
    [titlePlain, `  title: ${quotedTitle}`],
  ], "title");

  const [descriptionMap, descriptionPlain] = field("description", str);
  src = patchField(src, [
    [descriptionMap, `  description: { en: ${quotedDescription}, zh: ${quotedDescription} }`],
    [descriptionPlain, `  description: ${quotedDescription}`],
  ], "description");

  const [footerMap, footerPlain] = field("footerText", tpl);
  src = patchField(src, [
    [
      footerMap,
      `  footerText: { en: \`© \${new Date().getFullYear()} ${safeTitle}. All rights reserved.\`, zh: \`© \${new Date().getFullYear()} ${safeTitle}. 保留所有权利。\` }`,
    ],
    [footerPlain, `  footerText: \`© \${new Date().getFullYear()} ${safeTitle}. All rights reserved.\``],
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

export const UPGRADE_SCRIPT = "bunx create-amytis@latest upgrade";

// Scripts for the demo site's own content: new-weekly adds a post to its
// ai-nexus-weekly series. Only a site that starts from the starter content
// goes without them. toSitePackage keeps them: the upgrade's merge reads it
// as what the site began with, and a site made from the demo content still
// has that series, so an upgrade mustn't take its script away. (A release
// that changes one of these scripts reports a package.json conflict in the
// sites without it; remove such a script from the repo instead.)
const DEMO_SCRIPTS = ["new-weekly"];

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
    // Brings in a newer release later (upgrade.ts).
    scripts["upgrade"] = UPGRADE_SCRIPT;
  }

  return site;
}

// dropDemoScripts: the site starts from the starter content, not the demo's.
export function patchPackageJson(projectDir: string, projectName: string, options: { dropDemoScripts?: boolean } = {}): void {
  const pkgPath = path.join(projectDir, "package.json");
  if (!fs.existsSync(pkgPath)) {
    console.warn("  Warning: package.json not found, skipping patch");
    return;
  }
  const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8")) as Record<string, unknown>;
  const site = toSitePackage(pkg, projectName);
  const scripts = site["scripts"] as Record<string, string> | undefined;
  if (options.dropDemoScripts && scripts) {
    for (const name of DEMO_SCRIPTS) delete scripts[name];
  }
  fs.writeFileSync(pkgPath, JSON.stringify(site, null, 2) + "\n", "utf8");
}

// Everything that turns the downloaded release into a new site, after the
// download and the prompts. CI's "Starter site" job runs this on a checkout
// and builds the result, so it stays buildable.
export function setUpNewSite(
  projectDir: string,
  site: { projectName: string; title: string; description: string },
): { starter: boolean; starterContent: boolean; localeTrees: string[]; images: string[]; engineFiles: string[] } {
  const starter = applyStarterConfig(projectDir);
  // Before removeEngineFiles, which removes packages/ and the starter in it.
  const starterContent = applyStarterContent(projectDir);
  const localeTrees = starter && !starterContent ? removeLocaleTrees(projectDir) : [];
  const images = starterContent ? pruneDemoImages(projectDir) : [];
  const engineFiles = removeEngineFiles(projectDir);
  patchSiteConfig(projectDir, site.title, site.description);
  patchPackageJson(projectDir, site.projectName, { dropDemoScripts: starterContent });
  return { starter, starterContent, localeTrees, images, engineFiles };
}
