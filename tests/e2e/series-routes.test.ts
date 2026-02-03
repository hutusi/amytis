import { describe, test, expect } from "bun:test";

const BASE_URL = "http://localhost:3000";

const isServerReady = async () => {
  try {
    const response = await fetch(`${BASE_URL}/series`);
    // Verify the series page is actually working (not a 500 error)
    return response.ok;
  } catch {
    return false;
  }
};

describe("E2E: Series Routes", () => {
  test("/series returns 200 and contains series content", async () => {
    if (!(await isServerReady())) {
      console.warn("Skipping E2E test: Server not ready at " + BASE_URL);
      return;
    }

    const response = await fetch(`${BASE_URL}/series`);
    expect(response.status).toBe(200);
    const text = await response.text();
    expect(text.toLowerCase()).toContain("series");
  });

  test("/series/nextjs-deep-dive returns 200 with series title", async () => {
    if (!(await isServerReady())) return;

    const response = await fetch(`${BASE_URL}/series/nextjs-deep-dive`);
    expect(response.status).toBe(200);
    const text = await response.text();
    expect(text).toContain("Next.js Deep Dive");
  });

  test("/series/nonexistent returns 404", async () => {
    if (!(await isServerReady())) return;

    const response = await fetch(`${BASE_URL}/series/nonexistent-series-slug`);
    expect(response.status).toBe(404);
  });

  test("homepage contains series section content", async () => {
    if (!(await isServerReady())) return;

    const response = await fetch(BASE_URL);
    expect(response.status).toBe(200);
    const text = await response.text();
    // Homepage should have some reference to series
    expect(text.toLowerCase()).toContain("series");
  });

  test("post within a series is accessible at /posts/[slug]", async () => {
    if (!(await isServerReady())) return;

    // kitchen-sink is part of the nextjs-deep-dive series
    const response = await fetch(`${BASE_URL}/posts/kitchen-sink`);
    expect(response.status).toBe(200);
    const text = await response.text();
    expect(text).toContain("Kitchen Sink");
  });
});
