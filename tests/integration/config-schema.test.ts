import { describe, expect, test } from "bun:test";
import { SiteConfigSchema, validateSiteConfig } from "@/lib/config-schema";
import { siteConfig } from "../../site.config";
import { siteConfig as exampleConfig } from "../../site.config.example";

// site.config.ts validation (Commit 1.4). The schema must accept both shipped
// config shapes and reject malformed fields with a readable, build-failing
// error — the strict-build invariant for author/operator input.

describe("SiteConfigSchema", () => {
  test("accepts the live bilingual site.config.ts", () => {
    expect(SiteConfigSchema.safeParse(siteConfig).success).toBe(true);
    expect(() => validateSiteConfig(siteConfig)).not.toThrow();
  });

  test("accepts the single-locale create-amytis example config (drift guard)", () => {
    // Guards against site.config.ts ⇄ site.config.example.ts shape drift: both
    // must satisfy the same schema even though the example uses plain strings.
    expect(SiteConfigSchema.safeParse(exampleConfig).success).toBe(true);
    expect(() => validateSiteConfig(exampleConfig)).not.toThrow();
  });

  test("rejects a non-numeric pagination value", () => {
    const bad = structuredClone(siteConfig) as Record<string, unknown>;
    (bad.pagination as Record<string, unknown>).posts = "five";
    expect(SiteConfigSchema.safeParse(bad).success).toBe(false);
    expect(() => validateSiteConfig(bad)).toThrow(/pagination\.posts/);
  });

  test("rejects a zero/negative pagination value", () => {
    const bad = structuredClone(siteConfig) as Record<string, unknown>;
    (bad.pagination as Record<string, unknown>).posts = 0;
    expect(SiteConfigSchema.safeParse(bad).success).toBe(false);
  });

  test("rejects an unknown themeColor", () => {
    const bad = structuredClone(siteConfig) as Record<string, unknown>;
    bad.themeColor = "purple";
    expect(SiteConfigSchema.safeParse(bad).success).toBe(false);
    expect(() => validateSiteConfig(bad)).toThrow(/themeColor/);
  });

  test("rejects an unknown feed format", () => {
    const bad = structuredClone(siteConfig) as Record<string, unknown>;
    (bad.feed as Record<string, unknown>).format = "xml";
    expect(SiteConfigSchema.safeParse(bad).success).toBe(false);
  });

  test("rejects a missing required top-level field", () => {
    const bad = structuredClone(siteConfig) as Record<string, unknown>;
    delete bad.pagination;
    expect(SiteConfigSchema.safeParse(bad).success).toBe(false);
  });

  test("error message is prefixed and lists the offending path", () => {
    const bad = structuredClone(siteConfig) as Record<string, unknown>;
    (bad.feed as Record<string, unknown>).content = "summary";
    expect(() => validateSiteConfig(bad)).toThrow(/\[amytis\] Invalid site\.config\.ts/);
  });
});
