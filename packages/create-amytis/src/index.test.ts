import { describe, test, expect, afterAll } from "bun:test";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import {
  applyStarterConfig,
  buildExtractCommand,
  getArchiveMetadata,
  patchPackageJson,
  patchSiteConfig,
  removeEngineFiles,
  removeLocaleTrees,
  setUpNewSite,
  tagFromReleaseUrl,
} from "./index";

// Minimal site.config.ts that mirrors the real file's patchable fields.
// Inner backticks and `${` are escaped so they appear literally in the string.
const SAMPLE_CONFIG = `\
const siteConfig = {
  title: { en: "Amytis", zh: "Amytis" },
  description: { en: "Amytis — an elegant open-source framework for building your personal digital garden.", zh: "Amytis — 优雅的开源数字花园框架。" },
  footerText: { en: \`© \${new Date().getFullYear()} Amytis. All rights reserved.\`, zh: \`© \${new Date().getFullYear()} Amytis. 保留所有权利。\` },
  nav: [],
};
export default siteConfig;
`;

// The starter's shape (site.config.example.ts): plain strings, plus a nested
// hero title that must not be mistaken for the site title.
const SAMPLE_STARTER = `\
export const siteConfig = {
  title: "My Garden",
  description: "A personal digital garden — notes, articles, and ideas.",
  footerText: \`© \${new Date().getFullYear()} My Garden. All rights reserved.\`,
  hero: {
    title: "A place for ideas to grow",
  },
};
`;

const SAMPLE_PKG = JSON.stringify(
  {
    name: "@hutusi/amytis",
    version: "1.12.0",
    private: false,
    repository: { type: "git", url: "git+https://github.com/hutusi/amytis.git" },
    bugs: { url: "https://github.com/hutusi/amytis/issues" },
    homepage: "https://github.com/hutusi/amytis#readme",
    dependencies: { next: "16.1.6" },
  },
  null,
  2
) + "\n";

function makeTmpDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "create-amytis-test-"));
}

// ---------------------------------------------------------------------------
// patchSiteConfig
// ---------------------------------------------------------------------------

describe("patchSiteConfig", () => {
  const tmpDirs: string[] = [];

  afterAll(() => {
    for (const dir of tmpDirs) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  function setup(): string {
    const dir = makeTmpDir();
    tmpDirs.push(dir);
    fs.writeFileSync(path.join(dir, "site.config.ts"), SAMPLE_CONFIG);
    return dir;
  }

  test("replaces title in both en and zh locales", () => {
    const dir = setup();
    patchSiteConfig(dir, "My Awesome Blog", "Some description");
    const result = fs.readFileSync(path.join(dir, "site.config.ts"), "utf8");
    expect(result).toContain(`title: { en: "My Awesome Blog", zh: "My Awesome Blog" }`);
    expect(result).not.toContain(`en: "Amytis"`);
  });

  test("replaces description in both en and zh locales", () => {
    const dir = setup();
    patchSiteConfig(dir, "My Blog", "Notes from the garden");
    const result = fs.readFileSync(path.join(dir, "site.config.ts"), "utf8");
    expect(result).toContain(
      `description: { en: "Notes from the garden", zh: "Notes from the garden" }`
    );
    expect(result).not.toContain("elegant open-source framework");
  });

  test("replaces footerText with new title", () => {
    const dir = setup();
    patchSiteConfig(dir, "GardenSite", "My description");
    const result = fs.readFileSync(path.join(dir, "site.config.ts"), "utf8");
    expect(result).toContain("GardenSite. All rights reserved.");
    expect(result).toContain("GardenSite. 保留所有权利。");
    expect(result).not.toContain("Amytis. All rights reserved.");
  });

  test("handles title with special characters (quotes, apostrophes)", () => {
    const dir = setup();
    patchSiteConfig(dir, `Ada's "Blog"`, "A description");
    const result = fs.readFileSync(path.join(dir, "site.config.ts"), "utf8");
    // JSON.stringify will escape the quotes safely
    expect(result).toContain(`"Ada's \\"Blog\\""`);
  });

  test("inserts $-patterns literally instead of as replace() directives", () => {
    const dir = setup();
    // `$&` re-inserts the matched block and `$$` collapses to `$` under
    // String.replace string semantics — the function replacer must keep both.
    patchSiteConfig(dir, "Cash $$ & $& Money", "Costs $$5");
    const result = fs.readFileSync(path.join(dir, "site.config.ts"), "utf8");
    expect(result).toContain(`title: { en: "Cash $$ & $& Money", zh: "Cash $$ & $& Money" }`);
    expect(result).toContain(`description: { en: "Costs $$5", zh: "Costs $$5" }`);
  });

  test("preserves unrelated config fields", () => {
    const dir = setup();
    patchSiteConfig(dir, "My Blog", "My description");
    const result = fs.readFileSync(path.join(dir, "site.config.ts"), "utf8");
    expect(result).toContain("nav: []");
    expect(result).toContain("export default siteConfig");
  });

  test("does not throw when site.config.ts is missing", () => {
    const dir = makeTmpDir();
    tmpDirs.push(dir);
    // file intentionally absent
    expect(() => patchSiteConfig(dir, "Title", "Desc")).not.toThrow();
  });

  test("throws loudly when the config shape has drifted from the patch patterns", () => {
    const dir = makeTmpDir();
    tmpDirs.push(dir);
    // A shape the patcher doesn't know must not be silently skipped.
    fs.writeFileSync(
      path.join(dir, "site.config.ts"),
      `const siteTitle = "Amytis";\nexport const siteConfig = {\n  title: siteTitle,\n};\n`
    );
    expect(() => patchSiteConfig(dir, "Title", "Desc")).toThrow(/out of sync/);
  });

  test("patches the starter's plain-string fields and leaves the hero title alone", () => {
    const dir = makeTmpDir();
    tmpDirs.push(dir);
    fs.writeFileSync(path.join(dir, "site.config.ts"), SAMPLE_STARTER);
    patchSiteConfig(dir, "Tom $& Jerry", "Notes on $1");
    const result = fs.readFileSync(path.join(dir, "site.config.ts"), "utf8");
    expect(result).toContain(`  title: "Tom $& Jerry",`);
    expect(result).toContain(`  description: "Notes on $1",`);
    expect(result).toContain("  footerText: `© ${new Date().getFullYear()} Tom $& Jerry. All rights reserved.`,");
    expect(result).toContain(`    title: "A place for ideas to grow",`);
    expect(result).not.toContain("My Garden");
  });
});

// ---------------------------------------------------------------------------
// applyStarterConfig
// ---------------------------------------------------------------------------

describe("applyStarterConfig", () => {
  const tmpDirs: string[] = [];

  afterAll(() => {
    for (const dir of tmpDirs) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  test("replaces the demo site's config with the starter, keeping the starter", () => {
    const dir = makeTmpDir();
    tmpDirs.push(dir);
    fs.writeFileSync(path.join(dir, "site.config.ts"), SAMPLE_CONFIG);
    fs.writeFileSync(path.join(dir, "site.config.example.ts"), SAMPLE_STARTER);
    expect(applyStarterConfig(dir)).toBe(true);
    expect(fs.readFileSync(path.join(dir, "site.config.ts"), "utf8")).toBe(SAMPLE_STARTER);
    expect(fs.existsSync(path.join(dir, "site.config.example.ts"))).toBe(true);
  });

  test("removes locale trees, which a single-language site can't build", () => {
    const dir = makeTmpDir();
    tmpDirs.push(dir);
    for (const sub of ["posts", "series", "zh/posts", "pt-BR/posts", "images"]) {
      fs.mkdirSync(path.join(dir, "content", sub), { recursive: true });
    }
    expect(removeLocaleTrees(dir).sort()).toEqual(["content/pt-BR/", "content/zh/"]);
    expect(fs.readdirSync(path.join(dir, "content")).sort()).toEqual(["images", "posts", "series"]);
  });

  test("leaves site.config.ts as it is when there is no starter", () => {
    const dir = makeTmpDir();
    tmpDirs.push(dir);
    fs.writeFileSync(path.join(dir, "site.config.ts"), SAMPLE_CONFIG);
    expect(applyStarterConfig(dir)).toBe(false);
    expect(fs.readFileSync(path.join(dir, "site.config.ts"), "utf8")).toBe(SAMPLE_CONFIG);
  });
});

// ---------------------------------------------------------------------------
// removeEngineFiles
// ---------------------------------------------------------------------------

describe("removeEngineFiles", () => {
  const tmpDirs: string[] = [];

  afterAll(() => {
    for (const dir of tmpDirs) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  test("removes the repo's tests, CI and tooling, and keeps the site's own files", () => {
    const dir = makeTmpDir();
    tmpDirs.push(dir);
    const files = [
      ".github/workflows/ci.yml",
      ".entire/settings.json",
      "packages/create-amytis/src/index.ts",
      "tests/integration/a.test.ts",
      "src/test-utils/render.ts",
      "src/lib/a.ts",
      "src/lib/a.test.ts",
      "src/components/B.tsx",
      "src/components/ui/C.test.tsx",
      "playwright.config.ts",
      "TODO.md",
      "docs/guide.md",
      "scripts/new-post.ts",
      "content/posts/hello.md",
      "CHANGELOG.md",
    ];
    for (const file of files) {
      fs.mkdirSync(path.dirname(path.join(dir, file)), { recursive: true });
      fs.writeFileSync(path.join(dir, file), "");
    }

    expect(removeEngineFiles(dir)).toEqual([
      ".github/",
      ".entire/",
      "packages/",
      "tests/",
      "src/test-utils/",
      "playwright.config.ts",
      "TODO.md",
      "src/**/*.test.ts(x) (2 files)",
    ]);
    const left = files.filter((file) => fs.existsSync(path.join(dir, file)));
    expect(left).toEqual(["src/lib/a.ts", "src/components/B.tsx", "docs/guide.md", "scripts/new-post.ts", "content/posts/hello.md", "CHANGELOG.md"]);
  });

  test("does nothing in a directory without them", () => {
    const dir = makeTmpDir();
    tmpDirs.push(dir);
    expect(removeEngineFiles(dir)).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// tagFromReleaseUrl
// ---------------------------------------------------------------------------

describe("tagFromReleaseUrl", () => {
  test("reads the tag from the /releases/latest redirect", () => {
    expect(tagFromReleaseUrl("https://github.com/hutusi/amytis/releases/tag/v2.0.1")).toBe("v2.0.1");
    expect(tagFromReleaseUrl("/hutusi/amytis/releases/tag/v2.1.0-beta.1/")).toBe("v2.1.0-beta.1");
  });

  test("is null for a repo without releases, which redirects to /releases", () => {
    expect(tagFromReleaseUrl("https://github.com/hutusi/amytis/releases")).toBeNull();
  });

  test("refuses a tag that could leave the download folder or break the URL", () => {
    expect(tagFromReleaseUrl("https://github.com/hutusi/amytis/releases/tag/..")).toBeNull();
    expect(tagFromReleaseUrl("https://github.com/hutusi/amytis/releases/tag/v1%2F..%2Fx")).toBeNull();
    expect(tagFromReleaseUrl("https://github.com/hutusi/amytis/releases/tag/v1?x=1")).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Sync with the real repo files
//
// The scaffolder patches whatever site.config.ts / package.json ship in the
// release tarball via shape-sensitive patterns. These tests run the patchers
// against the REAL root files, so any schema change that would silently break
// generated projects fails CI here first.
// ---------------------------------------------------------------------------

const repoRoot = path.resolve(import.meta.dir, "..", "..", "..");

describe("sync with the real repo files", () => {
  const tmpDirs: string[] = [];

  afterAll(() => {
    for (const dir of tmpDirs) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  test("a new site gets the real starter config, patched", () => {
    const dir = makeTmpDir();
    tmpDirs.push(dir);
    // The release ships both files; the demo site's own config must not survive.
    fs.copyFileSync(path.join(repoRoot, "site.config.ts"), path.join(dir, "site.config.ts"));
    fs.copyFileSync(path.join(repoRoot, "site.config.example.ts"), path.join(dir, "site.config.example.ts"));

    expect(applyStarterConfig(dir)).toBe(true);
    patchSiteConfig(dir, "Sync Check Garden", "A sync-check description");

    const result = fs.readFileSync(path.join(dir, "site.config.ts"), "utf8");
    expect(result).toContain(`  title: "Sync Check Garden",`);
    expect(result).toContain(`  description: "A sync-check description",`);
    expect(result).toContain("Sync Check Garden. All rights reserved.");
    // removeLocaleTrees relies on the starter being single-language.
    expect(result).toMatch(/enabled: false,\s*defaultLocale: 'en',\s*locales: \['en'\],/);
    expect(result).not.toContain("amytis.vercel.app");
    // Placeholder social links, not the demo site author's.
    expect(result).toContain(`github: "https://github.com/your-username"`);
    expect(result).not.toContain("twitter.com/hutusi");
  });

  test("setUpNewSite turns the real files into a new site", () => {
    const dir = makeTmpDir();
    tmpDirs.push(dir);
    for (const file of ["site.config.ts", "site.config.example.ts", "package.json"]) {
      fs.copyFileSync(path.join(repoRoot, file), path.join(dir, file));
    }
    fs.mkdirSync(path.join(dir, "content", "zh"), { recursive: true });
    fs.mkdirSync(path.join(dir, "tests"));

    const result = setUpNewSite(dir, { projectName: "sync-check", title: "Sync Check", description: "A new site" });
    expect(result).toEqual({ starter: true, localeTrees: ["content/zh/"], engineFiles: ["tests/"] });
    expect(fs.readFileSync(path.join(dir, "site.config.ts"), "utf8")).toContain(`  title: "Sync Check",`);
    expect(JSON.parse(fs.readFileSync(path.join(dir, "package.json"), "utf8")).name).toBe("sync-check");
  });

  test("create-amytis names the repository that publishes it", () => {
    // npm checks a Trusted Publishing provenance statement against
    // repository.url and refuses the publish when it is missing or differs.
    const own = JSON.parse(fs.readFileSync(path.join(import.meta.dir, "..", "package.json"), "utf8"));
    const root = JSON.parse(fs.readFileSync(path.join(repoRoot, "package.json"), "utf8"));
    expect(own.repository).toEqual({ ...root.repository, directory: "packages/create-amytis" });
  });

  test("patchPackageJson patches the real package.json", () => {
    const dir = makeTmpDir();
    tmpDirs.push(dir);
    fs.copyFileSync(path.join(repoRoot, "package.json"), path.join(dir, "package.json"));

    patchPackageJson(dir, "sync-check-garden");

    const pkg = JSON.parse(fs.readFileSync(path.join(dir, "package.json"), "utf8")) as Record<
      string,
      unknown
    >;
    expect(pkg.name).toBe("sync-check-garden");
    expect(pkg.private).toBe(true);
    expect(pkg.repository).toBeUndefined();
    expect(pkg.bugs).toBeUndefined();
    expect(pkg.homepage).toBeUndefined();
    // The scaffolded project must keep its build scripts intact.
    const scripts = pkg.scripts as Record<string, string>;
    expect(scripts.build).toBeTruthy();
    // ...and lose the ones that run the engine's tests, which aren't shipped.
    expect(Object.keys(scripts).filter((name) => name.startsWith("test"))).toEqual([]);
    for (const [name, command] of Object.entries(scripts)) {
      expect({ name, command }).toEqual({ name, command: expect.not.stringMatching(/\btests\/|packages\/|playwright|bun run test/) });
    }
    expect(scripts.validate).toBe("bun run lint && bun run typecheck && bun run build:dev");
    // ...and gain the one that brings in a newer release.
    expect(scripts.upgrade).toBe("bunx create-amytis@latest upgrade");
  });
});

// ---------------------------------------------------------------------------
// patchPackageJson
// ---------------------------------------------------------------------------

describe("patchPackageJson", () => {
  const tmpDirs: string[] = [];

  afterAll(() => {
    for (const dir of tmpDirs) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  function setup(): string {
    const dir = makeTmpDir();
    tmpDirs.push(dir);
    fs.writeFileSync(path.join(dir, "package.json"), SAMPLE_PKG);
    return dir;
  }

  function readPkg(dir: string): Record<string, unknown> {
    return JSON.parse(fs.readFileSync(path.join(dir, "package.json"), "utf8")) as Record<
      string,
      unknown
    >;
  }

  test("sets name to project name", () => {
    const dir = setup();
    patchPackageJson(dir, "my-garden");
    expect(readPkg(dir).name).toBe("my-garden");
  });

  test("sets private to true", () => {
    const dir = setup();
    patchPackageJson(dir, "my-garden");
    expect(readPkg(dir).private).toBe(true);
  });

  test("removes repository field", () => {
    const dir = setup();
    patchPackageJson(dir, "my-garden");
    expect(readPkg(dir).repository).toBeUndefined();
  });

  test("removes bugs field", () => {
    const dir = setup();
    patchPackageJson(dir, "my-garden");
    expect(readPkg(dir).bugs).toBeUndefined();
  });

  test("removes homepage field", () => {
    const dir = setup();
    patchPackageJson(dir, "my-garden");
    expect(readPkg(dir).homepage).toBeUndefined();
  });

  test("preserves version and dependencies", () => {
    const dir = setup();
    patchPackageJson(dir, "my-garden");
    const pkg = readPkg(dir);
    expect(pkg.version).toBe("1.12.0");
    expect(pkg.dependencies).toEqual({ next: "16.1.6" });
  });

  test("output is valid JSON with trailing newline", () => {
    const dir = setup();
    patchPackageJson(dir, "my-garden");
    const raw = fs.readFileSync(path.join(dir, "package.json"), "utf8");
    expect(() => JSON.parse(raw)).not.toThrow();
    expect(raw.endsWith("\n")).toBe(true);
  });

  test("does not throw when package.json is missing", () => {
    const dir = makeTmpDir();
    tmpDirs.push(dir);
    // file intentionally absent
    expect(() => patchPackageJson(dir, "my-garden")).not.toThrow();
  });

  test("drops the test scripts and the test step of validate, and adds upgrade", () => {
    const dir = makeTmpDir();
    tmpDirs.push(dir);
    fs.writeFileSync(path.join(dir, "package.json"), JSON.stringify({
      name: "@hutusi/amytis",
      scripts: {
        build: "next build",
        test: "bun test src && bun run test:int",
        "test:int": "bun test tests/integration",
        testing: "kept: only test and test:* are the engine's",
        validate: "bun run lint && bun run test && bun run build:dev",
      },
    }));
    patchPackageJson(dir, "my-garden");
    expect(readPkg(dir).scripts).toEqual({
      build: "next build",
      testing: "kept: only test and test:* are the engine's",
      validate: "bun run lint && bun run build:dev",
      upgrade: "bunx create-amytis@latest upgrade",
    });
  });
});

describe("getArchiveMetadata", () => {
  test("uses zip archives on Windows", () => {
    const archive = getArchiveMetadata("v1.13.0", "win32");
    expect(archive.kind).toBe("zip");
    expect(archive.filename).toBe("amytis-v1.13.0.zip");
    expect(archive.url).toBe("https://github.com/hutusi/amytis/archive/refs/tags/v1.13.0.zip");
  });

  test("uses tar.gz archives on non-Windows platforms", () => {
    const archive = getArchiveMetadata("v1.13.0", "darwin");
    expect(archive.kind).toBe("tar.gz");
    expect(archive.filename).toBe("amytis-v1.13.0.tar.gz");
    expect(archive.url).toBe("https://github.com/hutusi/amytis/archive/refs/tags/v1.13.0.tar.gz");
  });
});

describe("buildExtractCommand", () => {
  test("builds the PowerShell Expand-Archive command on Windows", () => {
    const command = buildExtractCommand("C:\\tmp\\amytis-v1.13.0.zip", "C:\\tmp\\my-garden.__tmp__", "zip", "win32");
    expect(command.command).toBe("powershell.exe");
    expect(command.args).toEqual([
      "-NoProfile",
      "-NonInteractive",
      "-ExecutionPolicy",
      "Bypass",
      "-Command",
      "Expand-Archive -LiteralPath 'C:\\tmp\\amytis-v1.13.0.zip' -DestinationPath 'C:\\tmp\\my-garden.__tmp__' -Force",
    ]);
  });

  test("keeps Windows paths with spaces and quotes as one PowerShell literal each", () => {
    // PowerShell joins the arguments after -Command once Windows has removed
    // their quotes, so the whole command must be one argument.
    const archive = "C:\\Users\\Jane Doe\\AppData\\Local\\Temp\\amytis-v2.0.2.zip";
    const out = "C:\\Users\\Jane Doe\\O'Brien’s sites\\my-garden.__tmp__";
    const command = buildExtractCommand(archive, out, "zip", "win32");
    expect(command.args.slice(5)).toEqual([
      "Expand-Archive -LiteralPath 'C:\\Users\\Jane Doe\\AppData\\Local\\Temp\\amytis-v2.0.2.zip' " +
        "-DestinationPath 'C:\\Users\\Jane Doe\\O''Brien’’s sites\\my-garden.__tmp__' -Force",
    ]);
  });

  test("builds the tar extraction command on non-Windows platforms", () => {
    const command = buildExtractCommand("/tmp/amytis-v1.13.0.tar.gz", "/tmp/my-garden.__tmp__", "tar.gz", "darwin");
    expect(command.command).toBe("tar");
    expect(command.args).toEqual(["xzf", "/tmp/amytis-v1.13.0.tar.gz", "-C", "/tmp/my-garden.__tmp__"]);
  });
});
