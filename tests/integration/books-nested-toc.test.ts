import { describe, expect, test } from "bun:test";
import { flattenBookChapters, BookSchema, type BookTocItem } from '../../src/lib/content/books';

describe("Integration: Books nested TOC", () => {
  test("schema accepts the legacy { part, chapters } shape", () => {
    const result = BookSchema.safeParse({
      title: "Legacy Book",
      date: "2026-01-01",
      chapters: [
        {
          part: "Part I",
          chapters: [
            { title: "Intro", id: "intro" },
            { title: "Setup", id: "setup" },
          ],
        },
        {
          part: "Part II",
          chapters: [{ title: "Outro", id: "outro" }],
        },
      ],
    });
    expect(result.success).toBe(true);
  });

  test("schema accepts the new { section, items } shape with arbitrary nesting", () => {
    const result = BookSchema.safeParse({
      title: "VuePress Book",
      date: "2026-01-01",
      chapters: [
        {
          section: "Maths",
          items: [
            {
              section: "Linear Algebra",
              items: [
                { title: "Intro", id: "maths/linear/introduction" },
                { title: "Vectors", id: "maths/linear/vectors" },
              ],
            },
            {
              section: "Calculus",
              items: [{ title: "Derivative", id: "maths/calculus/derivative" }],
            },
          ],
        },
      ],
    });
    expect(result.success).toBe(true);
  });

  test("schema accepts bare chapter refs at the top level", () => {
    const result = BookSchema.safeParse({
      title: "Flat Book",
      date: "2026-01-01",
      chapters: [
        { title: "Chapter 1", id: "ch1" },
        { title: "Chapter 2", id: "ch2" },
      ],
    });
    expect(result.success).toBe(true);
  });

  test("schema accepts a mixed TOC (legacy parts + new sections + bare refs)", () => {
    const result = BookSchema.safeParse({
      title: "Mixed Book",
      date: "2026-01-01",
      chapters: [
        { part: "Part A", chapters: [{ title: "A1", id: "a1" }] },
        {
          section: "Section B",
          items: [{ title: "B1", id: "section-b/b1" }],
        },
        { title: "Standalone", id: "standalone" },
      ],
    });
    expect(result.success).toBe(true);
  });

  test("schema rejects a section with neither items nor a section title", () => {
    const result = BookSchema.safeParse({
      title: "Bad Book",
      date: "2026-01-01",
      chapters: [{ section: "No items" } as unknown],
    });
    expect(result.success).toBe(false);
  });

  test("flattenBookChapters preserves order across legacy parts", () => {
    const toc: BookTocItem[] = [
      {
        part: "Part I",
        chapters: [
          { title: "Intro", id: "intro" },
          { title: "Setup", id: "setup" },
        ],
      },
      { part: "Part II", chapters: [{ title: "Outro", id: "outro" }] },
    ];
    const flat = flattenBookChapters(toc);
    expect(flat.map((c) => c.id)).toEqual(["intro", "setup", "outro"]);
    expect(flat[0].part).toBe("Part I");
    expect(flat[1].part).toBe("Part I");
    expect(flat[2].part).toBe("Part II");
    expect(flat[0].section).toBeUndefined();
    expect(flat[0].sectionPath).toBeUndefined();
  });

  test("flattenBookChapters walks nested sections in source order", () => {
    const toc: BookTocItem[] = [
      {
        section: "Maths",
        items: [
          {
            section: "Linear Algebra",
            items: [
              { title: "Intro", id: "maths/linear/introduction" },
              { title: "Vectors", id: "maths/linear/vectors" },
            ],
          },
          {
            section: "Calculus",
            items: [{ title: "Derivative", id: "maths/calculus/derivative" }],
          },
        ],
      },
    ];
    const flat = flattenBookChapters(toc);
    expect(flat.map((c) => c.id)).toEqual([
      "maths/linear/introduction",
      "maths/linear/vectors",
      "maths/calculus/derivative",
    ]);
  });

  test("flattenBookChapters annotates section + sectionPath for nested chapters", () => {
    const toc: BookTocItem[] = [
      {
        section: "Maths",
        items: [
          {
            section: "Linear Algebra",
            items: [{ title: "Intro", id: "maths/linear/introduction" }],
          },
        ],
      },
    ];
    const flat = flattenBookChapters(toc);
    expect(flat).toHaveLength(1);
    expect(flat[0].section).toBe("Linear Algebra");
    expect(flat[0].sectionPath).toEqual(["Maths", "Linear Algebra"]);
    expect(flat[0].part).toBeUndefined();
  });

  test("flattenBookChapters handles mixed legacy + new + bare entries", () => {
    const toc: BookTocItem[] = [
      { part: "Part A", chapters: [{ title: "A1", id: "a1" }] },
      {
        section: "Section B",
        items: [{ title: "B1", id: "section-b/b1" }],
      },
      { title: "Standalone", id: "standalone" },
    ];
    const flat = flattenBookChapters(toc);
    expect(flat.map((c) => c.id)).toEqual(["a1", "section-b/b1", "standalone"]);
    expect(flat[0].part).toBe("Part A");
    expect(flat[1].section).toBe("Section B");
    expect(flat[1].sectionPath).toEqual(["Section B"]);
    expect(flat[2].part).toBeUndefined();
    expect(flat[2].section).toBeUndefined();
  });
});
