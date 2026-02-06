import { describe, expect, it } from "vitest";
import * as agentic from "../index";

describe("agentic index exports", () => {
  it("re-exports core loop entry points and wrappers", () => {
    expect(typeof agentic.generateAdventureTurn).toBe("function");
    expect(typeof agentic.runAgenticLoop).toBe("function");
    expect(typeof agentic.buildResponseFromVfs).toBe("function");

    expect(typeof agentic.generateForceUpdate).toBe("function");
    expect(typeof agentic.generateEntityCleanup).toBe("function");

    expect(typeof agentic.generateStoryOutlinePhased).toBe("function");
    expect(typeof agentic.summarizeContext).toBe("function");
    expect(typeof agentic.runSummaryAgenticLoop).toBe("function");
  });
});
