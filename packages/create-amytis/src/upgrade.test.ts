import { describe, test, expect, afterAll } from "bun:test";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { spawnSync } from "child_process";
import { isEngineOnlyPath, removeEngineFiles, setUpNewSite } from "./setup";
import {
  applyPlan,
  compareVersions,
  decideFile,
  listFiles,
  mergePackageJson,
  needsAttention,
  parseUpgradeArgs,
  parseVersion,
  planUpgrade,
  readConfigString,
  releaseNotes,
  shareUnchanged,
  sameSiteState,
  siteState,
  undoProblem,
  type FileVersions,
  type UpgradePlan,
} from "./upgrade";

const tmpDirs: string[] = [];
afterAll(() => {
  for (const dir of tmpDirs) fs.rmSync(dir, { recursive: true, force: true });
});

function makeTmpDir(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "create-amytis-upgrade-"));
  tmpDirs.push(dir);
  return dir;
}

function writeTree(root: string, files: Record<string, string | Buffer>): void {
  for (const [rel, content] of Object.entries(files)) {
    const file = path.join(root, ...rel.split("/"));
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, content);
  }
}

function read(root: string, rel: string): string | undefined {
  const file = path.join(root, ...rel.split("/"));
  return fs.existsSync(file) ? fs.readFileSync(file, "utf8") : undefined;
}

function git(dir: string, ...args: string[]): string {
  const result = spawnSync("git", ["-c", "user.name=test", "-c", "user.email=test@localhost", ...args], { cwd: dir, encoding: "utf8" });
  if (result.status !== 0) throw new Error(`git ${args.join(" ")}: ${result.stderr}`);
  return result.stdout;
}

const labels = { site: "your site", base: "Amytis v2.0.0", target: "Amytis v2.0.1" };

// ---------------------------------------------------------------------------

describe("versions", () => {
  test("parses release tags and versions", () => {
    expect(parseVersion("v2.0.2")).toEqual([2, 0, 2]);
    expect(parseVersion("2.10.0")).toEqual([2, 10, 0]);
    expect(parseVersion("2.0")).toBeNull();
    expect(parseVersion("create-amytis-v0.1.4")).toBeNull();
    expect(parseVersion("1.0.0-beta")).toBeNull();
  });

  test("compares numerically, not as text", () => {
    expect(compareVersions([2, 10, 0], [2, 9, 9])).toBeGreaterThan(0);
    expect(compareVersions([2, 0, 2], [2, 0, 2])).toBe(0);
    expect(compareVersions([1, 17, 0], [2, 0, 0])).toBeLessThan(0);
  });
});

describe("decideFile", () => {
  const b = (s: string) => Buffer.from(s);
  const decide = (v: FileVersions, mergeable = true) => decideFile(v, mergeable);

  test("takes the release's version of a file the site never changed", () => {
    expect(decide({ base: b("1"), cleanBase: b("1"), site: b("1"), target: b("2") })).toBe("take");
    // ...including adding and deleting it.
    expect(decide({ target: b("new") })).toBe("take");
    expect(decide({ base: b("1"), cleanBase: b("1"), site: b("1") })).toBe("take");
  });

  test("keeps the site's version of a file the release never changed", () => {
    expect(decide({ base: b("1"), cleanBase: b("1"), site: b("mine"), target: b("1") })).toBe("none");
    expect(decide({ base: b("1"), cleanBase: b("1"), target: b("1") })).toBe("none");
  });

  test("does nothing when the site already matches the release", () => {
    expect(decide({ base: b("1"), cleanBase: b("1"), site: b("2"), target: b("2") })).toBe("none");
  });

  test("merges a text file both changed, and keeps a binary one", () => {
    const both = { base: b("1"), cleanBase: b("1"), site: b("mine"), target: b("2") };
    expect(decide(both)).toBe("merge");
    expect(decide(both, false)).toBe("keep-yours");
  });

  test("keeps a file the release removed but the site changed, and leaves one the site removed", () => {
    expect(decide({ base: b("1"), cleanBase: b("1"), site: b("mine") })).toBe("release-deleted");
    expect(decide({ base: b("1"), cleanBase: b("1"), target: b("2") })).toBe("you-deleted");
  });

  test("an engine test a new site never got counts as unchanged when missing, and is removed when unchanged", () => {
    // Made by create-amytis 0.1.4, which leaves the engine's tests out.
    expect(decide({ base: b("t"), site: undefined, target: undefined })).toBe("none");
    // Made by an older create-amytis, which kept them.
    expect(decide({ base: b("t"), site: b("t"), target: undefined })).toBe("take");
    // ...unless the site made it its own.
    expect(decide({ base: b("t"), site: b("mine"), target: undefined })).toBe("none");
  });
});

describe("mergePackageJson", () => {
  const base = {
    name: "@hutusi/amytis",
    version: "2.0.0",
    private: false,
    repository: { type: "git", url: "git+https://github.com/hutusi/amytis.git" },
    scripts: { dev: "next dev", test: "bun test src", validate: "bun run lint && bun run test && bun run build:dev" },
    dependencies: { next: "16.0.0", react: "19.0.0" },
  };
  const target = {
    ...base,
    version: "2.0.1",
    scripts: { ...base.scripts, check: "bun scripts/check.ts" },
    dependencies: { next: "16.1.0", react: "19.0.0", katex: "0.19.0" },
  };
  // A site from create-amytis 0.1.4, with a dependency of its own.
  const site = {
    name: "my-garden",
    version: "2.0.0",
    private: true,
    scripts: { dev: "next dev", validate: "bun run lint && bun run build:dev", upgrade: "bunx create-amytis@latest upgrade" },
    dependencies: { next: "16.0.0", react: "19.0.0", "left-pad": "^1.3.0" },
  };

  test("takes the release's changes and keeps the site's own", () => {
    const { merged, conflicts } = mergePackageJson(base, site, target);
    expect(conflicts).toEqual([]);
    expect(merged).toEqual({
      name: "my-garden",
      version: "2.0.1",
      private: true,
      scripts: { dev: "next dev", validate: "bun run lint && bun run build:dev", upgrade: "bunx create-amytis@latest upgrade", check: "bun scripts/check.ts" },
      dependencies: { next: "16.1.0", react: "19.0.0", "left-pad": "^1.3.0", katex: "0.19.0" },
    });
  });

  test("keeps the site's value where both changed it, and reports it", () => {
    const pinned = { ...site, dependencies: { ...site.dependencies, next: "16.0.5" } };
    const { merged, conflicts } = mergePackageJson(base, pinned, target);
    expect((merged.dependencies as Record<string, string>).next).toBe("16.0.5");
    expect(conflicts).toEqual([{ key: "dependencies.next", yours: "16.0.5", release: "16.1.0" }]);
  });

  test("drops the engine's test scripts from a site made before create-amytis left them out", () => {
    const old = { ...base, name: "old-site", private: true, repository: undefined, scripts: { ...base.scripts } };
    delete old.repository;
    const { merged, conflicts } = mergePackageJson(base, old, target);
    expect(conflicts).toEqual([]);
    expect(merged.scripts).toEqual({
      dev: "next dev",
      validate: "bun run lint && bun run build:dev",
      check: "bun scripts/check.ts",
      upgrade: "bunx create-amytis@latest upgrade",
    });
  });

  test("adds the upgrade script to a site made before it existed, even when the release changed no scripts", () => {
    // As create-amytis 0.1.4 made it: no test scripts, and no upgrade script yet.
    const made014 = { ...site, scripts: { dev: "next dev", validate: "bun run lint && bun run build:dev" } };
    const sameScripts = { ...target, scripts: base.scripts };
    const { merged, conflicts } = mergePackageJson(base, made014, sameScripts);
    expect(conflicts).toEqual([]);
    expect(merged.scripts).toEqual({ dev: "next dev", validate: "bun run lint && bun run build:dev", upgrade: "bunx create-amytis@latest upgrade" });
  });

  test("keeps a site's own upgrade script", () => {
    const pinned = { ...site, scripts: { ...site.scripts, upgrade: "bunx create-amytis@0.2.0 upgrade" } };
    expect((mergePackageJson(base, pinned, target).merged.scripts as Record<string, string>).upgrade).toBe("bunx create-amytis@0.2.0 upgrade");
  });

  test("merges keys that Object.prototype also has as plain keys", () => {
    const withPreview = { ...site, scripts: { ...site.scripts, preview: "bun run build && bun run start" } };
    const withConstructor = { ...target, scripts: { ...target.scripts, constructor: "echo built" } };
    const { merged } = mergePackageJson(base, withPreview, withConstructor);
    const scripts = merged.scripts as Record<string, string>;
    expect(Object.getOwnPropertyDescriptor(scripts, "constructor")?.value).toBe("echo built");
    expect(scripts.preview).toBe("bun run build && bun run start");
  });

  test("records the target's version even when the site changed its own", () => {
    const { merged, conflicts } = mergePackageJson(base, { ...site, version: "9.9.9" }, target);
    expect(merged.version).toBe("2.0.1");
    expect(conflicts).toEqual([]);
  });
});

describe("readConfigString", () => {
  test("reads a plain string or the en value of a map", () => {
    expect(readConfigString(`export const c = {\n  title: "My \\"Garden\\"",\n};`, "title")).toBe(`My "Garden"`);
    expect(readConfigString(`  description: { en: "English", zh: "中文" },`, "description")).toBe("English");
  });

  test("skips nested fields of the same name", () => {
    expect(readConfigString(`  hero: {\n    title: "Nested",\n  },`, "title")).toBeNull();
  });
});

describe("releaseNotes", () => {
  const changelog = `# Changelog

## [Unreleased]

## [2.1.0] - 2026-12-01

### Upgrading from 2.0
- Rename \`foo\` to \`bar\` in site.config.ts.

### Added
- Something.

## [2.0.1] - 2026-11-20

### Fixed
- A bug.

## [2.0.0] - 2026-11-17

### Upgrading from 1.x
- Move translations.
`;

  test("lists the versions after the site's, up to the target, with their upgrade notes", () => {
    expect(releaseNotes(changelog, [2, 0, 0], [2, 1, 0])).toEqual([
      { version: "2.1.0", upgrading: "- Rename `foo` to `bar` in site.config.ts." },
      { version: "2.0.1", upgrading: undefined },
    ]);
  });

  test("keeps deeper headings inside the upgrade notes", () => {
    const nested = `## [2.1.0] - 2026-12-01

### Upgrading from 2.0
- Rename \`foo\`.

#### If you use books
- Move \`books/\`.

### Added
- Something.
`;
    expect(releaseNotes(nested, [2, 0, 0], [2, 1, 0])).toEqual([
      { version: "2.1.0", upgrading: "- Rename `foo`.\n\n#### If you use books\n- Move `books/`." },
    ]);
  });

  test("reads a changelog with CRLF line endings", () => {
    expect(releaseNotes(changelog.replace(/\n/g, "\r\n"), [2, 0, 0], [2, 1, 0])[0]).toEqual({
      version: "2.1.0",
      upgrading: "- Rename `foo` to `bar` in site.config.ts.",
    });
  });

  test("reads a changelog with bare CR line endings", () => {
    expect(releaseNotes(changelog.replace(/\n/g, "\r"), [2, 0, 0], [2, 1, 0])[0]).toEqual({
      version: "2.1.0",
      upgrading: "- Rename `foo` to `bar` in site.config.ts.",
    });
  });

  test("reads the last section to the end of the file", () => {
    expect(releaseNotes(changelog, [1, 17, 0], [2, 0, 0])).toEqual([{ version: "2.0.0", upgrading: "- Move translations." }]);
  });
});

describe("listFiles", () => {
  test("skips .git whether it is a folder or, in a linked worktree, a file", () => {
    const dir = makeTmpDir();
    writeTree(dir, { ".git": "gitdir: /somewhere/.git/worktrees/x\n", "src/a.ts": "a\n", "sub/.git/config": "x\n", "node_modules/x/i.js": "x\n" });
    expect(listFiles(dir)).toEqual(["src/a.ts"]);
  });

  test("skips build folders, but not files with their names", () => {
    const dir = makeTmpDir();
    writeTree(dir, { "out/index.html": "x", ".next/cache": "x", "public/out": "a file\n", "docs/node_modules": "a file\n" });
    expect(listFiles(dir)).toEqual(["docs/node_modules", "public/out"]);
  });
});

describe("needsAttention", () => {
  const plan = (reason: string): UpgradePlan => ({ changes: [{ path: "bun.lock", kind: "kept", reason }], packageConflicts: [] });

  test("leaves out a lockfile kept for bun install to update", () => {
    expect(needsAttention(plan("bun install updates it"))).toBe(false);
  });

  test("counts a lockfile kept for any other reason", () => {
    expect(needsAttention(plan("it is a symbolic link, and the upgrade doesn't write through links"))).toBe(true);
  });
});

describe("isEngineOnlyPath", () => {
  test("names exactly what removeEngineFiles removes", () => {
    const dir = makeTmpDir();
    const files = [
      ".github/workflows/ci.yml",
      "packages/create-amytis/src/index.ts",
      "tests/unit/a.test.ts",
      "src/test-utils/render.tsx",
      "src/lib/urls.test.ts",
      "src/components/Nav.test.tsx",
      "playwright.config.ts",
      "TODO.md",
      "src/lib/urls.ts",
      "src/lib/testing.ts",
      "scripts/check.test.ts",
      "docs/tests.md",
      "README.md",
    ];
    writeTree(dir, Object.fromEntries(files.map((f) => [f, "x"])));
    removeEngineFiles(dir);
    const kept = new Set(listFiles(dir));
    for (const file of files) expect({ file, engineOnly: isEngineOnlyPath(file) }).toEqual({ file, engineOnly: !kept.has(file) });
  });
});

// ---------------------------------------------------------------------------
// A whole upgrade, on two made-up releases
// ---------------------------------------------------------------------------

const STARTER = (extra: string) => `export const siteConfig = {
  title: "My Garden",
  description: "A personal digital garden.",
  footerText: \`© \${new Date().getFullYear()} My Garden. All rights reserved.\`,

  nav: [],

  features: {
    books: { enabled: false },
    flow: { enabled: false },
  },
${extra}};
`;

const PKG = (version: string, deps: Record<string, string>, scripts: Record<string, string> = {}) =>
  JSON.stringify({
    name: "@hutusi/amytis",
    version,
    private: false,
    repository: { type: "git", url: "git+https://github.com/hutusi/amytis.git" },
    scripts: { dev: "next dev", test: "bun test src", validate: "bun run lint && bun run test && bun run build:dev", ...scripts },
    dependencies: deps,
  }, null, 2) + "\n";

const NINE_LINES = (first: string, last: string) => [first, "2", "3", "4", "5", "6", "7", "8", last].join("\n") + "\n";

function makeReleases(): { base: string; target: string } {
  const root = makeTmpDir();
  const base = path.join(root, "base");
  const target = path.join(root, "target");
  writeTree(base, {
    "package.json": PKG("2.0.0", { next: "16.0.0" }),
    "site.config.example.ts": STARTER(""),
    "site.config.ts": "export const siteConfig = { title: { en: \"Amytis\", zh: \"Amytis\" } };\n",
    "bun.lock": "lock 1\n",
    "README.md": "# Amytis\n",
    "src/untouched.ts": "a\n",
    "src/yours.ts": "y\n",
    "src/both.ts": NINE_LINES("1", "9"),
    "src/clash.ts": "x = 1\n",
    "src/legacy/old.ts": "old\n",
    "src/gone.ts": "g\n",
    "src/dropped.ts": "d\n",
    "src/lib/x.test.ts": "t\n",
    "public/logo.png": Buffer.from([0x89, 0x50, 0x00, 0x01]),
    "public/images/avatar.jpg": Buffer.from([0xff, 0xd8, 0x00, 0x01]),
    "content/posts/hello.md": "hi\n",
    "content/zh/posts/hello.md": "你好\n",
    "tests/engine.test.ts": "t\n",
    "CHANGELOG.md": "## [2.0.1] - 2026-11-20\n\n### Upgrading from 2.0.0\n- Run bun install.\n\n## [2.0.0] - 2026-11-17\n",
  });
  writeTree(target, {
    "package.json": PKG("2.0.1", { next: "16.1.0" }, { check: "bun scripts/check.ts" }),
    "site.config.example.ts": STARTER("\n  linkCheck: 'warn',\n"),
    "site.config.ts": "export const siteConfig = { title: { en: \"Amytis\", zh: \"Amytis\" }, linkCheck: 'error' };\n",
    "bun.lock": "lock 2\n",
    "README.md": "# Amytis 2\n",
    "src/untouched.ts": "a2\n",
    "src/yours.ts": "y\n",
    "src/both.ts": NINE_LINES("1", "nine"),
    "src/clash.ts": "x = 3\n",
    "src/dropped.ts": "d2\n",
    "src/added.ts": "new\n",
    "src/lib/x.test.ts": "t2\n",
    "public/logo.png": Buffer.from([0x89, 0x50, 0x00, 0x02]),
    "public/images/avatar.jpg": Buffer.from([0xff, 0xd8, 0x00, 0x02]),
    "content/posts/hello.md": "hi 2\n",
    "content/zh/posts/hello.md": "你好 2\n",
    "tests/engine.test.ts": "t2\n",
    "CHANGELOG.md": "## [2.0.1] - 2026-11-20\n\n### Upgrading from 2.0.0\n- Run bun install.\n\n## [2.0.0] - 2026-11-17\n",
  });
  return { base, target };
}

// A site made from the base release, then made its own.
function makeSite(base: string): string {
  const site = makeTmpDir();
  fs.cpSync(base, site, { recursive: true });
  setUpNewSite(site, { projectName: "my-garden", title: "Test Site", description: "Mine." });
  const config = read(site, "site.config.ts")!.replace(`  title: "Test Site",\n`, `  title: "Test Site",\n  // mine\n`);
  const pkg = JSON.parse(read(site, "package.json")!);
  pkg.dependencies["left-pad"] = "^1.3.0";
  writeTree(site, {
    "site.config.ts": config,
    "package.json": JSON.stringify(pkg, null, 2) + "\n",
    "bun.lock": "lock mine\n",
    "README.md": "# My site\n",
    "src/yours.ts": "y mine\n",
    "src/both.ts": NINE_LINES("one", "9"),
    "src/clash.ts": "x = 2\n",
    "src/gone.ts": "g mine\n",
    "src/mine.ts": "only mine\n",
    "public/logo.png": Buffer.from([0x89, 0x50, 0x00, 0x03]),
    // Made by an older create-amytis, which kept the engine's tests.
    "tests/engine.test.ts": "t\n",
  });
  fs.rmSync(path.join(site, "src", "dropped.ts"));
  return site;
}

describe("planUpgrade and applyPlan", () => {
  // Planned and applied once, here, so each test below can run on its own or
  // in any order.
  const { base, target } = makeReleases();
  const site = makeSite(base);
  const snapshot = () => Object.fromEntries(listFiles(site).map((rel) => [rel, read(site, rel)]));
  const before = snapshot();
  const plan = planUpgrade({ siteDir: site, baseDir: base, targetDir: target, labels, scratchDir: makeTmpDir() });
  const afterPlanning = snapshot();
  applyPlan(site, plan);

  test("planning changes nothing", () => {
    expect(afterPlanning).toEqual(before);
  });

  test("decides each file by comparing the two releases and the site", () => {
    const kinds = Object.fromEntries(plan.changes.map((c) => [c.path, c.kind]));
    expect(kinds).toEqual({
      "README.md": "kept",
      "bun.lock": "kept",
      "package.json": "merged",
      "public/logo.png": "kept",
      "site.config.example.ts": "update",
      "site.config.ts": "merged",
      "src/added.ts": "add",
      "src/both.ts": "merged",
      "src/clash.ts": "conflict",
      "src/dropped.ts": "kept",
      "src/gone.ts": "kept",
      "src/legacy/old.ts": "delete",
      "src/untouched.ts": "update",
      "tests/engine.test.ts": "delete",
    });
    expect(plan.packageConflicts).toEqual([]);
    expect(plan.configNote).toBeUndefined();
    expect(needsAttention(plan)).toBe(true);
  });

  test("applying it upgrades the site and keeps what is the site's own", () => {
    expect(read(site, "src/untouched.ts")).toBe("a2\n");
    expect(read(site, "src/added.ts")).toBe("new\n");
    expect(read(site, "src/yours.ts")).toBe("y mine\n");
    expect(read(site, "src/both.ts")).toBe(NINE_LINES("one", "nine"));
    expect(read(site, "src/clash.ts")).toBe("<<<<<<< your site\nx = 2\n=======\nx = 3\n>>>>>>> Amytis v2.0.1\n");
    expect(read(site, "src/mine.ts")).toBe("only mine\n");

    // Removed by the release: gone, with its empty folder, unless the site changed it.
    expect(fs.existsSync(path.join(site, "src", "legacy"))).toBe(false);
    expect(read(site, "src/gone.ts")).toBe("g mine\n");
    // Removed by the site: left removed, with the release's version beside it.
    expect(read(site, "src/dropped.ts")).toBeUndefined();
    expect(read(site, "src/dropped.ts.amytis-new")).toBe("d2\n");

    // The engine's own tests stay out of the site.
    expect(fs.existsSync(path.join(site, "tests"))).toBe(false);
    expect(read(site, "src/lib/x.test.ts")).toBeUndefined();

    // Binary files and READMEs aren't merged line by line.
    expect([...fs.readFileSync(path.join(site, "public", "logo.png"))]).toEqual([0x89, 0x50, 0x00, 0x03]);
    expect([...fs.readFileSync(path.join(site, "public", "logo.png.amytis-new"))]).toEqual([0x89, 0x50, 0x00, 0x02]);
    expect(read(site, "README.md")).toBe("# My site\n");
    expect(read(site, "README.md.amytis-new")).toBe("# Amytis 2\n");
    // bun install regenerates the lockfile from the merged package.json.
    expect(read(site, "bun.lock")).toBe("lock mine\n");
    expect(read(site, "bun.lock.amytis-new")).toBeUndefined();

    // Content and images are never touched.
    expect(read(site, "content/posts/hello.md")).toBe("hi\n");
    expect(fs.existsSync(path.join(site, "content", "zh"))).toBe(false);
    expect([...fs.readFileSync(path.join(site, "public", "images", "avatar.jpg"))]).toEqual([0xff, 0xd8, 0x00, 0x01]);
  });

  test("the site's config gains the new starter fields and keeps its own settings", () => {
    const config = read(site, "site.config.ts")!;
    expect(config).toContain(`  title: "Test Site",\n  // mine\n`);
    expect(config).toContain(`  description: "Mine.",`);
    expect(config).toContain("  linkCheck: 'warn',");
    expect(config).not.toContain("<<<<<<<");
  });

  test("package.json gets the release's dependencies and scripts, and the new version", () => {
    const pkg = JSON.parse(read(site, "package.json")!);
    expect(pkg.name).toBe("my-garden");
    expect(pkg.version).toBe("2.0.1");
    expect(pkg.dependencies).toEqual({ next: "16.1.0", "left-pad": "^1.3.0" });
    expect(pkg.scripts.check).toBe("bun scripts/check.ts");
    expect(pkg.scripts.test).toBeUndefined();
    expect(pkg.scripts.upgrade).toBe("bunx create-amytis@latest upgrade");
  });
});

// A site cloned on Windows, where git's core.autocrlf is on by default.
function toCrlf(root: string): void {
  for (const rel of listFiles(root)) {
    const file = path.join(root, ...rel.split("/"));
    const buf = fs.readFileSync(file);
    if (!buf.includes(0)) fs.writeFileSync(file, buf.toString("utf8").replace(/\n/g, "\r\n"));
  }
}

describe("a site with CRLF line endings", () => {
  // Each test gets its own site, as one of them upgrades it.
  function crlfSite(): { site: string; base: string; target: string } {
    const { base, target } = makeReleases();
    const site = makeTmpDir();
    fs.cpSync(base, site, { recursive: true });
    setUpNewSite(site, { projectName: "windows", title: "Windows Site", description: "CRLF." });
    writeTree(site, { "src/both.ts": NINE_LINES("one", "9") });
    toCrlf(site);
    return { site, base, target };
  }

  test("counts files that differ only in line endings as unchanged", () => {
    const { site, base } = crlfSite();
    // Every file in src/ but the one the site edited.
    expect(shareUnchanged(site, base)).toBe(6 / 7);
  });

  test("is compared and merged with LF, and keeps its line endings", () => {
    const { site, base, target } = crlfSite();
    const plan = planUpgrade({ siteDir: site, baseDir: base, targetDir: target, labels, scratchDir: makeTmpDir() });
    const kinds = Object.fromEntries(plan.changes.map((c) => [c.path, c.kind]));
    expect(kinds["src/yours.ts"]).toBeUndefined();
    expect(kinds["src/clash.ts"]).toBe("update");
    expect(kinds["src/both.ts"]).toBe("merged");
    expect(kinds["site.config.ts"]).toBe("update");
    expect(kinds["package.json"]).toBe("update");
    expect(plan.changes.filter((c) => c.kind === "conflict" || c.kind === "kept").map((c) => c.path)).toEqual([]);

    applyPlan(site, plan);
    expect(read(site, "src/untouched.ts")).toBe("a2\r\n");
    expect(read(site, "src/both.ts")).toBe(NINE_LINES("one", "nine").replace(/\n/g, "\r\n"));
    // A file the site didn't have comes as the release has it.
    expect(read(site, "src/added.ts")).toBe("new\n");
    const config = read(site, "site.config.ts")!;
    expect(config).toContain("  linkCheck: 'warn',\r\n");
    expect(config).not.toMatch(/[^\r]\n/);
    expect(read(site, "package.json")).toContain(`"version": "2.0.1",\r\n`);
  });
});

describe.skipIf(process.platform === "win32")("symbolic links in the site", () => {
  test("are never written or deleted through", () => {
    const { base, target } = makeReleases();
    const site = makeTmpDir();
    fs.cpSync(base, site, { recursive: true });
    setUpNewSite(site, { projectName: "linked", title: "Linked", description: "Links." });
    const outside = makeTmpDir();
    // A file linked from outside the site, which the release changed...
    fs.writeFileSync(path.join(outside, "untouched.ts"), "a\n");
    fs.rmSync(path.join(site, "src", "untouched.ts"));
    fs.symlinkSync(path.join(outside, "untouched.ts"), path.join(site, "src", "untouched.ts"));
    // ...and a linked folder with a file the release removed.
    fs.cpSync(path.join(site, "src", "legacy"), path.join(outside, "legacy"), { recursive: true });
    fs.rmSync(path.join(site, "src", "legacy"), { recursive: true });
    fs.symlinkSync(path.join(outside, "legacy"), path.join(site, "src", "legacy"));

    const plan = planUpgrade({ siteDir: site, baseDir: base, targetDir: target, labels, scratchDir: makeTmpDir() });
    const byPath = Object.fromEntries(plan.changes.map((c) => [c.path, c]));
    expect(byPath["src/untouched.ts"]).toEqual({
      path: "src/untouched.ts",
      kind: "kept",
      reason: expect.stringContaining("it is a symbolic link"),
    });
    expect(byPath["src/legacy/old.ts"]).toEqual({
      path: "src/legacy/old.ts",
      kind: "kept",
      reason: expect.stringContaining("src/legacy is a symbolic link"),
    });

    applyPlan(site, plan);
    expect(read(outside, "untouched.ts")).toBe("a\n");
    expect(read(outside, "legacy/old.ts")).toBe("old\n");
    // The rest of the upgrade went ahead.
    expect(read(site, "src/added.ts")).toBe("new\n");
  });

  test("applyPlan checks every path before it writes any", () => {
    const site = makeTmpDir();
    const outside = makeTmpDir();
    fs.mkdirSync(path.join(site, "src"));
    fs.symlinkSync(outside, path.join(site, "src", "linked"));
    const plan: UpgradePlan = {
      changes: [
        { path: "src/first.ts", kind: "add", write: Buffer.from("1\n") },
        { path: "src/linked/out.ts", kind: "add", write: Buffer.from("2\n") },
      ],
      packageConflicts: [],
    };
    expect(() => applyPlan(site, plan)).toThrow("src/linked in the site is a symbolic link");
    expect(read(site, "src/first.ts")).toBeUndefined();
    expect(fs.readdirSync(outside)).toEqual([]);
  });
});

describe("a release that turns a folder into a file, or a file into a folder", () => {
  function releases(): { base: string; target: string } {
    const root = makeTmpDir();
    const base = path.join(root, "base");
    const target = path.join(root, "target");
    writeTree(base, {
      "package.json": PKG("2.0.0", { next: "16.0.0" }),
      "site.config.example.ts": STARTER(""),
      "src/widget/index.ts": "folder\n",
      "src/thing": "file\n",
    });
    writeTree(target, {
      "package.json": PKG("2.0.1", { next: "16.0.0" }),
      "site.config.example.ts": STARTER(""),
      "src/widget": "now a file\n",
      "src/thing/index.ts": "now a folder\n",
    });
    return { base, target };
  }

  function siteFrom(base: string): string {
    const site = makeTmpDir();
    fs.cpSync(base, site, { recursive: true });
    setUpNewSite(site, { projectName: "shapes", title: "Shapes", description: "Shapes." });
    return site;
  }

  test("deletes first, so the new file or folder takes the old one's place", () => {
    const { base, target } = releases();
    const site = siteFrom(base);
    const plan = planUpgrade({ siteDir: site, baseDir: base, targetDir: target, labels, scratchDir: makeTmpDir() });
    expect(plan.changes.filter((c) => c.kind === "kept")).toEqual([]);
    applyPlan(site, plan);
    expect(read(site, "src/widget")).toBe("now a file\n");
    expect(read(site, "src/thing/index.ts")).toBe("now a folder\n");
  });

  test("keeps the change for the owner when the site's own files are in the way", () => {
    const { base, target } = releases();
    const site = siteFrom(base);
    writeTree(site, { "src/widget/mine.ts": "mine\n", "src/thing": "changed\n" });
    const plan = planUpgrade({ siteDir: site, baseDir: base, targetDir: target, labels, scratchDir: makeTmpDir() });
    const byPath = Object.fromEntries(plan.changes.map((c) => [c.path, c]));
    expect(byPath["src/widget"]).toEqual({
      path: "src/widget",
      kind: "kept",
      reason: expect.stringContaining("src/widget is a folder in your site, where the new release has a file"),
    });
    expect(byPath["src/thing/index.ts"]).toEqual({
      path: "src/thing/index.ts",
      kind: "kept",
      reason: expect.stringContaining("src/thing is a file in your site, where the new release has a folder"),
    });
    // The old file in the folder stays too, so the site isn't left half way.
    expect(byPath["src/widget/index.ts"]).toEqual({
      path: "src/widget/index.ts",
      kind: "kept",
      reason: "kept with src/widget, which the new release turns into a file",
    });
    applyPlan(site, plan);
    expect(read(site, "src/widget/mine.ts")).toBe("mine\n");
    expect(read(site, "src/widget/index.ts")).toBe("folder\n");
    expect(read(site, "src/thing")).toBe("changed\n");
  });

  test("counts an empty folder inside as something in the way", () => {
    const { base, target } = releases();
    const site = siteFrom(base);
    fs.mkdirSync(path.join(site, "src", "widget", "cache"));
    const plan = planUpgrade({ siteDir: site, baseDir: base, targetDir: target, labels, scratchDir: makeTmpDir() });
    expect(plan.changes.find((c) => c.path === "src/widget")?.kind).toBe("kept");
    expect(plan.changes.find((c) => c.path === "src/widget/index.ts")?.kind).toBe("kept");
    applyPlan(site, plan);
    expect(read(site, "src/widget/index.ts")).toBe("folder\n");
    expect(fs.existsSync(path.join(site, "src", "widget", "cache"))).toBe(true);
  });

  test("a committed site swaps them without --force", () => {
    // git ls-files lists the folder's files, not the folder, which mustn't
    // make the folder look untracked.
    const { base, target } = releases();
    const site = siteFrom(base);
    git(site, "init", "-q");
    git(site, "add", "-A");
    git(site, "commit", "-qm", "site");
    const result = spawnSync(process.execPath, [path.join(import.meta.dir, "index.ts"), "upgrade", "--base-dir", base, "--target-dir", target, "--no-install"], { cwd: site, encoding: "utf8" });
    expect(result.stderr).toBe("");
    expect(result.status).toBe(0);
    expect(read(site, "src/widget")).toBe("now a file\n");
    expect(read(site, "src/thing/index.ts")).toBe("now a folder\n");
  });

  test("applyPlan refuses a plan that would, before it writes anything", () => {
    const site = makeTmpDir();
    writeTree(site, { "src/widget/mine.ts": "mine\n" });
    const plan: UpgradePlan = {
      changes: [
        { path: "src/first.ts", kind: "add", write: Buffer.from("1\n") },
        { path: "src/widget", kind: "add", write: Buffer.from("file\n") },
      ],
      packageConflicts: [],
    };
    expect(() => applyPlan(site, plan)).toThrow("src/widget is a folder in your site");
    expect(read(site, "src/first.ts")).toBeUndefined();
  });
});

describe("the release's copy of a kept file", () => {
  test("goes under a free name, so an earlier copy isn't overwritten", () => {
    const { base, target } = makeReleases();
    const site = makeSite(base);
    writeTree(site, { "README.md.amytis-new": "an earlier upgrade's copy\n" });
    const plan = planUpgrade({ siteDir: site, baseDir: base, targetDir: target, labels, scratchDir: makeTmpDir() });
    expect(plan.changes.find((c) => c.path === "README.md")?.newCopyPath).toBe("README.md.2.amytis-new");
    expect(plan.changes.find((c) => c.path === "src/dropped.ts")?.newCopyPath).toBe("src/dropped.ts.amytis-new");
    applyPlan(site, plan);
    expect(read(site, "README.md.amytis-new")).toBe("an earlier upgrade's copy\n");
    expect(read(site, "README.md.2.amytis-new")).toBe("# Amytis 2\n");
  });

  test("doesn't take a name the release itself writes", () => {
    const { base, target } = makeReleases();
    writeTree(target, { "README.md.amytis-new": "shipped by the release\n" });
    const site = makeSite(base);
    const plan = planUpgrade({ siteDir: site, baseDir: base, targetDir: target, labels, scratchDir: makeTmpDir() });
    expect(plan.changes.find((c) => c.path === "README.md")?.newCopyPath).toBe("README.md.2.amytis-new");
    applyPlan(site, plan);
    expect(read(site, "README.md.amytis-new")).toBe("shipped by the release\n");
    expect(read(site, "README.md.2.amytis-new")).toBe("# Amytis 2\n");
  });

  test("is never written over an existing file", () => {
    const site = makeTmpDir();
    writeTree(site, { "README.md.amytis-new": "mine\n" });
    const plan: UpgradePlan = {
      changes: [
        { path: "src/first.ts", kind: "add", write: Buffer.from("1\n") },
        { path: "README.md", kind: "kept", newCopy: Buffer.from("theirs\n"), newCopyPath: "README.md.amytis-new" },
      ],
      packageConflicts: [],
    };
    expect(() => applyPlan(site, plan)).toThrow("README.md.amytis-new exists already");
    expect(read(site, "README.md.amytis-new")).toBe("mine\n");
    expect(read(site, "src/first.ts")).toBeUndefined();
  });
});

describe("undoProblem", () => {
  function committedSite(gitignore = ""): { site: string; plan: UpgradePlan } {
    const { base, target } = makeReleases();
    const site = makeTmpDir();
    fs.cpSync(base, site, { recursive: true });
    setUpNewSite(site, { projectName: "undo", title: "Undo", description: "Undo." });
    if (gitignore) fs.appendFileSync(path.join(site, ".gitignore"), gitignore);
    git(site, "init", "-q");
    git(site, "add", "-A");
    git(site, "commit", "-qm", "site");
    return { site, plan: planUpgrade({ siteDir: site, baseDir: base, targetDir: target, labels, scratchDir: makeTmpDir() }) };
  }

  test("is null for a committed site", () => {
    const { site, plan } = committedSite();
    expect(undoProblem(site, plan)).toBeNull();
  });

  test("finds changes made after the upgrade started", () => {
    const { site, plan } = committedSite();
    fs.writeFileSync(path.join(site, "src", "yours.ts"), "edited while downloading\n");
    expect(undoProblem(site, plan)).toEqual({ kind: "dirty" });
  });

  test("finds files the plan changes that git doesn't track", () => {
    // Ignored, so git status shows nothing, and git restore can't bring it back.
    const { site, plan } = committedSite("src/untouched.ts\n");
    expect(undoProblem(site, plan)).toEqual({ kind: "untracked", paths: ["src/untouched.ts"] });
  });

  test("siteState changes with a new commit, which leaves the tree clean", () => {
    const { site } = committedSite();
    const before = siteState(site);
    fs.writeFileSync(path.join(site, "src", "yours.ts"), "committed while downloading\n");
    git(site, "commit", "-qam", "meanwhile");
    expect(sameSiteState(siteState(site), before)).toBe(false);
  });

  test("siteState changes with package.json's version, in or out of git", () => {
    const site = makeTmpDir();
    writeTree(site, { "package.json": JSON.stringify({ version: "2.0.0" }) });
    const before = siteState(site);
    // The base version the upgrade starts from is this snapshot's.
    expect(before).toEqual({ commit: null, version: "2.0.0" });
    expect(sameSiteState(siteState(site), before)).toBe(true);
    writeTree(site, { "package.json": JSON.stringify({ version: "2.0.2" }) });
    expect(sameSiteState(siteState(site), before)).toBe(false);
  });

  test("is no-repo outside git", () => {
    const site = makeTmpDir();
    expect(undoProblem(site, { changes: [], packageConflicts: [] })).toEqual({ kind: "no-repo" });
  });
});

describe("site.config.ts made from the demo site's own config", () => {
  test("is left alone, with a note", () => {
    const { base, target } = makeReleases();
    const site = makeTmpDir();
    fs.cpSync(base, site, { recursive: true });
    const demo = read(site, "site.config.ts");
    const plan = planUpgrade({ siteDir: site, baseDir: base, targetDir: target, labels, scratchDir: makeTmpDir() });
    expect(plan.changes.find((c) => c.path === "site.config.ts")).toBeUndefined();
    expect(plan.configNote).toContain("demo site's own config");
    applyPlan(site, plan);
    expect(read(site, "site.config.ts")).toBe(demo);
  });
});

// ---------------------------------------------------------------------------
// The command
// ---------------------------------------------------------------------------

describe("create-amytis upgrade", () => {
  const cli = path.join(import.meta.dir, "index.ts");
  const run = (cwd: string, ...args: string[]) =>
    spawnSync(process.execPath, [cli, "upgrade", ...args], { cwd, encoding: "utf8" });

  function cleanSite(): { site: string; base: string; target: string } {
    const { base, target } = makeReleases();
    const site = makeTmpDir();
    fs.cpSync(base, site, { recursive: true });
    setUpNewSite(site, { projectName: "fresh", title: "Fresh", description: "New." });
    return { site, base, target };
  }

  test("parses its options", () => {
    expect(parseUpgradeArgs(["--to", "v2.0.3", "--dry-run", "--no-install"])).toMatchObject({ to: "v2.0.3", dryRun: true, install: false });
    expect(() => parseUpgradeArgs(["--to"])).toThrow("--to needs a value");
    expect(() => parseUpgradeArgs(["--yes"])).toThrow("Unknown option: --yes");
  });

  test("won't upgrade a site outside git, which it couldn't undo", () => {
    const { site, base, target } = cleanSite();
    const result = run(site, "--base-dir", base, "--target-dir", target, "--no-install");
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("isn't in a git repository");
    expect(read(site, "src/untouched.ts")).toBe("a\n");
  });

  test("won't upgrade over uncommitted changes", () => {
    const { site, base, target } = cleanSite();
    git(site, "init", "-q");
    git(site, "add", "-A");
    git(site, "commit", "-qm", "site");
    fs.writeFileSync(path.join(site, "src", "yours.ts"), "unsaved\n");
    const result = run(site, "--base-dir", base, "--target-dir", target, "--no-install");
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("uncommitted changes");
  });

  test("upgrades a committed site, and exits 0 when nothing needs a look", () => {
    const { site, base, target } = cleanSite();
    git(site, "init", "-q");
    git(site, "add", "-A");
    git(site, "commit", "-qm", "site");
    const result = run(site, "--base-dir", base, "--target-dir", target, "--no-install");
    expect(result.stderr).toBe("");
    expect(result.status).toBe(0);
    expect(result.stdout).toContain("Upgrading from Amytis v2.0.0 to v2.0.1");
    expect(result.stdout).toContain("Upgrading to 2.0.1, from CHANGELOG.md:\n\n- Run bun install.");
    // git status wouldn't show an added file the site ignores, so they're listed.
    // Staged changes too: plain `git restore .` would keep them.
    expect(result.stdout).toContain("To undo the upgrade: git restore --staged --worktree ., delete the files it created");
    expect(result.stdout).toContain("delete the files it created, then run bun install. It created:\n  src/added.ts");
    expect(read(site, "src/untouched.ts")).toBe("a2\n");
    expect(JSON.parse(read(site, "package.json")!).version).toBe("2.0.1");
  });

  test.skipIf(process.platform === "win32")("fails when bun install does, after upgrading the files", () => {
    const { site, base, target } = cleanSite();
    git(site, "init", "-q");
    git(site, "add", "-A");
    git(site, "commit", "-qm", "site");
    const fakeBin = makeTmpDir();
    fs.writeFileSync(path.join(fakeBin, "bun"), "#!/bin/sh\nexit 42\n", { mode: 0o755 });
    const result = spawnSync(process.execPath, [cli, "upgrade", "--base-dir", base, "--target-dir", target], {
      cwd: site,
      encoding: "utf8",
      env: { ...process.env, PATH: `${fakeBin}${path.delimiter}${process.env.PATH}` },
    });
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("bun install failed (exit status 42)");
    expect(result.stdout).toContain("1. Install the new dependencies: bun install");
    expect(read(site, "src/untouched.ts")).toBe("a2\n");
  });

  test("won't change a file git doesn't track", () => {
    const { site, base, target } = cleanSite();
    fs.appendFileSync(path.join(site, ".gitignore"), "src/untouched.ts\n");
    git(site, "init", "-q");
    git(site, "add", "-A");
    git(site, "commit", "-qm", "site");
    const result = run(site, "--base-dir", base, "--target-dir", target, "--no-install");
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("git doesn't track them");
    expect(result.stderr).toContain("src/untouched.ts");
    expect(read(site, "src/untouched.ts")).toBe("a\n");
    expect(read(site, "src/added.ts")).toBeUndefined();
  });

  test("with --force over uncommitted changes, lists every file instead of git's undo", () => {
    const { site, base, target } = cleanSite();
    git(site, "init", "-q");
    git(site, "add", "-A");
    git(site, "commit", "-qm", "site");
    fs.writeFileSync(path.join(site, "src", "yours.ts"), "unsaved\n");
    const result = run(site, "--base-dir", base, "--target-dir", target, "--no-install", "--force");
    expect(result.status).toBe(0);
    expect(result.stdout).toContain("update   src/untouched.ts");
    expect(result.stdout).toContain("Git can't undo this upgrade by itself");
    expect(result.stdout).not.toContain("git restore");
    expect(read(site, "src/yours.ts")).toBe("unsaved\n");
  });

  test("says so when the release changed nothing the site has", () => {
    const { site, base } = cleanSite();
    const result = run(site, "--base-dir", base, "--target-dir", base, "--dry-run");
    expect(result.status).toBe(0);
    expect(result.stdout).toContain("Nothing to change");
  });

  test("--dry-run changes nothing, and needs no git", () => {
    const { site, base, target } = cleanSite();
    const result = run(site, "--base-dir", base, "--target-dir", target, "--dry-run");
    expect(result.status).toBe(0);
    expect(result.stdout).toContain("update   src/untouched.ts");
    expect(result.stdout).toContain("Dry run: nothing was changed.");
    expect(read(site, "src/untouched.ts")).toBe("a\n");
  });

  test("refuses to run outside a site", () => {
    const result = run(makeTmpDir(), "--dry-run");
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("There's no package.json here");
    // `bun create amytis upgrade` runs the upgrade now, so say how to get that name.
    expect(result.stderr).toContain(`To create a site named "upgrade"`);
  });
});
