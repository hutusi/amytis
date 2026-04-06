import { describe, expect, test } from "bun:test";
import { getFlowBySlug, getAllFlows } from "../../src/lib/markdown";

describe("Integration: Flow Title Resolution", () => {
  test("frontmatter title takes priority over H1 and date", () => {
    // content/flows/2026/03/05.md has `title: 'JSDoc type comments'` in frontmatter
    const flow = getFlowBySlug("2026/03/05");
    expect(flow).not.toBeNull();
    expect(flow!.title).toBe("JSDoc type comments");
  });

  test("H1 heading is extracted as title when no frontmatter title", () => {
    // content/flows/2026/03/07.md has no frontmatter title but has `# Using Claude Code`
    const flow = getFlowBySlug("2026/03/07");
    expect(flow).not.toBeNull();
    expect(flow!.title).toBe("Using Claude Code");
  });

  test("date is used as fallback when no frontmatter title or H1", () => {
    // content/flows/2026/02/05.md has no title and no H1
    const flow = getFlowBySlug("2026/02/05");
    expect(flow).not.toBeNull();
    expect(flow!.title).toBe("2026-02-05");
  });

  test("H1 heading is stripped from content body", () => {
    const flow = getFlowBySlug("2026/03/07");
    expect(flow).not.toBeNull();
    // The H1 should be extracted as title but removed from content
    expect(flow!.content).not.toMatch(/^#\s+Using Claude Code/m);
    // The body content should still be present
    expect(flow!.content).toContain("Claude Code");
  });

  test("every flow has a non-empty title", () => {
    const flows = getAllFlows();
    expect(flows.length).toBeGreaterThan(0);
    flows.forEach((flow) => {
      expect(flow.title).toBeTruthy();
      expect(flow.title.trim().length).toBeGreaterThan(0);
    });
  });

  test("flow with frontmatter title preserves content H1 independently", () => {
    // content/flows/2026/03/05.md has frontmatter title — any H1 in content
    // should still be stripped, but title comes from frontmatter
    const flow = getFlowBySlug("2026/03/05");
    expect(flow).not.toBeNull();
    expect(flow!.title).toBe("JSDoc type comments");
    // Content should not start with an H1
    expect(flow!.content).not.toMatch(/^\s*#\s+/);
  });
});
