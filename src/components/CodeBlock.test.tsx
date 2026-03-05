import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import CodeBlock from "./CodeBlock";

describe("CodeBlock", () => {
  test("keeps code scrolling inside its own container", () => {
    const html = renderToStaticMarkup(
      <CodeBlock language="typescript">
        {"const veryLongLine = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';"}
      </CodeBlock>
    );

    expect(html).toContain("relative my-6 w-full min-w-0 max-w-full");
    expect(html).toContain("overflow-x-auto");
    expect(html).toContain("overflow-y-hidden");
    expect(html).toContain("max-width:100%");
    expect(html).toContain("box-sizing:border-box");
  });
});
