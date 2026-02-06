import { describe, expect, it } from "vitest";
import * as turn from "../index";

describe("turn index exports", () => {
  it("exports turn loop contracts", () => {
    expect(typeof turn.generateAdventureTurn).toBe("function");
    expect(typeof turn.runAgenticLoop).toBe("function");
    expect(typeof turn.buildResponseFromVfs).toBe("function");
  });
});
