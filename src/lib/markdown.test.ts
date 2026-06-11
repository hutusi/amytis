import { describe, expect, test } from "bun:test";
import { getAuthorSlug } from "./markdown";

describe("markdown utils", () => {
  describe("getAuthorSlug", () => {
    test("creates stable, URL-safe slugs for author names", () => {
      expect(getAuthorSlug("Amytis Team")).toBe("amytis-team");
      expect(getAuthorSlug("[author]")).toBe("author");
      expect(getAuthorSlug(" John Hu ")).toBe("john-hu");
    });
  });
});
