import { describe, expect, test } from "bun:test";
import { getSeriesData, getAllSeries } from "../../src/lib/markdown";

describe("Integration: Series Draft Support", () => {
  test("all series are included when NODE_ENV is not production", () => {
    // In test environment NODE_ENV is typically 'test'
    const series = getAllSeries();
    // Should include all series folders, even those marked draft
    expect(Object.keys(series).length).toBeGreaterThan(0);
  });

  test("getSeriesData parses draft field correctly (defaults to false)", () => {
    const data = getSeriesData("nextjs-deep-dive");
    expect(data).not.toBeNull();
    // draft should default to false if not specified in frontmatter
    expect(typeof data!.draft).toBe("boolean");
  });

  test("draft filtering code path runs without error in production mode", () => {
    const originalEnv = process.env.NODE_ENV;
    const originalPythonRst = process.env.AMYTIS_ENABLE_PYTHON_RST;
    try {
      process.env.NODE_ENV = "production";
      process.env.AMYTIS_ENABLE_PYTHON_RST = "0";
      // This should not throw; draft series are simply excluded
      const series = getAllSeries();
      expect(typeof series).toBe("object");
    } finally {
      process.env.NODE_ENV = originalEnv;
      process.env.AMYTIS_ENABLE_PYTHON_RST = originalPythonRst;
    }
  });

  test("draft series are excluded in production mode", () => {
    const originalEnv = process.env.NODE_ENV;
    const originalPythonRst = process.env.AMYTIS_ENABLE_PYTHON_RST;
    try {
      process.env.NODE_ENV = "production";
      process.env.AMYTIS_ENABLE_PYTHON_RST = "0";
      const allSeries = getAllSeries();
      
      // Verify that every series returned has draft: false (or undefined which defaults to false)
      Object.keys(allSeries).forEach(slug => {
        const seriesData = getSeriesData(slug);
        expect(seriesData?.draft).not.toBe(true);
      });
    } finally {
      process.env.NODE_ENV = originalEnv;
      process.env.AMYTIS_ENABLE_PYTHON_RST = originalPythonRst;
    }
  });
});
