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
function runSync(source: string, dest: string, extraArgs: string[] = []) {
  return spawnSync(
    "bun",
    ["run", "sync-vuepress-book", "--source", source, "--dest", dest, ...extraArgs],
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
      // Match the actionable phrasing only — if a regression let the raw
      // acorn parse error through, that should fail this assertion.
      expect(res.stderr).toMatch(/Compile to JavaScript|JS-only/);
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

  test("imports a VuePress 1.x sidebar (title/path/collapsable, bare-string children, README promotion, SUMMARY drop)", () => {
    // VP1 uses a different vocabulary than VP2: `title` instead of `text`,
    // `collapsable` instead of `collapsible`, plain string paths as children,
    // and sections that carry both `path` (the section's README) and
    // `children` (sub-chapters). This fixture exercises all four variants
    // plus the GitBook-style SUMMARY.md drop.
    const vp1 = mkdtempSync(path.join(tmpdir(), "sync-vp1-"));
    try {
      const docs = path.join(vp1, "docs");
      const vp = path.join(docs, ".vuepress");
      mkdirSync(vp, { recursive: true });
      writeFileSync(
        path.join(vp, "config.js"),
        `module.exports = {
          title: 'VP1 Fixture',
          themeConfig: {
            sidebar: [
              { title: '目录', collapsable: false, path: '/SUMMARY.md' },
              {
                title: 'Preface',
                collapsable: false,
                children: [
                  '/intro/about-me',
                  '/intro/about-book',
                ],
              },
              {
                title: 'Architecture',
                collapsable: false,
                children: [
                  {
                    title: 'History',
                    path: '/arch/history/',
                    collapsable: false,
                    children: [
                      '/arch/history/monolithic',
                      '/arch/history/microservices',
                    ],
                  },
                  '/arch/standalone-note',
                ],
              },
              {
                title: 'Misc',
                collapsable: false,
                children: [
                  '/CHANGELOG.md',
                ],
              },
            ],
          },
        };
        `,
      );
      // Source files matching every sidebar reference. Titles come from
      // frontmatter or H1 — the importer should pick them up for bare-string
      // children that have no inline title.
      writeFileSync(path.join(docs, "SUMMARY.md"), "# Summary\n- placeholder\n");
      mkdirSync(path.join(docs, "intro"), { recursive: true });
      writeFileSync(path.join(docs, "intro", "about-me.md"), "---\ntitle: About the Author\n---\n# About\n");
      writeFileSync(path.join(docs, "intro", "about-book.md"), "# About this Book\n\nBody.\n");
      mkdirSync(path.join(docs, "arch", "history"), { recursive: true });
      writeFileSync(path.join(docs, "arch", "history", "README.md"), "# History of Architecture\n");
      writeFileSync(path.join(docs, "arch", "history", "monolithic.md"), "# Monolithic\n");
      writeFileSync(path.join(docs, "arch", "history", "microservices.md"), "# Microservices\n");
      writeFileSync(path.join(docs, "arch", "standalone-note.md"), "# Standalone Note\n");
      writeFileSync(path.join(docs, "CHANGELOG.md"), "# Changelog\n");

      const res = runSync(docs, dest);
      expect(res.status).toBe(0);

      const { data } = matter(readFileSync(path.join(dest, "index.mdx"), "utf8")) as unknown as { data: Record<string, unknown> };
      const chapters = data.chapters as Array<Record<string, unknown>>;

      // SUMMARY.md dropped — TOC starts with the Preface section.
      expect(chapters[0]).toMatchObject({ section: "Preface", collapsible: false });

      // Bare-string children get their titles from the source files
      // (frontmatter wins over first H1).
      const prefaceItems = chapters[0].items as Array<Record<string, unknown>>;
      expect(prefaceItems).toEqual([
        { title: "About the Author", id: "intro/about-me" },
        { title: "About this Book", id: "intro/about-book" },
      ]);

      // Architecture > History promotes the section's README as the first
      // chapter (id `arch/history`, title from the README's H1), then
      // appends the bare-string children.
      const arch = chapters[1] as Record<string, unknown>;
      expect(arch.section).toBe("Architecture");
      const archItems = arch.items as Array<Record<string, unknown>>;
      const history = archItems[0] as Record<string, unknown>;
      expect(history.section).toBe("History");
      expect(history.items).toEqual([
        { title: "History of Architecture", id: "arch/history" },
        { title: "Monolithic", id: "arch/history/monolithic" },
        { title: "Microservices", id: "arch/history/microservices" },
      ]);
      // Standalone bare-string sibling of the History section.
      expect(archItems[1]).toMatchObject({ title: "Standalone Note", id: "arch/standalone-note" });

      // `/CHANGELOG.md` keeps its `.md` extension stripped — id is `CHANGELOG`.
      const misc = chapters[2] as Record<string, unknown>;
      expect((misc.items as Array<{ id: string }>)[0].id).toBe("CHANGELOG");

      // SUMMARY drop is reported in stdout (same channel as the existing
      // `contents` drop).
      expect(res.stdout).toMatch(/SUMMARY/i);

      // No "unsupported sidebar entries" warning — every VP1 shape was
      // recognized.
      expect(res.stderr).not.toMatch(/Skipped unsupported sidebar entries/);
    } finally {
      rmSync(vp1, { recursive: true, force: true });
    }
  });

  test("skips common build manifests by default, honors --skip and --no-skip-common", () => {
    // Set up a minimal VuePress book where the source root has package.json
    // (junk), package-lock.json (junk), a custom .bak (skipped via --skip),
    // and a Real.md (always copied).
    const junky = mkdtempSync(path.join(tmpdir(), "sync-junky-"));
    try {
      const docs = path.join(junky, "docs");
      const vp = path.join(docs, ".vuepress");
      mkdirSync(vp, { recursive: true });
      writeFileSync(
        path.join(vp, "config.js"),
        `export default {
          title: 'Junky Book',
          theme: { sidebar: [{ text: 'Real', link: '/real' }] },
        }
        `,
      );
      writeFileSync(path.join(docs, "real.md"), "---\ntitle: Real\n---\n# Real\n");
      writeFileSync(path.join(docs, "package.json"), '{"name":"junky"}');
      writeFileSync(path.join(docs, "package-lock.json"), '{"lockfileVersion":3}');
      writeFileSync(path.join(docs, "bun.lockb"), "binary-ish");
      writeFileSync(path.join(docs, "draft.bak"), "wip");

      // 1. Defaults: --skip-common is on, --skip empty. Lockfiles dropped,
      //    bak file kept (it matches no rule).
      let res = runSync(docs, dest);
      expect(res.status).toBe(0);
      expect(existsSync(path.join(dest, "real.md"))).toBe(true);
      expect(existsSync(path.join(dest, "package.json"))).toBe(false);
      expect(existsSync(path.join(dest, "package-lock.json"))).toBe(false);
      expect(existsSync(path.join(dest, "bun.lockb"))).toBe(false);
      expect(existsSync(path.join(dest, "draft.bak"))).toBe(true);
      // Skip summary is printed so the user knows what got dropped.
      expect(res.stdout).toMatch(/Skipped \d+ files? matching skip rules/);

      // 2. --skip '*.bak' adds the bak pattern to the defaults.
      rmSync(dest, { recursive: true, force: true });
      mkdirSync(dest, { recursive: true });
      res = runSync(docs, dest, ["--skip", "*.bak"]);
      expect(res.status).toBe(0);
      expect(existsSync(path.join(dest, "real.md"))).toBe(true);
      expect(existsSync(path.join(dest, "package.json"))).toBe(false);
      expect(existsSync(path.join(dest, "draft.bak"))).toBe(false);

      // 3. --no-skip-common disables the default list; lockfiles come back.
      rmSync(dest, { recursive: true, force: true });
      mkdirSync(dest, { recursive: true });
      res = runSync(docs, dest, ["--no-skip-common"]);
      expect(res.status).toBe(0);
      expect(existsSync(path.join(dest, "package.json"))).toBe(true);
      expect(existsSync(path.join(dest, "package-lock.json"))).toBe(true);
      expect(existsSync(path.join(dest, "bun.lockb"))).toBe(true);
    } finally {
      rmSync(junky, { recursive: true, force: true });
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
