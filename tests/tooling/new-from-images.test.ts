import { describe, test, expect, afterAll, beforeAll } from "bun:test";
import { spawnSync } from "bun";
import fs from "fs";
import path from "path";

const SCRIPT_PATH = "scripts/new-from-images.ts";
const CONTENT_DIR = "content/posts";

describe("Tooling: New From Images Script", () => {
  const createdDirs: string[] = [];
  const tempDirs: string[] = [];

  // Helper to create a temp directory with dummy image files
  function createTempImageDir(
    name: string,
    files: string[]
  ): string {
    const dir = path.join("tests", "tooling", `__temp_${name}`);
    fs.mkdirSync(dir, { recursive: true });
    files.forEach((f) => {
      fs.writeFileSync(path.join(dir, f), "dummy-image-content");
    });
    tempDirs.push(dir);
    return dir;
  }

  afterAll(() => {
    // Cleanup created posts
    createdDirs.forEach((dir) => {
      if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true });
    });
    // Cleanup temp directories
    tempDirs.forEach((dir) => {
      if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true });
    });
  });

  test("fails without arguments (non-zero exit)", () => {
    const result = spawnSync(["bun", SCRIPT_PATH]);
    expect(result.exitCode).not.toBe(0);
  });

  test("fails with nonexistent folder", () => {
    const result = spawnSync(["bun", SCRIPT_PATH, "/nonexistent/folder/path"]);
    expect(result.exitCode).not.toBe(0);
  });

  test("fails with folder containing no images", () => {
    const dir = createTempImageDir("no-images", [
      "readme.txt",
      "document.pdf",
    ]);
    const result = spawnSync(["bun", SCRIPT_PATH, dir]);
    expect(result.exitCode).not.toBe(0);
  });

  test("creates post from folder with images", () => {
    const dir = createTempImageDir("with-images", [
      "photo1.jpg",
      "photo2.png",
      "photo3.webp",
    ]);

    const result = spawnSync(["bun", SCRIPT_PATH, dir]);
    expect(result.exitCode).toBe(0);

    const date = new Date().toISOString().split("T")[0];
    const slug = `__temp_with-images`
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)+/g, "");
    const dirName = `${date}-${slug}`;
    const postDir = path.join(CONTENT_DIR, dirName);
    createdDirs.push(postDir);

    expect(fs.existsSync(postDir)).toBe(true);

    const indexPath = path.join(postDir, "index.mdx");
    expect(fs.existsSync(indexPath)).toBe(true);

    const content = fs.readFileSync(indexPath, "utf-8");
    // Check frontmatter
    expect(content).toContain("title:");
    expect(content).toContain("date:");
    expect(content).toContain('category: "Gallery"');
    // Check image markdown references
    expect(content).toContain("![Image 1]");
    expect(content).toContain("![Image 2]");
    expect(content).toContain("![Image 3]");
  });

  test("respects --title flag", () => {
    const dir = createTempImageDir("title-test", ["img.jpg"]);
    const customTitle = "My Custom Gallery Title";

    const result = spawnSync([
      "bun",
      SCRIPT_PATH,
      dir,
      "--title",
      customTitle,
    ]);
    expect(result.exitCode).toBe(0);

    const date = new Date().toISOString().split("T")[0];
    const slug = customTitle
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)+/g, "");
    const dirName = `${date}-${slug}`;
    const postDir = path.join(CONTENT_DIR, dirName);
    createdDirs.push(postDir);

    const content = fs.readFileSync(path.join(postDir, "index.mdx"), "utf-8");
    expect(content).toContain(`title: "${customTitle}"`);
  });

  test("filters non-image files (.txt, .pdf excluded)", () => {
    const dir = createTempImageDir("filter-test", [
      "photo.jpg",
      "notes.txt",
      "doc.pdf",
      "image.png",
    ]);

    const result = spawnSync(["bun", SCRIPT_PATH, dir]);
    expect(result.exitCode).toBe(0);

    const date = new Date().toISOString().split("T")[0];
    const slug = "__temp_filter-test"
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)+/g, "");
    const dirName = `${date}-${slug}`;
    const postDir = path.join(CONTENT_DIR, dirName);
    createdDirs.push(postDir);

    const content = fs.readFileSync(path.join(postDir, "index.mdx"), "utf-8");
    // Should have exactly 2 image references (photo.jpg, image.png)
    expect(content).toContain("![Image 1]");
    expect(content).toContain("![Image 2]");
    expect(content).not.toContain("notes.txt");
    expect(content).not.toContain("doc.pdf");
  });

  test("all supported image extensions work", () => {
    const dir = createTempImageDir("extensions-test", [
      "a.jpg",
      "b.jpeg",
      "c.png",
      "d.gif",
      "e.webp",
      "f.svg",
      "g.avif",
    ]);

    const result = spawnSync(["bun", SCRIPT_PATH, dir]);
    expect(result.exitCode).toBe(0);

    const date = new Date().toISOString().split("T")[0];
    const slug = "__temp_extensions-test"
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)+/g, "");
    const dirName = `${date}-${slug}`;
    const postDir = path.join(CONTENT_DIR, dirName);
    createdDirs.push(postDir);

    const content = fs.readFileSync(path.join(postDir, "index.mdx"), "utf-8");
    // All 7 images should be referenced
    expect(content).toContain("![Image 7]");
  });
});
