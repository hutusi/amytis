import { describe, expect, test, beforeEach, afterEach } from "bun:test";
import { spawnSync } from "child_process";
import { mkdirSync, mkdtempSync, rmSync, existsSync, readFileSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import path from "path";
import matter from "gray-matter";

const SCRIPT = path.resolve("scripts/sync-vuepress-book.ts");
const FIXTURE_SOURCE = path.resolve("tests/fixtures/sync-vuepress-book/docs");

function runSync(source: string, dest: string) {
  return spawnSync("bun", ["run", SCRIPT, source, dest], {
    encoding: "utf8",
    cwd: process.cwd(),
  });
}

describe("Integration: sync-vuepress-book script", () => {
  let dest: string;

  beforeEach(() => {
    dest = mkdtempSync(path.join(tmpdir(), "sync-vuepress-book-"));
  });

  afterEach(() => {
    if (dest && existsSync(dest)) rmSync(dest, { recursive: true, force: true });
  });

  test("runs end-to-end and produces the expected layout", () => {
    const res = runSync(FIXTURE_SOURCE, dest);
    expect(res.status).toBe(0);

    // Markdown content was rsynced verbatim (no rewriting on copy).
    expect(existsSync(path.join(dest, "intro", "welcome.md"))).toBe(true);
    expect(existsSync(path.join(dest, "maths", "linear", "vectors.md"))).toBe(true);
    expect(existsSync(path.join(dest, "maths", "linear", "matrices.md"))).toBe(true);

    // Asset folders co-located with chapters were copied.
    expect(existsSync(path.join(dest, "maths", "linear", "assets", "diagram.png"))).toBe(true);

    // .vuepress was excluded.
    expect(existsSync(path.join(dest, ".vuepress"))).toBe(false);

    // index.mdx exists with parsed nested TOC.
    const indexPath = path.join(dest, "index.mdx");
    expect(existsSync(indexPath)).toBe(true);
    const { data } = matter(readFileSync(indexPath, "utf8")) as unknown as { data: Record<string, unknown> };
    expect(data.title).toBe("Fixture Book");
    const chapters = data.chapters as Array<Record<string, unknown>>;
    expect(chapters[0]).toMatchObject({ title: "Intro", id: "intro/welcome" });
    expect(chapters[1]).toMatchObject({ section: "Maths" });
    const mathsItems = (chapters[1].items as Array<Record<string, unknown>>);
    expect(mathsItems[0]).toMatchObject({ section: "Linear Algebra" });
    const linearItems = mathsItems[0].items as Array<Record<string, unknown>>;
    expect(linearItems).toEqual([
      { title: "Vectors", id: "maths/linear/vectors" },
      { title: "Matrices", id: "maths/linear/matrices" },
    ]);
  });

  test("preserves user-controlled frontmatter on re-run", () => {
    // First run creates index.mdx.
    expect(runSync(FIXTURE_SOURCE, dest).status).toBe(0);

    // Author edits cover image + featured flag.
    const indexPath = path.join(dest, "index.mdx");
    const parsed = matter(readFileSync(indexPath, "utf8")) as unknown as { data: Record<string, unknown>; content: string };
    const edited = matter.stringify(parsed.content, {
      ...parsed.data,
      coverImage: "text:FB",
      featured: true,
      excerpt: "A tiny book for tests.",
    });
    writeFileSync(indexPath, edited);

    // Re-run should keep the edited fields and refresh `chapters`.
    expect(runSync(FIXTURE_SOURCE, dest).status).toBe(0);
    const { data: refreshed } = matter(readFileSync(indexPath, "utf8")) as unknown as { data: Record<string, unknown> };
    expect(refreshed.coverImage).toBe("text:FB");
    expect(refreshed.featured).toBe(true);
    expect(refreshed.excerpt).toBe("A tiny book for tests.");
    expect(Array.isArray(refreshed.chapters)).toBe(true);
  });

  test("exits with an error when a sidebar leaf points to a missing source file", () => {
    // Create a corrupt config with a broken link.
    const broken = mkdtempSync(path.join(tmpdir(), "sync-broken-"));
    try {
      const docsDir = path.join(broken, "docs");
      const vp = path.join(docsDir, ".vuepress");
      mkdirSync(vp, { recursive: true });
      writeFileSync(
        path.join(vp, "config.js"),
        "export default { theme: { sidebar: [{ text: 'Missing', link: '/nope' }] } }\n",
      );
      const res = runSync(docsDir, dest);
      expect(res.status).not.toBe(0);
      expect(res.stderr).toContain("source files that do not exist");
    } finally {
      rmSync(broken, { recursive: true, force: true });
    }
  });
});
