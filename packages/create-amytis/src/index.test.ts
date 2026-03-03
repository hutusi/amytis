import { describe, test, expect, afterAll } from "bun:test";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { patchSiteConfig, patchPackageJson } from "./index";

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

const SAMPLE_PKG = JSON.stringify(
  {
    name: "@hutusi/amytis",
    version: "1.10.0",
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
    expect(pkg.version).toBe("1.10.0");
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
});
