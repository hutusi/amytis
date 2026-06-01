import { describe, expect, test, beforeEach, afterEach } from "bun:test";
import { spawnSync } from "child_process";
import { mkdirSync, mkdtempSync, rmSync, existsSync, readFileSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import path from "path";
import matter from "gray-matter";

const FIXTURE_SOURCE = path.resolve("tests/fixtures/sync-vuepress-book/docs");

// Invoke through the published `bun run sync-vuepress-book` entrypoint and the
// `--source` / `--dest` flags so the test exercises everything a real user does:
// the package.json script wiring + the CLI argv parser, not just the inner sync
// pipeline.
function runSync(source: string, dest: string) {
  return spawnSync(
    "bun",
    ["run", "sync-vuepress-book", "--source", source, "--dest", dest],
    {
      encoding: "utf8",
      cwd: process.cwd(),
    },
  );
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

  test("prunes dest files removed upstream (mirror semantics)", () => {
    // First sync — dest now has every fixture file.
    expect(runSync(FIXTURE_SOURCE, dest).status).toBe(0);
    expect(existsSync(path.join(dest, "maths", "linear", "matrices.md"))).toBe(true);

    // Simulate an upstream deletion by syncing from a smaller temp source tree
    // (just the bits we need for the still-listed chapters) and a config that
    // no longer references matrices.
    const trimmed = mkdtempSync(path.join(tmpdir(), "sync-trimmed-"));
    try {
      const docs = path.join(trimmed, "docs");
      const vp = path.join(docs, ".vuepress");
      mkdirSync(vp, { recursive: true });
      writeFileSync(
        path.join(vp, "config.js"),
        `export default {
          title: 'Fixture Book',
          theme: { sidebar: [{ text: 'Vectors', link: '/maths/linear/vectors' }] },
        }
        `,
      );
      mkdirSync(path.join(docs, "maths", "linear"), { recursive: true });
      writeFileSync(path.join(docs, "maths", "linear", "vectors.md"), "---\ntitle: Vectors\n---\n# Vectors\n");

      expect(runSync(docs, dest).status).toBe(0);

      // Vectors survives, matrices is gone, the now-empty assets/ dir is cleaned up.
      expect(existsSync(path.join(dest, "maths", "linear", "vectors.md"))).toBe(true);
      expect(existsSync(path.join(dest, "maths", "linear", "matrices.md"))).toBe(false);
      expect(existsSync(path.join(dest, "intro"))).toBe(false);
      expect(existsSync(path.join(dest, "maths", "linear", "assets"))).toBe(false);
      // index.mdx is regenerated, not pruned.
      expect(existsSync(path.join(dest, "index.mdx"))).toBe(true);
    } finally {
      rmSync(trimmed, { recursive: true, force: true });
    }
  });

  test("preserves user-added dotfiles on re-run (out-of-band overlay state)", () => {
    expect(runSync(FIXTURE_SOURCE, dest).status).toBe(0);
    const dotfile = path.join(dest, ".gitkeep");
    writeFileSync(dotfile, "");
    expect(runSync(FIXTURE_SOURCE, dest).status).toBe(0);
    expect(existsSync(dotfile)).toBe(true);
  });

  test("resolves folder-index sidebar links (e.g. /guide/ → guide/README.md)", () => {
    const folder = mkdtempSync(path.join(tmpdir(), "sync-folder-"));
    try {
      const docs = path.join(folder, "docs");
      const vp = path.join(docs, ".vuepress");
      mkdirSync(vp, { recursive: true });
      writeFileSync(
        path.join(vp, "config.js"),
        `export default {
          title: 'Folder-Index Book',
          theme: { sidebar: [{ text: 'Guide', link: '/guide/' }] },
        }
        `,
      );
      mkdirSync(path.join(docs, "guide"), { recursive: true });
      writeFileSync(path.join(docs, "guide", "README.md"), "---\ntitle: Guide\n---\n# Guide\n");

      const res = runSync(docs, dest);
      expect(res.status).toBe(0);
      // The chapter id strips the trailing slash, so the folder-index target
      // exists at <dest>/guide/README.md and the TOC entry's id is `guide`.
      const { data } = matter(readFileSync(path.join(dest, "index.mdx"), "utf8")) as unknown as { data: Record<string, unknown> };
      expect((data.chapters as Array<{ id: string }>)[0].id).toBe("guide");
      expect(existsSync(path.join(dest, "guide", "README.md"))).toBe(true);
    } finally {
      rmSync(folder, { recursive: true, force: true });
    }
  });

  test("rejects a config.ts with a clear message instead of acorn parse failure", () => {
    const tsConfig = mkdtempSync(path.join(tmpdir(), "sync-ts-config-"));
    try {
      const docs = path.join(tsConfig, "docs");
      const vp = path.join(docs, ".vuepress");
      mkdirSync(vp, { recursive: true });
      writeFileSync(
        path.join(vp, "config.ts"),
        "const x: number = 1; export default { theme: { sidebar: [] } }\n",
      );
      const res = runSync(docs, dest);
      expect(res.status).not.toBe(0);
      expect(res.stderr).toMatch(/config\.ts/);
      expect(res.stderr).toMatch(/Compile to JavaScript|JS-only|acorn/);
    } finally {
      rmSync(tsConfig, { recursive: true, force: true });
    }
  });

  test("drops a leaf with id 'contents' from the TOC (Amytis renders its own)", () => {
    const withContents = mkdtempSync(path.join(tmpdir(), "sync-contents-"));
    try {
      const docs = path.join(withContents, "docs");
      const vp = path.join(docs, ".vuepress");
      mkdirSync(vp, { recursive: true });
      writeFileSync(
        path.join(vp, "config.js"),
        `export default {
          title: 'TOC-Heavy Book',
          theme: {
            sidebar: [
              { text: '目录', link: 'contents' },
              { text: 'Real', link: '/real-chapter' },
            ],
          },
        }
        `,
      );
      writeFileSync(path.join(docs, "contents.md"), "# Table of Contents\n- [Real](real-chapter.md)\n");
      writeFileSync(path.join(docs, "real-chapter.md"), "---\ntitle: Real\n---\n# Real\n");

      const res = runSync(docs, dest);
      expect(res.status).toBe(0);
      const { data } = matter(readFileSync(path.join(dest, "index.mdx"), "utf8")) as unknown as { data: Record<string, unknown> };
      const chapterIds = (data.chapters as Array<{ id?: string; section?: string }>).map(c => c.id ?? c.section);
      expect(chapterIds).toEqual(["real-chapter"]);
      // The summary mentions the dropped leaf so the run isn't silent.
      expect(res.stdout).toMatch(/contents/);
    } finally {
      rmSync(withContents, { recursive: true, force: true });
    }
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
