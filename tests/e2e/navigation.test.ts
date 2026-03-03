import { describe, test, expect } from "bun:test";

const BASE_URL = "http://localhost:3000";

describe("E2E: Navigation & Assets", () => {
  const isServerRunning = async () => {
    try {
      await fetch(BASE_URL);
      return true;
    } catch {
      return false;
    }
  };

  test("should be able to access archive page", async () => {
    if (!(await isServerRunning())) return;
    
    const response = await fetch(`${BASE_URL}/archive`);
    expect(response.status).toBe(200);
    const text = await response.text();
    expect(text).toContain("Archive");
  });

  test("should be able to access tags page", async () => {
    if (!(await isServerRunning())) return;

    const response = await fetch(`${BASE_URL}/tags`);
    expect(response.status).toBe(200);
    const text = await response.text();
    expect(text).toContain("Tags");
  });
  
  test("sitemap.xml should exist and be valid XML", async () => {
    if (!(await isServerRunning())) return;

    const response = await fetch(`${BASE_URL}/sitemap.xml`);
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("xml");
    const text = await response.text();
    expect(text).toContain("<urlset");
  });

  test("feed.xml should be a valid RSS feed", async () => {
    if (!(await isServerRunning())) return;

    const response = await fetch(`${BASE_URL}/feed.xml`);
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("xml");
    const text = await response.text();
    expect(text).toContain("<rss");
    expect(text).toContain("<channel>");
    expect(text).toContain("<item>");
  });

  test("feed.atom should be a valid Atom feed", async () => {
    if (!(await isServerRunning())) return;

    const response = await fetch(`${BASE_URL}/feed.atom`);
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("xml");
    const text = await response.text();
    expect(text).toContain('xmlns="http://www.w3.org/2005/Atom"');
    expect(text).toContain("<entry>");
  });
});
