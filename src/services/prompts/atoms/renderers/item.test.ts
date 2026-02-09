import { describe, expect, it } from "vitest";
import { renderItemFull, renderItemHidden, renderItemVisible } from "./item";

describe("item renderer", () => {
  const item = {
    id: "item:compass",
    name: "Aether Compass",
    lore: "Forged by sky monks",
    emotionalWeight: "legacy",
    visible: {
      description: "A brass compass pulsing with blue light",
      usage: "Find unstable rifts",
      observation: "Needle spins near portals",
      condition: "Worn but functional",
      sensory: {
        texture: "cold metal",
        weight: "light",
        smell: "ozone",
      },
    },
    hidden: {
      truth: "Bound to a dormant portal core",
      secrets: ["reacts to bloodline", "drains heat while active"],
    },
  } as any;

  it("renders visible layer with optional metadata", () => {
    const output = renderItemVisible({ item });

    expect(output).toContain('<item id="item:compass" layer="visible">');
    expect(output).toContain("lore: Forged by sky monks");
    expect(output).toContain("emotionalWeight: legacy");
    expect(output).toContain("sensory: { texture: cold metal, weight: light, smell: ozone }");
  });

  it("omits sensory block when sensory fields are empty", () => {
    const output = renderItemVisible({
      item: {
        ...item,
        visible: {
          ...item.visible,
          sensory: {},
        },
      },
    });

    expect(output).not.toContain("sensory: {");
  });

  it("renders hidden layer and empty fallback", () => {
    const hidden = renderItemHidden({ item });
    expect(hidden).toContain('<item id="item:compass" layer="hidden">');
    expect(hidden).toContain("truth: Bound to a dormant portal core");
    expect(hidden).toContain("secrets: [\"reacts to bloodline\",\"drains heat while active\"]");

    const noHidden = renderItemHidden({
      item: { ...item, hidden: undefined },
    });
    expect(noHidden).toBe("");
  });

  it("renders full layer with visible and hidden sections", () => {
    const output = renderItemFull({ item });

    expect(output).toContain('<item id="item:compass" layer="full">');
    expect(output).toContain("<visible>");
    expect(output).toContain("<hidden>");
    expect(output).toContain("truth: Bound to a dormant portal core");
  });

  it("falls back to visible full output when hidden is absent", () => {
    const output = renderItemFull({
      item: { ...item, hidden: undefined },
    });

    expect(output).toContain('layer="visible"');
    expect(output).not.toContain("<hidden>");
  });
});
