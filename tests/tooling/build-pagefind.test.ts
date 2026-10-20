import { afterEach, describe, expect, test } from "bun:test";
import fs from "fs";
import os from "os";
import path from "path";
import {
  collectHtmlFileHashes,
  findTruncatedOutputs,
  getPagefindManifestPathForTests,
  shouldSkipPagefindBuild,
  writeIndexFiles,
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

  test("findTruncatedOutputs reports empty files anywhere in the output", () => {
    const outputDir = makeTempDir("amytis-pagefind-out-");
    fs.mkdirSync(path.join(outputDir, "fragment"));
    fs.writeFileSync(path.join(outputDir, "pagefind.js"), "export{}", "utf8");
    fs.writeFileSync(path.join(outputDir, "pagefind-worker.js"), "", "utf8");
    fs.writeFileSync(path.join(outputDir, "fragment", "a.pf_fragment"), "", "utf8");
    expect(findTruncatedOutputs(outputDir)).toEqual(["fragment/a.pf_fragment", "pagefind-worker.js"]);
    expect(findTruncatedOutputs(path.join(outputDir, "missing"))).toEqual([]);
  });

  test("writeIndexFiles writes every file, nested ones included, byte for byte", () => {
    const outputDir = path.join(makeTempDir("amytis-pagefind-out-"), "pagefind");
    const wasm = new Uint8Array([0, 97, 115, 109]);
    writeIndexFiles(outputDir, [
      { path: "pagefind.js", content: new TextEncoder().encode("export{}") },
      { path: "fragment/en_a.pf_fragment", content: wasm },
    ]);
    expect(fs.readFileSync(path.join(outputDir, "pagefind.js"), "utf8")).toBe("export{}");
    expect(new Uint8Array(fs.readFileSync(path.join(outputDir, "fragment", "en_a.pf_fragment")))).toEqual(wasm);
    expect(findTruncatedOutputs(outputDir)).toEqual([]);
  });

  test("a truncated output is never skipped as up to date", () => {
    const siteDir = makeTempDir("amytis-pagefind-site-");
    const outputDir = makeTempDir("amytis-pagefind-out-");
    fs.writeFileSync(path.join(siteDir, "index.html"), "<html><body>Home</body></html>", "utf8");
    fs.writeFileSync(path.join(outputDir, "pagefind.js"), "", "utf8");

    const hashes = collectHtmlFileHashes(siteDir);
    const manifestPath = getPagefindManifestPathForTests(siteDir, outputDir);
    fs.mkdirSync(path.dirname(manifestPath), { recursive: true });
    fs.writeFileSync(
      manifestPath,
      JSON.stringify({ version: "1", sitePath: path.resolve(siteDir), outputPath: path.resolve(outputDir), files: hashes }),
      "utf8",
    );

    expect(shouldSkipPagefindBuild(siteDir, outputDir, hashes)).toBe(false);
  });
});
