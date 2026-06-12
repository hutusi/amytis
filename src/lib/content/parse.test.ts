import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, test } from "bun:test";
import { RstParseError } from "../rst";
import {
  getPythonRstRendererAvailabilityForTests,
  parseMarkdownFileForTests,
  parseRstFileForTests,
  resetPythonRstRendererAvailabilityForTests,
} from "./parse";

const previousEnablePythonRst = process.env.AMYTIS_ENABLE_PYTHON_RST;
const previousRstPython = process.env.AMYTIS_RST_PYTHON;

afterEach(() => {
  if (previousEnablePythonRst === undefined) {
    delete process.env.AMYTIS_ENABLE_PYTHON_RST;
  } else {
    process.env.AMYTIS_ENABLE_PYTHON_RST = previousEnablePythonRst;
  }

  if (previousRstPython === undefined) {
    delete process.env.AMYTIS_RST_PYTHON;
  } else {
    process.env.AMYTIS_RST_PYTHON = previousRstPython;
  }

  resetPythonRstRendererAvailabilityForTests();
});

describe("content/parse", () => {
  test("uses markdown file mtime when frontmatter date and slug date are missing", () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "amytis-md-"));
    const filePath = path.join(tempDir, "legacy.mdx");
    fs.writeFileSync(
      filePath,
      [
        "---",
        'title: "Legacy Markdown"',
        "---",
        "",
        "Body",
        "",
      ].join("\n"),
      "utf8",
    );

    const expectedDate = "2021-03-17";
    const expectedTime = new Date(`${expectedDate}T12:00:00Z`);
    fs.utimesSync(filePath, expectedTime, expectedTime);

    try {
      const post = parseMarkdownFileForTests(filePath, "legacy");
      expect(post.date).toBe(expectedDate);
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  test("includes the source file path in rst parse errors", () => {
    process.env.AMYTIS_ENABLE_PYTHON_RST = "0";

    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "amytis-rst-"));
    const filePath = path.join(tempDir, "broken.rst");
    fs.writeFileSync(
      filePath,
      [
        ":Date: 2021-16-15",
        "",
        "Broken Title",
        "************",
        "",
        "Body",
        "",
      ].join("\n"),
      "utf8",
    );

    try {
      expect(() => parseRstFileForTests(filePath, "broken")).toThrow(
        new RstParseError(`Invalid date: 2021-16-15 (${filePath})`)
      );
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  test("falls back to the legacy rst parser when python runtime is unavailable", () => {
    process.env.AMYTIS_ENABLE_PYTHON_RST = "1";
    process.env.AMYTIS_RST_PYTHON = "python-does-not-exist";
    resetPythonRstRendererAvailabilityForTests();

    const post = parseRstFileForTests(
      path.join(process.cwd(), "content/series/rst-legacy/getting-started.rst"),
      "getting-started",
      undefined,
      "rst-legacy",
    );

    expect(post.title).toBe("Getting Started With rST");
    expect(post.renderedHtml).toBeUndefined();
    expect(post.content).toContain("Overview\n--------");
    expect(post.content).toContain(".. code-block:: ts");
    expect(getPythonRstRendererAvailabilityForTests()).toBe(false);
  });

  test("uses rst file mtime when metadata date and slug date are missing", () => {
    process.env.AMYTIS_ENABLE_PYTHON_RST = "0";

    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "amytis-rst-"));
    const filePath = path.join(tempDir, "legacy.rst");
    fs.writeFileSync(
      filePath,
      [
        "Legacy rST",
        "**********",
        "",
        "Body",
        "",
      ].join("\n"),
      "utf8",
    );

    const expectedDate = "2020-04-09";
    const expectedTime = new Date(`${expectedDate}T12:00:00Z`);
    fs.utimesSync(filePath, expectedTime, expectedTime);

    try {
      const post = parseRstFileForTests(filePath, "legacy");
      expect(post.date).toBe(expectedDate);
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });
});
