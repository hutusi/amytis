import { describe, expect, test } from "bun:test";
import { getCdnImageUrl, shouldBypassImageOptimization } from "./image-utils";

describe("image-utils", () => {
  test("getCdnImageUrl leaves external and special URLs unchanged", () => {
    expect(getCdnImageUrl("https://example.com/image.jpg", "https://cdn.example.com")).toBe("https://example.com/image.jpg");
    expect(getCdnImageUrl("text:Cover", "https://cdn.example.com")).toBe("text:Cover");
    expect(getCdnImageUrl("data:image/png;base64,abc", "https://cdn.example.com")).toBe("data:image/png;base64,abc");
  });

  test("shouldBypassImageOptimization skips avif and webp sources", () => {
    expect(shouldBypassImageOptimization("/images/background-new-wave.avif")).toBe(true);
    expect(shouldBypassImageOptimization("/images/already-optimized.webp")).toBe(true);
    expect(shouldBypassImageOptimization("/images/already-optimized.WEBP?version=1")).toBe(true);
    expect(shouldBypassImageOptimization("/images/already-optimized.webp?version=1#hero")).toBe(true);
    expect(shouldBypassImageOptimization("/images/photo.jpg")).toBe(false);
    expect(shouldBypassImageOptimization("/images/photo.png#fragment")).toBe(false);
  });
});
