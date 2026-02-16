import { describe, expect, it } from "vitest";
import { normalizeNarrativeMarkdown } from "./storyTextNormalization";

describe("normalizeNarrativeMarkdown", () => {
  it("decodes escaped paragraph breaks to real line breaks", () => {
    const input = "第一段。\\n\\n第二段。";
    expect(normalizeNarrativeMarkdown(input)).toBe("第一段。\n\n第二段。");
  });

  it("removes quote-wrapped escaped breaks before decoding", () => {
    const input = '他说。\"\\n\\n\"我们继续。';
    expect(normalizeNarrativeMarkdown(input)).toBe("他说。\n\n我们继续。");
  });

  it("handles double-escaped newline sequences", () => {
    const input = "段落A。\\\\n\\\\n段落B。";
    expect(normalizeNarrativeMarkdown(input)).toBe("段落A。\n\n段落B。");
  });

  it("does not change content with a single escaped newline marker", () => {
    const input = "写作提示：使用 \\n 代表换行。";
    expect(normalizeNarrativeMarkdown(input)).toBe(input);
  });

  it("does not change content without escaped newlines", () => {
    const input = "普通段落，不需要处理。";
    expect(normalizeNarrativeMarkdown(input)).toBe(input);
  });
});
