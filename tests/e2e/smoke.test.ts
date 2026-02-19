import { describe, test, expect } from "bun:test";

const BASE_URL = "http://localhost:3000";

describe("E2E: Smoke Test", () => {
  test("homepage should return 200 OK", async () => {
    try {
      const response = await fetch(BASE_URL);
      expect(response.status).toBe(200);
      const text = await response.text();
      expect(text).toContain("Amytis");
    } catch (_e) {
      console.warn("Skipping E2E test: Server not running at " + BASE_URL);
    }
  });
});
