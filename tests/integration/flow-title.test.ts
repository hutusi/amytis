import fs from "node:fs";
import path from "node:path";
import { describe, expect, test } from "bun:test";
import { getFlowBySlug, getAllFlows } from '../../src/lib/content/flows';
import { setEnvVar, restoreEnvVar } from "../helpers/env";

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

describe("Integration: Flow visibility parity", () => {
  test("getFlowBySlug hides draft flows in production (same policy as getAllFlows)", () => {
    // Create a draft flow on disk; direct slug access must not bypass the
    // listing filter in production.
    const dir = path.join(process.cwd(), "content", "flows", "2099", "01");
    const file = path.join(dir, "31.md");
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(file, ["---", "title: Draft Flow", "date: 2026-01-31", "draft: true", "---", "", "Secret", ""].join("\n"), "utf8");

    const originalEnv = process.env.NODE_ENV;
    try {
      expect(getFlowBySlug("2099/01/31")).not.toBeNull(); // visible in dev
      setEnvVar("NODE_ENV", "production");
      expect(getFlowBySlug("2099/01/31")).toBeNull(); // hidden in prod
    } finally {
      restoreEnvVar("NODE_ENV", originalEnv);
      fs.rmSync(path.join(process.cwd(), "content", "flows", "2099"), { recursive: true, force: true });
    }
  });

  test("getFlowBySlug hides future-dated flows while showFuturePosts is false", () => {
    const dir = path.join(process.cwd(), "content", "flows", "2098", "01");
    const file = path.join(dir, "01.md");
    fs.mkdirSync(dir, { recursive: true });
    // No frontmatter date — the slug-derived date 2098-01-01 is in the future.
    fs.writeFileSync(file, ["---", "title: Future Flow", "---", "", "Tomorrow", ""].join("\n"), "utf8");

    try {
      expect(getFlowBySlug("2098/01/01")).toBeNull();
    } finally {
      fs.rmSync(path.join(process.cwd(), "content", "flows", "2098"), { recursive: true, force: true });
    }
  });
});
