import fs from "node:fs";
import path from "node:path";
import { describe, expect, test } from "bun:test";
import { getAllNotes } from "../../src/lib/content/notes";

describe("Integration: Notes (strict-build)", () => {
  test("getAllNotes returns an array", () => {
    expect(Array.isArray(getAllNotes())).toBe(true);
  });

  test("getAllNotes throws on invalid frontmatter instead of silently skipping", () => {
    // Strict-build invariant: a malformed note must fail the build, not quietly
    // disappear from the site (consistent with getAllFlows).
    const notesDir = path.join(process.cwd(), "content", "notes");
    fs.mkdirSync(notesDir, { recursive: true });
    const notePath = path.join(notesDir, "__test-bad-frontmatter__.md");
    fs.writeFileSync(
      notePath,
      // `title` is required by NoteSchema; omitting it must throw.
      ["---", "tags: [test]", "---", "", "Body without a title.", ""].join("\n"),
      "utf8",
    );

    try {
      expect(() => getAllNotes()).toThrow(/Invalid note frontmatter/);
    } finally {
      fs.rmSync(notePath, { force: true });
    }
  });
});
