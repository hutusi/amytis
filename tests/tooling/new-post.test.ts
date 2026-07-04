import { describe, test, expect, afterAll } from "bun:test";
import { spawnSync } from "bun";
import fs from "fs";
import path from "path";

const SCRIPT_PATH = "scripts/new-post.ts";
const CONTENT_DIR = "content/posts";

describe("Tooling: New Post Script", () => {
  const createdFiles: string[] = [];
  const createdDirs: string[] = [];

  afterAll(() => {
    // Cleanup
    createdFiles.forEach(file => {
      if (fs.existsSync(file)) fs.unlinkSync(file);
    });
    createdDirs.forEach(dir => {
      if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
    });
  });

  test("should create a standard post", () => {
    const title = "Test Standard Post";
    const result = spawnSync(["bun", SCRIPT_PATH, title]);
    
    expect(result.exitCode).toBe(0);
    
    const date = new Date().toISOString().split('T')[0];
    const slug = "test-standard-post";
    const filename = `${date}-${slug}.mdx`;
    const filePath = path.join(CONTENT_DIR, filename);
    
    expect(fs.existsSync(filePath)).toBe(true);
    createdFiles.push(filePath);
    
    const content = fs.readFileSync(filePath, "utf-8");
    expect(content).toContain(`title: "${title}"`);
  });

  test("should create a prefixed post", () => {
    const title = "Test Prefixed Post";
    const prefix = "weekly";
    const result = spawnSync(["bun", SCRIPT_PATH, title, "--prefix", prefix]);
    
    expect(result.exitCode).toBe(0);
    
    const date = new Date().toISOString().split('T')[0];
    const slug = "test-prefixed-post";
    const filename = `${date}-${prefix}-${slug}.mdx`;
    const filePath = path.join(CONTENT_DIR, filename);
    
    expect(fs.existsSync(filePath)).toBe(true);
    createdFiles.push(filePath);
  });

  test("should refuse to overwrite an existing post", () => {
    const title = "Test Duplicate Post";
    const first = spawnSync(["bun", SCRIPT_PATH, title]);
    expect(first.exitCode).toBe(0);

    const date = new Date().toISOString().split('T')[0];
    const filePath = path.join(CONTENT_DIR, `${date}-test-duplicate-post.mdx`);
    expect(fs.existsSync(filePath)).toBe(true);
    createdFiles.push(filePath);

    const second = spawnSync(["bun", SCRIPT_PATH, title]);
    expect(second.exitCode).toBe(1);
    expect(second.stderr.toString()).toContain("Error: Post already exists at");
  });

  test("should create a folder post", () => {
    const title = "Test Folder Post";
    const result = spawnSync(["bun", SCRIPT_PATH, title, "--folder"]);
    
    expect(result.exitCode).toBe(0);
    
    const date = new Date().toISOString().split('T')[0];
    const slug = "test-folder-post";
    const dirName = `${date}-${slug}`;
    const dirPath = path.join(CONTENT_DIR, dirName);
    const filePath = path.join(dirPath, "index.mdx");
    
    expect(fs.existsSync(filePath)).toBe(true);
    createdDirs.push(dirPath); // Will remove dir recursively
  });
});
