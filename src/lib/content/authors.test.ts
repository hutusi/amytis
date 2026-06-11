import { describe, expect, test } from "bun:test";
import { getAuthorSlug } from "./authors";

describe("content/authors", () => {
  describe("getAuthorSlug", () => {
    test("creates stable, URL-safe slugs for author names", () => {
      expect(getAuthorSlug("Amytis Team")).toBe("amytis-team");
      expect(getAuthorSlug("[author]")).toBe("author");
      expect(getAuthorSlug(" John Hu ")).toBe("john-hu");
    });
  });
});
