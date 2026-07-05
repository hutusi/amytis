import { describe, expect, test } from "bun:test";
import { siteConfig } from "../../site.config";
import { siteConfig as exampleConfig } from "../../site.config.example";

// site.config.ts (this repo, bilingual) and site.config.example.ts (shipped
// via create-amytis, single-locale) must stay structurally in sync: any field
// added to one must be mirrored in the other (CLAUDE.md "Config sync").
//
// The schema drift-guard in config-schema.test.ts only proves both parse —
// with mostly-optional fields it cannot catch a key added to one file but not
// the other. This test compares the actual key paths.

const LOCALE_KEY = /^[a-z]{2}(-[A-Z]{2})?$/;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

// `{ en: "...", zh: "..." }` is the i18n object form of a plain string —
// structurally a leaf, so the bilingual and single-locale configs compare
// equal at that node.
function isLocaleRecord(value: unknown): boolean {
  return (
    isPlainObject(value) &&
    Object.keys(value).length > 0 &&
    Object.entries(value).every(
      ([key, val]) => LOCALE_KEY.test(key) && typeof val === "string"
    )
  );
}

// Records keyed by per-site data (author names) rather than schema fields:
// the keys are wildcarded so each entry's *structure* still compares.
const DATA_KEYED_PATHS = new Set(["authors"]);

function collectKeyPaths(node: unknown, prefix = ""): string[] {
  if (!isPlainObject(node) || isLocaleRecord(node)) return [];
  const paths: string[] = [];
  const dataKeyed = DATA_KEYED_PATHS.has(prefix);
  for (const [key, value] of Object.entries(node)) {
    const path = prefix ? `${prefix}.${dataKeyed ? "*" : key}` : key;
    paths.push(path);
    // Arrays hold per-site data (nav items, author lists, homepage sections),
    // not schema structure — don't descend.
    if (!Array.isArray(value)) {
      paths.push(...collectKeyPaths(value, path));
    }
  }
  return paths.sort();
}

describe("site.config.ts ⇄ site.config.example.ts structural parity", () => {
  test("both configs expose the same key paths", () => {
    const live = new Set(collectKeyPaths(siteConfig));
    const example = new Set(collectKeyPaths(exampleConfig));

    const onlyInSiteConfig = [...live].filter((k) => !example.has(k));
    const onlyInExample = [...example].filter((k) => !live.has(k));

    // A non-empty list means a field was added to one config but not mirrored
    // in the other — mirror it (or mark it clearly optional in the schema AND
    // both files) before landing.
    expect({ onlyInSiteConfig, onlyInExample }).toEqual({
      onlyInSiteConfig: [],
      onlyInExample: [],
    });
  });
});
