import { describe, expect, test } from "bun:test";
import { getAuthorRouteParams, getAuthorSlug } from "./authors";

describe("content/authors", () => {
  describe("getAuthorSlug", () => {
    test("creates stable, URL-safe slugs for author names", () => {
      expect(getAuthorSlug("Amytis Team")).toBe("amytis-team");
      expect(getAuthorSlug("[author]")).toBe("author");
      expect(getAuthorSlug(" John Hu ")).toBe("john-hu");
    });
  });

  describe("getAuthorRouteParams", () => {
    test("emits each slug plus the legacy name form", () => {
      expect(getAuthorRouteParams(["Amytis Team", "John Hu"])).toEqual(["amytis-team", "john-hu", "Amytis Team", "John Hu"]);
    });

    test("leaves out a legacy name that differs from a route only by case", () => {
      // "Amytis" and "amytis" would share one directory on macOS/Windows, and
      // the legacy redirect stub could overwrite the real page.
      expect(getAuthorRouteParams(["Amytis", "Amytis Team"])).toEqual(["amytis", "amytis-team", "Amytis Team"]);
      expect(getAuthorRouteParams(["tester", "周志明"])).toEqual(["tester", "周志明"]);
    });
  });
});
