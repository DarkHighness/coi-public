import { describe, it, expect } from "vitest";
import {
  buildButterflyContainerStyle,
  buildButterflyInnerStyle,
} from "./InitializingButterflies";

const sample = {
  id: 1,
  left: 10,
  top: 20,
  rotation: 15,
  scale: 1,
  duration: 5,
  delay: 0.2,
  color: "#ffffff",
  flyOutDelay: 0.1,
};

describe("InitializingButterflies styles", () => {
  it("uses longhand animation props for fly-out", () => {
    const style = buildButterflyContainerStyle(sample, true);
    expect("animation" in style).toBe(false);
    expect(style.animationName).toBe("butterfly-fly-out");
    expect(style.animationDelay).toBe("0.1s");
  });

  it("removes float animation when finale triggers", () => {
    const style = buildButterflyInnerStyle(sample, true);
    expect(style.animationName).toBeUndefined();
    expect(style.animationDelay).toBeUndefined();
  });

  it("adds float animation with delay during normal phase", () => {
    const style = buildButterflyInnerStyle(sample, false);
    expect("animation" in style).toBe(false);
    expect(style.animationName).toBe("butterfly-float");
    expect(style.animationDuration).toBe("5s");
    expect(style.animationIterationCount).toBe("infinite");
    expect(style.animationDelay).toBe("0.2s");
  });
});
