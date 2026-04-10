import { afterEach, describe, expect, test } from "bun:test";
import fs from "fs";
import os from "os";
import path from "path";
import {
  collectHtmlFileHashes,
  getPagefindManifestPathForTests,
  shouldSkipPagefindBuild,
} from "../../scripts/build-pagefind";

const createdDirs: string[] = [];

afterEach(() => {
  for (const dir of createdDirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
  fs.rmSync(path.join(process.cwd(), ".cache", "pagefind"), { recursive: true, force: true });
});

function makeTempDir(prefix: string): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  createdDirs.push(dir);
  return dir;
}

describe("Tooling: build-pagefind", () => {
  test("collectHtmlFileHashes hashes HTML files by relative path", () => {
    const siteDir = makeTempDir("amytis-pagefind-site-");
    fs.mkdirSync(path.join(siteDir, "posts"), { recursive: true });
    fs.writeFileSync(path.join(siteDir, "index.html"), "<html><body>Home</body></html>", "utf8");
    fs.writeFileSync(path.join(siteDir, "posts", "hello.html"), "<html><body>Hello</body></html>", "utf8");
    fs.writeFileSync(path.join(siteDir, "notes.txt"), "ignore", "utf8");

    const hashes = collectHtmlFileHashes(siteDir);

    expect(Object.keys(hashes)).toEqual(["index.html", "posts/hello.html"]);
    expect(hashes["index.html"]).toBeTruthy();
    expect(hashes["posts/hello.html"]).toBeTruthy();
  });

  test("skips Pagefind when HTML hashes and output path are unchanged", () => {
    const siteDir = makeTempDir("amytis-pagefind-site-");
    const outputDir = makeTempDir("amytis-pagefind-out-");
    fs.writeFileSync(path.join(siteDir, "index.html"), "<html><body>Home</body></html>", "utf8");
    fs.writeFileSync(path.join(outputDir, "pagefind.js"), "stub", "utf8");

    const hashes = collectHtmlFileHashes(siteDir);
    const manifestPath = getPagefindManifestPathForTests(siteDir, outputDir);
    fs.mkdirSync(path.dirname(manifestPath), { recursive: true });
    fs.writeFileSync(
      manifestPath,
      JSON.stringify({
        version: "1",
        sitePath: path.resolve(siteDir),
        outputPath: path.resolve(outputDir),
        files: hashes,
      }),
      "utf8",
    );

    expect(shouldSkipPagefindBuild(siteDir, outputDir, hashes)).toBe(true);

    fs.writeFileSync(path.join(siteDir, "index.html"), "<html><body>Changed</body></html>", "utf8");
    expect(shouldSkipPagefindBuild(siteDir, outputDir, collectHtmlFileHashes(siteDir))).toBe(false);
  });
});
